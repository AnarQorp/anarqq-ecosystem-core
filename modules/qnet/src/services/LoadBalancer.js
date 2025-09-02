/**
 * Load Balancer - Intelligent request routing and load balancing
 * 
 * Provides health-based request routing, load balancing algorithms,
 * and traffic distribution optimization.
 */

import { EventEmitter } from 'events';

export class LoadBalancer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeManager = options.nodeManager;
    this.healthMonitor = options.healthMonitor;
    this.mockMode = options.mockMode || false;
    
    this.algorithms = {
      ROUND_ROBIN: 'round_robin',
      WEIGHTED_ROUND_ROBIN: 'weighted_round_robin',
      LEAST_CONNECTIONS: 'least_connections',
      HEALTH_BASED: 'health_based',
      LATENCY_BASED: 'latency_based',
      REPUTATION_BASED: 'reputation_based'
    };
    
    this.defaultAlgorithm = this.algorithms.HEALTH_BASED;
    this.roundRobinCounters = new Map();
    this.connectionCounts = new Map();
    
    this.initialized = false;
  }

  /**
   * Initialize load balancer
   */
  async initialize() {
    console.log('[LoadBalancer] Initializing...');
    
    if (!this.nodeManager) {
      throw new Error('NodeManager is required for LoadBalancer');
    }
    
    this.setupEventHandlers();
    this.initialized = true;
    
    console.log('[LoadBalancer] Initialized');
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Reset connection count when nodes are removed
    this.nodeManager.on('node_removed', (node) => {
      this.connectionCounts.delete(node.id);
      this.roundRobinCounters.delete(node.id);
    });

    // Track health changes for health-based routing
    if (this.healthMonitor) {
      this.healthMonitor.on('node_health_changed', (nodeId, health) => {
        this.emit('node_health_updated', { nodeId, health });
      });
    }
  }

  /**
   * Select best node for request routing
   */
  selectNode(criteria = {}) {
    const {
      algorithm = this.defaultAlgorithm,
      region,
      capabilities,
      excludeNodes = [],
      minReputation = 0.7,
      maxLatency = 200
    } = criteria;

    try {
      // Get candidate nodes
      let candidates = this.getCandidateNodes({
        region,
        capabilities,
        excludeNodes,
        minReputation,
        maxLatency
      });

      if (candidates.length === 0) {
        throw new Error('No suitable nodes available');
      }

      // Apply load balancing algorithm
      const selectedNode = this.applyAlgorithm(algorithm, candidates);
      
      if (!selectedNode) {
        throw new Error('Load balancing algorithm failed to select node');
      }

      // Update connection count
      this.incrementConnectionCount(selectedNode.id);
      
      this.emit('node_selected', {
        nodeId: selectedNode.id,
        algorithm,
        criteria,
        candidateCount: candidates.length
      });

      return selectedNode;
      
    } catch (error) {
      console.error('[LoadBalancer] Node selection failed:', error);
      throw error;
    }
  }

  /**
   * Get candidate nodes based on criteria
   */
  getCandidateNodes(criteria) {
    if (!this.nodeManager) {
      return [];
    }

    let nodes = this.nodeManager.getActiveNodes();

    // Filter by region
    if (criteria.region) {
      nodes = nodes.filter(node => node.region === criteria.region);
    }

    // Filter by capabilities
    if (criteria.capabilities) {
      const requiredCaps = Array.isArray(criteria.capabilities) 
        ? criteria.capabilities 
        : [criteria.capabilities];
      
      nodes = nodes.filter(node => 
        requiredCaps.every(cap => node.capabilities.includes(cap))
      );
    }

    // Exclude specific nodes
    if (criteria.excludeNodes.length > 0) {
      nodes = nodes.filter(node => !criteria.excludeNodes.includes(node.id));
    }

    // Filter by minimum reputation
    if (criteria.minReputation > 0) {
      nodes = nodes.filter(node => 
        (node.metrics.reputation || 0) >= criteria.minReputation
      );
    }

    // Filter by maximum latency
    if (criteria.maxLatency > 0) {
      nodes = nodes.filter(node => 
        (node.metrics.latency || Infinity) <= criteria.maxLatency
      );
    }

    return nodes;
  }

  /**
   * Apply load balancing algorithm
   */
  applyAlgorithm(algorithm, candidates) {
    switch (algorithm) {
      case this.algorithms.ROUND_ROBIN:
        return this.roundRobinSelection(candidates);
      
      case this.algorithms.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobinSelection(candidates);
      
      case this.algorithms.LEAST_CONNECTIONS:
        return this.leastConnectionsSelection(candidates);
      
      case this.algorithms.HEALTH_BASED:
        return this.healthBasedSelection(candidates);
      
      case this.algorithms.LATENCY_BASED:
        return this.latencyBasedSelection(candidates);
      
      case this.algorithms.REPUTATION_BASED:
        return this.reputationBasedSelection(candidates);
      
      default:
        console.warn(`[LoadBalancer] Unknown algorithm: ${algorithm}, using health-based`);
        return this.healthBasedSelection(candidates);
    }
  }

  /**
   * Round robin selection
   */
  roundRobinSelection(candidates) {
    if (candidates.length === 0) return null;
    
    const key = 'global';
    const counter = this.roundRobinCounters.get(key) || 0;
    const selectedIndex = counter % candidates.length;
    
    this.roundRobinCounters.set(key, counter + 1);
    
    return candidates[selectedIndex];
  }

  /**
   * Weighted round robin selection based on reputation
   */
  weightedRoundRobinSelection(candidates) {
    if (candidates.length === 0) return null;
    
    // Create weighted list based on reputation
    const weightedCandidates = [];
    for (const node of candidates) {
      const weight = Math.max(1, Math.round((node.metrics.reputation || 0.5) * 10));
      for (let i = 0; i < weight; i++) {
        weightedCandidates.push(node);
      }
    }
    
    const key = 'weighted';
    const counter = this.roundRobinCounters.get(key) || 0;
    const selectedIndex = counter % weightedCandidates.length;
    
    this.roundRobinCounters.set(key, counter + 1);
    
    return weightedCandidates[selectedIndex];
  }

  /**
   * Least connections selection
   */
  leastConnectionsSelection(candidates) {
    if (candidates.length === 0) return null;
    
    let minConnections = Infinity;
    let selectedNode = null;
    
    for (const node of candidates) {
      const connections = this.connectionCounts.get(node.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedNode = node;
      }
    }
    
    return selectedNode;
  }

  /**
   * Health-based selection (combines multiple factors)
   */
  healthBasedSelection(candidates) {
    if (candidates.length === 0) return null;
    
    let bestScore = -1;
    let selectedNode = null;
    
    for (const node of candidates) {
      const score = this.calculateHealthScore(node);
      if (score > bestScore) {
        bestScore = score;
        selectedNode = node;
      }
    }
    
    return selectedNode;
  }

  /**
   * Latency-based selection
   */
  latencyBasedSelection(candidates) {
    if (candidates.length === 0) return null;
    
    let minLatency = Infinity;
    let selectedNode = null;
    
    for (const node of candidates) {
      const latency = node.metrics.latency || Infinity;
      if (latency < minLatency) {
        minLatency = latency;
        selectedNode = node;
      }
    }
    
    return selectedNode;
  }

  /**
   * Reputation-based selection
   */
  reputationBasedSelection(candidates) {
    if (candidates.length === 0) return null;
    
    let maxReputation = -1;
    let selectedNode = null;
    
    for (const node of candidates) {
      const reputation = node.metrics.reputation || 0;
      if (reputation > maxReputation) {
        maxReputation = reputation;
        selectedNode = node;
      }
    }
    
    return selectedNode;
  }

  /**
   * Calculate health score for a node
   */
  calculateHealthScore(node) {
    const metrics = node.metrics;
    
    // Normalize metrics to 0-1 scale
    const latencyScore = Math.max(0, 1 - (metrics.latency || 200) / 500);
    const uptimeScore = metrics.uptime || 0.99;
    const reputationScore = metrics.reputation || 0.8;
    const connectionScore = Math.max(0, 1 - (this.connectionCounts.get(node.id) || 0) / 100);
    
    // Weighted combination
    const healthScore = (
      latencyScore * 0.3 +
      uptimeScore * 0.3 +
      reputationScore * 0.3 +
      connectionScore * 0.1
    );
    
    return healthScore;
  }

  /**
   * Distribute traffic across multiple nodes
   */
  distributeTraffic(requestCount, criteria = {}) {
    const candidates = this.getCandidateNodes(criteria);
    
    if (candidates.length === 0) {
      throw new Error('No nodes available for traffic distribution');
    }

    const distribution = new Map();
    
    // Calculate weights based on health scores
    const weights = candidates.map(node => ({
      node,
      weight: this.calculateHealthScore(node)
    }));
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    
    // Distribute requests proportionally
    let remainingRequests = requestCount;
    
    for (let i = 0; i < weights.length; i++) {
      const { node, weight } = weights[i];
      
      let nodeRequests;
      if (i === weights.length - 1) {
        // Last node gets remaining requests
        nodeRequests = remainingRequests;
      } else {
        nodeRequests = Math.round((weight / totalWeight) * requestCount);
        remainingRequests -= nodeRequests;
      }
      
      distribution.set(node.id, {
        node,
        requests: nodeRequests,
        percentage: (nodeRequests / requestCount) * 100,
        weight
      });
    }
    
    return {
      totalRequests: requestCount,
      nodeCount: candidates.length,
      distribution: Object.fromEntries(distribution)
    };
  }

  /**
   * Get load balancing statistics
   */
  getStatistics() {
    const connectionStats = Object.fromEntries(this.connectionCounts);
    const totalConnections = Array.from(this.connectionCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    return {
      totalConnections,
      nodeConnections: connectionStats,
      algorithms: Object.values(this.algorithms),
      defaultAlgorithm: this.defaultAlgorithm,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Increment connection count for a node
   */
  incrementConnectionCount(nodeId) {
    const current = this.connectionCounts.get(nodeId) || 0;
    this.connectionCounts.set(nodeId, current + 1);
  }

  /**
   * Decrement connection count for a node
   */
  decrementConnectionCount(nodeId) {
    const current = this.connectionCounts.get(nodeId) || 0;
    this.connectionCounts.set(nodeId, Math.max(0, current - 1));
  }

  /**
   * Reset connection counts
   */
  resetConnectionCounts() {
    this.connectionCounts.clear();
    console.log('[LoadBalancer] Connection counts reset');
  }

  /**
   * Update default algorithm
   */
  setDefaultAlgorithm(algorithm) {
    if (!Object.values(this.algorithms).includes(algorithm)) {
      throw new Error(`Invalid algorithm: ${algorithm}`);
    }
    
    this.defaultAlgorithm = algorithm;
    console.log(`[LoadBalancer] Default algorithm set to: ${algorithm}`);
  }

  /**
   * Check if load balancer is healthy
   */
  isHealthy() {
    return this.initialized && this.nodeManager && this.nodeManager.isHealthy();
  }

  /**
   * Stop load balancer
   */
  async stop() {
    console.log('[LoadBalancer] Stopping...');
    
    this.connectionCounts.clear();
    this.roundRobinCounters.clear();
    this.initialized = false;
    
    console.log('[LoadBalancer] Stopped');
  }
}

export default LoadBalancer;