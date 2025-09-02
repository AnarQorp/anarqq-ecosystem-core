/**
 * QueryEngine - Performance-optimized search and retrieval
 */

import { createLogger } from '../utils/logger.js';

export class QueryEngine {
  constructor(config, storage, pointers) {
    this.config = config;
    this.storage = storage;
    this.pointers = pointers;
    this.logger = createLogger('QueryEngine');
    this.searchIndex = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing query engine...');

      // Build search index from existing pointers
      await this._buildSearchIndex();

      this.initialized = true;
      this.logger.info('Query engine initialized successfully', {
        indexedTerms: this.searchIndex.size
      });

    } catch (error) {
      this.logger.error('Failed to initialize query engine', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down query engine...');
      
      this.searchIndex.clear();
      this.initialized = false;
      this.logger.info('Query engine shutdown complete');

    } catch (error) {
      this.logger.error('Error during query engine shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Search records with complex filtering
   */
  async search(filters = {}) {
    if (!this.initialized) {
      throw new Error('Query engine not initialized');
    }

    try {
      const startTime = Date.now();
      
      // Get all pointers first
      const pointerResults = await this.pointers.listPointers(filters);
      let matchingKeys = new Set(pointerResults.pointers.map(p => p.key));

      // Apply text search if query provided
      if (filters.query) {
        const textMatches = await this._performTextSearch(filters.query);
        matchingKeys = new Set([...matchingKeys].filter(key => textMatches.has(key)));
      }

      // Apply tag filtering
      if (filters.tags && filters.tags.length > 0) {
        const tagMatches = await this._performTagSearch(filters.tags);
        matchingKeys = new Set([...matchingKeys].filter(key => tagMatches.has(key)));
      }

      // Convert keys to full records
      const records = [];
      for (const key of matchingKeys) {
        try {
          const pointer = await this.pointers.getPointer(key);
          if (pointer) {
            // Get basic record info without full content for performance
            records.push({
              key: pointer.key,
              cid: pointer.currentCid,
              version: pointer.version,
              metadata: pointer.metadata,
              createdAt: pointer.timestamps.created,
              updatedAt: pointer.timestamps.updated,
              accessCount: pointer.access.count
            });
          }
        } catch (error) {
          this.logger.warn('Failed to get pointer for key', { key, error: error.message });
        }
      }

      // Apply additional filtering
      let filteredRecords = records;

      if (filters.contentType) {
        filteredRecords = filteredRecords.filter(r => 
          r.metadata.contentType === filters.contentType
        );
      }

      if (filters.since) {
        const sinceDate = new Date(filters.since);
        filteredRecords = filteredRecords.filter(r => 
          new Date(r.updatedAt) >= sinceDate
        );
      }

      if (filters.until) {
        const untilDate = new Date(filters.until);
        filteredRecords = filteredRecords.filter(r => 
          new Date(r.updatedAt) <= untilDate
        );
      }

      // Sort results
      const sortBy = filters.sort || 'updated_desc';
      filteredRecords.sort((a, b) => {
        switch (sortBy) {
          case 'created_asc':
            return new Date(a.createdAt) - new Date(b.createdAt);
          case 'created_desc':
            return new Date(b.createdAt) - new Date(a.createdAt);
          case 'updated_asc':
            return new Date(a.updatedAt) - new Date(b.updatedAt);
          case 'updated_desc':
          default:
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          case 'relevance':
            // Simple relevance scoring based on access count and recency
            const scoreA = this._calculateRelevanceScore(a, filters.query);
            const scoreB = this._calculateRelevanceScore(b, filters.query);
            return scoreB - scoreA;
        }
      });

      // Apply pagination
      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;
      const paginatedRecords = filteredRecords.slice(offset, offset + limit);

      const duration = Date.now() - startTime;
      
      this.logger.debug('Search completed', {
        query: filters.query,
        totalMatches: filteredRecords.length,
        returnedCount: paginatedRecords.length,
        duration: `${duration}ms`
      });

      return {
        records: paginatedRecords,
        total: filteredRecords.length,
        hasMore: filteredRecords.length > offset + limit,
        nextCursor: filteredRecords.length > offset + limit ? offset + limit : null,
        searchTime: duration
      };

    } catch (error) {
      this.logger.error('Search failed', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Update search index when record is added/updated
   */
  async updateIndex(key, metadata) {
    if (!this.initialized) {
      return;
    }

    try {
      // Index by content type
      const contentType = metadata.contentType || 'unknown';
      this._addToIndex(`contentType:${contentType}`, key);

      // Index by tags
      if (metadata.tags && Array.isArray(metadata.tags)) {
        metadata.tags.forEach(tag => {
          this._addToIndex(`tag:${tag.toLowerCase()}`, key);
        });
      }

      // Index by key parts (for prefix search)
      const keyParts = key.split(/[\/\._-]/);
      keyParts.forEach(part => {
        if (part.length > 2) {
          this._addToIndex(`keypart:${part.toLowerCase()}`, key);
        }
      });

      // Index by description if available
      if (metadata.description) {
        const words = metadata.description.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2) {
            this._addToIndex(`desc:${word}`, key);
          }
        });
      }

    } catch (error) {
      this.logger.warn('Failed to update search index', { key, error: error.message });
    }
  }

  /**
   * Remove from search index when record is deleted
   */
  async removeFromIndex(key) {
    if (!this.initialized) {
      return;
    }

    try {
      // Remove key from all index entries
      for (const [term, keys] of this.searchIndex.entries()) {
        keys.delete(key);
        if (keys.size === 0) {
          this.searchIndex.delete(term);
        }
      }

    } catch (error) {
      this.logger.warn('Failed to remove from search index', { key, error: error.message });
    }
  }

  /**
   * Get query engine statistics
   */
  async getStats() {
    try {
      const stats = {
        indexedTerms: this.searchIndex.size,
        totalIndexEntries: 0,
        averageKeysPerTerm: 0,
        initialized: this.initialized
      };

      let totalEntries = 0;
      for (const keys of this.searchIndex.values()) {
        totalEntries += keys.size;
      }

      stats.totalIndexEntries = totalEntries;
      stats.averageKeysPerTerm = stats.indexedTerms > 0 ? 
        totalEntries / stats.indexedTerms : 0;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get query engine stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      initialized: this.initialized,
      indexedTerms: this.searchIndex.size
    };

    try {
      // Check if we can perform a basic search
      await this.search({ limit: 1 });

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Build search index from existing pointers
   */
  async _buildSearchIndex() {
    try {
      const pointerResults = await this.pointers.listPointers({ limit: 10000 });
      
      for (const pointer of pointerResults.pointers) {
        await this.updateIndex(pointer.key, pointer.metadata);
      }

      this.logger.debug('Search index built', {
        processedPointers: pointerResults.pointers.length,
        indexedTerms: this.searchIndex.size
      });

    } catch (error) {
      this.logger.warn('Failed to build complete search index', { error: error.message });
    }
  }

  /**
   * Perform text search across indexed terms
   */
  async _performTextSearch(query) {
    const matchingKeys = new Set();
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    for (const term of queryTerms) {
      // Exact matches
      const exactKey = `desc:${term}`;
      if (this.searchIndex.has(exactKey)) {
        for (const key of this.searchIndex.get(exactKey)) {
          matchingKeys.add(key);
        }
      }

      // Key part matches
      const keyPartKey = `keypart:${term}`;
      if (this.searchIndex.has(keyPartKey)) {
        for (const key of this.searchIndex.get(keyPartKey)) {
          matchingKeys.add(key);
        }
      }

      // Prefix matches
      for (const [indexTerm, keys] of this.searchIndex.entries()) {
        if (indexTerm.includes(term)) {
          for (const key of keys) {
            matchingKeys.add(key);
          }
        }
      }
    }

    return matchingKeys;
  }

  /**
   * Perform tag-based search
   */
  async _performTagSearch(tags) {
    const matchingKeys = new Set();

    for (const tag of tags) {
      const tagKey = `tag:${tag.toLowerCase()}`;
      if (this.searchIndex.has(tagKey)) {
        for (const key of this.searchIndex.get(tagKey)) {
          matchingKeys.add(key);
        }
      }
    }

    return matchingKeys;
  }

  /**
   * Add key to search index term
   */
  _addToIndex(term, key) {
    if (!this.searchIndex.has(term)) {
      this.searchIndex.set(term, new Set());
    }
    this.searchIndex.get(term).add(key);
  }

  /**
   * Calculate relevance score for search results
   */
  _calculateRelevanceScore(record, query) {
    let score = 0;

    // Base score from access count
    score += Math.log(record.accessCount + 1) * 10;

    // Recency bonus (more recent = higher score)
    const daysSinceUpdate = (Date.now() - new Date(record.updatedAt)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 100 - daysSinceUpdate);

    // Query term matching bonus
    if (query) {
      const queryTerms = query.toLowerCase().split(/\s+/);
      const keyLower = record.key.toLowerCase();
      const descLower = (record.metadata.description || '').toLowerCase();

      queryTerms.forEach(term => {
        if (keyLower.includes(term)) score += 50;
        if (descLower.includes(term)) score += 25;
      });
    }

    return score;
  }
}