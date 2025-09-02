#!/usr/bin/env node

/**
 * Documentation Monitoring Dashboard Generator
 * Creates an HTML dashboard for documentation health monitoring
 * Requirements: 8.1, 8.2, 8.3
 */

import fs from 'fs/promises';
import path from 'path';
import DocumentationKPITracker from './docs-kpi-tracker.mjs';

class DocumentationMonitoringDashboard {
  constructor() {
    this.kpiTracker = new DocumentationKPITracker();
  }

  /**
   * Generate HTML monitoring dashboard
   */
  async generateDashboard() {
    console.log('📊 Generating documentation monitoring dashboard...');
    
    // Track all KPIs
    const kpis = await this.kpiTracker.trackAllKPIs();
    
    // Generate dashboard HTML
    const dashboardHTML = this.createDashboardHTML(kpis);
    
    // Save dashboard
    await fs.writeFile('docs/monitoring-dashboard.html', dashboardHTML);
    
    console.log('✅ Dashboard generated at docs/monitoring-dashboard.html');
    
    return kpis;
  }

  /**
   * Create HTML dashboard content
   */
  createDashboardHTML(kpis) {
    const timestamp = new Date().toLocaleString();
    const healthStatus = this.kpiTracker.getHealthStatus(kpis.documentationHealth.overallScore);
    const healthColor = this.getHealthColor(kpis.documentationHealth.overallScore);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Health Monitoring Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .header .timestamp {
            color: #7f8c8d;
            font-size: 1.1em;
        }
        
        .overall-health {
            background: ${healthColor};
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .overall-health h2 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .overall-health .score {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .kpi-card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
        }
        
        .metric-label {
            color: #7f8c8d;
            font-weight: 500;
        }
        
        .metric-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .excellent { background: #27ae60; }
        .good { background: #f39c12; }
        .fair { background: #e67e22; }
        .poor { background: #e74c3c; }
        .critical { background: #c0392b; }
        
        .alerts-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
        }
        
        .alert.error {
            background: #fdf2f2;
            border-color: #e74c3c;
            color: #c0392b;
        }
        
        .alert.warning {
            background: #fef9e7;
            border-color: #f39c12;
            color: #d68910;
        }
        
        .alert.info {
            background: #ebf3fd;
            border-color: #3498db;
            color: #2980b9;
        }
        
        .no-alerts {
            text-align: center;
            color: #27ae60;
            font-size: 1.2em;
            padding: 20px;
        }
        
        .footer {
            text-align: center;
            color: #7f8c8d;
            margin-top: 30px;
            padding: 20px;
        }
        
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            margin-top: 20px;
            transition: background 0.3s ease;
        }
        
        .refresh-btn:hover {
            background: #2980b9;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .kpi-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .overall-health .score {
                font-size: 2.5em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Documentation Health Dashboard</h1>
            <div class="timestamp">Last updated: ${timestamp}</div>
        </div>
        
        <div class="overall-health">
            <h2>Overall Health Status</h2>
            <div class="score">${kpis.documentationHealth.overallScore}%</div>
            <div>${healthStatus}</div>
        </div>
        
        <div class="kpi-grid">
            <div class="kpi-card">
                <h3>📋 Documentation Completeness</h3>
                <div class="metric">
                    <span class="metric-label">Completeness Score</span>
                    <span class="metric-value">${kpis.documentationHealth.completeness}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getProgressClass(kpis.documentationHealth.completeness)}" 
                         style="width: ${kpis.documentationHealth.completeness}%"></div>
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>🔗 Link Health</h3>
                <div class="metric">
                    <span class="metric-label">Health Score</span>
                    <span class="metric-value">${kpis.linkHealth.healthScore}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Links</span>
                    <span class="metric-value">${kpis.linkHealth.totalLinks}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Broken Links</span>
                    <span class="metric-value">${kpis.linkHealth.brokenLinks}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getProgressClass(kpis.linkHealth.healthScore)}" 
                         style="width: ${kpis.linkHealth.healthScore}%"></div>
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>📊 Content Coverage</h3>
                <div class="metric">
                    <span class="metric-label">Coverage Score</span>
                    <span class="metric-value">${kpis.contentCoverage.coverageScore}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Complete Modules</span>
                    <span class="metric-value">${kpis.contentCoverage.completeModules}/${kpis.contentCoverage.totalModules}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">OpenAPI Coverage</span>
                    <span class="metric-value">${kpis.contentCoverage.openApiCoverage}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">MCP Coverage</span>
                    <span class="metric-value">${kpis.contentCoverage.mcpCoverage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getProgressClass(kpis.contentCoverage.coverageScore)}" 
                         style="width: ${kpis.contentCoverage.coverageScore}%"></div>
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>🕐 Version Freshness</h3>
                <div class="metric">
                    <span class="metric-label">Current Version</span>
                    <span class="metric-value">${kpis.versionFreshness.currentVersionPercentage}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Outdated Docs</span>
                    <span class="metric-value">${kpis.versionFreshness.outdatedDocs}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Age</span>
                    <span class="metric-value">${kpis.versionFreshness.averageDocumentAge} days</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getProgressClass(kpis.versionFreshness.currentVersionPercentage)}" 
                         style="width: ${kpis.versionFreshness.currentVersionPercentage}%"></div>
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>🌐 Bilingual Parity</h3>
                <div class="metric">
                    <span class="metric-label">Parity Score</span>
                    <span class="metric-value">${kpis.bilingualParity.parityScore}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Bilingual Content</span>
                    <span class="metric-value">${kpis.bilingualParity.bilingualContent}/${kpis.bilingualParity.totalContent}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getProgressClass(kpis.bilingualParity.parityScore)}" 
                         style="width: ${kpis.bilingualParity.parityScore}%"></div>
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>📝 Review Backlog</h3>
                <div class="metric">
                    <span class="metric-label">Pending Reviews</span>
                    <span class="metric-value">${kpis.reviewBacklog.pendingReviews}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Overdue Reviews</span>
                    <span class="metric-value">${kpis.reviewBacklog.overdueReviews}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Review Time</span>
                    <span class="metric-value">${kpis.reviewBacklog.averageReviewTime} days</span>
                </div>
            </div>
        </div>
        
        <div class="alerts-section">
            <h3>🚨 Active Alerts</h3>
            ${this.generateAlertsHTML(this.kpiTracker.generateAlerts())}
        </div>
        
        <div class="footer">
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Dashboard</button>
            <p>This dashboard is automatically updated by the Documentation Monitoring System</p>
            <p>For detailed reports, check <a href="kpi-report.md">kpi-report.md</a> and <a href="monitoring-report.json">monitoring-report.json</a></p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => {
            window.location.reload();
        }, 300000);
        
        // Add click handlers for progress bars
        document.querySelectorAll('.kpi-card').forEach(card => {
            card.addEventListener('click', () => {
                card.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    card.style.transform = 'scale(1)';
                }, 200);
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate alerts HTML
   */
  generateAlertsHTML(alerts) {
    if (alerts.length === 0) {
      return '<div class="no-alerts">✅ No active alerts - Documentation health is good!</div>';
    }
    
    return alerts.map(alert => `
      <div class="alert ${alert.level}">
        <strong>${alert.type.replace('_', ' ').toUpperCase()}:</strong> ${alert.message}
      </div>
    `).join('');
  }

  /**
   * Get health color based on score
   */
  getHealthColor(score) {
    if (score >= 90) return '#27ae60';
    if (score >= 80) return '#f39c12';
    if (score >= 70) return '#e67e22';
    if (score >= 60) return '#e74c3c';
    return '#c0392b';
  }

  /**
   * Get progress bar class based on score
   */
  getProgressClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }
}

// CLI interface
async function main() {
  const dashboard = new DocumentationMonitoringDashboard();
  const command = process.argv[2];

  switch (command) {
    case 'generate':
      await dashboard.generateDashboard();
      break;
    
    default:
      console.log(`
Usage: node docs-monitoring-dashboard.mjs <command>

Commands:
  generate  - Generate HTML monitoring dashboard

Examples:
  node docs-monitoring-dashboard.mjs generate
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Dashboard generation failed:', error);
    process.exit(1);
  });
}

export default DocumentationMonitoringDashboard;