import { performance } from 'perf_hooks';

/**
 * Observability middleware for request tracking and metrics collection
 */
export function createObservabilityMiddleware(observabilityService, tracingService) {
  return (req, res, next) => {
    const startTime = performance.now();
    
    // Start distributed tracing
    tracingService.startTrace(req, res, () => {
      // Add request attributes to trace
      tracingService.setAttributes({
        'http.request.size': req.headers['content-length'] || 0,
        'http.request.content_type': req.headers['content-type'],
        'client.ip': req.ip || req.connection.remoteAddress,
        'user.agent': req.headers['user-agent']
      });

      // Track concurrent requests
      const currentConcurrent = observabilityService.metrics.get('concurrentRequests') || 0;
      observabilityService.metrics.set('concurrentRequests', currentConcurrent + 1);

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record request metrics
        observabilityService.recordRequest(duration, res.statusCode, req.path, req.method);

        // Update tracing
        tracingService.setAttributes({
          'http.status_code': res.statusCode,
          'http.response.size': res.get('content-length') || 0,
          'http.response.content_type': res.get('content-type')
        });

        // Set trace status based on response
        if (res.statusCode >= 400) {
          tracingService.setStatus('ERROR', `HTTP ${res.statusCode}`);
        } else {
          tracingService.setStatus('OK');
        }

        // Finish the span
        tracingService.finishSpan({
          'response.duration_ms': duration
        });

        // Decrement concurrent requests
        const newConcurrent = observabilityService.metrics.get('concurrentRequests') - 1;
        observabilityService.metrics.set('concurrentRequests', Math.max(0, newConcurrent));

        // Call original end
        originalEnd.call(this, chunk, encoding);
      };

      next();
    });
  };
}

/**
 * Health check endpoint middleware
 */
export function createHealthEndpoint(observabilityService) {
  return (req, res) => {
    try {
      const health = observabilityService.getHealthStatus();
      
      // Set appropriate HTTP status based on health
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // Still operational
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // Service unavailable
      }

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Metrics endpoint middleware
 */
export function createMetricsEndpoint(observabilityService) {
  return (req, res) => {
    try {
      const metrics = observabilityService.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Metrics collection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Tracing endpoints middleware
 */
export function createTracingEndpoints(tracingService) {
  return {
    // Get trace by ID
    getTrace: (req, res) => {
      try {
        const { traceId } = req.params;
        const trace = tracingService.getTrace(traceId);
        
        if (!trace) {
          return res.status(404).json({
            status: 'error',
            message: 'Trace not found',
            traceId
          });
        }

        res.json({
          status: 'ok',
          data: trace
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to retrieve trace',
          error: error.message
        });
      }
    },

    // Search traces
    searchTraces: (req, res) => {
      try {
        const query = req.query;
        const traces = tracingService.searchTraces(query);
        
        res.json({
          status: 'ok',
          data: traces,
          count: traces.length
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to search traces',
          error: error.message
        });
      }
    },

    // Get tracing stats
    getStats: (req, res) => {
      try {
        const stats = tracingService.getStats();
        res.json({
          status: 'ok',
          data: stats
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to get tracing stats',
          error: error.message
        });
      }
    },

    // Export traces
    exportTraces: (req, res) => {
      try {
        const format = req.query.format || 'default';
        const traces = tracingService.exportTraces(format);
        
        res.json({
          status: 'ok',
          format,
          data: traces
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to export traces',
          error: error.message
        });
      }
    }
  };
}

/**
 * SLO monitoring middleware
 */
export function createSLOMiddleware(observabilityService) {
  // Listen for SLO violations and handle alerting
  observabilityService.on('slo-violation', (violation) => {
    console.warn('SLO Violation:', violation);
    
    // Here you would integrate with your alerting system
    // For now, we'll just log and emit an event
    if (violation.severity === 'critical') {
      console.error('CRITICAL SLO VIOLATION:', violation);
    }
  });

  observabilityService.on('critical-dependency-down', (alert) => {
    console.error('CRITICAL DEPENDENCY DOWN:', alert);
    
    // Here you would trigger immediate alerts
  });

  return (req, res, next) => {
    // Add SLO context to request
    req.sloContext = {
      startTime: Date.now(),
      target: observabilityService.sloTargets
    };
    
    next();
  };
}

/**
 * Error tracking middleware
 */
export function createErrorTrackingMiddleware(observabilityService, tracingService) {
  return (error, req, res, next) => {
    // Record error in tracing
    tracingService.recordError(error);
    
    // Add error event to observability
    observabilityService.emit('error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        ip: req.ip
      },
      timestamp: new Date().toISOString()
    });

    next(error);
  };
}

/**
 * Dependency health check helpers
 */
export function createDependencyHealthChecks() {
  return {
    // IPFS health check
    ipfs: async () => {
      try {
        // This would be replaced with actual IPFS health check
        return true;
      } catch (error) {
        return false;
      }
    },

    // Database health check
    database: async () => {
      try {
        // This would be replaced with actual database health check
        return true;
      } catch (error) {
        return false;
      }
    },

    // Redis health check
    redis: async () => {
      try {
        // This would be replaced with actual Redis health check
        return true;
      } catch (error) {
        return false;
      }
    },

    // External API health check
    externalAPI: async (url) => {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          timeout: 5000 
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  };
}