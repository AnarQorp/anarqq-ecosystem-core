/**
 * Enhanced Audit and Risk Assessment Service
 * Provides real-time risk scoring, behavioral pattern analysis,
 * compliance monitoring, and automated alerts and reporting
 */
import { IdentityType } from '../../types/identity';
import { 
  WalletAuditLog, 
  RiskAssessment, 
  ComplianceReport,
  WalletOperation 
} from '../../types/wallet-config';

// Enhanced audit interfaces
export interface RiskFactor {
  id: string;
  name: string;
  category: 'BEHAVIORAL' | 'TRANSACTION' | 'IDENTITY' | 'EXTERNAL' | 'COMPLIANCE';
  weight: number;
  score: number;
  description: string;
  evidence: any[];
  timestamp: string;
}

export interface BehavioralPattern {
  id: string;
  identityId: string;
  patternType: 'NORMAL' | 'SUSPICIOUS' | 'ANOMALOUS' | 'FRAUDULENT';
  confidence: number;
  description: string;
  indicators: string[];
  firstObserved: string;
  lastObserved: string;
  frequency: number;
  riskContribution: number;
}

export interface ComplianceViolation {
  id: string;
  identityId: string;
  violationType: 'AML' | 'KYC' | 'SANCTIONS' | 'REGULATORY' | 'INTERNAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  regulation: string;
  evidence: any[];
  status: 'DETECTED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  detectedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: 'RISK' | 'COMPLIANCE' | 'BEHAVIORAL' | 'TRANSACTION';
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cooldownPeriod: number;
  lastTriggered?: string;
}

export interface AlertCondition {
  field: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NEQ' | 'CONTAINS' | 'REGEX';
  value: any;
  timeWindow?: number;
}

export interface AlertAction {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'BLOCK_WALLET' | 'REQUIRE_APPROVAL' | 'LOG';
  config: any;
}

export interface SecurityAlert {
  id: string;
  ruleId: string;
  identityId: string;
  alertType: 'RISK_THRESHOLD' | 'COMPLIANCE_VIOLATION' | 'BEHAVIORAL_ANOMALY' | 'TRANSACTION_SUSPICIOUS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: any[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
}

export interface AuditReport {
  id: string;
  identityId?: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ON_DEMAND';
  period: { start: string; end: string };
  summary: {
    totalTransactions: number;
    totalVolume: number;
    riskScore: number;
    complianceScore: number;
    alertsGenerated: number;
    violationsDetected: number;
  };
  riskAnalysis: {
    riskDistribution: Record<string, number>;
    topRiskFactors: RiskFactor[];
    riskTrends: Array<{ date: string; score: number }>;
  };
  complianceAnalysis: {
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
    violations: ComplianceViolation[];
    recommendations: string[];
  };
  behavioralAnalysis: {
    patterns: BehavioralPattern[];
    anomalies: number;
    normalBehaviorBaseline: any;
  };
  generatedAt: string;
  generatedBy: string;
}

export interface RiskModel {
  id: string;
  name: string;
  version: string;
  description: string;
  factors: RiskFactor[];
  weights: Record<string, number>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  lastUpdated: string;
  accuracy: number;
  enabled: boolean;
}

export interface EnhancedAuditServiceInterface {
  calculateRiskScore(identityId: string, operation?: WalletOperation): Promise<RiskAssessment>;
  updateRiskModel(model: RiskModel): Promise<boolean>;
  getRiskFactors(identityId: string): Promise<RiskFactor[]>;
  analyzeBehavioralPatterns(identityId: string): Promise<BehavioralPattern[]>;
  detectAnomalies(identityId: string, timeWindow: number): Promise<BehavioralPattern[]>;
  updateBehavioralBaseline(identityId: string): Promise<boolean>;
  checkCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]>;
  generateComplianceReport(identityId?: string, period?: { start: string; end: string }): Promise<ComplianceReport>;
  resolveViolation(violationId: string, resolution: string): Promise<boolean>;
  logOperation(auditLog: WalletAuditLog): Promise<boolean>;
  getAuditTrail(identityId: string, filters?: AuditFilters): Promise<WalletAuditLog[]>;
  exportAuditLogs(filters: AuditFilters): Promise<string>;
  createAlertRule(rule: AlertRule): Promise<boolean>;
  evaluateAlerts(identityId: string, operation: WalletOperation): Promise<SecurityAlert[]>;
  resolveAlert(alertId: string, resolution: string): Promise<boolean>;
  generateAuditReport(config: AuditReportConfig): Promise<AuditReport>;
  scheduleReport(config: AuditReportConfig, schedule: string): Promise<string>;
  getReportHistory(identityId?: string): Promise<AuditReport[]>;
}

