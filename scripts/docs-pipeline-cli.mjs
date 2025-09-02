#!/usr/bin/env node

/**
 * Documentation Pipeline CLI
 * Command-line interface for managing the Qflow documentation automation pipeline
 */

import { QflowDocumentationPipeline } from '../backend/services/QflowDocumentationPipeline.mjs';
import { EventBusService } from '../backend/services/EventBusService.mjs';
import fs from 'fs/promises';
import path from 'path';

class DocumentationPipelineCLI {
  constructor() {
    this.pipeline = new QflowDocumentationPipeline();
    this.eventBus = new EventBusService();
  }

  async init() {
    // Initialize pipeline
    console.log('🔧 Initializing documentation pipeline...');
  }

  async executeCommand(command, args) {
    switch (command) {
      case 'execute':
        return await this.executePipeline(args);
      case 'status':
        return await this.showStatus(args);
      case 'config':
        return await this.manageConfig(args);
      case 'rollback':
        return await this.executeRollback(args);
      case 'validate':
        return await this.validateOnly(args);
      case 'index':
        return await this.regenerateIndexOnly(args);
      case 'scripts':
        return await this.buildScriptsOnly(args);
      case 'portal':
        return await this.publishPortalOnly(args);
      case 'watch':
        return await this.watchForChanges(args);
      case 'metrics':
        return await this.showMetrics(args);
      case 'health':
        return await this.checkHealth(args);
      default:
        this.showHelp();
        return false;
    }
  }

