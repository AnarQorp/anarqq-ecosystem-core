#!/usr/bin/env tsx
/**
 * Task 17.1 Test Runner
 * 
 * Executes comprehensive ecosystem integration validation tests
 * for Qflow's integration with all AnarQ & Q modules.
 */
import { Task17_1_EcosystemValidation, EcosystemValidationConfig } from './Task17_1_EcosystemValidation';
import * as fs from 'fs';
import * as path from 'path';

interface TestRunOptions {
  outputDir?: string;
  enableRealServices?: boolean;
  timeout?: number;
  maxRetries?: number;
  enableCrossModule?: boolean;
  enableEventCoordination?: boolean;
  reportFormat?: 'json' | 'html' | 'console';
  verbose?: boolean;
}

class Task17_1_TestRunner {
  private options: TestRunOptions;
  private validator: Task17_1_EcosystemValidation;
  private startTime: number = 0;

  constructor(options: TestRunOptions = {}) {
    this.options = {
      outputDir: './test-reports/task-17-1',
      enableRealServices: false, // Use mocks by default for safety
      timeout: 30000,
      maxRetries: 3,
      enableCrossModule: true,
      enableEventCoordination: true,
      reportFormat: 'console',
      verbose: false,
      ...options
    };

    const config: EcosystemValidationConfig = {
      enableRealServices: this.options.enableRealServices!,
      serviceEndpoints: {
        // Core Identity & Security
        squid: process.env.SQUID_ENDPOINT || 'http://localhost:3001',
        qlock: process.env.QLOCK_ENDPOINT || 'http://localhost:3002',
        qonsent: process.env.QONSENT_ENDPOINT || 'http://localhost:3003',
        qindex: process.env.QINDEX_ENDPOINT || 'http://localhost:3004',
        qerberos: process.env.QERBEROS_ENDPOINT || 'http://localhost:3005',
        
        // Network & Infrastructure
        qnet: process.env.QNET_ENDPOINT || 'http://localhost:3006',
        
        // Application Modules
        qmail: process.env.QMAIL_ENDPOINT || 'http://localhost:3007',
        qpic: process.env.QPIC_ENDPOINT || 'http://localhost:3008',
        qdrive: process.env.QDRIVE_ENDPOINT || 'http://localhost:3009',
        qmarket: process.env.QMARKET_ENDPOINT || 'http://localhost:3010',
        qwallet: process.env.QWALLET_ENDPOINT || 'http://localhost:3011',
        qchat: process.env.QCHAT_ENDPOINT || 'http://localhost:3012',
        qmask: process.env.QMASK_ENDPOINT || 'http://localhost:3013',
        
        // Governance & DAO
        dao: process.env.DAO_ENDPOINT || 'http://localhost:3014'
      },
      validationTimeout: this.options.timeout!,
      maxRetries: this.options.maxRetries!,
      enableCrossModuleTests: this.options.enableCrossModule!,
      enableEventCoordination: this.options.enableEventCoordination!
    };

    this.validator = new Task17_1_EcosystemValidation(config);
    this.setupEventHandlers();
  }

