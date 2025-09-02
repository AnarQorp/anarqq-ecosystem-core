/**
 * Base ValidationService class with common functionality for ecosystem integrity validation
 * Provides core validation infrastructure for all Q∞ modules
 */

import { EventBusService } from '../EventBusService.mjs';
import ObservabilityService from '../ObservabilityService.mjs';

export class ValidationService {
  constructor(options = {}) {
    this.moduleId = options.moduleId || 'unknown';
    this.environment = options.environment || 'local';
    this.eventBus = options.eventBus || new EventBusService();
    this.observability = options.observability || new ObservabilityService();
    this.validationResults = new Map();
    this.startTime = Date.now();
  }

  /**
   * Initialize validation service with health checks
   */
  async initialize() {
    try {
      // Initialize event bus (add initialize method if not exists)
      if (typeof this.eventBus.initialize === 'function') {
        await this.eventBus.initialize();
      }
      
      // Initialize observability (add initialize method if not exists)
      if (typeof this.observability.initialize === 'function') {
        await this.observability.initialize();
      }
      
      // Register validation events
      await this.registerValidationEvents();
      
      // Start health monitoring
      await this.startHealthMonitoring();
      
      this.logInfo('ValidationService initialized successfully', {
        moduleId: this.moduleId,
        environment: this.environment
      });
      
      return { success: true, moduleId: this.moduleId };
    } catch (error) {
      this.logError('Failed to initialize ValidationService', error);
      throw error;
    }
  }

  /**
   * Register validation-specific events with the event bus
   */
  async registerValidationEvents() {
    const events = [
      'q.validation.health.check.v1',
      'q.validation.module.status.v1',
      'q.validation.integrity.report.v1',
      'q.validation.error.detected.v1',
      'q.validation.performance.gate.v1'
    ];

    // Mock subscriber for validation events
    const mockSubscriber = { squidId: 'validation-service' };

    for (const eventType of events) {
      this.eventBus.subscribe(eventType, mockSubscriber, this.handleValidationEvent.bind(this));
    }
  }

  /**
   * Handle validation events
   */
  async handleValidationEvent(event) {
    try {
      this.logInfo('Received validation event', {
        type: event.type,
        moduleId: event.data?.moduleId,
        timestamp: event.timestamp
      });

      // Record event metrics
      await this.observability.recordMetric('validation_events_received', 1, {
        event_type: event.type,
        module_id: event.data?.moduleId || 'unknown'
      });

    } catch (error) {
      this.logError('Error handling validation event', error);
    }
  }

