#!/usr/bin/env node

/**
 * Simple Documentation Validation Integration
 * Provides basic comprehensive validation functionality
 */

import SimpleValidationRunner from './simple-validation-runner.mjs';

class SimpleDocumentationValidationIntegration {
  constructor() {
    this.validator = new SimpleValidationRunner();
  }

  async runComprehensiveValidation() {
    console.log('🔍 Running comprehensive documentation validation...');
    
    try {
      const result = await this.validator.runBasicValidation();
      
      if (result) {
        console.log('✅ Comprehensive validation passed');
      } else {
        console.log('⚠️ Comprehensive validation completed with issues');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Comprehensive validation failed:', error.message);
      return false;
    }
  }
}

// CLI execution
async function main() {
  const integration = new SimpleDocumentationValidationIntegration();
  
  const command = process.argv[2] || 'comprehensive';
  
  try {
    let success = false;
    
    switch (command) {
      case 'comprehensive':
        success = await integration.runComprehensiveValidation();
        break;
      default:
        console.log('Available commands: comprehensive');
        success = true;
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Integration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export default SimpleDocumentationValidationIntegration;