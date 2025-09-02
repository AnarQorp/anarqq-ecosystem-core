/**
 * Unified Storage Integration for Qdrive
 * 
 * Integrates the Qdrive module with the unified storage management service
 * to provide centralized IPFS storage management, deduplication, and optimization.
 */

import { logger } from '../utils/logger.js';

export class UnifiedStorageIntegration {
  constructor(services, config) {
    this.unifiedStorage = services.unifiedStorage;
    this.eventBus = services.eventBus;
    this.config = config;
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing unified storage integration...');
      
      if (!this.unifiedStorage) {
        logger.warn('Unified storage service not available - running in standalone mode');
        return;
      }

      // Subscribe to Qdrive events
      await this.subscribeToQdriveEvents();
      
      this.initialized = true;
      logger.info('Unified storage integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize unified storage integration:', error);
      throw error;
    }
  }

  async subscribeToQdriveEvents() {
    if (!this.eventBus) {
      return;
    }

    const topics = [
      'q.qdrive.file.upload.requested.v1',
      'q.qdrive.file.created.v1',
      'q.qdrive.file.accessed.v1',
      'q.qdrive.file.deleted.v1'
    ];

    for (const topic of topics) {
      await this.eventBus.subscribe(topic, this.handleQdriveEvent.bind(this));
    }

    logger.info(`Subscribed to ${topics.length} Qdrive event topics`);
  }

  async handleQdriveEvent(event) {
    try {
      switch (event.topic) {
        case 'q.qdrive.file.upload.requested.v1':
          await this.handleFileUploadRequest(event);
          break;
        case 'q.qdrive.file.created.v1':
          await this.handleFileCreated(event);
          break;
        case 'q.qdrive.file.accessed.v1':
          await this.handleFileAccessed(event);
          break;
        case 'q.qdrive.file.deleted.v1':
          await this.handleFileDeleted(event);
          break;
      }
    } catch (error) {
      logger.error(`Failed to handle Qdrive event ${event.topic}:`, error);
    }
  }

  async handleFileUploadRequest(event) {
    if (!this.unifiedStorage) return;

    const { fileData, metadata, actor } = event.data;
    
    try {
      // Check storage quota before upload
      const quotaCheck = await this.unifiedStorage.checkStorageQuota(
        actor.squidId, 
        fileData.size
      );

      if (!quotaCheck.withinLimit && !quotaCheck.overage) {
        // Publish quota exceeded event
        await this.eventBus.publish('q.qdrive.upload.quota.exceeded.v1', {
          actor,
          data: {
            requestedSize: fileData.size,
            quotaCheck,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check for content deduplication
      const dedupResult = await this.unifiedStorage.deduplicateContent(
        fileData.buffer, 
        metadata
      );

      if (dedupResult.isDuplicate) {
        // Publish deduplication event
        await this.eventBus.publish('q.qdrive.upload.deduplicated.v1', {
          actor,
          data: {
            originalCid: dedupResult.originalCid,
            spaceSaved: dedupResult.spaceSaved,
            contentHash: dedupResult.contentHash,
            timestamp: new Date().toISOString()
          }
        });

        // Update access pattern for existing content
        await this.unifiedStorage.updateAccessPattern(
          dedupResult.originalCid, 
          'duplicate_upload'
        );

        return;
      }

      // Proceed with upload - add content hash to metadata
      const enhancedMetadata = {
        ...metadata,
        contentHash: dedupResult.contentHash
      };

      // Publish enhanced upload request
      await this.eventBus.publish('q.qdrive.upload.enhanced.v1', {
        actor,
        data: {
          fileData,
          metadata: enhancedMetadata,
          quotaCheck,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to handle file upload request:', error);
    }
  }

  async handleFileCreated(event) {
    if (!this.unifiedStorage) return;

    const { cid, metadata, actor } = event.data;
    
    try {
      // Apply pinning policy based on file characteristics
      const policyResult = await this.unifiedStorage.applyPinningPolicy(cid, metadata);
      
      logger.info(`Applied pinning policy '${policyResult.policy}' to ${cid}`);

      // Update storage usage
      await this.unifiedStorage.updateStorageUsage(actor.squidId, metadata.size);

      // Register content for deduplication if hash is available
      if (metadata.contentHash) {
        await this.unifiedStorage.registerContent(cid, metadata.contentHash, metadata.size);
      }

      // Publish storage management event
      await this.eventBus.publish('q.storage.file.managed.v1', {
        actor,
        data: {
          cid,
          policy: policyResult.policy,
          replicas: policyResult.replicas,
          regions: policyResult.regions,
          storageUsageUpdated: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Failed to handle file created event for ${cid}:`, error);
    }
  }

  async handleFileAccessed(event) {
    if (!this.unifiedStorage) return;

    const { cid, accessType, actor } = event.data;
    
    try {
      // Update access patterns for replication optimization
      await this.unifiedStorage.updateAccessPattern(cid, accessType || 'read');
      
      logger.debug(`Updated access pattern for ${cid}: ${accessType}`);

    } catch (error) {
      logger.error(`Failed to handle file accessed event for ${cid}:`, error);
    }
  }

  async handleFileDeleted(event) {
    if (!this.unifiedStorage) return;

    const { cid, metadata, actor } = event.data;
    
    try {
      // Update storage usage
      await this.unifiedStorage.updateStorageUsage(actor.squidId, -metadata.size);

      // Add to garbage collection queue
      this.unifiedStorage.garbageCollectionQueue.add(cid);

      logger.info(`File ${cid} queued for garbage collection`);

    } catch (error) {
      logger.error(`Failed to handle file deleted event for ${cid}:`, error);
    }
  }

  // Enhanced file upload with unified storage features
  async enhancedFileUpload(fileData, metadata, actor) {
    if (!this.unifiedStorage) {
      throw new Error('Unified storage service not available');
    }

    try {
      // Pre-upload checks
      const quotaCheck = await this.unifiedStorage.checkStorageQuota(
        actor.squidId, 
        fileData.size
      );

      // Handle quota exceeded with overage billing
      if (!quotaCheck.withinLimit) {
        if (quotaCheck.overage && this.config.billing?.overageEnabled) {
          logger.info(`Processing overage billing for ${actor.squidId}: ${quotaCheck.overage.cost} QToken`);
          
          // Publish overage billing event
          await this.eventBus.publish('q.storage.quota.exceeded.v1', {
            actor,
            data: {
              squidId: actor.squidId,
              overage: quotaCheck.overage,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          throw new Error(`Storage quota exceeded. Available: ${quotaCheck.available} bytes, Requested: ${fileData.size} bytes`);
        }
      }

      // Check for deduplication
      const dedupResult = await this.unifiedStorage.deduplicateContent(
        fileData.buffer, 
        metadata
      );

      if (dedupResult.isDuplicate) {
        logger.info(`Duplicate content detected, returning existing CID: ${dedupResult.originalCid}`);
        
        // Update access pattern
        await this.unifiedStorage.updateAccessPattern(
          dedupResult.originalCid, 
          'duplicate_upload'
        );

        return {
          cid: dedupResult.originalCid,
          isDuplicate: true,
          spaceSaved: dedupResult.spaceSaved,
          contentHash: dedupResult.contentHash
        };
      }

      // Proceed with actual upload
      const enhancedMetadata = {
        ...metadata,
        contentHash: dedupResult.contentHash
      };

      return {
        enhancedMetadata,
        quotaCheck,
        isDuplicate: false
      };

    } catch (error) {
      logger.error('Enhanced file upload failed:', error);
      throw error;
    }
  }

  // Get storage analytics for user
  async getStorageAnalytics(squidId) {
    if (!this.unifiedStorage) {
      return null;
    }

    try {
      const quotaInfo = await this.unifiedStorage.checkStorageQuota(squidId, 0);
      const stats = await this.unifiedStorage.getStorageStats();

      return {
        quota: {
          used: quotaInfo.currentUsage,
          limit: quotaInfo.limit,
          available: quotaInfo.available,
          usagePercentage: quotaInfo.usagePercentage,
          warningLevel: quotaInfo.warningLevel
        },
        deduplication: {
          cacheSize: stats.deduplicationCache,
          enabled: this.unifiedStorage.config.deduplication.enabled
        },
        replication: {
          totalFiles: stats.totalFiles,
          policies: stats.pinningPolicies
        },
        garbageCollection: {
          queueSize: stats.garbageCollectionQueue
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to get storage analytics for ${squidId}:`, error);
      return null;
    }
  }

  // Optimize storage for user
  async optimizeUserStorage(squidId, options = {}) {
    if (!this.unifiedStorage) {
      throw new Error('Unified storage service not available');
    }

    try {
      const optimizationResults = {
        garbageCollected: 0,
        spaceSaved: 0,
        replicationOptimized: 0,
        errors: []
      };

      // Run garbage collection if requested
      if (options.garbageCollection !== false) {
        try {
          const gcStats = await this.unifiedStorage.startGarbageCollection();
          optimizationResults.garbageCollected = gcStats.filesDeleted;
          optimizationResults.spaceSaved += gcStats.spaceFree;
        } catch (error) {
          optimizationResults.errors.push(`Garbage collection failed: ${error.message}`);
        }
      }

      // Optimize replication based on access patterns
      if (options.replicationOptimization !== false) {
        try {
          let optimizedCount = 0;
          
          for (const [cid, pattern] of this.unifiedStorage.accessPatterns.entries()) {
            const replicationStatus = this.unifiedStorage.replicationStatus.get(cid);
            
            if (replicationStatus) {
              await this.unifiedStorage.evaluateReplicationAdjustment(cid, pattern);
              optimizedCount++;
            }
          }
          
          optimizationResults.replicationOptimized = optimizedCount;
        } catch (error) {
          optimizationResults.errors.push(`Replication optimization failed: ${error.message}`);
        }
      }

      logger.info(`Storage optimization completed for ${squidId}:`, optimizationResults);
      
      return optimizationResults;

    } catch (error) {
      logger.error(`Failed to optimize storage for ${squidId}:`, error);
      throw error;
    }
  }

  // Health check for unified storage integration
  async healthCheck() {
    const health = {
      status: 'healthy',
      unifiedStorageAvailable: !!this.unifiedStorage,
      initialized: this.initialized,
      features: {
        deduplication: false,
        quotaManagement: false,
        garbageCollection: false,
        backupVerification: false
      },
      timestamp: new Date().toISOString()
    };

    if (this.unifiedStorage) {
      try {
        const stats = await this.unifiedStorage.getStorageStats();
        
        health.features.deduplication = this.unifiedStorage.config.deduplication.enabled;
        health.features.quotaManagement = true;
        health.features.garbageCollection = stats.backgroundProcesses > 0;
        health.features.backupVerification = this.unifiedStorage.config.backup.verificationInterval > 0;
        
        health.stats = {
          totalFiles: stats.totalFiles,
          activeQuotas: stats.totalQuotas,
          backgroundProcesses: stats.backgroundProcesses
        };
        
      } catch (error) {
        health.status = 'degraded';
        health.error = error.message;
      }
    } else {
      health.status = 'limited';
      health.message = 'Running in standalone mode without unified storage features';
    }

    return health;
  }

  async shutdown() {
    logger.info('Shutting down unified storage integration...');
    this.initialized = false;
  }
}

export default UnifiedStorageIntegration;