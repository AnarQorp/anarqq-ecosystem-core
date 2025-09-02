#!/usr/bin/env node

/**
 * Qflow Migration CLI Executable
 * 
 * Command-line tool for migrating n8n workflows to Qflow
 */

import { MigrationCLI } from '../dist/migration/MigrationCLI.js';

// Create and run CLI
const cli = new MigrationCLI();
cli.run(process.argv).catch(error => {
  console.error('Migration CLI Error:', error.message);
  process.exit(1);
});