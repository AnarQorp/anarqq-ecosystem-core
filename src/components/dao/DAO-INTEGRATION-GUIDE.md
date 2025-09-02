# DAO Components Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the enhanced DAO dashboard components with the useDAO and useQwallet hooks, including setup, configuration, and best practices for the AnarQ&Q ecosystem.

## Quick Start

### Basic Integration

```tsx
import React from 'react';
import { 
  DAODashboard,
  TokenOverviewPanel,
  DAOWalletOverview,
  QuickActionsPanel,
  ProposalStatsSidebar
} from '../components/dao';
import { useDAO } from '../composables/useDAO';
import { useQwallet } from '../composables/useQwallet';
import { useSessionContext } from '../contexts/SessionContext';

function EnhancedDAOPage({ daoId }: { daoId: string }) {
  const { currentDAO, proposals, membership, results } = useDAO();
  const { balances, nfts } = useQwallet();
  const { isAuthenticated } = useSessionContext();

  // Determine user role and wallet status
  const userRole = membership?.role || 'member';
  const hasTokens = Object.keys(balances || {}).length > 0;
  const hasNFTs = (nfts || []).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <DAODashboard daoId={daoId} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <TokenOverviewPanel daoId={daoId} />
            
            {isAuthenticated && membership?.isMember && (
              <>
                <DAOWalletOverview daoId={daoId} />
                <QuickActionsPanel
                  daoId={daoId}
                  userRole={userRole}
                  hasTokens={hasTokens}
                  hasNFTs={hasNFTs}
                  onAction={(action) => console.log('Action:', action)}
                />
              </>
            )}
            
            <ProposalStatsSidebar
              daoId={daoId}
              proposals={proposals}
              results={results}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedDAOPage;
```

## Hook Integration

### useDAO Hook Requirements

The enhanced components require specific data from the useDAO hook:

```typescript
// Required useDAO data
const {
  currentDAO,           // DAO details with governance rules
  proposals,           // Array of proposals for statistics
  membership,          // User's membership status and role
  results,            // DAO results for analytics
  getDAO,             // Function to fetch DAO details
  getMembership,      // Function to check membership
  loading,            // Loading state
  error              // Error state
} = useDAO();
```

### useQwallet Hook Requirements

The wallet components require specific data from the useQwallet hook:

```typescript
// Required useQwallet data
const {
  balances,           // User's token balances
  nfts,              // User's NFT collection
  getBalance,        // Function to get specific token balance
  listUserNFTs,      // Function to list user's NFTs
  mintNFT,           // Function to mint new NFTs
  refreshWalletData, // Function to refresh wallet data
  loading,           // Loading state
  error             // Error state
} = useQwallet();
```

### SessionContext Requirements

Authentication and user session data:

```typescript
// Required session data
const {
  isAuthenticated,    // Authentication status
  session            // User session with issuer (sQuid ID)
} = useSessionContext();
```

## Component Configuration

### TokenOverviewPanel Configuration

```tsx
// Basic configuration
<TokenOverviewPanel 
  daoId={daoId}
  className="border-2 border-blue-200"
/>

// With pre-loaded token information
<TokenOverviewPanel 
  daoId={daoId}
  tokenInfo={{
    name: "Governance Token",
    symbol: "GOV",
    totalSupply: 1000000,
    circulatingSupply: 750000,
    holderCount: 150,
    contractAddress: "0x123...",
    type: "token-weighted",
    decimals: 18,
    network: "ethereum"
  }}
/>
```

### DAOWalletOverview Configuration

```tsx
// Basic configuration (auto-detects user and token)
<DAOWalletOverview daoId={daoId} />

// With specific user and token
<DAOWalletOverview 
  daoId={daoId}
  squidId="did:squid:user123"
  daoTokenSymbol="GOVTOKEN"
  className="bg-gradient-to-br from-blue-50 to-indigo-50"
/>
```

### QuickActionsPanel Configuration

