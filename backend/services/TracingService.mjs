import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * TracingService - Distributed tracing with correlation IDs and span attributes
 * Provides request tracing across the entire ecosystem
 */
class TracingService {
  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage();
    this.spans = new Map();
    this.traces = new Map();
    this.maxSpansPerTrace = 1000;
    this.maxTraceAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Start a new trace or continue existing one
   */
  startTrace(req, res, next) {
    const traceId = req.headers['x-trace-id'] || uuidv4();
    const spanId = uuidv4();
    const parentSpanId = req.headers['x-parent-span-id'] || null;
    
    const traceContext = {
      traceId,
      spanId,
      parentSpanId,
      startTime: Date.now(),
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'http.user_agent': req.headers['user-agent'],
        'squid.id': req.headers['x-squid-id'],
        'sub.id': req.headers['x-subid'],
        'dao.id': req.headers['x-dao-id'],
        'api.version': req.headers['x-api-version'],
        'service.name': process.env.SERVICE_NAME || 'anarq-backend',
        'service.version': process.env.npm_package_version || '1.0.0'
      },
      events: [],
      status: 'OK',
      tags: new Map()
    };

    // Set response headers for downstream services
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-span-id', spanId);

    // Store trace context
    this.asyncLocalStorage.run(traceContext, () => {
      // Create or update trace
      if (!this.traces.has(traceId)) {
        this.traces.set(traceId, {
          traceId,
          startTime: Date.now(),
          spans: new Map(),
          rootSpanId: spanId,
          status: 'ACTIVE'
        });
      }

      const trace = this.traces.get(traceId);
      trace.spans.set(spanId, traceContext);

      // Add span to global spans map
      this.spans.set(spanId, traceContext);

      // Continue with request
      next();
    });
  }

  /**
   * Get current trace context
   */
  getCurrentContext() {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Add an event to the current span
   */
  addEvent(name, attributes = {}) {
    const context = this.getCurrentContext();
    if (!context) return;

    context.events.push({
      name,
      timestamp: Date.now(),
      attributes: { ...attributes }
    });
  }

  /**
   * Set an attribute on the current span
   */
  setAttribute(key, value) {
    const context = this.getCurrentContext();
    if (!context) return;

    context.attributes[key] = value;
  }

  /**
   * Set multiple attributes on the current span
   */
  setAttributes(attributes) {
    const context = this.getCurrentContext();
    if (!context) return;

    Object.assign(context.attributes, attributes);
  }

  /**
   * Add a tag to the current span
   */
  setTag(key, value) {
    const context = this.getCurrentContext();
    if (!context) return;

    context.tags.set(key, value);
  }

  /**
   * Set span status
   */
  setStatus(status, message = '') {
    const context = this.getCurrentContext();
    if (!context) return;

    context.status = status;
    if (message) {
      context.statusMessage = message;
    }
  }

  /**
   * Record an error in the current span
   */
  recordError(error) {
    const context = this.getCurrentContext();
    if (!context) return;

    this.setStatus('ERROR', error.message);
    this.addEvent('error', {
      'error.type': error.constructor.name,
      'error.message': error.message,
      'error.stack': error.stack
    });
  }

  /**
   * Start a child span
   */
  startSpan(name, attributes = {}) {
    const parentContext = this.getCurrentContext();
    if (!parentContext) return null;

    const spanId = uuidv4();
    const childContext = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      startTime: Date.now(),
      attributes: {
        'span.name': name,
        'service.name': process.env.SERVICE_NAME || 'anarq-backend',
        ...attributes
      },
      events: [],
      status: 'OK',
      tags: new Map()
    };

    // Add to trace
    const trace = this.traces.get(parentContext.traceId);
    if (trace) {
      trace.spans.set(spanId, childContext);
    }

    // Add to global spans
    this.spans.set(spanId, childContext);

    return {
      spanId,
      finish: (finalAttributes = {}) => {
        childContext.endTime = Date.now();
        childContext.duration = childContext.endTime - childContext.startTime;
        Object.assign(childContext.attributes, finalAttributes);
      },
      setAttributes: (attrs) => Object.assign(childContext.attributes, attrs),
      addEvent: (eventName, eventAttrs = {}) => {
        childContext.events.push({
          name: eventName,
          timestamp: Date.now(),
          attributes: eventAttrs
        });
      },
      setStatus: (status, message = '') => {
        childContext.status = status;
        if (message) childContext.statusMessage = message;
      }
    };
  }

  /**
   * Finish the current span
   */
  finishSpan(attributes = {}) {
    const context = this.getCurrentContext();
    if (!context) return;

    context.endTime = Date.now();
    context.duration = context.endTime - context.startTime;
    Object.assign(context.attributes, attributes);

    // Mark trace as completed if this is the root span
    const trace = this.traces.get(context.traceId);
    if (trace && trace.rootSpanId === context.spanId) {
      trace.status = 'COMPLETED';
      trace.endTime = Date.now();
      trace.duration = trace.endTime - trace.startTime;
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId) {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    return {
      traceId: trace.traceId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.duration,
      status: trace.status,
      spans: Array.from(trace.spans.values()).map(span => ({
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        attributes: span.attributes,
        events: span.events,
        status: span.status,
        statusMessage: span.statusMessage,
        tags: Object.fromEntries(span.tags)
      }))
    };
  }

  /**
   * Get span by ID
   */
  getSpan(spanId) {
    const span = this.spans.get(spanId);
    if (!span) return null;

    return {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId,
      startTime: span.startTime,
      endTime: span.endTime,
      duration: span.duration,
      attributes: span.attributes,
      events: span.events,
      status: span.status,
      statusMessage: span.statusMessage,
      tags: Object.fromEntries(span.tags)
    };
  }

  /**
   * Get all active traces
   */
  getActiveTraces() {
    const activeTraces = [];
    for (const trace of this.traces.values()) {
      if (trace.status === 'ACTIVE') {
        activeTraces.push(this.getTrace(trace.traceId));
      }
    }
    return activeTraces;
  }

  /**
   * Search traces by attributes
   */
  searchTraces(query = {}) {
    const results = [];
    
    for (const trace of this.traces.values()) {
      let matches = true;
      
      // Check trace-level filters
      if (query.status && trace.status !== query.status) {
        matches = false;
      }
      
      if (query.minDuration && trace.duration < query.minDuration) {
        matches = false;
      }
      
      if (query.maxDuration && trace.duration > query.maxDuration) {
        matches = false;
      }

      // Check span-level filters
      if (query.attributes) {
        let hasMatchingSpan = false;
        for (const span of trace.spans.values()) {
          let spanMatches = true;
          for (const [key, value] of Object.entries(query.attributes)) {
            if (span.attributes[key] !== value) {
              spanMatches = false;
              break;
            }
          }
          if (spanMatches) {
            hasMatchingSpan = true;
            break;
          }
        }
        if (!hasMatchingSpan) {
          matches = false;
        }
      }

      if (matches) {
        results.push(this.getTrace(trace.traceId));
      }
    }

    return results;
  }

  /**
   * Get tracing statistics
   */
  getStats() {
    const now = Date.now();
    const activeTraces = Array.from(this.traces.values()).filter(t => t.status === 'ACTIVE');
    const completedTraces = Array.from(this.traces.values()).filter(t => t.status === 'COMPLETED');
    
    const avgDuration = completedTraces.length > 0 
      ? completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTraces.length
      : 0;

    return {
      totalTraces: this.traces.size,
      activeTraces: activeTraces.length,
      completedTraces: completedTraces.length,
      totalSpans: this.spans.size,
      avgTraceDuration: avgDuration,
      oldestActiveTrace: activeTraces.length > 0 
        ? Math.min(...activeTraces.map(t => t.startTime))
        : null,
      memoryUsage: {
        traces: this.traces.size,
        spans: this.spans.size,
        estimatedBytes: (this.traces.size * 1000) + (this.spans.size * 500) // Rough estimate
      }
    };
  }

  /**
   * Start cleanup interval for old traces
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up old traces and spans
   */
  cleanup() {
    const now = Date.now();
    const tracesToDelete = [];
    const spansToDelete = [];

    // Find old traces
    for (const [traceId, trace] of this.traces) {
      if (now - trace.startTime > this.maxTraceAge) {
        tracesToDelete.push(traceId);
        // Collect spans to delete
        for (const spanId of trace.spans.keys()) {
          spansToDelete.push(spanId);
        }
      }
    }

    // Delete old traces and spans
    tracesToDelete.forEach(traceId => this.traces.delete(traceId));
    spansToDelete.forEach(spanId => this.spans.delete(spanId));

    if (tracesToDelete.length > 0) {
      console.log(`Cleaned up ${tracesToDelete.length} old traces and ${spansToDelete.length} spans`);
    }
  }

  /**
   * Export trace data for external systems
   */
  exportTraces(format = 'jaeger') {
    const traces = Array.from(this.traces.values()).map(trace => this.getTrace(trace.traceId));
    
    if (format === 'jaeger') {
      return this.exportToJaeger(traces);
    } else if (format === 'zipkin') {
      return this.exportToZipkin(traces);
    } else {
      return traces; // Default format
    }
  }

  /**
   * Export to Jaeger format
   */
  exportToJaeger(traces) {
    return {
      data: traces.map(trace => ({
        traceID: trace.traceId,
        spans: trace.spans.map(span => ({
          traceID: trace.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId,
          operationName: span.attributes['span.name'] || 'unknown',
          startTime: span.startTime * 1000, // Jaeger expects microseconds
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.attributes).map(([key, value]) => ({
            key,
            type: typeof value === 'string' ? 'string' : 'number',
            value: String(value)
          })),
          logs: span.events.map(event => ({
            timestamp: event.timestamp * 1000,
            fields: Object.entries(event.attributes).map(([key, value]) => ({
              key,
              value: String(value)
            }))
          }))
        }))
      }))
    };
  }

  /**
   * Export to Zipkin format
   */
  exportToZipkin(traces) {
    const spans = [];
    
    for (const trace of traces) {
      for (const span of trace.spans) {
        spans.push({
          traceId: trace.traceId,
          id: span.spanId,
          parentId: span.parentSpanId,
          name: span.attributes['span.name'] || 'unknown',
          timestamp: span.startTime * 1000,
          duration: (span.duration || 0) * 1000,
          localEndpoint: {
            serviceName: span.attributes['service.name'] || 'unknown'
          },
          tags: span.attributes,
          annotations: span.events.map(event => ({
            timestamp: event.timestamp * 1000,
            value: event.name
          }))
        });
      }
    }
    
    return spans;
  }
}

export default TracingService;