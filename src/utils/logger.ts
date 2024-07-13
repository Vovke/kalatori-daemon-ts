import { createLogger, format, transports } from 'winston';
import Config from '../config/config';

const logLevel = Config.getInstance().config.logLevel || 'info';

export const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'combined.log' })
  ]
});
