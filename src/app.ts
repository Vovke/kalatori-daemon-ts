import express from 'express';
import bodyParser from 'body-parser';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import orderController from './controllers/orderController';
import paymentController from './controllers/paymentController';
import statusController from './controllers/statusController';
import healthController from './controllers/healthController';
import dataSource from './data-source';

const app = express();

app.use(bodyParser.json());
app.use('/v2/order', orderController);
app.use('/public/v2/payment', paymentController);
app.use('/v2/status', statusController);
app.use('/v2/health', healthController);

app.use(errorHandler);

dataSource.initialize().then(() => {
  logger.info('Database connected');
}).catch(error => {
  logger.error('Database connection error:', error);
});

export default app;
