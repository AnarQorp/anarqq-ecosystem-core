import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Lock, 
  Share2, 
  ExternalLink, 
  Mail, 
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShareMenu } from './ShareMenu';
import { generateQmarketItemFromQpic } from '@/modules/qmarket/utils';
import { useSessionContext } from '@/contexts/SessionContext';
import { copyShareLink, shareViaQmail } from '@/services/qmailService';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface QpicMediaItemProps {
  item: {
    cid: string;
    name: string;
    type: string;
    size?: number;
    timestamp?: string;
    metadata?: {
      isEncrypted?: boolean;
      fileHash?: string;
      [key: string]: any;
    };
  };
  onPublish?: (item: any) => void;
  onPreview?: (item: any) => void;
  className?: string;
}

export function QpicMediaItem({ item, onPublish, onPreview, className }: QpicMediaItemProps) {
  const { session, cid_profile } = useSessionContext();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  const isImage = item.type?.startsWith('image/');
  const isVideo = item.type?.startsWith('video/');
  const isEncrypted = item.metadata?.isEncrypted;
  // @ts-ignore - session.issuer contains the DID
  const isOwner = item.metadata?.uploaderDid === session?.issuer;
  
  const handlePublish = () => {
    if (!isOwner) {
      toast({
        title: 'Not authorized',
        description: 'Only the uploader can publish this item',
        variant: 'destructive',
      });
      return;
    }
    setShowPublishModal(true);
  };

  const handleShare = async (viaQmail = false) => {
    try {
      setIsSharing(true);
      
      if (viaQmail) {
        shareViaQmail({
          cid: item.cid,
          name: item.name || 'Unnamed file',
          type: item.type || 'application/octet-stream',
          isEncrypted,
          fileHash: item.metadata?.fileHash,
        });
      } else {
        const success = await copyShareLink({
          cid: item.cid,
          name: item.name || 'Unnamed file',
          type: item.type || 'application/octet-stream',
          isEncrypted,
          fileHash: item.metadata?.fileHash,
        });
        
        setShareSuccess(success);
        
        if (success) {
          toast({
            title: 'Link copied',
            description: 'Shareable link copied to clipboard',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to copy link to clipboard',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: 'Error',
        description: 'Failed to share file',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
      
      // Reset success state after 2 seconds
      if (shareSuccess !== null) {
        setTimeout(() => setShareSuccess(null), 2000);
      }
    }
  };
  
  const handlePreview = () => {
    if (onPreview) {
      onPreview(item);
    }
  };
  
  const qmarketItem = generateQmarketItemFromQpic(
    {
      ipfsHash: item.cid,
      fileName: item.name,
      fileType: item.type,
      fileSize: item.size,
      timestamp: item.timestamp || new Date().toISOString(),
      description: item.metadata?.description,
    },
    cid_profile || ''
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div 
        className={cn(
          'relative aspect-square bg-muted flex items-center justify-center',
          'cursor-pointer hover:opacity-90 transition-opacity',
          isEncrypted && 'opacity-80'
        )}
        onClick={handlePreview}
      >
        {isImage ? (
          <img 
            src={`/api/ipfs/${item.cid}`} 
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video 
              src={`/api/ipfs/${item.cid}`}
              className="w-full h-full object-cover"
              controls={false}
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <VideoIcon className="h-12 w-12 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground truncate max-w-full px-2">
              {item.name}
            </span>
          </div>
        )}
        
        {isEncrypted && (
          <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5">
            <Lock className="h-4 w-4 text-foreground" />
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.size || 0)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ShareMenu 
              cid={item.cid} 
              name={item.name}
              type={item.type}
              isEncrypted={isEncrypted}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              disabled={isSharing}
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : shareSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
              ) : shareSuccess === false ? (
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleShare()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Copy share link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Send via Qmail
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handlePublish}
          disabled={!isOwner || isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Publish
        </Button>
      </CardFooter>
      
      {showPublishModal && (
        <QmarketPublishModal
          open={showPublishModal}
          onClose={() => {
            setShowPublishModal(false);
            onPublish?.(item);
          }}
          item={{
            ipfsHash: item.cid,
            fileName: item.name || 'Unnamed file',
            timestamp: item.timestamp || new Date().toISOString(),
            cid_profile: cid_profile || undefined,
            fileSize: item.size,
            fileType: item.type,
            description: item.metadata?.description,
          }}
        />
      )}
    </Card>
  );
}

// Lazy load the QmarketPublishModal to reduce bundle size
const QmarketPublishModal = React.lazy(() => 
  import('@/modules/qmarket/QmarketPublishModal')
);

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default QpicMediaItem;
