# Code Examples

This directory contains practical code examples for integrating with the Qwallet identity-aware wallet system.

## Example Categories

### [Component Examples](./components/)
Ready-to-use React component examples
- Basic wallet dashboard implementation
- Token transfer form with validation
- Transaction history with filtering
- Pi Wallet integration examples
- Audit status displays

### [Hook Examples](./hooks/)
Custom hook implementations and usage patterns
- Identity-aware wallet state management
- Pi Wallet operations
- Audit and risk monitoring
- Error handling patterns

### [Service Examples](./services/)
Service integration examples
- Qlock signing integration
- Qonsent permission validation
- Qerberos audit logging
- Custom service implementations

### [Integration Examples](./integration/)
Complete integration scenarios
- Multi-identity wallet application
- Enterprise compliance dashboard
- DAO treasury management
- Anonymous wallet operations

### [Testing Examples](./testing/)
Testing patterns and utilities
- Component testing with identity mocks
- Service integration testing
- End-to-end testing scenarios
- Performance testing examples

## Quick Start Examples

### Basic Wallet Component

```tsx
import React from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { WalletDashboard } from '@/components/qwallet';

function BasicWallet({ identityId }: { identityId: string }) {
  const { balances, loading, error } = useIdentityQwallet(identityId);
  
  if (loading) return <div>Loading wallet...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="wallet-container">
      <h2>My Wallet</h2>
      <WalletDashboard identityId={identityId} />
    </div>
  );
}

export default BasicWallet;
```

### Token Transfer Example

```tsx
import React, { useState } from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { TokenTransferForm } from '@/components/qwallet';

function TransferExample({ identityId }: { identityId: string }) {
  const { transfer } = useIdentityQwallet(identityId);
  const [transferResult, setTransferResult] = useState(null);
  
  const handleTransfer = async (transferData) => {
    try {
      const result = await transfer(transferData);
      setTransferResult(result);
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };
  
  return (
    <div>
      <TokenTransferForm 
        identityId={identityId}
        onTransferComplete={handleTransfer}
      />
      {transferResult && (
        <div className="transfer-result">
          Transfer {transferResult.success ? 'successful' : 'failed'}
        </div>
      )}
    </div>
  );
}

export default TransferExample;
```

### Multi-Identity Wallet

```tsx
import React from 'react';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { WalletDashboard } from '@/components/qwallet';

function MultiIdentityWallet() {
  const { 
    identities, 
    activeIdentity, 
    switchIdentity 
  } = useIdentityManager();
  
  return (
    <div className="multi-identity-wallet">
      <div className="identity-selector">
        <h3>Select Identity</h3>
        {identities.map(identity => (
          <button
            key={identity.id}
            onClick={() => switchIdentity(identity.id)}
            className={`identity-button ${
              activeIdentity.id === identity.id ? 'active' : ''
            }`}
          >
            {identity.type} - {identity.name}
          </button>
        ))}
      </div>
      
      <div className="wallet-content">
        <WalletDashboard 
          identityId={activeIdentity.id}
          showPiWallet={true}
          showAuditStatus={true}
        />
      </div>
    </div>
  );
}

export default MultiIdentityWallet;
```

## Advanced Examples

### Enterprise Compliance Dashboard

```tsx
import React from 'react';
import { useWalletAudit } from '@/hooks/useWalletAudit';
import { 
  WalletDashboard, 
  AuditStatusDisplay,
  ComplianceReportViewer 
} from '@/components/qwallet';

function ComplianceDashboard({ identityId }: { identityId: string }) {
  const { 
    riskAssessment, 
    complianceReports, 
    auditLogs 
  } = useWalletAudit(identityId);
  
  return (
    <div className="compliance-dashboard">
      <div className="dashboard-header">
        <h1>Enterprise Wallet Dashboard</h1>
        <AuditStatusDisplay riskAssessment={riskAssessment} />
      </div>
      
      <div className="dashboard-content">
        <div className="wallet-section">
          <WalletDashboard 
            identityId={identityId}
            showAuditStatus={true}
          />
        </div>
        
        <div className="compliance-section">
          <ComplianceReportViewer 
            reports={complianceReports}
            onGenerateReport={() => {/* Generate new report */}}
          />
        </div>
      </div>
    </div>
  );
}

export default ComplianceDashboard;
```

### Pi Wallet Integration

