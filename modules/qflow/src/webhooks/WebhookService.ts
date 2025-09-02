/**
 * Webhook Service for External Event Processing
 * 
 * Handles incoming webhooks from external systems with comprehensive
 * security validation through the universal validation pipeline
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { universalValidationPipeline } from '../validation/UniversalValidationPipeline.js';
import { squidIdentityService } from '../auth/SquidIdentityService.js';
import { executionEngine } from '../core/ExecutionEngine.js';
import { FlowDefinition, ExecutionContext } from '../models/FlowDefinition.js';
import { ecosystemIntegration } from '../services/EcosystemIntegration.js';

export interface WebhookEvent {
  id: string;
  source: string;
  type: string;
  timestamp: string;
  data: any;
  signature?: string;
  headers: Record<string, string>;
  rawBody: string;
}

export interface WebhookConfig {
  flowId: string;
  endpoint: string;
  secret?: string;
  signatureHeader?: string;
  signatureAlgorithm?: 'sha256' | 'sha1' | 'md5' | 'qlock-ed25519';
  allowedSources?: string[];
  rateLimitPerMinute?: number;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  // Enhanced security configuration
  qlockVerification?: {
    enabled: boolean;
    publicKey?: string;
    requiredClaims?: string[];
  };
  qonsentScopes?: {
    required: string[];
    rateLimits?: Record<string, { requests: number; window: string }>;
  };
  qerberosRiskThreshold?: number; // 0-100, events above this threshold are rejected
}

export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  processedEvent?: ProcessedWebhookEvent;
  securityAssessment?: {
    qlockVerified: boolean;
    qonsentApproved: boolean;
    qerberosRiskScore: number;
    riskFactors: string[];
  };
}

export interface ProcessedWebhookEvent {
  id: string;
  originalEvent: WebhookEvent;
  flowId: string;
  executionContext: ExecutionContext;
  validationResults: any[];
  processedAt: string;
}

export interface ExternalEventSchema {
  name: string;
  version: string;
  source: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  transformation?: {
    mapping: Record<string, string>;
    defaultValues?: Record<string, any>;
  };
}

/**
 * Webhook Service for processing external events
 */
export class WebhookService extends EventEmitter {
  private webhookConfigs = new Map<string, WebhookConfig>();
  private eventSchemas = new Map<string, ExternalEventSchema>();
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  private processingQueue: WebhookEvent[] = [];
  private isProcessing = false;

  constructor() {
    super();
    this.setupEventSchemas();
    this.startProcessingQueue();
  }

