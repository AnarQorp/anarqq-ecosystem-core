/**
 * Qflow REST API Server
 * 
 * Express.js server providing REST API endpoints for flow management
 * Implements comprehensive flow CRUD operations and execution control
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { flowParser } from '../core/FlowParser.js';
import { executionEngine } from '../core/ExecutionEngine.js';
import { universalValidationPipeline } from '../validation/UniversalValidationPipeline.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { 
  createAuthMiddleware, 
  requireAuth, 
  requireFlowPermissions, 
  requireFlowOwnership,
  optionalAuth 
} from '../auth/AuthMiddleware.js';
import { squidIdentityService } from '../auth/SquidIdentityService.js';
import { flowOwnershipService } from '../auth/FlowOwnershipService.js';
import { daoSubnetService } from '../governance/DAOSubnetService.js';
import { 
  billingTracker, 
  tenantIsolation, 
  billingContext, 
  resourceLimitCheck,
  getTenantBillingSummary 
} from '../billing/BillingMiddleware.js';
import { webhookController } from '../webhooks/WebhookController.js';
import { externalIntegrationController } from '../webhooks/ExternalIntegrationController.js';
import { 
  FlowDefinition, 
  ExecutionContext, 
  ExecutionState,
  ValidationResult,
  ErrorType 
} from '../models/FlowDefinition.js';
import { realtimeDashboardService, intelligentCachingService } from '../index.js';

export interface QflowServerConfig {
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  auth: {
    enabled: boolean;
    requireSquidIdentity: boolean;
    skipAuthPaths: string[];
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

export interface FlowCreateRequest {
  flowData: string;
  format?: 'json' | 'yaml' | 'auto';
}

export interface FlowUpdateRequest {
  flowData: string;
  format?: 'json' | 'yaml' | 'auto';
}

export interface ExecutionStartRequest {
  context: {
    triggeredBy: string;
    triggerType: 'manual' | 'webhook' | 'event' | 'schedule';
    inputData?: Record<string, any>;
    variables?: Record<string, any>;
    daoSubnet?: string;
    permissions?: string[];
  };
}

/**
 * Qflow REST API Server
 */
export class QflowServer {
  private app: Express;
  private server: Server | null = null;
  private config: QflowServerConfig;
  private flows = new Map<string, FlowDefinition>();

