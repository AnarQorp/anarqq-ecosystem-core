/**
 * Validation Dashboard Service
 * 
 * Provides real-time health dashboards and SLO monitoring for the ecosystem integrity validation system.
 * Generates interactive dashboards with metrics visualization and alerting status.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ValidationDashboardService {
  constructor(monitoringService) {
    this.monitoringService = monitoringService;
    this.dashboardDir = './artifacts/dashboard';
    this.ensureDashboardDir();
  }
  
  ensureDashboardDir() {
    mkdirSync(this.dashboardDir, { recursive: true });
  }
  
  async generateHealthDashboard() {
    const dashboardData = await this.monitoringService.getDashboardData();
    
    const html = this.generateHealthDashboardHTML(dashboardData);
    const dashboardPath = join(this.dashboardDir, 'health-dashboard.html');
    
    writeFileSync(dashboardPath, html);
    
    console.log(`📊 Health dashboard generated: ${dashboardPath}`);
    return dashboardPath;
  }
  
  generateHealthDashboardHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnarQ&Q Ecosystem Health Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #2d3748;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #e2e8f0;
        }
        
        .status-card.healthy {
            border-left-color: #48bb78;
        }
        
        .status-card.degraded {
            border-left-color: #ed8936;
        }
        
        .status-card.unhealthy {
            border-left-color: #f56565;
        }
        
        .status-card h3 {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .status-indicator.healthy {
            background: #48bb78;
        }
        
        .status-indicator.degraded {
            background: #ed8936;
        }
        
        .status-indicator.unhealthy {
            background: #f56565;
        }
        
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .metric-row:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .metric-value {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        
        .metric-value.good {
            color: #48bb78;
        }
        
        .metric-value.warning {
            color: #ed8936;
        }
        
        .metric-value.critical {
            color: #f56565;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .chart-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .chart-card h3 {
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
        }
        
        .alerts-section {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }
        
        .alerts-section h3 {
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }
        
        .alert-item {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            border-left: 4px solid #e2e8f0;
        }
        
        .alert-item.critical {
            background: #fed7d7;
            border-left-color: #f56565;
        }
        
        .alert-item.warning {
            background: #feebc8;
            border-left-color: #ed8936;
        }
        
        .alert-item.info {
            background: #bee3f8;
            border-left-color: #4299e1;
        }
        
        .alert-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .alert-title {
            font-weight: 600;
        }
        
        .alert-time {
            font-size: 0.8rem;
            opacity: 0.7;
        }
        
        .slo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .slo-card {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .slo-title {
            font-size: 0.9rem;
            color: #718096;
            margin-bottom: 0.5rem;
        }
        
        .slo-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
        }
        
        .slo-target {
            font-size: 0.8rem;
            color: #a0aec0;
        }
        
        .refresh-info {
            text-align: center;
            color: #718096;
            font-size: 0.9rem;
            margin-top: 2rem;
        }
        
        .auto-refresh {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #edf2f7;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            margin-top: 1rem;
        }
        
        .refresh-dot {
            width: 8px;
            height: 8px;
            background: #48bb78;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 AnarQ&Q Ecosystem Health Dashboard</h1>
        <p>Real-time monitoring and SLO tracking for ecosystem integrity validation</p>
    </div>
    
    <div class="container">
        <!-- Overall Status -->
        <div class="status-grid">
            <div class="status-card ${data.health.overall}">
                <h3>
                    <span class="status-indicator ${data.health.overall}"></span>
                    Overall System Health
                </h3>
                <div class="metric-row">
                    <span class="metric-label">Status</span>
                    <span class="metric-value ${this.getStatusClass(data.health.overall)}">${data.health.overall.toUpperCase()}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Last Update</span>
                    <span class="metric-value">${this.formatTime(data.health.lastUpdate)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Active Alerts</span>
                    <span class="metric-value ${data.summary.activeAlerts > 0 ? 'warning' : 'good'}">${data.summary.activeAlerts}</span>
                </div>
            </div>
            
            ${this.generateModuleStatusCards(data.health.modules)}
        </div>
        
        <!-- SLO Compliance -->
        <div class="alerts-section">
            <h3>📊 SLO Compliance</h3>
            <div class="slo-grid">
                ${this.generateSLOCards(data.sloCompliance)}
            </div>
        </div>
        
        <!-- Performance Charts -->
        <div class="charts-grid">
            <div class="chart-card">
                <h3>📈 Performance Metrics</h3>
                <div class="chart-container">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>🔒 Quality Metrics</h3>
                <div class="chart-container">
                    <canvas id="qualityChart"></canvas>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>🛡️ Security Metrics</h3>
                <div class="chart-container">
                    <canvas id="securityChart"></canvas>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>⚡ Availability Metrics</h3>
                <div class="chart-container">
                    <canvas id="availabilityChart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Recent Alerts -->
        <div class="alerts-section">
            <h3>🚨 Recent Alerts</h3>
            ${this.generateAlertsSection(data.alerts)}
        </div>
        
        <div class="refresh-info">
            <div class="auto-refresh">
                <span class="refresh-dot"></span>
                Auto-refreshing every 30 seconds
            </div>
            <p>Last updated: ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
    </div>
    
    <script>
        // Chart data
        const metricsData = ${JSON.stringify(data.metrics)};
        
        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: metricsData.map(m => new Date(m.timestamp).toLocaleTimeString()),
                datasets: [
                    {
                        label: 'P95 Latency (ms)',
                        data: metricsData.map(m => m.performance?.p95Latency || 0),
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'P99 Latency (ms)',
                        data: metricsData.map(m => m.performance?.p99Latency || 0),
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (ms)'
                        }
                    }
                }
            }
        });
        
        // Quality Chart
        const qualityCtx = document.getElementById('qualityChart').getContext('2d');
        new Chart(qualityCtx, {
            type: 'line',
            data: {
                labels: metricsData.map(m => new Date(m.timestamp).toLocaleTimeString()),
                datasets: [
                    {
                        label: 'Chain Continuity (%)',
                        data: metricsData.map(m => m.quality?.chainContinuity || 0),
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Consensus Success (%)',
                        data: metricsData.map(m => m.quality?.consensusSuccess || 0),
                        borderColor: '#9f7aea',
                        backgroundColor: 'rgba(159, 122, 234, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    }
                }
            }
        });
        
        // Security Chart
        const securityCtx = document.getElementById('securityChart').getContext('2d');
        new Chart(securityCtx, {
            type: 'bar',
            data: {
                labels: ['PII Detected', 'Sandbox Violations', 'Unauthorized Access'],
                datasets: [{
                    label: 'Security Incidents',
                    data: [
                        metricsData[metricsData.length - 1]?.security?.piiDetected || 0,
                        metricsData[metricsData.length - 1]?.security?.sandboxViolations || 0,
                        metricsData[metricsData.length - 1]?.security?.unauthorizedAccess || 0
                    ],
                    backgroundColor: ['#f56565', '#ed8936', '#ecc94b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Incident Count'
                        }
                    }
                }
            }
        });
        
        // Availability Chart
        const availabilityCtx = document.getElementById('availabilityChart').getContext('2d');
        new Chart(availabilityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Uptime', 'Downtime'],
                datasets: [{
                    data: [
                        metricsData[metricsData.length - 1]?.availability?.uptime || 99.9,
                        100 - (metricsData[metricsData.length - 1]?.availability?.uptime || 99.9)
                    ],
                    backgroundColor: ['#48bb78', '#f56565']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Auto-refresh
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>`;
  }
  
  generateModuleStatusCards(modules) {
    return Object.entries(modules).map(([moduleName, moduleData]) => `
      <div class="status-card ${moduleData.status}">
          <h3>
              <span class="status-indicator ${moduleData.status}"></span>
              ${this.formatModuleName(moduleName)}
          </h3>
          <div class="metric-row">
              <span class="metric-label">Status</span>
              <span class="metric-value ${this.getStatusClass(moduleData.status)}">${moduleData.status.toUpperCase()}</span>
          </div>
          <div class="metric-row">
              <span class="metric-label">Last Check</span>
              <span class="metric-value">${this.formatTime(moduleData.lastCheck)}</span>
          </div>
          ${moduleData.error ? `
          <div class="metric-row">
              <span class="metric-label">Error</span>
              <span class="metric-value critical">${moduleData.error}</span>
          </div>
          ` : ''}
          ${moduleData.details ? this.generateModuleDetails(moduleData.details) : ''}
      </div>
    `).join('');
  }
  
  generateModuleDetails(details) {
    return Object.entries(details).map(([key, value]) => `
      <div class="metric-row">
          <span class="metric-label">${this.formatLabel(key)}</span>
          <span class="metric-value">${this.formatValue(value)}</span>
      </div>
    `).join('');
  }
  
  generateSLOCards(sloCompliance) {
    const slos = [
      { key: 'performance.p95Latency', title: 'P95 Latency', target: '< 150ms' },
      { key: 'performance.p99Latency', title: 'P99 Latency', target: '< 200ms' },
      { key: 'performance.errorRate', title: 'Error Rate', target: '< 10%' },
      { key: 'performance.cacheHitRate', title: 'Cache Hit Rate', target: '≥ 85%' },
      { key: 'quality.chainContinuity', title: 'Chain Continuity', target: '100%' },
      { key: 'quality.consensusSuccess', title: 'Consensus Success', target: '≥ 60%' }
    ];
    
    return slos.map(slo => {
      const compliance = this.getNestedValue(sloCompliance, slo.key);
      const complianceValue = compliance?.compliance || 0;
      const statusClass = complianceValue >= 95 ? 'good' : complianceValue >= 80 ? 'warning' : 'critical';
      
      return `
        <div class="slo-card">
            <div class="slo-title">${slo.title}</div>
            <div class="slo-value ${statusClass}">${complianceValue.toFixed(1)}%</div>
            <div class="slo-target">Target: ${slo.target}</div>
        </div>
      `;
    }).join('');
  }
  
  generateAlertsSection(alerts) {
    if (!alerts || alerts.length === 0) {
      return '<p style="text-align: center; color: #718096; padding: 2rem;">No recent alerts</p>';
    }
    
    return alerts.slice(0, 10).map(alert => `
      <div class="alert-item ${alert.severity}">
          <div class="alert-header">
              <span class="alert-title">${alert.message}</span>
              <span class="alert-time">${this.formatTime(alert.timestamp)}</span>
          </div>
          ${alert.details ? `<div style="font-size: 0.9rem; opacity: 0.8;">${JSON.stringify(alert.details, null, 2)}</div>` : ''}
      </div>
    `).join('');
  }
  
  formatModuleName(name) {
    return name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
  }
  
  formatValue(value) {
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }
  
  formatTime(timestamp) {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }
  
  getStatusClass(status) {
    const statusMap = {
      'healthy': 'good',
      'degraded': 'warning',
      'unhealthy': 'critical'
    };
    return statusMap[status] || 'good';
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  async generateMetricsReport() {
    const dashboardData = await this.monitoringService.getDashboardData();
    const metricsHistory = await this.monitoringService.getMetricsHistory('24h');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: dashboardData.summary,
      sloCompliance: dashboardData.sloCompliance,
      performanceTrends: this.analyzePerformanceTrends(metricsHistory),
      recommendations: this.generateRecommendations(dashboardData, metricsHistory)
    };
    
    const reportPath = join(this.dashboardDir, `metrics-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Metrics report generated: ${reportPath}`);
    return report;
  }
  
  analyzePerformanceTrends(metricsHistory) {
    if (metricsHistory.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = metricsHistory.slice(-10); // Last 10 data points
    const older = metricsHistory.slice(-20, -10); // Previous 10 data points
    
    const recentAvg = this.calculateAverageMetrics(recent);
    const olderAvg = this.calculateAverageMetrics(older);
    
    return {
      trend: this.compareTrends(recentAvg, olderAvg),
      recentAverage: recentAvg,
      previousAverage: olderAvg,
      improvement: this.calculateImprovement(recentAvg, olderAvg)
    };
  }
  
  calculateAverageMetrics(metrics) {
    const totals = metrics.reduce((acc, metric) => {
      if (metric.performance) {
        acc.p95Latency += metric.performance.p95Latency || 0;
        acc.p99Latency += metric.performance.p99Latency || 0;
        acc.errorRate += metric.performance.errorRate || 0;
        acc.cacheHitRate += metric.performance.cacheHitRate || 0;
      }
      return acc;
    }, { p95Latency: 0, p99Latency: 0, errorRate: 0, cacheHitRate: 0 });
    
    const count = metrics.length;
    return {
      p95Latency: totals.p95Latency / count,
      p99Latency: totals.p99Latency / count,
      errorRate: totals.errorRate / count,
      cacheHitRate: totals.cacheHitRate / count
    };
  }
  
  compareTrends(recent, older) {
    const latencyTrend = recent.p99Latency < older.p99Latency ? 'improving' : 'degrading';
    const errorTrend = recent.errorRate < older.errorRate ? 'improving' : 'degrading';
    const cacheTrend = recent.cacheHitRate > older.cacheHitRate ? 'improving' : 'degrading';
    
    const improvements = [latencyTrend, errorTrend, cacheTrend].filter(t => t === 'improving').length;
    
    if (improvements >= 2) return 'improving';
    if (improvements === 1) return 'stable';
    return 'degrading';
  }
  
  calculateImprovement(recent, older) {
    return {
      latency: ((older.p99Latency - recent.p99Latency) / older.p99Latency * 100).toFixed(1),
      errorRate: ((older.errorRate - recent.errorRate) / older.errorRate * 100).toFixed(1),
      cacheHitRate: ((recent.cacheHitRate - older.cacheHitRate) / older.cacheHitRate * 100).toFixed(1)
    };
  }
  
  generateRecommendations(dashboardData, metricsHistory) {
    const recommendations = [];
    
    // Performance recommendations
    if (dashboardData.summary.overallHealth !== 'healthy') {
      recommendations.push({
        type: 'health',
        priority: 'high',
        message: 'System health is degraded. Review module status and resolve issues.',
        action: 'Check individual module health and error logs'
      });
    }
    
    // SLO recommendations
    const sloCompliance = dashboardData.sloCompliance;
    if (sloCompliance.performance?.p99Latency?.compliance < 90) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'P99 latency SLO compliance is below 90%. Consider performance optimization.',
        action: 'Review slow queries and optimize critical paths'
      });
    }
    
    if (sloCompliance.performance?.errorRate?.compliance < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Error rate SLO compliance is below 95%. Investigate error sources.',
        action: 'Review error logs and implement error handling improvements'
      });
    }
    
    // Alert recommendations
    if (dashboardData.summary.activeAlerts > 5) {
      recommendations.push({
        type: 'alerting',
        priority: 'medium',
        message: 'High number of active alerts. Review alert fatigue and thresholds.',
        action: 'Consolidate related alerts and adjust thresholds'
      });
    }
    
    return recommendations;
  }
}

export default ValidationDashboardService;