#!/usr/bin/env node

/**
 * Simple Storage Management CLI
 * 
 * Basic command-line interface for unified storage system without external dependencies
 */

import UnifiedStorageService from '../services/UnifiedStorageService.mjs';
import ipfsService from '../services/ipfsService.mjs';
import { EventBusService } from '../services/EventBusService.mjs';

// Mock services for testing
const mockQerberosService = {
  audit: async (event) => {
    console.log(`[Audit] ${event.type}: ${event.outcome}`);
    return { success: true };
  }
};

const mockQindexService = {
  put: async (key, value) => {
    console.log(`[Index] Put: ${key}`);
    return { success: true };
  },
  get: async (key) => {
    console.log(`[Index] Get: ${key}`);
    return null;
  }
};

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Usage: node storage-management-simple.mjs <command>');
    console.log('Commands:');
    console.log('  init     - Initialize storage service');
    console.log('  stats    - Show storage statistics');
    console.log('  policies - List pinning policies');
    console.log('  gc       - Run garbage collection');
    console.log('  backup   - Run backup verification');
    console.log('  test     - Run disaster recovery test');
    return;
  }

  try {
    // Initialize services
    const eventBus = new EventBusService();
    if (eventBus.initialize) {
      await eventBus.initialize();
    }

    const storageService = new UnifiedStorageService({
      ipfsService,
      eventBus,
      qerberosService: mockQerberosService,
      qindexService: mockQindexService
    });

    await storageService.initialize();

    switch (command) {
      case 'init':
        console.log('✅ Storage service initialized successfully');
        break;

      case 'stats':
        const stats = await storageService.getStorageStats();
        console.log('\n📊 Storage Statistics:');
        console.log(`Total Files: ${stats.totalFiles}`);
        console.log(`Active Quotas: ${stats.totalQuotas}`);
        console.log(`Access Patterns: ${stats.activePatterns}`);
        console.log(`Deduplication Cache: ${stats.deduplicationCache}`);
        console.log(`GC Queue: ${stats.garbageCollectionQueue}`);
        console.log(`Pinning Policies: ${stats.pinningPolicies}`);
        break;

      case 'policies':
        console.log('\n📋 Pinning Policies:');
        for (const [id, policy] of storageService.pinningPolicies.entries()) {
          console.log(`${id}: ${policy.name} (${policy.minReplicas}-${policy.maxReplicas} replicas, ${policy.priority} priority)`);
        }
        break;

      case 'gc':
        console.log('🗑️  Running garbage collection...');
        const gcStats = await storageService.startGarbageCollection();
        console.log(`✅ Processed: ${gcStats.filesProcessed}, Deleted: ${gcStats.filesDeleted}, Errors: ${gcStats.errors}`);
        break;

      case 'backup':
        console.log('🔍 Running backup verification...');
        const backupStats = await storageService.verifyBackups();
        console.log(`✅ Checked: ${backupStats.backupsChecked}, Healthy: ${backupStats.backupsHealthy}, Failed: ${backupStats.backupsFailed}`);
        break;

      case 'test':
        console.log('🚨 Running disaster recovery test...');
        const testResults = await storageService.performDisasterRecoveryTest();
        console.log(`✅ Overall status: ${testResults.overallStatus.toUpperCase()}`);
        break;

      default:
        console.log(`Unknown command: ${command}`);
        process.exit(1);
    }

    // Cleanup
    await storageService.shutdown();
    if (eventBus.shutdown) {
      await eventBus.shutdown();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

// Run the CLI
main();