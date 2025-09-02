/**
 * MCP Tool Discovery and Capability Negotiation Service
 * 
 * Provides comprehensive MCP tool discovery, capability advertisement,
 * version negotiation, compatibility checking, and migration assistance.
 * 
 * This service implements task 32 from the ecosystem modular audit specification.
 */

import crypto from 'crypto';
import { EventBusService } from './EventBusService.mjs';
import { ModuleDiscoveryService } from './ModuleDiscoveryService.mjs';

export class MCPToolDiscoveryService {
  constructor() {
    this.eventBus = new EventBusService();
    this.moduleDiscovery = new ModuleDiscoveryService();
    
    // Tool registry storage
    this.toolRegistry = new Map();
    this.capabilityMatrix = new Map();
    this.versionCompatibility = new Map();
    this.deprecationSchedule = new Map();
    
    // Analytics and usage tracking
    this.toolUsageStats = new Map();
    this.compatibilityCache = new Map();
    this.migrationPaths = new Map();
    
    // Configuration
    this.config = {
      registryTTL: 3600000,        // 1 hour
      compatibilityCacheTTL: 1800000, // 30 minutes
      deprecationWarningDays: 90,   // 90 days before deprecation
      maxToolsPerModule: 50,        // Maximum tools per module
      maxVersionsSupported: 10      // Maximum versions to track
    };

    // Initialize with default capabilities
    this.initializeDefaultCapabilities();
  }

