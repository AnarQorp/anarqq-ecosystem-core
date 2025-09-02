/**
 * Permission Status Display Component
 * Shows current wallet permissions with visual indicators
 * for allowed/denied operations and governance requirements
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  AlertTriangle,
  Info,
  Users,
  Crown,
  FileText
} from 'lucide-react';
import { WalletPermissions } from '../../types/wallet-config';
import { IdentityType, GovernanceType } from '../../types/identity';

export interface PermissionStatusDisplayProps {
  permissions: WalletPermissions;
  identityType: IdentityType;
  governanceType: GovernanceType;
  compact?: boolean;
  showDetails?: boolean;
  onPermissionClick?: (permission: string) => void;
  className?: string;
}

interface PermissionItemProps {
  label: string;
  allowed: boolean;
  icon: React.ReactNode;
  description?: string;
  requiresApproval?: boolean;
  governanceLevel?: string;
  onClick?: () => void;
  compact?: boolean;
}

const PermissionItem: React.FC<PermissionItemProps> = ({
  label,
  allowed,
  icon,
  description,
  requiresApproval = false,
  governanceLevel,
  onClick,
  compact = false
}) => {
  const getStatusIcon = () => {
    if (!allowed) return <XCircle className="w-4 h-4 text-red-500" />;
    if (requiresApproval) return <Clock className="w-4 h-4 text-orange-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };
  
  const getStatusText = () => {
    if (!allowed) return 'Denied';
    if (requiresApproval) return 'Requires Approval';
    return 'Allowed';
  };
  
  const getStatusColor = () => {
    if (!allowed) return 'text-red-600 bg-red-50';
    if (requiresApproval) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };
  
  if (compact) {
    return (
      <div 
        className={`flex items-center justify-between p-2 rounded-lg border ${
          onClick ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-2">
          <div className="text-gray-600">{icon}</div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          {requiresApproval && (
            <Badge variant="outline" className="text-xs">
              Approval
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`p-4 rounded-lg border ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-gray-600 mt-1">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{label}</span>
              {governanceLevel && (
                <Badge variant="outline" className="text-xs">
                  {governanceLevel}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <Badge className={`text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </Badge>
        </div>
      </div>
      
      {requiresApproval && (
        <div className="mt-3 p-2 bg-orange-50 rounded border-l-4 border-orange-200">
          <div className="flex items-center space-x-2 text-orange-700">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">Approval Required</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            This operation requires approval from governance or parent identity
          </p>
        </div>
      )}
    </div>
  );
};

export const PermissionStatusDisplay: React.FC<PermissionStatusDisplayProps> = ({
  permissions,
  identityType,
  governanceType,
  compact = false,
  showDetails = true,
  onPermissionClick,
  className = ''
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Calculate permission summary
  const totalPermissions = 6; // Core permissions count
  const allowedPermissions = [
    permissions.canTransfer,
    permissions.canReceive,
    permissions.canMintNFT,
    permissions.canSignTransactions,
    permissions.canAccessDeFi,
    permissions.canCreateDAO
  ].filter(Boolean).length;
  
  const permissionPercentage = (allowedPermissions / totalPermissions) * 100;
  
  const getOverallStatus = () => {
    if (permissionPercentage >= 80) return { status: 'Full Access', color: 'text-green-600', icon: <Unlock className="w-4 h-4" /> };
    if (permissionPercentage >= 50) return { status: 'Limited Access', color: 'text-orange-600', icon: <Lock className="w-4 h-4" /> };
    return { status: 'Restricted Access', color: 'text-red-600', icon: <Lock className="w-4 h-4" /> };
  };
  
  const overallStatus = getOverallStatus();
  
  const getGovernanceIcon = () => {
    switch (governanceType) {
      case GovernanceType.SELF: return <Shield className="w-4 h-4" />;
      case GovernanceType.DAO: return <Users className="w-4 h-4" />;
      case GovernanceType.PARENT: return <Crown className="w-4 h-4" />;
      case GovernanceType.AUTONOMOUS: return <Settings className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };
  
  const getIdentityTypeColor = () => {
    switch (identityType) {
      case IdentityType.ROOT: return 'bg-blue-100 text-blue-800';
      case IdentityType.DAO: return 'bg-purple-100 text-purple-800';
      case IdentityType.ENTERPRISE: return 'bg-green-100 text-green-800';
      case IdentityType.CONSENTIDA: return 'bg-orange-100 text-orange-800';
      case IdentityType.AID: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  if (compact) {
    return (
      <Card className={`permission-status-compact ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Permissions</span>
            </div>
            <div className={`flex items-center space-x-1 ${overallStatus.color}`}>
              {overallStatus.icon}
              <span className="text-xs">{overallStatus.status}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <PermissionItem
              label="Transfer"
              allowed={permissions.canTransfer}
              icon={<FileText className="w-3 h-3" />}
              requiresApproval={permissions.requiresApproval && permissions.canTransfer}
              compact={true}
              onClick={() => onPermissionClick?.('transfer')}
            />
            <PermissionItem
              label="DeFi Access"
              allowed={permissions.canAccessDeFi}
              icon={<Settings className="w-3 h-3" />}
              compact={true}
              onClick={() => onPermissionClick?.('defi')}
            />
            <PermissionItem
              label="DAO Creation"
              allowed={permissions.canCreateDAO}
              icon={<Users className="w-3 h-3" />}
              compact={true}
              onClick={() => onPermissionClick?.('dao')}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`permission-status ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Permission Status</span>
          </CardTitle>
          <div className={`flex items-center space-x-2 ${overallStatus.color}`}>
            {overallStatus.icon}
            <span className="text-sm font-medium">{overallStatus.status}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Identity and Governance Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Identity Type:</span>
              <Badge className={getIdentityTypeColor()}>
                {identityType}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Governance:</span>
              <div className="flex items-center space-x-1">
                {getGovernanceIcon()}
                <span className="text-sm font-medium">{governanceType}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium">{allowedPermissions}/{totalPermissions}</div>
            <div className="text-xs text-gray-500">permissions granted</div>
          </div>
        </div>
        
        {/* Core Permissions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Core Permissions</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('core')}
            >
              {expandedSection === 'core' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          
          {(expandedSection === 'core' || showDetails) && (
            <div className="space-y-3">
              <PermissionItem
                label="Transfer Tokens"
                allowed={permissions.canTransfer}
                icon={<FileText className="w-4 h-4" />}
                description="Send tokens to other addresses"
                requiresApproval={permissions.requiresApproval && permissions.canTransfer}
                governanceLevel={permissions.governanceLevel}
                onClick={() => onPermissionClick?.('transfer')}
              />
              
              <PermissionItem
                label="Receive Tokens"
                allowed={permissions.canReceive}
                icon={<FileText className="w-4 h-4" />}
                description="Accept incoming token transfers"
                onClick={() => onPermissionClick?.('receive')}
              />
              
              <PermissionItem
                label="Sign Transactions"
                allowed={permissions.canSignTransactions}
                icon={<FileText className="w-4 h-4" />}
                description="Cryptographically sign blockchain transactions"
                onClick={() => onPermissionClick?.('sign')}
              />
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Advanced Permissions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Advanced Permissions</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('advanced')}
            >
              {expandedSection === 'advanced' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          
          {(expandedSection === 'advanced' || showDetails) && (
            <div className="space-y-3">
              <PermissionItem
                label="Mint NFTs"
                allowed={permissions.canMintNFT}
                icon={<Settings className="w-4 h-4" />}
                description="Create new non-fungible tokens"
                onClick={() => onPermissionClick?.('mint')}
              />
              
              <PermissionItem
                label="DeFi Access"
                allowed={permissions.canAccessDeFi}
                icon={<Settings className="w-4 h-4" />}
                description="Access decentralized finance protocols"
                onClick={() => onPermissionClick?.('defi')}
              />
              
              <PermissionItem
                label="Create DAOs"
                allowed={permissions.canCreateDAO}
                icon={<Users className="w-4 h-4" />}
                description="Create new decentralized autonomous organizations"
                onClick={() => onPermissionClick?.('dao')}
              />
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Transaction Limits */}
        <div className="space-y-3">
          <h4 className="font-medium">Transaction Limits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Transaction</span>
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(permissions.maxTransactionAmount)}
                </span>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Approval Threshold</span>
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(permissions.approvalThreshold)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Allowed Tokens */}
        {permissions.allowedTokens.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Allowed Tokens</h4>
            <div className="flex flex-wrap gap-2">
              {permissions.allowedTokens.map((token, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {token === '*' ? 'All Tokens' : token}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Restricted Operations */}
        {permissions.restrictedOperations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Restricted Operations</h4>
            <div className="space-y-2">
              {permissions.restrictedOperations.map((operation, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-red-600">
                  <XCircle className="w-3 h-3" />
                  <span>{operation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Governance Requirements */}
        {permissions.requiresApproval && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This identity requires approval for transactions above {
                new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: 'USD' 
                }).format(permissions.approvalThreshold)
              }.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Info Section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 text-blue-600" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Permission Management</p>
              <p>
                Permissions are managed by {governanceType.toLowerCase()} governance. 
                Changes may require approval and can take time to process.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionStatusDisplay;