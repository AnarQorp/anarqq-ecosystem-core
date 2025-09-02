/**
 * Tests for Standardized Authentication and Authorization Middleware
 * Validates Q ecosystem transversal compliance requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  verifySquidIdentity,
  checkQonsentPermission,
  rateLimitByIdentity,
  standardAuthMiddleware,
  ErrorCodes
} from '../middleware/standardAuth.mjs';

// Mock request and response objects
const createMockReq = (headers = {}, options = {}) => ({
  headers: {
    'user-agent': 'test-agent',
    ...headers
  },
  ip: '127.0.0.1',
  path: '/test',
  method: 'GET',
  ...options
});

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    headers: {}
  };
  return res;
};

const createMockNext = () => vi.fn();

// Helper to create valid authentication headers
const createAuthHeaders = (squidId = 'test-squid-123', subId = null) => {
  const timestamp = Date.now().toString();
  const message = `GET:/test:${squidId}:${timestamp}`;
  const signature = crypto.createHash('sha256').update(message + ':mock-key').digest('hex');
  
  return {
    'x-squid-id': squidId,
    'x-sig': signature,
    'x-ts': timestamp,
    'x-api-version': 'v1',
    ...(subId && { 'x-subid': subId })
  };
};

describe('verifySquidIdentity', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  it('should allow anonymous access when not required', async () => {
    const middleware = verifySquidIdentity({ required: false, allowAnonymous: true });
    
    await middleware(req, res, next);
    
    expect(req.identity).toBeNull();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject requests without squid ID when required', async () => {
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.SQUID_IDENTITY_INVALID,
        message: expect.stringContaining('sQuid identity required')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with incomplete authentication headers', async () => {
    req.headers = { 'x-squid-id': 'test-squid-123' }; // Missing signature and timestamp
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.SQUID_IDENTITY_INVALID,
        message: expect.stringContaining('Incomplete authentication')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with expired timestamps', async () => {
    const expiredTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
    req.headers = {
      'x-squid-id': 'test-squid-123',
      'x-sig': 'test-signature',
      'x-ts': expiredTimestamp,
      'x-api-version': 'v1'
    };
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.QLOCK_AUTH_FAIL,
        message: expect.stringContaining('Request timestamp expired')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid signatures', async () => {
    req.headers = {
      'x-squid-id': 'test-squid-123',
      'x-sig': 'invalid-signature',
      'x-ts': Date.now().toString(),
      'x-api-version': 'v1'
    };
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.SIGNATURE_INVALID,
        message: expect.stringContaining('Invalid signature')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept valid authentication headers', async () => {
    req.headers = createAuthHeaders('test-squid-123', 'test-sub-456');
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(req.identity).toEqual(
      expect.objectContaining({
        squidId: 'test-squid-123',
        subId: 'test-sub-456',
        apiVersion: 'v1',
        isAuthenticated: true
      })
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should handle authentication without subidentity', async () => {
    req.headers = createAuthHeaders('test-squid-123');
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(req.identity).toEqual(
      expect.objectContaining({
        squidId: 'test-squid-123',
        subId: undefined,
        isAuthenticated: true
      })
    );
    expect(next).toHaveBeenCalled();
  });
});

describe('checkQonsentPermission', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  it('should deny access when no identity and deny-by-default is enabled', async () => {
    const middleware = checkQonsentPermission('read', { denyByDefault: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.QONSENT_DENIED,
        message: expect.stringContaining('Authentication required')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny access when missing consent token', async () => {
    req.identity = { squidId: 'test-squid-123', isAuthenticated: true };
    const middleware = checkQonsentPermission('read', { denyByDefault: true });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.QONSENT_DENIED,
        message: expect.stringContaining('Missing consent token')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny access when permission is insufficient', async () => {
    req.identity = { squidId: 'test-squid-123', isAuthenticated: true };
    req.headers['x-qonsent'] = 'invalid-token';
    const middleware = checkQonsentPermission('admin', { resource: 'users' });
    
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.QONSENT_DENIED,
        message: expect.stringContaining('Permission denied. Required: admin')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow access with valid permissions', async () => {
    req.identity = { squidId: 'test-squid-123', isAuthenticated: true };
    req.headers['x-qonsent'] = 'valid-read-token';
    const middleware = checkQonsentPermission('read', { resource: 'posts' });
    
    // Mock the consent store to have a valid token
    const { default: standardAuth } = await import('../middleware/standardAuth.mjs');
    
    await middleware(req, res, next);
    
    expect(req.permissions).toEqual(
      expect.objectContaining({
        granted: 'read',
        resource: 'posts'
      })
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('rateLimitByIdentity', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  it('should allow requests within rate limits', async () => {
    req.identity = { squidId: 'test-squid-123', isAuthenticated: true };
    const middleware = rateLimitByIdentity({ 
      windowMs: 60000, 
      maxRequests: 10,
      enableAdaptiveLimits: false // Disable adaptive limits for predictable testing
    });
    
    await middleware(req, res, next);
    
    expect(res.header).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(res.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject requests exceeding rate limits', async () => {
    req.identity = { squidId: 'test-squid-124', isAuthenticated: true }; // Different squid ID to avoid conflicts
    const middleware = rateLimitByIdentity({ 
      windowMs: 60000, 
      maxRequests: 1,
      enableAdaptiveLimits: false // Disable adaptive limits for predictable testing
    });
    
    // First request should pass
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    
    // Reset mocks for second request
    res.status.mockClear();
    res.json.mockClear();
    next.mockClear();
    
    // Second request should be rate limited
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: expect.stringContaining('Rate limit exceeded')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should apply different limits for subidentities', async () => {
    req.identity = { squidId: 'test-squid-125', subId: 'test-sub-456', isAuthenticated: true };
    const middleware = rateLimitByIdentity({ 
      windowMs: 60000, 
      maxRequests: 10, 
      maxRequestsPerSubId: 5,
      enableAdaptiveLimits: false // Disable adaptive limits for predictable testing
    });
    
    await middleware(req, res, next);
    
    expect(res.header).toHaveBeenCalledWith('X-RateLimit-Limit', 5); // SubID limit applied
    expect(next).toHaveBeenCalled();
  });

  it('should apply lower limits for anonymous users', async () => {
    // No identity set (anonymous user)
    const middleware = rateLimitByIdentity({ windowMs: 60000, maxRequests: 10 });
    
    await middleware(req, res, next);
    
    expect(res.header).toHaveBeenCalledWith('X-RateLimit-Limit', 5); // Half of maxRequests
    expect(next).toHaveBeenCalled();
  });

  it('should implement exponential backoff for repeated violations', async () => {
    req.identity = { squidId: 'test-squid-126', isAuthenticated: true }; // Different squid ID to avoid conflicts
    const middleware = rateLimitByIdentity({ 
      windowMs: 60000, 
      maxRequests: 1,
      enableExponentialBackoff: true,
      enableAdaptiveLimits: false // Disable adaptive limits for predictable testing
    });
    
    // First request passes
    await middleware(req, res, next);
    
    // Second request gets rate limited
    res.status.mockClear();
    res.header.mockClear();
    await middleware(req, res, next);
    
    expect(res.header).toHaveBeenCalledWith('Retry-After', 120); // 2 minutes (2x multiplier for first violation)
    
    // Third request gets longer backoff
    res.header.mockClear();
    await middleware(req, res, next);
    
    expect(res.header).toHaveBeenCalledWith('Retry-After', 240); // 4 minutes (2x multiplier for second violation)
  });
});

describe('standardAuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  it('should compose all middleware components correctly', async () => {
    req.headers = {
      ...createAuthHeaders('test-squid-130'),
      'x-qonsent': 'valid-read-token'
    };
    
    const middlewares = standardAuthMiddleware({
      requireAuth: true,
      requiredPermission: 'read',
      resource: 'posts',
      rateLimitOptions: { maxRequests: 100, enableAdaptiveLimits: false }
    });
    
    expect(middlewares).toHaveLength(3); // Rate limit + auth + permission
    
    // Execute all middleware in sequence
    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      await middleware(req, res, next);
      
      // Stop if middleware returned an error
      if (res.status.mock.calls.length > 0) {
        break;
      }
    }
    
    // Should have been called 3 times (once for each middleware)
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should stop execution on authentication failure', async () => {
    // Missing authentication headers
    const middlewares = standardAuthMiddleware({
      requireAuth: true,
      requiredPermission: 'read'
    });
    
    // Execute rate limiting middleware (should pass)
    await middlewares[0](req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    
    // Execute auth middleware (should fail)
    await middlewares[1](req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1); // Should not call next again
  });

  it('should work with optional authentication', async () => {
    const middlewares = standardAuthMiddleware({
      requireAuth: false,
      rateLimitOptions: { maxRequests: 100, enableAdaptiveLimits: false }
    });
    
    expect(middlewares).toHaveLength(2); // Rate limit + auth (no permission check)
    
    // Execute all middleware
    for (const middleware of middlewares) {
      await middleware(req, res, next);
    }
    
    expect(next).toHaveBeenCalledTimes(2);
    expect(req.identity).toBeNull(); // Anonymous access
  });
});

describe('Error Codes', () => {
  it('should export all required error codes', () => {
    expect(ErrorCodes).toEqual(
      expect.objectContaining({
        QLOCK_AUTH_FAIL: 'QLOCK_AUTH_FAIL',
        QONSENT_DENIED: 'QONSENT_DENIED',
        SQUID_IDENTITY_INVALID: 'SQUID_IDENTITY_INVALID',
        RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
        QERB_SUSPECT: 'QERB_SUSPECT',
        SIGNATURE_INVALID: 'SIGNATURE_INVALID',
        SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
        TIMEOUT_ERROR: 'TIMEOUT_ERROR'
      })
    );
  });
});

describe('Security Event Logging', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  it('should log authentication events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    req.headers = createAuthHeaders('test-squid-127');
    const middleware = verifySquidIdentity({ required: true });
    
    await middleware(req, res, next);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Qerberos] AUTH_SUCCESS:'),
      expect.any(String)
    );
    
    consoleSpy.mockRestore();
  });

  it('should log permission denial events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    req.identity = { squidId: 'test-squid-128', isAuthenticated: true };
    // No consent token provided
    const middleware = checkQonsentPermission('admin');
    
    await middleware(req, res, next);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Qerberos] CONSENT_MISSING:'),
      expect.any(String)
    );
    
    consoleSpy.mockRestore();
  });

  it('should log rate limiting events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    req.identity = { squidId: 'test-squid-129', isAuthenticated: true };
    const middleware = rateLimitByIdentity({ 
      windowMs: 60000, 
      maxRequests: 1,
      enableAdaptiveLimits: false // Disable adaptive limits for predictable testing
    });
    
    // First request passes
    await middleware(req, res, next);
    
    // Second request gets rate limited
    res.status.mockClear();
    await middleware(req, res, next);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Qerberos] RATE_LIMIT_EXCEEDED:'),
      expect.any(String)
    );
    
    consoleSpy.mockRestore();
  });
});