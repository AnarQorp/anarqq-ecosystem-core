/**
 * Module Registry Storage Service
 * Provides in-memory storage and indexing for registered modules
 */

import {
  RegisteredModule,
  ModuleSearchCriteria,
  ModuleSearchResult,
  ModuleFilter,
  ModuleStatus,
  VerificationResult,
  ModuleAccessStats,
  ModuleAuditEvent,
  CompatibilityResult,
  DependencyConflict,
  VersionMismatch
} from '../types/qwallet-module-registration';
import { IdentityType } from '../types/identity';
import { moduleRegistrationPerformanceOptimizer } from './ModuleRegistrationPerformanceOptimizer';

/**
 * Dependency graph node representing module relationships
 */
interface DependencyNode {
  moduleId: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  version: string;
  status: ModuleStatus;
}

/**
 * Cached verification result with expiration
 */
interface CachedVerificationResult {
  result: VerificationResult;
  cachedAt: number;
  expiresAt: number;
  moduleVersion: string;
}

/**
 * Search index entry for efficient module lookup
 */
interface SearchIndexEntry {
  moduleId: string;
  name: string;
  version: string;
  status: ModuleStatus;
  identityTypes: Set<IdentityType>;
  integrations: Set<string>;
  keywords: Set<string>;
  registeredAt: number;
  lastUpdated: number;
}

/**
 * Module Registry class for in-memory module storage and indexing
 */
export class ModuleRegistry {
  // Core storage maps
  private productionModules = new Map<string, RegisteredModule>();
  private sandboxModules = new Map<string, RegisteredModule>();
  
  // Dependency management
  private dependencyGraph = new Map<string, DependencyNode>();
  private reverseDependencyIndex = new Map<string, Set<string>>();
  
  // Caching and performance
  private signatureCache = new Map<string, CachedVerificationResult>();
  private searchIndex = new Map<string, SearchIndexEntry>();
  
  // Statistics and monitoring
  private accessStats = new Map<string, ModuleAccessStats>();
  private auditLog: ModuleAuditEvent[] = [];
  
  // Configuration
  private readonly SIGNATURE_CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly MAX_AUDIT_LOG_SIZE = 10000;
  private readonly SEARCH_RESULT_LIMIT = 100;

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Initialize the registry with default settings
   */
  private initializeRegistry(): void {
    // Set up periodic cleanup tasks
    setInterval(() => this.cleanupExpiredCache(), 300000); // 5 minutes
    setInterval(() => this.trimAuditLog(), 600000); // 10 minutes
  }

