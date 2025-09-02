/**
 * Base Qwallet Plugin Implementation
 * Provides a foundation for creating Qwallet plugins
 */

import { 
  QwalletPlugin, 
  QwalletPluginType, 
  PluginStatus,
  PluginValidationResult,
  PluginContext,
  PluginStorage,
  PluginLogger,
  WalletOperation,
  WalletTransaction,
  PluginMenuItem
} from '../types/qwallet-plugin';
import { IdentityType } from '../types/identity';
import { IdentityWalletConfig, WalletPermissions } from '../types/wallet-config';

export abstract class BaseQwalletPlugin implements QwalletPlugin {
  // Plugin Metadata
  public readonly pluginId: string;
  public readonly name: string;
  public readonly version: string;
  public readonly type: QwalletPluginType;
  public readonly description: string;
  public readonly author: string;
  
  // Plugin Configuration
  public readonly capabilities: string[];
  public readonly requiredPermissions: string[];
  public readonly supportedIdentityTypes: IdentityType[];
  public readonly dependencies?: string[];
  
  // Plugin State
  public status: PluginStatus = PluginStatus.INACTIVE;
  public config?: Record<string, any>;
  public metadata?: {
    homepage?: string;
    repository?: string;
    documentation?: string;
    license?: string;
    tags?: string[];
  };

  // Plugin Context
  protected context?: PluginContext;
  protected storage?: PluginStorage;
  protected logger?: PluginLogger;

  constructor(
    pluginId: string,
    name: string,
    version: string,
    type: QwalletPluginType,
    description: string,
    author: string,
    options: {
      capabilities?: string[];
      requiredPermissions?: string[];
      supportedIdentityTypes?: IdentityType[];
      dependencies?: string[];
      metadata?: {
        homepage?: string;
        repository?: string;
        documentation?: string;
        license?: string;
        tags?: string[];
      };
    } = {}
  ) {
    this.pluginId = pluginId;
    this.name = name;
    this.version = version;
    this.type = type;
    this.description = description;
    this.author = author;
    
    this.capabilities = options.capabilities || [];
    this.requiredPermissions = options.requiredPermissions || [];
    this.supportedIdentityTypes = options.supportedIdentityTypes || Object.values(IdentityType);
    this.dependencies = options.dependencies;
    this.metadata = options.metadata;
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract onActivate(): Promise<void>;
  protected abstract onDeactivate(): Promise<void>;
  protected abstract onConfigure(config: Record<string, any>): Promise<void>;

  // Lifecycle Methods
  async activate(): Promise<void> {
    try {
      this.log('info', `Activating plugin ${this.pluginId}`);
      
      // Validate plugin before activation
      const validation = await this.validate();
      if (!validation.valid) {
        throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
      }

      // Call subclass implementation
      await this.onActivate();
      
      this.status = PluginStatus.ACTIVE;
      this.log('info', `Plugin ${this.pluginId} activated successfully`);
      
    } catch (error) {
      this.status = PluginStatus.ERROR;
      this.log('error', `Failed to activate plugin ${this.pluginId}`, error);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    try {
      this.log('info', `Deactivating plugin ${this.pluginId}`);
      
      // Call subclass implementation
      await this.onDeactivate();
      
      this.status = PluginStatus.INACTIVE;
      this.log('info', `Plugin ${this.pluginId} deactivated successfully`);
      
    } catch (error) {
      this.log('error', `Failed to deactivate plugin ${this.pluginId}`, error);
      throw error;
    }
  }

  async configure(config: Record<string, any>): Promise<void> {
    try {
      this.log('info', `Configuring plugin ${this.pluginId}`, config);
      
      // Store configuration
      this.config = { ...this.config, ...config };
      
      // Call subclass implementation
      await this.onConfigure(config);
      
      this.log('info', `Plugin ${this.pluginId} configured successfully`);
      
    } catch (error) {
      this.log('error', `Failed to configure plugin ${this.pluginId}`, error);
      throw error;
    }
  }

  async validate(): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!this.pluginId || this.pluginId.trim() === '') {
      errors.push('Plugin ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Plugin name is required');
    }

    if (!this.version || this.version.trim() === '') {
      errors.push('Plugin version is required');
    }

    // Check capabilities
    if (this.capabilities.length === 0) {
      warnings.push('Plugin does not declare any capabilities');
    }

    // Check supported identity types
    if (this.supportedIdentityTypes.length === 0) {
      warnings.push('Plugin does not support any identity types');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingDependencies: [],
      incompatibleIdentityTypes: [],
      missingPermissions: []
    };
  }

  // Plugin Capabilities
  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  isCompatible(identityType: IdentityType): boolean {
    return this.supportedIdentityTypes.includes(identityType);
  }

