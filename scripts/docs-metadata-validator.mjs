#!/usr/bin/env node

/**
 * Documentation Metadata Validator
 * Comprehensive validation system for document metadata and standardized format
 * Integrates with existing docs-automation.mjs system
 */

import fs from 'fs/promises';
import path from 'path';
import { ModuleDocumentationNormalizer } from './ModuleDocumentationNormalizer.mjs';
import FrontMatterLinter from './front-matter-linter.mjs';
import { validateMetadata } from './metadata-schema.mjs';

export class DocsMetadataValidator {
  constructor() {
    this.normalizer = new ModuleDocumentationNormalizer();
    this.linter = new FrontMatterLinter();
    this.validationResults = {
      metadata: null,
      structure: null,
      links: null,
      completeness: null
    };
  }

  /**
   * Run comprehensive validation of all documentation
   */
  async validateAll() {
    console.log('🔍 Starting comprehensive documentation validation...');
    
    // Step 1: Validate metadata compliance
    console.log('\n📋 Step 1: Validating metadata compliance...');
    const metadataValid = await this.linter.lintAllDocumentation();
    this.validationResults.metadata = metadataValid;
    
    // Step 2: Validate document structure
    console.log('\n📄 Step 2: Validating document structure...');
    const structureValid = await this.validateDocumentStructure();
    this.validationResults.structure = structureValid;
    
    // Step 3: Validate links and references
    console.log('\n🔗 Step 3: Validating links and references...');
    const linksValid = await this.validateLinks();
    this.validationResults.links = linksValid;
    
    // Step 4: Check completeness
    console.log('\n✅ Step 4: Checking documentation completeness...');
    const completenessValid = await this.validateCompleteness();
    this.validationResults.completeness = completenessValid;
    
    // Generate comprehensive report
    await this.generateComprehensiveReport();
    
    const allValid = metadataValid && structureValid && linksValid && completenessValid;
    
    console.log(`\n${allValid ? '✅' : '❌'} Validation ${allValid ? 'passed' : 'failed'}`);
    
    return allValid;
  }

  /**
   * Validate document structure compliance
   */
  async validateDocumentStructure() {
    const structureIssues = [];
    
    const directories = [
      'docs/modules',
      'docs/runbooks',
      'docs/global'
    ];
    
    for (const dir of directories) {
      await this.validateDirectoryStructure(dir, structureIssues);
    }
    
    if (structureIssues.length > 0) {
      console.log(`❌ Found ${structureIssues.length} structure issues:`);
      structureIssues.forEach(issue => console.log(`  - ${issue}`));
      return false;
    }
    
    console.log('✅ Document structure validation passed');
    return true;
  }

