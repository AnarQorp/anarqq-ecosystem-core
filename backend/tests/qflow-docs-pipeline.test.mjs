/**
 * Qflow Documentation Pipeline Tests
 * Tests for the documentation automation pipeline implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QflowDocumentationPipeline } from '../services/QflowDocumentationPipeline.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import fs from 'fs/promises';
import path from 'path';

describe('QflowDocumentationPipeline', () => {
  let pipeline;
  let eventBus;
  let mockExecSync;

  beforeEach(async () => {
    // Mock execSync to avoid running actual commands
    mockExecSync = vi.fn();
    vi.doMock('child_process', () => ({
      execSync: mockExecSync
    }));

    pipeline = new QflowDocumentationPipeline();
    eventBus = new EventBusService();
    
    // Mock file system operations
    vi.spyOn(fs, 'mkdir').mockResolvedValue();
    vi.spyOn(fs, 'writeFile').mockResolvedValue();
    vi.spyOn(fs, 'readFile').mockResolvedValue('mock file content');
    vi.spyOn(fs, 'copyFile').mockResolvedValue();
    vi.spyOn(fs, 'readdir').mockResolvedValue([]);
    vi.spyOn(fs, 'access').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pipeline Initialization', () => {
    it('should initialize with correct pipeline steps', () => {
      const status = pipeline.getPipelineStatus();
      
      expect(status.steps).toEqual([
        'validate',
        'regenerate-index',
        'build-scripts',
        'publish-portal'
      ]);
      expect(status.steps.length).toBe(4);
    });

    it('should have default configuration', () => {
      const config = pipeline.getConfig();
      
      expect(config.maxRetries).toBe(3);
      expect(config.rollbackOnFailure).toBe(true);
      expect(config.publishToPortal).toBe(true);
      expect(config.notifyOnFailure).toBe(true);
    });

    it('should register coherence layers with Qflow service', () => {
      const layers = pipeline.qflowService.getRegisteredLayers();
      const pipelineLayerNames = layers
        .filter(layer => layer.id.startsWith('docs-pipeline-'))
        .map(layer => layer.id);
      
      expect(pipelineLayerNames).toContain('docs-pipeline-validate');
      expect(pipelineLayerNames).toContain('docs-pipeline-regenerate-index');
      expect(pipelineLayerNames).toContain('docs-pipeline-build-scripts');
      expect(pipelineLayerNames).toContain('docs-pipeline-publish-portal');
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute complete pipeline successfully', async () => {
      // Mock successful command executions
      mockExecSync
        .mockReturnValueOnce('✅ All documentation validation checks passed')
        .mockReturnValueOnce('✅ Master index build completed successfully')
        .mockReturnValueOnce('✅ Video scripts generated successfully')
        .mockReturnValueOnce('✅ Documentation portal deployed successfully');

      const context = {
        trigger: 'manual',
        source: 'test',
        initiatedBy: 'test-user'
      };

      const result = await pipeline.executePipeline(context);

      expect(result.success).toBe(true);
      expect(result.pipelineId).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.evaluation.verdict).toBe('ALLOW');
    });

    it('should handle pipeline failure and execute rollback', async () => {
      // Mock validation success but index generation failure
      mockExecSync
        .mockReturnValueOnce('✅ All documentation validation checks passed')
        .mockImplementationOnce(() => {
          throw new Error('Index generation failed');
        });

      const context = {
        trigger: 'manual',
        source: 'test',
        initiatedBy: 'test-user'
      };

      await expect(pipeline.executePipeline(context)).rejects.toThrow();
      
      // Verify rollback was attempted
      expect(pipeline.rollbackStack.length).toBeGreaterThan(0);
    });

    it('should skip portal publishing when disabled', async () => {
      // Disable portal publishing
      pipeline.updateConfig({ publishToPortal: false });

      mockExecSync
        .mockReturnValueOnce('✅ All documentation validation checks passed')
        .mockReturnValueOnce('✅ Master index build completed successfully')
        .mockReturnValueOnce('✅ Video scripts generated successfully');

      const context = {
        trigger: 'manual',
        source: 'test'
      };

      const result = await pipeline.executePipeline(context);

      expect(result.success).toBe(true);
      // Portal publishing should be skipped, not called
      expect(mockExecSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('Individual Pipeline Steps', () => {
    it('should validate documentation successfully', async () => {
      mockExecSync.mockReturnValue('✅ All documentation validation checks passed');

      const context = { validationOnly: true };
      const result = await pipeline.validateDocumentation(context);

      expect(result.verdict).toBe('ALLOW');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.evidence[0].type).toBe('validation-success');
    });

    it('should handle validation failure', async () => {
      mockExecSync.mockReturnValue('❌ Documentation validation FAILED');

      const context = { validationOnly: true };
      const result = await pipeline.validateDocumentation(context);

      expect(result.verdict).toBe('DENY');
      expect(result.evidence[0].type).toBe('validation-failure');
    });

    it('should regenerate index successfully', async () => {
      mockExecSync.mockReturnValue('✅ Master index build completed successfully');

      const context = { indexOnly: true };
      const result = await pipeline.regenerateIndex(context);

      expect(result.verdict).toBe('ALLOW');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.evidence[0].type).toBe('index-generation-success');
    });

    it('should build scripts with warning verdict', async () => {
      mockExecSync.mockReturnValue('⚠️ Some scripts generated with warnings');

      const context = { scriptsOnly: true };
      const result = await pipeline.buildScripts(context);

      expect(result.verdict).toBe('WARN');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should publish portal successfully', async () => {
      mockExecSync.mockReturnValue('✅ Documentation portal deployed successfully');

      const context = { portalOnly: true };
      const result = await pipeline.publishPortal(context);

      expect(result.verdict).toBe('ALLOW');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Event Handling', () => {
    it('should handle documentation update events', async () => {
      const executePipelineSpy = vi.spyOn(pipeline, 'executePipeline').mockResolvedValue({
        success: true,
        pipelineId: 'test-pipeline-id'
      });

      const event = {
        source: 'test-module',
        payload: {
          updateType: 'manual',
          files: ['docs/test.md'],
          triggerPipeline: true
        }
      };

      await pipeline.handleDocumentationUpdate(event);

      expect(executePipelineSpy).toHaveBeenCalledWith({
        trigger: 'documentation-update',
        source: 'test-module',
        updateType: 'manual',
        files: ['docs/test.md']
      });
    });

    it('should handle module release events', async () => {
      const executePipelineSpy = vi.spyOn(pipeline, 'executePipeline').mockResolvedValue({
        success: true,
        pipelineId: 'test-pipeline-id'
      });

      const event = {
        source: 'qwallet',
        payload: {
          version: '2.1.0',
          type: 'minor'
        }
      };

      await pipeline.handleModuleRelease(event);

      expect(executePipelineSpy).toHaveBeenCalledWith({
        trigger: 'module-release',
        module: 'qwallet',
        version: '2.1.0',
        releaseType: 'minor'
      });
    });

    it('should handle quality failure events with remediation', async () => {
      const remediateSpy = vi.spyOn(pipeline, 'remediateQualityIssues').mockResolvedValue();
      const executePipelineSpy = vi.spyOn(pipeline, 'executePipeline').mockResolvedValue({
        success: true,
        pipelineId: 'test-pipeline-id'
      });

      const event = {
        payload: {
          issues: [
            { type: 'missing-metadata', file: 'test.md' }
          ],
          severity: 'medium'
        }
      };

      await pipeline.handleQualityFailure(event);

      expect(remediateSpy).toHaveBeenCalledWith(event.payload.issues);
      expect(executePipelineSpy).toHaveBeenCalledWith({
        trigger: 'quality-remediation',
        issues: event.payload.issues,
        severity: 'medium'
      });
    });
  });

  describe('Rollback Management', () => {
    it('should create rollback points during execution', async () => {
      const rollbackData = {
        timestamp: new Date().toISOString(),
        validationResult: 'success'
      };

      await pipeline.createRollbackPoint('validation', rollbackData);

      expect(pipeline.rollbackStack.length).toBe(1);
      expect(pipeline.rollbackStack[0].step).toBe('validation');
      expect(pipeline.rollbackStack[0].data).toEqual(rollbackData);
    });

    it('should limit rollback stack size', async () => {
      // Create more than 10 rollback points
      for (let i = 0; i < 15; i++) {
        await pipeline.createRollbackPoint(`step-${i}`, { index: i });
      }

      expect(pipeline.rollbackStack.length).toBe(10);
      expect(pipeline.rollbackStack[0].step).toBe('step-5'); // First 5 should be removed
    });

    it('should execute rollback in reverse order', async () => {
      // Create multiple rollback points
      await pipeline.createRollbackPoint('validation', {});
      await pipeline.createRollbackPoint('index-generation', {});
      await pipeline.createRollbackPoint('script-generation', {});

      const rollbackSpy = vi.spyOn(pipeline, 'restoreScriptsBackup').mockResolvedValue();
      const indexRollbackSpy = vi.spyOn(pipeline, 'restoreIndexBackup').mockResolvedValue();

      await pipeline.executeRollback('test-pipeline-id');

      // Rollback should be called in reverse order
      expect(rollbackSpy).toHaveBeenCalled();
      expect(indexRollbackSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxRetries: 5,
        rollbackOnFailure: false,
        validationTimeout: 600000
      };

      pipeline.updateConfig(newConfig);
      const config = pipeline.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.rollbackOnFailure).toBe(false);
      expect(config.validationTimeout).toBe(600000);
      // Other config should remain unchanged
      expect(config.publishToPortal).toBe(true);
    });

    it('should provide pipeline status', () => {
      const status = pipeline.getPipelineStatus();

      expect(status).toHaveProperty('steps');
      expect(status).toHaveProperty('rollbackPoints');
      expect(status).toHaveProperty('config');
      expect(Array.isArray(status.steps)).toBe(true);
      expect(typeof status.rollbackPoints).toBe('number');
    });

    it('should provide pipeline metrics', () => {
      const metrics = pipeline.getMetrics();

      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('successfulExecutions');
      expect(metrics).toHaveProperty('failedExecutions');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('rollbacksExecuted');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation timeout', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command timed out');
      });

      const context = { validationOnly: true };
      const result = await pipeline.validateDocumentation(context);

      expect(result.verdict).toBe('DENY');
      expect(result.evidence[0].type).toBe('validation-error');
    });

    it('should handle missing scripts directory gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const context = { scriptsOnly: true };
      const result = await pipeline.buildScripts(context);

      expect(result.verdict).toBe('WARN');
      expect(result.evidence[0].type).toBe('script-generation-error');
    });

    it('should emit failure events on pipeline failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Pipeline step failed');
      });

      const eventSpy = vi.spyOn(pipeline.eventBus, 'publish');

      const context = { trigger: 'manual' };
      
      await expect(pipeline.executePipeline(context)).rejects.toThrow();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'q.docs.pipeline.failed.v1'
        })
      );
    });
  });

  describe('Backup and Restore', () => {
    it('should create backup directories', async () => {
      await pipeline.backupCurrentIndex();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/\.backup\/index\/\d+/),
        { recursive: true }
      );
    });

    it('should backup current scripts', async () => {
      await pipeline.backupCurrentScripts();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/\.backup\/scripts\/\d+/),
        { recursive: true }
      );
    });

    it('should restore from most recent backup', async () => {
      // Mock readdir to return backup directories
      vi.spyOn(fs, 'readdir').mockResolvedValue(['1234567890', '1234567891', '1234567892']);

      await pipeline.restoreIndexBackup();

      // Should use the most recent backup (highest timestamp)
      expect(fs.readdir).toHaveBeenCalledWith(
        expect.stringMatching(/\.backup\/index\/1234567892/)
      );
    });
  });

  describe('Quality Issue Remediation', () => {
    it('should remediate missing metadata issues', async () => {
      const addMetadataSpy = vi.spyOn(pipeline, 'addMissingMetadata').mockResolvedValue();

      const issues = [
        { type: 'missing-metadata', file: 'test.md' }
      ];

      await pipeline.remediateQualityIssues(issues);

      expect(addMetadataSpy).toHaveBeenCalledWith(issues[0]);
    });

    it('should remediate broken links', async () => {
      const fixLinksSpy = vi.spyOn(pipeline, 'fixBrokenLinks').mockResolvedValue();

      const issues = [
        { type: 'broken-links', link: 'invalid-link.md' }
      ];

      await pipeline.remediateQualityIssues(issues);

      expect(fixLinksSpy).toHaveBeenCalledWith(issues[0]);
    });

    it('should handle unknown issue types gracefully', async () => {
      const issues = [
        { type: 'unknown-issue-type', details: 'some details' }
      ];

      // Should not throw error
      await expect(pipeline.remediateQualityIssues(issues)).resolves.not.toThrow();
    });
  });
});

describe('Pipeline Integration with Qflow', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = new QflowDocumentationPipeline();
  });

  it('should use Qflow evaluation for pipeline execution', async () => {
    const evaluateSpy = vi.spyOn(pipeline.qflowService, 'evaluate');
    
    // Mock successful evaluation
    evaluateSpy.mockResolvedValue({
      verdict: 'ALLOW',
      confidence: 0.95,
      layers: [
        { name: 'Documentation Validation', verdict: 'ALLOW', executionTime: 1000 },
        { name: 'Index Regeneration', verdict: 'ALLOW', executionTime: 2000 }
      ]
    });

    const context = { trigger: 'manual' };
    const result = await pipeline.executePipeline(context);

    expect(evaluateSpy).toHaveBeenCalledWith(
      expect.any(String), // pipeline ID
      expect.objectContaining({
        pipelineType: 'documentation',
        steps: ['validate', 'regenerate-index', 'build-scripts', 'publish-portal']
      })
    );

    expect(result.success).toBe(true);
  });

  it('should register pipeline steps as coherence layers', () => {
    const layers = pipeline.qflowService.getRegisteredLayers();
    const pipelineLayers = layers.filter(layer => layer.id.startsWith('docs-pipeline-'));

    expect(pipelineLayers.length).toBe(4);
    
    const layerNames = pipelineLayers.map(layer => layer.name);
    expect(layerNames).toContain('Documentation Validation');
    expect(layerNames).toContain('Index Regeneration');
    expect(layerNames).toContain('Video Script Generation');
    expect(layerNames).toContain('Portal Publishing');
  });

  it('should handle Qflow evaluation failure', async () => {
    const evaluateSpy = vi.spyOn(pipeline.qflowService, 'evaluate');
    
    // Mock evaluation failure
    evaluateSpy.mockResolvedValue({
      verdict: 'DENY',
      confidence: 0.3,
      layers: [
        { name: 'Documentation Validation', verdict: 'DENY', executionTime: 1000 }
      ]
    });

    const context = { trigger: 'manual' };
    
    await expect(pipeline.executePipeline(context)).rejects.toThrow('Pipeline evaluation failed: DENY');
  });
});