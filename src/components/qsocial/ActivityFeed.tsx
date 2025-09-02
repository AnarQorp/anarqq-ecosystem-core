/**
 * Activity Feed Component
 * Displays unified activity feed from all modules
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ExternalLink, 
  Image, 
  Mail, 
  HardDrive, 
  MessageSquare, 
  ShoppingCart,
  Clock
} from 'lucide-react';

import { DashboardService } from '@/services/qsocial/DashboardService';
import { ActivityItem, SourceModule } from '@/types/qsocial';

const moduleIcons: Record<SourceModule, React.ComponentType<any>> = {
  qpic: Image,
  qmail: Mail,
  qdrive: HardDrive,
  qchat: MessageSquare,
  qmarket: ShoppingCart
};

const moduleColors: Record<SourceModule, string> = {
  qpic: 'bg-purple-100 text-purple-800',
  qmail: 'bg-blue-100 text-blue-800',
  qdrive: 'bg-green-100 text-green-800',
  qchat: 'bg-yellow-100 text-yellow-800',
  qmarket: 'bg-red-100 text-red-800'
};

const activityTypeLabels: Record<string, string> = {
  media_upload: 'Media Upload',
  file_upload: 'File Upload',
  message_sent: 'Message Sent',
  message_received: 'Message Received',
  chat_sent: 'Chat Sent',
  chat_received: 'Chat Received',
  item_listed: 'Item Listed',
  item_purchased: 'Item Purchased'
};

export const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dashboardService = new DashboardService();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getUnifiedActivityFeed(50);
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await dashboardService.getUnifiedActivityFeed(50);
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh activities');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getModuleFromActivity = (activity: ActivityItem): SourceModule => {
    // Infer module from activity type or metadata
    if (activity.type.includes('media')) return 'qpic';
    if (activity.type.includes('message')) return 'qmail';
    if (activity.type.includes('file')) return 'qdrive';
    if (activity.type.includes('chat')) return 'qchat';
    if (activity.type.includes('item')) return 'qmarket';
    
    // Fallback to qpic
    return 'qpic';
  };

  if (loading) {
    return <ActivityFeedSkeleton />;
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          {error}
          <Button onClick={loadActivities} className="ml-2" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Your recent activities across all AnarQ modules
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const module = getModuleFromActivity(activity);
              const ModuleIcon = moduleIcons[module];
              const colorClass = moduleColors[module];
              
              return (
                <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                    <ModuleIcon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activityTypeLabels[activity.type] || activity.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          
                          {/* Additional metadata badges */}
                          {activity.metadata?.size && (
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(activity.metadata.size)}
                            </Badge>
                          )}
                          
                          {activity.metadata?.fileType && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.metadata.fileType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 p-1 h-auto flex-shrink-0"
                        asChild
                      >
                        <a href={activity.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                    
                    {/* Show thumbnail for media */}
                    {activity.metadata?.thumbnail && (
                      <div className="mt-2">
                        <img
                          src={activity.metadata.thumbnail}
                          alt="Thumbnail"
                          className="w-16 h-16 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground">
              Start using AnarQ modules to see your activity feed here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityFeedSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full mt-2" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ActivityFeed;