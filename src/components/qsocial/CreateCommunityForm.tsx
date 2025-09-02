/**
 * CreateCommunityForm Component
 * Allow authenticated users to create new DAO-backed communities in Qsocial
 * with privacy settings, initial metadata, governance parameters, and optional token/NFT configuration.
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Users,
  Lock,
  Globe,
  Shield,
  Coins,
  FileText,
  Upload,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  Settings,
  Crown,
  Vote
} from 'lucide-react';

import { useSessionContext } from '@/contexts/SessionContext';
import { useQwallet } from '@/composables/useQwallet';
import { useToast } from '@/hooks/use-toast';
import FileUpload from './FileUpload';

// Types
interface CreateCommunityFormProps {
  embedded?: boolean;
  onSuccess?: (communityId: string) => void;
  onCancel?: () => void;
}

interface CommunityMetadata {
  name: string;
  description: string;
  tags: string[];
  imageFile?: File;
}

interface GovernanceSettings {
  visibility: 'public' | 'dao-only' | 'private';
  quorum: number;
  votingMethod: 'token-weighted' | '1-person-1-vote' | 'NFT-holders-only';
}

interface AccessConfiguration {
  requireTokenOrNFT: boolean;
  minimumTokenAmount?: number;
  nftIdList?: string[];
}

interface InitialRoles {
  moderators: string[];
  proposalCreation: 'everyone' | 'mods-only';
}

interface FileAttachments {
  logo?: File;
  constitution?: File;
}

const visibilityOptions = [
  {
    value: 'public' as const,
    label: 'Public',
    description: 'Anyone can discover and join this community',
    icon: Globe
  },
  {
    value: 'dao-only' as const,
    label: 'DAO Only',
    description: 'Only verified DAO members can access',
    icon: Shield
  },
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Invitation only community',
    icon: Lock
  }
];

const votingMethodOptions = [
  {
    value: 'token-weighted' as const,
    label: 'Token Weighted',
    description: 'Voting power based on token holdings',
    icon: Coins
  },
  {
    value: '1-person-1-vote' as const,
    label: 'One Person One Vote',
    description: 'Equal voting power for all members',
    icon: Users
  },
  {
    value: 'NFT-holders-only' as const,
    label: 'NFT Holders Only',
    description: 'Only NFT holders can vote',
    icon: Crown
  }
];

export const CreateCommunityForm: React.FC<CreateCommunityFormProps> = ({
  embedded = false,
  onSuccess,
  onCancel
}) => {
  // Hooks
  const { session, isAuthenticated } = useSessionContext();
  const { balances, nfts, mintNFT, loading: walletLoading } = useQwallet();
  const { toast } = useToast();

  // Form state
  const [metadata, setMetadata] = useState<CommunityMetadata>({
    name: '',
    description: '',
    tags: []
  });

  const [governance, setGovernance] = useState<GovernanceSettings>({
    visibility: 'public',
    quorum: 20,
    votingMethod: '1-person-1-vote'
  });

  const [access, setAccess] = useState<AccessConfiguration>({
    requireTokenOrNFT: false,
    minimumTokenAmount: 0,
    nftIdList: []
  });

  const [roles, setRoles] = useState<InitialRoles>({
    moderators: [],
    proposalCreation: 'everyone'
  });

  const [files, setFiles] = useState<FileAttachments>({});

  // UI state
  const [currentTab, setCurrentTab] = useState('metadata');
  const [newTag, setNewTag] = useState('');
  const [newModerator, setNewModerator] = useState('');
  const [newNftId, setNewNftId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Validation
  const validateMetadata = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!metadata.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (metadata.name.length < 3 || metadata.name.length > 100) {
      newErrors.name = 'Name must be between 3-100 characters';
    }

    if (metadata.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (metadata.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAccess = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (access.requireTokenOrNFT) {
      if (governance.votingMethod === 'token-weighted' && (!access.minimumTokenAmount || access.minimumTokenAmount <= 0)) {
        newErrors.minimumTokenAmount = 'Minimum token amount is required';
      }

      if (governance.votingMethod === 'NFT-holders-only' && (!access.nftIdList || access.nftIdList.length === 0)) {
        newErrors.nftIdList = 'At least one NFT ID is required';
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleAddTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim()) && metadata.tags.length < 10) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddModerator = () => {
    if (newModerator.trim() && !roles.moderators.includes(newModerator.trim())) {
      setRoles(prev => ({
        ...prev,
        moderators: [...prev.moderators, newModerator.trim()]
      }));
      setNewModerator('');
    }
  };

  const handleRemoveModerator = (moderatorToRemove: string) => {
    setRoles(prev => ({
      ...prev,
      moderators: prev.moderators.filter(mod => mod !== moderatorToRemove)
    }));
  };

  const handleAddNftId = () => {
    if (newNftId.trim() && !access.nftIdList?.includes(newNftId.trim())) {
      setAccess(prev => ({
        ...prev,
        nftIdList: [...(prev.nftIdList || []), newNftId.trim()]
      }));
      setNewNftId('');
    }
  };

  const handleRemoveNftId = (nftIdToRemove: string) => {
    setAccess(prev => ({
      ...prev,
      nftIdList: prev.nftIdList?.filter(id => id !== nftIdToRemove) || []
    }));
  };

  const handleFileUpload = (type: 'logo' | 'constitution') => (uploadedFiles: any[]) => {
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      setFiles(prev => ({
        ...prev,
        [type]: file
      }));
    }
  };

  // Ecosystem integrations simulation
  const processWithEcosystem = async (communityData: any) => {
    console.log('[CreateCommunityForm] Processing with Q∞ ecosystem...');
    
    // 1. sQuid Authentication Check
    if (!isAuthenticated || !session) {
      throw new Error('Authentication required');
    }

    // 2. Qonsent - Generate privacy profile
    const qonsentProfile = {
      profileId: `community-${Date.now()}`,
      visibility: governance.visibility,
      encryptionLevel: governance.visibility === 'private' ? 'high' : 'medium'
    };

    // 3. Qlock - Encrypt metadata
    const qlockData = {
      encrypted: governance.visibility !== 'public',
      encryptionLevel: governance.visibility === 'private' ? 'quantum' : 'standard',
      keyId: `key-${Date.now()}`
    };

    // 4. Qindex - Register community metadata
    const qindexData = {
      indexId: `idx-${Date.now()}`,
      searchable: governance.visibility === 'public',
      timestamp: new Date().toISOString()
    };

    // 5. Qerberos - Log creation event
    const qerberosLog = {
      event: 'community_creation',
      userId: session.did || session.id,
      timestamp: Date.now(),
      metadata: {
        communityName: metadata.name,
        visibility: governance.visibility,
        votingMethod: governance.votingMethod
      }
    };

    // 6. Qwallet - Mint community NFT if required
    let communityNFT = null;
    if (access.requireTokenOrNFT && governance.votingMethod === 'NFT-holders-only') {
      try {
        communityNFT = await mintNFT({
          name: `${metadata.name} Community Token`,
          description: `Membership token for ${metadata.name} community`,
          attributes: [
            { trait_type: 'Community', value: metadata.name },
            { trait_type: 'Role', value: 'Member' },
            { trait_type: 'Created', value: new Date().toISOString() }
          ]
        });
      } catch (error) {
        console.error('Failed to mint community NFT:', error);
      }
    }

    return {
      communityId: `community-${Date.now()}`,
      ecosystem: {
        qonsent: qonsentProfile,
        qlock: qlockData,
        qindex: qindexData,
        qerberos: qerberosLog,
        qwallet: communityNFT
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a community",
        variant: "destructive"
      });
      return;
    }

    // Validate all sections
    const isMetadataValid = validateMetadata();
    const isAccessValid = validateAccess();

    if (!isMetadataValid || !isAccessValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      // Prepare community data
      const communityData = {
        metadata,
        governance,
        access,
        roles,
        files,
        creator: session?.did || session?.id
      };

      // Process with ecosystem integrations
      const result = await processWithEcosystem(communityData);

      toast({
        title: "Community Created Successfully!",
        description: `${metadata.name} has been created and registered in the ecosystem`,
        variant: "default"
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(result.communityId);
      }

    } catch (error) {
      console.error('Community creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create community';
      
      setErrors({ general: errorMessage });
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render methods
  const renderMetadataTab = () => (
    <div className="space-y-6">
      {/* Community Name */}
      <div>
        <Label htmlFor="name">Community Name *</Label>
        <Input
          id="name"
          placeholder="Enter community name..."
          value={metadata.name}
          onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
          className={errors.name ? 'border-destructive' : ''}
          maxLength={100}
        />
        <div className="flex justify-between mt-1">
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {metadata.name.length}/100
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your community..."
          value={metadata.description}
          onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
          className={`min-h-[100px] ${errors.description ? 'border-destructive' : ''}`}
          maxLength={2000}
        />
        <div className="flex justify-between mt-1">
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {metadata.description.length}/2000
          </p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add a tag (e.g., #crypto, #art)..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddTag}
            disabled={!newTag.trim() || metadata.tags.length >= 10}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {metadata.tags.length}/10 tags
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <Label>Community Logo</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload a logo for your community (max 2MB, JPG/PNG)
        </p>
        <FileUpload
          onUploadComplete={handleFileUpload('logo')}
          maxFiles={1}
          maxFileSize={2 * 1024 * 1024} // 2MB
          allowMultiple={false}
          acceptedTypes={['image/jpeg', 'image/png']}
          showIPFSInfo={false}
        />
      </div>
    </div>
  );

  const renderGovernanceTab = () => (
    <div className="space-y-6">
      {/* Visibility */}
      <div>
        <Label>Community Visibility</Label>
        <div className="grid gap-3 mt-2">
          {visibilityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  governance.visibility === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setGovernance(prev => ({ ...prev, visibility: option.value }))}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {governance.visibility === option.value && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quorum */}
      <div>
        <Label>Quorum Percentage</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Percentage of members required for valid proposals
        </p>
        <div className="space-y-3">
          <Slider
            value={[governance.quorum]}
            onValueChange={([value]) => setGovernance(prev => ({ ...prev, quorum: value }))}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1%</span>
            <span className="font-medium text-foreground">{governance.quorum}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Voting Method */}
      <div>
        <Label>Voting Method</Label>
        <div className="grid gap-3 mt-2">
          {votingMethodOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  governance.votingMethod === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setGovernance(prev => ({ ...prev, votingMethod: option.value }))}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {governance.votingMethod === option.value && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );  con
