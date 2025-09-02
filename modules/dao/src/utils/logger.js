/**
 * Logging utility for DAO module
 */

import { config } from '../config/index.js';

class Logger {
  constructor() {
    this.level = config.LOG_LEVEL;
    this.format = config.LOG_FORMAT;
  }

  _log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: 'dao',
      message,
      ...meta
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
    }
  }

  info(message, meta = {}) {
    this._log('info', message, meta);
  }

  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }

  error(message, meta = {}) {
    this._log('error', message, meta);
  }

  debug(message, meta = {}) {
    if (this.level === 'debug') {
      this._log('debug', message, meta);
    }
  }
}

export const logger = new Logger();