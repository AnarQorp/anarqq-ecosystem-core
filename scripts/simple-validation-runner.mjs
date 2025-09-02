#!/usr/bin/env node

/**
 * Simple Validation Runner
 * Provides basic validation functionality for deployment validation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleValidationRunner {
  constructor() {
    this.rootPath = path.resolve(__dirname, '..');
    this.docsPath = path.join(this.rootPath, 'docs');
  }

  async runBasicValidation() {
    console.log('🔍 Running basic documentation validation...');
    
    const results = {
      structure: await this.validateStructure(),
      links: await this.validateBasicLinks(),
      scripts: await this.validateScripts(),
      accessibility: await this.validateBasicAccessibility(),
      code: await this.validateBasicCode()
    };
    
    const allPassed = Object.values(results).every(result => result.passed);
    
    console.log(`✅ Basic validation ${allPassed ? 'passed' : 'completed with issues'}`);
    return allPassed;
  }

  async validateStructure() {
    console.log('  📁 Validating structure...');
    
    const requiredDirs = [
      'docs/global',
      'docs/modules',
      'docs/video-scripts'
    ];
    
    let passed = true;
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch {
        console.log(`    ❌ Missing directory: ${dir}`);
        passed = false;
      }
    }
    
    return { passed };
  }

  async validateBasicLinks() {
    console.log('  🔗 Validating basic links...');
    
    try {
      // Check main navigation files exist
      const navFiles = ['docs/README.md', 'docs/INDEX.md'];
      let passed = true;
      
      for (const file of navFiles) {
        try {
          await fs.access(file);
        } catch {
          console.log(`    ❌ Missing navigation file: ${file}`);
          passed = false;
        }
      }
      
      return { passed };
    } catch (error) {
      return { passed: false };
    }
  }

  async validateScripts() {
    console.log('  🎬 Validating video scripts...');
    
    try {
      const scriptsPath = path.join(this.docsPath, 'video-scripts');
      await fs.access(scriptsPath);
      
      // Check for global scripts
      const globalEn = path.join(scriptsPath, 'global', 'ecosystem-overview-en.md');
      const globalEs = path.join(scriptsPath, 'global', 'ecosystem-overview-es.md');
      
      let passed = true;
      try {
        await fs.access(globalEn);
        await fs.access(globalEs);
      } catch {
        console.log('    ❌ Missing global video scripts');
        passed = false;
      }
      
      return { passed };
    } catch (error) {
      return { passed: false };
    }
  }

  async validateBasicAccessibility() {
    console.log('  ♿ Validating basic accessibility...');
    
    // Basic check - just verify main files have proper headings
    try {
      const readmePath = path.join(this.docsPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf8');
      
      const hasH1 = content.match(/^#\s+/m);
      if (!hasH1) {
        console.log('    ❌ Main README missing H1 heading');
        return { passed: false };
      }
      
      return { passed: true };
    } catch (error) {
      return { passed: false };
    }
  }

  async validateBasicCode() {
    console.log('  💻 Validating basic code snippets...');
    
    // Basic validation - just check that code blocks have language labels
    try {
      const readmePath = path.join(this.docsPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf8');
      
      // Look for code blocks without language labels
      const codeBlocks = content.match(/```\n/g);
      if (codeBlocks && codeBlocks.length > 0) {
        console.log('    ⚠️ Found code blocks without language labels');
        return { passed: true }; // Warning, not error
      }
      
      return { passed: true };
    } catch (error) {
      return { passed: true }; // Don't fail on this
    }
  }
}

// CLI execution
async function main() {
  const validator = new SimpleValidationRunner();
  
  try {
    const success = await validator.runBasicValidation();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export default SimpleValidationRunner;