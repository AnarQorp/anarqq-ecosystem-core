#!/usr/bin/env node

/**
 * Master Documentation Index Automation
 * Integrates with Task 37 documentation automation to maintain the master index
 * Provides completeness checks, link validation, role coverage, and migration sync
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentationAutomation from './docs-automation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MasterIndexAutomation {
  constructor() {
    this.docAutomation = new DocumentationAutomation();
    this.indexPath = 'docs/INDEX.md';
    this.migrationDocsPath = 'docs/migration';
    this.validationResults = {
      completeness: { passed: true, errors: [] },
      linkValidation: { passed: true, errors: [] },
      roleCoverage: { passed: true, errors: [] },
      migrationSync: { passed: true, errors: [] }
    };
    
    // Required documentation types for each module
    this.requiredDocTypes = [
      'README.md',
      'api-reference.md',
      'mcp-tools.md',
      'deployment-guide.md',
      'integration-guide.md',
      'examples.md',
      'runbook.md',
      'troubleshooting.md'
    ];
    
    // Required role entry points
    this.requiredRoles = {
      developers: [
        'Module API references and examples',
        'Integration guides and patterns',
        'Code samples and tutorials',
        'MCP tools documentation'
      ],
      devops: [
        'Deployment guides and matrices',
        'Operational runbooks',
        'Monitoring and troubleshooting',
        'Disaster recovery procedures'
      ],
      architects: [
        'System architecture documentation',
        'Integration matrices and patterns',
        'Migration strategies and planning',
        'Technology integration guides'
      ],
      productManagers: [
        'Feature documentation and capabilities',
        'Migration timelines and planning',
        'User guides and FAQ sections',
        'Business impact assessments'
      ]
    };
  }

  async init() {
    await this.docAutomation.init();
  }

  /**
   * Run all validation checks on the master index
   */
  async validateMasterIndex() {
    console.log('🔍 Running master index validation...');
    
    await this.runCompletenessCheck();
    await this.runLinkValidation();
    await this.runRoleCoverageCheck();
    await this.runMigrationSyncCheck();
    
    return this.generateValidationReport();
  }

  /**
   * Completeness Check - verify every module has all required doc types
   */
  async runCompletenessCheck() {
    console.log('📋 Running completeness check...');
    
    const modules = await this.getModuleList();
    
    for (const module of modules) {
      const moduleDocsPath = path.join('docs/modules', module);
      
      for (const docType of this.requiredDocTypes) {
        const docPath = path.join(moduleDocsPath, docType);
        
        try {
          await fs.access(docPath);
        } catch (error) {
          this.validationResults.completeness.passed = false;
          this.validationResults.completeness.errors.push({
            module,
            docType,
            error: `Missing required document: ${docPath}`
          });
        }
      }
      
      // Check if module is referenced in the index
      const indexContent = await fs.readFile(this.indexPath, 'utf8');
      if (!indexContent.includes(module)) {
        this.validationResults.completeness.passed = false;
        this.validationResults.completeness.errors.push({
          module,
          error: `Module ${module} not referenced in master index`
        });
      }
    }
    
    console.log(`  ✅ Checked ${modules.length} modules for completeness`);
  }

  /**
   * Link Validation - check for dead or outdated references
   */
  async runLinkValidation() {
    console.log('🔗 Running link validation...');
    
    const indexContent = await fs.readFile(this.indexPath, 'utf8');
    const links = this.extractLinks(indexContent);
    
    for (const link of links) {
      if (link.startsWith('http')) {
        // Skip external links for now - could add HTTP checks later
        continue;
      }
      
      // Check internal links
      const linkPath = path.resolve('docs', link);
      
      try {
        await fs.access(linkPath);
      } catch (error) {
        this.validationResults.linkValidation.passed = false;
        this.validationResults.linkValidation.errors.push({
          link,
          error: `Broken internal link: ${linkPath}`
        });
      }
    }
    
    // Check for outdated references
    await this.checkOutdatedReferences(indexContent);
    
    console.log(`  ✅ Validated ${links.length} links`);
  }

  /**
   * Role Coverage Scan - ensure dev, ops, and PM entry points are present
   */
  async runRoleCoverageCheck() {
    console.log('👥 Running role coverage check...');
    
    const indexContent = await fs.readFile(this.indexPath, 'utf8');
    
    for (const [role, requirements] of Object.entries(this.requiredRoles)) {
      for (const requirement of requirements) {
        if (!this.checkRequirementCoverage(indexContent, requirement)) {
          this.validationResults.roleCoverage.passed = false;
          this.validationResults.roleCoverage.errors.push({
            role,
            requirement,
            error: `Missing ${role} entry point: ${requirement}`
          });
        }
      }
    }
    
    console.log('  ✅ Validated role coverage for all user types');
  }

  /**
   * Migration Sync Check - ensure Task 38 migration docs stay in sync
   */
  async runMigrationSyncCheck() {
    console.log('🔄 Running migration sync check...');
    
    const indexContent = await fs.readFile(this.indexPath, 'utf8');
    const migrationDocs = await this.getMigrationDocuments();
    
    // Check that all migration docs are referenced in the index
    for (const migrationDoc of migrationDocs) {
      const relativePath = path.relative('docs', migrationDoc);
      
      if (!indexContent.includes(relativePath)) {
        this.validationResults.migrationSync.passed = false;
        this.validationResults.migrationSync.errors.push({
          document: relativePath,
          error: `Migration document not referenced in index: ${relativePath}`
        });
      }
    }
    
    // Check for migration-specific sections
    const requiredMigrationSections = [
      'Migration & Transition',
      'Legacy to Modular Migration Guide',
      'Deprecation Plan',
      'Migration Dashboard',
      'Lessons Learned'
    ];
    
    for (const section of requiredMigrationSections) {
      if (!indexContent.includes(section)) {
        this.validationResults.migrationSync.passed = false;
        this.validationResults.migrationSync.errors.push({
          section,
          error: `Missing required migration section: ${section}`
        });
      }
    }
    
    console.log(`  ✅ Validated ${migrationDocs.length} migration documents`);
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    const allPassed = Object.values(this.validationResults).every(result => result.passed);
    const totalErrors = Object.values(this.validationResults)
      .reduce((sum, result) => sum + result.errors.length, 0);
    
    const report = {
      passed: allPassed,
      totalErrors,
      timestamp: new Date().toISOString(),
      results: this.validationResults,
      summary: {
        completeness: this.validationResults.completeness.passed ? 'PASS' : 'FAIL',
        linkValidation: this.validationResults.linkValidation.passed ? 'PASS' : 'FAIL',
        roleCoverage: this.validationResults.roleCoverage.passed ? 'PASS' : 'FAIL',
        migrationSync: this.validationResults.migrationSync.passed ? 'PASS' : 'FAIL'
      }
    };
    
    console.log('\n📊 Validation Report:');
    console.log(`  Overall Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log(`  Completeness Check: ${report.summary.completeness}`);
    console.log(`  Link Validation: ${report.summary.linkValidation}`);
    console.log(`  Role Coverage: ${report.summary.roleCoverage}`);
    console.log(`  Migration Sync: ${report.summary.migrationSync}`);
    
    if (!allPassed) {
      console.log('\n❌ Validation Errors:');
      for (const [checkType, result] of Object.entries(this.validationResults)) {
        if (!result.passed) {
          console.log(`\n  ${checkType.toUpperCase()}:`);
          result.errors.forEach(error => {
            console.log(`    - ${error.error}`);
          });
        }
      }
    }
    
    return report;
  }

  /**
   * Update the master index with current module information
   */
  async updateMasterIndex() {
    console.log('📝 Updating master index...');
    
    const modules = await this.getModuleList();
    const migrationDocs = await this.getMigrationDocuments();
    
    // Generate updated index content
    const updatedContent = await this.generateIndexContent(modules, migrationDocs);
    
    // Write updated index
    await fs.writeFile(this.indexPath, updatedContent);
    
    console.log('  ✅ Master index updated successfully');
  }

  /**
   * Generate the complete index content
   */
  async generateIndexContent(modules, migrationDocs) {
    const timestamp = new Date().toISOString();
    
    return `# Q Ecosystem Documentation Index

Welcome to the comprehensive documentation for the Q Ecosystem. This index provides organized access to all documentation across the modular architecture, migration guides, APIs, deployment procedures, and operational runbooks.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Module Documentation](#module-documentation)
- [API Documentation](#api-documentation)
- [Migration & Transition](#migration--transition)
- [Deployment & Operations](#deployment--operations)
- [Integration Guides](#integration-guides)
- [Troubleshooting & Support](#troubleshooting--support)
- [Development Resources](#development-resources)

---

## 🚀 Quick Start

### Essential Reading
- [**Main README**](README.md) - Project overview and getting started
- [**Architecture Overview**](DAO-DASHBOARD-ARCHITECTURE.md) - System architecture and design principles
- [**Deployment Guide**](DEPLOYMENT.md) - Basic deployment instructions

### For Developers
- [**Module Registry Getting Started**](api/module-registry/getting-started.md) - Start building with Q modules
- [**API Explorer**](api/module-registry/api-explorer.html) - Interactive API documentation
- [**Integration Matrix**](integration/integration-matrix.md) - Module compatibility and integration patterns

### For Operators
- [**Production Deployment Runbook**](production-deployment-runbook.md) - Production deployment procedures
- [**Disaster Recovery Procedures**](disaster-recovery-procedures.md) - Emergency response and recovery
- [**Deployment Matrix**](deployment/deployment-matrix.md) - Environment-specific deployment configurations

---

## 🏗️ Architecture Overview

### Core Architecture Documents
- [**DAO Dashboard Architecture**](DAO-DASHBOARD-ARCHITECTURE.md) - Comprehensive system architecture
- [**Module Registry Overview**](api/module-registry/README.md) - Module discovery and registration system
- [**Integration Matrix**](integration/integration-matrix.md) - Inter-module communication patterns

### Technology Integration
- [**IPFS Integration**](IPFS-INTEGRATION.md) - Distributed storage implementation
- [**IPFS Integration Guide**](ipfs-integration.md) - Detailed IPFS setup and usage
- [**STORJ Integration**](STORJ-INTEGRATION.md) - Decentralized cloud storage integration

---

## 🧩 Module Documentation

${await this.generateModuleDocumentationSection(modules)}

---

## 🔌 API Documentation

### Module Registry API
- [**API Overview**](api/module-registry/README.md) - Module registry system
- [**Getting Started**](api/module-registry/getting-started.md) - Quick start guide
- [**Discovery API**](api/module-registry/discovery-api.md) - Module discovery endpoints
- [**Registration API**](api/module-registry/registration-api.md) - Module registration endpoints
- [**API Explorer**](api/module-registry/api-explorer.html) - Interactive API documentation
- [**Examples**](api/module-registry/examples/) - Code examples and samples
- [**FAQ**](api/module-registry/faq.md) - Frequently asked questions
- [**Troubleshooting**](api/module-registry/troubleshooting.md) - API troubleshooting

### API Changes & Versioning
- [**API Changes**](API-CHANGES.md) - Breaking changes and migration notes

---

## 🔄 Migration & Transition

${await this.generateMigrationSection(migrationDocs)}

---

## 🚀 Deployment & Operations

### Deployment Guides
- [**Main Deployment Guide**](DEPLOYMENT.md) - General deployment procedures
- [**Production Deployment Runbook**](production-deployment-runbook.md) - Production-specific procedures
- [**Deployment Matrix**](deployment/deployment-matrix.md) - Environment configurations

### Operational Runbooks
- [**Runbooks Overview**](runbooks/README.md) - Operational procedures index
${modules.map(module => `- [**${module} Runbook**](runbooks/runbook-${module}.md) - ${module} operations`).join('\n')}

### Disaster Recovery
- [**Disaster Recovery Procedures**](disaster-recovery-procedures.md) - Emergency response and recovery

---

## 🔗 Integration Guides

### System Integration
- [**Integration Matrix**](integration/integration-matrix.md) - Module compatibility and patterns
- [**QSocial Complete Integration**](QSOCIAL-COMPLETE-INTEGRATION.md) - Social platform integration
- [**QSocial Ecosystem Integration**](QSOCIAL-ECOSYSTEM-INTEGRATION.md) - Ecosystem-wide social features

### Specialized Integrations
- [**Qwallet Identity Expansion**](qwallet-identity-expansion/README.md) - Advanced identity integration
  - [**Components**](qwallet-identity-expansion/components/README.md) - UI components
  - [**Integration Overview**](qwallet-identity-expansion/integration/overview.md) - Integration patterns
  - [**Advanced Patterns**](qwallet-identity-expansion/integration/advanced-patterns.md) - Complex integrations
  - [**User Guides**](qwallet-identity-expansion/user-guides/README.md) - End-user documentation
  - [**Root Identity Guide**](qwallet-identity-expansion/user-guides/root-identity.md) - Root identity management
  - [**Examples**](qwallet-identity-expansion/examples/README.md) - Code examples
  - [**FAQ**](qwallet-identity-expansion/faq.md) - Common questions
  - [**Troubleshooting**](qwallet-identity-expansion/troubleshooting.md) - Issue resolution

---

## 🛠️ Troubleshooting & Support

### Module-Specific Troubleshooting
${modules.map(module => `- [**${module} Troubleshooting**](modules/${module}/troubleshooting.md) - ${module} issues`).join('\n')}

### General Support
- [**API Registry Troubleshooting**](api/module-registry/troubleshooting.md) - API and registry issues
- [**Qwallet Identity Expansion Troubleshooting**](qwallet-identity-expansion/troubleshooting.md) - Identity expansion issues

---

## 💻 Development Resources

### Code Examples
- [**Module Examples**](modules/) - Each module includes comprehensive examples
- [**API Registry Examples**](api/module-registry/examples/) - Registry integration examples
- [**Qwallet Identity Examples**](qwallet-identity-expansion/examples/) - Identity expansion examples

### Development Tools
- [**Module Registry API Explorer**](api/module-registry/api-explorer.html) - Interactive API testing
- [**Migration Dashboard**](migration/migration-dashboard.html) - Migration progress tracking

### Best Practices
- [**Migration Lessons Learned**](migration/lessons-learned.md) - Migration best practices
- [**Integration Patterns**](integration/integration-matrix.md) - Recommended integration approaches

---

## 📚 Documentation Categories

### By Audience

#### **For Developers**
- Module API references and examples
- Integration guides and patterns
- Code samples and tutorials
- MCP tools documentation

#### **For DevOps/SRE**
- Deployment guides and matrices
- Operational runbooks
- Monitoring and troubleshooting
- Disaster recovery procedures

#### **For Architects**
- System architecture documentation
- Integration matrices and patterns
- Migration strategies and planning
- Technology integration guides

#### **For Product Managers**
- Feature documentation and capabilities
- Migration timelines and planning
- User guides and FAQ sections
- Business impact assessments

### By Module Type

#### **Foundation Services**
- sQuid (Identity), Qlock (Encryption), Qonsent (Permissions), Qindex (Search)

#### **Core Business Services**
- Qwallet (Payments), Qerberos (Security), Qmask (Privacy)

#### **Content & Storage**
- Qdrive (Files), QpiC (Media), Qmarket (Marketplace)

#### **Communication**
- Qmail (Messaging), Qchat (Chat)

#### **Infrastructure**
- QNET (Network), DAO (Governance)

---

## 🔍 Quick Reference

### Common Tasks
- **Deploy a module**: See individual module deployment guides
- **Integrate modules**: Check the [Integration Matrix](integration/integration-matrix.md)
- **Troubleshoot issues**: Start with module-specific troubleshooting guides
- **Migrate from legacy**: Follow the [Migration Guide](migration/legacy-to-modular-migration-guide.md)
- **Use APIs**: Explore the [API Registry](api/module-registry/api-explorer.html)

### Emergency Procedures
- **System outage**: [Disaster Recovery Procedures](disaster-recovery-procedures.md)
- **Security incident**: [Qerberos Runbook](runbooks/runbook-qerberos.md)
- **Data corruption**: [Backup and Recovery procedures in relevant module runbooks]
- **Migration rollback**: [Migration Guide rollback procedures](migration/legacy-to-modular-migration-guide.md)

---

## 📝 Documentation Standards

All documentation in this ecosystem follows consistent standards:

- **Structure**: Each module follows the same documentation structure
- **Completeness**: API references, deployment guides, examples, and troubleshooting
- **Maintenance**: Documentation is updated with each release
- **Accessibility**: Clear navigation and comprehensive indexing

---

## 🤝 Contributing

To contribute to this documentation:

1. Follow the established structure for new modules
2. Update the index when adding new documentation
3. Ensure all links are functional and up-to-date
4. Include examples and troubleshooting information
5. Test all procedures and code samples

---

*Last updated: ${timestamp}*
*Documentation version: 1.0*
*Auto-generated by master-index-automation.mjs*`;
  }

  /**
   * Generate the module documentation section
   */
  async generateModuleDocumentationSection(modules) {
    const modulesByCategory = {
      foundation: ['squid', 'qlock', 'qonsent', 'qindex'],
      core: ['qwallet', 'qerberos', 'qmask'],
      storage: ['qdrive', 'qpic', 'qmarket'],
      communication: ['qmail', 'qchat'],
      infrastructure: ['qnet', 'dao']
    };

    let content = '';

    for (const [category, categoryModules] of Object.entries(modulesByCategory)) {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      content += `### ${categoryTitle} Modules\n\n`;

      for (const module of categoryModules) {
        if (modules.includes(module)) {
          content += `#### ${module} (${this.getModuleDisplayName(module)})\n`;
          content += `- [**Overview**](modules/${module}/README.md) - ${module} service overview\n`;
          content += `- [**API Reference**](modules/${module}/api-reference.md) - Complete API documentation\n`;
          content += `- [**MCP Tools**](modules/${module}/mcp-tools.md) - Model Context Protocol integration\n`;
          content += `- [**Deployment Guide**](modules/${module}/deployment-guide.md) - Deployment instructions\n`;
          content += `- [**Integration Guide**](modules/${module}/integration-guide.md) - Integration patterns\n`;
          content += `- [**Examples**](modules/${module}/examples.md) - Code examples and use cases\n`;
          content += `- [**Runbook**](modules/${module}/runbook.md) - Operational procedures\n`;
          content += `- [**Troubleshooting**](modules/${module}/troubleshooting.md) - Common issues and solutions\n\n`;
        }
      }
    }

    return content;
  }

  /**
   * Generate the migration section
   */
  async generateMigrationSection(migrationDocs) {
    let content = `### Migration Planning
- [**Legacy to Modular Migration Guide**](migration/legacy-to-modular-migration-guide.md) - Comprehensive migration strategy
- [**Deprecation Plan**](migration/deprecation-plan.md) - Phased deprecation timeline
- [**Lessons Learned**](migration/lessons-learned.md) - Migration insights and best practices
- [**Migration Dashboard**](migration/migration-dashboard.html) - Real-time migration tracking

### Module-Specific Migration
- [**sQuid Migration Guide**](migration/module-specific/squid-migration-guide.md) - Identity service migration
- [**Qwallet Migration Guide**](migration/module-specific/qwallet-migration-guide.md) - Payment service migration`;

    return content;
  }

  /**
   * Helper methods
   */
  async getModuleList() {
    try {
      const modulesDir = 'docs/modules';
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && entry.name !== 'README.md')
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      console.warn('Could not read modules directory:', error.message);
      return [];
    }
  }

  async getMigrationDocuments() {
    try {
      const migrationDocs = [];
      const migrationDir = this.migrationDocsPath;
      
      const addDocsRecursively = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await addDocsRecursively(fullPath);
          } else if (entry.name.endsWith('.md') || entry.name.endsWith('.html')) {
            migrationDocs.push(fullPath);
          }
        }
      };
      
      await addDocsRecursively(migrationDir);
      return migrationDocs;
    } catch (error) {
      console.warn('Could not read migration documents:', error.message);
      return [];
    }
  }

  extractLinks(content) {
    const linkRegex = /\[.*?\]\((.*?)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    
    return links;
  }

  async checkOutdatedReferences(indexContent) {
    // Check for references to deprecated or moved files
    const deprecatedPaths = [
      'docs/old-api.md',
      'docs/legacy-deployment.md',
      'modules/deprecated-module/'
    ];
    
    for (const deprecatedPath of deprecatedPaths) {
      if (indexContent.includes(deprecatedPath)) {
        this.validationResults.linkValidation.passed = false;
        this.validationResults.linkValidation.errors.push({
          link: deprecatedPath,
          error: `Reference to deprecated path: ${deprecatedPath}`
        });
      }
    }
  }

  checkRequirementCoverage(indexContent, requirement) {
    // Simple keyword-based check - could be enhanced with more sophisticated matching
    const keywords = requirement.toLowerCase().split(' ');
    return keywords.some(keyword => indexContent.toLowerCase().includes(keyword));
  }

  getModuleDisplayName(module) {
    const displayNames = {
      squid: 'Identity Management',
      qlock: 'Encryption & Key Management',
      qonsent: 'Permissions & Authorization',
      qindex: 'Search & Indexing',
      qwallet: 'Payment Processing',
      qerberos: 'Security & Audit',
      qmask: 'Privacy & Data Protection',
      qdrive: 'File Storage',
      qpic: 'Media Management',
      qmarket: 'Marketplace',
      qmail: 'Messaging',
      qchat: 'Instant Messaging',
      qnet: 'Network Infrastructure',
      dao: 'Governance'
    };
    
    return displayNames[module] || module;
  }

  /**
   * Generate CI/CD integration script
   */
  async generateCIIntegration() {
    const ciScript = `#!/bin/bash
# CI/CD Integration Script for Master Index Validation
# This script should be run on every PR to validate the documentation index

set -e

echo "🔍 Running master index validation..."

# Run the validation
node scripts/master-index-automation.mjs validate

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Master index validation passed"
    exit 0
else
    echo "❌ Master index validation failed"
    echo "Please fix the validation errors before merging"
    exit 1
fi
`;

    await fs.writeFile('scripts/ci-index-validation.sh', ciScript);
    
    // Make it executable
    await fs.chmod('scripts/ci-index-validation.sh', 0o755);
    
    console.log('  ✅ Generated CI integration script');
  }

  /**
   * Generate GitHub Actions workflow
   */
  async generateGitHubWorkflow() {
    const workflow = `name: Documentation Index Validation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'modules/**'
      - 'scripts/**'
  push:
    branches: [main]

jobs:
  validate-index:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run completeness check
      run: node scripts/master-index-automation.mjs completeness
    
    - name: Run link validation
      run: node scripts/master-index-automation.mjs links
    
    - name: Run role coverage scan
      run: node scripts/master-index-automation.mjs roles
    
    - name: Run migration sync check
      run: node scripts/master-index-automation.mjs migration
    
    - name: Generate validation report
      run: node scripts/master-index-automation.mjs report
      
    - name: Upload validation report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: index-validation-report
        path: docs/index-validation-report.json
`;

    const workflowDir = '.github/workflows';
    await fs.mkdir(workflowDir, { recursive: true });
    await fs.writeFile(path.join(workflowDir, 'index-validation.yml'), workflow);
    
    console.log('  ✅ Generated GitHub Actions workflow');
  }
}

// CLI interface
async function main() {
  const automation = new MasterIndexAutomation();
  await automation.init();

  const command = process.argv[2];

  switch (command) {
    case 'validate':
      const report = await automation.validateMasterIndex();
      process.exit(report.passed ? 0 : 1);
      break;
    
    case 'completeness':
      await automation.runCompletenessCheck();
      console.log(automation.validationResults.completeness.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(automation.validationResults.completeness.passed ? 0 : 1);
      break;
    
    case 'links':
      await automation.runLinkValidation();
      console.log(automation.validationResults.linkValidation.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(automation.validationResults.linkValidation.passed ? 0 : 1);
      break;
    
    case 'roles':
      await automation.runRoleCoverageCheck();
      console.log(automation.validationResults.roleCoverage.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(automation.validationResults.roleCoverage.passed ? 0 : 1);
      break;
    
    case 'migration':
      await automation.runMigrationSyncCheck();
      console.log(automation.validationResults.migrationSync.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(automation.validationResults.migrationSync.passed ? 0 : 1);
      break;
    
    case 'update':
      await automation.updateMasterIndex();
      break;
    
    case 'report':
      const validationReport = await automation.validateMasterIndex();
      await fs.writeFile('docs/index-validation-report.json', JSON.stringify(validationReport, null, 2));
      console.log('📊 Validation report saved to docs/index-validation-report.json');
      break;
    
    case 'ci-setup':
      await automation.generateCIIntegration();
      await automation.generateGitHubWorkflow();
      console.log('🔧 CI/CD integration files generated');
      break;
    
    default:
      console.log(`
Usage: node master-index-automation.mjs <command>

Commands:
  validate      - Run all validation checks
  completeness  - Check module documentation completeness
  links         - Validate all links in the index
  roles         - Check role coverage (dev, ops, PM entry points)
  migration     - Check migration docs sync with index
  update        - Update the master index with current information
  report        - Generate detailed validation report
  ci-setup      - Generate CI/CD integration files

Examples:
  node master-index-automation.mjs validate
  node master-index-automation.mjs completeness
  node master-index-automation.mjs update
  node master-index-automation.mjs ci-setup
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Master index automation failed:', error);
    process.exit(1);
  });
}

export default MasterIndexAutomation;