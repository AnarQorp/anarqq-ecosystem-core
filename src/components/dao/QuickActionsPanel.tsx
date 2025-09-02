/**
 * QuickActionsPanel - Quick access to wallet operations for DAO members
 * 
 * Provides role-based action buttons for token transfers, NFT operations,
 * and other wallet-related actions within the DAO context.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQwallet, type MintNFTParams } from '../../composables/useQwallet';
import { useSessionContext } from '../../contexts/SessionContext';
import { useRenderMonitoring } from '../../utils/performance/monitoring';
import { 
  useKeyboardNavigation,
  createAccessibleClickHandler,
  useDAOComponentDescriptions,
  DataDescription,
  createButtonAria
} from '../../utils/accessibility';
import { 
  CurrencyDollarIcon,
  PhotoIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import TokenTransferForm from '../qwallet/TokenTransferForm';
import NFTGallery from '../qwallet/NFTGallery';

export interface QuickActionsPanelProps {
  daoId: string;
  userRole: 'member' | 'moderator' | 'admin' | 'owner';
  hasTokens: boolean;
  hasNFTs: boolean;
  onAction: (action: string) => void;
  className?: string;
}

interface ActionButton {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'outline';
  requiredRole: 'member' | 'moderator' | 'admin' | 'owner';
  requiredCondition?: 'hasTokens' | 'hasNFTs';
  disabled?: boolean;
  disabledReason?: string;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = React.memo(({
  daoId,
  userRole,
  hasTokens,
  hasNFTs,
  onAction,
  className
}) => {
  // Performance monitoring
  const { getMountTime } = useRenderMonitoring('QuickActionsPanel', { daoId, userRole });
  const { isAuthenticated, session } = useSessionContext();
  const { balances, nfts, loading, error, mintNFT, refreshWalletData } = useQwallet();
  
  // Accessibility hooks
  const { containerRef, focusFirst } = useKeyboardNavigation({
    enabled: true,
    autoFocus: false
  });
  const { describeQuickActions } = useDAOComponentDescriptions();
  
  const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
  
  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNFTGallery, setShowNFTGallery] = useState(false);
  const [showMintNFTModal, setShowMintNFTModal] = useState(false);
  
  // NFT minting state
  const [mintingNFT, setMintingNFT] = useState(false);
  const [mintNFTForm, setMintNFTForm] = useState({
    name: '',
    description: '',
    image: '',
    attributes: [] as { trait_type: string; value: string }[]
  });

  // Feedback state
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    action?: string;
  }>({ type: null, message: '' });
  
  // Loading states for different actions
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Clear feedback after 5 seconds
  useEffect(() => {
    if (actionFeedback.type) {
      const timer = setTimeout(() => {
        setActionFeedback({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Define available actions based on requirements
  const availableActions: ActionButton[] = [
    {
      id: 'mint-nft',
      label: 'Mint NFT',
      description: 'Create a new NFT for this DAO',
      icon: PlusIcon,
      variant: 'default',
      requiredRole: 'moderator',
      disabled: false
    },
    {
      id: 'transfer-token',
      label: 'Transfer Token',
      description: 'Send DAO tokens to another member',
      icon: CurrencyDollarIcon,
      variant: 'secondary',
      requiredRole: 'member',
      requiredCondition: 'hasTokens',
      disabled: !hasTokens,
      disabledReason: hasTokens ? undefined : 'No tokens available to transfer'
    },
    {
      id: 'view-nft-gallery',
      label: 'View NFT Gallery',
      description: 'Browse your NFT collection',
      icon: PhotoIcon,
      variant: 'outline',
      requiredRole: 'member',
      requiredCondition: 'hasNFTs',
      disabled: !hasNFTs,
      disabledReason: hasNFTs ? undefined : 'No NFTs in your collection'
    }
  ];

  // Filter actions based on user role and permissions
  useEffect(() => {
    const filteredActions = availableActions.filter(action => {
      // Check role requirements
      const roleHierarchy = ['member', 'moderator', 'admin', 'owner'];
      const userRoleIndex = roleHierarchy.indexOf(userRole);
      const requiredRoleIndex = roleHierarchy.indexOf(action.requiredRole);
      
      // User must have at least the required role level
      return userRoleIndex >= requiredRoleIndex;
    });

    setActionButtons(filteredActions);
  }, [userRole, hasTokens, hasNFTs]);

  const handleActionClick = (actionId: string) => {
    const action = actionButtons.find(a => a.id === actionId);
    if (action && !action.disabled) {
      // Clear previous feedback
      setActionFeedback({ type: null, message: '' });
      
      // Set loading state for the action
      setActionLoading(prev => ({ ...prev, [actionId]: true }));
      
      try {
        // Handle specific actions
        switch (actionId) {
          case 'transfer-token':
            setShowTransferModal(true);
            setActionFeedback({
              type: 'success',
              message: 'Token transfer modal opened',
              action: actionId
            });
            break;
          case 'view-nft-gallery':
            setShowNFTGallery(true);
            setActionFeedback({
              type: 'success',
              message: 'NFT gallery opened',
              action: actionId
            });
            break;
          case 'mint-nft':
            setShowMintNFTModal(true);
            setActionFeedback({
              type: 'success',
              message: 'NFT minting form opened',
              action: actionId
            });
            break;
          default:
            break;
        }
        
        // Call the parent callback
        onAction(actionId);
      } catch (err) {
        setActionFeedback({
          type: 'error',
          message: `Failed to execute ${action.label}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          action: actionId
        });
      } finally {
        // Clear loading state
        setTimeout(() => {
          setActionLoading(prev => ({ ...prev, [actionId]: false }));
        }, 500);
      }
    }
  };

  // Handle NFT minting
  const handleMintNFT = async () => {
    if (!session?.issuer || !mintNFTForm.name.trim() || !mintNFTForm.description.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Please fill in all required fields (Name and Description)',
        action: 'mint-nft'
      });
      return;
    }

    setMintingNFT(true);
    setActionFeedback({ type: null, message: '' });
    
    try {
      const mintParams: MintNFTParams = {
        name: mintNFTForm.name.trim(),
        description: mintNFTForm.description.trim(),
        image: mintNFTForm.image.trim() || undefined,
        attributes: [
          ...mintNFTForm.attributes.filter(attr => attr.trait_type && attr.value),
          // Add DAO-specific attribute
          { trait_type: 'dao_id', value: daoId },
          { trait_type: 'minted_by_role', value: userRole }
        ]
      };

      const nft = await mintNFT(mintParams);
      
      if (nft) {
        // Show success feedback
        setActionFeedback({
          type: 'success',
          message: `Successfully minted NFT "${mintNFTForm.name}" for DAO`,
          action: 'mint-nft'
        });

        // Reset form
        setMintNFTForm({
          name: '',
          description: '',
          image: '',
          attributes: []
        });
        
        // Close modal
        setShowMintNFTModal(false);
        
        // Refresh wallet data to show new NFT
        await refreshWalletData();
      } else {
        throw new Error('NFT minting failed - no NFT returned');
      }
    } catch (err) {
      console.error('Error minting NFT:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to mint NFT: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        action: 'mint-nft'
      });
    } finally {
      setMintingNFT(false);
    }
  };

  // Handle adding NFT attribute
  const addNFTAttribute = () => {
    setMintNFTForm(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }));
  };

  // Handle removing NFT attribute
  const removeNFTAttribute = (index: number) => {
    setMintNFTForm(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  // Handle NFT attribute change
  const updateNFTAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setMintNFTForm(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  const getPermissionMessage = (requiredRole: string) => {
    const roleMessages = {
      member: 'You need to be a DAO member to access this feature.',
      moderator: 'You need moderator permissions to access this feature.',
      admin: 'You need admin permissions to access this feature.',
      owner: 'You need owner permissions to access this feature.'
    };
    
    return roleMessages[requiredRole as keyof typeof roleMessages] || 'Insufficient permissions.';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'moderator':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <LockClosedIcon className="h-5 w-5 mr-2 text-gray-400" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Wallet operations and DAO management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 text-sm">
              Please authenticate with your sQuid identity to access wallet operations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate comprehensive description for screen readers
  const actionsDescription = describeQuickActions(
    actionButtons.map(action => ({
      label: action.label,
      description: action.description,
      enabled: !action.disabled,
      reason: action.disabledReason
    }))
  );

  return (
    <Card 
      ref={containerRef}
      className={cn("w-full", className)}
      role="region"
      aria-label="Quick Actions Panel"
    >
      {/* Screen reader description */}
      <DataDescription 
        data={{
          type: 'navigation',
          title: 'Quick Actions Panel',
          summary: actionsDescription,
          instructions: 'Use Tab to navigate actions, Enter or Space to activate buttons'
        }}
      />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-lg">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Wallet operations and DAO management tools
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <UserIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <Badge variant={getRoleBadgeVariant(userRole)}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Error from useQwallet */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Feedback */}
        {actionFeedback.type && (
          <div className={`mb-4 border rounded-lg p-3 ${
            actionFeedback.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {actionFeedback.type === 'success' ? (
                  <InformationCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2" />
                )}
                <p className={`text-sm ${
                  actionFeedback.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {actionFeedback.message}
                </p>
              </div>
              <button
                onClick={() => setActionFeedback({ type: null, message: '' })}
                className={`text-sm hover:underline ${
                  actionFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {actionButtons.length === 0 ? (
          <div className="text-center py-6">
            <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Actions Available</h3>
            <p className="text-gray-600 text-sm">
              {getPermissionMessage('moderator')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionButtons.map((action) => (
              <div key={action.id}>
                <Button
                  onClick={() => handleActionClick(action.id)}
                  disabled={action.disabled || loading || actionLoading[action.id]}
                  variant={action.variant}
                  className="w-full justify-start h-auto p-4"
                >
                  <div className="flex items-center w-full">
                    {actionLoading[action.id] ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3 flex-shrink-0"></div>
                    ) : (
                      <action.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        {actionLoading[action.id] ? 'Loading...' : action.label}
                      </div>
                      <div className="text-sm opacity-75 mt-1">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Button>
                
                {action.disabled && action.disabledReason && (
                  <div className="mt-2 ml-8 flex items-start">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{action.disabledReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Permission Information */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Action Permissions:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Mint NFT:</strong> Requires moderator, admin, or owner role</li>
                <li>• <strong>Transfer Token:</strong> Available to all members with token balance</li>
                <li>• <strong>View NFT Gallery:</strong> Available to all members with NFTs</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Token Transfer Modal */}
      <Dialog 
        open={showTransferModal} 
        onOpenChange={(open) => {
          setShowTransferModal(open);
          if (!open) {
            // Refresh wallet data when modal closes to show updated balances
            refreshWalletData().then(() => {
              setActionFeedback({
                type: 'success',
                message: 'Wallet data refreshed after token transfer',
                action: 'transfer-token'
              });
            }).catch(() => {
              setActionFeedback({
                type: 'error',
                message: 'Failed to refresh wallet data',
                action: 'transfer-token'
              });
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Tokens</DialogTitle>
          </DialogHeader>
          <TokenTransferForm />
        </DialogContent>
      </Dialog>

      {/* NFT Gallery Modal */}
      <Dialog 
        open={showNFTGallery} 
        onOpenChange={(open) => {
          setShowNFTGallery(open);
          if (!open) {
            // Refresh wallet data when modal closes to show any changes
            refreshWalletData().then(() => {
              setActionFeedback({
                type: 'success',
                message: 'NFT gallery closed, wallet data refreshed',
                action: 'view-nft-gallery'
              });
            }).catch(() => {
              setActionFeedback({
                type: 'error',
                message: 'Failed to refresh wallet data',
                action: 'view-nft-gallery'
              });
            });
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>NFT Gallery</DialogTitle>
          </DialogHeader>
          <NFTGallery />
        </DialogContent>
      </Dialog>

      {/* Mint NFT Modal */}
      <Dialog open={showMintNFTModal} onOpenChange={setShowMintNFTModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mint New NFT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* NFT Name */}
            <div>
              <label htmlFor="nft-name" className="block text-sm font-medium text-gray-700 mb-1">
                NFT Name *
              </label>
              <input
                type="text"
                id="nft-name"
                value={mintNFTForm.name}
                onChange={(e) => setMintNFTForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter NFT name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* NFT Description */}
            <div>
              <label htmlFor="nft-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="nft-description"
                value={mintNFTForm.description}
                onChange={(e) => setMintNFTForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter NFT description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* NFT Image URL */}
            <div>
              <label htmlFor="nft-image" className="block text-sm font-medium text-gray-700 mb-1">
                Image URL (optional)
              </label>
              <input
                type="url"
                id="nft-image"
                value={mintNFTForm.image}
                onChange={(e) => setMintNFTForm(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* NFT Attributes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Attributes (optional)
                </label>
                <Button
                  type="button"
                  onClick={addNFTAttribute}
                  variant="outline"
                  size="sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Attribute
                </Button>
              </div>
              
              {mintNFTForm.attributes.map((attr, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={attr.trait_type}
                    onChange={(e) => updateNFTAttribute(index, 'trait_type', e.target.value)}
                    placeholder="Trait type"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateNFTAttribute(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    onClick={() => removeNFTAttribute(index)}
                    variant="outline"
                    size="sm"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* DAO Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <InformationCircleIcon className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">DAO NFT Information</p>
                  <p className="mt-1">
                    This NFT will be automatically tagged with DAO ID: <code className="bg-blue-100 px-1 rounded">{daoId}</code>
                    {' '}and minted by role: <code className="bg-blue-100 px-1 rounded">{userRole}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowMintNFTModal(false)}
                variant="outline"
                disabled={mintingNFT}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleMintNFT}
                disabled={mintingNFT || !mintNFTForm.name.trim() || !mintNFTForm.description.trim()}
              >
                {mintingNFT ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Minting...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Mint NFT
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickActionsPanel;