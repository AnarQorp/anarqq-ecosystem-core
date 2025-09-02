import { config } from '../config/index.js';

class Logger {
  constructor() {
    this.level = config.logging?.level || 'info';
    this.format = config.logging?.format || 'json';
  }

  log(level, message, meta = {}) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.level] || 2;
    const messageLevel = levels[level] || 2;

    if (messageLevel > currentLevel) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'qdrive',
      ...meta
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`, meta);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

export const logger = new Logger();