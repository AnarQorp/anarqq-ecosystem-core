import React, { useState } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { Asset, PurchaseRequest } from '../types/asset';

interface AssetCardProps {
  asset: Asset;
  userBalance: number;
  onPurchase: (tx: any) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, userBalance, onPurchase }) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sign } = useWallet();

  const handleBuyClick = async () => {
    if (userBalance < asset.price) {
      setError('Insufficient balance');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const purchaseRequest: PurchaseRequest = {
        assetId: asset.id,
        price: asset.price,
        currency: asset.currency,
        buyer: 'current-user-address', // This would come from the wallet in a real app
        timestamp: new Date().toISOString(),
      };

      // Sign the purchase request with encryption
      const signedTx = await sign(purchaseRequest, { encrypt: true });
      onPurchase(signedTx);
    } catch (err) {
      console.error('Error purchasing asset:', err);
      setError('Failed to process purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const canAfford = userBalance >= asset.price;
  const buttonClass = canAfford
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-gray-300 text-gray-600 cursor-not-allowed';

  return (
    <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gray-100 overflow-hidden">
        <img
          src={asset.imageUrl}
          alt={asset.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300';
          }}
        />
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{asset.name}</h3>
          <span className="font-bold text-lg">{asset.price} {asset.currency}</span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{asset.description}</p>
        
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <span>Seller: {`${asset.seller.substring(0, 6)}...${asset.seller.slice(-4)}`}</span>
          <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>
        
        <button
          onClick={handleBuyClick}
          disabled={!canAfford || isPurchasing}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${buttonClass}`}
        >
          {isPurchasing ? 'Processing...' : canAfford ? 'Buy Now' : 'Insufficient Balance'}
        </button>
        
        {error && (
          <div className="mt-2 text-red-500 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
