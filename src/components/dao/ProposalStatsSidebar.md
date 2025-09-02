# ProposalStatsSidebar Component Documentation

## Overview

The `ProposalStatsSidebar` component displays historical governance statistics and trends for DAO proposal analysis. It provides comprehensive metrics including quorum statistics, top proposals, participation trends, and graceful handling of insufficient data scenarios within the AnarQ&Q ecosystem.

## Features

### ✅ Core Functionality
- **Quorum Statistics** - Percentage of proposals reaching quorum with visual progress
- **Participation Metrics** - Average participation and trend analysis
- **Top Proposals** - Most voted proposals with detailed metrics
- **Time Analytics** - Average time-to-quorum calculations
- **Trend Analysis** - Participation trend detection (increasing/decreasing/stable)

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout with proper breakpoints
- **Loading States** - Skeleton loaders and progressive loading
- **Error Handling** - Graceful degradation for insufficient data
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Visual Feedback** - Interactive elements with hover states and tooltips

## Props

```typescript
interface ProposalStatsSidebarProps {
  daoId: string;              // Required: The ID of the DAO
  proposals: Proposal[];      // Required: Array of DAO proposals
  results: DAOResults | null; // Optional: DAO results data
  className?: string;         // Optional: Additional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { ProposalStatsSidebar } from '../components/dao';
import { useDAO } from '../composables/useDAO';

function DAOStatistics({ daoId }: { daoId: string }) {
  const { proposals, results } = useDAO();

  return (
    <div className="space-y-6">
      <ProposalStatsSidebar
        daoId={daoId}
        proposals={proposals}
        results={results}
      />
    </div>
  );
}
```

### Integration with DAODashboard

```tsx
import { ProposalStatsSidebar, DAODashboard } from '../components/dao';
import { useDAO } from '../composables/useDAO';

function EnhancedDAODashboard({ daoId }: { daoId: string }) {
  const { proposals, results } = useDAO();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <ProposalStatsSidebar
          daoId={daoId}
          proposals={proposals}
          results={results}
          className="border-2 border-gray-200"
        />
      </div>
    </div>
  );
}
```

### Custom Styling

```tsx
import { ProposalStatsSidebar } from '../components/dao';

function CustomStatsSidebar({ daoId, proposals, results }: {
  daoId: string,
  proposals: Proposal[],
  results: DAOResults | null
}) {
  return (
    <ProposalStatsSidebar
      daoId={daoId}
      proposals={proposals}
      results={results}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg"
    />
  );
}
```

## Data Interfaces

### ProposalStats Interface

```typescript
interface ProposalStats {
  quorumReachRate: number;                    // Percentage of proposals reaching quorum
  averageParticipation: number;               // Average votes per proposal
  averageTimeToQuorum: number | null;         // Average hours to reach quorum
  topProposals: Array<{                       // Most voted proposals
    id: string;
    title: string;
    votePercentage: number;
    participationRate: number;
    voteCount: number;
    status: 'active' | 'closed';
  }>;
  participationTrend: 'increasing' | 'decreasing' | 'stable';  // Trend direction
  totalProposals: number;                     // Total number of proposals
  completedProposals: number;                 // Number of completed proposals
  hasInsufficientData: boolean;               // Whether there's enough data for analysis
}
```

## Statistics Calculation

### Quorum Reach Rate

```typescript
// Calculate percentage of proposals that reached quorum
const proposalsWithQuorum = proposals.filter(p => p.quorumReached).length;
const quorumReachRate = totalProposals > 0 ? (proposalsWithQuorum / totalProposals) * 100 : 0;
```

### Average Participation

```typescript
// Calculate average votes across all proposals
const totalVotes = proposals.reduce((sum, p) => sum + (p.voteCount || 0), 0);
const averageParticipation = totalProposals > 0 ? totalVotes / totalProposals : 0;
```

### Time to Quorum Calculation

```typescript
// Calculate average time to quorum for completed proposals
const completedWithQuorum = proposals.filter(p => 
  p.status === 'closed' && p.quorumReached
);

if (completedWithQuorum.length > 0) {
  const timeToQuorumValues = completedWithQuorum.map(proposal => {
    const createdAt = new Date(proposal.createdAt);
    const expiresAt = new Date(proposal.expiresAt);
    const totalDuration = expiresAt.getTime() - createdAt.getTime();
    
    // Estimate time to quorum based on participation rate
    const participationRate = proposal.voteCount / (proposal.quorum || 1);
    const estimatedTimeToQuorum = participationRate > 1.5 
      ? totalDuration * 0.3  // Fast quorum
      : participationRate > 1.0 
        ? totalDuration * 0.6  // Medium quorum
        : totalDuration * 0.8; // Slow quorum
    
    return estimatedTimeToQuorum / (1000 * 60 * 60); // Convert to hours
  });

  averageTimeToQuorum = timeToQuorumValues.reduce((sum, time) => sum + time, 0) / timeToQuorumValues.length;
}
```