st renderAccessTab = () => (
    <div className="space-y-6">
      {/* Require Token/NFT */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Token or NFT to Join</Label>
          <p className="text-sm text-muted-foreground">
            Members must hold tokens or NFTs to access the community
          </p>
        </div>
        <Switch
          checked={access.requireTokenOrNFT}
          onCheckedChange={(checked) => setAccess(prev => ({ ...prev, requireTokenOrNFT: checked }))}
        />
      </div>

      {access.requireTokenOrNFT && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {/* Token Requirements */}
          {(governance.votingMethod === 'token-weighted' || governance.votingMethod === '1-person-1-vote') && (
            <div>
              <Label htmlFor="minimumTokenAmount">Minimum Token Amount</Label>
              <Input
                id="minimumTokenAmount"
                type="number"
                placeholder="Enter minimum QToken amount..."
                value={access.minimumTokenAmount || ''}
                onChange={(e) => setAccess(prev => ({ 
                  ...prev, 
                  minimumTokenAmount: parseFloat(e.target.value) || 0 
                }))}
                className={errors.minimumTokenAmount ? 'border-destructive' : ''}
                min="0"
                step="0.01"
              />
              {errors.minimumTokenAmount && (
                <p className="text-sm text-destructive mt-1">{errors.minimumTokenAmount}</p>
              )}
            </div>
          )}

          {/* NFT Requirements */}
          {governance.votingMethod === 'NFT-holders-only' && (
            <div>
              <Label>Required NFT IDs</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Enter NFT ID..."
                  value={newNftId}
                  onChange={(e) => setNewNftId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNftId())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddNftId}
                  disabled={!newNftId.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {access.nftIdList && access.nftIdList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {access.nftIdList.map((nftId) => (
                    <Badge key={nftId} variant="outline" className="flex items-center gap-1">
                      NFT #{nftId}
                      <button
                        type="button"
                        onClick={() => handleRemoveNftId(nftId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {errors.nftIdList && (
                <p className="text-sm text-destructive mt-1">{errors.nftIdList}</p>
              )}
            </div>
          )}

          {/* User Balance Display */}
          {balances && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Your Current Holdings</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">QToken Balance</p>
                  <p className="font-medium">{balances.QToken.balance.toFixed(2)} QToken</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NFTs Owned</p>
                  <p className="font-medium">{nfts.length} NFTs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRolesTab = () => (
    <div className="space-y-6">
      {/* Moderators */}
      <div>
        <Label>Initial Moderators</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Add sQuid DIDs of users who will have moderation privileges
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter sQuid DID..."
            value={newModerator}
            onChange={(e) => setNewModerator(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddModerator())}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddModerator}
            disabled={!newModerator.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {roles.moderators.length > 0 && (
          <div className="space-y-2 mt-3">
            {roles.moderators.map((moderator) => (
              <div key={moderator} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm">{moderator}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveModerator(moderator)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proposal Creation */}
      <div>
        <Label>Proposal Creation</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Who can create proposals in this community?
        </p>
        <Select 
          value={roles.proposalCreation} 
          onValueChange={(value: 'everyone' | 'mods-only') => 
            setRoles(prev => ({ ...prev, proposalCreation: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <div>
                  <p className="font-medium">Everyone</p>
                  <p className="text-xs text-muted-foreground">All community members can create proposals</p>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="mods-only">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <div>
                  <p className="font-medium">Moderators Only</p>
                  <p className="text-xs text-muted-foreground">Only moderators can create proposals</p>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="space-y-6">
      {/* Constitution/Rules */}
      <div>
        <Label>Community Constitution</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload a PDF document with community rules and constitution (max 10MB)
        </p>
        <FileUpload
          onUploadComplete={handleFileUpload('constitution')}
          maxFiles={1}
          maxFileSize={10 * 1024 * 1024} // 10MB
          allowMultiple={false}
          acceptedTypes={['application/pdf']}
          showIPFSInfo={true}
        />
        {files.constitution && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{files.constitution.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFiles(prev => ({ ...prev, constitution: undefined }))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{metadata.name || 'Community Name'}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {metadata.description || 'No description provided'}
              </p>
            </div>
            {files.logo && (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tags */}
          {metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map((tag) => (
                <Badge key={tag} variant="secondary">#{tag}</Badge>
              ))}
            </div>
          )}

          {/* Governance Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {visibilityOptions.find(opt => opt.value === governance.visibility)?.icon && (
                React.createElement(visibilityOptions.find(opt => opt.value === governance.visibility)!.icon, { className: "h-4 w-4" })
              )}
              <span className="text-sm capitalize">{governance.visibility}</span>
            </div>
            <div className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              <span className="text-sm">{governance.quorum}% Quorum</span>
            </div>
            <div className="flex items-center gap-2">
              {votingMethodOptions.find(opt => opt.value === governance.votingMethod)?.icon && (
                React.createElement(votingMethodOptions.find(opt => opt.value === governance.votingMethod)!.icon, { className: "h-4 w-4" })
              )}
              <span className="text-sm">{governance.votingMethod.replace('-', ' ')}</span>
            </div>
          </div>

          {/* Access Requirements */}
          {access.requireTokenOrNFT && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Access Requirements</h4>
              <div className="space-y-1 text-sm">
                {access.minimumTokenAmount && (
                  <p>• Minimum {access.minimumTokenAmount} QToken required</p>
                )}
                {access.nftIdList && access.nftIdList.length > 0 && (
                  <p>• Must hold one of {access.nftIdList.length} specified NFTs</p>
                )}
              </div>
            </div>
          )}

          {/* Moderators */}
          {roles.moderators.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Initial Moderators</h4>
              <div className="space-y-1">
                {roles.moderators.map((mod) => (
                  <div key={mod} className="flex items-center gap-2 text-sm">
                    <Shield className="h-3 w-3" />
                    <span className="font-mono">{mod}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {(files.logo || files.constitution) && (
            <div>
              <h4 className="font-medium mb-2">Attached Files</h4>
              <div className="space-y-1 text-sm">
                {files.logo && <p>• Community logo uploaded</p>}
                {files.constitution && <p>• Constitution document uploaded</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (!embedded) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Community</h1>
          <p className="text-muted-foreground mt-2">
            Set up a new DAO-backed community with governance, privacy settings, and access controls.
          </p>
        </div>
        <CreateCommunityFormContent />
      </div>
    );
  }

  function CreateCommunityFormContent() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {/* General Error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            )}

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="metadata" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Metadata
                </TabsTrigger>
                <TabsTrigger value="governance" className="text-xs">
                  <Settings className="h-4 w-4 mr-1" />
                  Governance
                </TabsTrigger>
                <TabsTrigger value="access" className="text-xs">
                  <Lock className="h-4 w-4 mr-1" />
                  Access
                </TabsTrigger>
                <TabsTrigger value="roles" className="text-xs">
                  <Shield className="h-4 w-4 mr-1" />
                  Roles
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs">
                  <Upload className="h-4 w-4 mr-1" />
                  Files
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="metadata">{renderMetadataTab()}</TabsContent>
                <TabsContent value="governance">{renderGovernanceTab()}</TabsContent>
                <TabsContent value="access">{renderAccessTab()}</TabsContent>
                <TabsContent value="roles">{renderRolesTab()}</TabsContent>
                <TabsContent value="files">{renderFilesTab()}</TabsContent>
              </div>
            </Tabs>

            {/* Preview Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
              {showPreview && renderPreview()}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={submitting || !metadata.name.trim() || !isAuthenticated}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Community...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Create Community
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return <CreateCommunityFormContent />;
};

export default CreateCommunityForm;