/**
 * Plugin Registry Component
 * Provides UI for managing Qwallet plugins
 */

import React, { useState, useEffect } from 'react';
import { 
  QwalletPlugin, 
  QwalletPluginType, 
  PluginStatus,
  PluginValidationResult 
} from '../../types/qwallet-plugin';
import { useQwalletPlugins } from '../../hooks/useQwalletPlugins';
import { IdentityType } from '../../types/identity';

interface PluginRegistryProps {
  identityType?: IdentityType;
  className?: string;
}

export const PluginRegistry: React.FC<PluginRegistryProps> = ({
  identityType,
  className = ''
}) => {
  const {
    plugins,
    activePlugins,
    inactivePlugins,
    activatePlugin,
    deactivatePlugin,
    getPluginConfig,
    updatePluginConfig,
    validatePluginConfig,
    loading,
    error,
    initialized,
    refresh
  } = useQwalletPlugins({
    filterByIdentityType: identityType
  });

  const [selectedPlugin, setSelectedPlugin] = useState<QwalletPlugin | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [pluginConfig, setPluginConfig] = useState<Record<string, any>>({});
  const [configValidation, setConfigValidation] = useState<PluginValidationResult | null>(null);

  // Load plugin configuration when plugin is selected
  useEffect(() => {
    if (selectedPlugin) {
      const config = getPluginConfig(selectedPlugin.pluginId);
      setPluginConfig(config);
    }
  }, [selectedPlugin, getPluginConfig]);

  const handlePluginToggle = async (plugin: QwalletPlugin) => {
    try {
      if (plugin.status === PluginStatus.ACTIVE) {
        await deactivatePlugin(plugin.pluginId);
      } else {
        await activatePlugin(plugin.pluginId);
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleConfigSave = async () => {
    if (!selectedPlugin) return;

    try {
      // Validate configuration
      const validation = await validatePluginConfig(selectedPlugin.pluginId, pluginConfig);
      setConfigValidation(validation);

      if (validation.valid) {
        await updatePluginConfig(selectedPlugin.pluginId, pluginConfig);
        setConfigModalOpen(false);
        setSelectedPlugin(null);
      }
    } catch (error) {
      console.error('Failed to save plugin configuration:', error);
    }
  };

  const getStatusColor = (status: PluginStatus): string => {
    switch (status) {
      case PluginStatus.ACTIVE:
        return 'text-green-600 bg-green-100';
      case PluginStatus.INACTIVE:
        return 'text-gray-600 bg-gray-100';
      case PluginStatus.ERROR:
        return 'text-red-600 bg-red-100';
      case PluginStatus.LOADING:
        return 'text-blue-600 bg-blue-100';
      case PluginStatus.DISABLED:
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: QwalletPluginType): string => {
    switch (type) {
      case QwalletPluginType.AUDIT:
        return '📊';
      case QwalletPluginType.TOKEN:
        return '🪙';
      case QwalletPluginType.UI:
        return '🎨';
      case QwalletPluginType.SERVICE:
        return '⚙️';
      case QwalletPluginType.INTEGRATION:
        return '🔗';
      case QwalletPluginType.SECURITY:
        return '🔒';
      case QwalletPluginType.ANALYTICS:
        return '📈';
      default:
        return '🔌';
    }
  };

  if (!initialized) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing plugin system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plugin Registry</h2>
          <p className="text-gray-600">
            Manage Qwallet plugins for enhanced functionality
            {identityType && ` (${identityType} identity)`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Plugin Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 font-semibold">✓</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Plugins</p>
              <p className="text-2xl font-semibold text-gray-900">{activePlugins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-gray-600 font-semibold">○</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactive Plugins</p>
              <p className="text-2xl font-semibold text-gray-900">{inactivePlugins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 font-semibold">∑</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Plugins</p>
              <p className="text-2xl font-semibold text-gray-900">{plugins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Installed Plugins</h3>
        </div>

        {plugins.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">🔌</div>
            <p className="text-gray-500">No plugins installed</p>
            <p className="text-sm text-gray-400 mt-1">
              Install plugins to extend wallet functionality
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {plugins.map((plugin) => (
              <div key={plugin.pluginId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getTypeIcon(plugin.type)}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {plugin.name}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plugin.status)}`}>
                          {plugin.status}
                        </span>
                      </div>
                      <p className="text-gray-600">{plugin.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>v{plugin.version}</span>
                        <span>by {plugin.author}</span>
                        <span className="capitalize">{plugin.type.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Configure Button */}
                    <button
                      onClick={() => {
                        setSelectedPlugin(plugin);
                        setConfigModalOpen(true);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Configure
                    </button>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handlePluginToggle(plugin)}
                      disabled={loading || plugin.status === PluginStatus.LOADING}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        plugin.status === PluginStatus.ACTIVE
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      } disabled:opacity-50`}
                    >
                      {plugin.status === PluginStatus.LOADING
                        ? 'Loading...'
                        : plugin.status === PluginStatus.ACTIVE
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* Plugin Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Capabilities:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {plugin.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Supported Identities:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {plugin.supportedIdentityTypes.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {configModalOpen && selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Configure {selectedPlugin.name}
              </h3>
              <button
                onClick={() => {
                  setConfigModalOpen(false);
                  setSelectedPlugin(null);
                  setConfigValidation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Configuration Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plugin Configuration (JSON)
                </label>
                <textarea
                  value={JSON.stringify(pluginConfig, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setPluginConfig(config);
                      setConfigValidation(null);
                    } catch (error) {
                      // Invalid JSON - keep the text but don't update config
                    }
                  }}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="{}"
                />
              </div>

              {/* Validation Results */}
              {configValidation && (
                <div className={`p-3 rounded-lg ${
                  configValidation.valid 
                    ? 'bg-green-100 border border-green-400 text-green-700'
                    : 'bg-red-100 border border-red-400 text-red-700'
                }`}>
                  <p className="font-semibold">
                    {configValidation.valid ? 'Configuration Valid' : 'Configuration Invalid'}
                  </p>
                  {configValidation.errors.length > 0 && (
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {configValidation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                  {configValidation.warnings.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Warnings:</p>
                      <ul className="text-sm list-disc list-inside">
                        {configValidation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setConfigModalOpen(false);
                  setSelectedPlugin(null);
                  setConfigValidation(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfigSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};