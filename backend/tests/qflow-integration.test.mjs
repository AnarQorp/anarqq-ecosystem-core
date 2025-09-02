/**
 * Qflow Integration Tests
 * Tests complete evaluation workflows and coherence layer integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QflowService } from '../services/QflowService.mjs';

// Mock external services
vi.mock('../services/EventBusService.mjs', () => ({
  EventBusService: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../services/ObservabilityService.mjs', () => ({
  ObservabilityService: vi.fn().mockImplementation(() => ({
    recordMetric: vi.fn()
  }))
}));

describe('Qflow Integration Tests', () => {
  let qflowService;

  beforeEach(() => {
    qflowService = new QflowService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Evaluation Workflow', () => {
    it('should execute complete evaluation with all layers', async () => {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = {
        identity: {
          squidId: 'test-user-123',
          subId: 'test-sub-456',
          verified: true
        },
        permissions: ['content.evaluate', 'content.read'],
        metadata: {
          contentType: 'image/jpeg',
          source: 'user-upload',
          tags: ['safe-content']
        }
      };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Verify evaluation structure
      expect(evaluation).toBeDefined();
      expect(evaluation.id).toBeDefined();
      expect(evaluation.cid).toBe(testCid);
      expect(evaluation.verdict).toMatch(/^(ALLOW|DENY|WARN|UNKNOWN)$/);
      expect(evaluation.confidence).toBeGreaterThanOrEqual(0);
      expect(evaluation.confidence).toBeLessThanOrEqual(1);
      expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.riskScore).toBeLessThanOrEqual(1);

      // Verify layers executed
      expect(evaluation.layers).toBeDefined();
      expect(evaluation.layers.length).toBeGreaterThan(0);
      
      const layerNames = evaluation.layers.map(l => l.name);
      expect(layerNames).toContain('Content Safety Evaluation');
      expect(layerNames).toContain('Identity Verification');
      expect(layerNames).toContain('Permission Validation');
      expect(layerNames).toContain('Risk Assessment');

      // Verify evidence collection
      expect(evaluation.evidence).toBeDefined();
      expect(Array.isArray(evaluation.evidence)).toBe(true);

      // Verify metadata
      expect(evaluation.metadata).toBeDefined();
      expect(evaluation.metadata.evaluationTime).toBeDefined();
      expect(evaluation.metadata.timestamp).toBeDefined();

      console.log('Complete evaluation result:', JSON.stringify(evaluation, null, 2));
    });

    it('should handle evaluation with missing permissions', async () => {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = {
        identity: {
          squidId: 'test-user-123',
          verified: true
        },
        permissions: [] // No permissions
      };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Should still complete but with appropriate verdicts
      expect(evaluation).toBeDefined();
      expect(evaluation.verdict).toBeDefined();
      
      // Permission layer should deny
      const permissionLayer = evaluation.layers.find(l => 
        l.name === 'Permission Validation'
      );
      expect(permissionLayer).toBeDefined();
      expect(permissionLayer.verdict).toBe('DENY');
    });

    it('should handle evaluation with unverified identity', async () => {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = {
        identity: {
          squidId: 'test-user-123',
          verified: false
        },
        permissions: ['content.evaluate']
      };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Should complete with warnings
      expect(evaluation).toBeDefined();
      
      // Identity layer should warn
      const identityLayer = evaluation.layers.find(l => 
        l.name === 'Identity Verification'
      );
      expect(identityLayer).toBeDefined();
      expect(identityLayer.verdict).toBe('WARN');
    });
  });

  describe('Escalation Scenarios', () => {
    it('should trigger escalation for low confidence evaluation', async () => {
      // Clear existing layers and add only low confidence layers
      const originalLayers = new Map(qflowService.coherenceLayers);
      qflowService.coherenceLayers.clear();
      
      qflowService.registerCoherenceLayer('low-confidence-layer-1', {
        name: 'Low Confidence Layer 1',
        priority: 1,
        handler: async () => ({
          verdict: 'UNKNOWN',
          confidence: 0.2,
          evidence: [{
            type: 'uncertainty',
            reason: 'insufficient-data',
            timestamp: new Date().toISOString()
          }]
        })
      });

      qflowService.registerCoherenceLayer('low-confidence-layer-2', {
        name: 'Low Confidence Layer 2',
        priority: 2,
        handler: async () => ({
          verdict: 'UNKNOWN',
          confidence: 0.3,
          evidence: [{
            type: 'uncertainty',
            reason: 'ambiguous-content',
            timestamp: new Date().toISOString()
          }]
        })
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      expect(evaluation.escalation).toBeDefined();
      expect(evaluation.escalation.action).toMatch(/human-review|expert-review/);
      expect(evaluation.escalation.rule).toMatch(/low-confidence|conflicting-verdicts/);
      expect(evaluation.escalation.priority).toMatch(/medium|high/);

      // Restore original layers
      qflowService.coherenceLayers = originalLayers;
    });

    it('should trigger escalation for high risk content', async () => {
      // Mock risk assessment to return high risk
      const originalHandler = qflowService.coherenceLayers.get('risk-assessment').handler;
      
      qflowService.coherenceLayers.get('risk-assessment').handler = async () => ({
        verdict: 'DENY',
        confidence: 0.9,
        evidence: [{
          type: 'risk-assessment',
          riskScore: 0.95,
          factors: ['malicious-content', 'security-threat'],
          timestamp: new Date().toISOString()
        }]
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      expect(evaluation.escalation).toBeDefined();
      expect(evaluation.escalation.action).toMatch(/immediate-review|expert-review/);
      expect(evaluation.escalation.rule).toMatch(/high-risk-content|conflicting-verdicts/);
      expect(evaluation.escalation.priority).toMatch(/critical|high/);

      // Restore original handler
      qflowService.coherenceLayers.get('risk-assessment').handler = originalHandler;
    });

    it('should trigger escalation for conflicting verdicts', async () => {
      // Mock layers to return conflicting verdicts
      qflowService.registerCoherenceLayer('allow-layer', {
        name: 'Allow Layer',
        priority: 1,
        handler: async () => ({
          verdict: 'ALLOW',
          confidence: 0.8,
          evidence: []
        })
      });

      qflowService.registerCoherenceLayer('deny-layer', {
        name: 'Deny Layer',
        priority: 2,
        handler: async () => ({
          verdict: 'DENY',
          confidence: 0.8,
          evidence: []
        })
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      expect(evaluation.escalation).toBeDefined();
      expect(evaluation.escalation.action).toBe('expert-review');
      expect(evaluation.escalation.rule).toBe('conflicting-verdicts');
      expect(evaluation.escalation.priority).toBe('high');
    });
  });

  describe('Performance and Caching', () => {
    it('should demonstrate caching performance improvement', async () => {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      // First evaluation (cache miss)
      const start1 = Date.now();
      const evaluation1 = await qflowService.evaluate(testCid, context);
      const time1 = Date.now() - start1;

      // Second evaluation (cache hit)
      const start2 = Date.now();
      const evaluation2 = await qflowService.evaluate(testCid, context);
      const time2 = Date.now() - start2;

      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1);
      expect(evaluation1.id).toBe(evaluation2.id);
      expect(evaluation1.verdict).toBe(evaluation2.verdict);

      console.log(`Cache performance: First evaluation: ${time1}ms, Cached evaluation: ${time2}ms`);
    });

    it('should handle batch evaluation efficiently', async () => {
      const cids = [
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB',
        'QmSrPmbaUKA3ZodhzPWZnpFgcPMFWF4QsxXbkWfEptTBJd'
      ];
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const start = Date.now();
      const results = await qflowService.warmupCache(cids, context);
      const totalTime = Date.now() - start;

      expect(results).toBeDefined();
      expect(results.length).toBe(cids.length);
      
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);

      console.log(`Batch evaluation: ${cids.length} CIDs in ${totalTime}ms (${totalTime/cids.length}ms avg)`);
    });
  });

  describe('Layer Execution Order and Dependencies', () => {
    it('should execute layers in priority order', async () => {
      const executionOrder = [];
      
      // Mock layers with different priorities
      qflowService.registerCoherenceLayer('priority-1', {
        name: 'Priority 1 Layer',
        priority: 1,
        handler: async () => {
          executionOrder.push('priority-1');
          return { verdict: 'ALLOW', confidence: 0.8, evidence: [] };
        }
      });

      qflowService.registerCoherenceLayer('priority-3', {
        name: 'Priority 3 Layer',
        priority: 3,
        handler: async () => {
          executionOrder.push('priority-3');
          return { verdict: 'ALLOW', confidence: 0.8, evidence: [] };
        }
      });

      qflowService.registerCoherenceLayer('priority-2', {
        name: 'Priority 2 Layer',
        priority: 2,
        handler: async () => {
          executionOrder.push('priority-2');
          return { verdict: 'ALLOW', confidence: 0.8, evidence: [] };
        }
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      await qflowService.evaluate(testCid, context);

      expect(executionOrder).toEqual(['priority-1', 'priority-2', 'priority-3']);
    });

    it('should handle layer timeout gracefully', async () => {
      qflowService.registerCoherenceLayer('timeout-layer', {
        name: 'Timeout Layer',
        priority: 1,
        timeout: 100, // Very short timeout
        handler: async () => {
          // Simulate slow operation
          await new Promise(resolve => setTimeout(resolve, 200));
          return { verdict: 'ALLOW', confidence: 0.8, evidence: [] };
        }
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Should complete despite timeout
      expect(evaluation).toBeDefined();
      
      // Should have error evidence
      const errorEvidence = evaluation.evidence.filter(e => e.type === 'layer-error');
      expect(errorEvidence.length).toBeGreaterThan(0);
    });

    it('should handle layer retry policy', async () => {
      let attemptCount = 0;
      
      qflowService.registerCoherenceLayer('retry-layer', {
        name: 'Retry Layer',
        priority: 1,
        retryPolicy: { maxRetries: 2, backoffMs: 10 },
        handler: async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return { verdict: 'ALLOW', confidence: 0.8, evidence: [] };
        }
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      expect(evaluation).toBeDefined();
      expect(attemptCount).toBe(3); // Initial attempt + 2 retries
    });
  });

  describe('Evidence Collection and Analysis', () => {
    it('should collect comprehensive evidence from all layers', async () => {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = {
        identity: { squidId: 'test-user', verified: true },
        permissions: ['content.evaluate'],
        metadata: { contentType: 'image/jpeg' }
      };

      const evaluation = await qflowService.evaluate(testCid, context);

      expect(evaluation.evidence).toBeDefined();
      expect(Array.isArray(evaluation.evidence)).toBe(true);

      // Check for different types of evidence
      const evidenceTypes = evaluation.evidence.map(e => e.type);
      const uniqueTypes = [...new Set(evidenceTypes)];
      
      expect(uniqueTypes.length).toBeGreaterThan(0);
      
      // Each evidence should have required fields
      evaluation.evidence.forEach(evidence => {
        expect(evidence.type).toBeDefined();
        expect(evidence.timestamp).toBeDefined();
      });

      console.log('Evidence collected:', evaluation.evidence.map(e => e.type));
    });

    it('should correlate evidence with risk scoring', async () => {
      // Mock content safety to return risk evidence
      const originalHandler = qflowService.coherenceLayers.get('content-safety').handler;
      
      qflowService.coherenceLayers.get('content-safety').handler = async () => ({
        verdict: 'WARN',
        confidence: 0.7,
        evidence: [
          {
            type: 'content-risk',
            category: 'explicit-content',
            severity: 'medium',
            timestamp: new Date().toISOString()
          },
          {
            type: 'risk-indicator',
            factor: 'suspicious-metadata',
            score: 0.6,
            timestamp: new Date().toISOString()
          }
        ]
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Risk score should reflect the evidence
      expect(evaluation.riskScore).toBeGreaterThanOrEqual(0.1);
      
      // Should have risk-related evidence
      const riskEvidence = evaluation.evidence.filter(e => 
        e.type === 'content-risk' || e.type === 'risk-indicator'
      );
      expect(riskEvidence.length).toBeGreaterThan(0);

      // Restore original handler
      qflowService.coherenceLayers.get('content-safety').handler = originalHandler;
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect custom configuration', async () => {
      const customConfig = {
        confidenceThreshold: 0.9,
        escalationThreshold: 0.3,
        evaluationTimeout: 60000
      };

      qflowService.updateConfig(customConfig);

      expect(qflowService.config.confidenceThreshold).toBe(0.9);
      expect(qflowService.config.escalationThreshold).toBe(0.3);
      expect(qflowService.config.evaluationTimeout).toBe(60000);
    });

    it('should support custom escalation rules', async () => {
      const customRule = {
        condition: (evaluation) => evaluation.confidence < 0.6,
        action: 'auto-deny',
        priority: 'high',
        timeout: 300000
      };

      qflowService.addEscalationRule('custom-rule', customRule);

      const rules = qflowService.getEscalationRules();
      const customRuleFound = rules.find(r => r.id === 'custom-rule');
      
      expect(customRuleFound).toBeDefined();
      expect(customRuleFound.action).toBe('auto-deny');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle complete layer failure gracefully', async () => {
      qflowService.registerCoherenceLayer('failing-layer', {
        name: 'Failing Layer',
        priority: 1,
        critical: false, // Non-critical layer
        handler: async () => {
          throw new Error('Layer completely failed');
        }
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      const evaluation = await qflowService.evaluate(testCid, context);

      // Should complete despite layer failure
      expect(evaluation).toBeDefined();
      expect(evaluation.verdict).toBeDefined();
      
      // Should have error evidence
      const errorEvidence = evaluation.evidence.filter(e => e.type === 'layer-error');
      expect(errorEvidence.length).toBeGreaterThan(0);
    });

    it('should fail fast for critical layer failure', async () => {
      qflowService.registerCoherenceLayer('critical-failing-layer', {
        name: 'Critical Failing Layer',
        priority: 1,
        critical: true, // Critical layer
        handler: async () => {
          throw new Error('Critical layer failed');
        }
      });

      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const context = { identity: { verified: true }, permissions: ['content.evaluate'] };

      await expect(qflowService.evaluate(testCid, context)).rejects.toThrow('Critical layer failed');
    });
  });
});