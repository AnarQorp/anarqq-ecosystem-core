# Qwallet Frontend - AnarQ&Q Ecosystem

## 🧭 Overview

Qwallet is the native wallet frontend module of the AnarQ&Q ecosystem, providing a comprehensive user interface for managing digital assets, tokens, and NFTs. Built on the Q∞ architecture principles, it seamlessly integrates with sQuid decentralized identities to deliver a complete tokenized economy experience.

### Key Features

- 🪙 **Multi-Token Support** - Manage $QToken (utility) and $PI (currency) with real-time balances
- 🎨 **NFT Management** - Complete NFT collection viewer with minting capabilities
- 🔐 **sQuid Integration** - Identity-bound wallet operations with cryptographic signatures
- 💸 **Token Transfers** - Secure peer-to-peer transfers between sQuid identities
- 📊 **Transaction History** - Comprehensive audit trail of all wallet activities
- 🌐 **Ecosystem Integration** - Native support for Qmarket and Qsocial modules

### Tokenized Economy Support

Qwallet serves as the financial backbone of the AnarQ&Q ecosystem, enabling:
- **$QToken** - Utility token for ecosystem services and governance
- **$PI** - Currency token for marketplace transactions and rewards
- **NFT Economy** - Creation, trading, and management of digital assets
- **Cross-Module Payments** - Seamless transactions across Qmarket and Qsocial

## 🧩 Components Overview

### Core Architecture

```
Qwallet Frontend
├── useQwallet Hook          # State management and API integration
├── QwalletDashboard         # Main wallet overview interface
├── NFTGallery              # NFT collection management
├── TokenTransferForm       # Peer-to-peer token transfers
└── QwalletDemo             # Complete integration example
```

### 1. `useQwallet.ts` - React Hook

**Location**: `src/composables/useQwallet.ts`

The central React hook that provides all wallet functionality through a clean, type-safe interface.

**Core Functions**:
```typescript
const {
  // State Management
  balances,           // Current $QToken and $PI balances
  nfts,              // User's NFT collection
  transactions,      // Transaction history
  walletAddress,     // Blockchain wallet address
  loading,           // Operation loading states
  error,             // Error handling
  
  // Token Operations
  getBalance,        // Get specific token balance
  getAllBalances,    // Get all token balances
  transferFunds,     // Transfer tokens between identities
  
  // NFT Operations
  mintNFT,          // Create new NFTs
  listUserNFTs,     // Retrieve NFT collection
  
  // Transaction Management
  signTransaction,   // Sign operations with sQuid identity
  getTransactionHistory, // Retrieve transaction history
  
  // Utilities
  refreshWalletData, // Refresh all wallet data
  clearError        // Clear error states
} = useQwallet();
```

**Key Features**:
- ✅ **Automatic Data Loading** - Loads wallet data when sQuid identity changes
- ✅ **Type Safety** - Complete TypeScript interfaces for all operations
- ✅ **Error Handling** - Comprehensive error management with user-friendly messages
- ✅ **Loading States** - Proper loading indicators for all async operations
- ✅ **Real-time Updates** - Automatic refresh after transactions

### 2. `QwalletDashboard.tsx` - Main Dashboard

**Location**: `src/components/qwallet/QwalletDashboard.tsx`

The primary wallet interface providing an overview of all wallet activities and assets.

**Features**:
- 💰 **Token Balances** - Real-time display of $QToken and $PI balances with formatting
- 📋 **Wallet Information** - sQuid identity and blockchain address display
- 🕒 **Recent Transactions** - Latest transactions with type icons and descriptions
- 🖼️ **NFT Preview** - Quick overview of owned NFTs with navigation to full gallery
- 🔄 **Refresh Controls** - Manual refresh functionality with loading states
- 📱 **Responsive Layout** - Optimized for mobile, tablet, and desktop viewing

**Component Structure**:
```tsx
<QwalletDashboard>
  <WalletHeader />           // Identity and refresh controls
  <ErrorAlert />             // Error state display
  <WalletInfo />             // sQuid ID and address
  <TokenBalances />          // $QToken and $PI balance cards
  <RecentTransactions />     // Transaction history preview
  <NFTOverview />           // NFT collection preview
</QwalletDashboard>
```

