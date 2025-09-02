import { config } from '../config';
import { logger } from '../utils/logger';
import { QonsentError, ErrorCodes } from '../utils/errors';

export interface TokenVerificationResult {
  valid: boolean;
  identity: {
    squidId: string;
    subId?: string;
    daoId?: string;
  };
  expiresAt?: string;
}

export interface SignatureVerificationParams {
  squidId: string;
  signature: string;
  timestamp: string;
  payload: string;
}

export class SquidClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.services.squid.baseUrl;
    this.timeout = config.services.squid.timeout;
  }

  /**
   * Verify a JWT token with the sQuid service
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      logger.debug('Verifying token with sQuid service', { 
        baseUrl: this.baseUrl,
        tokenPrefix: token.substring(0, 10) + '...'
      });

      // In development mode with mock services, return a mock response
      if (config.isDevelopment && this.baseUrl.includes('mock')) {
        return this.getMockTokenVerification(token);
      }

      const response = await fetch(`${this.baseUrl}/api/v1/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, identity: { squidId: '' } };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        valid: data.valid,
        identity: {
          squidId: data.identity.squidId,
          subId: data.identity.subId,
          daoId: data.identity.daoId,
        },
        expiresAt: data.expiresAt,
      };

    } catch (error) {
      logger.error('Failed to verify token with sQuid service', { error, baseUrl: this.baseUrl });
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new QonsentError(
          ErrorCodes.TIMEOUT_ERROR,
          'sQuid service timeout',
          { service: 'squid', operation: 'verifyToken' },
          true
        );
      }

      throw new QonsentError(
        ErrorCodes.SQUID_SERVICE_ERROR,
        'Failed to verify token',
        { service: 'squid', operation: 'verifyToken' },
        true
      );
    }
  }

  /**
   * Verify a signature with the sQuid service
   */
  async verifySignature(params: SignatureVerificationParams): Promise<boolean> {
    try {
      logger.debug('Verifying signature with sQuid service', { 
        squidId: params.squidId,
        timestamp: params.timestamp
      });

      // In development mode with mock services, return a mock response
      if (config.isDevelopment && this.baseUrl.includes('mock')) {
        return this.getMockSignatureVerification(params);
      }

      const response = await fetch(`${this.baseUrl}/api/v1/auth/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.valid;

    } catch (error) {
      logger.error('Failed to verify signature with sQuid service', { error, squidId: params.squidId });
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new QonsentError(
          ErrorCodes.TIMEOUT_ERROR,
          'sQuid service timeout',
          { service: 'squid', operation: 'verifySignature' },
          true
        );
      }

      throw new QonsentError(
        ErrorCodes.SQUID_SERVICE_ERROR,
        'Failed to verify signature',
        { service: 'squid', operation: 'verifySignature' },
        true
      );
    }
  }

  /**
   * Verify that an identity exists
   */
  async verifyIdentity(squidId: string): Promise<boolean> {
    try {
      logger.debug('Verifying identity with sQuid service', { squidId });

      // In development mode with mock services, return a mock response
      if (config.isDevelopment && this.baseUrl.includes('mock')) {
        return this.getMockIdentityVerification(squidId);
      }

      const response = await fetch(`${this.baseUrl}/api/v1/identity/${squidId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;

    } catch (error) {
      logger.error('Failed to verify identity with sQuid service', { error, squidId });
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new QonsentError(
          ErrorCodes.TIMEOUT_ERROR,
          'sQuid service timeout',
          { service: 'squid', operation: 'verifyIdentity' },
          true
        );
      }

      throw new QonsentError(
        ErrorCodes.SQUID_SERVICE_ERROR,
        'Failed to verify identity',
        { service: 'squid', operation: 'verifyIdentity' },
        true
      );
    }
  }

  /**
   * Mock token verification for development
   */
  private getMockTokenVerification(token: string): TokenVerificationResult {
    // Simple mock logic - in real implementation this would be more sophisticated
    if (token === 'invalid-token') {
      return { valid: false, identity: { squidId: '' } };
    }

    return {
      valid: true,
      identity: {
        squidId: 'did:squid:test-user',
        subId: 'did:squid:test-user:work',
        daoId: 'dao:test-dao',
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    };
  }

  /**
   * Mock signature verification for development
   */
  private getMockSignatureVerification(params: SignatureVerificationParams): boolean {
    // Simple mock logic - accept any signature that's not 'invalid'
    return params.signature !== 'invalid-signature';
  }

  /**
   * Mock identity verification for development
   */
  private getMockIdentityVerification(squidId: string): boolean {
    // Simple mock logic - accept any identity that doesn't contain 'invalid'
    return !squidId.includes('invalid');
  }
}