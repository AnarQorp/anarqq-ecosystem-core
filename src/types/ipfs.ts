/**
 * Type definitions for IPFS integration
 */

export interface UploadOptions {
  spaceDID?: string;
  metadata?: Record<string, any>;
  encrypt?: boolean;
  onProgress?: (progress: number) => void;
}

export interface DownloadOptions {
  spaceDID?: string;
  decrypt?: boolean;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface FileMetadata {
  cid: string;
  name?: string;
  size: number;
  mimeType?: string;
  uploadedAt?: string;
  [key: string]: any;
}

export interface UploadResult {
  cid: string;
  name?: string;
  size: number;
  type?: string;
  metadataCid?: string;
  uploadedAt?: string;
  metadata?: FileMetadata;
}

export interface DownloadResult {
  data: Buffer;
  contentType: string;
  size: number;
  name?: string;
  url?: string;
  revokeUrl?: () => void;
}

export interface FileInfo extends FileMetadata {
  cid: string;
  name: string;
  size: number;
  type: string;
  created: string;
  deals?: any[];
  pins?: Array<{
    status: string;
    [key: string]: any;
  }>;
  isStored?: boolean;
  [key: string]: any;
}

export interface SpaceInfo {
  spaceDID: string;
  agentDID: string;
  delegation?: any;
}
