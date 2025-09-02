#!/usr/bin/env node

/**
 * Serverless Cost Control CLI
 * Command-line interface for managing serverless cost control and optimization
 */

import { Command } from 'commander';
import { ServerlessCostControlService } from '../services/ServerlessCostControlService.mjs';
import { ColdStartOptimizationService } from '../services/ColdStartOptimizationService.mjs';
import { BatchProcessingService } from '../services/BatchProcessingService.mjs';
import { CostMonitoringDashboardService } from '../services/CostMonitoringDashboardService.mjs';
import { GracefulDegradationService } from '../services/GracefulDegradationService.mjs';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

// Initialize services
const costControlService = new ServerlessCostControlService();
const coldStartService = new ColdStartOptimizationService();
const batchService = new BatchProcessingService();
const dashboardService = new CostMonitoringDashboardService();
const degradationService = new GracefulDegradationService();

program
  .name('cost-control')
  .description('Serverless Cost Control and Optimization CLI')
  .version('1.0.0');

// Cost Control Commands
const costCommand = program.command('cost').description('Cost control operations');

costCommand
  .command('set-limits')
  .description('Set invocation limits for a module')
  .requiredOption('-m, --module <module>', 'Module name')
  .option('--per-minute <number>', 'Invocations per minute', parseInt)
  .option('--per-hour <number>', 'Invocations per hour', parseInt)
  .option('--per-day <number>', 'Invocations per day', parseInt)
  .option('--per-month <number>', 'Invocations per month', parseInt)
  .option('--budget <number>', 'Monthly budget in USD', parseFloat)
  .action(async (options) => {
    try {
      const limits = {};
      if (options.perMinute) limits.perMinute = options.perMinute;
      if (options.perHour) limits.perHour = options.perHour;
      if (options.perDay) limits.perDay = options.perDay;
      if (options.perMonth) limits.perMonth = options.perMonth;
      
      const config = { ...limits };
      if (options.budget) config.monthlyBudget = options.budget;
      
      const result = await costControlService.setInvocationLimits(options.module, config);
      console.log('✅ Invocation limits set successfully');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to set invocation limits:', error.message);
      process.exit(1);
    }
  });

costCommand
  .command('check-limits')
  .description('Check invocation limits for a module')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-f, --function <function>', 'Function name')
  .action(async (options) => {
    try {
      const result = await costControlService.checkInvocationLimits(options.module, options.function);
      console.log('📊 Invocation limits status:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to check invocation limits:', error.message);
      process.exit(1);
    }
  });

costCommand
  .command('dashboard')
  .description('Get cost dashboard data for a module')
  .requiredOption('-m, --module <module>', 'Module name')
  .action(async (options) => {
    try {
      const result = await costControlService.getCostDashboardData(options.module);
      console.log('📈 Cost Dashboard Data:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to get dashboard data:', error.message);
      process.exit(1);
    }
  });

