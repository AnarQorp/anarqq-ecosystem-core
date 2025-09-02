/**
 * Inter-Module Synchronization Service
 * 
 * Maneja la sincronización entre Qsocial y otros módulos del ecosistema.
 * Permite crear posts cruzados automáticamente cuando ocurren eventos en otros módulos.
 */

import axios from 'axios';
import { getActiveIdentity } from '../../state/identity';
import { getCachedPostService } from './CachedPostService';
import { getPerformanceService } from './PerformanceMonitoringService';
import { getCacheInvalidationService } from './CacheInvalidationService';
import type { QsocialPost, CreatePostRequest } from '../../types/qsocial';

export interface ModuleEvent {
  module: 'qmarket' | 'qdrive' | 'qmail' | 'qpic' | 'qlock' | 'qwallet' | 'qonsent';
  eventType: 'created' | 'updated' | 'deleted' | 'shared' | 'purchased' | 'uploaded';
  entityId: string;
  entityType: string;
  userId: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CrossPostConfig {
  enabled: boolean;
  autoPost: boolean;
  requireApproval: boolean;
  subcommunityId?: string;
  tags: string[];
  template: string;
  visibility: 'public' | 'private' | 'subcommunity';
}

export interface ModuleIntegration {
  module: string;
  apiEndpoint: string;
  authToken?: string;
  enabled: boolean;
  crossPostConfig: CrossPostConfig;
  webhookSecret?: string;
}

export interface SyncResult {
  success: boolean;
  postId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Servicio de sincronización entre módulos
 */
export class InterModuleSyncService {
  private performance = getPerformanceService();
  private postService = getCachedPostService();
  private cacheInvalidation = getCacheInvalidationService();
  
  private integrations: Map<string, ModuleIntegration> = new Map();
  private eventQueue: ModuleEvent[] = [];
  private processing = false;

  constructor() {
    this.setupDefaultIntegrations();
    this.startEventProcessor();
  }

  /**
   * Configurar integraciones por defecto
   */
  private setupDefaultIntegrations(): void {
    const defaultIntegrations: ModuleIntegration[] = [
      {
        module: 'qmarket',
        apiEndpoint: '/api/qmarket',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: true,
          requireApproval: false,
          subcommunityId: undefined,
          tags: ['marketplace', 'product'],
          template: '🛍️ Nuevo producto en Qmarket: {{title}}\n\n{{description}}\n\nPrecio: {{price}} {{currency}}\n\n#marketplace #product',
          visibility: 'public'
        }
      },
      {
        module: 'qdrive',
        apiEndpoint: '/api/qdrive',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          tags: ['file-sharing', 'storage'],
          template: '📁 Archivo compartido en Qdrive: {{filename}}\n\n{{description}}\n\nTamaño: {{size}}\nTipo: {{type}}\n\n#storage #sharing',
          visibility: 'public'
        }
      },
      {
        module: 'qpic',
        apiEndpoint: '/api/qpic',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: true,
          requireApproval: false,
          tags: ['media', 'image'],
          template: '🖼️ Nueva imagen en Qpic: {{title}}\n\n{{description}}\n\n#media #image',
          visibility: 'public'
        }
      },
      {
        module: 'qmail',
        apiEndpoint: '/api/qmail',
        enabled: false, // Deshabilitado por privacidad
        crossPostConfig: {
          enabled: false,
          autoPost: false,
          requireApproval: true,
          tags: ['communication'],
          template: '',
          visibility: 'private'
        }
      },
      {
        module: 'qlock',
        apiEndpoint: '/api/qlock',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          tags: ['security', 'access'],
          template: '🔐 Nuevo recurso protegido en Qlock: {{title}}\n\n{{description}}\n\n#security #access',
          visibility: 'subcommunity'
        }
      },
      {
        module: 'qwallet',
        apiEndpoint: '/api/qwallet',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          tags: ['wallet', 'transaction'],
          template: '💰 Actividad en Qwallet: {{type}}\n\n{{description}}\n\nMonto: {{amount}} {{currency}}\n\n#wallet #transaction',
          visibility: 'private'
        }
      },
      {
        module: 'qonsent',
        apiEndpoint: '/api/qonsent',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          tags: ['privacy', 'consent'],
          template: '🛡️ Actualización de privacidad en Qonsent: {{title}}\n\n{{description}}\n\n#privacy #consent',
          visibility: 'private'
        }
      }
    ];

    defaultIntegrations.forEach(integration => {
      this.integrations.set(integration.module, integration);
    });
  }

  /**
   * Procesar evento de otro módulo
   */
  async processModuleEvent(event: ModuleEvent): Promise<SyncResult> {
    return this.performance.recordTiming('inter_module_sync', async () => {
      try {
        const integration = this.integrations.get(event.module);
        
        if (!integration || !integration.enabled || !integration.crossPostConfig.enabled) {
          return {
            success: true,
            skipped: true,
            reason: `Integration disabled for module ${event.module}`
          };
        }

        // Verificar si el usuario tiene permisos
        const identity = getActiveIdentity();
        if (!identity || identity.did !== event.userId) {
          return {
            success: false,
            error: 'User identity mismatch or not authenticated'
          };
        }

        // Crear el post cruzado
        const crossPost = await this.createCrossPost(event, integration);
        
        if (!crossPost) {
          return {
            success: true,
            skipped: true,
            reason: 'Cross-post creation skipped based on configuration'
          };
        }

        // Invalidar caches relacionados
        await this.cacheInvalidation.invalidateFeeds();
        await this.cacheInvalidation.invalidateSearch();

        return {
          success: true,
          postId: crossPost.id
        };

      } catch (error) {
        console.error('Error processing module event:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }, { module: event.module, eventType: event.eventType });
  }

  /**
   * Crear post cruzado basado en evento de módulo
   */
  private async createCrossPost(event: ModuleEvent, integration: ModuleIntegration): Promise<QsocialPost | null> {
    const { crossPostConfig } = integration;

    // Si requiere aprobación y no es automático, agregar a cola de aprobación
    if (crossPostConfig.requireApproval && !crossPostConfig.autoPost) {
      await this.addToApprovalQueue(event, integration);
      return null;
    }

    // Generar contenido del post usando template
    const postContent = this.generatePostContent(event, crossPostConfig.template);
    
    // Crear request de post
    const postRequest: CreatePostRequest = {
      title: this.extractTitle(event),
      content: postContent,
      content_type: 'cross_post',
      source_module: event.module,
      source_id: event.entityId,
      subcommunity_id: crossPostConfig.subcommunityId,
      tags: [...crossPostConfig.tags, event.module],
      is_cross_post: true,
      cross_post_data: {
        originalModule: event.module,
        originalId: event.entityId,
        originalType: event.entityType,
        eventType: event.eventType,
        originalData: event.data
      }
    };

    // Crear el post
    return await this.postService.createPost(postRequest);
  }

  /**
   * Generar contenido del post usando template
   */
  private generatePostContent(event: ModuleEvent, template: string): string {
    let content = template;
    
    // Reemplazar variables del template
    const variables = {
      title: event.data.title || event.data.name || `${event.entityType} ${event.entityId}`,
      description: event.data.description || event.data.content || '',
      price: event.data.price || '',
      currency: event.data.currency || 'QARMA',
      filename: event.data.filename || event.data.name || '',
      size: event.data.size || '',
      type: event.data.type || event.entityType,
      amount: event.data.amount || '',
      module: event.module,
      eventType: event.eventType,
      timestamp: new Date(event.timestamp).toLocaleString()
    };

    // Reemplazar todas las variables en el template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    return content;
  }

  /**
   * Extraer título del evento
   */
  private extractTitle(event: ModuleEvent): string {
    const moduleNames = {
      qmarket: 'Qmarket',
      qdrive: 'Qdrive',
      qpic: 'Qpic',
      qmail: 'Qmail',
      qlock: 'Qlock',
      qwallet: 'Qwallet',
      qonsent: 'Qonsent'
    };

    const moduleName = moduleNames[event.module] || event.module;
    const entityName = event.data.title || event.data.name || event.entityId;
    
    return `${moduleName}: ${entityName}`;
  }

  /**
   * Agregar evento a cola de aprobación
   */
  private async addToApprovalQueue(event: ModuleEvent, integration: ModuleIntegration): Promise<void> {
    // En una implementación real, esto se guardaría en base de datos
    console.log('Added to approval queue:', { event, integration });
    
    // Notificar a moderadores sobre post pendiente de aprobación
    // TODO: Implementar sistema de notificaciones para moderadores
  }

  /**
   * Webhook endpoint para recibir eventos de otros módulos
   */
  async handleWebhook(module: string, payload: any, signature?: string): Promise<SyncResult> {
    try {
      const integration = this.integrations.get(module);
      
      if (!integration) {
        return {
          success: false,
          error: `No integration found for module ${module}`
        };
      }

      // Verificar firma del webhook si está configurada
      if (integration.webhookSecret && signature) {
        const isValid = await this.verifyWebhookSignature(payload, signature, integration.webhookSecret);
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid webhook signature'
          };
        }
      }

      // Convertir payload a ModuleEvent
      const event = this.parseWebhookPayload(module, payload);
      
      // Procesar evento
      return await this.processModuleEvent(event);

    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar firma del webhook
   */
  private async verifyWebhookSignature(payload: any, signature: string, secret: string): Promise<boolean> {
    try {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Parsear payload del webhook a ModuleEvent
   */
  private parseWebhookPayload(module: string, payload: any): ModuleEvent {
    return {
      module: module as any,
      eventType: payload.eventType || 'created',
      entityId: payload.entityId || payload.id,
      entityType: payload.entityType || 'item',
      userId: payload.userId || payload.authorId,
      data: payload.data || payload,
      timestamp: payload.timestamp || Date.now(),
      metadata: payload.metadata
    };
  }

  /**
   * Configurar integración de módulo
   */
  setModuleIntegration(module: string, integration: ModuleIntegration): void {
    this.integrations.set(module, integration);
  }

  /**
   * Obtener configuración de integración
   */
  getModuleIntegration(module: string): ModuleIntegration | undefined {
    return this.integrations.get(module);
  }

  /**
   * Listar todas las integraciones
   */
  getAllIntegrations(): ModuleIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Habilitar/deshabilitar integración
   */
  toggleIntegration(module: string, enabled: boolean): void {
    const integration = this.integrations.get(module);
    if (integration) {
      integration.enabled = enabled;
    }
  }

  /**
   * Agregar evento a cola de procesamiento
   */
  queueEvent(event: ModuleEvent): void {
    this.eventQueue.push(event);
  }

  /**
   * Iniciar procesador de eventos en background
   */
  private startEventProcessor(): void {
    setInterval(async () => {
      if (this.processing || this.eventQueue.length === 0) {
        return;
      }

      this.processing = true;
      
      try {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processModuleEvent(event);
        }
      } catch (error) {
        console.error('Event processing error:', error);
      } finally {
        this.processing = false;
      }
    }, 1000); // Procesar cada segundo
  }

  /**
   * Obtener estadísticas de sincronización
   */
  getSyncStats(): any {
    const enabledIntegrations = Array.from(this.integrations.values()).filter(i => i.enabled);
    const autoPostEnabled = enabledIntegrations.filter(i => i.crossPostConfig.autoPost);
    
    return {
      totalIntegrations: this.integrations.size,
      enabledIntegrations: enabledIntegrations.length,
      autoPostEnabled: autoPostEnabled.length,
      queuedEvents: this.eventQueue.length,
      processing: this.processing,
      integrations: Object.fromEntries(
        Array.from(this.integrations.entries()).map(([key, value]) => [
          key,
          {
            enabled: value.enabled,
            autoPost: value.crossPostConfig.autoPost,
            requireApproval: value.crossPostConfig.requireApproval
          }
        ])
      )
    };
  }

  /**
   * Limpiar cola de eventos
   */
  clearEventQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Destruir servicio
   */
  destroy(): void {
    this.clearEventQueue();
    this.integrations.clear();
  }
}

// Singleton instance
let interModuleSyncServiceInstance: InterModuleSyncService | null = null;

export function getInterModuleSyncService(): InterModuleSyncService {
  if (!interModuleSyncServiceInstance) {
    interModuleSyncServiceInstance = new InterModuleSyncService();
  }
  return interModuleSyncServiceInstance;
}

export function destroyInterModuleSyncService(): void {
  if (interModuleSyncServiceInstance) {
    interModuleSyncServiceInstance.destroy();
    interModuleSyncServiceInstance = null;
  }
}