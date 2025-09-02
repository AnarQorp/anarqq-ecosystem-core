/**
 * Alert Service
 * Manages security alerts and notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { EventBusService } from './EventBusService';
import { SecurityAlert, AlertSource, AffectedResource, Indicator } from '../types';

export interface CreateAlertRequest {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: AlertSource;
  affectedResources?: AffectedResource[];
  indicators?: Indicator[];
  tags?: string[];
  recommendations?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateAlertRequest {
  status?: 'active' | 'resolved' | 'dismissed' | 'investigating';
  assignedTo?: string;
  tags?: string[];
  recommendations?: string[];
  metadata?: Record<string, any>;
}

export interface AlertSearchCriteria {
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'resolved' | 'dismissed' | 'investigating';
  assignedTo?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class AlertService {
  private alerts: Map<string, SecurityAlert> = new Map();
  private alertIndex: Map<string, Set<string>> = new Map();

  constructor(private eventBus: EventBusService) {}

  /**
   * Create a new security alert
   */
  async createAlert(request: CreateAlertRequest): Promise<SecurityAlert> {
    try {
      const alertId = uuidv4();
      const timestamp = new Date().toISOString();

      const alert: SecurityAlert = {
        id: alertId,
        type: request.type,
        severity: request.severity,
        status: 'active',
        title: request.title,
        description: request.description,
        source: request.source,
        affectedResources: request.affectedResources || [],
        indicators: request.indicators || [],
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: request.tags || [],
        recommendations: request.recommendations || [],
        relatedAlerts: [],
        metadata: request.metadata || {}
      };

      // Store alert
      this.alerts.set(alertId, alert);

      // Update indexes
      this.updateIndexes(alert);

      // Publish alert created event
      await this.publishAlertEvent('created', alert);

      logger.info('Security alert created', {
        alertId,
        type: request.type,
        severity: request.severity,
        title: request.title
      });

      return alert;

    } catch (error) {
      logger.error('Failed to create security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
      throw error;
    }
  }

  /**
   * Update an existing security alert
   */
  async updateAlert(alertId: string, request: UpdateAlertRequest): Promise<SecurityAlert | null> {
    try {
      const alert = this.alerts.get(alertId);
      
      if (!alert) {
        return null;
      }

      // Update fields
      if (request.status !== undefined) {
        alert.status = request.status;
        
        if (request.status === 'resolved') {
          alert.resolvedAt = new Date().toISOString();
        }
      }

      if (request.assignedTo !== undefined) {
        alert.assignedTo = request.assignedTo;
      }

      if (request.tags !== undefined) {
        alert.tags = request.tags;
      }

      if (request.recommendations !== undefined) {
        alert.recommendations = request.recommendations;
      }

      if (request.metadata !== undefined) {
        alert.metadata = { ...alert.metadata, ...request.metadata };
      }

      alert.updatedAt = new Date().toISOString();

      // Update indexes
      this.updateIndexes(alert);

      // Publish alert updated event
      await this.publishAlertEvent('updated', alert);

      logger.info('Security alert updated', {
        alertId,
        status: alert.status,
        assignedTo: alert.assignedTo
      });

      return alert;

    } catch (error) {
      logger.error('Failed to update security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
        request
      });
      throw error;
    }
  }

  /**
   * Get a security alert by ID
   */
  async getAlert(alertId: string): Promise<SecurityAlert | null> {
    try {
      const alert = this.alerts.get(alertId);
      return alert || null;

    } catch (error) {
      logger.error('Failed to get security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId
      });
      throw error;
    }
  }

  /**
   * Search security alerts
   */
  async searchAlerts(criteria: AlertSearchCriteria): Promise<{
    alerts: SecurityAlert[];
    totalCount: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(criteria.limit || 100, 1000);
      const offset = criteria.offset || 0;

      // Get all alerts
      let alerts = Array.from(this.alerts.values());

      // Apply filters
      if (criteria.type) {
        alerts = alerts.filter(alert => alert.type === criteria.type);
      }

      if (criteria.severity) {
        alerts = alerts.filter(alert => alert.severity === criteria.severity);
      }

      if (criteria.status) {
        alerts = alerts.filter(alert => alert.status === criteria.status);
      }

      if (criteria.assignedTo) {
        alerts = alerts.filter(alert => alert.assignedTo === criteria.assignedTo);
      }

      if (criteria.tags && criteria.tags.length > 0) {
        alerts = alerts.filter(alert => 
          criteria.tags!.some(tag => alert.tags.includes(tag))
        );
      }

      if (criteria.startDate) {
        const startDate = new Date(criteria.startDate);
        alerts = alerts.filter(alert => new Date(alert.createdAt) >= startDate);
      }

      if (criteria.endDate) {
        const endDate = new Date(criteria.endDate);
        alerts = alerts.filter(alert => new Date(alert.createdAt) <= endDate);
      }

      // Sort by creation date (newest first)
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalCount = alerts.length;
      const paginatedAlerts = alerts.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      logger.info('Security alerts searched', {
        criteria,
        totalCount,
        returnedCount: paginatedAlerts.length
      });

      return {
        alerts: paginatedAlerts,
        totalCount,
        limit,
        offset,
        hasMore
      };

    } catch (error) {
      logger.error('Failed to search security alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        criteria
      });
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByStatus: Record<string, number>;
    alertsByType: Record<string, number>;
    recentAlerts: SecurityAlert[];
    criticalAlerts: SecurityAlert[];
  }> {
    try {
      const alerts = Array.from(this.alerts.values());
      
      const alertsBySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      const alertsByStatus: Record<string, number> = {
        active: 0,
        resolved: 0,
        dismissed: 0,
        investigating: 0
      };

      const alertsByType: Record<string, number> = {};

      alerts.forEach(alert => {
        alertsBySeverity[alert.severity]++;
        alertsByStatus[alert.status]++;
        alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      });

      // Get recent alerts (last 10)
      const recentAlerts = alerts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Get critical alerts
      const criticalAlerts = alerts
        .filter(alert => alert.severity === 'critical' && alert.status === 'active')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        totalAlerts: alerts.length,
        alertsBySeverity,
        alertsByStatus,
        alertsByType,
        recentAlerts,
        criticalAlerts
      };

    } catch (error) {
      logger.error('Failed to get alert statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Link related alerts
   */
  async linkAlerts(alertId: string, relatedAlertIds: string[]): Promise<boolean> {
    try {
      const alert = this.alerts.get(alertId);
      
      if (!alert) {
        return false;
      }

      // Add related alerts (avoid duplicates)
      relatedAlertIds.forEach(relatedId => {
        if (!alert.relatedAlerts.includes(relatedId)) {
          alert.relatedAlerts.push(relatedId);
        }
      });

      alert.updatedAt = new Date().toISOString();

      // Also link back from related alerts
      for (const relatedId of relatedAlertIds) {
        const relatedAlert = this.alerts.get(relatedId);
        if (relatedAlert && !relatedAlert.relatedAlerts.includes(alertId)) {
          relatedAlert.relatedAlerts.push(alertId);
          relatedAlert.updatedAt = new Date().toISOString();
        }
      }

      logger.info('Alerts linked', {
        alertId,
        relatedAlertIds,
        totalRelated: alert.relatedAlerts.length
      });

      return true;

    } catch (error) {
      logger.error('Failed to link alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
        relatedAlertIds
      });
      throw error;
    }
  }

  /**
   * Bulk update alerts
   */
  async bulkUpdateAlerts(alertIds: string[], update: UpdateAlertRequest): Promise<number> {
    try {
      let updatedCount = 0;

      for (const alertId of alertIds) {
        const result = await this.updateAlert(alertId, update);
        if (result) {
          updatedCount++;
        }
      }

      logger.info('Bulk alert update completed', {
        requestedCount: alertIds.length,
        updatedCount,
        update
      });

      return updatedCount;

    } catch (error) {
      logger.error('Failed to bulk update alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertIds,
        update
      });
      throw error;
    }
  }

  /**
   * Delete an alert (admin only)
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      const alert = this.alerts.get(alertId);
      
      if (!alert) {
        return false;
      }

      // Remove from storage
      this.alerts.delete(alertId);

      // Remove from indexes
      this.removeFromIndexes(alert);

      // Remove from related alerts
      alert.relatedAlerts.forEach(relatedId => {
        const relatedAlert = this.alerts.get(relatedId);
        if (relatedAlert) {
          const index = relatedAlert.relatedAlerts.indexOf(alertId);
          if (index > -1) {
            relatedAlert.relatedAlerts.splice(index, 1);
            relatedAlert.updatedAt = new Date().toISOString();
          }
        }
      });

      logger.info('Security alert deleted', { alertId });
      return true;

    } catch (error) {
      logger.error('Failed to delete security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId
      });
      throw error;
    }
  }

  /**
   * Update search indexes
   */
  private updateIndexes(alert: SecurityAlert): void {
    // Type index
    if (!this.alertIndex.has(`type:${alert.type}`)) {
      this.alertIndex.set(`type:${alert.type}`, new Set());
    }
    this.alertIndex.get(`type:${alert.type}`)!.add(alert.id);

    // Severity index
    if (!this.alertIndex.has(`severity:${alert.severity}`)) {
      this.alertIndex.set(`severity:${alert.severity}`, new Set());
    }
    this.alertIndex.get(`severity:${alert.severity}`)!.add(alert.id);

    // Status index
    if (!this.alertIndex.has(`status:${alert.status}`)) {
      this.alertIndex.set(`status:${alert.status}`, new Set());
    }
    this.alertIndex.get(`status:${alert.status}`)!.add(alert.id);

    // Assignee index
    if (alert.assignedTo) {
      if (!this.alertIndex.has(`assignee:${alert.assignedTo}`)) {
        this.alertIndex.set(`assignee:${alert.assignedTo}`, new Set());
      }
      this.alertIndex.get(`assignee:${alert.assignedTo}`)!.add(alert.id);
    }

    // Tag indexes
    alert.tags.forEach(tag => {
      if (!this.alertIndex.has(`tag:${tag}`)) {
        this.alertIndex.set(`tag:${tag}`, new Set());
      }
      this.alertIndex.get(`tag:${tag}`)!.add(alert.id);
    });
  }

  /**
   * Remove from search indexes
   */
  private removeFromIndexes(alert: SecurityAlert): void {
    // Remove from all relevant indexes
    this.alertIndex.get(`type:${alert.type}`)?.delete(alert.id);
    this.alertIndex.get(`severity:${alert.severity}`)?.delete(alert.id);
    this.alertIndex.get(`status:${alert.status}`)?.delete(alert.id);
    
    if (alert.assignedTo) {
      this.alertIndex.get(`assignee:${alert.assignedTo}`)?.delete(alert.id);
    }

    alert.tags.forEach(tag => {
      this.alertIndex.get(`tag:${tag}`)?.delete(alert.id);
    });
  }

  /**
   * Publish alert event to event bus
   */
  private async publishAlertEvent(action: 'created' | 'updated' | 'resolved', alert: SecurityAlert): Promise<void> {
    try {
      const eventPayload = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description.substring(0, 500), // Truncate for event
        affectedIdentities: alert.affectedResources
          .filter(resource => resource.type === 'identity')
          .map(resource => resource.id),
        source: alert.source,
        tags: alert.tags,
        priority: this.calculatePriority(alert.severity)
      };

      await this.eventBus.publish(`q.qerberos.alert.${action}.v1`, eventPayload);

      logger.debug('Alert event published', {
        alertId: alert.id,
        action,
        eventTopic: `q.qerberos.alert.${action}.v1`
      });

    } catch (error) {
      logger.error('Failed to publish alert event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId: alert.id,
        action
      });
      // Don't throw - alert creation/update should not fail due to event bus issues
    }
  }

  /**
   * Calculate alert priority based on severity
   */
  private calculatePriority(severity: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case 'critical':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      case 'low':
      default:
        return 'low';
    }
  }
}