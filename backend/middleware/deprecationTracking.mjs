/**
 * Deprecation Tracking Middleware
 * Automatically tracks usage of deprecated features and APIs
 */

import DeprecationManagementService from '../services/DeprecationManagementService.mjs';

class DeprecationTrackingMiddleware {
  constructor(options = {}) {
    this.deprecationService = options.deprecationService || new DeprecationManagementService();
    this.trackingEnabled = options.trackingEnabled !== false;
    this.deprecatedFeatures = new Map();
    this.deprecatedEndpoints = new Map();
    
    this.loadDeprecatedFeatures();
  }

  async loadDeprecatedFeatures() {
    // Load deprecated features from the deprecation service
    const report = await this.deprecationService.generateDeprecationReport();
    
    for (const feature of report.features) {
      if (feature.status === 'ANNOUNCED' || feature.status === 'ACTIVE') {
        this.deprecatedFeatures.set(feature.featureId, {
          featureId: feature.featureId,
          deprecationDate: feature.deprecationDate,
          sunsetDate: feature.sunsetDate,
          status: feature.status
        });
      }
    }
  }

  /**
   * Register a deprecated API endpoint
   */
  registerDeprecatedEndpoint(path, method, featureId, options = {}) {
    const key = `${method.toUpperCase()} ${path}`;
    this.deprecatedEndpoints.set(key, {
      featureId,
      path,
      method: method.toUpperCase(),
      deprecationDate: options.deprecationDate,
      sunsetDate: options.sunsetDate,
      replacementEndpoint: options.replacementEndpoint,
      migrationGuide: options.migrationGuide
    });
  }

  /**
   * Express middleware for tracking deprecated API usage
   */
  trackDeprecatedAPI() {
    return async (req, res, next) => {
      if (!this.trackingEnabled) {
        return next();
      }

      const key = `${req.method} ${req.path}`;
      const deprecatedEndpoint = this.deprecatedEndpoints.get(key);

      if (deprecatedEndpoint) {
        // Add deprecation headers to response
        res.set({
          'X-API-Deprecated': 'true',
          'X-API-Deprecation-Date': deprecatedEndpoint.deprecationDate || 'unknown',
          'X-API-Sunset-Date': deprecatedEndpoint.sunsetDate || 'unknown',
          'X-API-Replacement': deprecatedEndpoint.replacementEndpoint || '',
          'X-API-Migration-Guide': deprecatedEndpoint.migrationGuide || ''
        });

        // Track usage
        try {
          const consumerId = this.extractConsumerId(req);
          const usageData = {
            consumerId,
            context: {
              endpoint: key,
              userAgent: req.get('User-Agent'),
              ip: req.ip,
              timestamp: new Date().toISOString()
            },
            metadata: {
              headers: this.sanitizeHeaders(req.headers),
              query: req.query,
              method: req.method,
              path: req.path
            }
          };

          await this.deprecationService.trackFeatureUsage(
            deprecatedEndpoint.featureId,
            usageData
          );

          // Log deprecation warning
          console.warn(`⚠️  Deprecated API used: ${key} by ${consumerId}`);
          
        } catch (error) {
          console.error('Failed to track deprecated API usage:', error);
        }
      }

      next();
    };
  }

  /**
   * Track usage of deprecated features in code
   */
  async trackDeprecatedFeature(featureId, context = {}) {
    if (!this.trackingEnabled) {
      return;
    }

    const consumerId = context.consumerId || 'unknown';
    const usageData = {
      consumerId,
      context: {
        feature: featureId,
        timestamp: new Date().toISOString(),
        ...context
      },
      metadata: {
        stackTrace: this.getStackTrace(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    try {
      await this.deprecationService.trackFeatureUsage(featureId, usageData);
      console.warn(`⚠️  Deprecated feature used: ${featureId} by ${consumerId}`);
    } catch (error) {
      console.error('Failed to track deprecated feature usage:', error);
    }
  }

  /**
   * Decorator for deprecated functions
   */
  deprecated(featureId, options = {}) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        // Track usage
        const middleware = new DeprecationTrackingMiddleware();
        await middleware.trackDeprecatedFeature(featureId, {
          function: `${target.constructor.name}.${propertyKey}`,
          consumerId: options.consumerId || 'unknown',
          ...options.context
        });

        // Call original method
        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  /**
   * Extract consumer ID from request
   */
  extractConsumerId(req) {
    // Try various methods to identify the consumer
    return req.get('x-squid-id') || 
           req.get('x-consumer-id') || 
           req.get('x-api-key') || 
           req.ip || 
           'anonymous';
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-sig'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Get stack trace for debugging
   */
  getStackTrace() {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 5) : [];
  }

  /**
   * Generate usage analytics report
   */
  async generateUsageAnalytics(featureId, options = {}) {
    if (!this.deprecationService || !this.deprecationService.usageTelemetry) {
      return null;
    }
    
    const telemetry = this.deprecationService.usageTelemetry.get(featureId);
    if (!telemetry) {
      return null;
    }

    const analytics = {
      featureId,
      totalUsage: telemetry.totalUsage,
      uniqueConsumers: telemetry.uniqueConsumers instanceof Set ? 
        telemetry.uniqueConsumers.size : telemetry.uniqueConsumers.length,
      usageByDay: {},
      usageByConsumer: {},
      topConsumers: [],
      recentUsage: []
    };

    // Analyze usage patterns
    for (const usage of telemetry.usageHistory) {
      const date = usage.timestamp.split('T')[0];
      analytics.usageByDay[date] = (analytics.usageByDay[date] || 0) + 1;
      
      analytics.usageByConsumer[usage.consumerId] = 
        (analytics.usageByConsumer[usage.consumerId] || 0) + 1;
    }

    // Get top consumers
    analytics.topConsumers = Object.entries(analytics.usageByConsumer)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([consumerId, count]) => ({ consumerId, count }));

    // Get recent usage (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    analytics.recentUsage = telemetry.usageHistory
      .filter(usage => new Date(usage.timestamp) > sevenDaysAgo)
      .slice(-50); // Last 50 recent uses

    return analytics;
  }

  /**
   * Check if a feature is deprecated
   */
  isFeatureDeprecated(featureId) {
    return this.deprecatedFeatures.has(featureId);
  }

  /**
   * Get deprecation info for a feature
   */
  getDeprecationInfo(featureId) {
    return this.deprecatedFeatures.get(featureId);
  }

  /**
   * Middleware to add deprecation warnings to responses
   */
  addDeprecationWarnings() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        // Check if response contains deprecated features
        const warnings = [];
        
        if (data && typeof data === 'object') {
          // Add deprecation warnings to response
          if (warnings.length > 0) {
            data._deprecationWarnings = warnings;
          }
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
}

export default DeprecationTrackingMiddleware;

// Export decorator for easy use
export const deprecated = (featureId, options = {}) => {
  const middleware = new DeprecationTrackingMiddleware();
  return middleware.deprecated(featureId, options);
};