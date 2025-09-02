#!/usr/bin/env node

/**
 * Documentation Monitoring Automation Integration
 * Integrates enhanced monitoring with existing automation infrastructure
 * 
 * Task 9 Implementation: Integration with existing automation infrastructure
 * Requirements: 8.1, 8.2, 8.3
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import EnhancedDocumentationMonitoringSystem from './docs-monitoring-system-enhanced.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationMonitoringAutomationIntegration {
  constructor() {
    this.monitoringSystem = new EnhancedDocumentationMonitoringSystem();
    
    this.integrationConfig = {
      scheduledReporting: {
        enabled: true,
        frequency: 'daily', // daily, weekly, monthly
        time: '09:00', // 24-hour format
        timezone: 'UTC'
      },
      alerting: {
        enabled: true,
        channels: {
          console: true,
          file: true,
          github: false, // Create GitHub issues for critical alerts
          slack: false,  // Slack notifications (requires webhook)
          email: false   // Email notifications (requires SMTP config)
        },
        thresholds: {
          critical: 60,
          warning: 80,
          info: 90
        }
      },
      reporting: {
        formats: ['json', 'markdown', 'html'],
        retention: {
          daily: 30,   // Keep 30 daily reports
          weekly: 12,  // Keep 12 weekly reports
          monthly: 12  // Keep 12 monthly reports
        }
      },
      cicd: {
        enabled: true,
        failOnCritical: true,
        failOnWarning: false,
        generateArtifacts: true
      }
    };
  }

  /**
   * Run automated monitoring with full integration
   */
  async runAutomatedMonitoring() {
    console.log('🤖 Running automated documentation monitoring with full integration...');
    
    try {
      // Run enhanced monitoring
      const results = await this.monitoringSystem.runHealthMonitoring();
      
      // Process alerts
      await this.processAlerts(results.alerts);
      
      // Generate automated reports
      await this.generateAutomatedReports(results);
      
      // Update CI/CD status
      await this.updateCICDStatus(results);
      
      // Clean up old reports
      await this.cleanupOldReports();
      
      // Generate integration summary
      await this.generateIntegrationSummary(results);
      
      console.log('✅ Automated monitoring completed successfully');
      
      return results;
      
    } catch (error) {
      console.error('❌ Automated monitoring failed:', error);
      
      // Generate failure report
      await this.generateFailureReport(error);
      
      throw error;
    }
  }

  /**
   * Process alerts through configured channels
   */
  async processAlerts(alerts) {
    console.log('🚨 Processing alerts through configured channels...');
    
    if (!this.integrationConfig.alerting.enabled || alerts.length === 0) {
      console.log('  ℹ️ No alerts to process or alerting disabled');
      return;
    }
    
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const warningAlerts = alerts.filter(a => a.level === 'warning');
    const infoAlerts = alerts.filter(a => a.level === 'info');
    
    // Console alerts
    if (this.integrationConfig.alerting.channels.console) {
      console.log(`  📢 Console alerts: ${criticalAlerts.length} critical, ${warningAlerts.length} warning, ${infoAlerts.length} info`);
    }
    
    // File alerts
    if (this.integrationConfig.alerting.channels.file) {
      await this.writeAlertsToFile(alerts);
    }
    
    // GitHub issues for critical alerts
    if (this.integrationConfig.alerting.channels.github && criticalAlerts.length > 0) {
      await this.createGitHubIssues(criticalAlerts);
    }
    
    // Slack notifications (placeholder)
    if (this.integrationConfig.alerting.channels.slack) {
      await this.sendSlackNotifications(alerts);
    }
    
    // Email notifications (placeholder)
    if (this.integrationConfig.alerting.channels.email) {
      await this.sendEmailNotifications(alerts);
    }
  }

  /**
   * Write alerts to file for CI/CD consumption
   */
  async writeAlertsToFile(alerts) {
    const alertsFile = {
      timestamp: new Date().toISOString(),
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length
      },
      alerts: alerts.map(alert => ({
        level: alert.level,
        type: alert.type,
        message: alert.message,
        metric: alert.metric,
        threshold: alert.threshold,
        actionRequired: alert.actionRequired || false
      }))
    };
    
    await fs.writeFile('docs/monitoring-alerts.json', JSON.stringify(alertsFile, null, 2));
    console.log('  📄 Alerts written to docs/monitoring-alerts.json');
  }

  /**
   * Create GitHub issues for critical alerts (placeholder)
   */
  async createGitHubIssues(criticalAlerts) {
    console.log('  🐙 GitHub issue creation (placeholder implementation)');
    
    // In a real implementation, this would use GitHub API
    const issueTemplate = {
      title: 'Documentation Health Critical Alert',
      body: `## Critical Documentation Health Alert

**Timestamp:** ${new Date().toISOString()}

### Critical Issues Detected

${criticalAlerts.map(alert => `
- **${alert.type}:** ${alert.message}
  - Current: ${alert.metric}
  - Threshold: ${alert.threshold}
  - Action Required: ${alert.actionRequired ? 'Yes' : 'No'}
`).join('\n')}

### Recommended Actions

Please review the documentation monitoring report and address these critical issues immediately.

**Generated by:** Documentation Monitoring Automation System
`,
      labels: ['documentation', 'critical', 'automated']
    };
    
    // Save issue template for manual creation or CI/CD processing
    await fs.writeFile('docs/github-issue-template.json', JSON.stringify(issueTemplate, null, 2));
    console.log('    📝 GitHub issue template saved to docs/github-issue-template.json');
  }

  /**
   * Send Slack notifications (placeholder)
   */
  async sendSlackNotifications(alerts) {
    console.log('  💬 Slack notifications (placeholder implementation)');
    
    // In a real implementation, this would use Slack webhook
    const slackMessage = {
      text: `Documentation Health Alert: ${alerts.length} issues detected`,
      attachments: alerts.map(alert => ({
        color: alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'good',
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Level', value: alert.level, short: true },
          { title: 'Message', value: alert.message, short: false }
        ]
      }))
    };
    
    await fs.writeFile('docs/slack-message.json', JSON.stringify(slackMessage, null, 2));
    console.log('    💬 Slack message template saved to docs/slack-message.json');
  }

  /**
   * Send email notifications (placeholder)
   */
  async sendEmailNotifications(alerts) {
    console.log('  📧 Email notifications (placeholder implementation)');
    
    const emailTemplate = {
      subject: `Documentation Health Alert - ${alerts.length} issues detected`,
      body: `
Documentation Health Monitoring Alert

Timestamp: ${new Date().toISOString()}

Summary:
- Critical: ${alerts.filter(a => a.level === 'critical').length}
- Warning: ${alerts.filter(a => a.level === 'warning').length}
- Info: ${alerts.filter(a => a.level === 'info').length}

Details:
${alerts.map(alert => `
${alert.level.toUpperCase()}: ${alert.message}
`).join('\n')}

Please review the full monitoring report for detailed information and recommendations.

This is an automated message from the Documentation Monitoring System.
`
    };
    
    await fs.writeFile('docs/email-template.txt', emailTemplate.body);
    console.log('    📧 Email template saved to docs/email-template.txt');
  }

  /**
   * Generate automated reports in multiple formats
   */
  async generateAutomatedReports(results) {
    console.log('📊 Generating automated reports...');
    
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const reportDir = `docs/reports/${timestamp}`;
    
    // Create reports directory
    await fs.mkdir(reportDir, { recursive: true });
    
    // Generate JSON report
    if (this.integrationConfig.reporting.formats.includes('json')) {
      await fs.writeFile(
        path.join(reportDir, 'monitoring-report.json'),
        JSON.stringify(results, null, 2)
      );
    }
    
    // Generate Markdown report
    if (this.integrationConfig.reporting.formats.includes('markdown')) {
      const markdownReport = await this.generateMarkdownReport(results);
      await fs.writeFile(
        path.join(reportDir, 'monitoring-report.md'),
        markdownReport
      );
    }
    
    // Generate HTML report
    if (this.integrationConfig.reporting.formats.includes('html')) {
      const htmlReport = await this.generateHTMLReport(results);
      await fs.writeFile(
        path.join(reportDir, 'monitoring-report.html'),
        htmlReport
      );
    }
    
    // Create latest symlink
    try {
      await fs.unlink('docs/reports/latest');
    } catch {
      // Symlink doesn't exist
    }
    
    await fs.symlink(timestamp, 'docs/reports/latest');
    
    console.log(`  📊 Reports generated in ${reportDir}`);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(results) {
    return `# Automated Documentation Monitoring Report

**Generated:** ${new Date().toLocaleString()}  
**Overall Health:** ${results.overallHealth.toUpperCase()} (${results.kpis.documentationHealth.overallScore}%)

## Executive Summary

- **Total Alerts:** ${results.alerts.length}
- **Critical Issues:** ${results.alerts.filter(a => a.level === 'critical').length}
- **Recommendations:** ${results.recommendations.length}
- **High Priority Actions:** ${results.recommendations.filter(r => r.priority === 'high').length}

## Key Metrics

| Metric | Score | Status |
|--------|-------|--------|
| Completeness | ${results.kpis.documentationHealth.completeness}% | ${results.kpis.documentationHealth.completeness >= 90 ? '✅' : '⚠️'} |
| Quality | ${results.kpis.documentationHealth.quality}% | ${results.kpis.documentationHealth.quality >= 85 ? '✅' : '⚠️'} |
| Link Health | ${results.kpis.linkHealth.healthScore}% | ${results.kpis.linkHealth.healthScore >= 95 ? '✅' : '⚠️'} |
| Bilingual Parity | ${results.kpis.bilingualParity.parityScore}% | ${results.kpis.bilingualParity.parityScore >= 80 ? '✅' : '⚠️'} |

## Immediate Actions Required

${results.recommendations.filter(r => r.priority === 'high').map((rec, index) => 
  `${index + 1}. ${rec.action} (${rec.estimatedDays} days)`
).join('\n') || 'None'}

---
*Generated by Documentation Monitoring Automation System*
`;
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(results) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Documentation Monitoring Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .critical { background: #ffebee; }
        .warning { background: #fff3e0; }
        .good { background: #e8f5e8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Documentation Monitoring Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Overall Health:</strong> ${results.overallHealth.toUpperCase()} (${results.kpis.documentationHealth.overallScore}%)</p>
    </div>
    
    <h2>Key Metrics</h2>
    <div class="metric ${results.kpis.documentationHealth.completeness >= 90 ? 'good' : 'warning'}">
        <h3>Completeness</h3>
        <p>${results.kpis.documentationHealth.completeness}%</p>
    </div>
    
    <div class="metric ${results.kpis.linkHealth.healthScore >= 95 ? 'good' : 'warning'}">
        <h3>Link Health</h3>
        <p>${results.kpis.linkHealth.healthScore}%</p>
    </div>
    
    <h2>Alerts (${results.alerts.length})</h2>
    ${results.alerts.map(alert => `
        <div class="metric ${alert.level === 'critical' ? 'critical' : 'warning'}">
            <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
        </div>
    `).join('')}
    
    <p><em>Generated by Documentation Monitoring Automation System</em></p>
</body>
</html>`;
  }

  /**
   * Update CI/CD status based on results
   */
  async updateCICDStatus(results) {
    console.log('🔄 Updating CI/CD status...');
    
    const criticalAlerts = results.alerts.filter(a => a.level === 'critical');
    const warningAlerts = results.alerts.filter(a => a.level === 'warning');
    
    const cicdStatus = {
      timestamp: new Date().toISOString(),
      overallHealth: results.overallHealth,
      score: results.kpis.documentationHealth.overallScore,
      alerts: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        total: results.alerts.length
      },
      shouldFail: false,
      exitCode: 0,
      message: 'Documentation health check passed'
    };
    
    // Determine if CI/CD should fail
    if (this.integrationConfig.cicd.failOnCritical && criticalAlerts.length > 0) {
      cicdStatus.shouldFail = true;
      cicdStatus.exitCode = 1;
      cicdStatus.message = `Documentation health check failed: ${criticalAlerts.length} critical issues`;
    } else if (this.integrationConfig.cicd.failOnWarning && warningAlerts.length > 0) {
      cicdStatus.shouldFail = true;
      cicdStatus.exitCode = 1;
      cicdStatus.message = `Documentation health check failed: ${warningAlerts.length} warning issues`;
    }
    
    // Write CI/CD status file
    await fs.writeFile('docs/cicd-status.json', JSON.stringify(cicdStatus, null, 2));
    
    // Generate CI/CD artifacts if enabled
    if (this.integrationConfig.cicd.generateArtifacts) {
      await this.generateCICDArtifacts(results);
    }
    
    console.log(`  🔄 CI/CD status: ${cicdStatus.shouldFail ? 'FAIL' : 'PASS'} (${cicdStatus.message})`);
    
    return cicdStatus;
  }

  /**
   * Generate CI/CD artifacts
   */
  async generateCICDArtifacts(results) {
    const artifactsDir = 'docs/artifacts';
    await fs.mkdir(artifactsDir, { recursive: true });
    
    // Generate test results in JUnit format for CI/CD systems
    const junitXml = this.generateJUnitXML(results);
    await fs.writeFile(path.join(artifactsDir, 'documentation-health-results.xml'), junitXml);
    
    // Generate coverage report
    const coverageReport = this.generateCoverageReport(results);
    await fs.writeFile(path.join(artifactsDir, 'documentation-coverage.json'), JSON.stringify(coverageReport, null, 2));
    
    console.log('    📦 CI/CD artifacts generated');
  }

  /**
   * Generate JUnit XML for CI/CD systems
   */
  generateJUnitXML(results) {
    const testCases = [
      {
        name: 'Documentation Completeness',
        status: results.kpis.documentationHealth.completeness >= 90 ? 'passed' : 'failed',
        time: '0.1',
        message: `Completeness: ${results.kpis.documentationHealth.completeness}%`
      },
      {
        name: 'Link Health',
        status: results.kpis.linkHealth.healthScore >= 95 ? 'passed' : 'failed',
        time: '0.1',
        message: `Link Health: ${results.kpis.linkHealth.healthScore}%`
      },
      {
        name: 'Overall Health',
        status: results.overallHealth === 'excellent' || results.overallHealth === 'good' ? 'passed' : 'failed',
        time: '0.1',
        message: `Overall Health: ${results.overallHealth} (${results.kpis.documentationHealth.overallScore}%)`
      }
    ];
    
    const totalTests = testCases.length;
    const failures = testCases.filter(tc => tc.status === 'failed').length;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Documentation Health" tests="${totalTests}" failures="${failures}" time="0.3">
${testCases.map(tc => `
  <testcase name="${tc.name}" time="${tc.time}">
    ${tc.status === 'failed' ? `<failure message="${tc.message}"></failure>` : ''}
  </testcase>
`).join('')}
</testsuite>`;
  }

  /**
   * Generate coverage report
   */
  generateCoverageReport(results) {
    return {
      timestamp: new Date().toISOString(),
      coverage: {
        documentation: {
          completeness: results.kpis.documentationHealth.completeness,
          modules: {
            total: results.kpis.contentCoverage.totalModules,
            complete: results.kpis.contentCoverage.completeModules,
            percentage: results.kpis.contentCoverage.coverageScore
          }
        },
        apis: {
          openapi: results.kpis.contentCoverage.openApiCoverage,
          mcp: results.kpis.contentCoverage.mcpCoverage
        },
        languages: {
          bilingual: results.kpis.bilingualParity.parityScore,
          english: results.kpis.bilingualParity.languageCoverage?.en || 0,
          spanish: results.kpis.bilingualParity.languageCoverage?.es || 0
        }
      }
    };
  }

  /**
   * Clean up old reports based on retention policy
   */
  async cleanupOldReports() {
    console.log('🧹 Cleaning up old reports...');
    
    try {
      const reportsDir = 'docs/reports';
      const entries = await fs.readdir(reportsDir, { withFileTypes: true });
      const reportDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.match(/^\d{4}-\d{2}-\d{2}$/))
        .map(entry => entry.name)
        .sort()
        .reverse(); // Most recent first
      
      // Keep only the number specified in retention policy
      const toDelete = reportDirs.slice(this.integrationConfig.reporting.retention.daily);
      
      for (const dirName of toDelete) {
        await fs.rm(path.join(reportsDir, dirName), { recursive: true, force: true });
        console.log(`    🗑️ Deleted old report: ${dirName}`);
      }
      
      console.log(`  🧹 Cleanup completed: kept ${reportDirs.length - toDelete.length} reports, deleted ${toDelete.length}`);
      
    } catch (error) {
      console.warn('  ⚠️ Cleanup failed:', error.message);
    }
  }

  /**
   * Generate integration summary
   */
  async generateIntegrationSummary(results) {
    const summary = {
      timestamp: new Date().toISOString(),
      integration: {
        status: 'active',
        version: '1.0.0',
        features: {
          enhancedMonitoring: true,
          automatedReporting: true,
          alerting: this.integrationConfig.alerting.enabled,
          cicdIntegration: this.integrationConfig.cicd.enabled,
          scheduledReporting: this.integrationConfig.scheduledReporting.enabled
        }
      },
      execution: {
        duration: Date.now() - new Date(results.timestamp).getTime(),
        success: true,
        alertsProcessed: results.alerts.length,
        reportsGenerated: this.integrationConfig.reporting.formats.length,
        artifactsCreated: this.integrationConfig.cicd.generateArtifacts
      },
      nextRun: this.calculateNextScheduledRun()
    };
    
    await fs.writeFile('docs/integration-summary.json', JSON.stringify(summary, null, 2));
    
    console.log('📋 Integration summary:');
    console.log(`  ⏱️ Execution time: ${summary.execution.duration}ms`);
    console.log(`  🚨 Alerts processed: ${summary.execution.alertsProcessed}`);
    console.log(`  📊 Reports generated: ${summary.execution.reportsGenerated}`);
    console.log(`  ⏰ Next scheduled run: ${summary.nextRun}`);
  }

  /**
   * Generate failure report
   */
  async generateFailureReport(error) {
    const failureReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      }
    };
    
    await fs.writeFile('docs/monitoring-failure.json', JSON.stringify(failureReport, null, 2));
    console.log('💥 Failure report saved to docs/monitoring-failure.json');
  }

  /**
   * Calculate next scheduled run
   */
  calculateNextScheduledRun() {
    const now = new Date();
    const [hours, minutes] = this.integrationConfig.scheduledReporting.time.split(':').map(Number);
    
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun.toISOString();
  }
}