  hasPermission(permission: string): boolean {
    return this.requiredPermissions.includes(permission);
  }

  // Context Management
  setContext(context: PluginContext): void {
    this.context = context;
    this.storage = context.storage;
    this.logger = context.logger;
  }

  getContext(): PluginContext | undefined {
    return this.context;
  }

  // Storage Helpers
  protected async getStorageValue(key: string): Promise<any> {
    if (!this.storage) {
      throw new Error('Plugin storage not available');
    }
    return this.storage.get(key);
  }

  protected async setStorageValue(key: string, value: any): Promise<void> {
    if (!this.storage) {
      throw new Error('Plugin storage not available');
    }
    await this.storage.set(key, value);
  }

  protected async deleteStorageValue(key: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Plugin storage not available');
    }
    await this.storage.delete(key);
  }

  protected async clearStorage(): Promise<void> {
    if (!this.storage) {
      throw new Error('Plugin storage not available');
    }
    await this.storage.clear();
  }

  // Logging Helpers
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console[level](`[${this.pluginId}] ${message}`, data);
    }
  }

  // Configuration Helpers
  protected getConfigValue<T = any>(key: string, defaultValue?: T): T {
    if (!this.config) {
      return defaultValue as T;
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  protected setConfigValue(key: string, value: any): void {
    if (!this.config) {
      this.config = {};
    }
    this.config[key] = value;
  }

  // Optional Integration Hooks (can be overridden by subclasses)
  async onWalletOperation?(operation: WalletOperation): Promise<void> {
    // Default implementation - do nothing
    this.log('debug', `Wallet operation: ${operation.operationType}`, operation);
  }

  async onIdentitySwitch?(fromId: string, toId: string): Promise<void> {
    // Default implementation - do nothing
    this.log('debug', `Identity switch: ${fromId} -> ${toId}`);
  }

  async onTransactionComplete?(transaction: WalletTransaction): Promise<void> {
    // Default implementation - do nothing
    this.log('debug', `Transaction complete: ${transaction.transactionId}`, transaction);
  }

  async onConfigChange?(identityId: string, config: IdentityWalletConfig): Promise<void> {
    // Default implementation - do nothing
    this.log('debug', `Config change for identity: ${identityId}`, config);
  }

  async onPermissionChange?(identityId: string, permissions: WalletPermissions): Promise<void> {
    // Default implementation - do nothing
    this.log('debug', `Permission change for identity: ${identityId}`, permissions);
  }

  async onError?(error: Error): Promise<void> {
    // Default implementation - log error
    this.log('error', `Plugin error occurred`, error);
  }

  // UI Integration (for UI plugins)
  renderComponent?(props: any): React.ReactElement | null {
    // Default implementation - return null
    return null;
  }

  getMenuItems?(): PluginMenuItem[] {
    // Default implementation - return empty array
    return [];
  }

  getSettingsPanel?(): React.ReactElement | null {
    // Default implementation - return null
    return null;
  }

  // Utility Methods
  protected generateId(): string {
    return `${this.pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected isActive(): boolean {
    return this.status === PluginStatus.ACTIVE;
  }

  protected isInactive(): boolean {
    return this.status === PluginStatus.INACTIVE;
  }

  protected hasError(): boolean {
    return this.status === PluginStatus.ERROR;
  }

  // Plugin Information
  getInfo(): {
    pluginId: string;
    name: string;
    version: string;
    type: QwalletPluginType;
    description: string;
    author: string;
    status: PluginStatus;
    capabilities: string[];
    supportedIdentityTypes: IdentityType[];
  } {
    return {
      pluginId: this.pluginId,
      name: this.name,
      version: this.version,
      type: this.type,
      description: this.description,
      author: this.author,
      status: this.status,
      capabilities: this.getCapabilities(),
      supportedIdentityTypes: [...this.supportedIdentityTypes]
    };
  }

  // Plugin Health Check
  async healthCheck(): Promise<{
    healthy: boolean;
    status: PluginStatus;
    lastCheck: string;
    issues?: string[];
  }> {
    const issues: string[] = [];
    
    // Check if plugin is in error state
    if (this.status === PluginStatus.ERROR) {
      issues.push('Plugin is in error state');
    }

    // Check if required dependencies are available
    if (this.dependencies) {
      // This would check if dependencies are still available
      // For now, just assume they are
    }

    // Check storage availability
    if (this.storage) {
      try {
        await this.storage.get('health_check');
      } catch (error) {
        issues.push('Storage is not accessible');
      }
    }

    return {
      healthy: issues.length === 0,
      status: this.status,
      lastCheck: new Date().toISOString(),
      issues: issues.length > 0 ? issues : undefined
    };
  }
}