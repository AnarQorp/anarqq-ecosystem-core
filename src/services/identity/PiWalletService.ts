/**
 * Pi Wallet Integration Service
 * Manages Pi Wallet connections, linking/unlinking, transfers, and status monitoring
 * with full identity validation and error handling
 */

import { IdentityType } from '../../types/identity';
import { 
  PiWalletConfig, 
  PiWalletData, 
  PiWalletStatus, 
  TransferResult,
  WalletAuditLog 
} from '../../types/wallet-config';

// Pi Wallet API interfaces
export interface PiWalletConnection {
  piUserId: string;
  piWalletAddress: string;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
  connectedAt: string;
  lastActivity: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED';
}

export interface PiTransferRequest {
  amount: number;
  memo?: string;
  recipientId: string;
  metadata: {
    squidIdentityId: string;
    transactionType: 'DEPOSIT' | 'WITHDRAWAL';
    originalCurrency: string;
  };
}

export interface PiTransferResponse {
  success: boolean;
  transactionId?: string;
  piTransactionHash?: string;
  amount: number;
  fees: number;
  timestamp: string;
  error?: string;
  errorCode?: string;
}

export interface PiWalletBalance {
  available: number;
  locked: number;
  total: number;
  currency: 'PI';
  lastUpdated: string;
}

export interface PiWalletError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
  retryAfter?: number; // seconds
}

// Service interface
export interface PiWalletServiceInterface {
  // Connection Management
  connectPiWallet(identityId: string, piCredentials: PiWalletCredentials): Promise<PiWalletConnection>;
  disconnectPiWallet(identityId: string): Promise<boolean>;
  refreshConnection(identityId: string): Promise<boolean>;
  validateConnection(identityId: string): Promise<boolean>;
  
  // Linking Management
  linkPiWallet(identityId: string, piWalletData: PiWalletData): Promise<boolean>;
  unlinkPiWallet(identityId: string): Promise<boolean>;
  isPiWalletLinked(identityId: string): Promise<boolean>;
  getPiWalletConfig(identityId: string): Promise<PiWalletConfig | null>;
  
  // Transfer Operations
  transferToPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult>;
  transferFromPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult>;
  validateTransfer(identityId: string, amount: number, direction: 'TO_PI' | 'FROM_PI'): Promise<TransferValidation>;
  
  // Status and Monitoring
  getPiWalletStatus(identityId: string): Promise<PiWalletStatus | null>;
  getPiWalletBalance(identityId: string): Promise<PiWalletBalance | null>;
  monitorPiWalletHealth(): Promise<PiWalletHealthStatus>;
  
  // Error Handling
  handlePiWalletError(error: PiWalletError, identityId: string): Promise<ErrorRecoveryResult>;
  getLastError(identityId: string): Promise<PiWalletError | null>;
  clearErrors(identityId: string): Promise<boolean>;
}

export interface PiWalletCredentials {
  piUserId: string;
  accessToken: string;
  refreshToken?: string;
  permissions: string[];
}

export interface TransferValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedFees: number;
  estimatedTime: number; // minutes
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PiWalletHealthStatus {
  apiAvailable: boolean;
  responseTime: number;
  lastCheck: string;
  activeConnections: number;
  errorRate: number;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
}

export interface ErrorRecoveryResult {
  recovered: boolean;
  action: 'RETRY' | 'RECONNECT' | 'MANUAL_INTERVENTION' | 'DISABLE';
  message: string;
  retryAfter?: number;
}

export class PiWalletService implements PiWalletServiceInterface {
  private connections: Map<string, PiWalletConnection> = new Map();
  private piWalletConfigs: Map<string, PiWalletConfig> = new Map();
  private piWalletData: Map<string, PiWalletData> = new Map();
  private errors: Map<string, PiWalletError> = new Map();
  private healthStatus: PiWalletHealthStatus | null = null;
  
  // Mock Pi Wallet API endpoints
  private readonly PI_API_BASE = 'https://api.minepi.com/v2';
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // ms
  
  constructor() {
    this.loadDataFromStorage();
    this.initializeHealthMonitoring();
  }

