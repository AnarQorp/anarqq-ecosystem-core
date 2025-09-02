/**
 * Authentication Middleware
 * Handles sQuid identity authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdentityService } from '../types';

export interface AuthenticatedRequest extends Request {
  identity?: any;
  isAuthenticated?: boolean;
}

export class AuthMiddleware {
  constructor(private identityService: IdentityService) {}

  /**
   * Verify sQuid identity authentication
   */
  verifyIdentity = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identityId = req.header('x-squid-id');
      const signature = req.header('x-sig');
      const timestamp = req.header('x-ts');
      const message = req.header('x-message');

      // Check if all required headers are present
      if (!identityId || !signature || !timestamp || !message) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_AUTH_REQUIRED',
          message: 'Missing sQuid identity headers (x-squid-id, x-sig, x-ts, x-message)',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Parse and validate message
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (error) {
        res.status(400).json({
          status: 'error',
          code: 'SQUID_INVALID_MESSAGE',
          message: 'x-message header must contain valid JSON',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Verify message structure
      if (!parsedMessage.action || !parsedMessage.timestamp || !parsedMessage.did) {
        res.status(400).json({
          status: 'error',
          code: 'SQUID_INVALID_MESSAGE_STRUCTURE',
          message: 'Message must contain action, timestamp, and did fields',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Verify DID consistency
      if (parsedMessage.did !== identityId) {
        res.status(400).json({
          status: 'error',
          code: 'SQUID_DID_MISMATCH',
          message: 'DID in message does not match x-squid-id header',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Verify message timestamp (prevent replay attacks)
      const messageTime = new Date(parsedMessage.timestamp);
      const currentTime = new Date();
      const timeDiff = Math.abs(currentTime.getTime() - messageTime.getTime());
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (timeDiff > maxAge) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_MESSAGE_EXPIRED',
          message: 'Message timestamp is too old (max 5 minutes)',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Get identity from storage
      const identity = await this.identityService.getIdentity(identityId);
      if (!identity) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_IDENTITY_NOT_FOUND',
          message: 'Identity not found',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Verify signature
      const isValidSignature = this.verifySignature(message, signature, identity.publicKey);
      if (!isValidSignature) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_INVALID_SIGNATURE',
          message: 'Signature verification failed',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      // Add identity information to request
      req.identity = identity;
      req.isAuthenticated = true;

      console.log(`[sQuid Auth] Authenticated identity: ${identityId}`);
      next();

    } catch (error) {
      console.error('[sQuid Auth] Authentication error:', error);
      res.status(500).json({
        status: 'error',
        code: 'SQUID_AUTH_ERROR',
        message: 'Internal authentication error',
        timestamp: new Date(),
        retryable: true
      });
    }
  };

  /**
   * Optional authentication middleware
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const identityId = req.header('x-squid-id');
    
    if (!identityId) {
      // No authentication provided, continue as anonymous
      req.identity = null;
      req.isAuthenticated = false;
      next();
      return;
    }

    // Authentication provided, verify it
    await this.verifyIdentity(req, res, next);
  };

  /**
   * Require specific verification level
   */
  requireVerificationLevel = (minLevel: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.isAuthenticated || !req.identity) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      const levelOrder = ['UNVERIFIED', 'BASIC', 'ENHANCED', 'INSTITUTIONAL'];
      const userLevel = levelOrder.indexOf(req.identity.verificationLevel);
      const requiredLevel = levelOrder.indexOf(minLevel);

      if (userLevel < requiredLevel) {
        res.status(403).json({
          status: 'error',
          code: 'SQUID_INSUFFICIENT_VERIFICATION',
          message: `This action requires ${minLevel} verification level. You have ${req.identity.verificationLevel}.`,
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      next();
    };
  };

  /**
   * Require minimum reputation
   */
  requireReputation = (minReputation: number) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.isAuthenticated || !req.identity) {
        res.status(401).json({
          status: 'error',
          code: 'SQUID_AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      if (req.identity.reputation < minReputation) {
        res.status(403).json({
          status: 'error',
          code: 'SQUID_INSUFFICIENT_REPUTATION',
          message: `This action requires ${minReputation} reputation points. You have ${req.identity.reputation}.`,
          timestamp: new Date(),
          retryable: false
        });
        return;
      }

      next();
    };
  };

  /**
   * Require identity ownership
   */
  requireIdentityOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated || !req.identity) {
      res.status(401).json({
        status: 'error',
        code: 'SQUID_AUTH_REQUIRED',
        message: 'Authentication required',
        timestamp: new Date(),
        retryable: false
      });
      return;
    }

    const targetIdentityId = req.params.identityId;
    const userIdentityId = req.identity.did;

    // Allow if user owns the identity or if it's a child identity
    if (targetIdentityId !== userIdentityId && !req.identity.children.includes(targetIdentityId)) {
      res.status(403).json({
        status: 'error',
        code: 'SQUID_INSUFFICIENT_PERMISSIONS',
        message: 'You can only modify identities you own',
        timestamp: new Date(),
        retryable: false
      });
      return;
    }

    next();
  };

  private verifySignature(message: string, signature: string, publicKey: string): boolean {
    try {
      // In a real implementation, this would use proper cryptographic verification
      // For development, we'll use a simple hash-based verification
      const expectedSignature = this.createMockSignature(message, publicKey);
      return signature === expectedSignature;
    } catch (error) {
      console.error('[sQuid Auth] Signature verification error:', error);
      return false;
    }
  }

  private createMockSignature(message: string, publicKey: string): string {
    // Mock signature creation for development
    const data = `${message}:${publicKey}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}