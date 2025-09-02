import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AuditService } from '../services/AuditService';
import { logger } from '../utils/logger';
import { config } from '../config';

const auditMiddleware: FastifyPluginAsync = async (fastify) => {
  if (!config.features.auditLogging) {
    logger.debug('Audit logging disabled, skipping audit middleware');
    return;
  }

  const auditService = new AuditService();

  // Track request start time
  fastify.addHook('onRequest', async (request, reply) => {
    (request as any).startTime = Date.now();
  });

  // Audit successful responses
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      const responseTime = Date.now() - ((request as any).startTime || Date.now());
      const statusCode = reply.statusCode;

      // Only audit certain endpoints
      const auditablePaths = ['/qonsent/check', '/qonsent/grant', '/qonsent/revoke'];
      const shouldAudit = auditablePaths.some(path => request.url.includes(path));

      if (!shouldAudit) {
        return;
      }

      // Extract relevant information
      const identity = request.identity?.squidId || 'anonymous';
      const method = request.method;
      const url = request.url;
      const userAgent = request.headers['user-agent'];
      const clientIp = request.ip;

      // Audit based on endpoint
      if (request.url.includes('/qonsent/check')) {
        const body = request.body as any;
        if (body && body.resource && body.action) {
          // This would normally be handled by the service itself
          // but we can add additional audit logging here if needed
          logger.debug('Permission check audited', {
            identity,
            resource: body.resource,
            action: body.action,
            statusCode,
            responseTime,
          });
        }
      }

      // Log security events for failed authentication/authorization
      if (statusCode === 401 || statusCode === 403) {
        await auditService.logSecurityEvent({
          eventType: statusCode === 401 ? 'AUTH_FAILURE' : 'ACCESS_DENIED',
          severity: 'MEDIUM',
          identity,
          details: {
            method,
            url,
            statusCode,
            responseTime,
            userAgent,
            clientIp,
          },
          ipAddress: clientIp,
          userAgent,
        });
      }

      // Log suspicious activity patterns
      if (responseTime > 5000) { // Slow responses might indicate attacks
        await auditService.logSecurityEvent({
          eventType: 'SLOW_RESPONSE',
          severity: 'LOW',
          identity,
          details: {
            method,
            url,
            responseTime,
            statusCode,
          },
          ipAddress: clientIp,
          userAgent,
        });
      }

    } catch (error) {
      logger.error('Audit middleware error', { error });
      // Don't throw - audit failures shouldn't break the main flow
    }
  });

  // Audit errors
  fastify.addHook('onError', async (request, reply, error) => {
    try {
      const responseTime = Date.now() - ((request as any).startTime || Date.now());
      const identity = request.identity?.squidId || 'anonymous';
      const method = request.method;
      const url = request.url;
      const userAgent = request.headers['user-agent'];
      const clientIp = request.ip;

      // Determine severity based on error type
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      
      if (error.statusCode === 401 || error.statusCode === 403) {
        severity = 'MEDIUM';
      } else if (error.statusCode && error.statusCode >= 500) {
        severity = 'HIGH';
      } else if (error.message.includes('attack') || error.message.includes('malicious')) {
        severity = 'CRITICAL';
      }

      await auditService.logSecurityEvent({
        eventType: 'ERROR_OCCURRED',
        severity,
        identity,
        details: {
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
          },
          request: {
            method,
            url,
            responseTime,
          },
          userAgent,
          clientIp,
        },
        ipAddress: clientIp,
        userAgent,
      });

    } catch (auditError) {
      logger.error('Audit error logging failed', { auditError, originalError: error });
      // Don't throw - audit failures shouldn't break the main flow
    }
  });

  // Detect suspicious patterns
  const suspiciousPatterns = {
    // Track failed attempts per IP
    failedAttempts: new Map<string, { count: number; lastAttempt: number }>(),
    
    // Track rapid requests per identity
    rapidRequests: new Map<string, number[]>(),
  };

  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const clientIp = request.ip;
      const identity = request.identity?.squidId;
      const now = Date.now();

      // Check for rapid requests from same identity
      if (identity) {
        const requests = suspiciousPatterns.rapidRequests.get(identity) || [];
        const recentRequests = requests.filter(time => now - time < 60000); // Last minute
        
        if (recentRequests.length > 100) { // More than 100 requests per minute
          await auditService.logSecurityEvent({
            eventType: 'RAPID_REQUESTS',
            severity: 'HIGH',
            identity,
            details: {
              requestCount: recentRequests.length,
              timeWindow: '1 minute',
              clientIp,
            },
            ipAddress: clientIp,
          });
        }

        recentRequests.push(now);
        suspiciousPatterns.rapidRequests.set(identity, recentRequests);
      }

      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        const cutoff = now - 300000; // 5 minutes ago
        
        for (const [ip, data] of suspiciousPatterns.failedAttempts.entries()) {
          if (data.lastAttempt < cutoff) {
            suspiciousPatterns.failedAttempts.delete(ip);
          }
        }

        for (const [id, requests] of suspiciousPatterns.rapidRequests.entries()) {
          const recent = requests.filter(time => time > cutoff);
          if (recent.length === 0) {
            suspiciousPatterns.rapidRequests.delete(id);
          } else {
            suspiciousPatterns.rapidRequests.set(id, recent);
          }
        }
      }

    } catch (error) {
      logger.error('Suspicious pattern detection error', { error });
      // Don't throw - this shouldn't break the main flow
    }
  });

  // Track failed authentication attempts
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      if (reply.statusCode === 401 || reply.statusCode === 403) {
        const clientIp = request.ip;
        const now = Date.now();
        
        const attempts = suspiciousPatterns.failedAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
        attempts.count += 1;
        attempts.lastAttempt = now;
        suspiciousPatterns.failedAttempts.set(clientIp, attempts);

        // Alert on multiple failed attempts
        if (attempts.count >= 5) {
          await auditService.logSecurityEvent({
            eventType: 'MULTIPLE_AUTH_FAILURES',
            severity: 'HIGH',
            details: {
              clientIp,
              failedAttempts: attempts.count,
              timeWindow: '5 minutes',
            },
            ipAddress: clientIp,
          });
        }
      }

    } catch (error) {
      logger.error('Failed attempt tracking error', { error });
    }
  });
};

export { auditMiddleware };
export default fp(auditMiddleware, {
  name: 'audit-middleware',
});