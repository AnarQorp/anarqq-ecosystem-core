/**
 * Final Validation Integration Test
 * 
 * Integration test to validate the complete final validation system
 * works correctly with all components integrated.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FinalValidationRunner } from '../performance/FinalValidationRunner';
import { FinalValidationConfig } from '../../src/validation/FinalPerformanceValidator';

describe('Final Validation Integration', () => {
  let runner: FinalValidationRunner;

  beforeAll(() => {
    const config = {
      environment: 'test' as const,
      validationProfiles: [{
        name: 'integration-test',
        description: 'Integration test profile',
        environment: 'test',
        triggers: [{ type: 'manual' as const, enabled: true }],
        config: createIntegrationTestConfig()
      }],
      reportingConfig: {
        enableDashboard: false,
        dashboardPort: 3000,
        enableSlackNotifications: false,
        enableEmailNotifications: false,
        enableWebhooks: false,
        reportRetentionDays: 7,
        exportFormats: ['json']
      },
      integrationConfig: {
        cicdIntegration: { enabled: false, provider: 'github' as const },
        monitoringIntegration: { enabled: false, provider: 'prometheus' as const },
        alertingIntegration: { enabled: false, provider: 'slack' as const }
      },
      notificationConfig: {
        channels: [],
        templates: [],
        escalationRules: []
      }
    };

    runner = new FinalValidationRunner(config);
  });

  afterAll(() => {
    runner.destroy();
  });

  it('should run complete validation successfully', async () => {
    const run = await runner.runValidation('integration-test', 'integration-test');

    expect(run).toBeDefined();
    expect(run.status).toBe('completed');
    expect(run.result).toBeDefined();
    expect(run.result?.validationId).toBeDefined();
    expect(run.result?.status).toMatch(/passed|warning|failed/);
    expect(run.result?.deploymentReadiness).toBeDefined();
  }, 30000); // 30 second timeout for integration test

  it('should generate validation summary', async () => {
    const summary = runner.getValidationSummary();

    expect(summary).toBeDefined();
    expect(summary.totalRuns).toBeGreaterThanOrEqual(0);
    expect(summary.successfulRuns).toBeGreaterThanOrEqual(0);
    expect(summary.failedRuns).toBeGreaterThanOrEqual(0);
    expect(summary.deploymentReadinessRate).toBeGreaterThanOrEqual(0);
    expect(summary.deploymentReadinessRate).toBeLessThanOrEqual(1);
  });

  it('should generate validation report', async () => {
    const report = await runner.generateReport('json');

    expect(report).toBeDefined();
    expect(typeof report).toBe('string');
    
    const parsedReport = JSON.parse(report);
    expect(parsedReport.generatedAt).toBeDefined();
    expect(parsedReport.environment).toBe('test');
    expect(parsedReport.summary).toBeDefined();
  });

  it('should track validation history', async () => {
    const initialHistory = runner.getRunHistory();
    const initialCount = initialHistory.length;

    await runner.runValidation('integration-test', 'history-test');

    const updatedHistory = runner.getRunHistory();
    expect(updatedHistory.length).toBe(initialCount + 1);

    const latestRun = updatedHistory[0]; // Most recent first
    expect(latestRun.trigger).toBe('history-test');
    expect(latestRun.status).toBe('completed');
  });

  it('should handle validation events', async () => {
    const events: string[] = [];

    runner.on('validation_started', () => events.push('started'));
    runner.on('validation_completed', () => events.push('completed'));
    runner.on('validation_run_completed', () => events.push('run_completed'));

    await runner.runValidation('integration-test', 'event-test');

    expect(events).toContain('started');
    expect(events).toContain('completed');
    expect(events).toContain('run_completed');
  });
});

function createIntegrationTestConfig(): FinalValidationConfig {
  return {
    performance: {
      enableValidation: true,
      slaThresholds: {
        maxResponseTimeMs: 5000, // Relaxed for integration test
        maxP95ResponseTimeMs: 8000,
        maxP99ResponseTimeMs: 12000,
        minThroughputRps: 10, // Low threshold for test
        maxErrorRatePercent: 10, // Relaxed for test
        maxMemoryUsageMB: 2048,
        maxCpuUsagePercent: 90,
        maxNetworkLatencyMs: 200,
        availabilityPercent: 99.0
      },
      loadTestProfiles: [{
        name: 'integration-test-load',
        description: 'Minimal load test for integration testing',
        duration: 30000, // 30 seconds
        concurrentUsers: 5,
        requestsPerSecond: 2,
        dataVolumeGB: 0.1,
        flowComplexity: 'simple',
        geographicDistribution: ['local']
      }],
      stressTestConfig: {
        enableMemoryStress: false, // Disabled for integration test
        enableCpuStress: false,
        enableNetworkStress: false,
        enableConcurrencyStress: false,
        stressMultipliers: {
          memory: 1.0,
          cpu: 1.0,
          network: 1.0,
          concurrency: 1.0
        },
        chaosEngineering: {
          enabled: false,
          failureInjectionRate: 0,
          nodeFailureRate: 0,
          networkPartitionRate: 0
        }
      },
      benchmarkConfig: {
        enableBaseline: false, // Disabled for integration test
        enableRegression: false,
        regressionThreshold: 20,
        performanceMetrics: ['response_time']
      }
    },
    security: {
      enableHardening: false, // Simplified for integration test
      securityTestConfig: {
        enablePenetrationTesting: false,
        enableVulnerabilityScanning: false,
        enableComplianceValidation: false,
        testCategories: []
      },
      hardeningMeasures: [],
      complianceChecks: []
    },
    optimization: {
      enableOptimization: false, // Disabled for integration test
      optimizationTargets: [],
      performanceGates: [{
        name: 'integration_test_gate',
        metric: 'response_time',
        threshold: 5000,
        operator: 'lt',
        severity: 'warning',
        blockDeployment: false // Non-blocking for integration test
      }],
      regressionThresholds: []
    },
    reporting: {
      generateReports: true,
      reportFormats: ['json'],
      outputDirectory: './test-reports',
      enableRealTimeMonitoring: false
    }
  };
}