/**
 * Performance Dashboard
 * 
 * Real-time performance monitoring dashboard with WebSocket streaming,
 * interactive visualizations, and automated alerting for Qflow executions.
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { PerformanceProfiler, FlowPerformanceAnalysis } from './PerformanceProfiler';
import { AdvancedRegressionDetector, RegressionAlert } from './RegressionDetector';
import { OptimizationEngine } from './OptimizationEngine';

export interface DashboardConfig {
  enableRealTimeUpdates: boolean;
  updateInterval: number;
  maxDataPoints: number;
  enableAlerts: boolean;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  criticalLatency: number;
  warningLatency: number;
  criticalMemory: number;
  warningMemory: number;
  criticalErrorRate: number;
  warningErrorRate: number;
}

export interface DashboardMetrics {
  timestamp: number;
  systemMetrics: SystemMetrics;
  flowMetrics: Map<string, FlowMetrics>;
  alerts: DashboardAlert[];
  trends: PerformanceTrends;
}

export interface SystemMetrics {
  totalExecutions: number;
  activeExecutions: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  nodeCount: number;
  healthyNodes: number;
}

export interface FlowMetrics {
  flowId: string;
  flowName: string;
  executionCount: number;
  averageLatency: number;
  lastExecution: number;
  status: 'healthy' | 'warning' | 'critical';
  errorRate: number;
  throughput: number;
  bottlenecks: string[];
}

export interface DashboardAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'regression';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  flowId?: string;
  timestamp: number;
  acknowledged: boolean;
  autoResolved: boolean;
}

export interface PerformanceTrends {
  latencyTrend: TrendData;
  throughputTrend: TrendData;
  errorRateTrend: TrendData;
  memoryTrend: TrendData;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  dataPoints: DataPoint[];
}

export interface DataPoint {
  timestamp: number;
  value: number;
}

export class PerformanceDashboard extends EventEmitter {
  private config: DashboardConfig;
  private profiler: PerformanceProfiler;
  private regressionDetector: AdvancedRegressionDetector;
  private optimizationEngine: OptimizationEngine;
  
  private connectedClients: Set<WebSocket>;
  private metricsHistory: DashboardMetrics[];
  private alerts: Map<string, DashboardAlert>;
  private updateTimer: NodeJS.Timeout | null;

  constructor(
    config: DashboardConfig,
    profiler: PerformanceProfiler,
    regressionDetector: AdvancedRegressionDetector,
    optimizationEngine: OptimizationEngine
  ) {
    super();
    this.config = config;
    this.profiler = profiler;
    this.regressionDetector = regressionDetector;
    this.optimizationEngine = optimizationEngine;
    
    this.connectedClients = new Set();
    this.metricsHistory = [];
    this.alerts = new Map();
    this.updateTimer = null;

    this.setupEventListeners();
  }

  /**
   * Start the dashboard
   */
  public start(): void {
    if (this.config.enableRealTimeUpdates) {
      this.updateTimer = setInterval(() => {
        this.updateMetrics();
      }, this.config.updateInterval);
    }

    this.emit('dashboard_started', {
      timestamp: Date.now(),
      config: this.config
    });
  }

  /**
   * Stop the dashboard
   */
  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Close all WebSocket connections
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.connectedClients.clear();

    this.emit('dashboard_stopped', {
      timestamp: Date.now()
    });
  }

  /**
   * Add WebSocket client
   */
  public addClient(ws: WebSocket): void {
    this.connectedClients.add(ws);

    // Send initial data
    this.sendToClient(ws, {
      type: 'initial_data',
      data: this.getCurrentMetrics()
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    });

    this.emit('client_connected', {
      clientCount: this.connectedClients.size,
      timestamp: Date.now()
    });
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe_flow':
        this.handleFlowSubscription(ws, message.flowId);
        break;
      
      case 'acknowledge_alert':
        this.acknowledgeAlert(message.alertId);
        break;
      
      case 'request_flow_analysis':
        this.sendFlowAnalysis(ws, message.flowId);
        break;
      
      case 'request_optimization_recommendations':
        this.sendOptimizationRecommendations(ws, message.flowId);
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Update metrics and broadcast to clients
   */
  private updateMetrics(): void {
    const metrics = this.collectMetrics();
    
    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.config.maxDataPoints) {
      this.metricsHistory.shift();
    }

    // Check for alerts
    this.checkAlerts(metrics);

    // Broadcast to clients
    this.broadcastToClients({
      type: 'metrics_update',
      data: metrics
    });

    this.emit('metrics_updated', metrics);
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): DashboardMetrics {
    const timestamp = Date.now();
    
    // Collect system metrics (mock implementation)
    const systemMetrics: SystemMetrics = {
      totalExecutions: this.getTotalExecutions(),
      activeExecutions: this.getActiveExecutions(),
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getP95Latency(),
      p99Latency: this.getP99Latency(),
      throughput: this.getThroughput(),
      errorRate: this.getErrorRate(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      nodeCount: this.getNodeCount(),
      healthyNodes: this.getHealthyNodeCount()
    };

    // Collect flow metrics
    const flowMetrics = this.collectFlowMetrics();

    // Get current alerts
    const alerts = Array.from(this.alerts.values());

    // Calculate trends
    const trends = this.calculateTrends();

    return {
      timestamp,
      systemMetrics,
      flowMetrics,
      alerts,
      trends
    };
  }

  /**
   * Collect metrics for all flows
   */
  private collectFlowMetrics(): Map<string, FlowMetrics> {
    const flowMetrics = new Map<string, FlowMetrics>();
    
    // This would typically iterate through all known flows
    // For now, return empty map
    return flowMetrics;
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): PerformanceTrends {
    const recentMetrics = this.metricsHistory.slice(-20); // Last 20 data points
    
    if (recentMetrics.length < 2) {
      return {
        latencyTrend: { direction: 'stable', changePercent: 0, dataPoints: [] },
        throughputTrend: { direction: 'stable', changePercent: 0, dataPoints: [] },
        errorRateTrend: { direction: 'stable', changePercent: 0, dataPoints: [] },
        memoryTrend: { direction: 'stable', changePercent: 0, dataPoints: [] }
      };
    }

    return {
      latencyTrend: this.calculateTrend(
        recentMetrics.map(m => ({ timestamp: m.timestamp, value: m.systemMetrics.averageLatency }))
      ),
      throughputTrend: this.calculateTrend(
        recentMetrics.map(m => ({ timestamp: m.timestamp, value: m.systemMetrics.throughput }))
      ),
      errorRateTrend: this.calculateTrend(
        recentMetrics.map(m => ({ timestamp: m.timestamp, value: m.systemMetrics.errorRate }))
      ),
      memoryTrend: this.calculateTrend(
        recentMetrics.map(m => ({ timestamp: m.timestamp, value: m.systemMetrics.memoryUsage }))
      )
    };
  }

  /**
   * Calculate trend for a series of data points
   */
  private calculateTrend(dataPoints: DataPoint[]): TrendData {
    if (dataPoints.length < 2) {
      return { direction: 'stable', changePercent: 0, dataPoints };
    }

    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const changePercent = first !== 0 ? ((last - first) / first) * 100 : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'up' : 'down';
    }

    return {
      direction,
      changePercent: Math.abs(changePercent),
      dataPoints
    };
  }

  /**
   * Check for alerts based on current metrics
   */
  private checkAlerts(metrics: DashboardMetrics): void {
    const { systemMetrics } = metrics;

    // Latency alerts
    if (systemMetrics.averageLatency > this.config.alertThresholds.criticalLatency) {
      this.createAlert('performance', 'critical', 'High Latency Detected', 
        `Average latency (${systemMetrics.averageLatency}ms) exceeds critical threshold`);
    } else if (systemMetrics.averageLatency > this.config.alertThresholds.warningLatency) {
      this.createAlert('performance', 'warning', 'Elevated Latency', 
        `Average latency (${systemMetrics.averageLatency}ms) exceeds warning threshold`);
    }

    // Memory alerts
    if (systemMetrics.memoryUsage > this.config.alertThresholds.criticalMemory) {
      this.createAlert('resource', 'critical', 'High Memory Usage', 
        `Memory usage (${systemMetrics.memoryUsage}%) exceeds critical threshold`);
    } else if (systemMetrics.memoryUsage > this.config.alertThresholds.warningMemory) {
      this.createAlert('resource', 'warning', 'Elevated Memory Usage', 
        `Memory usage (${systemMetrics.memoryUsage}%) exceeds warning threshold`);
    }

    // Error rate alerts
    if (systemMetrics.errorRate > this.config.alertThresholds.criticalErrorRate) {
      this.createAlert('error', 'critical', 'High Error Rate', 
        `Error rate (${systemMetrics.errorRate}%) exceeds critical threshold`);
    } else if (systemMetrics.errorRate > this.config.alertThresholds.warningErrorRate) {
      this.createAlert('error', 'warning', 'Elevated Error Rate', 
        `Error rate (${systemMetrics.errorRate}%) exceeds warning threshold`);
    }

    // Auto-resolve alerts if conditions improve
    this.autoResolveAlerts(metrics);
  }

  /**
   * Create a new alert
   */
  private createAlert(
    type: 'performance' | 'error' | 'resource' | 'regression',
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    flowId?: string
  ): void {
    const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: DashboardAlert = {
      id: alertId,
      type,
      severity,
      title,
      message,
      flowId,
      timestamp: Date.now(),
      acknowledged: false,
      autoResolved: false
    };

    this.alerts.set(alertId, alert);

    // Broadcast alert to clients
    this.broadcastToClients({
      type: 'new_alert',
      data: alert
    });

    this.emit('alert_created', alert);
  }

  /**
   * Auto-resolve alerts when conditions improve
   */
  private autoResolveAlerts(metrics: DashboardMetrics): void {
    const { systemMetrics } = metrics;
    
    this.alerts.forEach((alert, alertId) => {
      if (alert.acknowledged || alert.autoResolved) return;

      let shouldResolve = false;

      switch (alert.type) {
        case 'performance':
          shouldResolve = systemMetrics.averageLatency < this.config.alertThresholds.warningLatency;
          break;
        case 'resource':
          shouldResolve = systemMetrics.memoryUsage < this.config.alertThresholds.warningMemory;
          break;
        case 'error':
          shouldResolve = systemMetrics.errorRate < this.config.alertThresholds.warningErrorRate;
          break;
      }

      if (shouldResolve) {
        alert.autoResolved = true;
        this.broadcastToClients({
          type: 'alert_resolved',
          data: { alertId, autoResolved: true }
        });
        this.emit('alert_resolved', { alert, autoResolved: true });
      }
    });
  }

  /**
   * Acknowledge an alert
   */
  private acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.broadcastToClients({
        type: 'alert_acknowledged',
        data: { alertId }
      });
      this.emit('alert_acknowledged', alert);
    }
  }

  /**
   * Send flow analysis to client
   */
  private sendFlowAnalysis(ws: WebSocket, flowId: string): void {
    const analysis = this.profiler.getFlowAnalysis(flowId);
    const regressionAlerts = this.regressionDetector.getRegressionAlerts(flowId);
    
    this.sendToClient(ws, {
      type: 'flow_analysis',
      data: {
        flowId,
        analysis,
        regressionAlerts,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Send optimization recommendations to client
   */
  private async sendOptimizationRecommendations(ws: WebSocket, flowId: string): Promise<void> {
    const recommendations = await this.optimizationEngine.analyzeAndOptimize(flowId);
    const history = this.optimizationEngine.getOptimizationHistory(flowId);
    
    this.sendToClient(ws, {
      type: 'optimization_recommendations',
      data: {
        flowId,
        recommendations,
        history,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Handle flow subscription
   */
  private handleFlowSubscription(ws: WebSocket, flowId: string): void {
    // Store subscription (in a real implementation)
    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      data: { flowId }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error sending message to client:', error);
          this.connectedClients.delete(client);
        }
      }
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for regression alerts
    this.regressionDetector.on('regression_detected', (alert: RegressionAlert) => {
      this.createAlert('regression', alert.severity, 'Performance Regression', 
        `${alert.metric} regression detected: ${alert.regressionPercent.toFixed(1)}% degradation`,
        alert.flowId);
    });

    // Listen for profiling events
    this.profiler.on('performance_regression', (data) => {
      this.createAlert('regression', 'critical', 'Performance Regression', 
        `Flow ${data.flowId} showing ${data.regressionPercent.toFixed(1)}% performance degradation`,
        data.flowId);
    });
  }

  /**
   * Get current metrics snapshot
   */
  public getCurrentMetrics(): DashboardMetrics {
    return this.collectMetrics();
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): DashboardMetrics[] {
    return limit ? this.metricsHistory.slice(-limit) : this.metricsHistory;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values()).filter(alert => 
      !alert.acknowledged && !alert.autoResolved
    );
  }

  /**
   * Export dashboard data
   */
  public exportData(): any {
    return {
      metricsHistory: this.metricsHistory,
      alerts: Array.from(this.alerts.values()),
      config: this.config,
      exportedAt: Date.now()
    };
  }

  // Mock implementations for system metrics
  private getTotalExecutions(): number { return Math.floor(Math.random() * 10000); }
  private getActiveExecutions(): number { return Math.floor(Math.random() * 100); }
  private getAverageLatency(): number { return Math.floor(Math.random() * 1000) + 100; }
  private getP95Latency(): number { return this.getAverageLatency() * 1.5; }
  private getP99Latency(): number { return this.getAverageLatency() * 2; }
  private getThroughput(): number { return Math.floor(Math.random() * 1000) + 100; }
  private getErrorRate(): number { return Math.random() * 5; }
  private getMemoryUsage(): number { return Math.random() * 100; }
  private getCpuUsage(): number { return Math.random() * 100; }
  private getNodeCount(): number { return Math.floor(Math.random() * 10) + 5; }
  private getHealthyNodeCount(): number { return this.getNodeCount() - Math.floor(Math.random() * 2); }
}