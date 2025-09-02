/**
 * Identity Overview Dashboard Component
 * Displays identity tree visualization, statistics, and management actions
 * Requirements: 1.1, 1.2, 1.3
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Plus, 
  Settings, 
  Shield, 
  Eye, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Activity,
  Clock,
  Key,
  AlertTriangle
} from 'lucide-react';

import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useIdentityTree } from '@/hooks/useIdentityTree';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { 
  IdentityTypeIcon, 
  IdentityTypeBadge, 
  PrivacyLevelBadge,
  SecurityStatusBadge 
} from './IdentityVisualIndicators';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  IdentityTreeNode,
  PrivacyLevel 
} from '@/types/identity';

interface IdentityOverviewDashboardProps {
  onCreateIdentity?: () => void;
  onEditIdentity?: (identity: ExtendedSquidIdentity) => void;
  onDeleteIdentity?: (identity: ExtendedSquidIdentity) => void;
  onViewDetails?: (identity: ExtendedSquidIdentity) => void;
  className?: string;
}

export const IdentityOverviewDashboard: React.FC<IdentityOverviewDashboardProps> = ({
  onCreateIdentity,
  onEditIdentity,
  onDeleteIdentity,
  onViewDetails,
  className = ''
}) => {
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  
  // Hooks for identity management
  const { identities, activeIdentity, loading, error, getIdentityStats } = useIdentityManager();
  const { identity: currentIdentity, canCreateSubidentities } = useActiveIdentity();
  const { 
    tree, 
    expandedNodes, 
    toggleNode, 
    selectNode, 
    selectedNode,
    getTreeStats,
    getVisibleNodes 
  } = useIdentityTree();

  // Calculate statistics
  const stats = useMemo(() => getIdentityStats(), [getIdentityStats]);
  const treeStats = useMemo(() => getTreeStats(), [getTreeStats]);
  const visibleNodes = useMemo(() => getVisibleNodes(), [getVisibleNodes]);

  // Handle identity selection
  const handleIdentitySelect = (identity: ExtendedSquidIdentity) => {
    setSelectedIdentityId(identity.did);
    selectNode(identity.did);
    onViewDetails?.(identity);
  };

  // Handle identity actions
  const handleCreateIdentity = () => {
    onCreateIdentity?.();
  };

  const handleEditIdentity = (identity: ExtendedSquidIdentity) => {
    onEditIdentity?.(identity);
  };

  const handleDeleteIdentity = (identity: ExtendedSquidIdentity) => {
    onDeleteIdentity?.(identity);
  };

  // Render tree node
  const renderTreeNode = (node: IdentityTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.includes(node.identity.did);
    const isSelected = selectedNode === node.identity.did;
    const isActive = activeIdentity?.did === node.identity.did;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.identity.did} className="w-full">
        <div
          className={`
            flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
            ${isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          `}
          style={{ marginLeft: `${depth * 20}px` }}
          onClick={() => handleIdentitySelect(node.identity)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.identity.did);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* Identity Icon */}
          <IdentityTypeIcon type={node.identity.type} className="h-5 w-5" />
          
          {/* Identity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {node.identity.name}
              </span>
              {isActive && (
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <IdentityTypeBadge type={node.identity.type} size="sm" />
              <PrivacyLevelBadge level={node.identity.privacyLevel} size="sm" />
              {node.identity.kyc.approved && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  KYC
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <SecurityStatusBadge 
              flags={node.identity.securityFlags} 
              size="sm" 
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Show context menu or actions
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading identity dashboard</span>
            </div>
            <p className="text-sm text-red-500 mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Identity Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your identities and subidentities across the ecosystem
          </p>
        </div>
        
        {canCreateSubidentities && (
          <Button onClick={handleCreateIdentity} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Identity
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Identities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">KYC Verified</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withKYC}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Eye className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Max Depth</p>
                <p className="text-2xl font-bold text-gray-900">{treeStats.maxDepth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Identity Tree and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity Tree */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Identity Tree
                </CardTitle>
                <CardDescription>
                  Hierarchical view of your identities and subidentities
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Expand All
                </Button>
                <Button variant="outline" size="sm">
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {tree ? (
                <div className="space-y-1">
                  {renderTreeNode(tree)}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No identity tree available</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Identity Details Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Identity Details
            </CardTitle>
            <CardDescription>
              Information about the selected identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedIdentityId ? (
              <IdentityDetailsPanel 
                identityId={selectedIdentityId}
                onEdit={handleEditIdentity}
                onDelete={handleDeleteIdentity}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select an identity to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Identity Type Distribution</CardTitle>
          <CardDescription>
            Breakdown of your identities by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <IdentityTypeIcon 
                    type={type as IdentityType} 
                    className="h-8 w-8" 
                  />
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {type.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Identity Details Panel Component
interface IdentityDetailsPanelProps {
  identityId: string;
  onEdit?: (identity: ExtendedSquidIdentity) => void;
  onDelete?: (identity: ExtendedSquidIdentity) => void;
}

const IdentityDetailsPanel: React.FC<IdentityDetailsPanelProps> = ({
  identityId,
  onEdit,
  onDelete
}) => {
  const { identities } = useIdentityManager();
  const identity = identities.find(i => i.did === identityId);

  if (!identity) {
    return (
      <div className="text-center text-gray-500">
        <p>Identity not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IdentityTypeIcon type={identity.type} className="h-5 w-5" />
          <h3 className="font-semibold">{identity.name}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {identity.description || 'No description provided'}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <IdentityTypeBadge type={identity.type} />
          <PrivacyLevelBadge level={identity.privacyLevel} />
          {identity.kyc.approved && (
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              KYC Verified
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Created:</span>
          <span>{new Date(identity.createdAt).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Last Used:</span>
          <span>{new Date(identity.lastUsed).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Key className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">DID:</span>
          <span className="font-mono text-xs truncate">
            {identity.did}
          </span>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onEdit?.(identity)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Edit Identity
        </Button>
        
        {identity.type !== IdentityType.ROOT && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-red-600 hover:text-red-700"
            onClick={() => onDelete?.(identity)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Delete Identity
          </Button>
        )}
      </div>
    </div>
  );
};

export default IdentityOverviewDashboard;