/**
 * Qsocial File Upload API Service
 * 
 * Frontend service for uploading files to Storj with IPFS CID generation
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';

export interface FileUploadResult {
  success: boolean;
  message?: string;
  file?: {
    fileId: string;
    originalName: string;
    storjUrl: string;
    storjKey: string;
    ipfsCid?: string;
    filecoinCid?: string;
    fileSize: number;
    contentType: string;
    thumbnailUrl?: string;
    uploadedAt: string;
  };
  error?: string;
}

export interface MultipleFileUploadResult {
  success: boolean;
  message?: string;
  files?: Array<{
    originalName: string;
    success: boolean;
    fileId?: string;
    storjUrl?: string;
    storjKey?: string;
    ipfsCid?: string;
    filecoinCid?: string;
    fileSize?: number;
    contentType?: string;
    thumbnailUrl?: string;
    error?: string;
  }>;
  stats?: {
    total: number;
    success: number;
    failed: number;
  };
  error?: string;
}

export interface FileMetadata {
  success: boolean;
  metadata?: {
    fileId: string;
    storjKey: string;
    contentType: string;
    contentLength: number;
    lastModified: string;
    etag: string;
    originalName?: string;
    uploadedBy?: string;
    uploadedAt?: string;
  };
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresIn?: number;
  expiresAt?: string;
  error?: string;
}

export interface UserFilesResult {
  success: boolean;
  files?: Array<{
    fileId: string;
    storjKey: string;
    size: number;
    lastModified: string;
    etag: string;
  }>;
  isTruncated?: boolean;
  nextContinuationToken?: string;
  error?: string;
}

export interface IPFSInfo {
  success: boolean;
  ipfs?: {
    fileId: string;
    cid: string;
    gatewayUrls: string[];
    filecoinStatus: string;
    filecoinCid: string;
  };
  error?: string;
}

export interface HealthCheckResult {
  success: boolean;
  health?: {
    storj: boolean;
    ipfs: boolean;
    bucket: boolean;
    timestamp: string;
  };
  message?: string;
  error?: string;
}

/**
 * Get authentication headers
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * Get authentication headers for multipart uploads
 */
function getMultipartAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * Upload single file
 */
export async function uploadFile(file: File): Promise<FileUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/qsocial/files/upload`, {
      method: 'POST',
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(files: File[]): Promise<MultipleFileUploadResult> {
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE}/qsocial/files/upload-multiple`, {
      method: 'POST',
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload multiple files error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Download file
 */
export async function downloadFile(fileId: string): Promise<Blob | null> {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/qsocial/files/${fileId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Download file error:', error);
    return null;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/${fileId}/metadata`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get file metadata error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Generate signed URL for direct access
 */
export async function generateSignedUrl(fileId: string, expiresIn: number = 3600): Promise<SignedUrlResult> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/${fileId}/signed-url`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ expiresIn }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Generate signed URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Delete file
 */
export async function deleteFile(fileId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/${fileId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * List user files
 */
export async function getUserFiles(maxKeys: number = 100): Promise<UserFilesResult> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/my-files?maxKeys=${maxKeys}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get user files error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Get IPFS information for file
 */
export async function getFileIPFSInfo(fileId: string): Promise<IPFSInfo> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/${fileId}/ipfs`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get IPFS info error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Health check for file storage service
 */
export async function checkStorageHealth(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`${API_BASE}/qsocial/files/health`, {
      method: 'GET',
    });

    return await response.json();
  } catch (error) {
    console.error('Storage health check error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type icon name based on content type
 */
export function getFileTypeIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'music';
  if (contentType === 'application/pdf') return 'file-text';
  return 'file';
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(contentType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'text/plain'
  ];
  
  return supportedTypes.includes(contentType);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, maxSize: number = 50 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!isFileTypeSupported(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no soportado: ${file.type}`
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Archivo demasiado grande: ${formatFileSize(file.size)} (máximo ${formatFileSize(maxSize)})`
    };
  }
  
  return { valid: true };
}