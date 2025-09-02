/**
 * Ecosystem File Service - Frontend Integration
 * 
 * Integrates the AnarQ&Q ecosystem file system with Qsocial frontend services.
 * Provides a unified interface for file operations with ecosystem compliance.
 */

import { 
  uploadFile, 
  uploadMultipleFiles, 
  downloadFile, 
  getFileMetadata, 
  generateSignedUrl, 
  deleteFile, 
  getUserFiles, 
  getFileIPFSInfo, 
  checkStorageHealth,
  FileUploadResult,
  MultipleFileUploadResult,
  FileMetadata,
  SignedUrlResult,
  UserFilesResult,
  IPFSInfo,
  HealthCheckResult
} from '../../api/qsocial-files';

export interface EcosystemFileUploadOptions {
  visibility?: 'public' | 'dao-only' | 'private';
  daoId?: string;
  accessRules?: Record<string, any>;
  generateThumbnail?: boolean;
  compressImage?: boolean;
}

export interface EcosystemUploadedFile {
  fileId: string;
  originalName: string;
  storjUrl: string;
  storjKey: string;
  fileSize: number;
  contentType: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  ecosystem: {
    qonsent: {
      profileId: string;
      visibility: string;
      encryptionLevel: string;
    };
    qlock: {
      encrypted: boolean;
      encryptionLevel: string;
    };
    ipfs: {
      cid?: string;
      generated: boolean;
    };
    qindex: {
      indexId: string;
      searchable: boolean;
    };
    qnet: {
      routingId: string;
      routedUrl: string;
      accessToken?: string;
    };
    filecoin?: {
      filecoinCid?: string;
      dealStatus?: string;
    };
  };
  processingTime: number;
}

