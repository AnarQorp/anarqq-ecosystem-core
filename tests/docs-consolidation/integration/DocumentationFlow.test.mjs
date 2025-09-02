/**
 * Integration Tests for Documentation Flow
 * Tests end-to-end documentation processing and script generation pipeline
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ScriptGenerator } from '../../../scripts/ScriptGenerator.mjs';
import { ModuleDocumentationNormalizer } from '../../../scripts/ModuleDocumentationNormalizer.mjs';
import { ContentExtractionEngine } from '../../../scripts/ContentExtractionEngine.mjs';

// Mock fs operations
vi.mock('fs/promises');

describe('Documentation Flow Integration', () => {
  let scriptGenerator;
  let normalizer;
  let contentEngine;
  
  beforeEach(() => {
    scriptGenerator = new ScriptGenerator();
    normalizer = new ModuleDocumentationNormalizer();
    contentEngine = new ContentExtractionEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Documentation Processing', () => {
    it('should process documentation from raw files to normalized structure', async () => {
      // Mock raw module documentation
      const rawModuleContent = `# Qwallet

Decentralized wallet for the Q ecosystem.

Secure key management and multi-chain support.

- Hardware wallet integration
- Cross-chain compatibility
- Identity verification

Works with Qindex and Qerberos.`;

      // Mock file system operations
      fs.readFile.mockResolvedValue(rawModuleContent);
      fs.writeFile.mockResolvedValue();
      fs.readdir.mockResolvedValue(['qwallet']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });

      // Process the document
      await normalizer.normalizeDocument('docs/modules/qwallet/README.md', {
        module: 'qwallet',
        category: 'module'
      });

      // Verify normalization
      expect(fs.writeFile).toHaveBeenCalled();
      expect(normalizer.processedFiles).toContain('docs/modules/qwallet/README.md');
      expect(normalizer.errors).toHaveLength(0);

      // Verify the normalized content structure
      const writeCall = fs.writeFile.mock.calls[0];
      const normalizedContent = writeCall[1];
      
      expect(normalizedContent).toContain('---'); // Front matter
      expect(normalizedContent).toContain('version:');
      expect(normalizedContent).toContain('module: qwallet');
      expect(normalizedContent).toContain('# Qwallet Documentation');
      expect(normalizedContent).toContain('## Table of Contents');
      expect(normalizedContent).toContain('## Overview');
    });

    it('should extract content and generate video scripts', async () => {
      // Mock normalized module documentation
      const normalizedContent = `---
version: "1.0.0"
module: "qwallet"
category: "module"
---

# Qwallet Documentation

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Integration Points](#integration-points)

## Overview

Qwallet is a decentralized wallet module that provides secure key management and multi-chain support for the Q ecosystem.

## Key Features

- Hardware wallet integration
- Cross-chain compatibility
- Identity verification
- Secure key storage
- Multi-signature support

## Integration Points

Qwallet integrates seamlessly with:
- Qindex for module discovery
- Qerberos for enhanced security
- Qonsent for privacy management

## Use Cases

- Personal asset management
- Enterprise treasury operations
- DeFi protocol integration`;

      // Mock file system for script generator
      fs.readdir.mockResolvedValueOnce(['qwallet']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile.mockResolvedValue(normalizedContent);

      // Initialize and generate scripts
      await scriptGenerator.init();
      const englishScript = await scriptGenerator.generateModuleScript('qwallet', 'en');
      const spanishScript = await scriptGenerator.generateModuleScript('qwallet', 'es');

      // Verify script generation
      expect(englishScript).toBeDefined();
      expect(spanishScript).toBeDefined();
      
      expect(englishScript.title).toContain('Qwallet');
      expect(englishScript.language).toBe('en');
      expect(englishScript.duration).toBe('2-3 minutes');
      expect(englishScript.sections).toHaveLength(6);
      
      expect(spanishScript.language).toBe('es');
      expect(spanishScript.module).toBe('qwallet');

      // Verify content extraction worked
      expect(scriptGenerator.modules).toHaveLength(1);
      expect(scriptGenerator.modules[0].name).toBe('qwallet');
      expect(scriptGenerator.modules[0].keyFeatures).toContain('Hardware wallet integration');
      expect(scriptGenerator.modules[0].integrations).toContain('qindex');
    });

    it('should handle complete pipeline from multiple modules', async () => {
      // Mock multiple module files
      const qwalletContent = `---
version: "1.0.0"
module: "qwallet"
---

# Qwallet

Decentralized wallet with secure key management.

## Features
- Multi-chain support
- Hardware integration

## Integrations
- Works with Qindex
- Connects to Qerberos`;

      const qindexContent = `---
version: "1.0.0"
module: "qindex"
---

# Qindex

Module discovery and registry service.

## Features
- Module registration
- Version management

## Integrations
- Used by Qwallet
- Connects to all modules`;

      // Mock file system responses
      fs.readdir
        .mockResolvedValueOnce(['qwallet', 'qindex']) // modules directory
        .mockResolvedValueOnce(['README.md']) // qwallet files
        .mockResolvedValueOnce(['README.md']); // qindex files

      fs.stat.mockResolvedValue({ isDirectory: () => true });
      
      fs.readFile
        .mockResolvedValueOnce(qwalletContent) // qwallet README
        .mockResolvedValueOnce(qindexContent); // qindex README

      fs.writeFile.mockResolvedValue();

      // Process all modules
      await normalizer.normalizeModuleDocumentation();

      // Initialize script generator with processed modules
      fs.readdir.mockResolvedValueOnce(['qwallet', 'qindex']);
      fs.readFile
        .mockResolvedValueOnce(qwalletContent)
        .mockResolvedValueOnce(qindexContent);

      await scriptGenerator.init();

      // Generate global script
      const globalScript = await scriptGenerator.generateGlobalScript('en');

      // Verify complete pipeline
      expect(normalizer.processedFiles).toHaveLength(2);
      expect(scriptGenerator.modules).toHaveLength(2);
      expect(globalScript).toBeDefined();
      expect(globalScript.title).toBe('AnarQ&Q Ecosystem Overview');
      
      // Verify cross-module integration detection
      const qwalletModule = scriptGenerator.modules.find(m => m.name === 'qwallet');
      const qindexModule = scriptGenerator.modules.find(m => m.name === 'qindex');
      
      expect(qwalletModule.integrations).toContain('qindex');
      expect(qindexModule.integrations).toContain('qwallet');
    });
  });

  describe('Content Quality and Consistency', () => {
    it('should maintain content consistency across languages', async () => {
      const moduleContent = `---
version: "1.0.0"
module: "qwallet"
---

# Qwallet Module

Secure decentralized wallet for digital assets.

## Key Features
- Multi-signature support
- Hardware wallet integration
- Cross-chain compatibility

## Use Cases
- Personal asset management
- Enterprise treasury
- DeFi integration`;

      fs.readdir.mockResolvedValueOnce(['qwallet']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile.mockResolvedValue(moduleContent);

      await scriptGenerator.init();

      const englishScript = await scriptGenerator.generateModuleScript('qwallet', 'en');
      const spanishScript = await scriptGenerator.generateModuleScript('qwallet', 'es');

      // Verify structural consistency
      expect(englishScript.sections).toHaveLength(spanishScript.sections.length);
      expect(englishScript.visualCues).toHaveLength(spanishScript.visualCues.length);
      
      // Verify content mapping
      expect(englishScript.sections[0].title).toBe('Introduction');
      expect(spanishScript.sections[0].title).toBe('Introducción');
      
      // Verify feature consistency
      const englishFeatures = englishScript.sections.find(s => s.title.includes('Features'));
      const spanishFeatures = spanishScript.sections.find(s => s.title.includes('Características'));
      
      expect(englishFeatures).toBeDefined();
      expect(spanishFeatures).toBeDefined();
    });

    it('should validate generated content quality', async () => {
      const moduleContent = `---
version: "1.0.0"
module: "qwallet"
---

# Qwallet Module

Comprehensive wallet solution.

## Features
- Feature one
- Feature two
- Feature three

## Benefits
- Benefit one
- Benefit two

## Use Cases
- Use case one
- Use case two`;

      fs.readdir.mockResolvedValueOnce(['qwallet']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile.mockResolvedValue(moduleContent);

      await scriptGenerator.init();

      // Extract content using content engine
      const keyPoints = await contentEngine.extractKeyPoints(moduleContent, 'module');
      const benefits = contentEngine.extractBenefits(moduleContent, 'en');
      const features = contentEngine.extractFeatures(moduleContent);
      const useCases = contentEngine.extractUseCases(moduleContent);

      // Verify content extraction quality
      expect(keyPoints.length).toBeGreaterThan(0);
      expect(benefits).toContain('Benefit one');
      expect(features).toContain('Feature one');
      expect(useCases).toContain('Use case one');

      // Generate script and validate content integration
      const script = await scriptGenerator.generateModuleScript('qwallet', 'en');
      
      expect(script.sections.some(s => 
        s.content.includes('Feature one') || s.keyPoints.includes('Feature one')
      )).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      // Mock mixed success/failure scenario
      fs.readdir.mockResolvedValueOnce(['qwallet', 'invalid-module']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      
      fs.readFile
        .mockResolvedValueOnce('# Valid Qwallet Content') // qwallet succeeds
        .mockRejectedValueOnce(new Error('File not found')); // invalid-module fails

      await scriptGenerator.init();

      // Should have processed the valid module despite the failure
      expect(scriptGenerator.modules).toHaveLength(1);
      expect(scriptGenerator.modules[0].name).toBe('qwallet');
      expect(scriptGenerator.warnings).toHaveLength(1);
      expect(scriptGenerator.warnings[0]).toContain('Could not load module info for invalid-module');
    });

    it('should recover from normalization errors', async () => {
      const validContent = `# Valid Module

Good content here.`;

      const invalidContent = `---
invalid: yaml: content
---

# Invalid Module`;

      fs.readFile
        .mockResolvedValueOnce(validContent)
        .mockResolvedValueOnce(invalidContent);
      
      fs.writeFile.mockResolvedValue();

      // Process both files
      await normalizer.normalizeDocument('docs/valid.md');
      await normalizer.normalizeDocument('docs/invalid.md');

      // Should have processed the valid file
      expect(normalizer.processedFiles).toContain('docs/valid.md');
      expect(normalizer.errors).toHaveLength(1);
      expect(normalizer.errors[0]).toContain('Failed to normalize docs/invalid.md');
    });

    it('should handle missing dependencies gracefully', async () => {
      // Mock scenario where global content is missing
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await scriptGenerator.loadGlobalContent();

      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Failed to load global content');

      // Should still be able to generate module scripts
      scriptGenerator.modules = [{
        name: 'qwallet',
        displayName: 'Qwallet',
        description: 'Test module',
        keyFeatures: ['Feature 1'],
        integrations: [],
        useCases: ['Use case 1']
      }];

      await scriptGenerator.loadTemplates();
      const script = await scriptGenerator.generateModuleScript('qwallet', 'en');

      expect(script).toBeDefined();
      expect(script.title).toContain('Qwallet');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of modules efficiently', async () => {
      // Mock 20 modules
      const moduleNames = Array.from({ length: 20 }, (_, i) => `module-${i}`);
      const moduleContent = (name) => `---
version: "1.0.0"
module: "${name}"
---

# ${name} Module

Description for ${name}.

## Features
- Feature A
- Feature B

## Use Cases
- Use case 1
- Use case 2`;

      fs.readdir.mockResolvedValueOnce(moduleNames);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // Mock file reads for all modules
      moduleNames.forEach(name => {
        fs.readFile.mockResolvedValueOnce(moduleContent(name));
      });

      const startTime = Date.now();
      await scriptGenerator.init();
      const endTime = Date.now();

      // Verify all modules were processed
      expect(scriptGenerator.modules).toHaveLength(20);
      
      // Verify reasonable performance (should complete in under 1 second for mocked operations)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Verify no errors
      expect(scriptGenerator.errors).toHaveLength(0);
    });

    it('should batch process multiple script generations', async () => {
      // Setup modules
      scriptGenerator.modules = [
        { name: 'qwallet', displayName: 'Qwallet', description: 'Wallet', keyFeatures: [], integrations: [], useCases: [] },
        { name: 'qindex', displayName: 'Qindex', description: 'Index', keyFeatures: [], integrations: [], useCases: [] },
        { name: 'qerberos', displayName: 'Qerberos', description: 'Security', keyFeatures: [], integrations: [], useCases: [] }
      ];

      await scriptGenerator.loadTemplates();

      const startTime = Date.now();
      
      // Generate all scripts
      const promises = [];
      for (const module of scriptGenerator.modules) {
        promises.push(scriptGenerator.generateModuleScript(module.name, 'en'));
        promises.push(scriptGenerator.generateModuleScript(module.name, 'es'));
      }
      
      const scripts = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all scripts generated
      expect(scripts).toHaveLength(6); // 3 modules × 2 languages
      expect(scripts.every(script => script !== null)).toBe(true);
      
      // Verify reasonable performance
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity across modules', async () => {
      const qwalletContent = `---
module: "qwallet"
---

# Qwallet

Integrates with qindex and qerberos.`;

      const qindexContent = `---
module: "qindex"
---

# Qindex

Used by qwallet for discovery.`;

      fs.readdir.mockResolvedValueOnce(['qwallet', 'qindex']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile
        .mockResolvedValueOnce(qwalletContent)
        .mockResolvedValueOnce(qindexContent);

      await scriptGenerator.init();

      const qwalletModule = scriptGenerator.modules.find(m => m.name === 'qwallet');
      const qindexModule = scriptGenerator.modules.find(m => m.name === 'qindex');

      // Verify bidirectional references
      expect(qwalletModule.integrations).toContain('qindex');
      expect(qindexModule.integrations).toContain('qwallet');
    });

    it('should preserve metadata consistency', async () => {
      const originalContent = `---
version: "1.0.0"
author: "Original Author"
module: "qwallet"
customField: "custom value"
---

# Qwallet Module

Content here.`;

      fs.readFile.mockResolvedValueOnce(originalContent);
      fs.writeFile.mockResolvedValue();

      await normalizer.normalizeDocument('docs/modules/qwallet/README.md');

      const writeCall = fs.writeFile.mock.calls[0];
      const normalizedContent = writeCall[1];

      // Verify original metadata preserved
      expect(normalizedContent).toContain('version: 1.0.0');
      expect(normalizedContent).toContain('author: Original Author');
      expect(normalizedContent).toContain('customField: custom value');
      
      // Verify new metadata added
      expect(normalizedContent).toContain('lastModified:');
      expect(normalizedContent).toContain('module: qwallet');
    });
  });
});