// CLI interface
async function main() {
  const integration = new DocumentationMonitoringAutomationIntegration();
  const command = process.argv[2];

  switch (command) {
    case 'run':
      try {
        const results = await integration.runAutomatedMonitoring();
        
        // Exit with appropriate code for CI/CD
        const cicdStatus = JSON.parse(await fs.readFile('docs/cicd-status.json', 'utf8'));
        process.exit(cicdStatus.exitCode);
        
      } catch (error) {
        console.error('❌ Automated monitoring failed:', error.message);
        process.exit(1);
      }
      break;
    
    case 'status':
      try {
        const status = JSON.parse(await fs.readFile('docs/cicd-status.json', 'utf8'));
        console.log('📊 Current Status:');
        console.log(`  Health: ${status.overallHealth} (${status.score}%)`);
        console.log(`  Alerts: ${status.alerts.total} (${status.alerts.critical} critical)`);
        console.log(`  CI/CD: ${status.shouldFail ? 'FAIL' : 'PASS'}`);
        console.log(`  Message: ${status.message}`);
      } catch (error) {
        console.log('❌ No status available. Run monitoring first.');
        process.exit(1);
      }
      break;
    
    case 'cleanup':
      await integration.cleanupOldReports();
      break;
    
    default:
      console.log(`
Usage: node docs-monitoring-automation-integration.mjs <command>

Commands:
  run     - Run automated monitoring with full integration
  status  - Show current monitoring status
  cleanup - Clean up old reports

Examples:
  node docs-monitoring-automation-integration.mjs run
  node docs-monitoring-automation-integration.mjs status
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Integration failed:', error);
    process.exit(1);
  });
}

export default DocumentationMonitoringAutomationIntegration;