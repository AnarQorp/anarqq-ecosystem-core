/**
 * Enhanced Wallet Configuration Types
 * Supports identity-aware wallet configuration with dynamic limits,
 * DAO governance integration, security settings, and sandbox testing
 */

import { IdentityType, PrivacyLevel } from './identity';

// Core Wallet Configuration Interface
export interface IdentityWalletConfig {
  identityId: string;
  identityType: IdentityType;
  permissions: WalletPermissions;
  limits: WalletLimits;
  securitySettings: SecuritySettings;
  privacySettings: PrivacySettings;
  auditSettings: AuditSettings;
  piWalletConfig?: PiWalletConfig;
  customTokens: CustomTokenConfig[];
  emergencyContacts?: string[];
  frozen: boolean;
  frozenReason?: string;
  frozenAt?: string;
  walletMode: WalletMode;
  createdAt: string;
  updatedAt: string;
  version: string;
}

// Wallet Permissions
export interface WalletPermissions {
  canTransfer: boolean;
  canReceive: boolean;
  canMintNFT: boolean;
  canSignTransactions: boolean;
  canAccessDeFi: boolean;
  canCreateDAO: boolean;
  maxTransactionAmount: number;
  allowedTokens: string[];
  restrictedOperations: string[];
  governanceLevel: 'FULL' | 'LIMITED' | 'READ_ONLY';
  requiresApproval: boolean;
  approvalThreshold: number;
}

// Dynamic Wallet Limits with DAO Governance
export interface WalletLimits {
  dailyTransferLimit: number;
  monthlyTransferLimit: number;
  maxTransactionAmount: number;
  maxTransactionsPerHour: number;
  allowedTokens: string[];
  restrictedAddresses: string[];
  requiresApprovalAbove: number;
  
  // Dynamic governance controls
  dynamicLimitsEnabled: boolean;
  governanceControlled: boolean;
  policyId?: string; // ID of the policy in Qonsent
  daoOverrides?: Record<string, any>;
  
  // Time-based limits
  cooldownPeriod?: number; // Minutes between large transactions
  velocityLimits?: VelocityLimits;
  
  // Risk-based adjustments
  riskBasedAdjustments: boolean;
  riskMultipliers?: RiskMultipliers;
}

export interface VelocityLimits {
  transactionsPerMinute: number;
  transactionsPerHour: number;
  transactionsPerDay: number;
  volumePerHour: number;
  volumePerDay: number;
}

export interface RiskMultipliers {
  lowRisk: number;    // 1.0 = normal limits
  mediumRisk: number; // 0.5 = half limits
  highRisk: number;   // 0.1 = 10% of limits
  criticalRisk: number; // 0.0 = no transactions
}

// Security Settings
export interface SecuritySettings {
  requiresDeviceVerification: boolean;
  requiresMultiSig: boolean;
  sessionTimeout: number; // Minutes
  maxConcurrentSessions: number;
  suspiciousActivityThreshold: number;
  autoFreezeOnSuspiciousActivity: boolean;
  
  // Enhanced security features
  requiresBiometric: boolean;
  requires2FA: boolean;
  ipWhitelist?: string[];
  deviceWhitelist?: string[];
  geofencing?: GeofencingConfig;
  
  // Transaction security
  transactionConfirmationRequired: boolean;
  largeTransactionDelay: number; // Minutes
  emergencyFreeze: boolean;
}

export interface GeofencingConfig {
  enabled: boolean;
  allowedCountries?: string[];
  blockedCountries?: string[];
  allowedRegions?: string[];
  blockedRegions?: string[];
}

// Privacy Settings
export interface PrivacySettings {
  logTransactions: boolean;
  shareWithAnalytics: boolean;
  anonymizeMetadata: boolean;
  ephemeralStorage: boolean;
  dataRetentionPeriod: number; // Days
  
  // Enhanced privacy features
  privacyLevel: PrivacyLevel;
  hideBalances: boolean;
  hideTransactionHistory: boolean;
  encryptMetadata: boolean;
  
  // Data sharing controls
  shareWithDAOs: boolean;
  shareWithParent: boolean; // For CONSENTIDA identities
  shareWithGovernance: boolean;
  
  // Compliance privacy
  complianceDataSharing: boolean;
  auditDataRetention: number; // Days
}

// Audit Settings
export interface AuditSettings {
  enableAuditLogging: boolean;
  logLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retentionPeriod: number; // Days
  complianceReporting: boolean;
  qerberosIntegration: boolean;
  
  // Enhanced audit features
  realTimeMonitoring: boolean;
  anomalyDetection: boolean;
  complianceAlerts: boolean;
  
  // Audit data export
  allowDataExport: boolean;
  exportFormats: string[];
  automaticReporting: boolean;
  reportingFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

// Pi Wallet Configuration
export interface PiWalletConfig {
  enabled: boolean;
  piUserId?: string;
  piWalletAddress?: string;
  linkedAt?: string;
  permissions: string[];
  transferLimits: {
    dailyLimit: number;
    maxTransactionAmount: number;
    allowedOperations: string[];
  };
  
  // Enhanced Pi Wallet features
  autoSync: boolean;
  syncFrequency: number; // Minutes
  notifyOnTransactions: boolean;
  requireConfirmation: boolean;
}

// Custom Token Configuration
export interface CustomTokenConfig {
  tokenId: string;
  name: string;
  symbol: string;
  chain: 'PI' | 'ANARQ' | 'ETH' | 'BTC' | 'FILECOIN' | 'CUSTOM';
  contractAddress: string;
  decimals: number;
  iconUrl?: string;
  addedBy: string;
  addedAt: string;
  verified: boolean;
  governanceApproved?: boolean;
  
