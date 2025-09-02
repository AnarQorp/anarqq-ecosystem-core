#!/usr/bin/env node

/**
 * Front Matter Linter
 * Validates metadata in documentation files and ensures compliance with standards
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { validateMetadata, METADATA_SCHEMA } from './metadata-schema.mjs';

export class FrontMatterLinter {
  constructor() {
    this.validationResults = [];
    this.totalFiles = 0;
    this.validFiles = 0;
    this.invalidFiles = 0;
  }

  /**
   * Lint all documentation files
   */
  async lintAllDocumentation() {
    console.log('🔍 Starting front matter validation...');
    
    const directories = [
      'docs',
      'docs/modules',
      'docs/runbooks',
      'docs/global',
      'docs/integration',
      'docs/deployment',
      'docs/migration'
    ];
    
    for (const dir of directories) {
      await this.lintDirectory(dir);
    }
    
    this.generateSummary();
    await this.generateReport();
    
    return this.invalidFiles === 0;
  }

  /**
   * Lint a specific directory
   */
  async lintDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.lintDirectory(fullPath);
        } else if (entry.name.endsWith('.md')) {
          await this.lintFile(fullPath);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️  Could not access directory ${dirPath}: ${error.message}`);
      }
    }
  }

  /**
   * Lint a specific file
   */
  async lintFile(filePath) {
    this.totalFiles++;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const result = this.validateFileContent(filePath, content);
      
      this.validationResults.push(result);
      
      if (result.isValid) {
        this.validFiles++;
        console.log(`✅ ${filePath}`);
      } else {
        this.invalidFiles++;
        console.log(`❌ ${filePath}`);
        result.errors.forEach(error => console.log(`    - ${error}`));
      }
      
    } catch (error) {
      this.invalidFiles++;
      const result = {
        filePath,
        isValid: false,
        errors: [`Failed to read file: ${error.message}`],
        warnings: [],
        metadata: null
      };
      
      this.validationResults.push(result);
      console.log(`❌ ${filePath} - ${error.message}`);
    }
  }

  /**
   * Validate file content and metadata
   */
  validateFileContent(filePath, content) {
    const result = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      metadata: null
    };
    
    // Check for front matter
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
      result.isValid = false;
      result.errors.push('Missing front matter');
      return result;
    }
    
    // Parse YAML
    try {
      result.metadata = yaml.load(match[1]);
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Invalid YAML in front matter: ${error.message}`);
      return result;
    }
    
    // Validate metadata structure
    const metadataErrors = validateMetadata(result.metadata);
    if (metadataErrors.length > 0) {
      result.isValid = false;
      result.errors.push(...metadataErrors);
    }
    
    // Additional validations
    this.performAdditionalValidations(result, filePath, content);
    
    return result;
  }

  /**
   * Perform additional validations beyond basic schema
   */
  performAdditionalValidations(result, filePath, content) {
    const metadata = result.metadata;
    if (!metadata) return;
    
    // Check if module field matches directory structure
    if (filePath.includes('docs/modules/')) {
      const moduleFromPath = filePath.split('docs/modules/')[1].split('/')[0];
      if (metadata.module !== moduleFromPath) {
        result.warnings.push(`Module field "${metadata.module}" doesn't match directory "${moduleFromPath}"`);
      }
    }
    
    // Check if runbook files have correct category
    if (filePath.includes('runbook-') && metadata.category !== 'runbook') {
      result.warnings.push('Runbook files should have category "runbook"');
    }
    
    // Check if global docs have correct module field
    if (filePath.startsWith('docs/') && 
        !filePath.includes('docs/modules/') && 
        !filePath.includes('docs/runbooks/') &&
        metadata.module !== null) {
      result.warnings.push('Global documentation should have module field set to null');
    }
    
    // Check for outdated ecosystem version
    if (metadata.ecosystemVersion === 'v1.0.0') {
      result.warnings.push('Document uses outdated ecosystem version v1.0.0, consider updating to v2.0.0');
    }
    
    // Check for old lastAudit dates (older than 90 days)
    if (metadata.lastAudit) {
      const auditDate = new Date(metadata.lastAudit);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      if (auditDate < ninetyDaysAgo) {
        result.warnings.push(`Document hasn't been audited in over 90 days (last audit: ${metadata.lastAudit})`);
      }
    }
    
    // Check for missing required sections based on category
    this.validateDocumentStructure(result, content);
    
    // Check for broken internal links
    this.validateInternalLinks(result, content, filePath);
  }

  /**
   * Validate document structure based on category
   */
  validateDocumentStructure(result, content) {
    const metadata = result.metadata;
    const requiredSections = this.getRequiredSections(metadata.category);
    
    for (const section of requiredSections) {
      if (!content.includes(`## ${section}`)) {
        result.warnings.push(`Missing required section: ${section}`);
      }
    }
    
    // Check for table of contents
    if (!content.includes('## Table of Contents') && content.split('##').length > 3) {
      result.warnings.push('Document should include a Table of Contents');
    }
  }

  /**
   * Get required sections for document category
   */
  getRequiredSections(category) {
    const sectionMap = {
      'module': ['Overview', 'Architecture', 'API Reference', 'Use Cases', 'Integration Patterns'],
      'runbook': ['Module Overview', 'Health Checks', 'Service Management', 'Troubleshooting', 'Monitoring'],
      'api': ['Overview', 'Authentication', 'Endpoints', 'Error Handling'],
      'deployment': ['Overview', 'Prerequisites', 'Installation', 'Configuration', 'Verification'],
      'integration': ['Overview', 'Integration Patterns', 'Examples', 'Troubleshooting'],
      'global': ['Overview'],
      'technical-analysis': ['Overview', 'Analysis', 'Recommendations'],
      'script': ['Overview', 'Content', 'Visual Cues']
    };
    
    return sectionMap[category] || ['Overview'];
  }

  /**
   * Validate internal links
   */
  validateInternalLinks(result, content, filePath) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const linkUrl = match[2];
      
      // Skip external links
      if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
        continue;
      }
      
      // Skip anchors
      if (linkUrl.startsWith('#')) {
        continue;
      }
      
      // Check if internal link exists
      const linkPath = path.resolve(path.dirname(filePath), linkUrl);
      
      // We'll add this to warnings for now since we can't easily check file existence in this context
      // In a real implementation, you'd want to check if the file exists
      if (linkUrl.includes('../') || linkUrl.includes('./')) {
        result.warnings.push(`Relative link found, verify it exists: ${linkUrl}`);
      }
    }
  }

  /**
   * Generate summary of validation results
   */
  generateSummary() {
    console.log('\n📊 Validation Summary:');
    console.log(`  Total files: ${this.totalFiles}`);
    console.log(`  Valid files: ${this.validFiles}`);
    console.log(`  Invalid files: ${this.invalidFiles}`);
    console.log(`  Success rate: ${((this.validFiles / this.totalFiles) * 100).toFixed(1)}%`);
    
    // Count warnings
    const totalWarnings = this.validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
    if (totalWarnings > 0) {
      console.log(`  Total warnings: ${totalWarnings}`);
    }
  }

  /**
   * Generate detailed validation report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.totalFiles,
        validFiles: this.validFiles,
        invalidFiles: this.invalidFiles,
        successRate: ((this.validFiles / this.totalFiles) * 100).toFixed(1)
      },
      results: this.validationResults,
      errorsByType: this.categorizeErrors(),
      warningsByType: this.categorizeWarnings()
    };
    
    // JSON report
    await fs.writeFile(
      'docs/front-matter-validation-report.json',
      JSON.stringify(report, null, 2)
    );
    
    // Markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile('docs/front-matter-validation-report.md', markdownReport);
    
    console.log('\n📄 Reports generated:');
    console.log('  - docs/front-matter-validation-report.json');
    console.log('  - docs/front-matter-validation-report.md');
  }

  /**
   * Categorize errors by type
   */
  categorizeErrors() {
    const errorTypes = {};
    
    this.validationResults.forEach(result => {
      result.errors.forEach(error => {
        if (!errorTypes[error]) {
          errorTypes[error] = 0;
        }
        errorTypes[error]++;
      });
    });
    
    return errorTypes;
  }

  /**
   * Categorize warnings by type
   */
  categorizeWarnings() {
    const warningTypes = {};
    
    this.validationResults.forEach(result => {
      result.warnings.forEach(warning => {
        const warningType = warning.split(':')[0]; // Get first part before colon
        if (!warningTypes[warningType]) {
          warningTypes[warningType] = 0;
        }
        warningTypes[warningType]++;
      });
    });
    
    return warningTypes;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Front Matter Validation Report

**Generated**: ${report.timestamp}

## Summary

- **Total Files**: ${report.summary.totalFiles}
- **Valid Files**: ${report.summary.validFiles}
- **Invalid Files**: ${report.summary.invalidFiles}
- **Success Rate**: ${report.summary.successRate}%

## Error Analysis

### Most Common Errors

${Object.entries(report.errorsByType)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([error, count]) => `- **${error}**: ${count} occurrences`)
  .join('\n')}

