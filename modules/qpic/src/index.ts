import { createServer } from './server';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import { connectRedis } from './database/redis';

async function start() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Create and start server
    const server = await createServer();
    
    await server.listen({
      port: config.port,
      host: '0.0.0.0'
    });

    logger.info(`QpiC server started on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`API Documentation: http://localhost:${config.port}/docs`);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
start();