  // Enhanced token features
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tradingEnabled: boolean;
  transferEnabled: boolean;
  stakingEnabled: boolean;
  
  // Token limits
  maxHolding?: number;
  dailyTransferLimit?: number;
  requiresApproval: boolean;
}

// Wallet Mode Configuration for Sandbox Testing
export interface WalletMode {
  mode: 'PRODUCTION' | 'SANDBOX' | 'TESTING' | 'DEVELOPMENT';
  
  // Sandbox configuration
  isSandbox: boolean;
  simulatedTime?: string;
  mockBalances?: Record<string, number>;
  fakeSignatures: boolean;
  testingScenario?: string;
  
  // Testing features
  enableTestTransactions: boolean;
  testNetworkOnly: boolean;
  mockExternalServices: boolean;
  debugLogging: boolean;
  
  // Sandbox limits
  sandboxLimits?: {
    maxTransactionAmount: number;
    maxDailyTransactions: number;
    allowedTokens: string[];
  };
  
  // Reset capabilities
  allowReset: boolean;
  autoResetInterval?: number; // Hours
  preserveAuditLogs: boolean;
}

// Configuration Templates for Different Identity Types
export interface WalletConfigTemplate {
  identityType: IdentityType;
  templateName: string;
  description: string;
  permissions: WalletPermissions;
  limits: WalletLimits;
  securitySettings: SecuritySettings;
  privacySettings: PrivacySettings;
  auditSettings: AuditSettings;
  walletMode: WalletMode;
  isDefault: boolean;
  createdAt: string;
  version: string;
}

// Configuration Validation
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Configuration Change Request (for governance)
export interface ConfigChangeRequest {
  requestId: string;
  identityId: string;
  requestedBy: string;
  changeType: 'LIMITS' | 'PERMISSIONS' | 'SECURITY' | 'PRIVACY' | 'AUDIT';
  currentConfig: Partial<IdentityWalletConfig>;
  proposedConfig: Partial<IdentityWalletConfig>;
  justification: string;
  
  // Governance
  requiresGovernanceApproval: boolean;
  governanceRequestId?: string;
  
  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt: string;
  
  // Risk assessment
  riskAssessment?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskFactors: string[];
    mitigations: string[];
  };
}

// Configuration History
export interface ConfigChangeHistory {
  changeId: string;
  identityId: string;
  changeType: string;
  changedBy: string;
  changedAt: string;
  previousConfig: Partial<IdentityWalletConfig>;
  newConfig: Partial<IdentityWalletConfig>;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  rollbackId?: string; // If this change was rolled back
}

// Configuration Service Interface
export interface WalletConfigServiceInterface {
  // Configuration Management
  getWalletConfig(identityId: string): Promise<IdentityWalletConfig>;
  updateWalletConfig(identityId: string, config: Partial<IdentityWalletConfig>): Promise<boolean>;
  resetWalletConfig(identityId: string): Promise<boolean>;
  
  // Template Management
  getConfigTemplate(identityType: IdentityType): Promise<WalletConfigTemplate>;
  createConfigFromTemplate(identityId: string, templateName: string): Promise<IdentityWalletConfig>;
  
  // Dynamic Limits
  updateDynamicLimits(identityId: string, limits: Partial<WalletLimits>): Promise<boolean>;
  applyRiskBasedLimits(identityId: string, riskLevel: string): Promise<boolean>;
  
  // Governance Integration
  requestConfigChange(request: ConfigChangeRequest): Promise<string>;
  approveConfigChange(requestId: string, approved: boolean): Promise<boolean>;
  getConfigChangeHistory(identityId: string): Promise<ConfigChangeHistory[]>;
  
  // Validation
  validateConfig(config: IdentityWalletConfig): Promise<ConfigValidationResult>;
  validateConfigChange(identityId: string, changes: Partial<IdentityWalletConfig>): Promise<ConfigValidationResult>;
  
  // Sandbox Mode
  enableSandboxMode(identityId: string, config?: Partial<WalletMode>): Promise<boolean>;
  disableSandboxMode(identityId: string): Promise<boolean>;
  resetSandboxData(identityId: string): Promise<boolean>;
}

// Error Types
export class WalletConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public identityId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WalletConfigError';
  }
}

export class ConfigValidationError extends WalletConfigError {
  constructor(
    message: string,
    identityId?: string,
    public validationErrors?: string[]
  ) {
    super(message, 'CONFIG_VALIDATION_ERROR', identityId);
    this.name = 'ConfigValidationError';
  }
}

export class GovernanceRequiredError extends WalletConfigError {
  constructor(
    message: string,
    identityId?: string,
    public governanceRequestId?: string
  ) {
    super(message, 'GOVERNANCE_REQUIRED', identityId);
    this.name = 'GovernanceRequiredError';
  }
}

// Utility Types
export type ConfigUpdateType = 'PERMISSIONS' | 'LIMITS' | 'SECURITY' | 'PRIVACY' | 'AUDIT' | 'PI_WALLET' | 'TOKENS' | 'MODE';

export interface ConfigUpdateEvent {
  type: ConfigUpdateType;
  identityId: string;
  timestamp: string;
  changedBy: string;
  changes: Record<string, any>;
  previousValues: Record<string, any>;
}

export type ConfigEventHandler = (event: ConfigUpdateEvent) => void;