/**
 * Module Update and Versioning Service
 * Handles semantic versioning, update validation, compatibility checking,
 * rollback functionality, update notifications, and changelog management
 */

import {
  RegisteredModule,
  QModuleMetadata,
  ModuleStatus,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ModuleInfo,
  SignedModuleMetadata,
  ModuleRegistrationResult,
  RegistrationHistoryEntry
} from '../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../types/identity';
import { ModuleRegistry } from './ModuleRegistry';
import { ModuleDependencyManager, DependencyUpdateNotification } from './ModuleDependencyManager';

/**
 * Semantic version information
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

/**
 * Version update type
 */
export enum VersionUpdateType {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  PATCH = 'PATCH',
  PRERELEASE = 'PRERELEASE',
  BUILD = 'BUILD'
}

/**
 * Update validation result
 */
export interface UpdateValidationResult {
  valid: boolean;
  updateType: VersionUpdateType;
  compatibilityImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BREAKING';
  breakingChanges: string[];
  warnings: string[];
  errors: string[];
  requiredActions: string[];
}

/**
 * Module update request
 */
export interface ModuleUpdateRequest {
  moduleId: string;
  newVersion: string;
  updates: Partial<ModuleInfo>;
  changelog?: ChangelogEntry[];
  breakingChanges?: string[];
  migrationGuide?: string;
  rollbackPlan?: RollbackPlan;
  notifyDependents?: boolean;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
  breakingChange?: boolean;
  migrationRequired?: boolean;
  affectedComponents?: string[];
}

/**
 * Module rollback plan
 */
export interface RollbackPlan {
  rollbackVersion: string;
  rollbackSteps: RollbackStep[];
  dataBackupRequired: boolean;
  estimatedDuration: number;
  risks: string[];
  prerequisites: string[];
}

/**
 * Individual rollback step
 */
export interface RollbackStep {
  stepId: string;
  description: string;
  action: 'revert_code' | 'restore_data' | 'update_dependencies' | 'notify_services' | 'verify_rollback';
  automated: boolean;
  estimatedDuration: number;
  risks: string[];
  rollbackData?: any;
}

/**
 * Update notification
 */
export interface ModuleUpdateNotification {
  moduleId: string;
  fromVersion: string;
  toVersion: string;
  updateType: VersionUpdateType;
  compatibilityImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BREAKING';
  affectedModules: string[];
  changelog: ChangelogEntry[];
  breakingChanges: string[];
  migrationGuide?: string;
  requiredActions: string[];
  notificationDate: string;
  deadline?: string;
}

/**
 * Version compatibility check result
 */
export interface VersionCompatibilityResult {
  compatible: boolean;
  compatibilityScore: number;
  issues: CompatibilityIssue[];
  recommendations: string[];
}

/**
 * Compatibility issue
 */
export interface CompatibilityIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  type: 'VERSION_MISMATCH' | 'BREAKING_CHANGE' | 'DEPRECATED_FEATURE' | 'MISSING_DEPENDENCY';
  description: string;
  affectedComponent: string;
  resolution?: string;
}

/**
 * Module Update and Versioning Service
 */
export class ModuleUpdateVersioningService {
  private moduleRegistry: ModuleRegistry;
  private dependencyManager: ModuleDependencyManager;
  private updateNotifications: Map<string, ModuleUpdateNotification[]> = new Map();
  private rollbackHistory: Map<string, RollbackPlan[]> = new Map();
  private changelogCache: Map<string, ChangelogEntry[]> = new Map();
  
  // Configuration
  private readonly NOTIFICATION_RETENTION_DAYS = 90;
  private readonly MAX_ROLLBACK_HISTORY = 10;
  private readonly COMPATIBILITY_THRESHOLD = 0.7;

  constructor(moduleRegistry: ModuleRegistry, dependencyManager: ModuleDependencyManager) {
    this.moduleRegistry = moduleRegistry;
    this.dependencyManager = dependencyManager;
    this.initializeVersioningService();
  }

  /**
   * Initialize the versioning service
   */
  private initializeVersioningService(): void {
    // Set up periodic cleanup
    setInterval(() => this.cleanupOldNotifications(), 3600000); // 1 hour
    setInterval(() => this.cleanupRollbackHistory(), 86400000); // 24 hours
  }

