import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';
import { QmarketItemCard } from '.';
import { QmarketItem, QmarketItemFilter } from '../types/extended';
import { getFilteredItems } from '../api';
import { LICENSE_OPTIONS } from '../types';

interface QmarketFeedProps {
  initialFilter?: Partial<QmarketItemFilter>;
  showFilters?: boolean;
  showSearch?: boolean;
  showSort?: boolean;
  className?: string;
  onItemClick?: (item: QmarketItem) => void;
}

export function QmarketFeed({
  initialFilter = {},
  showFilters = true,
  showSearch = true,
  showSort = true,
  className = '',
  onItemClick,
}: QmarketFeedProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<QmarketItem[]>([]);
  const [filter, setFilter] = useState<QmarketItemFilter>({
    type: searchParams.get('type') as any || undefined,
    price: searchParams.get('price') as any || undefined,
    license: searchParams.get('license') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    search: searchParams.get('search') || undefined,
    sortBy: (searchParams.get('sortBy') as any) || 'newest',
    ...initialFilter,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filter.type) params.set('type', filter.type);
    if (filter.price) params.set('price', filter.price);
    if (filter.license) params.set('license', filter.license);
    if (filter.tags?.length) params.set('tags', filter.tags.join(','));
    if (filter.search) params.set('search', filter.search);
    if (filter.sortBy && filter.sortBy !== 'newest') params.set('sortBy', filter.sortBy);
    
    // Update URL without page reload
    setSearchParams(params, { replace: true });
  }, [filter, setSearchParams]);

  // Fetch items when filters change
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const filteredItems = await getFilteredItems(filter);
        setItems(filteredItems);
      } catch (error) {
        console.error('Error fetching filtered items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const searchInput = form.elements.namedItem('search') as HTMLInputElement;
    setFilter(prev => ({ ...prev, search: searchInput.value }));
  };

  const handleTagClick = (tag: string) => {
    setFilter(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag],
    }));
  };

  const clearFilters = () => {
    setFilter({
      sortBy: 'newest',
      ...initialFilter,
    });
  };

  const hasActiveFilters = 
    filter.type || 
    filter.price || 
    filter.license || 
    (filter.tags && filter.tags.length > 0) ||
    filter.search;

  const popularTags = [
    'art', 'photography', 'music', '3d', 'illustration', 
    'templates', 'fonts', 'textures', 'ui-kit', 'plugins'
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        {showSearch && (
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search for items, tags, or creators..."
              className="pl-10 pr-10"
              defaultValue={filter.search}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
            {filter.search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
        )}

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filter.type || ''}
              onValueChange={(value) => setFilter(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="3d">3D Models</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.price || ''}
              onValueChange={(value) => setFilter(prev => ({ ...prev, price: value as any }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Price</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="under-10">Under 10 AQ</SelectItem>
                <SelectItem value="10-50">10 - 50 AQ</SelectItem>
                <SelectItem value="50+">50+ AQ</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.license || ''}
              onValueChange={(value) => setFilter(prev => ({ ...prev, license: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Any License" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any License</SelectItem>
                {LICENSE_OPTIONS.map((license) => (
                  <SelectItem key={license.value} value={license.value}>
                    {license.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Popular Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {popularTags.map((tag) => (
            <Badge
              key={tag}
              variant={filter.tags?.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sort and Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${items.length} items found`}
        </p>

        {showSort && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select
              value={filter.sortBy}
              onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value as any }))}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm h-64 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <QmarketItemCard
              key={item.cid}
              item={item}
              onClick={() => onItemClick && onItemClick(item)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Try adjusting your search or filter to find what you're looking for.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

export default QmarketFeed;
