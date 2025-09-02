/**
 * Plugin Integration Utilities
 * Helper functions for integrating plugins with wallet operations
 */

import { 
  WalletOperation, 
  WalletTransaction,
  PluginMenuItem 
} from '../types/qwallet-plugin';
import { pluginManager } from '../services/QwalletPluginManager';
import { IdentityType } from '../types/identity';
import { IdentityWalletConfig, WalletPermissions } from '../types/wallet-config';

/**
 * Plugin Integration Class
 * Provides utilities for integrating plugins with wallet operations
 */
export class PluginIntegration {
  private static instance: PluginIntegration;

  private constructor() {}

  static getInstance(): PluginIntegration {
    if (!PluginIntegration.instance) {
      PluginIntegration.instance = new PluginIntegration();
    }
    return PluginIntegration.instance;
  }

  /**
   * Initialize plugin integration
   */
  async initialize(): Promise<void> {
    await pluginManager.initialize();
  }

  /**
   * Execute wallet operation with plugin hooks
   */
  async executeWalletOperation(operation: WalletOperation): Promise<void> {
    try {
      await pluginManager.onWalletOperation(operation);
    } catch (error) {
      console.error('Plugin integration error during wallet operation:', error);
      // Don't throw - plugins should not break core functionality
    }
  }

  /**
   * Handle identity switch with plugin hooks
   */
  async handleIdentitySwitch(fromId: string, toId: string): Promise<void> {
    try {
      await pluginManager.onIdentitySwitch(fromId, toId);
    } catch (error) {
      console.error('Plugin integration error during identity switch:', error);
      // Don't throw - plugins should not break core functionality
    }
  }

  /**
   * Handle transaction completion with plugin hooks
   */
  async handleTransactionComplete(transaction: WalletTransaction): Promise<void> {
    try {
      await pluginManager.onTransactionComplete(transaction);
    } catch (error) {
      console.error('Plugin integration error during transaction completion:', error);
      // Don't throw - plugins should not break core functionality
    }
  }

  /**
   * Get menu items from UI plugins
   */
  getPluginMenuItems(identityType?: IdentityType): PluginMenuItem[] {
    try {
      const uiPlugins = identityType 
        ? pluginManager.getPluginsForIdentity(identityType)
        : pluginManager.getActivePlugins();

      const menuItems: PluginMenuItem[] = [];

      uiPlugins.forEach(plugin => {
        if (plugin.getMenuItems) {
          try {
            const items = plugin.getMenuItems();
            menuItems.push(...items);
          } catch (error) {
            console.error(`Error getting menu items from plugin ${plugin.pluginId}:`, error);
          }
        }
      });

      return menuItems;
    } catch (error) {
      console.error('Error getting plugin menu items:', error);
      return [];
    }
  }

  /**
   * Validate token using token plugins
   */
  async validateToken(tokenAddress: string): Promise<boolean> {
    try {
      const tokenPlugins = pluginManager.getPluginsByType('TOKEN' as any);
      
      for (const plugin of tokenPlugins) {
        if (plugin.status === 'ACTIVE' && (plugin as any).validateToken) {
          try {
            const isValid = await (plugin as any).validateToken(tokenAddress);
            if (!isValid) {
              return false; // If any plugin says invalid, token is invalid
            }
          } catch (error) {
            console.error(`Token validation error in plugin ${plugin.pluginId}:`, error);
          }
        }
      }

      return true; // All plugins passed or no token plugins active
    } catch (error) {
      console.error('Error validating token with plugins:', error);
      return true; // Default to valid if plugin system fails
    }
  }

