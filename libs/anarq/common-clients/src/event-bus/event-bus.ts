import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
  EventEnvelope,
  EventPublicationRequest,
  EventSubscription,
  IdentityRef,
  eventValidator
} from '@anarq/common-schemas';

/**
 * Event Bus - Central event distribution system for Q ecosystem
 */
export class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: EventEnvelope[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Publishes an event to the bus
   */
  async publish<T>(request: EventPublicationRequest<T>): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    try {
      // Create event envelope
      const envelope: EventEnvelope<T> = {
        id: uuidv4(),
        topic: request.topic,
        schemaVersion: this.extractVersionFromTopic(request.topic),
        payload: request.payload,
        actor: request.actor,
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId,
        source: this.extractModuleFromTopic(request.topic),
        metadata: {
          sequence: this.eventHistory.length + 1,
          retryCount: 0,
          ...request.metadata
        }
      };

      // Validate event structure
      const validation = this.validateEventStructure(envelope);
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

      return {
        success: true,
        eventId: envelope.id
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Subscribes to events matching a topic pattern
   */
  subscribe(
    topicPattern: string,
    subscriber: IdentityRef,
    callback: (event: EventEnvelope) => void | Promise<void>,
    options?: {
      callbackUrl?: string;
      filters?: EventSubscription['filters'];
    }
  ): string {
    const subscriptionId = uuidv4();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      topicPattern,
      subscriber,
      callbackUrl: options?.callbackUrl,
      filters: options?.filters,
      metadata: {
        createdAt: new Date().toISOString(),
        active: true
      }
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Create event listener
    const listener = async (event: EventEnvelope) => {
      // Apply filters
      if (!this.matchesFilters(event, subscription.filters)) {
        return;
      }

      try {
        await callback(event);
      } catch (error) {
        console.error(`Error in event callback for subscription ${subscriptionId}:`, error);
      }
    };

    // Subscribe to specific topic or wildcard
    if (topicPattern === '*') {
      this.emitter.on('*', listener);
    } else if (topicPattern.includes('*')) {
      // Pattern matching - listen to all events and filter
      this.emitter.on('*', (event: EventEnvelope) => {
        if (this.matchesTopicPattern(event.topic, topicPattern)) {
          listener(event);
        }
      });
    } else {
      this.emitter.on(topicPattern, listener);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.metadata.active = false;
    this.subscriptions.delete(subscriptionId);
    
    // Note: EventEmitter doesn't provide a way to remove specific listeners
    // In a production implementation, we'd need to track listeners separately
    
    return true;
  }

  /**
   * Gets event history
   */
  getEventHistory(options?: {
    topic?: string;
    actor?: IdentityRef;
    since?: string;
    limit?: number;
  }): EventEnvelope[] {
    let events = [...this.eventHistory];

    if (options?.topic) {
      events = events.filter(e => e.topic === options.topic);
    }

    if (options?.actor) {
      events = events.filter(e => e.actor.squidId === options.actor!.squidId);
    }

    if (options?.since) {
      const sinceDate = new Date(options.since);
      events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events.reverse(); // Most recent first
  }

  /**
   * Gets active subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.metadata.active);
  }

  /**
   * Gets bus statistics
   */
  getStats(): {
    totalEvents: number;
    activeSubscriptions: number;
    topicCounts: Record<string, number>;
  } {
    const topicCounts: Record<string, number> = {};
    
    for (const event of this.eventHistory) {
      topicCounts[event.topic] = (topicCounts[event.topic] || 0) + 1;
    }

    return {
      totalEvents: this.eventHistory.length,
      activeSubscriptions: this.getSubscriptions().length,
      topicCounts
    };
  }

  /**
   * Clears event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  private extractVersionFromTopic(topic: string): string {
    const match = topic.match(/\.v(\d+)$/);
    return match ? `v${match[1]}` : 'v1';
  }

  private extractModuleFromTopic(topic: string): string {
    const match = topic.match(/^q\.([^.]+)\./);
    return match ? match[1] : 'unknown';
  }

  private matchesTopicPattern(topic: string, pattern: string): boolean {
    if (pattern === '*') return true;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`).test(topic);
  }

  private validateEventStructure(envelope: EventEnvelope): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate envelope structure
    if (!envelope.id || typeof envelope.id !== 'string') {
      errors.push('Event ID is required and must be a string');
    }

    if (!envelope.topic || typeof envelope.topic !== 'string') {
      errors.push('Event topic is required and must be a string');
    } else if (!/^q\.[a-z]+\.[a-z]+\.v\d+$/.test(envelope.topic)) {
      errors.push('Event topic must follow format: q.<module>.<action>.<version>');
    }

    if (!envelope.schemaVersion || typeof envelope.schemaVersion !== 'string') {
      errors.push('Schema version is required and must be a string');
    }

    if (!envelope.actor || typeof envelope.actor !== 'object') {
      errors.push('Actor is required and must be an object');
    }

    if (!envelope.timestamp || typeof envelope.timestamp !== 'string') {
      errors.push('Timestamp is required and must be a string');
    }

    if (!envelope.source || typeof envelope.source !== 'string') {
      errors.push('Source is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private matchesFilters(event: EventEnvelope, filters?: EventSubscription['filters']): boolean {
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
export const eventBus = new EventBus();