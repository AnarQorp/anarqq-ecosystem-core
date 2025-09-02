/**
 * AuditService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from '../../src/services/AuditService';
import { IPFSStorageService } from '../../src/services/IPFSStorageService';
import { EventBusService } from '../../src/services/EventBusService';

// Mock the dependencies
vi.mock('../../src/services/IPFSStorageService');
vi.mock('../../src/services/EventBusService');

describe('AuditService', () => {
  let auditService: AuditService;
  let mockIPFSStorage: IPFSStorageService;
  let mockEventBus: EventBusService;

  beforeEach(() => {
    mockIPFSStorage = new IPFSStorageService({
      apiUrl: 'http://localhost:5001',
      gatewayUrl: 'http://localhost:8080',
      timeout: 30000,
      retries: 3
    });

    mockEventBus = new EventBusService({
      type: 'memory',
      retries: 3,
      timeout: 5000
    });

    // Mock the methods
    vi.spyOn(mockIPFSStorage, 'store').mockResolvedValue('QmMockCID123');
    vi.spyOn(mockEventBus, 'publish').mockResolvedValue();

    auditService = new AuditService(mockIPFSStorage, mockEventBus);
  });

  describe('logAuditEvent', () => {
    it('should log an audit event successfully', async () => {
      const request = {
        type: 'access',
        ref: 'file:test123',
        actor: {
          squidId: 'did:squid:user123',
          subId: 'work'
        },
        layer: 'qdrive',
        verdict: 'ALLOW' as const,
        details: {
          operation: 'download',
          fileName: 'test.pdf'
        }
      };

      const result = await auditService.logAuditEvent(request);

      expect(result).toBeDefined();
      expect(result.type).toBe('access');
      expect(result.actor.squidId).toBe('did:squid:user123');
      expect(result.verdict).toBe('ALLOW');
      expect(result.signature).toBeDefined();
      expect(result.ipfsCid).toBe('QmMockCID123');
      expect(mockIPFSStorage.store).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should generate unique IDs for different events', async () => {
      const request1 = {
        type: 'access',
        ref: 'file:test1',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qdrive',
        verdict: 'ALLOW' as const
      };

      const request2 = {
        type: 'access',
        ref: 'file:test2',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qdrive',
        verdict: 'ALLOW' as const
      };

      const result1 = await auditService.logAuditEvent(request1);
      const result2 = await auditService.logAuditEvent(request2);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getAuditEvent', () => {
    it('should retrieve an audit event by ID', async () => {
      const request = {
        type: 'access',
        ref: 'file:test123',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qdrive',
        verdict: 'ALLOW' as const
      };

      const loggedEvent = await auditService.logAuditEvent(request);
      const retrievedEvent = await auditService.getAuditEvent(loggedEvent.id);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.id).toBe(loggedEvent.id);
      expect(retrievedEvent?.type).toBe('access');
    });

    it('should return null for non-existent event', async () => {
      const result = await auditService.getAuditEvent('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('searchAuditEvents', () => {
    beforeEach(async () => {
      // Create some test events
      await auditService.logAuditEvent({
        type: 'access',
        ref: 'file:test1',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qdrive',
        verdict: 'ALLOW'
      });

      await auditService.logAuditEvent({
        type: 'modification',
        ref: 'file:test2',
        actor: { squidId: 'did:squid:user456' },
        layer: 'qdrive',
        verdict: 'DENY'
      });
    });

    it('should search events by type', async () => {
      const result = await auditService.searchAuditEvents({ type: 'access' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('access');
      expect(result.totalCount).toBe(1);
    });

    it('should search events by actor', async () => {
      const result = await auditService.searchAuditEvents({ actor: 'did:squid:user123' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].actor.squidId).toBe('did:squid:user123');
    });

    it('should search events by verdict', async () => {
      const result = await auditService.searchAuditEvents({ verdict: 'DENY' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].verdict).toBe('DENY');
    });

    it('should apply pagination', async () => {
      const result = await auditService.searchAuditEvents({ limit: 1, offset: 0 });

      expect(result.events).toHaveLength(1);
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getAuditStatistics', () => {
    beforeEach(async () => {
      // Create some test events
      await auditService.logAuditEvent({
        type: 'access',
        ref: 'file:test1',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qdrive',
        verdict: 'ALLOW'
      });

      await auditService.logAuditEvent({
        type: 'access',
        ref: 'file:test2',
        actor: { squidId: 'did:squid:user123' },
        layer: 'qmail',
        verdict: 'DENY'
      });
    });

    it('should return correct statistics', async () => {
      const stats = await auditService.getAuditStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByType.access).toBe(2);
      expect(stats.eventsByVerdict.ALLOW).toBe(1);
      expect(stats.eventsByVerdict.DENY).toBe(1);
      expect(stats.eventsByLayer.qdrive).toBe(1);
      expect(stats.eventsByLayer.qmail).toBe(1);
      expect(stats.recentActivity).toHaveLength(2);
    });
  });
});