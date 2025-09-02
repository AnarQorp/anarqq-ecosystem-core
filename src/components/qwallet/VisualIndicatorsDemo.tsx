/**
 * Visual Indicators Demo Component
 * Demonstrates all the visual indicators and feedback components
 * for wallet operations, limits, permissions, and risk assessment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Eye,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Settings
} from 'lucide-react';

// Import our new visual indicator components
import WalletLimitIndicators, { LimitUsageData } from './WalletLimitIndicators';
import PermissionStatusDisplay from './PermissionStatusDisplay';
import RiskLevelIndicator, { RiskAssessment, RiskFactor } from './RiskLevelIndicator';
import { 
  ProgressIndicator,
  MultiStepProgress,
  TransactionLoading,
  IdentitySwitchLoading,
  WalletSkeleton
} from './LoadingStateIndicators';

// Import types
import { WalletLimits, WalletPermissions } from '../../types/wallet-config';
import { IdentityType, GovernanceType } from '../../types/identity';

export interface VisualIndicatorsDemoProps {
  className?: string;
}

export const VisualIndicatorsDemo: React.FC<VisualIndicatorsDemoProps> = ({
  className = ''
}) => {
  // Demo state
  const [activeDemo, setActiveDemo] = useState<string>('limits');
  const [isAnimating, setIsAnimating] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState<'preparing' | 'signing' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed'>('preparing');
  const [identitySwitchStage, setIdentitySwitchStage] = useState<'validating' | 'switching' | 'updating_contexts' | 'complete' | 'error'>('validating');

  // Mock data
  const mockLimits: WalletLimits = {
    dailyTransferLimit: 10000,
    monthlyTransferLimit: 50000,
    maxTransactionAmount: 5000,
    maxTransactionsPerHour: 10,
    allowedTokens: ['ETH', 'QTK', 'USDC'],
    restrictedAddresses: [],
    requiresApprovalAbove: 1000,
    dynamicLimitsEnabled: true,
    governanceControlled: true,
    policyId: 'policy-123',
    riskBasedAdjustments: true
  };

  const mockUsage: LimitUsageData = {
    dailyUsed: 7500,
    monthlyUsed: 32000,
    hourlyTransactions: 6,
    currentTransactionAmount: 1500,
    lastUpdated: new Date().toISOString()
  };

  const mockPermissions: WalletPermissions = {
    canTransfer: true,
    canReceive: true,
    canMintNFT: false,
    canSignTransactions: true,
    canAccessDeFi: false,
    canCreateDAO: false,
    maxTransactionAmount: 5000,
    allowedTokens: ['ETH', 'QTK'],
    restrictedOperations: ['DeFi Access', 'DAO Creation'],
    governanceLevel: 'LIMITED',
    requiresApproval: true,
    approvalThreshold: 1000
  };

  const mockRiskFactors: RiskFactor[] = [
    {
      id: '1',
      name: 'High Transaction Velocity',
      description: 'Multiple large transactions in short time period',
      severity: 'HIGH',
      score: 0.8,
      category: 'VELOCITY',
      detected: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      occurrenceCount: 5
    },
    {
      id: '2',
      name: 'Unusual Transaction Pattern',
      description: 'Transactions to previously unseen addresses',
      severity: 'MEDIUM',
      score: 0.6,
      category: 'PATTERN',
      detected: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      occurrenceCount: 3
    },
    {
      id: '3',
      name: 'New Device Access',
      description: 'Wallet accessed from unrecognized device',
      severity: 'LOW',
      score: 0.3,
      category: 'DEVICE',
      detected: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      occurrenceCount: 1
    }
  ];

  const mockRiskAssessment: RiskAssessment = {
    identityId: 'did:example:123',
    overallRisk: 'MEDIUM',
    riskScore: 0.65,
    factors: mockRiskFactors,
    recommendations: [
      'Enable two-factor authentication for enhanced security',
      'Review recent transactions for any unauthorized activity',
      'Consider reducing transaction frequency to lower velocity risk'
    ],
    lastAssessment: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    nextAssessment: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    trend: 'STABLE',
    reputationScore: 750,
    reputationTier: 'NEUTRAL'
  };

  const multiStepSteps = [
    {
      id: 'validate',
      label: 'Validate Transaction',
      status: 'completed' as const,
      message: 'Transaction validated successfully'
    },
    {
      id: 'sign',
      label: 'Sign with Qlock',
      status: 'completed' as const,
      message: 'Transaction signed'
    },
    {
      id: 'broadcast',
      label: 'Broadcast to Network',
      status: 'active' as const,
      message: 'Broadcasting transaction...'
    },
    {
      id: 'confirm',
      label: 'Wait for Confirmation',
      status: 'pending' as const
    }
  ];

  // Animation effects
  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setDemoProgress(prev => {
          if (prev >= 100) {
            setIsAnimating(false);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isAnimating]);

  // Transaction status animation
  useEffect(() => {
    if (activeDemo === 'loading' && isAnimating) {
      const statuses: typeof transactionStatus[] = ['preparing', 'signing', 'broadcasting', 'confirming', 'confirmed'];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < statuses.length - 1) {
          currentIndex++;
          setTransactionStatus(statuses[currentIndex]);
        } else {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeDemo, isAnimating]);

  // Identity switch animation
  useEffect(() => {
    if (activeDemo === 'loading' && isAnimating) {
      const stages: typeof identitySwitchStage[] = ['validating', 'switching', 'updating_contexts', 'complete'];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < stages.length - 1) {
          currentIndex++;
          setIdentitySwitchStage(stages[currentIndex]);
        } else {
          clearInterval(interval);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [activeDemo, isAnimating]);

  const startAnimation = () => {
    setIsAnimating(true);
    setDemoProgress(0);
    setTransactionStatus('preparing');
    setIdentitySwitchStage('validating');
  };

  const resetDemo = () => {
    setIsAnimating(false);
    setDemoProgress(0);
    setTransactionStatus('preparing');
    setIdentitySwitchStage('validating');
  };

  return (
    <Card className={`visual-indicators-demo ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Visual Indicators Demo</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startAnimation}
              disabled={isAnimating}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Demo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDemo}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeDemo} onValueChange={setActiveDemo}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="loading">Loading</TabsTrigger>
          </TabsList>

          <TabsContent value="limits" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Wallet Limit Indicators</h3>
                <Badge variant="outline">Interactive Demo</Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full Limit Indicators */}
                <WalletLimitIndicators
                  limits={mockLimits}
                  usage={mockUsage}
                  showWarnings={true}
                />
                
                {/* Compact Limit Indicators */}
                <WalletLimitIndicators
                  limits={mockLimits}
                  usage={mockUsage}
                  compact={true}
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Features Demonstrated:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Color-coded progress bars based on usage levels</li>
                  <li>• Warning and critical threshold indicators</li>
                  <li>• Real-time usage percentage calculations</li>
                  <li>• Compact and full display modes</li>
                  <li>• Governance and dynamic limit indicators</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Permission Status Display</h3>
                <Badge variant="outline">Identity: ENTERPRISE</Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full Permission Display */}
                <PermissionStatusDisplay
                  permissions={mockPermissions}
                  identityType={IdentityType.ENTERPRISE}
                  governanceType={GovernanceType.DAO}
                  showDetails={true}
                />
                
                {/* Compact Permission Display */}
                <PermissionStatusDisplay
                  permissions={mockPermissions}
                  identityType={IdentityType.ENTERPRISE}
                  governanceType={GovernanceType.DAO}
                  compact={true}
                />
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Features Demonstrated:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Visual permission status indicators (allowed/denied/approval required)</li>
                  <li>• Identity type and governance level display</li>
                  <li>• Transaction limits and approval thresholds</li>
                  <li>• Allowed tokens and restricted operations</li>
                  <li>• Expandable sections for detailed view</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Risk Level Indicators</h3>
                <Badge variant="secondary">Risk: MEDIUM</Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full Risk Assessment */}
                <RiskLevelIndicator
                  riskAssessment={mockRiskAssessment}
                  showFactors={true}
                  showRecommendations={true}
                  showTrend={true}
                />
                
                {/* Compact Risk Assessment */}
                <RiskLevelIndicator
                  riskAssessment={mockRiskAssessment}
                  compact={true}
                />
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Features Demonstrated:</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Circular risk meter with color-coded levels</li>
                  <li>• Risk factor categorization and severity indicators</li>
                  <li>• Trend analysis (improving/stable/worsening)</li>
                  <li>• Reputation score integration</li>
                  <li>• Security recommendations based on risk factors</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loading" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Loading States & Progress</h3>
                <div className="flex items-center space-x-2">
                  {isAnimating && <Badge variant="default">Animating</Badge>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progress Indicators */}
                <div className="space-y-4">
                  <h4 className="font-medium">Progress Indicators</h4>
                  
                  <ProgressIndicator
                    progress={demoProgress}
                    status={demoProgress === 100 ? 'success' : 'processing'}
                    operation="transfer"
                    message="Processing wallet transfer..."
                    estimatedTime={30}
                  />
                  
                  <ProgressIndicator
                    progress={demoProgress * 0.8}
                    status="validating"
                    operation="risk_assessment"
                    compact={true}
                  />
                </div>
                
                {/* Multi-step Progress */}
                <div className="space-y-4">
                  <h4 className="font-medium">Multi-step Progress</h4>
                  
                  <MultiStepProgress
                    steps={multiStepSteps}
                    currentStep={2}
                  />
                </div>
                
                {/* Transaction Loading */}
                <div className="space-y-4">
                  <h4 className="font-medium">Transaction Loading</h4>
                  
                  <TransactionLoading
                    transactionHash="0x1234...abcd"
                    status={transactionStatus}
                    confirmations={transactionStatus === 'confirming' ? 2 : 0}
                    requiredConfirmations={3}
                    estimatedTime={45}
                  />
                </div>
                
                {/* Identity Switch Loading */}
                <div className="space-y-4">
                  <h4 className="font-medium">Identity Switch Loading</h4>
                  
                  <IdentitySwitchLoading
                    fromIdentity="ROOT"
                    toIdentity="ENTERPRISE"
                    stage={identitySwitchStage}
                    progress={demoProgress}
                    currentModule="Qwallet"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Skeleton Loading States */}
              <div className="space-y-4">
                <h4 className="font-medium">Skeleton Loading States</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Dashboard Skeleton</h5>
                    <WalletSkeleton type="dashboard" />
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Balance Skeleton</h5>
                    <WalletSkeleton type="balance" />
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Transaction List</h5>
                    <WalletSkeleton type="transaction_list" count={3} />
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Features Demonstrated:</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Animated progress bars with real-time updates</li>
                  <li>• Multi-step process visualization</li>
                  <li>• Transaction confirmation tracking</li>
                  <li>• Identity switching progress with module updates</li>
                  <li>• Skeleton loading states for different UI components</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VisualIndicatorsDemo;