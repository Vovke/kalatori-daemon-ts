import Config, { updateConfig } from '../src/config/config';

describe('Configuration Update', () => {
  it('should update the connected RPCs', () => {
    const newRpcUrl = 'wss://new.rpc.url';
    updateConfig({ connectedRpcs: [newRpcUrl] });

    const updatedConfig = Config.getInstance().config;
    expect(updatedConfig.connectedRpcs).toContain(newRpcUrl);
  });
});
