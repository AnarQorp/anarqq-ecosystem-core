/**
 * QNET Service - Main Network Infrastructure Service
 * 
 * Provides comprehensive network infrastructure services including node management,
 * health monitoring, capability discovery, and intelligent request routing.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

import { NetworkTopology } from './NetworkTopology.js';
import { NodeManager } from './NodeManager.js';
import { HealthMonitor } from './HealthMonitor.js';
import { LoadBalancer } from './LoadBalancer.js';
import { getMetricsInstance, createMetricsInstance } from '../../observability/metrics.js';

export class QNetService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeId = options.nodeId || 'qnet-default-node';
    this.region = options.region || 'global';
    this.tier = options.tier || 'standard';
    this.mockMode = options.mockMode || false;
    
    this.startTime = Date.now();
    // Use separate metrics instance for each service to avoid shared state in tests
    this.metrics = this.mockMode ? createMetricsInstance() : getMetricsInstance();
    
    // Initialize components
    this.nodeManager = new NodeManager({ mockMode: this.mockMode });
    this.topology = new NetworkTopology({ mockMode: this.mockMode });
    this.healthMonitor = new HealthMonitor({ 
      nodeManager: this.nodeManager,
      mockMode: this.mockMode 
    });
    this.loadBalancer = new LoadBalancer({ 
      nodeManager: this.nodeManager,
      healthMonitor: this.healthMonitor,
      mockMode: this.mockMode 
    });
    
    this.setupEventHandlers();
    this.initialize();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log(`[QNET] Initializing service (Node: ${this.nodeId}, Region: ${this.region})`);
      
      // Initialize components
      await this.nodeManager.initialize();
      await this.topology.initialize();
      await this.healthMonitor.start();
      await this.loadBalancer.initialize();
      
      // Register this node if not in mock mode
      if (!this.mockMode) {
        await this.registerSelfNode();
      }
      
      this.emit('service_initialized', {
        nodeId: this.nodeId,
        region: this.region,
        tier: this.tier,
        timestamp: new Date().toISOString()
      });
      
      console.log('[QNET] Service initialized successfully');
    } catch (error) {
      console.error('[QNET] Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers between components
   */
  setupEventHandlers() {
    // Node events
    this.nodeManager.on('node_added', (node) => {
      this.topology.addNode(node);
      this.emit('node_joined', node);
      this.publishEvent('q.qnet.node.joined.v1', {
        nodeId: node.id,
        nodeName: node.name,
        region: node.region,
        type: node.type,
        tier: node.tier,
        capabilities: node.capabilities
      });
    });

    this.nodeManager.on('node_removed', (node) => {
      this.topology.removeNode(node.id);
      this.emit('node_left', node);
      this.publishEvent('q.qnet.node.left.v1', {
        nodeId: node.id,
        nodeName: node.name,
        region: node.region,
        reason: node.removalReason || 'unknown',
        graceful: node.gracefulShutdown || false
      });
    });

    this.nodeManager.on('node_updated', (node) => {
      this.topology.updateNode(node);
      this.emit('node_updated', node);
    });

    // Health monitoring events
    this.healthMonitor.on('node_health_changed', (nodeId, health) => {
      this.nodeManager.updateNodeHealth(nodeId, health);
      
      if (health.status === 'degraded' || health.status === 'inactive') {
        this.emit('node_alert', { nodeId, health });
        this.publishEvent('q.qnet.node.alert.v1', {
          nodeId,
          region: this.nodeManager.getNode(nodeId)?.region,
          alertType: health.alertType || 'health_degraded',
          severity: health.status === 'inactive' ? 'critical' : 'warning',
          message: `Node health changed to ${health.status}`,
          metrics: health.metrics
        });
      }
    });

    // Topology events
    this.topology.on('topology_changed', (change) => {
      this.emit('topology_changed', change);
      this.publishEvent('q.qnet.topology.changed.v1', {
        changeType: change.type,
        affectedRegions: change.affectedRegions,
        affectedNodes: change.affectedNodes,
        nodeCount: this.nodeManager.getNodeCount(),
        summary: change.summary
      });
    });

    // Metrics events
    this.metrics.on('slo_violation', (violation) => {
      this.emit('slo_violation', violation);
      this.publishEvent('q.qnet.node.alert.v1', {
        nodeId: this.nodeId,
        region: this.region,
        alertType: 'slo_violation',
        severity: 'critical',
        message: `SLO violation: ${violation.metric}`,
        metrics: {
          metric: violation.metric,
          threshold: violation.threshold,
          current: violation.current
        }
      });
    });
  }

  /**
   * Register this node in the network
   */
  async registerSelfNode() {
    const selfNode = {
      id: this.nodeId,
      name: `QNET Node ${this.nodeId}`,
      endpoint: `http://localhost:${process.env.QNET_PORT || 3014}`,
      region: this.region,
      type: 'primary',
      tier: this.tier,
      status: 'active',
      capabilities: ['routing', 'monitoring', 'load_balancing'],
      metrics: {
        latency: 0,
        uptime: 1.0,
        requestCount: 0,
        errorCount: 0,
        reputation: 1.0
      },
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.nodeManager.addNode(selfNode);
  }

  /**
   * Ping network nodes
   */
  async pingNodes(options = {}) {
    const { nodeId, timeout = 5000, count = 1 } = options;
    
    try {
      let targetNodes;
      if (nodeId) {
        const node = this.nodeManager.getNode(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        targetNodes = [node];
      } else {
        targetNodes = this.nodeManager.getActiveNodes();
      }

      const results = [];
      let totalLatency = 0;
      let successfulPings = 0;

      for (const node of targetNodes) {
        for (let i = 0; i < count; i++) {
          const startTime = Date.now();
          
          try {
            // Simulate ping - in production would make actual network request
            const latency = await this.performPing(node, timeout);
            const endTime = Date.now();
            
            results.push({
              nodeId: node.id,
              latency,
              success: true,
              timestamp: new Date().toISOString(),
              sequence: i + 1
            });
            
            totalLatency += latency;
            successfulPings++;
            
            this.metrics.recordNodePing(node.id, latency, true);
          } catch (error) {
            results.push({
              nodeId: node.id,
              latency: 0,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
              sequence: i + 1
            });
            
            this.metrics.recordNodePing(node.id, 0, false);
          }
        }
      }

      const summary = {
        totalNodes: targetNodes.length,
        successfulPings,
        averageLatency: successfulPings > 0 ? totalLatency / successfulPings : 0,
        minLatency: Math.min(...results.filter(r => r.success).map(r => r.latency)),
        maxLatency: Math.max(...results.filter(r => r.success).map(r => r.latency)),
        packetLoss: 1 - (successfulPings / (targetNodes.length * count))
      };

      return { results, summary };
    } catch (error) {
      console.error('[QNET] Ping operation failed:', error);
      throw error;
    }
  }

  /**
   * Perform actual ping to a node
   */
  async performPing(node, timeout) {
    if (this.mockMode) {
      // Mock ping with random latency
      const latency = Math.random() * 200 + 10; // 10-210ms
      await new Promise(resolve => setTimeout(resolve, latency));
      return Math.round(latency);
    }

    // In production, would make actual HTTP request to node's health endpoint
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${node.endpoint}/health`, {
        method: 'GET',
        timeout,
        headers: {
          'User-Agent': `QNET-Ping/${this.nodeId}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Ping failed: ${error.message}`);
    }
  }

  /**
   * Get network capabilities
   */
  async getCapabilities(options = {}) {
    const { nodeId, service } = options;
    
    try {
      let nodes;
      if (nodeId) {
        const node = this.nodeManager.getNode(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        nodes = [node];
      } else {
        nodes = this.nodeManager.getAllNodes();
      }

      // Aggregate capabilities across nodes
      const services = new Set();
      const protocols = new Set(['https', 'http']);
      const regions = new Set();
      const nodeCapabilities = {};

      for (const node of nodes) {
        // Add node capabilities
        node.capabilities.forEach(cap => services.add(cap));
        regions.add(node.region);
        nodeCapabilities[node.id] = node.capabilities;
      }

      // Filter by service if specified
      let filteredServices = Array.from(services);
      if (service) {
        filteredServices = filteredServices.filter(s => 
          s.toLowerCase().includes(service.toLowerCase())
        );
      }

      const capabilities = {
        services: filteredServices,
        protocols: Array.from(protocols),
        regions: Array.from(regions),
        features: {
          loadBalancing: true,
          healthMonitoring: true,
          autoScaling: false,
          encryption: true,
          caching: true,
          analytics: true
        },
        nodeCapabilities,
        limits: {
          maxConnections: 1000,
          maxBandwidth: '10Gbps',
          maxRequestSize: 10485760, // 10MB
          rateLimit: {
            requests: 1000,
            window: 3600
          }
        }
      };

      return capabilities;
    } catch (error) {
      console.error('[QNET] Get capabilities failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive network status
   */
  async getNetworkStatus(options = {}) {
    const { includeMetrics = false, includeTopology = false, region } = options;
    
    try {
      let nodes = this.nodeManager.getAllNodes();
      
      // Filter by region if specified
      if (region) {
        nodes = nodes.filter(node => node.region === region);
      }

      const nodesByStatus = {
        active: nodes.filter(n => n.status === 'active').length,
        degraded: nodes.filter(n => n.status === 'degraded').length,
        inactive: nodes.filter(n => n.status === 'inactive').length
      };

      const totalNodes = nodes.length;
      const activeNodes = nodesByStatus.active;

      // Calculate network-wide metrics
      const activeNodeMetrics = nodes
        .filter(n => n.status === 'active')
        .map(n => n.metrics);

      const averageLatency = activeNodeMetrics.length > 0
        ? activeNodeMetrics.reduce((sum, m) => sum + m.latency, 0) / activeNodeMetrics.length
        : 0;

      const averageUptime = activeNodeMetrics.length > 0
        ? activeNodeMetrics.reduce((sum, m) => sum + m.uptime, 0) / activeNodeMetrics.length
        : 0;

      // Group by region
      const regionStats = {};
      for (const node of nodes) {
        if (!regionStats[node.region]) {
          regionStats[node.region] = {
            nodes: 0,
            status: 'healthy',
            latency: 0
          };
        }
        regionStats[node.region].nodes++;
        regionStats[node.region].latency += node.metrics.latency;
      }

      // Calculate average latency per region
      for (const [region, stats] of Object.entries(regionStats)) {
        stats.latency = stats.latency / stats.nodes;
        
        // Determine region status
        const regionNodes = nodes.filter(n => n.region === region);
        const healthyNodes = regionNodes.filter(n => n.status === 'active').length;
        const healthRatio = healthyNodes / regionNodes.length;
        
        if (healthRatio >= 0.8) stats.status = 'healthy';
        else if (healthRatio >= 0.5) stats.status = 'degraded';
        else stats.status = 'unhealthy';
      }

      // Service availability
      const serviceStats = {};
      const allServices = ['routing', 'gateway', 'storage', 'compute', 'monitoring'];
      
      for (const service of allServices) {
        const serviceNodes = nodes.filter(n => 
          n.capabilities.includes(service) && n.status === 'active'
        );
        
        serviceStats[service] = {
          available: serviceNodes.length > 0,
          nodes: serviceNodes.length,
          latency: serviceNodes.length > 0
            ? serviceNodes.reduce((sum, n) => sum + n.metrics.latency, 0) / serviceNodes.length
            : 0
        };
      }

      const status = {
        network: {
          totalNodes,
          activeNodes,
          degradedNodes: nodesByStatus.degraded,
          inactiveNodes: nodesByStatus.inactive,
          averageLatency: Math.round(averageLatency),
          averageUptime: Math.round(averageUptime * 100) / 100
        },
        regions: regionStats,
        services: serviceStats
      };

      // Include detailed metrics if requested
      if (includeMetrics) {
        status.metrics = this.metrics.getAllMetrics();
      }

      // Include topology if requested
      if (includeTopology) {
        status.topology = await this.topology.getTopology();
      }

      return status;
    } catch (error) {
      console.error('[QNET] Get network status failed:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealth() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const nodeCount = this.nodeManager.getNodeCount();
    const activeNodes = this.nodeManager.getActiveNodes().length;
    
    const health = {
      status: activeNodes > 0 ? 'healthy' : 'degraded',
      service: 'qnet',
      version: '1.0.0',
      uptime: Math.round(uptime),
      nodeId: this.nodeId,
      region: this.region,
      dependencies: {
        nodeManager: this.nodeManager.isHealthy() ? 'up' : 'down',
        topology: this.topology.isHealthy() ? 'up' : 'down',
        healthMonitor: this.healthMonitor.isHealthy() ? 'up' : 'down',
        loadBalancer: this.loadBalancer.isHealthy() ? 'up' : 'down'
      },
      network: {
        totalNodes: nodeCount,
        activeNodes,
        healthRatio: nodeCount > 0 ? activeNodes / nodeCount : 0
      }
    };

    return health;
  }

  /**
   * Publish event to event bus
   */
  async publishEvent(eventType, payload) {
    const event = {
      eventType,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...payload
    };

    if (this.mockMode) {
      console.log(`[QNET Event] ${eventType}:`, event);
    } else {
      // In production, would publish to actual event bus
      this.emit('event_published', event);
    }
  }

  /**
   * Stop the service
   */
  async stop() {
    console.log('[QNET] Stopping service...');
    
    try {
      await this.healthMonitor.stop();
      await this.loadBalancer.stop();
      await this.topology.stop();
      await this.nodeManager.stop();
      
      // Stop metrics collection
      if (this.metrics && typeof this.metrics.stop === 'function') {
        this.metrics.stop();
      }
      
      // Remove all listeners to prevent memory leaks
      this.removeAllListeners();
      
      this.emit('service_stopped', {
        nodeId: this.nodeId,
        timestamp: new Date().toISOString()
      });
      
      console.log('[QNET] Service stopped successfully');
    } catch (error) {
      console.error('[QNET] Error stopping service:', error);
      throw error;
    }
  }
}

export default QNetService;