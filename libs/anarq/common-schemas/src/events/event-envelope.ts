import { IdentityRef } from '../models/identity';

/**
 * Event Envelope - Standard wrapper for all events in the Q ecosystem
 */
export interface EventEnvelope<T = any> {
  /** Unique event ID */
  id: string;
  /** Event topic following q.<module>.<action>.<version> convention */
  topic: string;
  /** Schema version used for the payload */
  schemaVersion: string;
  /** Event payload */
  payload: T;
  /** Actor who triggered the event */
  actor: IdentityRef;
  /** Timestamp when event was created (ISO 8601) */
  timestamp: string;
  /** Correlation ID for tracing related events */
  correlationId?: string;
  /** Source module that published the event */
  source: string;
  /** Event metadata */
  metadata: {
    /** Event sequence number (for ordering) */
    sequence?: number;
    /** Retry count (for failed events) */
    retryCount?: number;
    /** Additional custom metadata */
    [key: string]: any;
  };
}

/**
 * Event Publication Request - Used when publishing events
 */
export interface EventPublicationRequest<T = any> {
  /** Event topic */
  topic: string;
  /** Event payload */
  payload: T;
  /** Actor publishing the event */
  actor: IdentityRef;
  /** Optional correlation ID */
  correlationId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Event Subscription - Configuration for event subscriptions
 */
export interface EventSubscription {
  /** Subscription ID */
  id: string;
  /** Topic pattern to subscribe to (supports wildcards) */
  topicPattern: string;
  /** Subscriber identity */
  subscriber: IdentityRef;
  /** Callback URL for webhook delivery */
  callbackUrl?: string;
  /** Filter conditions for events */
  filters?: {
    /** Filter by actor */
    actor?: IdentityRef;
    /** Filter by source module */
    source?: string;
    /** Custom payload filters */
    payload?: Record<string, any>;
  };
  /** Subscription metadata */
  metadata: {
    /** When subscription was created */
    createdAt: string;
    /** Whether subscription is active */
    active: boolean;
    /** Delivery preferences */
    delivery?: {
      /** Retry policy for failed deliveries */
      retryPolicy?: {
        maxRetries: number;
        backoffMultiplier: number;
        maxBackoffMs: number;
      };
      /** Batch delivery settings */
      batching?: {
        maxBatchSize: number;
        maxWaitMs: number;
      };
    };
  };
}

/**
 * Validates an EventEnvelope object
 */
export function isValidEventEnvelope(envelope: any): envelope is EventEnvelope {
  return (
    typeof envelope === 'object' &&
    envelope !== null &&
    typeof envelope.id === 'string' &&
    envelope.id.length > 0 &&
    typeof envelope.topic === 'string' &&
    /^q\.[a-z]+\.[a-z]+\.v\d+$/.test(envelope.topic) &&
    typeof envelope.schemaVersion === 'string' &&
    envelope.schemaVersion.length > 0 &&
    envelope.payload !== undefined &&
    typeof envelope.actor === 'object' &&
    envelope.actor !== null &&
    typeof envelope.timestamp === 'string' &&
    envelope.timestamp.length > 0 &&
    typeof envelope.source === 'string' &&
    envelope.source.length > 0 &&
    typeof envelope.metadata === 'object' &&
    envelope.metadata !== null
  );
}