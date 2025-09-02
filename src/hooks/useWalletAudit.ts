/**
 * Wallet Audit Hook
 * Provides audit logging, risk assessment, and compliance monitoring
 * for wallet operations with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { WalletAuditLog, RiskAssessment, ComplianceReport, DateRange } from '../types/wallet-config';
import { enhancedAuditService } from '../services/identity/EnhancedAuditService';

export interface AuditState {
  auditEvents: WalletAuditLog[];
  riskAssessment: RiskAssessment | null;
  complianceStatus: ComplianceViolation[];
  reputationScore: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface AuditFilters {
  eventTypes?: string[];
  severities?: string[];
  startDate?: string;
  endDate?: string;
  resolved?: boolean;
  limit?: number;
}

export interface UseWalletAuditOptions {
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
  maxAuditEvents?: number;
  enableComplianceMonitoring?: boolean;
}

export const useWalletAudit = (
  identity: ExtendedSquidIdentity | null,
  options: UseWalletAuditOptions = {}
) => {
  const {
    enableRealTimeUpdates = true,
    updateInterval = 30000, // 30 seconds
    maxAuditEvents = 100,
    enableComplianceMonitoring = true
  } = options;

  const [state, setState] = useState<AuditState>({
    auditEvents: [],
    riskAssessment: null,
    complianceStatus: [],
    reputationScore: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const identityId = identity?.did;

  // Load audit data
  const loadAuditData = useCallback(async () => {
    if (!identityId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load audit events
      const auditEvents = await enhancedAuditService.getAuditTrail(identityId, {
        limit: maxAuditEvents
      });

      // Load risk assessment
      const riskAssessment = await enhancedAuditService.calculateRiskScore(identityId);

      // Load compliance report
      const complianceReport = await enhancedAuditService.generateComplianceReport(identityId);

      // Extract reputation score from risk assessment
      const reputationScore = riskAssessment.reputationScore || null;

      setState(prev => ({
        ...prev,
        auditEvents,
        riskAssessment,
        complianceStatus: complianceReport.violations.map(v => ({
          id: v.id,
          type: v.violationType,
          severity: v.severity,
          description: v.description,
          timestamp: v.detectedAt,
          resolved: v.status === 'RESOLVED'
        })),
        reputationScore,
        loading: false,
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load audit data'
      }));
    }
  }, [identityId, maxAuditEvents]);

  // Log audit event
  const logEvent = useCallback(async (event: Omit<WalletAuditLog, 'id' | 'timestamp'>) => {
    if (!identityId) return;

    try {
      const auditEvent: WalletAuditLog = {
        ...event,
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString()
      };

      await enhancedAuditService.logOperation(auditEvent);

      // Update local state
      setState(prev => ({
        ...prev,
        auditEvents: [auditEvent, ...prev.auditEvents.slice(0, maxAuditEvents - 1)]
      }));

      // Trigger risk reassessment
      await assessRisk();

    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }, [identityId, maxAuditEvents]);

  // Assess risk
  const assessRisk = useCallback(async (operation?: any) => {
    if (!identityId) return null;

    try {
      const assessment = await enhancedAuditService.calculateRiskScore(identityId, operation);
      
      setState(prev => ({
        ...prev,
        riskAssessment: assessment
      }));

      return assessment;
    } catch (error) {
      console.error('Failed to assess risk:', error);
      return null;
    }
  }, [identityId]);

  // Update reputation score
  const updateReputation = useCallback(async (change: number, reason: string) => {
    if (!identityId) return false;

    try {
      // Update reputation through risk assessment
      const assessment = await enhancedAuditService.calculateRiskScore(identityId);
      
      setState(prev => ({
        ...prev,
        riskAssessment: assessment,
        reputationScore: assessment.reputationScore || prev.reputationScore
      }));
      
      const success = true;

      return success;
    } catch (error) {
      console.error('Failed to update reputation:', error);
      return false;
    }
  }, [identityId]);

  // Generate compliance report
  const generateComplianceReport = useCallback(async (period: DateRange): Promise<ComplianceReport | null> => {
    if (!identityId) return null;

    try {
      return await enhancedAuditService.generateComplianceReport(identityId, period);
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      return null;
    }
  }, [identityId]);

  // Export audit logs
  const exportAuditLogs = useCallback(async (
    period: DateRange, 
    format: 'JSON' | 'CSV' | 'PDF' = 'JSON'
  ): Promise<string | null> => {
    if (!identityId) return null;

    try {
      return await enhancedAuditService.exportAuditLogs({
        identityId,
        startDate: period.start,
        endDate: period.end
      });
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      return null;
    }
  }, [identityId]);

  // Filter audit events
  const filterAuditEvents = useCallback((filters: AuditFilters) => {
    return state.auditEvents.filter(event => {
      if (filters.eventTypes && !filters.eventTypes.includes(event.operationType)) {
        return false;
      }
      
      if (filters.startDate && event.timestamp < filters.startDate) {
        return false;
      }
      
      if (filters.endDate && event.timestamp > filters.endDate) {
        return false;
      }
      
      if (filters.resolved !== undefined && event.success !== filters.resolved) {
        return false;
      }
      
      return true;
    }).slice(0, filters.limit || state.auditEvents.length);
  }, [state.auditEvents]);

  // Get risk summary
  const getRiskSummary = useCallback(() => {
    if (!state.riskAssessment) return null;

    const criticalFactors = state.riskAssessment.riskFactors.filter(f => f.severity === 'CRITICAL').length;
    const highFactors = state.riskAssessment.riskFactors.filter(f => f.severity === 'HIGH').length;
    const mediumFactors = state.riskAssessment.riskFactors.filter(f => f.severity === 'MEDIUM').length;
    const lowFactors = state.riskAssessment.riskFactors.filter(f => f.severity === 'LOW').length;

    return {
      overallRisk: state.riskAssessment.overallRisk,
      totalFactors: state.riskAssessment.riskFactors.length,
      factorBreakdown: {
        critical: criticalFactors,
        high: highFactors,
        medium: mediumFactors,
        low: lowFactors
      },
      recommendations: state.riskAssessment.recommendations,
      reputationScore: state.reputationScore,
      reputationTier: state.riskAssessment.reputationTier
    };
  }, [state.riskAssessment, state.reputationScore]);

  // Get compliance summary
  const getComplianceSummary = useCallback(() => {
    const totalViolations = state.complianceStatus.length;
    const resolvedViolations = state.complianceStatus.filter(v => v.resolved).length;
    const openViolations = totalViolations - resolvedViolations;
    
    const severityBreakdown = {
      critical: state.complianceStatus.filter(v => v.severity === 'CRITICAL').length,
      high: state.complianceStatus.filter(v => v.severity === 'HIGH').length,
      medium: state.complianceStatus.filter(v => v.severity === 'MEDIUM').length,
      low: state.complianceStatus.filter(v => v.severity === 'LOW').length
    };

    return {
      totalViolations,
      resolvedViolations,
      openViolations,
      severityBreakdown,
      complianceScore: totalViolations === 0 ? 100 : Math.max(0, 100 - (openViolations * 10))
    };
  }, [state.complianceStatus]);

  // Get recent activity summary
  const getRecentActivity = useCallback((hours: number = 24) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const recentEvents = state.auditEvents.filter(event => event.timestamp >= cutoffTime);
    
    const successfulTransactions = recentEvents.filter(e => 
      e.operationType === 'TRANSFER' && e.success
    ).length;
    
    const failedTransactions = recentEvents.filter(e => 
      e.operationType === 'TRANSFER' && !e.success
    ).length;
    
    const configChanges = recentEvents.filter(e => 
      e.operationType === 'CONFIG_CHANGE'
    ).length;
    
    const securityEvents = recentEvents.filter(e => 
      e.operationType === 'EMERGENCY'
    ).length;

    return {
      totalEvents: recentEvents.length,
      successfulTransactions,
      failedTransactions,
      configChanges,
      securityEvents,
      averageRiskScore: recentEvents.length > 0 
        ? recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length 
        : 0
    };
  }, [state.auditEvents]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Real-time updates effect
  useEffect(() => {
    if (identityId && enableRealTimeUpdates) {
      loadAuditData();
      
      const interval = setInterval(loadAuditData, updateInterval);
      return () => clearInterval(interval);
    }
  }, [identityId, enableRealTimeUpdates, updateInterval, loadAuditData]);

  // Initial load effect
  useEffect(() => {
    if (identityId) {
      loadAuditData();
    }
  }, [identityId, loadAuditData]);

  return {
    // State
    ...state,
    
    // Actions
    logEvent,
    assessRisk,
    updateReputation,
    generateComplianceReport,
    exportAuditLogs,
    refreshData: loadAuditData,
    clearError,
    
    // Filters and queries
    filterAuditEvents,
    
    // Computed values
    getRiskSummary,
    getComplianceSummary,
    getRecentActivity,
    
    // Status checks
    hasHighRisk: state.riskAssessment?.overallRisk === 'HIGH' || state.riskAssessment?.overallRisk === 'CRITICAL',
    hasComplianceIssues: state.complianceStatus.some(v => !v.resolved),
    hasRecentActivity: state.auditEvents.length > 0,
    isHealthy: !state.error && state.riskAssessment?.overallRisk === 'LOW' && state.complianceStatus.every(v => v.resolved),
    
    // Metrics
    totalEvents: state.auditEvents.length,
    riskScore: state.riskAssessment?.riskFactors.reduce((sum, f) => sum + (f.value / f.threshold), 0) || 0,
    complianceScore: getComplianceSummary().complianceScore
  };
};