#!/usr/bin/env node

/**
 * Test script for the metadata system implementation
 * Validates that all components work correctly together
 */

import fs from 'fs/promises';
import path from 'path';
import { ModuleDocumentationNormalizer } from './ModuleDocumentationNormalizer.mjs';
import FrontMatterLinter from './front-matter-linter.mjs';
import DocsMetadataValidator from './docs-metadata-validator.mjs';
import { validateMetadata, createDefaultMetadata } from './metadata-schema.mjs';

class MetadataSystemTester {
  constructor() {
    this.testResults = [];
    this.testFiles = [];
  }

  async runAllTests() {
    console.log('🧪 Starting metadata system tests...\n');

    // Test 1: Schema validation
    await this.testMetadataSchema();

    // Test 2: Normalizer functionality
    await this.testNormalizer();

    // Test 3: Front matter linter
    await this.testFrontMatterLinter();

    // Test 4: Integration test
    await this.testIntegration();

    // Cleanup test files
    await this.cleanup();

    // Report results
    this.reportResults();

    return this.testResults.every(result => result.passed);
  }

  async testMetadataSchema() {
    console.log('📋 Testing metadata schema validation...');

    // Test valid metadata
    const validMetadata = createDefaultMetadata({
      module: 'qwallet',
      category: 'module',
      tags: ['qwallet', 'payments']
    });

    const validationErrors = validateMetadata(validMetadata);
    this.addTestResult('Schema validation - valid metadata', validationErrors.length === 0);

    // Test invalid metadata
    const invalidMetadata = {
      version: 'invalid-version',
      author: '',
      ecosystemVersion: 'invalid-version'
    };

    const invalidErrors = validateMetadata(invalidMetadata);
    this.addTestResult('Schema validation - invalid metadata', invalidErrors.length > 0);

    console.log('  ✅ Schema validation tests completed\n');
  }

  async testNormalizer() {
    console.log('🔧 Testing document normalizer...');

    // Create test file
    const testContent = `# Test Module

This is a test module for validation.

## Features

- Feature 1
- Feature 2

## Usage

Example usage here.
`;

    const testFilePath = 'test-module-doc.md';
    await fs.writeFile(testFilePath, testContent);
    this.testFiles.push(testFilePath);

    // Test normalization
    const normalizer = new ModuleDocumentationNormalizer();
    
    try {
      await normalizer.normalizeDocument(testFilePath, {
        module: 'test-module',
        category: 'module'
      });

      // Check if metadata was added
      const normalizedContent = await fs.readFile(testFilePath, 'utf8');
      const hasMetadata = normalizedContent.startsWith('---');
      const hasTableOfContents = normalizedContent.includes('## Table of Contents');

      this.addTestResult('Normalizer - adds metadata', hasMetadata);
      this.addTestResult('Normalizer - adds table of contents', hasTableOfContents);

    } catch (error) {
      this.addTestResult('Normalizer - basic functionality', false, error.message);
    }

    console.log('  ✅ Normalizer tests completed\n');
  }

  async testFrontMatterLinter() {
    console.log('🔍 Testing front matter linter...');

    // Create test file with valid metadata
    const validTestContent = `---
version: "1.0.0"
author: "Test Author"
lastModified: "${new Date().toISOString()}"
reviewedBy: ""
module: "test-module"
relatedModules: []
ecosystemVersion: "v2.0.0"
lastAudit: "${new Date().toISOString()}"
category: "module"
language: "en"
completeness: "draft"
dependencies: []
tags: ["test"]
---

# Test Document

This is a test document.
`;

    const validTestFile = 'test-valid-metadata.md';
    await fs.writeFile(validTestFile, validTestContent);
    this.testFiles.push(validTestFile);

    // Create test file with invalid metadata
    const invalidTestContent = `---
version: "invalid"
author: ""
ecosystemVersion: "invalid"
---

# Invalid Test Document
`;

    const invalidTestFile = 'test-invalid-metadata.md';
    await fs.writeFile(invalidTestFile, invalidTestContent);
    this.testFiles.push(invalidTestFile);

    const linter = new FrontMatterLinter();

    try {
      // Test valid file
      await linter.lintFile(validTestFile);
      const validResult = linter.validationResults.find(r => r.filePath === validTestFile);
      this.addTestResult('Linter - validates correct metadata', validResult && validResult.isValid);

      // Test invalid file
      await linter.lintFile(invalidTestFile);
      const invalidResult = linter.validationResults.find(r => r.filePath === invalidTestFile);
      this.addTestResult('Linter - detects invalid metadata', invalidResult && !invalidResult.isValid);

    } catch (error) {
      this.addTestResult('Linter - basic functionality', false, error.message);
    }

    console.log('  ✅ Linter tests completed\n');
  }

  async testIntegration() {
    console.log('🔗 Testing system integration...');

    // Create a test file without metadata
    const testContent = `# Integration Test Module

This module tests the integration between normalizer and linter.

## Overview

Testing integration functionality.
`;

    const integrationTestFile = 'docs/modules/integration-test/README.md';
    
    // Create directory structure
    await fs.mkdir('docs/modules/integration-test', { recursive: true });
    await fs.writeFile(integrationTestFile, testContent);
    this.testFiles.push(integrationTestFile);

    try {
      // Step 1: Normalize the file (should auto-detect module from path)
      const normalizer = new ModuleDocumentationNormalizer();
      await normalizer.normalizeDocument(integrationTestFile);

      // Step 2: Validate with linter
      const linter = new FrontMatterLinter();
      await linter.lintFile(integrationTestFile);

      const result = linter.validationResults.find(r => r.filePath === integrationTestFile);
      this.addTestResult('Integration - normalize then validate', result && result.isValid);

      // Step 3: Check content structure
      const finalContent = await fs.readFile(integrationTestFile, 'utf8');
      const hasCorrectModule = finalContent.includes('module: integration-test');
      const hasCorrectCategory = finalContent.includes('category: module');
      
      this.addTestResult('Integration - correct metadata values', hasCorrectModule && hasCorrectCategory);

    } catch (error) {
      this.addTestResult('Integration - end-to-end workflow', false, error.message);
    }

    console.log('  ✅ Integration tests completed\n');
  }

  addTestResult(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed,
      error
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up test files...');
    
    for (const file of this.testFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might not exist, ignore
      }
    }

    // Clean up test directory
    try {
      await fs.rm('docs/modules/integration-test', { recursive: true });
    } catch (error) {
      // Directory might not exist, ignore
    }

    // Clean up generated reports
    const reportFiles = [
      'docs/front-matter-validation-report.json',
      'docs/front-matter-validation-report.md',
      'docs/normalization-report.json',
      'docs/normalization-report.md'
    ];

    for (const file of reportFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might not exist, ignore
      }
    }
  }

  reportResults() {
    console.log('📊 Test Results Summary:\n');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.name}${result.error ? `: ${result.error}` : ''}`);
        });
      console.log();
    }

    console.log('📋 All Tests:');
    this.testResults.forEach(result => {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}`);
    });

    console.log(`\n${passed === this.testResults.length ? '🎉' : '⚠️'} Testing ${passed === this.testResults.length ? 'completed successfully' : 'completed with failures'}`);
  }
}

// CLI interface
async function main() {
  const tester = new MetadataSystemTester();
  const allPassed = await tester.runAllTests();
  
  process.exit(allPassed ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
}

export default MetadataSystemTester;