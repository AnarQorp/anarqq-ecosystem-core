/**
 * Enhanced Contract Test Runner
 * Advanced contract testing with comprehensive quality gates and analysis
 */

import { ContractTestRunner, ContractTestConfig, ContractTestResults } from './ContractTestRunner';
import { ContractValidator, ContractValidationError } from './ContractValidator';
import { TestReporter } from './TestReporter';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EnhancedContractTestConfig extends ContractTestConfig {
  configFile?: string;
  enablePerformanceMonitoring?: boolean;
  enableSecurityScanning?: boolean;
  enableDependencyAnalysis?: boolean;
  customValidators?: CustomValidator[];
}

export interface CustomValidator {
  name: string;
  description: string;
  validate: (contract: any, context: ValidationContext) => ContractValidationError[];
}

export interface ValidationContext {
  moduleName: string;
  moduleContracts: Map<string, any>;
  config: any;
}

export interface EnhancedTestResults extends ContractTestResults {
  performanceMetrics?: PerformanceMetrics;
  securityFindings?: SecurityFinding[];
  dependencyAnalysis?: DependencyAnalysis;
  qualityGateResults?: QualityGateResults;
}

export interface PerformanceMetrics {
  totalDuration: number;
  averageTestDuration: number;
  slowestTests: Array<{ name: string; duration: number }>;
  memoryUsage: {
    peak: number;
    average: number;
  };
  cpuUsage: {
    peak: number;
    average: number;
  };
}

export interface SecurityFinding {
  type: 'SECRET' | 'VULNERABILITY' | 'INSECURE_CONFIG' | 'WEAK_CRYPTO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  module: string;
  path: string;
  description: string;
  recommendation: string;
}

export interface DependencyAnalysis {
  totalDependencies: number;
  vulnerabilities: Array<{
    package: string;
    version: string;
    severity: string;
    description: string;
  }>;
  outdatedPackages: Array<{
    package: string;
    current: string;
    latest: string;
  }>;
  circularDependencies: string[][];
}

export interface QualityGateResults {
  passed: boolean;
  gates: Array<{
    name: string;
    passed: boolean;
    threshold: any;
    actual: any;
    message: string;
  }>;
}

export class EnhancedContractTestRunner extends ContractTestRunner {
  private enhancedConfig: EnhancedContractTestConfig;
  private testConfig: any;
  private performanceMonitor?: PerformanceMonitor;
  private securityScanner?: SecurityScanner;
  private dependencyAnalyzer?: DependencyAnalyzer;

  constructor(config: EnhancedContractTestConfig) {
    super(config);
    this.enhancedConfig = config;
    this.loadConfiguration();
    this.initializeEnhancements();
  }

  /**
   * Get the configuration (accessor for protected config)
   */
  protected getConfig(): ContractTestConfig {
    return this.enhancedConfig;
  }

