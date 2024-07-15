import { ApiPromise, WsProvider } from '@polkadot/api';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import axios from 'axios';
import { withdrawOrder } from '../services/orderService';
import Config, { updateConfig } from '../config/config';
import dataSource from '../data-source';
import { Order, PaymentStatus, WithdrawalStatus } from '../entities/order';
import { logTransaction } from '../services/transactionService';
import { logger } from './logger';

let api: ApiPromise | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const preparePolkadotAddress = (address: string) => {
  const publicKey = decodeAddress(address);
  return encodeAddress(publicKey, 0);
};

export const connectPolkadot = async (retries: number = Config.getInstance().config.blockchain.maxRetries): Promise<ApiPromise> => {
  if (!api) {
    const selectedChain = Config.getInstance().config.chains.find(chain => chain.name === Config.getInstance().config.kalatori.chainName);
    if (!selectedChain) {
      throw new Error(`Chain configuration for ${Config.getInstance().config.kalatori.chainName} not found`);
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
      logger.error(`Failed to connect to all provided Polkadot RPC endpoints. Retrying in ${Config.getInstance().config.blockchain.retryDelay}ms... (${Config.getInstance().config.blockchain.maxRetries - retries + 1}/${Config.getInstance().config.blockchain.maxRetries})`);
      await delay(Config.getInstance().config.blockchain.retryDelay);
      return connectPolkadot(retries - 1);
    } else if (!api) {
      throw new Error('Exceeded maximum retries to connect to Polkadot RPC.');
    }
  }
  return api;
};

export const subscribeToBlocks = async () => {
  const api = await connectPolkadot();
  const orderRepository = dataSource.getRepository(Order);

  const [chainDecimals] = api.registry.chainDecimals;
  const [chainToken] = api.registry.chainTokens;

  api.rpc.chain.subscribeNewHeads(async (header) => {
    logger.info(`New block #${header.number}`);

    const blockHash = await api.rpc.chain.getBlockHash(header.number.unwrap());
    const { block } = await api.rpc.chain.getBlock(blockHash);

    for (const [index, extrinsic] of block.extrinsics.entries()) {
      const { method: { method, section }, signer } = extrinsic;
      if (section === 'balances' && (method === 'transfer' || method === 'transferKeepAlive')) {
        const [to, amount] = extrinsic.args.map(arg => arg.toString());
        const order = await orderRepository.findOne({ where: { paymentAccount: to } });
        if (order && order.paymentStatus !== PaymentStatus.Paid && order.amount !== undefined) {
          const amountInUnits = parseFloat(amount) / Math.pow(10, chainDecimals);
          logger.info(`Transaction found for order ${order.orderId} in block #${header.number}`);
          order.repaidAmount = (order.repaidAmount || 0) + amountInUnits;
          if (order.amount && order.amount <= order.repaidAmount) {
            order.paymentStatus = PaymentStatus.Paid;
            logger.info(`Order with id: ${order.orderId} was succesfully repaid`);
          } else {
            logger.info(
              `Order with id: ${order.orderId} was partially repaid, missing amount: ${order.amount-order.repaidAmount}`
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
            currency: chainToken, // TODO: Works just for polkadot currently
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
      }
    }
  });
};
