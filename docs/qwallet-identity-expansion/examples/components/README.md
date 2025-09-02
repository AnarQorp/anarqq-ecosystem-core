# Component Examples

This directory contains practical React component examples for the Qwallet identity-aware wallet system.

## Available Examples

### Core Components
- **[basic-wallet-dashboard.tsx](./basic-wallet-dashboard.tsx)** - Complete wallet dashboard with identity awareness
- **[token-transfer-form.tsx](./token-transfer-form.tsx)** - Comprehensive token transfer form with validation
- **[transaction-history.tsx](./transaction-history.tsx)** - Transaction history with filtering and privacy controls
- **[pi-wallet-integration.tsx](./pi-wallet-integration.tsx)** - Pi Network wallet integration component
- **[audit-status-display.tsx](./audit-status-display.tsx)** - Security and compliance status display

### Utility Components
- **[wallet-limit-indicator.tsx](./wallet-limit-indicator.tsx)** - Visual limit usage indicators
- **[identity-selector.tsx](./identity-selector.tsx)** - Identity switching component
- **[security-badge.tsx](./security-badge.tsx)** - Security status indicators
- **[compliance-report-viewer.tsx](./compliance-report-viewer.tsx)** - Compliance report display

## Usage Patterns

### Basic Integration
```tsx
import { BasicWalletDashboard } from './basic-wallet-dashboard';
import { useIdentityManager } from '@/hooks/useIdentityManager';

function MyWalletApp() {
  const { activeIdentity } = useIdentityManager();
  
  return (
    <BasicWalletDashboard 
      identityId={activeIdentity.id}
      showTransferForm={true}
    />
  );
}
```

### Advanced Customization
```tsx
import { TokenTransferForm } from './token-transfer-form';

function CustomTransferPage() {
  return (
    <TokenTransferForm 
      identityId="my-identity"
      onTransferComplete={(result) => {
        console.log('Transfer completed:', result);
      }}
    />
  );
}
```

## Component Guidelines

All components follow these principles:
- **Identity Awareness**: Accept identityId prop and adapt behavior
- **Error Handling**: Graceful error states and recovery
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive Design**: Mobile-first responsive layouts
- **Type Safety**: Full TypeScript support with proper interfaces