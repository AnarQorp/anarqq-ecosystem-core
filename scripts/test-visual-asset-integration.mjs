#!/usr/bin/env node

/**
 * Visual Asset Integration Test
 * Tests the complete visual asset management system integration
 */

import { VisualAssetManager } from './VisualAssetManager.mjs';
import { AutomatedDiagramGenerator } from './AutomatedDiagramGenerator.mjs';
import { ScriptGenerator } from './ScriptGenerator.mjs';
import fs from 'fs/promises';
import path from 'path';

class VisualAssetIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run a test and record results
   */
  async runTest(name, testFn) {
    console.log(`🧪 Running test: ${name}`);
    
    try {
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', error: null });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  /**
   * Test Visual Asset Manager initialization
   */
  async testAssetManagerInit() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    // Check if directories were created
    const assetsDir = 'docs/assets';
    const diagramsDir = 'docs/assets/diagrams';
    
    const assetsDirExists = await fs.access(assetsDir).then(() => true).catch(() => false);
    const diagramsDirExists = await fs.access(diagramsDir).then(() => true).catch(() => false);
    
    if (!assetsDirExists) throw new Error('Assets directory not created');
    if (!diagramsDirExists) throw new Error('Diagrams directory not created');
    
    // Check if design tokens were loaded
    if (Object.keys(manager.designTokens).length === 0) {
      throw new Error('Design tokens not loaded');
    }
    
    // Check if asset library was loaded
    if (Object.keys(manager.assetLibrary).length === 0) {
      throw new Error('Asset library not loaded');
    }
  }

  /**
   * Test Mermaid diagram creation
   */
  async testMermaidDiagramCreation() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    const testDiagram = `graph TD
    A[Start] --> B[Process]
    B --> C[End]`;
    
    const metadata = {
      title: 'Test Diagram',
      description: 'Integration test diagram',
      module: 'test'
    };
    
    const diagramPath = await manager.createMermaidDiagram('test-integration', testDiagram, metadata);
    
    // Check if file was created
    const fileExists = await fs.access(diagramPath).then(() => true).catch(() => false);
    if (!fileExists) throw new Error('Diagram file not created');
    
    // Check if asset was registered
    const assets = Array.from(manager.assets.values());
    const testAsset = assets.find(asset => asset.name === 'test-integration');
    if (!testAsset) throw new Error('Diagram not registered in asset manager');
  }

  /**
   * Test design tokens system
   */
  async testDesignTokens() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    const tokens = manager.designTokens;
    
    // Check required token categories
    const requiredCategories = ['colors', 'typography', 'spacing', 'branding'];
    for (const category of requiredCategories) {
      if (!tokens[category]) {
        throw new Error(`Missing design token category: ${category}`);
      }
    }
    
    // Check module branding
    const modules = ['squid', 'qwallet', 'qmarket', 'dao'];
    for (const module of modules) {
      if (!tokens.branding.modules[module]) {
        throw new Error(`Missing branding for module: ${module}`);
      }
      if (!tokens.branding.modules[module].color) {
        throw new Error(`Missing color for module: ${module}`);
      }
    }
  }

  /**
   * Test automated diagram generation
   */
  async testAutomatedDiagramGeneration() {
    const generator = new AutomatedDiagramGenerator();
    await generator.init();
    
    // Create a test OpenAPI spec
    const testSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API for integration'
      },
      paths: {
        '/test': {
          get: {
            summary: 'Test endpoint',
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      }
    };
    
    // Create temporary spec file
    const specPath = 'test-openapi.yaml';
    await fs.writeFile(specPath, JSON.stringify(testSpec), 'utf8');
    
    try {
      // Generate diagram
      const diagramPath = await generator.assetManager.generateOpenAPIDiagram(specPath, 'test-api');
      
      if (!diagramPath) throw new Error('OpenAPI diagram not generated');
      
      // Check if file exists
      const fileExists = await fs.access(diagramPath).then(() => true).catch(() => false);
      if (!fileExists) throw new Error('Generated diagram file not found');
      
    } finally {
      // Clean up
      await fs.unlink(specPath).catch(() => {});
    }
  }

  /**
   * Test script generator integration
   */
  async testScriptGeneratorIntegration() {
    const scriptGen = new ScriptGenerator();
    await scriptGen.init();
    
    // Check if asset manager was initialized
    if (!scriptGen.assetManager) {
      throw new Error('Asset manager not initialized in ScriptGenerator');
    }
    
    // Test asset manifest generation
    const manifest = scriptGen.assetManager.generateAssetManifest('global');
    
    if (!manifest.assets) throw new Error('Asset manifest not generated');
    if (!manifest.designTokens) throw new Error('Design tokens not included in manifest');
    
    // Check required asset categories
    const requiredCategories = ['logos', 'icons', 'diagrams', 'screenshots', 'animations'];
    for (const category of requiredCategories) {
      if (!manifest.assets[category]) {
        throw new Error(`Missing asset category in manifest: ${category}`);
      }
    }
  }

  /**
   * Test asset search functionality
   */
  async testAssetSearch() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    // Create test assets
    await manager.createMermaidDiagram('search-test-1', 'graph TD\nA-->B', { module: 'qwallet' });
    await manager.createMermaidDiagram('search-test-2', 'graph TD\nC-->D', { module: 'qmarket' });
    
    // Test search by module
    const qwalletAssets = manager.searchAssets({ module: 'qwallet' });
    const qmarketAssets = manager.searchAssets({ module: 'qmarket' });
    
    if (qwalletAssets.length === 0) throw new Error('Search by module failed for qwallet');
    if (qmarketAssets.length === 0) throw new Error('Search by module failed for qmarket');
    
    // Test search by type
    const diagramAssets = manager.searchAssets({ type: 'diagram' });
    if (diagramAssets.length < 2) throw new Error('Search by type failed for diagrams');
  }

  /**
   * Test visual asset library templates
   */
  async testAssetLibraryTemplates() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    const library = manager.assetLibrary;
    
    // Check Mermaid templates
    const mermaidTemplates = library.templates.mermaid;
    const requiredMermaidTemplates = ['architecture', 'sequence', 'flowchart', 'ecosystem'];
    
    for (const template of requiredMermaidTemplates) {
      if (!mermaidTemplates[template]) {
        throw new Error(`Missing Mermaid template: ${template}`);
      }
      if (typeof mermaidTemplates[template] !== 'string') {
        throw new Error(`Invalid Mermaid template format: ${template}`);
      }
    }
    
    // Check Excalidraw templates
    const excalidrawTemplates = library.templates.excalidraw;
    const requiredExcalidrawTemplates = ['wireframe', 'diagram'];
    
    for (const template of requiredExcalidrawTemplates) {
      if (!excalidrawTemplates[template]) {
        throw new Error(`Missing Excalidraw template: ${template}`);
      }
    }
  }

  /**
   * Test asset metadata extraction
   */
  async testAssetMetadataExtraction() {
    const manager = new VisualAssetManager();
    await manager.init();
    
    // Create test SVG with metadata
    const testSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <title>Test Icon</title>
  <desc>Test icon for metadata extraction</desc>
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`;
    
    const testPath = 'docs/assets/icons/test-metadata.svg';
    await fs.writeFile(testPath, testSvg, 'utf8');
    
    try {
      await manager.registerAsset(testPath);
      
      const assets = Array.from(manager.assets.values());
      const testAsset = assets.find(asset => asset.name === 'test-metadata');
      
      if (!testAsset) throw new Error('Test asset not registered');
      if (!testAsset.metadata.description) throw new Error('SVG title not extracted');
      if (!testAsset.metadata.dimensions) throw new Error('SVG dimensions not extracted');
      
    } finally {
      // Clean up
      await fs.unlink(testPath).catch(() => {});
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Visual Asset Integration Tests...\n');
    
    await this.runTest('Asset Manager Initialization', () => this.testAssetManagerInit());
    await this.runTest('Mermaid Diagram Creation', () => this.testMermaidDiagramCreation());
    await this.runTest('Design Tokens System', () => this.testDesignTokens());
    await this.runTest('Automated Diagram Generation', () => this.testAutomatedDiagramGeneration());
    await this.runTest('Script Generator Integration', () => this.testScriptGeneratorIntegration());
    await this.runTest('Asset Search Functionality', () => this.testAssetSearch());
    await this.runTest('Asset Library Templates', () => this.testAssetLibraryTemplates());
    await this.runTest('Asset Metadata Extraction', () => this.testAssetMetadataExtraction());
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => console.log(`  - ${test.name}: ${test.error}`));
    }
    
    return this.results.failed === 0;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new VisualAssetIntegrationTest();
  
  tester.runAllTests()
    .then(success => {
      if (success) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { VisualAssetIntegrationTest };