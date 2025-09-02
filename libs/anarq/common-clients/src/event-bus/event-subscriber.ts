import { EventEnvelope, IdentityRef } from '@anarq/common-schemas';
import { eventBus } from './event-bus';

/**
 * Event Handler - Function that processes events
 */
export type EventHandler<T = any> = (event: EventEnvelope<T>) => void | Promise<void>;

/**
 * Event Subscriber - Simplified interface for subscribing to events
 */
export class EventSubscriber {
  private subscriber: IdentityRef;
  private subscriptions: Set<string> = new Set();

  constructor(subscriber: IdentityRef) {
    this.subscriber = subscriber;
  }

  /**
   * Subscribes to events from a specific module
   */
  subscribeToModule(
    module: string,
    handler: EventHandler,
    options?: {
      actions?: string[];
      versions?: string[];
      filters?: {
        actor?: IdentityRef;
        payload?: Record<string, any>;
      };
    }
  ): string {
    let pattern: string;
    
    if (options?.actions && options.actions.length > 0) {
      if (options.actions.length === 1) {
        const version = options.versions?.[0] || '*';
        pattern = `q.${module}.${options.actions[0]}.${version}`;
      } else {
        // Multiple actions - use wildcard and filter
        pattern = `q.${module}.*`;
      }
    } else {
      pattern = `q.${module}.*`;
    }

    const subscriptionId = eventBus.subscribe(
      pattern,
      this.subscriber,
      (event) => {
        // Apply additional filters
        if (options?.actions && options.actions.length > 1) {
          const eventAction = this.extractActionFromTopic(event.topic);
          if (!options.actions.includes(eventAction)) {
            return;
          }
        }

        if (options?.versions && options.versions.length > 0) {
          const eventVersion = this.extractVersionFromTopic(event.topic);
          if (!options.versions.includes(eventVersion)) {
            return;
          }
        }

        handler(event);
      },
      {
        filters: options?.filters
      }
    );

    this.subscriptions.add(subscriptionId);
    return subscriptionId;
  }

  /**
   * Subscribes to a specific event type
   */
  subscribeToEvent(
    module: string,
    action: string,
    handler: EventHandler,
    options?: {
      version?: string;
      filters?: {
        actor?: IdentityRef;
        payload?: Record<string, any>;
      };
    }
  ): string {
    const version = options?.version || '*';
    const topic = version === '*' ? `q.${module}.${action}.*` : `q.${module}.${action}.${version}`;

    const subscriptionId = eventBus.subscribe(
      topic,
      this.subscriber,
      handler,
      {
        filters: options?.filters
      }
    );

    this.subscriptions.add(subscriptionId);
    return subscriptionId;
  }

  /**
   * Subscribes to all events (wildcard)
   */
  subscribeToAll(
    handler: EventHandler,
    options?: {
      filters?: {
        actor?: IdentityRef;
        source?: string;
        payload?: Record<string, any>;
      };
    }
  ): string {
    const subscriptionId = eventBus.subscribe(
      '*',
      this.subscriber,
      handler,
      {
        filters: options?.filters
      }
    );

    this.subscriptions.add(subscriptionId);
    return subscriptionId;
  }

  /**
   * Subscribes to creation events for a resource type
   */
  subscribeToCreated(
    module: string,
    resourceType: string,
    handler: EventHandler,
    options?: {
      version?: string;
      filters?: {
        actor?: IdentityRef;
        payload?: Record<string, any>;
      };
    }
  ): string {
    return this.subscribeToEvent(module, `${resourceType}.created`, handler, options);
  }

  /**
   * Subscribes to update events for a resource type
   */
  subscribeToUpdated(
    module: string,
    resourceType: string,
    handler: EventHandler,
    options?: {
      version?: string;
      filters?: {
        actor?: IdentityRef;
        payload?: Record<string, any>;
      };
    }
  ): string {
    return this.subscribeToEvent(module, `${resourceType}.updated`, handler, options);
  }

  /**
   * Subscribes to deletion events for a resource type
   */
  subscribeToDeleted(
    module: string,
    resourceType: string,
    handler: EventHandler,
    options?: {
      version?: string;
      filters?: {
        actor?: IdentityRef;
        payload?: Record<string, any>;
      };
    }
  ): string {
    return this.subscribeToEvent(module, `${resourceType}.deleted`, handler, options);
  }

  /**
   * Unsubscribes from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const success = eventBus.unsubscribe(subscriptionId);
    if (success) {
      this.subscriptions.delete(subscriptionId);
    }
    return success;
  }

  /**
   * Unsubscribes from all subscriptions
   */
  unsubscribeAll(): void {
    for (const subscriptionId of this.subscriptions) {
      eventBus.unsubscribe(subscriptionId);
    }
    this.subscriptions.clear();
  }

  /**
   * Gets active subscription IDs
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private extractActionFromTopic(topic: string): string {
    const match = topic.match(/^q\.[^.]+\.([^.]+)\./);
    return match ? match[1] : '';
  }

  private extractVersionFromTopic(topic: string): string {
    const match = topic.match(/\.(v\d+)$/);
    return match ? match[1] : '';
  }
}