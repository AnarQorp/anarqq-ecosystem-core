# Qwallet Frontend Components

## 🌟 Overview

The Qwallet frontend provides a complete user interface for wallet functionality in the AnarQ&Q ecosystem. Built with React, TypeScript, and TailwindCSS, it offers a responsive and mobile-friendly experience for managing tokens, NFTs, and transactions.

## 🏗️ Architecture

### Components Structure

```
src/components/qwallet/
├── QwalletDashboard.tsx    # Main wallet overview
├── NFTGallery.tsx          # NFT collection viewer
├── TokenTransferForm.tsx   # Token transfer interface
├── index.ts                # Component exports
└── README.md               # This file

src/composables/
└── useQwallet.ts           # React hook for wallet operations

src/pages/
└── QwalletDemo.tsx         # Demo page showcasing all components
```

## 🔧 Components

### 1. useQwallet Hook

**Location**: `src/composables/useQwallet.ts`

The main React hook that provides all wallet functionality:

```typescript
const {
  // State
  balances,           // Current token balances
  nfts,              // User's NFT collection
  transactions,      // Transaction history
  walletAddress,     // Wallet address
  loading,           // Loading state
  error,             // Error messages
  
  // Actions
  getBalance,        // Get specific token balance
  getAllBalances,    // Get all token balances
  transferFunds,     // Transfer tokens
  mintNFT,          // Mint new NFT
  signTransaction,   // Sign transactions
  listUserNFTs,     // List user's NFTs
  refreshWalletData, // Refresh all data
  
  // Utilities
  clearError        // Clear error state
} = useQwallet();
```

**Key Features**:
- ✅ **Automatic Data Loading** - Loads wallet data when sQuid identity changes
- ✅ **Error Handling** - Comprehensive error management with user-friendly messages
- ✅ **Loading States** - Proper loading indicators for all operations
- ✅ **Type Safety** - Full TypeScript support with detailed interfaces
- ✅ **API Integration** - Direct integration with backend Qwallet service

### 2. QwalletDashboard Component

**Location**: `src/components/qwallet/QwalletDashboard.tsx`

Main dashboard showing wallet overview and recent activity.

**Features**:
- ✅ **Token Balances** - Display $QToken and $PI balances with formatting
- ✅ **Wallet Information** - Show sQuid ID and wallet address
- ✅ **Recent Transactions** - List recent transactions with icons and descriptions
- ✅ **NFT Overview** - Preview of owned NFTs with quick access
- ✅ **Refresh Functionality** - Manual refresh button for real-time updates
- ✅ **Responsive Design** - Mobile-friendly layout with grid system

**Usage**:
```tsx
import { QwalletDashboard } from '../components/qwallet';

function App() {
  return <QwalletDashboard />;
}
```

### 3. NFTGallery Component

**Location**: `src/components/qwallet/NFTGallery.tsx`

Complete NFT collection viewer with search and filtering.

**Features**:
- ✅ **NFT Grid Display** - Responsive grid layout for NFT collection
- ✅ **Search Functionality** - Search by name, description, or token ID
- ✅ **Sorting Options** - Sort by name or minting date
- ✅ **NFT Details Modal** - Detailed view with metadata and attributes
- ✅ **IPFS Integration** - Direct links to IPFS content
- ✅ **Image Fallbacks** - Graceful handling of missing images
- ✅ **Attribute Display** - Rich metadata and attribute visualization

**Usage**:
```tsx
import { NFTGallery } from '../components/qwallet';

function NFTPage() {
  return <NFTGallery />;
}
```

### 4. TokenTransferForm Component

**Location**: `src/components/qwallet/TokenTransferForm.tsx`

Form for transferring tokens between sQuid identities.

**Features**:
- ✅ **Token Selection** - Choose between $QToken and $PI
- ✅ **Balance Validation** - Prevent overdraft with real-time balance checks
- ✅ **Recipient Validation** - Validate sQuid ID format and prevent self-transfers
- ✅ **Confirmation Modal** - Double-confirmation for security
- ✅ **Max Amount Button** - Quick selection of maximum available balance
- ✅ **Success/Error Handling** - Clear feedback for transfer results
- ✅ **Gas Estimation** - Display estimated transaction costs

**Usage**:
```tsx
import { TokenTransferForm } from '../components/qwallet';

function TransferPage() {
  return <TokenTransferForm />;
}
```

## 🎨 Styling

All components use **TailwindCSS** for styling with:

- ✅ **Responsive Design** - Mobile-first approach with breakpoints
- ✅ **Consistent Color Scheme** - Blue primary, gray neutrals, semantic colors
- ✅ **Accessibility** - WCAG compliant color contrasts and focus states
- ✅ **Loading States** - Skeleton loaders and spinners
- ✅ **Interactive Elements** - Hover states and transitions
- ✅ **Icon Integration** - Heroicons for consistent iconography

### Color Palette

```css
/* Primary Colors */
Blue: #3B82F6 (blue-600)
Blue Light: #DBEAFE (blue-100)
Blue Dark: #1D4ED8 (blue-700)

/* Secondary Colors */
Orange: #EA580C (orange-600) /* For PI token */
Green: #059669 (green-600)   /* For success states */
Red: #DC2626 (red-600)       /* For error states */

/* Neutral Colors */
Gray: #6B7280 (gray-500)
Gray Light: #F9FAFB (gray-50)
Gray Dark: #111827 (gray-900)
```

## 📱 Responsive Design

All components are fully responsive with breakpoints:

