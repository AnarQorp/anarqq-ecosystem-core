#!/usr/bin/env node
/**
 * Integration Test Runner Script
 * 
 * Main entry point for running comprehensive Qflow integration tests
 * including ecosystem integration, multi-tenant isolation, and end-to-end scenarios.
 */
import { Command } from 'commander';
import { IntegrationTestRunner, TestRunnerConfig } from './IntegrationTestRunner';
import { EcosystemIntegrationTests, EcosystemTestConfig } from './EcosystemIntegrationTests';
import { MultiTenantIsolationTests, TenantTestConfig } from './MultiTenantIsolationTests';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuiteConfig {
  runner: TestRunnerConfig;
  ecosystem: EcosystemTestConfig;
  multiTenant: TenantTestConfig;
}

const program = new Command();

program
  .name('qflow-integration-tests')
  .description('Qflow Integration Test Suite')
  .version('1.0.0');

program
  .command('run')
  .description('Run all integration tests')
  .option('-c, --config <path>', 'Configuration file path', './test-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './test-reports')
  .option('-f, --format <format>', 'Report format (json|xml|html|console)', 'console')
  .option('--metrics', 'Enable metrics collection', false)
  .option('--coverage', 'Enable code coverage', false)
  .option('--parallel', 'Run tests in parallel', false)
  .option('--timeout <ms>', 'Test timeout in milliseconds', '300000')
  .option('--tags <tags>', 'Run tests with specific tags (comma-separated)')
  .option('--exclude-tags <tags>', 'Exclude tests with specific tags (comma-separated)')
  .option('--ecosystem-only', 'Run only ecosystem integration tests', false)
  .option('--isolation-only', 'Run only multi-tenant isolation tests', false)
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log('🚀 Starting Qflow Integration Test Suite...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runIntegrationTests(config, options);
      
      console.log('\n✅ Integration test suite completed successfully!');
      
      // Exit with appropriate code
      const hasFailures = results.some(result => 
        result.summary && result.summary.failed > 0
      );
      
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
      process.exit(1);
    }
  });

program
  .command('ecosystem')
  .description('Run ecosystem integration tests only')
  .option('-c, --config <path>', 'Configuration file path', './test-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './test-reports')
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log('🔗 Running Ecosystem Integration Tests...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runEcosystemTests(config.ecosystem, options);
      
      console.log('\n✅ Ecosystem integration tests completed!');
      
      const hasFailures = Array.from(results.values()).some(result => 
        result.status === 'failed'
      );
      
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Ecosystem integration tests failed:', error);
      process.exit(1);
    }
  });

program
  .command('isolation')
  .description('Run multi-tenant isolation tests only')
  .option('-c, --config <path>', 'Configuration file path', './test-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './test-reports')
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log('🏢 Running Multi-Tenant Isolation Tests...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runIsolationTests(config.multiTenant, options);
      
      console.log('\n✅ Multi-tenant isolation tests completed!');
      
      const hasFailures = results.some(result => result.status === 'failed');
      
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Multi-tenant isolation tests failed:', error);
      process.exit(1);
    }
  });

