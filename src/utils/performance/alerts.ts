/**
 * Performance Alert System
 * 
 * Provides automated performance monitoring with configurable thresholds
 * and alert notifications for performance degradation detection.
 */

import { performanceStore } from './monitoring';

// Alert configuration interface
export interface AlertConfig {
  apiSlowThreshold: number; // milliseconds
  renderSlowThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage (0-1)
  memoryHighThreshold: number; // bytes
  consecutiveFailuresThreshold: number;
  alertCooldown: number; // milliseconds
}

// Default alert configuration
const DEFAULT_CONFIG: AlertConfig = {
  apiSlowThreshold: 2000, // 2 seconds
  renderSlowThreshold: 100, // 100ms
  errorRateThreshold: 0.1, // 10%
  memoryHighThreshold: 100 * 1024 * 1024, // 100MB
  consecutiveFailuresThreshold: 3,
  alertCooldown: 60000, // 1 minute
};

// Alert handler interface
export interface AlertHandler {
  onApiSlow: (endpoint: string, duration: number) => void;
  onRenderSlow: (componentName: string, renderTime: number) => void;
  onHighErrorRate: (endpoint: string, errorRate: number) => void;
  onMemoryHigh: (usage: number) => void;
  onConsecutiveFailures: (endpoint: string, count: number) => void;
}

// Performance alert manager
class PerformanceAlertManager {
  private config: AlertConfig = DEFAULT_CONFIG;
  private handlers: AlertHandler[] = [];
  private lastAlerts: Map<string, number> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();

  /**
   * Update alert configuration
   */
  updateConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add alert handler
   */
  addHandler(handler: AlertHandler) {
    this.handlers.push(handler);
  }

