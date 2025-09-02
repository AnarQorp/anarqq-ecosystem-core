/**
 * IPFS State Storage Service
 * 
 * Provides distributed state storage using IPFS with cryptographic signing
 * and encryption through Qlock integration
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ecosystemIntegration } from '../services/EcosystemIntegration.js';
import { ExecutionState, ExecutionContext } from '../models/FlowDefinition.js';

export interface IPFSClient {
  add(data: any, options?: any): Promise<{ cid: any; size: number }>;
  cat(cid: any): AsyncIterable<Uint8Array>;
  pin: {
    add(cid: any): Promise<void>;
    rm(cid: any): Promise<void>;
    ls(): AsyncIterable<{ cid: any; type: string }>;
  };
  version(): Promise<{ version: string; commit: string; repo: string }>;
  id(): Promise<{ id: string; publicKey: string; addresses: string[] }>;
}

export interface StateRecord {
  executionId: string;
  state: ExecutionState;
  signature: string;
  timestamp: string;
  version: string;
  previousCid?: string;
  checksum: string;
}

export interface StateMetadata {
  executionId: string;
  flowId: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  cid: string;
  encrypted: boolean;
  signedBy: string;
}

export interface CheckpointInfo {
  checkpointId: string;
  executionId: string;
  cid: string;
  timestamp: string;
  stepId: string;
  description?: string;
}

/**
 * IPFS State Storage Service
 */
export class IPFSStateStorage extends EventEmitter {
  private ipfsClient: IPFSClient | null = null;
  private stateMetadata = new Map<string, StateMetadata>();
  private checkpoints = new Map<string, CheckpointInfo[]>();
  private encryptionEnabled = true;
  private signingEnabled = true;

  constructor() {
    super();
    this.initializeIPFS();
  }

