#!/usr/bin/env node

/**
 * Qindex Module - Indexing & Pointers
 * 
 * Standalone module for lightweight indexing, mutable pointers,
 * append-only history tracking, and simple queries.
 */

import { createServer } from './server.js';
import { QindexCore } from './core/QindexCore.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

async function main() {
  try {
    logger.info('Starting Qindex module...', {
      mode: config.mode,
      port: config.port,
      version: config.version
    });

    // Initialize core service
    const qindexCore = new QindexCore(config);
    await qindexCore.initialize();

    // Create and start server
    const server = createServer(qindexCore);
    
    server.listen(config.port, () => {
      logger.info(`Qindex server running on port ${config.port}`, {
        mode: config.mode,
        endpoints: {
          health: `http://localhost:${config.port}/health`,
          api: `http://localhost:${config.port}/qindex`,
          docs: `http://localhost:${config.port}/docs`
        }
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await qindexCore.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await qindexCore.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Qindex module', { error: error.message });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

main();