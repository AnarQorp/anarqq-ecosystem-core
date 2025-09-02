/**
 * Qwallet Plugin Manager Implementation
 * Manages plugin lifecycle, configuration, and integration hooks
 */

import { 
  QwalletPlugin, 
  PluginManager, 
  QwalletPluginType, 
  PluginStatus,
  PluginValidationResult,
  PluginConfigSchema,
  PluginRegistry,
  PluginStorage,
  PluginEvent,
  PluginEventType,
  PluginEventHandler,
  PluginError,
  PluginValidationError,
  PluginDependencyError,
  PluginPermissionError,
  PluginContext,
  PluginLogger,
  WalletOperation,
  WalletTransaction
} from '../types/qwallet-plugin';
import { IdentityType } from '../types/identity';
import { IdentityWalletConfig, WalletPermissions } from '../types/wallet-config';

export class QwalletPluginManager implements PluginManager {
  private registry: PluginRegistry;
  private initialized: boolean = false;
  private memoryStorageRegistry: Map<string, Map<string, any>> = new Map();

  constructor() {
    this.registry = {
      plugins: new Map(),
      configs: new Map(),
      hooks: new Map(),
      eventHandlers: new Map(),
      storage: new Map()
    };
  }

  // Initialize the plugin manager
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize built-in hooks
    this.initializeBuiltinHooks();
    
    // Load saved plugin configurations
    await this.loadPluginConfigurations();
    
