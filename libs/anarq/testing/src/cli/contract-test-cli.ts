#!/usr/bin/env node

/**
 * Contract Test CLI
 * Command-line interface for running contract tests
 */

import { Command } from 'commander';
const program = new Command();
import { ContractTestRunner, ContractTestConfig } from '../contract/ContractTestRunner';
import { EnhancedContractTestRunner, EnhancedContractTestConfig } from '../contract/EnhancedContractTestRunner';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

interface CliOptions {
  modules?: string;
  output?: string;
  include?: string;
  exclude?: string;
  endpoints?: boolean;
  crossModule?: boolean;
  reports?: boolean;
  failOnWarnings?: boolean;
  parallel?: boolean;
  timeout?: number;
  verbose?: boolean;
  watch?: boolean;
  enhanced?: boolean;
  config?: string;
  performance?: boolean;
  security?: boolean;
  dependencies?: boolean;
}

async function runContractTests(options: CliOptions): Promise<void> {
  const modulesPath = resolve(options.modules || './modules');
  const outputPath = resolve(options.output || './test-results/contract-tests');

  // Validate modules path
  if (!existsSync(modulesPath)) {
    console.error(`❌ Modules path not found: ${modulesPath}`);
    process.exit(1);
  }

  const config: ContractTestConfig = {
    modulesPath,
    outputPath,
    includeModules: options.include ? options.include.split(',') : undefined,
    excludeModules: options.exclude ? options.exclude.split(',') : undefined,
    testEndpoints: options.endpoints || false,
    testCrossModule: options.crossModule !== false, // Default to true
    generateReports: options.reports !== false, // Default to true
    failOnWarnings: options.failOnWarnings || false,
    parallel: options.parallel !== false, // Default to true
    timeout: options.timeout || 30000
  };

  console.log('🚀 Starting Q Ecosystem Contract Tests\n');
  console.log(`📁 Modules path: ${modulesPath}`);
  console.log(`📊 Output path: ${outputPath}`);
  console.log(`⚙️  Configuration:`);
  console.log(`   - Test endpoints: ${config.testEndpoints}`);
  console.log(`   - Cross-module tests: ${config.testCrossModule}`);
  console.log(`   - Generate reports: ${config.generateReports}`);
  console.log(`   - Parallel execution: ${config.parallel}`);
  console.log(`   - Timeout: ${config.timeout}ms`);
  
  if (config.includeModules) {
    console.log(`   - Include modules: ${config.includeModules.join(', ')}`);
  }
  
  if (config.excludeModules) {
    console.log(`   - Exclude modules: ${config.excludeModules.join(', ')}`);
  }

  console.log('');

  try {
    let results;
    
    if (options.enhanced) {
      const enhancedConfig: EnhancedContractTestConfig = {
        ...config,
        configFile: options.config,
        enablePerformanceMonitoring: options.performance !== false,
        enableSecurityScanning: options.security === true,
        enableDependencyAnalysis: options.dependencies === true
      };
      
      const enhancedRunner = new EnhancedContractTestRunner(enhancedConfig);
      results = await enhancedRunner.runEnhancedTests();
    } else {
      const runner = new ContractTestRunner(config);
      results = await runner.runAllTests();
    }

    // Print summary
    console.log('\n📋 Test Results Summary:');
    console.log(`   Total: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`   📊 Coverage: ${results.summary.coverage.toFixed(1)}%`);
    console.log(`   ⏱️  Duration: ${(results.summary.duration / 1000).toFixed(2)}s`);

    // Print module results
    if (options.verbose) {
      console.log('\n📦 Module Details:');
      results.moduleResults.forEach((result, moduleName) => {
        const status = result.valid ? '✅' : '❌';
        console.log(`   ${status} ${moduleName}: ${result.coverage.percentage.toFixed(1)}% coverage`);
        
        if (result.errors.length > 0) {
          result.errors.forEach(error => {
            const icon = error.severity === 'ERROR' ? '❌' : '⚠️';
            console.log(`      ${icon} ${error.type}: ${error.message}`);
          });
        }
      });
    }

    // Print cross-module results
    if (config.testCrossModule && results.crossModuleResults.size > 0) {
      console.log('\n🔗 Cross-Module Compatibility:');
      results.crossModuleResults.forEach((errors, testName) => {
        const errorCount = errors.filter(e => e.severity === 'ERROR').length;
        const warningCount = errors.filter(e => e.severity === 'WARNING').length;
        const status = errorCount > 0 ? '❌' : warningCount > 0 ? '⚠️' : '✅';
        
        console.log(`   ${status} ${testName.replace('cross-module.', '')}`);
        
        if (options.verbose && errors.length > 0) {
          errors.forEach(error => {
            const icon = error.severity === 'ERROR' ? '❌' : '⚠️';
            console.log(`      ${icon} ${error.message}`);
          });
        }
      });
    }

    // Exit with appropriate code
    const hasErrors = results.summary.failed > 0;
    const hasWarnings = results.summary.warnings > 0;
    
    if (hasErrors) {
      console.log('\n❌ Contract tests failed!');
      process.exit(1);
    } else if (hasWarnings && config.failOnWarnings) {
      console.log('\n⚠️  Contract tests have warnings (failing due to --fail-on-warnings)!');
      process.exit(1);
    } else {
      console.log('\n✅ All contract tests passed!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error(`\n❌ Contract test execution failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function watchContractTests(options: CliOptions): Promise<void> {
  console.log('👀 Watching for changes...');
  
  const chokidar = await import('chokidar');
  const modulesPath = resolve(options.modules || './modules');
  
  // Watch for changes in contract files
  const watcher = chokidar.watch([
    `${modulesPath}/**/contracts/*.json`,
    `${modulesPath}/**/events/*.json`,
    `${modulesPath}/**/openapi.yaml`,
    `${modulesPath}/**/mcp.json`,
    `${modulesPath}/**/package.json`
  ], {
    ignored: /node_modules/,
    persistent: true
  });

  let isRunning = false;

  const runTests = async () => {
    if (isRunning) return;
    
    isRunning = true;
    console.log('\n🔄 Changes detected, running contract tests...');
    
    try {
      await runContractTests({ ...options, watch: false });
    } catch (error: any) {
      console.error('Test run failed:', error.message);
    } finally {
      isRunning = false;
      console.log('\n👀 Watching for changes...');
    }
  };

  watcher.on('change', runTests);
  watcher.on('add', runTests);
  watcher.on('unlink', runTests);

  // Run initial test
  await runTests();

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watch mode...');
    watcher.close();
    process.exit(0);
  });
}

// CLI Program Definition
program
  .name('contract-test')
  .description('Q Ecosystem Contract Testing CLI')
  .version('1.0.0');

program
  .command('run')
  .description('Run contract tests')
  .option('-m, --modules <path>', 'Path to modules directory', './modules')
  .option('-o, --output <path>', 'Output directory for reports', './test-results/contract-tests')
  .option('-i, --include <modules>', 'Comma-separated list of modules to include')
  .option('-e, --exclude <modules>', 'Comma-separated list of modules to exclude')
  .option('--endpoints', 'Test API endpoints (requires running services)', false)
  .option('--no-cross-module', 'Skip cross-module compatibility tests')
  .option('--no-reports', 'Skip report generation')
  .option('--fail-on-warnings', 'Fail on warnings', false)
  .option('--no-parallel', 'Run tests sequentially')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--enhanced', 'Use enhanced testing with quality gates', false)
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--performance', 'Enable performance monitoring', false)
  .option('--security', 'Enable security scanning', false)
  .option('--dependencies', 'Enable dependency analysis', false)
  .action(runContractTests);

program
  .command('watch')
  .description('Watch for changes and run contract tests')
  .option('-m, --modules <path>', 'Path to modules directory', './modules')
  .option('-o, --output <path>', 'Output directory for reports', './test-results/contract-tests')
  .option('-i, --include <modules>', 'Comma-separated list of modules to include')
  .option('-e, --exclude <modules>', 'Comma-separated list of modules to exclude')
  .option('--no-cross-module', 'Skip cross-module compatibility tests')
  .option('--no-reports', 'Skip report generation')
  .option('--fail-on-warnings', 'Fail on warnings', false)
  .option('--no-parallel', 'Run tests sequentially')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('-v, --verbose', 'Verbose output', false)
  .action(watchContractTests);

program
  .command('validate')
  .description('Validate a single module contract')
  .argument('<module>', 'Module name or path')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (modulePath: string, options: { verbose?: boolean }) => {
    try {
      const { ContractValidator } = await import('../contract/ContractValidator');
      const validator = new ContractValidator();
      
      const fullPath = existsSync(modulePath) ? modulePath : join('./modules', modulePath);
      
      if (!existsSync(fullPath)) {
        console.error(`❌ Module not found: ${fullPath}`);
        process.exit(1);
      }

      console.log(`🔍 Validating module contract: ${fullPath}`);
      
      const result = await validator.validateModuleContract(fullPath);
      
      console.log(`\n📋 Validation Results:`);
      console.log(`   Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   Coverage: ${result.coverage.percentage.toFixed(1)}%`);
      console.log(`   Errors: ${result.errors.filter(e => e.severity === 'ERROR').length}`);
      console.log(`   Warnings: ${result.errors.filter(e => e.severity === 'WARNING').length}`);

      if (options.verbose && result.errors.length > 0) {
        console.log('\n📝 Details:');
        result.errors.forEach(error => {
          const icon = error.severity === 'ERROR' ? '❌' : '⚠️';
          console.log(`   ${icon} ${error.type} at ${error.path}: ${error.message}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
        });
      }

      process.exit(result.valid ? 0 : 1);
    } catch (error: any) {
      console.error(`❌ Validation failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse(process.argv);
}