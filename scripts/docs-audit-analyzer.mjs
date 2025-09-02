#!/usr/bin/env node

/**
 * Documentation Audit and Analysis System
 * Implements task 1: Audit and analyze current documentation structure
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class DocumentationAuditor {
  constructor() {
    this.inventory = {
      global: [],
      modules: [],
      whitepapers: [],
      technicalAnalyses: [],
      runbooks: [],
      api: [],
      deployment: [],
      migration: [],
      other: []
    };
    
    this.duplicates = [];
    this.obsoleteFiles = [];
    this.completenessScores = {};
    this.contentHashes = new Map();
    this.auditResults = {
      totalFiles: 0,
      categorizedFiles: 0,
      duplicateCount: 0,
      obsoleteCount: 0,
      averageCompleteness: 0
    };
  }

  async auditDocumentation() {
    console.log('🔍 Starting comprehensive documentation audit...');
    
    await this.scanDocumentationFiles();
    await this.categorizeContent();
    await this.detectDuplicates();
    await this.identifyObsoleteContent();
    await this.assessCompleteness();
    await this.generateTargetMapping();
    await this.generateAuditReport();
    
    console.log('✅ Documentation audit completed');
    return this.auditResults;
  }

  async scanDocumentationFiles() {
    console.log('📂 Scanning documentation files...');
    
    const docsFiles = await this.scanDirectory('docs');
    const rootSummaryFiles = await this.scanForSummaryFiles('.');
    
    this.auditResults.totalFiles = docsFiles.length + rootSummaryFiles.length;
    console.log(`  Found ${this.auditResults.totalFiles} documentation files`);
  }

  async scanDirectory(dirPath, relativePath = '') {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, relPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isDocumentationFile(entry.name)) {
          const fileInfo = await this.analyzeFile(fullPath, relPath);
          files.push(fileInfo);
        }
      }
    } catch (error) {
      console.warn(`  Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
    
    return files;
  }

  async scanForSummaryFiles(rootPath) {
    const summaryFiles = [];
    
    try {
      const entries = await fs.readdir(rootPath);
      
      for (const entry of entries) {
        if (entry.includes('SUMMARY') && entry.endsWith('.md')) {
          const fullPath = path.join(rootPath, entry);
          const fileInfo = await this.analyzeFile(fullPath, entry);
          summaryFiles.push(fileInfo);
        }
      }
    } catch (error) {
      console.warn(`  Warning: Could not scan root directory: ${error.message}`);
    }
    
    return summaryFiles;
  }

  isDocumentationFile(filename) {
    const docExtensions = ['.md', '.pdf', '.html', '.txt'];
    const excludePatterns = ['node_modules', '.git', 'dist', 'build'];
    
    return docExtensions.some(ext => filename.endsWith(ext)) &&
           !excludePatterns.some(pattern => filename.includes(pattern));
  }

  async analyzeFile(fullPath, relativePath) {
    const stats = await fs.stat(fullPath);
    const content = await this.readFileContent(fullPath);
    const contentHash = this.generateContentHash(content);
    
    const fileInfo = {
      path: relativePath,
      fullPath,
      name: path.basename(relativePath),
      size: stats.size,
      lastModified: stats.mtime,
      contentHash,
      content: content.substring(0, 1000),
      wordCount: this.countWords(content),
      category: null,
      subcategory: null,
      completenessScore: 0,
      isDuplicate: false,
      isObsolete: false,
      targetLocation: null
    };
    
    if (this.contentHashes.has(contentHash)) {
      this.contentHashes.get(contentHash).push(fileInfo);
    } else {
      this.contentHashes.set(contentHash, [fileInfo]);
    }
    
    return fileInfo;
  }

  async readFileContent(filePath) {
    try {
      if (filePath.endsWith('.pdf')) {
        return `[PDF FILE: ${path.basename(filePath)}]`;
      }
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.warn(`  Warning: Could not read file ${filePath}: ${error.message}`);
      return '';
    }
  }

  generateContentHash(content) {
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  countWords(content) {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  async categorizeContent() {
    console.log('🏷️  Categorizing content...');
    
    const files = Array.from(this.contentHashes.values()).flat();
    
    for (const file of files) {
      this.categorizeFile(file);
    }
    
    this.auditResults.categorizedFiles = files.length;
    console.log(`  Categorized ${files.length} files`);
  }

  categorizeFile(file) {
    const { path: filePath, name, content } = file;
    const lowerPath = filePath.toLowerCase();
    const lowerName = name.toLowerCase();
    
    if (lowerPath.includes('whitepaper') || lowerName.includes('whitepaper')) {
      file.category = 'whitepapers';
      file.targetLocation = '/docs/global/whitepapers/';
      this.inventory.whitepapers.push(file);
      
    } else if (lowerName.includes('summary') && lowerName.includes('implementation')) {
      file.category = 'technicalAnalyses';
      file.targetLocation = '/docs/global/technical-analysis/';
      this.inventory.technicalAnalyses.push(file);
      
    } else if (lowerPath.includes('modules/') && !lowerPath.includes('modules/README')) {
      file.category = 'modules';
      const moduleName = this.extractModuleName(filePath);
      file.subcategory = moduleName;
      file.targetLocation = `/docs/modules/${moduleName}/`;
      this.inventory.modules.push(file);
      
    } else if (lowerPath.includes('runbook') || lowerName.includes('runbook')) {
      file.category = 'runbooks';
      file.targetLocation = '/docs/runbooks/';
      this.inventory.runbooks.push(file);
      
    } else if (lowerPath.includes('api') || lowerName.includes('api')) {
      file.category = 'api';
      file.targetLocation = '/docs/api/';
      this.inventory.api.push(file);
      
    } else if (lowerPath.includes('deployment') || lowerName.includes('deployment')) {
      file.category = 'deployment';
      file.targetLocation = '/docs/deployment/';
      this.inventory.deployment.push(file);
      
    } else if (lowerPath.includes('migration') || lowerName.includes('migration')) {
      file.category = 'migration';
      file.targetLocation = '/docs/migration/';
      this.inventory.migration.push(file);
      
    } else if (this.isGlobalContent(file)) {
      file.category = 'global';
      file.subcategory = this.determineGlobalSubcategory(file);
      file.targetLocation = `/docs/global/${file.subcategory}/`;
      this.inventory.global.push(file);
      
    } else {
      file.category = 'other';
      file.targetLocation = '/docs/other/';
      this.inventory.other.push(file);
    }
  }

  extractModuleName(filePath) {
    const match = filePath.match(/modules\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  isGlobalContent(file) {
    const globalIndicators = [
      'ecosystem', 'architecture', 'overview', 'strategy', 'vision',
      'integration', 'index', 'readme', 'automation', 'ipfs', 'storj'
    ];
    
    const content = (file.path + ' ' + file.name + ' ' + file.content).toLowerCase();
    return globalIndicators.some(indicator => content.includes(indicator));
  }

  determineGlobalSubcategory(file) {
    const content = (file.path + ' ' + file.name + ' ' + file.content).toLowerCase();
    
    if (content.includes('architecture') || content.includes('technical')) {
      return 'architecture';
    } else if (content.includes('strategy') || content.includes('roadmap')) {
      return 'strategy';
    } else if (content.includes('vision') || content.includes('overview')) {
      return 'vision';
    } else if (content.includes('integration') || content.includes('ipfs') || content.includes('storj')) {
      return 'integrations';
    } else {
      return 'general';
    }
  }

  async detectDuplicates() {
    console.log('🔍 Detecting duplicate content...');
    
    for (const [hash, files] of this.contentHashes.entries()) {
      if (files.length > 1) {
        const sortedFiles = files.sort((a, b) => b.lastModified - a.lastModified);
        const primary = sortedFiles[0];
        const duplicates = sortedFiles.slice(1);
        
        duplicates.forEach(file => {
          file.isDuplicate = true;
        });
        
        this.duplicates.push({
          hash,
          primary: primary.path,
          duplicates: duplicates.map(f => f.path),
          recommendation: `Keep ${primary.path}, merge or remove duplicates`
        });
      }
    }
    
    this.auditResults.duplicateCount = this.duplicates.length;
    console.log(`  Found ${this.duplicates.length} sets of duplicate content`);
  }

  async identifyObsoleteContent() {
    console.log('🗑️  Identifying obsolete content...');
    
    const allFiles = Array.from(this.contentHashes.values()).flat();
    const now = Date.now();
    
    for (const file of allFiles) {
      const age = now - file.lastModified.getTime();
      const obsolescenceScore = this.calculateObsolescenceScore(file, age);
      
      if (obsolescenceScore > 0.7) {
        file.isObsolete = true;
        this.obsoleteFiles.push({
          path: file.path,
          age: Math.floor(age / (24 * 60 * 60 * 1000)),
          score: obsolescenceScore,
          reason: this.getObsolescenceReason(file, obsolescenceScore)
        });
      }
    }
    
    this.auditResults.obsoleteCount = this.obsoleteFiles.length;
    console.log(`  Identified ${this.obsoleteFiles.length} potentially obsolete files`);
  }

  calculateObsolescenceScore(file, age) {
    let score = 0;
    
    const ageYears = age / (365 * 24 * 60 * 60 * 1000);
    score += Math.min(ageYears * 0.3, 0.5);
    
    const content = (file.path + ' ' + file.name + ' ' + file.content).toLowerCase();
    
    if (content.includes('temp') || content.includes('test') || content.includes('draft')) {
      score += 0.3;
    }
    
    if (content.includes('v1.0') || content.includes('legacy') || content.includes('old')) {
      score += 0.2;
    }
    
    if (file.wordCount < 50) {
      score += 0.2;
    }
    
    if (content.includes('todo') || content.includes('fixme') || content.includes('placeholder')) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  getObsolescenceReason(file, score) {
    const reasons = [];
    const content = (file.path + ' ' + file.name + ' ' + file.content).toLowerCase();
    
    if (score >= 0.5) reasons.push('Very old file');
    if (content.includes('temp') || content.includes('test')) reasons.push('Temporary/test content');
    if (content.includes('legacy') || content.includes('old')) reasons.push('Legacy content');
    if (file.wordCount < 50) reasons.push('Very short content');
    if (content.includes('todo') || content.includes('fixme')) reasons.push('Incomplete content');
    
    return reasons.join(', ') || 'General obsolescence indicators';
  }

  async assessCompleteness() {
    console.log('📊 Assessing content completeness...');
    
    const allFiles = Array.from(this.contentHashes.values()).flat();
    let totalScore = 0;
    
    for (const file of allFiles) {
      const score = this.calculateCompletenessScore(file);
      file.completenessScore = score;
      this.completenessScores[file.path] = score;
      totalScore += score;
    }
    
    this.auditResults.averageCompleteness = totalScore / allFiles.length;
    console.log(`  Average completeness score: ${(this.auditResults.averageCompleteness * 100).toFixed(1)}%`);
  }

  calculateCompletenessScore(file) {
    let score = 0;
    const content = file.content.toLowerCase();
    
    if (content.includes('# ') || content.includes('## ')) score += 0.2;
    if (content.includes('introduction') || content.includes('overview')) score += 0.1;
    if (content.includes('example') || content.includes('usage')) score += 0.1;
    if (content.includes('api') || content.includes('endpoint')) score += 0.1;
    
    if (file.wordCount > 100) score += 0.1;
    if (file.wordCount > 500) score += 0.1;
    if (file.wordCount > 1000) score += 0.1;
    
    if (content.includes('```') || content.includes('`')) score += 0.1;
    if (content.includes('http') || content.includes('[') || content.includes('](')) score += 0.1;
    if (content.includes('version') || content.includes('author') || content.includes('date')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  async generateTargetMapping() {
    console.log('🗺️  Generating target structure mapping...');
    
    const mapping = {
      '/docs/global/': {
        'vision/': this.inventory.global.filter(f => f.subcategory === 'vision'),
        'architecture/': this.inventory.global.filter(f => f.subcategory === 'architecture'),
        'strategy/': this.inventory.global.filter(f => f.subcategory === 'strategy'),
        'whitepapers/': this.inventory.whitepapers,
        'technical-analysis/': this.inventory.technicalAnalyses,
        'integrations/': this.inventory.global.filter(f => f.subcategory === 'integrations')
      },
      '/docs/modules/': this.groupModulesByName(this.inventory.modules),
      '/docs/api/': this.inventory.api,
      '/docs/deployment/': this.inventory.deployment,
      '/docs/migration/': this.inventory.migration,
      '/docs/runbooks/': this.inventory.runbooks,
      '/docs/other/': this.inventory.other
    };
    
    await fs.writeFile(
      'docs-audit-target-mapping.json',
      JSON.stringify(mapping, null, 2)
    );
    
    console.log('  Target structure mapping saved to docs-audit-target-mapping.json');
  }

  groupModulesByName(moduleFiles) {
    const grouped = {};
    
    for (const file of moduleFiles) {
      const moduleName = file.subcategory;
      if (!grouped[moduleName]) {
        grouped[moduleName] = [];
      }
      grouped[moduleName].push(file);
    }
    
    return grouped;
  }

  async generateAuditReport() {
    console.log('📋 Generating comprehensive audit report...');
    
    const report = `# Documentation Audit Report

**Generated:** ${new Date().toISOString()}

## Executive Summary

- **Total Files Analyzed:** ${this.auditResults.totalFiles}
- **Successfully Categorized:** ${this.auditResults.categorizedFiles}
- **Duplicate Content Sets:** ${this.auditResults.duplicateCount}
- **Potentially Obsolete Files:** ${this.auditResults.obsoleteCount}
- **Average Completeness Score:** ${(this.auditResults.averageCompleteness * 100).toFixed(1)}%

## Content Inventory by Category

### Global Documentation (${this.inventory.global.length} files)
${this.inventory.global.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No global documentation files found'}

### Module Documentation (${this.inventory.modules.length} files)
${Object.entries(this.groupModulesByName(this.inventory.modules))
  .map(([module, files]) => `#### ${module} (${files.length} files)\n${files.map(f => `- ${f.name} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n')}`).join('\n\n') || 'No module documentation files found'}

### Whitepapers (${this.inventory.whitepapers.length} files)
${this.inventory.whitepapers.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No whitepaper files found'}

### Technical Analyses (${this.inventory.technicalAnalyses.length} files)
${this.inventory.technicalAnalyses.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No technical analysis files found'}

### API Documentation (${this.inventory.api.length} files)
${this.inventory.api.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No API documentation files found'}

### Runbooks (${this.inventory.runbooks.length} files)
${this.inventory.runbooks.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No runbook files found'}

### Deployment Documentation (${this.inventory.deployment.length} files)
${this.inventory.deployment.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No deployment documentation files found'}

### Migration Documentation (${this.inventory.migration.length} files)
${this.inventory.migration.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No migration documentation files found'}

### Other/Uncategorized (${this.inventory.other.length} files)
${this.inventory.other.map(f => `- ${f.path} (${(f.completenessScore * 100).toFixed(0)}% complete)`).join('\n') || 'No other files found'}

## Duplicate Content Analysis

${this.duplicates.length === 0 ? 'No duplicate content detected.' : 
  this.duplicates.map(dup => `### Duplicate Set
**Primary:** ${dup.primary}
**Duplicates:**
${dup.duplicates.map(d => `- ${d}`).join('\n')}
**Recommendation:** ${dup.recommendation}
`).join('\n')}

## Obsolete Content Analysis

${this.obsoleteFiles.length === 0 ? 'No obsolete content identified.' :
  this.obsoleteFiles.map(obs => `### ${obs.path}
- **Age:** ${obs.age} days
- **Obsolescence Score:** ${(obs.score * 100).toFixed(0)}%
- **Reason:** ${obs.reason}
`).join('\n')}

## Target Structure Mapping

### Proposed /docs/global/ Structure
- **vision/**: Vision and overview documents
- **architecture/**: Technical architecture documentation  
- **strategy/**: Strategic roadmap and planning
- **whitepapers/**: Consolidated whitepapers and vision documents
- **technical-analysis/**: Implementation summaries and technical analyses
- **integrations/**: External system integrations (IPFS, Storj, etc.)

### Proposed /docs/modules/ Structure
${Object.keys(this.groupModulesByName(this.inventory.modules))
  .map(module => `- **${module}/**: All documentation for ${module} module`).join('\n') || 'No modules identified'}

## Recommendations

### Immediate Actions
1. **Consolidate Whitepapers**: Move all whitepaper files to /docs/global/whitepapers/
2. **Consolidate Technical Analyses**: Move all *SUMMARY.md files to /docs/global/technical-analysis/
3. **Remove Duplicates**: ${this.duplicates.length} sets of duplicate content need review
4. **Review Obsolete Content**: ${this.obsoleteFiles.length} files may need updating or removal

### Structural Improvements
1. **Create Global Documentation**: Establish /docs/global/ with vision, architecture, and strategy
2. **Normalize Module Documentation**: Ensure consistent structure across all modules
3. **Implement Metadata System**: Add frontmatter with version, author, and review information
4. **Create Master Index**: Build comprehensive navigation and cross-references

---
*Generated by docs-audit-analyzer.mjs*
`;

    await fs.writeFile('docs-audit-report.md', report);
    
    const detailedInventory = {
      auditResults: this.auditResults,
      inventory: this.inventory,
      duplicates: this.duplicates,
      obsoleteFiles: this.obsoleteFiles,
      completenessScores: this.completenessScores,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile('docs-audit-inventory.json', JSON.stringify(detailedInventory, null, 2));
    
    console.log('  Audit report saved to docs-audit-report.md');
    console.log('  Detailed inventory saved to docs-audit-inventory.json');
  }
}

// CLI interface
async function main() {
  const auditor = new DocumentationAuditor();
  
  try {
    const results = await auditor.auditDocumentation();
    
    console.log('\n📊 Audit Summary:');
    console.log(`  Total files: ${results.totalFiles}`);
    console.log(`  Categorized: ${results.categorizedFiles}`);
    console.log(`  Duplicates: ${results.duplicateCount}`);
    console.log(`  Obsolete: ${results.obsoleteCount}`);
    console.log(`  Avg completeness: ${(results.averageCompleteness * 100).toFixed(1)}%`);
    
    console.log('\n📋 Reports generated:');
    console.log('  - docs-audit-report.md (Human-readable report)');
    console.log('  - docs-audit-inventory.json (Machine-readable data)');
    console.log('  - docs-audit-target-mapping.json (Structure mapping)');
    
  } catch (error) {
    console.error('❌ Documentation audit failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DocumentationAuditor;