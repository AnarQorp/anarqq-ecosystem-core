import { useState, useCallback } from 'react';
import ipfsService from '../api/ipfsService';
import { 
  UploadOptions, 
  DownloadOptions, 
  UploadResult, 
  DownloadResult, 
  FileInfo, 
  SpaceInfo 
} from '../types/ipfs';

interface UseIPFSOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

interface UseIPFSReturn {
  // Actions
  uploadFile: (file: File, options?: UploadOptions) => Promise<UploadResult>;
  downloadFile: (cid: string, options?: DownloadOptions) => Promise<DownloadResult>;
  getFileInfo: (cid: string, spaceDID?: string) => Promise<FileInfo>;
  createSpace: (alias: string) => Promise<SpaceInfo>;
  authorizeSpace: (spaceDID: string, agentDID: string, delegation: string) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: Error | null;
  progress: number;
  resetError: () => void;
}

/**
 * React hook for interacting with IPFS
 */
export function useIPFS(options: UseIPFSOptions = {}): UseIPFSReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Reset error state
  const resetError = useCallback(() => setError(null), []);

  // Upload a file to IPFS
  const uploadFile = useCallback(
    async (file: File, uploadOptions: UploadOptions = {}) => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      try {
        // Simulate progress (in a real app, you'd use XHR or fetch with progress)
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            const newProgress = prev + Math.random() * 10;
            if (newProgress >= 90) clearInterval(progressInterval);
            return Math.min(newProgress, 90);
          });
        }, 200);

        const result = await ipfsService.uploadFile(file, {
          ...uploadOptions,
          onProgress: (p) => {
            setProgress(p);
            uploadOptions.onProgress?.(p);
            options.onProgress?.(p);
          },
        });

        clearInterval(progressInterval);
        setProgress(100);
        
        // Reset progress after a short delay
        setTimeout(() => setProgress(0), 500);
        
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to upload file'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Download a file from IPFS
  const downloadFile = useCallback(
    async (cid: string, downloadOptions: DownloadOptions = {}): Promise<DownloadResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ipfsService.downloadFile(cid, downloadOptions);
        
        // Create a download link and trigger it
        const url = window.URL.createObjectURL(new Blob([result.data], { type: result.contentType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', result.filename);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to download file'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get file info from IPFS
  const getFileInfo = useCallback(
    async (cid: string, spaceDID?: string): Promise<FileInfo> => {
      setIsLoading(true);
      setError(null);

      try {
        return await ipfsService.getFileInfo(cid, spaceDID);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get file info'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Create a new space
  const createSpace = useCallback(async (alias: string): Promise<SpaceInfo> => {
    setIsLoading(true);
    setError(null);

    try {
      return await ipfsService.createSpace(alias);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create space'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Authorize a space
  const authorizeSpace = useCallback(
    async (spaceDID: string, agentDID: string, delegation: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        return await ipfsService.authorizeSpace(spaceDID, agentDID, delegation);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to authorize space'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const api: UseIPFSReturn = {
    // Actions
    uploadFile,
    downloadFile,
    getFileInfo,
    createSpace,
    authorizeSpace,
    
    // State
    isLoading,
    error,
    progress,
    resetError,
  };
  
  return api;
}

export default useIPFS;
