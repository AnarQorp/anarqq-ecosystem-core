/**
 * sQuid Identity Service Tests
 * 
 * Unit tests for sQuid identity authentication and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SquidIdentityService, SquidIdentity, IdentityToken } from '../auth/SquidIdentityService.js';

describe('SquidIdentityService', () => {
  let service: SquidIdentityService;

  beforeEach(() => {
    service = new SquidIdentityService();
    service.clearCaches();
  });

  describe('Identity Management', () => {
    it('should get identity by ID', async () => {
      const identity = await service.getIdentity('squid:user:test');
      
      expect(identity).toBeDefined();
      expect(identity?.id).toBe('squid:user:test');
      expect(identity?.type).toBe('user');
      expect(identity?.permissions).toContain('flow:create');
    });

    it('should cache identity lookups', async () => {
      const identity1 = await service.getIdentity('squid:user:test');
      const identity2 = await service.getIdentity('squid:user:test');
      
      expect(identity1).toEqual(identity2);
    });

    it('should handle DAO identities', async () => {
      const identity = await service.getIdentity('squid:dao:test');
      
      expect(identity).toBeDefined();
      expect(identity?.type).toBe('dao');
    });
  });

  describe('Token Validation', () => {
    it('should create and validate identity tokens', async () => {
      const token = await service.createIdentityToken('squid:user:test', ['flow:create'], 60);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      if (token) {
        const validation = await service.validateIdentityToken(token);
        
        expect(validation.valid).toBe(true);
        expect(validation.identity?.id).toBe('squid:user:test');
        expect(validation.permissions).toContain('flow:create');
      }
    });

    it('should reject expired tokens', async () => {
      const token = await service.createIdentityToken('squid:user:test', ['flow:create'], -1); // Expired
      
      if (token) {
        const validation = await service.validateIdentityToken(token);
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Token expired');
      }
    });

    it('should reject invalid token format', async () => {
      const validation = await service.validateIdentityToken('invalid-token');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid token format');
    });

    it('should cache validated tokens', async () => {
      const token = await service.createIdentityToken('squid:user:test', ['flow:create'], 60);
      
      if (token) {
        const validation1 = await service.validateIdentityToken(token);
        const validation2 = await service.validateIdentityToken(token);
        
        expect(validation1.valid).toBe(true);
        expect(validation2.valid).toBe(true);
        expect(validation2.metadata.cached).toBe(true);
      }
    });
  });

  describe('Permission Management', () => {
    it('should check permissions correctly', async () => {
      const hasPermissions = await service.hasPermissions('squid:user:test', ['flow:create']);
      
      expect(hasPermissions).toBe(true);
    });

    it('should handle wildcard permissions', async () => {
      // Mock identity with wildcard permission
      const mockIdentity: SquidIdentity = {
        id: 'squid:admin:test',
        type: 'user',
        publicKey: 'mock-key',
        permissions: ['*'],
        metadata: {
          name: 'Admin User',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity').mockResolvedValue(mockIdentity);

      const hasPermissions = await service.hasPermissions('squid:admin:test', ['flow:admin', 'system:admin']);
      
      expect(hasPermissions).toBe(true);
    });

    it('should handle namespace wildcards', async () => {
      const mockIdentity: SquidIdentity = {
        id: 'squid:flow-admin:test',
        type: 'user',
        publicKey: 'mock-key',
        permissions: ['flow:*'],
        metadata: {
          name: 'Flow Admin',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity').mockResolvedValue(mockIdentity);

      const hasPermissions = await service.hasPermissions('squid:flow-admin:test', ['flow:create', 'flow:execute']);
      
      expect(hasPermissions).toBe(true);
    });

    it('should reject insufficient permissions', async () => {
      const hasPermissions = await service.hasPermissions('squid:user:test', ['admin:system']);
      
      expect(hasPermissions).toBe(false);
    });
  });

  describe('Flow Ownership', () => {
    it('should validate flow ownership for owner', async () => {
      const isOwner = await service.validateFlowOwnership('squid:user:owner', 'squid:user:owner');
      
      expect(isOwner).toBe(true);
    });

    it('should validate flow ownership for sub-identity', async () => {
      const mockSubIdentity: SquidIdentity = {
        id: 'squid:sub:test',
        type: 'sub-identity',
        parentId: 'squid:user:owner',
        publicKey: 'mock-key',
        permissions: ['flow:create'],
        metadata: {
          name: 'Sub Identity',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity').mockResolvedValue(mockSubIdentity);

      const isOwner = await service.validateFlowOwnership('squid:user:owner', 'squid:sub:test');
      
      expect(isOwner).toBe(true);
    });

    it('should validate flow ownership for admin', async () => {
      const mockAdminIdentity: SquidIdentity = {
        id: 'squid:admin:test',
        type: 'user',
        publicKey: 'mock-key',
        permissions: ['flow:admin'],
        metadata: {
          name: 'Admin User',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity').mockResolvedValue(mockAdminIdentity);
      vi.spyOn(service, 'hasPermissions').mockResolvedValue(true);

      const isOwner = await service.validateFlowOwnership('squid:user:owner', 'squid:admin:test');
      
      expect(isOwner).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const isOwner = await service.validateFlowOwnership('squid:user:owner', 'squid:user:other');
      
      expect(isOwner).toBe(false);
    });
  });

  describe('Sub-Identity Signatures', () => {
    it('should validate sub-identity signatures', async () => {
      const signature = {
        parentIdentity: 'squid:user:parent',
        subIdentity: 'squid:sub:child',
        operation: 'flow:execute',
        payload: { flowId: 'test-flow' },
        signature: 'mock-signature-data',
        timestamp: new Date().toISOString()
      };

      const mockParentIdentity: SquidIdentity = {
        id: 'squid:user:parent',
        type: 'user',
        publicKey: 'parent-key',
        permissions: ['flow:create'],
        metadata: {
          name: 'Parent Identity',
          createdAt: new Date().toISOString()
        }
      };

      const mockSubIdentity: SquidIdentity = {
        id: 'squid:sub:child',
        type: 'sub-identity',
        parentId: 'squid:user:parent',
        publicKey: 'sub-key',
        permissions: ['flow:execute'],
        metadata: {
          name: 'Sub Identity',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity')
        .mockResolvedValueOnce(mockParentIdentity)
        .mockResolvedValueOnce(mockSubIdentity);

      const isValid = await service.validateSubIdentitySignature(signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid sub-identity relationships', async () => {
      const signature = {
        parentIdentity: 'squid:user:parent',
        subIdentity: 'squid:sub:unrelated',
        operation: 'flow:execute',
        payload: { flowId: 'test-flow' },
        signature: 'mock-signature-data',
        timestamp: new Date().toISOString()
      };

      const mockParentIdentity: SquidIdentity = {
        id: 'squid:user:parent',
        type: 'user',
        publicKey: 'parent-key',
        permissions: ['flow:create'],
        metadata: {
          name: 'Parent Identity',
          createdAt: new Date().toISOString()
        }
      };

      const mockSubIdentity: SquidIdentity = {
        id: 'squid:sub:unrelated',
        type: 'sub-identity',
        parentId: 'squid:user:different', // Different parent
        publicKey: 'sub-key',
        permissions: ['flow:execute'],
        metadata: {
          name: 'Unrelated Sub Identity',
          createdAt: new Date().toISOString()
        }
      };

      vi.spyOn(service, 'getIdentity')
        .mockResolvedValueOnce(mockParentIdentity)
        .mockResolvedValueOnce(mockSubIdentity);

      const isValid = await service.validateSubIdentitySignature(signature);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should refresh identity cache', async () => {
      const identity1 = await service.getIdentity('squid:user:test');
      await service.refreshIdentityCache('squid:user:test');
      const identity2 = await service.getIdentity('squid:user:test');
      
      expect(identity1).toBeDefined();
      expect(identity2).toBeDefined();
    });

    it('should clear all caches', async () => {
      await service.getIdentity('squid:user:test');
      const token = await service.createIdentityToken('squid:user:test', ['flow:create'], 60);
      
      service.clearCaches();
      
      // Should work but not be cached
      const identity = await service.getIdentity('squid:user:test');
      expect(identity).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle identity not found', async () => {
      vi.spyOn(service, 'getIdentity').mockResolvedValue(null);

      const validation = await service.validateIdentityToken('some-token');
      
      expect(validation.valid).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      vi.spyOn(service, 'getIdentity').mockRejectedValue(new Error('Service error'));

      const hasPermissions = await service.hasPermissions('squid:user:test', ['flow:create']);
      
      expect(hasPermissions).toBe(false);
    });
  });
});