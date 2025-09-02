/**
 * EcosystemFileDisplay Component
 * 
 * Displays file attachments with full ecosystem integration information.
 * Shows Qonsent privacy, Qlock encryption, IPFS CID, Qindex searchability, and QNET routing.
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Eye, 
  Globe, 
  Lock, 
  Shield, 
  Search,
  Network,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QsocialFileAttachment } from '@/types/qsocial';
import { ecosystemFileService } from '@/services/qsocial/EcosystemFileService';

interface EcosystemFileDisplayProps {
  attachment: QsocialFileAttachment;
  compact?: boolean;
  showEcosystemInfo?: boolean;
  className?: string;
}

export const EcosystemFileDisplay: React.FC<EcosystemFileDisplayProps> = ({
  attachment,
  compact = false,
  showEcosystemInfo = true,
  className = ''
}) => {
  const [downloading, setDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get file type icon
  const getFileIcon = () => {
    const iconProps = { className: "h-5 w-5" };
    
    if (attachment.contentType.startsWith('image/')) {
      return <ImageIcon {...iconProps} />;
    } else if (attachment.contentType.startsWith('video/')) {
      return <Video {...iconProps} />;
    } else if (attachment.contentType.startsWith('audio/')) {
      return <Music {...iconProps} />;
    } else {
      return <File {...iconProps} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    return ecosystemFileService.formatFileSize(bytes);
  };

  // Handle file download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await ecosystemFileService.downloadFile(attachment.fileId);
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Handle file preview
  const handlePreview = async () => {
    try {
      const signedUrl = await ecosystemFileService.generateSignedUrl(attachment.fileId);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  // Copy IPFS CID
  const copyIPFSCid = async () => {
    if (attachment.ecosystem.ipfs.cid) {
      try {
        await navigator.clipboard.writeText(attachment.ecosystem.ipfs.cid);
        // TODO: Show success toast
      } catch (error) {
        console.error('Copy error:', error);
      }
    }
  };

  // Copy IPFS gateway URL
  const copyIPFSUrl = async () => {
    if (attachment.ecosystem.ipfs.cid) {
      const url = `https://ipfs.io/ipfs/${attachment.ecosystem.ipfs.cid}`;
      try {
        await navigator.clipboard.writeText(url);
        // TODO: Show success toast
      } catch (error) {
        console.error('Copy error:', error);
      }
    }
  };

  // Render file preview for images
  const renderFilePreview = () => {
    if (attachment.contentType.startsWith('image/') && attachment.thumbnailUrl) {
      return (
        <div className="relative group cursor-pointer" onClick={handlePreview}>
          <img
            src={attachment.thumbnailUrl}
            alt={attachment.originalName}
            className="w-full h-48 object-cover rounded-lg"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      );
    }

    return null;
  };

  // Render ecosystem badges
  const renderEcosystemBadges = () => {
    if (!showEcosystemInfo || compact) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {/* Qonsent Privacy */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {attachment.ecosystem.qonsent.visibility}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Privacy Level: {attachment.ecosystem.qonsent.visibility}</p>
              <p>Profile: {attachment.ecosystem.qonsent.profileId}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Qlock Encryption */}
        {attachment.ecosystem.qlock.encrypted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  {attachment.ecosystem.qlock.encryptionLevel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Encrypted with {attachment.ecosystem.qlock.encryptionLevel} level</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* IPFS CID */}
        {attachment.ecosystem.ipfs.cid && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-pointer" onClick={copyIPFSCid}>
                  <Globe className="h-3 w-3 mr-1" />
                  IPFS
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>IPFS CID: {attachment.ecosystem.ipfs.cid.substring(0, 20)}...</p>
                <p>Click to copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Qindex Searchable */}
        {attachment.ecosystem.qindex.searchable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <Search className="h-3 w-3 mr-1" />
                  Indexed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Searchable in ecosystem</p>
                <p>Index ID: {attachment.ecosystem.qindex.indexId}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* QNET Routing */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                <Network className="h-3 w-3 mr-1" />
                Routed
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optimized network routing</p>
              <p>Route ID: {attachment.ecosystem.qnet.routingId}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Filecoin */}
        {attachment.ecosystem.filecoin?.filecoinCid && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Filecoin
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Prepared for Filecoin storage</p>
                <p>Status: {attachment.ecosystem.filecoin.dealStatus}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 border rounded ${className}`}>
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.originalName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.fileSize)} • {attachment.contentType}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        {/* File Preview */}
        {renderFilePreview()}

        {/* File Information */}
        <div className="flex items-start gap-3 mt-3">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium truncate">{attachment.originalName}</h4>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreview}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {/* Ecosystem Details Dialog */}
                <Dialog open={showDetails} onOpenChange={setShowDetails}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Ecosystem File Details</DialogTitle>
                      <DialogDescription>
                        Complete ecosystem integration information for {attachment.originalName}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Basic File Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">File Name</label>
                          <p className="text-sm text-muted-foreground">{attachment.originalName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">File Size</label>
                          <p className="text-sm text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Content Type</label>
                          <p className="text-sm text-muted-foreground">{attachment.contentType}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Uploaded</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(attachment.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Ecosystem Integration Details */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Ecosystem Integration</h4>
                        
                        {/* Qonsent */}
                        <div className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Qonsent Privacy</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Visibility: {attachment.ecosystem.qonsent.visibility}</div>
                            <div>Encryption: {attachment.ecosystem.qonsent.encryptionLevel}</div>
                            <div className="col-span-2">Profile: {attachment.ecosystem.qonsent.profileId}</div>
                          </div>
                        </div>

                        {/* Qlock */}
                        <div className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="h-4 w-4" />
                            <span className="font-medium">Qlock Encryption</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Encrypted: {attachment.ecosystem.qlock.encrypted ? 'Yes' : 'No'}</div>
                            <div>Level: {attachment.ecosystem.qlock.encryptionLevel}</div>
                            {attachment.ecosystem.qlock.keyId && (
                              <div className="col-span-2">Key ID: {attachment.ecosystem.qlock.keyId}</div>
                            )}
                          </div>
                        </div>

                        {/* IPFS */}
                        {attachment.ecosystem.ipfs.cid && (
                          <div className="border rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-4 w-4" />
                              <span className="font-medium">IPFS Integration</span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span>CID:</span>
                                <code className="bg-muted px-1 rounded text-xs flex-1 truncate">
                                  {attachment.ecosystem.ipfs.cid}
                                </code>
                                <Button variant="ghost" size="sm" onClick={copyIPFSCid}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Gateway:</span>
                                <Button variant="ghost" size="sm" onClick={copyIPFSUrl}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  ipfs.io
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Qindex */}
                        <div className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="h-4 w-4" />
                            <span className="font-medium">Qindex Metadata</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Searchable: {attachment.ecosystem.qindex.searchable ? 'Yes' : 'No'}</div>
                            <div>Index ID: {attachment.ecosystem.qindex.indexId}</div>
                          </div>
                        </div>

                        {/* QNET */}
                        <div className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4" />
                            <span className="font-medium">QNET Routing</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>Route ID: {attachment.ecosystem.qnet.routingId}</div>
                            <div className="flex items-center gap-2">
                              <span>Routed URL:</span>
                              <code className="bg-muted px-1 rounded text-xs flex-1 truncate">
                                {attachment.ecosystem.qnet.routedUrl}
                              </code>
                            </div>
                            {attachment.ecosystem.qnet.accessToken && (
                              <div>Access Token: Protected</div>
                            )}
                          </div>
                        </div>

                        {/* Filecoin */}
                        {attachment.ecosystem.filecoin && (
                          <div className="border rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">Filecoin Storage</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>Status: {attachment.ecosystem.filecoin.dealStatus}</div>
                              {attachment.ecosystem.filecoin.filecoinCid && (
                                <div className="col-span-2">
                                  CID: {attachment.ecosystem.filecoin.filecoinCid}
                                </div>
                              )}
                              {attachment.ecosystem.filecoin.dealId && (
                                <div className="col-span-2">
                                  Deal ID: {attachment.ecosystem.filecoin.dealId}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Processing Time */}
                      {attachment.processingTime && (
                        <div className="text-xs text-muted-foreground">
                          Processing time: {attachment.processingTime}ms
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(attachment.fileSize)} • {attachment.contentType}
            </p>

            {/* Ecosystem Badges */}
            {renderEcosystemBadges()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EcosystemFileDisplay;