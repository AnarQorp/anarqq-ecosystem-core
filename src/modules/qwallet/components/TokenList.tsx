import React from 'react';
import { TokenBalance } from '@qwallet/core/types';

interface TokenListProps {
  tokens: TokenBalance[];
}

export const TokenList: React.FC<TokenListProps> = ({ tokens }) => {
  if (tokens.length === 0) {
    return <div className="text-gray-500 text-center py-4">No tokens found</div>;
  }

  return (
    <div className="space-y-3">
      {tokens.map((token) => (
        <div 
          key={token.symbol} 
          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="font-medium">{token.symbol}</div>
          <div className="text-gray-700">{token.balance.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
};
