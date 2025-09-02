import React from 'react';
import { Link } from 'react-router-dom';
import { QmarketItem } from '../types/extended';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/lib/utils/format';
import { FileIcon, Eye, Download, Edit, MoreVertical, Lock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QmarketItemCardProps {
  item: QmarketItem;
  onClick?: () => void;
  showStatus?: boolean;
  className?: string;
}

export function QmarketItemCard({ item, onClick, showStatus = false, className = '' }: QmarketItemCardProps) {
  const isFree = item.metadata.price === 0;
  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  const getFileIcon = () => {
    const type = item.content.type.split('/')[0];
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'application':
        return '📄';
      default:
        return '📁';
    }
  };

  return (
    <Card 
      className={`overflow-hidden transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted/50 flex items-center justify-center">
        {item.contentData ? (
          <div className="w-full h-full flex items-center justify-center bg-black/5 dark:bg-white/5">
            {getFileIcon()}
          </div>
        ) : (
          <div className="p-8 text-muted-foreground">
            <FileIcon className="h-12 w-12 mx-auto" />
            <span className="sr-only">File preview</span>
          </div>
        )}
        
        {showStatus && (
          <Badge 
            className={`absolute top-2 right-2 ${statusColors[item.status] || 'bg-primary/10 text-primary'}`}
            variant="outline"
          >
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Badge>
        )}
        
        {item.isEncrypted && !item.contentData && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Lock className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base line-clamp-1">
              {item.metadata.title}
            </CardTitle>
            <CardDescription className="text-xs line-clamp-2 h-10">
              {item.metadata.description || 'No description'}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/qmarket/item/${item.cid}`} className="cursor-pointer">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              {item.isOwner && (
                <DropdownMenuItem asChild>
                  <Link to={`/qmarket/item/${item.cid}/edit`} className="cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            {isFree ? 'Free' : `${item.metadata.price} AQ`}
          </span>
          {!isFree && !item.isOwner && !item.hasPurchased && (
            <Badge variant="outline" className="text-xs">
              Buy to Download
            </Badge>
          )}
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <span>{formatFileSize(item.content.size)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default QmarketItemCard;
