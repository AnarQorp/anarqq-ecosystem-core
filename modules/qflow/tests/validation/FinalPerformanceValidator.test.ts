/**
 * Final Performance Validator Tests
 * 
 * Comprehensive test suite for the final performance validation and optimization system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { FinalPerformanceValidator, FinalValidationConfig } from '../../src/validation/FinalPerformanceValidator';

describe('FinalPerformanceValidator', () => {
  let validator: FinalPerformanceValidator;
  let config: FinalValidationConfig;

  beforeEach(() => {
    config = createTestConfig();
    validator = new FinalPerformanceValidator(config);
  });

  afterEach(() => {
    validator.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      expect(validator).toBeInstanceOf(FinalPerformanceValidator);
      expect(validator).toBeInstanceOf(EventEmitter);
    });

    it('should emit validation_started event when validation begins', async () => {
      const startedSpy = vi.fn();
      validator.on('validation_started', startedSpy);

      // Mock the test suites to avoid actual execution
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      await validator.runFinalValidation();

      expect(startedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
          config: expect.any(Object)
        })
      );
    });
  });

  describe('Performance Validation', () => {
    it('should run performance validation when enabled', async () => {
      const performanceValidationSpy = vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      config.performance.enableValidation = true;
      
      await validator.runFinalValidation();

      expect(performanceValidationSpy).toHaveBeenCalled();
    });

    it('should skip performance validation when disabled', async () => {
      const performanceValidationSpy = vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      config.performance.enableValidation = false;
      
      await validator.runFinalValidation();

      expect(performanceValidationSpy).not.toHaveBeenCalled();
    });

    it('should validate SLA compliance correctly', async () => {
      const mockTestResults = [
        {
          testName: 'Load Test',
          loadProfile: 'baseline',
          startTime: Date.now() - 10000,
          endTime: Date.now(),
          duration: 10000,
          metrics: {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            averageResponseTime: 1500, // Within threshold
            p50ResponseTime: 1200,
            p95ResponseTime: 2800, // Within threshold
            p99ResponseTime: 4500, // Within threshold
            minResponseTime: 500,
            maxResponseTime: 5000,
            throughput: 100, // Above minimum
            errorRate: 5, // At threshold
            concurrency: 50
          },
          thresholdViolations: [],
          resourceUsage: createMockResourceUsage(),
          scalabilityMetrics: createMockScalabilityMetrics(),
          status: 'passed' as const
        }
      ];

      const slaResult = await (validator as any).validateSLACompliance(mockTestResults);

      expect(slaResult.compliant).toBe(true);
      expect(slaResult.violations).toHaveLength(0);
      expect(slaResult.score).toBe(100);
    });

    it('should detect SLA violations', async () => {
      const mockTestResults = [
        {
          testName: 'Load Test',
          loadProfile: 'baseline',
          startTime: Date.now() - 10000,
          endTime: Date.now(),
          duration: 10000,
          metrics: {
            totalRequests: 1000,
            successfulRequests: 900,
            failedRequests: 100,
            averageResponseTime: 3000, // Exceeds threshold
            p50ResponseTime: 2500,
            p95ResponseTime: 6000, // Exceeds threshold
            p99ResponseTime: 12000, // Exceeds threshold
            minResponseTime: 1000,
            maxResponseTime: 15000,
            throughput: 25, // Below minimum
            errorRate: 10, // Exceeds threshold
            concurrency: 50
          },
          thresholdViolations: [],
          resourceUsage: createMockResourceUsage(),
          scalabilityMetrics: createMockScalabilityMetrics(),
          status: 'failed' as const
        }
      ];

      const slaResult = await (validator as any).validateSLACompliance(mockTestResults);

      expect(slaResult.compliant).toBe(false);
      expect(slaResult.violations.length).toBeGreaterThan(0);
      expect(slaResult.score).toBeLessThan(100);

      // Check for specific violations
      const responseTimeViolation = slaResult.violations.find((v: any) => v.metric === 'response_time');
      expect(responseTimeViolation).toBeDefined();
      expect(responseTimeViolation.severity).toBe('critical');

      const throughputViolation = slaResult.violations.find((v: any) => v.metric === 'throughput');
      expect(throughputViolation).toBeDefined();
      expect(throughputViolation.severity).toBe('critical');
    });
  });

  describe('Security Hardening', () => {
    it('should run security hardening when enabled', async () => {
      const securityHardeningSpy = vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      config.security.enableHardening = true;
      
      await validator.runFinalValidation();

      expect(securityHardeningSpy).toHaveBeenCalled();
    });

    it('should implement hardening measures', async () => {
      const mockHardeningMeasure = {
        name: 'Test Hardening',
        description: 'Test hardening measure',
        category: 'authentication' as const,
        priority: 'high' as const,
        implementation: vi.fn().mockResolvedValue(true),
        validation: vi.fn().mockResolvedValue(true)
      };

      config.security.hardeningMeasures = [mockHardeningMeasure];

      const result = await (validator as any).implementHardeningMeasure(mockHardeningMeasure);

      expect(result.measure).toBe('Test Hardening');
      expect(result.implemented).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.effectiveness).toBe(100);
      expect(mockHardeningMeasure.implementation).toHaveBeenCalled();
      expect(mockHardeningMeasure.validation).toHaveBeenCalled();
    });

    it('should handle hardening measure failures', async () => {
      const mockHardeningMeasure = {
        name: 'Failing Hardening',
        description: 'Hardening measure that fails',
        category: 'encryption' as const,
        priority: 'critical' as const,
        implementation: vi.fn().mockRejectedValue(new Error('Implementation failed')),
        validation: vi.fn().mockResolvedValue(false)
      };

      const result = await (validator as any).implementHardeningMeasure(mockHardeningMeasure);

      expect(result.measure).toBe('Failing Hardening');
      expect(result.implemented).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.effectiveness).toBe(0);
      expect(result.issues).toContain('Error: Implementation failed');
    });
  });

  describe('Optimization', () => {
    it('should run optimization when enabled', async () => {
      const optimizationSpy = vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);

      config.optimization.enableOptimization = true;
      
      await validator.runFinalValidation();

      expect(optimizationSpy).toHaveBeenCalled();
    });

    it('should apply optimization actions', async () => {
      const mockOptimizationAction = {
        name: 'Test Optimization',
        description: 'Test optimization action',
        expectedImprovement: 0.2,
        implementationCost: 'medium' as const,
        riskLevel: 'low' as const,
        implementation: vi.fn().mockResolvedValue({
          success: true,
          actualImprovement: 0.25,
          sideEffects: [],
          rollbackRequired: false
        })
      };

      const mockOptimizationTarget = {
        metric: 'response_time' as const,
        currentValue: 2000,
        targetValue: 1500,
        priority: 'high' as const,
        optimizations: [mockOptimizationAction]
      };

      config.optimization.optimizationTargets = [mockOptimizationTarget];

      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);

      const result = await validator.runFinalValidation();

      expect(mockOptimizationAction.implementation).toHaveBeenCalled();
      expect(result.performance.optimizationResults).toHaveLength(1);
      expect(result.performance.optimizationResults[0].success).toBe(true);
      expect(result.performance.optimizationResults[0].actualImprovement).toBe(0.25);
    });
  });

  describe('Performance Gates', () => {
    it('should validate performance gates', async () => {
      const mockGate = {
        name: 'Response Time Gate',
        metric: 'response_time',
        threshold: 2000,
        operator: 'lt' as const,
        severity: 'error' as const,
        blockDeployment: true
      };

      config.optimization.performanceGates = [mockGate];

      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      const result = await validator.runFinalValidation();

      expect(result.gates.performanceGates).toHaveLength(1);
      expect(result.gates.performanceGates[0].gateName).toBe('Response Time Gate');
    });

    it('should pass gates when thresholds are met', async () => {
      const mockResult = {
        performance: {
          slaCompliance: {
            compliant: true,
            score: 100,
            violations: [],
            metrics: {
              avgResponseTime: 1500 // Below threshold
            }
          },
          loadTestResults: [],
          stressTestResults: [],
          benchmarkResults: [],
          optimizationResults: []
        },
        security: {
          hardeningResults: [],
          securityTestResults: [],
          complianceResults: [],
          vulnerabilities: []
        },
        gates: {
          performanceGates: [],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [],
        deploymentReadiness: {
          ready: false,
          confidence: 0,
          blockers: [],
          warnings: [],
          requirements: []
        }
      };

      const mockGate = {
        name: 'Response Time Gate',
        metric: 'response_time',
        threshold: 2000,
        operator: 'lt' as const,
        severity: 'error' as const,
        blockDeployment: true
      };

      const gateResult = await (validator as any).validatePerformanceGate(mockGate, mockResult);

      expect(gateResult.passed).toBe(true);
      expect(gateResult.actual).toBe(1500);
      expect(gateResult.threshold).toBe(2000);
    });

    it('should fail gates when thresholds are not met', async () => {
      const mockResult = {
        performance: {
          slaCompliance: {
            compliant: false,
            score: 80,
            violations: [],
            metrics: {
              avgResponseTime: 2500 // Above threshold
            }
          },
          loadTestResults: [],
          stressTestResults: [],
          benchmarkResults: [],
          optimizationResults: []
        },
        security: {
          hardeningResults: [],
          securityTestResults: [],
          complianceResults: [],
          vulnerabilities: []
        },
        gates: {
          performanceGates: [],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [],
        deploymentReadiness: {
          ready: false,
          confidence: 0,
          blockers: [],
          warnings: [],
          requirements: []
        }
      };

      const mockGate = {
        name: 'Response Time Gate',
        metric: 'response_time',
        threshold: 2000,
        operator: 'lt' as const,
        severity: 'error' as const,
        blockDeployment: true
      };

      const gateResult = await (validator as any).validatePerformanceGate(mockGate, mockResult);

      expect(gateResult.passed).toBe(false);
      expect(gateResult.actual).toBe(2500);
      expect(gateResult.threshold).toBe(2000);
    });
  });

  describe('Deployment Readiness', () => {
    it('should assess deployment readiness correctly', async () => {
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      const result = await validator.runFinalValidation();

      expect(result.deploymentReadiness).toBeDefined();
      expect(result.deploymentReadiness.ready).toBeDefined();
      expect(result.deploymentReadiness.confidence).toBeGreaterThanOrEqual(0);
      expect(result.deploymentReadiness.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.deploymentReadiness.blockers)).toBe(true);
      expect(Array.isArray(result.deploymentReadiness.warnings)).toBe(true);
      expect(Array.isArray(result.deploymentReadiness.requirements)).toBe(true);
    });

    it('should block deployment for critical issues', async () => {
      // Mock critical performance gate failure
      const mockResult = {
        performance: {
          slaCompliance: {
            compliant: false,
            score: 50,
            violations: [{
              metric: 'response_time',
              threshold: 2000,
              actual: 5000,
              severity: 'critical' as const,
              impact: 'Severe user experience degradation'
            }]
          },
          loadTestResults: [],
          stressTestResults: [],
          benchmarkResults: [],
          optimizationResults: []
        },
        security: {
          hardeningResults: [],
          securityTestResults: [],
          complianceResults: [],
          vulnerabilities: [{
            id: 'VULN-001',
            severity: 'critical' as const,
            category: 'authentication',
            description: 'Critical authentication vulnerability',
            impact: 'Potential unauthorized access',
            remediation: 'Update authentication system'
          }]
        },
        gates: {
          performanceGates: [{
            gateName: 'Critical Gate',
            passed: false,
            metric: 'response_time',
            threshold: 2000,
            actual: 5000,
            severity: 'critical',
            blockDeployment: true
          }],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [],
        deploymentReadiness: {
          ready: false,
          confidence: 0,
          blockers: [],
          warnings: [],
          requirements: []
        }
      };

      await (validator as any).assessDeploymentReadiness(mockResult);

      expect(mockResult.deploymentReadiness.ready).toBe(false);
      expect(mockResult.deploymentReadiness.blockers.length).toBeGreaterThan(0);
      expect(mockResult.deploymentReadiness.confidence).toBeLessThan(0.5);
    });

    it('should allow deployment when all checks pass', async () => {
      const mockResult = {
        performance: {
          slaCompliance: {
            compliant: true,
            score: 100,
            violations: []
          },
          loadTestResults: [],
          stressTestResults: [],
          benchmarkResults: [],
          optimizationResults: []
        },
        security: {
          hardeningResults: [],
          securityTestResults: [],
          complianceResults: [{
            compliant: true,
            score: 100,
            findings: [],
            recommendations: []
          }],
          vulnerabilities: []
        },
        gates: {
          performanceGates: [{
            gateName: 'Response Time Gate',
            passed: true,
            metric: 'response_time',
            threshold: 2000,
            actual: 1500,
            severity: 'error',
            blockDeployment: true
          }],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [],
        deploymentReadiness: {
          ready: false,
          confidence: 0,
          blockers: [],
          warnings: [],
          requirements: []
        }
      };

      await (validator as any).assessDeploymentReadiness(mockResult);

      expect(mockResult.deploymentReadiness.ready).toBe(true);
      expect(mockResult.deploymentReadiness.blockers).toHaveLength(0);
      expect(mockResult.deploymentReadiness.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Overall Status Determination', () => {
    it('should return failed status for deployment blockers', () => {
      const mockResult = {
        deploymentReadiness: {
          ready: false,
          confidence: 0.3,
          blockers: ['Critical performance issue'],
          warnings: [],
          requirements: []
        },
        gates: {
          performanceGates: [],
          securityGates: [],
          complianceGates: []
        },
        recommendations: []
      };

      const status = (validator as any).determineOverallStatus(mockResult);
      expect(status).toBe('failed');
    });

    it('should return warning status for warnings', () => {
      const mockResult = {
        deploymentReadiness: {
          ready: true,
          confidence: 0.8,
          blockers: [],
          warnings: ['Minor performance degradation'],
          requirements: []
        },
        gates: {
          performanceGates: [],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [{
          category: 'performance',
          priority: 'high',
          title: 'Optimize response time',
          description: 'Response time could be improved',
          impact: 'Minor performance impact',
          effort: 'medium',
          timeline: '1 week'
        }]
      };

      const status = (validator as any).determineOverallStatus(mockResult);
      expect(status).toBe('warning');
    });

    it('should return passed status when all checks pass', () => {
      const mockResult = {
        deploymentReadiness: {
          ready: true,
          confidence: 0.95,
          blockers: [],
          warnings: [],
          requirements: []
        },
        gates: {
          performanceGates: [{
            gateName: 'Test Gate',
            passed: true,
            metric: 'response_time',
            threshold: 2000,
            actual: 1500,
            severity: 'error',
            blockDeployment: false
          }],
          securityGates: [],
          complianceGates: []
        },
        recommendations: [{
          category: 'optimization',
          priority: 'low',
          title: 'Minor optimization',
          description: 'Small optimization opportunity',
          impact: 'Minimal impact',
          effort: 'low',
          timeline: '1 day'
        }]
      };

      const status = (validator as any).determineOverallStatus(mockResult);
      expect(status).toBe('passed');
    });
  });

  describe('Event Emission', () => {
    it('should emit validation events', async () => {
      const events: string[] = [];
      
      validator.on('validation_started', () => events.push('started'));
      validator.on('validation_completed', () => events.push('completed'));
      validator.on('phase_started', () => events.push('phase_started'));
      validator.on('phase_completed', () => events.push('phase_completed'));

      // Mock all phases to avoid actual execution
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      await validator.runFinalValidation();

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });

    it('should emit failure events on error', async () => {
      const failureEvents: any[] = [];
      
      validator.on('validation_failed', (data) => failureEvents.push(data));

      // Mock a failure in performance validation
      vi.spyOn(validator as any, 'runPerformanceValidation').mockRejectedValue(new Error('Performance validation failed'));

      try {
        await validator.runFinalValidation();
      } catch (error) {
        // Expected to throw
      }

      expect(failureEvents).toHaveLength(1);
      expect(failureEvents[0].error).toContain('Performance validation failed');
    });
  });

  describe('Validation History', () => {
    it('should maintain validation history', async () => {
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      expect(validator.getValidationHistory()).toHaveLength(0);

      await validator.runFinalValidation();
      expect(validator.getValidationHistory()).toHaveLength(1);

      await validator.runFinalValidation();
      expect(validator.getValidationHistory()).toHaveLength(2);
    });

    it('should return latest validation result', async () => {
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      expect(validator.getLatestValidation()).toBeNull();

      const result1 = await validator.runFinalValidation();
      expect(validator.getLatestValidation()?.validationId).toBe(result1.validationId);

      const result2 = await validator.runFinalValidation();
      expect(validator.getLatestValidation()?.validationId).toBe(result2.validationId);
    });

    it('should clear validation history', async () => {
      vi.spyOn(validator as any, 'runPerformanceValidation').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runSecurityHardening').mockResolvedValue(undefined);
      vi.spyOn(validator as any, 'runOptimization').mockResolvedValue(undefined);

      await validator.runFinalValidation();
      expect(validator.getValidationHistory()).toHaveLength(1);

      validator.clearHistory();
      expect(validator.getValidationHistory()).toHaveLength(0);
      expect(validator.getLatestValidation()).toBeNull();
    });
  });
});

/**
 * Helper functions for creating test data
 */
