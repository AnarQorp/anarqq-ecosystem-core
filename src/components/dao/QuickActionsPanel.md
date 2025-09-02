# QuickActionsPanel Component Documentation

## Overview

The `QuickActionsPanel` component provides role-based quick access to wallet operations for DAO members, including token transfers, NFT operations, and other wallet-related actions within the DAO context. It features permission checking, modal integration, and comprehensive feedback systems.

## Features

### ✅ Core Functionality
- **Role-Based Actions** - Permission-based action buttons for different user roles
- **Token Transfer Integration** - Direct integration with TokenTransferForm modal
- **NFT Operations** - NFT minting and gallery viewing capabilities
- **Permission Checking** - Comprehensive role and condition validation
- **Action Feedback** - Real-time success/error feedback with auto-dismiss

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout with proper breakpoints
- **Loading States** - Individual action loading states and feedback
- **Error Handling** - Comprehensive error states with user-friendly messages
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Modal Integration** - Seamless integration with existing wallet components

## Props

```typescript
interface QuickActionsPanelProps {
  daoId: string;                                    // Required: The ID of the DAO
  userRole: 'member' | 'moderator' | 'admin' | 'owner';  // Required: User's role in the DAO
  hasTokens: boolean;                               // Required: Whether user has tokens
  hasNFTs: boolean;                                 // Required: Whether user has NFTs
  onAction: (action: string) => void;               // Required: Action callback
  className?: string;                               // Optional: Additional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { QuickActionsPanel } from '../components/dao';

function DAOActions({ daoId, userRole, hasTokens, hasNFTs }: {
  daoId: string,
  userRole: 'member' | 'moderator' | 'admin' | 'owner',
  hasTokens: boolean,
  hasNFTs: boolean
}) {
  const handleAction = (action: string) => {
    console.log('Action triggered:', action);
    // Handle action analytics, logging, etc.
  };

  return (
    <QuickActionsPanel
      daoId={daoId}
      userRole={userRole}
      hasTokens={hasTokens}
      hasNFTs={hasNFTs}
      onAction={handleAction}
    />
  );
}
```

### Integration with DAODashboard

```tsx
import { QuickActionsPanel, DAODashboard } from '../components/dao';
import { useDAO } from '../composables/useDAO';
import { useQwallet } from '../composables/useQwallet';

function EnhancedDAODashboard({ daoId }: { daoId: string }) {
  const { membership } = useDAO();
  const { balances, nfts } = useQwallet();
  
  const userRole = membership?.role || 'member';
  const hasTokens = Object.keys(balances || {}).length > 0;
  const hasNFTs = (nfts || []).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <QuickActionsPanel
          daoId={daoId}
          userRole={userRole}
          hasTokens={hasTokens}
          hasNFTs={hasNFTs}
          onAction={(action) => {
            // Analytics tracking
            analytics.track('dao_quick_action', { daoId, action, userRole });
          }}
        />
      </div>
    </div>
  );
}
```

### Custom Action Handling

```tsx
import { QuickActionsPanel } from '../components/dao';

function CustomActionsPanel({ daoId }: { daoId: string }) {
  const handleCustomAction = (action: string) => {
    switch (action) {
      case 'mint-nft':
        // Custom NFT minting logic
        trackEvent('nft_mint_initiated', { daoId });
        break;
      case 'transfer-token':
        // Custom token transfer logic
        trackEvent('token_transfer_initiated', { daoId });
        break;
      case 'view-nft-gallery':
        // Custom gallery viewing logic
        trackEvent('nft_gallery_opened', { daoId });
        break;
    }
  };

  return (
    <QuickActionsPanel
      daoId={daoId}
      userRole="moderator"
      hasTokens={true}
      hasNFTs={true}
      onAction={handleCustomAction}
      className="border-2 border-blue-200 shadow-lg"
    />
  );
}
```

## Action System

### Available Actions

```typescript
interface ActionButton {
  id: string;                    // Unique action identifier
  label: string;                 // Display label
  description: string;           // Action description
  icon: React.ComponentType;     // Heroicon component
  variant: 'default' | 'secondary' | 'outline';  // Button variant
  requiredRole: 'member' | 'moderator' | 'admin' | 'owner';  // Minimum role
  requiredCondition?: 'hasTokens' | 'hasNFTs';  // Additional conditions
  disabled?: boolean;            // Whether action is disabled
  disabledReason?: string;       // Reason for being disabled
}
```