  /**
   * Register MCP tools for a module with capability advertisement
   * @param {Object} registration - Tool registration data
   * @returns {Promise<Object>} Registration result
   */
  async registerTools(registration) {
    try {
      const {
        moduleId,
        moduleName,
        version,
        tools,
        capabilities,
        compatibility,
        metadata = {}
      } = registration;

      // Validate registration
      const validation = this.validateToolRegistration(registration);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Create registry entry
      const registryEntry = {
        moduleId,
        moduleName,
        version,
        tools: this.processToolDefinitions(tools),
        capabilities: this.processCapabilities(capabilities),
        compatibility: this.processCompatibility(compatibility),
        metadata: {
          ...metadata,
          registeredAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          registrationId: crypto.randomUUID()
        }
      };

      // Store in registry
      this.toolRegistry.set(moduleId, registryEntry);
      
      // Update capability matrix
      this.updateCapabilityMatrix(moduleId, registryEntry);
      
      // Update version compatibility
      this.updateVersionCompatibility(moduleId, registryEntry);
      
      // Initialize usage statistics
      this.initializeUsageStats(moduleId, tools);

      // Publish registry update event
      await this.publishRegistryUpdateEvent('TOOLS_REGISTERED', {
        moduleId,
        moduleName,
        version,
        toolCount: tools.length,
        capabilities: Object.keys(capabilities),
        registrationId: registryEntry.metadata.registrationId
      });

      console.log(`[MCPToolDiscovery] ✅ Registered ${tools.length} tools for module: ${moduleId}`);

      return {
        success: true,
        registrationId: registryEntry.metadata.registrationId,
        toolCount: tools.length,
        capabilityCount: Object.keys(capabilities).length
      };

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Tool registration failed:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }  /**
 
  * Discover available MCP tools with filtering and capability matching
   * @param {Object} criteria - Discovery criteria
   * @returns {Promise<Object>} Discovery results
   */
  async discoverTools(criteria = {}) {
    try {
      const {
        moduleId,
        toolName,
        capabilities = [],
        version,
        compatibility,
        includeDeprecated = false,
        includeUsageStats = false,
        includeAlternatives = true,
        limit = 50,
        offset = 0
      } = criteria;

      // Get all registered tools
      let tools = Array.from(this.toolRegistry.values());

      // Apply filters
      if (moduleId) {
        tools = tools.filter(entry => entry.moduleId === moduleId);
      }

      if (toolName) {
        tools = tools.filter(entry => 
          entry.tools.some(tool => 
            tool.name.toLowerCase().includes(toolName.toLowerCase())
          )
        );
      }

      if (capabilities.length > 0) {
        tools = tools.filter(entry => 
          capabilities.every(cap => entry.capabilities[cap])
        );
      }

      if (version) {
        tools = tools.filter(entry => 
          this.isVersionCompatible(entry.version, version)
        );
      }

      if (!includeDeprecated) {
        tools = tools.filter(entry => 
          !this.isDeprecated(entry.moduleId)
        );
      }

      // Sort by relevance and usage
      tools = this.sortToolsByRelevance(tools, criteria);

      // Apply pagination
      const totalCount = tools.length;
      tools = tools.slice(offset, offset + limit);

      // Enhance results
      const enhancedTools = await Promise.all(
        tools.map(async (entry) => {
          const enhanced = { ...entry };

          if (includeUsageStats) {
            enhanced.usageStats = this.getToolUsageStats(entry.moduleId);
          }

          if (includeAlternatives) {
            enhanced.alternatives = await this.findAlternativeTools(entry);
          }

          // Add compatibility information
          enhanced.compatibilityInfo = this.getCompatibilityInfo(entry);

          // Add deprecation warnings
          enhanced.deprecationInfo = this.getDeprecationInfo(entry.moduleId);

          return enhanced;
        })
      );

      return {
        tools: enhancedTools,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit,
        searchMetadata: {
          criteria,
          appliedFilters: this.getAppliedFilters(criteria),
          searchTime: Date.now()
        }
      };

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Tool discovery failed:', error);
      throw new Error(`Tool discovery failed: ${error.message}`);
    }
  }

  /**
   * Negotiate capabilities between client and available tools
   * @param {Object} negotiation - Capability negotiation request
   * @returns {Promise<Object>} Negotiation result
   */
  async negotiateCapabilities(negotiation) {
    try {
      const {
        clientCapabilities,
        requiredCapabilities = [],
        preferredCapabilities = [],
        clientVersion,
        maxAlternatives = 5
      } = negotiation;

      // Find compatible tools
      const compatibleTools = await this.findCompatibleTools({
        capabilities: requiredCapabilities,
        clientVersion,
        includePartialMatches: true
      });

      // Score and rank tools
      const rankedTools = this.rankToolsByCompatibility(
        compatibleTools,
        clientCapabilities,
        requiredCapabilities,
        preferredCapabilities
      );

      // Generate negotiation result
      const result = {
        negotiationId: crypto.randomUUID(),
        compatible: rankedTools.length > 0,
        recommendedTools: rankedTools.slice(0, maxAlternatives),
        capabilityMatrix: this.generateCapabilityMatrix(rankedTools),
        migrationPaths: await this.generateMigrationPaths(rankedTools),
        alternatives: await this.findAlternativeCapabilities(requiredCapabilities),
        negotiationMetadata: {
          clientCapabilities,
          requiredCapabilities,
          preferredCapabilities,
          negotiatedAt: new Date().toISOString()
        }
      };

      // Track negotiation for analytics
      this.trackCapabilityNegotiation(result);

      return result;

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Capability negotiation failed:', error);
      throw new Error(`Capability negotiation failed: ${error.message}`);
    }
  }

  /**
   * Check tool compatibility and suggest alternatives
   * @param {Object} compatibilityCheck - Compatibility check request
   * @returns {Promise<Object>} Compatibility analysis
   */
  async checkToolCompatibility(compatibilityCheck) {
    try {
      const {
        moduleId,
        toolName,
        clientVersion,
        targetVersion,
        includeBreakingChanges = true,
        includeMigrationPath = true
      } = compatibilityCheck;

      // Get tool information
      const toolEntry = this.toolRegistry.get(moduleId);
      if (!toolEntry) {
        return {
          compatible: false,
          error: 'Module not found in registry'
        };
      }

      const tool = toolEntry.tools.find(t => t.name === toolName);
      if (!tool) {
        return {
          compatible: false,
          error: 'Tool not found in module'
        };
      }

      // Perform compatibility analysis
      const compatibility = {
        compatible: clientVersion ? this.isVersionCompatible(clientVersion, targetVersion) : 
                   this.isVersionCompatible(toolEntry.version, targetVersion),
        currentVersion: toolEntry.version,
        targetVersion,
        breakingChanges: [],
        deprecatedFeatures: [],
        newFeatures: [],
        migrationRequired: false
      };

      if (includeBreakingChanges) {
        compatibility.breakingChanges = await this.getBreakingChanges(
          moduleId, 
          toolName, 
          clientVersion, 
          targetVersion
        );
        compatibility.migrationRequired = compatibility.breakingChanges.length > 0;
      }

      if (includeMigrationPath && compatibility.migrationRequired) {
        compatibility.migrationPath = await this.generateToolMigrationPath(
          moduleId,
          toolName,
          clientVersion,
          targetVersion
        );
      }

      // Find alternative tools if not compatible
      if (!compatibility.compatible) {
        compatibility.alternatives = await this.findAlternativeTools(toolEntry, {
          sameFunctionality: true,
          betterCompatibility: true
        });
      }

      return compatibility;

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Compatibility check failed:', error);
      throw new Error(`Compatibility check failed: ${error.message}`);
    }
  }  /**

   * Manage tool deprecation and provide migration assistance
   * @param {Object} deprecation - Deprecation management request
   * @returns {Promise<Object>} Deprecation management result
   */
  async manageDeprecation(deprecation) {
    try {
      const {
        action, // 'schedule', 'update', 'cancel', 'execute'
        moduleId,
        toolName,
        deprecationDate,
        sunsetDate,
        reason,
        migrationGuide,
        replacementTool
      } = deprecation;

      switch (action) {
        case 'schedule':
          return await this.scheduleDeprecation({
            moduleId,
            toolName,
            deprecationDate,
            sunsetDate,
            reason,
            migrationGuide,
            replacementTool
          });

        case 'update':
          return await this.updateDeprecation({
            moduleId,
            toolName,
            deprecationDate,
            sunsetDate,
            reason,
            migrationGuide
          });

        case 'cancel':
          return await this.cancelDeprecation(moduleId, toolName);

        case 'execute':
          return await this.executeDeprecation(moduleId, toolName);

        default:
          throw new Error(`Unknown deprecation action: ${action}`);
      }

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Deprecation management failed:', error);
      throw new Error(`Deprecation management failed: ${error.message}`);
    }
  }

  /**
   * Get tool usage analytics and optimization recommendations
   * @param {Object} analyticsRequest - Analytics request
   * @returns {Promise<Object>} Usage analytics and recommendations
   */
  async getToolAnalytics(analyticsRequest = {}) {
    try {
      const {
        moduleId,
        toolName,
        period = '30d',
        includeRecommendations = true,
        includeOptimizations = true,
        includeTrends = true
      } = analyticsRequest;

      // Collect usage statistics
      const usageStats = this.collectUsageStatistics(moduleId, toolName, period);
      
      // Generate analytics
      const analytics = {
        period,
        usageStats,
        popularTools: this.getPopularTools(period),
        capabilityUsage: this.getCapabilityUsage(period),
        compatibilityIssues: this.getCompatibilityIssues(),
        deprecationImpact: this.getDeprecationImpact()
      };

      if (includeTrends) {
        analytics.trends = this.analyzeTrends(usageStats, period);
      }

      if (includeRecommendations) {
        analytics.recommendations = await this.generateOptimizationRecommendations(
          analytics
        );
      }

      if (includeOptimizations) {
        analytics.optimizations = await this.generatePerformanceOptimizations(
          analytics
        );
      }

      return analytics;

    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Analytics generation failed:', error);
      throw new Error(`Analytics generation failed: ${error.message}`);
    }
  }

  // Helper Methods

  /**
   * Initialize default capabilities
   */
  initializeDefaultCapabilities() {
    const defaultCapabilities = {
      'identity-verification': {
        description: 'Identity verification and authentication',
        requiredTools: ['squid.verifyIdentity', 'squid.activeContext'],
        compatibility: ['v1', 'v2']
      },
      'payment-processing': {
        description: 'Payment and transaction processing',
        requiredTools: ['wallet.sign', 'wallet.pay', 'wallet.quote'],
        compatibility: ['v1']
      },
      'encryption-services': {
        description: 'Encryption and cryptographic operations',
        requiredTools: ['qlock.encrypt', 'qlock.decrypt', 'qlock.sign', 'qlock.verify'],
        compatibility: ['v1', 'v2']
      },
      'permission-management': {
        description: 'Permission checking and policy management',
        requiredTools: ['qonsent.check', 'qonsent.grant', 'qonsent.revoke'],
        compatibility: ['v1']
      },
      'data-indexing': {
        description: 'Data indexing and retrieval',
        requiredTools: ['qindex.put', 'qindex.get', 'qindex.list'],
        compatibility: ['v1', 'v2']
      },
      'security-audit': {
        description: 'Security auditing and risk assessment',
        requiredTools: ['qerberos.audit', 'qerberos.riskScore'],
        compatibility: ['v1']
      },
      'privacy-protection': {
        description: 'Privacy and anonymization services',
        requiredTools: ['qmask.apply', 'qmask.profile'],
        compatibility: ['v1']
      },
      'file-storage': {
        description: 'File storage and retrieval',
        requiredTools: ['qdrive.put', 'qdrive.get', 'qdrive.metadata'],
        compatibility: ['v1']
      },
      'messaging': {
        description: 'Messaging and communication',
        requiredTools: ['qmail.send', 'qmail.fetch', 'qchat.post'],
        compatibility: ['v1']
      },
      'marketplace': {
        description: 'Content marketplace operations',
        requiredTools: ['qmarket.list', 'qmarket.purchase', 'qmarket.license'],
        compatibility: ['v1']
      }
    };

    for (const [capability, definition] of Object.entries(defaultCapabilities)) {
      this.capabilityMatrix.set(capability, definition);
    }
  } 
 /**
   * Validate tool registration
   */
  validateToolRegistration(registration) {
    const errors = [];

    if (!registration.moduleId) {
      errors.push('moduleId is required');
    }

    if (!registration.moduleName) {
      errors.push('moduleName is required');
    }

    if (!registration.version) {
      errors.push('version is required');
    }

    if (!registration.tools || !Array.isArray(registration.tools)) {
      errors.push('tools must be an array');
    } else if (registration.tools.length === 0) {
      errors.push('at least one tool must be provided');
    } else if (registration.tools.length > this.config.maxToolsPerModule) {
      errors.push(`maximum ${this.config.maxToolsPerModule} tools allowed per module`);
    }

    if (!registration.capabilities || typeof registration.capabilities !== 'object') {
      errors.push('capabilities must be an object');
    }

    // Validate individual tools
    registration.tools?.forEach((tool, index) => {
      if (!tool.name) {
        errors.push(`tool[${index}].name is required`);
      }
      if (!tool.description) {
        errors.push(`tool[${index}].description is required`);
      }
      if (!tool.parameters || typeof tool.parameters !== 'object') {
        errors.push(`tool[${index}].parameters must be an object`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process tool definitions
   */
  processToolDefinitions(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      returns: tool.returns || {},
      examples: tool.examples || [],
      deprecated: tool.deprecated || false,
      deprecationDate: tool.deprecationDate,
      replacementTool: tool.replacementTool,
      metadata: {
        ...tool.metadata,
        processedAt: new Date().toISOString()
      }
    }));
  }

  /**
   * Process capabilities
   */
  processCapabilities(capabilities) {
    const processed = {};
    
    for (const [capability, definition] of Object.entries(capabilities)) {
      processed[capability] = {
        supported: definition.supported !== false,
        version: definition.version || '1.0.0',
        features: definition.features || [],
        limitations: definition.limitations || [],
        metadata: definition.metadata || {}
      };
    }

    return processed;
  }

  /**
   * Process compatibility information
   */
  processCompatibility(compatibility) {
    return {
      minVersion: compatibility.minVersion,
      maxVersion: compatibility.maxVersion,
      supportedVersions: compatibility.supportedVersions || [],
      breakingChanges: compatibility.breakingChanges || [],
      deprecatedFeatures: compatibility.deprecatedFeatures || [],
      migrationGuides: compatibility.migrationGuides || {}
    };
  }

  /**
   * Update capability matrix
   */
  updateCapabilityMatrix(moduleId, registryEntry) {
    for (const [capability, definition] of Object.entries(registryEntry.capabilities)) {
      if (!this.capabilityMatrix.has(capability)) {
        this.capabilityMatrix.set(capability, {
          description: `Custom capability: ${capability}`,
          providers: [],
          compatibility: []
        });
      }

      const capabilityInfo = this.capabilityMatrix.get(capability);
      capabilityInfo.providers = capabilityInfo.providers || [];
      
      // Remove existing entry for this module
      capabilityInfo.providers = capabilityInfo.providers.filter(
        p => p.moduleId !== moduleId
      );
      
      // Add updated entry
      capabilityInfo.providers.push({
        moduleId,
        moduleName: registryEntry.moduleName,
        version: registryEntry.version,
        supported: definition.supported,
        features: definition.features
      });

      this.capabilityMatrix.set(capability, capabilityInfo);
    }
  }

  /**
   * Update version compatibility
   */
  updateVersionCompatibility(moduleId, registryEntry) {
    if (!this.versionCompatibility.has(moduleId)) {
      this.versionCompatibility.set(moduleId, {
        versions: [],
        compatibility: {}
      });
    }

    const versionInfo = this.versionCompatibility.get(moduleId);
    
    // Add version if not exists
    if (!versionInfo.versions.includes(registryEntry.version)) {
      versionInfo.versions.push(registryEntry.version);
      versionInfo.versions.sort(this.compareVersions);
      
      // Keep only recent versions
      if (versionInfo.versions.length > this.config.maxVersionsSupported) {
        versionInfo.versions = versionInfo.versions.slice(-this.config.maxVersionsSupported);
      }
    }

    // Update compatibility matrix
    versionInfo.compatibility[registryEntry.version] = registryEntry.compatibility;

    this.versionCompatibility.set(moduleId, versionInfo);
  }

  /**
   * Initialize usage statistics
   */
  initializeUsageStats(moduleId, tools) {
    if (!this.toolUsageStats.has(moduleId)) {
      this.toolUsageStats.set(moduleId, {
        totalUsage: 0,
        tools: {},
        lastUpdated: new Date().toISOString()
      });
    }

    const stats = this.toolUsageStats.get(moduleId);
    
    tools.forEach(tool => {
      if (!stats.tools[tool.name]) {
        stats.tools[tool.name] = {
          usageCount: 0,
          lastUsed: null,
          errorCount: 0,
          avgResponseTime: 0
        };
      }
    });

    this.toolUsageStats.set(moduleId, stats);
  }  /**
  
 * Publish registry update event
   */
  async publishRegistryUpdateEvent(action, data) {
    try {
      await this.eventBus.publish({
        topic: 'q.tools.registry.updated.v1',
        payload: {
          action,
          timestamp: new Date().toISOString(),
          ...data
        },
        actor: {
          squidId: 'system',
          subId: 'mcp-tool-discovery'
        },
        metadata: {
          source: 'MCPToolDiscoveryService',
          version: '1.0.0'
        }
      });
    } catch (error) {
      console.error('[MCPToolDiscovery] ❌ Failed to publish registry update event:', error);
    }
  }

  /**
   * Find compatible tools
   */
  async findCompatibleTools(criteria) {
    const { capabilities, clientVersion, includePartialMatches = false } = criteria;
    const compatibleTools = [];

    for (const [moduleId, entry] of this.toolRegistry.entries()) {
      let compatibilityScore = 0;
      const matchedCapabilities = [];

      // Check capability matches
      for (const requiredCapability of capabilities) {
        if (entry.capabilities[requiredCapability]?.supported) {
          compatibilityScore += 1;
          matchedCapabilities.push(requiredCapability);
        }
      }

      // Check version compatibility
      const versionCompatible = !clientVersion || 
        this.isVersionCompatible(entry.version, clientVersion);

      if (versionCompatible && (
        compatibilityScore === capabilities.length || 
        (includePartialMatches && compatibilityScore > 0)
      )) {
        compatibleTools.push({
          ...entry,
          compatibilityScore: compatibilityScore / capabilities.length,
          matchedCapabilities,
          versionCompatible
        });
      }
    }

    return compatibleTools.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Rank tools by compatibility
   */
  rankToolsByCompatibility(tools, clientCapabilities, requiredCapabilities, preferredCapabilities) {
    return tools.map(tool => {
      let score = tool.compatibilityScore * 100; // Base compatibility score

      // Bonus for preferred capabilities
      preferredCapabilities.forEach(prefCap => {
        if (tool.capabilities[prefCap]?.supported) {
          score += 10;
        }
      });

      // Bonus for additional capabilities
      const additionalCapabilities = Object.keys(tool.capabilities).filter(
        cap => tool.capabilities[cap].supported && 
               !requiredCapabilities.includes(cap) &&
               !preferredCapabilities.includes(cap)
      );
      score += additionalCapabilities.length * 2;

      // Usage-based scoring
      const usageStats = this.toolUsageStats.get(tool.moduleId);
      if (usageStats) {
        score += Math.min(usageStats.totalUsage / 100, 20); // Max 20 points for usage
      }

      return {
        ...tool,
        finalScore: score,
        ranking: {
          compatibilityScore: tool.compatibilityScore,
          preferredCapabilityBonus: preferredCapabilities.filter(
            cap => tool.capabilities[cap]?.supported
          ).length * 10,
          additionalCapabilityBonus: additionalCapabilities.length * 2,
          usageBonus: usageStats ? Math.min(usageStats.totalUsage / 100, 20) : 0
        }
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Generate capability matrix
   */
  generateCapabilityMatrix(tools) {
    const matrix = {};

    tools.forEach(tool => {
      Object.keys(tool.capabilities).forEach(capability => {
        if (!matrix[capability]) {
          matrix[capability] = {
            providers: [],
            totalProviders: 0,
            averageScore: 0
          };
        }

        matrix[capability].providers.push({
          moduleId: tool.moduleId,
          moduleName: tool.moduleName,
          version: tool.version,
          supported: tool.capabilities[capability].supported,
          features: tool.capabilities[capability].features || []
        });
      });
    });

    // Calculate statistics
    Object.keys(matrix).forEach(capability => {
      const providers = matrix[capability].providers;
      matrix[capability].totalProviders = providers.length;
      matrix[capability].averageScore = providers.reduce((sum, p) => 
        sum + (p.supported ? 1 : 0), 0) / providers.length;
    });

    return matrix;
  }

  /**
   * Generate migration paths
   */
  async generateMigrationPaths(tools) {
    const migrationPaths = [];

    for (const tool of tools) {
      if (this.migrationPaths.has(tool.moduleId)) {
        const paths = this.migrationPaths.get(tool.moduleId);
        migrationPaths.push({
          moduleId: tool.moduleId,
          moduleName: tool.moduleName,
          paths: paths
        });
      }
    }

    return migrationPaths;
  }

  /**
   * Find alternative capabilities
   */
  async findAlternativeCapabilities(requiredCapabilities) {
    const alternatives = {};

    for (const capability of requiredCapabilities) {
      const capabilityInfo = this.capabilityMatrix.get(capability);
      if (capabilityInfo && capabilityInfo.providers) {
        alternatives[capability] = capabilityInfo.providers.filter(
          provider => provider.supported
        );
      }
    }

    return alternatives;
  }

  /**
   * Track capability negotiation for analytics
   */
  trackCapabilityNegotiation(result) {
    // Implementation for tracking negotiations
    // This would typically store data for analytics
  } 
 /**
   * Find alternative tools
   */
  async findAlternativeTools(toolEntry, options = {}) {
    const alternatives = [];
    const { sameFunctionality = false, betterCompatibility = false } = options;

    for (const [moduleId, entry] of this.toolRegistry.entries()) {
      if (entry.moduleId === toolEntry.moduleId) continue;

      // Check for similar capabilities
      const sharedCapabilities = Object.keys(toolEntry.capabilities).filter(
        cap => entry.capabilities[cap]?.supported
      );

      if (sharedCapabilities.length > 0) {
        alternatives.push({
          moduleId: entry.moduleId,
          moduleName: entry.moduleName,
          version: entry.version,
          sharedCapabilities,
          compatibilityScore: sharedCapabilities.length / Object.keys(toolEntry.capabilities).length
        });
      }
    }

    return alternatives.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Sort tools by relevance
   */
  sortToolsByRelevance(tools, criteria) {
    return tools.sort((a, b) => {
      // Sort by usage stats if available
      const aUsage = this.toolUsageStats.get(a.moduleId)?.totalUsage || 0;
      const bUsage = this.toolUsageStats.get(b.moduleId)?.totalUsage || 0;
      
      if (aUsage !== bUsage) {
        return bUsage - aUsage;
      }

      // Sort by registration date (newer first)
      const aDate = new Date(a.metadata.registeredAt);
      const bDate = new Date(b.metadata.registeredAt);
      return bDate - aDate;
    });
  }

  /**
   * Get applied filters
   */
  getAppliedFilters(criteria) {
    const filters = [];
    
    if (criteria.moduleId) filters.push(`moduleId: ${criteria.moduleId}`);
    if (criteria.toolName) filters.push(`toolName: ${criteria.toolName}`);
    if (criteria.capabilities?.length) filters.push(`capabilities: ${criteria.capabilities.join(', ')}`);
    if (criteria.version) filters.push(`version: ${criteria.version}`);
    if (!criteria.includeDeprecated) filters.push('excludeDeprecated: true');

    return filters;
  }

  /**
   * Get compatibility info
   */
  getCompatibilityInfo(entry) {
    return {
      version: entry.version,
      supportedVersions: entry.compatibility?.supportedVersions || [],
      breakingChanges: entry.compatibility?.breakingChanges || [],
      migrationRequired: (entry.compatibility?.breakingChanges || []).length > 0
    };
  }

  /**
   * Get deprecation info
   */
  getDeprecationInfo(moduleId) {
    if (this.deprecationSchedule.has(moduleId)) {
      const schedule = this.deprecationSchedule.get(moduleId);
      const now = new Date();
      const deprecationDate = new Date(schedule.deprecationDate);
      const daysUntilDeprecation = Math.ceil((deprecationDate - now) / (1000 * 60 * 60 * 24));

      return {
        deprecated: now >= deprecationDate,
        deprecationDate: schedule.deprecationDate,
        sunsetDate: schedule.sunsetDate,
        daysUntilDeprecation: Math.max(0, daysUntilDeprecation),
        reason: schedule.reason,
        migrationGuide: schedule.migrationGuide,
        replacementTool: schedule.replacementTool
      };
    }

    return {
      deprecated: false
    };
  }

  /**
   * Check if tool is deprecated
   */
  isDeprecated(moduleId) {
    if (this.deprecationSchedule.has(moduleId)) {
      const schedule = this.deprecationSchedule.get(moduleId);
      return new Date() >= new Date(schedule.deprecationDate);
    }
    return false;
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(version1, version2) {
    // Simple semantic version compatibility check
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    // Major version must match for compatibility
    return v1Parts[0] === v2Parts[0];
  }

  /**
   * Compare versions for sorting
   */
  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }

    return 0;
  }  /**

   * Schedule deprecation
   */
  async scheduleDeprecation(deprecationInfo) {
    const { moduleId, toolName, deprecationDate, sunsetDate, reason, migrationGuide, replacementTool } = deprecationInfo;

    const schedule = {
      moduleId,
      toolName,
      deprecationDate,
      sunsetDate,
      reason,
      migrationGuide,
      replacementTool,
      scheduledAt: new Date().toISOString(),
      status: 'scheduled'
    };

    this.deprecationSchedule.set(moduleId, schedule);

    // Publish deprecation event
    await this.publishRegistryUpdateEvent('DEPRECATION_SCHEDULED', {
      moduleId,
      toolName,
      deprecationDate,
      sunsetDate,
      reason
    });

    return {
      success: true,
      scheduleId: `${moduleId}-${Date.now()}`,
      deprecationDate,
      sunsetDate
    };
  }

  /**
   * Update deprecation
   */
  async updateDeprecation(updateInfo) {
    const { moduleId } = updateInfo;

    if (!this.deprecationSchedule.has(moduleId)) {
      throw new Error('Deprecation schedule not found');
    }

    const currentSchedule = this.deprecationSchedule.get(moduleId);
    const updatedSchedule = {
      ...currentSchedule,
      ...updateInfo,
      updatedAt: new Date().toISOString()
    };

    this.deprecationSchedule.set(moduleId, updatedSchedule);

    await this.publishRegistryUpdateEvent('DEPRECATION_UPDATED', {
      moduleId,
      changes: Object.keys(updateInfo).filter(key => key !== 'moduleId')
    });

    return {
      success: true,
      updated: true
    };
  }

  /**
   * Cancel deprecation
   */
  async cancelDeprecation(moduleId, toolName) {
    if (!this.deprecationSchedule.has(moduleId)) {
      throw new Error('Deprecation schedule not found');
    }

    this.deprecationSchedule.delete(moduleId);

    await this.publishRegistryUpdateEvent('DEPRECATION_CANCELLED', {
      moduleId,
      toolName
    });

    return {
      success: true,
      cancelled: true
    };
  }

  /**
   * Execute deprecation
   */
  async executeDeprecation(moduleId, toolName) {
    if (!this.deprecationSchedule.has(moduleId)) {
      throw new Error('Deprecation schedule not found');
    }

    const schedule = this.deprecationSchedule.get(moduleId);
    schedule.status = 'executed';
    schedule.executedAt = new Date().toISOString();

    this.deprecationSchedule.set(moduleId, schedule);

    await this.publishRegistryUpdateEvent('DEPRECATION_EXECUTED', {
      moduleId,
      toolName
    });

    return {
      success: true,
      executed: true
    };
  }

  /**
   * Get tool usage statistics
   */
  getToolUsageStats(moduleId) {
    return this.toolUsageStats.get(moduleId) || {
      totalUsage: 0,
      tools: {},
      lastUpdated: null
    };
  }

  /**
   * Collect usage statistics
   */
  collectUsageStatistics(moduleId, toolName, period) {
    // Implementation would collect actual usage data
    // For now, return mock data structure
    return {
      moduleId,
      toolName,
      period,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      peakUsage: 0,
      trends: []
    };
  }

  /**
   * Get popular tools
   */
  getPopularTools(period) {
    const tools = [];
    
    for (const [moduleId, stats] of this.toolUsageStats.entries()) {
      const toolEntry = this.toolRegistry.get(moduleId);
      if (toolEntry) {
        tools.push({
          moduleId,
          moduleName: toolEntry.moduleName,
          totalUsage: stats.totalUsage,
          toolCount: Object.keys(stats.tools).length
        });
      }
    }

    return tools.sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 10);
  }

  /**
   * Get capability usage
   */
  getCapabilityUsage(period) {
    const usage = {};

    for (const [capability, info] of this.capabilityMatrix.entries()) {
      usage[capability] = {
        totalProviders: info.providers?.length || 0,
        activeProviders: info.providers?.filter(p => p.supported).length || 0,
        usageCount: 0 // Would be calculated from actual usage data
      };
    }

    return usage;
  }

  /**
   * Get compatibility issues
   */
  getCompatibilityIssues() {
    const issues = [];

    for (const [moduleId, entry] of this.toolRegistry.entries()) {
      if (entry.compatibility?.breakingChanges?.length > 0) {
        issues.push({
          moduleId,
          moduleName: entry.moduleName,
          version: entry.version,
          breakingChanges: entry.compatibility.breakingChanges,
          severity: 'high'
        });
      }
    }

    return issues;
  }

  /**
   * Get deprecation impact
   */
  getDeprecationImpact() {
    const impact = [];

    for (const [moduleId, schedule] of this.deprecationSchedule.entries()) {
      const usageStats = this.toolUsageStats.get(moduleId);
      impact.push({
        moduleId,
        deprecationDate: schedule.deprecationDate,
        sunsetDate: schedule.sunsetDate,
        affectedUsers: usageStats?.totalUsage || 0,
        replacementTool: schedule.replacementTool,
        migrationRequired: !!schedule.migrationGuide
      });
    }

    return impact.sort((a, b) => new Date(a.deprecationDate) - new Date(b.deprecationDate));
  }  /**
   * 
Analyze trends
   */
  analyzeTrends(usageStats, period) {
    // Implementation would analyze actual trend data
    return {
      growth: 'stable',
      seasonality: 'none',
      predictions: []
    };
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(analytics) {
    const recommendations = [];

    // Check for underutilized tools
    const underutilized = analytics.popularTools.filter(tool => tool.totalUsage < 10);
    if (underutilized.length > 0) {
      recommendations.push({
        type: 'underutilization',
        priority: 'medium',
        description: 'Some tools have low usage and may need promotion or deprecation',
        affectedTools: underutilized.map(t => t.moduleId)
      });
    }

    // Check for capability gaps
    const lowCoverageCapabilities = Object.entries(analytics.capabilityUsage)
      .filter(([, usage]) => usage.activeProviders < 2)
      .map(([capability]) => capability);

    if (lowCoverageCapabilities.length > 0) {
      recommendations.push({
        type: 'capability_gap',
        priority: 'high',
        description: 'Some capabilities have insufficient provider coverage',
        affectedCapabilities: lowCoverageCapabilities
      });
    }

    return recommendations;
  }

  /**
   * Generate performance optimizations
   */
  async generatePerformanceOptimizations(analytics) {
    const optimizations = [];

    // Check for high-usage tools that might need caching
    const highUsageTools = analytics.popularTools.filter(tool => tool.totalUsage > 1000);
    if (highUsageTools.length > 0) {
      optimizations.push({
        type: 'caching',
        priority: 'high',
        description: 'High-usage tools would benefit from response caching',
        affectedTools: highUsageTools.map(t => t.moduleId)
      });
    }

    return optimizations;
  }

  /**
   * Get breaking changes between versions
   */
  async getBreakingChanges(moduleId, toolName, fromVersion, toVersion) {
    const versionInfo = this.versionCompatibility.get(moduleId);
    if (!versionInfo) return [];

    const changes = [];
    
    // Check compatibility matrix for breaking changes
    for (const version of versionInfo.versions) {
      if (this.isVersionBetween(version, fromVersion, toVersion)) {
        const compatibility = versionInfo.compatibility[version];
        if (compatibility?.breakingChanges) {
          changes.push(...compatibility.breakingChanges.filter(
            change => !toolName || change.affectedTools?.includes(toolName)
          ));
        }
      }
    }

    return changes;
  }

  /**
   * Generate tool migration path
   */
  async generateToolMigrationPath(moduleId, toolName, fromVersion, toVersion) {
    const path = {
      fromVersion,
      toVersion,
      steps: [],
      estimatedEffort: 'low',
      automationAvailable: false
    };

    // Get breaking changes
    const breakingChanges = await this.getBreakingChanges(moduleId, toolName, fromVersion, toVersion);
    
    // Generate migration steps
    breakingChanges.forEach(change => {
      path.steps.push({
        description: change.description,
        action: change.migrationAction || 'manual_update',
        automated: change.automated || false,
        documentation: change.documentationUrl
      });
    });

    // Estimate effort
    if (path.steps.length === 0) {
      path.estimatedEffort = 'none';
    } else if (path.steps.length <= 2) {
      path.estimatedEffort = 'low';
    } else if (path.steps.length <= 5) {
      path.estimatedEffort = 'medium';
    } else {
      path.estimatedEffort = 'high';
    }

    path.automationAvailable = path.steps.some(step => step.automated);

    return path;
  }

  /**
   * Check if version is between two versions
   */
  isVersionBetween(version, fromVersion, toVersion) {
    return this.compareVersions(version, fromVersion) >= 0 && 
           this.compareVersions(version, toVersion) <= 0;
  }
}

// Export singleton instance
let mcpToolDiscoveryService = null;

export function getMCPToolDiscoveryService() {
  if (!mcpToolDiscoveryService) {
    mcpToolDiscoveryService = new MCPToolDiscoveryService();
  }
  return mcpToolDiscoveryService;
}