#!/usr/bin/env node

/**
 * Enhanced Documentation Health Monitoring and KPI Tracking System
 * Implements comprehensive monitoring for documentation completeness, quality metrics,
 * version freshness, review backlog, link health, bilingual parity, and content coverage.
 * 
 * Task 9 Implementation: Monitoring and KPI tracking system
 * Requirements: 8.1, 8.2, 8.3
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import DocumentationKPITracker from './docs-kpi-tracker.mjs';
import DocumentationMonitoringDashboard from './docs-monitoring-dashboard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedDocumentationMonitoringSystem {
  constructor() {
    this.kpiTracker = new DocumentationKPITracker();
    this.dashboard = new DocumentationMonitoringDashboard();
    
    // Current ecosystem version for freshness tracking
    this.currentEcosystemVersion = 'v2.0.0';
    
    // Enhanced monitoring configuration
    this.config = {
      thresholds: {
        documentFreshness: 90, // days
        linkHealthScore: 95, // percentage
        bilingualCoverage: 80, // percentage
        reviewBacklogDays: 14, // days
        contentCoverage: 90, // percentage
        openApiCoverage: 70, // percentage
        mcpCoverage: 60, // percentage
        qualityScore: 85 // percentage
      },
      languages: ['en', 'es'],
      requiredDocTypes: [
        'README.md',
        'api-reference.md',
        'mcp-tools.md',
        'deployment-guide.md',
        'integration-guide.md',
        'examples.md',
        'runbook.md',
        'troubleshooting.md'
      ],
      automationIntegration: {
        enableSlackNotifications: false,
        enableEmailAlerts: false,
        enableGitHubIssues: false,
        reportingSchedule: 'daily', // daily, weekly, monthly
        alertThresholds: {
          critical: 60,
          warning: 80,
          info: 90
        }
      }
    };

    // Enhanced KPI tracking data with additional metrics
    this.enhancedKpis = {
      documentationHealth: {
        completeness: 0,
        quality: 0,
        freshness: 0,
        overallScore: 0
      },
      versionFreshness: {
        currentVersionPercentage: 0,
        outdatedDocs: 0,
        averageDocumentAge: 0,
        documentsNeedingUpdate: []
      },
      reviewBacklog: {
        pendingReviews: 0,
        overdueReviews: 0,
        averageReviewTime: 0,
        reviewVelocity: 0,
        burnDownRate: 0
      },
      linkHealth: {
        totalLinks: 0,
        brokenLinks: 0,
        healthScore: 0,
        externalLinks: 0,
        internalLinks: 0,
        brokenLinkDetails: []
      },
      bilingualParity: {
        totalContent: 0,
        bilingualContent: 0,
        parityScore: 0,
        missingTranslations: [],
        languageCoverage: {
          en: 0,
          es: 0
        }
      },
      contentCoverage: {
        totalModules: 0,
        completeModules: 0,
        coverageScore: 0,
        openApiCoverage: 0,
        mcpCoverage: 0,
        moduleCompletionDetails: []
      },
      trends: {
        completeness: { current: 0, previous: 0, trend: 'stable' },
        quality: { current: 0, previous: 0, trend: 'stable' },
        linkHealth: { current: 0, previous: 0, trend: 'stable' },
        reviewBacklog: { current: 0, previous: 0, trend: 'stable' }
      }
    };

    // Monitoring results
    this.monitoringResults = {
      timestamp: new Date().toISOString(),
      overallHealth: 'unknown',
      kpis: {},
      alerts: [],
      recommendations: [],
      automationStatus: {
        lastRun: null,
        nextScheduledRun: null,
        integrationStatus: {}
      }
    };
  }

  /**
   * Run comprehensive documentation health monitoring
   */
  async runHealthMonitoring() {
    console.log('🏥 Running enhanced documentation health monitoring...');
    
    // Use existing KPI tracker as base
    const baseKpis = await this.kpiTracker.trackAllKPIs();
    
    // Enhance with additional metrics
    await this.enhanceKpiTracking(baseKpis);
    
    // Calculate trends
    await this.calculateTrends();
    
    // Calculate overall health
    await this.calculateOverallHealth();
    
    // Generate alerts and recommendations
    await this.generateEnhancedAlerts();
    await this.generateEnhancedRecommendations();
    
    // Generate reports
    await this.generateComprehensiveReport();
    
    // Integrate with automation systems
    await this.integrateWithAutomation();
    
    return this.monitoringResults;
  }

  /**
   * Enhance KPI tracking with additional metrics
   */
  async enhanceKpiTracking(baseKpis) {
    console.log('📊 Enhancing KPI tracking with additional metrics...');
    
    // Start with base KPIs
    this.enhancedKpis = { ...this.enhancedKpis, ...baseKpis };
    
    // Add enhanced version freshness tracking
    await this.trackEnhancedVersionFreshness();
    
    // Add enhanced review backlog tracking
    await this.trackEnhancedReviewBacklog();
    
    // Add enhanced link health tracking
    await this.trackEnhancedLinkHealth();
    
    // Add enhanced bilingual parity tracking
    await this.trackEnhancedBilingualParity();
    
    // Add enhanced content coverage tracking
    await this.trackEnhancedContentCoverage();
    
    console.log('  📊 Enhanced KPI tracking completed');
  }

  /**
   * Track enhanced version freshness with detailed analysis
   */
  async trackEnhancedVersionFreshness() {
    console.log('  🕐 Tracking enhanced version freshness...');
    
    const allDocs = await this.findAllMarkdownFiles('docs');
    const documentsNeedingUpdate = [];
    
    for (const docPath of allDocs) {
      try {
        const content = await fs.readFile(docPath, 'utf8');
        const metadata = this.extractFrontMatter(content);
        const stats = await fs.stat(docPath);
        
        const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
        
        if (metadata.ecosystemVersion && metadata.ecosystemVersion !== this.currentEcosystemVersion) {
          documentsNeedingUpdate.push({
            path: path.relative('docs', docPath),
            currentVersion: metadata.ecosystemVersion,
            targetVersion: this.currentEcosystemVersion,
            ageInDays,
            priority: ageInDays > 60 ? 'high' : 'medium'
          });
        } else if (!metadata.ecosystemVersion && ageInDays > this.config.thresholds.documentFreshness) {
          documentsNeedingUpdate.push({
            path: path.relative('docs', docPath),
            currentVersion: 'unknown',
            targetVersion: this.currentEcosystemVersion,
            ageInDays,
            reason: 'missing_metadata',
            priority: 'low'
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.enhancedKpis.versionFreshness.documentsNeedingUpdate = documentsNeedingUpdate;
  }

  /**
   * Track enhanced review backlog with burn-down analysis
   */
  async trackEnhancedReviewBacklog() {
    console.log('  📝 Tracking enhanced review backlog...');
    
    const scriptFiles = await this.findVideoScriptFiles('docs/video-scripts');
    let reviewedThisWeek = 0;
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const scriptPath of scriptFiles) {
      try {
        const content = await fs.readFile(scriptPath, 'utf8');
        const metadata = this.extractScriptMetadata(content);
        const stats = await fs.stat(scriptPath);
        
        if (metadata.reviewStatus && 
            ['reviewed', 'approved'].includes(metadata.reviewStatus.toLowerCase()) &&
            stats.mtime.getTime() > oneWeekAgo) {
          reviewedThisWeek++;
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.enhancedKpis.reviewBacklog.reviewVelocity = reviewedThisWeek;
    this.enhancedKpis.reviewBacklog.burnDownRate = this.enhancedKpis.reviewBacklog.pendingReviews > 0 && reviewedThisWeek > 0
      ? Math.round((reviewedThisWeek / this.enhancedKpis.reviewBacklog.pendingReviews) * 100)
      : 0;
  }

  /**
   * Track enhanced link health with detailed broken link analysis
   */
  async trackEnhancedLinkHealth() {
    console.log('  🔗 Tracking enhanced link health...');
    
    const allDocs = await this.findAllMarkdownFiles('docs');
    let externalLinks = 0;
    let internalLinks = 0;
    const brokenLinkDetails = [];
    
    for (const docPath of allDocs) {
      try {
        const content = await fs.readFile(docPath, 'utf8');
        const links = this.extractInternalLinks(content);
        
        for (const link of links) {
          if (link.url.startsWith('http')) {
            externalLinks++;
          } else {
            internalLinks++;
            const targetPath = path.resolve(path.dirname(docPath), link.url);
            
            try {
              await fs.access(targetPath);
            } catch {
              brokenLinkDetails.push({
                sourceFile: path.relative('docs', docPath),
                linkText: link.text,
                linkUrl: link.url,
                targetPath: path.relative('docs', targetPath),
                severity: link.url.includes('README') ? 'high' : 'medium'
              });
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.enhancedKpis.linkHealth.externalLinks = externalLinks;
    this.enhancedKpis.linkHealth.internalLinks = internalLinks;
    this.enhancedKpis.linkHealth.brokenLinkDetails = brokenLinkDetails;
  }

  /**
   * Track enhanced bilingual parity with language-specific analysis
   */
  async trackEnhancedBilingualParity() {
    console.log('  🌐 Tracking enhanced bilingual parity...');
    
    const missingTranslations = [];
    let enContent = 0;
    let esContent = 0;
    
    // Check video scripts for bilingual coverage
    const scriptDirs = ['docs/video-scripts/global', 'docs/video-scripts/modules'];
    
    for (const scriptDir of scriptDirs) {
      try {
        const entries = await fs.readdir(scriptDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const enPath = path.join(scriptDir, entry.name, 'en');
            const esPath = path.join(scriptDir, entry.name, 'es');
            
            let hasEn = false;
            let hasEs = false;
            
            try {
              await fs.access(enPath);
              const enFiles = await fs.readdir(enPath);
              if (enFiles.length > 0) {
                hasEn = true;
                enContent++;
              }
            } catch {
              // EN directory doesn't exist
            }
            
            try {
              await fs.access(esPath);
              const esFiles = await fs.readdir(esPath);
              if (esFiles.length > 0) {
                hasEs = true;
                esContent++;
              }
            } catch {
              // ES directory doesn't exist
            }
            
            if (!hasEn || !hasEs) {
              missingTranslations.push({
                content: entry.name,
                contentType: scriptDir.includes('global') ? 'global' : 'module',
                missingLanguages: [
                  ...(hasEn ? [] : ['en']),
                  ...(hasEs ? [] : ['es'])
                ],
                priority: scriptDir.includes('global') ? 'high' : 'medium'
              });
            }
          }
        }
      } catch {
        // Script directory doesn't exist
      }
    }
    
    this.enhancedKpis.bilingualParity.missingTranslations = missingTranslations;
    this.enhancedKpis.bilingualParity.languageCoverage = {
      en: this.enhancedKpis.bilingualParity.totalContent > 0 
        ? Math.round((enContent / this.enhancedKpis.bilingualParity.totalContent) * 100) 
        : 0,
      es: this.enhancedKpis.bilingualParity.totalContent > 0 
        ? Math.round((esContent / this.enhancedKpis.bilingualParity.totalContent) * 100) 
        : 0
    };
  }

  /**
   * Track enhanced content coverage with module-specific details
   */
  async trackEnhancedContentCoverage() {
    console.log('  📊 Tracking enhanced content coverage...');
    
    const modules = await this.getModuleList();
    const moduleCompletionDetails = [];
    
    for (const module of modules) {
      const moduleDocsPath = path.join('docs/modules', module);
      let moduleExistingDocs = 0;
      let moduleRequiredDocs = this.config.requiredDocTypes.length;
      const missingDocs = [];
      
      for (const docType of this.config.requiredDocTypes) {
        const docPath = path.join(moduleDocsPath, docType);
        
        try {
          await fs.access(docPath);
          const stats = await fs.stat(docPath);
          
          if (stats.size > 100) {
            moduleExistingDocs++;
          } else {
            missingDocs.push({ 
              doc: docType, 
              reason: 'insufficient_content', 
              size: stats.size 
            });
          }
        } catch {
          missingDocs.push({ 
            doc: docType, 
            reason: 'missing_file' 
          });
        }
      }
      
      moduleCompletionDetails.push({
        module,
        completeness: Math.round((moduleExistingDocs / moduleRequiredDocs) * 100),
        existingDocs: moduleExistingDocs,
        requiredDocs: moduleRequiredDocs,
        missingDocs,
        priority: moduleExistingDocs < moduleRequiredDocs * 0.5 ? 'high' : 'medium'
      });
    }
    
    this.enhancedKpis.contentCoverage.moduleCompletionDetails = moduleCompletionDetails;
  }

  /**
   * Calculate trends by comparing with previous results
   */
  async calculateTrends() {
    console.log('📈 Calculating trends...');
    
    const previousResults = await this.loadPreviousResults();
    
    if (previousResults) {
      this.enhancedKpis.trends = {
        completeness: this.calculateTrend(
          this.enhancedKpis.documentationHealth.completeness,
          previousResults.kpis?.documentationHealth?.completeness || 0
        ),
        quality: this.calculateTrend(
          this.enhancedKpis.documentationHealth.quality,
          previousResults.kpis?.documentationHealth?.quality || 0
        ),
        linkHealth: this.calculateTrend(
          this.enhancedKpis.linkHealth.healthScore,
          previousResults.kpis?.linkHealth?.healthScore || 0
        ),
        reviewBacklog: this.calculateTrend(
          this.enhancedKpis.reviewBacklog.pendingReviews,
          previousResults.kpis?.reviewBacklog?.pendingReviews || 0,
          true // Lower is better for backlog
        )
      };
    }
    
    console.log('  📈 Trends calculated');
  }

  /**
   * Calculate individual trend
   */
  calculateTrend(current, previous, lowerIsBetter = false) {
    const change = current - previous;
    const percentChange = previous > 0 ? Math.round((change / previous) * 100) : 0;
    
    let trend = 'stable';
    if (Math.abs(percentChange) > 5) {
      if (lowerIsBetter) {
        trend = change < 0 ? 'improving' : 'declining';
      } else {
        trend = change > 0 ? 'improving' : 'declining';
      }
    }
    
    return {
      current,
      previous,
      change,
      percentChange,
      trend
    };
  }

  /**
   * Calculate overall health score
   */
  async calculateOverallHealth() {
    console.log('🏥 Calculating overall health score...');
    
    // Weighted scoring for different metrics
    const weights = {
      completeness: 0.25,
      quality: 0.20,
      linkHealth: 0.15,
      contentCoverage: 0.15,
      versionFreshness: 0.10,
      bilingualParity: 0.10,
      reviewBacklog: 0.05
    };
    
    const scores = {
      completeness: this.enhancedKpis.documentationHealth.completeness,
      quality: this.enhancedKpis.documentationHealth.quality,
      linkHealth: this.enhancedKpis.linkHealth.healthScore,
      contentCoverage: this.enhancedKpis.contentCoverage.coverageScore,
      versionFreshness: this.enhancedKpis.versionFreshness.currentVersionPercentage,
      bilingualParity: this.enhancedKpis.bilingualParity.parityScore,
      reviewBacklog: Math.max(0, 100 - (this.enhancedKpis.reviewBacklog.overdueReviews * 10))
    };
    
    let overallScore = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      overallScore += (scores[metric] || 0) * weight;
    }
    
    this.enhancedKpis.documentationHealth.overallScore = Math.round(overallScore);
    
    // Determine health status
    if (overallScore >= 90) {
      this.monitoringResults.overallHealth = 'excellent';
    } else if (overallScore >= 80) {
      this.monitoringResults.overallHealth = 'good';
    } else if (overallScore >= 70) {
      this.monitoringResults.overallHealth = 'fair';
    } else if (overallScore >= 60) {
      this.monitoringResults.overallHealth = 'poor';
    } else {
      this.monitoringResults.overallHealth = 'critical';
    }
    
    console.log(`  🏥 Overall Health: ${this.monitoringResults.overallHealth} (${this.enhancedKpis.documentationHealth.overallScore}%)`);
  }  
/**
   * Generate enhanced alerts based on thresholds
   */
  async generateEnhancedAlerts() {
    console.log('🚨 Generating enhanced alerts...');
    
    const alerts = [];
    
    // Critical alerts
    if (this.enhancedKpis.documentationHealth.overallScore < this.config.automationIntegration.alertThresholds.critical) {
      alerts.push({
        level: 'critical',
        type: 'overall_health',
        message: `Documentation health is critical at ${this.enhancedKpis.documentationHealth.overallScore}%`,
        metric: this.enhancedKpis.documentationHealth.overallScore,
        threshold: this.config.automationIntegration.alertThresholds.critical,
        actionRequired: true
      });
    }
    
    // Completeness alerts
    if (this.enhancedKpis.documentationHealth.completeness < 90) {
      const incompleteModules = this.enhancedKpis.contentCoverage.moduleCompletionDetails
        .filter(module => module.completeness < 100).length;
      
      alerts.push({
        level: 'warning',
        type: 'completeness',
        message: `Documentation completeness is ${this.enhancedKpis.documentationHealth.completeness}%, ${incompleteModules} modules incomplete`,
        metric: this.enhancedKpis.documentationHealth.completeness,
        threshold: 90,
        details: { incompleteModules }
      });
    }
    
    // Link health alerts
    if (this.enhancedKpis.linkHealth.healthScore < this.config.thresholds.linkHealthScore) {
      const highSeverityBrokenLinks = this.enhancedKpis.linkHealth.brokenLinkDetails
        .filter(link => link.severity === 'high').length;
      
      alerts.push({
        level: 'error',
        type: 'link_health',
        message: `Link health score is ${this.enhancedKpis.linkHealth.healthScore}%, ${this.enhancedKpis.linkHealth.brokenLinks} broken links (${highSeverityBrokenLinks} high severity)`,
        metric: this.enhancedKpis.linkHealth.healthScore,
        threshold: this.config.thresholds.linkHealthScore,
        details: { 
          totalBroken: this.enhancedKpis.linkHealth.brokenLinks,
          highSeverity: highSeverityBrokenLinks
        }
      });
    }
    
    // Review backlog alerts
    if (this.enhancedKpis.reviewBacklog.overdueReviews > 0) {
      alerts.push({
        level: 'warning',
        type: 'review_backlog',
        message: `${this.enhancedKpis.reviewBacklog.overdueReviews} reviews are overdue, burn-down rate: ${this.enhancedKpis.reviewBacklog.burnDownRate}%`,
        metric: this.enhancedKpis.reviewBacklog.overdueReviews,
        threshold: 0,
        details: {
          burnDownRate: this.enhancedKpis.reviewBacklog.burnDownRate,
          reviewVelocity: this.enhancedKpis.reviewBacklog.reviewVelocity
        }
      });
    }
    
    // Version freshness alerts
    const highPriorityUpdates = this.enhancedKpis.versionFreshness.documentsNeedingUpdate
      .filter(doc => doc.priority === 'high').length;
    
    if (highPriorityUpdates > 0) {
      alerts.push({
        level: 'info',
        type: 'version_freshness',
        message: `${highPriorityUpdates} documents need high-priority version updates`,
        metric: highPriorityUpdates,
        threshold: 0,
        details: {
          totalNeedingUpdate: this.enhancedKpis.versionFreshness.documentsNeedingUpdate.length
        }
      });
    }
    
    // Bilingual parity alerts
    if (this.enhancedKpis.bilingualParity.parityScore < this.config.thresholds.bilingualCoverage) {
      const highPriorityTranslations = this.enhancedKpis.bilingualParity.missingTranslations
        .filter(trans => trans.priority === 'high').length;
      
      alerts.push({
        level: 'info',
        type: 'bilingual_parity',
        message: `Bilingual parity is ${this.enhancedKpis.bilingualParity.parityScore}%, ${highPriorityTranslations} high-priority translations missing`,
        metric: this.enhancedKpis.bilingualParity.parityScore,
        threshold: this.config.thresholds.bilingualCoverage,
        details: {
          highPriorityMissing: highPriorityTranslations,
          totalMissing: this.enhancedKpis.bilingualParity.missingTranslations.length
        }
      });
    }
    
    this.monitoringResults.alerts = alerts;
    
    console.log(`  🚨 Generated ${alerts.length} enhanced alerts`);
    alerts.forEach(alert => {
      const emoji = alert.level === 'critical' ? '🔴' : alert.level === 'error' ? '🟠' : alert.level === 'warning' ? '🟡' : '🔵';
      console.log(`    ${emoji} ${alert.type}: ${alert.message}`);
    });
  }

  /**
   * Generate enhanced recommendations for improvement
   */
  async generateEnhancedRecommendations() {
    console.log('💡 Generating enhanced recommendations...');
    
    const recommendations = [];
    
    // Completeness recommendations with specific actions
    const incompleteModules = this.enhancedKpis.contentCoverage.moduleCompletionDetails
      .filter(module => module.completeness < 100);
    
    if (incompleteModules.length > 0) {
      const highPriorityModules = incompleteModules.filter(m => m.priority === 'high');
      
      recommendations.push({
        priority: highPriorityModules.length > 0 ? 'high' : 'medium',
        category: 'completeness',
        action: `Complete documentation for ${incompleteModules.length} modules (${highPriorityModules.length} high priority)`,
        impact: 'Improves overall documentation completeness and user experience',
        effort: 'medium',
        estimatedDays: Math.ceil(incompleteModules.length * 1.5),
        specificActions: incompleteModules.slice(0, 3).map(module => 
          `${module.module}: ${module.missingDocs.length} missing docs`
        )
      });
    }
    
    // Link health recommendations with specific broken links
    if (this.enhancedKpis.linkHealth.brokenLinks > 0) {
      const highSeverityLinks = this.enhancedKpis.linkHealth.brokenLinkDetails
        .filter(link => link.severity === 'high');
      
      recommendations.push({
        priority: 'high',
        category: 'link_health',
        action: `Fix ${this.enhancedKpis.linkHealth.brokenLinks} broken links (${highSeverityLinks.length} high severity)`,
        impact: 'Improves user experience and navigation reliability',
        effort: 'low',
        estimatedDays: 1,
        specificActions: highSeverityLinks.slice(0, 3).map(link => 
          `Fix: ${link.linkText} in ${link.sourceFile}`
        )
      });
    }
    
    // Review backlog recommendations with velocity analysis
    if (this.enhancedKpis.reviewBacklog.pendingReviews > 5) {
      const estimatedWeeks = this.enhancedKpis.reviewBacklog.reviewVelocity > 0
        ? Math.ceil(this.enhancedKpis.reviewBacklog.pendingReviews / this.enhancedKpis.reviewBacklog.reviewVelocity)
        : 4; // Default estimate
      
      recommendations.push({
        priority: 'medium',
        category: 'review_process',
        action: `Review ${this.enhancedKpis.reviewBacklog.pendingReviews} pending documents`,
        impact: 'Reduces review backlog and improves content quality',
        effort: 'medium',
        estimatedDays: estimatedWeeks * 7,
        specificActions: [
          `Current velocity: ${this.enhancedKpis.reviewBacklog.reviewVelocity} reviews/week`,
          `Estimated completion: ${estimatedWeeks} weeks`,
          `Focus on ${this.enhancedKpis.reviewBacklog.overdueReviews} overdue reviews first`
        ]
      });
    }
    
    // Bilingual parity recommendations with priority focus
    const highPriorityTranslations = this.enhancedKpis.bilingualParity.missingTranslations
      .filter(trans => trans.priority === 'high');
    
    if (highPriorityTranslations.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'bilingual_parity',
        action: `Create ${highPriorityTranslations.length} high-priority translations`,
        impact: 'Improves accessibility for Spanish-speaking users',
        effort: 'high',
        estimatedDays: Math.ceil(highPriorityTranslations.length * 2),
        specificActions: highPriorityTranslations.slice(0, 3).map(trans => 
          `Translate: ${trans.content} (${trans.missingLanguages.join(', ')})`
        )
      });
    }
    
    // Version freshness recommendations
    const highPriorityUpdates = this.enhancedKpis.versionFreshness.documentsNeedingUpdate
      .filter(doc => doc.priority === 'high');
    
    if (highPriorityUpdates.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'version_freshness',
        action: `Update ${highPriorityUpdates.length} high-priority documents to current version`,
        impact: 'Ensures documentation reflects current ecosystem state',
        effort: 'low',
        estimatedDays: 2,
        specificActions: highPriorityUpdates.slice(0, 3).map(doc => 
          `Update: ${doc.path} (${doc.ageInDays} days old)`
        )
      });
    }
    
    // OpenAPI/MCP coverage recommendations
    if (this.enhancedKpis.contentCoverage.openApiCoverage < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'api_documentation',
        action: 'Improve OpenAPI documentation coverage',
        impact: 'Better API documentation for developers',
        effort: 'medium',
        estimatedDays: 3,
        specificActions: [
          'Review modules with OpenAPI specs but missing documentation',
          'Generate API documentation from existing specs',
          'Add usage examples and integration guides'
        ]
      });
    }
    
    // Sort by priority and estimated impact
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.estimatedDays - b.estimatedDays; // Prefer quicker wins
    });
    
    this.monitoringResults.recommendations = recommendations;
    
    console.log(`  💡 Generated ${recommendations.length} enhanced recommendations`);
    recommendations.forEach(rec => {
      const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`    ${emoji} ${rec.category}: ${rec.action} (${rec.estimatedDays} days)`);
    });
  }

  /**
   * Generate comprehensive monitoring report
   */
  async generateComprehensiveReport() {
    console.log('📊 Generating comprehensive monitoring report...');
    
    // Update monitoring results with enhanced KPIs
    this.monitoringResults.kpis = this.enhancedKpis;
    this.monitoringResults.timestamp = new Date().toISOString();
    
    // Generate JSON report
    await fs.writeFile(
      'docs/enhanced-monitoring-report.json',
      JSON.stringify(this.monitoringResults, null, 2)
    );
    
    // Generate human-readable report
    await this.generateEnhancedHumanReadableReport();
    
    // Generate dashboard
    await this.dashboard.generateDashboard();
    
    // Save results for future trend analysis
    await this.saveResults();
    
    console.log('  📊 Enhanced reports generated successfully');
  }

  /**
   * Generate enhanced human-readable monitoring report
   */
  async generateEnhancedHumanReadableReport() {
    const timestamp = new Date().toLocaleString();
    
    const report = `# Enhanced Documentation Health Monitoring Report

**Generated:** ${timestamp}  
**Overall Health:** ${this.monitoringResults.overallHealth.toUpperCase()} (${this.enhancedKpis.documentationHealth.overallScore}%)

## 📊 Enhanced Key Performance Indicators

### Documentation Health
- **Completeness:** ${this.enhancedKpis.documentationHealth.completeness}%
- **Quality Score:** ${this.enhancedKpis.documentationHealth.quality}%
- **Overall Score:** ${this.enhancedKpis.documentationHealth.overallScore}%

### Version Freshness
- **Current Version Docs:** ${this.enhancedKpis.versionFreshness.currentVersionPercentage}%
- **Outdated Documents:** ${this.enhancedKpis.versionFreshness.outdatedDocs}
- **Average Document Age:** ${this.enhancedKpis.versionFreshness.averageDocumentAge} days
- **High Priority Updates:** ${this.enhancedKpis.versionFreshness.documentsNeedingUpdate.filter(d => d.priority === 'high').length}

### Review Backlog & Velocity
- **Pending Reviews:** ${this.enhancedKpis.reviewBacklog.pendingReviews}
- **Overdue Reviews:** ${this.enhancedKpis.reviewBacklog.overdueReviews}
- **Average Review Time:** ${this.enhancedKpis.reviewBacklog.averageReviewTime} days
- **Review Velocity:** ${this.enhancedKpis.reviewBacklog.reviewVelocity} reviews/week
- **Burn-down Rate:** ${this.enhancedKpis.reviewBacklog.burnDownRate}%

### Link Health Analysis
- **Health Score:** ${this.enhancedKpis.linkHealth.healthScore}%
- **Total Links:** ${this.enhancedKpis.linkHealth.totalLinks}
- **Broken Links:** ${this.enhancedKpis.linkHealth.brokenLinks}
- **Internal Links:** ${this.enhancedKpis.linkHealth.internalLinks}
- **External Links:** ${this.enhancedKpis.linkHealth.externalLinks}
- **High Severity Broken:** ${this.enhancedKpis.linkHealth.brokenLinkDetails.filter(l => l.severity === 'high').length}

### Bilingual Parity Analysis
- **Parity Score:** ${this.enhancedKpis.bilingualParity.parityScore}%
- **Bilingual Content:** ${this.enhancedKpis.bilingualParity.bilingualContent}/${this.enhancedKpis.bilingualParity.totalContent}
- **English Coverage:** ${this.enhancedKpis.bilingualParity.languageCoverage.en}%
- **Spanish Coverage:** ${this.enhancedKpis.bilingualParity.languageCoverage.es}%
- **High Priority Missing:** ${this.enhancedKpis.bilingualParity.missingTranslations.filter(t => t.priority === 'high').length}

### Content Coverage Details
- **Coverage Score:** ${this.enhancedKpis.contentCoverage.coverageScore}%
- **Complete Modules:** ${this.enhancedKpis.contentCoverage.completeModules}/${this.enhancedKpis.contentCoverage.totalModules}
- **OpenAPI Coverage:** ${this.enhancedKpis.contentCoverage.openApiCoverage}%
- **MCP Coverage:** ${this.enhancedKpis.contentCoverage.mcpCoverage}%
- **High Priority Incomplete:** ${this.enhancedKpis.contentCoverage.moduleCompletionDetails.filter(m => m.priority === 'high').length}

## 📈 Trends Analysis

${Object.entries(this.enhancedKpis.trends).map(([metric, trend]) => 
  `- **${metric.charAt(0).toUpperCase() + metric.slice(1)}:** ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change}, ${trend.percentChange}%)`
).join('\n')}

## 🚨 Enhanced Alerts

${this.monitoringResults.alerts.length === 0 ? 'No active alerts.' : 
  this.monitoringResults.alerts.map(alert => 
    `- **${alert.level.toUpperCase()}:** ${alert.message}${alert.details ? ` (${JSON.stringify(alert.details)})` : ''}`
  ).join('\n')
}

## 💡 Enhanced Recommendations

${this.monitoringResults.recommendations.map((rec, index) => 
  `${index + 1}. **${rec.priority.toUpperCase()}:** ${rec.action}
   - **Impact:** ${rec.impact}
   - **Effort:** ${rec.effort} (${rec.estimatedDays} days)
   - **Actions:** ${rec.specificActions ? rec.specificActions.join(', ') : 'See details'}`
).join('\n\n')}

## 🔧 Automation Integration Status

- **Last Run:** ${this.monitoringResults.timestamp}
- **Next Scheduled Run:** ${this.calculateNextRun()}
- **Reporting Schedule:** ${this.config.automationIntegration.reportingSchedule}
- **Integration Status:** ${JSON.stringify(this.monitoringResults.automationStatus.integrationStatus, null, 2)}

## 📋 Action Items Summary

### Immediate Actions (High Priority)
${this.monitoringResults.recommendations
  .filter(r => r.priority === 'high')
  .map(r => `- ${r.action}`)
  .join('\n') || 'None'}

### Short-term Actions (Medium Priority)
${this.monitoringResults.recommendations
  .filter(r => r.priority === 'medium')
  .map(r => `- ${r.action}`)
  .join('\n') || 'None'}

### Long-term Actions (Low Priority)
${this.monitoringResults.recommendations
  .filter(r => r.priority === 'low')
  .map(r => `- ${r.action}`)
  .join('\n') || 'None'}

---

*This enhanced report was automatically generated by the Enhanced Documentation Monitoring System*
*For detailed data, see: enhanced-monitoring-report.json*
*For interactive dashboard, see: monitoring-dashboard.html*
`;

    await fs.writeFile('docs/enhanced-monitoring-report.md', report);
  }

  /**
   * Integrate with existing automation infrastructure
   */
  async integrateWithAutomation() {
    console.log('🔧 Integrating with automation infrastructure...');
    
    const integrationStatus = {};
    
    // Update npm scripts integration status
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      integrationStatus.npmScripts = {
        status: 'active',
        availableCommands: Object.keys(packageJson.scripts).filter(script => 
          script.startsWith('docs:monitor') || script.startsWith('docs:kpi')
        ),
        enhancedCommands: [
          'docs:monitor:enhanced',
          'docs:kpi:enhanced',
          'docs:alerts:enhanced'
        ]
      };
    } catch (error) {
      integrationStatus.npmScripts = { status: 'error', error: error.message };
    }
    
    // Check CI/CD integration
    try {
      await fs.access('.github/workflows');
      integrationStatus.cicd = { 
        status: 'available', 
        platform: 'github-actions',
        recommendedWorkflow: 'docs-monitoring-enhanced.yml'
      };
    } catch {
      integrationStatus.cicd = { status: 'not_configured' };
    }
    
    // Check existing monitoring infrastructure
    try {
      await fs.access('scripts/docs-monitoring-system.mjs');
      integrationStatus.existingMonitoring = { 
        status: 'detected',
        enhanced: true,
        compatibility: 'full'
      };
    } catch {
      integrationStatus.existingMonitoring = { status: 'not_found' };
    }
    
    // Update automation status
    this.monitoringResults.automationStatus = {
      lastRun: new Date().toISOString(),
      nextScheduledRun: this.calculateNextRun(),
      integrationStatus
    };
    
    console.log('  🔧 Enhanced automation integration completed');
  }  /**
   * 
Helper methods
   */
  async getModuleList() {
    try {
      const modulesDir = 'docs/modules';
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      return [];
    }
  }

  async findAllMarkdownFiles(dir) {
    const files = [];
    
    const scanDirectory = async (currentDir) => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    await scanDirectory(dir);
    return files;
  }

  async findVideoScriptFiles(dir) {
    const files = [];
    
    const scanDirectory = async (currentDir) => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.md') && 
                     (entry.name.includes('script') || currentDir.includes('video-scripts'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    await scanDirectory(dir);
    return files;
  }

  extractFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontMatterRegex);
    
    if (!match) return {};
    
    const frontMatter = {};
    const lines = match[1].split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        frontMatter[key] = value;
      }
    }
    
    return frontMatter;
  }

  extractScriptMetadata(content) {
    const metadata = this.extractFrontMatter(content);
    
    const reviewMatch = content.match(/review[_\s]?status:\s*([^\n]+)/i);
    if (reviewMatch) {
      metadata.reviewStatus = reviewMatch[1].trim();
    }
    
    return metadata;
  }

  extractInternalLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2]
      });
    }
    
    return links;
  }

  async loadPreviousResults() {
    try {
      const previousData = await fs.readFile('docs/enhanced-monitoring-report.json', 'utf8');
      return JSON.parse(previousData);
    } catch {
      // Try fallback to regular monitoring report
      try {
        const fallbackData = await fs.readFile('docs/monitoring-report.json', 'utf8');
        return JSON.parse(fallbackData);
      } catch {
        return null;
      }
    }
  }

  async saveResults() {
    // Save current results for future trend analysis
    const historyEntry = {
      timestamp: new Date().toISOString(),
      kpis: this.enhancedKpis,
      overallHealth: this.monitoringResults.overallHealth,
      alerts: this.monitoringResults.alerts.length,
      recommendations: this.monitoringResults.recommendations.length
    };

    // Load existing history
    let history = [];
    try {
      const historyData = await fs.readFile('docs/monitoring-history.json', 'utf8');
      history = JSON.parse(historyData);
    } catch {
      // No existing history
    }

    // Add new entry and keep last 30 entries
    history.push(historyEntry);
    history = history.slice(-30);

    await fs.writeFile('docs/monitoring-history.json', JSON.stringify(history, null, 2));
  }

  calculateNextRun() {
    const now = new Date();
    const schedule = this.config.automationIntegration.reportingSchedule;
    
    switch (schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        now.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        now.setDate(1);
        now.setHours(9, 0, 0, 0);
        break;
      default:
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0);
    }
    
    return now.toISOString();
  }
}

