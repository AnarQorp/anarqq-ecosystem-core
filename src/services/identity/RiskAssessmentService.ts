/**
 * Enhanced Risk Assessment and Audit System
 * Provides comprehensive risk assessment, suspicious activity detection,
 * audit logging, and compliance reporting for wallet operations
 */

import { IdentityType } from '../../types/identity';
import { 
  WalletAuditLog, 
  RiskAssessment, 
  RiskFactor, 
  AutoAction,
  ComplianceReport,
  DateRange 
} from '../../types/wallet-config';

// Enhanced risk assessment interfaces
export interface SuspiciousActivityPattern {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectionRules: DetectionRule[];
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
}

export interface DetectionRule {
  type: 'VELOCITY' | 'AMOUNT' | 'FREQUENCY' | 'PATTERN' | 'DEVICE' | 'LOCATION' | 'TIME';
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CONTAINS' | 'PATTERN_MATCH';
  value: any;
  weight: number; // 0-1, contribution to overall risk score
}

export interface ReputationScore {
  identityId: string;
  score: number; // 0-1000
  tier: 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED' | 'BLOCKED';
  factors: ReputationFactor[];
  lastUpdated: string;
  history: ReputationHistory[];
}

export interface ReputationFactor {
  type: 'TRANSACTION_HISTORY' | 'DAO_ENDORSEMENTS' | 'COMPLIANCE_RECORD' | 'SECURITY_INCIDENTS' | 'COMMUNITY_FEEDBACK';
  impact: number; // -100 to +100
  description: string;
  weight: number;
  lastUpdated: string;
}

export interface ReputationHistory {
  timestamp: string;
  score: number;
  change: number;
  reason: string;
  triggeredBy: string;
}