### Default Actions Configuration

```typescript
const availableActions: ActionButton[] = [
  {
    id: 'mint-nft',
    label: 'Mint NFT',
    description: 'Create a new NFT for this DAO',
    icon: PlusIcon,
    variant: 'default',
    requiredRole: 'moderator',
    disabled: false
  },
  {
    id: 'transfer-token',
    label: 'Transfer Token',
    description: 'Send DAO tokens to another member',
    icon: CurrencyDollarIcon,
    variant: 'secondary',
    requiredRole: 'member',
    requiredCondition: 'hasTokens',
    disabled: !hasTokens,
    disabledReason: hasTokens ? undefined : 'No tokens available to transfer'
  },
  {
    id: 'view-nft-gallery',
    label: 'View NFT Gallery',
    description: 'Browse your NFT collection',
    icon: PhotoIcon,
    variant: 'outline',
    requiredRole: 'member',
    requiredCondition: 'hasNFTs',
    disabled: !hasNFTs,
    disabledReason: hasNFTs ? undefined : 'No NFTs in your collection'
  }
];
```

## Permission System

### Role Hierarchy

```typescript
const roleHierarchy = ['member', 'moderator', 'admin', 'owner'];

// Check if user has sufficient role
const hasRequiredRole = (userRole: string, requiredRole: string): boolean => {
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
};
```

### Permission Messages

```typescript
const getPermissionMessage = (requiredRole: string): string => {
  const roleMessages = {
    member: 'You need to be a DAO member to access this feature.',
    moderator: 'You need moderator permissions to access this feature.',
    admin: 'You need admin permissions to access this feature.',
    owner: 'You need owner permissions to access this feature.'
  };
  
  return roleMessages[requiredRole] || 'Insufficient permissions.';
};
```

### Role Badge Display

```tsx
// Role badge with appropriate styling
<Badge variant={getRoleBadgeVariant(userRole)}>
  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
</Badge>

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'owner': return 'default';
    case 'admin': return 'secondary';
    case 'moderator': return 'outline';
    default: return 'outline';
  }
};
```

## Modal Integration

### Token Transfer Modal

```tsx
// Token Transfer Modal with automatic refresh
<Dialog 
  open={showTransferModal} 
  onOpenChange={(open) => {
    setShowTransferModal(open);
    if (!open) {
      // Refresh wallet data when modal closes
      refreshWalletData().then(() => {
        setActionFeedback({
          type: 'success',
          message: 'Wallet data refreshed after token transfer',
          action: 'transfer-token'
        });
      });
    }
  }}
>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Transfer Tokens</DialogTitle>
    </DialogHeader>
    <TokenTransferForm />
  </DialogContent>
</Dialog>
```

### NFT Gallery Modal

```tsx
// NFT Gallery Modal with responsive sizing
<Dialog 
  open={showNFTGallery} 
  onOpenChange={setShowNFTGallery}
>
  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>NFT Gallery</DialogTitle>
    </DialogHeader>
    <NFTGallery />
  </DialogContent>
</Dialog>
```

### NFT Minting Modal

```tsx
// Custom NFT minting modal with form validation
<Dialog open={showMintNFTModal} onOpenChange={setShowMintNFTModal}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Mint New NFT</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* NFT Name */}
      <div>
        <label htmlFor="nft-name" className="block text-sm font-medium text-gray-700 mb-1">
          NFT Name *
        </label>
        <input
          type="text"
          id="nft-name"
          value={mintNFTForm.name}
          onChange={(e) => setMintNFTForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter NFT name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      
      {/* Additional form fields... */}
    </div>
  </DialogContent>
</Dialog>
```

## NFT Minting System

### NFT Form Interface

```typescript
interface MintNFTForm {
  name: string;                                    // NFT name
  description: string;                             // NFT description
  image: string;                                   // Image URL (optional)
  attributes: Array<{                              // Custom attributes
    trait_type: string;
    value: string;
  }>;
}
```

