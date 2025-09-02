/**
 * Health Check Handler
 * Provides health status and dependency monitoring
 */

import { Request, Response } from 'express';
import { HealthStatus } from '../types';

export class HealthHandler {
  private startTime: Date;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Health check endpoint
   */
  getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.checkHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      console.error('[sQuid Health] Health check failed:', error);
      
      const errorHealth: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date(),
        version: process.env.npm_package_version || '1.0.0',
        dependencies: {},
        metrics: {
          uptime: this.getUptime(),
          requestCount: this.requestCount,
          errorRate: this.getErrorRate(),
          avgResponseTime: this.getAverageResponseTime()
        }
      };
      
      res.status(503).json(errorHealth);
    }
  };

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }
    
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private async checkHealth(): Promise<HealthStatus> {
    const dependencies = await this.checkDependencies();
    const status = this.determineOverallStatus(dependencies);

    return {
      status,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      dependencies,
      metrics: {
        uptime: this.getUptime(),
        requestCount: this.requestCount,
        errorRate: this.getErrorRate(),
        avgResponseTime: this.getAverageResponseTime()
      }
    };
  }

  private async checkDependencies(): Promise<Record<string, any>> {
    const dependencies: Record<string, any> = {};

    // Check database connection
    dependencies.database = await this.checkDatabase();
    
    // Check event bus connection
    dependencies.eventBus = await this.checkEventBus();
    
    // Check external services (if not in mock mode)
    if (!process.env.SQUID_MOCK_MODE) {
      dependencies.qonsent = await this.checkExternalService('qonsent');
      dependencies.qlock = await this.checkExternalService('qlock');
      dependencies.qindex = await this.checkExternalService('qindex');
      dependencies.qerberos = await this.checkExternalService('qerberos');
    }

    return dependencies;
  }

  private async checkDatabase(): Promise<any> {
    const startTime = Date.now();
    
    try {
      // In mock mode, always return healthy
      if (process.env.SQUID_MOCK_MODE === 'true') {
        return {
          status: 'up',
          latency: 1,
          lastCheck: new Date()
        };
      }

      // In production, check actual database connection
      // This would be implemented based on the database type
      // Example for MongoDB:
      // await this.mongoClient.db().admin().ping();
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'up',
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkEventBus(): Promise<any> {
    const startTime = Date.now();
    
    try {
      // In mock mode, always return healthy
      if (process.env.SQUID_MOCK_MODE === 'true') {
        return {
          status: 'up',
          latency: 1,
          lastCheck: new Date()
        };
      }

      // In production, check actual event bus connection
      // This would be implemented based on the event bus type
      // Example for Redis:
      // await this.redisClient.ping();
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'up',
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkExternalService(serviceName: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // This would make actual HTTP requests to external services
      // For now, we'll simulate the check
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const latency = Date.now() - startTime;
      
      // Simulate occasional service degradation
      const isHealthy = Math.random() > 0.1; // 90% healthy
      
      return {
        status: isHealthy ? 'up' : 'degraded',
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private determineOverallStatus(dependencies: Record<string, any>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(dependencies).map(dep => dep.status);
    
    if (statuses.includes('down')) {
      // If any critical dependency is down, service is unhealthy
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      // If any dependency is degraded, service is degraded
      return 'degraded';
    }
    
    // Check error rate
    const errorRate = this.getErrorRate();
    if (errorRate > 0.05) { // More than 5% error rate
      return 'degraded';
    }
    
    // Check average response time
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > 1000) { // More than 1 second average
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  private getErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return this.errorCount / this.requestCount;
  }

  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }
}