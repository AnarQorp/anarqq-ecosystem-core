# ProposalCard Component Documentation

## Overview

The `ProposalCard` component displays individual DAO proposals with comprehensive information including title, description, voting options, status, and interactive elements. It provides both full and compact display modes and integrates seamlessly with the DAO governance system in the AnarQ&Q ecosystem.

## Features

### ✅ Core Functionality
- **Proposal Display** - Complete proposal information with rich formatting
- **Status Indicators** - Color-coded badges for active/closed/expired states
- **Vote Distribution** - Visual charts and statistics for closed proposals
- **Voting Interface** - Integration with voting system for eligible users
- **Time Management** - Real-time countdown and expiration tracking

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout
- **Compact Mode** - Condensed version for proposal lists
- **Interactive Elements** - Hover effects and smooth transitions
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Visual Feedback** - Clear status indicators and progress bars

## Props

```typescript
interface ProposalCardProps {
  proposal: Proposal;                    // Required: The proposal object
  daoId: string;                        // Required: DAO identifier
  onVote?: (proposalId: string) => void; // Optional: Voting callback
  compact?: boolean;                    // Optional: Compact display mode
  className?: string;                   // Optional: Additional CSS classes
}
```

### Proposal Interface

```typescript
interface Proposal {
  id: string;
  daoId: string;
  title: string;
  description: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'closed';
  voteCount: number;
  quorum: number;
  results: Record<string, { count: number; weight: number }>;
  quorumReached: boolean;
}
```

## Usage

### Basic Usage

```tsx
import { ProposalCard } from '../components/dao';

function ProposalList({ proposals, daoId }: { proposals: Proposal[], daoId: string }) {
  const handleVote = (proposalId: string) => {
    // Open voting interface
    console.log('Vote on proposal:', proposalId);
  };

  return (
    <div className="space-y-4">
      {proposals.map(proposal => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          daoId={daoId}
          onVote={handleVote}
        />
      ))}
    </div>
  );
}
```

### Compact Mode

```tsx
import { ProposalCard } from '../components/dao';

function CompactProposalList({ proposals, daoId }: { proposals: Proposal[], daoId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proposals.map(proposal => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          daoId={daoId}
          onVote={(id) => console.log('Vote:', id)}
          compact
        />
      ))}
    </div>
  );
}
```

### With Custom Styling

```tsx
import { ProposalCard } from '../components/dao';

function CustomProposalCard({ proposal, daoId }: { proposal: Proposal, daoId: string }) {
  return (
    <ProposalCard
      proposal={proposal}
      daoId={daoId}
      className="border-2 border-blue-200 shadow-lg"
      onVote={(id) => {
        // Custom voting logic
        openVotingModal(id);
      }}
    />
  );
}
```

## Display Modes

### Full Mode (Default)

The full mode displays comprehensive proposal information:

- **Header Section**:
  - Proposal title
  - Creator identity and creation date
  - Status badge (Active/Closed)

- **Content Section**:
  - Full description text
  - Expiration date and time remaining
  - Voting options (active) or vote distribution (closed)
  - Quorum status and progress

- **Action Section**:
  - View Details button
  - Vote Now button (if eligible)
  - Results badge (for closed proposals)

### Compact Mode

The compact mode provides a condensed view for lists:

- **Condensed Header**: Title and status only
- **Creator Info**: Shortened creator identity
- **Quick Stats**: Vote count and time remaining
- **Action Button**: Vote Now button (if eligible)

```tsx
// Compact mode usage
<ProposalCard 
  proposal={proposal} 
  daoId={daoId} 
  compact 
  onVote={handleVote} 
/>
```

## Status System

### Status Types

1. **Active** 🟢
   - Proposal is accepting votes
   - Shows time remaining
   - Displays voting options
   - Shows Vote Now button (if eligible)

2. **Closed** ⚫
   - Voting has ended
   - Shows vote distribution
   - Displays final results
   - Shows View Results badge

3. **Expired** ⚫
   - Automatically closed due to time expiration
   - Same display as closed proposals

### Status Calculation

```typescript
const proposalStatus = useMemo(() => {
  const now = new Date();
  const expiresAt = new Date(proposal.expiresAt);
  const isExpired = now > expiresAt;
  
  if (proposal.status === 'closed' || isExpired) {
    return {
      status: 'closed',
      label: 'Closed',
      color: 'bg-gray-100 text-gray-800',
      icon: CheckCircleIcon
    };
  } else {
    return {
      status: 'active',
      label: 'Active',
      color: 'bg-green-100 text-green-800',
      icon: ClockIcon
    };
  }
}, [proposal.status, proposal.expiresAt]);
```

## Vote Distribution Visualization

### For Closed Proposals

The component displays comprehensive voting results:

