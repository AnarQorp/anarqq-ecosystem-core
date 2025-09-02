#!/usr/bin/env node

/**
 * Qdrive - Decentralized File Storage Module
 * 
 * Main entry point for the Qdrive service
 */

import { QdriveServer } from './server.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const server = new QdriveServer(config);

// Graceful shutdown handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await server.stop();
    logger.info('Server stopped successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const start = async () => {
  try {
    await server.start();
    logger.info(`Qdrive server started on port ${config.port}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();