export interface FileSearchOptions {
  query?: string;
  contentType?: string;
  visibility?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface FileSearchResult {
  results: Array<{
    indexId: string;
    cid: string;
    originalName: string;
    contentType: string;
    fileSize: number;
    visibility: string;
    uploadedBy: string;
    uploadedAt: string;
    tags: string[];
    downloadCount: number;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Ecosystem File Service Class
 */
export class EcosystemFileService {
  private static instance: EcosystemFileService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EcosystemFileService {
    if (!this.instance) {
      this.instance = new EcosystemFileService();
    }
    return this.instance;
  }

  /**
   * Upload single file with ecosystem integration
   */
  async uploadFile(
    file: File, 
    options: EcosystemFileUploadOptions = {}
  ): Promise<EcosystemUploadedFile | null> {
    try {
      const result = await uploadFile(file);
      
      if (result.success && result.file) {
        return this.transformUploadResult(result.file);
      }
      
      console.error('File upload failed:', result.error);
      return null;
    } catch (error) {
      console.error('Ecosystem file upload error:', error);
      return null;
    }
  }

  /**
   * Upload multiple files with ecosystem integration
   */
  async uploadMultipleFiles(
    files: File[], 
    options: EcosystemFileUploadOptions = {}
  ): Promise<EcosystemUploadedFile[]> {
    try {
      const result = await uploadMultipleFiles(files);
      
      if (result.success && result.files) {
        return result.files
          .filter(f => f.success && f.fileId)
          .map(f => this.transformUploadResult({
            fileId: f.fileId!,
            originalName: f.originalName,
            storjUrl: f.storjUrl!,
            storjKey: f.storjKey!,
            fileSize: f.fileSize!,
            contentType: f.contentType!,
            thumbnailUrl: f.thumbnailUrl,
            uploadedAt: new Date().toISOString(),
            ecosystem: f.ecosystem || this.createMockEcosystemData()
          }));
      }
      
      console.error('Multiple file upload failed:', result.error);
      return [];
    } catch (error) {
      console.error('Ecosystem multiple file upload error:', error);
      return [];
    }
  }

  /**
   * Download file with access control
   */
  async downloadFile(fileId: string): Promise<Blob | null> {
    try {
      return await downloadFile(fileId);
    } catch (error) {
      console.error('File download error:', error);
      return null;
    }
  }

  /**
   * Get file metadata with ecosystem information
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const result = await getFileMetadata(fileId);
      return result.success ? result : null;
    } catch (error) {
      console.error('Get file metadata error:', error);
      return null;
    }
  }

  /**
   * Generate signed URL for file access
   */
  async generateSignedUrl(fileId: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const result = await generateSignedUrl(fileId, expiresIn);
      return result.success ? result.signedUrl || null : null;
    } catch (error) {
      console.error('Generate signed URL error:', error);
      return null;
    }
  }

  /**
   * Delete file with ecosystem cleanup
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const result = await deleteFile(fileId);
      return result.success;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  /**
   * Get user files with ecosystem metadata
   */
  async getUserFiles(maxKeys: number = 100): Promise<UserFilesResult | null> {
    try {
      const result = await getUserFiles(maxKeys);
      return result.success ? result : null;
    } catch (error) {
      console.error('Get user files error:', error);
      return null;
    }
  }

  /**
   * Get IPFS information for file
   */
  async getFileIPFSInfo(fileId: string): Promise<IPFSInfo | null> {
    try {
      const result = await getFileIPFSInfo(fileId);
      return result.success ? result : null;
    } catch (error) {
      console.error('Get IPFS info error:', error);
      return null;
    }
  }

  /**
   * Search files in the ecosystem
   */
  async searchFiles(options: FileSearchOptions): Promise<FileSearchResult | null> {
    try {
      const params = new URLSearchParams();
      
      if (options.query) params.append('query', options.query);
      if (options.contentType) params.append('contentType', options.contentType);
      if (options.visibility) params.append('visibility', options.visibility);
      if (options.tags) params.append('tags', options.tags.join(','));
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const response = await fetch(`/api/qsocial/files/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? {
          results: result.results,
          total: result.pagination.total,
          limit: result.pagination.limit,
          offset: result.pagination.offset,
          hasMore: result.pagination.hasMore
        } : null;
      }

      return null;
    } catch (error) {
      console.error('Search files error:', error);
      return null;
    }
  }

  /**
   * Check ecosystem health
   */
  async checkEcosystemHealth(): Promise<HealthCheckResult | null> {
    try {
      const response = await fetch('/api/qsocial/files/ecosystem/health');
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ecosystem health check error:', error);
      return null;
    }
  }

  /**
   * Get ecosystem statistics
   */
  async getEcosystemStats(): Promise<any | null> {
    try {
      const response = await fetch('/api/qsocial/files/ecosystem/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.ecosystem : null;
      }

      return null;
    } catch (error) {
      console.error('Get ecosystem stats error:', error);
      return null;
    }
  }

  /**
   * Get user activity from monitoring
   */
  async getUserActivity(limit: number = 50, offset: number = 0): Promise<any[] | null> {
    try {
      const response = await fetch(`/api/qsocial/files/my-activity?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.activity : null;
      }

      return null;
    } catch (error) {
      console.error('Get user activity error:', error);
      return null;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, maxSize: number = 50 * 1024 * 1024): { valid: boolean; error?: string } {
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

    if (!supportedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no soportado: ${file.type}`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Archivo demasiado grande: ${this.formatFileSize(file.size)} (máximo ${this.formatFileSize(maxSize)})`
      };
    }

    return { valid: true };
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon name
   */
  getFileTypeIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'music';
    if (contentType === 'application/pdf') return 'file-text';
    return 'file';
  }

  /**
   * Transform upload result to ecosystem format
   */
  private transformUploadResult(file: any): EcosystemUploadedFile {
    return {
      fileId: file.fileId,
      originalName: file.originalName,
      storjUrl: file.storjUrl,
      storjKey: file.storjKey,
      fileSize: file.fileSize,
      contentType: file.contentType,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.uploadedAt,
      ecosystem: file.ecosystem || this.createMockEcosystemData(),
      processingTime: file.processingTime || 0
    };
  }

  /**
   * Create mock ecosystem data for backward compatibility
   */
  private createMockEcosystemData() {
    return {
      qonsent: {
        profileId: 'mock_profile',
        visibility: 'private',
        encryptionLevel: 'standard'
      },
      qlock: {
        encrypted: true,
        encryptionLevel: 'standard'
      },
      ipfs: {
        cid: undefined,
        generated: false
      },
      qindex: {
        indexId: 'mock_index',
        searchable: false
      },
      qnet: {
        routingId: 'mock_routing',
        routedUrl: '',
        accessToken: undefined
      }
    };
  }
}

// Export singleton instance
export const ecosystemFileService = EcosystemFileService.getInstance();

// Export default
export default EcosystemFileService;