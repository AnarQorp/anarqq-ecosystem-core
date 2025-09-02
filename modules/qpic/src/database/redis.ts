import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export async function connectRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    await redisClient.connect();

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.disconnect();
      logger.info('Disconnected from Redis');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}