### 3. `NFTGallery.tsx` - NFT Collection Manager

**Location**: `src/components/qwallet/NFTGallery.tsx`

A comprehensive NFT collection viewer with advanced search, filtering, and detail viewing capabilities.

**Features**:
- 🎨 **Responsive Grid** - Adaptive layout (1-6 columns based on screen size)
- 🔍 **Advanced Search** - Search by name, description, or token ID
- 📊 **Sorting Options** - Sort by name, minting date, or other attributes
- 🖼️ **NFT Detail Modal** - Full metadata view with attributes and IPFS links
- 🌐 **IPFS Integration** - Direct links to decentralized content storage
- 🖥️ **Image Fallbacks** - Graceful handling of missing or broken images
- 🏷️ **Rich Metadata** - Complete attribute display with visual formatting

**Component Structure**:
```tsx
<NFTGallery>
  <SearchAndFilter />        // Search input and sorting controls
  <NFTGrid>                  // Responsive NFT card grid
    <NFTCard />              // Individual NFT preview cards
  </NFTGrid>
  <NFTModal />              // Detailed NFT view modal
</NFTGallery>
```

### 4. `TokenTransferForm.tsx` - Transfer Interface

**Location**: `src/components/qwallet/TokenTransferForm.tsx`

A secure, user-friendly interface for transferring tokens between sQuid identities.

**Features**:
- 🪙 **Token Selection** - Choose between $QToken and $PI with visual indicators
- ✅ **Balance Validation** - Real-time balance checks to prevent overdrafts
- 🎯 **Recipient Validation** - sQuid ID format validation and self-transfer prevention
- 🔒 **Confirmation Modal** - Double-confirmation security for all transfers
- ⚡ **Max Amount** - Quick selection of maximum available balance
- 📊 **Gas Estimation** - Transaction cost display and estimation
- 💬 **Feedback System** - Clear success/error messages with actionable information

**Component Structure**:
```tsx
<TokenTransferForm>
  <BalanceDisplay />         // Current token balances
  <TokenSelector />          // $QToken/$PI selection
  <RecipientInput />         // sQuid ID input with validation
  <AmountInput />           // Amount input with max button
  <TransferButton />        // Submit with loading states
  <ConfirmationModal />     // Security confirmation dialog
</TokenTransferForm>
```

### 5. `QwalletDemo.tsx` - Integration Example

**Location**: `src/pages/QwalletDemo.tsx`

A complete demonstration page showcasing all Qwallet components in a tabbed interface.

**Features**:
- 📑 **Tabbed Navigation** - Easy switching between different wallet functions
- 🚀 **Quick Actions** - Fast NFT minting and other common operations
- 👤 **Identity Display** - Current connected sQuid identity information
- 🎯 **Integration Example** - Complete code example for developers

## 🎨 UI/UX Features

### TailwindCSS Design System

The Qwallet frontend uses a comprehensive TailwindCSS-based design system for consistent, professional styling:

**Color Palette**:
```css
/* Primary Colors */
--blue-600: #3B82F6;      /* Primary actions and QToken */
--orange-600: #EA580C;    /* PI token and secondary actions */
--green-600: #059669;     /* Success states and confirmations */
--red-600: #DC2626;       /* Error states and warnings */

/* Neutral Colors */
--gray-50: #F9FAFB;       /* Background surfaces */
--gray-500: #6B7280;      /* Secondary text */
--gray-900: #111827;      /* Primary text */
```

**Typography Scale**:
- **Headings**: `text-2xl` to `text-3xl` with `font-bold`
- **Body Text**: `text-sm` to `text-base` with `font-medium`
- **Captions**: `text-xs` with `text-gray-500`
- **Monospace**: `font-mono` for addresses and IDs

### Responsive Layout System

