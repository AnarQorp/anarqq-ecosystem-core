/**
 * MCP Tool Discovery Service Tests
 * 
 * Comprehensive test suite for MCP tool discovery, capability negotiation,
 * compatibility checking, and deprecation management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPToolDiscoveryService } from '../services/MCPToolDiscoveryService.mjs';

describe('MCPToolDiscoveryService', () => {
  let service;
  let mockRegistration;

  beforeEach(() => {
    service = new MCPToolDiscoveryService();
    
    mockRegistration = {
      moduleId: 'test-module',
      moduleName: 'Test Module',
      version: '1.0.0',
      tools: [
        {
          name: 'test.tool1',
          description: 'Test tool 1',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            }
          },
          returns: { type: 'string' },
          examples: ['test.tool1({ input: "hello" })']
        },
        {
          name: 'test.tool2',
          description: 'Test tool 2',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'object' }
            }
          }
        }
      ],
      capabilities: {
        'test-capability': {
          supported: true,
          version: '1.0.0',
          features: ['feature1', 'feature2']
        },
        'identity-verification': {
          supported: true,
          version: '1.0.0',
          features: ['basic-auth']
        }
      },
      compatibility: {
        minVersion: '1.0.0',
        maxVersion: '2.0.0',
        supportedVersions: ['1.0.0', '1.1.0'],
        breakingChanges: [],
        deprecatedFeatures: []
      }
    };
  });

  afterEach(() => {
    // Clean up
    service.toolRegistry.clear();
    service.capabilityMatrix.clear();
    service.versionCompatibility.clear();
    service.deprecationSchedule.clear();
    service.toolUsageStats.clear();
  });

  describe('Tool Registration', () => {
    it('should register tools successfully', async () => {
      const result = await service.registerTools(mockRegistration);

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(2);
      expect(result.capabilityCount).toBe(2);
      expect(result.registrationId).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidRegistration = { ...mockRegistration };
      delete invalidRegistration.moduleId;

      const result = await service.registerTools(invalidRegistration);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('moduleId is required');
    });

    it('should validate tool definitions', async () => {
      const invalidRegistration = {
        ...mockRegistration,
        tools: [
          {
            description: 'Missing name',
            parameters: {}
          }
        ]
      };

      const result = await service.registerTools(invalidRegistration);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('tool[0].name is required'))).toBe(true);
    });

    it('should update capability matrix on registration', async () => {
      await service.registerTools(mockRegistration);

      expect(service.capabilityMatrix.has('test-capability')).toBe(true);
      expect(service.capabilityMatrix.has('identity-verification')).toBe(true);

      const testCapability = service.capabilityMatrix.get('test-capability');
      expect(testCapability.providers).toHaveLength(1);
      expect(testCapability.providers[0].moduleId).toBe('test-module');
    });

    it('should initialize usage statistics', async () => {
      await service.registerTools(mockRegistration);

      expect(service.toolUsageStats.has('test-module')).toBe(true);
      const stats = service.toolUsageStats.get('test-module');
      expect(stats.tools['test.tool1']).toBeDefined();
      expect(stats.tools['test.tool2']).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    beforeEach(async () => {
      await service.registerTools(mockRegistration);
      
      // Register another module for testing
      await service.registerTools({
        ...mockRegistration,
        moduleId: 'test-module-2',
        moduleName: 'Test Module 2',
        version: '2.0.0',
        tools: [
          {
            name: 'test.auth',
            description: 'Authentication tool',
            parameters: {
              type: 'object',
              properties: {
                credentials: { type: 'object' }
              }
            }
          },
          {
            name: 'test.payment',
            description: 'Payment tool',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number' }
              }
            }
          }
        ],
        capabilities: {
          'identity-verification': {
            supported: true,
            version: '2.0.0',
            features: ['advanced-auth', 'mfa']
          },
          'payment-processing': {
            supported: true,
            version: '1.0.0',
            features: ['crypto-payments']
          }
        }
      });
    });

    it('should discover all tools without filters', async () => {
      const result = await service.discoverTools();

      expect(result.tools).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by module ID', async () => {
      const result = await service.discoverTools({
        moduleId: 'test-module'
      });

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].moduleId).toBe('test-module');
    });

    it('should filter by tool name', async () => {
      const result = await service.discoverTools({
        toolName: 'tool1'
      });

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].tools.some(tool => tool.name.includes('tool1'))).toBe(true);
    });

    it('should filter by capabilities', async () => {
      const result = await service.discoverTools({
        capabilities: ['identity-verification']
      });

      expect(result.tools).toHaveLength(2);
      result.tools.forEach(tool => {
        expect(tool.capabilities['identity-verification']).toBeDefined();
        expect(tool.capabilities['identity-verification'].supported).toBe(true);
      });
    });

    it('should filter by version compatibility', async () => {
      const result = await service.discoverTools({
        version: '1.0.0'
      });

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].version).toBe('1.0.0');
    });

    it('should support pagination', async () => {
      const result = await service.discoverTools({
        limit: 1,
        offset: 0
      });

      expect(result.tools).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(1);
    });

    it('should include usage statistics when requested', async () => {
      const result = await service.discoverTools({
        includeUsageStats: true
      });

      expect(result.tools[0].usageStats).toBeDefined();
      expect(result.tools[0].usageStats.totalUsage).toBeDefined();
    });

    it('should include alternatives when requested', async () => {
      const result = await service.discoverTools({
        includeAlternatives: true
      });

      expect(result.tools[0].alternatives).toBeDefined();
      expect(Array.isArray(result.tools[0].alternatives)).toBe(true);
    });
  });

  describe('Capability Negotiation', () => {
    beforeEach(async () => {
      await service.registerTools(mockRegistration);
      await service.registerTools({
        ...mockRegistration,
        moduleId: 'test-module-2',
        moduleName: 'Test Module 2',
        capabilities: {
          'identity-verification': {
            supported: true,
            version: '2.0.0',
            features: ['advanced-auth']
          },
          'payment-processing': {
            supported: true,
            version: '1.0.0'
          }
        }
      });
    });

    it('should negotiate capabilities successfully', async () => {
      const negotiation = {
        clientCapabilities: ['identity-verification', 'test-capability'],
        requiredCapabilities: ['identity-verification'],
        preferredCapabilities: ['test-capability'],
        clientVersion: '1.0.0'
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.compatible).toBe(true);
      expect(result.recommendedTools).toHaveLength(2);
      expect(result.capabilityMatrix).toBeDefined();
      expect(result.negotiationId).toBeDefined();
    });

    it('should handle partial capability matches', async () => {
      const negotiation = {
        requiredCapabilities: ['identity-verification', 'non-existent-capability'],
        clientVersion: '1.0.0'
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.compatible).toBe(true); // Should find partial matches
      expect(result.recommendedTools.length).toBeGreaterThan(0);
    });

    it('should rank tools by compatibility score', async () => {
      const negotiation = {
        requiredCapabilities: ['identity-verification'],
        preferredCapabilities: ['test-capability'],
        clientVersion: '1.0.0'
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.recommendedTools).toHaveLength(2);
      // First tool should have higher score due to preferred capability
      expect(result.recommendedTools[0].finalScore).toBeGreaterThanOrEqual(
        result.recommendedTools[1].finalScore
      );
    });

    it('should provide alternative capabilities', async () => {
      const negotiation = {
        requiredCapabilities: ['identity-verification', 'payment-processing']
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives['identity-verification']).toBeDefined();
      expect(result.alternatives['payment-processing']).toBeDefined();
    });
  });

  describe('Compatibility Checking', () => {
    beforeEach(async () => {
      await service.registerTools({
        ...mockRegistration,
        compatibility: {
          ...mockRegistration.compatibility,
          breakingChanges: [
            {
              version: '2.0.0',
              description: 'Parameter format changed',
              affectedTools: ['test.tool1'],
              migrationAction: 'update_parameters'
            }
          ]
        }
      });
    });

    it('should check tool compatibility', async () => {
      const compatibilityCheck = {
        moduleId: 'test-module',
        toolName: 'test.tool1',
        clientVersion: '1.0.0',
        targetVersion: '1.1.0'
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.compatible).toBe(true);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.targetVersion).toBe('1.1.0');
    });

    it('should detect breaking changes', async () => {
      const compatibilityCheck = {
        moduleId: 'test-module',
        toolName: 'test.tool1',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0',
        includeBreakingChanges: true
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.breakingChanges).toHaveLength(1);
      expect(result.migrationRequired).toBe(true);
      expect(result.breakingChanges[0].description).toBe('Parameter format changed');
    });

    it('should generate migration path', async () => {
      const compatibilityCheck = {
        moduleId: 'test-module',
        toolName: 'test.tool1',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0',
        includeBreakingChanges: true,
        includeMigrationPath: true
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.migrationPath).toBeDefined();
      expect(result.migrationPath.steps).toHaveLength(1);
      expect(result.migrationPath.estimatedEffort).toBe('low');
    });

    it('should handle non-existent module', async () => {
      const compatibilityCheck = {
        moduleId: 'non-existent-module',
        toolName: 'test.tool1',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0'
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.compatible).toBe(false);
      expect(result.error).toBe('Module not found in registry');
    });

    it('should handle non-existent tool', async () => {
      const compatibilityCheck = {
        moduleId: 'test-module',
        toolName: 'non-existent-tool',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0'
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.compatible).toBe(false);
      expect(result.error).toBe('Tool not found in module');
    });
  });

  describe('Deprecation Management', () => {
    beforeEach(async () => {
      await service.registerTools(mockRegistration);
    });

    it('should schedule deprecation', async () => {
      const deprecation = {
        action: 'schedule',
        moduleId: 'test-module',
        toolName: 'test.tool1',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30',
        reason: 'Replaced by newer version',
        migrationGuide: 'Use test.tool2 instead',
        replacementTool: 'test.tool2'
      };

      const result = await service.manageDeprecation(deprecation);

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(service.deprecationSchedule.has('test-module')).toBe(true);
    });

    it('should update deprecation schedule', async () => {
      // First schedule deprecation
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'test-module',
        toolName: 'test.tool1',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30',
        reason: 'Initial reason'
      });

      // Then update it
      const result = await service.manageDeprecation({
        action: 'update',
        moduleId: 'test-module',
        reason: 'Updated reason',
        sunsetDate: '2025-12-31'
      });

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);

      const schedule = service.deprecationSchedule.get('test-module');
      expect(schedule.reason).toBe('Updated reason');
      expect(schedule.sunsetDate).toBe('2025-12-31');
    });

    it('should cancel deprecation', async () => {
      // First schedule deprecation
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'test-module',
        toolName: 'test.tool1',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30'
      });

      // Then cancel it
      const result = await service.manageDeprecation({
        action: 'cancel',
        moduleId: 'test-module',
        toolName: 'test.tool1'
      });

      expect(result.success).toBe(true);
      expect(result.cancelled).toBe(true);
      expect(service.deprecationSchedule.has('test-module')).toBe(false);
    });

    it('should execute deprecation', async () => {
      // First schedule deprecation
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'test-module',
        toolName: 'test.tool1',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30'
      });

      // Then execute it
      const result = await service.manageDeprecation({
        action: 'execute',
        moduleId: 'test-module',
        toolName: 'test.tool1'
      });

      expect(result.success).toBe(true);
      expect(result.executed).toBe(true);

      const schedule = service.deprecationSchedule.get('test-module');
      expect(schedule.status).toBe('executed');
      expect(schedule.executedAt).toBeDefined();
    });

    it('should handle unknown deprecation action', async () => {
      const deprecation = {
        action: 'unknown-action',
        moduleId: 'test-module'
      };

      await expect(service.manageDeprecation(deprecation))
        .rejects.toThrow('Unknown deprecation action: unknown-action');
    });
  });

  describe('Analytics and Optimization', () => {
    beforeEach(async () => {
      await service.registerTools(mockRegistration);
      
      // Add some usage statistics
      const stats = service.toolUsageStats.get('test-module');
      stats.totalUsage = 100;
      stats.tools['test.tool1'].usageCount = 60;
      stats.tools['test.tool2'].usageCount = 40;
    });

    it('should generate tool analytics', async () => {
      const result = await service.getToolAnalytics({
        period: '30d',
        includeRecommendations: true,
        includeOptimizations: true,
        includeTrends: true
      });

      expect(result.period).toBe('30d');
      expect(result.usageStats).toBeDefined();
      expect(result.popularTools).toBeDefined();
      expect(result.capabilityUsage).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it('should identify popular tools', async () => {
      const popularTools = service.getPopularTools('30d');

      expect(popularTools).toHaveLength(1);
      expect(popularTools[0].moduleId).toBe('test-module');
      expect(popularTools[0].totalUsage).toBe(100);
    });

    it('should analyze capability usage', async () => {
      const capabilityUsage = service.getCapabilityUsage('30d');

      expect(capabilityUsage['test-capability']).toBeDefined();
      expect(capabilityUsage['identity-verification']).toBeDefined();
      expect(capabilityUsage['test-capability'].totalProviders).toBe(1);
      expect(capabilityUsage['test-capability'].activeProviders).toBe(1);
    });

    it('should generate optimization recommendations', async () => {
      const analytics = {
        popularTools: [
          { moduleId: 'test-module', totalUsage: 5 } // Low usage
        ],
        capabilityUsage: {
          'test-capability': { activeProviders: 1 } // Low coverage
        }
      };

      const recommendations = await service.generateOptimizationRecommendations(analytics);

      expect(recommendations).toHaveLength(2);
      expect(recommendations.some(r => r.type === 'underutilization')).toBe(true);
      expect(recommendations.some(r => r.type === 'capability_gap')).toBe(true);
    });
  });

  describe('Version Compatibility', () => {
    it('should check semantic version compatibility', () => {
      expect(service.isVersionCompatible('1.0.0', '1.1.0')).toBe(true);
      expect(service.isVersionCompatible('1.0.0', '2.0.0')).toBe(false);
      expect(service.isVersionCompatible('2.1.0', '2.0.0')).toBe(true);
    });

    it('should compare versions correctly', () => {
      expect(service.compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
      expect(service.compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(service.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should check if version is between two versions', () => {
      expect(service.isVersionBetween('1.1.0', '1.0.0', '1.2.0')).toBe(true);
      expect(service.isVersionBetween('1.3.0', '1.0.0', '1.2.0')).toBe(false);
      expect(service.isVersionBetween('0.9.0', '1.0.0', '1.2.0')).toBe(false);
    });
  });

  describe('Event Publishing', () => {
    it('should publish registry update events', async () => {
      // Mock the event bus publish method
      let publishedEvent = null;
      service.eventBus.publish = async (event) => {
        publishedEvent = event;
        return { success: true };
      };

      await service.registerTools(mockRegistration);

      expect(publishedEvent).toBeDefined();
      expect(publishedEvent.topic).toBe('q.tools.registry.updated.v1');
      expect(publishedEvent.payload.action).toBe('TOOLS_REGISTERED');
      expect(publishedEvent.payload.moduleId).toBe('test-module');
    });
  });
});