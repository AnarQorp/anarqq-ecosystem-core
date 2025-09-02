#!/usr/bin/env node

/**
 * Final Validation CLI
 * 
 * Command-line interface for running final performance validation and optimization
 * before production deployment.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { FinalValidationRunner, ValidationRunnerConfig } from '../../tests/performance/FinalValidationRunner';
import { FinalValidationConfig } from '../validation/FinalPerformanceValidator';

const program = new Command();

program
  .name('qflow-final-validation')
  .description('Qflow Final Performance Validation and Optimization CLI')
  .version('1.0.0');

// Run validation command
program
  .command('run')
  .description('Run final validation')
  .option('-p, --profile <profile>', 'Validation profile to run')
  .option('-c, --config <config>', 'Configuration file path', './final-validation.json')
  .option('-o, --output <output>', 'Output directory for reports', './validation-reports')
  .option('-f, --format <format>', 'Report format (json|html|pdf)', 'json')
  .option('--all', 'Run all validation profiles')
  .option('--trigger <trigger>', 'Trigger type', 'manual')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log('🚀 Starting Qflow Final Validation...\n');

      // Load configuration
      const config = loadConfig(options.config);
      const runner = new FinalValidationRunner(config);

      // Setup event listeners
      setupEventListeners(runner, options.verbose);

      let runs;
      if (options.all) {
        console.log('📋 Running validation for all profiles...');
        runs = await runner.runAllValidations(options.trigger);
      } else if (options.profile) {
        console.log(`📋 Running validation for profile: ${options.profile}`);
        runs = [await runner.runValidation(options.profile, options.trigger)];
      } else {
        console.error('❌ Error: Must specify --profile or --all');
        process.exit(1);
      }

      // Generate summary
      const summary = runner.getValidationSummary();
      displaySummary(summary, runs);

      // Generate report
      if (options.output) {
        const report = await runner.generateReport(options.format);
        const reportPath = join(options.output, `final-validation-${Date.now()}.${options.format}`);
        writeFileSync(reportPath, report);
        console.log(`📄 Report generated: ${reportPath}`);
      }

      // Check deployment readiness
      const deploymentReady = runs.every(run => run.result?.deploymentReadiness.ready);
      if (deploymentReady) {
        console.log('\n✅ DEPLOYMENT READY: All validations passed');
        process.exit(0);
      } else {
        console.log('\n❌ DEPLOYMENT BLOCKED: Critical issues found');
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check validation status')
  .option('-c, --config <config>', 'Configuration file path', './final-validation.json')
  .option('-r, --run-id <runId>', 'Specific run ID to check')
  .option('--history <limit>', 'Show validation history (limit)', '10')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const runner = new FinalValidationRunner(config);

      if (options.runId) {
        const run = runner.getRunStatus(options.runId);
        if (run) {
          displayRunStatus(run);
        } else {
          console.log(`❌ Run not found: ${options.runId}`);
        }
      } else {
        const activeRuns = runner.getActiveRuns();
        const history = runner.getRunHistory(parseInt(options.history));
        const summary = runner.getValidationSummary();

        displayStatus(activeRuns, history, summary);
      }

    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Generate config command
program
  .command('init')
  .description('Generate initial configuration file')
  .option('-t, --template <template>', 'Configuration template (basic|advanced|enterprise)', 'basic')
  .option('-o, --output <output>', 'Output file path', './final-validation.json')
  .option('--force', 'Overwrite existing configuration')
  .action((options) => {
    try {
      if (existsSync(options.output) && !options.force) {
        console.error(`❌ Configuration file already exists: ${options.output}`);
        console.log('Use --force to overwrite');
        process.exit(1);
      }

      const config = generateConfigTemplate(options.template);
      writeFileSync(options.output, JSON.stringify(config, null, 2));
      
      console.log(`✅ Configuration generated: ${options.output}`);
      console.log(`📝 Edit the configuration file and run: qflow-final-validation run --config ${options.output}`);

    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate validation report')
  .option('-c, --config <config>', 'Configuration file path', './final-validation.json')
  .option('-f, --format <format>', 'Report format (json|html|pdf)', 'html')
  .option('-o, --output <output>', 'Output file path')
  .option('--profile <profile>', 'Filter by profile')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const runner = new FinalValidationRunner(config);

      const report = await runner.generateReport(options.format);
      
      if (options.output) {
        writeFileSync(options.output, report);
        console.log(`📄 Report generated: ${options.output}`);
      } else {
        console.log(report);
      }

    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Benchmark command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-c, --config <config>', 'Configuration file path', './final-validation.json')
  .option('-b, --baseline <baseline>', 'Baseline file for comparison')
  .option('--save-baseline', 'Save current results as baseline')
  .option('--threshold <threshold>', 'Regression threshold percentage', '15')
  .action(async (options) => {
    try {
      console.log('🏃 Running performance benchmarks...\n');

      const config = loadConfig(options.config);
      const runner = new FinalValidationRunner(config);

      // Run benchmarks for all profiles
      const runs = await runner.runAllValidations('benchmark');
      
      // Process benchmark results
      const benchmarkResults = runs.map(run => ({
        profile: run.profileName,
        duration: run.endTime ? run.endTime - run.startTime : 0,
        status: run.status,
        metrics: run.result?.performance.slaCompliance.metrics || {}
      }));

      // Compare with baseline if provided
      if (options.baseline && existsSync(options.baseline)) {
        const baseline = JSON.parse(readFileSync(options.baseline, 'utf8'));
        const comparison = compareBenchmarks(benchmarkResults, baseline, parseFloat(options.threshold));
        displayBenchmarkComparison(comparison);
      } else {
        displayBenchmarkResults(benchmarkResults);
      }

      // Save as baseline if requested
      if (options.saveBaseline) {
        const baselineFile = `benchmark-baseline-${Date.now()}.json`;
        writeFileSync(baselineFile, JSON.stringify(benchmarkResults, null, 2));
        console.log(`💾 Baseline saved: ${baselineFile}`);
      }

    } catch (error) {
      console.error(`❌ Benchmark failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Helper functions
 */
