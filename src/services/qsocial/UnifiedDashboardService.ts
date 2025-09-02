/**
 * Unified Dashboard Service
 * 
 * Recopila y agrega datos de todos los módulos del ecosistema para crear
 * un dashboard unificado con métricas y actividad de toda la plataforma.
 */

import axios from 'axios';
import { getActiveIdentity } from '../../state/identity';
import { getCacheService, CacheKeys, CacheTags, CacheTTL } from './CacheService';
import { getPerformanceService, PerformanceUtils } from './PerformanceMonitoringService';
import { getCachedPostService } from './CachedPostService';
import type { QsocialPost } from '../../types/qsocial';

export interface ModuleStats {
  module: string;
  displayName: string;
  isActive: boolean;
  totalItems: number;
  recentActivity: number;
  lastActivity?: Date;
  healthStatus: 'healthy' | 'warning' | 'error' | 'offline';
  responseTime?: number;
  errorRate?: number;
}

export interface UserActivity {
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  recentActivity: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  modules: ModuleStats[];
}

export interface UnifiedFeedItem {
  id: string;
  module: string;
  type: 'post' | 'product' | 'file' | 'image' | 'transaction' | 'message';
  title: string;
  content?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  metadata: Record<string, any>;
  url?: string;
}

export interface CrossModuleAnalytics {
  timeRange: 'hour' | 'day' | 'week' | 'month';
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

/**
 * Servicio de dashboard unificado
 */
export class UnifiedDashboardService {
  private cache = getCacheService();
  private performance = getPerformanceService();
  private postService = getCachedPostService();

  private moduleEndpoints = {
    qmarket: '/api/qmarket',
    qdrive: '/api/qdrive',
    qpic: '/api/qpic',
    qmail: '/api/qmail',
    qlock: '/api/qlock',
    qwallet: '/api/qwallet',
    qonsent: '/api/qonsent',
    qsocial: '/api/qsocial'
  };

  private moduleDisplayNames = {
    qmarket: 'Qmarket',
    qdrive: 'Qdrive',
    qpic: 'Qpic',
    qmail: 'Qmail',
    qlock: 'Qlock',
    qwallet: 'Qwallet',
    qonsent: 'Qonsent',
    qsocial: 'Qsocial'
  };

