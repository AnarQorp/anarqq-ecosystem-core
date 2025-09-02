/**
 * Event Bus Service - Pub/Sub messaging for Qwallet events
 */

import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.mode = options.mode || 'standalone';
    this.topics = new Set(options.topics || []);
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    this.setMaxListeners(100); // Increase max listeners
  }

  /**
   * Publish event to topic
   */
  async publish(topic, eventData) {
    try {
      if (!this.topics.has(topic)) {
        console.warn(`[EventBus] Unknown topic: ${topic}`);
      }

      const event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        topic,
        timestamp: new Date().toISOString(),
        ...eventData
      };

      // Store in history
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }

      // Emit to local subscribers
      this.emit(topic, event);
      this.emit('*', event); // Wildcard subscription

      // In integrated mode, publish to external event bus
      if (this.mode === 'integrated') {
        await this.publishToExternalBus(topic, event);
      }

      console.log(`[EventBus] Published event: ${topic}`);
      return { published: true, eventId: event.id };
    } catch (error) {
      console.error(`[EventBus] Failed to publish event ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to topic
   */
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    this.subscribers.get(topic).add(callback);
    this.on(topic, callback);

    console.log(`[EventBus] New subscription to topic: ${topic}`);
    
    return () => {
      this.unsubscribe(topic, callback);
    };
  }

  /**
   * Unsubscribe from topic
   */
  unsubscribe(topic, callback) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).delete(callback);
      if (this.subscribers.get(topic).size === 0) {
        this.subscribers.delete(topic);
      }
    }
    
    this.off(topic, callback);
    console.log(`[EventBus] Unsubscribed from topic: ${topic}`);
  }

  /**
   * Get event history
   */
  getEventHistory(filters = {}) {
    let events = [...this.eventHistory];

    if (filters.topic) {
      events = events.filter(event => event.topic === filters.topic);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      events = events.filter(event => new Date(event.timestamp) >= sinceDate);
    }

    if (filters.limit) {
      events = events.slice(-filters.limit);
    }

    return events;
  }

  /**
   * Get subscriber count for topic
   */
  getSubscriberCount(topic) {
    return this.subscribers.get(topic)?.size || 0;
  }

  /**
   * Get all active topics
   */
  getActiveTopics() {
    return Array.from(this.topics);
  }

  /**
   * Publish to external event bus (for integrated mode)
   */
  async publishToExternalBus(topic, event) {
    // In a real implementation, this would publish to Redis, RabbitMQ, etc.
    console.log(`[EventBus] Would publish to external bus: ${topic}`);
  }

  /**
   * Health check
   */
  getHealth() {
    return {
      status: 'healthy',
      mode: this.mode,
      topics: this.topics.size,
      subscribers: this.subscribers.size,
      eventHistory: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Shutdown
   */
  async shutdown() {
    console.log('[EventBus] Shutting down...');
    
    // Clear all listeners
    this.removeAllListeners();
    
    // Clear subscribers
    this.subscribers.clear();
    
    // Clear history
    this.eventHistory = [];
    
    console.log('[EventBus] Shutdown complete');
  }
}

export default EventBus;