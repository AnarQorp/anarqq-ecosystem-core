import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Download, 
  ArrowLeft, 
  FileText, 
  Calendar, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Copy,
  Check,
  User
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import MiniProfileCard from '@/components/squid/MiniProfileCard';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getFile } from '@/utils/ipfs';
import { decryptFile } from '@/utils/encryption';

// Types
type FileMetadata = {
  name: string;
  type: string;
  size: number;
  createdAt: string;
  cid_profile?: string;
  isEncrypted?: boolean;
  encryptionKey?: string;
  encryptionIV?: string; // IV para el descifrado
};

const QpicItemDetailPage: React.FC = () => {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { cid_profile: currentUserCid } = useSessionContext();
  
  const [fileData, setFileData] = useState<{
    blob: Blob | null;
    url: string | null;
    metadata: FileMetadata | null;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: es 
    });
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  // Handle file download
  const handleDownload = async () => {
    if (!fileData?.blob || !fileData.metadata) return;
    
    try {
      const url = window.URL.createObjectURL(fileData.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.metadata.name || `file-${cid?.substring(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setError('No se pudo descargar el archivo');
    }
  };

  // Copy CID to clipboard
  const copyToClipboard = () => {
    if (!cid) return;
    navigator.clipboard.writeText(cid);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Load and process file
  useEffect(() => {
    if (!cid) {
      setError('No se proporcionó un identificador de archivo (CID)');
      setIsLoading(false);
      return;
    }

    const loadFile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch the file metadata from IPFS
        // For now, we'll use mock metadata
        const mockMetadata: FileMetadata = {
          name: `Archivo-${cid.substring(0, 8)}`,
          type: 'application/octet-stream',
          size: 1024 * 1024 * 2.5, // 2.5MB
          createdAt: new Date().toISOString(),
          cid_profile: 'QmProfile1', // Mock profile CID
          isEncrypted: false
        };
        
        // Simulate file download from IPFS
        // In a real implementation, this would be: const fileBlob = await getFile(cid);
        const mockFile = new Blob(['Mock file content'], { type: 'text/plain' });
        
        // If the file is encrypted, decrypt it
        let processedBlob = mockFile;
        if (mockMetadata.isEncrypted && mockMetadata.encryptionKey && mockMetadata.encryptionIV) {
          setIsDecrypting(true);
          try {
            // Convertir la clave y el IV a los formatos esperados
            const keyData = Uint8Array.from(atob(mockMetadata.encryptionKey), c => c.charCodeAt(0));
            const iv = Uint8Array.from(atob(mockMetadata.encryptionIV), c => c.charCodeAt(0));
            
            // Importar la clave
            const cryptoKey = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'AES-GCM' },
              false,
              ['decrypt']
            );
            
            // Convertir el Blob a ArrayBuffer
            const arrayBuffer = await processedBlob.arrayBuffer();
            
            // Descifrar el archivo
            const decrypted = await decryptFile(arrayBuffer, cryptoKey, iv);
            
            // Convertir el ArrayBuffer de vuelta a Blob
            processedBlob = new Blob([decrypted], { type: mockMetadata.type });
          } catch (err) {
            console.error('Decryption failed:', err);
            throw new Error('No se pudo descifrar el archivo');
          } finally {
            setIsDecrypting(false);
          }
        }
        
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(processedBlob);
        
        setFileData({
          blob: processedBlob,
          url: objectUrl,
          metadata: mockMetadata
        });
        
      } catch (err) {
        console.error('Error loading file:', err);
        setError('No se pudo cargar el archivo. Por favor, inténtalo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
    
    // Cleanup object URL on unmount
    return () => {
      if (fileData?.url) {
        URL.revokeObjectURL(fileData.url);
      }
    };
  }, [cid]);

  // Render file preview based on MIME type
  const renderFilePreview = () => {
    if (!fileData?.metadata || !fileData.url) return null;
    
    const { type } = fileData.metadata;
    
    if (type.startsWith('image/')) {
      return (
        <img 
          src={fileData.url} 
          alt={fileData.metadata.name || 'Imagen'} 
          className="max-h-[70vh] w-auto mx-auto rounded-lg shadow-md"
        />
      );
    }
    
    if (type.startsWith('video/')) {
      return (
        <video 
          src={fileData.url} 
          controls 
          className="max-h-[70vh] w-auto mx-auto rounded-lg shadow-md"
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      );
    }
    
    if (type.startsWith('audio/')) {
      return (
        <div className="bg-muted/30 rounded-lg p-8 flex items-center justify-center">
          <audio src={fileData.url} controls className="w-full max-w-md" />
        </div>
      );
    }
    
    // Default preview for unsupported or unknown file types
    return (
      <div className="bg-muted/30 rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Vista previa no disponible para este tipo de archivo
        </p>
      </div>
    );
  };

  // Loading state
  if (isLoading || isDecrypting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-96 rounded-lg" />
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              
              <div className="pt-4">
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="pt-4">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // No file data
  if (!fileData?.metadata) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró el archivo solicitado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { metadata } = fileData;
  const isOwner = currentUserCid === metadata.cid_profile;
  const fileType = metadata.type.split('/')[0];
  const fileExtension = metadata.name?.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a QpiC
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="p-4 bg-muted/10 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon(metadata.type)}
                <h1 className="text-xl font-semibold truncate max-w-md">
                  {metadata.name || `Archivo-${cid?.substring(0, 8)}`}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {fileExtension || fileType}
                </Badge>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownload}
                  disabled={!fileData.blob}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-center min-h-[400px] bg-muted/5">
              {renderFilePreview()}
            </div>
            
            <div className="p-4 border-t">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <File className="h-4 w-4" />
                  <span>{formatFileSize(metadata.size)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(metadata.createdAt)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {cid?.substring(0, 8)}...{cid?.substring(cid.length - 4)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={copyToClipboard}
                    title="Copiar CID"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Author info */}
          {metadata.cid_profile ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {isOwner ? 'Subido por ti' : 'Subido por'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniProfileCard 
                  cid={metadata.cid_profile}
                  showFollowButton={!isOwner}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Autor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <span>Desconocido</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* File info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Información del archivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm">{metadata.type}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Tamaño</p>
                <p className="text-sm">{formatFileSize(metadata.size)}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Subido</p>
                <p className="text-sm">{formatDate(metadata.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">CID</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-mono text-sm truncate max-w-[180px]">
                    {cid}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={copyToClipboard}
                    title="Copiar CID"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleDownload}
              disabled={!fileData.blob}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            
            <Button variant="outline" className="w-full">
              Compartir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QpicItemDetailPage;
