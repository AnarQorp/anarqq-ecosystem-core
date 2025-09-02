/**
 * Ecosystem Module Integration Service
 * 
 * Provides integration capabilities with all AnarQ & Q ecosystem modules
 * including Qmail, QpiC, and other ecosystem services
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ecosystemIntegration } from '../services/EcosystemIntegration.js';

export interface ModuleCapability {
  moduleId: string;
  name: string;
  version: string;
  capabilities: string[];
  endpoints: ModuleEndpoint[];
  eventTypes: string[];
  status: 'available' | 'unavailable' | 'degraded';
  lastHealthCheck: string;
  metadata: Record<string, any>;
}

export interface ModuleEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters: EndpointParameter[];
  responseSchema: any;
  authentication: boolean;
  rateLimit?: {
    requests: number;
    window: string;
  };
}

export interface EndpointParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface ModuleCallRequest {
  moduleId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface ModuleCallResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    moduleId: string;
    endpoint: string;
    duration: number;
    timestamp: string;
    requestId: string;
  };
}

export interface CrossModuleEvent {
  eventId: string;
  sourceModule: string;
  targetModule: string;
  eventType: string;
  payload: any;
  timestamp: string;
  correlationId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  ttl?: number;
}

/**
 * Ecosystem Module Integration Service
 */
