import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { uploadFile } from '@/utils/ipfs';
import { useStorachaClient } from '@/services/ucanService';
import { cn } from '@/lib/utils';

interface QpicMediaUploaderProps {
  onUploadComplete: (cid: string, file: File) => void;
  maxFiles?: number;
  accept?: {
    [key: string]: string[];
  };
  maxSize?: number;
  className?: string;
}

export function QpicMediaUploader({
  onUploadComplete,
  maxFiles = 1,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
}: QpicMediaUploaderProps) {
  const { toast } = useToast();
  const { client, getOrCreateSpace } = useStorachaClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<Array<{ file: File; preview: string }>>([]);

  // Clean up previews on unmount
  React.useEffect(() => {
    return () => {
      previewFiles.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [previewFiles]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Ensure we have a space and UCAN delegation
        await getOrCreateSpace();

        // Process each file
        for (const file of acceptedFiles.slice(0, maxFiles)) {
          try {
            // Create preview for images and videos
            const preview = URL.createObjectURL(file);
            setPreviewFiles((prev) => [...prev, { file, preview }]);

            // Upload to IPFS
            const result = await uploadFile(file, {
              onProgress: (progress) => {
                setUploadProgress(progress);
              },
            });

            // Notify parent component
            onUploadComplete(result.cid, file);

            toast({
              title: '¡Subida exitosa!',
              description: `Archivo ${file.name} subido correctamente`,
            });
          } catch (error) {
            console.error('Error uploading file:', error);
            toast({
              title: 'Error al subir archivo',
              description: error instanceof Error ? error.message : 'No se pudo subir el archivo',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error initializing upload:', error);
        toast({
          title: 'Error',
          description: 'No se pudo inicializar la subida. Intenta nuevamente.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [getOrCreateSpace, maxFiles, onUploadComplete, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: maxFiles > 1,
    disabled: isUploading || (maxFiles > 0 && previewFiles.length >= maxFiles),
  });

  const removeFile = (index: number) => {
    setPreviewFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const isMediaFile = (file: File) => {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">
              Subiendo... {uploadProgress > 0 && `${uploadProgress}%`}
            </p>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Upload className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Suelta los archivos aquí...'
                : `Arrastra y suelta archivos aquí, o haz clic para seleccionar`}
            </p>
            <p className="text-xs text-muted-foreground">
              {`Formatos soportados: ${Object.values(accept)
                .flat()
                .join(', ')}. Tamaño máximo: ${maxSize / 1024 / 1024}MB`}
            </p>
          </div>
        )}
      </div>

      {previewFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previewFiles.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                {preview.file.type.startsWith('image/') ? (
                  <img
                    src={preview.preview}
                    alt={preview.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : preview.file.type.startsWith('video/') ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <video
                      src={preview.preview}
                      className="max-h-full max-w-full"
                      controls
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                    <span className="text-xs text-center mt-1 line-clamp-2">
                      {preview.file.name}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
