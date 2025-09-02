/**
 * CreateEnterpriseDAOForm - Enterprise DAO creation interface
 * 
 * Allows authorized users with valid business sub-identities to create 
 * Enterprise DAOs with governance, access controls, and ecosystem integrations.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Building2,
  Users,
  Shield,
  Lock,
  Globe,
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
  Vote,
  Coins,
  Key,
  HelpCircle,
  Download
} from 'lucide-react';

import { useSessionContext } from '@/contexts/SessionContext';
import { useQwallet } from '@/composables/useQwallet';
import { useQonsent } from '@/hooks/useQonsent';
import { useQlock } from '@/hooks/useQlock';
import { useQindex } from '@/hooks/useQindex';
import { useQerberos } from '@/hooks/useQerberos';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '../qsocial/FileUpload';

// Types
interface CreateEnterpriseDAOFormProps {
  embedded?: boolean;
  onSuccess?: (daoId: string) => void;
  onCancel?: () => void;
}

interface EnterpriseMetadata {
  companyName: string;
  description: string;
  sector: string;
  tags: string[];
  logoFile?: File;
  websiteUrl: string;
}

interface GovernanceSettings {
  parentDAO: string;
  votingMethod: 'user-based' | 'NFT-weighted' | 'token-weighted';
  quorum: number;
  roles: {
    CEO: string;
    CTO: string;
    Validator: string;
    Legal: string;
    Moderator: string;
  };
  delegateVoting: boolean;
}

interface AccessTokens {
  requireInternalKYC: boolean;
  gatedAccess: boolean;
  tokenMinting: {
    enabled: boolean;
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: number;
  };
  enterpriseNFT: {
    enabled: boolean;
    metadata: any;
  };
  accessPrice: number;
}

interface PermissionsPrivacy {
  visibility: 'public' | 'dao-only' | 'private';
  qonsentProfile: any;
  qlockLevel: 'public' | 'symmetric' | 'asymmetric';
  requireParentSignature: boolean;
}

interface FilesCompliance {
  constitution?: File;
  legalDocs: File[];
  certificates: File[];
  termsAgreement: boolean;
}

const sectors = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'energy', label: 'Energy' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'consulting', label: 'Consulting' }
];

const votingMethodOptions = [
  {
    value: 'user-based' as const,
    label: 'One User One Vote',
    description: 'Equal voting power for all members',
    icon: Users
  },
  {
    value: 'NFT-weighted' as const,
    label: 'NFT Weighted',
    description: 'Voting power based on NFT holdings',
    icon: Crown
  },
  {
    value: 'token-weighted' as const,
    label: 'Token Weighted',
    description: 'Voting power based on token holdings',
    icon: Coins
  }
];

const visibilityOptions = [
  {
    value: 'public' as const,
    label: 'Public',
    description: 'Anyone can discover and view this DAO',
    icon: Globe
  },
  {
    value: 'dao-only' as const,
    label: 'DAO Only',
    description: 'Only parent DAO members can access',
    icon: Shield
  },
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Invitation only access',
    icon: Lock
  }
];

const encryptionLevels = [
  {
    value: 'public' as const,
    label: 'Public',
    description: 'No encryption, publicly accessible'
  },
  {
    value: 'symmetric' as const,
    label: 'Symmetric',
    description: 'Standard encryption for internal use'
  },
  {
    value: 'asymmetric' as const,
    label: 'Asymmetric',
    description: 'Advanced encryption for sensitive data'
  }
];

export const CreateEnterpriseDAOForm: React.FC<CreateEnterpriseDAOFormProps> = ({
  embedded = false,
  onSuccess,
  onCancel
}) => {
  // Hooks
  const { session, isAuthenticated } = useSessionContext();
  const { balances, nfts, mintNFT, loading: walletLoading } = useQwallet();
  const { settings: qonsentSettings, generateProfile } = useQonsent();
  const { encrypt, generateKeys } = useQlock();
  const { registerFile, checkPermission } = useQindex();
  const { logAccess, checkSecurityThreats } = useQerberos();
  const { toast } = useToast();

  // Form state
  const [metadata, setMetadata] = useState<EnterpriseMetadata>({
    companyName: '',
    description: '',
    sector: '',
    tags: [],
    websiteUrl: ''
  });

  const [governance, setGovernance] = useState<GovernanceSettings>({
    parentDAO: '',
    votingMethod: 'user-based',
    quorum: 51,
    roles: {
      CEO: '',
      CTO: '',
      Validator: '',
      Legal: '',
      Moderator: ''
    },
    delegateVoting: false
  });

  const [accessTokens, setAccessTokens] = useState<AccessTokens>({
    requireInternalKYC: false,
    gatedAccess: false,
    tokenMinting: {
      enabled: false,
      name: '',
      symbol: '',
      decimals: 18,
      initialSupply: 1000000
    },
    enterpriseNFT: {
      enabled: false,
      metadata: {}
    },
    accessPrice: 0
  });

  const [permissions, setPermissions] = useState<PermissionsPrivacy>({
    visibility: 'public',
    qonsentProfile: null,
    qlockLevel: 'symmetric',
    requireParentSignature: true
  });

  const [files, setFiles] = useState<FilesCompliance>({
    legalDocs: [],
    certificates: [],
    termsAgreement: false
  });

  // UI state
  const [currentTab, setCurrentTab] = useState('metadata');
  const [newTag, setNewTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [parentDAOs, setParentDAOs] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  // Load parent DAOs based on sector
  useEffect(() => {
    if (metadata.sector) {
      loadParentDAOs(metadata.sector);
    }
  }, [metadata.sector]);

  // Calculate progress
  useEffect(() => {
    const calculateProgress = () => {
      let completed = 0;
      const total = 5; // 5 tabs

      // Metadata tab
      if (metadata.companyName && metadata.sector) completed++;
      
      // Governance tab
      if (governance.parentDAO && governance.roles.CEO) completed++;
      
      // Access & Tokens tab (always counts as completed)
      completed++;
      
      // Permissions & Privacy tab
      if (permissions.visibility) completed++;
      
      // Files & Compliance tab
      if (files.constitution && files.termsAgreement) completed++;

      setProgress((completed / total) * 100);
    };

    calculateProgress();
  }, [metadata, governance, accessTokens, permissions, files]);

  const loadParentDAOs = async (sector: string) => {
    try {
      // Mock parent DAOs based on sector
      const mockParentDAOs = {
        technology: [
          { id: 'tech-dao-1', name: 'TechCorp DAO', description: 'Leading technology enterprises' },
          { id: 'tech-dao-2', name: 'Innovation Hub DAO', description: 'Startup and innovation focused' }
        ],
        finance: [
          { id: 'fin-dao-1', name: 'FinTech Alliance DAO', description: 'Financial technology companies' },
          { id: 'fin-dao-2', name: 'Banking Consortium DAO', description: 'Traditional banking sector' }
        ],
        healthcare: [
          { id: 'health-dao-1', name: 'MedTech DAO', description: 'Medical technology companies' },
          { id: 'health-dao-2', name: 'Healthcare Providers DAO', description: 'Healthcare service providers' }
        ]
      };

      setParentDAOs(mockParentDAOs[sector as keyof typeof mockParentDAOs] || []);
    } catch (error) {
      console.error('Failed to load parent DAOs:', error);
    }
  };

  // Validation functions
  const validateMetadata = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!metadata.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    } else if (metadata.companyName.length < 3 || metadata.companyName.length > 100) {
      newErrors.companyName = 'Company name must be between 3-100 characters';
    }

    if (!metadata.sector) {
      newErrors.sector = 'Sector selection is required';
    }

    if (metadata.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (metadata.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    if (metadata.websiteUrl && !isValidUrl(metadata.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateGovernance = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!governance.parentDAO) {
      newErrors.parentDAO = 'Parent DAO selection is required';
    }

    if (!governance.roles.CEO.trim()) {
      newErrors.ceo = 'CEO assignment is required';
    }

    if (governance.quorum < 1 || governance.quorum > 100) {
      newErrors.quorum = 'Quorum must be between 1-100%';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAccessTokens = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (accessTokens.tokenMinting.enabled) {
      if (!accessTokens.tokenMinting.name.trim()) {
        newErrors.tokenName = 'Token name is required';
      }
      if (!accessTokens.tokenMinting.symbol.trim()) {
        newErrors.tokenSymbol = 'Token symbol is required';
      }
      if (accessTokens.tokenMinting.initialSupply <= 0) {
        newErrors.tokenSupply = 'Initial supply must be greater than 0';
      }
    }

    if (accessTokens.gatedAccess && accessTokens.accessPrice < 0) {
      newErrors.accessPrice = 'Access price cannot be negative';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateFiles = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!files.constitution) {
      newErrors.constitution = 'Constitution document is required';
    }

    if (!files.termsAgreement) {
      newErrors.termsAgreement = 'Terms agreement is required';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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

  const handleRoleAssignment = (role: keyof GovernanceSettings['roles'], value: string) => {
    setGovernance(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: value
      }
    }));
  };

  const handleFileUpload = (type: 'logo' | 'constitution' | 'legal' | 'certificates') => (uploadedFiles: any[]) => {
    if (type === 'logo' && uploadedFiles.length > 0) {
      setMetadata(prev => ({ ...prev, logoFile: uploadedFiles[0] }));
    } else if (type === 'constitution' && uploadedFiles.length > 0) {
      setFiles(prev => ({ ...prev, constitution: uploadedFiles[0] }));
    } else if (type === 'legal') {
      setFiles(prev => ({ ...prev, legalDocs: [...prev.legalDocs, ...uploadedFiles] }));
    } else if (type === 'certificates') {
      setFiles(prev => ({ ...prev, certificates: [...prev.certificates, ...uploadedFiles] }));
    }
  };

  const removeFile = (type: 'legal' | 'certificates', index: number) => {
    setFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Ecosystem integrations
  const processWithEcosystem = async (daoData: any) => {
    console.log('[CreateEnterpriseDAOForm] Processing with Q∞ ecosystem...');
    
    // 1. sQuid Authentication Check
    if (!isAuthenticated || !session) {
      throw new Error('Authentication required');
    }

    // Check if user has valid business sub-identity
    if (!session.type || session.type !== 'SUB' || !session.kyc) {
      throw new Error('Valid business sub-identity with KYC verification required');
    }

    // 2. Security validation with Qerberos
    const hasThreats = await checkSecurityThreats(daoData);
    if (hasThreats) {
      throw new Error('Security validation failed');
    }

    // 3. Qonsent - Generate privacy profile
    const qonsentProfileId = await generateProfile({
      type: 'enterprise-dao',
      sector: metadata.sector,
      visibility: permissions.visibility,
      companyName: metadata.companyName
    });

    // 4. Qlock - Encrypt sensitive data
    const keys = await generateKeys(permissions.qlockLevel.toUpperCase());
    if (!keys) {
      throw new Error('Failed to generate encryption keys');
    }

    const encryptedData = await encrypt(
      JSON.stringify({
        constitution: files.constitution?.name,
        legalDocs: files.legalDocs.map(f => f.name),
        roles: governance.roles
      }),
      keys.publicKey,
      permissions.qlockLevel.toUpperCase()
    );

    // 5. Qwallet - Mint enterprise token if enabled
    let enterpriseToken = null;
    if (accessTokens.tokenMinting.enabled) {
      try {
        enterpriseToken = await mintNFT({
          name: `${metadata.companyName} Enterprise Token`,
          description: `Enterprise token for ${metadata.companyName}`,
          attributes: [
            { trait_type: 'Company', value: metadata.companyName },
            { trait_type: 'Sector', value: metadata.sector },
            { trait_type: 'Token Symbol', value: accessTokens.tokenMinting.symbol }
          ]
        });
      } catch (error) {
        console.error('Failed to mint enterprise token:', error);
      }
    }

    // 6. Qindex - Register DAO
    if (files.constitution) {
      await registerFile(
        `dao-${Date.now()}`,
        files.constitution.name,
        permissions.visibility === 'public' ? 'public' : 'private',
        session.did || session.id,
        files.constitution.size
      );
    }

    // 7. Qerberos - Log creation event
    await logAccess({
      cid: `enterprise-dao-${Date.now()}`,
      identity: session.did || session.id,
      status: 'SUCCESS',
      operation: 'UPLOAD',
      reason: 'Enterprise DAO creation',
      metadata: {
        companyName: metadata.companyName,
        sector: metadata.sector,
        parentDAO: governance.parentDAO
      }
    });

    return {
      daoId: `enterprise-dao-${Date.now()}`,
      ecosystem: {
        qonsent: { profileId: qonsentProfileId },
        qlock: { encrypted: encryptedData, keys },
        qwallet: { token: enterpriseToken },
        qindex: { registered: true },
        qerberos: { logged: true }
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in with a valid business sub-identity",
        variant: "destructive"
      });
      return;
    }

    // Validate all sections
    const isMetadataValid = validateMetadata();
    const isGovernanceValid = validateGovernance();
    const isAccessValid = validateAccessTokens();
    const isFilesValid = validateFiles();

    if (!isMetadataValid || !isGovernanceValid || !isAccessValid || !isFilesValid) {
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

      // Prepare DAO data
      const daoData = {
        metadata,
        governance,
        accessTokens,
        permissions,
        files,
        creator: session?.did || session?.id
      };

      // Process with ecosystem integrations
      const result = await processWithEcosystem(daoData);

      toast({
        title: "Enterprise DAO Created Successfully!",
        description: `${metadata.companyName} has been registered in the ecosystem`,
        variant: "default"
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(result.daoId);
      }

    } catch (error) {
      console.error('Enterprise DAO creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Enterprise DAO';
      
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
      {/* Company Name */}
      <div>
        <Label htmlFor="companyName">Company Name *</Label>
        <Input
          id="companyName"
          placeholder="Enter company name..."
          value={metadata.companyName}
          onChange={(e) => setMetadata(prev => ({ ...prev, companyName: e.target.value }))}
          className={errors.companyName ? 'border-destructive' : ''}
          maxLength={100}
        />
        <div className="flex justify-between mt-1">
          {errors.companyName && (
            <p className="text-sm text-destructive">{errors.companyName}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {metadata.companyName.length}/100
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your enterprise..."
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

      {/* Sector */}
      <div>
        <Label>Sector *</Label>
        <Select 
          value={metadata.sector} 
          onValueChange={(value) => setMetadata(prev => ({ ...prev, sector: value }))}
        >
          <SelectTrigger className={errors.sector ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select business sector..." />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((sector) => (
              <SelectItem key={sector.value} value={sector.value}>
                {sector.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.sector && (
          <p className="text-sm text-destructive mt-1">{errors.sector}</p>
        )}
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add a tag..."
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
        <Label>Company Logo</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload a logo for your enterprise (max 2MB, SVG/JPG/PNG)
        </p>
        <FileUpload
          onUploadComplete={handleFileUpload('logo')}
          maxFiles={1}
          maxFileSize={2 * 1024 * 1024} // 2MB
          allowMultiple={false}
          acceptedTypes={['image/svg+xml', 'image/jpeg', 'image/png']}
          showIPFSInfo={false}
        />
      </div>

      {/* Website URL */}
      <div>
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          type="url"
          placeholder="https://example.com"
          value={metadata.websiteUrl}
          onChange={(e) => setMetadata(prev => ({ ...prev, websiteUrl: e.target.value }))}
          className={errors.websiteUrl ? 'border-destructive' : ''}
        />
        {errors.websiteUrl && (
          <p className="text-sm text-destructive mt-1">{errors.websiteUrl}</p>
        )}
      </div>
    </div>
  );

  const renderGovernanceTab = () => (
    <div className="space-y-6">
      {/* Parent DAO */}
      <div>
        <Label>Parent DAO *</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Select 
                  value={governance.parentDAO} 
                  onValueChange={(value) => setGovernance(prev => ({ ...prev, parentDAO: value }))}
                  disabled={!metadata.sector}
                >
                  <SelectTrigger className={errors.parentDAO ? 'border-destructive' : ''}>
                    <SelectValue placeholder={metadata.sector ? "Select parent DAO..." : "Select sector first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentDAOs.map((dao) => (
                      <SelectItem key={dao.id} value={dao.id}>
                        <div>
                          <p className="font-medium">{dao.name}</p>
                          <p className="text-xs text-muted-foreground">{dao.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Parent DAO provides governance oversight and sector-specific guidance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {errors.parentDAO && (
          <p className="text-sm text-destructive mt-1">{errors.parentDAO}</p>
        )}
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

      {/* Initial Roles */}
      <div>
        <Label>Initial Roles Assignment</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Assign key roles to wallet addresses or DIDs
        </p>
        <div className="space-y-4">
          {Object.entries(governance.roles).map(([role, value]) => (
            <div key={role}>
              <Label htmlFor={role}>{role} *{role === 'CEO' ? ' (Required)' : ''}</Label>
              <Input
                id={role}
                placeholder={`Enter ${role} wallet address or DID...`}
                value={value}
                onChange={(e) => handleRoleAssignment(role as keyof GovernanceSettings['roles'], e.target.value)}
                className={errors[role.toLowerCase()] ? 'border-destructive' : ''}
              />
              {errors[role.toLowerCase()] && (
                <p className="text-sm text-destructive mt-1">{errors[role.toLowerCase()]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delegate Voting */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Delegate Voting</Label>
          <p className="text-sm text-muted-foreground">
            Allow members to delegate their voting power to others
          </p>
        </div>
        <Switch
          checked={governance.delegateVoting}
          onCheckedChange={(checked) => setGovernance(prev => ({ ...prev, delegateVoting: checked }))}
        />
      </div>
    </div>
  );

  const renderAccessTokensTab = () => (
    <div className="space-y-6">
      {/* Internal KYC */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Internal KYC for Employees</Label>
          <p className="text-sm text-muted-foreground">
            Employees must complete KYC verification to access enterprise resources
          </p>
        </div>
        <Switch
          checked={accessTokens.requireInternalKYC}
          onCheckedChange={(checked) => setAccessTokens(prev => ({ ...prev, requireInternalKYC: checked }))}
        />
      </div>

      {/* Gated Access */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Gated Access via Token/NFT</Label>
          <p className="text-sm text-muted-foreground">
            Require token or NFT ownership for enterprise access
          </p>
        </div>
        <Switch
          checked={accessTokens.gatedAccess}
          onCheckedChange={(checked) => setAccessTokens(prev => ({ ...prev, gatedAccess: checked }))}
        />
      </div>

      {/* Token Minting */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <Label>Enterprise Token Minting</Label>
            <p className="text-sm text-muted-foreground">
              Create a custom token for your enterprise
            </p>
          </div>
          <Switch
            checked={accessTokens.tokenMinting.enabled}
            onCheckedChange={(checked) => setAccessTokens(prev => ({ 
              ...prev, 
              tokenMinting: { ...prev.tokenMinting, enabled: checked }
            }))}
          />
        </div>

        {accessTokens.tokenMinting.enabled && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tokenName">Token Name *</Label>
                <Input
                  id="tokenName"
                  placeholder="Enterprise Token"
                  value={accessTokens.tokenMinting.name}
                  onChange={(e) => setAccessTokens(prev => ({ 
                    ...prev, 
                    tokenMinting: { ...prev.tokenMinting, name: e.target.value }
                  }))}
                  className={errors.tokenName ? 'border-destructive' : ''}
                />
                {errors.tokenName && (
                  <p className="text-sm text-destructive mt-1">{errors.tokenName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tokenSymbol">Token Symbol *</Label>
                <Input
                  id="tokenSymbol"
                  placeholder="ENT"
                  value={accessTokens.tokenMinting.symbol}
                  onChange={(e) => setAccessTokens(prev => ({ 
                    ...prev, 
                    tokenMinting: { ...prev.tokenMinting, symbol: e.target.value.toUpperCase() }
                  }))}
                  className={errors.tokenSymbol ? 'border-destructive' : ''}
                  maxLength={10}
                />
                {errors.tokenSymbol && (
                  <p className="text-sm text-destructive mt-1">{errors.tokenSymbol}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tokenDecimals">Decimals</Label>
                <Input
                  id="tokenDecimals"
                  type="number"
                  min="0"
                  max="18"
                  value={accessTokens.tokenMinting.decimals}
                  onChange={(e) => setAccessTokens(prev => ({ 
                    ...prev, 
                    tokenMinting: { ...prev.tokenMinting, decimals: parseInt(e.target.value) || 18 }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="initialSupply">Initial Supply *</Label>
                <Input
                  id="initialSupply"
                  type="number"
                  min="1"
                  value={accessTokens.tokenMinting.initialSupply}
                  onChange={(e) => setAccessTokens(prev => ({ 
                    ...prev, 
                    tokenMinting: { ...prev.tokenMinting, initialSupply: parseInt(e.target.value) || 0 }
                  }))}
                  className={errors.tokenSupply ? 'border-destructive' : ''}
                />
                {errors.tokenSupply && (
                  <p className="text-sm text-destructive mt-1">{errors.tokenSupply}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enterprise NFT */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enterprise NFT</Label>
          <p className="text-sm text-muted-foreground">
            Create a unique NFT representing your enterprise
          </p>
        </div>
        <Switch
          checked={accessTokens.enterpriseNFT.enabled}
          onCheckedChange={(checked) => setAccessTokens(prev => ({ 
            ...prev, 
            enterpriseNFT: { ...prev.enterpriseNFT, enabled: checked }
          }))}
        />
      </div>

      {/* Access Price */}
      {accessTokens.gatedAccess && (
        <div>
          <Label htmlFor="accessPrice">Access Price (QToken)</Label>
          <Input
            id="accessPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={accessTokens.accessPrice}
            onChange={(e) => setAccessTokens(prev => ({ 
              ...prev, 
              accessPrice: parseFloat(e.target.value) || 0 
            }))}
            className={errors.accessPrice ? 'border-destructive' : ''}
          />
          {errors.accessPrice && (
            <p className="text-sm text-destructive mt-1">{errors.accessPrice}</p>
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
  );

  const renderPermissionsTab = () => (
    <div className="space-y-6">
      {/* Visibility */}
      <div>
        <Label>DAO Visibility</Label>
        <div className="grid gap-3 mt-2">
          {visibilityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  permissions.visibility === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPermissions(prev => ({ ...prev, visibility: option.value }))}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {permissions.visibility === option.value && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Qonsent Profile */}
      <div>
        <Label>Qonsent Privacy Profile</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Privacy profile will be automatically generated based on sector and visibility settings
        </p>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">Auto-Generated Profile</span>
          </div>
          <div className="text-sm space-y-1">
            <p>• Sector: {metadata.sector || 'Not selected'}</p>
            <p>• Visibility: {permissions.visibility}</p>
            <p>• Encryption: {permissions.qlockLevel}</p>
          </div>
        </div>
      </div>

      {/* Qlock Encryption Level */}
      <div>
        <Label>Qlock Encryption Level</Label>
        <Select 
          value={permissions.qlockLevel} 
          onValueChange={(value: 'public' | 'symmetric' | 'asymmetric') => 
            setPermissions(prev => ({ ...prev, qlockLevel: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {encryptionLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div>
                  <p className="font-medium">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parent DAO Signature */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Parent DAO Signature</Label>
          <p className="text-sm text-muted-foreground">
            Parent DAO must approve and sign the enterprise creation
          </p>
        </div>
        <Switch
          checked={permissions.requireParentSignature}
          onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, requireParentSignature: checked }))}
        />
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="space-y-6">
      {/* Constitution Document */}
      <div>
        <Label>Constitution Document *</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload your enterprise constitution (PDF, required)
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
        {errors.constitution && (
          <p className="text-sm text-destructive mt-1">{errors.constitution}</p>
        )}
      </div>

      {/* Legal Documents */}
      <div>
        <Label>Legal Documents</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload additional legal documents (optional, max 10MB each)
        </p>
        <FileUpload
          onUploadComplete={handleFileUpload('legal')}
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024} // 10MB
          allowMultiple={true}
          acceptedTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
          showIPFSInfo={false}
        />
        {files.legalDocs.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.legalDocs.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('legal', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificates */}
      <div>
        <Label>Certificates</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload business certificates and licenses (optional)
        </p>
        <FileUpload
          onUploadComplete={handleFileUpload('certificates')}
          maxFiles={10}
          maxFileSize={5 * 1024 * 1024} // 5MB
          allowMultiple={true}
          acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
          showIPFSInfo={false}
        />
        {files.certificates.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.certificates.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('certificates', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terms Agreement */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="termsAgreement"
          checked={files.termsAgreement}
          onCheckedChange={(checked) => setFiles(prev => ({ ...prev, termsAgreement: !!checked }))}
          className={errors.termsAgreement ? 'border-destructive' : ''}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor="termsAgreement"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Ecosystem Terms Agreement *
          </Label>
          <p className="text-xs text-muted-foreground">
            I agree to the AnarQ&Q ecosystem terms and conditions for enterprise DAOs
          </p>
        </div>
      </div>
      {errors.termsAgreement && (
        <p className="text-sm text-destructive">{errors.termsAgreement}</p>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{metadata.companyName || 'Company Name'}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {metadata.description || 'No description provided'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{metadata.sector || 'No sector'}</Badge>
                {governance.parentDAO && (
                  <Badge variant="secondary">
                    Parent: {parentDAOs.find(dao => dao.id === governance.parentDAO)?.name || governance.parentDAO}
                  </Badge>
                )}
              </div>
            </div>
            {metadata.logoFile && (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
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
              <Vote className="h-4 w-4" />
              <span className="text-sm">{governance.votingMethod.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{governance.quorum}% Quorum</span>
            </div>
            <div className="flex items-center gap-2">
              {visibilityOptions.find(opt => opt.value === permissions.visibility)?.icon && (
                React.createElement(visibilityOptions.find(opt => opt.value === permissions.visibility)!.icon, { className: "h-4 w-4" })
              )}
              <span className="text-sm capitalize">{permissions.visibility}</span>
            </div>
          </div>

          {/* Token Info */}
          {accessTokens.tokenMinting.enabled && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Enterprise Token</h4>
              <div className="space-y-1 text-sm">
                <p>• Name: {accessTokens.tokenMinting.name}</p>
                <p>• Symbol: {accessTokens.tokenMinting.symbol}</p>
                <p>• Initial Supply: {accessTokens.tokenMinting.initialSupply.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Key Roles */}
          <div>
            <h4 className="font-medium mb-2">Key Roles</h4>
            <div className="space-y-1">
              {Object.entries(governance.roles).map(([role, address]) => (
                address && (
                  <div key={role} className="flex items-center gap-2 text-sm">
                    <Crown className="h-3 w-3" />
                    <span className="font-medium">{role}:</span>
                    <span className="font-mono text-xs">{address}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Files */}
          {(files.constitution || files.legalDocs.length > 0 || files.certificates.length > 0) && (
            <div>
              <h4 className="font-medium mb-2">Attached Files</h4>
              <div className="space-y-1 text-sm">
                {files.constitution && <p>• Constitution document uploaded</p>}
                {files.legalDocs.length > 0 && <p>• {files.legalDocs.length} legal documents uploaded</p>}
                {files.certificates.length > 0 && <p>• {files.certificates.length} certificates uploaded</p>}
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
          <h1 className="text-3xl font-bold">Create Enterprise DAO</h1>
          <p className="text-muted-foreground mt-2">
            Set up a new enterprise DAO with governance, access controls, and ecosystem integrations.
          </p>
        </div>
        <CreateEnterpriseDAOFormContent />
      </div>
    );
  }

  function CreateEnterpriseDAOFormContent() {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Create Enterprise DAO</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <Progress value={progress} className="w-20" />
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
          </div>
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
                  <Key className="h-4 w-4 mr-1" />
                  Access
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-xs">
                  <Shield className="h-4 w-4 mr-1" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs">
                  <Upload className="h-4 w-4 mr-1" />
                  Files
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="metadata">{renderMetadataTab()}</TabsContent>
                <TabsContent value="governance">{renderGovernanceTab()}</TabsContent>
                <TabsContent value="access">{renderAccessTokensTab()}</TabsContent>
                <TabsContent value="permissions">{renderPermissionsTab()}</TabsContent>
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
                disabled={submitting || !metadata.companyName.trim() || !isAuthenticated || !files.termsAgreement}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Enterprise DAO...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Enterprise DAO
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return <CreateEnterpriseDAOFormContent />;
};

export default CreateEnterpriseDAOForm;