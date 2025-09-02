/**
 * QNET Node Management Service
 * 
 * Handles QNET node discovery, management, and health monitoring
 * for distributed flow execution
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ecosystemIntegration } from '../services/EcosystemIntegration.js';
import { nodeCapabilityVerifier } from './NodeCapabilityVerifier.js';

export interface QNETNode {
  nodeId: string;
  peerId: string;
  address: string;
  multiaddrs: string[];
  capabilities: NodeCapability[];
  performanceScore: number;
  currentLoad: number;
  latency: number;
  daoSubnets: string[];
  lastSeen: string;
  reputation: number;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  metadata: {
    version: string;
    region?: string;
    provider?: string;
    resources: NodeResources;
    uptime: number;
  };
}

export interface NodeCapability {
  name: string;
  version: string;
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface NodeResources {
  cpu: {
    cores: number;
    usage: number; // 0-100%
    available: number;
  };
  memory: {
    total: number; // bytes
    used: number;
    available: number;
  };
  storage: {
    total: number; // bytes
    used: number;
    available: number;
  };
  network: {
    bandwidth: number; // bytes/sec
    connections: number;
    maxConnections: number;
  };
}

export interface NodeSelectionCriteria {
  daoSubnet?: string;
  requiredCapabilities: string[];
  minPerformanceScore: number;
  maxLatency: number;
  resourceRequirements: {
    minCpu?: number;
    minMemory?: number;
    minStorage?: number;
    minBandwidth?: number;
  };
  geographicPreference?: string[];
  excludeNodes?: string[];
  loadBalancing?: 'round-robin' | 'least-loaded' | 'performance-based' | 'random';
}

export interface NodeMetrics {
  nodeId: string;
  timestamp: string;
  metrics: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    errorRate: number;
  };
}

export interface NodeHealthCheck {
  nodeId: string;
  timestamp: string;
  healthy: boolean;
  checks: {
    connectivity: boolean;
    resources: boolean;
    capabilities: boolean;
    performance: boolean;
  };
  issues: string[];
  responseTime: number;
}

/**
 * QNET Node Manager for distributed execution
 */
