#!/usr/bin/env node

/**
 * DAO/Communities Governance Module
 * Entry point for the standalone DAO service
 */

import { createServer } from './server.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { DatabaseManager } from './storage/database.js';

async function startService() {
  try {
    logger.info('Starting DAO/Communities Governance Module', {
      version: '1.0.0',
      mode: config.USE_MOCKS ? 'standalone' : 'integrated',
      port: config.PORT
    });

    // Initialize database
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    logger.info('Database initialized successfully');

    // Create and start server
    const server = await createServer();
    
    server.listen(config.PORT, config.HOST, () => {
      logger.info(`DAO service listening on ${config.HOST}:${config.PORT}`, {
        environment: config.NODE_ENV,
        useMocks: config.USE_MOCKS
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start DAO service', { error: error.message });
    process.exit(1);
  }
}

// Start the service
startService();