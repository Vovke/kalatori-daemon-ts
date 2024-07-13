import { DataSource } from 'typeorm';
import * as path from 'path';

const env = process.env.NODE_ENV || 'development';
const configPath = path.resolve(__dirname, `../config/ormconfig.${env}.json`);

export const dataSource = new DataSource(require(configPath));

export const initializeDataSource = async (): Promise<void> => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
};

export const closeDataSource = async (): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};

export default dataSource;