  /**
   * Get token metadata from token plugins
   */
  async getTokenMetadata(tokenAddress: string): Promise<any> {
    try {
      const tokenPlugins = pluginManager.getPluginsByType('TOKEN' as any);
      
      for (const plugin of tokenPlugins) {
        if (plugin.status === 'ACTIVE' && (plugin as any).getTokenMetadata) {
          try {
            const metadata = await (plugin as any).getTokenMetadata(tokenAddress);
            if (metadata) {
              return metadata;
            }
          } catch (error) {
            console.error(`Token metadata error in plugin ${plugin.pluginId}:`, error);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting token metadata from plugins:', error);
      return null;
    }
  }

  /**
   * Generate audit report using audit plugins
   */
  async generateAuditReport(
    identityId: string, 
    period: { start: string; end: string }
  ): Promise<any> {
    try {
      const auditPlugins = pluginManager.getPluginsByType('AUDIT' as any);
      
      for (const plugin of auditPlugins) {
        if (plugin.status === 'ACTIVE' && (plugin as any).generateReport) {
          try {
            const report = await (plugin as any).generateReport(identityId, period);
            if (report) {
              return report;
            }
          } catch (error) {
            console.error(`Audit report error in plugin ${plugin.pluginId}:`, error);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error generating audit report from plugins:', error);
      return null;
    }
  }

  /**
   * Check if any security plugins are active
   */
  hasSecurityPlugins(): boolean {
    try {
      const securityPlugins = pluginManager.getPluginsByType('SECURITY' as any);
      return securityPlugins.some(plugin => plugin.status === 'ACTIVE');
    } catch (error) {
      console.error('Error checking security plugins:', error);
      return false;
    }
  }

  /**
   * Get analytics data from analytics plugins
   */
  async getAnalyticsData(identityId: string): Promise<any> {
    try {
      const analyticsPlugins = pluginManager.getPluginsByType('ANALYTICS' as any);
      
      const analyticsData: any[] = [];

      for (const plugin of analyticsPlugins) {
        if (plugin.status === 'ACTIVE' && (plugin as any).getAnalyticsData) {
          try {
            const data = await (plugin as any).getAnalyticsData(identityId);
            if (data) {
              analyticsData.push({
                pluginId: plugin.pluginId,
                pluginName: plugin.name,
                data
              });
            }
          } catch (error) {
            console.error(`Analytics data error in plugin ${plugin.pluginId}:`, error);
          }
        }
      }

      return analyticsData;
    } catch (error) {
      console.error('Error getting analytics data from plugins:', error);
      return [];
    }
  }

  /**
   * Execute custom plugin hook
   */
  async executeCustomHook(hookName: string, ...args: any[]): Promise<void> {
    try {
      await pluginManager.executeHook(hookName, ...args);
    } catch (error) {
      console.error(`Error executing custom hook ${hookName}:`, error);
    }
  }

  /**
   * Get plugin status summary
   */
  getPluginStatusSummary(): {
    total: number;
    active: number;
    inactive: number;
    error: number;
    byType: Record<string, number>;
  } {
    try {
      const allPlugins = pluginManager.getAllPlugins();
      const activePlugins = pluginManager.getActivePlugins();
      const inactivePlugins = pluginManager.getInactivePlugins();
      
      const errorPlugins = allPlugins.filter(plugin => plugin.status === 'ERROR');
      
      const byType: Record<string, number> = {};
      allPlugins.forEach(plugin => {
        byType[plugin.type] = (byType[plugin.type] || 0) + 1;
      });

      return {
        total: allPlugins.length,
        active: activePlugins.length,
        inactive: inactivePlugins.length,
        error: errorPlugins.length,
        byType
      };
    } catch (error) {
      console.error('Error getting plugin status summary:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        error: 0,
        byType: {}
      };
    }
  }

  /**
   * Register built-in plugins
   */
  async registerBuiltinPlugins(): Promise<void> {
    try {
      // This would register built-in plugins
      // For now, just log that we're registering
      console.log('Registering built-in plugins...');
      
      // In a real implementation, you would import and register plugins here:
      // const auditPlugin = new AuditLoggerPlugin();
      // await pluginManager.registerPlugin(auditPlugin);
      
      // const tokenPlugin = new TokenValidatorPlugin();
      // await pluginManager.registerPlugin(tokenPlugin);
      
    } catch (error) {
      console.error('Error registering built-in plugins:', error);
    }
  }

  /**
   * Handle plugin configuration changes
   */
  async handleConfigChange(
    identityId: string, 
    config: IdentityWalletConfig
  ): Promise<void> {
    try {
      const activePlugins = pluginManager.getActivePlugins();
      
      const promises = activePlugins
        .filter(plugin => plugin.onConfigChange)
        .map(plugin => plugin.onConfigChange!(identityId, config));

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error handling config change in plugins:', error);
    }
  }

  /**
   * Handle permission changes
   */
  async handlePermissionChange(
    identityId: string, 
    permissions: WalletPermissions
  ): Promise<void> {
    try {
      const activePlugins = pluginManager.getActivePlugins();
      
      const promises = activePlugins
        .filter(plugin => plugin.onPermissionChange)
        .map(plugin => plugin.onPermissionChange!(identityId, permissions));

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error handling permission change in plugins:', error);
    }
  }

  /**
   * Cleanup plugin integration
   */
  async cleanup(): Promise<void> {
    try {
      // Deactivate all plugins
      const activePlugins = pluginManager.getActivePlugins();
      
      for (const plugin of activePlugins) {
        try {
          await pluginManager.deactivatePlugin(plugin.pluginId);
        } catch (error) {
          console.error(`Error deactivating plugin ${plugin.pluginId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error during plugin integration cleanup:', error);
    }
  }
}

// Export singleton instance
export const pluginIntegration = PluginIntegration.getInstance();