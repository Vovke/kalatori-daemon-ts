import { logger } from '../utils/logger';
import Config from '../config/config';
import dataSource from '../data-source';
import { Order, PaymentStatus, WithdrawalStatus } from '../entities/order';
import { NotFoundError } from '../errors/notFoundError';
import { connectPolkadot, generateDerivedKeyring, preparePolkadotAddress } from '../utils/polkadot';
import { logTransaction } from './transactionService';

export const createOrUpdateOrder = async (orderId: string, orderData: any) => {
  const orderRepository = dataSource.getRepository(Order);
  const config = Config.getInstance().config;
  let order = await orderRepository.findOne({ where: { orderId } });
  const existing = !!order;

  if (!order) {
    order = new Order();
    order.orderId = orderId;
    order.paymentStatus = PaymentStatus.Pending;
    order.withdrawalStatus = WithdrawalStatus.Waiting;

    const derived = await generateDerivedKeyring(orderId);

    order.paymentAccount = preparePolkadotAddress(derived.address);
    order.recipient = preparePolkadotAddress(config.kalatori.recipient);
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
  const orderRepository = dataSource.getRepository(Order);
  const config = Config.getInstance().config;
  const order = await orderRepository.findOne({ where: { orderId } });
  if (!order) throw new NotFoundError('Order not found');

  const api = await connectPolkadot();
  const derived = await generateDerivedKeyring(orderId);

  const chainName = config.chains.find(chain => chain.endpoints.includes(config.kalatori.rpc))?.name || 'unknown';

  const fromAddress = order.paymentAccount;
  const toAddress = order.recipient;
  const transfer = api.tx.balances.transferAll(toAddress, true);

  logger.info(`Ready to transfer assets from ${fromAddress} to ${toAddress}`);

  const unsub = await transfer.signAndSend(derived, async ({ status }) => {
    if (status.isInBlock || status.isFinalized) {
      const blockHash = status.isInBlock ? status.asInBlock : status.asFinalized;
      const signedBlock = await api.rpc.chain.getBlock(blockHash);
      const blockNumber = signedBlock.block.header.number.toNumber();
      const hash = transfer.hash.toHex();

      order.withdrawalStatus = WithdrawalStatus.Completed;
      await orderRepository.save(order);

      await logTransaction({
        blockNumber,
        positionInBlock: 0,
        timestamp: new Date(),
        transactionBytes: transfer.toHex(),
        sender: fromAddress,
        recipient: toAddress,
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
  const orderRepository = dataSource.getRepository(Order);
  const order = await orderRepository.findOne({ where: { orderId } });
  if (!order) throw new NotFoundError('Order not found');

  return order;
};
