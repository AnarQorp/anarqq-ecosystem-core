/**
 * Enhanced Wallet Audit Hook Tests
 * Comprehensive test suite for the useWalletAudit hook with EnhancedAuditService integration
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWalletAudit } from '../useWalletAudit';
import { enhancedAuditService } from '../../services/identity/EnhancedAuditService';
import { ExtendedSquidIdentity } from '../../types/identity';

// Mock the enhanced audit service
vi.mock('../../services/identity/EnhancedAuditService');

describe('useWalletAudit', () => {
  const mockIdentity: ExtendedSquidIdentity = {
    did: 'test_identity_123',
    type: 'ROOT',
    username: 'testuser',
    displayName: 'Test User',
    avatar: '',
    isActive: true,
    permissions: [],
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2024-01-01T12:00:00Z'
  };

  const mockAuditEvents = [
    {
      id: 'audit_1',
      identityId: 'test_identity_123',
      operation: 'transfer',
      operationType: 'TRANSFER' as const,
      amount: 100,
      token: 'ETH',
      success: true,
      timestamp: '2024-01-01T12:00:00Z',
      riskScore: 0.2,
      metadata: { sessionId: 'session_1' }
    },
    {
      id: 'audit_2',
      identityId: 'test_identity_123',
      operation: 'deposit',
      operationType: 'DEPOSIT' as const,
      amount: 50,
      token: 'ETH',
      success: false,
      error: 'Insufficient balance',
      timestamp: '2024-01-01T11:30:00Z',
      riskScore: 0.1,
      metadata: { sessionId: 'session_2' }
    }
  ];

  const mockRiskAssessment = {
    identityId: 'test_identity_123',
    riskScore: 0.35,
    riskLevel: 'MEDIUM' as const,
    factors: [
      {
        id: 'factor_1',
        name: 'Transaction Frequency Risk',
        category: 'BEHAVIORAL' as const,
        weight: 0.2,
        score: 0.6,
        description: 'High transaction frequency detected',
        evidence: [],
        timestamp: '2024-01-01T12:00:00Z'
      }
    ],
    recommendations: ['Monitor for unusual patterns'],
    lastUpdated: '2024-01-01T12:00:00Z',
    validUntil: '2024-01-02T12:00:00Z',
    confidence: 0.8,
    mitigationActions: ['Additional monitoring'],
    reputationScore: 750,
    reputationTier: 'TRUSTED' as const
  };

  const mockComplianceReport = {
    id: 'report_1',
    identityId: 'test_identity_123',
    period: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-01T23:59:59Z'
    },
    overallStatus: 'COMPLIANT' as const,
    violations: [
      {
        id: 'violation_1',
        identityId: 'test_identity_123',
        violationType: 'AML' as const,
        severity: 'HIGH' as const,
        description: 'Large transaction detected',
        regulation: 'AML Regulation',
        evidence: [],
        status: 'DETECTED' as const,
        detectedAt: '2024-01-01T12:00:00Z'
      }
    ],
    summary: {
      totalViolations: 1,
      criticalViolations: 0,
      highViolations: 1,
      mediumViolations: 0,
      lowViolations: 0,
      resolvedViolations: 0,
      pendingViolations: 1
    },
    recommendations: ['Review AML procedures'],
    generatedAt: '2024-01-01T12:00:00Z',
    generatedBy: 'EnhancedAuditService'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock enhancedAuditService methods
    (enhancedAuditService.getAuditTrail as any).mockResolvedValue(mockAuditEvents);
    (enhancedAuditService.calculateRiskScore as any).mockResolvedValue(mockRiskAssessment);
    (enhancedAuditService.generateComplianceReport as any).mockResolvedValue(mockComplianceReport);
    (enhancedAuditService.logOperation as any).mockResolvedValue(true);
    (enhancedAuditService.exportAuditLogs as any).mockResolvedValue('audit_export_123.csv');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useWalletAudit(null));

      expect(result.current.auditEvents).toEqual([]);
      expect(result.current.riskAssessment).toBeNull();
      expect(result.current.complianceStatus).toEqual([]);
      expect(result.current.reputationScore).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load audit data when identity is provided', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.auditEvents).toHaveLength(2);
      expect(result.current.riskAssessment).toEqual(mockRiskAssessment);
      expect(result.current.complianceStatus).toHaveLength(1);
      expect(result.current.reputationScore).toBe(750);
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should handle loading errors gracefully', async () => {
      (enhancedAuditService.getAuditTrail as any).mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Service error');
      expect(result.current.auditEvents).toEqual([]);
    });
  });

  describe('Audit Event Logging', () => {
    it('should log audit events successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newEvent = {
        identityId: 'test_identity_123',
        operation: 'withdraw',
        operationType: 'WITHDRAWAL' as const,
        amount: 25,
        token: 'ETH',
        success: true,
        riskScore: 0.3,
        metadata: { sessionId: 'session_3' }
      };

      await act(async () => {
        await result.current.logEvent(newEvent);
      });

      expect(enhancedAuditService.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newEvent,
          id: expect.any(String),
          timestamp: expect.any(String)
        })
      );

      expect(result.current.auditEvents[0]).toMatchObject(newEvent);
    });

    it('should handle logging errors gracefully', async () => {
      (enhancedAuditService.logOperation as any).mockRejectedValue(new Error('Log error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.logEvent({
          identityId: 'test_identity_123',
          operation: 'test',
          operationType: 'TRANSFER' as const,
          success: true,
          riskScore: 0.1,
          metadata: {}
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log audit event:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Risk Assessment', () => {
    it('should assess risk successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const operation = { amount: 1000, token: 'ETH' };

      await act(async () => {
        const assessment = await result.current.assessRisk(operation);
        expect(assessment).toEqual(mockRiskAssessment);
      });

      expect(enhancedAuditService.calculateRiskScore).toHaveBeenCalledWith(
        'test_identity_123',
        operation
      );
      expect(result.current.riskAssessment).toEqual(mockRiskAssessment);
    });

    it('should handle risk assessment errors', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockRejectedValue(new Error('Risk error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        const assessment = await result.current.assessRisk();
        expect(assessment).toBeNull();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to assess risk:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Reputation Management', () => {
    it('should update reputation successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const success = await result.current.updateReputation(50, 'Good behavior');
        expect(success).toBe(true);
      });

      expect(result.current.riskAssessment).toEqual(mockRiskAssessment);
      expect(result.current.reputationScore).toBe(750);
    });

    it('should handle reputation update errors', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockRejectedValue(new Error('Update error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        const success = await result.current.updateReputation(50, 'Test');
        expect(success).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update reputation:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const period = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z'
      };

      await act(async () => {
        const report = await result.current.generateComplianceReport(period);
        expect(report).toEqual(mockComplianceReport);
      });

      expect(enhancedAuditService.generateComplianceReport).toHaveBeenCalledWith(
        'test_identity_123',
        period
      );
    });

    it('should handle compliance report errors', async () => {
      (enhancedAuditService.generateComplianceReport as any).mockRejectedValue(new Error('Report error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        const report = await result.current.generateComplianceReport({
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z'
        });
        expect(report).toBeNull();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate compliance report:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Audit Log Export', () => {
    it('should export audit logs successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const period = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z'
      };

      await act(async () => {
        const filename = await result.current.exportAuditLogs(period, 'CSV');
        expect(filename).toBe('audit_export_123.csv');
      });

      expect(enhancedAuditService.exportAuditLogs).toHaveBeenCalledWith({
        identityId: 'test_identity_123',
        startDate: period.start,
        endDate: period.end
      });
    });
  });

  describe('Event Filtering', () => {
    it('should filter audit events by type', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const filtered = result.current.filterAuditEvents({
        eventTypes: ['TRANSFER']
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].operationType).toBe('TRANSFER');
    });

    it('should filter audit events by date range', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const filtered = result.current.filterAuditEvents({
        startDate: '2024-01-01T11:45:00Z',
        endDate: '2024-01-01T12:30:00Z'
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].timestamp).toBe('2024-01-01T12:00:00Z');
    });

    it('should filter audit events by success status', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const successfulEvents = result.current.filterAuditEvents({
        resolved: true
      });

      const failedEvents = result.current.filterAuditEvents({
        resolved: false
      });

      expect(successfulEvents).toHaveLength(1);
      expect(failedEvents).toHaveLength(1);
      expect(successfulEvents[0].success).toBe(true);
      expect(failedEvents[0].success).toBe(false);
    });
  });

  describe('Summary Functions', () => {
    it('should generate risk summary correctly', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const riskSummary = result.current.getRiskSummary();

      expect(riskSummary).toEqual({
        overallRisk: 'MEDIUM',
        totalFactors: 1,
        factorBreakdown: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        recommendations: ['Monitor for unusual patterns'],
        reputationScore: 750,
        reputationTier: 'TRUSTED'
      });
    });

    it('should generate compliance summary correctly', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const complianceSummary = result.current.getComplianceSummary();

      expect(complianceSummary).toEqual({
        totalViolations: 1,
        resolvedViolations: 0,
        openViolations: 1,
        severityBreakdown: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0
        },
        complianceScore: 90 // 100 - (1 * 10)
      });
    });

    it('should generate recent activity summary correctly', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const recentActivity = result.current.getRecentActivity(24);

      expect(recentActivity).toEqual({
        totalEvents: 2,
        successfulTransactions: 1,
        failedTransactions: 0, // DEPOSIT is not TRANSFER
        configChanges: 0,
        securityEvents: 0,
        averageRiskScore: 0.15 // (0.2 + 0.1) / 2
      });
    });
  });

  describe('Status Checks', () => {
    it('should correctly identify high risk status', async () => {
      const highRiskAssessment = {
        ...mockRiskAssessment,
        riskLevel: 'HIGH' as const
      };

      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue(highRiskAssessment);

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasHighRisk).toBe(true);
    });

    it('should correctly identify compliance issues', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasComplianceIssues).toBe(true);
    });

    it('should correctly identify healthy status', async () => {
      const lowRiskAssessment = {
        ...mockRiskAssessment,
        riskLevel: 'LOW' as const
      };

      const noViolationsReport = {
        ...mockComplianceReport,
        violations: []
      };

      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue(lowRiskAssessment);
      (enhancedAuditService.generateComplianceReport as any).mockResolvedValue(noViolationsReport);

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isHealthy).toBe(true);
    });
  });

  describe('Real-time Updates', () => {
    it('should enable real-time updates by default', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(1);

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should disable real-time updates when configured', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => 
        useWalletAudit(mockIdentity, { enableRealTimeUpdates: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(1);

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      // Should not have called again
      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should clear errors successfully', async () => {
      (enhancedAuditService.getAuditTrail as any).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should refresh data successfully', async () => {
      const { result } = renderHook(() => useWalletAudit(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(2);
    });
  });

  describe('Options Configuration', () => {
    it('should respect maxAuditEvents option', async () => {
      const { result } = renderHook(() => 
        useWalletAudit(mockIdentity, { maxAuditEvents: 50 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledWith(
        'test_identity_123',
        { limit: 50 }
      );
    });

    it('should respect custom update interval', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => 
        useWalletAudit(mockIdentity, { updateInterval: 60000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(1);

      // Fast-forward 30 seconds (should not trigger)
      vi.advanceTimersByTime(30000);
      expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(1);

      // Fast-forward another 30 seconds (should trigger)
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });
});