  /**
   * Parse semantic version string
   */
  public parseSemanticVersion(version: string): SemanticVersion {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    const match = version.match(semverRegex);

    if (!match) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.INVALID_METADATA,
        `Invalid semantic version format: ${version}`,
        undefined,
        { version },
        {
          severity: ModuleRegistrationErrorSeverity.MEDIUM,
          retryable: false,
          userMessage: 'Please provide a valid semantic version (e.g., 1.0.0, 2.1.3-beta.1)'
        }
      );
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

  /**
   * Compare two semantic versions
   */
  public compareVersions(version1: string, version2: string): number {
    const v1 = this.parseSemanticVersion(version1);
    const v2 = this.parseSemanticVersion(version2);

    // Compare major version
    if (v1.major !== v2.major) {
      return v1.major - v2.major;
    }

    // Compare minor version
    if (v1.minor !== v2.minor) {
      return v1.minor - v2.minor;
    }

    // Compare patch version
    if (v1.patch !== v2.patch) {
      return v1.patch - v2.patch;
    }

    // Compare prerelease versions
    if (v1.prerelease && !v2.prerelease) {
      return -1; // v1 is prerelease, v2 is stable
    }
    if (!v1.prerelease && v2.prerelease) {
      return 1; // v1 is stable, v2 is prerelease
    }
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0; // Versions are equal
  }

  /**
   * Determine update type between versions
   */
  public getUpdateType(fromVersion: string, toVersion: string): VersionUpdateType {
    const from = this.parseSemanticVersion(fromVersion);
    const to = this.parseSemanticVersion(toVersion);

    if (to.major > from.major) {
      return VersionUpdateType.MAJOR;
    }
    if (to.minor > from.minor) {
      return VersionUpdateType.MINOR;
    }
    if (to.patch > from.patch) {
      return VersionUpdateType.PATCH;
    }
    if (to.prerelease !== from.prerelease) {
      return VersionUpdateType.PRERELEASE;
    }
    if (to.build !== from.build) {
      return VersionUpdateType.BUILD;
    }

    throw new ModuleRegistrationError(
      ModuleRegistrationErrorCode.VERSION_CONFLICT,
      `Invalid version update: ${fromVersion} to ${toVersion}`,
      undefined,
      { fromVersion, toVersion },
      {
        severity: ModuleRegistrationErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: 'The new version must be higher than the current version'
      }
    );
  }

