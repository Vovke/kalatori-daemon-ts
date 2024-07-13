import Config from '../config/config';
import { logger } from '../utils/logger';

export const getStatus = async () => {
  const config = Config.getInstance().config;
  return {
    server_info: {
      version: config.version,
      instance_id: config.instanceId,
      debug: config.debug,
      kalatori_remark: config.kalatoriRemark,
    },
    supported_currencies: config.supportedCurrencies
  };
};

export const getHealth = async () => {
  const config = Config.getInstance().config;
  logger.info(`Returning health with connected RPCs: ${config.connectedRpcs.join(',')}`);
  return {
    server_info: {
      version: config.version,
      instance_id: config.instanceId,
      debug: config.debug,
      kalatori_remark: config.kalatoriRemark,
    },
    connected_rpcs: config.connectedRpcs,
    status: config.serverStatus
  };
};
