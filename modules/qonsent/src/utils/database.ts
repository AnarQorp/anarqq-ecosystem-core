import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from './logger';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.debug('Database already connected');
    return;
  }

  try {
    logger.info('Connecting to MongoDB...', { uri: config.database.uri.replace(/\/\/.*@/, '//***:***@') });

    await mongoose.connect(config.database.uri, {
      ...config.database.options,
      bufferCommands: false,
    });

    isConnected = true;
    logger.info('Successfully connected to MongoDB');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export function getDatabaseStatus(): {
  connected: boolean;
  readyState: number;
  host?: string;
  name?: string;
} {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}