function createTestConfig(): FinalValidationConfig {
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
        name: 'test-profile',
        description: 'Test load profile',
        duration: 60000,
        concurrentUsers: 10,
        requestsPerSecond: 5,
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
        performanceMetrics: ['response_time', 'throughput']
      }
    },
    security: {
      enableHardening: true,
      securityTestConfig: {
        enablePenetrationTesting: false,
        enableVulnerabilityScanning: true,
        enableComplianceValidation: false,
        testCategories: [{
          name: 'authentication',
          enabled: true,
          severity: 'high',
          tests: ['identity_verification']
        }]
      },
      hardeningMeasures: [],
      complianceChecks: []
    },
    optimization: {
      enableOptimization: true,
      optimizationTargets: [],
      performanceGates: [{
        name: 'response_time_gate',
        metric: 'response_time',
        threshold: 2000,
        operator: 'lt',
        severity: 'error',
        blockDeployment: true
      }],
      regressionThresholds: [{
        metric: 'response_time',
        maxDegradationPercent: 15,
        minSampleSize: 5,
        confidenceLevel: 0.95
      }]
    },
    reporting: {
      generateReports: false,
      reportFormats: ['json'],
      outputDirectory: './test-reports',
      enableRealTimeMonitoring: false
    }
  };
}

function createMockResourceUsage(): any {
  const emptyMetric = {
    min: 0,
    max: 100,
    average: 50,
    p95: 80,
    samples: [40, 50, 60],
    timestamps: [Date.now() - 2000, Date.now() - 1000, Date.now()]
  };

  return {
    memory: emptyMetric,
    cpu: emptyMetric,
    disk: emptyMetric,
    network: { ...emptyMetric, bytesIn: 1000, bytesOut: 800, packetsIn: 100, packetsOut: 80, errors: 0 },
    connections: { active: 10, total: 50, failed: 2, timeouts: 1 }
  };
}

function createMockScalabilityMetrics(): any {
  return {
    scalingEvents: [],
    nodeUtilization: [{
      nodeId: 'node-1',
      cpu: 60,
      memory: 70,
      network: 40,
      requestCount: 100,
      responseTime: 1200
    }],
    loadDistribution: {
      evenness: 0.8,
      hotspots: [],
      underutilized: []
    },
    bottlenecks: [],
    efficiency: {
      resourceUtilization: 65,
      costEfficiency: 0.8,
      energyEfficiency: 0.7,
      scalingEfficiency: 0.9
    }
  };
}