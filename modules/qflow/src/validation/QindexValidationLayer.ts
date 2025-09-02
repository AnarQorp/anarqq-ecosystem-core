/**
 * Qindex Validation Layer for Universal Validation Pipeline
 * 
 * Integrates with Qindex service for metadata validation and indexing
 * ensuring proper data structure and searchability.
 */

import { ValidationResult, ValidationContext } from './UniversalValidationPipeline.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface QindexValidationConfig {
  endpoint: string;
  timeout: number;
  retryAttempts: number;
  enableIndexing: boolean;
  validateSchema: boolean;
  schemaVersion: string;
}

export interface MetadataSchema {
  id: string;
  version: string;
  name: string;
  description: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  format?: string;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

export interface IndexRequest {
  id: string;
  type: string;
  metadata: Record<string, any>;
  content?: any;
  tags?: string[];
  context: ValidationContext;
}

export interface IndexResponse {
  indexed: boolean;
  id: string;
  version: number;
  searchable: boolean;
  metadata: Record<string, any>;
  extractedTags: string[];
  timestamp: string;
}

export interface QindexValidationResult extends ValidationResult {
  details: {
    schemaValidation: boolean;
    metadataComplete: boolean;
    indexingStatus: 'indexed' | 'pending' | 'failed' | 'skipped';
    missingFields?: string[];
    invalidFields?: string[];
    extractedMetadata?: Record<string, any>;
    searchTags?: string[];
    schemaVersion?: string;
    error?: string;
  };
}

/**
 * Mock Qindex Service for development/testing
 * In production, this would integrate with the actual Qindex service
 */
class MockQindexService {
  private schemas: Map<string, MetadataSchema> = new Map();
  private indices: Map<string, IndexResponse> = new Map();
  private config: QindexValidationConfig;

  constructor(config: QindexValidationConfig) {
    this.config = config;
    this.initializeDefaultSchemas();
  }

  private initializeDefaultSchemas(): void {
    // Flow metadata schema
    const flowSchema: MetadataSchema = {
      id: 'flow-metadata-v1',
      version: '1.0.0',
      name: 'Flow Metadata Schema',
      description: 'Schema for flow definition metadata',
      properties: {
        name: {
          type: 'string',
          description: 'Flow name',
          minLength: 1,
          maxLength: 100
        },
        description: {
          type: 'string',
          description: 'Flow description',
          maxLength: 500
        },
        version: {
          type: 'string',
          description: 'Flow version',
          pattern: '^\\d+\\.\\d+\\.\\d+$'
        },
        author: {
          type: 'string',
          description: 'Flow author (sQuid identity)',
          pattern: '^squid:'
        },
        tags: {
          type: 'array',
          description: 'Flow tags for categorization',
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 50
          }
        },
        category: {
          type: 'string',
          description: 'Flow category',
          enum: ['automation', 'integration', 'data-processing', 'notification', 'workflow']
        },
        priority: {
          type: 'number',
          description: 'Flow execution priority',
          minimum: 1,
          maximum: 10
        },
        public: {
          type: 'boolean',
          description: 'Whether flow is publicly accessible'
        }
      },
      required: ['name', 'version', 'author'],
      additionalProperties: true
    };

    // Execution metadata schema
    const executionSchema: MetadataSchema = {
      id: 'execution-metadata-v1',
      version: '1.0.0',
      name: 'Execution Metadata Schema',
      description: 'Schema for flow execution metadata',
      properties: {
        flowId: {
          type: 'string',
          description: 'Flow identifier'
        },
        executionId: {
          type: 'string',
          description: 'Execution identifier'
        },
        actor: {
          type: 'string',
          description: 'Execution actor (sQuid identity)',
          pattern: '^squid:'
        },
        environment: {
          type: 'string',
          description: 'Execution environment',
          enum: ['development', 'staging', 'production']
        },
        parameters: {
          type: 'object',
          description: 'Execution parameters'
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in milliseconds',
          minimum: 1000,
          maximum: 3600000
        }
      },
      required: ['flowId', 'executionId', 'actor'],
      additionalProperties: true
    };

    this.schemas.set('flow-metadata-v1', flowSchema);
    this.schemas.set('execution-metadata-v1', executionSchema);
  }

  async validateMetadata(data: any, schemaId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    extractedMetadata: Record<string, any>;
  }> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [`Schema not found: ${schemaId}`],
        warnings: [],
        extractedMetadata: {}
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const extractedMetadata: Record<string, any> = {};

