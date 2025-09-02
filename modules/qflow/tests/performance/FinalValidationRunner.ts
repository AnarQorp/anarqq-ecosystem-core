/**
 * Final Validation Runner
 * 
 * Comprehensive test runner for final performance validation and optimization
 * that orchestrates all validation phases and generates deployment readiness reports.
 */

import { EventEmitter } from 'events';
import { FinalPerformanceValidator, FinalValidationConfig, FinalValidationResult } from '../../src/validation/FinalPerformanceValidator';

export interface ValidationRunnerConfig {
  environment: 'development' | 'staging' | 'production';
  validationProfiles: ValidationProfile[];
  reportingConfig: ReportingConfig;
  integrationConfig: IntegrationConfig;
  notificationConfig: NotificationConfig;
}

export interface ValidationProfile {
  name: string;
  description: string;
  environment: string;
  config: FinalValidationConfig;
  schedule?: CronSchedule;
  triggers: ValidationTrigger[];
}

export interface CronSchedule {
  enabled: boolean;
  expression: string;
  timezone: string;
}

export interface ValidationTrigger {
  type: 'manual' | 'ci_cd' | 'scheduled' | 'performance_regression' | 'security_alert';
  enabled: boolean;
  conditions?: TriggerCondition[];
}

export interface TriggerCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  threshold: number;
  duration?: number;
}

export interface ReportingConfig {
  enableDashboard: boolean;
  dashboardPort: number;
  enableSlackNotifications: boolean;
  enableEmailNotifications: boolean;
  enableWebhooks: boolean;
  reportRetentionDays: number;
  exportFormats: string[];
}

export interface IntegrationConfig {
  cicdIntegration: {
    enabled: boolean;
    provider: 'github' | 'gitlab' | 'jenkins' | 'azure_devops';
    webhookUrl?: string;
    apiToken?: string;
  };
  monitoringIntegration: {
    enabled: boolean;
    provider: 'prometheus' | 'grafana' | 'datadog' | 'newrelic';
    endpoint?: string;
    apiKey?: string;
  };
  alertingIntegration: {
    enabled: boolean;
    provider: 'pagerduty' | 'opsgenie' | 'slack' | 'email';
    config?: Record<string, any>;
  };
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  templates: NotificationTemplate[];
  escalationRules: EscalationRule[];
}

export interface NotificationChannel {
  name: string;
  type: 'slack' | 'email' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationTemplate {
  name: string;
  type: 'validation_started' | 'validation_completed' | 'validation_failed' | 'deployment_blocked';
  subject: string;
  body: string;
  format: 'text' | 'html' | 'markdown';
}

export interface EscalationRule {
  condition: string;
  delay: number;
  channels: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationRun {
  runId: string;
  profileName: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: string;
  result?: FinalValidationResult;
  logs: ValidationLog[];
}

export interface ValidationLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface ValidationSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastRunTime: number;
  deploymentReadinessRate: number;
  commonIssues: string[];
  trends: ValidationTrend[];
}

export interface ValidationTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  confidence: number;
  period: string;
}

export class FinalValidationRunner extends EventEmitter {
  private config: ValidationRunnerConfig;
  private validators: Map<string, FinalPerformanceValidator>;
  private activeRuns: Map<string, ValidationRun>;
  private runHistory: ValidationRun[];
  private scheduledJobs: Map<string, NodeJS.Timeout>;

  constructor(config: ValidationRunnerConfig) {
    super();
    this.config = config;
    this.validators = new Map();
    this.activeRuns = new Map();
    this.runHistory = [];
    this.scheduledJobs = new Map();

    this.initializeValidators();
    this.setupScheduledJobs();
  }

  /**
   * Initialize validators for each profile
   */
  private initializeValidators(): void {
    for (const profile of this.config.validationProfiles) {
      const validator = new FinalPerformanceValidator(profile.config);
      
      // Forward validator events
      validator.on('validation_started', (data) => {
        this.emit('validation_started', { ...data, profile: profile.name });
      });
      
      validator.on('validation_completed', (data) => {
        this.emit('validation_completed', { ...data, profile: profile.name });
      });
      
      validator.on('validation_failed', (data) => {
        this.emit('validation_failed', { ...data, profile: profile.name });
      });

      this.validators.set(profile.name, validator);
    }
  }

