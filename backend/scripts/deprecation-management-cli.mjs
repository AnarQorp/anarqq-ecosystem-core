#!/usr/bin/env node

/**
 * Deprecation Management CLI
 * Command-line interface for managing feature deprecations and migrations
 */

import { Command } from 'commander';
import DeprecationManagementService from '../services/DeprecationManagementService.mjs';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const program = new Command();
const deprecationService = new DeprecationManagementService();

program
  .name('deprecation-cli')
  .description('CLI for managing feature deprecations and migrations')
  .version('1.0.0');

// Deprecation Schedule Commands
program
  .command('schedule')
  .description('Manage deprecation schedules')
  .addCommand(
    new Command('create')
      .description('Create a new deprecation schedule')
      .requiredOption('-f, --feature <feature>', 'Feature name')
      .requiredOption('-v, --version <version>', 'Feature version')
      .requiredOption('-d, --deprecation-date <date>', 'Deprecation date (ISO 8601)')
      .requiredOption('-s, --sunset-date <date>', 'Sunset date (ISO 8601)')
      .option('-m, --migration-deadline <date>', 'Migration deadline (ISO 8601)')
      .option('-r, --replacement <feature>', 'Replacement feature')
      .option('-g, --guide <url>', 'Migration guide URL')
      .option('-l, --support-level <level>', 'Support level (FULL|MAINTENANCE|SECURITY_ONLY)', 'MAINTENANCE')
      .action(async (options) => {
        try {
          const schedule = {
            feature: options.feature,
            version: options.version,
            deprecationDate: options.deprecationDate,
            sunsetDate: options.sunsetDate,
            migrationDeadline: options.migrationDeadline || options.sunsetDate,
            replacementFeature: options.replacement,
            migrationGuide: options.guide,
            supportLevel: options.supportLevel
          };

          const featureId = `${options.feature}@${options.version}`;
          const result = await deprecationService.createDeprecationSchedule(featureId, schedule);
          
          console.log('✅ Deprecation schedule created successfully:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('❌ Failed to create deprecation schedule:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all deprecation schedules')
      .option('-a, --active-only', 'Show only active deprecations')
      .action(async (options) => {
        try {
          const report = await deprecationService.generateDeprecationReport();
          
          console.log('📋 Deprecation Schedules:');
          console.log(`Total: ${report.summary.totalDeprecatedFeatures}`);
          console.log(`Active: ${report.summary.activeDeprecations}`);
          console.log('');

          for (const feature of report.features) {
            if (options.activeOnly && feature.status !== 'ANNOUNCED') continue;
            
            console.log(`🔸 ${feature.featureId}`);
            console.log(`   Status: ${feature.status}`);
            console.log(`   Deprecation: ${feature.deprecationDate}`);
            console.log(`   Sunset: ${feature.sunsetDate}`);
            console.log(`   Affected Consumers: ${feature.affectedConsumers}`);
            console.log('');
          }
        } catch (error) {
          console.error('❌ Failed to list deprecation schedules:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Get status of a specific feature deprecation')
      .requiredOption('-f, --feature-id <id>', 'Feature ID (name@version)')
      .action(async (options) => {
        try {
          const status = deprecationService.getDeprecationStatus(options.featureId);
          
          if (!status.isDeprecated) {
            console.log(`ℹ️  Feature ${options.featureId} is not deprecated`);
            return;
          }

          console.log(`📊 Deprecation Status for ${options.featureId}:`);
          console.log(JSON.stringify(status, null, 2));
        } catch (error) {
          console.error('❌ Failed to get deprecation status:', error.message);
          process.exit(1);
        }
      })
  );

// Usage Telemetry Commands
program
  .command('telemetry')
  .description('Manage usage telemetry')
  .addCommand(
    new Command('track')
      .description('Track feature usage')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .requiredOption('-c, --consumer-id <id>', 'Consumer ID')
      .option('-x, --context <json>', 'Usage context (JSON)')
      .option('-m, --metadata <json>', 'Usage metadata (JSON)')
      .action(async (options) => {
        try {
          const usageData = {
            consumerId: options.consumerId,
            context: options.context ? JSON.parse(options.context) : {},
            metadata: options.metadata ? JSON.parse(options.metadata) : {}
          };

          const result = await deprecationService.trackFeatureUsage(options.featureId, usageData);
          
          console.log('✅ Usage tracked successfully:');
          console.log(`Total usage: ${result.totalUsage}`);
          console.log(`Unique consumers: ${result.uniqueConsumers.length}`);
        } catch (error) {
          console.error('❌ Failed to track usage:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('report')
      .description('Generate usage report for a feature')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .option('-o, --output <file>', 'Output file (JSON)')
      .action(async (options) => {
        try {
          const telemetry = deprecationService.usageTelemetry.get(options.featureId);
          
          if (!telemetry) {
            console.log(`ℹ️  No usage data found for ${options.featureId}`);
            return;
          }

          if (options.output) {
            await writeFile(options.output, JSON.stringify(telemetry, null, 2));
            console.log(`✅ Usage report saved to ${options.output}`);
          } else {
            console.log('📊 Usage Report:');
            console.log(JSON.stringify(telemetry, null, 2));
          }
        } catch (error) {
          console.error('❌ Failed to generate usage report:', error.message);
          process.exit(1);
        }
      })
  );

// Migration Commands
program
  .command('migration')
  .description('Manage migrations')
  .addCommand(
    new Command('plan')
      .description('Create a migration plan')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .requiredOption('-t, --to-feature <feature>', 'Target feature')
      .requiredOption('-s, --steps <file>', 'Migration steps file (JSON)')
      .option('-v, --validation <file>', 'Validation rules file (JSON)')
      .option('-d, --duration <duration>', 'Estimated duration')
      .option('--no-rollback', 'Disable rollback support')
      .action(async (options) => {
        try {
          const steps = JSON.parse(await readFile(options.steps, 'utf8'));
          const validationRules = options.validation ? 
            JSON.parse(await readFile(options.validation, 'utf8')) : [];

          const migrationPlan = {
            fromFeature: options.featureId,
            toFeature: options.toFeature,
            steps,
            validationRules,
            rollbackSupport: options.rollback,
            estimatedDuration: options.duration
          };

          const result = await deprecationService.createMigrationPlan(options.featureId, migrationPlan);
          
          console.log('✅ Migration plan created successfully:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('❌ Failed to create migration plan:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('execute')
      .description('Execute migration for a consumer')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .requiredOption('-c, --consumer-id <id>', 'Consumer ID')
      .option('-d, --dry-run', 'Perform dry run without making changes')
      .option('-o, --options <json>', 'Migration options (JSON)')
      .action(async (options) => {
        try {
          const migrationOptions = {
            dryRun: options.dryRun,
            ...(options.options ? JSON.parse(options.options) : {})
          };

          const result = await deprecationService.executeMigration(
            options.featureId,
            options.consumerId,
            migrationOptions
          );
          
          console.log('✅ Migration executed:');
          console.log(`Status: ${result.status}`);
          console.log(`Steps completed: ${result.steps.length}`);
          
          if (result.errors.length > 0) {
            console.log('❌ Errors:');
            result.errors.forEach(error => console.log(`  - ${error}`));
          }
        } catch (error) {
          console.error('❌ Failed to execute migration:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('rollback')
      .description('Rollback a migration')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .requiredOption('-c, --consumer-id <id>', 'Consumer ID')
      .requiredOption('-e, --execution-id <id>', 'Migration execution ID')
      .action(async (options) => {
        try {
          const result = await deprecationService.rollbackMigration(
            options.featureId,
            options.consumerId,
            options.executionId
          );
          
          console.log('✅ Migration rolled back successfully:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('❌ Failed to rollback migration:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('progress')
      .description('Show migration progress for a feature')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .action(async (options) => {
        try {
          const progress = deprecationService.getMigrationProgress(options.featureId);
          
          if (!progress) {
            console.log(`ℹ️  No migration data found for ${options.featureId}`);
            return;
          }

          console.log(`📊 Migration Progress for ${options.featureId}:`);
          console.log(`Total Consumers: ${progress.totalConsumers}`);
          console.log('Status Distribution:');
          Object.entries(progress.migrationStatus).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
          });
          
          console.log('\nConsumer Details:');
          progress.consumers.forEach(consumer => {
            console.log(`  ${consumer.consumerId}: ${consumer.status} (${consumer.usageCount} uses)`);
          });
        } catch (error) {
          console.error('❌ Failed to get migration progress:', error.message);
          process.exit(1);
        }
      })
  );

// Compatibility Layer Commands
program
  .command('compatibility')
  .description('Manage compatibility layers')
  .addCommand(
    new Command('create')
      .description('Create a compatibility layer')
      .requiredOption('-f, --feature-id <id>', 'Feature ID')
      .requiredOption('-t, --type <type>', 'Layer type (ADAPTER|PROXY|WRAPPER)')
      .requiredOption('-c, --config <file>', 'Configuration file (JSON)')
      .option('-e, --expires <date>', 'Expiration date (ISO 8601)')
      .action(async (options) => {
        try {
          const configuration = JSON.parse(await readFile(options.config, 'utf8'));
          
          const layerConfig = {
            type: options.type,
            configuration,
            expiresAt: options.expires
          };

          const result = await deprecationService.createCompatibilityLayer(options.featureId, layerConfig);
          
          console.log('✅ Compatibility layer created successfully:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('❌ Failed to create compatibility layer:', error.message);
          process.exit(1);
        }
      })
  );

// Report Commands
program
  .command('report')
  .description('Generate comprehensive deprecation report')
  .option('-o, --output <file>', 'Output file (JSON)')
  .option('-f, --format <format>', 'Output format (json|csv|html)', 'json')
  .action(async (options) => {
    try {
      const report = await deprecationService.generateDeprecationReport();
      
      if (options.output) {
        let content;
        switch (options.format) {
          case 'json':
            content = JSON.stringify(report, null, 2);
            break;
          case 'csv':
            content = generateCSVReport(report);
            break;
          case 'html':
            content = generateHTMLReport(report);
            break;
          default:
            throw new Error(`Unsupported format: ${options.format}`);
        }
        
        await writeFile(options.output, content);
        console.log(`✅ Report saved to ${options.output}`);
      } else {
        console.log('📊 Deprecation Report:');
        console.log(JSON.stringify(report, null, 2));
      }
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
      process.exit(1);
    }
  });

function generateCSVReport(report) {
  const headers = ['Feature ID', 'Status', 'Deprecation Date', 'Sunset Date', 'Affected Consumers'];
  const rows = report.features.map(feature => [
    feature.featureId,
    feature.status,
    feature.deprecationDate,
    feature.sunsetDate,
    feature.affectedConsumers
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Deprecation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Deprecation Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Generated: ${report.generatedAt}</p>
        <p>Total Deprecated Features: ${report.summary.totalDeprecatedFeatures}</p>
        <p>Active Deprecations: ${report.summary.activeDeprecations}</p>
        <p>Completed Migrations: ${report.summary.completedMigrations}</p>
        <p>Pending Migrations: ${report.summary.pendingMigrations}</p>
    </div>
    
    <h2>Features</h2>
    <table>
        <tr>
            <th>Feature ID</th>
            <th>Status</th>
            <th>Deprecation Date</th>
            <th>Sunset Date</th>
            <th>Affected Consumers</th>
        </tr>
        ${report.features.map(feature => `
        <tr>
            <td>${feature.featureId}</td>
            <td>${feature.status}</td>
            <td>${feature.deprecationDate}</td>
            <td>${feature.sunsetDate}</td>
            <td>${feature.affectedConsumers}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>
  `;
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

program.parse();