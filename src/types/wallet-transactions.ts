/**
 * Enhanced Wallet Transaction Types
 * Supports identity-aware transaction management with privacy controls,
 * risk assessment, audit logging, and compliance features
 */

import { IdentityType, PrivacyLevel, AuditEntry } from './identity';

// Core Transaction Interfaces
export interface WalletTransaction {
  id: string;
  identityId: string;
  identityType: IdentityType;
  type: TransactionType;
  status: TransactionStatus;
  
  // Transaction details
  amount: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  blockNumber?: number;
  transactionHash?: string;
  
  // Fees and costs
  fees: number;
  gasUsed?: number;
  gasPrice?: number;
  
  // Privacy and security
  privacyLevel: PrivacyLevel;
  riskScore: number;
  complianceFlags: string[];
  qonsentApproved: boolean;
  qlockSigned: boolean;
  piWalletInvolved: boolean;
  
  // Audit and metadata
  auditTrail: AuditEntry[];
  metadata: TransactionMetadata;
  
  // Optional fields
  memo?: string;
  tags?: string[];
  category?: TransactionCategory;
}

export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  MINT = 'MINT',
  BURN = 'BURN',
  SWAP = 'SWAP',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  APPROVE = 'APPROVE',
  REVOKE = 'REVOKE',
  PI_DEPOSIT = 'PI_DEPOSIT',
  PI_WITHDRAWAL = 'PI_WITHDRAWAL'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum TransactionCategory {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
  DAO_GOVERNANCE = 'DAO_GOVERNANCE',
  DEFI = 'DEFI',
  NFT = 'NFT',
  GAMING = 'GAMING',
  SOCIAL = 'SOCIAL'
}

export interface TransactionMetadata {
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: string;
  sessionId: string;
  chain?: string;
  
  // Enhanced metadata
  initiatedBy: 'USER' | 'SYSTEM' | 'DAO' | 'SMART_CONTRACT';
  approvalRequired: boolean;
  approvedBy?: string[];
  
  // Risk and compliance
  riskFactors: string[];
  complianceChecks: ComplianceCheck[];
  
  // Integration metadata
  qindexed: boolean;
  qerberosLogId?: string;
  qonsentPolicyId?: string;
}

export interface ComplianceCheck {
  type: 'AML' | 'KYC' | 'SANCTIONS' | 'JURISDICTION' | 'LIMITS';
  status: 'PASSED' | 'FAILED' | 'PENDING' | 'SKIPPED';
  details?: string;
  timestamp: string;
}

// Balance and Token Interfaces
export interface IdentityBalances {
  identityId: string;
  walletAddress: string;
  balances: TokenBalance[];
  totalValueUSD: number;
  lastUpdated: string;
  
  // Enhanced balance features
  hiddenTokens?: string[];
  customTokens?: string[];
  stakingBalances?: StakingBalance[];
  lockedBalances?: LockedBalance[];
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: number;
  decimals: number;
  valueUSD: number;
  
  // Enhanced token features
  chain?: string;
  contractAddress?: string;
  iconUrl?: string;
  verified: boolean;
  
  // Balance breakdown
  available: number;
  locked: number;
  staked: number;
  pending: number;
  
  // Price information
  priceUSD: number;
  priceChange24h?: number;
  marketCap?: number;
}

export interface StakingBalance {
  token: string;
  stakedAmount: number;
  rewards: number;
  stakingPool: string;
  stakingStartDate: string;
  lockupPeriod?: number;
  apy: number;
}

export interface LockedBalance {
  token: string;
  lockedAmount: number;
  lockReason: 'GOVERNANCE' | 'VESTING' | 'SECURITY' | 'COMPLIANCE';
  lockStartDate: string;
  unlockDate: string;
  canUnlockEarly: boolean;
}

// Transfer and Operation Results
export interface TransferResult {
  success: boolean;
  transactionId?: string;
  transactionHash?: string;
  
  // Transfer details
  amount: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  
  // Costs and fees
  fees: number;
  gasEstimate?: number;
  
  // Status and error handling
  status: TransactionStatus;
  error?: string;
  errorCode?: string;
  
  // Risk and compliance
  riskAssessment?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskFactors: string[];
    requiresApproval: boolean;
  };
  
  // Metadata
  metadata?: {
    estimatedConfirmationTime?: number;
    networkCongestion?: 'LOW' | 'MEDIUM' | 'HIGH';
    priorityFee?: number;
  };
}

// Risk Assessment Interfaces
export interface RiskAssessment {
  identityId: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  recommendations: string[];
  lastAssessment: string;
  nextAssessment: string;
  autoActions: AutoAction[];
  
  // Enhanced reputation integration
  reputationScore?: number;
  reputationTier?: 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED';
  trustedByDAOs?: string[]; // DAO IDs that endorse this wallet
}

