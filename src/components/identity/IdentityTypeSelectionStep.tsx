/**
 * Identity Type Selection Step
 * First step of the subidentity creation wizard - allows users to select identity type with governance explanations
 * Requirements: 2.2, 2.11, 2.12, 2.13, 2.14
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Users, 
  Shield, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Lock,
  Globe,
  UserCheck,
  FileText
} from 'lucide-react';
import { IdentityType, ExtendedSquidIdentity, PrivacyLevel, GovernanceType } from '@/types/identity';
import { IDENTITY_TYPE_RULES } from '@/types/identity-constants';

// Props interface
export interface IdentityTypeSelectionStepProps {
  /** Available identity types for the current user */
  availableTypes: IdentityType[];
  /** Currently selected identity type */
  selectedType: IdentityType | null;
  /** Callback when a type is selected */
  onTypeSelect: (type: IdentityType) => void;
  /** Validation errors for type selection */
  validationErrors: string[];
  /** Current active identity */
  activeIdentity: ExtendedSquidIdentity | null;
}

// Identity type metadata for display
const IDENTITY_TYPE_METADATA = {
  [IdentityType.DAO]: {
    icon: Users,
    title: 'DAO Identity',
    subtitle: 'Decentralized Autonomous Organization',
    description: 'Create an identity for participating in DAO governance and collective decision-making.',
    features: [
      'Public visibility for transparency',
      'DAO governance and voting rights',
      'Can create Enterprise sub-identities',
      'Requires KYC verification',
      'Full ecosystem access'
    ],
    requirements: [
      'KYC verification required',
      'DAO governance approval needed',
      'Public profile visibility'
    ],
    governance: 'Governed by DAO rules and community decisions',
    privacy: 'Public profile with DAO-controlled privacy settings',
    useCases: [
      'DAO member participation',
      'Governance voting',
      'Community leadership',
      'Proposal creation and management'
    ],
    limitations: [
      'Public visibility required',
      'Subject to DAO governance rules',
      'KYC verification mandatory'
    ]
  },
  [IdentityType.ENTERPRISE]: {
    icon: Building2,
    title: 'Enterprise Identity',
    subtitle: 'Business and Professional Use',
    description: 'Create a professional identity for business activities and enterprise operations.',
    features: [
      'Professional business profile',
      'Enterprise-grade security',
      'DAO governance integration',
      'Public business visibility',
      'Professional networking'
    ],
    requirements: [
      'Must be created under DAO governance',
      'KYC verification through DAO',
      'Business registration may be required'
    ],
    governance: 'Governed by parent DAO with enterprise policies',
    privacy: 'Public business profile with controlled data sharing',
    useCases: [
      'Business operations',
      'Professional networking',
      'Enterprise transactions',
      'B2B communications'
    ],
    limitations: [
      'Cannot create sub-identities',
      'Must be linked to a DAO',
      'Public business profile required'
    ]
  },
  [IdentityType.CONSENTIDA]: {
    icon: Shield,
    title: 'Consentida Identity',
    subtitle: 'Protected Minor Identity',
    description: 'Create a protected identity for minors with parental controls and enhanced privacy.',
    features: [
      'Enhanced privacy protection',
      'Parental control integration',
      'Age-appropriate content filtering',
      'Limited ecosystem access',
      'Educational focus'
    ],
    requirements: [
      'Parental consent required',
      'Age verification needed',
      'Guardian signature collection'
    ],
    governance: 'Controlled by parent/guardian with safety restrictions',
    privacy: 'Maximum privacy with parental oversight',
    useCases: [
      'Educational activities',
      'Safe social interaction',
      'Learning and development',
      'Family communication'
    ],
    limitations: [
      'Cannot create sub-identities',
      'Limited module access',
      'Parental approval required for actions',
      'Age-restricted features'
    ]
  },
  [IdentityType.AID]: {
    icon: Eye,
    title: 'Anonymous Identity (AID)',
    subtitle: 'Anonymous and Private',
    description: 'Create a completely anonymous identity for privacy-focused activities.',
    features: [
      'Complete anonymity',
      'No linkable metadata',
      'Privacy-first design',
      'Secure communications',
      'Untraceable activities'
    ],
    requirements: [
      'Root identity must be KYC verified',
      'Enhanced security measures',
      'Anonymous key generation'
    ],
    governance: 'Self-governed with privacy-first policies',
    privacy: 'Maximum anonymity with no data collection',
    useCases: [
      'Anonymous communications',
      'Privacy-sensitive transactions',
      'Whistleblowing',
      'Research participation'
    ],
    limitations: [
      'Cannot create sub-identities',
      'Limited social features',
      'Requires verified root identity',
      'Some modules may be restricted'
    ]
  }
};

