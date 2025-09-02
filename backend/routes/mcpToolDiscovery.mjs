/**
 * MCP Tool Discovery API Routes
 * 
 * Provides HTTP endpoints for MCP tool discovery, capability negotiation,
 * compatibility checking, and deprecation management.
 */

import express from 'express';
import { getMCPToolDiscoveryService } from '../services/MCPToolDiscoveryService.mjs';

const router = express.Router();
const mcpToolDiscovery = getMCPToolDiscoveryService();

/**
 * Register MCP tools for a module
 * POST /api/mcp-tools/register
 */
router.post('/register', async (req, res) => {
  try {
    const registration = req.body;
    
    // Add request metadata
    registration.metadata = {
      ...registration.metadata,
      registeredBy: req.headers['x-squid-id'] || 'anonymous',
      registrationSource: 'http-api',
      userAgent: req.headers['user-agent']
    };

    const result = await mcpToolDiscovery.registerTools(registration);

    if (result.success) {
      res.status(201).json({
        status: 'ok',
        code: 'TOOLS_REGISTERED',
        message: `Successfully registered ${result.toolCount} tools`,
        data: {
          registrationId: result.registrationId,
          toolCount: result.toolCount,
          capabilityCount: result.capabilityCount
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        code: 'REGISTRATION_FAILED',
        message: 'Tool registration failed',
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('[MCPToolDiscovery API] Registration error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error during tool registration'
    });
  }
});

/**
 * Discover available MCP tools
 * GET /api/mcp-tools/discover
 */
router.get('/discover', async (req, res) => {
  try {
    const criteria = {
      moduleId: req.query.moduleId,
      toolName: req.query.toolName,
      capabilities: req.query.capabilities ? req.query.capabilities.split(',') : [],
      version: req.query.version,
      includeDeprecated: req.query.includeDeprecated === 'true',
      includeUsageStats: req.query.includeUsageStats === 'true',
      includeAlternatives: req.query.includeAlternatives !== 'false',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await mcpToolDiscovery.discoverTools(criteria);

    res.json({
      status: 'ok',
      code: 'DISCOVERY_SUCCESS',
      message: `Found ${result.tools.length} tools`,
      data: result
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Discovery error:', error);
    res.status(500).json({
      status: 'error',
      code: 'DISCOVERY_FAILED',
      message: 'Tool discovery failed',
      error: error.message
    });
  }
});

/**
 * Negotiate capabilities
 * POST /api/mcp-tools/negotiate
 */
router.post('/negotiate', async (req, res) => {
  try {
    const negotiation = req.body;
    const result = await mcpToolDiscovery.negotiateCapabilities(negotiation);

    res.json({
      status: 'ok',
      code: 'NEGOTIATION_SUCCESS',
      message: result.compatible ? 'Compatible tools found' : 'No fully compatible tools found',
      data: result
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Negotiation error:', error);
    res.status(500).json({
      status: 'error',
      code: 'NEGOTIATION_FAILED',
      message: 'Capability negotiation failed',
      error: error.message
    });
  }
});

/**
 * Check tool compatibility
 * POST /api/mcp-tools/compatibility
 */
router.post('/compatibility', async (req, res) => {
  try {
    const compatibilityCheck = req.body;
    const result = await mcpToolDiscovery.checkToolCompatibility(compatibilityCheck);

    res.json({
      status: 'ok',
      code: 'COMPATIBILITY_CHECK_SUCCESS',
      message: result.compatible ? 'Tool is compatible' : 'Tool compatibility issues found',
      data: result
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Compatibility check error:', error);
    res.status(500).json({
      status: 'error',
      code: 'COMPATIBILITY_CHECK_FAILED',
      message: 'Compatibility check failed',
      error: error.message
    });
  }
});

/**
 * Manage tool deprecation
 * POST /api/mcp-tools/deprecation
 */
router.post('/deprecation', async (req, res) => {
  try {
    const deprecation = req.body;
    
    // Add audit information
    deprecation.metadata = {
      ...deprecation.metadata,
      requestedBy: req.headers['x-squid-id'] || 'anonymous',
      requestSource: 'http-api',
      timestamp: new Date().toISOString()
    };

    const result = await mcpToolDiscovery.manageDeprecation(deprecation);

    res.json({
      status: 'ok',
      code: 'DEPRECATION_SUCCESS',
      message: `Deprecation ${deprecation.action} completed successfully`,
      data: result
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Deprecation management error:', error);
    res.status(500).json({
      status: 'error',
      code: 'DEPRECATION_FAILED',
      message: 'Deprecation management failed',
      error: error.message
    });
  }
});

/**
 * Get tool analytics
 * GET /api/mcp-tools/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const analyticsRequest = {
      moduleId: req.query.moduleId,
      toolName: req.query.toolName,
      period: req.query.period || '30d',
      includeRecommendations: req.query.includeRecommendations !== 'false',
      includeOptimizations: req.query.includeOptimizations !== 'false',
      includeTrends: req.query.includeTrends !== 'false'
    };

    const result = await mcpToolDiscovery.getToolAnalytics(analyticsRequest);

    res.json({
      status: 'ok',
      code: 'ANALYTICS_SUCCESS',
      message: 'Analytics generated successfully',
      data: result
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Analytics error:', error);
    res.status(500).json({
      status: 'error',
      code: 'ANALYTICS_FAILED',
      message: 'Analytics generation failed',
      error: error.message
    });
  }
});

/**
 * Get capability matrix
 * GET /api/mcp-tools/capabilities
 */
router.get('/capabilities', async (req, res) => {
  try {
    const service = getMCPToolDiscoveryService();
    const capabilities = {};

    // Convert capability matrix to API response format
    for (const [capability, info] of service.capabilityMatrix.entries()) {
      capabilities[capability] = {
        description: info.description,
        providers: info.providers || [],
        totalProviders: info.providers?.length || 0,
        activeProviders: info.providers?.filter(p => p.supported).length || 0,
        compatibility: info.compatibility || []
      };
    }

    res.json({
      status: 'ok',
      code: 'CAPABILITIES_SUCCESS',
      message: `Found ${Object.keys(capabilities).length} capabilities`,
      data: {
        capabilities,
        totalCapabilities: Object.keys(capabilities).length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Capabilities error:', error);
    res.status(500).json({
      status: 'error',
      code: 'CAPABILITIES_FAILED',
      message: 'Failed to retrieve capabilities',
      error: error.message
    });
  }
});

/**
 * Get deprecation schedule
 * GET /api/mcp-tools/deprecations
 */
router.get('/deprecations', async (req, res) => {
  try {
    const service = getMCPToolDiscoveryService();
    const deprecations = [];

    for (const [moduleId, schedule] of service.deprecationSchedule.entries()) {
      const toolEntry = service.toolRegistry.get(moduleId);
      deprecations.push({
        moduleId,
        moduleName: toolEntry?.moduleName || 'Unknown',
        toolName: schedule.toolName,
        deprecationDate: schedule.deprecationDate,
        sunsetDate: schedule.sunsetDate,
        status: schedule.status,
        reason: schedule.reason,
        migrationGuide: schedule.migrationGuide,
        replacementTool: schedule.replacementTool,
        daysUntilDeprecation: Math.ceil(
          (new Date(schedule.deprecationDate) - new Date()) / (1000 * 60 * 60 * 24)
        )
      });
    }

    // Sort by deprecation date
    deprecations.sort((a, b) => new Date(a.deprecationDate) - new Date(b.deprecationDate));

    res.json({
      status: 'ok',
      code: 'DEPRECATIONS_SUCCESS',
      message: `Found ${deprecations.length} deprecation schedules`,
      data: {
        deprecations,
        totalCount: deprecations.length,
        upcomingCount: deprecations.filter(d => d.daysUntilDeprecation > 0).length,
        activeCount: deprecations.filter(d => d.daysUntilDeprecation <= 0).length
      }
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Deprecations error:', error);
    res.status(500).json({
      status: 'error',
      code: 'DEPRECATIONS_FAILED',
      message: 'Failed to retrieve deprecation schedules',
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/mcp-tools/health
 */
router.get('/health', async (req, res) => {
  try {
    const service = getMCPToolDiscoveryService();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      statistics: {
        registeredModules: service.toolRegistry.size,
        totalCapabilities: service.capabilityMatrix.size,
        deprecationSchedules: service.deprecationSchedule.size,
        cacheSize: {
          compatibility: service.compatibilityCache.size,
          usage: service.toolUsageStats.size
        }
      },
      uptime: process.uptime()
    };

    res.json({
      status: 'ok',
      code: 'HEALTH_CHECK_SUCCESS',
      message: 'MCP Tool Discovery service is healthy',
      data: health
    });

  } catch (error) {
    console.error('[MCPToolDiscovery API] Health check error:', error);
    res.status(500).json({
      status: 'error',
      code: 'HEALTH_CHECK_FAILED',
      message: 'Health check failed',
      error: error.message
    });
  }
});

export default router;