- **Mobile**: `< 640px` - Single column layouts, stacked elements
- **Tablet**: `640px - 1024px` - Two-column grids, compact navigation
- **Desktop**: `> 1024px` - Multi-column layouts, full feature set

## 🔐 Security Features

### Input Validation
- ✅ **sQuid ID Validation** - Format and length validation
- ✅ **Amount Validation** - Numeric validation with balance checks
- ✅ **XSS Prevention** - Proper input sanitization
- ✅ **CSRF Protection** - Token-based request authentication

### Error Handling
- ✅ **User-Friendly Messages** - Clear, actionable error messages
- ✅ **Graceful Degradation** - Fallbacks for service unavailability
- ✅ **Retry Mechanisms** - Automatic retry for transient failures
- ✅ **Secure Error Logging** - No sensitive data in error messages

## 🧪 Testing

### Component Testing
```bash
# Run component tests
npm test src/components/qwallet/

# Run with coverage
npm test -- --coverage src/components/qwallet/
```

### Integration Testing
```bash
# Test with backend integration
npm run test:integration
```

### Manual Testing Checklist
- [ ] Dashboard loads with correct balances
- [ ] NFT gallery displays all owned NFTs
- [ ] Token transfer validates inputs correctly
- [ ] Error states display appropriate messages
- [ ] Loading states show during operations
- [ ] Responsive design works on all screen sizes

## 🚀 Usage Examples

### Basic Integration

```tsx
import React from 'react';
import { QwalletDashboard, NFTGallery, TokenTransferForm } from './components/qwallet';
import { SquidProvider } from './contexts/SquidContext';

function App() {
  return (
    <SquidProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Dashboard */}
        <QwalletDashboard />
        
        {/* NFT Gallery */}
        <NFTGallery />
        
        {/* Transfer Form */}
        <TokenTransferForm />
      </div>
    </SquidProvider>
  );
}
```

### Custom Hook Usage

```tsx
import React from 'react';
import { useQwallet } from './composables/useQwallet';

function CustomWalletComponent() {
  const { balances, transferFunds, loading, error } = useQwallet();
  
  const handleQuickTransfer = async () => {
    const success = await transferFunds({
      toId: 'recipient_squid_id',
      amount: 10,
      token: 'QToken'
    });
    
    if (success) {
      console.log('Transfer completed!');
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>QToken Balance: {balances?.QToken.balance}</p>
      <button onClick={handleQuickTransfer}>
        Send 10 QToken
      </button>
    </div>
  );
}
```

### NFT Minting Example

```tsx
import React from 'react';
import { useQwallet } from './composables/useQwallet';

function NFTMinter() {
  const { mintNFT, loading } = useQwallet();
  
  const handleMint = async () => {
    const nft = await mintNFT({
      name: 'My Awesome NFT',
      description: 'A unique digital asset',
      image: 'https://example.com/image.png',
      attributes: [
        { trait_type: 'Rarity', value: 'Rare' },
        { trait_type: 'Category', value: 'Art' }
      ]
    });
    
    if (nft) {
      console.log('NFT minted:', nft.tokenId);
    }
  };
  
  return (
    <button 
      onClick={handleMint} 
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {loading ? 'Minting...' : 'Mint NFT'}
    </button>
  );
}
```

## 🔗 Integration with Other Modules

### Qmarket Integration
```tsx
// Use Qwallet for marketplace payments
const { signTransaction } = useQwallet();

const handleMarketplacePurchase = async (listingId: string, price: number) => {
  const signature = await signTransaction({
    action: 'marketplace_purchase',
    payload: { listingId, price }
  });
  
  // Process purchase with signature
};
```

### Qsocial Integration
```tsx
// Use Qwallet for content monetization
const { mintNFT } = useQwallet();

const handleContentNFT = async (contentCid: string, metadata: any) => {
  const nft = await mintNFT({
    name: metadata.title,
    description: metadata.description,
    contentCid,
    contractType: 'social'
  });
  
  // Share NFT in social feed
};
```

## 📊 Performance Optimization

### Lazy Loading
```tsx
import { lazy, Suspense } from 'react';

const NFTGallery = lazy(() => import('./components/qwallet/NFTGallery'));

function App() {
  return (
    <Suspense fallback={<div>Loading NFT Gallery...</div>}>
      <NFTGallery />
    </Suspense>
  );
}
```

### Memoization
```tsx
import { memo, useMemo } from 'react';

const NFTCard = memo(({ nft }) => {
  const formattedDate = useMemo(() => 
    new Date(nft.mintedAt).toLocaleDateString(),
    [nft.mintedAt]
  );
  
  return <div>{/* NFT card content */}</div>;
});
```

## 🛠️ Development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Feature Flags
VITE_ENABLE_NFT_MINTING=true
VITE_ENABLE_TOKEN_TRANSFERS=true
```

## 🔮 Future Enhancements

### Planned Features
- 🔄 **Real-time Updates** - WebSocket integration for live balance updates
- 🔄 **Batch Operations** - Multi-NFT operations and bulk transfers
- 🔄 **Advanced Filtering** - More sophisticated NFT filtering options
- 🔄 **Transaction History** - Detailed transaction history with export
- 🔄 **Portfolio Analytics** - Value tracking and performance metrics
- 🔄 **Mobile App** - React Native version for mobile devices

### Technical Improvements
- 🔄 **State Management** - Redux/Zustand for complex state management
- 🔄 **Caching** - React Query for better data caching
- 🔄 **Testing** - Comprehensive test suite with E2E tests
- 🔄 **Accessibility** - Enhanced screen reader support
- 🔄 **Internationalization** - Multi-language support

---

**Built with ❤️ for the decentralized future**