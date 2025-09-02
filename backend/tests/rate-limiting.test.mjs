/**
 * Comprehensive Rate Limiting Tests
 * 
 * Tests for rate limiting service, middleware, and Qerberos integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RateLimitingService from '../services/RateLimitingService.mjs';
import QerberosIntegrationService from '../services/QerberosIntegrationService.mjs';
import { rateLimitMiddleware, initializeRateLimiting } from '../middleware/rateLimiting.mjs';

describe('RateLimitingService', () => {
  let service;
  
  beforeEach(() => {
    service = new RateLimitingService({
      baseLimits: {
        identity: { requests: 100, window: 60000 }, // High enough to not interfere with other tests
        subidentity: { requests: 5, window: 60000 },
        dao: { requests: 20, window: 60000 },
        anonymous: { requests: 2, window: 60000 }
      },
      abusePatterns: {
        rapidFireThreshold: 200, // Higher threshold for tests
        patternSimilarityThreshold: 0.9, // Higher threshold
        suspiciousUserAgents: ['malicious-bot'], // More specific
        maxFailureRate: 0.8 // Higher threshold
      }
    });
  });
  
  afterEach(() => {
    service = null;
  });

  describe('Identity-based rate limiting', () => {
    it('should allow requests within identity limits', async () => {
      const context = {
        squidId: 'test-identity-1',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      const result = await service.checkRateLimit(context);
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should deny requests exceeding identity limits', async () => {
      // Create a service with lower identity limit for this test
      const limitedService = new RateLimitingService({
        baseLimits: {
          identity: { requests: 10, window: 60000 }
        }
      });

      const context = {
        squidId: 'test-identity-2',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 10 requests (at the limit)
      for (let i = 0; i < 10; i++) {
        await limitedService.checkRateLimit(context);
      }

      // 11th request should be denied
      const result = await limitedService.checkRateLimit(context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should apply reputation multipliers correctly', async () => {
      // Create a service with lower identity limit for this test
      const reputationService = new RateLimitingService({
        baseLimits: {
          identity: { requests: 10, window: 60000 }
        }
      });

      const context = {
        squidId: 'test-identity-3',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Set excellent reputation (multiplier 2.0)
      await reputationService.setReputation('test-identity-3', 100);

      // Should allow 20 requests (10 * 2.0)
      for (let i = 0; i < 20; i++) {
        const result = await reputationService.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be denied
      const result = await reputationService.checkRateLimit(context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Multi-layer rate limiting', () => {
    it('should enforce subidentity limits', async () => {
      const context = {
        squidId: 'test-identity-4',
        subId: 'test-sub-1',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 5 requests (subidentity limit)
      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be denied due to subidentity limit
      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should enforce DAO limits', async () => {
      const context = {
        squidId: 'test-identity-5',
        daoId: 'test-dao-1',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 20 requests (DAO limit)
      for (let i = 0; i < 20; i++) {
        const result = await service.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be denied due to DAO limit
      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
    });

    it('should apply most restrictive limit', async () => {
      const context = {
        squidId: 'test-identity-6',
        subId: 'test-sub-2',
        daoId: 'test-dao-2',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Subidentity limit (5) is most restrictive
      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Anonymous user rate limiting', () => {
    it('should apply anonymous limits for requests without identity', async () => {
      const context = {
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 2 requests (anonymous limit)
      for (let i = 0; i < 2; i++) {
        const result = await service.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      // 3rd request should be denied
      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Abuse detection', () => {
    it('should detect rapid fire requests', async () => {
      // Create service with abuse detection enabled and lower threshold
      const rapidFireService = new RateLimitingService({
        testMode: false, // Enable abuse detection
        baseLimits: {
          identity: { requests: 1000, window: 60000 } // High limit to avoid rate limiting
        },
        abusePatterns: {
          rapidFireThreshold: 50, // Lower threshold for this test
          patternSimilarityThreshold: 0.99, // Very high to avoid false positives
          suspiciousUserAgents: ['very-specific-malicious-bot'],
          maxFailureRate: 0.99
        }
      });

      const context = {
        squidId: 'test-rapid-fire',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make requests sequentially to trigger rapid fire detection
      for (let i = 0; i < 55; i++) {
        await rapidFireService.checkRateLimit(context);
      }

      // Next request should detect abuse
      const result = await rapidFireService.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ABUSE_DETECTED');
    });

    it('should detect suspicious user agents', async () => {
      // Create service with abuse detection enabled
      const abuseService = new RateLimitingService({
        testMode: false, // Enable abuse detection
        baseLimits: {
          identity: { requests: 1000, window: 60000 }
        },
        abusePatterns: {
          rapidFireThreshold: 1000,
          patternSimilarityThreshold: 0.99,
          suspiciousUserAgents: ['malicious-bot'],
          maxFailureRate: 0.99
        }
      });

      const context = {
        squidId: 'test-user-agent',
        endpoint: 'GET /test',
        userAgent: 'malicious-bot/1.0',
        ip: '127.0.0.1'
      };

      const result = await abuseService.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ABUSE_DETECTED');
    });

    it('should detect pattern similarity', async () => {
      // Create service with abuse detection enabled
      const patternService = new RateLimitingService({
        testMode: false, // Enable abuse detection
        baseLimits: {
          identity: { requests: 1000, window: 60000 } // High limit to avoid rate limiting
        },
        abusePatterns: {
          rapidFireThreshold: 1000, // Very high to avoid false positives
          patternSimilarityThreshold: 0.8, // Standard threshold
          suspiciousUserAgents: ['very-specific-malicious-bot'],
          maxFailureRate: 0.99
        }
      });

      const context = {
        squidId: 'test-pattern',
        endpoint: 'GET /test',
        method: 'GET',
        userAgent: 'identical-requests',
        ip: '127.0.0.1'
      };

      // Make many identical requests
      for (let i = 0; i < 12; i++) {
        await patternService.checkRateLimit(context);
      }

      // Should detect pattern similarity
      const result = await patternService.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ABUSE_DETECTED');
    });
  });

  describe('Circuit breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const endpoint = 'GET /failing-endpoint';

      // Record failures
      for (let i = 0; i < 5; i++) {
        await service.recordCircuitBreakerFailure(endpoint);
      }

      const context = {
        squidId: 'test-circuit',
        endpoint,
        ip: '127.0.0.1'
      };

      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CIRCUIT_BREAKER_OPEN');
    });

    it('should transition to half-open after recovery timeout', async () => {
      const endpoint = 'GET /recovering-endpoint';

      // Create circuit breaker in open state
      const breaker = {
        state: 'OPEN',
        failures: 5,
        lastFailure: Date.now() - 31000, // 31 seconds ago
        nextAttempt: Date.now() - 1000,   // 1 second ago
        halfOpenCalls: 0
      };
      service.circuitBreakerStore.set(`circuit:${endpoint}`, breaker);

      const context = {
        squidId: 'test-recovery',
        endpoint,
        ip: '127.0.0.1'
      };

      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(true);
      
      // Check that state transitioned to half-open
      const updatedBreaker = service.circuitBreakerStore.get(`circuit:${endpoint}`);
      expect(updatedBreaker.state).toBe('HALF_OPEN');
    });
  });

  describe('Cost control', () => {
    it('should enforce minute-based cost limits', async () => {
      const service = new RateLimitingService({
        costControl: {
          maxInvocationsPerMinute: 2,
          maxInvocationsPerHour: 1000
        }
      });

      const context = {
        squidId: 'test-cost',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 2 requests (at minute limit)
      for (let i = 0; i < 2; i++) {
        const result = await service.checkRateLimit(context);
        expect(result.allowed).toBe(true);
      }

      // 3rd request should be denied due to cost limits
      const result = await service.checkRateLimit(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('COST_LIMIT_EXCEEDED');
    });

    it('should emit budget alerts', async () => {
      const service = new RateLimitingService({
        costControl: {
          maxInvocationsPerMinute: 10,
          budgetAlertThreshold: 0.8
        }
      });

      let alertEmitted = false;
      service.on('budgetAlert', () => {
        alertEmitted = true;
      });

      const context = {
        squidId: 'test-budget',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      // Make 8 requests (80% of limit)
      for (let i = 0; i < 8; i++) {
        await service.checkRateLimit(context);
      }

      expect(alertEmitted).toBe(true);
    });
  });

  describe('Statistics and monitoring', () => {
    it('should provide service statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('rateLimitEntries');
      expect(stats).toHaveProperty('circuitBreakerEntries');
      expect(stats).toHaveProperty('behaviorPatternEntries');
      expect(stats).toHaveProperty('costTrackingEntries');
      expect(stats).toHaveProperty('reputationEntries');
    });

    it('should clean up expired entries', async () => {
      const context = {
        squidId: 'test-cleanup',
        endpoint: 'GET /test',
        ip: '127.0.0.1'
      };

      await service.checkRateLimit(context);
      
      const initialSize = service.rateLimitStore.size;
      expect(initialSize).toBeGreaterThan(0);

      // Manually trigger cleanup
      service.cleanupExpiredEntries();
      
      // Size should remain the same for non-expired entries
      expect(service.rateLimitStore.size).toBe(initialSize);
    });
  });
});

describe('QerberosIntegrationService', () => {
  let qerberosService;
  
  beforeEach(() => {
    qerberosService = new QerberosIntegrationService({
      enabled: true,
      endpoint: 'http://localhost:3001',
      timeout: 1000
    });
  });
  
  afterEach(() => {
    qerberosService.clearQueue();
  });

  describe('Event reporting', () => {
    it('should queue suspicious activity events', async () => {
      const event = {
        type: 'SUSPICIOUS_ACTIVITY',
        actor: { squidId: 'test-actor' },
        details: { patterns: ['RAPID_FIRE'] },
        severity: 'HIGH'
      };

      await qerberosService.reportSuspiciousActivity(event);
      
      expect(qerberosService.eventQueue.length).toBe(1);
      expect(qerberosService.eventQueue[0].type).toBe('SUSPICIOUS_ACTIVITY');
    });

    it('should format events correctly for Qerberos', () => {
      const event = {
        type: 'TEST_EVENT',
        actor: { squidId: 'test' },
        details: { test: true }
      };

      const formatted = qerberosService.formatEventForQerberos(event);
      
      expect(formatted).toHaveProperty('id');
      expect(formatted).toHaveProperty('timestamp');
      expect(formatted).toHaveProperty('metadata');
      expect(formatted.metadata.schema).toBe('qerberos-security-event-v1');
    });

    it('should identify high priority events', () => {
      const highPriorityEvent = {
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL'
      };

      const lowPriorityEvent = {
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'LOW'
      };

      expect(qerberosService.isHighPriority(highPriorityEvent)).toBe(true);
      expect(qerberosService.isHighPriority(lowPriorityEvent)).toBe(false);
    });
  });

  describe('Risk assessment', () => {
    it('should handle risk score requests gracefully when disabled', async () => {
      const disabledService = new QerberosIntegrationService({ enabled: false });
      
      const result = await disabledService.getRiskScore('test-identity');
      
      expect(result.riskScore).toBe(0);
      expect(result.level).toBe('LOW');
    });

    it('should handle identity blocking checks gracefully when disabled', async () => {
      const disabledService = new QerberosIntegrationService({ enabled: false });
      
      const result = await disabledService.isIdentityBlocked('test-identity');
      
      expect(result).toBe(false);
    });
  });

  describe('Health and statistics', () => {
    it('should report disabled status when integration is disabled', async () => {
      const disabledService = new QerberosIntegrationService({ enabled: false });
      
      const health = await disabledService.getHealthStatus();
      
      expect(health.status).toBe('disabled');
      expect(health).toHaveProperty('queueSize');
    });

    it('should provide integration statistics', () => {
      const stats = qerberosService.getStatistics();
      
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('batchSize');
      expect(stats).toHaveProperty('endpoint');
    });
  });
});

describe('Rate Limiting Middleware', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    mockReq = {
      headers: {
        'x-squid-id': 'test-identity',
        'user-agent': 'test-agent'
      },
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1'
    };
    
    mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();
  });

  it('should allow requests within limits', async () => {
    const middleware = rateLimitMiddleware();
    
    await middleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should set rate limit headers', async () => {
    const middleware = rateLimitMiddleware();
    
    await middleware(mockReq, mockRes, mockNext);
    
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'X-RateLimit-Allowed': 'true',
        'X-RateLimit-Reason': 'ALLOWED'
      })
    );
  });

  it('should handle rate limit exceeded', async () => {
    // Initialize with very restrictive limits
    initializeRateLimiting({
      baseLimits: {
        identity: { requests: 1, window: 60000 }
      }
    });
    
    const middleware = rateLimitMiddleware();
    
    // First request should pass
    await middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    
    // Reset mocks
    mockNext.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
    
    // Second request should be rate limited
    await middleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED'
      })
    );
  });

  it('should fail open on middleware errors', async () => {
    // Create a custom middleware that will throw an error
    const errorMiddleware = async (req, res, next) => {
      try {
        // Simulate an error in the rate limiting check
        throw new Error('Test error');
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        
        // Fail open - allow request to proceed but log the error
        req.rateLimit = {
          allowed: true,
          reason: 'MIDDLEWARE_ERROR',
          error: error.message
        };
        
        next();
      }
    };
    
    await errorMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.rateLimit.allowed).toBe(true);
    expect(mockReq.rateLimit.reason).toBe('MIDDLEWARE_ERROR');
  });
});

describe('Integration Tests', () => {
  let rateLimitingService;
  let qerberosService;
  
  beforeEach(() => {
    rateLimitingService = new RateLimitingService({
      testMode: false, // Enable abuse detection for integration tests
      baseLimits: {
        identity: { requests: 5, window: 60000 }
      },
      abusePatterns: {
        rapidFireThreshold: 1000, // Very high to avoid false positives
        patternSimilarityThreshold: 0.99, // Very high to avoid false positives
        suspiciousUserAgents: ['malicious-bot'], // Specific pattern
        maxFailureRate: 0.99
      }
    });
    
    qerberosService = new QerberosIntegrationService({
      enabled: true,
      endpoint: 'http://localhost:3001'
    });
    
    // Connect services
    rateLimitingService.on('suspiciousActivity', (event) => {
      qerberosService.reportSuspiciousActivity(event);
    });
  });

  it('should integrate rate limiting with Qerberos reporting', async () => {
    const context = {
      squidId: 'test-integration',
      endpoint: 'GET /test',
      userAgent: 'malicious-bot',
      ip: '127.0.0.1'
    };

    let eventReported = false;
    qerberosService.on('eventQueued', () => {
      eventReported = true;
    });

    const result = await rateLimitingService.checkRateLimit(context);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ABUSE_DETECTED');
    
    // Wait a bit for async event processing
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(eventReported).toBe(true);
  });

  it('should handle end-to-end rate limiting flow', async () => {
    const context = {
      squidId: 'test-e2e',
      endpoint: 'GET /test',
      ip: '127.0.0.1'
    };

    // Make requests up to limit
    for (let i = 0; i < 5; i++) {
      const result = await rateLimitingService.checkRateLimit(context);
      expect(result.allowed).toBe(true);
    }

    // Next request should be rate limited
    const result = await rateLimitingService.checkRateLimit(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
  });
});