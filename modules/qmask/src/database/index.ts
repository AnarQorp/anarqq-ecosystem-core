import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}