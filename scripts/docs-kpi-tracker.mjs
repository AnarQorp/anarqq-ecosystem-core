#!/usr/bin/env node

/**
 * Documentation KPI Tracking System
 * Tracks key performance indicators for documentation health and quality
 * Requirements: 8.1, 8.2, 8.3
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationKPITracker {
  constructor() {
    this.currentEcosystemVersion = 'v2.0.0';
    this.thresholds = {
      documentFreshness: 90, // days
      linkHealthScore: 95, // percentage
      bilingualCoverage: 80, // percentage
      reviewBacklogDays: 14, // days
      contentCoverage: 90 // percentage
    };
    
    this.kpis = {
      documentationHealth: {
        completeness: 0,
        quality: 0,
        overallScore: 0
      },
      versionFreshness: {
        currentVersionPercentage: 0,
        outdatedDocs: 0,
        averageDocumentAge: 0
      },
      reviewBacklog: {
        pendingReviews: 0,
        overdueReviews: 0,
        averageReviewTime: 0
      },
      linkHealth: {
        totalLinks: 0,
        brokenLinks: 0,
        healthScore: 0
      },
      bilingualParity: {
        totalContent: 0,
        bilingualContent: 0,
        parityScore: 0
      },
      contentCoverage: {
        totalModules: 0,
        completeModules: 0,
        coverageScore: 0,
        openApiCoverage: 0,
        mcpCoverage: 0
      }
    };
  }

  /**
   * Track all KPIs and generate report
   */
  async trackAllKPIs() {
    console.log('📊 Tracking documentation KPIs...');
    
    await this.trackDocumentationCompleteness();
    await this.trackVersionFreshness();
    await this.trackReviewBacklog();
    await this.trackLinkHealth();
    await this.trackBilingualParity();
    await this.trackContentCoverage();
    
    this.calculateOverallHealth();
    
    return this.kpis;
  }

  /**
   * Track documentation completeness
   */
  async trackDocumentationCompleteness() {
    console.log('  📋 Tracking completeness...');
    
    const modules = await this.getModuleList();
    const requiredDocTypes = [
      'README.md', 'api-reference.md', 'mcp-tools.md', 'deployment-guide.md',
      'integration-guide.md', 'examples.md', 'runbook.md', 'troubleshooting.md'
    ];
    
    let totalRequired = 0;
    let existing = 0;
    
    for (const module of modules) {
      for (const docType of requiredDocTypes) {
        totalRequired++;
        const docPath = path.join('docs/modules', module, docType);
        
        try {
          const stats = await fs.stat(docPath);
          if (stats.size > 100) { // Has meaningful content
            existing++;
          }
        } catch {
          // Document doesn't exist
        }
      }
    }
    
    this.kpis.documentationHealth.completeness = totalRequired > 0 
      ? Math.round((existing / totalRequired) * 100) 
      : 0;
  }

  /**
   * Track version freshness
   */
  async trackVersionFreshness() {
    console.log('  🕐 Tracking version freshness...');
    
    const allDocs = await this.findAllMarkdownFiles('docs');
    let currentVersionDocs = 0;
    let outdatedDocs = 0;
    let totalAge = 0;
    let docsWithMetadata = 0;
    
    for (const docPath of allDocs) {
      try {
        const content = await fs.readFile(docPath, 'utf8');
        const metadata = this.extractFrontMatter(content);
        const stats = await fs.stat(docPath);
        
        const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
        totalAge += ageInDays;
        
        if (metadata.ecosystemVersion) {
          docsWithMetadata++;
          if (metadata.ecosystemVersion === this.currentEcosystemVersion) {
            currentVersionDocs++;
          } else {
            outdatedDocs++;
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.kpis.versionFreshness.currentVersionPercentage = docsWithMetadata > 0 
      ? Math.round((currentVersionDocs / docsWithMetadata) * 100) 
      : 0;
    this.kpis.versionFreshness.outdatedDocs = outdatedDocs;
    this.kpis.versionFreshness.averageDocumentAge = allDocs.length > 0 
      ? Math.round(totalAge / allDocs.length) 
      : 0;
  }

  /**
   * Track review backlog
   */
  async trackReviewBacklog() {
    console.log('  📝 Tracking review backlog...');
    
    const scriptFiles = await this.findVideoScriptFiles('docs/video-scripts');
    let pendingReviews = 0;
    let overdueReviews = 0;
    let totalReviewTime = 0;
    
    for (const scriptPath of scriptFiles) {
      try {
        const content = await fs.readFile(scriptPath, 'utf8');
        const metadata = this.extractScriptMetadata(content);
        const stats = await fs.stat(scriptPath);
        
        if (metadata.reviewStatus) {
          const daysSinceModified = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
          
          if (['draft', 'pending'].includes(metadata.reviewStatus.toLowerCase())) {
            pendingReviews++;
            if (daysSinceModified > this.thresholds.reviewBacklogDays) {
              overdueReviews++;
            }
            totalReviewTime += daysSinceModified;
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.kpis.reviewBacklog.pendingReviews = pendingReviews;
    this.kpis.reviewBacklog.overdueReviews = overdueReviews;
    this.kpis.reviewBacklog.averageReviewTime = pendingReviews > 0 
      ? Math.round(totalReviewTime / pendingReviews) 
      : 0;
  }

  /**
   * Track link health
   */
  async trackLinkHealth() {
    console.log('  🔗 Tracking link health...');
    
    const allDocs = await this.findAllMarkdownFiles('docs');
    let totalLinks = 0;
    let brokenLinks = 0;
    
    for (const docPath of allDocs) {
      try {
        const content = await fs.readFile(docPath, 'utf8');
        const links = this.extractInternalLinks(content);
        
        for (const link of links) {
          totalLinks++;
          
          if (!link.url.startsWith('http')) {
            const targetPath = path.resolve(path.dirname(docPath), link.url);
            
            try {
              await fs.access(targetPath);
            } catch {
              brokenLinks++;
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    this.kpis.linkHealth.totalLinks = totalLinks;
    this.kpis.linkHealth.brokenLinks = brokenLinks;
    this.kpis.linkHealth.healthScore = totalLinks > 0 
      ? Math.round(((totalLinks - brokenLinks) / totalLinks) * 100) 
      : 100;
  }

  /**
   * Track bilingual parity
   */
  async trackBilingualParity() {
    console.log('  🌐 Tracking bilingual parity...');
    
    let totalContent = 0;
    let bilingualContent = 0;
    
    // Check video scripts for bilingual coverage
    const scriptDirs = ['docs/video-scripts/global', 'docs/video-scripts/modules'];
    
    for (const scriptDir of scriptDirs) {
      try {
        const entries = await fs.readdir(scriptDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            totalContent++;
            
            const enPath = path.join(scriptDir, entry.name, 'en');
            const esPath = path.join(scriptDir, entry.name, 'es');
            
            try {
              await fs.access(enPath);
              await fs.access(esPath);
              
              const enFiles = await fs.readdir(enPath);
              const esFiles = await fs.readdir(esPath);
              
              if (enFiles.length > 0 && esFiles.length > 0) {
                bilingualContent++;
              }
            } catch {
              // One or both language directories don't exist
            }
          }
        }
      } catch {
        // Script directory doesn't exist
      }
    }
    
    this.kpis.bilingualParity.totalContent = totalContent;
    this.kpis.bilingualParity.bilingualContent = bilingualContent;
    this.kpis.bilingualParity.parityScore = totalContent > 0 
      ? Math.round((bilingualContent / totalContent) * 100) 
      : 0;
  }

  /**
   * Track content coverage
   */
  async trackContentCoverage() {
    console.log('  📊 Tracking content coverage...');
    
    const modules = await this.getModuleList();
    let completeModules = 0;
    let openApiModules = 0;
    let mcpModules = 0;
    let totalOpenApiPossible = 0;
    let totalMcpPossible = 0;
    
    const requiredDocTypes = [
      'README.md', 'api-reference.md', 'mcp-tools.md', 'deployment-guide.md',
      'integration-guide.md', 'examples.md', 'runbook.md', 'troubleshooting.md'
    ];
    
    for (const module of modules) {
      const moduleDocsPath = path.join('docs/modules', module);
      let moduleComplete = true;
      
      // Check if all required docs exist with meaningful content
      for (const docType of requiredDocTypes) {
        const docPath = path.join(moduleDocsPath, docType);
        
        try {
          const stats = await fs.stat(docPath);
          if (stats.size <= 100) {
            moduleComplete = false;
          }
        } catch {
          moduleComplete = false;
        }
      }
      
      if (moduleComplete) {
        completeModules++;
      }
      
      // Check for OpenAPI documentation
      const openApiPath = path.join('modules', module, 'openapi.yaml');
      try {
        await fs.access(openApiPath);
        totalOpenApiPossible++;
        
        const apiDocPath = path.join(moduleDocsPath, 'api-reference.md');
        try {
          const content = await fs.readFile(apiDocPath, 'utf8');
          if (content.includes('openapi') || content.includes('API')) {
            openApiModules++;
          }
        } catch {
          // API doc doesn't exist
        }
      } catch {
        // OpenAPI spec doesn't exist
      }
      
      // Check for MCP documentation
      const mcpPath = path.join('modules', module, 'mcp.json');
      try {
        await fs.access(mcpPath);
        totalMcpPossible++;
        
        const mcpDocPath = path.join(moduleDocsPath, 'mcp-tools.md');
        try {
          const content = await fs.readFile(mcpDocPath, 'utf8');
          if (content.includes('MCP') || content.includes('tools')) {
            mcpModules++;
          }
        } catch {
          // MCP doc doesn't exist
        }
      } catch {
        // MCP spec doesn't exist
      }
    }
    
    this.kpis.contentCoverage.totalModules = modules.length;
    this.kpis.contentCoverage.completeModules = completeModules;
    this.kpis.contentCoverage.coverageScore = modules.length > 0 
      ? Math.round((completeModules / modules.length) * 100) 
      : 0;
    this.kpis.contentCoverage.openApiCoverage = totalOpenApiPossible > 0 
      ? Math.round((openApiModules / totalOpenApiPossible) * 100) 
      : 0;
    this.kpis.contentCoverage.mcpCoverage = totalMcpPossible > 0 
      ? Math.round((mcpModules / totalMcpPossible) * 100) 
      : 0;
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth() {
    const weights = {
      completeness: 0.25,
      linkHealth: 0.20,
      contentCoverage: 0.20,
      versionFreshness: 0.15,
      bilingualParity: 0.10,
      reviewBacklog: 0.10
    };
    
    const scores = {
      completeness: this.kpis.documentationHealth.completeness,
      linkHealth: this.kpis.linkHealth.healthScore,
      contentCoverage: this.kpis.contentCoverage.coverageScore,
      versionFreshness: this.kpis.versionFreshness.currentVersionPercentage,
      bilingualParity: this.kpis.bilingualParity.parityScore,
      reviewBacklog: Math.max(0, 100 - (this.kpis.reviewBacklog.overdueReviews * 10))
    };
    
    let overallScore = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      overallScore += (scores[metric] || 0) * weight;
    }
    
    this.kpis.documentationHealth.overallScore = Math.round(overallScore);
  }

  /**
   * Generate KPI report
   */
  async generateKPIReport() {
    const report = {
      timestamp: new Date().toISOString(),
      kpis: this.kpis,
      summary: {
        overallScore: this.kpis.documentationHealth.overallScore,
        healthStatus: this.getHealthStatus(this.kpis.documentationHealth.overallScore),
        keyMetrics: {
          completeness: `${this.kpis.documentationHealth.completeness}%`,
          linkHealth: `${this.kpis.linkHealth.healthScore}%`,
          contentCoverage: `${this.kpis.contentCoverage.coverageScore}%`,
          bilingualParity: `${this.kpis.bilingualParity.parityScore}%`,
          averageDocAge: `${this.kpis.versionFreshness.averageDocumentAge} days`,
          pendingReviews: this.kpis.reviewBacklog.pendingReviews
        }
      },
      alerts: this.generateAlerts(),
      trends: {
        // Placeholder for future trend analysis
        completeness: { trend: 'stable', change: 0 },
        linkHealth: { trend: 'stable', change: 0 },
        contentCoverage: { trend: 'stable', change: 0 }
      }
    };

    // Save report
    await fs.writeFile('docs/kpi-report.json', JSON.stringify(report, null, 2));
    
    // Generate human-readable report
    await this.generateHumanReadableKPIReport(report);
    
    return report;
  }

  /**
   * Generate human-readable KPI report
   */
  async generateHumanReadableKPIReport(report) {
    const timestamp = new Date().toLocaleString();
    
    const humanReport = `# Documentation KPI Report

**Generated:** ${timestamp}  
**Overall Score:** ${report.summary.overallScore}%  
**Health Status:** ${report.summary.healthStatus}

## 📊 Key Performance Indicators

### Documentation Health
- **Completeness:** ${report.summary.keyMetrics.completeness}
- **Overall Score:** ${report.summary.overallScore}%

### Version Freshness
- **Current Version Docs:** ${this.kpis.versionFreshness.currentVersionPercentage}%
- **Outdated Documents:** ${this.kpis.versionFreshness.outdatedDocs}
- **Average Document Age:** ${report.summary.keyMetrics.averageDocAge}

### Review Backlog
- **Pending Reviews:** ${report.summary.keyMetrics.pendingReviews}
- **Overdue Reviews:** ${this.kpis.reviewBacklog.overdueReviews}
- **Average Review Time:** ${this.kpis.reviewBacklog.averageReviewTime} days

### Link Health
- **Health Score:** ${report.summary.keyMetrics.linkHealth}
- **Total Links:** ${this.kpis.linkHealth.totalLinks}
- **Broken Links:** ${this.kpis.linkHealth.brokenLinks}

### Bilingual Parity
- **Parity Score:** ${report.summary.keyMetrics.bilingualParity}
- **Bilingual Content:** ${this.kpis.bilingualParity.bilingualContent}/${this.kpis.bilingualParity.totalContent}

### Content Coverage
- **Coverage Score:** ${report.summary.keyMetrics.contentCoverage}
- **Complete Modules:** ${this.kpis.contentCoverage.completeModules}/${this.kpis.contentCoverage.totalModules}
- **OpenAPI Coverage:** ${this.kpis.contentCoverage.openApiCoverage}%
- **MCP Coverage:** ${this.kpis.contentCoverage.mcpCoverage}%

## 🚨 Alerts

${report.alerts.length === 0 ? 'No alerts at this time.' : report.alerts.map(alert => 
  `- **${alert.type.toUpperCase()}:** ${alert.message}`
).join('\n')}

## 📈 Health Status

${this.getHealthStatusDescription(report.summary.healthStatus)}

---

*This report was automatically generated by the Documentation KPI Tracking System*
`;

    await fs.writeFile('docs/kpi-report.md', humanReport);
  }

  /**
   * Generate alerts based on thresholds
   */
  generateAlerts() {
    const alerts = [];
    
    if (this.kpis.documentationHealth.completeness < 90) {
      alerts.push({
        type: 'completeness',
        level: 'warning',
        message: `Documentation completeness is ${this.kpis.documentationHealth.completeness}%, below 90% threshold`
      });
    }
    
    if (this.kpis.linkHealth.healthScore < this.thresholds.linkHealthScore) {
      alerts.push({
        type: 'link_health',
        level: 'error',
        message: `Link health score is ${this.kpis.linkHealth.healthScore}%, below ${this.thresholds.linkHealthScore}% threshold`
      });
    }
    
    if (this.kpis.bilingualParity.parityScore < this.thresholds.bilingualCoverage) {
      alerts.push({
        type: 'bilingual_parity',
        level: 'warning',
        message: `Bilingual parity is ${this.kpis.bilingualParity.parityScore}%, below ${this.thresholds.bilingualCoverage}% threshold`
      });
    }
    
    if (this.kpis.reviewBacklog.overdueReviews > 0) {
      alerts.push({
        type: 'review_backlog',
        level: 'warning',
        message: `${this.kpis.reviewBacklog.overdueReviews} reviews are overdue`
      });
    }
    
    return alerts;
  }

  /**
   * Helper methods
   */
  getHealthStatus(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  getHealthStatusDescription(status) {
    const descriptions = {
      'Excellent': '🟢 Documentation is in excellent condition',
      'Good': '🟡 Documentation is in good condition with minor improvements needed',
      'Fair': '🟠 Documentation needs attention in several areas',
      'Poor': '🔴 Documentation has significant issues requiring immediate attention',
      'Critical': '🚨 Documentation is in critical condition and requires urgent action'
    };
    return descriptions[status] || 'Unknown status';
  }

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
}

// CLI interface
async function main() {
  const tracker = new DocumentationKPITracker();
  const command = process.argv[2];

  switch (command) {
    case 'track':
      const kpis = await tracker.trackAllKPIs();
      console.log('\n📊 KPI Summary:');
      console.log(`Overall Score: ${kpis.documentationHealth.overallScore}%`);
      console.log(`Completeness: ${kpis.documentationHealth.completeness}%`);
      console.log(`Link Health: ${kpis.linkHealth.healthScore}%`);
      console.log(`Content Coverage: ${kpis.contentCoverage.coverageScore}%`);
      break;
    
    case 'report':
      await tracker.trackAllKPIs();
      const report = await tracker.generateKPIReport();
      console.log('📊 KPI report generated');
      console.log(`Overall Health: ${report.summary.healthStatus} (${report.summary.overallScore}%)`);
      break;
    
    case 'json':
      await tracker.trackAllKPIs();
      console.log(JSON.stringify(tracker.kpis, null, 2));
      break;
    
    default:
      console.log(`
Usage: node docs-kpi-tracker.mjs <command>

Commands:
  track   - Track all KPIs and display summary
  report  - Generate detailed KPI report
  json    - Output KPIs as JSON

Examples:
  node docs-kpi-tracker.mjs track
  node docs-kpi-tracker.mjs report
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ KPI tracking failed:', error);
    process.exit(1);
  });
}

export default DocumentationKPITracker;