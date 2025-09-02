#!/usr/bin/env node

/**
 * Release Integration System
 * Automatically triggers documentation portal updates when modules are released
 * Integrates with GitHub releases, NPM publishes, and Docker pushes
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import MasterIndexAutomation from './master-index-automation.mjs';
import ContentQualityValidator from './content-quality-validator.mjs';

class ReleaseIntegration {
  constructor() {
    this.indexAutomation = new MasterIndexAutomation();
    this.qualityValidator = new ContentQualityValidator();
    this.webhookEndpoints = {
      github: '/webhooks/github/release',
      npm: '/webhooks/npm/publish',
      docker: '/webhooks/docker/push'
    };
    
    this.releaseConfig = {
      qualityThreshold: 70,        // Minimum quality score for public release
      requiredValidations: [       // Required validations before release
        'completeness',
        'links',
        'roles',
        'migration',
        'quality'
      ],
      notificationChannels: {
        slack: process.env.SLACK_WEBHOOK_URL,
        email: process.env.NOTIFICATION_EMAIL,
        github: true
      }
    };
  }

  async init() {
    await this.indexAutomation.init();
  }

  /**
   * Handle release webhook from various sources
   */
  async handleReleaseWebhook(payload, source) {
    console.log(`🔔 Received ${source} release webhook`);
    
    try {
      const release = this.parseReleasePayload(payload, source);
      
      if (this.isModuleRelease(release)) {
        await this.processModuleRelease(release);
      } else if (this.isEcosystemRelease(release)) {
        await this.processEcosystemRelease(release);
      }
      
      return { success: true, release };
    } catch (error) {
      console.error('❌ Release webhook processing failed:', error);
      await this.notifyReleaseFailure(error, payload, source);
      throw error;
    }
  }

  /**
   * Process individual module release
   */
  async processModuleRelease(release) {
    console.log(`🚀 Processing module release: ${release.module}@${release.version}`);
    
    // Step 1: Validate release readiness
    await this.validateReleaseReadiness(release);
    
    // Step 2: Update module documentation
    await this.updateModuleDocumentation(release);
    
    // Step 3: Regenerate portal content
    await this.regeneratePortalContent(release);
    
    // Step 4: Update version index
    await this.updateVersionIndex(release);
    
    // Step 5: Deploy updates
    await this.deployPortalUpdates(release);
    
    // Step 6: Notify stakeholders
    await this.notifyReleaseSuccess(release);
    
    console.log(`✅ Module release processed successfully: ${release.module}@${release.version}`);
  }

  /**
   * Process ecosystem-wide release
   */
  async processEcosystemRelease(release) {
    console.log(`🌐 Processing ecosystem release: ${release.version}`);
    
    // Step 1: Validate entire ecosystem
    await this.validateEcosystemReadiness(release);
    
    // Step 2: Update all documentation
    await this.updateAllDocumentation(release);
    
    // Step 3: Generate complete portal
    await this.generateCompletePortal(release);
    
    // Step 4: Create release artifacts
    await this.createReleaseArtifacts(release);
    
    // Step 5: Deploy to production
    await this.deployToProduction(release);
    
    // Step 6: Announce release
    await this.announceEcosystemRelease(release);
    
    console.log(`✅ Ecosystem release processed successfully: ${release.version}`);
  }

  /**
   * Validate release readiness
   */
  async validateReleaseReadiness(release) {
    console.log(`🔍 Validating release readiness for ${release.module}@${release.version}`);
    
    const validationResults = {};
    
    // Run all required validations
    for (const validation of this.releaseConfig.requiredValidations) {
      console.log(`  Running ${validation} validation...`);
      
      switch (validation) {
        case 'completeness':
          validationResults.completeness = await this.indexAutomation.runCompletenessCheck();
          break;
        case 'links':
          validationResults.links = await this.indexAutomation.runLinkValidation();
          break;
        case 'roles':
          validationResults.roles = await this.indexAutomation.runRoleCoverageCheck();
          break;
        case 'migration':
          validationResults.migration = await this.indexAutomation.runMigrationSyncCheck();
          break;
        case 'quality':
          const qualityReport = await this.qualityValidator.validateAllDocuments();
          validationResults.quality = {
            passed: qualityReport.summary.averageQualityScore >= this.releaseConfig.qualityThreshold,
            score: qualityReport.summary.averageQualityScore,
            errors: qualityReport.summary.totalErrors
          };
          break;
      }
    }
    
    // Check if all validations passed
    const failedValidations = Object.entries(validationResults)
      .filter(([_, result]) => !result.passed)
      .map(([name, _]) => name);
    
    if (failedValidations.length > 0) {
      throw new Error(`Release validation failed: ${failedValidations.join(', ')}`);
    }
    
    console.log('  ✅ All release validations passed');
    return validationResults;
  }

  /**
   * Update module documentation from repository
   */
  async updateModuleDocumentation(release) {
    console.log(`📝 Updating documentation for ${release.module}@${release.version}`);
    
    // Fetch latest documentation from module repository
    const latestDocs = await this.fetchModuleDocs(release.module, release.version);
    
    // Validate documentation quality
    const qualityValidation = await this.validateDocumentationQuality(latestDocs);
    
    if (!qualityValidation.passed) {
      throw new Error(`Documentation quality validation failed for ${release.module}@${release.version}`);
    }
    
    // Update internal documentation
    await this.updateInternalDocs(release.module, latestDocs);
    
    // Generate public documentation
    await this.generatePublicDocs(release.module, latestDocs, release.version);
    
    console.log('  ✅ Module documentation updated');
  }

  /**
   * Regenerate portal content for the release
   */
  async regeneratePortalContent(release) {
    console.log(`🏗️ Regenerating portal content for ${release.module}@${release.version}`);
    
    // Update master index
    await this.indexAutomation.updateMasterIndex();
    
    // Generate module-specific portal pages
    await this.generateModulePortalPages(release);
    
    // Update API documentation
    await this.updateAPIDocumentation(release);
    
    // Generate examples and tutorials
    await this.generateExamplesAndTutorials(release);
    
    // Update integration guides
    await this.updateIntegrationGuides(release);
    
    console.log('  ✅ Portal content regenerated');
  }

  /**
   * Update version index with new release
   */
  async updateVersionIndex(release) {
    console.log(`📋 Updating version index for ${release.module}@${release.version}`);
    
    const versionIndexPath = 'docs/versions.json';
    let versionIndex = {};
    
    try {
      const existingIndex = await fs.readFile(versionIndexPath, 'utf8');
      versionIndex = JSON.parse(existingIndex);
    } catch (error) {
      // File doesn't exist, start with empty index
    }
    
    // Update module version info
    if (!versionIndex[release.module]) {
      versionIndex[release.module] = {
        versions: [],
        latest: null,
        stable: null
      };
    }
    
    const moduleVersions = versionIndex[release.module];
    
    // Add new version
    const versionInfo = {
      version: release.version,
      releaseDate: release.releaseDate || new Date().toISOString(),
      stability: release.stability || 'stable',
      changelog: release.changelog || [],
      documentation: {
        public: `modules/${release.module}/v${release.version}/`,
        internal: `internal/modules/${release.module}/v${release.version}/`
      }
    };
    
    moduleVersions.versions.unshift(versionInfo);
    moduleVersions.latest = release.version;
    
    if (release.stability === 'stable') {
      moduleVersions.stable = release.version;
    }
    
    // Keep only last 10 versions
    moduleVersions.versions = moduleVersions.versions.slice(0, 10);
    
    // Update ecosystem version if this is a major release
    if (this.isMajorRelease(release)) {
      versionIndex.ecosystem = {
        version: this.calculateEcosystemVersion(versionIndex),
        lastUpdated: new Date().toISOString(),
        modules: Object.keys(versionIndex).filter(key => key !== 'ecosystem')
      };
    }
    
    await fs.writeFile(versionIndexPath, JSON.stringify(versionIndex, null, 2));
    console.log('  ✅ Version index updated');
  }

  /**
   * Deploy portal updates
   */
  async deployPortalUpdates(release) {
    console.log(`🚀 Deploying portal updates for ${release.module}@${release.version}`);
    
    try {
      // Build static site
      await this.buildStaticSite();
      
      // Deploy to CDN
      await this.deployToCDN();
      
      // Update search index
      await this.updateSearchIndex();
      
      // Invalidate cache
      await this.invalidateCache();
      
      console.log('  ✅ Portal updates deployed');
    } catch (error) {
      console.error('  ❌ Portal deployment failed:', error);
      throw error;
    }
  }

  /**
   * Parse release payload from different sources
   */
  parseReleasePayload(payload, source) {
    switch (source) {
      case 'github':
        return this.parseGitHubRelease(payload);
      case 'npm':
        return this.parseNPMRelease(payload);
      case 'docker':
        return this.parseDockerRelease(payload);
      default:
        throw new Error(`Unknown release source: ${source}`);
    }
  }

  parseGitHubRelease(payload) {
    return {
      source: 'github',
      module: this.extractModuleName(payload.repository.name),
      version: payload.release.tag_name.replace(/^v/, ''),
      releaseDate: payload.release.published_at,
      changelog: payload.release.body,
      stability: payload.release.prerelease ? 'beta' : 'stable',
      repository: payload.repository.html_url,
      author: payload.release.author.login
    };
  }

  parseNPMRelease(payload) {
    return {
      source: 'npm',
      module: payload.name.replace('@anarq/', ''),
      version: payload.version,
      releaseDate: payload.time,
      stability: payload.version.includes('-') ? 'beta' : 'stable',
      registry: 'https://www.npmjs.com/package/' + payload.name
    };
  }

  parseDockerRelease(payload) {
    return {
      source: 'docker',
      module: payload.repository.name,
      version: payload.push_data.tag,
      releaseDate: new Date().toISOString(),
      stability: payload.push_data.tag === 'latest' ? 'stable' : 'beta',
      registry: payload.repository.repo_url
    };
  }

  /**
   * Check if this is a module release vs ecosystem release
   */
  isModuleRelease(release) {
    const moduleNames = [
      'squid', 'qlock', 'qonsent', 'qindex', 'qwallet', 'qerberos', 'qmask',
      'qdrive', 'qpic', 'qmarket', 'qmail', 'qchat', 'qnet', 'dao'
    ];
    
    return moduleNames.includes(release.module);
  }

  isEcosystemRelease(release) {
    return release.module === 'q-ecosystem' || release.module === 'anarq-frontend';
  }

  isMajorRelease(release) {
    return release.version.split('.')[0] !== '0' && release.version.endsWith('.0.0');
  }

  /**
   * Fetch module documentation from repository
   */
  async fetchModuleDocs(module, version) {
    // This would typically fetch from the module's repository
    // For now, we'll simulate by reading local docs
    const modulePath = `modules/${module}`;
    const docsPath = path.join(modulePath, 'docs');
    
    try {
      const docs = {};
      const files = await fs.readdir(docsPath);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(docsPath, file), 'utf8');
          docs[file] = content;
        }
      }
      
      return docs;
    } catch (error) {
      console.warn(`Could not fetch docs for ${module}:`, error.message);
      return {};
    }
  }

  /**
   * Generate module-specific portal pages
   */
  async generateModulePortalPages(release) {
    const portalDir = `portal/modules/${release.module}`;
    await fs.mkdir(portalDir, { recursive: true });
    
    // Generate overview page
    const overviewPage = await this.generateModuleOverview(release);
    await fs.writeFile(path.join(portalDir, 'index.html'), overviewPage);
    
    // Generate API reference page
    const apiPage = await this.generateAPIReference(release);
    await fs.writeFile(path.join(portalDir, 'api.html'), apiPage);
    
    // Generate examples page
    const examplesPage = await this.generateExamplesPage(release);
    await fs.writeFile(path.join(portalDir, 'examples.html'), examplesPage);
    
    // Generate changelog page
    const changelogPage = await this.generateChangelogPage(release);
    await fs.writeFile(path.join(portalDir, 'changelog.html'), changelogPage);
  }

  /**
   * Notification methods
   */
  async notifyReleaseSuccess(release) {
    const message = `✅ Successfully processed release: ${release.module}@${release.version}`;
    
    await this.sendNotification({
      type: 'success',
      title: 'Release Processed Successfully',
      message,
      release
    });
  }

  async notifyReleaseFailure(error, payload, source) {
    const message = `❌ Failed to process ${source} release: ${error.message}`;
    
    await this.sendNotification({
      type: 'error',
      title: 'Release Processing Failed',
      message,
      error: error.message,
      payload
    });
  }

  async sendNotification(notification) {
    // Send to configured notification channels
    if (this.releaseConfig.notificationChannels.slack) {
      await this.sendSlackNotification(notification);
    }
    
    if (this.releaseConfig.notificationChannels.email) {
      await this.sendEmailNotification(notification);
    }
    
    if (this.releaseConfig.notificationChannels.github) {
      await this.createGitHubIssue(notification);
    }
  }

  async sendSlackNotification(notification) {
    // Implementation would send to Slack webhook
    console.log('📱 Slack notification:', notification.message);
  }

  async sendEmailNotification(notification) {
    // Implementation would send email
    console.log('📧 Email notification:', notification.message);
  }

  async createGitHubIssue(notification) {
    // Implementation would create GitHub issue for failures
    if (notification.type === 'error') {
      console.log('🐛 GitHub issue would be created:', notification.title);
    }
  }

  /**
   * Utility methods
   */
  extractModuleName(repositoryName) {
    // Extract module name from repository name
    return repositoryName.replace(/^(anarq-|q-)?/, '').replace(/-module$/, '');
  }

  calculateEcosystemVersion(versionIndex) {
    // Calculate ecosystem version based on module versions
    const moduleVersions = Object.keys(versionIndex)
      .filter(key => key !== 'ecosystem')
      .map(module => versionIndex[module].latest)
      .filter(version => version);
    
    if (moduleVersions.length === 0) return '1.0.0';
    
    // Simple versioning: increment minor version
    const currentEcosystem = versionIndex.ecosystem?.version || '1.0.0';
    const [major, minor, patch] = currentEcosystem.split('.').map(Number);
    
    return `${major}.${minor + 1}.0`;
  }

  // Placeholder methods for portal generation
  async buildStaticSite() {
    console.log('  🏗️ Building static site...');
    // Implementation would build the portal static site
  }

  async deployToCDN() {
    console.log('  🌐 Deploying to CDN...');
    // Implementation would deploy to CDN
  }

  async updateSearchIndex() {
    console.log('  🔍 Updating search index...');
    // Implementation would update search index
  }

  async invalidateCache() {
    console.log('  🗑️ Invalidating cache...');
    // Implementation would invalidate CDN cache
  }

  async generateModuleOverview(release) {
    return `<html><body><h1>${release.module} v${release.version}</h1></body></html>`;
  }

  async generateAPIReference(release) {
    return `<html><body><h1>API Reference - ${release.module}</h1></body></html>`;
  }

  async generateExamplesPage(release) {
    return `<html><body><h1>Examples - ${release.module}</h1></body></html>`;
  }

  async generateChangelogPage(release) {
    return `<html><body><h1>Changelog - ${release.module}</h1><pre>${release.changelog || 'No changelog available'}</pre></body></html>`;
  }
}

