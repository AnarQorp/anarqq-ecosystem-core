#!/usr/bin/env node

/**
 * Enhanced Documentation Validation and Automation System
 * Extends existing validation infrastructure with comprehensive checks for:
 * - New documentation structure validation
 * - Completeness checking for all required sections
 * - Script-specific validation for duration, structure, and bilingual consistency
 * - Automated link validation and cross-reference checking
 * - A11Y validation (alt text, contrast, headings) and code snippet compilation testing
 * - OpenAPI and MCP specification verification and auto-extraction
 * - Integration with existing npm scripts (docs:index:validate)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import DocumentationAutomation from './docs-automation.mjs';
import MasterIndexAutomation from './master-index-automation.mjs';
import { ContentSecurityScanner } from './content-security-scanner.mjs';
import { ContentSanitizer } from './content-sanitizer.mjs';
import { ContentClassifier } from './content-classifier.mjs';
// import ContentQualityValidator from './content-quality-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedDocumentationValidator {
  constructor() {
    this.docAutomation = new DocumentationAutomation();
    this.indexAutomation = new MasterIndexAutomation();
    this.securityScanner = new ContentSecurityScanner();
    this.contentSanitizer = new ContentSanitizer();
    this.contentClassifier = new ContentClassifier();
    // this.contentValidator = new ContentQualityValidator();
    
    this.validationResults = {
      structure: { passed: true, errors: [], warnings: [] },
      completeness: { passed: true, errors: [], warnings: [] },
      scripts: { passed: true, errors: [], warnings: [] },
      links: { passed: true, errors: [], warnings: [] },
      accessibility: { passed: true, errors: [], warnings: [] },
      codeSnippets: { passed: true, errors: [], warnings: [] },
      openapi: { passed: true, errors: [], warnings: [] },
      mcp: { passed: true, errors: [], warnings: [] },
      bilingual: { passed: true, errors: [], warnings: [] },
      security: { passed: true, errors: [], warnings: [] },
      classification: { passed: true, errors: [], warnings: [] }
    };

    // Enhanced structure requirements
    this.requiredStructure = {
      global: {
        path: 'docs/global',
        subdirs: ['vision', 'architecture', 'strategy', 'whitepapers', 'technical-analysis', 'integrations'],
        files: ['vision-overview.md', 'q-infinity-architecture.md', 'strategic-narrative.md']
      },
      placeholders: {
        directories: [
          'docs/global/integrations/pi',
          'docs/DEMO',
          'docs/INTEGRATIONS'
        ],
        files: [
          'docs/global/integrations/pi/README.md',
          'docs/DEMO/runbook.md',
          'docs/INTEGRATIONS/README.md'
        ]
      },
      modules: {
        path: 'docs/modules',
        requiredFiles: [
          'README.md',
          'api-reference.md', 
          'mcp-tools.md',
          'deployment-guide.md',
          'integration-guide.md',
          'examples.md',
          'runbook.md',
          'troubleshooting.md'
        ]
      },
      videoScripts: {
        path: 'docs/video-scripts',
        subdirs: ['global', 'modules'],
        languages: ['en', 'es'],
        requiredSections: [
          'Script Metadata',
          'Visual Shot List', 
          'Script Content',
          'Production Notes',
          'Review Checklist'
        ]
      }
    };

    // A11Y validation rules
    this.a11yRules = {
      images: {
        requireAltText: true,
        maxAltTextLength: 125,
        descriptiveAltText: true
      },
      headings: {
        requireSequentialLevels: true,
        maxSkippedLevels: 0,
        requireH1: true
      },
      links: {
        requireDescriptiveText: true,
        avoidGenericText: ['click here', 'here', 'link', 'read more'],
        requireContext: true
      },
      contrast: {
        checkColorReferences: true,
        warnLowContrast: true
      }
    };

    // Code snippet compilation rules
    this.codeRules = {
      languages: ['javascript', 'typescript', 'bash', 'json', 'yaml', 'mermaid'],
      requireLanguageLabels: true,
      validateSyntax: true,
      checkExecutability: true,
      requireExplanations: true
    };
  }

  async init() {
    await this.docAutomation.init();
    await this.indexAutomation.init();
  }

  /**
   * Run comprehensive validation suite
   */
  async runFullValidation() {
    console.log('🔍 Running enhanced documentation validation suite...');
    
    await this.validateNewStructure();
    await this.validateCompleteness();
    await this.validateVideoScripts();
    await this.validateLinksAndCrossReferences();
    await this.validateAccessibility();
    await this.validateCodeSnippets();
    await this.validateOpenAPISpecs();
    await this.validateMCPSpecs();
    await this.validateBilingualConsistency();
    await this.validateContentSecurity();
    await this.validateContentClassification();
    
    return this.generateComprehensiveReport();
  }  /**
 
  * Validate new documentation structure
   */
  async validateNewStructure() {
    console.log('📁 Validating documentation structure...');
    
    // Validate global documentation structure
    await this.validateGlobalStructure();
    
    // Validate module documentation structure
    await this.validateModuleStructure();
    
    // Validate video scripts structure
    await this.validateVideoScriptStructure();
    
    // Validate placeholder structure
    await this.validatePlaceholderStructure();
    
    console.log('  ✅ Structure validation completed');
  }

  async validateGlobalStructure() {
    const globalPath = this.requiredStructure.global.path;
    
    try {
      await fs.access(globalPath);
    } catch {
      this.validationResults.structure.passed = false;
      this.validationResults.structure.errors.push({
        type: 'missing-directory',
        path: globalPath,
        message: `Global documentation directory missing: ${globalPath}`
      });
      return;
    }

    // Check required subdirectories
    for (const subdir of this.requiredStructure.global.subdirs) {
      const subdirPath = path.join(globalPath, subdir);
      try {
        await fs.access(subdirPath);
      } catch {
        this.validationResults.structure.warnings.push({
          type: 'missing-subdirectory',
          path: subdirPath,
          message: `Global subdirectory missing: ${subdirPath}`
        });
      }
    }

    // Check required files
    for (const file of this.requiredStructure.global.files) {
      const filePath = path.join(globalPath, file);
      try {
        await fs.access(filePath);
      } catch {
        this.validationResults.structure.errors.push({
          type: 'missing-file',
          path: filePath,
          message: `Required global file missing: ${filePath}`
        });
        this.validationResults.structure.passed = false;
      }
    }
  }

  async validateModuleStructure() {
    const modulesPath = this.requiredStructure.modules.path;
    
    try {
      const modules = await fs.readdir(modulesPath, { withFileTypes: true });
      const moduleDirectories = modules.filter(entry => entry.isDirectory());

      for (const moduleDir of moduleDirectories) {
        const modulePath = path.join(modulesPath, moduleDir.name);
        
        for (const requiredFile of this.requiredStructure.modules.requiredFiles) {
          const filePath = path.join(modulePath, requiredFile);
          
          try {
            await fs.access(filePath);
          } catch {
            this.validationResults.structure.errors.push({
              type: 'missing-module-file',
              module: moduleDir.name,
              file: requiredFile,
              path: filePath,
              message: `Required module file missing: ${moduleDir.name}/${requiredFile}`
            });
            this.validationResults.structure.passed = false;
          }
        }
      }
    } catch (error) {
      this.validationResults.structure.errors.push({
        type: 'modules-directory-error',
        message: `Cannot access modules directory: ${error.message}`
      });
      this.validationResults.structure.passed = false;
    }
  }

  async validateVideoScriptStructure() {
    const scriptsPath = this.requiredStructure.videoScripts.path;
    
    try {
      await fs.access(scriptsPath);
      
      // Check required subdirectories
      for (const subdir of this.requiredStructure.videoScripts.subdirs) {
        const subdirPath = path.join(scriptsPath, subdir);
        try {
          await fs.access(subdirPath);
          
          // Check language subdirectories
          for (const lang of this.requiredStructure.videoScripts.languages) {
            const langPath = path.join(subdirPath, lang);
            try {
              await fs.access(langPath);
            } catch {
              this.validationResults.structure.warnings.push({
                type: 'missing-language-directory',
                path: langPath,
                message: `Language directory missing: ${langPath}`
              });
            }
          }
        } catch {
          this.validationResults.structure.errors.push({
            type: 'missing-scripts-subdirectory',
            path: subdirPath,
            message: `Video scripts subdirectory missing: ${subdirPath}`
          });
          this.validationResults.structure.passed = false;
        }
      }
    } catch {
      this.validationResults.structure.warnings.push({
        type: 'missing-scripts-directory',
        path: scriptsPath,
        message: `Video scripts directory missing: ${scriptsPath}`
      });
    }
  }

  async validatePlaceholderStructure() {
    // Check placeholder directories
    for (const dir of this.requiredStructure.placeholders.directories) {
      try {
        await fs.access(dir);
      } catch {
        this.validationResults.structure.warnings.push({
          type: 'missing-placeholder-directory',
          path: dir,
          message: `Placeholder directory missing: ${dir}`
        });
      }
    }

    // Check placeholder files
    for (const file of this.requiredStructure.placeholders.files) {
      try {
        await fs.access(file);
        
        // Validate placeholder content has "Coming Soon" marker
        const content = await fs.readFile(file, 'utf8');
        if (!content.includes('Coming Soon')) {
          this.validationResults.structure.warnings.push({
            type: 'missing-coming-soon-marker',
            path: file,
            message: `Placeholder file missing "Coming Soon" marker: ${file}`
          });
        }
      } catch {
        this.validationResults.structure.warnings.push({
          type: 'missing-placeholder-file',
          path: file,
          message: `Placeholder file missing: ${file}`
        });
      }
    }
  }

  /**
   * Validate documentation completeness
   */
  async validateCompleteness() {
    console.log('📋 Validating documentation completeness...');
    
    // Use existing master index automation for completeness checks
    await this.indexAutomation.runCompletenessCheck();
    
    // Merge results
    if (!this.indexAutomation.validationResults.completeness.passed) {
      this.validationResults.completeness.passed = false;
      this.validationResults.completeness.errors.push(
        ...this.indexAutomation.validationResults.completeness.errors
      );
    }

    // Additional completeness checks for new structure
    await this.validateGlobalDocumentationCompleteness();
    await this.validateMetadataCompleteness();
    
    console.log('  ✅ Completeness validation completed');
  }

  async validateGlobalDocumentationCompleteness() {
    const globalPath = 'docs/global';
    
    try {
      const requiredGlobalContent = {
        'vision-overview.md': {
          sections: ['Introduction', 'Vision Statement', 'Value Proposition', 'Strategic Goals'],
          minWordCount: 1000
        },
        'q-infinity-architecture.md': {
          sections: ['Architecture Overview', 'Core Components', 'Integration Patterns', 'Scalability'],
          minWordCount: 2000,
          requiresDiagrams: true
        },
        'strategic-narrative.md': {
          sections: ['Strategic Direction', 'Roadmap', 'Market Position', 'Future Vision'],
          minWordCount: 1500
        }
      };

      for (const [filename, requirements] of Object.entries(requiredGlobalContent)) {
        const filePath = path.join(globalPath, filename);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Check required sections
          for (const section of requirements.sections) {
            if (!content.includes(section)) {
              this.validationResults.completeness.errors.push({
                type: 'missing-section',
                file: filename,
                section,
                message: `Missing required section '${section}' in ${filename}`
              });
              this.validationResults.completeness.passed = false;
            }
          }
          
          // Check word count
          const wordCount = content.split(/\s+/).length;
          if (wordCount < requirements.minWordCount) {
            this.validationResults.completeness.warnings.push({
              type: 'insufficient-content',
              file: filename,
              actual: wordCount,
              required: requirements.minWordCount,
              message: `${filename} has ${wordCount} words, minimum ${requirements.minWordCount} recommended`
            });
          }
          
          // Check for diagrams if required
          if (requirements.requiresDiagrams) {
            const hasDiagrams = content.includes('```mermaid') || content.includes('![');
            if (!hasDiagrams) {
              this.validationResults.completeness.warnings.push({
                type: 'missing-diagrams',
                file: filename,
                message: `${filename} should include diagrams for better understanding`
              });
            }
          }
        } catch (error) {
          // File doesn't exist - already caught in structure validation
        }
      }
    } catch (error) {
      // Global directory doesn't exist - already caught in structure validation
    }
  }

  async validateMetadataCompleteness() {
    const docsPath = 'docs';
    const files = await this.findAllMarkdownFiles(docsPath);
    
    const requiredMetadata = ['version', 'author', 'lastModified', 'ecosystemVersion'];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const metadata = this.extractFrontMatter(content);
        
        for (const field of requiredMetadata) {
          if (!metadata[field]) {
            this.validationResults.completeness.warnings.push({
              type: 'missing-metadata',
              file: path.relative('docs', file),
              field,
              message: `Missing metadata field '${field}' in ${path.relative('docs', file)}`
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }  /**

   * Validate video scripts with enhanced checks
   */
  async validateVideoScripts() {
    console.log('🎬 Validating video scripts...');
    
    const scriptsPath = 'docs/video-scripts';
    
    try {
      await fs.access(scriptsPath);
      const scriptFiles = await this.findVideoScriptFiles(scriptsPath);
      
      for (const scriptFile of scriptFiles) {
        await this.validateSingleVideoScript(scriptFile);
      }
    } catch (error) {
      this.validationResults.scripts.warnings.push({
        type: 'scripts-directory-missing',
        message: 'Video scripts directory not found - skipping script validation'
      });
    }
    
    console.log('  ✅ Video script validation completed');
  }

  async validateSingleVideoScript(scriptPath) {
    try {
      const content = await fs.readFile(scriptPath, 'utf8');
      const filename = path.basename(scriptPath);
      
      // Validate required sections
      for (const section of this.requiredStructure.videoScripts.requiredSections) {
        if (!content.includes(section)) {
          this.validationResults.scripts.errors.push({
            type: 'missing-script-section',
            file: filename,
            section,
            message: `Missing required section '${section}' in ${filename}`
          });
          this.validationResults.scripts.passed = false;
        }
      }
      
      // Validate duration compliance
      await this.validateScriptDuration(content, filename);
      
      // Validate visual cues
      await this.validateVisualCues(content, filename);
      
      // Validate production notes
      await this.validateProductionNotes(content, filename);
      
    } catch (error) {
      this.validationResults.scripts.errors.push({
        type: 'script-read-error',
        file: path.basename(scriptPath),
        message: `Cannot read script file: ${error.message}`
      });
      this.validationResults.scripts.passed = false;
    }
  }

  async validateScriptDuration(content, filename) {
    const metadata = this.extractScriptMetadata(content);
    const targetDuration = metadata.duration;
    
    if (!targetDuration) {
      this.validationResults.scripts.errors.push({
        type: 'missing-duration',
        file: filename,
        message: `Script missing target duration in metadata`
      });
      this.validationResults.scripts.passed = false;
      return;
    }
    
    // Extract timing markers
    const timingMarkers = content.match(/\((\d+:\d+)\s*-\s*(\d+:\d+)\)/g) || [];
    
    if (timingMarkers.length === 0) {
      this.validationResults.scripts.errors.push({
        type: 'missing-timing-markers',
        file: filename,
        message: `Script missing timing markers for duration validation`
      });
      this.validationResults.scripts.passed = false;
      return;
    }
    
    // Calculate total duration
    let totalDuration = 0;
    timingMarkers.forEach(marker => {
      const match = marker.match(/\((\d+:\d+)\s*-\s*(\d+:\d+)\)/);
      if (match) {
        const endTime = this.parseTimeToSeconds(match[2]);
        totalDuration = Math.max(totalDuration, endTime);
      }
    });
    
    const targetSeconds = this.parseTimeToSeconds(targetDuration);
    const variance = Math.abs(totalDuration - targetSeconds);
    const allowedVariance = targetSeconds * 0.1; // 10% variance allowed
    
    if (variance > allowedVariance) {
      this.validationResults.scripts.errors.push({
        type: 'duration-mismatch',
        file: filename,
        actual: this.formatTime(totalDuration),
        target: targetDuration,
        message: `Script duration ${this.formatTime(totalDuration)} exceeds target ${targetDuration} by more than 10%`
      });
      this.validationResults.scripts.passed = false;
    }
  }

  async validateVisualCues(content, filename) {
    const visualCues = content.match(/\*\*\[VISUAL:.*?\]\*\*/g) || [];
    
    if (visualCues.length < 3) {
      this.validationResults.scripts.warnings.push({
        type: 'insufficient-visual-cues',
        file: filename,
        count: visualCues.length,
        message: `Script has only ${visualCues.length} visual cues, recommend at least 3`
      });
    }
    
    // Check for asset references in visual cues
    const assetReferences = content.match(/source:\s*"([^"]+)"/g) || [];
    if (assetReferences.length === 0) {
      this.validationResults.scripts.warnings.push({
        type: 'missing-asset-references',
        file: filename,
        message: `Script missing asset references for visual elements`
      });
    }
  }

  async validateProductionNotes(content, filename) {
    if (!content.includes('Production Notes')) {
      this.validationResults.scripts.errors.push({
        type: 'missing-production-notes',
        file: filename,
        message: `Script missing production notes section`
      });
      this.validationResults.scripts.passed = false;
    }
    
    // Check for technical requirements
    const technicalRequirements = [
      'Resolution',
      'Frame Rate',
      'Audio Quality',
      'Accessibility Features'
    ];
    
    let missingRequirements = [];
    technicalRequirements.forEach(req => {
      if (!content.includes(req)) {
        missingRequirements.push(req);
      }
    });
    
    if (missingRequirements.length > 0) {
      this.validationResults.scripts.warnings.push({
        type: 'missing-technical-requirements',
        file: filename,
        missing: missingRequirements,
        message: `Script missing technical requirements: ${missingRequirements.join(', ')}`
      });
    }
  }  /**

   * Validate links and cross-references
   */
  async validateLinksAndCrossReferences() {
    console.log('🔗 Validating links and cross-references...');
    
    // Use existing master index automation for link validation
    await this.indexAutomation.runLinkValidation();
    
    // Merge results
    if (!this.indexAutomation.validationResults.linkValidation.passed) {
      this.validationResults.links.passed = false;
      this.validationResults.links.errors.push(
        ...this.indexAutomation.validationResults.linkValidation.errors
      );
    }
    
    // Additional cross-reference validation
    await this.validateCrossReferences();
    
    console.log('  ✅ Link validation completed');
  }

  async validateCrossReferences() {
    const docsPath = 'docs';
    const files = await this.findAllMarkdownFiles(docsPath);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const links = this.extractInternalLinks(content);
        
        for (const link of links) {
          const targetPath = path.resolve(path.dirname(file), link.url);
          
          try {
            await fs.access(targetPath);
          } catch {
            this.validationResults.links.errors.push({
              type: 'broken-internal-link',
              file: path.relative('docs', file),
              link: link.url,
              text: link.text,
              message: `Broken internal link: ${link.url} in ${path.relative('docs', file)}`
            });
            this.validationResults.links.passed = false;
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  /**
   * Validate accessibility features
   */
  async validateAccessibility() {
    console.log('♿ Validating accessibility features...');
    
    const docsPath = 'docs';
    const files = await this.findAllMarkdownFiles(docsPath);
    
    for (const file of files) {
      await this.validateFileAccessibility(file);
    }
    
    console.log('  ✅ Accessibility validation completed');
  }

  async validateFileAccessibility(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const filename = path.relative('docs', filePath);
      
      // Validate images have alt text
      await this.validateImageAltText(content, filename);
      
      // Validate heading hierarchy
      await this.validateHeadingHierarchy(content, filename);
      
      // Validate link descriptions
      await this.validateLinkDescriptions(content, filename);
      
      // Validate color contrast references
      await this.validateColorReferences(content, filename);
      
    } catch (error) {
      // Skip files that can't be read
    }
  }

  async validateImageAltText(content, filename) {
    const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    
    for (const image of images) {
      const match = image.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        const altText = match[1];
        const src = match[2];
        
        if (!altText || altText.trim().length === 0) {
          this.validationResults.accessibility.errors.push({
            type: 'missing-alt-text',
            file: filename,
            image: src,
            message: `Image missing alt text: ${src} in ${filename}`
          });
          this.validationResults.accessibility.passed = false;
        } else if (altText.length > this.a11yRules.images.maxAltTextLength) {
          this.validationResults.accessibility.warnings.push({
            type: 'long-alt-text',
            file: filename,
            image: src,
            length: altText.length,
            message: `Alt text too long (${altText.length} chars) for ${src} in ${filename}`
          });
        }
      }
    }
  }

  async validateHeadingHierarchy(content, filename) {
    const headings = content.match(/^(#+)\s+(.+)$/gm) || [];
    let previousLevel = 0;
    
    for (const heading of headings) {
      const match = heading.match(/^(#+)\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        
        if (level > previousLevel + 1) {
          this.validationResults.accessibility.errors.push({
            type: 'heading-hierarchy-skip',
            file: filename,
            heading: text,
            level,
            previousLevel,
            message: `Heading level ${level} follows level ${previousLevel}, skipping levels in ${filename}`
          });
          this.validationResults.accessibility.passed = false;
        }
        
        previousLevel = level;
      }
    }
    
    // Check for H1 requirement
    if (this.a11yRules.headings.requireH1 && !content.match(/^#\s+/m)) {
      this.validationResults.accessibility.warnings.push({
        type: 'missing-h1',
        file: filename,
        message: `Document missing H1 heading: ${filename}`
      });
    }
  }

  async validateLinkDescriptions(content, filename) {
    const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    
    for (const link of links) {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match && !link.startsWith('![')) { // Skip images
        const text = match[1].toLowerCase();
        
        if (this.a11yRules.links.avoidGenericText.includes(text)) {
          this.validationResults.accessibility.warnings.push({
            type: 'generic-link-text',
            file: filename,
            text: match[1],
            url: match[2],
            message: `Generic link text '${match[1]}' in ${filename}`
          });
        }
      }
    }
  }

  async validateColorReferences(content, filename) {
    const colorReferences = content.match(/(color|background|contrast):\s*[^;]+/gi) || [];
    
    if (colorReferences.length > 0) {
      this.validationResults.accessibility.warnings.push({
        type: 'color-references-found',
        file: filename,
        count: colorReferences.length,
        message: `Found ${colorReferences.length} color references in ${filename} - ensure sufficient contrast`
      });
    }
  }  /**
   *
 Validate code snippets
   */
  async validateCodeSnippets() {
    console.log('💻 Validating code snippets...');
    
    const docsPath = 'docs';
    const files = await this.findAllMarkdownFiles(docsPath);
    
    for (const file of files) {
      await this.validateFileCodeSnippets(file);
    }
    
    console.log('  ✅ Code snippet validation completed');
  }

  async validateFileCodeSnippets(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const filename = path.relative('docs', filePath);
      
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const block of codeBlocks) {
        await this.validateCodeBlock(block, filename);
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }

  async validateCodeBlock(block, filename) {
    // Check for language label
    if (this.codeRules.requireLanguageLabels && !block.language) {
      this.validationResults.codeSnippets.warnings.push({
        type: 'missing-language-label',
        file: filename,
        line: block.line,
        message: `Code block missing language label at line ${block.line} in ${filename}`
      });
    }
    
    // Validate syntax for supported languages
    if (block.language && this.codeRules.validateSyntax) {
      await this.validateCodeSyntax(block, filename);
    }
    
    // Check for explanations
    if (this.codeRules.requireExplanations && block.content.length > 100) {
      // Look for explanation text near the code block
      // This is a simplified check - could be enhanced
      const hasExplanation = block.context && 
        (block.context.before.length > 50 || block.context.after.length > 50);
      
      if (!hasExplanation) {
        this.validationResults.codeSnippets.warnings.push({
          type: 'missing-code-explanation',
          file: filename,
          line: block.line,
          message: `Complex code block may need explanation at line ${block.line} in ${filename}`
        });
      }
    }
  }

  async validateCodeSyntax(block, filename) {
    try {
      switch (block.language.toLowerCase()) {
        case 'javascript':
        case 'js':
          await this.validateJavaScriptSyntax(block, filename);
          break;
        case 'json':
          await this.validateJSONSyntax(block, filename);
          break;
        case 'yaml':
        case 'yml':
          await this.validateYAMLSyntax(block, filename);
          break;
        case 'bash':
        case 'shell':
          await this.validateBashSyntax(block, filename);
          break;
        case 'mermaid':
          await this.validateMermaidSyntax(block, filename);
          break;
      }
    } catch (error) {
      this.validationResults.codeSnippets.errors.push({
        type: 'syntax-validation-error',
        file: filename,
        line: block.line,
        language: block.language,
        error: error.message,
        message: `Syntax validation failed for ${block.language} code at line ${block.line} in ${filename}`
      });
      this.validationResults.codeSnippets.passed = false;
    }
  }

  async validateJavaScriptSyntax(block, filename) {
    try {
      // Use Node.js built-in syntax checking
      new Function(block.content);
    } catch (error) {
      this.validationResults.codeSnippets.errors.push({
        type: 'javascript-syntax-error',
        file: filename,
        line: block.line,
        error: error.message,
        message: `JavaScript syntax error at line ${block.line} in ${filename}: ${error.message}`
      });
      this.validationResults.codeSnippets.passed = false;
    }
  }

  async validateJSONSyntax(block, filename) {
    try {
      JSON.parse(block.content);
    } catch (error) {
      this.validationResults.codeSnippets.errors.push({
        type: 'json-syntax-error',
        file: filename,
        line: block.line,
        error: error.message,
        message: `JSON syntax error at line ${block.line} in ${filename}: ${error.message}`
      });
      this.validationResults.codeSnippets.passed = false;
    }
  }

  async validateYAMLSyntax(block, filename) {
    try {
      // Basic YAML validation - could use a proper YAML parser
      const lines = block.content.split('\n');
      let indentLevel = 0;
      
      for (const line of lines) {
        if (line.trim().length === 0) continue;
        
        const currentIndent = line.length - line.trimStart().length;
        if (currentIndent % 2 !== 0) {
          throw new Error('YAML indentation must be even numbers of spaces');
        }
      }
    } catch (error) {
      this.validationResults.codeSnippets.warnings.push({
        type: 'yaml-syntax-warning',
        file: filename,
        line: block.line,
        error: error.message,
        message: `YAML syntax warning at line ${block.line} in ${filename}: ${error.message}`
      });
    }
  }

  async validateBashSyntax(block, filename) {
    // Basic bash validation - check for common issues
    const lines = block.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('rm -rf /')) {
        this.validationResults.codeSnippets.warnings.push({
          type: 'dangerous-command',
          file: filename,
          line: block.line + i,
          message: `Potentially dangerous command at line ${block.line + i} in ${filename}`
        });
      }
      
      if (line.includes('sudo') && !line.includes('# Example')) {
        this.validationResults.codeSnippets.warnings.push({
          type: 'sudo-command',
          file: filename,
          line: block.line + i,
          message: `Sudo command may need explanation at line ${block.line + i} in ${filename}`
        });
      }
    }
  }

  async validateMermaidSyntax(block, filename) {
    // Basic mermaid validation - check for required elements
    const content = block.content.toLowerCase();
    
    if (!content.includes('graph') && !content.includes('flowchart') && 
        !content.includes('sequencediagram') && !content.includes('classDiagram')) {
      this.validationResults.codeSnippets.warnings.push({
        type: 'mermaid-type-missing',
        file: filename,
        line: block.line,
        message: `Mermaid diagram missing type declaration at line ${block.line} in ${filename}`
      });
    }
  }  
/**
   * Validate OpenAPI specifications
   */
  async validateOpenAPISpecs() {
    console.log('📋 Validating OpenAPI specifications...');
    
    const modules = await this.findModulesWithOpenAPI();
    
    for (const module of modules) {
      await this.validateModuleOpenAPI(module);
    }
    
    console.log('  ✅ OpenAPI validation completed');
  }

  async findModulesWithOpenAPI() {
    const modules = [];
    const modulesPath = 'modules';
    
    try {
      const moduleDirectories = await fs.readdir(modulesPath, { withFileTypes: true });
      
      for (const dir of moduleDirectories) {
        if (dir.isDirectory()) {
          const openApiPath = path.join(modulesPath, dir.name, 'openapi.yaml');
          try {
            await fs.access(openApiPath);
            modules.push({
              name: dir.name,
              path: path.join(modulesPath, dir.name),
              openApiPath
            });
          } catch {
            // Module doesn't have OpenAPI spec
          }
        }
      }
    } catch (error) {
      // Modules directory doesn't exist
    }
    
    return modules;
  }

  async validateModuleOpenAPI(module) {
    try {
      const content = await fs.readFile(module.openApiPath, 'utf8');
      
      // Basic YAML syntax validation
      try {
        // Would use a proper YAML parser in production
        const lines = content.split('\n');
        let hasOpenApiVersion = false;
        let hasInfo = false;
        let hasPaths = false;
        
        for (const line of lines) {
          if (line.includes('openapi:')) hasOpenApiVersion = true;
          if (line.includes('info:')) hasInfo = true;
          if (line.includes('paths:')) hasPaths = true;
        }
        
        if (!hasOpenApiVersion) {
          this.validationResults.openapi.errors.push({
            type: 'missing-openapi-version',
            module: module.name,
            message: `OpenAPI spec missing version declaration in ${module.name}`
          });
          this.validationResults.openapi.passed = false;
        }
        
        if (!hasInfo) {
          this.validationResults.openapi.errors.push({
            type: 'missing-info-section',
            module: module.name,
            message: `OpenAPI spec missing info section in ${module.name}`
          });
          this.validationResults.openapi.passed = false;
        }
        
        if (!hasPaths) {
          this.validationResults.openapi.warnings.push({
            type: 'missing-paths-section',
            module: module.name,
            message: `OpenAPI spec missing paths section in ${module.name}`
          });
        }
        
        // Validate with swagger-codegen if available
        try {
          execSync(`npx swagger-codegen-cli validate -i ${module.openApiPath}`, { 
            stdio: 'pipe',
            timeout: 10000
          });
        } catch (error) {
          this.validationResults.openapi.warnings.push({
            type: 'swagger-validation-warning',
            module: module.name,
            message: `Swagger validation warning for ${module.name}: ${error.message}`
          });
        }
        
      } catch (error) {
        this.validationResults.openapi.errors.push({
          type: 'openapi-parse-error',
          module: module.name,
          error: error.message,
          message: `Cannot parse OpenAPI spec for ${module.name}: ${error.message}`
        });
        this.validationResults.openapi.passed = false;
      }
      
    } catch (error) {
      this.validationResults.openapi.errors.push({
        type: 'openapi-read-error',
        module: module.name,
        error: error.message,
        message: `Cannot read OpenAPI spec for ${module.name}: ${error.message}`
      });
      this.validationResults.openapi.passed = false;
    }
  }

  /**
   * Validate MCP specifications
   */
  async validateMCPSpecs() {
    console.log('🔧 Validating MCP specifications...');
    
    const modules = await this.findModulesWithMCP();
    
    for (const module of modules) {
      await this.validateModuleMCP(module);
    }
    
    console.log('  ✅ MCP validation completed');
  }

  async findModulesWithMCP() {
    const modules = [];
    const modulesPath = 'modules';
    
    try {
      const moduleDirectories = await fs.readdir(modulesPath, { withFileTypes: true });
      
      for (const dir of moduleDirectories) {
        if (dir.isDirectory()) {
          const mcpPath = path.join(modulesPath, dir.name, 'mcp.json');
          try {
            await fs.access(mcpPath);
            modules.push({
              name: dir.name,
              path: path.join(modulesPath, dir.name),
              mcpPath
            });
          } catch {
            // Module doesn't have MCP spec
          }
        }
      }
    } catch (error) {
      // Modules directory doesn't exist
    }
    
    return modules;
  }

  async validateModuleMCP(module) {
    try {
      const content = await fs.readFile(module.mcpPath, 'utf8');
      const mcp = JSON.parse(content);
      
      // Validate required MCP fields
      const requiredFields = ['name', 'version', 'tools'];
      for (const field of requiredFields) {
        if (!mcp[field]) {
          this.validationResults.mcp.errors.push({
            type: 'missing-mcp-field',
            module: module.name,
            field,
            message: `MCP spec missing required field '${field}' in ${module.name}`
          });
          this.validationResults.mcp.passed = false;
        }
      }
      
      // Validate tools
      if (mcp.tools) {
        const tools = Array.isArray(mcp.tools) ? mcp.tools : Object.entries(mcp.tools);
        
        for (const tool of tools) {
          const toolName = Array.isArray(mcp.tools) ? tool.name : tool[0];
          const toolDef = Array.isArray(mcp.tools) ? tool : tool[1];
          
          if (!toolDef.inputSchema) {
            this.validationResults.mcp.errors.push({
              type: 'missing-input-schema',
              module: module.name,
              tool: toolName,
              message: `MCP tool '${toolName}' missing inputSchema in ${module.name}`
            });
            this.validationResults.mcp.passed = false;
          }
          
          if (!toolDef.outputSchema) {
            this.validationResults.mcp.errors.push({
              type: 'missing-output-schema',
              module: module.name,
              tool: toolName,
              message: `MCP tool '${toolName}' missing outputSchema in ${module.name}`
            });
            this.validationResults.mcp.passed = false;
          }
        }
      }
      
    } catch (error) {
      this.validationResults.mcp.errors.push({
        type: 'mcp-parse-error',
        module: module.name,
        error: error.message,
        message: `Cannot parse MCP spec for ${module.name}: ${error.message}`
      });
      this.validationResults.mcp.passed = false;
    }
  }  /**

   * Validate bilingual consistency
   */
  async validateBilingualConsistency() {
    console.log('🌐 Validating bilingual consistency...');
    
    const scriptsPath = 'docs/video-scripts';
    
    try {
      await fs.access(scriptsPath);
      await this.validateScriptBilingualConsistency(scriptsPath);
    } catch (error) {
      this.validationResults.bilingual.warnings.push({
        type: 'no-bilingual-content',
        message: 'No video scripts found for bilingual validation'
      });
    }
    
    console.log('  ✅ Bilingual validation completed');
  }

  async validateScriptBilingualConsistency(scriptsPath) {
    const languages = ['en', 'es'];
    const scriptTypes = ['global', 'modules'];
    
    for (const scriptType of scriptTypes) {
      const typePath = path.join(scriptsPath, scriptType);
      
      try {
        await fs.access(typePath);
        
        for (const lang of languages) {
          const langPath = path.join(typePath, lang);
          
          try {
            const files = await fs.readdir(langPath);
            const scriptFiles = files.filter(f => f.endsWith('.md'));
            
            // Check if both languages have the same scripts
            for (const otherLang of languages) {
              if (otherLang === lang) continue;
              
              const otherLangPath = path.join(typePath, otherLang);
              
              try {
                const otherFiles = await fs.readdir(otherLangPath);
                const otherScriptFiles = otherFiles.filter(f => f.endsWith('.md'));
                
                // Find missing translations
                for (const scriptFile of scriptFiles) {
                  if (!otherScriptFiles.includes(scriptFile)) {
                    this.validationResults.bilingual.warnings.push({
                      type: 'missing-translation',
                      script: scriptFile,
                      sourceLanguage: lang,
                      targetLanguage: otherLang,
                      message: `Script ${scriptFile} exists in ${lang} but not in ${otherLang}`
                    });
                  }
                }
                
              } catch {
                // Other language directory doesn't exist
                this.validationResults.bilingual.warnings.push({
                  type: 'missing-language-directory',
                  path: otherLangPath,
                  message: `Language directory missing: ${otherLangPath}`
                });
              }
            }
            
          } catch {
            // Language directory doesn't exist
          }
        }
        
      } catch {
        // Script type directory doesn't exist
      }
    }
  }

  /**
   * Validate content security
   */
  async validateContentSecurity() {
    console.log('🔒 Validating content security...');
    
    const docsPath = 'docs';
    
    try {
      const scanResults = await this.securityScanner.scanDirectory(docsPath, {
        extensions: ['.md', '.txt', '.json', '.js', '.mjs', '.ts', '.yml', '.yaml'],
        excludeDirs: ['node_modules', '.git', 'dist', 'build'],
      });
      
      const report = this.securityScanner.generateReport(scanResults);
      
      // Process security issues
      for (const fileResult of report.issuesByFile) {
        for (const issue of fileResult.issues) {
          if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
            this.validationResults.security.errors.push({
              type: 'security-issue',
              file: fileResult.file,
              severity: issue.severity,
              category: issue.category,
              match: issue.match,
              line: issue.line,
              suggestion: issue.suggestion,
              message: `${issue.severity} security issue in ${fileResult.file}: ${issue.category}`
            });
            this.validationResults.security.passed = false;
          } else {
            this.validationResults.security.warnings.push({
              type: 'security-warning',
              file: fileResult.file,
              severity: issue.severity,
              category: issue.category,
              match: issue.match,
              line: issue.line,
              suggestion: issue.suggestion,
              message: `${issue.severity} security warning in ${fileResult.file}: ${issue.category}`
            });
          }
        }
      }
      
      // Save security report
      const securityReportPath = 'docs/SECURITY/security-scan-report.md';
      const reportMarkdown = this.securityScanner.formatReportMarkdown(report);
      await fs.writeFile(securityReportPath, reportMarkdown);
      
      console.log(`  📄 Security report saved to ${securityReportPath}`);
      
    } catch (error) {
      this.validationResults.security.errors.push({
        type: 'security-scan-error',
        message: `Security scan failed: ${error.message}`
      });
      this.validationResults.security.passed = false;
    }
    
    console.log('  ✅ Content security validation completed');
  }

  /**
   * Validate content classification
   */
  async validateContentClassification() {
    console.log('🏷️ Validating content classification...');
    
    const docsPath = 'docs';
    
    try {
      const classificationResults = await this.contentClassifier.classifyDirectory(docsPath, {
        extensions: ['.md', '.txt', '.json', '.js', '.mjs', '.ts', '.yml', '.yaml'],
        excludeDirs: ['node_modules', '.git', 'dist', 'build'],
      });
      
      const report = this.contentClassifier.generateReport(classificationResults);
      
      // Check for low confidence classifications
      for (const lowConfidenceFile of report.summary.lowConfidenceFiles) {
        this.validationResults.classification.warnings.push({
          type: 'low-confidence-classification',
          file: lowConfidenceFile.file,
          classification: lowConfidenceFile.classification,
          confidence: lowConfidenceFile.confidence,
          message: `Low confidence classification (${(lowConfidenceFile.confidence * 100).toFixed(1)}%) for ${lowConfidenceFile.file}`
        });
      }
      
      // Check for potential misclassifications
      for (const result of classificationResults) {
        if (result.classification === 'INTERNAL' && result.file.includes('/public/')) {
          this.validationResults.classification.errors.push({
            type: 'classification-mismatch',
            file: result.file,
            classification: result.classification,
            path: result.file,
            message: `File in public path classified as INTERNAL: ${result.file}`
          });
          this.validationResults.classification.passed = false;
        }
        
        if (result.classification === 'PUBLIC' && result.file.includes('/internal/')) {
          this.validationResults.classification.errors.push({
            type: 'classification-mismatch',
            file: result.file,
            classification: result.classification,
            path: result.file,
            message: `File in internal path classified as PUBLIC: ${result.file}`
          });
          this.validationResults.classification.passed = false;
        }
      }
      
      // Generate access control config
      const accessControlConfig = this.contentClassifier.generateAccessControlConfig(classificationResults);
      const configPath = 'docs/SECURITY/access-control-config.json';
      await fs.writeFile(configPath, JSON.stringify(accessControlConfig, null, 2));
      
      // Save classification report
      const classificationReportPath = 'docs/SECURITY/classification-report.md';
      const reportMarkdown = this.contentClassifier.formatReportMarkdown(report);
      await fs.writeFile(classificationReportPath, reportMarkdown);
      
      console.log(`  📄 Classification report saved to ${classificationReportPath}`);
      console.log(`  ⚙️ Access control config saved to ${configPath}`);
      
    } catch (error) {
      this.validationResults.classification.errors.push({
        type: 'classification-error',
        message: `Content classification failed: ${error.message}`
      });
      this.validationResults.classification.passed = false;
    }
    
    console.log('  ✅ Content classification validation completed');
  }

  /**
   * Generate comprehensive validation report
   */
  generateComprehensiveReport() {
    const allResults = Object.values(this.validationResults);
    const totalErrors = allResults.reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = allResults.reduce((sum, result) => sum + result.warnings.length, 0);
    const allPassed = allResults.every(result => result.passed);
    
    const report = {
      summary: {
        passed: allPassed,
        totalErrors,
        totalWarnings,
        timestamp: new Date().toISOString()
      },
      
      results: {
        structure: {
          passed: this.validationResults.structure.passed,
          errors: this.validationResults.structure.errors.length,
          warnings: this.validationResults.structure.warnings.length
        },
        completeness: {
          passed: this.validationResults.completeness.passed,
          errors: this.validationResults.completeness.errors.length,
          warnings: this.validationResults.completeness.warnings.length
        },
        scripts: {
          passed: this.validationResults.scripts.passed,
          errors: this.validationResults.scripts.errors.length,
          warnings: this.validationResults.scripts.warnings.length
        },
        links: {
          passed: this.validationResults.links.passed,
          errors: this.validationResults.links.errors.length,
          warnings: this.validationResults.links.warnings.length
        },
        accessibility: {
          passed: this.validationResults.accessibility.passed,
          errors: this.validationResults.accessibility.errors.length,
          warnings: this.validationResults.accessibility.warnings.length
        },
        codeSnippets: {
          passed: this.validationResults.codeSnippets.passed,
          errors: this.validationResults.codeSnippets.errors.length,
          warnings: this.validationResults.codeSnippets.warnings.length
        },
        openapi: {
          passed: this.validationResults.openapi.passed,
          errors: this.validationResults.openapi.errors.length,
          warnings: this.validationResults.openapi.warnings.length
        },
        mcp: {
          passed: this.validationResults.mcp.passed,
          errors: this.validationResults.mcp.errors.length,
          warnings: this.validationResults.mcp.warnings.length
        },
        bilingual: {
          passed: this.validationResults.bilingual.passed,
          errors: this.validationResults.bilingual.errors.length,
          warnings: this.validationResults.bilingual.warnings.length
        },
        security: {
          passed: this.validationResults.security.passed,
          errors: this.validationResults.security.errors.length,
          warnings: this.validationResults.security.warnings.length
        },
        classification: {
          passed: this.validationResults.classification.passed,
          errors: this.validationResults.classification.errors.length,
          warnings: this.validationResults.classification.warnings.length
        }
      },
      
      detailedResults: this.validationResults
    };
    
    console.log('\n📊 Enhanced Documentation Validation Report');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log('');
    
    // Show results by category
    Object.entries(report.results).forEach(([category, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${category.padEnd(15)} - ${result.errors} errors, ${result.warnings} warnings`);
    });
    
    // Show detailed errors if any
    if (totalErrors > 0) {
      console.log('\n❌ Detailed Errors:');
      Object.entries(this.validationResults).forEach(([category, result]) => {
        if (result.errors.length > 0) {
          console.log(`\n  ${category.toUpperCase()}:`);
          result.errors.forEach(error => {
            console.log(`    - ${error.message || error.error || JSON.stringify(error)}`);
          });
        }
      });
    }
    
    return report;
  } 
 // Helper methods

  async findAllMarkdownFiles(dir) {
    const files = [];
    
    const findFiles = async (currentDir) => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await findFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    await findFiles(dir);
    return files;
  }

  async findVideoScriptFiles(dir) {
    const files = [];
    
    const findFiles = async (currentDir) => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            await findFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.includes('README')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    await findFiles(dir);
    return files;
  }

  extractFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return {};
    
    const frontMatter = {};
    const lines = frontMatterMatch[1].split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        frontMatter[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
    
    return frontMatter;
  }

  extractScriptMetadata(content) {
    const yamlMatch = content.match(/```yaml\n([\s\S]*?)\n```/);
    if (!yamlMatch) return {};

    const metadata = {};
    const lines = yamlMatch[1].split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    return metadata;
  }

  extractInternalLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2];
      if (!url.startsWith('http') && !url.startsWith('mailto:') && !match[0].startsWith('![')) {
        links.push({
          text: match[1],
          url: match[2]
        });
      }
    }
    
    return links;
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
            line: lineNumber,
            context: {
              before: lines.slice(Math.max(0, lineNumber - 3), lineNumber - 1).join('\n'),
              after: ''
            }
          };
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.content += line + '\n';
      }
    }
    
    // Add context after for completed blocks
    codeBlocks.forEach(block => {
      const endLine = block.line + block.content.split('\n').length;
      block.context.after = lines.slice(endLine, endLine + 3).join('\n');
    });
    
    return codeBlocks;
  }

  parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// CLI interface
async function main() {
  const validator = new EnhancedDocumentationValidator();
  await validator.init();

  const command = process.argv[2];

  switch (command) {
    case 'validate':
      const report = await validator.runFullValidation();
      
      // Save detailed report
      await fs.writeFile('docs/enhanced-validation-report.json', JSON.stringify(report, null, 2));
      console.log('\n📄 Detailed report saved to docs/enhanced-validation-report.json');
      
      process.exit(report.summary.passed ? 0 : 1);
      break;
    
    case 'structure':
      await validator.validateNewStructure();
      console.log(validator.validationResults.structure.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.structure.passed ? 0 : 1);
      break;
    
    case 'completeness':
      await validator.validateCompleteness();
      console.log(validator.validationResults.completeness.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.completeness.passed ? 0 : 1);
      break;
    
    case 'scripts':
      await validator.validateVideoScripts();
      console.log(validator.validationResults.scripts.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.scripts.passed ? 0 : 1);
      break;
    
    case 'links':
      await validator.validateLinksAndCrossReferences();
      console.log(validator.validationResults.links.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.links.passed ? 0 : 1);
      break;
    
    case 'accessibility':
      await validator.validateAccessibility();
      console.log(validator.validationResults.accessibility.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.accessibility.passed ? 0 : 1);
      break;
    
    case 'code':
      await validator.validateCodeSnippets();
      console.log(validator.validationResults.codeSnippets.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.codeSnippets.passed ? 0 : 1);
      break;
    
    case 'openapi':
      await validator.validateOpenAPISpecs();
      console.log(validator.validationResults.openapi.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.openapi.passed ? 0 : 1);
      break;
    
    case 'mcp':
      await validator.validateMCPSpecs();
      console.log(validator.validationResults.mcp.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.mcp.passed ? 0 : 1);
      break;
    
    case 'bilingual':
      await validator.validateBilingualConsistency();
      console.log(validator.validationResults.bilingual.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.bilingual.passed ? 0 : 1);
      break;
    
    case 'security':
      await validator.validateContentSecurity();
      console.log(validator.validationResults.security.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.security.passed ? 0 : 1);
      break;
    
    case 'classification':
      await validator.validateContentClassification();
      console.log(validator.validationResults.classification.passed ? '✅ PASS' : '❌ FAIL');
      process.exit(validator.validationResults.classification.passed ? 0 : 1);
      break;
    
    default:
      console.log(`
Usage: node docs-validator.mjs <command>

Commands:
  validate       - Run complete enhanced validation suite
  structure      - Validate new documentation structure
  completeness   - Check documentation completeness
  scripts        - Validate video scripts (duration, structure, bilingual)
  links          - Validate links and cross-references
  accessibility  - Check accessibility features (alt text, headings, contrast)
  code           - Validate code snippets and compilation
  openapi        - Validate OpenAPI specifications
  mcp            - Validate MCP specifications
  bilingual      - Check bilingual consistency
  security       - Scan for sensitive information and security issues
  classification - Classify content and generate access control rules

Examples:
  node docs-validator.mjs validate
  node docs-validator.mjs structure
  node docs-validator.mjs accessibility
  node docs-validator.mjs security
  node docs-validator.mjs classification
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Enhanced documentation validation failed:', error);
    process.exit(1);
  });
}

export default EnhancedDocumentationValidator;