import axios from 'axios';
import { getAuthToken } from './auth';

// Create axios instance with base URL and auth header
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Upload a file to IPFS via the backend
 * @param file - The file to upload
 * @param options - Upload options
 * @returns Promise with upload result
 */
export async function uploadToIPFS(
  file: File,
  options: {
    spaceDID?: string;
    metadata?: Record<string, any>;
    onProgress?: (progress: number) => void;
  } = {}
) {
  const formData = new FormData();
  formData.append('file', file);
  
  if (options.spaceDID) {
    formData.append('spaceDID', options.spaceDID);
  }
  
  if (options.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }
  
  const response = await api.post('/ipfs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (options.onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        options.onProgress(percentCompleted);
      }
    },
  });
  
  return response.data;
}

/**
 * Download a file from IPFS via the backend
 * @param cid - The CID of the file to download
 * @param options - Download options
 * @returns Promise with file data and metadata
 */
export async function downloadFromIPFS(
  cid: string,
  options: {
    spaceDID?: string;
    decrypt?: boolean;
  } = {}
) {
  const response = await api.get(`/ipfs/download/${cid}`, {
    responseType: 'arraybuffer',
    params: {
      spaceDID: options.spaceDID,
      decrypt: options.decrypt,
    },
  });
  
  // Get filename from content-disposition header or use CID as fallback
  const contentDisposition = response.headers['content-disposition'];
  let filename = `file-${cid}`;
  
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }
  
  // Get content type from response headers or default to binary
  const contentType = response.headers['content-type'] || 'application/octet-stream';
  
  return {
    data: response.data,
    filename,
    contentType,
  };
}

/**
 * Get file info from IPFS via the backend
 * @param cid - The CID of the file
 * @param spaceDID - Optional space DID
 * @returns Promise with file information
 */
export async function getFileInfo(cid: string, spaceDID?: string) {
  const response = await api.get(`/ipfs/info/${cid}`, {
    params: { spaceDID },
  });
  return response.data;
}

/**
 * Create a new IPFS space
 * @param alias - Alias for the space
 * @returns Promise with space information
 */
export async function createSpace(alias: string) {
  const response = await api.post('/ipfs/space', { alias });
  return response.data;
}

/**
 * Authorize a space for an agent
 * @param spaceDID - The space DID
 * @param agentDID - The agent DID
 * @param delegation - The delegation object
 */
export async function authorizeSpace(
  spaceDID: string,
  agentDID: string,
  delegation: any
) {
  await api.post('/ipfs/authorize', {
    spaceDID,
    agentDID,
    delegation,
  });
}

/**
 * Update file metadata
 * @param cid - The CID of the file
 * @param metadata - The metadata to update
 * @param spaceDID - Optional space DID
 * @returns Promise with updated file information
 */
export async function updateFileMetadata(
  cid: string,
  metadata: Record<string, any>,
  spaceDID?: string
) {
  const response = await api.patch(
    `/ipfs/metadata/${cid}`,
    { metadata },
    { params: { spaceDID } }
  );
  return response.data;
}

/**
 * Delete a file from IPFS
 * @param cid - The CID of the file to delete
 * @param spaceDID - Optional space DID
 */
export async function deleteFile(cid: string, spaceDID?: string) {
  await api.delete(`/ipfs/delete/${cid}`, {
    params: { spaceDID },
  });
}

export default {
  uploadToIPFS,
  downloadFromIPFS,
  getFileInfo,
  createSpace,
  authorizeSpace,
  updateFileMetadata,
  deleteFile,
};