### NFT Minting Process

```typescript
const handleMintNFT = async () => {
  if (!session?.issuer || !mintNFTForm.name.trim() || !mintNFTForm.description.trim()) {
    setActionFeedback({
      type: 'error',
      message: 'Please fill in all required fields (Name and Description)',
      action: 'mint-nft'
    });
    return;
  }

  setMintingNFT(true);
  
  try {
    const mintParams: MintNFTParams = {
      name: mintNFTForm.name.trim(),
      description: mintNFTForm.description.trim(),
      image: mintNFTForm.image.trim() || undefined,
      attributes: [
        ...mintNFTForm.attributes.filter(attr => attr.trait_type && attr.value),
        // Add DAO-specific attributes
        { trait_type: 'dao_id', value: daoId },
        { trait_type: 'minted_by_role', value: userRole }
      ]
    };

    const nft = await mintNFT(mintParams);
    
    if (nft) {
      setActionFeedback({
        type: 'success',
        message: `Successfully minted NFT "${mintNFTForm.name}" for DAO`,
        action: 'mint-nft'
      });

      // Reset form and close modal
      setMintNFTForm({ name: '', description: '', image: '', attributes: [] });
      setShowMintNFTModal(false);
      
      // Refresh wallet data
      await refreshWalletData();
    }
  } catch (err) {
    setActionFeedback({
      type: 'error',
      message: `Failed to mint NFT: ${err.message}`,
      action: 'mint-nft'
    });
  } finally {
    setMintingNFT(false);
  }
};
```

### Dynamic Attributes Management

```typescript
// Add NFT attribute
const addNFTAttribute = () => {
  setMintNFTForm(prev => ({
    ...prev,
    attributes: [...prev.attributes, { trait_type: '', value: '' }]
  }));
};

// Remove NFT attribute
const removeNFTAttribute = (index: number) => {
  setMintNFTForm(prev => ({
    ...prev,
    attributes: prev.attributes.filter((_, i) => i !== index)
  }));
};

// Update NFT attribute
const updateNFTAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
  setMintNFTForm(prev => ({
    ...prev,
    attributes: prev.attributes.map((attr, i) => 
      i === index ? { ...attr, [field]: value } : attr
    )
  }));
};
```

## Feedback System

### Action Feedback Interface

```typescript
interface ActionFeedback {
  type: 'success' | 'error' | null;
  message: string;
  action?: string;
}
```

### Feedback Display

