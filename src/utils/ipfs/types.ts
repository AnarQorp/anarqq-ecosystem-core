/**
 * Types for IPFS integration with Storacha
 */

// Upload result type
export interface UploadResult<T = any> {
  success: boolean;
  cid?: string;
  url?: string;
  metadata?: T;
  file?: File;
  error?: Error;
}

// Download result type
export interface DownloadResult<T = any> {
  success: boolean;
  data?: ArrayBuffer | string;
  filename?: string;
  contentType?: string;
  metadata?: T;
  error?: Error;
  cid?: string;
}

// Blob URL result type
export interface BlobUrlResult<T = any> {
  success: boolean;
  url?: string;
  filename?: string;
  contentType?: string;
  metadata?: T;
  error?: Error;
  cid?: string;
  revoke?: () => void;
}

// IPFS space type
export interface IPFSSpace {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Space authorization options
export interface SpaceAuthorizationOptions {
  read: boolean;
  write: boolean;
  admin: boolean;
}

// File metadata type
export interface FileMetadata {
  name?: string;
  size?: number;
  type?: string;
  lastModified?: number;
  [key: string]: any;
}

// Upload options
export interface UploadOptions {
  spaceDID?: string;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

// Download options
export interface DownloadOptions {
  spaceDID?: string;
  decrypt?: boolean;
}

// Space creation options
export interface CreateSpaceOptions {
  name: string;
  description?: string;
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

// Authorization result
export interface AuthorizationResult {
  success: boolean;
  delegation?: any;
  error?: Error;
}