export class QNETNodeManager extends EventEmitter {
  private nodes = new Map<string, QNETNode>();
  private nodeMetrics = new Map<string, NodeMetrics[]>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private performanceUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startNodeDiscovery();
    this.startHealthChecking();
    this.startPerformanceMonitoring();
  }

  /**
   * Discover and register QNET nodes
   */
  async discoverNodes(): Promise<QNETNode[]> {
    try {
      const qnetService = ecosystemIntegration.getService('qnet');
      if (!qnetService) {
        console.warn('[QNETNodeManager] QNET service not available');
        return [];
      }

      // Get peers from QNET service
      const peersResponse = await qnetService.call('/api/v1/network/peers', 'GET', {});
      const peers = peersResponse.data || [];

      const discoveredNodes: QNETNode[] = [];

      for (const peer of peers) {
        try {
          // Get detailed node information
          const nodeInfo = await this.getNodeInfo(peer.peerId);
          if (nodeInfo) {
            const node = await this.createNodeFromPeerInfo(peer, nodeInfo);
            discoveredNodes.push(node);
            this.nodes.set(node.nodeId, node);
          }
        } catch (error) {
          console.warn(`[QNETNodeManager] Failed to get info for peer ${peer.peerId}: ${error}`);
        }
      }

      // Emit nodes discovered event
      await qflowEventEmitter.emit('q.qflow.nodes.discovered.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-qnet-manager',
        actor: 'system',
        data: {
          discoveredCount: discoveredNodes.length,
          totalNodes: this.nodes.size,
          nodeIds: discoveredNodes.map(n => n.nodeId)
        }
      });

      console.log(`[QNETNodeManager] Discovered ${discoveredNodes.length} nodes`);
      return discoveredNodes;

    } catch (error) {
      console.error(`[QNETNodeManager] Node discovery failed: ${error}`);
      return [];
    }
  }

  /**
   * Select optimal node for execution
   */
  async selectNode(criteria: NodeSelectionCriteria): Promise<QNETNode | null> {
    try {
      let candidateNodes = Array.from(this.nodes.values());

      // Filter by status
      candidateNodes = candidateNodes.filter(node => node.status === 'online');

      // Filter by DAO subnet
      if (criteria.daoSubnet) {
        candidateNodes = candidateNodes.filter(node => 
          node.daoSubnets.includes(criteria.daoSubnet!)
        );
      }

      // Filter by required capabilities using verified capabilities
      candidateNodes = candidateNodes.filter(node => {
        // First check declared capabilities
        const hasDeclaredCapabilities = criteria.requiredCapabilities.every(reqCap => 
          node.capabilities.some(cap => cap.name === reqCap && cap.enabled)
        );
        
        if (!hasDeclaredCapabilities) {
          return false;
        }

        // Then check verified capabilities if available
        const manifest = nodeCapabilityVerifier.getCapabilityManifest(node.nodeId);
        if (manifest) {
          const verificationHistory = nodeCapabilityVerifier.getVerificationHistory(node.nodeId);
          const latestVerification = verificationHistory[verificationHistory.length - 1];
          
          // Exclude nodes with failed verification or high anomaly count
          if (latestVerification && 
              (latestVerification.overallStatus === 'failed' || 
               latestVerification.anomalies.length > 3)) {
            return false;
          }
        }

        return true;
      });

      // Filter by performance score
      candidateNodes = candidateNodes.filter(node => 
        node.performanceScore >= criteria.minPerformanceScore
      );

      // Filter by latency
      candidateNodes = candidateNodes.filter(node => 
        node.latency <= criteria.maxLatency
      );

      // Filter by resource requirements
      if (criteria.resourceRequirements) {
        candidateNodes = candidateNodes.filter(node => {
          const resources = node.metadata.resources;
          const req = criteria.resourceRequirements;

          return (!req.minCpu || resources.cpu.available >= req.minCpu) &&
                 (!req.minMemory || resources.memory.available >= req.minMemory) &&
                 (!req.minStorage || resources.storage.available >= req.minStorage) &&
                 (!req.minBandwidth || resources.network.bandwidth >= req.minBandwidth);
        });
      }

      // Filter by geographic preference
      if (criteria.geographicPreference && criteria.geographicPreference.length > 0) {
        candidateNodes = candidateNodes.filter(node => 
          criteria.geographicPreference!.includes(node.metadata.region || 'unknown')
        );
      }

      // Exclude specific nodes
      if (criteria.excludeNodes && criteria.excludeNodes.length > 0) {
        candidateNodes = candidateNodes.filter(node => 
          !criteria.excludeNodes!.includes(node.nodeId)
        );
      }

      if (candidateNodes.length === 0) {
        return null;
      }

      // Select node based on load balancing strategy
      let selectedNode: QNETNode;

      switch (criteria.loadBalancing || 'performance-based') {
        case 'round-robin':
          selectedNode = this.selectRoundRobin(candidateNodes);
          break;

        case 'least-loaded':
          selectedNode = candidateNodes.reduce((best, current) => 
            current.currentLoad < best.currentLoad ? current : best
          );
          break;

        case 'performance-based':
          selectedNode = candidateNodes.reduce((best, current) => {
            const bestScore = this.calculateNodeScore(best);
            const currentScore = this.calculateNodeScore(current);
            return currentScore > bestScore ? current : best;
          });
          break;

        case 'random':
          selectedNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)];
          break;

        default:
          selectedNode = candidateNodes[0];
      }

      // Emit node selected event
      await qflowEventEmitter.emit('q.qflow.node.selected.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-qnet-manager',
        actor: 'system',
        data: {
          nodeId: selectedNode.nodeId,
          selectionCriteria: criteria,
          candidateCount: candidateNodes.length,
          performanceScore: selectedNode.performanceScore,
          currentLoad: selectedNode.currentLoad
        }
      });

      console.log(`[QNETNodeManager] Selected node ${selectedNode.nodeId} (score: ${selectedNode.performanceScore}, load: ${selectedNode.currentLoad}%)`);
      return selectedNode;

    } catch (error) {
      console.error(`[QNETNodeManager] Node selection failed: ${error}`);
      return null;
    }
  }

  /**
   * Get available nodes
   */
  getAvailableNodes(daoSubnet?: string): QNETNode[] {
    let nodes = Array.from(this.nodes.values());

    // Filter by status
    nodes = nodes.filter(node => node.status === 'online');

    // Filter by DAO subnet if specified
    if (daoSubnet) {
      nodes = nodes.filter(node => node.daoSubnets.includes(daoSubnet));
    }

    return nodes.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Update node metrics
   */
  async updateNodeMetrics(nodeId: string, metrics: NodeMetrics): Promise<void> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        console.warn(`[QNETNodeManager] Node not found for metrics update: ${nodeId}`);
        return;
      }

      // Store metrics history
      if (!this.nodeMetrics.has(nodeId)) {
        this.nodeMetrics.set(nodeId, []);
      }
      
      const nodeMetricsHistory = this.nodeMetrics.get(nodeId)!;
      nodeMetricsHistory.push(metrics);

      // Keep only last 100 metrics entries
      if (nodeMetricsHistory.length > 100) {
        nodeMetricsHistory.splice(0, nodeMetricsHistory.length - 100);
      }

      // Update node performance score and load
      node.performanceScore = this.calculatePerformanceScore(metrics);
      node.currentLoad = metrics.metrics.cpu; // Use CPU as primary load indicator
      node.lastSeen = metrics.timestamp;

      // Update node resources
      node.metadata.resources.cpu.usage = metrics.metrics.cpu;
      node.metadata.resources.cpu.available = node.metadata.resources.cpu.cores * (100 - metrics.metrics.cpu) / 100;
      node.metadata.resources.memory.used = node.metadata.resources.memory.total * metrics.metrics.memory / 100;
      node.metadata.resources.memory.available = node.metadata.resources.memory.total - node.metadata.resources.memory.used;

      // Emit metrics updated event
      await qflowEventEmitter.emit('q.qflow.node.metrics.updated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-qnet-manager',
        actor: 'system',
        data: {
          nodeId,
          performanceScore: node.performanceScore,
          currentLoad: node.currentLoad,
          metrics: metrics.metrics
        }
      });

    } catch (error) {
      console.error(`[QNETNodeManager] Failed to update node metrics: ${error}`);
    }
  }

  /**
   * Check node health
   */
  async checkNodeHealth(nodeId: string): Promise<NodeHealthCheck> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return {
          nodeId,
          timestamp,
          healthy: false,
          checks: {
            connectivity: false,
            resources: false,
            capabilities: false,
            performance: false
          },
          issues: ['Node not found'],
          responseTime: Date.now() - startTime
        };
      }

      const checks = {
        connectivity: false,
        resources: false,
        capabilities: false,
        performance: false
      };
      const issues: string[] = [];

      // Check connectivity
      try {
        const qnetService = ecosystemIntegration.getService('qnet');
        if (qnetService) {
          await qnetService.call('/api/v1/network/ping', 'POST', { peerId: node.peerId });
          checks.connectivity = true;
        } else {
          issues.push('QNET service not available');
        }
      } catch (error) {
        issues.push(`Connectivity check failed: ${error}`);
      }

      // Check resources
      const resources = node.metadata.resources;
      if (resources.cpu.usage < 90 && resources.memory.available > 0 && resources.storage.available > 0) {
        checks.resources = true;
      } else {
        issues.push('Resource constraints detected');
      }

      // Check capabilities
      const enabledCapabilities = node.capabilities.filter(cap => cap.enabled);
      if (enabledCapabilities.length > 0) {
        checks.capabilities = true;
      } else {
        issues.push('No enabled capabilities');
      }

      // Check performance
      if (node.performanceScore >= 50 && node.latency < 1000) {
        checks.performance = true;
      } else {
        issues.push('Performance below threshold');
      }

      const healthy = Object.values(checks).every(check => check);
      const responseTime = Date.now() - startTime;

      // Update node status based on health
      const newStatus = healthy ? 'online' : 'degraded';
      if (node.status !== newStatus) {
        node.status = newStatus;
        
        await qflowEventEmitter.emit('q.qflow.node.status.changed.v1', {
          eventId: this.generateEventId(),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          source: 'qflow-qnet-manager',
          actor: 'system',
          data: {
            nodeId,
            previousStatus: node.status,
            newStatus,
            healthy,
            issues
          }
        });
      }

      return {
        nodeId,
        timestamp,
        healthy,
        checks,
        issues,
        responseTime
      };

    } catch (error) {
      return {
        nodeId,
        timestamp,
        healthy: false,
        checks: {
          connectivity: false,
          resources: false,
          capabilities: false,
          performance: false
        },
        issues: [`Health check failed: ${error}`],
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get node metrics history
   */
  getNodeMetrics(nodeId: string, limit?: number): NodeMetrics[] {
    const metrics = this.nodeMetrics.get(nodeId) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): QNETNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): QNETNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Remove node
   */
  async removeNode(nodeId: string): Promise<boolean> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return false;
      }

      this.nodes.delete(nodeId);
      this.nodeMetrics.delete(nodeId);

      // Emit node removed event
      await qflowEventEmitter.emit('q.qflow.node.removed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-qnet-manager',
        actor: 'system',
        data: {
          nodeId,
          peerId: node.peerId,
          reason: 'manual-removal'
        }
      });

      console.log(`[QNETNodeManager] Removed node ${nodeId}`);
      return true;

    } catch (error) {
      console.error(`[QNETNodeManager] Failed to remove node: ${error}`);
      return false;
    }
  }

  // Private helper methods

  private startNodeDiscovery(): void {
    // Initial discovery
    setTimeout(() => this.discoverNodes(), 1000);

    // Periodic discovery every 30 seconds
    this.discoveryInterval = setInterval(async () => {
      try {
        await this.discoverNodes();
      } catch (error) {
        console.error(`[QNETNodeManager] Periodic discovery failed: ${error}`);
      }
    }, 30000);
  }

  private startHealthChecking(): void {
    // Health check every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const nodes = Array.from(this.nodes.keys());
        const healthChecks = await Promise.allSettled(
          nodes.map(nodeId => this.checkNodeHealth(nodeId))
        );

        let healthyCount = 0;
        let unhealthyCount = 0;

        healthChecks.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.healthy) {
              healthyCount++;
            } else {
              unhealthyCount++;
            }
          } else {
            unhealthyCount++;
          }
        });

        console.log(`[QNETNodeManager] Health check completed: ${healthyCount} healthy, ${unhealthyCount} unhealthy`);

      } catch (error) {
        console.error(`[QNETNodeManager] Health checking failed: ${error}`);
      }
    }, 60000);
  }

  private startPerformanceMonitoring(): void {
    // Performance monitoring every 30 seconds
    this.performanceUpdateInterval = setInterval(async () => {
      try {
        // Update performance scores based on recent metrics
        for (const [nodeId, node] of this.nodes.entries()) {
          const recentMetrics = this.getNodeMetrics(nodeId, 5); // Last 5 metrics
          if (recentMetrics.length > 0) {
            const avgPerformance = this.calculateAveragePerformance(recentMetrics);
            node.performanceScore = avgPerformance;
          }
        }

      } catch (error) {
        console.error(`[QNETNodeManager] Performance monitoring failed: ${error}`);
      }
    }, 30000);
  }

  private async getNodeInfo(peerId: string): Promise<any> {
    try {
      const qnetService = ecosystemIntegration.getService('qnet');
      if (!qnetService) {
        return null;
      }

      const response = await qnetService.call(`/api/v1/network/peers/${peerId}/info`, 'GET', {});
      return response.data;

    } catch (error) {
      console.error(`[QNETNodeManager] Failed to get node info for ${peerId}: ${error}`);
      return null;
    }
  }

  private async createNodeFromPeerInfo(peer: any, nodeInfo: any): Promise<QNETNode> {
    const nodeId = `qnet_${peer.peerId.substring(0, 8)}`;

    return {
      nodeId,
      peerId: peer.peerId,
      address: peer.address || nodeInfo.address || 'unknown',
      multiaddrs: nodeInfo.multiaddrs || [],
      capabilities: this.parseCapabilities(nodeInfo.capabilities || []),
      performanceScore: 75, // Default score
      currentLoad: 0,
      latency: peer.latency || 100,
      daoSubnets: nodeInfo.daoSubnets || ['default'],
      lastSeen: new Date().toISOString(),
      reputation: 100, // Default reputation
      status: 'online',
      metadata: {
        version: nodeInfo.version || '1.0.0',
        region: nodeInfo.region,
        provider: nodeInfo.provider,
        resources: {
          cpu: {
            cores: nodeInfo.resources?.cpu?.cores || 4,
            usage: 0,
            available: nodeInfo.resources?.cpu?.cores || 4
          },
          memory: {
            total: nodeInfo.resources?.memory?.total || 8 * 1024 * 1024 * 1024, // 8GB
            used: 0,
            available: nodeInfo.resources?.memory?.total || 8 * 1024 * 1024 * 1024
          },
          storage: {
            total: nodeInfo.resources?.storage?.total || 100 * 1024 * 1024 * 1024, // 100GB
            used: 0,
            available: nodeInfo.resources?.storage?.total || 100 * 1024 * 1024 * 1024
          },
          network: {
            bandwidth: nodeInfo.resources?.network?.bandwidth || 1000000, // 1Mbps
            connections: 0,
            maxConnections: 100
          }
        },
        uptime: nodeInfo.uptime || 0
      }
    };
  }

  private parseCapabilities(capabilities: any[]): NodeCapability[] {
    return capabilities.map(cap => ({
      name: cap.name || cap,
      version: cap.version || '1.0.0',
      enabled: cap.enabled !== false,
      configuration: cap.configuration
    }));
  }

  private calculateNodeScore(node: QNETNode): number {
    // Weighted scoring: performance (40%), load (30%), reputation (20%), latency (10%)
    const performanceWeight = 0.4;
    const loadWeight = 0.3;
    const reputationWeight = 0.2;
    const latencyWeight = 0.1;

    const performanceScore = node.performanceScore;
    const loadScore = Math.max(0, 100 - node.currentLoad); // Lower load = higher score
    const reputationScore = node.reputation;
    const latencyScore = Math.max(0, 100 - (node.latency / 10)); // Lower latency = higher score

    return (
      performanceScore * performanceWeight +
      loadScore * loadWeight +
      reputationScore * reputationWeight +
      latencyScore * latencyWeight
    );
  }

  private calculatePerformanceScore(metrics: NodeMetrics): number {
    const m = metrics.metrics;
    
    // Calculate performance based on various factors
    const cpuScore = Math.max(0, 100 - m.cpu);
    const memoryScore = Math.max(0, 100 - m.memory);
    const networkScore = Math.max(0, 100 - m.network);
    const errorRateScore = Math.max(0, 100 - (m.errorRate * 100));
    
    // Weighted average
    return (cpuScore * 0.3 + memoryScore * 0.3 + networkScore * 0.2 + errorRateScore * 0.2);
  }

  private calculateAveragePerformance(metrics: NodeMetrics[]): number {
    if (metrics.length === 0) return 75; // Default score

    const scores = metrics.map(m => this.calculatePerformanceScore(m));
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private selectRoundRobin(nodes: QNETNode[]): QNETNode {
    // Simple round-robin implementation
    // In a real implementation, this would maintain state across calls
    const timestamp = Date.now();
    const index = timestamp % nodes.length;
    return nodes[index];
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
      this.performanceUpdateInterval = null;
    }

    this.nodes.clear();
    this.nodeMetrics.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const qnetNodeManager = new QNETNodeManager();