  async executePipeline(args) {
    console.log('🚀 Executing documentation pipeline...');
    
    const trigger = args.trigger || 'manual';
    const context = {
      trigger,
      source: 'cli',
      initiatedBy: process.env.USER || 'cli-user',
      timestamp: new Date().toISOString()
    };

    // Add context from arguments
    if (args.module) context.module = args.module;
    if (args.version) context.version = args.version;
    if (args.files) context.files = args.files.split(',');
    if (args.priority) context.priority = args.priority;

    try {
      const result = await this.pipeline.executePipeline(context);
      
      console.log('✅ Pipeline execution completed successfully!');
      console.log(`   Pipeline ID: ${result.pipelineId}`);
      console.log(`   Execution Time: ${result.executionTime}ms`);
      console.log(`   Verdict: ${result.evaluation.verdict}`);
      console.log(`   Confidence: ${(result.evaluation.confidence * 100).toFixed(1)}%`);
      
      if (result.evaluation.layers) {
        console.log('\n📋 Step Results:');
        result.evaluation.layers.forEach(layer => {
          const status = layer.verdict === 'ALLOW' ? '✅' : 
                        layer.verdict === 'WARN' ? '⚠️' : '❌';
          console.log(`   ${status} ${layer.name}: ${layer.verdict} (${layer.executionTime}ms)`);
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Pipeline execution failed:', error.message);
      return false;
    }
  }

  async showStatus(args) {
    console.log('📊 Documentation Pipeline Status\n');
    
    const status = this.pipeline.getPipelineStatus();
    const metrics = this.pipeline.getMetrics();

    console.log('🔧 Configuration:');
    console.log(`   Max Retries: ${status.config.maxRetries}`);
    console.log(`   Rollback on Failure: ${status.config.rollbackOnFailure ? 'Yes' : 'No'}`);
    console.log(`   Publish to Portal: ${status.config.publishToPortal ? 'Yes' : 'No'}`);
    console.log(`   Notify on Failure: ${status.config.notifyOnFailure ? 'Yes' : 'No'}`);

    console.log('\n📋 Pipeline Steps:');
    status.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });

    console.log('\n📈 Metrics:');
    console.log(`   Total Executions: ${metrics.totalExecutions || 0}`);
    console.log(`   Successful: ${metrics.successfulExecutions || 0}`);
    console.log(`   Failed: ${metrics.failedExecutions || 0}`);
    console.log(`   Success Rate: ${metrics.totalExecutions ? 
      ((metrics.successfulExecutions || 0) / metrics.totalExecutions * 100).toFixed(1) : 0}%`);
    console.log(`   Average Execution Time: ${metrics.averageExecutionTime || 0}ms`);
    console.log(`   Rollback Points: ${status.rollbackPoints}`);

    if (status.lastExecution) {
      console.log('\n🕒 Last Execution:');
      console.log(`   Time: ${new Date(status.lastExecution.timestamp).toLocaleString()}`);
      console.log(`   Status: ${status.lastExecution.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`   Duration: ${status.lastExecution.duration}ms`);
    }

    return true;
  }

  async manageConfig(args) {
    if (args.get) {
      console.log('⚙️ Current Pipeline Configuration:\n');
      const config = this.pipeline.getConfig();
      
      Object.entries(config).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      return true;
    }

    if (args.set) {
      console.log('⚙️ Updating pipeline configuration...');
      
      const updates = {};
      const configPairs = args.set.split(',');
      
      for (const pair of configPairs) {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) {
          // Parse value based on type
          if (value === 'true' || value === 'false') {
            updates[key] = value === 'true';
          } else if (!isNaN(value)) {
            updates[key] = parseInt(value);
          } else {
            updates[key] = value;
          }
        }
      }

      this.pipeline.updateConfig(updates);
      console.log('✅ Configuration updated successfully');
      
      // Show updated config
      console.log('\n📋 Updated Configuration:');
      Object.entries(updates).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      return true;
    }

    console.log('❌ Please specify --get to view config or --set key=value,key2=value2 to update');
    return false;
  }

  async executeRollback(args) {
    if (!args.pipelineId) {
      console.log('❌ Please specify --pipeline-id for rollback');
      return false;
    }

    console.log(`🔄 Executing rollback for pipeline: ${args.pipelineId}`);
    
    try {
      await this.pipeline.executeRollback(args.pipelineId);
      console.log('✅ Rollback completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }

  async validateOnly(args) {
    console.log('📋 Running documentation validation...');
    
    try {
      const context = {
        validationOnly: true,
        source: 'cli',
        initiatedBy: process.env.USER || 'cli-user'
      };

      const result = await this.pipeline.validateDocumentation(context);
      
      if (result.verdict === 'ALLOW') {
        console.log('✅ Documentation validation passed');
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Documentation validation failed');
        console.log(`   Verdict: ${result.verdict}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        
        if (result.evidence) {
          console.log('\n📋 Issues Found:');
          result.evidence.forEach(evidence => {
            console.log(`   - ${evidence.type}: ${evidence.details || evidence.error}`);
          });
        }
      }
      
      return result.verdict === 'ALLOW';
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async regenerateIndexOnly(args) {
    console.log('🏗️ Regenerating documentation index...');
    
    try {
      const context = {
        indexOnly: true,
        source: 'cli',
        initiatedBy: process.env.USER || 'cli-user'
      };

      const result = await this.pipeline.regenerateIndex(context);
      
      if (result.verdict === 'ALLOW') {
        console.log('✅ Index regeneration completed successfully');
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Index regeneration failed');
        console.log(`   Verdict: ${result.verdict}`);
        
        if (result.evidence) {
          console.log('\n📋 Issues:');
          result.evidence.forEach(evidence => {
            console.log(`   - ${evidence.type}: ${evidence.details || evidence.error}`);
          });
        }
      }
      
      return result.verdict === 'ALLOW';
    } catch (error) {
      console.error('❌ Index regeneration failed:', error.message);
      return false;
    }
  }

  async buildScriptsOnly(args) {
    console.log('🎬 Building video scripts...');
    
    try {
      const context = {
        scriptsOnly: true,
        source: 'cli',
        initiatedBy: process.env.USER || 'cli-user'
      };

      const result = await this.pipeline.buildScripts(context);
      
      if (result.verdict === 'ALLOW' || result.verdict === 'WARN') {
        console.log('✅ Script generation completed');
        console.log(`   Verdict: ${result.verdict}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Script generation failed');
        
        if (result.evidence) {
          console.log('\n📋 Issues:');
          result.evidence.forEach(evidence => {
            console.log(`   - ${evidence.type}: ${evidence.details || evidence.error}`);
          });
        }
      }
      
      return result.verdict !== 'DENY';
    } catch (error) {
      console.error('❌ Script generation failed:', error.message);
      return false;
    }
  }

  async publishPortalOnly(args) {
    console.log('🌐 Publishing documentation portal...');
    
    try {
      const context = {
        portalOnly: true,
        source: 'cli',
        initiatedBy: process.env.USER || 'cli-user'
      };

      const result = await this.pipeline.publishPortal(context);
      
      if (result.verdict === 'ALLOW') {
        console.log('✅ Portal publishing completed successfully');
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Portal publishing failed');
        console.log(`   Verdict: ${result.verdict}`);
        
        if (result.evidence) {
          console.log('\n📋 Issues:');
          result.evidence.forEach(evidence => {
            console.log(`   - ${evidence.type}: ${evidence.details || evidence.error}`);
          });
        }
      }
      
      return result.verdict === 'ALLOW';
    } catch (error) {
      console.error('❌ Portal publishing failed:', error.message);
      return false;
    }
  }

  async watchForChanges(args) {
    console.log('👀 Watching for documentation changes...');
    console.log('   Press Ctrl+C to stop watching\n');

    // Subscribe to documentation update events
    this.eventBus.subscribe('q.docs.updated.v1',
      { squidId: 'docs-pipeline-cli' },
      async (event) => {
        console.log(`📝 Documentation update detected: ${event.payload.updateType}`);
        console.log(`   Files: ${event.payload.files?.length || 0} files changed`);
        console.log(`   Modules: ${event.payload.modules?.join(', ') || 'none'}`);
        
        if (event.payload.triggerPipeline !== false) {
          console.log('   🚀 Triggering pipeline...');
          
          try {
            await this.pipeline.executePipeline({
              trigger: 'documentation-update',
              source: 'cli-watch',
              ...event.payload
            });
            console.log('   ✅ Pipeline completed successfully\n');
          } catch (error) {
            console.log(`   ❌ Pipeline failed: ${error.message}\n`);
          }
        }
      }
    );

    // Subscribe to pipeline events for real-time updates
    this.eventBus.subscribe('q.docs.pipeline.*.v1',
      { squidId: 'docs-pipeline-cli' },
      (event) => {
        const eventType = event.topic.split('.')[2];
        switch (eventType) {
          case 'started':
            console.log(`🚀 Pipeline started: ${event.payload.pipelineId}`);
            break;
          case 'completed':
            console.log(`✅ Pipeline completed: ${event.payload.pipelineId} (${event.payload.executionTime}ms)`);
            break;
          case 'failed':
            console.log(`❌ Pipeline failed: ${event.payload.pipelineId} - ${event.payload.error}`);
            break;
        }
      }
    );

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping documentation watcher...');
      process.exit(0);
    });

    // Simulate watching (in a real implementation, this would use file system watchers)
    return new Promise(() => {}); // Keep running indefinitely
  }

  async showMetrics(args) {
    console.log('📈 Documentation Pipeline Metrics\n');
    
    const metrics = this.pipeline.getMetrics();
    const status = this.pipeline.getPipelineStatus();

    console.log('🔢 Execution Statistics:');
    console.log(`   Total Executions: ${metrics.totalExecutions || 0}`);
    console.log(`   Successful Executions: ${metrics.successfulExecutions || 0}`);
    console.log(`   Failed Executions: ${metrics.failedExecutions || 0}`);
    console.log(`   Success Rate: ${metrics.totalExecutions ? 
      ((metrics.successfulExecutions || 0) / metrics.totalExecutions * 100).toFixed(1) : 0}%`);
    console.log(`   Average Execution Time: ${metrics.averageExecutionTime || 0}ms`);
    console.log(`   Rollbacks Executed: ${metrics.rollbacksExecuted || 0}`);

    console.log('\n⚙️ System Metrics:');
    console.log(`   Rollback Points Available: ${status.rollbackPoints}`);
    console.log(`   Pipeline Steps: ${status.steps.length}`);
    console.log(`   Uptime: ${Math.floor(process.uptime())} seconds`);
    
    const memUsage = process.memoryUsage();
    console.log(`   Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

    if (args.detailed) {
      console.log('\n🔧 Configuration:');
      Object.entries(status.config).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    return true;
  }

  async checkHealth(args) {
    console.log('🏥 Documentation Pipeline Health Check\n');
    
    try {
      const status = this.pipeline.getPipelineStatus();
      const isHealthy = status.steps.length > 0 && status.config;

      if (isHealthy) {
        console.log('✅ Pipeline is healthy');
        console.log(`   Steps configured: ${status.steps.length}`);
        console.log(`   Rollback points: ${status.rollbackPoints}`);
        console.log(`   Configuration: Valid`);
      } else {
        console.log('❌ Pipeline is not healthy');
        console.log(`   Steps configured: ${status.steps.length}`);
        console.log(`   Configuration: ${status.config ? 'Valid' : 'Invalid'}`);
      }

      // Test basic functionality
      console.log('\n🧪 Testing basic functionality...');
      
      try {
        const testResult = await this.pipeline.validateDocumentation({
          healthCheck: true,
          source: 'cli-health-check'
        });
        console.log(`   Validation test: ${testResult.verdict === 'ALLOW' ? '✅ Pass' : '❌ Fail'}`);
      } catch (error) {
        console.log(`   Validation test: ❌ Fail (${error.message})`);
      }

      return isHealthy;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  showHelp() {
    console.log(`
📚 Documentation Pipeline CLI

Usage: node docs-pipeline-cli.mjs <command> [options]

Commands:
  execute     Execute the complete documentation pipeline
  status      Show pipeline status and metrics
  config      Manage pipeline configuration
  rollback    Execute rollback for a pipeline execution
  validate    Run documentation validation only
  index       Regenerate documentation index only
  scripts     Build video scripts only
  portal      Publish documentation portal only
  watch       Watch for changes and auto-trigger pipeline
  metrics     Show detailed pipeline metrics
  health      Check pipeline health status

Options:
  --trigger <type>        Trigger type for execution (manual, documentation-update, module-release)
  --module <name>         Module name for module-specific operations
  --version <version>     Version for release-triggered operations
  --files <files>         Comma-separated list of files (for file-based triggers)
  --priority <level>      Priority level (low, medium, high, critical)
  --pipeline-id <id>      Pipeline ID for rollback operations
  --get                   Get current configuration
  --set <key=value>       Set configuration values (comma-separated)
  --detailed              Show detailed information

Examples:
  # Execute pipeline manually
  node docs-pipeline-cli.mjs execute --trigger manual

  # Execute pipeline for module release
  node docs-pipeline-cli.mjs execute --trigger module-release --module qwallet --version 2.1.0

  # Validate documentation only
  node docs-pipeline-cli.mjs validate

  # Update configuration
  node docs-pipeline-cli.mjs config --set maxRetries=5,rollbackOnFailure=true

  # Show detailed metrics
  node docs-pipeline-cli.mjs metrics --detailed

  # Watch for changes
  node docs-pipeline-cli.mjs watch

  # Check health
  node docs-pipeline-cli.mjs health
`);
  }
}

// CLI execution
async function main() {
  const cli = new DocumentationPipelineCLI();
  await cli.init();

  const args = {};
  const command = process.argv[2];

  // Parse command line arguments
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = process.argv[i + 1];
      
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++; // Skip the value in next iteration
      } else {
        args[key] = true; // Flag without value
      }
    }
  }

  if (!command) {
    cli.showHelp();
    process.exit(1);
  }

  try {
    const success = await cli.executeCommand(command, args);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ CLI execution failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ CLI failed:', error);
    process.exit(1);
  });
}

export default DocumentationPipelineCLI;