  // Connection Management
  async connectPiWallet(identityId: string, piCredentials: PiWalletCredentials): Promise<PiWalletConnection> {
    try {
      // Validate identity can connect to Pi Wallet
      if (!await this.validateIdentityCanConnectPiWallet(identityId)) {
        throw new Error('Identity type not allowed to connect Pi Wallet');
      }

      // Mock Pi Wallet API connection
      const connection: PiWalletConnection = {
        piUserId: piCredentials.piUserId,
        piWalletAddress: `pi_${piCredentials.piUserId}_${Date.now()}`,
        accessToken: piCredentials.accessToken,
        refreshToken: piCredentials.refreshToken || '',
        permissions: piCredentials.permissions,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        status: 'CONNECTED'
      };

      // Validate connection with Pi Network
      const isValid = await this.validatePiWalletCredentials(piCredentials);
      if (!isValid) {
        connection.status = 'ERROR';
        throw new Error('Invalid Pi Wallet credentials');
      }

      this.connections.set(identityId, connection);
      await this.saveDataToStorage();

      // Log connection event
      await this.logPiWalletOperation(identityId, 'CONNECT', {
        piUserId: piCredentials.piUserId,
        permissions: piCredentials.permissions
      });

      console.log(`[PiWalletService] Connected Pi Wallet for identity: ${identityId}`);
      return connection;

    } catch (error) {
      const piError: PiWalletError = {
        code: 'CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown connection error',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryAfter: 30
      };
      
      this.errors.set(identityId, piError);
      await this.saveDataToStorage();
      throw error;
    }
  }