program
  .command('generate-config')
  .description('Generate default test configuration')
  .option('-o, --output <path>', 'Output file path', './test-config.json')
  .action(async (options) => {
    try {
      const defaultConfig = generateDefaultConfiguration();
      fs.writeFileSync(options.output, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ Default configuration generated at: ${options.output}`);
    } catch (error) {
      console.error('❌ Failed to generate configuration:', error);
      process.exit(1);
    }
  });

/**
 * Load test configuration from file
 */
async function loadConfiguration(configPath: string): Promise<TestSuiteConfig> {
  try {
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️  Configuration file not found: ${configPath}`);
      console.log('📝 Generating default configuration...');
      const defaultConfig = generateDefaultConfiguration();
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ Default configuration created at: ${configPath}`);
      return defaultConfig;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    console.log(`📋 Loaded configuration from: ${configPath}`);
    return config;
    
  } catch (error) {
    console.error(`❌ Failed to load configuration from ${configPath}:`, error);
    throw error;
  }
}

/**
 * Generate default test configuration
 */
function generateDefaultConfiguration(): TestSuiteConfig {
  return {
    runner: {
      outputDir: './test-reports',
      reportFormat: 'console',
      enableMetrics: true,
      enableCoverage: false,
      parallel: false,
      maxRetries: 0,
      timeout: 300000
    },
    ecosystem: {
      enableRealServices: false,
      serviceEndpoints: {
        squid: 'http://localhost:8001',
        qlock: 'http://localhost:8002',
        qonsent: 'http://localhost:8003',
        qindex: 'http://localhost:8004',
        qerberos: 'http://localhost:8005',
        qnet: 'http://localhost:8006'
      },
      testDataSets: {
        identities: [
          {
            id: 'test-user-1',
            publicKey: 'mock-public-key-1',
            privateKey: 'mock-private-key-1',
            signature: 'mock-signature-1',
            permissions: ['read', 'write', 'execute']
          },
          {
            id: 'test-user-2',
            publicKey: 'mock-public-key-2',
            privateKey: 'mock-private-key-2',
            signature: 'mock-signature-2',
            permissions: ['read']
          }
        ],
        permissions: [
          {
            identity: 'test-user-1',
            resource: 'sensitive-data',
            actions: ['read', 'write'],
            expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        encryptionKeys: [
          {
            id: 'test-encryption-key',
            algorithm: 'AES-256-GCM',
            key: 'mock-encryption-key',
            purpose: 'data-protection'
          }
        ],
        flows: []
      },
      securityLevel: 'high'
    },
    multiTenant: {
      tenants: [
        {
          id: 'tenant-1',
          name: 'Test Tenant 1',
          daoSubnet: 'dao-subnet-1',
          identities: ['tenant-1-user-1', 'tenant-1-user-2'],
          resources: [
            {
              id: 'tenant-1-data',
              type: 'data',
              classification: 'confidential',
              owner: 'tenant-1-user-1',
              accessList: ['tenant-1-user-1', 'tenant-1-user-2']
            }
          ],
          permissions: [
            {
              identity: 'tenant-1-user-1',
              resource: 'tenant-1-data',
              actions: ['read', 'write', 'delete']
            }
          ],
          encryptionKeys: ['tenant-1-key']
        },
        {
          id: 'tenant-2',
          name: 'Test Tenant 2',
          daoSubnet: 'dao-subnet-2',
          identities: ['tenant-2-user-1'],
          resources: [
            {
              id: 'tenant-2-data',
              type: 'data',
              classification: 'internal',
              owner: 'tenant-2-user-1',
              accessList: ['tenant-2-user-1']
            }
          ],
          permissions: [
            {
              identity: 'tenant-2-user-1',
              resource: 'tenant-2-data',
              actions: ['read', 'write']
            }
          ],
          encryptionKeys: ['tenant-2-key']
        }
      ],
      isolationLevel: 'strict',
      resourceLimits: {
        maxConcurrentFlows: 10,
        maxMemoryMB: 1024,
        maxCpuCores: 2,
        maxStorageGB: 10,
        maxNetworkBandwidthMbps: 100,
        maxExecutionTimeMs: 60000
      },
      securityPolicies: [
        {
          id: 'tenant-isolation-policy',
          name: 'Tenant Isolation Policy',
          rules: [
            {
              condition: 'cross_tenant_access_attempt',
              action: 'deny',
              message: 'Cross-tenant access denied'
            }
          ],
          enforcement: 'strict'
        }
      ]
    }
  };
}

/**
 * Run all integration tests
 */
async function runIntegrationTests(config: TestSuiteConfig, options: any): Promise<any[]> {
  const results: any[] = [];
  
  // Configure runner options
  const runnerConfig: TestRunnerConfig = {
    ...config.runner,
    outputDir: options.output || config.runner.outputDir,
    reportFormat: options.format || config.runner.reportFormat,
    enableMetrics: options.metrics || config.runner.enableMetrics,
    enableCoverage: options.coverage || config.runner.enableCoverage,
    parallel: options.parallel || config.runner.parallel,
    timeout: parseInt(options.timeout) || config.runner.timeout,
    tags: options.tags ? options.tags.split(',') : undefined,
    excludeTags: options.excludeTags ? options.excludeTags.split(',') : undefined
  };

  if (!options.isolationOnly) {
    console.log('🧪 Running comprehensive integration tests...');
    const runner = new IntegrationTestRunner(runnerConfig);
    const testReport = await runner.runTests();
    results.push(testReport);
  }

  if (!options.ecosystemOnly) {
    console.log('\n🔗 Running ecosystem integration tests...');
    const ecosystemResults = await runEcosystemTests(config.ecosystem, options);
    results.push({ ecosystem: ecosystemResults });
  }

  if (!options.ecosystemOnly) {
    console.log('\n🏢 Running multi-tenant isolation tests...');
    const isolationResults = await runIsolationTests(config.multiTenant, options);
    results.push({ isolation: isolationResults });
  }

  return results;
}

/**
 * Run ecosystem integration tests
 */
async function runEcosystemTests(config: EcosystemTestConfig, options: any): Promise<Map<string, any>> {
  const ecosystemTests = new EcosystemIntegrationTests(config);
  
  ecosystemTests.on('test_started', (event) => {
    if (options.verbose) {
      console.log(`  🔄 ${event.testName}...`);
    }
  });
  
  ecosystemTests.on('test_completed', (event) => {
    const status = event.status === 'passed' ? '✅' : '❌';
    console.log(`  ${status} ${event.testName}`);
  });

  try {
    const results = await ecosystemTests.runAllEcosystemTests();
    
    // Generate and save report
    const report = ecosystemTests.generateEcosystemReport();
    const reportPath = path.join(options.output || './test-reports', 'ecosystem-integration-report.json');
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Ecosystem integration report saved to: ${reportPath}`);
    
    return results;
  } finally {
    await ecosystemTests.cleanup();
  }
}

/**
 * Run multi-tenant isolation tests
 */
async function runIsolationTests(config: TenantTestConfig, options: any): Promise<any[]> {
  const isolationTests = new MultiTenantIsolationTests(config);
  
  isolationTests.on('test_started', (event) => {
    if (options.verbose) {
      console.log(`  🔄 ${event.testName}...`);
    }
  });
  
  isolationTests.on('test_completed', (event) => {
    const status = event.status === 'passed' ? '✅' : event.status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${status} ${event.testName}`);
  });

  try {
    const results = await isolationTests.runAllIsolationTests();
    
    // Generate and save report
    const report = isolationTests.generateIsolationReport();
    const reportPath = path.join(options.output || './test-reports', 'isolation-test-report.json');
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Isolation test report saved to: ${reportPath}`);
    
    return results;
  } finally {
    await isolationTests.cleanup();
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}