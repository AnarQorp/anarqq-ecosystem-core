#!/usr/bin/env node

/**
 * Storage Management CLI
 * 
 * Command-line interface for managing unified storage system including:
 * - IPFS pinning policies and automation
 * - Content deduplication and optimization
 * - Storage quota management
 * - Backup verification and disaster recovery
 * - Garbage collection automation
 * 
 * Usage:
 *   node storage-management-cli.mjs <command> [options]
 * 
 * Commands:
 *   policy     - Manage pinning policies
 *   quota      - Manage storage quotas
 *   gc         - Run garbage collection
 *   backup     - Backup verification and recovery
 *   stats      - Show storage statistics
 *   dedup      - Content deduplication management
 */

import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import UnifiedStorageService from '../services/UnifiedStorageService.mjs';
import ipfsService from '../services/ipfsService.mjs';
import { EventBusService } from '../services/EventBusService.mjs';

// Initialize services
const eventBus = new EventBusService();
const storageService = new UnifiedStorageService({
  ipfsService,
  eventBus
});

// CLI Configuration
program
  .name('storage-cli')
  .description('Unified Storage Management CLI')
  .version('1.0.0');

// ==================== POLICY MANAGEMENT ====================

program
  .command('policy')
  .description('Manage IPFS pinning policies')
  .option('-l, --list', 'List all pinning policies')
  .option('-c, --create', 'Create new pinning policy')
  .option('-u, --update <id>', 'Update existing policy')
  .option('-d, --delete <id>', 'Delete policy')
  .option('-a, --apply <cid>', 'Apply policy to content')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.list) {
        await listPinningPolicies();
      } else if (options.create) {
        await createPinningPolicy();
      } else if (options.update) {
        await updatePinningPolicy(options.update);
      } else if (options.delete) {
        await deletePinningPolicy(options.delete);
      } else if (options.apply) {
        await applyPinningPolicy(options.apply);
      } else {
        console.log(chalk.yellow('Please specify an action. Use --help for options.'));
      }
    } catch (error) {
      console.error(chalk.red('Policy command failed:'), error.message);
      process.exit(1);
    }
  });

async function listPinningPolicies() {
  const policies = Array.from(storageService.pinningPolicies.entries());
  
  if (policies.length === 0) {
    console.log(chalk.yellow('No pinning policies found.'));
    return;
  }

  const table = new Table({
    head: ['ID', 'Name', 'Min Replicas', 'Max Replicas', 'Priority', 'TTL (days)'],
    colWidths: [15, 25, 12, 12, 10, 12]
  });

  policies.forEach(([id, policy]) => {
    table.push([
      id,
      policy.name,
      policy.minReplicas,
      policy.maxReplicas,
      policy.priority,
      Math.round(policy.ttl / 86400)
    ]);
  });

  console.log(chalk.blue('\n📋 Pinning Policies:'));
  console.log(table.toString());
}

async function createPinningPolicy() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Policy ID:',
      validate: (input) => input.length > 0 || 'Policy ID is required'
    },
    {
      type: 'input',
      name: 'name',
      message: 'Policy Name:',
      validate: (input) => input.length > 0 || 'Policy name is required'
    },
    {
      type: 'number',
      name: 'minReplicas',
      message: 'Minimum Replicas:',
      default: 2,
      validate: (input) => input > 0 || 'Must be greater than 0'
    },
    {
      type: 'number',
      name: 'maxReplicas',
      message: 'Maximum Replicas:',
      default: 5,
      validate: (input) => input > 0 || 'Must be greater than 0'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority:',
      choices: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    },
    {
      type: 'number',
      name: 'ttlDays',
      message: 'TTL (days):',
      default: 30,
      validate: (input) => input > 0 || 'Must be greater than 0'
    },
    {
      type: 'checkbox',
      name: 'geoDistribution',
      message: 'Geo Distribution:',
      choices: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
      default: ['us-east-1', 'eu-west-1']
    }
  ]);

  const policy = {
    name: answers.name,
    minReplicas: answers.minReplicas,
    maxReplicas: answers.maxReplicas,
    priority: answers.priority,
    ttl: answers.ttlDays * 86400,
    geoDistribution: answers.geoDistribution,
    conditions: {}
  };

  storageService.pinningPolicies.set(answers.id, policy);
  console.log(chalk.green(`✅ Created pinning policy: ${answers.id}`));
}

