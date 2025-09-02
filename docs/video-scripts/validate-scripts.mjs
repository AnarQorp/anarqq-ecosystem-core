#!/usr/bin/env node

/**
 * Video Script Validation Tool
 * Validates video script structure, duration compliance, and content quality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScriptValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validationResults = {};
  }

  /**
   * Validate a single script file
   */
  async validateScript(filePath) {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`\n🔍 Validating: ${fileName}`);
    
    const result = {
      file: fileName,
      path: filePath,
      valid: true,
      errors: [],
      warnings: [],
      metrics: {}
    };

    // Parse metadata
    const metadata = this.extractMetadata(content);
    result.metadata = metadata;

    // Validate structure
    this.validateStructure(content, result);
    
    // Validate duration
    this.validateDuration(content, metadata, result);
    
    // Validate content quality
    this.validateContentQuality(content, result);
    
    // Validate assets
    this.validateAssets(content, result);
    
    // Validate accessibility
    this.validateAccessibility(content, result);

    result.valid = result.errors.length === 0;
    
    if (result.valid) {
      console.log(`✅ ${fileName} - Valid`);
    } else {
      console.log(`❌ ${fileName} - ${result.errors.length} errors, ${result.warnings.length} warnings`);
    }

    return result;
  }

  /**
   * Extract metadata from script
   */
  extractMetadata(content) {
    const yamlMatch = content.match(/```yaml\n([\s\S]*?)\n```/);
    if (!yamlMatch) return {};

    const yamlContent = yamlMatch[1];
    const metadata = {};
    
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    });

    return metadata;
  }

  /**
   * Validate script structure
   */
  validateStructure(content, result) {
    const requiredSections = [
      'Script Metadata',
      'Visual Shot List',
      'Script Content',
      'Production Notes',
      'Review Checklist'
    ];

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        result.errors.push(`Missing required section: ${section}`);
      }
    });

    // Check for proper heading structure
    const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
    result.metrics.headingCount = headings.length;

    if (headings.length < 5) {
      result.warnings.push('Script may lack proper section organization');
    }
  }

  /**
   * Validate duration compliance
   */
  validateDuration(content, metadata, result) {
    const targetDuration = metadata.duration || '6:30';
    const targetSeconds = this.parseTimeToSeconds(targetDuration);
    
    // Extract timing markers from script
    const timingMarkers = content.match(/\((\d+:\d+)\s*-\s*(\d+:\d+)\)/g) || [];
    
    if (timingMarkers.length === 0) {
      result.errors.push('No timing markers found in script');
      return;
    }

    let totalScriptTime = 0;
    let lastEndTime = 0;

    timingMarkers.forEach(marker => {
      const match = marker.match(/\((\d+:\d+)\s*-\s*(\d+:\d+)\)/);
      if (match) {
        const startTime = this.parseTimeToSeconds(match[1]);
        const endTime = this.parseTimeToSeconds(match[2]);
        
        if (startTime !== lastEndTime && lastEndTime !== 0) {
          result.warnings.push(`Gap in timing: ${this.formatTime(lastEndTime)} to ${match[1]}`);
        }
        
        lastEndTime = endTime;
        totalScriptTime = Math.max(totalScriptTime, endTime);
      }
    });

    result.metrics.scriptDuration = totalScriptTime;
    result.metrics.targetDuration = targetSeconds;
    result.metrics.durationDifference = Math.abs(totalScriptTime - targetSeconds);

    // Check duration compliance (allow 10% variance)
    const variance = targetSeconds * 0.1;
    if (Math.abs(totalScriptTime - targetSeconds) > variance) {
      result.errors.push(
        `Duration mismatch: Script is ${this.formatTime(totalScriptTime)}, target is ${targetDuration}`
      );
    }

    // Check for proper pacing
    const averageSegmentLength = totalScriptTime / timingMarkers.length;
    if (averageSegmentLength > 90) {
      result.warnings.push('Some segments may be too long for viewer engagement');
    }
  }

  /**
   * Validate content quality
   */
  validateContentQuality(content, result) {
    // Check word count
    const wordCount = content.split(/\s+/).length;
    result.metrics.wordCount = wordCount;

    // Estimate speaking time (150 words per minute average)
    const estimatedSpeakingTime = (wordCount / 150) * 60;
    result.metrics.estimatedSpeakingTime = estimatedSpeakingTime;

    // Check for visual cues
    const visualCues = content.match(/\*\*\[VISUAL:.*?\]\*\*/g) || [];
    result.metrics.visualCueCount = visualCues.length;

    if (visualCues.length < 5) {
      result.warnings.push('Script may need more visual direction cues');
    }

    // Check for narrator instructions
    const narratorSections = content.match(/\*\*NARRATOR\*\*/g) || [];
    result.metrics.narratorSectionCount = narratorSections.length;

    if (narratorSections.length === 0) {
      result.errors.push('No narrator sections found');
    }

    // Check for production notes
    if (!content.includes('Production Notes')) {
      result.errors.push('Missing production notes section');
    }
  }

  /**
   * Validate assets references
   */
  validateAssets(content, result) {
    // Check for asset references in metadata
    const assetReferences = content.match(/source:\s*"([^"]+)"/g) || [];
    result.metrics.assetReferenceCount = assetReferences.length;

    if (assetReferences.length === 0) {
      result.warnings.push('No asset references found in metadata');
    }

    // Validate asset source formats
    assetReferences.forEach(ref => {
      const source = ref.match(/source:\s*"([^"]+)"/)[1];
      if (!source.startsWith('cid://') && !source.startsWith('s3://') && !source.startsWith('https://')) {
        result.warnings.push(`Invalid asset source format: ${source}`);
      }
    });
  }

  /**
   * Validate accessibility features
   */
  validateAccessibility(content, result) {
    const accessibilityFeatures = [
      'Closed Captions',
      'Audio Description',
      'High Contrast',
      'Multiple Languages'
    ];

    let foundFeatures = 0;
    accessibilityFeatures.forEach(feature => {
      if (content.includes(feature)) {
        foundFeatures++;
      }
    });

    result.metrics.accessibilityFeatures = foundFeatures;

    if (foundFeatures < 3) {
      result.warnings.push('Script may lack sufficient accessibility features');
    }
  }

  /**
   * Parse time string to seconds
   */
  parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  /**
   * Format seconds to time string
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate validation report
   */
  generateReport(results) {
    console.log('\n📊 VALIDATION REPORT');
    console.log('='.repeat(50));

    let totalErrors = 0;
    let totalWarnings = 0;
    let validScripts = 0;

    results.forEach(result => {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      if (result.valid) validScripts++;

      console.log(`\n📄 ${result.file}`);
      console.log(`   Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   Errors: ${result.errors.length}`);
      console.log(`   Warnings: ${result.warnings.length}`);
      
      if (result.metadata.duration) {
        console.log(`   Target Duration: ${result.metadata.duration}`);
      }
      
      if (result.metrics.scriptDuration) {
        console.log(`   Actual Duration: ${this.formatTime(result.metrics.scriptDuration)}`);
      }

      // Show errors
      result.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });

      // Show warnings
      result.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    });

    console.log('\n📈 SUMMARY');
    console.log(`   Total Scripts: ${results.length}`);
    console.log(`   Valid Scripts: ${validScripts}`);
    console.log(`   Total Errors: ${totalErrors}`);
    console.log(`   Total Warnings: ${totalWarnings}`);
    console.log(`   Success Rate: ${((validScripts / results.length) * 100).toFixed(1)}%`);

    return {
      totalScripts: results.length,
      validScripts,
      totalErrors,
      totalWarnings,
      successRate: (validScripts / results.length) * 100
    };
  }

  /**
   * Validate all scripts in directory
   */
  async validateDirectory(dirPath) {
    const results = [];
    
    const files = fs.readdirSync(dirPath, { recursive: true })
      .filter(file => file.endsWith('.md') && !file.includes('README'))
      .map(file => path.join(dirPath, file));

    for (const file of files) {
      try {
        const result = await this.validateScript(file);
        results.push(result);
      } catch (error) {
        console.error(`Error validating ${file}:`, error.message);
        results.push({
          file: path.basename(file),
          path: file,
          valid: false,
          errors: [`Validation failed: ${error.message}`],
          warnings: [],
          metrics: {}
        });
      }
    }

    return results;
  }
}

// Main execution
async function main() {
  console.log('🎬 Video Script Validator');
  console.log('='.repeat(30));

  const validator = new ScriptValidator();
  const scriptsDir = path.join(__dirname);
  
  try {
    const results = await validator.validateDirectory(scriptsDir);
    const summary = validator.generateReport(results);
    
    // Exit with error code if validation failed
    if (summary.totalErrors > 0) {
      process.exit(1);
    }
    
    console.log('\n✅ All validations passed!');
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ScriptValidator;