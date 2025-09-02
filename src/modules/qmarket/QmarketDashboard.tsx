import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { AssetCard } from './components/AssetCard';
import { Asset, PurchaseRequest } from './types/asset';

// Mock data for the marketplace
const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    name: 'Rare Digital Artwork #42',
    description: 'A unique piece of digital art created by a renowned artist in the space.',
    imageUrl: 'https://source.unsplash.com/random/300x300/?digital,art',
    price: 1.5,
    currency: 'ETH',
    seller: '0x1234...5678',
    category: 'Art',
    createdAt: '2023-06-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'CryptoPunk #9999',
    description: 'One of the rarest CryptoPunks in existence with unique attributes.',
    imageUrl: 'https://source.unsplash.com/random/300x300/?cryptopunk',
    price: 2.5,
    currency: 'ETH',
    seller: '0xabcd...ef01',
    category: 'Collectible',
    createdAt: '2023-05-20T14:45:00Z',
  },
  {
    id: '3',
    name: 'Virtual Land Parcel',
    description: 'Prime virtual real estate in the metaverse with high foot traffic.',
    imageUrl: 'https://source.unsplash.com/random/300x300/?virtual,land',
    price: 5.0,
    currency: 'ETH',
    seller: '0x9876...5432',
    category: 'Virtual Land',
    createdAt: '2023-07-01T09:15:00Z',
  },
];

export const QmarketDashboard: React.FC = () => {
  const { balances, sign } = useWallet();
  const [purchaseResult, setPurchaseResult] = useState<{
    success: boolean;
    message: string;
    tx?: any;
  } | null>(null);

  // Find user's ETH balance (or default to 0)
  const ethBalance = balances.find(b => b.symbol === 'ETH')?.balance || 0;

  const handlePurchase = async (signedTx: any) => {
    try {
      // In a real app, this would send the signed transaction to your backend
      console.log('Purchase transaction signed:', signedTx);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate purchase result
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setPurchaseResult({
        success,
        message: success 
          ? 'Purchase successful! Your new asset will appear in your collection shortly.'
          : 'Purchase failed. Please try again.',
        tx: signedTx
      });
      
      // Clear the result after 5 seconds
      setTimeout(() => setPurchaseResult(null), 5000);
    } catch (error) {
      console.error('Error processing purchase:', error);
      setPurchaseResult({
        success: false,
        message: 'An error occurred while processing your purchase.'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Qmarket</h1>
        <div className="bg-gray-100 px-4 py-2 rounded-lg">
          <span className="font-medium">Your Balance: </span>
          <span className="font-mono">{ethBalance.toFixed(4)} ETH</span>
        </div>
      </div>

      {purchaseResult && (
        <div 
          className={`p-4 mb-6 rounded-lg ${
            purchaseResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            <span className="font-medium">
              {purchaseResult.success ? '✅' : '⚠️'} {purchaseResult.message}
            </span>
            <button 
              onClick={() => setPurchaseResult(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {purchaseResult.tx && (
            <div className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
              <pre className="text-xs">
                {JSON.stringify({
                  txId: purchaseResult.tx.signature?.substring(0, 16) + '...',
                  isEncrypted: purchaseResult.tx.isEncrypted,
                  timestamp: purchaseResult.tx.timestamp,
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_ASSETS.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            userBalance={ethBalance}
            onPurchase={handlePurchase}
          />
        ))}
      </div>

      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Powered by Qwallet - Secure encrypted transactions</p>
      </div>
    </div>
  );
};

export default QmarketDashboard;