  /**
   * Remove alert handler
   */
  removeHandler(handler: AlertHandler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Check if alert should be sent (respects cooldown)
   */
  private shouldAlert(key: string): boolean {
    const lastAlert = this.lastAlerts.get(key);
    const now = Date.now();
    
    if (!lastAlert || now - lastAlert > this.config.alertCooldown) {
      this.lastAlerts.set(key, now);
      return true;
    }
    
    return false;
  }

  /**
   * Handle API performance check
   */
  checkApiPerformance(endpoint: string, duration: number, success: boolean) {
    // Check for slow API calls
    if (duration > this.config.apiSlowThreshold) {
      const alertKey = `api-slow-${endpoint}`;
      if (this.shouldAlert(alertKey)) {
        this.handlers.forEach(handler => handler.onApiSlow(endpoint, duration));
      }
    }

    // Track consecutive failures
    if (!success) {
      const currentCount = this.consecutiveFailures.get(endpoint) || 0;
      const newCount = currentCount + 1;
      this.consecutiveFailures.set(endpoint, newCount);

      if (newCount >= this.config.consecutiveFailuresThreshold) {
        const alertKey = `consecutive-failures-${endpoint}`;
        if (this.shouldAlert(alertKey)) {
          this.handlers.forEach(handler => handler.onConsecutiveFailures(endpoint, newCount));
        }
      }
    } else {
      // Reset consecutive failures on success
      this.consecutiveFailures.delete(endpoint);
    }

    // Check error rate
    this.checkErrorRate(endpoint);
  }

  /**
   * Check error rate for endpoint
   */
  private checkErrorRate(endpoint: string) {
    const recentMetrics = performanceStore.getApiMetrics(endpoint)
      .filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes
      .slice(-20); // Last 20 calls

    if (recentMetrics.length >= 10) {
      const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
      
      if (errorRate > this.config.errorRateThreshold) {
        const alertKey = `error-rate-${endpoint}`;
        if (this.shouldAlert(alertKey)) {
          this.handlers.forEach(handler => handler.onHighErrorRate(endpoint, errorRate));
        }
      }
    }
  }

  /**
   * Handle render performance check
   */
  checkRenderPerformance(componentName: string, renderTime: number) {
    if (renderTime > this.config.renderSlowThreshold) {
      const alertKey = `render-slow-${componentName}`;
      if (this.shouldAlert(alertKey)) {
        this.handlers.forEach(handler => handler.onRenderSlow(componentName, renderTime));
      }
    }
  }

  /**
   * Handle memory usage check
   */
  checkMemoryUsage(usage: number) {
    if (usage > this.config.memoryHighThreshold) {
      const alertKey = 'memory-high';
      if (this.shouldAlert(alertKey)) {
        this.handlers.forEach(handler => handler.onMemoryHigh(usage));
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Clear all alert history
   */
  clearHistory() {
    this.lastAlerts.clear();
    this.consecutiveFailures.clear();
  }

  /**
   * Get alert statistics
   */
  getStats() {
    return {
      totalAlertTypes: this.lastAlerts.size,
      consecutiveFailures: Object.fromEntries(this.consecutiveFailures),
      lastAlerts: Object.fromEntries(this.lastAlerts),
      handlers: this.handlers.length
    };
  }
}

// Global alert manager instance
export const alertManager = new PerformanceAlertManager();

/**
 * Default console alert handler
 */
export const consoleAlertHandler: AlertHandler = {
  onApiSlow: (endpoint, duration) => {
    console.warn(`🐌 Slow API call: ${endpoint} took ${duration}ms`);
  },
  
  onRenderSlow: (componentName, renderTime) => {
    console.warn(`🐌 Slow render: ${componentName} took ${renderTime}ms`);
  },
  
  onHighErrorRate: (endpoint, errorRate) => {
    console.error(`❌ High error rate: ${endpoint} has ${(errorRate * 100).toFixed(1)}% error rate`);
  },
  
  onMemoryHigh: (usage) => {
    console.warn(`🧠 High memory usage: ${(usage / 1024 / 1024).toFixed(2)}MB`);
  },
  
  onConsecutiveFailures: (endpoint, count) => {
    console.error(`💥 Consecutive failures: ${endpoint} failed ${count} times in a row`);
  }
};

/**
 * Toast notification alert handler (requires toast system)
 */
export const createToastAlertHandler = (showToast: (message: string, type: 'error' | 'warning') => void): AlertHandler => ({
  onApiSlow: (endpoint, duration) => {
    showToast(`Slow API call: ${endpoint} (${duration}ms)`, 'warning');
  },
  
  onRenderSlow: (componentName, renderTime) => {
    showToast(`Slow render: ${componentName} (${renderTime}ms)`, 'warning');
  },
  
  onHighErrorRate: (endpoint, errorRate) => {
    showToast(`High error rate: ${endpoint} (${(errorRate * 100).toFixed(1)}%)`, 'error');
  },
  
  onMemoryHigh: (usage) => {
    showToast(`High memory usage: ${(usage / 1024 / 1024).toFixed(2)}MB`, 'warning');
  },
  
  onConsecutiveFailures: (endpoint, count) => {
    showToast(`Consecutive failures: ${endpoint} (${count} times)`, 'error');
  }
});

/**
 * React hook for performance alerts
 */
export const usePerformanceAlerts = (config?: Partial<AlertConfig>) => {
  React.useEffect(() => {
    if (config) {
      alertManager.updateConfig(config);
    }

    // Add default console handler if no handlers exist
    if (alertManager.getStats().handlers === 0) {
      alertManager.addHandler(consoleAlertHandler);
    }

    return () => {
      // Cleanup is handled by the alert manager
    };
  }, [config]);

  const addHandler = React.useCallback((handler: AlertHandler) => {
    alertManager.addHandler(handler);
    return () => alertManager.removeHandler(handler);
  }, []);

  const updateConfig = React.useCallback((newConfig: Partial<AlertConfig>) => {
    alertManager.updateConfig(newConfig);
  }, []);

  const clearHistory = React.useCallback(() => {
    alertManager.clearHistory();
  }, []);

  const getStats = React.useCallback(() => {
    return alertManager.getStats();
  }, []);

  return {
    addHandler,
    updateConfig,
    clearHistory,
    getStats,
    config: alertManager.getConfig()
  };
};

// Initialize default alert handler
alertManager.addHandler(consoleAlertHandler);