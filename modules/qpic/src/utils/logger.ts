import pino from 'pino';
import { config } from '../config';

const loggerOptions: any = {
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  formatters: {
    level: (label: string) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'qpic',
    version: '2.0.0'
  }
};

if (config.nodeEnv === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  };
}

export const logger = pino(loggerOptions);