/**
 * Identity Components Index
 * Exports all identity-related components for easy importing
 */

// Main Components
export { default as IdentityDisplay } from './IdentityDisplay';
export { default as IdentitySwitcher } from './IdentitySwitcher';
export { default as SubidentityCreationWizard } from './SubidentityCreationWizard';
export { IdentityOverviewDashboard } from './IdentityOverviewDashboard';
export { IdentityDetailView } from './IdentityDetailView';

// Wizard Step Components
export { default as IdentityTypeSelectionStep } from './IdentityTypeSelectionStep';
export { default as BasicInformationStep } from './BasicInformationStep';
export { default as GovernanceSetupStep } from './GovernanceSetupStep';
export { default as PrivacyConfigurationStep } from './PrivacyConfigurationStep';
export { default as ReviewAndConfirmationStep } from './ReviewAndConfirmationStep';

// Visual Indicators and Badges
export {
  IdentityTypeIcon,
  IdentityTypeBadge,
  PrivacyLevelBadge,
  IdentityStatusIndicator,
  SecurityStatusBadge,
  KYCStatusBadge,
  GovernanceBadge,
  SecurityFlagsIndicator,
  IdentityBadgeSet,
  default as IdentityVisualIndicators
} from './IdentityVisualIndicators';

// Component Props Types
export type { IdentitySwitcherProps } from './IdentitySwitcher';

// Re-export identity types for convenience
export {
  IdentityType,
  PrivacyLevel,
  IdentityStatus,
  GovernanceType,
  type ExtendedSquidIdentity,
  type SecurityFlag
} from '@/types/identity';