**Breakpoint Strategy**:
```css
/* Mobile First Approach */
sm: 640px   /* Tablet portrait */
md: 768px   /* Tablet landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

**Layout Patterns**:
- **Mobile** (`< 640px`): Single column, stacked elements, touch-optimized buttons
- **Tablet** (`640px - 1024px`): Two-column grids, compact navigation
- **Desktop** (`> 1024px`): Multi-column layouts, full feature set

### Accessibility (WCAG) Compliance

**Color Contrast**:
- ✅ **AA Compliance** - All text meets WCAG AA contrast ratios (4.5:1)
- ✅ **AAA Compliance** - Critical elements meet WCAG AAA standards (7:1)
- ✅ **Color Independence** - Information not conveyed by color alone

**Keyboard Navigation**:
- ✅ **Tab Order** - Logical tab sequence through all interactive elements
- ✅ **Focus Indicators** - Clear visual focus states with `focus:ring-2`
- ✅ **Skip Links** - Navigation shortcuts for screen readers

**Screen Reader Support**:
- ✅ **Semantic HTML** - Proper heading hierarchy and landmark elements
- ✅ **ARIA Labels** - Descriptive labels for complex interactions
- ✅ **Alt Text** - Comprehensive image descriptions for NFTs

### Feedback States

**Loading States**:
```tsx
// Skeleton loaders for content
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
</div>

// Spinner for actions
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
```

**Success/Error Messages**:
```tsx
// Success state
<div className="bg-green-50 border border-green-200 rounded-lg p-4">
  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
  <p className="text-green-800">Operation completed successfully!</p>
</div>

// Error state
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
  <p className="text-red-800">Error message with actionable guidance</p>
</div>
```

## 🔗 Integrations

### Backend QwalletService Integration

The frontend connects directly to the backend QwalletService through RESTful APIs:

```typescript
// API Base Configuration
const API_BASE = '/api/qwallet';

// Example API call with authentication
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Squid-ID': currentSquid.id,
      ...options.headers,
    },
  });
  return response.json();
};
```

**API Endpoints Used**:
- `GET /api/qwallet/balance/:squidId` - Token balance retrieval
- `POST /api/qwallet/transfer` - Token transfers
- `POST /api/qwallet/mint` - NFT minting
- `GET /api/qwallet/nfts/:squidId` - NFT collection
- `POST /api/qwallet/sign` - Transaction signing

### sQuid Identity Context Integration

Seamless integration with the sQuid identity system for authentication and authorization:

```typescript
import { useSquidContext } from '../contexts/SquidContext';

const { currentSquid } = useSquidContext();

// Automatic wallet data loading when identity changes
useEffect(() => {
  if (currentSquid?.id) {
    refreshWalletData();
  }
}, [currentSquid?.id]);
```

**Identity Features**:
- ✅ **Automatic Authentication** - Uses current sQuid identity for all operations
- ✅ **Identity Switching** - Automatically refreshes wallet data on identity change
- ✅ **Permission Management** - Respects sQuid-based access controls
- ✅ **Signature Integration** - Uses sQuid private keys for transaction signing

### Qmarket Module Integration

Ready-to-use integration points for marketplace functionality:

```typescript
// Marketplace payment processing
const handleMarketplacePurchase = async (listingId: string, price: number) => {
  const signature = await signTransaction({
    action: 'marketplace_purchase',
    payload: { listingId, price, currency: 'QToken' }
  });
  
  // Process purchase with signed transaction
  return signature;
};

// NFT listing creation
const handleCreateListing = async (nftId: string, price: number) => {
  const signature = await signTransaction({
    action: 'create_listing',
    payload: { nftId, price, currency: 'QToken' }
  });
  
  return signature;
};
```

### Qsocial Module Integration

Content monetization and social NFT features:

```typescript
// Social content NFT creation
const handleSocialNFT = async (contentCid: string, metadata: any) => {
  const nft = await mintNFT({
    name: metadata.title,
    description: metadata.description,
    contentCid,
    contractType: 'social',
    attributes: [
      { trait_type: 'Content Type', value: metadata.type },
      { trait_type: 'Social Platform', value: 'AnarQ&Q' }
    ]
  });
  
  return nft;
};

