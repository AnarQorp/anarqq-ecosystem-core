#!/usr/bin/env node

/**
 * Documentation Validation Integration Script
 * Integrates the enhanced validation system with existing npm scripts
 * and provides comprehensive validation orchestration
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import EnhancedDocumentationValidator from './docs-validator.mjs';

class ValidationIntegration {
  constructor() {
    this.validator = new EnhancedDocumentationValidator();
    this.results = {
      enhanced: null,
      existing: {
        index: null,
        quality: null,
        metadata: null,
        frontmatter: null
      }
    };
  }

  async init() {
    await this.validator.init();
  }

  /**
   * Run comprehensive validation suite integrating all systems
   */
  async runComprehensiveValidation() {
    console.log('🚀 Running comprehensive documentation validation suite...');
    console.log('This integrates enhanced validation with existing systems\n');

    // Run enhanced validation
    console.log('1️⃣ Running enhanced validation system...');
    this.results.enhanced = await this.validator.runFullValidation();

    // Run existing validation systems
    console.log('\n2️⃣ Running existing validation systems...');
    await this.runExistingValidations();

    // Generate integrated report
    console.log('\n3️⃣ Generating integrated validation report...');
    const integratedReport = await this.generateIntegratedReport();

    // Save comprehensive report
    await fs.writeFile(
      'docs/comprehensive-validation-report.json', 
      JSON.stringify(integratedReport, null, 2)
    );

    console.log('\n📄 Comprehensive report saved to docs/comprehensive-validation-report.json');

    return integratedReport;
  }

  async runExistingValidations() {
    const validations = [
      {
        name: 'index',
        command: 'npm run docs:index:validate',
        description: 'Master index validation'
      },
      {
        name: 'quality',
        command: 'npm run docs:quality:validate',
        description: 'Content quality validation'
      },
      {
        name: 'metadata',
        command: 'npm run docs:metadata:validate',
        description: 'Metadata validation'
      },
      {
        name: 'frontmatter',
        command: 'npm run docs:frontmatter:lint',
        description: 'Front matter linting'
      }
    ];

    for (const validation of validations) {
      try {
        console.log(`  🔍 Running ${validation.description}...`);
        execSync(validation.command, { stdio: 'pipe', timeout: 30000 });
        this.results.existing[validation.name] = { passed: true, error: null };
        console.log(`    ✅ ${validation.description} passed`);
      } catch (error) {
        this.results.existing[validation.name] = { 
          passed: false, 
          error: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString()
        };
        console.log(`    ❌ ${validation.description} failed`);
      }
    }
  }

  async generateIntegratedReport() {
    const enhancedResults = this.results.enhanced;
    const existingResults = this.results.existing;

    // Calculate overall status
    const enhancedPassed = enhancedResults.summary.passed;
    const existingPassed = Object.values(existingResults).every(result => result.passed);
    const overallPassed = enhancedPassed && existingPassed;

    // Count total issues
    const enhancedErrors = enhancedResults.summary.totalErrors;
    const enhancedWarnings = enhancedResults.summary.totalWarnings;
    
    const existingErrors = Object.values(existingResults)
      .filter(result => !result.passed).length;

    const report = {
      summary: {
        overallStatus: overallPassed ? 'PASS' : 'FAIL',
        timestamp: new Date().toISOString(),
        totalErrors: enhancedErrors + existingErrors,
        totalWarnings: enhancedWarnings,
        validationSystems: {
          enhanced: {
            status: enhancedPassed ? 'PASS' : 'FAIL',
            errors: enhancedErrors,
            warnings: enhancedWarnings,
            categories: Object.keys(enhancedResults.results).length
          },
          existing: {
            status: existingPassed ? 'PASS' : 'FAIL',
            systems: Object.keys(existingResults).length,
            failed: Object.values(existingResults).filter(r => !r.passed).length
          }
        }
      },

      enhancedValidation: enhancedResults,
      
      existingValidation: existingResults,

      recommendations: this.generateRecommendations(enhancedResults, existingResults),

      integrationStatus: {
        npmScriptsIntegrated: true,
        cicdReady: overallPassed,
        automationLevel: 'comprehensive'
      }
    };

    // Display summary
    this.displayIntegratedSummary(report);

    return report;
  }

  generateRecommendations(enhancedResults, existingResults) {
    const recommendations = [];

    // Enhanced validation recommendations
    if (!enhancedResults.summary.passed) {
      recommendations.push({
        priority: 'high',
        category: 'enhanced-validation',
        action: `Fix ${enhancedResults.summary.totalErrors} errors in enhanced validation`,
        impact: 'Critical for documentation quality and accessibility'
      });
    }

    // Existing validation recommendations
    const failedSystems = Object.entries(existingResults)
      .filter(([_, result]) => !result.passed)
      .map(([name, _]) => name);

    if (failedSystems.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'existing-validation',
        action: `Fix failing validation systems: ${failedSystems.join(', ')}`,
        impact: 'Ensures compatibility with existing workflows'
      });
    }

    // Structure recommendations
    if (enhancedResults.results.structure && !enhancedResults.results.structure.passed) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        action: 'Complete documentation structure migration',
        impact: 'Enables new documentation organization and video script generation'
      });
    }

    // Accessibility recommendations
    if (enhancedResults.results.accessibility && enhancedResults.results.accessibility.errors > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'accessibility',
        action: 'Fix accessibility issues (alt text, headings, links)',
        impact: 'Improves documentation accessibility for all users'
      });
    }

    // Video scripts recommendations
    if (enhancedResults.results.scripts && enhancedResults.results.scripts.errors > 0) {
      recommendations.push({
        priority: 'low',
        category: 'video-scripts',
        action: 'Complete video script validation and bilingual consistency',
        impact: 'Enables video content generation and multilingual support'
      });
    }

    return recommendations;
  }

  displayIntegratedSummary(report) {
    console.log('\n📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${report.summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`Total Warnings: ${report.summary.totalWarnings}`);
    console.log('');

    // Enhanced validation summary
    console.log('🔍 Enhanced Validation System:');
    const enhanced = report.summary.validationSystems.enhanced;
    console.log(`  Status: ${enhanced.status === 'PASS' ? '✅' : '❌'} ${enhanced.status}`);
    console.log(`  Errors: ${enhanced.errors}`);
    console.log(`  Warnings: ${enhanced.warnings}`);
    console.log(`  Categories: ${enhanced.categories}`);
    console.log('');

    // Existing validation summary
    console.log('🏗️ Existing Validation Systems:');
    const existing = report.summary.validationSystems.existing;
    console.log(`  Status: ${existing.status === 'PASS' ? '✅' : '❌'} ${existing.status}`);
    console.log(`  Systems: ${existing.systems}`);
    console.log(`  Failed: ${existing.failed}`);
    console.log('');

    // Show detailed results for enhanced validation
    if (report.enhancedValidation.results) {
      console.log('📋 Enhanced Validation Details:');
      Object.entries(report.enhancedValidation.results).forEach(([category, result]) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${category.padEnd(15)} - ${result.errors} errors, ${result.warnings} warnings`);
      });
      console.log('');
    }

    // Show existing system results
    console.log('🔧 Existing System Results:');
    Object.entries(report.existingValidation).forEach(([system, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${system.padEnd(15)} - ${result.passed ? 'passed' : 'failed'}`);
    });
    console.log('');

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${priority} ${rec.action}`);
        console.log(`     Impact: ${rec.impact}`);
      });
      console.log('');
    }

    // Integration status
    console.log('🔗 Integration Status:');
    console.log(`  NPM Scripts: ${report.integrationStatus.npmScriptsIntegrated ? '✅' : '❌'} Integrated`);
    console.log(`  CI/CD Ready: ${report.integrationStatus.cicdReady ? '✅' : '❌'} ${report.integrationStatus.cicdReady ? 'Ready' : 'Needs fixes'}`);
    console.log(`  Automation: ${report.integrationStatus.automationLevel}`);
  }

  /**
   * Run specific validation category
   */
  async runSpecificValidation(category) {
    console.log(`🔍 Running ${category} validation...`);
    
    await this.validator.init();
    
    switch (category) {
      case 'structure':
        await this.validator.validateNewStructure();
        return this.validator.validationResults.structure;
      
      case 'completeness':
        await this.validator.validateCompleteness();
        return this.validator.validationResults.completeness;
      
      case 'scripts':
        await this.validator.validateVideoScripts();
        return this.validator.validationResults.scripts;
      
      case 'accessibility':
        await this.validator.validateAccessibility();
        return this.validator.validationResults.accessibility;
      
      case 'code':
        await this.validator.validateCodeSnippets();
        return this.validator.validationResults.codeSnippets;
      
      case 'openapi':
        await this.validator.validateOpenAPISpecs();
        return this.validator.validationResults.openapi;
      
      case 'mcp':
        await this.validator.validateMCPSpecs();
        return this.validator.validationResults.mcp;
      
      case 'bilingual':
        await this.validator.validateBilingualConsistency();
        return this.validator.validationResults.bilingual;
      
      default:
        throw new Error(`Unknown validation category: ${category}`);
    }
  }

  /**
   * Generate CI/CD integration files
   */
  async generateCIIntegration() {
    console.log('🔧 Generating CI/CD integration files...');

    // GitHub Actions workflow
    const githubWorkflow = `name: Documentation Validation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'modules/**'
      - 'scripts/**'
  push:
    branches: [main]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run comprehensive documentation validation
      run: node scripts/docs-validation-integration.mjs comprehensive
    
    - name: Upload validation report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: validation-report
        path: docs/comprehensive-validation-report.json
        
    - name: Comment PR with validation results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const report = JSON.parse(fs.readFileSync('docs/comprehensive-validation-report.json', 'utf8'));
          
          const status = report.summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL';
          const errors = report.summary.totalErrors;
          const warnings = report.summary.totalWarnings;
          
          const comment = \`## Documentation Validation Results
          
          **Status:** \${status}
          **Errors:** \${errors}
          **Warnings:** \${warnings}
          
          ### Enhanced Validation
          - Structure: \${report.enhancedValidation.results.structure.passed ? '✅' : '❌'}
          - Completeness: \${report.enhancedValidation.results.completeness.passed ? '✅' : '❌'}
          - Accessibility: \${report.enhancedValidation.results.accessibility.passed ? '✅' : '❌'}
          - Code Snippets: \${report.enhancedValidation.results.codeSnippets.passed ? '✅' : '❌'}
          - Video Scripts: \${report.enhancedValidation.results.scripts.passed ? '✅' : '❌'}
          
          [View detailed report](https://github.com/\${context.repo.owner}/\${context.repo.repo}/actions/runs/\${context.runId})
          \`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
`;

    const workflowDir = '.github/workflows';
    await fs.mkdir(workflowDir, { recursive: true });
    await fs.writeFile(path.join(workflowDir, 'docs-validation.yml'), githubWorkflow);

    // Pre-commit hook
    const preCommitHook = `#!/bin/bash
# Pre-commit hook for documentation validation

echo "🔍 Running documentation validation..."

# Run quick validation checks
node scripts/docs-validator.mjs structure
STRUCTURE_EXIT=$?

node scripts/docs-validator.mjs accessibility  
A11Y_EXIT=$?

node scripts/docs-validator.mjs code
CODE_EXIT=$?

# Check if any validation failed
if [ $STRUCTURE_EXIT -ne 0 ] || [ $A11Y_EXIT -ne 0 ] || [ $CODE_EXIT -ne 0 ]; then
    echo "❌ Documentation validation failed. Please fix issues before committing."
    echo "Run 'npm run docs:validate:enhanced' for detailed report."
    exit 1
fi

echo "✅ Documentation validation passed"
exit 0
`;

    const hooksDir = '.git/hooks';
    try {
      await fs.mkdir(hooksDir, { recursive: true });
      await fs.writeFile(path.join(hooksDir, 'pre-commit'), preCommitHook);
      await fs.chmod(path.join(hooksDir, 'pre-commit'), 0o755);
      console.log('  ✅ Pre-commit hook installed');
    } catch (error) {
      console.log('  ⚠️  Could not install pre-commit hook (not in git repo?)');
    }

    console.log('  ✅ GitHub Actions workflow created');
    console.log('  ✅ CI/CD integration files generated');
  }
}

// CLI interface
async function main() {
  const integration = new ValidationIntegration();
  const command = process.argv[2];

  switch (command) {
    case 'comprehensive':
      await integration.init();
      const report = await integration.runComprehensiveValidation();
      process.exit(report.summary.overallStatus === 'PASS' ? 0 : 1);
      break;
    
    case 'category':
      const category = process.argv[3];
      if (!category) {
        console.error('Please specify a validation category');
        process.exit(1);
      }
      await integration.init();
      const result = await integration.runSpecificValidation(category);
      console.log(result.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(result.passed ? 0 : 1);
      break;
    
    case 'ci-setup':
      await integration.generateCIIntegration();
      break;
    
    default:
      console.log(`
Usage: node docs-validation-integration.mjs <command>

Commands:
  comprehensive  - Run complete integrated validation suite
  category <cat> - Run specific validation category
  ci-setup       - Generate CI/CD integration files

Categories:
  structure, completeness, scripts, accessibility, code, openapi, mcp, bilingual

Examples:
  node docs-validation-integration.mjs comprehensive
  node docs-validation-integration.mjs category accessibility
  node docs-validation-integration.mjs ci-setup
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation integration failed:', error);
    process.exit(1);
  });
}

export default ValidationIntegration;