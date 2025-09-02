/**
 * Health Service - Service health monitoring and dependency checking
 */

export class HealthService {
  constructor(options = {}) {
    this.services = options.services || {};
    this.dependencies = options.dependencies || [];
    this.healthChecks = new Map();
    this.lastHealthCheck = null;
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    
    this.startHealthChecking();
  }

  /**
   * Get overall health status
   */
  async getHealth() {
    try {
      const timestamp = new Date().toISOString();
      const serviceHealth = await this.checkServices();
      const dependencyHealth = await this.checkDependencies();

      // Determine overall status
      let overallStatus = 'healthy';
      
      const hasUnhealthyServices = Object.values(serviceHealth).some(
        service => service.status === 'unhealthy'
      );
      
      const hasUnhealthyDependencies = Object.values(dependencyHealth).some(
        dep => dep.status === 'down'
      );

      if (hasUnhealthyServices || hasUnhealthyDependencies) {
        overallStatus = 'unhealthy';
      } else if (Object.values(dependencyHealth).some(dep => dep.status === 'degraded')) {
        overallStatus = 'degraded';
      }

      const health = {
        status: overallStatus,
        timestamp,
        version: '1.0.0',
        services: serviceHealth,
        dependencies: dependencyHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      };

      this.lastHealthCheck = health;
      return health;
    } catch (error) {
      console.error('[HealthService] Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check if service is ready to accept requests
   */
  async isReady() {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if service is alive (basic liveness check)
   */
  isAlive() {
    return true; // If we can execute this, we're alive
  }

  /**
   * Check internal services health
   */
  async checkServices() {
    const serviceHealth = {};

    for (const [name, service] of Object.entries(this.services)) {
      try {
        if (service && typeof service.healthCheck === 'function') {
          const health = await service.healthCheck();
          serviceHealth[name] = {
            status: health.status || 'healthy',
            ...health
          };
        } else {
          serviceHealth[name] = {
            status: 'healthy',
            message: 'Service available'
          };
        }
      } catch (error) {
        serviceHealth[name] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    }

    return serviceHealth;
  }

  /**
   * Check external dependencies health
   */
  async checkDependencies() {
    const dependencyHealth = {};

    for (const dependency of this.dependencies) {
      try {
        const startTime = Date.now();
        const health = await this.checkDependency(dependency);
        const latency = Date.now() - startTime;

        dependencyHealth[dependency.name] = {
          status: health.status,
          latency,
          lastCheck: new Date().toISOString(),
          url: dependency.url,
          ...health
        };
      } catch (error) {
        dependencyHealth[dependency.name] = {
          status: 'down',
          error: error.message,
          lastCheck: new Date().toISOString(),
          url: dependency.url
        };
      }
    }

    return dependencyHealth;
  }

  /**
   * Check individual dependency
   */
  async checkDependency(dependency) {
    try {
      // In standalone mode, skip external dependency checks
      if (process.env.QWALLET_MODE === 'standalone') {
        return {
          status: 'up',
          message: 'Standalone mode - dependency mocked'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${dependency.url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Qwallet-HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status === 'healthy' ? 'up' : 'degraded',
          message: data.message || 'Dependency healthy',
          version: data.version
        };
      } else {
        return {
          status: 'degraded',
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          status: 'down',
          message: 'Health check timeout'
        };
      }
      
      return {
        status: 'down',
        message: error.message
      };
    }
  }

  /**
   * Register custom health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Unregister health check
   */
  unregisterHealthCheck(name) {
    this.healthChecks.delete(name);
  }

  /**
   * Start periodic health checking
   */
  startHealthChecking() {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.getHealth();
      } catch (error) {
        console.error('[HealthService] Periodic health check failed:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop periodic health checking
   */
  stopHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get health metrics
   */
  getMetrics() {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };

    if (this.lastHealthCheck) {
      metrics.lastHealthCheck = this.lastHealthCheck.timestamp;
      metrics.overallStatus = this.lastHealthCheck.status;
    }

    return metrics;
  }

  /**
   * Shutdown health service
   */
  async shutdown() {
    console.log('[HealthService] Shutting down...');
    
    this.stopHealthChecking();
    this.healthChecks.clear();
    this.lastHealthCheck = null;
    
    console.log('[HealthService] Shutdown complete');
  }
}

export default HealthService;