    this.initialized = true;
    console.log('QwalletPluginManager initialized');
  }

  // Plugin Registration
  async registerPlugin(plugin: QwalletPlugin): Promise<boolean> {
    try {
      // Validate plugin
      const validation = await this.validatePlugin(plugin);
      if (!validation.valid) {
        throw new PluginValidationError(
          `Plugin validation failed: ${validation.errors.join(', ')}`,
          plugin.pluginId,
          validation.errors
        );
      }

      // Check for conflicts
      if (this.registry.plugins.has(plugin.pluginId)) {
        throw new PluginError(
          `Plugin ${plugin.pluginId} is already registered`,
          'PLUGIN_ALREADY_EXISTS',
          plugin.pluginId
        );
      }

      // Check dependencies
      if (plugin.dependencies) {
        const dependenciesValid = await this.checkDependencies(plugin.pluginId);
        if (!dependenciesValid) {
          throw new PluginDependencyError(
            `Plugin dependencies not satisfied`,
            plugin.pluginId,
            plugin.dependencies
          );
        }
      }

      // Register plugin
      plugin.status = PluginStatus.INACTIVE;
      this.registry.plugins.set(plugin.pluginId, plugin);

      // Initialize plugin storage
      const storage = this.createPluginStorage(plugin.pluginId);
      this.registry.storage.set(plugin.pluginId, storage);

      // Set plugin context if it's a BaseQwalletPlugin
      if ('setContext' in plugin && typeof plugin.setContext === 'function') {
        const context = {
          identityId: '', // Will be set when identity is active
          identityType: 'ROOT' as any,
          walletConfig: {} as any,
          permissions: {} as any,
          pluginManager: this,
          storage,
          logger: this.createPluginLogger(plugin.pluginId)
        };
        (plugin as any).setContext(context);
      }

      // Load plugin configuration
      const savedConfig = await this.loadPluginConfig(plugin.pluginId);
      if (savedConfig) {
        this.registry.configs.set(plugin.pluginId, savedConfig);
      }

      // Emit registration event
      this.emitEvent({
        type: PluginEventType.PLUGIN_REGISTERED,
        pluginId: plugin.pluginId,
        timestamp: new Date().toISOString(),
        data: { plugin }
      });

      console.log(`Plugin ${plugin.pluginId} registered successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to register plugin ${plugin.pluginId}:`, error);
      return false;
    }
  }

  async unregisterPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`, 'PLUGIN_NOT_FOUND', pluginId);
      }

      // Deactivate plugin if active
      if (plugin.status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(pluginId);
      }

      // Remove plugin from registry
      this.registry.plugins.delete(pluginId);
      this.registry.configs.delete(pluginId);
      this.registry.storage.delete(pluginId);

      // Remove plugin hooks
      this.registry.hooks.forEach((handlers, hookName) => {
        handlers.delete(pluginId);
      });

      // Emit unregistration event
      this.emitEvent({
        type: PluginEventType.PLUGIN_UNREGISTERED,
        pluginId,
        timestamp: new Date().toISOString(),
        data: { plugin }
      });

      console.log(`Plugin ${pluginId} unregistered successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Plugin Lifecycle
  async activatePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`, 'PLUGIN_NOT_FOUND', pluginId);
      }

      if (plugin.status === PluginStatus.ACTIVE) {
        return true; // Already active
      }

      // Check dependencies
      if (plugin.dependencies) {
        const dependenciesValid = await this.checkDependencies(pluginId);
        if (!dependenciesValid) {
          throw new PluginDependencyError(
            `Plugin dependencies not satisfied`,
            pluginId,
            plugin.dependencies
          );
        }
      }

      // Set status to loading
      plugin.status = PluginStatus.LOADING;

      // Configure plugin if needed
      const config = this.registry.configs.get(pluginId) || {};
      if (Object.keys(config).length > 0) {
        await plugin.configure(config);
      }

      // Activate plugin
      await plugin.activate();
      plugin.status = PluginStatus.ACTIVE;

      // Emit activation event
      this.emitEvent({
        type: PluginEventType.PLUGIN_ACTIVATED,
        pluginId,
        timestamp: new Date().toISOString(),
        data: { plugin }
      });

      console.log(`Plugin ${pluginId} activated successfully`);
      return true;

    } catch (error) {
      const plugin = this.registry.plugins.get(pluginId);
      if (plugin) {
        plugin.status = PluginStatus.ERROR;
      }

      this.emitEvent({
        type: PluginEventType.PLUGIN_ERROR,
        pluginId,
        timestamp: new Date().toISOString(),
        error: error instanceof PluginError ? error : new PluginError(
          error instanceof Error ? error.message : 'Unknown error',
          'ACTIVATION_ERROR',
          pluginId
        )
      });

      console.error(`Failed to activate plugin ${pluginId}:`, error);
      return false;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`, 'PLUGIN_NOT_FOUND', pluginId);
      }

      if (plugin.status !== PluginStatus.ACTIVE) {
        return true; // Already inactive
      }

      // Deactivate plugin
      await plugin.deactivate();
      plugin.status = PluginStatus.INACTIVE;

      // Emit deactivation event
      this.emitEvent({
        type: PluginEventType.PLUGIN_DEACTIVATED,
        pluginId,
        timestamp: new Date().toISOString(),
        data: { plugin }
      });

      console.log(`Plugin ${pluginId} deactivated successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      return false;
    }
  }

  async reloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const success = await this.deactivatePlugin(pluginId);
      if (!success) return false;

      return await this.activatePlugin(pluginId);
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Plugin Discovery
  getActivePlugins(): QwalletPlugin[] {
    return Array.from(this.registry.plugins.values())
      .filter(plugin => plugin.status === PluginStatus.ACTIVE);
  }

  getInactivePlugins(): QwalletPlugin[] {
    return Array.from(this.registry.plugins.values())
      .filter(plugin => plugin.status === PluginStatus.INACTIVE);
  }

  getAllPlugins(): QwalletPlugin[] {
    return Array.from(this.registry.plugins.values());
  }

  getPluginById(pluginId: string): QwalletPlugin | null {
    return this.registry.plugins.get(pluginId) || null;
  }

  getPluginsByType(type: QwalletPluginType): QwalletPlugin[] {
    return Array.from(this.registry.plugins.values())
      .filter(plugin => plugin.type === type);
  }

  getPluginsForIdentity(identityType: IdentityType): QwalletPlugin[] {
    return Array.from(this.registry.plugins.values())
      .filter(plugin => plugin.supportedIdentityTypes.includes(identityType));
  }

  // Plugin Configuration
  getPluginConfig(pluginId: string): Record<string, any> {
    return this.registry.configs.get(pluginId) || {};
  }

  async updatePluginConfig(pluginId: string, config: Record<string, any>): Promise<boolean> {
    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`, 'PLUGIN_NOT_FOUND', pluginId);
      }

      // Validate configuration
      const validation = await this.validatePluginConfig(pluginId, config);
      if (!validation.valid) {
        throw new PluginValidationError(
          `Plugin configuration validation failed: ${validation.errors.join(', ')}`,
          pluginId,
          validation.errors
        );
      }

      // Update configuration
      this.registry.configs.set(pluginId, config);
      await this.savePluginConfig(pluginId, config);

      // Configure plugin if active
      if (plugin.status === PluginStatus.ACTIVE) {
        await plugin.configure(config);
      }

      // Emit configuration change event
      this.emitEvent({
        type: PluginEventType.PLUGIN_CONFIG_CHANGED,
        pluginId,
        timestamp: new Date().toISOString(),
        data: { config }
      });

      return true;

    } catch (error) {
      console.error(`Failed to update plugin config for ${pluginId}:`, error);
      return false;
    }
  }

  getPluginConfigSchema(pluginId: string): PluginConfigSchema | null {
    // This would typically be provided by the plugin or stored separately
    // For now, return null as plugins don't define schemas in the base interface
    return null;
  }

  async validatePluginConfig(pluginId: string, config: Record<string, any>): Promise<PluginValidationResult> {
    // Basic validation - in a real implementation, this would use JSON Schema or similar
    return {
      valid: true,
      errors: [],
      warnings: [],
      missingDependencies: [],
      incompatibleIdentityTypes: [],
      missingPermissions: []
    };
  }

  // Plugin Dependencies
  async resolveDependencies(pluginId: string): Promise<string[]> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin || !plugin.dependencies) {
      return [];
    }

    const resolved: string[] = [];
    const toResolve = [...plugin.dependencies];

    while (toResolve.length > 0) {
      const depId = toResolve.shift()!;
      if (resolved.includes(depId)) continue;

      const depPlugin = this.registry.plugins.get(depId);
      if (depPlugin && depPlugin.dependencies) {
        toResolve.push(...depPlugin.dependencies);
      }
      resolved.push(depId);
    }

    return resolved;
  }

  async checkDependencies(pluginId: string): Promise<boolean> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin || !plugin.dependencies) {
      return true;
    }

    return plugin.dependencies.every(depId => this.registry.plugins.has(depId));
  }

  async installDependencies(pluginId: string): Promise<boolean> {
    // This would typically install missing dependencies from a registry
    // For now, just check if they exist
    return this.checkDependencies(pluginId);
  }

  // Plugin Hooks
  async executeHook(hookName: string, ...args: any[]): Promise<void> {
    const handlers = this.registry.hooks.get(hookName);
    if (!handlers) return;

    const promises = Array.from(handlers.values()).map(handler => {
      try {
        return handler(...args);
      } catch (error) {
        console.error(`Hook ${hookName} handler failed:`, error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  registerHook(hookName: string, pluginId: string, handler: Function): void {
    if (!this.registry.hooks.has(hookName)) {
      this.registry.hooks.set(hookName, new Map());
    }
    this.registry.hooks.get(hookName)!.set(pluginId, handler);
  }

  unregisterHook(hookName: string, pluginId: string): void {
    const handlers = this.registry.hooks.get(hookName);
    if (handlers) {
      handlers.delete(pluginId);
    }
  }

  // Plugin Events
  addEventListener(event: PluginEventType, handler: PluginEventHandler): void {
    if (!this.registry.eventHandlers.has(event)) {
      this.registry.eventHandlers.set(event, []);
    }
    this.registry.eventHandlers.get(event)!.push(handler);
  }

  removeEventListener(event: PluginEventType, handler: PluginEventHandler): void {
    const handlers = this.registry.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emitEvent(event: PluginEvent): void {
    const handlers = this.registry.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Event handler for ${event.type} failed:`, error);
        }
      });
    }
  }

  // Plugin Security
  async validatePlugin(plugin: QwalletPlugin): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!plugin.pluginId || plugin.pluginId.trim() === '') {
      errors.push('Plugin ID is required');
    }

    if (!plugin.name || plugin.name.trim() === '') {
      errors.push('Plugin name is required');
    }

    if (!plugin.version || plugin.version.trim() === '') {
      errors.push('Plugin version is required');
    }

    if (!Object.values(QwalletPluginType).includes(plugin.type)) {
      errors.push('Invalid plugin type');
    }

    if (!plugin.supportedIdentityTypes || plugin.supportedIdentityTypes.length === 0) {
      warnings.push('Plugin does not specify supported identity types');
    }

    // Check for required methods
    if (typeof plugin.activate !== 'function') {
      errors.push('Plugin must implement activate() method');
    }

    if (typeof plugin.deactivate !== 'function') {
      errors.push('Plugin must implement deactivate() method');
    }

    if (typeof plugin.configure !== 'function') {
      errors.push('Plugin must implement configure() method');
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

  checkPermissions(pluginId: string, permissions: string[]): boolean {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) return false;

    return permissions.every(permission => 
      plugin.requiredPermissions.includes(permission)
    );
  }

  async sandboxPlugin(pluginId: string): Promise<boolean> {
    // This would implement plugin sandboxing for security
    // For now, just return true
    return true;
  }

  // Plugin Storage
  getPluginStorage(pluginId: string): PluginStorage {
    let storage = this.registry.storage.get(pluginId);
    if (!storage) {
      // Only create storage if plugin exists
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`, 'PLUGIN_NOT_FOUND', pluginId);
      }
      
      storage = this.createPluginStorage(pluginId);
      this.registry.storage.set(pluginId, storage);
    }
    return storage;
  }

  async clearPluginStorage(pluginId: string): Promise<boolean> {
    const storage = this.registry.storage.get(pluginId);
    if (storage) {
      await storage.clear();
      return true;
    }
    return false;
  }

  // Wallet Operation Hooks
  async onWalletOperation(operation: WalletOperation): Promise<void> {
    // Execute before hooks
    await this.executeHook('wallet.operation.before', operation);

    // Notify plugins
    const activePlugins = this.getActivePlugins();
    const promises = activePlugins
      .filter(plugin => plugin.onWalletOperation)
      .map(plugin => plugin.onWalletOperation!(operation));

    await Promise.allSettled(promises);

    // Execute after hooks
    await this.executeHook('wallet.operation.after', operation);

    // Emit event
    this.emitEvent({
      type: PluginEventType.WALLET_OPERATION,
      timestamp: new Date().toISOString(),
      data: { operation }
    });
  }

  async onIdentitySwitch(fromId: string, toId: string): Promise<void> {
    // Execute before hooks
    await this.executeHook('identity.switch.before', fromId, toId);

    // Notify plugins
    const activePlugins = this.getActivePlugins();
    const promises = activePlugins
      .filter(plugin => plugin.onIdentitySwitch)
      .map(plugin => plugin.onIdentitySwitch!(fromId, toId));

    await Promise.allSettled(promises);

    // Execute after hooks
    await this.executeHook('identity.switch.after', fromId, toId);

    // Emit event
    this.emitEvent({
      type: PluginEventType.IDENTITY_SWITCHED,
      timestamp: new Date().toISOString(),
      data: { fromId, toId }
    });
  }

  async onTransactionComplete(transaction: WalletTransaction): Promise<void> {
    // Execute hooks
    await this.executeHook('transaction.complete', transaction);

    // Notify plugins
    const activePlugins = this.getActivePlugins();
    const promises = activePlugins
      .filter(plugin => plugin.onTransactionComplete)
      .map(plugin => plugin.onTransactionComplete!(transaction));

    await Promise.allSettled(promises);

    // Emit event
    this.emitEvent({
      type: PluginEventType.TRANSACTION_COMPLETED,
      timestamp: new Date().toISOString(),
      data: { transaction }
    });
  }

  // Private helper methods
  private initializeBuiltinHooks(): void {
    // Initialize common hook names
    const hookNames = [
      'wallet.operation.before',
      'wallet.operation.after',
      'identity.switch.before',
      'identity.switch.after',
      'transaction.complete',
      'config.change',
      'permission.change',
      'error.occurred'
    ];

    hookNames.forEach(hookName => {
      this.registry.hooks.set(hookName, new Map());
    });
  }

  private createPluginStorage(pluginId: string): PluginStorage {
    const storageKey = `qwallet_plugin_${pluginId}`;
    
    // Use shared memory storage registry for consistent storage across calls
    if (!this.memoryStorageRegistry.has(pluginId)) {
      this.memoryStorageRegistry.set(pluginId, new Map<string, any>());
    }
    const memoryStorage = this.memoryStorageRegistry.get(pluginId)!;
    
    const isLocalStorageAvailable = (): boolean => {
      try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    };
    
    const useLocalStorage = isLocalStorageAvailable();
    
    return {
      async get(key: string): Promise<any> {
        try {
          if (useLocalStorage) {
            const data = localStorage.getItem(`${storageKey}_${key}`);
            return data ? JSON.parse(data) : null;
          } else {
            return memoryStorage.get(key) || null;
          }
        } catch {
          return null;
        }
      },

      async set(key: string, value: any): Promise<void> {
        try {
          if (useLocalStorage) {
            localStorage.setItem(`${storageKey}_${key}`, JSON.stringify(value));
          } else {
            memoryStorage.set(key, value);
          }
        } catch (error) {
          console.error(`Failed to set plugin storage for ${pluginId}:`, error);
        }
      },

      async delete(key: string): Promise<void> {
        if (useLocalStorage) {
          localStorage.removeItem(`${storageKey}_${key}`);
        } else {
          memoryStorage.delete(key);
        }
      },

      async clear(): Promise<void> {
        if (useLocalStorage) {
          const keys = await this.keys();
          keys.forEach(key => localStorage.removeItem(`${storageKey}_${key}`));
        } else {
          memoryStorage.clear();
        }
      },

      async keys(): Promise<string[]> {
        if (useLocalStorage) {
          const keys: string[] = [];
          const prefix = `${storageKey}_`;
          
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keys.push(key.substring(prefix.length));
            }
          }
          
          return keys;
        } else {
          return Array.from(memoryStorage.keys());
        }
      },

      async has(key: string): Promise<boolean> {
        if (useLocalStorage) {
          return localStorage.getItem(`${storageKey}_${key}`) !== null;
        } else {
          return memoryStorage.has(key);
        }
      }
    };
  }

  private async loadPluginConfigurations(): Promise<void> {
    // This would load plugin configurations from persistent storage
    // For now, just log that we're loading
    console.log('Loading plugin configurations...');
  }

  private async loadPluginConfig(pluginId: string): Promise<Record<string, any> | null> {
    try {
      const data = localStorage.getItem(`qwallet_plugin_config_${pluginId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async savePluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
    try {
      localStorage.setItem(`qwallet_plugin_config_${pluginId}`, JSON.stringify(config));
    } catch (error) {
      console.error(`Failed to save plugin config for ${pluginId}:`, error);
    }
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    return {
      debug: (message: string, data?: any) => {
        console.debug(`[${pluginId}] ${message}`, data);
      },
      info: (message: string, data?: any) => {
        console.info(`[${pluginId}] ${message}`, data);
      },
      warn: (message: string, data?: any) => {
        console.warn(`[${pluginId}] ${message}`, data);
      },
      error: (message: string, error?: Error) => {
        console.error(`[${pluginId}] ${message}`, error);
      }
    };
  }
}

// Singleton instance
export const pluginManager = new QwalletPluginManager();