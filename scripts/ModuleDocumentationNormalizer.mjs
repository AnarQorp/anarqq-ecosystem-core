#!/usr/bin/env node

/**
 * Module Documentation Normalizer
 * Normalizes format across all module documentation with consistent structure
 * and adds required metadata headers to all existing documentation files
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { 
  METADATA_SCHEMA, 
  STANDARD_DOCUMENT_TEMPLATE, 
  MODULE_DOCUMENT_TEMPLATE, 
  RUNBOOK_TEMPLATE,
  validateMetadata,
  createDefaultMetadata 
} from './metadata-schema.mjs';

export class ModuleDocumentationNormalizer {
  constructor() {
    this.processedFiles = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Normalize all documentation files in the ecosystem
   */
  async normalizeAllDocumentation() {
    console.log('🔧 Starting documentation normalization...');
    
    // Process global documentation
    await this.normalizeGlobalDocumentation();
    
    // Process module documentation
    await this.normalizeModuleDocumentation();
    
    // Process runbooks
    await this.normalizeRunbooks();
    
    // Generate summary report
    await this.generateNormalizationReport();
    
    console.log(`✅ Normalization completed. Processed ${this.processedFiles.length} files.`);
    
    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} errors found`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} warnings found`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }

  /**
   * Normalize global documentation files
   */
  async normalizeGlobalDocumentation() {
    console.log('📋 Normalizing global documentation...');
    
    const globalDocs = [
      'docs/README.md',
      'docs/INDEX.md',
      'docs/API-CHANGES.md',
      'docs/AUTOMATION.md',
      'docs/DEPLOYMENT.md',
      'docs/IPFS-INTEGRATION.md',
      'docs/STORJ-INTEGRATION.md'
    ];
    
    for (const docPath of globalDocs) {
      try {
        await this.normalizeDocument(docPath, {
          category: 'global',
          module: null,
          tags: ['global', 'ecosystem']
        });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.errors.push(`Failed to normalize ${docPath}: ${error.message}`);
        }
      }
    }
    
    // Process global subdirectories
    const globalDirs = ['docs/global', 'docs/integration', 'docs/deployment', 'docs/migration'];
    for (const dir of globalDirs) {
      await this.normalizeDirectory(dir, {
        category: 'global',
        module: null
      });
    }
  }

  /**
   * Normalize module documentation
   */
  async normalizeModuleDocumentation() {
    console.log('📦 Normalizing module documentation...');
    
    const modulesDir = 'docs/modules';
    
    try {
      const modules = await fs.readdir(modulesDir);
      
      for (const moduleName of modules) {
        if (moduleName === 'README.md') continue;
        
        const moduleDir = path.join(modulesDir, moduleName);
        const stat = await fs.stat(moduleDir);
        
        if (stat.isDirectory()) {
          await this.normalizeModuleDirectory(moduleDir, moduleName);
        }
      }
    } catch (error) {
      this.errors.push(`Failed to process modules directory: ${error.message}`);
    }
  }

  /**
   * Normalize a specific module directory
   */
  async normalizeModuleDirectory(moduleDir, moduleName) {
    console.log(`  📄 Processing module: ${moduleName}`);
    
    try {
      const files = await fs.readdir(moduleDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(moduleDir, file);
          
          // Determine category based on filename
          let category = 'module';
          let tags = [moduleName];
          
          if (file.includes('api')) {
            category = 'api';
            tags.push('api');
          } else if (file.includes('deployment')) {
            category = 'deployment';
            tags.push('deployment');
          } else if (file.includes('integration')) {
            category = 'integration';
            tags.push('integration');
          }
          
          await this.normalizeDocument(filePath, {
            category,
            module: moduleName,
            tags,
            relatedModules: await this.detectRelatedModules(filePath)
          });
        }
      }
    } catch (error) {
      this.errors.push(`Failed to process module ${moduleName}: ${error.message}`);
    }
  }

  /**
   * Normalize runbook documentation
   */
  async normalizeRunbooks() {
    console.log('📋 Normalizing runbooks...');
    
    const runbooksDir = 'docs/runbooks';
    
    try {
      const files = await fs.readdir(runbooksDir);
      
      for (const file of files) {
        if (file.endsWith('.md') && file.startsWith('runbook-')) {
          const filePath = path.join(runbooksDir, file);
          const moduleName = file.replace('runbook-', '').replace('.md', '');
          
          await this.normalizeDocument(filePath, {
            category: 'runbook',
            module: moduleName,
            tags: [moduleName, 'operations', 'runbook']
          });
        }
      }
    } catch (error) {
      this.errors.push(`Failed to process runbooks: ${error.message}`);
    }
  }

  /**
   * Normalize a directory recursively
   */
  async normalizeDirectory(dirPath, defaultMetadata = {}) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.normalizeDirectory(fullPath, defaultMetadata);
        } else if (entry.name.endsWith('.md')) {
          await this.normalizeDocument(fullPath, defaultMetadata);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.warnings.push(`Could not process directory ${dirPath}: ${error.message}`);
      }
    }
  }

  /**
   * Normalize a single document
   */
  async normalizeDocument(filePath, metadataOverrides = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const { metadata, body } = this.parseDocument(content);
      
      // Create or update metadata
      const updatedMetadata = this.updateMetadata(metadata, metadataOverrides, filePath);
      
      // Validate metadata
      const validationErrors = validateMetadata(updatedMetadata);
      if (validationErrors.length > 0) {
        this.errors.push(`Metadata validation failed for ${filePath}: ${validationErrors.join(', ')}`);
        return;
      }
      
      // Normalize document structure
      const normalizedBody = this.normalizeDocumentStructure(body, updatedMetadata);
      
      // Reconstruct document
      const normalizedContent = this.reconstructDocument(updatedMetadata, normalizedBody);
      
      // Write back to file
      await fs.writeFile(filePath, normalizedContent, 'utf8');
      
      this.processedFiles.push(filePath);
      console.log(`    ✅ Normalized: ${filePath}`);
      
    } catch (error) {
      this.errors.push(`Failed to normalize ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse document to extract metadata and body
   */
  parseDocument(content) {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (match) {
      try {
        const metadata = yaml.load(match[1]);
        const body = match[2];
        return { metadata, body };
      } catch (error) {
        this.warnings.push(`Failed to parse YAML front matter: ${error.message}`);
      }
    }
    
    // No front matter found
    return { metadata: {}, body: content };
  }

  /**
   * Update metadata with new values and defaults
   */
  updateMetadata(existingMetadata, overrides, filePath) {
    // Auto-detect module from file path
    const autoDetectedModule = this.detectModuleFromPath(filePath);
    const autoDetectedCategory = this.detectCategoryFromPath(filePath);
    
    const defaultMetadata = createDefaultMetadata({
      ...overrides,
      module: autoDetectedModule,
      category: autoDetectedCategory
    });
    
    // Merge existing metadata with defaults and overrides
    const updatedMetadata = {
      ...defaultMetadata,
      ...existingMetadata,
      ...overrides,
      module: autoDetectedModule, // Always use auto-detected module
      category: autoDetectedCategory, // Always use auto-detected category
      lastModified: new Date().toISOString() // Always update modification time
    };
    
    // If lastAudit is missing or old, update it
    if (!updatedMetadata.lastAudit || 
        new Date(updatedMetadata.lastAudit) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      updatedMetadata.lastAudit = new Date().toISOString();
    }
    
    return updatedMetadata;
  }

  /**
   * Detect module name from file path
   */
  detectModuleFromPath(filePath) {
    if (filePath.includes('docs/modules/')) {
      const moduleMatch = filePath.match(/docs\/modules\/([^\/]+)/);
      return moduleMatch ? moduleMatch[1] : null;
    }
    
    if (filePath.includes('docs/runbooks/runbook-')) {
      const runbookMatch = filePath.match(/runbook-([^\.]+)\.md/);
      return runbookMatch ? runbookMatch[1] : null;
    }
    
    return null;
  }

  /**
   * Detect category from file path
   */
  detectCategoryFromPath(filePath) {
    if (filePath.includes('docs/runbooks/')) {
      return 'runbook';
    }
    
    if (filePath.includes('docs/modules/')) {
      // Check filename patterns first, not directory names
      const fileName = path.basename(filePath);
      
      if (fileName.includes('api-reference') || fileName === 'api.md') {
        return 'api';
      }
      if (fileName.includes('deployment')) {
        return 'deployment';
      }
      if (fileName.includes('integration')) {
        return 'integration';
      }
      return 'module';
    }
    
    if (filePath.includes('docs/global/')) {
      return 'global';
    }
    
    if (filePath.startsWith('docs/') && !filePath.includes('docs/modules/') && !filePath.includes('docs/runbooks/')) {
      return 'global';
    }
    
    return 'global';
  }

  /**
   * Normalize document structure to follow standard template
   */
  normalizeDocumentStructure(body, metadata) {
    // Remove any existing front matter from body
    const cleanBody = body.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Check if document already has proper structure
    if (this.hasStandardStructure(cleanBody)) {
      return cleanBody;
    }
    
    // Extract title from first heading or generate one
    const titleMatch = cleanBody.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : this.generateTitle(metadata);
    
    // Generate table of contents based on existing headings
    const toc = this.generateTableOfContents(cleanBody);
    
    // Structure the document
    let structuredBody = `# ${title}\n\n`;
    
    if (toc.length > 0) {
      structuredBody += `## Table of Contents\n\n${toc}\n\n`;
    }
    
    // Add the rest of the content, ensuring it follows standard sections
    structuredBody += this.organizeContent(cleanBody, metadata);
    
    return structuredBody;
  }

  /**
   * Check if document already has standard structure
   */
  hasStandardStructure(content) {
    const requiredSections = ['## Table of Contents', '## Overview'];
    return requiredSections.every(section => content.includes(section));
  }

  /**
   * Generate title based on metadata
   */
  generateTitle(metadata) {
    if (metadata.module) {
      switch (metadata.category) {
        case 'runbook':
          return `${metadata.module} Operational Runbook`;
        case 'api':
          return `${metadata.module} API Reference`;
        case 'deployment':
          return `${metadata.module} Deployment Guide`;
        case 'integration':
          return `${metadata.module} Integration Guide`;
        default:
          return `${metadata.module} Documentation`;
      }
    }
    return 'Documentation';
  }

  /**
   * Generate table of contents from existing headings
   */
  generateTableOfContents(content) {
    const headings = content.match(/^##\s+(.+)$/gm) || [];
    
    return headings
      .filter(heading => !heading.includes('Table of Contents'))
      .map(heading => {
        const title = heading.replace(/^##\s+/, '');
        const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `- [${title}](#${anchor})`;
      })
      .join('\n');
  }

  /**
   * Organize content into standard sections
   */
  organizeContent(content, metadata) {
    // Remove title if it exists at the beginning
    const contentWithoutTitle = content.replace(/^#\s+.+\n\n?/, '');
    
    // If content is already well-structured, return as-is
    if (contentWithoutTitle.includes('## Overview')) {
      return contentWithoutTitle;
    }
    
    // Basic structure for different document types
    let organizedContent = '';
    
    switch (metadata.category) {
      case 'runbook':
        organizedContent = this.organizeRunbookContent(contentWithoutTitle, metadata);
        break;
      case 'api':
        organizedContent = this.organizeApiContent(contentWithoutTitle, metadata);
        break;
      case 'module':
        organizedContent = this.organizeModuleContent(contentWithoutTitle, metadata);
        break;
      default:
        organizedContent = this.organizeGenericContent(contentWithoutTitle, metadata);
    }
    
    return organizedContent;
  }

  /**
   * Organize runbook content
   */
  organizeRunbookContent(content, metadata) {
    return `## Module Overview

**Name**: ${metadata.module || 'Module Name'}
**Description**: ${this.extractDescription(content) || 'Module description'}
**Version**: 1.0.0

## Health Checks

### Endpoints
- **Basic Health**: \`GET /health\`
- **Detailed Health**: \`GET /health/detailed\`
- **Metrics**: \`GET /metrics\`

${content}

## Contact Information

- **Primary Contact**: ${metadata.module || 'module'}-team@q.network
- **On-Call**: Contact information
- **Escalation**: team-lead@q.network
`;
  }

  /**
   * Organize API content
   */
  organizeApiContent(content, metadata) {
    return `## Overview

API documentation for ${metadata.module || 'the module'}.

## Authentication

All endpoints require sQuid authentication.

## Endpoints

${content}

## Error Handling

Standard error responses follow the Q ecosystem format.

## Rate Limiting

Rate limiting is applied to all endpoints.
`;
  }

  /**
   * Organize module content
   */
  organizeModuleContent(content, metadata) {
    return `## Overview

${this.extractDescription(content) || `Documentation for the ${metadata.module} module.`}

## Architecture

Technical architecture and design patterns.

${content}

## Integration Patterns

How this module integrates with other Q ecosystem modules.
`;
  }

  /**
   * Organize generic content
   */
  organizeGenericContent(content, metadata) {
    const description = this.extractDescription(content);
    
    // If we extracted a description, remove it from the content to avoid duplication
    let cleanContent = content;
    if (description) {
      cleanContent = content.replace(description, '').trim();
    }
    
    return `## Overview

${description || 'Document overview.'}

${cleanContent}
`;
  }

  /**
   * Extract description from content
   */
  extractDescription(content) {
    // Look for first paragraph that's not a heading or empty line
    const lines = content.split('\n');
    let description = '';
    let foundFirstParagraph = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and headings
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        if (foundFirstParagraph) break; // Stop at first empty line after finding content
        continue;
      }
      
      // Skip markdown links and code blocks
      if (trimmedLine.startsWith('[') || trimmedLine.startsWith('```') || trimmedLine.startsWith('-')) {
        if (foundFirstParagraph) break;
        continue;
      }
      
      // This looks like a description line
      if (!foundFirstParagraph) {
        description = trimmedLine;
        foundFirstParagraph = true;
        break;
      }
    }
    
    return description || null;
  }

  /**
   * Detect related modules from document content
   */
  async detectRelatedModules(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const modules = ['dao', 'qchat', 'qdrive', 'qerberos', 'qindex', 'qlock', 'qmail', 'qmarket', 'qmask', 'qnet', 'qonsent', 'qpic', 'qwallet', 'squid'];
      
      const relatedModules = modules.filter(module => {
        const regex = new RegExp(`\\b${module}\\b`, 'gi');
        return regex.test(content);
      });
      
      return relatedModules;
    } catch (error) {
      return [];
    }
  }

  /**
   * Reconstruct document with metadata and body
   */
  reconstructDocument(metadata, body) {
    const yamlMetadata = yaml.dump(metadata, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    return `---\n${yamlMetadata}---\n\n${body}`;
  }

  /**
   * Generate normalization report
   */
  async generateNormalizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      processedFiles: this.processedFiles.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      files: this.processedFiles,
      errorDetails: this.errors,
      warningDetails: this.warnings,
      summary: {
        globalDocs: this.processedFiles.filter(f => f.includes('docs/') && !f.includes('docs/modules') && !f.includes('docs/runbooks')).length,
        moduleDocs: this.processedFiles.filter(f => f.includes('docs/modules')).length,
        runbooks: this.processedFiles.filter(f => f.includes('docs/runbooks')).length
      }
    };
    
    await fs.writeFile(
      'docs/normalization-report.json',
      JSON.stringify(report, null, 2)
    );
    
    const markdownReport = `# Documentation Normalization Report

**Generated**: ${report.timestamp}

## Summary

- **Files Processed**: ${report.processedFiles}
- **Errors**: ${report.errors}
- **Warnings**: ${report.warnings}

### Breakdown
- **Global Documentation**: ${report.summary.globalDocs} files
- **Module Documentation**: ${report.summary.moduleDocs} files
- **Runbooks**: ${report.summary.runbooks} files

## Processed Files

${this.processedFiles.map(file => `- ${file}`).join('\n')}

${this.errors.length > 0 ? `## Errors

${this.errors.map(error => `- ${error}`).join('\n')}` : ''}

${this.warnings.length > 0 ? `## Warnings

${this.warnings.map(warning => `- ${warning}`).join('\n')}` : ''}

---
*Generated by ModuleDocumentationNormalizer*
`;
    
    await fs.writeFile('docs/normalization-report.md', markdownReport);
  }

  /**
   * Add metadata to a specific document
   */
  async addMetadataToDocument(filePath, metadata) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const { metadata: existingMetadata, body } = this.parseDocument(content);
      
      const updatedMetadata = {
        ...createDefaultMetadata(),
        ...existingMetadata,
        ...metadata,
        lastModified: new Date().toISOString()
      };
      
      const validationErrors = validateMetadata(updatedMetadata);
      if (validationErrors.length > 0) {
        throw new Error(`Metadata validation failed: ${validationErrors.join(', ')}`);
      }
      
      const normalizedContent = this.reconstructDocument(updatedMetadata, body);
      await fs.writeFile(filePath, normalizedContent, 'utf8');
      
      console.log(`✅ Added metadata to: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to add metadata to ${filePath}: ${error.message}`);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const normalizer = new ModuleDocumentationNormalizer();
  
  const command = process.argv[2];
  const filePath = process.argv[3];
  
  switch (command) {
    case 'normalize':
      await normalizer.normalizeAllDocumentation();
      break;
    
    case 'file':
      if (!filePath) {
        console.error('Please provide a file path');
        process.exit(1);
      }
      await normalizer.normalizeDocument(filePath);
      break;
    
    case 'add-metadata':
      if (!filePath) {
        console.error('Please provide a file path');
        process.exit(1);
      }
      const metadata = JSON.parse(process.argv[4] || '{}');
      await normalizer.addMetadataToDocument(filePath, metadata);
      break;
    
    default:
      console.log(`
Usage: node ModuleDocumentationNormalizer.mjs <command> [options]

Commands:
  normalize              - Normalize all documentation files
  file <path>           - Normalize a specific file
  add-metadata <path> <json> - Add metadata to a specific file

Examples:
  node ModuleDocumentationNormalizer.mjs normalize
  node ModuleDocumentationNormalizer.mjs file docs/modules/qwallet/README.md
  node ModuleDocumentationNormalizer.mjs add-metadata docs/README.md '{"category":"global"}'
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Normalization failed:', error);
    process.exit(1);
  });
}

export default ModuleDocumentationNormalizer;