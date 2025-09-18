/**
 * Batch Processing Service
 * Aggregates operations to reduce serverless invocation costs
 */

import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';

export class BatchProcessingService {
  constructor() {
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    this.batchQueues = new Map();
    this.batchConfigs = new Map();
    this.processingTimers = new Map();
    
    // Default batch configurations
    this.defaultBatchConfig = {
      maxBatchSize: 100,
      maxWaitTime: 5000, // 5 seconds
      maxMemoryUsage: 0.8, // 80% of available memory
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.initializeMetrics();
  }

  /**
   * Initialize batch processing metrics
   */
  initializeMetrics() {
    this.observability.registerMetric('batch_operations_total', 'counter', {
      help: 'Total batch operations processed',
      labelNames: ['module', 'operation_type', 'status']
    });
    
    this.observability.registerMetric('batch_size_histogram', 'histogram', {
      help: 'Batch size distribution',
      labelNames: ['module', 'operation_type'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500]
    });
    
    this.observability.registerMetric('batch_wait_time_seconds', 'histogram', {
      help: 'Batch wait time in seconds',
      labelNames: ['module', 'operation_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });
    
    this.observability.registerMetric('batch_processing_duration_seconds', 'histogram', {
      help: 'Batch processing duration in seconds',
      labelNames: ['module', 'operation_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });
    
    this.observability.registerMetric('batch_cost_savings_ratio', 'gauge', {
      help: 'Estimated cost savings ratio from batching',
      labelNames: ['module', 'operation_type']
    });
  }

  /**
   * Configure batch processing for a module operation
   */
  async configureBatchProcessing(module, operationType, config) {
    try {
      const batchConfig = {
        module,
        operationType,
        maxBatchSize: config.maxBatchSize || this.defaultBatchConfig.maxBatchSize,
        maxWaitTime: config.maxWaitTime || this.defaultBatchConfig.maxWaitTime,
        maxMemoryUsage: config.maxMemoryUsage || this.defaultBatchConfig.maxMemoryUsage,
        retryAttempts: config.retryAttempts || this.defaultBatchConfig.retryAttempts,
        retryDelay: config.retryDelay || this.defaultBatchConfig.retryDelay,
        processor: config.processor, // Function to process the batch
        enabled: config.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const key = `${module}:${operationType}`;
      this.batchConfigs.set(key, batchConfig);
      
      // Initialize batch queue if not exists
      if (!this.batchQueues.has(key)) {
        this.batchQueues.set(key, {
          items: [],
          createdAt: Date.now(),
          totalWaitTime: 0
        });
      }
      
      await this.eventBus.publish('q.batch.config.updated.v1', {
        module,
        operationType,
        config: batchConfig,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, config: batchConfig };
    } catch (error) {
      throw new Error(`Failed to configure batch processing: ${error.message}`);
    }
  }  /**
 
  * Add item to batch queue
   */
  async addToBatch(module, operationType, item, options = {}) {
    try {
      const key = `${module}:${operationType}`;
      const config = this.batchConfigs.get(key);
      
      if (!config || !config.enabled) {
        // If batching not configured or disabled, process immediately
        return await this.processImmediately(module, operationType, item);
      }
      
      const queue = this.batchQueues.get(key);
      if (!queue) {
        throw new Error(`Batch queue not initialized for ${key}`);
      }
      
      // Add item to queue with metadata
      const batchItem = {
        id: this.generateItemId(),
        data: item,
        addedAt: Date.now(),
        priority: options.priority || 'normal',
        callback: options.callback,
        metadata: options.metadata || {}
      };
      
      queue.items.push(batchItem);
      
      // Check if batch should be processed immediately
      const shouldProcess = this.shouldProcessBatch(key);
      
      if (shouldProcess) {
        await this.processBatch(key);
      } else {
        // Set timer for max wait time if not already set
        this.setProcessingTimer(key);
      }
      
      return {
        success: true,
        itemId: batchItem.id,
        queueSize: queue.items.length,
        estimatedProcessTime: this.estimateProcessTime(key)
      };
    } catch (error) {
      throw new Error(`Failed to add item to batch: ${error.message}`);
    }
  }

  /**
   * Check if batch should be processed immediately
   */
  shouldProcessBatch(key) {
    const config = this.batchConfigs.get(key);
    const queue = this.batchQueues.get(key);
    
    if (!config || !queue) return false;
    
    // Check batch size limit
    if (queue.items.length >= config.maxBatchSize) {
      return true;
    }
    
    // Check wait time limit
    const waitTime = Date.now() - queue.createdAt;
    if (waitTime >= config.maxWaitTime) {
      return true;
    }
    
    // Check memory usage (simplified check)
    const estimatedMemory = this.estimateMemoryUsage(queue.items);
    if (estimatedMemory >= config.maxMemoryUsage) {
      return true;
    }
    
    // Check for high priority items
    const hasHighPriority = queue.items.some(item => item.priority === 'high');
    if (hasHighPriority && queue.items.length >= 5) {
      return true;
    }
    
    return false;
  }

  /**
   * Process a batch
   */
  async processBatch(key) {
    try {
      const config = this.batchConfigs.get(key);
      const queue = this.batchQueues.get(key);
      
      if (!config || !queue || queue.items.length === 0) {
        return { success: false, reason: 'No items to process' };
      }
      
      // Clear processing timer
      this.clearProcessingTimer(key);
      
      // Extract items from queue
      const itemsToProcess = [...queue.items];
      const batchSize = itemsToProcess.length;
      const waitTime = Date.now() - queue.createdAt;
      
      // Reset queue
      queue.items = [];
      queue.createdAt = Date.now();
      
      const startTime = Date.now();
      
      try {
        // Process the batch
        const result = await this.executeBatchProcessor(config, itemsToProcess);
        
        const processingTime = Date.now() - startTime;
        
        // Record metrics
        this.observability.incrementCounter('batch_operations_total', {
          module: config.module,
          operation_type: config.operationType,
          status: 'success'
        });
        
        this.observability.observeHistogram('batch_size_histogram', batchSize, {
          module: config.module,
          operation_type: config.operationType
        });
        
        this.observability.observeHistogram('batch_wait_time_seconds', waitTime / 1000, {
          module: config.module,
          operation_type: config.operationType
        });
        
        this.observability.observeHistogram('batch_processing_duration_seconds', processingTime / 1000, {
          module: config.module,
          operation_type: config.operationType
        });
        
        // Calculate cost savings
        const costSavings = this.calculateCostSavings(batchSize);
        this.observability.setGauge('batch_cost_savings_ratio', costSavings, {
          module: config.module,
          operation_type: config.operationType
        });
        
        // Execute callbacks
        await this.executeCallbacks(itemsToProcess, result);
        
        await this.eventBus.publish('q.batch.processed.v1', {
          module: config.module,
          operationType: config.operationType,
          batchSize,
          waitTime,
          processingTime,
          costSavings,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          batchSize,
          waitTime,
          processingTime,
          result,
          costSavings
        };
      } catch (error) {
        // Handle batch processing failure
        await this.handleBatchFailure(key, itemsToProcess, error);
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to process batch: ${error.message}`);
    }
  }  /**

   * Execute batch processor function
   */
  async executeBatchProcessor(config, items) {
    try {
      if (!config.processor) {
        throw new Error('No batch processor configured');
      }
      
      // Extract data from items
      const batchData = items.map(item => item.data);
      
      // Execute the processor function
      const result = await config.processor(batchData, {
        module: config.module,
        operationType: config.operationType,
        batchSize: items.length
      });
      
      return result;
    } catch (error) {
      throw new Error(`Batch processor execution failed: ${error.message}`);
    }
  }

  /**
   * Handle batch processing failure
   */
  async handleBatchFailure(key, items, error) {
    try {
      const config = this.batchConfigs.get(key);
      
      this.observability.incrementCounter('batch_operations_total', {
        module: config.module,
        operation_type: config.operationType,
        status: 'failure'
      });
      
      // Implement retry logic
      for (const item of items) {
        if (!item.retryCount) item.retryCount = 0;
        
        if (item.retryCount < config.retryAttempts) {
          item.retryCount++;
          
          // Add back to queue with delay
          setTimeout(() => {
            this.addToBatch(config.module, config.operationType, item.data, {
              callback: item.callback,
              metadata: { ...item.metadata, retryAttempt: item.retryCount }
            });
          }, config.retryDelay * item.retryCount);
        } else {
          // Max retries exceeded, execute failure callback
          if (item.callback && item.callback.onFailure) {
            await item.callback.onFailure(error, item.data);
          }
        }
      }
      
      await this.eventBus.publish('q.batch.failed.v1', {
        module: config.module,
        operationType: config.operationType,
        batchSize: items.length,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } catch (callbackError) {
      console.error(`Failed to handle batch failure: ${callbackError.message}`);
    }
  }

  /**
   * Execute callbacks for processed items
   */
  async executeCallbacks(items, result) {
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.callback && item.callback.onSuccess) {
          const itemResult = Array.isArray(result) ? result[i] : result;
          await item.callback.onSuccess(itemResult, item.data);
        }
      }
    } catch (error) {
      console.error(`Failed to execute callbacks: ${error.message}`);
    }
  }

  /**
   * Process item immediately (when batching is disabled)
   */
  async processImmediately(module, operationType, item) {
    try {
      // This would call the individual processor function
      // For now, we'll simulate immediate processing
      const result = {
        success: true,
        processed: 1,
        processingTime: Math.random() * 100 + 50,
        timestamp: new Date().toISOString()
      };
      
      this.observability.incrementCounter('batch_operations_total', {
        module,
        operation_type: operationType,
        status: 'immediate'
      });
      
      return result;
    } catch (error) {
      throw new Error(`Failed to process immediately: ${error.message}`);
    }
  }

  /**
   * Set processing timer for max wait time
   */
  setProcessingTimer(key) {
    if (this.processingTimers.has(key)) {
      return; // Timer already set
    }
    
    const config = this.batchConfigs.get(key);
    if (!config) return;
    
    const timer = setTimeout(async () => {
      try {
        await this.processBatch(key);
      } catch (error) {
        console.error(`Timer-triggered batch processing failed: ${error.message}`);
      }
    }, config.maxWaitTime);
    
    this.processingTimers.set(key, timer);
  }

  /**
   * Clear processing timer
   */
  clearProcessingTimer(key) {
    const timer = this.processingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.processingTimers.delete(key);
    }
  }

  // Helper methods
  generateItemId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  estimateMemoryUsage(items) {
    // Simplified memory estimation
    const avgItemSize = 1024; // 1KB per item estimate
    return (items.length * avgItemSize) / (1024 * 1024 * 1024); // Convert to GB
  }

  estimateProcessTime(key) {
    const config = this.batchConfigs.get(key);
    const queue = this.batchQueues.get(key);
    
    if (!config || !queue) return 0;
    
    const waitTime = Date.now() - queue.createdAt;
    const remainingWaitTime = Math.max(0, config.maxWaitTime - waitTime);
    
    return remainingWaitTime;
  }

  calculateCostSavings(batchSize) {
    // Estimate cost savings based on batch size
    // Assumes individual invocations would cost more than batch processing
    if (batchSize <= 1) return 0;
    
    const individualCost = batchSize * 1.0; // 1 unit per individual invocation
    const batchCost = 1.0; // 1 unit for batch invocation
    const savings = (individualCost - batchCost) / individualCost;
    
    return Math.min(0.9, Math.max(0, savings)); // Cap at 90% savings
  }
}