/**
 * Health Exporter for generating health sample artifacts
 * Exports basic metrics for 8+ Q∞ modules as required by the validation gate
 */

import { ValidationService } from './ValidationService.mjs';
import { ValidationUtils } from './ValidationUtils.mjs';
import fs from 'fs/promises';
import path from 'path';

export class HealthExporter extends ValidationService {
  constructor(options = {}) {
    super({ ...options, moduleId: 'health-exporter' });
    this.artifactsPath = options.artifactsPath || 'artifacts/bootstrap';
  }

  /**
   * Initialize health exporter and create artifacts directory
   */
  async initialize() {
    await super.initialize();
    
    // Ensure artifacts directory exists
    await this.ensureArtifactsDirectory();
    
    this.logInfo('HealthExporter initialized');
    return { success: true };
  }

  /**
   * Ensure artifacts directory exists
   */
  async ensureArtifactsDirectory() {
    try {
      await fs.mkdir(this.artifactsPath, { recursive: true });
      this.logInfo(`Artifacts directory created: ${this.artifactsPath}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Export health metrics for all Q∞ modules
   * Gate requirement: Health endpoints export basic metrics for 8+ modules
   */
  async exportHealthMetrics(environment = 'local') {
    return await this.executeValidation('export-health-metrics', async () => {
      this.logInfo(`Exporting health metrics for environment: ${environment}`);
      
      const moduleResults = {};
      const moduleIds = Object.keys(ValidationUtils.Q_MODULES);
      
      // Validate we have 8+ modules as required by the gate
      if (moduleIds.length < 8) {
        throw new Error(`Gate requirement not met: Need 8+ modules, found ${moduleIds.length}`);
      }

      // Check health for each module
      for (const moduleId of moduleIds) {
        try {
          this.logInfo(`Checking health for module: ${moduleId}`);
          const healthResult = await ValidationUtils.validateModuleHealth(moduleId, environment);
          moduleResults[moduleId] = healthResult;
          
          // Publish module status event
          await this.eventBus.publish('q.validation.module.status.v1', {
            moduleId,
            status: healthResult.status,
            environment,
            timestamp: healthResult.timestamp
          });
          
        } catch (error) {
          this.logError(`Failed to check health for module ${moduleId}`, error);
          moduleResults[moduleId] = {
            moduleId,
            status: ValidationUtils.STATUS.CRITICAL,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Generate health sample
      const healthSample = ValidationUtils.generateHealthSample(moduleResults);
      
      // Add environment matrix information
      healthSample.environmentMatrix = {
        current: environment,
        supported: Object.keys(ValidationUtils.ENVIRONMENTS),
        gateRequirement: 'local / staging / QNET Phase 2'
      };

      // Add gate validation results
      healthSample.gateValidation = {
        moduleCountGate: {
          required: 8,
          actual: moduleIds.length,
          passed: moduleIds.length >= 8
        },
        healthExportGate: {
          description: 'Health endpoints export basic metrics for 8+ modules',
          passed: moduleIds.length >= 8 && healthSample.healthyModules > 0
        }
      };

      // Save health sample artifact
      const artifactPath = await this.saveHealthSample(healthSample, environment);
      
      // Create validation report
      const report = ValidationUtils.createValidationReport(moduleResults);
      report.artifacts = {
        healthSample: artifactPath
      };
      report.gateValidation = healthSample.gateValidation;

      // Publish integrity report event
      await this.eventBus.publish('q.validation.integrity.report.v1', report);

      this.logInfo('Health metrics export completed', {
        totalModules: moduleIds.length,
        healthyModules: healthSample.healthyModules,
        overallStatus: healthSample.overallStatus,
        artifactPath
      });

      return {
        healthSample,
        report,
        moduleResults,
        artifactPath,
        gateValidation: healthSample.gateValidation
      };
    });
  }

  /**
   * Save health sample to artifacts directory
   */
  async saveHealthSample(healthSample, environment) {
    const filename = `health-sample-${environment}-${Date.now()}.json`;
    const filePath = path.join(this.artifactsPath, filename);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(healthSample, null, 2));
      
      // Also create a latest symlink-style file
      const latestPath = path.join(this.artifactsPath, 'health-sample.json');
      await fs.writeFile(latestPath, JSON.stringify(healthSample, null, 2));
      
      this.logInfo(`Health sample saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logError('Failed to save health sample', error);
      throw error;
    }
  }

  /**
   * Export health metrics for all environments in the matrix
   */
  async exportHealthMetricsMatrix() {
    return await this.executeValidation('export-health-metrics-matrix', async () => {
      const environments = ['local', 'staging', 'qnet-phase2'];
      const results = {};
      
      for (const environment of environments) {
        try {
          this.logInfo(`Exporting health metrics for environment: ${environment}`);
          const result = await this.exportHealthMetrics(environment);
          results[environment] = result;
        } catch (error) {
          this.logError(`Failed to export health metrics for ${environment}`, error);
          results[environment] = {
            success: false,
            error: error.message,
            environment
          };
        }
      }

      // Create matrix summary
      const matrixSummary = {
        timestamp: new Date().toISOString(),
        environments: Object.keys(results),
        results,
        overallSuccess: Object.values(results).every(r => r.success !== false),
        gateValidation: {
          environmentMatrixGate: {
            required: ['local', 'staging', 'QNET Phase 2'],
            tested: environments,
            passed: Object.values(results).filter(r => r.success !== false).length >= 2
          }
        }
      };

      // Save matrix summary
      const matrixPath = path.join(this.artifactsPath, 'health-matrix-summary.json');
      await fs.writeFile(matrixPath, JSON.stringify(matrixSummary, null, 2));

      return matrixSummary;
    });
  }

  /**
   * Generate comprehensive health report with all required artifacts
   */
  async generateComprehensiveHealthReport() {
    return await this.executeValidation('generate-comprehensive-health-report', async () => {
      this.logInfo('Generating comprehensive health report');
      
      // Export health metrics for current environment
      const healthExport = await this.exportHealthMetrics(this.environment);
      
      // Generate additional metrics for observability integration
      const observabilityMetrics = await this.generateObservabilityMetrics();
      
      // Create comprehensive report
      const comprehensiveReport = {
        reportId: `comprehensive-health-${Date.now()}`,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        healthExport: healthExport.result,
        observabilityMetrics,
        gateValidation: {
          allGatesPassed: this.validateAllGates(healthExport.result),
          details: healthExport.result.gateValidation
        },
        artifacts: {
          healthSample: healthExport.result.artifactPath,
          observabilityMetrics: await this.saveObservabilityMetrics(observabilityMetrics)
        }
      };

      // Save comprehensive report
      const reportPath = path.join(this.artifactsPath, 'comprehensive-health-report.json');
      await fs.writeFile(reportPath, JSON.stringify(comprehensiveReport, null, 2));
      
      this.logInfo('Comprehensive health report generated', {
        reportPath,
        gatesPassed: comprehensiveReport.gateValidation.allGatesPassed
      });

      return comprehensiveReport;
    });
  }

  /**
   * Generate observability metrics for integration
   */
  async generateObservabilityMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      validationService: {
        uptime: Date.now() - this.startTime,
        totalValidations: this.validationResults.size,
        successRate: this.calculateSuccessRate(),
        averageResponseTime: this.calculateAverageResponseTime()
      },
      eventBus: {
        connected: typeof this.eventBus.getStats === 'function',
        stats: this.eventBus.getStats ? this.eventBus.getStats() : {}
      },
      observability: {
        healthStatus: this.observability.getHealthStatus ? this.observability.getHealthStatus() : {},
        metrics: this.observability.getMetrics ? this.observability.getMetrics() : {}
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    return metrics;
  }

  /**
   * Save observability metrics to artifacts
   */
  async saveObservabilityMetrics(metrics) {
    const filename = `observability-metrics-${Date.now()}.json`;
    const filePath = path.join(this.artifactsPath, filename);
    
    await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));
    return filePath;
  }

  /**
   * Validate all gates are passing
   */
  validateAllGates(healthExport) {
    const gateValidation = healthExport.gateValidation;
    
    return gateValidation.moduleCountGate.passed && 
           gateValidation.healthExportGate.passed;
  }

  /**
   * Get current health status for monitoring
   */
  async getCurrentHealthStatus() {
    try {
      const healthCheck = await this.performHealthCheck();
      return {
        status: healthCheck.status,
        uptime: healthCheck.uptime,
        validationCount: this.validationResults.size,
        lastValidation: this.getLastValidationTime()
      };
    } catch (error) {
      return {
        status: 'critical',
        error: error.message
      };
    }
  }

  /**
   * Get timestamp of last validation
   */
  getLastValidationTime() {
    if (this.validationResults.size === 0) return null;
    
    const results = Array.from(this.validationResults.values());
    return results[results.length - 1].timestamp;
  }
}

export default HealthExporter;