/**
 * Qonsent Validation Layer Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  QonsentValidationLayer, 
  qonsentValidationLayer,
  PermissionRequest,
  QonsentValidationResult
} from '../validation/QonsentValidationLayer.js';
import { ValidationContext } from '../validation/UniversalValidationPipeline.js';

describe('QonsentValidationLayer', () => {
  let qonsentLayer: QonsentValidationLayer;
  let mockContext: ValidationContext;

  beforeEach(() => {
    qonsentLayer = new QonsentValidationLayer();
    mockContext = {
      requestId: 'test-request-001',
      timestamp: new Date().toISOString(),
      source: 'test',
      metadata: {
        userId: 'default-user'
      }
    };
  });

  afterEach(() => {
    qonsentLayer.clearCache();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = qonsentLayer.getConfig();
      
      expect(config.endpoint).toBeDefined();
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
      expect(config.cachePermissions).toBe(true);
      expect(config.strictMode).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      const customLayer = new QonsentValidationLayer({
        timeout: 5000,
        retryAttempts: 5,
        cachePermissions: false,
        strictMode: false
      });

      const config = customLayer.getConfig();
      
      expect(config.timeout).toBe(5000);
      expect(config.retryAttempts).toBe(5);
      expect(config.cachePermissions).toBe(false);
      expect(config.strictMode).toBe(false);
    });

    it('should provide validation layer configuration', () => {
      const layerConfig = qonsentLayer.getValidationLayer();
      
      expect(layerConfig.layerId).toBe('qonsent-validation');
      expect(layerConfig.name).toBe('Qonsent Permission Validation');
      expect(layerConfig.required).toBe(true);
      expect(layerConfig.priority).toBe(2);
    });
  });

  describe('permission validation', () => {
    it('should pass validation for data without permission requirements', async () => {
      const plainData = { message: 'Hello, World!', value: 42 };
      
      const result = await qonsentLayer.validatePermissions(plainData, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.message).toContain('No permission requirements found');
      expect(result.details.permissionsChecked).toBe(0);
      expect(result.details.consentStatus).toBe('valid');
    });

    it('should validate explicit permission requirements', async () => {
      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' },
          { resource: 'data', action: 'read', scope: ['public'] }
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.permissionsChecked).toBe(2);
      expect(result.details.permissionsGranted).toBe(2);
      expect(result.details.permissionsDenied).toBe(0);
    });

    it('should infer permissions from data structure', async () => {
      const flowData = {
        flowDefinition: {
          name: 'Test Flow',
          steps: []
        }
      };
      
      const result = await qonsentLayer.validatePermissions(flowData, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.permissionsChecked).toBe(1);
      expect(result.details.permissionsGranted).toBe(1);
    });

    it('should handle execution permissions', async () => {
      const executionData = {
        executionId: 'exec-123'
      };
      
      const result = await qonsentLayer.validatePermissions(executionData, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.permissionsChecked).toBe(1);
      expect(result.details.permissionsGranted).toBe(1);
    });

    it('should handle data access permissions', async () => {
      const dataAccessRequest = {
        dataAccess: {
          scope: ['public']
        }
      };
      
      const result = await qonsentLayer.validatePermissions(dataAccessRequest, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.permissionsChecked).toBe(1);
      expect(result.details.permissionsGranted).toBe(1);
    });

    it('should deny permissions for unauthorized actions', async () => {
      const unauthorizedData = {
        permissions: [
          { resource: 'admin', action: 'delete' } // This permission doesn't exist for default user
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(unauthorizedData, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.permissionsChecked).toBe(1);
      expect(result.details.permissionsGranted).toBe(0);
      expect(result.details.permissionsDenied).toBe(1);
    });

    it('should handle missing user context', async () => {
      const contextWithoutUser = {
        ...mockContext,
        metadata: {}
      };

      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, contextWithoutUser) as QonsentValidationResult;
      
      // Falls back to default user, so permissions are checked
      expect(result.status).toBe('passed');
      expect(result.details.permissionsChecked).toBe(1);
    });

    it('should warn when permission renewal is needed', async () => {
      // Create a layer that will have expiring permissions
      const testLayer = new QonsentValidationLayer();
      
      // Mock the service to return a permission that needs renewal
      const originalCheckPermission = (testLayer as any).qonsentService.checkPermission;
      (testLayer as any).qonsentService.checkPermission = vi.fn().mockResolvedValue({
        granted: true,
        reason: 'Permission granted',
        requiresRenewal: true,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      });

      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };
      
      const result = await testLayer.validatePermissions(dataWithPermissions, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('renewal recommended');
      expect(result.details.renewalRequired).toBe(true);

      // Restore original method
      (testLayer as any).qonsentService.checkPermission = originalCheckPermission;
    });
  });

  describe('permission caching', () => {
    it('should cache permission results', async () => {
      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };

      // First call
      const result1 = await qonsentLayer.validatePermissions(dataWithPermissions, mockContext);
      expect(result1.status).toBe('passed');

      // Second call should use cache
      const result2 = await qonsentLayer.validatePermissions(dataWithPermissions, mockContext);
      expect(result2.status).toBe('passed');

      const cacheStats = qonsentLayer.getCacheStatistics();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };

      await qonsentLayer.validatePermissions(dataWithPermissions, mockContext);
      
      let cacheStats = qonsentLayer.getCacheStatistics();
      expect(cacheStats.size).toBeGreaterThan(0);

      qonsentLayer.clearCache();
      
      cacheStats = qonsentLayer.getCacheStatistics();
      expect(cacheStats.size).toBe(0);
    });

    it('should work with caching disabled', async () => {
      const noCacheLayer = new QonsentValidationLayer({
        cachePermissions: false
      });

      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };

      const result = await noCacheLayer.validatePermissions(dataWithPermissions, mockContext);
      expect(result.status).toBe('passed');

      const cacheStats = noCacheLayer.getCacheStatistics();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('permission management', () => {
    it('should renew permissions successfully', async () => {
      const permissionId = 'perm-001';
      const userId = 'default-user';
      
      const renewedPermission = await qonsentLayer.renewPermission(permissionId, userId);
      
      expect(renewedPermission).toBeDefined();
      expect(renewedPermission.id).toBe(permissionId);
      expect(renewedPermission.expiresAt).toBeDefined();
    });

    it('should handle permission renewal errors', async () => {
      const nonExistentPermissionId = 'non-existent-permission';
      const userId = 'default-user';
      
      await expect(qonsentLayer.renewPermission(nonExistentPermissionId, userId))
        .rejects.toThrow('Permission not found');
    });

    it('should revoke permissions successfully', async () => {
      const permissionId = 'perm-002';
      const userId = 'default-user';
      
      await expect(qonsentLayer.revokePermission(permissionId, userId))
        .resolves.not.toThrow();
    });

    it('should get consent records', async () => {
      const userId = 'default-user';
      
      const consentRecord = await qonsentLayer.getConsentRecord(userId);
      
      expect(consentRecord).toBeDefined();
      expect(consentRecord?.userId).toBe(userId);
      expect(consentRecord?.status).toBe('active');
    });

    it('should handle missing consent records', async () => {
      const nonExistentUserId = 'non-existent-user';
      
      const consentRecord = await qonsentLayer.getConsentRecord(nonExistentUserId);
      
      expect(consentRecord).toBeNull();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const originalConfig = qonsentLayer.getConfig();
      
      qonsentLayer.updateConfig({
        timeout: 15000,
        retryAttempts: 5,
        strictMode: false
      });
      
      const updatedConfig = qonsentLayer.getConfig();
      
      expect(updatedConfig.timeout).toBe(15000);
      expect(updatedConfig.retryAttempts).toBe(5);
      expect(updatedConfig.strictMode).toBe(false);
      expect(updatedConfig.endpoint).toBe(originalConfig.endpoint); // Should remain unchanged
    });
  });

  describe('validator function', () => {
    it('should provide validator function for pipeline integration', async () => {
      const validator = qonsentLayer.getValidator();
      
      expect(typeof validator).toBe('function');
      
      const testData = { message: 'test' };
      const result = await validator(testData, mockContext);
      
      expect(result).toBeDefined();
      expect(result.layerId).toBe('qonsent-validation');
      expect(result.status).toBe('passed');
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock the internal service to throw an error
      const originalCheckPermission = (qonsentLayer as any).qonsentService.checkPermission;
      (qonsentLayer as any).qonsentService.checkPermission = vi.fn().mockRejectedValue(new Error('Service error'));
      
      const dataWithPermissions = {
        permissions: [
          { resource: 'flow', action: 'create' }
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Qonsent validation error');
      expect(result.details.error).toContain('Service error');
      
      // Restore original method
      (qonsentLayer as any).qonsentService.checkPermission = originalCheckPermission;
    });
  });

  describe('scope and condition validation', () => {
    it('should validate scope requirements', async () => {
      const dataWithScopedPermissions = {
        permissions: [
          { resource: 'data', action: 'read', scope: ['public'] }
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithScopedPermissions, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.permissionsGranted).toBe(1);
    });

    it('should deny permissions with invalid scope', async () => {
      const dataWithInvalidScope = {
        permissions: [
          { resource: 'data', action: 'read', scope: ['private'] } // User only has 'public' scope
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithInvalidScope, mockContext) as QonsentValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.permissionsDenied).toBe(1);
    });

    it('should validate conditional permissions', async () => {
      const dataWithConditions = {
        permissions: [
          { 
            resource: 'flow', 
            action: 'create',
            conditions: { environment: 'test' }
          }
        ]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithConditions, mockContext) as QonsentValidationResult;
      
      // The default permission doesn't have conditions, so it matches (conditions are optional)
      expect(result.status).toBe('passed');
    });
  });

  describe('user context extraction', () => {
    it('should extract user ID from metadata.userId', async () => {
      const contextWithUserId = {
        ...mockContext,
        metadata: { userId: 'test-user-123' }
      };

      const dataWithPermissions = {
        permissions: [{ resource: 'flow', action: 'create' }]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, contextWithUserId);
      
      // Should attempt to check permissions even though user doesn't exist in mock data
      expect(result.status).toBe('failed'); // Will fail because test-user-123 has no permissions
    });

    it('should extract user ID from metadata.actor', async () => {
      const contextWithActor = {
        ...mockContext,
        metadata: { actor: 'actor-user-456' }
      };

      const dataWithPermissions = {
        permissions: [{ resource: 'flow', action: 'create' }]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, contextWithActor);
      
      // Should attempt to check permissions
      expect(result.status).toBe('failed'); // Will fail because actor-user-456 has no permissions
    });

    it('should fall back to default user when no user context', async () => {
      const contextWithoutUser = {
        ...mockContext,
        metadata: {}
      };

      const dataWithPermissions = {
        permissions: [{ resource: 'flow', action: 'create' }]
      };
      
      const result = await qonsentLayer.validatePermissions(dataWithPermissions, contextWithoutUser);
      
      // Should use default user and pass
      expect(result.status).toBe('passed');
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton instance', () => {
      expect(qonsentValidationLayer).toBeInstanceOf(QonsentValidationLayer);
    });
  });
});