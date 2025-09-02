#!/usr/bin/env node

/**
 * Qflow CLI Entry Point
 * 
 * Command-line interface entry point for Qflow
 */

import { qflowCLI } from './QflowCLI.js';

// Run CLI with command line arguments
qflowCLI.run().catch((error) => {
  console.error('CLI execution failed:', error);
  process.exit(1);
});