export interface RiskFactor {
  type: 'VELOCITY' | 'AMOUNT' | 'FREQUENCY' | 'PATTERN' | 'DEVICE' | 'LOCATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  value: number;
  threshold: number;
  firstDetected: string;
  lastDetected: string;
}

export interface AutoAction {
  trigger: string;
  action: 'LOG' | 'WARN' | 'RESTRICT' | 'FREEZE' | 'NOTIFY';
  executed: boolean;
  executedAt?: string;
  result?: string;
}

// Pi Wallet Integration
export interface PiWalletStatus {
  connected: boolean;
  balance: number;
  lastSync: string;
  connectionError?: string;
  supportedOperations: string[];
  
  // Enhanced Pi Wallet features
  piUserId?: string;
  piWalletAddress?: string;
  syncInProgress: boolean;
  lastTransactionId?: string;
  
  // Status indicators
  healthStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
  apiVersion?: string;
  rateLimitRemaining?: number;
}

// Audit and Logging
export interface WalletAuditLog {
  id: string;
  identityId: string;
  operation: string;
  operationType: 'TRANSFER' | 'CONFIG_CHANGE' | 'PI_WALLET_CONNECT' | 'SECURITY_EVENT' | 'COMPLIANCE_CHECK';
  timestamp: string;
  success: boolean;
  
  // Risk and security
  riskScore: number;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Metadata and context
  metadata: {
    sessionId: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    
    // Operation-specific data
    amount?: number;
    token?: string;
    recipient?: string;
    
    // Results and errors
    error?: string;
    errorCode?: string;
    gasUsed?: number;
    fees?: number;
  };
  
  // Compliance and audit
  complianceFlags: string[];
  qerberosLogId?: string;
  retentionPeriod: number; // Days
}

// Transaction Filtering and Search
export interface TransactionFilter {
  // Basic filters
  identityId?: string;
  type?: TransactionType[];
  status?: TransactionStatus[];
  token?: string[];
  
  // Date range
  startDate?: string;
  endDate?: string;
  
  // Amount range
  minAmount?: number;
  maxAmount?: number;
  
  // Privacy and security
  privacyLevel?: PrivacyLevel[];
  riskLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  
  // Compliance
  complianceFlags?: string[];
  requiresApproval?: boolean;
  
  // Integration
  piWalletInvolved?: boolean;
  qonsentApproved?: boolean;
  qlockSigned?: boolean;
  
  // Categories and tags
  category?: TransactionCategory[];
  tags?: string[];
  
  // Search
  searchTerm?: string;
  searchFields?: ('memo' | 'toAddress' | 'fromAddress' | 'transactionHash')[];
}

export interface TransactionSort {
  field: 'timestamp' | 'amount' | 'fees' | 'riskScore' | 'status';
  direction: 'asc' | 'desc';
}

export interface TransactionQuery {
  filter?: TransactionFilter;
  sort?: TransactionSort;
  limit?: number;
  offset?: number;
}

// Export and Reporting
export interface TransactionExportOptions {
  format: 'CSV' | 'JSON' | 'PDF' | 'XLSX';
  includeMetadata: boolean;
  includeAuditTrail: boolean;
  includeComplianceData: boolean;
  
  // Privacy controls
  anonymizeAddresses: boolean;
  excludePrivateTransactions: boolean;
  
  // Date range
  startDate?: string;
  endDate?: string;
  
  // Filtering
  filter?: TransactionFilter;
}

export interface ComplianceReport {
  identityId: string;
  reportType: 'TRANSACTION_SUMMARY' | 'RISK_ASSESSMENT' | 'COMPLIANCE_STATUS' | 'AUDIT_TRAIL';
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Report data
  transactionCount: number;
  totalVolume: number;
  riskEvents: number;
  complianceViolations: number;
  
  // Detailed data
  transactions: WalletTransaction[];
  riskAssessments: RiskAssessment[];
  auditLogs: WalletAuditLog[];
  
  // Metadata
  generatedAt: string;
  generatedBy: string;
  reportId: string;
  version: string;
}

// Error Types
export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public transactionId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class InsufficientBalanceError extends TransactionError {
  constructor(
    message: string,
    public requiredAmount: number,
    public availableAmount: number,
    public token: string
  ) {
    super(message, 'INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

export class TransactionLimitExceededError extends TransactionError {
  constructor(
    message: string,
    public limit: number,
    public attemptedAmount: number,
    public limitType: string
  ) {
    super(message, 'LIMIT_EXCEEDED');
    this.name = 'TransactionLimitExceededError';
  }
}

// Utility Types
export type TransactionEventType = 'CREATED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface TransactionEvent {
  type: TransactionEventType;
  transactionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type TransactionEventHandler = (event: TransactionEvent) => void;