// CLI interface
async function main() {
  const monitoring = new EnhancedDocumentationMonitoringSystem();
  const command = process.argv[2];

  switch (command) {
    case 'monitor':
      const results = await monitoring.runHealthMonitoring();
      console.log('\n📊 Enhanced Monitoring Summary:');
      console.log(`Overall Health: ${results.overallHealth} (${results.kpis.documentationHealth.overallScore}%)`);
      console.log(`Alerts: ${results.alerts.length} (${results.alerts.filter(a => a.level === 'critical').length} critical)`);
      console.log(`Recommendations: ${results.recommendations.length} (${results.recommendations.filter(r => r.priority === 'high').length} high priority)`);
      console.log(`\nReports generated:`);
      console.log(`- Enhanced JSON: docs/enhanced-monitoring-report.json`);
      console.log(`- Enhanced Markdown: docs/enhanced-monitoring-report.md`);
      console.log(`- Dashboard: docs/monitoring-dashboard.html`);
      break;
    
    case 'report':
      await monitoring.runHealthMonitoring();
      console.log('📊 Enhanced comprehensive monitoring report generated');
      break;
    
    case 'kpis':
      await monitoring.runHealthMonitoring();
      console.log(JSON.stringify(monitoring.enhancedKpis, null, 2));
      break;
    
    case 'alerts':
      await monitoring.runHealthMonitoring();
      console.log('\n🚨 Enhanced Active Alerts:');
      if (monitoring.monitoringResults.alerts.length === 0) {
        console.log('  ✅ No active alerts');
      } else {
        monitoring.monitoringResults.alerts.forEach(alert => {
          const emoji = alert.level === 'critical' ? '🔴' : alert.level === 'error' ? '🟠' : alert.level === 'warning' ? '🟡' : '🔵';
          console.log(`  ${emoji} ${alert.level.toUpperCase()}: ${alert.message}`);
          if (alert.details) {
            console.log(`     Details: ${JSON.stringify(alert.details)}`);
          }
        });
      }
      break;
    
    case 'recommendations':
      await monitoring.runHealthMonitoring();
      console.log('\n💡 Enhanced Recommendations:');
      if (monitoring.monitoringResults.recommendations.length === 0) {
        console.log('  ✅ No recommendations at this time');
      } else {
        monitoring.monitoringResults.recommendations.forEach((rec, index) => {
          const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`  ${index + 1}. ${emoji} ${rec.priority.toUpperCase()}: ${rec.action}`);
          console.log(`     Impact: ${rec.impact}`);
          console.log(`     Effort: ${rec.effort} (${rec.estimatedDays} days)`);
          if (rec.specificActions) {
            console.log(`     Actions: ${rec.specificActions.slice(0, 2).join(', ')}${rec.specificActions.length > 2 ? '...' : ''}`);
          }
          console.log('');
        });
      }
      break;
    
    case 'trends':
      await monitoring.runHealthMonitoring();
      console.log('\n📈 Trends Analysis:');
      Object.entries(monitoring.enhancedKpis.trends).forEach(([metric, trend]) => {
        const emoji = trend.trend === 'improving' ? '📈' : trend.trend === 'declining' ? '📉' : '➡️';
        console.log(`  ${emoji} ${metric}: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change}, ${trend.percentChange}%)`);
      });
      break;
    
    default:
      console.log(`
Usage: node docs-monitoring-system-enhanced.mjs <command>

Commands:
  monitor         - Run complete enhanced health monitoring
  report          - Generate comprehensive enhanced reports
  kpis            - Output enhanced KPIs as JSON
  alerts          - Show enhanced active alerts with details
  recommendations - Show enhanced recommendations with actions
  trends          - Show trends analysis

Examples:
  node docs-monitoring-system-enhanced.mjs monitor
  node docs-monitoring-system-enhanced.mjs alerts
  node docs-monitoring-system-enhanced.mjs recommendations
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Enhanced monitoring failed:', error);
    process.exit(1);
  });
}

export default EnhancedDocumentationMonitoringSystem;