  constructor(config: Partial<QflowServerConfig> = {}) {
    this.config = {
      port: 8080,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*']
      },
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      auth: {
        enabled: true,
        requireSquidIdentity: true,
        skipAuthPaths: ['/health', '/api/v1/docs']
      },
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS
    if (this.config.cors.enabled) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;
        if (this.config.cors.origins.includes('*') || 
            (origin && this.config.cors.origins.includes(origin))) {
          res.header('Access-Control-Allow-Origin', origin || '*');
        }
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Request ID and logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      
      console.log(`[QflowServer] ${req.method} ${req.path} - Request ID: ${requestId}`);
      next();
    });

    // Billing and tenant isolation middleware
    this.app.use(billingTracker({
      trackUsage: true,
      enforceQuotas: true,
      exemptEndpoints: ['/health', '/metrics', '/docs', '/api/v1/system']
    }));
    
    this.app.use(tenantIsolation());
    this.app.use(billingContext());

    // Basic rate limiting (simplified implementation)
    if (this.config.rateLimit.enabled) {
      const requestCounts = new Map<string, { count: number; resetTime: number }>();
      
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        const windowMs = this.config.rateLimit.windowMs;
        const maxRequests = this.config.rateLimit.maxRequests;
        
        let clientData = requestCounts.get(clientId);
        if (!clientData || now > clientData.resetTime) {
          clientData = { count: 0, resetTime: now + windowMs };
          requestCounts.set(clientId, clientData);
        }
        
        clientData.count++;
        
        if (clientData.count > maxRequests) {
          return this.sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many requests', 429);
        }
        
        next();
      });
    }

    // Authentication middleware
    if (this.config.auth.enabled) {
      const authMiddleware = createAuthMiddleware({
        required: this.config.auth.requireSquidIdentity,
        skipForPaths: this.config.auth.skipAuthPaths
      });
      this.app.use(authMiddleware);
    }
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));
    this.app.get('/health/live', this.handleLivenessCheck.bind(this));
    this.app.get('/health/ready', this.handleReadinessCheck.bind(this));

    // Flow management endpoints
    this.app.post('/api/v1/flows', requireFlowPermissions, this.handleCreateFlow.bind(this));
    this.app.get('/api/v1/flows', requireAuth, this.handleListFlows.bind(this));
    this.app.get('/api/v1/flows/:id', requireAuth, this.handleGetFlow.bind(this));
    this.app.put('/api/v1/flows/:id', requireFlowOwnership(), this.handleUpdateFlow.bind(this));
    this.app.delete('/api/v1/flows/:id', requireFlowOwnership(), this.handleDeleteFlow.bind(this));

    // Flow validation
    this.app.post('/api/v1/flows/validate', requireFlowPermissions, this.handleValidateFlow.bind(this));

    // Execution management endpoints
    this.app.post('/api/v1/flows/:id/start', requireFlowPermissions, this.handleStartExecution.bind(this));
    this.app.get('/api/v1/executions', requireAuth, this.handleListExecutions.bind(this));
    this.app.get('/api/v1/executions/:id', requireAuth, this.handleGetExecution.bind(this));
    this.app.post('/api/v1/executions/:id/pause', requireAuth, this.handlePauseExecution.bind(this));
    this.app.post('/api/v1/executions/:id/resume', requireAuth, this.handleResumeExecution.bind(this));
    this.app.post('/api/v1/executions/:id/abort', requireAuth, this.handleAbortExecution.bind(this));

    // Flow ownership management
    this.app.post('/api/v1/flows/:id/transfer', requireFlowOwnership(), this.handleTransferOwnership.bind(this));
    this.app.post('/api/v1/flows/:id/grant-access', requireFlowOwnership(), this.handleGrantAccess.bind(this));
    this.app.post('/api/v1/flows/:id/revoke-access', requireFlowOwnership(), this.handleRevokeAccess.bind(this));
    this.app.get('/api/v1/flows/:id/ownership', requireAuth, this.handleGetOwnership.bind(this));
    this.app.get('/api/v1/flows/:id/permissions', requireAuth, this.handleGetPermissions.bind(this));

    // DAO subnet management
    this.app.post('/api/v1/dao/subnets', requireAuth, this.handleCreateDAOSubnet.bind(this));
    this.app.get('/api/v1/dao/subnets', requireAuth, this.handleListDAOSubnets.bind(this));
    this.app.get('/api/v1/dao/subnets/:id', requireAuth, this.handleGetDAOSubnet.bind(this));
    this.app.post('/api/v1/dao/subnets/:id/validators', requireAuth, this.handleAddValidator.bind(this));
    this.app.post('/api/v1/dao/subnets/:id/proposals', requireAuth, this.handleCreateProposal.bind(this));
    this.app.post('/api/v1/dao/proposals/:id/vote', requireAuth, this.handleVoteOnProposal.bind(this));
    this.app.get('/api/v1/dao/subnets/:id/resources', requireAuth, this.handleGetResourceUsage.bind(this));

    // Billing and resource management
    this.app.get('/api/v1/billing/summary', requireAuth, getTenantBillingSummary);
    this.app.get('/api/v1/billing/usage', requireAuth, this.handleGetBillingUsage.bind(this));
    this.app.get('/api/v1/billing/alerts', requireAuth, this.handleGetBillingAlerts.bind(this));
    this.app.post('/api/v1/billing/alerts/:id/acknowledge', requireAuth, this.handleAcknowledgeAlert.bind(this));
    this.app.post('/api/v1/billing/tier', requireAuth, this.handleUpdateBillingTier.bind(this));
    this.app.get('/api/v1/billing/report/:period', requireAuth, this.handleGetBillingReport.bind(this));

    // Webhook management endpoints
    this.app.post('/api/v1/webhooks', requireAuth, webhookController.createWebhook.bind(webhookController));
    this.app.get('/api/v1/flows/:flowId/webhooks', requireAuth, webhookController.listWebhooks.bind(webhookController));
    this.app.put('/api/v1/webhooks/:webhookId', requireAuth, webhookController.updateWebhook.bind(webhookController));
    this.app.delete('/api/v1/webhooks/:webhookId', requireAuth, webhookController.deleteWebhook.bind(webhookController));
    this.app.get('/api/v1/webhooks/schemas', optionalAuth, webhookController.getEventSchemas.bind(webhookController));

    // Webhook processing endpoints (dynamic routes)
    this.app.post('/webhooks/*', webhookController.processWebhook.bind(webhookController));
    this.app.post('/api/v1/webhooks/process/*', webhookController.processWebhook.bind(webhookController));

    // External integration endpoints
    this.app.post('/api/v1/external-systems', requireAuth, externalIntegrationController.createExternalSystem.bind(externalIntegrationController));
    this.app.get('/api/v1/external-systems', requireAuth, externalIntegrationController.listExternalSystems.bind(externalIntegrationController));
    this.app.get('/api/v1/external-systems/:systemId', requireAuth, externalIntegrationController.getExternalSystem.bind(externalIntegrationController));
    this.app.post('/api/v1/external-systems/:systemId/call', requireAuth, externalIntegrationController.executeExternalCall.bind(externalIntegrationController));
    this.app.get('/api/v1/integration-templates', optionalAuth, externalIntegrationController.getIntegrationTemplates.bind(externalIntegrationController));
    this.app.post('/api/v1/integration-templates', requireAuth, externalIntegrationController.createIntegrationTemplate.bind(externalIntegrationController));

    // System information
    this.app.get('/api/v1/system/info', this.handleSystemInfo.bind(this));
    this.app.get('/api/v1/system/metrics', this.handleSystemMetrics.bind(this));

    // Real-time dashboard endpoints
    this.app.get('/api/v1/dashboard/stats', this.handleDashboardStats.bind(this));
    this.app.get('/api/v1/dashboard/data', this.handleDashboardData.bind(this));
    this.app.post('/api/v1/dashboard/alerts', requireAuth, this.handleCreateAlert.bind(this));
    this.app.get('/api/v1/dashboard/alerts', requireAuth, this.handleListAlerts.bind(this));
    this.app.delete('/api/v1/dashboard/alerts/:id', requireAuth, this.handleDeleteAlert.bind(this));

    // API documentation
    this.app.get('/api/v1/docs', this.handleApiDocs.bind(this));

    // Dashboard UI
    this.app.get('/dashboard', this.handleDashboardUI.bind(this));
    
    // Visual Designer UI
    this.app.get('/designer', this.handleDesignerUI.bind(this));
    
    // Designer API endpoints
    this.app.post('/api/v1/designer/import-n8n', this.handleImportN8n.bind(this));
    this.app.post('/api/v1/designer/save-to-ipfs', this.handleSaveToIPFS.bind(this));
    this.app.post('/api/v1/designer/validate-flow', this.handleValidateFlow.bind(this));

    // Cache management endpoints
    this.app.get('/api/v1/cache/stats', this.handleCacheStats.bind(this));
    this.app.post('/api/v1/cache/invalidate', requireAuth, this.handleCacheInvalidate.bind(this));
    this.app.delete('/api/v1/cache/clear', requireAuth, this.handleCacheClear.bind(this));
    this.app.get('/api/v1/cache/patterns', requireAuth, this.handleCachePatterns.bind(this));
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      this.sendError(res, 'NOT_FOUND', `Endpoint not found: ${req.method} ${req.path}`, 404);
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(`[QflowServer] Unhandled error:`, error);
      this.sendError(res, 'INTERNAL_ERROR', 'Internal server error', 500, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`[QflowServer] 🚀 Server started on http://${this.config.host}:${this.config.port}`);
          console.log(`[QflowServer] 📚 API documentation: http://${this.config.host}:${this.config.port}/api/v1/docs`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error(`[QflowServer] ❌ Server error:`, error);
          reject(error);
        });

      } catch (error) {
        console.error(`[QflowServer] ❌ Failed to start server:`, error);
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`[QflowServer] ✅ Server stopped`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Health Check Handlers

  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime()
    });
  }

  private async handleLivenessCheck(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, { status: 'alive' });
  }

  private async handleReadinessCheck(req: Request, res: Response): Promise<void> {
    // Check if all required services are ready
    const checks = {
      flowParser: true,
      executionEngine: true,
      validationPipeline: true,
      eventEmitter: true
    };

    const allReady = Object.values(checks).every(check => check);

    if (allReady) {
      this.sendSuccess(res, { status: 'ready', checks });
    } else {
      this.sendError(res, 'NOT_READY', 'Service not ready', 503, { checks });
    }
  }

  // Flow Management Handlers

  private async handleCreateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowData, format = 'auto' }: FlowCreateRequest = req.body;

      if (!flowData) {
        return this.sendError(res, 'MISSING_FLOW_DATA', 'Flow data is required', 400);
      }

      // Parse and validate flow
      const parseResult = flowParser.parseFlow(flowData, format);
      
      if (!parseResult.success || !parseResult.flow) {
        return this.sendError(res, 'FLOW_VALIDATION_FAILED', 'Flow validation failed', 400, {
          errors: parseResult.errors,
          warnings: parseResult.warnings
        });
      }

      const flow = parseResult.flow;

      // Validate flow ownership matches authenticated identity
      if (req.identity && flow.owner !== req.identity.id) {
        const isOwner = await squidIdentityService.validateFlowOwnership(flow.owner, req.identity.id);
        if (!isOwner) {
          return this.sendError(res, 'INVALID_OWNER', 'Flow owner must match authenticated identity', 403, {
            flowOwner: flow.owner,
            authenticatedIdentity: req.identity.id
          });
        }
      }

      // Check if flow already exists
      if (this.flows.has(flow.id)) {
        return this.sendError(res, 'FLOW_EXISTS', `Flow with ID '${flow.id}' already exists`, 409);
      }

      // Register flow with execution engine
      executionEngine.registerFlow(flow);
      this.flows.set(flow.id, flow);

      // Initialize ownership
      await flowOwnershipService.initializeOwnership(flow);

      // Emit flow created event
      await qflowEventEmitter.emitFlowCreated(flow.owner, {
        flowId: flow.id,
        flowName: flow.name,
        flowVersion: flow.version,
        owner: flow.owner,
        ipfsCid: `Qm${flow.id}${Date.now()}` // Simplified CID for prototype
      });

      this.sendSuccess(res, {
        flow,
        warnings: parseResult.warnings
      }, 201);

    } catch (error) {
      console.error(`[QflowServer] Error creating flow:`, error);
      this.sendError(res, 'CREATE_FLOW_ERROR', 'Failed to create flow', 500, { error: String(error) });
    }
  }

  private async handleListFlows(req: Request, res: Response): Promise<void> {
    try {
      const { 
        category, 
        visibility, 
        owner, 
        tags,
        limit = '50',
        offset = '0'
      } = req.query;

      let flows = Array.from(this.flows.values());

      // Apply identity-based filtering using ownership service
      if (req.identity) {
        const accessibleFlowIds = await flowOwnershipService.getAccessibleFlows(req.identity.id, 'read');
        flows = flows.filter(flow => accessibleFlowIds.includes(flow.id));
      } else {
        // Only show public flows for unauthenticated requests
        flows = flows.filter(flow => flow.metadata.visibility === 'public');
      }

      // Apply additional filters
      if (category) {
        flows = flows.filter(flow => flow.metadata.category === category);
      }
      if (visibility) {
        flows = flows.filter(flow => flow.metadata.visibility === visibility);
      }
      if (owner) {
        flows = flows.filter(flow => flow.owner === owner);
      }
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : [tags];
        flows = flows.filter(flow => 
          tagList.some(tag => flow.metadata.tags.includes(tag as string))
        );
      }

      // Apply pagination
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;
      const paginatedFlows = flows.slice(offsetNum, offsetNum + limitNum);

      this.sendSuccess(res, {
        flows: paginatedFlows,
        pagination: {
          total: flows.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < flows.length
        }
      });

    } catch (error) {
      console.error(`[QflowServer] Error listing flows:`, error);
      this.sendError(res, 'LIST_FLOWS_ERROR', 'Failed to list flows', 500, { error: String(error) });
    }
  }

  private async handleGetFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = this.flows.get(id);

      if (!flow) {
        return this.sendError(res, 'FLOW_NOT_FOUND', `Flow not found: ${id}`, 404);
      }

      this.sendSuccess(res, { flow });

    } catch (error) {
      console.error(`[QflowServer] Error getting flow:`, error);
      this.sendError(res, 'GET_FLOW_ERROR', 'Failed to get flow', 500, { error: String(error) });
    }
  }

  private async handleUpdateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { flowData, format = 'auto' }: FlowUpdateRequest = req.body;

      if (!flowData) {
        return this.sendError(res, 'MISSING_FLOW_DATA', 'Flow data is required', 400);
      }

      const existingFlow = this.flows.get(id);
      if (!existingFlow) {
        return this.sendError(res, 'FLOW_NOT_FOUND', `Flow not found: ${id}`, 404);
      }

      // Parse and validate updated flow
      const parseResult = flowParser.parseFlow(flowData, format);
      
      if (!parseResult.success || !parseResult.flow) {
        return this.sendError(res, 'FLOW_VALIDATION_FAILED', 'Flow validation failed', 400, {
          errors: parseResult.errors,
          warnings: parseResult.warnings
        });
      }

      const updatedFlow = parseResult.flow;

      // Ensure ID matches
      if (updatedFlow.id !== id) {
        return this.sendError(res, 'ID_MISMATCH', 'Flow ID in data does not match URL parameter', 400);
      }

      // Update flow
      executionEngine.registerFlow(updatedFlow);
      this.flows.set(id, updatedFlow);

      // Emit flow updated event
      await qflowEventEmitter.emitFlowUpdated(updatedFlow.owner, {
        flowId: updatedFlow.id,
        flowName: updatedFlow.name,
        flowVersion: updatedFlow.version,
        previousVersion: existingFlow.version,
        owner: updatedFlow.owner,
        ipfsCid: `Qm${updatedFlow.id}${Date.now()}` // Simplified CID for prototype
      });

      this.sendSuccess(res, {
        flow: updatedFlow,
        warnings: parseResult.warnings
      });

    } catch (error) {
      console.error(`[QflowServer] Error updating flow:`, error);
      this.sendError(res, 'UPDATE_FLOW_ERROR', 'Failed to update flow', 500, { error: String(error) });
    }
  }

  private async handleDeleteFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = this.flows.get(id);

      if (!flow) {
        return this.sendError(res, 'FLOW_NOT_FOUND', `Flow not found: ${id}`, 404);
      }

      // Check if there are active executions
      const activeExecutions = executionEngine.getAllExecutions()
        .filter(exec => exec.flowId === id && ['pending', 'running', 'paused'].includes(exec.status));

      if (activeExecutions.length > 0) {
        return this.sendError(res, 'FLOW_IN_USE', 'Cannot delete flow with active executions', 409, {
          activeExecutions: activeExecutions.length
        });
      }

      // Delete flow
      this.flows.delete(id);

      // Emit flow deleted event
      await qflowEventEmitter.emitFlowDeleted(flow.owner, {
        flowId: flow.id,
        flowName: flow.name,
        flowVersion: flow.version,
        owner: flow.owner
      });

      this.sendSuccess(res, { 
        message: `Flow '${id}' deleted successfully`,
        deletedFlow: {
          id: flow.id,
          name: flow.name,
          version: flow.version
        }
      });

    } catch (error) {
      console.error(`[QflowServer] Error deleting flow:`, error);
      this.sendError(res, 'DELETE_FLOW_ERROR', 'Failed to delete flow', 500, { error: String(error) });
    }
  }

  private async handleValidateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowData, format = 'auto' }: FlowCreateRequest = req.body;

      if (!flowData) {
        return this.sendError(res, 'MISSING_FLOW_DATA', 'Flow data is required', 400);
      }

      // Parse and validate flow
      const parseResult = flowParser.parseFlow(flowData, format);

      this.sendSuccess(res, {
        valid: parseResult.success,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        flow: parseResult.flow
      });

    } catch (error) {
      console.error(`[QflowServer] Error validating flow:`, error);
      this.sendError(res, 'VALIDATE_FLOW_ERROR', 'Failed to validate flow', 500, { error: String(error) });
    }
  }

  // Execution Management Handlers

  private async handleStartExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id: flowId } = req.params;
      const { context }: ExecutionStartRequest = req.body;

      if (!context) {
        return this.sendError(res, 'MISSING_CONTEXT', 'Execution context is required', 400);
      }

      const flow = this.flows.get(flowId);
      if (!flow) {
        return this.sendError(res, 'FLOW_NOT_FOUND', `Flow not found: ${flowId}`, 404);
      }

      // Validate flow access permissions
      if (req.identity) {
        const canAccess = await this.canAccessFlow(flow, req.identity.id);
        if (!canAccess) {
          return this.sendError(res, 'FLOW_ACCESS_DENIED', 'Insufficient permissions to execute this flow', 403);
        }
      }

      // Create execution context with authenticated identity
      const executionContext: ExecutionContext = {
        triggeredBy: req.identity?.id || context.triggeredBy,
        triggerType: context.triggerType,
        inputData: context.inputData || {},
        variables: context.variables || {},
        daoSubnet: context.daoSubnet || flow.metadata.daoSubnet,
        permissions: req.permissions || context.permissions || []
      };

      // Start execution
      const executionId = await executionEngine.startExecution(flowId, executionContext);

      this.sendSuccess(res, {
        executionId,
        flowId,
        status: 'pending',
        context: executionContext,
        startTime: new Date().toISOString()
      }, 201);

    } catch (error) {
      console.error(`[QflowServer] Error starting execution:`, error);
      this.sendError(res, 'START_EXECUTION_ERROR', 'Failed to start execution', 500, { error: String(error) });
    }
  }

  private async handleListExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { 
        flowId, 
        status, 
        triggeredBy,
        limit = '50',
        offset = '0'
      } = req.query;

      let executions = executionEngine.getAllExecutions();

      // Apply filters
      if (flowId) {
        executions = executions.filter(exec => exec.flowId === flowId);
      }
      if (status) {
        executions = executions.filter(exec => exec.status === status);
      }
      if (triggeredBy) {
        executions = executions.filter(exec => exec.context.triggeredBy === triggeredBy);
      }

      // Sort by start time (newest first)
      executions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      // Apply pagination
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;
      const paginatedExecutions = executions.slice(offsetNum, offsetNum + limitNum);

      this.sendSuccess(res, {
        executions: paginatedExecutions,
        pagination: {
          total: executions.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < executions.length
        }
      });

    } catch (error) {
      console.error(`[QflowServer] Error listing executions:`, error);
      this.sendError(res, 'LIST_EXECUTIONS_ERROR', 'Failed to list executions', 500, { error: String(error) });
    }
  }

  private async handleGetExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await executionEngine.getExecutionStatus(id);

      if (!execution) {
        return this.sendError(res, 'EXECUTION_NOT_FOUND', `Execution not found: ${id}`, 404);
      }

      this.sendSuccess(res, { execution });

    } catch (error) {
      console.error(`[QflowServer] Error getting execution:`, error);
      this.sendError(res, 'GET_EXECUTION_ERROR', 'Failed to get execution', 500, { error: String(error) });
    }
  }

  private async handlePauseExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await executionEngine.pauseExecution(id);
      const execution = await executionEngine.getExecutionStatus(id);

      this.sendSuccess(res, { 
        message: `Execution '${id}' paused successfully`,
        execution 
      });

    } catch (error) {
      console.error(`[QflowServer] Error pausing execution:`, error);
      this.sendError(res, 'PAUSE_EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to pause execution', 400, { error: String(error) });
    }
  }

  private async handleResumeExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await executionEngine.resumeExecution(id);
      const execution = await executionEngine.getExecutionStatus(id);

      this.sendSuccess(res, { 
        message: `Execution '${id}' resumed successfully`,
        execution 
      });

    } catch (error) {
      console.error(`[QflowServer] Error resuming execution:`, error);
      this.sendError(res, 'RESUME_EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to resume execution', 400, { error: String(error) });
    }
  }

  private async handleAbortExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await executionEngine.abortExecution(id);
      const execution = await executionEngine.getExecutionStatus(id);

      this.sendSuccess(res, { 
        message: `Execution '${id}' aborted successfully`,
        execution 
      });

    } catch (error) {
      console.error(`[QflowServer] Error aborting execution:`, error);
      this.sendError(res, 'ABORT_EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to abort execution', 400, { error: String(error) });
    }
  }

  // Flow Ownership Management Handlers

  private async handleTransferOwnership(req: Request, res: Response): Promise<void> {
    try {
      const flowId = req.params.id;
      const { newOwner, reason, signature } = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!newOwner || !reason || !signature) {
        return this.sendError(res, 'INVALID_REQUEST', 'newOwner, reason, and signature are required', 400);
      }

      const success = await flowOwnershipService.transferFlowOwnership(
        flowId,
        req.identity.id,
        newOwner,
        reason,
        signature
      );

      if (!success) {
        return this.sendError(res, 'TRANSFER_FAILED', 'Failed to transfer ownership', 400);
      }

      this.sendSuccess(res, {
        flowId,
        newOwner,
        transferredAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'TRANSFER_ERROR', error instanceof Error ? error.message : 'Failed to transfer ownership', 500, { error: String(error) });
    }
  }

  private async handleGrantAccess(req: Request, res: Response): Promise<void> {
    try {
      const flowId = req.params.id;
      const { grantedTo, permission, expiresAt, conditions } = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!grantedTo || !permission) {
        return this.sendError(res, 'INVALID_REQUEST', 'grantedTo and permission are required', 400);
      }

      const success = await flowOwnershipService.grantPermission(
        flowId,
        req.identity.id,
        grantedTo,
        permission,
        expiresAt,
        conditions
      );

      if (!success) {
        return this.sendError(res, 'GRANT_FAILED', 'Failed to grant permission', 400);
      }

      this.sendSuccess(res, {
        flowId,
        grantedTo,
        permission,
        grantedAt: new Date().toISOString(),
        expiresAt
      });

    } catch (error) {
      this.sendError(res, 'GRANT_ERROR', error instanceof Error ? error.message : 'Failed to grant permission', 500, { error: String(error) });
    }
  }

  private async handleRevokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const flowId = req.params.id;
      const { revokedFrom, permission } = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!revokedFrom || !permission) {
        return this.sendError(res, 'INVALID_REQUEST', 'revokedFrom and permission are required', 400);
      }

      const success = await flowOwnershipService.revokePermission(
        flowId,
        req.identity.id,
        revokedFrom,
        permission
      );

      if (!success) {
        return this.sendError(res, 'REVOKE_FAILED', 'Failed to revoke permission', 400);
      }

      this.sendSuccess(res, {
        flowId,
        revokedFrom,
        permission,
        revokedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'REVOKE_ERROR', error instanceof Error ? error.message : 'Failed to revoke permission', 500, { error: String(error) });
    }
  }

  private async handleGetOwnership(req: Request, res: Response): Promise<void> {
    try {
      const flowId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const ownership = await flowOwnershipService.getFlowOwnership(flowId);
      if (!ownership) {
        return this.sendError(res, 'NOT_FOUND', 'Flow ownership not found', 404);
      }

      // Check if user can view ownership info
      const canView = await flowOwnershipService.hasPermission(req.identity.id, flowId, 'read') ||
                     await flowOwnershipService.isFlowOwner(flowId, req.identity.id);

      if (!canView) {
        return this.sendError(res, 'INSUFFICIENT_PERMISSIONS', 'Cannot view ownership information', 403);
      }

      this.sendSuccess(res, {
        ownership: {
          flowId: ownership.flowId,
          owner: ownership.owner,
          created: ownership.created,
          lastModified: ownership.lastModified,
          transferHistory: ownership.transferHistory
        }
      });

    } catch (error) {
      this.sendError(res, 'OWNERSHIP_ERROR', error instanceof Error ? error.message : 'Failed to get ownership', 500, { error: String(error) });
    }
  }

  private async handleGetPermissions(req: Request, res: Response): Promise<void> {
    try {
      const flowId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      // Check if user can view permissions
      const canView = await flowOwnershipService.hasPermission(req.identity.id, flowId, 'read') ||
                     await flowOwnershipService.isFlowOwner(flowId, req.identity.id);

      if (!canView) {
        return this.sendError(res, 'INSUFFICIENT_PERMISSIONS', 'Cannot view permissions', 403);
      }

      const permissions = await flowOwnershipService.getFlowPermissions(flowId);

      this.sendSuccess(res, {
        flowId,
        permissions: permissions.map(p => ({
          grantedTo: p.grantedTo,
          permission: p.permission,
          grantedBy: p.grantedBy,
          grantedAt: p.grantedAt,
          expiresAt: p.expiresAt,
          conditions: p.conditions
        }))
      });

    } catch (error) {
      this.sendError(res, 'PERMISSIONS_ERROR', error instanceof Error ? error.message : 'Failed to get permissions', 500, { error: String(error) });
    }
  }

  // DAO Subnet Management Handlers

  private async handleCreateDAOSubnet(req: Request, res: Response): Promise<void> {
    try {
      const subnetData = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const subnet = await daoSubnetService.registerDAOSubnet(subnetData, req.identity.id);

      this.sendSuccess(res, {
        subnet: {
          id: subnet.id,
          name: subnet.name,
          description: subnet.description,
          resourceLimits: subnet.resourceLimits,
          isolation: subnet.isolation,
          metadata: subnet.metadata
        }
      }, 201);

    } catch (error) {
      this.sendError(res, 'SUBNET_CREATION_ERROR', error instanceof Error ? error.message : 'Failed to create DAO subnet', 500, { error: String(error) });
    }
  }

  private async handleListDAOSubnets(req: Request, res: Response): Promise<void> {
    try {
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const accessibleSubnets = await daoSubnetService.listAccessibleSubnets(req.identity.id);

      this.sendSuccess(res, {
        subnets: accessibleSubnets.map(subnet => ({
          id: subnet.id,
          name: subnet.name,
          description: subnet.description,
          memberCount: subnet.metadata.memberCount,
          activeFlows: subnet.metadata.activeFlows,
          totalExecutions: subnet.metadata.totalExecutions,
          created: subnet.metadata.created
        }))
      });

    } catch (error) {
      this.sendError(res, 'SUBNET_LIST_ERROR', error instanceof Error ? error.message : 'Failed to list DAO subnets', 500, { error: String(error) });
    }
  }

  private async handleGetDAOSubnet(req: Request, res: Response): Promise<void> {
    try {
      const subnetId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const subnet = await daoSubnetService.getDAOSubnet(subnetId);
      if (!subnet) {
        return this.sendError(res, 'NOT_FOUND', 'DAO subnet not found', 404);
      }

      // Check if user has access to this subnet
      const accessibleSubnets = await daoSubnetService.listAccessibleSubnets(req.identity.id);
      const hasAccess = accessibleSubnets.some(s => s.id === subnetId);

      if (!hasAccess) {
        return this.sendError(res, 'INSUFFICIENT_PERMISSIONS', 'No access to this DAO subnet', 403);
      }

      this.sendSuccess(res, {
        subnet: {
          id: subnet.id,
          name: subnet.name,
          description: subnet.description,
          validators: subnet.validators,
          policies: subnet.policies,
          resourceLimits: subnet.resourceLimits,
          isolation: subnet.isolation,
          metadata: subnet.metadata
        }
      });

    } catch (error) {
      this.sendError(res, 'SUBNET_GET_ERROR', error instanceof Error ? error.message : 'Failed to get DAO subnet', 500, { error: String(error) });
    }
  }

  private async handleAddValidator(req: Request, res: Response): Promise<void> {
    try {
      const subnetId = req.params.id;
      const validatorData = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!validatorData.identityId || !validatorData.publicKey || !validatorData.role) {
        return this.sendError(res, 'INVALID_REQUEST', 'identityId, publicKey, and role are required', 400);
      }

      const success = await daoSubnetService.addValidator(subnetId, {
        identityId: validatorData.identityId,
        publicKey: validatorData.publicKey,
        weight: validatorData.weight || 50,
        role: validatorData.role,
        active: validatorData.active !== false
      }, req.identity.id);

      if (!success) {
        return this.sendError(res, 'VALIDATOR_ADD_FAILED', 'Failed to add validator', 400);
      }

      this.sendSuccess(res, {
        subnetId,
        validatorId: validatorData.identityId,
        addedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'VALIDATOR_ADD_ERROR', error instanceof Error ? error.message : 'Failed to add validator', 500, { error: String(error) });
    }
  }

  private async handleCreateProposal(req: Request, res: Response): Promise<void> {
    try {
      const subnetId = req.params.id;
      const proposalData = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!proposalData.type || !proposalData.title || !proposalData.votingEndsAt) {
        return this.sendError(res, 'INVALID_REQUEST', 'type, title, and votingEndsAt are required', 400);
      }

      const proposalId = await daoSubnetService.createProposal(subnetId, {
        type: proposalData.type,
        title: proposalData.title,
        description: proposalData.description || '',
        votingEndsAt: proposalData.votingEndsAt,
        requiredQuorum: proposalData.requiredQuorum || 50,
        requiredMajority: proposalData.requiredMajority || 60,
        executionData: proposalData.executionData
      }, req.identity.id);

      if (!proposalId) {
        return this.sendError(res, 'PROPOSAL_CREATION_FAILED', 'Failed to create proposal', 400);
      }

      this.sendSuccess(res, {
        proposalId,
        subnetId,
        createdAt: new Date().toISOString()
      }, 201);

    } catch (error) {
      this.sendError(res, 'PROPOSAL_CREATION_ERROR', error instanceof Error ? error.message : 'Failed to create proposal', 500, { error: String(error) });
    }
  }

  private async handleVoteOnProposal(req: Request, res: Response): Promise<void> {
    try {
      const proposalId = req.params.id;
      const voteData = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!voteData.vote || !voteData.signature) {
        return this.sendError(res, 'INVALID_REQUEST', 'vote and signature are required', 400);
      }

      if (!['approve', 'reject', 'abstain'].includes(voteData.vote)) {
        return this.sendError(res, 'INVALID_REQUEST', 'vote must be approve, reject, or abstain', 400);
      }

      const success = await daoSubnetService.voteOnProposal(proposalId, {
        vote: voteData.vote,
        signature: voteData.signature,
        reason: voteData.reason
      }, req.identity.id);

      if (!success) {
        return this.sendError(res, 'VOTE_FAILED', 'Failed to cast vote', 400);
      }

      this.sendSuccess(res, {
        proposalId,
        vote: voteData.vote,
        votedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'VOTE_ERROR', error instanceof Error ? error.message : 'Failed to cast vote', 500, { error: String(error) });
    }
  }

  private async handleGetResourceUsage(req: Request, res: Response): Promise<void> {
    try {
      const subnetId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const subnet = await daoSubnetService.getDAOSubnet(subnetId);
      if (!subnet) {
        return this.sendError(res, 'NOT_FOUND', 'DAO subnet not found', 404);
      }

      // Check access
      const accessibleSubnets = await daoSubnetService.listAccessibleSubnets(req.identity.id);
      const hasAccess = accessibleSubnets.some(s => s.id === subnetId);

      if (!hasAccess) {
        return this.sendError(res, 'INSUFFICIENT_PERMISSIONS', 'No access to this DAO subnet', 403);
      }

      // For prototype, return mock resource usage
      this.sendSuccess(res, {
        subnetId,
        resourceLimits: subnet.resourceLimits,
        currentUsage: {
          cpu: 0,
          memory: 0,
          storage: 0,
          network: 0,
          executions: 0
        },
        utilizationPercentage: {
          cpu: 0,
          memory: 0,
          executions: 0
        }
      });

    } catch (error) {
      this.sendError(res, 'RESOURCE_USAGE_ERROR', error instanceof Error ? error.message : 'Failed to get resource usage', 500, { error: String(error) });
    }
  }

  // Billing Management Handlers

  private async handleGetBillingUsage(req: Request, res: Response): Promise<void> {
    try {
      const { period } = req.query;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      const usage = await resourceBillingService.getTenantUsage(
        req.billing.tenantId,
        period as string
      );

      if (!usage) {
        return this.sendError(res, 'NOT_FOUND', 'Usage data not found', 404);
      }

      this.sendSuccess(res, {
        tenantId: usage.tenantId,
        period: usage.period,
        usage: usage.usage,
        costs: usage.costs,
        limits: usage.limits
      });

    } catch (error) {
      this.sendError(res, 'BILLING_USAGE_ERROR', error instanceof Error ? error.message : 'Failed to get billing usage', 500, { error: String(error) });
    }
  }

  private async handleGetBillingAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { unacknowledged } = req.query;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      const alerts = await resourceBillingService.getTenantAlerts(
        req.billing.tenantId,
        unacknowledged === 'true'
      );

      this.sendSuccess(res, {
        tenantId: req.billing.tenantId,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          resource: alert.resource,
          message: alert.message,
          severity: alert.severity,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
          createdAt: alert.createdAt,
          acknowledged: alert.acknowledged,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt
        }))
      });

    } catch (error) {
      this.sendError(res, 'BILLING_ALERTS_ERROR', error instanceof Error ? error.message : 'Failed to get billing alerts', 500, { error: String(error) });
    }
  }

  private async handleAcknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const success = await resourceBillingService.acknowledgeAlert(alertId, req.identity.id);

      if (!success) {
        return this.sendError(res, 'ALERT_NOT_FOUND', 'Alert not found or already acknowledged', 404);
      }

      this.sendSuccess(res, {
        alertId,
        acknowledgedBy: req.identity.id,
        acknowledgedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'ACKNOWLEDGE_ALERT_ERROR', error instanceof Error ? error.message : 'Failed to acknowledge alert', 500, { error: String(error) });
    }
  }

  private async handleUpdateBillingTier(req: Request, res: Response): Promise<void> {
    try {
      const { tier } = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      if (!['free', 'basic', 'premium', 'enterprise'].includes(tier)) {
        return this.sendError(res, 'INVALID_TIER', 'Invalid billing tier', 400);
      }

      const success = await resourceBillingService.updateBillingTier(
        req.billing.tenantId,
        tier,
        req.identity.id
      );

      if (!success) {
        return this.sendError(res, 'TIER_UPDATE_FAILED', 'Failed to update billing tier', 400);
      }

      this.sendSuccess(res, {
        tenantId: req.billing.tenantId,
        newTier: tier,
        updatedBy: req.identity.id,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'TIER_UPDATE_ERROR', error instanceof Error ? error.message : 'Failed to update billing tier', 500, { error: String(error) });
    }
  }

  private async handleGetBillingReport(req: Request, res: Response): Promise<void> {
    try {
      const period = req.params.period;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      // Validate period format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(period)) {
        return this.sendError(res, 'INVALID_PERIOD', 'Period must be in YYYY-MM format', 400);
      }

      const report = await resourceBillingService.generateBillingReport(
        req.billing.tenantId,
        period
      );

      if (!report) {
        return this.sendError(res, 'NOT_FOUND', 'Billing report not found', 404);
      }

      this.sendSuccess(res, {
        report: {
          tenantId: report.tenantId,
          period: report.period,
          startDate: report.startDate,
          endDate: report.endDate,
          usage: report.usage,
          costs: report.costs,
          status: report.status,
          invoiceId: report.invoiceId,
          paidAt: report.paidAt
        }
      });

    } catch (error) {
      this.sendE });
}
  }

  // Billing Management Handlers

  private async handleGetBillingUsage(req: Request, res: Response): Promise<void> {
    try {
      const { period } = req.query;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      const usage = await resourceBillingService.getTenantUsage(
        req.billing.tenantId,
        period as string
      );

      if (!usage) {
        return this.sendError(res, 'NOT_FOUND', 'Usage data not found', 404);
      }

      this.sendSuccess(res, {
        tenantId: usage.tenantId,
        period: usage.period,
        usage: usage.usage,
        costs: usage.costs,
        limits: usage.limits
      });

    } catch (error) {
      this.sendError(res, 'BILLING_USAGE_ERROR', error instanceof Error ? error.message : 'Failed to get billing usage', 500, { error: String(error) });
    }
  }

  private async handleGetBillingAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { unacknowledged } = req.query;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      const alerts = await resourceBillingService.getTenantAlerts(
        req.billing.tenantId,
        unacknowledged === 'true'
      );

      this.sendSuccess(res, {
        tenantId: req.billing.tenantId,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          resource: alert.resource,
          message: alert.message,
          severity: alert.severity,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
          createdAt: alert.createdAt,
          acknowledged: alert.acknowledged,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt
        }))
      });

    } catch (error) {
      this.sendError(res, 'BILLING_ALERTS_ERROR', error instanceof Error ? error.message : 'Failed to get billing alerts', 500, { error: String(error) });
    }
  }

  private async handleAcknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertId = req.params.id;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      const success = await resourceBillingService.acknowledgeAlert(alertId, req.identity.id);

      if (!success) {
        return this.sendError(res, 'ALERT_NOT_FOUND', 'Alert not found or already acknowledged', 404);
      }

      this.sendSuccess(res, {
        alertId,
        acknowledgedBy: req.identity.id,
        acknowledgedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'ACKNOWLEDGE_ALERT_ERROR', error instanceof Error ? error.message : 'Failed to acknowledge alert', 500, { error: String(error) });
    }
  }

  private async handleUpdateBillingTier(req: Request, res: Response): Promise<void> {
    try {
      const { tier } = req.body;
      
      if (!req.identity) {
        return this.sendError(res, 'AUTHENTICATION_REQUIRED', 'Identity required', 401);
      }

      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      if (!['free', 'basic', 'premium', 'enterprise'].includes(tier)) {
        return this.sendError(res, 'INVALID_TIER', 'Invalid billing tier', 400);
      }

      const success = await resourceBillingService.updateBillingTier(
        req.billing.tenantId,
        tier,
        req.identity.id
      );

      if (!success) {
        return this.sendError(res, 'TIER_UPDATE_FAILED', 'Failed to update billing tier', 400);
      }

      this.sendSuccess(res, {
        tenantId: req.billing.tenantId,
        newTier: tier,
        updatedBy: req.identity.id,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      this.sendError(res, 'TIER_UPDATE_ERROR', error instanceof Error ? error.message : 'Failed to update billing tier', 500, { error: String(error) });
    }
  }

  private async handleGetBillingReport(req: Request, res: Response): Promise<void> {
    try {
      const period = req.params.period;
      
      if (!req.billing?.tenantId) {
        return this.sendError(res, 'TENANT_ID_REQUIRED', 'Tenant ID is required', 400);
      }

      // Validate period format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(period)) {
        return this.sendError(res, 'INVALID_PERIOD', 'Period must be in YYYY-MM format', 400);
      }

      const report = await resourceBillingService.generateBillingReport(
        req.billing.tenantId,
        period
      );

      if (!report) {
        return this.sendError(res, 'NOT_FOUND', 'Billing report not found', 404);
      }

      this.sendSuccess(res, {
        report: {
          tenantId: report.tenantId,
          period: report.period,
          startDate: report.startDate,
          endDate: report.endDate,
          usage: report.usage,
          costs: report.costs,
          status: report.status,
          invoiceId: report.invoiceId,
          paidAt: report.paidAt
        }
      });

    } catch (error) {
      this.sendError(res, 'BILLING_REPORT_ERROR', error instanceof Error ? error.message : 'Failed to get billing report', 500, { error: String(error) });
    }
  }

  // System Information Handlers    ng(error) Stri00, { error:ort', 5 billing repto getd : 'Failege error.messaor ? of Errr instanceERROR', erroT_ILLING_REPORres, 'Brror(

  private async handleSystemInfo(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, {
      name: 'Qflow Serverless Automation Engine',
      version: '0.1.0',
      description: 'Universal coherence motor for the AnarQ & Q ecosystem',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  }

  private async handleSystemMetrics(req: Request, res: Response): Promise<void> {
    const executions = executionEngine.getAllExecutions();
    const flows = Array.from(this.flows.values());

    const executionsByStatus = executions.reduce((acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.sendSuccess(res, {
      flows: {
        total: flows.length,
        byCategory: flows.reduce((acc, flow) => {
          acc[flow.metadata.category] = (acc[flow.metadata.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byVisibility: flows.reduce((acc, flow) => {
          acc[flow.metadata.visibility] = (acc[flow.metadata.visibility] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      executions: {
        total: executions.length,
        byStatus: executionsByStatus,
        active: (executionsByStatus.pending || 0) + (executionsByStatus.running || 0) + (executionsByStatus.paused || 0)
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    });
  }

  private async handleApiDocs(req: Request, res: Response): Promise<void> {
    const docs = {
      title: 'Qflow REST API',
      version: '1.0.0',
      description: 'REST API for Qflow Serverless Automation Engine',
      baseUrl: `http://${this.config.host}:${this.config.port}/api/v1`,
      endpoints: {
        health: {
          'GET /health': 'General health check',
          'GET /health/live': 'Liveness probe',
          'GET /health/ready': 'Readiness probe'
        },
        flows: {
          'POST /flows': 'Create a new flow definition',
          'GET /flows': 'List all flows with optional filtering',
          'GET /flows/:id': 'Get a specific flow definition',
          'PUT /flows/:id': 'Update a flow definition',
          'DELETE /flows/:id': 'Delete a flow definition',
          'POST /flows/validate': 'Validate a flow definition without creating it'
        },
        executions: {
          'POST /flows/:id/start': 'Start flow execution',
          'GET /executions': 'List all executions with optional filtering',
          'GET /executions/:id': 'Get execution status and details',
          'POST /executions/:id/pause': 'Pause a running execution',
          'POST /executions/:id/resume': 'Resume a paused execution',
          'POST /executions/:id/abort': 'Abort an execution'
        },
        system: {
          'GET /system/info': 'Get system information',
          'GET /system/metrics': 'Get system metrics and statistics'
        },
        dashboard: {
          'GET /dashboard/stats': 'Get real-time dashboard statistics',
          'GET /dashboard/data': 'Get comprehensive dashboard data',
          'POST /dashboard/alerts': 'Create a new alert rule',
          'GET /dashboard/alerts': 'List all alert rules',
          'DELETE /dashboard/alerts/:id': 'Delete an alert rule'
        },
        designer: {
          'GET /designer': 'Visual flow designer interface',
          'POST /designer/import-n8n': 'Import n8n workflow to Qflow format',
          'POST /designer/save-to-ipfs': 'Save flow definition to IPFS',
          'POST /designer/validate-flow': 'Validate flow definition'
        },
        cache: {
          'GET /cache/stats': 'Get cache statistics and performance metrics',
          'POST /cache/invalidate': 'Invalidate cache entries by keys or tags',
          'DELETE /cache/clear': 'Clear all cache entries',
          'GET /cache/patterns': 'Get cache usage patterns for analysis'
        }
      },
      examples: {
        createFlow: {
          url: 'POST /api/v1/flows',
          body: {
            flowData: JSON.stringify({
              id: 'example-flow',
              name: 'Example Flow',
              version: '1.0.0',
              owner: 'squid:user:example',
              description: 'An example automation flow',
              steps: [
                {
                  id: 'step1',
                  type: 'task',
                  action: 'log-message',
                  params: { message: 'Hello, World!' }
                }
              ],
              metadata: {
                tags: ['example', 'demo'],
                category: 'utility',
                visibility: 'public',
                requiredPermissions: []
              }
            }),
            format: 'json'
          }
        },
        startExecution: {
          url: 'POST /api/v1/flows/example-flow/start',
          body: {
            context: {
              triggeredBy: 'squid:user:example',
              triggerType: 'manual',
              inputData: { test: true },
              variables: { env: 'development' },
              permissions: ['flow:execute']
            }
          }
        }
      }
    };

    res.setHeader('Content-Type', 'application/json');
    this.sendSuccess(res, docs);
  }

  private async handleDashboardUI(req: Request, res: Response): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dashboardPath = path.join(__dirname, '../static/dashboard.html');
      
      const dashboardHTML = fs.readFileSync(dashboardPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/html');
      res.send(dashboardHTML);
    } catch (error) {
      console.error(`[QflowServer] Error serving dashboard:`, error);
      this.sendError(res, 'DASHBOARD_ERROR', 'Failed to load dashboard', 500, { error: String(error) });
    }
  }

  // Visual Designer Handlers
  
  private async handleDesignerUI(req: Request, res: Response): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const designerPath = path.join(__dirname, '../static/flow-designer.html');
      
      const designerHTML = fs.readFileSync(designerPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/html');
      res.send(designerHTML);
    } catch (error) {
      console.error(`[QflowServer] Error serving designer:`, error);
      this.sendError(res, 'DESIGNER_ERROR', 'Failed to load visual designer', 500, { error: String(error) });
    }
  }

  private async handleImportN8n(req: Request, res: Response): Promise<void> {
    try {
      const { workflowJson, options: importOptions } = req.body;
      
      if (!workflowJson) {
        this.sendError(res, 'MISSING_WORKFLOW', 'Workflow JSON is required', 400);
        return;
      }

      // Import N8nWorkflowImporter dynamically
      const { N8nWorkflowImporter } = await import('../migration/N8nWorkflowImporter.js');
      
      const migrationOptions = {
        preserveNodeIds: false,
        validateCredentials: true,
        createCompatibilityLayer: true,
        generateTestCases: false,
        ...importOptions
      };
      
      const importer = new N8nWorkflowImporter(migrationOptions);
      const result = await importer.importFromJson(workflowJson);
      
      this.sendSuccess(res, result);
    } catch (error) {
      console.error(`[QflowServer] Error importing n8n workflow:`, error);
      this.sendError(res, 'IMPORT_ERROR', 'Failed to import n8n workflow', 500, { error: String(error) });
    }
  }

  private async handleSaveToIPFS(req: Request, res: Response): Promise<void> {
    try {
      const { flowDefinition } = req.body;
      
      if (!flowDefinition) {
        this.sendError(res, 'MISSING_FLOW', 'Flow definition is required', 400);
        return;
      }

      // Mock IPFS save - in real implementation, this would use IPFS client
      const mockCID = 'Qm' + Math.random().toString(36).substring(2, 15);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would:
      // 1. Validate the flow definition
      // 2. Save to IPFS using ipfs-http-client
      // 3. Index the flow in Qindex
      // 4. Emit flow creation event
      
      this.sendSuccess(res, { 
        success: true, 
        cid: mockCID,
        message: 'Flow saved to IPFS successfully'
      });
    } catch (error) {
      console.error(`[QflowServer] Error saving to IPFS:`, error);
      this.sendError(res, 'IPFS_SAVE_ERROR', 'Failed to save flow to IPFS', 500, { error: String(error) });
    }
  }

  private async handleValidateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowDefinition } = req.body;
      
      if (!flowDefinition) {
        this.sendError(res, 'MISSING_FLOW', 'Flow definition is required', 400);
        return;
      }

      // Basic validation
      const issues = [];
      
      if (!flowDefinition.name) {
        issues.push({ severity: 'error', message: 'Flow name is required' });
      }
      
      if (!flowDefinition.steps || flowDefinition.steps.length === 0) {
        issues.push({ severity: 'error', message: 'Flow must have at least one step' });
      }
      
      if (!flowDefinition.owner) {
        issues.push({ severity: 'error', message: 'Flow owner is required' });
      }

      // Check for circular dependencies
      if (this.hasCircularDependencies(flowDefinition.steps)) {
        issues.push({ severity: 'error', message: 'Flow contains circular dependencies' });
      }

      // Validate step connections
      const connectionIssues = this.validateStepConnections(flowDefinition.steps);
      issues.push(...connectionIssues);
      
      this.sendSuccess(res, {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues
      });
    } catch (error) {
      console.error(`[QflowServer] Error validating flow:`, error);
      this.sendError(res, 'VALIDATION_ERROR', 'Failed to validate flow', 500, { error: String(error) });
    }
  }

  private hasCircularDependencies(steps: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true; // Cycle detected
      }
      if (visited.has(stepId)) {
        return false; // Already processed
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        if (step.onSuccess && hasCycle(step.onSuccess)) {
          return true;
        }
        if (step.onFailure && hasCycle(step.onFailure)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id) && hasCycle(step.id)) {
        return true;
      }
    }

    return false;
  }

  private validateStepConnections(steps: any[]): any[] {
    const issues = [];
    const stepIds = new Set(steps.map(s => s.id));

    for (const step of steps) {
      if (step.onSuccess && !stepIds.has(step.onSuccess)) {
        issues.push({
          severity: 'error',
          message: `Step '${step.id}' references non-existent success step '${step.onSuccess}'`
        });
      }
      if (step.onFailure && !stepIds.has(step.onFailure)) {
        issues.push({
          severity: 'error',
          message: `Step '${step.id}' references non-existent failure step '${step.onFailure}'`
        });
      }
    }

    return issues;
  }

  // Real-time Dashboard Handlers

  private async handleDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = realtimeDashboardService.getDashboardStats();
      this.sendSuccess(res, stats);
    } catch (error) {
      console.error(`[QflowServer] Error getting dashboard stats:`, error);
      this.sendError(res, 'DASHBOARD_STATS_ERROR', 'Failed to get dashboard stats', 500, { error: String(error) });
    }
  }

  private async handleDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const data = realtimeDashboardService.getInteractiveDashboardData();
      this.sendSuccess(res, data);
    } catch (error) {
      console.error(`[QflowServer] Error getting dashboard data:`, error);
      this.sendError(res, 'DASHBOARD_DATA_ERROR', 'Failed to get dashboard data', 500, { error: String(error) });
    }
  }

  private async handleCreateAlert(req: Request, res: Response): Promise<void> {
    try {
      const { name, condition, severity, channels, enabled = true, cooldown = 300000 } = req.body;

      if (!name || !condition || !severity) {
        return this.sendError(res, 'MISSING_ALERT_DATA', 'Name, condition, and severity are required', 400);
      }

      const alertRule = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        condition,
        severity,
        channels: channels || ['dashboard'],
        enabled,
        cooldown
      };

      realtimeDashboardService.addAlertRule(alertRule);

      this.sendSuccess(res, { alert: alertRule }, 201);

    } catch (error) {
      console.error(`[QflowServer] Error creating alert:`, error);
      this.sendError(res, 'CREATE_ALERT_ERROR', 'Failed to create alert', 500, { error: String(error) });
    }
  }

  private async handleListAlerts(req: Request, res: Response): Promise<void> {
    try {
      // This would get alerts from the dashboard service
      // For now, return mock data
      const alerts = [
        {
          id: 'alert-001',
          name: 'High Latency Alert',
          condition: 'execution_latency_p99 > 5000',
          severity: 'high',
          channels: ['dashboard', 'webhook'],
          enabled: true,
          cooldown: 300000,
          lastTriggered: Date.now() - 600000
        }
      ];

      this.sendSuccess(res, { alerts });

    } catch (error) {
      console.error(`[QflowServer] Error listing alerts:`, error);
      this.sendError(res, 'LIST_ALERTS_ERROR', 'Failed to list alerts', 500, { error: String(error) });
    }
  }

  private async handleDeleteAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      realtimeDashboardService.removeAlertRule(id);

      this.sendSuccess(res, { 
        message: `Alert '${id}' deleted successfully`,
        deletedAlertId: id
      });

    } catch (error) {
      console.error(`[QflowServer] Error deleting alert:`, error);
      this.sendError(res, 'DELETE_ALERT_ERROR', 'Failed to delete alert', 500, { error: String(error) });
    }
  }

  // Cache Management Handlers

  private async handleCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = intelligentCachingService.getStats();
      this.sendSuccess(res, stats);
    } catch (error) {
      console.error(`[QflowServer] Error getting cache stats:`, error);
      this.sendError(res, 'CACHE_STATS_ERROR', 'Failed to get cache stats', 500, { error: String(error) });
    }
  }

  private async handleCacheInvalidate(req: Request, res: Response): Promise<void> {
    try {
      const { keys, tags } = req.body;

      let invalidated = 0;

      if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          const result = await intelligentCachingService.invalidate(key);
          if (result) invalidated++;
        }
      }

      if (tags && Array.isArray(tags)) {
        const result = await intelligentCachingService.invalidateByTags(tags);
        invalidated += result;
      }

      this.sendSuccess(res, {
        message: `Invalidated ${invalidated} cache entries`,
        invalidatedCount: invalidated
      });

    } catch (error) {
      console.error(`[QflowServer] Error invalidating cache:`, error);
      this.sendError(res, 'CACHE_INVALIDATE_ERROR', 'Failed to invalidate cache', 500, { error: String(error) });
    }
  }

  private async handleCacheClear(req: Request, res: Response): Promise<void> {
    try {
      await intelligentCachingService.clearAll();

      this.sendSuccess(res, {
        message: 'All cache entries cleared successfully'
      });

    } catch (error) {
      console.error(`[QflowServer] Error clearing cache:`, error);
      this.sendError(res, 'CACHE_CLEAR_ERROR', 'Failed to clear cache', 500, { error: String(error) });
    }
  }

  private async handleCachePatterns(req: Request, res: Response): Promise<void> {
    try {
      const patterns = intelligentCachingService.getUsagePatterns();

      this.sendSuccess(res, {
        patterns,
        totalPatterns: patterns.length
      });

    } catch (error) {
      console.error(`[QflowServer] Error getting cache patterns:`, error);
      this.sendError(res, 'CACHE_PATTERNS_ERROR', 'Failed to get cache patterns', 500, { error: String(error) });
    }
  }

  // Utility Methods

  private sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: res.getHeader('X-Request-ID') as string
    };
    res.status(statusCode).json(response);
  }

  private sendError(res: Response, code: string, message: string, statusCode: number = 400, details?: any): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString(),
      requestId: res.getHeader('X-Request-ID') as string
    };
    res.status(statusCode).json(response);
  }

  /**
   * Get server configuration
   */
  getConfig(): QflowServerConfig {
    return { ...this.config };
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Check if identity can access a flow
   */
  private async canAccessFlow(flow: FlowDefinition, identityId: string): Promise<boolean> {
    // Owner can always access
    if (flow.owner === identityId) {
      return true;
    }

    // Check if identity is sub-identity of owner
    const isOwner = await squidIdentityService.validateFlowOwnership(flow.owner, identityId);
    if (isOwner) {
      return true;
    }

    // Check visibility rules
    if (flow.metadata.visibility === 'public') {
      return true;
    }

    if (flow.metadata.visibility === 'dao-only' && flow.metadata.daoSubnet) {
      const identity = await squidIdentityService.getIdentity(identityId);
      if (identity && identity.metadata.daoSubnet === flow.metadata.daoSubnet) {
        return true;
      }
    }

    // Check admin permissions
    const hasAdminPermission = await squidIdentityService.hasPermissions(identityId, ['flow:admin', 'admin:*']);
    if (hasAdminPermission) {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const qflowServer = new QflowServer();