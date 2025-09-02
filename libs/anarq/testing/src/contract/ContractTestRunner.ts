/**
 * Contract Test Runner for Q Ecosystem Modules
 * Orchestrates contract testing across modules
 */

import { ContractValidator, ContractValidationResult, ContractValidationError } from './ContractValidator';
import { TestReporter } from './TestReporter';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export interface ContractTestConfig {
  modulesPath: string;
  outputPath: string;
  includeModules?: string[];
  excludeModules?: string[];
  testEndpoints?: boolean;
  testCrossModule?: boolean;
  generateReports?: boolean;
  failOnWarnings?: boolean;
  parallel?: boolean;
  timeout?: number;
}

export interface ContractTestSuite {
  name: string;
  tests: ContractTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface ContractTest {
  name: string;
  description: string;
  module: string;
  type: 'SCHEMA' | 'API' | 'MCP' | 'CROSS_MODULE' | 'EVENT';
  run: () => Promise<ContractValidationResult>;
}

export interface ContractTestResults {
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    coverage: number;
    duration: number;
  };
  moduleResults: Map<string, ContractValidationResult>;
  crossModuleResults: Map<string, ContractValidationError[]>;
  errors: ContractValidationError[];
}

export class ContractTestRunner {
  private validator: ContractValidator;
  private reporter: TestReporter;
  private config: ContractTestConfig;
  private testSuites: Map<string, ContractTestSuite> = new Map();

  constructor(config: ContractTestConfig) {
    this.config = config;
    this.validator = new ContractValidator();
    this.reporter = new TestReporter(config.outputPath);
  }

