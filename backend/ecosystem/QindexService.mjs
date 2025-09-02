/**
 * Qindex Service - Decentralized Metadata Indexing
 * 
 * Registers and indexes file metadata for the AnarQ&Q ecosystem.
 * Enables searchability, audit trails, and ecosystem-wide discovery.
 * Extended with module registration capabilities for ecosystem modules.
 */

import crypto from 'crypto';

export class QindexService {
  constructor() {
    this.fileIndex = new Map();
    this.searchIndex = new Map();
    this.auditLog = [];
    
    // Module registration extensions
    this.moduleRegistry = new Map(); // Production modules
    this.sandboxModules = new Map(); // Sandbox/test modules
    this.moduleDependencyGraph = new Map(); // Module dependencies
    this.moduleSignatureCache = new Map(); // Signature verification cache
    this.moduleAccessStats = new Map(); // Module access statistics
    this.moduleAuditLog = []; // Module-specific audit events
  }

  /**
   * Register file in the decentralized index
   * @param {Object} fileData - File metadata to register
   * @returns {Promise<Object>} Registration result
   */
  async registerFile(fileData) {
    try {
      const {
        cid,
        squidId,
        visibility,
        contentType,
        timestamp,
        qonsentProfile,
        storjUrl,
        fileSize,
        originalName,
        encryptionMetadata,
        // Enhanced wallet-specific fields
        transactionId,
        walletAddress,
        identityType,
        operationType,
        transactionAmount,
        transactionToken
      } = fileData;

      // Validate required fields
      this.validateFileData(fileData);

      // Generate unique index ID
      const indexId = this.generateIndexId(cid, squidId);

      // Create comprehensive metadata record
      const indexRecord = {
        indexId,
        cid,
        squidId,
        visibility,
        contentType,
        fileSize: fileSize || 0,
        originalName: originalName || 'unknown',
        storjUrl,
        qonsentProfile: {
          profileId: qonsentProfile?.profileId,
          visibility: qonsentProfile?.visibility,
          encryptionLevel: qonsentProfile?.encryptionLevel
        },
        encryptionMetadata: encryptionMetadata || null,
        // Enhanced wallet-specific metadata
        walletMetadata: transactionId ? {
          transactionId,
          walletAddress,
          identityType,
          operationType,
          transactionAmount,
          transactionToken
        } : null,
        timestamps: {
          uploaded: timestamp || new Date().toISOString(),
          indexed: new Date().toISOString(),
          lastAccessed: null
        },
        access: {
          downloadCount: 0,
          shareCount: 0,
          viewCount: 0
        },
        ecosystem: {
          module: operationType === 'WALLET' ? 'qwallet' : 'qsocial',
          version: '1.0',
          network: 'anarq'
        },
        searchable: this.isSearchable(visibility),
        tags: this.extractTags(originalName, contentType, operationType),
        checksum: this.generateChecksum(fileData)
      };

      // Store in index
      this.fileIndex.set(indexId, indexRecord);

      // Update search index if file is searchable
      if (indexRecord.searchable) {
        await this.updateSearchIndex(indexRecord);
      }

      // Log registration event
      await this.logAuditEvent({
        action: 'file_registered',
        indexId,
        cid,
        squidId,
        timestamp: new Date().toISOString()
      });

      console.log(`[Qindex] Registered file: ${indexId} (CID: ${cid})`);

      return {
        success: true,
        indexId,
        indexRecord,
        searchable: indexRecord.searchable
      };

    } catch (error) {
      console.error('[Qindex] Registration error:', error);
      throw new Error(`File registration failed: ${error.message}`);
    }
  }

