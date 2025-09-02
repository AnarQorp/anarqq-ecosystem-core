/**
 * Qwallet Plugin Architecture Types
 * Provides extensible plugin system for wallet functionality
 */

import { IdentityType } from './identity';
import { IdentityWalletConfig, WalletPermissions } from './wallet-config';

// Plugin Types
export enum QwalletPluginType {
  AUDIT = 'AUDIT',
  TOKEN = 'TOKEN',
  UI = 'UI',
  SERVICE = 'SERVICE',
  INTEGRATION = 'INTEGRATION',
  SECURITY = 'SECURITY',
  ANALYTICS = 'ANALYTICS'
}

export enum PluginStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  LOADING = 'LOADING',
  DISABLED = 'DISABLED'
}

// Core Plugin Interface
export interface QwalletPlugin {
  // Plugin Metadata
  pluginId: string;
  name: string;
  version: string;
  type: QwalletPluginType;
  description: string;
  author: string;
  
  // Plugin Configuration
  capabilities: string[];
  requiredPermissions: string[];
  supportedIdentityTypes: IdentityType[];
  dependencies?: string[]; // Other plugin IDs this plugin depends on
  
  // Plugin State
  status: PluginStatus;
  config?: Record<string, any>;
  metadata?: {
    homepage?: string;
    repository?: string;
    documentation?: string;
    license?: string;
    tags?: string[];
  };
  
  // Lifecycle Methods
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  configure(config: Record<string, any>): Promise<void>;
  validate(): Promise<PluginValidationResult>;
  
  // Plugin Capabilities
  getCapabilities(): string[];
  isCompatible(identityType: IdentityType): boolean;
  hasPermission(permission: string): boolean;
  
  // Integration Hooks (optional)
  onWalletOperation?(operation: WalletOperation): Promise<void>;
  onIdentitySwitch?(fromId: string, toId: string): Promise<void>;
  onTransactionComplete?(transaction: WalletTransaction): Promise<void>;
  onConfigChange?(identityId: string, config: IdentityWalletConfig): Promise<void>;
  onPermissionChange?(identityId: string, permissions: WalletPermissions): Promise<void>;
  onError?(error: PluginError): Promise<void>;
  
  // UI Integration (for UI plugins)
  renderComponent?(props: any): React.ReactElement | null;
  getMenuItems?(): PluginMenuItem[];
  getSettingsPanel?(): React.ReactElement | null;
}

// Plugin Validation
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingDependencies: string[];
  incompatibleIdentityTypes: IdentityType[];
  missingPermissions: string[];
}

// Plugin Configuration Schema
export interface PluginConfigSchema {
  pluginId: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  uiSchema?: Record<string, any>; // For form generation
  defaultValues?: Record<string, any>;
}

// Plugin Operations
export interface WalletOperation {
  operationType: 'TRANSFER' | 'RECEIVE' | 'MINT' | 'BURN' | 'APPROVE' | 'STAKE' | 'UNSTAKE';
  identityId: string;
  amount?: number;
  token?: string;
  recipient?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface WalletTransaction {
  transactionId: string;
  identityId: string;
  operationType: string;
  amount: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  metadata?: Record<string, any>;
}

// Plugin UI Integration
export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  visible?: boolean;
  submenu?: PluginMenuItem[];
}

// Plugin Manager Interface
export interface PluginManager {
  // Plugin Registration
  registerPlugin(plugin: QwalletPlugin): Promise<boolean>;
  unregisterPlugin(pluginId: string): Promise<boolean>;
  
  // Plugin Lifecycle
  activatePlugin(pluginId: string): Promise<boolean>;
  deactivatePlugin(pluginId: string): Promise<boolean>;
  reloadPlugin(pluginId: string): Promise<boolean>;
  
  // Plugin Discovery
  getActivePlugins(): QwalletPlugin[];
  getInactivePlugins(): QwalletPlugin[];
  getAllPlugins(): QwalletPlugin[];
  getPluginById(pluginId: string): QwalletPlugin | null;
  getPluginsByType(type: QwalletPluginType): QwalletPlugin[];
  getPluginsForIdentity(identityType: IdentityType): QwalletPlugin[];
  
  // Plugin Configuration
  getPluginConfig(pluginId: string): Record<string, any>;
  updatePluginConfig(pluginId: string, config: Record<string, any>): Promise<boolean>;
  getPluginConfigSchema(pluginId: string): PluginConfigSchema | null;
  validatePluginConfig(pluginId: string, config: Record<string, any>): Promise<PluginValidationResult>;
  
  // Plugin Dependencies
  resolveDependencies(pluginId: string): Promise<string[]>;
  checkDependencies(pluginId: string): Promise<boolean>;
  installDependencies(pluginId: string): Promise<boolean>;
  
  // Plugin Hooks
  executeHook(hookName: string, ...args: any[]): Promise<void>;
  registerHook(hookName: string, pluginId: string, handler: Function): void;
  unregisterHook(hookName: string, pluginId: string): void;
  
  // Plugin Events
  addEventListener(event: PluginEventType, handler: PluginEventHandler): void;
  removeEventListener(event: PluginEventType, handler: PluginEventHandler): void;
  emitEvent(event: PluginEvent): void;
  
