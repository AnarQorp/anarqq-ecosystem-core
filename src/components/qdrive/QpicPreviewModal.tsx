
import React, { useMemo } from "react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { useStorachaClient } from "@/services/ucanService";

export interface QpicPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    fileName: string;
    ipfsHash: string;
  } | null;
}

export default function QpicPreviewModal({ open, onOpenChange, file }: QpicPreviewModalProps) {
  const { client } = useStorachaClient();
  
  if (!file) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.fileName);
  const isVideo = /\.(mp4|webm|mov)$/i.test(file.fileName);
  
  // Generate the appropriate URL based on whether we have a client or not
  const fileUrl = useMemo(() => {
    if (!file?.ipfsHash) return '';
    return client ? client.getGatewayUrl(file.ipfsHash) : `/ipfs/${file.ipfsHash}`;
  }, [file?.ipfsHash, client]);
  
  // Generate a direct download URL
  const downloadUrl = useMemo(() => {
    if (!file?.ipfsHash) return '#';
    const url = client ? client.getGatewayUrl(file.ipfsHash) : `/ipfs/${file.ipfsHash}`;
    return `${url}?download=${encodeURIComponent(file.fileName || 'download')}`;
  }, [file, client]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col items-center gap-4">
        <div className="w-full flex justify-between items-center">
          <span className="font-semibold">{file.fileName}</span>
          <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="w-full flex flex-col items-center gap-4">
          {isImage ? (
            <img
              src={fileUrl}
              alt={file.fileName}
              className="max-w-xs max-h-96 rounded shadow border"
              style={{ background: "#f3f4f6" }}
            />
          ) : isVideo ? (
            <video
              src={fileUrl}
              controls
              className="max-w-xs max-h-96 rounded shadow border"
              style={{ background: "#f3f4f6" }}
            />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No se puede previsualizar este tipo de archivo</p>
            </div>
          )}
          
          <div className="w-full flex justify-between items-center text-sm text-muted-foreground">
            <span className="truncate max-w-xs">{file.fileName}</span>
            <a 
              href={downloadUrl}
              download={file.fileName}
              className="text-blue-600 hover:underline text-sm"
            >
              Descargar
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
