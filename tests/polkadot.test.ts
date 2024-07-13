import { connectPolkadot } from '../src/utils/polkadot';
import { initializeDataSource, closeDataSource } from '../src/data-source';
import Config from '../src/config/config';

beforeAll(async () => {
  await initializeDataSource();
});

afterAll(async () => {
  await closeDataSource();
});

describe('Polkadot Integration', () => {
  it('should connect to the Polkadot network', async () => {
    const api = await connectPolkadot();
    expect(api).toBeDefined();
  });

  // More tests to follow for block subscriptions, transactions, etc.
});

describe('Configuration', () => {
  const config = Config.getInstance().config;
  it('should use the test environment variables', () => {
    expect(config.kalatori.rpc).toBe('ws://localhost:8000');
  });
});
