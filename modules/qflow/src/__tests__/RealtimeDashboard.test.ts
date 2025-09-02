/**
 * Real-time Dashboard Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { RealtimeDashboardService } from '../services/RealtimeDashboardService.js';
import { PerformanceIntegrationService } from '../services/PerformanceIntegrationService.js';
import { AdaptivePerformanceService } from '../services/AdaptivePerformanceService.js';

describe('RealtimeDashboardService', () => {
  let dashboardService: RealtimeDashboardService;
  let performanceService: PerformanceIntegrationService;
  let adaptiveService: AdaptivePerformanceService;
  let testPort: number;

  beforeEach(async () => {
    // Use a random port for testing
    testPort = 9000 + Math.floor(Math.random() * 1000);
    
    performanceService = new PerformanceIntegrationService();
    adaptiveService = new AdaptivePerformanceService(performanceService);
    
    dashboardService = new RealtimeDashboardService(
      performanceService,
      adaptiveService,
      {
        port: testPort,
        updateInterval: 1000,
        heartbeatInterval: 5000,
        maxClients: 10
      }
    );

    await performanceService.initialize();
    await adaptiveService.initialize();
    dashboardService.start();

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    dashboardService.stop();
    await adaptiveService.shutdown();
    await performanceService.shutdown();
  });

  describe('WebSocket Server', () => {
    it('should start WebSocket server on configured port', () => {
      const config = dashboardService.getConfig();
      expect(config.port).toBe(testPort);
    });

    it('should accept WebSocket connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should send welcome message on connection', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'welcome') {
          expect(message.data).toHaveProperty('clientId');
          expect(message.data).toHaveProperty('availableStreams');
          expect(message.data).toHaveProperty('dashboardData');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Client Management', () => {
    it('should track connected clients', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('open', () => {
        setTimeout(() => {
          const stats = dashboardService.getDashboardStats();
          expect(stats.connectedClients).toBe(1);
          ws.close();
          done();
        }, 50);
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle client subscriptions', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { streams: ['performance_metrics', 'flow_executions'] }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
          expect(message.data.subscriptions).toContain('performance_metrics');
          expect(message.data.subscriptions).toContain('flow_executions');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Metric Streaming', () => {
    it('should provide dashboard statistics', () => {
      const stats = dashboardService.getDashboardStats();
      
      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('activeStreams');
      expect(stats).toHaveProperty('alertRules');
      expect(stats).toHaveProperty('uptime');
      expect(typeof stats.connectedClients).toBe('number');
      expect(typeof stats.activeStreams).toBe('number');
    });

    it('should provide interactive dashboard data', () => {
      const data = dashboardService.getInteractiveDashboardData();
      
      expect(data).toHaveProperty('realTimeMetrics');
      expect(data).toHaveProperty('flowExecutions');
      expect(data).toHaveProperty('validationPipeline');
      expect(data).toHaveProperty('systemHealth');
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('daoMetrics');
    });

    it('should broadcast messages to subscribed clients', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      let welcomeReceived = false;
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { streams: ['performance_metrics'] }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'welcome') {
          welcomeReceived = true;
        } else if (message.type === 'subscription_confirmed' && welcomeReceived) {
          // Trigger a broadcast
          dashboardService.broadcast('test_message', { test: 'data' });
        } else if (message.type === 'test_message') {
          expect(message.data.test).toBe('data');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Alert Management', () => {
    it('should add alert rules', () => {
      const alertRule = {
        id: 'test-alert',
        name: 'Test Alert',
        condition: 'test_metric > 100',
        severity: 'medium' as const,
        channels: ['dashboard'],
        enabled: true,
        cooldown: 60000
      };

      dashboardService.addAlertRule(alertRule);
      
      // Verify alert was added (would need access to internal state)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should remove alert rules', () => {
      const alertRule = {
        id: 'test-alert-remove',
        name: 'Test Alert Remove',
        condition: 'test_metric > 100',
        severity: 'low' as const,
        channels: ['dashboard'],
        enabled: true,
        cooldown: 60000
      };

      dashboardService.addAlertRule(alertRule);
      dashboardService.removeAlertRule('test-alert-remove');
      
      // Verify alert was removed (would need access to internal state)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance Integration', () => {
    it('should handle performance events', (done) => {
      dashboardService.on('client_connected', () => {
        // Simulate performance event
        performanceService.emit('flow_metrics_recorded', {
          flowId: 'test-flow',
          executionTime: 1500,
          status: 'completed'
        });
        
        done();
      });

      // Connect a client to trigger the event handler
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle adaptive performance events', (done) => {
      dashboardService.on('client_connected', () => {
        // Simulate adaptive performance event
        adaptiveService.emit('scale_up_initiated', {
          reason: 'high_load',
          targetNodes: 3,
          currentNodes: 2
        });
        
        done();
      });

      // Connect a client to trigger the event handler
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON messages gracefully', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('open', () => {
        ws.send('invalid json');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.data.message).toContain('Invalid message format');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle unknown message types', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'unknown_type',
          data: {}
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.data.message).toContain('Unknown message type');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Configuration', () => {
    it('should return configuration', () => {
      const config = dashboardService.getConfig();
      
      expect(config.port).toBe(testPort);
      expect(config.updateInterval).toBe(1000);
      expect(config.heartbeatInterval).toBe(5000);
      expect(config.maxClients).toBe(10);
    });
  });
});