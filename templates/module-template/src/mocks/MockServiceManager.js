/**
 * Mock Service Manager
 * 
 * Provides mock implementations of Q ecosystem services for development and testing
 */

import { MockSquidClient } from './MockSquidClient.js';
import { MockQlockClient } from './MockQlockClient.js';
import { MockQonsentClient } from './MockQonsentClient.js';
import { MockQindexClient } from './MockQindexClient.js';
import { MockQerberosClient } from './MockQerberosClient.js';
import { ExampleService } from '../services/ExampleService.js';

export class MockServiceManager {
  constructor(options = {}) {
    this.options = options;
    this.services = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing mock services...');

    try {
      // Initialize mock clients
      this.services.squid = new MockSquidClient();
      this.services.qlock = new MockQlockClient();
      this.services.qonsent = new MockQonsentClient();
      this.services.qindex = new MockQindexClient();
      this.services.qerberos = new MockQerberosClient();

      // Initialize module-specific services with mocks
      this.services.example = new ExampleService({
        squid: this.services.squid,
        qlock: this.services.qlock,
        qonsent: this.services.qonsent,
        qindex: this.services.qindex,
        qerberos: this.services.qerberos
      });

      this.initialized = true;
      console.log('🎉 All mock services initialized successfully');
    } catch (error) {
      console.error('❌ Mock service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    console.log('🔧 Shutting down mock services...');
    
    // Mock services don't need real cleanup
    this.services = {};
    this.initialized = false;
    console.log('🔧 All mock services shut down');
  }

  // Service getters
  get squid() {
    return this.services.squid;
  }

  get qlock() {
    return this.services.qlock;
  }

  get qonsent() {
    return this.services.qonsent;
  }

  get qindex() {
    return this.services.qindex;
  }

  get qerberos() {
    return this.services.qerberos;
  }

  get example() {
    return this.services.example;
  }

  // Health check for all mock services
  async healthCheck() {
    const health = {};
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (service && typeof service.health === 'function') {
        try {
          const serviceHealth = await service.health();
          health[serviceName] = {
            status: 'healthy',
            mock: true,
            ...serviceHealth
          };
        } catch (error) {
          health[serviceName] = {
            status: 'unhealthy',
            mock: true,
            error: error.message
          };
        }
      } else {
        health[serviceName] = {
          status: 'not_available',
          mock: true
        };
      }
    }
    
    return health;
  }
}