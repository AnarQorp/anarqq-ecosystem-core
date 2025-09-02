/**
 * Migration CLI Tool
 * 
 * Command-line interface for migrating n8n workflows to Qflow
 * Provides import, validation, and testing capabilities
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { N8nWorkflowImporter, MigrationOptions, MigrationResult } from './N8nWorkflowImporter';
import { CompatibilityLayer, CompatibilityConfig } from './CompatibilityLayer';
import { MigrationValidator, ValidationConfig, ValidationReport } from './MigrationValidator';
import { FlowDefinition } from '../models/FlowDefinition';

export interface CLIOptions {
  input?: string;
  output?: string;
  config?: string;
  validate?: boolean;
  test?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  format?: 'json' | 'yaml';
  owner?: string;
  daoSubnet?: string;
}

export interface MigrationConfig {
  migration: MigrationOptions;
  compatibility: CompatibilityConfig;
  validation: ValidationConfig;
}

/**
 * CLI tool for n8n to Qflow migration
 */
export class MigrationCLI {
  private program: Command;
  private importer: N8nWorkflowImporter;
  private compatibilityLayer: CompatibilityLayer;
  private validator: MigrationValidator;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('qflow-migrate')
      .description('Migrate n8n workflows to Qflow')
      .version('1.0.0');

