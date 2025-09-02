/**
 * Health Monitor - Monitors network node health and performance
 * 
 * Provides real-time health monitoring, SLO tracking, and alerting
 * for network nodes and overall network health.
 */

import { EventEmitter } from 'events';

export class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeManager = options.nodeManager;
    this.mockMode = options.mockMode || false;
    
    this.monitoringInterval = null;
    this.healthHistory = new Map();
    this.alertThresholds = {
      latency: 200,      // ms
      uptime: 0.99,      // 99%
      errorRate: 0.05,   // 5%
      reputation: 0.7    // 70%
    };
    
    this.running = false;
  }

  /**
   * Start health monitoring
   */
  async start() {
    if (this.running) {
      console.warn('[HealthMonitor] Already running');
      return;
    }

    console.log('[HealthMonitor] Starting health monitoring...');
    
    this.running = true;
    this.startMonitoring();
    
    console.log('[HealthMonitor] Health monitoring started');
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    // Initial check
    setTimeout(() => this.performHealthChecks(), 1000);
  }

  /**
   * Perform health checks on all nodes
   */
  async performHealthChecks() {
    if (!this.nodeManager) {
      console.warn('[HealthMonitor] No node manager available');
      return;
    }

    const nodes = this.nodeManager.getAllNodes();
    
    for (const node of nodes) {
      try {
        const health = await this.checkNodeHealth(node);
        this.updateHealthHistory(node.id, health);
        
        // Check for alerts
        const alerts = this.checkAlerts(node, health);
        if (alerts.length > 0) {
          for (const alert of alerts) {
            this.emit('health_alert', {
              nodeId: node.id,
              alert,
              health,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Emit health change if status changed
        if (health.status !== node.status) {
          this.emit('node_health_changed', node.id, health);
        }
        
      } catch (error) {
        console.error(`[HealthMonitor] Health check failed for ${node.id}:`, error);
        
        // Emit failure event
        this.emit('node_health_changed', node.id, {
          status: 'inactive',
          metrics: node.metrics,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Check health of individual node
   */
  async checkNodeHealth(node) {
    const startTime = Date.now();
    
    try {
      let latency, uptime, errorRate;
      
      if (this.mockMode) {
        // Mock health metrics
        latency = this.simulateLatency(node);
        uptime = this.simulateUptime(node);
        errorRate = this.simulateErrorRate(node);
      } else {
        // Real health check
        const healthData = await this.performRealHealthCheck(node);
        latency = healthData.latency;
        uptime = healthData.uptime;
        errorRate = healthData.errorRate;
      }

      const endTime = Date.now();
      const checkDuration = endTime - startTime;

      // Calculate reputation based on metrics
      const reputation = this.calculateReputation(latency, uptime, errorRate);
      
      // Determine status
      const status = this.determineNodeStatus(latency, uptime, errorRate, reputation);

      const health = {
        status,
        metrics: {
          latency: Math.round(latency),
          uptime: Math.round(uptime * 1000) / 1000,
          errorRate: Math.round(errorRate * 1000) / 1000,
          reputation: Math.round(reputation * 1000) / 1000,
          checkDuration
        },
        timestamp: new Date().toISOString(),
        checkSuccess: true
      };

      return health;
      
    } catch (error) {
      return {
        status: 'inactive',
        metrics: node.metrics,
        error: error.message,
        timestamp: new Date().toISOString(),
        checkSuccess: false
      };
    }
  }

  /**
   * Perform real health check (production)
   */
  async performRealHealthCheck(node) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${node.endpoint}/health`, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'QNET-HealthMonitor/1.0'
        }
      });

      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const healthData = await response.json();
      
      return {
        latency,
        uptime: healthData.uptime || 0.99,
        errorRate: healthData.errorRate || 0.01
      };
      
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Simulate latency for mock mode
   */
  simulateLatency(node) {
    const baseLatency = node.metrics.latency || 50;
    const variation = (Math.random() - 0.5) * 20; // ±10ms variation
    return Math.max(1, baseLatency + variation);
  }

  /**
   * Simulate uptime for mock mode
   */
  simulateUptime(node) {
    const baseUptime = node.metrics.uptime || 0.99;
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    return Math.max(0.8, Math.min(1.0, baseUptime + variation));
  }

  /**
   * Simulate error rate for mock mode
   */
  simulateErrorRate(node) {
    const baseErrorRate = (1 - (node.metrics.uptime || 0.99)) * 0.1;
    const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
    return Math.max(0, Math.min(0.2, baseErrorRate + variation));
  }

  /**
   * Calculate node reputation based on metrics
   */
  calculateReputation(latency, uptime, errorRate) {
    // Weighted reputation calculation
    const latencyScore = Math.max(0, 1 - (latency / 500)); // 0-1 based on latency
    const uptimeScore = uptime; // Already 0-1
    const errorScore = Math.max(0, 1 - (errorRate * 10)); // 0-1 based on error rate
    
    // Weighted average: uptime 50%, latency 30%, errors 20%
    const reputation = (uptimeScore * 0.5) + (latencyScore * 0.3) + (errorScore * 0.2);
    
    return Math.max(0, Math.min(1, reputation));
  }

  /**
   * Determine node status based on metrics
   */
  determineNodeStatus(latency, uptime, errorRate, reputation) {
    // Critical thresholds
    if (uptime < 0.9 || errorRate > 0.1 || reputation < 0.5) {
      return 'inactive';
    }
    
    // Warning thresholds
    if (latency > this.alertThresholds.latency || 
        uptime < this.alertThresholds.uptime || 
        errorRate > this.alertThresholds.errorRate ||
        reputation < this.alertThresholds.reputation) {
      return 'degraded';
    }
    
    return 'active';
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(node, health) {
    const alerts = [];
    const { latency, uptime, errorRate, reputation } = health.metrics;

    // Latency alerts
    if (latency > this.alertThresholds.latency) {
      alerts.push({
        type: 'high_latency',
        severity: latency > this.alertThresholds.latency * 2 ? 'critical' : 'warning',
        message: `High latency detected: ${latency}ms (threshold: ${this.alertThresholds.latency}ms)`,
        metric: 'latency',
        value: latency,
        threshold: this.alertThresholds.latency
      });
    }

    // Uptime alerts
    if (uptime < this.alertThresholds.uptime) {
      alerts.push({
        type: 'low_uptime',
        severity: uptime < 0.95 ? 'critical' : 'warning',
        message: `Low uptime detected: ${(uptime * 100).toFixed(1)}% (threshold: ${(this.alertThresholds.uptime * 100).toFixed(1)}%)`,
        metric: 'uptime',
        value: uptime,
        threshold: this.alertThresholds.uptime
      });
    }

    // Error rate alerts
    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: errorRate > 0.1 ? 'critical' : 'warning',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}% (threshold: ${(this.alertThresholds.errorRate * 100).toFixed(1)}%)`,
        metric: 'errorRate',
        value: errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }

    // Reputation alerts
    if (reputation < this.alertThresholds.reputation) {
      alerts.push({
        type: 'low_reputation',
        severity: reputation < 0.5 ? 'critical' : 'warning',
        message: `Low reputation detected: ${(reputation * 100).toFixed(1)}% (threshold: ${(this.alertThresholds.reputation * 100).toFixed(1)}%)`,
        metric: 'reputation',
        value: reputation,
        threshold: this.alertThresholds.reputation
      });
    }

    return alerts;
  }

  /**
   * Update health history for a node
   */
  updateHealthHistory(nodeId, health) {
    if (!this.healthHistory.has(nodeId)) {
      this.healthHistory.set(nodeId, []);
    }

    const history = this.healthHistory.get(nodeId);
    history.push({
      ...health,
      timestamp: Date.now()
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get health history for a node
   */
  getHealthHistory(nodeId, limit = 50) {
    const history = this.healthHistory.get(nodeId) || [];
    return history.slice(-limit);
  }

  /**
   * Get network-wide health summary
   */
  getNetworkHealthSummary() {
    if (!this.nodeManager) {
      return { status: 'unknown', nodes: 0 };
    }

    const nodes = this.nodeManager.getAllNodes();
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const degradedNodes = nodes.filter(n => n.status === 'degraded').length;
    const inactiveNodes = nodes.filter(n => n.status === 'inactive').length;

    const totalNodes = nodes.length;
    const healthyRatio = totalNodes > 0 ? activeNodes / totalNodes : 0;

    let networkStatus = 'healthy';
    if (healthyRatio < 0.5) {
      networkStatus = 'critical';
    } else if (healthyRatio < 0.8) {
      networkStatus = 'degraded';
    }

    // Calculate average metrics
    const activeNodeMetrics = nodes
      .filter(n => n.status === 'active')
      .map(n => n.metrics);

    const avgLatency = activeNodeMetrics.length > 0
      ? activeNodeMetrics.reduce((sum, m) => sum + m.latency, 0) / activeNodeMetrics.length
      : 0;

    const avgUptime = activeNodeMetrics.length > 0
      ? activeNodeMetrics.reduce((sum, m) => sum + m.uptime, 0) / activeNodeMetrics.length
      : 0;

    const avgReputation = activeNodeMetrics.length > 0
      ? activeNodeMetrics.reduce((sum, m) => sum + m.reputation, 0) / activeNodeMetrics.length
      : 0;

    return {
      status: networkStatus,
      nodes: {
        total: totalNodes,
        active: activeNodes,
        degraded: degradedNodes,
        inactive: inactiveNodes,
        healthyRatio: Math.round(healthyRatio * 1000) / 1000
      },
      metrics: {
        averageLatency: Math.round(avgLatency),
        averageUptime: Math.round(avgUptime * 1000) / 1000,
        averageReputation: Math.round(avgReputation * 1000) / 1000
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('[HealthMonitor] Updated alert thresholds:', this.alertThresholds);
  }

  /**
   * Check if health monitor is healthy
   */
  isHealthy() {
    return this.running && this.monitoringInterval !== null;
  }

  /**
   * Stop health monitoring
   */
  async stop() {
    console.log('[HealthMonitor] Stopping health monitoring...');
    
    this.running = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('[HealthMonitor] Health monitoring stopped');
  }
}

export default HealthMonitor;