#!/usr/bin/env node

/**
 * Compliance Management CLI
 * Command-line interface for compliance operations
 */

import { ComplianceService } from '../services/ComplianceService.mjs';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

const complianceService = new ComplianceService();

program
  .name('compliance-cli')
  .description('Compliance management command-line interface')
  .version('1.0.0');

// GDPR Commands
const gdprCommand = program
  .command('gdpr')
  .description('GDPR compliance operations');

gdprCommand
  .command('check')
  .description('Perform GDPR compliance check')
  .action(async () => {
    try {
      console.log(chalk.blue('🔍 Performing GDPR compliance check...'));
      const report = await complianceService.performGDPRCheck();
      
      console.log(chalk.green('✅ GDPR compliance check completed'));
      console.log(`Status: ${report.status === 'COMPLIANT' ? chalk.green(report.status) : chalk.red(report.status)}`);
      console.log(`Violations found: ${report.violations.length}`);
      
      if (report.violations.length > 0) {
        console.log(chalk.yellow('\n⚠️  Violations:'));
        report.violations.forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.type} (${violation.severity})`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Recommendations:'));
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ GDPR compliance check failed:'), error.message);
      process.exit(1);
    }
  });

gdprCommand
  .command('dsr')
  .description('Process Data Subject Request')
  .option('-t, --type <type>', 'DSR type (ACCESS, RECTIFICATION, ERASURE, PORTABILITY, RESTRICTION)')
  .option('-s, --subject <id>', 'Subject ID')
  .option('-r, --requester <id>', 'Requester ID')
  .action(async (options) => {
    try {
      let dsrData = {};
      
      if (!options.type || !options.subject || !options.requester) {
        // Interactive mode
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'Select DSR type:',
            choices: ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION'],
            when: !options.type
          },
          {
            type: 'input',
            name: 'subjectId',
            message: 'Enter subject ID:',
            when: !options.subject,
            validate: (input) => input.length > 0 || 'Subject ID is required'
          },
          {
            type: 'input',
            name: 'requestedBy',
            message: 'Enter requester ID:',
            when: !options.requester,
            validate: (input) => input.length > 0 || 'Requester ID is required'
          }
        ]);
        
        dsrData = {
          type: options.type || answers.type,
          subjectId: options.subject || answers.subjectId,
          requestedBy: options.requester || answers.requestedBy
        };
      } else {
        dsrData = {
          type: options.type,
          subjectId: options.subject,
          requestedBy: options.requester
        };
      }
      
      console.log(chalk.blue('📋 Processing Data Subject Request...'));
      const result = await complianceService.processDSR(dsrData);
      
      console.log(chalk.green('✅ DSR processed successfully'));
      console.log(`Request ID: ${result.requestId}`);
      console.log(`Status: ${result.status}`);
      
    } catch (error) {
      console.error(chalk.red('❌ DSR processing failed:'), error.message);
      process.exit(1);
    }
  });

// SOC2 Commands
const soc2Command = program
  .command('soc2')
  .description('SOC2 compliance operations');

soc2Command
  .command('report')
  .description('Generate SOC2 compliance report')
  .option('-p, --period <period>', 'Reporting period (weekly, monthly, quarterly, yearly)', 'monthly')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`📊 Generating SOC2 ${options.period} report...`));
      const report = await complianceService.generateSOC2Report(options.period);
      
      console.log(chalk.green('✅ SOC2 report generated successfully'));
      console.log(`Report ID: ${report.reportId}`);
      console.log(`Status: ${report.status === 'COMPLIANT' ? chalk.green(report.status) : chalk.red(report.status)}`);
      console.log(`Period: ${report.period.startDate} to ${report.period.endDate}`);
      
      if (report.findings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Findings:'));
        report.findings.forEach((finding, index) => {
          console.log(`${index + 1}. [${finding.controlId}] ${finding.description} (${finding.severity})`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Recommendations:'));
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.controlId}] ${rec.action} (${rec.timeline})`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ SOC2 report generation failed:'), error.message);
      process.exit(1);
    }
  });

// Data Retention Commands
const retentionCommand = program
  .command('retention')
  .description('Data retention policy operations');