  /**
   * Obtener métricas del dashboard unificado
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return PerformanceUtils.measureAsync('dashboard_metrics', async () => {
      const cacheKey = 'dashboard_metrics';
      
      // Intentar obtener de cache
      let metrics = await this.cache.get<DashboardMetrics>(cacheKey);
      
      if (metrics) {
        this.performance.recordCounter('cache_hit', 1, { type: 'dashboard_metrics' });
        return metrics;
      }

      this.performance.recordCounter('cache_miss', 1, { type: 'dashboard_metrics' });

      // Recopilar datos de todos los módulos en paralelo
      const moduleStatsPromises = Object.entries(this.moduleEndpoints).map(
        ([module, endpoint]) => this.getModuleStats(module, endpoint)
      );

      const moduleStats = await Promise.allSettled(moduleStatsPromises);
      const modules: ModuleStats[] = moduleStats
        .filter((result): result is PromiseFulfilledResult<ModuleStats> => result.status === 'fulfilled')
        .map(result => result.value);

      // Calcular métricas agregadas
      const totalContent = modules.reduce((sum, module) => sum + module.totalItems, 0);
      const recentActivity = modules.reduce((sum, module) => sum + module.recentActivity, 0);
      const healthyModules = modules.filter(m => m.healthStatus === 'healthy').length;
      const totalModules = modules.length;

      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthyModules < totalModules * 0.5) {
        systemHealth = 'critical';
      } else if (healthyModules < totalModules * 0.8) {
        systemHealth = 'warning';
      }

      metrics = {
        totalUsers: await this.getTotalUsers(),
        activeUsers: await this.getActiveUsers(),
        totalContent,
        recentActivity,
        systemHealth,
        modules
      };

      // Cachear resultado
      await this.cache.set(cacheKey, metrics, {
        ttl: CacheTTL.medium,
        tags: [CacheTags.analytics, 'dashboard']
      });

      return metrics;
    });
  }

  /**
   * Obtener estadísticas de un módulo específico
   */
  private async getModuleStats(module: string, endpoint: string): Promise<ModuleStats> {
    const startTime = performance.now();
    
    try {
      // Hacer llamadas en paralelo para obtener diferentes métricas
      const [healthResponse, statsResponse] = await Promise.allSettled([
        axios.get(`${endpoint}/health`, { timeout: 5000 }),
        axios.get(`${endpoint}/stats`, { timeout: 5000 })
      ]);

      const responseTime = performance.now() - startTime;
      
      let healthStatus: 'healthy' | 'warning' | 'error' | 'offline' = 'healthy';
      let totalItems = 0;
      let recentActivity = 0;
      let lastActivity: Date | undefined;

      // Procesar respuesta de salud
      if (healthResponse.status === 'fulfilled') {
        const health = healthResponse.value.data;
        if (health.status === 'error' || responseTime > 2000) {
          healthStatus = 'error';
        } else if (health.status === 'warning' || responseTime > 1000) {
          healthStatus = 'warning';
        }
      } else {
        healthStatus = 'offline';
      }

      // Procesar respuesta de estadísticas
      if (statsResponse.status === 'fulfilled') {
        const stats = statsResponse.value.data;
        totalItems = stats.totalItems || stats.total || 0;
        recentActivity = stats.recentActivity || stats.recent || 0;
        lastActivity = stats.lastActivity ? new Date(stats.lastActivity) : undefined;
      }

      return {
        module,
        displayName: this.moduleDisplayNames[module] || module,
        isActive: healthStatus !== 'offline',
        totalItems,
        recentActivity,
        lastActivity,
        healthStatus,
        responseTime,
        errorRate: healthStatus === 'error' ? 1 : 0
      };

    } catch (error) {
      console.warn(`Failed to get stats for module ${module}:`, error);
      
      return {
        module,
        displayName: this.moduleDisplayNames[module] || module,
        isActive: false,
        totalItems: 0,
        recentActivity: 0,
        healthStatus: 'offline',
        responseTime: performance.now() - startTime,
        errorRate: 1
      };
    }
  }

  /**
   * Obtener feed unificado de actividad de todos los módulos
   */
  async getUnifiedFeed(limit: number = 50, offset: number = 0): Promise<UnifiedFeedItem[]> {
    return PerformanceUtils.measureAsync('unified_feed', async () => {
      const cacheKey = `unified_feed:${limit}:${offset}`;
      
      // Intentar obtener de cache
      let feed = await this.cache.get<UnifiedFeedItem[]>(cacheKey);
      
      if (feed) {
        this.performance.recordCounter('cache_hit', 1, { type: 'unified_feed' });
        return feed;
      }

      this.performance.recordCounter('cache_miss', 1, { type: 'unified_feed' });

      // Recopilar actividad de todos los módulos en paralelo
      const feedPromises = Object.entries(this.moduleEndpoints).map(
        ([module, endpoint]) => this.getModuleFeed(module, endpoint, Math.ceil(limit / Object.keys(this.moduleEndpoints).length))
      );

      const moduleFeeds = await Promise.allSettled(feedPromises);
      const allItems: UnifiedFeedItem[] = [];

      // Combinar todos los feeds
      moduleFeeds.forEach(result => {
        if (result.status === 'fulfilled') {
          allItems.push(...result.value);
        }
      });

      // Ordenar por timestamp y aplicar paginación
      feed = allItems
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);

      // Cachear resultado
      await this.cache.set(cacheKey, feed, {
        ttl: CacheTTL.feeds,
        tags: [CacheTags.feeds, 'unified_feed']
      });

      return feed;
    });
  }

  /**
   * Obtener feed de un módulo específico
   */
  private async getModuleFeed(module: string, endpoint: string, limit: number): Promise<UnifiedFeedItem[]> {
    try {
      const response = await axios.get(`${endpoint}/recent`, {
        params: { limit },
        timeout: 5000
      });

      const items = response.data.items || response.data || [];
      
      return items.map((item: any) => this.normalizeModuleItem(module, item));
    } catch (error) {
      console.warn(`Failed to get feed for module ${module}:`, error);
      return [];
    }
  }

