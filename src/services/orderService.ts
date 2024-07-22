import { logger } from '../utils/logger';
import Config from '../config/config';
import dataSource from '../data-source';
import { Order, PaymentStatus, WithdrawalStatus } from '../entities/order';
import { NotFoundError } from '../errors/notFoundError';
import {
  connectPolkadot,
  generateDerivedKeyring,
  preparePolkadotAddress,
  getBalanceForAsset
} from '../utils/polkadot';
import { logTransaction } from './transactionService';

export const getOrder = async (orderId: string) => {
  const orderRepository = dataSource.getRepository(Order);
  const order = await orderRepository.findOne({ where: { orderId } });
  if (!order) throw new NotFoundError('Order not found');

  return order;
};
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

  const chain = config.chains.find(chain => chain.name.includes(config.kalatori.chainName));
  const chainName = chain?.name || 'unknown';

  const fromAddress = order.paymentAccount;
  const toAddress = order.recipient;
  let transfer;

  let signerOptions = {};

  if (order.currency === 'DOT') {
    transfer = api.tx.balances.transferAll(toAddress, true);
  } else {
    const asset = chain?.assets?.find(asset => asset.name === order.currency);
    if (!asset) {
      throw new Error(`Unsupported asset: ${order.currency}`);
    }
    if (!order.amount) {
      throw new Error(`Order amount is not defined for orderId:${order.orderId}`);
    }
    const totalAmountAvailable = await getBalanceForAsset(api, fromAddress, asset.name);
    // TODO: Implement logic to predict fee instead of using hard-coded value
    const totalAmountTransferable = totalAmountAvailable - 30000;
    if (totalAmountTransferable < 0) {
      throw new Error(`Transferable amount is less then 0 once fee deducted for orderId:${order.orderId}`);
    }
    transfer = api.tx.assets.transfer(asset.id, toAddress, totalAmountTransferable);
    signerOptions = {
      tip: 0,
      // This is a temporary solution, wasn't able to find a better way to solve it
      assetId:  { parents: 0, interior: { X2: [{ palletInstance: 50 }, { generalIndex: asset.id }] } }
    };
  }

  logger.info(`Ready to transfer ${order.currency} assets from ${fromAddress} to ${toAddress}`);

  const unsub = await transfer.signAndSend(derived, signerOptions, async ({ status }) => {
    if (status.isInBlock || status.isFinalized) {
      const blockHash = status.isInBlock ? status.asInBlock : status.asFinalized;
      const signedBlock = await api.rpc.chain.getBlock(blockHash);
      const blockNumber = signedBlock.block.header.number.toNumber();
      const hash = transfer.hash.toHex();

      order.withdrawalStatus = WithdrawalStatus.Completed;
      await orderRepository.save(order);
      logger.info(`Successfully transferred ${order.currency} assets from ${fromAddress} to ${toAddress}`);

      await logTransaction({
        blockNumber,
        positionInBlock: 0,
        timestamp: new Date(),
        transactionBytes: transfer.toHex(),
        sender: fromAddress,
        recipient: toAddress,
        amount: order.amount,
        currency: order.currency,
        status: 'completed', // TODO: enum for statuses
        chain_name: chainName,
        transaction_hash: hash
      });

      unsub();
    }
  });

  return order;
};