  /**
   * Start health monitoring for the validation service
   */
  async startHealthMonitoring() {
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.performHealthCheck();
        await this.publishHealthStatus(healthStatus);
      } catch (error) {
        this.logError('Health check failed', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform basic health check
   */
  async performHealthCheck() {
    const healthData = {
      moduleId: this.moduleId,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      environment: this.environment,
      checks: {
        eventBus: false,
        observability: false,
        memory: false,
        validationResults: false
      },
      metrics: {
        totalValidations: this.validationResults.size,
        successRate: this.calculateSuccessRate(),
        averageResponseTime: this.calculateAverageResponseTime()
      }
    };

    try {
      // Check event bus connectivity
      healthData.checks.eventBus = typeof this.eventBus.getStats === 'function';
      
      // Check observability service
      healthData.checks.observability = typeof this.observability.getHealthStatus === 'function';
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      healthData.checks.memory = memUsage.heapUsed < (memUsage.heapTotal * 0.9);
      healthData.memoryUsage = memUsage;
      
      // Check validation results storage
      healthData.checks.validationResults = this.validationResults.size >= 0;
      
      // Determine overall status
      const allChecksPass = Object.values(healthData.checks).every(check => check === true);
      healthData.status = allChecksPass ? 'healthy' : 'degraded';
      
    } catch (error) {
      healthData.status = 'critical';
      healthData.error = error.message;
    }

    return healthData;
  }

  /**
   * Publish health status to event bus and observability
   */
  async publishHealthStatus(healthData) {
    try {
      // Publish to event bus
      const mockActor = { squidId: 'validation-service' };
      await this.eventBus.publish({
        topic: 'q.validation.health.check.v1',
        payload: healthData,
        actor: mockActor
      });
      
      // Record metrics (mock implementation)
      if (typeof this.observability.recordRequest === 'function') {
        this.observability.recordRequest(50, 200, '/health', 'GET');
      }

    } catch (error) {
      this.logError('Failed to publish health status', error);
    }
  }

  /**
   * Execute a validation with common error handling and metrics
   */
  async executeValidation(validationName, validationFn, options = {}) {
    const startTime = Date.now();
    const validationId = `${this.moduleId}-${validationName}-${Date.now()}`;
    
    try {
      this.logInfo(`Starting validation: ${validationName}`, { validationId });
      
      // Record validation start (mock implementation)
      if (typeof this.observability.recordRequest === 'function') {
        this.observability.recordRequest(0, 200, `/validation/${validationName}`, 'POST');
      }

      // Execute validation
      const result = await validationFn(options);
      const duration = Date.now() - startTime;
      
      // Store result
      this.validationResults.set(validationId, {
        name: validationName,
        result,
        duration,
        timestamp: new Date().toISOString(),
        success: true
      });

      // Record success metrics (mock implementation)
      if (typeof this.observability.recordRequest === 'function') {
        this.observability.recordRequest(duration, 200, `/validation/${validationName}`, 'POST');
      }

      this.logInfo(`Validation completed: ${validationName}`, {
        validationId,
        duration,
        success: true
      });

      return { success: true, result, duration, validationId };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Store error result
      this.validationResults.set(validationId, {
        name: validationName,
        error: error.message,
        duration,
        timestamp: new Date().toISOString(),
        success: false
      });

      // Record error metrics (mock implementation)
      if (typeof this.observability.recordRequest === 'function') {
        this.observability.recordRequest(duration, 500, `/validation/${validationName}`, 'POST');
      }

      // Publish error event
      const mockActor = { squidId: 'validation-service' };
      await this.eventBus.publish({
        topic: 'q.validation.error.detected.v1',
        payload: {
          moduleId: this.moduleId,
          validationName,
          error: error.message,
          validationId,
          duration
        },
        actor: mockActor
      });

      this.logError(`Validation failed: ${validationName}`, error, { validationId });
      
      return { success: false, error: error.message, duration, validationId };
    }
  }

  /**
   * Get validation results
   */
  getValidationResults(limit = 100) {
    const results = Array.from(this.validationResults.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return results;
  }

  /**
   * Calculate success rate of validations
   */
  calculateSuccessRate() {
    if (this.validationResults.size === 0) return 1.0;
    
    const successful = Array.from(this.validationResults.values())
      .filter(result => result.success).length;
    
    return successful / this.validationResults.size;
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    if (this.validationResults.size === 0) return 0;
    
    const totalDuration = Array.from(this.validationResults.values())
      .reduce((sum, result) => sum + result.duration, 0);
    
    return totalDuration / this.validationResults.size;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Cleanup services if methods exist
      if (typeof this.eventBus.cleanup === 'function') {
        await this.eventBus.cleanup();
      }
      if (typeof this.observability.cleanup === 'function') {
        await this.observability.cleanup();
      }
      
      this.logInfo('ValidationService cleanup completed');
    } catch (error) {
      this.logError('Error during cleanup', error);
    }
  }

  /**
   * Logging helpers
   */
  logInfo(message, data = {}) {
    console.log(`[ValidationService:${this.moduleId}] ${message}`, data);
  }

  logError(message, error, data = {}) {
    console.error(`[ValidationService:${this.moduleId}] ${message}`, {
      error: error.message,
      stack: error.stack,
      ...data
    });
  }
}

export default ValidationService;