import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getQmailShareUrl, shareViaQmail } from '@/services/qmailService';
import { useIdentityStore } from '@/state/identity';
import { useSessionContext } from '@/contexts/SessionContext';
import { useStorachaClient } from '@/services/ucanService';
import { File, Search, Upload, Share2, Mail, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { useQpicUploads } from '@/hooks/useQpicUploads';
import type { UnifiedFile } from '@/modules/qpic/types';
import QpicMediaItem from '@/modules/qpic/components/QpicMediaItem';

// Lazy load the QmarketPublishModal
const QmarketPublishModal = React.lazy(() => 
  import('@/modules/qmarket/QmarketPublishModal')
);

// Lazy load the preview modal
const QpicPreviewModal = lazy(() => import('@/components/qdrive/modals/QpicPreviewModal'));

// Get files for a specific DID from the backend
async function getFilesByDID(did: string): Promise<UnifiedFile[]> {
  try {
    const response = await fetch(`/api/ipfs/files?did=${encodeURIComponent(did)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    
    const files = await response.json();
    return files.map((file: any) => ({
      cid: file.cid,
      name: file.name || `file_${file.cid.slice(0, 8)}`,
      type: file.contentType || 'application/octet-stream',
      size: file.size,
      timestamp: file.timestamp || new Date().toISOString(),
      cid_profile: file.metadata?.cid_profile,
      metadata: file.metadata || {}
    }));
  } catch (error) {
    console.error('Error fetching files:', error);
    return [];
  }
}

// Format file size helper function
const formatFileSize = (bytes: number = 0): string => {
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

interface HistoryTabProps {
  isQpic?: boolean;
}

export default function HistoryTab({ isQpic = false }: HistoryTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeIdentity } = useIdentityStore();
  const { cid_profile, session } = useSessionContext();
  const { client } = useStorachaClient();
  const [publishingFile, setPublishingFile] = useState<UnifiedFile | null>(null);
  const [files, setFiles] = useState<UnifiedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<UnifiedFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [shareLoading, setShareLoading] = useState<Record<string, boolean>>({});
  const [shareSuccess, setShareSuccess] = useState<Record<string, boolean>>({});
  
  // Use the QpiC uploads hook
  const { uploads: qpicUploads, loading: qpicLoading } = useQpicUploads({
    includeQpic: true,
    filter: { source: ['qpic'] }
  });

  const allFiles = isQpic ? qpicUploads : files;
  
  const filteredFiles = allFiles.filter((file) => {
    const query = searchQuery.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.cid.toLowerCase().includes(query) ||
      file.metadata?.source?.toLowerCase().includes(query) ||
      file.metadata?.description?.toLowerCase().includes(query)
    );
  });
  
  const isLoading = isQpic ? qpicLoading : loading;

  const handlePublish = (file: UnifiedFile) => {
    // @ts-ignore - session.issuer contains the DID
    if (file.metadata?.uploaderDid !== session?.issuer) {
      toast({
        title: 'Not authorized',
        description: 'Only the uploader can publish this file to Qmarket',
        variant: 'destructive',
      });
      return;
    }
    setPublishingFile(file);
  };

  const handlePublishSuccess = () => {
    toast({
      title: 'Published to Qmarket',
      description: 'Your file has been published to Qmarket successfully!',
      variant: 'default',
    });
    setPublishingFile(null);
  };

  const handlePublishCancel = () => {
    setPublishingFile(null);
  };

  const handlePreview = (file: UnifiedFile) => {
    setSelectedFile(file);
    setShowPreview(true);
  };

  const handleShare = async (file: UnifiedFile, viaQmail = false) => {
    const fileId = file.cid;
    setShareLoading(prev => ({ ...prev, [fileId]: true }));
    setShareSuccess(prev => ({ ...prev, [fileId]: false }));

    try {
      if (viaQmail) {
        shareViaQmail({
          cid: file.cid,
          name: file.name || 'Unnamed file',
          type: file.type || 'application/octet-stream',
          isEncrypted: file.metadata?.isEncrypted,
          fileHash: file.metadata?.fileHash,
        });
      } else {
        const shareUrl = getQmailShareUrl({
          cid: file.cid,
          name: file.name || 'Unnamed file',
          type: file.type || 'application/octet-stream',
          isEncrypted: file.metadata?.isEncrypted,
          fileHash: file.metadata?.fileHash,
        });
        
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(prev => ({ ...prev, [fileId]: true }));
        
        toast({
          title: 'Link copied',
          description: 'Shareable link copied to clipboard',
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: 'Error',
        description: 'Failed to share file',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(prev => ({ ...prev, [fileId]: false }));
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setShareSuccess(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }, 3000);
    }
  };
  
  const handleDownload = async (file: UnifiedFile) => {
    try {
      const response = await fetch(`/api/ipfs/${file.cid}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo',
        variant: 'destructive',
      });
    }
  };
  
  const handleCopyLink = (file: UnifiedFile) => {
    const url = `${window.location.origin}/view/${file.cid}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Enlace copiado',
        description: 'El enlace se ha copiado al portapapeles',
      });
    });
  };

  return (
    <div className="space-y-4">
      <TabsContent value="files" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {isQpic ? 'Tus archivos QpiC' : 'Tus archivos'}
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Buscar ${isQpic ? 'QpiC' : 'archivos'}...`}
              className="w-full bg-background pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-1">
              {isQpic ? 'No hay archivos QpiC' : 'No hay archivos'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'No se encontraron archivos que coincidan con tu búsqueda' 
                : isQpic 
                  ? 'Sube tu primer archivo con QpiC para comenzar'
                  : 'Sube tu primer archivo para comenzar'
              }
            </p>
            {!searchQuery && !isQpic && (
              <Button className="mt-4" onClick={() => navigate('/upload')}>
                Subir archivo
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                // @ts-ignore - session.issuer contains the DID
                const isOwner = file.metadata?.uploaderDid === session?.issuer;
                const isPublished = file.metadata?.publishedToQmarket === true;
                
                return (
                  <div key={file.cid} className="relative group">
                    <QpicMediaItem
                      item={file}
                      onPublish={() => handlePublish(file)}
                      onPreview={() => handlePreview(file)}
                    />
                    {isOwner && !isPublished && (
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {shareLoading[file.cid] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : shareSuccess[file.cid] ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Share2 className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShare(file, false);
                                }}
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                <span>Copy Share Link</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShare(file, true);
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                <span>Send via Qmail</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublish(file);
                            }}
                            disabled={!isOwner || file.metadata?.publishedToQmarket}
                          >
                            {file.metadata?.publishedToQmarket ? 'Published' : 'Publish to Qmarket'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {isPublished && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                          On Qmarket
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      {/* Qmarket Publish Modal */}
      <Suspense fallback={null}>
        {publishingFile && cid_profile && (
          <QmarketPublishModal
            open={!!publishingFile}
            onClose={() => setPublishingFile(null)}
            item={{
              ipfsHash: publishingFile.cid,
              fileName: publishingFile.name,
              fileType: publishingFile.type,
              fileSize: publishingFile.size,
              timestamp: publishingFile.timestamp || new Date().toISOString(),
              description: publishingFile.metadata?.description,
              cid_profile: cid_profile
            }}
          />
        )}
      </Suspense>

      {showPreview && selectedFile && (
        <Suspense fallback={null}>
          <QpicPreviewModal
            open={showPreview}
            onClose={() => setShowPreview(false)}
            file={{
              ipfsHash: selectedFile.cid,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
              timestamp: selectedFile.timestamp || new Date().toISOString(),
              cid_profile: selectedFile.cid_profile,
              metadata: selectedFile.metadata,
            }}
            onPublish={() => handlePublish(selectedFile)}
          />
        </Suspense>
      )}
    </div>
  );
}
