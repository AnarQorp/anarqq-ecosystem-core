import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface PermissionCheck {
  resource: string;
  action: string;
  context?: Record<string, any>;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
}

export class QonsentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.qonsentUrl;
  }

  async checkPermission(
    squidId: string,
    permission: PermissionCheck,
    subId?: string,
    daoId?: string
  ): Promise<PermissionResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/check`, {
        squidId,
        subId,
        daoId,
        resource: permission.resource,
        action: permission.action,
        context: permission.context
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'ok') {
        return response.data.data;
      }

      return { allowed: false, reason: 'Permission check failed' };
    } catch (error) {
      logger.error('Qonsent permission check failed:', error);
      
      // In development mode, allow all permissions
      if (config.nodeEnv === 'development') {
        return { allowed: true };
      }
      
      return { allowed: false, reason: 'Service unavailable' };
    }
  }

  async grantPermission(
    squidId: string,
    resource: string,
    action: string,
    conditions?: string[],
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/grant`, {
        squidId,
        resource,
        action,
        conditions,
        expiresAt
      }, {
        timeout: 5000
      });

      return response.data.status === 'ok';
    } catch (error) {
      logger.error('Failed to grant permission:', error);
      return false;
    }
  }

  async revokePermission(
    squidId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/revoke`, {
        squidId,
        resource,
        action
      }, {
        timeout: 5000
      });

      return response.data.status === 'ok';
    } catch (error) {
      logger.error('Failed to revoke permission:', error);
      return false;
    }
  }
}