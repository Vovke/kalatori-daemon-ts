import 'reflect-metadata';
import { createConnection, getConnection, getRepository } from 'typeorm';
import request from 'supertest';
import app from '../../src/app';
import { Order } from '../../src/entities/order';
import { Transaction } from '../../src/entities/transaction';

beforeAll(async () => {
  await createConnection({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    entities: [Order, Transaction], // Include all entities here
    synchronize: true,
    logging: false,
  });
});

afterAll(async () => {
  const connection = getConnection();
  if (connection.isConnected) {
    await connection.close();
  }
});

describe('Order Controller', () => {
  beforeEach(async () => {
    const connection = getConnection();
    await connection.synchronize(true);
  });

  afterEach(async () => {
    const orderRepository = getRepository(Order);
    const transactionRepository = getRepository(Transaction);
    await orderRepository.query(`DELETE FROM "order"`);
    await transactionRepository.query(`DELETE FROM "transaction"`);
  });

  const orderId = 'testOrder123';
  const orderData = {
    amount: 100,
    currency: 'DOT',
    callback: 'https://example.com/callback'
  };

  it('should create a new order', async () => {
    const response = await request(app)
      .post(`/v2/order/${orderId}`)
      .send(orderData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('orderId', orderId);
    expect(response.body).toHaveProperty('amount', orderData.amount);
    expect(response.body).toHaveProperty('currency', orderData.currency);
  });

  it('should get order details', async () => {
    // First, create the order
    await request(app)
      .post(`/v2/order/${orderId}`)
      .send(orderData);

    const response = await request(app)
      .get(`/v2/order/${orderId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('orderId', orderId);
    expect(response.body).toHaveProperty('amount', orderData.amount);
    expect(response.body).toHaveProperty('currency', orderData.currency);
    expect(response.body).toHaveProperty('callback', orderData.callback);
  });

  it('should return 404 for non-existing order on get order', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(app)
      .get(`/v2/order/${nonExistingOrderId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });

  it('should force withdraw an order', async () => {
    // First, create the order
    await request(app)
      .post(`/v2/order/${orderId}`)
      .send(orderData);

    const response = await request(app)
      .post(`/v2/order/${orderId}/forceWithdrawal`);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('orderId', orderId);
    expect(response.body).toHaveProperty('withdrawalStatus', 'completed');
  });

  it('should return 404 for non-existing order on force withdrawal', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(app)
      .post(`/v2/order/${nonExistingOrderId}/forceWithdrawal`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });
});
