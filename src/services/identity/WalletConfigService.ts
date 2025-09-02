/**
 * Enhanced Wallet Configuration Service
 * Manages identity-aware wallet configurations with dynamic limits,
 * DAO governance integration, security settings, and sandbox testing
 */

import { 
  IdentityWalletConfig,
  WalletConfigServiceInterface,
  WalletConfigTemplate,
  ConfigChangeRequest,
  ConfigChangeHistory,
  ConfigValidationResult,
  WalletPermissions,
  WalletLimits,
  SecuritySettings,
  PrivacySettings,
  AuditSettings,
  WalletMode,
  CustomTokenConfig,
  PiWalletConfig,
  VelocityLimits,
  RiskMultipliers,
  GeofencingConfig,
  WalletConfigError,
  ConfigValidationError,
  GovernanceRequiredError,
  ConfigUpdateEvent,
  ConfigEventHandler
} from '../../types/wallet-config';

import { IdentityType, PrivacyLevel } from '../../types/identity';

export class WalletConfigService implements WalletConfigServiceInterface {
  private configs: Map<string, IdentityWalletConfig> = new Map();
  private templates: Map<IdentityType, WalletConfigTemplate> = new Map();
  private changeRequests: Map<string, ConfigChangeRequest> = new Map();
  private changeHistory: Map<string, ConfigChangeHistory[]> = new Map();
  private eventHandlers: ConfigEventHandler[] = [];

  constructor() {
    this.initializeDefaultTemplates();
    // Load configurations synchronously in constructor
    this.loadConfigsFromStorageSync();
  }

  // Configuration Management

  async getWalletConfig(identityId: string): Promise<IdentityWalletConfig> {
    try {
      let config = this.configs.get(identityId);
      
      if (!config) {
        // Create default configuration based on identity type
        const identityType = this.determineIdentityType(identityId);
        config = await this.createDefaultConfig(identityId, identityType);
        this.configs.set(identityId, config);
        this.saveConfigsToStorageSync();
      }
      
      return config;
    } catch (error) {
      console.error('[WalletConfigService] Error getting wallet config:', error);
      throw new WalletConfigError(
        `Failed to get wallet config for identity: ${identityId}`,
        'GET_CONFIG_ERROR',
        identityId,
        error
      );
    }
  }

  async updateWalletConfig(identityId: string, configUpdates: Partial<IdentityWalletConfig>): Promise<boolean> {
    try {
      const currentConfig = await this.getWalletConfig(identityId);
      
      // Validate the configuration changes
      const validationResult = await this.validateConfigChange(identityId, configUpdates);
      if (!validationResult.valid) {
        throw new ConfigValidationError(
          'Configuration validation failed',
          identityId,
          validationResult.errors
        );
      }

      // Check if governance approval is required
      const requiresGovernance = await this.checkGovernanceRequirement(identityId, configUpdates);
      if (requiresGovernance) {
        const changeRequest = await this.createConfigChangeRequest(identityId, configUpdates);
        throw new GovernanceRequiredError(
          'Configuration change requires governance approval',
          identityId,
          changeRequest.requestId
        );
      }

      // Apply the configuration changes
      const updatedConfig: IdentityWalletConfig = {
        ...currentConfig,
        ...configUpdates,
        updatedAt: new Date().toISOString(),
        version: this.incrementVersion(currentConfig.version)
      };

      // Store the updated configuration
      this.configs.set(identityId, updatedConfig);
      this.saveConfigsToStorageSync();

      // Record the change in history
      await this.recordConfigChange(identityId, currentConfig, updatedConfig, 'SYSTEM_UPDATE');

      // Emit configuration update event
      this.emitConfigUpdateEvent(identityId, configUpdates, currentConfig);

      console.log(`[WalletConfigService] Updated wallet config for identity: ${identityId}`);
      return true;
    } catch (error) {
      if (error instanceof WalletConfigError) {
        throw error;
      }
      console.error('[WalletConfigService] Error updating wallet config:', error);
      throw new WalletConfigError(
        `Failed to update wallet config for identity: ${identityId}`,
        'UPDATE_CONFIG_ERROR',
        identityId,
        error
      );
    }
  }

