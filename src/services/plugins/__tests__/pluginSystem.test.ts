/**
 * Plugin System Tests
 * Tests for the Qwallet plugin architecture
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QwalletPluginManager } from '../../QwalletPluginManager';
import { BaseQwalletPlugin } from '../../BaseQwalletPlugin';
import { AuditLoggerPlugin } from '../AuditLoggerPlugin';
import { TokenValidatorPlugin } from '../TokenValidatorPlugin';
import { 
  QwalletPluginType, 
  PluginStatus,
  WalletOperation,
  WalletTransaction 
} from '../../../types/qwallet-plugin';
import { IdentityType } from '../../../types/identity';

// Test plugin implementation
class TestPlugin extends BaseQwalletPlugin {
  private activateCallCount = 0;
  private deactivateCallCount = 0;
  private configureCallCount = 0;

  constructor() {
    super(
      'test-plugin',
      'Test Plugin',
      '1.0.0',
      QwalletPluginType.SERVICE,
      'A test plugin for unit testing',
      'Test Author',
      {
        capabilities: ['test_capability'],
        requiredPermissions: ['test:read'],
        supportedIdentityTypes: [IdentityType.ROOT, IdentityType.DAO]
      }
    );
  }

  protected async onActivate(): Promise<void> {
    this.activateCallCount++;
  }

  protected async onDeactivate(): Promise<void> {
    this.deactivateCallCount++;
  }

  protected async onConfigure(config: Record<string, any>): Promise<void> {
    this.configureCallCount++;
  }

  // Test helper methods
  getActivateCallCount(): number {
    return this.activateCallCount;
  }

  getDeactivateCallCount(): number {
    return this.deactivateCallCount;
  }

  getConfigureCallCount(): number {
    return this.configureCallCount;
  }
}

describe('Plugin System', () => {
  let pluginManager: QwalletPluginManager;
  let testPlugin: TestPlugin;

  beforeEach(async () => {
    pluginManager = new QwalletPluginManager();
    await pluginManager.initialize();
    testPlugin = new TestPlugin();
  });

  afterEach(() => {
    // Clean up
    pluginManager.getAllPlugins().forEach(plugin => {
      pluginManager.unregisterPlugin(plugin.pluginId);
    });
  });

  describe('Plugin Manager', () => {
    it('should initialize successfully', async () => {
      const manager = new QwalletPluginManager();
      await manager.initialize();
      expect(manager).toBeDefined();
    });

    it('should register a plugin successfully', async () => {
      const success = await pluginManager.registerPlugin(testPlugin);
      expect(success).toBe(true);
      
      const registeredPlugin = pluginManager.getPluginById('test-plugin');
      expect(registeredPlugin).toBeDefined();
      expect(registeredPlugin?.pluginId).toBe('test-plugin');
    });

    it('should not register the same plugin twice', async () => {
      await pluginManager.registerPlugin(testPlugin);
      const success = await pluginManager.registerPlugin(testPlugin);
      expect(success).toBe(false);
    });

    it('should activate a plugin successfully', async () => {
      await pluginManager.registerPlugin(testPlugin);
      const success = await pluginManager.activatePlugin('test-plugin');
      
      expect(success).toBe(true);
      expect(testPlugin.status).toBe(PluginStatus.ACTIVE);
      expect(testPlugin.getActivateCallCount()).toBe(1);
    });

    it('should deactivate a plugin successfully', async () => {
      await pluginManager.registerPlugin(testPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      const success = await pluginManager.deactivatePlugin('test-plugin');
      
      expect(success).toBe(true);
      expect(testPlugin.status).toBe(PluginStatus.INACTIVE);
      expect(testPlugin.getDeactivateCallCount()).toBe(1);
    });

    it('should unregister a plugin successfully', async () => {
      await pluginManager.registerPlugin(testPlugin);
      const success = await pluginManager.unregisterPlugin('test-plugin');
      
      expect(success).toBe(true);
      
      const plugin = pluginManager.getPluginById('test-plugin');
      expect(plugin).toBeNull();
    });

    it('should get plugins by type', async () => {
      await pluginManager.registerPlugin(testPlugin);
      
      const servicePlugins = pluginManager.getPluginsByType(QwalletPluginType.SERVICE);
      expect(servicePlugins).toHaveLength(1);
      expect(servicePlugins[0].pluginId).toBe('test-plugin');
      
      const auditPlugins = pluginManager.getPluginsByType(QwalletPluginType.AUDIT);
      expect(auditPlugins).toHaveLength(0);
    });

    it('should get plugins for identity type', async () => {
      await pluginManager.registerPlugin(testPlugin);
      
      const rootPlugins = pluginManager.getPluginsForIdentity(IdentityType.ROOT);
      expect(rootPlugins).toHaveLength(1);
      
      const aidPlugins = pluginManager.getPluginsForIdentity(IdentityType.AID);
      expect(aidPlugins).toHaveLength(0);
    });

    it('should update plugin configuration', async () => {
      await pluginManager.registerPlugin(testPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      const config = { testSetting: 'testValue' };
      const success = await pluginManager.updatePluginConfig('test-plugin', config);
      
      expect(success).toBe(true);
      expect(testPlugin.getConfigureCallCount()).toBe(1);
      
      const savedConfig = pluginManager.getPluginConfig('test-plugin');
      expect(savedConfig.testSetting).toBe('testValue');
    });
  });

  describe('Base Plugin', () => {
    it('should validate plugin correctly', async () => {
      const validation = await testPlugin.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should check identity compatibility', () => {
      expect(testPlugin.isCompatible(IdentityType.ROOT)).toBe(true);
      expect(testPlugin.isCompatible(IdentityType.DAO)).toBe(true);
      expect(testPlugin.isCompatible(IdentityType.AID)).toBe(false);
    });

    it('should check permissions', () => {
      expect(testPlugin.hasPermission('test:read')).toBe(true);
      expect(testPlugin.hasPermission('test:write')).toBe(false);
    });

    it('should get plugin info', () => {
      const info = testPlugin.getInfo();
      
      expect(info.pluginId).toBe('test-plugin');
      expect(info.name).toBe('Test Plugin');
      expect(info.version).toBe('1.0.0');
      expect(info.type).toBe(QwalletPluginType.SERVICE);
      expect(info.capabilities).toContain('test_capability');
    });

    it('should perform health check', async () => {
      const health = await testPlugin.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.status).toBe(PluginStatus.INACTIVE);
      expect(health.lastCheck).toBeDefined();
    });
  });

  describe('Audit Logger Plugin', () => {
    let auditPlugin: AuditLoggerPlugin;

    beforeEach(() => {
      auditPlugin = new AuditLoggerPlugin();
    });

    it('should register and activate successfully', async () => {
      const registerSuccess = await pluginManager.registerPlugin(auditPlugin);
      expect(registerSuccess).toBe(true);
      
      const activateSuccess = await pluginManager.activatePlugin('audit-logger');
      expect(activateSuccess).toBe(true);
      expect(auditPlugin.status).toBe(PluginStatus.ACTIVE);
    });

    it('should log wallet operations', async () => {
      await pluginManager.registerPlugin(auditPlugin);
      await pluginManager.activatePlugin('audit-logger');
      
      const operation: WalletOperation = {
        operationType: 'TRANSFER',
        identityId: 'test-identity',
        amount: 100,
        token: 'ETH',
        recipient: '0x123',
        metadata: {},
        timestamp: new Date().toISOString()
      };

      await auditPlugin.onWalletOperation!(operation);
      
      const logs = await auditPlugin.getAuditLogs('test-identity');
      expect(logs).toHaveLength(1);
      expect(logs[0].operationType).toBe('TRANSFER');
    });

    it('should generate audit reports', async () => {
      await pluginManager.registerPlugin(auditPlugin);
      await pluginManager.activatePlugin('audit-logger');
      
      const transaction: WalletTransaction = {
        transactionId: 'tx-123',
        identityId: 'test-identity',
        operationType: 'TRANSFER',
        amount: 100,
        token: 'ETH',
        fromAddress: '0x456',
        toAddress: '0x789',
        timestamp: new Date().toISOString(),
        status: 'CONFIRMED'
      };

      await auditPlugin.logTransaction(transaction);
      
      const report = await auditPlugin.generateReport('test-identity', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      expect(report).toBeDefined();
      expect(report.identityId).toBe('test-identity');
      expect(report.totalOperations).toBe(1);
    });
  });

  describe('Token Validator Plugin', () => {
    let tokenPlugin: TokenValidatorPlugin;

    beforeEach(() => {
      tokenPlugin = new TokenValidatorPlugin();
    });

    it('should register and activate successfully', async () => {
      const registerSuccess = await pluginManager.registerPlugin(tokenPlugin);
      expect(registerSuccess).toBe(true);
      
      const activateSuccess = await pluginManager.activatePlugin('token-validator');
      expect(activateSuccess).toBe(true);
      expect(tokenPlugin.status).toBe(PluginStatus.ACTIVE);
    });

    it('should validate tokens', async () => {
      await pluginManager.registerPlugin(tokenPlugin);
      await pluginManager.activatePlugin('token-validator');
      
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const isValid = await tokenPlugin.validateToken(tokenAddress);
      
      expect(typeof isValid).toBe('boolean');
    });

    it('should get token metadata', async () => {
      await pluginManager.registerPlugin(tokenPlugin);
      await pluginManager.activatePlugin('token-validator');
      
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const metadata = await tokenPlugin.getTokenMetadata(tokenAddress);
      
      expect(metadata).toBeDefined();
      expect(metadata?.address).toBe(tokenAddress);
      expect(metadata?.name).toBeDefined();
      expect(metadata?.symbol).toBeDefined();
    });

    it('should manage trusted tokens', async () => {
      await pluginManager.registerPlugin(tokenPlugin);
      await pluginManager.activatePlugin('token-validator');
      
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const addSuccess = await tokenPlugin.addTrustedToken(tokenAddress);
      expect(addSuccess).toBe(true);
      
      const supportedTokens = await tokenPlugin.getSupportedTokens();
      expect(supportedTokens).toContain(tokenAddress.toLowerCase());
      
      const removeSuccess = await tokenPlugin.removeTrustedToken(tokenAddress);
      expect(removeSuccess).toBe(true);
    });

    it('should blacklist tokens', async () => {
      await pluginManager.registerPlugin(tokenPlugin);
      await pluginManager.activatePlugin('token-validator');
      
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const blacklistSuccess = await tokenPlugin.blacklistToken(tokenAddress, 'Test reason');
      expect(blacklistSuccess).toBe(true);
      
      const isValid = await tokenPlugin.validateToken(tokenAddress);
      expect(isValid).toBe(false);
    });
  });

  describe('Plugin Hooks', () => {
    it('should execute wallet operation hooks', async () => {
      await pluginManager.registerPlugin(testPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      const operation: WalletOperation = {
        operationType: 'TRANSFER',
        identityId: 'test-identity',
        amount: 100,
        token: 'ETH',
        recipient: '0x123',
        metadata: {},
        timestamp: new Date().toISOString()
      };

      // This should not throw
      await pluginManager.onWalletOperation(operation);
    });

    it('should execute identity switch hooks', async () => {
      await pluginManager.registerPlugin(testPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      // This should not throw
      await pluginManager.onIdentitySwitch('identity-1', 'identity-2');
    });

    it('should execute transaction complete hooks', async () => {
      await pluginManager.registerPlugin(testPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      const transaction: WalletTransaction = {
        transactionId: 'tx-123',
        identityId: 'test-identity',
        operationType: 'TRANSFER',
        amount: 100,
        token: 'ETH',
        fromAddress: '0x456',
        toAddress: '0x789',
        timestamp: new Date().toISOString(),
        status: 'CONFIRMED'
      };

      // This should not throw
      await pluginManager.onTransactionComplete(transaction);
    });
  });

  describe('Plugin Storage', () => {
    it('should provide plugin storage', async () => {
      // Create a fresh plugin manager for this test to avoid interference
      const testManager = new QwalletPluginManager();
      await testManager.initialize();
      
      const testPluginForStorage = new TestPlugin();
      await testManager.registerPlugin(testPluginForStorage);
      
      const storage = testManager.getPluginStorage('test-plugin');
      expect(storage).toBeDefined();
      
      // Test basic storage operations
      await storage.set('testKey', 'testValue');
      
      // Debug: Check if the value was actually set
      const keys = await storage.keys();
      console.log('Storage keys after set:', keys);
      
      const value = await storage.get('testKey');
      console.log('Retrieved value:', value);
      expect(value).toBe('testValue');
      
      const hasKey = await storage.has('testKey');
      expect(hasKey).toBe(true);
      
      await storage.delete('testKey');
      const deletedValue = await storage.get('testKey');
      expect(deletedValue).toBeNull();
      
      // Clean up
      await testManager.unregisterPlugin('test-plugin');
    });

    it('should clear plugin storage', async () => {
      await pluginManager.registerPlugin(testPlugin);
      
      const storage = pluginManager.getPluginStorage('test-plugin');
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      
      await storage.clear();
      
      const keys = await storage.keys();
      expect(keys).toHaveLength(0);
    });
  });
});