// Get privacy level color
const getPrivacyLevelColor = (level: PrivacyLevel): string => {
  switch (level) {
    case PrivacyLevel.PUBLIC:
      return 'bg-green-100 text-green-800 border-green-200';
    case PrivacyLevel.DAO_ONLY:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case PrivacyLevel.PRIVATE:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case PrivacyLevel.ANONYMOUS:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Get governance type color
const getGovernanceColor = (governance: GovernanceType): string => {
  switch (governance) {
    case GovernanceType.SELF:
      return 'bg-green-100 text-green-800';
    case GovernanceType.DAO:
      return 'bg-blue-100 text-blue-800';
    case GovernanceType.PARENT:
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const IdentityTypeSelectionStep: React.FC<IdentityTypeSelectionStepProps> = ({
  availableTypes,
  selectedType,
  onTypeSelect,
  validationErrors,
  activeIdentity
}) => {
  // Show error if no types available
  if (availableTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Identity Types Available</h3>
        <p className="text-muted-foreground mb-4">
          Your current identity type ({activeIdentity?.type}) cannot create sub-identities.
        </p>
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Only ROOT and DAO identities can create sub-identities. Contact your DAO administrator 
            if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Identity Type</h2>
        <p className="text-muted-foreground">
          Select the type of identity that best fits your needs. Each type has different 
          capabilities, governance rules, and privacy settings.
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Identity Type Cards */}
      <div className="grid gap-4">
        {availableTypes.map((type) => {
          const metadata = IDENTITY_TYPE_METADATA[type];
          const rules = IDENTITY_TYPE_RULES[type];
          const Icon = metadata.icon;
          const isSelected = selectedType === type;

          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onTypeSelect(type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTypeSelect(type);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`Select ${metadata.title} identity type`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{metadata.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{metadata.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {metadata.description}
                </p>

                {/* Governance and Privacy Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getPrivacyLevelColor(rules.visibility)}>
                    <Globe className="w-3 h-3 mr-1" />
                    {rules.visibility}
                  </Badge>
                  <Badge variant="outline" className={getGovernanceColor(rules.governedBy)}>
                    <Users className="w-3 h-3 mr-1" />
                    {rules.governedBy} Governed
                  </Badge>
                  {rules.kycRequired && (
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      <UserCheck className="w-3 h-3 mr-1" />
                      KYC Required
                    </Badge>
                  )}
                  {rules.canCreateSubidentities && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <FileText className="w-3 h-3 mr-1" />
                      Can Create Sub-IDs
                    </Badge>
                  )}
                </div>

                {/* Key Features */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Key Features
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {metadata.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-current rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Requirements
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {metadata.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-current rounded-full" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Governance Explanation */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Governance & Privacy
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Governance:</strong> {metadata.governance}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Privacy:</strong> {metadata.privacy}
                  </p>
                </div>

                {/* Use Cases (collapsed by default, shown when selected) */}
                {isSelected && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Common Use Cases</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {metadata.useCases.map((useCase, index) => (
                            <div key={index} className="text-xs bg-muted/30 px-2 py-1 rounded">
                              {useCase}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Limitations</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {metadata.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-red-400 rounded-full" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Text */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Need help choosing?</strong> Consider your primary use case:
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>DAO:</strong> For community participation and governance</li>
            <li>• <strong>Enterprise:</strong> For business and professional activities</li>
            <li>• <strong>Consentida:</strong> For minors with parental oversight</li>
            <li>• <strong>AID:</strong> For anonymous and private activities</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default IdentityTypeSelectionStep;