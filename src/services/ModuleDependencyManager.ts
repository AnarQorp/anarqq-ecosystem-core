/**
 * Module Dependency Management Service
 * Handles dependency resolution, circular dependency detection, version compatibility,
 * update notifications, and automatic dependency installation
 */

import {
  RegisteredModule,
  QModuleMetadata,
  ModuleStatus,
  CompatibilityResult,
  DependencyConflict,
  VersionMismatch,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  DependencyError
} from '../types/qwallet-module-registration';
import { ModuleRegistry } from './ModuleRegistry';

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  resolved: boolean;
  dependencies: ResolvedDependency[];
  conflicts: DependencyConflict[];
  missingDependencies: string[];
  circularDependencies: string[];
  installationOrder: string[];
}

/**
 * Resolved dependency with version information
 */
export interface ResolvedDependency {
  moduleId: string;
  version: string;
  status: ModuleStatus;
  available: boolean;
  compatible: boolean;
  source: 'production' | 'sandbox' | 'external';
}

/**
 * Dependency update notification
 */
export interface DependencyUpdateNotification {
  moduleId: string;
  dependentModules: string[];
  updateType: 'major' | 'minor' | 'patch' | 'breaking';
  oldVersion: string;
  newVersion: string;
  compatibilityImpact: 'none' | 'low' | 'medium' | 'high' | 'breaking';
  requiredActions: string[];
  timestamp: string;
}

/**
 * Dependency installation plan
 */
export interface DependencyInstallationPlan {
  moduleId: string;
  dependencies: DependencyInstallationStep[];
  totalSteps: number;
  estimatedDuration: number;
  requiresUserApproval: boolean;
  risks: string[];
}

/**
 * Individual dependency installation step
 */
export interface DependencyInstallationStep {
  stepId: string;
  moduleId: string;
  action: 'install' | 'update' | 'verify' | 'configure';
  description: string;
  version: string;
  source: string;
  dependencies: string[];
  estimatedDuration: number;
  automated: boolean;
  risks: string[];
}

/**
 * Version compatibility checker
 */
export interface VersionCompatibilityChecker {
  isCompatible(requiredVersion: string, availableVersion: string): boolean;
  getCompatibilityScore(requiredVersion: string, availableVersion: string): number;
  suggestCompatibleVersion(requiredVersion: string, availableVersions: string[]): string | null;
}

/**
 * Module Dependency Manager class
 */
export class ModuleDependencyManager {
  private moduleRegistry: ModuleRegistry;
  private versionChecker: VersionCompatibilityChecker;
  private updateNotifications: Map<string, DependencyUpdateNotification[]> = new Map();
  private installationPlans: Map<string, DependencyInstallationPlan> = new Map();
  private dependencyCache: Map<string, DependencyResolutionResult> = new Map();
  
  // Configuration
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_DEPENDENCY_DEPTH = 10;
  private readonly NOTIFICATION_RETENTION_DAYS = 30;

  constructor(moduleRegistry: ModuleRegistry) {
    this.moduleRegistry = moduleRegistry;
    this.versionChecker = new SemanticVersionCompatibilityChecker();
    this.initializeDependencyManager();
  }

  /**
   * Initialize the dependency manager
   */
  private initializeDependencyManager(): void {
    // Set up periodic cleanup
    setInterval(() => this.cleanupExpiredCache(), 60000); // 1 minute
    setInterval(() => this.cleanupOldNotifications(), 3600000); // 1 hour
  }

  /**
   * Resolve dependencies for a module
   */
  public async resolveDependencies(
    moduleId: string, 
    dependencies: string[], 
    options: {
      includeTestMode?: boolean;
      maxDepth?: number;
      allowPartialResolution?: boolean;
    } = {}
  ): Promise<DependencyResolutionResult> {
    const { includeTestMode = false, maxDepth = this.MAX_DEPENDENCY_DEPTH, allowPartialResolution = false } = options;
    
    console.log(`[ModuleDependencyManager] Resolving dependencies for ${moduleId}:`, dependencies);
    
    // Check cache first
    const cacheKey = `${moduleId}:${dependencies.join(',')}:${includeTestMode}`;
    const cached = this.dependencyCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log(`[ModuleDependencyManager] Using cached resolution for ${moduleId}`);
      return cached;
    }

    const result: DependencyResolutionResult = {
      resolved: false,
      dependencies: [],
      conflicts: [],
      missingDependencies: [],
      circularDependencies: [],
      installationOrder: []
    };

    try {
      // 1. Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(moduleId, dependencies, maxDepth);
      if (circularDeps.length > 0) {
        result.circularDependencies = circularDeps;
        result.conflicts.push({
          moduleId,
          conflictType: 'CIRCULAR',
          description: `Circular dependency detected: ${circularDeps.join(' -> ')}`,
          suggestion: 'Remove circular dependencies by restructuring module relationships'
        });
      }

      // 2. Resolve each dependency
      const resolvedDeps: ResolvedDependency[] = [];
      const missingDeps: string[] = [];

      for (const depId of dependencies) {
        const resolved = await this.resolveSingleDependency(depId, includeTestMode);
        if (resolved.available) {
          resolvedDeps.push(resolved);
        } else {
          missingDeps.push(depId);
        }
      }

      result.dependencies = resolvedDeps;
      result.missingDependencies = missingDeps;

      // 3. Check version compatibility
      const versionConflicts = this.checkVersionCompatibility(resolvedDeps);
      result.conflicts.push(...versionConflicts);

      // 4. Generate installation order
      if (result.circularDependencies.length === 0) {
        result.installationOrder = this.generateInstallationOrder(resolvedDeps);
      }

      // 5. Determine if resolution was successful
      result.resolved = (
        result.circularDependencies.length === 0 &&
        (allowPartialResolution || result.missingDependencies.length === 0) &&
        result.conflicts.filter(c => c.conflictType === 'VERSION').length === 0
      );

      // Cache the result
      this.dependencyCache.set(cacheKey, {
        ...result,
        cachedAt: Date.now()
      } as any);

      console.log(`[ModuleDependencyManager] Dependency resolution for ${moduleId} completed:`, {
        resolved: result.resolved,
        dependencyCount: result.dependencies.length,
        missingCount: result.missingDependencies.length,
        conflictCount: result.conflicts.length
      });

      return result;

    } catch (error) {
      console.error(`[ModuleDependencyManager] Error resolving dependencies for ${moduleId}:`, error);
      
      result.conflicts.push({
        moduleId,
        conflictType: 'INCOMPATIBLE',
        description: `Dependency resolution failed: ${error.message}`,
        suggestion: 'Check module dependencies and try again'
      });

      return result;
    }
  }

  /**
   * Detect circular dependencies using depth-first search
   */
  public detectCircularDependencies(
    moduleId: string, 
    dependencies: string[], 
    maxDepth: number = this.MAX_DEPENDENCY_DEPTH
  ): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string, depth: number): string[] => {
      if (depth > maxDepth) {
        console.warn(`[ModuleDependencyManager] Maximum dependency depth exceeded for ${currentId}`);
        return [];
      }

      if (recursionStack.has(currentId)) {
        // Found a cycle - return the cycle path
        const cycleStart = path.indexOf(currentId);
        return path.slice(cycleStart).concat([currentId]);
      }

      if (visited.has(currentId)) {
        return [];
      }

      visited.add(currentId);
      recursionStack.add(currentId);
      path.push(currentId);

      // Get dependencies for current module
      const currentDeps = currentId === moduleId ? dependencies : this.moduleRegistry.getModuleDependencies(currentId);

      for (const depId of currentDeps) {
        const cycle = dfs(depId, depth + 1);
        if (cycle.length > 0) {
          return cycle;
        }
      }

      recursionStack.delete(currentId);
      path.pop();
      return [];
    };

    return dfs(moduleId, 0);
  }

  /**
   * Check version compatibility for resolved dependencies
   */
  public checkVersionCompatibility(dependencies: ResolvedDependency[]): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const versionMap = new Map<string, string[]>();

    // Group dependencies by module ID
    for (const dep of dependencies) {
      if (!versionMap.has(dep.moduleId)) {
        versionMap.set(dep.moduleId, []);
      }
      versionMap.get(dep.moduleId)!.push(dep.version);
    }

    // Check for version conflicts
    for (const [moduleId, versions] of versionMap.entries()) {
      if (versions.length > 1) {
        const uniqueVersions = [...new Set(versions)];
        if (uniqueVersions.length > 1) {
          conflicts.push({
            moduleId,
            conflictType: 'VERSION',
            description: `Multiple versions required: ${uniqueVersions.join(', ')}`,
            suggestion: `Use a single compatible version for ${moduleId}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Create dependency update notification system
   */
  public async createUpdateNotification(
    moduleId: string,
    oldVersion: string,
    newVersion: string,
    options: {
      notifyDependents?: boolean;
      includeCompatibilityAnalysis?: boolean;
    } = {}
  ): Promise<DependencyUpdateNotification> {
    const { notifyDependents = true, includeCompatibilityAnalysis = true } = options;

    console.log(`[ModuleDependencyManager] Creating update notification for ${moduleId}: ${oldVersion} -> ${newVersion}`);

    // Get dependent modules
    const dependentModules = notifyDependents ? this.moduleRegistry.getModuleDependents(moduleId) : [];

    // Analyze update type and compatibility impact
    const updateType = this.analyzeUpdateType(oldVersion, newVersion);
    const compatibilityImpact = includeCompatibilityAnalysis ? 
      this.analyzeCompatibilityImpact(oldVersion, newVersion, updateType) : 'none';

    // Generate required actions
    const requiredActions = this.generateRequiredActions(updateType, compatibilityImpact, dependentModules);

    const notification: DependencyUpdateNotification = {
      moduleId,
      dependentModules,
      updateType,
      oldVersion,
      newVersion,
      compatibilityImpact,
      requiredActions,
      timestamp: new Date().toISOString()
    };

    // Store notification
    if (!this.updateNotifications.has(moduleId)) {
      this.updateNotifications.set(moduleId, []);
    }
    this.updateNotifications.get(moduleId)!.push(notification);

    // Notify dependent modules if requested
    if (notifyDependents && dependentModules.length > 0) {
      await this.notifyDependentModules(notification);
    }

    console.log(`[ModuleDependencyManager] Update notification created for ${moduleId}:`, {
      dependentCount: dependentModules.length,
      updateType,
      compatibilityImpact,
      actionCount: requiredActions.length
    });

    return notification;
  }

  /**
   * Implement automatic dependency installation and management
   */
  public async createInstallationPlan(
    moduleId: string,
    dependencies: string[],
    options: {
      includeTestMode?: boolean;
      autoApprove?: boolean;
      skipOptionalDependencies?: boolean;
    } = {}
  ): Promise<DependencyInstallationPlan> {
    const { includeTestMode = false, autoApprove = false, skipOptionalDependencies = false } = options;

    console.log(`[ModuleDependencyManager] Creating installation plan for ${moduleId}:`, dependencies);

    // Resolve dependencies first
    const resolution = await this.resolveDependencies(moduleId, dependencies, { 
      includeTestMode, 
      allowPartialResolution: skipOptionalDependencies 
    });

    if (!resolution.resolved && !skipOptionalDependencies) {
      throw new DependencyError(
        `Cannot create installation plan: dependency resolution failed`,
        moduleId,
        resolution.missingDependencies
      );
    }

    const steps: DependencyInstallationStep[] = [];
    const risks: string[] = [];
    let totalDuration = 0;

    // Create installation steps based on installation order
    for (let i = 0; i < resolution.installationOrder.length; i++) {
      const depId = resolution.installationOrder[i];
      const dependency = resolution.dependencies.find(d => d.moduleId === depId);
      
      if (!dependency) continue;

      const step: DependencyInstallationStep = {
        stepId: `install_${depId}_${i}`,
        moduleId: depId,
        action: dependency.available ? 'verify' : 'install',
        description: dependency.available ? 
          `Verify ${depId} version ${dependency.version}` : 
          `Install ${depId} version ${dependency.version}`,
        version: dependency.version,
        source: dependency.source,
        dependencies: i > 0 ? [resolution.installationOrder[i - 1]] : [],
        estimatedDuration: dependency.available ? 2000 : 10000,
        automated: true,
        risks: dependency.status === ModuleStatus.DEVELOPMENT ? ['Module in development status'] : []
      };

      steps.push(step);
      totalDuration += step.estimatedDuration;
      risks.push(...step.risks);
    }

    // Add configuration step if needed
    if (steps.length > 0) {
      steps.push({
        stepId: 'configure_dependencies',
        moduleId,
        action: 'configure',
        description: 'Configure dependency relationships',
        version: '1.0.0',
        source: 'internal',
        dependencies: steps.map(s => s.stepId),
        estimatedDuration: 3000,
        automated: true,
        risks: []
      });
      totalDuration += 3000;
    }

    const plan: DependencyInstallationPlan = {
      moduleId,
      dependencies: steps,
      totalSteps: steps.length,
      estimatedDuration: totalDuration,
      requiresUserApproval: !autoApprove && (risks.length > 0 || resolution.conflicts.length > 0),
      risks: [...new Set(risks)]
    };

    // Cache the plan
    this.installationPlans.set(moduleId, plan);

    console.log(`[ModuleDependencyManager] Installation plan created for ${moduleId}:`, {
      stepCount: plan.totalSteps,
      estimatedDuration: plan.estimatedDuration,
      requiresApproval: plan.requiresUserApproval,
      riskCount: plan.risks.length
    });

    return plan;
  }

  /**
   * Execute automatic dependency installation
   */
  public async executeInstallationPlan(
    moduleId: string,
    options: {
      dryRun?: boolean;
      skipRiskySteps?: boolean;
      progressCallback?: (step: DependencyInstallationStep, progress: number) => void;
    } = {}
  ): Promise<{ success: boolean; completedSteps: string[]; errors: string[] }> {
    const { dryRun = false, skipRiskySteps = false, progressCallback } = options;

    console.log(`[ModuleDependencyManager] Executing installation plan for ${moduleId} (dryRun: ${dryRun})`);

    const plan = this.installationPlans.get(moduleId);
    if (!plan) {
      throw new Error(`No installation plan found for module: ${moduleId}`);
    }

    const completedSteps: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < plan.dependencies.length; i++) {
      const step = plan.dependencies[i];
      
      // Skip risky steps if requested
      if (skipRiskySteps && step.risks.length > 0) {
        console.log(`[ModuleDependencyManager] Skipping risky step: ${step.stepId}`);
        continue;
      }

      try {
        // Report progress
        if (progressCallback) {
          progressCallback(step, (i / plan.dependencies.length) * 100);
        }

        console.log(`[ModuleDependencyManager] Executing step ${i + 1}/${plan.dependencies.length}: ${step.description}`);

        if (!dryRun) {
          await this.executeInstallationStep(step);
        }

        completedSteps.push(step.stepId);

      } catch (error) {
        const errorMsg = `Step ${step.stepId} failed: ${error.message}`;
        console.error(`[ModuleDependencyManager] ${errorMsg}`);
        errors.push(errorMsg);

        // Stop execution on critical errors
        if (step.action === 'install' && !step.automated) {
          break;
        }
      }
    }

    const success = errors.length === 0 && (
      completedSteps.length === plan.dependencies.length || 
      (skipRiskySteps && completedSteps.length > 0)
    );

    console.log(`[ModuleDependencyManager] Installation plan execution completed for ${moduleId}:`, {
      success,
      completedSteps: completedSteps.length,
      totalSteps: plan.dependencies.length,
      errors: errors.length
    });

    return { success, completedSteps, errors };
  }

  /**
   * Get dependency update notifications for a module
   */
  public getUpdateNotifications(moduleId: string): DependencyUpdateNotification[] {
    return this.updateNotifications.get(moduleId) || [];
  }

  /**
   * Get all update notifications
   */
  public getAllUpdateNotifications(): Map<string, DependencyUpdateNotification[]> {
    return new Map(this.updateNotifications);
  }

  /**
   * Get installation plan for a module
   */
  public getInstallationPlan(moduleId: string): DependencyInstallationPlan | null {
    return this.installationPlans.get(moduleId) || null;
  }

  /**
   * Clear update notifications for a module
   */
  public clearUpdateNotifications(moduleId: string): void {
    this.updateNotifications.delete(moduleId);
  }

  // Private helper methods

  private async resolveSingleDependency(
    depId: string, 
    includeTestMode: boolean
  ): Promise<ResolvedDependency> {
    const module = this.moduleRegistry.getModule(depId, includeTestMode);
    
    if (module) {
      return {
        moduleId: depId,
        version: module.metadata.version,
        status: module.metadata.status,
        available: true,
        compatible: true, // If module exists in registry, consider it compatible
        source: module.registrationInfo.testMode ? 'sandbox' : 'production'
      };
    }

    // Check if it's an external dependency (not in our registry)
    return {
      moduleId: depId,
      version: 'unknown',
      status: ModuleStatus.DEVELOPMENT,
      available: false,
      compatible: false,
      source: 'external'
    };
  }

  private generateInstallationOrder(dependencies: ResolvedDependency[]): string[] {
    // Simple topological sort for installation order
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string) => {
      if (visiting.has(moduleId)) {
        // Circular dependency - skip for now
        return;
      }
      
      if (visited.has(moduleId)) {
        return;
      }

      visiting.add(moduleId);
      
      // Visit dependencies first
      const moduleDeps = this.moduleRegistry.getModuleDependencies(moduleId);
      for (const depId of moduleDeps) {
        if (dependencies.some(d => d.moduleId === depId)) {
          visit(depId);
        }
      }

      visiting.delete(moduleId);
      visited.add(moduleId);
      order.push(moduleId);
    };

    // Visit all dependencies
    for (const dep of dependencies) {
      visit(dep.moduleId);
    }

    return order;
  }

  private analyzeUpdateType(oldVersion: string, newVersion: string): 'major' | 'minor' | 'patch' | 'breaking' {
    const oldParts = oldVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);

    if (newParts[0] > oldParts[0]) {
      return 'major';
    } else if (newParts[1] > oldParts[1]) {
      return 'minor';
    } else if (newParts[2] > oldParts[2]) {
      return 'patch';
    } else {
      return 'breaking';
    }
  }

  private analyzeCompatibilityImpact(
    oldVersion: string, 
    newVersion: string, 
    updateType: 'major' | 'minor' | 'patch' | 'breaking'
  ): 'none' | 'low' | 'medium' | 'high' | 'breaking' {
    switch (updateType) {
      case 'patch':
        return 'none';
      case 'minor':
        return 'low';
      case 'major':
        return 'high';
      case 'breaking':
        return 'breaking';
      default:
        return 'medium';
    }
  }

  private generateRequiredActions(
    updateType: 'major' | 'minor' | 'patch' | 'breaking',
    compatibilityImpact: 'none' | 'low' | 'medium' | 'high' | 'breaking',
    dependentModules: string[]
  ): string[] {
    const actions: string[] = [];

    if (compatibilityImpact === 'breaking') {
      actions.push('Review breaking changes in release notes');
      actions.push('Update dependent modules to handle breaking changes');
      actions.push('Test all dependent modules thoroughly');
    } else if (compatibilityImpact === 'high') {
      actions.push('Review major changes in release notes');
      actions.push('Test dependent modules for compatibility');
    } else if (compatibilityImpact === 'medium') {
      actions.push('Review changes in release notes');
      actions.push('Run regression tests on dependent modules');
    } else if (compatibilityImpact === 'low') {
      actions.push('Review minor changes if needed');
    }

    if (dependentModules.length > 0) {
      actions.push(`Notify ${dependentModules.length} dependent modules of update`);
    }

    return actions;
  }

  private async notifyDependentModules(notification: DependencyUpdateNotification): Promise<void> {
    // In a real implementation, this would send notifications to dependent modules
    console.log(`[ModuleDependencyManager] Notifying ${notification.dependentModules.length} dependent modules:`, 
      notification.dependentModules);
    
    // For now, just log the notification
    for (const depModuleId of notification.dependentModules) {
      console.log(`[ModuleDependencyManager] Notification sent to ${depModuleId}:`, {
        updateType: notification.updateType,
        compatibilityImpact: notification.compatibilityImpact,
        requiredActions: notification.requiredActions.length
      });
    }
  }

  private async executeInstallationStep(step: DependencyInstallationStep): Promise<void> {
    console.log(`[ModuleDependencyManager] Executing installation step: ${step.description}`);

    // Simulate step execution based on action type
    switch (step.action) {
      case 'install':
        // In a real implementation, this would install the module
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleDependencyManager] Installed ${step.moduleId} version ${step.version}`);
        break;

      case 'update':
        // In a real implementation, this would update the module
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleDependencyManager] Updated ${step.moduleId} to version ${step.version}`);
        break;

      case 'verify':
        // In a real implementation, this would verify the module
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleDependencyManager] Verified ${step.moduleId} version ${step.version}`);
        break;

      case 'configure':
        // In a real implementation, this would configure the module
        await this.simulateDelay(step.estimatedDuration);
        console.log(`[ModuleDependencyManager] Configured dependencies for ${step.moduleId}`);
        break;

      default:
        throw new Error(`Unknown installation action: ${step.action}`);
    }
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(ms, 1000))); // Cap at 1 second for testing
  }

  private isCacheValid(cached: any): boolean {
    return cached.cachedAt && (Date.now() - cached.cachedAt) < this.CACHE_TTL;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.dependencyCache.entries()) {
      if (!this.isCacheValid(cached)) {
        this.dependencyCache.delete(key);
      }
    }
  }

  private cleanupOldNotifications(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.NOTIFICATION_RETENTION_DAYS);
    const cutoffTime = cutoffDate.toISOString();

    for (const [moduleId, notifications] of this.updateNotifications.entries()) {
      const filteredNotifications = notifications.filter(n => n.timestamp > cutoffTime);
      if (filteredNotifications.length === 0) {
        this.updateNotifications.delete(moduleId);
      } else {
        this.updateNotifications.set(moduleId, filteredNotifications);
      }
    }
  }
}

