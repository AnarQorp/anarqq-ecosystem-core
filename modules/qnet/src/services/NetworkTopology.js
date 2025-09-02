/**
 * Network Topology - Manages network topology and connections
 * 
 * Tracks network topology, node connections, and provides topology
 * optimization and analysis capabilities.
 */

import { EventEmitter } from 'events';

export class NetworkTopology extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.mockMode = options.mockMode || false;
    this.topology = {
      nodes: new Map(),
      connections: new Map(),
      clusters: new Map()
    };
    
    this.initialized = false;
  }

  /**
   * Initialize topology
   */
  async initialize() {
    console.log('[NetworkTopology] Initializing...');
    
    if (this.mockMode) {
      this.initializeMockTopology();
    }
    
    this.initialized = true;
    console.log('[NetworkTopology] Initialized');
  }

  /**
   * Initialize mock topology for standalone mode
   */
  initializeMockTopology() {
    // Mock connections between nodes
    const connections = [
      { from: 'qnet-us-east-primary', to: 'qnet-us-west-primary', latency: 45, bandwidth: '5Gbps' },
      { from: 'qnet-us-east-primary', to: 'qnet-eu-west-primary', latency: 85, bandwidth: '2Gbps' },
      { from: 'qnet-us-west-primary', to: 'qnet-asia-primary', latency: 120, bandwidth: '1Gbps' },
      { from: 'qnet-eu-west-primary', to: 'qnet-eu-central-secondary', latency: 25, bandwidth: '10Gbps' },
      { from: 'qnet-eu-west-primary', to: 'qnet-asia-primary', latency: 95, bandwidth: '2Gbps' }
    ];

    for (const conn of connections) {
      this.addConnection(conn.from, conn.to, {
        latency: conn.latency,
        bandwidth: conn.bandwidth,
        status: 'active'
      });
    }

    // Mock clusters
    this.addCluster('us-cluster', {
      region: 'us',
      nodes: ['qnet-us-east-primary', 'qnet-us-west-primary'],
      status: 'healthy'
    });

    this.addCluster('eu-cluster', {
      region: 'eu',
      nodes: ['qnet-eu-west-primary', 'qnet-eu-central-secondary'],
      status: 'healthy'
    });

    this.addCluster('asia-cluster', {
      region: 'asia',
      nodes: ['qnet-asia-primary'],
      status: 'degraded'
    });
  }

  /**
   * Add node to topology
   */
  addNode(node) {
    this.topology.nodes.set(node.id, {
      id: node.id,
      region: node.region,
      type: node.type,
      status: node.status,
      connections: new Set()
    });

    this.emit('topology_changed', {
      type: 'node_added',
      nodeId: node.id,
      affectedRegions: [node.region],
      affectedNodes: [node.id],
      summary: `Node ${node.id} added to ${node.region}`
    });
  }

  /**
   * Remove node from topology
   */
  removeNode(nodeId) {
    const node = this.topology.nodes.get(nodeId);
    if (!node) return;

    // Remove all connections involving this node
    const connectionsToRemove = [];
    for (const [connId, connection] of this.topology.connections.entries()) {
      if (connection.from === nodeId || connection.to === nodeId) {
        connectionsToRemove.push(connId);
      }
    }

    for (const connId of connectionsToRemove) {
      this.topology.connections.delete(connId);
    }

    // Remove from clusters
    for (const [clusterId, cluster] of this.topology.clusters.entries()) {
      const nodeIndex = cluster.nodes.indexOf(nodeId);
      if (nodeIndex > -1) {
        cluster.nodes.splice(nodeIndex, 1);
        if (cluster.nodes.length === 0) {
          this.topology.clusters.delete(clusterId);
        }
      }
    }

    this.topology.nodes.delete(nodeId);

    this.emit('topology_changed', {
      type: 'node_removed',
      nodeId,
      affectedRegions: [node.region],
      affectedNodes: [nodeId],
      summary: `Node ${nodeId} removed from ${node.region}`
    });
  }

  /**
   * Update node in topology
   */
  updateNode(node) {
    const topologyNode = this.topology.nodes.get(node.id);
    if (!topologyNode) return;

    const oldStatus = topologyNode.status;
    topologyNode.status = node.status;
    topologyNode.region = node.region;
    topologyNode.type = node.type;

    if (oldStatus !== node.status) {
      this.emit('topology_changed', {
        type: 'node_updated',
        nodeId: node.id,
        affectedRegions: [node.region],
        affectedNodes: [node.id],
        summary: `Node ${node.id} status changed from ${oldStatus} to ${node.status}`
      });
    }
  }

  /**
   * Add connection between nodes
   */
  addConnection(fromNodeId, toNodeId, properties = {}) {
    const connectionId = `${fromNodeId}->${toNodeId}`;
    
    const connection = {
      id: connectionId,
      from: fromNodeId,
      to: toNodeId,
      latency: properties.latency || 0,
      bandwidth: properties.bandwidth || '1Gbps',
      status: properties.status || 'active',
      createdAt: new Date().toISOString(),
      ...properties
    };

    this.topology.connections.set(connectionId, connection);

    // Update node connections
    const fromNode = this.topology.nodes.get(fromNodeId);
    const toNode = this.topology.nodes.get(toNodeId);
    
    if (fromNode) fromNode.connections.add(toNodeId);
    if (toNode) toNode.connections.add(fromNodeId);

    this.emit('topology_changed', {
      type: 'connection_added',
      connectionId,
      affectedNodes: [fromNodeId, toNodeId],
      summary: `Connection added between ${fromNodeId} and ${toNodeId}`
    });
  }

  /**
   * Remove connection between nodes
   */
  removeConnection(fromNodeId, toNodeId) {
    const connectionId = `${fromNodeId}->${toNodeId}`;
    const reverseConnectionId = `${toNodeId}->${fromNodeId}`;
    
    this.topology.connections.delete(connectionId);
    this.topology.connections.delete(reverseConnectionId);

    // Update node connections
    const fromNode = this.topology.nodes.get(fromNodeId);
    const toNode = this.topology.nodes.get(toNodeId);
    
    if (fromNode) fromNode.connections.delete(toNodeId);
    if (toNode) toNode.connections.delete(fromNodeId);

    this.emit('topology_changed', {
      type: 'connection_removed',
      connectionId,
      affectedNodes: [fromNodeId, toNodeId],
      summary: `Connection removed between ${fromNodeId} and ${toNodeId}`
    });
  }

  /**
   * Add cluster
   */
  addCluster(clusterId, properties) {
    const cluster = {
      id: clusterId,
      region: properties.region,
      nodes: properties.nodes || [],
      status: properties.status || 'healthy',
      createdAt: new Date().toISOString(),
      ...properties
    };

    this.topology.clusters.set(clusterId, cluster);

    this.emit('topology_changed', {
      type: 'cluster_formed',
      clusterId,
      affectedRegions: [cluster.region],
      affectedNodes: cluster.nodes,
      summary: `Cluster ${clusterId} formed in ${cluster.region}`
    });
  }

  /**
   * Get current topology
   */
  async getTopology() {
    const nodes = Array.from(this.topology.nodes.values());
    const connections = Array.from(this.topology.connections.values());
    const clusters = Array.from(this.topology.clusters.values());

    return {
      nodes,
      connections,
      clusters,
      statistics: {
        nodeCount: nodes.length,
        connectionCount: connections.length,
        clusterCount: clusters.length,
        averageConnections: nodes.length > 0 
          ? connections.length / nodes.length 
          : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Find shortest path between nodes
   */
  findShortestPath(fromNodeId, toNodeId) {
    if (!this.topology.nodes.has(fromNodeId) || !this.topology.nodes.has(toNodeId)) {
      return null;
    }

    // Simple BFS for shortest path
    const queue = [{ nodeId: fromNodeId, path: [fromNodeId], totalLatency: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { nodeId, path, totalLatency } = queue.shift();

      if (nodeId === toNodeId) {
        return { path, totalLatency, hops: path.length - 1 };
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.topology.nodes.get(nodeId);
      for (const connectedNodeId of node.connections) {
        if (!visited.has(connectedNodeId)) {
          const connectionId = `${nodeId}->${connectedNodeId}`;
          const connection = this.topology.connections.get(connectionId);
          const latency = connection ? connection.latency : 0;

          queue.push({
            nodeId: connectedNodeId,
            path: [...path, connectedNodeId],
            totalLatency: totalLatency + latency
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get nodes by region
   */
  getNodesByRegion(region) {
    return Array.from(this.topology.nodes.values())
      .filter(node => node.region === region);
  }

  /**
   * Get cluster health
   */
  getClusterHealth(clusterId) {
    const cluster = this.topology.clusters.get(clusterId);
    if (!cluster) return null;

    const clusterNodes = cluster.nodes.map(nodeId => 
      this.topology.nodes.get(nodeId)
    ).filter(Boolean);

    const activeNodes = clusterNodes.filter(node => node.status === 'active').length;
    const totalNodes = clusterNodes.length;
    const healthRatio = totalNodes > 0 ? activeNodes / totalNodes : 0;

    let status = 'healthy';
    if (healthRatio < 0.5) {
      status = 'critical';
    } else if (healthRatio < 0.8) {
      status = 'degraded';
    }

    return {
      clusterId,
      status,
      nodes: {
        total: totalNodes,
        active: activeNodes,
        healthRatio
      },
      region: cluster.region
    };
  }

  /**
   * Optimize topology
   */
  optimizeTopology() {
    // Simple topology optimization
    const optimizations = [];

    // Check for isolated nodes
    for (const [nodeId, node] of this.topology.nodes.entries()) {
      if (node.connections.size === 0) {
        optimizations.push({
          type: 'isolated_node',
          nodeId,
          recommendation: 'Add connections to integrate node into network'
        });
      }
    }

    // Check for over-connected nodes
    for (const [nodeId, node] of this.topology.nodes.entries()) {
      if (node.connections.size > 10) {
        optimizations.push({
          type: 'over_connected',
          nodeId,
          connections: node.connections.size,
          recommendation: 'Consider reducing connections to improve performance'
        });
      }
    }

    // Check for regional connectivity
    const regions = new Set();
    for (const node of this.topology.nodes.values()) {
      regions.add(node.region);
    }

    for (const region of regions) {
      const regionNodes = this.getNodesByRegion(region);
      if (regionNodes.length === 1) {
        optimizations.push({
          type: 'single_node_region',
          region,
          recommendation: 'Add redundant nodes to improve regional reliability'
        });
      }
    }

    return optimizations;
  }

  /**
   * Check if topology is healthy
   */
  isHealthy() {
    return this.initialized && this.topology.nodes.size > 0;
  }

  /**
   * Stop topology management
   */
  async stop() {
    console.log('[NetworkTopology] Stopping...');
    this.initialized = false;
    console.log('[NetworkTopology] Stopped');
  }
}

export default NetworkTopology;