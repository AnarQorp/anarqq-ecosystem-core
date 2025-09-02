# TransactionHistory Component

The `TransactionHistory` component provides a comprehensive, identity-aware transaction history interface with privacy controls, search/filtering capabilities, and compliance export functionality.

## Features

### Core Functionality
- **Identity-Aware Display**: Automatically filters and displays transactions based on the active sQuid identity type and privacy level
- **Privacy Controls**: Respects identity-specific privacy settings (PUBLIC, PRIVATE, ANONYMOUS)
- **Real-time Updates**: Automatically refreshes transaction data and responds to identity context changes
- **Responsive Design**: Adapts to different screen sizes with compact and full view modes

### Search and Filtering
- **Text Search**: Search across transaction hashes, addresses, memos, and token symbols
- **Advanced Filters**: Filter by transaction type, status, token, amount range, and date range
- **Smart Filtering**: Automatically applies privacy-based filtering based on identity type
- **Sorting Options**: Sort by timestamp, amount, fees, risk score, or status

### Privacy and Security
- **Identity-Based Privacy**: Different privacy levels for ROOT, DAO, ENTERPRISE, CONSENTIDA, and AID identities
- **Risk Assessment**: Visual risk indicators and detailed risk factor display
- **Compliance Flags**: Highlights transactions with compliance issues or suspicious patterns
- **Security Indicators**: Shows Qonsent approval and Qlock signing status

### Export and Compliance
- **Bulk Selection**: Select multiple transactions for batch operations
- **Compliance Export**: Generate detailed compliance reports in multiple formats
- **Audit Trail**: Complete audit logging with metadata and security context
- **Data Retention**: Respects identity-specific data retention policies

### Integration Features
- **Pi Wallet Support**: Identifies and highlights Pi Wallet-related transactions
- **Qerberos Integration**: Links to detailed audit logs in Qerberos
- **Qindex Integration**: Supports transaction indexing and search
- **Ecosystem Coordination**: Integrates with other Q ecosystem modules

## Usage

### Basic Usage

```tsx
import { TransactionHistory } from '../components/qwallet';
import { ExtendedSquidIdentity } from '../types/identity';

const MyWalletPage: React.FC = () => {
  const [identity, setIdentity] = useState<ExtendedSquidIdentity | null>(null);

  const handleTransactionClick = (transaction: WalletTransaction) => {
    // Handle transaction selection
    console.log('Transaction selected:', transaction);
  };

  const handleExportComplete = (report: ComplianceReport) => {
    // Handle export completion
    console.log('Export completed:', report);
  };

  return (
    <TransactionHistory
      identity={identity}
      onTransactionClick={handleTransactionClick}
      onExportComplete={handleExportComplete}
    />
  );
};
```

### Compact Mode

```tsx
<TransactionHistory
  identity={identity}
  compact={true}
  maxTransactions={10}
  showFilters={false}
  showExport={false}
/>
```

### Advanced Configuration