```tsx
// Full configuration with all props
<QuickActionsPanel
  daoId={daoId}
  userRole={membership?.role || 'member'}
  hasTokens={Object.keys(balances || {}).length > 0}
  hasNFTs={(nfts || []).length > 0}
  onAction={(action) => {
    // Handle action analytics
    analytics.track('dao_action', { daoId, action });
    
    // Custom action handling
    switch (action) {
      case 'mint-nft':
        console.log('NFT minting initiated');
        break;
      case 'transfer-token':
        console.log('Token transfer initiated');
        break;
      case 'view-nft-gallery':
        console.log('NFT gallery opened');
        break;
    }
  }}
  className="border border-gray-200 shadow-sm"
/>
```

### ProposalStatsSidebar Configuration

```tsx
// Basic configuration
<ProposalStatsSidebar
  daoId={daoId}
  proposals={proposals}
  results={results}
/>

// With custom styling
<ProposalStatsSidebar
  daoId={daoId}
  proposals={proposals}
  results={results}
  className="bg-white border-2 border-gray-200 shadow-lg rounded-xl"
/>
```

## Layout Patterns

### Desktop Layout (Recommended)

```tsx
// 3-column layout for desktop
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  {/* Main content - 3 columns */}
  <div className="lg:col-span-3">
    <DAODashboard daoId={daoId} />
  </div>
  
  {/* Sidebar - 1 column */}
  <div className="space-y-6">
    <TokenOverviewPanel daoId={daoId} />
    <DAOWalletOverview daoId={daoId} />
    <QuickActionsPanel {...quickActionProps} />
    <ProposalStatsSidebar {...statsProps} />
  </div>
</div>
```

### Mobile Layout

```tsx
// Stacked layout for mobile
<div className="space-y-6">
  {/* Priority order for mobile */}
  <DAODashboard daoId={daoId} />
  <TokenOverviewPanel daoId={daoId} />
  <DAOWalletOverview daoId={daoId} />
  <QuickActionsPanel {...quickActionProps} />
  <ProposalStatsSidebar {...statsProps} />
</div>
```

### Compact Layout

```tsx
// 2-column compact layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-6">
    <DAODashboard daoId={daoId} />
  </div>
  <div className="space-y-4">
    <TokenOverviewPanel daoId={daoId} className="h-fit" />
    <DAOWalletOverview daoId={daoId} className="h-fit" />
  </div>
</div>
```

## Data Flow Management

### Centralized Data Loading

```tsx
// Custom hook for centralized DAO data management
function useEnhancedDAO(daoId: string) {
  const daoHook = useDAO();
  const walletHook = useQwallet();
  const sessionHook = useSessionContext();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all required data
  const loadDAOData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load DAO data
      await daoHook.getDAO(daoId);
      
      // Load membership if authenticated
      if (sessionHook.isAuthenticated) {
        await daoHook.getMembership(daoId);
        await walletHook.refreshWalletData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DAO data');
    } finally {
      setLoading(false);
    }
  }, [daoId, daoHook, walletHook, sessionHook.isAuthenticated]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadDAOData();
  }, [loadDAOData]);

  return {
    ...daoHook,
    ...walletHook,
    ...sessionHook,
    loading: loading || daoHook.loading || walletHook.loading,
    error: error || daoHook.error || walletHook.error,
    refreshAll: loadDAOData
  };
}

// Usage in component
function EnhancedDAOPage({ daoId }: { daoId: string }) {
  const {
    currentDAO,
    proposals,
    membership,
    results,
    balances,
    nfts,
    isAuthenticated,
    loading,
    error,
    refreshAll
  } = useEnhancedDAO(daoId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refreshAll} />;

  // Render components with data
  return (
    <div>
      {/* Components */}
    </div>
  );
}
```

### Real-time Data Updates

```tsx
// WebSocket integration for real-time updates
function useRealTimeDAO(daoId: string) {
  const enhancedDAO = useEnhancedDAO(daoId);
  
  useEffect(() => {
    // Subscribe to DAO updates
    const unsubscribe = subscribeToDAOUpdates(daoId, (update) => {
      switch (update.type) {
        case 'proposal_created':
        case 'proposal_updated':
        case 'vote_cast':
          enhancedDAO.refreshAll();
          break;
        case 'token_transfer':
        case 'nft_minted':
          enhancedDAO.refreshWalletData();
          break;
      }
    });

    return unsubscribe;
  }, [daoId, enhancedDAO]);

  return enhancedDAO;
}
```

