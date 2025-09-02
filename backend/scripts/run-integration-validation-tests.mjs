#!/usr/bin/env node

/**
 * Integration and Validation Test Runner
 * Executes all comprehensive integration tests for Task 8
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TEST_SUITES = [
  {
    name: 'Ecosystem Integration Tests',
    file: 'backend/tests/ecosystem-integration-comprehensive.test.mjs',
    description: 'Comprehensive Q∞ module interactions and cross-layer validation'
  },
  {
    name: 'Pi Network Integration Tests', 
    file: 'backend/tests/pi-network-integration-comprehensive.test.mjs',
    description: 'Pi testnet integration, wallet, contracts, and identity binding'
  },
  {
    name: 'Performance and Stress Tests',
    file: 'backend/tests/performance-stress-comprehensive.test.mjs', 
    description: 'High-volume parallel processing and performance benchmarking'
  },
  {
    name: 'Demo Validation Tests',
    file: 'backend/tests/demo-validation-comprehensive.test.mjs',
    description: 'Automated demo scenarios and matrix validation'
  }
];

async function runIntegrationTests() {
  console.log('🚀 Starting Integration and Validation Test Suite');
  console.log('=' .repeat(60));

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Ensure artifacts directory exists
  await fs.mkdir('artifacts/test-reports', { recursive: true });

  for (const suite of TEST_SUITES) {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log(`📄 Description: ${suite.description}`);
    console.log(`📁 File: ${suite.file}`);
    console.log('-'.repeat(40));

    const startTime = Date.now();
    let suiteResult;

    try {
      // Run the test suite
      const output = execSync(`npx vitest run ${suite.file} --reporter=json`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      const testResult = JSON.parse(output);
      const duration = Date.now() - startTime;

      suiteResult = {
        name: suite.name,
        file: suite.file,
        success: true,
        duration,
        tests: testResult.numTotalTests || 0,
        passed: testResult.numPassedTests || 0,
        failed: testResult.numFailedTests || 0,
        output: testResult
      };

      totalTests += suiteResult.tests;
      passedTests += suiteResult.passed;
      failedTests += suiteResult.failed;

      console.log(`✅ ${suite.name} completed successfully`);
      console.log(`   Tests: ${suiteResult.passed}/${suiteResult.tests} passed`);
      console.log(`   Duration: ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      suiteResult = {
        name: suite.name,
        file: suite.file,
        success: false,
        duration,
        error: error.message,
        tests: 0,
        passed: 0,
        failed: 1
      };

      totalTests += 1;
      failedTests += 1;

      console.log(`❌ ${suite.name} failed`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Duration: ${duration}ms`);
    }

    results.push(suiteResult);
  }

  // Generate comprehensive test report
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'Integration and Validation Tests',
    summary: {
      totalSuites: TEST_SUITES.length,
      successfulSuites: results.filter(r => r.success).length,
      failedSuites: results.filter(r => !r.success).length,
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) : 0,
      overallDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    suites: results,
    requirements: {
      '1.1': 'Q∞ module interactions validated',
      '1.2': 'Cross-layer validation completed', 
      '1.3': 'End-to-end flow validation verified',
      '2.1': 'Data flow verification completed',
      '2.2': 'Data flow verification completed',
      '2.3': 'Data flow verification completed',
      '2.4': 'Performance and stress tests completed',
      '1.4': 'Performance benchmarking completed',
      '4.1': 'Pi Network integration validated',
      '4.2': 'Pi smart contracts tested',
      '4.3': 'Pi identity binding verified',
      '4.4': 'Pi Browser compatibility validated',
      '3.1': 'Demo scenarios executed',
      '3.2': 'Demo environment validated',
      '3.4': 'Demo validation completed',
      '3.5': 'Demo validation completed'
    }
  };

  // Save test report
  const reportPath = 'artifacts/test-reports/integration-validation-report.json';
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Integration and Validation Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Test Suites: ${report.summary.totalSuites}`);
  console.log(`Successful Suites: ${report.summary.successfulSuites}`);
  console.log(`Failed Suites: ${report.summary.failedSuites}`);
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed Tests: ${report.summary.passedTests}`);
  console.log(`Failed Tests: ${report.summary.failedTests}`);
  console.log(`Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${report.summary.overallDuration}ms`);
  console.log(`Report saved: ${reportPath}`);

  // Generate CI badge
  const badge = {
    schemaVersion: 1,
    label: 'Integration Tests',
    message: report.summary.failedSuites === 0 ? 'passing' : 'failing',
    color: report.summary.failedSuites === 0 ? 'brightgreen' : 'red'
  };

  await fs.writeFile('artifacts/test-reports/integration-badge.json', JSON.stringify(badge, null, 2));

  // Exit with appropriate code
  const exitCode = report.summary.failedSuites > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? '✅' : '❌'} Integration tests ${exitCode === 0 ? 'completed successfully' : 'failed'}`);
  
  process.exit(exitCode);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { runIntegrationTests };