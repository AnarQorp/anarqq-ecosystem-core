#!/usr/bin/env node

/**
 * Content Classification System
 * Classifies documentation content as public/partner/internal with access controls
 */

import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';

class ContentClassifier {
  constructor() {
    this.classificationLevels = {
      PUBLIC: {
        level: 0,
        description: 'Publicly accessible content',
        restrictions: [],
        allowedAudiences: ['public', 'partner', 'internal'],
      },
      PARTNER: {
        level: 1,
        description: 'Partner-only content',
        restrictions: ['requires_partner_access'],
        allowedAudiences: ['partner', 'internal'],
      },
      INTERNAL: {
        level: 2,
        description: 'Internal team only',
        restrictions: ['requires_internal_access', 'no_external_sharing'],
        allowedAudiences: ['internal'],
      },
    };

    // Patterns that indicate different classification levels
    this.classificationPatterns = {
      INTERNAL: [
        // Internal infrastructure
        /(?:internal|private|confidential)\s+(?:api|endpoint|service)/gi,
        /(?:admin|management)\s+(?:interface|dashboard|panel)/gi,
        /(?:development|staging|test)\s+environment/gi,
        
        // Internal processes
        /(?:internal|private)\s+(?:process|workflow|procedure)/gi,
        /(?:team|staff)\s+(?:only|exclusive|restricted)/gi,
        /(?:confidential|proprietary)\s+(?:information|data|algorithm)/gi,
        
        // Security-related
        /(?:security|auth|authentication)\s+(?:implementation|details|keys)/gi,
        /(?:private|secret)\s+(?:key|token|credential)/gi,
        /(?:vulnerability|exploit|security\s+issue)/gi,
        
        // Business sensitive
        /(?:revenue|financial|business)\s+(?:model|strategy|plan)/gi,
        /(?:competitive|strategic)\s+(?:advantage|information)/gi,
        /(?:internal|private)\s+(?:meeting|discussion|decision)/gi,
      ],
      
      PARTNER: [
        // Partner-specific content
        /(?:partner|integration)\s+(?:api|sdk|documentation)/gi,
        /(?:b2b|business)\s+(?:integration|partnership)/gi,
        /(?:enterprise|commercial)\s+(?:features|functionality)/gi,
        
        // Advanced features
        /(?:advanced|premium)\s+(?:configuration|setup|features)/gi,
        /(?:white-label|custom)\s+(?:branding|implementation)/gi,
        /(?:enterprise|business)\s+(?:deployment|architecture)/gi,
        
        // Technical details
        /(?:technical|implementation)\s+(?:details|specifications)/gi,
        /(?:architecture|system)\s+(?:design|implementation)/gi,
        /(?:performance|scalability)\s+(?:considerations|requirements)/gi,
      ],
      
      PUBLIC: [
        // General documentation
        /(?:getting\s+started|quick\s+start|tutorial)/gi,
        /(?:user|end-user)\s+(?:guide|documentation|manual)/gi,
        /(?:public|open)\s+(?:api|documentation|guide)/gi,
        
        // Basic features
        /(?:basic|standard)\s+(?:features|functionality|usage)/gi,
        /(?:overview|introduction|about)/gi,
        /(?:faq|frequently\s+asked\s+questions)/gi,
        
        // Community content
        /(?:community|open\s+source|public)/gi,
        /(?:example|sample|demo)/gi,
        /(?:changelog|release\s+notes|updates)/gi,
      ],
    };

    // File path patterns for classification
    this.pathPatterns = {
      INTERNAL: [
        /\/internal\//gi,
        /\/private\//gi,
        /\/admin\//gi,
        /\/security\//gi,
        /\/confidential\//gi,
        /\.internal\./gi,
        /\.private\./gi,
      ],
      
      PARTNER: [
        /\/partner\//gi,
        /\/enterprise\//gi,
        /\/b2b\//gi,
        /\/integration\//gi,
        /\.partner\./gi,
        /\.enterprise\./gi,
      ],
      
      PUBLIC: [
        /\/public\//gi,
        /\/docs\//gi,
        /\/guide\//gi,
        /\/tutorial\//gi,
        /\/example\//gi,
        /readme/gi,
        /changelog/gi,
      ],
    };

    // Metadata keywords for classification
    this.metadataKeywords = {
      INTERNAL: ['internal', 'private', 'confidential', 'restricted', 'team-only'],
      PARTNER: ['partner', 'enterprise', 'b2b', 'integration', 'advanced'],
      PUBLIC: ['public', 'open', 'community', 'general', 'basic'],
    };
  }

  /**
   * Classify content based on patterns and metadata
   */
  classifyContent(content, filePath, metadata = {}) {
    const scores = { PUBLIC: 0, PARTNER: 0, INTERNAL: 0 };
    const reasons = [];

    // Check file path patterns
    for (const [level, patterns] of Object.entries(this.pathPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          scores[level] += 10;
          reasons.push(`Path pattern: ${pattern.source}`);
        }
      }
    }

