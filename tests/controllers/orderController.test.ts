import request from 'supertest';
import app from '../../src/app';
import { ApiPromise, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import {
  connectPolkadot,
  subscribeToBlocks,
  applyDecimals,
  getAssetDecimals
} from '../../src/utils/polkadot';
import dataSource from '../../src/data-source';

describe('Order Controller', () => {
  let api: ApiPromise;
  const dotOrderData = {
    amount: 100,
    currency: 'DOT',
    callback: 'https://example.com/callback'
  };
  const usdcOrderData = {
    amount: 100,
    currency: 'USDC',
    callback: 'https://example.com/callback'
  };

  jest.setTimeout(30000);

  const setupApi = async () => {
    api = await connectPolkadot();
    await cryptoWaitReady();
    await api.isReady;
  };

  const generateRandomOrderId = () => {
    return `order_${Math.random().toString(36).substring(2, 15)}`;
  }

  const createOrder = async (orderId: string, orderData: any) => {
    const response = await request(app)
      .post(`/v2/order/${orderId}`)
      .send(orderData);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('orderId', orderId);
    expect(response.body).toHaveProperty('amount', orderData.amount);
    expect(response.body).toHaveProperty('currency', orderData.currency);
    return response.body;
  };

  const getOrderDetails = async (orderId: string) => {
    const response = await request(app)
      .get(`/v2/order/${orderId}`);
    expect(response.status).toBe(200);
    return response.body;
  };

  const transferFunds = async (paymentAccount: string, amount: number, assetId?: number) => {
    const keyring = new Keyring({ type: 'sr25519' });
    const sender = keyring.addFromUri('//Alice');
    let transfer;
    let signerOptions = {};

    if (assetId) {
      const decimals = await getAssetDecimals(api, assetId);
      const adjustedAmount = applyDecimals(amount, decimals);
      transfer = api.tx.assets.transfer(assetId, paymentAccount, adjustedAmount);
      signerOptions = {
        tip: 0,
        assetId: { parents: 0, interior: { X2: [{ palletInstance: 50 }, { generalIndex: assetId }] } }
      };
    } else {
      const adjustedAmount = applyDecimals(amount, 10);
      transfer = api.tx.balances.transferKeepAlive(paymentAccount, adjustedAmount);
    }

    const unsub = await transfer.signAndSend(sender, signerOptions, async ({ status }) => {
      if (status.isInBlock || status.isFinalized) {
        unsub();
      }
    });

    // Wait for transaction to be included in block
    await new Promise(resolve => setTimeout(resolve, 5000));
  };

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      await dataSource.runMigrations();
    }
    await setupApi();
    await subscribeToBlocks();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await api.disconnect();
  });

  it('should create a new order', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
  });

  it('should get order details', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);
    expect(orderDetails).toHaveProperty('orderId', orderId);
    expect(orderDetails).toHaveProperty('amount', dotOrderData.amount);
    expect(orderDetails).toHaveProperty('currency', dotOrderData.currency);
    expect(orderDetails).toHaveProperty('callback', dotOrderData.callback);
  });

  it('should return 404 for non-existing order on get order', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(app)
      .get(`/v2/order/${nonExistingOrderId}`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });

  it('should create, repay, and automatically withdraw an order in DOT', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    await setupApi();
    await transferFunds(paymentAccount, dotOrderData.amount);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(dotOrderData.amount);
  });

  it('should create, repay, and automatically withdraw an order in USDC', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    await setupApi();
    const assetId = 1337;
    await transferFunds(paymentAccount, usdcOrderData.amount, assetId);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(usdcOrderData.amount);
  });

  it('should not automatically withdraw an order until fully repaid', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    await setupApi();
    const assetId = 1337;
    const halfAmount = 50;

    // Partial repayment
    await transferFunds(paymentAccount, halfAmount, assetId);
    let repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('pending');
    expect(repaidOrderDetails.withdrawalStatus).toBe('waiting');
    expect(repaidOrderDetails.repaidAmount).toBe(halfAmount);

    // Full repayment
    await transferFunds(paymentAccount, halfAmount, assetId);
    repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(usdcOrderData.amount);
  });

  it('should not update order if received payment in wrong currency', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    await setupApi();
    const assetId = 1984;
    await transferFunds(paymentAccount, usdcOrderData.amount, assetId);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('pending');
    expect(repaidOrderDetails.withdrawalStatus).toBe('waiting');
    expect(repaidOrderDetails.repaidAmount).toBe(0);
  });

  it('should return 404 for non-existing order on force withdrawal', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(app)
      .post(`/v2/order/${nonExistingOrderId}/forceWithdrawal`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });
});