async function applyPinningPolicy(cid) {
  const policies = Array.from(storageService.pinningPolicies.keys());
  
  const { policyId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'policyId',
      message: 'Select policy to apply:',
      choices: policies
    }
  ]);

  try {
    const result = await storageService.applyPinningPolicy(cid, {}, policyId);
    console.log(chalk.green(`✅ Applied policy ${policyId} to ${cid}`));
    console.log(`   Replicas: ${result.replicas}`);
    console.log(`   Status: ${result.status}`);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to apply policy: ${error.message}`));
  }
}

// ==================== QUOTA MANAGEMENT ====================

program
  .command('quota')
  .description('Manage storage quotas')
  .option('-l, --list', 'List all storage quotas')
  .option('-s, --show <squidId>', 'Show quota for specific user')
  .option('-u, --update <squidId>', 'Update user quota')
  .option('-r, --reset <squidId>', 'Reset user quota usage')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.list) {
        await listStorageQuotas();
      } else if (options.show) {
        await showStorageQuota(options.show);
      } else if (options.update) {
        await updateStorageQuota(options.update);
      } else if (options.reset) {
        await resetStorageQuota(options.reset);
      } else {
        console.log(chalk.yellow('Please specify an action. Use --help for options.'));
      }
    } catch (error) {
      console.error(chalk.red('Quota command failed:'), error.message);
      process.exit(1);
    }
  });

async function listStorageQuotas() {
  const quotas = Array.from(storageService.storageQuotas.entries());
  
  if (quotas.length === 0) {
    console.log(chalk.yellow('No storage quotas found.'));
    return;
  }

  const table = new Table({
    head: ['Squid ID', 'Used (GB)', 'Limit (GB)', 'Usage %', 'Status'],
    colWidths: [20, 12, 12, 10, 12]
  });

  quotas.forEach(([squidId, quota]) => {
    const usedGB = (quota.used / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (quota.limit / (1024 * 1024 * 1024)).toFixed(2);
    const usagePercent = ((quota.used / quota.limit) * 100).toFixed(1);
    const status = storageService.getWarningLevel(quota.used / quota.limit);
    
    const statusColor = status === 'critical' ? chalk.red : 
                       status === 'warning' ? chalk.yellow : chalk.green;
    
    table.push([
      squidId,
      usedGB,
      limitGB,
      `${usagePercent}%`,
      statusColor(status.toUpperCase())
    ]);
  });

  console.log(chalk.blue('\n💾 Storage Quotas:'));
  console.log(table.toString());
}

async function showStorageQuota(squidId) {
  try {
    const usage = await storageService.getStorageUsage(squidId);
    
    console.log(chalk.blue(`\n📊 Storage Usage for ${squidId}:`));
    console.log(`Used: ${(usage.used / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Limit: ${(usage.limit / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Available: ${(usage.available / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Usage: ${(usage.usagePercentage * 100).toFixed(1)}%`);
    console.log(`Status: ${usage.warningLevel.toUpperCase()}`);
    console.log(`Last Updated: ${usage.lastUpdated}`);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to get quota: ${error.message}`));
  }
}

async function updateStorageQuota(squidId) {
  const { newLimit } = await inquirer.prompt([
    {
      type: 'number',
      name: 'newLimit',
      message: 'New quota limit (GB):',
      validate: (input) => input > 0 || 'Must be greater than 0'
    }
  ]);

  try {
    const newLimitBytes = newLimit * 1024 * 1024 * 1024;
    await storageService.updateStorageQuota(squidId, newLimitBytes);
    console.log(chalk.green(`✅ Updated quota for ${squidId} to ${newLimit} GB`));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to update quota: ${error.message}`));
  }
}

// ==================== GARBAGE COLLECTION ====================

program
  .command('gc')
  .description('Garbage collection management')
  .option('-r, --run', 'Run garbage collection now')
  .option('-s, --status', 'Show garbage collection status')
  .option('-q, --queue', 'Show garbage collection queue')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.run) {
        await runGarbageCollection();
      } else if (options.status) {
        await showGarbageCollectionStatus();
      } else if (options.queue) {
        await showGarbageCollectionQueue();
      } else {
        console.log(chalk.yellow('Please specify an action. Use --help for options.'));
      }
    } catch (error) {
      console.error(chalk.red('Garbage collection command failed:'), error.message);
      process.exit(1);
    }
  });

async function runGarbageCollection() {
  console.log(chalk.blue('🗑️  Starting garbage collection...'));
  
  try {
    const stats = await storageService.startGarbageCollection();
    
    console.log(chalk.green('\n✅ Garbage collection completed:'));
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files deleted: ${stats.filesDeleted}`);
    console.log(`Space freed: ${(stats.spaceFree / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Orphans found: ${stats.orphansFound}`);
    console.log(`Errors: ${stats.errors}`);
  } catch (error) {
    console.error(chalk.red(`❌ Garbage collection failed: ${error.message}`));
  }
}

async function showGarbageCollectionQueue() {
  const queueSize = storageService.garbageCollectionQueue.size;
  
  if (queueSize === 0) {
    console.log(chalk.green('✅ Garbage collection queue is empty'));
    return;
  }

  console.log(chalk.yellow(`📋 Garbage collection queue: ${queueSize} items`));
  
  const items = Array.from(storageService.garbageCollectionQueue).slice(0, 10);
  items.forEach((cid, index) => {
    console.log(`${index + 1}. ${cid}`);
  });
  
  if (queueSize > 10) {
    console.log(`... and ${queueSize - 10} more items`);
  }
}

// ==================== BACKUP VERIFICATION ====================

program
  .command('backup')
  .description('Backup verification and disaster recovery')
  .option('-v, --verify', 'Run backup verification')
  .option('-t, --test', 'Run disaster recovery test')
  .option('-s, --status', 'Show backup status')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.verify) {
        await runBackupVerification();
      } else if (options.test) {
        await runDisasterRecoveryTest();
      } else if (options.status) {
        await showBackupStatus();
      } else {
        console.log(chalk.yellow('Please specify an action. Use --help for options.'));
      }
    } catch (error) {
      console.error(chalk.red('Backup command failed:'), error.message);
      process.exit(1);
    }
  });

