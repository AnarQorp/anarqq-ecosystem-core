/**
 * QNetService Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QNetService } from '../../src/services/QNetService.js';

describe('QNetService', () => {
  let qnetService;

  beforeEach(async () => {
    // Create unique service instance to avoid shared state
    const uniqueId = `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    qnetService = new QNetService({
      nodeId: uniqueId,
      region: 'test-region',
      tier: 'standard',
      mockMode: true
    });
    
    await qnetService.initialize();
  });

  afterEach(async () => {
    if (qnetService) {
      // Stop all monitoring and clear intervals
      await qnetService.stop();
      qnetService = null;
    }
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(qnetService.nodeId).toBe('test-node');
      expect(qnetService.region).toBe('test-region');
      expect(qnetService.tier).toBe('standard');
      expect(qnetService.mockMode).toBe(true);
    });

    it('should have all required components', () => {
      expect(qnetService.nodeManager).toBeDefined();
      expect(qnetService.topology).toBeDefined();
      expect(qnetService.healthMonitor).toBeDefined();
      expect(qnetService.loadBalancer).toBeDefined();
    });
  });

  describe('ping operations', () => {
    it('should ping all nodes successfully', async () => {
      const result = await qnetService.pingNodes();
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.summary).toHaveProperty('totalNodes');
      expect(result.summary).toHaveProperty('successfulPings');
      expect(result.summary).toHaveProperty('averageLatency');
    });

    it('should ping specific node', async () => {
      const nodeId = 'qnet-us-east-primary';
      const result = await qnetService.pingNodes({ nodeId });
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].nodeId).toBe(nodeId);
      expect(result.summary.totalNodes).toBe(1);
    });

    it('should handle ping with custom parameters', async () => {
      const result = await qnetService.pingNodes({
        timeout: 3000,
        count: 2
      });
      
      expect(result.results.length).toBeGreaterThan(0);
      // Each node should have 2 ping results
      const nodeResults = result.results.filter(r => r.nodeId === result.results[0].nodeId);
      expect(nodeResults).toHaveLength(2);
    });

    it('should throw error for non-existent node', async () => {
      await expect(qnetService.pingNodes({ nodeId: 'non-existent-node' }))
        .rejects.toThrow('Node not found');
    });
  });

  describe('capabilities', () => {
    it('should get network capabilities', async () => {
      const capabilities = await qnetService.getCapabilities();
      
      expect(capabilities).toHaveProperty('services');
      expect(capabilities).toHaveProperty('protocols');
      expect(capabilities).toHaveProperty('regions');
      expect(capabilities).toHaveProperty('features');
      expect(capabilities).toHaveProperty('nodeCapabilities');
      
      expect(Array.isArray(capabilities.services)).toBe(true);
      expect(Array.isArray(capabilities.protocols)).toBe(true);
      expect(Array.isArray(capabilities.regions)).toBe(true);
    });

    it('should filter capabilities by service', async () => {
      const capabilities = await qnetService.getCapabilities({ service: 'routing' });
      
      expect(capabilities.services).toContain('routing');
    });

    it('should get capabilities for specific node', async () => {
      const nodeId = 'qnet-us-east-primary';
      const capabilities = await qnetService.getCapabilities({ nodeId });
      
      expect(capabilities.nodeCapabilities).toHaveProperty(nodeId);
    });
  });

  describe('network status', () => {
    it('should get basic network status', async () => {
      const status = await qnetService.getNetworkStatus();
      
      expect(status).toHaveProperty('network');
      expect(status).toHaveProperty('regions');
      expect(status).toHaveProperty('services');
      
      expect(status.network).toHaveProperty('totalNodes');
      expect(status.network).toHaveProperty('activeNodes');
      expect(status.network).toHaveProperty('averageLatency');
      expect(status.network).toHaveProperty('averageUptime');
    });

    it('should include metrics when requested', async () => {
      const status = await qnetService.getNetworkStatus({ includeMetrics: true });
      
      expect(status).toHaveProperty('metrics');
      expect(status.metrics).toHaveProperty('counters');
      expect(status.metrics).toHaveProperty('gauges');
    });

    it('should include topology when requested', async () => {
      const status = await qnetService.getNetworkStatus({ includeTopology: true });
      
      expect(status).toHaveProperty('topology');
      expect(status.topology).toHaveProperty('nodes');
      expect(status.topology).toHaveProperty('connections');
      expect(status.topology).toHaveProperty('clusters');
    });

    it('should filter by region', async () => {
      const region = 'us-east-1';
      const status = await qnetService.getNetworkStatus({ region });
      
      // Should only include nodes from specified region
      const regionNodes = Object.keys(status.regions).filter(r => r === region);
      expect(regionNodes).toContain(region);
    });
  });

  describe('health check', () => {
    it('should return service health', async () => {
      const health = await qnetService.getHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('service');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('nodeId');
      expect(health).toHaveProperty('region');
      expect(health).toHaveProperty('dependencies');
      expect(health).toHaveProperty('network');
      
      expect(health.service).toBe('qnet');
      expect(health.nodeId).toBe('test-node');
      expect(health.region).toBe('test-region');
    });

    it('should show healthy status with active nodes', async () => {
      const health = await qnetService.getHealth();
      
      expect(['healthy', 'degraded']).toContain(health.status);
      expect(health.network.totalNodes).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should emit events on node changes', (done) => {
      qnetService.once('node_joined', (node) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('region');
        done();
      });

      // Trigger node addition
      qnetService.nodeManager.addNode({
        id: 'test-new-node',
        name: 'Test New Node',
        endpoint: 'https://test.example.com',
        region: 'test-region',
        type: 'secondary',
        tier: 'standard',
        status: 'active',
        capabilities: ['routing'],
        metrics: {
          latency: 50,
          uptime: 0.99,
          requestCount: 0,
          errorCount: 0,
          reputation: 0.8
        }
      });
    });

    it('should emit topology change events', (done) => {
      qnetService.once('topology_changed', (change) => {
        expect(change).toHaveProperty('type');
        expect(change).toHaveProperty('summary');
        done();
      });

      // Trigger topology change by adding a node
      qnetService.nodeManager.addNode({
        id: 'test-topology-node',
        name: 'Test Topology Node',
        endpoint: 'https://topology.example.com',
        region: 'test-region',
        type: 'edge',
        tier: 'standard',
        status: 'active',
        capabilities: ['routing'],
        metrics: {
          latency: 30,
          uptime: 0.98,
          requestCount: 0,
          errorCount: 0,
          reputation: 0.9
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid ping parameters gracefully', async () => {
      await expect(qnetService.pingNodes({ timeout: -1 }))
        .rejects.toThrow();
    });

    it('should handle service stop gracefully', async () => {
      await expect(qnetService.stop()).resolves.not.toThrow();
    });
  });
});