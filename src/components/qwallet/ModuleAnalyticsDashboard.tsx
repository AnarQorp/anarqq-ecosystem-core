/**
 * Module Analytics Dashboard Component
 * Displays comprehensive analytics and monitoring data for module registration
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Zap,
  XCircle,
  AlertCircle,
  BarChart3,
  Shield,
  Database
} from 'lucide-react';
import { useDashboardAnalytics } from '../../hooks/useModuleAnalytics';
import { formatDistanceToNow } from 'date-fns';

/**
 * Status indicator component
 */
const StatusIndicator: React.FC<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusConfig = {
    healthy: { color: 'bg-green-500', label: 'Healthy' },
    degraded: { color: 'bg-yellow-500', label: 'Degraded' },
    unhealthy: { color: 'bg-red-500', label: 'Unhealthy' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${config.color} ${sizeClasses[size]}`} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

/**
 * Metric card component
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
}> = ({ title, value, change, icon, description }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last period
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Alert component
 */
const AlertCard: React.FC<{
  alert: any;
  onResolve: (alertId: string) => void;
}> = ({ alert, onResolve }) => {
  const severityConfig = {
    low: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    critical: { color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Alert className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{alert.title}</span>
        <div className="flex items-center gap-2">
          <Badge className={config.color}>{alert.severity.toUpperCase()}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(alert.id)}
          >
            Resolve
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription>
        <p>{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
        </p>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Main dashboard component
 */
export const ModuleAnalyticsDashboard: React.FC = () => {
  const [state, actions] = useDashboardAnalytics();
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const {
    dashboardData,
    healthStatus,
    activeAlerts,
    loading,
    refreshing,
    error,
    lastUpdated,
    connectionStatus
  } = state;

  const {
    refreshData,
    refreshHealthStatus,
    resolveAlert,
    exportAnalytics
  } = actions;

  /**
   * Handle alert resolution
   */
  const handleResolveAlert = useCallback(async (alertId: string) => {
    try {
      await resolveAlert(alertId);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }, [resolveAlert]);

  /**
   * Handle data export
   */
  const handleExport = useCallback(async () => {
    try {
      const data = await exportAnalytics(exportFormat);
      const blob = new Blob([data], { 
        type: exportFormat === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `module-analytics-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  }, [exportAnalytics, exportFormat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Analytics</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const overview = dashboardData?.overview;
  const trends = dashboardData?.trends;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor module registration performance and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            {connectionStatus}
          </div>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Active Alerts ({activeAlerts.length})
          </h2>
          {activeAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={handleResolveAlert}
            />
          ))}
        </div>
      )}

      {/* Overview Metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Modules"
            value={overview.totalModules}
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
            description="Registered modules"
          />
          <MetricCard
            title="Active Modules"
            value={overview.activeModules}
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            description="Production ready"
          />
          <MetricCard
            title="Total Queries"
            value={overview.totalQueries.toLocaleString()}
            icon={<Eye className="h-4 w-4 text-blue-500" />}
            description="All time"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${overview.averageResponseTime.toFixed(0)}ms`}
            icon={<Clock className="h-4 w-4 text-purple-500" />}
            description="Last 24 hours"
          />
        </div>
      )}

      {/* System Health */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Overall system status and service health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Status</span>
                <StatusIndicator status={healthStatus.overall} size="lg" />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthStatus.services.map(service => (
                  <div key={service.service} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{service.service}</span>
                      <StatusIndicator status={service.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Response: {service.responseTime}ms
                    </div>
                    {service.issues.length > 0 && (
                      <div className="text-xs text-red-600">
                        {service.issues.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="modules">Top Modules</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData?.performanceMetrics.map(metric => (
              <Card key={metric.operationType}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {metric.operationType.charAt(0).toUpperCase() + metric.operationType.slice(1)} Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Latency</div>
                        <div className="text-2xl font-bold">{metric.averageLatency.toFixed(0)}ms</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                        <div className="text-2xl font-bold">{(metric.successRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span>{(metric.successRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metric.successRate * 100} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metric.totalOperations} total operations
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Error Rate"
                value={`${(overview.errorRate * 100).toFixed(2)}%`}
                icon={<XCircle className="h-4 w-4 text-red-500" />}
                description="Last 24 hours"
              />
              <MetricCard
                title="Uptime"
                value={`${(overview.uptime / (1000 * 60 * 60)).toFixed(1)}h`}
                icon={<Activity className="h-4 w-4 text-green-500" />}
                description="Current session"
              />
              <MetricCard
                title="Registrations"
                value={overview.totalRegistrations}
                icon={<Shield className="h-4 w-4 text-blue-500" />}
                description="Total registered"
              />
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {trends && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Queries Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends.queriesOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="queries" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Errors Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trends.errorsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="errors" 
                        stroke="#ff7300" 
                        fill="#ff7300" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Top Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          {dashboardData?.topModules && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Modules</CardTitle>
                <CardDescription>
                  Modules ranked by popularity and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topModules.map((module, index) => (
                    <div key={module.moduleId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{module.moduleId}</div>
                          <div className="text-sm text-muted-foreground">
                            {module.totalQueries} queries • {module.uniqueUsers} users
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Popularity Score</div>
                        <div className="text-lg font-bold">{module.popularityScore.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest module registration events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.recentActivity.slice(0, 10).map(event => (
                <div key={event.eventId} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{event.action}</Badge>
                    <span className="font-medium">{event.moduleId}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModuleAnalyticsDashboard;