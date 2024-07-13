import { getRepository } from 'typeorm';
import { Order } from '../entities/order';
import { logTransaction } from './transactionService';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Config from '../config/config';
import { NotFoundError } from '../errors/notFoundError';
import { connectPolkadot } from '../utils/polkadot';

export const createOrUpdateOrder = async (orderId: string, orderData: any) => {
  const orderRepository = getRepository(Order);
  const config = Config.getInstance().config;
  let order = await orderRepository.findOne({ where: { orderId } });
  const existing = !!order;

  if (!order) {
    order = new Order();
    order.orderId = orderId;
    order.paymentStatus = 'pending';
    order.withdrawalStatus = 'none';

    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    const derived = keyring.addFromUri(`${config.kalatori.seed}//${orderId}`);
    order.paymentAccount = derived.address;
    order.recipient = config.kalatori.recipient;
  }

  if (orderData.amount) order.amount = orderData.amount;
  if (orderData.currency) order.currency = orderData.currency;
  if (orderData.callback) order.callback = orderData.callback;

  await orderRepository.save(order);

  await logTransaction({
    blockNumber: 0,
    positionInBlock: 0,
    timestamp: new Date(),
    transactionBytes: '',
    sender: '',
    recipient: order.paymentAccount,
    amount: order.amount,
    currency: order.currency,
    status: 'pending',
    chain_name: 'polkadot',
    transaction_hash: ''
  });

  return { ...order, existing };
};

export const withdrawOrder = async (orderId: string) => {
  const orderRepository = getRepository(Order);
  const config = Config.getInstance().config;
  const order = await orderRepository.findOne({ where: { orderId } });
  if (!order) throw new NotFoundError('Order not found');

  const api = await connectPolkadot();
  const keyring = new Keyring({ type: 'sr25519' });
  await cryptoWaitReady();
  const derived = keyring.addFromUri(`${config.kalatori.seed}//${orderId}`);

  const chainName = config.chains.find(chain => chain.endpoints.includes(config.kalatori.rpc))?.name || 'unknown';

  const transfer = api.tx.balances.transferAll(order.recipient, true);

  const unsub = await transfer.signAndSend(derived, async ({ status }) => {
    if (status.isInBlock || status.isFinalized) {
      const blockHash = status.isInBlock ? status.asInBlock : status.asFinalized;
      const signedBlock = await api.rpc.chain.getBlock(blockHash);
      const blockNumber = signedBlock.block.header.number.toNumber();
      const hash = transfer.hash.toHex();

      order.withdrawalStatus = 'completed';
      await orderRepository.save(order);

      await logTransaction({
        blockNumber,
        positionInBlock: 0,
        timestamp: new Date(),
        transactionBytes: transfer.toHex(),
        sender: order.paymentAccount,
        recipient: order.recipient,
        amount: order.amount,
        currency: order.currency,
        status: 'completed',
        chain_name: chainName,
        transaction_hash: hash
      });

      unsub();
    }
  });

  return order;
};

export const getOrder = async (orderId: string) => {
  const orderRepository = getRepository(Order);
  const order = await orderRepository.findOne({ where: { orderId } });
  if (!order) throw new NotFoundError('Order not found');

  return order;
};
