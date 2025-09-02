/**
 * MCP Tool Discovery Integration Tests
 * 
 * End-to-end integration tests demonstrating complete workflows
 * for MCP tool discovery, capability negotiation, and migration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPToolDiscoveryService } from '../services/MCPToolDiscoveryService.mjs';

describe('MCP Tool Discovery Integration', () => {
  let service;
  let squidModule, qwalletModule, qlockModule;

  beforeEach(() => {
    service = new MCPToolDiscoveryService();
    
    // Mock sQuid module registration
    squidModule = {
      moduleId: 'squid',
      moduleName: 'sQuid Identity Service',
      version: '1.0.0',
      tools: [
        {
          name: 'squid.verifyIdentity',
          description: 'Verify user identity',
          parameters: {
            type: 'object',
            properties: {
              identityId: { type: 'string' },
              signature: { type: 'string' }
            },
            required: ['identityId']
          },
          returns: {
            type: 'object',
            properties: {
              verified: { type: 'boolean' },
              identity: { type: 'object' }
            }
          }
        },
        {
          name: 'squid.activeContext',
          description: 'Get active identity context',
          parameters: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' }
            }
          }
        }
      ],
      capabilities: {
        'identity-verification': {
          supported: true,
          version: '1.0.0',
          features: ['basic-auth', 'signature-verification', 'context-management']
        }
      },
      compatibility: {
        minVersion: '1.0.0',
        maxVersion: '2.0.0',
        supportedVersions: ['1.0.0', '1.1.0']
      }
    };

    // Mock Qwallet module registration
    qwalletModule = {
      moduleId: 'qwallet',
      moduleName: 'Qwallet Payment Service',
      version: '1.0.0',
      tools: [
        {
          name: 'wallet.sign',
          description: 'Sign transaction',
          parameters: {
            type: 'object',
            properties: {
              transaction: { type: 'object' },
              keyId: { type: 'string' }
            },
            required: ['transaction']
          }
        },
        {
          name: 'wallet.pay',
          description: 'Process payment',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              recipient: { type: 'string' },
              currency: { type: 'string' }
            },
            required: ['amount', 'recipient']
          }
        },
        {
          name: 'wallet.quote',
          description: 'Get payment quote',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              fromCurrency: { type: 'string' },
              toCurrency: { type: 'string' }
            }
          }
        }
      ],
      capabilities: {
        'payment-processing': {
          supported: true,
          version: '1.0.0',
          features: ['crypto-payments', 'multi-chain', 'fee-calculation']
        },
        'identity-verification': {
          supported: true,
          version: '1.0.0',
          features: ['wallet-auth']
        }
      },
      compatibility: {
        minVersion: '1.0.0',
        maxVersion: '1.5.0',
        supportedVersions: ['1.0.0']
      }
    };

    // Mock Qlock module registration
    qlockModule = {
      moduleId: 'qlock',
      moduleName: 'Qlock Encryption Service',
      version: '2.0.0',
      tools: [
        {
          name: 'qlock.encrypt',
          description: 'Encrypt data',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              keyId: { type: 'string' },
              algorithm: { type: 'string' }
            },
            required: ['data']
          }
        },
        {
          name: 'qlock.decrypt',
          description: 'Decrypt data',
          parameters: {
            type: 'object',
            properties: {
              encryptedData: { type: 'string' },
              keyId: { type: 'string' }
            },
            required: ['encryptedData']
          }
        },
        {
          name: 'qlock.sign',
          description: 'Create digital signature',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              keyId: { type: 'string' }
            },
            required: ['data']
          }
        },
        {
          name: 'qlock.verify',
          description: 'Verify digital signature',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              signature: { type: 'string' },
              publicKey: { type: 'string' }
            },
            required: ['data', 'signature']
          }
        }
      ],
      capabilities: {
        'encryption-services': {
          supported: true,
          version: '2.0.0',
          features: ['aes-256', 'rsa-4096', 'post-quantum-ready', 'key-rotation']
        }
      },
      compatibility: {
        minVersion: '2.0.0',
        maxVersion: '3.0.0',
        supportedVersions: ['2.0.0', '2.1.0'],
        breakingChanges: [
          {
            version: '2.0.0',
            description: 'Updated encryption algorithms',
            affectedTools: ['qlock.encrypt', 'qlock.decrypt'],
            migrationAction: 'update_algorithm_parameters'
          }
        ]
      }
    };
  });

  afterEach(() => {
    service.toolRegistry.clear();
    service.capabilityMatrix.clear();
    service.versionCompatibility.clear();
    service.deprecationSchedule.clear();
    service.toolUsageStats.clear();
  });

  describe('Complete Module Registration Workflow', () => {
    it('should register multiple modules and build capability matrix', async () => {
      // Register all modules
      const squidResult = await service.registerTools(squidModule);
      const qwalletResult = await service.registerTools(qwalletModule);
      const qlockResult = await service.registerTools(qlockModule);

      // Verify all registrations succeeded
      expect(squidResult.success).toBe(true);
      expect(qwalletResult.success).toBe(true);
      expect(qlockResult.success).toBe(true);

      // Verify capability matrix is built correctly
      expect(service.capabilityMatrix.size).toBeGreaterThanOrEqual(3);
      
      const identityCapability = service.capabilityMatrix.get('identity-verification');
      expect(identityCapability.providers).toHaveLength(2); // sQuid and Qwallet
      
      const paymentCapability = service.capabilityMatrix.get('payment-processing');
      expect(paymentCapability.providers).toHaveLength(1); // Only Qwallet
      
      const encryptionCapability = service.capabilityMatrix.get('encryption-services');
      expect(encryptionCapability.providers).toHaveLength(1); // Only Qlock
    });

    it('should track version compatibility across modules', async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);

      // Check version compatibility tracking
      expect(service.versionCompatibility.has('squid')).toBe(true);
      expect(service.versionCompatibility.has('qwallet')).toBe(true);
      expect(service.versionCompatibility.has('qlock')).toBe(true);

      const qlockVersions = service.versionCompatibility.get('qlock');
      expect(qlockVersions.versions).toContain('2.0.0');
      expect(qlockVersions.compatibility['2.0.0'].breakingChanges).toHaveLength(1);
    });
  });

  describe('Multi-Module Discovery Scenarios', () => {
    beforeEach(async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);
    });

    it('should discover tools by capability requirements', async () => {
      const result = await service.discoverTools({
        capabilities: ['identity-verification'],
        includeAlternatives: true
      });

      expect(result.tools).toHaveLength(2); // sQuid and Qwallet
      expect(result.tools.every(tool => 
        tool.capabilities['identity-verification']?.supported
      )).toBe(true);
    });

    it('should discover tools with multiple capability requirements', async () => {
      const result = await service.discoverTools({
        capabilities: ['identity-verification', 'payment-processing']
      });

      expect(result.tools).toHaveLength(1); // Only Qwallet has both
      expect(result.tools[0].moduleId).toBe('qwallet');
    });

    it('should provide alternatives for each discovered tool', async () => {
      const result = await service.discoverTools({
        capabilities: ['identity-verification'],
        includeAlternatives: true
      });

      expect(result.tools).toHaveLength(2);
      result.tools.forEach(tool => {
        expect(tool.alternatives).toBeDefined();
        expect(Array.isArray(tool.alternatives)).toBe(true);
      });
    });
  });

  describe('Capability Negotiation Workflows', () => {
    beforeEach(async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);
    });

    it('should negotiate capabilities for a complete user workflow', async () => {
      // Simulate a client needing identity verification and payment processing
      const negotiation = {
        clientCapabilities: ['identity-verification', 'payment-processing', 'encryption-services'],
        requiredCapabilities: ['identity-verification', 'payment-processing'],
        preferredCapabilities: ['encryption-services'],
        clientVersion: '1.0.0',
        maxAlternatives: 3
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.compatible).toBe(true);
      expect(result.recommendedTools.length).toBeGreaterThan(0);
      
      // Should recommend Qwallet first (has both required capabilities)
      const topRecommendation = result.recommendedTools[0];
      expect(topRecommendation.moduleId).toBe('qwallet');
      expect(topRecommendation.matchedCapabilities).toContain('identity-verification');
      expect(topRecommendation.matchedCapabilities).toContain('payment-processing');

      // Should provide capability matrix
      expect(result.capabilityMatrix).toBeDefined();
      expect(result.capabilityMatrix['identity-verification']).toBeDefined();
      expect(result.capabilityMatrix['payment-processing']).toBeDefined();
    });

    it('should handle partial capability matches gracefully', async () => {
      const negotiation = {
        requiredCapabilities: ['identity-verification', 'non-existent-capability'],
        clientVersion: '1.0.0'
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.compatible).toBe(true); // Should find partial matches
      expect(result.recommendedTools.length).toBeGreaterThan(0);
      
      // Should provide alternatives for missing capabilities
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives['identity-verification']).toBeDefined();
    });

    it('should rank tools by compatibility and usage', async () => {
      // Add usage statistics to influence ranking
      const qwalletStats = service.toolUsageStats.get('qwallet');
      qwalletStats.totalUsage = 1000;

      const squidStats = service.toolUsageStats.get('squid');
      squidStats.totalUsage = 500;

      const negotiation = {
        requiredCapabilities: ['identity-verification'],
        clientVersion: '1.0.0'
      };

      const result = await service.negotiateCapabilities(negotiation);

      expect(result.recommendedTools).toHaveLength(2);
      // Qwallet should rank higher due to higher usage
      expect(result.recommendedTools[0].moduleId).toBe('qwallet');
      expect(result.recommendedTools[0].finalScore).toBeGreaterThan(
        result.recommendedTools[1].finalScore
      );
    });
  });

  describe('Cross-Module Compatibility Scenarios', () => {
    beforeEach(async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);
    });

    it('should check compatibility between different module versions', async () => {
      const compatibilityCheck = {
        moduleId: 'qlock',
        toolName: 'qlock.encrypt',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0',
        includeBreakingChanges: true,
        includeMigrationPath: true
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.compatible).toBe(false); // Major version change
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.migrationRequired).toBe(true);
      expect(result.migrationPath).toBeDefined();
      expect(result.migrationPath.steps).toHaveLength(1);
    });

    it('should suggest alternative tools for incompatible versions', async () => {
      const compatibilityCheck = {
        moduleId: 'qlock',
        toolName: 'qlock.encrypt',
        clientVersion: '1.0.0',
        targetVersion: '2.0.0'
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      expect(result.compatible).toBe(false);
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('Deprecation and Migration Workflows', () => {
    beforeEach(async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);
    });

    it('should manage complete deprecation lifecycle', async () => {
      // Schedule deprecation
      const scheduleResult = await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'squid',
        toolName: 'squid.verifyIdentity',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30',
        reason: 'Replaced by enhanced version',
        migrationGuide: 'Use squid.verifyIdentityV2',
        replacementTool: 'squid.verifyIdentityV2'
      });

      expect(scheduleResult.success).toBe(true);

      // Update deprecation
      const updateResult = await service.manageDeprecation({
        action: 'update',
        moduleId: 'squid',
        sunsetDate: '2025-12-31',
        reason: 'Extended sunset date due to user feedback'
      });

      expect(updateResult.success).toBe(true);

      // Check deprecation info in discovery
      const discoveryResult = await service.discoverTools({
        moduleId: 'squid'
      });

      expect(discoveryResult.tools[0].deprecationInfo).toBeDefined();
      expect(discoveryResult.tools[0].deprecationInfo.sunsetDate).toBe('2025-12-31');
      expect(discoveryResult.tools[0].deprecationInfo.replacementTool).toBe('squid.verifyIdentityV2');

      // Execute deprecation
      const executeResult = await service.manageDeprecation({
        action: 'execute',
        moduleId: 'squid',
        toolName: 'squid.verifyIdentity'
      });

      expect(executeResult.success).toBe(true);

      const schedule = service.deprecationSchedule.get('squid');
      expect(schedule.status).toBe('executed');
    });

    it('should filter deprecated tools from discovery by default', async () => {
      // Schedule deprecation with past date
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'squid',
        toolName: 'squid.verifyIdentity',
        deprecationDate: '2020-01-01', // Past date
        sunsetDate: '2020-06-30'
      });

      // Discovery should exclude deprecated tools by default
      const result = await service.discoverTools({
        capabilities: ['identity-verification']
      });

      expect(result.tools).toHaveLength(1); // Only Qwallet, not sQuid
      expect(result.tools[0].moduleId).toBe('qwallet');
    });

    it('should include deprecated tools when explicitly requested', async () => {
      // Schedule deprecation with past date
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'squid',
        toolName: 'squid.verifyIdentity',
        deprecationDate: '2020-01-01',
        sunsetDate: '2020-06-30'
      });

      // Discovery should include deprecated tools when requested
      const result = await service.discoverTools({
        capabilities: ['identity-verification'],
        includeDeprecated: true
      });

      expect(result.tools).toHaveLength(2); // Both sQuid and Qwallet
      
      const squidTool = result.tools.find(t => t.moduleId === 'squid');
      expect(squidTool.deprecationInfo.deprecated).toBe(true);
    });
  });

  describe('Analytics and Optimization Integration', () => {
    beforeEach(async () => {
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);
      await service.registerTools(qlockModule);

      // Add realistic usage statistics
      const squidStats = service.toolUsageStats.get('squid');
      squidStats.totalUsage = 1500;
      squidStats.tools['squid.verifyIdentity'].usageCount = 1000;
      squidStats.tools['squid.activeContext'].usageCount = 500;

      const qwalletStats = service.toolUsageStats.get('qwallet');
      qwalletStats.totalUsage = 800;
      qwalletStats.tools['wallet.pay'].usageCount = 400;
      qwalletStats.tools['wallet.sign'].usageCount = 300;
      qwalletStats.tools['wallet.quote'].usageCount = 100;

      const qlockStats = service.toolUsageStats.get('qlock');
      qlockStats.totalUsage = 200;
    });

    it('should generate comprehensive ecosystem analytics', async () => {
      const analytics = await service.getToolAnalytics({
        period: '30d',
        includeRecommendations: true,
        includeOptimizations: true,
        includeTrends: true
      });

      expect(analytics.popularTools).toHaveLength(3);
      expect(analytics.popularTools[0].moduleId).toBe('squid'); // Highest usage
      expect(analytics.popularTools[1].moduleId).toBe('qwallet');
      expect(analytics.popularTools[2].moduleId).toBe('qlock');

      expect(analytics.capabilityUsage).toBeDefined();
      expect(analytics.capabilityUsage['identity-verification'].totalProviders).toBe(2);
      expect(analytics.capabilityUsage['payment-processing'].totalProviders).toBe(1);
      expect(analytics.capabilityUsage['encryption-services'].totalProviders).toBe(1);

      expect(analytics.recommendations).toBeDefined();
      expect(analytics.optimizations).toBeDefined();
    });

    it('should identify optimization opportunities', async () => {
      const analytics = await service.getToolAnalytics({
        includeRecommendations: true,
        includeOptimizations: true
      });

      const recommendations = analytics.recommendations;
      const optimizations = analytics.optimizations;

      // Should recommend caching for high-usage tools
      const cachingOptimization = optimizations.find(o => o.type === 'caching');
      expect(cachingOptimization).toBeDefined();
      expect(cachingOptimization.affectedTools).toContain('squid');

      // Should identify capability gaps (single provider capabilities)
      const capabilityGap = recommendations.find(r => r.type === 'capability_gap');
      expect(capabilityGap).toBeDefined();
      expect(capabilityGap.affectedCapabilities).toContain('payment-processing');
      expect(capabilityGap.affectedCapabilities).toContain('encryption-services');
    });
  });

  describe('Event-Driven Integration', () => {
    it('should publish events throughout the workflow', async () => {
      const publishedEvents = [];
      
      // Mock event bus to capture events
      service.eventBus.publish = async (event) => {
        publishedEvents.push(event);
        return { success: true };
      };

      // Register modules
      await service.registerTools(squidModule);
      await service.registerTools(qwalletModule);

      // Schedule deprecation
      await service.manageDeprecation({
        action: 'schedule',
        moduleId: 'squid',
        toolName: 'squid.verifyIdentity',
        deprecationDate: '2024-12-31',
        sunsetDate: '2025-06-30'
      });

      // Verify events were published
      expect(publishedEvents).toHaveLength(3); // 2 registrations + 1 deprecation

      const registrationEvents = publishedEvents.filter(e => 
        e.payload.action === 'TOOLS_REGISTERED'
      );
      expect(registrationEvents).toHaveLength(2);

      const deprecationEvents = publishedEvents.filter(e => 
        e.payload.action === 'DEPRECATION_SCHEDULED'
      );
      expect(deprecationEvents).toHaveLength(1);

      // Verify event structure
      const event = publishedEvents[0];
      expect(event.topic).toBe('q.tools.registry.updated.v1');
      expect(event.actor.squidId).toBe('system');
      expect(event.actor.subId).toBe('mcp-tool-discovery');
      expect(event.metadata.source).toBe('MCPToolDiscoveryService');
    });
  });
});