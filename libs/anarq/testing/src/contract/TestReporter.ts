/**
 * Test Reporter for Contract Testing
 * Generates comprehensive reports and failure analysis
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ContractValidationResult, ContractValidationError } from './ContractValidator';
import { ContractTestResults } from './ContractTestRunner';

export interface ReportConfig {
  formats: ('json' | 'html' | 'junit' | 'markdown')[];
  includeDetails: boolean;
  includeCoverage: boolean;
  includeRecommendations: boolean;
}

export interface TestReport {
  metadata: {
    timestamp: string;
    version: string;
    environment: string;
    duration: number;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    coverage: number;
  };
  modules: ModuleReport[];
  crossModule: CrossModuleReport[];
  recommendations: string[];
  failureAnalysis: FailureAnalysis;
}

export interface ModuleReport {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  coverage: number;
  tests: TestCaseReport[];
  errors: ContractValidationError[];
  warnings: string[];
}

export interface CrossModuleReport {
  modules: [string, string];
  status: 'COMPATIBLE' | 'INCOMPATIBLE' | 'WARNING';
  issues: ContractValidationError[];
}

export interface TestCaseReport {
  name: string;
  type: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  duration: number;
  errors: ContractValidationError[];
  coverage: number;
}

export interface FailureAnalysis {
  commonPatterns: FailurePattern[];
  criticalIssues: ContractValidationError[];
  impactAnalysis: ImpactAnalysis;
  recommendations: string[];
}

export interface FailurePattern {
  pattern: string;
  count: number;
  affectedModules: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface ImpactAnalysis {
  blockedModules: string[];
  affectedIntegrations: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedFixTime: string;
}

export class TestReporter {
  private outputPath: string;
  private config: ReportConfig;

  constructor(outputPath: string, config?: Partial<ReportConfig>) {
    this.outputPath = outputPath;
    this.config = {
      formats: ['json', 'html', 'junit'],
      includeDetails: true,
      includeCoverage: true,
      includeRecommendations: true,
      ...config
    };

    // Ensure output directory exists
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, { recursive: true });
    }
  }

  /**
   * Generate all configured report formats
   */
  async generateReports(results: ContractTestResults): Promise<void> {
    const report = this.buildReport(results);

    for (const format of this.config.formats) {
      switch (format) {
        case 'json':
          await this.generateJsonReport(report);
          break;
        case 'html':
          await this.generateHtmlReport(report);
          break;
        case 'junit':
          await this.generateJunitReport(report);
          break;
        case 'markdown':
          await this.generateMarkdownReport(report);
          break;
      }
    }

    console.log(`\n📊 Reports generated in: ${this.outputPath}`);
  }

  /**
   * Build comprehensive test report
   */
  private buildReport(results: ContractTestResults): TestReport {
    const modules: ModuleReport[] = [];
    const crossModule: CrossModuleReport[] = [];

    // Build module reports
    results.moduleResults.forEach((result, moduleName) => {
      const moduleReport: ModuleReport = {
        name: moduleName,
        status: this.getModuleStatus(result),
        coverage: result.coverage.percentage,
        tests: [], // Would be populated with individual test results
        errors: result.errors,
        warnings: result.warnings
      };
      modules.push(moduleReport);
    });

    // Build cross-module reports
    results.crossModuleResults.forEach((errors, testName) => {
      const [moduleA, moduleB] = testName.replace('cross-module.', '').split('.');
      const crossModuleReport: CrossModuleReport = {
        modules: [moduleA, moduleB],
        status: errors.filter(e => e.severity === 'ERROR').length > 0 ? 'INCOMPATIBLE' : 
                errors.length > 0 ? 'WARNING' : 'COMPATIBLE',
        issues: errors
      };
      crossModule.push(crossModuleReport);
    });

    // Perform failure analysis
    const failureAnalysis = this.analyzeFailures(results.errors);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        duration: results.summary.duration
      },
      summary: results.summary,
      modules,
      crossModule,
      recommendations,
      failureAnalysis
    };
  }

  /**
   * Determine module status
   */
  private getModuleStatus(result: ContractValidationResult): 'PASSED' | 'FAILED' | 'WARNING' {
    const errorCount = result.errors.filter(e => e.severity === 'ERROR').length;
    const warningCount = result.errors.filter(e => e.severity === 'WARNING').length;

    if (errorCount > 0) return 'FAILED';
    if (warningCount > 0) return 'WARNING';
    return 'PASSED';
  }

  /**
   * Analyze failure patterns
   */
  private analyzeFailures(errors: ContractValidationError[]): FailureAnalysis {
    const patterns = new Map<string, FailurePattern>();
    const criticalIssues: ContractValidationError[] = [];

    // Identify common patterns
    errors.forEach(error => {
      // Extract pattern from error message
      const pattern = this.extractPattern(error);
      
      if (patterns.has(pattern)) {
        const existing = patterns.get(pattern)!;
        existing.count++;
        const moduleName = this.extractModuleName(error.path);
        if (moduleName && !existing.affectedModules.includes(moduleName)) {
          existing.affectedModules.push(moduleName);
        }
      } else {
        const moduleName = this.extractModuleName(error.path);
        patterns.set(pattern, {
          pattern,
          count: 1,
          affectedModules: moduleName ? [moduleName] : [],
          severity: error.severity === 'ERROR' ? 'HIGH' : 'MEDIUM',
          description: error.message
        });
      }

      // Identify critical issues
      if (error.severity === 'ERROR' && this.isCriticalError(error)) {
        criticalIssues.push(error);
      }
    });

    // Analyze impact
    const impactAnalysis = this.analyzeImpact(errors);

    // Generate recommendations
    const recommendations = this.generateFailureRecommendations(Array.from(patterns.values()));

    return {
      commonPatterns: Array.from(patterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 patterns
      criticalIssues,
      impactAnalysis,
      recommendations
    };
  }

  /**
   * Extract pattern from error
   */
  private extractPattern(error: ContractValidationError): string {
    // Normalize error messages to identify patterns
    let pattern = error.message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+/g, 'IDENTIFIER'); // Replace identifiers

    return `${error.type}: ${pattern}`;
  }

  /**
   * Extract module name from error path
   */
  private extractModuleName(path: string): string | null {
    const match = path.match(/^([a-zA-Z0-9-]+)\./);
    return match ? match[1] : null;
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: ContractValidationError): boolean {
    const criticalPatterns = [
      'Schema compilation failed',
      'OpenAPI validation failed',
      'Module contracts not loaded',
      'API request failed'
    ];

    return criticalPatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  /**
   * Analyze impact of failures
   */
  private analyzeImpact(errors: ContractValidationError[]): ImpactAnalysis {
    const blockedModules = new Set<string>();
    const affectedIntegrations = new Set<string>();
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    errors.forEach(error => {
      if (error.severity === 'ERROR') {
        const moduleName = this.extractModuleName(error.path);
        if (moduleName) {
          blockedModules.add(moduleName);
        }

        if (error.type === 'COMPATIBILITY') {
          affectedIntegrations.add(error.path);
        }
      }
    });

    // Determine risk level
    const errorCount = errors.filter(e => e.severity === 'ERROR').length;
    if (errorCount > 10 || blockedModules.size > 3) {
      riskLevel = 'HIGH';
    } else if (errorCount > 5 || blockedModules.size > 1) {
      riskLevel = 'MEDIUM';
    }

    // Estimate fix time based on error count and complexity
    let estimatedFixTime = '1-2 hours';
    if (errorCount > 20) {
      estimatedFixTime = '1-2 days';
    } else if (errorCount > 10) {
      estimatedFixTime = '4-8 hours';
    }

    return {
      blockedModules: Array.from(blockedModules),
      affectedIntegrations: Array.from(affectedIntegrations),
      riskLevel,
      estimatedFixTime
    };
  }

  /**
   * Generate failure-specific recommendations
   */
  private generateFailureRecommendations(patterns: FailurePattern[]): string[] {
    const recommendations: string[] = [];

    patterns.forEach(pattern => {
      if (pattern.pattern.includes('Schema compilation failed')) {
        recommendations.push('Review and fix JSON Schema syntax errors');
      } else if (pattern.pattern.includes('OpenAPI validation failed')) {
        recommendations.push('Validate OpenAPI specifications against OpenAPI 3.0 standard');
      } else if (pattern.pattern.includes('Schema validation failed')) {
        recommendations.push('Ensure test data matches schema requirements');
      } else if (pattern.pattern.includes('COMPATIBILITY')) {
        recommendations.push('Review cross-module dependencies and update schemas for compatibility');
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate general recommendations
   */
  private generateRecommendations(results: ContractTestResults): string[] {
    const recommendations: string[] = [];

    if (results.summary.coverage < 80) {
      recommendations.push('Increase test coverage by adding more contract tests');
    }

    if (results.summary.failed > 0) {
      recommendations.push('Fix failing contract tests before deployment');
    }

    if (results.summary.warnings > 5) {
      recommendations.push('Address warning issues to improve code quality');
    }

    const crossModuleIssues = Array.from(results.crossModuleResults.values())
      .reduce((sum, errors) => sum + errors.length, 0);
    
    if (crossModuleIssues > 0) {
      recommendations.push('Review cross-module compatibility issues');
    }

    return recommendations;
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(report: TestReport): Promise<void> {
    const filePath = join(this.outputPath, 'contract-test-report.json');
    writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`  📄 JSON report: ${filePath}`);
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(report: TestReport): Promise<void> {
    const html = this.buildHtmlReport(report);
    const filePath = join(this.outputPath, 'contract-test-report.html');
    writeFileSync(filePath, html);
    console.log(`  🌐 HTML report: ${filePath}`);
  }

  /**
   * Generate JUnit XML report
   */
  private async generateJunitReport(report: TestReport): Promise<void> {
    const xml = this.buildJunitXml(report);
    const filePath = join(this.outputPath, 'contract-test-results.xml');
    writeFileSync(filePath, xml);
    console.log(`  📋 JUnit report: ${filePath}`);
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(report: TestReport): Promise<void> {
    const markdown = this.buildMarkdownReport(report);
    const filePath = join(this.outputPath, 'contract-test-report.md');
    writeFileSync(filePath, markdown);
    console.log(`  📝 Markdown report: ${filePath}`);
  }

  /**
   * Build HTML report content
   */
  private buildHtmlReport(report: TestReport): string {
    const statusColor = report.summary.failed > 0 ? '#dc3545' : 
                       report.summary.warnings > 0 ? '#ffc107' : '#28a745';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #495057; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .module { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #dee2e6; }
        .module.passed { border-left-color: #28a745; }
        .module.failed { border-left-color: #dc3545; }
        .module.warning { border-left-color: #ffc107; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .warning { background: #fff3cd; color: #856404; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .recommendation { background: #d1ecf1; color: #0c5460; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { background: #28a745; height: 100%; transition: width 0.3s ease; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Contract Test Report</h1>
            <p>Generated on ${new Date(report.metadata.timestamp).toLocaleString()}</p>
            <p>Duration: ${(report.metadata.duration / 1000).toFixed(2)}s</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Summary</h2>
                <div class="summary">
                    <div class="metric">
                        <div class="metric-value">${report.summary.total}</div>
                        <div class="metric-label">Total Tests</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" style="color: #28a745">${report.summary.passed}</div>
                        <div class="metric-label">Passed</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" style="color: #dc3545">${report.summary.failed}</div>
                        <div class="metric-label">Failed</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" style="color: #ffc107">${report.summary.warnings}</div>
                        <div class="metric-label">Warnings</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.summary.coverage.toFixed(1)}%</div>
                        <div class="metric-label">Coverage</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${report.summary.coverage}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Module Results</h2>
                ${report.modules.map(module => `
                    <div class="module ${module.status.toLowerCase()}">
                        <h3>${module.name} <span class="status-badge status-${module.status.toLowerCase()}">${module.status}</span></h3>
                        <p>Coverage: ${module.coverage.toFixed(1)}%</p>
                        ${module.errors.length > 0 ? `
                            <h4>Errors:</h4>
                            ${module.errors.map(error => `
                                <div class="error">
                                    <strong>${error.type}</strong> at ${error.path}: ${error.message}
                                </div>
                            `).join('')}
                        ` : ''}
                        ${module.warnings.length > 0 ? `
                            <h4>Warnings:</h4>
                            ${module.warnings.map(warning => `
                                <div class="warning">${warning}</div>
                            `).join('')}
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            ${report.crossModule.length > 0 ? `
                <div class="section">
                    <h2>Cross-Module Compatibility</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Module A</th>
                                <th>Module B</th>
                                <th>Status</th>
                                <th>Issues</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.crossModule.map(cross => `
                                <tr>
                                    <td>${cross.modules[0]}</td>
                                    <td>${cross.modules[1]}</td>
                                    <td><span class="status-badge status-${cross.status.toLowerCase()}">${cross.status}</span></td>
                                    <td>${cross.issues.length}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${report.recommendations.length > 0 ? `
                <div class="section">
                    <h2>Recommendations</h2>
                    ${report.recommendations.map(rec => `
                        <div class="recommendation">💡 ${rec}</div>
                    `).join('')}
                </div>
            ` : ''}

            ${report.failureAnalysis.commonPatterns.length > 0 ? `
                <div class="section">
                    <h2>Failure Analysis</h2>
                    <h3>Common Patterns</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Pattern</th>
                                <th>Count</th>
                                <th>Affected Modules</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.failureAnalysis.commonPatterns.map(pattern => `
                                <tr>
                                    <td>${pattern.pattern}</td>
                                    <td>${pattern.count}</td>
                                    <td>${pattern.affectedModules.join(', ')}</td>
                                    <td><span class="status-badge status-${pattern.severity.toLowerCase()}">${pattern.severity}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Build JUnit XML report
   */
  private buildJunitXml(report: TestReport): string {
    const testsuites = report.modules.map(module => {
      const tests = module.tests || [];
      const failures = module.errors.filter(e => e.severity === 'ERROR').length;
      const errors = 0; // We treat all as failures for simplicity
      
      return `
    <testsuite name="${module.name}" tests="${tests.length}" failures="${failures}" errors="${errors}" time="${report.metadata.duration / 1000}">
      ${tests.map(test => `
        <testcase name="${test.name}" classname="${module.name}" time="${test.duration || 0}">
          ${test.status === 'FAILED' ? `
            <failure message="${test.errors[0]?.message || 'Test failed'}" type="${test.errors[0]?.type || 'UNKNOWN'}">
              ${test.errors.map(e => `${e.path}: ${e.message}`).join('\n')}
            </failure>
          ` : ''}
        </testcase>
      `).join('')}
    </testsuite>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Contract Tests" tests="${report.summary.total}" failures="${report.summary.failed}" errors="0" time="${report.metadata.duration / 1000}">
  ${testsuites}
</testsuites>`;
  }

  /**
   * Build Markdown report
   */
  private buildMarkdownReport(report: TestReport): string {
    const status = report.summary.failed > 0 ? '❌ FAILED' : 
                  report.summary.warnings > 0 ? '⚠️ WARNING' : '✅ PASSED';

    return `# Contract Test Report ${status}

**Generated:** ${new Date(report.metadata.timestamp).toLocaleString()}  
**Duration:** ${(report.metadata.duration / 1000).toFixed(2)}s  
**Environment:** ${report.metadata.environment}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.total} |
| Passed | ✅ ${report.summary.passed} |
| Failed | ❌ ${report.summary.failed} |
| Warnings | ⚠️ ${report.summary.warnings} |
| Coverage | ${report.summary.coverage.toFixed(1)}% |

## Module Results

${report.modules.map(module => `
### ${module.name} ${module.status === 'PASSED' ? '✅' : module.status === 'FAILED' ? '❌' : '⚠️'}

- **Status:** ${module.status}
- **Coverage:** ${module.coverage.toFixed(1)}%

${module.errors.length > 0 ? `
#### Errors
${module.errors.map(error => `- **${error.type}** at \`${error.path}\`: ${error.message}`).join('\n')}
` : ''}

${module.warnings.length > 0 ? `
#### Warnings
${module.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}
`).join('')}

${report.crossModule.length > 0 ? `
## Cross-Module Compatibility

| Module A | Module B | Status | Issues |
|----------|----------|--------|--------|
${report.crossModule.map(cross => 
  `| ${cross.modules[0]} | ${cross.modules[1]} | ${cross.status} | ${cross.issues.length} |`
).join('\n')}
` : ''}

${report.recommendations.length > 0 ? `
## Recommendations

${report.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}
` : ''}

${report.failureAnalysis.commonPatterns.length > 0 ? `
## Failure Analysis

### Common Patterns

| Pattern | Count | Affected Modules | Severity |
|---------|-------|------------------|----------|
${report.failureAnalysis.commonPatterns.map(pattern => 
  `| ${pattern.pattern} | ${pattern.count} | ${pattern.affectedModules.join(', ')} | ${pattern.severity} |`
).join('\n')}

### Impact Analysis

- **Risk Level:** ${report.failureAnalysis.impactAnalysis.riskLevel}
- **Estimated Fix Time:** ${report.failureAnalysis.impactAnalysis.estimatedFixTime}
- **Blocked Modules:** ${report.failureAnalysis.impactAnalysis.blockedModules.join(', ') || 'None'}
- **Affected Integrations:** ${report.failureAnalysis.impactAnalysis.affectedIntegrations.join(', ') || 'None'}
` : ''}

---
*Report generated by Q Ecosystem Contract Testing Suite*`;
  }
}