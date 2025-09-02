/**
 * useEcosystemFiles Hook
 * 
 * React hook for managing file operations with the AnarQ&Q ecosystem.
 * Provides a simple interface for file upload, download, and management.
 */

import { useState, useCallback, useRef } from 'react';
import { 
  ecosystemFileService, 
  EcosystemUploadedFile, 
  EcosystemFileUploadOptions,
  FileSearchOptions,
  FileSearchResult
} from '../services/qsocial/EcosystemFileService';

export interface UseEcosystemFilesOptions {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  autoUpload?: boolean;
}

export interface FilePreview {
  file: File;
  id: string;
  preview?: string;
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  error?: string;
  result?: EcosystemUploadedFile;
}

export interface UseEcosystemFilesReturn {
  // File management
  files: FilePreview[];
  uploadedFiles: EcosystemUploadedFile[];
  
  // Upload state
  uploading: boolean;
  uploadProgress: Record<string, number>;
  
  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  uploadFiles: (options?: EcosystemFileUploadOptions) => Promise<void>;
  uploadSingleFile: (file: File, options?: EcosystemFileUploadOptions) => Promise<EcosystemUploadedFile | null>;
  clearFiles: () => void;
  
  // File operations
  downloadFile: (fileId: string) => Promise<Blob | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  generateSignedUrl: (fileId: string, expiresIn?: number) => Promise<string | null>;
  
  // Search and discovery
  searchFiles: (options: FileSearchOptions) => Promise<FileSearchResult | null>;
  getUserFiles: (maxKeys?: number) => Promise<any>;
  
  // Ecosystem information
  getFileIPFSInfo: (fileId: string) => Promise<any>;
  checkEcosystemHealth: () => Promise<any>;
  getEcosystemStats: () => Promise<any>;
  getUserActivity: (limit?: number, offset?: number) => Promise<any>;
  
