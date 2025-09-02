/**
 * E2E Global Teardown
 * 
 * Global teardown that runs once after all E2E tests.
 * Cleans up test infrastructure, generates final reports, and performs cleanup.
 */

import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

export default async function globalTeardown() {
  const teardownStartTime = performance.now();
  
  console.log('🌍 Starting E2E Global Teardown...');
  
  try {
    // Generate final test reports
    await generateFinalReports();
    
    // Cleanup test infrastructure
    await cleanupTestInfrastructure();
    
    // Archive test artifacts
    await archiveTestArtifacts();
    
    // Perform final cleanup
    await performFinalCleanup();
    
    const teardownDuration = performance.now() - teardownStartTime;
    console.log(`✅ E2E Global Teardown completed in ${teardownDuration.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ E2E Global Teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function generateFinalReports() {
  console.log('📊 Generating final test reports...');
  
  try {
    // Collect all test metrics
    const metrics = global.__E2E_METRICS__?.getMetrics() || {};
    const setupInfo = global.__E2E_SETUP_INFO__ || {};
    const eventBusStats = getEventBusStatistics();
    const storageStats = getStorageStatistics();
    
    // Generate comprehensive test summary
    const testSummary = {
      metadata: {
        generatedAt: new Date().toISOString(),
        teardownTime: performance.now(),
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        setupInfo
      },
      metrics,
      eventBusStats,
      storageStats,
      performance: {
        setupDuration: setupInfo.setupTime || 0,
        totalTestDuration: performance.now() - (setupInfo.setupTime || 0)
      },
      resources: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
    
    // Save test summary
    const summaryPath = path.join(process.cwd(), 'test-results', 'e2e-test-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(testSummary, null, 2));
    console.log(`   ✅ Test summary saved: ${summaryPath}`);
    
    // Generate metrics report
    await generateMetricsReport(metrics);
    
    // Generate performance report
    await generatePerformanceReport(testSummary);
    
  } catch (error) {
    console.error('   ❌ Failed to generate final reports:', error.message);
  }
}

async function generateMetricsReport(metrics) {
  try {
    const metricsReport = {
      generatedAt: new Date().toISOString(),
      counters: metrics.counters || {},
      gauges: metrics.gauges || {},
      histograms: {},
      summary: {
        totalCounters: Object.keys(metrics.counters || {}).length,
        totalGauges: Object.keys(metrics.gauges || {}).length,
        totalHistograms: Object.keys(metrics.histograms || {}).length
      }
    };
    
    // Process histograms to calculate statistics
    Object.entries(metrics.histograms || {}).forEach(([key, values]) => {
      if (values.length > 0) {
        const sorted = values.sort((a, b) => a - b);
        metricsReport.histograms[key] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    });
    
    const metricsPath = path.join(process.cwd(), 'test-results', 'e2e-metrics-report.json');
    await fs.writeFile(metricsPath, JSON.stringify(metricsReport, null, 2));
    console.log(`   ✅ Metrics report saved: ${metricsPath}`);
    
  } catch (error) {
    console.error('   ❌ Failed to generate metrics report:', error.message);
  }
}

async function generatePerformanceReport(testSummary) {
  try {
    const performanceReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        setupDuration: testSummary.performance.setupDuration,
        totalDuration: testSummary.performance.totalTestDuration,
        memoryPeak: testSummary.resources.memoryUsage.heapUsed,
        memoryTotal: testSummary.resources.memoryUsage.heapTotal
      },
      recommendations: generatePerformanceRecommendations(testSummary),
      sloCompliance: evaluateSLOCompliance(testSummary)
    };
    
    const performancePath = path.join(process.cwd(), 'test-results', 'e2e-performance-report.json');
    await fs.writeFile(performancePath, JSON.stringify(performanceReport, null, 2));
    console.log(`   ✅ Performance report saved: ${performancePath}`);
    
  } catch (error) {
    console.error('   ❌ Failed to generate performance report:', error.message);
  }
}

function generatePerformanceRecommendations(testSummary) {
  const recommendations = [];
  
  // Memory usage recommendations
  const memoryUsageMB = testSummary.resources.memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsageMB > 512) {
    recommendations.push({
      type: 'memory',
      severity: 'high',
      message: `High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`,
      suggestion: 'Consider optimizing memory usage or increasing available memory'
    });
  }
  
  // Duration recommendations
  const totalDurationMinutes = testSummary.performance.totalTestDuration / 1000 / 60;
  if (totalDurationMinutes > 30) {
    recommendations.push({
      type: 'performance',
      severity: 'medium',
      message: `Long test execution time: ${totalDurationMinutes.toFixed(2)} minutes`,
      suggestion: 'Consider parallelizing tests or optimizing slow test cases'
    });
  }
  
  // Event bus recommendations
  const eventCount = testSummary.eventBusStats?.totalEvents || 0;
  if (eventCount > 10000) {
    recommendations.push({
      type: 'events',
      severity: 'low',
      message: `High event volume: ${eventCount} events`,
      suggestion: 'Monitor event bus performance under high load'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      severity: 'info',
      message: 'All performance metrics are within acceptable ranges',
      suggestion: 'Continue monitoring performance trends'
    });
  }
  
  return recommendations;
}

function evaluateSLOCompliance(testSummary) {
  const slos = {
    maxTestDuration: {
      threshold: 30 * 60 * 1000, // 30 minutes
      actual: testSummary.performance.totalTestDuration,
      compliant: testSummary.performance.totalTestDuration < 30 * 60 * 1000
    },
    maxMemoryUsage: {
      threshold: 1024 * 1024 * 1024, // 1GB
      actual: testSummary.resources.memoryUsage.heapUsed,
      compliant: testSummary.resources.memoryUsage.heapUsed < 1024 * 1024 * 1024
    },
    maxSetupTime: {
      threshold: 60 * 1000, // 60 seconds
      actual: testSummary.performance.setupDuration,
      compliant: testSummary.performance.setupDuration < 60 * 1000
    }
  };
  
  const overallCompliance = Object.values(slos).every(slo => slo.compliant);
  
  return {
    overall: overallCompliance,
    slos,
    violations: Object.entries(slos)
      .filter(([_, slo]) => !slo.compliant)
      .map(([name, slo]) => ({
        name,
        threshold: slo.threshold,
        actual: slo.actual,
        violation: slo.actual - slo.threshold
      }))
  };
}

function getEventBusStatistics() {
  if (!global.__E2E_EVENT_BUS__) {
    return { totalEvents: 0, totalSubscribers: 0, topicStats: {} };
  }
  
  const events = global.__E2E_EVENT_BUS__.events || [];
  const subscribers = global.__E2E_EVENT_BUS__.subscribers || new Map();
  
  // Calculate topic statistics
  const topicStats = {};
  events.forEach(event => {
    if (!topicStats[event.topic]) {
      topicStats[event.topic] = 0;
    }
    topicStats[event.topic]++;
  });
  
  return {
    totalEvents: events.length,
    totalSubscribers: Array.from(subscribers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
    uniqueTopics: Object.keys(topicStats).length,
    topicStats
  };
}

function getStorageStatistics() {
  if (!global.__E2E_TEST_STORAGE__) {
    return { totalFiles: 0, totalMetadata: 0, totalIndices: 0, totalTransactions: 0 };
  }
  
  return {
    totalFiles: global.__E2E_TEST_STORAGE__.files?.size || 0,
    totalMetadata: global.__E2E_TEST_STORAGE__.metadata?.size || 0,
    totalIndices: global.__E2E_TEST_STORAGE__.indices?.size || 0,
    totalTransactions: global.__E2E_TEST_STORAGE__.transactions?.size || 0,
    totalAuditLogs: global.__E2E_TEST_STORAGE__.auditLogs?.length || 0,
    totalEvents: global.__E2E_TEST_STORAGE__.events?.length || 0
  };
}

async function cleanupTestInfrastructure() {
  console.log('🧹 Cleaning up test infrastructure...');
  
  try {
    // Run global cleanup if available
    if (typeof global.__E2E_GLOBAL_CLEANUP__ === 'function') {
      await global.__E2E_GLOBAL_CLEANUP__();
    }
    
    // Clear global test variables
    delete global.__E2E_SETUP_INFO__;
    delete global.__E2E_MOCK_SERVICES__;
    delete global.__E2E_TEST_STORAGE__;
    delete global.__E2E_EVENT_BUS__;
    delete global.__E2E_METRICS__;
    delete global.__E2E_TEST_USERS__;
    delete global.__E2E_TEST_CONTENT__;
    delete global.__E2E_GLOBAL_CLEANUP__;
    
    console.log('   ✅ Test infrastructure cleaned up');
    
  } catch (error) {
    console.error('   ❌ Failed to cleanup test infrastructure:', error.message);
  }
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const archiveDir = path.join(testResultsDir, 'archives');
    
    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Create archive metadata
    const archiveMetadata = {
      createdAt: new Date().toISOString(),
      testRun: `e2e-${Date.now()}`,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    };
    
    const metadataPath = path.join(archiveDir, `archive-metadata-${Date.now()}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(archiveMetadata, null, 2));
    
    console.log(`   ✅ Test artifacts archived: ${archiveDir}`);
    
  } catch (error) {
    console.error('   ❌ Failed to archive test artifacts:', error.message);
  }
}

async function performFinalCleanup() {
  console.log('🔧 Performing final cleanup...');
  
  try {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('   ✅ Garbage collection performed');
    }
    
    // Clear any remaining timers or intervals
    // Note: In a real implementation, you might want to track and clear specific timers
    
    // Log final memory usage
    const finalMemory = process.memoryUsage();
    console.log('   📊 Final memory usage:', {
      rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(finalMemory.external / 1024 / 1024).toFixed(2)} MB`
    });
    
    console.log('   ✅ Final cleanup completed');
    
  } catch (error) {
    console.error('   ❌ Failed to perform final cleanup:', error.message);
  }
}