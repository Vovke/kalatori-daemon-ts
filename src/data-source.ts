import { DataSource } from 'typeorm';
import Config from './config/config';
import entities from './entities';

const config = Config.getInstance().config;

export const dataSource = new DataSource({
  type: 'sqlite',
  database: config.databaseUrl,
  entities: entities,
  synchronize: true, // Automatically sync the database schema
  logging: !!config.debug,
});

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
