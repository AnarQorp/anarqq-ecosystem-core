#!/usr/bin/env node

/**
 * Qlock Server - Standalone Server Entry Point
 */

import { QlockModule } from './index.js';

async function startServer() {
  const qlock = new QlockModule();
  
  try {
    await qlock.start();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[Qlock] Received SIGTERM, shutting down gracefully...');
      await qlock.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('[Qlock] Received SIGINT, shutting down gracefully...');
      await qlock.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[Qlock] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();