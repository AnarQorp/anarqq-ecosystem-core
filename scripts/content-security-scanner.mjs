#!/usr/bin/env node

/**
 * Content Security Scanner
 * Scans documentation for secrets, sensitive information, and security issues
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContentSecurityScanner {
  constructor() {
    this.securityPatterns = {
      // API Keys and Tokens
      apiKeys: [
        /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        /(?:access[_-]?token|accesstoken)\s*[:=]\s*['"]?([a-zA-Z0-9_.-]{20,})['"]?/gi,
        /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        /(?:bearer\s+)([a-zA-Z0-9_.-]{20,})/gi,
      ],
      
      // Database Credentials
      dbCredentials: [
        /(?:password|pwd)\s*[:=]\s*['"]?([^'"\s]{8,})['"]?/gi,
        /(?:username|user)\s*[:=]\s*['"]?([a-zA-Z0-9_.-]{3,})['"]?/gi,
        /mongodb:\/\/[^:]+:[^@]+@/gi,
        /postgres:\/\/[^:]+:[^@]+@/gi,
        /mysql:\/\/[^:]+:[^@]+@/gi,
      ],
      
      // Private Keys and Certificates
      privateKeys: [
        /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
        /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/gi,
        /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/gi,
        /-----BEGIN\s+CERTIFICATE-----/gi,
      ],
      
      // URLs and Endpoints
      privateEndpoints: [
        /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/gi,
        /https?:\/\/[^\/\s]+\.local(?::\d+)?/gi,
        /https?:\/\/[^\/\s]*(?:dev|test|staging|internal)[^\/\s]*\.[^\/\s]+/gi,
        /(?:http|https):\/\/[^\/\s]*(?:admin|private|internal)[^\/\s]*/gi,
      ],
      
      // IP Addresses (private ranges)
      privateIPs: [
        /\b(?:10\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
        /\b(?:172\.(?:1[6-9]|2[0-9]|3[01])\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
        /\b(?:192\.168\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
      ],
      
      // Email Addresses (potentially sensitive)
      emails: [
        /\b[A-Za-z0-9._%+-]+@(?:gmail|yahoo|hotmail|outlook)\.com\b/gi,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      ],
      
      // Phone Numbers
      phoneNumbers: [
        /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
        /\+[1-9]\d{1,14}/g,
      ],
      
      // Blockchain/Crypto
      cryptoKeys: [
        /0x[a-fA-F0-9]{40}/g, // Ethereum addresses
        /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g, // Bitcoin addresses
        /bc1[a-z0-9]{39,59}/g, // Bech32 addresses
      ],
    };

    this.whitelistPatterns = [
      // Common example patterns that are safe
      /example\.com/gi,
      /localhost:3000/gi, // Common dev port in examples
      /127\.0\.0\.1:8080/gi, // Common example
      /user@example\.com/gi,
      /api-key-here/gi,
      /your-secret-key/gi,
      /\[your-api-key\]/gi,
      /\{api-key\}/gi,
      /\$\{API_KEY\}/gi,
      /process\.env\./gi,
    ];
  }

  /**
   * Scan a single file for security issues
   */
  async scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const issues = [];
      
      // Skip if content matches whitelist patterns
      const isWhitelisted = this.whitelistPatterns.some(pattern => 
        pattern.test(content)
      );
      
      for (const [category, patterns] of Object.entries(this.securityPatterns)) {
        for (const pattern of patterns) {
          const matches = [...content.matchAll(pattern)];
          
          for (const match of matches) {
            // Skip if this specific match is whitelisted
            const matchText = match[0];
            const isMatchWhitelisted = this.whitelistPatterns.some(wp => 
              wp.test(matchText)
            );
            
            if (!isMatchWhitelisted) {
              const lineNumber = this.getLineNumber(content, match.index);
              issues.push({
                category,
                pattern: pattern.source,
                match: matchText,
                line: lineNumber,
                severity: this.getSeverity(category),
                suggestion: this.getSuggestion(category, matchText),
              });
            }
          }
        }
      }
      
      return {
        file: filePath,
        issues,
        scanned: true,
      };
    } catch (error) {
      return {
        file: filePath,
        issues: [],
        scanned: false,
        error: error.message,
      };
    }
  }

  /**
   * Get line number for a match index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get severity level for a category
   */
  getSeverity(category) {
    const severityMap = {
      apiKeys: 'HIGH',
      dbCredentials: 'HIGH',
      privateKeys: 'CRITICAL',
      privateEndpoints: 'MEDIUM',
      privateIPs: 'MEDIUM',
      emails: 'LOW',
      phoneNumbers: 'LOW',
      cryptoKeys: 'HIGH',
    };
    return severityMap[category] || 'MEDIUM';
  }

  /**
   * Get suggestion for remediation
   */
  getSuggestion(category, match) {
    const suggestions = {
      apiKeys: 'Replace with environment variable or placeholder like ${API_KEY}',
      dbCredentials: 'Use environment variables or configuration files not in version control',
      privateKeys: 'Remove private keys from documentation. Use placeholders or references',
      privateEndpoints: 'Replace with example.com or use placeholder URLs',
      privateIPs: 'Replace with example IP ranges (192.0.2.x, 198.51.100.x, 203.0.113.x)',
      emails: 'Replace with example@example.com or use placeholder emails',
      phoneNumbers: 'Replace with example phone numbers (+1-555-0123)',
      cryptoKeys: 'Replace with example addresses or use placeholders',
    };
    return suggestions[category] || 'Review and sanitize this content';
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath, options = {}) {
    const {
      extensions = ['.md', '.txt', '.json', '.js', '.mjs', '.ts', '.yml', '.yaml'],
      excludeDirs = ['node_modules', '.git', 'dist', 'build'],
      maxDepth = 10,
    } = options;

    const results = [];
    
    const scanRecursive = async (currentPath, depth = 0) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              await scanRecursive(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              const result = await this.scanFile(fullPath);
              results.push(result);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error.message);
      }
    };
    
    await scanRecursive(dirPath);
    return results;
  }

  /**
   * Generate security report
   */
  generateReport(scanResults) {
    const summary = {
      totalFiles: scanResults.length,
      filesWithIssues: scanResults.filter(r => r.issues.length > 0).length,
      totalIssues: scanResults.reduce((sum, r) => sum + r.issues.length, 0),
      severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      categoryCounts: {},
    };

    const issuesByFile = [];
    
    for (const result of scanResults) {
      if (result.issues.length > 0) {
        issuesByFile.push(result);
        
        for (const issue of result.issues) {
          summary.severityCounts[issue.severity]++;
          summary.categoryCounts[issue.category] = 
            (summary.categoryCounts[issue.category] || 0) + 1;
        }
      }
    }

    return {
      summary,
      issuesByFile,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format report as markdown
   */
  formatReportMarkdown(report) {
    const { summary, issuesByFile } = report;
    
    let markdown = `# Content Security Scan Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Files Scanned:** ${summary.totalFiles}\n`;
    markdown += `- **Files with Issues:** ${summary.filesWithIssues}\n`;
    markdown += `- **Total Issues:** ${summary.totalIssues}\n\n`;
    
    // Severity breakdown
    markdown += `### Issues by Severity\n\n`;
    for (const [severity, count] of Object.entries(summary.severityCounts)) {
      if (count > 0) {
        markdown += `- **${severity}:** ${count}\n`;
      }
    }
    markdown += `\n`;
    
    // Category breakdown
    markdown += `### Issues by Category\n\n`;
    for (const [category, count] of Object.entries(summary.categoryCounts)) {
      markdown += `- **${category}:** ${count}\n`;
    }
    markdown += `\n`;
    
    // Detailed issues
    if (issuesByFile.length > 0) {
      markdown += `## Detailed Issues\n\n`;
      
      for (const fileResult of issuesByFile) {
        markdown += `### ${fileResult.file}\n\n`;
        
        for (const issue of fileResult.issues) {
          markdown += `**${issue.severity}** - Line ${issue.line}: ${issue.category}\n`;
          markdown += `- **Match:** \`${issue.match}\`\n`;
          markdown += `- **Suggestion:** ${issue.suggestion}\n\n`;
        }
      }
    }
    
    return markdown;
  }
}

// CLI functionality
async function main() {
  const scanner = new ContentSecurityScanner();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node content-security-scanner.mjs <directory> [--output <file>] [--format json|markdown]');
    process.exit(1);
  }
  
  const scanPath = args[0];
  const outputIndex = args.indexOf('--output');
  const formatIndex = args.indexOf('--format');
  
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
  const format = formatIndex !== -1 ? args[formatIndex + 1] : 'markdown';
  
  console.log(`Scanning ${scanPath} for security issues...`);
  
  const results = await scanner.scanDirectory(scanPath);
  const report = scanner.generateReport(results);
  
  if (format === 'json') {
    const output = JSON.stringify(report, null, 2);
    if (outputFile) {
      await fs.writeFile(outputFile, output);
      console.log(`Report saved to ${outputFile}`);
    } else {
      console.log(output);
    }
  } else {
    const output = scanner.formatReportMarkdown(report);
    if (outputFile) {
      await fs.writeFile(outputFile, output);
      console.log(`Report saved to ${outputFile}`);
    } else {
      console.log(output);
    }
  }
  
  // Exit with error code if critical or high severity issues found
  if (report.summary.severityCounts.CRITICAL > 0 || report.summary.severityCounts.HIGH > 0) {
    console.error(`\nSecurity scan failed: Found ${report.summary.severityCounts.CRITICAL} critical and ${report.summary.severityCounts.HIGH} high severity issues`);
    process.exit(1);
  }
  
  console.log('\nSecurity scan completed successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ContentSecurityScanner };