  // Utilities
  validateFile: (file: File) => { valid: boolean; error?: string };
  formatFileSize: (bytes: number) => string;
  getFileTypeIcon: (contentType: string) => string;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useEcosystemFiles(options: UseEcosystemFilesOptions = {}): UseEcosystemFilesReturn {
  const {
    maxFiles = 5,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    allowedTypes = [
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
    ],
    autoUpload = false
  } = options;

  // State
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<EcosystemUploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileIdCounter = useRef(0);

  // Generate unique file ID
  const generateFileId = useCallback(() => {
    return `file_${Date.now()}_${++fileIdCounter.current}`;
  }, []);

  // Create file preview
  const createFilePreview = useCallback((file: File): FilePreview => {
    const id = generateFileId();
    const preview: FilePreview = {
      file,
      id,
      uploading: false,
      progress: 0,
      uploaded: false
    };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFiles(prev => prev.map(f => 
          f.id === id ? { ...f, preview: e.target?.result as string } : f
        ));
      };
      reader.readAsDataURL(file);
    }

    return preview;
  }, [generateFileId]);

  // Validate file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido: ${file.type}`
      };
    }

    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `Archivo demasiado grande: ${ecosystemFileService.formatFileSize(file.size)} (máximo ${ecosystemFileService.formatFileSize(maxFileSize)})`
      };
    }

    return { valid: true };
  }, [allowedTypes, maxFileSize]);

  // Add files
  const addFiles = useCallback((newFiles: File[]) => {
    setError(null);

    if (files.length + newFiles.length > maxFiles) {
      setError(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    const validFiles: FilePreview[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(createFilePreview(file));
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);

      // Auto upload if enabled
      if (autoUpload) {
        setTimeout(() => {
          uploadFiles();
        }, 100);
      }
    }
  }, [files.length, maxFiles, validateFile, createFilePreview, autoUpload]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      const file = files.find(f => f.id === id);
      if (file) {
        delete newProgress[file.file.name];
      }
      return newProgress;
    });
  }, [files]);

  // Upload files
  const uploadFiles = useCallback(async (uploadOptions: EcosystemFileUploadOptions = {}) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Mark all files as uploading
      setFiles(prev => prev.map(f => ({ ...f, uploading: true, progress: 0 })));

      const filesToUpload = files.filter(f => !f.uploaded).map(f => f.file);
      
      if (filesToUpload.length === 1) {
        // Single file upload
        const file = filesToUpload[0];
        const filePreview = files.find(f => f.file === file);
        
        if (filePreview) {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[file.name] || 0;
              const newProgress = Math.min(currentProgress + 10, 90);
              return { ...prev, [file.name]: newProgress };
            });
          }, 100);

          const result = await ecosystemFileService.uploadFile(file, uploadOptions);
          
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          if (result) {
            setFiles(prev => prev.map(f => 
              f.id === filePreview.id 
                ? { ...f, uploading: false, uploaded: true, progress: 100, result }
                : f
            ));
            setUploadedFiles(prev => [...prev, result]);
          } else {
            setFiles(prev => prev.map(f => 
              f.id === filePreview.id 
                ? { ...f, uploading: false, error: 'Error subiendo archivo' }
                : f
            ));
          }
        }
      } else {
        // Multiple file upload
        const results = await ecosystemFileService.uploadMultipleFiles(filesToUpload, uploadOptions);
        
        // Update progress to 100% for all files
        filesToUpload.forEach(file => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        });

        // Update file states
        setFiles(prev => prev.map(f => {
          const result = results.find(r => r.originalName === f.file.name);
          if (result) {
            return { ...f, uploading: false, uploaded: true, progress: 100, result };
          } else {
            return { ...f, uploading: false, error: 'Error subiendo archivo' };
          }
        }));

        setUploadedFiles(prev => [...prev, ...results]);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Error subiendo archivos');
      
      setFiles(prev => prev.map(f => ({
        ...f,
        uploading: false,
        error: 'Error subiendo archivo'
      })));
    } finally {
      setUploading(false);
    }
  }, [files]);

  // Upload single file
  const uploadSingleFile = useCallback(async (
    file: File, 
    uploadOptions: EcosystemFileUploadOptions = {}
  ): Promise<EcosystemUploadedFile | null> => {
    try {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Archivo no válido');
        return null;
      }

      return await ecosystemFileService.uploadFile(file, uploadOptions);
    } catch (error) {
      console.error('Single file upload error:', error);
      setError(error instanceof Error ? error.message : 'Error subiendo archivo');
      return null;
    }
  }, [validateFile]);

  // Clear files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setUploadedFiles([]);
    setUploadProgress({});
    setError(null);
  }, []);

  // File operations
  const downloadFile = useCallback(async (fileId: string): Promise<Blob | null> => {
    try {
      return await ecosystemFileService.downloadFile(fileId);
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'Error descargando archivo');
      return null;
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const success = await ecosystemFileService.deleteFile(fileId);
      if (success) {
        setUploadedFiles(prev => prev.filter(f => f.fileId !== fileId));
      }
      return success;
    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Error eliminando archivo');
      return false;
    }
  }, []);

  const generateSignedUrl = useCallback(async (fileId: string, expiresIn?: number): Promise<string | null> => {
    try {
      return await ecosystemFileService.generateSignedUrl(fileId, expiresIn);
    } catch (error) {
      console.error('Generate signed URL error:', error);
      setError(error instanceof Error ? error.message : 'Error generando URL');
      return null;
    }
  }, []);

  // Search and discovery
  const searchFiles = useCallback(async (searchOptions: FileSearchOptions): Promise<FileSearchResult | null> => {
    try {
      return await ecosystemFileService.searchFiles(searchOptions);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Error en búsqueda');
      return null;
    }
  }, []);

  const getUserFiles = useCallback(async (maxKeys?: number) => {
    try {
      return await ecosystemFileService.getUserFiles(maxKeys);
    } catch (error) {
      console.error('Get user files error:', error);
      setError(error instanceof Error ? error.message : 'Error obteniendo archivos');
      return null;
    }
  }, []);

  // Ecosystem information
  const getFileIPFSInfo = useCallback(async (fileId: string) => {
    try {
      return await ecosystemFileService.getFileIPFSInfo(fileId);
    } catch (error) {
      console.error('Get IPFS info error:', error);
      setError(error instanceof Error ? error.message : 'Error obteniendo info IPFS');
      return null;
    }
  }, []);

  const checkEcosystemHealth = useCallback(async () => {
    try {
      return await ecosystemFileService.checkEcosystemHealth();
    } catch (error) {
      console.error('Health check error:', error);
      return null;
    }
  }, []);

  const getEcosystemStats = useCallback(async () => {
    try {
      return await ecosystemFileService.getEcosystemStats();
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }, []);

  const getUserActivity = useCallback(async (limit?: number, offset?: number) => {
    try {
      return await ecosystemFileService.getUserActivity(limit, offset);
    } catch (error) {
      console.error('Get user activity error:', error);
      return null;
    }
  }, []);

  // Utilities
  const formatFileSize = useCallback((bytes: number): string => {
    return ecosystemFileService.formatFileSize(bytes);
  }, []);

  const getFileTypeIcon = useCallback((contentType: string): string => {
    return ecosystemFileService.getFileTypeIcon(contentType);
  }, []);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // File management
    files,
    uploadedFiles,
    
    // Upload state
    uploading,
    uploadProgress,
    
    // Actions
    addFiles,
    removeFile,
    uploadFiles,
    uploadSingleFile,
    clearFiles,
    
    // File operations
    downloadFile,
    deleteFile,
    generateSignedUrl,
    
    // Search and discovery
    searchFiles,
    getUserFiles,
    
    // Ecosystem information
    getFileIPFSInfo,
    checkEcosystemHealth,
    getEcosystemStats,
    getUserActivity,
    
    // Utilities
    validateFile,
    formatFileSize,
    getFileTypeIcon,
    
    // Error handling
    error,
    clearError
  };
}

export default useEcosystemFiles;