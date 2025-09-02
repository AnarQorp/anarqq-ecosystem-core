/**
 * Logging utility for Qindex module
 */

import pino from 'pino';
import { config } from '../config/index.js';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: config.logLevel,
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'qindex',
    version: config.version,
    mode: config.mode
  }
});

// Create child loggers for different components
export const createLogger = (component) => {
  return logger.child({ component });
};