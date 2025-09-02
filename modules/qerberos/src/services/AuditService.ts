/**
 * Audit Service
 * Handles immutable audit logging with IPFS storage and cryptographic signatures
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger, auditLogger } from '../utils/logger';
import { IPFSStorageService } from './IPFSStorageService';
import { EventBusService } from './EventBusService';
import { AuditEvent, IdentityRef } from '../types';

export interface AuditEventRequest {
  type: string;
  ref: string;
  actor: IdentityRef;
  layer: string;
  verdict: 'ALLOW' | 'DENY' | 'WARN';
  details?: Record<string, any>;
  cid?: string;
}

export interface AuditEventSearchCriteria {
  type?: string;
  actor?: string;
  layer?: string;
  verdict?: 'ALLOW' | 'DENY' | 'WARN';
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditEventSearchResult {
  events: AuditEvent[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class AuditService {
  private auditEvents: Map<string, AuditEvent> = new Map();
  private eventIndex: Map<string, Set<string>> = new Map();

  constructor(
    private ipfsStorage: IPFSStorageService,
    private eventBus: EventBusService
  ) {}

  /**
   * Log an audit event to the immutable audit trail
   */
  async logAuditEvent(request: AuditEventRequest): Promise<AuditEvent> {
    try {
      const eventId = uuidv4();
      const timestamp = new Date().toISOString();

      // Create audit event
      const auditEvent: AuditEvent = {
        id: eventId,
        type: request.type,
        ref: request.ref,
        actor: request.actor,
        layer: request.layer,
        verdict: request.verdict,
        details: request.details || {},
        cid: request.cid,
        timestamp,
        signature: '', // Will be set after signing
        ipfsCid: '' // Will be set after IPFS storage
      };

      // Generate cryptographic signature
      auditEvent.signature = await this.signAuditEvent(auditEvent);

      // Store in IPFS for immutability
      const ipfsCid = await this.storeInIPFS(auditEvent);
      auditEvent.ipfsCid = ipfsCid;

      // Store in local cache for fast access
      this.auditEvents.set(eventId, auditEvent);

      // Update indexes
      this.updateIndexes(auditEvent);

      // Log to audit logger
      auditLogger.info('Audit event logged', {
        eventId,
        type: request.type,
        actor: request.actor.squidId,
        layer: request.layer,
        verdict: request.verdict,
        ipfsCid
      });

      // Publish event to event bus
      await this.publishAuditEvent(auditEvent);

      logger.info('Audit event logged successfully', {
        eventId,
        type: request.type,
        ipfsCid
      });

      return auditEvent;

    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
      throw error;
    }
  }

  /**
   * Retrieve a specific audit event by ID
   */
  async getAuditEvent(id: string): Promise<AuditEvent | null> {
    try {
      // Check local cache first
      const cachedEvent = this.auditEvents.get(id);
      if (cachedEvent) {
        return cachedEvent;
      }

      // Try to load from IPFS
      const event = await this.loadFromIPFS(id);
      if (event) {
        // Verify signature
        const signatureValid = await this.verifyAuditEvent(event);
        if (!signatureValid) {
          logger.warn('Invalid signature for audit event', { id });
          return null;
        }

        // Cache for future access
        this.auditEvents.set(id, event);
        return event;
      }

      return null;

    } catch (error) {
      logger.error('Failed to retrieve audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      throw error;
    }
  }

  /**
   * Search audit events with filtering and pagination
   */
  async searchAuditEvents(criteria: AuditEventSearchCriteria): Promise<AuditEventSearchResult> {
    try {
      const limit = Math.min(criteria.limit || 100, 1000);
      const offset = criteria.offset || 0;

      // Get all events (in production, this would use proper indexing)
      let events = Array.from(this.auditEvents.values());

      // Apply filters
      if (criteria.type) {
        events = events.filter(event => event.type === criteria.type);
      }

      if (criteria.actor) {
        events = events.filter(event => event.actor.squidId === criteria.actor);
      }

      if (criteria.layer) {
        events = events.filter(event => event.layer === criteria.layer);
      }

      if (criteria.verdict) {
        events = events.filter(event => event.verdict === criteria.verdict);
      }

      if (criteria.startDate) {
        const startDate = new Date(criteria.startDate);
        events = events.filter(event => new Date(event.timestamp) >= startDate);
      }

      if (criteria.endDate) {
        const endDate = new Date(criteria.endDate);
        events = events.filter(event => new Date(event.timestamp) <= endDate);
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totalCount = events.length;
      const paginatedEvents = events.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      logger.info('Audit events searched', {
        criteria,
        totalCount,
        returnedCount: paginatedEvents.length
      });

      return {
        events: paginatedEvents,
        totalCount,
        limit,
        offset,
        hasMore
      };

    } catch (error) {
      logger.error('Failed to search audit events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        criteria
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByVerdict: Record<string, number>;
    eventsByLayer: Record<string, number>;
    recentActivity: AuditEvent[];
  }> {
    try {
      const events = Array.from(this.auditEvents.values());
      
      const eventsByType: Record<string, number> = {};
      const eventsByVerdict: Record<string, number> = {};
      const eventsByLayer: Record<string, number> = {};

      events.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        eventsByVerdict[event.verdict] = (eventsByVerdict[event.verdict] || 0) + 1;
        eventsByLayer[event.layer] = (eventsByLayer[event.layer] || 0) + 1;
      });

      // Get recent activity (last 10 events)
      const recentActivity = events
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        totalEvents: events.length,
        eventsByType,
        eventsByVerdict,
        eventsByLayer,
        recentActivity
      };

    } catch (error) {
      logger.error('Failed to get audit statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify the integrity of an audit event
   */
  async verifyAuditEvent(event: AuditEvent): Promise<boolean> {
    try {
      // Create a copy without signature for verification
      const eventForVerification = { ...event };
      delete eventForVerification.signature;

      // Generate expected signature
      const expectedSignature = await this.signAuditEvent(eventForVerification);

      // Compare signatures
      return event.signature === expectedSignature;

    } catch (error) {
      logger.error('Failed to verify audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.id
      });
      return false;
    }
  }

  /**
   * Generate cryptographic signature for an audit event
   */
  private async signAuditEvent(event: Partial<AuditEvent>): Promise<string> {
    // Create canonical representation for signing
    const canonicalEvent = {
      id: event.id,
      type: event.type,
      ref: event.ref,
      actor: event.actor,
      layer: event.layer,
      verdict: event.verdict,
      details: event.details,
      cid: event.cid,
      timestamp: event.timestamp
    };

    // Convert to JSON string with sorted keys
    const eventString = JSON.stringify(canonicalEvent, Object.keys(canonicalEvent).sort());

    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(eventString).digest('hex');

    // In production, this would use Qlock for cryptographic signing
    // For now, we'll use a simple HMAC
    const secret = process.env.AUDIT_SIGNING_SECRET || 'qerberos-audit-secret';
    const signature = crypto.createHmac('sha256', secret).update(hash).digest('hex');

    return `sha256:${signature}`;
  }

  /**
   * Store audit event in IPFS
   */
  private async storeInIPFS(event: AuditEvent): Promise<string> {
    try {
      // Create IPFS path based on timestamp
      const date = new Date(event.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const path = `/qerberos/audit/${year}/${month}/${day}/${event.id}.json`;

      // Store in IPFS
      const cid = await this.ipfsStorage.store(path, event);
      
      logger.debug('Audit event stored in IPFS', {
        eventId: event.id,
        path,
        cid
      });

      return cid;

    } catch (error) {
      logger.error('Failed to store audit event in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.id
      });
      throw error;
    }
  }

  /**
   * Load audit event from IPFS
   */
  private async loadFromIPFS(eventId: string): Promise<AuditEvent | null> {
    try {
      // In production, we would use proper indexing to find the IPFS path
      // For now, we'll simulate this
      const mockPath = `/qerberos/audit/2024/02/08/${eventId}.json`;
      
      const event = await this.ipfsStorage.retrieve(mockPath);
      return event as AuditEvent;

    } catch (error) {
      logger.debug('Failed to load audit event from IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId
      });
      return null;
    }
  }

  /**
   * Update search indexes
   */
  private updateIndexes(event: AuditEvent): void {
    // Type index
    if (!this.eventIndex.has(`type:${event.type}`)) {
      this.eventIndex.set(`type:${event.type}`, new Set());
    }
    this.eventIndex.get(`type:${event.type}`)!.add(event.id);

    // Actor index
    if (!this.eventIndex.has(`actor:${event.actor.squidId}`)) {
      this.eventIndex.set(`actor:${event.actor.squidId}`, new Set());
    }
    this.eventIndex.get(`actor:${event.actor.squidId}`)!.add(event.id);

    // Layer index
    if (!this.eventIndex.has(`layer:${event.layer}`)) {
      this.eventIndex.set(`layer:${event.layer}`, new Set());
    }
    this.eventIndex.get(`layer:${event.layer}`)!.add(event.id);

    // Verdict index
    if (!this.eventIndex.has(`verdict:${event.verdict}`)) {
      this.eventIndex.set(`verdict:${event.verdict}`, new Set());
    }
    this.eventIndex.get(`verdict:${event.verdict}`)!.add(event.id);
  }

  /**
   * Publish audit event to event bus
   */
  private async publishAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const eventPayload = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        auditEventId: event.id,
        type: event.type,
        actor: event.actor,
        layer: event.layer,
        verdict: event.verdict,
        ipfsCid: event.ipfsCid,
        signature: event.signature
      };

      await this.eventBus.publish('q.qerberos.audit.logged.v1', eventPayload);

      logger.debug('Audit event published to event bus', {
        auditEventId: event.id,
        eventTopic: 'q.qerberos.audit.logged.v1'
      });

    } catch (error) {
      logger.error('Failed to publish audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        auditEventId: event.id
      });
      // Don't throw - audit logging should not fail due to event bus issues
    }
  }
}