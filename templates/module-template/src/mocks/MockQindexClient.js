/**
 * Mock Qindex Client
 * 
 * Mock implementation of Qindex indexing service for development and testing
 */

export class MockQindexClient {
  constructor(options = {}) {
    this.options = options;
    this.index = new Map();
    this.history = new Map();
  }

  /**
   * Put/update index record
   */
  async put({ key, cid, type, metadata = {}, tags = [] }) {
    await this.delay(30);

    const record = {
      key,
      cid,
      type,
      metadata,
      tags,
      version: this.getNextVersion(key),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store previous version in history
    if (this.index.has(key)) {
      const prevRecord = this.index.get(key);
      record.prevCid = prevRecord.cid;
      
      if (!this.history.has(key)) {
        this.history.set(key, []);
      }
      this.history.get(key).push(prevRecord);
    }

    this.index.set(key, record);

    return record;
  }

  /**
   * Get index record
   */
  async get(key) {
    await this.delay(20);

    const record = this.index.get(key);
    if (!record) {
      return null;
    }

    return { ...record };
  }

  /**
   * Delete index record
   */
  async delete(key) {
    await this.delay(25);

    const record = this.index.get(key);
    if (!record) {
      return { deleted: false, reason: 'not_found' };
    }

    // Move to history
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    this.history.get(key).push({
      ...record,
      deletedAt: new Date().toISOString()
    });

    this.index.delete(key);

    return { deleted: true, key, deletedAt: new Date().toISOString() };
  }

  /**
   * List records with optional filtering
   */
  async list({ type, tags, limit = 10, offset = 0 } = {}) {
    await this.delay(40);

    let records = Array.from(this.index.values());

    // Filter by type
    if (type) {
      records = records.filter(record => record.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      records = records.filter(record => 
        tags.some(tag => record.tags.includes(tag))
      );
    }

    // Sort by updatedAt (newest first)
    records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Apply pagination
    const paginatedRecords = records.slice(offset, offset + limit);

    return {
      records: paginatedRecords,
      total: records.length,
      limit,
      offset
    };
  }

  /**
   * Search records
   */
  async search({ query, type, tags, limit = 10, offset = 0 } = {}) {
    await this.delay(50);

    let records = Array.from(this.index.values());

    // Filter by type
    if (type) {
      records = records.filter(record => record.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      records = records.filter(record => 
        tags.some(tag => record.tags.includes(tag))
      );
    }

    // Simple text search in metadata
    if (query) {
      const lowerQuery = query.toLowerCase();
      records = records.filter(record => {
        const searchText = JSON.stringify(record.metadata).toLowerCase();
        return searchText.includes(lowerQuery) || 
               record.key.toLowerCase().includes(lowerQuery);
      });
    }

    // Sort by relevance (simplified - just by updatedAt)
    records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Apply pagination
    const paginatedRecords = records.slice(offset, offset + limit);

    return {
      records: paginatedRecords,
      total: records.length,
      query,
      limit,
      offset
    };
  }

  /**
   * Get record history
   */
  async getHistory(key) {
    await this.delay(35);

    const history = this.history.get(key) || [];
    const current = this.index.get(key);

    const fullHistory = [...history];
    if (current) {
      fullHistory.push(current);
    }

    return {
      key,
      history: fullHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    };
  }

  /**
   * Get statistics
   */
  async getStats() {
    await this.delay(30);

    const typeStats = {};
    const tagStats = {};

    for (const record of this.index.values()) {
      // Count by type
      typeStats[record.type] = (typeStats[record.type] || 0) + 1;

      // Count by tags
      record.tags.forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    }

    return {
      totalRecords: this.index.size,
      totalHistory: Array.from(this.history.values()).reduce((sum, h) => sum + h.length, 0),
      typeStats,
      tagStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async health() {
    return {
      status: 'healthy',
      version: '1.0.0-mock',
      timestamp: new Date().toISOString(),
      records: this.index.size,
      historyEntries: Array.from(this.history.values()).reduce((sum, h) => sum + h.length, 0)
    };
  }

  /**
   * Get next version number for a key
   */
  getNextVersion(key) {
    const existing = this.index.get(key);
    if (!existing) {
      return 1;
    }
    return existing.version + 1;
  }

  /**
   * Simulate network delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}