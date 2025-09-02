/**
 * Modular Wallet Dashboard Component
 * Identity-aware wallet dashboard with balance display, transaction history,
 * risk status, audit indicators, and Pi Wallet integration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  RefreshCw,
  Settings,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { ExtendedSquidIdentity, IdentityType, PrivacyLevel } from '../../types/identity';
import { 
  IdentityBalances, 
  TokenBalance, 
  RiskAssessment, 
  PiWalletStatus,
  WalletAuditLog 
} from '../../types/wallet-config';

// Component interfaces
export interface WalletDashboardProps {
  identity: ExtendedSquidIdentity;
  compact?: boolean;
  showPiWallet?: boolean;
  showTransactionHistory?: boolean;
  showAuditStatus?: boolean;
  onTransferClick?: () => void;
  onSettingsClick?: () => void;
}

export interface WalletDashboardData {
  balances: IdentityBalances;
  recentTransactions: Transaction[];
  riskStatus: RiskAssessment;
  piWalletStatus?: PiWalletStatus;
  auditEvents: WalletAuditLog[];
  loading: boolean;
  error: string | null;
}

export interface Transaction {
  id: string;
  type: 'SEND' | 'RECEIVE' | 'MINT' | 'BURN' | 'SWAP';
  amount: number;
  token: string;
  from: string;
  to: string;
  timestamp: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  hash?: string;
  fees?: number;
  riskScore?: number;
}

// Balance Display Component
const BalanceDisplay: React.FC<{
  balances: IdentityBalances;
  identity: ExtendedSquidIdentity;
  compact?: boolean;
  onRefresh?: () => void;
}> = ({ balances, identity, compact = false, onRefresh }) => {
  const [showBalances, setShowBalances] = useState(true);
  
  // Check privacy settings
  const shouldHideBalances = identity.privacyLevel === PrivacyLevel.HIGH || 
                            identity.type === IdentityType.AID;

  const toggleBalanceVisibility = () => {
    setShowBalances(!showBalances);
  };

  const formatBalance = (balance: number, decimals: number = 18) => {
    return (balance / Math.pow(10, decimals)).toFixed(4);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <Card className="wallet-balance-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {compact ? 'Balance' : 'Wallet Balance'}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {shouldHideBalances && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBalanceVisibility}
              className="h-8 w-8 p-0"
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Value */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {showBalances ? formatCurrency(balances.totalValueUSD) : '••••••'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {balances.balances.length} tokens
            </Badge>
          </div>

          {/* Token Balances */}
          {!compact && (
            <div className="space-y-2">
              {balances.balances.slice(0, 3).map((token: TokenBalance) => (
                <div key={token.token} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium">{token.symbol.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium">{token.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {showBalances ? formatBalance(token.balance, token.decimals) : '••••'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {showBalances ? formatCurrency(token.valueUSD) : '••••'}
                    </div>
                  </div>
                </div>
              ))}
              
              {balances.balances.length > 3 && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all {balances.balances.length} tokens
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Updated {new Date(balances.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Risk Status Component
const RiskStatusDisplay: React.FC<{
  riskStatus: RiskAssessment;
  compact?: boolean;
}> = ({ riskStatus, compact = false }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'LOW': return <Shield className="h-4 w-4" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Card className="risk-status-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {compact ? 'Risk' : 'Security Status'}
        </CardTitle>
        {getRiskIcon(riskStatus.overallRisk)}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Overall Risk */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Overall Risk</span>
            <Badge className={getRiskColor(riskStatus.overallRisk)}>
              {riskStatus.overallRisk}
            </Badge>
          </div>

          {/* Reputation Score */}
          {riskStatus.reputationScore && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Reputation</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{riskStatus.reputationScore}/1000</span>
                <Badge variant="outline" className="text-xs">
                  {riskStatus.reputationTier}
                </Badge>
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {!compact && riskStatus.riskFactors.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Active Risk Factors</span>
              {riskStatus.riskFactors.slice(0, 2).map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{factor.description}</span>
                  <Badge variant="outline" className={getRiskColor(factor.severity)}>
                    {factor.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {!compact && riskStatus.recommendations.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {riskStatus.recommendations[0]}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Pi Wallet Status Component
const PiWalletDisplay: React.FC<{
  piWalletStatus?: PiWalletStatus;
  compact?: boolean;
}> = ({ piWalletStatus, compact = false }) => {
  if (!piWalletStatus) {
    return (
      <Card className="pi-wallet-card opacity-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Pi Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-gray-500">
            Not connected
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="pi-wallet-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <PieChart className="h-4 w-4 mr-2" />
          Pi Wallet
        </CardTitle>
        <div className="flex items-center">
          {piWalletStatus.connected ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <Badge variant={piWalletStatus.connected ? "default" : "destructive"}>
              {piWalletStatus.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Balance */}
          {piWalletStatus.connected && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Balance</span>
              <span className="text-sm font-medium">
                {piWalletStatus.balance.toFixed(2)} π
              </span>
            </div>
          )}

          {/* Last Sync */}
          <div className="text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(piWalletStatus.lastSync).toLocaleTimeString()}
          </div>

          {/* Error */}
          {piWalletStatus.connectionError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {piWalletStatus.connectionError}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Transaction History Component
const TransactionHistory: React.FC<{
  transactions: Transaction[];
  identity: ExtendedSquidIdentity;
  compact?: boolean;
}> = ({ transactions, identity, compact = false }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'SEND': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'RECEIVE': return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      case 'MINT': return <PieChart className="h-4 w-4 text-blue-500" />;
      case 'BURN': return <PieChart className="h-4 w-4 text-orange-500" />;
      case 'SWAP': return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-600';
      case 'PENDING': return 'text-yellow-600';
      case 'FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const shouldShowTransaction = (transaction: Transaction) => {
    // Privacy controls based on identity type
    if (identity.privacyLevel === PrivacyLevel.HIGH) {
      return false;
    }
    if (identity.type === IdentityType.AID && transaction.riskScore && transaction.riskScore > 0.5) {
      return false;
    }
    return true;
  };

  const visibleTransactions = transactions.filter(shouldShowTransaction);

  return (
    <Card className="transaction-history-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          {compact ? 'Recent' : 'Transaction History'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleTransactions.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No transactions to display
            </div>
          ) : (
            visibleTransactions.slice(0, compact ? 3 : 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(tx.type)}
                  <div>
                    <div className="text-sm font-medium">
                      {tx.type.toLowerCase()} {tx.token}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {tx.type === 'SEND' ? '-' : '+'}{tx.amount} {tx.token}
                  </div>
                  <div className={`text-xs ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {!compact && visibleTransactions.length > 10 && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                View all transactions
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Wallet Dashboard Component
export const WalletDashboard: React.FC<WalletDashboardProps> = ({
  identity,
  compact = false,
  showPiWallet = true,
  showTransactionHistory = true,
  showAuditStatus = true,
  onTransferClick,
  onSettingsClick
}) => {
  const [dashboardData, setDashboardData] = useState<WalletDashboardData>({
    balances: {
      identityId: identity.did,
      walletAddress: '',
      balances: [],
      totalValueUSD: 0,
      lastUpdated: new Date().toISOString()
    },
    recentTransactions: [],
    riskStatus: {
      identityId: identity.did,
      overallRisk: 'LOW',
      riskFactors: [],
      recommendations: [],
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date().toISOString(),
      autoActions: []
    },
    auditEvents: [],
    loading: true,
    error: null
  });

  const [activeTab, setActiveTab] = useState('overview');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [identity.did]);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      // Mock data loading - in real implementation, this would call actual services
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockBalances: IdentityBalances = {
        identityId: identity.did,
        walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        balances: [
          {
            token: 'ETH',
            symbol: 'ETH',
            balance: Math.random() * 10 * Math.pow(10, 18),
            decimals: 18,
            valueUSD: Math.random() * 20000
          },
          {
            token: 'QToken',
            symbol: 'QTK',
            balance: Math.random() * 1000 * Math.pow(10, 18),
            decimals: 18,
            valueUSD: Math.random() * 5000
          }
        ],
        totalValueUSD: 0,
        lastUpdated: new Date().toISOString()
      };
      
      mockBalances.totalValueUSD = mockBalances.balances.reduce((sum, token) => sum + token.valueUSD, 0);

      const mockTransactions: Transaction[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tx-${i}`,
        type: ['SEND', 'RECEIVE', 'MINT'][Math.floor(Math.random() * 3)] as any,
        amount: Math.random() * 100,
        token: 'ETH',
        from: `0x${Math.random().toString(16).substring(2, 42)}`,
        to: `0x${Math.random().toString(16).substring(2, 42)}`,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: ['CONFIRMED', 'PENDING'][Math.floor(Math.random() * 2)] as any,
        hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        fees: Math.random() * 0.01,
        riskScore: Math.random()
      }));

      const mockPiWalletStatus: PiWalletStatus | undefined = showPiWallet ? {
        connected: Math.random() > 0.5,
        balance: Math.random() * 1000,
        lastSync: new Date().toISOString(),
        supportedOperations: ['transfer', 'balance']
      } : undefined;

      setDashboardData({
        balances: mockBalances,
        recentTransactions: mockTransactions,
        riskStatus: {
          identityId: identity.did,
          overallRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
          riskFactors: [],
          recommendations: ['Enable 2FA for enhanced security', 'Review recent transactions'],
          lastAssessment: new Date().toISOString(),
          nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          autoActions: [],
          reputationScore: Math.floor(Math.random() * 1000),
          reputationTier: ['TRUSTED', 'NEUTRAL', 'RESTRICTED'][Math.floor(Math.random() * 3)] as any
        },
        piWalletStatus: mockPiWalletStatus,
        auditEvents: [],
        loading: false,
        error: null
      });
    } catch (error) {
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load wallet data'
      }));
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (dashboardData.loading) {
    return (
      <div className="wallet-dashboard-loading">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading wallet data...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="wallet-dashboard-error">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {dashboardData.error}
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="wallet-dashboard-compact grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BalanceDisplay 
          balances={dashboardData.balances} 
          identity={identity}
          compact={true}
          onRefresh={handleRefresh}
        />
        <RiskStatusDisplay 
          riskStatus={dashboardData.riskStatus}
          compact={true}
        />
        {showPiWallet && (
          <PiWalletDisplay 
            piWalletStatus={dashboardData.piWalletStatus}
            compact={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="wallet-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Wallet Dashboard</h2>
            <p className="text-sm text-gray-500">
              {identity.type} • {identity.did.substring(0, 20)}...
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onTransferClick}>
            Transfer
          </Button>
          <Button variant="ghost" size="sm" onClick={onSettingsClick}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {showPiWallet && <TabsTrigger value="pi-wallet">Pi Wallet</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BalanceDisplay 
              balances={dashboardData.balances} 
              identity={identity}
              onRefresh={handleRefresh}
            />
            <RiskStatusDisplay riskStatus={dashboardData.riskStatus} />
          </div>
          
          {showTransactionHistory && (
            <TransactionHistory 
              transactions={dashboardData.recentTransactions}
              identity={identity}
              compact={true}
            />
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistory 
            transactions={dashboardData.recentTransactions}
            identity={identity}
          />
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskStatusDisplay riskStatus={dashboardData.riskStatus} />
            {/* Additional security components would go here */}
          </div>
        </TabsContent>

        {showPiWallet && (
          <TabsContent value="pi-wallet">
            <PiWalletDisplay piWalletStatus={dashboardData.piWalletStatus} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default WalletDashboard;