  async disconnectPiWallet(identityId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(identityId);
      if (!connection) {
        return true; // Already disconnected
      }

      // Revoke Pi Wallet access token
      await this.revokePiWalletAccess(connection.accessToken);

      // Update connection status
      connection.status = 'DISCONNECTED';
      connection.lastActivity = new Date().toISOString();
      
      this.connections.set(identityId, connection);
      await this.saveDataToStorage();

      // Log disconnection event
      await this.logPiWalletOperation(identityId, 'DISCONNECT', {
        piUserId: connection.piUserId
      });

      console.log(`[PiWalletService] Disconnected Pi Wallet for identity: ${identityId}`);
      return true;

    } catch (error) {
      console.error('[PiWalletService] Error disconnecting Pi Wallet:', error);
      return false;
    }
  }

  async refreshConnection(identityId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(identityId);
      if (!connection || !connection.refreshToken) {
        return false;
      }

      // Mock refresh token API call
      const newTokens = await this.refreshPiWalletTokens(connection.refreshToken);
      
      connection.accessToken = newTokens.accessToken;
      connection.refreshToken = newTokens.refreshToken;
      connection.lastActivity = new Date().toISOString();
      connection.status = 'CONNECTED';

      this.connections.set(identityId, connection);
      await this.saveDataToStorage();

      console.log(`[PiWalletService] Refreshed Pi Wallet connection for identity: ${identityId}`);
      return true;

    } catch (error) {
      console.error('[PiWalletService] Error refreshing Pi Wallet connection:', error);
      return false;
    }
  }

  async validateConnection(identityId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(identityId);
      if (!connection || connection.status !== 'CONNECTED') {
        return false;
      }

      // Mock Pi Wallet API validation
      const isValid = await this.validatePiWalletToken(connection.accessToken);
      
      if (!isValid) {
        connection.status = 'EXPIRED';
        this.connections.set(identityId, connection);
        await this.saveDataToStorage();
      }

      return isValid;

    } catch (error) {
      console.error('[PiWalletService] Error validating Pi Wallet connection:', error);
      return false;
    }
  }

  // Linking Management
  async linkPiWallet(identityId: string, piWalletData: PiWalletData): Promise<boolean> {
    try {
      // Validate identity type allows Pi Wallet linking
      if (!await this.validateIdentityCanLinkPiWallet(identityId)) {
        throw new Error('Identity type not allowed to link Pi Wallet');
      }

      // Validate Pi Wallet data
      if (!await this.validatePiWalletData(piWalletData)) {
        throw new Error('Invalid Pi Wallet data');
      }

      // Store Pi Wallet data
      this.piWalletData.set(identityId, {
        ...piWalletData,
        linkedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncErrors: []
      });

      // Create Pi Wallet configuration
      const piConfig: PiWalletConfig = {
        enabled: true,
        piUserId: piWalletData.piUserId,
        piWalletAddress: piWalletData.piWalletAddress,
        linkedAt: new Date().toISOString(),
        permissions: piWalletData.permissions,
        transferLimits: {
          dailyLimit: 1000, // Default limits
          maxTransactionAmount: 100,
          allowedOperations: ['transfer', 'balance']
        },
        autoSync: true,
        syncFrequency: 15, // minutes
        notifyOnTransactions: true,
        requireConfirmation: true
      };

      this.piWalletConfigs.set(identityId, piConfig);
      await this.saveDataToStorage();

      // Log linking event
      await this.logPiWalletOperation(identityId, 'LINK', {
        piUserId: piWalletData.piUserId,
        piWalletAddress: piWalletData.piWalletAddress
      });

      console.log(`[PiWalletService] Linked Pi Wallet for identity: ${identityId}`);
      return true;

    } catch (error) {
      console.error('[PiWalletService] Error linking Pi Wallet:', error);
      
      const piError: PiWalletError = {
        code: 'LINKING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown linking error',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryAfter: 60
      };
      
      this.errors.set(identityId, piError);
      await this.saveDataToStorage();
      return false;
    }
  }

  async unlinkPiWallet(identityId: string): Promise<boolean> {
    try {
      // Disconnect if connected
      await this.disconnectPiWallet(identityId);

      // Remove Pi Wallet data and configuration
      this.piWalletData.delete(identityId);
      this.piWalletConfigs.delete(identityId);
      this.connections.delete(identityId);
      this.errors.delete(identityId);

      await this.saveDataToStorage();

      // Log unlinking event
      await this.logPiWalletOperation(identityId, 'UNLINK', {});

      console.log(`[PiWalletService] Unlinked Pi Wallet for identity: ${identityId}`);
      return true;

    } catch (error) {
      console.error('[PiWalletService] Error unlinking Pi Wallet:', error);
      return false;
    }
  }

  async isPiWalletLinked(identityId: string): Promise<boolean> {
    const config = this.piWalletConfigs.get(identityId);
    return config?.enabled === true;
  }

  async getPiWalletConfig(identityId: string): Promise<PiWalletConfig | null> {
    return this.piWalletConfigs.get(identityId) || null;
  }

  // Transfer Operations
  async transferToPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult> {
    try {
      // Validate transfer
      const validation = await this.validateTransfer(identityId, amount, 'TO_PI');
      if (!validation.valid) {
        throw new Error(`Transfer validation failed: ${validation.errors.join(', ')}`);
      }

      // Check Pi Wallet connection
      const connection = this.connections.get(identityId);
      if (!connection || connection.status !== 'CONNECTED') {
        throw new Error('Pi Wallet not connected');
      }

      // Mock Pi Wallet transfer API call
      const transferRequest: PiTransferRequest = {
        amount,
        recipientId: connection.piWalletAddress,
        metadata: {
          squidIdentityId: identityId,
          transactionType: 'DEPOSIT',
          originalCurrency: token
        }
      };

      const piResponse = await this.executePiWalletTransfer(transferRequest, connection.accessToken);
      
      const result: TransferResult = {
        success: piResponse.success,
        transactionHash: piResponse.piTransactionHash,
        amount,
        token,
        fromAddress: `squid_${identityId}`,
        toAddress: connection.piWalletAddress,
        timestamp: new Date().toISOString(),
        fees: piResponse.fees,
        error: piResponse.error
      };

      // Log transfer
      await this.logPiWalletOperation(identityId, 'TRANSFER_TO_PI', {
        amount,
        token,
        transactionHash: result.transactionHash,
        success: result.success
      });

      console.log(`[PiWalletService] Transfer to Pi Wallet completed for identity: ${identityId}`);
      return result;

    } catch (error) {
      const result: TransferResult = {
        success: false,
        amount,
        token,
        fromAddress: `squid_${identityId}`,
        toAddress: 'pi_wallet',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };

      // Log failed transfer
      await this.logPiWalletOperation(identityId, 'TRANSFER_TO_PI_FAILED', {
        amount,
        token,
        error: result.error
      });

      return result;
    }
  }

  async transferFromPiWallet(identityId: string, amount: number, token: string): Promise<TransferResult> {
    try {
      // Validate transfer
      const validation = await this.validateTransfer(identityId, amount, 'FROM_PI');
      if (!validation.valid) {
        throw new Error(`Transfer validation failed: ${validation.errors.join(', ')}`);
      }

      // Check Pi Wallet connection
      const connection = this.connections.get(identityId);
      if (!connection || connection.status !== 'CONNECTED') {
        throw new Error('Pi Wallet not connected');
      }

      // Mock Pi Wallet withdrawal API call
      const transferRequest: PiTransferRequest = {
        amount,
        recipientId: `squid_${identityId}`,
        metadata: {
          squidIdentityId: identityId,
          transactionType: 'WITHDRAWAL',
          originalCurrency: token
        }
      };

      const piResponse = await this.executePiWalletWithdrawal(transferRequest, connection.accessToken);
      
      const result: TransferResult = {
        success: piResponse.success,
        transactionHash: piResponse.piTransactionHash,
        amount,
        token,
        fromAddress: connection.piWalletAddress,
        toAddress: `squid_${identityId}`,
        timestamp: new Date().toISOString(),
        fees: piResponse.fees,
        error: piResponse.error
      };

      // Log transfer
      await this.logPiWalletOperation(identityId, 'TRANSFER_FROM_PI', {
        amount,
        token,
        transactionHash: result.transactionHash,
        success: result.success
      });

      console.log(`[PiWalletService] Transfer from Pi Wallet completed for identity: ${identityId}`);
      return result;

    } catch (error) {
      const result: TransferResult = {
        success: false,
        amount,
        token,
        fromAddress: 'pi_wallet',
        toAddress: `squid_${identityId}`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };

      // Log failed transfer
      await this.logPiWalletOperation(identityId, 'TRANSFER_FROM_PI_FAILED', {
        amount,
        token,
        error: result.error
      });

      return result;
    }
  }

  async validateTransfer(identityId: string, amount: number, direction: 'TO_PI' | 'FROM_PI'): Promise<TransferValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if Pi Wallet is linked and connected
      const isLinked = await this.isPiWalletLinked(identityId);
      if (!isLinked) {
        errors.push('Pi Wallet not linked to this identity');
      }

      const isConnected = await this.validateConnection(identityId);
      if (!isConnected) {
        errors.push('Pi Wallet not connected');
      }

      // Check transfer limits
      const config = this.piWalletConfigs.get(identityId);
      if (config) {
        if (amount > config.transferLimits.maxTransactionAmount) {
          errors.push(`Amount exceeds maximum transaction limit of ${config.transferLimits.maxTransactionAmount}`);
        }

        if (amount > config.transferLimits.dailyLimit) {
          errors.push(`Amount exceeds daily limit of ${config.transferLimits.dailyLimit}`);
        }
      }

      // Check identity permissions
      const canTransfer = await this.validateIdentityCanTransferPiWallet(identityId, direction);
      if (!canTransfer) {
        errors.push('Identity does not have permission for Pi Wallet transfers');
      }

      // Risk assessment
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (amount > 1000) riskLevel = 'MEDIUM';
      if (amount > 5000) riskLevel = 'HIGH';
      if (amount > 10000) riskLevel = 'CRITICAL';

      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        warnings.push(`High-value transfer detected (${riskLevel} risk)`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        estimatedFees: amount * 0.01, // 1% fee
        estimatedTime: 5, // 5 minutes
        requiresApproval: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
        riskLevel
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      
      return {
        valid: false,
        errors,
        warnings,
        estimatedFees: 0,
        estimatedTime: 0,
        requiresApproval: false,
        riskLevel: 'CRITICAL'
      };
    }
  }

  // Status and Monitoring
  async getPiWalletStatus(identityId: string): Promise<PiWalletStatus | null> {
    try {
      const connection = this.connections.get(identityId);
      const config = this.piWalletConfigs.get(identityId);
      
      if (!config || !config.enabled) {
        return null;
      }

      const balance = await this.getPiWalletBalance(identityId);
      const lastError = this.errors.get(identityId);

      return {
        connected: connection?.status === 'CONNECTED',
        balance: balance?.available || 0,
        lastSync: connection?.lastActivity || new Date().toISOString(),
        connectionError: lastError?.message,
        supportedOperations: config.transferLimits.allowedOperations
      };

    } catch (error) {
      console.error('[PiWalletService] Error getting Pi Wallet status:', error);
      return null;
    }
  }

  async getPiWalletBalance(identityId: string): Promise<PiWalletBalance | null> {
    try {
      const connection = this.connections.get(identityId);
      if (!connection || connection.status !== 'CONNECTED') {
        return null;
      }

      // Mock Pi Wallet balance API call
      const balance = await this.fetchPiWalletBalance(connection.accessToken);
      
      return {
        available: balance.available,
        locked: balance.locked,
        total: balance.available + balance.locked,
        currency: 'PI',
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[PiWalletService] Error getting Pi Wallet balance:', error);
      return null;
    }
  }

  async monitorPiWalletHealth(): Promise<PiWalletHealthStatus> {
    try {
      const startTime = Date.now();
      
      // Mock health check API call
      const isHealthy = await this.checkPiWalletApiHealth();
      
      const responseTime = Date.now() - startTime;
      const activeConnections = Array.from(this.connections.values())
        .filter(conn => conn.status === 'CONNECTED').length;
      
      const totalConnections = this.connections.size;
      const errorConnections = Array.from(this.connections.values())
        .filter(conn => conn.status === 'ERROR').length;
      
      const errorRate = totalConnections > 0 ? errorConnections / totalConnections : 0;

      this.healthStatus = {
        apiAvailable: isHealthy,
        responseTime,
        lastCheck: new Date().toISOString(),
        activeConnections,
        errorRate,
        status: isHealthy ? (errorRate > 0.1 ? 'DEGRADED' : 'HEALTHY') : 'UNAVAILABLE'
      };

      return this.healthStatus;

    } catch (error) {
      console.error('[PiWalletService] Error monitoring Pi Wallet health:', error);
      
      this.healthStatus = {
        apiAvailable: false,
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        activeConnections: 0,
        errorRate: 1,
        status: 'UNAVAILABLE'
      };

      return this.healthStatus;
    }
  }

  // Error Handling
  async handlePiWalletError(error: PiWalletError, identityId: string): Promise<ErrorRecoveryResult> {
    try {
      this.errors.set(identityId, error);
      await this.saveDataToStorage();

      // Determine recovery action based on error code
      switch (error.code) {
        case 'CONNECTION_FAILED':
        case 'TOKEN_EXPIRED':
          // Try to refresh connection
          const refreshed = await this.refreshConnection(identityId);
          return {
            recovered: refreshed,
            action: 'RECONNECT',
            message: refreshed ? 'Connection refreshed successfully' : 'Connection refresh attempted',
            retryAfter: refreshed ? undefined : 300
          };

        case 'INSUFFICIENT_BALANCE':
          return {
            recovered: false,
            action: 'MANUAL_INTERVENTION',
            message: 'Insufficient Pi Wallet balance for transaction'
          };

        case 'RATE_LIMITED':
          return {
            recovered: false,
            action: 'RETRY',
            message: 'Rate limited by Pi Wallet API',
            retryAfter: error.retryAfter || 60
          };

        case 'API_UNAVAILABLE':
          return {
            recovered: false,
            action: 'RETRY',
            message: 'Pi Wallet API temporarily unavailable',
            retryAfter: 120
          };

        default:
          return {
            recovered: false,
            action: 'MANUAL_INTERVENTION',
            message: `Unhandled Pi Wallet error: ${error.message}`
          };
      }

    } catch (recoveryError) {
      console.error('[PiWalletService] Error during error recovery:', recoveryError);
      
      return {
        recovered: false,
        action: 'DISABLE',
        message: 'Critical error in Pi Wallet service - disabling temporarily'
      };
    }
  }

  async getLastError(identityId: string): Promise<PiWalletError | null> {
    return this.errors.get(identityId) || null;
  }

  async clearErrors(identityId: string): Promise<boolean> {
    try {
      this.errors.delete(identityId);
      await this.saveDataToStorage();
      return true;
    } catch (error) {
      console.error('[PiWalletService] Error clearing errors:', error);
      return false;
    }
  }

  // Private helper methods

  private async validateIdentityCanConnectPiWallet(identityId: string): Promise<boolean> {
    // Mock identity type validation - AID and CONSENTIDA cannot connect Pi Wallet
    const identityType = this.determineIdentityType(identityId);
    return identityType !== IdentityType.AID && identityType !== IdentityType.CONSENTIDA;
  }

  private async validateIdentityCanLinkPiWallet(identityId: string): Promise<boolean> {
    return this.validateIdentityCanConnectPiWallet(identityId);
  }

  private async validateIdentityCanTransferPiWallet(identityId: string, direction: 'TO_PI' | 'FROM_PI'): Promise<boolean> {
    const identityType = this.determineIdentityType(identityId);
    
    // CONSENTIDA identities cannot transfer
    if (identityType === IdentityType.CONSENTIDA) {
      return false;
    }

    // AID identities cannot use Pi Wallet
    if (identityType === IdentityType.AID) {
      return false;
    }

    return true;
  }

  private determineIdentityType(identityId: string): IdentityType {
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    return IdentityType.AID;
  }

  // Mock Pi Wallet API methods
  private async validatePiWalletCredentials(credentials: PiWalletCredentials): Promise<boolean> {
    // Mock validation - in real implementation, this would call Pi Wallet API
    await this.delay(500);
    return credentials.piUserId.length > 0 && credentials.accessToken.length > 0;
  }

  private async validatePiWalletToken(accessToken: string): Promise<boolean> {
    // Mock token validation
    await this.delay(200);
    return accessToken.length > 0 && !accessToken.includes('expired');
  }

  private async validatePiWalletData(piWalletData: PiWalletData): Promise<boolean> {
    // Mock data validation
    return piWalletData.piUserId.length > 0 && 
           piWalletData.piWalletAddress.length > 0 &&
           piWalletData.accessToken.length > 0;
  }

  private async revokePiWalletAccess(accessToken: string): Promise<void> {
    // Mock API call to revoke access
    await this.delay(300);
    console.log(`[PiWalletService] Revoked Pi Wallet access token: ${accessToken.substring(0, 10)}...`);
  }

  private async refreshPiWalletTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Mock token refresh
    await this.delay(400);
    return {
      accessToken: `new_access_${Date.now()}`,
      refreshToken: `new_refresh_${Date.now()}`
    };
  }

  private async executePiWalletTransfer(request: PiTransferRequest, accessToken: string): Promise<PiTransferResponse> {
    // Mock Pi Wallet transfer API
    await this.delay(1000);
    
    return {
      success: true,
      transactionId: `pi_tx_${Date.now()}`,
      piTransactionHash: `0x${Math.random().toString(16).substring(2)}`,
      amount: request.amount,
      fees: request.amount * 0.01,
      timestamp: new Date().toISOString()
    };
  }

  private async executePiWalletWithdrawal(request: PiTransferRequest, accessToken: string): Promise<PiTransferResponse> {
    // Mock Pi Wallet withdrawal API
    await this.delay(1200);
    
    return {
      success: true,
      transactionId: `pi_withdrawal_${Date.now()}`,
      piTransactionHash: `0x${Math.random().toString(16).substring(2)}`,
      amount: request.amount,
      fees: request.amount * 0.015, // Slightly higher fee for withdrawals
      timestamp: new Date().toISOString()
    };
  }

  private async fetchPiWalletBalance(accessToken: string): Promise<{ available: number; locked: number }> {
    // Mock balance API
    await this.delay(300);
    
    return {
      available: Math.random() * 1000,
      locked: Math.random() * 100
    };
  }

  private async checkPiWalletApiHealth(): Promise<boolean> {
    // Mock health check
    await this.delay(100);
    return Math.random() > 0.1; // 90% uptime simulation
  }

  private async logPiWalletOperation(identityId: string, operation: string, metadata: any): Promise<void> {
    // Mock audit logging - in real implementation, this would integrate with Qerberos
    const auditLog: WalletAuditLog = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      identityId,
      operation: `PI_WALLET_${operation}`,
      operationType: 'PI_WALLET' as any,
      timestamp: new Date().toISOString(),
      success: true,
      riskScore: 0.1,
      metadata: {
        sessionId: `session_${Date.now()}`,
        piWalletOperation: operation,
        ...metadata
      }
    };

    console.log(`[PiWalletService] Audit log:`, auditLog);
  }

  private initializeHealthMonitoring(): void {
    // Start periodic health monitoring
    setInterval(async () => {
      await this.monitorPiWalletHealth();
    }, 60000); // Check every minute
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Data persistence
  private loadDataFromStorage(): void {
    try {
      const connectionsData = localStorage.getItem('pi_wallet_connections');
      if (connectionsData) {
        const parsed = JSON.parse(connectionsData);
        this.connections = new Map(Object.entries(parsed.connections || {}));
        this.piWalletConfigs = new Map(Object.entries(parsed.configs || {}));
        this.piWalletData = new Map(Object.entries(parsed.data || {}));
        this.errors = new Map(Object.entries(parsed.errors || {}));
      }
    } catch (error) {
      console.error('[PiWalletService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        connections: Object.fromEntries(this.connections),
        configs: Object.fromEntries(this.piWalletConfigs),
        data: Object.fromEntries(this.piWalletData),
        errors: Object.fromEntries(this.errors)
      };
      
      localStorage.setItem('pi_wallet_connections', JSON.stringify(data));
    } catch (error) {
      console.error('[PiWalletService] Error saving data to storage:', error);
    }
  }
}

// Export singleton instance
export const piWalletService = new PiWalletService();