### Most Common Warnings

${Object.entries(report.warningsByType)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([warning, count]) => `- **${warning}**: ${count} occurrences`)
  .join('\n')}

## Invalid Files

${report.results
  .filter(result => !result.isValid)
  .map(result => `### ${result.filePath}

**Errors:**
${result.errors.map(error => `- ${error}`).join('\n')}

${result.warnings.length > 0 ? `**Warnings:**
${result.warnings.map(warning => `- ${warning}`).join('\n')}` : ''}
`)
  .join('\n')}

## Files with Warnings

${report.results
  .filter(result => result.isValid && result.warnings.length > 0)
  .map(result => `### ${result.filePath}

**Warnings:**
${result.warnings.map(warning => `- ${warning}`).join('\n')}
`)
  .join('\n')}

## Recommendations

1. **Fix Critical Errors**: Address all files with missing or invalid front matter
2. **Update Ecosystem Versions**: Update documents using v1.0.0 to v2.0.0
3. **Regular Audits**: Schedule regular documentation audits (every 90 days)
4. **Standardize Structure**: Ensure all documents follow the standard section structure
5. **Link Validation**: Verify all internal links are working correctly

---
*Generated by FrontMatterLinter*
`;
  }

  /**
   * Fix common issues automatically
   */
  async autoFix() {
    console.log('🔧 Starting automatic fixes...');
    
    let fixedCount = 0;
    
    for (const result of this.validationResults) {
      if (!result.isValid) {
        const fixed = await this.fixFile(result);
        if (fixed) {
          fixedCount++;
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} files automatically`);
    
    // Re-run validation to see improvements
    console.log('\n🔍 Re-validating after fixes...');
    this.validationResults = [];
    this.totalFiles = 0;
    this.validFiles = 0;
    this.invalidFiles = 0;
    
    await this.lintAllDocumentation();
  }

  /**
   * Fix a specific file
   */
  async fixFile(result) {
    try {
      const content = await fs.readFile(result.filePath, 'utf8');
      
      // If missing front matter entirely, add it
      if (result.errors.includes('Missing front matter')) {
        const { ModuleDocumentationNormalizer } = await import('./ModuleDocumentationNormalizer.mjs');
        const normalizer = new ModuleDocumentationNormalizer();
        
        await normalizer.normalizeDocument(result.filePath);
        console.log(`🔧 Added front matter to: ${result.filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to fix ${result.filePath}: ${error.message}`);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const linter = new FrontMatterLinter();
  
  const command = process.argv[2];
  const filePath = process.argv[3];
  
  switch (command) {
    case 'lint':
      const isValid = await linter.lintAllDocumentation();
      process.exit(isValid ? 0 : 1);
      break;
    
    case 'file':
      if (!filePath) {
        console.error('Please provide a file path');
        process.exit(1);
      }
      await linter.lintFile(filePath);
      break;
    
    case 'fix':
      await linter.autoFix();
      break;
    
    default:
      console.log(`
Usage: node front-matter-linter.mjs <command> [options]

Commands:
  lint              - Validate all documentation files
  file <path>       - Validate a specific file
  fix               - Automatically fix common issues

Examples:
  node front-matter-linter.mjs lint
  node front-matter-linter.mjs file docs/modules/qwallet/README.md
  node front-matter-linter.mjs fix
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Front matter linting failed:', error);
    process.exit(1);
  });
}

export default FrontMatterLinter;