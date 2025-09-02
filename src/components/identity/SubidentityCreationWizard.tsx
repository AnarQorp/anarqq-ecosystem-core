/**
 * Subidentity Creation Wizard
 * Multi-step wizard for creating new subidentities with type selection, governance setup, and privacy configuration
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 3.4
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { IdentityType, SubidentityMetadata, ExtendedSquidIdentity } from '@/types/identity';
import { IDENTITY_TYPE_RULES, IDENTITY_CREATION_MATRIX } from '@/types/identity-constants';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useToast } from '@/hooks/use-toast';
import { IdentityTypeSelectionStep } from './IdentityTypeSelectionStep';
import { BasicInformationStep } from './BasicInformationStep';
import { GovernanceSetupStep } from './GovernanceSetupStep';
import { PrivacyConfigurationStep } from './PrivacyConfigurationStep';
import { ReviewAndConfirmationStep } from './ReviewAndConfirmationStep';

// Wizard Steps
export enum WizardStep {
  TYPE_SELECTION = 'type_selection',
  BASIC_INFO = 'basic_info',
  GOVERNANCE = 'governance',
  PRIVACY = 'privacy',
  REVIEW = 'review'
}

// Wizard Props
export interface SubidentityCreationWizardProps {
  /** Whether the wizard is open */
  open: boolean;
  /** Callback when wizard is closed */
  onClose: () => void;
  /** Callback when identity is successfully created */
  onIdentityCreated?: (identity: ExtendedSquidIdentity) => void;
  /** Custom CSS class */
  className?: string;
}

// Wizard State
interface WizardState {
  currentStep: WizardStep;
  selectedType: IdentityType | null;
  metadata: Partial<SubidentityMetadata>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
}

// Step Configuration
const STEP_CONFIG = {
  [WizardStep.TYPE_SELECTION]: {
    title: 'Select Identity Type',
    description: 'Choose the type of identity you want to create',
    progress: 20
  },
  [WizardStep.BASIC_INFO]: {
    title: 'Basic Information',
    description: 'Provide basic details for your new identity',
    progress: 40
  },
  [WizardStep.GOVERNANCE]: {
    title: 'Governance Setup',
    description: 'Configure governance and permissions',
    progress: 60
  },
  [WizardStep.PRIVACY]: {
    title: 'Privacy Configuration',
    description: 'Set up privacy and consent preferences',
    progress: 80
  },
  [WizardStep.REVIEW]: {
    title: 'Review & Confirm',
    description: 'Review your settings and create the identity',
    progress: 100
  }
};