    // Check content patterns
    for (const [level, patterns] of Object.entries(this.classificationPatterns)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          scores[level] += matches.length * 2;
          reasons.push(`Content pattern: ${pattern.source} (${matches.length} matches)`);
        }
      }
    }

    // Check metadata keywords
    if (metadata.tags) {
      for (const [level, keywords] of Object.entries(this.metadataKeywords)) {
        for (const keyword of keywords) {
          if (metadata.tags.includes(keyword)) {
            scores[level] += 5;
            reasons.push(`Metadata tag: ${keyword}`);
          }
        }
      }
    }

    // Check explicit classification in metadata
    if (metadata.classification) {
      const explicitLevel = metadata.classification.toUpperCase();
      if (this.classificationLevels[explicitLevel]) {
        scores[explicitLevel] += 20;
        reasons.push(`Explicit metadata classification: ${explicitLevel}`);
      }
    }

    // Determine final classification
    const maxScore = Math.max(...Object.values(scores));
    const classification = Object.keys(scores).find(level => scores[level] === maxScore) || 'PUBLIC';
    
    // Apply minimum classification rules
    let finalClassification = classification;
    
    // If any INTERNAL patterns found, minimum is INTERNAL
    if (scores.INTERNAL > 0 && classification !== 'INTERNAL') {
      finalClassification = 'INTERNAL';
      reasons.push('Elevated to INTERNAL due to sensitive content detection');
    }
    
    // If any PARTNER patterns found and not INTERNAL, minimum is PARTNER
    else if (scores.PARTNER > 0 && classification === 'PUBLIC') {
      finalClassification = 'PARTNER';
      reasons.push('Elevated to PARTNER due to advanced content detection');
    }

    return {
      classification: finalClassification,
      confidence: maxScore > 0 ? Math.min(maxScore / 10, 1) : 0.1,
      scores,
      reasons,
      metadata: this.classificationLevels[finalClassification],
    };
  }

  /**
   * Extract metadata from file content
   */
  extractMetadata(content) {
    const metadata = {};
    
    // Try to extract YAML front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      try {
        const yamlContent = yaml.load(frontMatterMatch[1]);
        Object.assign(metadata, yamlContent);
      } catch (error) {
        // Ignore YAML parsing errors
      }
    }
    
    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch && !metadata.title) {
      metadata.title = titleMatch[1].trim();
    }
    
    // Extract tags from content
    const tagMatches = content.match(/(?:tags?|keywords?):\s*([^\n]+)/gi);
    if (tagMatches && !metadata.tags) {
      metadata.tags = tagMatches[0]
        .replace(/(?:tags?|keywords?):\s*/gi, '')
        .split(/[,\s]+/)
        .filter(tag => tag.length > 0);
    }
    
    return metadata;
  }

  /**
   * Classify a single file
   */
  async classifyFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const metadata = this.extractMetadata(content);
      const classification = this.classifyContent(content, filePath, metadata);
      
      return {
        file: filePath,
        ...classification,
        metadata,
        processed: true,
      };
    } catch (error) {
      return {
        file: filePath,
        classification: 'PUBLIC',
        confidence: 0,
        scores: { PUBLIC: 0, PARTNER: 0, INTERNAL: 0 },
        reasons: [],
        metadata: this.classificationLevels.PUBLIC,
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Classify directory recursively
   */
  async classifyDirectory(dirPath, options = {}) {
    const {
      extensions = ['.md', '.txt', '.json', '.js', '.mjs', '.ts', '.yml', '.yaml'],
      excludeDirs = ['node_modules', '.git', 'dist', 'build'],
      maxDepth = 10,
    } = options;

    const results = [];
    
    const classifyRecursive = async (currentPath, depth = 0) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              await classifyRecursive(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              const result = await this.classifyFile(fullPath);
              results.push(result);
            }
          }
        }
      } catch (error) {
        console.error(`Error classifying directory ${currentPath}:`, error.message);
      }
    };
    
    await classifyRecursive(dirPath);
    return results;
  }

  /**
   * Generate access control rules
   */
  generateAccessControlRules(classificationResults) {
    const rules = {
      public: [],
      partner: [],
      internal: [],
    };

    for (const result of classificationResults) {
      const level = result.classification.toLowerCase();
      
      switch (level) {
        case 'public':
          rules.public.push(result.file);
          rules.partner.push(result.file);
          rules.internal.push(result.file);
          break;
        case 'partner':
          rules.partner.push(result.file);
          rules.internal.push(result.file);
          break;
        case 'internal':
          rules.internal.push(result.file);
          break;
      }
    }

    return rules;
  }

  /**
   * Generate classification report
   */
  generateReport(classificationResults) {
    const summary = {
      totalFiles: classificationResults.length,
      classificationCounts: { PUBLIC: 0, PARTNER: 0, INTERNAL: 0 },
      averageConfidence: 0,
      lowConfidenceFiles: [],
    };

    let totalConfidence = 0;
    
    for (const result of classificationResults) {
      summary.classificationCounts[result.classification]++;
      totalConfidence += result.confidence;
      
      if (result.confidence < 0.5) {
        summary.lowConfidenceFiles.push({
          file: result.file,
          classification: result.classification,
          confidence: result.confidence,
        });
      }
    }

    summary.averageConfidence = totalConfidence / classificationResults.length;

    const accessControlRules = this.generateAccessControlRules(classificationResults);

    return {
      summary,
      classificationResults,
      accessControlRules,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format report as markdown
   */
  formatReportMarkdown(report) {
    const { summary, classificationResults, accessControlRules } = report;
    
    let markdown = `# Content Classification Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Files Classified:** ${summary.totalFiles}\n`;
    markdown += `- **Average Confidence:** ${(summary.averageConfidence * 100).toFixed(1)}%\n\n`;
    
    // Classification breakdown
    markdown += `### Classification Distribution\n\n`;
    for (const [level, count] of Object.entries(summary.classificationCounts)) {
      const percentage = ((count / summary.totalFiles) * 100).toFixed(1);
      markdown += `- **${level}:** ${count} files (${percentage}%)\n`;
    }
    markdown += `\n`;
    
    // Access control summary
    markdown += `### Access Control Summary\n\n`;
    markdown += `- **Public Access:** ${accessControlRules.public.length} files\n`;
    markdown += `- **Partner Access:** ${accessControlRules.partner.length} files\n`;
    markdown += `- **Internal Access:** ${accessControlRules.internal.length} files\n\n`;
    
    // Low confidence files
    if (summary.lowConfidenceFiles.length > 0) {
      markdown += `### Low Confidence Classifications\n\n`;
      markdown += `The following files have low confidence scores and may need manual review:\n\n`;
      
      for (const file of summary.lowConfidenceFiles) {
        markdown += `- **${file.file}** - ${file.classification} (${(file.confidence * 100).toFixed(1)}% confidence)\n`;
      }
      markdown += `\n`;
    }
    
    // Detailed classifications
    markdown += `## Detailed Classifications\n\n`;
    
    const byClassification = {
      INTERNAL: classificationResults.filter(r => r.classification === 'INTERNAL'),
      PARTNER: classificationResults.filter(r => r.classification === 'PARTNER'),
      PUBLIC: classificationResults.filter(r => r.classification === 'PUBLIC'),
    };
    
    for (const [level, files] of Object.entries(byClassification)) {
      if (files.length > 0) {
        markdown += `### ${level} Files (${files.length})\n\n`;
        
        for (const file of files) {
          markdown += `#### ${file.file}\n`;
          markdown += `- **Confidence:** ${(file.confidence * 100).toFixed(1)}%\n`;
          if (file.reasons.length > 0) {
            markdown += `- **Reasons:**\n`;
            for (const reason of file.reasons) {
              markdown += `  - ${reason}\n`;
            }
          }
          markdown += `\n`;
        }
      }
    }
    
    return markdown;
  }

  /**
   * Generate access control configuration
   */
  generateAccessControlConfig(classificationResults) {
    const config = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      accessLevels: this.classificationLevels,
      rules: this.generateAccessControlRules(classificationResults),
      fileClassifications: {},
    };

    for (const result of classificationResults) {
      config.fileClassifications[result.file] = {
        classification: result.classification,
        confidence: result.confidence,
        allowedAudiences: this.classificationLevels[result.classification].allowedAudiences,
        restrictions: this.classificationLevels[result.classification].restrictions,
      };
    }

    return config;
  }
}