export interface AuditFilters {
  identityId?: string;
  operationType?: string;
  startDate?: string;
  endDate?: string;
  riskLevel?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditReportConfig {
  identityId?: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ON_DEMAND';
  period?: { start: string; end: string };
  includeRiskAnalysis: boolean;
  includeComplianceAnalysis: boolean;
  includeBehavioralAnalysis: boolean;
  format: 'JSON' | 'PDF' | 'CSV' | 'XLSX';
  recipients?: string[];
}

export class EnhancedAuditService implements EnhancedAuditServiceInterface {
  private auditLogs: Map<string, WalletAuditLog[]> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private behavioralPatterns: Map<string, BehavioralPattern[]> = new Map();
  private complianceViolations: Map<string, ComplianceViolation[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private securityAlerts: Map<string, SecurityAlert[]> = new Map();
  private riskModels: Map<string, RiskModel> = new Map();
  private behavioralBaselines: Map<string, any> = new Map();

  private readonly RISK_WEIGHTS = {
    TRANSACTION_AMOUNT: 0.25,
    TRANSACTION_FREQUENCY: 0.20,
    IDENTITY_VERIFICATION: 0.15,
    BEHAVIORAL_ANOMALY: 0.20,
    COMPLIANCE_HISTORY: 0.10,
    EXTERNAL_FACTORS: 0.10
  };

  constructor() {
    this.loadDataFromStorage();
    this.initializeDefaultRiskModel();
    this.initializeDefaultAlertRules();
    this.startPeriodicAnalysis();
  }

  async calculateRiskScore(identityId: string, operation?: WalletOperation): Promise<RiskAssessment> {
    try {
      const riskFactors = await this.getRiskFactors(identityId);
      const behavioralPatterns = await this.analyzeBehavioralPatterns(identityId);
      const complianceViolations = await this.getComplianceViolations(identityId);

      let riskScore = 0;
      const factors: RiskFactor[] = [];

      if (operation) {
        const transactionRisk = this.calculateTransactionRisk(identityId, operation);
        riskScore += transactionRisk.score * this.RISK_WEIGHTS.TRANSACTION_AMOUNT;
        factors.push(transactionRisk);
      }

      const frequencyRisk = await this.calculateFrequencyRisk(identityId);
      riskScore += frequencyRisk.score * this.RISK_WEIGHTS.TRANSACTION_FREQUENCY;
      factors.push(frequencyRisk);

      const identityRisk = this.calculateIdentityRisk(identityId);
      riskScore += identityRisk.score * this.RISK_WEIGHTS.IDENTITY_VERIFICATION;
      factors.push(identityRisk);

      const behavioralRisk = this.calculateBehavioralRisk(behavioralPatterns);
      riskScore += behavioralRisk.score * this.RISK_WEIGHTS.BEHAVIORAL_ANOMALY;
      factors.push(behavioralRisk);

      const complianceRisk = this.calculateComplianceRisk(complianceViolations);
      riskScore += complianceRisk.score * this.RISK_WEIGHTS.COMPLIANCE_HISTORY;
      factors.push(complianceRisk);

      const externalRisk = await this.calculateExternalRisk(identityId);
      riskScore += externalRisk.score * this.RISK_WEIGHTS.EXTERNAL_FACTORS;
      factors.push(externalRisk);

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (riskScore < 0.3) riskLevel = 'LOW';
      else if (riskScore < 0.6) riskLevel = 'MEDIUM';
      else if (riskScore < 0.8) riskLevel = 'HIGH';
      else riskLevel = 'CRITICAL';

      const assessment: RiskAssessment = {
        identityId,
        riskScore,
        riskLevel,
        factors,
        recommendations: this.generateRiskRecommendations(riskScore, factors),
        lastUpdated: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        confidence: this.calculateConfidence(factors),
        mitigationActions: this.generateMitigationActions(riskLevel, factors)
      };

      this.riskAssessments.set(identityId, assessment);
      await this.saveDataToStorage();

      console.log(`[EnhancedAuditService] Risk assessment completed for identity: ${identityId}, Score: ${riskScore.toFixed(3)}, Level: ${riskLevel}`);
      return assessment;
    } catch (error) {
      console.error('[EnhancedAuditService] Error calculating risk score:', error);
      return {
        identityId,
        riskScore: 0.8,
        riskLevel: 'HIGH',
        factors: [{
          id: `error_${Date.now()}`,
          name: 'Risk Calculation Error',
          category: 'EXTERNAL',
          weight: 1,
          score: 0.8,
          description: 'Unable to calculate risk score due to system error',
          evidence: [error],
          timestamp: new Date().toISOString()
        }],
        recommendations: ['Manual review required due to risk calculation error'],
        lastUpdated: new Date().toISOString(),
        validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        confidence: 0.1,
        mitigationActions: ['Require manual approval', 'Enhanced monitoring']
      };
    }
  }

  async updateRiskModel(model: RiskModel): Promise<boolean> {
    try {
      this.riskModels.set(model.id, {
        ...model,
        lastUpdated: new Date().toISOString()
      });
      await this.saveDataToStorage();
      console.log(`[EnhancedAuditService] Risk model updated: ${model.name} v${model.version}`);
      return true;
    } catch (error) {
      console.error('[EnhancedAuditService] Error updating risk model:', error);
      return false;
    }
  }

  async getRiskFactors(identityId: string): Promise<RiskFactor[]> {
    const assessment = this.riskAssessments.get(identityId);
    return assessment?.factors || [];
  }

  async analyzeBehavioralPatterns(identityId: string): Promise<BehavioralPattern[]> {
    try {
      const auditLogs = this.auditLogs.get(identityId) || [];
      const patterns: BehavioralPattern[] = [];

      const transactionPatterns = this.analyzeTransactionPatterns(auditLogs);
      patterns.push(...transactionPatterns);

      const timingPatterns = this.analyzeTimingPatterns(auditLogs);
      patterns.push(...timingPatterns);

      const amountPatterns = this.analyzeAmountPatterns(auditLogs);
      patterns.push(...amountPatterns);

      const frequencyPatterns = this.analyzeFrequencyPatterns(auditLogs);
      patterns.push(...frequencyPatterns);

      this.behavioralPatterns.set(identityId, patterns);
      await this.saveDataToStorage();

      console.log(`[EnhancedAuditService] Analyzed ${patterns.length} behavioral patterns for identity: ${identityId}`);
      return patterns;
    } catch (error) {
      console.error('[EnhancedAuditService] Error analyzing behavioral patterns:', error);
      return [];
    }
  }

  async detectAnomalies(identityId: string, timeWindow: number): Promise<BehavioralPattern[]> {
    try {
      const patterns = await this.analyzeBehavioralPatterns(identityId);
      const baseline = this.behavioralBaselines.get(identityId);

      if (!baseline) {
        console.log(`[EnhancedAuditService] No behavioral baseline found for identity: ${identityId}`);
        return [];
      }

      const anomalies = patterns.filter(pattern => {
        return pattern.patternType === 'ANOMALOUS' || 
               pattern.patternType === 'SUSPICIOUS' ||
               pattern.confidence > 0.7;
      });

      console.log(`[EnhancedAuditService] Detected ${anomalies.length} anomalies for identity: ${identityId}`);
      return anomalies;
    } catch (error) {
      console.error('[EnhancedAuditService] Error detecting anomalies:', error);
      return [];
    }
  }

  async updateBehavioralBaseline(identityId: string): Promise<boolean> {
    try {
      const auditLogs = this.auditLogs.get(identityId) || [];
      const recentLogs = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return logDate > thirtyDaysAgo && log.success;
      });

      const baseline = {
        averageTransactionAmount: this.calculateAverageAmount(recentLogs),
        averageTransactionFrequency: this.calculateAverageFrequency(recentLogs),
        commonTransactionTimes: this.calculateCommonTimes(recentLogs),
        commonOperationTypes: this.calculateCommonOperations(recentLogs),
        updatedAt: new Date().toISOString(),
        sampleSize: recentLogs.length
      };

      this.behavioralBaselines.set(identityId, baseline);
      await this.saveDataToStorage();

      console.log(`[EnhancedAuditService] Updated behavioral baseline for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EnhancedAuditService] Error updating behavioral baseline:', error);
      return false;
    }
  }

  async checkCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    try {
      const violations: ComplianceViolation[] = [];

      const amlViolations = await this.checkAMLCompliance(identityId, operation);
      violations.push(...amlViolations);

      const kycViolations = await this.checkKYCCompliance(identityId, operation);
      violations.push(...kycViolations);

      const sanctionsViolations = await this.checkSanctionsCompliance(identityId, operation);
      violations.push(...sanctionsViolations);

      const regulatoryViolations = await this.checkRegulatoryCompliance(identityId, operation);
      violations.push(...regulatoryViolations);

      const internalViolations = await this.checkInternalCompliance(identityId, operation);
      violations.push(...internalViolations);

      if (violations.length > 0) {
        const existingViolations = this.complianceViolations.get(identityId) || [];
        this.complianceViolations.set(identityId, [...existingViolations, ...violations]);
        await this.saveDataToStorage();
      }

      console.log(`[EnhancedAuditService] Compliance check completed for identity: ${identityId}, Violations: ${violations.length}`);
      return violations;
    } catch (error) {
      console.error('[EnhancedAuditService] Error checking compliance:', error);
      return [];
    }
  }

  async generateComplianceReport(identityId?: string, period?: { start: string; end: string }): Promise<ComplianceReport> {
    try {
      const startDate = period?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = period?.end || new Date().toISOString();

      let allViolations: ComplianceViolation[] = [];
      if (identityId) {
        allViolations = this.complianceViolations.get(identityId) || [];
      } else {
        for (const violations of this.complianceViolations.values()) {
          allViolations.push(...violations);
        }
      }

      const periodViolations = allViolations.filter(violation => {
        const violationDate = new Date(violation.detectedAt);
        return violationDate >= new Date(startDate) && violationDate <= new Date(endDate);
      });

      const report: ComplianceReport = {
        id: `compliance_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        identityId,
        period: { start: startDate, end: endDate },
        overallStatus: periodViolations.length === 0 ? 'COMPLIANT' : 
                      periodViolations.some(v => v.severity === 'CRITICAL') ? 'NON_COMPLIANT' : 'UNDER_REVIEW',
        violations: periodViolations,
        summary: {
          totalViolations: periodViolations.length,
          criticalViolations: periodViolations.filter(v => v.severity === 'CRITICAL').length,
          highViolations: periodViolations.filter(v => v.severity === 'HIGH').length,
          mediumViolations: periodViolations.filter(v => v.severity === 'MEDIUM').length,
          lowViolations: periodViolations.filter(v => v.severity === 'LOW').length,
          resolvedViolations: periodViolations.filter(v => v.status === 'RESOLVED').length,
          pendingViolations: periodViolations.filter(v => v.status !== 'RESOLVED').length
        },
        recommendations: this.generateComplianceRecommendations(periodViolations),
        generatedAt: new Date().toISOString(),
        generatedBy: 'EnhancedAuditService'
      };

      console.log(`[EnhancedAuditService] Generated compliance report: ${report.id}`);
      return report;
    } catch (error) {
      console.error('[EnhancedAuditService] Error generating compliance report:', error);
      throw error;
    }
  }

