import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import axios from 'axios';
import { Option } from '@polkadot/types';
import { AssetMetadata } from '@polkadot/types/interfaces';
import { withdrawOrder } from '../services/orderService';
import Config, { updateConfig } from '../config/config';
import dataSource from '../data-source';
import { Order, PaymentStatus, WithdrawalStatus } from '../entities/order';
import { logTransaction } from '../services/transactionService';
import { logger } from './logger';

let api: ApiPromise | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const preparePolkadotAddress = (address: string): string => {
  try {
    const publicKey = decodeAddress(address);
    return encodeAddress(publicKey, 0);
  } catch (error) {
    logger.error(`Error decoding address: ${address}. Error: ${error}`);
    throw new Error(`Invalid address format: ${address}`);
  }
};

export const generateDerivedKeyring = async (orderId: string) => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(`${Config.getInstance().config.kalatori.seed}//${orderId}`);
};

export const connectPolkadot = async (retries: number = Config.getInstance().config.blockchain.maxRetries): Promise<ApiPromise> => {
  const config = Config.getInstance().config;
  if (!api) {
    const selectedChain = config.chains.find(chain => chain.name === config.kalatori.chainName);
    if (!selectedChain) {
      throw new Error(`Chain configuration for ${config.kalatori.chainName} not found`);
    }

    for (const endpoint of selectedChain.endpoints) {
      const wsProvider = new WsProvider(endpoint);
      try {
        api = await ApiPromise.create({ provider: wsProvider });
        updateConfig({ connectedRpcs: [endpoint] });
        logger.info(`Connected to Polkadot RPC at ${endpoint}`);
        break;
      } catch (error) {
        logger.error(`Failed to connect to Polkadot RPC at ${endpoint}. Retrying with next endpoint...`);
      }
    }

    if (!api && retries > 0) {
      logger.error(`Failed to connect to all provided Polkadot RPC endpoints. Retrying in ${config.blockchain.retryDelay}ms... (${config.blockchain.maxRetries - retries + 1}/${config.blockchain.maxRetries})`);
      await delay(config.blockchain.retryDelay);
      return connectPolkadot(retries - 1);
    } else if (!api) {
      throw new Error('Exceeded maximum retries to connect to Polkadot RPC.');
    }
  }
  return api;
};

const getAssetDecimals = async (api: ApiPromise, assetId: number): Promise<number> => {
  try {
    const assetInfo = await api.query.assets.metadata(assetId);
    const assetData = assetInfo.toJSON() as { decimals: number };
    return assetData.decimals;
  } catch (error) {
    logger.error(`Error fetching asset decimals for asset ID ${assetId}: ${error}`);
    return 12; // Default to 12 in case of an error
  }
};

const processExtrinsic = async (
  extrinsic: any,
  header: any,
  orderRepository: any,
  chainDecimals: number,
  chainToken: string,
  index: number,
  api: ApiPromise,
  assetId?: number,
  assetDecimals?: number
) => {
  const { method: { method, section }, signer } = extrinsic;
  let to: string, amount: string;

  if (section === 'balances' && (method === 'transfer' || method === 'transferKeepAlive')) {
    [to, amount] = extrinsic.args.map((arg: any) => arg.toString());
  } else if (section === 'assets' && (method === 'transfer' || method === 'transferKeepAlive') && assetId !== undefined) {
    const [extrinsicAssetId, toAddr, amt] = extrinsic.args.map((arg: any) => arg.toString());
    if (parseInt(extrinsicAssetId) !== assetId) return;  // Ensure the assetId matches
    to = toAddr;
    amount = amt;
    chainDecimals = assetDecimals || chainDecimals; // Use asset decimals if available
  } else {
    return;  // Not a recognized transfer extrinsic
  }

  const order = await orderRepository.findOne({ where: { paymentAccount: to } });

  if (order && order.paymentStatus !== PaymentStatus.Paid && order.amount !== undefined) {
    const amountInUnits = parseFloat(amount) / Math.pow(10, chainDecimals);
    logger.info(`Transaction found for order ${order.orderId} in block #${header.number}`);
    order.repaidAmount = (order.repaidAmount || 0) + amountInUnits;
    if (order.amount && order.amount <= order.repaidAmount) {
      order.paymentStatus = PaymentStatus.Paid;
      logger.info(`Order with id: ${order.orderId} was successfully repaid`);
    } else {
      logger.info(
        `Order with id: ${order.orderId} was partially repaid, missing amount: ${order.amount - order.repaidAmount}`
      );
    }
    await orderRepository.save(order);
    const transactionHash = extrinsic.hash.toHex();
    await logTransaction({
      blockNumber: header.number.toNumber(),
      positionInBlock: index,
      timestamp: new Date(),
      transactionBytes: extrinsic.toHex(),
      sender: signer.toString(),
      recipient: to,
      amount: amountInUnits,
      currency: assetId !== undefined ? `Asset ${assetId}` : chainToken, // Differentiate assets
      status: 'paid',
      chain_name: Config.getInstance().config.kalatori.chainName,
      transaction_hash: transactionHash
    });

    if (order.callback) {
      try {
        await axios.post(order.callback, {
          order: order.orderId,
          payment_status: order.paymentStatus,
          withdrawal_status: order.withdrawalStatus,
          amount: order.amount,
          amount_repaid: order.repaidAmount,
          currency: order.currency,
          timestamp: new Date().toISOString(),
          transaction_hash: transactionHash,
          block_number: header.number.toNumber()
        });
        logger.info(`Callback URL ${order.callback} notified successfully for order ${order.orderId}`);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error notifying callback URL for order ${order.orderId}: ${error.message}`);
        } else {
          logger.error(`Unknown error notifying callback URL for order ${order.orderId}`);
        }
      }
    }
    if (order.paymentStatus === PaymentStatus.Paid && order.withdrawalStatus == WithdrawalStatus.Waiting) {
      withdrawOrder(order.orderId);
    }
  }
};

export const subscribeToBlocks = async () => {
  const api = await connectPolkadot();
  const orderRepository = dataSource.getRepository(Order);

  api.rpc.chain.subscribeNewHeads(async (header) => {
    logger.info(`New block #${header.number}`);

    const blockHash = await api.rpc.chain.getBlockHash(header.number.unwrap());
    const { block } = await api.rpc.chain.getBlock(blockHash);

    const config = Config.getInstance().config;
    const chain = config.chains.find(chain => chain.name === config.kalatori.chainName);
    const [chainDecimals] = api.registry.chainDecimals;
    const [chainToken] = api.registry.chainTokens;

    for (const [index, extrinsic] of block.extrinsics.entries()) {
      await processExtrinsic(extrinsic, header, orderRepository, chainDecimals, chainToken, index, api);
      if (chain && chain.assets) {
        for (const asset of chain.assets) {
          const assetDecimals = await getAssetDecimals(api, asset.id);
          await processExtrinsic(extrinsic, header, orderRepository, chainDecimals, asset.name, index, api, asset.id, assetDecimals);
        }
      }
    }
  });
};