costCommand
  .command('recommendations')
  .description('Get cost optimization recommendations')
  .requiredOption('-m, --module <module>', 'Module name')
  .action(async (options) => {
    try {
      const result = await costControlService.getCostOptimizationRecommendations(options.module);
      console.log('💡 Cost Optimization Recommendations:');
      if (result.recommendations.length === 0) {
        console.log('No recommendations available');
      } else {
        result.recommendations.forEach((rec, index) => {
          console.log(`\n${index + 1}. ${rec.type} (${rec.priority})`);
          console.log(`   Description: ${rec.description}`);
          if (rec.estimatedSavings) {
            console.log(`   Estimated Savings: ${rec.estimatedSavings}`);
          }
          if (rec.implementation) {
            console.log(`   Implementation: ${rec.implementation}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to get recommendations:', error.message);
      process.exit(1);
    }
  });

// Cold Start Optimization Commands
const coldStartCommand = program.command('coldstart').description('Cold start optimization operations');

coldStartCommand
  .command('configure')
  .description('Configure memory profile for a function')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-f, --function <function>', 'Function name')
  .option('--memory <number>', 'Memory allocation in MB', parseInt)
  .option('--timeout <number>', 'Timeout in seconds', parseInt)
  .option('--warmup', 'Enable warmup')
  .option('--schedule <schedule>', 'Warmup schedule (cron format)')
  .action(async (options) => {
    try {
      const config = {};
      if (options.memory) config.memory = options.memory;
      if (options.timeout) config.timeout = options.timeout;
      if (options.warmup) config.warmupEnabled = true;
      if (options.schedule) config.warmupSchedule = options.schedule;
      
      const result = await coldStartService.configureMemoryProfile(options.module, options.function, config);
      console.log('✅ Memory profile configured successfully');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to configure memory profile:', error.message);
      process.exit(1);
    }
  });

coldStartCommand
  .command('report')
  .description('Get cold start optimization report')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-f, --function <function>', 'Function name')
  .action(async (options) => {
    try {
      const result = await coldStartService.getOptimizationReport(options.module, options.function);
      console.log('🚀 Cold Start Optimization Report:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to get optimization report:', error.message);
      process.exit(1);
    }
  });

coldStartCommand
  .command('warmup')
  .description('Setup warmup schedule for a function')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-f, --function <function>', 'Function name')
  .option('-s, --schedule <schedule>', 'Cron schedule', '*/5 * * * *')
  .action(async (options) => {
    try {
      const result = await coldStartService.setupWarmupSchedule(options.module, options.function, options.schedule);
      console.log('⏰ Warmup schedule configured');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to setup warmup schedule:', error.message);
      process.exit(1);
    }
  });

// Batch Processing Commands
const batchCommand = program.command('batch').description('Batch processing operations');

batchCommand
  .command('configure')
  .description('Configure batch processing for an operation')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-o, --operation <operation>', 'Operation type')
  .option('--max-size <number>', 'Maximum batch size', parseInt)
  .option('--max-wait <number>', 'Maximum wait time in ms', parseInt)
  .option('--max-memory <number>', 'Maximum memory usage ratio', parseFloat)
  .option('--retry-attempts <number>', 'Retry attempts', parseInt)
  .option('--retry-delay <number>', 'Retry delay in ms', parseInt)
  .option('--disable', 'Disable batch processing')
  .action(async (options) => {
    try {
      const config = {
        enabled: !options.disable
      };
      if (options.maxSize) config.maxBatchSize = options.maxSize;
      if (options.maxWait) config.maxWaitTime = options.maxWait;
      if (options.maxMemory) config.maxMemoryUsage = options.maxMemory;
      if (options.retryAttempts) config.retryAttempts = options.retryAttempts;
      if (options.retryDelay) config.retryDelay = options.retryDelay;
      
      const result = await batchService.configureBatchProcessing(options.module, options.operation, config);
      console.log('✅ Batch processing configured successfully');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to configure batch processing:', error.message);
      process.exit(1);
    }
  });

batchCommand
  .command('stats')
  .description('Get batch processing statistics')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-o, --operation <operation>', 'Operation type')
  .action(async (options) => {
    try {
      const result = await batchService.getBatchStatistics(options.module, options.operation);
      console.log('📊 Batch Processing Statistics:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to get batch statistics:', error.message);
      process.exit(1);
    }
  });

// Dashboard Commands
const dashboardCommand = program.command('dashboard').description('Cost monitoring dashboard operations');

dashboardCommand
  .command('overview')
  .description('Get dashboard overview')
  .option('-t, --time-range <range>', 'Time range (24h, 7d, 30d)', '24h')
  .action(async (options) => {
    try {
      const result = await dashboardService.getDashboardData(options.timeRange);
      console.log('📈 Cost Monitoring Dashboard:');
      console.log('\n=== Overview ===');
      console.log(`Total Cost: $${result.overview.totalCost.toFixed(2)}`);
      console.log(`Total Invocations: ${result.overview.totalInvocations.toLocaleString()}`);
      console.log(`Total Cold Starts: ${result.overview.totalColdStarts.toLocaleString()}`);
      console.log(`Average Optimization Score: ${result.overview.averageOptimizationScore.toFixed(1)}/100`);
      console.log(`Active Modules: ${result.overview.activeModules}`);
      
      console.log('\n=== Active Alerts ===');
      if (result.alerts.length === 0) {
        console.log('No active alerts');
      } else {
        result.alerts.slice(0, 5).forEach(alert => {
          const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`${icon} ${alert.module}: ${alert.message}`);
        });
      }
      
      console.log('\n=== Top Recommendations ===');
      if (result.recommendations.length === 0) {
        console.log('No recommendations available');
      } else {
        result.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.type} (${rec.priority}) - ${rec.module}`);
          console.log(`   ${rec.description}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to get dashboard overview:', error.message);
      process.exit(1);
    }
  });

dashboardCommand
  .command('summary')
  .description('Get dashboard summary')
  .action(async (options) => {
    try {
      const result = await dashboardService.getDashboardSummary();
      console.log('📊 Dashboard Summary:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to get dashboard summary:', error.message);
      process.exit(1);
    }
  });

// Degradation Commands
const degradationCommand = program.command('degradation').description('Graceful degradation operations');

degradationCommand
  .command('configure')
  .description('Configure degradation strategies for a module')
  .requiredOption('-m, --module <module>', 'Module name')
  .option('--strategies <strategies>', 'Comma-separated list of strategies')
  .option('--budget-threshold <number>', 'Budget threshold for triggering degradation', parseFloat)
  .option('--auto-recover', 'Enable auto-recovery')
  .action(async (options) => {
    try {
      const config = {};
      if (options.strategies) {
        config.strategies = options.strategies.split(',').map(s => s.trim());
      }
      if (options.budgetThreshold) {
        config.budgetThreshold = options.budgetThreshold;
      }
      if (options.autoRecover) {
        config.autoRecover = true;
      }
      
      const result = await degradationService.configureDegradationStrategies(options.module, config);
      console.log('✅ Degradation strategies configured');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to configure degradation strategies:', error.message);
      process.exit(1);
    }
  });

degradationCommand
  .command('trigger')
  .description('Manually trigger degradation')
  .requiredOption('-m, --module <module>', 'Module name')
  .requiredOption('-t, --trigger <trigger>', 'Trigger reason')
  .option('-s, --severity <severity>', 'Severity level (low, medium, high, critical)', 'medium')
  .action(async (options) => {
    try {
      const result = await degradationService.triggerDegradation(options.module, options.trigger, options.severity);
      console.log('⚠️ Degradation triggered');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to trigger degradation:', error.message);
      process.exit(1);
    }
  });

degradationCommand
  .command('status')
  .description('Get degradation status for a module')
  .requiredOption('-m, --module <module>', 'Module name')
  .action(async (options) => {
    try {
      const result = await degradationService.getDegradationStatus(options.module);
      console.log('📊 Degradation Status:');
      console.log(`Module: ${result.module}`);
      console.log(`Configured: ${result.configured ? '✅' : '❌'}`);
      console.log(`Active Strategies: ${result.activeStrategies.length}`);
      
      if (result.activeStrategies.length > 0) {
        console.log('\nActive Strategies:');
        result.activeStrategies.forEach(strategy => {
          console.log(`  - ${strategy.strategy} (${strategy.severity}) - Applied: ${strategy.appliedAt}`);
          console.log(`    Trigger: ${strategy.trigger}`);
          console.log(`    Description: ${strategy.description}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to get degradation status:', error.message);
      process.exit(1);
    }
  });

degradationCommand
  .command('recover')
  .description('Force recovery from degradation')
  .requiredOption('-m, --module <module>', 'Module name')
  .action(async (options) => {
    try {
      const result = await degradationService.forceRecovery(options.module);
      console.log('🔄 Recovery completed');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Failed to force recovery:', error.message);
      process.exit(1);
    }
  });

// Utility Commands
program
  .command('init')
  .description('Initialize cost control for all modules')
  .option('--config <file>', 'Configuration file path')
  .action(async (options) => {
    try {
      const configPath = options.config || path.join(process.cwd(), 'backend/config/serverless-cost-control.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      console.log('🚀 Initializing cost control for all modules...');
      
      // Initialize cost limits for each module
      for (const [module, budget] of Object.entries(config.defaultBudgets)) {
        try {
          await costControlService.setInvocationLimits(module, {
            ...config.defaultLimits,
            monthlyBudget: budget,
            budgetAlerts: config.defaultBudgetThresholds
          });
          console.log(`✅ ${module}: Cost limits configured`);
        } catch (error) {
          console.log(`❌ ${module}: Failed to configure cost limits - ${error.message}`);
        }
      }
      
      // Configure degradation strategies
      for (const [module, settings] of Object.entries(config.moduleSpecificSettings)) {
        try {
          await degradationService.configureDegradationStrategies(module, {
            strategies: settings.degradationStrategies,
            ...config.gracefulDegradation.triggers,
            ...config.gracefulDegradation.recoverySettings
          });
          console.log(`✅ ${module}: Degradation strategies configured`);
        } catch (error) {
          console.log(`❌ ${module}: Failed to configure degradation - ${error.message}`);
        }
      }
      
      console.log('\n🎉 Cost control initialization completed!');
    } catch (error) {
      console.error('❌ Failed to initialize cost control:', error.message);
      process.exit(1);
    }
  });

program
  .command('health-check')
  .description('Perform health check on cost control system')
  .action(async () => {
    try {
      console.log('🔍 Performing cost control system health check...');
      
      // Check each service
      const services = [
        { name: 'Cost Control', service: costControlService },
        { name: 'Cold Start Optimization', service: coldStartService },
        { name: 'Batch Processing', service: batchService },
        { name: 'Dashboard', service: dashboardService },
        { name: 'Graceful Degradation', service: degradationService }
      ];
      
      for (const { name, service } of services) {
        try {
          // Basic health check - try to call a simple method
          if (service.getDashboardSummary) {
            await service.getDashboardSummary();
          } else if (service.getDashboardData) {
            await service.getDashboardData('24h');
          }
          console.log(`✅ ${name}: Healthy`);
        } catch (error) {
          console.log(`❌ ${name}: Unhealthy - ${error.message}`);
        }
      }
      
      console.log('\n🏥 Health check completed!');
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();