  /**
   * Normalizar item de módulo a formato unificado
   */
  private normalizeModuleItem(module: string, item: any): UnifiedFeedItem {
    const typeMapping = {
      qmarket: 'product',
      qdrive: 'file',
      qpic: 'image',
      qmail: 'message',
      qlock: 'file',
      qwallet: 'transaction',
      qonsent: 'post',
      qsocial: 'post'
    };

    return {
      id: item.id || item._id,
      module,
      type: typeMapping[module] || 'post',
      title: item.title || item.name || item.subject || `${module} item`,
      content: item.content || item.description || item.body,
      author: {
        id: item.authorId || item.userId || item.createdBy,
        name: item.authorName || item.userName || 'Unknown User',
        avatar: item.authorAvatar || item.userAvatar
      },
      timestamp: new Date(item.createdAt || item.timestamp || Date.now()),
      engagement: {
        likes: item.likes || item.upvotes || 0,
        comments: item.comments || item.commentCount || 0,
        shares: item.shares || item.shareCount || 0
      },
      metadata: {
        ...item,
        originalModule: module
      },
      url: item.url || `/${module}/${item.id}`
    };
  }

  /**
   * Obtener analíticas cross-módulo
   */
  async getCrossModuleAnalytics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<CrossModuleAnalytics> {
    return PerformanceUtils.measureAsync('cross_module_analytics', async () => {
      const cacheKey = `cross_module_analytics:${timeRange}`;
      
      // Intentar obtener de cache
      let analytics = await this.cache.get<CrossModuleAnalytics>(cacheKey);
      
      if (analytics) {
        this.performance.recordCounter('cache_hit', 1, { type: 'cross_module_analytics' });
        return analytics;
      }

      this.performance.recordCounter('cache_miss', 1, { type: 'cross_module_analytics' });

      // Recopilar analíticas de todos los módulos en paralelo
      const analyticsPromises = Object.entries(this.moduleEndpoints).map(
        ([module, endpoint]) => this.getModuleAnalytics(module, endpoint, timeRange)
      );

      const moduleAnalytics = await Promise.allSettled(analyticsPromises);
      
      let totalActivity = 0;
      const moduleBreakdown: Record<string, number> = {};
      let activeUsers = 0;
      let newUsers = 0;
      let returningUsers = 0;
      let contentCreated = 0;
      let contentShared = 0;
      let contentInteracted = 0;
      let totalResponseTime = 0;
      let totalErrors = 0;
      let totalRequests = 0;

      // Agregar datos de todos los módulos
      moduleAnalytics.forEach(result => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          totalActivity += data.activity || 0;
          moduleBreakdown[data.module] = data.activity || 0;
          activeUsers += data.activeUsers || 0;
          newUsers += data.newUsers || 0;
          returningUsers += data.returningUsers || 0;
          contentCreated += data.contentCreated || 0;
          contentShared += data.contentShared || 0;
          contentInteracted += data.contentInteracted || 0;
          totalResponseTime += data.responseTime || 0;
          totalErrors += data.errors || 0;
          totalRequests += data.requests || 0;
        }
      });

      const moduleCount = Object.keys(this.moduleEndpoints).length;
      
      analytics = {
        timeRange,
        totalActivity,
        moduleBreakdown,
        userEngagement: {
          activeUsers,
          newUsers,
          returningUsers
        },
        contentMetrics: {
          created: contentCreated,
          shared: contentShared,
          interacted: contentInteracted
        },
        performanceMetrics: {
          averageResponseTime: totalResponseTime / moduleCount,
          errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
          uptime: 100 // Calcular basado en health checks
        }
      };

      // Cachear resultado
      await this.cache.set(cacheKey, analytics, {
        ttl: CacheTTL.analytics,
        tags: [CacheTags.analytics, 'cross_module']
      });

      return analytics;
    });
  }

  /**
   * Obtener analíticas de un módulo específico
   */
  private async getModuleAnalytics(module: string, endpoint: string, timeRange: string): Promise<any> {
    try {
      const response = await axios.get(`${endpoint}/analytics`, {
        params: { timeRange },
        timeout: 5000
      });

      return {
        module,
        ...response.data
      };
    } catch (error) {
      console.warn(`Failed to get analytics for module ${module}:`, error);
      return {
        module,
        activity: 0,
        activeUsers: 0,
        newUsers: 0,
        returningUsers: 0,
        contentCreated: 0,
        contentShared: 0,
        contentInteracted: 0,
        responseTime: 0,
        errors: 0,
        requests: 0
      };
    }
  }

  /**
   * Obtener actividad reciente del usuario actual
   */
  async getUserActivity(limit: number = 20): Promise<UserActivity[]> {
    const identity = getActiveIdentity();
    if (!identity) {
      return [];
    }

    return PerformanceUtils.measureAsync('user_activity', async () => {
      const cacheKey = `user_activity:${identity.did}:${limit}`;
      
      // Intentar obtener de cache
      let activity = await this.cache.get<UserActivity[]>(cacheKey);
      
      if (activity) {
        this.performance.recordCounter('cache_hit', 1, { type: 'user_activity' });
        return activity;
      }

      this.performance.recordCounter('cache_miss', 1, { type: 'user_activity' });

      // Recopilar actividad del usuario de todos los módulos
      const activityPromises = Object.entries(this.moduleEndpoints).map(
        ([module, endpoint]) => this.getUserModuleActivity(module, endpoint, identity.did, Math.ceil(limit / Object.keys(this.moduleEndpoints).length))
      );

      const moduleActivities = await Promise.allSettled(activityPromises);
      const allActivity: UserActivity[] = [];

      // Combinar toda la actividad
      moduleActivities.forEach(result => {
        if (result.status === 'fulfilled') {
          allActivity.push(...result.value);
        }
      });

      // Ordenar por timestamp y limitar
      activity = allActivity
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      // Cachear resultado
      await this.cache.set(cacheKey, activity, {
        ttl: CacheTTL.short,
        tags: [CacheTags.user(identity.did), 'user_activity']
      });

      return activity;
    });
  }

  /**
   * Obtener actividad del usuario en un módulo específico
   */
  private async getUserModuleActivity(module: string, endpoint: string, userId: string, limit: number): Promise<UserActivity[]> {
    try {
      const response = await axios.get(`${endpoint}/users/${userId}/activity`, {
        params: { limit },
        timeout: 5000
      });

      const activities = response.data.activities || response.data || [];
      
      return activities.map((activity: any) => ({
        module,
        action: activity.action || 'unknown',
        entityType: activity.entityType || 'item',
        entityId: activity.entityId || activity.id,
        timestamp: new Date(activity.timestamp || activity.createdAt),
        metadata: activity.metadata || activity
      }));
    } catch (error) {
      console.warn(`Failed to get user activity for module ${module}:`, error);
      return [];
    }
  }

  /**
   * Obtener total de usuarios (estimado)
   */
  private async getTotalUsers(): Promise<number> {
    // En una implementación real, esto consultaría la base de datos de usuarios
    return 1000; // Placeholder
  }

  /**
   * Obtener usuarios activos (estimado)
   */
  private async getActiveUsers(): Promise<number> {
    // En una implementación real, esto consultaría usuarios activos en las últimas 24h
    return 150; // Placeholder
  }

  /**
   * Invalidar caches del dashboard
   */
  async invalidateDashboardCache(): Promise<void> {
    await this.cache.invalidateByTag('dashboard');
    await this.cache.invalidateByTag('unified_feed');
    await this.cache.invalidateByTag('cross_module');
    await this.cache.invalidateByTag('user_activity');
  }

  /**
   * Obtener estadísticas del servicio
   */
  getServiceStats(): any {
    return {
      moduleEndpoints: Object.keys(this.moduleEndpoints).length,
      cacheStats: this.cache.getStats(),
      performanceStats: this.performance.getStats()
    };
  }
}

// Singleton instance
let unifiedDashboardServiceInstance: UnifiedDashboardService | null = null;

export function getUnifiedDashboardService(): UnifiedDashboardService {
  if (!unifiedDashboardServiceInstance) {
    unifiedDashboardServiceInstance = new UnifiedDashboardService();
  }
  return unifiedDashboardServiceInstance;
}