  /**
   * Register a module in production registry
   */
  public registerProductionModule(module: RegisteredModule): boolean {
    try {
      const moduleId = module.moduleId;
      
      // Check if module already exists
      if (this.productionModules.has(moduleId)) {
        throw new Error(`Module ${moduleId} already exists in production registry`);
      }

      // Store the module
      this.productionModules.set(moduleId, module);
      
      // Update search index
      this.updateSearchIndex(module);
      
      // Add to performance optimizer search index
      moduleRegistrationPerformanceOptimizer.addModuleToSearchIndex(module);
      
      // Update dependency graph
      this.updateDependencyGraph(module);
      
      // Initialize access stats
      this.initializeAccessStats(moduleId);
      
      // Log the registration
      this.logAuditEvent({
        eventId: this.generateEventId(),
        moduleId,
        action: 'REGISTERED',
        actorIdentity: module.registrationInfo.registeredBy,
        timestamp: new Date().toISOString(),
        details: {
          version: module.metadata.version,
          status: module.metadata.status,
          testMode: false
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to register production module:', error);
      return false;
    }
  }

  /**
   * Register a module in sandbox registry
   */
  public registerSandboxModule(module: RegisteredModule): boolean {
    try {
      const moduleId = module.moduleId;
      
      // Mark as test mode
      module.registrationInfo.testMode = true;
      
      // Store the module
      this.sandboxModules.set(moduleId, module);
      
      // Update search index (with test mode flag)
      this.updateSearchIndex(module);
      
      // Initialize access stats
      this.initializeAccessStats(moduleId);
      
      // Log the registration
      this.logAuditEvent({
        eventId: this.generateEventId(),
        moduleId,
        action: 'REGISTERED',
        actorIdentity: module.registrationInfo.registeredBy,
        timestamp: new Date().toISOString(),
        details: {
          version: module.metadata.version,
          status: module.metadata.status,
          testMode: true
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to register sandbox module:', error);
      return false;
    }
  }

  /**
   * Get a module by ID from either registry
   */
  public getModule(moduleId: string, includeTestMode: boolean = false): RegisteredModule | null {
    // Record access
    this.recordAccess(moduleId);
    
    // Check production first
    const productionModule = this.productionModules.get(moduleId);
    if (productionModule) {
      return productionModule;
    }
    
    // Check sandbox if requested
    if (includeTestMode) {
      const sandboxModule = this.sandboxModules.get(moduleId);
      if (sandboxModule) {
        return sandboxModule;
      }
    }
    
    return null;
  }

  /**
   * Search modules based on criteria with performance optimization
   */
  public searchModules(criteria: ModuleSearchCriteria): ModuleSearchResult {
    const limit = Math.min(criteria.limit || this.SEARCH_RESULT_LIMIT, this.SEARCH_RESULT_LIMIT);
    const offset = criteria.offset || 0;
    
    // Try to use performance optimizer's indexed search first
    const candidateModuleIds = moduleRegistrationPerformanceOptimizer.searchModulesOptimized(criteria);
    
    let modules: RegisteredModule[];
    
    if (candidateModuleIds.size > 0) {
      // Use indexed search results
      modules = Array.from(candidateModuleIds)
        .map(moduleId => this.getModule(moduleId, criteria.includeTestMode || false))
        .filter((module): module is RegisteredModule => module !== null);
      
      console.log(`[ModuleRegistry] Using optimized search, found ${modules.length} candidates from index`);
    } else {
      // Fall back to full scan
      modules = this.getAllModules(criteria.includeTestMode || false);
      console.log(`[ModuleRegistry] Using full scan search for ${modules.length} modules`);
    }
    
    // Filter modules based on criteria (additional filtering for indexed results)
    const filteredModules = modules.filter(module => this.matchesCriteria(module, criteria));
    
    // Sort by relevance and registration date
    filteredModules.sort((a, b) => {
      // Primary sort by status (production first)
      if (a.metadata.status !== b.metadata.status) {
        const statusOrder = { 'PRODUCTION_READY': 0, 'TESTING': 1, 'DEVELOPMENT': 2, 'DEPRECATED': 3, 'SUSPENDED': 4 };
        return (statusOrder[a.metadata.status] || 5) - (statusOrder[b.metadata.status] || 5);
      }
      
      // Secondary sort by registration date (newest first)
      return new Date(b.registrationInfo.registeredAt).getTime() - new Date(a.registrationInfo.registeredAt).getTime();
    });
    
    // Apply pagination
    const paginatedResults = filteredModules.slice(offset, offset + limit);
    
    // Record search access for each result
    paginatedResults.forEach(module => this.recordAccess(module.moduleId));
    
    return {
      modules: paginatedResults,
      totalCount: filteredModules.length,
      hasMore: offset + limit < filteredModules.length,
      nextCursor: offset + limit < filteredModules.length ? String(offset + limit) : undefined
    };
  }

  /**
   * List modules with optional filtering
   */
  public listModules(filter?: ModuleFilter, includeTestMode: boolean = false): RegisteredModule[] {
    const modules = this.getAllModules(includeTestMode);
    
    if (!filter) {
      return modules;
    }
    
    return modules.filter(module => this.matchesFilter(module, filter));
  }

  /**
   * Update module metadata
   */
  public updateModule(moduleId: string, updatedModule: RegisteredModule): boolean {
    try {
      // Check production registry first
      if (this.productionModules.has(moduleId)) {
        this.productionModules.set(moduleId, updatedModule);
        this.updateSearchIndex(updatedModule);
        this.updateDependencyGraph(updatedModule);
        this.invalidateSignatureCache(moduleId);
        
        this.logAuditEvent({
          eventId: this.generateEventId(),
          moduleId,
          action: 'UPDATED',
          actorIdentity: updatedModule.registrationInfo.registeredBy,
          timestamp: new Date().toISOString(),
          details: {
            version: updatedModule.metadata.version,
            status: updatedModule.metadata.status,
            testMode: false
          }
        });
        
        return true;
      }
      
      // Check sandbox registry
      if (this.sandboxModules.has(moduleId)) {
        updatedModule.registrationInfo.testMode = true;
        this.sandboxModules.set(moduleId, updatedModule);
        this.updateSearchIndex(updatedModule);
        this.invalidateSignatureCache(moduleId);
        
        this.logAuditEvent({
          eventId: this.generateEventId(),
          moduleId,
          action: 'UPDATED',
          actorIdentity: updatedModule.registrationInfo.registeredBy,
          timestamp: new Date().toISOString(),
          details: {
            version: updatedModule.metadata.version,
            status: updatedModule.metadata.status,
            testMode: true
          }
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update module:', error);
      return false;
    }
  }

  /**
   * Remove a module from registry
   */
  public deregisterModule(moduleId: string, actorIdentity: string): boolean {
    try {
      let removed = false;
      let testMode = false;
      
      // Remove from production
      if (this.productionModules.has(moduleId)) {
        this.productionModules.delete(moduleId);
        removed = true;
      }
      
      // Remove from sandbox
      if (this.sandboxModules.has(moduleId)) {
        this.sandboxModules.delete(moduleId);
        testMode = true;
        removed = true;
      }
      
      if (removed) {
        // Clean up related data
        this.removeFromSearchIndex(moduleId);
        moduleRegistrationPerformanceOptimizer.removeModuleFromSearchIndex(moduleId);
        this.removeFromDependencyGraph(moduleId);
        this.invalidateSignatureCache(moduleId);
        this.accessStats.delete(moduleId);
        
        this.logAuditEvent({
          eventId: this.generateEventId(),
          moduleId,
          action: 'DEREGISTERED',
          actorIdentity,
          timestamp: new Date().toISOString(),
          details: { testMode }
        });
      }
      
      return removed;
    } catch (error) {
      console.error('Failed to deregister module:', error);
      return false;
    }
  }

  /**
   * Promote a sandbox module to production
   */
  public promoteSandboxToProduction(moduleId: string, actorIdentity: string): boolean {
    try {
      const sandboxModule = this.sandboxModules.get(moduleId);
      if (!sandboxModule) {
        return false;
      }
      
      // Check if production version already exists
      if (this.productionModules.has(moduleId)) {
        throw new Error(`Module ${moduleId} already exists in production`);
      }
      
      // Create production version
      const productionModule: RegisteredModule = {
        ...sandboxModule,
        registrationInfo: {
          ...sandboxModule.registrationInfo,
          testMode: false,
          promotedAt: new Date().toISOString(),
          promotedFrom: 'sandbox'
        }
      };
      
      // Move to production
      this.productionModules.set(moduleId, productionModule);
      this.sandboxModules.delete(moduleId);
      
      // Update indexes
      this.updateSearchIndex(productionModule);
      this.updateDependencyGraph(productionModule);
      
      this.logAuditEvent({
        eventId: this.generateEventId(),
        moduleId,
        action: 'UPDATED',
        actorIdentity,
        timestamp: new Date().toISOString(),
        details: {
          action: 'promoted_to_production',
          promotedFrom: 'sandbox'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to promote sandbox module:', error);
      return false;
    }
  }

  /**
   * Get module dependencies
   */
  public getModuleDependencies(moduleId: string): string[] {
    const node = this.dependencyGraph.get(moduleId);
    return node ? Array.from(node.dependencies) : [];
  }

  /**
   * Get modules that depend on this module
   */
  public getModuleDependents(moduleId: string): string[] {
    const node = this.dependencyGraph.get(moduleId);
    return node ? Array.from(node.dependents) : [];
  }

  /**
   * Check dependency compatibility
   */
  public checkDependencyCompatibility(moduleId: string, dependencies: string[]): CompatibilityResult {
    const conflicts: DependencyConflict[] = [];
    const missingDependencies: string[] = [];
    const versionMismatches: VersionMismatch[] = [];
    
    // Check for missing dependencies
    for (const depId of dependencies) {
      if (!this.productionModules.has(depId) && !this.sandboxModules.has(depId)) {
        missingDependencies.push(depId);
      }
    }
    
    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(moduleId, dependencies);
    if (circularDeps.length > 0) {
      conflicts.push({
        moduleId,
        conflictType: 'CIRCULAR',
        description: `Circular dependency detected: ${circularDeps.join(' -> ')}`,
        suggestion: 'Remove circular dependencies by restructuring module relationships'
      });
    }
    
    // Check version compatibility
    for (const depId of dependencies) {
      const depModule = this.getModule(depId, true);
      if (depModule && depModule.metadata.status === 'DEPRECATED') {
        versionMismatches.push({
          moduleId: depId,
          requiredVersion: 'active',
          availableVersion: 'deprecated',
          compatible: false
        });
      }
    }
    
    return {
      compatible: conflicts.length === 0 && missingDependencies.length === 0 && versionMismatches.length === 0,
      conflicts,
      missingDependencies,
      versionMismatches
    };
  }

  /**
   * Cache signature verification result
   */
  public cacheSignatureVerification(moduleId: string, result: VerificationResult, moduleVersion: string): void {
    const now = Date.now();
    this.signatureCache.set(moduleId, {
      result,
      cachedAt: now,
      expiresAt: now + this.SIGNATURE_CACHE_TTL,
      moduleVersion
    });
  }

  /**
   * Get cached signature verification result
   */
  public getCachedSignatureVerification(moduleId: string, moduleVersion: string): VerificationResult | null {
    const cached = this.signatureCache.get(moduleId);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      this.signatureCache.delete(moduleId);
      return null;
    }
    
    // Check if version matches
    if (cached.moduleVersion !== moduleVersion) {
      this.signatureCache.delete(moduleId);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Get access statistics for a module
   */
  public getAccessStats(moduleId: string): ModuleAccessStats | null {
    return this.accessStats.get(moduleId) || null;
  }

  /**
   * Get all access statistics
   */
  public getAllAccessStats(): Map<string, ModuleAccessStats> {
    return new Map(this.accessStats);
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(moduleId?: string, limit?: number): ModuleAuditEvent[] {
    let events = this.auditLog;
    
    if (moduleId) {
      events = events.filter(event => event.moduleId === moduleId);
    }
    
    if (limit) {
      events = events.slice(-limit);
    }
    
    return events.slice().reverse(); // Return newest first
  }

  /**
   * Get registry statistics
   */
  public getRegistryStats(): {
    productionModules: number;
    sandboxModules: number;
    totalModules: number;
    totalAccesses: number;
    cacheHitRate: number;
    auditLogSize: number;
  } {
    const totalAccesses = Array.from(this.accessStats.values())
      .reduce((sum, stats) => sum + stats.totalQueries, 0);
    
    const cacheEntries = this.signatureCache.size;
    const cacheHitRate = cacheEntries > 0 ? (cacheEntries / (cacheEntries + totalAccesses)) * 100 : 0;
    
    return {
      productionModules: this.productionModules.size,
      sandboxModules: this.sandboxModules.size,
      totalModules: this.productionModules.size + this.sandboxModules.size,
      totalAccesses,
      cacheHitRate,
      auditLogSize: this.auditLog.length
    };
  }

  // Private helper methods

  private getAllModules(includeTestMode: boolean): RegisteredModule[] {
    const modules: RegisteredModule[] = [];
    
    // Add production modules
    modules.push(...Array.from(this.productionModules.values()));
    
    // Add sandbox modules if requested
    if (includeTestMode) {
      modules.push(...Array.from(this.sandboxModules.values()));
    }
    
    return modules;
  }

  private matchesCriteria(module: RegisteredModule, criteria: ModuleSearchCriteria): boolean {
    // Name matching
    if (criteria.name && !module.metadata.module.toLowerCase().includes(criteria.name.toLowerCase())) {
      return false;
    }
    
    // Status matching
    if (criteria.status && module.metadata.status !== criteria.status) {
      return false;
    }
    
    // Identity type matching
    if (criteria.identityType && !module.metadata.identities_supported.includes(criteria.identityType)) {
      return false;
    }
    
    // Integration matching
    if (criteria.integration && !module.metadata.integrations.includes(criteria.integration)) {
      return false;
    }
    
    // Compliance matching
    if (criteria.hasCompliance !== undefined) {
      const hasCompliance = module.metadata.compliance.audit || 
                           module.metadata.compliance.privacy_enforced || 
                           module.metadata.compliance.kyc_support;
      if (criteria.hasCompliance !== hasCompliance) {
        return false;
      }
    }
    
    // Version range matching
    if (criteria.minVersion && this.compareVersions(module.metadata.version, criteria.minVersion) < 0) {
      return false;
    }
    
    if (criteria.maxVersion && this.compareVersions(module.metadata.version, criteria.maxVersion) > 0) {
      return false;
    }
    
    return true;
  }

  private matchesFilter(module: RegisteredModule, filter: ModuleFilter): boolean {
    // Status filter
    if (filter.status && !filter.status.includes(module.metadata.status)) {
      return false;
    }
    
    // Identity types filter
    if (filter.identityTypes) {
      const hasMatchingIdentity = filter.identityTypes.some(type => 
        module.metadata.identities_supported.includes(type)
      );
      if (!hasMatchingIdentity) {
        return false;
      }
    }
    
    // Integrations filter
    if (filter.integrations) {
      const hasMatchingIntegration = filter.integrations.some(integration => 
        module.metadata.integrations.includes(integration)
      );
      if (!hasMatchingIntegration) {
        return false;
      }
    }
    
    // Date range filters
    if (filter.registeredAfter) {
      const registeredAt = new Date(module.registrationInfo.registeredAt);
      const afterDate = new Date(filter.registeredAfter);
      if (registeredAt <= afterDate) {
        return false;
      }
    }
    
    if (filter.registeredBefore) {
      const registeredAt = new Date(module.registrationInfo.registeredAt);
      const beforeDate = new Date(filter.registeredBefore);
      if (registeredAt >= beforeDate) {
        return false;
      }
    }
    
    return true;
  }

  private updateSearchIndex(module: RegisteredModule): void {
    const keywords = new Set<string>();
    
    // Add module name words
    module.metadata.module.toLowerCase().split(/\s+/).forEach(word => keywords.add(word));
    
    // Add description words
    module.metadata.description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 3) keywords.add(word);
    });
    
    // Add integrations
    module.metadata.integrations.forEach(integration => keywords.add(integration.toLowerCase()));
    
    const indexEntry: SearchIndexEntry = {
      moduleId: module.moduleId,
      name: module.metadata.module.toLowerCase(),
      version: module.metadata.version,
      status: module.metadata.status,
      identityTypes: new Set(module.metadata.identities_supported),
      integrations: new Set(module.metadata.integrations),
      keywords,
      registeredAt: new Date(module.registrationInfo.registeredAt).getTime(),
      lastUpdated: Date.now()
    };
    
    this.searchIndex.set(module.moduleId, indexEntry);
  }

  private removeFromSearchIndex(moduleId: string): void {
    this.searchIndex.delete(moduleId);
  }

  private updateDependencyGraph(module: RegisteredModule): void {
    const moduleId = module.moduleId;
    const dependencies = new Set(module.metadata.dependencies || []);
    
    // Get or create node
    let node = this.dependencyGraph.get(moduleId);
    if (!node) {
      node = {
        moduleId,
        dependencies: new Set(),
        dependents: new Set(),
        version: module.metadata.version,
        status: module.metadata.status
      };
      this.dependencyGraph.set(moduleId, node);
    }
    
    // Update node properties
    node.dependencies = dependencies;
    node.version = module.metadata.version;
    node.status = module.metadata.status;
    
    // Update reverse dependencies
    for (const depId of dependencies) {
      let depNode = this.dependencyGraph.get(depId);
      if (!depNode) {
        // Create placeholder node for dependency
        depNode = {
          moduleId: depId,
          dependencies: new Set(),
          dependents: new Set(),
          version: 'unknown',
          status: ModuleStatus.DEVELOPMENT
        };
        this.dependencyGraph.set(depId, depNode);
      }
      depNode.dependents.add(moduleId);
    }
  }

  private removeFromDependencyGraph(moduleId: string): void {
    const node = this.dependencyGraph.get(moduleId);
    if (!node) return;
    
    // Remove this module from its dependencies' dependents
    for (const depId of node.dependencies) {
      const depNode = this.dependencyGraph.get(depId);
      if (depNode) {
        depNode.dependents.delete(moduleId);
      }
    }
    
    // Remove this module from its dependents' dependencies
    for (const dependentId of node.dependents) {
      const dependentNode = this.dependencyGraph.get(dependentId);
      if (dependentNode) {
        dependentNode.dependencies.delete(moduleId);
      }
    }
    
    this.dependencyGraph.delete(moduleId);
  }

  private detectCircularDependencies(moduleId: string, dependencies: string[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (currentId: string, path: string[]): string[] => {
      if (recursionStack.has(currentId)) {
        // Found a cycle
        const cycleStart = path.indexOf(currentId);
        return path.slice(cycleStart).concat([currentId]);
      }
      
      if (visited.has(currentId)) {
        return [];
      }
      
      visited.add(currentId);
      recursionStack.add(currentId);
      
      const currentDeps = currentId === moduleId ? dependencies : this.getModuleDependencies(currentId);
      
      for (const depId of currentDeps) {
        const cycle = dfs(depId, [...path, currentId]);
        if (cycle.length > 0) {
          return cycle;
        }
      }
      
      recursionStack.delete(currentId);
      return [];
    };
    
    return dfs(moduleId, []);
  }

  private initializeAccessStats(moduleId: string): void {
    this.accessStats.set(moduleId, {
      moduleId,
      totalQueries: 0,
      uniqueCallers: new Set(),
      lastAccessed: new Date().toISOString(),
      averageResponseTime: 0,
      errorCount: 0
    });
  }

  private recordAccess(moduleId: string, callerId?: string, responseTime?: number, isError?: boolean): void {
    const stats = this.accessStats.get(moduleId);
    if (!stats) return;
    
    stats.totalQueries++;
    stats.lastAccessed = new Date().toISOString();
    
    if (callerId) {
      stats.uniqueCallers.add(callerId);
    }
    
    if (responseTime !== undefined) {
      // Update running average
      stats.averageResponseTime = (stats.averageResponseTime * (stats.totalQueries - 1) + responseTime) / stats.totalQueries;
    }
    
    if (isError) {
      stats.errorCount++;
    }
  }

  private invalidateSignatureCache(moduleId: string): void {
    this.signatureCache.delete(moduleId);
  }

  private logAuditEvent(event: ModuleAuditEvent): void {
    this.auditLog.push(event);
    
    // Trim log if it gets too large
    if (this.auditLog.length > this.MAX_AUDIT_LOG_SIZE) {
      this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_LOG_SIZE * 0.8);
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [moduleId, cached] of this.signatureCache.entries()) {
      if (now > cached.expiresAt) {
        this.signatureCache.delete(moduleId);
      }
    }
  }

  private trimAuditLog(): void {
    if (this.auditLog.length > this.MAX_AUDIT_LOG_SIZE) {
      this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_LOG_SIZE * 0.8);
    }
  }
}

export default ModuleRegistry;