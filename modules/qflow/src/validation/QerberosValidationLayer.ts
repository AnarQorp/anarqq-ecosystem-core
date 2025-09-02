/**
 * Qerberos Validation Layer for Universal Validation Pipeline
 * 
 * Integrates with Qerberos service for security validation and anomaly detection
 * ensuring integrity checks and security violation detection.
 */

import { ValidationResult, ValidationContext } from './UniversalValidationPipeline.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface QerberosValidationConfig {
  endpoint: string;
  timeout: number;
  retryAttempts: number;
  enableAnomalyDetection: boolean;
  enableIntegrityChecks: boolean;
  riskThreshold: number;
  blockHighRisk: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  rules: SecurityRule[];
  riskWeights: Record<string, number>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface SecurityRule {
  id: string;
  name: string;
  type: 'pattern' | 'behavior' | 'integrity' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  description: string;
  enabled: boolean;
  weight: number;
}

export interface SecurityViolation {
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
  riskScore: number;
  timestamp: string;
}

export interface AnomalyDetectionResult {
  anomalous: boolean;
  anomalyScore: number;
  anomalyType: string[];
  baseline: Record<string, any>;
  deviations: Record<string, any>;
  confidence: number;
}

export interface IntegrityCheckResult {
  valid: boolean;
  checksPerformed: string[];
  violations: string[];
  hashVerification: boolean;
  signatureVerification: boolean;
  timestampVerification: boolean;
}

export interface QerberosValidationResult extends ValidationResult {
  details: {
    securityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    violations: SecurityViolation[];
    anomalyDetection?: AnomalyDetectionResult;
    integrityCheck?: IntegrityCheckResult;
    policyVersion: string;
    blocked: boolean;
    recommendations: string[];
    error?: string;
  };
}

/**
 * Mock Qerberos Service for development/testing
 * In production, this would integrate with the actual Qerberos service
 */
class MockQerberosService {
  private policies: Map<string, SecurityPolicy> = new Map();
  private behaviorBaselines: Map<string, any> = new Map();
  private config: QerberosValidationConfig;

  constructor(config: QerberosValidationConfig) {
    this.config = config;
    this.initializeDefaultPolicies();
    this.initializeBehaviorBaselines();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicy: SecurityPolicy = {
      id: 'qflow-security-policy-v1',
      name: 'Qflow Default Security Policy',
      version: '1.0.0',
      rules: [
        {
          id: 'malicious-code-detection',
          name: 'Malicious Code Detection',
          type: 'pattern',
          severity: 'critical',
          pattern: '(eval|exec|system|shell_exec|passthru|proc_open|popen|file_get_contents|curl_exec)',
          description: 'Detects potentially malicious code execution patterns',
          enabled: true,
          weight: 10
        },
        {
          id: 'sql-injection-detection',
          name: 'SQL Injection Detection',
          type: 'pattern',
          severity: 'high',
          pattern: '(union|select|insert|update|delete|drop|create|alter)\\s+.*\\s+(from|into|table|database)',
          description: 'Detects SQL injection patterns',
          enabled: true,
          weight: 8
        },
        {
          id: 'xss-detection',
          name: 'Cross-Site Scripting Detection',
          type: 'pattern',
          severity: 'high',
          pattern: '(<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed)',
          description: 'Detects XSS attack patterns',
          enabled: true,
          weight: 7
        },
        {
          id: 'path-traversal-detection',
          name: 'Path Traversal Detection',
          type: 'pattern',
          severity: 'medium',
          pattern: '(\\.\\./|\\.\\.\\\\/|%2e%2e%2f|%2e%2e%5c)',
          description: 'Detects path traversal attempts',
          enabled: true,
          weight: 6
        },
        {
          id: 'excessive-resource-usage',
          name: 'Excessive Resource Usage',
          type: 'behavior',
          severity: 'medium',
          description: 'Detects excessive CPU, memory, or network usage patterns',
          enabled: true,
          weight: 5
        },
        {
          id: 'unusual-execution-pattern',
          name: 'Unusual Execution Pattern',
          type: 'anomaly',
          severity: 'low',
          description: 'Detects unusual execution patterns compared to baseline',
          enabled: true,
          weight: 3
        },
        {
          id: 'integrity-violation',
          name: 'Data Integrity Violation',
          type: 'integrity',
          severity: 'critical',
          description: 'Detects data integrity violations',
          enabled: true,
          weight: 10
        }
      ],
      riskWeights: {
        critical: 10,
        high: 7,
        medium: 4,
        low: 1
      },
      thresholds: {
        low: 5,
        medium: 15,
        high: 30,
        critical: 50
      }
    };

    this.policies.set(defaultPolicy.id, defaultPolicy);
  }

