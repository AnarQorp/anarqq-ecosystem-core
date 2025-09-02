/**
 * Legacy Compatibility Middleware
 * Provides compatibility layer for gradual migration from legacy to modular architecture
 */

import { EventEmitter } from 'events';

class LegacyCompatibilityLayer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      migrationMode: config.migrationMode || 'dual-write', // 'legacy-only', 'dual-write', 'new-only'
      fallbackToLegacy: config.fallbackToLegacy !== false,
      timeoutMs: config.timeoutMs || 5000,
      retryAttempts: config.retryAttempts || 3,
      ...config
    };
    
    this.legacyServices = new Map();
    this.newServices = new Map();
    this.migrationStatus = new Map();
  }

  /**
   * Register legacy service endpoint
   */
  registerLegacyService(serviceName, endpoint, options = {}) {
    this.legacyServices.set(serviceName, {
      endpoint,
      timeout: options.timeout || this.config.timeoutMs,
      retryAttempts: options.retryAttempts || this.config.retryAttempts,
      ...options
    });
  }

  /**
   * Register new modular service
   */
  registerNewService(serviceName, service, options = {}) {
    this.newServices.set(serviceName, {
      service,
      timeout: options.timeout || this.config.timeoutMs,
      retryAttempts: options.retryAttempts || this.config.retryAttempts,
      ...options
    });
  }

  /**
   * Set migration status for a service
   */
  setMigrationStatus(serviceName, status) {
    // status: 'not-started', 'in-progress', 'completed', 'rolled-back'
    this.migrationStatus.set(serviceName, {
      status,
      timestamp: new Date().toISOString(),
      previousStatus: this.migrationStatus.get(serviceName)?.status
    });
    
    this.emit('migration-status-changed', { serviceName, status });
  }

  /**
   * Get migration status for a service
   */
  getMigrationStatus(serviceName) {
    return this.migrationStatus.get(serviceName) || { status: 'not-started' };
  }

  /**
   * Dual-write operation: write to both legacy and new systems
   */
  async dualWrite(serviceName, operation, data, options = {}) {
    const legacyService = this.legacyServices.get(serviceName);
    const newService = this.newServices.get(serviceName);
    
    if (!legacyService || !newService) {
      throw new Error(`Service ${serviceName} not properly configured for dual-write`);
    }

    const results = await Promise.allSettled([
      this.callLegacyService(serviceName, operation, data, options),
      this.callNewService(serviceName, operation, data, options)
    ]);

    // Handle results and inconsistencies
    const legacyResult = results[0];
    const newResult = results[1];

    if (legacyResult.status === 'rejected' && newResult.status === 'rejected') {
      throw new Error(`Both legacy and new services failed for ${serviceName}.${operation}`);
    }

    // Log inconsistencies for later reconciliation
    if (legacyResult.status !== newResult.status) {
      this.emit('dual-write-inconsistency', {
        serviceName,
        operation,
        legacyResult,
        newResult,
        data
      });
    }

    // Return new service result if successful, otherwise legacy
    return newResult.status === 'fulfilled' ? newResult.value : legacyResult.value;
  }

  /**
   * Smart routing: route to appropriate service based on migration status
   */
  async smartRoute(serviceName, operation, data, options = {}) {
    const migrationStatus = this.getMigrationStatus(serviceName);
    
    switch (migrationStatus.status) {
      case 'not-started':
        return this.callLegacyService(serviceName, operation, data, options);
      
      case 'in-progress':
        if (this.config.migrationMode === 'dual-write') {
          return this.dualWrite(serviceName, operation, data, options);
        } else {
          return this.callWithFallback(serviceName, operation, data, options);
        }
      
      case 'completed':
        return this.callNewService(serviceName, operation, data, options);
      
      case 'rolled-back':
        return this.callLegacyService(serviceName, operation, data, options);
      
      default:
        return this.callWithFallback(serviceName, operation, data, options);
    }
  }

  /**
   * Call new service with fallback to legacy
   */
  async callWithFallback(serviceName, operation, data, options = {}) {
    try {
      return await this.callNewService(serviceName, operation, data, options);
    } catch (error) {
      if (this.config.fallbackToLegacy) {
        this.emit('fallback-to-legacy', { serviceName, operation, error });
        return this.callLegacyService(serviceName, operation, data, options);
      }
      throw error;
    }
  }

  /**
   * Call legacy service
   */
  async callLegacyService(serviceName, operation, data, options = {}) {
    const service = this.legacyServices.get(serviceName);
    if (!service) {
      throw new Error(`Legacy service ${serviceName} not registered`);
    }

    const startTime = Date.now();
    try {
      const result = await this.makeHttpRequest(service.endpoint, operation, data, {
        timeout: service.timeout,
        retryAttempts: service.retryAttempts,
        ...options
      });
      
      this.emit('legacy-service-call', {
        serviceName,
        operation,
        duration: Date.now() - startTime,
        success: true
      });
      
      return result;
    } catch (error) {
      this.emit('legacy-service-call', {
        serviceName,
        operation,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Call new modular service
   */
  async callNewService(serviceName, operation, data, options = {}) {
    const serviceConfig = this.newServices.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`New service ${serviceName} not registered`);
    }

    const startTime = Date.now();
    try {
      const result = await serviceConfig.service[operation](data, options);
      
      this.emit('new-service-call', {
        serviceName,
        operation,
        duration: Date.now() - startTime,
        success: true
      });
      
      return result;
    } catch (error) {
      this.emit('new-service-call', {
        serviceName,
        operation,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Make HTTP request to legacy service
   */
  async makeHttpRequest(endpoint, operation, data, options = {}) {
    const url = `${endpoint}/${operation}`;
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-legacy-compatibility': 'true',
        ...options.headers
      },
      body: JSON.stringify(data),
      timeout: options.timeout || this.config.timeoutMs
    };

    let lastError;
    for (let attempt = 1; attempt <= (options.retryAttempts || 1); attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < (options.retryAttempts || 1)) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }
    throw lastError;
  }

  /**
   * Data reconciliation for dual-write inconsistencies
   */
  async reconcileData(serviceName, recordId, options = {}) {
    const legacyService = this.legacyServices.get(serviceName);
    const newService = this.newServices.get(serviceName);
    
    if (!legacyService || !newService) {
      throw new Error(`Service ${serviceName} not configured for reconciliation`);
    }

    try {
      // Fetch data from both systems
      const [legacyData, newData] = await Promise.all([
        this.callLegacyService(serviceName, 'get', { id: recordId }),
        this.callNewService(serviceName, 'get', { id: recordId })
      ]);

      // Compare and reconcile
      const reconciled = this.reconcileRecords(legacyData, newData, options);
      
      // Update both systems with reconciled data
      if (reconciled.updateLegacy) {
        await this.callLegacyService(serviceName, 'update', reconciled.data);
      }
      
      if (reconciled.updateNew) {
        await this.callNewService(serviceName, 'update', reconciled.data);
      }

      this.emit('data-reconciled', {
        serviceName,
        recordId,
        reconciled
      });

      return reconciled;
    } catch (error) {
      this.emit('reconciliation-failed', {
        serviceName,
        recordId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reconcile two records based on timestamp and business rules
   */
  reconcileRecords(legacyData, newData, options = {}) {
    const strategy = options.strategy || 'newest-wins';
    
    switch (strategy) {
      case 'newest-wins':
        const legacyTime = new Date(legacyData.updatedAt || legacyData.createdAt);
        const newTime = new Date(newData.updatedAt || newData.createdAt);
        
        if (legacyTime > newTime) {
          return { data: legacyData, updateNew: true, updateLegacy: false };
        } else {
          return { data: newData, updateLegacy: true, updateNew: false };
        }
      
      case 'legacy-wins':
        return { data: legacyData, updateNew: true, updateLegacy: false };
      
      case 'new-wins':
        return { data: newData, updateLegacy: true, updateNew: false };
      
      case 'merge':
        return {
          data: { ...legacyData, ...newData },
          updateLegacy: true,
          updateNew: true
        };
      
      default:
        throw new Error(`Unknown reconciliation strategy: ${strategy}`);
    }
  }

  /**
   * Batch migration of data from legacy to new system
   */
  async batchMigrate(serviceName, options = {}) {
    const batchSize = options.batchSize || 100;
    const maxConcurrency = options.maxConcurrency || 5;
    
    this.emit('batch-migration-started', { serviceName, options });
    
    try {
      // Get total count from legacy system
      const totalCount = await this.callLegacyService(serviceName, 'count', {});
      const totalBatches = Math.ceil(totalCount / batchSize);
      
      let migratedCount = 0;
      const errors = [];
      
      // Process batches with concurrency control
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += maxConcurrency) {
        const batchPromises = [];
        
        for (let i = 0; i < maxConcurrency && (batchIndex + i) < totalBatches; i++) {
          const currentBatch = batchIndex + i;
          const offset = currentBatch * batchSize;
          
          batchPromises.push(
            this.migrateBatch(serviceName, offset, batchSize)
              .then(result => {
                migratedCount += result.count;
                this.emit('batch-migrated', {
                  serviceName,
                  batch: currentBatch,
                  count: result.count,
                  progress: migratedCount / totalCount
                });
                return result;
              })
              .catch(error => {
                errors.push({ batch: currentBatch, error });
                this.emit('batch-migration-error', {
                  serviceName,
                  batch: currentBatch,
                  error: error.message
                });
                return { count: 0, errors: [error] };
              })
          );
        }
        
        await Promise.all(batchPromises);
      }
      
      this.emit('batch-migration-completed', {
        serviceName,
        migratedCount,
        totalCount,
        errors
      });
      
      return { migratedCount, totalCount, errors };
    } catch (error) {
      this.emit('batch-migration-failed', { serviceName, error: error.message });
      throw error;
    }
  }

  /**
   * Migrate a single batch of records
   */
  async migrateBatch(serviceName, offset, limit) {
    const records = await this.callLegacyService(serviceName, 'list', {
      offset,
      limit
    });
    
    const migrationPromises = records.map(record =>
      this.callNewService(serviceName, 'create', record)
        .catch(error => ({ error, record }))
    );
    
    const results = await Promise.all(migrationPromises);
    const errors = results.filter(result => result.error);
    
    return {
      count: results.length - errors.length,
      errors
    };
  }

  /**
   * Validate migration completeness
   */
  async validateMigration(serviceName, options = {}) {
    const sampleSize = options.sampleSize || 1000;
    
    try {
      // Get sample records from legacy system
      const legacyRecords = await this.callLegacyService(serviceName, 'sample', {
        size: sampleSize
      });
      
      const validationResults = {
        totalChecked: legacyRecords.length,
        matched: 0,
        mismatched: 0,
        missing: 0,
        errors: []
      };
      
      for (const legacyRecord of legacyRecords) {
        try {
          const newRecord = await this.callNewService(serviceName, 'get', {
            id: legacyRecord.id
          });
          
          if (this.recordsMatch(legacyRecord, newRecord, options)) {
            validationResults.matched++;
          } else {
            validationResults.mismatched++;
            validationResults.errors.push({
              type: 'mismatch',
              id: legacyRecord.id,
              legacy: legacyRecord,
              new: newRecord
            });
          }
        } catch (error) {
          if (error.message.includes('not found')) {
            validationResults.missing++;
            validationResults.errors.push({
              type: 'missing',
              id: legacyRecord.id,
              record: legacyRecord
            });
          } else {
            validationResults.errors.push({
              type: 'error',
              id: legacyRecord.id,
              error: error.message
            });
          }
        }
      }
      
      this.emit('migration-validated', { serviceName, validationResults });
      return validationResults;
    } catch (error) {
      this.emit('migration-validation-failed', { serviceName, error: error.message });
      throw error;
    }
  }

  /**
   * Check if two records match
   */
  recordsMatch(record1, record2, options = {}) {
    const ignoreFields = options.ignoreFields || ['updatedAt', 'createdAt'];
    
    const filtered1 = this.filterObject(record1, ignoreFields);
    const filtered2 = this.filterObject(record2, ignoreFields);
    
    return JSON.stringify(filtered1) === JSON.stringify(filtered2);
  }

  /**
   * Filter object by removing specified fields
   */
  filterObject(obj, fieldsToRemove) {
    const filtered = { ...obj };
    fieldsToRemove.forEach(field => delete filtered[field]);
    return filtered;
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    const stats = {
      services: {},
      overall: {
        total: this.migrationStatus.size,
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        rolledBack: 0
      }
    };

    for (const [serviceName, status] of this.migrationStatus) {
      stats.services[serviceName] = status;
      stats.overall[status.status.replace('-', '')]++;
    }

    return stats;
  }
}

export default LegacyCompatibilityLayer;