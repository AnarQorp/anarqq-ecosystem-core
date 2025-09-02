# TokenOverviewPanel Component Documentation

## Overview

The `TokenOverviewPanel` component displays comprehensive token information for a DAO including name, symbol, supply metrics, holder count, and governance mechanism indicators. It provides fallback data fetching strategies and caching for optimal performance within the AnarQ&Q ecosystem.

## Features

### ✅ Core Functionality
- **Token Information Display** - Complete token details with name, symbol, and type
- **Supply Metrics** - Total supply, circulating supply, and holder statistics
- **Governance Indicators** - Visual badges for voting mechanisms (user-based, token-weighted, NFT-weighted)
- **Fallback Data Sources** - Primary DAO service with QwalletService fallback
- **Caching System** - 5-minute cache for token information with automatic refresh

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout with proper breakpoints
- **Loading States** - Skeleton loaders and progressive loading
- **Error Handling** - Comprehensive error states with retry functionality
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Visual Feedback** - Interactive elements with hover states and transitions

## Props

```typescript
interface TokenOverviewPanelProps {
  daoId: string;           // Required: The ID of the DAO
  tokenInfo?: TokenInfo;   // Optional: Pre-loaded token information
  className?: string;      // Optional: Additional CSS classes
}
```

### TokenInfo Interface

```typescript
interface TokenInfo {
  name: string;                    // Token name (e.g., "Governance Token")
  symbol: string;                  // Token symbol (e.g., "GOV")
  totalSupply: number;            // Total token supply
  circulatingSupply: number;      // Circulating token supply
  holderCount: number;            // Number of token holders
  contractAddress: string;        // Smart contract address
  type: 'user-based' | 'token-weighted' | 'nft-weighted';  // Governance type
  decimals?: number;              // Token decimals (default: 18)
  network?: string;               // Blockchain network (default: "ethereum")
}
```

## Usage

### Basic Usage

```tsx
import { TokenOverviewPanel } from '../components/dao';

function DAOTokenInfo({ daoId }: { daoId: string }) {
  return (
    <div className="space-y-6">
      <TokenOverviewPanel daoId={daoId} />
    </div>
  );
}
```

### With Pre-loaded Token Information

```tsx
import { TokenOverviewPanel } from '../components/dao';

function DAOTokenInfo({ daoId, tokenData }: { daoId: string, tokenData: TokenInfo }) {
  return (
    <TokenOverviewPanel 
      daoId={daoId} 
      tokenInfo={tokenData}
      className="border-2 border-blue-200"
    />
  );
}
```

### Integration with DAODashboard

```tsx
import { TokenOverviewPanel, DAODashboard } from '../components/dao';

function EnhancedDAODashboard({ daoId }: { daoId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <TokenOverviewPanel daoId={daoId} />
      </div>
    </div>
  );
}
```

## Data Fetching Strategy

### Primary Data Source: Enhanced DAO Service

```typescript
// Primary: Try to get enhanced DAO data with token information
const dao = await getDAO(daoId);
if (dao && dao.tokenInfo) {
  tokenData = dao.tokenInfo;
  dataSource = 'dao-service';
}
```

### Fallback 1: QwalletService

```typescript
// Fallback: Try QwalletService for token information
const daoTokenSymbol = currentDAO.governanceRules?.tokenRequirement?.token;
const balanceInfo = await getBalance('system', daoTokenSymbol);
if (balanceInfo?.tokenInfo) {
  tokenData = createTokenInfoFromBalance(balanceInfo);
  dataSource = 'wallet-service';
}
```

### Fallback 2: Synthetic Data

```typescript
// Final fallback: Create synthetic token info from available DAO data
tokenData = {
  name: `${currentDAO.name} Governance Token`,
  symbol: currentDAO.name.toUpperCase().substring(0, 4) + 'TOKEN',
  totalSupply: 1000000,
  circulatingSupply: Math.floor(currentDAO.memberCount * 100),
  holderCount: currentDAO.memberCount || 0,
  contractAddress: '0x' + daoId.substring(0, 40).padEnd(40, '0'),
  type: determineGovernanceType(currentDAO.governanceRules),
  decimals: 18,
  network: 'ethereum'
};
```

## Caching System

### Cache Configuration

```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface TokenCache {
  [daoId: string]: {
    data: TokenInfo;
    timestamp: number;
  };
}
```

### Cache Usage

- **Cache Check**: Automatically checks for valid cached data before API calls
- **Cache Update**: Updates cache after successful data fetch
- **Cache Expiry**: 5-minute expiration with automatic refresh
- **Force Refresh**: Manual refresh bypasses cache

## Visual Components

### Governance Mechanism Badges

```tsx
// User-based governance
<Badge variant="secondary" className="bg-blue-100 text-blue-800">
  <UsersIcon className="h-3 w-3 mr-1" />
  User-Based
</Badge>

// Token-weighted governance
<Badge variant="secondary" className="bg-green-100 text-green-800">
  <CurrencyDollarIcon className="h-3 w-3 mr-1" />
  Token-Weighted
</Badge>

// NFT-weighted governance
<Badge variant="secondary" className="bg-purple-100 text-purple-800">
  <ChartBarIcon className="h-3 w-3 mr-1" />
  NFT-Weighted
</Badge>
```

### Supply Visualization

```tsx
// Accessible progress bar for token supply
<AccessibleProgress
  value={supplyPercentage}
  max={100}
  label="Circulating Supply"
  showPercentage={true}
  colorScheme="success"
  size="md"
  className="mb-2"
/>
```

### Token Details Grid

```tsx
// Responsive grid layout for token metrics
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
    <div className="text-xl sm:text-2xl font-bold text-gray-900">
      {formatNumber(tokenInfo.totalSupply)}
    </div>
    <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Supply</div>
  </div>
  {/* Additional metrics... */}
</div>
```

## Number Formatting

### Format Large Numbers

```typescript
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};
```

### Examples

- `1500000` → `"1.5M"`
- `25000` → `"25.0K"`
- `500` → `"500"`

## Error Handling

### Error States

1. **Network Errors**: API connectivity issues
2. **Data Validation Errors**: Invalid token data received
3. **Service Unavailable**: All data sources failed
4. **Cache Errors**: Cache corruption or access issues

### Error Display

```tsx
// Error state with retry functionality
<Card className="border-red-200">
  <CardContent className="p-6">
    <div className="text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Token Information Unavailable
      </h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button onClick={fetchTokenInfo} disabled={loading}>
        <ArrowPathIcon className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
        {loading ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  </CardContent>
</Card>
```

### Graceful Degradation

- **Expired Cache**: Falls back to expired cache data if fresh fetch fails
- **Partial Data**: Displays available information even if some fields are missing
- **No Data State**: Shows helpful message when no token information is available

## Accessibility Features

### WCAG 2.1 Compliance

- **Keyboard Navigation**: Full keyboard accessibility with proper tab order
- **Screen Reader Support**: Comprehensive ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio for all text
- **Focus Management**: Clear focus indicators and logical navigation
- **Alternative Text**: Descriptive text for all visual elements

### ARIA Implementation

```tsx
<Card 
  ref={containerRef}
  className={className}
  role="region"
  aria-labelledby={tokenDisplayAria.labelId}
  aria-describedby={tokenDisplayAria.descriptionId}
>
  <CardTitle id={tokenDisplayAria.labelId}>
    {tokenInfo.name}
  </CardTitle>
  <CardDescription id={tokenDisplayAria.descriptionId}>
    {tokenInfo.symbol} - {tokenDisplayAria.descriptionText}
  </CardDescription>
</Card>
```

### Data Table Fallback

```tsx
// Alternative data representation for screen readers
{shouldShowDataTable && (
  <table className="min-w-full divide-y divide-gray-200" role="table">
    <caption className="sr-only">
      Token supply breakdown for {tokenInfo.name}
    </caption>
    <thead className="bg-gray-50">
      <tr>
        <th scope="col">Supply Type</th>
        <th scope="col">Amount</th>
        <th scope="col">Percentage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td scope="row">Circulating</td>
        <td>{formatNumber(tokenInfo.circulatingSupply)}</td>
        <td>{supplyPercentage.toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
)}
```

## Performance Optimizations

### Memoization

```typescript
// Supply percentage calculation is memoized
const supplyPercentage = useMemo(() => {
  if (!tokenInfo || tokenInfo.totalSupply === 0) return 0;
  return (tokenInfo.circulatingSupply / tokenInfo.totalSupply) * 100;
}, [tokenInfo]);

// Status calculation is memoized
const tokenDisplayAria = useMemo(() => 
  createTokenDisplayAria({
    tokenName: tokenInfo.name,
    tokenSymbol: tokenInfo.symbol,
    type: 'token',
    interactive: false
  }), [tokenInfo]
);
```

### Efficient Rendering

- **React.memo**: Component is wrapped with React.memo for prop-based re-rendering
- **Conditional Rendering**: Only renders necessary sections based on data availability
- **Lazy Loading**: Images and non-critical content loaded progressively

