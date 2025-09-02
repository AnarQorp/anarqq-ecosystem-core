/**
 * TokenOverviewPanel Usage Example
 * 
 * Demonstrates how to use the TokenOverviewPanel component
 * in different scenarios within the DAO Dashboard.
 */

import React from 'react';
import TokenOverviewPanel from './TokenOverviewPanel';
import type { TokenInfo } from './TokenOverviewPanel';

// Example token information
const exampleTokenInfo: TokenInfo = {
  name: 'AnarQ DAO Token',
  symbol: 'AQDAO',
  totalSupply: 1000000,
  circulatingSupply: 750000,
  holderCount: 1250,
  contractAddress: '0x1234567890123456789012345678901234567890',
  type: 'token-weighted',
  decimals: 18,
  network: 'ethereum'
};

// Example usage in a DAO Dashboard
export const TokenOverviewExample: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        TokenOverviewPanel Examples
      </h1>

      {/* Example 1: With provided token info */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          1. With Provided Token Information
        </h2>
        <TokenOverviewPanel 
          daoId="example-dao-1"
          tokenInfo={exampleTokenInfo}
          className="max-w-md"
        />
      </div>

      {/* Example 2: Without token info (will fetch from API) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          2. Auto-fetch Token Information
        </h2>
        <TokenOverviewPanel 
          daoId="example-dao-2"
          className="max-w-md"
        />
      </div>

      {/* Example 3: Different governance types */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          3. Different Governance Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TokenOverviewPanel 
            daoId="user-based-dao"
            tokenInfo={{
              ...exampleTokenInfo,
              name: 'User-Based DAO',
              symbol: 'UBDAO',
              type: 'user-based'
            }}
          />
          <TokenOverviewPanel 
            daoId="token-weighted-dao"
            tokenInfo={{
              ...exampleTokenInfo,
              name: 'Token-Weighted DAO',
              symbol: 'TWDAO',
              type: 'token-weighted'
            }}
          />
          <TokenOverviewPanel 
            daoId="nft-weighted-dao"
            tokenInfo={{
              ...exampleTokenInfo,
              name: 'NFT-Weighted DAO',
              symbol: 'NWDAO',
              type: 'nft-weighted'
            }}
          />
        </div>
      </div>

      {/* Example 4: Integration in DAO Dashboard layout */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          4. DAO Dashboard Integration
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - DAO Info */}
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">DAO Information</h3>
              <p className="text-gray-600 text-sm">
                This would contain general DAO information, proposals, etc.
              </p>
            </div>
          </div>
          
          {/* Right column - Economic Data */}
          <div className="space-y-4">
            <TokenOverviewPanel 
              daoId="integrated-dao"
              tokenInfo={exampleTokenInfo}
            />
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Member Wallet</h3>
              <p className="text-gray-600 text-sm">
                This would contain wallet overview, quick actions, etc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenOverviewExample;