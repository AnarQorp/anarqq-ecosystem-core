#!/usr/bin/env node

/**
 * Module Versioning CLI Tool
 * Command-line interface for module update and versioning operations
 */

// Note: This is a demonstration CLI. In a real implementation, these would be proper imports
// For now, we'll simulate the functionality with mock implementations

const ModuleStatus = {
  DEVELOPMENT: 'DEVELOPMENT',
  TESTING: 'TESTING',
  PRODUCTION_READY: 'PRODUCTION_READY',
  DEPRECATED: 'DEPRECATED',
  SUSPENDED: 'SUSPENDED'
};

const IdentityType = {
  ROOT: 'ROOT',
  DAO: 'DAO',
  ENTERPRISE: 'ENTERPRISE',
  INDIVIDUAL: 'INDIVIDUAL'
};

const VersionUpdateType = {
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  PATCH: 'PATCH',
  PRERELEASE: 'PRERELEASE',
  BUILD: 'BUILD'
};

// Mock implementations for demonstration
class MockModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.dependents = new Map();
  }

  getModule(moduleId) {
    return this.modules.get(moduleId) || null;
  }

  getModuleDependents(moduleId) {
    return this.dependents.get(moduleId) || [];
  }

  setModule(moduleId, module) {
    this.modules.set(moduleId, module);
  }

  setDependents(moduleId, dependents) {
    this.dependents.set(moduleId, dependents);
  }
}

class MockModuleDependencyManager {
  constructor(moduleRegistry) {
    this.moduleRegistry = moduleRegistry;
  }

  async createUpdateNotification(moduleId, oldVersion, newVersion, options) {
    return {
      moduleId,
      dependentModules: this.moduleRegistry.getModuleDependents(moduleId),
      updateType: 'minor',
      oldVersion,
      newVersion,
      compatibilityImpact: 'low',
      requiredActions: ['Review changes'],
      timestamp: new Date().toISOString()
    };
  }
}

class MockModuleUpdateVersioningService {
  constructor(moduleRegistry, dependencyManager) {
    this.moduleRegistry = moduleRegistry;
    this.dependencyManager = dependencyManager;
    this.updateNotifications = new Map();
    this.changelogCache = new Map();
    this.rollbackHistory = new Map();
  }

  parseSemanticVersion(version) {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    const match = version.match(semverRegex);

    if (!match) {
      throw new Error(`Invalid semantic version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5],
      raw: version
    };
  }

  compareVersions(version1, version2) {
    const v1 = this.parseSemanticVersion(version1);
    const v2 = this.parseSemanticVersion(version2);

    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    if (v1.patch !== v2.patch) return v1.patch - v2.patch;

    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  getUpdateType(fromVersion, toVersion) {
    const from = this.parseSemanticVersion(fromVersion);
    const to = this.parseSemanticVersion(toVersion);

    if (to.major > from.major) return VersionUpdateType.MAJOR;
    if (to.minor > from.minor) return VersionUpdateType.MINOR;
    if (to.patch > from.patch) return VersionUpdateType.PATCH;
    if (to.prerelease !== from.prerelease) return VersionUpdateType.PRERELEASE;
    if (to.build !== from.build) return VersionUpdateType.BUILD;

    throw new Error(`Invalid version update: ${fromVersion} to ${toVersion}`);
  }

  async validateUpdate(updateRequest) {
    const currentModule = this.moduleRegistry.getModule(updateRequest.moduleId);
    if (!currentModule) {
      return {
        valid: false,
        updateType: VersionUpdateType.PATCH,
        compatibilityImpact: 'NONE',
        breakingChanges: [],
        warnings: [],
        errors: ['Module not found: ' + updateRequest.moduleId],
        requiredActions: []
      };
    }

    try {
      this.parseSemanticVersion(updateRequest.newVersion);
    } catch (error) {
      return {
        valid: false,
        updateType: VersionUpdateType.PATCH,
        compatibilityImpact: 'NONE',
        breakingChanges: [],
        warnings: [],
        errors: ['Invalid version format: ' + updateRequest.newVersion],
        requiredActions: []
      };
    }

    const currentVersion = currentModule.metadata.version;
    if (this.compareVersions(updateRequest.newVersion, currentVersion) <= 0) {
      return {
        valid: false,
        updateType: VersionUpdateType.PATCH,
        compatibilityImpact: 'NONE',
        breakingChanges: [],
        warnings: [],
        errors: [`New version ${updateRequest.newVersion} must be higher than current version ${currentVersion}`],
        requiredActions: []
      };
    }

    const updateType = this.getUpdateType(currentVersion, updateRequest.newVersion);
    const compatibilityImpact = this.analyzeCompatibilityImpact(updateType, updateRequest.breakingChanges || []);

    return {
      valid: true,
      updateType,
      compatibilityImpact,
      breakingChanges: updateRequest.breakingChanges || [],
      warnings: [],
      errors: [],
      requiredActions: ['Test the update', 'Review changes']
    };
  }

  checkVersionCompatibility(moduleId, requiredVersion, availableVersion) {
    try {
      const required = this.parseSemanticVersion(requiredVersion);
      const available = this.parseSemanticVersion(availableVersion);

      const compatibilityScore = this.calculateCompatibilityScore(required, available);
      const compatible = compatibilityScore >= 0.7;

      const issues = [];
      const recommendations = [];

      if (available.major !== required.major) {
        issues.push({
          severity: 'ERROR',
          type: 'VERSION_MISMATCH',
          description: `Major version mismatch: required ${required.major}, available ${available.major}`,
          affectedComponent: moduleId,
          resolution: `Update to compatible major version ${required.major}.x.x`
        });
        recommendations.push(`Upgrade ${moduleId} to major version ${required.major}`);
      }

      return {
        compatible,
        compatibilityScore,
        issues,
        recommendations
      };
    } catch (error) {
      return {
        compatible: false,
        compatibilityScore: 0,
        issues: [{
          severity: 'ERROR',
          type: 'VERSION_MISMATCH',
          description: `Compatibility check failed: ${error.message}`,
          affectedComponent: moduleId
        }],
        recommendations: []
      };
    }
  }

  createRollbackPlan(moduleId, currentVersion, targetVersion, updateType) {
    const steps = [
      {
        stepId: 'backup_current_state',
        description: 'Backup current module state and data',
        action: 'restore_data',
        automated: true,
        estimatedDuration: 30000,
        risks: ['Data backup may be incomplete']
      },
      {
        stepId: 'revert_code',
        description: `Revert module code to version ${currentVersion}`,
        action: 'revert_code',
        automated: true,
        estimatedDuration: 60000,
        risks: ['Code reversion may fail if files are locked']
      },
      {
        stepId: 'verify_rollback',
        description: 'Verify module rollback was successful',
        action: 'verify_rollback',
        automated: true,
        estimatedDuration: 45000,
        risks: ['Verification may fail if module is corrupted']
      }
    ];

    const dependentModules = this.moduleRegistry.getModuleDependents(moduleId);
    if (dependentModules.length > 0) {
      steps.splice(2, 0, {
        stepId: 'notify_services',
        description: `Notify ${dependentModules.length} dependent modules of rollback`,
        action: 'notify_services',
        automated: true,
        estimatedDuration: 15000,
        risks: ['Some services may not receive notifications']
      });
    }

    const estimatedDuration = steps.reduce((total, step) => total + step.estimatedDuration, 0);
    const risks = updateType === VersionUpdateType.MAJOR ? 
      ['Major version rollback may cause data compatibility issues'] : [];

    const rollbackPlan = {
      rollbackVersion: currentVersion,
      rollbackSteps: steps,
      dataBackupRequired: updateType === VersionUpdateType.MAJOR,
      estimatedDuration,
      risks,
      prerequisites: ['Ensure no active transactions are using the module', 'Verify backup integrity before proceeding']
    };

    if (!this.rollbackHistory.has(moduleId)) {
      this.rollbackHistory.set(moduleId, []);
    }
    this.rollbackHistory.get(moduleId).unshift(rollbackPlan);

    return rollbackPlan;
  }

  async createUpdateNotification(moduleId, fromVersion, toVersion, changelog, breakingChanges = [], migrationGuide) {
    const updateType = this.getUpdateType(fromVersion, toVersion);
    const compatibilityImpact = this.analyzeCompatibilityImpact(updateType, breakingChanges);
    const affectedModules = this.moduleRegistry.getModuleDependents(moduleId);

    const requiredActions = [];
    if (compatibilityImpact === 'BREAKING') {
      requiredActions.push('Review breaking changes', 'Update code to handle breaking changes', 'Test thoroughly before deploying');
    } else if (compatibilityImpact === 'HIGH') {
      requiredActions.push('Review major changes', 'Test compatibility');
    } else {
      requiredActions.push('Review changes', 'Run regression tests');
    }

    const notification = {
      moduleId,
      fromVersion,
      toVersion,
      updateType,
      compatibilityImpact,
      affectedModules,
      changelog,
      breakingChanges,
      migrationGuide,
      requiredActions,
      notificationDate: new Date().toISOString(),
      deadline: this.calculateUpdateDeadline(updateType, compatibilityImpact)
    };

    if (!this.updateNotifications.has(moduleId)) {
      this.updateNotifications.set(moduleId, []);
    }
    this.updateNotifications.get(moduleId).push(notification);

    await this.dependencyManager.createUpdateNotification(moduleId, fromVersion, toVersion, {
      notifyDependents: true,
      includeCompatibilityAnalysis: true
    });

    return notification;
  }

  generateChangelog(moduleId, version, changes) {
    const changelog = changes.map(change => ({
      version,
      date: new Date().toISOString().split('T')[0],
      type: change.type || 'changed',
      description: change.description || '',
      breakingChange: change.breakingChange || false,
      migrationRequired: change.migrationRequired || false,
      affectedComponents: change.affectedComponents || []
    }));

    if (!this.changelogCache.has(moduleId)) {
      this.changelogCache.set(moduleId, []);
    }
    const existingChangelog = this.changelogCache.get(moduleId);
    existingChangelog.unshift(...changelog);

    return changelog;
  }

  analyzeCompatibilityImpact(updateType, breakingChanges) {
    if (breakingChanges.length > 0) return 'BREAKING';
    
    switch (updateType) {
      case VersionUpdateType.MAJOR: return 'HIGH';
      case VersionUpdateType.MINOR: return 'MEDIUM';
      case VersionUpdateType.PATCH: return 'LOW';
      default: return 'NONE';
    }
  }

  calculateCompatibilityScore(required, available) {
    if (available.major !== required.major) return 0;
    if (available.minor < required.minor) return 0.3;
    if (available.minor === required.minor && available.patch < required.patch) return 0.7;
    if (available.minor === required.minor && available.patch === required.patch) return 1.0;
    return 0.9;
  }

  calculateUpdateDeadline(updateType, compatibilityImpact) {
    const now = new Date();
    let daysToAdd = 0;

    if (compatibilityImpact === 'BREAKING') {
      daysToAdd = 30;
    } else if (updateType === VersionUpdateType.MAJOR) {
      daysToAdd = 21;
    } else if (updateType === VersionUpdateType.MINOR) {
      daysToAdd = 14;
    } else {
      daysToAdd = 7;
    }

    const deadline = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return deadline.toISOString();
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

// Initialize services
const moduleRegistry = new MockModuleRegistry();
const dependencyManager = new MockModuleDependencyManager(moduleRegistry);
const versioningService = new MockModuleUpdateVersioningService(moduleRegistry, dependencyManager);

// Mock some test data
function setupTestData() {
  // Add a test module to the registry
  const testModule = {
    moduleId: 'qwallet',
    metadata: {
      module: 'qwallet',
      version: '1.0.0',
      description: 'Qwallet module for decentralized wallet management',
      identities_supported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
      integrations: ['qindex', 'qlock', 'qerberos'],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'sha256:abc123...',
      compliance: {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: true,
        gdpr_compliant: true,
        data_retention_policy: 'qwallet-retention-policy'
      },
      repository: 'https://github.com/anarq/qwallet',
      documentation: 'QmQwalletDocumentationCID',
      activated_by: 'did:root:qwallet-admin',
      timestamp: Date.now(),
      checksum: 'sha256:def456...',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'qwallet-signing-key'
    },
    signedMetadata: {},
    registrationInfo: {
      cid: 'QmQwalletRegistrationCID',
      indexId: 'qwallet-index-id',
      registeredAt: new Date().toISOString(),
      registeredBy: 'did:root:qwallet-admin',
      status: ModuleStatus.PRODUCTION_READY,
      verificationStatus: 'VERIFIED'
    },
    accessStats: {
      queryCount: 1250,
      lastAccessed: new Date().toISOString(),
      dependentModules: ['qmarket', 'qsocial', 'qdrive']
    }
  };

  // Mock the registry to return our test module
  moduleRegistry.getModule = (moduleId) => {
    if (moduleId === 'qwallet') {
      return testModule;
    }
    return null;
  };

  moduleRegistry.getModuleDependents = (moduleId) => {
    if (moduleId === 'qwallet') {
      return ['qmarket', 'qsocial', 'qdrive'];
    }
    return [];
  };
}

// Command implementations
async function validateUpdate() {
  const moduleId = args[1];
  const newVersion = args[2];
  
  if (!moduleId || !newVersion) {
    console.error('Usage: validate-update <moduleId> <newVersion>');
    process.exit(1);
  }

  console.log(`🔍 Validating update for ${moduleId} to version ${newVersion}...`);

  try {
    const updateRequest = {
      moduleId,
      newVersion,
      updates: {
        description: `Updated ${moduleId} with new features`
      },
      changelog: [
        {
          version: newVersion,
          date: new Date().toISOString().split('T')[0],
          type: 'added',
          description: 'Added new features and improvements',
          breakingChange: false,
          migrationRequired: false,
          affectedComponents: ['core', 'api']
        }
      ]
    };

    const validation = await versioningService.validateUpdate(updateRequest);

    console.log('\n📋 Validation Results:');
    console.log(`✅ Valid: ${validation.valid}`);
    console.log(`📈 Update Type: ${validation.updateType}`);
    console.log(`⚠️  Compatibility Impact: ${validation.compatibilityImpact}`);
    
    if (validation.errors.length > 0) {
      console.log('\n❌ Errors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (validation.requiredActions.length > 0) {
      console.log('\n📝 Required Actions:');
      validation.requiredActions.forEach(action => console.log(`  - ${action}`));
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

async function checkCompatibility() {
  const moduleId = args[1];
  const requiredVersion = args[2];
  const availableVersion = args[3];
  
  if (!moduleId || !requiredVersion || !availableVersion) {
    console.error('Usage: check-compatibility <moduleId> <requiredVersion> <availableVersion>');
    process.exit(1);
  }

  console.log(`🔍 Checking compatibility for ${moduleId}...`);
  console.log(`   Required: ${requiredVersion}`);
  console.log(`   Available: ${availableVersion}`);

  try {
    const compatibility = versioningService.checkVersionCompatibility(moduleId, requiredVersion, availableVersion);

    console.log('\n📋 Compatibility Results:');
    console.log(`✅ Compatible: ${compatibility.compatible}`);
    console.log(`📊 Compatibility Score: ${compatibility.compatibilityScore.toFixed(2)}`);
    
    if (compatibility.issues.length > 0) {
      console.log('\n⚠️  Issues:');
      compatibility.issues.forEach(issue => {
        console.log(`  ${issue.severity}: ${issue.description}`);
        if (issue.resolution) {
          console.log(`    Resolution: ${issue.resolution}`);
        }
      });
    }
    
    if (compatibility.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      compatibility.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

  } catch (error) {
    console.error('❌ Compatibility check failed:', error.message);
    process.exit(1);
  }
}

async function createRollbackPlan() {
  const moduleId = args[1];
  const currentVersion = args[2];
  const targetVersion = args[3];
  
  if (!moduleId || !currentVersion || !targetVersion) {
    console.error('Usage: create-rollback <moduleId> <currentVersion> <targetVersion>');
    process.exit(1);
  }

  console.log(`🔄 Creating rollback plan for ${moduleId}...`);
  console.log(`   From: ${targetVersion}`);
  console.log(`   To: ${currentVersion}`);

  try {
    const updateType = versioningService.getUpdateType(currentVersion, targetVersion);
    const rollbackPlan = versioningService.createRollbackPlan(moduleId, currentVersion, targetVersion, updateType);

    console.log('\n📋 Rollback Plan:');
    console.log(`🎯 Target Version: ${rollbackPlan.rollbackVersion}`);
    console.log(`📊 Total Steps: ${rollbackPlan.rollbackSteps.length}`);
    console.log(`⏱️  Estimated Duration: ${Math.round(rollbackPlan.estimatedDuration / 1000)}s`);
    console.log(`💾 Data Backup Required: ${rollbackPlan.dataBackupRequired}`);
    
    console.log('\n📝 Rollback Steps:');
    rollbackPlan.rollbackSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.description}`);
      console.log(`     Action: ${step.action}`);
      console.log(`     Duration: ${Math.round(step.estimatedDuration / 1000)}s`);
      console.log(`     Automated: ${step.automated}`);
      if (step.risks.length > 0) {
        console.log(`     Risks: ${step.risks.join(', ')}`);
      }
    });
    
    if (rollbackPlan.risks.length > 0) {
      console.log('\n⚠️  Overall Risks:');
      rollbackPlan.risks.forEach(risk => console.log(`  - ${risk}`));
    }
    
    if (rollbackPlan.prerequisites.length > 0) {
      console.log('\n📋 Prerequisites:');
      rollbackPlan.prerequisites.forEach(prereq => console.log(`  - ${prereq}`));
    }

  } catch (error) {
    console.error('❌ Rollback plan creation failed:', error.message);
    process.exit(1);
  }
}

async function createNotification() {
  const moduleId = args[1];
  const fromVersion = args[2];
  const toVersion = args[3];
  
  if (!moduleId || !fromVersion || !toVersion) {
    console.error('Usage: create-notification <moduleId> <fromVersion> <toVersion>');
    process.exit(1);
  }

  console.log(`📢 Creating update notification for ${moduleId}...`);
  console.log(`   From: ${fromVersion}`);
  console.log(`   To: ${toVersion}`);

  try {
    const changelog = [
      {
        version: toVersion,
        date: new Date().toISOString().split('T')[0],
        type: 'added',
        description: 'Added new features and improvements',
        breakingChange: false,
        migrationRequired: false,
        affectedComponents: ['core', 'api']
      }
    ];

    const notification = await versioningService.createUpdateNotification(
      moduleId,
      fromVersion,
      toVersion,
      changelog,
      [],
      'No migration required for this update'
    );

    console.log('\n📋 Update Notification:');
    console.log(`📦 Module: ${notification.moduleId}`);
    console.log(`📈 Update Type: ${notification.updateType}`);
    console.log(`⚠️  Compatibility Impact: ${notification.compatibilityImpact}`);
    console.log(`👥 Affected Modules: ${notification.affectedModules.length}`);
    
    if (notification.affectedModules.length > 0) {
      console.log(`   - ${notification.affectedModules.join(', ')}`);
    }
    
    console.log(`📅 Notification Date: ${new Date(notification.notificationDate).toLocaleString()}`);
    
    if (notification.deadline) {
      console.log(`⏰ Deadline: ${new Date(notification.deadline).toLocaleString()}`);
    }
    
    if (notification.requiredActions.length > 0) {
      console.log('\n📝 Required Actions:');
      notification.requiredActions.forEach(action => console.log(`  - ${action}`));
    }
    
    if (notification.changelog.length > 0) {
      console.log('\n📋 Changelog:');
      notification.changelog.forEach(entry => {
        console.log(`  ${entry.type.toUpperCase()}: ${entry.description}`);
      });
    }

  } catch (error) {
    console.error('❌ Notification creation failed:', error.message);
    process.exit(1);
  }
}

async function generateChangelog() {
  const moduleId = args[1];
  const version = args[2];
  
  if (!moduleId || !version) {
    console.error('Usage: generate-changelog <moduleId> <version>');
    process.exit(1);
  }

  console.log(`📝 Generating changelog for ${moduleId} version ${version}...`);

  try {
    const changes = [
      {
        type: 'added',
        description: 'New wallet management features',
        breakingChange: false,
        affectedComponents: ['wallet', 'ui']
      },
      {
        type: 'improved',
        description: 'Enhanced security protocols',
        breakingChange: false,
        affectedComponents: ['security', 'auth']
      },
      {
        type: 'fixed',
        description: 'Resolved transaction processing issues',
        breakingChange: false,
        affectedComponents: ['transactions']
      }
    ];

    const changelog = versioningService.generateChangelog(moduleId, version, changes);

    console.log('\n📋 Generated Changelog:');
    changelog.forEach(entry => {
      console.log(`\n📅 Version ${entry.version} (${entry.date})`);
      console.log(`   ${entry.type.toUpperCase()}: ${entry.description}`);
      if (entry.breakingChange) {
        console.log('   ⚠️  BREAKING CHANGE');
      }
      if (entry.migrationRequired) {
        console.log('   🔄 Migration Required');
      }
      if (entry.affectedComponents && entry.affectedComponents.length > 0) {
        console.log(`   📦 Components: ${entry.affectedComponents.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ Changelog generation failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🔧 Module Versioning CLI Tool

Usage: node module-versioning-cli.mjs <command> [options]

Commands:
  validate-update <moduleId> <newVersion>
    Validate a module update request

  check-compatibility <moduleId> <requiredVersion> <availableVersion>
    Check version compatibility between modules

  create-rollback <moduleId> <currentVersion> <targetVersion>
    Create a rollback plan for module update

  create-notification <moduleId> <fromVersion> <toVersion>
    Create update notification for dependent modules

  generate-changelog <moduleId> <version>
    Generate changelog for module version

  help
    Show this help message

Examples:
  node module-versioning-cli.mjs validate-update qwallet 1.1.0
  node module-versioning-cli.mjs check-compatibility qwallet 1.0.0 1.2.0
  node module-versioning-cli.mjs create-rollback qwallet 1.0.0 1.1.0
  node module-versioning-cli.mjs create-notification qwallet 1.0.0 1.1.0
  node module-versioning-cli.mjs generate-changelog qwallet 1.1.0
`);
}

// Main execution
async function main() {
  setupTestData();

  switch (command) {
    case 'validate-update':
      await validateUpdate();
      break;
    case 'check-compatibility':
      await checkCompatibility();
      break;
    case 'create-rollback':
      await createRollbackPlan();
      break;
    case 'create-notification':
      await createNotification();
      break;
    case 'generate-changelog':
      await generateChangelog();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('❌ CLI execution failed:', error.message);
  process.exit(1);
});