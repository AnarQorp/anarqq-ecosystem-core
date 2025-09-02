/**
 * External Integration Controller for API Endpoints
 * 
 * Handles HTTP endpoints for external system integration management
 */

import { Request, Response } from 'express';
import { externalIntegrationService } from './ExternalIntegrationService.js';

export interface ExternalSystemCreateRequest {
  name: string;
  type: 'webhook' | 'api' | 'database' | 'message_queue' | 'custom';
  baseUrl?: string;
  authentication: {
    type: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
    credentials: Record<string, string>;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
  rateLimiting?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
}

export interface ExternalCallRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  options?: {
    headers?: Record<string, string>;
    timeout?: number;
    transformRequest?: string;
    transformResponse?: string;
  };
}

/**
 * External Integration Controller
 */
export class ExternalIntegrationController {
  
  /**
   * Create external system configuration
   */
  async createExternalSystem(req: Request, res: Response): Promise<void> {
    try {
      const systemData: ExternalSystemCreateRequest = req.body;

      if (!systemData.name || !systemData.type) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'name and type are required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      if (!req.identity) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const systemId = await externalIntegrationService.registerExternalSystem({
        ...systemData,
        enabled: true,
        createdBy: req.identity.id
      });

      res.status(201).json({
        success: true,
        data: {
          systemId,
          name: systemData.name,
          type: systemData.type,
          enabled: true,
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] Create system error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_SYSTEM_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create external system'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * List external systems
   */
  async listExternalSystems(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      let systems = externalIntegrationService.listExternalSystems();

      if (type) {
        systems = systems.filter(system => system.type === type);
      }

      // Hide sensitive authentication data
      const sanitizedSystems = systems.map(system => ({
        ...system,
        authentication: {
          type: system.authentication.type,
          credentials: system.authentication.type === 'none' ? {} : { '***': 'hidden' }
        }
      }));

      res.json({
        success: true,
        data: {
          systems: sanitizedSystems,
          total: sanitizedSystems.length
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] List systems error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_SYSTEMS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list external systems'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Get external system details
   */
  async getExternalSystem(req: Request, res: Response): Promise<void> {
    try {
      const { systemId } = req.params;

      const system = externalIntegrationService.getExternalSystem(systemId);

      if (!system) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SYSTEM_NOT_FOUND',
            message: 'External system not found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Hide sensitive authentication data
      const sanitizedSystem = {
        ...system,
        authentication: {
          type: system.authentication.type,
          credentials: system.authentication.type === 'none' ? {} : { '***': 'hidden' }
        }
      };

      res.json({
        success: true,
        data: { system: sanitizedSystem },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] Get system error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SYSTEM_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get external system'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Execute external API call
   */
  async executeExternalCall(req: Request, res: Response): Promise<void> {
    try {
      const { systemId } = req.params;
      const callData: ExternalCallRequest = req.body;

      if (!callData.endpoint || !callData.method) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'endpoint and method are required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const result = await externalIntegrationService.executeExternalCall(
        systemId,
        callData.endpoint,
        callData.method,
        callData.data,
        callData.options
      );

      res.json({
        success: true,
        data: {
          result,
          executedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] Execute call error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTE_CALL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute external call'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Get integration templates
   */
  async getIntegrationTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { systemType } = req.query;

      const templates = externalIntegrationService.getIntegrationTemplates(systemType as string);

      res.json({
        success: true,
        data: {
          templates,
          total: templates.length
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] Get templates error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TEMPLATES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get integration templates'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Create integration template
   */
  async createIntegrationTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;

      if (!templateData.name || !templateData.systemType || !templateData.schema) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'name, systemType, and schema are required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      if (!req.identity) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const templateId = await externalIntegrationService.createIntegrationTemplate({
        ...templateData,
        author: req.identity.id,
        version: templateData.version || '1.0.0',
        tags: templateData.tags || [],
        examples: templateData.examples || []
      });

      res.status(201).json({
        success: true,
        data: {
          templateId,
          name: templateData.name,
          systemType: templateData.systemType,
          version: templateData.version || '1.0.0',
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });

    } catch (error) {
      console.error('[ExternalIntegrationController] Create template error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_TEMPLATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create integration template'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      });
    }
  }
}

// Export singleton instance
export const externalIntegrationController = new ExternalIntegrationController();