function loadConfig(configPath: string): ValidationRunnerConfig {
  if (!existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    console.log('Run: qflow-final-validation init');
    process.exit(1);
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Invalid configuration file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function setupEventListeners(runner: FinalValidationRunner, verbose: boolean): void {
  runner.on('validation_started', (data) => {
    console.log(`🔄 Validation started: ${data.profile} (${data.validationId})`);
  });

  runner.on('validation_completed', (data) => {
    const status = data.status === 'passed' ? '✅' : data.status === 'failed' ? '❌' : '⚠️';
    console.log(`${status} Validation completed: ${data.profile} (${Math.round(data.duration / 1000)}s)`);
  });

  runner.on('validation_failed', (data) => {
    console.log(`❌ Validation failed: ${data.profile} - ${data.error}`);
  });

  if (verbose) {
    runner.on('phase_started', (data) => {
      console.log(`  🔄 Phase started: ${data.phase}`);
    });

    runner.on('phase_completed', (data) => {
      console.log(`  ✅ Phase completed: ${data.phase}`);
    });

    runner.on('phase_failed', (data) => {
      console.log(`  ❌ Phase failed: ${data.phase} - ${data.error}`);
    });
  }
}

function displaySummary(summary: any, runs: any[]): void {
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total Runs: ${summary.totalRuns}`);
  console.log(`Successful: ${summary.successfulRuns}`);
  console.log(`Failed: ${summary.failedRuns}`);
  console.log(`Success Rate: ${((summary.successfulRuns / summary.totalRuns) * 100).toFixed(1)}%`);
  console.log(`Deployment Readiness: ${(summary.deploymentReadinessRate * 100).toFixed(1)}%`);
  console.log(`Average Duration: ${Math.round(summary.averageDuration / 1000)}s`);

  if (summary.commonIssues.length > 0) {
    console.log('\n🔍 COMMON ISSUES:');
    summary.commonIssues.forEach((issue: string) => {
      console.log(`  • ${issue}`);
    });
  }

  if (summary.trends.length > 0) {
    console.log('\n📈 TRENDS:');
    summary.trends.forEach((trend: any) => {
      const arrow = trend.direction === 'improving' ? '📈' : trend.direction === 'degrading' ? '📉' : '➡️';
      console.log(`  ${arrow} ${trend.metric}: ${trend.direction} (${trend.changePercent.toFixed(1)}%)`);
    });
  }
}

function displayRunStatus(run: any): void {
  console.log('\n📋 RUN STATUS');
  console.log('═'.repeat(30));
  console.log(`Run ID: ${run.runId}`);
  console.log(`Profile: ${run.profileName}`);
  console.log(`Status: ${run.status}`);
  console.log(`Started: ${new Date(run.startTime).toLocaleString()}`);
  
  if (run.endTime) {
    console.log(`Completed: ${new Date(run.endTime).toLocaleString()}`);
    console.log(`Duration: ${Math.round((run.endTime - run.startTime) / 1000)}s`);
  }

  if (run.result) {
    console.log(`Deployment Ready: ${run.result.deploymentReadiness.ready ? '✅' : '❌'}`);
    console.log(`Confidence: ${(run.result.deploymentReadiness.confidence * 100).toFixed(1)}%`);
    
    if (run.result.deploymentReadiness.blockers.length > 0) {
      console.log('\n🚫 BLOCKERS:');
      run.result.deploymentReadiness.blockers.forEach((blocker: string) => {
        console.log(`  • ${blocker}`);
      });
    }
  }
}

function displayStatus(activeRuns: any[], history: any[], summary: any): void {
  console.log('\n🔄 ACTIVE RUNS');
  console.log('═'.repeat(40));
  if (activeRuns.length === 0) {
    console.log('No active validation runs');
  } else {
    activeRuns.forEach(run => {
      console.log(`${run.runId} - ${run.profileName} (${run.status})`);
    });
  }

  console.log('\n📚 RECENT HISTORY');
  console.log('═'.repeat(40));
  history.slice(0, 5).forEach(run => {
    const status = run.status === 'completed' ? '✅' : run.status === 'failed' ? '❌' : '⚠️';
    const duration = run.endTime ? Math.round((run.endTime - run.startTime) / 1000) + 's' : 'N/A';
    console.log(`${status} ${run.profileName} - ${duration} (${new Date(run.startTime).toLocaleDateString()})`);
  });

  displaySummary(summary, history);
}

function generateConfigTemplate(template: string): ValidationRunnerConfig {
  const baseConfig: ValidationRunnerConfig = {
    environment: 'development',
    validationProfiles: [],
    reportingConfig: {
      enableDashboard: false,
      dashboardPort: 3000,
      enableSlackNotifications: false,
      enableEmailNotifications: false,
      enableWebhooks: false,
      reportRetentionDays: 30,
      exportFormats: ['json', 'html']
    },
    integrationConfig: {
      cicdIntegration: {
        enabled: false,
        provider: 'github'
      },
      monitoringIntegration: {
        enabled: false,
        provider: 'prometheus'
      },
      alertingIntegration: {
        enabled: false,
        provider: 'slack'
      }
    },
    notificationConfig: {
      channels: [],
      templates: [],
      escalationRules: []
    }
  };

  switch (template) {
    case 'basic':
      baseConfig.validationProfiles = [{
        name: 'basic-validation',
        description: 'Basic performance and security validation',
        environment: 'development',
        triggers: [{ type: 'manual', enabled: true }],
        config: createBasicValidationConfig()
      }];
      break;

    case 'advanced':
      baseConfig.environment = 'staging';
      baseConfig.validationProfiles = [
        {
          name: 'performance-validation',
          description: 'Comprehensive performance validation',
          environment: 'staging',
          triggers: [
            { type: 'manual', enabled: true },
            { type: 'ci_cd', enabled: true }
          ],
          config: createAdvancedValidationConfig()
        },
        {
          name: 'security-validation',
          description: 'Security hardening and compliance validation',
          environment: 'staging',
          triggers: [{ type: 'manual', enabled: true }],
          config: createSecurityValidationConfig()
        }
      ];
      break;

    case 'enterprise':
      baseConfig.environment = 'production';
      baseConfig.reportingConfig.enableDashboard = true;
      baseConfig.reportingConfig.enableSlackNotifications = true;
      baseConfig.integrationConfig.cicdIntegration.enabled = true;
      baseConfig.integrationConfig.monitoringIntegration.enabled = true;
      baseConfig.validationProfiles = [
        {
          name: 'production-readiness',
          description: 'Full production readiness validation',
          environment: 'production',
          schedule: {
            enabled: true,
            expression: '0 2 * * *', // Daily at 2 AM
            timezone: 'UTC'
          },
          triggers: [
            { type: 'manual', enabled: true },
            { type: 'ci_cd', enabled: true },
            { type: 'scheduled', enabled: true }
          ],
          config: createEnterpriseValidationConfig()
        }
      ];
      break;
  }

  return baseConfig;
}

function createBasicValidationConfig(): FinalValidationConfig {
  return {
    performance: {
      enableValidation: true,
      slaThresholds: {
        maxResponseTimeMs: 2000,
        maxP95ResponseTimeMs: 5000,
        maxP99ResponseTimeMs: 10000,
        minThroughputRps: 50,
        maxErrorRatePercent: 5,
        maxMemoryUsageMB: 1024,
        maxCpuUsagePercent: 80,
        maxNetworkLatencyMs: 100,
        availabilityPercent: 99.9
      },
      loadTestProfiles: [{
        name: 'basic-load',
        description: 'Basic load test',
        duration: 300000, // 5 minutes
        concurrentUsers: 50,
        requestsPerSecond: 25,
        dataVolumeGB: 1,
        flowComplexity: 'simple',
        geographicDistribution: ['us-east-1']
      }],
      stressTestConfig: {
        enableMemoryStress: true,
        enableCpuStress: true,
        enableNetworkStress: false,
        enableConcurrencyStress: true,
        stressMultipliers: {
          memory: 1.5,
          cpu: 1.5,
          network: 1.0,
          concurrency: 2.0
        },
        chaosEngineering: {
          enabled: false,
          failureInjectionRate: 0,
          nodeFailureRate: 0,
          networkPartitionRate: 0
        }
      },
      benchmarkConfig: {
        enableBaseline: true,
        enableRegression: true,
        regressionThreshold: 15,
        performanceMetrics: ['response_time', 'throughput', 'error_rate']
      }
    },
    security: {
      enableHardening: true,
      securityTestConfig: {
        enablePenetrationTesting: false,
        enableVulnerabilityScanning: true,
        enableComplianceValidation: false,
        testCategories: [
          {
            name: 'authentication',
            enabled: true,
            severity: 'high',
            tests: ['identity_verification', 'token_validation']
          }
        ]
      },
      hardeningMeasures: [],
      complianceChecks: []
    },
    optimization: {
      enableOptimization: true,
      optimizationTargets: [],
      performanceGates: [
        {
          name: 'response_time_gate',
          metric: 'response_time',
          threshold: 2000,
          operator: 'lt',
          severity: 'error',
          blockDeployment: true
        }
      ],
      regressionThresholds: [
        {
          metric: 'response_time',
          maxDegradationPercent: 15,
          minSampleSize: 5,
          confidenceLevel: 0.95
        }
      ]
    },
    reporting: {
      generateReports: true,
      reportFormats: ['json', 'html'],
      outputDirectory: './validation-reports',
      enableRealTimeMonitoring: false
    }
  };
}

function createAdvancedValidationConfig(): FinalValidationConfig {
  const config = createBasicValidationConfig();
  
  // Enhanced performance testing
  config.performance.loadTestProfiles = [
    {
      name: 'baseline-load',
      description: 'Baseline load test',
      duration: 600000, // 10 minutes
      concurrentUsers: 100,
      requestsPerSecond: 50,
      dataVolumeGB: 5,
      flowComplexity: 'mixed',
      geographicDistribution: ['us-east-1', 'eu-west-1']
    },
    {
      name: 'peak-load',
      description: 'Peak load test',
      duration: 900000, // 15 minutes
      concurrentUsers: 500,
      requestsPerSecond: 250,
      dataVolumeGB: 10,
      flowComplexity: 'complex',
      geographicDistribution: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
    }
  ];

  // Enhanced stress testing
  config.performance.stressTestConfig.chaosEngineering.enabled = true;
  config.performance.stressTestConfig.chaosEngineering.failureInjectionRate = 5;

  // More performance gates
  config.optimization.performanceGates.push(
    {
      name: 'throughput_gate',
      metric: 'throughput',
      threshold: 50,
      operator: 'gte',
      severity: 'error',
      blockDeployment: true
    },
    {
      name: 'error_rate_gate',
      metric: 'error_rate',
      threshold: 5,
      operator: 'lt',
      severity: 'warning',
      blockDeployment: false
    }
  );

  return config;
}

function createSecurityValidationConfig(): FinalValidationConfig {
  const config = createBasicValidationConfig();
  
  // Focus on security
  config.performance.enableValidation = false;
  config.security.securityTestConfig.enablePenetrationTesting = true;
  config.security.securityTestConfig.enableComplianceValidation = true;
  
  config.security.securityTestConfig.testCategories = [
    {
      name: 'authentication',
      enabled: true,
      severity: 'critical',
      tests: ['identity_verification', 'token_validation', 'session_management']
    },
    {
      name: 'authorization',
      enabled: true,
      severity: 'critical',
      tests: ['permission_validation', 'access_control', 'privilege_escalation']
    },
    {
      name: 'encryption',
      enabled: true,
      severity: 'high',
      tests: ['data_encryption', 'transport_security', 'key_management']
    }
  ];

  return config;
}

function createEnterpriseValidationConfig(): FinalValidationConfig {
  const config = createAdvancedValidationConfig();
  
  // Enterprise-grade thresholds
  config.performance.slaThresholds = {
    maxResponseTimeMs: 1000,
    maxP95ResponseTimeMs: 2000,
    maxP99ResponseTimeMs: 5000,
    minThroughputRps: 1000,
    maxErrorRatePercent: 1,
    maxMemoryUsageMB: 4096,
    maxCpuUsagePercent: 70,
    maxNetworkLatencyMs: 50,
    availabilityPercent: 99.99
  };

  // Enterprise load profiles
  config.performance.loadTestProfiles = [
    {
      name: 'enterprise-baseline',
      description: 'Enterprise baseline load',
      duration: 1800000, // 30 minutes
      concurrentUsers: 1000,
      requestsPerSecond: 500,
      dataVolumeGB: 50,
      flowComplexity: 'mixed',
      geographicDistribution: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
    },
    {
      name: 'enterprise-peak',
      description: 'Enterprise peak load',
      duration: 3600000, // 1 hour
      concurrentUsers: 5000,
      requestsPerSecond: 2500,
      dataVolumeGB: 100,
      flowComplexity: 'complex',
      geographicDistribution: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1']
    }
  ];

  // Full security validation
  config.security = createSecurityValidationConfig().security;
  config.security.enableHardening = true;

  // Comprehensive reporting
  config.reporting.reportFormats = ['json', 'html', 'pdf'];
  config.reporting.enableRealTimeMonitoring = true;

  return config;
}

function compareBenchmarks(current: any[], baseline: any[], threshold: number): any {
  const comparison = {
    regressions: [] as any[],
    improvements: [] as any[],
    stable: [] as any[],
    overallStatus: 'passed' as 'passed' | 'failed' | 'warning'
  };

  current.forEach(currentResult => {
    const baselineResult = baseline.find(b => b.profile === currentResult.profile);
    if (!baselineResult) return;

    const durationChange = ((currentResult.duration - baselineResult.duration) / baselineResult.duration) * 100;
    
    if (Math.abs(durationChange) > threshold) {
      if (durationChange > 0) {
        comparison.regressions.push({
          profile: currentResult.profile,
          metric: 'duration',
          change: durationChange,
          current: currentResult.duration,
          baseline: baselineResult.duration
        });
      } else {
        comparison.improvements.push({
          profile: currentResult.profile,
          metric: 'duration',
          change: Math.abs(durationChange),
          current: currentResult.duration,
          baseline: baselineResult.duration
        });
      }
    } else {
      comparison.stable.push({
        profile: currentResult.profile,
        change: durationChange
      });
    }
  });

  if (comparison.regressions.length > 0) {
    comparison.overallStatus = 'failed';
  } else if (comparison.improvements.length > comparison.stable.length) {
    comparison.overallStatus = 'passed';
  } else {
    comparison.overallStatus = 'warning';
  }

  return comparison;
}

function displayBenchmarkResults(results: any[]): void {
  console.log('\n🏃 BENCHMARK RESULTS');
  console.log('═'.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'completed' ? '✅' : '❌';
    console.log(`${status} ${result.profile}: ${Math.round(result.duration / 1000)}s`);
    
    if (result.metrics.avgResponseTime) {
      console.log(`   Response Time: ${Math.round(result.metrics.avgResponseTime)}ms`);
    }
    if (result.metrics.avgThroughput) {
      console.log(`   Throughput: ${Math.round(result.metrics.avgThroughput)} RPS`);
    }
  });
}

function displayBenchmarkComparison(comparison: any): void {
  console.log('\n📊 BENCHMARK COMPARISON');
  console.log('═'.repeat(50));
  
  const status = comparison.overallStatus === 'passed' ? '✅' : 
                comparison.overallStatus === 'failed' ? '❌' : '⚠️';
  console.log(`Overall Status: ${status} ${comparison.overallStatus.toUpperCase()}`);

  if (comparison.regressions.length > 0) {
    console.log('\n📉 REGRESSIONS:');
    comparison.regressions.forEach((reg: any) => {
      console.log(`  ❌ ${reg.profile}: ${reg.change.toFixed(1)}% slower`);
    });
  }

  if (comparison.improvements.length > 0) {
    console.log('\n📈 IMPROVEMENTS:');
    comparison.improvements.forEach((imp: any) => {
      console.log(`  ✅ ${imp.profile}: ${imp.change.toFixed(1)}% faster`);
    });
  }

  if (comparison.stable.length > 0) {
    console.log('\n➡️ STABLE:');
    comparison.stable.forEach((stable: any) => {
      console.log(`  ✅ ${stable.profile}: ${Math.abs(stable.change).toFixed(1)}% change`);
    });
  }
}

// Parse command line arguments
program.parse();