  /**
   * Run Task 17.1 validation tests
   */
  public async run(): Promise<void> {
    console.log('🚀 Starting Task 17.1: Complete Ecosystem Integration Validation');
    console.log('=' .repeat(80));
    
    if (!this.options.enableRealServices) {
      console.log('⚠️  Running with mock services (use --real-services for production validation)');
    }
    
    console.log(`📊 Configuration:`);
    console.log(`   • Timeout: ${this.options.timeout}ms`);
    console.log(`   • Max Retries: ${this.options.maxRetries}`);
    console.log(`   • Cross-Module Tests: ${this.options.enableCrossModule ? 'Enabled' : 'Disabled'}`);
    console.log(`   • Event Coordination: ${this.options.enableEventCoordination ? 'Enabled' : 'Disabled'}`);
    console.log(`   • Output Directory: ${this.options.outputDir}`);
    console.log('');

    this.startTime = Date.now();

    try {
      // Ensure output directory exists
      if (this.options.outputDir && !fs.existsSync(this.options.outputDir)) {
        fs.mkdirSync(this.options.outputDir, { recursive: true });
      }

      // Run validation tests
      const results = await this.validator.runCompleteValidation();
      
      // Generate and save reports
      await this.generateReports(results);
      
      // Display summary
      this.displaySummary(results);
      
      // Determine exit code
      const failed = Array.from(results.values()).filter(r => r.status === 'failed').length;
      if (failed > 0) {
        console.log(`❌ Task 17.1 FAILED: ${failed} test(s) failed`);
        process.exit(1);
      } else {
        console.log('✅ Task 17.1 PASSED: All ecosystem integration tests successful');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('💥 Task 17.1 execution failed:', error);
      process.exit(1);
    } finally {
      await this.validator.cleanup();
    }
  }

  /**
   * Setup event handlers for validation progress
   */
  private setupEventHandlers(): void {
    this.validator.on('validation_started', (event) => {
      console.log(`🔄 Validation started at ${new Date(event.timestamp).toISOString()}`);
    });

    this.validator.on('phase_started', (event) => {
      console.log(`📋 Phase: ${event.phase}`);
    });

    this.validator.on('test_started', (event) => {
      if (this.options.verbose) {
        console.log(`   🧪 ${event.testName}...`);
      }
    });

    this.validator.on('test_completed', (event) => {
      const status = event.status === 'passed' ? '✅' : event.status === 'failed' ? '❌' : '⏭️';
      const duration = event.duration ? `(${(event.duration / 1000).toFixed(2)}s)` : '';
      console.log(`   ${status} ${event.testName} ${duration}`);
      
      if (event.status === 'failed' && event.errors && this.options.verbose) {
        event.errors.forEach((error: string) => {
          console.log(`      Error: ${error}`);
        });
      }
    });

    this.validator.on('validation_completed', (event) => {
      const duration = (Date.now() - this.startTime) / 1000;
      console.log(`\n✅ Validation completed in ${duration.toFixed(2)}s`);
    });

    this.validator.on('validation_failed', (event) => {
      console.error(`❌ Validation failed: ${event.error}`);
    });
  }

  /**
   * Generate test reports
   */
  private async generateReports(results: Map<string, any>): Promise<void> {
    if (!this.options.outputDir) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
      task: 'Task 17.1: Complete Ecosystem Integration Validation',
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      configuration: this.options,
      results: Array.from(results.entries()).map(([key, result]) => ({
        key,
        ...result
      })),
      summary: this.generateSummary(results)
    };

    // Generate JSON report
    const jsonPath = path.join(this.options.outputDir, `task-17-1-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 JSON report saved: ${jsonPath}`);

    // Generate HTML report if requested
    if (this.options.reportFormat === 'html') {
      const htmlPath = path.join(this.options.outputDir, `task-17-1-report-${timestamp}.html`);
      const htmlContent = this.generateHtmlReport(reportData);
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`📄 HTML report saved: ${htmlPath}`);
    }

