# Component Documentation

This section provides detailed documentation for all Qwallet identity-aware components.

## Core Components

### Wallet Components
- **[WalletDashboard](./WalletDashboard.md)** - Main wallet interface with identity-specific views
- **[TokenTransferForm](./TokenTransferForm.md)** - Identity-aware token transfer component
- **[TransactionHistory](./TransactionHistory.md)** - Privacy-aware transaction history display
- **[PiWalletInterface](./PiWalletInterface.md)** - Pi Network wallet integration component
- **[AuditStatusDisplay](./AuditStatusDisplay.md)** - Security and compliance status display

### Utility Components
- **[WalletLimitIndicator](./WalletLimitIndicator.md)** - Visual limit usage indicators
- **[IdentityWalletSelector](./IdentityWalletSelector.md)** - Identity context switching
- **[SecurityStatusBadge](./SecurityStatusBadge.md)** - Security status indicators
- **[ComplianceReportViewer](./ComplianceReportViewer.md)** - Compliance report display

## Hooks Documentation
- **[useIdentityQwallet](./hooks/useIdentityQwallet.md)** - Core identity wallet hook
- **[useQwalletState](./hooks/useQwalletState.md)** - Centralized state management
- **[usePiWallet](./hooks/usePiWallet.md)** - Pi Wallet operations hook
- **[useWalletAudit](./hooks/useWalletAudit.md)** - Audit and risk management hook

## Services Documentation
- **[EnhancedQwalletService](./services/EnhancedQwalletService.md)** - Core wallet service
- **[PiWalletService](./services/PiWalletService.md)** - Pi Network integration service
- **[QonsentWalletService](./services/QonsentWalletService.md)** - Permission validation service
- **[WalletAuditService](./services/WalletAuditService.md)** - Audit and risk assessment service

## Component Guidelines

### Identity Awareness
All components must:
- Accept an `identityId` prop
- Validate operations against identity permissions
- Display appropriate UI based on identity type
- Handle identity switching gracefully

### Error Handling
Components should:
- Display user-friendly error messages
- Provide recovery suggestions
- Log errors appropriately
- Maintain UI stability during errors

### Accessibility
All components must:
- Support keyboard navigation
- Provide ARIA labels and descriptions
- Maintain proper color contrast
- Support screen readers

### Testing
Each component should have:
- Unit tests for all identity types
- Integration tests with services
- Accessibility tests
- Error scenario tests