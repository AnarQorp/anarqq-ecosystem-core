/**
 * Tests for Identity Visual Indicators and Badges
 * Requirements: 1.2, 1.5, 3.3
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  IdentityTypeIcon,
  IdentityTypeBadge,
  PrivacyLevelBadge,
  IdentityStatusIndicator,
  SecurityStatusBadge,
  KYCStatusBadge,
  GovernanceBadge,
  SecurityFlagsIndicator,
  IdentityBadgeSet
} from '../IdentityVisualIndicators';
import {
  IdentityType,
  PrivacyLevel,
  IdentityStatus,
  GovernanceType,
  ExtendedSquidIdentity,
  SecurityFlag
} from '@/types/identity';

// Mock identity for testing
const mockIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:test-123',
  name: 'Test Identity',
  type: IdentityType.DAO,
  rootId: 'did:squid:root-123',
  children: [],
  depth: 1,
  path: ['did:squid:root-123'],
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    type: IdentityType.DAO,
    requiresKYC: true,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.DAO
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-test-123',
  qlockKeyPair: {
    publicKey: 'pub-test-123',
    privateKey: 'priv-test-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.DAO_ONLY,
  tags: ['test'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T00:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true,
    level: 'BASIC'
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

describe('IdentityTypeIcon', () => {
  it('renders ROOT identity icon correctly', () => {
    render(<IdentityTypeIcon type={IdentityType.ROOT} />);
    // Crown icon should be present for ROOT type
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders DAO identity icon correctly', () => {
    render(<IdentityTypeIcon type={IdentityType.DAO} />);
    // Users icon should be present for DAO type
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<IdentityTypeIcon type={IdentityType.ROOT} size="sm" />);
    expect(document.querySelector('svg')).toHaveClass('h-3', 'w-3');

    rerender(<IdentityTypeIcon type={IdentityType.ROOT} size="lg" />);
    expect(document.querySelector('svg')).toHaveClass('h-5', 'w-5');
  });
});

describe('IdentityTypeBadge', () => {
  it('renders ROOT type badge with correct label', () => {
    render(<IdentityTypeBadge type={IdentityType.ROOT} />);
    expect(screen.getByText('Root')).toBeInTheDocument();
  });

  it('renders DAO type badge with correct label', () => {
    render(<IdentityTypeBadge type={IdentityType.DAO} />);
    expect(screen.getByText('DAO')).toBeInTheDocument();
  });

  it('renders ENTERPRISE type badge with correct label', () => {
    render(<IdentityTypeBadge type={IdentityType.ENTERPRISE} />);
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('renders CONSENTIDA type badge with correct label', () => {
    render(<IdentityTypeBadge type={IdentityType.CONSENTIDA} />);
    expect(screen.getByText('Consentida')).toBeInTheDocument();
  });

  it('renders AID type badge with correct label', () => {
    render(<IdentityTypeBadge type={IdentityType.AID} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('shows icon when showIcon is true', () => {
    render(<IdentityTypeBadge type={IdentityType.ROOT} showIcon={true} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<IdentityTypeBadge type={IdentityType.ROOT} showIcon={false} />);
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });
});

describe('PrivacyLevelBadge', () => {
  it('renders PUBLIC privacy level correctly', () => {
    render(<PrivacyLevelBadge level={PrivacyLevel.PUBLIC} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders DAO_ONLY privacy level correctly', () => {
    render(<PrivacyLevelBadge level={PrivacyLevel.DAO_ONLY} />);
    expect(screen.getByText('DAO Only')).toBeInTheDocument();
  });

  it('renders PRIVATE privacy level correctly', () => {
    render(<PrivacyLevelBadge level={PrivacyLevel.PRIVATE} />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('renders ANONYMOUS privacy level correctly', () => {
    render(<PrivacyLevelBadge level={PrivacyLevel.ANONYMOUS} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});

describe('IdentityStatusIndicator', () => {
  it('renders ACTIVE status with correct icon and color', () => {
    render(<IdentityStatusIndicator status={IdentityStatus.ACTIVE} showLabel={true} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveClass('text-green-600');
  });

  it('renders INACTIVE status with correct icon and color', () => {
    render(<IdentityStatusIndicator status={IdentityStatus.INACTIVE} showLabel={true} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveClass('text-red-600');
  });

  it('renders SUSPENDED status with correct icon and color', () => {
    render(<IdentityStatusIndicator status={IdentityStatus.SUSPENDED} showLabel={true} />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveClass('text-orange-600');
  });

  it('renders PENDING_VERIFICATION status with correct icon and color', () => {
    render(<IdentityStatusIndicator status={IdentityStatus.PENDING_VERIFICATION} showLabel={true} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveClass('text-blue-600');
  });

  it('hides label when showLabel is false', () => {
    render(<IdentityStatusIndicator status={IdentityStatus.ACTIVE} showLabel={false} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});

describe('SecurityStatusBadge', () => {
  it('renders high security for identity with KYC and no flags', () => {
    const highSecurityIdentity = {
      ...mockIdentity,
      kyc: { required: true, submitted: true, approved: true },
      securityFlags: [],
      lastUsed: new Date().toISOString() // Recent activity
    };
    
    render(<SecurityStatusBadge identity={highSecurityIdentity} />);
    expect(screen.getByText('High Security')).toBeInTheDocument();
  });

  it('renders security risk for identity with critical flags', () => {
    const criticalFlag: SecurityFlag = {
      id: 'flag-1',
      type: 'SECURITY_BREACH',
      severity: 'CRITICAL',
      description: 'Critical security issue',
      timestamp: '2024-01-01T00:00:00Z',
      resolved: false
    };

    const riskIdentity = {
      ...mockIdentity,
      kyc: { required: true, submitted: false, approved: false },
      securityFlags: [criticalFlag]
    };
    
    render(<SecurityStatusBadge identity={riskIdentity} />);
    expect(screen.getByText('Security Risk')).toBeInTheDocument();
  });
});

describe('KYCStatusBadge', () => {
  it('renders KYC Verified for approved KYC', () => {
    const kycData = {
      required: true,
      submitted: true,
      approved: true
    };
    
    render(<KYCStatusBadge kyc={kycData} />);
    expect(screen.getByText('KYC Verified')).toBeInTheDocument();
  });

  it('renders KYC Pending for submitted but not approved KYC', () => {
    const kycData = {
      required: true,
      submitted: true,
      approved: false
    };
    
    render(<KYCStatusBadge kyc={kycData} />);
    expect(screen.getByText('KYC Pending')).toBeInTheDocument();
  });

  it('renders KYC Required for required but not submitted KYC', () => {
    const kycData = {
      required: true,
      submitted: false,
      approved: false
    };
    
    render(<KYCStatusBadge kyc={kycData} />);
    expect(screen.getByText('KYC Required')).toBeInTheDocument();
  });

  it('renders KYC N/A for not required KYC', () => {
    const kycData = {
      required: false,
      submitted: false,
      approved: false
    };
    
    render(<KYCStatusBadge kyc={kycData} />);
    expect(screen.getByText('KYC N/A')).toBeInTheDocument();
  });
});

describe('GovernanceBadge', () => {
  it('renders Self-Governed for SELF governance', () => {
    render(<GovernanceBadge governanceType={GovernanceType.SELF} />);
    expect(screen.getByText('Self-Governed')).toBeInTheDocument();
  });

  it('renders DAO Governed for DAO governance', () => {
    render(<GovernanceBadge governanceType={GovernanceType.DAO} />);
    expect(screen.getByText('DAO Governed')).toBeInTheDocument();
  });

  it('renders Parent Controlled for PARENT governance', () => {
    render(<GovernanceBadge governanceType={GovernanceType.PARENT} />);
    expect(screen.getByText('Parent Controlled')).toBeInTheDocument();
  });

  it('renders Autonomous for AUTONOMOUS governance', () => {
    render(<GovernanceBadge governanceType={GovernanceType.AUTONOMOUS} />);
    expect(screen.getByText('Autonomous')).toBeInTheDocument();
  });
});

describe('SecurityFlagsIndicator', () => {
  it('renders nothing when no flags are present', () => {
    const { container } = render(<SecurityFlagsIndicator flags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders security flags with correct severity colors', () => {
    const flags: SecurityFlag[] = [
      {
        id: 'flag-1',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        description: 'Critical issue',
        timestamp: '2024-01-01T00:00:00Z',
        resolved: false
      },
      {
        id: 'flag-2',
        type: 'MULTIPLE_LOGINS',
        severity: 'HIGH',
        description: 'High issue',
        timestamp: '2024-01-01T00:00:00Z',
        resolved: false
      }
    ];
    
    render(<SecurityFlagsIndicator flags={flags} />);
    expect(screen.getByText('SUSPICIOUS ACTIVITY')).toBeInTheDocument();
    expect(screen.getByText('MULTIPLE LOGINS')).toBeInTheDocument();
  });

  it('shows remaining count when flags exceed maxDisplay', () => {
    const flags: SecurityFlag[] = Array.from({ length: 5 }, (_, i) => ({
      id: `flag-${i}`,
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'MEDIUM' as const,
      description: `Issue ${i}`,
      timestamp: '2024-01-01T00:00:00Z',
      resolved: false
    }));
    
    render(<SecurityFlagsIndicator flags={flags} maxDisplay={2} />);
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });
});

describe('IdentityBadgeSet', () => {
  it('renders all badges when all show props are true', () => {
    render(
      <IdentityBadgeSet
        identity={mockIdentity}
        showType={true}
        showPrivacy={true}
        showStatus={true}
        showSecurity={true}
        showKYC={true}
        showGovernance={true}
        showFlags={false} // No flags in mock identity
      />
    );
    
    expect(screen.getByText('DAO')).toBeInTheDocument();
    expect(screen.getByText('DAO Only')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('KYC Verified')).toBeInTheDocument();
    expect(screen.getByText('DAO Governed')).toBeInTheDocument();
  });

  it('renders only selected badges when specific show props are true', () => {
    render(
      <IdentityBadgeSet
        identity={mockIdentity}
        showType={true}
        showPrivacy={false}
        showStatus={false}
        showSecurity={false}
        showKYC={false}
        showGovernance={false}
        showFlags={false}
      />
    );
    
    expect(screen.getByText('DAO')).toBeInTheDocument();
    expect(screen.queryByText('DAO Only')).not.toBeInTheDocument();
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    render(
      <IdentityBadgeSet
        identity={mockIdentity}
        showType={true}
        size="sm"
      />
    );
    
    // Check that badges have small size classes
    const badge = screen.getByText('DAO').closest('div');
    expect(badge).toHaveClass('text-xs');
  });
});

describe('Component Integration', () => {
  it('all components render without errors', () => {
    const testIdentity = {
      ...mockIdentity,
      securityFlags: [{
        id: 'test-flag',
        type: 'SUSPICIOUS_ACTIVITY' as const,
        severity: 'MEDIUM' as const,
        description: 'Test flag',
        timestamp: '2024-01-01T00:00:00Z',
        resolved: false
      }]
    };

    render(
      <div>
        <IdentityTypeIcon type={IdentityType.ROOT} />
        <IdentityTypeBadge type={IdentityType.DAO} />
        <PrivacyLevelBadge level={PrivacyLevel.PUBLIC} />
        <IdentityStatusIndicator status={IdentityStatus.ACTIVE} />
        <SecurityStatusBadge identity={testIdentity} />
        <KYCStatusBadge kyc={testIdentity.kyc} />
        <GovernanceBadge governanceType={GovernanceType.DAO} />
        <SecurityFlagsIndicator flags={testIdentity.securityFlags} />
        <IdentityBadgeSet identity={testIdentity} />
      </div>
    );

    // All components should render without throwing errors
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(screen.getAllByText('DAO').length).toBeGreaterThanOrEqual(2); // Multiple DAO badges expected
    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});