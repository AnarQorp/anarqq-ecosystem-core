import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface IdentityInfo {
  squidId: string;
  subId?: string;
  daoId?: string;
  permissions?: string[];
  reputation?: number;
  verified: boolean;
}

export class SquidService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.squidUrl;
  }

  async verifyIdentity(token: string): Promise<IdentityInfo | null> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/verify`, {
        token
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'ok') {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('sQuid identity verification failed:', error);
      
      // In development mode, return mock identity
      if (config.nodeEnv === 'development') {
        return {
          squidId: 'dev-user-123',
          verified: true,
          permissions: ['media:upload', 'media:download', 'media:transcode']
        };
      }
      
      return null;
    }
  }

  async getActiveContext(squidId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/identity/${squidId}/context`, {
        timeout: 5000
      });

      if (response.data.status === 'ok') {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get active context:', error);
      return null;
    }
  }

  async updateReputation(squidId: string, action: string, value: number): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/identity/${squidId}/reputation`, {
        action,
        value
      }, {
        timeout: 5000
      });

      return response.data.status === 'ok';
    } catch (error) {
      logger.error('Failed to update reputation:', error);
      return false;
    }
  }
}