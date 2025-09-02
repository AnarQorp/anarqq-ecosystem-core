import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Eye, Image, Video, File, Play, User, Store, Mail } from 'lucide-react';
import MiniProfileCard from '@/components/squid/MiniProfileCard';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityStore } from '@/state/identity';
import { useToast } from '@/hooks/use-toast';
import { getFilesByDID } from '@/utils/qdrive/ipfsService';
import QpicPreviewModal from "./QpicPreviewModal";
import { getFile } from "@/utils/ipfs";
import { saveAs } from "file-saver";

// Importación estática de QmarketPublishModal
import QmarketPublishModal from '@/modules/qmarket/QmarketPublishModal';

// Format file size helper function
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime'
];

interface FileMetadata {
  ipfsHash: string;
  fileName: string;
  timestamp: string;
  cid_profile?: string;
  fileSize?: number;
  fileType?: string;
  description?: string;
}

interface HistoryTabProps {
  isQpic?: boolean;
}

export default function HistoryTab({ isQpic = false }: HistoryTabProps) {
  const { activeIdentity } = useIdentityStore();
  const { toast } = useToast();
  const { cid_profile: currentUserCid } = useSessionContext();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openQmarketModal, setOpenQmarketModal] = useState(false);
  const [selectedItemForQmarket, setSelectedItemForQmarket] = useState<FileMetadata | null>(null);

  useEffect(() => {
    if (activeIdentity) {
      const userFiles = getFilesByDID(activeIdentity.did);
      
      if (isQpic) {
        // Filtrar solo archivos multimedia para Qpic
        const mediaFiles = userFiles.filter(file => {
          const extension = file.fileName?.toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov']
            .some(ext => extension?.endsWith(ext));
        });
        setFiles(mediaFiles);
      } else {
        setFiles(userFiles);
      }
    }
  }, [activeIdentity, isQpic]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Hash IPFS copiado al portapapeles',
    });
  };

  const isImage = (fileName: string) => {
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  const isVideo = (fileName: string) => {
    return ['.mp4', '.webm', '.mov'].some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  const getFileIcon = (fileName: string) => {
    if (isImage(fileName)) return <Image className="h-5 w-5 text-blue-500" />;
    if (isVideo(fileName)) return <Video className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleDownload = useCallback(async (file: any) => {
    try {
      const blob = await getFile(file.ipfsHash);
      const filename =
        file.fileName ||
        `file_${file.ipfsHash.slice(0, 8)}.${file.fileName?.split(".").pop() || "bin"}`;
      // Siempre usar la lógica moderna de descarga para navegadores actuales
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast({
        title: "Descarga completada",
        description: `El archivo ${filename} se ha descargado correctamente`,
      });
    } catch (e) {
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar el archivo desde IPFS",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handlePreview = (file: FileMetadata) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handlePublishToQmarket = (file: FileMetadata) => {
    setSelectedItemForQmarket(file);
    setOpenQmarketModal(true);
  };

  const handleCloseQmarketModal = () => {
    setOpenQmarketModal(false);
    setSelectedItemForQmarket(null);
  };

  const handleQmailShare = (file: FileMetadata) => {
    // Create a properly formatted message with file details
    const messageContent = [
      'He compartido este archivo contigo:',
      '',
      `🔹 Nombre: ${file.fileName}`,
      `🔹 Tipo: ${file.fileType || 'Desconocido'}`,
      `🔹 Tamaño: ${file.fileSize ? formatFileSize(file.fileSize) : 'Desconocido'}`,
      `🔹 CID: ${file.ipfsHash}`,
      '',
      'Puedes acceder al archivo usando el CID en tu cliente IPFS preferido.'
    ].join('\n');

    // Create URL parameters
    const params = new URLSearchParams({
      subject: `Archivo compartido desde ${isQpic ? 'QpiC' : 'Qdrive'}`,
      content: messageContent,
      priority: 'NORMAL'
    });
    
    // Navigate to Qmail compose with the file details
    navigate(`/qmail/compose?${params.toString()}`);
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            {isQpic ? <Image className="w-12 h-12 text-gray-400" /> : <File className="w-12 h-12 text-gray-400" />}
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isQpic ? 'No hay archivos multimedia' : 'No hay archivos'}
          </p>
          <p className="text-muted-foreground">
            {isQpic ? 'Sube tu primera imagen o video' : 'Sube tu primer archivo'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {isQpic ? `Galería multimedia (${files.length})` : `Mis archivos (${files.length})`}
        </h3>
        <Badge variant="outline">
          {activeIdentity?.name || 'Usuario activo'}
        </Badge>
      </div>
      <div>
      {isQpic ? (
        <>
          <QpicPreviewModal
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            file={previewFile}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {files.map((file) => (
              <Card key={file.ipfsHash} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Uploader info */}
                {file.cid_profile && (
                  <div className="absolute top-2 left-2 z-10">
                    {file.cid_profile === currentUserCid ? (
                      <div className="flex items-center bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-gray-700 border border-gray-200">
                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-1">
                          <User className="w-2.5 h-2.5 text-blue-600" />
                        </div>
                        <span className="truncate max-w-[100px]">Tú</span>
                      </div>
                    ) : (
                      <MiniProfileCard 
                        cid={file.cid_profile}
                        encryptionKey={''} // This should be provided by your app's context
                        size="small"
                        className="bg-white/80 backdrop-blur-sm"
                      />
                    )}
                  </div>
                )}
                <div className="aspect-square relative bg-gradient-to-br from-gray-100 to-gray-200">
                  {isImage(file.fileName) ? (
                    <img 
                      src={`/ipfs/${file.ipfsHash}`}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              <div class="text-center">
                                <div class="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                                  <svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                  </svg>
                                </div>
                                <p class="text-xs text-gray-500">Imagen</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : isVideo(file.fileName) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                          <Play className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-purple-700">Video</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <File className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {isImage(file.fileName) ? '📷' : isVideo(file.fileName) ? '🎬' : '📄'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="font-medium text-sm truncate mb-1" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(file.timestamp).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyToClipboard(file.ipfsHash)}
                      title="Copiar CID"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownload(file)}
                      title="Descargar"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview(file)}
                      title="Vista previa"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-purple-600"
                      onClick={() => handleQmailShare(file)}
                      title="Enviar por Qmail"
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                    {isQpic && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-primary"
                        onClick={() => handlePublishToQmarket(file)}
                        title="Publicar en Qmarket"
                      >
                        <Store className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        // Vista de lista para Qdrive
        <div className="space-y-3">
          {files.map((file) => (
            <Card key={file.ipfsHash} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(file.fileName)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{file.fileName}</p>
                        {file.cid_profile && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {file.cid_profile === currentUserCid 
                              ? 'Tú' 
                              : `${file.cid_profile.substring(0, 4)}...${file.cid_profile.substring(file.cid_profile.length - 4)}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(file.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      ✅ Íntegro
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(file.ipfsHash)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono bg-gray-50 p-2 rounded">
                  IPFS: {file.ipfsHash}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      </div>
      
      {/* Qmarket Publish Modal */}
      {openQmarketModal && selectedItemForQmarket && (
        <QmarketPublishModal
          open={openQmarketModal}
          onClose={handleCloseQmarketModal}
          item={{
            ipfsHash: selectedItemForQmarket.ipfsHash,
            fileName: selectedItemForQmarket.fileName,
            fileType: selectedItemForQmarket.fileType || 'application/octet-stream',
            fileSize: selectedItemForQmarket.fileSize,
            description: selectedItemForQmarket.description || '',
            timestamp: selectedItemForQmarket.timestamp,
          }}
        />
      )}
    </div>
  );
}
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{file.fileName}</p>
                    {file.cid_profile && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {file.cid_profile === currentUserCid 
                          ? 'Tú' 
                          : `${file.cid_profile.substring(0, 4)}...${file.cid_profile.substring(file.cid_profile.length - 4)}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(file.timestamp).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">
                  ✅ Íntegro
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(file.ipfsHash)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono bg-gray-50 p-2 rounded">
              IPFS: {file.ipfsHash}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</div>;
}
