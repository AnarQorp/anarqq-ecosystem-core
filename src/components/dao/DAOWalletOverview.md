# DAOWalletOverview Component Documentation

## Overview

The `DAOWalletOverview` component displays authenticated DAO member's wallet balance, NFT count, and voting power with real-time updates and proper authentication checks. It provides comprehensive wallet information specific to the DAO context within the AnarQ&Q ecosystem.

## Features

### ✅ Core Functionality
- **Token Balance Display** - DAO governance token balance with trend indicators
- **NFT Summary** - Count and preview of DAO-issued NFTs
- **Voting Power Calculator** - Real-time voting weight based on holdings
- **Authentication Checks** - Proper access control and membership validation
- **Real-time Updates** - Automatic refresh and manual refresh capabilities

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout with proper breakpoints
- **Loading States** - Skeleton loaders and progressive loading
- **Error Handling** - Comprehensive error states with user-friendly messages
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Visual Feedback** - Interactive elements with hover states and transitions

## Props

```typescript
interface DAOWalletOverviewProps {
  daoId: string;              // Required: The ID of the DAO
  squidId?: string;           // Optional: User's sQuid ID (defaults to session)
  daoTokenSymbol?: string;    // Optional: DAO token symbol (auto-detected)
  className?: string;         // Optional: Additional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { DAOWalletOverview } from '../components/dao';

function MemberWalletInfo({ daoId }: { daoId: string }) {
  return (
    <div className="space-y-6">
      <DAOWalletOverview daoId={daoId} />
    </div>
  );
}
```

### With Specific User and Token

```tsx
import { DAOWalletOverview } from '../components/dao';

function CustomWalletOverview({ daoId, userId, tokenSymbol }: { 
  daoId: string, 
  userId: string, 
  tokenSymbol: string 
}) {
  return (
    <DAOWalletOverview 
      daoId={daoId} 
      squidId={userId}
      daoTokenSymbol={tokenSymbol}
      className="border-2 border-blue-200"
    />
  );
}
```

### Integration with DAODashboard

```tsx
import { DAOWalletOverview, DAODashboard } from '../components/dao';

function EnhancedDAODashboard({ daoId }: { daoId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <DAOWalletOverview daoId={daoId} />
      </div>
    </div>
  );
}
```

## Authentication States

### Authenticated Member State

```tsx
// Full wallet overview for authenticated DAO members
<Card>
  <CardHeader>
    <CardTitle className="flex items-center">
      <WalletIcon className="h-6 w-6 text-blue-600 mr-2" />
      My Wallet Overview
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Token balance, NFTs, voting power */}
  </CardContent>
</Card>
```

### Unauthenticated State

```tsx
// Authentication prompt for unauthenticated users
<Card className="border-yellow-200">
  <CardContent className="p-6">
    <div className="text-center">
      <LockClosedIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Authentication Required
      </h3>
      <p className="text-gray-600 mb-4">
        Please authenticate with your sQuid identity to view your wallet overview.
      </p>
    </div>
  </CardContent>
</Card>
```

### Non-Member State

```tsx
// Membership requirement message for non-members
<Card className="border-blue-200">
  <CardContent className="p-6">
    <div className="text-center">
      <UserIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Membership Required
      </h3>
      <p className="text-gray-600 mb-4">
        You need to be a member of this DAO to view wallet information.
      </p>
    </div>
  </CardContent>
</Card>
```

## Data Interfaces

### VotingPower Interface

```typescript
interface VotingPower {
  tokenWeight: number;        // Weight from token holdings
  nftWeight: number;          // Weight from NFT holdings
  totalWeight: number;        // Combined voting weight
  percentageOfTotal: number;  // Percentage of total DAO voting power
  rank?: number;              // Ranking among all members
}
```

### BalanceTrend Interface

```typescript
interface BalanceTrend {
  current: number;            // Current balance
  previous?: number;          // Previous balance (for comparison)
  change?: number;            // Absolute change
  changePercentage?: number;  // Percentage change
  trend: 'up' | 'down' | 'stable';  // Trend direction
}
```

## Token Balance Features

### Balance Display with Formatting

```typescript
// Format balance with proper decimals
const formatBalance = (balance: number, decimals: number = 18): string => {
  if (balance === 0) return '0';
  
  const divisor = Math.pow(10, decimals);
  const formatted = balance / divisor;
  
  if (formatted >= 1000000) {
    return (formatted / 1000000).toFixed(2) + 'M';
  } else if (formatted >= 1000) {
    return (formatted / 1000).toFixed(2) + 'K';
  } else if (formatted >= 1) {
    return formatted.toFixed(2);
  } else {
    return formatted.toFixed(6);
  }
};
```