/**
 * Semantic Version Compatibility Checker
 */
export class SemanticVersionCompatibilityChecker implements VersionCompatibilityChecker {
  
  public isCompatible(requiredVersion: string, availableVersion: string): boolean {
    try {
      const required = this.parseVersion(requiredVersion);
      const available = this.parseVersion(availableVersion);

      // For now, use simple major version compatibility
      return available.major === required.major && 
             (available.minor > required.minor || 
              (available.minor === required.minor && available.patch >= required.patch));
    } catch (error) {
      console.warn(`[SemanticVersionCompatibilityChecker] Version parsing error:`, error);
      return false;
    }
  }

  public getCompatibilityScore(requiredVersion: string, availableVersion: string): number {
    try {
      const required = this.parseVersion(requiredVersion);
      const available = this.parseVersion(availableVersion);

      if (available.major !== required.major) {
        return 0; // Incompatible major version
      }

      if (available.minor < required.minor) {
        return 0.3; // Lower minor version
      }

      if (available.minor === required.minor && available.patch < required.patch) {
        return 0.7; // Lower patch version
      }

      if (available.minor === required.minor && available.patch === required.patch) {
        return 1.0; // Exact match
      }

      // Higher version - good compatibility
      return 0.9;
    } catch (error) {
      return 0;
    }
  }

  public suggestCompatibleVersion(requiredVersion: string, availableVersions: string[]): string | null {
    const compatibleVersions = availableVersions.filter(v => this.isCompatible(requiredVersion, v));
    
    if (compatibleVersions.length === 0) {
      return null;
    }

    // Return the highest compatible version
    return compatibleVersions.sort((a, b) => this.compareVersions(b, a))[0];
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }

  private compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) {
      return v1.major - v2.major;
    }

    if (v1.minor !== v2.minor) {
      return v1.minor - v2.minor;
    }

    return v1.patch - v2.patch;
  }
}

export default ModuleDependencyManager;