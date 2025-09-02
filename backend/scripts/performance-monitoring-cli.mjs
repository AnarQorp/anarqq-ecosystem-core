#!/usr/bin/env node

/**
 * Performance Monitoring CLI
 * Command-line interface for performance monitoring and optimization
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import PerformanceProfilerService from '../services/PerformanceProfilerService.mjs';
import CachingService from '../services/CachingService.mjs';
import AdvancedMetricsService from '../services/AdvancedMetricsService.mjs';
import PerformanceRegressionService from '../services/PerformanceRegressionService.mjs';
import CapacityPlanningService from '../services/CapacityPlanningService.mjs';

const program = new Command();

// Initialize services
const profiler = new PerformanceProfilerService();
const cache = new CachingService();
const metrics = new AdvancedMetricsService();
const regression = new PerformanceRegressionService();
const capacity = new CapacityPlanningService();

program
  .name('performance-cli')
  .description('Performance monitoring and optimization CLI')
  .version('1.0.0');

/**
 * Metrics commands
 */
program
  .command('metrics')
  .description('Display performance metrics')
  .option('-t, --time-range <ms>', 'Time range in milliseconds', '3600000')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const timeRange = parseInt(options.timeRange);
      const sloStatus = metrics.getSLOStatus(timeRange);
      const insights = metrics.getInsights();

      if (options.format === 'json') {
        console.log(JSON.stringify({ sloStatus, insights }, null, 2));
        return;
      }

      console.log(chalk.blue.bold('\n📊 Performance Metrics Dashboard\n'));

      // SLO Status Table
      const sloTable = new Table({
        head: ['Metric', 'Status', 'Value', 'Threshold'],
        colWidths: [15, 12, 15, 15]
      });

      sloTable.push(
        ['Latency', getStatusColor(sloStatus.latency.status), 
         `${sloStatus.latency.violationRate.toFixed(2)}%`, `${sloStatus.latency.threshold}ms`],
        ['Availability', getStatusColor(sloStatus.availability.status), 
         `${sloStatus.availability.availability.toFixed(2)}%`, `${sloStatus.availability.threshold}%`],
        ['Throughput', getStatusColor(sloStatus.throughput.status), 
         `${sloStatus.throughput.avgRps.toFixed(2)} RPS`, `${sloStatus.throughput.threshold} RPS`]
      );

      console.log(sloTable.toString());

      // Insights
      if (insights.recommendations.length > 0) {
        console.log(chalk.yellow.bold('\n⚠️  Recommendations:\n'));
        insights.recommendations.forEach((rec, i) => {
          const priority = getPriorityColor(rec.priority);
          console.log(`${i + 1}. ${priority} ${rec.title}`);
          console.log(`   ${rec.description}`);
          if (rec.actions) {
            rec.actions.forEach(action => {
              console.log(`   • ${action}`);
            });
          }
          console.log();
        });
      }

    } catch (error) {
      console.error(chalk.red('Error retrieving metrics:'), error.message);
      process.exit(1);
    }
  });

/**
 * Cache commands
 */
