/**
 * TransactionHistory Component Example
 * Demonstrates usage of the identity-aware transaction history component
 */

import React from 'react';
import TransactionHistory from './TransactionHistory';
import { ExtendedSquidIdentity, IdentityType, PrivacyLevel } from '../../types/identity';
import { ComplianceReport, WalletTransaction } from '../../types/wallet-transactions';

// Example identity data
const exampleRootIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:root:example123',
  name: 'Example Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root:example123',
  children: [],
  depth: 0,
  path: [],
  governanceLevel: 'SELF' as any,
  creationRules: {} as any,
  permissions: {} as any,
  status: 'ACTIVE' as any,
  qonsentProfileId: 'qonsent-example123',
  qlockKeyPair: {} as any,
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: '',
  description: 'Example root identity for demonstration',
  tags: ['example', 'demo'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T00:00:00Z',
  kyc: {
    required: false,
    submitted: false,
    approved: false
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const exampleAIDIdentity: ExtendedSquidIdentity = {
  ...exampleRootIdentity,
  did: 'did:squid:aid:example456',
  name: 'Example AID Identity',
  type: IdentityType.AID,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  description: 'Example AID identity with enhanced privacy'
};

const exampleDAOIdentity: ExtendedSquidIdentity = {
  ...exampleRootIdentity,
  did: 'did:squid:dao:example789',
  name: 'Example DAO Identity',
  type: IdentityType.DAO,
  privacyLevel: PrivacyLevel.PUBLIC,
  description: 'Example DAO identity for governance'
};

// Example usage components
export const BasicTransactionHistory: React.FC = () => {
  const handleTransactionClick = (transaction: WalletTransaction) => {
    console.log('Transaction clicked:', transaction);
  };

  const handleExportComplete = (report: ComplianceReport) => {
    console.log('Export completed:', report);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Basic Transaction History</h2>
      <TransactionHistory
        identity={exampleRootIdentity}
        onTransactionClick={handleTransactionClick}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
};

export const CompactTransactionHistory: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Compact Transaction History</h2>
      <TransactionHistory
        identity={exampleRootIdentity}
        compact={true}
        maxTransactions={10}
      />
    </div>
  );
};

export const AIDTransactionHistory: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">AID Identity Transaction History</h2>
      <p className="text-gray-600">
        AID identities have enhanced privacy controls and limited transaction visibility.
      </p>
      <TransactionHistory
        identity={exampleAIDIdentity}
        showFilters={true}
        showExport={false}
      />
    </div>
  );
};

export const DAOTransactionHistory: React.FC = () => {
  const handleExportComplete = (report: ComplianceReport) => {
    console.log('DAO compliance report generated:', report);
    // In a real implementation, this might trigger a governance proposal
    // or send the report to compliance officers
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">DAO Transaction History</h2>
      <p className="text-gray-600">
        DAO identities have full transparency and compliance reporting capabilities.
      </p>
      <TransactionHistory
        identity={exampleDAOIdentity}
        showFilters={true}
        showExport={true}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
};

export const FilteredTransactionHistory: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Transaction History with Filters</h2>
      <p className="text-gray-600">
        Demonstrates advanced filtering and search capabilities.
      </p>
      <TransactionHistory
        identity={exampleRootIdentity}
        showFilters={true}
        showExport={true}
        maxTransactions={25}
      />
    </div>
  );
};

export const ReadOnlyTransactionHistory: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Read-Only Transaction History</h2>
      <p className="text-gray-600">
        View-only mode without export or interaction capabilities.
      </p>
      <TransactionHistory
        identity={exampleRootIdentity}
        showFilters={false}
        showExport={false}
        compact={false}
      />
    </div>
  );
};

// Main example component that showcases all variations
export const TransactionHistoryExamples: React.FC = () => {
  const [activeExample, setActiveExample] = React.useState('basic');

  const examples = [
    { id: 'basic', name: 'Basic', component: BasicTransactionHistory },
    { id: 'compact', name: 'Compact', component: CompactTransactionHistory },
    { id: 'aid', name: 'AID Identity', component: AIDTransactionHistory },
    { id: 'dao', name: 'DAO Identity', component: DAOTransactionHistory },
    { id: 'filtered', name: 'With Filters', component: FilteredTransactionHistory },
    { id: 'readonly', name: 'Read-Only', component: ReadOnlyTransactionHistory }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || BasicTransactionHistory;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Transaction History Examples
            </h1>
            <nav className="flex space-x-4">
              {examples.map((example) => (
                <button
                  key={example.id}
                  onClick={() => setActiveExample(example.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeExample === example.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {example.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6">
        <ActiveComponent />
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-sm text-gray-500">
            <h3 className="font-medium text-gray-900 mb-2">Features Demonstrated:</h3>
            <ul className="space-y-1">
              <li>• Identity-aware transaction filtering and privacy controls</li>
              <li>• Search and advanced filtering capabilities</li>
              <li>• Compliance export functionality for audit purposes</li>
              <li>• Responsive design with compact and full views</li>
              <li>• Risk assessment and security indicators</li>
              <li>• Pi Wallet integration status display</li>
              <li>• Transaction expansion for detailed metadata</li>
              <li>• Bulk selection and export operations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryExamples;