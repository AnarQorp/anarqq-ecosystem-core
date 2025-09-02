#!/usr/bin/env node
/**
 * Performance Test Runner Script
 * 
 * Main entry point for running comprehensive Qflow performance and load tests
 * including stress testing, scalability validation, and endurance testing.
 */
import { Command } from 'commander';
import { PerformanceTestSuite, PerformanceTestConfig } from './PerformanceTestSuite';
import { LoadTestRunner, LoadTestConfig } from './LoadTestRunner';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceTestConfiguration {
  performance: PerformanceTestConfig;
  loadTesting: LoadTestConfig;
  reporting: ReportingConfig;
  environment: EnvironmentConfig;
}

interface ReportingConfig {
  outputDir: string;
  formats: ('json' | 'html' | 'csv' | 'xml')[];
  enableRealTimeReporting: boolean;
  enableDetailedMetrics: boolean;
  retentionDays: number;
}

interface EnvironmentConfig {
  testEnvironment: 'local' | 'staging' | 'production';
  nodeConfiguration: NodeConfig;
  networkSimulation: NetworkSimulationConfig;
  dataGeneration: DataGenerationConfig;
}

interface NodeConfig {
  nodeCount: number;
  nodeSpecs: {
    cpu: number;
    memory: number;
    storage: number;
  };
  distribution: 'single' | 'multi_region' | 'multi_cloud';
}

interface NetworkSimulationConfig {
  enabled: boolean;
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
}

interface DataGenerationConfig {
  generateTestData: boolean;
  dataVolume: 'small' | 'medium' | 'large' | 'xlarge';
  dataTypes: string[];
  dataComplexity: 'simple' | 'complex' | 'mixed';
}

const program = new Command();

program
  .name('qflow-performance-tests')
  .description('Qflow Performance and Load Testing Suite')
  .version('1.0.0');

program
  .command('run')
  .description('Run all performance tests')
  .option('-c, --config <path>', 'Configuration file path', './performance-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './performance-reports')
  .option('-f, --format <formats>', 'Report formats (json,html,csv,xml)', 'json,html')
  .option('--duration <ms>', 'Test duration in milliseconds', '300000')
  .option('--users <count>', 'Number of concurrent users', '100')
  .option('--rps <rate>', 'Requests per second', '50')
  .option('--stress', 'Enable stress testing', false)
  .option('--load-only', 'Run only load tests', false)
  .option('--perf-only', 'Run only performance tests', false)
  .option('--verbose', 'Verbose output', false)
  .option('--real-time', 'Enable real-time reporting', false)
  .action(async (options) => {
    try {
      console.log('🚀 Starting Qflow Performance Test Suite...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runPerformanceTests(config, options);
      
      console.log('\n✅ Performance test suite completed successfully!');
      
      // Exit with appropriate code
      const hasFailures = results.some(result => 
        result.status === 'failed' || (result.summary && result.summary.failed > 0)
      );
      
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      process.exit(1);
    }
  });

program
  .command('load')
  .description('Run load tests only')
  .option('-c, --config <path>', 'Configuration file path', './performance-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './performance-reports')
  .option('--scenario <name>', 'Run specific scenario')
  .option('--users <count>', 'Number of concurrent users', '100')
  .option('--duration <ms>', 'Test duration in milliseconds', '300000')
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log('📈 Running Load Tests...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runLoadTests(config.loadTesting, options);
      
      console.log('\n✅ Load tests completed!');
      
      const hasFailures = results.some(result => result.status === 'failed');
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Load tests failed:', error);
      process.exit(1);
    }
  });

program
  .command('stress')
  .description('Run stress tests only')
  .option('-c, --config <path>', 'Configuration file path', './performance-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './performance-reports')
  .option('--memory-multiplier <factor>', 'Memory stress multiplier', '2.0')
  .option('--cpu-multiplier <factor>', 'CPU stress multiplier', '2.0')
  .option('--duration <ms>', 'Stress test duration', '180000')
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      console.log('💪 Running Stress Tests...\n');
      
      const config = await loadConfiguration(options.config);
      
      // Enable stress testing
      config.performance.stressTestConfig.enableStressTesting = true;
      config.performance.stressTestConfig.memoryStressMultiplier = parseFloat(options.memoryMultiplier);
      config.performance.stressTestConfig.cpuStressMultiplier = parseFloat(options.cpuMultiplier);
      
      const results = await runStressTests(config.performance, options);
      
      console.log('\n✅ Stress tests completed!');
      
      const hasFailures = results.some(result => result.status === 'failed');
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Stress tests failed:', error);
      process.exit(1);
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-c, --config <path>', 'Configuration file path', './performance-config.json')
  .option('-o, --output <dir>', 'Output directory for reports', './performance-reports')
  .option('--baseline', 'Establish performance baseline', false)
  .option('--compare <path>', 'Compare with previous results')
  .option('--threshold <percent>', 'Performance regression threshold', '10')
  .action(async (options) => {
    try {
      console.log('📊 Running Performance Benchmarks...\n');
      
      const config = await loadConfiguration(options.config);
      const results = await runBenchmarks(config.performance, options);
      
      console.log('\n✅ Benchmarks completed!');
      
      if (options.compare) {
        const comparison = await compareResults(results, options.compare, parseFloat(options.threshold));
        displayComparison(comparison);
      }
      
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Benchmarks failed:', error);
      process.exit(1);
    }
  });

program
  .command('generate-config')
  .description('Generate default performance test configuration')
  .option('-o, --output <path>', 'Output file path', './performance-config.json')
  .option('--template <type>', 'Configuration template (basic|advanced|enterprise)', 'basic')
  .action(async (options) => {
    try {
      const defaultConfig = generateDefaultConfiguration(options.template);
      fs.writeFileSync(options.output, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ Default configuration generated at: ${options.output}`);
    } catch (error) {
      console.error('❌ Failed to generate configuration:', error);
      process.exit(1);
    }
  });

/**
 * Load performance test configuration from file
 */
async function loadConfiguration(configPath: string): Promise<PerformanceTestConfiguration> {
  try {
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️  Configuration file not found: ${configPath}`);
      console.log('📝 Generating default configuration...');
      const defaultConfig = generateDefaultConfiguration('basic');
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
 * Generate default performance test configuration
 */
function generateDefaultConfiguration(template: string): PerformanceTestConfiguration {
  const baseConfig = {
    performance: {
      loadProfiles: [
        {
          name: 'baseline',
          description: 'Baseline performance test',
          duration: 300000, // 5 minutes
          rampUpTime: 60000, // 1 minute
          rampDownTime: 60000, // 1 minute
          concurrentUsers: 50,
          requestsPerSecond: 25,
          flowTypes: [
            { flowType: 'simple', percentage: 70, avgSteps: 3, avgDuration: 1000 },
            { flowType: 'complex', percentage: 30, avgSteps: 8, avgDuration: 3000 }
          ],
          dataSize: { small: 60, medium: 30, large: 10, xlarge: 0 }
        }
      ],
      performanceThresholds: {
        maxResponseTime: 2000,
        maxP95ResponseTime: 5000,
        maxP99ResponseTime: 10000,
        minThroughput: 20,
        maxErrorRate: 5,
        maxMemoryUsage: 2048,
        maxCpuUsage: 80,
        maxDiskUsage: 1024,
        maxNetworkLatency: 100
      },
      scalabilityTargets: {
        maxConcurrentFlows: 1000,
        maxNodesSupported: 10,
        maxThroughputRps: 500,
        maxDataVolumeGB: 100,
        linearScalingThreshold: 80,
        resourceEfficiencyTarget: 75
      },
      stressTestConfig: {
        enableStressTesting: false,
        memoryStressMultiplier: 1.5,
        cpuStressMultiplier: 1.5,
        networkStressMultiplier: 1.5,
        diskStressMultiplier: 1.5,
        chaosEngineeringEnabled: false,
        failureInjectionRate: 0
      },
      resourceLimits: {
        maxMemoryMB: 4096,
        maxCpuCores: 4,
        maxDiskSpaceGB: 50,
        maxNetworkBandwidthMbps: 1000,
        maxOpenConnections: 1000
      },
      monitoringConfig: {
        metricsInterval: 1000,
        enableDetailedMetrics: true,
        enableResourceProfiling: true,
        enableNetworkMonitoring: true,
        retentionPeriod: 3600000
      }
    },
    loadTesting: {
      scenarios: [
        {
          name: 'baseline_load',
          description: 'Baseline load test scenario',
          type: 'baseline' as const,
          duration: 300000,
          userLoad: {
            initialUsers: 10,
            peakUsers: 50,
            rampUpDuration: 60000,
            sustainDuration: 180000,
            rampDownDuration: 60000,
            userArrivalRate: 'linear' as const
          },
          expectedOutcome: {
            throughput: { min: 20, target: 30, max: 50 },
            responseTime: { p50: 800, p95: 2000, p99: 5000, max: 10000 },
            errorRate: { max: 5, target: 1 },
            resourceUtilization: {
              cpu: { min: 20, max: 80, target: 50 },
              memory: { min: 30, max: 90, target: 60 },
              network: { min: 10, max: 70, target: 40 }
            }
          },
          successCriteria: [
            { metric: 'throughput_average', operator: '>=', value: 25, tolerance: 10, critical: true },
            { metric: 'response_time_p95', operator: '<=', value: 3000, tolerance: 20, critical: true },
            { metric: 'error_rate', operator: '<=', value: 3, tolerance: 0, critical: true }
          ]
        }
      ],
      trafficPatterns: [
        {
          name: 'steady_traffic',
          description: 'Steady traffic pattern',
          pattern: 'steady' as const,
          parameters: {
            baselineRps: 25,
            peakRps: 50
          }
        }
      ],
      userBehaviors: [
        {
          name: 'typical_user',
          description: 'Typical user behavior pattern',
          flowSequence: [
            { flowType: 'simple', probability: 0.7, parameters: {} },
            { flowType: 'complex', probability: 0.3, parameters: {} }
          ],
          thinkTime: { type: 'normal', min: 1000, max: 5000, mean: 2000, stddev: 500 },
          sessionDuration: { type: 'normal', min: 60000, max: 300000, mean: 120000 },
          errorHandling: {
            retryAttempts: 3,
            retryDelay: 1000,
            abandonOnError: false
          }
        }
      ],
      dataPatterns: [
        {
          name: 'mixed_data',
          description: 'Mixed data size pattern',
          dataSize: {
            small: { percentage: 60, sizeRange: [1, 10] },
            medium: { percentage: 30, sizeRange: [10, 100] },
            large: { percentage: 10, sizeRange: [100, 1000] },
            xlarge: { percentage: 0, sizeRange: [1000, 10000] }
          },
          dataTypes: { json: 70, xml: 20, binary: 5, text: 5, multimedia: 0 },
          dataComplexity: { simple: 60, nested: 30, complex: 10 }
        }
      ]
    },
    reporting: {
      outputDir: './performance-reports',
      formats: ['json', 'html'],
      enableRealTimeReporting: false,
      enableDetailedMetrics: true,
      retentionDays: 30
    },
    environment: {
      testEnvironment: 'local' as const,
      nodeConfiguration: {
        nodeCount: 1,
        nodeSpecs: { cpu: 4, memory: 8, storage: 50 },
        distribution: 'single' as const
      },
      networkSimulation: {
        enabled: false,
        latency: 50,
        bandwidth: 1000,
        packetLoss: 0,
        jitter: 5
      },
      dataGeneration: {
        generateTestData: true,
        dataVolume: 'medium' as const,
        dataTypes: ['json', 'xml'],
        dataComplexity: 'mixed' as const
      }
    }
  };

  // Enhance configuration based on template
  switch (template) {
    case 'advanced':
      baseConfig.performance.loadProfiles.push({
        name: 'peak_load',
        description: 'Peak load test',
        duration: 600000, // 10 minutes
        rampUpTime: 120000, // 2 minutes
        rampDownTime: 120000, // 2 minutes
        concurrentUsers: 200,
        requestsPerSecond: 100,
        flowTypes: [
          { flowType: 'simple', percentage: 50, avgSteps: 3, avgDuration: 1000 },
          { flowType: 'complex', percentage: 40, avgSteps: 8, avgDuration: 3000 },
          { flowType: 'parallel', percentage: 10, avgSteps: 5, avgDuration: 2000 }
        ],
        dataSize: { small: 40, medium: 40, large: 15, xlarge: 5 }
      });
      baseConfig.performance.stressTestConfig.enableStressTesting = true;
      baseConfig.environment.nodeConfiguration.nodeCount = 3;
      break;
      
    case 'enterprise':
      baseConfig.performance.loadProfiles = [
        ...baseConfig.performance.loadProfiles,
        {
          name: 'enterprise_load',
          description: 'Enterprise-scale load test',
          duration: 1800000, // 30 minutes
          rampUpTime: 300000, // 5 minutes
          rampDownTime: 300000, // 5 minutes
          concurrentUsers: 1000,
          requestsPerSecond: 500,
          flowTypes: [
            { flowType: 'simple', percentage: 40, avgSteps: 3, avgDuration: 1000 },
            { flowType: 'complex', percentage: 40, avgSteps: 8, avgDuration: 3000 },
            { flowType: 'parallel', percentage: 20, avgSteps: 5, avgDuration: 2000 }
          ],
          dataSize: { small: 30, medium: 40, large: 25, xlarge: 5 }
        }
      ];
      baseConfig.performance.scalabilityTargets.maxConcurrentFlows = 10000;
      baseConfig.performance.scalabilityTargets.maxNodesSupported = 50;
      baseConfig.performance.scalabilityTargets.maxThroughputRps = 2000;
      baseConfig.performance.stressTestConfig.enableStressTesting = true;
      baseConfig.performance.stressTestConfig.chaosEngineeringEnabled = true;
      baseConfig.environment.nodeConfiguration.nodeCount = 10;
      baseConfig.environment.nodeConfiguration.distribution = 'multi_region';
      break;
  }

  return baseConfig;
}

/**
 * Run all performance tests
 */
async function runPerformanceTests(config: PerformanceTestConfiguration, options: any): Promise<any[]> {
  const results: any[] = [];

  if (!options.loadOnly) {
    console.log('🧪 Running performance tests...');
    const performanceResults = await runPerformanceTestSuite(config.performance, options);
    results.push({ performance: performanceResults });
  }

  if (!options.perfOnly) {
    console.log('\n📈 Running load tests...');
    const loadResults = await runLoadTests(config.loadTesting, options);
    results.push({ load: loadResults });
  }

  // Generate comprehensive report
  await generateComprehensiveReport(results, config.reporting, options);

  return results;
}

/**
 * Run performance test suite
 */
async function runPerformanceTestSuite(config: PerformanceTestConfig, options: any): Promise<any> {
  const performanceTestSuite = new PerformanceTestSuite(config);
  
  performanceTestSuite.on('test_started', (event) => {
    if (options.verbose) {
      console.log(`  🔄 ${event.testName}...`);
    }
  });
  
  performanceTestSuite.on('test_completed', (event) => {
    const status = event.status === 'passed' ? '✅' : event.status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${status} ${event.testName}`);
  });

  try {
    const results = await performanceTestSuite.runAllPerformanceTests();
    
    // Save performance results
    const reportPath = path.join(options.output || './performance-reports', 'performance-results.json');
    await saveResults(results, reportPath);
    
    return results;
  } finally {
    await performanceTestSuite.cleanup();
  }
}

/**
 * Run load tests
 */
async function runLoadTests(config: LoadTestConfig, options: any): Promise<any[]> {
  const loadTestRunner = new LoadTestRunner(config);
  
  loadTestRunner.on('scenario_started', (event) => {
    console.log(`  🚀 Starting scenario: ${event.scenario} (${event.type})`);
  });
  
  loadTestRunner.on('scenario_completed', (event) => {
    const status = event.status === 'passed' ? '✅' : event.status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${status} Scenario completed: ${event.scenario}`);
  });

  loadTestRunner.on('phase_started', (event) => {
    if (options.verbose) {
      console.log(`    📊 Phase: ${event.phase} (${event.duration}ms)`);
    }
  });

  try {
    const results = await loadTestRunner.runAllLoadTests();
    
    // Save load test results
    const reportPath = path.join(options.output || './performance-reports', 'load-test-results.json');
    await saveResults(results, reportPath);
    
    return results;
  } finally {
    await loadTestRunner.cleanup();
  }
}

/**
 * Run stress tests
 */
async function runStressTests(config: PerformanceTestConfig, options: any): Promise<any[]> {
  const performanceTestSuite = new PerformanceTestSuite(config);
  
  performanceTestSuite.on('stress_test_started', (event) => {
    console.log(`  💪 Starting stress test: ${event.testName}`);
  });
  
  performanceTestSuite.on('stress_test_completed', (event) => {
    const status = event.status === 'passed' ? '✅' : '❌';
    console.log(`  ${status} Stress test completed: ${event.testName}`);
  });

  try {
    const results = await performanceTestSuite.runAllPerformanceTests();
    
    // Filter stress test results
    const stressResults = results.filter(r => r.testName.toLowerCase().includes('stress'));
    
    // Save stress test results
    const reportPath = path.join(options.output || './performance-reports', 'stress-test-results.json');
    await saveResults(stressResults, reportPath);
    
    return stressResults;
  } finally {
    await performanceTestSuite.cleanup();
  }
}

/**
 * Run performance benchmarks
 */
async function runBenchmarks(config: PerformanceTestConfig, options: any): Promise<any[]> {
  console.log('📊 Running performance benchmarks...');
  
  // Create benchmark-specific configuration
  const benchmarkConfig = {
    ...config,
    loadProfiles: config.loadProfiles.filter(profile => 
      profile.name.includes('baseline') || profile.name.includes('benchmark')
    )
  };

  const performanceTestSuite = new PerformanceTestSuite(benchmarkConfig);
  
  try {
    const results = await performanceTestSuite.runAllPerformanceTests();
    
    if (options.baseline) {
      // Save as baseline
      const baselinePath = path.join(options.output || './performance-reports', 'baseline-results.json');
      await saveResults(results, baselinePath);
      console.log(`📊 Baseline established at: ${baselinePath}`);
    }
    
    return results;
  } finally {
    await performanceTestSuite.cleanup();
  }
}

/**
 * Compare performance results
 */
async function compareResults(currentResults: any[], baselinePath: string, threshold: number): Promise<any> {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }

  const baselineContent = fs.readFileSync(baselinePath, 'utf-8');
  const baselineResults = JSON.parse(baselineContent);

  const comparison = {
    timestamp: new Date().toISOString(),
    threshold,
    regressions: [],
    improvements: [],
    summary: {
      totalTests: currentResults.length,
      regressions: 0,
      improvements: 0,
      stable: 0
    }
  };

  // Compare key metrics
  for (let i = 0; i < Math.min(currentResults.length, baselineResults.length); i++) {
    const current = currentResults[i];
    const baseline = baselineResults[i];

    if (current.testName === baseline.testName) {
      const responseTimeChange = ((current.metrics.averageResponseTime - baseline.metrics.averageResponseTime) / baseline.metrics.averageResponseTime) * 100;
      const throughputChange = ((current.metrics.throughput - baseline.metrics.throughput) / baseline.metrics.throughput) * 100;

      if (responseTimeChange > threshold) {
        comparison.regressions.push({
          test: current.testName,
          metric: 'response_time',
          change: responseTimeChange,
          current: current.metrics.averageResponseTime,
          baseline: baseline.metrics.averageResponseTime
        });
        comparison.summary.regressions++;
      } else if (responseTimeChange < -threshold) {
        comparison.improvements.push({
          test: current.testName,
          metric: 'response_time',
          change: responseTimeChange,
          current: current.metrics.averageResponseTime,
          baseline: baseline.metrics.averageResponseTime
        });
        comparison.summary.improvements++;
      } else {
        comparison.summary.stable++;
      }

      if (throughputChange < -threshold) {
        comparison.regressions.push({
          test: current.testName,
          metric: 'throughput',
          change: throughputChange,
          current: current.metrics.throughput,
          baseline: baseline.metrics.throughput
        });
        comparison.summary.regressions++;
      } else if (throughputChange > threshold) {
        comparison.improvements.push({
          test: current.testName,
          metric: 'throughput',
          change: throughputChange,
          current: current.metrics.throughput,
          baseline: baseline.metrics.throughput
        });
        comparison.summary.improvements++;
      }
    }
  }

  return comparison;
}

/**
 * Display comparison results
 */
function displayComparison(comparison: any): void {
  console.log('\n📊 PERFORMANCE COMPARISON RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Tests: ${comparison.summary.totalTests}`);
  console.log(`   🔴 Regressions: ${comparison.summary.regressions}`);
  console.log(`   🟢 Improvements: ${comparison.summary.improvements}`);
  console.log(`   🟡 Stable: ${comparison.summary.stable}`);
  
  if (comparison.regressions.length > 0) {
    console.log(`\n🔴 PERFORMANCE REGRESSIONS:`);
    comparison.regressions.forEach((regression: any) => {
      console.log(`   • ${regression.test} - ${regression.metric}: ${regression.change.toFixed(1)}% worse`);
      console.log(`     Current: ${regression.current}, Baseline: ${regression.baseline}`);
    });
  }
  
  if (comparison.improvements.length > 0) {
    console.log(`\n🟢 PERFORMANCE IMPROVEMENTS:`);
    comparison.improvements.forEach((improvement: any) => {
      console.log(`   • ${improvement.test} - ${improvement.metric}: ${Math.abs(improvement.change).toFixed(1)}% better`);
      console.log(`     Current: ${improvement.current}, Baseline: ${improvement.baseline}`);
    });
  }
}

/**
 * Save results to file
 */
async function saveResults(results: any, filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`📄 Results saved to: ${filePath}`);
}

/**
 * Generate comprehensive report
 */
async function generateComprehensiveReport(results: any[], reportingConfig: ReportingConfig, options: any): Promise<void> {
  const outputDir = options.output || reportingConfig.outputDir;
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Generate JSON report
  if (reportingConfig.formats.includes('json')) {
    const jsonPath = path.join(outputDir, `performance-report-${timestamp}.json`);
    await saveResults({
      timestamp: new Date().toISOString(),
      results,
      summary: generateSummary(results)
    }, jsonPath);
  }

  // Generate HTML report
  if (reportingConfig.formats.includes('html')) {
    const htmlPath = path.join(outputDir, `performance-report-${timestamp}.html`);
    const htmlContent = generateHtmlReport(results);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }

  // Generate CSV report
  if (reportingConfig.formats.includes('csv')) {
    const csvPath = path.join(outputDir, `performance-report-${timestamp}.csv`);
    const csvContent = generateCsvReport(results);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📄 CSV report saved to: ${csvPath}`);
  }
}

/**
 * Generate summary from results
 */
function generateSummary(results: any[]): any {
  const summary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    averageResponseTime: 0,
    averageThroughput: 0,
    overallStatus: 'passed'
  };

  results.forEach(resultGroup => {
    if (Array.isArray(resultGroup.performance)) {
      resultGroup.performance.forEach((result: any) => {
        summary.totalTests++;
        if (result.status === 'passed') summary.passed++;
        else if (result.status === 'failed') summary.failed++;
        else summary.warnings++;
        
        if (result.metrics) {
          summary.averageResponseTime += result.metrics.averageResponseTime || 0;
          summary.averageThroughput += result.metrics.throughput || 0;
        }
      });
    }
    
    if (Array.isArray(resultGroup.load)) {
      resultGroup.load.forEach((result: any) => {
        summary.totalTests++;
        if (result.status === 'passed') summary.passed++;
        else if (result.status === 'failed') summary.failed++;
        else summary.warnings++;
      });
    }
  });

  if (summary.totalTests > 0) {
    summary.averageResponseTime /= summary.totalTests;
    summary.averageThroughput /= summary.totalTests;
  }

  if (summary.failed > 0) {
    summary.overallStatus = 'failed';
  } else if (summary.warnings > 0) {
    summary.overallStatus = 'warning';
  }

  return summary;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results: any[]): string {
  const summary = generateSummary(results);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Qflow Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Qflow Performance Test Report</h1>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Overall Status:</strong> <span class="${summary.overallStatus}">${summary.overallStatus.toUpperCase()}</span></p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 2em;">${summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3 class="passed">Passed</h3>
            <div style="font-size: 2em;">${summary.passed}</div>
        </div>
        <div class="metric">
            <h3 class="failed">Failed</h3>
            <div style="font-size: 2em;">${summary.failed}</div>
        </div>
        <div class="metric">
            <h3 class="warning">Warnings</h3>
            <div style="font-size: 2em;">${summary.warnings}</div>
        </div>
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
        <tr><td>Average Response Time</td><td>${summary.averageResponseTime.toFixed(2)} ms</td></tr>
        <tr><td>Average Throughput</td><td>${summary.averageThroughput.toFixed(2)} RPS</td></tr>
    </table>
    
    <h2>Detailed Results</h2>
    <p>See JSON report for detailed test results and metrics.</p>
</body>
</html>`;
}

/**
 * Generate CSV report
 */
function generateCsvReport(results: any[]): string {
  let csv = 'Test Name,Status,Response Time (ms),Throughput (RPS),Error Rate (%),Duration (ms)\n';
  
  results.forEach(resultGroup => {
    if (Array.isArray(resultGroup.performance)) {
      resultGroup.performance.forEach((result: any) => {
        csv += `${result.testName},${result.status},${result.metrics?.averageResponseTime || 0},${result.metrics?.throughput || 0},${result.metrics?.errorRate || 0},${result.duration || 0}\n`;
      });
    }
    
    if (Array.isArray(resultGroup.load)) {
      resultGroup.load.forEach((result: any) => {
        csv += `${result.scenario},${result.status},${result.actualOutcome?.responseTime?.p50 || 0},${result.actualOutcome?.throughput?.average || 0},${result.actualOutcome?.errorRate?.overall || 0},${result.duration || 0}\n`;
      });
    }
  });
  
  return csv;
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