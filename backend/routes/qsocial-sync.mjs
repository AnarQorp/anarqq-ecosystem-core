/**
 * Rutas de API para sincronización inter-módulos de Qsocial
 * 
 * Endpoints protegidos para recibir eventos de otros módulos
 * y crear publicaciones cruzadas automáticamente.
 */

import express from 'express';
import { verifySquidIdentity } from '../middleware/squidAuth.mjs';
import { validateRequest } from '../middleware/validation.mjs';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Rate limiting específico para webhooks
const webhookRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto por IP
  message: 'Too many webhook requests'
});

// Rate limiting para endpoints de dashboard
const dashboardRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto por usuario
  message: 'Too many dashboard requests'
});

/**
 * Webhook genérico para recibir eventos de otros módulos
 * POST /api/qsocial/sync/webhook/:module
 */
router.post('/webhook/:module', webhookRateLimit, async (req, res) => {
  try {
    const { module } = req.params;
    const payload = req.body;
    const signature = req.headers['x-webhook-signature'];

    // Validar módulo
    const validModules = ['qmarket', 'qdrive', 'qpic', 'qmail', 'qlock', 'qwallet', 'qonsent'];
    if (!validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        error: `Invalid module: ${module}`
      });
    }

    // Validar payload básico
    if (!payload.eventType || !payload.entityId || !payload.userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, entityId, userId'
      });
    }

    // Simular procesamiento del webhook
    // En una implementación real, esto usaría InterModuleSyncService
    const result = {
      success: true,
      message: `Webhook processed for module ${module}`,
      eventType: payload.eventType,
      entityId: payload.entityId,
      processed: true,
      timestamp: new Date().toISOString()
    };

    // Log del evento para debugging
    console.log(`Webhook received from ${module}:`, {
      eventType: payload.eventType,
      entityId: payload.entityId,
      userId: payload.userId,
      timestamp: new Date().toISOString()
    });

    res.json(result);

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing webhook'
    });
  }
});

/**
 * Endpoint para crear publicación cruzada manualmente
 * POST /api/qsocial/sync/cross-post
 */
