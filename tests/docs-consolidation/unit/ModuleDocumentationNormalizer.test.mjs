/**
 * Unit Tests for ModuleDocumentationNormalizer
 * Tests document processing, metadata extraction, and normalization functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ModuleDocumentationNormalizer } from '../../../scripts/ModuleDocumentationNormalizer.mjs';

// Mock fs operations
vi.mock('fs/promises');

describe('ModuleDocumentationNormalizer', () => {
  let normalizer;
  
  beforeEach(() => {
    normalizer = new ModuleDocumentationNormalizer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(normalizer.processedFiles).toEqual([]);
      expect(normalizer.errors).toEqual([]);
      expect(normalizer.warnings).toEqual([]);
    });
  });

  describe('Document Parsing', () => {
    it('should parse document with front matter', () => {
      const content = `---
version: "1.0.0"
author: "Test Author"
module: "qwallet"
lastModified: "2024-01-01T00:00:00Z"
---

# Qwallet Documentation

This is the main content of the document.

## Overview

Qwallet provides secure wallet functionality.`;

      const { metadata, body } = normalizer.parseDocument(content);

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.module).toBe('qwallet');
      expect(body).toContain('# Qwallet Documentation');
      expect(body).toContain('## Overview');
    });

    it('should handle document without front matter', () => {
      const content = `# Qwallet Documentation

This is the main content without front matter.`;

      const { metadata, body } = normalizer.parseDocument(content);

      expect(metadata).toEqual({});
      expect(body).toBe(content);
    });

    it('should handle malformed YAML front matter', () => {
      const content = `---
version: "1.0.0
author: Test Author
invalid: yaml: content
---

# Document Content`;

      const { metadata, body } = normalizer.parseDocument(content);

      expect(metadata).toEqual({});
      expect(body).toBe(content);
      expect(normalizer.warnings).toHaveLength(1);
    });
  });

  describe('Metadata Management', () => {
    it('should update metadata with defaults and overrides', () => {
      const existingMetadata = {
        version: '1.0.0',
        author: 'Original Author'
      };

      const overrides = {
        module: 'qwallet',
        category: 'module'
      };

      const filePath = 'docs/modules/qwallet/README.md';

      const updatedMetadata = normalizer.updateMetadata(existingMetadata, overrides, filePath);

      expect(updatedMetadata.version).toBe('1.0.0');
      expect(updatedMetadata.author).toBe('Original Author');
      expect(updatedMetadata.module).toBe('qwallet');
      expect(updatedMetadata.category).toBe('module');
      expect(updatedMetadata.lastModified).toBeDefined();
    });

    it('should auto-detect module from file path', () => {
      const moduleName = normalizer.detectModuleFromPath('docs/modules/qwallet/README.md');
      expect(moduleName).toBe('qwallet');

      const runbookModule = normalizer.detectModuleFromPath('docs/runbooks/runbook-qindex.md');
      expect(runbookModule).toBe('qindex');

      const globalModule = normalizer.detectModuleFromPath('docs/README.md');
      expect(globalModule).toBeNull();
    });

    it('should auto-detect category from file path', () => {
      expect(normalizer.detectCategoryFromPath('docs/modules/qwallet/README.md')).toBe('module');
      expect(normalizer.detectCategoryFromPath('docs/modules/qwallet/api-reference.md')).toBe('api');
      expect(normalizer.detectCategoryFromPath('docs/modules/qwallet/deployment.md')).toBe('deployment');
      expect(normalizer.detectCategoryFromPath('docs/runbooks/runbook-qwallet.md')).toBe('runbook');
      expect(normalizer.detectCategoryFromPath('docs/global/vision-overview.md')).toBe('global');
      expect(normalizer.detectCategoryFromPath('docs/README.md')).toBe('global');
    });
  });

  describe('Document Structure Normalization', () => {
    it('should normalize document structure with standard sections', () => {
      const body = `# Old Title

Some introduction content.

Random content without structure.

More content here.`;

      const metadata = {
        module: 'qwallet',
        category: 'module'
      };

      const normalizedBody = normalizer.normalizeDocumentStructure(body, metadata);

      expect(normalizedBody).toContain('# Qwallet Documentation');
      expect(normalizedBody).toContain('## Table of Contents');
      expect(normalizedBody).toContain('## Overview');
    });

    it('should preserve existing standard structure', () => {
      const body = `# Qwallet Module

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)

## Overview

This module provides wallet functionality.

## Architecture

Technical details here.`;

      const metadata = { module: 'qwallet', category: 'module' };

      const normalizedBody = normalizer.normalizeDocumentStructure(body, metadata);

      expect(normalizedBody).toBe(body); // Should remain unchanged
    });

    it('should generate appropriate title based on metadata', () => {
      expect(normalizer.generateTitle({ module: 'qwallet', category: 'runbook' }))
        .toBe('qwallet Operational Runbook');
      
      expect(normalizer.generateTitle({ module: 'qindex', category: 'api' }))
        .toBe('qindex API Reference');
      
      expect(normalizer.generateTitle({ module: 'qlock', category: 'deployment' }))
        .toBe('qlock Deployment Guide');
      
      expect(normalizer.generateTitle({ module: 'qmail', category: 'integration' }))
        .toBe('qmail Integration Guide');
      
      expect(normalizer.generateTitle({ module: 'qchat', category: 'module' }))
        .toBe('qchat Documentation');
    });

    it('should generate table of contents from headings', () => {
      const content = `# Main Title

## Overview
Content here.

## Architecture
More content.

## Integration Patterns
Integration details.`;

      const toc = normalizer.generateTableOfContents(content);

      expect(toc).toContain('- [Overview](#overview)');
      expect(toc).toContain('- [Architecture](#architecture)');
      expect(toc).toContain('- [Integration Patterns](#integration-patterns)');
      expect(toc).not.toContain('Table of Contents');
    });
  });

  describe('Content Organization', () => {
    it('should organize runbook content', () => {
      const content = `Some existing runbook content.

Health check information.

Contact details.`;

      const metadata = {
        module: 'qwallet',
        category: 'runbook'
      };

      const organized = normalizer.organizeRunbookContent(content, metadata);

      expect(organized).toContain('## Module Overview');
      expect(organized).toContain('**Name**: qwallet');
      expect(organized).toContain('## Health Checks');
      expect(organized).toContain('## Contact Information');
      expect(organized).toContain(content);
    });

    it('should organize API content', () => {
      const content = `API endpoint documentation.

Authentication details.`;

      const metadata = {
        module: 'qindex',
        category: 'api'
      };

      const organized = normalizer.organizeApiContent(content, metadata);

      expect(organized).toContain('## Overview');
      expect(organized).toContain('API documentation for qindex');
      expect(organized).toContain('## Authentication');
      expect(organized).toContain('## Endpoints');
      expect(organized).toContain(content);
    });

    it('should organize module content', () => {
      const content = `Module functionality description.

Technical details.`;

      const metadata = {
        module: 'qwallet',
        category: 'module'
      };

      const organized = normalizer.organizeModuleContent(content, metadata);

      expect(organized).toContain('## Overview');
      expect(organized).toContain('## Architecture');
      expect(organized).toContain('## Integration Patterns');
      expect(organized).toContain(content);
    });

    it('should extract description from content', () => {
      const content = `# Title

This is the first meaningful paragraph that should be extracted as description.

## Section

More content here.`;

      const description = normalizer.extractDescription(content);

      expect(description).toBe('This is the first meaningful paragraph that should be extracted as description.');
    });

    it('should handle content without clear description', () => {
      const content = `# Title

## Section

- List item
- Another item

[Link text](url)`;

      const description = normalizer.extractDescription(content);

      expect(description).toBeNull();
    });
  });

  describe('Document Reconstruction', () => {
    it('should reconstruct document with metadata and body', () => {
      const metadata = {
        version: '1.0.0',
        author: 'Test Author',
        module: 'qwallet',
        lastModified: '2024-01-01T00:00:00Z'
      };

      const body = `# Qwallet Documentation

This is the document content.`;

      const reconstructed = normalizer.reconstructDocument(metadata, body);

      expect(reconstructed).toContain('---');
      expect(reconstructed).toContain('version: 1.0.0');
      expect(reconstructed).toContain('author: Test Author');
      expect(reconstructed).toContain('module: qwallet');
      expect(reconstructed).toContain('---');
      expect(reconstructed).toContain('# Qwallet Documentation');
    });
  });

  describe('File Processing', () => {
    it('should normalize a single document successfully', async () => {
      const content = `# Old Document

Some content without proper structure.`;

      fs.readFile.mockResolvedValueOnce(content);
      fs.writeFile.mockResolvedValueOnce();

      await normalizer.normalizeDocument('docs/modules/qwallet/README.md', {
        category: 'module',
        module: 'qwallet'
      });

      expect(fs.readFile).toHaveBeenCalledWith('docs/modules/qwallet/README.md', 'utf8');
      expect(fs.writeFile).toHaveBeenCalled();
      expect(normalizer.processedFiles).toContain('docs/modules/qwallet/README.md');
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('File not found'));

      await normalizer.normalizeDocument('docs/modules/invalid/README.md');

      expect(normalizer.errors).toHaveLength(1);
      expect(normalizer.errors[0]).toContain('Failed to normalize');
    });

    it('should handle metadata validation errors', async () => {
      const content = `---
invalid: metadata
---

# Document`;

      fs.readFile.mockResolvedValueOnce(content);

      // Mock validation to return errors
      const originalValidateMetadata = normalizer.validateMetadata;
      normalizer.validateMetadata = vi.fn().mockReturnValue(['Missing required field: version']);

      await normalizer.normalizeDocument('docs/test.md');

      expect(normalizer.errors).toHaveLength(1);
      expect(normalizer.errors[0]).toContain('Metadata validation failed');
    });
  });

  describe('Directory Processing', () => {
    it('should process module directories', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'qwallet', isDirectory: () => true },
        { name: 'qindex', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ]);

      fs.readdir.mockResolvedValueOnce(['README.md', 'api-reference.md']);
      fs.readdir.mockResolvedValueOnce(['README.md', 'deployment.md']);

      fs.readFile.mockResolvedValue('# Test Document\n\nContent here.');
      fs.writeFile.mockResolvedValue();

      await normalizer.normalizeModuleDocumentation();

      expect(fs.readdir).toHaveBeenCalledWith('docs/modules');
      expect(normalizer.processedFiles.length).toBeGreaterThan(0);
    });

    it('should handle missing modules directory', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      await normalizer.normalizeModuleDocumentation();

      expect(normalizer.errors).toHaveLength(1);
      expect(normalizer.errors[0]).toContain('Failed to process modules directory');
    });
  });

  describe('Related Modules Detection', () => {
    it('should detect related modules from content', async () => {
      const content = `# Qwallet Module

This module integrates with qindex for discovery and qerberos for security.
It also works with qonsent for privacy management.`;

      fs.readFile.mockResolvedValueOnce(content);

      const relatedModules = await normalizer.detectRelatedModules('docs/modules/qwallet/README.md');

      expect(relatedModules).toContain('qindex');
      expect(relatedModules).toContain('qerberos');
      expect(relatedModules).toContain('qonsent');
      expect(relatedModules).not.toContain('qwallet'); // Should not include itself
    });

    it('should handle file read errors in related modules detection', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const relatedModules = await normalizer.detectRelatedModules('docs/invalid.md');

      expect(relatedModules).toEqual([]);
    });
  });

  describe('Report Generation', () => {
    it('should generate normalization report', async () => {
      normalizer.processedFiles = [
        'docs/README.md',
        'docs/modules/qwallet/README.md',
        'docs/runbooks/runbook-qindex.md'
      ];
      normalizer.errors = ['Test error'];
      normalizer.warnings = ['Test warning'];

      fs.writeFile.mockResolvedValue();

      await normalizer.generateNormalizationReport();

      expect(fs.writeFile).toHaveBeenCalledWith(
        'docs/normalization-report.json',
        expect.stringContaining('"processedFiles": 3')
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        'docs/normalization-report.md',
        expect.stringContaining('# Documentation Normalization Report')
      );
    });
  });

  describe('Metadata Addition', () => {
    it('should add metadata to specific document', async () => {
      const content = `# Test Document

Content without metadata.`;

      const metadata = {
        category: 'global',
        tags: ['test']
      };

      fs.readFile.mockResolvedValueOnce(content);
      fs.writeFile.mockResolvedValueOnce();

      const result = await normalizer.addMetadataToDocument('docs/test.md', metadata);

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle metadata validation errors', async () => {
      const content = `# Test Document`;
      const invalidMetadata = {}; // Missing required fields

      fs.readFile.mockResolvedValueOnce(content);

      const result = await normalizer.addMetadataToDocument('docs/test.md', invalidMetadata);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should collect errors during processing', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      await normalizer.normalizeAllDocumentation();

      expect(normalizer.errors.length).toBeGreaterThan(0);
    });

    it('should collect warnings for non-critical issues', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'qwallet', isDirectory: () => true }
      ]);
      fs.readdir.mockResolvedValueOnce(['README.md']);
      fs.readFile.mockRejectedValueOnce(new Error('Permission denied'));

      await normalizer.normalizeModuleDocumentation();

      expect(normalizer.errors.length).toBeGreaterThan(0);
    });
  });
});