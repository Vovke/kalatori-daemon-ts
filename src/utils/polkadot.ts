import { ApiPromise, WsProvider } from '@polkadot/api';
import { logger } from './logger';
import { getRepository } from 'typeorm';
import { Order } from '../entities/order';
import { logTransaction } from '../services/transactionService';
import Config, { updateConfig } from '../config/config';
import axios from 'axios';

let api: ApiPromise | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const orderRepository = getRepository(Order);

  api.rpc.chain.subscribeNewHeads(async (header) => {
    logger.info(`New block #${header.number}`);

    const blockHash = await api.rpc.chain.getBlockHash(header.number.unwrap());
    const { block } = await api.rpc.chain.getBlock(blockHash);

    for (const [index, extrinsic] of block.extrinsics.entries()) {
      const { method: { method, section } } = extrinsic;

      if (section === 'balances' && method === 'transfer') {
        const [from, to, value] = extrinsic.args.map(arg => arg.toString());

        const order = await orderRepository.findOne({ where: { paymentAccount: to } });

        if (order && order.paymentStatus !== 'paid') {
          logger.info(`Transaction found for order ${order.orderId} in block #${header.number}`);

          order.paymentStatus = 'paid';
          await orderRepository.save(order);

          const transactionHash = extrinsic.hash.toHex();
          await logTransaction({
            blockNumber: header.number.toNumber(),
            positionInBlock: index,
            timestamp: new Date(),
            transactionBytes: extrinsic.toHex(),
            sender: from,
            recipient: to,
            amount: parseFloat(value),
            currency: order.currency,
            status: 'paid',
            chain_name: Config.getInstance().config.kalatori.chainName,  // Use the selected chain name
            transaction_hash: transactionHash
          });

          if (order.callback) {
            try {
              await axios.post(order.callback, {
                order: order.orderId,
                payment_status: order.paymentStatus,
                withdrawal_status: order.withdrawalStatus,
                amount: order.amount,
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
        }
      }
    }
  });
};
