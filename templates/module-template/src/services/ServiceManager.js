/**
 * Service Manager
 * 
 * Manages connections to Q ecosystem services
 */

import { SquidClient, QlockClient, QonsentClient, QindexClient, QerberosClient } from '@anarq/common-clients';
import { ExampleService } from './ExampleService.js';

export class ServiceManager {
  constructor(options = {}) {
    this.options = options;
    this.mockServices = options.mockServices || [];
    this.services = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🔌 Initializing service connections...');

    try {
      // Initialize sQuid client
      if (!this.mockServices.includes('squid')) {
        this.services.squid = new SquidClient({
          baseURL: process.env.SQUID_URL || 'http://localhost:3001',
          timeout: 5000,
          retries: 3
        });
        console.log('✅ sQuid client initialized');
      } else {
        console.log('🔧 sQuid client mocked');
      }

      // Initialize Qlock client
      if (!this.mockServices.includes('qlock')) {
        this.services.qlock = new QlockClient({
          baseURL: process.env.QLOCK_URL || 'http://localhost:3002',
          timeout: 5000,
          retries: 3
        });
        console.log('✅ Qlock client initialized');
      } else {
        console.log('🔧 Qlock client mocked');
      }

      // Initialize Qonsent client
      if (!this.mockServices.includes('qonsent')) {
        this.services.qonsent = new QonsentClient({
          baseURL: process.env.QONSENT_URL || 'http://localhost:3003',
          timeout: 5000,
          retries: 3
        });
        console.log('✅ Qonsent client initialized');
      } else {
        console.log('🔧 Qonsent client mocked');
      }

      // Initialize Qindex client
      if (!this.mockServices.includes('qindex')) {
        this.services.qindex = new QindexClient({
          baseURL: process.env.QINDEX_URL || 'http://localhost:3004',
          timeout: 5000,
          retries: 3
        });
        console.log('✅ Qindex client initialized');
      } else {
        console.log('🔧 Qindex client mocked');
      }

      // Initialize Qerberos client
      if (!this.mockServices.includes('qerberos')) {
        this.services.qerberos = new QerberosClient({
          baseURL: process.env.QERBEROS_URL || 'http://localhost:3005',
          timeout: 5000,
          retries: 3
        });
        console.log('✅ Qerberos client initialized');
      } else {
        console.log('🔧 Qerberos client mocked');
      }

      // Initialize module-specific services
      this.services.example = new ExampleService({
        squid: this.services.squid,
        qlock: this.services.qlock,
        qonsent: this.services.qonsent,
        qindex: this.services.qindex,
        qerberos: this.services.qerberos
      });
      console.log('✅ Example service initialized');

      // Test connections
      await this.testConnections();

      this.initialized = true;
      console.log('🎉 All services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  async testConnections() {
    console.log('🔍 Testing service connections...');
    
    const testPromises = [];
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (service && typeof service.health === 'function') {
        testPromises.push(
          service.health()
            .then(() => console.log(`✅ ${serviceName} connection OK`))
            .catch(error => {
              console.warn(`⚠️ ${serviceName} connection failed:`, error.message);
              // Don't fail initialization for optional services
            })
        );
      }
    }

    await Promise.allSettled(testPromises);
  }

  async shutdown() {
    console.log('🔌 Shutting down service connections...');
    
    const shutdownPromises = [];
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (service && typeof service.disconnect === 'function') {
        shutdownPromises.push(
          service.disconnect()
            .then(() => console.log(`✅ ${serviceName} disconnected`))
            .catch(error => console.warn(`⚠️ ${serviceName} disconnect failed:`, error.message))
        );
      }
    }

    await Promise.allSettled(shutdownPromises);
    
    this.services = {};
    this.initialized = false;
    console.log('🔌 All services disconnected');
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

  // Health check for all services
  async healthCheck() {
    const health = {};
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (service && typeof service.health === 'function') {
        try {
          const serviceHealth = await service.health();
          health[serviceName] = {
            status: 'healthy',
            ...serviceHealth
          };
        } catch (error) {
          health[serviceName] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      } else {
        health[serviceName] = {
          status: 'not_available'
        };
      }
    }
    
    return health;
  }
}