/**
 * QindexCore - Core indexing and pointer management
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';
import { StorageManager } from '../storage/StorageManager.js';
import { PointerManager } from '../storage/PointerManager.js';
import { HistoryManager } from '../storage/HistoryManager.js';
import { QueryEngine } from '../query/QueryEngine.js';
import { RetentionManager } from '../retention/RetentionManager.js';
import { IntegrationManager } from '../integrations/IntegrationManager.js';
import { CRDTResolver } from '../crdt/CRDTResolver.js';

export class QindexCore extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.logger = createLogger('QindexCore');
    this.initialized = false;
    
    // Core components
    this.storage = null;
    this.pointers = null;
    this.history = null;
    this.query = null;
    this.retention = null;
    this.integrations = null;
    this.crdt = null;
  }

  async initialize() {
    try {
      this.logger.info('Initializing Qindex core components...');

      // Initialize storage layer
      this.storage = new StorageManager(this.config);
      await this.storage.initialize();

      // Initialize pointer management
      this.pointers = new PointerManager(this.config, this.storage);
      await this.pointers.initialize();

      // Initialize history tracking
      this.history = new HistoryManager(this.config, this.storage);
      await this.history.initialize();

      // Initialize query engine
      this.query = new QueryEngine(this.config, this.storage, this.pointers);
      await this.query.initialize();

      // Initialize CRDT conflict resolution
      this.crdt = new CRDTResolver(this.config);
      await this.crdt.initialize();

      // Initialize retention management
      this.retention = new RetentionManager(this.config, this.storage, this.history);
      await this.retention.initialize();

      // Initialize integrations (if in integrated mode)
      if (this.config.mode === 'integrated') {
        this.integrations = new IntegrationManager(this.config);
        await this.integrations.initialize();
      }

      this.initialized = true;
      this.logger.info('Qindex core initialized successfully');

      // Emit initialization event
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Qindex core', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Qindex core...');

      if (this.retention) {
        await this.retention.shutdown();
      }

      if (this.integrations) {
        await this.integrations.shutdown();
      }

      if (this.query) {
        await this.query.shutdown();
      }

      if (this.history) {
        await this.history.shutdown();
      }

      if (this.pointers) {
        await this.pointers.shutdown();
      }

      if (this.storage) {
        await this.storage.shutdown();
      }

      this.initialized = false;
      this.logger.info('Qindex core shutdown complete');

      // Emit shutdown event
      this.emit('shutdown');

    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Store a record with key-value pair
   */
  async put(key, value, metadata = {}, options = {}) {
    if (!this.initialized) {
      throw new Error('Qindex core not initialized');
    }

    try {
      this.logger.debug('Storing record', { key, metadata, options });

      // Validate inputs
      this._validateKey(key);
      this._validateValue(value);

      // Check permissions if integrated
      if (this.integrations) {
        await this.integrations.checkPermissions('write', key, metadata.identity);
      }

      // Encrypt if requested
      let processedValue = value;
      if (options.encrypt && this.integrations) {
        processedValue = await this.integrations.encrypt(value, metadata.identity);
      }

      // Store in storage layer
      const cid = await this.storage.store(key, processedValue, metadata);

      // Update pointer
      const version = await this.pointers.updatePointer(key, cid, metadata);

      // Record in history
      await this.history.recordOperation(key, 'put', {
        cid,
        version,
        metadata,
        timestamp: new Date().toISOString()
      });

      // Set retention policy
      if (metadata.ttl || this.config.retention.defaultTtl) {
        await this.retention.setRetention(key, metadata.ttl || this.config.retention.defaultTtl);
      }

      // Emit event
      this.emit('record.created', {
        key,
        cid,
        version,
        metadata,
        timestamp: new Date().toISOString()
      });

      // Log audit event if integrated
      if (this.integrations) {
        await this.integrations.logAudit('record.created', {
          key,
          cid,
          version,
          identity: metadata.identity
        });
      }

      this.logger.info('Record stored successfully', { key, cid, version });

      return {
        success: true,
        key,
        cid,
        version,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to store record', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve a record by key
   */
  async get(key, options = {}) {
    if (!this.initialized) {
      throw new Error('Qindex core not initialized');
    }

    try {
      this.logger.debug('Retrieving record', { key, options });

      // Validate key
      this._validateKey(key);

      // Check permissions if integrated
      if (this.integrations) {
        await this.integrations.checkPermissions('read', key, options.identity);
      }

      // Get pointer information
      const pointer = await this.pointers.getPointer(key);
      if (!pointer) {
        return null;
      }

      // Determine which version to retrieve
      const targetCid = options.version ? 
        await this.history.getCidForVersion(key, options.version) : 
        pointer.currentCid;

      if (!targetCid) {
        return null;
      }

      // Retrieve from storage
      const record = await this.storage.retrieve(targetCid);
      if (!record) {
        return null;
      }

      // Decrypt if needed
      let processedValue = record.value;
      if (record.metadata.encrypted && this.integrations) {
        processedValue = await this.integrations.decrypt(record.value, options.identity);
      }

      // Update access statistics
      await this.pointers.recordAccess(key);

      // Emit event
      this.emit('record.accessed', {
        key,
        cid: targetCid,
        version: pointer.version,
        timestamp: new Date().toISOString()
      });

      this.logger.debug('Record retrieved successfully', { key, cid: targetCid });

      return {
        key,
        value: processedValue,
        metadata: record.metadata,
        version: pointer.version,
        cid: targetCid,
        timestamp: record.timestamp
      };

    } catch (error) {
      this.logger.error('Failed to retrieve record', { key, error: error.message });
      throw error;
    }
  }

  /**
   * List records with filtering
   */
  async list(filters = {}) {
    if (!this.initialized) {
      throw new Error('Qindex core not initialized');
    }

    try {
      this.logger.debug('Listing records', { filters });

      // Use query engine for complex filtering
      const results = await this.query.search(filters);

      this.logger.debug('Records listed successfully', { 
        count: results.records.length,
        total: results.total 
      });

      return results;

    } catch (error) {
      this.logger.error('Failed to list records', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Get record history
   */
  async getHistory(key, options = {}) {
    if (!this.initialized) {
      throw new Error('Qindex core not initialized');
    }

    try {
      this.logger.debug('Getting record history', { key, options });

      // Validate key
      this._validateKey(key);

      // Check permissions if integrated
      if (this.integrations) {
        await this.integrations.checkPermissions('read', key, options.identity);
      }

      // Get history from history manager
      const history = await this.history.getHistory(key, options);

      this.logger.debug('History retrieved successfully', { 
        key, 
        entries: history.history.length 
      });

      return history;

    } catch (error) {
      this.logger.error('Failed to get record history', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(key, options = {}) {
    if (!this.initialized) {
      throw new Error('Qindex core not initialized');
    }

    try {
      this.logger.debug('Deleting record', { key, options });

      // Validate key
      this._validateKey(key);

      // Check permissions if integrated
      if (this.integrations) {
        await this.integrations.checkPermissions('delete', key, options.identity);
      }

      // Get current pointer
      const pointer = await this.pointers.getPointer(key);
      if (!pointer) {
        return false;
      }

      // Remove pointer
      await this.pointers.removePointer(key);

      // Record deletion in history
      await this.history.recordOperation(key, 'delete', {
        cid: pointer.currentCid,
        version: pointer.version,
        timestamp: new Date().toISOString()
      });

      // Remove from retention tracking
      await this.retention.removeRetention(key);

      // Emit event
      this.emit('record.deleted', {
        key,
        cid: pointer.currentCid,
        version: pointer.version,
        timestamp: new Date().toISOString()
      });

      // Log audit event if integrated
      if (this.integrations) {
        await this.integrations.logAudit('record.deleted', {
          key,
          cid: pointer.currentCid,
          version: pointer.version,
          identity: options.identity
        });
      }

      this.logger.info('Record deleted successfully', { key });

      return {
        success: true,
        key,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to delete record', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: this.config.version,
      mode: this.config.mode,
      initialized: this.initialized,
      components: {}
    };

    try {
      // Check storage health
      if (this.storage) {
        health.components.storage = await this.storage.getHealth();
      }

      // Check pointer manager health
      if (this.pointers) {
        health.components.pointers = await this.pointers.getHealth();
      }

      // Check query engine health
      if (this.query) {
        health.components.query = await this.query.getHealth();
      }

      // Check integrations health
      if (this.integrations) {
        health.components.integrations = await this.integrations.getHealth();
      }

      // Determine overall health
      const componentStatuses = Object.values(health.components);
      if (componentStatuses.some(status => status.status === 'unhealthy')) {
        health.status = 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Validate key format
   */
  _validateKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (key.length > 255) {
      throw new Error('Key must be less than 256 characters');
    }

    if (!/^[a-zA-Z0-9._/-]+$/.test(key)) {
      throw new Error('Key contains invalid characters');
    }
  }

  /**
   * Validate value
   */
  _validateValue(value) {
    if (value === undefined || value === null) {
      throw new Error('Value cannot be null or undefined');
    }

    const serialized = JSON.stringify(value);
    if (serialized.length > this.config.maxRecordSize) {
      throw new Error(`Value exceeds maximum size of ${this.config.maxRecordSize} bytes`);
    }
  }
}