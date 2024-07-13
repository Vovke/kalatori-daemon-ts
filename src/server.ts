import 'reflect-metadata';
import app from './app';
import { logger } from './utils/logger';
import Config from './config/config';
import { subscribeToBlocks } from './utils/polkadot';

const config = Config.getInstance().config;
const PORT = config.port;

const startServer = async () => {
  try {
    await subscribeToBlocks();
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
