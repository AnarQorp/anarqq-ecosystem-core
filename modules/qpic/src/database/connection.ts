import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB');

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}