## Error Handling Strategies

### Component-Level Error Boundaries

```tsx
// Error boundary for DAO components
class DAOErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DAO Component Error:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Component Error
          </h3>
          <p className="text-red-700 text-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<DAOErrorBoundary>
  <TokenOverviewPanel daoId={daoId} />
</DAOErrorBoundary>
```

### Graceful Degradation

```tsx
// Component with graceful degradation
function RobustDAODashboard({ daoId }: { daoId: string }) {
  const { currentDAO, proposals, membership, loading, error } = useDAO();
  const { balances, nfts } = useQwallet();
  const { isAuthenticated } = useSessionContext();

  return (
    <div className="space-y-6">
      {/* Core DAO dashboard always renders */}
      <DAODashboard daoId={daoId} />
      
      {/* Token overview with error fallback */}
      <DAOErrorBoundary
        fallback={
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Token information temporarily unavailable
            </p>
          </div>
        }
      >
        <TokenOverviewPanel daoId={daoId} />
      </DAOErrorBoundary>
      
      {/* Wallet overview only for authenticated members */}
      {isAuthenticated && membership?.isMember && (
        <DAOErrorBoundary>
          <DAOWalletOverview daoId={daoId} />
        </DAOErrorBoundary>
      )}
      
      {/* Quick actions with permission checks */}
      {isAuthenticated && (
        <DAOErrorBoundary>
          <QuickActionsPanel
            daoId={daoId}
            userRole={membership?.role || 'member'}
            hasTokens={Object.keys(balances || {}).length > 0}
            hasNFTs={(nfts || []).length > 0}
            onAction={(action) => console.log('Action:', action)}
          />
        </DAOErrorBoundary>
      )}
      
      {/* Statistics with data validation */}
      {proposals && proposals.length > 0 && (
        <DAOErrorBoundary>
          <ProposalStatsSidebar
            daoId={daoId}
            proposals={proposals}
            results={null}
          />
        </DAOErrorBoundary>
      )}
    </div>
  );
}
```

## Performance Optimization

### Lazy Loading Components

```tsx
// Lazy load heavy components
const TokenOverviewPanel = React.lazy(() => import('./TokenOverviewPanel'));
const DAOWalletOverview = React.lazy(() => import('./DAOWalletOverview'));
const QuickActionsPanel = React.lazy(() => import('./QuickActionsPanel'));
const ProposalStatsSidebar = React.lazy(() => import('./ProposalStatsSidebar'));

function LazyDAODashboard({ daoId }: { daoId: string }) {
  return (
    <div className="space-y-6">
      <DAODashboard daoId={daoId} />
      
      <Suspense fallback={<ComponentSkeleton />}>
        <TokenOverviewPanel daoId={daoId} />
      </Suspense>
      
      <Suspense fallback={<ComponentSkeleton />}>
        <DAOWalletOverview daoId={daoId} />
      </Suspense>
      
      <Suspense fallback={<ComponentSkeleton />}>
        <QuickActionsPanel {...props} />
      </Suspense>
      
      <Suspense fallback={<ComponentSkeleton />}>
        <ProposalStatsSidebar {...props} />
      </Suspense>
    </div>
  );
}
```

### Memoization Strategies

```tsx
// Memoized component wrapper
const MemoizedDAOComponents = React.memo(function DAOComponents({
  daoId,
  currentDAO,
  proposals,
  membership,
  balances,
  nfts,
  isAuthenticated
}: {
  daoId: string;
  currentDAO: any;
  proposals: any[];
  membership: any;
  balances: any;
  nfts: any[];
  isAuthenticated: boolean;
}) {
  // Memoize expensive calculations
  const userRole = useMemo(() => membership?.role || 'member', [membership]);
  const hasTokens = useMemo(() => Object.keys(balances || {}).length > 0, [balances]);
  const hasNFTs = useMemo(() => (nfts || []).length > 0, [nfts]);
  
  // Memoize action handler
  const handleAction = useCallback((action: string) => {
    console.log('Action:', action);
    // Handle action
  }, []);

  return (
    <div className="space-y-6">
      <TokenOverviewPanel daoId={daoId} />
      
      {isAuthenticated && membership?.isMember && (
        <>
          <DAOWalletOverview daoId={daoId} />
          <QuickActionsPanel
            daoId={daoId}
            userRole={userRole}
            hasTokens={hasTokens}
            hasNFTs={hasNFTs}
            onAction={handleAction}
          />
        </>
      )}
      
      <ProposalStatsSidebar
        daoId={daoId}
        proposals={proposals}
        results={null}
      />
    </div>
  );
});
```

