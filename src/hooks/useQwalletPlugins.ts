/**
 * Qwallet Plugins Hook
 * Provides React integration for the plugin system
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  QwalletPlugin, 
  QwalletPluginType, 
  PluginStatus,
  PluginEvent,
  PluginEventType,
  PluginEventHandler,
  PluginValidationResult,
  PluginMenuItem
} from '../types/qwallet-plugin';
import { IdentityType } from '../types/identity';
import { pluginManager } from '../services/QwalletPluginManager';

export interface UseQwalletPluginsOptions {
  autoInitialize?: boolean;
  filterByIdentityType?: IdentityType;
  filterByType?: QwalletPluginType;
  activeOnly?: boolean;
}

export interface UseQwalletPluginsReturn {
  // Plugin lists
  plugins: QwalletPlugin[];
  activePlugins: QwalletPlugin[];
  inactivePlugins: QwalletPlugin[];
  
  // Plugin management
  registerPlugin: (plugin: QwalletPlugin) => Promise<boolean>;
  unregisterPlugin: (pluginId: string) => Promise<boolean>;
  activatePlugin: (pluginId: string) => Promise<boolean>;
  deactivatePlugin: (pluginId: string) => Promise<boolean>;
  reloadPlugin: (pluginId: string) => Promise<boolean>;
  
  // Plugin discovery
  getPluginById: (pluginId: string) => QwalletPlugin | null;
  getPluginsByType: (type: QwalletPluginType) => QwalletPlugin[];
  getPluginsForIdentity: (identityType: IdentityType) => QwalletPlugin[];
  
  // Plugin configuration
  getPluginConfig: (pluginId: string) => Record<string, any>;
  updatePluginConfig: (pluginId: string, config: Record<string, any>) => Promise<boolean>;
  validatePluginConfig: (pluginId: string, config: Record<string, any>) => Promise<PluginValidationResult>;
  
  // Plugin UI integration
  getMenuItems: () => PluginMenuItem[];
  getUIPlugins: () => QwalletPlugin[];
  
  // State
  loading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Events
  addEventListener: (event: PluginEventType, handler: PluginEventHandler) => void;
  removeEventListener: (event: PluginEventType, handler: PluginEventHandler) => void;
  
  // Utilities
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useQwalletPlugins = (options: UseQwalletPluginsOptions = {}): UseQwalletPluginsReturn => {
  const {
    autoInitialize = true,
    filterByIdentityType,
    filterByType,
    activeOnly = false
  } = options;

  // State
  const [plugins, setPlugins] = useState<QwalletPlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize plugin manager
  const initialize = useCallback(async () => {
    if (initialized) return;

    try {
      setLoading(true);
      setError(null);
      
      await pluginManager.initialize();
      setInitialized(true);
      
      // Load initial plugins
      await refresh();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize plugin manager');
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  // Refresh plugin list
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allPlugins = pluginManager.getAllPlugins();
      
      // Apply filters
      if (filterByIdentityType) {
        allPlugins = allPlugins.filter(plugin => 
          plugin.supportedIdentityTypes.includes(filterByIdentityType)
        );
      }
      
      if (filterByType) {
        allPlugins = allPlugins.filter(plugin => plugin.type === filterByType);
      }
      
      if (activeOnly) {
        allPlugins = allPlugins.filter(plugin => plugin.status === PluginStatus.ACTIVE);
      }
      
      setPlugins(allPlugins);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh plugins');
    } finally {
      setLoading(false);
    }
  }, [filterByIdentityType, filterByType, activeOnly]);

  // Plugin management functions
  const registerPlugin = useCallback(async (plugin: QwalletPlugin): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.registerPlugin(plugin);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register plugin');
      return false;
    }
  }, [refresh]);

  const unregisterPlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.unregisterPlugin(pluginId);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister plugin');
      return false;
    }
  }, [refresh]);

  const activatePlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.activatePlugin(pluginId);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate plugin');
      return false;
    }
  }, [refresh]);

  const deactivatePlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.deactivatePlugin(pluginId);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate plugin');
      return false;
    }
  }, [refresh]);

  const reloadPlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.reloadPlugin(pluginId);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload plugin');
      return false;
    }
  }, [refresh]);

  // Plugin discovery functions
  const getPluginById = useCallback((pluginId: string): QwalletPlugin | null => {
    return pluginManager.getPluginById(pluginId);
  }, []);

  const getPluginsByType = useCallback((type: QwalletPluginType): QwalletPlugin[] => {
    return pluginManager.getPluginsByType(type);
  }, []);

  const getPluginsForIdentity = useCallback((identityType: IdentityType): QwalletPlugin[] => {
    return pluginManager.getPluginsForIdentity(identityType);
  }, []);

  // Plugin configuration functions
  const getPluginConfig = useCallback((pluginId: string): Record<string, any> => {
    return pluginManager.getPluginConfig(pluginId);
  }, []);

  const updatePluginConfig = useCallback(async (
    pluginId: string, 
    config: Record<string, any>
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await pluginManager.updatePluginConfig(pluginId, config);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plugin config');
      return false;
    }
  }, [refresh]);

  const validatePluginConfig = useCallback(async (
    pluginId: string, 
    config: Record<string, any>
  ): Promise<PluginValidationResult> => {
    return pluginManager.validatePluginConfig(pluginId, config);
  }, []);

  // Plugin UI integration
  const getMenuItems = useCallback((): PluginMenuItem[] => {
    const uiPlugins = plugins.filter(plugin => 
      plugin.type === QwalletPluginType.UI && 
      plugin.status === PluginStatus.ACTIVE &&
      plugin.getMenuItems
    );

    const menuItems: PluginMenuItem[] = [];
    
    uiPlugins.forEach(plugin => {
      try {
        const items = plugin.getMenuItems!();
        menuItems.push(...items);
      } catch (err) {
        console.error(`Failed to get menu items from plugin ${plugin.pluginId}:`, err);
      }
    });

    return menuItems;
  }, [plugins]);

  const getUIPlugins = useCallback((): QwalletPlugin[] => {
    return plugins.filter(plugin => 
      plugin.type === QwalletPluginType.UI && 
      plugin.status === PluginStatus.ACTIVE
    );
  }, [plugins]);

  // Event handling
  const addEventListener = useCallback((event: PluginEventType, handler: PluginEventHandler) => {
    pluginManager.addEventListener(event, handler);
  }, []);

  const removeEventListener = useCallback((event: PluginEventType, handler: PluginEventHandler) => {
    pluginManager.removeEventListener(event, handler);
  }, []);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const activePlugins = useMemo(() => 
    plugins.filter(plugin => plugin.status === PluginStatus.ACTIVE),
    [plugins]
  );

  const inactivePlugins = useMemo(() => 
    plugins.filter(plugin => plugin.status === PluginStatus.INACTIVE),
    [plugins]
  );

  // Auto-initialize effect
  useEffect(() => {
    if (autoInitialize && !initialized) {
      initialize();
    }
  }, [autoInitialize, initialized, initialize]);

  // Plugin event listener effect
  useEffect(() => {
    const handlePluginEvent = (event: PluginEvent) => {
      // Refresh plugin list on relevant events
      if ([
        PluginEventType.PLUGIN_REGISTERED,
        PluginEventType.PLUGIN_UNREGISTERED,
        PluginEventType.PLUGIN_ACTIVATED,
        PluginEventType.PLUGIN_DEACTIVATED
      ].includes(event.type)) {
        refresh();
      }
    };

    // Subscribe to plugin events
    Object.values(PluginEventType).forEach(eventType => {
      addEventListener(eventType, handlePluginEvent);
    });

    // Cleanup
    return () => {
      Object.values(PluginEventType).forEach(eventType => {
        removeEventListener(eventType, handlePluginEvent);
      });
    };
  }, [addEventListener, removeEventListener, refresh]);

  return {
    // Plugin lists
    plugins,
    activePlugins,
    inactivePlugins,
    
    // Plugin management
    registerPlugin,
    unregisterPlugin,
    activatePlugin,
    deactivatePlugin,
    reloadPlugin,
    
    // Plugin discovery
    getPluginById,
    getPluginsByType,
    getPluginsForIdentity,
    
    // Plugin configuration
    getPluginConfig,
    updatePluginConfig,
    validatePluginConfig,
    
    // Plugin UI integration
    getMenuItems,
    getUIPlugins,
    
    // State
    loading,
    error,
    initialized,
    
    // Events
    addEventListener,
    removeEventListener,
    
    // Utilities
    refresh,
    clearError
  };
};