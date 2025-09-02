/**
 * React Hook for Module Analytics and Monitoring
 * Provides real-time analytics data and monitoring capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ModuleUsageAnalytics,
  PerformanceMetrics,
  SystemHealthStatus,
  Alert,
  DashboardData,
  AlertRule
} from '../services/ModuleAnalyticsService';

export interface UseModuleAnalyticsOptions {
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  moduleId?: string;
}

export interface ModuleAnalyticsState {
  // Data
  dashboardData: DashboardData | null;
  moduleAnalytics: ModuleUsageAnalytics[];
  performanceMetrics: PerformanceMetrics[];
  healthStatus: SystemHealthStatus | null;
  activeAlerts: Alert[];
  alertRules: AlertRule[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Error state
  error: string | null;
  
  // Real-time updates
  lastUpdated: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface ModuleAnalyticsActions {
  // Data fetching
  refreshData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshHealthStatus: () => Promise<void>;
  
  // Module-specific analytics
  getModuleAnalytics: (moduleId: string) => Promise<ModuleUsageAnalytics | null>;
  
  // Alert management
  resolveAlert: (alertId: string) => Promise<boolean>;
  addAlertRule: (rule: AlertRule) => Promise<void>;
  removeAlertRule: (ruleId: string) => Promise<boolean>;
  
  // Export functionality
  exportAnalytics: (format?: 'json' | 'csv') => Promise<string>;
  
  // Real-time controls
  enableRealTime: () => void;
  disableRealTime: () => void;
}

/**
 * Hook for accessing module analytics and monitoring data
 */
