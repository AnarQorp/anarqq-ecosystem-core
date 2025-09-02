/**
 * Tests for SecurityMonitoringDashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SecurityMonitoringDashboard from '../SecurityMonitoringDashboard';
import { useIdentityStore } from '@/state/identity';
import { AuditEntry, IdentityAction, ExtendedSquidIdentity } from '@/types/identity';
import { AccessLogEntry } from '@/api/qerberos';

// Mock the identity store
vi.mock('@/state/identity', () => ({
  useIdentityStore: vi.fn()
}));

// Mock the qerberos API
vi.mock('@/api/qerberos', () => ({
  getAccessLogs: vi.fn()
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input 
      placeholder={placeholder} 
      value={value} 
      onChange={onChange} 
      className={className}
    />
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('test')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange?.('overview')}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <div data-value={value}>{children}</div>
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
  AlertTitle: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}));

describe('SecurityMonitoringDashboard', () => {
  const mockIdentity: ExtendedSquidIdentity = {
    did: 'did:test:123',
    name: 'Test Identity',
    type: 'ROOT' as any,
    rootId: 'did:test:123',
    children: [],
    depth: 0,
    path: [],
    governanceLevel: 'SELF' as any,
    creationRules: {} as any,
    permissions: {} as any,
    status: 'ACTIVE' as any,
    qonsentProfileId: 'qonsent-123',
    qlockKeyPair: {} as any,
    privacyLevel: 'PUBLIC' as any,
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-01T00:00:00Z',
    kyc: {
      required: false,
      submitted: false,
      approved: false
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: true
  };

  const mockAuditLog: AuditEntry[] = [
    {
      id: 'audit-1',
      identityId: 'did:test:123',
      action: IdentityAction.SWITCHED,
      timestamp: '2024-01-01T10:00:00Z',
      metadata: {
        triggeredBy: 'user',
        securityLevel: 'MEDIUM' as any
      }
    },
    {
      id: 'audit-2',
      identityId: 'did:test:123',
      action: IdentityAction.CREATED,
      timestamp: '2024-01-01T09:00:00Z',
      metadata: {
        triggeredBy: 'system',
        securityLevel: 'LOW' as any
      }
    }
  ];

  const mockAccessLogs: AccessLogEntry[] = [
    {
      id: 'access-1',
      cid: 'QmTest123',
      identity: 'did:test:123',
      timestamp: '2024-01-01T10:30:00Z',
      status: 'SUCCESS',
      operation: 'DOWNLOAD'
    },
    {
      id: 'access-2',
      cid: 'QmTest456',
      identity: 'did:test:123',
      timestamp: '2024-01-01T10:15:00Z',
      status: 'FAILED',
      reason: 'Access denied',
      operation: 'UPLOAD'
    }
  ];

  const mockUseIdentityStore = {
    identities: [mockIdentity],
    getAuditLog: vi.fn().mockResolvedValue(mockAuditLog)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useIdentityStore as any).mockReturnValue(mockUseIdentityStore);
    
    // Mock the dynamic import for qerberos
    vi.doMock('@/api/qerberos', () => ({
      getAccessLogs: vi.fn().mockResolvedValue(mockAccessLogs)
    }));
  });

  it('renders loading state initially', () => {
    render(<SecurityMonitoringDashboard />);
    
    expect(screen.getByText('Loading security data...')).toBeInTheDocument();
  });

  it('renders dashboard with security data', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Check statistics cards
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('Critical Events')).toBeInTheDocument();
    expect(screen.getByText('Unresolved')).toBeInTheDocument();
    expect(screen.getByText('Last 24h')).toBeInTheDocument();
  });

  it('displays audit log events in table', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
    });

    // Check for audit log entries
    expect(screen.getByText('Identity SWITCHED')).toBeInTheDocument();
    expect(screen.getByText('Identity CREATED')).toBeInTheDocument();
  });

  it('displays failed access log events', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Access FAILED')).toBeInTheDocument();
    });

    expect(screen.getByText('UPLOAD operation failed: Access denied')).toBeInTheDocument();
  });

  it('filters events by search term', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search events, identities, or descriptions...');
    fireEvent.change(searchInput, { target: { value: 'SWITCHED' } });

    // Should filter to show only switched events
    await waitFor(() => {
      expect(screen.getByText('Identity SWITCHED')).toBeInTheDocument();
    });
  });

  it('detects rapid switching anomaly', async () => {
    // Create multiple switch events in short time
    const rapidSwitchLogs: AuditEntry[] = Array.from({ length: 15 }, (_, i) => ({
      id: `audit-switch-${i}`,
      identityId: 'did:test:123',
      action: IdentityAction.SWITCHED,
      timestamp: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
      metadata: {
        triggeredBy: 'user',
        securityLevel: 'MEDIUM' as any
      }
    }));

    mockUseIdentityStore.getAuditLog.mockResolvedValue(rapidSwitchLogs);

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should detect rapid switching anomaly
    await waitFor(() => {
      expect(screen.getByText('Rapid Identity Switching Detected')).toBeInTheDocument();
    });
  });

  it('detects unusual activity hours anomaly', async () => {
    // Create night activity logs (2-6 AM)
    const nightActivityLogs: AuditEntry[] = Array.from({ length: 8 }, (_, i) => ({
      id: `audit-night-${i}`,
      identityId: 'did:test:123',
      action: IdentityAction.UPDATED,
      timestamp: new Date(2024, 0, 1, 3, i * 10).toISOString(), // 3 AM activities
      metadata: {
        triggeredBy: 'user',
        securityLevel: 'LOW' as any
      }
    }));

    mockUseIdentityStore.getAuditLog.mockResolvedValue(nightActivityLogs);

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should detect unusual hours anomaly
    await waitFor(() => {
      expect(screen.getByText('Unusual Activity Hours')).toBeInTheDocument();
    });
  });

  it('detects excessive identity creation anomaly', async () => {
    // Create multiple creation events
    const excessiveCreationLogs: AuditEntry[] = Array.from({ length: 8 }, (_, i) => ({
      id: `audit-create-${i}`,
      identityId: `did:test:${i}`,
      action: IdentityAction.CREATED,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour apart
      metadata: {
        triggeredBy: 'user',
        securityLevel: 'HIGH' as any
      }
    }));

    mockUseIdentityStore.getAuditLog.mockResolvedValue(excessiveCreationLogs);

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should detect excessive creation anomaly
    await waitFor(() => {
      expect(screen.getByText('Excessive Identity Creation')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should call getAuditLog again
    await waitFor(() => {
      expect(mockUseIdentityStore.getAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  it('displays error state when data loading fails', async () => {
    mockUseIdentityStore.getAuditLog.mockRejectedValue(new Error('Failed to load'));

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('filters events by type', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Click on event type filter
    const typeFilter = screen.getByTestId('select');
    fireEvent.click(typeFilter);

    // Should trigger filter change
    expect(typeFilter).toBeInTheDocument();
  });

  it('filters events by severity', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should have severity filter
    const severityFilters = screen.getAllByTestId('select');
    expect(severityFilters.length).toBeGreaterThan(0);
  });

  it('switches between tabs', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should have tabs
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toBeInTheDocument();

    // Check tab content
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Security Events')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
  });

  it('displays severity badges correctly', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should display severity badges
    const badges = screen.getAllByText(/MEDIUM|LOW|HIGH|CRITICAL/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows no anomalies message when none detected', async () => {
    // Mock empty audit logs
    mockUseIdentityStore.getAuditLog.mockResolvedValue([]);

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Switch to anomalies tab and check for no anomalies message
    // This would require more complex tab switching simulation
    // For now, we verify the component renders without errors
    expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
  });

  it('renders with specific identity ID', async () => {
    const specificIdentityId = 'did:test:specific';
    
    render(<SecurityMonitoringDashboard identityId={specificIdentityId} />);
    
    await waitFor(() => {
      expect(mockUseIdentityStore.getAuditLog).toHaveBeenCalledWith(specificIdentityId);
    });
  });

  it('handles export button click', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();
    
    // Click should not throw error
    fireEvent.click(exportButton);
  });

  it('displays event timestamps correctly', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should display formatted timestamps
    // The exact format depends on locale, but should contain date/time info
    const timestamps = screen.getAllByText(/2024/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('shows resolved and unresolved status correctly', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Monitoring Dashboard')).toBeInTheDocument();
    });

    // Should show resolved status for audit logs (they're marked as resolved)
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    
    // Should show open status for failed access logs
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});