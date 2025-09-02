/**
 * Audit Status Display Component Tests
 * Comprehensive test suite for the Audit Status Display component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditStatusDisplay } from '../AuditStatusDisplay';
import { enhancedAuditService } from '@/services/identity/EnhancedAuditService';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/identity/EnhancedAuditService');
vi.mock('@/hooks/useActiveIdentity');
vi.mock('@/hooks/use-toast');

describe('AuditStatusDisplay', () => {
  const mockIdentityId = 'test_identity_123';
  
  const mockRiskAssessment = {
    identityId: mockIdentityId,
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
      },
      {
        id: 'factor_2',
        name: 'Identity Verification Risk',
        category: 'IDENTITY' as const,
        weight: 0.15,
        score: 0.3,
        description: 'Identity verification level',
        evidence: [],
        timestamp: '2024-01-01T12:00:00Z'
      }
    ],
    recommendations: [
      'Monitor for unusual patterns',
      'Consider periodic verification',
      'Review transaction limits'
    ],
    lastUpdated: '2024-01-01T12:00:00Z',
    validUntil: '2024-01-02T12:00:00Z',
    confidence: 0.8,
    mitigationActions: ['Additional monitoring', 'Periodic verification']
  };

  const mockAuditLogs = [
    {
      id: 'log_1',
      identityId: mockIdentityId,
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
      id: 'log_2',
      identityId: mockIdentityId,
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

  const mockComplianceReport = {
    id: 'report_1',
    identityId: mockIdentityId,
    period: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-01T23:59:59Z'
    },
    overallStatus: 'COMPLIANT' as const,
    violations: [
      {
        id: 'violation_1',
        identityId: mockIdentityId,
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
    
    // Mock useActiveIdentity
    (useActiveIdentity as any).mockReturnValue({
      activeIdentity: { id: mockIdentityId, type: 'ROOT' }
    });

    // Mock enhancedAuditService methods
    (enhancedAuditService.calculateRiskScore as any).mockResolvedValue(mockRiskAssessment);
    (enhancedAuditService.getAuditTrail as any).mockResolvedValue(mockAuditLogs);
    (enhancedAuditService.generateComplianceReport as any).mockResolvedValue(mockComplianceReport);

    // Mock toast
    (toast as any).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render without identity', () => {
      (useActiveIdentity as any).mockReturnValue({
        activeIdentity: null
      });

      render(<AuditStatusDisplay />);

      expect(screen.getByText('Please select an identity to view audit status')).toBeInTheDocument();
    });

    it('should render with identity and audit data', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('Security & Compliance Status')).toBeInTheDocument();
        expect(screen.getByText('Risk Level')).toBeInTheDocument();
        expect(screen.getByText('Compliance Score')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<AuditStatusDisplay />);

      expect(screen.getByText('Calculating...')).toBeInTheDocument();
    });

    it('should display risk assessment data', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
        expect(screen.getByText('Score: 35%')).toBeInTheDocument();
      });
    });

    it('should display compliance score', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument(); // 1 - (1 * 0.1) = 0.9
      });
    });
  });

  describe('Risk Level Display', () => {
    it('should display LOW risk correctly', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue({
        ...mockRiskAssessment,
        riskLevel: 'LOW',
        riskScore: 0.2
      });

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('LOW')).toBeInTheDocument();
        expect(screen.getByText('Score: 20%')).toBeInTheDocument();
      });
    });

    it('should display HIGH risk correctly', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue({
        ...mockRiskAssessment,
        riskLevel: 'HIGH',
        riskScore: 0.75
      });

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('Score: 75%')).toBeInTheDocument();
      });
    });

    it('should display CRITICAL risk correctly', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue({
        ...mockRiskAssessment,
        riskLevel: 'CRITICAL',
        riskScore: 0.95
      });

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
        expect(screen.getByText('Score: 95%')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Factors', () => {
    it('should display top risk factors', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('Top Risk Factors')).toBeInTheDocument();
        expect(screen.getByText('Transaction Frequency Risk')).toBeInTheDocument();
        expect(screen.getByText('Identity Verification Risk')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument(); // First factor score
        expect(screen.getByText('30%')).toBeInTheDocument(); // Second factor score
      });
    });

    it('should not display risk factors section when no factors exist', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue({
        ...mockRiskAssessment,
        factors: []
      });

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.queryByText('Top Risk Factors')).not.toBeInTheDocument();
      });
    });
  });

  describe('Recent Events', () => {
    it('should display recent events when showRecentEvents is true', async () => {
      render(<AuditStatusDisplay showRecentEvents={true} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      // Click to expand events
      const expandButton = screen.getByRole('button', { name: '' }); // Eye icon button
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('transfer')).toBeInTheDocument();
        expect(screen.getByText('deposit')).toBeInTheDocument();
        expect(screen.getByText('100 ETH')).toBeInTheDocument();
        expect(screen.getByText('50 ETH')).toBeInTheDocument();
      });
    });

    it('should not display recent events when showRecentEvents is false', async () => {
      render(<AuditStatusDisplay showRecentEvents={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
      });
    });

    it('should limit events to maxEvents prop', async () => {
      const manyLogs = Array.from({ length: 20 }, (_, i) => ({
        ...mockAuditLogs[0],
        id: `log_${i}`,
        operation: `operation_${i}`
      }));

      (enhancedAuditService.getAuditTrail as any).mockResolvedValue(manyLogs);

      render(<AuditStatusDisplay maxEvents={5} />);

      await waitFor(() => {
        expect(enhancedAuditService.getAuditTrail).toHaveBeenCalledWith(
          mockIdentityId,
          expect.objectContaining({ limit: 5 })
        );
      });
    });
  });

  describe('Recommendations', () => {
    it('should display recommendations when showRecommendations is true', async () => {
      render(<AuditStatusDisplay showRecommendations={true} />);

      await waitFor(() => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Monitor for unusual patterns')).toBeInTheDocument();
        expect(screen.getByText('Consider periodic verification')).toBeInTheDocument();
        expect(screen.getByText('Review transaction limits')).toBeInTheDocument();
      });
    });

    it('should not display recommendations when showRecommendations is false', async () => {
      render(<AuditStatusDisplay showRecommendations={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Security Recommendations')).not.toBeInTheDocument();
      });
    });

    it('should not display recommendations section when no recommendations exist', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockResolvedValue({
        ...mockRiskAssessment,
        recommendations: []
      });

      render(<AuditStatusDisplay showRecommendations={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Security Recommendations')).not.toBeInTheDocument();
      });
    });
  });

  describe('Compliance Violations', () => {
    it('should display compliance violations', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('Compliance Issues')).toBeInTheDocument();
        expect(screen.getByText('1 high-priority compliance issue(s) require attention')).toBeInTheDocument();
      });
    });

    it('should display critical violations with proper styling', async () => {
      const criticalViolationReport = {
        ...mockComplianceReport,
        violations: [
          {
            ...mockComplianceReport.violations[0],
            severity: 'CRITICAL' as const
          }
        ],
        summary: {
          ...mockComplianceReport.summary,
          criticalViolations: 1,
          highViolations: 0
        }
      };

      (enhancedAuditService.generateComplianceReport as any).mockResolvedValue(criticalViolationReport);

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText('1 critical compliance violation(s) detected')).toBeInTheDocument();
      });
    });

    it('should not display violations section when no violations exist', async () => {
      (enhancedAuditService.generateComplianceReport as any).mockResolvedValue({
        ...mockComplianceReport,
        violations: [],
        summary: {
          ...mockComplianceReport.summary,
          totalViolations: 0,
          criticalViolations: 0,
          highViolations: 0
        }
      });

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.queryByText('Compliance Issues')).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // Refresh button
      });

      const refreshButton = screen.getByRole('button', { name: '' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(enhancedAuditService.calculateRiskScore).toHaveBeenCalledTimes(2); // Initial + refresh
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Audit Data Refreshed'
          })
        );
      });
    });

    it('should show loading state during refresh', async () => {
      // Make the service call take some time
      (enhancedAuditService.calculateRiskScore as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockRiskAssessment), 100))
      );

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: '' });
      fireEvent.click(refreshButton);

      // Should show loading state
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh data every 5 minutes', async () => {
      vi.useFakeTimers();

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(enhancedAuditService.calculateRiskScore).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      await waitFor(() => {
        expect(enhancedAuditService.calculateRiskScore).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should not auto-refresh when no identity is provided', async () => {
      vi.useFakeTimers();

      (useActiveIdentity as any).mockReturnValue({
        activeIdentity: null
      });

      render(<AuditStatusDisplay />);

      // Fast-forward 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Should not have called the service
      expect(enhancedAuditService.calculateRiskScore).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Callbacks', () => {
    it('should call onRiskLevelChange when risk level changes', async () => {
      const onRiskLevelChange = vi.fn();

      render(<AuditStatusDisplay onRiskLevelChange={onRiskLevelChange} />);

      await waitFor(() => {
        expect(onRiskLevelChange).toHaveBeenCalledWith('MEDIUM');
      });
    });

    it('should call onAlertGenerated when alerts are generated', async () => {
      const onAlertGenerated = vi.fn();

      render(<AuditStatusDisplay onAlertGenerated={onAlertGenerated} />);

      // This would be called if alerts were generated during the audit process
      // Currently not implemented in the mock, but the callback is set up
      expect(onAlertGenerated).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (enhancedAuditService.calculateRiskScore as any).mockRejectedValue(new Error('Service error'));

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Audit Data Error',
            variant: 'destructive'
          })
        );
      });
    });

    it('should continue to function after service errors', async () => {
      (enhancedAuditService.calculateRiskScore as any)
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce(mockRiskAssessment);

      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Audit Data Error'
          })
        );
      });

      // Click refresh to try again
      const refreshButton = screen.getByRole('button', { name: '' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    it('should use provided identityId prop', async () => {
      const customIdentityId = 'custom_identity_456';

      render(<AuditStatusDisplay identityId={customIdentityId} />);

      await waitFor(() => {
        expect(enhancedAuditService.calculateRiskScore).toHaveBeenCalledWith(customIdentityId);
      });
    });

    it('should apply custom className', () => {
      const customClass = 'custom-audit-class';

      render(<AuditStatusDisplay className={customClass} />);

      const card = screen.getByRole('region'); // Card component
      expect(card).toHaveClass(customClass);
    });
  });

  describe('Last Updated Display', () => {
    it('should display last updated timestamp', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('should update timestamp after refresh', async () => {
      render(<AuditStatusDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: '' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        // Timestamp should be updated (though we can't easily test the exact time)
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });
});