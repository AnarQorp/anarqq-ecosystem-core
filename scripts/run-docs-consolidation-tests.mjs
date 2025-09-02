#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Documentation Consolidation System
 * Runs all test suites with proper reporting and CI integration
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

class DocsConsolidationTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      coverage: null,
      errors: []
    };
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🧪 Starting Documentation Consolidation Test Suite...\n');

    try {
      // Ensure test results directory exists
      await fs.mkdir('test-results', { recursive: true });

      // Run test suites
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runQualityTests();
      await this.runCITests();
      await this.runCoverageAnalysis();

      // Generate reports
      await this.generateTestReport();
      await this.generateCoverageReport();

      // Display summary
      this.displaySummary();

      // Exit with appropriate code
      const hasFailures = this.results.summary.failed > 0 || this.results.errors.length > 0;
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    console.log('📋 Running Unit Tests...');
    
    const unitTestSuites = [
      {
        name: 'ScriptGenerator',
        pattern: 'tests/docs-consolidation/unit/ScriptGenerator.test.mjs'
      },
      {
        name: 'ModuleDocumentationNormalizer',
        pattern: 'tests/docs-consolidation/unit/ModuleDocumentationNormalizer.test.mjs'
      },
      {
        name: 'ContentExtractionEngine',
        pattern: 'tests/docs-consolidation/unit/ContentExtractionEngine.test.mjs'
      },
      {
        name: 'DocsValidator',
        pattern: 'tests/docs-consolidation/unit/DocsValidator.test.mjs'
      }
    ];

    for (const suite of unitTestSuites) {
      await this.runTestSuite(suite, 'unit');
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    
    const integrationSuite = {
      name: 'DocumentationFlow',
      pattern: 'tests/docs-consolidation/integration/DocumentationFlow.test.mjs'
    };

    await this.runTestSuite(integrationSuite, 'integration');
  }

  /**
   * Run quality tests
   */
  async runQualityTests() {
    console.log('✨ Running Quality Tests...');
    
    const qualitySuite = {
      name: 'ContentQuality',
      pattern: 'tests/docs-consolidation/quality/ContentQuality.test.mjs'
    };

    await this.runTestSuite(qualitySuite, 'quality');
  }

  /**
   * Run CI/CD tests
   */
  async runCITests() {
    console.log('🚀 Running CI/CD Integration Tests...');
    
    const ciSuite = {
      name: 'CIIntegration',
      pattern: 'tests/docs-consolidation/ci/CIIntegration.test.mjs'
    };

    await this.runTestSuite(ciSuite, 'ci');
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(suite, category) {
    const startTime = Date.now();
    
    try {
      console.log(`  📝 Running ${suite.name}...`);
      
      const command = `npx vitest run --config vitest.docs-consolidation.config.ts --reporter=json ${suite.pattern}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const result = JSON.parse(output);
      const duration = Date.now() - startTime;

      const suiteResult = {
        name: suite.name,
        category,
        pattern: suite.pattern,
        duration,
        tests: result.numTotalTests || 0,
        passed: result.numPassedTests || 0,
        failed: result.numFailedTests || 0,
        skipped: result.numPendingTests || 0,
        success: result.success || false,
        errors: result.testResults?.map(tr => tr.message).filter(Boolean) || []
      };

      this.results.suites.push(suiteResult);
      this.updateSummary(suiteResult);

      if (suiteResult.success) {
        console.log(`    ✅ ${suite.name}: ${suiteResult.passed}/${suiteResult.tests} tests passed (${duration}ms)`);
      } else {
        console.log(`    ❌ ${suite.name}: ${suiteResult.failed} tests failed`);
        suiteResult.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`    ❌ ${suite.name}: Test execution failed`);
      console.log(`      Error: ${error.message}`);

      const failedSuite = {
        name: suite.name,
        category,
        pattern: suite.pattern,
        duration,
        tests: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        success: false,
        errors: [error.message]
      };

      this.results.suites.push(failedSuite);
      this.results.errors.push(`${suite.name}: ${error.message}`);
    }
  }

  /**
   * Update summary statistics
   */
  updateSummary(suiteResult) {
    this.results.summary.total += suiteResult.tests;
    this.results.summary.passed += suiteResult.passed;
    this.results.summary.failed += suiteResult.failed;
    this.results.summary.skipped += suiteResult.skipped;
    this.results.summary.duration += suiteResult.duration;
  }

  /**
   * Run coverage analysis
   */
  async runCoverageAnalysis() {
    console.log('📊 Running Coverage Analysis...');
    
    try {
      const command = 'npx vitest run --config vitest.docs-consolidation.config.ts --coverage --reporter=json';
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Read coverage report
      try {
        const coverageData = await fs.readFile('coverage/coverage-summary.json', 'utf8');
        this.results.coverage = JSON.parse(coverageData);
        
        const total = this.results.coverage.total;
        console.log(`    📈 Coverage: ${total.lines.pct}% lines, ${total.functions.pct}% functions, ${total.branches.pct}% branches`);
        
      } catch (coverageError) {
        console.log('    ⚠️  Coverage report not available');
      }

    } catch (error) {
      console.log(`    ❌ Coverage analysis failed: ${error.message}`);
      this.results.errors.push(`Coverage analysis: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    const report = {
      ...this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: process.env.CI === 'true'
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = 'test-results/docs-consolidation-test-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile('test-results/docs-consolidation-test-report.md', markdownReport);

    console.log(`📄 Test report generated: ${reportPath}`);
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    if (!this.results.coverage) {
      return;
    }

    const coverageReport = {
      timestamp: this.results.timestamp,
      summary: this.results.coverage.total,
      files: this.results.coverage,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      },
      compliance: {
        lines: this.results.coverage.total.lines.pct >= 70,
        functions: this.results.coverage.total.functions.pct >= 70,
        branches: this.results.coverage.total.branches.pct >= 70,
        statements: this.results.coverage.total.statements.pct >= 70
      }
    };

    await fs.writeFile(
      'test-results/docs-consolidation-coverage-report.json',
      JSON.stringify(coverageReport, null, 2)
    );

    console.log('📊 Coverage report generated');
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    // Test failure recommendations
    if (this.results.summary.failed > 0) {
      recommendations.push({
        type: 'test-failures',
        priority: 'high',
        message: `${this.results.summary.failed} tests are failing. Review and fix failing tests before deployment.`
      });
    }

    // Coverage recommendations
    if (this.results.coverage) {
      const coverage = this.results.coverage.total;
      
      if (coverage.lines.pct < 70) {
        recommendations.push({
          type: 'coverage-lines',
          priority: 'medium',
          message: `Line coverage is ${coverage.lines.pct}%, below the 70% threshold. Add more unit tests.`
        });
      }

      if (coverage.functions.pct < 70) {
        recommendations.push({
          type: 'coverage-functions',
          priority: 'medium',
          message: `Function coverage is ${coverage.functions.pct}%, below the 70% threshold. Test more functions.`
        });
      }

      if (coverage.branches.pct < 70) {
        recommendations.push({
          type: 'coverage-branches',
          priority: 'medium',
          message: `Branch coverage is ${coverage.branches.pct}%, below the 70% threshold. Add tests for edge cases.`
        });
      }
    }

    // Performance recommendations
    const avgDuration = this.results.summary.duration / this.results.suites.length;
    if (avgDuration > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: `Average test suite duration is ${avgDuration}ms. Consider optimizing slow tests.`
      });
    }

    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Documentation Consolidation Test Report

**Generated:** ${report.timestamp}

## Summary

- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : '✅'}
- **Skipped:** ${report.summary.skipped}
- **Duration:** ${report.summary.duration}ms

## Test Suites

${report.suites.map(suite => `### ${suite.name} (${suite.category})

- **Tests:** ${suite.tests}
- **Passed:** ${suite.passed}
- **Failed:** ${suite.failed}
- **Duration:** ${suite.duration}ms
- **Status:** ${suite.success ? '✅ Passed' : '❌ Failed'}

${suite.errors.length > 0 ? `**Errors:**
${suite.errors.map(error => `- ${error}`).join('\n')}` : ''}
`).join('\n')}

## Coverage Report

${report.coverage ? `
- **Lines:** ${report.coverage.total.lines.pct}%
- **Functions:** ${report.coverage.total.functions.pct}%
- **Branches:** ${report.coverage.total.branches.pct}%
- **Statements:** ${report.coverage.total.statements.pct}%
` : 'Coverage data not available'}

## Recommendations

${report.recommendations.length > 0 ? 
  report.recommendations.map(rec => `- **${rec.type}** (${rec.priority}): ${rec.message}`).join('\n') :
  'No recommendations at this time.'
}

## Environment

- **Node.js:** ${report.environment.node}
- **Platform:** ${report.environment.platform}
- **Architecture:** ${report.environment.arch}
- **CI Environment:** ${report.environment.ci ? 'Yes' : 'No'}

---
*Generated by Documentation Consolidation Test Runner*
`;
  }

  /**
   * Display summary to console
   */
  displaySummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed} ✅`);
    console.log(`Failed: ${this.results.summary.failed} ${this.results.summary.failed > 0 ? '❌' : '✅'}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log(`Duration: ${this.results.summary.duration}ms`);

    if (this.results.coverage) {
      console.log('\n📈 Coverage:');
      console.log(`Lines: ${this.results.coverage.total.lines.pct}%`);
      console.log(`Functions: ${this.results.coverage.total.functions.pct}%`);
      console.log(`Branches: ${this.results.coverage.total.branches.pct}%`);
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    const success = this.results.summary.failed === 0 && this.results.errors.length === 0;
    console.log(`\n${success ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new DocsConsolidationTestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Consolidation Test Runner

Usage: node run-docs-consolidation-tests.mjs [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --ci          Run in CI mode (exit with error code on failure)

Examples:
  node run-docs-consolidation-tests.mjs
  node run-docs-consolidation-tests.mjs --verbose
  node run-docs-consolidation-tests.mjs --ci
`);
    process.exit(0);
  }

  if (args.includes('--verbose') || args.includes('-v')) {
    process.env.VERBOSE = 'true';
  }

  if (args.includes('--ci')) {
    process.env.CI = 'true';
  }

  await runner.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default DocsConsolidationTestRunner;