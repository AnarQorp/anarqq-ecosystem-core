/**
 * Qflow Documentation Automation Pipeline
 * Implements automated documentation pipeline: validate → regenerate index → build scripts → publish portal
 * Integrates with existing CI/CD and release management systems
 */

import { QflowService } from './QflowService.mjs';
import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export class QflowDocumentationPipeline {
  constructor() {
    this.qflowService = new QflowService();
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    
    this.pipelineSteps = new Map();
    this.rollbackStack = [];
    this.config = {
      maxRetries: 3,
      retryDelayMs: 5000,
      rollbackOnFailure: true,
      publishToPortal: true,
      notifyOnFailure: true,
      validationTimeout: 300000, // 5 minutes
      indexGenerationTimeout: 180000, // 3 minutes
      scriptGenerationTimeout: 240000, // 4 minutes
      portalPublishTimeout: 120000 // 2 minutes
    };

    this.initializePipelineSteps();
    this.setupEventHandlers();
  }

  /**
   * Initialize pipeline steps with Qflow coherence layers
   */
  initializePipelineSteps() {
    // Step 1: Documentation Validation
    this.pipelineSteps.set('validate', {
      name: 'Documentation Validation',
      priority: 1,
      handler: this.validateDocumentation.bind(this),
      timeout: this.config.validationTimeout,
      rollbackHandler: this.rollbackValidation.bind(this),
      retryPolicy: { maxRetries: 2, backoffMs: 2000 }
    });

    // Step 2: Index Regeneration
    this.pipelineSteps.set('regenerate-index', {
      name: 'Index Regeneration',
      priority: 2,
      handler: this.regenerateIndex.bind(this),
      timeout: this.config.indexGenerationTimeout,
      rollbackHandler: this.rollbackIndexGeneration.bind(this),
      retryPolicy: { maxRetries: 2, backoffMs: 3000 }
    });

    // Step 3: Script Generation
    this.pipelineSteps.set('build-scripts', {
      name: 'Video Script Generation',
      priority: 3,
      handler: this.buildScripts.bind(this),
      timeout: this.config.scriptGenerationTimeout,
      rollbackHandler: this.rollbackScriptGeneration.bind(this),
      retryPolicy: { maxRetries: 1, backoffMs: 5000 }
    });

    // Step 4: Portal Publishing
    this.pipelineSteps.set('publish-portal', {
      name: 'Portal Publishing',
      priority: 4,
      handler: this.publishPortal.bind(this),
      timeout: this.config.portalPublishTimeout,
      rollbackHandler: this.rollbackPortalPublish.bind(this),
      retryPolicy: { maxRetries: 3, backoffMs: 10000 }
    });

    // Register pipeline steps as Qflow coherence layers
    for (const [stepId, step] of this.pipelineSteps.entries()) {
      this.qflowService.registerCoherenceLayer(`docs-pipeline-${stepId}`, {
        name: step.name,
        priority: step.priority,
        handler: step.handler,
        timeout: step.timeout,
        retryPolicy: step.retryPolicy,
        critical: true
      });
    }
  }

  /**
   * Setup event handlers for documentation updates
   */
  setupEventHandlers() {
    // Listen for documentation update events
    this.eventBus.subscribe('q.docs.updated.v1', 
      { squidId: 'qflow-docs-pipeline' },
      this.handleDocumentationUpdate.bind(this)
    );

    // Listen for module release events
    this.eventBus.subscribe('q.*.release.*.v1',
      { squidId: 'qflow-docs-pipeline' },
      this.handleModuleRelease.bind(this)
    );

    // Listen for quality failure events
    this.eventBus.subscribe('q.docs.quality.failed.v1',
      { squidId: 'qflow-docs-pipeline' },
      this.handleQualityFailure.bind(this)
    );
  }

  /**
   * Execute the complete documentation pipeline
   */
  async executePipeline(context = {}) {
    const pipelineId = this.generatePipelineId();
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting documentation pipeline: ${pipelineId}`);
      
      // Emit pipeline start event
      await this.eventBus.publish({
        topic: 'q.docs.pipeline.started.v1',
        payload: {
          pipelineId,
          context,
          steps: Array.from(this.pipelineSteps.keys())
        },
        actor: { squidId: 'qflow-docs-pipeline' }
      });

      // Use Qflow evaluation to execute pipeline steps
      const evaluation = await this.qflowService.evaluate(pipelineId, {
        ...context,
        pipelineType: 'documentation',
        steps: Array.from(this.pipelineSteps.keys())
      });

      const executionTime = Date.now() - startTime;

      if (evaluation.verdict === 'ALLOW') {
        console.log(`✅ Documentation pipeline completed successfully in ${executionTime}ms`);
        
        await this.eventBus.publish({
          topic: 'q.docs.pipeline.completed.v1',
          payload: {
            pipelineId,
            executionTime,
            verdict: evaluation.verdict,
            confidence: evaluation.confidence,
            stepsCompleted: evaluation.layers.length
          },
          actor: { squidId: 'qflow-docs-pipeline' }
        });

        return {
          success: true,
          pipelineId,
          executionTime,
          evaluation
        };
      } else {
        throw new Error(`Pipeline evaluation failed: ${evaluation.verdict}`);
      }

    } catch (error) {
      console.error(`❌ Documentation pipeline failed: ${error.message}`);
      
      if (this.config.rollbackOnFailure) {
        await this.executeRollback(pipelineId);
      }

      await this.eventBus.publish({
        topic: 'q.docs.pipeline.failed.v1',
        payload: {
          pipelineId,
          error: error.message,
          executionTime: Date.now() - startTime
        },
        actor: { squidId: 'qflow-docs-pipeline' }
      });

      throw error;
    }
  }

  /**
   * Step 1: Validate documentation
   */
  async validateDocumentation(context) {
    console.log('📋 Validating documentation...');
    
    try {
      // Run enhanced documentation validator
      const result = execSync('node scripts/docs-validator.mjs', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.validationTimeout
      });

      // Parse validation results
      const validationPassed = !result.includes('❌') && !result.includes('FAILED');
      
      if (!validationPassed) {
        return {
          verdict: 'DENY',
          confidence: 0.9,
          evidence: [{
            type: 'validation-failure',
            details: result,
            timestamp: new Date().toISOString()
          }]
        };
      }

      // Store rollback point
      await this.createRollbackPoint('validation', {
        timestamp: new Date().toISOString(),
        validationResult: result
      });

      return {
        verdict: 'ALLOW',
        confidence: 0.95,
        evidence: [{
          type: 'validation-success',
          details: 'All documentation validation checks passed',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        verdict: 'DENY',
        confidence: 0.8,
        evidence: [{
          type: 'validation-error',
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  /**
   * Step 2: Regenerate documentation index
   */
  async regenerateIndex(context) {
    console.log('🏗️ Regenerating documentation index...');
    
    try {
      // Backup current index
      await this.backupCurrentIndex();

      // Run master index builder
      const result = execSync('node scripts/master-index-builder.mjs', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.indexGenerationTimeout
      });

      const indexGenerated = result.includes('✅') && result.includes('completed');
      
      if (!indexGenerated) {
        return {
          verdict: 'DENY',
          confidence: 0.85,
          evidence: [{
            type: 'index-generation-failure',
            details: result,
            timestamp: new Date().toISOString()
          }]
        };
      }

      // Store rollback point
      await this.createRollbackPoint('index-generation', {
        timestamp: new Date().toISOString(),
        indexResult: result
      });

      return {
        verdict: 'ALLOW',
        confidence: 0.9,
        evidence: [{
          type: 'index-generation-success',
          details: 'Documentation index regenerated successfully',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        verdict: 'DENY',
        confidence: 0.7,
        evidence: [{
          type: 'index-generation-error',
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  /**
   * Step 3: Build video scripts
   */
  async buildScripts(context) {
    console.log('🎬 Building video scripts...');
    
    try {
      // Backup current scripts
      await this.backupCurrentScripts();

      // Run script generator
      const result = execSync('node scripts/ScriptGenerator.mjs --regenerate-all', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.scriptGenerationTimeout
      });

      const scriptsGenerated = result.includes('✅') && result.includes('generated');
      
      if (!scriptsGenerated) {
        return {
          verdict: 'WARN',
          confidence: 0.7,
          evidence: [{
            type: 'script-generation-warning',
            details: result,
            timestamp: new Date().toISOString()
          }]
        };
      }

      // Store rollback point
      await this.createRollbackPoint('script-generation', {
        timestamp: new Date().toISOString(),
        scriptResult: result
      });

      return {
        verdict: 'ALLOW',
        confidence: 0.85,
        evidence: [{
          type: 'script-generation-success',
          details: 'Video scripts generated successfully',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        verdict: 'WARN',
        confidence: 0.6,
        evidence: [{
          type: 'script-generation-error',
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  /**
   * Step 4: Publish to portal
   */
  async publishPortal(context) {
    console.log('🌐 Publishing to documentation portal...');
    
    if (!this.config.publishToPortal) {
      return {
        verdict: 'ALLOW',
        confidence: 1.0,
        evidence: [{
          type: 'portal-publish-skipped',
          details: 'Portal publishing disabled in configuration',
          timestamp: new Date().toISOString()
        }]
      };
    }

    try {
      // Backup current portal state
      await this.backupPortalState();

      // Run portal generator
      const result = execSync('node scripts/portal-generator.mjs --deploy', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.portalPublishTimeout
      });

      const portalPublished = result.includes('✅') && result.includes('deployed');
      
      if (!portalPublished) {
        return {
          verdict: 'DENY',
          confidence: 0.8,
          evidence: [{
            type: 'portal-publish-failure',
            details: result,
            timestamp: new Date().toISOString()
          }]
        };
      }

      // Store rollback point
      await this.createRollbackPoint('portal-publish', {
        timestamp: new Date().toISOString(),
        portalResult: result
      });

      return {
        verdict: 'ALLOW',
        confidence: 0.9,
        evidence: [{
          type: 'portal-publish-success',
          details: 'Documentation portal published successfully',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        verdict: 'DENY',
        confidence: 0.6,
        evidence: [{
          type: 'portal-publish-error',
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  /**
   * Event Handlers
   */
  async handleDocumentationUpdate(event) {
    console.log('📝 Documentation update detected, triggering pipeline...');
    
    try {
      await this.executePipeline({
        trigger: 'documentation-update',
        source: event.source,
        updateType: event.payload.updateType || 'manual',
        files: event.payload.files || []
      });
    } catch (error) {
      console.error('Pipeline execution failed:', error.message);
      
      if (this.config.notifyOnFailure) {
        await this.notifyFailure('documentation-update', error);
      }
    }
  }

  async handleModuleRelease(event) {
    console.log(`🚀 Module release detected: ${event.source}, triggering pipeline...`);
    
    try {
      await this.executePipeline({
        trigger: 'module-release',
        module: event.source,
        version: event.payload.version,
        releaseType: event.payload.type || 'minor'
      });
    } catch (error) {
      console.error('Pipeline execution failed:', error.message);
      
      if (this.config.notifyOnFailure) {
        await this.notifyFailure('module-release', error);
      }
    }
  }

  async handleQualityFailure(event) {
    console.log('⚠️ Documentation quality failure detected, attempting remediation...');
    
    try {
      // Attempt to fix quality issues and re-run pipeline
      await this.remediateQualityIssues(event.payload);
      
      await this.executePipeline({
        trigger: 'quality-remediation',
        issues: event.payload.issues,
        severity: event.payload.severity
      });
    } catch (error) {
      console.error('Quality remediation failed:', error.message);
      
      await this.eventBus.publish({
        topic: 'q.docs.quality.remediation.failed.v1',
        payload: {
          originalIssues: event.payload.issues,
          remediationError: error.message,
          timestamp: new Date().toISOString()
        },
        actor: { squidId: 'qflow-docs-pipeline' }
      });
    }
  }

  /**
   * Rollback Management
   */
  async createRollbackPoint(stepName, data) {
    const rollbackPoint = {
      id: this.generateRollbackId(),
      step: stepName,
      timestamp: new Date().toISOString(),
      data
    };

    this.rollbackStack.push(rollbackPoint);
    
    // Keep only last 10 rollback points
    if (this.rollbackStack.length > 10) {
      this.rollbackStack.shift();
    }

    console.log(`💾 Created rollback point for ${stepName}: ${rollbackPoint.id}`);
  }

  async executeRollback(pipelineId) {
    console.log(`🔄 Executing rollback for pipeline: ${pipelineId}`);
    
    try {
      // Rollback in reverse order
      const rollbackSteps = [...this.rollbackStack].reverse();
      
      for (const rollbackPoint of rollbackSteps) {
        const step = this.pipelineSteps.get(rollbackPoint.step);
        if (step && step.rollbackHandler) {
          console.log(`  ↩️ Rolling back ${rollbackPoint.step}...`);
          await step.rollbackHandler(rollbackPoint.data);
        }
      }

      await this.eventBus.publish({
        topic: 'q.docs.pipeline.rollback.completed.v1',
        payload: {
          pipelineId,
          rollbackSteps: rollbackSteps.length,
          timestamp: new Date().toISOString()
        },
        actor: { squidId: 'qflow-docs-pipeline' }
      });

      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      
      await this.eventBus.publish({
        topic: 'q.docs.pipeline.rollback.failed.v1',
        payload: {
          pipelineId,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        actor: { squidId: 'qflow-docs-pipeline' }
      });
    }
  }

  /**
   * Rollback Handlers
   */
  async rollbackValidation(data) {
    // Validation rollback - typically no action needed
    console.log('  ↩️ Validation rollback: No action required');
  }

  async rollbackIndexGeneration(data) {
    try {
      // Restore previous index files
      await this.restoreIndexBackup();
      console.log('  ↩️ Index generation rollback completed');
    } catch (error) {
      console.error('  ❌ Index rollback failed:', error.message);
    }
  }

  async rollbackScriptGeneration(data) {
    try {
      // Restore previous script files
      await this.restoreScriptsBackup();
      console.log('  ↩️ Script generation rollback completed');
    } catch (error) {
      console.error('  ❌ Scripts rollback failed:', error.message);
    }
  }

  async rollbackPortalPublish(data) {
    try {
      // Restore previous portal state
      await this.restorePortalBackup();
      console.log('  ↩️ Portal publish rollback completed');
    } catch (error) {
      console.error('  ❌ Portal rollback failed:', error.message);
    }
  }

  /**
   * Backup and Restore Utilities
   */
  async backupCurrentIndex() {
    const backupDir = path.join(process.cwd(), '.backup', 'index', Date.now().toString());
    await fs.mkdir(backupDir, { recursive: true });
    
    const indexFiles = ['docs/README.md', 'docs/INDEX.md'];
    for (const file of indexFiles) {
      try {
        await fs.copyFile(file, path.join(backupDir, path.basename(file)));
      } catch (error) {
        // File might not exist
      }
    }
  }

  async backupCurrentScripts() {
    const backupDir = path.join(process.cwd(), '.backup', 'scripts', Date.now().toString());
    await fs.mkdir(backupDir, { recursive: true });
    
    try {
      const scriptsDir = 'docs/video-scripts';
      await this.copyDirectory(scriptsDir, path.join(backupDir, 'video-scripts'));
    } catch (error) {
      // Scripts directory might not exist
    }
  }

  async backupPortalState() {
    const backupDir = path.join(process.cwd(), '.backup', 'portal', Date.now().toString());
    await fs.mkdir(backupDir, { recursive: true });
    
    // Backup portal configuration and state
    const portalFiles = ['portal-config.json', 'portal-state.json'];
    for (const file of portalFiles) {
      try {
        await fs.copyFile(file, path.join(backupDir, file));
      } catch (error) {
        // File might not exist
      }
    }
  }

  async restoreIndexBackup() {
    // Restore from most recent backup
    const backupBase = path.join(process.cwd(), '.backup', 'index');
    const backups = await fs.readdir(backupBase);
    const latestBackup = backups.sort().pop();
    
    if (latestBackup) {
      const backupDir = path.join(backupBase, latestBackup);
      const indexFiles = await fs.readdir(backupDir);
      
      for (const file of indexFiles) {
        await fs.copyFile(
          path.join(backupDir, file),
          path.join('docs', file)
        );
      }
    }
  }

  async restoreScriptsBackup() {
    // Restore from most recent backup
    const backupBase = path.join(process.cwd(), '.backup', 'scripts');
    const backups = await fs.readdir(backupBase);
    const latestBackup = backups.sort().pop();
    
    if (latestBackup) {
      const backupDir = path.join(backupBase, latestBackup, 'video-scripts');
      await this.copyDirectory(backupDir, 'docs/video-scripts');
    }
  }

  async restorePortalBackup() {
    // Restore from most recent backup
    const backupBase = path.join(process.cwd(), '.backup', 'portal');
    const backups = await fs.readdir(backupBase);
    const latestBackup = backups.sort().pop();
    
    if (latestBackup) {
      const backupDir = path.join(backupBase, latestBackup);
      const portalFiles = await fs.readdir(backupDir);
      
      for (const file of portalFiles) {
        await fs.copyFile(
          path.join(backupDir, file),
          file
        );
      }
    }
  }

  /**
   * Utility Methods
   */
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async remediateQualityIssues(issues) {
    console.log('🔧 Attempting to remediate quality issues...');
    
    // Basic remediation strategies
    for (const issue of issues) {
      switch (issue.type) {
        case 'missing-metadata':
          await this.addMissingMetadata(issue);
          break;
        case 'broken-links':
          await this.fixBrokenLinks(issue);
          break;
        case 'missing-alt-text':
          await this.addMissingAltText(issue);
          break;
        default:
          console.log(`  ⚠️ No remediation strategy for issue type: ${issue.type}`);
      }
    }
  }

  async addMissingMetadata(issue) {
    // Add basic metadata to files missing it
    const defaultMetadata = {
      version: '1.0.0',
      author: 'Q Ecosystem Team',
      lastModified: new Date().toISOString(),
      ecosystemVersion: 'v2.0.0'
    };
    
    // Implementation would add metadata to specific files
    console.log(`  🔧 Adding metadata to ${issue.file}`);
  }

  async fixBrokenLinks(issue) {
    // Attempt to fix common broken link patterns
    console.log(`  🔧 Attempting to fix broken link: ${issue.link}`);
  }

  async addMissingAltText(issue) {
    // Add generic alt text for images missing it
    console.log(`  🔧 Adding alt text for image: ${issue.image}`);
  }

  async notifyFailure(trigger, error) {
    await this.eventBus.publish({
      topic: 'q.docs.pipeline.notification.v1',
      payload: {
        type: 'failure',
        trigger,
        error: error.message,
        timestamp: new Date().toISOString(),
        severity: 'high'
      },
      actor: { squidId: 'qflow-docs-pipeline' }
    });
  }

  generatePipelineId() {
    return `docs-pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRollbackId() {
    return `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Configuration Management
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Pipeline configuration updated');
  }

  getConfig() {
    return { ...this.config };
  }

  /**
   * Pipeline Status and Metrics
   */
  getPipelineStatus() {
    return {
      steps: Array.from(this.pipelineSteps.keys()),
      rollbackPoints: this.rollbackStack.length,
      config: this.config,
      lastExecution: this.lastExecution || null
    };
  }

  getMetrics() {
    return {
      totalExecutions: this.totalExecutions || 0,
      successfulExecutions: this.successfulExecutions || 0,
      failedExecutions: this.failedExecutions || 0,
      averageExecutionTime: this.averageExecutionTime || 0,
      rollbacksExecuted: this.rollbacksExecuted || 0
    };
  }
}

export default QflowDocumentationPipeline;