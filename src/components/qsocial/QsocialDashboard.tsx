/**
 * Unified Qsocial Dashboard Component
 * Aggregates and displays activities from all AnarQ modules
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  FileText,
  Image,
  Mail,
  HardDrive,
  ShoppingCart,
  Zap
} from 'lucide-react';

import { DashboardService } from '@/services/qsocial/DashboardService';
import { DashboardData, ModuleActivity, ActivityItem, SourceModule } from '@/types/qsocial';
import { ModuleActivityCard } from './ModuleActivityCard';
import { ActivityFeed } from './ActivityFeed';
import { UserStatsCard } from './UserStatsCard';
import { TrendingCommunitiesCard } from './TrendingCommunitiesCard';

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

export const QsocialDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedModule, setSelectedModule] = useState<SourceModule | null>(null);

  const dashboardService = new DashboardService();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await dashboardService.searchActivities(searchQuery);
      setSearchResults(results);
      setActiveTab('search');
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleModuleFilter = async (moduleId: SourceModule) => {
    try {
      setSelectedModule(moduleId);
      const activities = await dashboardService.getActivitiesByModule(moduleId);
      setSearchResults(activities);
      setActiveTab('search');
    } catch (err) {
      console.error('Module filter error:', err);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertDescription>
          {error}
          <Button onClick={loadDashboardData} className="ml-2" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Qsocial Dashboard
          </h1>
          <p className="text-muted-foreground">
            Your unified view across all AnarQ modules
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="md:w-64"
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{dashboardData.userStats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Qarma</p>
                <p className="text-2xl font-bold">{dashboardData.userStats.totalQarma}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Communities</p>
                <p className="text-2xl font-bold">{dashboardData.userStats.joinedCommunities}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold">{dashboardData.notifications.filter(n => !n.isRead).length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Module
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedModule === null ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedModule(null);
                setActiveTab('overview');
              }}
            >
              All Modules
            </Button>
            {dashboardData.moduleActivities.map((module) => {
              const Icon = moduleIcons[module.moduleId];
              return (
                <Button
                  key={module.moduleId}
                  variant={selectedModule === module.moduleId ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModuleFilter(module.moduleId)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {module.moduleName}
                  <Badge variant="secondary" className="ml-1">
                    {module.activities.length}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="search">
            Search {searchResults.length > 0 && `(${searchResults.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Posts */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardDescription>Your latest Qsocial posts</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.recentPosts.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.recentPosts.slice(0, 5).map((post) => (
                        <div key={post.id} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold">{post.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{post.upvotes} upvotes</Badge>
                            <Badge variant="outline">{post.commentCount} comments</Badge>
                            <span className="text-xs text-muted-foreground">
                              {post.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No posts yet. Create your first post!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <UserStatsCard stats={dashboardData.userStats} />
              <TrendingCommunitiesCard communities={dashboardData.trendingSubcommunities} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.moduleActivities.map((module) => (
              <ModuleActivityCard
                key={module.moduleId}
                module={module}
                icon={moduleIcons[module.moduleId]}
                colorClass={moduleColors[module.moduleId]}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>
                Search Results
                {selectedModule && (
                  <Badge className="ml-2">
                    {dashboardData.moduleActivities.find(m => m.moduleId === selectedModule)?.moduleName}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {searchQuery && `Results for "${searchQuery}"`}
                {selectedModule && !searchQuery && `Activities from ${selectedModule}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{activity.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {activity.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={activity.url}>View</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {searchQuery || selectedModule ? 'No results found' : 'Enter a search query or select a module'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="container mx-auto p-4 space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-64" />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default QsocialDashboard;