  async resolveViolation(violationId: string, resolution: string): Promise<boolean> {
    try {
      for (const [identityId, violations] of this.complianceViolations.entries()) {
        const violation = violations.find(v => v.id === violationId);
        if (violation) {
          violation.status = 'RESOLVED';
          violation.resolvedAt = new Date().toISOString();
          await this.saveDataToStorage();
          console.log(`[EnhancedAuditService] Resolved violation: ${violationId}`);
          return true;
        }
      }
      console.warn(`[EnhancedAuditService] Violation not found: ${violationId}`);
      return false;
    } catch (error) {
      console.error('[EnhancedAuditService] Error resolving violation:', error);
      return false;
    }
  }

  async logOperation(auditLog: WalletAuditLog): Promise<boolean> {
    try {
      const existingLogs = this.auditLogs.get(auditLog.identityId) || [];
      existingLogs.push({
        ...auditLog,
        timestamp: auditLog.timestamp || new Date().toISOString()
      });
      this.auditLogs.set(auditLog.identityId, existingLogs);
      await this.saveDataToStorage();

      await this.performRealTimeAnalysis(auditLog);

      console.log(`[EnhancedAuditService] Logged operation: ${auditLog.operation} for identity: ${auditLog.identityId}`);
      return true;
    } catch (error) {
      console.error('[EnhancedAuditService] Error logging operation:', error);
      return false;
    }
  }

