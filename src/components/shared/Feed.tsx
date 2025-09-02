import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Props for the Feed component
 * @template T - The type of items in the feed
 */
export interface IFeedProps<T = any> {
  /** Array of items to render */
  items: T[];
  /** Function to render each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Whether the feed is in a loading state */
  loading?: boolean;
  /** Message to display when there are no items */
  emptyMessage?: string | React.ReactNode;
  /** Additional class name for the feed container */
  className?: string;
  /** Number of skeleton loaders to show when loading */
  skeletonCount?: number;
  /** Custom skeleton component to use */
  skeletonComponent?: React.ReactNode;
  /** Layout of the feed */
  layout?: 'list' | 'grid' | 'custom';
  /** Additional props for the container */
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * A generic Feed component that renders a list of items with loading and empty states.
 * 
 * @example
 * ```tsx
 * <Feed
 *   items={posts}
 *   loading={isLoading}
 *   emptyMessage="No posts found"
 *   renderItem={(post) => (
 *     <PostCard key={post.id} {...post} />
 *   )}
 * />
 * ```
 */
function Feed<T = any>({
  items,
  renderItem,
  loading = false,
  emptyMessage = 'No items found',
  className,
  skeletonCount = 3,
  skeletonComponent,
  layout = 'list',
  containerProps = {},
  ...props
}: IFeedProps<T>) {
  // Generate skeleton items when loading
  const renderSkeletons = () => {
    if (skeletonComponent) {
      return Array.from({ length: skeletonCount }).map((_, i) => (
        <React.Fragment key={`skeleton-${i}`}>
          {skeletonComponent}
        </React.Fragment>
      ));
    }

    return Array.from({ length: skeletonCount }).map((_, i) => (
      <div 
        key={`skeleton-${i}`} 
        className={cn(
          'p-4 border rounded-lg',
          layout === 'grid' ? 'w-full' : 'w-full',
        )}
      >
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-20 w-full" />
      </div>
    ));
  };

  // Determine container classes based on layout
  const containerClasses = cn(
    'space-y-4',
    {
      'grid grid-cols-1 gap-4': layout === 'list',
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4': layout === 'grid',
      '': layout === 'custom',
    },
    className
  );

  // Handle empty state
  if (!loading && items.length === 0) {
    return (
      <div 
        className={cn(
          'flex flex-col items-center justify-center py-12 text-muted-foreground',
          containerProps.className
        )}
        {...containerProps}
      >
        {typeof emptyMessage === 'string' ? (
          <p className="text-center">{emptyMessage}</p>
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  return (
    <div 
      className={containerClasses} 
      data-testid="feed-container"
      {...containerProps}
      {...props}
    >
      {loading ? (
        renderSkeletons()
      ) : (
        items.map((item, index) => (
          <React.Fragment key={index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))
      )}
    </div>
  );
}

export { Feed };
export type { IFeedProps as FeedProps };

// TypeScript helper to create a typed Feed component
export function createFeed<ItemType>(): React.FC<Omit<IFeedProps<ItemType>, 'renderItem'> & { renderItem: (item: ItemType, index: number) => React.ReactNode }> {
  return Feed as any;
}