  // Plugin Security
  validatePlugin(plugin: QwalletPlugin): Promise<PluginValidationResult>;
  checkPermissions(pluginId: string, permissions: string[]): boolean;
  sandboxPlugin(pluginId: string): Promise<boolean>;
  
  // Plugin Storage
  getPluginStorage(pluginId: string): PluginStorage;
  clearPluginStorage(pluginId: string): Promise<boolean>;
}

// Plugin Storage Interface
export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
}

// Plugin Events
export enum PluginEventType {
  PLUGIN_REGISTERED = 'PLUGIN_REGISTERED',
  PLUGIN_UNREGISTERED = 'PLUGIN_UNREGISTERED',
  PLUGIN_ACTIVATED = 'PLUGIN_ACTIVATED',
  PLUGIN_DEACTIVATED = 'PLUGIN_DEACTIVATED',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  PLUGIN_CONFIG_CHANGED = 'PLUGIN_CONFIG_CHANGED',
  WALLET_OPERATION = 'WALLET_OPERATION',
  IDENTITY_SWITCHED = 'IDENTITY_SWITCHED',
  TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED'
}

export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  timestamp: string;
  data?: any;
  error?: PluginError;
}

export type PluginEventHandler = (event: PluginEvent) => void;

// Plugin Errors
export class PluginError extends Error {
  constructor(
    message: string,
    public code: string,
    public pluginId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PluginValidationError extends PluginError {
  constructor(
    message: string,
    pluginId?: string,
    public validationErrors?: string[]
  ) {
    super(message, 'PLUGIN_VALIDATION_ERROR', pluginId);
    this.name = 'PluginValidationError';
  }
}

export class PluginDependencyError extends PluginError {
  constructor(
    message: string,
    pluginId?: string,
    public missingDependencies?: string[]
  ) {
    super(message, 'PLUGIN_DEPENDENCY_ERROR', pluginId);
    this.name = 'PluginDependencyError';
  }
}

export class PluginPermissionError extends PluginError {
  constructor(
    message: string,
    pluginId?: string,
    public requiredPermission?: string
  ) {
    super(message, 'PLUGIN_PERMISSION_ERROR', pluginId);
    this.name = 'PluginPermissionError';
  }
}

// Plugin Registry
export interface PluginRegistry {
  plugins: Map<string, QwalletPlugin>;
  configs: Map<string, Record<string, any>>;
  hooks: Map<string, Map<string, Function>>;
  eventHandlers: Map<PluginEventType, PluginEventHandler[]>;
  storage: Map<string, PluginStorage>;
}

// Plugin Hooks Registry
export interface PluginHooks {
  'wallet.operation.before': (operation: WalletOperation) => Promise<void>;
  'wallet.operation.after': (operation: WalletOperation) => Promise<void>;
  'identity.switch.before': (fromId: string, toId: string) => Promise<void>;
  'identity.switch.after': (fromId: string, toId: string) => Promise<void>;
  'transaction.complete': (transaction: WalletTransaction) => Promise<void>;
  'config.change': (identityId: string, config: IdentityWalletConfig) => Promise<void>;
  'permission.change': (identityId: string, permissions: WalletPermissions) => Promise<void>;
  'error.occurred': (error: PluginError) => Promise<void>;
}

// Plugin Context
export interface PluginContext {
  identityId: string;
  identityType: IdentityType;
  walletConfig: IdentityWalletConfig;
  permissions: WalletPermissions;
  pluginManager: PluginManager;
  storage: PluginStorage;
  logger: PluginLogger;
}

export interface PluginLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
}

// Built-in Plugin Types
export interface AuditPlugin extends QwalletPlugin {
  type: QwalletPluginType.AUDIT;
  logTransaction(transaction: WalletTransaction): Promise<void>;
  generateReport(identityId: string, period: { start: string; end: string }): Promise<any>;
}

export interface TokenPlugin extends QwalletPlugin {
  type: QwalletPluginType.TOKEN;
  getSupportedTokens(): Promise<string[]>;
  validateToken(tokenAddress: string): Promise<boolean>;
  getTokenMetadata(tokenAddress: string): Promise<any>;
}

export interface UIPlugin extends QwalletPlugin {
  type: QwalletPluginType.UI;
  renderComponent(props: any): React.ReactElement;
  getMenuItems(): PluginMenuItem[];
}

export interface ServicePlugin extends QwalletPlugin {
  type: QwalletPluginType.SERVICE;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getServiceStatus(): Promise<'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'>;
}

export interface IntegrationPlugin extends QwalletPlugin {
  type: QwalletPluginType.INTEGRATION;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  sync(): Promise<void>;
}

// Plugin Utilities
export interface PluginUtils {
  validateIdentityType(identityType: IdentityType, supportedTypes: IdentityType[]): boolean;
  checkPermissions(requiredPermissions: string[], availablePermissions: string[]): boolean;
  generatePluginId(name: string, version: string): string;
  sanitizeConfig(config: Record<string, any>, schema: any): Record<string, any>;
  createPluginStorage(pluginId: string): PluginStorage;
  createPluginLogger(pluginId: string): PluginLogger;
}