  /**
   * Validate module update request
   */
  public async validateUpdate(updateRequest: ModuleUpdateRequest): Promise<UpdateValidationResult> {
    console.log(`[ModuleUpdateVersioningService] Validating update for ${updateRequest.moduleId}: ${updateRequest.newVersion}`);

    const result: UpdateValidationResult = {
      valid: false,
      updateType: VersionUpdateType.PATCH,
      compatibilityImpact: 'NONE',
      breakingChanges: [],
      warnings: [],
      errors: [],
      requiredActions: []
    };

    try {
      // Get current module
      const currentModule = this.moduleRegistry.getModule(updateRequest.moduleId);
      if (!currentModule) {
        result.errors.push(`Module not found: ${updateRequest.moduleId}`);
        return result;
      }

      const currentVersion = currentModule.metadata.version;

      // Validate version format
      try {
        this.parseSemanticVersion(updateRequest.newVersion);
      } catch (error) {
        result.errors.push(`Invalid version format: ${updateRequest.newVersion}`);
        return result;
      }

      // Check if version is higher
      if (this.compareVersions(updateRequest.newVersion, currentVersion) <= 0) {
        result.errors.push(`New version ${updateRequest.newVersion} must be higher than current version ${currentVersion}`);
        return result;
      }

      // Determine update type
      result.updateType = this.getUpdateType(currentVersion, updateRequest.newVersion);

      // Analyze compatibility impact
      result.compatibilityImpact = this.analyzeCompatibilityImpact(
        result.updateType,
        updateRequest.breakingChanges || [],
        updateRequest.updates
      );

      // Validate breaking changes
      if (updateRequest.breakingChanges && updateRequest.breakingChanges.length > 0) {
        result.breakingChanges = updateRequest.breakingChanges;
        
        if (result.updateType === VersionUpdateType.PATCH || result.updateType === VersionUpdateType.MINOR) {
          result.warnings.push('Breaking changes detected in non-major version update');
        }
      }

      // Check dependent modules
      const dependentModules = this.moduleRegistry.getModuleDependents(updateRequest.moduleId);
      if (dependentModules.length > 0 && result.compatibilityImpact !== 'NONE') {
        result.warnings.push(`Update may affect ${dependentModules.length} dependent modules`);
        result.requiredActions.push('Notify dependent modules of update');
        result.requiredActions.push('Test compatibility with dependent modules');
      }

      // Validate changelog if provided
      if (updateRequest.changelog) {
        const changelogValidation = this.validateChangelog(updateRequest.changelog, updateRequest.newVersion);
        result.warnings.push(...changelogValidation.warnings);
        result.errors.push(...changelogValidation.errors);
      }

      // Check for required migration guide
      if (result.compatibilityImpact === 'BREAKING' && !updateRequest.migrationGuide) {
        result.warnings.push('Migration guide recommended for breaking changes');
      }

      // Validate rollback plan for major updates
      if (result.updateType === VersionUpdateType.MAJOR && !updateRequest.rollbackPlan) {
        result.warnings.push('Rollback plan recommended for major version updates');
      }

      // Generate required actions
      result.requiredActions.push(...this.generateUpdateActions(result, updateRequest));

      // Determine overall validity
      result.valid = result.errors.length === 0;

      console.log(`[ModuleUpdateVersioningService] Update validation completed for ${updateRequest.moduleId}:`, {
        valid: result.valid,
        updateType: result.updateType,
        compatibilityImpact: result.compatibilityImpact,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

      return result;

    } catch (error) {
      console.error(`[ModuleUpdateVersioningService] Error validating update for ${updateRequest.moduleId}:`, error);
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Check version compatibility between modules
   */
  public checkVersionCompatibility(
    moduleId: string,
    requiredVersion: string,
    availableVersion: string
  ): VersionCompatibilityResult {
    console.log(`[ModuleUpdateVersioningService] Checking compatibility for ${moduleId}: required ${requiredVersion}, available ${availableVersion}`);

    const result: VersionCompatibilityResult = {
      compatible: false,
      compatibilityScore: 0,
      issues: [],
      recommendations: []
    };

    try {
      const required = this.parseSemanticVersion(requiredVersion);
      const available = this.parseSemanticVersion(availableVersion);

      // Calculate compatibility score
      result.compatibilityScore = this.calculateCompatibilityScore(required, available);
      result.compatible = result.compatibilityScore >= this.COMPATIBILITY_THRESHOLD;

      // Check for specific compatibility issues
      if (available.major !== required.major) {
        result.issues.push({
          severity: 'ERROR',
          type: 'VERSION_MISMATCH',
          description: `Major version mismatch: required ${required.major}, available ${available.major}`,
          affectedComponent: moduleId,
          resolution: `Update to compatible major version ${required.major}.x.x`
        });
      }

      if (available.major === required.major && available.minor < required.minor) {
        result.issues.push({
          severity: 'WARNING',
          type: 'VERSION_MISMATCH',
          description: `Minor version too low: required ${required.minor}, available ${available.minor}`,
          affectedComponent: moduleId,
          resolution: `Update to version ${required.major}.${required.minor}.x or higher`
        });
      }

      if (available.major === required.major && 
          available.minor === required.minor && 
          available.patch < required.patch) {
        result.issues.push({
          severity: 'INFO',
          type: 'VERSION_MISMATCH',
          description: `Patch version too low: required ${required.patch}, available ${available.patch}`,
          affectedComponent: moduleId,
          resolution: `Update to version ${required.major}.${required.minor}.${required.patch} or higher`
        });
      }

      // Generate recommendations
      if (!result.compatible) {
        if (available.major < required.major) {
          result.recommendations.push(`Upgrade ${moduleId} to major version ${required.major}`);
        } else if (available.major === required.major && available.minor < required.minor) {
          result.recommendations.push(`Upgrade ${moduleId} to version ${required.major}.${required.minor}.x`);
        } else if (available.major === required.major && 
                   available.minor === required.minor && 
                   available.patch < required.patch) {
          result.recommendations.push(`Upgrade ${moduleId} to version ${required.major}.${required.minor}.${required.patch}`);
        }
      }

      console.log(`[ModuleUpdateVersioningService] Compatibility check completed for ${moduleId}:`, {
        compatible: result.compatible,
        score: result.compatibilityScore,
        issueCount: result.issues.length
      });

      return result;

    } catch (error) {
      console.error(`[ModuleUpdateVersioningService] Error checking compatibility for ${moduleId}:`, error);
      
      result.issues.push({
        severity: 'ERROR',
        type: 'VERSION_MISMATCH',
        description: `Compatibility check failed: ${error.message}`,
        affectedComponent: moduleId
      });

      return result;
    }
  }

  /**
   * Create rollback plan for module update
   */
  public createRollbackPlan(
    moduleId: string,
    currentVersion: string,
    targetVersion: string,
    updateType: VersionUpdateType
  ): RollbackPlan {
    console.log(`[ModuleUpdateVersioningService] Creating rollback plan for ${moduleId}: ${targetVersion} -> ${currentVersion}`);

    const steps: RollbackStep[] = [];
    let estimatedDuration = 0;
    const risks: string[] = [];
    const prerequisites: string[] = [];

    // Step 1: Backup current state
    steps.push({
      stepId: 'backup_current_state',
      description: 'Backup current module state and data',
      action: 'restore_data',
      automated: true,
      estimatedDuration: 30000, // 30 seconds
      risks: ['Data backup may be incomplete'],
      rollbackData: {
        version: targetVersion,
        timestamp: new Date().toISOString()
      }
    });

    // Step 2: Revert code changes
    steps.push({
      stepId: 'revert_code',
      description: `Revert module code to version ${currentVersion}`,
      action: 'revert_code',
      automated: true,
      estimatedDuration: 60000, // 1 minute
      risks: ['Code reversion may fail if files are locked'],
      rollbackData: {
        targetVersion: currentVersion,
        sourceVersion: targetVersion
      }
    });

    // Step 3: Update dependencies if needed
    if (updateType === VersionUpdateType.MAJOR || updateType === VersionUpdateType.MINOR) {
      steps.push({
        stepId: 'update_dependencies',
        description: 'Update module dependencies to compatible versions',
        action: 'update_dependencies',
        automated: true,
        estimatedDuration: 120000, // 2 minutes
        risks: ['Dependency conflicts may occur'],
        rollbackData: {
          targetVersion: currentVersion
        }
      });
    }

    // Step 4: Notify dependent services
    const dependentModules = this.moduleRegistry.getModuleDependents(moduleId);
    if (dependentModules.length > 0) {
      steps.push({
        stepId: 'notify_services',
        description: `Notify ${dependentModules.length} dependent modules of rollback`,
        action: 'notify_services',
        automated: true,
        estimatedDuration: 15000, // 15 seconds
        risks: ['Some services may not receive notifications'],
        rollbackData: {
          dependentModules,
          rollbackVersion: currentVersion
        }
      });
    }

    // Step 5: Verify rollback
    steps.push({
      stepId: 'verify_rollback',
      description: 'Verify module rollback was successful',
      action: 'verify_rollback',
      automated: true,
      estimatedDuration: 45000, // 45 seconds
      risks: ['Verification may fail if module is corrupted'],
      rollbackData: {
        expectedVersion: currentVersion,
        verificationChecks: ['version', 'dependencies', 'functionality']
      }
    });

    // Calculate total duration
    estimatedDuration = steps.reduce((total, step) => total + step.estimatedDuration, 0);

    // Determine risks based on update type
    if (updateType === VersionUpdateType.MAJOR) {
      risks.push('Major version rollback may cause data compatibility issues');
      risks.push('Breaking changes may not be fully reversible');
    }
    if (dependentModules.length > 0) {
      risks.push(`${dependentModules.length} dependent modules may be affected`);
    }

    // Set prerequisites
    prerequisites.push('Ensure no active transactions are using the module');
    prerequisites.push('Verify backup integrity before proceeding');
    if (updateType === VersionUpdateType.MAJOR) {
      prerequisites.push('Review data migration requirements');
    }

    const rollbackPlan: RollbackPlan = {
      rollbackVersion: currentVersion,
      rollbackSteps: steps,
      dataBackupRequired: updateType === VersionUpdateType.MAJOR,
      estimatedDuration,
      risks,
      prerequisites
    };

    // Store rollback plan
    if (!this.rollbackHistory.has(moduleId)) {
      this.rollbackHistory.set(moduleId, []);
    }
    const history = this.rollbackHistory.get(moduleId)!;
    history.unshift(rollbackPlan);
    
    // Keep only the most recent rollback plans
    if (history.length > this.MAX_ROLLBACK_HISTORY) {
      history.splice(this.MAX_ROLLBACK_HISTORY);
    }

    console.log(`[ModuleUpdateVersioningService] Rollback plan created for ${moduleId}:`, {
      stepCount: steps.length,
      estimatedDuration,
      riskCount: risks.length,
      dataBackupRequired: rollbackPlan.dataBackupRequired
    });

    return rollbackPlan;
  }

  /**
   * Execute module rollback
   */
  public async executeRollback(
    moduleId: string,
    rollbackPlan: RollbackPlan,
    options: {
      dryRun?: boolean;
      skipRiskySteps?: boolean;
      progressCallback?: (step: RollbackStep, progress: number) => void;
    } = {}
  ): Promise<{ success: boolean; completedSteps: string[]; errors: string[] }> {
    const { dryRun = false, skipRiskySteps = false, progressCallback } = options;

    console.log(`[ModuleUpdateVersioningService] Executing rollback for ${moduleId} to version ${rollbackPlan.rollbackVersion} (dryRun: ${dryRun})`);

    const completedSteps: string[] = [];
    const errors: string[] = [];

    // Check prerequisites
    for (const prerequisite of rollbackPlan.prerequisites) {
      console.log(`[ModuleUpdateVersioningService] Checking prerequisite: ${prerequisite}`);
      // In a real implementation, this would check actual prerequisites
    }

    // Execute rollback steps
    for (let i = 0; i < rollbackPlan.rollbackSteps.length; i++) {
      const step = rollbackPlan.rollbackSteps[i];
      
      // Skip risky steps if requested
      if (skipRiskySteps && step.risks.length > 0) {
        console.log(`[ModuleUpdateVersioningService] Skipping risky rollback step: ${step.stepId}`);
        continue;
      }

      try {
        // Report progress
        if (progressCallback) {
          progressCallback(step, (i / rollbackPlan.rollbackSteps.length) * 100);
        }

        console.log(`[ModuleUpdateVersioningService] Executing rollback step ${i + 1}/${rollbackPlan.rollbackSteps.length}: ${step.description}`);

        if (!dryRun) {
          await this.executeRollbackStep(step);
        }

        completedSteps.push(step.stepId);

      } catch (error) {
        const errorMsg = `Rollback step ${step.stepId} failed: ${error.message}`;
        console.error(`[ModuleUpdateVersioningService] ${errorMsg}`);
        errors.push(errorMsg);

        // Stop execution on critical errors
        if (!step.automated) {
          break;
        }
      }
    }

    const success = errors.length === 0 && (
      completedSteps.length === rollbackPlan.rollbackSteps.length || 
      (skipRiskySteps && completedSteps.length > 0)
    );

    console.log(`[ModuleUpdateVersioningService] Rollback execution completed for ${moduleId}:`, {
      success,
      completedSteps: completedSteps.length,
      totalSteps: rollbackPlan.rollbackSteps.length,
      errors: errors.length
    });

    return { success, completedSteps, errors };
  }

  /**
   * Create update notification for dependent modules
   */
  public async createUpdateNotification(
    moduleId: string,
    fromVersion: string,
    toVersion: string,
    changelog: ChangelogEntry[],
    breakingChanges: string[] = [],
    migrationGuide?: string
  ): Promise<ModuleUpdateNotification> {
    console.log(`[ModuleUpdateVersioningService] Creating update notification for ${moduleId}: ${fromVersion} -> ${toVersion}`);

    const updateType = this.getUpdateType(fromVersion, toVersion);
    const compatibilityImpact = this.analyzeCompatibilityImpact(updateType, breakingChanges, {});
    const affectedModules = this.moduleRegistry.getModuleDependents(moduleId);

    // Generate required actions based on update type and impact
    const requiredActions: string[] = [];
    if (compatibilityImpact === 'BREAKING') {
      requiredActions.push('Review breaking changes');
      requiredActions.push('Update code to handle breaking changes');
      requiredActions.push('Test thoroughly before deploying');
    } else if (compatibilityImpact === 'HIGH') {
      requiredActions.push('Review major changes');
      requiredActions.push('Test compatibility');
    } else if (compatibilityImpact === 'MEDIUM') {
      requiredActions.push('Review changes');
      requiredActions.push('Run regression tests');
    }

    if (migrationGuide) {
      requiredActions.push('Follow migration guide');
    }

    const notification: ModuleUpdateNotification = {
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

    // Store notification
    if (!this.updateNotifications.has(moduleId)) {
      this.updateNotifications.set(moduleId, []);
    }
    this.updateNotifications.get(moduleId)!.push(notification);

    // Create dependency update notification
    await this.dependencyManager.createUpdateNotification(
      moduleId,
      fromVersion,
      toVersion,
      {
        notifyDependents: true,
        includeCompatibilityAnalysis: true
      }
    );

    console.log(`[ModuleUpdateVersioningService] Update notification created for ${moduleId}:`, {
      affectedModules: affectedModules.length,
      updateType,
      compatibilityImpact,
      actionCount: requiredActions.length
    });

    return notification;
  }

  /**
   * Generate and manage changelog
   */
  public generateChangelog(
    moduleId: string,
    version: string,
    changes: Partial<ChangelogEntry>[]
  ): ChangelogEntry[] {
    console.log(`[ModuleUpdateVersioningService] Generating changelog for ${moduleId} version ${version}`);

    const changelog: ChangelogEntry[] = changes.map(change => ({
      version,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      type: change.type || 'changed',
      description: change.description || '',
      breakingChange: change.breakingChange || false,
      migrationRequired: change.migrationRequired || false,
      affectedComponents: change.affectedComponents || []
    }));

    // Cache the changelog
    if (!this.changelogCache.has(moduleId)) {
      this.changelogCache.set(moduleId, []);
    }
    const existingChangelog = this.changelogCache.get(moduleId)!;
    existingChangelog.unshift(...changelog);

    // Sort by version (newest first)
    existingChangelog.sort((a, b) => this.compareVersions(b.version, a.version));

    console.log(`[ModuleUpdateVersioningService] Changelog generated for ${moduleId}:`, {
      entryCount: changelog.length,
      totalEntries: existingChangelog.length
    });

    return changelog;
  }

  /**
   * Get changelog for a module
   */
  public getChangelog(moduleId: string, version?: string): ChangelogEntry[] {
    const changelog = this.changelogCache.get(moduleId) || [];
    
    if (version) {
      return changelog.filter(entry => entry.version === version);
    }
    
    return changelog;
  }

  /**
   * Get update notifications for a module
   */
  public getUpdateNotifications(moduleId: string): ModuleUpdateNotification[] {
    return this.updateNotifications.get(moduleId) || [];
  }

  /**
   * Get rollback history for a module
   */
  public getRollbackHistory(moduleId: string): RollbackPlan[] {
    return this.rollbackHistory.get(moduleId) || [];
  }

  /**
   * Clear update notifications for a module
   */
  public clearUpdateNotifications(moduleId: string): void {
    this.updateNotifications.delete(moduleId);
  }

  // Private helper methods

  private analyzeCompatibilityImpact(
    updateType: VersionUpdateType,
    breakingChanges: string[],
    updates: Partial<ModuleInfo>
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BREAKING' {
    if (breakingChanges.length > 0) {
      return 'BREAKING';
    }

    switch (updateType) {
      case VersionUpdateType.MAJOR:
        return 'HIGH';
      case VersionUpdateType.MINOR:
        return 'MEDIUM';
      case VersionUpdateType.PATCH:
        return 'LOW';
      case VersionUpdateType.PRERELEASE:
      case VersionUpdateType.BUILD:
        return 'NONE';
      default:
        return 'NONE';
    }
  }

  private calculateCompatibilityScore(required: SemanticVersion, available: SemanticVersion): number {
    // Major version must match
    if (available.major !== required.major) {
      return 0;
    }

    // Minor version compatibility
    if (available.minor < required.minor) {
      return 0.3;
    }

    // Patch version compatibility
    if (available.minor === required.minor && available.patch < required.patch) {
      return 0.7;
    }

    // Exact match
    if (available.minor === required.minor && available.patch === required.patch) {
      return 1.0;
    }

    // Higher version - good compatibility
    return 0.9;
  }

  private validateChangelog(changelog: ChangelogEntry[], version: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const entry of changelog) {
      if (entry.version !== version) {
        warnings.push(`Changelog entry version ${entry.version} does not match update version ${version}`);
      }

      if (!entry.description || entry.description.trim().length === 0) {
        errors.push('Changelog entry missing description');
      }

      if (entry.breakingChange && !entry.migrationRequired) {
        warnings.push('Breaking change detected but migration not marked as required');
      }
    }

    return { warnings, errors };
  }

  private generateUpdateActions(
    validation: UpdateValidationResult,
    updateRequest: ModuleUpdateRequest
  ): string[] {
    const actions: string[] = [];

    if (validation.updateType === VersionUpdateType.MAJOR) {
      actions.push('Create comprehensive test plan for major version update');
      actions.push('Review all breaking changes with stakeholders');
    }

    if (validation.compatibilityImpact === 'BREAKING') {
      actions.push('Prepare migration guide for breaking changes');
      actions.push('Schedule maintenance window for update deployment');
    }

    if (validation.breakingChanges.length > 0) {
      actions.push('Document all breaking changes in release notes');
    }

    if (!updateRequest.rollbackPlan && validation.updateType === VersionUpdateType.MAJOR) {
      actions.push('Create rollback plan for major version update');
    }

    return actions;
  }

  private calculateUpdateDeadline(
    updateType: VersionUpdateType,
    compatibilityImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BREAKING'
  ): string | undefined {
    const now = new Date();
    let daysToAdd = 0;

    // Set deadline based on update type and impact
    if (compatibilityImpact === 'BREAKING') {
      daysToAdd = 30; // 30 days for breaking changes
    } else if (updateType === VersionUpdateType.MAJOR) {
      daysToAdd = 21; // 21 days for major updates
    } else if (updateType === VersionUpdateType.MINOR) {
      daysToAdd = 14; // 14 days for minor updates
    } else {
      daysToAdd = 7; // 7 days for patch updates
    }

    const deadline = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return deadline.toISOString();
  }

  private async executeRollbackStep(step: RollbackStep): Promise<void> {
    console.log(`[ModuleUpdateVersioningService] Executing rollback step: ${step.description}`);

    // Simulate step execution based on action type
    switch (step.action) {
      case 'revert_code':
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleUpdateVersioningService] Reverted code for ${step.rollbackData?.targetVersion}`);
        break;

      case 'restore_data':
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleUpdateVersioningService] Restored data backup from ${step.rollbackData?.timestamp}`);
        break;

      case 'update_dependencies':
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleUpdateVersioningService] Updated dependencies for version ${step.rollbackData?.targetVersion}`);
        break;

      case 'notify_services':
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleUpdateVersioningService] Notified ${step.rollbackData?.dependentModules?.length || 0} dependent services`);
        break;

      case 'verify_rollback':
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleUpdateVersioningService] Verified rollback to version ${step.rollbackData?.expectedVersion}`);
        break;

      default:
        throw new Error(`Unknown rollback action: ${step.action}`);
    }
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(ms, 1000))); // Cap at 1 second for testing
  }

  private cleanupOldNotifications(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.NOTIFICATION_RETENTION_DAYS);
    const cutoffTime = cutoffDate.toISOString();

    for (const [moduleId, notifications] of this.updateNotifications.entries()) {
      const filteredNotifications = notifications.filter(n => n.notificationDate > cutoffTime);
      if (filteredNotifications.length === 0) {
        this.updateNotifications.delete(moduleId);
      } else {
        this.updateNotifications.set(moduleId, filteredNotifications);
      }
    }
  }

  private cleanupRollbackHistory(): void {
    // Keep only the most recent rollback plans for each module
    for (const [moduleId, history] of this.rollbackHistory.entries()) {
      if (history.length > this.MAX_ROLLBACK_HISTORY) {
        this.rollbackHistory.set(moduleId, history.slice(0, this.MAX_ROLLBACK_HISTORY));
      }
    }
  }
}

export default ModuleUpdateVersioningService;