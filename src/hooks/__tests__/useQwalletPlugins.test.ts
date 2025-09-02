/**
 * useQwalletPlugins Hook Tests
 * 
 * Comprehensive unit tests for the Qwallet plugins management hook
 * covering plugin loading, execution, and identity-specific restrictions
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useQwalletPlugins } from '../useQwalletPlugins';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock external dependencies
vi.mock('../../services/QwalletPluginManager', () => ({
  QwalletPluginManager: {
    getInstance: vi.fn(() => ({
      loadPlugin: vi.fn(),
      unloadPlugin: vi.fn(),
      executePlugin: vi.fn(),
      getLoadedPlugins: vi.fn(),
      getAvailablePlugins: vi.fn(),
      validatePlugin: vi.fn(),
      getPluginPermissions: vi.fn()
    }))
  }
}));

vi.mock('../../api/qonsent', () => ({
  checkPermission: vi.fn(),
  requestPermission: vi.fn()
}));

vi.mock('../../api/qerberos', () => ({
  logAuditEvent: vi.fn()
}));

import { QwalletPluginManager } from '../../services/QwalletPluginManager';
import * as qonsentApi from '../../api/qonsent';
import * as qerberosApi from '../../api/qerberos';

describe('useQwalletPlugins', () => {
  const mockRootIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root123',
    identityType: IdentityType.ROOT,
    displayName: 'Root User',
    isActive: true,
    permissions: ['wallet:full_access', 'plugins:manage'],
    walletAddress: 'wallet-root123'
  };

  const mockDAOIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:dao123',
    identityType: IdentityType.DAO,
    displayName: 'DAO User',
    isActive: true,
    permissions: ['wallet:dao_access', 'plugins:limited'],
    walletAddress: 'wallet-dao123'
  };

  const mockConsentidaIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:consentida123',
    identityType: IdentityType.CONSENTIDA,
    displayName: 'Minor User',
    isActive: true,
    permissions: ['wallet:view_only'],
    walletAddress: 'wallet-consentida123'
  };

  const mockPluginManager = {
    loadPlugin: vi.fn(),
    unloadPlugin: vi.fn(),
    executePlugin: vi.fn(),
    getLoadedPlugins: vi.fn(),
    getAvailablePlugins: vi.fn(),
    validatePlugin: vi.fn(),
    getPluginPermissions: vi.fn()
  };

  const mockAvailablePlugins = [
    {
      id: 'defi-plugin',
      name: 'DeFi Integration',
      version: '1.0.0',
      description: 'Integrate with DeFi protocols',
      permissions: ['wallet:transfer', 'external:defi'],
      identityTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
      category: 'finance'
    },
    {
      id: 'nft-plugin',
      name: 'NFT Marketplace',
      version: '1.2.0',
      description: 'Buy and sell NFTs',
      permissions: ['wallet:transfer', 'external:marketplace'],
      identityTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
      category: 'marketplace'
    },
    {
      id: 'analytics-plugin',
      name: 'Portfolio Analytics',
      version: '2.0.0',
      description: 'Track portfolio performance',
      permissions: ['wallet:read'],
      identityTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA],
      category: 'analytics'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(QwalletPluginManager.getInstance).mockReturnValue(mockPluginManager);
    
    mockPluginManager.getAvailablePlugins.mockResolvedValue(mockAvailablePlugins);
    mockPluginManager.getLoadedPlugins.mockResolvedValue([]);
    mockPluginManager.validatePlugin.mockResolvedValue({ valid: true });
    mockPluginManager.getPluginPermissions.mockResolvedValue([]);
    
    vi.mocked(qonsentApi.checkPermission).mockResolvedValue(true);
    vi.mocked(qerberosApi.logAuditEvent).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with null identity', () => {
      const { result } = renderHook(() => useQwalletPlugins(null));
      
      expect(result.current.state.availablePlugins).toEqual([]);
      expect(result.current.state.loadedPlugins).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should load available plugins for ROOT identity', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      expect(result.current.state.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.availablePlugins).toEqual(mockAvailablePlugins);
      });
    });

    it('should filter plugins by identity type', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockConsentidaIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.availablePlugins).toHaveLength(1);
        expect(result.current.state.availablePlugins[0].id).toBe('analytics-plugin');
      });
    });
  });

  describe('Plugin Loading', () => {
    it('should load plugin successfully', async () => {
      mockPluginManager.loadPlugin.mockResolvedValue({
        success: true,
        plugin: {
          id: 'defi-plugin',
          name: 'DeFi Integration',
          loaded: true,
          instance: {}
        }
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let loadResult;
      await act(async () => {
        loadResult = await result.current.actions.loadPlugin('defi-plugin');
      });
      
      expect(loadResult.success).toBe(true);
      expect(mockPluginManager.loadPlugin).toHaveBeenCalledWith('defi-plugin', mockRootIdentity);
      expect(vi.mocked(qerberosApi.logAuditEvent)).toHaveBeenCalledWith({
        event: 'plugin_loaded',
        identityId: mockRootIdentity.did,
        details: { pluginId: 'defi-plugin' }
      });
    });

    it('should handle plugin loading failure', async () => {
      mockPluginManager.loadPlugin.mockResolvedValue({
        success: false,
        error: 'Plugin validation failed'
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let loadResult;
      await act(async () => {
        loadResult = await result.current.actions.loadPlugin('defi-plugin');
      });
      
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toBe('Plugin validation failed');
    });

    it('should check Qonsent permissions before loading', async () => {
      vi.mocked(qonsentApi.checkPermission).mockResolvedValue(false);

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let loadResult;
      await act(async () => {
        loadResult = await result.current.actions.loadPlugin('defi-plugin');
      });
      
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('Permission denied by Qonsent');
      expect(mockPluginManager.loadPlugin).not.toHaveBeenCalled();
    });

    it('should prevent loading plugins not allowed for identity type', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockConsentidaIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let loadResult;
      await act(async () => {
        loadResult = await result.current.actions.loadPlugin('defi-plugin');
      });
      
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('Plugin not allowed for this identity type');
    });
  });

  describe('Plugin Unloading', () => {
    it('should unload plugin successfully', async () => {
      mockPluginManager.unloadPlugin.mockResolvedValue({
        success: true
      });

      mockPluginManager.getLoadedPlugins.mockResolvedValue([
        { id: 'defi-plugin', name: 'DeFi Integration', loaded: true }
      ]);

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let unloadResult;
      await act(async () => {
        unloadResult = await result.current.actions.unloadPlugin('defi-plugin');
      });
      
      expect(unloadResult.success).toBe(true);
      expect(mockPluginManager.unloadPlugin).toHaveBeenCalledWith('defi-plugin');
      expect(vi.mocked(qerberosApi.logAuditEvent)).toHaveBeenCalledWith({
        event: 'plugin_unloaded',
        identityId: mockRootIdentity.did,
        details: { pluginId: 'defi-plugin' }
      });
    });

    it('should handle plugin unloading failure', async () => {
      mockPluginManager.unloadPlugin.mockResolvedValue({
        success: false,
        error: 'Plugin is currently in use'
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let unloadResult;
      await act(async () => {
        unloadResult = await result.current.actions.unloadPlugin('defi-plugin');
      });
      
      expect(unloadResult.success).toBe(false);
      expect(unloadResult.error).toBe('Plugin is currently in use');
    });
  });

  describe('Plugin Execution', () => {
    it('should execute plugin method successfully', async () => {
      mockPluginManager.executePlugin.mockResolvedValue({
        success: true,
        result: { balance: 1000, apy: 5.2 }
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let executeResult;
      await act(async () => {
        executeResult = await result.current.actions.executePlugin('defi-plugin', 'getBalance', { token: 'USDC' });
      });
      
      expect(executeResult.success).toBe(true);
      expect(executeResult.result).toEqual({ balance: 1000, apy: 5.2 });
      expect(mockPluginManager.executePlugin).toHaveBeenCalledWith(
        'defi-plugin',
        'getBalance',
        { token: 'USDC' },
        mockRootIdentity
      );
    });

    it('should handle plugin execution failure', async () => {
      mockPluginManager.executePlugin.mockResolvedValue({
        success: false,
        error: 'Method not found'
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let executeResult;
      await act(async () => {
        executeResult = await result.current.actions.executePlugin('defi-plugin', 'invalidMethod');
      });
      
      expect(executeResult.success).toBe(false);
      expect(executeResult.error).toBe('Method not found');
    });

    it('should log plugin execution to audit trail', async () => {
      mockPluginManager.executePlugin.mockResolvedValue({
        success: true,
        result: { success: true }
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      await act(async () => {
        await result.current.actions.executePlugin('defi-plugin', 'swap', { from: 'ETH', to: 'USDC', amount: 1 });
      });
      
      expect(vi.mocked(qerberosApi.logAuditEvent)).toHaveBeenCalledWith({
        event: 'plugin_executed',
        identityId: mockRootIdentity.did,
        details: {
          pluginId: 'defi-plugin',
          method: 'swap',
          params: { from: 'ETH', to: 'USDC', amount: 1 }
        }
      });
    });
  });

  describe('Plugin Categories and Filtering', () => {
    it('should filter plugins by category', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      act(() => {
        result.current.actions.filterByCategory('finance');
      });
      
      expect(result.current.state.filteredPlugins).toHaveLength(1);
      expect(result.current.state.filteredPlugins[0].id).toBe('defi-plugin');
    });

    it('should search plugins by name', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      act(() => {
        result.current.actions.searchPlugins('NFT');
      });
      
      expect(result.current.state.filteredPlugins).toHaveLength(1);
      expect(result.current.state.filteredPlugins[0].id).toBe('nft-plugin');
    });

    it('should get plugins by category', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      const financePlugins = result.current.utils.getPluginsByCategory('finance');
      expect(financePlugins).toHaveLength(1);
      expect(financePlugins[0].id).toBe('defi-plugin');
    });
  });

  describe('Plugin Permissions', () => {
    it('should check if plugin is allowed for identity', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      const isAllowed = result.current.utils.isPluginAllowedForIdentity('defi-plugin', mockRootIdentity);
      expect(isAllowed).toBe(true);
      
      const isNotAllowed = result.current.utils.isPluginAllowedForIdentity('defi-plugin', mockConsentidaIdentity);
      expect(isNotAllowed).toBe(false);
    });

    it('should get required permissions for plugin', async () => {
      mockPluginManager.getPluginPermissions.mockResolvedValue(['wallet:transfer', 'external:defi']);

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let permissions;
      await act(async () => {
        permissions = await result.current.utils.getPluginPermissions('defi-plugin');
      });
      
      expect(permissions).toEqual(['wallet:transfer', 'external:defi']);
    });
  });

  describe('Plugin State Management', () => {
    it('should track loaded plugins', async () => {
      const loadedPlugins = [
        { id: 'defi-plugin', name: 'DeFi Integration', loaded: true },
        { id: 'analytics-plugin', name: 'Portfolio Analytics', loaded: true }
      ];

      mockPluginManager.getLoadedPlugins.mockResolvedValue(loadedPlugins);

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.loadedPlugins).toEqual(loadedPlugins);
      });
    });

    it('should refresh plugin state', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      await act(async () => {
        await result.current.actions.refreshPlugins();
      });
      
      expect(mockPluginManager.getAvailablePlugins).toHaveBeenCalledTimes(2);
      expect(mockPluginManager.getLoadedPlugins).toHaveBeenCalledTimes(2);
    });

    it('should clear plugin errors', async () => {
      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      // Simulate error state
      await act(async () => {
        result.current.state.error = 'Plugin error';
      });
      
      act(() => {
        result.current.actions.clearError();
      });
      
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Identity Switching', () => {
    it('should update available plugins when identity changes', async () => {
      const { result, rerender } = renderHook(
        ({ identity }) => useQwalletPlugins(identity),
        { initialProps: { identity: mockRootIdentity } }
      );
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.availablePlugins).toHaveLength(3);
      });
      
      // Switch to CONSENTIDA identity
      rerender({ identity: mockConsentidaIdentity });
      
      await waitFor(() => {
        expect(result.current.state.availablePlugins).toHaveLength(1);
        expect(result.current.state.availablePlugins[0].id).toBe('analytics-plugin');
      });
    });

    it('should unload incompatible plugins on identity switch', async () => {
      mockPluginManager.getLoadedPlugins.mockResolvedValue([
        { id: 'defi-plugin', name: 'DeFi Integration', loaded: true }
      ]);

      const { result, rerender } = renderHook(
        ({ identity }) => useQwalletPlugins(identity),
        { initialProps: { identity: mockRootIdentity } }
      );
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      // Switch to CONSENTIDA identity
      rerender({ identity: mockConsentidaIdentity });
      
      await waitFor(() => {
        expect(mockPluginManager.unloadPlugin).toHaveBeenCalledWith('defi-plugin');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin manager initialization failure', async () => {
      vi.mocked(QwalletPluginManager.getInstance).mockImplementation(() => {
        throw new Error('Plugin manager initialization failed');
      });

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBe('Plugin manager initialization failed');
      });
    });

    it('should handle network errors gracefully', async () => {
      mockPluginManager.getAvailablePlugins.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQwalletPlugins(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBe('Network error');
      });
    });
  });
});