### Participation Trend Analysis

```typescript
// Analyze participation trend over recent proposals
let participationTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

if (proposals.length >= 6) {
  const recentProposals = proposals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const olderProposals = proposals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(3, 6);

  const recentAvg = recentProposals.reduce((sum, p) => sum + (p.voteCount || 0), 0) / recentProposals.length;
  const olderAvg = olderProposals.reduce((sum, p) => sum + (p.voteCount || 0), 0) / olderProposals.length;

  const changeThreshold = 0.15; // 15% change threshold
  const changeRatio = (recentAvg - olderAvg) / olderAvg;

  if (changeRatio > changeThreshold) {
    participationTrend = 'increasing';
  } else if (changeRatio < -changeThreshold) {
    participationTrend = 'decreasing';
  }
}
```

## Data Visualization

### Quorum Progress Chart

```tsx
// Accessible quorum progress visualization
const renderQuorumChart = () => {
  const reachedCount = Math.round((proposalStats.quorumReachRate / 100) * proposalStats.totalProposals);
  const notReachedCount = proposalStats.totalProposals - reachedCount;

  return (
    <div className="mt-2">
      <AccessibleProgress
        value={proposalStats.quorumReachRate}
        max={100}
        label="Quorum Reach Rate"
        showPercentage={false}
        colorScheme="success"
        size="sm"
        className="mb-2"
      />
      
      {/* Legend with high contrast colors */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600">Reached ({reachedCount})</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-gray-600">Not reached ({notReachedCount})</span>
        </div>
      </div>
    </div>
  );
};
```

### Participation Distribution Chart

