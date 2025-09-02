/**
 * Event Bus Service
 * Handles event publishing and subscription for the Q ecosystem
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { EventBusConfig, EventMessage } from '../types';

export class EventBusService {
  private eventEmitter: EventEmitter;
  private subscribers: Map<string, Set<(message: EventMessage) => void>> = new Map();
  private publishedEvents: EventMessage[] = [];
  private isInitialized = false;

  constructor(private config: EventBusConfig) {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // Increase limit for many subscribers
  }

  /**
   * Initialize event bus service
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.type === 'redis' && this.config.url) {
        // In a real implementation, we would connect to Redis here
        logger.warn('Redis event bus not implemented, using in-memory event bus');
      }

      // Use in-memory event bus for now
      this.isInitialized = true;
      
      logger.info('Event bus service initialized', {
        type: this.config.type,
        inMemory: true
      });

    } catch (error) {
      logger.error('Failed to initialize event bus service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Publish an event to the event bus
   */
  async publish(topic: string, payload: any, options?: {
    correlationId?: string;
    source?: string;
    version?: string;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Event bus service not initialized');
      }

      const message: EventMessage = {
        id: uuidv4(),
        topic,
        payload,
        timestamp: new Date().toISOString(),
        source: options?.source || 'qerberos',
        version: options?.version || '1.0.0',
        correlationId: options?.correlationId
      };

      // Store in history
      this.publishedEvents.push(message);
      
      // Keep only last 1000 events
      if (this.publishedEvents.length > 1000) {
        this.publishedEvents = this.publishedEvents.slice(-1000);
      }

      // Emit to subscribers
      this.eventEmitter.emit(topic, message);
      
      // Also emit to wildcard subscribers
      const topicParts = topic.split('.');
      for (let i = 1; i <= topicParts.length; i++) {
        const wildcardTopic = topicParts.slice(0, i).join('.') + '.*';
        this.eventEmitter.emit(wildcardTopic, message);
      }

      logger.debug('Event published', {
        topic,
        messageId: message.id,
        payloadSize: JSON.stringify(payload).length
      });

    } catch (error) {
      logger.error('Failed to publish event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic
      });
      throw error;
    }
  }

  /**
   * Subscribe to events on a topic
   */
  async subscribe(
    topic: string,
    handler: (message: EventMessage) => void | Promise<void>,
    options?: {
      once?: boolean;
      filter?: (message: EventMessage) => boolean;
    }
  ): Promise<() => void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Event bus service not initialized');
      }

      const wrappedHandler = async (message: EventMessage) => {
        try {
          // Apply filter if provided
          if (options?.filter && !options.filter(message)) {
            return;
          }

          await handler(message);
          
          logger.debug('Event handled', {
            topic,
            messageId: message.id,
            handler: handler.name || 'anonymous'
          });

        } catch (error) {
          logger.error('Error in event handler', {
            error: error instanceof Error ? error.message : 'Unknown error',
            topic,
            messageId: message.id,
            handler: handler.name || 'anonymous'
          });
        }
      };

      // Add to subscribers map
      if (!this.subscribers.has(topic)) {
        this.subscribers.set(topic, new Set());
      }
      this.subscribers.get(topic)!.add(wrappedHandler);

      // Subscribe to event emitter
      if (options?.once) {
        this.eventEmitter.once(topic, wrappedHandler);
      } else {
        this.eventEmitter.on(topic, wrappedHandler);
      }

      logger.debug('Subscribed to topic', {
        topic,
        once: options?.once || false,
        subscriberCount: this.subscribers.get(topic)!.size
      });

      // Return unsubscribe function
      return () => {
        this.eventEmitter.removeListener(topic, wrappedHandler);
        this.subscribers.get(topic)?.delete(wrappedHandler);
        
        logger.debug('Unsubscribed from topic', {
          topic,
          subscriberCount: this.subscribers.get(topic)?.size || 0
        });
      };

    } catch (error) {
      logger.error('Failed to subscribe to topic', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic
      });
      throw error;
    }
  }

  /**
   * Get event history
   */
  getEventHistory(options?: {
    topic?: string;
    since?: string;
    limit?: number;
  }): EventMessage[] {
    try {
      let events = [...this.publishedEvents];

      // Filter by topic
      if (options?.topic) {
        events = events.filter(event => {
          if (options.topic!.endsWith('*')) {
            const prefix = options.topic!.slice(0, -1);
            return event.topic.startsWith(prefix);
          }
          return event.topic === options.topic;
        });
      }

      // Filter by timestamp
      if (options?.since) {
        const sinceDate = new Date(options.since);
        events = events.filter(event => new Date(event.timestamp) >= sinceDate);
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit) {
        events = events.slice(0, options.limit);
      }

      return events;

    } catch (error) {
      logger.error('Failed to get event history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options
      });
      return [];
    }
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    totalTopics: number;
    totalSubscribers: number;
    topicStats: Array<{
      topic: string;
      subscriberCount: number;
    }>;
  } {
    try {
      const topicStats = Array.from(this.subscribers.entries()).map(([topic, subscribers]) => ({
        topic,
        subscriberCount: subscribers.size
      }));

      const totalSubscribers = topicStats.reduce((total, stat) => total + stat.subscriberCount, 0);

      return {
        totalTopics: this.subscribers.size,
        totalSubscribers,
        topicStats
      };

    } catch (error) {
      logger.error('Failed to get subscription stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalTopics: 0,
        totalSubscribers: 0,
        topicStats: []
      };
    }
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalEvents: number;
    eventsByTopic: Record<string, number>;
    recentEvents: EventMessage[];
    eventsPerHour: number;
  } {
    try {
      const eventsByTopic: Record<string, number> = {};
      
      this.publishedEvents.forEach(event => {
        eventsByTopic[event.topic] = (eventsByTopic[event.topic] || 0) + 1;
      });

      // Calculate events per hour (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentEvents = this.publishedEvents.filter(event => 
        new Date(event.timestamp) >= oneHourAgo
      );

      return {
        totalEvents: this.publishedEvents.length,
        eventsByTopic,
        recentEvents: this.publishedEvents.slice(-10), // Last 10 events
        eventsPerHour: recentEvents.length
      };

    } catch (error) {
      logger.error('Failed to get event stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalEvents: 0,
        eventsByTopic: {},
        recentEvents: [],
        eventsPerHour: 0
      };
    }
  }

  /**
   * Clear event history (for testing)
   */
  clearEventHistory(): void {
    this.publishedEvents = [];
    logger.debug('Event history cleared');
  }

  /**
   * Remove all subscribers (for testing)
   */
  removeAllSubscribers(): void {
    this.eventEmitter.removeAllListeners();
    this.subscribers.clear();
    logger.debug('All subscribers removed');
  }

  /**
   * Check if event bus is healthy
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      initialized: boolean;
      subscriberCount: number;
      eventCount: number;
      lastEventTime?: string;
    };
  }> {
    try {
      const stats = this.getSubscriptionStats();
      const eventStats = this.getEventStats();
      
      const lastEvent = this.publishedEvents[this.publishedEvents.length - 1];
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!this.isInitialized) {
        status = 'unhealthy';
      } else if (stats.totalSubscribers === 0) {
        status = 'degraded';
      }

      return {
        status,
        details: {
          initialized: this.isInitialized,
          subscriberCount: stats.totalSubscribers,
          eventCount: eventStats.totalEvents,
          lastEventTime: lastEvent?.timestamp
        }
      };

    } catch (error) {
      logger.error('Event bus health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'unhealthy',
        details: {
          initialized: false,
          subscriberCount: 0,
          eventCount: 0
        }
      };
    }
  }

  /**
   * Close event bus service
   */
  async close(): Promise<void> {
    try {
      // Remove all listeners
      this.eventEmitter.removeAllListeners();
      this.subscribers.clear();
      this.isInitialized = false;
      
      logger.info('Event bus service closed');

    } catch (error) {
      logger.error('Error closing event bus service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}