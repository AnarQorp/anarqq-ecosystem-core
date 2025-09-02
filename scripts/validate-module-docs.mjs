#!/usr/bin/env node

/**
 * Module Documentation Validator
 * Validates that all required documentation files are present and complete
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

class ModuleDocsValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.modules = [];
  }

  async validate() {
    console.log('🔍 Validating module documentation...');
    
    await this.discoverModules();
    await this.validateModuleStructure();
    await this.validateDocumentationCompleteness();
    await this.validateIntegrationDocs();
    await this.validateRunbooks();
    
    this.reportResults();
  }

  async discoverModules() {
    const moduleNames = await fs.readdir('modules');
    
    for (const moduleName of moduleNames) {
      const modulePath = path.join('modules', moduleName);
      const stat = await fs.stat(modulePath);
      
      if (stat.isDirectory()) {
        this.modules.push({
          name: moduleName,
          path: modulePath,
          docsPath: path.join('docs/modules', moduleName)
        });
      }
    }
    
    console.log(`📋 Found ${this.modules.length} modules to validate`);
  }

  async validateModuleStructure() {
    console.log('📁 Validating module structure...');
    
    const requiredFiles = [
      'README.md',
      'api-reference.md',
      'mcp-tools.md',
      'deployment-guide.md',
      'integration-guide.md',
      'troubleshooting.md'
    ];

    for (const module of this.modules) {
      for (const file of requiredFiles) {
        const filePath = path.join(module.docsPath, file);
        
        if (!fsSync.existsSync(filePath)) {
          this.errors.push(`Missing documentation file: ${filePath}`);
        } else {
          // Check if file is not empty
          const stats = await fs.stat(filePath);
          if (stats.size < 100) {
            this.warnings.push(`Documentation file is very small: ${filePath}`);
          }
        }
      }
    }
  }

  async validateDocumentationCompleteness() {
    console.log('📝 Validating documentation completeness...');
    
    for (const module of this.modules) {
      await this.validateModuleReadme(module);
      await this.validateApiReference(module);
      await this.validateMcpTools(module);
    }
  }

  async validateModuleReadme(module) {
    const readmePath = path.join(module.docsPath, 'README.md');
    
    if (fsSync.existsSync(readmePath)) {
      const content = await fs.readFile(readmePath, 'utf8');
      
      const requiredSections = [
        'Quick Start',
        'Key Features',
        'Documentation'
      ];
      
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.warnings.push(`Module ${module.name} README missing section: ${section}`);
        }
      }
    }
  }

  async validateApiReference(module) {
    const apiRefPath = path.join(module.docsPath, 'api-reference.md');
    
    if (fsSync.existsSync(apiRefPath)) {
      const content = await fs.readFile(apiRefPath, 'utf8');
      
      const requiredSections = [
        'Authentication',
        'Standard Headers',
        'Standard Response Format',
        'Endpoints'
      ];
      
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.warnings.push(`Module ${module.name} API reference missing section: ${section}`);
        }
      }
    }
  }

  async validateMcpTools(module) {
    const mcpToolsPath = path.join(module.docsPath, 'mcp-tools.md');
    
    if (fsSync.existsSync(mcpToolsPath)) {
      const content = await fs.readFile(mcpToolsPath, 'utf8');
      
      const requiredSections = [
        'Connection',
        'Tools',
        'Error Handling'
      ];
      
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.warnings.push(`Module ${module.name} MCP tools missing section: ${section}`);
        }
      }
    }
  }

  async validateIntegrationDocs() {
    console.log('🔗 Validating integration documentation...');
    
    const integrationMatrixPath = 'docs/integration/integration-matrix.md';
    
    if (!fsSync.existsSync(integrationMatrixPath)) {
      this.errors.push('Missing integration matrix documentation');
    } else {
      const content = await fs.readFile(integrationMatrixPath, 'utf8');
      
      // Check that all modules are mentioned in the integration matrix
      for (const module of this.modules) {
        if (!content.includes(module.name)) {
          this.warnings.push(`Module ${module.name} not found in integration matrix`);
        }
      }
    }
  }

  async validateRunbooks() {
    console.log('📋 Validating operational runbooks...');
    
    const runbooksDir = 'docs/runbooks';
    
    if (!fsSync.existsSync(runbooksDir)) {
      this.errors.push('Missing runbooks directory');
      return;
    }

    // Check master runbook
    const masterRunbookPath = path.join(runbooksDir, 'README.md');
    if (!fsSync.existsSync(masterRunbookPath)) {
      this.errors.push('Missing master runbook');
    }

    // Check module-specific runbooks
    for (const module of this.modules) {
      const runbookPath = path.join(runbooksDir, `runbook-${module.name}.md`);
      
      if (!fsSync.existsSync(runbookPath)) {
        this.errors.push(`Missing runbook for module: ${module.name}`);
      } else {
        const content = await fs.readFile(runbookPath, 'utf8');
        
        const requiredSections = [
          'Health Checks',
          'Service Management',
          'Troubleshooting',
          'Monitoring'
        ];
        
        for (const section of requiredSections) {
          if (!content.includes(section)) {
            this.warnings.push(`Module ${module.name} runbook missing section: ${section}`);
          }
        }
      }
    }
  }

  reportResults() {
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All documentation validation checks passed!');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n📈 Summary:');
    console.log(`  Modules validated: ${this.modules.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n💡 Run `npm run docs:comprehensive` to regenerate documentation');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  try {
    const validator = new ModuleDocsValidator();
    await validator.validate();
  } catch (error) {
    console.error('❌ Documentation validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ModuleDocsValidator };