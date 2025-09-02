/**
 * IPFS Client Simulator
 * 
 * This module simulates interactions with the IPFS (InterPlanetary File System)
 * for distributed content storage. In a real implementation, this would connect
 * to actual IPFS nodes or a service like Infura/Pinata.
 */

import { Attachment } from '@/types';

// Simulate storage latency
const SIMULATED_LATENCY = 800; // milliseconds

// Mock storage for our "IPFS" simulation - usar localStorage para persistencia
const getIPFSStorage = (): Record<string, {
  content: string | number[]; // Store as string or number array for localStorage
  mimeType: string;
  timestamp: number;
  size: number;
  name?: string;
}> => {
  const stored = localStorage.getItem('ipfs_simulation_storage');
  return stored ? JSON.parse(stored) : {};
};

const setIPFSStorage = (storage: Record<string, any>) => {
  localStorage.setItem('ipfs_simulation_storage', JSON.stringify(storage));
};

/**
 * Generates a mock IPFS CID (Content Identifier)
 * In real IPFS, CIDs are cryptographic hashes of the content
 */
function generateMockCID(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  // Format similar to real IPFS v1 CIDs
  let result = 'Qm';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Upload content to simulated IPFS
 */
export async function uploadToIPFS(
  content: string | ArrayBuffer,
  mimeType: string
): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => {
      const cid = generateMockCID();
      const size = content instanceof ArrayBuffer 
        ? content.byteLength 
        : new Blob([content]).size;

      const storage = getIPFSStorage();
      storage[cid] = {
        content: typeof content === 'string' ? content : Array.from(new Uint8Array(content)),
        mimeType,
        timestamp: Date.now(),
        size
      };
      setIPFSStorage(storage);

      console.log(`[IPFS Simulation] Content uploaded with CID: ${cid}`);
      console.log(`[IPFS Simulation] Total items in storage: ${Object.keys(storage).length}`);
      resolve(cid);
    }, SIMULATED_LATENCY);
  });
}

/**
 * Retrieve content from simulated IPFS
 */
export async function getFromIPFS(cid: string): Promise<{
  content: string | ArrayBuffer;
  mimeType: string;
} | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      const storage = getIPFSStorage();
      const result = storage[cid] || null;
      
      if (result) {
        console.log(`[IPFS Simulation] Content retrieved for CID: ${cid}`);
        
        // Convert back to proper type
        let content: string | ArrayBuffer;
        if (Array.isArray(result.content)) {
          // Convert number array back to ArrayBuffer
          content = new Uint8Array(result.content).buffer;
        } else {
          // It's already a string
          content = result.content;
        }
        
        resolve({
          content,
          mimeType: result.mimeType
        });
      } else {
        console.log(`[IPFS Simulation] Content not found for CID: ${cid}`);
        console.log(`[IPFS Simulation] Available CIDs:`, Object.keys(storage));
        resolve(null);
      }
    }, SIMULATED_LATENCY);
  });
}

/**
 * Upload a file to simulated IPFS (for TestIPFS compatibility)
 */
export async function uploadFile(name: string, content: string): Promise<{ hash: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      const cid = generateMockCID();
      
      const storage = getIPFSStorage();
      storage[cid] = {
        content,
        mimeType: 'text/plain',
        timestamp: Date.now(),
        size: new Blob([content]).size,
        name
      };
      setIPFSStorage(storage);

      console.log(`[IPFS Simulation] File "${name}" uploaded with CID: ${cid}`);
      resolve({ hash: cid });
    }, SIMULATED_LATENCY);
  });
}

/**
 * Download a file from simulated IPFS (for TestIPFS compatibility)
 */
export async function downloadFile(cid: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  return new Promise(resolve => {
    setTimeout(() => {
      const storage = getIPFSStorage();
      const result = storage[cid];
      
      if (result) {
        console.log(`[IPFS Simulation] File downloaded for CID: ${cid}`);
        
        let content = result.content;
        if (Array.isArray(content)) {
          content = String.fromCharCode(...content);
        }
        
        resolve({
          success: true,
          content: typeof content === 'string' ? content : 'Binary content'
        });
      } else {
        console.log(`[IPFS Simulation] File not found for CID: ${cid}`);
        console.log(`[IPFS Simulation] Available CIDs:`, Object.keys(storage));
        resolve({
          success: false,
          error: 'File not found'
        });
      }
    }, SIMULATED_LATENCY);
  });
}

/**
 * Get file info from simulated IPFS (for TestIPFS compatibility)
 */
export async function getFileInfo(cid: string): Promise<{
  exists: boolean;
  name?: string;
  size?: number;
  uploadedAt?: string;
}> {
  return new Promise(resolve => {
    setTimeout(() => {
      const storage = getIPFSStorage();
      const result = storage[cid];
      
      if (result) {
        console.log(`[IPFS Simulation] File info retrieved for CID: ${cid}`);
        resolve({
          exists: true,
          name: result.name || 'Unknown',
          size: result.size,
          uploadedAt: new Date(result.timestamp).toLocaleString()
        });
      } else {
        console.log(`[IPFS Simulation] File info not found for CID: ${cid}`);
        resolve({
          exists: false
        });
      }
    }, SIMULATED_LATENCY / 2);
  });
}

/**
 * Pin content to keep it in IPFS (simulation)
 */
export async function pinContent(cid: string): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => {
      const storage = getIPFSStorage();
      const exists = !!storage[cid];
      if (exists) {
        console.log(`[IPFS Simulation] Content pinned for CID: ${cid}`);
      }
      resolve(exists);
    }, SIMULATED_LATENCY / 2);
  });
}

/**
 * Upload an attachment to IPFS
 */
export async function uploadAttachment(
  file: File | Blob,
  metadata?: Record<string, any>
): Promise<Attachment> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const content = e.target.result;
        const cid = await uploadToIPFS(content, file.type);
        
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          name: (file as File).name || 'attachment',
          mimeType: file.type,
          size: file.size,
          hash: cid.slice(2), // Use part of CID as the hash
          ipfsReference: cid,
          encryptionKey: crypto.randomUUID().slice(0, 16) // Mock encryption key
        };
        
        resolve(attachment);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get storage stats (simulation)
 */
export function getIPFSStats(): {
  totalItems: number;
  totalSize: number;
  oldestTimestamp?: number;
} {
  const storage = getIPFSStorage();
  const items = Object.values(storage);
  return {
    totalItems: items.length,
    totalSize: items.reduce((total, item) => total + item.size, 0),
    oldestTimestamp: items.length > 0 
      ? Math.min(...items.map(item => item.timestamp)) 
      : undefined
  };
}
