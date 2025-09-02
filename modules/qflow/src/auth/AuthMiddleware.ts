/**
 * Authentication Middleware
 * 
 * Express middleware for sQuid identity authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { squidIdentityService, SquidIdentity } from './SquidIdentityService.js';

// Extend Express Request to include identity information
declare global {
  namespace Express {
    interface Request {
      identity?: SquidIdentity;
      permissions?: string[];
      identityToken?: string;
    }
  }
}

export interface AuthOptions {
  required?: boolean;
  permissions?: string[];
  allowSubIdentities?: boolean;
  skipForPaths?: string[];
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(options: AuthOptions = {}) {
  const {
    required = true,
    permissions = [],
    allowSubIdentities = true,
    skipForPaths = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip authentication for certain paths
      if (skipForPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Extract token from Authorization header or query parameter
      const token = extractToken(req);
      
      if (!token) {
        if (!required) {
          return next();
        }
        return sendAuthError(res, 'MISSING_TOKEN', 'Authentication token required', 401);
      }

      // Validate the token
      const validationResult = await squidIdentityService.validateIdentityToken(token);
      
      if (!validationResult.valid) {
        return sendAuthError(res, 'INVALID_TOKEN', validationResult.errors.join(', '), 401, {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      const { identity } = validationResult;
      if (!identity) {
        return sendAuthError(res, 'IDENTITY_NOT_FOUND', 'Identity not found', 401);
      }

      // Check if sub-identities are allowed
      if (!allowSubIdentities && identity.type === 'sub-identity') {
        return sendAuthError(res, 'SUB_IDENTITY_NOT_ALLOWED', 'Sub-identities not allowed for this operation', 403);
      }

      // Check required permissions
      if (permissions.length > 0) {
        const hasPermissions = await squidIdentityService.hasPermissions(identity.id, permissions);
        if (!hasPermissions) {
          return sendAuthError(res, 'INSUFFICIENT_PERMISSIONS', 
            `Required permissions: ${permissions.join(', ')}`, 403, {
            required: permissions,
            available: identity.permissions
          });
        }
      }

      // Attach identity information to request
      req.identity = identity;
      req.permissions = validationResult.permissions;
      req.identityToken = token;

      // Log authentication success
      console.log(`[Auth] Authenticated: ${identity.id} (${identity.type})`);

      next();

    } catch (error) {
      console.error('[Auth] Authentication middleware error:', error);
      return sendAuthError(res, 'AUTH_ERROR', 'Authentication error', 500, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

/**
 * Middleware to require specific permissions
 */
export function requirePermissions(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.identity) {
      return sendAuthError(res, 'NOT_AUTHENTICATED', 'Authentication required', 401);
    }

    const hasPermissions = await squidIdentityService.hasPermissions(req.identity.id, permissions);
    if (!hasPermissions) {
      return sendAuthError(res, 'INSUFFICIENT_PERMISSIONS', 
        `Required permissions: ${permissions.join(', ')}`, 403, {
        required: permissions,
        available: req.identity.permissions
      });
    }

    next();
  };
}

/**
 * Middleware to validate flow ownership
 */
export function requireFlowOwnership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.identity) {
      return sendAuthError(res, 'NOT_AUTHENTICATED', 'Authentication required', 401);
    }

    const flowId = req.params.id || req.params.flowId;
    if (!flowId) {
      return sendAuthError(res, 'MISSING_FLOW_ID', 'Flow ID required', 400);
    }

    // Get flow owner from request body or fetch from storage
    let flowOwnerId: string | undefined;
    
    if (req.body && req.body.owner) {
      flowOwnerId = req.body.owner;
    } else if (req.body && req.body.flowData) {
      try {
        const flowData = JSON.parse(req.body.flowData);
        flowOwnerId = flowData.owner;
      } catch (error) {
        // Flow data parsing will be handled by the main handler
      }
    }

    if (!flowOwnerId) {
      // For existing flows, we would fetch from storage
      // For now, allow the request to proceed and let the main handler validate
      return next();
    }

    const isOwner = await squidIdentityService.validateFlowOwnership(flowOwnerId, req.identity.id);
    if (!isOwner) {
      return sendAuthError(res, 'NOT_FLOW_OWNER', 'Insufficient permissions to access this flow', 403, {
        flowId,
        flowOwner: flowOwnerId,
        requestingIdentity: req.identity.id
      });
    }

    next();
  };
}

/**
 * Middleware for optional authentication
 */
export const optionalAuth = createAuthMiddleware({ required: false });

/**
 * Middleware for required authentication
 */
export const requireAuth = createAuthMiddleware({ required: true });

/**
 * Middleware for admin operations
 */
export const requireAdmin = createAuthMiddleware({ 
  required: true, 
  permissions: ['admin:*', 'flow:admin'] 
});

/**
 * Middleware for flow operations
 */
export const requireFlowPermissions = createAuthMiddleware({ 
  required: true, 
  permissions: ['flow:create', 'flow:execute', 'flow:read'] 
});

// Helper functions

function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-Identity-Token header
  const identityHeader = req.headers['x-identity-token'];
  if (identityHeader && typeof identityHeader === 'string') {
    return identityHeader;
  }

  // Check query parameter
  const queryToken = req.query.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken;
  }

  return null;
}

function sendAuthError(res: Response, code: string, message: string, statusCode: number, details?: any): void {
  const response = {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string
  };
  
  res.status(statusCode).json(response);
}