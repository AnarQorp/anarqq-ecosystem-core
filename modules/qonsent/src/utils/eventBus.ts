import { EventEmitter } from 'events';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from './logger';
import { EventPayload } from '../types';

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private redisClient: RedisClientType | null = null;
  private connected = false;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for high-throughput scenarios
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (config.eventBus.type === 'redis') {
        await this.connectRedis();
      } else if (config.eventBus.type === 'mock') {
        await this.connectMock();
      }

      this.connected = true;
      logger.info('Event bus connected successfully', { type: config.eventBus.type });

    } catch (error) {
      logger.error('Failed to connect to event bus:', error);
      throw error;
    }
  }

  private async connectRedis(): Promise<void> {
    this.redisClient = createClient({
      url: config.eventBus.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.connected = false;
    });

    this.redisClient.on('connect', () => {
      logger.debug('Redis client connected');
    });

    this.redisClient.on('ready', () => {
      logger.debug('Redis client ready');
      this.connected = true;
    });

    this.redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
      this.connected = false;
    });

    await this.redisClient.connect();
  }

  private async connectMock(): Promise<void> {
    // Mock connection for development/testing
    logger.debug('Using mock event bus');
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
      }

      this.connected = false;
      logger.info('Event bus disconnected');

    } catch (error) {
      logger.error('Error disconnecting from event bus:', error);
      throw error;
    }
  }

  async publish(topic: string, payload: EventPayload): Promise<void> {
    try {
      logger.debug('Publishing event', { topic, eventId: payload.eventId });

      // Validate event payload
      this.validateEventPayload(payload);

      if (config.eventBus.type === 'redis' && this.redisClient) {
        await this.publishToRedis(topic, payload);
      } else {
        await this.publishToMock(topic, payload);
      }

      // Emit locally for any local subscribers
      this.emit(topic, payload);
      this.emit('*', { topic, payload });

      logger.debug('Event published successfully', { topic, eventId: payload.eventId });

    } catch (error) {
      logger.error('Failed to publish event', { error, topic, eventId: payload.eventId });
      throw error;
    }
  }

  private async publishToRedis(topic: string, payload: EventPayload): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not connected');
    }

    const message = JSON.stringify(payload);
    await this.redisClient.publish(topic, message);
  }

  private async publishToMock(topic: string, payload: EventPayload): Promise<void> {
    // Mock publishing - just log the event
    logger.debug('Mock event published', { topic, payload });
  }

  async subscribe(pattern: string, callback: (payload: EventPayload) => void): Promise<void> {
    try {
      logger.debug('Subscribing to event pattern', { pattern });

      if (config.eventBus.type === 'redis' && this.redisClient) {
        await this.subscribeToRedis(pattern, callback);
      } else {
        await this.subscribeToMock(pattern, callback);
      }

      logger.debug('Subscribed to event pattern successfully', { pattern });

    } catch (error) {
      logger.error('Failed to subscribe to event pattern', { error, pattern });
      throw error;
    }
  }

  private async subscribeToRedis(pattern: string, callback: (payload: EventPayload) => void): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not connected');
    }

    const subscriber = this.redisClient.duplicate();
    await subscriber.connect();

    if (pattern.includes('*')) {
      await subscriber.pSubscribe(pattern, (message, channel) => {
        try {
          const payload = JSON.parse(message) as EventPayload;
          callback(payload);
        } catch (error) {
          logger.error('Failed to parse event message', { error, message, channel });
        }
      });
    } else {
      await subscriber.subscribe(pattern, (message, channel) => {
        try {
          const payload = JSON.parse(message) as EventPayload;
          callback(payload);
        } catch (error) {
          logger.error('Failed to parse event message', { error, message, channel });
        }
      });
    }
  }

  private async subscribeToMock(pattern: string, callback: (payload: EventPayload) => void): Promise<void> {
    // Mock subscription - use local EventEmitter
    if (pattern.includes('*')) {
      this.on('*', ({ topic, payload }) => {
        if (this.matchesPattern(topic, pattern)) {
          callback(payload);
        }
      });
    } else {
      this.on(pattern, callback);
    }
  }

  private matchesPattern(topic: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(topic);
  }

  private validateEventPayload(payload: EventPayload): void {
    if (!payload.eventId) {
      throw new Error('Event payload must have an eventId');
    }

    if (!payload.timestamp) {
      throw new Error('Event payload must have a timestamp');
    }

    if (!payload.source) {
      throw new Error('Event payload must have a source');
    }

    if (!payload.type) {
      throw new Error('Event payload must have a type');
    }

    if (!payload.data) {
      throw new Error('Event payload must have data');
    }

    // Validate event type format
    const eventTypePattern = /^q\.[a-z]+\.[a-z]+\.v\d+$/;
    if (!eventTypePattern.test(payload.type)) {
      throw new Error(`Invalid event type format: ${payload.type}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): {
    connected: boolean;
    type: string;
    url?: string;
  } {
    return {
      connected: this.connected,
      type: config.eventBus.type,
      url: config.eventBus.type === 'redis' ? config.eventBus.url : undefined,
    };
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Connect on module load
export async function connectEventBus(): Promise<void> {
  await eventBus.connect();
}