```tsx
// Participation level distribution visualization
const renderParticipationChart = () => {
  // Create participation buckets
  const buckets = {
    high: proposals.filter(p => (p.voteCount || 0) >= proposalStats.averageParticipation * 1.5).length,
    medium: proposals.filter(p => {
      const votes = p.voteCount || 0;
      return votes >= proposalStats.averageParticipation * 0.5 && votes < proposalStats.averageParticipation * 1.5;
    }).length,
    low: proposals.filter(p => (p.voteCount || 0) < proposalStats.averageParticipation * 0.5).length
  };

  const total = buckets.high + buckets.medium + buckets.low;
  const highPercent = (buckets.high / total) * 100;
  const mediumPercent = (buckets.medium / total) * 100;
  const lowPercent = (buckets.low / total) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-1 mb-2">
        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
          {highPercent > 0 && (
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${highPercent}%` }}
              title={`High participation: ${buckets.high} proposals`}
            />
          )}
          {mediumPercent > 0 && (
            <div 
              className="h-full bg-yellow-500 transition-all duration-500 ease-out"
              style={{ width: `${mediumPercent}%` }}
              title={`Medium participation: ${buckets.medium} proposals`}
            />
          )}
          {lowPercent > 0 && (
            <div 
              className="h-full bg-red-400 transition-all duration-500 ease-out"
              style={{ width: `${lowPercent}%` }}
              title={`Low participation: ${buckets.low} proposals`}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-gray-600">High ({buckets.high})</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span className="text-gray-600">Med ({buckets.medium})</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          <span className="text-gray-600">Low ({buckets.low})</span>
        </div>
      </div>
    </div>
  );
};
```

### Participation Trend Indicator

```tsx
// Visual trend indicator with colors and icons
const renderParticipationTrend = () => {
  const trendConfig = {
    increasing: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: '↗',
      label: 'Increasing'
    },
    decreasing: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: '↘',
      label: 'Decreasing'
    },
    stable: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      icon: '→',
      label: 'Stable'
    }
  };

  const config = trendConfig[proposalStats.participationTrend];

  return (
    <div className="flex items-center space-x-2">
      <div className={cn("px-2 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </div>
    </div>
  );
};
```

## Insufficient Data Handling

### Data Sufficiency Check

```typescript
// Check if there's enough data for meaningful statistics
const hasInsufficientData = completedProposals < 3;
```

### No Proposals State

```tsx
// Message for DAOs with no proposals
const renderInsufficientDataMessage = () => {
  const messageConfig = {
    noProposals: {
      icon: DocumentTextIcon,
      title: "No Proposals Yet",
      message: "This DAO hasn't created any proposals yet. Statistics will appear once governance activity begins.",
      suggestions: [
        "Members can create the first proposal to start governance",
        "Statistics become more meaningful with multiple proposals",
        "Quorum and participation metrics will be calculated automatically"
      ]
    },
    fewProposals: {
      icon: ExclamationTriangleIcon,
      title: "Limited Data Available",
      message: `Only ${proposalStats.completedProposals} completed proposal${proposalStats.completedProposals === 1 ? '' : 's'} available for analysis.`,
      suggestions: [
        "More proposals will improve statistical accuracy",
        "Trends become visible with 6+ proposals",
        "Current metrics are based on available data"
      ]
    }
  };

  const config = proposalStats.totalProposals === 0 ? messageConfig.noProposals : messageConfig.fewProposals;
  const IconComponent = config.icon;

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <IconComponent className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              {config.title}
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              {config.message}
            </p>
            <ul className="text-xs text-yellow-600 space-y-1">
              {config.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### New DAO Guidance

```tsx
// Guidance for new DAOs with no governance activity
const renderNewDAOGuidance = () => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="text-center">
          <UsersIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Welcome to DAO Governance
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            This DAO is ready for its first governance activities. Here's what you can expect:
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs text-blue-600">
            <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
              <span>Quorum Statistics</span>
              <span className="text-blue-500">After first votes</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
              <span>Participation Trends</span>
              <span className="text-blue-500">After 6+ proposals</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
              <span>Top Proposals</span>
              <span className="text-blue-500">After voting begins</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

## Top Proposals Display

### Proposal Ranking

```typescript
// Identify and rank proposals by vote count and participation
const topProposals = [...proposals]
  .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
  .slice(0, 5)
  .map(proposal => {
    const voteCount = proposal.voteCount || 0;
    const quorum = proposal.quorum || 1;
    const participationRate = (voteCount / quorum) * 100;
    
    // Calculate vote percentage based on results if available
    let votePercentage = 0;
    if (proposal.results && Object.keys(proposal.results).length > 0) {
      const totalWeight = Object.values(proposal.results).reduce(
        (sum, result) => sum + (result.weight || 0), 0
      );
      const maxWeight = Math.max(...Object.values(proposal.results).map(r => r.weight || 0));
      votePercentage = totalWeight > 0 ? (maxWeight / totalWeight) * 100 : 0;
    }

    return {
      id: proposal.id,
      title: proposal.title,
      votePercentage: Math.round(votePercentage * 10) / 10,
      participationRate: Math.round(participationRate * 10) / 10,
      voteCount,
      status: proposal.status
    };
  });
```

### Top Proposals Card

```tsx
// Interactive top proposals display
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base flex items-center">
      <TrophyIcon className="h-4 w-4 mr-2 text-yellow-600" />
      Most Voted Proposals
    </CardTitle>
    <CardDescription className="text-sm">
      Proposals ranked by participation and vote count
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    {proposalStats.topProposals.map((proposal, index) => (
      <div
        key={proposal.id}
        className="group cursor-pointer p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors duration-200"
        onClick={() => {
          // Navigate to proposal details
          console.log('Navigate to proposal:', proposal.id);
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium text-gray-500">
                #{index + 1}
              </span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  proposal.status === 'active' 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                )}
              >
                {proposal.status === 'active' ? 'Active' : 'Closed'}
              </Badge>
            </div>
            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {proposal.title}
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-600">Votes</span>
              <span className="font-medium text-gray-900">
                {proposal.voteCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Participation</span>
              <span className="font-medium text-gray-900">
                {proposal.participationRate}%
              </span>
            </div>
          </div>
          
          {proposal.votePercentage > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600">Leading Vote</span>
                <span className="font-medium text-gray-900">
                  {proposal.votePercentage}%
                </span>
              </div>
              <Progress 
                value={proposal.votePercentage} 
                className="h-1"
              />
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-blue-600">Click to view details →</span>
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

## Tooltip System

### Tooltip Implementation

```tsx
// Reusable tooltip component for hover states
const renderTooltip = (content: string, children: React.ReactNode) => (
  <div className="group relative">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
      {content}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  </div>
);
```

### Tooltip Usage

```tsx
// Tooltip for quorum reach rate
{renderTooltip(
  `${proposalStats.quorumReachRate}% of proposals successfully reached the required quorum threshold`,
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium text-gray-700">Quorum Reach Rate</span>
    <span className="text-sm font-bold text-gray-900">
      {proposalStats.quorumReachRate}%
    </span>
  </div>
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
// Generate accessible chart description
const chartDescription = describer.describeQuorumProgress(
  reachedCount,
  proposalStats.totalProposals,
  proposalStats.quorumReachRate >= 50
);
```

### Data Table Fallback

```tsx
// Alternative data representation for screen readers
{shouldShowDataTable && (
  <div className="mt-3 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200" role="table">
      <caption className="sr-only">
        Quorum achievement breakdown for all proposals
      </caption>
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Count
          </th>
          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Percentage
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
            Quorum Reached
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
            {reachedCount}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
            {proposalStats.quorumReachRate.toFixed(1)}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)}
```

## Performance Optimizations

### Memoization

```typescript
// Statistics calculation is memoized
const proposalStats = useMemo((): ProposalStats => {
  // Complex statistics calculation
}, [proposals]);

// Component wrapped with React.memo
const ProposalStatsSidebar: React.FC<ProposalStatsSidebarProps> = React.memo(({
  daoId,
  proposals,
  results,
  className
}) => {
  // Component implementation
});
```

### Efficient Rendering

- **Conditional Rendering**: Only renders necessary sections based on data availability
- **Lazy Loading**: Charts and visualizations loaded progressively
- **Debounced Updates**: Prevents excessive re-calculations
- **Virtual Scrolling**: For large proposal lists (future enhancement)

## Error Handling

### Error Categories

1. **Data Errors**: Invalid or missing proposal data
2. **Calculation Errors**: Statistics calculation failures
3. **Rendering Errors**: Component rendering issues
4. **Network Errors**: Data fetching failures

### Graceful Degradation

- **Partial Data**: Shows available statistics even if some calculations fail
- **Fallback Messages**: Clear explanations when data is insufficient
- **Progressive Enhancement**: Core functionality works without advanced features

## Responsive Design

### Breakpoints

- **Mobile (< 640px)**: Single column, stacked elements
- **Small (640px - 768px)**: Optimized spacing and typography
- **Medium (768px - 1024px)**: Two-column layouts where appropriate
- **Large (> 1024px)**: Full sidebar layout with optimal spacing

### Mobile Optimizations

```tsx
// Responsive grid layouts
<div className="grid grid-cols-2 gap-3 text-xs">
  {/* Metrics display */}
</div>

<div className="grid grid-cols-3 gap-2 text-xs">
  {/* Legend items */}
</div>
```

## Integration Points

### Hook Dependencies

```typescript
// Performance monitoring
const { getMountTime } = useRenderMonitoring('ProposalStatsSidebar', { daoId });

// Accessibility integration
const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
  highContrast: false,
  colorBlindFriendly: false,
  preferDataTable: false
});
```

## Testing

### Test Coverage

- **Statistics Calculation**: All calculation methods and edge cases
- **Data Visualization**: Chart rendering and accessibility
- **Insufficient Data**: All insufficient data scenarios
- **User Interactions**: Hover states, tooltips, and click handlers
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: All breakpoints and layout variations
- **Performance**: Memoization and rendering efficiency

### Test Examples

```typescript
// Statistics calculation test
test('calculates quorum reach rate correctly', () => {
  const proposals = [
    { id: '1', quorumReached: true, voteCount: 10 },
    { id: '2', quorumReached: false, voteCount: 5 },
    { id: '3', quorumReached: true, voteCount: 15 }
  ];
  
  render(
    <ProposalStatsSidebar
      daoId="test-dao"
      proposals={proposals}
      results={null}
    />
  );
  
  expect(screen.getByText('66.7%')).toBeInTheDocument(); // 2/3 reached quorum
});

// Insufficient data handling test
test('shows appropriate message for new DAOs', () => {
  render(
    <ProposalStatsSidebar
      daoId="test-dao"
      proposals={[]}
      results={null}
    />
  );
  
  expect(screen.getByText('No Proposals Yet')).toBeInTheDocument();
  expect(screen.getByText('Welcome to DAO Governance')).toBeInTheDocument();
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

- UI components from components/ui
- Accessibility utilities from utils/accessibility
- Performance monitoring utilities

## Future Enhancements

### Planned Features

1. **Real-time Updates**: Live statistics updates as proposals change
2. **Historical Charts**: Time-series charts for participation trends
3. **Comparative Analytics**: Compare with other DAOs
4. **Export Functionality**: Export statistics as PDF or CSV
5. **Advanced Filtering**: Filter statistics by time period or proposal type

### Integration Roadmap

1. **Analytics Dashboard**: Detailed governance analytics
2. **Notification System**: Alerts for significant changes
3. **Social Features**: Community insights and benchmarking
4. **AI Insights**: Machine learning-powered governance insights

## Troubleshooting

### Common Issues

1. **Statistics Not Calculating**: Check proposal data structure and completeness
2. **Charts Not Rendering**: Verify accessibility utilities and color schemes
3. **Tooltips Not Showing**: Check hover states and z-index conflicts
4. **Responsive Issues**: Verify TailwindCSS configuration and breakpoints

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('ProposalStats:', {
    totalProposals: proposalStats.totalProposals,
    completedProposals: proposalStats.completedProposals,
    quorumReachRate: proposalStats.quorumReachRate,
    hasInsufficientData: proposalStats.hasInsufficientData
  });
}
```

## Contributing

When contributing to the ProposalStatsSidebar component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test with various data scenarios
6. Verify responsive design
7. Test insufficient data handling

## License

Part of the AnarQ&Q ecosystem under the project license.