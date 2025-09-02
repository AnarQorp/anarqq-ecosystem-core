import { createServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';

async function start() {
  try {
    const server = await createServer();
    
    await server.listen({
      port: config.port,
      host: config.host
    });

    logger.info(`Qmask server started on ${config.host}:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Mode: ${config.isIntegrated ? 'Integrated' : 'Standalone'}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();