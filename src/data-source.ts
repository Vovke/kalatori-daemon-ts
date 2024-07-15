import { DataSource } from 'typeorm';
import getDataSourceConfig from './config/data-source.config';

const dataSource = new DataSource(getDataSourceConfig());

// export { dataSource };
export default dataSource;
