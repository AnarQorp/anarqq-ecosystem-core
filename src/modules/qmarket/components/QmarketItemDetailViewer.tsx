import React, { useState } from 'react';
import { QmarketItemDetail } from '../types/itemDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatFileSize } from '@/lib/utils/format';
import { FileIcon, Download, Lock, Unlock, Copy, Share2, Mail, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getQmailShareUrl } from '../utils/share';
import { useIdentityStore } from '@/state/identity';
import { purchaseQmarketItem } from '../api';
import { useNavigate } from 'react-router-dom';

interface QmarketItemDetailViewerProps {
  item: QmarketItemDetail;
  onDownload?: () => void;
  onDecrypt?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  className?: string;
  variant?: 'market' | 'social';
}

/**
 * Reusable component to display a Qmarket item in detail view
 * Can be used in both Qmarket and Qsocial contexts
 */
export const QmarketItemDetailViewer: React.FC<QmarketItemDetailViewerProps> = ({
  item,
  onDownload,
  onDecrypt,
  onEdit,
  onRemove,
  className,
  variant = 'market',
}) => {
  const currentUser = useIdentityStore(state => state.activeIdentity);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const isOwner = currentUser?.did === item.publisher.did;
  const isFree = item.metadata.price === 0;
  const [hasPurchased, setHasPurchased] = useState(item.hasPurchased || false);
  
  // Handle copy to clipboard
  const handleCopyCID = () => {
    navigator.clipboard.writeText(item.cid);
    toast({
      title: 'Copied to clipboard',
      description: 'CID has been copied to your clipboard',
    });
  };
  
  // Handle purchase and download
  const handlePurchase = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to purchase this item',
        variant: 'destructive',
      });
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await purchaseQmarketItem(item.cid);
      
      if (result.success) {
        toast({
          title: 'Purchase successful!',
          description: 'You can now download this item.',
        });
        setHasPurchased(true);
        
        // If there's a direct download URL, trigger download
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        } else if (onDownload) {
          onDownload();
        }
      } else {
        throw new Error(result.error || 'Failed to process purchase');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download with permission check
  const handleDownload = async () => {
    if (isProcessing) return;
    
    if (isOwner || hasPurchased || isFree) {
      if (onDownload) {
        setIsProcessing(true);
        try {
          await onDownload();
        } finally {
          setIsProcessing(false);
        }
      }
    } else {
      // If not purchased and not free, trigger purchase flow
      await handlePurchase();
    }
  };

  // Handle share via Qmail
  const handleShare = () => {
    const shareUrl = getQmailShareUrl(item);
    window.open(shareUrl, '_blank');
  };
  
  // Render the content preview based on file type
  const renderContentPreview = () => {
    if (item.error) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-red-500">{item.error}</p>
        </div>
      );
    }
    
    if (item.isEncrypted) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
          <Lock className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">This content is encrypted</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You need to decrypt this content to view it
          </p>
          <Button onClick={onDecrypt} disabled={!onDecrypt || item.isDecrypting}>
            {item.isDecrypting ? 'Decrypting...' : 'Decrypt Content'}
          </Button>
        </div>
      );
    }
    
    if (!item.contentData) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">No content available</p>
        </div>
      );
    }
    
    const { type } = item.content;
    
    // Image preview
    if (type.startsWith('image/')) {
      const src = URL.createObjectURL(new Blob([item.contentData], { type }));
      return (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img 
            src={src} 
            alt={item.metadata.title} 
            className="max-h-[500px] w-auto object-contain"
            onLoad={() => URL.revokeObjectURL(src)}
          />
        </div>
      );
    }
    
    // Video preview
    if (type.startsWith('video/')) {
      const src = URL.createObjectURL(new Blob([item.contentData], { type }));
      return (
        <div className="bg-black rounded-lg overflow-hidden">
          <video 
            src={src}
            controls
            className="w-full max-h-[500px]"
          />
        </div>
      );
    }
    
    // Audio preview
    if (type.startsWith('audio/')) {
      const src = URL.createObjectURL(new Blob([item.contentData], { type }));
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <FileIcon className="h-12 w-12 text-gray-400" />
          </div>
          <audio 
            src={src}
            controls
            className="w-full"
          />
        </div>
      );
    }
    
    // Default file preview
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <FileIcon className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-sm text-gray-500 mb-2">Preview not available for this file type</p>
        <p className="text-xs text-gray-400 mb-4">{type}</p>
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };
  
  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">{item.metadata.title}</CardTitle>
                  {item.metadata.description && (
                    <CardDescription className="mt-2">
                      {item.metadata.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex space-x-2">
                  {isOwner && onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {isOwner && onRemove && (
                    <Button variant="outline" size="sm" onClick={onRemove}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {renderContentPreview()}
            </CardContent>
            
            <CardFooter className="flex justify-between items-center border-t">
              <div className="text-sm text-muted-foreground">
                {formatFileSize(item.content.size)} • {item.content.type}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleCopyCID}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy CID
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                size="sm" 
                onClick={handleDownload} 
                disabled={!onDownload || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isOwner || hasPurchased || isFree ? 'Download' : `Purchase for ${item.metadata.price} AQ`}
              </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Additional content can go here (comments, related items, etc.) */}
          {variant === 'social' && (
            <Card>
              <CardHeader>
                <CardTitle>Discussion</CardTitle>
                <CardDescription>Comments and reactions will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Comments and reactions coming soon</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publisher info */}
          <Card>
            <CardHeader>
              <CardTitle>Publisher</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`/api/avatar/${item.publisher.cid_profile}`} />
                  <AvatarFallback>{item.publisher.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{item.publisher.name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.publisher.did.slice(0, 12)}...{item.publisher.did.slice(-6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">License</h4>
                <p>{item.metadata.license}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Price</h4>
                <p>{item.metadata.price > 0 ? `${item.metadata.price} AQ` : 'Free'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Published</h4>
                <p>{new Date(item.metadata.createdAt).toLocaleDateString()}</p>
              </div>
              
              {item.metadata.updatedAt && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                  <p>{new Date(item.metadata.updatedAt).toLocaleDateString()}</p>
                </div>
              )}
              
              {item.metadata.tags && item.metadata.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.metadata.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleCopyCID}>
                <Copy className="h-4 w-4 mr-2" />
                Copy CID
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
                <Mail className="h-4 w-4 mr-2" />
                Share via Qmail
              </Button>
              
              {!isOwner && !hasPurchased && !isFree && (
                <Button 
                  className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={handlePurchase}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <span>Purchase for {item.metadata.price} AQ</span>
                  )}
                </Button>
              )}
              {item.isEncrypted ? (
                <Button className="w-full justify-start" onClick={onDecrypt} disabled={!onDecrypt || item.isDecrypting}>
                  <Unlock className="h-4 w-4 mr-2" />
                  {item.isDecrypting ? 'Decrypting...' : 'Decrypt Content'}
                </Button>
              ) : (
                <Button className="w-full justify-start" onClick={onDownload} disabled={!onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QmarketItemDetailViewer;