export class EcosystemModuleIntegration extends EventEmitter {
  private moduleCapabilities = new Map<string, ModuleCapability>();
  private eventSubscriptions = new Map<string, Set<string>>();
  private crossModuleEvents: CrossModuleEvent[] = [];
  private discoveryInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupModuleDiscovery();
    this.setupEventHandling();
  }  /**

   * Discover and register ecosystem modules
   */
  async discoverModules(): Promise<ModuleCapability[]> {
    try {
      const discoveredModules: ModuleCapability[] = [];

      // Discover Qmail module
      const qmailCapability = await this.discoverQmailModule();
      if (qmailCapability) {
        discoveredModules.push(qmailCapability);
        this.moduleCapabilities.set('qmail', qmailCapability);
      }

      // Discover QpiC module
      const qpicCapability = await this.discoverQpiCModule();
      if (qpicCapability) {
        discoveredModules.push(qpicCapability);
        this.moduleCapabilities.set('qpic', qpicCapability);
      }

      // Discover sQuid module
      const squidCapability = await this.discoverSquidModule();
      if (squidCapability) {
        discoveredModules.push(squidCapability);
        this.moduleCapabilities.set('squid', squidCapability);
      }

      // Discover QNET module
      const qnetCapability = await this.discoverQNETModule();
      if (qnetCapability) {
        discoveredModules.push(qnetCapability);
        this.moduleCapabilities.set('qnet', qnetCapability);
      }

      // Emit module discovery event
      await qflowEventEmitter.emit('q.qflow.modules.discovered.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ecosystem-integration',
        actor: 'system',
        data: {
          discoveredModules: discoveredModules.length,
          modules: discoveredModules.map(m => ({
            moduleId: m.moduleId,
            name: m.name,
            status: m.status,
            capabilities: m.capabilities.length
          }))
        }
      });

      return discoveredModules;

    } catch (error) {
      console.error(`[EcosystemIntegration] Module discovery failed: ${error}`);
      return [];
    }
  }

  /**
   * Call ecosystem module endpoint
   */
  async callModuleEndpoint(request: ModuleCallRequest): Promise<ModuleCallResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const module = this.moduleCapabilities.get(request.moduleId);
      if (!module) {
        throw new Error(`Module not found: ${request.moduleId}`);
      }

      if (module.status !== 'available') {
        throw new Error(`Module unavailable: ${request.moduleId} (status: ${module.status})`);
      }

      // Find endpoint
      const endpoint = module.endpoints.find(ep => ep.path === request.endpoint && ep.method === request.method);
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${request.method} ${request.endpoint}`);
      }

      // Validate parameters
      this.validateEndpointParameters(endpoint, request.parameters || {});

      // Execute call through ecosystem integration
      const service = ecosystemIntegration.getService(request.moduleId);
      if (!service) {
        throw new Error(`Service not available: ${request.moduleId}`);
      }

      const result = await this.executeWithRetry(
        () => this.makeModuleCall(service, request),
        request.retryPolicy
      );

      const duration = Date.now() - startTime;

      // Emit successful call event
      await qflowEventEmitter.emit('q.qflow.module.call.success.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ecosystem-integration',
        actor: 'system',
        data: {
          moduleId: request.moduleId,
          endpoint: request.endpoint,
          method: request.method,
          duration,
          requestId
        }
      });

      return {
        success: true,
        data: result,
        metadata: {
          moduleId: request.moduleId,
          endpoint: request.endpoint,
          duration,
          timestamp: new Date().toISOString(),
          requestId
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Emit failed call event
      await qflowEventEmitter.emit('q.qflow.module.call.failed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ecosystem-integration',
        actor: 'system',
        data: {
          moduleId: request.moduleId,
          endpoint: request.endpoint,
          method: request.method,
          duration,
          error: errorMessage,
          requestId
        }
      });

      return {
        success: false,
        error: {
          code: 'MODULE_CALL_FAILED',
          message: errorMessage,
          details: { moduleId: request.moduleId, endpoint: request.endpoint }
        },
        metadata: {
          moduleId: request.moduleId,
          endpoint: request.endpoint,
          duration,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
    }
  }

  /**
   * Send cross-module event
   */
  async sendCrossModuleEvent(event: Omit<CrossModuleEvent, 'eventId' | 'timestamp'>): Promise<string> {
    try {
      const fullEvent: CrossModuleEvent = {
        ...event,
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString()
      };

      // Store event for tracking
      this.crossModuleEvents.push(fullEvent);

      // Check if target module is subscribed to this event type
      const subscriptions = this.eventSubscriptions.get(event.targetModule);
      if (!subscriptions || !subscriptions.has(event.eventType)) {
        console.warn(`[EcosystemIntegration] No subscription for event ${event.eventType} in module ${event.targetModule}`);
      }

      // Send event through ecosystem integration
      const targetService = ecosystemIntegration.getService(event.targetModule);
      if (targetService && typeof targetService.handleEvent === 'function') {
        await targetService.handleEvent(fullEvent);
      }

      // Emit cross-module event
      await qflowEventEmitter.emit('q.qflow.crossmodule.event.sent.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ecosystem-integration',
        actor: 'system',
        data: {
          eventId: fullEvent.eventId,
          sourceModule: event.sourceModule,
          targetModule: event.targetModule,
          eventType: event.eventType,
          priority: event.priority
        }
      });

      return fullEvent.eventId;

    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to send cross-module event: ${error}`);
      throw error;
    }
  }

  /**
   * Subscribe to cross-module events
   */
  subscribeToEvents(moduleId: string, eventTypes: string[]): void {
    if (!this.eventSubscriptions.has(moduleId)) {
      this.eventSubscriptions.set(moduleId, new Set());
    }

    const subscriptions = this.eventSubscriptions.get(moduleId)!;
    eventTypes.forEach(eventType => subscriptions.add(eventType));

    console.log(`[EcosystemIntegration] Module ${moduleId} subscribed to events: ${eventTypes.join(', ')}`);
  }

  /**
   * Get module capabilities
   */
  getModuleCapabilities(moduleId?: string): ModuleCapability[] {
    if (moduleId) {
      const capability = this.moduleCapabilities.get(moduleId);
      return capability ? [capability] : [];
    }
    return Array.from(this.moduleCapabilities.values());
  }

  /**
   * Check module health
   */
  async checkModuleHealth(moduleId: string): Promise<boolean> {
    try {
      const service = ecosystemIntegration.getService(moduleId);
      if (!service) {
        return false;
      }

      // Try to call a health check endpoint if available
      if (typeof service.healthCheck === 'function') {
        const isHealthy = await service.healthCheck();
        this.updateModuleStatus(moduleId, isHealthy ? 'available' : 'degraded');
        return isHealthy;
      }

      // Fallback: assume healthy if service is available
      this.updateModuleStatus(moduleId, 'available');
      return true;

    } catch (error) {
      console.error(`[EcosystemIntegration] Health check failed for ${moduleId}: ${error}`);
      this.updateModuleStatus(moduleId, 'unavailable');
      return false;
    }
  }

  /**
   * Get cross-module events
   */
  getCrossModuleEvents(filters?: {
    sourceModule?: string;
    targetModule?: string;
    eventType?: string;
    since?: string;
  }): CrossModuleEvent[] {
    let events = this.crossModuleEvents;

    if (filters) {
      if (filters.sourceModule) {
        events = events.filter(e => e.sourceModule === filters.sourceModule);
      }
      if (filters.targetModule) {
        events = events.filter(e => e.targetModule === filters.targetModule);
      }
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType);
      }
      if (filters.since) {
        const sinceDate = new Date(filters.since);
        events = events.filter(e => new Date(e.timestamp) >= sinceDate);
      }
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }  
/**
   * Setup module discovery
   */
  private setupModuleDiscovery(): void {
    // Start periodic module discovery
    this.discoveryInterval = setInterval(async () => {
      try {
        await this.discoverModules();
      } catch (error) {
        console.error(`[EcosystemIntegration] Periodic discovery failed: ${error}`);
      }
    }, 30000); // Every 30 seconds

    // Initial discovery
    setTimeout(() => this.discoverModules(), 1000);
  }

  /**
   * Setup event handling
   */
  private setupEventHandling(): void {
    // Listen for ecosystem events
    qflowEventEmitter.on('q.ecosystem.module.registered.v1', (event) => {
      this.handleModuleRegistered(event);
    });

    qflowEventEmitter.on('q.ecosystem.module.unregistered.v1', (event) => {
      this.handleModuleUnregistered(event);
    });

    qflowEventEmitter.on('q.ecosystem.module.health.changed.v1', (event) => {
      this.handleModuleHealthChanged(event);
    });
  }

  /**
   * Discover Qmail module
   */
  private async discoverQmailModule(): Promise<ModuleCapability | null> {
    try {
      const qmailService = ecosystemIntegration.getService('qmail');
      if (!qmailService) {
        return null;
      }

      return {
        moduleId: 'qmail',
        name: 'Qmail Email Service',
        version: '1.0.0',
        capabilities: ['email-sending', 'template-processing', 'attachment-handling'],
        endpoints: [
          {
            id: 'send-email',
            name: 'Send Email',
            method: 'POST',
            path: '/api/v1/email/send',
            description: 'Send an email message',
            parameters: [
              { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
              { name: 'subject', type: 'string', required: true, description: 'Email subject' },
              { name: 'body', type: 'string', required: true, description: 'Email body content' },
              { name: 'template', type: 'string', required: false, description: 'Email template ID' },
              { name: 'attachments', type: 'array', required: false, description: 'File attachments' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string' },
                status: { type: 'string' },
                timestamp: { type: 'string' }
              }
            },
            authentication: true,
            rateLimit: { requests: 100, window: '1h' }
          },
          {
            id: 'get-templates',
            name: 'Get Email Templates',
            method: 'GET',
            path: '/api/v1/email/templates',
            description: 'Retrieve available email templates',
            parameters: [
              { name: 'category', type: 'string', required: false, description: 'Template category filter' }
            ],
            responseSchema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                  variables: { type: 'array' }
                }
              }
            },
            authentication: true
          }
        ],
        eventTypes: [
          'q.qmail.email.sent.v1',
          'q.qmail.email.failed.v1',
          'q.qmail.template.created.v1'
        ],
        status: 'available',
        lastHealthCheck: new Date().toISOString(),
        metadata: {
          baseUrl: process.env.QMAIL_BASE_URL || 'http://localhost:3001',
          version: '1.0.0',
          supportedFormats: ['html', 'text', 'markdown']
        }
      };

    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to discover Qmail: ${error}`);
      return null;
    }
  }

  /**
   * Discover QpiC module
   */
  private async discoverQpiCModule(): Promise<ModuleCapability | null> {
    try {
      const qpicService = ecosystemIntegration.getService('qpic');
      if (!qpicService) {
        return null;
      }

      return {
        moduleId: 'qpic',
        name: 'QpiC Image Processing Service',
        version: '1.0.0',
        capabilities: ['image-processing', 'format-conversion', 'optimization', 'metadata-extraction'],
        endpoints: [
          {
            id: 'process-image',
            name: 'Process Image',
            method: 'POST',
            path: '/api/v1/image/process',
            description: 'Process and transform images',
            parameters: [
              { name: 'imageUrl', type: 'string', required: true, description: 'Source image URL or CID' },
              { name: 'operations', type: 'array', required: true, description: 'Processing operations to apply' },
              { name: 'format', type: 'string', required: false, description: 'Output format (jpg, png, webp)' },
              { name: 'quality', type: 'number', required: false, description: 'Output quality (1-100)' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                processedImageCid: { type: 'string' },
                metadata: { type: 'object' },
                operations: { type: 'array' }
              }
            },
            authentication: true,
            rateLimit: { requests: 50, window: '1h' }
          },
          {
            id: 'extract-metadata',
            name: 'Extract Image Metadata',
            method: 'GET',
            path: '/api/v1/image/metadata',
            description: 'Extract metadata from images',
            parameters: [
              { name: 'imageUrl', type: 'string', required: true, description: 'Image URL or CID' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                format: { type: 'string' },
                size: { type: 'number' },
                exif: { type: 'object' }
              }
            },
            authentication: true
          }
        ],
        eventTypes: [
          'q.qpic.image.processed.v1',
          'q.qpic.image.failed.v1',
          'q.qpic.batch.completed.v1'
        ],
        status: 'available',
        lastHealthCheck: new Date().toISOString(),
        metadata: {
          baseUrl: process.env.QPIC_BASE_URL || 'http://localhost:3002',
          version: '1.0.0',
          supportedFormats: ['jpg', 'png', 'gif', 'webp', 'svg'],
          maxFileSize: '10MB'
        }
      };

    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to discover QpiC: ${error}`);
      return null;
    }
  }

  /**
   * Discover sQuid module
   */
  private async discoverSquidModule(): Promise<ModuleCapability | null> {
    try {
      const squidService = ecosystemIntegration.getService('squid');
      if (!squidService) {
        return null;
      }

      return {
        moduleId: 'squid',
        name: 'sQuid Identity Service',
        version: '1.0.0',
        capabilities: ['identity-management', 'authentication', 'authorization', 'key-management'],
        endpoints: [
          {
            id: 'verify-identity',
            name: 'Verify Identity',
            method: 'POST',
            path: '/api/v1/identity/verify',
            description: 'Verify identity signature',
            parameters: [
              { name: 'identity', type: 'string', required: true, description: 'Identity identifier' },
              { name: 'signature', type: 'string', required: true, description: 'Signature to verify' },
              { name: 'message', type: 'string', required: true, description: 'Original message' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                identity: { type: 'object' },
                timestamp: { type: 'string' }
              }
            },
            authentication: false
          },
          {
            id: 'get-identity',
            name: 'Get Identity',
            method: 'GET',
            path: '/api/v1/identity/:id',
            description: 'Retrieve identity information',
            parameters: [
              { name: 'id', type: 'string', required: true, description: 'Identity ID' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                publicKey: { type: 'string' },
                metadata: { type: 'object' },
                status: { type: 'string' }
              }
            },
            authentication: true
          }
        ],
        eventTypes: [
          'q.squid.identity.created.v1',
          'q.squid.identity.verified.v1',
          'q.squid.identity.revoked.v1'
        ],
        status: 'available',
        lastHealthCheck: new Date().toISOString(),
        metadata: {
          baseUrl: process.env.SQUID_BASE_URL || 'http://localhost:3003',
          version: '1.0.0',
          keyTypes: ['ed25519', 'secp256k1']
        }
      };

    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to discover sQuid: ${error}`);
      return null;
    }
  }

  /**
   * Discover QNET module
   */
  private async discoverQNETModule(): Promise<ModuleCapability | null> {
    try {
      const qnetService = ecosystemIntegration.getService('qnet');
      if (!qnetService) {
        return null;
      }

      return {
        moduleId: 'qnet',
        name: 'QNET Networking Service',
        version: '1.0.0',
        capabilities: ['peer-discovery', 'message-routing', 'network-topology', 'node-management'],
        endpoints: [
          {
            id: 'get-peers',
            name: 'Get Network Peers',
            method: 'GET',
            path: '/api/v1/network/peers',
            description: 'Get list of network peers',
            parameters: [
              { name: 'capability', type: 'string', required: false, description: 'Filter by capability' },
              { name: 'status', type: 'string', required: false, description: 'Filter by status' }
            ],
            responseSchema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  peerId: { type: 'string' },
                  address: { type: 'string' },
                  capabilities: { type: 'array' },
                  status: { type: 'string' },
                  latency: { type: 'number' }
                }
              }
            },
            authentication: true
          },
          {
            id: 'send-message',
            name: 'Send P2P Message',
            method: 'POST',
            path: '/api/v1/network/message',
            description: 'Send message to network peer',
            parameters: [
              { name: 'peerId', type: 'string', required: true, description: 'Target peer ID' },
              { name: 'message', type: 'object', required: true, description: 'Message payload' },
              { name: 'priority', type: 'string', required: false, description: 'Message priority' }
            ],
            responseSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string' },
                status: { type: 'string' },
                timestamp: { type: 'string' }
              }
            },
            authentication: true,
            rateLimit: { requests: 1000, window: '1h' }
          }
        ],
        eventTypes: [
          'q.qnet.peer.connected.v1',
          'q.qnet.peer.disconnected.v1',
          'q.qnet.message.received.v1'
        ],
        status: 'available',
        lastHealthCheck: new Date().toISOString(),
        metadata: {
          baseUrl: process.env.QNET_BASE_URL || 'http://localhost:3004',
          version: '1.0.0',
          protocols: ['libp2p', 'gossipsub', 'kad-dht']
        }
      };

    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to discover QNET: ${error}`);
      return null;
    }
  }

  /**
   * Validate endpoint parameters
   */
  private validateEndpointParameters(endpoint: ModuleEndpoint, parameters: Record<string, any>): void {
    for (const param of endpoint.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        
        // Type validation
        if (param.type === 'string' && typeof value !== 'string') {
          throw new Error(`Parameter ${param.name} must be a string`);
        }
        if (param.type === 'number' && typeof value !== 'number') {
          throw new Error(`Parameter ${param.name} must be a number`);
        }
        if (param.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Parameter ${param.name} must be a boolean`);
        }
        if (param.type === 'array' && !Array.isArray(value)) {
          throw new Error(`Parameter ${param.name} must be an array`);
        }
        if (param.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          throw new Error(`Parameter ${param.name} must be an object`);
        }

        // Validation rules
        if (param.validation) {
          if (param.validation.pattern && typeof value === 'string') {
            const regex = new RegExp(param.validation.pattern);
            if (!regex.test(value)) {
              throw new Error(`Parameter ${param.name} does not match required pattern`);
            }
          }
          if (param.validation.min !== undefined && typeof value === 'number' && value < param.validation.min) {
            throw new Error(`Parameter ${param.name} must be at least ${param.validation.min}`);
          }
          if (param.validation.max !== undefined && typeof value === 'number' && value > param.validation.max) {
            throw new Error(`Parameter ${param.name} must be at most ${param.validation.max}`);
          }
          if (param.validation.enum && !param.validation.enum.includes(value)) {
            throw new Error(`Parameter ${param.name} must be one of: ${param.validation.enum.join(', ')}`);
          }
        }
      }
    }
  }

  /**
   * Execute with retry policy
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryPolicy?: { maxAttempts: number; backoffMs: number }
  ): Promise<T> {
    const maxAttempts = retryPolicy?.maxAttempts || 1;
    const backoffMs = retryPolicy?.backoffMs || 1000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Make module call
   */
  private async makeModuleCall(service: any, request: ModuleCallRequest): Promise<any> {
    // This would integrate with the actual service implementation
    // For now, we'll simulate the call
    if (typeof service.call === 'function') {
      return await service.call(request.endpoint, request.method, request.parameters, request.headers);
    }

    // Fallback for services without a generic call method
    const methodName = `${request.method.toLowerCase()}${request.endpoint.replace(/[^a-zA-Z0-9]/g, '')}`;
    if (typeof service[methodName] === 'function') {
      return await service[methodName](request.parameters);
    }

    throw new Error(`Method not supported: ${request.method} ${request.endpoint}`);
  }

  /**
   * Update module status
   */
  private updateModuleStatus(moduleId: string, status: 'available' | 'unavailable' | 'degraded'): void {
    const module = this.moduleCapabilities.get(moduleId);
    if (module) {
      module.status = status;
      module.lastHealthCheck = new Date().toISOString();
      
      this.emit('moduleStatusChanged', { moduleId, status, timestamp: module.lastHealthCheck });
    }
  }

  /**
   * Handle module registered event
   */
  private async handleModuleRegistered(event: any): Promise<void> {
    try {
      const { moduleId } = event.data;
      console.log(`[EcosystemIntegration] Module registered: ${moduleId}`);
      
      // Trigger discovery for the new module
      await this.discoverModules();
    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to handle module registration: ${error}`);
    }
  }

  /**
   * Handle module unregistered event
   */
  private handleModuleUnregistered(event: any): void {
    try {
      const { moduleId } = event.data;
      console.log(`[EcosystemIntegration] Module unregistered: ${moduleId}`);
      
      // Remove module from capabilities
      this.moduleCapabilities.delete(moduleId);
      this.eventSubscriptions.delete(moduleId);
      
      this.emit('moduleRemoved', { moduleId, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to handle module unregistration: ${error}`);
    }
  }

  /**
   * Handle module health changed event
   */
  private handleModuleHealthChanged(event: any): void {
    try {
      const { moduleId, status } = event.data;
      console.log(`[EcosystemIntegration] Module health changed: ${moduleId} -> ${status}`);
      
      this.updateModuleStatus(moduleId, status);
    } catch (error) {
      console.error(`[EcosystemIntegration] Failed to handle module health change: ${error}`);
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    this.moduleCapabilities.clear();
    this.eventSubscriptions.clear();
    this.crossModuleEvents.length = 0;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const ecosystemModuleIntegration = new EcosystemModuleIntegration();