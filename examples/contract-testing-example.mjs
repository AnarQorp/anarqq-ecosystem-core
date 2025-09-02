#!/usr/bin/env node

/**
 * Contract Testing Example
 * Demonstrates how to use the Q Ecosystem Contract Testing Suite
 */

import { ContractTestRunner } from '../libs/anarq/testing/dist/index.js';
import { join } from 'path';

async function runContractTestingExample() {
  console.log('🚀 Q Ecosystem Contract Testing Example\n');

  // Configuration
  const config = {
    modulesPath: './modules',
    outputPath: './test-results/contract-tests-example',
    includeModules: ['qchat', 'qdrive', 'qwallet'], // Test specific modules
    testCrossModule: true,
    generateReports: true,
    parallel: true,
    timeout: 30000
  };

  console.log('⚙️  Configuration:');
  console.log(`   Modules path: ${config.modulesPath}`);
  console.log(`   Output path: ${config.outputPath}`);
  console.log(`   Include modules: ${config.includeModules.join(', ')}`);
  console.log(`   Cross-module tests: ${config.testCrossModule}`);
  console.log(`   Generate reports: ${config.generateReports}`);
  console.log(`   Parallel execution: ${config.parallel}`);
  console.log('');

  try {
    // Create test runner
    const runner = new ContractTestRunner(config);

    // Discover modules
    console.log('🔍 Discovering modules...');
    const modules = await runner.discoverModules();
    console.log(`   Found ${modules.length} modules: ${modules.join(', ')}\n`);

    // Run all tests
    console.log('🧪 Running contract tests...');
    const startTime = Date.now();
    const results = await runner.runAllTests();
    const duration = Date.now() - startTime;

    // Display results
    console.log('\n📊 Test Results:');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Total tests: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`   📊 Coverage: ${results.summary.coverage.toFixed(1)}%`);

    // Module-specific results
    console.log('\n📦 Module Results:');
    results.moduleResults.forEach((result, moduleName) => {
      const status = result.valid ? '✅' : '❌';
      const errorCount = result.errors.filter(e => e.severity === 'ERROR').length;
      const warningCount = result.errors.filter(e => e.severity === 'WARNING').length;
      
      console.log(`   ${status} ${moduleName}:`);
      console.log(`      Coverage: ${result.coverage.percentage.toFixed(1)}%`);
      console.log(`      Errors: ${errorCount}`);
      console.log(`      Warnings: ${warningCount}`);

      // Show first few errors if any
      if (errorCount > 0) {
        const errors = result.errors.filter(e => e.severity === 'ERROR').slice(0, 3);
        errors.forEach(error => {
          console.log(`         ❌ ${error.type}: ${error.message}`);
        });
        if (errorCount > 3) {
          console.log(`         ... and ${errorCount - 3} more errors`);
        }
      }
    });

    // Cross-module compatibility
    if (results.crossModuleResults.size > 0) {
      console.log('\n🔗 Cross-Module Compatibility:');
      results.crossModuleResults.forEach((errors, testName) => {
        const errorCount = errors.filter(e => e.severity === 'ERROR').length;
        const warningCount = errors.filter(e => e.severity === 'WARNING').length;
        const status = errorCount > 0 ? '❌' : warningCount > 0 ? '⚠️' : '✅';
        
        console.log(`   ${status} ${testName.replace('cross-module.', '')}`);
        if (errorCount > 0) {
          console.log(`      Errors: ${errorCount}`);
        }
        if (warningCount > 0) {
          console.log(`      Warnings: ${warningCount}`);
        }
      });
    }

    // Quality assessment
    console.log('\n🎯 Quality Assessment:');
    
    const qualityScore = calculateQualityScore(results);
    console.log(`   Overall Quality Score: ${qualityScore.toFixed(1)}/100`);
    
    if (results.summary.coverage < 80) {
      console.log('   📈 Recommendation: Increase test coverage to at least 80%');
    }
    
    if (results.summary.failed > 0) {
      console.log('   🔧 Action Required: Fix failing contract tests');
    }
    
    if (results.summary.warnings > 10) {
      console.log('   ⚠️  Consider: Address warning issues to improve quality');
    }

    // Success/failure determination
    const success = results.summary.failed === 0 && results.summary.coverage >= 70;
    
    if (success) {
      console.log('\n✅ Contract testing completed successfully!');
      console.log(`📊 Reports available at: ${config.outputPath}`);
    } else {
      console.log('\n❌ Contract testing found issues that need attention.');
      console.log(`📊 Detailed reports available at: ${config.outputPath}`);
    }

    return success;

  } catch (error) {
    console.error(`\n❌ Contract testing failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(results) {
  const coverageScore = Math.min(results.summary.coverage, 100);
  const passRate = results.summary.total > 0 ? 
    (results.summary.passed / results.summary.total) * 100 : 0;
  const warningPenalty = Math.min(results.summary.warnings * 2, 20);
  
  return Math.max(0, (coverageScore * 0.4) + (passRate * 0.5) - warningPenalty + 10);
}

/**
 * Example of individual module validation
 */
async function validateSingleModule(moduleName) {
  console.log(`\n🔍 Validating individual module: ${moduleName}`);
  
  try {
    const { ContractValidator } = await import('../libs/anarq/testing/dist/index.js');
    const validator = new ContractValidator();
    
    const modulePath = join('./modules', moduleName);
    const result = await validator.validateModuleContract(modulePath);
    
    console.log(`   Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Coverage: ${result.coverage.percentage.toFixed(1)}%`);
    console.log(`   Errors: ${result.errors.filter(e => e.severity === 'ERROR').length}`);
    console.log(`   Warnings: ${result.errors.filter(e => e.severity === 'WARNING').length}`);
    
    if (result.errors.length > 0) {
      console.log('\n   Issues found:');
      result.errors.slice(0, 5).forEach(error => {
        const icon = error.severity === 'ERROR' ? '❌' : '⚠️';
        console.log(`   ${icon} ${error.type} at ${error.path}: ${error.message}`);
      });
      
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more issues`);
      }
    }
    
    return result.valid;
    
  } catch (error) {
    console.error(`   ❌ Validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Example of schema validation
 */
async function validateSchemaExample() {
  console.log('\n🧪 Schema Validation Example');
  
  try {
    const { ContractValidator } = await import('../libs/anarq/testing/dist/index.js');
    const validator = new ContractValidator();
    
    // Example schema
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0, maximum: 150 },
        active: { type: 'boolean' }
      },
      required: ['id', 'name', 'email']
    };
    
    // Generate test data
    console.log('   Generating test data from schema...');
    const testData = validator.generateTestData(schema);
    console.log('   Generated data:', JSON.stringify(testData, null, 2));
    
    // Validate the generated data
    console.log('   Validating generated data against schema...');
    const errors = validator.validateSchema(schema, testData, 'example-schema');
    
    if (errors.length === 0) {
      console.log('   ✅ Generated data is valid!');
    } else {
      console.log('   ❌ Validation errors:');
      errors.forEach(error => {
        console.log(`      - ${error.message}`);
      });
    }
    
    return errors.length === 0;
    
  } catch (error) {
    console.error(`   ❌ Schema validation example failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🎯 Q Ecosystem Contract Testing Examples\n');
  
  // Run full contract testing example
  const fullTestSuccess = await runContractTestingExample();
  
  // Run individual module validation example
  const moduleValidationSuccess = await validateSingleModule('qchat');
  
  // Run schema validation example
  const schemaValidationSuccess = await validateSchemaExample();
  
  console.log('\n📋 Example Summary:');
  console.log(`   Full contract testing: ${fullTestSuccess ? '✅' : '❌'}`);
  console.log(`   Module validation: ${moduleValidationSuccess ? '✅' : '❌'}`);
  console.log(`   Schema validation: ${schemaValidationSuccess ? '✅' : '❌'}`);
  
  const allSuccess = fullTestSuccess && moduleValidationSuccess && schemaValidationSuccess;
  
  if (allSuccess) {
    console.log('\n🎉 All examples completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Integrate contract tests into your CI/CD pipeline');
    console.log('   2. Set up quality gates based on coverage and error thresholds');
    console.log('   3. Configure automated notifications for test failures');
    console.log('   4. Review and address any contract violations found');
  } else {
    console.log('\n⚠️  Some examples encountered issues.');
    console.log('   Check the detailed output above for more information.');
  }
  
  process.exit(allSuccess ? 0 : 1);
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Examples failed:', error);
    process.exit(1);
  });
}