async function runBackupVerification() {
  console.log(chalk.blue('🔍 Starting backup verification...'));
  
  try {
    const stats = await storageService.verifyBackups();
    
    console.log(chalk.green('\n✅ Backup verification completed:'));
    console.log(`Backups checked: ${stats.backupsChecked}`);
    console.log(`Healthy: ${stats.backupsHealthy}`);
    console.log(`Degraded: ${stats.backupsDegraded}`);
    console.log(`Failed: ${stats.backupsFailed}`);
    console.log(`Integrity errors: ${stats.integrityErrors}`);
    
    if (stats.backupsFailed > 0 || stats.integrityErrors > 0) {
      console.log(chalk.red('\n⚠️  Issues found - check logs for details'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Backup verification failed: ${error.message}`));
  }
}

async function runDisasterRecoveryTest() {
  console.log(chalk.blue('🚨 Starting disaster recovery test...'));
  
  try {
    const results = await storageService.performDisasterRecoveryTest();
    
    console.log(chalk.green('\n✅ Disaster recovery test completed:'));
    console.log(`Overall status: ${results.overallStatus.toUpperCase()}`);
    
    const tests = [
      ['Backup Restore', results.backupRestoreTest],
      ['Replication', results.replicationTest],
      ['Data Integrity', results.integrityTest],
      ['Performance', results.performanceTest]
    ];
    
    tests.forEach(([name, test]) => {
      if (test) {
        const statusColor = test.status === 'passed' ? chalk.green : chalk.red;
        console.log(`${name}: ${statusColor(test.status.toUpperCase())}`);
      }
    });
    
    if (results.overallStatus !== 'passed') {
      console.log(chalk.red('\n⚠️  Some tests failed - check logs for details'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Disaster recovery test failed: ${error.message}`));
  }
}

// ==================== STATISTICS ====================

program
  .command('stats')
  .description('Show storage statistics')
  .option('-o, --overview', 'Show overview statistics')
  .option('-d, --detailed', 'Show detailed statistics')
  .option('-a, --access', 'Show access patterns')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.overview || (!options.detailed && !options.access)) {
        await showOverviewStats();
      }
      
      if (options.detailed) {
        await showDetailedStats();
      }
      
      if (options.access) {
        await showAccessPatterns();
      }
    } catch (error) {
      console.error(chalk.red('Stats command failed:'), error.message);
      process.exit(1);
    }
  });

