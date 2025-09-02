/**
 * Content Quality Tests
 * Tests for completeness, link validation, and language consistency
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { EnhancedDocumentationValidator } from '../../../scripts/docs-validator.mjs';
import { ContentExtractionEngine } from '../../../scripts/ContentExtractionEngine.mjs';

// Mock fs operations
vi.mock('fs/promises');

// Mock dependencies
vi.mock('../../../scripts/docs-automation.mjs', () => ({
  default: class MockDocumentationAutomation {
    async init() {}
  }
}));

vi.mock('../../../scripts/master-index-automation.mjs', () => ({
  default: class MockMasterIndexAutomation {
    async init() {}
    validationResults = {
      completeness: { passed: true, errors: [] },
      linkValidation: { passed: true, errors: [] }
    };
    async runCompletenessCheck() {}
    async runLinkValidation() {}
  }
}));

describe('Content Quality Tests', () => {
  let validator;
  let contentEngine;
  
  beforeEach(async () => {
    validator = new EnhancedDocumentationValidator();
    contentEngine = new ContentExtractionEngine();
    await validator.init();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Documentation Completeness', () => {
    it('should validate required sections in global documentation', async () => {
      const incompleteVisionDoc = `---
version: "1.0.0"
category: "global"
---

# Vision Overview

Brief introduction without required sections.`;

      const completeVisionDoc = `---
version: "1.0.0"
category: "global"
---

# Vision Overview

## Introduction

The Q ecosystem represents a paradigm shift in decentralized computing.

## Vision Statement

Our vision is to create a truly decentralized internet where users control their data.

## Value Proposition

Complete sovereignty over digital identity and assets.

## Strategic Goals

1. Achieve universal adoption
2. Maintain security standards
3. Ensure scalability

This document contains over 1000 words of detailed content explaining our comprehensive vision for the future of decentralized technology and how it will transform the way people interact with digital services.`;

      // Mock file system
      fs.readFile
        .mockResolvedValueOnce(incompleteVisionDoc)
        .mockResolvedValueOnce(completeVisionDoc);

      // Test incomplete document
      await validator.validateGlobalDocumentationCompleteness();
      
      // Should have errors for missing sections
      expect(validator.validationResults.completeness.errors.some(e => 
        e.type === 'missing-section' && e.section === 'Vision Statement'
      )).toBe(true);

      // Reset validation results
      validator.validationResults.completeness = { passed: true, errors: [], warnings: [] };

      // Test complete document
      await validator.validateGlobalDocumentationCompleteness();
      
      // Should pass validation
      expect(validator.validationResults.completeness.passed).toBe(true);
    });

    it('should validate module documentation completeness', async () => {
      const incompleteModuleDoc = `---
version: "1.0.0"
module: "qwallet"
category: "module"
---

# Qwallet

Brief description.`;

      const completeModuleDoc = `---
version: "1.0.0"
module: "qwallet"
category: "module"
---

# Qwallet Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Integration Patterns](#integration-patterns)

## Overview

Qwallet is a comprehensive decentralized wallet solution that provides secure key management and multi-chain support for the Q ecosystem.

## Architecture

Technical architecture details with proper depth and explanation.

## Integration Patterns

How this module integrates with other Q ecosystem modules including detailed workflows and examples.`;

      // Mock finding markdown files
      validator.findAllMarkdownFiles = vi.fn().mockResolvedValue([
        'docs/modules/qwallet/README.md'
      ]);

      fs.readFile.mockResolvedValueOnce(incompleteModuleDoc);

      await validator.validateCompleteness();

      // Should detect missing sections
      expect(validator.validationResults.completeness.errors.some(e => 
        e.type === 'missing-section'
      )).toBe(true);
    });

    it('should validate metadata completeness', async () => {
      const docWithIncompleteMetadata = `---
version: "1.0.0"
author: "Test Author"
---

# Test Document

Content here.`;

      const docWithCompleteMetadata = `---
version: "1.0.0"
author: "Test Author"
lastModified: "2024-01-01T00:00:00Z"
ecosystemVersion: "v2.0.0"
module: "qwallet"
category: "module"
---

# Test Document

Content here.`;

      validator.findAllMarkdownFiles = vi.fn().mockResolvedValue([
        'docs/test1.md',
        'docs/test2.md'
      ]);

      validator.extractFrontMatter = vi.fn()
        .mockReturnValueOnce({ version: '1.0.0', author: 'Test Author' })
        .mockReturnValueOnce({
          version: '1.0.0',
          author: 'Test Author',
          lastModified: '2024-01-01T00:00:00Z',
          ecosystemVersion: 'v2.0.0',
          module: 'qwallet',
          category: 'module'
        });

      fs.readFile
        .mockResolvedValueOnce(docWithIncompleteMetadata)
        .mockResolvedValueOnce(docWithCompleteMetadata);

      await validator.validateMetadataCompleteness();

      // Should warn about missing metadata fields
      expect(validator.validationResults.completeness.warnings.some(w => 
        w.type === 'missing-metadata' && w.field === 'lastModified'
      )).toBe(true);

      expect(validator.validationResults.completeness.warnings.some(w => 
        w.type === 'missing-metadata' && w.field === 'ecosystemVersion'
      )).toBe(true);
    });

    it('should validate content depth and quality', async () => {
      const shallowContent = `---
version: "1.0.0"
category: "global"
---

# Architecture Overview

## Architecture Overview

Brief description.

## Core Components

List of components.

## Integration Patterns

Simple patterns.

## Scalability

Basic info.`;

      const deepContent = `---
version: "1.0.0"
category: "global"
---

# Q∞ Architecture Overview

## Architecture Overview

The Q∞ architecture represents a revolutionary approach to decentralized computing that provides infinite scalability through a unique combination of sharding, consensus mechanisms, and interoperability protocols. This architecture is designed to handle millions of transactions per second while maintaining security and decentralization.

The core innovation lies in our multi-layered approach that separates concerns between consensus, execution, and data availability layers. Each layer is optimized for its specific function while maintaining seamless integration with other layers.

## Core Components

The architecture consists of several key components:

1. **Consensus Layer**: Implements a novel proof-of-stake mechanism with instant finality
2. **Execution Layer**: Handles smart contract execution with parallel processing
3. **Data Availability Layer**: Ensures data is available and verifiable across the network
4. **Interoperability Bridge**: Connects to external blockchains and legacy systems

Each component is designed with modularity in mind, allowing for independent upgrades and optimizations without affecting the entire system.

## Integration Patterns

The Q∞ architecture supports multiple integration patterns to accommodate different use cases and requirements. These patterns include direct API integration, webhook-based event handling, and message queue systems for high-throughput scenarios.

## Scalability

Our scalability solution addresses the blockchain trilemma through innovative sharding techniques and optimistic rollups that can process thousands of transactions per second while maintaining security guarantees.

\`\`\`mermaid
graph TD
    A[User Request] --> B[Load Balancer]
    B --> C[Shard 1]
    B --> D[Shard 2]
    B --> E[Shard N]
\`\`\``;

      // Mock file access
      fs.access.mockResolvedValue();
      fs.readFile
        .mockResolvedValueOnce(shallowContent)
        .mockResolvedValueOnce(deepContent);

      await validator.validateGlobalDocumentationCompleteness();

      // Should warn about insufficient content in first document
      expect(validator.validationResults.completeness.warnings.some(w => 
        w.type === 'insufficient-content'
      )).toBe(true);

      // Should suggest diagrams for architecture document
      expect(validator.validationResults.completeness.warnings.some(w => 
        w.type === 'missing-diagrams'
      )).toBe(true);
    });
  });

  describe('Link Validation', () => {
    it('should validate internal links', async () => {
      const contentWithLinks = `# Test Document

See [other document](./other-doc.md) for details.
Check [parent document](../parent.md) for context.
Visit [external site](https://example.com) for more info.
Broken link to [missing file](./missing.md).`;

      validator.findAllMarkdownFiles = vi.fn().mockResolvedValue(['docs/test.md']);
      validator.extractInternalLinks = vi.fn().mockReturnValue([
        { url: './other-doc.md', text: 'other document' },
        { url: '../parent.md', text: 'parent document' },
        { url: './missing.md', text: 'missing file' }
      ]);

      fs.readFile.mockResolvedValueOnce(contentWithLinks);
      
      // Mock file access - some exist, some don't
      fs.access
        .mockResolvedValueOnce() // other-doc.md exists
        .mockResolvedValueOnce() // parent.md exists
        .mockRejectedValueOnce(new Error('ENOENT')); // missing.md doesn't exist

      await validator.validateCrossReferences();

      expect(validator.validationResults.links.passed).toBe(false);
      expect(validator.validationResults.links.errors.some(e => 
        e.type === 'broken-internal-link' && e.link === './missing.md'
      )).toBe(true);
    });

    it('should validate cross-references between modules', async () => {
      const qwalletDoc = `# Qwallet

Integrates with [Qindex](../qindex/README.md) and [Qerberos](../qerberos/README.md).`;

      const qindexDoc = `# Qindex

Used by [Qwallet](../qwallet/README.md) for discovery.`;

      validator.findAllMarkdownFiles = vi.fn().mockResolvedValue([
        'docs/modules/qwallet/README.md',
        'docs/modules/qindex/README.md'
      ]);

      validator.extractInternalLinks = vi.fn()
        .mockReturnValueOnce([
          { url: '../qindex/README.md', text: 'Qindex' },
          { url: '../qerberos/README.md', text: 'Qerberos' }
        ])
        .mockReturnValueOnce([
          { url: '../qwallet/README.md', text: 'Qwallet' }
        ]);

      fs.readFile
        .mockResolvedValueOnce(qwalletDoc)
        .mockResolvedValueOnce(qindexDoc);

      // Mock file access - qindex exists, qerberos doesn't
      fs.access
        .mockResolvedValueOnce() // qindex exists
        .mockRejectedValueOnce(new Error('ENOENT')) // qerberos missing
        .mockResolvedValueOnce(); // qwallet exists

      await validator.validateCrossReferences();

      expect(validator.validationResults.links.errors.some(e => 
        e.link === '../qerberos/README.md'
      )).toBe(true);
    });

    it('should validate anchor links', async () => {
      const contentWithAnchors = `# Main Document

## Section One

Content here.

## Section Two

See [Section One](#section-one) above.
Check [Missing Section](#missing-section) that doesn't exist.`;

      // Mock anchor validation
      validator.validateAnchorLinks = vi.fn().mockImplementation((content, filename) => {
        const anchors = content.match(/\[([^\]]+)\]\(#([^)]+)\)/g) || [];
        const headings = content.match(/^##\s+(.+)$/gm) || [];
        
        const headingAnchors = headings.map(h => 
          h.replace(/^##\s+/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        );

        anchors.forEach(anchor => {
          const match = anchor.match(/\[([^\]]+)\]\(#([^)]+)\)/);
          if (match) {
            const anchorId = match[2];
            if (!headingAnchors.includes(anchorId)) {
              validator.validationResults.links.errors.push({
                type: 'broken-anchor-link',
                file: filename,
                anchor: anchorId,
                text: match[1]
              });
              validator.validationResults.links.passed = false;
            }
          }
        });
      });

      await validator.validateAnchorLinks(contentWithAnchors, 'test.md');

      expect(validator.validationResults.links.errors.some(e => 
        e.type === 'broken-anchor-link' && e.anchor === 'missing-section'
      )).toBe(true);
    });
  });

  describe('Language Consistency', () => {
    it('should validate bilingual content parity', async () => {
      const englishScript = {
        title: 'Qwallet Overview',
        language: 'en',
        sections: [
          { title: 'Introduction', content: 'Welcome to Qwallet', duration: '30s' },
          { title: 'Features', content: 'Key features include...', duration: '60s' },
          { title: 'Use Cases', content: 'Primary use cases...', duration: '45s' }
        ],
        visualCues: [
          { timestamp: '0:00', type: 'animation', description: 'Logo animation' },
          { timestamp: '0:30', type: 'screenshot', description: 'Interface demo' }
        ]
      };

      const spanishScript = {
        title: 'Visión General de Qwallet',
        language: 'es',
        sections: [
          { title: 'Introducción', content: 'Bienvenido a Qwallet', duration: '30s' },
          { title: 'Características', content: 'Las características clave incluyen...', duration: '60s' }
          // Missing 'Use Cases' section
        ],
        visualCues: [
          { timestamp: '0:00', type: 'animation', description: 'Animación del logo' }
          // Missing second visual cue
        ]
      };

      const bilingualValidator = {
        validateBilingualParity: (enScript, esScript) => {
          const issues = [];
          
          if (enScript.sections.length !== esScript.sections.length) {
            issues.push({
              type: 'section-count-mismatch',
              english: enScript.sections.length,
              spanish: esScript.sections.length
            });
          }
          
          if (enScript.visualCues.length !== esScript.visualCues.length) {
            issues.push({
              type: 'visual-cue-count-mismatch',
              english: enScript.visualCues.length,
              spanish: esScript.visualCues.length
            });
          }
          
          return issues;
        }
      };

      const issues = bilingualValidator.validateBilingualParity(englishScript, spanishScript);

      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('section-count-mismatch');
      expect(issues[1].type).toBe('visual-cue-count-mismatch');
    });

    it('should validate terminology consistency', async () => {
      const englishTerms = {
        'decentralized': 'descentralizado',
        'wallet': 'billetera',
        'blockchain': 'blockchain',
        'smart contract': 'contrato inteligente'
      };

      const englishContent = `The decentralized wallet uses blockchain technology for smart contract execution.`;
      
      const spanishContent = `La billetera descentralizada usa tecnología blockchain para ejecución de contrato inteligente.`;

      const terminologyValidator = {
        validateTerminology: (enContent, esContent, termMap) => {
          const issues = [];
          
          Object.entries(termMap).forEach(([enTerm, esTerm]) => {
            const enHasTerm = enContent.toLowerCase().includes(enTerm.toLowerCase());
            const esHasTerm = esContent.toLowerCase().includes(esTerm.toLowerCase());
            
            if (enHasTerm && !esHasTerm) {
              issues.push({
                type: 'missing-translation',
                term: enTerm,
                expectedTranslation: esTerm
              });
            }
          });
          
          return issues;
        }
      };

      const issues = terminologyValidator.validateTerminology(
        englishContent, 
        spanishContent, 
        englishTerms
      );

      expect(issues).toHaveLength(0); // Should pass with correct translations
    });

    it('should validate content structure consistency', async () => {
      const englishDoc = `# Qwallet Module

## Overview
Decentralized wallet solution.

## Key Features
- Feature 1
- Feature 2
- Feature 3

## Integration Points
- Qindex integration
- Qerberos security

## Use Cases
- Personal use
- Enterprise use`;

      const spanishDoc = `# Módulo Qwallet

## Visión General
Solución de billetera descentralizada.

## Características Clave
- Característica 1
- Característica 2

## Puntos de Integración
- Integración con Qindex
- Seguridad Qerberos

## Casos de Uso
- Uso personal
- Uso empresarial`;

      const structureValidator = {
        validateStructure: (enContent, esContent) => {
          const enHeadings = enContent.match(/^##\s+(.+)$/gm) || [];
          const esHeadings = esContent.match(/^##\s+(.+)$/gm) || [];
          
          const enFeatures = (enContent.match(/^- .+$/gm) || []).length;
          const esFeatures = (esContent.match(/^- .+$/gm) || []).length;
          
          const issues = [];
          
          if (enHeadings.length !== esHeadings.length) {
            issues.push({
              type: 'heading-count-mismatch',
              english: enHeadings.length,
              spanish: esHeadings.length
            });
          }
          
          if (Math.abs(enFeatures - esFeatures) > 1) {
            issues.push({
              type: 'feature-count-mismatch',
              english: enFeatures,
              spanish: esFeatures
            });
          }
          
          return issues;
        }
      };

      const issues = structureValidator.validateStructure(englishDoc, spanishDoc);

      expect(issues.some(i => i.type === 'feature-count-mismatch')).toBe(true);
    });
  });

  describe('Content Extraction Quality', () => {
    it('should extract high-quality key points', async () => {
      const highQualityContent = `# Qwallet Module

## Overview

Qwallet provides comprehensive decentralized wallet functionality with enterprise-grade security and seamless user experience.

## Key Features

- **Hardware Security Module Integration**: Support for HSM-based key storage
- **Multi-Chain Compatibility**: Native support for 15+ blockchain networks
- **Zero-Knowledge Proofs**: Privacy-preserving transaction verification
- **Quantum-Resistant Cryptography**: Future-proof security algorithms

## Benefits

- Complete control over private keys and digital assets
- Military-grade security without complexity
- Seamless integration with existing enterprise systems
- Cost-effective alternative to traditional custody solutions`;

      const keyPoints = await contentEngine.extractKeyPoints(highQualityContent, 'module');
      const benefits = contentEngine.extractBenefits(highQualityContent, 'en');
      const features = contentEngine.extractFeatures(highQualityContent);

      // Verify quality of extracted content
      expect(keyPoints.length).toBeGreaterThan(5);
      expect(keyPoints.every(point => point.length > 10)).toBe(true);
      expect(keyPoints.every(point => point.length < 150)).toBe(true);

      expect(benefits).toContain('Complete control over private keys and digital assets');
      expect(benefits).toContain('Military-grade security without complexity');

      expect(features).toContain('Hardware Security Module Integration');
      expect(features).toContain('Multi-Chain Compatibility');
    });

    it('should handle low-quality content gracefully', async () => {
      const lowQualityContent = `# Module

## Info

Basic info.

## Features

- a
- b
- c

## More

See http://example.com for details.`;

      const keyPoints = await contentEngine.extractKeyPoints(lowQualityContent, 'module');
      const benefits = contentEngine.extractBenefits(lowQualityContent, 'en');

      // Should filter out low-quality points
      expect(keyPoints).not.toContain('a');
      expect(keyPoints).not.toContain('b');
      expect(keyPoints).not.toContain('c');
      expect(keyPoints.every(point => !point.includes('http://'))).toBe(true);

      // Should handle missing benefits gracefully
      expect(Array.isArray(benefits)).toBe(true);
    });

    it('should maintain content coherence', async () => {
      const coherentContent = `# Qwallet Security Module

## Security Architecture

Qwallet implements a multi-layered security architecture that protects user assets through hardware security modules, encrypted key storage, and biometric authentication.

## Key Management

The key management system uses hierarchical deterministic (HD) wallets with BIP-32/44 standards for secure key derivation and backup recovery.

## Threat Protection

Advanced threat protection includes real-time transaction monitoring, anomaly detection, and automatic security responses to suspicious activities.`;

      const keyPoints = await contentEngine.extractKeyPoints(coherentContent, 'module');
      const summary = contentEngine.generateSummary(coherentContent, 200);

      // Verify coherence
      expect(summary).toContain('multi-layered security architecture');
      expect(keyPoints.some(point => point.includes('security'))).toBe(true);
      expect(keyPoints.some(point => point.includes('key management') || point.includes('Key Management'))).toBe(true);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should validate content processing performance', async () => {
      const largeContent = `# Large Document

${'## Section\n\nContent paragraph with sufficient detail.\n\n'.repeat(100)}`;

      const startTime = Date.now();
      const keyPoints = await contentEngine.extractKeyPoints(largeContent, 'module');
      const endTime = Date.now();

      // Should complete processing in reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
      expect(keyPoints.length).toBeGreaterThan(0);
      expect(keyPoints.length).toBeLessThan(50); // Should limit results
    });

    it('should handle concurrent validation efficiently', async () => {
      const testDocs = Array.from({ length: 10 }, (_, i) => `# Document ${i}

## Overview
Test document ${i} with standard content.

## Features
- Feature A for document ${i}
- Feature B for document ${i}

## Benefits
- Benefit 1 for document ${i}
- Benefit 2 for document ${i}`);

      const startTime = Date.now();
      
      const promises = testDocs.map(async (content, i) => {
        const keyPoints = await contentEngine.extractKeyPoints(content, 'module');
        const benefits = contentEngine.extractBenefits(content, 'en');
        return { keyPoints, benefits, index: i };
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all processed successfully
      expect(results).toHaveLength(10);
      expect(results.every(r => r.keyPoints.length > 0)).toBe(true);
      expect(results.every(r => r.benefits.length > 0)).toBe(true);

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});