// Token rewards for social interactions
const handleSocialReward = async (recipientId: string, amount: number) => {
  return await transferFunds({
    toId: recipientId,
    amount,
    token: 'QToken'
  });
};
```

### IPFS and Qindex Integration

**IPFS Content Access**:
```typescript
// Generate IPFS URLs for NFT content
const getIPFSUrl = (cid: string): string => {
  return `https://ipfs.io/ipfs/${cid}`;
};

// NFT image with IPFS fallback
<img 
  src={nft.image || getIPFSUrl(nft.contentCid)} 
  alt={nft.name}
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/placeholder-nft.png';
  }}
/>
```

**Qindex Search Integration**:
- ✅ **NFT Metadata Registration** - Automatic registration of minted NFTs
- ✅ **Search Functionality** - Integration with ecosystem-wide search
- ✅ **Content Discovery** - NFTs discoverable across modules
- ✅ **Metadata Indexing** - Rich attribute and tag indexing

## ⚙️ Setup Instructions

### Installation and Import

**1. Import the Hook and Components**:
```typescript
// Import the main hook
import { useQwallet } from '../composables/useQwallet';

// Import individual components
import { 
  QwalletDashboard, 
  NFTGallery, 
  TokenTransferForm 
} from '../components/qwallet';

// Or import everything at once
import * as Qwallet from '../components/qwallet';
```

**2. Basic Hook Usage**:
```typescript
import React from 'react';
import { useQwallet } from '../composables/useQwallet';

function WalletComponent() {
  const { 
    balances, 
    transferFunds, 
    mintNFT, 
    loading, 
    error 
  } = useQwallet();

  const handleTransfer = async () => {
    const success = await transferFunds({
      toId: 'recipient_squid_id',
      amount: 10,
      token: 'QToken'
    });
    
    if (success) {
      console.log('Transfer completed!');
    }
  };

  if (loading) return <div>Loading wallet...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Wallet</h2>
      <p>QToken Balance: {balances?.QToken.balance}</p>
      <p>PI Balance: {balances?.PI.balance}</p>
      <button onClick={handleTransfer}>Send 10 QToken</button>
    </div>
  );
}
```

### Component Usage Examples

**3. Dashboard Integration**:
```typescript
import React from 'react';
import { QwalletDashboard } from '../components/qwallet';
import { SquidProvider } from '../contexts/SquidContext';

function WalletPage() {
  return (
    <SquidProvider>
      <div className="min-h-screen bg-gray-50">
        <QwalletDashboard />
      </div>
    </SquidProvider>
  );
}
```

**4. NFT Gallery Integration**:
```typescript
import React from 'react';
import { NFTGallery } from '../components/qwallet';

function NFTPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My NFT Collection</h1>
      <NFTGallery />
    </div>
  );
}
```

**5. Token Transfer Integration**:
```typescript
import React from 'react';
import { TokenTransferForm } from '../components/qwallet';

function TransferPage() {
  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold text-center mb-8">Send Tokens</h1>
      <TokenTransferForm />
    </div>
  );
}
```

### Complete Integration Example

**6. Full Application Integration** (based on `QwalletDemo.tsx`):
```typescript
import React, { useState } from 'react';
import { 
  QwalletDashboard, 
  NFTGallery, 
  TokenTransferForm,
  useQwallet 
} from '../components/qwallet';
import { useSquidContext } from '../contexts/SquidContext';

type ActiveTab = 'dashboard' | 'gallery' | 'transfer';

