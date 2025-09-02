# Integration Overview

This guide provides an overview of integrating with the enhanced Qwallet identity-aware wallet system.

## Prerequisites

Before integrating with Qwallet, ensure you have:

1. **sQuid Identity System** - Active identity management
2. **Qlock Integration** - For transaction signing
3. **Qonsent Integration** - For permission validation
4. **Qerberos Integration** - For audit logging

## Quick Integration Steps

### 1. Install Dependencies

```bash
npm install @anarq/qwallet @anarq/squid @anarq/qlock @anarq/qonsent
```

### 2. Setup Identity Context

```tsx
import { IdentityProvider } from '@anarq/squid';
import { QwalletProvider } from '@anarq/qwallet';

function App() {
  return (
    <IdentityProvider>
      <QwalletProvider>
        <YourApp />
      </QwalletProvider>
    </IdentityProvider>
  );
}
```

### 3. Use Wallet Components

```tsx
import { WalletDashboard, TokenTransferForm } from '@anarq/qwallet';
import { useIdentityManager } from '@anarq/squid';

function WalletPage() {
  const { activeIdentity } = useIdentityManager();
  
  return (
    <div>
      <WalletDashboard identityId={activeIdentity.id} />
      <TokenTransferForm identityId={activeIdentity.id} />
    </div>
  );
}
```

## Core Concepts

### Identity-Aware Operations

Every wallet operation is tied to an active identity:

```tsx
const { transfer, getBalance } = useIdentityQwallet(identityId);

// All operations respect identity permissions
const balance = await getBalance('ANARQ');
const result = await transfer({
  to: '0x123...',
  amount: 100,
  token: 'ANARQ'
});
```

### Permission Validation

Operations are automatically validated against Qonsent policies:

```tsx
// This will check Qonsent permissions before executing
const transferResult = await transfer({
  to: recipient,
  amount: amount,
  token: selectedToken
});

if (transferResult.error?.type === 'QONSENT_BLOCKED') {
  // Handle permission denial
  showPermissionError(transferResult.error.message);
}
```

### Automatic Audit Logging

All operations are logged to Qerberos automatically:

```tsx
// Logging happens automatically, but you can add custom metadata
const result = await transfer({
  to: recipient,
  amount: amount,
  token: selectedToken,
  metadata: {
    purpose: 'payment',
    reference: 'invoice-123'
  }
});
```

## Integration Patterns

### 1. Basic Wallet Integration

For simple wallet functionality:

```tsx
import { useIdentityQwallet } from '@anarq/qwallet';

function SimpleWallet({ identityId }) {
  const { balances, transfer, loading } = useIdentityQwallet(identityId);
  
  return (
    <div>
      <h2>Balances</h2>
      {Object.entries(balances).map(([token, amount]) => (
        <div key={token}>{token}: {amount}</div>
      ))}
      
      <TransferForm onTransfer={transfer} />
    </div>
  );
}
```

### 2. Multi-Identity Wallet

For applications supporting multiple identities:

```tsx
function MultiIdentityWallet() {
  const { identities, activeIdentity, switchIdentity } = useIdentityManager();
  
  return (
    <div>
      <IdentitySelector 
        identities={identities}
        active={activeIdentity}
        onSwitch={switchIdentity}
      />
      
      <WalletDashboard identityId={activeIdentity.id} />
    </div>
  );
}
```

### 3. Enterprise Integration

For enterprise applications with enhanced compliance:

```tsx
function EnterpriseWallet({ identityId }) {
  const wallet = useIdentityQwallet(identityId);
  const audit = useWalletAudit(identityId);
  
  return (
    <div>
      <WalletDashboard 
        identityId={identityId}
        showAuditStatus={true}
      />
      
      <ComplianceReportViewer 
        reports={audit.complianceReports}
      />
      
      <AuditStatusDisplay 
        riskAssessment={audit.riskAssessment}
      />
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
# Qwallet Configuration
QWALLET_API_URL=https://api.anarq.com/qwallet
QWALLET_NETWORK=mainnet

# Service Endpoints
QLOCK_API_URL=https://api.anarq.com/qlock
QONSENT_API_URL=https://api.anarq.com/qonsent
QERBEROS_API_URL=https://api.anarq.com/qerberos

# Pi Wallet Integration (optional)
PI_WALLET_API_URL=https://api.minepi.com
PI_WALLET_CLIENT_ID=your_pi_client_id
```

### Provider Configuration

```tsx
import { QwalletProvider } from '@anarq/qwallet';

const qwalletConfig = {
  apiUrl: process.env.QWALLET_API_URL,
  network: process.env.QWALLET_NETWORK,
  enablePiWallet: true,
  auditLevel: 'ENHANCED',
  defaultLimits: {
    dailyTransferLimit: 10000,
    maxTransactionAmount: 5000
  }
};

function App() {
  return (
    <QwalletProvider config={qwalletConfig}>
      <YourApp />
    </QwalletProvider>
  );
}
```

## Error Handling

### Global Error Handling

```tsx
import { QwalletErrorBoundary } from '@anarq/qwallet';

function App() {
  return (
    <QwalletErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Qwallet Error:', error, errorInfo);
        // Send to error reporting service
      }}
      fallback={<WalletErrorFallback />}
    >
      <YourApp />
    </QwalletErrorBoundary>
  );
}
```

### Component-Level Error Handling

```tsx
function WalletComponent({ identityId }) {
  const { error, retry } = useIdentityQwallet(identityId);
  
  if (error) {
    return (
      <ErrorDisplay 
        error={error}
        onRetry={retry}
        suggestions={error.suggestedActions}
      />
    );
  }
  
  // Normal component render
}
```

## Testing Integration

### Mock Setup

```tsx
import { mockQwalletProvider } from '@anarq/qwallet/testing';

describe('Wallet Integration', () => {
  beforeEach(() => {
    mockQwalletProvider({
      balances: { ANARQ: 1000, PI: 500 },
      limits: { dailyTransferLimit: 10000 },
      mockTransfers: true
    });
  });
  
  it('should display balances', () => {
    render(<WalletDashboard identityId="test-id" />);
    expect(screen.getByText('ANARQ: 1000')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const WalletDashboard = lazy(() => import('@anarq/qwallet/WalletDashboard'));

function App() {
  return (
    <Suspense fallback={<WalletSkeleton />}>
      <WalletDashboard identityId={identityId} />
    </Suspense>
  );
}
```

### Data Caching

```tsx
import { useIdentityQwallet } from '@anarq/qwallet';

function OptimizedWallet({ identityId }) {
  const wallet = useIdentityQwallet(identityId, {
    cacheTimeout: 30000, // 30 seconds
    backgroundRefresh: true,
    staleWhileRevalidate: true
  });
  
  return <WalletDashboard {...wallet} />;
}
```

## Next Steps

1. Review the [Component Documentation](../components/)
2. Check out [Code Examples](../examples/)
3. Read [Identity-Specific Guides](../user-guides/)
4. Explore [Advanced Integration Patterns](./advanced-patterns.md)