/**
 * Qwallet Components Index
 * 
 * Centralized exports for all Qwallet-related components
 */

export { default as QwalletDashboard } from './QwalletDashboard';
export { default as NFTGallery } from './NFTGallery';
export { default as TokenTransferForm } from './TokenTransferForm';
export { default as TransactionHistory } from './TransactionHistory';
export { default as WalletDashboard } from './WalletDashboard';
export { default as PiWalletInterface } from './PiWalletInterface';
export { default as AuditStatusDisplay } from './AuditStatusDisplay';
export { PluginRegistry } from './PluginRegistry';

// Visual Indicators and Feedback Components
export { default as WalletLimitIndicators } from './WalletLimitIndicators';
export { default as PermissionStatusDisplay } from './PermissionStatusDisplay';
export { default as RiskLevelIndicator } from './RiskLevelIndicator';
export { 
  ProgressIndicator,
  MultiStepProgress,
  TransactionLoading,
  IdentitySwitchLoading,
  WalletSkeleton
} from './LoadingStateIndicators';

// Re-export the hooks for convenience
export { useQwallet } from '../../composables/useQwallet';
export { useQwalletPlugins } from '../../hooks/useQwalletPlugins';

// Export types for external use
export type {
  TokenInfo,
  Balance,
  WalletBalances,
  NFT,
  NFTAttribute,
  Transaction,
  TransferFundsParams,
  MintNFTParams,
  SignTransactionParams,
  SignTransactionResponse,
  UseQwalletReturn
} from '../../composables/useQwallet';

// Export enhanced wallet transaction types
export type {
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  TransactionFilter,
  TransactionSort,
  TransactionQuery,
  TransactionExportOptions,
  ComplianceReport,
  IdentityBalances,
  TokenBalance,
  TransferResult,
  RiskAssessment,
  PiWalletStatus,
  WalletAuditLog
} from '../../types/wallet-transactions';

// Export plugin types
export type {
  QwalletPlugin,
  QwalletPluginType,
  PluginStatus,
  PluginManager,
  PluginValidationResult,
  PluginMenuItem,
  WalletOperation,
  PluginEventType,
  PluginEvent,
  PluginEventHandler,
  AuditPlugin,
  TokenPlugin,
  UIPlugin,
  ServicePlugin,
  IntegrationPlugin
} from '../../types/qwallet-plugin';

// Export plugin services
export { QwalletPluginManager, pluginManager } from '../../services/QwalletPluginManager';
export { BaseQwalletPlugin } from '../../services/BaseQwalletPlugin';
export { pluginIntegration } from '../../utils/pluginIntegration';