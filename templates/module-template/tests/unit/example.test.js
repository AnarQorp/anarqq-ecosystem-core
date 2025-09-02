/**
 * Unit Tests - Example Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExampleService } from '../../src/services/ExampleService.js';
import { MockSquidClient } from '../../src/mocks/MockSquidClient.js';
import { MockQlockClient } from '../../src/mocks/MockQlockClient.js';
import { MockQonsentClient } from '../../src/mocks/MockQonsentClient.js';
import { MockQindexClient } from '../../src/mocks/MockQindexClient.js';
import { MockQerberosClient } from '../../src/mocks/MockQerberosClient.js';

describe('ExampleService', () => {
  let exampleService;
  let mockServices;

  beforeEach(() => {
    mockServices = {
      squid: new MockSquidClient(),
      qlock: new MockQlockClient(),
      qonsent: new MockQonsentClient(),
      qindex: new MockQindexClient(),
      qerberos: new MockQerberosClient()
    };

    exampleService = new ExampleService(mockServices);
  });

  describe('listResources', () => {
    it('should return empty list for new user', async () => {
      const result = await exampleService.listResources({
        owner: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });

    it('should return paginated results', async () => {
      // Create test resources
      const testResource = await exampleService.createResource({
        name: 'Test Resource',
        description: 'A test resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      });

      const result = await exampleService.listResources({
        owner: '123e4567-e89b-12d3-a456-426614174000',
        page: 1,
        limit: 5
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe(testResource.id);
    });
  });

  describe('createResource', () => {
    it('should create resource successfully', async () => {
      const resourceData = {
        name: 'Test Resource',
        description: 'A test resource',
        tags: ['test', 'example'],
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const result = await exampleService.createResource(resourceData);

      expect(result).toMatchObject({
        name: 'Test Resource',
        description: 'A test resource',
        tags: ['test', 'example'],
        status: 'active'
      });
      expect(result.id).toBeDefined();
      expect(result.cid).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should generate unique IDs for multiple resources', async () => {
      const resourceData = {
        name: 'Test Resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const resource1 = await exampleService.createResource(resourceData);
      const resource2 = await exampleService.createResource(resourceData);

      expect(resource1.id).not.toBe(resource2.id);
      expect(resource1.cid).not.toBe(resource2.cid);
    });
  });

  describe('getResource', () => {
    it('should return null for non-existent resource', async () => {
      const result = await exampleService.getResource('non-existent-id', {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toBeNull();
    });

    it('should return resource for owner', async () => {
      const resourceData = {
        name: 'Test Resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);
      const result = await exampleService.getResource(created.id, {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toMatchObject({
        id: created.id,
        name: 'Test Resource'
      });
    });

    it('should throw error for unauthorized access', async () => {
      const resourceData = {
        name: 'Private Resource',
        visibility: 'private',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);

      await expect(
        exampleService.getResource(created.id, {
          requester: 'different-user-id'
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('updateResource', () => {
    it('should update resource successfully', async () => {
      const resourceData = {
        name: 'Original Name',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);
      const updateData = { name: 'Updated Name' };

      const result = await exampleService.updateResource(created.id, updateData, {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result.name).toBe('Updated Name');
      expect(result.updatedAt).not.toBe(created.updatedAt);
      expect(result.cid).not.toBe(created.cid);
      expect(result.prevCid).toBe(created.cid);
    });

    it('should return null for non-existent resource', async () => {
      const result = await exampleService.updateResource('non-existent-id', {
        name: 'Updated Name'
      }, {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toBeNull();
    });

    it('should throw error for unauthorized update', async () => {
      const resourceData = {
        name: 'Test Resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);

      await expect(
        exampleService.updateResource(created.id, { name: 'Hacked' }, {
          requester: 'different-user-id'
        })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('deleteResource', () => {
    it('should delete resource successfully', async () => {
      const resourceData = {
        name: 'Test Resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);
      const result = await exampleService.deleteResource(created.id, {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toEqual({
        success: true,
        deletedCid: created.cid
      });

      // Verify resource is deleted
      const getResult = await exampleService.getResource(created.id, {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });
      expect(getResult).toBeNull();
    });

    it('should return not found for non-existent resource', async () => {
      const result = await exampleService.deleteResource('non-existent-id', {
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result).toEqual({
        success: false,
        reason: 'not_found'
      });
    });

    it('should throw error for unauthorized deletion', async () => {
      const resourceData = {
        name: 'Test Resource',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      };

      const created = await exampleService.createResource(resourceData);

      await expect(
        exampleService.deleteResource(created.id, {
          requester: 'different-user-id'
        })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('searchResources', () => {
    beforeEach(async () => {
      // Create test resources
      await exampleService.createResource({
        name: 'JavaScript Tutorial',
        description: 'Learn JavaScript basics',
        tags: ['javascript', 'tutorial'],
        visibility: 'public',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      });

      await exampleService.createResource({
        name: 'Python Guide',
        description: 'Advanced Python programming',
        tags: ['python', 'advanced'],
        visibility: 'public',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174002' }
      });

      await exampleService.createResource({
        name: 'Private Notes',
        description: 'My personal notes',
        tags: ['notes'],
        visibility: 'private',
        owner: { squidId: '123e4567-e89b-12d3-a456-426614174000' }
      });
    });

    it('should search by query', async () => {
      const result = await exampleService.searchResources({
        query: 'javascript',
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('JavaScript Tutorial');
    });

    it('should search by tags', async () => {
      const result = await exampleService.searchResources({
        tags: ['tutorial'],
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('JavaScript Tutorial');
    });

    it('should only return accessible resources', async () => {
      const result = await exampleService.searchResources({
        query: 'notes',
        requester: 'different-user-id'
      });

      expect(result.items).toHaveLength(0);
    });

    it('should include owned private resources', async () => {
      const result = await exampleService.searchResources({
        query: 'notes',
        requester: '123e4567-e89b-12d3-a456-426614174000'
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Private Notes');
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await exampleService.health();

      expect(result).toMatchObject({
        status: 'healthy',
        resourceCount: 0
      });
      expect(result.timestamp).toBeDefined();
    });
  });
});