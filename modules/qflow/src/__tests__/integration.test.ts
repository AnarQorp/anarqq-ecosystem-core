import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeQflow, shutdownQflow } from '../index.js';
import { schemaRegistry } from '../schemas/SchemaRegistry.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { qflowMCPTools } from '../mcp/QflowMCPTools.js';
import { qflowDeprecationManager } from '../deprecation/QflowDeprecationManager.js';

// Mock external dependencies
vi.mock('../../../../backend/services/EventBusService.mjs', () => ({
  EventBusService: vi.fn().mockImplementation(() => ({
    emit: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../../../backend/services/MCPToolDiscoveryService.mjs', () => ({
  MCPToolDiscoveryService: vi.fn().mockImplementation(() => ({
    registerTools: vi.fn().mockResolvedValue({
      success: true,
      registrationId: 'test-registration-id',
      toolCount: 14,
      capabilityCount: 8
    })
  }))
}));

vi.mock('../../../../backend/services/DeprecationManagementService.mjs', () => ({
  DeprecationManagementService: vi.fn().mockImplementation(() => ({
    createDeprecationSchedule: vi.fn().mockResolvedValue({
      featureId: 'test-feature',
      status: 'ANNOUNCED'
    }),
    trackFeatureUsage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn()
  }))
}));

describe('Qflow Integration Tests', () => {
  describe('Module Initialization', () => {
    it('should initialize all components successfully', async () => {
      await expect(initializeQflow()).resolves.not.toThrow();
    });

    it('should shutdown all components successfully', async () => {
      await initializeQflow();
      await expect(shutdownQflow()).resolves.not.toThrow();
    });
  });

  describe('Schema Registry Integration', () => {
    it('should have all required schemas loaded', () => {
      const schemas = schemaRegistry.getAllSchemas();
      
      expect(schemas.length).toBeGreaterThan(0);
      
      const schemaIds = schemas.map(s => s.id);
      expect(schemaIds).toContain('q.qflow.flow.created.v1');
      expect(schemaIds).toContain('q.qflow.exec.started.v1');
      expect(schemaIds).toContain('q.qflow.exec.step.dispatched.v1');
      expect(schemaIds).toContain('q.qflow.exec.step.completed.v1');
      expect(schemaIds).toContain('q.qflow.exec.completed.v1');
      expect(schemaIds).toContain('q.qflow.validation.pipeline.executed.v1');
      expect(schemaIds).toContain('q.qflow.external.event.received.v1');
    });

    it('should validate events correctly', () => {
      const validEvent = schemaRegistry.createEvent(
        'q.qflow.flow.created.v1',
        'squid:test-user',
        {
          flowId: 'test-flow',
          flowName: 'Test Flow',
          flowVersion: '1.0.0',
          owner: 'squid:test-user',
          ipfsCid: 'QmTestCID'
        }
      );

      expect(validEvent.eventId).toBeDefined();
      expect(validEvent.timestamp).toBeDefined();
      expect(validEvent.actor).toBe('squid:test-user');
      expect(validEvent.data.flowId).toBe('test-flow');
    });
  });

  describe('Event Emitter Integration', () => {
    it('should emit flow created events', async () => {
      await expect(
        qflowEventEmitter.emitFlowCreated('squid:test-user', {
          flowId: 'test-flow',
          flowName: 'Test Flow',
          flowVersion: '1.0.0',
          owner: 'squid:test-user',
          ipfsCid: 'QmTestCID'
        })
      ).resolves.not.toThrow();
    });

    it('should emit execution started events', async () => {
      await expect(
        qflowEventEmitter.emitExecutionStarted('squid:test-user', {
          executionId: 'exec-123',
          flowId: 'flow-123',
          flowVersion: '1.0.0',
          triggerType: 'manual'
        })
      ).resolves.not.toThrow();
    });

    it('should emit validation pipeline events', async () => {
      await expect(
        qflowEventEmitter.emitValidationPipelineExecuted('squid:test-user', {
          validationId: 'val-123',
          operationType: 'flow-execution',
          operationId: 'op-123',
          inputHash: 'hash123',
          pipelineResult: {
            overall: { valid: true, durationMs: 100 },
            qlock: { valid: true, durationMs: 25, errors: [], metadata: {} },
            qonsent: { valid: true, durationMs: 25, errors: [], permissions: [] },
            qindex: { valid: true, durationMs: 25, errors: [], indexed: true },
            qerberos: { valid: true, durationMs: 25, errors: [], riskScore: 0, anomalies: [] }
          }
        })
      ).resolves.not.toThrow();
    });
  });

  describe('MCP Tools Integration', () => {
    it('should register MCP tools successfully', async () => {
      await expect(qflowMCPTools.registerTools()).resolves.not.toThrow();
    });

    it('should have all required MCP tools defined', () => {
      const tools = (qflowMCPTools as any).getQflowTools();
      
      expect(tools).toHaveLength(14);
      
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('qflow.evaluate');
      expect(toolNames).toContain('qflow.flow.create');
      expect(toolNames).toContain('qflow.exec.start');
      expect(toolNames).toContain('qflow.webhook.verify');
      expect(toolNames).toContain('qflow.policy.update');
    });

    it('should have all required capabilities defined', () => {
      const capabilities = (qflowMCPTools as any).getQflowCapabilities();
      
      expect(capabilities).toHaveProperty('universal-validation');
      expect(capabilities).toHaveProperty('serverless-execution');
      expect(capabilities).toHaveProperty('flow-management');
      expect(capabilities).toHaveProperty('execution-control');
      expect(capabilities).toHaveProperty('dao-governance');
      expect(capabilities).toHaveProperty('external-integration');
      expect(capabilities).toHaveProperty('audit-compliance');
      expect(capabilities).toHaveProperty('performance-monitoring');
    });
  });

  describe('Deprecation Manager Integration', () => {
    it('should deprecate features successfully', async () => {
      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2024-01-01T00:00:00.000Z',
        sunsetDate: '2024-04-01T00:00:00.000Z',
        reason: 'Integration test',
        replacementFeature: 'new-feature'
      };

      await expect(
        qflowDeprecationManager.deprecateFeature('test-feature', deprecationInfo)
      ).resolves.not.toThrow();
    });

    it('should track deprecated feature usage', async () => {
      const usageData = {
        flowId: 'flow-123',
        actor: 'squid:test-user',
        context: { source: 'test' }
      };

      await expect(
        qflowDeprecationManager.trackDeprecatedFeatureUsage('test-feature', usageData)
      ).resolves.not.toThrow();
    });

    it('should provide deprecation status', () => {
      const status = qflowDeprecationManager.getDeprecationStatus('unknown-feature');
      expect(status.deprecated).toBe(false);
    });

    it('should create compatibility warnings', () => {
      const warning = qflowDeprecationManager.createCompatibilityWarning('unknown-feature');
      expect(warning).toBe('');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete flow lifecycle with events', async () => {
      // 1. Initialize Qflow
      await initializeQflow();

      // 2. Create and validate a flow created event
      const flowCreatedEvent = schemaRegistry.createEvent(
        'q.qflow.flow.created.v1',
        'squid:test-user',
        {
          flowId: 'integration-test-flow',
          flowName: 'Integration Test Flow',
          flowVersion: '1.0.0',
          owner: 'squid:test-user',
          ipfsCid: 'QmIntegrationTestCID'
        }
      );

      expect(flowCreatedEvent).toBeDefined();
      expect(flowCreatedEvent.data.flowId).toBe('integration-test-flow');

      // 3. Emit the flow created event
      await qflowEventEmitter.emitFlowCreated('squid:test-user', {
        flowId: 'integration-test-flow',
        flowName: 'Integration Test Flow',
        flowVersion: '1.0.0',
        owner: 'squid:test-user',
        ipfsCid: 'QmIntegrationTestCID'
      });

      // 4. Start execution and emit execution started event
      await qflowEventEmitter.emitExecutionStarted('squid:test-user', {
        executionId: 'integration-exec-123',
        flowId: 'integration-test-flow',
        flowVersion: '1.0.0',
        triggerType: 'manual'
      });

      // 5. Emit validation pipeline event
      await qflowEventEmitter.emitValidationPipelineExecuted('squid:test-user', {
        validationId: 'integration-val-123',
        operationType: 'flow-execution',
        operationId: 'integration-exec-123',
        inputHash: 'integration-hash',
        pipelineResult: {
          overall: { valid: true, durationMs: 150 },
          qlock: { valid: true, durationMs: 30, errors: [], metadata: {} },
          qonsent: { valid: true, durationMs: 40, errors: [], permissions: ['flow.execute'] },
          qindex: { valid: true, durationMs: 35, errors: [], indexed: true },
          qerberos: { valid: true, durationMs: 45, errors: [], riskScore: 0.1, anomalies: [] }
        }
      });

      // 6. Complete execution
      await qflowEventEmitter.emitExecutionCompleted('squid:test-user', {
        executionId: 'integration-exec-123',
        flowId: 'integration-test-flow',
        status: 'completed',
        startTime: '2023-08-15T10:00:00.000Z',
        endTime: '2023-08-15T10:05:00.000Z',
        durationMs: 300000,
        completedSteps: ['step-1', 'step-2'],
        failedSteps: []
      });

      // 7. Shutdown Qflow
      await shutdownQflow();

      // All operations should complete without errors
      expect(true).toBe(true);
    });

    it('should handle deprecation workflow', async () => {
      // 1. Deprecate a feature
      await qflowDeprecationManager.deprecateFeature('old-template', {
        feature: 'Old Template System',
        version: '1.0.0',
        deprecationDate: '2023-01-01T00:00:00.000Z',
        sunsetDate: '2024-01-01T00:00:00.000Z',
        reason: 'Replaced by new system',
        replacementFeature: 'new-template-v2'
      });

      // 2. Track usage of deprecated feature
      await qflowDeprecationManager.trackDeprecatedFeatureUsage('old-template', {
        flowId: 'legacy-flow',
        actor: 'squid:legacy-user'
      });

      // 3. Get deprecation status
      const status = qflowDeprecationManager.getDeprecationStatus('old-template');
      expect(status.deprecated).toBe(true);

      // 4. Get migration recommendations
      const recommendations = await qflowDeprecationManager.getMigrationRecommendations('old-template');
      expect(recommendations).toBeDefined();
      expect(recommendations.replacementFeature).toBe('new-template-v2');

      // 5. Create compatibility warning
      const warning = qflowDeprecationManager.createCompatibilityWarning('old-template');
      expect(warning).toContain('deprecated');
    });
  });
});