```tsx
import React from 'react';
import { usePiWallet } from '@/hooks/usePiWallet';
import { PiWalletInterface } from '@/components/qwallet';

function PiWalletExample({ identityId }: { identityId: string }) {
  const { 
    piWalletStatus, 
    linkPiWallet, 
    unlinkPiWallet,
    transferToPi,
    transferFromPi 
  } = usePiWallet(identityId);
  
  return (
    <div className="pi-wallet-integration">
      <h2>Pi Wallet Integration</h2>
      
      <PiWalletInterface 
        identityId={identityId}
        showBalance={true}
        allowTransfers={true}
        onConnectionChange={(connected) => {
          console.log('Pi Wallet connection:', connected);
        }}
      />
      
      {!piWalletStatus.connected && (
        <button onClick={linkPiWallet}>
          Link Pi Wallet
        </button>
      )}
      
      {piWalletStatus.connected && (
        <div className="pi-operations">
          <button onClick={() => transferToPi(100, 'ANARQ')}>
            Transfer to Pi
          </button>
          <button onClick={() => transferFromPi(50, 'PI')}>
            Transfer from Pi
          </button>
          <button onClick={unlinkPiWallet}>
            Unlink Pi Wallet
          </button>
        </div>
      )}
    </div>
  );
}

export default PiWalletExample;
```

## Testing Examples

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletDashboard } from '@/components/qwallet';
import { mockQwalletProvider } from '@/testing/mocks';

describe('WalletDashboard', () => {
  beforeEach(() => {
    mockQwalletProvider({
      balances: { ANARQ: 1000, PI: 500 },
      limits: { dailyTransferLimit: 10000 },
      identityType: 'ROOT'
    });
  });
  
  it('displays balances for ROOT identity', () => {
    render(<WalletDashboard identityId="root-123" />);
    
    expect(screen.getByText('ANARQ: 1000')).toBeInTheDocument();
    expect(screen.getByText('PI: 500')).toBeInTheDocument();
  });
  
  it('shows transfer button for ROOT identity', () => {
    render(<WalletDashboard identityId="root-123" />);
    
    expect(screen.getByText('Transfer Tokens')).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { mockServices } from '@/testing/mocks';

describe('useIdentityQwallet Integration', () => {
  beforeEach(() => {
    mockServices({
      qlock: { signTransaction: jest.fn().mockResolvedValue('signature') },
      qonsent: { checkPermission: jest.fn().mockResolvedValue(true) },
      qerberos: { logEvent: jest.fn().mockResolvedValue(true) }
    });
  });
  
  it('performs complete transfer flow', async () => {
    const { result } = renderHook(() => 
      useIdentityQwallet('test-identity')
    );
    
    await act(async () => {
      const transferResult = await result.current.transfer({
        to: '0x123...',
        amount: 100,
        token: 'ANARQ'
      });
      
      expect(transferResult.success).toBe(true);
    });
  });
});
```

## Usage Patterns

### Error Handling Pattern

```tsx
import React from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { WalletErrorBoundary } from '@/components/qwallet';

function RobustWallet({ identityId }: { identityId: string }) {
  return (
    <WalletErrorBoundary
      onError={(error) => console.error('Wallet error:', error)}
      fallback={<div>Wallet temporarily unavailable</div>}
    >
      <WalletContent identityId={identityId} />
    </WalletErrorBoundary>
  );
}

function WalletContent({ identityId }: { identityId: string }) {
  const { balances, error, retry } = useIdentityQwallet(identityId);
  
  if (error) {
    return (
      <div className="error-state">
        <p>Error: {error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }
  
  return <WalletDashboard identityId={identityId} />;
}
```

### Performance Optimization Pattern

```tsx
import React, { memo, useMemo } from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';

const OptimizedWallet = memo(({ identityId }: { identityId: string }) => {
  const walletData = useIdentityQwallet(identityId, {
    cacheTimeout: 30000,
    backgroundRefresh: true
  });
  
  const memoizedBalances = useMemo(() => 
    Object.entries(walletData.balances).map(([token, amount]) => ({
      token,
      amount,
      formatted: `${amount.toLocaleString()} ${token}`
    })),
    [walletData.balances]
  );
  
  return (
    <div className="optimized-wallet">
      {memoizedBalances.map(({ token, formatted }) => (
        <div key={token}>{formatted}</div>
      ))}
    </div>
  );
});

export default OptimizedWallet;
```

## Next Steps

1. Explore specific [Component Examples](./components/)
2. Review [Hook Usage Patterns](./hooks/)
3. Check [Service Integration Examples](./services/)
4. Try [Testing Examples](./testing/)
5. Build your own integration using these patterns