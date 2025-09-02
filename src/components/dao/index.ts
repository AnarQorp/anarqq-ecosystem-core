/**
 * DAO Components Index
 * 
 * Exports all DAO-related components for the AnarQ&Q ecosystem
 */

export { default as DAOExplorer } from './DAOExplorer';
export { default as DAODashboard } from './DAODashboard';
export { default as CreateProposalForm } from './CreateProposalForm';
export { default as CreateEnterpriseDAOForm } from './CreateEnterpriseDAOForm';
export { default as ProposalCard } from './ProposalCard';
export { default as VotingInterface } from './VotingInterface';
export { default as TokenOverviewPanel } from './TokenOverviewPanel';
export { default as DAOWalletOverview } from './DAOWalletOverview';
export { default as QuickActionsPanel } from './QuickActionsPanel';
export { default as ProposalStatsSidebar } from './ProposalStatsSidebar';

// Security and Permission Components
export {
  PermissionGuard,
  RoleGuard,
  AuthGuard,
  WalletGuard,
  CompositeGuard,
  usePermissionGuard
} from './PermissionGuard';

export {
  SecurityFallback,
  AuthenticationFallback,
  MembershipFallback,
  RoleFallback,
  WalletFallback,
  FeatureUnavailableFallback,
  MaintenanceFallback,
  CompositeFallback,
  useSecurityFallbacks
} from './SecurityFallbacks';

// Re-export the hook for convenience
export { useDAO } from '../../composables/useDAO';

// Export types for external use
export type {
  DAO,
  DetailedDAO,
  Proposal,
  DetailedProposal,
  ProposalSummary,
  Vote,
  VoteRequest,
  CreateProposalRequest,
  DAOResults,
  ProposalResult,
  Activity,
  Membership,
  DAOStats,
  UseDAOReturn
} from '../../composables/useDAO';

// Export permission and security types
export type {
  DAORole,
  DAOPermissions,
  PermissionCheckResult
} from '../../utils/dao-permissions';

export type {
  PermissionMessage
} from '../../utils/permission-messages';