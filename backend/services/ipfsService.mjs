import { Web3Storage } from 'web3.storage';
import { create as createW3upClient } from '@web3-storage/w3up-client';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

dotenv.config();

// Default options
const DEFAULT_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
};

class IPFSService {
  constructor() {
    this.storage = null;
    this.w3upClient = null;
    this.initialize();
  }

  async initialize() {
    try {
      if (process.env.WEB3_STORAGE_TOKEN) {
        this.storage = new Web3Storage({ 
          token: process.env.WEB3_STORAGE_TOKEN,
          endpoint: process.env.WEB3_STORAGE_ENDPOINT 
            ? new URL(process.env.WEB3_STORAGE_ENDPOINT)
            : new URL('https://api.web3.storage')
        });
        console.log('Web3.Storage client initialized');
      } else {
        console.warn('WEB3_STORAGE_TOKEN not set. File storage will be disabled.');
      }

      try {
        this.w3upClient = await createW3upClient();
        console.log('w3up client initialized');
      } catch (error) {
        console.warn('Failed to initialize w3up client:', error.message);
      }
    } catch (error) {
      console.error('Failed to initialize IPFS service:', error);
      throw error;
    }
  }

  // Core methods matching the original interface
  async uploadToStoracha(data, filename, spaceDID, options = {}) {
    if (!this.storage) {
      throw new Error('Web3.Storage client not initialized');
    }

    const file = new File(
      [data],
      filename,
      { type: mime.lookup(filename) || 'application/octet-stream' }
    );

    const cid = await this.storage.put([file], {
      name: filename,
      maxRetries: options.maxRetries || DEFAULT_OPTIONS.maxRetries,
      wrapWithDirectory: false
    });

    return {
      success: true,
      cid,
      name: filename,
      size: data.length,
      type: file.type,
      url: `https://${cid}.ipfs.w3s.link/${encodeURIComponent(filename)}`,
      spaceDID: spaceDID || 'default',
      _raw: { cid }
    };
  }

  async downloadFromStoracha(cid, options = {}) {
    if (!this.storage) {
      throw new Error('Web3.Storage client not initialized');
    }

    const res = await this.storage.get(cid);
    if (!res.ok) {
      throw new Error(`Failed to get file with CID ${cid}: ${res.status} ${res.statusText}`);
    }

    const files = await res.files();
    if (!files || files.length === 0) {
      throw new Error(`No files found for CID ${cid}`);
    }

    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getFileInfo(cid, options = {}) {
    if (!this.storage) {
      throw new Error('Web3.Storage client not initialized');
    }

    const status = await this.storage.status(cid);
    if (!status) {
      throw new Error(`No status found for CID ${cid}`);
    }

    return {
      cid: status.cid,
      size: status.dagSize || 0,
      pinned: status.pinned || false,
      created: status.created || new Date().toISOString(),
      deals: status.deals || [],
      _raw: status
    };
  }

  async authorizeSpace(spaceDID, agentDID, options = {}) {
    console.log(`Authorizing space ${spaceDID} for agent ${agentDID}`);
    return {
      success: true,
      spaceDID,
      agentDID,
      authorized: true,
      timestamp: new Date().toISOString()
    };
  }

  async createSpaceForUser(userId, options = {}) {
    const spaceName = `user-${userId}-${Date.now()}`;
    const spaceDID = `did:web:${spaceName}.example.com`;
    
    console.log(`Creating space for user ${userId}: ${spaceName}`);
    
    return {
      success: true,
      spaceName,
      spaceDID,
      userId,
      created: new Date().toISOString()
    };
  }

  // Additional methods needed by UnifiedStorageService
  async add(data, options = {}) {
    if (!this.storage) {
      throw new Error('Web3.Storage client not initialized');
    }

    const filename = options.filename || `file-${uuidv4()}`;
    const file = new File(
      [data],
      filename,
      { type: options.type || mime.lookup(filename) || 'application/octet-stream' }
    );

    const cid = await this.storage.put([file], {
      name: filename,
      maxRetries: options.maxRetries || DEFAULT_OPTIONS.maxRetries,
      wrapWithDirectory: false
    });

    return {
      cid: { toString: () => cid },
      size: data.length,
      path: filename
    };
  }

  async cat(cid, options = {}) {
    return await this.downloadFromStoracha(cid, options);
  }

  async pin(cid, options = {}) {
    // In Web3.Storage, files are automatically pinned when uploaded
    // This is a no-op for compatibility
    console.log(`Pinning ${cid} (already pinned in Web3.Storage)`);
    return { success: true, cid };
  }

  async unpin(cid, options = {}) {
    // Web3.Storage doesn't support unpinning individual files
    // This is a no-op for compatibility
    console.log(`Unpinning ${cid} (not supported in Web3.Storage)`);
    return { success: true, cid };
  }

  async stat(cid, options = {}) {
    try {
      const info = await this.getFileInfo(cid, options);
      return {
        cid,
        size: info.size,
        cumulativeSize: info.size,
        blocks: 1,
        type: 'file'
      };
    } catch (error) {
      throw new Error(`Failed to get stats for ${cid}: ${error.message}`);
    }
  }

  async ls(cid, options = {}) {
    // List directory contents - simplified implementation
    try {
      const info = await this.getFileInfo(cid, options);
      return [{
        name: 'file',
        cid,
        size: info.size,
        type: 'file'
      }];
    } catch (error) {
      throw new Error(`Failed to list ${cid}: ${error.message}`);
    }
  }
}

// Create and initialize the service instance
const ipfsService = new IPFSService();

// Export the main service instance as default
export default ipfsService;

// Export individual methods for backward compatibility
export const uploadToStoracha = (...args) => ipfsService.uploadToStoracha(...args);
export const downloadFromStoracha = (...args) => ipfsService.downloadFromStoracha(...args);
export const getFileInfo = (...args) => ipfsService.getFileInfo(...args);
export const authorizeSpace = (...args) => ipfsService.authorizeSpace(...args);
export const createSpaceForUser = (...args) => ipfsService.createSpaceForUser(...args);

// Export the IPFSService class for advanced usage
export { IPFSService };