  /**
   * Discover and load all module contracts
   */
  async discoverModules(): Promise<string[]> {
    const modules: string[] = [];
    
    try {
      const entries = readdirSync(this.config.modulesPath);
      
      for (const entry of entries) {
        const modulePath = join(this.config.modulesPath, entry);
        const stat = statSync(modulePath);
        
        if (stat.isDirectory()) {
          // Check if it's a valid module (has package.json)
          try {
            const packagePath = join(modulePath, 'package.json');
            statSync(packagePath);
            
            // Apply include/exclude filters
            if (this.config.includeModules && 
                !this.config.includeModules.includes(entry)) {
              continue;
            }
            
            if (this.config.excludeModules && 
                this.config.excludeModules.includes(entry)) {
              continue;
            }
            
            modules.push(entry);
          } catch (e) {
            // Not a valid module, skip
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to discover modules: ${error.message}`);
    }

    return modules;
  }

  /**
   * Generate contract tests for a module
   */
  async generateModuleTests(moduleName: string): Promise<ContractTestSuite> {
    const modulePath = join(this.config.modulesPath, moduleName);
    const tests: ContractTest[] = [];

    // Load module contract
    const contract = await this.validator.loadModuleContract(modulePath);

    // Schema validation tests
    Object.keys(contract.schemas).forEach(schemaName => {
      tests.push({
        name: `${moduleName}.schema.${schemaName}`,
        description: `Validate ${schemaName} schema for ${moduleName}`,
        module: moduleName,
        type: 'SCHEMA',
        run: async () => {
          const schema = contract.schemas[schemaName];
          const testData = this.validator.generateTestData(schema);
          const errors = this.validator.validateSchema(schema, testData, schemaName);
          
          return {
            valid: errors.length === 0,
            errors,
            warnings: [],
            coverage: { endpoints: 0, schemas: 1, tested: 1, percentage: 100 }
          };
        }
      });
    });

    // Event schema validation tests
    Object.keys(contract.events).forEach(eventName => {
      tests.push({
        name: `${moduleName}.event.${eventName}`,
        description: `Validate ${eventName} event schema for ${moduleName}`,
        module: moduleName,
        type: 'EVENT',
        run: async () => {
          const eventSchema = contract.events[eventName];
          const testData = this.validator.generateTestData(eventSchema);
          const errors = this.validator.validateSchema(eventSchema, testData, eventName);
          
          return {
            valid: errors.length === 0,
            errors,
            warnings: [],
            coverage: { endpoints: 0, schemas: 1, tested: 1, percentage: 100 }
          };
        }
      });
    });

    // OpenAPI validation tests
    if (contract.openApiSpec) {
      tests.push({
        name: `${moduleName}.openapi`,
        description: `Validate OpenAPI specification for ${moduleName}`,
        module: moduleName,
        type: 'API',
        run: async () => {
          const errors = this.validator.validateOpenApiSpec(contract.openApiSpec);
          const endpoints = Object.keys(contract.openApiSpec.paths || {}).length;
          
          return {
            valid: errors.length === 0,
            errors,
            warnings: [],
            coverage: { endpoints, schemas: 0, tested: endpoints, percentage: 100 }
          };
        }
      });

      // API endpoint tests (if enabled)
      if (this.config.testEndpoints) {
        const paths = contract.openApiSpec.paths || {};
        Object.entries(paths).forEach(([path, pathSpec]: [string, any]) => {
          Object.entries(pathSpec).forEach(([method, methodSpec]: [string, any]) => {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
              tests.push({
                name: `${moduleName}.api.${method.toUpperCase()}.${path}`,
                description: `Test ${method.toUpperCase()} ${path} endpoint for ${moduleName}`,
                module: moduleName,
                type: 'API',
                run: async () => {
                  // This would require the module to be running
                  // For now, we'll just validate the schema structure
                  const errors: ContractValidationError[] = [];
                  
                  if (!methodSpec.responses) {
                    errors.push({
                      type: 'API_COMPLIANCE',
                      path: `${method} ${path}`,
                      message: 'Endpoint missing response definitions',
                      severity: 'ERROR'
                    });
                  }
                  
                  return {
                    valid: errors.length === 0,
                    errors,
                    warnings: [],
                    coverage: { endpoints: 1, schemas: 0, tested: 1, percentage: 100 }
                  };
                }
              });
            }
          });
        });
      }
    }

    // MCP validation tests
    if (contract.mcpSpec) {
      tests.push({
        name: `${moduleName}.mcp`,
        description: `Validate MCP specification for ${moduleName}`,
        module: moduleName,
        type: 'MCP',
        run: async () => {
          const errors = this.validator.validateMcpSpec(contract.mcpSpec);
          const tools = contract.mcpSpec.tools?.length || 0;
          
          return {
            valid: errors.length === 0,
            errors,
            warnings: [],
            coverage: { endpoints: tools, schemas: 0, tested: tools, percentage: 100 }
          };
        }
      });

      // MCP tool tests
      const tools = contract.mcpSpec.tools || [];
      tools.forEach((tool: any) => {
        tests.push({
          name: `${moduleName}.mcp.tool.${tool.name}`,
          description: `Validate MCP tool ${tool.name} for ${moduleName}`,
          module: moduleName,
          type: 'MCP',
          run: async () => {
            const errors: ContractValidationError[] = [];
            
            // Validate input schema
            if (tool.inputSchema) {
              try {
                const testInput = this.validator.generateTestData(tool.inputSchema);
                const inputErrors = this.validator.validateSchema(
                  tool.inputSchema, 
                  testInput, 
                  `${tool.name}.input`
                );
                errors.push(...inputErrors);
              } catch (error: any) {
                errors.push({
                  type: 'SCHEMA_VALIDATION',
                  path: `${tool.name}.inputSchema`,
                  message: `Input schema validation failed: ${error.message}`,
                  severity: 'ERROR'
                });
              }
            }
            
            // Validate output schema
            if (tool.outputSchema) {
              try {
                const testOutput = this.validator.generateTestData(tool.outputSchema);
                const outputErrors = this.validator.validateSchema(
                  tool.outputSchema, 
                  testOutput, 
                  `${tool.name}.output`
                );
                errors.push(...outputErrors);
              } catch (error: any) {
                errors.push({
                  type: 'SCHEMA_VALIDATION',
                  path: `${tool.name}.outputSchema`,
                  message: `Output schema validation failed: ${error.message}`,
                  severity: 'ERROR'
                });
              }
            }
            
            return {
              valid: errors.length === 0,
              errors,
              warnings: [],
              coverage: { endpoints: 1, schemas: 2, tested: 2, percentage: 100 }
            };
          }
        });
      });
    }

    return {
      name: moduleName,
      tests,
      setup: async () => {
        console.log(`Setting up tests for ${moduleName}...`);
      },
      teardown: async () => {
        console.log(`Cleaning up tests for ${moduleName}...`);
      }
    };
  }

  /**
   * Generate cross-module compatibility tests
   */
  async generateCrossModuleTests(modules: string[]): Promise<ContractTestSuite> {
    const tests: ContractTest[] = [];

    // Load all module contracts first
    for (const moduleName of modules) {
      const modulePath = join(this.config.modulesPath, moduleName);
      await this.validator.loadModuleContract(modulePath);
    }

    // Define known integration patterns
    const integrationPatterns = [
      // Core identity and permissions
      { source: 'squid', targets: ['qwallet', 'qmail', 'qmarket', 'qchat', 'qdrive', 'qpic'] },
      { source: 'qonsent', targets: ['qwallet', 'qdrive', 'qmarket', 'qmail', 'qchat'] },
      { source: 'qlock', targets: ['qdrive', 'qmail', 'qwallet', 'qchat'] },
      { source: 'qindex', targets: ['qdrive', 'qmarket', 'qmail', 'qpic'] },
      { source: 'qerberos', targets: ['qwallet', 'qmarket', 'qchat', 'qmail'] },
      { source: 'qmask', targets: ['qdrive', 'qpic', 'qmarket'] },
      
      // Payment integrations
      { source: 'qwallet', targets: ['qmail', 'qmarket', 'qdrive'] },
      
      // Storage and content
      { source: 'qdrive', targets: ['qmarket', 'qpic'] },
      { source: 'qpic', targets: ['qmarket', 'qchat'] },
      
      // Marketplace integrations
      { source: 'qmarket', targets: ['qwallet', 'qindex', 'qmask', 'qerberos'] }
    ];

    // Generate targeted integration tests
    integrationPatterns.forEach(({ source, targets }) => {
      if (modules.includes(source)) {
        targets.forEach(target => {
          if (modules.includes(target)) {
            tests.push({
              name: `integration.${source}.${target}`,
              description: `Test ${source} → ${target} integration compatibility`,
              module: 'cross-module',
              type: 'CROSS_MODULE',
              run: async () => {
                const errors = this.validator.validateCrossModuleCompatibility(source, target);
                
                return {
                  valid: errors.filter(e => e.severity === 'ERROR').length === 0,
                  errors,
                  warnings: errors.filter(e => e.severity === 'WARNING').map(e => e.message),
                  coverage: { endpoints: 0, schemas: 0, tested: 1, percentage: 100 }
                };
              }
            });
          }
        });
      }
    });

    // Generate comprehensive compatibility matrix tests
    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const moduleA = modules[i];
        const moduleB = modules[j];

        // Skip if already covered by integration patterns
        const alreadyCovered = integrationPatterns.some(pattern => 
          (pattern.source === moduleA && pattern.targets.includes(moduleB)) ||
          (pattern.source === moduleB && pattern.targets.includes(moduleA))
        );

        if (!alreadyCovered) {
          tests.push({
            name: `compatibility.${moduleA}.${moduleB}`,
            description: `Test general compatibility between ${moduleA} and ${moduleB}`,
            module: 'cross-module',
            type: 'CROSS_MODULE',
            run: async () => {
              const errorsAB = this.validator.validateCrossModuleCompatibility(moduleA, moduleB);
              const errorsBA = this.validator.validateCrossModuleCompatibility(moduleB, moduleA);
              const errors = [...errorsAB, ...errorsBA];
              
              return {
                valid: errors.filter(e => e.severity === 'ERROR').length === 0,
                errors,
                warnings: errors.filter(e => e.severity === 'WARNING').map(e => e.message),
                coverage: { endpoints: 0, schemas: 0, tested: 1, percentage: 100 }
              };
            }
          });
        }
      }
    }

    // Add ecosystem-wide consistency tests
    tests.push({
      name: 'ecosystem.standard-headers',
      description: 'Validate standard header consistency across all modules',
      module: 'cross-module',
      type: 'CROSS_MODULE',
      run: async () => {
        const errors: any[] = [];
        const standardHeaders = ['x-squid-id', 'x-subid', 'x-qonsent', 'x-sig', 'x-ts', 'x-api-version'];
        
        // Check that all modules with APIs define standard headers consistently
        const moduleContracts = this.validator.getModuleContracts();
        const modulesWithApis = Array.from(moduleContracts.entries())
          .filter(([_, contract]) => contract.openApiSpec);

        standardHeaders.forEach(headerName => {
          const definitions = new Map();
          
          modulesWithApis.forEach(([moduleName, contract]) => {
            const headerDef = this.extractHeaderFromSpec(contract.openApiSpec, headerName);
            if (headerDef) {
              definitions.set(moduleName, headerDef);
            }
          });

          // Check consistency
          if (definitions.size > 1) {
            const firstDef = Array.from(definitions.values())[0];
            definitions.forEach((def, moduleName) => {
              if (JSON.stringify(def) !== JSON.stringify(firstDef)) {
                errors.push({
                  type: 'COMPATIBILITY',
                  path: `headers.${headerName}`,
                  message: `Inconsistent ${headerName} definition in ${moduleName}`,
                  severity: 'WARNING'
                });
              }
            });
          }
        });

        return {
          valid: errors.filter((e: any) => e.severity === 'ERROR').length === 0,
          errors,
          warnings: errors.filter((e: any) => e.severity === 'WARNING').map((e: any) => e.message),
          coverage: { endpoints: 0, schemas: standardHeaders.length, tested: standardHeaders.length, percentage: 100 }
        };
      }
    });

    tests.push({
      name: 'ecosystem.event-naming',
      description: 'Validate event naming convention consistency',
      module: 'cross-module',
      type: 'CROSS_MODULE',
      run: async () => {
        const errors: any[] = [];
        const moduleContracts = this.validator.getModuleContracts();
        
        moduleContracts.forEach((contract, moduleName) => {
          Object.keys(contract.events).forEach(eventName => {
            const expectedPrefix = `q.${moduleName}.`;
            if (!eventName.startsWith(expectedPrefix)) {
              errors.push({
                type: 'COMPATIBILITY',
                path: `events.${eventName}`,
                message: `Event ${eventName} in ${moduleName} doesn't follow naming convention (expected: ${expectedPrefix}*)`,
                severity: 'WARNING'
              });
            }
          });
        });

        return {
          valid: errors.filter((e: any) => e.severity === 'ERROR').length === 0,
          errors,
          warnings: errors.filter((e: any) => e.severity === 'WARNING').map((e: any) => e.message),
          coverage: { endpoints: 0, schemas: 0, tested: 1, percentage: 100 }
        };
      }
    });

    return {
      name: 'cross-module',
      tests,
      setup: async () => {
        console.log('Setting up cross-module compatibility tests...');
      },
      teardown: async () => {
        console.log('Cleaning up cross-module tests...');
      }
    };
  }

  /**
   * Extract header definition from OpenAPI spec
   */
  private extractHeaderFromSpec(spec: any, headerName: string): any {
    // Check components/parameters
    if (spec.components?.parameters) {
      const param = Object.values(spec.components.parameters).find((p: any) => 
        p.in === 'header' && p.name === headerName
      );
      if (param) return param;
    }

    // Check path operations
    if (spec.paths) {
      for (const pathItem of Object.values(spec.paths)) {
        for (const operation of Object.values(pathItem as any)) {
          if ((operation as any).parameters) {
            const param = (operation as any).parameters.find((p: any) => 
              p.in === 'header' && p.name === headerName
            );
            if (param) return param;
          }
        }
      }
    }

    return null;
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(suite: ContractTestSuite): Promise<Map<string, ContractValidationResult>> {
    const results = new Map<string, ContractValidationResult>();

    if (suite.setup) {
      await suite.setup();
    }

    try {
      if (this.config.parallel) {
        // Run tests in parallel
        const promises = suite.tests.map(async (test) => {
          const startTime = Date.now();
          try {
            const result = await Promise.race([
              test.run(),
              new Promise<ContractValidationResult>((_, reject) => 
                setTimeout(() => reject(new Error('Test timeout')), this.config.timeout || 30000)
              )
            ]);
            result.coverage = {
              ...result.coverage,
              duration: Date.now() - startTime
            };
            return { name: test.name, result };
          } catch (error: any) {
            return {
              name: test.name,
              result: {
                valid: false,
                errors: [{
                  type: 'SCHEMA_VALIDATION' as const,
                  path: test.name,
                  message: `Test execution failed: ${error.message}`,
                  severity: 'ERROR' as const
                }],
                warnings: [],
                coverage: { endpoints: 0, schemas: 0, tested: 0, percentage: 0 }
              }
            };
          }
        });

        const testResults = await Promise.all(promises);
        testResults.forEach(({ name, result }) => {
          results.set(name, result);
        });
      } else {
        // Run tests sequentially
        for (const test of suite.tests) {
          const startTime = Date.now();
          try {
            const result = await test.run();
            result.coverage = {
              ...result.coverage,
              duration: Date.now() - startTime
            };
            results.set(test.name, result);
          } catch (error: any) {
            results.set(test.name, {
              valid: false,
              errors: [{
                type: 'SCHEMA_VALIDATION',
                path: test.name,
                message: `Test execution failed: ${error.message}`,
                severity: 'ERROR'
              }],
              warnings: [],
              coverage: { endpoints: 0, schemas: 0, tested: 0, percentage: 0 }
            });
          }
        }
      }
    } finally {
      if (suite.teardown) {
        await suite.teardown();
      }
    }

    return results;
  }

  /**
   * Run all contract tests
   */
  async runAllTests(): Promise<ContractTestResults> {
    const startTime = Date.now();
    const moduleResults = new Map<string, ContractValidationResult>();
    const crossModuleResults = new Map<string, ContractValidationError[]>();
    const allErrors: ContractValidationError[] = [];

    console.log('🔍 Discovering modules...');
    const modules = await this.discoverModules();
    console.log(`Found ${modules.length} modules: ${modules.join(', ')}`);

    // Generate and run module tests
    console.log('\n📋 Running module contract tests...');
    for (const moduleName of modules) {
      console.log(`\n  Testing ${moduleName}...`);
      
      try {
        const testSuite = await this.generateModuleTests(moduleName);
        this.testSuites.set(moduleName, testSuite);
        
        const suiteResults = await this.runTestSuite(testSuite);
        
        // Aggregate results for this module
        const moduleErrors: ContractValidationError[] = [];
        const moduleWarnings: string[] = [];
        let totalCoverage = 0;
        let testCount = 0;

        suiteResults.forEach((result) => {
          moduleErrors.push(...result.errors);
          moduleWarnings.push(...result.warnings);
          totalCoverage += result.coverage.percentage;
          testCount++;
        });

        const moduleResult: ContractValidationResult = {
          valid: moduleErrors.filter(e => e.severity === 'ERROR').length === 0,
          errors: moduleErrors,
          warnings: moduleWarnings,
          coverage: {
            endpoints: 0,
            schemas: 0,
            tested: testCount,
            percentage: testCount > 0 ? totalCoverage / testCount : 0
          }
        };

        moduleResults.set(moduleName, moduleResult);
        allErrors.push(...moduleErrors);

        const passed = suiteResults.size - moduleErrors.filter(e => e.severity === 'ERROR').length;
        console.log(`    ✅ ${passed}/${suiteResults.size} tests passed`);
        
        if (moduleErrors.length > 0) {
          console.log(`    ❌ ${moduleErrors.filter(e => e.severity === 'ERROR').length} errors`);
          console.log(`    ⚠️  ${moduleErrors.filter(e => e.severity === 'WARNING').length} warnings`);
        }
      } catch (error: any) {
        console.error(`    ❌ Failed to test ${moduleName}: ${error.message}`);
        
        const moduleResult: ContractValidationResult = {
          valid: false,
          errors: [{
            type: 'SCHEMA_VALIDATION',
            path: moduleName,
            message: `Module test failed: ${error.message}`,
            severity: 'ERROR'
          }],
          warnings: [],
          coverage: { endpoints: 0, schemas: 0, tested: 0, percentage: 0 }
        };
        
        moduleResults.set(moduleName, moduleResult);
        allErrors.push(...moduleResult.errors);
      }
    }

    // Generate and run cross-module tests (if enabled)
    if (this.config.testCrossModule && modules.length > 1) {
      console.log('\n🔗 Running cross-module compatibility tests...');
      
      try {
        const crossModuleSuite = await this.generateCrossModuleTests(modules);
        this.testSuites.set('cross-module', crossModuleSuite);
        
        const crossModuleTestResults = await this.runTestSuite(crossModuleSuite);
        
        crossModuleTestResults.forEach((result, testName) => {
          crossModuleResults.set(testName, result.errors);
          allErrors.push(...result.errors);
        });

        const crossModulePassed = Array.from(crossModuleTestResults.values())
          .filter(r => r.valid).length;
        console.log(`    ✅ ${crossModulePassed}/${crossModuleTestResults.size} compatibility tests passed`);
      } catch (error: any) {
        console.error(`    ❌ Cross-module tests failed: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const totalTests = Array.from(moduleResults.values())
      .reduce((sum, result) => sum + result.coverage.tested, 0) + crossModuleResults.size;
    const passedTests = Array.from(moduleResults.values())
      .filter(result => result.valid).length + 
      Array.from(crossModuleResults.values())
        .filter(errors => errors.filter(e => e.severity === 'ERROR').length === 0).length;
    const failedTests = totalTests - passedTests;
    const warningCount = allErrors.filter(e => e.severity === 'WARNING').length;
    const totalCoverage = Array.from(moduleResults.values())
      .reduce((sum, result) => sum + result.coverage.percentage, 0) / moduleResults.size;

    const summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      warnings: warningCount,
      coverage: totalCoverage || 0,
      duration
    };

    // Generate reports if enabled
    if (this.config.generateReports) {
      await this.reporter.generateReports({
        summary,
        moduleResults,
        crossModuleResults,
        errors: allErrors
      });
    }

    return {
      summary,
      moduleResults,
      crossModuleResults,
      errors: allErrors
    };
  }

  /**
   * Get test suites
   */
  getTestSuites(): Map<string, ContractTestSuite> {
    return this.testSuites;
  }

  /**
   * Clear test suites
   */
  clearTestSuites(): void {
    this.testSuites.clear();
  }
}