async function showOverviewStats() {
  const stats = await storageService.getStorageStats();
  
  console.log(chalk.blue('\n📊 Storage Overview:'));
  console.log(`Total Files: ${stats.totalFiles}`);
  console.log(`Active Quotas: ${stats.totalQuotas}`);
  console.log(`Access Patterns: ${stats.activePatterns}`);
  console.log(`Deduplication Cache: ${stats.deduplicationCache}`);
  console.log(`GC Queue: ${stats.garbageCollectionQueue}`);
  console.log(`Pinning Policies: ${stats.pinningPolicies}`);
  console.log(`Background Processes: ${stats.backgroundProcesses}`);
}

async function showAccessPatterns() {
  const patterns = Array.from(storageService.accessPatterns.entries()).slice(0, 10);
  
  if (patterns.length === 0) {
    console.log(chalk.yellow('No access patterns found.'));
    return;
  }

  const table = new Table({
    head: ['CID', 'Total Access', 'Daily', 'Weekly', 'Last Accessed'],
    colWidths: [20, 12, 8, 8, 20]
  });

  patterns.forEach(([cid, pattern]) => {
    table.push([
      cid.substring(0, 18) + '...',
      pattern.totalAccess,
      pattern.dailyAccess,
      pattern.weeklyAccess,
      new Date(pattern.lastAccessed).toLocaleDateString()
    ]);
  });

  console.log(chalk.blue('\n📈 Access Patterns (Top 10):'));
  console.log(table.toString());
}

// ==================== DEDUPLICATION ====================

program
  .command('dedup')
  .description('Content deduplication management')
  .option('-s, --stats', 'Show deduplication statistics')
  .option('-c, --cache', 'Show deduplication cache')
  .option('-r, --rebuild', 'Rebuild deduplication cache')
  .action(async (options) => {
    try {
      await storageService.initialize();

      if (options.stats) {
        await showDeduplicationStats();
      } else if (options.cache) {
        await showDeduplicationCache();
      } else if (options.rebuild) {
        await rebuildDeduplicationCache();
      } else {
        console.log(chalk.yellow('Please specify an action. Use --help for options.'));
      }
    } catch (error) {
      console.error(chalk.red('Deduplication command failed:'), error.message);
      process.exit(1);
    }
  });

async function showDeduplicationStats() {
  const cacheSize = storageService.deduplicationCache.size;
  
  console.log(chalk.blue('\n🔄 Deduplication Statistics:'));
  console.log(`Cache entries: ${cacheSize}`);
  console.log(`Deduplication enabled: ${storageService.config.deduplication.enabled}`);
  console.log(`Hash algorithm: ${storageService.config.deduplication.hashAlgorithm}`);
  console.log(`Minimum file size: ${storageService.config.deduplication.minFileSize} bytes`);
}

async function showDeduplicationCache() {
  const cache = Array.from(storageService.deduplicationCache.entries()).slice(0, 10);
  
  if (cache.length === 0) {
    console.log(chalk.yellow('Deduplication cache is empty.'));
    return;
  }

  const table = new Table({
    head: ['Content Hash', 'CID'],
    colWidths: [35, 25]
  });

  cache.forEach(([hash, cid]) => {
    table.push([
      hash.substring(0, 32) + '...',
      cid.substring(0, 22) + '...'
    ]);
  });

  console.log(chalk.blue('\n🔄 Deduplication Cache (Top 10):'));
  console.log(table.toString());
}

// ==================== MAIN EXECUTION ====================

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('CLI Error:'), error.message);
    process.exit(1);
  } finally {
    if (storageService.initialized) {
      await storageService.shutdown();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down...'));
  if (storageService.initialized) {
    await storageService.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down...'));
  if (storageService.initialized) {
    await storageService.shutdown();
  }
  process.exit(0);
});

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default program;