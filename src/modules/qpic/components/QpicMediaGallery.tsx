import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Image as ImageIcon, Video as VideoIcon, File as FileIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';
import { uploadWithEncryption } from '@/services/uploadService';
import QpicMediaPreview from './QpicMediaPreview';
import SuccessCard from '@/components/qdrive/SuccessCard';
import { useSessionContext } from '@/contexts/SessionContext';


export interface MediaItem {
  cid: string;
  name?: string;
  type?: string;
  size?: number;
  timestamp?: number;
  metadata?: Record<string, any>;
}

interface QpicMediaGalleryProps {
  items?: MediaItem[];
  maxItems?: number;
  onItemsChange?: (items: MediaItem[]) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (item: MediaItem) => void;
  onItemClick?: (item: MediaItem) => void;
  onItemRemove?: (item: MediaItem) => void;
  className?: string;
  readOnly?: boolean;
  compact?: boolean;
  accept?: {
    [key: string]: string[];
  };
  maxSize?: number;
  loading?: boolean;
}

export function QpicMediaGallery({
  items = [],
  maxItems = 10,
  onItemsChange,
  onUploadStart,
  onUploadComplete,
  onItemClick,
  onItemRemove,
  className,
  readOnly = false,
  compact = false,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  loading = false,
}: QpicMediaGalleryProps) {
  const { toast } = useToast();
  const { cid_profile } = useSessionContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadResult, setUploadResult] = useState<{ipfsHash: string; metadata: any} | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (readOnly || !files.length) return;

      // Check if we've reached the maximum number of items
      const remainingSlots = Math.max(0, maxItems - items.length);
      if (remainingSlots <= 0) {
        toast({
          title: 'Límite alcanzado',
          description: `Solo puedes subir hasta ${maxItems} archivos`,
          variant: 'destructive',
        });
        return;
      }

      // Limit the number of files to the remaining slots
      const filesToUpload = files.slice(0, remainingSlots);
      const newItems: MediaItem[] = [];

      try {
        onUploadStart?.();
        setIsUploading(true);

        // Upload each file
        for (const file of filesToUpload) {
          const fileId = `${file.name}-${Date.now()}`;
          
          try {
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            // Upload with encryption using the unified service
            const result = await uploadWithEncryption(file, {
              metadata: { source: 'qpic_gallery' },
              onProgress: (progress) => {
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileId]: progress,
                }));
              },
            });

            // Create a new media item
            const ipfsHash = typeof result.ipfsHash === 'string' ? result.ipfsHash : '';
            const newItem: MediaItem = {
              cid: ipfsHash,
              name: file.name,
              type: file.type,
              size: file.size,
              timestamp: Date.now(),
              metadata: {
                ...result.metadata,
                originalName: file.name,
                size: file.size,
                type: file.type,
              },
            };

            newItems.push(newItem);
            onUploadComplete?.(newItem);
            
            // Show success after the upload is complete
            setUploadResult({
              ipfsHash: ipfsHash,
              metadata: {
                name: file.name,
                ...result.metadata
              }
            });
            setShowSuccess(true);

            // Update progress to 100%
            setUploadProgress((prev) => ({
              ...prev,
              [fileId]: 100,
            }));
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            toast({
              title: `Error al subir ${file.name}`,
              description: 'Intenta de nuevo más tarde',
              variant: 'destructive',
            });
          }
        }

        // Update the items list
        if (newItems.length > 0) {
          const updatedItems = [...items, ...newItems];
          onItemsChange?.(updatedItems);
        }
      } catch (error) {
        console.error('Error during upload process:', error);
        toast({
          title: 'Error',
          description: 'Ocurrió un error durante la carga de archivos',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    [
      readOnly,
      maxItems,
      items,
      onItemsChange,
      onUploadStart,
      onUploadComplete,
      toast,
    ]
  );

  const handleRemove = useCallback(
    (item: MediaItem) => {
      if (readOnly) return;
      
      const updatedItems = items.filter((i) => i.cid !== item.cid);
      onItemsChange?.(updatedItems);
      onItemRemove?.(item);
    },
    [items, onItemsChange, onItemRemove, readOnly]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept,
    maxSize,
    multiple: maxItems > 1,
    disabled: isUploading || readOnly || items.length >= maxItems,
  });

  const canUploadMore = items.length < maxItems && !readOnly;
  const isFull = items.length >= maxItems;

  // Group items by type for better organization
  const { images, videos, other } = useMemo(() => {
    const groups = {
      images: [] as MediaItem[],
      videos: [] as MediaItem[],
      other: [] as MediaItem[],
    };

    items.forEach((item) => {
      if (item.type?.startsWith('image/')) {
        groups.images.push(item);
      } else if (item.type?.startsWith('video/')) {
        groups.videos.push(item);
      } else {
        groups.other.push(item);
      }
    });

    return groups;
  }, [items]);

  const renderSection = (title: string, items: MediaItem[]) => {
    if (!items.length) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <div key={item.cid} className="relative">
              <div onClick={() => onItemClick?.(item)}>
                <QpicMediaPreview
                  key={item.cid}
                  cid={item.cid}
                  name={item.name || 'Unnamed file'}
                  type={item.type || 'application/octet-stream'}
                  className={cn(
                    'w-full h-full object-cover rounded-md transition-opacity',
                    isUploading && 'opacity-50',
                    'cursor-pointer'
                  )}
                  onRemove={() => handleRemove(item)}
                />
              </div>
              {uploadProgress[`${item.name}-${item.timestamp}`] !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${uploadProgress[`${item.name}-${item.timestamp}`] || 0}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Cargando galería...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload area */}
      {!readOnly && canUploadMore && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
            isUploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              ) : (
                <Plus className="h-6 w-6 text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {isUploading
                ? 'Subiendo archivos...'
                : isDragActive
                ? 'Suelta los archivos aquí'
                : `Arrastra y suelta archivos aquí, o haz clic para seleccionar`}
            </p>
            <p className="text-xs text-gray-500">
              {`Hasta ${maxItems - items.length} archivos restantes • ${maxSize / 1024 / 1024}MB máximo por archivo`}
            </p>
          </div>
        </div>
      )}

      {/* Full message */}
      {isFull && !readOnly && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Has alcanzado el límite de {maxItems} archivos. Elimina algunos para agregar más.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Media sections */}
      <div className="space-y-6">
        {renderSection('Imágenes', images)}
        {renderSection('Videos', videos)}
        {renderSection('Otros archivos', other)}
      </div>

      {/* Empty state */}
      {!items.length && !isUploading && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin archivos multimedia</h3>
          <p className="mt-1 text-sm text-gray-500">
            {readOnly
              ? 'Este perfil no tiene archivos multimedia para mostrar.'
              : 'Comienza arrastrando y soltando archivos aquí, o haz clic para seleccionarlos.'}
          </p>
          {!readOnly && canUploadMore && (
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('file-upload')?.click();
                }}
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Subir archivos
              </Button>
            </div>
          )}
        </div>
      )}
      {showSuccess && uploadResult && (
        <SuccessCard
          ipfsHash={uploadResult.ipfsHash}
          fileName={uploadResult.metadata?.name || 'File'}
          cid_profile={cid_profile}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
}

export default QpicMediaGallery;