```tsx
// Vote distribution display
<div className="space-y-2">
  {voteDistribution.map((item, index) => (
    <div key={index} className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={item.isWinning ? "text-green-700" : "text-gray-700"}>
          {item.option}
          {item.isWinning && <span className="ml-1">👑</span>}
        </span>
        <div className="text-right">
          <div>{item.count} votes ({item.percentage}%)</div>
          <div className="text-xs">Weight: {item.weightPercentage}%</div>
        </div>
      </div>
      <Progress value={item.percentage} />
    </div>
  ))}
</div>
```

### Features

- **Progress Bars**: Visual representation of vote distribution
- **Winning Indicator**: Crown emoji for winning option
- **Vote Counts**: Both raw counts and percentages
- **Weight Display**: Token-weighted voting percentages
- **Quorum Status**: Clear indication of quorum achievement

## Voting Eligibility System

### Eligibility Checks

```typescript
const votingEligibility = useMemo(() => {
  if (!isAuthenticated) {
    return { canVote: false, reason: 'Please authenticate to vote' };
  }
  
  if (!membership?.isMember) {
    return { canVote: false, reason: 'Only DAO members can vote' };
  }
  
  if (!membership.permissions.canVote) {
    return { canVote: false, reason: 'You do not have voting permissions' };
  }
  
  if (proposalStatus.status !== 'active') {
    return { canVote: false, reason: 'Voting has ended' };
  }
  
  return { canVote: true, reason: null };
}, [isAuthenticated, membership, proposalStatus.status]);
```

### Eligibility States

1. **Can Vote** ✅
   - Shows "Vote Now" button
   - Button is enabled and clickable
   - Calls `onVote` callback when clicked

2. **Cannot Vote** ❌
   - Shows "Cannot Vote" button (disabled)
   - Displays reason for ineligibility
   - Provides helpful guidance

### Reasons for Ineligibility

- **Not Authenticated**: User needs to sign in
- **Not a Member**: User must join the DAO first
- **No Voting Rights**: User lacks voting permissions
- **Voting Ended**: Proposal is closed or expired
- **Already Voted**: User has already cast their vote (future feature)

## Time Management

### Time Display Logic

```typescript
const timeInfo = useMemo(() => {
  const now = new Date();
  const expiresAt = new Date(proposal.expiresAt);
  
  if (proposalStatus.status === 'closed') {
    const daysClosed = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      text: daysClosed === 0 ? 'Closed today' : `Closed ${daysClosed} day${daysClosed === 1 ? '' : 's'} ago`,
      urgent: false
    };
  } else {
    const timeRemaining = expiresAt.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    
    if (daysRemaining > 1) {
      return { text: `${daysRemaining} days remaining`, urgent: false };
    } else if (hoursRemaining > 1) {
      return { text: `${hoursRemaining} hours remaining`, urgent: hoursRemaining <= 24 };
    } else {
      return { text: 'Expires soon', urgent: true };
    }
  }
}, [proposal.expiresAt, proposalStatus.status]);
```

### Time States

- **Days Remaining**: Shows day count for proposals with >24 hours
- **Hours Remaining**: Shows hour count for proposals with <24 hours
- **Urgent**: Special styling for proposals expiring within 24 hours
- **Closed**: Shows how long ago the proposal closed

## Creator Identity Display

### Identity Formatting

```typescript
const formatCreator = (creatorId: string) => {
  // Extract readable part from DID or return shortened version
  if (creatorId.startsWith('did:squid:')) {
    const identifier = creatorId.replace('did:squid:', '');
    return identifier.length > 12 ? 
      `${identifier.slice(0, 6)}...${identifier.slice(-6)}` : 
      identifier;
  }
  return creatorId.length > 20 ? 
    `${creatorId.slice(0, 10)}...${creatorId.slice(-10)}` : 
    creatorId;
};
```

### Features

- **DID Processing**: Extracts readable part from sQuid DIDs
- **Truncation**: Shortens long identifiers with ellipsis
- **Consistent Display**: Maintains readable format across all proposals

## Integration Points

### DAO Dashboard Integration

```tsx
// In DAODashboard.tsx
<div className="space-y-4">
  {filteredProposals.map((proposal) => (
    <ProposalCard
      key={proposal.id}
      proposal={proposal}
      daoId={daoId}
      onVote={(proposalId) => {
        // Open voting interface
        setVotingProposal(proposalId);
        setShowVotingInterface(true);
      }}
    />
  ))}
</div>
```

### Hook Integration

```typescript
const { membership } = useDAO();
const { isAuthenticated } = useSessionContext();

// Component uses these for eligibility checking
```

### Future VotingInterface Integration

