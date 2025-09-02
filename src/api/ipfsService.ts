import axios from 'axios';
import { getAuthToken } from '../lib/auth';
import { 
  UploadOptions, 
  DownloadOptions, 
  UploadResult, 
  DownloadResult, 
  FileInfo, 
  SpaceInfo,
  FileMetadata
} from '../types/ipfs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with auth headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to inject auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Create a new space for a user
 */
export const createSpace = async (alias: string): Promise<SpaceInfo> => {
  try {
    const response = await api.post('/ipfs/space', { alias });
    return response.data;
  } catch (error) {
    console.error('[IPFS Service] Error creating space:', error);
    throw error;
  }
};

/**
 * Authorize a space for a user
 */
export const authorizeSpace = async (
  spaceDID: string,
  agentDID: string,
  delegation: string
): Promise<void> => {
  try {
    await api.post('/ipfs/authorize', {
      spaceDID,
      agentDID,
      delegation,
    });
  } catch (error) {
    console.error(`Error authorizing space ${spaceDID} for agent ${agentDID}:`, error);
    throw error;
  }
};

/**
 * Upload a file to IPFS
 */
export const uploadFile = async (file: File, options: UploadOptions = {}): Promise<UploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.spaceDID) {
      formData.append('spaceDID', options.spaceDID);
    }
    
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    // Add encryption flag if needed
    if (options.encrypt) {
      formData.append('encrypt', 'true');
    }
    
    const response = await api.post<UploadResult>('/ipfs/upload', formData, {
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
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
};

/**
 * Download a file from IPFS
 */
export const downloadFile = async (cid: string, options: DownloadOptions = {}): Promise<DownloadResult> => {
  try {
    const response = await api.get<ArrayBuffer>(`/ipfs/download/${cid}`, {
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
  } catch (error) {
    console.error(`Error downloading file ${cid} from IPFS:`, error);
    throw error;
  }
};

/**
 * Get file info from IPFS
 */
export const getFileInfo = async (cid: string, spaceDID?: string): Promise<FileInfo> => {
  try {
    const response = await api.get<FileInfo>(`/ipfs/info/${cid}`, {
      params: { spaceDID },
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting info for file ${cid}:`, error);
    throw error;
  }
};

/**
 * Update file metadata
 */
export const updateFileMetadata = async (
  cid: string, 
  metadata: Partial<FileMetadata>,
  spaceDID?: string
): Promise<FileInfo> => {
  try {
    const response = await api.patch<FileInfo>(
      `/ipfs/metadata/${cid}`, 
      { metadata },
      { params: { spaceDID } }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating metadata for file ${cid}:`, error);
    throw error;
  }
};

/**
 * Delete a file from IPFS
 */
export const deleteFile = async (cid: string, spaceDID?: string): Promise<void> => {
  try {
    await api.delete(`/ipfs/delete/${cid}`, {
      params: { spaceDID },
    });
  } catch (error) {
    console.error(`Error deleting file ${cid}:`, error);
    throw error;
  }
};

/**
 * Get file content as text
 */
export const getFileAsText = async (cid: string, options: {
  spaceDID?: string;
  decrypt?: boolean;
} = {}) => {
  try {
    const response = await api.get(`/ipfs/content/${cid}`, {
      params: {
        spaceDID: options.spaceDID,
        decrypt: options.decrypt,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error getting file content for ${cid}:`, error);
    throw error;
  }
};

export default {
  createSpace,
  authorizeSpace,
  uploadFile,
  downloadFile,
  getFileInfo,
  getFileAsText,
};
