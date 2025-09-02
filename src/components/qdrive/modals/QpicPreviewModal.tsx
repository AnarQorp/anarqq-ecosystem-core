import React from 'react';
import { FileMetadata } from '../HistoryTab';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface QpicPreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: FileMetadata;
  onPublish: () => void;
}

export default function QpicPreviewModal({ open, onClose, file, onPublish }: QpicPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista previa</DialogTitle>
          <DialogDescription>{file.fileName}</DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {file.fileType?.startsWith('image/') ? (
            <img
              src={`https://ipfs.io/ipfs/${file.ipfsHash}`}
              alt={file.fileName}
              className="w-full max-h-[60vh] object-contain rounded-md"
            />
          ) : file.fileType?.startsWith('video/') ? (
            <video
              src={`https://ipfs.io/ipfs/${file.ipfsHash}`}
              className="w-full max-h-[60vh] object-contain rounded-md"
              controls
              autoPlay
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-md">
              <p className="text-gray-500">Vista previa no disponible</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Tamaño: {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Desconocido'}
            </p>
            <p className="text-sm text-muted-foreground">
              Tipo: {file.fileType || 'Desconocido'}
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={onPublish}>
              Publicar en Qmarket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
