/**
 * Node Manager - Manages network nodes and their lifecycle
 * 
 * Handles node registration, deregistration, status updates, and provides
 * node discovery and filtering capabilities.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class NodeManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.mockMode = options.mockMode || false;
    this.nodes = new Map();
    this.nodesByRegion = new Map();
    this.nodesByType = new Map();
    this.nodesByStatus = new Map();
    
    this.healthCheckInterval = null;
    this.initialized = false;
  }

  /**
   * Initialize the node manager
   */
  async initialize() {
    if (this.initialized) {
      console.log('[NodeManager] Already initialized, skipping...');
      return;
    }
    
    try {
      console.log('[NodeManager] Initializing...');
      
      // Clear existing nodes
      this.nodes.clear();
      this.nodesByRegion.clear();
      this.nodesByType.clear();
      this.nodesByStatus.clear();
      
      if (this.mockMode) {
        await this.initializeMockNodes();
      } else {
        await this.loadExistingNodes();
      }
      
      this.startHealthChecks();
      this.initialized = true;
      
      console.log(`[NodeManager] Initialized with ${this.nodes.size} nodes`);
    } catch (error) {
      console.error('[NodeManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize mock nodes for standalone mode
   */
  async initializeMockNodes() {
    const timestamp = Date.now();
    const mockNodes = [
      {
        id: 'qnet-us-east-primary',
        name: 'US East Primary Node',
        endpoint: 'https://us-east.qnet.anarq.io',
        region: 'us-east-1',
        type: 'primary',
        tier: 'premium',
        status: 'active',
        capabilities: ['routing', 'gateway', 'storage', 'compute'],
        metrics: {
          latency: 45,
          uptime: 0.999,
          requestCount: 150000,
          errorCount: 150,
          reputation: 0.95,
          bandwidth: '10Gbps'
        }
      },
      {
        id: 'qnet-us-west-primary',
        name: 'US West Primary Node',
        endpoint: 'https://us-west.qnet.anarq.io',
        region: 'us-west-1',
        type: 'primary',
        tier: 'premium',
        status: 'active',
        capabilities: ['routing', 'gateway', 'storage'],
        metrics: {
          latency: 52,
          uptime: 0.998,
          requestCount: 120000,
          errorCount: 240,
          reputation: 0.92,
          bandwidth: '10Gbps'
        }
      },
      {
        id: 'qnet-eu-west-primary',
        name: 'EU West Primary Node',
        endpoint: 'https://eu-west.qnet.anarq.io',
        region: 'eu-west-1',
        type: 'primary',
        tier: 'standard',
        status: 'active',
        capabilities: ['routing', 'gateway', 'compute'],
        metrics: {
          latency: 38,
          uptime: 0.997,
          requestCount: 95000,
          errorCount: 285,
          reputation: 0.89,
          bandwidth: '5Gbps'
        }
      },
      {
        id: 'qnet-asia-primary',
        name: 'Asia Pacific Primary Node',
        endpoint: 'https://asia.qnet.anarq.io',
        region: 'ap-southeast-1',
        type: 'secondary',
        tier: 'standard',
        status: 'degraded',
        capabilities: ['routing', 'gateway'],
        metrics: {
          latency: 125,
          uptime: 0.985,
          requestCount: 75000,
          errorCount: 1125,
          reputation: 0.78,
          bandwidth: '2Gbps'
        }
      },
      {
        id: 'qnet-eu-central-secondary',
        name: 'EU Central Secondary Node',
        endpoint: 'https://eu-central.qnet.anarq.io',
        region: 'eu-central-1',
        type: 'secondary',
        tier: 'standard',
        status: 'active',
        capabilities: ['routing', 'storage'],
        metrics: {
          latency: 42,
          uptime: 0.996,
          requestCount: 65000,
          errorCount: 260,
          reputation: 0.91,
          bandwidth: '5Gbps'
        }
      },
      {
        id: 'qnet-dev-edge',
        name: 'Development Edge Node',
        endpoint: 'https://dev-edge.qnet.anarq.io',
        region: 'dev',
        type: 'edge',
        tier: 'standard',
        status: 'inactive',
        capabilities: ['routing'],
        metrics: {
          latency: 15,
          uptime: 0.950,
          requestCount: 5000,
          errorCount: 250,
          reputation: 0.65,
          bandwidth: '1Gbps'
        }
      }
    ];

    for (const nodeData of mockNodes) {
      const node = this.createNode(nodeData);
      await this.addNode(node);
    }
  }

  /**
   * Load existing nodes from storage
   */
  async loadExistingNodes() {
    // In production, would load from IPFS or database
    console.log('[NodeManager] Loading existing nodes from storage...');
    // Implementation would go here
  }

  /**
   * Create a node object with timestamps
   */
  createNode(nodeData) {
    const now = new Date().toISOString();
    return {
      ...nodeData,
      lastSeen: now,
      createdAt: nodeData.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Add a node to the network
   */
  async addNode(node) {
    try {
      // Validate node data
      this.validateNode(node);
      
      // Check if node already exists
      if (this.nodes.has(node.id)) {
        throw new Error(`Node already exists: ${node.id}`);
      }

      // Add to main collection
      this.nodes.set(node.id, node);
      
      // Add to indexes
      this.addToIndex('region', node.region, node.id);
      this.addToIndex('type', node.type, node.id);
      this.addToIndex('status', node.status, node.id);
      
      console.log(`[NodeManager] Added node: ${node.id} (${node.region})`);
      
      this.emit('node_added', node);
      
      return node;
    } catch (error) {
      console.error(`[NodeManager] Failed to add node ${node.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a node from the network
   */
  async removeNode(nodeId, reason = 'manual', graceful = true) {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      // Remove from main collection
      this.nodes.delete(nodeId);
      
      // Remove from indexes
      this.removeFromIndex('region', node.region, nodeId);
      this.removeFromIndex('type', node.type, nodeId);
      this.removeFromIndex('status', node.status, nodeId);
      
      // Add removal metadata
      node.removalReason = reason;
      node.gracefulShutdown = graceful;
      node.removedAt = new Date().toISOString();
      
      console.log(`[NodeManager] Removed node: ${nodeId} (reason: ${reason})`);
      
      this.emit('node_removed', node);
      
      return node;
    } catch (error) {
      console.error(`[NodeManager] Failed to remove node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Update node information
   */
  async updateNode(nodeId, updates) {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      // Store old values for index updates
      const oldRegion = node.region;
      const oldType = node.type;
      const oldStatus = node.status;

      // Apply updates
      Object.assign(node, updates, {
        updatedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });

      // Update indexes if key fields changed
      if (updates.region && updates.region !== oldRegion) {
        this.removeFromIndex('region', oldRegion, nodeId);
        this.addToIndex('region', node.region, nodeId);
      }
      
      if (updates.type && updates.type !== oldType) {
        this.removeFromIndex('type', oldType, nodeId);
        this.addToIndex('type', node.type, nodeId);
      }
      
      if (updates.status && updates.status !== oldStatus) {
        this.removeFromIndex('status', oldStatus, nodeId);
        this.addToIndex('status', node.status, nodeId);
      }

      console.log(`[NodeManager] Updated node: ${nodeId}`);
      
      this.emit('node_updated', node);
      
      return node;
    } catch (error) {
      console.error(`[NodeManager] Failed to update node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Update node health status
   */
  async updateNodeHealth(nodeId, health) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[NodeManager] Cannot update health for unknown node: ${nodeId}`);
      return;
    }

    const oldStatus = node.status;
    const newStatus = health.status;

    // Update node metrics and status
    node.metrics = { ...node.metrics, ...health.metrics };
    node.status = newStatus;
    node.lastSeen = new Date().toISOString();
    node.updatedAt = new Date().toISOString();

    // Update status index if changed
    if (newStatus !== oldStatus) {
      this.removeFromIndex('status', oldStatus, nodeId);
      this.addToIndex('status', newStatus, nodeId);
    }

    this.emit('node_health_updated', { nodeId, health, oldStatus, newStatus });
  }

  /**
   * Get a specific node
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by region
   */
  getNodesByRegion(region) {
    const nodeIds = this.nodesByRegion.get(region) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)).filter(Boolean);
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type) {
    const nodeIds = this.nodesByType.get(type) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)).filter(Boolean);
  }

  /**
   * Get nodes by status
   */
  getNodesByStatus(status) {
    const nodeIds = this.nodesByStatus.get(status) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)).filter(Boolean);
  }

  /**
   * Get active nodes
   */
  getActiveNodes() {
    return this.getNodesByStatus('active');
  }

  /**
   * Get degraded nodes
   */
  getDegradedNodes() {
    return this.getNodesByStatus('degraded');
  }

  /**
   * Get inactive nodes
   */
  getInactiveNodes() {
    return this.getNodesByStatus('inactive');
  }

  /**
   * Get node count
   */
  getNodeCount() {
    return this.nodes.size;
  }

  /**
   * Filter nodes by criteria
   */
  filterNodes(criteria = {}) {
    let nodes = this.getAllNodes();

    if (criteria.region) {
      nodes = nodes.filter(node => node.region === criteria.region);
    }

    if (criteria.type) {
      nodes = nodes.filter(node => node.type === criteria.type);
    }

    if (criteria.status) {
      nodes = nodes.filter(node => node.status === criteria.status);
    }

    if (criteria.tier) {
      nodes = nodes.filter(node => node.tier === criteria.tier);
    }

    if (criteria.capabilities) {
      const requiredCaps = Array.isArray(criteria.capabilities) 
        ? criteria.capabilities 
        : [criteria.capabilities];
      
      nodes = nodes.filter(node => 
        requiredCaps.every(cap => node.capabilities.includes(cap))
      );
    }

    if (criteria.minReputation) {
      nodes = nodes.filter(node => 
        node.metrics.reputation >= criteria.minReputation
      );
    }

    if (criteria.maxLatency) {
      nodes = nodes.filter(node => 
        node.metrics.latency <= criteria.maxLatency
      );
    }

    return nodes;
  }

  /**
   * Get nodes sorted by reputation
   */
  getNodesByReputation(ascending = false) {
    const nodes = this.getAllNodes();
    return nodes.sort((a, b) => {
      const aRep = a.metrics.reputation || 0;
      const bRep = b.metrics.reputation || 0;
      return ascending ? aRep - bRep : bRep - aRep;
    });
  }

  /**
   * Get nodes sorted by latency
   */
  getNodesByLatency(ascending = true) {
    const nodes = this.getAllNodes();
    return nodes.sort((a, b) => {
      const aLat = a.metrics.latency || Infinity;
      const bLat = b.metrics.latency || Infinity;
      return ascending ? aLat - bLat : bLat - aLat;
    });
  }

  /**
   * Validate node data
   */
  validateNode(node) {
    const required = ['id', 'name', 'endpoint', 'region', 'type', 'tier', 'status', 'capabilities'];
    
    for (const field of required) {
      if (!node[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!node.id.startsWith('qnet-')) {
      throw new Error('Node ID must start with "qnet-"');
    }

    const validTypes = ['primary', 'secondary', 'mesh', 'edge'];
    if (!validTypes.includes(node.type)) {
      throw new Error(`Invalid node type: ${node.type}`);
    }

    const validTiers = ['standard', 'premium'];
    if (!validTiers.includes(node.tier)) {
      throw new Error(`Invalid node tier: ${node.tier}`);
    }

    const validStatuses = ['active', 'inactive', 'degraded', 'maintenance'];
    if (!validStatuses.includes(node.status)) {
      throw new Error(`Invalid node status: ${node.status}`);
    }

    if (!Array.isArray(node.capabilities) || node.capabilities.length === 0) {
      throw new Error('Node must have at least one capability');
    }
  }

  /**
   * Add node to index
   */
  addToIndex(indexType, key, nodeId) {
    const indexMap = this[`nodesBy${indexType.charAt(0).toUpperCase() + indexType.slice(1)}`];
    if (!indexMap.has(key)) {
      indexMap.set(key, new Set());
    }
    indexMap.get(key).add(nodeId);
  }

  /**
   * Remove node from index
   */
  removeFromIndex(indexType, key, nodeId) {
    const indexMap = this[`nodesBy${indexType.charAt(0).toUpperCase() + indexType.slice(1)}`];
    const nodeSet = indexMap.get(key);
    if (nodeSet) {
      nodeSet.delete(nodeId);
      if (nodeSet.size === 0) {
        indexMap.delete(key);
      }
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Check every minute
  }

  /**
   * Perform health checks on all nodes
   */
  async performHealthChecks() {
    const nodes = this.getAllNodes();
    
    for (const node of nodes) {
      try {
        // Simulate health check - in production would ping actual nodes
        const isHealthy = await this.checkNodeHealth(node);
        
        if (!isHealthy && node.status === 'active') {
          await this.updateNode(node.id, { status: 'degraded' });
        } else if (isHealthy && node.status === 'degraded') {
          await this.updateNode(node.id, { status: 'active' });
        }
      } catch (error) {
        console.error(`[NodeManager] Health check failed for ${node.id}:`, error);
      }
    }
  }

  /**
   * Check individual node health
   */
  async checkNodeHealth(node) {
    if (this.mockMode) {
      // Mock health check with random results
      return Math.random() > 0.1; // 90% healthy
    }

    // In production, would make actual health check request
    try {
      const response = await fetch(`${node.endpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if node manager is healthy
   */
  isHealthy() {
    return this.initialized && this.nodes.size > 0;
  }

  /**
   * Stop the node manager
   */
  async stop() {
    console.log('[NodeManager] Stopping...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Clear all data structures
    this.nodes.clear();
    this.nodesByRegion.clear();
    this.nodesByType.clear();
    this.nodesByStatus.clear();
    
    this.initialized = false;
    console.log('[NodeManager] Stopped');
  }
}

export default NodeManager;