  /**
   * Initialize IPFS client
   */
  private async initializeIPFS(): Promise<void> {
    try {
      // Try to import IPFS HTTP client
      const { create } = await import('ipfs-http-client');
      
      // Try multiple IPFS endpoints
      const endpoints = [
        'http://localhost:5001',
        'http://127.0.0.1:5001',
        '/ip4/127.0.0.1/tcp/5001'
      ];

      for (const endpoint of endpoints) {
        try {
          const client = create({ url: endpoint });
          await client.version(); // Test connection
          this.ipfsClient = client;
          
          console.log(`[IPFSStateStorage] ✅ Connected to IPFS at ${endpoint}`);
          
          // Emit connection event
          await qflowEventEmitter.emit('q.qflow.ipfs.connected.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-ipfs-storage',
            actor: 'system',
            data: {
              endpoint,
              nodeId: (await client.id()).id
            }
          });
          
          return;
        } catch (error) {
          console.warn(`[IPFSStateStorage] Failed to connect to ${endpoint}: ${error}`);
        }
      }

      throw new Error('No IPFS endpoints available');

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to initialize IPFS: ${error}`);
      throw error;
    }
  }

  /**
   * Save execution state to IPFS
   */
  async saveState(executionId: string, state: ExecutionState): Promise<string> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      // Create state record
      const stateRecord: StateRecord = {
        executionId,
        state,
        signature: '',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum: ''
      };

      // Calculate checksum
      const stateData = JSON.stringify(state);
      stateRecord.checksum = await this.calculateChecksum(stateData);

      // Sign the state record if signing is enabled
      if (this.signingEnabled) {
        stateRecord.signature = await this.signStateRecord(stateRecord);
      }

      // Encrypt the state record if encryption is enabled
      let recordData = JSON.stringify(stateRecord);
      if (this.encryptionEnabled) {
        recordData = await this.encryptData(recordData);
      }

      // Store in IPFS
      const result = await this.ipfsClient.add(recordData, {
        pin: true, // Pin to ensure persistence
        cidVersion: 1,
        hashAlg: 'sha2-256'
      });

      const cid = result.cid.toString();

      // Update metadata
      const metadata: StateMetadata = {
        executionId,
        flowId: state.flowId,
        version: stateRecord.version,
        createdAt: stateRecord.timestamp,
        updatedAt: stateRecord.timestamp,
        size: result.size,
        cid,
        encrypted: this.encryptionEnabled,
        signedBy: state.context?.triggeredBy || 'system'
      };

      this.stateMetadata.set(executionId, metadata);

      // Emit state saved event
      await qflowEventEmitter.emit('q.qflow.state.saved.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ipfs-storage',
        actor: metadata.signedBy,
        data: {
          executionId,
          flowId: state.flowId,
          cid,
          size: result.size,
          encrypted: this.encryptionEnabled
        }
      });

      console.log(`[IPFSStateStorage] State saved for execution ${executionId}: ${cid}`);
      return cid;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to save state: ${error}`);
      throw error;
    }
  }

  /**
   * Load execution state from IPFS
   */
  async loadState(executionId: string): Promise<ExecutionState> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const metadata = this.stateMetadata.get(executionId);
      if (!metadata) {
        throw new Error(`State metadata not found for execution: ${executionId}`);
      }

      // Retrieve data from IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.ipfsClient.cat(metadata.cid)) {
        chunks.push(chunk);
      }

      let recordData = Buffer.concat(chunks).toString('utf8');

      // Decrypt if encrypted
      if (metadata.encrypted) {
        recordData = await this.decryptData(recordData);
      }

      const stateRecord: StateRecord = JSON.parse(recordData);

      // Verify signature if signing was enabled
      if (this.signingEnabled && stateRecord.signature) {
        const signatureValid = await this.verifyStateRecord(stateRecord);
        if (!signatureValid) {
          throw new Error('State record signature verification failed');
        }
      }

      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(JSON.stringify(stateRecord.state));
      if (calculatedChecksum !== stateRecord.checksum) {
        throw new Error('State record checksum verification failed');
      }

      // Emit state loaded event
      await qflowEventEmitter.emit('q.qflow.state.loaded.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ipfs-storage',
        actor: 'system',
        data: {
          executionId,
          flowId: stateRecord.state.flowId,
          cid: metadata.cid,
          loadedAt: new Date().toISOString()
        }
      });

      console.log(`[IPFSStateStorage] State loaded for execution ${executionId} from ${metadata.cid}`);
      return stateRecord.state;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to load state: ${error}`);
      throw error;
    }
  }

  /**
   * Create checkpoint for execution state
   */
  async createCheckpoint(executionId: string, stepId: string, description?: string): Promise<string> {
    try {
      // Load current state
      const state = await this.loadState(executionId);

      // Save state as checkpoint
      const cid = await this.saveState(executionId, state);

      const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const checkpoint: CheckpointInfo = {
        checkpointId,
        executionId,
        cid,
        timestamp: new Date().toISOString(),
        stepId,
        description
      };

      // Store checkpoint info
      if (!this.checkpoints.has(executionId)) {
        this.checkpoints.set(executionId, []);
      }
      this.checkpoints.get(executionId)!.push(checkpoint);

      // Emit checkpoint created event
      await qflowEventEmitter.emit('q.qflow.checkpoint.created.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ipfs-storage',
        actor: 'system',
        data: {
          checkpointId,
          executionId,
          stepId,
          cid,
          description
        }
      });

      console.log(`[IPFSStateStorage] Checkpoint created: ${checkpointId} -> ${cid}`);
      return checkpointId;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to create checkpoint: ${error}`);
      throw error;
    }
  }

  /**
   * Restore execution state from checkpoint
   */
  async restoreCheckpoint(executionId: string, checkpointId: string): Promise<void> {
    try {
      const checkpoints = this.checkpoints.get(executionId);
      if (!checkpoints) {
        throw new Error(`No checkpoints found for execution: ${executionId}`);
      }

      const checkpoint = checkpoints.find(cp => cp.checkpointId === checkpointId);
      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      // Load state from checkpoint CID
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of this.ipfsClient.cat(checkpoint.cid)) {
        chunks.push(chunk);
      }

      let recordData = Buffer.concat(chunks).toString('utf8');

      // Decrypt if encrypted
      const metadata = this.stateMetadata.get(executionId);
      if (metadata?.encrypted) {
        recordData = await this.decryptData(recordData);
      }

      const stateRecord: StateRecord = JSON.parse(recordData);

      // Update current state metadata to point to checkpoint
      if (metadata) {
        metadata.cid = checkpoint.cid;
        metadata.updatedAt = new Date().toISOString();
        this.stateMetadata.set(executionId, metadata);
      }

      // Emit checkpoint restored event
      await qflowEventEmitter.emit('q.qflow.checkpoint.restored.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ipfs-storage',
        actor: 'system',
        data: {
          checkpointId,
          executionId,
          cid: checkpoint.cid,
          restoredAt: new Date().toISOString()
        }
      });

      console.log(`[IPFSStateStorage] Checkpoint restored: ${checkpointId} from ${checkpoint.cid}`);

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to restore checkpoint: ${error}`);
      throw error;
    }
  }

  /**
   * Get checkpoints for execution
   */
  getCheckpoints(executionId: string): CheckpointInfo[] {
    return this.checkpoints.get(executionId) || [];
  }

  /**
   * Get state metadata
   */
  getStateMetadata(executionId: string): StateMetadata | undefined {
    return this.stateMetadata.get(executionId);
  }

  /**
   * List all stored states
   */
  listStates(): StateMetadata[] {
    return Array.from(this.stateMetadata.values());
  }

  /**
   * Delete state from IPFS (unpin)
   */
  async deleteState(executionId: string): Promise<boolean> {
    try {
      if (!this.ipfsClient) {
        throw new Error('IPFS client not initialized');
      }

      const metadata = this.stateMetadata.get(executionId);
      if (!metadata) {
        return false;
      }

      // Unpin from IPFS
      await this.ipfsClient.pin.rm(metadata.cid);

      // Remove metadata
      this.stateMetadata.delete(executionId);
      this.checkpoints.delete(executionId);

      // Emit state deleted event
      await qflowEventEmitter.emit('q.qflow.state.deleted.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ipfs-storage',
        actor: 'system',
        data: {
          executionId,
          cid: metadata.cid,
          deletedAt: new Date().toISOString()
        }
      });

      console.log(`[IPFSStateStorage] State deleted for execution ${executionId}: ${metadata.cid}`);
      return true;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to delete state: ${error}`);
      return false;
    }
  }

  /**
   * Get IPFS node information
   */
  async getNodeInfo(): Promise<{ id: string; version: string; addresses: string[] } | null> {
    try {
      if (!this.ipfsClient) {
        return null;
      }

      const [id, version] = await Promise.all([
        this.ipfsClient.id(),
        this.ipfsClient.version()
      ]);

      return {
        id: id.id,
        version: version.version,
        addresses: id.addresses
      };

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to get node info: ${error}`);
      return null;
    }
  }

  // Private helper methods

  /**
   * Calculate checksum for data
   */
  private async calculateChecksum(data: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Sign state record using Qlock
   */
  private async signStateRecord(record: StateRecord): Promise<string> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.warn('[IPFSStateStorage] Qlock service not available, skipping signing');
        return '';
      }

      const dataToSign = JSON.stringify({
        executionId: record.executionId,
        checksum: record.checksum,
        timestamp: record.timestamp,
        version: record.version
      });

      const signResult = await qlockService.sign({
        data: dataToSign,
        algorithm: 'ed25519'
      });

      return signResult.signature;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to sign state record: ${error}`);
      return '';
    }
  }

  /**
   * Verify state record signature using Qlock
   */
  private async verifyStateRecord(record: StateRecord): Promise<boolean> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.warn('[IPFSStateStorage] Qlock service not available, skipping verification');
        return true; // Allow if service not available
      }

      const dataToVerify = JSON.stringify({
        executionId: record.executionId,
        checksum: record.checksum,
        timestamp: record.timestamp,
        version: record.version
      });

      const verifyResult = await qlockService.verify({
        data: dataToVerify,
        signature: record.signature,
        algorithm: 'ed25519'
      });

      return verifyResult.valid;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to verify state record: ${error}`);
      return false;
    }
  }

  /**
   * Encrypt data using Qlock
   */
  private async encryptData(data: string): Promise<string> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.warn('[IPFSStateStorage] Qlock service not available, storing unencrypted');
        return data;
      }

      const encryptResult = await qlockService.encrypt({
        data: data,
        algorithm: 'aes-256-gcm'
      });

      return encryptResult.encryptedData;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to encrypt data: ${error}`);
      return data; // Return unencrypted if encryption fails
    }
  }

  /**
   * Decrypt data using Qlock
   */
  private async decryptData(encryptedData: string): Promise<string> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.warn('[IPFSStateStorage] Qlock service not available, assuming unencrypted');
        return encryptedData;
      }

      const decryptResult = await qlockService.decrypt({
        encryptedData: encryptedData,
        algorithm: 'aes-256-gcm'
      });

      return decryptResult.data;

    } catch (error) {
      console.error(`[IPFSStateStorage] Failed to decrypt data: ${error}`);
      throw error;
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stateMetadata.clear();
    this.checkpoints.clear();
    this.removeAllListeners();
    this.ipfsClient = null;
  }
}

// Export singleton instance
export const ipfsStateStorage = new IPFSStateStorage();