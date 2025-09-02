# WalletDashboard Component

The `WalletDashboard` is the main wallet interface component that provides an identity-aware view of wallet information, balances, and operations.

## Props

```typescript
interface WalletDashboardProps {
  identityId: string;
  compact?: boolean;
  showPiWallet?: boolean;
  showAuditStatus?: boolean;
  className?: string;
  onTransactionClick?: (transaction: Transaction) => void;
  onTransferClick?: () => void;
}
```

## Usage

### Basic Usage

```tsx
import { WalletDashboard } from '@/components/qwallet';

function MyWalletPage() {
  const { activeIdentity } = useIdentityManager();
  
  return (
    <WalletDashboard 
      identityId={activeIdentity.id}
      showPiWallet={true}
      showAuditStatus={true}
    />
  );
}
```

### Compact Mode

```tsx
<WalletDashboard 
  identityId={identityId}
  compact={true}
  className="max-w-md"
/>
```

### With Event Handlers

```tsx
<WalletDashboard 
  identityId={identityId}
  onTransactionClick={(tx) => navigate(`/transaction/${tx.id}`)}
  onTransferClick={() => setShowTransferModal(true)}
/>
```

## Features by Identity Type

### ROOT Identity
- Full wallet access with admin controls
- All token types visible
- Maximum transaction limits
- Emergency controls available
- Complete audit trail access

### DAO Identity
- DAO-approved tokens only
- Governance-controlled limits
- Proposal-based large transactions
- DAO treasury integration
- Collective decision indicators

### ENTERPRISE Identity
- Business-focused token display
- Corporate compliance indicators
- Restricted DeFi operations
- Enhanced audit logging
- Multi-signature requirements

### CONSENTIDA Identity
- Simplified interface for minors
- Guardian approval indicators
- Spending limit visualizations
- Educational tooltips
- Parental control status

### AID Identity
- Anonymous operation mode
- Single token support
- Minimal metadata display
- Session-based storage
- Privacy-first design

## State Management

The component uses the `useIdentityQwallet` hook for state management:

```tsx
const {
  balances,
  limits,
  recentTransactions,
  riskStatus,
  piWalletStatus,
  loading,
  error,
  refreshData
} = useIdentityQwallet(identityId);
```

## Styling

The component supports Tailwind CSS classes and follows the design system:

```tsx
<WalletDashboard 
  identityId={identityId}
  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
/>
```

## Accessibility

- Keyboard navigation support
- Screen reader compatible
- ARIA labels for all interactive elements
- High contrast mode support
- Focus management

## Error Handling

The component handles various error states:

- Network connectivity issues
- Permission denied errors
- Service unavailability
- Invalid identity states
- Data loading failures

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { WalletDashboard } from './WalletDashboard';

describe('WalletDashboard', () => {
  it('renders for ROOT identity', () => {
    render(<WalletDashboard identityId="root-123" />);
    expect(screen.getByText('Wallet Dashboard')).toBeInTheDocument();
  });
  
  it('shows Pi Wallet when enabled', () => {
    render(
      <WalletDashboard 
        identityId="root-123" 
        showPiWallet={true} 
      />
    );
    expect(screen.getByText('Pi Wallet')).toBeInTheDocument();
  });
});
```

## Performance Considerations

- Lazy loading of transaction history
- Memoized balance calculations
- Debounced refresh operations
- Efficient re-rendering on identity switch
- Background data updates