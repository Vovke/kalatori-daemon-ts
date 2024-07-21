import { DataSource } from 'typeorm';
import getDataSourceConfig from './config/data-source.config';

let dataSource: DataSource;

export const getDataSource = (): DataSource => {
  if (!dataSource) {
    dataSource = new DataSource(getDataSourceConfig());
  }
  return dataSource;
};

export default getDataSource();