  private initializeBehaviorBaselines(): void {
    // Mock behavior baselines for anomaly detection
    this.behaviorBaselines.set('execution-patterns', {
      avgExecutionTime: 5000,
      avgStepCount: 10,
      avgResourceUsage: 0.3,
      commonStepTypes: ['webhook', 'email', 'transform'],
      typicalDataSizes: { min: 100, max: 10000, avg: 2000 }
    });

    this.behaviorBaselines.set('user-patterns', {
      avgFlowsPerDay: 5,
      commonExecutionTimes: ['09:00-17:00'],
      typicalFlowCategories: ['automation', 'integration'],
      avgFlowComplexity: 0.6
    });
  }

  async validateSecurity(data: any, context: ValidationContext, policyId: string = 'qflow-security-policy-v1'): Promise<{
    securityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    violations: SecurityViolation[];
    blocked: boolean;
    recommendations: string[];
  }> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Security policy not found: ${policyId}`);
    }

    const violations: SecurityViolation[] = [];
    let totalRiskScore = 0;

    // Apply security rules
    for (const rule of policy.rules.filter(r => r.enabled)) {
      const ruleViolations = await this.applySecurityRule(rule, data, context);
      violations.push(...ruleViolations);
      
      for (const violation of ruleViolations) {
        totalRiskScore += violation.riskScore;
      }
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(totalRiskScore, policy.thresholds);
    
    // Determine if should be blocked
    const blocked = this.config.blockHighRisk && (riskLevel === 'high' || riskLevel === 'critical');

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, riskLevel);

    return {
      securityScore: Math.max(0, 100 - totalRiskScore),
      riskLevel,
      violations,
      blocked,
      recommendations
    };
  }

  async detectAnomalies(data: any, context: ValidationContext): Promise<AnomalyDetectionResult> {
    if (!this.config.enableAnomalyDetection) {
      return {
        anomalous: false,
        anomalyScore: 0,
        anomalyType: [],
        baseline: {},
        deviations: {},
        confidence: 0
      };
    }

    const baseline = this.behaviorBaselines.get('execution-patterns') || {};
    const deviations: Record<string, any> = {};
    const anomalyTypes: string[] = [];
    let anomalyScore = 0;

    // Check execution time anomaly
    if (data.executionTime && baseline.avgExecutionTime) {
      const deviation = Math.abs(data.executionTime - baseline.avgExecutionTime) / baseline.avgExecutionTime;
      if (deviation > 2.0) { // More than 200% deviation
        anomalyTypes.push('execution-time');
        deviations.executionTime = { expected: baseline.avgExecutionTime, actual: data.executionTime, deviation };
        anomalyScore += deviation * 10;
      }
    }

    // Check step count anomaly
    if (data.steps && baseline.avgStepCount) {
      const stepCount = Array.isArray(data.steps) ? data.steps.length : 0;
      const deviation = Math.abs(stepCount - baseline.avgStepCount) / baseline.avgStepCount;
      if (deviation > 1.5) { // More than 150% deviation
        anomalyTypes.push('step-count');
        deviations.stepCount = { expected: baseline.avgStepCount, actual: stepCount, deviation };
        anomalyScore += deviation * 5;
      }
    }

    // Check data size anomaly
    if (data.payload) {
      const dataSize = JSON.stringify(data.payload).length;
      const { min, max, avg } = baseline.typicalDataSizes || { min: 0, max: 10000, avg: 2000 };
      if (dataSize < min * 0.1 || dataSize > max * 2) {
        anomalyTypes.push('data-size');
        deviations.dataSize = { expected: { min, max, avg }, actual: dataSize };
        anomalyScore += 15;
      }
    }

    // Check unusual step types
    if (data.steps && Array.isArray(data.steps) && baseline.commonStepTypes) {
      const stepTypes = data.steps.map((step: any) => step.type).filter(Boolean);
      const unusualTypes = stepTypes.filter((type: string) => !baseline.commonStepTypes.includes(type));
      if (unusualTypes.length > 0) {
        anomalyTypes.push('unusual-step-types');
        deviations.stepTypes = { expected: baseline.commonStepTypes, unusual: unusualTypes };
        anomalyScore += unusualTypes.length * 3;
      }
    }

    const confidence = Math.min(anomalyScore / 50, 1.0); // Normalize to 0-1
    const anomalous = anomalyScore > 20; // Threshold for anomaly detection

    return {
      anomalous,
      anomalyScore,
      anomalyType: anomalyTypes,
      baseline,
      deviations,
      confidence
    };
  }

  async checkIntegrity(data: any, context: ValidationContext): Promise<IntegrityCheckResult> {
    if (!this.config.enableIntegrityChecks) {
      return {
        valid: true,
        checksPerformed: [],
        violations: [],
        hashVerification: true,
        signatureVerification: true,
        timestampVerification: true
      };
    }

    const checksPerformed: string[] = [];
    const violations: string[] = [];
    let hashVerification = true;
    let signatureVerification = true;
    let timestampVerification = true;

    // Hash verification
    if (data.hash || data.checksum) {
      checksPerformed.push('hash-verification');
      const expectedHash = this.calculateHash(data);
      if (data.hash && data.hash !== expectedHash) {
        violations.push('Hash mismatch detected');
        hashVerification = false;
      }
    }

    // Signature verification
    if (data.signature) {
      checksPerformed.push('signature-verification');
      const signatureValid = this.verifySignature(data, data.signature);
      if (!signatureValid) {
        violations.push('Invalid signature detected');
        signatureVerification = false;
      }
    }

    // Timestamp verification
    if (data.timestamp) {
      checksPerformed.push('timestamp-verification');
      const timestampValid = this.verifyTimestamp(data.timestamp);
      if (!timestampValid) {
        violations.push('Invalid or expired timestamp');
        timestampVerification = false;
      }
    }

    // Data structure integrity
    checksPerformed.push('structure-integrity');
    if (data.steps && Array.isArray(data.steps)) {
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        if (!step.id || !step.type) {
          violations.push(`Step ${i}: Missing required fields (id, type)`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      checksPerformed,
      violations,
      hashVerification,
      signatureVerification,
      timestampVerification
    };
  }

  private async applySecurityRule(rule: SecurityRule, data: any, context: ValidationContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    switch (rule.type) {
      case 'pattern':
        if (rule.pattern) {
          const patternViolations = this.checkPatternRule(rule, data);
          violations.push(...patternViolations);
        }
        break;

      case 'behavior':
        const behaviorViolations = await this.checkBehaviorRule(rule, data, context);
        violations.push(...behaviorViolations);
        break;

      case 'integrity':
        const integrityViolations = await this.checkIntegrityRule(rule, data, context);
        violations.push(...integrityViolations);
        break;

      case 'anomaly':
        const anomalyViolations = await this.checkAnomalyRule(rule, data, context);
        violations.push(...anomalyViolations);
        break;
    }

    return violations;
  }

  private checkPatternRule(rule: SecurityRule, data: any): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const dataString = JSON.stringify(data);
    
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern, 'gi');
      const matches = dataString.match(regex);
      
      if (matches && matches.length > 0) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: `${rule.description}. Detected patterns: ${matches.join(', ')}`,
          evidence: { matches, pattern: rule.pattern },
          riskScore: rule.weight,
          timestamp: new Date().toISOString()
        });
      }
    }

    return violations;
  }

  private async checkBehaviorRule(rule: SecurityRule, data: any, context: ValidationContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    // Mock behavior analysis
    if (rule.id === 'excessive-resource-usage') {
      if (data.resourceUsage && data.resourceUsage > 0.8) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: `Excessive resource usage detected: ${data.resourceUsage * 100}%`,
          evidence: { resourceUsage: data.resourceUsage, threshold: 0.8 },
          riskScore: rule.weight,
          timestamp: new Date().toISOString()
        });
      }
    }

    return violations;
  }

  private async checkIntegrityRule(rule: SecurityRule, data: any, context: ValidationContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    if (rule.id === 'integrity-violation') {
      const integrityResult = await this.checkIntegrity(data, context);
      if (!integrityResult.valid) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: `Data integrity violations: ${integrityResult.violations.join(', ')}`,
          evidence: integrityResult,
          riskScore: rule.weight,
          timestamp: new Date().toISOString()
        });
      }
    }

    return violations;
  }

  private async checkAnomalyRule(rule: SecurityRule, data: any, context: ValidationContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    if (rule.id === 'unusual-execution-pattern') {
      const anomalyResult = await this.detectAnomalies(data, context);
      if (anomalyResult.anomalous && anomalyResult.confidence > 0.7) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: `Unusual execution pattern detected: ${anomalyResult.anomalyType.join(', ')}`,
          evidence: anomalyResult,
          riskScore: Math.min(rule.weight * anomalyResult.confidence, rule.weight),
          timestamp: new Date().toISOString()
        });
      }
    }

    return violations;
  }

  private calculateRiskLevel(score: number, thresholds: SecurityPolicy['thresholds']): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  private generateRecommendations(violations: SecurityViolation[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (violations.length === 0) {
      recommendations.push('No security issues detected. Continue monitoring.');
      return recommendations;
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');

    if (criticalViolations.length > 0) {
      recommendations.push('CRITICAL: Immediately review and address critical security violations');
      recommendations.push('Consider blocking execution until issues are resolved');
    }

    if (highViolations.length > 0) {
      recommendations.push('HIGH: Review high-severity security issues promptly');
      recommendations.push('Implement additional monitoring for affected flows');
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Enable enhanced logging and monitoring');
      recommendations.push('Consider implementing additional security controls');
    }

    // Specific recommendations based on violation types
    const patternViolations = violations.filter(v => v.ruleId.includes('detection'));
    if (patternViolations.length > 0) {
      recommendations.push('Review flow content for potentially malicious patterns');
      recommendations.push('Implement input sanitization and validation');
    }

    return recommendations;
  }

  private calculateHash(data: any): string {
    // Mock hash calculation - in reality would use proper cryptographic hash
    const content = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private verifySignature(data: any, signature: string): boolean {
    // Mock signature verification - in reality would use proper cryptographic verification
    const expectedSignature = this.calculateHash(data);
    return signature === expectedSignature;
  }

  private verifyTimestamp(timestamp: string): boolean {
    try {
      const ts = new Date(timestamp);
      const now = new Date();
      const diff = Math.abs(now.getTime() - ts.getTime());
      
      // Allow 1 hour tolerance
      return diff < 3600000;
    } catch {
      return false;
    }
  }

  async getPolicy(policyId: string): Promise<SecurityPolicy | null> {
    return this.policies.get(policyId) || null;
  }

  async updatePolicy(policy: SecurityPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
  }
}

/**
 * Qerberos Validation Layer
 * Provides security validation and anomaly detection for the Universal Validation Pipeline
 */
export class QerberosValidationLayer {
  private qerberosService: MockQerberosService;
  private config: QerberosValidationConfig;

  constructor(config?: Partial<QerberosValidationConfig>) {
    this.config = {
      endpoint: process.env.QERBEROS_ENDPOINT || 'http://localhost:8083',
      timeout: 15000,
      retryAttempts: 3,
      enableAnomalyDetection: true,
      enableIntegrityChecks: true,
      riskThreshold: 30,
      blockHighRisk: false, // Don't block by default in development
      ...config
    };

    this.qerberosService = new MockQerberosService(this.config);
  }

  /**
   * Validate security and detect anomalies
   */
  async validateSecurity(data: any, context: ValidationContext): Promise<QerberosValidationResult> {
    const startTime = Date.now();
    
    try {
      // Perform security validation
      const securityResult = await this.qerberosService.validateSecurity(data, context);
      
      // Perform anomaly detection if enabled
      let anomalyDetection: AnomalyDetectionResult | undefined;
      if (this.config.enableAnomalyDetection) {
        anomalyDetection = await this.qerberosService.detectAnomalies(data, context);
      }

      // Perform integrity checks if enabled
      let integrityCheck: IntegrityCheckResult | undefined;
      if (this.config.enableIntegrityChecks) {
        integrityCheck = await this.qerberosService.checkIntegrity(data, context);
      }

      // Determine overall status
      const blocked = Boolean(securityResult.blocked || 
                     (integrityCheck && !integrityCheck.valid) ||
                     (anomalyDetection && anomalyDetection.anomalous && anomalyDetection.confidence > 0.9));

      const status = blocked ? 'failed' : 'passed';
      const message = blocked 
        ? `Security validation failed: ${securityResult.violations.length} violations detected`
        : `Security validation passed (Risk: ${securityResult.riskLevel})`;

      // Emit security events
      if (securityResult.violations.length > 0) {
        qflowEventEmitter.emit('q.qflow.qerberos.violations.detected.v1', {
          violations: securityResult.violations,
          riskLevel: securityResult.riskLevel,
          blocked,
          timestamp: new Date().toISOString()
        });
      }

      if (anomalyDetection && anomalyDetection.anomalous) {
        qflowEventEmitter.emit('q.qflow.qerberos.anomaly.detected.v1', {
          anomalyType: anomalyDetection.anomalyType,
          anomalyScore: anomalyDetection.anomalyScore,
          confidence: anomalyDetection.confidence,
          timestamp: new Date().toISOString()
        });
      }

      return {
        layerId: 'qerberos-validation',
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          securityScore: securityResult.securityScore,
          riskLevel: securityResult.riskLevel,
          violations: securityResult.violations,
          anomalyDetection,
          integrityCheck,
          policyVersion: 'qflow-security-policy-v1',
          blocked,
          recommendations: securityResult.recommendations
        }
      };

    } catch (error) {
      return {
        layerId: 'qerberos-validation',
        status: 'failed',
        message: `Qerberos validation error: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          securityScore: 0,
          riskLevel: 'critical',
          violations: [],
          policyVersion: 'unknown',
          blocked: true,
          recommendations: ['Review security validation configuration'],
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get security policy
   */
  async getPolicy(policyId: string = 'qflow-security-policy-v1'): Promise<SecurityPolicy | null> {
    try {
      return await this.qerberosService.getPolicy(policyId);
    } catch (error) {
      console.error('[QerberosValidation] ❌ Failed to get policy:', error);
      throw error;
    }
  }