```tsx
// Future integration with VotingInterface
const handleVote = (proposalId: string) => {
  setSelectedProposal(proposalId);
  setShowVotingModal(true);
};

<VotingInterface
  proposalId={selectedProposal}
  daoId={daoId}
  open={showVotingModal}
  onClose={() => setShowVotingModal(false)}
  onVoteSubmitted={() => {
    setShowVotingModal(false);
    refreshProposals();
  }}
/>
```

## Responsive Design

### Breakpoints

- **Mobile (< 768px)**: Single column, stacked elements
- **Tablet (768px - 1024px)**: Optimized spacing and typography
- **Desktop (> 1024px)**: Full layout with proper spacing

### Mobile Optimizations

- **Touch Targets**: Minimum 44px touch targets for buttons
- **Readable Text**: Appropriate font sizes and line heights
- **Optimized Spacing**: Proper padding and margins for mobile
- **Scrollable Content**: Proper overflow handling for long descriptions

### Responsive Classes

```tsx
// Grid layout for compact mode
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {proposals.map(proposal => (
    <ProposalCard key={proposal.id} proposal={proposal} compact />
  ))}
</div>
```

## Accessibility Features

### WCAG 2.1 Compliance

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Clear focus indicators
- **Semantic HTML**: Proper heading hierarchy and structure

### ARIA Implementation

```tsx
<Card 
  role="article" 
  aria-labelledby={`proposal-title-${proposal.id}`}
  aria-describedby={`proposal-description-${proposal.id}`}
>
  <CardTitle id={`proposal-title-${proposal.id}`}>
    {proposal.title}
  </CardTitle>
  <div id={`proposal-description-${proposal.id}`}>
    {proposal.description}
  </div>
</Card>
```

### Keyboard Navigation

- **Tab Order**: Logical tab sequence through interactive elements
- **Enter/Space**: Activate buttons and interactive elements
- **Focus Indicators**: Clear visual focus states
- **Skip Links**: Efficient navigation for screen reader users

## Performance Optimizations

### Memoization

```typescript
// Status calculation is memoized
const proposalStatus = useMemo(() => {
  // Expensive status calculation
}, [proposal.status, proposal.expiresAt]);

// Vote distribution is memoized
const voteDistribution = useMemo(() => {
  // Complex vote calculation
}, [proposal.results, proposal.options, proposalStatus.status]);
```

### Efficient Rendering

- **Conditional Rendering**: Only render necessary sections
- **Lazy Loading**: Future enhancement for large proposal lists
- **Virtual Scrolling**: Future enhancement for performance

## Testing

### Test Coverage

- **Component Rendering**: All display modes and states
- **Status Display**: All status types and transitions
- **Voting Eligibility**: All eligibility scenarios
- **Time Display**: All time states and calculations
- **Vote Distribution**: Result visualization and calculations
- **User Interactions**: Button clicks and callbacks
- **Accessibility**: ARIA labels and keyboard navigation
- **Edge Cases**: Missing data and error scenarios

### Test Files

- `ProposalCard.test.tsx`: Comprehensive test suite
- Coverage includes all user interactions and edge cases

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
- `useSessionContext` from contexts
- UI components from components/ui

## Customization

### Styling

```tsx
// Custom styling via className
<ProposalCard 
  className="border-2 border-blue-200 shadow-xl"
  proposal={proposal}
  daoId={daoId}
/>
```

### Behavior

```tsx
// Custom vote handling
<ProposalCard
  proposal={proposal}
  daoId={daoId}
  onVote={(proposalId) => {
    // Custom voting logic
    analytics.track('proposal_vote_initiated', { proposalId });
    openCustomVotingInterface(proposalId);
  }}
/>
```

## Future Enhancements

### Planned Features

1. **Rich Text Support**: Markdown rendering for descriptions
2. **Image Attachments**: Display proposal attachments
3. **Social Features**: Comments and discussions
4. **Advanced Analytics**: Detailed voting analytics
5. **Real-time Updates**: Live vote count updates

### Integration Roadmap

1. **VotingInterface**: Complete voting system integration
2. **ProposalDetails**: Detailed proposal view component
3. **CommentSystem**: Discussion and feedback system
4. **NotificationSystem**: Real-time proposal updates

## Troubleshooting

### Common Issues

1. **Vote Button Not Showing**: Check authentication and membership status
2. **Status Not Updating**: Verify proposal expiration dates
3. **Results Not Displaying**: Check proposal results data structure
4. **Styling Issues**: Ensure TailwindCSS is properly configured

### Debug Mode

```tsx
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Proposal data:', proposal);
  console.log('Voting eligibility:', votingEligibility);
  console.log('Status:', proposalStatus);
}
```

## Contributing

When contributing to the ProposalCard component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test on multiple devices and browsers

## License

Part of the AnarQ&Q ecosystem under the project license.