export function useModuleAnalytics(options: UseModuleAnalyticsOptions = {}): [ModuleAnalyticsState, ModuleAnalyticsActions] {
  const {
    refreshInterval = 30000, // 30 seconds
    enableRealTimeUpdates = true,
    moduleId
  } = options;

  // State
  const [state, setState] = useState<ModuleAnalyticsState>({
    dashboardData: null,
    moduleAnalytics: [],
    performanceMetrics: [],
    healthStatus: null,
    activeAlerts: [],
    alertRules: [],
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
    connectionStatus: 'disconnected'
  });

  // Refs for cleanup
  const refreshTimer = useRef<NodeJS.Timeout>();
  const eventSource = useRef<EventSource>();
  const analyticsService = useRef<any>(null);

  /**
   * Initialize analytics service
   */
  const initializeService = useCallback(async () => {
    try {
      // Import the analytics service dynamically
      const { ModuleAnalyticsService } = await import('../services/ModuleAnalyticsService');
      const { ModuleRegistry } = await import('../services/ModuleRegistry');
      
      const moduleRegistry = new ModuleRegistry();
      analyticsService.current = new ModuleAnalyticsService(moduleRegistry);
      
      console.log('[useModuleAnalytics] Analytics service initialized');
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to initialize analytics service:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to initialize analytics service: ${error.message}`,
        loading: false
      }));
    }
  }, []);

  /**
   * Fetch dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    if (!analyticsService.current) return;

    try {
      setState(prev => ({ ...prev, refreshing: true, error: null }));
      
      const dashboardData = analyticsService.current.getDashboardData();
      
      setState(prev => ({
        ...prev,
        dashboardData,
        lastUpdated: new Date().toISOString(),
        refreshing: false,
        loading: false
      }));
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to refresh dashboard:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to refresh dashboard: ${error.message}`,
        refreshing: false,
        loading: false
      }));
    }
  }, []);

  /**
   * Fetch health status
   */
  const refreshHealthStatus = useCallback(async () => {
    if (!analyticsService.current) return;

    try {
      const healthStatus = await analyticsService.current.performHealthChecks();
      
      setState(prev => ({
        ...prev,
        healthStatus,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to refresh health status:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to refresh health status: ${error.message}`
      }));
    }
  }, []);

  /**
   * Fetch all analytics data
   */
  const refreshData = useCallback(async () => {
    if (!analyticsService.current) return;

    try {
      setState(prev => ({ ...prev, refreshing: true, error: null }));
      
      // Fetch all data in parallel
      const [
        dashboardData,
        moduleAnalytics,
        performanceMetrics,
        healthStatus,
        activeAlerts,
        alertRules
      ] = await Promise.all([
        Promise.resolve(analyticsService.current.getDashboardData()),
        Promise.resolve(analyticsService.current.getAllModuleAnalytics()),
        Promise.resolve(analyticsService.current.getPerformanceMetrics()),
        analyticsService.current.performHealthChecks(),
        Promise.resolve(analyticsService.current.getActiveAlerts()),
        Promise.resolve(analyticsService.current.getAlertRules())
      ]);
      
      setState(prev => ({
        ...prev,
        dashboardData,
        moduleAnalytics,
        performanceMetrics,
        healthStatus,
        activeAlerts,
        alertRules,
        lastUpdated: new Date().toISOString(),
        refreshing: false,
        loading: false
      }));
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to refresh data:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to refresh data: ${error.message}`,
        refreshing: false,
        loading: false
      }));
    }
  }, []);

  /**
   * Get analytics for a specific module
   */
  const getModuleAnalytics = useCallback(async (moduleId: string): Promise<ModuleUsageAnalytics | null> => {
    if (!analyticsService.current) return null;

    try {
      return analyticsService.current.getModuleAnalytics(moduleId);
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to get module analytics:', error);
      return null;
    }
  }, []);

  /**
   * Resolve an alert
   */
  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    if (!analyticsService.current) return false;

    try {
      const resolved = analyticsService.current.resolveAlert(alertId);
      
      if (resolved) {
        // Update local state
        setState(prev => ({
          ...prev,
          activeAlerts: prev.activeAlerts.filter(alert => alert.id !== alertId)
        }));
      }
      
      return resolved;
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to resolve alert:', error);
      return false;
    }
  }, []);

  /**
   * Add an alert rule
   */
  const addAlertRule = useCallback(async (rule: AlertRule): Promise<void> => {
    if (!analyticsService.current) return;

    try {
      analyticsService.current.addAlertRule(rule);
      
      // Update local state
      setState(prev => ({
        ...prev,
        alertRules: [...prev.alertRules, rule]
      }));
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to add alert rule:', error);
      throw error;
    }
  }, []);

  /**
   * Remove an alert rule
   */
  const removeAlertRule = useCallback(async (ruleId: string): Promise<boolean> => {
    if (!analyticsService.current) return false;

    try {
      const removed = analyticsService.current.removeAlertRule(ruleId);
      
      if (removed) {
        // Update local state
        setState(prev => ({
          ...prev,
          alertRules: prev.alertRules.filter(rule => rule.id !== ruleId)
        }));
      }
      
      return removed;
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to remove alert rule:', error);
      return false;
    }
  }, []);

  /**
   * Export analytics data
   */
  const exportAnalytics = useCallback(async (format: 'json' | 'csv' = 'json'): Promise<string> => {
    if (!analyticsService.current) return '';

    try {
      return analyticsService.current.exportAnalyticsData(format);
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to export analytics:', error);
      throw error;
    }
  }, []);

  /**
   * Enable real-time updates
   */
  const enableRealTime = useCallback(() => {
    if (!analyticsService.current || eventSource.current) return;

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
      // Set up event listeners for real-time updates
      analyticsService.current.on('operation', (data: any) => {
        setState(prev => ({
          ...prev,
          lastUpdated: new Date().toISOString()
        }));
      });

      analyticsService.current.on('alert', (alert: Alert) => {
        setState(prev => ({
          ...prev,
          activeAlerts: [...prev.activeAlerts, alert],
          lastUpdated: new Date().toISOString()
        }));
      });

      analyticsService.current.on('alertResolved', (alert: Alert) => {
        setState(prev => ({
          ...prev,
          activeAlerts: prev.activeAlerts.filter(a => a.id !== alert.id),
          lastUpdated: new Date().toISOString()
        }));
      });

      analyticsService.current.on('healthCheck', (healthStatus: SystemHealthStatus) => {
        setState(prev => ({
          ...prev,
          healthStatus,
          lastUpdated: new Date().toISOString()
        }));
      });
      
      setState(prev => ({ ...prev, connectionStatus: 'connected' }));
      console.log('[useModuleAnalytics] Real-time updates enabled');
    } catch (error) {
      console.error('[useModuleAnalytics] Failed to enable real-time updates:', error);
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    }
  }, []);

  /**
   * Disable real-time updates
   */
  const disableRealTime = useCallback(() => {
    if (analyticsService.current) {
      analyticsService.current.removeAllListeners();
    }
    
    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = undefined;
    }
    
    setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    console.log('[useModuleAnalytics] Real-time updates disabled');
  }, []);

  /**
   * Set up periodic refresh
   */
  const setupPeriodicRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }
    
    refreshTimer.current = setInterval(() => {
      if (!state.refreshing) {
        refreshData();
      }
    }, refreshInterval);
  }, [refreshInterval, refreshData, state.refreshing]);

  // Initialize service and load initial data
  useEffect(() => {
    initializeService().then(() => {
      refreshData();
      
      if (enableRealTimeUpdates) {
        enableRealTime();
      }
      
      setupPeriodicRefresh();
    });

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
      disableRealTime();
      
      if (analyticsService.current) {
        analyticsService.current.stop();
      }
    };
  }, []);

  // Update periodic refresh when interval changes
  useEffect(() => {
    setupPeriodicRefresh();
  }, [setupPeriodicRefresh]);

  // Filter module analytics if moduleId is specified
  const filteredModuleAnalytics = moduleId 
    ? state.moduleAnalytics.filter(analytics => analytics.moduleId === moduleId)
    : state.moduleAnalytics;

  const finalState: ModuleAnalyticsState = {
    ...state,
    moduleAnalytics: filteredModuleAnalytics
  };

  const actions: ModuleAnalyticsActions = {
    refreshData,
    refreshDashboard,
    refreshHealthStatus,
    getModuleAnalytics,
    resolveAlert,
    addAlertRule,
    removeAlertRule,
    exportAnalytics,
    enableRealTime,
    disableRealTime
  };

  return [finalState, actions];
}

/**
 * Hook for getting analytics for a specific module
 */
export function useModuleSpecificAnalytics(moduleId: string) {
  return useModuleAnalytics({ moduleId, refreshInterval: 15000 });
}

/**
 * Hook for dashboard-level analytics
 */
export function useDashboardAnalytics() {
  return useModuleAnalytics({ refreshInterval: 30000, enableRealTimeUpdates: true });
}

/**
 * Hook for health monitoring only
 */
export function useHealthMonitoring() {
  const [state, actions] = useModuleAnalytics({ refreshInterval: 60000 });
  
  return {
    healthStatus: state.healthStatus,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refreshHealthStatus: actions.refreshHealthStatus
  };
}

export default useModuleAnalytics;