  /**
   * Load configuration from file
   */
  private loadConfiguration(): void {
    const configPath = this.enhancedConfig.configFile || 
      join(process.cwd(), 'libs/anarq/testing/contract-test.config.js');
    
    if (existsSync(configPath)) {
      try {
        // Dynamic import for ES modules
        this.testConfig = require(configPath).default || require(configPath);
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using defaults`);
        this.testConfig = this.getDefaultConfig();
      }
    } else {
      this.testConfig = this.getDefaultConfig();
    }
  }

  /**
   * Initialize enhanced features
   */
  private initializeEnhancements(): void {
    if (this.enhancedConfig.enablePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor();
    }

    if (this.enhancedConfig.enableSecurityScanning) {
      this.securityScanner = new SecurityScanner();
    }

    if (this.enhancedConfig.enableDependencyAnalysis) {
      this.dependencyAnalyzer = new DependencyAnalyzer();
    }
  }

  /**
   * Run enhanced contract tests
   */
  async runEnhancedTests(): Promise<EnhancedTestResults> {
    const startTime = Date.now();
    
    // Start performance monitoring
    this.performanceMonitor?.start();

    try {
      // Run base contract tests
      const baseResults = await this.runAllTests();

      // Run enhanced analysis
      const performanceMetrics = this.performanceMonitor?.getMetrics();
      const securityFindings = await this.securityScanner?.scan(this.getConfig().modulesPath);
      const dependencyAnalysis = await this.dependencyAnalyzer?.analyze(this.getConfig().modulesPath);

      // Apply quality gates
      const qualityGateResults = this.applyQualityGates(baseResults, {
        performanceMetrics,
        securityFindings,
        dependencyAnalysis
      });

      const enhancedResults: EnhancedTestResults = {
        ...baseResults,
        performanceMetrics,
        securityFindings,
        dependencyAnalysis,
        qualityGateResults
      };

      // Generate enhanced reports
      await this.generateEnhancedReports(enhancedResults);

      return enhancedResults;

    } finally {
      this.performanceMonitor?.stop();
    }
  }

  /**
   * Apply quality gates with enhanced criteria
   */
  private applyQualityGates(
    results: ContractTestResults,
    enhancements: {
      performanceMetrics?: PerformanceMetrics;
      securityFindings?: SecurityFinding[];
      dependencyAnalysis?: DependencyAnalysis;
    }
  ): QualityGateResults {
    const gates: Array<{
      name: string;
      passed: boolean;
      threshold: any;
      actual: any;
      message: string;
    }> = [];

    // Coverage gate
    const coverageThreshold = this.testConfig.qualityGates?.coverage?.threshold || 80;
    gates.push({
      name: 'Coverage',
      passed: results.summary.coverage >= coverageThreshold,
      threshold: coverageThreshold,
      actual: results.summary.coverage,
      message: `Coverage: ${results.summary.coverage.toFixed(1)}% (threshold: ${coverageThreshold}%)`
    });

    // Test failure gate
    gates.push({
      name: 'Test Failures',
      passed: results.summary.failed === 0,
      threshold: 0,
      actual: results.summary.failed,
      message: `Failed tests: ${results.summary.failed} (threshold: 0)`
    });

    // Warning gate
    const maxWarnings = this.testConfig.qualityGates?.warnings?.maxCount || 10;
    gates.push({
      name: 'Warnings',
      passed: results.summary.warnings <= maxWarnings,
      threshold: maxWarnings,
      actual: results.summary.warnings,
      message: `Warnings: ${results.summary.warnings} (threshold: ${maxWarnings})`
    });

    // Performance gate
    if (enhancements.performanceMetrics) {
      const maxDuration = this.testConfig.qualityGates?.performance?.maxDuration || 300000;
      gates.push({
        name: 'Performance',
        passed: enhancements.performanceMetrics.totalDuration <= maxDuration,
        threshold: maxDuration,
        actual: enhancements.performanceMetrics.totalDuration,
        message: `Duration: ${(enhancements.performanceMetrics.totalDuration / 1000).toFixed(2)}s (threshold: ${maxDuration / 1000}s)`
      });
    }

    // Security gate
    if (enhancements.securityFindings) {
      const criticalFindings = enhancements.securityFindings.filter(f => f.severity === 'CRITICAL').length;
      gates.push({
        name: 'Security',
        passed: criticalFindings === 0,
        threshold: 0,
        actual: criticalFindings,
        message: `Critical security findings: ${criticalFindings} (threshold: 0)`
      });
    }

    // Dependency gate
    if (enhancements.dependencyAnalysis) {
      const highVulns = enhancements.dependencyAnalysis.vulnerabilities
        .filter(v => v.severity === 'high' || v.severity === 'critical').length;
      gates.push({
        name: 'Dependencies',
        passed: highVulns === 0,
        threshold: 0,
        actual: highVulns,
        message: `High/Critical vulnerabilities: ${highVulns} (threshold: 0)`
      });
    }

    // Cross-module compatibility gate
    const crossModuleErrors = Array.from(results.crossModuleResults.values())
      .reduce((sum, errors) => sum + errors.filter(e => e.severity === 'ERROR').length, 0);
    
    gates.push({
      name: 'Cross-Module Compatibility',
      passed: crossModuleErrors === 0,
      threshold: 0,
      actual: crossModuleErrors,
      message: `Cross-module errors: ${crossModuleErrors} (threshold: 0)`
    });

    return {
      passed: gates.every(gate => gate.passed),
      gates
    };
  }

  /**
   * Generate enhanced reports
   */
  private async generateEnhancedReports(results: EnhancedTestResults): Promise<void> {
    const reporter = new TestReporter(this.getConfig().outputPath, {
      formats: this.testConfig.reporting?.formats || ['json', 'html'],
      includeDetails: true,
      includeCoverage: true,
      includeRecommendations: true
    });

    // Generate base reports
    await reporter.generateReports(results);

    // Generate enhanced reports
    if (results.performanceMetrics) {
      await this.generatePerformanceReport(results.performanceMetrics);
    }

    if (results.securityFindings) {
      await this.generateSecurityReport(results.securityFindings);
    }

    if (results.dependencyAnalysis) {
      await this.generateDependencyReport(results.dependencyAnalysis);
    }

    if (results.qualityGateResults) {
      await this.generateQualityGateReport(results.qualityGateResults);
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(metrics: PerformanceMetrics): Promise<void> {
    const report = {
      summary: {
        totalDuration: metrics.totalDuration,
        averageTestDuration: metrics.averageTestDuration,
        peakMemory: metrics.memoryUsage.peak,
        peakCPU: metrics.cpuUsage.peak
      },
      slowestTests: metrics.slowestTests,
      recommendations: this.generatePerformanceRecommendations(metrics)
    };

    const reportPath = join(this.getConfig().outputPath, 'performance-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  📊 Performance report: ${reportPath}`);
  }

  /**
   * Generate security report
   */
  private async generateSecurityReport(findings: SecurityFinding[]): Promise<void> {
    const report = {
      summary: {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        low: findings.filter(f => f.severity === 'LOW').length
      },
      findings,
      recommendations: this.generateSecurityRecommendations(findings)
    };

    const reportPath = join(this.getConfig().outputPath, 'security-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  🔒 Security report: ${reportPath}`);
  }

  /**
   * Generate dependency report
   */
  private async generateDependencyReport(analysis: DependencyAnalysis): Promise<void> {
    const report = {
      summary: {
        totalDependencies: analysis.totalDependencies,
        vulnerabilities: analysis.vulnerabilities.length,
        outdatedPackages: analysis.outdatedPackages.length,
        circularDependencies: analysis.circularDependencies.length
      },
      details: analysis,
      recommendations: this.generateDependencyRecommendations(analysis)
    };

    const reportPath = join(this.getConfig().outputPath, 'dependency-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  📦 Dependency report: ${reportPath}`);
  }

  /**
   * Generate quality gate report
   */
  private async generateQualityGateReport(results: QualityGateResults): Promise<void> {
    const report = {
      passed: results.passed,
      gates: results.gates,
      summary: {
        total: results.gates.length,
        passed: results.gates.filter(g => g.passed).length,
        failed: results.gates.filter(g => !g.passed).length
      }
    };

    const reportPath = join(this.getConfig().outputPath, 'quality-gates.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  ✅ Quality gates report: ${reportPath}`);
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.totalDuration > 120000) {
      recommendations.push('Consider running tests in parallel to reduce execution time');
    }

    if (metrics.averageTestDuration > 5000) {
      recommendations.push('Some tests are taking too long - consider optimizing slow tests');
    }

    if (metrics.memoryUsage.peak > 512 * 1024 * 1024) {
      recommendations.push('High memory usage detected - check for memory leaks in tests');
    }

    if (metrics.slowestTests.length > 0) {
      recommendations.push(`Optimize slow tests: ${metrics.slowestTests.slice(0, 3).map(t => t.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(findings: SecurityFinding[]): string[] {
    const recommendations: string[] = [];

    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
    if (criticalFindings.length > 0) {
      recommendations.push('Address critical security findings immediately');
    }

    const secretFindings = findings.filter(f => f.type === 'SECRET');
    if (secretFindings.length > 0) {
      recommendations.push('Remove hardcoded secrets and use environment variables');
    }

    const cryptoFindings = findings.filter(f => f.type === 'WEAK_CRYPTO');
    if (cryptoFindings.length > 0) {
      recommendations.push('Upgrade to stronger cryptographic algorithms');
    }

    return recommendations;
  }

  /**
   * Generate dependency recommendations
   */
  private generateDependencyRecommendations(analysis: DependencyAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.vulnerabilities.length > 0) {
      recommendations.push('Update vulnerable dependencies to secure versions');
    }

    if (analysis.outdatedPackages.length > 5) {
      recommendations.push('Consider updating outdated packages to latest versions');
    }

    if (analysis.circularDependencies.length > 0) {
      recommendations.push('Resolve circular dependencies to improve maintainability');
    }

    return recommendations;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): any {
    return {
      qualityGates: {
        coverage: { threshold: 80 },
        warnings: { maxCount: 10 },
        performance: { maxDuration: 300000 }
      },
      reporting: {
        formats: ['json', 'html']
      }
    };
  }
}

/**
 * Performance Monitor
 */
class PerformanceMonitor {
  private startTime: number = 0;
  private testTimes: Array<{ name: string; duration: number }> = [];
  private memoryUsage: number[] = [];
  private cpuUsage: number[] = [];

  start(): void {
    this.startTime = Date.now();
    this.startResourceMonitoring();
  }

  stop(): void {
    // Stop monitoring
  }

  recordTestTime(name: string, duration: number): void {
    this.testTimes.push({ name, duration });
  }

  getMetrics(): PerformanceMetrics {
    const totalDuration = Date.now() - this.startTime;
    const averageTestDuration = this.testTimes.length > 0 ? 
      this.testTimes.reduce((sum, t) => sum + t.duration, 0) / this.testTimes.length : 0;

    return {
      totalDuration,
      averageTestDuration,
      slowestTests: this.testTimes
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      memoryUsage: {
        peak: Math.max(...this.memoryUsage, 0),
        average: this.memoryUsage.length > 0 ? 
          this.memoryUsage.reduce((sum, m) => sum + m, 0) / this.memoryUsage.length : 0
      },
      cpuUsage: {
        peak: Math.max(...this.cpuUsage, 0),
        average: this.cpuUsage.length > 0 ?
          this.cpuUsage.reduce((sum, c) => sum + c, 0) / this.cpuUsage.length : 0
      }
    };
  }

  private startResourceMonitoring(): void {
    const interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.push(memUsage.heapUsed);
      
      // CPU usage would require additional monitoring
      this.cpuUsage.push(0); // Placeholder
    }, 1000);

    // Clear interval after some time
    setTimeout(() => clearInterval(interval), 300000); // 5 minutes
  }
}

/**
 * Security Scanner
 */
class SecurityScanner {
  async scan(modulesPath: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // This would integrate with actual security scanning tools
    // For now, return empty array
    
    return findings;
  }
}

/**
 * Dependency Analyzer
 */
class DependencyAnalyzer {
  async analyze(modulesPath: string): Promise<DependencyAnalysis> {
    // This would integrate with actual dependency analysis tools
    // For now, return basic structure
    
    return {
      totalDependencies: 0,
      vulnerabilities: [],
      outdatedPackages: [],
      circularDependencies: []
    };
  }
}