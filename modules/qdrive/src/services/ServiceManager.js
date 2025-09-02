import { logger } from '../utils/logger.js';
import { FileService } from './FileService.js';
import { IPFSService } from './IPFSService.js';
import { EncryptionService } from './EncryptionService.js';
import { AuthService } from './AuthService.js';
import { IndexService } from './IndexService.js';
import { AuditService } from './AuditService.js';
import { RetentionService } from './RetentionService.js';
import { CacheService } from './CacheService.js';

// Mock services for standalone mode
import { MockSquidService } from '../mocks/MockSquidService.js';
import { MockQonsentService } from '../mocks/MockQonsentService.js';
import { MockQlockService } from '../mocks/MockQlockService.js';
import { MockQindexService } from '../mocks/MockQindexService.js';
import { MockQerberosService } from '../mocks/MockQerberosService.js';

export class ServiceManager {
  constructor(config) {
    this.config = config;
    this.services = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing services...');

      // Initialize cache service first
      const cacheService = new CacheService(this.config.redis);
      await cacheService.initialize();
      this.services.set('cache', cacheService);

      // Initialize IPFS service
      const ipfsService = new IPFSService(this.config.ipfs);
      await ipfsService.initialize();
      this.services.set('ipfs', ipfsService);

      // Initialize external service clients
      await this.initializeExternalServices();

      // Initialize core services
      const encryptionService = new EncryptionService(
        this.services.get('qlock'),
        this.config
      );
      this.services.set('encryption', encryptionService);

      const authService = new AuthService(
        this.services.get('squid'),
        this.services.get('qonsent'),
        this.config
      );
      this.services.set('auth', authService);

      const indexService = new IndexService(
        this.services.get('qindex'),
        this.config
      );
      this.services.set('index', indexService);

      const auditService = new AuditService(
        this.services.get('qerberos'),
        this.config
      );
      this.services.set('audit', auditService);

      const fileService = new FileService({
        ipfs: this.services.get('ipfs'),
        encryption: this.services.get('encryption'),
        auth: this.services.get('auth'),
        index: this.services.get('index'),
        audit: this.services.get('audit'),
        cache: this.services.get('cache')
      }, this.config);
      this.services.set('file', fileService);

      const retentionService = new RetentionService(
        this.services.get('file'),
        this.services.get('audit'),
        this.config
      );
      this.services.set('retention', retentionService);

      // Start background services
      await retentionService.start();

      this.initialized = true;
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  async initializeExternalServices() {
    if (this.config.isStandalone) {
      logger.info('Initializing mock services for standalone mode');
      
      this.services.set('squid', new MockSquidService());
      this.services.set('qonsent', new MockQonsentService());
      this.services.set('qlock', new MockQlockService());
      this.services.set('qindex', new MockQindexService());
      this.services.set('qerberos', new MockQerberosService());
    } else {
      logger.info('Initializing real service clients for integrated mode');
      
      // Import real service clients
      const { SquidClient } = await import('../clients/SquidClient.js');
      const { QonsentClient } = await import('../clients/QonsentClient.js');
      const { QlockClient } = await import('../clients/QlockClient.js');
      const { QindexClient } = await import('../clients/QindexClient.js');
      const { QerberosClient } = await import('../clients/QerberosClient.js');

      this.services.set('squid', new SquidClient(this.config.services.squid));
      this.services.set('qonsent', new QonsentClient(this.config.services.qonsent));
      this.services.set('qlock', new QlockClient(this.config.services.qlock));
      this.services.set('qindex', new QindexClient(this.config.services.qindex));
      this.services.set('qerberos', new QerberosClient(this.config.services.qerberos));
    }
  }

  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service;
  }

  async shutdown() {
    logger.info('Shutting down services...');

    // Shutdown services in reverse order
    const shutdownOrder = [
      'retention',
      'file',
      'audit',
      'index',
      'auth',
      'encryption',
      'qerberos',
      'qindex',
      'qlock',
      'qonsent',
      'squid',
      'ipfs',
      'cache'
    ];

    for (const serviceName of shutdownOrder) {
      const service = this.services.get(serviceName);
      if (service && typeof service.shutdown === 'function') {
        try {
          await service.shutdown();
          logger.debug(`Service '${serviceName}' shut down successfully`);
        } catch (error) {
          logger.error(`Error shutting down service '${serviceName}':`, error);
        }
      }
    }

    this.services.clear();
    this.initialized = false;
    logger.info('All services shut down');
  }

  isInitialized() {
    return this.initialized;
  }
}