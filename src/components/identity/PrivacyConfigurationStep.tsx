/**
 * Privacy Configuration Step
 * Step 4 of the Subidentity Creation Wizard - Configure privacy and Qonsent settings
 * Requirements: 2.5, 3.4
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Globe, 
  Users, 
  UserCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  Settings,
  FileText
} from 'lucide-react';
import { IdentityType, PrivacyLevel, SubidentityMetadata, ExtendedSquidIdentity } from '@/types/identity';
import { IDENTITY_TYPE_RULES } from '@/types/identity-constants';
import { QonsentSettings, IdentityExposureLevel } from '@/types/qonsent';
import { useQonsent } from '@/hooks/useQonsent';

// Privacy Level Configuration
interface PrivacyLevelConfig {
  level: PrivacyLevel;
  exposureLevel: IdentityExposureLevel;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  restrictions: string[];
  color: string;
}

const PRIVACY_LEVELS: PrivacyLevelConfig[] = [
  {
    level: PrivacyLevel.PUBLIC,
    exposureLevel: IdentityExposureLevel.HIGH,
    name: 'Public',
    description: 'Maximum visibility and data sharing',
    icon: <Globe className="w-4 h-4" />,
    features: [
      'Profile visible to all users',
      'Activity publicly searchable',
      'Full ecosystem integration',
      'Enhanced discovery features'
    ],
    restrictions: [
      'Limited privacy controls',
      'Data may be indexed publicly'
    ],
    color: 'text-green-600'
  },
  {
    level: PrivacyLevel.DAO_ONLY,
    exposureLevel: IdentityExposureLevel.MEDIUM,
    name: 'DAO Members Only',
    description: 'Visible only to DAO members and verified contacts',
    icon: <Users className="w-4 h-4" />,
    features: [
      'Profile visible to DAO members',
      'Activity visible to verified contacts',
      'Selective ecosystem integration',
      'Controlled discovery'
    ],
    restrictions: [
      'Limited public visibility',
      'Requires DAO membership verification'
    ],
    color: 'text-blue-600'
  },
  {
    level: PrivacyLevel.PRIVATE,
    exposureLevel: IdentityExposureLevel.LOW,
    name: 'Private',
    description: 'Minimal visibility with enhanced privacy controls',
    icon: <Eye className="w-4 h-4" />,
    features: [
      'Profile visible to approved contacts only',
      'Activity not publicly searchable',
      'Minimal ecosystem integration',
      'Manual contact approval required'
    ],
    restrictions: [
      'Limited discoverability',
      'Reduced ecosystem features'
    ],
    color: 'text-orange-600'
  },
  {
    level: PrivacyLevel.ANONYMOUS,
    exposureLevel: IdentityExposureLevel.ANONYMOUS,
    name: 'Anonymous',
    description: 'Maximum privacy with anonymous operation',
    icon: <EyeOff className="w-4 h-4" />,
    features: [
      'Complete anonymity',
      'No profile visibility',
      'Encrypted communications only',
      'Zero-knowledge interactions'
    ],
    restrictions: [
      'No public profile',
      'Limited ecosystem features',
      'Cannot be discovered by others'
    ],
    color: 'text-red-600'
  }
];

// Module Sharing Configuration
interface ModuleSharingConfig {
  module: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultEnabled: boolean;
  requiredForTypes: IdentityType[];
}

const MODULE_SHARING_CONFIG: ModuleSharingConfig[] = [
  {
    module: 'qsocial',
    name: 'QSocial',
    description: 'Social interactions and content sharing',
    icon: <Users className="w-4 h-4" />,
    defaultEnabled: true,
    requiredForTypes: [IdentityType.DAO, IdentityType.ENTERPRISE]
  },
  {
    module: 'qwallet',
    name: 'QWallet',
    description: 'Wallet transactions and financial data',
    icon: <Lock className="w-4 h-4" />,
    defaultEnabled: false,
    requiredForTypes: [IdentityType.DAO, IdentityType.ENTERPRISE]
  },
  {
    module: 'qindex',
    name: 'QIndex',
    description: 'Search indexing and discovery',
    icon: <Globe className="w-4 h-4" />,
    defaultEnabled: true,
    requiredForTypes: [IdentityType.DAO, IdentityType.ENTERPRISE]
  },
  {
    module: 'qerberos',
    name: 'Qerberos',
    description: 'Audit logging and security monitoring',
    icon: <Shield className="w-4 h-4" />,
    defaultEnabled: true,
    requiredForTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE]
  }
];

// Component Props
export interface PrivacyConfigurationStepProps {
  selectedType: IdentityType;
  formData: Partial<SubidentityMetadata>;
  onFormDataChange: (data: Partial<SubidentityMetadata>) => void;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  activeIdentity: ExtendedSquidIdentity | null;
}

export const PrivacyConfigurationStep: React.FC<PrivacyConfigurationStepProps> = ({
  selectedType,
  formData,
  onFormDataChange,
  validationErrors,
  isSubmitting,
  activeIdentity
}) => {
  const { settings: qonsentSettings, updateSettings } = useQonsent();
  
  // Local state for privacy configuration
  const [selectedPrivacyLevel, setSelectedPrivacyLevel] = useState<PrivacyLevel>(
    formData.privacyLevel || IDENTITY_TYPE_RULES[selectedType].visibility
  );
  const [moduleSharing, setModuleSharing] = useState<Record<string, boolean>>(() => {
    const defaultSharing: Record<string, boolean> = {};
    MODULE_SHARING_CONFIG.forEach(config => {
      defaultSharing[config.module] = config.defaultEnabled || config.requiredForTypes.includes(selectedType);
    });
    return formData.qonsentConfig?.dataSharing ? 
      Object.fromEntries(
        Object.entries(formData.qonsentConfig.dataSharing).map(([key, value]) => [key, value.enabled])
      ) : defaultSharing;
  });
  const [useQmask, setUseQmask] = useState(formData.qonsentConfig?.visibilityRules?.profile === PrivacyLevel.ANONYMOUS);
  const [customPolicyText, setCustomPolicyText] = useState('');

  // Get the type rules for the selected identity type
  const typeRules = IDENTITY_TYPE_RULES[selectedType];
  
  // Get available privacy levels based on identity type
  const getAvailablePrivacyLevels = useCallback((): PrivacyLevelConfig[] => {
    switch (selectedType) {
      case IdentityType.ROOT:
        return PRIVACY_LEVELS.filter(level => level.level !== PrivacyLevel.ANONYMOUS);
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return PRIVACY_LEVELS.filter(level => 
          level.level === PrivacyLevel.PUBLIC || level.level === PrivacyLevel.DAO_ONLY
        );
      case IdentityType.CONSENTIDA:
        return PRIVACY_LEVELS.filter(level => 
          level.level === PrivacyLevel.PRIVATE || level.level === PrivacyLevel.DAO_ONLY
        );
      case IdentityType.AID:
        return PRIVACY_LEVELS.filter(level => level.level === PrivacyLevel.ANONYMOUS);
      default:
        return PRIVACY_LEVELS;
    }
  }, [selectedType]);

  // Update form data when privacy settings change
  useEffect(() => {
    const selectedConfig = PRIVACY_LEVELS.find(level => level.level === selectedPrivacyLevel);
    if (!selectedConfig) return;

    const qonsentConfig = {
      identityId: '', // Will be set when identity is created
      profileId: `qonsent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      privacyLevel: selectedPrivacyLevel,
      dataSharing: Object.fromEntries(
        Object.entries(moduleSharing).map(([module, enabled]) => [
          module,
          {
            enabled,
            level: enabled ? 'STANDARD' : 'MINIMAL',
            restrictions: enabled ? [] : ['no_sharing']
          }
        ])
      ),
      visibilityRules: {
        profile: useQmask ? PrivacyLevel.ANONYMOUS : selectedPrivacyLevel,
        activity: selectedPrivacyLevel,
        connections: selectedPrivacyLevel
      },
      consentHistory: [],
      lastUpdated: new Date().toISOString()
    };

    onFormDataChange({
      privacyLevel: selectedPrivacyLevel,
      qonsentConfig
    });
  }, [selectedPrivacyLevel, moduleSharing, useQmask, onFormDataChange]);

  // Handle privacy level selection
  const handlePrivacyLevelChange = useCallback((level: PrivacyLevel) => {
    setSelectedPrivacyLevel(level);
  }, []);

  // Handle module sharing toggle
  const handleModuleSharingToggle = useCallback((module: string, enabled: boolean) => {
    setModuleSharing(prev => ({
      ...prev,
      [module]: enabled
    }));
  }, []);

  // Generate privacy policy preview
  const generatePrivacyPolicyPreview = useCallback((): string => {
    const selectedConfig = PRIVACY_LEVELS.find(level => level.level === selectedPrivacyLevel);
    if (!selectedConfig) return '';

    const enabledModules = Object.entries(moduleSharing)
      .filter(([_, enabled]) => enabled)
      .map(([module, _]) => MODULE_SHARING_CONFIG.find(config => config.module === module)?.name)
      .filter(Boolean);

    return `
Privacy Policy for ${formData.name || 'New Identity'}

Privacy Level: ${selectedConfig.name}
${selectedConfig.description}

Data Sharing:
${enabledModules.length > 0 ? 
  `- Enabled for: ${enabledModules.join(', ')}` : 
  '- No data sharing enabled'
}

Visibility:
- Profile: ${useQmask ? 'Anonymous (Qmask enabled)' : selectedConfig.name}
- Activity: ${selectedConfig.name}
- Connections: ${selectedConfig.name}

Features:
${selectedConfig.features.map(feature => `- ${feature}`).join('\n')}

Restrictions:
${selectedConfig.restrictions.map(restriction => `- ${restriction}`).join('\n')}

${customPolicyText ? `\nCustom Policy Notes:\n${customPolicyText}` : ''}
    `.trim();
  }, [selectedPrivacyLevel, moduleSharing, useQmask, formData.name, customPolicyText]);

  const availablePrivacyLevels = getAvailablePrivacyLevels();
  const selectedConfig = PRIVACY_LEVELS.find(level => level.level === selectedPrivacyLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Shield className="w-6 h-6 text-primary mr-2" />
          <h3 className="text-lg font-semibold">Privacy Configuration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure privacy settings and Qonsent profile for your {selectedType.toLowerCase()} identity
        </p>
      </div>

      {/* Identity Type Privacy Info */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>{selectedType} identities</strong> have specific privacy requirements:
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Default visibility: {typeRules.visibility}</li>
            <li>• Governed by: {typeRules.governedBy}</li>
            {typeRules.kycRequired && <li>• KYC verification required</li>}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Privacy Level Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Privacy Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {availablePrivacyLevels.map((config) => (
              <div
                key={config.level}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPrivacyLevel === config.level
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handlePrivacyLevelChange(config.level)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={config.color}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{config.name}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  {selectedPrivacyLevel === config.level && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                {selectedPrivacyLevel === config.level && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sm text-green-600 mb-2">Features</h5>
                        <ul className="text-xs space-y-1">
                          {config.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm text-orange-600 mb-2">Restrictions</h5>
                        <ul className="text-xs space-y-1">
                          {config.restrictions.map((restriction, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              {restriction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {validationErrors.privacyLevel && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {validationErrors.privacyLevel.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Module Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Module Data Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control which ecosystem modules can access and share data from this identity.
          </p>
          
          <div className="space-y-3">
            {MODULE_SHARING_CONFIG.map((config) => {
              const isRequired = config.requiredForTypes.includes(selectedType);
              const isEnabled = moduleSharing[config.module];
              
              return (
                <div key={config.module} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.name}</span>
                        {isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleModuleSharingToggle(config.module, checked)}
                    disabled={isRequired || isSubmitting}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Privacy Options */}
      {selectedPrivacyLevel !== PrivacyLevel.ANONYMOUS && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Advanced Privacy Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="qmask-switch" className="font-medium">Enable Qmask</Label>
                <p className="text-sm text-muted-foreground">
                  Use anonymous masking for profile visibility
                </p>
              </div>
              <Switch
                id="qmask-switch"
                checked={useQmask}
                onCheckedChange={setUseQmask}
                disabled={isSubmitting}
              />
            </div>
            
            <Separator />
            
            <div>
              <Label htmlFor="customPolicy" className="font-medium">Custom Policy Notes</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Add any additional privacy requirements or notes (optional)
              </p>
              <Textarea
                id="customPolicy"
                placeholder="Enter any specific privacy requirements or notes..."
                value={customPolicyText}
                onChange={(e) => setCustomPolicyText(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Policy Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Privacy Policy Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {generatePrivacyPolicyPreview()}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This preview shows how your privacy settings will be applied. You can modify these settings after identity creation.
          </p>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.qonsent && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Privacy Configuration Errors:</strong>
            <ul className="mt-1 space-y-1">
              {validationErrors.qonsent.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PrivacyConfigurationStep;