// CLI functionality
async function main() {
  const classifier = new ContentClassifier();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node content-classifier.mjs <directory> [--output <file>] [--config <file>] [--format json|markdown]');
    process.exit(1);
  }
  
  const classifyPath = args[0];
  const outputIndex = args.indexOf('--output');
  const configIndex = args.indexOf('--config');
  const formatIndex = args.indexOf('--format');
  
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
  const configFile = configIndex !== -1 ? args[configIndex + 1] : null;
  const format = formatIndex !== -1 ? args[formatIndex + 1] : 'markdown';
  
  console.log(`Classifying content in ${classifyPath}...`);
  
  const results = await classifier.classifyDirectory(classifyPath);
  const report = classifier.generateReport(results);
  
  // Generate and save access control config if requested
  if (configFile) {
    const config = classifier.generateAccessControlConfig(results);
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
    console.log(`Access control config saved to ${configFile}`);
  }
  
  // Generate report
  if (format === 'json') {
    const output = JSON.stringify(report, null, 2);
    if (outputFile) {
      await fs.writeFile(outputFile, output);
      console.log(`Report saved to ${outputFile}`);
    } else {
      console.log(output);
    }
  } else {
    const output = classifier.formatReportMarkdown(report);
    if (outputFile) {
      await fs.writeFile(outputFile, output);
      console.log(`Report saved to ${outputFile}`);
    } else {
      console.log(output);
    }
  }
  
  console.log(`\nClassification completed: ${report.summary.totalFiles} files processed`);
  console.log(`Distribution: ${report.summary.classificationCounts.PUBLIC} public, ${report.summary.classificationCounts.PARTNER} partner, ${report.summary.classificationCounts.INTERNAL} internal`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ContentClassifier };