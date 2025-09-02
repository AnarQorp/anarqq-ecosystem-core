/**
 * Demo Orchestrator Service
 * Prepares and executes reproducible demo scenarios for the AnarQ&Q ecosystem
 * Supports identity, content, and DAO flow demonstrations with QNET Phase 2 deployment
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import ObservabilityService from './ObservabilityService.mjs';
import { EventBusService } from './EventBusService.mjs';
import IntegrityValidator from './IntegrityValidator.mjs';
import { DataFlowTester } from './DataFlowTester.mjs';
import ipfsService from './ipfsService.mjs';
import { getQlockService } from '../ecosystem/QlockService.mjs';
import { getQonsentService } from '../ecosystem/QonsentService.mjs';
import { getQindexService } from '../ecosystem/QindexService.mjs';
import { getQerberosService } from '../ecosystem/QerberosService.mjs';
import { QflowService } from './QflowService.mjs';
import { getQwalletService } from '../ecosystem/QwalletService.mjs';
import { getQNETService } from '../ecosystem/QNETService.mjs';

export class DemoOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      demoTimeout: 30000, // 30 seconds max per scenario
      maxConsecutiveRuns: 3,
      artifactsPath: 'artifacts/demo',
      environment: process.env.DEMO_ENVIRONMENT || 'local', // local, staging, qnet-phase2
      qnetPhase2Config: {
        nodeCount: 5,
        consensusThreshold: 3,
        networkTimeout: 10000
      },
      cacheWarmupPaths: [
        '/health',
        '/identity/verify',
        '/wallet/balance',
        '/qflow/workflows',
        '/qindex/metadata',
        '/qerberos/audit'
      ],
      ...options
    };

    // Initialize services
    this.observability = new ObservabilityService();
    this.eventBus = new EventBusService();
    this.integrityValidator = new IntegrityValidator();
    this.dataFlowTester = new DataFlowTester();
    
    // Ecosystem services
    this.qlockService = getQlockService();
    this.qonsentService = getQonsentService();
    this.qindexService = getQindexService();
    this.qerberosService = getQerberosService();
    this.qflowService = new QflowService();
    this.qwalletService = getQwalletService();
    this.qnetService = getQNETService();

    // Demo state
    this.activeDemos = new Map();
    this.demoResults = new Map();
    this.canonicalTestData = new Map();
    this.performanceBaseline = null;
    this.cacheWarmedUp = false;

    // Demo scenarios configuration
    this.demoScenarios = new Map([
      ['identity-flow', {
        name: 'Identity Flow Demo',
        description: 'sQuid creation → Qwallet → transaction → Qerberos audit',
        steps: ['create-squid', 'setup-qwallet', 'execute-transaction', 'audit-qerberos'],
        expectedDuration: 15000, // 15 seconds
        requirements: ['3.1', '3.4']
      }],
      ['content-flow', {
        name: 'Content Flow Demo',
        description: 'upload → Qlock encryption → Qindex metadata → IPFS storage',
        steps: ['upload-content', 'encrypt-qlock', 'index-metadata', 'store-ipfs'],
        expectedDuration: 20000, // 20 seconds
        requirements: ['3.1', '3.4']
      }],
      ['dao-flow', {
        name: 'DAO Flow Demo',
        description: 'governance → voting → Qflow execution → QNET distribution',
        steps: ['create-proposal', 'collect-votes', 'execute-qflow', 'distribute-qnet'],
        expectedDuration: 25000, // 25 seconds
        requirements: ['3.1', '3.4']
      }]
    ]);

    console.log(`[DemoOrchestrator] Initialized for environment: ${this.config.environment}`);
  }

  /**
   * Prepare demo environment for QNET Phase 2 deployment
   * Requirements: 3.1, 3.2, 3.3
   */
  async prepareDemoEnvironment(scenarios = []) {
    const preparationId = this.generatePreparationId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Preparing demo environment: ${preparationId}`);

      const preparation = {
        preparationId,
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        scenarios: scenarios.length > 0 ? scenarios : Array.from(this.demoScenarios.keys()),
        status: 'preparing',
        steps: {
          artifactsSetup: null,
          servicesValidation: null,
          testDataGeneration: null,
          cacheWarmup: null,
          qnetDeployment: null,
          baselineEstablishment: null
        },
        executionTime: 0
      };

      // Step 1: Setup artifacts directory structure
      preparation.steps.artifactsSetup = await this.setupArtifactsDirectory();

      // Step 2: Validate all required services are available
      preparation.steps.servicesValidation = await this.validateRequiredServices();

      // Step 3: Generate canonical test data for scenarios
      preparation.steps.testDataGeneration = await this.generateCanonicalTestData(preparation.scenarios);

      // Step 4: Warm up critical paths
      preparation.steps.cacheWarmup = await this.warmUpPaths();

      // Step 5: Deploy to QNET Phase 2 if required
      if (this.config.environment === 'qnet-phase2') {
        preparation.steps.qnetDeployment = await this.deployToQNETPhase2();
      }

      // Step 6: Establish performance baseline
      preparation.steps.baselineEstablishment = await this.establishPerformanceBaseline();

      // Determine overall preparation status
      const stepStatuses = Object.values(preparation.steps).map(step => step?.status || 'skipped');
      const allStepsSuccessful = stepStatuses.every(status => status === 'success' || status === 'skipped');

      preparation.status = allStepsSuccessful ? 'ready' : 'failed';
      preparation.executionTime = performance.now() - startTime;

      // Save preparation results
      await this.saveArtifact('preparation-results.json', preparation);

      // Emit preparation event
      await this.eventBus.publish({
        topic: 'q.demo.environment.prepared.v1',
        payload: {
          preparationId,
          status: preparation.status,
          environment: this.config.environment,
          scenarios: preparation.scenarios,
          executionTime: preparation.executionTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      console.log(`[DemoOrchestrator] ✅ Demo environment preparation: ${preparation.status}`);
      return preparation;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Demo environment preparation failed:`, error);
      
      await this.eventBus.publish({
        topic: 'q.demo.environment.preparation.failed.v1',
        payload: {
          preparationId,
          error: error.message,
          executionTime: performance.now() - startTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      throw new Error(`Demo environment preparation failed: ${error.message}`);
    }
  }

  /**
   * Generate canonical test data for demo scenarios
   * Requirements: 3.1, 3.2, 3.3
   */
  async generateDemoData(dataType, count = 1, options = {}) {
    const generationId = this.generateDataId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Generating demo data: ${dataType} (${count} items)`);

      let generatedData;

      switch (dataType) {
        case 'identities':
          generatedData = await this.generateCanonicalIdentities(count, options);
          break;
        case 'content':
          generatedData = await this.generateCanonicalContent(count, options);
          break;
        case 'dao-scenarios':
          generatedData = await this.generateCanonicalDAOScenarios(count, options);
          break;
        case 'transactions':
          generatedData = await this.generateCanonicalTransactions(count, options);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      const dataResult = {
        generationId,
        dataType,
        count: generatedData.length,
        timestamp: new Date().toISOString(),
        data: generatedData,
        options,
        executionTime: performance.now() - startTime,
        piiScanPassed: await this.scanForPII(generatedData)
      };

      // Cache the generated data
      this.canonicalTestData.set(`${dataType}_${generationId}`, dataResult);

      // Save to artifacts
      await this.saveArtifact(`canonical-${dataType}-${generationId}.json`, dataResult);

      console.log(`[DemoOrchestrator] ✅ Generated ${count} ${dataType} items`);
      return dataResult;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Demo data generation failed:`, error);
      throw new Error(`Demo data generation failed: ${error.message}`);
    }
  }

  /**
   * Validate demo results against expected outputs
   * Requirements: 3.1, 3.2, 3.3
   */
  async validateDemoResults(scenarioId, expectedOutputs, actualResults) {
    const validationId = this.generateValidationId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Validating demo results for scenario: ${scenarioId}`);

      const validation = {
        validationId,
        scenarioId,
        timestamp: new Date().toISOString(),
        status: 'validating',
        checks: {
          outputComparison: null,
          performanceValidation: null,
          integrityVerification: null,
          auditTrailValidation: null
        },
        anomalies: [],
        executionTime: 0
      };

      // Check 1: Compare actual outputs with expected outputs
      validation.checks.outputComparison = await this.compareOutputs(expectedOutputs, actualResults);

      // Check 2: Validate performance metrics
      validation.checks.performanceValidation = await this.validatePerformanceMetrics(actualResults);

      // Check 3: Verify data integrity
      validation.checks.integrityVerification = await this.verifyDataIntegrity(actualResults);

      // Check 4: Validate audit trail
      validation.checks.auditTrailValidation = await this.validateAuditTrail(scenarioId, actualResults);

      // Determine overall validation status
      const checkStatuses = Object.values(validation.checks).map(check => check.status);
      const allChecksPassed = checkStatuses.every(status => status === 'passed');

      validation.status = allChecksPassed ? 'passed' : 'failed';
      validation.executionTime = performance.now() - startTime;

      // Save validation results
      await this.saveArtifact(`validation-${scenarioId}-${validationId}.json`, validation);

      console.log(`[DemoOrchestrator] ✅ Demo validation: ${validation.status}`);
      return validation;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Demo validation failed:`, error);
      throw new Error(`Demo validation failed: ${error.message}`);
    }
  }

  /**
   * Setup artifacts directory structure
   */
  async setupArtifactsDirectory() {
    try {
      const artifactsDirs = [
        'artifacts/demo',
        'artifacts/demo/scenarios',
        'artifacts/demo/results',
        'artifacts/demo/fixtures',
        'artifacts/demo/reports'
      ];

      for (const dir of artifactsDirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      return {
        status: 'success',
        message: 'Artifacts directory structure created',
        directories: artifactsDirs,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate required services are available
   */
  async validateRequiredServices() {
    try {
      const requiredServices = [
        'qlock', 'qonsent', 'qindex', 'qerberos', 
        'qflow', 'qwallet', 'qnet', 'squid'
      ];

      const serviceValidations = [];

      for (const service of requiredServices) {
        const validation = await this.validateService(service);
        serviceValidations.push(validation);
      }

      const allServicesHealthy = serviceValidations.every(v => v.status === 'healthy');

      return {
        status: allServicesHealthy ? 'success' : 'failed',
        services: serviceValidations,
        totalServices: requiredServices.length,
        healthyServices: serviceValidations.filter(v => v.status === 'healthy').length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate individual service
   */
  async validateService(serviceId) {
    try {
      // Use IntegrityValidator to check service health
      const healthCheck = await this.integrityValidator.validateModuleEndpoints(serviceId);
      
      return {
        serviceId,
        status: healthCheck.status,
        latency: healthCheck.executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        serviceId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate canonical test data for all scenarios
   */
  async generateCanonicalTestData(scenarios) {
    try {
      const testData = {
        identities: await this.generateCanonicalIdentities(5),
        content: await this.generateCanonicalContent(3),
        daoScenarios: await this.generateCanonicalDAOScenarios(2),
        transactions: await this.generateCanonicalTransactions(10)
      };

      // Save canonical test data
      await this.saveArtifact('canonical-test-data.json', testData);

      return {
        status: 'success',
        dataTypes: Object.keys(testData),
        totalItems: Object.values(testData).reduce((sum, items) => sum + items.length, 0),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate canonical identities (sQuid test identities)
   */
  async generateCanonicalIdentities(count, options = {}) {
    const identities = [];

    for (let i = 0; i < count; i++) {
      const identity = {
        squidId: `squid_demo_${i + 1}_${this.generateSeed()}`,
        publicKey: this.generatePublicKey(),
        metadata: {
          name: `Demo User ${i + 1}`,
          type: 'demo_identity',
          created: new Date().toISOString(),
          seeded: true,
          deterministic: true
        },
        capabilities: ['identity.verify', 'wallet.transact', 'content.upload'],
        demoScenarios: options.scenarios || ['identity-flow', 'content-flow']
      };

      identities.push(identity);
    }

    return identities;
  }

  /**
   * Generate canonical content samples
   */
  async generateCanonicalContent(count, options = {}) {
    const contentSamples = [];

    for (let i = 0; i < count; i++) {
      const content = {
        contentId: `content_demo_${i + 1}_${this.generateSeed()}`,
        type: options.contentType || 'text',
        data: `Demo content sample ${i + 1} - synthetic data for testing purposes`,
        metadata: {
          title: `Demo Content ${i + 1}`,
          description: 'Synthetic content for demo purposes',
          tags: ['demo', 'synthetic', 'test'],
          created: new Date().toISOString()
        },
        size: 1024 + (i * 512), // Varying sizes
        checksum: this.generateChecksum(`demo_content_${i + 1}`)
      };

      contentSamples.push(content);
    }

    return contentSamples;
  }

  /**
   * Generate canonical DAO scenarios
   */
  async generateCanonicalDAOScenarios(count, options = {}) {
    const daoScenarios = [];

    for (let i = 0; i < count; i++) {
      const scenario = {
        scenarioId: `dao_demo_${i + 1}_${this.generateSeed()}`,
        type: 'governance_proposal',
        proposal: {
          title: `Demo Proposal ${i + 1}`,
          description: 'Synthetic governance proposal for demo purposes',
          proposer: `squid_demo_${i + 1}`,
          votingPeriod: 300000, // 5 minutes
          quorum: 3,
          options: ['approve', 'reject', 'abstain']
        },
        expectedVotes: [
          { voter: 'squid_demo_1', vote: 'approve' },
          { voter: 'squid_demo_2', vote: 'approve' },
          { voter: 'squid_demo_3', vote: 'reject' }
        ],
        expectedOutcome: 'approved'
      };

      daoScenarios.push(scenario);
    }

    return daoScenarios;
  }

  /**
   * Generate canonical transactions
   */
  async generateCanonicalTransactions(count, options = {}) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
      const transaction = {
        transactionId: `tx_demo_${i + 1}_${this.generateSeed()}`,
        from: `squid_demo_${(i % 3) + 1}`,
        to: `squid_demo_${((i + 1) % 3) + 1}`,
        amount: (i + 1) * 10, // Varying amounts
        currency: 'Q',
        type: 'transfer',
        metadata: {
          description: `Demo transaction ${i + 1}`,
          category: 'demo',
          created: new Date().toISOString()
        }
      };

      transactions.push(transaction);
    }

    return transactions;
  }

  /**
   * Scan generated data for PII
   */
  async scanForPII(data) {
    try {
      const dataString = JSON.stringify(data);
      
      // PII patterns to detect
      const piiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (real)
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
        /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // Phone number
        /\b\d{1,5}\s\w+\s(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i // Address
      ];

      for (const pattern of piiPatterns) {
        if (pattern.test(dataString)) {
          return false; // PII detected
        }
      }

      return true; // No PII detected

    } catch (error) {
      console.warn(`[DemoOrchestrator] PII scan failed: ${error.message}`);
      return false; // Fail safe
    }
  }

  /**
   * Compare actual outputs with expected outputs
   */
  async compareOutputs(expectedOutputs, actualResults) {
    try {
      const comparison = {
        status: 'passed',
        matches: 0,
        mismatches: 0,
        details: [],
        timestamp: new Date().toISOString()
      };

      for (const [key, expectedValue] of Object.entries(expectedOutputs)) {
        const actualValue = actualResults[key];
        
        if (JSON.stringify(actualValue) === JSON.stringify(expectedValue)) {
          comparison.matches++;
          comparison.details.push({
            key,
            status: 'match',
            expected: expectedValue,
            actual: actualValue
          });
        } else {
          comparison.mismatches++;
          comparison.details.push({
            key,
            status: 'mismatch',
            expected: expectedValue,
            actual: actualValue
          });
        }
      }

      if (comparison.mismatches > 0) {
        comparison.status = 'failed';
      }

      return comparison;

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate performance metrics
   */
  async validatePerformanceMetrics(results) {
    try {
      const validation = {
        status: 'passed',
        metrics: {},
        thresholds: {
          maxDuration: this.config.demoTimeout,
          maxLatency: 200, // ms
          minThroughput: 10 // ops/sec
        },
        timestamp: new Date().toISOString()
      };

      // Extract performance metrics from results
      validation.metrics = {
        duration: results.executionTime || 0,
        latency: results.averageLatency || 0,
        throughput: results.throughput || 0
      };

      // Check against thresholds
      if (validation.metrics.duration > validation.thresholds.maxDuration) {
        validation.status = 'failed';
        validation.violations = validation.violations || [];
        validation.violations.push('Duration exceeded threshold');
      }

      if (validation.metrics.latency > validation.thresholds.maxLatency) {
        validation.status = 'failed';
        validation.violations = validation.violations || [];
        validation.violations.push('Latency exceeded threshold');
      }

      return validation;

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(results) {
    try {
      const verification = {
        status: 'passed',
        checksums: {},
        signatures: {},
        timestamp: new Date().toISOString()
      };

      // Verify checksums if present
      if (results.checksums) {
        for (const [key, expectedChecksum] of Object.entries(results.checksums)) {
          const actualChecksum = this.generateChecksum(results.data[key]);
          verification.checksums[key] = {
            expected: expectedChecksum,
            actual: actualChecksum,
            valid: expectedChecksum === actualChecksum
          };

          if (expectedChecksum !== actualChecksum) {
            verification.status = 'failed';
          }
        }
      }

      return verification;

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate audit trail
   */
  async validateAuditTrail(scenarioId, results) {
    try {
      const validation = {
        status: 'passed',
        auditEntries: 0,
        qerberosSignatures: 0,
        auditCid: null,
        timestamp: new Date().toISOString()
      };

      // Check for Qerberos audit entries
      if (results.auditTrail) {
        validation.auditEntries = results.auditTrail.length;
        validation.qerberosSignatures = results.auditTrail.filter(
          entry => entry.signedBy === 'qerberos'
        ).length;

        // Generate audit CID
        validation.auditCid = await this.generateAuditCID(results.auditTrail);
      }

      return validation;

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Save artifact to demo artifacts directory
   */
  async saveArtifact(filename, data) {
    try {
      const artifactPath = path.join(this.config.artifactsPath, filename);
      await fs.writeFile(artifactPath, JSON.stringify(data, null, 2));
      console.log(`[DemoOrchestrator] Saved artifact: ${artifactPath}`);
      return artifactPath;
    } catch (error) {
      console.error(`[DemoOrchestrator] Failed to save artifact ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique IDs
   */
  generatePreparationId() {
    return `prep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateDataId() {
    return `data_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateValidationId() {
    return `val_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateSeed() {
    return crypto.randomBytes(4).toString('hex');
  }

  generatePublicKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  async generateAuditCID(auditTrail) {
    try {
      const auditData = {
        trail: auditTrail,
        timestamp: new Date().toISOString(),
        signature: 'qerberos_demo_signature'
      };
      
      // In real implementation, this would use IPFS service
      return `audit_cid_${crypto.createHash('sha256').update(JSON.stringify(auditData)).digest('hex').substring(0, 16)}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute demo scenario
   * Requirements: 3.1, 3.4
   */
  async executeDemoScenario(scenarioId, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Executing demo scenario: ${scenarioId}`);

      const scenario = this.demoScenarios.get(scenarioId);
      if (!scenario) {
        throw new Error(`Unknown demo scenario: ${scenarioId}`);
      }

      const execution = {
        executionId,
        scenarioId,
        scenario: scenario.name,
        startTime: new Date().toISOString(),
        status: 'executing',
        steps: [],
        results: {},
        auditTrail: [],
        executionTime: 0,
        options
      };

      this.activeDemos.set(executionId, execution);

      // Execute scenario-specific steps
      switch (scenarioId) {
        case 'identity-flow':
          execution.results = await this.executeIdentityFlowDemo(executionId, options);
          break;
        case 'content-flow':
          execution.results = await this.executeContentFlowDemo(executionId, options);
          break;
        case 'dao-flow':
          execution.results = await this.executeDAOFlowDemo(executionId, options);
          break;
        default:
          throw new Error(`Scenario execution not implemented: ${scenarioId}`);
      }

      execution.status = 'completed';
      execution.executionTime = performance.now() - startTime;
      execution.endTime = new Date().toISOString();

      // Validate execution time against expected duration
      if (execution.executionTime > scenario.expectedDuration) {
        execution.warnings = execution.warnings || [];
        execution.warnings.push(`Execution time (${execution.executionTime}ms) exceeded expected duration (${scenario.expectedDuration}ms)`);
      }

      // Save execution results
      await this.saveArtifact(`scenario-${scenarioId}-${executionId}.json`, execution);

      // Emit execution event
      await this.eventBus.publish({
        topic: 'q.demo.scenario.completed.v1',
        payload: {
          executionId,
          scenarioId,
          status: execution.status,
          executionTime: execution.executionTime,
          results: execution.results
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      console.log(`[DemoOrchestrator] ✅ Demo scenario completed: ${scenarioId} (${execution.executionTime}ms)`);
      return execution;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Demo scenario failed:`, error);
      
      const execution = this.activeDemos.get(executionId) || {
        executionId,
        scenarioId,
        startTime: new Date().toISOString()
      };

      execution.status = 'failed';
      execution.error = error.message;
      execution.executionTime = performance.now() - startTime;

      await this.eventBus.publish({
        topic: 'q.demo.scenario.failed.v1',
        payload: {
          executionId,
          scenarioId,
          error: error.message,
          executionTime: execution.executionTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      throw new Error(`Demo scenario execution failed: ${error.message}`);
    } finally {
      this.activeDemos.delete(executionId);
    }
  }

  /**
   * Execute Identity Flow Demo: sQuid creation → Qwallet → transaction → Qerberos audit
   * Requirements: 3.1, 3.4
   */
  async executeIdentityFlowDemo(executionId, options = {}) {
    const stepResults = [];
    const auditTrail = [];

    try {
      console.log(`[DemoOrchestrator] Executing identity flow demo: ${executionId}`);

      // Step 1: Create sQuid identity
      const createSquidStep = await this.executeStep(executionId, 'create-squid', async () => {
        const identityData = this.canonicalTestData.get('identities_demo') || 
          await this.generateCanonicalIdentities(1);
        
        const squidIdentity = identityData.data ? identityData.data[0] : identityData[0];
        
        // Simulate sQuid creation
        const squidResult = {
          squidId: squidIdentity.squidId,
          publicKey: squidIdentity.publicKey,
          created: new Date().toISOString(),
          status: 'active'
        };

        auditTrail.push({
          action: 'squid_created',
          squidId: squidResult.squidId,
          timestamp: new Date().toISOString(),
          signedBy: 'squid-service'
        });

        return squidResult;
      });
      stepResults.push(createSquidStep);

      // Step 2: Setup Qwallet
      const setupQwalletStep = await this.executeStep(executionId, 'setup-qwallet', async () => {
        const squidId = createSquidStep.result.squidId;
        
        // Simulate Qwallet setup
        const walletResult = {
          walletId: `wallet_${squidId}`,
          squidId: squidId,
          balance: 1000, // Initial demo balance
          currency: 'Q',
          created: new Date().toISOString(),
          status: 'active'
        };

        auditTrail.push({
          action: 'wallet_created',
          walletId: walletResult.walletId,
          squidId: squidId,
          timestamp: new Date().toISOString(),
          signedBy: 'qwallet-service'
        });

        return walletResult;
      });
      stepResults.push(setupQwalletStep);

      // Step 3: Execute transaction
      const executeTransactionStep = await this.executeStep(executionId, 'execute-transaction', async () => {
        const walletId = setupQwalletStep.result.walletId;
        const squidId = createSquidStep.result.squidId;
        
        // Simulate transaction execution
        const transactionResult = {
          transactionId: `tx_demo_${Date.now()}`,
          from: walletId,
          to: 'wallet_demo_recipient',
          amount: 100,
          currency: 'Q',
          status: 'completed',
          timestamp: new Date().toISOString(),
          blockHeight: Math.floor(Math.random() * 1000000),
          confirmations: 3
        };

        auditTrail.push({
          action: 'transaction_executed',
          transactionId: transactionResult.transactionId,
          from: walletId,
          amount: transactionResult.amount,
          timestamp: new Date().toISOString(),
          signedBy: 'qwallet-service'
        });

        return transactionResult;
      });
      stepResults.push(executeTransactionStep);

      // Step 4: Qerberos audit
      const qerberosAuditStep = await this.executeStep(executionId, 'audit-qerberos', async () => {
        const transactionId = executeTransactionStep.result.transactionId;
        
        // Simulate Qerberos audit
        const auditResult = {
          auditId: `audit_${Date.now()}`,
          transactionId: transactionId,
          auditStatus: 'compliant',
          securityChecks: [
            { check: 'identity_verification', status: 'passed' },
            { check: 'transaction_integrity', status: 'passed' },
            { check: 'fraud_detection', status: 'passed' },
            { check: 'compliance_validation', status: 'passed' }
          ],
          riskScore: 0.1, // Low risk
          timestamp: new Date().toISOString(),
          auditCid: await this.generateAuditCID(auditTrail)
        };

        auditTrail.push({
          action: 'audit_completed',
          auditId: auditResult.auditId,
          transactionId: transactionId,
          auditStatus: auditResult.auditStatus,
          timestamp: new Date().toISOString(),
          signedBy: 'qerberos'
        });

        return auditResult;
      });
      stepResults.push(qerberosAuditStep);

      return {
        scenario: 'identity-flow',
        steps: stepResults,
        auditTrail: auditTrail,
        summary: {
          squidCreated: createSquidStep.result.squidId,
          walletSetup: setupQwalletStep.result.walletId,
          transactionExecuted: executeTransactionStep.result.transactionId,
          auditCompleted: qerberosAuditStep.result.auditId,
          auditCid: qerberosAuditStep.result.auditCid
        },
        success: true
      };

    } catch (error) {
      console.error(`[DemoOrchestrator] Identity flow demo failed:`, error);
      throw error;
    }
  }

  /**
   * Execute Content Flow Demo: upload → Qlock encryption → Qindex metadata → IPFS storage
   * Requirements: 3.1, 3.4
   */
  async executeContentFlowDemo(executionId, options = {}) {
    const stepResults = [];
    const auditTrail = [];

    try {
      console.log(`[DemoOrchestrator] Executing content flow demo: ${executionId}`);

      // Step 1: Upload content
      const uploadContentStep = await this.executeStep(executionId, 'upload-content', async () => {
        const contentData = this.canonicalTestData.get('content_demo') || 
          await this.generateCanonicalContent(1);
        
        const content = contentData.data ? contentData.data[0] : contentData[0];
        
        const uploadResult = {
          contentId: content.contentId,
          originalSize: content.size,
          contentType: content.type,
          checksum: content.checksum,
          uploaded: new Date().toISOString(),
          status: 'uploaded'
        };

        auditTrail.push({
          action: 'content_uploaded',
          contentId: uploadResult.contentId,
          size: uploadResult.originalSize,
          timestamp: new Date().toISOString(),
          signedBy: 'content-service'
        });

        return uploadResult;
      });
      stepResults.push(uploadContentStep);

      // Step 2: Qlock encryption
      const encryptQlockStep = await this.executeStep(executionId, 'encrypt-qlock', async () => {
        const contentId = uploadContentStep.result.contentId;
        
        // Simulate Qlock encryption
        const encryptionResult = {
          contentId: contentId,
          encryptedContentId: `encrypted_${contentId}`,
          encryptionAlgorithm: 'AES-256-GCM',
          keyId: `key_${Date.now()}`,
          encryptedSize: uploadContentStep.result.originalSize + 64, // Add encryption overhead
          encryptionTimestamp: new Date().toISOString(),
          status: 'encrypted'
        };

        auditTrail.push({
          action: 'content_encrypted',
          contentId: contentId,
          encryptedContentId: encryptionResult.encryptedContentId,
          algorithm: encryptionResult.encryptionAlgorithm,
          timestamp: new Date().toISOString(),
          signedBy: 'qlock'
        });

        return encryptionResult;
      });
      stepResults.push(encryptQlockStep);

      // Step 3: Qindex metadata
      const indexMetadataStep = await this.executeStep(executionId, 'index-metadata', async () => {
        const encryptedContentId = encryptQlockStep.result.encryptedContentId;
        
        // Simulate Qindex metadata creation
        const indexResult = {
          contentId: uploadContentStep.result.contentId,
          encryptedContentId: encryptedContentId,
          metadataId: `metadata_${Date.now()}`,
          metadata: {
            title: `Demo Content ${Date.now()}`,
            description: 'Encrypted demo content',
            tags: ['demo', 'encrypted', 'test'],
            contentType: uploadContentStep.result.contentType,
            originalSize: uploadContentStep.result.originalSize,
            encryptedSize: encryptQlockStep.result.encryptedSize,
            created: new Date().toISOString()
          },
          searchableFields: ['title', 'description', 'tags'],
          indexed: new Date().toISOString(),
          status: 'indexed'
        };

        auditTrail.push({
          action: 'metadata_indexed',
          contentId: uploadContentStep.result.contentId,
          metadataId: indexResult.metadataId,
          timestamp: new Date().toISOString(),
          signedBy: 'qindex'
        });

        return indexResult;
      });
      stepResults.push(indexMetadataStep);

      // Step 4: IPFS storage
      const storeIPFSStep = await this.executeStep(executionId, 'store-ipfs', async () => {
        const encryptedContentId = encryptQlockStep.result.encryptedContentId;
        const metadataId = indexMetadataStep.result.metadataId;
        
        // Simulate IPFS storage
        const ipfsResult = {
          contentId: uploadContentStep.result.contentId,
          encryptedContentId: encryptedContentId,
          ipfsHash: `Qm${crypto.randomBytes(22).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 44)}`,
          metadataIpfsHash: `Qm${crypto.randomBytes(22).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 44)}`,
          size: encryptQlockStep.result.encryptedSize,
          stored: new Date().toISOString(),
          replicas: 3,
          status: 'stored'
        };

        auditTrail.push({
          action: 'content_stored_ipfs',
          contentId: uploadContentStep.result.contentId,
          ipfsHash: ipfsResult.ipfsHash,
          replicas: ipfsResult.replicas,
          timestamp: new Date().toISOString(),
          signedBy: 'ipfs-service'
        });

        return ipfsResult;
      });
      stepResults.push(storeIPFSStep);

      return {
        scenario: 'content-flow',
        steps: stepResults,
        auditTrail: auditTrail,
        summary: {
          contentUploaded: uploadContentStep.result.contentId,
          encrypted: encryptQlockStep.result.encryptedContentId,
          indexed: indexMetadataStep.result.metadataId,
          storedIPFS: storeIPFSStep.result.ipfsHash,
          totalSize: storeIPFSStep.result.size
        },
        success: true
      };

    } catch (error) {
      console.error(`[DemoOrchestrator] Content flow demo failed:`, error);
      throw error;
    }
  }

  /**
   * Execute DAO Flow Demo: governance → voting → Qflow execution → QNET distribution
   * Requirements: 3.1, 3.4
   */
  async executeDAOFlowDemo(executionId, options = {}) {
    const stepResults = [];
    const auditTrail = [];

    try {
      console.log(`[DemoOrchestrator] Executing DAO flow demo: ${executionId}`);

      // Step 1: Create governance proposal
      const createProposalStep = await this.executeStep(executionId, 'create-proposal', async () => {
        const daoData = this.canonicalTestData.get('daoScenarios_demo') || 
          await this.generateCanonicalDAOScenarios(1);
        
        const daoScenario = daoData.data ? daoData.data[0] : daoData[0];
        
        const proposalResult = {
          proposalId: daoScenario.scenarioId,
          title: daoScenario.proposal.title,
          description: daoScenario.proposal.description,
          proposer: daoScenario.proposal.proposer,
          votingPeriod: daoScenario.proposal.votingPeriod,
          quorum: daoScenario.proposal.quorum,
          options: daoScenario.proposal.options,
          created: new Date().toISOString(),
          status: 'active'
        };

        auditTrail.push({
          action: 'proposal_created',
          proposalId: proposalResult.proposalId,
          proposer: proposalResult.proposer,
          timestamp: new Date().toISOString(),
          signedBy: 'dao-service'
        });

        return proposalResult;
      });
      stepResults.push(createProposalStep);

      // Step 2: Collect votes
      const collectVotesStep = await this.executeStep(executionId, 'collect-votes', async () => {
        const proposalId = createProposalStep.result.proposalId;
        
        // Simulate vote collection
        const votes = [
          { voter: 'squid_demo_1', vote: 'approve', timestamp: new Date().toISOString() },
          { voter: 'squid_demo_2', vote: 'approve', timestamp: new Date().toISOString() },
          { voter: 'squid_demo_3', vote: 'reject', timestamp: new Date().toISOString() }
        ];

        const votingResult = {
          proposalId: proposalId,
          votes: votes,
          voteCount: {
            approve: 2,
            reject: 1,
            abstain: 0
          },
          totalVotes: 3,
          quorumMet: true,
          outcome: 'approved',
          votingCompleted: new Date().toISOString(),
          status: 'completed'
        };

        // Add audit entries for each vote
        votes.forEach(vote => {
          auditTrail.push({
            action: 'vote_cast',
            proposalId: proposalId,
            voter: vote.voter,
            vote: vote.vote,
            timestamp: vote.timestamp,
            signedBy: 'dao-service'
          });
        });

        auditTrail.push({
          action: 'voting_completed',
          proposalId: proposalId,
          outcome: votingResult.outcome,
          totalVotes: votingResult.totalVotes,
          timestamp: new Date().toISOString(),
          signedBy: 'dao-service'
        });

        return votingResult;
      });
      stepResults.push(collectVotesStep);

      // Step 3: Qflow execution
      const executeQflowStep = await this.executeStep(executionId, 'execute-qflow', async () => {
        const proposalId = createProposalStep.result.proposalId;
        const outcome = collectVotesStep.result.outcome;
        
        // Simulate Qflow workflow execution
        const qflowResult = {
          proposalId: proposalId,
          workflowId: `workflow_${Date.now()}`,
          executionId: `exec_${Date.now()}`,
          outcome: outcome,
          steps: [
            { step: 'validate_votes', status: 'completed', duration: 100 },
            { step: 'execute_proposal', status: 'completed', duration: 200 },
            { step: 'update_state', status: 'completed', duration: 150 }
          ],
          totalDuration: 450,
          executed: new Date().toISOString(),
          status: 'completed'
        };

        auditTrail.push({
          action: 'qflow_executed',
          proposalId: proposalId,
          workflowId: qflowResult.workflowId,
          executionId: qflowResult.executionId,
          duration: qflowResult.totalDuration,
          timestamp: new Date().toISOString(),
          signedBy: 'qflow'
        });

        return qflowResult;
      });
      stepResults.push(executeQflowStep);

      // Step 4: QNET distribution
      const distributeQNETStep = await this.executeStep(executionId, 'distribute-qnet', async () => {
        const workflowId = executeQflowStep.result.workflowId;
        
        // Simulate QNET distribution
        const distributionResult = {
          workflowId: workflowId,
          distributionId: `dist_${Date.now()}`,
          nodes: [
            { nodeId: 'qnet_node_1', status: 'distributed', timestamp: new Date().toISOString() },
            { nodeId: 'qnet_node_2', status: 'distributed', timestamp: new Date().toISOString() },
            { nodeId: 'qnet_node_3', status: 'distributed', timestamp: new Date().toISOString() }
          ],
          totalNodes: 3,
          successfulDistributions: 3,
          distributed: new Date().toISOString(),
          status: 'completed'
        };

        auditTrail.push({
          action: 'qnet_distributed',
          workflowId: workflowId,
          distributionId: distributionResult.distributionId,
          nodes: distributionResult.totalNodes,
          timestamp: new Date().toISOString(),
          signedBy: 'qnet'
        });

        return distributionResult;
      });
      stepResults.push(distributeQNETStep);

      return {
        scenario: 'dao-flow',
        steps: stepResults,
        auditTrail: auditTrail,
        summary: {
          proposalCreated: createProposalStep.result.proposalId,
          votesCollected: collectVotesStep.result.totalVotes,
          outcome: collectVotesStep.result.outcome,
          workflowExecuted: executeQflowStep.result.workflowId,
          nodesDistributed: distributeQNETStep.result.totalNodes
        },
        success: true
      };

    } catch (error) {
      console.error(`[DemoOrchestrator] DAO flow demo failed:`, error);
      throw error;
    }
  }

  /**
   * Execute individual demo step with timing and error handling
   */
  async executeStep(executionId, stepName, stepFunction) {
    const startTime = performance.now();
    
    try {
      console.log(`[DemoOrchestrator] Executing step: ${stepName} (${executionId})`);
      
      const result = await stepFunction();
      const executionTime = performance.now() - startTime;
      
      const stepResult = {
        stepName,
        status: 'completed',
        result: result,
        executionTime: executionTime,
        timestamp: new Date().toISOString()
      };

      console.log(`[DemoOrchestrator] ✅ Step completed: ${stepName} (${executionTime}ms)`);
      return stepResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      console.error(`[DemoOrchestrator] ❌ Step failed: ${stepName}`, error);
      
      return {
        stepName,
        status: 'failed',
        error: error.message,
        executionTime: executionTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  generateExecutionId() {
    return `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Produce no-central-server report with decentralization proof
   * Requirements: 3.4
   */
  async produceNoCentralServerReport() {
    const reportId = this.generateReportId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Producing no-central-server report: ${reportId}`);

      const report = {
        reportId,
        timestamp: new Date().toISOString(),
        status: 'generating',
        decentralizationChecks: {},
        killFirstLauncherTest: null,
        attestationCID: null,
        continuityValidation: null,
        executionTime: 0
      };

      // Run decentralization checks using IntegrityValidator
      report.decentralizationChecks = await this.integrityValidator.verifyDecentralizationAttestation();

      // Run kill-first-launcher test
      report.killFirstLauncherTest = await this.runKillFirstLauncherTest();

      // Validate continuity after launcher kill
      report.continuityValidation = await this.validateContinuityAfterLauncherKill();

      // Generate attestation CID for decentralization proof
      if (report.decentralizationChecks.overallStatus === 'compliant' && 
          report.killFirstLauncherTest.status === 'passed') {
        report.attestationCID = await this.generateDecentralizationAttestationCID(report);
      }

      // Determine overall report status
      const checksCompliant = report.decentralizationChecks.overallStatus === 'compliant';
      const killTestPassed = report.killFirstLauncherTest.status === 'passed';
      const continuityMaintained = report.continuityValidation.status === 'maintained';

      report.status = (checksCompliant && killTestPassed && continuityMaintained) ? 'compliant' : 'non_compliant';
      report.executionTime = performance.now() - startTime;

      // Save report
      await this.saveArtifact(`no-central-server-report-${reportId}.json`, report);

      // Emit report event
      await this.eventBus.publish({
        topic: 'q.demo.decentralization.report.generated.v1',
        payload: {
          reportId,
          status: report.status,
          attestationCID: report.attestationCID,
          executionTime: report.executionTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      console.log(`[DemoOrchestrator] ✅ No-central-server report: ${report.status}`);
      return report;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ No-central-server report failed:`, error);
      
      await this.eventBus.publish({
        topic: 'q.demo.decentralization.report.failed.v1',
        payload: {
          reportId,
          error: error.message,
          executionTime: performance.now() - startTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      throw new Error(`No-central-server report failed: ${error.message}`);
    }
  }

  /**
   * Run kill-first-launcher test with continuity validation
   * Requirements: 3.4
   */
  async runKillFirstLauncherTest() {
    const testId = this.generateTestId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Running kill-first-launcher test: ${testId}`);

      const test = {
        testId,
        timestamp: new Date().toISOString(),
        status: 'running',
        phases: {
          preKillBaseline: null,
          launcherKill: null,
          continuityCheck: null,
          recoveryValidation: null
        },
        metrics: {
          baselineDuration: 0,
          killDuration: 0,
          recoveryDuration: 0,
          totalDuration: 0,
          continuityMaintained: false,
          performanceDegradation: 0
        },
        executionTime: 0
      };

      // Phase 1: Establish baseline performance
      test.phases.preKillBaseline = await this.establishPreKillBaseline();

      // Phase 2: Kill first launcher node
      test.phases.launcherKill = await this.killFirstLauncher();

      // Phase 3: Check system continuity
      test.phases.continuityCheck = await this.checkSystemContinuity();

      // Phase 4: Validate recovery
      test.phases.recoveryValidation = await this.validateSystemRecovery();

      // Calculate metrics
      test.metrics.baselineDuration = test.phases.preKillBaseline.duration;
      test.metrics.killDuration = test.phases.launcherKill.duration;
      test.metrics.recoveryDuration = test.phases.recoveryValidation.duration;
      test.metrics.totalDuration = performance.now() - startTime;

      // Check if continuity was maintained
      test.metrics.continuityMaintained = test.phases.continuityCheck.maintained;
      
      // Calculate performance degradation
      const baselineLatency = test.phases.preKillBaseline.averageLatency;
      const recoveryLatency = test.phases.recoveryValidation.averageLatency;
      test.metrics.performanceDegradation = ((recoveryLatency - baselineLatency) / baselineLatency) * 100;

      // Determine test status
      const continuityOk = test.metrics.continuityMaintained;
      const performanceOk = test.metrics.performanceDegradation <= 100; // Max 2x degradation allowed
      const recoveryOk = test.phases.recoveryValidation.status === 'recovered';

      test.status = (continuityOk && performanceOk && recoveryOk) ? 'passed' : 'failed';
      test.executionTime = performance.now() - startTime;

      console.log(`[DemoOrchestrator] ✅ Kill-first-launcher test: ${test.status} (${test.executionTime}ms)`);
      return test;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Kill-first-launcher test failed:`, error);
      
      return {
        testId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Validate continuity after launcher kill
   */
  async validateContinuityAfterLauncherKill() {
    const validationId = this.generateValidationId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Validating continuity after launcher kill: ${validationId}`);

      const validation = {
        validationId,
        timestamp: new Date().toISOString(),
        status: 'validating',
        checks: {
          serviceAvailability: null,
          dataIntegrity: null,
          networkConnectivity: null,
          consensusOperational: null
        },
        continuityScore: 0,
        executionTime: 0
      };

      // Check 1: Service availability
      validation.checks.serviceAvailability = await this.checkServiceAvailabilityAfterKill();

      // Check 2: Data integrity
      validation.checks.dataIntegrity = await this.checkDataIntegrityAfterKill();

      // Check 3: Network connectivity
      validation.checks.networkConnectivity = await this.checkNetworkConnectivityAfterKill();

      // Check 4: Consensus operational
      validation.checks.consensusOperational = await this.checkConsensusAfterKill();

      // Calculate continuity score
      const checkScores = Object.values(validation.checks).map(check => check.score || 0);
      validation.continuityScore = checkScores.reduce((sum, score) => sum + score, 0) / checkScores.length;

      // Determine validation status
      validation.status = validation.continuityScore >= 0.8 ? 'maintained' : 'degraded';
      validation.executionTime = performance.now() - startTime;

      console.log(`[DemoOrchestrator] ✅ Continuity validation: ${validation.status} (score: ${validation.continuityScore})`);
      return validation;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Continuity validation failed:`, error);
      
      return {
        validationId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Establish baseline performance before kill test
   */
  async establishPreKillBaseline() {
    try {
      // Simulate baseline measurement
      const baselineMetrics = {
        averageLatency: 50 + Math.random() * 20, // 50-70ms
        throughput: 100 + Math.random() * 50, // 100-150 ops/sec
        errorRate: Math.random() * 0.01, // 0-1%
        activeNodes: 5,
        consensusLatency: 100 + Math.random() * 50 // 100-150ms
      };

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate measurement time

      return {
        status: 'established',
        metrics: baselineMetrics,
        duration: 1000,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Kill first launcher node
   */
  async killFirstLauncher() {
    try {
      console.log(`[DemoOrchestrator] Killing first launcher node`);

      // Simulate killing the first launcher
      const killResult = {
        nodeId: 'qnet_launcher_1',
        killMethod: 'SIGKILL',
        killTime: new Date().toISOString(),
        remainingNodes: ['qnet_node_2', 'qnet_node_3', 'qnet_node_4', 'qnet_node_5']
      };

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate kill time

      return {
        status: 'killed',
        result: killResult,
        duration: 500,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check system continuity after kill
   */
  async checkSystemContinuity() {
    try {
      // Simulate continuity check
      const continuityChecks = [
        { service: 'qlock', available: true, latency: 60 },
        { service: 'qonsent', available: true, latency: 55 },
        { service: 'qindex', available: true, latency: 65 },
        { service: 'qerberos', available: true, latency: 70 },
        { service: 'qflow', available: true, latency: 80 },
        { service: 'qwallet', available: true, latency: 58 },
        { service: 'qnet', available: true, latency: 90 } // Slightly higher due to node loss
      ];

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate check time

      const availableServices = continuityChecks.filter(check => check.available).length;
      const maintained = availableServices >= continuityChecks.length * 0.8; // 80% threshold

      return {
        status: 'checked',
        maintained: maintained,
        availableServices: availableServices,
        totalServices: continuityChecks.length,
        checks: continuityChecks,
        duration: 2000,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        maintained: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate system recovery
   */
  async validateSystemRecovery() {
    try {
      // Simulate recovery validation
      const recoveryMetrics = {
        averageLatency: 65 + Math.random() * 15, // Slightly higher than baseline
        throughput: 90 + Math.random() * 40, // Slightly lower than baseline
        errorRate: Math.random() * 0.02, // Slightly higher error rate
        activeNodes: 4, // One node down
        consensusLatency: 120 + Math.random() * 30 // Higher consensus latency
      };

      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate recovery time

      return {
        status: 'recovered',
        metrics: recoveryMetrics,
        averageLatency: recoveryMetrics.averageLatency,
        duration: 3000,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check service availability after kill
   */
  async checkServiceAvailabilityAfterKill() {
    try {
      // Simulate service availability check
      const services = ['qlock', 'qonsent', 'qindex', 'qerberos', 'qflow', 'qwallet', 'qnet'];
      const availableServices = services.filter(() => Math.random() > 0.1); // 90% availability

      return {
        status: 'checked',
        availableServices: availableServices.length,
        totalServices: services.length,
        score: availableServices.length / services.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check data integrity after kill
   */
  async checkDataIntegrityAfterKill() {
    try {
      // Simulate data integrity check
      const integrityChecks = [
        { type: 'checksums', valid: true },
        { type: 'signatures', valid: true },
        { type: 'merkle_trees', valid: true },
        { type: 'consensus_state', valid: true }
      ];

      const validChecks = integrityChecks.filter(check => check.valid).length;

      return {
        status: 'checked',
        validChecks: validChecks,
        totalChecks: integrityChecks.length,
        score: validChecks / integrityChecks.length,
        checks: integrityChecks,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check network connectivity after kill
   */
  async checkNetworkConnectivityAfterKill() {
    try {
      // Simulate network connectivity check
      const networkChecks = [
        { type: 'peer_connections', healthy: true, count: 4 },
        { type: 'gossipsub_mesh', healthy: true, peers: 3 },
        { type: 'dht_routing', healthy: true, routes: 15 },
        { type: 'ipfs_connectivity', healthy: true, peers: 8 }
      ];

      const healthyChecks = networkChecks.filter(check => check.healthy).length;

      return {
        status: 'checked',
        healthyChecks: healthyChecks,
        totalChecks: networkChecks.length,
        score: healthyChecks / networkChecks.length,
        checks: networkChecks,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check consensus operational after kill
   */
  async checkConsensusAfterKill() {
    try {
      // Simulate consensus check
      const consensusResult = {
        quorumAchievable: true,
        activeValidators: 4,
        requiredQuorum: 3,
        consensusLatency: 120 + Math.random() * 30,
        lastBlockTime: new Date().toISOString()
      };

      const score = consensusResult.quorumAchievable ? 1.0 : 0.0;

      return {
        status: 'checked',
        quorumAchievable: consensusResult.quorumAchievable,
        activeValidators: consensusResult.activeValidators,
        requiredQuorum: consensusResult.requiredQuorum,
        score: score,
        result: consensusResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate decentralization attestation CID
   */
  async generateDecentralizationAttestationCID(report) {
    try {
      const attestationData = {
        reportId: report.reportId,
        timestamp: report.timestamp,
        decentralizationChecks: report.decentralizationChecks,
        killFirstLauncherTest: report.killFirstLauncherTest,
        continuityValidation: report.continuityValidation,
        signature: 'demo_orchestrator_signature'
      };

      // In real implementation, this would use IPFS service
      const attestationHash = crypto.createHash('sha256')
        .update(JSON.stringify(attestationData))
        .digest('hex');

      return `decentralization_attestation_${attestationHash.substring(0, 16)}`;

    } catch (error) {
      console.error(`[DemoOrchestrator] Failed to generate attestation CID:`, error);
      return null;
    }
  }

  generateReportId() {
    return `report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateTestId() {
    return `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Warm up critical paths for demo performance
   * Requirements: 3.5
   */
  async warmUpPaths() {
    const warmupId = this.generateWarmupId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Starting cache warm-up: ${warmupId}`);

      const warmup = {
        warmupId,
        timestamp: new Date().toISOString(),
        status: 'warming',
        phases: {
          cacheWarmup: null,
          indicesWarmup: null,
          wasmWarmup: null,
          baselineEstablishment: null
        },
        metrics: {
          totalPaths: this.config.cacheWarmupPaths.length,
          warmedPaths: 0,
          failedPaths: 0,
          averageLatency: 0,
          cacheHitRate: 0
        },
        executionTime: 0
      };

      // Phase 1: Cache warm-up
      warmup.phases.cacheWarmup = await this.warmUpCache();

      // Phase 2: Indices warm-up
      warmup.phases.indicesWarmup = await this.warmUpIndices();

      // Phase 3: WASM pre-warming
      warmup.phases.wasmWarmup = await this.warmUpWASM();

      // Phase 4: Establish performance baseline
      warmup.phases.baselineEstablishment = await this.establishPerformanceBaseline();

      // Calculate metrics
      warmup.metrics.warmedPaths = warmup.phases.cacheWarmup.successfulPaths;
      warmup.metrics.failedPaths = warmup.phases.cacheWarmup.failedPaths;
      warmup.metrics.averageLatency = warmup.phases.cacheWarmup.averageLatency;
      warmup.metrics.cacheHitRate = warmup.phases.cacheWarmup.cacheHitRate;

      // Determine warmup status
      const cacheOk = warmup.phases.cacheWarmup.status === 'completed';
      const indicesOk = warmup.phases.indicesWarmup.status === 'completed';
      const wasmOk = warmup.phases.wasmWarmup.status === 'completed';
      const baselineOk = warmup.phases.baselineEstablishment.status === 'established';

      warmup.status = (cacheOk && indicesOk && wasmOk && baselineOk) ? 'completed' : 'partial';
      warmup.executionTime = performance.now() - startTime;

      // Mark cache as warmed up
      this.cacheWarmedUp = warmup.status === 'completed';
      this.performanceBaseline = warmup.phases.baselineEstablishment.baseline;

      // Save warmup results
      await this.saveArtifact(`cache-warmup-${warmupId}.json`, warmup);

      // Emit warmup event
      await this.eventBus.publish({
        topic: 'q.demo.cache.warmed.v1',
        payload: {
          warmupId,
          status: warmup.status,
          metrics: warmup.metrics,
          executionTime: warmup.executionTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      console.log(`[DemoOrchestrator] ✅ Cache warm-up: ${warmup.status} (${warmup.executionTime}ms)`);
      return warmup;

    } catch (error) {
      console.error(`[DemoOrchestrator] ❌ Cache warm-up failed:`, error);
      
      await this.eventBus.publish({
        topic: 'q.demo.cache.warmup.failed.v1',
        payload: {
          warmupId,
          error: error.message,
          executionTime: performance.now() - startTime
        },
        actor: { squidId: 'demo-orchestrator', type: 'system' }
      });

      throw new Error(`Cache warm-up failed: ${error.message}`);
    }
  }

  /**
   * Warm up cache with critical paths
   */
  async warmUpCache() {
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Warming up cache paths`);

      const pathResults = [];
      let totalLatency = 0;
      let successfulPaths = 0;
      let failedPaths = 0;

      for (const path of this.config.cacheWarmupPaths) {
        try {
          const pathStartTime = performance.now();
          
          // Simulate cache warm-up request
          await this.warmUpPath(path);
          
          const pathLatency = performance.now() - pathStartTime;
          totalLatency += pathLatency;
          successfulPaths++;

          pathResults.push({
            path,
            status: 'warmed',
            latency: pathLatency,
            timestamp: new Date().toISOString()
          });

          console.log(`[DemoOrchestrator] ✅ Warmed path: ${path} (${pathLatency}ms)`);

        } catch (error) {
          failedPaths++;
          pathResults.push({
            path,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          });

          console.warn(`[DemoOrchestrator] ⚠️ Failed to warm path: ${path}`, error);
        }
      }

      const averageLatency = successfulPaths > 0 ? totalLatency / successfulPaths : 0;
      const cacheHitRate = successfulPaths / this.config.cacheWarmupPaths.length;

      return {
        status: failedPaths === 0 ? 'completed' : 'partial',
        successfulPaths,
        failedPaths,
        totalPaths: this.config.cacheWarmupPaths.length,
        averageLatency,
        cacheHitRate,
        pathResults,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Warm up individual path
   */
  async warmUpPath(path) {
    // Simulate HTTP request to warm up the path
    const latency = 50 + Math.random() * 100; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, latency));

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`Path warmup failed: ${path}`);
    }

    return {
      path,
      warmed: true,
      latency,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Warm up indices
   */
  async warmUpIndices() {
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Warming up indices`);

      const indices = [
        'identity_index',
        'content_index',
        'transaction_index',
        'audit_index',
        'metadata_index'
      ];

      const indexResults = [];

      for (const index of indices) {
        try {
          const indexStartTime = performance.now();
          
          // Simulate index warm-up
          await this.warmUpIndex(index);
          
          const indexLatency = performance.now() - indexStartTime;

          indexResults.push({
            index,
            status: 'warmed',
            latency: indexLatency,
            timestamp: new Date().toISOString()
          });

          console.log(`[DemoOrchestrator] ✅ Warmed index: ${index} (${indexLatency}ms)`);

        } catch (error) {
          indexResults.push({
            index,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          });

          console.warn(`[DemoOrchestrator] ⚠️ Failed to warm index: ${index}`, error);
        }
      }

      const successfulIndices = indexResults.filter(r => r.status === 'warmed').length;

      return {
        status: successfulIndices === indices.length ? 'completed' : 'partial',
        successfulIndices,
        totalIndices: indices.length,
        indexResults,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Warm up individual index
   */
  async warmUpIndex(index) {
    // Simulate index loading and caching
    const loadTime = 100 + Math.random() * 200; // 100-300ms
    await new Promise(resolve => setTimeout(resolve, loadTime));

    // Simulate occasional failures
    if (Math.random() < 0.03) { // 3% failure rate
      throw new Error(`Index warmup failed: ${index}`);
    }

    return {
      index,
      loaded: true,
      loadTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Warm up WASM modules
   */
  async warmUpWASM() {
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Warming up WASM modules`);

      const wasmModules = [
        'qlock_crypto',
        'qonsent_validator',
        'qindex_search',
        'qerberos_audit',
        'qflow_executor'
      ];

      const wasmResults = [];

      for (const module of wasmModules) {
        try {
          const moduleStartTime = performance.now();
          
          // Simulate WASM module loading and compilation
          await this.warmUpWASMModule(module);
          
          const moduleLatency = performance.now() - moduleStartTime;

          wasmResults.push({
            module,
            status: 'loaded',
            latency: moduleLatency,
            timestamp: new Date().toISOString()
          });

          console.log(`[DemoOrchestrator] ✅ Loaded WASM module: ${module} (${moduleLatency}ms)`);

        } catch (error) {
          wasmResults.push({
            module,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          });

          console.warn(`[DemoOrchestrator] ⚠️ Failed to load WASM module: ${module}`, error);
        }
      }

      const loadedModules = wasmResults.filter(r => r.status === 'loaded').length;

      return {
        status: loadedModules === wasmModules.length ? 'completed' : 'partial',
        loadedModules,
        totalModules: wasmModules.length,
        wasmResults,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Warm up individual WASM module
   */
  async warmUpWASMModule(module) {
    // Simulate WASM module loading, compilation, and instantiation
    const loadTime = 200 + Math.random() * 300; // 200-500ms (WASM compilation is slower)
    await new Promise(resolve => setTimeout(resolve, loadTime));

    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error(`WASM module loading failed: ${module}`);
    }

    return {
      module,
      compiled: true,
      instantiated: true,
      loadTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Establish performance baseline after warm-up
   */
  async establishPerformanceBaseline() {
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Establishing performance baseline`);

      // Run a series of test operations to establish baseline
      const baselineTests = [
        { operation: 'identity_verify', iterations: 10 },
        { operation: 'content_encrypt', iterations: 5 },
        { operation: 'metadata_index', iterations: 8 },
        { operation: 'audit_log', iterations: 6 },
        { operation: 'transaction_process', iterations: 4 }
      ];

      const testResults = [];

      for (const test of baselineTests) {
        const testResult = await this.runBaselineTest(test);
        testResults.push(testResult);
      }

      // Calculate baseline metrics
      const totalOperations = testResults.reduce((sum, result) => sum + result.iterations, 0);
      const totalLatency = testResults.reduce((sum, result) => sum + result.totalLatency, 0);
      const averageLatency = totalLatency / totalOperations;

      const baseline = {
        averageLatency,
        throughput: totalOperations / (performance.now() - startTime) * 1000, // ops/sec
        errorRate: 0, // Baseline should have no errors
        testResults,
        established: new Date().toISOString()
      };

      return {
        status: 'established',
        baseline,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run baseline test for specific operation
   */
  async runBaselineTest(test) {
    const testStartTime = performance.now();
    const latencies = [];

    for (let i = 0; i < test.iterations; i++) {
      const operationStartTime = performance.now();
      
      // Simulate operation execution
      await this.simulateOperation(test.operation);
      
      const operationLatency = performance.now() - operationStartTime;
      latencies.push(operationLatency);
    }

    const totalLatency = latencies.reduce((sum, latency) => sum + latency, 0);
    const averageLatency = totalLatency / latencies.length;

    return {
      operation: test.operation,
      iterations: test.iterations,
      totalLatency,
      averageLatency,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      duration: performance.now() - testStartTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulate operation for baseline testing
   */
  async simulateOperation(operation) {
    // Simulate different operation types with realistic latencies
    const operationLatencies = {
      'identity_verify': 30 + Math.random() * 20, // 30-50ms
      'content_encrypt': 80 + Math.random() * 40, // 80-120ms
      'metadata_index': 25 + Math.random() * 15, // 25-40ms
      'audit_log': 15 + Math.random() * 10, // 15-25ms
      'transaction_process': 60 + Math.random() * 30 // 60-90ms
    };

    const latency = operationLatencies[operation] || 50;
    await new Promise(resolve => setTimeout(resolve, latency));

    return {
      operation,
      latency,
      timestamp: new Date().toISOString()
    };
  }

  generateWarmupId() {
    return `warmup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Deploy to QNET Phase 2 environment
   */
  async deployToQNETPhase2() {
    const deploymentId = this.generateDeploymentId();
    const startTime = performance.now();

    try {
      console.log(`[DemoOrchestrator] Deploying to QNET Phase 2: ${deploymentId}`);

      const deployment = {
        deploymentId,
        timestamp: new Date().toISOString(),
        status: 'deploying',
        nodes: [],
        configuration: this.config.qnetPhase2Config,
        healthChecks: [],
        executionTime: 0
      };

      // Simulate QNET Phase 2 deployment
      const nodeCount = this.config.qnetPhase2Config.nodeCount;
      
      for (let i = 1; i <= nodeCount; i++) {
        const nodeId = `qnet_phase2_node_${i}`;
        
        // Simulate node deployment
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s per node
        
        const nodeHealth = await this.checkNodeHealth(nodeId);
        
        deployment.nodes.push({
          nodeId,
          status: nodeHealth.healthy ? 'deployed' : 'failed',
          endpoint: `http://qnet-${i}.anarq.org:3000`,
          timestamp: new Date().toISOString()
        });
      }

      // Check consensus threshold
      const healthyNodes = deployment.nodes.filter(node => node.status === 'deployed').length;
      const consensusReached = healthyNodes >= this.config.qnetPhase2Config.consensusThreshold;

      deployment.status = consensusReached ? 'deployed' : 'failed';
      deployment.executionTime = performance.now() - startTime;

      console.log(`[DemoOrchestrator] ✅ QNET Phase 2 deployment: ${deployment.status} (${healthyNodes}/${nodeCount} nodes)`);
      return deployment;

    } catch (error) {
      return {
        deploymentId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Check individual node health
   */
  async checkNodeHealth(nodeId) {
    try {
      // Simulate node health check
      const latency = 50 + Math.random() * 100; // 50-150ms
      await new Promise(resolve => setTimeout(resolve, latency));

      const healthy = Math.random() > 0.1; // 90% success rate

      return {
        nodeId,
        healthy,
        latency,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        nodeId,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  generateDeploymentId() {
    return `deploy_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

export default DemoOrchestrator;