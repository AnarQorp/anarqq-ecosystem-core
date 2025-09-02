#!/usr/bin/env node
/**
 * Qflow Server Entry Point
 * 
 * Standalone server entry point for running Qflow REST API server
 */

import { qflowServer } from './api/QflowServer.js';
import { initializeQflow, shutdownQflow } from './index.js';

/**
 * Main server startup function
 */
async function main(): Promise<void> {
  try {
    console.log('[Qflow] 🚀 Starting Qflow Server...');

    // Initialize Qflow core components
    await initializeQflow();

    // Start the REST API server
    await qflowServer.start();

    console.log('[Qflow] ✅ Qflow Server is running successfully!');
    console.log('[Qflow] 📚 API Documentation: http://localhost:8080/api/v1/docs');
    console.log('[Qflow] 🏥 Health Check: http://localhost:8080/health');
    console.log('[Qflow] 📊 Real-time Dashboard: http://localhost:8080/dashboard');
    console.log('[Qflow] 🎨 Visual Designer: http://localhost:8080/designer');
    console.log('[Qflow] 🔌 WebSocket Dashboard: ws://localhost:9090');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[Qflow] 🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop the server
        await qflowServer.stop();
        
        // Shutdown Qflow components
        await shutdownQflow();
        
        console.log('[Qflow] ✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('[Qflow] ❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[Qflow] ❌ Uncaught Exception:', error);
      shutdown('uncaughtException').catch(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Qflow] ❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection').catch(() => process.exit(1));
    });

  } catch (error) {
    console.error('[Qflow] ❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const config: any = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  
  switch (key) {
    case '--port':
    case '-p':
      config.port = parseInt(value) || 8080;
      break;
    case '--host':
    case '-h':
      config.host = value || '0.0.0.0';
      break;
    case '--help':
      console.log(`
Qflow Server - Serverless Automation Engine

Usage: node server.js [options]

Options:
  -p, --port <port>     Server port (default: 8080)
  -h, --host <host>     Server host (default: 0.0.0.0)
  --help               Show this help message

Environment Variables:
  QFLOW_PORT           Server port
  QFLOW_HOST           Server host
  NODE_ENV             Environment (development, production)

Examples:
  node server.js --port 3000 --host localhost
  QFLOW_PORT=3000 node server.js
      `);
      process.exit(0);
      break;
  }
}

// Apply environment variables
if (process.env.QFLOW_PORT) {
  config.port = parseInt(process.env.QFLOW_PORT) || 8080;
}
if (process.env.QFLOW_HOST) {
  config.host = process.env.QFLOW_HOST;
}

// Update server configuration if provided
if (Object.keys(config).length > 0) {
  Object.assign(qflowServer.getConfig(), config);
}

// Start the server
main().catch((error) => {
  console.error('[Qflow] ❌ Server startup failed:', error);
  process.exit(1);
});