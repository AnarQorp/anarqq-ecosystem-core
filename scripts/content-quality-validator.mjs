#!/usr/bin/env node

/**
 * Content Quality Validator
 * Advanced validation system for documentation content quality
 * Extends the master index automation with content-specific checks
 */

import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';

class ContentQualityValidator {
  constructor() {
    this.rules = {
      minimumSectionLength: {
        overview: 200,
        examples: 500,
        troubleshooting: 300,
        'getting-started': 400,
        'api-reference': 600
      },
      
      requiredElements: {
        codeExamples: {
          'api-reference': 3,
          'integration-guide': 5,
          'examples': 10,
          'deployment-guide': 2,
          'troubleshooting': 2
        },
        
        diagrams: {
          'architecture': 1,
          'integration-guide': 2,
          'deployment-guide': 1,
          'README': 1
        },
        
        links: {
          crossReferences: 3,
          externalResources: 2
        }
      },
      
      contentStructure: {
        headingHierarchy: true,
        tableOfContents: true,
        codeLanguageLabels: true,
        imageAltText: true,
        properMarkdown: true
      },
      
      accessibility: {
        altTextRequired: true,
        headingSequence: true,
        colorContrastInfo: true,
        descriptiveLinks: true
      },
      
      readability: {
        maxSentenceLength: 25,
        maxParagraphLength: 150,
        minFleschScore: 60,
        technicalTermsExplained: true
      }
    };
    
    this.validationResults = [];
  }