  /**
   * Register webhook configuration for a flow
   */
  async registerWebhook(config: Omit<WebhookConfig, 'createdAt'>): Promise<string> {
    try {
      // Validate flow exists
      const flow = await this.getFlow(config.flowId);
      if (!flow) {
        throw new Error(`Flow not found: ${config.flowId}`);
      }

      // Validate creator identity
      const identity = await squidIdentityService.getIdentity(config.createdBy);
      if (!identity) {
        throw new Error(`Creator identity not found: ${config.createdBy}`);
      }

      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fullConfig: WebhookConfig = {
        ...config,
        createdAt: new Date().toISOString()
      };

      this.webhookConfigs.set(webhookId, fullConfig);

      // Emit webhook registered event
      await qflowEventEmitter.emit('q.qflow.webhook.registered.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-webhooks',
        actor: config.createdBy,
        data: {
          webhookId,
          flowId: config.flowId,
          endpoint: config.endpoint,
          source: config.source
        }
      });

      return webhookId;

    } catch (error) {
      console.error(`[WebhookService] Failed to register webhook: ${error}`);
      throw error;
    }
  }

  /**
   * Process incoming webhook event
   */
  async processWebhookEvent(
    endpoint: string,
    headers: Record<string, string>,
    body: string,
    sourceIp?: string
  ): Promise<WebhookValidationResult> {
    try {
      // Find webhook configuration
      const config = this.findWebhookConfig(endpoint);
      if (!config) {
        return {
          valid: false,
          errors: ['Webhook endpoint not found'],
          warnings: []
        };
      }

      if (!config.enabled) {
        return {
          valid: false,
          errors: ['Webhook endpoint is disabled'],
          warnings: []
        };
      }

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(endpoint, config.rateLimitPerMinute || 60);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          errors: [`Rate limit exceeded: ${rateLimitResult.remaining} requests remaining`],
          warnings: []
        };
      }

      // Parse webhook event
      const webhookEvent = this.parseWebhookEvent(endpoint, headers, body);

      // Check allowed sources first (before signature validation)
      if (config.allowedSources && config.allowedSources.length > 0) {
        const sourceAllowed = config.allowedSources.includes(webhookEvent.source) ||
                             (sourceIp && config.allowedSources.includes(sourceIp));
        
        if (!sourceAllowed) {
          return {
            valid: false,
            errors: [`Source not allowed: ${webhookEvent.source}`],
            warnings: []
          };
        }
      }

      // Enhanced security validation
      let securityAssessment = {
        qlockVerified: false,
        qonsentApproved: false,
        qerberosRiskScore: 0,
        riskFactors: [] as string[]
      };

      // 1. Validate signature (including Qlock-verified signatures)
      if (config.secret || config.qlockVerification?.enabled) {
        const signatureValid = await this.validateSignature(
          body,
          config.secret || '',
          headers[config.signatureHeader || 'x-signature'] || '',
          config.signatureAlgorithm || 'sha256',
          config
        );

        if (!signatureValid) {
          return {
            valid: false,
            errors: ['Invalid webhook signature'],
            warnings: [],
            securityAssessment
          };
        }

        if (config.signatureAlgorithm === 'qlock-ed25519') {
          securityAssessment.qlockVerified = true;
        }
      }

      // 2. Validate Qonsent scopes for external principals
      const qonsentResult = await this.validateQonsentScopes(webhookEvent, config, sourceIp);
      securityAssessment.qonsentApproved = qonsentResult.approved;

      if (!qonsentResult.approved) {
        return {
          valid: false,
          errors: qonsentResult.errors,
          warnings: qonsentResult.rateLimitExceeded ? ['Rate limit exceeded'] : [],
          securityAssessment
        };
      }

      // 3. Assess risk using Qerberos
      const riskAssessment = await this.assessQerberosRisk(webhookEvent, config, sourceIp);
      securityAssessment.qerberosRiskScore = riskAssessment.riskScore;
      securityAssessment.riskFactors = riskAssessment.riskFactors;

      if (!riskAssessment.approved) {
        return {
          valid: false,
          errors: [`Event rejected due to high risk score: ${riskAssessment.riskScore}`],
          warnings: riskAssessment.riskFactors,
          securityAssessment
        };
      }

      // Validate through universal pipeline
      const validationResult = await this.validateThroughPipeline(webhookEvent, config);
      if (!validationResult.valid) {
        return validationResult;
      }

      // Transform event data
      const transformedEvent = await this.transformEvent(webhookEvent);

      // Create execution context
      const executionContext = this.createExecutionContext(transformedEvent, config);

      // Process event
      const processedEvent: ProcessedWebhookEvent = {
        id: `processed_${webhookEvent.id}`,
        originalEvent: webhookEvent,
        flowId: config.flowId,
        executionContext,
        validationResults: validationResult.validationResults || [],
        processedAt: new Date().toISOString()
      };

      // Add to processing queue
      this.processingQueue.push(webhookEvent);

      // Emit webhook processed event
      await qflowEventEmitter.emit('q.qflow.webhook.processed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-webhooks',
        actor: 'system',
        data: {
          webhookId: webhookEvent.id,
          flowId: config.flowId,
          source: webhookEvent.source,
          type: webhookEvent.type
        }
      });

      return {
        valid: true,
        errors: [],
        warnings: validationResult.warnings || [],
        processedEvent,
        securityAssessment
      };

    } catch (error) {
      console.error(`[WebhookService] Failed to process webhook event: ${error}`);
      return {
        valid: false,
        errors: [`Processing error: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Register external event schema
   */
  registerEventSchema(schema: ExternalEventSchema): void {
    const key = `${schema.source}:${schema.name}:${schema.version}`;
    this.eventSchemas.set(key, schema);

    console.log(`[WebhookService] Registered event schema: ${key}`);
  }

  /**
   * Get webhook configurations for a flow
   */
  getWebhookConfigs(flowId: string): WebhookConfig[] {
    return Array.from(this.webhookConfigs.values())
      .filter(config => config.flowId === flowId);
  }

  /**
   * Update webhook configuration
   */
  async updateWebhookConfig(
    webhookId: string,
    updates: Partial<WebhookConfig>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const config = this.webhookConfigs.get(webhookId);
      if (!config) {
        throw new Error(`Webhook configuration not found: ${webhookId}`);
      }

      // Validate updater permissions
      const identity = await squidIdentityService.getIdentity(updatedBy);
      if (!identity) {
        throw new Error(`Updater identity not found: ${updatedBy}`);
      }

      const updatedConfig: WebhookConfig = {
        ...config,
        ...updates,
        // Prevent changing immutable fields
        flowId: config.flowId,
        createdBy: config.createdBy,
        createdAt: config.createdAt
      };

      this.webhookConfigs.set(webhookId, updatedConfig);

      // Emit webhook updated event
      await qflowEventEmitter.emit('q.qflow.webhook.updated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-webhooks',
        actor: updatedBy,
        data: {
          webhookId,
          flowId: config.flowId,
          updates: Object.keys(updates)
        }
      });

      return true;

    } catch (error) {
      console.error(`[WebhookService] Failed to update webhook config: ${error}`);
      return false;
    }
  }

  /**
   * Delete webhook configuration
   */
  async deleteWebhookConfig(webhookId: string, deletedBy: string): Promise<boolean> {
    try {
      const config = this.webhookConfigs.get(webhookId);
      if (!config) {
        return false;
      }

      // Validate deleter permissions
      const identity = await squidIdentityService.getIdentity(deletedBy);
      if (!identity) {
        throw new Error(`Deleter identity not found: ${deletedBy}`);
      }

      this.webhookConfigs.delete(webhookId);

      // Emit webhook deleted event
      await qflowEventEmitter.emit('q.qflow.webhook.deleted.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-webhooks',
        actor: deletedBy,
        data: {
          webhookId,
          flowId: config.flowId
        }
      });

      return true;

    } catch (error) {
      console.error(`[WebhookService] Failed to delete webhook config: ${error}`);
      return false;
    }
  }

  // Private helper methods

  private setupEventSchemas(): void {
    // Register common webhook event schemas
    this.registerEventSchema({
      name: 'github-push',
      version: '1.0.0',
      source: 'github',
      schema: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          repository: { type: 'object' },
          commits: { type: 'array' },
          pusher: { type: 'object' }
        },
        required: ['ref', 'repository', 'commits']
      }
    });

    this.registerEventSchema({
      name: 'stripe-payment',
      version: '1.0.0',
      source: 'stripe',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          data: { type: 'object' },
          created: { type: 'number' }
        },
        required: ['id', 'type', 'data']
      }
    });

    this.registerEventSchema({
      name: 'generic-webhook',
      version: '1.0.0',
      source: 'generic',
      schema: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string' }
        },
        required: ['event', 'data']
      }
    });
  }

  private findWebhookConfig(endpoint: string): WebhookConfig | undefined {
    return Array.from(this.webhookConfigs.values())
      .find(config => config.endpoint === endpoint);
  }

  private checkRateLimit(endpoint: string, limitPerMinute: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    let tracker = this.rateLimitTracker.get(endpoint);
    if (!tracker || now > tracker.resetTime) {
      tracker = { count: 0, resetTime: now + windowMs };
      this.rateLimitTracker.set(endpoint, tracker);
    }

    tracker.count++;
    const remaining = Math.max(0, limitPerMinute - tracker.count);

    return {
      allowed: tracker.count <= limitPerMinute,
      remaining
    };
  }

  private parseWebhookEvent(endpoint: string, headers: Record<string, string>, body: string): WebhookEvent {
    const eventId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    let data: any;
    try {
      data = JSON.parse(body);
    } catch (error) {
      data = { rawBody: body };
    }

    // Determine source from headers or data
    let source = 'unknown';
    if (headers['user-agent']?.includes('GitHub')) {
      source = 'github';
    } else if (headers['user-agent']?.includes('Stripe')) {
      source = 'stripe';
    } else if (data.source) {
      source = data.source;
    }

    // Determine event type
    let type = 'webhook';
    if (headers['x-github-event']) {
      type = headers['x-github-event'];
    } else if (headers['x-stripe-event']) {
      type = headers['x-stripe-event'];
    } else if (data.type || data.event) {
      type = data.type || data.event;
    }

    return {
      id: eventId,
      source,
      type,
      timestamp: new Date().toISOString(),
      data,
      signature: headers['x-signature'] || headers['x-hub-signature-256'] || headers['stripe-signature'],
      headers,
      rawBody: body
    };
  }

  private async validateSignature(
    body: string,
    secret: string,
    signature: string,
    algorithm: string,
    config: WebhookConfig
  ): Promise<boolean> {
    try {
      if (!signature) {
        return false;
      }

      // Handle Qlock-verified signatures
      if (algorithm === 'qlock-ed25519') {
        return await this.validateQlockSignature(body, signature, config);
      }

      let expectedSignature: string;
      
      switch (algorithm) {
        case 'sha256':
          expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('hex');
          break;
        case 'sha1':
          expectedSignature = crypto
            .createHmac('sha1', secret)
            .update(body, 'utf8')
            .digest('hex');
          break;
        case 'md5':
          expectedSignature = crypto
            .createHash('md5')
            .update(body + secret, 'utf8')
            .digest('hex');
          break;
        default:
          return false;
      }

      // Handle different signature formats
      const cleanSignature = signature.replace(/^(sha256=|sha1=|md5=)/, '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );

    } catch (error) {
      console.error(`[WebhookService] Signature validation error: ${error}`);
      return false;
    }
  }

  /**
   * Validate Qlock-verified webhook signatures
   */
  private async validateQlockSignature(
    body: string,
    signature: string,
    config: WebhookConfig
  ): Promise<boolean> {
    try {
      if (!config.qlockVerification?.enabled) {
        return false;
      }

      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.error('[WebhookService] Qlock service not available');
        return false;
      }

      // Verify signature using Qlock service
      const verificationResult = await qlockService.verifySignature({
        message: body,
        signature: signature,
        publicKey: config.qlockVerification.publicKey,
        algorithm: 'ed25519'
      });

      if (!verificationResult.valid) {
        return false;
      }

      // Validate required claims if specified
      if (config.qlockVerification.requiredClaims) {
        const claims = verificationResult.claims || {};
        for (const requiredClaim of config.qlockVerification.requiredClaims) {
          if (!claims[requiredClaim]) {
            console.warn(`[WebhookService] Missing required claim: ${requiredClaim}`);
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      console.error(`[WebhookService] Qlock signature validation error: ${error}`);
      return false;
    }
  }

  /**
   * Validate Qonsent scopes for external principals
   */
  private async validateQonsentScopes(
    event: WebhookEvent,
    config: WebhookConfig,
    sourceIp?: string
  ): Promise<{ approved: boolean; errors: string[]; rateLimitExceeded: boolean }> {
    try {
      if (!config.qonsentScopes?.required || config.qonsentScopes.required.length === 0) {
        return { approved: true, errors: [], rateLimitExceeded: false };
      }

      const qonsentService = ecosystemIntegration.getService('qonsent');
      if (!qonsentService) {
        return { 
          approved: false, 
          errors: ['Qonsent service not available'], 
          rateLimitExceeded: false 
        };
      }

      // Create external principal identifier
      const externalPrincipal = `external:${event.source}:${sourceIp || 'unknown'}`;

      // Check each required scope
      const errors: string[] = [];
      for (const scope of config.qonsentScopes.required) {
        const consentResult = await qonsentService.checkConsent({
          principal: externalPrincipal,
          resource: `webhook:${config.endpoint}`,
          action: 'execute',
          scope: scope,
          context: {
            eventType: event.type,
            source: event.source,
            timestamp: event.timestamp
          }
        });

        if (!consentResult.granted) {
          errors.push(`Consent not granted for scope: ${scope}`);
        }
      }

      // Check rate limits for scopes
      let rateLimitExceeded = false;
      if (config.qonsentScopes.rateLimits) {
        for (const [scope, limit] of Object.entries(config.qonsentScopes.rateLimits)) {
          const rateLimitResult = await qonsentService.checkRateLimit({
            principal: externalPrincipal,
            scope: scope,
            limit: limit.requests,
            window: limit.window
          });

          if (rateLimitResult.exceeded) {
            errors.push(`Rate limit exceeded for scope ${scope}: ${rateLimitResult.remaining} remaining`);
            rateLimitExceeded = true;
          }
        }
      }

      return {
        approved: errors.length === 0,
        errors,
        rateLimitExceeded
      };

    } catch (error) {
      console.error(`[WebhookService] Qonsent validation error: ${error}`);
      return { 
        approved: false, 
        errors: [`Qonsent validation error: ${error instanceof Error ? error.message : String(error)}`], 
        rateLimitExceeded: false 
      };
    }
  }

  /**
   * Assess risk using Qerberos before admitting external events
   */
  private async assessQerberosRisk(
    event: WebhookEvent,
    config: WebhookConfig,
    sourceIp?: string
  ): Promise<{ riskScore: number; riskFactors: string[]; approved: boolean }> {
    try {
      const qerberosService = ecosystemIntegration.getService('qerberos');
      if (!qerberosService) {
        // If Qerberos is not available, use basic risk assessment
        return this.performBasicRiskAssessment(event, sourceIp);
      }

      const riskAssessment = await qerberosService.assessRisk({
        eventType: 'external-webhook',
        source: event.source,
        sourceIp: sourceIp,
        payload: {
          eventId: event.id,
          type: event.type,
          dataSize: JSON.stringify(event.data).length,
          headers: event.headers,
          timestamp: event.timestamp
        },
        context: {
          endpoint: config.endpoint,
          flowId: config.flowId,
          previousEvents: this.getRecentEventsFromSource(event.source)
        }
      });

      const riskScore = riskAssessment.score || 0;
      const riskFactors = riskAssessment.factors || [];
      const threshold = config.qerberosRiskThreshold || 70;
      const approved = riskScore <= threshold;

      if (!approved) {
        console.warn(`[WebhookService] Event rejected due to high risk score: ${riskScore} > ${threshold}`);
      }

      return {
        riskScore,
        riskFactors,
        approved
      };

    } catch (error) {
      console.error(`[WebhookService] Qerberos risk assessment error: ${error}`);
      // Fallback to basic risk assessment
      return this.performBasicRiskAssessment(event, sourceIp);
    }
  }

  /**
   * Perform basic risk assessment when Qerberos is not available
   */
  private performBasicRiskAssessment(
    event: WebhookEvent,
    sourceIp?: string
  ): { riskScore: number; riskFactors: string[]; approved: boolean } {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Check payload size
    const payloadSize = JSON.stringify(event.data).length;
    if (payloadSize > 100000) { // 100KB
      riskScore += 20;
      riskFactors.push('Large payload size');
    }

    // Check for suspicious patterns in data
    const payloadString = JSON.stringify(event.data).toLowerCase();
    const suspiciousPatterns = ['<script', 'javascript:', 'eval(', 'exec(', 'system('];
    for (const pattern of suspiciousPatterns) {
      if (payloadString.includes(pattern)) {
        riskScore += 30;
        riskFactors.push(`Suspicious pattern detected: ${pattern}`);
      }
    }

    // Check source reputation (basic implementation)
    if (event.source === 'unknown' || !event.source) {
      riskScore += 15;
      riskFactors.push('Unknown or missing source');
    }

    // Check for rapid successive events from same source
    const recentEvents = this.getRecentEventsFromSource(event.source);
    if (recentEvents.length > 10) { // More than 10 events in recent history
      riskScore += 25;
      riskFactors.push('High frequency events from source');
    }

    // Check IP reputation (basic implementation)
    if (sourceIp && this.isKnownMaliciousIp(sourceIp)) {
      riskScore += 40;
      riskFactors.push('Known malicious IP address');
    }

    return {
      riskScore: Math.min(riskScore, 100), // Cap at 100
      riskFactors,
      approved: riskScore <= 70 // Default threshold
    };
  }

  /**
   * Get recent events from a specific source (for risk assessment)
   */
  private getRecentEventsFromSource(source: string): WebhookEvent[] {
    // This would typically query a persistent store
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Check if IP is known to be malicious (basic implementation)
   */
  private isKnownMaliciousIp(ip: string): boolean {
    // This would typically check against threat intelligence feeds
    // For now, return false as placeholder
    const knownMaliciousIps = ['127.0.0.1']; // Placeholder
    return knownMaliciousIps.includes(ip);
  }

  private async validateThroughPipeline(
    event: WebhookEvent,
    config: WebhookConfig
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[]; validationResults?: any[] }> {
    try {
      // Create operation for validation pipeline
      const operation = {
        operationId: `webhook_${event.id}`,
        type: 'external-event' as const,
        actor: 'external-system',
        target: config.flowId,
        payload: event,
        context: {
          source: event.source,
          type: event.type,
          endpoint: config.endpoint
        }
      };

      // Validate through universal pipeline
      const validationResult = await universalValidationPipeline.validate(operation, {
        skipLayers: [], // Validate through all layers
        timeout: 10000, // 10 second timeout
        metadata: {
          webhookConfig: config,
          eventSchema: this.findEventSchema(event)
        }
      });

      if (!validationResult.valid) {
        return {
          valid: false,
          errors: validationResult.errors.map(e => e.message),
          warnings: validationResult.warnings.map(w => w.message),
          validationResults: [validationResult]
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: validationResult.warnings.map(w => w.message),
        validationResults: [validationResult]
      };

    } catch (error) {
      console.error(`[WebhookService] Pipeline validation error: ${error}`);
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  private findEventSchema(event: WebhookEvent): ExternalEventSchema | undefined {
    // Try to find exact match first
    let key = `${event.source}:${event.type}:1.0.0`;
    let schema = this.eventSchemas.get(key);
    
    if (!schema) {
      // Try generic schema
      key = `generic:generic-webhook:1.0.0`;
      schema = this.eventSchemas.get(key);
    }

    return schema;
  }

  private async transformEvent(event: WebhookEvent): Promise<WebhookEvent> {
    const schema = this.findEventSchema(event);
    if (!schema?.transformation) {
      return event;
    }

    const transformedData = { ...event.data };

    // Apply field mappings
    if (schema.transformation.mapping) {
      for (const [sourceField, targetField] of Object.entries(schema.transformation.mapping)) {
        if (event.data[sourceField] !== undefined) {
          transformedData[targetField] = event.data[sourceField];
        }
      }
    }

    // Apply default values
    if (schema.transformation.defaultValues) {
      for (const [field, value] of Object.entries(schema.transformation.defaultValues)) {
        if (transformedData[field] === undefined) {
          transformedData[field] = value;
        }
      }
    }

    return {
      ...event,
      data: transformedData
    };
  }

  private createExecutionContext(event: WebhookEvent, config: WebhookConfig): ExecutionContext {
    return {
      triggeredBy: `webhook:${event.source}`,
      triggerType: 'webhook',
      inputData: {
        webhookEvent: event,
        source: event.source,
        type: event.type,
        timestamp: event.timestamp
      },
      variables: {
        webhook_id: event.id,
        webhook_source: event.source,
        webhook_type: event.type,
        webhook_endpoint: config.endpoint
      },
      daoSubnet: undefined, // Will be determined by flow configuration
      permissions: ['webhook:execute']
    };
  }

  private async startProcessingQueue(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const event = this.processingQueue.shift();
        if (event) {
          await this.processQueuedEvent(event);
        }
      } catch (error) {
        console.error(`[WebhookService] Queue processing error: ${error}`);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  private async processQueuedEvent(event: WebhookEvent): Promise<void> {
    try {
      // Find the webhook config for this event
      const config = Array.from(this.webhookConfigs.values())
        .find(c => c.enabled);

      if (!config) {
        console.warn(`[WebhookService] No enabled webhook config found for event: ${event.id}`);
        return;
      }

      // Create execution context
      const executionContext = this.createExecutionContext(event, config);

      // Start flow execution
      const executionId = await executionEngine.startExecution(config.flowId, executionContext);

      console.log(`[WebhookService] Started execution ${executionId} for webhook event ${event.id}`);

      // Emit execution started event
      await qflowEventEmitter.emit('q.qflow.webhook.execution.started.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-webhooks',
        actor: 'system',
        data: {
          webhookEventId: event.id,
          executionId,
          flowId: config.flowId,
          source: event.source,
          type: event.type
        }
      });

    } catch (error) {
      console.error(`[WebhookService] Failed to process queued event: ${error}`);
    }
  }

  private async getFlow(flowId: string): Promise<FlowDefinition | null> {
    // This would typically fetch from a flow registry
    // For now, return a mock implementation
    return {
      id: flowId,
      name: `Flow ${flowId}`,
      version: '1.0.0',
      owner: 'system',
      steps: [],
      metadata: {
        tags: [],
        category: 'webhook',
        visibility: 'private',
        requiredPermissions: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const webhookService = new WebhookService();