export const SubidentityCreationWizard: React.FC<SubidentityCreationWizardProps> = ({
  open,
  onClose,
  onIdentityCreated,
  className
}) => {
  const { identity: activeIdentity } = useActiveIdentity();
  const { createSubidentity } = useIdentityManager();
  const { toast } = useToast();

  const [state, setState] = useState<WizardState>({
    currentStep: WizardStep.TYPE_SELECTION,
    selectedType: null,
    metadata: {},
    validationErrors: {},
    isSubmitting: false
  });

  // Get available identity types for current user
  const getAvailableTypes = useCallback((): IdentityType[] => {
    if (!activeIdentity) return [];
    return IDENTITY_CREATION_MATRIX[activeIdentity.type] || [];
  }, [activeIdentity]);

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setState({
      currentStep: WizardStep.TYPE_SELECTION,
      selectedType: null,
      metadata: {},
      validationErrors: {},
      isSubmitting: false
    });
  }, []);

  // Handle wizard close
  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  // Navigate between steps
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const goToNextStep = useCallback(() => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1]);
    }
  }, [state.currentStep, goToStep]);

  const goToPreviousStep = useCallback(() => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1]);
    }
  }, [state.currentStep, goToStep]);

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    const errors: Record<string, string[]> = {};

    switch (state.currentStep) {
      case WizardStep.TYPE_SELECTION:
        if (!state.selectedType) {
          errors.type = ['Please select an identity type'];
        }
        break;
        
      case WizardStep.BASIC_INFO:
        // Validate name
        if (!state.metadata.name?.trim()) {
          errors.name = ['Identity name is required'];
        } else {
          const name = state.metadata.name.trim();
          if (name.length < 2) {
            errors.name = ['Name must be at least 2 characters long'];
          } else if (name.length > 50) {
            errors.name = ['Name must be 50 characters or less'];
          } else if (!/^[a-zA-Z0-9\s\-_.]{2,50}$/.test(name)) {
            errors.name = ['Name can only contain letters, numbers, spaces, hyphens, underscores, and periods'];
          }
        }
        
        // Validate description if provided
        if (state.metadata.description && state.metadata.description.length > 500) {
          errors.description = ['Description must be 500 characters or less'];
        }
        
        // Validate tags if provided
        if (state.metadata.tags && state.metadata.tags.length > 10) {
          errors.tags = ['Maximum 10 tags allowed'];
        }
        break;
        
      case WizardStep.GOVERNANCE:
        if (state.selectedType) {
          const rules = IDENTITY_TYPE_RULES[state.selectedType];
          
          // Validate DAO governance for DAO and Enterprise types
          if (rules.governedBy === 'DAO') {
            if (!state.metadata.governanceConfig?.daoId) {
              errors.governance = ['Please select a DAO to govern this identity'];
            }
          }
          
          // Validate parental consent for Consentida type
          if (rules.governedBy === 'PARENT') {
            const parentalConsent = state.metadata.governanceConfig?.parentalConsent;
            if (!parentalConsent) {
              errors.governance = ['Parental consent is required for Consentida identities'];
            } else {
              const consentErrors: string[] = [];
              
              if (!parentalConsent.guardianName?.trim()) {
                consentErrors.push('Guardian name is required');
              }
              
              if (!parentalConsent.guardianEmail?.trim()) {
                consentErrors.push('Guardian email is required');
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentalConsent.guardianEmail)) {
                consentErrors.push('Please enter a valid guardian email address');
              }
              
              if (!parentalConsent.relationship) {
                consentErrors.push('Please specify the relationship to the minor');
              }
              
              if (!parentalConsent.consentDate) {
                consentErrors.push('Please send and collect parental consent before proceeding');
              }
              
              if (consentErrors.length > 0) {
                errors.governance = consentErrors;
              }
            }
          }
        }
        break;
        
      case WizardStep.PRIVACY:
        if (state.selectedType) {
          const privacyErrors: string[] = [];
          
          // Validate privacy level is set
          if (!state.metadata.privacyLevel) {
            privacyErrors.push('Please select a privacy level');
          }
          
          // Validate Qonsent configuration
          if (!state.metadata.qonsentConfig) {
            privacyErrors.push('Privacy configuration is required');
          } else {
            const qonsentConfig = state.metadata.qonsentConfig;
            
            // Validate profile ID
            if (!qonsentConfig.profileId) {
              privacyErrors.push('Privacy profile ID is required');
            }
            
            // Validate data sharing configuration
            if (!qonsentConfig.dataSharing) {
              privacyErrors.push('Data sharing configuration is required');
            }
            
            // Validate visibility rules
            if (!qonsentConfig.visibilityRules) {
              privacyErrors.push('Visibility rules are required');
            }
          }
          
          if (privacyErrors.length > 0) {
            errors.qonsent = privacyErrors;
          }
        }
        break;
    }

    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [state.currentStep, state.selectedType, state.metadata]);

  // Handle step navigation with validation
  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      goToNextStep();
    }
  }, [validateCurrentStep, goToNextStep]);

  // Handle identity creation submission
  const handleCreateIdentity = useCallback(async () => {
    if (!state.selectedType || !state.metadata.name) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before creating the identity.",
        variant: "destructive"
      });
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Final validation before submission
      if (!validateCurrentStep()) {
        toast({
          title: "Validation Error",
          description: "Please fix the validation errors before proceeding.",
          variant: "destructive"
        });
        return;
      }

      // Create the subidentity
      const result = await createSubidentity(state.selectedType, state.metadata as SubidentityMetadata);

      if (result.success && result.identity) {
        toast({
          title: "Identity Created",
          description: `Successfully created ${state.selectedType.toLowerCase()} identity "${state.metadata.name}".`,
        });

        // Call the success callback
        onIdentityCreated?.(result.identity);

        // Close the wizard
        handleClose();
      } else {
        toast({
          title: "Creation Failed",
          description: result.error || "Failed to create identity. Please try again.",
          variant: "destructive"
        });

        // Set validation errors if provided
        if (result.validationErrors) {
          setState(prev => ({
            ...prev,
            validationErrors: { general: result.validationErrors || [] }
          }));
        }
      }
    } catch (error) {
      console.error('Error creating identity:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while creating the identity.",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [state.selectedType, state.metadata, validateCurrentStep, createSubidentity, toast, onIdentityCreated, handleClose]);

  if (!open) return null;

  const currentStepConfig = STEP_CONFIG[state.currentStep];
  const availableTypes = getAvailableTypes();

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${className || ''}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{currentStepConfig.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStepConfig.description}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ✕
            </Button>
          </div>
          <div className="mt-4">
            <Progress value={currentStepConfig.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Step {Object.values(WizardStep).indexOf(state.currentStep) + 1} of {Object.values(WizardStep).length}</span>
              <span>{currentStepConfig.progress}% Complete</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {state.currentStep === WizardStep.TYPE_SELECTION && (
            <IdentityTypeSelectionStep
              availableTypes={availableTypes}
              selectedType={state.selectedType}
              onTypeSelect={(type) => setState(prev => ({ ...prev, selectedType: type }))}
              validationErrors={state.validationErrors.type || []}
              activeIdentity={activeIdentity}
            />
          )}

          {state.currentStep === WizardStep.BASIC_INFO && state.selectedType && (
            <BasicInformationStep
              selectedType={state.selectedType}
              formData={state.metadata}
              onFormDataChange={(data) => setState(prev => ({ ...prev, metadata: { ...prev.metadata, ...data } }))}
              validationErrors={state.validationErrors}
              isSubmitting={state.isSubmitting}
            />
          )}

          {state.currentStep === WizardStep.GOVERNANCE && state.selectedType && (
            <GovernanceSetupStep
              selectedType={state.selectedType}
              formData={state.metadata}
              onFormDataChange={(data) => setState(prev => ({ ...prev, metadata: { ...prev.metadata, ...data } }))}
              validationErrors={state.validationErrors}
              isSubmitting={state.isSubmitting}
              activeIdentity={activeIdentity}
            />
          )}

          {state.currentStep === WizardStep.PRIVACY && state.selectedType && (
            <PrivacyConfigurationStep
              selectedType={state.selectedType}
              formData={state.metadata}
              onFormDataChange={(data) => setState(prev => ({ ...prev, metadata: { ...prev.metadata, ...data } }))}
              validationErrors={state.validationErrors}
              isSubmitting={state.isSubmitting}
              activeIdentity={activeIdentity}
            />
          )}

          {state.currentStep === WizardStep.REVIEW && state.selectedType && (
            <ReviewAndConfirmationStep
              selectedType={state.selectedType}
              formData={state.metadata}
              validationErrors={state.validationErrors}
              isSubmitting={state.isSubmitting}
              activeIdentity={activeIdentity}
              onSubmit={handleCreateIdentity}
            />
          )}
        </CardContent>

        <div className="p-6 border-t bg-muted/50">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={state.currentStep === WizardStep.TYPE_SELECTION}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              {state.currentStep !== WizardStep.REVIEW ? (
                <Button onClick={handleNext} disabled={!state.selectedType}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateIdentity}
                  disabled={state.isSubmitting}
                >
                  {state.isSubmitting ? 'Creating...' : 'Create Identity'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SubidentityCreationWizard;