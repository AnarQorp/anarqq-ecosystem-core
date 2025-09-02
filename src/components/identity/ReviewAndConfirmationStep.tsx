/**
 * Review and Confirmation Step
 * Final step of the subidentity creation wizard - comprehensive review interface with validation and submission
 * Requirements: 2.7, 2.8, 2.9, 2.10
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  User, 
  Shield, 
  Eye, 
  Settings, 
  FileText,
  Building2,
  Users,
  Globe,
  Lock,
  Tag,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';
import { IdentityType, SubidentityMetadata, ExtendedSquidIdentity, PrivacyLevel } from '@/types/identity';
import { IDENTITY_TYPE_RULES } from '@/types/identity-constants';
import { useToast } from '@/hooks/use-toast';

// Component Props
export interface ReviewAndConfirmationStepProps {
  /** Selected identity type */
  selectedType: IdentityType;
  /** Form data from all previous steps */
  formData: Partial<SubidentityMetadata>;
  /** Validation errors */
  validationErrors: Record<string, string[]>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Current active identity */
  activeIdentity: ExtendedSquidIdentity | null;
  /** Callback to submit the form */
  onSubmit: () => Promise<void>;
}

// Identity Type Display Configuration
const IDENTITY_TYPE_DISPLAY = {
  [IdentityType.ROOT]: {
    icon: User,
    name: 'Root Identity',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [IdentityType.DAO]: {
    icon: Users,
    name: 'DAO Identity',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  [IdentityType.ENTERPRISE]: {
    icon: Building2,
    name: 'Enterprise Identity',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  [IdentityType.CONSENTIDA]: {
    icon: Shield,
    name: 'Consentida Identity',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  [IdentityType.AID]: {
    icon: Eye,
    name: 'Anonymous Identity (AID)',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
};

// Privacy Level Display Configuration
const PRIVACY_LEVEL_DISPLAY = {
  [PrivacyLevel.PUBLIC]: {
    icon: Globe,
    name: 'Public',
    color: 'text-green-600',
    description: 'Visible to all users'
  },
  [PrivacyLevel.DAO_ONLY]: {
    icon: Users,
    name: 'DAO Members Only',
    color: 'text-blue-600',
    description: 'Visible to DAO members only'
  },
  [PrivacyLevel.PRIVATE]: {
    icon: Lock,
    name: 'Private',
    color: 'text-orange-600',
    description: 'Visible to approved contacts only'
  },
  [PrivacyLevel.ANONYMOUS]: {
    icon: Eye,
    name: 'Anonymous',
    color: 'text-red-600',
    description: 'Completely anonymous'
  }
};

// Review Section Component
interface ReviewSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  error?: string[];
  className?: string;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ 
  title, 
  icon, 
  children, 
  error, 
  className = '' 
}) => (
  <Card className={`${error && error.length > 0 ? 'border-destructive' : ''} ${className}`}>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        {icon}
        {title}
        {error && error.length > 0 && (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {children}
      {error && error.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {error.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </CardContent>
  </Card>
);

// Detail Row Component
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="text-sm font-medium text-right max-w-[60%]">
      {value}
    </div>
  </div>
);

export const ReviewAndConfirmationStep: React.FC<ReviewAndConfirmationStepProps> = ({
  selectedType,
  formData,
  validationErrors,
  isSubmitting,
  activeIdentity,
  onSubmit
}) => {
  const { toast } = useToast();
  const [finalValidationErrors, setFinalValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Get display configuration for the selected type
  const typeDisplay = IDENTITY_TYPE_DISPLAY[selectedType];
  const typeRules = IDENTITY_TYPE_RULES[selectedType];
  const TypeIcon = typeDisplay.icon;

  // Get privacy level display
  const privacyDisplay = formData.privacyLevel ? PRIVACY_LEVEL_DISPLAY[formData.privacyLevel] : null;

  // Perform final validation
  const performFinalValidation = useCallback((): string[] => {
    const errors: string[] = [];

    // Validate required fields
    if (!formData.name?.trim()) {
      errors.push('Identity name is required');
    }

    if (!formData.privacyLevel) {
      errors.push('Privacy level must be selected');
    }

    // Validate governance requirements
    if (typeRules.governedBy === 'DAO' && !formData.governanceConfig?.daoId) {
      errors.push('DAO governance is required for this identity type');
    }

    if (typeRules.governedBy === 'PARENT' && !formData.governanceConfig?.parentalConsent?.consentDate) {
      errors.push('Parental consent must be collected before creating this identity');
    }

    // Validate Qonsent configuration
    if (!formData.qonsentConfig?.profileId) {
      errors.push('Privacy profile configuration is incomplete');
    }

    // Validate KYC requirements
    if (typeRules.kycRequired && !activeIdentity?.kyc.approved) {
      errors.push('KYC verification is required for this identity type');
    }

    return errors;
  }, [formData, typeRules, activeIdentity]);

  // Run final validation on mount and when data changes
  useEffect(() => {
    setIsValidating(true);
    const timer = setTimeout(() => {
      const errors = performFinalValidation();
      setFinalValidationErrors(errors);
      setIsValidating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [performFinalValidation]);

  // Handle submission with final validation
  const handleSubmit = useCallback(async () => {
    const errors = performFinalValidation();
    if (errors.length > 0) {
      setFinalValidationErrors(errors);
      toast({
        title: "Validation Failed",
        description: "Please fix the validation errors before proceeding.",
        variant: "destructive"
      });
      return;
    }

    await onSubmit();
  }, [performFinalValidation, onSubmit, toast]);

  // Copy configuration to clipboard
  const copyConfiguration = useCallback(async () => {
    const config = {
      type: selectedType,
      name: formData.name,
      description: formData.description,
      privacyLevel: formData.privacyLevel,
      tags: formData.tags,
      governance: formData.governanceConfig,
      qonsent: formData.qonsentConfig
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast({
        title: "Configuration Copied",
        description: "Identity configuration has been copied to clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy configuration:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy configuration to clipboard.",
        variant: "destructive"
      });
    }
  }, [selectedType, formData, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-full ${typeDisplay.bgColor}`}>
            <TypeIcon className={`w-6 h-6 ${typeDisplay.color}`} />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
        <p className="text-muted-foreground">
          Please review all settings before creating your {typeDisplay.name.toLowerCase()}
        </p>
      </div>

      {/* Final Validation Status */}
      {isValidating ? (
        <Alert>
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>
            Performing final validation...
          </AlertDescription>
        </Alert>
      ) : finalValidationErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Validation Errors:</strong>
            <ul className="mt-2 space-y-1">
              {finalValidationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            All validation checks passed. Ready to create identity.
          </AlertDescription>
        </Alert>
      )}

      {/* Identity Type & Basic Information */}
      <ReviewSection
        title="Identity Type & Basic Information"
        icon={<User className="w-5 h-5" />}
        error={[...validationErrors.type || [], ...validationErrors.name || [], ...validationErrors.description || []]}
      >
        <DetailRow
          label="Identity Type"
          value={
            <Badge className={`${typeDisplay.bgColor} ${typeDisplay.color} border-0`}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeDisplay.name}
            </Badge>
          }
          icon={<TypeIcon className="w-4 h-4" />}
        />
        
        <DetailRow
          label="Name"
          value={formData.name || 'Not specified'}
          icon={<FileText className="w-4 h-4" />}
        />
        
        {formData.description && (
          <DetailRow
            label="Description"
            value={
              <div className="text-right">
                <p className="text-sm">{formData.description}</p>
              </div>
            }
            icon={<FileText className="w-4 h-4" />}
          />
        )}
        
        {formData.tags && formData.tags.length > 0 && (
          <DetailRow
            label="Tags"
            value={
              <div className="flex flex-wrap gap-1 justify-end">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-2 h-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            }
            icon={<Tag className="w-4 h-4" />}
          />
        )}

        <DetailRow
          label="Created By"
          value={activeIdentity?.name || 'Current Identity'}
          icon={<User className="w-4 h-4" />}
        />

        <DetailRow
          label="Creation Date"
          value={new Date().toLocaleDateString()}
          icon={<Calendar className="w-4 h-4" />}
        />
      </ReviewSection>

      {/* Governance Configuration */}
      {(formData.governanceConfig?.daoId || formData.governanceConfig?.parentalConsent) && (
        <ReviewSection
          title="Governance Configuration"
          icon={<Settings className="w-5 h-5" />}
          error={validationErrors.governance}
        >
          {formData.governanceConfig.daoId && (
            <>
              <DetailRow
                label="Governance Type"
                value={
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    <Building2 className="w-3 h-3 mr-1" />
                    DAO Governed
                  </Badge>
                }
                icon={<Building2 className="w-4 h-4" />}
              />
              <DetailRow
                label="Governing DAO"
                value={formData.governanceConfig.daoId}
                icon={<Users className="w-4 h-4" />}
              />
            </>
          )}

          {formData.governanceConfig.parentalConsent && (
            <>
              <DetailRow
                label="Governance Type"
                value={
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Parental Control
                  </Badge>
                }
                icon={<Shield className="w-4 h-4" />}
              />
              <DetailRow
                label="Guardian Name"
                value={formData.governanceConfig.parentalConsent.guardianName}
                icon={<User className="w-4 h-4" />}
              />
              <DetailRow
                label="Guardian Email"
                value={formData.governanceConfig.parentalConsent.guardianEmail}
                icon={<Mail className="w-4 h-4" />}
              />
              {formData.governanceConfig.parentalConsent.guardianPhone && (
                <DetailRow
                  label="Guardian Phone"
                  value={formData.governanceConfig.parentalConsent.guardianPhone}
                  icon={<Phone className="w-4 h-4" />}
                />
              )}
              <DetailRow
                label="Relationship"
                value={formData.governanceConfig.parentalConsent.relationship}
                icon={<Users className="w-4 h-4" />}
              />
              <DetailRow
                label="Consent Status"
                value={
                  formData.governanceConfig.parentalConsent.consentDate ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )
                }
                icon={<Shield className="w-4 h-4" />}
              />
            </>
          )}
        </ReviewSection>
      )}

      {/* Privacy Configuration */}
      <ReviewSection
        title="Privacy Configuration"
        icon={<Shield className="w-5 h-5" />}
        error={validationErrors.qonsent}
      >
        {privacyDisplay && (
          <DetailRow
            label="Privacy Level"
            value={
              <Badge variant="outline" className={`${privacyDisplay.color}`}>
                <privacyDisplay.icon className="w-3 h-3 mr-1" />
                {privacyDisplay.name}
              </Badge>
            }
            icon={<privacyDisplay.icon className="w-4 h-4" />}
          />
        )}

        <DetailRow
          label="Profile Visibility"
          value={formData.qonsentConfig?.visibilityRules?.profile || 'Not configured'}
          icon={<Eye className="w-4 h-4" />}
        />

        <DetailRow
          label="Activity Visibility"
          value={formData.qonsentConfig?.visibilityRules?.activity || 'Not configured'}
          icon={<Eye className="w-4 h-4" />}
        />

        {formData.qonsentConfig?.dataSharing && (
          <DetailRow
            label="Data Sharing"
            value={
              <div className="text-right">
                <div className="flex flex-wrap gap-1 justify-end">
                  {Object.entries(formData.qonsentConfig.dataSharing)
                    .filter(([_, config]) => config.enabled)
                    .map(([module, _]) => (
                      <Badge key={module} variant="outline" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                </div>
              </div>
            }
            icon={<Settings className="w-4 h-4" />}
          />
        )}

        <DetailRow
          label="Qonsent Profile ID"
          value={
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {formData.qonsentConfig?.profileId?.slice(0, 16)}...
              </code>
            </div>
          }
          icon={<FileText className="w-4 h-4" />}
        />
      </ReviewSection>

      {/* Requirements & Compliance */}
      <ReviewSection
        title="Requirements & Compliance"
        icon={<CheckCircle className="w-5 h-5" />}
      >
        <DetailRow
          label="KYC Required"
          value={
            typeRules.kycRequired ? (
              activeIdentity?.kyc.approved ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Required
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Not Required
              </Badge>
            )
          }
          icon={<Shield className="w-4 h-4" />}
        />

        <DetailRow
          label="Can Create Sub-identities"
          value={
            typeRules.canCreateSubidentities ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Yes
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                No
              </Badge>
            )
          }
          icon={<Users className="w-4 h-4" />}
        />

        <DetailRow
          label="Default Visibility"
          value={
            <Badge variant="outline">
              {typeRules.visibility}
            </Badge>
          }
          icon={<Eye className="w-4 h-4" />}
        />

        <DetailRow
          label="Governance Model"
          value={
            <Badge variant="outline">
              {typeRules.governedBy}
            </Badge>
          }
          icon={<Settings className="w-4 h-4" />}
        />
      </ReviewSection>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={copyConfiguration}
          disabled={isSubmitting}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Configuration
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/docs/identity-creation', '_blank')}
            disabled={isSubmitting}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Documentation
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || finalValidationErrors.length > 0}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Identity
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Final Confirmation */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Important:</strong> Once created, some identity settings cannot be changed. 
          Please ensure all information is correct before proceeding. The identity will be 
          registered in IPFS and indexed in Qindex for discoverability.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ReviewAndConfirmationStep;