### Balance Trend Indicators

```tsx
// Trend display with icons and colors
const getTrendDisplay = (trend: BalanceTrend) => {
  switch (trend.trend) {
    case 'up':
      return {
        icon: TrendingUpIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        text: `+${Math.abs(trend.changePercentage || 0).toFixed(1)}%`
      };
    case 'down':
      return {
        icon: TrendingDownIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: `-${Math.abs(trend.changePercentage || 0).toFixed(1)}%`
      };
    default:
      return {
        icon: null,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        text: 'No change'
      };
  }
};
```

## NFT Integration

### DAO-Specific NFT Filtering

```typescript
// Filter NFTs that belong to this DAO
const filteredNFTs = allNFTs.filter(nft => {
  // Check if NFT has DAO-specific attributes
  const hasDAOAttribute = nft.attributes?.some(attr => 
    (attr.trait_type === 'dao_id' && attr.value === daoId) ||
    (attr.trait_type === 'issuer' && attr.value.includes(daoId)) ||
    (attr.trait_type === 'organization' && attr.value === currentDAO?.name)
  );

  // Check if NFT contract address is related to DAO
  const isDAOContract = nft.contractAddress?.toLowerCase()
    .includes(daoId.toLowerCase().substring(0, 8));

  // Check if NFT name/description mentions the DAO
  const mentionsDAO = currentDAO?.name && (
    nft.name.toLowerCase().includes(currentDAO.name.toLowerCase()) ||
    nft.description.toLowerCase().includes(currentDAO.name.toLowerCase())
  );

  return hasDAOAttribute || isDAOContract || mentionsDAO;
});
```

### NFT Preview Gallery

```tsx
// Recent NFTs preview with responsive grid
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {daoNFTs.slice(0, 4).map((nft, index) => (
    <div key={nft.tokenId} className="group relative">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-purple-300 transition-colors">
        {nft.image ? (
          <img 
            src={nft.image} 
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-xs font-medium text-gray-900 truncate">
          {nft.name}
        </div>
        <div className="text-xs text-gray-500 truncate">
          #{nft.tokenId}
        </div>
      </div>
    </div>
  ))}
</div>
```

## Voting Power Calculation

### Multi-Mechanism Support

```typescript
const calculateVotingPower = (
  tokenBalance: Balance | null, 
  nftCount: number, 
  dao: DetailedDAO | null
): VotingPower => {
  if (!dao) return { tokenWeight: 0, nftWeight: 0, totalWeight: 0, percentageOfTotal: 0 };

  const votingMechanism = dao.governanceRules?.votingMechanism || 'user-based';
  let tokenWeight = 0;
  let nftWeight = 0;

  switch (votingMechanism) {
    case 'token-weighted':
      tokenWeight = tokenBalance?.balance || 0;
      nftWeight = 0;
      break;
    
    case 'nft-weighted':
      tokenWeight = 0;
      nftWeight = nftCount;
      break;
    
    case 'user-based':
    default:
      // In user-based voting, each member gets 1 vote regardless of holdings
      tokenWeight = (tokenBalance?.balance || 0) > 0 ? 1 : 0;
      nftWeight = nftCount > 0 ? 1 : 0;
      break;
  }

  const totalWeight = Math.max(tokenWeight + nftWeight, votingMechanism === 'user-based' ? 1 : 0);
  
  // Calculate percentage of total voting weight
  const estimatedTotalDAOWeight = dao.memberCount * (votingMechanism === 'user-based' ? 1 : 100);
  const percentageOfTotal = estimatedTotalDAOWeight > 0 ? (totalWeight / estimatedTotalDAOWeight) * 100 : 0;

  return {
    tokenWeight,
    nftWeight,
    totalWeight,
    percentageOfTotal: Math.min(percentageOfTotal, 100)
  };
};
```

### Voting Power Visualization

```tsx
// Accessible voting power display
<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
  <AccessibleProgress
    value={votingPower.percentageOfTotal}
    max={100}
    label="Your Voting Influence"
    showPercentage={true}
    colorScheme="default"
    size="md"
    className="mb-2"
  />
  <div className="text-xs text-blue-700 mt-2">
    Based on current token holdings and NFT ownership
  </div>
</div>
```

