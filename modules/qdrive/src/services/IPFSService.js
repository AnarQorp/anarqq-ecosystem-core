import { create } from 'ipfs-http-client';
import { logger } from '../utils/logger.js';

export class IPFSService {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing IPFS service...');
      
      this.client = create({
        url: this.config.apiUrl,
        timeout: this.config.timeout
      });
      
      // Test connection
      const version = await this.client.version();
      logger.info(`Connected to IPFS node version: ${version.version}`);
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize IPFS service:', error);
      throw error;
    }
  }

  async add(content, options = {}) {
    this.ensureInitialized();
    
    try {
      const defaultOptions = {
        pin: this.config.pinOnAdd,
        cidVersion: 1,
        hashAlg: 'sha2-256',
        wrapWithDirectory: false,
        ...options
      };
      
      const result = await this.client.add(content, defaultOptions);
      
      logger.debug(`Added content to IPFS: ${result.cid.toString()}`);
      return result;
    } catch (error) {
      logger.error('Failed to add content to IPFS:', error);
      throw error;
    }
  }

  async get(cid) {
    this.ensureInitialized();
    
    try {
      const chunks = [];
      
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks);
      logger.debug(`Retrieved content from IPFS: ${cid}`);
      
      return content;
    } catch (error) {
      logger.error(`Failed to get content from IPFS (${cid}):`, error);
      throw error;
    }
  }

  async pin(cid) {
    this.ensureInitialized();
    
    try {
      await this.client.pin.add(cid);
      logger.debug(`Pinned content: ${cid}`);
    } catch (error) {
      logger.error(`Failed to pin content (${cid}):`, error);
      throw error;
    }
  }

  async unpin(cid) {
    this.ensureInitialized();
    
    try {
      await this.client.pin.rm(cid);
      logger.debug(`Unpinned content: ${cid}`);
    } catch (error) {
      logger.error(`Failed to unpin content (${cid}):`, error);
      throw error;
    }
  }

  async listPins() {
    this.ensureInitialized();
    
    try {
      const pins = [];
      
      for await (const pin of this.client.pin.ls()) {
        pins.push(pin);
      }
      
      return pins;
    } catch (error) {
      logger.error('Failed to list pins:', error);
      throw error;
    }
  }

  async stat(cid) {
    this.ensureInitialized();
    
    try {
      const stat = await this.client.object.stat(cid);
      return stat;
    } catch (error) {
      logger.error(`Failed to get stat for ${cid}:`, error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return { status: 'unhealthy', error: 'Not initialized' };
      }
      
      const version = await this.client.version();
      const id = await this.client.id();
      
      return {
        status: 'healthy',
        version: version.version,
        peerId: id.id,
        addresses: id.addresses
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }
  }

  async shutdown() {
    if (this.client) {
      logger.info('Shutting down IPFS service...');
      // IPFS HTTP client doesn't need explicit shutdown
      this.client = null;
      this.initialized = false;
    }
  }
}