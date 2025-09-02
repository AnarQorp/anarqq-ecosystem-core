/**
 * AnarQ&Q Ecosystem Services Index
 * 
 * Centralized export for all ecosystem services
 */

export { QonsentService, getQonsentService } from './QonsentService.mjs';
export { QlockService, getQlockService } from './QlockService.mjs';
export { QindexService, getQindexService } from './QindexService.mjs';
export { QerberosService, getQerberosService } from './QerberosService.mjs';
export { QNETService, getQNETService } from './QNETService.mjs';
export { QwalletService, getQwalletService } from './QwalletService.mjs';

/**
 * Initialize all ecosystem services
 */
export async function initializeEcosystemServices() {
  console.log('[Ecosystem] Initializing AnarQ&Q ecosystem services...');
  
  try {
    // Initialize services
    const qonsentService = getQonsentService();
    const qlockService = getQlockService();
    const qindexService = getQindexService();
    const qerberosService = getQerberosService();
    const qnetService = getQNETService();
    const qwalletService = getQwalletService();

    // Perform health checks
    const healthChecks = await Promise.all([
      qonsentService.healthCheck(),
      qlockService.healthCheck(),
      qindexService.healthCheck(),
      qerberosService.healthCheck(),
      qnetService.healthCheck(),
      qwalletService.healthCheck()
    ]);

    const services = ['Qonsent', 'Qlock', 'Qindex', 'Qerberos', 'QNET', 'Qwallet'];
    
    healthChecks.forEach((health, index) => {
      const serviceName = services[index];
      console.log(`[Ecosystem] ${serviceName}: ${health.status}`);
    });

    console.log('[Ecosystem] All ecosystem services initialized successfully');
    
    return {
      success: true,
      services: {
        qonsent: qonsentService,
        qlock: qlockService,
        qindex: qindexService,
        qerberos: qerberosService,
        qnet: qnetService,
        qwallet: qwalletService
      },
      healthChecks
    };

  } catch (error) {
    console.error('[Ecosystem] Service initialization failed:', error);
    throw new Error(`Ecosystem initialization failed: ${error.message}`);
  }
}

/**
 * Get ecosystem health status
 */
export async function getEcosystemHealth() {
  try {
    const services = {
      qonsent: getQonsentService(),
      qlock: getQlockService(),
      qindex: getQindexService(),
      qerberos: getQerberosService(),
      qnet: getQNETService(),
      qwallet: getQwalletService()
    };

    const healthPromises = Object.entries(services).map(async ([name, service]) => {
      try {
        const health = await service.healthCheck();
        return { name, status: health.status, health };
      } catch (error) {
        return { name, status: 'error', error: error.message };
      }
    });

    const healthResults = await Promise.all(healthPromises);
    
    const overallHealth = {
      status: healthResults.every(h => h.status === 'healthy') ? 'healthy' : 'degraded',
      services: {},
      timestamp: new Date().toISOString()
    };

    healthResults.forEach(result => {
      overallHealth.services[result.name] = {
        status: result.status,
        ...(result.health || { error: result.error })
      };
    });

    return overallHealth;

  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}