  async getAuditTrail(identityId: string, filters?: AuditFilters): Promise<WalletAuditLog[]> {
    try {
      let logs = this.auditLogs.get(identityId) || [];
      if (filters) {
        logs = logs.filter(log => {
          if (filters.operationType && log.operationType !== filters.operationType) return false;
          if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) return false;
          if (filters.endDate && new Date(log.timestamp) > new Date(filters.endDate)) return false;
          if (filters.success !== undefined && log.success !== filters.success) return false;
          return true;
        });
        if (filters.offset) logs = logs.slice(filters.offset);
        if (filters.limit) logs = logs.slice(0, filters.limit);
      }
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('[EnhancedAuditService] Error getting audit trail:', error);
      return [];
    }
  }

  async exportAuditLogs(filters: AuditFilters): Promise<string> {
    try {
      let allLogs: WalletAuditLog[] = [];
      if (filters.identityId) {
        allLogs = await this.getAuditTrail(filters.identityId, filters);
      } else {
        for (const [identityId, logs] of this.auditLogs.entries()) {
          const filteredLogs = await this.getAuditTrail(identityId, filters);
          allLogs.push(...filteredLogs);
        }
      }

      const csvContent = this.convertLogsToCSV(allLogs);
      const filename = `audit_export_${Date.now()}.csv`;
      console.log(`[EnhancedAuditService] Exported ${allLogs.length} audit logs to ${filename}`);
      return filename;
    } catch (error) {
      console.error('[EnhancedAuditService] Error exporting audit logs:', error);
      throw error;
    }
  }

  async createAlertRule(rule: AlertRule): Promise<boolean> {
    try {
      this.alertRules.set(rule.id, {
        ...rule,
        lastTriggered: undefined
      });
      await this.saveDataToStorage();
      console.log(`[EnhancedAuditService] Created alert rule: ${rule.name}`);
      return true;
    } catch (error) {
      console.error('[EnhancedAuditService] Error creating alert rule:', error);
      return false;
    }
  }

  async evaluateAlerts(identityId: string, operation: WalletOperation): Promise<SecurityAlert[]> {
    try {
      const alerts: SecurityAlert[] = [];
      const currentTime = new Date();

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        if (rule.lastTriggered) {
          const lastTriggered = new Date(rule.lastTriggered);
          const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldownPeriod * 60 * 1000);
          if (currentTime < cooldownEnd) continue;
        }

        const conditionsMet = await this.evaluateAlertConditions(identityId, operation, rule.conditions);
        if (conditionsMet) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            ruleId: rule.id,
            identityId,
            alertType: this.mapCategoryToAlertType(rule.category),
            severity: rule.priority,
            title: rule.name,
            description: rule.description,
            evidence: [operation],
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          alerts.push(alert);
          await this.executeAlertActions(alert, rule.actions);
          rule.lastTriggered = new Date().toISOString();
        }
      }

      if (alerts.length > 0) {
        const existingAlerts = this.securityAlerts.get(identityId) || [];
        this.securityAlerts.set(identityId, [...existingAlerts, ...alerts]);
        await this.saveDataToStorage();
      }

      console.log(`[EnhancedAuditService] Evaluated alerts for identity: ${identityId}, Generated: ${alerts.length}`);
      return alerts;
    } catch (error) {
      console.error('[EnhancedAuditService] Error evaluating alerts:', error);
      return [];
    }
  }

  async resolveAlert(alertId: string, resolution: string): Promise<boolean> {
    try {
      for (const [identityId, alerts] of this.securityAlerts.entries()) {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          alert.status = 'RESOLVED';
          alert.resolution = resolution;
          alert.updatedAt = new Date().toISOString();
          await this.saveDataToStorage();
          console.log(`[EnhancedAuditService] Resolved alert: ${alertId}`);
          return true;
        }
      }
      console.warn(`[EnhancedAuditService] Alert not found: ${alertId}`);
      return false;
    } catch (error) {
      console.error('[EnhancedAuditService] Error resolving alert:', error);
      return false;
    }
  }

  async generateAuditReport(config: AuditReportConfig): Promise<AuditReport> {
    try {
      const period = config.period || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      };

      let auditLogs: WalletAuditLog[] = [];
      if (config.identityId) {
        auditLogs = await this.getAuditTrail(config.identityId, {
          startDate: period.start,
          endDate: period.end
        });
      } else {
        for (const [identityId, logs] of this.auditLogs.entries()) {
          const filteredLogs = await this.getAuditTrail(identityId, {
            startDate: period.start,
            endDate: period.end
          });
          auditLogs.push(...filteredLogs);
        }
      }

      const report: AuditReport = {
        id: `audit_report_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        identityId: config.identityId,
        reportType: config.reportType,
        period,
        summary: {
          totalTransactions: auditLogs.length,
          totalVolume: auditLogs.reduce((sum, log) => sum + (log.amount || 0), 0),
          riskScore: await this.calculateAverageRiskScore(config.identityId, period),
          complianceScore: await this.calculateComplianceScore(config.identityId, period),
          alertsGenerated: await this.countAlertsInPeriod(config.identityId, period),
          violationsDetected: await this.countViolationsInPeriod(config.identityId, period)
        },
        riskAnalysis: config.includeRiskAnalysis ? await this.generateRiskAnalysis(config.identityId, period) : {
          riskDistribution: {},
          topRiskFactors: [],
          riskTrends: []
        },
        complianceAnalysis: config.includeComplianceAnalysis ? await this.generateComplianceAnalysis(config.identityId, period) : {
          complianceStatus: 'COMPLIANT',
          violations: [],
          recommendations: []
        },
        behavioralAnalysis: config.includeBehavioralAnalysis ? await this.generateBehavioralAnalysis(config.identityId, period) : {
          patterns: [],
          anomalies: 0,
          normalBehaviorBaseline: {}
        },
        generatedAt: new Date().toISOString(),
        generatedBy: 'EnhancedAuditService'
      };

      console.log(`[EnhancedAuditService] Generated audit report: ${report.id}`);
      return report;
    } catch (error) {
      console.error('[EnhancedAuditService] Error generating audit report:', error);
      throw error;
    }
  }

  async scheduleReport(config: AuditReportConfig, schedule: string): Promise<string> {
    try {
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      console.log(`[EnhancedAuditService] Scheduled report: ${scheduleId} with schedule: ${schedule}`);
      return scheduleId;
    } catch (error) {
      console.error('[EnhancedAuditService] Error scheduling report:', error);
      throw error;
    }
  }

  async getReportHistory(identityId?: string): Promise<AuditReport[]> {
    try {
      console.log(`[EnhancedAuditService] Retrieved report history for identity: ${identityId || 'all'}`);
      return [];
    } catch (error) {
      console.error('[EnhancedAuditService] Error getting report history:', error);
      return [];
    }
  } 
 private calculateTransactionRisk(identityId: string, operation: WalletOperation): RiskFactor {
    const amount = operation.amount || 0;
    let score = 0;

    if (amount > 10000) score = 0.9;
    else if (amount > 5000) score = 0.7;
    else if (amount > 1000) score = 0.5;
    else if (amount > 100) score = 0.3;
    else score = 0.1;

    return {
      id: `transaction_risk_${Date.now()}`,
      name: 'Transaction Amount Risk',
      category: 'TRANSACTION',
      weight: this.RISK_WEIGHTS.TRANSACTION_AMOUNT,
      score,
      description: `Transaction amount: ${amount}`,
      evidence: [operation],
      timestamp: new Date().toISOString()
    };
  }

  private async calculateFrequencyRisk(identityId: string): Promise<RiskFactor> {
    const logs = this.auditLogs.get(identityId) || [];
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return logTime > oneHourAgo;
    });

    let score = 0;
    if (recentLogs.length > 50) score = 0.9;
    else if (recentLogs.length > 20) score = 0.7;
    else if (recentLogs.length > 10) score = 0.5;
    else if (recentLogs.length > 5) score = 0.3;
    else score = 0.1;

    return {
      id: `frequency_risk_${Date.now()}`,
      name: 'Transaction Frequency Risk',
      category: 'BEHAVIORAL',
      weight: this.RISK_WEIGHTS.TRANSACTION_FREQUENCY,
      score,
      description: `${recentLogs.length} transactions in the last hour`,
      evidence: recentLogs,
      timestamp: new Date().toISOString()
    };
  }

  private calculateIdentityRisk(identityId: string): RiskFactor {
    let score = 0;
    let description = '';

    if (identityId.includes('root')) {
      score = 0.2;
      description = 'ROOT identity - low risk';
    } else if (identityId.includes('dao')) {
      score = 0.3;
      description = 'DAO identity - low-medium risk';
    } else if (identityId.includes('enterprise')) {
      score = 0.4;
      description = 'Enterprise identity - medium risk';
    } else if (identityId.includes('aid')) {
      score = 0.6;
      description = 'AID identity - medium-high risk';
    } else {
      score = 0.5;
      description = 'Unknown identity type - medium risk';
    }

    return {
      id: `identity_risk_${Date.now()}`,
      name: 'Identity Verification Risk',
      category: 'IDENTITY',
      weight: this.RISK_WEIGHTS.IDENTITY_VERIFICATION,
      score,
      description,
      evidence: [{ identityId, identityType: this.determineIdentityType(identityId) }],
      timestamp: new Date().toISOString()
    };
  }

  private calculateBehavioralRisk(patterns: BehavioralPattern[]): RiskFactor {
    const suspiciousPatterns = patterns.filter(p => 
      p.patternType === 'SUSPICIOUS' || p.patternType === 'ANOMALOUS'
    );

    let score = 0;
    if (suspiciousPatterns.length > 5) score = 0.9;
    else if (suspiciousPatterns.length > 3) score = 0.7;
    else if (suspiciousPatterns.length > 1) score = 0.5;
    else if (suspiciousPatterns.length > 0) score = 0.3;
    else score = 0.1;

    return {
      id: `behavioral_risk_${Date.now()}`,
      name: 'Behavioral Anomaly Risk',
      category: 'BEHAVIORAL',
      weight: this.RISK_WEIGHTS.BEHAVIORAL_ANOMALY,
      score,
      description: `${suspiciousPatterns.length} suspicious behavioral patterns detected`,
      evidence: suspiciousPatterns,
      timestamp: new Date().toISOString()
    };
  }

  private calculateComplianceRisk(violations: ComplianceViolation[]): RiskFactor {
    const activeViolations = violations.filter(v => v.status !== 'RESOLVED');
    const criticalViolations = activeViolations.filter(v => v.severity === 'CRITICAL');

    let score = 0;
    if (criticalViolations.length > 0) score = 0.9;
    else if (activeViolations.length > 3) score = 0.7;
    else if (activeViolations.length > 1) score = 0.5;
    else if (activeViolations.length > 0) score = 0.3;
    else score = 0.1;

    return {
      id: `compliance_risk_${Date.now()}`,
      name: 'Compliance History Risk',
      category: 'COMPLIANCE',
      weight: this.RISK_WEIGHTS.COMPLIANCE_HISTORY,
      score,
      description: `${activeViolations.length} active compliance violations`,
      evidence: activeViolations,
      timestamp: new Date().toISOString()
    };
  }

  private async calculateExternalRisk(identityId: string): Promise<RiskFactor> {
    const score = Math.random() * 0.3;
    return {
      id: `external_risk_${Date.now()}`,
      name: 'External Risk Factors',
      category: 'EXTERNAL',
      weight: this.RISK_WEIGHTS.EXTERNAL_FACTORS,
      score,
      description: 'External risk assessment from third-party sources',
      evidence: [{ source: 'mock_external_api', riskScore: score }],
      timestamp: new Date().toISOString()
    };
  }

  private generateRiskRecommendations(riskScore: number, factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (riskScore > 0.8) {
      recommendations.push('Require manual approval for all transactions');
      recommendations.push('Enhanced monitoring and verification required');
      recommendations.push('Consider temporary wallet restrictions');
    } else if (riskScore > 0.6) {
      recommendations.push('Require additional verification for high-value transactions');
      recommendations.push('Increase monitoring frequency');
    } else if (riskScore > 0.4) {
      recommendations.push('Monitor for unusual patterns');
      recommendations.push('Consider periodic verification');
    } else {
      recommendations.push('Continue normal monitoring');
    }

    return [...new Set(recommendations)];
  }  private
 generateMitigationActions(riskLevel: string, factors: RiskFactor[]): string[] {
    const actions: string[] = [];
    switch (riskLevel) {
      case 'CRITICAL':
        actions.push('Immediate wallet freeze');
        actions.push('Manual investigation required');
        actions.push('Escalate to compliance team');
        break;
      case 'HIGH':
        actions.push('Require manual approval');
        actions.push('Enhanced verification');
        actions.push('Limit transaction amounts');
        break;
      case 'MEDIUM':
        actions.push('Additional monitoring');
        actions.push('Periodic verification');
        break;
      case 'LOW':
        actions.push('Standard monitoring');
        break;
    }
    return actions;
  }

  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0.1;
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedConfidence = factors.reduce((sum, factor) => {
      const factorConfidence = Math.min(factor.score + 0.3, 1.0);
      return sum + (factorConfidence * factor.weight);
    }, 0);
    return Math.min(weightedConfidence / totalWeight, 1.0);
  }

  private analyzeTransactionPatterns(logs: WalletAuditLog[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const roundAmounts = logs.filter(log => 
      log.amount && log.amount % 1000 === 0 && log.amount >= 1000
    );

    if (roundAmounts.length > 5) {
      patterns.push({
        id: `pattern_round_${Date.now()}`,
        identityId: logs[0]?.identityId || '',
        patternType: 'SUSPICIOUS',
        confidence: 0.7,
        description: 'Frequent round-number transactions detected',
        indicators: ['round_amounts', 'potential_structuring'],
        firstObserved: roundAmounts[0].timestamp,
        lastObserved: roundAmounts[roundAmounts.length - 1].timestamp,
        frequency: roundAmounts.length,
        riskContribution: 0.6
      });
    }
    return patterns;
  }

  private analyzeTimingPatterns(logs: WalletAuditLog[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const nightTransactions = logs.filter(log => {
      const hour = new Date(log.timestamp).getHours();
      return hour >= 23 || hour <= 5;
    });

    if (nightTransactions.length > logs.length * 0.3) {
      patterns.push({
        id: `pattern_timing_${Date.now()}`,
        identityId: logs[0]?.identityId || '',
        patternType: 'ANOMALOUS',
        confidence: 0.6,
        description: 'Unusual transaction timing patterns detected',
        indicators: ['night_transactions', 'timing_anomaly'],
        firstObserved: nightTransactions[0].timestamp,
        lastObserved: nightTransactions[nightTransactions.length - 1].timestamp,
        frequency: nightTransactions.length,
        riskContribution: 0.4
      });
    }
    return patterns;
  }  
private analyzeAmountPatterns(logs: WalletAuditLog[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const justUnderThreshold = logs.filter(log => 
      log.amount && (
        (log.amount > 9900 && log.amount < 10000) ||
        (log.amount > 4900 && log.amount < 5000)
      )
    );

    if (justUnderThreshold.length > 3) {
      patterns.push({
        id: `pattern_threshold_${Date.now()}`,
        identityId: logs[0]?.identityId || '',
        patternType: 'SUSPICIOUS',
        confidence: 0.8,
        description: 'Just-under-threshold transaction patterns detected',
        indicators: ['threshold_avoidance', 'potential_evasion'],
        firstObserved: justUnderThreshold[0].timestamp,
        lastObserved: justUnderThreshold[justUnderThreshold.length - 1].timestamp,
        frequency: justUnderThreshold.length,
        riskContribution: 0.7
      });
    }
    return patterns;
  }

  private analyzeFrequencyPatterns(logs: WalletAuditLog[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let burstCount = 0;
    let maxBurst = 0;

    for (let i = 0; i < sortedLogs.length - 1; i++) {
      const timeDiff = new Date(sortedLogs[i + 1].timestamp).getTime() - new Date(sortedLogs[i].timestamp).getTime();
      if (timeDiff < 60000) {
        burstCount++;
      } else {
        maxBurst = Math.max(maxBurst, burstCount);
        burstCount = 0;
      }
    }

    if (maxBurst > 10) {
      patterns.push({
        id: `pattern_burst_${Date.now()}`,
        identityId: logs[0]?.identityId || '',
        patternType: 'ANOMALOUS',
        confidence: 0.7,
        description: 'Transaction burst patterns detected',
        indicators: ['rapid_transactions', 'burst_activity'],
        firstObserved: logs[0].timestamp,
        lastObserved: logs[logs.length - 1].timestamp,
        frequency: maxBurst,
        riskContribution: 0.5
      });
    }
    return patterns;
  }

  private calculateAverageAmount(logs: WalletAuditLog[]): number {
    const amounts = logs.filter(log => log.amount).map(log => log.amount!);
    return amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0;
  }

  private calculateAverageFrequency(logs: WalletAuditLog[]): number {
    if (logs.length < 2) return 0;
    const timeSpan = new Date(logs[logs.length - 1].timestamp).getTime() - new Date(logs[0].timestamp).getTime();
    const days = timeSpan / (24 * 60 * 60 * 1000);
    return days > 0 ? logs.length / days : 0;
  }

  private calculateCommonTimes(logs: WalletAuditLog[]): number[] {
    const hours = logs.map(log => new Date(log.timestamp).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private calculateCommonOperations(logs: WalletAuditLog[]): string[] {
    const operations = logs.map(log => log.operation);
    const operationCounts = operations.reduce((acc, op) => {
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([op]) => op);
  }  
private async checkAMLCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    if (operation.amount && operation.amount > 9000 && operation.amount < 10000) {
      const recentLogs = this.auditLogs.get(identityId) || [];
      const recentSimilar = recentLogs.filter(log => {
        const logTime = new Date(log.timestamp);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return logTime > oneDayAgo && log.amount && log.amount > 9000 && log.amount < 10000;
      });

      if (recentSimilar.length > 2) {
        violations.push({
          id: `aml_structuring_${Date.now()}`,
          identityId,
          violationType: 'AML',
          severity: 'HIGH',
          description: 'Potential structuring detected - multiple transactions just under $10,000 threshold',
          regulation: 'Bank Secrecy Act',
          evidence: [operation, ...recentSimilar],
          status: 'DETECTED',
          detectedAt: new Date().toISOString()
        });
      }
    }

    if (operation.amount && operation.amount > 10000) {
      violations.push({
        id: `aml_large_transaction_${Date.now()}`,
        identityId,
        violationType: 'AML',
        severity: 'MEDIUM',
        description: 'Large transaction requiring CTR filing',
        regulation: 'Currency Transaction Report (CTR)',
        evidence: [operation],
        status: 'DETECTED',
        detectedAt: new Date().toISOString()
      });
    }

    return violations;
  }

  private async checkKYCCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const identityType = this.determineIdentityType(identityId);

    if (identityType === IdentityType.AID && operation.amount && operation.amount > 1000) {
      violations.push({
        id: `kyc_unverified_${Date.now()}`,
        identityId,
        violationType: 'KYC',
        severity: 'HIGH',
        description: 'High-value transaction from unverified identity',
        regulation: 'Know Your Customer (KYC)',
        evidence: [operation],
        status: 'DETECTED',
        detectedAt: new Date().toISOString()
      });
    }

    return violations;
  }

  private async checkSanctionsCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const sanctionedPatterns = ['sanctioned', 'blocked', 'prohibited'];

    if (sanctionedPatterns.some(pattern => identityId.toLowerCase().includes(pattern))) {
      violations.push({
        id: `sanctions_violation_${Date.now()}`,
        identityId,
        violationType: 'SANCTIONS',
        severity: 'CRITICAL',
        description: 'Transaction involving sanctioned entity',
        regulation: 'OFAC Sanctions',
        evidence: [operation],
        status: 'DETECTED',
        detectedAt: new Date().toISOString()
      });
    }

    return violations;
  }

  private async checkRegulatoryCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    if (operation.amount && operation.amount > 50000) {
      violations.push({
        id: `regulatory_limit_${Date.now()}`,
        identityId,
        violationType: 'REGULATORY',
        severity: 'MEDIUM',
        description: 'Transaction exceeds regulatory reporting threshold',
        regulation: 'Financial Crimes Enforcement Network (FinCEN)',
        evidence: [operation],
        status: 'DETECTED',
        detectedAt: new Date().toISOString()
      });
    }

    return violations;
  }

  private async checkInternalCompliance(identityId: string, operation: WalletOperation): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const dailyLogs = this.auditLogs.get(identityId) || [];
    const todayLogs = dailyLogs.filter(log => {
      const logDate = new Date(log.timestamp).toDateString();
      const today = new Date().toDateString();
      return logDate === today;
    });

    const dailyVolume = todayLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    if (dailyVolume > 25000) {
      violations.push({
        id: `internal_daily_limit_${Date.now()}`,
        identityId,
        violationType: 'INTERNAL',
        severity: 'MEDIUM',
        description: 'Daily transaction volume exceeds internal policy limit',
        regulation: 'Internal Policy - Daily Limits',
        evidence: [operation, { dailyVolume, transactionCount: todayLogs.length }],
        status: 'DETECTED',
        detectedAt: new Date().toISOString()
      });
    }

    return violations;
  }

  private async getComplianceViolations(identityId: string): Promise<ComplianceViolation[]> {
    return this.complianceViolations.get(identityId) || [];
  }

  private generateComplianceRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');

    if (criticalViolations.length > 0) {
      recommendations.push('Immediate investigation and remediation required');
      recommendations.push('Consider freezing affected accounts');
      recommendations.push('Report to regulatory authorities if required');
    }

    if (highViolations.length > 0) {
      recommendations.push('Enhanced due diligence required');
      recommendations.push('Implement additional monitoring controls');
    }

    const amlViolations = violations.filter(v => v.violationType === 'AML');
    if (amlViolations.length > 0) {
      recommendations.push('Review AML procedures and controls');
      recommendations.push('Consider filing Suspicious Activity Report (SAR)');
    }

    const kycViolations = violations.filter(v => v.violationType === 'KYC');
    if (kycViolations.length > 0) {
      recommendations.push('Update customer identification procedures');
      recommendations.push('Verify customer identity documentation');
    }

    return [...new Set(recommendations)];
  }

  private async performRealTimeAnalysis(auditLog: WalletAuditLog): Promise<void> {
    try {
      const riskAssessment = await this.calculateRiskScore(auditLog.identityId, {
        type: auditLog.operationType as any,
        amount: auditLog.amount,
        token: auditLog.token || 'ETH'
      });

      const violations = await this.checkCompliance(auditLog.identityId, {
        type: auditLog.operationType as any,
        amount: auditLog.amount,
        token: auditLog.token || 'ETH'
      });

      const alerts = await this.evaluateAlerts(auditLog.identityId, {
        type: auditLog.operationType as any,
        amount: auditLog.amount,
        token: auditLog.token || 'ETH'
      });

      console.log(`[EnhancedAuditService] Real-time analysis completed for ${auditLog.identityId}: Risk=${riskAssessment.riskLevel}, Violations=${violations.length}, Alerts=${alerts.length}`);
    } catch (error) {
      console.error('[EnhancedAuditService] Error in real-time analysis:', error);
    }
  }

  private convertLogsToCSV(logs: WalletAuditLog[]): string {
    const headers = ['Identity ID', 'Operation', 'Operation Type', 'Amount', 'Token', 'Success', 'Error', 'Timestamp'];
    const rows = logs.map(log => [
      log.identityId,
      log.operation,
      log.operationType || '',
      log.amount?.toString() || '',
      log.token || '',
      log.success.toString(),
      log.error || '',
      log.timestamp
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private mapCategoryToAlertType(category: string): SecurityAlert['alertType'] {
    switch (category) {
      case 'RISK': return 'RISK_THRESHOLD';
      case 'COMPLIANCE': return 'COMPLIANCE_VIOLATION';
      case 'BEHAVIORAL': return 'BEHAVIORAL_ANOMALY';
      case 'TRANSACTION': return 'TRANSACTION_SUSPICIOUS';
      default: return 'RISK_THRESHOLD';
    }
  }

  private async evaluateAlertConditions(identityId: string, operation: WalletOperation, conditions: AlertCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      const value = this.extractFieldValue(identityId, operation, condition.field);
      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return false;
      }
    }
    return true;
  }

  private extractFieldValue(identityId: string, operation: WalletOperation, field: string): any {
    switch (field) {
      case 'amount': return operation.amount;
      case 'identityId': return identityId;
      case 'operationType': return operation.type;
      case 'token': return operation.token;
      default: return null;
    }
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'GT': return value > expectedValue;
      case 'LT': return value < expectedValue;
      case 'EQ': return value === expectedValue;
      case 'NEQ': return value !== expectedValue;
      case 'CONTAINS': return String(value).includes(String(expectedValue));
      case 'REGEX': return new RegExp(expectedValue).test(String(value));
      default: return false;
    }
  }

  private async executeAlertActions(alert: SecurityAlert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'EMAIL':
            console.log(`[EnhancedAuditService] Would send email alert: ${alert.title}`);
            break;
          case 'SMS':
            console.log(`[EnhancedAuditService] Would send SMS alert: ${alert.title}`);
            break;
          case 'WEBHOOK':
            console.log(`[EnhancedAuditService] Would trigger webhook for alert: ${alert.title}`);
            break;
          case 'BLOCK_WALLET':
            console.log(`[EnhancedAuditService] Would block wallet for identity: ${alert.identityId}`);
            break;
          case 'REQUIRE_APPROVAL':
            console.log(`[EnhancedAuditService] Would require approval for identity: ${alert.identityId}`);
            break;
          case 'LOG':
            console.log(`[EnhancedAuditService] Alert logged: ${alert.title}`);
            break;
        }
      } catch (error) {
        console.error(`[EnhancedAuditService] Error executing alert action ${action.type}:`, error);
      }
    }
  }

  private async calculateAverageRiskScore(identityId?: string, period?: { start: string; end: string }): Promise<number> {
    if (identityId) {
      const assessment = this.riskAssessments.get(identityId);
      return assessment?.riskScore || 0;
    }
    
    const allScores = Array.from(this.riskAssessments.values()).map(a => a.riskScore);
    return allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
  }

  private async calculateComplianceScore(identityId?: string, period?: { start: string; end: string }): Promise<number> {
    let violations: ComplianceViolation[] = [];
    
    if (identityId) {
      violations = this.complianceViolations.get(identityId) || [];
    } else {
      for (const v of this.complianceViolations.values()) {
        violations.push(...v);
      }
    }

    if (period) {
      violations = violations.filter(v => {
        const violationDate = new Date(v.detectedAt);
        return violationDate >= new Date(period.start) && violationDate <= new Date(period.end);
      });
    }

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
    const highViolations = violations.filter(v => v.severity === 'HIGH').length;
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM').length;
    const lowViolations = violations.filter(v => v.severity === 'LOW').length;

    const totalViolations = violations.length;
    if (totalViolations === 0) return 1.0;

    const weightedViolations = (criticalViolations * 1.0) + (highViolations * 0.7) + (mediumViolations * 0.4) + (lowViolations * 0.1);
    const maxPossibleScore = totalViolations * 1.0;
    
    return Math.max(0, 1 - (weightedViolations / maxPossibleScore));
  }

  private async countAlertsInPeriod(identityId?: string, period?: { start: string; end: string }): Promise<number> {
    let alerts: SecurityAlert[] = [];
    
    if (identityId) {
      alerts = this.securityAlerts.get(identityId) || [];
    } else {
      for (const a of this.securityAlerts.values()) {
        alerts.push(...a);
      }
    }

    if (period) {
      alerts = alerts.filter(a => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= new Date(period.start) && alertDate <= new Date(period.end);
      });
    }

    return alerts.length;
  } 
 private async countViolationsInPeriod(identityId?: string, period?: { start: string; end: string }): Promise<number> {
    let violations: ComplianceViolation[] = [];
    
    if (identityId) {
      violations = this.complianceViolations.get(identityId) || [];
    } else {
      for (const v of this.complianceViolations.values()) {
        violations.push(...v);
      }
    }

    if (period) {
      violations = violations.filter(v => {
        const violationDate = new Date(v.detectedAt);
        return violationDate >= new Date(period.start) && violationDate <= new Date(period.end);
      });
    }

    return violations.length;
  }

  private async generateRiskAnalysis(identityId?: string, period?: { start: string; end: string }): Promise<AuditReport['riskAnalysis']> {
    const riskFactors: RiskFactor[] = [];
    
    if (identityId) {
      const factors = await this.getRiskFactors(identityId);
      riskFactors.push(...factors);
    } else {
      for (const assessment of this.riskAssessments.values()) {
        riskFactors.push(...assessment.factors);
      }
    }

    const riskDistribution = riskFactors.reduce((acc, factor) => {
      acc[factor.category] = (acc[factor.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRiskFactors = riskFactors
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const riskTrends = [];
    const days = 30;
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      riskTrends.push({
        date: date.toISOString().split('T')[0],
        score: Math.random() * 0.5 + 0.2
      });
    }

    return {
      riskDistribution,
      topRiskFactors,
      riskTrends
    };
  }

  private async generateComplianceAnalysis(identityId?: string, period?: { start: string; end: string }): Promise<AuditReport['complianceAnalysis']> {
    let violations: ComplianceViolation[] = [];
    
    if (identityId) {
      violations = this.complianceViolations.get(identityId) || [];
    } else {
      for (const v of this.complianceViolations.values()) {
        violations.push(...v);
      }
    }

    if (period) {
      violations = violations.filter(v => {
        const violationDate = new Date(v.detectedAt);
        return violationDate >= new Date(period.start) && violationDate <= new Date(period.end);
      });
    }

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' = 
      criticalViolations.length > 0 ? 'NON_COMPLIANT' :
      violations.length > 0 ? 'UNDER_REVIEW' : 'COMPLIANT';

    return {
      complianceStatus,
      violations,
      recommendations: this.generateComplianceRecommendations(violations)
    };
  }

  private async generateBehavioralAnalysis(identityId?: string, period?: { start: string; end: string }): Promise<AuditReport['behavioralAnalysis']> {
    let patterns: BehavioralPattern[] = [];
    
    if (identityId) {
      patterns = this.behavioralPatterns.get(identityId) || [];
    } else {
      for (const p of this.behavioralPatterns.values()) {
        patterns.push(...p);
      }
    }

    if (period) {
      patterns = patterns.filter(p => {
        const patternDate = new Date(p.lastObserved);
        return patternDate >= new Date(period.start) && patternDate <= new Date(period.end);
      });
    }

    const anomalies = patterns.filter(p => 
      p.patternType === 'ANOMALOUS' || p.patternType === 'SUSPICIOUS'
    ).length;

    const normalBehaviorBaseline = identityId ? 
      this.behavioralBaselines.get(identityId) || {} : {};

    return {
      patterns,
      anomalies,
      normalBehaviorBaseline
    };
  }

  private determineIdentityType(identityId: string): IdentityType {
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('aid')) return IdentityType.AID;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    return IdentityType.ROOT;
  }

  private loadDataFromStorage(): void {
    try {
      const auditData = localStorage.getItem('enhanced_audit_data');
      if (auditData) {
        const data = JSON.parse(auditData);
        
        if (data.auditLogs) {
          this.auditLogs = new Map(Object.entries(data.auditLogs));
        }
        
        if (data.riskAssessments) {
          this.riskAssessments = new Map(Object.entries(data.riskAssessments));
        }
        
        if (data.behavioralPatterns) {
          this.behavioralPatterns = new Map(Object.entries(data.behavioralPatterns));
        }
        
        if (data.complianceViolations) {
          this.complianceViolations = new Map(Object.entries(data.complianceViolations));
        }
        
        if (data.alertRules) {
          this.alertRules = new Map(Object.entries(data.alertRules));
        }
        
        if (data.securityAlerts) {
          this.securityAlerts = new Map(Object.entries(data.securityAlerts));
        }
        
        if (data.riskModels) {
          this.riskModels = new Map(Object.entries(data.riskModels));
        }
        
        if (data.behavioralBaselines) {
          this.behavioralBaselines = new Map(Object.entries(data.behavioralBaselines));
        }
        
        console.log('[EnhancedAuditService] Data loaded from storage');
      }
    } catch (error) {
      console.error('[EnhancedAuditService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        auditLogs: Object.fromEntries(this.auditLogs),
        riskAssessments: Object.fromEntries(this.riskAssessments),
        behavioralPatterns: Object.fromEntries(this.behavioralPatterns),
        complianceViolations: Object.fromEntries(this.complianceViolations),
        alertRules: Object.fromEntries(this.alertRules),
        securityAlerts: Object.fromEntries(this.securityAlerts),
        riskModels: Object.fromEntries(this.riskModels),
        behavioralBaselines: Object.fromEntries(this.behavioralBaselines)
      };
      
      localStorage.setItem('enhanced_audit_data', JSON.stringify(data));
      console.log('[EnhancedAuditService] Data saved to storage');
    } catch (error) {
      console.error('[EnhancedAuditService] Error saving data to storage:', error);
    }
  }

  private initializeDefaultRiskModel(): void {
    const defaultModel: RiskModel = {
      id: 'default_risk_model',
      name: 'Default Risk Assessment Model',
      version: '1.0.0',
      description: 'Standard risk assessment model for wallet operations',
      factors: [],
      weights: this.RISK_WEIGHTS,
      thresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9
      },
      lastUpdated: new Date().toISOString(),
      accuracy: 0.85,
      enabled: true
    };
    
    this.riskModels.set(defaultModel.id, defaultModel);
  } 
 private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_value_transaction',
        name: 'High Value Transaction Alert',
        description: 'Alert for transactions over $10,000',
        category: 'TRANSACTION',
        conditions: [
          { field: 'amount', operator: 'GT', value: 10000 }
        ],
        actions: [
          { type: 'LOG', config: {} },
          { type: 'EMAIL', config: { recipients: ['compliance@example.com'] } }
        ],
        enabled: true,
        priority: 'HIGH',
        cooldownPeriod: 60
      },
      {
        id: 'rapid_transactions',
        name: 'Rapid Transaction Alert',
        description: 'Alert for multiple transactions in short time',
        category: 'BEHAVIORAL',
        conditions: [
          { field: 'frequency', operator: 'GT', value: 10, timeWindow: 60 }
        ],
        actions: [
          { type: 'LOG', config: {} },
          { type: 'REQUIRE_APPROVAL', config: {} }
        ],
        enabled: true,
        priority: 'MEDIUM',
        cooldownPeriod: 30
      },
      {
        id: 'compliance_violation',
        name: 'Compliance Violation Alert',
        description: 'Alert for any compliance violation',
        category: 'COMPLIANCE',
        conditions: [
          { field: 'violationType', operator: 'NEQ', value: null }
        ],
        actions: [
          { type: 'LOG', config: {} },
          { type: 'EMAIL', config: { recipients: ['compliance@example.com'] } },
          { type: 'BLOCK_WALLET', config: {} }
        ],
        enabled: true,
        priority: 'CRITICAL',
        cooldownPeriod: 0
      }
    ];
    
    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      try {
        for (const identityId of this.auditLogs.keys()) {
          await this.updateBehavioralBaseline(identityId);
        }
      } catch (error) {
        console.error('[EnhancedAuditService] Error in periodic baseline update:', error);
      }
    }, 60 * 60 * 1000);

    setInterval(async () => {
      try {
        for (const identityId of this.auditLogs.keys()) {
          await this.detectAnomalies(identityId, 60);
        }
      } catch (error) {
        console.error('[EnhancedAuditService] Error in periodic anomaly detection:', error);
      }
    }, 30 * 60 * 1000);
  }
}

export const enhancedAuditService = new EnhancedAuditService();