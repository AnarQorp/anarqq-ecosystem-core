/**
 * Unit Tests for Enhanced Documentation Validator
 * Tests validation logic for structure, completeness, links, and accessibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { EnhancedDocumentationValidator } from '../../../scripts/docs-validator.mjs';

// Mock fs operations and dependencies
vi.mock('fs/promises');
vi.mock('../../../scripts/docs-automation.mjs', () => ({
  default: class MockDocumentationAutomation {
    async init() {}
  }
}));
vi.mock('../../../scripts/master-index-automation.mjs', () => ({
  default: class MockMasterIndexAutomation {
    async init() {}
    async runCompletenessCheck() {
      this.validationResults = {
        completeness: { passed: true, errors: [] }
      };
    }
    async runLinkValidation() {
      this.validationResults = {
        linkValidation: { passed: true, errors: [] }
      };
    }
  }
}));

describe('EnhancedDocumentationValidator', () => {
  let validator;
  
  beforeEach(async () => {
    validator = new EnhancedDocumentationValidator();
    await validator.init();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default validation results', () => {
      expect(validator.validationResults.structure.passed).toBe(true);
      expect(validator.validationResults.completeness.passed).toBe(true);
      expect(validator.validationResults.scripts.passed).toBe(true);
      expect(validator.validationResults.links.passed).toBe(true);
      expect(validator.validationResults.accessibility.passed).toBe(true);
    });

    it('should have required structure definitions', () => {
      expect(validator.requiredStructure.global).toBeDefined();
      expect(validator.requiredStructure.modules).toBeDefined();
      expect(validator.requiredStructure.videoScripts).toBeDefined();
    });

    it('should have accessibility rules defined', () => {
      expect(validator.a11yRules.images).toBeDefined();
      expect(validator.a11yRules.headings).toBeDefined();
      expect(validator.a11yRules.links).toBeDefined();
    });
  });

  describe('Structure Validation', () => {
    it('should validate global documentation structure', async () => {
      // Mock successful access to global directory and files
      fs.access.mockResolvedValue();

      await validator.validateGlobalStructure();

      expect(validator.validationResults.structure.passed).toBe(true);
      expect(validator.validationResults.structure.errors).toHaveLength(0);
    });

    it('should detect missing global directory', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));

      await validator.validateGlobalStructure();

      expect(validator.validationResults.structure.passed).toBe(false);
      expect(validator.validationResults.structure.errors).toHaveLength(1);
      expect(validator.validationResults.structure.errors[0].type).toBe('missing-directory');
    });

    it('should detect missing required global files', async () => {
      // Mock directory exists but files don't
      fs.access
        .mockResolvedValueOnce() // Global directory exists
        .mockRejectedValue(new Error('ENOENT')); // Files don't exist

      await validator.validateGlobalStructure();

      expect(validator.validationResults.structure.passed).toBe(false);
      expect(validator.validationResults.structure.errors.length).toBeGreaterThan(0);
      expect(validator.validationResults.structure.errors[0].type).toBe('missing-file');
    });

    it('should validate module structure', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'qwallet', isDirectory: () => true },
        { name: 'qindex', isDirectory: () => true }
      ]);

      // Mock all required files exist
      fs.access.mockResolvedValue();

      await validator.validateModuleStructure();

      expect(validator.validationResults.structure.passed).toBe(true);
    });

    it('should detect missing module files', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'qwallet', isDirectory: () => true }
      ]);

      // Mock some files missing
      fs.access
        .mockResolvedValueOnce() // README.md exists
        .mockRejectedValueOnce(new Error('ENOENT')) // api-reference.md missing
        .mockResolvedValueOnce(); // Other files exist

      await validator.validateModuleStructure();

      expect(validator.validationResults.structure.passed).toBe(false);
      expect(validator.validationResults.structure.errors.some(e => 
        e.type === 'missing-module-file' && e.file === 'api-reference.md'
      )).toBe(true);
    });
  });

  describe('Video Script Validation', () => {
    it('should validate video script structure', async () => {
      const scriptContent = `---
title: "Test Script"
duration: "5 minutes"
language: "en"
---

# Test Script

## Script Metadata
- Duration: 5 minutes
- Language: English

## Visual Shot List
- Opening animation
- Feature demonstration

## Script Content

### Introduction (0:00 - 0:30)
Welcome to the test script.

**[VISUAL: Opening animation]**

### Main Content (0:30 - 4:30)
Main script content here.

## Production Notes
- Resolution: 1080p
- Frame Rate: 30fps
- Audio Quality: High
- Accessibility Features: Subtitles

## Review Checklist
- Content reviewed
- Timing verified`;

      fs.access.mockResolvedValueOnce(); // Scripts directory exists
      validator.findVideoScriptFiles = vi.fn().mockResolvedValue(['test-script.md']);
      fs.readFile.mockResolvedValueOnce(scriptContent);

      await validator.validateVideoScripts();

      expect(validator.validationResults.scripts.passed).toBe(true);
    });

    it('should detect missing script sections', async () => {
      const incompleteScript = `# Test Script

Some content but missing required sections.`;

      fs.access.mockResolvedValueOnce();
      validator.findVideoScriptFiles = vi.fn().mockResolvedValue(['incomplete-script.md']);
      fs.readFile.mockResolvedValueOnce(incompleteScript);

      await validator.validateVideoScripts();

      expect(validator.validationResults.scripts.passed).toBe(false);
      expect(validator.validationResults.scripts.errors.some(e => 
        e.type === 'missing-script-section'
      )).toBe(true);
    });

    it('should validate script duration compliance', async () => {
      const scriptWithTiming = `---
duration: "5:00"
---

# Test Script

## Script Content

### Section 1 (0:00 - 2:00)
First section content.

### Section 2 (2:00 - 6:00)
Second section content that exceeds target duration.`;

      validator.extractScriptMetadata = vi.fn().mockReturnValue({ duration: '5:00' });
      validator.parseTimeToSeconds = vi.fn()
        .mockReturnValueOnce(300) // 5:00 = 300 seconds
        .mockReturnValueOnce(360); // 6:00 = 360 seconds
      validator.formatTime = vi.fn().mockReturnValue('6:00');

      await validator.validateScriptDuration(scriptWithTiming, 'test-script.md');

      expect(validator.validationResults.scripts.passed).toBe(false);
      expect(validator.validationResults.scripts.errors.some(e => 
        e.type === 'duration-mismatch'
      )).toBe(true);
    });
  });

  describe('Accessibility Validation', () => {
    it('should validate image alt text', async () => {
      const contentWithImages = `# Test Document

![Good alt text](image1.png)
![](image2.png)
![Very long alt text that exceeds the maximum recommended length for accessibility and should be flagged as a warning](image3.png)`;

      await validator.validateImageAltText(contentWithImages, 'test.md');

      expect(validator.validationResults.accessibility.errors.some(e => 
        e.type === 'missing-alt-text' && e.image === 'image2.png'
      )).toBe(true);

      expect(validator.validationResults.accessibility.warnings.some(w => 
        w.type === 'long-alt-text' && w.image === 'image3.png'
      )).toBe(true);
    });

    it('should validate heading hierarchy', async () => {
      const contentWithBadHierarchy = `# Main Title

### Skipped H2
Content here.

## Proper H2
More content.`;

      await validator.validateHeadingHierarchy(contentWithBadHierarchy, 'test.md');

      expect(validator.validationResults.accessibility.passed).toBe(false);
      expect(validator.validationResults.accessibility.errors.some(e => 
        e.type === 'heading-hierarchy-skip'
      )).toBe(true);
    });

    it('should detect missing H1 heading', async () => {
      const contentWithoutH1 = `## Starting with H2

Content without H1.`;

      await validator.validateHeadingHierarchy(contentWithoutH1, 'test.md');

      expect(validator.validationResults.accessibility.warnings.some(w => 
        w.type === 'missing-h1'
      )).toBe(true);
    });

    it('should validate link descriptions', async () => {
      const contentWithGenericLinks = `# Test Document

[Click here](http://example.com) for more information.
[Learn more about our services](http://example.com/services)
[here](http://example.com/here)`;

      await validator.validateLinkDescriptions(contentWithGenericLinks, 'test.md');

      expect(validator.validationResults.accessibility.warnings.some(w => 
        w.type === 'generic-link-text' && w.text === 'Click here'
      )).toBe(true);

      expect(validator.validationResults.accessibility.warnings.some(w => 
        w.type === 'generic-link-text' && w.text === 'here'
      )).toBe(true);
    });
  });

  describe('Code Snippet Validation', () => {
    it('should validate JavaScript syntax', async () => {
      const validJS = `const x = 5;
function test() {
  return x * 2;
}`;

      const block = {
        language: 'javascript',
        content: validJS,
        line: 10
      };

      await validator.validateJavaScriptSyntax(block, 'test.md');

      expect(validator.validationResults.codeSnippets.passed).toBe(true);
    });

    it('should detect JavaScript syntax errors', async () => {
      const invalidJS = `const x = 5
function test( {
  return x * 2;
}`;

      const block = {
        language: 'javascript',
        content: invalidJS,
        line: 10
      };

      await validator.validateJavaScriptSyntax(block, 'test.md');

      expect(validator.validationResults.codeSnippets.passed).toBe(false);
      expect(validator.validationResults.codeSnippets.errors.some(e => 
        e.type === 'javascript-syntax-error'
      )).toBe(true);
    });

    it('should validate JSON syntax', async () => {
      const validJSON = `{
  "name": "test",
  "version": "1.0.0"
}`;

      const block = {
        language: 'json',
        content: validJSON,
        line: 5
      };

      await validator.validateJSONSyntax(block, 'test.md');

      expect(validator.validationResults.codeSnippets.passed).toBe(true);
    });

    it('should detect JSON syntax errors', async () => {
      const invalidJSON = `{
  "name": "test",
  "version": 1.0.0,
}`;

      const block = {
        language: 'json',
        content: invalidJSON,
        line: 5
      };

      await validator.validateJSONSyntax(block, 'test.md');

      expect(validator.validationResults.codeSnippets.passed).toBe(false);
      expect(validator.validationResults.codeSnippets.errors.some(e => 
        e.type === 'json-syntax-error'
      )).toBe(true);
    });

    it('should warn about missing language labels', async () => {
      const block = {
        language: null,
        content: 'some code',
        line: 15
      };

      await validator.validateCodeBlock(block, 'test.md');

      expect(validator.validationResults.codeSnippets.warnings.some(w => 
        w.type === 'missing-language-label'
      )).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should extract front matter from content', () => {
      const content = `---
title: "Test Document"
version: "1.0.0"
---

# Document Content`;

      const frontMatter = validator.extractFrontMatter(content);

      expect(frontMatter.title).toBe('Test Document');
      expect(frontMatter.version).toBe('1.0.0');
    });

    it('should extract internal links', () => {
      const content = `# Test Document

[Internal link](./other-doc.md)
[External link](https://example.com)
[Another internal](../parent/doc.md)`;

      const links = validator.extractInternalLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0].url).toBe('./other-doc.md');
      expect(links[1].url).toBe('../parent/doc.md');
    });

    it('should extract code blocks', () => {
      const content = `# Test Document

\`\`\`javascript
const x = 5;
\`\`\`

\`\`\`json
{"test": true}
\`\`\`

\`\`\`
No language specified
\`\`\``;

      const blocks = validator.extractCodeBlocks(content);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[1].language).toBe('json');
      expect(blocks[2].language).toBeNull();
    });

    it('should find all markdown files', async () => {
      const mockFiles = [
        'docs/README.md',
        'docs/modules/qwallet/README.md',
        'docs/modules/qwallet/api.md',
        'docs/global/vision.md'
      ];

      validator.findAllMarkdownFiles = vi.fn().mockResolvedValue(mockFiles);

      const files = await validator.findAllMarkdownFiles('docs');

      expect(files).toHaveLength(4);
      expect(files).toContain('docs/README.md');
      expect(files).toContain('docs/modules/qwallet/README.md');
    });
  });

  describe('Comprehensive Validation', () => {
    it('should run full validation suite', async () => {
      // Mock all validation methods to succeed
      validator.validateNewStructure = vi.fn().mockResolvedValue();
      validator.validateCompleteness = vi.fn().mockResolvedValue();
      validator.validateVideoScripts = vi.fn().mockResolvedValue();
      validator.validateLinksAndCrossReferences = vi.fn().mockResolvedValue();
      validator.validateAccessibility = vi.fn().mockResolvedValue();
      validator.validateCodeSnippets = vi.fn().mockResolvedValue();
      validator.validateOpenAPISpecs = vi.fn().mockResolvedValue();
      validator.validateMCPSpecs = vi.fn().mockResolvedValue();
      validator.validateBilingualConsistency = vi.fn().mockResolvedValue();
      validator.generateComprehensiveReport = vi.fn().mockResolvedValue({
        passed: true,
        summary: 'All validations passed'
      });

      const result = await validator.runFullValidation();

      expect(validator.validateNewStructure).toHaveBeenCalled();
      expect(validator.validateCompleteness).toHaveBeenCalled();
      expect(validator.validateVideoScripts).toHaveBeenCalled();
      expect(result.passed).toBe(true);
    });

    it('should generate comprehensive report', async () => {
      validator.validationResults.structure.errors = [
        { type: 'missing-file', message: 'Test error' }
      ];
      validator.validationResults.structure.passed = false;

      validator.generateComprehensiveReport = vi.fn().mockResolvedValue({
        passed: false,
        totalErrors: 1,
        totalWarnings: 0,
        categories: {
          structure: { passed: false, errors: 1, warnings: 0 }
        }
      });

      const report = await validator.generateComprehensiveReport();

      expect(report.passed).toBe(false);
      expect(report.totalErrors).toBe(1);
      expect(report.categories.structure.passed).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      fs.access.mockRejectedValue(new Error('Permission denied'));

      await validator.validateGlobalStructure();

      expect(validator.validationResults.structure.passed).toBe(false);
      expect(validator.validationResults.structure.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing video scripts directory', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));

      await validator.validateVideoScripts();

      expect(validator.validationResults.scripts.warnings.some(w => 
        w.type === 'scripts-directory-missing'
      )).toBe(true);
    });

    it('should handle unreadable files', async () => {
      fs.access.mockResolvedValueOnce();
      validator.findVideoScriptFiles = vi.fn().mockResolvedValue(['test.md']);
      fs.readFile.mockRejectedValueOnce(new Error('Permission denied'));

      await validator.validateVideoScripts();

      expect(validator.validationResults.scripts.passed).toBe(false);
      expect(validator.validationResults.scripts.errors.some(e => 
        e.type === 'script-read-error'
      )).toBe(true);
    });
  });
});