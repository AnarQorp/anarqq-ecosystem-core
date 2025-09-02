/**
 * Dashboard Unificado de Qsocial
 * 
 * Muestra métricas y actividad de todos los módulos del ecosistema
 * en una vista consolidada con datos en tiempo real.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Globe,
  Zap,
  RefreshCw
} from 'lucide-react';

interface ModuleStats {
  module: string;
  displayName: string;
  isActive: boolean;
  totalItems: number;
  recentActivity: number;
  lastActivity?: string;
  healthStatus: 'healthy' | 'warning' | 'error' | 'offline';
  responseTime?: number;
  errorRate?: number;
}

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  recentActivity: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  modules: ModuleStats[];
}

interface UnifiedFeedItem {
  id: string;
  module: string;
  type: string;
  title: string;
  content?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  metadata: Record<string, any>;
  url?: string;
}

interface CrossModuleAnalytics {
  timeRange: string;
  totalActivity: number;
  moduleBreakdown: Record<string, number>;
  userEngagement: {
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  };
  contentMetrics: {
    created: number;
    shared: number;
    interacted: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

const UnifiedDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [feed, setFeed] = useState<UnifiedFeedItem[]>([]);
  const [analytics, setAnalytics] = useState<CrossModuleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Cargar métricas, feed y analíticas en paralelo
      const [metricsRes, feedRes, analyticsRes] = await Promise.all([
        fetch('/api/qsocial/sync/dashboard/metrics'),
        fetch('/api/qsocial/sync/dashboard/feed?limit=10'),
        fetch(`/api/qsocial/sync/dashboard/analytics?timeRange=${timeRange}`)
      ]);

      if (!metricsRes.ok || !feedRes.ok || !analyticsRes.ok) {
        throw new Error('Error loading dashboard data');
      }

      const [metricsData, feedData, analyticsData] = await Promise.all([
        metricsRes.json(),
        feedRes.json(),
        analyticsRes.json()
      ]);

      setMetrics(metricsData.metrics);
      setFeed(feedData.feed);
      setAnalytics(analyticsData.analytics);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refrescar datos
  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  // Cargar datos al montar y cuando cambie el timeRange
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        loadDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshing]);

  // Obtener icono de estado de salud
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Obtener color de badge según el estado
  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'offline':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Formatear timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Obtener icono del módulo
  const getModuleIcon = (module: string) => {
    const icons = {
      qsocial: <Users className="h-4 w-4" />,
      qmarket: <Globe className="h-4 w-4" />,
      qdrive: <FileText className="h-4 w-4" />,
      qpic: <Activity className="h-4 w-4" />,
      qwallet: <Zap className="h-4 w-4" />,
      qmail: <FileText className="h-4 w-4" />,
      qlock: <CheckCircle className="h-4 w-4" />,
      qonsent: <CheckCircle className="h-4 w-4" />
    };
    return icons[module] || <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error cargando el dashboard: {error}
          <Button onClick={refreshData} variant="outline" size="sm" className="ml-2">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Unificado</h1>
          <p className="text-gray-600">Vista consolidada de todos los módulos del ecosistema</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="hour">Última hora</option>
            <option value="day">Último día</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeUsers} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contenido Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalContent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.recentActivity} recientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.recentActivity}</div>
              <p className="text-xs text-muted-foreground">
                En las últimas 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
              {getHealthIcon(metrics.systemHealth)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{metrics.systemHealth}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.modules.filter(m => m.healthStatus === 'healthy').length}/{metrics.modules.length} módulos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="feed">Feed Unificado</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        </TabsList>

        {/* Tab de Módulos */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.modules.map((module) => (
              <Card key={module.module}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getModuleIcon(module.module)}
                    {module.displayName}
                  </CardTitle>
                  <Badge variant={getHealthBadgeVariant(module.healthStatus)}>
                    {module.healthStatus}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total items:</span>
                      <span className="font-medium">{module.totalItems.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Actividad reciente:</span>
                      <span className="font-medium">{module.recentActivity}</span>
                    </div>
                    {module.responseTime && (
                      <div className="flex justify-between text-sm">
                        <span>Tiempo respuesta:</span>
                        <span className="font-medium">{module.responseTime}ms</span>
                      </div>
                    )}
                    {module.lastActivity && (
                      <div className="text-xs text-muted-foreground">
                        Última actividad: {formatTimestamp(module.lastActivity)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab de Feed Unificado */}
        <TabsContent value="feed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas actualizaciones de todos los módulos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feed.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getModuleIcon(item.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium truncate">{item.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.module}
                        </Badge>
                      </div>
                      {item.content && (
                        <p className="text-sm text-gray-600 mb-2">{item.content}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Por {item.author.name}</span>
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                      {item.engagement && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>❤️ {item.engagement.likes}</span>
                          <span>💬 {item.engagement.comments}</span>
                          <span>🔄 {item.engagement.shares}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Analíticas */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              {/* Métricas de rendimiento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tiempo de Respuesta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.performanceMetrics.averageResponseTime}ms</div>
                    <Progress value={Math.min(analytics.performanceMetrics.averageResponseTime / 10, 100)} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tasa de Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.performanceMetrics.errorRate.toFixed(1)}%</div>
                    <Progress value={analytics.performanceMetrics.errorRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.performanceMetrics.uptime.toFixed(1)}%</div>
                    <Progress value={analytics.performanceMetrics.uptime} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown por módulo */}
              <Card>
                <CardHeader>
                  <CardTitle>Actividad por Módulo</CardTitle>
                  <CardDescription>
                    Distribución de actividad en el período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.moduleBreakdown)
                      .sort(([,a], [,b]) => b - a)
                      .map(([module, activity]) => (
                        <div key={module} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getModuleIcon(module)}
                            <span className="text-sm font-medium capitalize">{module}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(activity / analytics.totalActivity) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">{activity}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de engagement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement de Usuarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Usuarios activos:</span>
                        <span className="font-medium">{analytics.userEngagement.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nuevos usuarios:</span>
                        <span className="font-medium">{analytics.userEngagement.newUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Usuarios recurrentes:</span>
                        <span className="font-medium">{analytics.userEngagement.returningUsers}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas de Contenido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Contenido creado:</span>
                        <span className="font-medium">{analytics.contentMetrics.created}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contenido compartido:</span>
                        <span className="font-medium">{analytics.contentMetrics.shared}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interacciones:</span>
                        <span className="font-medium">{analytics.contentMetrics.interacted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedDashboard;