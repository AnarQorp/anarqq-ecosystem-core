/**
 * DocumentationGenerator Tests
 * 
 * Tests for the DocumentationGenerator service implementation
 */

import { DocumentationGenerator } from '../services/DocumentationGenerator.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import ObservabilityService from '../services/ObservabilityService.mjs';
import { PiIntegrationLayer } from '../services/PiIntegrationLayer.mjs';
import { DemoOrchestrator } from '../services/DemoOrchestrator.mjs';
import fs from 'fs/promises';
import path from 'path';

describe('DocumentationGenerator', () => {
  let documentationGenerator;
  let eventBus;
  let observability;
  let piIntegration;
  let demoOrchestrator;
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(process.cwd(), 'test-docs-temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize dependencies
    eventBus = new EventBusService();
    observability = new ObservabilityService();
    piIntegration = new PiIntegrationLayer();
    demoOrchestrator = new DemoOrchestrator();

    // Initialize DocumentationGenerator
    documentationGenerator = new DocumentationGenerator({
      eventBus,
      observability,
      piIntegration,
      demoOrchestrator,
      outputPath: tempDir,
      artifactsPath: path.join(tempDir, 'artifacts'),
      diagramsPath: path.join(tempDir, 'diagrams')
    });

    await documentationGenerator.initialize();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(documentationGenerator.initialized).toBe(true);
      expect(documentationGenerator.config.languages).toEqual(['en', 'es']);
    });

    it('should create output directories', async () => {
      const piEnPath = path.join(tempDir, 'pi', 'en');
      const piEsPath = path.join(tempDir, 'pi', 'es');
      const demoEnPath = path.join(tempDir, 'demo', 'en');
      const demoEsPath = path.join(tempDir, 'demo', 'es');

      await expect(fs.access(piEnPath)).resolves.not.toThrow();
      await expect(fs.access(piEsPath)).resolves.not.toThrow();
      await expect(fs.access(demoEnPath)).resolves.not.toThrow();
      await expect(fs.access(demoEsPath)).resolves.not.toThrow();
    });
  });

  describe('Pi Documentation Generation', () => {
    it('should generate Pi documentation in English', async () => {
      const result = await documentationGenerator.generatePiDocumentation('en');

      expect(result.success).toBe(true);
      expect(result.language).toBe('en');
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.files).toContain(path.join(tempDir, 'pi', 'en', 'wallet-integration.md'));
      expect(result.files).toContain(path.join(tempDir, 'pi', 'en', 'README.md'));
    });

    it('should generate Pi documentation in Spanish', async () => {
      const result = await documentationGenerator.generatePiDocumentation('es');

      expect(result.success).toBe(true);
      expect(result.language).toBe('es');
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.files).toContain(path.join(tempDir, 'pi', 'es', 'integracion-wallet.md'));
      expect(result.files).toContain(path.join(tempDir, 'pi', 'es', 'README.md'));
    });

    it('should generate wallet integration documentation with correct content', async () => {
      await documentationGenerator.generatePiDocumentation('en');
      
      const walletDocPath = path.join(tempDir, 'pi', 'en', 'wallet-integration.md');
      const content = await fs.readFile(walletDocPath, 'utf8');

      expect(content).toContain('# Pi Wallet Integration with Qwallet');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Prerequisites');
      expect(content).toContain('## Installation');
      expect(content).toContain('## Configuration');
      expect(content).toContain('## Usage');
      expect(content).toContain('integratePiWallet');
      expect(content).toContain('DocumentationGenerator v1.0.0');
    });

    it('should handle unsupported language gracefully', async () => {
      const result = await documentationGenerator.generatePiDocumentation('fr');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported language: fr');
    });
  });

  describe('Demo Documentation Generation', () => {
    it('should generate demo documentation in English', async () => {
      const result = await documentationGenerator.generateDemoDocumentation('en');

      expect(result.success).toBe(true);
      expect(result.language).toBe('en');
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.files).toContain(path.join(tempDir, 'demo', 'en', 'setup-guide.md'));
      expect(result.files).toContain(path.join(tempDir, 'demo', 'en', 'README.md'));
    });

    it('should generate demo documentation in Spanish', async () => {
      const result = await documentationGenerator.generateDemoDocumentation('es');

      expect(result.success).toBe(true);
      expect(result.language).toBe('es');
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.files).toContain(path.join(tempDir, 'demo', 'es', 'guia-configuracion.md'));
      expect(result.files).toContain(path.join(tempDir, 'demo', 'es', 'README.md'));
    });

    it('should generate setup guide with correct content', async () => {
      await documentationGenerator.generateDemoDocumentation('en');
      
      const setupDocPath = path.join(tempDir, 'demo', 'en', 'setup-guide.md');
      const content = await fs.readFile(setupDocPath, 'utf8');

      expect(content).toContain('# AnarQ&Q Demo Setup Guide');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Prerequisites');
      expect(content).toContain('Node.js 18+');
      expect(content).toContain('Docker');
      expect(content).toContain('demo-setup.sh');
      expect(content).toContain('DocumentationGenerator v1.0.0');
    });
  });

  describe('Diagram Generation', () => {
    it('should update diagrams with real metrics', async () => {
      const result = await documentationGenerator.updateDiagramsWithRealMetrics();

      expect(result.success).toBe(true);
      expect(result.diagramsUpdated).toBeGreaterThan(0);
      expect(result.diagrams).toContain(path.join(tempDir, 'diagrams', 'pi-integration-flow.mermaid'));
      expect(result.diagrams).toContain(path.join(tempDir, 'diagrams', 'system-architecture.mermaid'));
    });

    it('should generate Pi integration flow diagram with metrics', async () => {
      await documentationGenerator.updateDiagramsWithRealMetrics();
      
      const diagramPath = path.join(tempDir, 'diagrams', 'pi-integration-flow.mermaid');
      const content = await fs.readFile(diagramPath, 'utf8');

      expect(content).toContain('graph TB');
      expect(content).toContain('Pi Network Integration Flow');
      expect(content).toContain('Pi User');
      expect(content).toContain('sQuid Identity');
      expect(content).toContain('Qwallet');
      expect(content).toContain('IPFS');
      expect(content).toContain('QNET');
      expect(content).toMatch(/\d+ms/); // Should contain latency metrics
      expect(content).toMatch(/\d+%/); // Should contain percentage metrics
    });

    it('should generate HTML versions of diagrams', async () => {
      await documentationGenerator.updateDiagramsWithRealMetrics();
      
      const htmlPath = path.join(tempDir, 'diagrams', 'html', 'pi-integration-flow.html');
      const content = await fs.readFile(htmlPath, 'utf8');

      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Pi Integration Flow');
      expect(content).toContain('mermaid');
      expect(content).toContain('DocumentationGenerator v1.0.0');
    });
  });

  describe('Documentation Consistency Validation', () => {
    beforeEach(async () => {
      // Generate some documentation to validate
      await documentationGenerator.generatePiDocumentation('en');
      await documentationGenerator.generatePiDocumentation('es');
      await documentationGenerator.generateDemoDocumentation('en');
    });

    it('should validate documentation consistency', async () => {
      const result = await documentationGenerator.validateDocumentationConsistency();

      expect(result.success).toBe(true);
      expect(result.validationId).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.bilingualParity).toBeGreaterThanOrEqual(0);
      expect(result.bilingualParity).toBeLessThanOrEqual(100);
    });

    it('should detect missing translations', async () => {
      // Remove Spanish demo documentation to create missing translations
      const demoEsPath = path.join(tempDir, 'demo', 'es');
      await fs.rm(demoEsPath, { recursive: true, force: true });

      const result = await documentationGenerator.validateDocumentationConsistency();

      expect(result.success).toBe(true);
      expect(result.bilingualParity).toBeLessThan(100);
      expect(result.report.details.bilingual.missingTranslations.length).toBeGreaterThan(0);
    });

    it('should generate consistency report', async () => {
      const result = await documentationGenerator.validateDocumentationConsistency();

      expect(result.report).toBeDefined();
      expect(result.report.summary).toBeDefined();
      expect(result.report.details).toBeDefined();
      expect(result.report.recommendations).toBeDefined();
      expect(result.report.artifacts.length).toBeGreaterThan(0);

      // Check that report files were created
      for (const artifactPath of result.report.artifacts) {
        await expect(fs.access(artifactPath)).resolves.not.toThrow();
      }
    });
  });

  describe('Bilingual Support', () => {
    it('should generate corresponding files in both languages', async () => {
      await documentationGenerator.generatePiDocumentation('en');
      await documentationGenerator.generatePiDocumentation('es');

      // Check English files
      const enWalletPath = path.join(tempDir, 'pi', 'en', 'wallet-integration.md');
      const enSmartContractsPath = path.join(tempDir, 'pi', 'en', 'smart-contracts.md');

      // Check Spanish files
      const esWalletPath = path.join(tempDir, 'pi', 'es', 'integracion-wallet.md');
      const esSmartContractsPath = path.join(tempDir, 'pi', 'es', 'contratos-inteligentes.md');

      await expect(fs.access(enWalletPath)).resolves.not.toThrow();
      await expect(fs.access(enSmartContractsPath)).resolves.not.toThrow();
      await expect(fs.access(esWalletPath)).resolves.not.toThrow();
      await expect(fs.access(esSmartContractsPath)).resolves.not.toThrow();
    });

    it('should use correct language-specific content', async () => {
      await documentationGenerator.generatePiDocumentation('en');
      await documentationGenerator.generatePiDocumentation('es');

      const enContent = await fs.readFile(path.join(tempDir, 'pi', 'en', 'wallet-integration.md'), 'utf8');
      const esContent = await fs.readFile(path.join(tempDir, 'pi', 'es', 'integracion-wallet.md'), 'utf8');

      // English content checks
      expect(enContent).toContain('Pi Wallet Integration with Qwallet');
      expect(enContent).toContain('Overview');
      expect(enContent).toContain('Prerequisites');

      // Spanish content checks
      expect(esContent).toContain('Integración Pi Wallet con Qwallet');
      expect(esContent).toContain('Resumen');
      expect(esContent).toContain('Prerrequisitos');

      // Should be different content
      expect(enContent).not.toBe(esContent);
    });
  });

  describe('Metrics Integration', () => {
    it('should collect real metrics from services', async () => {
      const metricsData = await documentationGenerator.collectRealMetrics();

      expect(metricsData).toBeDefined();
      expect(metricsData.source).toBeDefined();
      expect(metricsData.timestamp).toBeDefined();
      expect(metricsData.performance).toBeDefined();
      expect(metricsData.summary).toBeDefined();
    });

    it('should use fallback metrics when real metrics unavailable', async () => {
      // Create DocumentationGenerator without services
      const standaloneGenerator = new DocumentationGenerator({
        outputPath: tempDir
      });
      await standaloneGenerator.initialize();

      const metricsData = await standaloneGenerator.collectRealMetrics();

      expect(metricsData.source).toBe('fallback');
      expect(metricsData.performance).toBeDefined();
      expect(metricsData.summary).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create DocumentationGenerator with invalid output path
      const invalidGenerator = new DocumentationGenerator({
        outputPath: '/invalid/path/that/does/not/exist'
      });

      const result = await invalidGenerator.generatePiDocumentation('en');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing dependencies gracefully', async () => {
      const generatorWithoutDeps = new DocumentationGenerator({
        outputPath: tempDir,
        piIntegration: null,
        demoOrchestrator: null
      });

      await generatorWithoutDeps.initialize();
      const result = await generatorWithoutDeps.generatePiDocumentation('en');

      // Should still work with fallback data
      expect(result.success).toBe(true);
    });
  });
});