    // Validate required fields
    for (const requiredField of schema.required) {
      if (!(requiredField in data)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    // Validate field types and constraints
    for (const [fieldName, fieldValue] of Object.entries(data)) {
      const property = schema.properties[fieldName];
      
      if (!property) {
        if (!schema.additionalProperties) {
          warnings.push(`Unknown field: ${fieldName}`);
        }
        extractedMetadata[fieldName] = fieldValue;
        continue;
      }

      const validation = this.validateProperty(fieldValue, property, fieldName);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      
      if (validation.valid) {
        extractedMetadata[fieldName] = fieldValue;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      extractedMetadata
    };
  }

  async indexData(request: IndexRequest): Promise<IndexResponse> {
    const { id, type, metadata, content, tags = [], context } = request;
    
    // Extract searchable tags from metadata and content
    const extractedTags = this.extractTags(metadata, content, tags);
    
    // Create index entry
    const indexResponse: IndexResponse = {
      indexed: true,
      id,
      version: 1,
      searchable: true,
      metadata: { ...metadata },
      extractedTags,
      timestamp: new Date().toISOString()
    };

    // Store in mock index
    this.indices.set(id, indexResponse);

    return indexResponse;
  }

  async searchIndex(query: string, filters?: Record<string, any>): Promise<IndexResponse[]> {
    const results: IndexResponse[] = [];
    
    for (const [id, indexEntry] of this.indices) {
      // Simple text search in metadata and tags
      const searchableText = [
        JSON.stringify(indexEntry.metadata),
        ...indexEntry.extractedTags
      ].join(' ').toLowerCase();

      if (searchableText.includes(query.toLowerCase())) {
        // Apply filters if provided
        if (filters) {
          let matches = true;
          for (const [filterKey, filterValue] of Object.entries(filters)) {
            if (indexEntry.metadata[filterKey] !== filterValue) {
              matches = false;
              break;
            }
          }
          if (!matches) continue;
        }
        
        results.push(indexEntry);
      }
    }

    return results;
  }

  async getIndexEntry(id: string): Promise<IndexResponse | null> {
    return this.indices.get(id) || null;
  }

  async deleteIndexEntry(id: string): Promise<boolean> {
    return this.indices.delete(id);
  }

  async getSchema(schemaId: string): Promise<MetadataSchema | null> {
    return this.schemas.get(schemaId) || null;
  }

  async registerSchema(schema: MetadataSchema): Promise<void> {
    this.schemas.set(schema.id, schema);
  }

  private validateProperty(value: any, property: SchemaProperty, fieldName: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (property.type !== actualType) {
      errors.push(`Field ${fieldName}: expected ${property.type}, got ${actualType}`);
      return { valid: false, errors, warnings };
    }

    // String validations
    if (property.type === 'string' && typeof value === 'string') {
      if (property.minLength && value.length < property.minLength) {
        errors.push(`Field ${fieldName}: minimum length is ${property.minLength}`);
      }
      if (property.maxLength && value.length > property.maxLength) {
        errors.push(`Field ${fieldName}: maximum length is ${property.maxLength}`);
      }
      if (property.pattern && !new RegExp(property.pattern).test(value)) {
        errors.push(`Field ${fieldName}: does not match pattern ${property.pattern}`);
      }
      if (property.enum && !property.enum.includes(value)) {
        errors.push(`Field ${fieldName}: must be one of ${property.enum.join(', ')}`);
      }
    }

    // Number validations
    if (property.type === 'number' && typeof value === 'number') {
      if (property.minimum !== undefined && value < property.minimum) {
        errors.push(`Field ${fieldName}: minimum value is ${property.minimum}`);
      }
      if (property.maximum !== undefined && value > property.maximum) {
        errors.push(`Field ${fieldName}: maximum value is ${property.maximum}`);
      }
    }

    // Array validations
    if (property.type === 'array' && Array.isArray(value)) {
      if (property.items) {
        for (let i = 0; i < value.length; i++) {
          const itemValidation = this.validateProperty(value[i], property.items, `${fieldName}[${i}]`);
          errors.push(...itemValidation.errors);
          warnings.push(...itemValidation.warnings);
        }
      }
    }

    // Object validations
    if (property.type === 'object' && typeof value === 'object' && value !== null) {
      if (property.properties) {
        for (const [propName, propValue] of Object.entries(value)) {
          const propSchema = property.properties[propName];
          if (propSchema) {
            const propValidation = this.validateProperty(propValue, propSchema, `${fieldName}.${propName}`);
            errors.push(...propValidation.errors);
            warnings.push(...propValidation.warnings);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private extractTags(metadata: Record<string, any>, content?: any, explicitTags: string[] = []): string[] {
    const tags = new Set<string>(explicitTags);

    // Extract tags from metadata
    if (metadata.tags && Array.isArray(metadata.tags)) {
      metadata.tags.forEach(tag => tags.add(String(tag)));
    }

    if (metadata.category) {
      tags.add(String(metadata.category));
    }

    if (metadata.author) {
      tags.add(String(metadata.author));
    }

    // Extract tags from content (simplified)
    if (content && typeof content === 'object') {
      if (content.type) {
        tags.add(String(content.type));
      }
      if (content.steps && Array.isArray(content.steps)) {
        content.steps.forEach((step: any) => {
          if (step.type) {
            tags.add(`step:${step.type}`);
          }
        });
      }
    }

    return Array.from(tags).filter(tag => tag.length > 0);
  }
}

/**
 * Qindex Validation Layer
 * Provides metadata validation and indexing for the Universal Validation Pipeline
 */
export class QindexValidationLayer {
  private qindexService: MockQindexService;
  private config: QindexValidationConfig;

  constructor(config?: Partial<QindexValidationConfig>) {
    this.config = {
      endpoint: process.env.QINDEX_ENDPOINT || 'http://localhost:8082',
      timeout: 10000,
      retryAttempts: 3,
      enableIndexing: true,
      validateSchema: true,
      schemaVersion: '1.0.0',
      ...config
    };

    this.qindexService = new MockQindexService(this.config);
  }

  /**
   * Validate metadata and optionally index data
   */
  async validateMetadata(data: any, context: ValidationContext): Promise<QindexValidationResult> {
    const startTime = Date.now();
    
    try {
      // Determine schema to use
      const schemaId = this.determineSchema(data, context);
      
      if (!schemaId) {
        return {
          layerId: 'qindex-validation',
          status: 'passed',
          message: 'No metadata validation required',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          details: {
            schemaValidation: false,
            metadataComplete: true,
            indexingStatus: 'skipped'
          }
        };
      }

      // Validate metadata against schema
      const validation = await this.qindexService.validateMetadata(data, schemaId);
      
      // Index data if validation passes and indexing is enabled
      let indexingStatus: 'indexed' | 'pending' | 'failed' | 'skipped' = 'skipped';
      let extractedTags: string[] = [];

      if (validation.valid && this.config.enableIndexing) {
        try {
          const indexRequest: IndexRequest = {
            id: data.id || context.requestId,
            type: this.getDataType(data, context),
            metadata: validation.extractedMetadata,
            content: data,
            tags: data.tags || [],
            context
          };

          const indexResponse = await this.qindexService.indexData(indexRequest);
          indexingStatus = indexResponse.indexed ? 'indexed' : 'failed';
          extractedTags = indexResponse.extractedTags;

          // Emit indexing event
          qflowEventEmitter.emit('q.qflow.qindex.indexed.v1', {
            id: indexRequest.id,
            type: indexRequest.type,
            indexed: indexResponse.indexed,
            tags: extractedTags,
            timestamp: new Date().toISOString()
          });

        } catch (indexError) {
          console.warn('[QindexValidation] ⚠️ Indexing failed:', indexError);
          indexingStatus = 'failed';
        }
      }

      // Determine overall status
      const status = validation.valid ? 'passed' : 'failed';
      const message = validation.valid 
        ? 'Metadata validation passed'
        : `Metadata validation failed: ${validation.errors.join(', ')}`;

      return {
        layerId: 'qindex-validation',
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          schemaValidation: validation.valid,
          metadataComplete: validation.errors.length === 0,
          indexingStatus,
          missingFields: validation.errors.filter(e => e.includes('Missing required')).map(e => e.split(': ')[1]),
          invalidFields: validation.errors.filter(e => !e.includes('Missing required')).map(e => e.split(':')[0].replace('Field ', '')),
          extractedMetadata: validation.extractedMetadata,
          searchTags: extractedTags.length > 0 ? extractedTags : undefined,
          schemaVersion: this.config.schemaVersion
        }
      };

    } catch (error) {
      return {
        layerId: 'qindex-validation',
        status: 'failed',
        message: `Qindex validation error: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          schemaValidation: false,
          metadataComplete: false,
          indexingStatus: 'failed',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Search indexed data
   */
  async searchIndex(query: string, filters?: Record<string, any>): Promise<IndexResponse[]> {
    try {
      return await this.qindexService.searchIndex(query, filters);
    } catch (error) {
      console.error('[QindexValidation] ❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Get index entry by ID
   */
  async getIndexEntry(id: string): Promise<IndexResponse | null> {
    try {
      return await this.qindexService.getIndexEntry(id);
    } catch (error) {
      console.error('[QindexValidation] ❌ Failed to get index entry:', error);
      throw error;
    }
  }

  /**
   * Delete index entry
   */
  async deleteIndexEntry(id: string): Promise<boolean> {
    try {
      const deleted = await this.qindexService.deleteIndexEntry(id);
      
      if (deleted) {
        // Emit deletion event
        qflowEventEmitter.emit('q.qflow.qindex.deleted.v1', {
          id,
          timestamp: new Date().toISOString()
        });

        console.log(`[QindexValidation] 🗑️ Index entry deleted: ${id}`);
      }

      return deleted;

    } catch (error) {
      console.error('[QindexValidation] ❌ Failed to delete index entry:', error);
      throw error;
    }
  }

  /**
   * Register a new metadata schema
   */
  async registerSchema(schema: MetadataSchema): Promise<void> {
    try {
      await this.qindexService.registerSchema(schema);
      
      // Emit schema registration event
      qflowEventEmitter.emit('q.qflow.qindex.schema.registered.v1', {
        schemaId: schema.id,
        version: schema.version,
        name: schema.name,
        timestamp: new Date().toISOString()
      });

      console.log(`[QindexValidation] 📋 Schema registered: ${schema.id}`);

    } catch (error) {
      console.error('[QindexValidation] ❌ Failed to register schema:', error);
      throw error;
    }
  }

  /**
   * Get schema by ID
   */
  async getSchema(schemaId: string): Promise<MetadataSchema | null> {
    try {
      return await this.qindexService.getSchema(schemaId);
    } catch (error) {
      console.error('[QindexValidation] ❌ Failed to get schema:', error);
      throw error;
    }
  }

  /**
   * Determine which schema to use for validation
   */
  private determineSchema(data: any, context: ValidationContext): string | null {
    // Check for explicit schema specification
    if (data.schema) {
      return data.schema;
    }

    // Check context for hints first
    if (context.metadata?.type === 'execution') {
      return 'execution-metadata-v1';
    }

    if (context.metadata?.type === 'flow') {
      return 'flow-metadata-v1';
    }

    // Infer schema from data type
    // Check for execution data first (more specific)
    if (data.executionId && data.flowId && data.actor) {
      return 'execution-metadata-v1';
    }

    // Check for flow data
    if (data.steps || (data.name && data.version && data.author)) {
      return 'flow-metadata-v1';
    }

    // Fallback checks
    if (data.executionId || (data.flowId && data.actor && !data.steps)) {
      return 'execution-metadata-v1';
    }

    if (data.flowId || data.name) {
      return 'flow-metadata-v1';
    }

    return null;
  }

  /**
   * Determine data type for indexing
   */
  private getDataType(data: any, context: ValidationContext): string {
    if (data.steps || data.flowId) {
      return 'flow';
    }

    if (data.executionId) {
      return 'execution';
    }

    return context.metadata?.type || 'unknown';
  }

  /**
   * Get validation layer configuration for Universal Validation Pipeline
   */
  getValidationLayer() {
    return {
      layerId: 'qindex-validation',
      name: 'Qindex Metadata Validation',
      description: 'Validates metadata schemas and provides indexing capabilities',
      priority: 3, // After security and permissions
      required: false, // Metadata validation is optional
      timeout: this.config.timeout
    };
  }

  /**
   * Get validator function for Universal Validation Pipeline
   */
  getValidator() {
    return async (data: any, context: ValidationContext): Promise<ValidationResult> => {
      return await this.validateMetadata(data, context);
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): QindexValidationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QindexValidationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[QindexValidation] 📋 Configuration updated');
  }

  /**
   * Get indexing statistics
   */
  getIndexStats(): { totalEntries: number; schemas: number } {
    return {
      totalEntries: (this.qindexService as any).indices.size,
      schemas: (this.qindexService as any).schemas.size
    };
  }
}

// Export singleton instance
export const qindexValidationLayer = new QindexValidationLayer();