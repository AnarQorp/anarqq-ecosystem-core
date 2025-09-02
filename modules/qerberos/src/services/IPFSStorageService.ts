/**
 * IPFS Storage Service
 * Handles immutable storage of audit events and security data in IPFS
 */

import { create as createIPFS, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '../utils/logger';
import { IPFSConfig } from '../types';

export class IPFSStorageService {
  private client: IPFSHTTPClient | null = null;
  private isConnected = false;
  private mockStorage = new Map<string, any>(); // For standalone mode

  constructor(private config: IPFSConfig) {}

  /**
   * Initialize IPFS connection
   */
  async initialize(): Promise<void> {
    try {
      // Try to connect to IPFS
      this.client = createIPFS({
        url: this.config.apiUrl,
        timeout: this.config.timeout
      });

      // Test connection
      await this.client.version();
      this.isConnected = true;
      
      logger.info('IPFS storage service initialized', {
        apiUrl: this.config.apiUrl,
        gatewayUrl: this.config.gatewayUrl
      });

    } catch (error) {
      logger.warn('Failed to connect to IPFS, using mock storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        apiUrl: this.config.apiUrl
      });
      
      // Fall back to mock storage for standalone mode
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Store data in IPFS
   */
  async store(path: string, data: any): Promise<string> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      
      if (this.isConnected && this.client) {
        // Store in real IPFS
        const result = await this.client.add(jsonData, {
          pin: true,
          timeout: this.config.timeout
        });
        
        const cid = result.cid.toString();
        
        logger.debug('Data stored in IPFS', {
          path,
          cid,
          size: jsonData.length
        });
        
        return cid;
      } else {
        // Store in mock storage
        const mockCid = this.generateMockCID(jsonData);
        this.mockStorage.set(mockCid, data);
        this.mockStorage.set(path, data); // Also store by path for retrieval
        
        logger.debug('Data stored in mock IPFS storage', {
          path,
          mockCid,
          size: jsonData.length
        });
        
        return mockCid;
      }

    } catch (error) {
      logger.error('Failed to store data in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path
      });
      throw error;
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieve(pathOrCid: string): Promise<any> {
    try {
      if (this.isConnected && this.client) {
        // Retrieve from real IPFS
        const chunks: Uint8Array[] = [];
        
        for await (const chunk of this.client.cat(pathOrCid, {
          timeout: this.config.timeout
        })) {
          chunks.push(chunk);
        }
        
        const data = Buffer.concat(chunks).toString('utf8');
        const parsedData = JSON.parse(data);
        
        logger.debug('Data retrieved from IPFS', {
          pathOrCid,
          size: data.length
        });
        
        return parsedData;
      } else {
        // Retrieve from mock storage
        const data = this.mockStorage.get(pathOrCid);
        
        if (!data) {
          throw new Error(`Data not found: ${pathOrCid}`);
        }
        
        logger.debug('Data retrieved from mock IPFS storage', {
          pathOrCid
        });
        
        return data;
      }

    } catch (error) {
      logger.error('Failed to retrieve data from IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathOrCid
      });
      throw error;
    }
  }

  /**
   * Check if data exists in IPFS
   */
  async exists(pathOrCid: string): Promise<boolean> {
    try {
      if (this.isConnected && this.client) {
        // Check in real IPFS
        try {
          const stat = await this.client.object.stat(pathOrCid, {
            timeout: this.config.timeout
          });
          return stat !== null;
        } catch {
          return false;
        }
      } else {
        // Check in mock storage
        return this.mockStorage.has(pathOrCid);
      }

    } catch (error) {
      logger.error('Failed to check data existence in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathOrCid
      });
      return false;
    }
  }

  /**
   * Pin data in IPFS
   */
  async pin(cid: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        // Pin in real IPFS
        await this.client.pin.add(cid, {
          timeout: this.config.timeout
        });
        
        logger.debug('Data pinned in IPFS', { cid });
      } else {
        // Mock pinning - just log it
        logger.debug('Data pinned in mock IPFS storage', { cid });
      }

    } catch (error) {
      logger.error('Failed to pin data in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cid
      });
      throw error;
    }
  }

  /**
   * Unpin data in IPFS
   */
  async unpin(cid: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        // Unpin in real IPFS
        await this.client.pin.rm(cid, {
          timeout: this.config.timeout
        });
        
        logger.debug('Data unpinned in IPFS', { cid });
      } else {
        // Mock unpinning - just log it
        logger.debug('Data unpinned in mock IPFS storage', { cid });
      }

    } catch (error) {
      logger.error('Failed to unpin data in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cid
      });
      throw error;
    }
  }

  /**
   * List pinned data
   */
  async listPinned(): Promise<string[]> {
    try {
      if (this.isConnected && this.client) {
        // List pinned in real IPFS
        const pinnedCids: string[] = [];
        
        for await (const pin of this.client.pin.ls()) {
          pinnedCids.push(pin.cid.toString());
        }
        
        logger.debug('Listed pinned data in IPFS', { count: pinnedCids.length });
        return pinnedCids;
      } else {
        // List mock pinned data
        const mockCids = Array.from(this.mockStorage.keys()).filter(key => 
          key.startsWith('Qm') // Mock CIDs start with Qm
        );
        
        logger.debug('Listed pinned data in mock IPFS storage', { count: mockCids.length });
        return mockCids;
      }

    } catch (error) {
      logger.error('Failed to list pinned data in IPFS', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get IPFS node info
   */
  async getNodeInfo(): Promise<{
    id: string;
    version: string;
    addresses: string[];
    connected: boolean;
  }> {
    try {
      if (this.isConnected && this.client) {
        // Get real IPFS node info
        const [id, version] = await Promise.all([
          this.client.id(),
          this.client.version()
        ]);
        
        return {
          id: id.id,
          version: version.version,
          addresses: id.addresses.map(addr => addr.toString()),
          connected: true
        };
      } else {
        // Return mock node info
        return {
          id: 'QmMockNodeId123456789',
          version: '0.20.0-mock',
          addresses: ['/ip4/127.0.0.1/tcp/4001'],
          connected: false
        };
      }

    } catch (error) {
      logger.error('Failed to get IPFS node info', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        id: 'unknown',
        version: 'unknown',
        addresses: [],
        connected: false
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    objectCount: number;
    pinnedCount: number;
    repoSize: number;
  }> {
    try {
      if (this.isConnected && this.client) {
        // Get real IPFS stats
        const repoStat = await this.client.repo.stat();
        const pinnedCids = await this.listPinned();
        
        return {
          totalSize: repoStat.repoSize,
          objectCount: repoStat.numObjects,
          pinnedCount: pinnedCids.length,
          repoSize: repoStat.repoSize
        };
      } else {
        // Return mock stats
        const mockData = Array.from(this.mockStorage.values());
        const totalSize = mockData.reduce((size, data) => {
          return size + JSON.stringify(data).length;
        }, 0);
        
        return {
          totalSize,
          objectCount: mockData.length,
          pinnedCount: mockData.length,
          repoSize: totalSize
        };
      }

    } catch (error) {
      logger.error('Failed to get IPFS storage stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalSize: 0,
        objectCount: 0,
        pinnedCount: 0,
        repoSize: 0
      };
    }
  }

  /**
   * Close IPFS connection
   */
  async close(): Promise<void> {
    try {
      if (this.client) {
        // Note: ipfs-http-client doesn't have a close method
        // The connection will be closed when the process exits
        this.client = null;
        this.isConnected = false;
        
        logger.info('IPFS storage service closed');
      }

    } catch (error) {
      logger.error('Error closing IPFS storage service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate mock CID for testing
   */
  private generateMockCID(data: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Create a mock CID that looks like a real one
    return `Qm${hash.substring(0, 44)}`;
  }

  /**
   * Check if IPFS is connected
   */
  isIPFSConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get mock storage size (for testing)
   */
  getMockStorageSize(): number {
    return this.mockStorage.size;
  }

  /**
   * Clear mock storage (for testing)
   */
  clearMockStorage(): void {
    this.mockStorage.clear();
    logger.debug('Mock IPFS storage cleared');
  }
}