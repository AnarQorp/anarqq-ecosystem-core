import { logger } from '../utils/logger.js';

export class IndexService {
  constructor(qindexService, config) {
    this.qindex = qindexService;
    this.config = config;
  }

  async indexFile(fileMetadata) {
    try {
      logger.debug(`Indexing file: ${fileMetadata.cid}`);
      
      const result = await this.qindex.indexFile(fileMetadata);
      
      if (!result.success) {
        logger.error(`Failed to index file: ${result.error}`);
        // Don't throw - indexing failure shouldn't block file upload
      }
      
      return result;
    } catch (error) {
      logger.error('File indexing failed:', error);
      // Don't throw - indexing is not critical
    }
  }

  async updateFile(fileMetadata) {
    try {
      logger.debug(`Updating file index: ${fileMetadata.cid}`);
      
      const result = await this.qindex.updateFile(fileMetadata);
      
      if (!result.success) {
        logger.error(`Failed to update file index: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File index update failed:', error);
    }
  }

  async removeFile(cid) {
    try {
      logger.debug(`Removing file from index: ${cid}`);
      
      const result = await this.qindex.removeFile(cid);
      
      if (!result.success) {
        logger.error(`Failed to remove file from index: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File index removal failed:', error);
    }
  }

  async listFiles(owner, filters = {}) {
    try {
      logger.debug(`Listing files for owner: ${owner}`);
      
      const result = await this.qindex.listFiles(owner, filters);
      
      if (!result.success) {
        throw new Error(`Failed to list files: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File listing failed:', error);
      throw error;
    }
  }

  async searchFiles(query, filters = {}) {
    try {
      logger.debug(`Searching files: ${query}`);
      
      const result = await this.qindex.searchFiles(query, filters);
      
      if (!result.success) {
        throw new Error(`Failed to search files: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File search failed:', error);
      throw error;
    }
  }
}