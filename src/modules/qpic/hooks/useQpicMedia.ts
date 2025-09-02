import { useState, useCallback } from 'react';
import { useStorachaClient } from '@/services/ucanService';
import { uploadFile, downloadFile } from '@/utils/ipfs';
import { useToast } from '@/components/ui/use-toast';

interface UseQpicMediaOptions {
  onUploadStart?: () => void;
  onUploadComplete?: (cid: string, file: File) => void;
  onError?: (error: Error) => void;
}

export function useQpicMedia(options: UseQpicMediaOptions = {}) {
  const { onUploadStart, onUploadComplete, onError } = options;
  const { client, getOrCreateSpace } = useStorachaClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMedia = useCallback(
    async (file: File) => {
      if (!file) return null;

      try {
        onUploadStart?.();
        setIsUploading(true);
        setUploadProgress(0);

        // Ensure we have a space and UCAN delegation
        await getOrCreateSpace();

        // Upload the file to IPFS
        const result = await uploadFile(file, {
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        // Notify parent component
        onUploadComplete?.(result.cid, file);

        toast({
          title: '¡Subida exitosa!',
          description: `Archivo ${file.name} subido correctamente`,
        });

        return result.cid;
      } catch (error) {
        console.error('Error uploading media:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al subir el archivo';
        
        toast({
          title: 'Error al subir archivo',
          description: errorMessage,
          variant: 'destructive',
        });

        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [getOrCreateSpace, onUploadComplete, onError, onUploadStart, toast]
  );

  const downloadMedia = useCallback(
    async (cid: string, fileName?: string) => {
      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Ensure we have a space and UCAN delegation
        await getOrCreateSpace();

        // Download the file from IPFS
        const result = await downloadFile(cid, {
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        // Create a download link and trigger it
        const blob = new Blob([result.data], { type: result.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `download_${cid.slice(0, 8)}`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return true;
      } catch (error) {
        console.error('Error downloading media:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al descargar el archivo';
        
        toast({
          title: 'Error al descargar archivo',
          description: errorMessage,
          variant: 'destructive',
        });

        return false;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [getOrCreateSpace, toast]
  );

  return {
    uploadMedia,
    downloadMedia,
    isUploading,
    uploadProgress,
    client,
  };
}

export default useQpicMedia;
