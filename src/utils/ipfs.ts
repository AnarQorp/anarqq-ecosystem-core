// IPFS utilities for AnarQ & Q ecosystem
// This module provides high-level utilities for working with IPFS via Storacha with UCAN

import { getCurrentEnvironment } from './environment';
import { useStorachaClient } from '@/services/ucanService';
import { 
  UploadOptions, 
  DownloadOptions, 
  UploadResult, 
  DownloadResult,
  FileInfo,
  SpaceInfo,
  FileMetadata
} from '@/types/ipfs';

// Import the Storacha client type
type StorachaClient = {
  uploadFile: (file: File, options: { 
    onProgress?: (progress: number) => void;
    metadata?: Record<string, any>;
  }) => Promise<string>;
  getGatewayUrl: (cid: string) => string;
};

/**
 * Upload a file to IPFS using Storacha client with UCAN
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    console.log(`[IPFS] Uploading file with UCAN: ${file.name}`);
    
    const { client, getOrCreateSpace } = useStorachaClient();
    
    if (!client) {
      throw new Error('Storacha client not initialized');
    }
    
    // Ensure we have a space with UCAN delegation
    const spaceDID = await getOrCreateSpace();
    
    // Track upload progress
    let lastProgress = 0;
    const handleProgress = (progress: number) => {
      // Throttle progress updates to reduce re-renders
      if (Math.abs(progress - lastProgress) > 5 || progress === 100) {
        lastProgress = progress;
        options.onProgress?.(progress);
      }
    };
    
    // Upload the file directly using Storacha client
    const storachaClient = client as unknown as StorachaClient;
    const cid = await storachaClient.uploadFile(file, {
      onProgress: handleProgress,
      metadata: {
        ...options.metadata,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });
    
    console.log(`[IPFS] File uploaded with CID: ${cid}`);
    
    const result: UploadResult = {
      cid: cid.toString(),
      size: file.size,
      name: file.name,
      // Add any additional required fields from UploadResult type
    };
    
    return result;
  } catch (error) {
    console.error('[IPFS] Error uploading file with UCAN:', error);
    
    // Handle 403 Forbidden (likely expired/revoked UCAN)
    if (error && typeof error === 'object' && 'response' in error && 
        (error as any).response?.status === 403) {
      // The client will be reinitialized on next use
      throw new Error('Your session has expired. Please try again.');
    }
    
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Download a file from IPFS using Storacha gateway
 */