  async resetWalletConfig(identityId: string): Promise<boolean> {
    try {
      const identityType = this.determineIdentityType(identityId);
      const defaultConfig = await this.createDefaultConfig(identityId, identityType);
      
      this.configs.set(identityId, defaultConfig);
      await this.saveConfigsToStorage();

      console.log(`[WalletConfigService] Reset wallet config for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[WalletConfigService] Error resetting wallet config:', error);
      return false;
    }
  }

  // Template Management

  async getConfigTemplate(identityType: IdentityType): Promise<WalletConfigTemplate> {
    const template = this.templates.get(identityType);
    if (!template) {
      throw new WalletConfigError(
        `No template found for identity type: ${identityType}`,
        'TEMPLATE_NOT_FOUND'
      );
    }
    return template;
  }

  async createConfigFromTemplate(identityId: string, templateName: string): Promise<IdentityWalletConfig> {
    try {
      const identityType = this.determineIdentityType(identityId);
      const template = await this.getConfigTemplate(identityType);
      
      const config: IdentityWalletConfig = {
        identityId,
        identityType,
        permissions: { ...template.permissions },
        limits: { ...template.limits },
        securitySettings: { ...template.securitySettings },
        privacySettings: { ...template.privacySettings },
        auditSettings: { ...template.auditSettings },
        walletMode: { ...template.walletMode },
        customTokens: [],
        frozen: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      this.configs.set(identityId, config);
      await this.saveConfigsToStorage();

      return config;
    } catch (error) {
      console.error('[WalletConfigService] Error creating config from template:', error);
      throw new WalletConfigError(
        `Failed to create config from template for identity: ${identityId}`,
        'CREATE_FROM_TEMPLATE_ERROR',
        identityId,
        error
      );
    }
  }

  // Dynamic Limits

  async updateDynamicLimits(identityId: string, limits: Partial<WalletLimits>): Promise<boolean> {
    try {
      const config = await this.getWalletConfig(identityId);
      
      // Check if dynamic limits are enabled
      if (!config.limits.dynamicLimitsEnabled) {
        throw new WalletConfigError(
          'Dynamic limits are not enabled for this identity',
          'DYNAMIC_LIMITS_DISABLED',
          identityId
        );
      }

      // Apply dynamic limit updates
      const updatedLimits: WalletLimits = {
        ...config.limits,
        ...limits
      };

      return await this.updateWalletConfig(identityId, { limits: updatedLimits });
    } catch (error) {
      console.error('[WalletConfigService] Error updating dynamic limits:', error);
      return false;
    }
  }

  async applyRiskBasedLimits(identityId: string, riskLevel: string): Promise<boolean> {
    try {
      const config = await this.getWalletConfig(identityId);
      
      if (!config.limits.riskBasedAdjustments || !config.limits.riskMultipliers) {
        return false;
      }

      const multiplier = this.getRiskMultiplier(riskLevel, config.limits.riskMultipliers);
      
      const adjustedLimits: Partial<WalletLimits> = {
        dailyTransferLimit: Math.floor(config.limits.dailyTransferLimit * multiplier),
        monthlyTransferLimit: Math.floor(config.limits.monthlyTransferLimit * multiplier),
        maxTransactionAmount: Math.floor(config.limits.maxTransactionAmount * multiplier),
        maxTransactionsPerHour: Math.floor(config.limits.maxTransactionsPerHour * multiplier)
      };

      return await this.updateDynamicLimits(identityId, adjustedLimits);
    } catch (error) {
      console.error('[WalletConfigService] Error applying risk-based limits:', error);
      return false;
    }
  }

  // Governance Integration

  async requestConfigChange(request: ConfigChangeRequest): Promise<string> {
    try {
      const requestId = this.generateRequestId();
      const changeRequest: ConfigChangeRequest = {
        ...request,
        requestId,
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      this.changeRequests.set(requestId, changeRequest);
      await this.saveChangeRequestsToStorage();

      console.log(`[WalletConfigService] Created config change request: ${requestId}`);
      return requestId;
    } catch (error) {
      console.error('[WalletConfigService] Error creating config change request:', error);
      throw new WalletConfigError(
        'Failed to create configuration change request',
        'CREATE_CHANGE_REQUEST_ERROR',
        request.identityId,
        error
      );
    }
  }

  async approveConfigChange(requestId: string, approved: boolean): Promise<boolean> {
    try {
      const request = this.changeRequests.get(requestId);
      if (!request) {
        throw new WalletConfigError(
          `Configuration change request not found: ${requestId}`,
          'CHANGE_REQUEST_NOT_FOUND'
        );
      }

      // Update request status
      request.status = approved ? 'APPROVED' : 'REJECTED';
      request.reviewedAt = new Date().toISOString();
      request.reviewedBy = 'SYSTEM'; // In real implementation, this would be the approver ID

      this.changeRequests.set(requestId, request);
      await this.saveChangeRequestsToStorage();

      // If approved, apply the configuration changes
      if (approved) {
        await this.updateWalletConfig(request.identityId, request.proposedConfig);
      }

      console.log(`[WalletConfigService] ${approved ? 'Approved' : 'Rejected'} config change request: ${requestId}`);
      return true;
    } catch (error) {
      console.error('[WalletConfigService] Error approving config change:', error);
      return false;
    }
  }

  async getConfigChangeHistory(identityId: string): Promise<ConfigChangeHistory[]> {
    return this.changeHistory.get(identityId) || [];
  }

  // Validation

  async validateConfig(config: IdentityWalletConfig): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate permissions
    if (config.permissions.maxTransactionAmount <= 0) {
      errors.push('Maximum transaction amount must be greater than 0');
    }

    // Validate limits
    if (config.limits.dailyTransferLimit < config.limits.maxTransactionAmount) {
      warnings.push('Daily transfer limit is less than maximum transaction amount');
    }

    // Validate security settings
    if (config.securitySettings.sessionTimeout < 5) {
      warnings.push('Session timeout is very short (less than 5 minutes)');
    }

    // Validate privacy settings
    if (config.privacySettings.dataRetentionPeriod < 30) {
      suggestions.push('Consider increasing data retention period for better audit trails');
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (errors.length > 0) riskLevel = 'CRITICAL';
    else if (warnings.length > 2) riskLevel = 'HIGH';
    else if (warnings.length > 0) riskLevel = 'MEDIUM';

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      riskLevel
    };
  }

  async validateConfigChange(identityId: string, changes: Partial<IdentityWalletConfig>): Promise<ConfigValidationResult> {
    const currentConfig = await this.getWalletConfig(identityId);
    const proposedConfig = { ...currentConfig, ...changes };
    return await this.validateConfig(proposedConfig);
  }

  // Sandbox Mode

  async enableSandboxMode(identityId: string, modeConfig?: Partial<WalletMode>): Promise<boolean> {
    try {
      const config = await this.getWalletConfig(identityId);
      
      const sandboxMode: WalletMode = {
        ...config.walletMode,
        mode: 'SANDBOX',
        isSandbox: true,
        fakeSignatures: true,
        enableTestTransactions: true,
        testNetworkOnly: true,
        mockExternalServices: true,
        debugLogging: true,
        allowReset: true,
        preserveAuditLogs: false,
        ...modeConfig
      };

      return await this.updateWalletConfig(identityId, { walletMode: sandboxMode });
    } catch (error) {
      console.error('[WalletConfigService] Error enabling sandbox mode:', error);
      return false;
    }
  }

  async disableSandboxMode(identityId: string): Promise<boolean> {
    try {
      const config = await this.getWalletConfig(identityId);
      
      const productionMode: WalletMode = {
        ...config.walletMode,
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: false,
        preserveAuditLogs: true
      };

      return await this.updateWalletConfig(identityId, { walletMode: productionMode });
    } catch (error) {
      console.error('[WalletConfigService] Error disabling sandbox mode:', error);
      return false;
    }
  }

  async resetSandboxData(identityId: string): Promise<boolean> {
    try {
      const config = await this.getWalletConfig(identityId);
      
      if (!config.walletMode.isSandbox || !config.walletMode.allowReset) {
        throw new WalletConfigError(
          'Sandbox reset not allowed for this configuration',
          'SANDBOX_RESET_NOT_ALLOWED',
          identityId
        );
      }

      // Reset sandbox-specific data
      const resetMode: WalletMode = {
        ...config.walletMode,
        mockBalances: {},
        simulatedTime: undefined,
        testingScenario: undefined
      };

      return await this.updateWalletConfig(identityId, { walletMode: resetMode });
    } catch (error) {
      console.error('[WalletConfigService] Error resetting sandbox data:', error);
      return false;
    }
  }

  // Event Management

  addEventListener(handler: ConfigEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventListener(handler: ConfigEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  // Private Helper Methods

  private async createDefaultConfig(identityId: string, identityType: IdentityType): Promise<IdentityWalletConfig> {
    const template = await this.getConfigTemplate(identityType);
    
    return {
      identityId,
      identityType,
      permissions: { ...template.permissions },
      limits: { ...template.limits },
      securitySettings: { ...template.securitySettings },
      privacySettings: { ...template.privacySettings },
      auditSettings: { ...template.auditSettings },
      walletMode: { ...template.walletMode },
      customTokens: [],
      frozen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  private determineIdentityType(identityId: string): IdentityType {
    // In a real implementation, this would query the identity service
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    return IdentityType.AID;
  }

  private async checkGovernanceRequirement(identityId: string, changes: Partial<IdentityWalletConfig>): Promise<boolean> {
    const config = await this.getWalletConfig(identityId);
    
    // Check if limits are governance controlled and being increased
    if (config.limits.governanceControlled && changes.limits) {
      const currentLimits = config.limits;
      const proposedLimits = changes.limits;
      
      if (proposedLimits.maxTransactionAmount && proposedLimits.maxTransactionAmount > currentLimits.maxTransactionAmount) {
        return true;
      }
      if (proposedLimits.dailyTransferLimit && proposedLimits.dailyTransferLimit > currentLimits.dailyTransferLimit) {
        return true;
      }
    }

    // Check if permissions require governance approval
    if (changes.permissions && config.permissions.requiresApproval) {
      return true;
    }

    return false;
  }

  private async createConfigChangeRequest(identityId: string, changes: Partial<IdentityWalletConfig>): Promise<ConfigChangeRequest> {
    const currentConfig = await this.getWalletConfig(identityId);
    
    const request: ConfigChangeRequest = {
      requestId: this.generateRequestId(),
      identityId,
      requestedBy: 'SYSTEM', // In real implementation, this would be the user ID
      changeType: this.determineChangeType(changes),
      currentConfig: this.extractRelevantConfig(currentConfig, changes),
      proposedConfig: changes,
      justification: 'Automated configuration update',
      requiresGovernanceApproval: true,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return await this.requestConfigChange(request);
  }

  private determineChangeType(changes: Partial<IdentityWalletConfig>): 'LIMITS' | 'PERMISSIONS' | 'SECURITY' | 'PRIVACY' | 'AUDIT' {
    if (changes.limits) return 'LIMITS';
    if (changes.permissions) return 'PERMISSIONS';
    if (changes.securitySettings) return 'SECURITY';
    if (changes.privacySettings) return 'PRIVACY';
    if (changes.auditSettings) return 'AUDIT';
    return 'LIMITS'; // Default
  }

  private extractRelevantConfig(config: IdentityWalletConfig, changes: Partial<IdentityWalletConfig>): Partial<IdentityWalletConfig> {
    const relevant: Partial<IdentityWalletConfig> = {};
    
    if (changes.limits) relevant.limits = config.limits;
    if (changes.permissions) relevant.permissions = config.permissions;
    if (changes.securitySettings) relevant.securitySettings = config.securitySettings;
    if (changes.privacySettings) relevant.privacySettings = config.privacySettings;
    if (changes.auditSettings) relevant.auditSettings = config.auditSettings;
    
    return relevant;
  }

  private async recordConfigChange(
    identityId: string,
    previousConfig: IdentityWalletConfig,
    newConfig: IdentityWalletConfig,
    changedBy: string
  ): Promise<void> {
    const changeRecord: ConfigChangeHistory = {
      changeId: this.generateChangeId(),
      identityId,
      changeType: 'CONFIG_UPDATE',
      changedBy,
      changedAt: new Date().toISOString(),
      previousConfig: this.extractChangedFields(previousConfig, newConfig),
      newConfig: this.extractChangedFields(newConfig, previousConfig),
      reason: 'Configuration update',
      approved: true,
      approvedBy: changedBy
    };

    const history = this.changeHistory.get(identityId) || [];
    history.push(changeRecord);
    this.changeHistory.set(identityId, history);
    
    await this.saveChangeHistoryToStorage();
  }

  private extractChangedFields(config1: IdentityWalletConfig, config2: IdentityWalletConfig): Partial<IdentityWalletConfig> {
    const changes: Partial<IdentityWalletConfig> = {};
    
    // Compare and extract only changed fields
    if (JSON.stringify(config1.limits) !== JSON.stringify(config2.limits)) {
      changes.limits = config1.limits;
    }
    if (JSON.stringify(config1.permissions) !== JSON.stringify(config2.permissions)) {
      changes.permissions = config1.permissions;
    }
    // Add more field comparisons as needed
    
    return changes;
  }

  private emitConfigUpdateEvent(
    identityId: string,
    changes: Partial<IdentityWalletConfig>,
    previousConfig: IdentityWalletConfig
  ): void {
    const event: ConfigUpdateEvent = {
      type: this.determineChangeType(changes),
      identityId,
      timestamp: new Date().toISOString(),
      changedBy: 'SYSTEM',
      changes: changes as Record<string, any>,
      previousValues: this.extractRelevantConfig(previousConfig, changes) as Record<string, any>
    };

    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[WalletConfigService] Error in event handler:', error);
      }
    });
  }

  private getRiskMultiplier(riskLevel: string, multipliers: RiskMultipliers): number {
    switch (riskLevel.toUpperCase()) {
      case 'LOW': return multipliers.lowRisk;
      case 'MEDIUM': return multipliers.mediumRisk;
      case 'HIGH': return multipliers.highRisk;
      case 'CRITICAL': return multipliers.criticalRisk;
      default: return multipliers.mediumRisk;
    }
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `chg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Storage Methods

  private loadConfigsFromStorageSync(): void {
    try {
      const stored = localStorage.getItem('wallet_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        this.configs = new Map(Object.entries(configs));
      }
      
      // Also load change requests and history
      const storedRequests = localStorage.getItem('wallet_config_change_requests');
      if (storedRequests) {
        const requests = JSON.parse(storedRequests);
        this.changeRequests = new Map(Object.entries(requests));
      }
      
      const storedHistory = localStorage.getItem('wallet_config_change_history');
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        // Convert back to Map with arrays as values
        for (const [key, value] of Object.entries(history)) {
          this.changeHistory.set(key, value as ConfigChangeHistory[]);
        }
      }
    } catch (error) {
      console.error('[WalletConfigService] Error loading configs from storage:', error);
    }
  }

  private async loadConfigsFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('wallet_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        this.configs = new Map(Object.entries(configs));
      }
      
      // Also load change requests and history
      const storedRequests = localStorage.getItem('wallet_config_change_requests');
      if (storedRequests) {
        const requests = JSON.parse(storedRequests);
        this.changeRequests = new Map(Object.entries(requests));
      }
      
      const storedHistory = localStorage.getItem('wallet_config_change_history');
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        // Convert back to Map with arrays as values
        for (const [key, value] of Object.entries(history)) {
          this.changeHistory.set(key, value as ConfigChangeHistory[]);
        }
      }
    } catch (error) {
      console.error('[WalletConfigService] Error loading configs from storage:', error);
    }
  }

  private saveConfigsToStorageSync(): void {
    try {
      const configs = Object.fromEntries(this.configs);
      localStorage.setItem('wallet_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('[WalletConfigService] Error saving configs to storage:', error);
    }
  }

  private async saveConfigsToStorage(): Promise<void> {
    try {
      const configs = Object.fromEntries(this.configs);
      localStorage.setItem('wallet_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('[WalletConfigService] Error saving configs to storage:', error);
    }
  }

  private async saveChangeRequestsToStorage(): Promise<void> {
    try {
      const requests = Object.fromEntries(this.changeRequests);
      localStorage.setItem('wallet_config_change_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('[WalletConfigService] Error saving change requests to storage:', error);
    }
  }

  private async saveChangeHistoryToStorage(): Promise<void> {
    try {
      const history = Object.fromEntries(this.changeHistory);
      localStorage.setItem('wallet_config_change_history', JSON.stringify(history));
    } catch (error) {
      console.error('[WalletConfigService] Error saving change history to storage:', error);
    }
  }

  // Initialize Default Templates

  private initializeDefaultTemplates(): void {
    // ROOT Identity Template
    this.templates.set(IdentityType.ROOT, {
      identityType: IdentityType.ROOT,
      templateName: 'ROOT_DEFAULT',
      description: 'Default configuration for ROOT identities',
      permissions: {
        canTransfer: true,
        canReceive: true,
        canMintNFT: true,
        canSignTransactions: true,
        canAccessDeFi: true,
        canCreateDAO: true,
        maxTransactionAmount: 1000000,
        allowedTokens: ['ETH', 'QToken', 'PI', 'USDC', 'DAI'],
        restrictedOperations: [],
        governanceLevel: 'FULL',
        requiresApproval: false,
        approvalThreshold: 0
      },
      limits: {
        dailyTransferLimit: 100000,
        monthlyTransferLimit: 1000000,
        maxTransactionAmount: 50000,
        maxTransactionsPerHour: 100,
        allowedTokens: ['ETH', 'QToken', 'PI', 'USDC', 'DAI'],
        restrictedAddresses: [],
        requiresApprovalAbove: 10000,
        dynamicLimitsEnabled: true,
        governanceControlled: false,
        riskBasedAdjustments: true,
        riskMultipliers: {
          lowRisk: 1.0,
          mediumRisk: 0.7,
          highRisk: 0.3,
          criticalRisk: 0.0
        }
      },
      securitySettings: {
        requiresDeviceVerification: false,
        requiresMultiSig: false,
        sessionTimeout: 60,
        maxConcurrentSessions: 5,
        suspiciousActivityThreshold: 10,
        autoFreezeOnSuspiciousActivity: true,
        requiresBiometric: false,
        requires2FA: false,
        transactionConfirmationRequired: false,
        largeTransactionDelay: 0,
        emergencyFreeze: true
      },
      privacySettings: {
        logTransactions: true,
        shareWithAnalytics: true,
        anonymizeMetadata: false,
        ephemeralStorage: false,
        dataRetentionPeriod: 365,
        privacyLevel: PrivacyLevel.PUBLIC,
        hideBalances: false,
        hideTransactionHistory: false,
        encryptMetadata: false,
        shareWithDAOs: true,
        shareWithParent: false,
        shareWithGovernance: true,
        complianceDataSharing: true,
        auditDataRetention: 2555 // 7 years
      },
      auditSettings: {
        enableAuditLogging: true,
        logLevel: 'HIGH',
        retentionPeriod: 2555,
        complianceReporting: true,
        qerberosIntegration: true,
        realTimeMonitoring: true,
        anomalyDetection: true,
        complianceAlerts: true,
        allowDataExport: true,
        exportFormats: ['JSON', 'CSV', 'PDF'],
        automaticReporting: true,
        reportingFrequency: 'MONTHLY'
      },
      walletMode: {
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: false,
        preserveAuditLogs: true
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });

    // DAO Identity Template
    this.templates.set(IdentityType.DAO, {
      identityType: IdentityType.DAO,
      templateName: 'DAO_DEFAULT',
      description: 'Default configuration for DAO identities',
      permissions: {
        canTransfer: true,
        canReceive: true,
        canMintNFT: true,
        canSignTransactions: true,
        canAccessDeFi: true,
        canCreateDAO: false,
        maxTransactionAmount: 100000,
        allowedTokens: ['ETH', 'QToken', 'PI'],
        restrictedOperations: [],
        governanceLevel: 'LIMITED',
        requiresApproval: true,
        approvalThreshold: 5000
      },
      limits: {
        dailyTransferLimit: 50000,
        monthlyTransferLimit: 500000,
        maxTransactionAmount: 25000,
        maxTransactionsPerHour: 50,
        allowedTokens: ['ETH', 'QToken', 'PI'],
        restrictedAddresses: [],
        requiresApprovalAbove: 5000,
        dynamicLimitsEnabled: true,
        governanceControlled: true,
        riskBasedAdjustments: true,
        riskMultipliers: {
          lowRisk: 1.0,
          mediumRisk: 0.5,
          highRisk: 0.2,
          criticalRisk: 0.0
        }
      },
      securitySettings: {
        requiresDeviceVerification: true,
        requiresMultiSig: true,
        sessionTimeout: 30,
        maxConcurrentSessions: 3,
        suspiciousActivityThreshold: 5,
        autoFreezeOnSuspiciousActivity: true,
        requiresBiometric: false,
        requires2FA: true,
        transactionConfirmationRequired: true,
        largeTransactionDelay: 5,
        emergencyFreeze: true
      },
      privacySettings: {
        logTransactions: true,
        shareWithAnalytics: true,
        anonymizeMetadata: false,
        ephemeralStorage: false,
        dataRetentionPeriod: 365,
        privacyLevel: PrivacyLevel.PUBLIC,
        hideBalances: false,
        hideTransactionHistory: false,
        encryptMetadata: true,
        shareWithDAOs: true,
        shareWithParent: false,
        shareWithGovernance: true,
        complianceDataSharing: true,
        auditDataRetention: 2555
      },
      auditSettings: {
        enableAuditLogging: true,
        logLevel: 'HIGH',
        retentionPeriod: 2555,
        complianceReporting: true,
        qerberosIntegration: true,
        realTimeMonitoring: true,
        anomalyDetection: true,
        complianceAlerts: true,
        allowDataExport: true,
        exportFormats: ['JSON', 'CSV', 'PDF'],
        automaticReporting: true,
        reportingFrequency: 'MONTHLY'
      },
      walletMode: {
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: false,
        preserveAuditLogs: true
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });

    // Add templates for other identity types...
    this.initializeEnterpriseTemplate();
    this.initializeConsentidaTemplate();
    this.initializeAIDTemplate();
  }

  private initializeEnterpriseTemplate(): void {
    this.templates.set(IdentityType.ENTERPRISE, {
      identityType: IdentityType.ENTERPRISE,
      templateName: 'ENTERPRISE_DEFAULT',
      description: 'Default configuration for ENTERPRISE identities',
      permissions: {
        canTransfer: true,
        canReceive: true,
        canMintNFT: true,
        canSignTransactions: true,
        canAccessDeFi: false,
        canCreateDAO: false,
        maxTransactionAmount: 50000,
        allowedTokens: ['ETH', 'QToken'],
        restrictedOperations: ['DEFI'],
        governanceLevel: 'LIMITED',
        requiresApproval: true,
        approvalThreshold: 1000
      },
      limits: {
        dailyTransferLimit: 25000,
        monthlyTransferLimit: 250000,
        maxTransactionAmount: 10000,
        maxTransactionsPerHour: 25,
        allowedTokens: ['ETH', 'QToken'],
        restrictedAddresses: [],
        requiresApprovalAbove: 1000,
        dynamicLimitsEnabled: true,
        governanceControlled: true,
        riskBasedAdjustments: true,
        riskMultipliers: {
          lowRisk: 1.0,
          mediumRisk: 0.6,
          highRisk: 0.2,
          criticalRisk: 0.0
        }
      },
      securitySettings: {
        requiresDeviceVerification: true,
        requiresMultiSig: true,
        sessionTimeout: 30,
        maxConcurrentSessions: 2,
        suspiciousActivityThreshold: 3,
        autoFreezeOnSuspiciousActivity: true,
        requiresBiometric: true,
        requires2FA: true,
        transactionConfirmationRequired: true,
        largeTransactionDelay: 10,
        emergencyFreeze: true
      },
      privacySettings: {
        logTransactions: true,
        shareWithAnalytics: false,
        anonymizeMetadata: true,
        ephemeralStorage: false,
        dataRetentionPeriod: 365,
        privacyLevel: PrivacyLevel.PRIVATE,
        hideBalances: false,
        hideTransactionHistory: false,
        encryptMetadata: true,
        shareWithDAOs: false,
        shareWithParent: false,
        shareWithGovernance: true,
        complianceDataSharing: true,
        auditDataRetention: 2555
      },
      auditSettings: {
        enableAuditLogging: true,
        logLevel: 'CRITICAL',
        retentionPeriod: 2555,
        complianceReporting: true,
        qerberosIntegration: true,
        realTimeMonitoring: true,
        anomalyDetection: true,
        complianceAlerts: true,
        allowDataExport: true,
        exportFormats: ['JSON', 'PDF'],
        automaticReporting: true,
        reportingFrequency: 'WEEKLY'
      },
      walletMode: {
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: false,
        preserveAuditLogs: true
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  private initializeConsentidaTemplate(): void {
    this.templates.set(IdentityType.CONSENTIDA, {
      identityType: IdentityType.CONSENTIDA,
      templateName: 'CONSENTIDA_DEFAULT',
      description: 'Default configuration for CONSENTIDA identities',
      permissions: {
        canTransfer: false,
        canReceive: true,
        canMintNFT: false,
        canSignTransactions: false,
        canAccessDeFi: false,
        canCreateDAO: false,
        maxTransactionAmount: 100,
        allowedTokens: ['QToken'],
        restrictedOperations: ['TRANSFER', 'MINT', 'SIGN', 'DEFI', 'DAO_CREATE'],
        governanceLevel: 'READ_ONLY',
        requiresApproval: true,
        approvalThreshold: 10
      },
      limits: {
        dailyTransferLimit: 100,
        monthlyTransferLimit: 1000,
        maxTransactionAmount: 50,
        maxTransactionsPerHour: 5,
        allowedTokens: ['QToken'],
        restrictedAddresses: [],
        requiresApprovalAbove: 10,
        dynamicLimitsEnabled: false,
        governanceControlled: true,
        riskBasedAdjustments: false
      },
      securitySettings: {
        requiresDeviceVerification: true,
        requiresMultiSig: false,
        sessionTimeout: 15,
        maxConcurrentSessions: 1,
        suspiciousActivityThreshold: 1,
        autoFreezeOnSuspiciousActivity: true,
        requiresBiometric: false,
        requires2FA: false,
        transactionConfirmationRequired: true,
        largeTransactionDelay: 0,
        emergencyFreeze: true
      },
      privacySettings: {
        logTransactions: true,
        shareWithAnalytics: false,
        anonymizeMetadata: true,
        ephemeralStorage: false,
        dataRetentionPeriod: 90,
        privacyLevel: PrivacyLevel.PRIVATE,
        hideBalances: true,
        hideTransactionHistory: true,
        encryptMetadata: true,
        shareWithDAOs: false,
        shareWithParent: true,
        shareWithGovernance: false,
        complianceDataSharing: false,
        auditDataRetention: 365
      },
      auditSettings: {
        enableAuditLogging: true,
        logLevel: 'MEDIUM',
        retentionPeriod: 365,
        complianceReporting: false,
        qerberosIntegration: true,
        realTimeMonitoring: true,
        anomalyDetection: true,
        complianceAlerts: false,
        allowDataExport: false,
        exportFormats: [],
        automaticReporting: false
      },
      walletMode: {
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: false,
        preserveAuditLogs: true
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  private initializeAIDTemplate(): void {
    this.templates.set(IdentityType.AID, {
      identityType: IdentityType.AID,
      templateName: 'AID_DEFAULT',
      description: 'Default configuration for AID identities',
      permissions: {
        canTransfer: true,
        canReceive: true,
        canMintNFT: false,
        canSignTransactions: true,
        canAccessDeFi: false,
        canCreateDAO: false,
        maxTransactionAmount: 1000,
        allowedTokens: ['ETH'],
        restrictedOperations: ['MINT', 'DEFI', 'DAO_CREATE'],
        governanceLevel: 'LIMITED',
        requiresApproval: false,
        approvalThreshold: 0
      },
      limits: {
        dailyTransferLimit: 1000,
        monthlyTransferLimit: 10000,
        maxTransactionAmount: 500,
        maxTransactionsPerHour: 10,
        allowedTokens: ['ETH'],
        restrictedAddresses: [],
        requiresApprovalAbove: 500,
        dynamicLimitsEnabled: false,
        governanceControlled: false,
        riskBasedAdjustments: true,
        riskMultipliers: {
          lowRisk: 1.0,
          mediumRisk: 0.5,
          highRisk: 0.1,
          criticalRisk: 0.0
        }
      },
      securitySettings: {
        requiresDeviceVerification: false,
        requiresMultiSig: false,
        sessionTimeout: 10,
        maxConcurrentSessions: 1,
        suspiciousActivityThreshold: 3,
        autoFreezeOnSuspiciousActivity: true,
        requiresBiometric: false,
        requires2FA: false,
        transactionConfirmationRequired: false,
        largeTransactionDelay: 0,
        emergencyFreeze: true
      },
      privacySettings: {
        logTransactions: false,
        shareWithAnalytics: false,
        anonymizeMetadata: true,
        ephemeralStorage: true,
        dataRetentionPeriod: 1,
        privacyLevel: PrivacyLevel.ANONYMOUS,
        hideBalances: true,
        hideTransactionHistory: true,
        encryptMetadata: true,
        shareWithDAOs: false,
        shareWithParent: false,
        shareWithGovernance: false,
        complianceDataSharing: false,
        auditDataRetention: 1
      },
      auditSettings: {
        enableAuditLogging: false,
        logLevel: 'LOW',
        retentionPeriod: 1,
        complianceReporting: false,
        qerberosIntegration: false,
        realTimeMonitoring: false,
        anomalyDetection: false,
        complianceAlerts: false,
        allowDataExport: false,
        exportFormats: [],
        automaticReporting: false
      },
      walletMode: {
        mode: 'PRODUCTION',
        isSandbox: false,
        fakeSignatures: false,
        enableTestTransactions: false,
        testNetworkOnly: false,
        mockExternalServices: false,
        debugLogging: false,
        allowReset: true,
        preserveAuditLogs: false
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });
  }
}

// Export singleton instance
export const walletConfigService = new WalletConfigService();