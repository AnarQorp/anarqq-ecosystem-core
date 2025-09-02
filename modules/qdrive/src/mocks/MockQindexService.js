import { logger } from '../utils/logger.js';

export class MockQindexService {
  constructor() {
    this.records = new Map();
    this.fileIndex = new Map();
  }

  async putRecord(record) {
    logger.debug(`[MockQindex] Putting record: ${record.key}`);
    
    await new Promise(resolve => setTimeout(resolve, 40));

    const indexRecord = {
      ...record,
      version: (this.records.get(record.key)?.version || 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.set(record.key, indexRecord);

    // If it's a file record, add to file index
    if (record.type === 'qdrive_file') {
      this.fileIndex.set(record.cid, indexRecord);
    }

    return {
      success: true,
      record: indexRecord
    };
  }

  async getRecord(key) {
    logger.debug(`[MockQindex] Getting record: ${key}`);
    
    await new Promise(resolve => setTimeout(resolve, 20));

    const record = this.records.get(key);
    
    if (!record) {
      return {
        success: false,
        error: 'Record not found'
      };
    }

    return {
      success: true,
      record
    };
  }

  async listRecords(filters = {}) {
    logger.debug('[MockQindex] Listing records', filters);
    
    await new Promise(resolve => setTimeout(resolve, 30));

    let records = Array.from(this.records.values());

    // Apply filters
    if (filters.type) {
      records = records.filter(r => r.type === filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      records = records.filter(r => 
        r.tags && filters.tags.some(tag => r.tags.includes(tag))
      );
    }

    if (filters.owner) {
      records = records.filter(r => 
        r.metadata && r.metadata.owner === filters.owner
      );
    }

    // Apply sorting
    if (filters.sort) {
      records.sort((a, b) => {
        const aVal = a.metadata?.[filters.sort] || a[filters.sort];
        const bVal = b.metadata?.[filters.sort] || b[filters.sort];
        
        if (filters.order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const paginatedRecords = records.slice(offset, offset + limit);

    return {
      success: true,
      records: paginatedRecords,
      pagination: {
        total: records.length,
        offset,
        limit,
        hasMore: offset + limit < records.length
      }
    };
  }

  async deleteRecord(key) {
    logger.debug(`[MockQindex] Deleting record: ${key}`);
    
    await new Promise(resolve => setTimeout(resolve, 25));

    const record = this.records.get(key);
    if (record) {
      this.records.delete(key);
      
      // Remove from file index if it's a file record
      if (record.type === 'qdrive_file' && record.cid) {
        this.fileIndex.delete(record.cid);
      }
    }

    return {
      success: true,
      deleted: !!record
    };
  }

  // File-specific methods
  async indexFile(fileMetadata) {
    const record = {
      type: 'qdrive_file',
      key: `file:${fileMetadata.cid}`,
      cid: fileMetadata.cid,
      tags: fileMetadata.tags || [],
      metadata: {
        name: fileMetadata.name,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        privacy: fileMetadata.privacy,
        owner: fileMetadata.owner,
        createdAt: fileMetadata.createdAt
      }
    };

    return await this.putRecord(record);
  }

  async updateFile(fileMetadata) {
    return await this.indexFile(fileMetadata);
  }

  async removeFile(cid) {
    return await this.deleteRecord(`file:${cid}`);
  }

  async listFiles(owner, filters = {}) {
    const fileFilters = {
      type: 'qdrive_file',
      owner,
      ...filters
    };

    const result = await this.listRecords(fileFilters);
    
    if (result.success) {
      // Transform records to file format
      const files = result.records.map(record => ({
        cid: record.cid,
        name: record.metadata.name,
        size: record.metadata.size,
        mimeType: record.metadata.mimeType,
        tags: record.tags,
        privacy: record.metadata.privacy,
        createdAt: record.metadata.createdAt
      }));

      return {
        success: true,
        files,
        pagination: result.pagination
      };
    }

    return result;
  }

  async searchFiles(query, filters = {}) {
    logger.debug(`[MockQindex] Searching files: ${query}`);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    let records = Array.from(this.fileIndex.values());

    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      records = records.filter(record => {
        const name = record.metadata?.name?.toLowerCase() || '';
        const tags = record.tags?.join(' ').toLowerCase() || '';
        return name.includes(lowerQuery) || tags.includes(lowerQuery);
      });
    }

    // Apply additional filters
    if (filters.owner) {
      records = records.filter(r => r.metadata?.owner === filters.owner);
    }

    if (filters.mimeType) {
      records = records.filter(r => r.metadata?.mimeType === filters.mimeType);
    }

    if (filters.privacy) {
      records = records.filter(r => r.metadata?.privacy === filters.privacy);
    }

    // Transform to file format
    const files = records.map(record => ({
      cid: record.cid,
      name: record.metadata.name,
      size: record.metadata.size,
      mimeType: record.metadata.mimeType,
      tags: record.tags,
      privacy: record.metadata.privacy,
      createdAt: record.metadata.createdAt
    }));

    return {
      success: true,
      query,
      files,
      total: files.length
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qindex',
      records: this.records.size,
      fileIndex: this.fileIndex.size,
      timestamp: new Date().toISOString()
    };
  }
}