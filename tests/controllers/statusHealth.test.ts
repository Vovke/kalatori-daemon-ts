import request from 'supertest';
import app from '../../src/app';
import { initializeDataSource, closeDataSource } from '../../src/data-source';

beforeAll(async () => {
  await initializeDataSource();
});

afterAll(async () => {
  await closeDataSource();
});

describe('Status and Health Endpoints', () => {
  it('should return status information', async () => {
    const response = await request(app).get('/v2/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('server_info');
    expect(response.body.server_info).toHaveProperty('version');
    expect(response.body.server_info).toHaveProperty('instance_id');
    expect(response.body.server_info).toHaveProperty('debug');
    expect(response.body.server_info).toHaveProperty('kalatori_remark');
    expect(response.body).toHaveProperty('supported_currencies');
  });

  it('should return health information', async () => {
    const response = await request(app).get('/v2/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('server_info');
    expect(response.body.server_info).toHaveProperty('version');
    expect(response.body.server_info).toHaveProperty('instance_id');
    expect(response.body.server_info).toHaveProperty('debug');
    expect(response.body.server_info).toHaveProperty('kalatori_remark');
    expect(response.body).toHaveProperty('connected_rpcs');
    expect(response.body).toHaveProperty('status');
  });
});
