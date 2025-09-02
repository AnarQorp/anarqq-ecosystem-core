/**
 * QsocialFeed Component
 * Main feed component with infinite scroll and real-time updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Filter, 
  TrendingUp, 
  Clock, 
  MessageSquare,
  ChevronUp,
  Loader2
} from 'lucide-react';

import { PostService } from '@/services/qsocial/PostService';
import { QsocialPost, FeedOptions } from '@/types/qsocial';
import { PostCard } from './PostCard';
import { useSession } from '@/hooks/useSession';

interface QsocialFeedProps {
  subcommunityId?: string;
  userId?: string;
  className?: string;
}

type SortOption = 'newest' | 'popular' | 'controversial';
type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export const QsocialFeed: React.FC<QsocialFeedProps> = ({
  subcommunityId,
  userId,
  className = ''
}) => {
  const [posts, setPosts] = useState<QsocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Feed options
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeTab, setActiveTab] = useState('feed');
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  const { session } = useSession();

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
  }, [subcommunityId, userId, sortBy, timeRange]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore]);

  const loadFeed = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setPosts([]);
      }
      setError(null);

      const options: FeedOptions = {
        limit,
        offset: reset ? 0 : offset,
        sortBy,
        timeRange,
      };

      let newPosts: QsocialPost[];
      
      if (subcommunityId) {
        newPosts = await PostService.getSubcommunityFeed(subcommunityId, options);
      } else if (userId) {
        newPosts = await PostService.getUserPosts(userId, options);
      } else {
        newPosts = await PostService.getFeed(options);
      }

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(newPosts.length === limit);
      setOffset(prev => reset ? limit : prev + limit);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
      console.error('Feed loading error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadFeed(false);
    }
  }, [loadingMore, hasMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true);
    setRefreshing(false);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  };

  const handlePostUpdate = (updatedPost: QsocialPost) => {
    setPosts(prev => prev.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  const handlePostDelete = (deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post.id !== deletedPostId));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && posts.length === 0) {
    return <FeedSkeleton />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Feed Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {subcommunityId ? 'Community Feed' : userId ? 'User Posts' : 'Qsocial Feed'}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                onClick={scrollToTop}
                size="sm"
                variant="outline"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="filters">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="feed" className="mt-4">
              <div className="flex flex-wrap gap-2">
                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Sort:</span>
                  <Button
                    variant={sortBy === 'newest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('newest')}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    New
                  </Button>
                  <Button
                    variant={sortBy === 'popular' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('popular')}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Popular
                  </Button>
                  <Button
                    variant={sortBy === 'controversial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('controversial')}
                  >
                    Controversial
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="filters" className="mt-4">
              <div className="space-y-4">
                {/* Time Range Filter */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Time Range</h4>
                  <div className="flex flex-wrap gap-2">
                    {(['hour', 'day', 'week', 'month', 'year', 'all'] as TimeRange[]).map((range) => (
                      <Button
                        key={range}
                        variant={timeRange === range ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTimeRangeChange(range)}
                      >
                        {range === 'all' ? 'All Time' : `Past ${range}`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <Button onClick={() => loadFeed(true)} className="ml-2" size="sm">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
                showSubcommunity={!subcommunityId}
                compact={false}
              />
            ))}
            
            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more posts...
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="text-center text-muted-foreground">
                  <p>You've reached the end!</p>
                  <Button onClick={scrollToTop} variant="outline" size="sm" className="mt-2">
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Back to Top
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  {subcommunityId 
                    ? 'This community doesn\'t have any posts yet.'
                    : userId 
                    ? 'This user hasn\'t posted anything yet.'
                    : 'Be the first to create a post!'
                  }
                </p>
                {!userId && session && (
                  <Button onClick={() => window.location.href = '/compose'}>
                    Create First Post
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
};

const FeedSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
    
    {/* Posts Skeleton */}
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default QsocialFeed;