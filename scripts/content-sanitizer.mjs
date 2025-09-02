#!/usr/bin/env node

/**
 * Content Sanitizer
 * Automatically sanitizes documentation by redacting sensitive information
 */

import fs from 'fs/promises';
import path from 'path';
import { ContentSecurityScanner } from './content-security-scanner.mjs';

class ContentSanitizer {
  constructor() {
    this.scanner = new ContentSecurityScanner();
    
    this.sanitizationRules = {
      // API Keys and Tokens
      apiKeys: {
        patterns: [
          /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
          /(?:access[_-]?token|accesstoken)\s*[:=]\s*['"]?([a-zA-Z0-9_.-]{20,})['"]?/gi,
          /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
          /(?:bearer\s+)([a-zA-Z0-9_.-]{20,})/gi,
        ],
        replacement: (match, key) => match.replace(key, '[REDACTED-API-KEY]'),
      },
      
      // Database Credentials
      dbCredentials: {
        patterns: [
          /(?:password|pwd)\s*[:=]\s*['"]?([^'"\s]{8,})['"]?/gi,
          /(?:username|user)\s*[:=]\s*['"]?([a-zA-Z0-9_.-]{3,})['"]?/gi,
          /(mongodb:\/\/[^:]+:)[^@]+(@)/gi,
          /(postgres:\/\/[^:]+:)[^@]+(@)/gi,
          /(mysql:\/\/[^:]+:)[^@]+(@)/gi,
        ],
        replacement: (match, ...groups) => {
          if (match.includes('://')) {
            return `${groups[0]}[REDACTED]${groups[1]}`;
          }
          return match.replace(groups[0], '[REDACTED]');
        },
      },
      
      // Private Keys
      privateKeys: {
        patterns: [
          /(-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)([\s\S]*?)(-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/gi,
          /(-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----)([\s\S]*?)(-----END\s+OPENSSH\s+PRIVATE\s+KEY-----)/gi,
          /(-----BEGIN\s+EC\s+PRIVATE\s+KEY-----)([\s\S]*?)(-----END\s+EC\s+PRIVATE\s+KEY-----)/gi,
        ],
        replacement: (match, begin, content, end) => 
          `${begin}\n[REDACTED-PRIVATE-KEY]\n${end}`,
      },
      
      // Private Endpoints
      privateEndpoints: {
        patterns: [
          /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/gi,
          /https?:\/\/([^\/\s]+\.local)(:\d+)?/gi,
          /https?:\/\/([^\/\s]*(?:dev|test|staging|internal)[^\/\s]*\.[^\/\s]+)/gi,
        ],
        replacement: (match) => match.replace(/https?:\/\/[^\/\s]+/, 'https://example.com'),
      },
      
      // Private IP Addresses
      privateIPs: {
        patterns: [
          /\b(?:10\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
          /\b(?:172\.(?:1[6-9]|2[0-9]|3[01])\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
          /\b(?:192\.168\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
        ],
        replacement: () => '192.0.2.1', // RFC 5737 example IP
      },
      
      // Email Addresses
      emails: {
        patterns: [
          /\b[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        ],
        replacement: () => 'user@example.com',
      },
      
      // Phone Numbers
      phoneNumbers: {
        patterns: [
          /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
          /\+[1-9]\d{1,14}/g,
        ],
        replacement: () => '+1-555-0123',
      },
      
      // Crypto Keys (partial redaction to maintain format)
      cryptoKeys: {
        patterns: [
          /(0x)([a-fA-F0-9]{4})([a-fA-F0-9]{32})([a-fA-F0-9]{4})/g, // Ethereum
          /([13])([a-km-zA-HJ-NP-Z1-9]{4})([a-km-zA-HJ-NP-Z1-9]+)([a-km-zA-HJ-NP-Z1-9]{4})/g, // Bitcoin
        ],
        replacement: (match, prefix, start, middle, end) => 
          `${prefix}${start}${'*'.repeat(Math.min(middle.length, 20))}${end}`,
      },
    };

    // Patterns that should never be sanitized (examples, placeholders)
    this.preservePatterns = [
      /example\.com/gi,
      /user@example\.com/gi,
      /\[.*?\]/g, // Bracketed placeholders
      /\{.*?\}/g, // Curly brace placeholders
      /\$\{.*?\}/g, // Environment variable syntax
      /process\.env\./gi,
      /your-.*?-here/gi,
      /\*{3,}/g, // Already redacted content
    ];
  }

  /**
   * Check if content should be preserved (not sanitized)
   */
  shouldPreserve(content) {
    return this.preservePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Sanitize content by applying all sanitization rules
   */
  sanitizeContent(content) {
    let sanitized = content;
    const changes = [];

    for (const [category, rule] of Object.entries(this.sanitizationRules)) {
      for (const pattern of rule.patterns) {
        const matches = [...sanitized.matchAll(pattern)];
        
        for (const match of matches) {
          const originalMatch = match[0];
          
          // Skip if this content should be preserved
          if (this.shouldPreserve(originalMatch)) {
            continue;
          }

          const replacement = rule.replacement(originalMatch, ...match.slice(1));
          
          if (replacement !== originalMatch) {
            sanitized = sanitized.replace(originalMatch, replacement);
            changes.push({
              category,
              original: originalMatch,
              replacement,
              line: this.getLineNumber(content, match.index),
            });
          }
        }
      }
    }

    return {
      content: sanitized,
      changes,
      wasSanitized: changes.length > 0,
    };
  }

  /**
   * Get line number for a match index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Sanitize a single file
   */
  async sanitizeFile(filePath, options = {}) {
    const { dryRun = false, backup = true } = options;
    
    try {
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const result = this.sanitizeContent(originalContent);
      
      if (result.wasSanitized && !dryRun) {
        // Create backup if requested
        if (backup) {
          const backupPath = `${filePath}.backup-${Date.now()}`;
          await fs.writeFile(backupPath, originalContent);
        }
        
        // Write sanitized content
        await fs.writeFile(filePath, result.content);
      }
      
      return {
        file: filePath,
        sanitized: result.wasSanitized,
        changes: result.changes,
        dryRun,
      };
    } catch (error) {
      return {
        file: filePath,
        sanitized: false,
        changes: [],
        error: error.message,
      };
    }
  }

  /**
   * Sanitize directory recursively
   */
  async sanitizeDirectory(dirPath, options = {}) {
    const {
      extensions = ['.md', '.txt', '.json', '.js', '.mjs', '.ts', '.yml', '.yaml'],
      excludeDirs = ['node_modules', '.git', 'dist', 'build'],
      maxDepth = 10,
      dryRun = false,
      backup = true,
    } = options;

    const results = [];
    
    const sanitizeRecursive = async (currentPath, depth = 0) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              await sanitizeRecursive(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              const result = await this.sanitizeFile(fullPath, { dryRun, backup });
              results.push(result);
            }
          }
        }
      } catch (error) {
        console.error(`Error sanitizing directory ${currentPath}:`, error.message);
      }
    };
    
    await sanitizeRecursive(dirPath);
    return results;
  }

  /**
   * Generate sanitization report
   */
  generateReport(sanitizationResults) {
    const summary = {
      totalFiles: sanitizationResults.length,
      filesSanitized: sanitizationResults.filter(r => r.sanitized).length,
      totalChanges: sanitizationResults.reduce((sum, r) => sum + r.changes.length, 0),
      categoryCounts: {},
    };

    const sanitizedFiles = [];
    
    for (const result of sanitizationResults) {
      if (result.sanitized) {
        sanitizedFiles.push(result);
        
        for (const change of result.changes) {
          summary.categoryCounts[change.category] = 
            (summary.categoryCounts[change.category] || 0) + 1;
        }
      }
    }

    return {
      summary,
      sanitizedFiles,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format report as markdown
   */
  formatReportMarkdown(report) {
    const { summary, sanitizedFiles } = report;
    
    let markdown = `# Content Sanitization Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Files Processed:** ${summary.totalFiles}\n`;
    markdown += `- **Files Sanitized:** ${summary.filesSanitized}\n`;
    markdown += `- **Total Changes:** ${summary.totalChanges}\n\n`;
    
    // Category breakdown
    if (Object.keys(summary.categoryCounts).length > 0) {
      markdown += `### Changes by Category\n\n`;
      for (const [category, count] of Object.entries(summary.categoryCounts)) {
        markdown += `- **${category}:** ${count}\n`;
      }
      markdown += `\n`;
    }
    
    // Detailed changes
    if (sanitizedFiles.length > 0) {
      markdown += `## Detailed Changes\n\n`;
      
      for (const fileResult of sanitizedFiles) {
        markdown += `### ${fileResult.file}\n\n`;
        
        for (const change of fileResult.changes) {
          markdown += `**Line ${change.line}:** ${change.category}\n`;
          markdown += `- **Original:** \`${change.original}\`\n`;
          markdown += `- **Sanitized:** \`${change.replacement}\`\n\n`;
        }
      }
    }
    
    return markdown;
  }
}

// CLI functionality
async function main() {
  const sanitizer = new ContentSanitizer();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node content-sanitizer.mjs <directory> [--dry-run] [--no-backup] [--output <file>]');
    process.exit(1);
  }
  
  const sanitizePath = args[0];
  const dryRun = args.includes('--dry-run');
  const backup = !args.includes('--no-backup');
  const outputIndex = args.indexOf('--output');
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
  
  console.log(`${dryRun ? 'Analyzing' : 'Sanitizing'} ${sanitizePath}...`);
  
  const results = await sanitizer.sanitizeDirectory(sanitizePath, { dryRun, backup });
  const report = sanitizer.generateReport(results);
  
  const output = sanitizer.formatReportMarkdown(report);
  
  if (outputFile) {
    await fs.writeFile(outputFile, output);
    console.log(`Report saved to ${outputFile}`);
  } else {
    console.log(output);
  }
  
  if (dryRun) {
    console.log('\nDry run completed. Use without --dry-run to apply changes.');
  } else {
    console.log(`\nSanitization completed. ${report.summary.filesSanitized} files sanitized.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ContentSanitizer };