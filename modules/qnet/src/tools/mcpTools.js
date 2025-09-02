/**
 * QNET MCP Tools - Model Context Protocol tools for QNET
 * 
 * Provides MCP tools for network operations: ping, capabilities, and status
 */

import { QNetService } from '../services/QNetService.js';

// Global service instance for MCP tools
let qnetServiceInstance = null;

/**
 * Initialize QNET service for MCP tools
 */
function getQNetService() {
  if (!qnetServiceInstance) {
    qnetServiceInstance = new QNetService({
      nodeId: process.env.QNET_NODE_ID || 'qnet-mcp-node',
      region: process.env.QNET_REGION || 'global',
      tier: process.env.QNET_TIER || 'standard',
      mockMode: process.env.QNET_MODE === 'standalone'
    });
  }
  return qnetServiceInstance;
}

/**
 * qnet.ping - Ping network nodes
 */
export async function pingTool(params = {}) {
  try {
    const {
      nodeId,
      timeout = 5000,
      count = 1
    } = params;

    const qnetService = getQNetService();
    
    const result = await qnetService.pingNodes({
      nodeId,
      timeout,
      count
    });

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * qnet.capabilities - Get network capabilities
 */
export async function capabilitiesTool(params = {}) {
  try {
    const {
      nodeId,
      service
    } = params;

    const qnetService = getQNetService();
    
    const capabilities = await qnetService.getCapabilities({
      nodeId,
      service
    });

    return {
      success: true,
      data: capabilities,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * qnet.status - Get comprehensive network status
 */
export async function statusTool(params = {}) {
  try {
    const {
      includeMetrics = false,
      includeTopology = false,
      region
    } = params;

    const qnetService = getQNetService();
    
    const status = await qnetService.getNetworkStatus({
      includeMetrics,
      includeTopology,
      region
    });

    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * MCP Tool Registry - Maps tool names to functions
 */
export const mcpTools = {
  'qnet.ping': pingTool,
  'qnet.capabilities': capabilitiesTool,
  'qnet.status': statusTool
};

/**
 * Execute MCP tool by name
 */
export async function executeMcpTool(toolName, params) {
  const tool = mcpTools[toolName];
  
  if (!tool) {
    throw new Error(`Unknown MCP tool: ${toolName}`);
  }
  
  return await tool(params);
}

/**
 * Get available MCP tools
 */
export function getAvailableMcpTools() {
  return Object.keys(mcpTools);
}

/**
 * Validate MCP tool parameters
 */
export function validateMcpToolParams(toolName, params) {
  const validations = {
    'qnet.ping': (p) => {
      if (p.timeout && (typeof p.timeout !== 'number' || p.timeout < 100 || p.timeout > 30000)) {
        throw new Error('Timeout must be between 100 and 30000 milliseconds');
      }
      if (p.count && (typeof p.count !== 'number' || p.count < 1 || p.count > 10)) {
        throw new Error('Count must be between 1 and 10');
      }
    },
    
    'qnet.capabilities': (p) => {
      if (p.nodeId && typeof p.nodeId !== 'string') {
        throw new Error('NodeId must be a string');
      }
      if (p.service && typeof p.service !== 'string') {
        throw new Error('Service must be a string');
      }
    },
    
    'qnet.status': (p) => {
      if (p.includeMetrics && typeof p.includeMetrics !== 'boolean') {
        throw new Error('IncludeMetrics must be a boolean');
      }
      if (p.includeTopology && typeof p.includeTopology !== 'boolean') {
        throw new Error('IncludeTopology must be a boolean');
      }
      if (p.region && typeof p.region !== 'string') {
        throw new Error('Region must be a string');
      }
    }
  };

  const validator = validations[toolName];
  if (validator) {
    validator(params);
  }
}

export default {
  pingTool,
  capabilitiesTool,
  statusTool,
  mcpTools,
  executeMcpTool,
  getAvailableMcpTools,
  validateMcpToolParams
};