## Testing Integration

### Component Integration Tests

```typescript
// Integration test for enhanced DAO dashboard
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedDAODashboard } from './EnhancedDAODashboard';
import { useDAO } from '../composables/useDAO';
import { useQwallet } from '../composables/useQwallet';
import { useSessionContext } from '../contexts/SessionContext';

// Mock hooks
jest.mock('../composables/useDAO');
jest.mock('../composables/useQwallet');
jest.mock('../contexts/SessionContext');

const mockUseDAO = useDAO as jest.MockedFunction<typeof useDAO>;
const mockUseQwallet = useQwallet as jest.MockedFunction<typeof useQwallet>;
const mockUseSessionContext = useSessionContext as jest.MockedFunction<typeof useSessionContext>;

describe('EnhancedDAODashboard Integration', () => {
  beforeEach(() => {
    // Setup default mock returns
    mockUseDAO.mockReturnValue({
      currentDAO: {
        id: 'test-dao',
        name: 'Test DAO',
        governanceRules: { votingMechanism: 'token-weighted' }
      },
      proposals: [],
      membership: { isMember: true, role: 'member' },
      results: null,
      loading: false,
      error: null
    });

    mockUseQwallet.mockReturnValue({
      balances: { 'TEST': { balance: 1000, tokenInfo: { symbol: 'TEST' } } },
      nfts: [],
      loading: false,
      error: null
    });

    mockUseSessionContext.mockReturnValue({
      isAuthenticated: true,
      session: { issuer: 'did:squid:test' }
    });
  });

  test('renders all components for authenticated member', async () => {
    render(<EnhancedDAODashboard daoId="test-dao" />);

    // Check that all components are rendered
    await waitFor(() => {
      expect(screen.getByText('Test DAO')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });
  });

  test('hides wallet components for unauthenticated users', () => {
    mockUseSessionContext.mockReturnValue({
      isAuthenticated: false,
      session: null
    });

    render(<EnhancedDAODashboard daoId="test-dao" />);

    expect(screen.queryByText('My Wallet Overview')).not.toBeInTheDocument();
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
  });

  test('handles loading states correctly', () => {
    mockUseDAO.mockReturnValue({
      ...mockUseDAO(),
      loading: true
    });

    render(<EnhancedDAODashboard daoId="test-dao" />);

    // Check for loading skeletons
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
  });
});
```

### Hook Integration Tests

```typescript
// Test hook integration
import { renderHook, act } from '@testing-library/react';
import { useEnhancedDAO } from './useEnhancedDAO';

describe('useEnhancedDAO Hook', () => {
  test('loads all required data on mount', async () => {
    const { result } = renderHook(() => useEnhancedDAO('test-dao'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      // Wait for data loading
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.currentDAO).toBeDefined();
    expect(result.current.balances).toBeDefined();
  });

  test('handles errors gracefully', async () => {
    // Mock error scenario
    const { result } = renderHook(() => useEnhancedDAO('invalid-dao'));

    await act(async () => {
      // Wait for error
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });
});
```

## Accessibility Integration

### Screen Reader Support

