/**
 * Contract Test Runner Tests
 * Tests for the contract test runner system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContractTestRunner } from '../ContractTestRunner';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ContractTestRunner', () => {
  let testModulesPath: string;
  let testOutputPath: string;
  let runner: ContractTestRunner;

  beforeEach(() => {
    testModulesPath = join(__dirname, 'test-modules');
    testOutputPath = join(__dirname, 'test-output');
    
    // Create test directories
    mkdirSync(testModulesPath, { recursive: true });
    mkdirSync(testOutputPath, { recursive: true });

    runner = new ContractTestRunner({
      modulesPath: testModulesPath,
      outputPath: testOutputPath,
      testCrossModule: true,
      generateReports: false, // Disable for tests
      parallel: false // Sequential for predictable testing
    });
  });

  afterEach(() => {
    // Clean up test directories
    rmSync(testModulesPath, { recursive: true, force: true });
    rmSync(testOutputPath, { recursive: true, force: true });
    runner.clearTestSuites();
  });

  describe('discoverModules', () => {
    it('should discover valid modules', async () => {
      // Create test modules
      const moduleNames = ['module-a', 'module-b', 'module-c'];
      
      for (const moduleName of moduleNames) {
        const modulePath = join(testModulesPath, moduleName);
        mkdirSync(modulePath, { recursive: true });
        
        writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
          name: moduleName,
          version: '1.0.0'
        }));
      }

      // Create a non-module directory (no package.json)
      mkdirSync(join(testModulesPath, 'not-a-module'), { recursive: true });

      const discoveredModules = await runner.discoverModules();
      
      expect(discoveredModules).toHaveLength(3);
      expect(discoveredModules).toContain('module-a');
      expect(discoveredModules).toContain('module-b');
      expect(discoveredModules).toContain('module-c');
      expect(discoveredModules).not.toContain('not-a-module');
    });

    it('should respect include/exclude filters', async () => {
      // Create test modules
      const moduleNames = ['module-a', 'module-b', 'module-c'];
      
      for (const moduleName of moduleNames) {
        const modulePath = join(testModulesPath, moduleName);
        mkdirSync(modulePath, { recursive: true });
        
        writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
          name: moduleName,
          version: '1.0.0'
        }));
      }

      // Test include filter
      const runnerWithInclude = new ContractTestRunner({
        modulesPath: testModulesPath,
        outputPath: testOutputPath,
        includeModules: ['module-a', 'module-c']
      });

      const includedModules = await runnerWithInclude.discoverModules();
      expect(includedModules).toHaveLength(2);
      expect(includedModules).toContain('module-a');
      expect(includedModules).toContain('module-c');
      expect(includedModules).not.toContain('module-b');

      // Test exclude filter
      const runnerWithExclude = new ContractTestRunner({
        modulesPath: testModulesPath,
        outputPath: testOutputPath,
        excludeModules: ['module-b']
      });

      const excludedModules = await runnerWithExclude.discoverModules();
      expect(excludedModules).toHaveLength(2);
      expect(excludedModules).toContain('module-a');
      expect(excludedModules).toContain('module-c');
      expect(excludedModules).not.toContain('module-b');
    });
  });

  describe('generateModuleTests', () => {
    it('should generate tests for a module with all components', async () => {
      const moduleName = 'test-module';
      const modulePath = join(testModulesPath, moduleName);
      
      // Create module structure
      mkdirSync(modulePath, { recursive: true });
      mkdirSync(join(modulePath, 'contracts'), { recursive: true });
      mkdirSync(join(modulePath, 'events'), { recursive: true });

      // Create module files
      writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
        name: moduleName,
        version: '1.0.0'
      }));

      writeFileSync(join(modulePath, 'openapi.yaml'), `
openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
      `);

      writeFileSync(join(modulePath, 'mcp.json'), JSON.stringify({
        name: moduleName,
        version: '1.0.0',
        tools: [
          {
            name: 'test.tool',
            description: 'Test tool',
            inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
            outputSchema: { type: 'object', properties: { output: { type: 'string' } } }
          }
        ]
      }));

      writeFileSync(join(modulePath, 'contracts', 'test.schema.json'), JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      }));

      writeFileSync(join(modulePath, 'events', 'test.event.json'), JSON.stringify({
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['eventType', 'timestamp']
      }));

      const testSuite = await runner.generateModuleTests(moduleName);

      expect(testSuite.name).toBe(moduleName);
      expect(testSuite.tests.length).toBeGreaterThan(0);

      // Check for different test types
      const testTypes = testSuite.tests.map(t => t.type);
      expect(testTypes).toContain('SCHEMA');
      expect(testTypes).toContain('EVENT');
      expect(testTypes).toContain('API');
      expect(testTypes).toContain('MCP');

      // Check test names
      const testNames = testSuite.tests.map(t => t.name);
      expect(testNames).toContain(`${moduleName}.schema.test`);
      expect(testNames).toContain(`${moduleName}.event.test`);
      expect(testNames).toContain(`${moduleName}.openapi`);
      expect(testNames).toContain(`${moduleName}.mcp`);
    });

    it('should handle modules with minimal configuration', async () => {
      const moduleName = 'minimal-module';
      const modulePath = join(testModulesPath, moduleName);
      
      // Create minimal module (only package.json)
      mkdirSync(modulePath, { recursive: true });
      writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
        name: moduleName,
        version: '1.0.0'
      }));

      const testSuite = await runner.generateModuleTests(moduleName);

      expect(testSuite.name).toBe(moduleName);
      expect(testSuite.tests).toHaveLength(0); // No tests for minimal module
    });
  });

  describe('generateCrossModuleTests', () => {
    it('should generate cross-module compatibility tests', async () => {
      const moduleNames = ['module-a', 'module-b'];
      
      // Create test modules
      for (const moduleName of moduleNames) {
        const modulePath = join(testModulesPath, moduleName);
        mkdirSync(modulePath, { recursive: true });
        mkdirSync(join(modulePath, 'contracts'), { recursive: true });
        
        writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
          name: moduleName,
          version: '1.0.0'
        }));

        writeFileSync(join(modulePath, 'contracts', 'shared.schema.json'), JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'string' },
            data: { type: 'object' }
          }
        }));
      }

      const crossModuleSuite = await runner.generateCrossModuleTests(moduleNames);

      expect(crossModuleSuite.name).toBe('cross-module');
      expect(crossModuleSuite.tests.length).toBeGreaterThan(0);

      const testNames = crossModuleSuite.tests.map(t => t.name);
      expect(testNames).toContain('cross-module.module-a.module-b');

      // All tests should be CROSS_MODULE type
      const testTypes = crossModuleSuite.tests.map(t => t.type);
      expect(testTypes.every(type => type === 'CROSS_MODULE')).toBe(true);
    });
  });

  describe('runTestSuite', () => {
    it('should run a test suite and return results', async () => {
      const moduleName = 'test-module';
      const modulePath = join(testModulesPath, moduleName);
      
      // Create a simple test module
      mkdirSync(modulePath, { recursive: true });
      mkdirSync(join(modulePath, 'contracts'), { recursive: true });

      writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
        name: moduleName,
        version: '1.0.0'
      }));

      writeFileSync(join(modulePath, 'contracts', 'simple.schema.json'), JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }));

      const testSuite = await runner.generateModuleTests(moduleName);
      const results = await runner.runTestSuite(testSuite);

      expect(results.size).toBeGreaterThan(0);
      
      // Check that we have results for schema tests
      const schemaTestResult = Array.from(results.entries())
        .find(([name]) => name.includes('schema'));
      
      expect(schemaTestResult).toBeDefined();
      
      const [testName, result] = schemaTestResult!;
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('coverage');
    });

    it('should handle test failures gracefully', async () => {
      // Create a test suite with a failing test
      const testSuite = {
        name: 'failing-suite',
        tests: [
          {
            name: 'failing-test',
            description: 'A test that always fails',
            module: 'test',
            type: 'SCHEMA' as const,
            run: async () => {
              throw new Error('Test failure');
            }
          }
        ]
      };

      const results = await runner.runTestSuite(testSuite);
      
      expect(results.size).toBe(1);
      const result = results.get('failing-test');
      
      expect(result).toBeDefined();
      expect(result!.valid).toBe(false);
      expect(result!.errors.length).toBeGreaterThan(0);
      expect(result!.errors[0].message).toContain('Test execution failed');
    });
  });

  describe('runAllTests', () => {
    it('should run all tests and return comprehensive results', async () => {
      // Create multiple test modules
      const moduleNames = ['module-a', 'module-b'];
      
      for (const moduleName of moduleNames) {
        const modulePath = join(testModulesPath, moduleName);
        mkdirSync(modulePath, { recursive: true });
        mkdirSync(join(modulePath, 'contracts'), { recursive: true });
        
        writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
          name: moduleName,
          version: '1.0.0'
        }));

        writeFileSync(join(modulePath, 'contracts', 'test.schema.json'), JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }));
      }

      const results = await runner.runAllTests();

      expect(results.summary).toBeDefined();
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.moduleResults.size).toBe(2);
      expect(results.moduleResults.has('module-a')).toBe(true);
      expect(results.moduleResults.has('module-b')).toBe(true);
      
      // Should have cross-module tests
      expect(results.crossModuleResults.size).toBeGreaterThan(0);
      
      expect(results.summary.duration).toBeGreaterThan(0);
    });
  });
});