    // Generate summary markdown
    const mdPath = path.join(this.options.outputDir, `task-17-1-summary-${timestamp}.md`);
    const mdContent = this.generateMarkdownSummary(reportData);
    fs.writeFileSync(mdPath, mdContent);
    console.log(`📄 Markdown summary saved: ${mdPath}`);
  }

  /**
   * Generate test summary
   */
  private generateSummary(results: Map<string, any>): any {
    const resultArray = Array.from(results.values());
    const total = resultArray.length;
    const passed = resultArray.filter(r => r.status === 'passed').length;
    const failed = resultArray.filter(r => r.status === 'failed').length;
    const skipped = resultArray.filter(r => r.status === 'skipped').length;

    // Group by module
    const moduleResults = new Map<string, any>();
    resultArray.forEach(result => {
      if (!moduleResults.has(result.module)) {
        moduleResults.set(result.module, { total: 0, passed: 0, failed: 0, skipped: 0, tests: [] });
      }
      const moduleResult = moduleResults.get(result.module);
      moduleResult.total++;
      moduleResult[result.status]++;
      moduleResult.tests.push(result);
    });

    return {
      overall: {
        total,
        passed,
        failed,
        skipped,
        successRate: total > 0 ? passed / total : 0,
        duration: Date.now() - this.startTime
      },
      modules: Object.fromEntries(moduleResults),
      criticalFailures: resultArray.filter(r => 
        r.status === 'failed' && 
        ['squid', 'qlock', 'qonsent', 'qindex', 'qerberos'].includes(r.module)
      ),
      recommendations: this.generateRecommendations(resultArray)
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: any[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      recommendations.push(`❌ Fix ${failedTests.length} failed integration tests before proceeding to Task 17.2`);
      
      const criticalFailures = failedTests.filter(t => 
        ['squid', 'qlock', 'qonsent', 'qindex', 'qerberos'].includes(t.module)
      );
      if (criticalFailures.length > 0) {
        recommendations.push(`🚨 CRITICAL: ${criticalFailures.length} core service integration failures must be resolved`);
      }
    }
    
    const slowTests = results.filter(r => r.duration > 30000);
    if (slowTests.length > 0) {
      recommendations.push(`⚡ Optimize ${slowTests.length} slow tests (>30s) for better performance`);
    }
    
    if (results.length === 0) {
      recommendations.push('⚠️  No tests were executed - verify test configuration and service availability');
    } else if (failedTests.length === 0) {
      recommendations.push('✅ All ecosystem integrations validated - ready to proceed to Task 17.2');
    }
    
    return recommendations;
  }

  /**
   * Display test summary
   */
  private displaySummary(results: Map<string, any>): void {
    const summary = this.generateSummary(results);
    const duration = (summary.overall.duration / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TASK 17.1 ECOSYSTEM INTEGRATION VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 OVERALL SUMMARY:`);
    console.log(`   Total Tests: ${summary.overall.total}`);
    console.log(`   ✅ Passed: ${summary.overall.passed}`);
    console.log(`   ❌ Failed: ${summary.overall.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.overall.skipped}`);
    console.log(`   📈 Success Rate: ${(summary.overall.successRate * 100).toFixed(1)}%`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    
    console.log(`\n🏗️  MODULE RESULTS:`);
    Object.entries(summary.modules).forEach(([module, result]: [string, any]) => {
      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${module.toUpperCase()}: ${result.passed}/${result.total} passed`);
    });
    
    if (summary.criticalFailures.length > 0) {
      console.log(`\n🚨 CRITICAL FAILURES:`);
      summary.criticalFailures.forEach((failure: any) => {
        console.log(`   ❌ ${failure.module}: ${failure.testName}`);
        if (failure.errors && failure.errors.length > 0) {
          failure.errors.forEach((error: string) => {
            console.log(`      Error: ${error}`);
          });
        }
      });
    }
    
    if (summary.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      summary.recommendations.forEach((rec: string) => {
        console.log(`   ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(reportData: any): string {
    const { summary, results } = reportData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Task 17.1: Ecosystem Integration Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.passed { border-left-color: #28a745; }
        .metric.failed { border-left-color: #dc3545; }
        .metric.skipped { border-left-color: #ffc107; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .modules { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .module { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; }
        .module.success { border-left: 4px solid #28a745; }
        .module.failure { border-left: 4px solid #dc3545; }
        .module h4 { margin: 0 0 10px 0; color: #495057; }
        .test-list { list-style: none; padding: 0; margin: 10px 0; }
        .test-list li { padding: 5px 0; border-bottom: 1px solid #f1f3f4; }
        .test-passed { color: #28a745; }
        .test-failed { color: #dc3545; }
        .test-skipped { color: #ffc107; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendations h3 { color: #856404; margin-top: 0; }
        .recommendations ul { margin: 10px 0; }
        .recommendations li { margin: 5px 0; }
        .critical { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Task 17.1: Complete Ecosystem Integration Validation</h1>
            <p><strong>Generated:</strong> ${reportData.timestamp}</p>
            <p><strong>Duration:</strong> ${(reportData.duration / 1000).toFixed(2)}s</p>
            <p><strong>Configuration:</strong> ${reportData.configuration.enableRealServices ? 'Real Services' : 'Mock Services'}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${summary.overall.total}</div>
            </div>
            <div class="metric passed">
                <h3>Passed</h3>
                <div class="value">${summary.overall.passed}</div>
            </div>
            <div class="metric failed">
                <h3>Failed</h3>
                <div class="value">${summary.overall.failed}</div>
            </div>
            <div class="metric skipped">
                <h3>Skipped</h3>
                <div class="value">${summary.overall.skipped}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value">${(summary.overall.successRate * 100).toFixed(1)}%</div>
            </div>
        </div>
        
        <h2>📋 Module Integration Results</h2>
        <div class="modules">
            ${Object.entries(summary.modules).map(([module, result]: [string, any]) => `
                <div class="module ${result.failed === 0 ? 'success' : 'failure'}">
                    <h4>${module.toUpperCase()}</h4>
                    <p><strong>Tests:</strong> ${result.total} | <strong>Passed:</strong> ${result.passed} | <strong>Failed:</strong> ${result.failed}</p>
                    <ul class="test-list">
                        ${result.tests.map((test: any) => `
                            <li class="test-${test.status}">
                                ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} 
                                ${test.testName} (${(test.duration / 1000).toFixed(2)}s)
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        
        ${summary.criticalFailures.length > 0 ? `
            <div class="recommendations critical">
                <h3>🚨 Critical Failures</h3>
                <p>The following core service integrations failed and must be resolved:</p>
                <ul>
                    ${summary.criticalFailures.map((failure: any) => `
                        <li><strong>${failure.module}:</strong> ${failure.testName}</li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${summary.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d;">
            <p>Generated by Qflow Task 17.1 Ecosystem Integration Validator</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown summary
   */
  private generateMarkdownSummary(reportData: any): string {
    const { summary } = reportData;
    
    return `# Task 17.1: Complete Ecosystem Integration Validation

**Generated:** ${reportData.timestamp}  
**Duration:** ${(reportData.duration / 1000).toFixed(2)}s  
**Configuration:** ${reportData.configuration.enableRealServices ? 'Real Services' : 'Mock Services'}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.overall.total} |
| Passed | ${summary.overall.passed} |
| Failed | ${summary.overall.failed} |
| Skipped | ${summary.overall.skipped} |
| Success Rate | ${(summary.overall.successRate * 100).toFixed(1)}% |

## Module Results

${Object.entries(summary.modules).map(([module, result]: [string, any]) => `
### ${module.toUpperCase()}
- **Status:** ${result.failed === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Tests:** ${result.total}
- **Passed:** ${result.passed}
- **Failed:** ${result.failed}
- **Skipped:** ${result.skipped}

${result.tests.map((test: any) => `- ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} ${test.testName} (${(test.duration / 1000).toFixed(2)}s)`).join('\n')}
`).join('\n')}

${summary.criticalFailures.length > 0 ? `
## 🚨 Critical Failures

The following core service integrations failed and must be resolved:

${summary.criticalFailures.map((failure: any) => `- **${failure.module}:** ${failure.testName}`).join('\n')}
` : ''}

## Recommendations

${summary.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

---

*Generated by Qflow Task 17.1 Ecosystem Integration Validator*
`;
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: TestRunOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--real-services':
        options.enableRealServices = true;
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]) || 30000;
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i]) || 3;
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--report-format':
        options.reportFormat = args[++i] as 'json' | 'html' | 'console';
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--no-cross-module':
        options.enableCrossModule = false;
        break;
      case '--no-event-coordination':
        options.enableEventCoordination = false;
        break;
      case '--help':
        console.log(`
Task 17.1: Complete Ecosystem Integration Validation

Usage: tsx run-task-17-1.ts [options]

Options:
  --real-services           Use real services instead of mocks (CAUTION: may affect production)
  --timeout <ms>           Test timeout in milliseconds (default: 30000)
  --max-retries <n>        Maximum retry attempts (default: 3)
  --output-dir <path>      Output directory for reports (default: ./test-reports/task-17-1)
  --report-format <format> Report format: json, html, console (default: console)
  --verbose                Enable verbose output
  --no-cross-module        Disable cross-module integration tests
  --no-event-coordination  Disable event coordination tests
  --help                   Show this help message

Environment Variables:
  SQUID_ENDPOINT, QLOCK_ENDPOINT, QONSENT_ENDPOINT, QINDEX_ENDPOINT,
  QERBEROS_ENDPOINT, QNET_ENDPOINT, QMAIL_ENDPOINT, QPIC_ENDPOINT,
  QDRIVE_ENDPOINT, QMARKET_ENDPOINT, QWALLET_ENDPOINT, QCHAT_ENDPOINT,
  QMASK_ENDPOINT, DAO_ENDPOINT

Examples:
  tsx run-task-17-1.ts                    # Run with mock services
  tsx run-task-17-1.ts --real-services    # Run with real services (CAUTION)
  tsx run-task-17-1.ts --verbose --report-format html
        `);
        process.exit(0);
        break;
    }
  }

  const runner = new Task17_1_TestRunner(options);
  await runner.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { Task17_1_TestRunner };