export async function downloadFile(
  cid: string,
  options: DownloadOptions = {}
): Promise<DownloadResult & { url: string; revokeUrl: () => void }> {
  try {
    console.log(`[IPFS] Downloading file with CID: ${cid}`);
    
    const { client } = useStorachaClient();
    
    if (!client) {
      throw new Error('Storacha client not initialized');
    }
    
    // Get the gateway URL for the file
    const storachaClient = client as unknown as StorachaClient;
    const gatewayUrl = storachaClient.getGatewayUrl(cid);
    
    // Fetch the file with progress tracking
    const response = await fetch(gatewayUrl);
    
    if (!response.ok) {
      // Handle 403 Forbidden (likely expired/revoked UCAN)
      if (response.status === 403) {
        // The client will be reinitialized on next use
        throw new Error('Your session has expired. Please refresh the page and try again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Create a URL for the downloaded file
    const url = URL.createObjectURL(
      new Blob([data], { type: contentType })
    );
    
    // Create result object that matches DownloadResult and includes URL helpers
    const result: DownloadResult & { url: string; revokeUrl: () => void } = {
      data: Buffer.from(data),
      contentType,
      size: data.byteLength,
      name: options.metadata?.name || cid,
      url,
      revokeUrl: () => URL.revokeObjectURL(url)
    };
    
    return result;
  } catch (error) {
    console.error(`[IPFS] Error downloading file ${cid}:`, error);
    
    // Rethrow with user-friendly message
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Failed to connect to the storage network. Please check your internet connection.');
    }
    
    throw new Error(
      `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file information from IPFS using Storacha client
 */
export async function getFileInfo(cid: string, spaceDID?: string): Promise<FileInfo> {
  try {
    console.log(`[IPFS] Getting info for CID: ${cid}`);
    
    const { client } = useStorachaClient();
    
    if (!client) {
      throw new Error('Storacha client not initialized');
    }
    
    // Get file info from the gateway
    const storachaClient = client as unknown as StorachaClient;
    const response = await fetch(`${storachaClient.getGatewayUrl(cid)}?format=json`);
    
    if (!response.ok) {
      if (response.status === 403) {
        // The client will be reinitialized on next use
        throw new Error('Your session has expired. Please refresh the page and try again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const fileInfo = await response.json();
    
    // Create a complete FileInfo object with all required fields
    const fileInfoResult: FileInfo = {
      cid,
      name: fileInfo.name || cid,
      size: fileInfo.size || 0,
      type: fileInfo.type || 'application/octet-stream',
      created: fileInfo.created || new Date().toISOString(),
      // Add any additional metadata
      ...(fileInfo.metadata || {}),
      // Ensure required fields have default values
      deals: fileInfo.deals || [],
      pins: fileInfo.pins || [],
      isStored: fileInfo.isStored ?? true,
    };
    
    return fileInfoResult;
  } catch (error) {
    console.error(`[IPFS] Error getting file info for ${cid}:`, error);
    
    // Return basic info if we can't fetch full metadata
    if (error.message.includes('Failed to fetch')) {
      return {
        cid,
        name: cid,
        size: 0,
        type: 'application/octet-stream',
        created: new Date().toISOString(),
      };
    }
    
    throw new Error(
      `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a public gateway URL for a CID
 */
export function getPublicGatewayUrl(cid: string, path: string = ''): string {
  // Default to the public IPFS gateway
  const gateway = 'https://ipfs.io/ipfs';
  return `${gateway}/${cid}${path ? `/${path}` : ''}`;
}

/**
 * Upload any data to IPFS
 */
export async function uploadToIPFS<T = any>(
  data: T,
  options: Omit<UploadOptions, 'metadata'> & { filename?: string } = {}
): Promise<UploadResult> {
  try {
    let file: File;
    
    if (data instanceof File) {
      file = data;
    } else if (data instanceof Blob) {
      file = new File([data], options.filename || `blob-${Date.now()}`, {
        type: data.type || 'application/octet-stream'
      });
    } else if (typeof data === 'string') {
      file = new File([data], options.filename || 'data.txt', {
        type: 'text/plain'
      });
    } else {
      const json = JSON.stringify(data);
      file = new File([json], options.filename || 'data.json', {
        type: 'application/json'
      });
    }
    
    return await uploadFile(file, options);
  } catch (error) {
    console.error('[IPFS] Error in uploadToIPFS:', error);
    throw new Error(
      `Error in uploadToIPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get data from IPFS by CID
 */
export async function getFromIPFS<T = any>(
  cid: string,
  options: DownloadOptions = {}
): Promise<T> {
  try {
    console.log(`[IPFS] Getting data from IPFS: ${cid}`);
    
    const { data, contentType } = await ipfsService.downloadFile(cid, options);
    
    // Try to parse based on content type
    if (contentType.includes('application/json')) {
      const text = new TextDecoder().decode(data);
      return JSON.parse(text) as T;
    } else if (contentType.startsWith('text/')) {
      return new TextDecoder().decode(data) as unknown as T;
    }
    
    // For binary data, return as ArrayBuffer
    return data as unknown as T;
  } catch (error) {
    console.error(`[IPFS] Error getting data from IPFS (${cid}):`, error);
    throw new Error(
      `Failed to get data from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export the IPFS service with all methods
export default {
  // Core file operations
  uploadFile,
  downloadFile,
  getFileInfo,
  getPublicGatewayUrl,
  
  // Helper methods
  isUCANAvailable: () => {
    try {
      const client = useStorachaClient();
      return !!client.client;
    } catch (error) {
      return false;
    }
  },
  
  getCurrentSpace: () => {
    try {
      const client = useStorachaClient();
      return client.currentSpace?.() || null;
    } catch (error) {
      console.error('Error getting current space:', error);
      return null;
    }
  },
  
  // Space management
  createSpace: async (alias: string): Promise<SpaceInfo> => {
    try {
      // In a real implementation, this would call the backend API
      // to create a new space with the given alias
      const response = await fetch('/api/ipfs/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: alias }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create space: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error creating space:', error);
      throw new Error(
        `Failed to create space: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
  
  authorizeSpace: async (spaceDID: string, agentDID: string, delegation: any): Promise<void> => {
    try {
      // In a real implementation, this would call the backend API
      // to authorize the space for the specified agent
      const response = await fetch(`/api/ipfs/spaces/${encodeURIComponent(spaceDID)}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentDID, delegation }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to authorize space: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error authorizing space:', error);
      throw new Error(
        `Failed to authorize space: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
  
  // Utility methods for backward compatibility
  uploadToIPFS: async <T = any>(data: T, options: UploadOptions = {}): Promise<UploadResult> => {
    if (data instanceof File) {
      return uploadFile(data, options);
    }
    
    // For non-File data, convert to Blob and upload
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], 'data.json', { type: 'application/json' });
    return uploadFile(file, options);
  },
  
  getFromIPFS: async <T = any>(cid: string, options: DownloadOptions = {}): Promise<T> => {
    const result = await downloadFile(cid, options);
    
    try {
      // Try to parse as JSON if content type is JSON
      if (result.contentType.includes('application/json')) {
        return JSON.parse(Buffer.from(result.data).toString('utf-8'));
      }
      // For text content
      if (result.contentType.startsWith('text/')) {
        return Buffer.from(result.data).toString('utf-8') as unknown as T;
      }
      // For binary data, return as is
      return result.data as unknown as T;
    } catch (error) {
      console.error(`Error parsing IPFS data for CID ${cid}:`, error);
      throw new Error(
        `Failed to parse IPFS data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};