  /**
   * Setup scheduled validation jobs
   */
  private setupScheduledJobs(): void {
    for (const profile of this.config.validationProfiles) {
      if (profile.schedule?.enabled) {
        // In a real implementation, would use a proper cron library
        const interval = this.parseCronExpression(profile.schedule.expression);
        if (interval > 0) {
          const job = setInterval(() => {
            this.runValidation(profile.name, 'scheduled');
          }, interval);
          
          this.scheduledJobs.set(profile.name, job);
        }
      }
    }
  }

  /**
   * Run validation for a specific profile
   */
  public async runValidation(profileName: string, trigger: string = 'manual'): Promise<ValidationRun> {
    const profile = this.config.validationProfiles.find(p => p.name === profileName);
    if (!profile) {
      throw new Error(`Validation profile '${profileName}' not found`);
    }

    const validator = this.validators.get(profileName);
    if (!validator) {
      throw new Error(`Validator for profile '${profileName}' not initialized`);
    }

    const runId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const run: ValidationRun = {
      runId,
      profileName,
      startTime,
      status: 'running',
      trigger,
      logs: []
    };

    this.activeRuns.set(runId, run);
    this.addLog(run, 'info', `Starting validation for profile '${profileName}'`, { trigger });

    try {
      // Send start notification
      await this.sendNotification('validation_started', {
        runId,
        profileName,
        trigger,
        startTime
      });

      // Run the validation
      const result = await validator.runFinalValidation();
      
      // Update run with results
      run.endTime = Date.now();
      run.status = 'completed';
      run.result = result;

      this.addLog(run, 'info', `Validation completed with status: ${result.status}`, {
        duration: run.endTime - run.startTime,
        deploymentReady: result.deploymentReadiness.ready
      });

      // Move to history
      this.runHistory.push(run);
      this.activeRuns.delete(runId);

      // Send completion notification
      await this.sendNotification('validation_completed', {
        runId,
        profileName,
        status: result.status,
        deploymentReady: result.deploymentReadiness.ready,
        duration: run.endTime - run.startTime
      });

      // Check for deployment blocking issues
      if (!result.deploymentReadiness.ready) {
        await this.sendNotification('deployment_blocked', {
          runId,
          profileName,
          blockers: result.deploymentReadiness.blockers,
          recommendations: result.recommendations.filter(r => r.priority === 'critical')
        });
      }

      this.emit('validation_run_completed', run);
      return run;

    } catch (error) {
      run.endTime = Date.now();
      run.status = 'failed';
      
      this.addLog(run, 'error', `Validation failed: ${error instanceof Error ? error.message : String(error)}`);

      // Move to history
      this.runHistory.push(run);
      this.activeRuns.delete(runId);

      // Send failure notification
      await this.sendNotification('validation_failed', {
        runId,
        profileName,
        error: error instanceof Error ? error.message : String(error),
        duration: run.endTime - run.startTime
      });

      this.emit('validation_run_failed', run);
      throw error;
    }
  }

