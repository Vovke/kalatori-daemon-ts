import { getRepository } from 'typeorm';
import { Order } from '../entities/order';

export const getPaymentStatus = async (paymentAccount: string) => {
  const orderRepository = getRepository(Order);
  const order = await orderRepository.findOne({ where: { paymentAccount } });
  if (!order) throw new Error('Order not found');

  return order;
};
