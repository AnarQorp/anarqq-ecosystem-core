import { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './utils/database';
import { connectEventBus } from './utils/eventBus';

async function start() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to event bus
    await connectEventBus();
    logger.info('Event bus connected successfully');

    // Build and start the application
    const app: FastifyInstance = await buildApp();
    
    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Qonsent service started on ${config.host}:${config.port}`);
    logger.info(`Environment: ${config.env}`);
    logger.info(`API Documentation: http://${config.host}:${config.port}/docs`);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        await app.close();
        logger.info('HTTP server closed');
        
        // Close database connection
        const mongoose = await import('mongoose');
        await mongoose.connection.close();
        logger.info('Database connection closed');
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { buildApp };