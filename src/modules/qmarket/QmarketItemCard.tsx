import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QmarketItem } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, ArrowRight, Mail } from 'lucide-react';

export interface QmarketItemCardProps {
  /** The marketplace item to display */
  item: QmarketItem;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
  /** Display mode */
  variant?: 'grid' | 'list';
}

// Helper function to format price
const formatPrice = (price: number): string => {
  if (price === 0) return 'Gratuito';
  return `${price} AQ`; // AQ = AnarQ tokens
};

// Helper to get license short name
const getLicenseShortName = (license: string): string => {
  const licenseMap: Record<string, string> = {
    'all-rights-reserved': '©',
    'cc-by': 'CC BY',
    'cc-by-sa': 'CC BY-SA',
    'cc-by-nc': 'CC BY-NC',
    'cc-by-nc-sa': 'CC BY-NC-SA',
    'cc0': 'CC0',
    'mit': 'MIT',
    'gpl-3.0': 'GPL-3.0',
    'apache-2.0': 'Apache 2.0',
    'proprietary': 'Propietario',
  };
  return licenseMap[license] || license;
};

// Helper to generate Qmail share URL
const getQmailShareUrl = (item: QmarketItem): string => {
  const { cid, metadata } = item;
  const params = new URLSearchParams({
    subject: `Compartido desde Qmarket: ${metadata.title}`,
    content: [
      `Consulta este contenido en AnarQ Market:\n\n`,
      `Título: ${metadata.title}`,
      `Tipo: ${item.content.type}`,
      `CID: ${cid}`,
      `Precio: ${metadata.price ? `${metadata.price} AQ` : 'Gratuito'}`,
      `\n\nAccede al contenido: /qmarket/item/${cid}`
    ].join('\n'),
    priority: 'NORMAL'
  });
  
  return `/qmail/compose?${params.toString()}`;
};

// Helper to get file type icon
const getFileTypeIcon = (type: string) => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('compressed')) return '🗜️';
  return '📁';
};

/**
 * Displays a marketplace item in a card format
 */
export const QmarketItemCard: React.FC<QmarketItemCardProps> = ({
  item,
  onClick,
  className,
  variant = 'grid',
  ...props
}) => {
  const navigate = useNavigate();
  const { metadata, content, publisher } = item;
  const { title, description, tags = [], price, license } = metadata;
  const truncatedDescription = 
    description && description.length > 100 
      ? `${description.substring(0, 100)}...` 
      : description;

  // Render publisher info
  const renderPublisher = () => (
    <div className="flex items-center gap-2 mt-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={`/api/avatar/${publisher.cid_profile}`} />
        <AvatarFallback>
          {publisher.name ? publisher.name[0].toUpperCase() : '?'}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-muted-foreground truncate">
        {publisher.name || 'Anónimo'}
      </span>
    </div>
  );

  // Render tags
  const renderTags = () => (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.slice(0, 3).map((tag, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs font-normal"
        >
          {tag}
        </Badge>
      ))}
      {tags.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{tags.length - 3}
        </Badge>
      )}
    </div>
  );

  // Price badge
  const priceBadge = (
    <Badge 
      variant={price > 0 ? 'default' : 'secondary'}
      className={cn(
        'ml-auto',
        price > 0 ? 'bg-primary/10 text-primary' : ''
      )}
    >
      {formatPrice(price)}
    </Badge>
  );

  // License badge
  const licenseBadge = (
    <Badge variant="outline" className="text-xs">
      {getLicenseShortName(license)}
    </Badge>
  );

  // File type indicator
  const fileTypeIcon = (
    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
      <span className="text-lg">{getFileTypeIcon(content.type)}</span>
    </div>
  );

  // Handle Qmail share
  const handleQmailShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getQmailShareUrl(item);
    navigate(shareUrl);
  };

  const cardContent = (
    <>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
            {title}
          </CardTitle>
          {priceBadge}
        </div>
        {variant === 'grid' && renderPublisher()}
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {truncatedDescription && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {truncatedDescription}
          </p>
        )}
        
        {variant === 'grid' && tags.length > 0 && renderTags()}
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {licenseBadge}
            {variant === 'list' && (
              <span className="text-xs text-muted-foreground">
                {content.size ? `${(content.size / (1024 * 1024)).toFixed(1)} MB` : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleQmailShare}
              title="Compartir por Qmail"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="sr-only">Compartir por Qmail</span>
            </Button>
            {variant === 'list' && (
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                Ver más
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        {variant === 'list' && (
          <div className="mt-3 pt-3 border-t">
            {renderPublisher()}
          </div>
        )}
      </CardContent>
      
      {variant === 'grid' && (
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 flex-shrink-0"
            onClick={handleQmailShare}
            title="Compartir por Qmail"
          >
            <Mail className="h-4 w-4" />
            <span className="sr-only">Compartir por Qmail</span>
          </Button>
          {onClick && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Ver detalles
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardFooter>
      )}
    </>
  );

  const cardClassName = cn(
    'h-full flex flex-col overflow-hidden transition-all hover:shadow-md',
    variant === 'list' ? 'flex-row' : 'flex-col',
    onClick ? 'cursor-pointer' : '',
    className
  );

  if (variant === 'list') {
    return (
      <Card 
        className={cardClassName}
        onClick={onClick}
      >
        <div className="w-32 bg-muted/30 flex-shrink-0 relative">
          {fileTypeIcon}
          <div className="absolute inset-0 flex items-center justify-center text-4xl">
            {getFileTypeIcon(content.type)}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {cardContent}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cardClassName}
      onClick={onClick}
    >
      <div className="aspect-video bg-muted/30 relative">
        {fileTypeIcon}
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          {getFileTypeIcon(content.type)}
        </div>
      </div>
      {cardContent}
    </Card>
  );
};

export default QmarketItemCard;
