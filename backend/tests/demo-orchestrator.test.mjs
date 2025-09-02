/**
 * Demo Orchestrator Tests
 * Tests for the Demo Orchestrator service implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import DemoOrchestrator from '../services/DemoOrchestrator.mjs';
import fs from 'fs/promises';
import path from 'path';

describe('DemoOrchestrator', () => {
  let demoOrchestrator;
  const testArtifactsPath = 'artifacts/demo/test';

  beforeEach(async () => {
    demoOrchestrator = new DemoOrchestrator({
      artifactsPath: testArtifactsPath,
      environment: 'local'
    });

    // Create test artifacts directory
    await fs.mkdir(testArtifactsPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test artifacts
    try {
      await fs.rm(testArtifactsPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Environment Preparation', () => {
    it('should prepare demo environment successfully', async () => {
      const preparation = await demoOrchestrator.prepareDemoEnvironment(['identity-flow']);
      
      expect(preparation).toBeDefined();
      expect(preparation.preparationId).toMatch(/^prep_\d+_[a-f0-9]{8}$/);
      expect(preparation.status).toBe('ready');
      expect(preparation.environment).toBe('local');
      expect(preparation.scenarios).toContain('identity-flow');
    });

    it('should validate required services', async () => {
      const validation = await demoOrchestrator.validateRequiredServices();
      
      expect(validation).toBeDefined();
      expect(validation.status).toMatch(/^(success|failed)$/);
      expect(validation.services).toBeDefined();
      expect(Array.isArray(validation.services)).toBe(true);
    });
  });

  describe('Demo Data Generation', () => {
    it('should generate canonical identities', async () => {
      const identityData = await demoOrchestrator.generateDemoData('identities', 3);
      
      expect(identityData).toBeDefined();
      expect(identityData.dataType).toBe('identities');
      expect(identityData.count).toBe(3);
      expect(identityData.data).toHaveLength(3);
      expect(identityData.piiScanPassed).toBe(true);
      
      // Verify identity structure
      const identity = identityData.data[0];
      expect(identity.squidId).toMatch(/^squid_demo_\d+_[a-f0-9]{8}$/);
      expect(identity.publicKey).toBeDefined();
      expect(identity.metadata.seeded).toBe(true);
      expect(identity.metadata.deterministic).toBe(true);
    });

    it('should generate canonical content', async () => {
      const contentData = await demoOrchestrator.generateDemoData('content', 2);
      
      expect(contentData).toBeDefined();
      expect(contentData.dataType).toBe('content');
      expect(contentData.count).toBe(2);
      expect(contentData.data).toHaveLength(2);
      expect(contentData.piiScanPassed).toBe(true);
      
      // Verify content structure
      const content = contentData.data[0];
      expect(content.contentId).toMatch(/^content_demo_\d+_[a-f0-9]{8}$/);
      expect(content.type).toBeDefined();
      expect(content.size).toBeGreaterThan(0);
      expect(content.checksum).toBeDefined();
    });

    it('should generate DAO scenarios', async () => {
      const daoData = await demoOrchestrator.generateDemoData('dao-scenarios', 1);
      
      expect(daoData).toBeDefined();
      expect(daoData.dataType).toBe('dao-scenarios');
      expect(daoData.count).toBe(1);
      expect(daoData.data).toHaveLength(1);
      
      // Verify DAO scenario structure
      const scenario = daoData.data[0];
      expect(scenario.scenarioId).toMatch(/^dao_demo_\d+_[a-f0-9]{8}$/);
      expect(scenario.type).toBe('governance_proposal');
      expect(scenario.proposal.quorum).toBeGreaterThan(0);
      expect(scenario.expectedVotes).toBeDefined();
    });

    it('should pass PII scanner', async () => {
      const testData = [
        { name: 'Demo User 1', email: 'demo@example.com' },
        { content: 'Synthetic test data for demo purposes' }
      ];
      
      const piiScanResult = await demoOrchestrator.scanForPII(testData);
      expect(piiScanResult).toBe(true);
    });
  });

  describe('Demo Scenario Execution', () => {
    it('should execute identity flow demo', async () => {
      // Generate test data first
      await demoOrchestrator.generateDemoData('identities', 1);
      
      const execution = await demoOrchestrator.executeDemoScenario('identity-flow');
      
      expect(execution).toBeDefined();
      expect(execution.executionId).toMatch(/^exec_\d+_[a-f0-9]{8}$/);
      expect(execution.scenarioId).toBe('identity-flow');
      expect(execution.status).toBe('completed');
      expect(execution.results.success).toBe(true);
      expect(execution.results.steps).toHaveLength(4);
      expect(execution.results.auditTrail.length).toBeGreaterThan(0);
    });

    it('should execute content flow demo', async () => {
      // Generate test data first
      await demoOrchestrator.generateDemoData('content', 1);
      
      const execution = await demoOrchestrator.executeDemoScenario('content-flow');
      
      expect(execution).toBeDefined();
      expect(execution.executionId).toMatch(/^exec_\d+_[a-f0-9]{8}$/);
      expect(execution.scenarioId).toBe('content-flow');
      expect(execution.status).toBe('completed');
      expect(execution.results.success).toBe(true);
      expect(execution.results.steps).toHaveLength(4);
      expect(execution.results.summary.storedIPFS).toMatch(/^Qm[a-zA-Z0-9]{44}$/);
    });

    it('should execute DAO flow demo', async () => {
      // Generate test data first
      await demoOrchestrator.generateDemoData('dao-scenarios', 1);
      
      const execution = await demoOrchestrator.executeDemoScenario('dao-flow');
      
      expect(execution).toBeDefined();
      expect(execution.executionId).toMatch(/^exec_\d+_[a-f0-9]{8}$/);
      expect(execution.scenarioId).toBe('dao-flow');
      expect(execution.status).toBe('completed');
      expect(execution.results.success).toBe(true);
      expect(execution.results.steps).toHaveLength(4);
      expect(execution.results.summary.outcome).toMatch(/^(approved|rejected)$/);
    });
  });

  describe('No-Central-Server Validation', () => {
    it('should produce no-central-server report', async () => {
      const report = await demoOrchestrator.produceNoCentralServerReport();
      
      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^report_\d+_[a-f0-9]{8}$/);
      expect(report.status).toMatch(/^(compliant|non_compliant)$/);
      expect(report.decentralizationChecks).toBeDefined();
      expect(report.killFirstLauncherTest).toBeDefined();
      expect(report.continuityValidation).toBeDefined();
    });

    it('should run kill-first-launcher test', async () => {
      const test = await demoOrchestrator.runKillFirstLauncherTest();
      
      expect(test).toBeDefined();
      expect(test.testId).toMatch(/^test_\d+_[a-f0-9]{8}$/);
      expect(test.status).toMatch(/^(passed|failed|error)$/);
      expect(test.phases).toBeDefined();
      expect(test.metrics).toBeDefined();
      expect(test.metrics.continuityMaintained).toBeDefined();
    });
  });

  describe('Cache Warm-up', () => {
    it('should warm up critical paths', async () => {
      const warmup = await demoOrchestrator.warmUpPaths();
      
      expect(warmup).toBeDefined();
      expect(warmup.warmupId).toMatch(/^warmup_\d+_[a-f0-9]{8}$/);
      expect(warmup.status).toMatch(/^(completed|partial|failed)$/);
      expect(warmup.phases).toBeDefined();
      expect(warmup.metrics.totalPaths).toBeGreaterThan(0);
    });

    it('should establish performance baseline', async () => {
      const baseline = await demoOrchestrator.establishPerformanceBaseline();
      
      expect(baseline).toBeDefined();
      expect(baseline.status).toBe('established');
      expect(baseline.baseline).toBeDefined();
      expect(baseline.baseline.averageLatency).toBeGreaterThan(0);
      expect(baseline.baseline.throughput).toBeGreaterThan(0);
    });
  });

  describe('Result Validation', () => {
    it('should validate demo results', async () => {
      const expectedOutputs = {
        squidId: 'squid_demo_1',
        walletId: 'wallet_demo_1',
        transactionId: 'tx_demo_1'
      };
      
      const actualResults = {
        squidId: 'squid_demo_1',
        walletId: 'wallet_demo_1',
        transactionId: 'tx_demo_1',
        executionTime: 15000
      };
      
      const validation = await demoOrchestrator.validateDemoResults(
        'identity-flow',
        expectedOutputs,
        actualResults
      );
      
      expect(validation).toBeDefined();
      expect(validation.validationId).toMatch(/^val_\d+_[a-f0-9]{8}$/);
      expect(validation.status).toBe('passed');
      expect(validation.checks).toBeDefined();
    });
  });

  describe('Artifact Management', () => {
    it('should save artifacts correctly', async () => {
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      const filename = 'test-artifact.json';
      
      const artifactPath = await demoOrchestrator.saveArtifact(filename, testData);
      
      expect(artifactPath).toBeDefined();
      expect(artifactPath).toContain(filename);
      
      // Verify file was created
      const savedData = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
      expect(savedData).toEqual(testData);
    });
  });
});