## Data Fetching Strategy

### Parallel Data Loading

```typescript
const loadWalletData = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch data in parallel for optimal performance
    const [tokenBalance, nftList] = await Promise.all([
      fetchDaoTokenBalance(),
      fetchDaoNFTs()
    ]);

    // Calculate voting power
    if (currentDAO) {
      const power = calculateVotingPower(tokenBalance, nftList.length, currentDAO);
      setVotingPower(power);
    }

    // Calculate balance trend
    if (tokenBalance) {
      const trend = calculateBalanceTrend(tokenBalance.balance);
      setBalanceTrend(trend);
    }

    setLastUpdated(new Date());
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Automatic Token Symbol Detection

```typescript
// Determine DAO token symbol from multiple sources
const daoTokenSymbol = useMemo(() => {
  if (propDaoTokenSymbol) return propDaoTokenSymbol;
  if (currentDAO?.governanceRules?.tokenRequirement?.token) {
    return currentDAO.governanceRules.tokenRequirement.token;
  }
  if (currentDAO?.name) {
    return currentDAO.name.toUpperCase().substring(0, 4) + 'TOKEN';
  }
  return 'DAOTOKEN';
}, [propDaoTokenSymbol, currentDAO]);
```

## Refresh Functionality

### Manual Refresh

```tsx
// Refresh button with loading state
<Button
  onClick={handleRefresh}
  disabled={refreshing}
  variant="outline"
  size="sm"
>
  <ArrowPathIcon className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
  {refreshing ? 'Refreshing...' : 'Refresh'}
</Button>
```

### Automatic Refresh

```typescript
// Refresh wallet data and reload component data
const handleRefresh = async () => {
  setRefreshing(true);
  try {
    await refreshWalletData(); // Refresh underlying wallet data
    await loadWalletData();    // Reload component-specific data
  } catch (err) {
    console.error('Refresh error:', err);
  } finally {
    setRefreshing(false);
  }
};
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
const walletDescription = daoTokenBalance ? describeWalletOverview({
  tokenBalance: daoTokenBalance.balance,
  tokenSymbol: daoTokenBalance.tokenInfo.symbol,
  nftCount: daoNFTs.length,
  votingPower: votingPower.percentageOfTotal
}) : '';
```

### Data Table Fallback

```tsx
// Alternative data representation for complex visualizations
{shouldShowDataTable && (
  <table className="min-w-full divide-y divide-gray-200" role="table">
    <caption className="sr-only">
      Voting power breakdown showing token weight, NFT weight, and total influence
    </caption>
    <thead className="bg-gray-50">
      <tr>
        <th scope="col">Component</th>
        <th scope="col">Weight</th>
        <th scope="col">Percentage</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      <tr>
        <td scope="row">Token Weight</td>
        <td>{votingPower.tokenWeight.toLocaleString()}</td>
        <td>{((votingPower.tokenWeight / votingPower.totalWeight) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td scope="row">NFT Weight</td>
        <td>{votingPower.nftWeight.toLocaleString()}</td>
        <td>{((votingPower.nftWeight / votingPower.totalWeight) * 100).toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
)}
```

## Error Handling

### Error Categories

1. **Authentication Errors**: User not authenticated
2. **Membership Errors**: User not a DAO member
3. **Network Errors**: API connectivity issues
4. **Data Errors**: Invalid or missing wallet data
5. **Permission Errors**: Insufficient access rights

### Error Display

```tsx
// Comprehensive error display with context
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    </div>
  </div>
)}
```

## Performance Optimizations

### Memoization

```typescript
// DAO token symbol calculation is memoized
const daoTokenSymbol = useMemo(() => {
  // Complex token symbol determination logic
}, [propDaoTokenSymbol, currentDAO]);

// Voting power calculation is memoized
const votingPower = useMemo(() => {
  return calculateVotingPower(daoTokenBalance, daoNFTs.length, currentDAO);
}, [daoTokenBalance, daoNFTs.length, currentDAO]);
```

### Efficient Data Loading

- **Parallel Fetching**: Token balance and NFT data loaded simultaneously
- **Conditional Loading**: Only loads data for authenticated members
- **Lazy Loading**: NFT images loaded progressively
- **Debounced Updates**: Prevents excessive re-renders

### Component Optimization

```typescript
// Component wrapped with React.memo for prop-based re-rendering
const DAOWalletOverview: React.FC<DAOWalletOverviewProps> = React.memo(({
  daoId,
  squidId: propSquidId,
  daoTokenSymbol: propDaoTokenSymbol,
  className
}) => {
  // Component implementation
});
```

## Responsive Design

### Breakpoints

- **Mobile (< 640px)**: Single column, stacked elements
- **Small (640px - 768px)**: Two-column grid for metrics
- **Medium (768px - 1024px)**: Optimized spacing and typography
- **Large (> 1024px)**: Multi-column layouts with proper spacing

### Mobile Optimizations

```tsx
// Responsive grid layouts
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Token balance and NFT count */}
</div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {/* Voting power breakdown */}
</div>