  async validateDocumentQuality(filePath) {
    console.log(`🔍 Validating content quality: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf8');
    const docType = this.inferDocumentType(filePath, content);
    
    const results = {
      filePath,
      docType,
      passed: true,
      errors: [],
      warnings: [],
      metrics: {},
      qualityScore: 0
    };
    
    // Run all validation checks
    await this.checkSectionLengths(content, results);
    await this.validateCodeExamples(content, results);
    await this.validateDiagrams(content, results);
    await this.validateStructure(content, results);
    await this.validateAccessibility(content, results);
    await this.validateReadability(content, results);
    await this.validateLinks(content, results);
    
    // Calculate quality score
    results.qualityScore = this.calculateQualityScore(results);
    
    return results;
  }

  async checkSectionLengths(content, results) {
    const sections = this.extractSections(content);
    const docType = results.docType;
    
    for (const [sectionName, minLength] of Object.entries(this.rules.minimumSectionLength)) {
      const section = sections[sectionName.toLowerCase()];
      
      if (section && section.content.length < minLength) {
        results.errors.push({
          type: 'section-length',
          section: sectionName,
          actual: section.content.length,
          required: minLength,
          message: `Section '${sectionName}' is too short (${section.content.length} chars, minimum ${minLength})`,
          severity: 'error'
        });
        results.passed = false;
      }
    }
    
    // Check for empty sections
    for (const [sectionName, section] of Object.entries(sections)) {
      if (section.content.trim().length === 0) {
        results.warnings.push({
          type: 'empty-section',
          section: sectionName,
          message: `Section '${sectionName}' is empty`,
          severity: 'warning'
        });
      }
    }
    
    results.metrics.sectionCount = Object.keys(sections).length;
    results.metrics.averageSectionLength = Object.values(sections)
      .reduce((sum, section) => sum + section.content.length, 0) / Object.keys(sections).length;
  }

  async validateCodeExamples(content, results) {
    const codeBlocks = this.extractCodeBlocks(content);
    const docType = results.docType;
    
    const requiredExamples = this.rules.requiredElements.codeExamples[docType];
    if (requiredExamples && codeBlocks.length < requiredExamples) {
      results.errors.push({
        type: 'insufficient-examples',
        docType,
        actual: codeBlocks.length,
        required: requiredExamples,
        message: `Document needs ${requiredExamples} code examples, found ${codeBlocks.length}`,
        severity: 'error'
      });
      results.passed = false;
    }
    
    // Validate code block quality
    let unlabeledBlocks = 0;
    let trivialBlocks = 0;
    
    for (const block of codeBlocks) {
      if (!block.language) {
        unlabeledBlocks++;
        results.warnings.push({
          type: 'unlabeled-code',
          line: block.line,
          message: 'Code block missing language label',
          severity: 'warning'
        });
      }
      
      if (block.content.length < 50) {
        trivialBlocks++;
        results.warnings.push({
          type: 'trivial-example',
          line: block.line,
          message: 'Code example may be too trivial (< 50 characters)',
          severity: 'warning'
        });
      }
      
      // Check for common code quality issues
      if (block.content.includes('TODO') || block.content.includes('FIXME')) {
        results.warnings.push({
          type: 'incomplete-code',
          line: block.line,
          message: 'Code example contains TODO/FIXME comments',
          severity: 'warning'
        });
      }
      
      // Check for placeholder values that should be replaced
      if (block.content.includes('your-api-key') || block.content.includes('localhost:3000')) {
        results.warnings.push({
          type: 'placeholder-values',
          line: block.line,
          message: 'Code example contains placeholder values that should be explained',
          severity: 'info'
        });
      }
    }
    
    results.metrics.codeBlocks = {
      total: codeBlocks.length,
      unlabeled: unlabeledBlocks,
      trivial: trivialBlocks,
      averageLength: codeBlocks.reduce((sum, block) => sum + block.content.length, 0) / codeBlocks.length || 0
    };
  }

  async validateDiagrams(content, results) {
    const diagrams = this.extractDiagrams(content);
    const docType = results.docType;
    
    const requiredDiagrams = this.rules.requiredElements.diagrams[docType];
    if (requiredDiagrams && diagrams.length < requiredDiagrams) {
      results.errors.push({
        type: 'insufficient-diagrams',
        docType,
        actual: diagrams.length,
        required: requiredDiagrams,
        message: `Document needs ${requiredDiagrams} diagrams, found ${diagrams.length}`,
        severity: 'error'
      });
      results.passed = false;
    }
    
    // Check diagram quality
    for (const diagram of diagrams) {
      if (!diagram.altText) {
        results.warnings.push({
          type: 'diagram-no-alt-text',
          line: diagram.line,
          message: 'Diagram missing alt text for accessibility',
          severity: 'warning'
        });
      }
      
      if (diagram.type === 'mermaid' && diagram.content.length < 100) {
        results.warnings.push({
          type: 'simple-diagram',
          line: diagram.line,
          message: 'Diagram may be too simple to be useful',
          severity: 'info'
        });
      }
    }
    
    results.metrics.diagrams = {
      total: diagrams.length,
      types: this.countDiagramTypes(diagrams),
      withAltText: diagrams.filter(d => d.altText).length
    };
  }

  async validateStructure(content, results) {
    const headings = this.extractHeadings(content);
    
    // Check heading hierarchy
    if (this.rules.contentStructure.headingHierarchy) {
      const hierarchyErrors = this.validateHeadingHierarchy(headings);
      results.errors.push(...hierarchyErrors.map(error => ({
        ...error,
        type: 'heading-hierarchy',
        severity: 'error'
      })));
      
      if (hierarchyErrors.length > 0) {
        results.passed = false;
      }
    }
    
    // Check for table of contents in long documents
    if (this.rules.contentStructure.tableOfContents && content.length > 2000) {
      const hasTOC = content.toLowerCase().includes('table of contents') || 
                    content.includes('## Table of Contents') ||
                    content.includes('## Contents');
      
      if (!hasTOC) {
        results.warnings.push({
          type: 'missing-toc',
          message: 'Long document should include a table of contents',
          severity: 'warning'
        });
      }
    }
    
    // Check markdown structure
    if (this.rules.contentStructure.properMarkdown) {
      const markdownErrors = this.validateMarkdownStructure(content);
      results.warnings.push(...markdownErrors.map(error => ({
        ...error,
        type: 'markdown-structure',
        severity: 'warning'
      })));
    }
    
    results.metrics.structure = {
      headingCount: headings.length,
      maxHeadingLevel: Math.max(...headings.map(h => h.level)),
      hasProperHierarchy: hierarchyErrors.length === 0,
      wordCount: content.split(/\s+/).length
    };
  }

  async validateAccessibility(content, results) {
    const images = this.extractImages(content);
    const links = this.extractLinks(content);
    
    // Check image alt text
    if (this.rules.accessibility.altTextRequired) {
      for (const image of images) {
        if (!image.altText || image.altText.trim().length === 0) {
          results.errors.push({
            type: 'missing-alt-text',
            line: image.line,
            message: `Image missing alt text: ${image.src}`,
            severity: 'error'
          });
          results.passed = false;
        }
      }
    }
    
    // Check link descriptions
    if (this.rules.accessibility.descriptiveLinks) {
      for (const link of links) {
        if (link.text.toLowerCase().match(/^(click here|here|link|read more)$/)) {
          results.warnings.push({
            type: 'non-descriptive-link',
            line: link.line,
            message: `Link text is not descriptive: "${link.text}"`,
            severity: 'warning'
          });
        }
      }
    }
    
    results.metrics.accessibility = {
      imagesWithAltText: images.filter(img => img.altText && img.altText.trim().length > 0).length,
      totalImages: images.length,
      descriptiveLinks: links.filter(link => !link.text.toLowerCase().match(/^(click here|here|link|read more)$/)).length,
      totalLinks: links.length
    };
  }

  async validateReadability(content, results) {
    const sentences = this.extractSentences(content);
    const paragraphs = this.extractParagraphs(content);
    
    // Check sentence length
    const longSentences = sentences.filter(s => s.wordCount > this.rules.readability.maxSentenceLength);
    if (longSentences.length > 0) {
      results.warnings.push({
        type: 'long-sentences',
        count: longSentences.length,
        message: `${longSentences.length} sentences exceed ${this.rules.readability.maxSentenceLength} words`,
        severity: 'warning'
      });
    }
    
    // Check paragraph length
    const longParagraphs = paragraphs.filter(p => p.wordCount > this.rules.readability.maxParagraphLength);
    if (longParagraphs.length > 0) {
      results.warnings.push({
        type: 'long-paragraphs',
        count: longParagraphs.length,
        message: `${longParagraphs.length} paragraphs exceed ${this.rules.readability.maxParagraphLength} words`,
        severity: 'warning'
      });
    }
    
    // Calculate readability score (simplified Flesch Reading Ease)
    const fleschScore = this.calculateFleschScore(content);
    if (fleschScore < this.rules.readability.minFleschScore) {
      results.warnings.push({
        type: 'low-readability',
        score: fleschScore,
        message: `Readability score (${fleschScore}) below recommended minimum (${this.rules.readability.minFleschScore})`,
        severity: 'warning'
      });
    }
    
    results.metrics.readability = {
      fleschScore,
      averageSentenceLength: sentences.reduce((sum, s) => sum + s.wordCount, 0) / sentences.length || 0,
      averageParagraphLength: paragraphs.reduce((sum, p) => sum + p.wordCount, 0) / paragraphs.length || 0,
      longSentences: longSentences.length,
      longParagraphs: longParagraphs.length
    };
  }

  async validateLinks(content, results) {
    const links = this.extractLinks(content);
    const internalLinks = links.filter(link => !link.url.startsWith('http'));
    const externalLinks = links.filter(link => link.url.startsWith('http'));
    
    // Check for minimum cross-references
    if (internalLinks.length < this.rules.requiredElements.links.crossReferences) {
      results.warnings.push({
        type: 'insufficient-cross-references',
        actual: internalLinks.length,
        required: this.rules.requiredElements.links.crossReferences,
        message: `Document should have at least ${this.rules.requiredElements.links.crossReferences} internal links`,
        severity: 'warning'
      });
    }
    
    // Check for external resources
    if (externalLinks.length < this.rules.requiredElements.links.externalResources) {
      results.warnings.push({
        type: 'insufficient-external-links',
        actual: externalLinks.length,
        required: this.rules.requiredElements.links.externalResources,
        message: `Document should reference at least ${this.rules.requiredElements.links.externalResources} external resources`,
        severity: 'info'
      });
    }
    
    results.metrics.links = {
      total: links.length,
      internal: internalLinks.length,
      external: externalLinks.length,
      unique: new Set(links.map(l => l.url)).size
    };
  }

  // Helper methods for content extraction and analysis

  inferDocumentType(filePath, content) {
    const fileName = path.basename(filePath, '.md').toLowerCase();
    
    if (fileName.includes('api') || fileName.includes('reference')) return 'api-reference';
    if (fileName.includes('integration')) return 'integration-guide';
    if (fileName.includes('deployment')) return 'deployment-guide';
    if (fileName.includes('troubleshooting')) return 'troubleshooting';
    if (fileName.includes('example')) return 'examples';
    if (fileName === 'readme') return 'README';
    
    // Infer from content
    if (content.includes('## API Reference') || content.includes('### Endpoints')) return 'api-reference';
    if (content.includes('## Integration') || content.includes('## Getting Started')) return 'integration-guide';
    if (content.includes('## Deployment') || content.includes('## Installation')) return 'deployment-guide';
    
    return 'general';
  }

  extractSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
      const headingMatch = line.match(/^#+\s+(.+)$/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          sections[currentSection.toLowerCase()] = {
            title: currentSection,
            content: currentContent.join('\n').trim()
          };
        }
        
        // Start new section
        currentSection = headingMatch[1];
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      sections[currentSection.toLowerCase()] = {
        title: currentSection,
        content: currentContent.join('\n').trim()
      };
    }
    
    return sections;
  }

  extractCodeBlocks(content) {
    const codeBlocks = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentBlock = null;
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          codeBlocks.push(currentBlock);
          inCodeBlock = false;
          currentBlock = null;
        } else {
          // Start of code block
          inCodeBlock = true;
          currentBlock = {
            language: line.substring(3).trim(),
            content: '',
            line: lineNumber
          };
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.content += line + '\n';
      }
    }
    
    return codeBlocks;
  }

  extractDiagrams(content) {
    const diagrams = [];
    const mermaidBlocks = content.match(/```mermaid\n([\s\S]*?)\n```/g) || [];
    
    mermaidBlocks.forEach((block, index) => {
      const content = block.replace(/```mermaid\n/, '').replace(/\n```$/, '');
      diagrams.push({
        type: 'mermaid',
        content,
        line: this.findLineNumber(content, block),
        altText: this.findNearbyAltText(content, block)
      });
    });
    
    // Look for image diagrams
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      if (match[2].match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
        diagrams.push({
          type: 'image',
          src: match[2],
          altText: match[1],
          line: this.findLineNumber(content, match[0])
        });
      }
    }
    
    return diagrams;
  }

  extractHeadings(content) {
    const headings = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#+)\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2],
          line: index + 1
        });
      }
    });
    
    return headings;
  }

  extractImages(content) {
    const images = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      images.push({
        altText: match[1],
        src: match[2],
        line: this.findLineNumber(content, match[0])
      });
    }
    
    return images;
  }

  extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      // Skip images
      if (!match[0].startsWith('![')) {
        links.push({
          text: match[1],
          url: match[2],
          line: this.findLineNumber(content, match[0])
        });
      }
    }
    
    return links;
  }

  extractSentences(content) {
    // Remove code blocks and other non-prose content
    const proseContent = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/^\s*[#>-]/gm, '');
    
    const sentences = proseContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return sentences.map(sentence => ({
      text: sentence.trim(),
      wordCount: sentence.trim().split(/\s+/).length
    }));
  }

  extractParagraphs(content) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return paragraphs.map(paragraph => ({
      text: paragraph.trim(),
      wordCount: paragraph.trim().split(/\s+/).length
    }));
  }

  validateHeadingHierarchy(headings) {
    const errors = [];
    let previousLevel = 0;
    
    for (const heading of headings) {
      if (heading.level > previousLevel + 1) {
        errors.push({
          line: heading.line,
          message: `Heading level ${heading.level} follows level ${previousLevel}, skipping levels`,
          heading: heading.text
        });
      }
      previousLevel = heading.level;
    }
    
    return errors;
  }

  validateMarkdownStructure(content) {
    const errors = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for common markdown issues
      if (line.match(/^[#]+[^#\s]/)) {
        errors.push({
          line: index + 1,
          message: 'Heading missing space after #'
        });
      }
      
      if (line.match(/\[[^\]]*\]\([^)]*\s[^)]*\)/)) {
        errors.push({
          line: index + 1,
          message: 'Link URL contains spaces (should be encoded)'
        });
      }
    });
    
    return errors;
  }

  calculateFleschScore(content) {
    const sentences = this.extractSentences(content);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  calculateQualityScore(results) {
    let score = 100;
    
    // Deduct points for errors and warnings
    score -= results.errors.length * 10;
    score -= results.warnings.length * 5;
    
    // Bonus points for good metrics
    if (results.metrics.codeBlocks && results.metrics.codeBlocks.total > 0) {
      score += Math.min(results.metrics.codeBlocks.total * 2, 10);
    }
    
    if (results.metrics.diagrams && results.metrics.diagrams.total > 0) {
      score += Math.min(results.metrics.diagrams.total * 3, 15);
    }
    
    if (results.metrics.readability && results.metrics.readability.fleschScore > 60) {
      score += 5;
    }
    
    if (results.metrics.accessibility) {
      const accessibilityRatio = results.metrics.accessibility.imagesWithAltText / 
                                (results.metrics.accessibility.totalImages || 1);
      score += accessibilityRatio * 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  findLineNumber(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 0;
  }

  findNearbyAltText(content, block) {
    // Look for alt text in nearby lines
    const blockIndex = content.indexOf(block);
    const beforeBlock = content.substring(Math.max(0, blockIndex - 200), blockIndex);
    const afterBlock = content.substring(blockIndex + block.length, blockIndex + block.length + 200);
    
    const altTextMatch = (beforeBlock + afterBlock).match(/alt[:\s]*["']([^"']+)["']/i);
    return altTextMatch ? altTextMatch[1] : null;
  }

  countDiagramTypes(diagrams) {
    const types = {};
    diagrams.forEach(diagram => {
      types[diagram.type] = (types[diagram.type] || 0) + 1;
    });
    return types;
  }

  async validateAllDocuments(docsPath = 'docs') {
    console.log('🔍 Running comprehensive content quality validation...');
    
    const allResults = [];
    const files = await this.findMarkdownFiles(docsPath);
    
    for (const file of files) {
      try {
        const result = await this.validateDocumentQuality(file);
        allResults.push(result);
      } catch (error) {
        console.error(`Error validating ${file}:`, error.message);
        allResults.push({
          filePath: file,
          passed: false,
          errors: [{ type: 'validation-error', message: error.message }],
          warnings: [],
          metrics: {},
          qualityScore: 0
        });
      }
    }
    
    return this.generateQualityReport(allResults);
  }

  async findMarkdownFiles(dir) {
    const files = [];
    
    const findFiles = async (currentDir) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await findFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    };
    
    await findFiles(dir);
    return files;
  }

  generateQualityReport(results) {
    const totalFiles = results.length;
    const passedFiles = results.filter(r => r.passed).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / totalFiles;
    
    const report = {
      summary: {
        totalFiles,
        passedFiles,
        failedFiles: totalFiles - passedFiles,
        totalErrors,
        totalWarnings,
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
        passRate: Math.round((passedFiles / totalFiles) * 100)
      },
      
      qualityDistribution: {
        excellent: results.filter(r => r.qualityScore >= 90).length,
        good: results.filter(r => r.qualityScore >= 70 && r.qualityScore < 90).length,
        fair: results.filter(r => r.qualityScore >= 50 && r.qualityScore < 70).length,
        poor: results.filter(r => r.qualityScore < 50).length
      },
      
      commonIssues: this.analyzeCommonIssues(results),
      
      recommendations: this.generateRecommendations(results),
      
      detailedResults: results,
      
      timestamp: new Date().toISOString()
    };
    
    return report;
  }

  analyzeCommonIssues(results) {
    const issueTypes = {};
    
    results.forEach(result => {
      [...result.errors, ...result.warnings].forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
    });
    
    return Object.entries(issueTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  generateRecommendations(results) {
    const recommendations = [];
    const failedFiles = results.filter(r => !r.passed);
    
    if (failedFiles.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `Fix validation errors in ${failedFiles.length} files`,
        impact: 'Ensures documentation meets quality standards'
      });
    }
    
    const lowQualityFiles = results.filter(r => r.qualityScore < 70);
    if (lowQualityFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Improve quality score for ${lowQualityFiles.length} files`,
        impact: 'Enhances overall documentation quality'
      });
    }
    
    const filesWithoutExamples = results.filter(r => 
      r.metrics.codeBlocks && r.metrics.codeBlocks.total === 0
    );
    if (filesWithoutExamples.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Add code examples to ${filesWithoutExamples.length} files`,
        impact: 'Improves developer experience and usability'
      });
    }
    
    return recommendations;
  }
}

// CLI interface
async function main() {
  const validator = new ContentQualityValidator();
  const command = process.argv[2];
  const target = process.argv[3] || 'docs';

  switch (command) {
    case 'validate':
      const report = await validator.validateAllDocuments(target);
      console.log('\n📊 Content Quality Report:');
      console.log(`  Files Validated: ${report.summary.totalFiles}`);
      console.log(`  Pass Rate: ${report.summary.passRate}%`);
      console.log(`  Average Quality Score: ${report.summary.averageQualityScore}/100`);
      console.log(`  Total Errors: ${report.summary.totalErrors}`);
      console.log(`  Total Warnings: ${report.summary.totalWarnings}`);
      
      // Save detailed report
      await fs.writeFile('docs/content-quality-report.json', JSON.stringify(report, null, 2));
      console.log('\n📄 Detailed report saved to docs/content-quality-report.json');
      
      process.exit(report.summary.failedFiles > 0 ? 1 : 0);
      break;
    
    case 'file':
      if (!target) {
        console.error('Please specify a file to validate');
        process.exit(1);
      }
      
      const result = await validator.validateDocumentQuality(target);
      console.log(`\n📋 Quality Report for ${target}:`);
      console.log(`  Quality Score: ${result.qualityScore}/100`);
      console.log(`  Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Warnings: ${result.warnings.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.message}`);
        });
      }
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`  - ${warning.message}`);
        });
      }
      
      process.exit(result.passed ? 0 : 1);
      break;
    
    default:
      console.log(`
Usage: node content-quality-validator.mjs <command> [target]

Commands:
  validate [path]  - Validate all markdown files in path (default: docs)
  file <file>      - Validate a specific file

Examples:
  node content-quality-validator.mjs validate
  node content-quality-validator.mjs validate docs/modules
  node content-quality-validator.mjs file docs/README.md
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Content quality validation failed:', error);
    process.exit(1);
  });
}

export default ContentQualityValidator;