```tsx
// Action feedback with auto-dismiss
{actionFeedback.type && (
  <div className={`mb-4 border rounded-lg p-3 ${
    actionFeedback.type === 'success' 
      ? 'bg-green-50 border-green-200' 
      : 'bg-red-50 border-red-200'
  }`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {actionFeedback.type === 'success' ? (
          <InformationCircleIcon className="h-4 w-4 text-green-400 mr-2" />
        ) : (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2" />
        )}
        <p className={`text-sm ${
          actionFeedback.type === 'success' ? 'text-green-800' : 'text-red-800'
        }`}>
          {actionFeedback.message}
        </p>
      </div>
      <button
        onClick={() => setActionFeedback({ type: null, message: '' })}
        className={`text-sm hover:underline ${
          actionFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        Dismiss
      </button>
    </div>
  </div>
)}
```

### Auto-Dismiss Timer

```typescript
// Clear feedback after 5 seconds
useEffect(() => {
  if (actionFeedback.type) {
    const timer = setTimeout(() => {
      setActionFeedback({ type: null, message: '' });
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [actionFeedback]);
```

## Loading States

### Individual Action Loading

```typescript
// Loading states for different actions
const [actionLoading, setActionLoading] = useState<{
  [key: string]: boolean;
}>({});

// Set loading state for specific action
const handleActionClick = (actionId: string) => {
  setActionLoading(prev => ({ ...prev, [actionId]: true }));
  
  try {
    // Execute action
  } finally {
    setTimeout(() => {
      setActionLoading(prev => ({ ...prev, [actionId]: false }));
    }, 500);
  }
};
```

### Loading Button Display

```tsx
// Button with loading state
<Button
  onClick={() => handleActionClick(action.id)}
  disabled={action.disabled || loading || actionLoading[action.id]}
  variant={action.variant}
  className="w-full justify-start h-auto p-4"
>
  <div className="flex items-center w-full">
    {actionLoading[action.id] ? (
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3 flex-shrink-0"></div>
    ) : (
      <action.icon className="h-5 w-5 mr-3 flex-shrink-0" />
    )}
    <div className="flex-1 text-left">
      <div className="font-medium">
        {actionLoading[action.id] ? 'Loading...' : action.label}
      </div>
      <div className="text-sm opacity-75 mt-1">
        {action.description}
      </div>
    </div>
  </div>
</Button>
```

## Authentication States

### Unauthenticated State

```tsx
// Authentication required message
if (!isAuthenticated) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <LockClosedIcon className="h-5 w-5 mr-2 text-gray-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 text-sm">
            Please authenticate with your sQuid identity to access wallet operations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### No Actions Available State

```tsx
// No actions available for current role
{actionButtons.length === 0 ? (
  <div className="text-center py-6">
    <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      No Actions Available
    </h3>
    <p className="text-gray-600 text-sm">
      {getPermissionMessage('moderator')}
    </p>
  </div>
) : (
  // Action buttons list
)}
```

## Accessibility Features

### WCAG 2.1 Compliance

- **Keyboard Navigation**: Full keyboard accessibility with proper tab order
- **Screen Reader Support**: Comprehensive ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio for all text
- **Focus Management**: Clear focus indicators and logical navigation
- **Alternative Text**: Descriptive text for all visual elements

### Screen Reader Descriptions

```typescript
// Generate comprehensive description for screen readers
const actionsDescription = describeQuickActions(
  actionButtons.map(action => ({
    label: action.label,
    description: action.description,
    enabled: !action.disabled,
    reason: action.disabledReason
  }))
);
```

### ARIA Implementation

```tsx
<Card 
  ref={containerRef}
  className={cn("w-full", className)}
  role="region"
  aria-label="Quick Actions Panel"
>
  {/* Screen reader description */}
  <DataDescription 
    data={{
      type: 'navigation',
      title: 'Quick Actions Panel',
      summary: actionsDescription,
      instructions: 'Use Tab to navigate actions, Enter or Space to activate buttons'
    }}
  />
</Card>
```

## Error Handling

### Error Categories

1. **Authentication Errors**: User not authenticated
2. **Permission Errors**: Insufficient role or conditions
3. **Network Errors**: API connectivity issues
4. **Validation Errors**: Invalid form data
5. **Action Errors**: Specific action execution failures

### Error Display Strategy

```tsx
// Error from useQwallet hook
{error && (
  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
    <div className="flex items-center">
      <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2" />
      <p className="text-red-800 text-sm">{error}</p>
    </div>
  </div>
)}
```

## Performance Optimizations

### Memoization

```typescript
// Component wrapped with React.memo
const QuickActionsPanel: React.FC<QuickActionsPanelProps> = React.memo(({
  daoId,
  userRole,
  hasTokens,
  hasNFTs,
  onAction,
  className
}) => {
  // Component implementation
});

// Action buttons filtered and memoized
const filteredActions = useMemo(() => {
  return availableActions.filter(action => {
    const roleHierarchy = ['member', 'moderator', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(action.requiredRole);
    return userRoleIndex >= requiredRoleIndex;
  });
}, [userRole, hasTokens, hasNFTs]);
```

### Efficient State Management

- **Minimal Re-renders**: Uses React.memo and proper dependency arrays
- **Debounced Actions**: Prevents rapid action triggering
- **Lazy Loading**: Modal content loaded only when needed
- **Cleanup**: Proper cleanup of timers and event listeners

## Responsive Design

### Breakpoints

- **Mobile (< 640px)**: Single column, full-width buttons
- **Small (640px - 768px)**: Optimized button sizing
- **Medium (768px - 1024px)**: Proper spacing and typography
- **Large (> 1024px)**: Full layout with optimal spacing

### Mobile Optimizations

```tsx
// Full-width buttons on mobile
<Button
  className="w-full justify-start h-auto p-4"
  variant={action.variant}
>
  {/* Button content */}
</Button>

// Responsive modal sizing
<DialogContent className="max-w-md sm:max-w-lg">
  {/* Modal content */}
</DialogContent>
```

## Integration Points

### Hook Dependencies

```typescript
// Required hooks for functionality
const { isAuthenticated, session } = useSessionContext();
const { balances, nfts, loading, error, mintNFT, refreshWalletData } = useQwallet();
```

### Performance Monitoring

```typescript
const { getMountTime } = useRenderMonitoring('QuickActionsPanel', { daoId, userRole });
```

### Accessibility Integration

```typescript
const { containerRef, focusFirst } = useKeyboardNavigation({
  enabled: true,
  autoFocus: false
});
```

## Testing

### Test Coverage

- **Permission System**: All role combinations and conditions
- **Action Execution**: All action types and their outcomes
- **Modal Integration**: Modal opening, closing, and data refresh
- **Error Handling**: Network errors, validation errors, and permission errors
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: All breakpoints and layout variations
- **User Interactions**: Button clicks, form submissions, and feedback

### Test Examples

```typescript
// Permission-based rendering test
test('shows only appropriate actions for user role', () => {
  render(
    <QuickActionsPanel
      daoId="test-dao"
      userRole="member"
      hasTokens={true}
      hasNFTs={false}
      onAction={jest.fn()}
    />
  );
  
  expect(screen.getByText('Transfer Token')).toBeInTheDocument();
  expect(screen.queryByText('Mint NFT')).not.toBeInTheDocument();
});

// NFT minting test
test('handles NFT minting process correctly', async () => {
  const mockMintNFT = jest.fn().mockResolvedValue({ tokenId: '123' });
  
  render(
    <QuickActionsPanel
      daoId="test-dao"
      userRole="moderator"
      hasTokens={false}
      hasNFTs={false}
      onAction={jest.fn()}
    />
  );
  
  fireEvent.click(screen.getByText('Mint NFT'));
  
  // Fill form and submit
  fireEvent.change(screen.getByLabelText('NFT Name *'), {
    target: { value: 'Test NFT' }
  });
  fireEvent.change(screen.getByLabelText('Description *'), {
    target: { value: 'Test Description' }
  });
  
  fireEvent.click(screen.getByText('Mint NFT'));
  
  await waitFor(() => {
    expect(mockMintNFT).toHaveBeenCalledWith({
      name: 'Test NFT',
      description: 'Test Description',
      attributes: [
        { trait_type: 'dao_id', value: 'test-dao' },
        { trait_type: 'minted_by_role', value: 'moderator' }
      ]
    });
  });
});
```

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Modal Support**: Full Dialog API support required

## Dependencies

### Required

- React 18+
- TypeScript 4.5+
- TailwindCSS 3.0+
- Heroicons React

### Peer Dependencies

- `useQwallet` hook from composables
- `useSessionContext` from contexts
- UI components from components/ui
- TokenTransferForm and NFTGallery components
- Accessibility utilities from utils/accessibility

## Future Enhancements

### Planned Features

1. **Custom Actions**: Support for DAO-specific custom actions
2. **Batch Operations**: Multiple token transfers or NFT operations
3. **Scheduled Actions**: Time-based action scheduling
4. **Action History**: History of performed actions
5. **Advanced Permissions**: Fine-grained permission system

### Integration Roadmap

1. **Governance Integration**: Proposal creation and voting actions
2. **DeFi Integration**: Staking, yield farming, and liquidity actions
3. **Social Features**: Member interaction and communication actions
4. **Analytics**: Detailed action analytics and insights

## Troubleshooting

### Common Issues

1. **Actions Not Showing**: Check user role and authentication status
2. **Modal Not Opening**: Verify component integration and dependencies
3. **NFT Minting Failing**: Check wallet connection and permissions
4. **Feedback Not Displaying**: Verify state management and error handling

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('QuickActions state:', {
    isAuthenticated,
    userRole,
    hasTokens,
    hasNFTs,
    actionButtons: actionButtons.length,
    loading,
    error
  });
}
```

## Contributing

When contributing to the QuickActionsPanel component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test permission system thoroughly
6. Verify modal integration
7. Test error handling and edge cases

## License

Part of the AnarQ&Q ecosystem under the project license.