import { useState, useCallback } from 'react';
import {
  uploadToIPFS,
  downloadFromIPFS,
  getFileInfo,
  createSpace,
  authorizeSpace,
  updateFileMetadata,
  deleteFile,
} from '@/lib/storachaClient';

interface UseStorachaOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export function useStoracha(options: UseStorachaOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const handleError = useCallback(
    (error: Error) => {
      console.error('[useStoracha] Error:', error);
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return error;
    },
    [options]
  );

  const handleProgress = useCallback(
    (progress: number) => {
      setProgress(progress);
      if (options.onProgress) {
        options.onProgress(progress);
      }
    },
    [options]
  );

  const upload = useCallback(
    async (file: File, metadata?: Record<string, any>, spaceDID?: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await uploadToIPFS(file, {
          spaceDID,
          metadata,
          onProgress: handleProgress,
        });
        return result;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, handleProgress]
  );

  const download = useCallback(
    async (cid: string, spaceDID?: string, decrypt = false) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await downloadFromIPFS(cid, {
          spaceDID,
          decrypt,
        });
        return result;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const getInfo = useCallback(
    async (cid: string, spaceDID?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getFileInfo(cid, spaceDID);
        return result;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const createNewSpace = useCallback(
    async (alias: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await createSpace(alias);
        return result;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const authorizeNewSpace = useCallback(
    async (spaceDID: string, agentDID: string, delegation: any) => {
      setIsLoading(true);
      setError(null);

      try {
        await authorizeSpace(spaceDID, agentDID, delegation);
        return true;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const updateMetadata = useCallback(
    async (cid: string, metadata: Record<string, any>, spaceDID?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await updateFileMetadata(cid, metadata, spaceDID);
        return result;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const removeFile = useCallback(
    async (cid: string, spaceDID?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await deleteFile(cid, spaceDID);
        return true;
      } catch (error) {
        throw handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  return {
    // State
    isLoading,
    error,
    progress,
    
    // Actions
    upload,
    download,
    getInfo,
    createSpace: createNewSpace,
    authorizeSpace: authorizeNewSpace,
    updateMetadata,
    deleteFile: removeFile,
  };
}

export default useStoracha;
