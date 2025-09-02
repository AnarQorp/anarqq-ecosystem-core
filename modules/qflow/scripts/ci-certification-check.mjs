#!/usr/bin/env node

/**
 * CI Certification Check
 * 
 * Lightweight CI integration for the No Central Server Certification
 * Designed to run in CI/CD pipelines with proper exit codes and reporting
 * 
 * Task 17.5 Implementation - CI Integration
 */

import { CertificationEngine, CONFIG } from './no-central-server-certification.mjs';
import fs from 'fs/promises';
import path from 'path';

class CICertificationCheck {
  constructor(options = {}) {
    this.options = {
      failOnWarnings: options.failOnWarnings || false,
      minScore: options.minScore || 70,
      outputFormat: options.outputFormat || 'text', // text, json, junit
      outputFile: options.outputFile || null,
      skipChecks: options.skipChecks || [],
      ...options
    };
  }

  async run() {
    console.log('🔄 Running CI Certification Check...');
    
    const engine = new CertificationEngine();
    const passed = await engine.runCertification();
    const results = engine.results;

    // Apply CI-specific rules
    const ciPassed = this.evaluateCIRules(results);

    // Generate CI-specific output
    await this.generateOutput(results, ciPassed);

    // Print CI summary
    this.printCISummary(results, ciPassed);

    return ciPassed;
  }

  evaluateCIRules(results) {
    let passed = results.passed;

    // Check minimum score requirement
    if (results.score < this.options.minScore) {
      console.log(`❌ Score ${results.score} below minimum required ${this.options.minScore}`);
      passed = false;
    }

    // Check if we should fail on warnings
    if (this.options.failOnWarnings && results.warnings.length > 0) {
      console.log(`❌ Failing due to ${results.warnings.length} warnings (failOnWarnings=true)`);
      passed = false;
    }

    // Check for critical violations
    if (results.violations.length > 0) {
      console.log(`❌ ${results.violations.length} critical violations found`);
      passed = false;
    }

    return passed;
  }

  async generateOutput(results, passed) {
    if (!this.options.outputFile) return;

    let output;
    
    switch (this.options.outputFormat) {
      case 'json':
        output = JSON.stringify({
          passed,
          score: results.score,
          violations: results.violations.length,
          warnings: results.warnings.length,
          timestamp: results.timestamp,
          details: results
        }, null, 2);
        break;

      case 'junit':
        output = this.generateJUnitXML(results, passed);
        break;

      case 'text':
      default:
        output = this.generateTextReport(results, passed);
        break;
    }

    await fs.writeFile(this.options.outputFile, output);
    console.log(`📄 CI report saved to: ${this.options.outputFile}`);
  }

  generateJUnitXML(results, passed) {
    const testCases = Object.entries(results.checks).map(([checkName, checkResult]) => {
      const violations = checkResult.violations || 0;
      const warnings = checkResult.warnings || 0;
      const failed = violations > 0;
      
      let testCase = `    <testcase name="${checkName}" classname="CentralizationCheck">`;
      
      if (failed) {
        testCase += `
      <failure message="${violations} violations found">
        ${checkResult.details?.map(d => d.message).join('\n') || 'Check failed'}
      </failure>`;
      } else if (warnings > 0) {
        testCase += `
      <system-out>${warnings} warnings found</system-out>`;
      }
      
      testCase += `
    </testcase>`;
      
      return testCase;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="No Central Server Certification" 
           tests="${Object.keys(results.checks).length}" 
           failures="${results.violations.length}" 
           errors="0" 
           time="0">
${testCases.join('\n')}
</testsuite>`;
  }

  generateTextReport(results, passed) {
    const lines = [
      '# No Central Server Certification Report',
      '',
      `**Status:** ${passed ? 'PASSED ✅' : 'FAILED ❌'}`,
      `**Score:** ${results.score}/100`,
      `**Violations:** ${results.violations.length}`,
      `**Warnings:** ${results.warnings.length}`,
      `**Timestamp:** ${results.timestamp}`,
      '',
      '## Check Results',
      ''
    ];

    for (const [checkName, checkResult] of Object.entries(results.checks)) {
      const violations = checkResult.violations || 0;
      const warnings = checkResult.warnings || 0;
      const status = violations === 0 ? '✅' : '❌';
      
      lines.push(`- **${checkName}:** ${status} (${violations} violations, ${warnings} warnings)`);
    }

    if (results.violations.length > 0) {
      lines.push('', '## Critical Violations', '');
      results.violations.forEach((violation, index) => {
        lines.push(`${index + 1}. ${violation.message}`);
      });
    }

    if (results.warnings.length > 0) {
      lines.push('', '## Warnings', '');
      results.warnings.slice(0, 10).forEach((warning, index) => {
        lines.push(`${index + 1}. ${warning.message}`);
      });
    }

    return lines.join('\n');
  }

  printCISummary(results, passed) {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🤖 CI CERTIFICATION SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Score: ${results.score}/${this.options.minScore} (min required)`);
    console.log(`Violations: ${results.violations.length}`);
    console.log(`Warnings: ${results.warnings.length}`);
    
    if (this.options.failOnWarnings) {
      console.log('⚠️  Failing on warnings: ENABLED');
    }

    console.log('═══════════════════════════════════════');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--fail-on-warnings':
        options.failOnWarnings = true;
        break;
      case '--min-score':
        options.minScore = parseInt(args[++i]);
        break;
      case '--output-format':
        options.outputFormat = args[++i];
        break;
      case '--output-file':
        options.outputFile = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  try {
    const checker = new CICertificationCheck(options);
    const passed = await checker.run();
    
    // Set appropriate exit code for CI
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ CI Certification Check failed:', error.message);
    process.exit(2); // System error
  }
}

function printHelp() {
  console.log(`
🤖 CI Certification Check

USAGE:
  node ci-certification-check.mjs [options]

OPTIONS:
  --fail-on-warnings      Fail the check if warnings are found
  --min-score <number>    Minimum score required to pass (default: 85)
  --output-format <type>  Output format: text, json, junit (default: text)
  --output-file <path>    Save report to file
  --help, -h              Show this help message

EXAMPLES:
  # Basic CI check
  node ci-certification-check.mjs

  # Strict mode with JUnit output
  node ci-certification-check.mjs --fail-on-warnings --output-format junit --output-file results.xml

  # Custom minimum score
  node ci-certification-check.mjs --min-score 90

EXIT CODES:
  0  - Certification passed
  1  - Certification failed
  2  - System error

This tool is designed for CI/CD integration and provides appropriate exit codes
and output formats for automated testing pipelines.
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ CI check failed:', error);
    process.exit(2);
  });
}

export { CICertificationCheck };