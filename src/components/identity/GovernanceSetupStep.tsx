/**
 * Governance Setup Step
 * Third step of the subidentity creation wizard - handles DAO linking and parental consent
 * Requirements: 2.6, 2.12, 2.13
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Users, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Search,
  Link,
  FileSignature,
  UserCheck,
  Clock,
  ExternalLink,
  Copy,
  Mail,
  Phone
} from 'lucide-react';
import { IdentityType, SubidentityMetadata, ExtendedSquidIdentity } from '@/types/identity';
import { IDENTITY_TYPE_RULES } from '@/types/identity-constants';
import { useToast } from '@/hooks/use-toast';

// DAO Information Interface
export interface DAOInfo {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  governanceType: 'DEMOCRATIC' | 'DELEGATED' | 'CONSENSUS';
  isVerified: boolean;
  allowsEnterpriseCreation: boolean;
  website?: string;
  logo?: string;
}

// Parental Consent Interface
export interface ParentalConsent {
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
  relationship: 'PARENT' | 'GUARDIAN' | 'OTHER';
  consentStatement: string;
  signatureMethod: 'EMAIL' | 'DIGITAL' | 'PHYSICAL';
  signatureData?: string;
  consentDate?: string;
  isVerified: boolean;
}

// Governance Configuration Interface
export interface GovernanceConfig {
  type: 'DAO' | 'PARENTAL' | 'NONE';
  daoId?: string;
  daoInfo?: DAOInfo;
  parentalConsent?: ParentalConsent;
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
}

// Props interface
export interface GovernanceSetupStepProps {
  /** Selected identity type from previous step */
  selectedType: IdentityType;
  /** Current form data */
  formData: Partial<SubidentityMetadata>;
  /** Callback when form data changes */
  onFormDataChange: (data: Partial<SubidentityMetadata>) => void;
  /** Validation errors */
  validationErrors: Record<string, string[]>;
  /** Whether the form is being submitted */
  isSubmitting?: boolean;
  /** Current active identity */
  activeIdentity: ExtendedSquidIdentity | null;
}

// Mock DAO data for development
const MOCK_DAOS: DAOInfo[] = [
  {
    id: 'dao-tech-collective',
    name: 'Tech Collective DAO',
    description: 'A decentralized organization focused on technology innovation and development.',
    memberCount: 1247,
    governanceType: 'DEMOCRATIC',
    isVerified: true,
    allowsEnterpriseCreation: true,
    website: 'https://techcollective.dao',
    logo: '🏢'
  },
  {
    id: 'dao-creative-commons',
    name: 'Creative Commons DAO',
    description: 'Supporting creative professionals and open-source projects.',
    memberCount: 892,
    governanceType: 'CONSENSUS',
    isVerified: true,
    allowsEnterpriseCreation: false,
    website: 'https://creativecommons.dao',
    logo: '🎨'
  },
  {
    id: 'dao-sustainability',
    name: 'Sustainability Initiative DAO',
    description: 'Environmental and sustainability-focused decentralized organization.',
    memberCount: 2156,
    governanceType: 'DELEGATED',
    isVerified: true,
    allowsEnterpriseCreation: true,
    website: 'https://sustainability.dao',
    logo: '🌱'
  }
];

// DAO Search Component
interface DAOSearchProps {
  onDAOSelect: (dao: DAOInfo) => void;
  selectedDAO?: DAOInfo;
  identityType: IdentityType;
  disabled?: boolean;
}

