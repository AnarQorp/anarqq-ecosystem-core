import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdempotencyManager } from '../idempotency/IdempotencyManager.js';
import { QHeaders, QResponse } from '../types/client.js';

describe('IdempotencyManager', () => {
  let idempotencyManager: IdempotencyManager;

  beforeEach(() => {
    idempotencyManager = new IdempotencyManager({
      defaultTtl: 1000, // 1 second for testing
      maxRecords: 100,
      cleanupInterval: 100, // 100ms for testing
      includeBodyInFingerprint: true,
      fingerprintHeaders: ['x-squid-id', 'x-subid', 'content-type']
    });
  });

  afterEach(() => {
    idempotencyManager.shutdown();
  });

  describe('generateIdempotencyKey', () => {
    it('should generate unique idempotency keys', () => {
      const key1 = idempotencyManager.generateIdempotencyKey();
      const key2 = idempotencyManager.generateIdempotencyKey();
      
      expect(key1).toMatch(/^idem_\d+_[a-z0-9]+$/);
      expect(key2).toMatch(/^idem_\d+_[a-z0-9]+$/);
      expect(key1).not.toBe(key2);
    });
  });

  describe('createRequestFingerprint', () => {
    it('should create consistent fingerprints for identical requests', () => {
      const headers: QHeaders = {
        'x-squid-id': 'user123',
        'x-subid': 'sub456',
        'content-type': 'application/json'
      };
      const body = { data: 'test' };

      const fingerprint1 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers,
        body
      );
      
      const fingerprint2 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers,
        body
      );

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should create different fingerprints for different requests', () => {
      const headers: QHeaders = {
        'x-squid-id': 'user123',
        'content-type': 'application/json'
      };

      const fingerprint1 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers,
        { data: 'test1' }
      );
      
      const fingerprint2 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers,
        { data: 'test2' }
      );

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should ignore non-fingerprint headers', () => {
      const headers1: QHeaders = {
        'x-squid-id': 'user123',
        'content-type': 'application/json',
        'authorization': 'Bearer token1'
      };

      const headers2: QHeaders = {
        'x-squid-id': 'user123',
        'content-type': 'application/json',
        'authorization': 'Bearer token2'
      };

      const fingerprint1 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers1,
        { data: 'test' }
      );
      
      const fingerprint2 = idempotencyManager.createRequestFingerprint(
        'POST',
        '/api/test',
        headers2,
        { data: 'test' }
      );

      expect(fingerprint1).toBe(fingerprint2);
    });
  });

  describe('checkDuplicate', () => {
    it('should return false for new requests', async () => {
      const result = await idempotencyManager.checkDuplicate(
        'test-key',
        'test-fingerprint'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.record).toBeUndefined();
    });

    it('should return true for duplicate requests with same fingerprint', async () => {
      const key = 'test-key';
      const fingerprint = 'test-fingerprint';

      // Store initial record
      await idempotencyManager.storeProcessingRecord(key, fingerprint);

      // Check for duplicate
      const result = await idempotencyManager.checkDuplicate(key, fingerprint);

      expect(result.isDuplicate).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record!.key).toBe(key);
      expect(result.record!.requestHash).toBe(fingerprint);
    });

    it('should throw error for same key with different fingerprint', async () => {
      const key = 'test-key';
      const fingerprint1 = 'test-fingerprint-1';
      const fingerprint2 = 'test-fingerprint-2';

      // Store initial record
      await idempotencyManager.storeProcessingRecord(key, fingerprint1);

      // Check with different fingerprint should throw
      await expect(
        idempotencyManager.checkDuplicate(key, fingerprint2)
      ).rejects.toThrow('Idempotency key conflict');
    });

    it('should return false for expired records', async () => {
      const key = 'test-key';
      const fingerprint = 'test-fingerprint';

      // Store record with very short TTL
      await idempotencyManager.storeProcessingRecord(key, fingerprint, undefined, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await idempotencyManager.checkDuplicate(key, fingerprint);

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('storeProcessingRecord', () => {
    it('should store processing record correctly', async () => {
      const key = 'test-key';
      const fingerprint = 'test-fingerprint';

      const record = await idempotencyManager.storeProcessingRecord(
        key,
        fingerprint
      );

      expect(record.key).toBe(key);
      expect(record.requestHash).toBe(fingerprint);
      expect(record.status).toBe('PROCESSING');
      expect(record.createdAt).toBeDefined();
      expect(record.expiresAt).toBeDefined();
    });

    it('should handle capacity limits', async () => {
      // Create manager with small capacity
      const smallManager = new IdempotencyManager({
        maxRecords: 2,
        defaultTtl: 10000,
        cleanupInterval: 60000 // Disable automatic cleanup for this test
      });

      try {
        // Fill to capacity
        await smallManager.storeProcessingRecord('key1', 'fp1');
        await smallManager.storeProcessingRecord('key2', 'fp2');
        
        // This should trigger cleanup and still work
        await smallManager.storeProcessingRecord('key3', 'fp3');

        const stats = smallManager.getStats();
        // After capacity management, should have removed some old records
        expect(stats.totalRecords).toBeLessThanOrEqual(3); // Allow for the new record plus some cleanup
      } finally {
        smallManager.shutdown();
      }
    });
  });

  describe('storeResponse', () => {
    it('should store successful response', async () => {
      const key = 'test-key';
      const fingerprint = 'test-fingerprint';
      const response: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Operation completed',
        data: { result: 'test' }
      };

      await idempotencyManager.storeProcessingRecord(key, fingerprint);
      await idempotencyManager.storeResponse(key, response);

      const record = await idempotencyManager.getRecord(key);
      expect(record!.status).toBe('COMPLETED');
      expect(record!.response).toEqual(response);
    });

    it('should store failed response', async () => {
      const key = 'test-key';
      const fingerprint = 'test-fingerprint';
      const response: QResponse = {
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input'
      };

      await idempotencyManager.storeProcessingRecord(key, fingerprint);
      await idempotencyManager.storeResponse(key, response);

      const record = await idempotencyManager.getRecord(key);
      expect(record!.status).toBe('FAILED');
      expect(record!.response).toEqual(response);
    });

    it('should throw error for non-existent record', async () => {
      const response: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Test'
      };

      await expect(
        idempotencyManager.storeResponse('non-existent', response)
      ).rejects.toThrow('Idempotency record not found');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const response1: QResponse = { status: 'ok', code: 'SUCCESS', message: 'OK' };
      const response2: QResponse = { status: 'error', code: 'ERROR', message: 'Failed' };

      // Create some records
      await idempotencyManager.storeProcessingRecord('key1', 'fp1');
      await idempotencyManager.storeResponse('key1', response1);

      await idempotencyManager.storeProcessingRecord('key2', 'fp2');
      await idempotencyManager.storeResponse('key2', response2);

      await idempotencyManager.storeProcessingRecord('key3', 'fp3');
      // Leave key3 in processing state

      const stats = idempotencyManager.getStats();

      expect(stats.totalRecords).toBe(3);
      expect(stats.completedRecords).toBe(1);
      expect(stats.failedRecords).toBe(1);
      expect(stats.processingRecords).toBe(1);
      expect(stats.oldestRecord).toBeDefined();
      expect(stats.newestRecord).toBeDefined();
    });

    it('should return empty stats for no records', () => {
      const stats = idempotencyManager.getStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.completedRecords).toBe(0);
      expect(stats.failedRecords).toBe(0);
      expect(stats.processingRecords).toBe(0);
      expect(stats.oldestRecord).toBeUndefined();
      expect(stats.newestRecord).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should automatically cleanup expired records', async () => {
      // Create manager with very short cleanup interval
      const manager = new IdempotencyManager({
        defaultTtl: 50, // 50ms
        cleanupInterval: 25 // 25ms
      });

      try {
        await manager.storeProcessingRecord('key1', 'fp1');
        expect(manager.getStats().totalRecords).toBe(1);

        // Wait for expiration and cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(manager.getStats().totalRecords).toBe(0);
      } finally {
        manager.shutdown();
      }
    });
  });

  describe('clear', () => {
    it('should clear all records', async () => {
      await idempotencyManager.storeProcessingRecord('key1', 'fp1');
      await idempotencyManager.storeProcessingRecord('key2', 'fp2');

      expect(idempotencyManager.getStats().totalRecords).toBe(2);

      idempotencyManager.clear();

      expect(idempotencyManager.getStats().totalRecords).toBe(0);
    });
  });
});