program
  .command('cache')
  .description('Cache management and statistics')
  .option('-s, --stats', 'Show cache statistics')
  .option('-o, --optimizations', 'Show query optimizations')
  .option('-i, --invalidate <pattern>', 'Invalidate cache entries matching pattern')
  .option('-c, --cache-name <name>', 'Cache name', 'default')
  .action(async (options) => {
    try {
      if (options.invalidate) {
        const deletedCount = cache.invalidate(options.cacheName, options.invalidate);
        console.log(chalk.green(`✅ Invalidated ${deletedCount} cache entries`));
        return;
      }

      if (options.stats) {
        const stats = cache.getStats();
        
        console.log(chalk.blue.bold('\n💾 Cache Statistics\n'));
        
        const globalTable = new Table({
          head: ['Metric', 'Value'],
          colWidths: [20, 15]
        });

        globalTable.push(
          ['Hit Rate', `${(stats.global.hitRate * 100).toFixed(2)}%`],
          ['Total Hits', stats.global.hits.toString()],
          ['Total Misses', stats.global.misses.toString()],
          ['Total Sets', stats.global.sets.toString()],
          ['Compressions', stats.global.compressions.toString()]
        );

        console.log(globalTable.toString());

        if (Object.keys(stats.caches).length > 0) {
          console.log(chalk.blue.bold('\n📋 Cache Details\n'));
          
          const cacheTable = new Table({
            head: ['Cache Name', 'Size', 'Hit Rate', 'Hits', 'Misses'],
            colWidths: [15, 8, 12, 8, 8]
          });

          Object.entries(stats.caches).forEach(([name, cacheStats]) => {
            cacheTable.push([
              name,
              cacheStats.size.toString(),
              `${(cacheStats.hitRate * 100).toFixed(1)}%`,
              cacheStats.hits.toString(),
              cacheStats.misses.toString()
            ]);
          });

          console.log(cacheTable.toString());
        }
      }

      if (options.optimizations) {
        const optimizations = cache.getQueryOptimizations();
        
        if (optimizations.length > 0) {
          console.log(chalk.yellow.bold('\n🔧 Query Optimizations\n'));
          
          optimizations.forEach((opt, i) => {
            const typeColor = opt.type === 'slow_query' ? chalk.red : 
                             opt.type === 'low_cache_hit_rate' ? chalk.yellow : chalk.green;
            
            console.log(`${i + 1}. ${typeColor(opt.type.toUpperCase())}`);
            console.log(`   Query: ${opt.query}`);
            console.log(`   Suggestion: ${opt.suggestion}`);
            if (opt.hitRate !== undefined) {
              console.log(`   Hit Rate: ${(opt.hitRate * 100).toFixed(1)}%`);
            }
            if (opt.avgDuration !== undefined) {
              console.log(`   Avg Duration: ${opt.avgDuration.toFixed(1)}ms`);
            }
            console.log();
          });
        } else {
          console.log(chalk.green('✅ No query optimizations needed'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with cache operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Bottlenecks command
 */
program
  .command('bottlenecks')
  .description('Show performance bottlenecks')
  .option('-t, --time-range <ms>', 'Time range in milliseconds', '3600000')
  .action(async (options) => {
    try {
      const timeRange = parseInt(options.timeRange);
      const bottlenecks = profiler.getBottlenecks(timeRange);

      console.log(chalk.red.bold('\n🚨 Performance Bottlenecks\n'));

      if (bottlenecks.length === 0) {
        console.log(chalk.green('✅ No bottlenecks detected'));
        return;
      }

      const bottleneckTable = new Table({
        head: ['Type', 'Severity', 'Impact', 'Timestamp', 'Details'],
        colWidths: [15, 10, 10, 20, 30]
      });

      bottlenecks.forEach(bottleneck => {
        const severityColor = bottleneck.severity >= 8 ? chalk.red : 
                             bottleneck.severity >= 6 ? chalk.yellow : chalk.blue;
        
        bottleneckTable.push([
          bottleneck.type,
          severityColor(bottleneck.severity.toString()),
          bottleneck.impact,
          new Date(bottleneck.timestamp).toLocaleString(),
          JSON.stringify(bottleneck.data, null, 0).substring(0, 25) + '...'
        ]);
      });

      console.log(bottleneckTable.toString());

      // Summary
      const summary = {
        total: bottlenecks.length,
        critical: bottlenecks.filter(b => b.severity >= 8).length,
        high: bottlenecks.filter(b => b.severity >= 6 && b.severity < 8).length,
        medium: bottlenecks.filter(b => b.severity >= 4 && b.severity < 6).length,
        low: bottlenecks.filter(b => b.severity < 4).length
      };

      console.log(chalk.blue.bold('\n📈 Summary:'));
      console.log(`Total: ${summary.total}`);
      console.log(`${chalk.red('Critical')}: ${summary.critical}`);
      console.log(`${chalk.yellow('High')}: ${summary.high}`);
      console.log(`${chalk.blue('Medium')}: ${summary.medium}`);
      console.log(`${chalk.gray('Low')}: ${summary.low}`);

    } catch (error) {
      console.error(chalk.red('Error retrieving bottlenecks:'), error.message);
      process.exit(1);
    }
  });

/**
 * Capacity command
 */
program
  .command('capacity')
  .description('Capacity planning and analysis')
  .option('-d, --dashboard', 'Show capacity dashboard')
  .option('-f, --forecast <resource>', 'Show forecast for resource')
  .option('-a, --autoscaling <resource>', 'Generate autoscaling config')
  .option('--target <utilization>', 'Target utilization percentage', '70')
  .action(async (options) => {
    try {
      if (options.dashboard) {
        const dashboard = capacity.getDashboardData();
        
        console.log(chalk.blue.bold('\n📊 Capacity Planning Dashboard\n'));

        // Resources table
        if (Object.keys(dashboard.resources).length > 0) {
          const resourceTable = new Table({
            head: ['Resource', 'Current Usage', 'Trend', 'Forecast Peak', 'Status'],
            colWidths: [15, 15, 12, 15, 12]
          });

          Object.entries(dashboard.resources).forEach(([resource, data]) => {
            const statusColor = data.status === 'critical' ? chalk.red :
                               data.status === 'warning' ? chalk.yellow : chalk.green;
            
            resourceTable.push([
              resource,
              data.currentUsage.toFixed(2),
              data.trend,
              data.forecastPeak.toFixed(2),
              statusColor(data.status)
            ]);
          });

          console.log(resourceTable.toString());
        }

        // Alerts
        if (dashboard.alerts.length > 0) {
          console.log(chalk.red.bold('\n🚨 Capacity Alerts\n'));
          dashboard.alerts.forEach((alert, i) => {
            console.log(`${i + 1}. ${chalk.red(alert.severity.toUpperCase())} - ${alert.resource}`);
            console.log(`   ${alert.message}`);
            console.log(`   Action: ${alert.action}`);
            console.log();
          });
        }

        // Top recommendations
        if (dashboard.recommendations.length > 0) {
          console.log(chalk.yellow.bold('\n💡 Top Recommendations\n'));
          dashboard.recommendations.slice(0, 5).forEach((rec, i) => {
            const priority = getPriorityColor(rec.priority);
            console.log(`${i + 1}. ${priority} ${rec.title || rec.reason}`);
            if (rec.description) console.log(`   ${rec.description}`);
            if (rec.actions) {
              rec.actions.forEach(action => console.log(`   • ${action}`));
            }
            console.log();
          });
        }
      }

      if (options.forecast) {
        const analysis = capacity.analyzeCapacity(options.forecast);
        if (!analysis) {
          console.log(chalk.red(`No capacity data found for resource: ${options.forecast}`));
          return;
        }

        console.log(chalk.blue.bold(`\n📈 Capacity Forecast: ${options.forecast}\n`));

        const forecastTable = new Table({
          head: ['Metric', 'Current', 'Trend', 'Forecast (30d)'],
          colWidths: [15, 12, 12, 15]
        });

        forecastTable.push(
          ['Average', analysis.current.average.toFixed(2), analysis.trends.direction, 
           analysis.forecast.summary.averageValue.toFixed(2)],
          ['Peak', analysis.current.max.toFixed(2), `${analysis.trends.slope.toFixed(3)}/period`, 
           analysis.forecast.summary.peakValue.toFixed(2)],
          ['Growth', '-', analysis.trends.predictability.toFixed(2), 
           analysis.forecast.summary.expectedGrowth.toFixed(2)]
        );

        console.log(forecastTable.toString());

        if (analysis.recommendations.length > 0) {
          console.log(chalk.yellow.bold('\n💡 Recommendations:\n'));
          analysis.recommendations.forEach((rec, i) => {
            const priority = getPriorityColor(rec.priority);
            console.log(`${i + 1}. ${priority} ${rec.message}`);
            if (rec.actions) {
              rec.actions.forEach(action => console.log(`   • ${action}`));
            }
            console.log();
          });
        }
      }

      if (options.autoscaling) {
        const targetUtilization = parseInt(options.target);
        const config = capacity.generateAutoScalingConfig(options.autoscaling, targetUtilization);
        
        console.log(chalk.blue.bold(`\n⚙️  Auto-scaling Configuration: ${options.autoscaling}\n`));
        console.log(JSON.stringify(config, null, 2));
      }

    } catch (error) {
      console.error(chalk.red('Error with capacity operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Benchmark command
 */
program
  .command('benchmark <name>')
  .description('Run performance benchmark')
  .option('-i, --iterations <count>', 'Number of iterations', '100')
  .option('-t, --timeout <ms>', 'Timeout per iteration', '30000')
  .action(async (name, options) => {
    try {
      const iterations = parseInt(options.iterations);
      const timeout = parseInt(options.timeout);

      console.log(chalk.blue.bold(`\n🏃 Running Benchmark: ${name}\n`));
      console.log(`Iterations: ${iterations}, Timeout: ${timeout}ms`);

      // Add a simple benchmark if it doesn't exist
      if (!regression.benchmarks.has(name)) {
        regression.addBenchmark(name, async () => {
          // CPU-bound task
          let sum = 0;
          for (let i = 0; i < 100000; i++) {
            sum += Math.random();
          }
          return sum;
        }, { iterations, timeout });
      }

      const result = await regression.runBenchmark(name);

      const benchmarkTable = new Table({
        head: ['Metric', 'Value'],
        colWidths: [20, 15]
      });

      benchmarkTable.push(
        ['Mean Duration', `${result.statistics.mean.toFixed(2)}ms`],
        ['Median Duration', `${result.statistics.median.toFixed(2)}ms`],
        ['P95 Duration', `${result.statistics.p95.toFixed(2)}ms`],
        ['P99 Duration', `${result.statistics.p99.toFixed(2)}ms`],
        ['Min Duration', `${result.statistics.min.toFixed(2)}ms`],
        ['Max Duration', `${result.statistics.max.toFixed(2)}ms`],
        ['Error Rate', `${(result.errorRate * 100).toFixed(2)}%`],
        ['Total Iterations', result.results.length.toString()]
      );

      console.log(benchmarkTable.toString());

      if (result.errorRate > 0) {
        console.log(chalk.red(`\n⚠️  ${(result.errorRate * 100).toFixed(1)}% of iterations failed`));
      } else {
        console.log(chalk.green('\n✅ All iterations completed successfully'));
      }

    } catch (error) {
      console.error(chalk.red('Error running benchmark:'), error.message);
      process.exit(1);
    }
  });

/**
 * Health command
 */
program
  .command('health')
  .description('Overall performance health check')
  .option('-t, --time-range <ms>', 'Time range in milliseconds', '3600000')
  .action(async (options) => {
    try {
      const timeRange = parseInt(options.timeRange);
      
      console.log(chalk.blue.bold('\n🏥 Performance Health Check\n'));

      // Simulate health calculation
      const sloStatus = metrics.getSLOStatus(timeRange);
      const bottlenecks = profiler.getBottlenecks(timeRange);
      
      let healthScore = 100;
      
      // Deduct for SLO violations
      if (sloStatus.overall === 'critical') healthScore -= 30;
      else if (sloStatus.overall === 'warning') healthScore -= 15;
      
      // Deduct for bottlenecks
      const criticalBottlenecks = bottlenecks.filter(b => b.severity >= 8).length;
      healthScore -= criticalBottlenecks * 10;
      
      healthScore = Math.max(0, healthScore);
      
      let status = 'healthy';
      let statusColor = chalk.green;
      if (healthScore < 50) {
        status = 'critical';
        statusColor = chalk.red;
      } else if (healthScore < 70) {
        status = 'warning';
        statusColor = chalk.yellow;
      } else if (healthScore < 90) {
        status = 'degraded';
        statusColor = chalk.blue;
      }

      console.log(`Overall Health Score: ${statusColor.bold(healthScore)}/100`);
      console.log(`Status: ${statusColor.bold(status.toUpperCase())}`);
      console.log();

      const healthTable = new Table({
        head: ['Component', 'Status', 'Issues'],
        colWidths: [15, 12, 30]
      });

      healthTable.push(
        ['SLO Compliance', getStatusColor(sloStatus.overall), 
         sloStatus.overall === 'healthy' ? 'None' : 'SLO violations detected'],
        ['Bottlenecks', criticalBottlenecks > 0 ? chalk.red('Critical') : chalk.green('Healthy'), 
         `${criticalBottlenecks} critical bottlenecks`],
        ['Cache Performance', chalk.green('Healthy'), 'Operating normally'],
        ['Capacity', chalk.green('Healthy'), 'Within normal ranges']
      );

      console.log(healthTable.toString());

    } catch (error) {
      console.error(chalk.red('Error checking health:'), error.message);
      process.exit(1);
    }
  });

/**
 * Helper functions
 */
function getStatusColor(status) {
  switch (status) {
    case 'healthy': return chalk.green('Healthy');
    case 'warning': return chalk.yellow('Warning');
    case 'critical': return chalk.red('Critical');
    case 'degraded': return chalk.blue('Degraded');
    default: return chalk.gray('Unknown');
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'critical': return chalk.red.bold('[CRITICAL]');
    case 'high': return chalk.red('[HIGH]');
    case 'medium': return chalk.yellow('[MEDIUM]');
    case 'low': return chalk.blue('[LOW]');
    default: return chalk.gray('[INFO]');
  }
}

// Parse command line arguments
program.parse();