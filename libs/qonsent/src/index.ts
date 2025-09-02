// Qonsent Core Module
// This file serves as the main entry point for the Qonsent module

import { QonsentService } from './services/qonsent.service';
import type { QonsentConfig } from './types/qonsent.types';

// Re-export all public types and interfaces
export * from './types/qonsent.types';

// Re-export the main service
export { QonsentService };

// Export middleware if it exists
let qsocialMiddleware: any;
try {
  // @ts-ignore - Dynamic import to handle case where middleware might not exist
  qsocialMiddleware = require('./middleware/qsocail.middleware').qsocailMiddleware;
} catch (e) {
  // Middleware not available
  console.warn('Qsocial middleware not available');
}

/**
 * Initialize the Qonsent module with the given configuration
 * @param config Configuration options for the Qonsent module
 * @returns An instance of QonsentService
 */
async function initQonsent(config: QonsentConfig = {}): Promise<QonsentService> {
  const service = new QonsentService(config);
  await service.initialize();
  return service;
}

// Create the default export
const Qonsent = {
  // Core service
  QonsentService,
  
  // Optional middleware
  qsocialMiddleware,
  
  // Initialize function
  init: initQonsent
};

export default Qonsent;