```tsx
<TransactionHistory
  identity={identity}
  showFilters={true}
  showExport={true}
  maxTransactions={50}
  onTransactionClick={handleTransactionClick}
  onExportComplete={handleExportComplete}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `identity` | `ExtendedSquidIdentity` | Required | The active sQuid identity |
| `compact` | `boolean` | `false` | Enable compact view mode |
| `showFilters` | `boolean` | `true` | Show search and filter controls |
| `showExport` | `boolean` | `true` | Show export functionality |
| `maxTransactions` | `number` | `50` | Maximum number of transactions to display |
| `onTransactionClick` | `(transaction: WalletTransaction) => void` | Optional | Callback when transaction is clicked |
| `onExportComplete` | `(report: ComplianceReport) => void` | Optional | Callback when export is completed |

## Identity-Specific Behavior

### ROOT Identity
- **Full Access**: Can view all transaction types and privacy levels
- **Privacy Toggle**: Can toggle between showing/hiding private transactions
- **Export Access**: Full compliance export capabilities
- **Risk Management**: Can view and manage all risk assessments

### DAO Identity
- **Governance Transparency**: All transactions are public by default
- **Compliance Focus**: Enhanced compliance reporting and audit trails
- **Collective Oversight**: Transactions may require governance approval
- **Multi-signature Support**: Shows multi-signature transaction status

### ENTERPRISE Identity
- **Business Context**: Filtered for business-relevant transactions only
- **Compliance Reporting**: Enhanced compliance and regulatory reporting
- **Restricted Access**: Limited to approved tokens and operations
- **Audit Requirements**: Comprehensive audit logging for business compliance

### CONSENTIDA Identity
- **Parental Controls**: Limited transaction visibility based on age/permissions
- **Guardian Oversight**: Transactions may require guardian approval
- **Educational Mode**: Simplified interface with educational prompts
- **Spending Limits**: Visual indicators for spending limits and restrictions

### AID Identity
- **Anonymous Mode**: Minimal transaction metadata display
- **Privacy First**: Transactions with high risk scores are hidden
- **Ephemeral Storage**: Transaction history may be limited or temporary
- **Minimal Logging**: Reduced audit trail to protect anonymity

## Filtering Options

### Transaction Types
- `SEND` - Outgoing transfers
- `RECEIVE` - Incoming transfers
- `MINT` - Token/NFT minting
- `BURN` - Token burning
- `SWAP` - Token swaps
- `STAKE` - Staking operations
- `UNSTAKE` - Unstaking operations
- `PI_DEPOSIT` - Pi Wallet deposits
- `PI_WITHDRAWAL` - Pi Wallet withdrawals

### Transaction Status
- `PENDING` - Transaction submitted but not confirmed
- `CONFIRMED` - Transaction confirmed on blockchain
- `FAILED` - Transaction failed to execute
- `CANCELLED` - Transaction cancelled by user
- `EXPIRED` - Transaction expired before confirmation

### Risk Levels
- `LOW` - Normal transactions with minimal risk
- `MEDIUM` - Transactions requiring attention
- `HIGH` - Transactions with elevated risk factors
- `CRITICAL` - Transactions requiring immediate review

## Export Formats

### Compliance Reports
- **Transaction Summary**: Overview of transaction activity
- **Risk Assessment**: Detailed risk analysis and factors
- **Compliance Status**: Regulatory compliance overview
- **Audit Trail**: Complete audit log with metadata

### Export Options
- **CSV**: Spreadsheet-compatible format
- **JSON**: Machine-readable structured data
- **PDF**: Human-readable formatted report
- **XLSX**: Excel-compatible format

## Privacy Controls

### Data Visibility
- **Public Transactions**: Visible to all identity types
- **Private Transactions**: Visible only to ROOT and authorized identities
- **Anonymous Transactions**: Minimal metadata, identity-specific visibility

### Metadata Handling
- **Device Fingerprinting**: Optional based on security settings
- **IP Address Logging**: Configurable per identity type
- **Geolocation Data**: Optional with user consent
- **Session Tracking**: Required for audit purposes

### Data Retention
- **Identity-Specific**: Different retention periods per identity type
- **Compliance Requirements**: Extended retention for business identities
- **Privacy Rights**: Right to deletion for personal identities
- **Audit Requirements**: Permanent retention for critical transactions

## Security Features

### Risk Assessment
- **Real-time Scoring**: Continuous risk assessment of transactions
- **Pattern Detection**: Identifies suspicious transaction patterns
- **Velocity Monitoring**: Tracks transaction frequency and volume
- **Compliance Checking**: Automated compliance rule validation

### Audit Integration
- **Qerberos Logging**: Comprehensive audit trail integration
- **Immutable Records**: Tamper-proof transaction logging
- **Compliance Reporting**: Automated regulatory reporting
- **Security Monitoring**: Real-time security event tracking

## Performance Considerations

### Data Loading
- **Pagination**: Efficient loading of large transaction histories
- **Caching**: Intelligent caching of frequently accessed data
- **Lazy Loading**: On-demand loading of transaction details
- **Background Updates**: Non-blocking data refresh

### Memory Management
- **Virtual Scrolling**: Efficient rendering of large lists
- **Data Cleanup**: Automatic cleanup of old cached data
- **Memory Limits**: Configurable memory usage limits
- **Performance Monitoring**: Built-in performance metrics

## Accessibility

### Keyboard Navigation
- **Tab Navigation**: Full keyboard accessibility
- **Shortcut Keys**: Configurable keyboard shortcuts
- **Screen Reader**: Full screen reader compatibility
- **Focus Management**: Proper focus handling

### Visual Accessibility
- **High Contrast**: Support for high contrast themes
- **Font Scaling**: Responsive to system font size settings
- **Color Blind**: Color-blind friendly design
- **Reduced Motion**: Respects reduced motion preferences

## Error Handling

### Network Errors
- **Retry Logic**: Automatic retry with exponential backoff
- **Offline Mode**: Graceful degradation when offline
- **Error Messages**: User-friendly error messages
- **Recovery Options**: Clear recovery actions

### Data Errors
- **Validation**: Client-side data validation
- **Sanitization**: Input sanitization and validation
- **Error Boundaries**: React error boundary protection
- **Fallback UI**: Graceful fallback interfaces

## Testing

### Unit Tests
- Component rendering and props handling
- Filter and search functionality
- Privacy control enforcement
- Export functionality

### Integration Tests
- Identity context switching
- Service integration (Qerberos, Qindex)
- Real-time data updates
- Error handling scenarios

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation
- Focus management

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Polyfills**: Automatic polyfill loading when needed

## Performance Metrics

- **Initial Load**: < 2 seconds for 50 transactions
- **Search Response**: < 500ms for filtered results
- **Export Generation**: < 5 seconds for 1000 transactions
- **Memory Usage**: < 50MB for 1000 cached transactions