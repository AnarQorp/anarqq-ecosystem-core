/**
 * Transaction History Component
 * Identity-aware transaction history with privacy controls, search/filtering,
 * and compliance export functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { ExtendedSquidIdentity, IdentityType, PrivacyLevel } from '../../types/identity';
import { 
  WalletTransaction, 
  TransactionType, 
  TransactionStatus, 
  TransactionFilter, 
  TransactionSort, 
  TransactionQuery,
  TransactionExportOptions,
  ComplianceReport
} from '../../types/wallet-transactions';

// Component Props
export interface TransactionHistoryProps {
  identity: ExtendedSquidIdentity;
  compact?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  maxTransactions?: number;
  onTransactionClick?: (transaction: WalletTransaction) => void;
  onExportComplete?: (report: ComplianceReport) => void;
}

// Component State
interface TransactionHistoryState {
  transactions: WalletTransaction[];
  filteredTransactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  
  // Filter and search state
  searchTerm: string;
  activeFilters: TransactionFilter;
  sortConfig: TransactionSort;
  
  // UI state
  showPrivateTransactions: boolean;
  expandedTransactions: Set<string>;
  selectedTransactions: Set<string>;
}

// Transaction Item Component
const TransactionItem: React.FC<{
  transaction: WalletTransaction;
  identity: ExtendedSquidIdentity;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onClick?: (transaction: WalletTransaction) => void;
}> = ({ 
  transaction, 
  identity, 
  expanded, 
  selected, 
  onToggleExpand, 
  onToggleSelect, 
  onClick 
}) => {
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.SEND:
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case TransactionType.RECEIVE:
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case TransactionType.MINT:
        return <Activity className="h-4 w-4 text-blue-500" />;
      case TransactionType.BURN:
        return <Activity className="h-4 w-4 text-orange-500" />;
      case TransactionType.SWAP:
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      case TransactionType.PI_DEPOSIT:
      case TransactionType.PI_WITHDRAWAL:
        return <DollarSign className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.CONFIRMED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case TransactionStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case TransactionStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case TransactionStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore < 0.3) return 'bg-green-100 text-green-800';
    if (riskScore < 0.6) return 'bg-yellow-100 text-yellow-800';
    if (riskScore < 0.8) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore < 0.3) return 'LOW';
    if (riskScore < 0.6) return 'MEDIUM';
    if (riskScore < 0.8) return 'HIGH';
    return 'CRITICAL';
  };

  const formatAmount = (amount: number, token: string) => {
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
    return `${formatted} ${token}`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const shouldShowTransaction = () => {
    // Privacy controls based on identity type and privacy level
    if (identity.privacyLevel === PrivacyLevel.ANONYMOUS && transaction.privacyLevel !== PrivacyLevel.ANONYMOUS) {
      return false;
    }
    
    if (identity.type === IdentityType.AID && transaction.riskScore > 0.5) {
      return false;
    }
    
    if (transaction.privacyLevel === PrivacyLevel.PRIVATE && identity.type !== IdentityType.ROOT) {
      return false;
    }
    
    return true;
  };

  if (!shouldShowTransaction()) {
    return null;
  }

  return (
    <div 
      className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
      }`}
      onClick={() => onClick?.(transaction)}
    >
      {/* Main Transaction Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(transaction.id);
            }}
            className="rounded"
          />
          
          {getTransactionIcon(transaction.type)}
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">
                {transaction.type.replace('_', ' ').toLowerCase()}
              </span>
              {transaction.piWalletInvolved && (
                <Badge variant="outline" className="text-xs">Pi</Badge>
              )}
              {transaction.complianceFlags.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {transaction.complianceFlags.length} flags
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              <span>{new Date(transaction.timestamp).toLocaleString()}</span>
              {transaction.transactionHash && (
                <span>• {formatAddress(transaction.transactionHash)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Amount */}
          <div className="text-right">
            <div className={`font-medium text-sm ${
              transaction.type === TransactionType.SEND ? 'text-red-600' : 'text-green-600'
            }`}>
              {transaction.type === TransactionType.SEND ? '-' : '+'}
              {formatAmount(transaction.amount, transaction.token)}
            </div>
            {transaction.fees > 0 && (
              <div className="text-xs text-gray-500">
                Fee: {formatAmount(transaction.fees, transaction.token)}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            {getStatusIcon(transaction.status)}
            <Badge variant="outline" className="text-xs">
              {transaction.status}
            </Badge>
          </div>

          {/* Risk Score */}
          <Badge className={`text-xs ${getRiskColor(transaction.riskScore)}`}>
            {getRiskLevel(transaction.riskScore)}
          </Badge>

          {/* Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(transaction.id);
            }}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* Addresses */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">From:</span>
              <div className="font-mono text-xs break-all">
                {transaction.fromAddress}
              </div>
            </div>
            <div>
              <span className="text-gray-500">To:</span>
              <div className="font-mono text-xs break-all">
                {transaction.toAddress}
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Block:</span>
              <div>{transaction.blockNumber || 'Pending'}</div>
            </div>
            <div>
              <span className="text-gray-500">Gas Used:</span>
              <div>{transaction.gasUsed?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Privacy:</span>
              <div>{transaction.privacyLevel}</div>
            </div>
          </div>

          {/* Security and Compliance */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Qonsent: {transaction.qonsentApproved ? '✓' : '✗'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Qlock: {transaction.qlockSigned ? '✓' : '✗'}</span>
              </div>
            </div>

            {transaction.complianceFlags.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">Compliance Flags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {transaction.complianceFlags.map((flag, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Memo */}
          {transaction.memo && (
            <div>
              <span className="text-gray-500 text-sm">Memo:</span>
              <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                {transaction.memo}
              </div>
            </div>
          )}

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {transaction.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Filter Panel Component
const FilterPanel: React.FC<{
  filters: TransactionFilter;
  onFiltersChange: (filters: TransactionFilter) => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onClearFilters }) => {
  const updateFilter = (key: keyof TransactionFilter, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </span>
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transaction Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select
              value={filters.type?.[0] || ''}
              onValueChange={(value) => updateFilter('type', value ? [value as TransactionType] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {Object.values(TransactionType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select
              value={filters.status?.[0] || ''}
              onValueChange={(value) => updateFilter('status', value ? [value as TransactionStatus] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {Object.values(TransactionStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token */}
          <div>
            <label className="text-sm font-medium mb-2 block">Token</label>
            <Select
              value={filters.token?.[0] || ''}
              onValueChange={(value) => updateFilter('token', value ? [value] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tokens</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="QToken">QToken</SelectItem>
                <SelectItem value="PI">PI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount Range</label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minAmount || ''}
                onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxAmount || ''}
                onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex space-x-2">
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
              />
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Transaction History Component
export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  identity,
  compact = false,
  showFilters = true,
  showExport = true,
  maxTransactions = 50,
  onTransactionClick,
  onExportComplete
}) => {
  const [state, setState] = useState<TransactionHistoryState>({
    transactions: [],
    filteredTransactions: [],
    loading: true,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: compact ? 10 : 20,
    
    searchTerm: '',
    activeFilters: {},
    sortConfig: { field: 'timestamp', direction: 'desc' },
    
    showPrivateTransactions: identity.type === IdentityType.ROOT,
    expandedTransactions: new Set(),
    selectedTransactions: new Set()
  });

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Mock data loading - in real implementation, this would call actual services
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockTransactions: WalletTransaction[] = Array.from({ length: 25 }, (_, i) => ({
        id: `tx-${i}`,
        identityId: identity.did,
        identityType: identity.type,
        type: [TransactionType.SEND, TransactionType.RECEIVE, TransactionType.MINT, TransactionType.SWAP][Math.floor(Math.random() * 4)],
        status: [TransactionStatus.CONFIRMED, TransactionStatus.PENDING, TransactionStatus.FAILED][Math.floor(Math.random() * 3)],
        
        amount: Math.random() * 1000,
        token: ['ETH', 'QToken', 'PI'][Math.floor(Math.random() * 3)],
        fromAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        toAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        
        fees: Math.random() * 0.01,
        gasUsed: Math.floor(Math.random() * 100000),
        gasPrice: Math.random() * 50,
        
        privacyLevel: [PrivacyLevel.PUBLIC, PrivacyLevel.PRIVATE, PrivacyLevel.ANONYMOUS][Math.floor(Math.random() * 3)],
        riskScore: Math.random(),
        complianceFlags: Math.random() > 0.8 ? ['HIGH_VALUE', 'SUSPICIOUS_PATTERN'] : [],
        qonsentApproved: Math.random() > 0.1,
        qlockSigned: Math.random() > 0.05,
        piWalletInvolved: Math.random() > 0.7,
        
        auditTrail: [],
        metadata: {
          sessionId: `session-${i}`,
          deviceFingerprint: `device-${Math.random().toString(16).substring(2, 10)}`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          initiatedBy: 'USER',
          approvalRequired: false,
          riskFactors: [],
          complianceChecks: [],
          qindexed: true
        },
        
        memo: Math.random() > 0.7 ? `Transaction memo ${i}` : undefined,
        tags: Math.random() > 0.5 ? ['personal', 'defi'] : undefined
      }));

      setState(prev => ({
        ...prev,
        transactions: mockTransactions,
        filteredTransactions: mockTransactions,
        totalCount: mockTransactions.length,
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load transactions'
      }));
    }
  }, [identity.did, identity.type]);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...state.transactions];

    // Apply search
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.transactionHash?.toLowerCase().includes(searchLower) ||
        tx.fromAddress.toLowerCase().includes(searchLower) ||
        tx.toAddress.toLowerCase().includes(searchLower) ||
        tx.memo?.toLowerCase().includes(searchLower) ||
        tx.token.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    const { activeFilters } = state;
    
    if (activeFilters.type?.length) {
      filtered = filtered.filter(tx => activeFilters.type!.includes(tx.type));
    }
    
    if (activeFilters.status?.length) {
      filtered = filtered.filter(tx => activeFilters.status!.includes(tx.status));
    }
    
    if (activeFilters.token?.length) {
      filtered = filtered.filter(tx => activeFilters.token!.includes(tx.token));
    }
    
    if (activeFilters.minAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount >= activeFilters.minAmount!);
    }
    
    if (activeFilters.maxAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount <= activeFilters.maxAmount!);
    }
    
    if (activeFilters.startDate) {
      filtered = filtered.filter(tx => tx.timestamp >= activeFilters.startDate!);
    }
    
    if (activeFilters.endDate) {
      filtered = filtered.filter(tx => tx.timestamp <= activeFilters.endDate!);
    }

    // Apply privacy controls
    if (!state.showPrivateTransactions) {
      filtered = filtered.filter(tx => tx.privacyLevel === PrivacyLevel.PUBLIC);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { field, direction } = state.sortConfig;
      let aValue: any = a[field];
      let bValue: any = b[field];
      
      if (field === 'timestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered.slice(0, maxTransactions);
  }, [state.transactions, state.searchTerm, state.activeFilters, state.sortConfig, state.showPrivateTransactions, maxTransactions]);

  // Event handlers
  const handleSearch = (searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }));
  };

  const handleFiltersChange = (activeFilters: TransactionFilter) => {
    setState(prev => ({ ...prev, activeFilters }));
  };

  const handleClearFilters = () => {
    setState(prev => ({ 
      ...prev, 
      activeFilters: {},
      searchTerm: ''
    }));
  };

  const handleToggleExpand = (transactionId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedTransactions);
      if (newExpanded.has(transactionId)) {
        newExpanded.delete(transactionId);
      } else {
        newExpanded.add(transactionId);
      }
      return { ...prev, expandedTransactions: newExpanded };
    });
  };

  const handleToggleSelect = (transactionId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedTransactions);
      if (newSelected.has(transactionId)) {
        newSelected.delete(transactionId);
      } else {
        newSelected.add(transactionId);
      }
      return { ...prev, selectedTransactions: newSelected };
    });
  };

  const handleSelectAll = () => {
    setState(prev => ({
      ...prev,
      selectedTransactions: new Set(filteredTransactions.map(tx => tx.id))
    }));
  };

  const handleDeselectAll = () => {
    setState(prev => ({
      ...prev,
      selectedTransactions: new Set()
    }));
  };

  const handleExport = async () => {
    if (!showExport) return;

    try {
      setExportLoading(true);

      // Mock export - in real implementation, this would call actual services
      await new Promise(resolve => setTimeout(resolve, 2000));

      const selectedTxs = filteredTransactions.filter(tx => 
        state.selectedTransactions.has(tx.id)
      );

      const report: ComplianceReport = {
        identityId: identity.did,
        reportType: 'TRANSACTION_SUMMARY',
        period: {
          startDate: state.activeFilters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: state.activeFilters.endDate || new Date().toISOString()
        },
        transactionCount: selectedTxs.length,
        totalVolume: selectedTxs.reduce((sum, tx) => sum + tx.amount, 0),
        riskEvents: selectedTxs.filter(tx => tx.riskScore > 0.7).length,
        complianceViolations: selectedTxs.filter(tx => tx.complianceFlags.length > 0).length,
        transactions: selectedTxs,
        riskAssessments: [],
        auditLogs: [],
        generatedAt: new Date().toISOString(),
        generatedBy: identity.did,
        reportId: `report-${Date.now()}`,
        version: '1.0'
      };

      onExportComplete?.(report);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed'
      }));
    } finally {
      setExportLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Update filtered transactions when dependencies change
  useEffect(() => {
    setState(prev => ({ ...prev, filteredTransactions }));
  }, [filteredTransactions]);

  if (state.loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading transaction history...
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {state.error}
          <Button variant="ghost" size="sm" onClick={loadTransactions} className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="transaction-history space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <Badge variant="outline">
              {filteredTransactions.length} of {state.totalCount}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {identity.type === IdentityType.ROOT && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  showPrivateTransactions: !prev.showPrivateTransactions 
                }))}
              >
                {state.showPrivateTransactions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {state.showPrivateTransactions ? 'Hide Private' : 'Show Private'}
              </Button>
            )}
            
            <Button variant="outline" onClick={loadTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={state.searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {showFilters && (
          <Button
            variant="outline"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        )}
        
        {showExport && state.selectedTransactions.size > 0 && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export ({state.selectedTransactions.size})
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && showFilters && (
        <FilterPanel
          filters={state.activeFilters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Bulk Actions */}
      {!compact && filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
            {state.selectedTransactions.size > 0 && (
              <span className="text-gray-500">
                {state.selectedTransactions.size} selected
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Sort by:</span>
            <Select
              value={`${state.sortConfig.field}-${state.sortConfig.direction}`}
              onValueChange={(value) => {
                const [field, direction] = value.split('-');
                setState(prev => ({
                  ...prev,
                  sortConfig: { field: field as any, direction: direction as 'asc' | 'desc' }
                }));
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp-desc">Newest First</SelectItem>
                <SelectItem value="timestamp-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                <SelectItem value="riskScore-desc">Highest Risk</SelectItem>
                <SelectItem value="riskScore-asc">Lowest Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">
                {state.searchTerm || Object.keys(state.activeFilters).length > 0
                  ? 'Try adjusting your search or filters'
                  : 'No transactions have been made yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              identity={identity}
              expanded={state.expandedTransactions.has(transaction.id)}
              selected={state.selectedTransactions.has(transaction.id)}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              onClick={onTransactionClick}
            />
          ))
        )}
      </div>

      {/* Load More */}
      {!compact && filteredTransactions.length < state.totalCount && (
        <div className="text-center">
          <Button variant="outline" onClick={loadTransactions}>
            Load More Transactions
          </Button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;