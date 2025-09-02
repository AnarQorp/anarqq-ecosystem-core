import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { UnifiedFile } from '../types';

interface QpicPreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: UnifiedFile;
  onDownload: (file: UnifiedFile) => Promise<void>;
  onCopyLink: (file: UnifiedFile) => void;
}

export function QpicPreviewModal({
  open,
  onClose,
  file,
  onDownload,
  onCopyLink
}: QpicPreviewModalProps) {
  const { toast } = useToast();
  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');
  const fileUrl = `${window.location.origin}/api/ipfs/${file.cid}`;

  const handleDownload = async () => {
    try {
      await onDownload(file);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the file',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = () => {
    onCopyLink(file);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span className="truncate max-w-[80%]">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col items-center">
          <div className="w-full max-h-[70vh] flex items-center justify-center bg-muted/50 rounded-lg overflow-hidden">
            {isImage ? (
              <img
                src={fileUrl}
                alt={file.name}
                className="max-h-[65vh] max-w-full object-contain"
              />
            ) : isVideo ? (
              <video
                src={fileUrl}
                controls
                className="max-h-[65vh] max-w-full"
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This file type cannot be previewed in the browser.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 w-full flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <p>Type: {file.type}</p>
              <p>Size: {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A'}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
