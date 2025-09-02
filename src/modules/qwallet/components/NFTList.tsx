import React from 'react';
import { NFTItem } from '@qwallet/core/types';

interface NFTListProps {
  nfts: NFTItem[];
  onTransfer?: (tokenId: string) => void;
  isLoading?: boolean;
}

export const NFTList: React.FC<NFTListProps> = ({ nfts, onTransfer, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-64 flex flex-col">
            <div className="bg-gray-200 h-40 rounded-md mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No NFTs found in your collection
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {nfts.map((nft) => (
        <div key={nft.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
          <div className="aspect-square bg-gray-100">
            <img 
              src={nft.image} 
              alt={nft.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to a placeholder if image fails to load
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=NFT+Image';
              }}
            />
          </div>
          <div className="p-4">
            <h3 className="font-medium text-lg mb-1">{nft.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{nft.collection}</p>
            {onTransfer && (
              <button
                onClick={() => onTransfer(nft.id)}
                className="w-full py-2 px-4 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                Transfer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Add display name for better debugging
NFTList.displayName = 'NFTList';