```tsx
// Enhanced accessibility integration
function AccessibleDAODashboard({ daoId }: { daoId: string }) {
  const { currentDAO, proposals, membership } = useDAO();
  
  // Announce important changes to screen readers
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (currentDAO) {
      setAnnouncement(`Loaded ${currentDAO.name} DAO dashboard with ${proposals.length} proposals`);
    }
  }, [currentDAO, proposals.length]);

  return (
    <div>
      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Skip navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Skip to main content
      </a>
      
      {/* Main content with proper landmarks */}
      <main id="main-content" role="main">
        <h1 className="sr-only">
          {currentDAO?.name} DAO Dashboard
        </h1>
        
        <section aria-label="DAO Overview">
          <DAODashboard daoId={daoId} />
        </section>
        
        <aside aria-label="DAO Statistics and Tools">
          <TokenOverviewPanel daoId={daoId} />
          <DAOWalletOverview daoId={daoId} />
          <QuickActionsPanel {...props} />
          <ProposalStatsSidebar {...props} />
        </aside>
      </main>
    </div>
  );
}
```

## Deployment Considerations

### Environment Configuration

```typescript
// Environment-specific configuration
const config = {
  development: {
    enableDebugLogging: true,
    enablePerformanceMonitoring: true,
    cacheTimeout: 1000, // 1 second for development
  },
  production: {
    enableDebugLogging: false,
    enablePerformanceMonitoring: true,
    cacheTimeout: 300000, // 5 minutes for production
  }
};

// Use in components
const currentConfig = config[process.env.NODE_ENV as keyof typeof config] || config.development;
```

### Bundle Optimization

```typescript
// Code splitting for better performance
const EnhancedDAODashboard = React.lazy(() => 
  import('./EnhancedDAODashboard').then(module => ({
    default: module.EnhancedDAODashboard
  }))
);

// Preload critical components
const preloadComponents = () => {
  import('./TokenOverviewPanel');
  import('./DAOWalletOverview');
};

// Call preload on user interaction
document.addEventListener('mouseover', preloadComponents, { once: true });
```

## Migration Guide

### From Basic DAO Dashboard

```tsx
// Before: Basic DAO dashboard
function OldDAODashboard({ daoId }: { daoId: string }) {
  return <DAODashboard daoId={daoId} />;
}

// After: Enhanced DAO dashboard
function NewDAODashboard({ daoId }: { daoId: string }) {
  const { currentDAO, proposals, membership, results } = useDAO();
  const { balances, nfts } = useQwallet();
  const { isAuthenticated } = useSessionContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <TokenOverviewPanel daoId={daoId} />
        {isAuthenticated && membership?.isMember && (
          <>
            <DAOWalletOverview daoId={daoId} />
            <QuickActionsPanel
              daoId={daoId}
              userRole={membership?.role || 'member'}
              hasTokens={Object.keys(balances || {}).length > 0}
              hasNFTs={(nfts || []).length > 0}
              onAction={(action) => console.log('Action:', action)}
            />
          </>
        )}
        <ProposalStatsSidebar
          daoId={daoId}
          proposals={proposals}
          results={results}
        />
      </div>
    </div>
  );
}
```

### Breaking Changes

1. **New Dependencies**: Components now require useQwallet and enhanced useDAO hooks
2. **Layout Changes**: Default layout is now 4-column grid instead of single column
3. **Authentication Requirements**: Wallet components require authentication
4. **Props Changes**: Some components have new required props

### Migration Checklist

- [ ] Update useDAO hook to provide enhanced data
- [ ] Add useQwallet hook integration
- [ ] Update SessionContext to provide authentication state
- [ ] Update layouts to accommodate new components
- [ ] Test authentication flows
- [ ] Verify responsive design
- [ ] Update tests for new components
- [ ] Update documentation

## Support and Resources

### Documentation Links

- [TokenOverviewPanel Documentation](./TokenOverviewPanel.md)
- [DAOWalletOverview Documentation](./DAOWalletOverview.md)
- [QuickActionsPanel Documentation](./QuickActionsPanel.md)
- [ProposalStatsSidebar Documentation](./ProposalStatsSidebar.md)

### Common Issues

See the [Troubleshooting Guide](./TROUBLESHOOTING.md) for solutions to common integration issues.

### Community Support

- GitHub Issues: Report bugs and request features
- Discord: Real-time community support
- Documentation: Comprehensive guides and examples

## License

Part of the AnarQ&Q ecosystem under the project license.