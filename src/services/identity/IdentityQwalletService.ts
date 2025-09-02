/**
 * Enhanced Identity-specific Qwallet Service
 * Manages wallet context switching, identity-specific wallet permissions,
 * multi-chain token support, dynamic limits, and governance controls
 */

import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel 
} from '../../types/identity';

import { 
  IdentityWalletConfig,
  WalletLimits,
  SecuritySettings,
  PrivacySettings,
  AuditSettings,
  WalletMode,
  CustomTokenConfig,
  PiWalletConfig,
  WalletPermissions
} from '../../types/wallet-config';

import { walletConfigService } from './WalletConfigService';
import { piWalletService } from './PiWalletService';
import { qlockWalletService, TransactionSignatureResult } from './QlockWalletService';
import { walletErrorHandler } from './WalletErrorHandler';
import { walletErrorRecoveryUtils } from '../../utils/wallet-error-recovery';
import { 
  WalletError, 
  WalletErrorType, 
  WalletPermissionError, 
  WalletTransactionError, 
  WalletServiceError 
} from '../../types/wallet-errors';

export interface IdentityQwalletServiceInterface {
  // Wallet Context Management
  switchWalletContext(fromIdentityId: string, toIdentityId: string): Promise<boolean>;
  getActiveWalletContext(): Promise<string | null>;
  setActiveWalletContext(identityId: string): Promise<boolean>;
  
  // Identity-specific Wallet Permissions
  getWalletPermissions(identityId: string): Promise<WalletPermissions>;
  updateWalletPermissions(identityId: string, permissions: Partial<WalletPermissions>): Promise<boolean>;
  validateWalletOperation(identityId: string, operation: WalletOperation): Promise<boolean>;
  
  // Wallet Context Updates
  updateWalletContextOnSwitch(identityId: string): Promise<boolean>;
  syncWalletState(identityId: string): Promise<boolean>;
  
  // Multi-Identity Wallet Management
  getWalletAddressForIdentity(identityId: string): Promise<string | null>;
  createWalletForIdentity(identity: ExtendedSquidIdentity): Promise<WalletContext>;
  linkWalletToIdentity(identityId: string, walletAddress: string): Promise<boolean>;
  
  // Transaction Context
  getTransactionContext(identityId: string): Promise<TransactionContext>;
  signTransactionForIdentity(identityId: string, transaction: any): Promise<SignatureResult>;
  
  // Balance and Asset Management
  getBalancesForIdentity(identityId: string): Promise<IdentityBalances>;
  transferBetweenIdentities(fromId: string, toId: string, amount: number, token: string): Promise<boolean>;
  
  // Integration
  syncWithQlock(identityId: string): Promise<boolean>;
  syncWithQonsent(identityId: string): Promise<boolean>;
}

// Enhanced interface extending the base interface
export interface EnhancedQwalletServiceInterface extends IdentityQwalletServiceInterface {
  // Enhanced Wallet Configuration Management
  getIdentityWalletConfig(identityId: string): Promise<IdentityWalletConfig>;
  updateIdentityWalletConfig(identityId: string, config: Partial<IdentityWalletConfig>): Promise<boolean>;
  updateIdentityLimits(identityId: string, limits: WalletLimits): Promise<boolean>;
  
  // Pi Wallet Integration
  linkPiWallet(identityId: string, piWalletData: PiWalletData): Promise<boolean>;
  unlinkPiWallet(identityId: string): Promise<boolean>;
  transferToPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult>;
  transferFromPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult>;
  getPiWalletStatus(identityId: string): Promise<PiWalletStatus | null>;
  
  // Enhanced Audit and Compliance
  logWalletOperation(operation: WalletAuditLog): Promise<void>;
  getRiskAssessment(identityId: string): Promise<RiskAssessment>;
  generateComplianceReport(identityId: string, period: DateRange): Promise<ComplianceReport>;
  
  // Multi-chain Token Management
  getSupportedTokens(identityId: string): Promise<TokenInfo[]>;
  addCustomToken(identityId: string, tokenConfig: CustomTokenConfig): Promise<boolean>;
  removeCustomToken(identityId: string, tokenId: string): Promise<boolean>;
  validateTokenSupport(identityId: string, tokenId: string): Promise<boolean>;
  
  // Emergency Controls
  freezeWallet(identityId: string, reason: string): Promise<boolean>;
  unfreezeWallet(identityId: string): Promise<boolean>;
  isWalletFrozen(identityId: string): Promise<boolean>;
  
  // Governance Controls
  requestGovernanceApproval(identityId: string, operation: WalletOperation): Promise<GovernanceRequest>;
  checkGovernanceStatus(requestId: string): Promise<GovernanceStatus>;
  applyGovernanceDecision(requestId: string, approved: boolean): Promise<boolean>;
}

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
}

export interface WalletOperation {
  type: 'TRANSFER' | 'MINT' | 'SIGN' | 'DEFI' | 'DAO_CREATE' | 'DAO_VOTE';
  amount?: number;
  token?: string;
  recipient?: string;
  metadata?: any;
}