  /**
   * Run validation for all profiles
   */
  public async runAllValidations(trigger: string = 'manual'): Promise<ValidationRun[]> {
    const runs: ValidationRun[] = [];
    
    for (const profile of this.config.validationProfiles) {
      try {
        const run = await this.runValidation(profile.name, trigger);
        runs.push(run);
      } catch (error) {
        // Continue with other profiles even if one fails
        this.emit('profile_validation_failed', {
          profileName: profile.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return runs;
  }

  /**
   * Cancel a running validation
   */
  public async cancelValidation(runId: string): Promise<boolean> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      return false;
    }

    run.status = 'cancelled';
    run.endTime = Date.now();
    
    this.addLog(run, 'warn', 'Validation cancelled by user');

    // Move to history
    this.runHistory.push(run);
    this.activeRuns.delete(runId);

    this.emit('validation_cancelled', run);
    return true;
  }

  /**
   * Get validation run status
   */
  public getRunStatus(runId: string): ValidationRun | null {
    return this.activeRuns.get(runId) || 
           this.runHistory.find(r => r.runId === runId) || 
           null;
  }

  /**
   * Get active validation runs
   */
  public getActiveRuns(): ValidationRun[] {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Get validation run history
   */
  public getRunHistory(limit?: number): ValidationRun[] {
    const history = [...this.runHistory].sort((a, b) => b.startTime - a.startTime);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get validation summary statistics
   */
  public getValidationSummary(profileName?: string): ValidationSummary {
    const runs = profileName 
      ? this.runHistory.filter(r => r.profileName === profileName)
      : this.runHistory;

    const totalRuns = runs.length;
    const successfulRuns = runs.filter(r => r.status === 'completed' && r.result?.status === 'passed').length;
    const failedRuns = runs.filter(r => r.status === 'failed' || r.result?.status === 'failed').length;
    
    const completedRuns = runs.filter(r => r.endTime);
    const averageDuration = completedRuns.length > 0 
      ? completedRuns.reduce((sum, r) => sum + (r.endTime! - r.startTime), 0) / completedRuns.length
      : 0;

    const lastRunTime = runs.length > 0 ? Math.max(...runs.map(r => r.startTime)) : 0;
    
    const deploymentReadyRuns = runs.filter(r => r.result?.deploymentReadiness.ready).length;
    const deploymentReadinessRate = totalRuns > 0 ? deploymentReadyRuns / totalRuns : 0;

    // Analyze common issues
    const commonIssues = this.analyzeCommonIssues(runs);

    // Calculate trends
    const trends = this.calculateTrends(runs);

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      averageDuration,
      lastRunTime,
      deploymentReadinessRate,
      commonIssues,
      trends
    };
  }

  /**
   * Generate comprehensive validation report
   */
  public async generateReport(format: 'json' | 'html' | 'pdf' = 'json'): Promise<string> {
    const summary = this.getValidationSummary();
    const recentRuns = this.getRunHistory(10);
    
    const report = {
      generatedAt: Date.now(),
      environment: this.config.environment,
      summary,
      recentRuns: recentRuns.map(run => ({
        runId: run.runId,
        profileName: run.profileName,
        startTime: run.startTime,
        duration: run.endTime ? run.endTime - run.startTime : null,
        status: run.status,
        deploymentReady: run.result?.deploymentReadiness.ready,
        criticalIssues: run.result?.recommendations.filter(r => r.priority === 'critical').length || 0
      })),
      profiles: this.config.validationProfiles.map(p => ({
        name: p.name,
        description: p.description,
        environment: p.environment
      }))
    };

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generateHTMLReport(report);
      case 'pdf':
        return this.generatePDFReport(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Setup CI/CD integration
   */
  public async setupCICDIntegration(): Promise<void> {
    if (!this.config.integrationConfig.cicdIntegration.enabled) {
      return;
    }

    const integration = this.config.integrationConfig.cicdIntegration;
    
    // Setup webhook endpoint for CI/CD triggers
    // Implementation would depend on the CI/CD provider
    
    this.emit('cicd_integration_setup', {
      provider: integration.provider,
      timestamp: Date.now()
    });
  }

  /**
   * Setup monitoring integration
   */
  public async setupMonitoringIntegration(): Promise<void> {
    if (!this.config.integrationConfig.monitoringIntegration.enabled) {
      return;
    }

    const integration = this.config.integrationConfig.monitoringIntegration;
    
    // Setup metrics export to monitoring system
    // Implementation would depend on the monitoring provider
    
    this.emit('monitoring_integration_setup', {
      provider: integration.provider,
      timestamp: Date.now()
    });
  }

  /**
   * Private helper methods
   */
  private addLog(run: ValidationRun, level: ValidationLog['level'], message: string, data?: any): void {
    run.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data
    });
  }

  private async sendNotification(type: string, data: any): Promise<void> {
    if (!this.config.notificationConfig.channels.length) {
      return;
    }

    const template = this.config.notificationConfig.templates.find(t => t.type === type);
    if (!template) {
      return;
    }

    for (const channel of this.config.notificationConfig.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendChannelNotification(channel, template, data);
      } catch (error) {
        this.emit('notification_failed', {
          channel: channel.name,
          type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async sendChannelNotification(
    channel: NotificationChannel, 
    template: NotificationTemplate, 
    data: any
  ): Promise<void> {
    // Implementation would depend on the channel type
    switch (channel.type) {
      case 'slack':
        // Send Slack notification
        break;
      case 'email':
        // Send email notification
        break;
      case 'webhook':
        // Send webhook notification
        break;
      case 'sms':
        // Send SMS notification
        break;
    }
  }

  private parseCronExpression(expression: string): number {
    // Simple cron parser - in production would use a proper cron library
    // For now, return a default interval of 1 hour
    return 3600000; // 1 hour in milliseconds
  }

  private analyzeCommonIssues(runs: ValidationRun[]): string[] {
    const issueMap = new Map<string, number>();

    runs.forEach(run => {
      if (run.result) {
        // Count SLA violations
        run.result.performance.slaCompliance.violations.forEach(violation => {
          const issue = `SLA violation: ${violation.metric}`;
          issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
        });

        // Count security vulnerabilities
        run.result.security.vulnerabilities.forEach(vuln => {
          const issue = `Security: ${vuln.category} vulnerability`;
          issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
        });

        // Count failed gates
        [...run.result.gates.performanceGates, ...run.result.gates.securityGates]
          .filter(gate => !gate.passed)
          .forEach(gate => {
            const issue = `Failed gate: ${gate.gateName}`;
            issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
          });
      }
    });

    // Return top 5 most common issues
    return Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => `${issue} (${count} occurrences)`);
  }

  private calculateTrends(runs: ValidationRun[]): ValidationTrend[] {
    const trends: ValidationTrend[] = [];
    
    if (runs.length < 5) {
      return trends; // Need at least 5 runs for trend analysis
    }

    // Sort runs by time
    const sortedRuns = runs.sort((a, b) => a.startTime - b.startTime);
    
    // Calculate response time trend
    const responseTimes = sortedRuns
      .filter(r => r.result?.performance.slaCompliance.metrics.avgResponseTime)
      .map(r => r.result!.performance.slaCompliance.metrics.avgResponseTime);
    
    if (responseTimes.length >= 3) {
      trends.push(this.calculateMetricTrend('response_time', responseTimes));
    }

    // Calculate throughput trend
    const throughputs = sortedRuns
      .filter(r => r.result?.performance.slaCompliance.metrics.avgThroughput)
      .map(r => r.result!.performance.slaCompliance.metrics.avgThroughput);
    
    if (throughputs.length >= 3) {
      trends.push(this.calculateMetricTrend('throughput', throughputs));
    }

    return trends;
  }

  private calculateMetricTrend(metric: string, values: number[]): ValidationTrend {
    if (values.length < 3) {
      return {
        metric,
        direction: 'stable',
        changePercent: 0,
        confidence: 0,
        period: '30d'
      };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changePercent = Math.abs((slope / (sumY / n)) * 100);

    let direction: 'improving' | 'degrading' | 'stable' = 'stable';
    if (metric === 'response_time') {
      direction = slope < -0.1 ? 'improving' : slope > 0.1 ? 'degrading' : 'stable';
    } else if (metric === 'throughput') {
      direction = slope > 0.1 ? 'improving' : slope < -0.1 ? 'degrading' : 'stable';
    }

    return {
      metric,
      direction,
      changePercent,
      confidence: Math.min(n / 10, 1), // Confidence increases with sample size
      period: '30d'
    };
  }

  private generateHTMLReport(report: any): string {
    // Generate HTML report
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Qflow Final Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #007acc; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-warning { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Qflow Final Validation Report</h1>
        <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
        <p>Environment: ${report.environment}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Runs</h3>
            <div class="value">${report.summary.totalRuns}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value">${((report.summary.successfulRuns / report.summary.totalRuns) * 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Deployment Readiness</h3>
            <div class="value">${(report.summary.deploymentReadinessRate * 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Average Duration</h3>
            <div class="value">${Math.round(report.summary.averageDuration / 1000)}s</div>
        </div>
    </div>
    
    <h2>Recent Validation Runs</h2>
    <table border="1" style="width: 100%; border-collapse: collapse;">
        <tr>
            <th>Run ID</th>
            <th>Profile</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Deployment Ready</th>
            <th>Critical Issues</th>
        </tr>
        ${report.recentRuns.map((run: any) => `
        <tr>
            <td>${run.runId}</td>
            <td>${run.profileName}</td>
            <td class="status-${run.status}">${run.status}</td>
            <td>${run.duration ? Math.round(run.duration / 1000) + 's' : 'N/A'}</td>
            <td>${run.deploymentReady ? '✅' : '❌'}</td>
            <td>${run.criticalIssues}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }

  private generatePDFReport(report: any): string {
    // In a real implementation, would generate PDF using a library like puppeteer
    return 'PDF generation not implemented in this example';
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Clear scheduled jobs
    for (const [profileName, job] of this.scheduledJobs) {
      clearInterval(job);
    }
    this.scheduledJobs.clear();

    // Clear active runs
    this.activeRuns.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}