// CLI interface
async function main() {
  const integration = new ReleaseIntegration();
  await integration.init();

  const command = process.argv[2];

  switch (command) {
    case 'webhook':
      const source = process.argv[3];
      const payloadFile = process.argv[4];
      
      if (!source || !payloadFile) {
        console.error('Usage: node release-integration.mjs webhook <source> <payload-file>');
        process.exit(1);
      }
      
      const payload = JSON.parse(await fs.readFile(payloadFile, 'utf8'));
      await integration.handleReleaseWebhook(payload, source);
      break;
    
    case 'simulate':
      const module = process.argv[3] || 'qwallet';
      const version = process.argv[4] || '1.0.0';
      
      const simulatedRelease = {
        source: 'github',
        module,
        version,
        releaseDate: new Date().toISOString(),
        stability: 'stable',
        changelog: 'Simulated release for testing'
      };
      
      await integration.processModuleRelease(simulatedRelease);
      break;
    
    case 'validate':
      const targetModule = process.argv[3] || 'qwallet';
      const targetVersion = process.argv[4] || '1.0.0';
      
      const testRelease = { module: targetModule, version: targetVersion };
      const validation = await integration.validateReleaseReadiness(testRelease);
      
      console.log('✅ Release validation passed');
      console.log(JSON.stringify(validation, null, 2));
      break;
    
    default:
      console.log(`
Usage: node release-integration.mjs <command> [args]

Commands:
  webhook <source> <payload-file>  - Process release webhook
  simulate <module> <version>      - Simulate module release
  validate <module> <version>      - Validate release readiness

Examples:
  node release-integration.mjs webhook github github-payload.json
  node release-integration.mjs simulate qwallet 1.2.0
  node release-integration.mjs validate qwallet 1.2.0
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Release integration failed:', error);
    process.exit(1);
  });
}

export default ReleaseIntegration;