function QwalletApp() {
  const { currentSquid } = useSquidContext();
  const { mintNFT, loading } = useQwallet();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const handleQuickMint = async () => {
    if (!currentSquid) return;
    
    const nft = await mintNFT({
      name: `Demo NFT #${Date.now()}`,
      description: 'A demo NFT created from the Qwallet interface',
      attributes: [
        { trait_type: 'Type', value: 'Demo' },
        { trait_type: 'Created', value: new Date().toLocaleDateString() }
      ]
    });
    
    if (nft) {
      console.log('NFT minted:', nft.tokenId);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <QwalletDashboard />;
      case 'gallery':
        return <NFTGallery />;
      case 'transfer':
        return <TokenTransferForm />;
      default:
        return <QwalletDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">Qwallet</h1>
            
            {currentSquid && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleQuickMint}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Minting...' : 'Quick Mint NFT'}
                </button>
                
                <span className="text-sm text-gray-600">
                  {currentSquid.id.substring(0, 12)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard' },
              { id: 'gallery', name: 'NFT Gallery' },
              { id: 'transfer', name: 'Send Tokens' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}

export default QwalletApp;
```

## 📁 File Structure

### Complete Directory Layout

```
src/
├── composables/
│   └── useQwallet.ts                    # Main React hook for wallet operations
│
├── components/qwallet/
│   ├── QwalletDashboard.tsx             # Main wallet dashboard component
│   ├── NFTGallery.tsx                   # NFT collection viewer and manager
│   ├── TokenTransferForm.tsx            # Token transfer interface
│   ├── index.ts                         # Component exports and type definitions
│   └── README.md                        # Component-specific documentation
│
├── pages/
│   └── QwalletDemo.tsx                  # Complete integration demo page
│
├── contexts/
│   └── SquidContext.tsx                 # sQuid identity context (existing)
│
└── types/
    └── qwallet.ts                       # TypeScript type definitions
```

### File Purposes and Responsibilities

**Core Hook** (`src/composables/useQwallet.ts`):
- 🎯 **Purpose**: Central state management and API integration for all wallet operations
- 🔧 **Responsibilities**: 
  - Token balance management and retrieval
  - NFT collection management and minting
  - Transaction signing and history
  - Error handling and loading states
  - Backend API communication

**Dashboard Component** (`src/components/qwallet/QwalletDashboard.tsx`):
- 🎯 **Purpose**: Main wallet overview interface for users
- 🔧 **Responsibilities**:
  - Display current token balances ($QToken, $PI)
  - Show recent transaction history
  - Provide NFT collection preview
  - Wallet information display (sQuid ID, address)
  - Refresh and error handling UI

**NFT Gallery** (`src/components/qwallet/NFTGallery.tsx`):
- 🎯 **Purpose**: Comprehensive NFT collection management interface
- 🔧 **Responsibilities**:
  - Display NFT collection in responsive grid
  - Search and filter functionality
  - NFT detail modal with full metadata
  - IPFS content integration
  - Attribute and metadata visualization

**Transfer Form** (`src/components/qwallet/TokenTransferForm.tsx`):
- 🎯 **Purpose**: Secure token transfer interface between sQuid identities
- 🔧 **Responsibilities**:
  - Token selection ($QToken/$PI)
  - Recipient validation and input
  - Balance validation and amount input
  - Transfer confirmation and security
  - Success/error feedback

**Demo Page** (`src/pages/QwalletDemo.tsx`):
- 🎯 **Purpose**: Complete integration example and testing interface
- 🔧 **Responsibilities**:
  - Demonstrate all component integrations
  - Provide tabbed navigation between features
  - Show best practices for implementation
  - Quick action buttons for testing

**Documentation Files**:
- `README.md` (this file): Complete frontend documentation
- `src/components/qwallet/README.md`: Component-specific documentation
- `QWALLET_FRONTEND_SUMMARY.md`: Implementation summary and status

## 💡 Developer Notes

### Q∞ Architecture Compliance

The Qwallet frontend follows the Q∞ architecture principles established in the AnarQ&Q ecosystem:

**Entry → Process → Output Flow**:
```typescript
// Entry: User interaction and input validation
const handleTransfer = async (formData) => {
  // Input validation and sanitization
  if (!validateTransferData(formData)) return;
  
  // Process: Backend integration and state management
  const result = await transferFunds({
    toId: formData.recipient,
    amount: formData.amount,
    token: formData.token
  });
  
  // Output: User feedback and state updates
  if (result) {
    showSuccessMessage('Transfer completed successfully');
    refreshWalletData();
  } else {
    showErrorMessage('Transfer failed');
  }
};
```

**Modular Integration**:
- ✅ **Service Reuse** - Leverages existing backend QwalletService
- ✅ **Context Integration** - Uses existing sQuid identity context
- ✅ **Component Composition** - Modular components for flexible integration
- ✅ **State Management** - Centralized state through useQwallet hook

### Service Integration Guidelines

**Do NOT Duplicate Existing Services**:
```typescript
// ❌ DON'T: Implement your own signing logic
const signTransaction = (data) => {
  // Custom signing implementation
};

// ✅ DO: Use the existing QwalletService
const { signTransaction } = useQwallet();
const signature = await signTransaction({
  action: 'transfer_funds',
  payload: transferData
});
```

**Leverage Existing Infrastructure**:
- ✅ **Backend Services** - Use QwalletService, QindexService, etc.
- ✅ **Identity Management** - Use SquidContext for authentication
- ✅ **Error Handling** - Follow established error patterns
- ✅ **API Patterns** - Maintain consistency with existing API calls

### Best Practices for Extension

**Adding New Components**:
```typescript
// Follow the established pattern
import React from 'react';
import { useQwallet } from '../../composables/useQwallet';
import { useSquidContext } from '../../contexts/SquidContext';

const NewQwalletComponent: React.FC = () => {
  const { currentSquid } = useSquidContext();
  const { /* required hook functions */ } = useQwallet();
  
  // Component implementation following existing patterns
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Component content */}
    </div>
  );
};

export default NewQwalletComponent;
```

**Extending the Hook**:
```typescript
// Add new functionality to useQwallet
export const useQwallet = (): UseQwalletReturn => {
  // Existing functionality...
  
  // New function following established patterns
  const newWalletFunction = useCallback(async (params) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall('/new-endpoint', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (response.success) {
        // Update relevant state
        return response.data;
      }
      
      throw new Error(response.error);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);
  
  return {
    // Existing returns...
    newWalletFunction
  };
};
```

### Future Upgrade Considerations

**Real Blockchain Integration**:
```typescript
// Current: Mock blockchain operations
const transferFunds = async (params) => {
  // Simulated transfer via backend
  return await apiCall('/transfer', { method: 'POST', body: JSON.stringify(params) });
};

// Future: Real blockchain integration
const transferFunds = async (params) => {
  // Real blockchain transaction
  const web3 = new Web3(provider);
  const contract = new web3.eth.Contract(tokenABI, tokenAddress);
  const transaction = await contract.methods.transfer(params.toId, params.amount).send({
    from: currentSquid.walletAddress
  });
  
  return transaction;
};
```

**External Wallet Integration**:
```typescript
// Future: MetaMask, WalletConnect integration
const connectExternalWallet = async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    // Link external wallet to sQuid identity
    await linkWalletToSquid(accounts[0], currentSquid.id);
  }
};
```

**Enhanced Security Features**:
- 🔄 **Hardware Wallet Support** - Ledger, Trezor integration
- 🔄 **Multi-Signature Wallets** - Enhanced security for high-value operations
- 🔄 **Biometric Authentication** - WebAuthn integration for mobile
- 🔄 **Transaction Limits** - Configurable spending limits and approvals

### Performance Optimization Notes

**Component Optimization**:
```typescript
// Use React.memo for expensive components
const NFTCard = React.memo(({ nft }) => {
  // Component implementation
});

// Use useMemo for expensive calculations
const sortedNFTs = useMemo(() => {
  return nfts.sort((a, b) => new Date(b.mintedAt) - new Date(a.mintedAt));
}, [nfts]);

// Use useCallback for event handlers
const handleTransfer = useCallback(async (params) => {
  // Transfer logic
}, [transferFunds]);
```

**Data Management**:
```typescript
// Implement pagination for large collections
const { nfts, loading, hasMore, loadMore } = useInfiniteNFTs(squidId);

// Cache frequently accessed data
const cachedBalances = useMemo(() => balances, [balances]);

// Debounce search inputs
const debouncedSearch = useDebounce(searchTerm, 300);
```

---

**Built with ❤️ for the decentralized future**

*This frontend module provides the foundation for a complete tokenized economy within the AnarQ&Q ecosystem. It seamlessly integrates with existing services while providing a professional, accessible, and secure user experience for managing digital assets and tokens.*