router.post('/cross-post', verifySquidIdentity, validateRequest([
  'sourceModule',
  'sourceId',
  'eventType'
]), async (req, res) => {
  try {
    const {
      sourceModule,
      sourceId,
      eventType,
      title,
      content,
      subcommunityId,
      tags = []
    } = req.body;

    const userId = req.user.did;

    // Validar módulo fuente
    const validModules = ['qmarket', 'qdrive', 'qpic', 'qmail', 'qlock', 'qwallet', 'qonsent'];
    if (!validModules.includes(sourceModule)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source module: ${sourceModule}`
      });
    }

    // Simular creación de post cruzado
    const crossPost = {
      id: `cross_${Date.now()}`,
      title: title || `${sourceModule}: ${sourceId}`,
      content: content || `Contenido compartido desde ${sourceModule}`,
      content_type: 'cross_post',
      source_module: sourceModule,
      source_id: sourceId,
      author_id: userId,
      subcommunity_id: subcommunityId,
      tags: [...tags, sourceModule, 'cross-post'],
      is_cross_post: true,
      cross_post_data: {
        originalModule: sourceModule,
        originalId: sourceId,
        eventType,
        createdAt: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      comment_count: 0,
      moderation_status: 'approved'
    };

    res.status(201).json({
      success: true,
      post: crossPost,
      message: 'Cross-post created successfully'
    });

  } catch (error) {
    console.error('Cross-post creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error creating cross-post'
    });
  }
});

/**
 * Obtener configuración de sincronización
 * GET /api/qsocial/sync/config
 */
router.get('/config', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.user.did;

    // Simular configuración de sincronización
    const config = {
      userId,
      integrations: {
        qmarket: {
          enabled: true,
          autoPost: true,
          requireApproval: false,
          subcommunityId: null,
          tags: ['marketplace', 'product']
        },
        qdrive: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          subcommunityId: null,
          tags: ['file-sharing', 'storage']
        },
        qpic: {
          enabled: true,
          autoPost: true,
          requireApproval: false,
          subcommunityId: null,
          tags: ['media', 'image']
        },
        qmail: {
          enabled: false,
          autoPost: false,
          requireApproval: true,
          subcommunityId: null,
          tags: ['communication']
        },
        qlock: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          subcommunityId: null,
          tags: ['security', 'access']
        },
        qwallet: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          subcommunityId: null,
          tags: ['wallet', 'transaction']
        },
        qonsent: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          subcommunityId: null,
          tags: ['privacy', 'consent']
        }
      },
      stats: {
        totalIntegrations: 7,
        enabledIntegrations: 6,
        autoPostEnabled: 2,
        lastSync: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Config retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving config'
    });
  }
});

/**
 * Actualizar configuración de sincronización
 * PUT /api/qsocial/sync/config
 */
router.put('/config', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.user.did;
    const { integrations } = req.body;

    if (!integrations || typeof integrations !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid integrations configuration'
      });
    }

    // Validar configuración de integraciones
    const validModules = ['qmarket', 'qdrive', 'qpic', 'qmail', 'qlock', 'qwallet', 'qonsent'];
    
    for (const [module, config] of Object.entries(integrations)) {
      if (!validModules.includes(module)) {
        return res.status(400).json({
          success: false,
          error: `Invalid module in configuration: ${module}`
        });
      }

      if (typeof config.enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `Invalid enabled value for module ${module}`
        });
      }
    }

    // Simular actualización de configuración
    const updatedConfig = {
      userId,
      integrations,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      config: updatedConfig,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error updating config'
    });
  }
});

/**
 * Obtener estadísticas de sincronización
 * GET /api/qsocial/sync/stats
 */
router.get('/stats', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.user.did;

    // Simular estadísticas de sincronización
    const stats = {
      userId,
      totalCrossPosts: 42,
      recentCrossPosts: 5,
      moduleBreakdown: {
        qmarket: 15,
        qdrive: 8,
        qpic: 12,
        qlock: 3,
        qwallet: 2,
        qonsent: 2
      },
      successRate: 95.2,
      lastSync: new Date(Date.now() - 30000).toISOString(), // 30 segundos atrás
      queuedEvents: 0,
      processingStatus: 'idle'
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving stats'
    });
  }
});

/**
 * Obtener métricas del dashboard unificado
 * GET /api/qsocial/dashboard/metrics
 */
router.get('/dashboard/metrics', verifySquidIdentity, dashboardRateLimit, async (req, res) => {
  try {
    // Simular métricas del dashboard
    const metrics = {
      totalUsers: 1247,
      activeUsers: 189,
      totalContent: 3456,
      recentActivity: 67,
      systemHealth: 'healthy',
      modules: [
        {
          module: 'qsocial',
          displayName: 'Qsocial',
          isActive: true,
          totalItems: 1234,
          recentActivity: 23,
          lastActivity: new Date().toISOString(),
          healthStatus: 'healthy',
          responseTime: 120,
          errorRate: 0.1
        },
        {
          module: 'qmarket',
          displayName: 'Qmarket',
          isActive: true,
          totalItems: 567,
          recentActivity: 12,
          lastActivity: new Date(Date.now() - 300000).toISOString(),
          healthStatus: 'healthy',
          responseTime: 200,
          errorRate: 0.2
        },
        {
          module: 'qdrive',
          displayName: 'Qdrive',
          isActive: true,
          totalItems: 890,
          recentActivity: 18,
          lastActivity: new Date(Date.now() - 150000).toISOString(),
          healthStatus: 'warning',
          responseTime: 800,
          errorRate: 2.1
        },
        {
          module: 'qpic',
          displayName: 'Qpic',
          isActive: true,
          totalItems: 445,
          recentActivity: 8,
          lastActivity: new Date(Date.now() - 600000).toISOString(),
          healthStatus: 'healthy',
          responseTime: 150,
          errorRate: 0.3
        },
        {
          module: 'qwallet',
          displayName: 'Qwallet',
          isActive: true,
          totalItems: 234,
          recentActivity: 4,
          lastActivity: new Date(Date.now() - 900000).toISOString(),
          healthStatus: 'healthy',
          responseTime: 300,
          errorRate: 0.5
        },
        {
          module: 'qmail',
          displayName: 'Qmail',
          isActive: false,
          totalItems: 0,
          recentActivity: 0,
          healthStatus: 'offline',
          responseTime: 0,
          errorRate: 100
        }
      ],
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving dashboard metrics'
    });
  }
});

/**
 * Obtener feed unificado
 * GET /api/qsocial/dashboard/feed
 */
router.get('/dashboard/feed', verifySquidIdentity, dashboardRateLimit, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Simular feed unificado
    const feedItems = [
      {
        id: 'qmarket_1',
        module: 'qmarket',
        type: 'product',
        title: 'Nuevo NFT disponible',
        content: 'Colección exclusiva de arte digital',
        author: {
          id: 'user123',
          name: 'Artist Creator',
          avatar: '/avatars/artist.jpg'
        },
        timestamp: new Date(Date.now() - 300000).toISOString(),
        engagement: {
          likes: 15,
          comments: 3,
          shares: 2
        },
        metadata: {
          price: '100 QARMA',
          category: 'art'
        },
        url: '/qmarket/nft_1'
      },
      {
        id: 'qpic_2',
        module: 'qpic',
        type: 'image',
        title: 'Foto del atardecer',
        content: 'Hermosa vista desde la montaña',
        author: {
          id: 'user456',
          name: 'Nature Lover',
          avatar: '/avatars/nature.jpg'
        },
        timestamp: new Date(Date.now() - 600000).toISOString(),
        engagement: {
          likes: 28,
          comments: 7,
          shares: 5
        },
        metadata: {
          resolution: '4K',
          location: 'Mountain Peak'
        },
        url: '/qpic/photo_2'
      },
      {
        id: 'qdrive_3',
        module: 'qdrive',
        type: 'file',
        title: 'Documento compartido',
        content: 'Guía de desarrollo para la comunidad',
        author: {
          id: 'user789',
          name: 'Dev Guide',
          avatar: '/avatars/dev.jpg'
        },
        timestamp: new Date(Date.now() - 900000).toISOString(),
        engagement: {
          likes: 12,
          comments: 4,
          shares: 8
        },
        metadata: {
          fileSize: '2.5 MB',
          fileType: 'PDF'
        },
        url: '/qdrive/doc_3'
      }
    ];

    const paginatedItems = feedItems.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      feed: paginatedItems,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: feedItems.length,
        hasMore: parseInt(offset) + parseInt(limit) < feedItems.length
      }
    });

  } catch (error) {
    console.error('Unified feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving unified feed'
    });
  }
});

/**
 * Obtener analíticas cross-módulo
 * GET /api/qsocial/dashboard/analytics
 */
router.get('/dashboard/analytics', verifySquidIdentity, dashboardRateLimit, async (req, res) => {
  try {
    const { timeRange = 'day' } = req.query;

    // Validar timeRange
    if (!['hour', 'day', 'week', 'month'].includes(timeRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeRange. Must be: hour, day, week, or month'
      });
    }

    // Simular analíticas cross-módulo
    const analytics = {
      timeRange,
      totalActivity: 156,
      moduleBreakdown: {
        qsocial: 45,
        qmarket: 32,
        qdrive: 28,
        qpic: 25,
        qwallet: 15,
        qlock: 8,
        qonsent: 3
      },
      userEngagement: {
        activeUsers: 89,
        newUsers: 12,
        returningUsers: 77
      },
      contentMetrics: {
        created: 67,
        shared: 34,
        interacted: 234
      },
      performanceMetrics: {
        averageResponseTime: 285,
        errorRate: 1.2,
        uptime: 99.8
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Cross-module analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving analytics'
    });
  }
});

/**
 * Obtener actividad del usuario
 * GET /api/qsocial/dashboard/activity
 */
router.get('/dashboard/activity', verifySquidIdentity, dashboardRateLimit, async (req, res) => {
  try {
    const userId = req.user.did;
    const { limit = 20 } = req.query;

    // Simular actividad del usuario
    const activities = [
      {
        module: 'qsocial',
        action: 'created_post',
        entityType: 'post',
        entityId: 'post_123',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        metadata: {
          title: 'Mi nuevo post',
          subcommunity: 'tech'
        }
      },
      {
        module: 'qmarket',
        action: 'purchased',
        entityType: 'product',
        entityId: 'nft_456',
        timestamp: new Date(Date.now() - 360000).toISOString(),
        metadata: {
          price: '50 QARMA',
          seller: 'artist123'
        }
      },
      {
        module: 'qpic',
        action: 'uploaded',
        entityType: 'image',
        entityId: 'img_789',
        timestamp: new Date(Date.now() - 540000).toISOString(),
        metadata: {
          filename: 'sunset.jpg',
          size: '2.1 MB'
        }
      }
    ];

    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      activities: limitedActivities,
      userId,
      total: activities.length
    });

  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving user activity'
    });
  }
});

export default router;