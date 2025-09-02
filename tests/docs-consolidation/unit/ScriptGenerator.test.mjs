/**
 * Unit Tests for ScriptGenerator
 * Tests video script generation logic, content extraction, and formatting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ScriptGenerator } from '../../../scripts/ScriptGenerator.mjs';

// Mock fs operations
vi.mock('fs/promises');

describe('ScriptGenerator', () => {
  let scriptGenerator;
  
  beforeEach(() => {
    scriptGenerator = new ScriptGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(scriptGenerator.modules).toEqual([]);
      expect(scriptGenerator.globalContent).toEqual({});
      expect(scriptGenerator.templates).toEqual({});
      expect(scriptGenerator.generatedScripts).toEqual([]);
      expect(scriptGenerator.errors).toEqual([]);
      expect(scriptGenerator.warnings).toEqual([]);
    });

    it('should load modules during initialization', async () => {
      // Mock file system responses
      fs.readdir.mockResolvedValueOnce(['qwallet', 'qindex', 'README.md']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile.mockResolvedValue(`---
version: "1.0.0"
module: "qwallet"
---

# Qwallet Module

Decentralized wallet for the Q ecosystem.

## Key Features
- Secure key management
- Multi-chain support
- Identity integration

## Use Cases
- Digital payments
- Asset management
- Identity verification
`);

      await scriptGenerator.init();

      expect(fs.readdir).toHaveBeenCalledWith('docs/modules');
      expect(scriptGenerator.modules).toHaveLength(2);
      expect(scriptGenerator.modules[0].name).toBe('qindex');
      expect(scriptGenerator.modules[1].name).toBe('qwallet');
    });

    it('should handle missing modules directory gracefully', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      await scriptGenerator.init();

      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Failed to load modules');
    });
  });

  describe('Module Loading', () => {
    it('should parse module information correctly', async () => {
      const moduleContent = `---
version: "1.0.0"
module: "qwallet"
description: "Decentralized wallet"
---

# Qwallet Module

Secure decentralized wallet for digital assets.

## Key Features
- Multi-signature support
- Hardware wallet integration
- Cross-chain compatibility

## Integration Points
- Works with Qindex for discovery
- Integrates with Qerberos for security

## Use Cases
- Personal asset management
- Enterprise treasury management
- DeFi protocol integration
`;

      fs.readFile.mockResolvedValueOnce(moduleContent);

      const module = await scriptGenerator.loadModuleInfo('qwallet', 'docs/modules/qwallet');

      expect(module).toBeDefined();
      expect(module.name).toBe('qwallet');
      expect(module.displayName).toBe('Qwallet');
      expect(module.description).toContain('Secure decentralized wallet');
      expect(module.keyFeatures).toHaveLength(3);
      expect(module.integrations).toContain('qindex');
      expect(module.integrations).toContain('qerberos');
      expect(module.useCases).toHaveLength(3);
    });

    it('should handle malformed module files', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const module = await scriptGenerator.loadModuleInfo('invalid', 'docs/modules/invalid');

      expect(module).toBeNull();
      expect(scriptGenerator.warnings).toHaveLength(1);
      expect(scriptGenerator.warnings[0]).toContain('Could not load module info for invalid');
    });
  });

  describe('Global Script Generation', () => {
    beforeEach(async () => {
      // Setup mock data
      scriptGenerator.modules = [
        {
          name: 'qwallet',
          displayName: 'Qwallet',
          description: 'Decentralized wallet',
          keyFeatures: ['Secure storage', 'Multi-chain support'],
          integrations: ['qindex', 'qerberos'],
          useCases: ['Digital payments', 'Asset management']
        },
        {
          name: 'qindex',
          displayName: 'Qindex',
          description: 'Module discovery service',
          keyFeatures: ['Module registry', 'Version management'],
          integrations: ['qwallet'],
          useCases: ['Module discovery', 'Dependency resolution']
        }
      ];

      scriptGenerator.globalContent = {
        vision: { body: 'Q ecosystem vision content' },
        architecture: { body: 'Q∞ architecture details' },
        strategy: { body: 'Strategic roadmap' }
      };

      await scriptGenerator.loadTemplates();
    });

    it('should generate English global script', async () => {
      const script = await scriptGenerator.generateGlobalScript('en');

      expect(script).toBeDefined();
      expect(script.title).toBe('AnarQ&Q Ecosystem Overview');
      expect(script.duration).toBe('5-7 minutes');
      expect(script.language).toBe('en');
      expect(script.sections).toHaveLength(7);
      expect(script.visualCues).toBeDefined();
      expect(script.metadata.version).toBe('1.0.0');
    });

    it('should generate Spanish global script', async () => {
      const script = await scriptGenerator.generateGlobalScript('es');

      expect(script).toBeDefined();
      expect(script.title).toBe('Visión General del Ecosistema AnarQ&Q');
      expect(script.duration).toBe('5-7 minutes');
      expect(script.language).toBe('es');
      expect(script.sections).toHaveLength(7);
    });

    it('should validate script structure', async () => {
      const script = await scriptGenerator.generateGlobalScript('en');

      const validation = scriptGenerator.validateScriptStructure(script);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toBeDefined();
    });

    it('should handle missing template gracefully', async () => {
      const script = await scriptGenerator.generateGlobalScript('fr');

      expect(script).toBeNull();
      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Template not found for language: fr');
    });
  });

  describe('Module Script Generation', () => {
    beforeEach(async () => {
      scriptGenerator.modules = [
        {
          name: 'qwallet',
          displayName: 'Qwallet',
          description: 'Decentralized wallet for digital assets',
          keyFeatures: [
            'Secure key management',
            'Multi-chain support',
            'Hardware wallet integration'
          ],
          integrations: ['qindex', 'qerberos', 'qonsent'],
          useCases: [
            'Personal asset management',
            'Enterprise treasury',
            'DeFi integration'
          ]
        }
      ];

      await scriptGenerator.loadTemplates();
    });

    it('should generate English module script', async () => {
      const script = await scriptGenerator.generateModuleScript('qwallet', 'en');

      expect(script).toBeDefined();
      expect(script.title).toContain('Qwallet');
      expect(script.duration).toBe('2-3 minutes');
      expect(script.language).toBe('en');
      expect(script.module).toBe('qwallet');
      expect(script.sections).toHaveLength(6);
      expect(script.visualCues).toBeDefined();
    });

    it('should generate Spanish module script', async () => {
      const script = await scriptGenerator.generateModuleScript('qwallet', 'es');

      expect(script).toBeDefined();
      expect(script.language).toBe('es');
      expect(script.module).toBe('qwallet');
    });

    it('should handle non-existent module', async () => {
      const script = await scriptGenerator.generateModuleScript('nonexistent', 'en');

      expect(script).toBeNull();
      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Module not found: nonexistent');
    });
  });

  describe('Content Extraction', () => {
    it('should extract ecosystem benefits', () => {
      const benefits = scriptGenerator.extractEcosystemBenefits();

      expect(benefits).toBeDefined();
      expect(Array.isArray(benefits)).toBe(true);
      expect(benefits.length).toBeGreaterThan(0);
    });

    it('should generate module overview', () => {
      scriptGenerator.modules = [
        { name: 'qwallet', displayName: 'Qwallet', description: 'Wallet module' },
        { name: 'qindex', displayName: 'Qindex', description: 'Discovery module' }
      ];

      const overview = scriptGenerator.generateModuleOverview('en');

      expect(overview).toBeDefined();
      expect(overview).toContain('Qwallet');
      expect(overview).toContain('Qindex');
    });

    it('should extract global use cases', () => {
      const useCases = scriptGenerator.extractGlobalUseCases();

      expect(useCases).toBeDefined();
      expect(Array.isArray(useCases)).toBe(true);
    });

    it('should extract architecture highlights', () => {
      scriptGenerator.globalContent.architecture = {
        body: 'Q∞ architecture provides infinite scalability and universal interoperability'
      };

      const highlights = scriptGenerator.extractArchitectureHighlights();

      expect(highlights).toBeDefined();
      expect(Array.isArray(highlights)).toBe(true);
    });
  });

  describe('Script Validation', () => {
    it('should validate complete script structure', () => {
      const validScript = {
        title: 'Test Script',
        duration: '5 minutes',
        language: 'en',
        sections: [
          {
            title: 'Introduction',
            content: 'Test content',
            duration: '60 seconds',
            visualSuggestions: ['Test visual'],
            keyPoints: ['Test point']
          }
        ],
        visualCues: [
          {
            timestamp: '0:00',
            type: 'animation',
            description: 'Test animation',
            source: 'cid://test'
          }
        ],
        metadata: {
          version: '1.0.0',
          author: 'Test Author',
          reviewStatus: 'draft'
        }
      };

      const validation = scriptGenerator.validateScriptStructure(validScript);

      expect(validation.errors).toHaveLength(0);
      expect(validation.isValid).toBe(true);
    });

    it('should detect missing required fields', () => {
      const invalidScript = {
        title: 'Test Script'
        // Missing required fields
      };

      const validation = scriptGenerator.validateScriptStructure(invalidScript);

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.isValid).toBe(false);
    });

    it('should validate section structure', () => {
      const scriptWithInvalidSection = {
        title: 'Test Script',
        duration: '5 minutes',
        language: 'en',
        sections: [
          {
            title: 'Introduction'
            // Missing required section fields
          }
        ],
        visualCues: [],
        metadata: { version: '1.0.0' }
      };

      const validation = scriptGenerator.validateScriptStructure(scriptWithInvalidSection);

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.includes('section'))).toBe(true);
    });
  });

  describe('Asset Generation', () => {
    it('should generate asset references for global script', () => {
      const assets = scriptGenerator.generateAssetReferences('global');

      expect(assets).toBeDefined();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
      expect(assets.some(asset => asset.includes('cid://'))).toBe(true);
    });

    it('should generate asset references for module script', () => {
      const assets = scriptGenerator.generateAssetReferences('qwallet');

      expect(assets).toBeDefined();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.some(asset => asset.includes('qwallet'))).toBe(true);
    });

    it('should generate shot list for global script', () => {
      const shotList = scriptGenerator.generateShotList('global', 'en');

      expect(shotList).toBeDefined();
      expect(Array.isArray(shotList)).toBe(true);
      expect(shotList.length).toBeGreaterThan(0);
    });

    it('should generate shot list for module script', () => {
      const shotList = scriptGenerator.generateShotList('qwallet', 'en');

      expect(shotList).toBeDefined();
      expect(Array.isArray(shotList)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should format module name correctly', () => {
      expect(scriptGenerator.formatModuleName('qwallet')).toBe('Qwallet');
      expect(scriptGenerator.formatModuleName('qindex')).toBe('Qindex');
      expect(scriptGenerator.formatModuleName('dao')).toBe('DAO');
    });

    it('should parse document front matter', () => {
      const content = `---
version: "1.0.0"
author: "Test Author"
---

# Document Content

This is the body content.`;

      const { metadata, body } = scriptGenerator.parseDocument(content);

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.author).toBe('Test Author');
      expect(body).toContain('# Document Content');
    });

    it('should handle document without front matter', () => {
      const content = `# Document Content

This is the body content.`;

      const { metadata, body } = scriptGenerator.parseDocument(content);

      expect(metadata).toEqual({});
      expect(body).toBe(content);
    });

    it('should format script as markdown', () => {
      const script = {
        title: 'Test Script',
        duration: '5 minutes',
        language: 'en',
        sections: [
          {
            title: 'Introduction',
            content: 'Test content',
            duration: '60 seconds'
          }
        ],
        metadata: { version: '1.0.0' }
      };

      const markdown = scriptGenerator.formatScriptAsMarkdown(script);

      expect(markdown).toContain('# Test Script');
      expect(markdown).toContain('## Introduction');
      expect(markdown).toContain('Test content');
      expect(markdown).toContain('**Duration:** 5 minutes');
    });
  });

  describe('Error Handling', () => {
    it('should collect and report errors', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      await scriptGenerator.init();

      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Failed to load modules');
    });

    it('should collect and report warnings', async () => {
      fs.readdir.mockResolvedValueOnce(['qwallet']);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readFile.mockRejectedValueOnce(new Error('File not readable'));

      await scriptGenerator.init();

      expect(scriptGenerator.warnings).toHaveLength(1);
      expect(scriptGenerator.warnings[0]).toContain('Could not load module info');
    });

    it('should handle template loading errors', async () => {
      // Mock missing global content
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await scriptGenerator.loadGlobalContent();

      expect(scriptGenerator.errors).toHaveLength(1);
      expect(scriptGenerator.errors[0]).toContain('Failed to load global content');
    });
  });
});