### Caching Strategy

- **Memory Cache**: In-component cache for session duration
- **Automatic Expiry**: 5-minute cache expiration
- **Background Refresh**: Automatic refresh when cache expires
- **Manual Refresh**: User-triggered refresh bypasses cache

## Responsive Design

### Breakpoints

- **Mobile (< 640px)**: Single column, stacked elements
- **Small (640px - 768px)**: Two-column grid for metrics
- **Medium (768px - 1024px)**: Optimized spacing and typography
- **Large (> 1024px)**: Four-column grid for metrics

### Mobile Optimizations

```tsx
// Responsive grid classes
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  {/* Metrics cards */}
</div>

// Responsive text sizing
<div className="text-xl sm:text-2xl font-bold text-gray-900">
  {formatNumber(tokenInfo.totalSupply)}
</div>

// Responsive padding
<div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
  {/* Content */}
</div>
```

## Integration Points

### useDAO Hook Integration

```typescript
const { currentDAO, getDAO, loading: daoLoading, error: daoError } = useDAO();
```

### useQwallet Hook Integration

```typescript
const { getBalance, getAllBalances, loading: walletLoading, error: walletError } = useQwallet();
```

### Performance Monitoring

```typescript
const { getMountTime } = useRenderMonitoring('TokenOverviewPanel', { daoId });
```

### Accessibility Hooks

```typescript
const { containerRef, focusFirst } = useKeyboardNavigation({
  enabled: true,
  autoFocus: false
});

const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
  highContrast: false,
  colorBlindFriendly: false,
  preferDataTable: false
});
```

## Testing

### Test Coverage

- **Component Rendering**: All display modes and states
- **Data Fetching**: Primary, fallback, and error scenarios
- **Caching**: Cache hit, miss, and expiry scenarios
- **Error Handling**: Network errors, invalid data, and retry functionality
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: All breakpoints and layout variations
- **User Interactions**: Button clicks, refresh actions, and hover states

### Test Examples

```typescript
// Component rendering test
test('renders token information correctly', () => {
  const tokenInfo = {
    name: 'Test Token',
    symbol: 'TEST',
    totalSupply: 1000000,
    circulatingSupply: 750000,
    holderCount: 100,
    contractAddress: '0x123...',
    type: 'token-weighted'
  };
  
  render(<TokenOverviewPanel daoId="test-dao" tokenInfo={tokenInfo} />);
  
  expect(screen.getByText('Test Token')).toBeInTheDocument();
  expect(screen.getByText('TEST')).toBeInTheDocument();
  expect(screen.getByText('1.0M')).toBeInTheDocument();
});

// Error handling test
test('displays error state and retry functionality', async () => {
  const mockGetDAO = jest.fn().mockRejectedValue(new Error('Network error'));
  
  render(<TokenOverviewPanel daoId="test-dao" />);
  
  await waitFor(() => {
    expect(screen.getByText('Token Information Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
  
  const retryButton = screen.getByText('Retry');
  fireEvent.click(retryButton);
  
  expect(mockGetDAO).toHaveBeenCalledTimes(2);
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
- UI components from components/ui
- Accessibility utilities from utils/accessibility

## Future Enhancements

### Planned Features

1. **Real-time Updates**: WebSocket integration for live token data
2. **Historical Charts**: Token supply and holder count over time
3. **Price Integration**: Token price and market cap display
4. **Advanced Analytics**: Token distribution analysis and metrics
5. **Multi-token Support**: Support for DAOs with multiple tokens

### Integration Roadmap

1. **Price Feeds**: Integration with DeFi price oracles
2. **Analytics Dashboard**: Detailed token analytics and insights
3. **Governance Metrics**: Token-based voting power analysis
4. **Cross-chain Support**: Multi-blockchain token information

## Troubleshooting

### Common Issues

1. **Token Data Not Loading**: Check DAO ID and network connectivity
2. **Cache Issues**: Clear browser cache or force refresh
3. **Display Problems**: Verify TailwindCSS configuration
4. **Accessibility Issues**: Test with screen readers and keyboard navigation

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Token data:', tokenInfo);
  console.log('Data source:', dataSource);
  console.log('Cache status:', getCachedTokenInfo ? 'hit' : 'miss');
}
```

## Contributing

When contributing to the TokenOverviewPanel component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test on multiple devices and browsers
6. Verify caching behavior
7. Test error handling scenarios

## License

Part of the AnarQ&Q ecosystem under the project license.