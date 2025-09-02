/**
 * Tests for QindexCore
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QindexCore } from '../src/core/QindexCore.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('QindexCore', () => {
  let qindexCore;
  let testConfig;
  let testDataPath;

  beforeEach(async () => {
    // Create temporary test directory
    testDataPath = join(process.cwd(), 'test-data', `qindex-test-${Date.now()}`);
    await fs.mkdir(testDataPath, { recursive: true });

    testConfig = {
      version: '1.0.0',
      mode: 'standalone',
      storagePath: testDataPath,
      maxRecordSize: 1024 * 1024, // 1MB
      maxHistoryEntries: 100,
      ipfs: {
        endpoint: 'disabled',
        timeout: 5000,
        pinByDefault: false
      },
      retention: {
        defaultTtl: 3600,
        maxTtl: 86400,
        cleanupInterval: 60000
      },
      performance: {
        maxConcurrentOperations: 10,
        queryTimeout: 5000,
        batchSize: 50
      },
      development: {
        enableMocks: true,
        mockDelay: 0
      }
    };

    qindexCore = new QindexCore(testConfig);
    await qindexCore.initialize();
  });

  afterEach(async () => {
    if (qindexCore) {
      await qindexCore.shutdown();
    }

    // Clean up test directory
    try {
      await fs.rm(testDataPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(qindexCore.initialized).toBe(true);
      expect(qindexCore.storage).toBeDefined();
      expect(qindexCore.pointers).toBeDefined();
      expect(qindexCore.history).toBeDefined();
      expect(qindexCore.query).toBeDefined();
    });

    it('should have correct configuration', () => {
      expect(qindexCore.config.mode).toBe('standalone');
      expect(qindexCore.config.storagePath).toBe(testDataPath);
    });
  });

  describe('put operations', () => {
    it('should store a simple record', async () => {
      const key = 'test/simple-record';
      const value = { message: 'Hello, World!' };
      const metadata = { contentType: 'application/json' };

      const result = await qindexCore.put(key, value, metadata);

      expect(result.success).toBe(true);
      expect(result.key).toBe(key);
      expect(result.cid).toBeDefined();
      expect(result.version).toBe('1');
    });

    it('should update an existing record', async () => {
      const key = 'test/update-record';
      const value1 = { version: 1 };
      const value2 = { version: 2 };

      // First put
      const result1 = await qindexCore.put(key, value1);
      expect(result1.version).toBe('1');

      // Second put (update)
      const result2 = await qindexCore.put(key, value2);
      expect(result2.version).toBe('2');
      expect(result2.cid).not.toBe(result1.cid);
    });

    it('should validate key format', async () => {
      const invalidKeys = ['', 'key with spaces', 'key@invalid', 'a'.repeat(256)];

      for (const key of invalidKeys) {
        await expect(qindexCore.put(key, { test: true })).rejects.toThrow();
      }
    });

    it('should validate value size', async () => {
      const largeValue = { data: 'x'.repeat(testConfig.maxRecordSize + 1) };

      await expect(qindexCore.put('test/large', largeValue)).rejects.toThrow('exceeds maximum size');
    });
  });

  describe('get operations', () => {
    it('should retrieve a stored record', async () => {
      const key = 'test/retrieve-record';
      const value = { message: 'Test retrieval' };
      const metadata = { contentType: 'application/json' };

      await qindexCore.put(key, value, metadata);
      const result = await qindexCore.get(key);

      expect(result).toBeDefined();
      expect(result.key).toBe(key);
      expect(result.value).toEqual(value);
      expect(result.metadata.contentType).toBe('application/json');
      expect(result.version).toBe('1');
    });

    it('should return null for non-existent record', async () => {
      const result = await qindexCore.get('test/non-existent');
      expect(result).toBeNull();
    });

    it('should retrieve specific version', async () => {
      const key = 'test/versioned-record';
      const value1 = { version: 1 };
      const value2 = { version: 2 };

      await qindexCore.put(key, value1);
      await qindexCore.put(key, value2);

      const result = await qindexCore.get(key, { version: '1' });
      expect(result.value).toEqual(value1);
    });
  });

  describe('list operations', () => {
    beforeEach(async () => {
      // Set up test data
      await qindexCore.put('test/doc1', { type: 'document' }, { contentType: 'text/plain', tags: ['doc', 'test'] });
      await qindexCore.put('test/doc2', { type: 'document' }, { contentType: 'text/plain', tags: ['doc'] });
      await qindexCore.put('test/image1', { type: 'image' }, { contentType: 'image/jpeg', tags: ['image', 'test'] });
      await qindexCore.put('other/file1', { type: 'other' }, { contentType: 'application/json' });
    });

    it('should list all records', async () => {
      const result = await qindexCore.list();

      expect(result.records).toBeDefined();
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter by prefix', async () => {
      const result = await qindexCore.list({ prefix: 'test/' });

      expect(result.records.length).toBe(3);
      result.records.forEach(record => {
        expect(record.key).toMatch(/^test\//);
      });
    });

    it('should filter by content type', async () => {
      const result = await qindexCore.list({ contentType: 'text/plain' });

      expect(result.records.length).toBe(2);
      result.records.forEach(record => {
        expect(record.metadata.contentType).toBe('text/plain');
      });
    });

    it('should apply pagination', async () => {
      const result = await qindexCore.list({ limit: 2, offset: 0 });

      expect(result.records.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('history operations', () => {
    it('should track record history', async () => {
      const key = 'test/history-record';
      const value1 = { version: 1 };
      const value2 = { version: 2 };

      await qindexCore.put(key, value1);
      await qindexCore.put(key, value2);

      const history = await qindexCore.getHistory(key);

      expect(history.key).toBe(key);
      expect(history.history.length).toBe(2);
      expect(history.history[0].operation).toBe('put');
      expect(history.history[1].operation).toBe('put');
    });

    it('should return empty history for non-existent record', async () => {
      const history = await qindexCore.getHistory('test/non-existent');

      expect(history.key).toBe('test/non-existent');
      expect(history.history.length).toBe(0);
    });
  });

  describe('delete operations', () => {
    it('should delete an existing record', async () => {
      const key = 'test/delete-record';
      const value = { message: 'To be deleted' };

      await qindexCore.put(key, value);
      const deleteResult = await qindexCore.delete(key);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.key).toBe(key);

      const getResult = await qindexCore.get(key);
      expect(getResult).toBeNull();
    });

    it('should return false for non-existent record', async () => {
      const result = await qindexCore.delete('test/non-existent');
      expect(result).toBe(false);
    });

    it('should record deletion in history', async () => {
      const key = 'test/delete-history';
      const value = { message: 'To be deleted' };

      await qindexCore.put(key, value);
      await qindexCore.delete(key);

      const history = await qindexCore.getHistory(key);
      expect(history.history.length).toBe(2);
      expect(history.history[0].operation).toBe('delete');
      expect(history.history[1].operation).toBe('put');
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const health = await qindexCore.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.initialized).toBe(true);
      expect(health.components).toBeDefined();
      expect(health.components.storage).toBeDefined();
      expect(health.components.pointers).toBeDefined();
    });
  });
});