retentionCommand
  .command('enforce')
  .description('Enforce data retention policies')
  .action(async () => {
    try {
      console.log(chalk.blue('🗂️  Enforcing data retention policies...'));
      const report = await complianceService.enforceRetentionPolicies();
      
      console.log(chalk.green('✅ Data retention policies enforced'));
      console.log(`Resources processed: ${report.results.length}`);
      console.log(`Items deleted: ${report.summary.totalDeleted}`);
      console.log(`Items archived: ${report.summary.totalArchived}`);
      console.log(`Success rate: ${(report.summary.successRate * 100).toFixed(1)}%`);
      
      if (report.summary.totalErrors > 0) {
        console.log(chalk.yellow(`⚠️  Errors encountered: ${report.summary.totalErrors}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Retention policy enforcement failed:'), error.message);
      process.exit(1);
    }
  });

retentionCommand
  .command('status')
  .description('Check data retention status')
  .action(async () => {
    try {
      console.log(chalk.blue('📊 Checking data retention status...'));
      const status = await complianceService.getRetentionStatus();
      
      console.log(chalk.green('✅ Retention status retrieved'));
      console.log('\nRetention Policy Status:');
      
      Object.entries(status).forEach(([resourceType, info]) => {
        console.log(`\n${chalk.bold(resourceType)}:`);
        console.log(`  Policy: ${info.policy.policy} after ${info.policy.period}`);
        console.log(`  Total records: ${info.totalRecords}`);
        console.log(`  Expired records: ${info.expiredRecords}`);
        console.log(`  Last enforcement: ${new Date(info.lastEnforcement).toLocaleString()}`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to get retention status:'), error.message);
      process.exit(1);
    }
  });

// Privacy Impact Assessment Commands
const piaCommand = program
  .command('pia')
  .description('Privacy Impact Assessment operations');

piaCommand
  .command('assess')
  .description('Perform Privacy Impact Assessment')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'activityName',
          message: 'Enter data processing activity name:',
          validate: (input) => input.length > 0 || 'Activity name is required'
        },
        {
          type: 'checkbox',
          name: 'dataTypes',
          message: 'Select data types being processed:',
          choices: [
            'personal',
            'sensitive',
            'financial',
            'health',
            'biometric',
            'location',
            'behavioral',
            'communication'
          ],
          validate: (input) => input.length > 0 || 'At least one data type must be selected'
        },
        {
          type: 'input',
          name: 'processingPurpose',
          message: 'Enter processing purpose:',
          validate: (input) => input.length > 0 || 'Processing purpose is required'
        },
        {
          type: 'list',
          name: 'legalBasis',
          message: 'Select legal basis:',
          choices: [
            'CONSENT',
            'CONTRACT',
            'LEGAL_OBLIGATION',
            'VITAL_INTERESTS',
            'PUBLIC_TASK',
            'LEGITIMATE_INTERESTS'
          ]
        },
        {
          type: 'list',
          name: 'scope',
          message: 'Select processing scope:',
          choices: ['individual', 'group', 'organization', 'population']
        },
        {
          type: 'checkbox',
          name: 'processing',
          message: 'Select processing methods:',
          choices: ['manual', 'assisted', 'automated', 'profiling']
        }
      ]);
      
      console.log(chalk.blue('🔍 Performing Privacy Impact Assessment...'));
      const pia = await complianceService.performPrivacyImpactAssessment(answers);
      
      console.log(chalk.green('✅ Privacy Impact Assessment completed'));
      console.log(`Assessment ID: ${pia.assessmentId}`);
      console.log(`Risk Score: ${pia.riskScore}/10`);
      console.log(`Status: ${pia.status === 'LOW_RISK' ? chalk.green(pia.status) : 
                           pia.status === 'MEDIUM_RISK' ? chalk.yellow(pia.status) : 
                           chalk.red(pia.status)}`);
      
      if (pia.riskAssessment.length > 0) {
        console.log(chalk.yellow('\n⚠️  Identified Risks:'));
        pia.riskAssessment.forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.type} (Score: ${risk.score})`);
          console.log(`   ${risk.description}`);
        });
      }
      
      if (pia.mitigations.length > 0) {
        console.log(chalk.blue('\n🛡️  Recommended Mitigations:'));
        pia.mitigations.forEach((mitigation, index) => {
          console.log(`${index + 1}. [${mitigation.priority}] ${mitigation.mitigation}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Privacy Impact Assessment failed:'), error.message);
      process.exit(1);
    }
  });

// Dashboard Commands
const dashboardCommand = program
  .command('dashboard')
  .description('Compliance dashboard operations');

dashboardCommand
  .command('overview')
  .description('Show compliance dashboard overview')
  .action(async () => {
    try {
      console.log(chalk.blue('📊 Loading compliance dashboard...'));
      const dashboard = await complianceService.getComplianceDashboard();
      
      console.log(chalk.green('✅ Dashboard loaded successfully'));
      console.log('\n' + chalk.bold('Compliance Overview:'));
      console.log(`Compliance Score: ${dashboard.overview.complianceScore >= 90 ? chalk.green(dashboard.overview.complianceScore + '%') : 
                                       dashboard.overview.complianceScore >= 70 ? chalk.yellow(dashboard.overview.complianceScore + '%') : 
                                       chalk.red(dashboard.overview.complianceScore + '%')}`);
      console.log(`Active Violations: ${dashboard.overview.activeViolations > 0 ? chalk.red(dashboard.overview.activeViolations) : chalk.green(dashboard.overview.activeViolations)}`);
      console.log(`Pending DSRs: ${dashboard.overview.pendingDSRs > 0 ? chalk.yellow(dashboard.overview.pendingDSRs) : chalk.green(dashboard.overview.pendingDSRs)}`);
      console.log(`Upcoming Deadlines: ${dashboard.overview.upcomingDeadlines > 0 ? chalk.yellow(dashboard.overview.upcomingDeadlines) : chalk.green(dashboard.overview.upcomingDeadlines)}`);
      
      if (dashboard.activeViolations.length > 0) {
        console.log(chalk.yellow('\n⚠️  Active Violations:'));
        dashboard.activeViolations.slice(0, 5).forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.type.replace(/_/g, ' ')} (${violation.severity})`);
        });
        if (dashboard.activeViolations.length > 5) {
          console.log(`   ... and ${dashboard.activeViolations.length - 5} more`);
        }
      }
      
      if (dashboard.upcomingDeadlines.length > 0) {
        console.log(chalk.blue('\n📅 Upcoming Deadlines:'));
        dashboard.upcomingDeadlines.slice(0, 5).forEach((deadline, index) => {
          const urgency = deadline.daysRemaining <= 3 ? chalk.red : 
                         deadline.daysRemaining <= 7 ? chalk.yellow : chalk.green;
          console.log(`${index + 1}. ${deadline.description} (${urgency(deadline.daysRemaining + ' days')})`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to load dashboard:'), error.message);
      process.exit(1);
    }
  });

dashboardCommand
  .command('violations')
  .description('List compliance violations')
  .option('-s, --status <status>', 'Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)', 'ACTIVE')
  .option('-l, --limit <limit>', 'Limit number of results', '10')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`📋 Loading ${options.status.toLowerCase()} violations...`));
      const violations = await complianceService.getViolations(options.status, parseInt(options.limit));
      
      if (violations.length === 0) {
        console.log(chalk.green(`✅ No ${options.status.toLowerCase()} violations found`));
        return;
      }
      
      console.log(chalk.yellow(`⚠️  Found ${violations.length} ${options.status.toLowerCase()} violations:`));
      violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${chalk.bold(violation.type.replace(/_/g, ' '))}`);
        console.log(`   ID: ${violation.violationId}`);
        console.log(`   Severity: ${violation.severity}`);
        console.log(`   Timestamp: ${new Date(violation.timestamp).toLocaleString()}`);
        console.log(`   Status: ${violation.status}`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to load violations:'), error.message);
      process.exit(1);
    }
  });

// Metrics Commands
const metricsCommand = program
  .command('metrics')
  .description('Compliance metrics operations');

metricsCommand
  .command('show')
  .description('Show compliance metrics')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d)', '30d')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`📊 Loading compliance metrics for ${options.period}...`));
      const metrics = await complianceService.getComplianceMetrics(options.period);
      
      console.log(chalk.green('✅ Metrics loaded successfully'));
      console.log(`\n${chalk.bold('Compliance Metrics')} (${options.period}):`);
      console.log(`Overall Score: ${metrics.overallScore}%`);
      
      console.log(`\n${chalk.bold('Violations:')}`);
      console.log(`  Total: ${metrics.violations.total}`);
      if (Object.keys(metrics.violations.byType).length > 0) {
        console.log('  By Type:');
        Object.entries(metrics.violations.byType).forEach(([type, count]) => {
          console.log(`    ${type.replace(/_/g, ' ')}: ${count}`);
        });
      }
      
      console.log(`\n${chalk.bold('DSR Requests:')}`);
      console.log(`  Total: ${metrics.dsrRequests.total}`);
      console.log(`  Completed: ${metrics.dsrRequests.completed}`);
      console.log(`  Pending: ${metrics.dsrRequests.pending}`);
      console.log(`  Avg. Processing Time: ${metrics.dsrRequests.averageProcessingTime} days`);
      
      console.log(`\n${chalk.bold('Privacy Impact Assessments:')}`);
      console.log(`  Total: ${metrics.piaAssessments.total}`);
      console.log(`  High Risk: ${metrics.piaAssessments.highRisk}`);
      console.log(`  Medium Risk: ${metrics.piaAssessments.mediumRisk}`);
      console.log(`  Low Risk: ${metrics.piaAssessments.lowRisk}`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to load metrics:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}