<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {/* NFT preview gallery */}
</div>
```

## Integration Points

### Hook Dependencies

```typescript
// Required hooks for functionality
const { isAuthenticated, session } = useSessionContext();
const { currentDAO, membership, getMembership } = useDAO();
const { 
  getBalance, 
  getAllBalances, 
  listUserNFTs, 
  balances, 
  nfts, 
  refreshWalletData 
} = useQwallet();
```

### Performance Monitoring

```typescript
const { getMountTime } = useRenderMonitoring('DAOWalletOverview', { daoId });
```

### Accessibility Integration

```typescript
const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
  highContrast: false,
  colorBlindFriendly: false,
  preferDataTable: false
});
```

## Testing

### Test Coverage

- **Authentication States**: All authentication and membership scenarios
- **Data Loading**: Token balance and NFT fetching
- **Voting Power**: Calculation for different governance mechanisms
- **Error Handling**: Network errors, invalid data, and permission issues
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: All breakpoints and layout variations
- **User Interactions**: Refresh functionality and hover states

### Test Examples

```typescript
// Authentication state test
test('shows authentication prompt for unauthenticated users', () => {
  const mockUseSessionContext = {
    isAuthenticated: false,
    session: null
  };
  
  render(<DAOWalletOverview daoId="test-dao" />);
  
  expect(screen.getByText('Authentication Required')).toBeInTheDocument();
  expect(screen.getByText('Please authenticate with your sQuid identity')).toBeInTheDocument();
});

// Voting power calculation test
test('calculates voting power correctly for token-weighted governance', async () => {
  const mockDAO = {
    governanceRules: { votingMechanism: 'token-weighted' },
    memberCount: 100
  };
  const mockTokenBalance = { balance: 1000, tokenInfo: { decimals: 18 } };
  
  render(<DAOWalletOverview daoId="test-dao" />);
  
  await waitFor(() => {
    expect(screen.getByText('1000')).toBeInTheDocument(); // Token weight
    expect(screen.getByText('0')).toBeInTheDocument();    // NFT weight
  });
});
```

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers

## Dependencies

### Required

- React 18+
- TypeScript 4.5+
- TailwindCSS 3.0+
- Heroicons React

### Peer Dependencies

- `useDAO` hook from composables
- `useQwallet` hook from composables
- `useSessionContext` from contexts
- UI components from components/ui
- Accessibility utilities from utils/accessibility

## Future Enhancements

### Planned Features

1. **Historical Data**: Token balance and NFT acquisition history
2. **Staking Integration**: Staked token display and management
3. **Delegation Features**: Vote delegation interface
4. **Portfolio Analytics**: Detailed wallet analytics and insights
5. **Multi-DAO View**: Wallet overview across multiple DAOs

### Integration Roadmap

1. **DeFi Integration**: Yield farming and liquidity provision
2. **Cross-chain Support**: Multi-blockchain wallet information
3. **Social Features**: Member comparison and leaderboards
4. **Advanced Analytics**: Detailed voting behavior analysis

## Troubleshooting

### Common Issues

1. **Wallet Data Not Loading**: Check authentication and membership status
2. **NFTs Not Showing**: Verify NFT filtering logic and DAO attributes
3. **Voting Power Incorrect**: Check governance mechanism configuration
4. **Refresh Not Working**: Verify wallet service connectivity

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Wallet state:', {
    isAuthenticated,
    squidId,
    membership: membership?.isMember,
    tokenBalance: daoTokenBalance,
    nftCount: daoNFTs.length,
    votingPower
  });
}
```

## Contributing

When contributing to the DAOWalletOverview component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test authentication and membership scenarios
6. Verify responsive design
7. Test error handling and edge cases

## License

Part of the AnarQ&Q ecosystem under the project license.