export interface AuditEvent {
  id: string;
  identityId: string;
  eventType: 'TRANSACTION' | 'CONFIG_CHANGE' | 'SECURITY_ALERT' | 'COMPLIANCE_VIOLATION' | 'SYSTEM_EVENT';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
  description: string;
  metadata: Record<string, any>;
  qerberosLogId?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ComplianceViolation {
  id: string;
  identityId: string;
  violationType: 'LIMIT_EXCEEDED' | 'UNAUTHORIZED_OPERATION' | 'SUSPICIOUS_ACTIVITY' | 'POLICY_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: string;
  relatedTransactions: string[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface RiskAssessmentServiceInterface {
  // Risk Assessment
  assessRisk(identityId: string, operation?: any): Promise<RiskAssessment>;
  updateRiskFactors(identityId: string, factors: RiskFactor[]): Promise<boolean>;
  calculateRiskScore(identityId: string): Promise<number>;
  
  // Suspicious Activity Detection
  detectSuspiciousActivity(identityId: string, operation: any): Promise<SuspiciousActivityPattern[]>;
  addDetectionPattern(pattern: SuspiciousActivityPattern): Promise<boolean>;
  updateDetectionPattern(patternId: string, updates: Partial<SuspiciousActivityPattern>): Promise<boolean>;
  
  // Reputation Management
  getReputationScore(identityId: string): Promise<ReputationScore>;
  updateReputationScore(identityId: string, change: number, reason: string): Promise<boolean>;
  calculateReputationScore(identityId: string): Promise<number>;
  
  // Audit Logging
  logAuditEvent(event: AuditEvent): Promise<string>;
  getAuditEvents(identityId: string, filters?: AuditEventFilters): Promise<AuditEvent[]>;
  exportAuditLogs(identityId: string, period: DateRange, format: 'JSON' | 'CSV' | 'PDF'): Promise<string>;
  
  // Compliance
  checkCompliance(identityId: string): Promise<ComplianceViolation[]>;
  generateComplianceReport(identityId: string, period: DateRange): Promise<ComplianceReport>;
  reportViolation(violation: ComplianceViolation): Promise<string>;
  
  // Auto Actions
  executeAutoAction(identityId: string, action: AutoAction): Promise<boolean>;
  getRecommendedActions(identityId: string): Promise<AutoAction[]>;
}

export interface AuditEventFilters {
  eventTypes?: string[];
  severities?: string[];
  startDate?: string;
  endDate?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}

export class RiskAssessmentService implements RiskAssessmentServiceInterface {
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private reputationScores: Map<string, ReputationScore> = new Map();
  private auditEvents: Map<string, AuditEvent[]> = new Map();
  private detectionPatterns: Map<string, SuspiciousActivityPattern> = new Map();
  private complianceViolations: Map<string, ComplianceViolation[]> = new Map();
  
  constructor() {
    this.loadDataFromStorage();
    this.initializeDefaultPatterns();
  }

  // Risk Assessment Methods
  async assessRisk(identityId: string, operation?: any): Promise<RiskAssessment> {
    try {
      const riskFactors = await this.calculateRiskFactors(identityId, operation);
      const overallRisk = this.determineOverallRisk(riskFactors);
      const recommendations = await this.generateRecommendations(identityId, riskFactors);
      const autoActions = await this.getRecommendedActions(identityId);
      
      // Get reputation data
      const reputation = await this.getReputationScore(identityId);
      
      const assessment: RiskAssessment = {
        identityId,
        overallRisk,
        riskFactors,
        recommendations,
        lastAssessment: new Date().toISOString(),
        nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        autoActions,
        reputationScore: reputation.score,
        reputationTier: reputation.tier,
        trustedByDAOs: await this.getTrustedDAOs(identityId)
      };

      this.riskAssessments.set(identityId, assessment);
      await this.saveDataToStorage();

      // Log risk assessment
      await this.logAuditEvent({
        id: this.generateId(),
        identityId,
        eventType: 'SYSTEM_EVENT',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: `Risk assessment completed: ${overallRisk} risk`,
        metadata: {
          overallRisk,
          riskFactorCount: riskFactors.length,
          reputationScore: reputation.score,
          operation: operation ? operation.type : 'GENERAL_ASSESSMENT'
        },
        resolved: true
      });

      return assessment;
    } catch (error) {
      console.error('[RiskAssessmentService] Error assessing risk:', error);
      throw error;
    }
  }

  async updateRiskFactors(identityId: string, factors: RiskFactor[]): Promise<boolean> {
    try {
      const assessment = this.riskAssessments.get(identityId) || await this.assessRisk(identityId);
      assessment.riskFactors = factors;
      assessment.lastAssessment = new Date().toISOString();
      assessment.overallRisk = this.determineOverallRisk(factors);
      
      this.riskAssessments.set(identityId, assessment);
      await this.saveDataToStorage();
      
      console.log(`[RiskAssessmentService] Updated risk factors for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[RiskAssessmentService] Error updating risk factors:', error);
      return false;
    }
  }

  async calculateRiskScore(identityId: string): Promise<number> {
    const assessment = await this.assessRisk(identityId);
    return assessment.riskFactors.reduce((score, factor) => {
      const severityWeight = { LOW: 0.1, MEDIUM: 0.3, HIGH: 0.6, CRITICAL: 1.0 };
      return score + (factor.value / factor.threshold) * severityWeight[factor.severity];
    }, 0);
  }

  // Suspicious Activity Detection
  async detectSuspiciousActivity(identityId: string, operation: any): Promise<SuspiciousActivityPattern[]> {
    const detectedPatterns: SuspiciousActivityPattern[] = [];
    
    for (const [patternId, pattern] of this.detectionPatterns) {
      if (!pattern.enabled) continue;
      
      const isMatch = await this.evaluateDetectionPattern(identityId, operation, pattern);
      if (isMatch) {
        detectedPatterns.push(pattern);
        
        // Log suspicious activity detection
        await this.logAuditEvent({
          id: this.generateId(),
          identityId,
          eventType: 'SECURITY_ALERT',
          severity: pattern.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          timestamp: new Date().toISOString(),
          description: `Suspicious activity detected: ${pattern.name}`,
          metadata: {
            patternId,
            patternName: pattern.name,
            operation,
            threshold: pattern.threshold
          },
          resolved: false
        });
      }
    }
    
    return detectedPatterns;
  }

  async addDetectionPattern(pattern: SuspiciousActivityPattern): Promise<boolean> {
    try {
      this.detectionPatterns.set(pattern.id, pattern);
      await this.saveDataToStorage();
      
      console.log(`[RiskAssessmentService] Added detection pattern: ${pattern.name}`);
      return true;
    } catch (error) {
      console.error('[RiskAssessmentService] Error adding detection pattern:', error);
      return false;
    }
  }

  async updateDetectionPattern(patternId: string, updates: Partial<SuspiciousActivityPattern>): Promise<boolean> {
    try {
      const pattern = this.detectionPatterns.get(patternId);
      if (!pattern) return false;
      
      const updatedPattern = { ...pattern, ...updates };
      this.detectionPatterns.set(patternId, updatedPattern);
      await this.saveDataToStorage();
      
      console.log(`[RiskAssessmentService] Updated detection pattern: ${patternId}`);
      return true;
    } catch (error) {
      console.error('[RiskAssessmentService] Error updating detection pattern:', error);
      return false;
    }
  }

  // Reputation Management
  async getReputationScore(identityId: string): Promise<ReputationScore> {
    let reputation = this.reputationScores.get(identityId);
    
    if (!reputation) {
      reputation = await this.calculateInitialReputation(identityId);
      this.reputationScores.set(identityId, reputation);
      await this.saveDataToStorage();
    }
    
    return reputation;
  }

  async updateReputationScore(identityId: string, change: number, reason: string): Promise<boolean> {
    try {
      const reputation = await this.getReputationScore(identityId);
      const oldScore = reputation.score;
      reputation.score = Math.max(0, Math.min(1000, reputation.score + change));
      reputation.tier = this.calculateReputationTier(reputation.score);
      reputation.lastUpdated = new Date().toISOString();
      
      // Add to history
      reputation.history.push({
        timestamp: new Date().toISOString(),
        score: reputation.score,
        change,
        reason,
        triggeredBy: 'SYSTEM'
      });
      
      // Keep only last 100 history entries
      if (reputation.history.length > 100) {
        reputation.history = reputation.history.slice(-100);
      }
      
      this.reputationScores.set(identityId, reputation);
      await this.saveDataToStorage();
      
      // Log reputation change
      await this.logAuditEvent({
        id: this.generateId(),
        identityId,
        eventType: 'SYSTEM_EVENT',
        severity: change < 0 ? 'WARNING' : 'INFO',
        timestamp: new Date().toISOString(),
        description: `Reputation score changed: ${oldScore} → ${reputation.score}`,
        metadata: {
          oldScore,
          newScore: reputation.score,
          change,
          reason,
          tier: reputation.tier
        },
        resolved: true
      });
      
      console.log(`[RiskAssessmentService] Updated reputation for ${identityId}: ${oldScore} → ${reputation.score}`);
      return true;
    } catch (error) {
      console.error('[RiskAssessmentService] Error updating reputation score:', error);
      return false;
    }
  }

  async calculateReputationScore(identityId: string): Promise<number> {
    const reputation = await this.getReputationScore(identityId);
    return reputation.score;
  }

  // Audit Logging
  async logAuditEvent(event: AuditEvent): Promise<string> {
    try {
      const events = this.auditEvents.get(event.identityId) || [];
      events.push(event);
      this.auditEvents.set(event.identityId, events);
      await this.saveDataToStorage();
      
      // Integrate with Qerberos if available
      if (event.eventType === 'SECURITY_ALERT' || event.severity === 'CRITICAL') {
        await this.integrateWithQerberos(event);
      }
      
      console.log(`[RiskAssessmentService] Logged audit event: ${event.eventType} for ${event.identityId}`);
      return event.id;
    } catch (error) {
      console.error('[RiskAssessmentService] Error logging audit event:', error);
      throw error;
    }
  }

  async getAuditEvents(identityId: string, filters?: AuditEventFilters): Promise<AuditEvent[]> {
    const events = this.auditEvents.get(identityId) || [];
    
    if (!filters) return events;
    
    return events.filter(event => {
      if (filters.eventTypes && !filters.eventTypes.includes(event.eventType)) return false;
      if (filters.severities && !filters.severities.includes(event.severity)) return false;
      if (filters.startDate && event.timestamp < filters.startDate) return false;
      if (filters.endDate && event.timestamp > filters.endDate) return false;
      if (filters.resolved !== undefined && event.resolved !== filters.resolved) return false;
      return true;
    }).slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
  }

  async exportAuditLogs(identityId: string, period: DateRange, format: 'JSON' | 'CSV' | 'PDF'): Promise<string> {
    const events = await this.getAuditEvents(identityId, {
      startDate: period.startDate,
      endDate: period.endDate
    });
    
    switch (format) {
      case 'JSON':
        return JSON.stringify(events, null, 2);
      case 'CSV':
        return this.convertToCSV(events);
      case 'PDF':
        return this.generatePDFReport(events, identityId, period);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Compliance
  async checkCompliance(identityId: string): Promise<ComplianceViolation[]> {
    const violations = this.complianceViolations.get(identityId) || [];
    return violations.filter(v => v.status === 'OPEN' || v.status === 'INVESTIGATING');
  }

  async generateComplianceReport(identityId: string, period: DateRange): Promise<ComplianceReport> {
    const auditEvents = await this.getAuditEvents(identityId, {
      startDate: period.startDate,
      endDate: period.endDate
    });
    
    const violations = await this.checkCompliance(identityId);
    const riskEvents = auditEvents.filter(e => e.eventType === 'SECURITY_ALERT').length;
    
    // Convert audit events to wallet audit logs format
    const auditTrail: WalletAuditLog[] = auditEvents.map(event => ({
      id: event.id,
      identityId: event.identityId,
      operation: event.description,
      operationType: event.eventType as any,
      timestamp: event.timestamp,
      success: event.severity !== 'ERROR' && event.severity !== 'CRITICAL',
      error: event.severity === 'ERROR' || event.severity === 'CRITICAL' ? event.description : undefined,
      riskScore: this.calculateEventRiskScore(event),
      metadata: {
        sessionId: event.metadata.sessionId || 'unknown',
        eventType: event.eventType,
        severity: event.severity,
        ...event.metadata
      },
      qerberosLogId: event.qerberosLogId
    }));
    
    return {
      identityId,
      period,
      totalTransactions: auditEvents.filter(e => e.eventType === 'TRANSACTION').length,
      totalVolume: this.calculateTotalVolume(auditEvents),
      riskEvents,
      complianceViolations: violations.map(v => v.description),
      auditTrail,
      generatedAt: new Date().toISOString(),
      reportId: this.generateId()
    };
  }

  async reportViolation(violation: ComplianceViolation): Promise<string> {
    try {
      const violations = this.complianceViolations.get(violation.identityId) || [];
      violations.push(violation);
      this.complianceViolations.set(violation.identityId, violations);
      await this.saveDataToStorage();
      
      // Log compliance violation
      await this.logAuditEvent({
        id: this.generateId(),
        identityId: violation.identityId,
        eventType: 'COMPLIANCE_VIOLATION',
        severity: violation.severity === 'CRITICAL' ? 'CRITICAL' : 'ERROR',
        timestamp: new Date().toISOString(),
        description: `Compliance violation: ${violation.description}`,
        metadata: {
          violationType: violation.violationType,
          violationId: violation.id,
          relatedTransactions: violation.relatedTransactions
        },
        resolved: false
      });
      
      console.log(`[RiskAssessmentService] Reported compliance violation: ${violation.id}`);
      return violation.id;
    } catch (error) {
      console.error('[RiskAssessmentService] Error reporting violation:', error);
      throw error;
    }
  }

  // Auto Actions
  async executeAutoAction(identityId: string, action: AutoAction): Promise<boolean> {
    try {
      switch (action.action) {
        case 'LOG':
          await this.logAuditEvent({
            id: this.generateId(),
            identityId,
            eventType: 'SYSTEM_EVENT',
            severity: 'INFO',
            timestamp: new Date().toISOString(),
            description: `Auto action executed: ${action.trigger}`,
            metadata: { action: action.action, trigger: action.trigger },
            resolved: true
          });
          break;
          
        case 'WARN':
          await this.logAuditEvent({
            id: this.generateId(),
            identityId,
            eventType: 'SECURITY_ALERT',
            severity: 'WARNING',
            timestamp: new Date().toISOString(),
            description: `Warning triggered: ${action.trigger}`,
            metadata: { action: action.action, trigger: action.trigger },
            resolved: false
          });
          break;
          
        case 'RESTRICT':
          // This would integrate with wallet permissions system
          console.log(`[RiskAssessmentService] Restricting wallet for ${identityId}: ${action.trigger}`);
          break;
          
        case 'FREEZE':
          // This would integrate with wallet freeze system
          console.log(`[RiskAssessmentService] Freezing wallet for ${identityId}: ${action.trigger}`);
          break;
          
        case 'NOTIFY':
          // This would integrate with notification system
          console.log(`[RiskAssessmentService] Notifying for ${identityId}: ${action.trigger}`);
          break;
      }
      
      action.executed = true;
      action.executedAt = new Date().toISOString();
      action.result = 'SUCCESS';
      
      return true;
    } catch (error) {
      console.error('[RiskAssessmentService] Error executing auto action:', error);
      action.executed = true;
      action.executedAt = new Date().toISOString();
      action.result = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return false;
    }
  }

  async getRecommendedActions(identityId: string): Promise<AutoAction[]> {
    const assessment = this.riskAssessments.get(identityId);
    if (!assessment) return [];
    
    const actions: AutoAction[] = [];
    
    // Generate recommendations based on risk level
    switch (assessment.overallRisk) {
      case 'HIGH':
        actions.push({
          trigger: 'High risk detected',
          action: 'WARN',
          executed: false
        });
        break;
        
      case 'CRITICAL':
        actions.push({
          trigger: 'Critical risk detected',
          action: 'RESTRICT',
          executed: false
        });
        break;
    }
    
    // Check for specific risk factors
    for (const factor of assessment.riskFactors) {
      if (factor.severity === 'CRITICAL') {
        actions.push({
          trigger: `Critical risk factor: ${factor.description}`,
          action: 'FREEZE',
          executed: false
        });
      }
    }
    
    return actions;
  }

  // Private helper methods
  private async calculateRiskFactors(identityId: string, operation?: any): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    const now = new Date().toISOString();
    
    // Analyze recent audit events
    const recentEvents = await this.getAuditEvents(identityId, {
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Transaction velocity check
    const transactionEvents = recentEvents.filter(e => e.eventType === 'TRANSACTION');
    if (transactionEvents.length > 50) {
      factors.push({
        type: 'VELOCITY',
        severity: 'HIGH',
        description: 'High transaction velocity detected',
        value: transactionEvents.length,
        threshold: 50,
        firstDetected: now,
        lastDetected: now
      });
    }
    
    // Security alerts check
    const securityAlerts = recentEvents.filter(e => e.eventType === 'SECURITY_ALERT');
    if (securityAlerts.length > 0) {
      factors.push({
        type: 'PATTERN',
        severity: securityAlerts.length > 3 ? 'CRITICAL' : 'MEDIUM',
        description: `${securityAlerts.length} security alerts in 24h`,
        value: securityAlerts.length,
        threshold: 1,
        firstDetected: securityAlerts[0]?.timestamp || now,
        lastDetected: securityAlerts[securityAlerts.length - 1]?.timestamp || now
      });
    }
    
    return factors;
  }

  private determineOverallRisk(factors: RiskFactor[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (factors.some(f => f.severity === 'CRITICAL')) return 'CRITICAL';
    if (factors.some(f => f.severity === 'HIGH')) return 'HIGH';
    if (factors.some(f => f.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private async generateRecommendations(identityId: string, factors: RiskFactor[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    for (const factor of factors) {
      switch (factor.type) {
        case 'VELOCITY':
          recommendations.push('Consider implementing transaction rate limiting');
          break;
        case 'PATTERN':
          recommendations.push('Review recent security alerts and investigate patterns');
          break;
        case 'AMOUNT':
          recommendations.push('Verify large transaction amounts with additional authentication');
          break;
      }
    }
    
    return recommendations;
  }

  private async getTrustedDAOs(identityId: string): Promise<string[]> {
    // This would integrate with DAO reputation system
    return [];
  }

  private async evaluateDetectionPattern(identityId: string, operation: any, pattern: SuspiciousActivityPattern): Promise<boolean> {
    // Simplified pattern matching - in real implementation this would be more sophisticated
    for (const rule of pattern.detectionRules) {
      const ruleMatches = await this.evaluateDetectionRule(identityId, operation, rule);
      if (ruleMatches) {
        return true;
      }
    }
    return false;
  }

  private async evaluateDetectionRule(identityId: string, operation: any, rule: DetectionRule): Promise<boolean> {
    // Simplified rule evaluation
    switch (rule.type) {
      case 'AMOUNT':
        return operation.amount && operation.amount > rule.value;
      case 'FREQUENCY':
        const recentOps = await this.getRecentOperations(identityId, 60); // last hour
        return recentOps.length > rule.value;
      default:
        return false;
    }
  }

  private async getRecentOperations(identityId: string, minutes: number): Promise<any[]> {
    const events = await this.getAuditEvents(identityId, {
      startDate: new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      eventTypes: ['TRANSACTION']
    });
    return events;
  }

  private async calculateInitialReputation(identityId: string): Promise<ReputationScore> {
    const identityType = this.determineIdentityType(identityId);
    let baseScore = 500; // Neutral starting point
    
    // Adjust base score by identity type
    switch (identityType) {
      case IdentityType.ROOT:
        baseScore = 800;
        break;
      case IdentityType.DAO:
        baseScore = 700;
        break;
      case IdentityType.ENTERPRISE:
        baseScore = 600;
        break;
      case IdentityType.AID:
        baseScore = 400;
        break;
      case IdentityType.CONSENTIDA:
        baseScore = 300;
        break;
    }
    
    return {
      identityId,
      score: baseScore,
      tier: this.calculateReputationTier(baseScore),
      factors: [],
      lastUpdated: new Date().toISOString(),
      history: [{
        timestamp: new Date().toISOString(),
        score: baseScore,
        change: 0,
        reason: 'Initial reputation calculation',
        triggeredBy: 'SYSTEM'
      }]
    };
  }

  private calculateReputationTier(score: number): 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED' | 'BLOCKED' {
    if (score >= 750) return 'TRUSTED';
    if (score >= 500) return 'NEUTRAL';
    if (score >= 250) return 'RESTRICTED';
    return 'BLOCKED';
  }

  private determineIdentityType(identityId: string): IdentityType {
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    return IdentityType.AID;
  }

  private async integrateWithQerberos(event: AuditEvent): Promise<void> {
    // Mock Qerberos integration
    console.log(`[RiskAssessmentService] Integrating with Qerberos for event: ${event.id}`);
    // In real implementation, this would send the event to Qerberos logging system
  }

  private convertToCSV(events: AuditEvent[]): string {
    const headers = ['ID', 'Identity ID', 'Event Type', 'Severity', 'Timestamp', 'Description', 'Resolved'];
    const rows = events.map(event => [
      event.id,
      event.identityId,
      event.eventType,
      event.severity,
      event.timestamp,
      event.description,
      event.resolved.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generatePDFReport(events: AuditEvent[], identityId: string, period: DateRange): string {
    // Mock PDF generation - in real implementation would use a PDF library
    return `PDF Report for ${identityId} (${period.startDate} to ${period.endDate})\n${events.length} events`;
  }

  private calculateEventRiskScore(event: AuditEvent): number {
    const severityScores = { INFO: 0.1, WARNING: 0.3, ERROR: 0.6, CRITICAL: 1.0 };
    return severityScores[event.severity] || 0.1;
  }

  private calculateTotalVolume(events: AuditEvent[]): number {
    return events
      .filter(e => e.eventType === 'TRANSACTION' && e.metadata.amount)
      .reduce((total, e) => total + (e.metadata.amount || 0), 0);
  }

  private initializeDefaultPatterns(): void {
    // Add default suspicious activity patterns
    const defaultPatterns: SuspiciousActivityPattern[] = [
      {
        id: 'high_velocity_transactions',
        name: 'High Velocity Transactions',
        description: 'Unusually high number of transactions in short time',
        severity: 'HIGH',
        detectionRules: [{
          type: 'FREQUENCY',
          condition: 'GREATER_THAN',
          value: 20,
          weight: 0.8
        }],
        threshold: 20,
        timeWindow: 60,
        enabled: true
      },
      {
        id: 'large_amount_transactions',
        name: 'Large Amount Transactions',
        description: 'Transactions with unusually large amounts',
        severity: 'MEDIUM',
        detectionRules: [{
          type: 'AMOUNT',
          condition: 'GREATER_THAN',
          value: 10000,
          weight: 0.6
        }],
        threshold: 10000,
        timeWindow: 1440,
        enabled: true
      }
    ];
    
    defaultPatterns.forEach(pattern => {
      this.detectionPatterns.set(pattern.id, pattern);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Data persistence
  private loadDataFromStorage(): void {
    try {
      const data = localStorage.getItem('risk_assessment_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.riskAssessments = new Map(Object.entries(parsed.riskAssessments || {}));
        this.reputationScores = new Map(Object.entries(parsed.reputationScores || {}));
        this.auditEvents = new Map(Object.entries(parsed.auditEvents || {}));
        this.detectionPatterns = new Map(Object.entries(parsed.detectionPatterns || {}));
        this.complianceViolations = new Map(Object.entries(parsed.complianceViolations || {}));
      }
    } catch (error) {
      console.error('[RiskAssessmentService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        riskAssessments: Object.fromEntries(this.riskAssessments),
        reputationScores: Object.fromEntries(this.reputationScores),
        auditEvents: Object.fromEntries(this.auditEvents),
        detectionPatterns: Object.fromEntries(this.detectionPatterns),
        complianceViolations: Object.fromEntries(this.complianceViolations)
      };
      
      localStorage.setItem('risk_assessment_data', JSON.stringify(data));
    } catch (error) {
      console.error('[RiskAssessmentService] Error saving data to storage:', error);
    }
  }
}

// Export singleton instance
export const riskAssessmentService = new RiskAssessmentService();