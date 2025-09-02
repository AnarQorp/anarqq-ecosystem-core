/**
 * Comprehensive Test Suite for Contract Testing Framework
 * Tests the contract testing infrastructure itself
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContractValidator } from '../ContractValidator';
import { ContractTestRunner } from '../ContractTestRunner';
import { TestReporter } from '../TestReporter';
import { EnhancedContractTestRunner } from '../EnhancedContractTestRunner';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Contract Testing Framework', () => {
  const testDir = './test-temp';
  const modulesDir = join(testDir, 'modules');
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    // Create test directory structure
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(modulesDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    // Create sample modules for testing
    createSampleModule('qchat');
    createSampleModule('qwallet');
    createSampleModule('qdrive');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('ContractValidator', () => {
    let validator: ContractValidator;

    beforeEach(() => {
      validator = new ContractValidator();
    });

    it('should load module contracts successfully', async () => {
      const contract = await validator.loadModuleContract(join(modulesDir, 'qchat'));
      
      expect(contract).toBeDefined();
      expect(contract.name).toBe('qchat');
      expect(contract.version).toBe('1.0.0');
      expect(contract.schemas).toBeDefined();
      expect(contract.events).toBeDefined();
    });

    it('should validate JSON schemas correctly', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const validData = { id: '123', name: 'test' };
      const invalidData = { id: '123' }; // missing name

      const validErrors = validator.validateSchema(schema, validData, 'test');
      const invalidErrors = validator.validateSchema(schema, invalidData, 'test');

      expect(validErrors).toHaveLength(0);
      expect(invalidErrors).toHaveLength(1);
      expect(invalidErrors[0].type).toBe('SCHEMA_VALIDATION');
    });

    it('should validate OpenAPI specifications', () => {
      const validSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const invalidSpec = {
        openapi: '3.0.0'
        // missing required info
      };

      const validErrors = validator.validateOpenApiSpec(validSpec);
      const invalidErrors = validator.validateOpenApiSpec(invalidSpec);

      expect(validErrors).toHaveLength(0);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate MCP specifications', () => {
      const validMcp = {
        name: 'test-mcp',
        version: '1.0.0',
        tools: [
          {
            name: 'test.tool',
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' }
          }
        ]
      };

      const invalidMcp = {
        name: 'test-mcp'
        // missing version and tools
      };

      const validErrors = validator.validateMcpSpec(validMcp);
      const invalidErrors = validator.validateMcpSpec(invalidMcp);

      expect(validErrors).toHaveLength(0);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate cross-module compatibility', async () => {
      await validator.loadModuleContract(join(modulesDir, 'qchat'));
      await validator.loadModuleContract(join(modulesDir, 'qwallet'));

      const errors = validator.validateCrossModuleCompatibility('qchat', 'qwallet');
      
      expect(Array.isArray(errors)).toBe(true);
      // Specific compatibility checks would depend on the sample modules
    });

    it('should generate test data from schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9]+$' },
          count: { type: 'integer', minimum: 1, maximum: 100 },
          active: { type: 'boolean' }
        },
        required: ['id', 'count']
      };

      const testData = validator.generateTestData(schema);
      
      expect(testData).toBeDefined();
      expect(typeof testData.id).toBe('string');
      expect(typeof testData.count).toBe('number');
      expect(testData.count).toBeGreaterThanOrEqual(1);
      expect(testData.count).toBeLessThanOrEqual(100);
    });
  });

  describe('ContractTestRunner', () => {
    let runner: ContractTestRunner;

    beforeEach(() => {
      runner = new ContractTestRunner({
        modulesPath: modulesDir,
        outputPath: outputDir,
        testCrossModule: true,
        generateReports: true,
        parallel: false, // Sequential for testing
        timeout: 10000
      });
    });

    it('should discover modules correctly', async () => {
      const modules = await runner.discoverModules();
      
      expect(modules).toContain('qchat');
      expect(modules).toContain('qwallet');
      expect(modules).toContain('qdrive');
      expect(modules).toHaveLength(3);
    });

    it('should generate module tests', async () => {
      const testSuite = await runner.generateModuleTests('qchat');
      
      expect(testSuite.name).toBe('qchat');
      expect(testSuite.tests.length).toBeGreaterThan(0);
      
      // Check for different test types
      const schemaTests = testSuite.tests.filter(t => t.type === 'SCHEMA');
      const apiTests = testSuite.tests.filter(t => t.type === 'API');
      const mcpTests = testSuite.tests.filter(t => t.type === 'MCP');
      
      expect(schemaTests.length).toBeGreaterThan(0);
      expect(apiTests.length).toBeGreaterThan(0);
      expect(mcpTests.length).toBeGreaterThan(0);
    });

    it('should generate cross-module tests', async () => {
      const modules = ['qchat', 'qwallet'];
      const testSuite = await runner.generateCrossModuleTests(modules);
      
      expect(testSuite.name).toBe('cross-module');
      expect(testSuite.tests.length).toBeGreaterThan(0);
      
      // Check for integration tests
      const integrationTests = testSuite.tests.filter(t => 
        t.name.includes('integration')
      );
      expect(integrationTests.length).toBeGreaterThan(0);
    });

    it('should run test suite successfully', async () => {
      const testSuite = await runner.generateModuleTests('qchat');
      const results = await runner.runTestSuite(testSuite);
      
      expect(results.size).toBeGreaterThan(0);
      
      // Check that all tests have results
      results.forEach((result, testName) => {
        expect(result).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(result.coverage).toBeDefined();
      });
    });

    it('should run all tests and generate results', async () => {
      const results = await runner.runAllTests();
      
      expect(results.summary).toBeDefined();
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.moduleResults.size).toBeGreaterThan(0);
      expect(results.crossModuleResults.size).toBeGreaterThan(0);
      
      // Check summary calculations
      const totalPassed = results.summary.passed;
      const totalFailed = results.summary.failed;
      expect(totalPassed + totalFailed).toBe(results.summary.total);
    });
  });

  describe('TestReporter', () => {
    let reporter: TestReporter;
    let sampleResults: any;

    beforeEach(() => {
      reporter = new TestReporter(outputDir);
      sampleResults = createSampleTestResults();
    });

    it('should generate JSON report', async () => {
      await reporter.generateReports(sampleResults);
      
      const jsonPath = join(outputDir, 'contract-test-report.json');
      expect(existsSync(jsonPath)).toBe(true);
      
      const reportContent = require(jsonPath);
      expect(reportContent.summary).toBeDefined();
      expect(reportContent.modules).toBeDefined();
      expect(reportContent.metadata).toBeDefined();
    });

    it('should generate HTML report', async () => {
      await reporter.generateReports(sampleResults);
      
      const htmlPath = join(outputDir, 'contract-test-report.html');
      expect(existsSync(htmlPath)).toBe(true);
      
      const htmlContent = require('fs').readFileSync(htmlPath, 'utf8');
      expect(htmlContent).toContain('Contract Test Report');
      expect(htmlContent).toContain('Summary');
    });

    it('should generate JUnit report', async () => {
      await reporter.generateReports(sampleResults);
      
      const junitPath = join(outputDir, 'contract-test-results.xml');
      expect(existsSync(junitPath)).toBe(true);
      
      const xmlContent = require('fs').readFileSync(junitPath, 'utf8');
      expect(xmlContent).toContain('<?xml version="1.0"');
      expect(xmlContent).toContain('<testsuites');
    });

    it('should generate failure analysis', async () => {
      const resultsWithFailures = {
        ...sampleResults,
        errors: [
          {
            type: 'SCHEMA_VALIDATION',
            path: 'test.schema',
            message: 'Schema validation failed',
            severity: 'ERROR'
          },
          {
            type: 'SCHEMA_VALIDATION', 
            path: 'another.schema',
            message: 'Schema validation failed',
            severity: 'ERROR'
          }
        ]
      };

      await reporter.generateReports(resultsWithFailures);
      
      const jsonPath = join(outputDir, 'contract-test-report.json');
      const report = require(jsonPath);
      
      expect(report.failureAnalysis).toBeDefined();
      expect(report.failureAnalysis.commonPatterns).toBeDefined();
      expect(report.failureAnalysis.commonPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('EnhancedContractTestRunner', () => {
    let enhancedRunner: EnhancedContractTestRunner;

    beforeEach(() => {
      enhancedRunner = new EnhancedContractTestRunner({
        modulesPath: modulesDir,
        outputPath: outputDir,
        testCrossModule: true,
        generateReports: true,
        enablePerformanceMonitoring: true,
        enableSecurityScanning: false, // Disabled for testing
        enableDependencyAnalysis: false, // Disabled for testing
        parallel: false,
        timeout: 10000
      });
    });

    it('should run enhanced tests with performance monitoring', async () => {
      const results = await enhancedRunner.runEnhancedTests();
      
      expect(results.summary).toBeDefined();
      expect(results.performanceMetrics).toBeDefined();
      expect(results.qualityGateResults).toBeDefined();
      
      // Check performance metrics
      expect(results.performanceMetrics?.totalDuration).toBeGreaterThan(0);
      expect(results.performanceMetrics?.averageTestDuration).toBeGreaterThanOrEqual(0);
    });

    it('should apply quality gates correctly', async () => {
      const results = await enhancedRunner.runEnhancedTests();
      
      expect(results.qualityGateResults).toBeDefined();
      expect(typeof results.qualityGateResults?.passed).toBe('boolean');
      expect(Array.isArray(results.qualityGateResults?.gates)).toBe(true);
      
      // Check that gates have required properties
      results.qualityGateResults?.gates.forEach(gate => {
        expect(gate.name).toBeDefined();
        expect(typeof gate.passed).toBe('boolean');
        expect(gate.message).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from discovery to reporting', async () => {
      const runner = new ContractTestRunner({
        modulesPath: modulesDir,
        outputPath: outputDir,
        testCrossModule: true,
        generateReports: true,
        parallel: false,
        timeout: 10000
      });

      // Run complete workflow
      const results = await runner.runAllTests();
      
      // Verify results
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.moduleResults.size).toBe(3); // qchat, qwallet, qdrive
      
      // Verify reports were generated
      expect(existsSync(join(outputDir, 'contract-test-report.json'))).toBe(true);
      expect(existsSync(join(outputDir, 'contract-test-report.html'))).toBe(true);
      expect(existsSync(join(outputDir, 'contract-test-results.xml'))).toBe(true);
    });

    it('should handle module filtering correctly', async () => {
      const runner = new ContractTestRunner({
        modulesPath: modulesDir,
        outputPath: outputDir,
        includeModules: ['qchat', 'qwallet'],
        testCrossModule: true,
        generateReports: false,
        parallel: false,
        timeout: 10000
      });

      const modules = await runner.discoverModules();
      expect(modules).toHaveLength(2);
      expect(modules).toContain('qchat');
      expect(modules).toContain('qwallet');
      expect(modules).not.toContain('qdrive');
    });

    it('should handle errors gracefully', async () => {
      // Create a module with invalid contract
      createInvalidModule('invalid-module');

      const runner = new ContractTestRunner({
        modulesPath: modulesDir,
        outputPath: outputDir,
        testCrossModule: false,
        generateReports: false,
        parallel: false,
        timeout: 10000
      });

      const results = await runner.runAllTests();
      
      // Should still complete but with errors
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.summary.failed).toBeGreaterThan(0);
    });
  });

  // Helper functions
  function createSampleModule(name: string): void {
    const moduleDir = join(modulesDir, name);
    mkdirSync(moduleDir, { recursive: true });
    mkdirSync(join(moduleDir, 'contracts'));
    mkdirSync(join(moduleDir, 'events'));

    // Package.json
    writeFileSync(join(moduleDir, 'package.json'), JSON.stringify({
      name: `@anarq/${name}`,
      version: '1.0.0',
      description: `${name} module`,
      dependencies: {}
    }, null, 2));

    // OpenAPI spec
    writeFileSync(join(moduleDir, 'openapi.yaml'), `
openapi: 3.0.0
info:
  title: ${name} API
  version: 1.0.0
paths:
  /${name}/health:
    get:
      summary: Health check
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [ok]
`);

    // MCP spec
    writeFileSync(join(moduleDir, 'mcp.json'), JSON.stringify({
      name,
      version: '1.0.0',
      tools: [
        {
          name: `${name}.test`,
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            },
            required: ['id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        }
      ]
    }, null, 2));

    // Contract schema
    writeFileSync(join(moduleDir, 'contracts', 'test.schema.json'), JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: `${name} Test Schema`,
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['id', 'name']
    }, null, 2));

    // Event schema
    writeFileSync(join(moduleDir, 'events', 'test-event.event.json'), JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: `${name} Test Event`,
      type: 'object',
      properties: {
        eventType: { type: 'string', const: `q.${name}.test.v1` },
        timestamp: { type: 'string', format: 'date-time' },
        data: { $ref: '../contracts/test.schema.json' }
      },
      required: ['eventType', 'timestamp', 'data']
    }, null, 2));
  }

  function createInvalidModule(name: string): void {
    const moduleDir = join(modulesDir, name);
    mkdirSync(moduleDir, { recursive: true });

    // Invalid package.json
    writeFileSync(join(moduleDir, 'package.json'), '{ invalid json }');
  }

  function createSampleTestResults(): any {
    return {
      summary: {
        total: 10,
        passed: 8,
        failed: 2,
        warnings: 3,
        coverage: 85.5,
        duration: 15000
      },
      moduleResults: new Map([
        ['qchat', {
          valid: true,
          errors: [],
          warnings: ['Minor warning'],
          coverage: { endpoints: 5, schemas: 3, tested: 8, percentage: 90 }
        }],
        ['qwallet', {
          valid: false,
          errors: [
            {
              type: 'SCHEMA_VALIDATION',
              path: 'payment.schema',
              message: 'Invalid schema',
              severity: 'ERROR'
            }
          ],
          warnings: [],
          coverage: { endpoints: 3, schemas: 2, tested: 4, percentage: 80 }
        }]
      ]),
      crossModuleResults: new Map([
        ['integration.qchat.qwallet', []]
      ]),
      errors: []
    };
  }
});