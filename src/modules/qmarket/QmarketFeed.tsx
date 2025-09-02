import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityStore } from '@/state/identity';
import { Feed } from '@/components/shared/Feed';
import { QmarketItem } from './types';
import { QmarketItemCard } from './QmarketItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type QmarketFeedFilter = 'all' | 'free' | 'premium' | 'mine';

interface QmarketFeedProps {
  /** Filter to apply to the feed */
  filter?: QmarketFeedFilter;
  /** Custom class name */
  className?: string;
  /** Layout mode */
  variant?: 'grid' | 'list';
  /** Maximum number of items to show (for pagination) */
  limit?: number;
  /** Callback when an item is clicked */
  onItemClick?: (item: QmarketItem) => void;
}

// Mock data function - Replace this with actual IPFS query in production
const fetchMarketItems = async (): Promise<QmarketItem[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return mock data
  return [
    {
      cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      publisher: {
        cid_profile: 'QmProfile1',
        did: 'did:example:123',
        name: 'Artista Digital',
      },
      metadata: {
        title: 'Obra de arte digital exclusiva',
        description: 'Una pieza única de arte generativo creada con algoritmos personalizados.',
        tags: ['arte', 'digital', 'generativo'],
        license: 'cc-by-nc',
        price: 10.5,
        createdAt: '2025-06-15T10:30:00Z',
      },
      content: {
        type: 'image/png',
        size: 2457600, // 2.5MB
        source: 'qpic',
      },
    },
    {
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      publisher: {
        cid_profile: 'QmProfile2',
        did: 'did:example:456',
        name: 'Fotógrafo Profesional',
      },
      metadata: {
        title: 'Colección de fotos de paisajes',
        description: 'Paquete con 10 fotos en alta resolución de paisajes naturales.',
        tags: ['fotografía', 'paisajes', 'naturaleza'],
        license: 'cc-by',
        price: 5.0,
        createdAt: '2025-06-20T14:15:00Z',
      },
      content: {
        type: 'image/jpeg',
        size: 5242880, // 5MB
        source: 'qdrive',
      },
    },
    {
      cid: 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
      publisher: {
        cid_profile: 'QmProfile3',
        did: 'did:example:789',
        name: 'Comunidad Educativa',
      },
      metadata: {
        title: 'Guía de programación en Rust',
        description: 'Manual completo para aprender Rust desde cero hasta avanzado.',
        tags: ['educación', 'programación', 'rust'],
        license: 'mit',
        price: 0,
        createdAt: '2025-06-25T09:45:00Z',
      },
      content: {
        type: 'application/pdf',
        size: 3145728, // 3MB
        source: 'qdrive',
      },
    },
  ];
};

/**
 * Component that displays a feed of marketplace items with filtering capabilities
 */
export const QmarketFeed: React.FC<QmarketFeedProps> = ({
  filter = 'all',
  className,
  variant = 'grid',
  limit,
  onItemClick,
}) => {
  const { cid_profile } = useSessionContext();
  const { activeIdentity } = useIdentityStore();
  const { toast } = useToast();
  
  const [items, setItems] = useState<QmarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch items from IPFS or API
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchMarketItems();
      setItems(data);
    } catch (err) {
      console.error('Error loading market items:', err);
      setError('No se pudieron cargar los ítems. Por favor, inténtalo de nuevo.');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los ítems del mercado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Apply filters to the items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Apply filter based on the selected option
      switch (filter) {
        case 'free':
          return item.metadata.price === 0;
        case 'premium':
          return item.metadata.price > 0;
        case 'mine':
          return item.publisher.cid_profile === cid_profile;
        case 'all':
        default:
          return true;
      }
    }).slice(0, limit); // Apply limit if provided
  }, [items, filter, cid_profile, limit]);

  // Handle item click
  const handleItemClick = useCallback((item: QmarketItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  }, [onItemClick]);

  // Custom skeleton for loading state
  const renderSkeleton = useCallback(() => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-4" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </div>
      ))}
    </div>
  ), []);

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadItems}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Reintentar
        </Button>
      </div>
    );
  }

  // Empty state
  const emptyMessage = useMemo(() => {
    if (isLoading) return null;
    
    switch (filter) {
      case 'free':
        return 'No hay contenido gratuito disponible en este momento.';
      case 'premium':
        return 'No hay contenido premium disponible en este momento.';
      case 'mine':
        return 'No has publicado ningún contenido aún.';
      default:
        return 'No hay contenido disponible en este momento.';
    }
  }, [filter, isLoading]);

  return (
    <div className={className}>
      <Feed<QmarketItem>
        items={filteredItems}
        loading={isLoading}
        emptyMessage={emptyMessage}
        skeletonComponent={renderSkeleton()}
        layout={variant === 'list' ? 'list' : 'grid'}
        renderItem={(item) => (
          <QmarketItemCard
            item={item}
            variant={variant}
            onClick={() => handleItemClick(item)}
            className="h-full"
          />
        )}
      />
      
      {!isLoading && filteredItems.length > 0 && limit && items.length > limit && (
        <div className="mt-6 text-center">
          <Button variant="outline">
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
};

export default QmarketFeed;
