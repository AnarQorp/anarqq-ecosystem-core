import React, { useMemo } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QmarketPublisher from './QmarketPublisher';
import { PublishFormData } from './types';
import { generateQmarketItemFromQpic } from './utils';

// Interface for the file metadata from QpiC
interface FileMetadata {
  ipfsHash: string;
  fileName: string;
  timestamp: string;
  cid_profile?: string;
  fileSize?: number;
  fileType?: string;
  description?: string;
}

interface QmarketPublishModalProps {
  /**
   * The file metadata to be published to Qmarket
   */
  item: FileMetadata;
  /**
   * Callback when the modal is closed
   */
  onClose: () => void;
  /**
   * Whether the modal is open
   */
  open: boolean;
}

/**
 * A modal dialog for publishing QpiC files to Qmarket.
 * Pre-fills the QmarketPublisher form with file metadata.
 */
export default function QmarketPublishModal({ 
  item, 
  onClose,
  open 
}: QmarketPublishModalProps) {
  const { cid_profile: userCidProfile } = useSessionContext();

    // Convert QpiC file to QmarketItem format
  const qmarketItem = useMemo(() => {
    try {
      return generateQmarketItemFromQpic(
        {
          ipfsHash: item.ipfsHash,
          fileName: item.fileName,
          timestamp: item.timestamp,
          fileSize: item.fileSize,
          fileType: item.fileType,
          description: item.description,
        },
        userCidProfile || ''
      );
    } catch (error) {
      console.error('Error generating Qmarket item:', error);
      return null;
    }
  }, [item, userCidProfile]);

  // Prepare form values from the generated QmarketItem
  const defaultValues = useMemo<PublishFormData>(() => {
    if (!qmarketItem) {
      return {
        cid: '',
        title: '',
        description: '',
        tags: '',
        price: 0, // Cambiado de '' a 0 para que coincida con el tipo number | ""
        license: 'all-rights-reserved',
      };
    }

    return {
      cid: qmarketItem.cid,
      title: qmarketItem.metadata.title,
      description: qmarketItem.metadata.description || '',
      tags: qmarketItem.metadata.tags?.join(', ') || '',
      price: qmarketItem.metadata.price, // Ya debería ser un número según la interfaz QmarketItem
      license: qmarketItem.metadata.license,
    };
  }, [qmarketItem]);

  // Handle successful publication
  const handlePublishSuccess = () => {
    toast({
      title: '¡Publicado con éxito!',
      description: 'Tu archivo se ha publicado correctamente en Qmarket.',
    });
    onClose();
  };

  // Show error if we couldn't generate the QmarketItem
  if (qmarketItem === null) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Error al preparar la publicación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No se pudo preparar el archivo para su publicación. Por favor, inténtalo de nuevo.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If user doesn't have a cid_profile, show an error message
  if (!userCidProfile) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Publicar archivo en Qmarket
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debes crear un perfil sQuid antes de poder publicar en Qmarket.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Entendido
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Publicar archivo en Qmarket</span>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="mb-4 p-4 bg-muted/30 rounded-md">
            <h4 className="text-sm font-medium mb-2">Archivo seleccionado:</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                {item.fileName}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.fileSize ? formatFileSize(item.fileSize) : 'Tamaño desconocido'}
              </span>
            </div>
          </div>
          
          {/* QmarketPublisher with pre-filled values from QpiC file */}
          <div className="publish-form-wrapper">
            <QmarketPublisher 
              defaultValues={defaultValues}
              onPublishSuccess={handlePublishSuccess}
              disabledFields={['cid', 'title', 'description']}
              // Pass additional metadata that might be needed
              additionalData={{
                fileType: qmarketItem.content.type,
                fileSize: qmarketItem.content.size,
                source: qmarketItem.content.source,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format file size
function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Extend the QmarketPublisher props to include our custom props
declare module './QmarketPublisher' {
  interface QmarketPublisherProps {
    defaultValues?: Partial<PublishFormData>;
    onPublishSuccess?: () => void;
    disabledFields?: (keyof PublishFormData)[];
    additionalData?: {
      fileType?: string;
      fileSize?: number;
      source?: string;
    };
  }
}
