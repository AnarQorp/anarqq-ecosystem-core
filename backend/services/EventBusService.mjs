/**
 * Event Bus Service - Integration service for Q ecosystem event bus
 * 
 * This service provides a bridge between the Q ecosystem modules and the
 * centralized event bus infrastructure.
 */

import { EventEmitter } from 'events';

/**
 * Event Bus Service for Q Ecosystem
 */
export class EventBusService {
  constructor() {
    this.emitter = new EventEmitter();
    this.eventHistory = [];
    this.subscriptions = new Map();
    this.maxHistorySize = 1000;
    this.schemas = new Map();
  }

  /**
   * Publishes an event to the bus
   */
  async publish(request) {
    try {
      // Create event envelope following Q ecosystem standards
      const envelope = {
        id: this.generateId(),
        topic: request.topic,
        schemaVersion: this.extractVersionFromTopic(request.topic),
        payload: request.payload,
        actor: request.actor,
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId || this.generateId(),
        source: this.extractModuleFromTopic(request.topic),
        metadata: {
          sequence: this.eventHistory.length + 1,
          retryCount: 0,
          ...request.metadata
        }
      };

      // Validate event structure
      const validation = this.validateEvent(envelope);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Add to history
      this.eventHistory.push(envelope);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }

      // Emit event
      this.emitter.emit(request.topic, envelope);
      this.emitter.emit('*', envelope); // Wildcard listeners

      console.log(`[EventBus] ✅ Published event: ${request.topic}`, {
        eventId: envelope.id,
        actor: envelope.actor.squidId,
        correlationId: envelope.correlationId
      });

      return {
        success: true,
        eventId: envelope.id
      };
    } catch (error) {
      console.error('[EventBus] ❌ Failed to publish event:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Subscribes to events matching a topic pattern
   */
  subscribe(topicPattern, subscriber, callback, options = {}) {
    const subscriptionId = this.generateId();
    
    const subscription = {
      id: subscriptionId,
      topicPattern,
      subscriber,
      callbackUrl: options.callbackUrl,
      filters: options.filters,
      metadata: {
        createdAt: new Date().toISOString(),
        active: true
      }
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Create event listener
    const listener = async (event) => {
      // Apply filters
      if (!this.matchesFilters(event, subscription.filters)) {
        return;
      }

      try {
        await callback(event);
      } catch (error) {
        console.error(`[EventBus] ❌ Error in event callback for subscription ${subscriptionId}:`, error);
      }
    };

    // Subscribe to specific topic or wildcard
    if (topicPattern === '*') {
      this.emitter.on('*', listener);
    } else if (topicPattern.includes('*')) {
      // Pattern matching - listen to all events and filter
      this.emitter.on('*', (event) => {
        if (this.matchesTopicPattern(event.topic, topicPattern)) {
          listener(event);
        }
      });
    } else {
      this.emitter.on(topicPattern, listener);
    }

    console.log(`[EventBus] 📡 New subscription: ${topicPattern}`, {
      subscriptionId,
      subscriber: subscriber.squidId
    });

    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.metadata.active = false;
    this.subscriptions.delete(subscriptionId);
    
    console.log(`[EventBus] 🔇 Unsubscribed: ${subscriptionId}`);
    return true;
  }

  /**
   * Registers an event schema
   */
  registerSchema(schema) {
    try {
      // Validate schema structure
      if (!this.isValidSchema(schema)) {
        return {
          success: false,
          errors: ['Invalid schema structure']
        };
      }

      // Store schema
      const key = `${schema.topic}:${schema.version}`;
      this.schemas.set(key, schema);

      console.log(`[EventBus] 📋 Registered schema: ${key}`, {
        compatibility: schema.compatibility,
        deprecated: schema.deprecated
      });

      return { success: true };
    } catch (error) {
      console.error('[EventBus] ❌ Failed to register schema:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Gets event history with optional filtering
   */
  getEventHistory(options = {}) {
    let events = [...this.eventHistory];

    if (options.topic) {
      events = events.filter(e => e.topic === options.topic);
    }

    if (options.actor) {
      events = events.filter(e => e.actor.squidId === options.actor.squidId);
    }

    if (options.since) {
      const sinceDate = new Date(options.since);
      events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (options.limit) {
      events = events.slice(-options.limit);
    }

    return events.reverse(); // Most recent first
  }

  /**
   * Gets active subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.values()).filter(s => s.metadata.active);
  }

  /**
   * Gets bus statistics
   */
  getStats() {
    const topicCounts = {};
    
    for (const event of this.eventHistory) {
      topicCounts[event.topic] = (topicCounts[event.topic] || 0) + 1;
    }

    return {
      totalEvents: this.eventHistory.length,
      activeSubscriptions: this.getSubscriptions().length,
      registeredSchemas: this.schemas.size,
      topicCounts
    };
  }

  /**
   * Clears event history
   */
  clearHistory() {
    this.eventHistory = [];
    console.log('[EventBus] 🧹 Event history cleared');
  }

  // Helper methods

  generateId() {
    return 'evt_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  extractVersionFromTopic(topic) {
    const match = topic.match(/\.v(\d+)$/);
    return match ? `v${match[1]}` : 'v1';
  }

  extractModuleFromTopic(topic) {
    const match = topic.match(/^q\.([^.]+)\./);
    return match ? match[1] : 'unknown';
  }

  validateEvent(envelope) {
    const errors = [];

    // Validate envelope structure
    if (!envelope.id || typeof envelope.id !== 'string') {
      errors.push('Event ID is required and must be a string');
    }

    if (!envelope.topic || typeof envelope.topic !== 'string') {
      errors.push('Event topic is required and must be a string');
    } else if (!/^q\.[a-z]+\.[a-z.]+\.v\d+$/.test(envelope.topic)) {
      errors.push('Event topic must follow format: q.<module>.<action>.<version>');
    }

    if (!envelope.actor || typeof envelope.actor !== 'object') {
      errors.push('Actor is required and must be an object');
    }

    if (!envelope.timestamp || typeof envelope.timestamp !== 'string') {
      errors.push('Timestamp is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  isValidSchema(schema) {
    return (
      typeof schema.topic === 'string' &&
      /^q\.[a-z]+\.[a-z.]+\.v\d+$/.test(schema.topic) &&
      typeof schema.version === 'string' &&
      typeof schema.schema === 'object' &&
      schema.schema !== null &&
      ['BACKWARD', 'FORWARD', 'FULL', 'NONE'].includes(schema.compatibility) &&
      typeof schema.deprecated === 'boolean'
    );
  }

  matchesTopicPattern(topic, pattern) {
    if (pattern === '*') return true;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`).test(topic);
  }

  matchesFilters(event, filters) {
    if (!filters) return true;

    if (filters.actor && event.actor.squidId !== filters.actor.squidId) {
      return false;
    }

    if (filters.source && event.source !== filters.source) {
      return false;
    }

    if (filters.payload) {
      for (const [key, value] of Object.entries(filters.payload)) {
        if (event.payload[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }
}

// Global event bus instance
export const eventBusService = new EventBusService();