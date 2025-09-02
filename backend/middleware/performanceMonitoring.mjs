/**
 * Performance Monitoring Middleware
 * Integrates performance profiling, caching, and metrics collection
 */

import PerformanceProfilerService from '../services/PerformanceProfilerService.mjs';
import CachingService from '../services/CachingService.mjs';
import AdvancedMetricsService from '../services/AdvancedMetricsService.mjs';
import PerformanceRegressionService from '../services/PerformanceRegressionService.mjs';
import CapacityPlanningService from '../services/CapacityPlanningService.mjs';

// Initialize services
const profiler = new PerformanceProfilerService();
const cache = new CachingService();
const metrics = new AdvancedMetricsService();
const regression = new PerformanceRegressionService();
const capacity = new CapacityPlanningService();

// Service instances for export
export const performanceServices = {
  profiler,
  cache,
  metrics,
  regression,
  capacity
};

/**
 * Performance profiling middleware
 */
export function performanceProfiler(options = {}) {
  return (req, res, next) => {
    const profileId = `${req.method}_${req.path}_${Date.now()}`;
    const metadata = {
      method: req.method,
      path: req.path,
      module: options.module || 'unknown',
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length') || 0
    };

    // Start profiling
    const profile = profiler.startProfile(profileId, metadata);
    req.performanceProfile = profile;

    // Add checkpoint helper to request
    req.checkpoint = (name, data) => profiler.checkpoint(profileId, name, data);

    // Track query helper
    req.trackQuery = (query, duration, metadata) => 
      profiler.trackQuery(profileId, query, duration, metadata);

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const duration = endTime - profile.startTime;

      // Record metrics
      metrics.recordRequest(
        metadata.module,
        req.path,
        duration,
        res.statusCode,
        {
          method: req.method,
          userAgent: req.get('User-Agent')
        }
      );

      // Record capacity metrics
      capacity.recordUsage('requests', 1, endTime, {
        module: metadata.module,
        endpoint: req.path
      });

      // End profiling
      const report = profiler.endProfile(profileId);
      
      // Add performance headers
      if (options.includeHeaders !== false) {
        res.set('X-Response-Time', `${duration}ms`);
        res.set('X-Profile-ID', profileId);
        
        if (report && report.bottlenecks.length > 0) {
          res.set('X-Performance-Warning', 'Bottlenecks detected');
        }
      }

      // Log performance issues
      if (duration > (options.slowRequestThreshold || 1000)) {
        console.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Caching middleware
 */
export function cacheMiddleware(options = {}) {
  const cacheName = options.cacheName || 'http_responses';
  const defaultTTL = options.ttl || 300000; // 5 minutes
  const keyGenerator = options.keyGenerator || ((req) => 
    `${req.method}_${req.path}_${JSON.stringify(req.query)}`
  );

  return async (req, res, next) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' && !options.cacheAllMethods) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cached = await cache.get(cacheName, cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached);
      }

      // Cache miss - continue with request
      res.set('X-Cache', 'MISS');
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.dynamicTTL ? 
            calculateDynamicTTL(req, res, data) : defaultTTL;
          
          cache.set(cacheName, cacheKey, data, {
            ttl,
            tags: options.tags || [req.path.split('/')[1]]
          }).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(options = {}) {
  return (req, res, next) => {
    const startTime = Date.now();
    const module = options.module || 'unknown';

    // Record request start
    metrics.record('request_started', 1, { module, endpoint: req.path });

    // Override res.end to capture final metrics
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      const contentLength = res.get('Content-Length') || 0;

      // Record comprehensive metrics
      metrics.recordRequest(module, req.path, duration, res.statusCode, {
        method: req.method,
        userAgent: req.get('User-Agent'),
        contentLength: parseInt(contentLength) || 0
      });

      // Record business metrics if available
      if (req.businessMetrics) {
        for (const [name, value] of Object.entries(req.businessMetrics)) {
          metrics.recordBusiness(name, value, { module, endpoint: req.path });
        }
      }

      originalEnd.call(this, chunk, encoding);
    };

    // Add business metrics helper
    req.recordBusinessMetric = (name, value) => {
      if (!req.businessMetrics) req.businessMetrics = {};
      req.businessMetrics[name] = value;
    };

    next();
  };
}

/**
 * Auto-scaling middleware
 */
export function autoScalingMiddleware(options = {}) {
  let requestCount = 0;
  let lastScalingCheck = Date.now();
  const checkInterval = options.checkInterval || 60000; // 1 minute

  return (req, res, next) => {
    requestCount++;

    // Periodic scaling assessment
    const now = Date.now();
    if (now - lastScalingCheck > checkInterval) {
      const rps = requestCount / (checkInterval / 1000);
      
      // Record RPS for capacity planning
      capacity.recordUsage('requests_per_second', rps, now, {
        module: options.module || 'unknown'
      });

      // Reset counters
      requestCount = 0;
      lastScalingCheck = now;

      // Trigger scaling analysis
      capacity.analyzeCapacity('requests_per_second')
        .then(analysis => {
          if (analysis && analysis.scalingNeeds.recommendations.length > 0) {
            console.log('Auto-scaling recommendations:', analysis.scalingNeeds.recommendations);
            // Here you would integrate with your auto-scaling system
          }
        })
        .catch(err => console.error('Capacity analysis error:', err));
    }

    next();
  };
}

/**
 * Performance regression detection middleware
 */
export function regressionDetectionMiddleware(options = {}) {
  const testName = options.testName || 'http_requests';
  let responseTimeBuffer = [];
  const bufferSize = options.bufferSize || 100;

  return (req, res, next) => {
    const startTime = Date.now();

    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      
      // Add to buffer
      responseTimeBuffer.push(duration);
      
      // Run regression test when buffer is full
      if (responseTimeBuffer.length >= bufferSize) {
        regression.runRegressionTest(testName, [...responseTimeBuffer], {
          endpoint: req.path,
          method: req.method,
          timestamp: Date.now()
        }).then(result => {
          if (result.verdict.status === 'regression') {
            console.warn('Performance regression detected:', result);
            // Here you would trigger alerts or notifications
          }
        }).catch(err => {
          console.error('Regression test error:', err);
        });

        // Reset buffer
        responseTimeBuffer = [];
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Combined performance monitoring middleware
 */
export function performanceMonitoring(options = {}) {
  const middlewares = [];

  if (options.profiling !== false) {
    middlewares.push(performanceProfiler(options.profiling || {}));
  }

  if (options.caching !== false) {
    middlewares.push(cacheMiddleware(options.caching || {}));
  }

  if (options.metrics !== false) {
    middlewares.push(metricsMiddleware(options.metrics || {}));
  }

  if (options.autoScaling !== false) {
    middlewares.push(autoScalingMiddleware(options.autoScaling || {}));
  }

  if (options.regressionDetection !== false) {
    middlewares.push(regressionDetectionMiddleware(options.regressionDetection || {}));
  }

  return (req, res, next) => {
    let index = 0;

    function runNext() {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

/**
 * Helper functions
 */
function calculateDynamicTTL(req, res, data) {
  // Dynamic TTL based on data characteristics
  const baseTime = 300000; // 5 minutes
  
  // Longer TTL for larger responses (more expensive to generate)
  const dataSize = JSON.stringify(data).length;
  const sizeFactor = Math.min(2, dataSize / 10000); // Max 2x for large responses
  
  // Shorter TTL for error responses
  const statusFactor = res.statusCode >= 400 ? 0.1 : 1;
  
  // Longer TTL for cacheable endpoints
  const pathFactor = req.path.includes('/static/') ? 10 : 1;
  
  return baseTime * sizeFactor * statusFactor * pathFactor;
}

// Event listeners for service coordination
profiler.on('bottleneck_identified', (bottleneck) => {
  console.warn('Performance bottleneck identified:', bottleneck);
  
  // Record as metric for trending
  metrics.record('bottleneck_detected', 1, {
    type: bottleneck.type,
    severity: bottleneck.severity
  });
});

cache.on('cache_miss', ({ cacheName, key }) => {
  metrics.record('cache_miss', 1, { cacheName });
});

cache.on('cache_hit', ({ cacheName, key }) => {
  metrics.record('cache_hit', 1, { cacheName });
});

metrics.on('slo_violation', (violation) => {
  console.error('SLO violation detected:', violation);
  
  // Could trigger auto-scaling or alerts here
  if (violation.type === 'latency') {
    capacity.recordUsage('latency_violations', 1, Date.now(), violation.labels);
  }
});

regression.on('regression_detected', (regression) => {
  console.error('Performance regression detected:', regression);
  
  // Record regression metrics
  metrics.record('performance_regression', 1, {
    testName: regression.testName,
    severity: regression.severity
  });
});

capacity.on('capacity_analyzed', (analysis) => {
  if (analysis.scalingNeeds.recommendations.length > 0) {
    console.log('Capacity recommendations:', analysis.scalingNeeds.recommendations);
  }
});

export default {
  performanceProfiler,
  cacheMiddleware,
  metricsMiddleware,
  autoScalingMiddleware,
  regressionDetectionMiddleware,
  performanceMonitoring,
  performanceServices
};