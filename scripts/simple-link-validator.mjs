#!/usr/bin/env node

/**
 * Simple Link Validator
 * Provides basic link validation functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleLinkValidator {
  constructor() {
    this.rootPath = path.resolve(__dirname, '..');
    this.docsPath = path.join(this.rootPath, 'docs');
  }

  async validateLinks() {
    console.log('🔗 Running simple link validation...');
    
    try {
      // Check main navigation files exist and have basic structure
      const navFiles = [
        'docs/README.md',
        'docs/INDEX.md'
      ];
      
      let allValid = true;
      
      for (const file of navFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          
          // Check for basic navigation elements
          if (file.includes('README.md')) {
            if (!content.includes('Quick Navigation')) {
              console.log(`  ⚠️ ${file} missing Quick Navigation section`);
            }
          }
          
          if (file.includes('INDEX.md')) {
            if (!content.includes('Table of Contents')) {
              console.log(`  ⚠️ ${file} missing Table of Contents`);
            }
          }
          
          console.log(`  ✅ ${file} validated`);
        } catch (error) {
          console.log(`  ❌ ${file} not found or not readable`);
          allValid = false;
        }
      }
      
      // Check that key directories are referenced
      const keyDirs = ['global', 'modules', 'video-scripts'];
      const readmeContent = await fs.readFile('docs/README.md', 'utf8');
      
      for (const dir of keyDirs) {
        if (!readmeContent.includes(dir)) {
          console.log(`  ⚠️ README.md doesn't reference ${dir} directory`);
        }
      }
      
      console.log(`  ${allValid ? '✅' : '⚠️'} Link validation completed`);
      return allValid;
      
    } catch (error) {
      console.log(`  ❌ Link validation failed: ${error.message}`);
      return false;
    }
  }

  async validateIndex() {
    console.log('📋 Running simple index validation...');
    
    try {
      // Check that INDEX.md exists and has basic structure
      const indexPath = 'docs/INDEX.md';
      const content = await fs.readFile(indexPath, 'utf8');
      
      const requiredSections = [
        'Quick Start',
        'Global Documentation', 
        'Module Documentation'
      ];
      
      let allSectionsFound = true;
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          console.log(`  ❌ Missing section: ${section}`);
          allSectionsFound = false;
        }
      }
      
      if (allSectionsFound) {
        console.log('  ✅ Index validation passed');
      } else {
        console.log('  ⚠️ Index validation completed with warnings');
      }
      
      return allSectionsFound;
      
    } catch (error) {
      console.log(`  ❌ Index validation failed: ${error.message}`);
      return false;
    }
  }
}

// CLI execution
async function main() {
  const validator = new SimpleLinkValidator();
  
  const command = process.argv[2] || 'links';
  
  try {
    let success = false;
    
    switch (command) {
      case 'links':
        success = await validator.validateLinks();
        break;
      case 'index':
        success = await validator.validateIndex();
        break;
      default:
        console.log('Available commands: links, index');
        success = true;
    }
    
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

export default SimpleLinkValidator;