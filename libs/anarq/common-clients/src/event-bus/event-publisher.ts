import { EventPublicationRequest, IdentityRef } from '@anarq/common-schemas';
import { eventBus } from './event-bus';
import { generateCorrelationId } from '../utils/correlation-id';

/**
 * Event Publisher - Simplified interface for publishing events
 */
export class EventPublisher {
  private defaultActor: IdentityRef;
  private modulePrefix: string;

  constructor(modulePrefix: string, defaultActor: IdentityRef) {
    this.modulePrefix = modulePrefix;
    this.defaultActor = defaultActor;
  }

  /**
   * Publishes an event with automatic topic generation
   */
  async publish<T>(
    action: string,
    payload: T,
    options?: {
      version?: number;
      actor?: IdentityRef;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    const version = options?.version || 1;
    const topic = `q.${this.modulePrefix}.${action}.v${version}`;
    
    const request: EventPublicationRequest<T> = {
      topic,
      payload,
      actor: options?.actor || this.defaultActor,
      correlationId: options?.correlationId || generateCorrelationId(),
      metadata: options?.metadata
    };

    return eventBus.publish(request);
  }

  /**
   * Publishes a creation event
   */
  async publishCreated<T>(
    resourceType: string,
    payload: T,
    options?: {
      version?: number;
      actor?: IdentityRef;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    return this.publish(`${resourceType}.created`, payload, options);
  }

  /**
   * Publishes an update event
   */
  async publishUpdated<T>(
    resourceType: string,
    payload: T,
    options?: {
      version?: number;
      actor?: IdentityRef;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    return this.publish(`${resourceType}.updated`, payload, options);
  }

  /**
   * Publishes a deletion event
   */
  async publishDeleted<T>(
    resourceType: string,
    payload: T,
    options?: {
      version?: number;
      actor?: IdentityRef;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    return this.publish(`${resourceType}.deleted`, payload, options);
  }

  /**
   * Publishes a status change event
   */
  async publishStatusChanged<T>(
    resourceType: string,
    payload: T & { status: string },
    options?: {
      version?: number;
      actor?: IdentityRef;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    errors?: string[];
  }> {
    return this.publish(`${resourceType}.status.changed`, payload, options);
  }

  /**
   * Creates a scoped publisher for a specific resource type
   */
  forResource(resourceType: string): ResourceEventPublisher {
    return new ResourceEventPublisher(this, resourceType);
  }
}

/**
 * Resource-scoped event publisher
 */
export class ResourceEventPublisher {
  constructor(
    private publisher: EventPublisher,
    private resourceType: string
  ) {}

  async created<T>(payload: T, options?: Parameters<EventPublisher['publishCreated']>[2]) {
    return this.publisher.publishCreated(this.resourceType, payload, options);
  }

  async updated<T>(payload: T, options?: Parameters<EventPublisher['publishUpdated']>[2]) {
    return this.publisher.publishUpdated(this.resourceType, payload, options);
  }

  async deleted<T>(payload: T, options?: Parameters<EventPublisher['publishDeleted']>[2]) {
    return this.publisher.publishDeleted(this.resourceType, payload, options);
  }

  async statusChanged<T extends { status: string }>(payload: T, options?: Parameters<EventPublisher['publishStatusChanged']>[2]) {
    return this.publisher.publishStatusChanged(this.resourceType, payload, options);
  }
}