const DAOSearch: React.FC<DAOSearchProps> = ({
  onDAOSelect,
  selectedDAO,
  identityType,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DAOInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter DAOs based on identity type requirements
  const getFilteredDAOs = useCallback((query: string): DAOInfo[] => {
    let filteredDAOs = MOCK_DAOS;

    // For Enterprise identities, only show DAOs that allow enterprise creation
    if (identityType === IdentityType.ENTERPRISE) {
      filteredDAOs = filteredDAOs.filter(dao => dao.allowsEnterpriseCreation);
    }

    // Apply search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filteredDAOs = filteredDAOs.filter(dao =>
        dao.name.toLowerCase().includes(lowerQuery) ||
        dao.description.toLowerCase().includes(lowerQuery)
      );
    }

    return filteredDAOs;
  }, [identityType]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const results = getFilteredDAOs(query);
    setSearchResults(results);
    setIsSearching(false);
  }, [getFilteredDAOs]);

  // Initialize with all available DAOs
  useEffect(() => {
    setSearchResults(getFilteredDAOs(''));
  }, [getFilteredDAOs]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search for DAO</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search DAOs by name or description..."
            className="pl-10"
            disabled={disabled}
          />
        </div>
      </div>

      {selectedDAO && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selectedDAO.logo}</div>
                <div>
                  <CardTitle className="text-lg">{selectedDAO.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedDAO.memberCount.toLocaleString()} members
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedDAO.governanceType}
                    </Badge>
                    {selectedDAO.isVerified && (
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDAOSelect(selectedDAO)}
                disabled={disabled}
              >
                Change
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {selectedDAO.description}
            </p>
            {selectedDAO.website && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <a
                  href={selectedDAO.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {selectedDAO.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedDAO && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Searching DAOs...</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((dao) => (
              <Card
                key={dao.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => !disabled && onDAOSelect(dao)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!disabled) onDAOSelect(dao);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select ${dao.name} DAO`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">{dao.logo}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{dao.name}</h4>
                        <div className="flex items-center gap-1">
                          {dao.isVerified && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {identityType === IdentityType.ENTERPRISE && !dao.allowsEnterpriseCreation && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {dao.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {dao.memberCount.toLocaleString()} members
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {dao.governanceType}
                        </Badge>
                        {identityType === IdentityType.ENTERPRISE && dao.allowsEnterpriseCreation && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                            Enterprise Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No DAOs Found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No DAOs match "${searchQuery}"`
                  : 'No DAOs available for this identity type'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Parental Consent Component
interface ParentalConsentFormProps {
  consent: Partial<ParentalConsent>;
  onConsentChange: (consent: Partial<ParentalConsent>) => void;
  validationErrors: Record<string, string[]>;
  disabled?: boolean;
}

const ParentalConsentForm: React.FC<ParentalConsentFormProps> = ({
  consent,
  onConsentChange,
  validationErrors,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isCollectingSignature, setIsCollectingSignature] = useState(false);

  const handleFieldChange = useCallback((field: keyof ParentalConsent, value: any) => {
    onConsentChange({
      ...consent,
      [field]: value
    });
  }, [consent, onConsentChange]);

  const handleSendConsentRequest = useCallback(async () => {
    if (!consent.guardianEmail || !consent.guardianName) {
      toast({
        title: "Missing Information",
        description: "Please provide guardian name and email before sending consent request.",
        variant: "destructive"
      });
      return;
    }

    setIsCollectingSignature(true);

    try {
      // Simulate sending consent request
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate consent link for demo
      const consentLink = `https://squid.consent/verify/${Date.now()}`;
      
      onConsentChange({
        ...consent,
        signatureMethod: 'EMAIL',
        consentDate: new Date().toISOString(),
        isVerified: false
      });

      toast({
        title: "Consent Request Sent",
        description: `A consent request has been sent to ${consent.guardianEmail}. They will receive an email with instructions to provide digital consent.`,
      });

      // Copy link to clipboard for demo
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(consentLink);
        toast({
          title: "Consent Link Copied",
          description: "The consent verification link has been copied to your clipboard.",
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send consent request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCollectingSignature(false);
    }
  }, [consent, onConsentChange, toast]);

  const getFieldError = useCallback((field: string): string[] => {
    return validationErrors[field] || [];
  }, [validationErrors]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Parental Consent Required</h3>
        <p className="text-muted-foreground">
          Creating a Consentida identity requires parental or guardian consent. 
          Please provide guardian information to proceed.
        </p>
      </div>

      <div className="space-y-4">
        {/* Guardian Name */}
        <div className="space-y-2">
          <Label htmlFor="guardian-name">Guardian Name *</Label>
          <Input
            id="guardian-name"
            value={consent.guardianName || ''}
            onChange={(e) => handleFieldChange('guardianName', e.target.value)}
            placeholder="Enter guardian's full name"
            disabled={disabled}
            className={getFieldError('guardianName').length > 0 ? 'border-destructive' : ''}
          />
          {getFieldError('guardianName').map((error, index) => (
            <p key={index} className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          ))}
        </div>

        {/* Guardian Email */}
        <div className="space-y-2">
          <Label htmlFor="guardian-email">Guardian Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="guardian-email"
              type="email"
              value={consent.guardianEmail || ''}
              onChange={(e) => handleFieldChange('guardianEmail', e.target.value)}
              placeholder="guardian@example.com"
              className={`pl-10 ${getFieldError('guardianEmail').length > 0 ? 'border-destructive' : ''}`}
              disabled={disabled}
            />
          </div>
          {getFieldError('guardianEmail').map((error, index) => (
            <p key={index} className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          ))}
        </div>

        {/* Guardian Phone (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="guardian-phone">Guardian Phone (Optional)</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="guardian-phone"
              type="tel"
              value={consent.guardianPhone || ''}
              onChange={(e) => handleFieldChange('guardianPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="pl-10"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label>Relationship to Minor *</Label>
          <div className="flex gap-2">
            {(['PARENT', 'GUARDIAN', 'OTHER'] as const).map((relationship) => (
              <Button
                key={relationship}
                type="button"
                variant={consent.relationship === relationship ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFieldChange('relationship', relationship)}
                disabled={disabled}
              >
                {relationship.charAt(0) + relationship.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
          {getFieldError('relationship').map((error, index) => (
            <p key={index} className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          ))}
        </div>

        {/* Consent Statement */}
        <div className="space-y-2">
          <Label htmlFor="consent-statement">Consent Statement</Label>
          <Textarea
            id="consent-statement"
            value={consent.consentStatement || `I, ${consent.guardianName || '[Guardian Name]'}, as the ${(consent.relationship || 'parent').toLowerCase()} of the minor, hereby provide consent for the creation of a Consentida identity within the sQuid ecosystem. I understand that this identity will have enhanced privacy protections and parental controls, and I agree to oversee its usage according to the platform's terms of service.`}
            onChange={(e) => handleFieldChange('consentStatement', e.target.value)}
            placeholder="Consent statement will be auto-generated based on the information provided"
            rows={4}
            disabled={disabled}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This statement will be included in the consent request sent to the guardian.
          </p>
        </div>

        <Separator />

        {/* Consent Collection */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            Consent Collection
          </h4>

          {!consent.consentDate ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click the button below to send a consent request to the guardian's email. 
                They will receive a secure link to provide digital consent.
              </p>
              <Button
                onClick={handleSendConsentRequest}
                disabled={disabled || isCollectingSignature || !consent.guardianEmail || !consent.guardianName}
                className="w-full"
              >
                {isCollectingSignature ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending Consent Request...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Consent Request
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert>
                <Clock className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Consent request sent</strong> to {consent.guardianEmail} on{' '}
                      {new Date(consent.consentDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm">
                      Status: {consent.isVerified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Verification
                        </Badge>
                      )}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {!consent.isVerified && (
                <Button
                  variant="outline"
                  onClick={handleSendConsentRequest}
                  disabled={disabled || isCollectingSignature}
                  className="w-full"
                >
                  Resend Consent Request
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const GovernanceSetupStep: React.FC<GovernanceSetupStepProps> = ({
  selectedType,
  formData,
  onFormDataChange,
  validationErrors,
  isSubmitting = false,
  activeIdentity
}) => {
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig>(() => {
    const existing = formData.governanceConfig;
    if (existing) {
      // Find DAO info if daoId is provided
      let daoInfo: DAOInfo | undefined;
      if (existing.daoId) {
        daoInfo = MOCK_DAOS.find(dao => dao.id === existing.daoId);
      }

      return {
        type: existing.daoId ? 'DAO' : existing.parentalConsent ? 'PARENTAL' : 'NONE',
        daoId: existing.daoId,
        daoInfo,
        parentalConsent: existing.parentalConsent,
        requiresApproval: Boolean(existing.daoId || existing.parentalConsent),
        approvalStatus: existing.parentalConsent?.isVerified ? 'APPROVED' : 'PENDING'
      };
    }

    // Determine governance type based on identity type
    const rules = IDENTITY_TYPE_RULES[selectedType];
    if (rules.governedBy === 'DAO') {
      return {
        type: 'DAO',
        requiresApproval: true,
        approvalStatus: 'PENDING'
      };
    } else if (rules.governedBy === 'PARENT') {
      return {
        type: 'PARENTAL',
        requiresApproval: true,
        approvalStatus: 'PENDING'
      };
    }

    return {
      type: 'NONE',
      requiresApproval: false,
      approvalStatus: 'NOT_REQUIRED'
    };
  });

  // Update form data when governance config changes
  useEffect(() => {
    const config: any = {};
    
    if (governanceConfig.daoId) {
      config.daoId = governanceConfig.daoId;
    }
    
    if (governanceConfig.parentalConsent) {
      config.parentalConsent = governanceConfig.parentalConsent;
    }

    onFormDataChange({
      ...formData,
      governanceConfig: config
    });
  }, [governanceConfig, formData, onFormDataChange]);

  const handleDAOSelect = useCallback((dao: DAOInfo) => {
    setGovernanceConfig(prev => ({
      ...prev,
      daoId: dao.id,
      daoInfo: dao,
      approvalStatus: 'PENDING'
    }));
  }, []);

  const handleParentalConsentChange = useCallback((consent: Partial<ParentalConsent>) => {
    setGovernanceConfig(prev => ({
      ...prev,
      parentalConsent: { ...prev.parentalConsent, ...consent } as ParentalConsent,
      approvalStatus: consent.isVerified ? 'APPROVED' : 'PENDING'
    }));
  }, []);

  // Don't show governance setup for types that don't require it
  if (governanceConfig.type === 'NONE') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Governance Required</h3>
        <p className="text-muted-foreground">
          This identity type ({selectedType}) does not require additional governance setup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Governance Setup</h2>
        <p className="text-muted-foreground">
          Configure governance and approval requirements for your {selectedType.toLowerCase()} identity.
        </p>
      </div>

      {/* DAO Governance */}
      {governanceConfig.type === 'DAO' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">DAO Governance</h3>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              {selectedType === IdentityType.DAO ? (
                <>
                  <strong>DAO Identity:</strong> This identity will be governed by DAO rules and community decisions. 
                  You'll need to link to an existing DAO that will oversee this identity's operations.
                </>
              ) : (
                <>
                  <strong>Enterprise Identity:</strong> This identity must be created under a DAO that allows 
                  enterprise identity creation. The DAO will govern business operations and compliance.
                </>
              )}
            </AlertDescription>
          </Alert>

          <DAOSearch
            onDAOSelect={handleDAOSelect}
            selectedDAO={governanceConfig.daoInfo}
            identityType={selectedType}
            disabled={isSubmitting}
          />

          {governanceConfig.daoInfo && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Governance Approval:</strong> Once you create this identity, it will be subject to 
                the governance rules of {governanceConfig.daoInfo.name}. The DAO may need to approve 
                certain actions or changes to this identity.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Parental Governance */}
      {governanceConfig.type === 'PARENTAL' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Parental Governance</h3>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Consentida Identity:</strong> This identity type is designed for minors and requires 
              parental or guardian consent. The guardian will have oversight and control over this identity's 
              activities and privacy settings.
            </AlertDescription>
          </Alert>

          <ParentalConsentForm
            consent={governanceConfig.parentalConsent || {}}
            onConsentChange={handleParentalConsentChange}
            validationErrors={validationErrors}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.governance && validationErrors.governance.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.governance.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {(governanceConfig.daoInfo || governanceConfig.parentalConsent) && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Governance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {governanceConfig.daoInfo && (
              <div>
                <p className="text-sm font-medium">Governing DAO:</p>
                <p className="text-sm text-muted-foreground">{governanceConfig.daoInfo.name}</p>
              </div>
            )}
            
            {governanceConfig.parentalConsent && (
              <div>
                <p className="text-sm font-medium">Guardian:</p>
                <p className="text-sm text-muted-foreground">
                  {governanceConfig.parentalConsent.guardianName} ({governanceConfig.parentalConsent.guardianEmail})
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Approval Status:</p>
              <Badge 
                variant="outline" 
                className={
                  governanceConfig.approvalStatus === 'APPROVED' 
                    ? 'bg-green-100 text-green-800'
                    : governanceConfig.approvalStatus === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {governanceConfig.approvalStatus === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                {governanceConfig.approvalStatus === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                {governanceConfig.approvalStatus.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GovernanceSetupStep;