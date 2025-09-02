import React from 'react';
import { QmarketItem } from '../types/extended';
import { Button } from '@/components/ui/button';
import { QmarketItemCard } from './QmarketItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileWarning } from 'lucide-react';

interface MyItemsListProps {
  items: QmarketItem[];
  isLoading: boolean;
  error: string | null;
  filter: 'all' | 'published' | 'unpublished';
  stats: {
    totalItems: number;
    publishedItems: number;
    totalViews: number;
    avgPrice: number;
  };
  onFilterChange: (filter: 'all' | 'published' | 'unpublished') => void;
  onEdit: (item: QmarketItem) => void;
  onTogglePublish: (item: QmarketItem) => Promise<void>;
}

export function MyItemsList({
  items,
  isLoading,
  error,
  filter,
  stats,
  onFilterChange,
  onEdit,
  onTogglePublish,
}: MyItemsListProps) {
  // Handle toggle publish
  const handleTogglePublish = async (item: QmarketItem) => {
    try {
      await onTogglePublish(item);
      // The parent component should handle the refresh
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {filter === 'all'
            ? 'No items found'
            : filter === 'published'
            ? 'No published items'
            : 'No unpublished items'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {filter === 'all'
            ? 'You haven\'t uploaded any items yet.'
            : filter === 'published'
            ? 'You don\'t have any published items.'
            : 'All your items are currently published.'}
        </p>
        <Button>Upload New Item</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={stats.totalItems.toString()}
          description="All your items"
        />
        <StatCard
          title="Published"
          value={stats.publishedItems.toString()}
          description="Publicly available"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toString()}
          description="All-time views"
        />
        <StatCard
          title="Avg. Price"
          value={`${stats.avgPrice.toFixed(2)} AQ`}
          description="Average price"
        />
      </div>

      {/* Filter Tabs */}
      <div className="border-b">
        <div className="flex space-x-4">
          {(['all', 'published', 'unpublished'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filter === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'published' && ` (${stats.publishedItems})`}
              {tab === 'unpublished' && ` (${stats.totalItems - stats.publishedItems})`}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.cid} className="group relative">
            <QmarketItemCard 
              item={item} 
              onClick={() => onEdit(item)} 
              className="h-full"
            />
            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
              >
                Edit
              </Button>
              <Button
                variant={item.status === 'published' ? 'outline' : 'default'}
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleTogglePublish(item);
                }}
              >
                {item.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper component for stat cards
function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