export interface WalletContext {
  identityId: string;
  walletAddress: string;
  privateKey: string; // Encrypted
  publicKey: string;
  network: string;
  permissions: WalletPermissions;
  createdAt: string;
  lastUsed: string;
}

export interface TransactionContext {
  identityId: string;
  walletAddress: string;
  nonce: number;
  gasPrice: string;
  chainId: number;
  permissions: WalletPermissions;
}

export interface SignatureResult {
  signature: string;
  transactionHash?: string;
  identityId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface IdentityBalances {
  identityId: string;
  walletAddress: string;
  balances: TokenBalance[];
  totalValueUSD: number;
  lastUpdated: string;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: number;
  decimals: number;
  valueUSD: number;
  contractAddress?: string;
}

// Enhanced interfaces for the new functionality

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
}

export interface WalletLimits {
  dailyTransferLimit: number;
  monthlyTransferLimit: number;
  maxTransactionAmount: number;
  maxTransactionsPerHour: number;
  allowedTokens: string[];
  restrictedAddresses: string[];
  requiresApprovalAbove: number;
  dynamicLimitsEnabled?: boolean;
  governanceControlled?: boolean;
  policyId?: string;
  daoOverrides?: Record<string, any>;
}

export interface SecuritySettings {
  requiresDeviceVerification: boolean;
  requiresMultiSig: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  suspiciousActivityThreshold: number;
  autoFreezeOnSuspiciousActivity: boolean;
}

export interface PrivacySettings {
  logTransactions: boolean;
  shareWithAnalytics: boolean;
  anonymizeMetadata: boolean;
  ephemeralStorage: boolean;
  dataRetentionPeriod: number;
}

export interface AuditSettings {
  enableAuditLogging: boolean;
  logLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retentionPeriod: number;
  complianceReporting: boolean;
  qerberosIntegration: boolean;
}

export interface PiWalletConfig {
  enabled: boolean;
  piUserId?: string;
  piWalletAddress?: string;
  linkedAt?: string;
  permissions: string[];
  transferLimits: {
    dailyLimit: number;
    maxTransactionAmount: number;
  };
}

export interface PiWalletData {
  piUserId: string;
  piWalletAddress: string;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
  linkedAt: string;
  lastSync: string;
  syncErrors: string[];
}

export interface PiWalletStatus {
  connected: boolean;
  balance: number;
  lastSync: string;
  connectionError?: string;
  supportedOperations: string[];
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  amount: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  error?: string;
  fees?: number;
}

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  chain: 'PI' | 'ANARQ' | 'ETH' | 'BTC' | 'FILECOIN' | 'CUSTOM';
  decimals: number;
  iconUrl?: string;
  governanceRequired?: boolean;
  contractAddress?: string;
  metadata?: Record<string, any>;
}

export interface CustomTokenConfig {
  tokenId: string;
  name: string;
  symbol: string;
  chain: string;
  contractAddress: string;
  decimals: number;
  iconUrl?: string;
  addedBy: string;
  addedAt: string;
  verified: boolean;
  governanceApproved?: boolean;
}

export interface WalletAuditLog {
  id: string;
  identityId: string;
  operation: string;
  operationType: 'TRANSFER' | 'MINT' | 'SIGN' | 'DEFI' | 'DAO_CREATE' | 'DAO_VOTE' | 'CONFIG_CHANGE' | 'EMERGENCY';
  amount?: number;
  token?: string;
  recipient?: string;
  timestamp: string;
  success: boolean;
  error?: string;
  riskScore: number;
  metadata: {
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    geolocation?: string;
    sessionId: string;
    chain?: string;
    configChanges?: string[];
    [key: string]: any;
  };
  qerberosLogId?: string;
}

export interface RiskAssessment {
  identityId: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  recommendations: string[];
  lastAssessment: string;
  nextAssessment: string;
  autoActions: AutoAction[];
  reputationScore?: number;
  reputationTier?: 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED';
  trustedByDAOs?: string[];
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

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ComplianceReport {
  identityId: string;
  period: DateRange;
  totalTransactions: number;
  totalVolume: number;
  riskEvents: number;
  complianceViolations: string[];
  auditTrail: WalletAuditLog[];
  generatedAt: string;
  reportId: string;
}

export interface GovernanceRequest {
  requestId: string;
  identityId: string;
  operation: WalletOperation;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvers: string[];
  requiredApprovals: number;
  currentApprovals: number;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface GovernanceStatus {
  requestId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvals: Array<{
    approverId: string;
    approvedAt: string;
    decision: boolean;
    reason?: string;
  }>;
  lastUpdated: string;
}

export class IdentityQwalletService implements EnhancedQwalletServiceInterface {
  private walletContexts: Map<string, WalletContext> = new Map();
  private activeWalletContext: string | null = null;
  private walletPermissions: Map<string, WalletPermissions> = new Map();
  
  // Enhanced storage for new functionality
  private walletConfigs: Map<string, IdentityWalletConfig> = new Map();
  private piWalletData: Map<string, PiWalletData> = new Map();
  private auditLogs: Map<string, WalletAuditLog[]> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private governanceRequests: Map<string, GovernanceRequest> = new Map();
  private supportedTokens: Map<string, TokenInfo[]> = new Map();

  constructor() {
    this.loadDataFromStorage();
    this.loadEnhancedDataFromStorage();
  }

  // Enhanced Wallet Configuration Management Methods

  /**
   * Get identity wallet configuration - delegates to WalletConfigService
   */
  async getIdentityWalletConfig(identityId: string): Promise<IdentityWalletConfig> {
    try {
      return await walletConfigService.getWalletConfig(identityId);
    } catch (error) {
      console.error('[IdentityQwalletService] Error getting wallet config:', error);
      throw new Error(`Failed to get wallet config for identity: ${identityId}`);
    }
  }

  /**
   * Update identity wallet configuration - delegates to WalletConfigService
   */
  async updateIdentityWalletConfig(identityId: string, config: Partial<IdentityWalletConfig>): Promise<boolean> {
    try {
      const success = await walletConfigService.updateWalletConfig(identityId, config);
      
      // Update related data structures if permissions changed
      if (success && config.permissions) {
        await this.updateWalletPermissions(identityId, config.permissions);
      }

      // Log configuration change
      if (success) {
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'CONFIG_UPDATE',
          operationType: 'CONFIG_CHANGE',
          timestamp: new Date().toISOString(),
          success: true,
          riskScore: 0.1,
          metadata: {
            sessionId: this.generateSessionId(),
            configChanges: Object.keys(config)
          }
        });
      }

      console.log(`[IdentityQwalletService] Updated wallet config for identity: ${identityId}`);
      return success;
    } catch (error) {
      console.error('[IdentityQwalletService] Error updating wallet config:', error);
      return false;
    }
  }

  /**
   * Update identity wallet limits - delegates to WalletConfigService
   */
  async updateIdentityLimits(identityId: string, limits: WalletLimits): Promise<boolean> {
    try {
      return await walletConfigService.updateDynamicLimits(identityId, limits);
    } catch (error) {
      console.error('[IdentityQwalletService] Error updating wallet limits:', error);
      return false;
    }
  }

  // Pi Wallet Integration - delegates to PiWalletService
  async linkPiWallet(identityId: string, piWalletData: PiWalletData): Promise<boolean> {
    try {
      const success = await piWalletService.linkPiWallet(identityId, piWalletData);
      
      if (success) {
        // Log the linking operation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'PI_WALLET_LINK',
          operationType: 'CONFIG_CHANGE',
          timestamp: new Date().toISOString(),
          success: true,
          riskScore: 0.2,
          metadata: {
            sessionId: this.generateSessionId(),
            piUserId: piWalletData.piUserId,
            piWalletAddress: piWalletData.piWalletAddress
          }
        });
      }

      console.log(`[IdentityQwalletService] Pi Wallet linking for identity: ${identityId} - ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    } catch (error) {
      console.error('[IdentityQwalletService] Error linking Pi Wallet:', error);
      return false;
    }
  }

  async unlinkPiWallet(identityId: string): Promise<boolean> {
    try {
      const success = await piWalletService.unlinkPiWallet(identityId);
      
      if (success) {
        // Log the unlinking operation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'PI_WALLET_UNLINK',
          operationType: 'CONFIG_CHANGE',
          timestamp: new Date().toISOString(),
          success: true,
          riskScore: 0.1,
          metadata: {
            sessionId: this.generateSessionId()
          }
        });
      }

      console.log(`[IdentityQwalletService] Pi Wallet unlinking for identity: ${identityId} - ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    } catch (error) {
      console.error('[IdentityQwalletService] Error unlinking Pi Wallet:', error);
      return false;
    }
  }

  async transferToPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult> {
    try {
      // Validate wallet operation first
      const isValid = await this.validateWalletOperation(identityId, {
        type: 'TRANSFER',
        amount,
        token
      });

      if (!isValid) {
        const result: TransferResult = {
          success: false,
          amount,
          token,
          fromAddress: `squid_${identityId}`,
          toAddress: 'pi_wallet',
          timestamp: new Date().toISOString(),
          error: 'Transfer not permitted by wallet permissions'
        };

        // Log failed validation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'PI_WALLET_TRANSFER_TO_BLOCKED',
          operationType: 'TRANSFER',
          amount,
          token,
          timestamp: new Date().toISOString(),
          success: false,
          error: result.error,
          riskScore: 0.8,
          metadata: {
            sessionId: this.generateSessionId(),
            reason: 'Permission validation failed'
          }
        });

        return result;
      }

      // Delegate to Pi Wallet service
      const result = await piWalletService.transferToPiWallet(identityId, amount, token);
      
      // Log the transfer operation
      await this.logWalletOperation({
        id: this.generateId(),
        identityId,
        operation: 'PI_WALLET_TRANSFER_TO',
        operationType: 'TRANSFER',
        amount,
        token,
        recipient: result.toAddress,
        timestamp: new Date().toISOString(),
        success: result.success,
        error: result.error,
        riskScore: amount > 1000 ? 0.6 : 0.3,
        metadata: {
          sessionId: this.generateSessionId(),
          transactionHash: result.transactionHash,
          fees: result.fees
        }
      });

      return result;
    } catch (error) {
      console.error('[IdentityQwalletService] Error transferring to Pi Wallet:', error);
      
      const result: TransferResult = {
        success: false,
        amount,
        token,
        fromAddress: `squid_${identityId}`,
        toAddress: 'pi_wallet',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };

      return result;
    }
  }

  async transferFromPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult> {
    try {
      // Validate wallet operation first
      const isValid = await this.validateWalletOperation(identityId, {
        type: 'TRANSFER',
        amount,
        token
      });

      if (!isValid) {
        const result: TransferResult = {
          success: false,
          amount,
          token,
          fromAddress: 'pi_wallet',
          toAddress: `squid_${identityId}`,
          timestamp: new Date().toISOString(),
          error: 'Transfer not permitted by wallet permissions'
        };

        // Log failed validation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'PI_WALLET_TRANSFER_FROM_BLOCKED',
          operationType: 'TRANSFER',
          amount,
          token,
          timestamp: new Date().toISOString(),
          success: false,
          error: result.error,
          riskScore: 0.8,
          metadata: {
            sessionId: this.generateSessionId(),
            reason: 'Permission validation failed'
          }
        });

        return result;
      }

      // Delegate to Pi Wallet service
      const result = await piWalletService.transferFromPiWallet(identityId, amount, token);
      
      // Log the transfer operation
      await this.logWalletOperation({
        id: this.generateId(),
        identityId,
        operation: 'PI_WALLET_TRANSFER_FROM',
        operationType: 'TRANSFER',
        amount,
        token,
        recipient: result.toAddress,
        timestamp: new Date().toISOString(),
        success: result.success,
        error: result.error,
        riskScore: amount > 1000 ? 0.6 : 0.3,
        metadata: {
          sessionId: this.generateSessionId(),
          transactionHash: result.transactionHash,
          fees: result.fees
        }
      });

      return result;
    } catch (error) {
      console.error('[IdentityQwalletService] Error transferring from Pi Wallet:', error);
      
      const result: TransferResult = {
        success: false,
        amount,
        token,
        fromAddress: 'pi_wallet',
        toAddress: `squid_${identityId}`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };

      return result;
    }
  }

  async getPiWalletStatus(identityId: string): Promise<PiWalletStatus | null> {
    try {
      return await piWalletService.getPiWalletStatus(identityId);
    } catch (error) {
      console.error('[IdentityQwalletService] Error getting Pi Wallet status:', error);
      return null;
    }
  }

  async logWalletOperation(operation: WalletAuditLog): Promise<void> {
    const logs = this.auditLogs.get(operation.identityId) || [];
    logs.push(operation);
    this.auditLogs.set(operation.identityId, logs);
    await this.saveEnhancedDataToStorage();
  }

  async getRiskAssessment(identityId: string): Promise<RiskAssessment> {
    return {
      identityId,
      overallRisk: 'LOW',
      riskFactors: [],
      recommendations: [],
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      autoActions: []
    };
  }

  async generateComplianceReport(identityId: string, period: DateRange): Promise<ComplianceReport> {
    return {
      identityId,
      period,
      totalTransactions: 0,
      totalVolume: 0,
      riskEvents: 0,
      complianceViolations: [],
      auditTrail: [],
      generatedAt: new Date().toISOString(),
      reportId: this.generateId()
    };
  }

  async getSupportedTokens(identityId: string): Promise<TokenInfo[]> {
    try {
      const { multiChainTokenService } = await import('./MultiChainTokenService');
      return await multiChainTokenService.getSupportedTokens(identityId);
    } catch (error) {
      console.error('[IdentityQwalletService] Error getting supported tokens:', error);
      // Fallback to default tokens
      return [
        {
          tokenId: 'eth',
          name: 'Ethereum',
          symbol: 'ETH',
          chain: 'ETH',
          decimals: 18,
          verified: true,
          riskLevel: 'LOW',
          governanceApproved: true,
          addedBy: 'system',
          addedAt: new Date().toISOString(),
          allowedIdentityTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE]
        }
      ];
    }
  }

  async addCustomToken(identityId: string, tokenConfig: CustomTokenConfig): Promise<boolean> {
    try {
      const { multiChainTokenService } = await import('./MultiChainTokenService');
      const success = await multiChainTokenService.addCustomToken(identityId, tokenConfig);
      
      if (success) {
        // Log the operation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'CUSTOM_TOKEN_ADD',
          operationType: 'CONFIG_CHANGE',
          timestamp: new Date().toISOString(),
          success: true,
          riskScore: 0.3,
          metadata: {
            sessionId: this.generateSessionId(),
            tokenId: tokenConfig.tokenId,
            tokenSymbol: tokenConfig.symbol,
            tokenChain: tokenConfig.chain
          }
        });
      }
      
      console.log(`[IdentityQwalletService] Custom token ${tokenConfig.tokenId} ${success ? 'added' : 'failed to add'} for identity: ${identityId}`);
      return success;
    } catch (error) {
      console.error('[IdentityQwalletService] Error adding custom token:', error);
      return false;
    }
  }

  async removeCustomToken(identityId: string, tokenId: string): Promise<boolean> {
    try {
      const { multiChainTokenService } = await import('./MultiChainTokenService');
      const success = await multiChainTokenService.removeCustomToken(identityId, tokenId);
      
      if (success) {
        // Log the operation
        await this.logWalletOperation({
          id: this.generateId(),
          identityId,
          operation: 'CUSTOM_TOKEN_REMOVE',
          operationType: 'CONFIG_CHANGE',
          timestamp: new Date().toISOString(),
          success: true,
          riskScore: 0.2,
          metadata: {
            sessionId: this.generateSessionId(),
            tokenId
          }
        });
      }
      
      console.log(`[IdentityQwalletService] Custom token ${tokenId} ${success ? 'removed' : 'failed to remove'} for identity: ${identityId}`);
      return success;
    } catch (error) {
      console.error('[IdentityQwalletService] Error removing custom token:', error);
      return false;
    }
  }

  async validateTokenSupport(identityId: string, tokenId: string): Promise<boolean> {
    try {
      const { multiChainTokenService } = await import('./MultiChainTokenService');
      const tokenInfo = await multiChainTokenService.getTokenInfo(tokenId);
      
      if (!tokenInfo) {
        return false;
      }
      
      // Check if token is supported for this identity type
      const identityType = this.determineIdentityType(identityId);
      const isAllowed = tokenInfo.allowedIdentityTypes.includes(identityType);
      
      // Check governance approval
      const isApproved = tokenInfo.governanceApproved;
      
      // Check risk level restrictions
      const riskAllowed = tokenInfo.riskLevel !== 'CRITICAL';
      
      const isSupported = isAllowed && isApproved && riskAllowed;
      
      console.log(`[IdentityQwalletService] Token ${tokenId} validation for identity ${identityId}: ${isSupported}`);
      return isSupported;
    } catch (error) {
      console.error('[IdentityQwalletService] Error validating token support:', error);
      return false;
    }
  }

  async freezeWallet(identityId: string, reason: string): Promise<boolean> {
    try {
      const { emergencyControlsService } = await import('./EmergencyControlsService');
      const currentIdentity = this.activeWalletContext || 'system';
      return await emergencyControlsService.freezeWallet(identityId, reason, currentIdentity);
    } catch (error) {
      console.error(`[IdentityQwalletService] Error freezing wallet for identity: ${identityId}`, error);
      return false;
    }
  }

  async unfreezeWallet(identityId: string): Promise<boolean> {
    try {
      const { emergencyControlsService } = await import('./EmergencyControlsService');
      const currentIdentity = this.activeWalletContext || 'system';
      return await emergencyControlsService.unfreezeWallet(identityId, currentIdentity);
    } catch (error) {
      console.error(`[IdentityQwalletService] Error unfreezing wallet for identity: ${identityId}`, error);
      return false;
    }
  }

  async isWalletFrozen(identityId: string): Promise<boolean> {
    try {
      const { emergencyControlsService } = await import('./EmergencyControlsService');
      return await emergencyControlsService.isWalletFrozen(identityId);
    } catch (error) {
      console.error(`[IdentityQwalletService] Error checking wallet freeze status for identity: ${identityId}`, error);
      return false;
    }
  }

  async requestGovernanceApproval(identityId: string, operation: WalletOperation): Promise<GovernanceRequest> {
    const requestId = this.generateId();
    const request: GovernanceRequest = {
      requestId,
      identityId,
      operation,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      approvers: [],
      requiredApprovals: 2,
      currentApprovals: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    this.governanceRequests.set(requestId, request);
    await this.saveEnhancedDataToStorage();
    return request;
  }

  async checkGovernanceStatus(requestId: string): Promise<GovernanceStatus> {
    const request = this.governanceRequests.get(requestId);
    if (!request) {
      throw new Error(`Governance request not found: ${requestId}`);
    }

    return {
      requestId,
      status: request.status,
      approvals: [],
      lastUpdated: new Date().toISOString()
    };
  }

  async applyGovernanceDecision(requestId: string, approved: boolean): Promise<boolean> {
    const request = this.governanceRequests.get(requestId);
    if (!request) {
      return false;
    }

    request.status = approved ? 'APPROVED' : 'REJECTED';
    this.governanceRequests.set(requestId, request);
    await this.saveEnhancedDataToStorage();
    return true;
  }

  // Base service methods (simplified implementations)
  async switchWalletContext(fromIdentityId: string, toIdentityId: string): Promise<boolean> {
    this.activeWalletContext = toIdentityId;
    sessionStorage.setItem('active_wallet_context', toIdentityId);
    console.log(`[IdentityQwalletService] Switched wallet context from ${fromIdentityId} to ${toIdentityId}`);
    return true;
  }

  async getActiveWalletContext(): Promise<string | null> {
    return this.activeWalletContext || sessionStorage.getItem('active_wallet_context');
  }

  async setActiveWalletContext(identityId: string): Promise<boolean> {
    this.activeWalletContext = identityId;
    sessionStorage.setItem('active_wallet_context', identityId);
    return true;
  }

  async getWalletPermissions(identityId: string): Promise<WalletPermissions> {
    const permissions = this.walletPermissions.get(identityId);
    if (permissions) {
      return permissions;
    }
    
    // Return default permissions based on identity type
    const identityType = this.determineIdentityType(identityId);
    return this.getDefaultPermissions(identityType);
  }

  async updateWalletPermissions(identityId: string, permissions: Partial<WalletPermissions>): Promise<boolean> {
    const currentPermissions = await this.getWalletPermissions(identityId);
    const updatedPermissions = { ...currentPermissions, ...permissions };
    this.walletPermissions.set(identityId, updatedPermissions);
    await this.saveDataToStorage();
    return true;
  }

  async validateWalletOperation(identityId: string, operation: WalletOperation): Promise<boolean> {
    const permissions = await this.getWalletPermissions(identityId);
    
    switch (operation.type) {
      case 'TRANSFER':
        return permissions.canTransfer && 
               (operation.amount || 0) <= permissions.maxTransactionAmount &&
               (!operation.token || permissions.allowedTokens.includes(operation.token));
      case 'MINT':
        return permissions.canMintNFT;
      case 'SIGN':
        return permissions.canSignTransactions;
      case 'DEFI':
        return permissions.canAccessDeFi;
      case 'DAO_CREATE':
      case 'DAO_VOTE':
        return permissions.canCreateDAO;
      default:
        return false;
    }
  }

  async updateWalletContextOnSwitch(identityId: string): Promise<boolean> {
    console.log(`[IdentityQwalletService] Updated wallet context for identity: ${identityId}`);
    return true;
  }

  async syncWalletState(identityId: string): Promise<boolean> {
    console.log(`[IdentityQwalletService] Synced wallet state for identity: ${identityId}`);
    return true;
  }

  async getWalletAddressForIdentity(identityId: string): Promise<string | null> {
    const context = this.walletContexts.get(identityId);
    return context?.walletAddress || null;
  }

  async createWalletForIdentity(identity: ExtendedSquidIdentity): Promise<WalletContext> {
    const walletAddress = this.generateWalletAddress(identity.did);
    const permissions = this.getDefaultPermissions(identity.type);

    const walletContext: WalletContext = {
      identityId: identity.did,
      walletAddress,
      privateKey: 'encrypted_mock_key',
      publicKey: 'mock_public_key',
      network: 'mainnet',
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    this.walletContexts.set(identity.did, walletContext);
    await this.saveDataToStorage();
    return walletContext;
  }

  async linkWalletToIdentity(identityId: string, walletAddress: string): Promise<boolean> {
    console.log(`[IdentityQwalletService] Linked wallet ${walletAddress} to identity: ${identityId}`);
    return true;
  }

  async getTransactionContext(identityId: string): Promise<TransactionContext> {
    const permissions = await this.getWalletPermissions(identityId);
    const walletAddress = await this.getWalletAddressForIdentity(identityId) || '';

    return {
      identityId,
      walletAddress,
      nonce: Math.floor(Math.random() * 1000),
      gasPrice: '20000000000',
      chainId: 1,
      permissions
    };
  }

  async signTransactionForIdentity(identityId: string, transaction: any): Promise<SignatureResult> {
    try {
      // Validate wallet operation first
      const isValid = await this.validateWalletOperation(identityId, { type: 'SIGN', metadata: transaction });
      
      if (!isValid) {
        const error = new WalletPermissionError(
          'Transaction signing not permitted',
          identityId,
          'sign'
        );
        
        const result = await walletErrorHandler.handleError(error, {
          requestId: this.generateId(),
          sessionId: this.generateSessionId(),
          identityId,
          operation: 'sign',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV as any || 'development'
        });

        return {
          signature: '',
          identityId,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.userMessage
        };
      }

      // Use Qlock service for signing with error handling
      const signatureResult = await walletErrorRecoveryUtils.executeWithRecovery(
        () => qlockWalletService.signTransactionForIdentity(identityId, transaction),
        walletErrorRecoveryUtils.createRecoveryContext(
          identityId,
          this.determineIdentityType(identityId),
          'sign_transaction',
          { transaction }
        )
      );

      // Log successful signing
      await this.logWalletOperation({
        id: this.generateId(),
        identityId,
        operation: 'TRANSACTION_SIGN',
        operationType: 'SIGN',
        timestamp: new Date().toISOString(),
        success: signatureResult.success,
        riskScore: 0.2,
        metadata: {
          sessionId: this.generateSessionId(),
          transactionHash: signatureResult.transactionHash
        }
      });

      return signatureResult;
    } catch (error) {
      // Handle signing errors with comprehensive error handling
      const walletError = new WalletServiceError(
        error instanceof Error ? error.message : 'Transaction signing failed',
        'QLOCK',
        identityId,
        'sign'
      );

      await walletErrorHandler.handleError(walletError, {
        requestId: this.generateId(),
        sessionId: this.generateSessionId(),
        identityId,
        operation: 'sign',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV as any || 'development'
      });

      return {
        signature: '',
        identityId,
        timestamp: new Date().toISOString(),
        success: false,
        error: walletError.userMessage
      };
    }
  }

  async getBalancesForIdentity(identityId: string): Promise<IdentityBalances> {
    const walletAddress = await this.getWalletAddressForIdentity(identityId) || '';
    
    return {
      identityId,
      walletAddress,
      balances: [
        {
          token: 'ETH',
          symbol: 'ETH',
          balance: Math.random() * 10,
          decimals: 18,
          valueUSD: Math.random() * 20000
        }
      ],
      totalValueUSD: Math.random() * 20000,
      lastUpdated: new Date().toISOString()
    };
  }

  async transferBetweenIdentities(fromId: string, toId: string, amount: number, token: string): Promise<boolean> {
    const isValid = await this.validateWalletOperation(fromId, {
      type: 'TRANSFER',
      amount,
      token
    });
    
    console.log(`[IdentityQwalletService] Transfer ${amount} ${token} from ${fromId} to ${toId}: ${isValid}`);
    return isValid;
  }

  async syncWithQlock(identityId: string): Promise<boolean> {
    try {
      // Check if Qlock service is available
      const isAvailable = await qlockWalletService.isQlockAvailable();
      if (!isAvailable) {
        console.warn(`[IdentityQwalletService] Qlock unavailable for sync with identity: ${identityId}`);
        return false;
      }

      // Validate key access for the identity
      const hasKeyAccess = await qlockWalletService.validateKeyAccess(identityId);
      if (!hasKeyAccess) {
        console.warn(`[IdentityQwalletService] No key access for identity: ${identityId}`);
        return false;
      }

      // Get signing keys to verify sync
      const keys = await qlockWalletService.getSigningKeys(identityId);
      if (!keys) {
        console.warn(`[IdentityQwalletService] No signing keys found for identity: ${identityId}`);
        return false;
      }

      // Check service health
      const health = await qlockWalletService.checkServiceHealth();
      if (!health.available) {
        console.warn(`[IdentityQwalletService] Qlock service health check failed for identity: ${identityId}`);
        return false;
      }

      console.log(`[IdentityQwalletService] Successfully synced with Qlock for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error(`[IdentityQwalletService] Error syncing with Qlock for identity ${identityId}:`, error);
      return false;
    }
  }

  async syncWithQonsent(identityId: string): Promise<boolean> {
    console.log(`[IdentityQwalletService] Synced with Qonsent for identity: ${identityId}`);
    return true;
  }

  // Private helper methods

  private determineIdentityType(identityId: string): IdentityType {
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    return IdentityType.AID;
  }

  private createDefaultWalletConfig(identityId: string, identityType: IdentityType): IdentityWalletConfig {
    return {
      identityId,
      identityType,
      permissions: this.getDefaultPermissions(identityType),
      limits: this.getDefaultLimits(identityType),
      securitySettings: this.getDefaultSecuritySettings(identityType),
      privacySettings: this.getDefaultPrivacySettings(identityType),
      auditSettings: this.getDefaultAuditSettings(identityType),
      customTokens: [],
      frozen: false
    };
  }

  private getDefaultPermissions(identityType: IdentityType): WalletPermissions {
    switch (identityType) {
      case IdentityType.ROOT:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: true,
          canSignTransactions: true,
          canAccessDeFi: true,
          canCreateDAO: true,
          maxTransactionAmount: 1000000,
          allowedTokens: ['ETH', 'QToken', 'PI', 'USDC', 'DAI'],
          restrictedOperations: [],
          governanceLevel: 'FULL'
        };
      case IdentityType.DAO:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: true,
          canSignTransactions: true,
          canAccessDeFi: true,
          canCreateDAO: false,
          maxTransactionAmount: 100000,
          allowedTokens: ['ETH', 'QToken', 'PI'],
          restrictedOperations: [],
          governanceLevel: 'LIMITED'
        };
      case IdentityType.ENTERPRISE:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: true,
          canSignTransactions: true,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 50000,
          allowedTokens: ['ETH', 'QToken'],
          restrictedOperations: ['DEFI'],
          governanceLevel: 'LIMITED'
        };
      case IdentityType.CONSENTIDA:
        return {
          canTransfer: false,
          canReceive: true,
          canMintNFT: false,
          canSignTransactions: false,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 100,
          allowedTokens: ['QToken'],
          restrictedOperations: ['TRANSFER', 'MINT', 'SIGN', 'DEFI', 'DAO_CREATE'],
          governanceLevel: 'READ_ONLY'
        };
      case IdentityType.AID:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: false,
          canSignTransactions: true,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 1000,
          allowedTokens: ['ETH'],
          restrictedOperations: ['MINT', 'DEFI', 'DAO_CREATE'],
          governanceLevel: 'LIMITED'
        };
      default:
        return {
          canTransfer: false,
          canReceive: false,
          canMintNFT: false,
          canSignTransactions: false,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 0,
          allowedTokens: [],
          restrictedOperations: ['TRANSFER', 'MINT', 'SIGN', 'DEFI', 'DAO_CREATE'],
          governanceLevel: 'READ_ONLY'
        };
    }
  }

  private getDefaultLimits(identityType: IdentityType): WalletLimits {
    switch (identityType) {
      case IdentityType.ROOT:
        return {
          dailyTransferLimit: 100000,
          monthlyTransferLimit: 1000000,
          maxTransactionAmount: 50000,
          maxTransactionsPerHour: 100,
          allowedTokens: ['ETH', 'QToken', 'PI', 'USDC', 'DAI'],
          restrictedAddresses: [],
          requiresApprovalAbove: 10000,
          dynamicLimitsEnabled: true,
          governanceControlled: false
        };
      case IdentityType.DAO:
        return {
          dailyTransferLimit: 50000,
          monthlyTransferLimit: 500000,
          maxTransactionAmount: 25000,
          maxTransactionsPerHour: 50,
          allowedTokens: ['ETH', 'QToken', 'PI'],
          restrictedAddresses: [],
          requiresApprovalAbove: 5000,
          dynamicLimitsEnabled: true,
          governanceControlled: true
        };
      default:
        return {
          dailyTransferLimit: 1000,
          monthlyTransferLimit: 10000,
          maxTransactionAmount: 500,
          maxTransactionsPerHour: 10,
          allowedTokens: ['ETH'],
          restrictedAddresses: [],
          requiresApprovalAbove: 100,
          dynamicLimitsEnabled: false,
          governanceControlled: false
        };
    }
  }

  private getDefaultSecuritySettings(identityType: IdentityType): SecuritySettings {
    return {
      requiresDeviceVerification: true,
      requiresMultiSig: false,
      sessionTimeout: 3600,
      maxConcurrentSessions: 3,
      suspiciousActivityThreshold: 0.7,
      autoFreezeOnSuspiciousActivity: false
    };
  }

  private getDefaultPrivacySettings(identityType: IdentityType): PrivacySettings {
    return {
      logTransactions: true,
      shareWithAnalytics: false,
      anonymizeMetadata: true,
      ephemeralStorage: identityType === IdentityType.AID,
      dataRetentionPeriod: 365
    };
  }

  private getDefaultAuditSettings(identityType: IdentityType): AuditSettings {
    return {
      enableAuditLogging: true,
      logLevel: 'MEDIUM',
      retentionPeriod: 365,
      complianceReporting: false,
      qerberosIntegration: false
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private generateSessionId(): string {
    return 'session_' + this.generateId();
  }

  private generateWalletAddress(did: string): string {
    const hash = this.simpleHash(did + Date.now().toString());
    const paddedHash = hash.padStart(8, '0').repeat(5).substring(0, 40);
    return '0x' + paddedHash;
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // Enhanced storage methods
  private async loadEnhancedDataFromStorage(): Promise<void> {
    try {
      const enhancedData = localStorage.getItem('enhanced_identity_qwallet_data');
      if (enhancedData) {
        const parsed = JSON.parse(enhancedData);
        this.walletConfigs = new Map(Object.entries(parsed.configs || {}));
        this.piWalletData = new Map(Object.entries(parsed.piWalletData || {}));
        this.auditLogs = new Map(Object.entries(parsed.auditLogs || {}));
        this.riskAssessments = new Map(Object.entries(parsed.riskAssessments || {}));
        this.governanceRequests = new Map(Object.entries(parsed.governanceRequests || {}));
        this.supportedTokens = new Map(Object.entries(parsed.supportedTokens || {}));
        console.log(`[IdentityQwalletService] Loaded enhanced data from storage`);
      }
    } catch (error) {
      console.error('[IdentityQwalletService] Error loading enhanced data from storage:', error);
    }
  }

  private async saveEnhancedDataToStorage(): Promise<void> {
    try {
      const data = {
        configs: Object.fromEntries(this.walletConfigs),
        piWalletData: Object.fromEntries(this.piWalletData),
        auditLogs: Object.fromEntries(this.auditLogs),
        riskAssessments: Object.fromEntries(this.riskAssessments),
        governanceRequests: Object.fromEntries(this.governanceRequests),
        supportedTokens: Object.fromEntries(this.supportedTokens)
      };
      localStorage.setItem('enhanced_identity_qwallet_data', JSON.stringify(data));
    } catch (error) {
      console.error('[IdentityQwalletService] Error saving enhanced data to storage:', error);
    }
  }

  private async loadDataFromStorage(): Promise<void> {
    try {
      const contextData = localStorage.getItem('identity_qwallet_contexts');
      if (contextData) {
        const parsed = JSON.parse(contextData);
        this.walletContexts = new Map(Object.entries(parsed.contexts || {}));
        this.walletPermissions = new Map(Object.entries(parsed.permissions || {}));
        console.log(`[IdentityQwalletService] Loaded ${this.walletContexts.size} wallet contexts from storage`);
      }

      this.activeWalletContext = sessionStorage.getItem('active_wallet_context');
    } catch (error) {
      console.error('[IdentityQwalletService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        contexts: Object.fromEntries(this.walletContexts),
        permissions: Object.fromEntries(this.walletPermissions)
      };
      localStorage.setItem('identity_qwallet_contexts', JSON.stringify(data));
      
      // Also save enhanced data
      await this.saveEnhancedDataToStorage();
    } catch (error) {
      console.error('[IdentityQwalletService] Error saving data to storage:', error);
    }
  }
}

// Singleton instance
export const identityQwalletService = new IdentityQwalletService();