  /**
   * Validate file data for registration
   */
  validateFileData(fileData) {
    const required = ['cid', 'squidId', 'visibility', 'contentType'];
    
    for (const field of required) {
      if (!fileData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    const validVisibilities = ['public', 'dao-only', 'private'];
    if (!validVisibilities.includes(fileData.visibility)) {
      throw new Error(`Invalid visibility: ${fileData.visibility}`);
    }
  }

  /**
   * Generate unique index ID
   */
  generateIndexId(cid, squidId) {
    const data = `${cid}:${squidId}:${Date.now()}`;
    return `qindex_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Check if file should be searchable
   */
  isSearchable(visibility) {
    return visibility === 'public' || visibility === 'dao-only';
  }

  /**
   * Extract searchable tags from filename and content type
   */
  extractTags(filename, contentType, operationType) {
    const tags = [];
    
    // Add operation type tags
    if (operationType === 'WALLET') {
      tags.push('wallet', 'transaction', 'financial');
    }
    
    // Add content type category
    if (contentType.startsWith('image/')) tags.push('image', 'media');
    if (contentType.startsWith('video/')) tags.push('video', 'media');
    if (contentType.startsWith('audio/')) tags.push('audio', 'media');
    if (contentType.includes('pdf')) tags.push('document', 'pdf');
    if (contentType.includes('text')) tags.push('text', 'document');
    if (contentType === 'transaction') tags.push('transaction', 'financial');
    if (contentType === 'nft') tags.push('nft', 'token', 'collectible');

    // Extract tags from filename
    if (filename) {
      const nameParts = filename.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(part => part.length > 2);
      
      tags.push(...nameParts.slice(0, 5)); // Limit to 5 filename tags
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Generate checksum for data integrity
   */
  generateChecksum(fileData) {
    const checksumData = JSON.stringify({
      cid: fileData.cid,
      squidId: fileData.squidId,
      contentType: fileData.contentType,
      fileSize: fileData.fileSize
    });
    
    return crypto.createHash('sha256').update(checksumData).digest('hex');
  }

  /**
   * Update search index for searchable files
   */
  async updateSearchIndex(indexRecord) {
    const { indexId, tags, contentType, squidId, originalName } = indexRecord;

    // Index by tags
    tags.forEach(tag => {
      if (!this.searchIndex.has(tag)) {
        this.searchIndex.set(tag, new Set());
      }
      this.searchIndex.get(tag).add(indexId);
    });

    // Index by content type
    const contentCategory = contentType.split('/')[0];
    if (!this.searchIndex.has(contentCategory)) {
      this.searchIndex.set(contentCategory, new Set());
    }
    this.searchIndex.get(contentCategory).add(indexId);

    // Index by owner
    const ownerKey = `owner:${squidId}`;
    if (!this.searchIndex.has(ownerKey)) {
      this.searchIndex.set(ownerKey, new Set());
    }
    this.searchIndex.get(ownerKey).add(indexId);
  }

  /**
   * Search files in the index
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async searchFiles(searchParams) {
    try {
      const {
        query,
        contentType,
        squidId,
        visibility,
        tags,
        limit = 50,
        offset = 0
      } = searchParams;

      let resultIds = new Set();
      let isFirstFilter = true;

      // Search by query (tags)
      if (query) {
        const queryTags = query.toLowerCase().split(/\s+/);
        queryTags.forEach(tag => {
          const tagResults = this.searchIndex.get(tag) || new Set();
          if (isFirstFilter) {
            resultIds = new Set(tagResults);
            isFirstFilter = false;
          } else {
            resultIds = new Set([...resultIds].filter(id => tagResults.has(id)));
          }
        });
      }

      // Filter by content type
      if (contentType) {
        const contentResults = this.searchIndex.get(contentType) || new Set();
        if (isFirstFilter) {
          resultIds = new Set(contentResults);
          isFirstFilter = false;
        } else {
          resultIds = new Set([...resultIds].filter(id => contentResults.has(id)));
        }
      }

      // Filter by owner
      if (squidId) {
        const ownerResults = this.searchIndex.get(`owner:${squidId}`) || new Set();
        if (isFirstFilter) {
          resultIds = new Set(ownerResults);
          isFirstFilter = false;
        } else {
          resultIds = new Set([...resultIds].filter(id => ownerResults.has(id)));
        }
      }

      // If no filters applied, get all searchable files
      if (isFirstFilter) {
        resultIds = new Set(
          Array.from(this.fileIndex.keys())
            .filter(id => this.fileIndex.get(id).searchable)
        );
      }

      // Convert to array and get full records
      let results = Array.from(resultIds)
        .map(id => this.fileIndex.get(id))
        .filter(record => record && record.searchable);

      // Additional filtering
      if (visibility) {
        results = results.filter(record => record.visibility === visibility);
      }

      if (tags && tags.length > 0) {
        results = results.filter(record => 
          tags.some(tag => record.tags.includes(tag))
        );
      }

      // Sort by relevance (most recent first)
      results.sort((a, b) => 
        new Date(b.timestamps.indexed) - new Date(a.timestamps.indexed)
      );

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        results: paginatedResults,
        total: results.length,
        limit,
        offset,
        hasMore: results.length > offset + limit
      };

    } catch (error) {
      console.error('[Qindex] Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get file by index ID
   */
  async getFile(indexId) {
    const record = this.fileIndex.get(indexId);
    if (!record) {
      throw new Error(`File not found in index: ${indexId}`);
    }

    // Update access statistics
    record.access.viewCount++;
    record.timestamps.lastAccessed = new Date().toISOString();

    return record;
  }

  /**
   * Get file by CID
   */
  async getFileByCID(cid) {
    for (const record of this.fileIndex.values()) {
      if (record.cid === cid) {
        // Update access statistics
        record.access.viewCount++;
        record.timestamps.lastAccessed = new Date().toISOString();
        return record;
      }
    }
    
    throw new Error(`File not found with CID: ${cid}`);
  }

  /**
   * Update file access statistics
   */
  async updateAccessStats(indexId, action = 'view') {
    const record = this.fileIndex.get(indexId);
    if (!record) {
      throw new Error(`File not found: ${indexId}`);
    }

    // Update counters
    switch (action) {
      case 'view':
        record.access.viewCount++;
        break;
      case 'download':
        record.access.downloadCount++;
        break;
      case 'share':
        record.access.shareCount++;
        break;
    }

    record.timestamps.lastAccessed = new Date().toISOString();

    // Log access event
    await this.logAuditEvent({
      action: `file_${action}`,
      indexId,
      cid: record.cid,
      squidId: record.squidId,
      timestamp: new Date().toISOString()
    });

    return record.access;
  }

  /**
   * Remove file from index
   */
  async removeFile(indexId, squidId) {
    const record = this.fileIndex.get(indexId);
    if (!record) {
      throw new Error(`File not found: ${indexId}`);
    }

    // Verify ownership
    if (record.squidId !== squidId) {
      throw new Error('Unauthorized: Only file owner can remove from index');
    }

    // Remove from main index
    this.fileIndex.delete(indexId);

    // Remove from search index
    if (record.searchable) {
      record.tags.forEach(tag => {
        const tagSet = this.searchIndex.get(tag);
        if (tagSet) {
          tagSet.delete(indexId);
          if (tagSet.size === 0) {
            this.searchIndex.delete(tag);
          }
        }
      });

      // Remove from content type index
      const contentCategory = record.contentType.split('/')[0];
      const contentSet = this.searchIndex.get(contentCategory);
      if (contentSet) {
        contentSet.delete(indexId);
      }

      // Remove from owner index
      const ownerSet = this.searchIndex.get(`owner:${squidId}`);
      if (ownerSet) {
        ownerSet.delete(indexId);
      }
    }

    // Log removal event
    await this.logAuditEvent({
      action: 'file_removed',
      indexId,
      cid: record.cid,
      squidId,
      timestamp: new Date().toISOString()
    });

    console.log(`[Qindex] Removed file from index: ${indexId}`);
    return true;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event) {
    this.auditLog.push({
      ...event,
      id: crypto.randomUUID(),
      timestamp: event.timestamp || new Date().toISOString()
    });

    // Keep only last 1000 events (in production, this would go to persistent storage)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    const files = Array.from(this.fileIndex.values());
    
    const stats = {
      totalFiles: files.length,
      searchableFiles: files.filter(f => f.searchable).length,
      byVisibility: {},
      byContentType: {},
      byModule: {},
      totalViews: 0,
      totalDownloads: 0,
      totalShares: 0
    };

    files.forEach(file => {
      // Count by visibility
      stats.byVisibility[file.visibility] = (stats.byVisibility[file.visibility] || 0) + 1;
      
      // Count by content type
      const contentCategory = file.contentType.split('/')[0];
      stats.byContentType[contentCategory] = (stats.byContentType[contentCategory] || 0) + 1;
      
      // Count by module
      stats.byModule[file.ecosystem.module] = (stats.byModule[file.ecosystem.module] || 0) + 1;
      
      // Sum access statistics
      stats.totalViews += file.access.viewCount;
      stats.totalDownloads += file.access.downloadCount;
      stats.totalShares += file.access.shareCount;
    });

    return stats;
  }

  /**
   * Register wallet transaction in the index
   * @param {Object} transactionData - Transaction metadata to register
   * @returns {Promise<Object>} Registration result
   */
  async registerTransaction(transactionData) {
    try {
      const {
        transactionId,
        squidId,
        identityType,
        operationType,
        amount,
        token,
        fromAddress,
        toAddress,
        timestamp,
        riskScore,
        metadata = {}
      } = transactionData;

      // Validate required fields
      if (!transactionId || !squidId || !operationType) {
        throw new Error('Required fields missing: transactionId, squidId, operationType');
      }

      // Create transaction index record
      const indexRecord = {
        indexId: this.generateIndexId(transactionId, squidId),
        cid: transactionId, // Use transaction ID as CID for transactions
        squidId,
        visibility: 'private', // Transactions are private by default
        contentType: 'transaction',
        fileSize: 0,
        originalName: `Transaction ${transactionId}`,
        storjUrl: null,
        qonsentProfile: {
          profileId: null,
          visibility: 'private',
          encryptionLevel: 'high'
        },
        encryptionMetadata: null,
        walletMetadata: {
          transactionId,
          walletAddress: fromAddress,
          identityType,
          operationType,
          transactionAmount: amount,
          transactionToken: token,
          toAddress,
          riskScore: riskScore || 0
        },
        timestamps: {
          uploaded: timestamp || new Date().toISOString(),
          indexed: new Date().toISOString(),
          lastAccessed: null
        },
        access: {
          downloadCount: 0,
          shareCount: 0,
          viewCount: 0
        },
        ecosystem: {
          module: 'qwallet',
          version: '1.0',
          network: 'anarq'
        },
        searchable: false, // Transactions are not publicly searchable
        tags: this.extractTags(`Transaction ${transactionId}`, 'transaction', 'WALLET'),
        checksum: this.generateChecksum({ 
          cid: transactionId, 
          squidId, 
          contentType: 'transaction',
          fileSize: 0 
        }),
        metadata
      };

      // Store in index
      this.fileIndex.set(indexRecord.indexId, indexRecord);

      // Log registration event
      await this.logAuditEvent({
        action: 'transaction_indexed',
        indexId: indexRecord.indexId,
        cid: transactionId,
        squidId,
        operationType,
        amount,
        token,
        timestamp: new Date().toISOString()
      });

      console.log(`[Qindex] Indexed transaction: ${transactionId} for ${squidId}`);

      return {
        success: true,
        indexId: indexRecord.indexId,
        transactionId,
        indexed: true
      };

    } catch (error) {
      console.error('[Qindex] Transaction indexing error:', error);
      throw new Error(`Transaction indexing failed: ${error.message}`);
    }
  }

  /**
   * Search wallet transactions for a specific identity
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Transaction search results
   */
  async searchTransactions(searchParams) {
    try {
      const {
        squidId,
        identityType,
        operationType,
        token,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        limit = 50,
        offset = 0
      } = searchParams;

      // Get all transaction records for the identity
      let results = Array.from(this.fileIndex.values())
        .filter(record => 
          record.contentType === 'transaction' && 
          record.squidId === squidId &&
          record.walletMetadata
        );

      // Apply filters
      if (identityType) {
        results = results.filter(record => 
          record.walletMetadata.identityType === identityType
        );
      }

      if (operationType) {
        results = results.filter(record => 
          record.walletMetadata.operationType === operationType
        );
      }

      if (token) {
        results = results.filter(record => 
          record.walletMetadata.transactionToken === token
        );
      }

      if (dateFrom) {
        results = results.filter(record => 
          new Date(record.timestamps.uploaded) >= new Date(dateFrom)
        );
      }

      if (dateTo) {
        results = results.filter(record => 
          new Date(record.timestamps.uploaded) <= new Date(dateTo)
        );
      }

      if (minAmount !== undefined) {
        results = results.filter(record => 
          (record.walletMetadata.transactionAmount || 0) >= minAmount
        );
      }

      if (maxAmount !== undefined) {
        results = results.filter(record => 
          (record.walletMetadata.transactionAmount || 0) <= maxAmount
        );
      }

      // Sort by timestamp (most recent first)
      results.sort((a, b) => 
        new Date(b.timestamps.uploaded) - new Date(a.timestamps.uploaded)
      );

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        results: paginatedResults,
        total: results.length,
        limit,
        offset,
        hasMore: results.length > offset + limit
      };

    } catch (error) {
      console.error('[Qindex] Transaction search error:', error);
      throw new Error(`Transaction search failed: ${error.message}`);
    }
  }

  /**
   * Get transaction analytics for an identity
   * @param {string} squidId - Identity ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Transaction analytics
   */
  async getTransactionAnalytics(squidId, options = {}) {
    try {
      const { 
        period = '30d', // 7d, 30d, 90d, 1y
        groupBy = 'day' // day, week, month
      } = options;

      // Get all transactions for the identity
      const transactions = Array.from(this.fileIndex.values())
        .filter(record => 
          record.contentType === 'transaction' && 
          record.squidId === squidId &&
          record.walletMetadata
        );

      // Calculate period start date
      const now = new Date();
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const startDate = new Date(now.getTime() - (periodDays[period] || 30) * 24 * 60 * 60 * 1000);

      // Filter transactions by period
      const periodTransactions = transactions.filter(record => 
        new Date(record.timestamps.uploaded) >= startDate
      );

      // Calculate analytics
      const analytics = {
        period,
        totalTransactions: periodTransactions.length,
        totalVolume: 0,
        averageAmount: 0,
        byToken: {},
        byOperationType: {},
        byIdentityType: {},
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0
        },
        timeline: []
      };

      // Process each transaction
      periodTransactions.forEach(record => {
        const { walletMetadata } = record;
        const amount = walletMetadata.transactionAmount || 0;
        const token = walletMetadata.transactionToken || 'unknown';
        const operationType = walletMetadata.operationType || 'unknown';
        const identityType = walletMetadata.identityType || 'unknown';
        const riskScore = walletMetadata.riskScore || 0;

        // Update totals
        analytics.totalVolume += amount;

        // Update by token
        analytics.byToken[token] = (analytics.byToken[token] || 0) + amount;

        // Update by operation type
        analytics.byOperationType[operationType] = (analytics.byOperationType[operationType] || 0) + 1;

        // Update by identity type
        analytics.byIdentityType[identityType] = (analytics.byIdentityType[identityType] || 0) + 1;

        // Update risk distribution
        if (riskScore < 0.3) {
          analytics.riskDistribution.low++;
        } else if (riskScore < 0.7) {
          analytics.riskDistribution.medium++;
        } else {
          analytics.riskDistribution.high++;
        }
      });

      // Calculate average
      analytics.averageAmount = analytics.totalTransactions > 0 
        ? analytics.totalVolume / analytics.totalTransactions 
        : 0;

      return analytics;

    } catch (error) {
      console.error('[Qindex] Transaction analytics error:', error);
      throw new Error(`Transaction analytics failed: ${error.message}`);
    }
  }

  /**
   * Register module in the decentralized index
   * @param {string} moduleId - Module identifier
   * @param {Object} signedMetadata - Signed module metadata
   * @param {Object} options - Registration options
   * @returns {Promise<Object>} Registration result
   */
  async registerModule(moduleId, signedMetadata, options = {}) {
    try {
      const { testMode = false, skipDependencyCheck = false, expirationTime } = options;

      // Validate required fields
      this.validateModuleMetadata(signedMetadata);

      // Check if module already exists
      const targetRegistry = testMode ? this.sandboxModules : this.moduleRegistry;
      if (targetRegistry.has(moduleId)) {
        throw new Error(`Module already registered: ${moduleId}`);
      }

      // Verify dependencies if not skipped
      if (!skipDependencyCheck && signedMetadata.metadata.dependencies) {
        const dependencyCheck = await this.checkDependencyCompatibility(
          moduleId, 
          signedMetadata.metadata.dependencies
        );
        if (!dependencyCheck.compatible) {
          throw new Error(`Dependency conflicts: ${dependencyCheck.conflicts.map(c => c.description).join(', ')}`);
        }
      }

      // Generate registration record
      const registrationRecord = {
        moduleId,
        metadata: signedMetadata.metadata,
        signedMetadata,
        registrationInfo: {
          cid: this.generateModuleCID(signedMetadata),
          indexId: this.generateModuleIndexId(moduleId),
          registeredAt: new Date().toISOString(),
          registeredBy: signedMetadata.signer_identity,
          status: signedMetadata.metadata.status,
          verificationStatus: 'UNVERIFIED',
          testMode
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: null,
          dependentModules: []
        }
      };

      // Store in appropriate registry
      targetRegistry.set(moduleId, registrationRecord);

      // Update dependency graph
      if (signedMetadata.metadata.dependencies) {
        this.moduleDependencyGraph.set(moduleId, signedMetadata.metadata.dependencies);
      }

      // Initialize access statistics
      this.moduleAccessStats.set(moduleId, {
        moduleId,
        totalQueries: 0,
        uniqueCallers: new Set(),
        lastAccessed: null,
        averageResponseTime: 0,
        errorCount: 0
      });

      // Log registration event
      await this.logModuleAuditEvent({
        action: 'REGISTERED',
        moduleId,
        actorIdentity: signedMetadata.signer_identity,
        details: {
          version: signedMetadata.metadata.version,
          status: signedMetadata.metadata.status,
          testMode,
          dependencies: signedMetadata.metadata.dependencies || []
        }
      });

      console.log(`[Qindex] Registered module: ${moduleId} (${testMode ? 'sandbox' : 'production'})`);

      return {
        success: true,
        moduleId,
        cid: registrationRecord.registrationInfo.cid,
        indexId: registrationRecord.registrationInfo.indexId,
        timestamp: registrationRecord.registrationInfo.registeredAt
      };

    } catch (error) {
      console.error('[Qindex] Module registration error:', error);
      throw new Error(`Module registration failed: ${error.message}`);
    }
  }

  /**
   * Get module by ID
   * @param {string} moduleId - Module identifier
   * @returns {Promise<Object|null>} Module record or null if not found
   */
  async getModule(moduleId) {
    try {
      // Check production registry first
      let module = this.moduleRegistry.get(moduleId);
      if (!module) {
        // Check sandbox registry
        module = this.sandboxModules.get(moduleId);
      }

      if (!module) {
        return null;
      }

      // Update access statistics
      const stats = this.moduleAccessStats.get(moduleId);
      if (stats) {
        stats.totalQueries++;
        stats.lastAccessed = new Date().toISOString();
      }

      // Log access event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId,
        actorIdentity: 'system',
        details: {
          accessType: 'getModule'
        }
      });

      return module;

    } catch (error) {
      console.error('[Qindex] Get module error:', error);
      throw new Error(`Failed to get module: ${error.message}`);
    }
  }

  /**
   * Search modules in the index
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} Search results
   */
  async searchModules(criteria) {
    try {
      const {
        name,
        type,
        status,
        identityType,
        integration,
        hasCompliance,
        minVersion,
        maxVersion,
        limit = 50,
        offset = 0,
        includeTestMode = false
      } = criteria;

      // Combine production and sandbox modules if requested
      let allModules = Array.from(this.moduleRegistry.values());
      if (includeTestMode) {
        allModules = allModules.concat(Array.from(this.sandboxModules.values()));
      }

      // Apply filters
      let results = allModules;

      if (name) {
        const nameRegex = new RegExp(name, 'i');
        results = results.filter(module => 
          nameRegex.test(module.metadata.module) || 
          nameRegex.test(module.metadata.description)
        );
      }

      if (status) {
        results = results.filter(module => module.metadata.status === status);
      }

      if (identityType) {
        results = results.filter(module => 
          module.metadata.identities_supported.includes(identityType)
        );
      }

      if (integration) {
        results = results.filter(module => 
          module.metadata.integrations.includes(integration)
        );
      }

      if (hasCompliance !== undefined) {
        results = results.filter(module => {
          const compliance = module.metadata.compliance;
          return hasCompliance ? 
            (compliance.audit || compliance.risk_scoring || compliance.privacy_enforced) :
            (!compliance.audit && !compliance.risk_scoring && !compliance.privacy_enforced);
        });
      }

      if (minVersion) {
        results = results.filter(module => 
          this.compareVersions(module.metadata.version, minVersion) >= 0
        );
      }

      if (maxVersion) {
        results = results.filter(module => 
          this.compareVersions(module.metadata.version, maxVersion) <= 0
        );
      }

      // Sort by registration date (most recent first)
      results.sort((a, b) => 
        new Date(b.registrationInfo.registeredAt) - new Date(a.registrationInfo.registeredAt)
      );

      // Apply pagination
      const totalCount = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        modules: paginatedResults,
        totalCount,
        hasMore: totalCount > offset + limit,
        nextCursor: totalCount > offset + limit ? offset + limit : null
      };

    } catch (error) {
      console.error('[Qindex] Module search error:', error);
      throw new Error(`Module search failed: ${error.message}`);
    }
  }

  /**
   * Register module in sandbox mode for testing
   * @param {string} moduleId - Module identifier
   * @param {Object} signedMetadata - Signed module metadata
   * @returns {Promise<Object>} Registration result
   */
  async registerSandboxModule(moduleId, signedMetadata) {
    try {
      // Force testMode to true for sandbox registration
      const options = { testMode: true, skipDependencyCheck: true };
      
      console.log(`[Qindex] Registering sandbox module: ${moduleId}`);
      
      return await this.registerModule(moduleId, signedMetadata, options);

    } catch (error) {
      console.error('[Qindex] Sandbox module registration error:', error);
      throw new Error(`Sandbox module registration failed: ${error.message}`);
    }
  }

  /**
   * List all sandbox modules
   * @returns {Promise<Array>} Array of sandbox modules
   */
  async listSandboxModules() {
    try {
      const sandboxModules = Array.from(this.sandboxModules.values());
      
      // Sort by registration date (most recent first)
      sandboxModules.sort((a, b) => 
        new Date(b.registrationInfo.registeredAt) - new Date(a.registrationInfo.registeredAt)
      );

      console.log(`[Qindex] Listed ${sandboxModules.length} sandbox modules`);
      
      return sandboxModules;

    } catch (error) {
      console.error('[Qindex] List sandbox modules error:', error);
      throw new Error(`Failed to list sandbox modules: ${error.message}`);
    }
  }

  /**
   * Promote a sandbox module to production
   * @param {string} moduleId - Module identifier
   * @returns {Promise<boolean>} Success status
   */
  async promoteSandboxToProduction(moduleId) {
    try {
      console.log(`[Qindex] Promoting sandbox module to production: ${moduleId}`);
      
      // Get module from sandbox registry
      const sandboxModule = this.sandboxModules.get(moduleId);
      if (!sandboxModule) {
        throw new Error(`Sandbox module not found: ${moduleId}`);
      }

      // Check if module already exists in production
      if (this.moduleRegistry.has(moduleId)) {
        throw new Error(`Module already exists in production: ${moduleId}`);
      }

      // Verify module is ready for production
      const verificationResult = await this.verifyModule(moduleId);
      if (verificationResult.status === 'invalid') {
        const errorMessages = verificationResult.issues.map(issue => issue.message);
        throw new Error(`Module failed production verification: ${errorMessages.join(', ')}`);
      }

      // Create production record with updated metadata
      const productionRecord = {
        ...sandboxModule,
        registrationInfo: {
          ...sandboxModule.registrationInfo,
          status: 'PRODUCTION_READY',
          verificationStatus: 'VERIFIED',
          testMode: false,
          promotedAt: new Date().toISOString(),
          promotedFrom: 'sandbox'
        }
      };

      // Update metadata status
      productionRecord.metadata.status = 'PRODUCTION_READY';
      productionRecord.signedMetadata.metadata.status = 'PRODUCTION_READY';

      // Move to production registry
      this.moduleRegistry.set(moduleId, productionRecord);
      
      // Remove from sandbox registry
      this.sandboxModules.delete(moduleId);

      // Update access statistics
      const stats = this.moduleAccessStats.get(moduleId);
      if (stats) {
        stats.lastAccessed = new Date().toISOString();
      }

      // Log promotion event
      await this.logModuleAuditEvent({
        action: 'PROMOTED',
        moduleId,
        actorIdentity: sandboxModule.registrationInfo.registeredBy,
        details: {
          fromSandbox: true,
          toProduction: true,
          previousStatus: sandboxModule.metadata.status,
          newStatus: 'PRODUCTION_READY',
          verificationPassed: true
        }
      });

      console.log(`[Qindex] Successfully promoted module to production: ${moduleId}`);
      
      return true;

    } catch (error) {
      console.error('[Qindex] Module promotion error:', error);
      
      // Log failed promotion
      await this.logModuleAuditEvent({
        action: 'PROMOTION_FAILED',
        moduleId,
        actorIdentity: 'system',
        details: {
          error: error.message,
          fromSandbox: true,
          toProduction: true
        }
      });
      
      throw new Error(`Module promotion failed: ${error.message}`);
    }
  }

  /**
   * Get sandbox module by ID
   * @param {string} moduleId - Module identifier
   * @returns {Promise<Object|null>} Sandbox module record or null
   */
  async getSandboxModule(moduleId) {
    try {
      const module = this.sandboxModules.get(moduleId);
      
      if (!module) {
        return null;
      }

      // Update access statistics
      const stats = this.moduleAccessStats.get(moduleId);
      if (stats) {
        stats.totalQueries++;
        stats.lastAccessed = new Date().toISOString();
      }

      // Log access event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId,
        actorIdentity: 'system',
        details: {
          accessType: 'getSandboxModule',
          sandbox: true
        }
      });

      return module;

    } catch (error) {
      console.error('[Qindex] Get sandbox module error:', error);
      throw new Error(`Failed to get sandbox module: ${error.message}`);
    }
  }

  /**
   * Remove module from sandbox
   * @param {string} moduleId - Module identifier
   * @param {string} actorIdentity - Identity performing the removal
   * @returns {Promise<boolean>} Success status
   */
  async removeSandboxModule(moduleId, actorIdentity) {
    try {
      console.log(`[Qindex] Removing sandbox module: ${moduleId}`);
      
      const sandboxModule = this.sandboxModules.get(moduleId);
      if (!sandboxModule) {
        console.warn(`[Qindex] Sandbox module not found for removal: ${moduleId}`);
        return false;
      }

      // Remove from sandbox registry
      this.sandboxModules.delete(moduleId);

      // Clean up dependency graph
      this.moduleDependencyGraph.delete(moduleId);

      // Clean up access statistics
      this.moduleAccessStats.delete(moduleId);

      // Log removal event
      await this.logModuleAuditEvent({
        action: 'DEREGISTERED',
        moduleId,
        actorIdentity,
        details: {
          sandbox: true,
          version: sandboxModule.metadata.version,
          status: sandboxModule.metadata.status
        }
      });

      console.log(`[Qindex] Successfully removed sandbox module: ${moduleId}`);
      
      return true;

    } catch (error) {
      console.error('[Qindex] Remove sandbox module error:', error);
      throw new Error(`Failed to remove sandbox module: ${error.message}`);
    }
  }

  /**
   * Check if module exists in sandbox
   * @param {string} moduleId - Module identifier
   * @returns {boolean} True if module exists in sandbox
   */
  isSandboxModule(moduleId) {
    return this.sandboxModules.has(moduleId);
  }

  /**
   * Check if module exists in production
   * @param {string} moduleId - Module identifier
   * @returns {boolean} True if module exists in production
   */
  isProductionModule(moduleId) {
    return this.moduleRegistry.has(moduleId);
  }

  /**
   * Get module registry statistics
   * @returns {Object} Registry statistics
   */
  getModuleRegistryStats() {
    const productionModules = Array.from(this.moduleRegistry.values());
    const sandboxModules = Array.from(this.sandboxModules.values());
    
    const stats = {
      production: {
        total: productionModules.length,
        byStatus: {},
        byIdentityType: {},
        totalQueries: 0
      },
      sandbox: {
        total: sandboxModules.length,
        byStatus: {},
        byIdentityType: {},
        totalQueries: 0
      },
      dependencies: {
        totalDependencies: this.moduleDependencyGraph.size,
        averageDependencies: 0
      },
      access: {
        totalModuleQueries: 0,
        uniqueModules: this.moduleAccessStats.size
      }
    };

    // Calculate production stats
    productionModules.forEach(module => {
      const status = module.metadata.status;
      stats.production.byStatus[status] = (stats.production.byStatus[status] || 0) + 1;
      
      module.metadata.identities_supported.forEach(identity => {
        stats.production.byIdentityType[identity] = (stats.production.byIdentityType[identity] || 0) + 1;
      });
      
      stats.production.totalQueries += module.accessStats.queryCount;
    });

    // Calculate sandbox stats
    sandboxModules.forEach(module => {
      const status = module.metadata.status;
      stats.sandbox.byStatus[status] = (stats.sandbox.byStatus[status] || 0) + 1;
      
      module.metadata.identities_supported.forEach(identity => {
        stats.sandbox.byIdentityType[identity] = (stats.sandbox.byIdentityType[identity] || 0) + 1;
      });
      
      stats.sandbox.totalQueries += module.accessStats.queryCount;
    });

    // Calculate dependency stats
    const allDependencies = Array.from(this.moduleDependencyGraph.values());
    const totalDeps = allDependencies.reduce((sum, deps) => sum + deps.length, 0);
    stats.dependencies.averageDependencies = allDependencies.length > 0 ? 
      totalDeps / allDependencies.length : 0;

    // Calculate access stats
    Array.from(this.moduleAccessStats.values()).forEach(stat => {
      stats.access.totalModuleQueries += stat.totalQueries;
    });

    return stats;
  }

  /**
   * Verify module registration and metadata
   * @param {string} moduleId - Module identifier
   * @returns {Promise<Object>} Verification result
   */
  async verifyModule(moduleId) {
    try {
      const module = await this.getModule(moduleId);
      if (!module) {
        return {
          moduleId,
          status: 'invalid',
          verificationChecks: {
            metadataValid: false,
            signatureValid: false,
            dependenciesResolved: false,
            complianceVerified: false,
            auditPassed: false
          },
          issues: [{
            severity: 'ERROR',
            code: 'MODULE_NOT_FOUND',
            message: `Module not found: ${moduleId}`
          }],
          lastVerified: new Date().toISOString(),
          verifiedBy: 'system'
        };
      }

      const verificationChecks = {
        metadataValid: false,
        signatureValid: false,
        dependenciesResolved: false,
        complianceVerified: false,
        auditPassed: false
      };

      const issues = [];

      // Check metadata validity
      try {
        this.validateModuleMetadata(module.signedMetadata);
        verificationChecks.metadataValid = true;
      } catch (error) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_METADATA',
          message: `Metadata validation failed: ${error.message}`
        });
      }

      // Check signature validity (simplified check - in production would verify cryptographic signature)
      if (module.signedMetadata.signature && module.signedMetadata.publicKey) {
        // Check if signature is cached
        const cacheKey = `${moduleId}:${module.signedMetadata.signed_at}`;
        const cachedResult = this.moduleSignatureCache.get(cacheKey);
        
        if (cachedResult) {
          verificationChecks.signatureValid = cachedResult.valid;
          if (!cachedResult.valid) {
            issues.push({
              severity: 'ERROR',
              code: 'INVALID_SIGNATURE',
              message: 'Cached signature verification failed'
            });
          }
        } else {
          // Simulate signature verification (in production, would use actual crypto verification)
          const signatureValid = module.signedMetadata.signature.length > 0 && 
                                module.signedMetadata.publicKey.length > 0;
          verificationChecks.signatureValid = signatureValid;
          
          // Cache result
          this.moduleSignatureCache.set(cacheKey, { valid: signatureValid, timestamp: Date.now() });
          
          if (!signatureValid) {
            issues.push({
              severity: 'ERROR',
              code: 'INVALID_SIGNATURE',
              message: 'Signature verification failed'
            });
          }
        }
      } else {
        issues.push({
          severity: 'ERROR',
          code: 'MISSING_SIGNATURE',
          message: 'Module signature or public key missing'
        });
      }

      // Check dependencies
      if (module.metadata.dependencies && module.metadata.dependencies.length > 0) {
        const dependencyCheck = await this.checkDependencyCompatibility(moduleId, module.metadata.dependencies);
        verificationChecks.dependenciesResolved = dependencyCheck.compatible;
        
        if (!dependencyCheck.compatible) {
          dependencyCheck.conflicts.forEach(conflict => {
            issues.push({
              severity: 'ERROR',
              code: 'DEPENDENCY_CONFLICT',
              message: conflict.description,
              suggestion: conflict.suggestion
            });
          });
        }
      } else {
        verificationChecks.dependenciesResolved = true;
      }

      // Check compliance
      const compliance = module.metadata.compliance;
      if (compliance) {
        verificationChecks.complianceVerified = true;
        
        // Check for compliance warnings
        if (!compliance.audit) {
          issues.push({
            severity: 'WARNING',
            code: 'NO_AUDIT',
            message: 'Module has not passed security audit'
          });
        }
        
        if (!compliance.privacy_enforced) {
          issues.push({
            severity: 'WARNING',
            code: 'NO_PRIVACY_ENFORCEMENT',
            message: 'Module does not enforce privacy controls'
          });
        }
      }

      // Check audit hash
      if (module.metadata.audit_hash) {
        verificationChecks.auditPassed = /^[a-f0-9]{64}$/i.test(module.metadata.audit_hash);
        if (!verificationChecks.auditPassed) {
          issues.push({
            severity: 'ERROR',
            code: 'INVALID_AUDIT_HASH',
            message: 'Audit hash format is invalid'
          });
        }
      }

      // Determine overall status
      const hasErrors = issues.some(issue => issue.severity === 'ERROR');
      const status = hasErrors ? 'invalid' : 
                    module.metadata.status === 'PRODUCTION_READY' ? 'production_ready' :
                    module.metadata.status.toLowerCase();

      // Update module verification status
      module.registrationInfo.verificationStatus = hasErrors ? 'INVALID' : 'VERIFIED';

      // Log verification event
      await this.logModuleAuditEvent({
        action: 'VERIFIED',
        moduleId,
        actorIdentity: 'system',
        details: {
          status,
          issueCount: issues.length,
          errorCount: issues.filter(i => i.severity === 'ERROR').length
        }
      });

      return {
        moduleId,
        status,
        verificationChecks,
        issues,
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      };

    } catch (error) {
      console.error('[Qindex] Module verification error:', error);
      throw new Error(`Module verification failed: ${error.message}`);
    }
  }

  /**
   * Update module metadata
   * @param {string} moduleId - Module identifier
   * @param {Object} updates - Metadata updates
   * @returns {Promise<boolean>} Success status
   */
  async updateModuleMetadata(moduleId, updates) {
    try {
      // Find module in production or sandbox registry
      let module = this.moduleRegistry.get(moduleId);
      let isProduction = true;
      
      if (!module) {
        module = this.sandboxModules.get(moduleId);
        isProduction = false;
      }

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Validate updates
      const allowedFields = [
        'version', 'description', 'status', 'integrations', 
        'dependencies', 'documentation', 'changelog'
      ];
      
      const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid update fields: ${invalidFields.join(', ')}`);
      }

      // Apply updates to metadata
      const oldMetadata = { ...module.metadata };
      Object.assign(module.metadata, updates);

      // Update timestamps
      module.metadata.timestamp = Date.now();
      module.registrationInfo.verificationStatus = 'UNVERIFIED'; // Require re-verification

      // Update dependency graph if dependencies changed
      if (updates.dependencies) {
        this.moduleDependencyGraph.set(moduleId, updates.dependencies);
      }

      // Log update event
      await this.logModuleAuditEvent({
        action: 'UPDATED',
        moduleId,
        actorIdentity: 'system',
        details: {
          updatedFields: Object.keys(updates),
          oldVersion: oldMetadata.version,
          newVersion: module.metadata.version,
          isProduction
        }
      });

      console.log(`[Qindex] Updated module: ${moduleId}`);
      return true;

    } catch (error) {
      console.error('[Qindex] Module update error:', error);
      throw new Error(`Module update failed: ${error.message}`);
    }
  }

  /**
   * Deregister module from index
   * @param {string} moduleId - Module identifier
   * @returns {Promise<boolean>} Success status
   */
  async deregisterModule(moduleId) {
    try {
      // Find and remove from appropriate registry
      let removed = false;
      let isProduction = false;

      if (this.moduleRegistry.has(moduleId)) {
        this.moduleRegistry.delete(moduleId);
        removed = true;
        isProduction = true;
      } else if (this.sandboxModules.has(moduleId)) {
        this.sandboxModules.delete(moduleId);
        removed = true;
      }

      if (!removed) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Clean up related data
      this.moduleDependencyGraph.delete(moduleId);
      this.moduleAccessStats.delete(moduleId);
      
      // Clear signature cache entries for this module
      for (const [key] of this.moduleSignatureCache) {
        if (key.startsWith(`${moduleId}:`)) {
          this.moduleSignatureCache.delete(key);
        }
      }

      // Log deregistration event
      await this.logModuleAuditEvent({
        action: 'DEREGISTERED',
        moduleId,
        actorIdentity: 'system',
        details: {
          isProduction,
          reason: 'Manual deregistration'
        }
      });

      console.log(`[Qindex] Deregistered module: ${moduleId}`);
      return true;

    } catch (error) {
      console.error('[Qindex] Module deregistration error:', error);
      throw new Error(`Module deregistration failed: ${error.message}`);
    }
  }

  /**
   * Get module dependencies
   * @param {string} moduleId - Module identifier
   * @returns {Promise<string[]>} List of dependency module IDs
   */
  async getModuleDependencies(moduleId) {
    return this.moduleDependencyGraph.get(moduleId) || [];
  }

  /**
   * Check dependency compatibility
   * @param {string} moduleId - Module identifier
   * @param {string[]} dependencies - List of dependency module IDs
   * @returns {Promise<Object>} Compatibility result
   */
  async checkDependencyCompatibility(moduleId, dependencies) {
    try {
      const result = {
        compatible: true,
        conflicts: [],
        missingDependencies: [],
        versionMismatches: []
      };

      // Check for circular dependencies
      const visited = new Set();
      const recursionStack = new Set();
      
      const hasCircularDependency = (currentModule, targetModule) => {
        if (recursionStack.has(currentModule)) {
          return true;
        }
        if (visited.has(currentModule)) {
          return false;
        }

        visited.add(currentModule);
        recursionStack.add(currentModule);

        const deps = this.moduleDependencyGraph.get(currentModule) || [];
        for (const dep of deps) {
          if (dep === targetModule || hasCircularDependency(dep, targetModule)) {
            return true;
          }
        }

        recursionStack.delete(currentModule);
        return false;
      };

      // Check each dependency
      for (const depId of dependencies) {
        // Check if dependency exists
        const depModule = await this.getModule(depId);
        if (!depModule) {
          result.missingDependencies.push(depId);
          result.compatible = false;
          continue;
        }

        // Check for circular dependency
        if (hasCircularDependency(depId, moduleId)) {
          result.conflicts.push({
            moduleId: depId,
            conflictType: 'CIRCULAR',
            description: `Circular dependency detected between ${moduleId} and ${depId}`,
            suggestion: 'Remove circular dependency or restructure module dependencies'
          });
          result.compatible = false;
        }

        // Check version compatibility (simplified - in production would use semver)
        if (depModule.metadata.status === 'DEPRECATED') {
          result.conflicts.push({
            moduleId: depId,
            conflictType: 'INCOMPATIBLE',
            description: `Dependency ${depId} is deprecated`,
            suggestion: 'Update to use a non-deprecated version or find alternative'
          });
          result.compatible = false;
        }
      }

      return result;

    } catch (error) {
      console.error('[Qindex] Dependency check error:', error);
      throw new Error(`Dependency compatibility check failed: ${error.message}`);
    }
  }

  /**
   * Register module in sandbox mode
   * @param {string} moduleId - Module identifier
   * @param {Object} signedMetadata - Signed module metadata
   * @returns {Promise<Object>} Registration result
   */
  async registerSandboxModule(moduleId, signedMetadata) {
    return this.registerModule(moduleId, signedMetadata, { testMode: true });
  }

  /**
   * List sandbox modules
   * @returns {Promise<Object[]>} List of sandbox modules
   */
  async listSandboxModules() {
    return Array.from(this.sandboxModules.values());
  }

  /**
   * Promote sandbox module to production
   * @param {string} moduleId - Module identifier
   * @returns {Promise<boolean>} Success status
   */
  async promoteSandboxModule(moduleId) {
    try {
      const sandboxModule = this.sandboxModules.get(moduleId);
      if (!sandboxModule) {
        throw new Error(`Sandbox module not found: ${moduleId}`);
      }

      // Verify module before promotion
      const verification = await this.verifyModule(moduleId);
      if (verification.status === 'invalid') {
        throw new Error(`Cannot promote invalid module: ${verification.issues.map(i => i.message).join(', ')}`);
      }

      // Check if production module already exists
      if (this.moduleRegistry.has(moduleId)) {
        throw new Error(`Production module already exists: ${moduleId}`);
      }

      // Move from sandbox to production
      const productionModule = {
        ...sandboxModule,
        registrationInfo: {
          ...sandboxModule.registrationInfo,
          testMode: false,
          registeredAt: new Date().toISOString() // Update registration time for production
        }
      };

      this.moduleRegistry.set(moduleId, productionModule);
      this.sandboxModules.delete(moduleId);

      // Log promotion event
      await this.logModuleAuditEvent({
        action: 'PROMOTED',
        moduleId,
        actorIdentity: 'system',
        details: {
          fromSandbox: true,
          verificationStatus: verification.status
        }
      });

      console.log(`[Qindex] Promoted module to production: ${moduleId}`);
      return true;

    } catch (error) {
      console.error('[Qindex] Module promotion error:', error);
      throw new Error(`Module promotion failed: ${error.message}`);
    }
  }

  // Helper methods for module registration

  /**
   * Validate module metadata structure
   */
  validateModuleMetadata(signedMetadata) {
    if (!signedMetadata || !signedMetadata.metadata) {
      throw new Error('Missing signed metadata or metadata object');
    }

    const metadata = signedMetadata.metadata;
    const required = [
      'module', 'version', 'description', 'identities_supported', 
      'integrations', 'status', 'audit_hash', 'repository', 
      'documentation', 'activated_by', 'timestamp', 'checksum',
      'signature_algorithm', 'public_key_id'
    ];

    for (const field of required) {
      if (metadata[field] === undefined || metadata[field] === null) {
        throw new Error(`Required metadata field missing: ${field}`);
      }
    }

    // Validate specific field formats
    if (!Array.isArray(metadata.identities_supported) || metadata.identities_supported.length === 0) {
      throw new Error('identities_supported must be a non-empty array');
    }

    if (!Array.isArray(metadata.integrations)) {
      throw new Error('integrations must be an array');
    }

    const validStatuses = ['DEVELOPMENT', 'TESTING', 'PRODUCTION_READY', 'DEPRECATED', 'SUSPENDED'];
    if (!validStatuses.includes(metadata.status)) {
      throw new Error(`Invalid status: ${metadata.status}`);
    }

    // Validate signature metadata
    if (!signedMetadata.signature || !signedMetadata.publicKey || !signedMetadata.signer_identity) {
      throw new Error('Missing signature, publicKey, or signer_identity in signed metadata');
    }
  }

  /**
   * Generate module CID for IPFS storage
   */
  generateModuleCID(signedMetadata) {
    const data = JSON.stringify(signedMetadata);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `Qm${hash.substring(0, 44)}`; // Simplified CID format
  }

  /**
   * Generate module index ID
   */
  generateModuleIndexId(moduleId) {
    const data = `module:${moduleId}:${Date.now()}`;
    return `qmodule_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Compare semantic versions (simplified)
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Log module-specific audit event
   */
  async logModuleAuditEvent(event) {
    const auditEvent = {
      eventId: crypto.randomUUID(),
      moduleId: event.moduleId,
      action: event.action,
      actorIdentity: event.actorIdentity,
      timestamp: new Date().toISOString(),
      details: event.details || {},
      signature: event.signature
    };

    this.moduleAuditLog.push(auditEvent);

    // Keep only last 1000 module events
    if (this.moduleAuditLog.length > 1000) {
      this.moduleAuditLog = this.moduleAuditLog.slice(-1000);
    }

    // Also log to main audit log
    await this.logAuditEvent({
      action: `module_${event.action.toLowerCase()}`,
      moduleId: event.moduleId,
      actorIdentity: event.actorIdentity,
      details: event.details,
      timestamp: auditEvent.timestamp
    });
  }

  /**
   * Get module audit log
   */
  async getModuleAuditLog(moduleId = null, limit = 100, offset = 0) {
    let events = this.moduleAuditLog;
    
    if (moduleId) {
      events = events.filter(event => event.moduleId === moduleId);
    }
    
    const sortedEvents = events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);

    return {
      events: sortedEvents,
      total: events.length,
      limit,
      offset
    };
  }

  /**
   * Get modules by type/category
   * @param {string} type - Module type or category
   * @param {Object} options - Additional filtering options
   * @returns {Promise<Object>} Filtered modules by type
   */
  async getModulesByType(type, options = {}) {
    try {
      const { 
        includeTestMode = false, 
        status, 
        limit = 50, 
        offset = 0,
        sortBy = 'registeredAt',
        sortOrder = 'desc'
      } = options;

      // Get modules from appropriate registries
      let allModules = Array.from(this.moduleRegistry.values());
      if (includeTestMode) {
        allModules = allModules.concat(Array.from(this.sandboxModules.values()));
      }

      // Filter by type - check module name, integrations, and tags
      let results = allModules.filter(module => {
        const metadata = module.metadata;
        const typeMatch = 
          metadata.module.toLowerCase().includes(type.toLowerCase()) ||
          metadata.integrations.some(integration => 
            integration.toLowerCase().includes(type.toLowerCase())
          ) ||
          metadata.description.toLowerCase().includes(type.toLowerCase());
        
        return typeMatch;
      });

      // Apply status filter if provided
      if (status) {
        results = results.filter(module => module.metadata.status === status);
      }

      // Sort results
      results.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.metadata.module;
            bValue = b.metadata.module;
            break;
          case 'version':
            return this.compareVersions(
              sortOrder === 'desc' ? b.metadata.version : a.metadata.version,
              sortOrder === 'desc' ? a.metadata.version : b.metadata.version
            );
          case 'queryCount':
            aValue = a.accessStats.queryCount;
            bValue = b.accessStats.queryCount;
            break;
          case 'registeredAt':
          default:
            aValue = new Date(a.registrationInfo.registeredAt);
            bValue = new Date(b.registrationInfo.registeredAt);
            break;
        }

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      // Apply pagination
      const totalCount = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      // Update access statistics for returned modules
      paginatedResults.forEach(module => {
        const stats = this.moduleAccessStats.get(module.moduleId);
        if (stats) {
          stats.totalQueries++;
          stats.lastAccessed = new Date().toISOString();
        }
      });

      // Log search event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId: 'multiple',
        actorIdentity: 'system',
        details: {
          searchType: 'getModulesByType',
          type,
          resultCount: paginatedResults.length,
          includeTestMode
        }
      });

      return {
        type,
        modules: paginatedResults,
        totalCount,
        hasMore: totalCount > offset + limit,
        nextOffset: totalCount > offset + limit ? offset + limit : null,
        searchMetadata: {
          type,
          status,
          includeTestMode,
          sortBy,
          sortOrder
        }
      };

    } catch (error) {
      console.error('[Qindex] Get modules by type error:', error);
      throw new Error(`Failed to get modules by type: ${error.message}`);
    }
  }

  /**
   * Get modules for a specific identity type
   * @param {string} identityType - Identity type to filter by
   * @param {Object} options - Additional filtering options
   * @returns {Promise<Object>} Modules supporting the identity type
   */
  async getModulesForIdentity(identityType, options = {}) {
    try {
      const { 
        includeTestMode = false, 
        status, 
        integration,
        hasCompliance,
        limit = 50, 
        offset = 0,
        sortBy = 'queryCount',
        sortOrder = 'desc'
      } = options;

      // Get modules from appropriate registries
      let allModules = Array.from(this.moduleRegistry.values());
      if (includeTestMode) {
        allModules = allModules.concat(Array.from(this.sandboxModules.values()));
      }

      // Filter by identity type support
      let results = allModules.filter(module => 
        module.metadata.identities_supported.includes(identityType)
      );

      // Apply additional filters
      if (status) {
        results = results.filter(module => module.metadata.status === status);
      }

      if (integration) {
        results = results.filter(module => 
          module.metadata.integrations.includes(integration)
        );
      }

      if (hasCompliance !== undefined) {
        results = results.filter(module => {
          const compliance = module.metadata.compliance;
          return hasCompliance ? 
            (compliance.audit || compliance.risk_scoring || compliance.privacy_enforced) :
            (!compliance.audit && !compliance.risk_scoring && !compliance.privacy_enforced);
        });
      }

      // Sort results
      results.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.metadata.module;
            bValue = b.metadata.module;
            break;
          case 'version':
            return this.compareVersions(
              sortOrder === 'desc' ? b.metadata.version : a.metadata.version,
              sortOrder === 'desc' ? a.metadata.version : b.metadata.version
            );
          case 'queryCount':
            aValue = a.accessStats.queryCount;
            bValue = b.accessStats.queryCount;
            break;
          case 'registeredAt':
            aValue = new Date(a.registrationInfo.registeredAt);
            bValue = new Date(b.registrationInfo.registeredAt);
            break;
          case 'compliance':
            const aCompliance = Object.values(a.metadata.compliance).filter(Boolean).length;
            const bCompliance = Object.values(b.metadata.compliance).filter(Boolean).length;
            aValue = aCompliance;
            bValue = bCompliance;
            break;
          default:
            aValue = new Date(a.registrationInfo.registeredAt);
            bValue = new Date(b.registrationInfo.registeredAt);
            break;
        }

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      // Apply pagination
      const totalCount = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      // Update access statistics for returned modules
      paginatedResults.forEach(module => {
        const stats = this.moduleAccessStats.get(module.moduleId);
        if (stats) {
          stats.totalQueries++;
          stats.lastAccessed = new Date().toISOString();
          stats.uniqueCallers.add(identityType); // Track identity type as caller
        }
      });

      // Log search event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId: 'multiple',
        actorIdentity: identityType,
        details: {
          searchType: 'getModulesForIdentity',
          identityType,
          resultCount: paginatedResults.length,
          filters: { status, integration, hasCompliance }
        }
      });

      return {
        identityType,
        modules: paginatedResults,
        totalCount,
        hasMore: totalCount > offset + limit,
        nextOffset: totalCount > offset + limit ? offset + limit : null,
        searchMetadata: {
          identityType,
          status,
          integration,
          hasCompliance,
          includeTestMode,
          sortBy,
          sortOrder
        }
      };

    } catch (error) {
      console.error('[Qindex] Get modules for identity error:', error);
      throw new Error(`Failed to get modules for identity: ${error.message}`);
    }
  }

  /**
   * Enhanced module search with advanced filtering and sorting
   * @param {Object} criteria - Enhanced search criteria
   * @returns {Promise<Object>} Enhanced search results
   */
  async searchModulesAdvanced(criteria) {
    try {
      const {
        query,                    // Text search in name/description
        name,                     // Exact name match
        type,                     // Module type/category
        status,                   // Module status
        identityType,             // Supported identity type
        integration,              // Required integration
        hasCompliance,            // Compliance requirements
        minVersion,               // Minimum version
        maxVersion,               // Maximum version
        registeredAfter,          // Registered after date
        registeredBefore,         // Registered before date
        hasDocumentation,         // Has documentation
        auditPassed,              // Passed security audit
        includeTestMode = false,  // Include sandbox modules
        limit = 50,
        offset = 0,
        sortBy = 'relevance',     // relevance, name, version, registeredAt, queryCount
        sortOrder = 'desc',       // desc, asc
        facets = false            // Return faceted results
      } = criteria;

      // Get modules from appropriate registries
      let allModules = Array.from(this.moduleRegistry.values());
      if (includeTestMode) {
        allModules = allModules.concat(Array.from(this.sandboxModules.values()));
      }

      let results = allModules;
      let relevanceScores = new Map(); // For relevance scoring

      // Text search with relevance scoring
      if (query) {
        const queryLower = query.toLowerCase();
        results = results.filter(module => {
          const metadata = module.metadata;
          let score = 0;
          
          // Name match (highest weight)
          if (metadata.module.toLowerCase().includes(queryLower)) {
            score += 10;
            if (metadata.module.toLowerCase() === queryLower) score += 20;
          }
          
          // Description match
          if (metadata.description.toLowerCase().includes(queryLower)) {
            score += 5;
          }
          
          // Integration match
          if (metadata.integrations.some(int => int.toLowerCase().includes(queryLower))) {
            score += 3;
          }
          
          // Repository match
          if (metadata.repository.toLowerCase().includes(queryLower)) {
            score += 2;
          }

          if (score > 0) {
            relevanceScores.set(module.moduleId, score);
            return true;
          }
          return false;
        });
      }

      // Apply filters
      if (name) {
        const nameRegex = new RegExp(name, 'i');
        results = results.filter(module => nameRegex.test(module.metadata.module));
      }

      if (type) {
        results = results.filter(module => {
          const metadata = module.metadata;
          return metadata.module.toLowerCase().includes(type.toLowerCase()) ||
                 metadata.integrations.some(int => int.toLowerCase().includes(type.toLowerCase()));
        });
      }

      if (status) {
        results = results.filter(module => module.metadata.status === status);
      }

      if (identityType) {
        results = results.filter(module => 
          module.metadata.identities_supported.includes(identityType)
        );
      }

      if (integration) {
        results = results.filter(module => 
          module.metadata.integrations.includes(integration)
        );
      }

      if (hasCompliance !== undefined) {
        results = results.filter(module => {
          const compliance = module.metadata.compliance;
          return hasCompliance ? 
            (compliance.audit || compliance.risk_scoring || compliance.privacy_enforced) :
            (!compliance.audit && !compliance.risk_scoring && !compliance.privacy_enforced);
        });
      }

      if (minVersion) {
        results = results.filter(module => 
          this.compareVersions(module.metadata.version, minVersion) >= 0
        );
      }

      if (maxVersion) {
        results = results.filter(module => 
          this.compareVersions(module.metadata.version, maxVersion) <= 0
        );
      }

      if (registeredAfter) {
        const afterDate = new Date(registeredAfter);
        results = results.filter(module => 
          new Date(module.registrationInfo.registeredAt) >= afterDate
        );
      }

      if (registeredBefore) {
        const beforeDate = new Date(registeredBefore);
        results = results.filter(module => 
          new Date(module.registrationInfo.registeredAt) <= beforeDate
        );
      }

      if (hasDocumentation !== undefined) {
        results = results.filter(module => {
          const hasDoc = module.metadata.documentation && 
                        module.metadata.documentation.length > 0 &&
                        module.metadata.documentation !== 'none';
          return hasDocumentation ? hasDoc : !hasDoc;
        });
      }

      if (auditPassed !== undefined) {
        results = results.filter(module => 
          module.metadata.compliance.audit === auditPassed
        );
      }

      // Sort results
      results.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'relevance':
            if (query) {
              aValue = relevanceScores.get(a.moduleId) || 0;
              bValue = relevanceScores.get(b.moduleId) || 0;
            } else {
              // Fallback to query count for relevance
              aValue = a.accessStats.queryCount;
              bValue = b.accessStats.queryCount;
            }
            break;
          case 'name':
            aValue = a.metadata.module.toLowerCase();
            bValue = b.metadata.module.toLowerCase();
            break;
          case 'version':
            return this.compareVersions(
              sortOrder === 'desc' ? b.metadata.version : a.metadata.version,
              sortOrder === 'desc' ? a.metadata.version : b.metadata.version
            );
          case 'queryCount':
            aValue = a.accessStats.queryCount;
            bValue = b.accessStats.queryCount;
            break;
          case 'registeredAt':
            aValue = new Date(a.registrationInfo.registeredAt);
            bValue = new Date(b.registrationInfo.registeredAt);
            break;
          default:
            aValue = new Date(a.registrationInfo.registeredAt);
            bValue = new Date(b.registrationInfo.registeredAt);
            break;
        }

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      // Calculate facets if requested
      let facetData = null;
      if (facets) {
        facetData = this.calculateSearchFacets(results);
      }

      // Apply pagination
      const totalCount = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      // Update access statistics
      paginatedResults.forEach(module => {
        const stats = this.moduleAccessStats.get(module.moduleId);
        if (stats) {
          stats.totalQueries++;
          stats.lastAccessed = new Date().toISOString();
        }
      });

      // Log search event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId: 'multiple',
        actorIdentity: 'system',
        details: {
          searchType: 'searchModulesAdvanced',
          query,
          resultCount: paginatedResults.length,
          filters: { name, type, status, identityType, integration, hasCompliance }
        }
      });

      return {
        modules: paginatedResults,
        totalCount,
        hasMore: totalCount > offset + limit,
        nextOffset: totalCount > offset + limit ? offset + limit : null,
        facets: facetData,
        searchMetadata: {
          query,
          appliedFilters: {
            name, type, status, identityType, integration, hasCompliance,
            minVersion, maxVersion, registeredAfter, registeredBefore,
            hasDocumentation, auditPassed
          },
          sortBy,
          sortOrder,
          includeTestMode
        }
      };

    } catch (error) {
      console.error('[Qindex] Advanced module search error:', error);
      throw new Error(`Advanced module search failed: ${error.message}`);
    }
  }

  /**
   * Calculate search facets for filtering
   * @param {Array} modules - Modules to calculate facets from
   * @returns {Object} Facet data
   */
  calculateSearchFacets(modules) {
    const facets = {
      status: {},
      identityTypes: {},
      integrations: {},
      compliance: {
        audit: 0,
        risk_scoring: 0,
        privacy_enforced: 0,
        kyc_support: 0,
        gdpr_compliant: 0
      },
      versions: {},
      registrationPeriod: {
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
        older: 0
      }
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    modules.forEach(module => {
      const metadata = module.metadata;
      const registeredAt = new Date(module.registrationInfo.registeredAt);

      // Status facets
      facets.status[metadata.status] = (facets.status[metadata.status] || 0) + 1;

      // Identity type facets
      metadata.identities_supported.forEach(identity => {
        facets.identityTypes[identity] = (facets.identityTypes[identity] || 0) + 1;
      });

      // Integration facets
      metadata.integrations.forEach(integration => {
        facets.integrations[integration] = (facets.integrations[integration] || 0) + 1;
      });

      // Compliance facets
      Object.keys(facets.compliance).forEach(complianceKey => {
        if (metadata.compliance[complianceKey]) {
          facets.compliance[complianceKey]++;
        }
      });

      // Version facets (major version)
      const majorVersion = metadata.version.split('.')[0];
      facets.versions[`v${majorVersion}.x`] = (facets.versions[`v${majorVersion}.x`] || 0) + 1;

      // Registration period facets
      if (registeredAt >= sevenDaysAgo) {
        facets.registrationPeriod.last7Days++;
      } else if (registeredAt >= thirtyDaysAgo) {
        facets.registrationPeriod.last30Days++;
      } else if (registeredAt >= ninetyDaysAgo) {
        facets.registrationPeriod.last90Days++;
      } else {
        facets.registrationPeriod.older++;
      }
    });

    return facets;
  }

  /**
   * Enhanced dependency resolution with compatibility checking
   * @param {string} moduleId - Module identifier
   * @param {string[]} dependencies - List of dependency module IDs
   * @returns {Promise<Object>} Enhanced compatibility result
   */
  async checkDependencyCompatibilityAdvanced(moduleId, dependencies) {
    try {
      const result = {
        compatible: true,
        conflicts: [],
        missingDependencies: [],
        versionMismatches: [],
        dependencyTree: {},
        circularDependencies: [],
        recommendations: []
      };

      // Build dependency tree
      const buildDependencyTree = async (currentModuleId, visited = new Set(), depth = 0) => {
        if (depth > 10) { // Prevent infinite recursion
          return { error: 'Maximum dependency depth exceeded' };
        }

        if (visited.has(currentModuleId)) {
          return { circular: true, path: Array.from(visited) };
        }

        const module = await this.getModule(currentModuleId);
        if (!module) {
          return { missing: true };
        }

        visited.add(currentModuleId);
        const tree = {
          moduleId: currentModuleId,
          version: module.metadata.version,
          status: module.metadata.status,
          dependencies: {}
        };

        const moduleDeps = module.metadata.dependencies || [];
        for (const depId of moduleDeps) {
          tree.dependencies[depId] = await buildDependencyTree(depId, new Set(visited), depth + 1);
        }

        visited.delete(currentModuleId);
        return tree;
      };

      // Check each dependency
      for (const depId of dependencies) {
        const depModule = await this.getModule(depId);
        
        if (!depModule) {
          result.missingDependencies.push(depId);
          result.compatible = false;
          result.recommendations.push({
            type: 'MISSING_DEPENDENCY',
            moduleId: depId,
            suggestion: `Register module ${depId} before registering ${moduleId}`
          });
          continue;
        }

        // Build dependency tree for this dependency
        const depTree = await buildDependencyTree(depId);
        result.dependencyTree[depId] = depTree;

        // Check for circular dependencies
        if (depTree.circular) {
          result.circularDependencies.push({
            moduleId: depId,
            path: depTree.path,
            description: `Circular dependency detected: ${depTree.path.join(' -> ')} -> ${depId}`
          });
          result.compatible = false;
          result.recommendations.push({
            type: 'CIRCULAR_DEPENDENCY',
            moduleId: depId,
            suggestion: 'Restructure dependencies to remove circular references'
          });
        }

        // Check version compatibility
        if (depModule.metadata.status === 'DEPRECATED') {
          result.conflicts.push({
            moduleId: depId,
            conflictType: 'DEPRECATED',
            description: `Dependency ${depId} is deprecated`,
            suggestion: 'Update to use a non-deprecated version'
          });
          result.compatible = false;
        }

        if (depModule.metadata.status === 'SUSPENDED') {
          result.conflicts.push({
            moduleId: depId,
            conflictType: 'SUSPENDED',
            description: `Dependency ${depId} is suspended`,
            suggestion: 'Find an alternative module or wait for suspension to be lifted'
          });
          result.compatible = false;
        }

        // Check compliance compatibility
        const currentModule = await this.getModule(moduleId);
        if (currentModule && currentModule.metadata.compliance.gdpr_compliant && 
            !depModule.metadata.compliance.gdpr_compliant) {
          result.recommendations.push({
            type: 'COMPLIANCE_WARNING',
            moduleId: depId,
            suggestion: `Dependency ${depId} is not GDPR compliant while ${moduleId} requires GDPR compliance`
          });
        }
      }

      // Generate additional recommendations
      if (result.compatible) {
        result.recommendations.push({
          type: 'SUCCESS',
          suggestion: 'All dependencies are compatible and available'
        });
      }

      return result;

    } catch (error) {
      console.error('[Qindex] Advanced dependency check error:', error);
      throw new Error(`Advanced dependency compatibility check failed: ${error.message}`);
    }
  }

  /**
   * Get module access statistics and analytics
   * @param {string} moduleId - Module identifier (optional, if not provided returns all stats)
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Module access statistics
   */
  async getModuleAccessStats(moduleId = null, options = {}) {
    try {
      const { 
        period = '30d',           // 7d, 30d, 90d, 1y, all
        groupBy = 'day',          // hour, day, week, month
        includeDetails = false    // Include detailed access logs
      } = options;

      if (moduleId) {
        // Get stats for specific module
        const stats = this.moduleAccessStats.get(moduleId);
        if (!stats) {
          throw new Error(`Module not found: ${moduleId}`);
        }

        const module = await this.getModule(moduleId);
        if (!module) {
          throw new Error(`Module not found: ${moduleId}`);
        }

        // Calculate period-specific stats
        const periodStats = this.calculatePeriodStats(moduleId, period, groupBy);

        const result = {
          moduleId,
          moduleName: module.metadata.module,
          version: module.metadata.version,
          status: module.metadata.status,
          totalQueries: stats.totalQueries,
          uniqueCallers: stats.uniqueCallers.size,
          lastAccessed: stats.lastAccessed,
          averageResponseTime: stats.averageResponseTime,
          errorCount: stats.errorCount,
          errorRate: stats.totalQueries > 0 ? (stats.errorCount / stats.totalQueries) * 100 : 0,
          periodStats,
          dependentModules: module.accessStats.dependentModules || []
        };

        if (includeDetails) {
          result.accessLog = await this.getModuleAuditLog(moduleId, 100);
        }

        return result;

      } else {
        // Get stats for all modules
        const allStats = Array.from(this.moduleAccessStats.entries()).map(([id, stats]) => ({
          moduleId: id,
          totalQueries: stats.totalQueries,
          uniqueCallers: stats.uniqueCallers.size,
          lastAccessed: stats.lastAccessed,
          averageResponseTime: stats.averageResponseTime,
          errorCount: stats.errorCount,
          errorRate: stats.totalQueries > 0 ? (stats.errorCount / stats.totalQueries) * 100 : 0
        }));

        // Sort by total queries
        allStats.sort((a, b) => b.totalQueries - a.totalQueries);

        const summary = {
          totalModules: allStats.length,
          totalQueries: allStats.reduce((sum, stat) => sum + stat.totalQueries, 0),
          totalUniqueCallers: new Set(
            Array.from(this.moduleAccessStats.values())
              .flatMap(stat => Array.from(stat.uniqueCallers))
          ).size,
          averageQueriesPerModule: allStats.length > 0 ? 
            allStats.reduce((sum, stat) => sum + stat.totalQueries, 0) / allStats.length : 0,
          topModules: allStats.slice(0, 10),
          period,
          generatedAt: new Date().toISOString()
        };

        return summary;
      }

    } catch (error) {
      console.error('[Qindex] Get module access stats error:', error);
      throw new Error(`Failed to get module access stats: ${error.message}`);
    }
  }

  /**
   * Calculate period-specific statistics
   * @param {string} moduleId - Module identifier
   * @param {string} period - Time period
   * @param {string} groupBy - Grouping interval
   * @returns {Object} Period statistics
   */
  calculatePeriodStats(moduleId, period, groupBy) {
    // This is a simplified implementation
    // In production, this would analyze actual access logs with timestamps
    
    const now = new Date();
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': null
    };

    const days = periodDays[period];
    const stats = this.moduleAccessStats.get(moduleId);
    
    if (!stats) {
      return {
        period,
        groupBy,
        data: [],
        summary: {
          totalQueries: 0,
          averagePerPeriod: 0,
          peakQueries: 0,
          trend: 'stable'
        }
      };
    }

    // Simplified period stats (in production would use actual time-series data)
    const totalQueries = stats.totalQueries;
    const periodsInRange = days ? Math.ceil(days / (groupBy === 'hour' ? 1/24 : groupBy === 'day' ? 1 : groupBy === 'week' ? 7 : 30)) : 1;
    const averagePerPeriod = periodsInRange > 0 ? totalQueries / periodsInRange : totalQueries;

    return {
      period,
      groupBy,
      data: [], // Would contain time-series data points
      summary: {
        totalQueries,
        averagePerPeriod: Math.round(averagePerPeriod * 100) / 100,
        peakQueries: Math.round(averagePerPeriod * 1.5), // Estimated peak
        trend: totalQueries > averagePerPeriod ? 'increasing' : 'stable'
      }
    };
  }

  /**
   * Implement module metadata caching for performance optimization
   * @param {string} moduleId - Module identifier
   * @param {Object} options - Caching options
   * @returns {Promise<Object>} Cached or fresh module data
   */
  async getCachedModuleMetadata(moduleId, options = {}) {
    try {
      const { 
        forceRefresh = false,
        includeAccessStats = true,
        cacheTTL = 300000 // 5 minutes default TTL
      } = options;

      // Initialize cache if not exists
      if (!this.moduleMetadataCache) {
        this.moduleMetadataCache = new Map();
      }

      const cacheKey = `${moduleId}:${includeAccessStats}`;
      const now = Date.now();

      // Check cache first (unless force refresh)
      if (!forceRefresh && this.moduleMetadataCache.has(cacheKey)) {
        const cached = this.moduleMetadataCache.get(cacheKey);
        if (now - cached.timestamp < cacheTTL) {
          // Update cache hit statistics
          cached.hitCount = (cached.hitCount || 0) + 1;
          cached.lastAccessed = new Date().toISOString();
          
          console.log(`[Qindex] Cache hit for module: ${moduleId}`);
          return {
            ...cached.data,
            _cached: true,
            _cacheAge: now - cached.timestamp,
            _hitCount: cached.hitCount
          };
        } else {
          // Cache expired, remove it
          this.moduleMetadataCache.delete(cacheKey);
        }
      }

      // Get fresh data
      const module = await this.getModule(moduleId);
      if (!module) {
        return null;
      }

      // Prepare cached data
      const cachedData = {
        moduleId: module.moduleId,
        metadata: module.metadata,
        registrationInfo: module.registrationInfo,
        signedMetadata: {
          ...module.signedMetadata,
          // Don't cache the full signature for security
          signature: module.signedMetadata.signature ? '[SIGNATURE_PRESENT]' : null
        }
      };

      // Include access stats if requested
      if (includeAccessStats) {
        cachedData.accessStats = module.accessStats;
        const stats = this.moduleAccessStats.get(moduleId);
        if (stats) {
          cachedData.detailedStats = {
            totalQueries: stats.totalQueries,
            uniqueCallers: stats.uniqueCallers.size,
            lastAccessed: stats.lastAccessed,
            averageResponseTime: stats.averageResponseTime,
            errorCount: stats.errorCount
          };
        }
      }

      // Cache the data
      this.moduleMetadataCache.set(cacheKey, {
        data: cachedData,
        timestamp: now,
        hitCount: 0,
        lastAccessed: new Date().toISOString()
      });

      console.log(`[Qindex] Cached fresh data for module: ${moduleId}`);
      
      return {
        ...cachedData,
        _cached: false,
        _cacheAge: 0
      };

    } catch (error) {
      console.error('[Qindex] Get cached module metadata error:', error);
      throw new Error(`Failed to get cached module metadata: ${error.message}`);
    }
  }

  /**
   * Clear module metadata cache
   * @param {string} moduleId - Specific module ID to clear (optional)
   * @returns {Promise<boolean>} Success status
   */
  async clearModuleCache(moduleId = null) {
    try {
      if (!this.moduleMetadataCache) {
        return true;
      }

      if (moduleId) {
        // Clear cache for specific module
        const keysToDelete = [];
        for (const [key] of this.moduleMetadataCache) {
          if (key.startsWith(`${moduleId}:`)) {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => this.moduleMetadataCache.delete(key));
        console.log(`[Qindex] Cleared cache for module: ${moduleId} (${keysToDelete.length} entries)`);
      } else {
        // Clear entire cache
        const cacheSize = this.moduleMetadataCache.size;
        this.moduleMetadataCache.clear();
        console.log(`[Qindex] Cleared entire module cache (${cacheSize} entries)`);
      }

      return true;

    } catch (error) {
      console.error('[Qindex] Clear module cache error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    if (!this.moduleMetadataCache) {
      return {
        enabled: false,
        size: 0,
        totalHits: 0,
        entries: []
      };
    }

    const entries = Array.from(this.moduleMetadataCache.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      hitCount: value.hitCount || 0,
      lastAccessed: value.lastAccessed,
      age: Date.now() - value.timestamp
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);

    return {
      enabled: true,
      size: this.moduleMetadataCache.size,
      totalHits,
      entries: entries.sort((a, b) => b.hitCount - a.hitCount)
    };
  }

  /**
   * Create comprehensive module access statistics tracking and reporting
   * @param {string} moduleId - Module identifier
   * @param {string} accessType - Type of access (query, download, view, etc.)
   * @param {string} callerIdentity - Identity making the access
   * @param {Object} metadata - Additional access metadata
   * @returns {Promise<Object>} Updated access statistics
   */
  async trackModuleAccess(moduleId, accessType, callerIdentity, metadata = {}) {
    try {
      const now = new Date().toISOString();
      const startTime = Date.now();

      // Get or create access statistics
      let stats = this.moduleAccessStats.get(moduleId);
      if (!stats) {
        stats = {
          moduleId,
          totalQueries: 0,
          uniqueCallers: new Set(),
          lastAccessed: null,
          averageResponseTime: 0,
          errorCount: 0,
          accessHistory: [],
          accessTypes: {},
          callerStats: {}
        };
        this.moduleAccessStats.set(moduleId, stats);
      }

      // Update basic statistics
      stats.totalQueries++;
      stats.uniqueCallers.add(callerIdentity);
      stats.lastAccessed = now;

      // Track access types
      stats.accessTypes[accessType] = (stats.accessTypes[accessType] || 0) + 1;

      // Track caller statistics
      if (!stats.callerStats[callerIdentity]) {
        stats.callerStats[callerIdentity] = {
          totalAccesses: 0,
          firstAccess: now,
          lastAccess: now,
          accessTypes: {}
        };
      }
      
      const callerStat = stats.callerStats[callerIdentity];
      callerStat.totalAccesses++;
      callerStat.lastAccess = now;
      callerStat.accessTypes[accessType] = (callerStat.accessTypes[accessType] || 0) + 1;

      // Add to access history (keep last 100 entries)
      const accessEntry = {
        timestamp: now,
        accessType,
        callerIdentity,
        metadata,
        responseTime: null // Will be updated when response completes
      };
      
      stats.accessHistory.push(accessEntry);
      if (stats.accessHistory.length > 100) {
        stats.accessHistory = stats.accessHistory.slice(-100);
      }

      // Update module's access stats in registry
      const module = await this.getModule(moduleId);
      if (module) {
        module.accessStats.queryCount++;
        module.accessStats.lastAccessed = now;
      }

      // Log detailed access event
      await this.logModuleAuditEvent({
        action: 'ACCESSED',
        moduleId,
        actorIdentity: callerIdentity,
        details: {
          accessType,
          metadata,
          timestamp: now,
          totalQueries: stats.totalQueries,
          uniqueCallers: stats.uniqueCallers.size
        }
      });

      // Return function to update response time
      const updateResponseTime = (error = null) => {
        const responseTime = Date.now() - startTime;
        
        // Update average response time
        const totalResponseTime = stats.averageResponseTime * (stats.totalQueries - 1) + responseTime;
        stats.averageResponseTime = totalResponseTime / stats.totalQueries;
        
        // Update access history entry
        if (stats.accessHistory.length > 0) {
          stats.accessHistory[stats.accessHistory.length - 1].responseTime = responseTime;
          if (error) {
            stats.accessHistory[stats.accessHistory.length - 1].error = error.message;
            stats.errorCount++;
          }
        }
      };

      return {
        moduleId,
        accessType,
        callerIdentity,
        timestamp: now,
        totalQueries: stats.totalQueries,
        uniqueCallers: stats.uniqueCallers.size,
        updateResponseTime
      };

    } catch (error) {
      console.error('[Qindex] Track module access error:', error);
      throw new Error(`Failed to track module access: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive module access report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Access report
   */
  async generateModuleAccessReport(options = {}) {
    try {
      const {
        moduleId = null,        // Specific module or all modules
        period = '30d',         // 7d, 30d, 90d, 1y, all
        groupBy = 'day',        // hour, day, week, month
        includeCallerDetails = false,
        includeAccessHistory = false,
        sortBy = 'totalQueries', // totalQueries, uniqueCallers, errorRate
        limit = 50
      } = options;

      const now = new Date();
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
        'all': null
      };

      const startDate = periodDays[period] ? 
        new Date(now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000) : 
        null;

      let moduleStats = [];

      if (moduleId) {
        // Report for specific module
        const stats = this.moduleAccessStats.get(moduleId);
        if (!stats) {
          throw new Error(`Module not found: ${moduleId}`);
        }
        moduleStats = [stats];
      } else {
        // Report for all modules
        moduleStats = Array.from(this.moduleAccessStats.values());
      }

      // Filter by period if specified
      if (startDate) {
        moduleStats = moduleStats.map(stats => {
          const filteredHistory = stats.accessHistory?.filter(entry => 
            new Date(entry.timestamp) >= startDate
          ) || [];
          
          return {
            ...stats,
            accessHistory: filteredHistory,
            periodQueries: filteredHistory.length
          };
        });
      }

      // Sort modules
      moduleStats.sort((a, b) => {
        switch (sortBy) {
          case 'uniqueCallers':
            return b.uniqueCallers.size - a.uniqueCallers.size;
          case 'errorRate':
            const aErrorRate = a.totalQueries > 0 ? (a.errorCount / a.totalQueries) * 100 : 0;
            const bErrorRate = b.totalQueries > 0 ? (b.errorCount / b.totalQueries) * 100 : 0;
            return bErrorRate - aErrorRate;
          case 'totalQueries':
          default:
            return b.totalQueries - a.totalQueries;
        }
      });

      // Apply limit
      const limitedStats = moduleStats.slice(0, limit);

      // Generate report
      const report = {
        reportId: crypto.randomUUID(),
        generatedAt: now.toISOString(),
        period,
        groupBy,
        moduleCount: limitedStats.length,
        summary: {
          totalQueries: limitedStats.reduce((sum, stats) => sum + stats.totalQueries, 0),
          totalUniqueCallers: new Set(
            limitedStats.flatMap(stats => Array.from(stats.uniqueCallers))
          ).size,
          averageResponseTime: limitedStats.reduce((sum, stats) => sum + stats.averageResponseTime, 0) / limitedStats.length || 0,
          totalErrors: limitedStats.reduce((sum, stats) => sum + stats.errorCount, 0),
          overallErrorRate: 0
        },
        modules: []
      };

      // Calculate overall error rate
      report.summary.overallErrorRate = report.summary.totalQueries > 0 ? 
        (report.summary.totalErrors / report.summary.totalQueries) * 100 : 0;

      // Process each module
      for (const stats of limitedStats) {
        const moduleReport = {
          moduleId: stats.moduleId,
          totalQueries: stats.totalQueries,
          uniqueCallers: stats.uniqueCallers.size,
          lastAccessed: stats.lastAccessed,
          averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
          errorCount: stats.errorCount,
          errorRate: stats.totalQueries > 0 ? 
            Math.round((stats.errorCount / stats.totalQueries) * 10000) / 100 : 0,
          accessTypes: stats.accessTypes || {},
          topCallers: []
        };

        // Include caller details if requested
        if (includeCallerDetails && stats.callerStats) {
          const callerEntries = Object.entries(stats.callerStats)
            .sort(([,a], [,b]) => b.totalAccesses - a.totalAccesses)
            .slice(0, 10);
          
          moduleReport.topCallers = callerEntries.map(([identity, callerStat]) => ({
            identity,
            totalAccesses: callerStat.totalAccesses,
            firstAccess: callerStat.firstAccess,
            lastAccess: callerStat.lastAccess,
            accessTypes: callerStat.accessTypes
          }));
        }

        // Include access history if requested
        if (includeAccessHistory && stats.accessHistory) {
          moduleReport.recentAccesses = stats.accessHistory
            .slice(-20) // Last 20 accesses
            .map(entry => ({
              timestamp: entry.timestamp,
              accessType: entry.accessType,
              callerIdentity: entry.callerIdentity,
              responseTime: entry.responseTime,
              error: entry.error
            }));
        }

        report.modules.push(moduleReport);
      }

      return report;

    } catch (error) {
      console.error('[Qindex] Generate module access report error:', error);
      throw new Error(`Failed to generate module access report: ${error.message}`);
    }
  }

  /**
   * Get module registry statistics
   */
  async getModuleStats() {
    const productionModules = Array.from(this.moduleRegistry.values());
    const sandboxModules = Array.from(this.sandboxModules.values());
    
    const stats = {
      totalModules: productionModules.length + sandboxModules.length,
      productionModules: productionModules.length,
      sandboxModules: sandboxModules.length,
      byStatus: {},
      byIdentityType: {},
      totalQueries: 0,
      dependencies: {
        totalDependencies: this.moduleDependencyGraph.size,
        averageDependencies: 0
      },
      cache: this.getCacheStats(),
      lastUpdated: new Date().toISOString()
    };

    // Calculate production module stats
    productionModules.forEach(module => {
      const status = module.metadata.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Count by identity types supported
      module.metadata.identities_supported.forEach(identityType => {
        stats.byIdentityType[identityType] = (stats.byIdentityType[identityType] || 0) + 1;
      });
    });

    // Sum access statistics
    for (const accessStats of this.moduleAccessStats.values()) {
      stats.totalQueries += accessStats.totalQueries;
    }

    // Sum access statistics
    for (const accessStats of this.moduleAccessStats.values()) {
      stats.totalQueries += accessStats.totalQueries;
    }

    return stats;
  }

  /**
   * Get audit log
   */
  async getAuditLog(limit = 100, offset = 0) {
    const sortedLog = this.auditLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);

    return {
      events: sortedLog,
      total: this.auditLog.length,
      limit,
      offset
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getIndexStats();
    const moduleStats = await this.getModuleStats();
    
    return {
      status: 'healthy',
      index: {
        totalFiles: stats.totalFiles,
        searchableFiles: stats.searchableFiles,
        searchIndexSize: this.searchIndex.size
      },
      modules: {
        totalModules: moduleStats.totalModules,
        productionModules: moduleStats.productionModules,
        sandboxModules: moduleStats.sandboxModules,
        totalQueries: moduleStats.totalQueries
      },
      auditLog: {
        totalEvents: this.auditLog.length,
        moduleEvents: this.moduleAuditLog.length
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qindexServiceInstance = null;

export function getQindexService() {
  if (!qindexServiceInstance) {
    qindexServiceInstance = new QindexService();
  }
  return qindexServiceInstance;
}

export default QindexService;