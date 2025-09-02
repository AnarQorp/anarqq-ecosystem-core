/**
 * Service Initialization
 * Initializes services based on deployment mode
 */

import { MessageService } from './messageService.mjs';
import { EncryptionService } from './encryptionService.mjs';
import { ReceiptService } from './receiptService.mjs';
import { SearchService } from './searchService.mjs';
import { EventService } from './eventService.mjs';

// Mock services for standalone mode
import { MockSquidService } from '../mocks/squidService.mjs';
import { MockQlockService } from '../mocks/qlockService.mjs';
import { MockQonsentService } from '../mocks/qonsentService.mjs';
import { MockQindexService } from '../mocks/qindexService.mjs';
import { MockQerberosService } from '../mocks/qerberosService.mjs';
import { MockQmaskService } from '../mocks/qmaskService.mjs';
import { MockQwalletService } from '../mocks/qwalletService.mjs';
import { MockIPFSService } from '../mocks/ipfsService.mjs';

// Real service clients (would be implemented for integrated mode)
// import { SquidClient } from '../clients/squidClient.mjs';
// import { QlockClient } from '../clients/qlockClient.mjs';
// ... etc

let services = {};

/**
 * Initialize services based on deployment mode
 */
export async function initializeServices(mode = 'standalone') {
  console.log(`[Services] Initializing services in ${mode} mode...`);

  try {
    switch (mode) {
      case 'standalone':
        await initializeStandaloneServices();
        break;
      case 'integrated':
        await initializeIntegratedServices();
        break;
      case 'hybrid':
        await initializeHybridServices();
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log('[Services] All services initialized successfully');
  } catch (error) {
    console.error('[Services] Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Initialize services for standalone mode (with mocks)
 */
async function initializeStandaloneServices() {
  console.log('[Services] Initializing standalone services with mocks...');

  // Initialize mock external services
  services.squid = new MockSquidService();
  services.qlock = new MockQlockService();
  services.qonsent = new MockQonsentService();
  services.qindex = new MockQindexService();
  services.qerberos = new MockQerberosService();
  services.qmask = new MockQmaskService();
  services.qwallet = new MockQwalletService();
  services.ipfs = new MockIPFSService();

  // Initialize core services
  services.encryption = new EncryptionService(services.qlock);
  services.event = new EventService(services.qerberos);
  services.message = new MessageService({
    encryption: services.encryption,
    squid: services.squid,
    qonsent: services.qonsent,
    qindex: services.qindex,
    qerberos: services.qerberos,
    qmask: services.qmask,
    qwallet: services.qwallet,
    ipfs: services.ipfs,
    event: services.event
  });
  services.receipt = new ReceiptService({
    encryption: services.encryption,
    qlock: services.qlock,
    qerberos: services.qerberos,
    ipfs: services.ipfs,
    event: services.event
  });
  services.search = new SearchService({
    qindex: services.qindex,
    encryption: services.encryption,
    qonsent: services.qonsent
  });

  // Initialize all services
  await Promise.all([
    services.squid.initialize(),
    services.qlock.initialize(),
    services.qonsent.initialize(),
    services.qindex.initialize(),
    services.qerberos.initialize(),
    services.qmask.initialize(),
    services.qwallet.initialize(),
    services.ipfs.initialize()
  ]);

  console.log('[Services] Standalone services initialized');
}

/**
 * Initialize services for integrated mode (with real services)
 */
async function initializeIntegratedServices() {
  console.log('[Services] Initializing integrated services...');

  // In a real implementation, these would be actual service clients
  // For now, we'll use mocks but log that we're in integrated mode
  console.log('[Services] Note: Using mock services for demo. In production, these would be real service clients.');

  // Initialize real service clients (placeholder)
  // services.squid = new SquidClient(process.env.SQUID_URL);
  // services.qlock = new QlockClient(process.env.QLOCK_URL);
  // ... etc

  // For demo purposes, use mocks but with different configuration
  services.squid = new MockSquidService({ integrated: true });
  services.qlock = new MockQlockService({ integrated: true });
  services.qonsent = new MockQonsentService({ integrated: true });
  services.qindex = new MockQindexService({ integrated: true });
  services.qerberos = new MockQerberosService({ integrated: true });
  services.qmask = new MockQmaskService({ integrated: true });
  services.qwallet = new MockQwalletService({ integrated: true });
  services.ipfs = new MockIPFSService({ integrated: true });

  // Initialize core services
  services.encryption = new EncryptionService(services.qlock);
  services.event = new EventService(services.qerberos);
  services.message = new MessageService({
    encryption: services.encryption,
    squid: services.squid,
    qonsent: services.qonsent,
    qindex: services.qindex,
    qerberos: services.qerberos,
    qmask: services.qmask,
    qwallet: services.qwallet,
    ipfs: services.ipfs,
    event: services.event
  });
  services.receipt = new ReceiptService({
    encryption: services.encryption,
    qlock: services.qlock,
    qerberos: services.qerberos,
    ipfs: services.ipfs,
    event: services.event
  });
  services.search = new SearchService({
    qindex: services.qindex,
    encryption: services.encryption,
    qonsent: services.qonsent
  });

  await Promise.all([
    services.squid.initialize(),
    services.qlock.initialize(),
    services.qonsent.initialize(),
    services.qindex.initialize(),
    services.qerberos.initialize(),
    services.qmask.initialize(),
    services.qwallet.initialize(),
    services.ipfs.initialize()
  ]);

  console.log('[Services] Integrated services initialized');
}

/**
 * Initialize services for hybrid mode (mix of real and mock services)
 */
async function initializeHybridServices() {
  console.log('[Services] Initializing hybrid services...');

  // In hybrid mode, some services might be real while others are mocked
  // This is useful for testing integration with some services while mocking others
  
  const useRealServices = (process.env.QMAIL_REAL_SERVICES || '').split(',');
  
  // Initialize services based on configuration
  services.squid = useRealServices.includes('squid') 
    ? new MockSquidService({ integrated: true }) // Would be real client
    : new MockSquidService();
    
  services.qlock = useRealServices.includes('qlock')
    ? new MockQlockService({ integrated: true }) // Would be real client
    : new MockQlockService();
    
  services.qonsent = useRealServices.includes('qonsent')
    ? new MockQonsentService({ integrated: true }) // Would be real client
    : new MockQonsentService();
    
  services.qindex = useRealServices.includes('qindex')
    ? new MockQindexService({ integrated: true }) // Would be real client
    : new MockQindexService();
    
  services.qerberos = useRealServices.includes('qerberos')
    ? new MockQerberosService({ integrated: true }) // Would be real client
    : new MockQerberosService();
    
  services.qmask = useRealServices.includes('qmask')
    ? new MockQmaskService({ integrated: true }) // Would be real client
    : new MockQmaskService();
    
  services.qwallet = useRealServices.includes('qwallet')
    ? new MockQwalletService({ integrated: true }) // Would be real client
    : new MockQwalletService();
    
  services.ipfs = useRealServices.includes('ipfs')
    ? new MockIPFSService({ integrated: true }) // Would be real client
    : new MockIPFSService();

  // Initialize core services
  services.encryption = new EncryptionService(services.qlock);
  services.event = new EventService(services.qerberos);
  services.message = new MessageService({
    encryption: services.encryption,
    squid: services.squid,
    qonsent: services.qonsent,
    qindex: services.qindex,
    qerberos: services.qerberos,
    qmask: services.qmask,
    qwallet: services.qwallet,
    ipfs: services.ipfs,
    event: services.event
  });
  services.receipt = new ReceiptService({
    encryption: services.encryption,
    qlock: services.qlock,
    qerberos: services.qerberos,
    ipfs: services.ipfs,
    event: services.event
  });
  services.search = new SearchService({
    qindex: services.qindex,
    encryption: services.encryption,
    qonsent: services.qonsent
  });

  await Promise.all([
    services.squid.initialize(),
    services.qlock.initialize(),
    services.qonsent.initialize(),
    services.qindex.initialize(),
    services.qerberos.initialize(),
    services.qmask.initialize(),
    services.qwallet.initialize(),
    services.ipfs.initialize()
  ]);

  console.log('[Services] Hybrid services initialized');
  console.log('[Services] Real services:', useRealServices);
}

/**
 * Get initialized services
 */
export function getServices() {
  return services;
}

/**
 * Get a specific service
 */
export function getService(name) {
  if (!services[name]) {
    throw new Error(`Service ${name} not found or not initialized`);
  }
  return services[name];
}

/**
 * Shutdown all services
 */
export async function shutdownServices() {
  console.log('[Services] Shutting down services...');
  
  const shutdownPromises = Object.values(services)
    .filter(service => typeof service.shutdown === 'function')
    .map(service => service.shutdown());
    
  await Promise.all(shutdownPromises);
  
  services = {};
  console.log('[Services] All services shut down');
}