  /**
   * Validate directory structure
   */
  async validateDirectoryStructure(dirPath, issues) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.validateDirectoryStructure(fullPath, issues);
        } else if (entry.name.endsWith('.md')) {
          await this.validateFileStructure(fullPath, issues);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        issues.push(`Could not access directory ${dirPath}: ${error.message}`);
      }
    }
  }

  /**
   * Validate individual file structure
   */
  async validateFileStructure(filePath, issues) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for required sections based on file type
      const requiredSections = this.getRequiredSections(filePath);
      
      for (const section of requiredSections) {
        if (!content.includes(`## ${section}`)) {
          issues.push(`${filePath}: Missing required section "${section}"`);
        }
      }
      
      // Check for proper heading hierarchy
      const headings = content.match(/^#+\s+.+$/gm) || [];
      let previousLevel = 0;
      
      for (const heading of headings) {
        const level = heading.match(/^#+/)[0].length;
        
        if (level > previousLevel + 1) {
          issues.push(`${filePath}: Improper heading hierarchy - skipped from h${previousLevel} to h${level}`);
        }
        
        previousLevel = level;
      }
      
    } catch (error) {
      issues.push(`${filePath}: Could not validate structure - ${error.message}`);
    }
  }

  /**
   * Get required sections for a file based on its path and type
   */
  getRequiredSections(filePath) {
    if (filePath.includes('runbook-')) {
      return ['Module Overview', 'Health Checks', 'Service Management', 'Troubleshooting'];
    }
    
    if (filePath.includes('api-reference') || filePath.includes('api.md')) {
      return ['Overview', 'Authentication', 'Endpoints'];
    }
    
    if (filePath.includes('deployment')) {
      return ['Overview', 'Prerequisites', 'Installation'];
    }
    
    if (filePath.includes('integration')) {
      return ['Overview', 'Integration Patterns', 'Examples'];
    }
    
    if (filePath.includes('docs/modules/') && filePath.endsWith('README.md')) {
      return ['Overview', 'Architecture', 'Use Cases'];
    }
    
    return ['Overview']; // Minimum requirement
  }

  /**
   * Validate links and cross-references
   */
  async validateLinks() {
    const linkIssues = [];
    
    const directories = [
      'docs'
    ];
    
    for (const dir of directories) {
      await this.validateDirectoryLinks(dir, linkIssues);
    }
    
    if (linkIssues.length > 0) {
      console.log(`❌ Found ${linkIssues.length} link issues:`);
      linkIssues.slice(0, 10).forEach(issue => console.log(`  - ${issue}`));
      if (linkIssues.length > 10) {
        console.log(`  ... and ${linkIssues.length - 10} more`);
      }
      return false;
    }
    
    console.log('✅ Link validation passed');
    return true;
  }

  /**
   * Validate links in a directory
   */
  async validateDirectoryLinks(dirPath, issues) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.validateDirectoryLinks(fullPath, issues);
        } else if (entry.name.endsWith('.md')) {
          await this.validateFileLinks(fullPath, issues);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        issues.push(`Could not access directory ${dirPath}: ${error.message}`);
      }
    }
  }

  /**
   * Validate links in a specific file
   */
  async validateFileLinks(filePath, issues) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];
        
        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue;
        }
        
        // Skip anchors (we'll validate these separately)
        if (linkUrl.startsWith('#')) {
          continue;
        }
        
        // Validate internal links
        const resolvedPath = path.resolve(path.dirname(filePath), linkUrl);
        
        try {
          await fs.access(resolvedPath);
        } catch {
          issues.push(`${filePath}: Broken link "${linkText}" -> ${linkUrl}`);
        }
      }
      
    } catch (error) {
      issues.push(`${filePath}: Could not validate links - ${error.message}`);
    }
  }

  /**
   * Validate documentation completeness
   */
  async validateCompleteness() {
    const completenessIssues = [];
    
    // Check that all modules have required documentation
    await this.validateModuleCompleteness(completenessIssues);
    
    // Check that global documentation is complete
    await this.validateGlobalCompleteness(completenessIssues);
    
    if (completenessIssues.length > 0) {
      console.log(`❌ Found ${completenessIssues.length} completeness issues:`);
      completenessIssues.forEach(issue => console.log(`  - ${issue}`));
      return false;
    }
    
    console.log('✅ Documentation completeness validation passed');
    return true;
  }

  /**
   * Validate module documentation completeness
   */
  async validateModuleCompleteness(issues) {
    const modulesDir = 'docs/modules';
    
    try {
      const modules = await fs.readdir(modulesDir);
      
      for (const moduleName of modules) {
        if (moduleName === 'README.md') continue;
        
        const moduleDir = path.join(modulesDir, moduleName);
        const stat = await fs.stat(moduleDir);
        
        if (stat.isDirectory()) {
          await this.validateSingleModuleCompleteness(moduleDir, moduleName, issues);
        }
      }
    } catch (error) {
      issues.push(`Could not validate module completeness: ${error.message}`);
    }
  }

  /**
   * Validate completeness for a single module
   */
  async validateSingleModuleCompleteness(moduleDir, moduleName, issues) {
    const requiredFiles = [
      'README.md',
      'api-reference.md',
      'deployment-guide.md',
      'integration-guide.md',
      'troubleshooting.md'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(moduleDir, file);
      
      try {
        await fs.access(filePath);
        
        // Check if file has substantial content (more than just template)
        const content = await fs.readFile(filePath, 'utf8');
        if (content.length < 500) {
          issues.push(`${moduleName}: ${file} appears to be incomplete (less than 500 characters)`);
        }
        
      } catch {
        issues.push(`${moduleName}: Missing required file ${file}`);
      }
    }
    
    // Check for runbook
    const runbookPath = path.join('docs/runbooks', `runbook-${moduleName}.md`);
    try {
      await fs.access(runbookPath);
    } catch {
      issues.push(`${moduleName}: Missing operational runbook`);
    }
  }

  /**
   * Validate global documentation completeness
   */
  async validateGlobalCompleteness(issues) {
    const requiredGlobalDocs = [
      'docs/README.md',
      'docs/INDEX.md',
      'docs/modules/README.md'
    ];
    
    for (const docPath of requiredGlobalDocs) {
      try {
        await fs.access(docPath);
        
        const content = await fs.readFile(docPath, 'utf8');
        if (content.length < 1000) {
          issues.push(`Global doc ${docPath} appears incomplete`);
        }
        
      } catch {
        issues.push(`Missing required global documentation: ${docPath}`);
      }
    }
  }

  /**
   * Generate comprehensive validation report
   */
  async generateComprehensiveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        metadata: this.validationResults.metadata ? 'PASS' : 'FAIL',
        structure: this.validationResults.structure ? 'PASS' : 'FAIL',
        links: this.validationResults.links ? 'PASS' : 'FAIL',
        completeness: this.validationResults.completeness ? 'PASS' : 'FAIL',
        overall: Object.values(this.validationResults).every(Boolean) ? 'PASS' : 'FAIL'
      },
      details: {
        metadataReport: 'docs/front-matter-validation-report.json',
        normalizationReport: 'docs/normalization-report.json'
      },
      recommendations: this.generateRecommendations()
    };
    
    // JSON report
    await fs.writeFile(
      'docs/comprehensive-validation-report.json',
      JSON.stringify(report, null, 2)
    );
    
    // Markdown report
    const markdownReport = `# Comprehensive Documentation Validation Report

**Generated**: ${report.timestamp}

## Summary

| Validation Area | Status |
|----------------|--------|
| Metadata Compliance | ${report.summary.metadata} |
| Document Structure | ${report.summary.structure} |
| Links & References | ${report.summary.links} |
| Documentation Completeness | ${report.summary.completeness} |
| **Overall** | **${report.summary.overall}** |

## Detailed Reports

- [Metadata Validation Report](./front-matter-validation-report.md)
- [Normalization Report](./normalization-report.md)

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. **Address Critical Issues**: Fix any failing validation areas
2. **Review Detailed Reports**: Check individual reports for specific issues
3. **Implement Automation**: Set up CI/CD validation to prevent regressions
4. **Schedule Regular Audits**: Run comprehensive validation monthly

---
*Generated by DocsMetadataValidator*
`;
    
    await fs.writeFile('docs/comprehensive-validation-report.md', markdownReport);
    
    console.log('\n📄 Comprehensive validation report generated:');
    console.log('  - docs/comprehensive-validation-report.json');
    console.log('  - docs/comprehensive-validation-report.md');
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.validationResults.metadata) {
      recommendations.push('Fix metadata compliance issues - ensure all documents have proper front matter');
    }
    
    if (!this.validationResults.structure) {
      recommendations.push('Standardize document structure - ensure all documents follow the required section format');
    }
    
    if (!this.validationResults.links) {
      recommendations.push('Fix broken links - update or remove invalid internal references');
    }
    
    if (!this.validationResults.completeness) {
      recommendations.push('Complete missing documentation - add required files and expand incomplete content');
    }
    
    recommendations.push('Set up automated validation in CI/CD pipeline');
    recommendations.push('Schedule regular documentation audits (monthly)');
    recommendations.push('Consider implementing documentation templates for consistency');
    
    return recommendations;
  }

  /**
   * Normalize all documentation to fix common issues
   */
  async normalizeAndValidate() {
    console.log('🔧 Starting normalization and validation process...');
    
    // Step 1: Normalize all documentation
    console.log('\n📋 Step 1: Normalizing documentation...');
    await this.normalizer.normalizeAllDocumentation();
    
    // Step 2: Run comprehensive validation
    console.log('\n🔍 Step 2: Running validation...');
    const isValid = await this.validateAll();
    
    return isValid;
  }
}

// CLI interface
async function main() {
  const validator = new DocsMetadataValidator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      const isValid = await validator.validateAll();
      process.exit(isValid ? 0 : 1);
      break;
    
    case 'normalize':
      await validator.normalizer.normalizeAllDocumentation();
      break;
    
    case 'lint':
      const lintValid = await validator.linter.lintAllDocumentation();
      process.exit(lintValid ? 0 : 1);
      break;
    
    case 'fix':
      const fixValid = await validator.normalizeAndValidate();
      process.exit(fixValid ? 0 : 1);
      break;
    
    default:
      console.log(`
Usage: node docs-metadata-validator.mjs <command>

Commands:
  validate    - Run comprehensive validation of all documentation
  normalize   - Normalize all documentation files to standard format
  lint        - Validate front matter metadata only
  fix         - Normalize and validate (fix common issues)

Examples:
  node docs-metadata-validator.mjs validate
  node docs-metadata-validator.mjs normalize
  node docs-metadata-validator.mjs lint
  node docs-metadata-validator.mjs fix
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Documentation validation failed:', error);
    process.exit(1);
  });
}

export default DocsMetadataValidator;