import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useStorachaClient } from '@/services/ucanService';
import { uploadFile, downloadFile, getFileInfo } from '@/utils/ipfs';
import { useToast } from '@/components/ui/use-toast';

export interface MediaItem {
  cid: string;
  name?: string;
  type?: string;
  size?: number;
  timestamp?: number;
  metadata?: Record<string, any>;
}

interface QpicMediaContextType {
  // State
  items: MediaItem[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  
  // Actions
  uploadFiles: (files: File[]) => Promise<MediaItem[]>;
  downloadFile: (cid: string, fileName?: string) => Promise<boolean>;
  removeItem: (cid: string) => boolean;
  getFileInfo: (cid: string) => Promise<any>;
  refresh: () => Promise<void>;
  
  // Helpers
  hasReachedLimit: boolean;
  remainingSlots: number;
  groupedItems: {
    images: MediaItem[];
    videos: MediaItem[];
    other: MediaItem[];
  };
}

const QpicMediaContext = createContext<QpicMediaContextType | undefined>(undefined);

interface QpicMediaProviderProps {
  children: ReactNode;
  initialItems?: MediaItem[];
  maxItems?: number;
  onItemsChange?: (items: MediaItem[]) => void;
  autoFetch?: boolean;
  fetchUrl?: string;
}

export function QpicMediaProvider({
  children,
  initialItems = [],
  maxItems = 10,
  onItemsChange,
  autoFetch = false,
  fetchUrl = '/api/ipfs/media',
}: QpicMediaProviderProps) {
  const { toast } = useToast();
  const { client, getOrCreateSpace } = useStorachaClient();
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Update local state when initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Fetch media items from the server
  const fetchItems = useCallback(async () => {
    if (!autoFetch || !fetchUrl) return;

    try {
      setIsLoading(true);
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media items');
      }

      const data = await response.json();
      setItems(data.items || []);
      return data.items || [];
    } catch (error) {
      console.error('Error fetching media items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los archivos multimedia',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [autoFetch, fetchUrl, toast]);

  // Upload files to IPFS
  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return [];

      // Check if we've reached the maximum number of items
      const remainingSlots = Math.max(0, maxItems - items.length);
      if (remainingSlots <= 0) {
        toast({
          title: 'Límite alcanzado',
          description: `Solo puedes subir hasta ${maxItems} archivos`,
          variant: 'destructive',
        });
        return [];
      }

      // Limit the number of files to the remaining slots
      const filesToUpload = files.slice(0, remainingSlots);
      const newItems: MediaItem[] = [];

      try {
        setIsUploading(true);

        // Ensure we have a space and UCAN delegation
        await getOrCreateSpace();

        // Upload each file
        for (const file of filesToUpload) {
          const fileId = `${file.name}-${Date.now()}`;
          
          try {
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            // Upload to IPFS
            const result = await uploadFile(file, {
              onProgress: (progress) => {
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileId]: progress,
                }));
              },
            });

            // Create a new media item
            const newItem: MediaItem = {
              cid: result.cid,
              name: file.name,
              type: file.type,
              size: file.size,
              timestamp: Date.now(),
              metadata: {
                originalName: file.name,
                size: file.size,
                type: file.type,
              },
            };

            newItems.push(newItem);

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
          setItems(updatedItems);
          onItemsChange?.(updatedItems);
        }

        return newItems;
      } catch (error) {
        console.error('Error during upload process:', error);
        toast({
          title: 'Error',
          description: 'Ocurrió un error durante la carga de archivos',
          variant: 'destructive',
        });
        return [];
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    [getOrCreateSpace, items, maxItems, onItemsChange, toast]
  );

  // Download a file
  const handleDownloadFile = useCallback(
    async (cid: string, fileName?: string) => {
      try {
        if (!client) throw new Error('Client not initialized');
        
        const url = client.getGatewayUrl(cid);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `download_${cid.slice(0, 8)}`;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        return true;
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: 'Error',
          description: 'No se pudo descargar el archivo',
          variant: 'destructive',
        });
        return false;
      }
    },
    [client, toast]
  );

  // Remove an item
  const handleRemoveItem = useCallback(
    (cid: string) => {
      const itemToRemove = items.find((item) => item.cid === cid);
      if (!itemToRemove) return false;

      const updatedItems = items.filter((item) => item.cid !== cid);
      setItems(updatedItems);
      onItemsChange?.(updatedItems);
      
      return true;
    },
    [items, onItemsChange]
  );

  // Get file info from IPFS
  const handleGetFileInfo = useCallback(
    async (cid: string) => {
      try {
        const info = await getFileInfo(cid);
        return info;
      } catch (error) {
        console.error('Error getting file info:', error);
        return null;
      }
    },
    []
  );

  // Group items by type
  const groupedItems = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.type?.startsWith('image/')) {
          acc.images.push(item);
        } else if (item.type?.startsWith('video/')) {
          acc.videos.push(item);
        } else {
          acc.other.push(item);
        }
        return acc;
      },
      {
        images: [] as MediaItem[],
        videos: [] as MediaItem[],
        other: [] as MediaItem[],
      }
    );
  }, [items]);

  // Initialize with auto-fetch if needed
  useEffect(() => {
    if (autoFetch) {
      fetchItems();
    }
  }, [autoFetch, fetchItems]);

  const value = {
    // State
    items,
    isLoading,
    isUploading,
    uploadProgress,
    groupedItems,
    
    // Actions
    uploadFiles: handleUploadFiles,
    downloadFile: handleDownloadFile,
    removeItem: handleRemoveItem,
    getFileInfo: handleGetFileInfo,
    refresh: fetchItems,
    
    // Helpers
    hasReachedLimit: items.length >= maxItems,
    remainingSlots: Math.max(0, maxItems - items.length),
  };

  return (
    <QpicMediaContext.Provider value={value}>
      {children}
    </QpicMediaContext.Provider>
  );
}

export function useQpicMedia() {
  const context = useContext(QpicMediaContext);
  if (context === undefined) {
    throw new Error('useQpicMedia must be used within a QpicMediaProvider');
  }
  return context;
}
