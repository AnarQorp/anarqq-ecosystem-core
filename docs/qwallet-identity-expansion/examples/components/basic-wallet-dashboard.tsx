/**
 * Basic Wallet Dashboard Example
 * 
 * This example shows how to create a simple wallet dashboard
 * that adapts to different identity types.
 */

import React from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { WalletDashboard, TokenTransferForm } from '@/components/qwallet';

interface BasicWalletDashboardProps {
  className?: string;
  showTransferForm?: boolean;
}

export function BasicWalletDashboard({ 
  className = '',
  showTransferForm = true 
}: BasicWalletDashboardProps) {
  const { activeIdentity } = useIdentityManager();
  const { 
    balances, 
    limits, 
    recentTransactions, 
    loading, 
    error,
    refreshData 
  } = useIdentityQwallet(activeIdentity.id);

  if (loading) {
    return (
      <div className={`wallet-loading ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`wallet-error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Wallet Error</h3>
          <p className="text-red-600 mt-2">{error.message}</p>
          <button 
            onClick={refreshData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-dashboard ${className}`}>
      {/* Header */}
      <div className="wallet-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {activeIdentity.type} Wallet
        </h2>
        <p className="text-gray-600">
          {activeIdentity.name || `${activeIdentity.type} Identity`}
        </p>
      </div>

      {/* Balance Overview */}
      <div className="balance-overview mb-6">
        <h3 className="text-lg font-semibold mb-3">Token Balances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(balances).map(([token, amount]) => (
            <div 
              key={token}
              className="balance-card bg-white border rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{token}</span>
                <span className="text-xl font-bold text-blue-600">
                  {amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limits Display */}
      <div className="limits-overview mb-6">
        <h3 className="text-lg font-semibold mb-3">Transaction Limits</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Daily Limit</span>
              <div className="text-lg font-semibold">
                {limits.dailyTransferLimit.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Max Transaction</span>
              <div className="text-lg font-semibold">
                {limits.maxTransactionAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="recent-transactions mb-6">
        <h3 className="text-lg font-semibold mb-3">Recent Transactions</h3>
        <div className="bg-white border rounded-lg">
          {recentTransactions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No recent transactions
            </div>
          ) : (
            <div className="divide-y">
              {recentTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {tx.type === 'SEND' ? 'Sent' : 'Received'} {tx.token}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    tx.type === 'SEND' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {tx.type === 'SEND' ? '-' : '+'}{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Form */}
      {showTransferForm && (
        <div className="transfer-section">
          <h3 className="text-lg font-semibold mb-3">Send Tokens</h3>
          <TokenTransferForm 
            identityId={activeIdentity.id}
            onTransferComplete={(result) => {
              if (result.success) {
                refreshData();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

// Usage example
export function WalletPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <BasicWalletDashboard 
        className="max-w-4xl mx-auto"
        showTransferForm={true}
      />
    </div>
  );
}

// Identity-specific customization example
export function CustomizedWalletDashboard() {
  const { activeIdentity } = useIdentityManager();
  
  // Customize based on identity type
  const getCustomization = () => {
    switch (activeIdentity.type) {
      case 'ROOT':
        return {
          showAdminControls: true,
          showAllTokens: true,
          showSystemStats: true
        };
      case 'DAO':
        return {
          showGovernanceInfo: true,
          showDAOTreasury: true,
          showProposals: true
        };
      case 'ENTERPRISE':
        return {
          showComplianceStatus: true,
          showAuditReports: true,
          showBusinessMetrics: true
        };
      case 'CONSENTIDA':
        return {
          showEducationalTips: true,
          showGuardianStatus: true,
          simplifiedInterface: true
        };
      case 'AID':
        return {
          showPrivacyStatus: true,
          minimalistInterface: true,
          showAnonymityLevel: true
        };
      default:
        return {};
    }
  };

  const customization = getCustomization();

  return (
    <div className="customized-wallet">
      <BasicWalletDashboard />
      
      {/* Identity-specific additions */}
      {customization.showAdminControls && (
        <AdminControlPanel identityId={activeIdentity.id} />
      )}
      
      {customization.showGovernanceInfo && (
        <DAOGovernancePanel identityId={activeIdentity.id} />
      )}
      
      {customization.showComplianceStatus && (
        <ComplianceStatusPanel identityId={activeIdentity.id} />
      )}
      
      {customization.showEducationalTips && (
        <EducationalTipsPanel />
      )}
      
      {customization.showPrivacyStatus && (
        <PrivacyStatusPanel identityId={activeIdentity.id} />
      )}
    </div>
  );
}

// Mock components for demonstration
function AdminControlPanel({ identityId }: { identityId: string }) {
  return (
    <div className="admin-panel bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-yellow-800">Admin Controls</h3>
      <div className="mt-2 space-x-2">
        <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm">
          System Status
        </button>
        <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm">
          User Management
        </button>
        <button className="px-3 py-1 bg-red-600 text-white rounded text-sm">
          Emergency Controls
        </button>
      </div>
    </div>
  );
}

function DAOGovernancePanel({ identityId }: { identityId: string }) {
  return (
    <div className="dao-panel bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-blue-800">DAO Governance</h3>
      <div className="mt-2">
        <p className="text-sm text-blue-600">Active Proposals: 3</p>
        <p className="text-sm text-blue-600">Your Voting Power: 1,250</p>
      </div>
    </div>
  );
}

function ComplianceStatusPanel({ identityId }: { identityId: string }) {
  return (
    <div className="compliance-panel bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-green-800">Compliance Status</h3>
      <div className="mt-2">
        <p className="text-sm text-green-600">✓ AML/KYC Verified</p>
        <p className="text-sm text-green-600">✓ Audit Trail Complete</p>
      </div>
    </div>
  );
}

function EducationalTipsPanel() {
  return (
    <div className="education-panel bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-purple-800">💡 Learning Tip</h3>
      <p className="text-sm text-purple-600 mt-2">
        Always double-check the recipient address before sending tokens!
      </p>
    </div>
  );
}

function PrivacyStatusPanel({ identityId }: { identityId: string }) {
  return (
    <div className="privacy-panel bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-gray-800">🔒 Privacy Status</h3>
      <div className="mt-2">
        <p className="text-sm text-gray-600">Anonymity Level: High</p>
        <p className="text-sm text-gray-600">Session: Ephemeral</p>
      </div>
    </div>
  );
}