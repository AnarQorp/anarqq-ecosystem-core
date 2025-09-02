import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';
import { useStorachaClient } from '@/services/ucanService';

export interface QpicMediaPreviewProps {
  cid: string;
  name?: string;
  type?: string;
  className?: string;
  onRemove?: () => void;
  downloadable?: boolean;
  removable?: boolean;
}

export function QpicMediaPreview({
  cid,
  name,
  type,
  className,
  onRemove,
  downloadable = true,
  removable = true,
}: QpicMediaPreviewProps) {
  const { client } = useStorachaClient();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const isImage = type?.startsWith('image/');
  const isVideo = type?.startsWith('video/');
  const fileExtension = name?.split('.').pop()?.toLowerCase();
  
  // Generate the gateway URL
  const mediaUrl = client ? client.getGatewayUrl(cid) : `/ipfs/${cid}`;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!downloadable) return;

    try {
      setIsDownloading(true);
      
      // Create a download link and trigger it
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = name || `download_${cid.slice(0, 8)}.${fileExtension || ''}`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Error al descargar el archivo');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50',
        'transition-all duration-200 hover:shadow-md',
        className
      )}
    >
      <div className="aspect-square w-full flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {error ? (
          <div className="p-4 text-center text-sm text-red-600">
            <p>Error al cargar el archivo</p>
            <p className="text-xs opacity-75">{error}</p>
          </div>
        ) : isImage ? (
          <img
            src={mediaUrl}
            alt={name || 'Media preview'}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-200',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => setError('No se pudo cargar la imagen')}
          />
        ) : isVideo ? (
          <video
            src={mediaUrl}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-200',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onCanPlayThrough={() => setIsLoading(false)}
            onError={() => setError('No se pudo cargar el video')}
            controls
          />
        ) : (
          <div className="p-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 mb-2">
              <span className="text-2xl">{fileExtension?.toUpperCase() || '?'}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate px-2">
              {name || `Archivo ${cid.slice(0, 8)}`}
            </p>
            <p className="text-xs text-gray-500">{type || 'Tipo de archivo desconocido'}</p>
          </div>
        )}
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        {downloadable && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-full"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {removable && onRemove && (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            className="rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* File name overlay */}
      {name && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-xs text-white truncate">{name}</p>
        </div>
      )}
    </div>
  );
}

export default QpicMediaPreview;