  /**
   * Update security policy
   */
  async updatePolicy(policy: SecurityPolicy): Promise<void> {
    try {
      await this.qerberosService.updatePolicy(policy);
      
      // Emit policy update event
      qflowEventEmitter.emit('q.qflow.qerberos.policy.updated.v1', {
        policyId: policy.id,
        version: policy.version,
        rulesCount: policy.rules.length,
        timestamp: new Date().toISOString()
      });

      console.log(`[QerberosValidation] 📋 Security policy updated: ${policy.id}`);

    } catch (error) {
      console.error('[QerberosValidation] ❌ Failed to update policy:', error);
      throw error;
    }
  }

  /**
   * Get validation layer configuration for Universal Validation Pipeline
   */
  getValidationLayer() {
    return {
      layerId: 'qerberos-validation',
      name: 'Qerberos Security Validation',
      description: 'Validates security, detects anomalies, and performs integrity checks',
      priority: 1, // Highest priority - security first
      required: true,
      timeout: this.config.timeout
    };
  }

  /**
   * Get validator function for Universal Validation Pipeline
   */
  getValidator() {
    return async (data: any, context: ValidationContext): Promise<ValidationResult> => {
      return await this.validateSecurity(data, context);
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): QerberosValidationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QerberosValidationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[QerberosValidation] 📋 Configuration updated');
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): { 
    policiesLoaded: number; 
    rulesEnabled: number; 
    anomalyDetectionEnabled: boolean;
    integrityChecksEnabled: boolean;
  } {
    return {
      policiesLoaded: (this.qerberosService as any).policies.size,
      rulesEnabled: 7, // Mock count
      anomalyDetectionEnabled: this.config.enableAnomalyDetection,
      integrityChecksEnabled: this.config.enableIntegrityChecks
    };
  }
}

// Export singleton instance
export const qerberosValidationLayer = new QerberosValidationLayer();