    // Import command
    this.program
      .command('import')
      .description('Import n8n workflow file')
      .argument('<input>', 'Path to n8n workflow JSON file')
      .option('-o, --output <path>', 'Output path for migrated flow')
      .option('-c, --config <path>', 'Path to migration config file')
      .option('--owner <identity>', 'sQuid identity of flow owner')
      .option('--dao-subnet <subnet>', 'DAO subnet for the flow')
      .option('--format <format>', 'Output format (json|yaml)', 'json')
      .option('--validate', 'Run validation after import')
      .option('--test', 'Generate and run test cases')
      .option('--dry-run', 'Show what would be imported without saving')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleImport.bind(this));

    // Validate command
    this.program
      .command('validate')
      .description('Validate migrated workflow')
      .argument('<flow>', 'Path to Qflow definition file')
      .option('-n, --n8n <path>', 'Path to original n8n workflow for comparison')
      .option('-c, --config <path>', 'Path to validation config file')
      .option('-o, --output <path>', 'Output path for validation report')
      .option('--format <format>', 'Report format (json|html)', 'json')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleValidate.bind(this));

    // Test command
    this.program
      .command('test')
      .description('Test migrated workflow')
      .argument('<flow>', 'Path to Qflow definition file')
      .option('-t, --test-suite <path>', 'Path to test suite file')
      .option('-o, --output <path>', 'Output path for test results')
      .option('--timeout <ms>', 'Test timeout in milliseconds', '30000')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleTest.bind(this));

    // Batch import command
    this.program
      .command('batch')
      .description('Batch import multiple n8n workflows')
      .argument('<directory>', 'Directory containing n8n workflow files')
      .option('-o, --output <path>', 'Output directory for migrated flows')
      .option('-c, --config <path>', 'Path to migration config file')
      .option('--pattern <pattern>', 'File pattern to match', '*.json')
      .option('--validate', 'Run validation on all imports')
      .option('--continue-on-error', 'Continue processing on errors')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleBatch.bind(this));

    // Generate config command
    this.program
      .command('init-config')
      .description('Generate default migration configuration')
      .option('-o, --output <path>', 'Output path for config file', 'migration-config.json')
      .action(this.handleInitConfig.bind(this));

    // Compatibility check command
    this.program
      .command('check-compatibility')
      .description('Check n8n workflow compatibility')
      .argument('<input>', 'Path to n8n workflow JSON file')
      .option('-o, --output <path>', 'Output path for compatibility report')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleCompatibilityCheck.bind(this));

    // Visual designer command
    this.program
      .command('designer')
      .description('Launch visual flow designer')
      .option('-p, --port <port>', 'Port for designer server', '3000')
      .option('--host <host>', 'Host for designer server', 'localhost')
      .option('-o, --open', 'Open browser automatically')
      .action(this.handleDesigner.bind(this));
  }

  /**
   * Handle import command
   */
  private async handleImport(input: string, options: CLIOptions): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Importing n8n workflow from: ${input}`);
      }

      // Load configuration
      const config = await this.loadConfig(options.config);
      
      // Initialize importer
      const migrationOptions: MigrationOptions = {
        ...config.migration,
        owner: options.owner || config.migration.owner,
        daoSubnet: options.daoSubnet || config.migration.daoSubnet,
        generateTestCases: options.test || config.migration.generateTestCases
      };

      this.importer = new N8nWorkflowImporter(migrationOptions);

      // Import workflow
      const result = await this.importer.importFromFile(input);

      if (!result.success) {
        console.error('Migration failed:');
        result.errors.forEach(error => {
          console.error(`  - ${error.message}`);
        });
        process.exit(1);
      }

      // Display warnings
      if (result.warnings.length > 0) {
        console.warn('Migration warnings:');
        result.warnings.forEach(warning => {
          console.warn(`  - ${warning.message}`);
          if (warning.suggestion) {
            console.warn(`    Suggestion: ${warning.suggestion}`);
          }
        });
      }

      // Display compatibility notes
      if (result.compatibilityNotes.length > 0) {
        console.log('\nCompatibility Notes:');
        result.compatibilityNotes.forEach(note => {
          console.log(`  - ${note}`);
        });
      }

      if (options.dryRun) {
        console.log('\nDry run - would create flow:');
        console.log(JSON.stringify(result.flowDefinition, null, 2));
        return;
      }

      // Save migrated flow
      const outputPath = options.output || this.generateOutputPath(input, options.format);
      await this.saveFlow(result.flowDefinition!, outputPath, options.format);

      console.log(`\nMigrated flow saved to: ${outputPath}`);

      // Run validation if requested
      if (options.validate && result.flowDefinition) {
        console.log('\nRunning validation...');
        await this.runValidation(result.flowDefinition, input, config.validation);
      }

      // Run tests if requested
      if (options.test && result.testCases) {
        console.log('\nRunning tests...');
        await this.runTests(result.flowDefinition!, result.testCases);
      }

    } catch (error) {
      console.error(`Import failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Handle validate command
   */
  private async handleValidate(flowPath: string, options: any): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Validating flow: ${flowPath}`);
      }

      // Load flow definition
      const flowContent = await fs.readFile(flowPath, 'utf-8');
      const flow: FlowDefinition = JSON.parse(flowContent);

      // Load original n8n workflow if provided
      let originalWorkflow = null;
      if (options.n8n) {
        const n8nContent = await fs.readFile(options.n8n, 'utf-8');
        originalWorkflow = JSON.parse(n8nContent);
      }

      // Load configuration
      const config = await this.loadConfig(options.config);

      // Initialize validator
      this.compatibilityLayer = new CompatibilityLayer(config.compatibility);
      this.validator = new MigrationValidator(config.validation, this.compatibilityLayer);

      // Run validation
      const migrationResult = { success: true, warnings: [], errors: [], compatibilityNotes: [] };
      const report = await this.validator.validateMigration(originalWorkflow, flow, migrationResult);

      // Display results
      this.displayValidationReport(report, options.verbose);

      // Save report if requested
      if (options.output) {
        await this.saveValidationReport(report, options.output, options.format);
        console.log(`\nValidation report saved to: ${options.output}`);
      }

      // Exit with error code if validation failed
      if (!report.overall.passed) {
        process.exit(1);
      }

    } catch (error) {
      console.error(`Validation failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Handle test command
   */
  private async handleTest(flowPath: string, options: any): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Testing flow: ${flowPath}`);
      }

      // Load flow definition
      const flowContent = await fs.readFile(flowPath, 'utf-8');
      const flow: FlowDefinition = JSON.parse(flowContent);

      // Load test suite
      let testCases = [];
      if (options.testSuite) {
        const testContent = await fs.readFile(options.testSuite, 'utf-8');
        const testSuite = JSON.parse(testContent);
        testCases = testSuite.testCases || [];
      } else {
        // Generate basic test cases
        testCases = this.generateBasicTestCases(flow);
      }

      // Initialize validator for test execution
      const config = await this.loadConfig();
      config.validation.timeoutMs = parseInt(options.timeout);
      
      this.validator = new MigrationValidator(config.validation);

      // Run tests
      const testResults = await this.validator['executeTestCases'](flow, testCases);

      // Display results
      this.displayTestResults(testResults, options.verbose);

      // Save results if requested
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(testResults, null, 2));
        console.log(`\nTest results saved to: ${options.output}`);
      }

      // Exit with error code if tests failed
      const failedTests = testResults.filter(r => !r.passed).length;
      if (failedTests > 0) {
        console.error(`\n${failedTests} test(s) failed`);
        process.exit(1);
      }

    } catch (error) {
      console.error(`Testing failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Handle batch import command
   */
  private async handleBatch(directory: string, options: any): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Batch importing from directory: ${directory}`);
      }

      // Find workflow files
      const files = await this.findWorkflowFiles(directory, options.pattern);
      console.log(`Found ${files.length} workflow files`);

      // Load configuration
      const config = await this.loadConfig(options.config);

      // Process each file
      const results = [];
      for (const file of files) {
        try {
          console.log(`\nProcessing: ${file}`);
          
          const result = await this.processWorkflowFile(file, options.output, config);
          results.push({ file, success: true, result });

          if (options.validate) {
            await this.runValidation(result.flowDefinition!, file, config.validation);
          }

        } catch (error) {
          console.error(`  Failed: ${error.message}`);
          results.push({ file, success: false, error: error.message });

          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`\nBatch import completed:`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Failed: ${failed}`);

      if (failed > 0) {
        console.log('\nFailed files:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  - ${r.file}: ${r.error}`);
        });
      }

    } catch (error) {
      console.error(`Batch import failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Handle init config command
   */
  private async handleInitConfig(options: any): Promise<void> {
    try {
      const defaultConfig: MigrationConfig = {
        migration: {
          preserveNodeIds: false,
          validateCredentials: true,
          createCompatibilityLayer: true,
          generateTestCases: false,
          daoSubnet: undefined,
          owner: undefined
        },
        compatibility: {
          enableN8nApiEmulation: true,
          enableLegacyWebhooks: true,
          enableCredentialMapping: true,
          enableDataFormatTranslation: true,
          strictMode: false
        },
        validation: {
          enableStructuralValidation: true,
          enableSemanticValidation: true,
          enablePerformanceValidation: true,
          enableSecurityValidation: true,
          enableCompatibilityValidation: true,
          strictMode: false,
          timeoutMs: 30000
        }
      };

      await fs.writeFile(options.output, JSON.stringify(defaultConfig, null, 2));
      console.log(`Default configuration saved to: ${options.output}`);

    } catch (error) {
      console.error(`Failed to create config: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle compatibility check command
   */
  private async handleCompatibilityCheck(input: string, options: any): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Checking compatibility for: ${input}`);
      }

      // Load n8n workflow
      const workflowContent = await fs.readFile(input, 'utf-8');
      const workflow = JSON.parse(workflowContent);

      // Analyze compatibility
      const report = this.analyzeCompatibility(workflow);

      // Display results
      console.log('\nCompatibility Analysis:');
      console.log(`  Overall Score: ${report.score}/100`);
      console.log(`  Supported Nodes: ${report.supportedNodes}/${report.totalNodes}`);
      console.log(`  Unsupported Features: ${report.unsupportedFeatures.length}`);

      if (report.unsupportedFeatures.length > 0) {
        console.log('\nUnsupported Features:');
        report.unsupportedFeatures.forEach(feature => {
          console.log(`  - ${feature}`);
        });
      }

      if (report.warnings.length > 0) {
        console.log('\nWarnings:');
        report.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }

      // Save report if requested
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(report, null, 2));
        console.log(`\nCompatibility report saved to: ${options.output}`);
      }

    } catch (error) {
      console.error(`Compatibility check failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Handle designer command
   */
  private async handleDesigner(options: any): Promise<void> {
    try {
      console.log(`Starting Qflow Visual Designer on ${options.host}:${options.port}`);
      
      // Import express dynamically
      const express = await import('express');
      const app = express.default();
      
      // Serve static files
      const staticPath = path.join(__dirname, '..', 'static');
      app.use(express.static(staticPath));
      
      // API endpoints for the designer
      app.use(express.json({ limit: '10mb' }));
      
      // Import n8n workflow endpoint
      app.post('/api/import-n8n', async (req, res) => {
        try {
          const { workflowJson, options: importOptions } = req.body;
          
          const migrationOptions: MigrationOptions = {
            preserveNodeIds: false,
            validateCredentials: true,
            createCompatibilityLayer: true,
            generateTestCases: false,
            ...importOptions
          };
          
          const importer = new N8nWorkflowImporter(migrationOptions);
          const result = await importer.importFromJson(workflowJson);
          
          res.json(result);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Save to IPFS endpoint (mock implementation)
      app.post('/api/save-to-ipfs', async (req, res) => {
        try {
          const { flowDefinition } = req.body;
          
          // Mock IPFS save - in real implementation, this would use IPFS client
          const mockCID = 'Qm' + Math.random().toString(36).substring(2, 15);
          
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          res.json({ 
            success: true, 
            cid: mockCID,
            message: 'Flow saved to IPFS successfully'
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Validate flow endpoint
      app.post('/api/validate-flow', async (req, res) => {
        try {
          const { flowDefinition } = req.body;
          
          // Basic validation
          const issues = [];
          
          if (!flowDefinition.name) {
            issues.push({ severity: 'error', message: 'Flow name is required' });
          }
          
          if (!flowDefinition.steps || flowDefinition.steps.length === 0) {
            issues.push({ severity: 'error', message: 'Flow must have at least one step' });
          }
          
          if (!flowDefinition.owner) {
            issues.push({ severity: 'error', message: 'Flow owner is required' });
          }
          
          res.json({
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Default route serves the designer
      app.get('/', (req, res) => {
        res.sendFile(path.join(staticPath, 'flow-designer.html'));
      });
      
      // Start server
      const server = app.listen(parseInt(options.port), options.host, () => {
        const url = `http://${options.host}:${options.port}`;
        console.log(`Qflow Visual Designer running at ${url}`);
        console.log('Press Ctrl+C to stop');
        
        if (options.open) {
          this.openBrowser(url);
        }
      });
      
      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nShutting down designer server...');
        server.close(() => {
          console.log('Server stopped');
          process.exit(0);
        });
      });
      
    } catch (error) {
      console.error(`Failed to start designer: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Open browser to the designer URL
   */
  private openBrowser(url: string): void {
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open';
    
    require('child_process').exec(`${start} ${url}`);
  }

  /**
   * Helper methods
   */
  private async loadConfig(configPath?: string): Promise<MigrationConfig> {
    const defaultConfig: MigrationConfig = {
      migration: {
        preserveNodeIds: false,
        validateCredentials: true,
        createCompatibilityLayer: true,
        generateTestCases: false
      },
      compatibility: {
        enableN8nApiEmulation: true,
        enableLegacyWebhooks: true,
        enableCredentialMapping: true,
        enableDataFormatTranslation: true,
        strictMode: false
      },
      validation: {
        enableStructuralValidation: true,
        enableSemanticValidation: true,
        enablePerformanceValidation: true,
        enableSecurityValidation: true,
        enableCompatibilityValidation: true,
        strictMode: false,
        timeoutMs: 30000
      }
    };

    if (!configPath) {
      return defaultConfig;
    }

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      
      // Merge with defaults
      return {
        migration: { ...defaultConfig.migration, ...userConfig.migration },
        compatibility: { ...defaultConfig.compatibility, ...userConfig.compatibility },
        validation: { ...defaultConfig.validation, ...userConfig.validation }
      };
    } catch (error) {
      console.warn(`Could not load config file: ${error.message}, using defaults`);
      return defaultConfig;
    }
  }

  private generateOutputPath(inputPath: string, format: string = 'json'): string {
    const parsed = path.parse(inputPath);
    const extension = format === 'yaml' ? 'yaml' : 'json';
    return path.join(parsed.dir, `${parsed.name}-migrated.${extension}`);
  }

  private async saveFlow(flow: FlowDefinition, outputPath: string, format: string = 'json'): Promise<void> {
    let content: string;
    
    if (format === 'yaml') {
      const yaml = await import('yaml');
      content = yaml.stringify(flow);
    } else {
      content = JSON.stringify(flow, null, 2);
    }

    await fs.writeFile(outputPath, content);
  }

  private async runValidation(
    flow: FlowDefinition, 
    originalPath: string, 
    config: ValidationConfig
  ): Promise<void> {
    try {
      // Load original workflow
      const originalContent = await fs.readFile(originalPath, 'utf-8');
      const originalWorkflow = JSON.parse(originalContent);

      // Initialize components
      this.compatibilityLayer = new CompatibilityLayer();
      this.validator = new MigrationValidator(config, this.compatibilityLayer);

      // Run validation
      const migrationResult = { success: true, warnings: [], errors: [], compatibilityNotes: [] };
      const report = await this.validator.validateMigration(originalWorkflow, flow, migrationResult);

      this.displayValidationReport(report, false);

    } catch (error) {
      console.error(`Validation error: ${error.message}`);
    }
  }

  private async runTests(flow: FlowDefinition, testCases: any[]): Promise<void> {
    try {
      const config = await this.loadConfig();
      this.validator = new MigrationValidator(config.validation);

      const testResults = await this.validator['executeTestCases'](flow, testCases);
      this.displayTestResults(testResults, false);

    } catch (error) {
      console.error(`Test execution error: ${error.message}`);
    }
  }

  private displayValidationReport(report: ValidationReport, verbose: boolean): void {
    console.log(`\nValidation Results:`);
    console.log(`  Overall: ${report.overall.passed ? 'PASSED' : 'FAILED'} (${Math.round(report.overall.score)}%)`);
    console.log(`  Duration: ${report.overall.duration}ms`);

    const sections = [
      { name: 'Structural', result: report.structural },
      { name: 'Semantic', result: report.semantic },
      { name: 'Performance', result: report.performance },
      { name: 'Security', result: report.security },
      { name: 'Compatibility', result: report.compatibility }
    ];

    sections.forEach(section => {
      const status = section.result.passed ? 'PASS' : 'FAIL';
      const issueCount = section.result.issues.length;
      console.log(`  ${section.name}: ${status} (${issueCount} issues)`);

      if (verbose && issueCount > 0) {
        section.result.issues.forEach(issue => {
          console.log(`    - ${issue.severity.toUpperCase()}: ${issue.message}`);
          if (issue.suggestion) {
            console.log(`      Suggestion: ${issue.suggestion}`);
          }
        });
      }
    });

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
  }

  private displayTestResults(results: any[], verbose: boolean): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

    results.forEach(result => {
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`  ${status}: ${result.testCase.name} (${result.executionTime}ms)`);

      if (!result.passed || verbose) {
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            console.log(`    Warning: ${warning}`);
          });
        }
      }
    });
  }

  private async saveValidationReport(
    report: ValidationReport, 
    outputPath: string, 
    format: string
  ): Promise<void> {
    if (format === 'html') {
      const html = this.generateHtmlReport(report);
      await fs.writeFile(outputPath, html);
    } else {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    }
  }

  private generateHtmlReport(report: ValidationReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Migration Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warning { color: orange; }
        .issue { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #ccc; }
        .error { border-left-color: red; }
        .warning { border-left-color: orange; }
        .info { border-left-color: blue; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Migration Validation Report</h1>
        <p>Overall Status: <span class="${report.overall.passed ? 'pass' : 'fail'}">${report.overall.passed ? 'PASSED' : 'FAILED'}</span></p>
        <p>Score: ${Math.round(report.overall.score)}%</p>
        <p>Generated: ${report.overall.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Validation Results</h2>
        ${this.generateSectionHtml('Structural', report.structural)}
        ${this.generateSectionHtml('Semantic', report.semantic)}
        ${this.generateSectionHtml('Performance', report.performance)}
        ${this.generateSectionHtml('Security', report.security)}
        ${this.generateSectionHtml('Compatibility', report.compatibility)}
    </div>
    
    ${report.recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>
    `;
  }

  private generateSectionHtml(name: string, result: any): string {
    const status = result.passed ? 'pass' : 'fail';
    const statusText = result.passed ? 'PASS' : 'FAIL';
    
    return `
        <h3>${name}: <span class="${status}">${statusText}</span></h3>
        ${result.issues.map(issue => `
            <div class="issue ${issue.severity}">
                <strong>${issue.severity.toUpperCase()}:</strong> ${issue.message}
                ${issue.suggestion ? `<br><em>Suggestion: ${issue.suggestion}</em>` : ''}
            </div>
        `).join('')}
    `;
  }

  private async findWorkflowFiles(directory: string, pattern: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await this.findWorkflowFiles(fullPath, pattern);
        files.push(...subFiles);
      } else if (entry.isFile() && this.matchesPattern(entry.name, pattern)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with glob patterns
    if (pattern === '*.json') {
      return filename.endsWith('.json');
    }
    return filename.includes(pattern);
  }

  private async processWorkflowFile(
    filePath: string, 
    outputDir: string, 
    config: MigrationConfig
  ): Promise<MigrationResult> {
    this.importer = new N8nWorkflowImporter(config.migration);
    const result = await this.importer.importFromFile(filePath);

    if (result.success && result.flowDefinition) {
      const outputPath = path.join(
        outputDir || path.dirname(filePath),
        this.generateOutputPath(path.basename(filePath))
      );
      
      await this.saveFlow(result.flowDefinition, outputPath);
    }

    return result;
  }

  private generateBasicTestCases(flow: FlowDefinition): any[] {
    return [{
      name: 'Basic Execution Test',
      description: 'Test basic workflow execution',
      inputData: { test: true },
      expectedOutput: { status: 'completed' },
      stepId: flow.steps[0]?.id || 'start'
    }];
  }

  private analyzeCompatibility(workflow: any): any {
    const totalNodes = workflow.nodes?.length || 0;
    let supportedNodes = 0;
    const unsupportedFeatures: string[] = [];
    const warnings: string[] = [];

    // Analyze nodes
    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        if (this.isNodeSupported(node.type)) {
          supportedNodes++;
        } else {
          unsupportedFeatures.push(`Unsupported node type: ${node.type}`);
        }

        // Check for complex features
        if (node.parameters?.mode === 'runOnceForEachItem') {
          warnings.push(`Node ${node.name} uses "run once for each item" mode`);
        }

        if (node.credentials) {
          warnings.push(`Node ${node.name} requires credential migration`);
        }
      }
    }

    const score = totalNodes > 0 ? Math.round((supportedNodes / totalNodes) * 100) : 100;

    return {
      score,
      totalNodes,
      supportedNodes,
      unsupportedFeatures,
      warnings
    };
  }

  private isNodeSupported(nodeType: string): boolean {
    const supportedTypes = [
      'n8n-nodes-base.start',
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.set',
      'n8n-nodes-base.if',
      'n8n-nodes-base.function',
      'n8n-nodes-base.code',
      // Add more supported types
    ];

    return supportedTypes.includes(nodeType);
  }

  /**
   * Run the CLI
   */
  async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}

// Export for use as module
export default MigrationCLI;

// CLI entry point
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run(process.argv).catch(error => {
    console.error('CLI Error:', error.message);
    process.exit(1);
  });
}