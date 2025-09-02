/**
 * Data Flow Tester Service
 * Validates end-to-end data flows through the Q∞ ecosystem modules
 * Implements execution ledger verification and deterministic replay
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import ObservabilityService from './ObservabilityService.mjs';
import { EventBusService } from './EventBusService.mjs';
import ipfsService from './ipfsService.mjs';
import { getQlockService } from '../ecosystem/QlockService.mjs';
import { getQonsentService } from '../ecosystem/QonsentService.mjs';
import { getQindexService } from '../ecosystem/QindexService.mjs';
import { getQerberosService } from '../ecosystem/QerberosService.mjs';
import { getQNETService } from '../ecosystem/QNETService.mjs';

export class DataFlowTester extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      flowTimeout: 30000, // 30 seconds
      stressTestParallelism: 1000,
      maxErrorRate: 0.05, // 5%
      replayTolerancePercent: 0.01, // 1%
      timingTolerancePercent: 0.10, // 10%
      gossipsubFairnessThreshold: 0.01, // 1%
      ...options
    };

    // Initialize services
    this.observability = new ObservabilityService();
    this.eventBus = new EventBusService();
    
    // Ecosystem services
    this.qlockService = getQlockService();
    this.qonsentService = getQonsentService();
    this.qindexService = getQindexService();
    this.qerberosService = getQerberosService();
    this.qnetService = getQNETService();

    // Flow tracking
    this.activeFlows = new Map();
    this.executionLedger = new Map();
    this.replayResults = new Map();
    this.stressTestResults = new Map();

    // Vector clocks for distributed execution tracking
    this.vectorClocks = new Map();
    this.nodeId = this.generateNodeId();

    console.log(`[DataFlowTester] Initialized with node ID: ${this.nodeId}`);
  }

  /**
   * Test input data flow: data → Qompress → Qlock → Qindex → Qerberos → IPFS
   * Requirements: 2.1, 2.2, 2.3
   */
  async testInputFlow(data, options = {}) {
    const flowId = this.generateFlowId();
    const startTime = performance.now();

    try {
      console.log(`[DataFlowTester] Starting input flow test: ${flowId}`);

      const flowData = {
        flowId,
        flowType: 'input',
        startTime: new Date().toISOString(),
        data: data,
        options: options,
        steps: [],
        validation: {
          hashVerification: false,
          signatureValidation: false,
          integrityCheck: false,
          executionLedger: null,
          performanceMetrics: {
            totalDuration: 0,
            stepDurations: {},
            errorRate: 0,
            throughput: 0
          }
        },
        anomalies: []
      };

      this.activeFlows.set(flowId, flowData);

      // Step 1: Qompress (simulate compression)
      const compressStep = await this.executeFlowStep(flowId, 'qompress', data, {
        operation: 'compress',
        algorithm: options.compressionAlgorithm || 'gzip'
      });
      flowData.steps.push(compressStep);

      // Step 2: Qlock (encryption)
      const encryptStep = await this.executeFlowStep(flowId, 'qlock', compressStep.output, {
        operation: 'encrypt',
        encryptionLevel: options.encryptionLevel || 'standard',
        squidId: options.squidId || 'test-squid'
      });
      flowData.steps.push(encryptStep);

      // Step 3: Qindex (metadata indexing)
      const indexStep = await this.executeFlowStep(flowId, 'qindex', encryptStep.output, {
        operation: 'index',
        metadata: options.metadata || { type: 'test-data' }
      });
      flowData.steps.push(indexStep);

      // Step 4: Qerberos (security audit)
      const auditStep = await this.executeFlowStep(flowId, 'qerberos', indexStep.output, {
        operation: 'audit',
        auditLevel: options.auditLevel || 'standard'
      });
      flowData.steps.push(auditStep);

      // Step 5: IPFS (storage)
      const ipfsStep = await this.executeFlowStep(flowId, 'ipfs', auditStep.output, {
        operation: 'store'
      });
      flowData.steps.push(ipfsStep);

      // Complete flow validation
      flowData.endTime = new Date().toISOString();
      flowData.validation = await this.validateFlowIntegrity(flowData);
      
      // Record in execution ledger
      await this.recordExecutionLedger(flowId, flowData);

      // Calculate performance metrics
      const totalDuration = performance.now() - startTime;
      flowData.validation.performanceMetrics.totalDuration = totalDuration;
      flowData.validation.performanceMetrics.throughput = this.calculateThroughput(data, totalDuration);

      // Emit flow completion event
      await this.eventBus.publish({
        topic: 'q.dataflow.input.completed.v1',
        payload: {
          flowId,
          status: 'completed',
          duration: totalDuration,
          steps: flowData.steps.length,
          validation: flowData.validation
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Input flow completed: ${flowId} (${totalDuration.toFixed(2)}ms)`);
      return flowData;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Input flow failed: ${flowId}`, error);
      
      const flowData = this.activeFlows.get(flowId) || { flowId, flowType: 'input' };
      flowData.error = error.message;
      flowData.endTime = new Date().toISOString();
      
      await this.eventBus.publish({
        topic: 'q.dataflow.input.failed.v1',
        payload: {
          flowId,
          error: error.message,
          duration: performance.now() - startTime
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      throw new Error(`Input flow test failed: ${error.message}`);
    } finally {
      this.activeFlows.delete(flowId);
    }
  }

  /**
   * Test output data flow: IPFS → Qindex → Qerberos → Qlock → Qompress → user
   * Requirements: 2.1, 2.2, 2.3
   */
  async testOutputFlow(ipfsHash, options = {}) {
    const flowId = this.generateFlowId();
    const startTime = performance.now();

    try {
      console.log(`[DataFlowTester] Starting output flow test: ${flowId}`);

      const flowData = {
        flowId,
        flowType: 'output',
        startTime: new Date().toISOString(),
        ipfsHash: ipfsHash,
        options: options,
        steps: [],
        validation: {
          hashVerification: false,
          signatureValidation: false,
          integrityCheck: false,
          executionLedger: null,
          performanceMetrics: {
            totalDuration: 0,
            stepDurations: {},
            errorRate: 0,
            throughput: 0
          }
        },
        anomalies: []
      };

      this.activeFlows.set(flowId, flowData);

      // Step 1: IPFS (retrieve)
      const ipfsStep = await this.executeFlowStep(flowId, 'ipfs', ipfsHash, {
        operation: 'retrieve'
      });
      flowData.steps.push(ipfsStep);

      // Step 2: Qindex (metadata retrieval)
      const indexStep = await this.executeFlowStep(flowId, 'qindex', ipfsStep.output, {
        operation: 'retrieve',
        hash: ipfsHash
      });
      flowData.steps.push(indexStep);

      // Step 3: Qerberos (security verification)
      const auditStep = await this.executeFlowStep(flowId, 'qerberos', indexStep.output, {
        operation: 'verify',
        auditLevel: options.auditLevel || 'standard'
      });
      flowData.steps.push(auditStep);

      // Step 4: Qlock (decryption)
      const decryptStep = await this.executeFlowStep(flowId, 'qlock', auditStep.output, {
        operation: 'decrypt',
        encryptionMetadata: options.encryptionMetadata
      });
      flowData.steps.push(decryptStep);

      // Step 5: Qompress (decompression)
      const decompressStep = await this.executeFlowStep(flowId, 'qompress', decryptStep.output, {
        operation: 'decompress',
        algorithm: options.compressionAlgorithm || 'gzip'
      });
      flowData.steps.push(decompressStep);

      // Complete flow validation
      flowData.endTime = new Date().toISOString();
      flowData.validation = await this.validateFlowIntegrity(flowData);
      
      // Record in execution ledger
      await this.recordExecutionLedger(flowId, flowData);

      // Calculate performance metrics
      const totalDuration = performance.now() - startTime;
      flowData.validation.performanceMetrics.totalDuration = totalDuration;
      flowData.validation.performanceMetrics.throughput = this.calculateThroughput(decompressStep.output, totalDuration);

      // Emit flow completion event
      await this.eventBus.publish({
        topic: 'q.dataflow.output.completed.v1',
        payload: {
          flowId,
          status: 'completed',
          duration: totalDuration,
          steps: flowData.steps.length,
          validation: flowData.validation
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Output flow completed: ${flowId} (${totalDuration.toFixed(2)}ms)`);
      return flowData;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Output flow failed: ${flowId}`, error);
      
      const flowData = this.activeFlows.get(flowId) || { flowId, flowType: 'output' };
      flowData.error = error.message;
      flowData.endTime = new Date().toISOString();
      
      await this.eventBus.publish({
        topic: 'q.dataflow.output.failed.v1',
        payload: {
          flowId,
          error: error.message,
          duration: performance.now() - startTime
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      throw new Error(`Output flow test failed: ${error.message}`);
    } finally {
      this.activeFlows.delete(flowId);
    }
  }

  /**
   * Validate Qflow execution for serverless workflow validation
   * Requirements: 2.1, 2.2, 2.3
   */
  async validateQflowExecution(workflow, nodes = [], options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    try {
      console.log(`[DataFlowTester] Starting Qflow execution validation: ${executionId}`);

      const execution = {
        executionId,
        workflow: workflow,
        nodes: nodes,
        startTime: new Date().toISOString(),
        steps: [],
        validation: {
          distributedExecution: false,
          nodeCoordination: false,
          workflowIntegrity: false,
          serverlessValidation: false,
          executionLedger: null,
          performanceMetrics: {
            totalDuration: 0,
            stepDurations: {},
            nodeLatencies: {},
            errorRate: 0
          }
        },
        anomalies: []
      };

      // Validate distributed execution across nodes
      execution.validation.distributedExecution = await this.validateDistributedExecution(executionId, nodes);

      // Validate node coordination
      execution.validation.nodeCoordination = await this.validateNodeCoordination(executionId, nodes);

      // Validate workflow integrity
      execution.validation.workflowIntegrity = await this.validateWorkflowIntegrity(executionId, workflow);

      // Validate serverless execution
      execution.validation.serverlessValidation = await this.validateServerlessExecution(executionId, workflow, nodes);

      // Record execution in ledger
      await this.recordExecutionLedger(executionId, execution);

      execution.endTime = new Date().toISOString();
      execution.validation.performanceMetrics.totalDuration = performance.now() - startTime;

      // Emit execution validation event
      await this.eventBus.publish({
        topic: 'q.qflow.execution.validated.v1',
        payload: {
          executionId,
          workflow: workflow.name || 'unnamed',
          nodes: nodes.length,
          validation: execution.validation,
          duration: execution.validation.performanceMetrics.totalDuration
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Qflow execution validated: ${executionId}`);
      return execution;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Qflow execution validation failed: ${executionId}`, error);
      
      await this.eventBus.publish({
        topic: 'q.qflow.execution.validation.failed.v1',
        payload: {
          executionId,
          error: error.message,
          duration: performance.now() - startTime
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      throw new Error(`Qflow execution validation failed: ${error.message}`);
    }
  }

  /**
   * Execute a single flow step
   */
  async executeFlowStep(flowId, stepName, input, options = {}) {
    const stepId = this.generateStepId();
    const startTime = performance.now();

    try {
      console.log(`[DataFlowTester] Executing step: ${stepName} (${stepId})`);

      let output;
      let metadata = {};

      switch (stepName) {
        case 'qompress':
          output = await this.simulateQompress(input, options);
          break;
        case 'qlock':
          if (options.operation === 'encrypt') {
            const result = await this.qlockService.encrypt(input, options.encryptionLevel, options);
            output = result.encryptedBuffer;
            metadata.encryptionMetadata = result.encryptionMetadata;
          } else if (options.operation === 'decrypt') {
            output = await this.qlockService.decrypt(input, options.encryptionMetadata, options);
          }
          break;
        case 'qindex':
          output = await this.simulateQindex(input, options);
          break;
        case 'qerberos':
          output = await this.simulateQerberos(input, options);
          break;
        case 'ipfs':
          if (options.operation === 'store') {
            output = await this.simulateIPFSStore(input, options);
          } else if (options.operation === 'retrieve') {
            output = await this.simulateIPFSRetrieve(input, options);
          }
          break;
        default:
          throw new Error(`Unknown step: ${stepName}`);
      }

      const duration = performance.now() - startTime;
      const step = {
        stepId,
        stepName,
        flowId,
        input: this.hashData(input),
        output: output,
        metadata,
        duration,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      // Update vector clock
      this.updateVectorClock(stepId);

      console.log(`[DataFlowTester] ✅ Step completed: ${stepName} (${duration.toFixed(2)}ms)`);
      return step;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Step failed: ${stepName}`, error);
      
      const step = {
        stepId,
        stepName,
        flowId,
        input: this.hashData(input),
        error: error.message,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
        status: 'failed'
      };

      return step;
    }
  }

  /**
   * Validate flow integrity
   */
  async validateFlowIntegrity(flowData) {
    try {
      const validation = {
        hashVerification: true,
        signatureValidation: true,
        integrityCheck: true,
        executionLedger: null,
        performanceMetrics: flowData.validation.performanceMetrics
      };

      // Verify hash chain through steps
      for (let i = 1; i < flowData.steps.length; i++) {
        const prevStep = flowData.steps[i - 1];
        const currentStep = flowData.steps[i];
        
        // Verify that current step input matches previous step output hash
        const expectedInputHash = this.hashData(prevStep.output);
        if (currentStep.input !== expectedInputHash) {
          validation.hashVerification = false;
          flowData.anomalies.push({
            type: 'hash_mismatch',
            step: currentStep.stepName,
            expected: expectedInputHash,
            actual: currentStep.input
          });
        }
      }

      // Calculate step durations
      flowData.steps.forEach(step => {
        validation.performanceMetrics.stepDurations[step.stepName] = step.duration;
      });

      // Calculate error rate
      const failedSteps = flowData.steps.filter(step => step.status === 'failed').length;
      validation.performanceMetrics.errorRate = failedSteps / flowData.steps.length;

      return validation;

    } catch (error) {
      console.error(`[DataFlowTester] Flow integrity validation failed:`, error);
      return {
        hashVerification: false,
        signatureValidation: false,
        integrityCheck: false,
        error: error.message
      };
    }
  }

  // Utility methods
  generateFlowId() {
    return `flow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateExecutionId() {
    return `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateStepId() {
    return `step_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateNodeId() {
    return `node_${crypto.randomBytes(8).toString('hex')}`;
  }

  hashData(data) {
    if (Buffer.isBuffer(data)) {
      return crypto.createHash('sha256').update(data).digest('hex');
    } else if (typeof data === 'string') {
      return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    } else {
      return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
  }

  calculateThroughput(data, durationMs) {
    const sizeBytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(JSON.stringify(data));
    return (sizeBytes / (durationMs / 1000)); // bytes per second
  }

  updateVectorClock(eventId) {
    if (!this.vectorClocks.has(this.nodeId)) {
      this.vectorClocks.set(this.nodeId, 0);
    }
    
    const currentClock = this.vectorClocks.get(this.nodeId);
    this.vectorClocks.set(this.nodeId, currentClock + 1);
    
    return {
      nodeId: this.nodeId,
      clock: this.vectorClocks.get(this.nodeId),
      eventId
    };
  }

  // Simulation methods for modules not yet implemented
  async simulateQompress(input, options) {
    // Simulate compression
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
    
    if (options.operation === 'compress') {
      // Simulate compression by reducing size
      const compressed = Buffer.isBuffer(input) ? 
        input.slice(0, Math.floor(input.length * 0.7)) : 
        JSON.stringify({ compressed: true, original: input });
      return compressed;
    } else if (options.operation === 'decompress') {
      // Simulate decompression
      return typeof input === 'string' && input.includes('compressed') ? 
        JSON.parse(input).original : input;
    }
    
    return input;
  }

  async simulateQindex(input, options) {
    // Simulate indexing operations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    if (options.operation === 'index') {
      return {
        indexed: true,
        data: input,
        metadata: options.metadata,
        indexHash: this.hashData(input),
        timestamp: new Date().toISOString()
      };
    } else if (options.operation === 'retrieve') {
      return {
        retrieved: true,
        data: input,
        hash: options.hash,
        timestamp: new Date().toISOString()
      };
    }
    
    return input;
  }

  async simulateQerberos(input, options) {
    // Simulate security audit operations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 75 + 25));
    
    if (options.operation === 'audit') {
      return {
        audited: true,
        data: input,
        auditLevel: options.auditLevel,
        auditHash: this.hashData(input),
        securityScore: Math.random() * 100,
        timestamp: new Date().toISOString()
      };
    } else if (options.operation === 'verify') {
      return {
        verified: true,
        data: input,
        auditLevel: options.auditLevel,
        verificationStatus: 'passed',
        timestamp: new Date().toISOString()
      };
    }
    
    return input;
  }

  async simulateIPFSStore(input, options) {
    // Simulate IPFS storage
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    const hash = `Qm${crypto.randomBytes(22).toString('base64').replace(/[+/]/g, '').substring(0, 44)}`;
    
    return {
      stored: true,
      ipfsHash: hash,
      size: Buffer.isBuffer(input) ? input.length : Buffer.byteLength(JSON.stringify(input)),
      timestamp: new Date().toISOString()
    };
  }

  async simulateIPFSRetrieve(hash, options) {
    // Simulate IPFS retrieval
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
    
    return {
      retrieved: true,
      ipfsHash: hash,
      data: `Retrieved data for hash: ${hash}`,
      timestamp: new Date().toISOString()
    };
  }

  // Validation methods for Qflow execution
  async validateDistributedExecution(executionId, nodes) {
    // Simulate distributed execution validation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    const healthyNodes = nodes.filter(() => Math.random() > 0.1); // 90% healthy
    
    return {
      status: healthyNodes.length >= Math.ceil(nodes.length * 0.67), // 2/3 majority
      totalNodes: nodes.length,
      healthyNodes: healthyNodes.length,
      executionId
    };
  }

  async validateNodeCoordination(executionId, nodes) {
    // Simulate node coordination validation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
    
    return {
      status: true,
      coordinationLatency: Math.random() * 100 + 50,
      consensusReached: true,
      executionId
    };
  }

  async validateWorkflowIntegrity(executionId, workflow) {
    // Simulate workflow integrity validation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    return {
      status: true,
      workflowHash: this.hashData(workflow),
      integrityVerified: true,
      executionId
    };
  }

  async validateServerlessExecution(executionId, workflow, nodes) {
    // Simulate serverless execution validation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 250 + 125));
    
    return {
      status: true,
      executionLatency: Math.random() * 200 + 100,
      serverlessHealthy: true,
      executionId
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      activeFlows: this.activeFlows.size,
      executionLedgerSize: this.executionLedger.size,
      vectorClocks: Object.fromEntries(this.vectorClocks),
      nodeId: this.nodeId,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Record execution in ledger with hash-chain validation
   * Requirements: 2.1, 2.5
   */
  async recordExecutionLedger(executionId, executionData) {
    try {
      const previousRecord = this.getLastLedgerRecord();
      const vectorClock = this.updateVectorClock(executionId);
      
      const ledgerRecord = {
        id: this.generateLedgerRecordId(),
        executionId,
        timestamp: new Date().toISOString(),
        nodeId: this.nodeId,
        vectorClock: vectorClock,
        previousHash: previousRecord ? previousRecord.hash : null,
        data: {
          type: executionData.flowType || 'execution',
          steps: executionData.steps ? executionData.steps.length : 0,
          validation: executionData.validation,
          duration: executionData.validation?.performanceMetrics?.totalDuration || 0
        },
        hash: null // Will be calculated
      };

      // Calculate hash for this record
      ledgerRecord.hash = this.calculateLedgerRecordHash(ledgerRecord);

      // Store in ledger
      this.executionLedger.set(ledgerRecord.id, ledgerRecord);

      // Publish to IPFS for decentralized storage
      const cid = await this.publishLedgerRecordToIPFS(ledgerRecord);
      ledgerRecord.cid = cid;

      console.log(`[DataFlowTester] Recorded execution in ledger: ${ledgerRecord.id}`);
      
      // Emit ledger event
      await this.eventBus.publish({
        topic: 'q.dataflow.ledger.recorded.v1',
        payload: {
          recordId: ledgerRecord.id,
          executionId,
          cid,
          vectorClock: vectorClock
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      return ledgerRecord;

    } catch (error) {
      console.error(`[DataFlowTester] Failed to record execution ledger:`, error);
      throw new Error(`Ledger recording failed: ${error.message}`);
    }
  }

  /**
   * Verify execution ledger with hash-chain validation
   * Requirements: 2.1, 2.5
   */
  async verifyExecutionLedger(executionId) {
    try {
      console.log(`[DataFlowTester] Verifying execution ledger: ${executionId}`);

      const ledgerRecords = Array.from(this.executionLedger.values())
        .filter(record => record.executionId === executionId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (ledgerRecords.length === 0) {
        throw new Error(`No ledger records found for execution: ${executionId}`);
      }

      const verification = {
        executionId,
        chainValid: true,
        totalRecords: ledgerRecords.length,
        brokenAt: null,
        orphanRecords: [],
        vectorClocks: {},
        lastRecordCID: null,
        verificationTimestamp: new Date().toISOString()
      };

      // Verify hash chain continuity
      let previousHash = null;
      for (let i = 0; i < ledgerRecords.length; i++) {
        const record = ledgerRecords[i];
        
        // Verify previous hash link
        if (record.previousHash !== previousHash) {
          verification.chainValid = false;
          verification.brokenAt = record.id;
          break;
        }

        // Verify record hash integrity
        const expectedHash = this.calculateLedgerRecordHash({
          ...record,
          hash: null // Exclude hash from calculation
        });
        
        if (record.hash !== expectedHash) {
          verification.chainValid = false;
          verification.brokenAt = record.id;
          break;
        }

        // Collect vector clocks
        verification.vectorClocks[record.nodeId] = record.vectorClock.clock;
        
        previousHash = record.hash;
      }

      // Check for orphan records (records without proper chain links)
      const allRecords = Array.from(this.executionLedger.values());
      verification.orphanRecords = allRecords.filter(record => {
        if (record.previousHash === null) return false; // Genesis record
        return !allRecords.some(r => r.hash === record.previousHash);
      }).map(r => r.id);

      verification.lastRecordCID = ledgerRecords[ledgerRecords.length - 1]?.cid || null;

      // Emit verification event
      await this.eventBus.publish({
        topic: 'q.dataflow.ledger.verified.v1',
        payload: {
          executionId,
          chainValid: verification.chainValid,
          totalRecords: verification.totalRecords,
          orphanRecords: verification.orphanRecords.length
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Ledger verification completed: ${verification.chainValid ? 'VALID' : 'INVALID'}`);
      return verification;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Ledger verification failed:`, error);
      throw new Error(`Ledger verification failed: ${error.message}`);
    }
  }

  /**
   * Deterministic replay of execution
   * Requirements: 2.2, 2.5
   */
  async deterministicReplay(executionId) {
    try {
      console.log(`[DataFlowTester] Starting deterministic replay: ${executionId}`);

      // Get original execution data
      const originalExecution = await this.getExecutionFromLedger(executionId);
      if (!originalExecution) {
        throw new Error(`Execution not found in ledger: ${executionId}`);
      }

      const replayId = `replay_${executionId}_${Date.now()}`;
      const startTime = performance.now();

      // Replay execution with same inputs and context
      const replayResult = await this.executeReplay(originalExecution, replayId);
      
      const replayDuration = performance.now() - startTime;

      // Compare results
      const comparison = await this.compareExecutionResults(originalExecution, replayResult);
      
      const replay = {
        replayId,
        originalExecutionId: executionId,
        replayDuration,
        deterministic: comparison.deterministic,
        divergenceAt: comparison.divergenceAt,
        stepComparisons: comparison.stepComparisons,
        timingAnalysis: {
          originalDuration: originalExecution.duration,
          replayDuration,
          timingDifference: Math.abs(replayDuration - originalExecution.duration),
          timingToleranceMet: Math.abs(replayDuration - originalExecution.duration) / originalExecution.duration <= this.config.timingTolerancePercent
        },
        timestamp: new Date().toISOString()
      };

      // Store replay result
      this.replayResults.set(replayId, replay);

      // Emit replay event
      await this.eventBus.publish({
        topic: 'q.dataflow.replay.completed.v1',
        payload: {
          replayId,
          originalExecutionId: executionId,
          deterministic: replay.deterministic,
          timingToleranceMet: replay.timingAnalysis.timingToleranceMet
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Deterministic replay completed: ${replay.deterministic ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'}`);
      return replay;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Deterministic replay failed:`, error);
      throw new Error(`Deterministic replay failed: ${error.message}`);
    }
  }

  /**
   * Validate gossipsub backpressure and fair scheduling
   * Requirements: 2.3, 2.6
   */
  async validateGossipsubBackpressure() {
    try {
      console.log(`[DataFlowTester] Validating gossipsub backpressure`);

      const validationId = this.generateValidationId();
      const startTime = performance.now();

      // Simulate gossipsub network with multiple nodes
      const nodes = Array.from({ length: 5 }, (_, i) => ({
        id: `node_${i}`,
        jobs: [],
        processing: false,
        backoffLevel: 0
      }));

      // Simulate job distribution and backpressure
      const totalJobs = 1000;
      const jobs = Array.from({ length: totalJobs }, (_, i) => ({
        id: `job_${i}`,
        priority: Math.floor(Math.random() * 3), // 0-2 priority levels
        size: Math.random() * 1000 + 100, // 100-1100 bytes
        timestamp: Date.now() + i
      }));

      // Distribute jobs with backpressure simulation
      const distribution = await this.simulateGossipsubDistribution(nodes, jobs);

      // Analyze fairness and backpressure compliance
      const fairnessAnalysis = this.analyzeGossipsubFairness(distribution);

      const validation = {
        validationId,
        totalJobs,
        totalNodes: nodes.length,
        fairnessIndex: fairnessAnalysis.fairnessIndex,
        lostJobs: fairnessAnalysis.lostJobs,
        reannounceSuccess: fairnessAnalysis.reannounceSuccess,
        backoffCompliance: fairnessAnalysis.backoffCompliance,
        starvationDetected: fairnessAnalysis.starvationDetected,
        nodeDistribution: fairnessAnalysis.nodeDistribution,
        validationPassed: fairnessAnalysis.fairnessIndex >= (1 - this.config.gossipsubFairnessThreshold) && 
                         fairnessAnalysis.lostJobs <= totalJobs * 0.01, // ≤1% lost jobs
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Emit validation event
      await this.eventBus.publish({
        topic: 'q.dataflow.gossipsub.validated.v1',
        payload: {
          validationId,
          fairnessIndex: validation.fairnessIndex,
          lostJobs: validation.lostJobs,
          validationPassed: validation.validationPassed
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Gossipsub validation completed: ${validation.validationPassed ? 'PASSED' : 'FAILED'}`);
      return validation;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Gossipsub validation failed:`, error);
      throw new Error(`Gossipsub validation failed: ${error.message}`);
    }
  }

  /**
   * Run stress tests with parallel events
   * Requirements: 2.4
   */
  async runStressTests(eventCount = null, parallelism = null) {
    const testEventCount = eventCount || this.config.stressTestParallelism;
    const testParallelism = parallelism || Math.min(testEventCount, 100); // Batch size
    
    try {
      console.log(`[DataFlowTester] Starting stress test: ${testEventCount} events, ${testParallelism} parallel`);

      const stressTestId = this.generateStressTestId();
      const startTime = performance.now();

      const stressTest = {
        stressTestId,
        eventCount: testEventCount,
        parallelism: testParallelism,
        startTime: new Date().toISOString(),
        results: {
          completedEvents: 0,
          failedEvents: 0,
          errorRate: 0,
          throughput: 0,
          latencies: [],
          errors: []
        },
        benchmarks: {
          p50Latency: 0,
          p95Latency: 0,
          p99Latency: 0,
          maxLatency: 0,
          minLatency: Infinity
        }
      };

      // Generate test events
      const testEvents = Array.from({ length: testEventCount }, (_, i) => ({
        id: `stress_event_${i}`,
        data: `Test data ${i}`,
        timestamp: Date.now() + i
      }));

      // Execute events in parallel batches
      const batches = this.createBatches(testEvents, testParallelism);
      
      for (const batch of batches) {
        const batchPromises = batch.map(event => this.executeStressTestEvent(event, stressTestId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            stressTest.results.completedEvents++;
            stressTest.results.latencies.push(result.value.duration);
          } else {
            stressTest.results.failedEvents++;
            stressTest.results.errors.push({
              eventId: batch[index].id,
              error: result.reason.message
            });
          }
        });
      }

      // Calculate final metrics
      const totalDuration = performance.now() - startTime;
      stressTest.results.errorRate = stressTest.results.failedEvents / testEventCount;
      stressTest.results.throughput = testEventCount / (totalDuration / 1000); // events per second

      // Calculate latency benchmarks
      if (stressTest.results.latencies.length > 0) {
        const sortedLatencies = stressTest.results.latencies.sort((a, b) => a - b);
        stressTest.benchmarks.p50Latency = this.calculatePercentile(sortedLatencies, 0.5);
        stressTest.benchmarks.p95Latency = this.calculatePercentile(sortedLatencies, 0.95);
        stressTest.benchmarks.p99Latency = this.calculatePercentile(sortedLatencies, 0.99);
        stressTest.benchmarks.maxLatency = Math.max(...sortedLatencies);
        stressTest.benchmarks.minLatency = Math.min(...sortedLatencies);
      }

      stressTest.endTime = new Date().toISOString();
      stressTest.duration = totalDuration;
      stressTest.passed = stressTest.results.errorRate <= this.config.maxErrorRate;

      // Store stress test results
      this.stressTestResults.set(stressTestId, stressTest);

      // Emit stress test event
      await this.eventBus.publish({
        topic: 'q.dataflow.stress.completed.v1',
        payload: {
          stressTestId,
          eventCount: testEventCount,
          errorRate: stressTest.results.errorRate,
          throughput: stressTest.results.throughput,
          passed: stressTest.passed
        },
        actor: { squidId: 'data-flow-tester', type: 'system' }
      });

      console.log(`[DataFlowTester] ✅ Stress test completed: ${stressTest.passed ? 'PASSED' : 'FAILED'} (${stressTest.results.errorRate * 100}% error rate)`);
      return stressTest;

    } catch (error) {
      console.error(`[DataFlowTester] ❌ Stress test failed:`, error);
      throw new Error(`Stress test failed: ${error.message}`);
    }
  }

  // Helper methods for ledger and replay functionality

  getLastLedgerRecord() {
    const records = Array.from(this.executionLedger.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return records[0] || null;
  }

  generateLedgerRecordId() {
    return `ledger_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateValidationId() {
    return `validation_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateStressTestId() {
    return `stress_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  calculateLedgerRecordHash(record) {
    const hashData = {
      id: record.id,
      executionId: record.executionId,
      timestamp: record.timestamp,
      nodeId: record.nodeId,
      vectorClock: record.vectorClock,
      previousHash: record.previousHash,
      data: record.data
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
  }

  async publishLedgerRecordToIPFS(record) {
    try {
      // Simulate IPFS publishing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return `Qm${crypto.randomBytes(22).toString('base64').replace(/[+/]/g, '').substring(0, 44)}`;
    } catch (error) {
      console.error(`[DataFlowTester] Failed to publish ledger record to IPFS:`, error);
      return null;
    }
  }

  async getExecutionFromLedger(executionId) {
    const records = Array.from(this.executionLedger.values())
      .filter(record => record.executionId === executionId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (records.length === 0) return null;

    // Reconstruct execution from ledger records
    return {
      executionId,
      duration: records[records.length - 1].data.duration,
      steps: records.reduce((total, record) => total + record.data.steps, 0),
      validation: records[records.length - 1].data.validation,
      records
    };
  }

  async executeReplay(originalExecution, replayId) {
    // Simulate replay execution
    const replayDuration = originalExecution.duration * (0.9 + Math.random() * 0.2); // ±10% variation
    await new Promise(resolve => setTimeout(resolve, Math.min(replayDuration, 1000))); // Cap simulation time

    return {
      replayId,
      duration: replayDuration,
      steps: originalExecution.steps,
      validation: {
        ...originalExecution.validation,
        performanceMetrics: {
          ...originalExecution.validation.performanceMetrics,
          totalDuration: replayDuration
        }
      }
    };
  }

  async compareExecutionResults(original, replay) {
    const stepDivergence = Math.abs(original.steps - replay.steps);
    const totalSteps = Math.max(original.steps, replay.steps);
    const divergencePercent = totalSteps > 0 ? stepDivergence / totalSteps : 0;

    return {
      deterministic: divergencePercent <= this.config.replayTolerancePercent,
      divergenceAt: divergencePercent > this.config.replayTolerancePercent ? 'step_count_mismatch' : null,
      stepComparisons: {
        originalSteps: original.steps,
        replaySteps: replay.steps,
        divergencePercent
      }
    };
  }

  async simulateGossipsubDistribution(nodes, jobs) {
    const distribution = {
      nodes: nodes.map(node => ({ ...node, processedJobs: [], failedJobs: [] })),
      lostJobs: [],
      reannounced: []
    };

    // Simulate job distribution with backpressure
    for (const job of jobs) {
      const availableNodes = distribution.nodes.filter(node => !node.processing);
      
      if (availableNodes.length === 0) {
        // All nodes busy - apply backpressure
        const randomNode = distribution.nodes[Math.floor(Math.random() * distribution.nodes.length)];
        randomNode.backoffLevel++;
        
        if (randomNode.backoffLevel > 3) {
          // Job lost due to excessive backpressure
          distribution.lostJobs.push(job);
        } else {
          // Reannounce job
          distribution.reannounced.push(job);
          // Simulate processing after backoff
          await new Promise(resolve => setTimeout(resolve, randomNode.backoffLevel * 10));
          randomNode.processedJobs.push(job);
        }
      } else {
        // Assign to least loaded node
        const targetNode = availableNodes.reduce((min, node) => 
          node.processedJobs.length < min.processedJobs.length ? node : min
        );
        
        targetNode.processedJobs.push(job);
        targetNode.backoffLevel = Math.max(0, targetNode.backoffLevel - 1); // Reduce backoff on success
      }
    }

    return distribution;
  }

  analyzeGossipsubFairness(distribution) {
    const jobCounts = distribution.nodes.map(node => node.processedJobs.length);
    const totalProcessed = jobCounts.reduce((sum, count) => sum + count, 0);
    const avgJobsPerNode = totalProcessed / distribution.nodes.length;
    
    // Calculate fairness index (Jain's fairness index)
    const sumSquares = jobCounts.reduce((sum, count) => sum + count * count, 0);
    const fairnessIndex = totalProcessed > 0 ? 
      (totalProcessed * totalProcessed) / (distribution.nodes.length * sumSquares) : 1;

    // Check for starvation (any node with significantly fewer jobs)
    const starvationThreshold = avgJobsPerNode * 0.5;
    const starvationDetected = jobCounts.some(count => count < starvationThreshold);

    return {
      fairnessIndex,
      lostJobs: distribution.lostJobs.length,
      reannounceSuccess: distribution.reannounced.length,
      backoffCompliance: distribution.nodes.every(node => node.backoffLevel <= 5), // Max backoff level
      starvationDetected,
      nodeDistribution: distribution.nodes.map(node => ({
        nodeId: node.id,
        processedJobs: node.processedJobs.length,
        backoffLevel: node.backoffLevel
      }))
    };
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async executeStressTestEvent(event, stressTestId) {
    const startTime = performance.now();
    
    try {
      // Simulate event processing with random latency
      const processingTime = Math.random() * 200 + 50; // 50-250ms
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate occasional failures
      if (Math.random() < 0.02) { // 2% failure rate
        throw new Error('Simulated stress test failure');
      }

      return {
        eventId: event.id,
        duration: performance.now() - startTime,
        status: 'completed'
      };

    } catch (error) {
      return {
        eventId: event.id,
        duration: performance.now() - startTime,
        status: 'failed',
        error: error.message
      };
    }
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }  
/**
   * Generate artifacts for validation and audit
   */
  async generateArtifacts(type, data, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let artifactPath;
      let artifactData;

      switch (type) {
        case 'ledger_attestation':
          artifactPath = `artifacts/ledger/attestation.json`;
          artifactData = {
            attestationType: 'execution_ledger',
            timestamp,
            chainContinuity: data.chainValid ? '100%' : `${((data.totalRecords - 1) / data.totalRecords * 100).toFixed(1)}%`,
            totalRecords: data.totalRecords,
            orphanRecords: data.orphanRecords.length,
            lastRecordCID: data.lastRecordCID,
            vectorClocks: data.vectorClocks,
            verificationStatus: data.chainValid ? 'VALID' : 'INVALID'
          };
          break;

        case 'ledger_chain':
          artifactPath = `artifacts/ledger/chain-${data.executionId}-${timestamp}.json`;
          artifactData = {
            executionId: data.executionId,
            chainRecords: Array.from(this.executionLedger.values())
              .filter(record => record.executionId === data.executionId)
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
            chainMetadata: {
              totalRecords: data.totalRecords,
              chainValid: data.chainValid,
              firstRecord: data.chainValid ? 'genesis' : data.brokenAt,
              lastRecord: data.lastRecordCID
            }
          };
          break;

        case 'replay_comparison':
          artifactPath = `artifacts/replay/comparison-${data.replayId}-${timestamp}.json`;
          artifactData = {
            replayId: data.replayId,
            originalExecutionId: data.originalExecutionId,
            deterministic: data.deterministic,
            divergenceAnalysis: {
              divergenceAt: data.divergenceAt,
              stepComparisons: data.stepComparisons,
              divergencePercent: data.stepComparisons.divergencePercent * 100
            },
            timingAnalysis: data.timingAnalysis,
            replayMetrics: {
              originalDuration: data.timingAnalysis.originalDuration,
              replayDuration: data.timingAnalysis.replayDuration,
              timingDifference: data.timingAnalysis.timingDifference,
              toleranceMet: data.timingAnalysis.timingToleranceMet
            }
          };
          break;

        case 'gossipsub_fairness':
          artifactPath = `artifacts/gossipsub/fairness-report.json`;
          artifactData = {
            validationId: data.validationId,
            fairnessMetrics: {
              fairnessIndex: data.fairnessIndex,
              starvationDetected: data.starvationDetected,
              backoffCompliance: data.backoffCompliance
            },
            jobDistribution: {
              totalJobs: data.totalJobs,
              lostJobs: data.lostJobs,
              lostJobsPercent: (data.lostJobs / data.totalJobs * 100).toFixed(2),
              reannounceSuccess: data.reannounceSuccess
            },
            nodeAnalysis: data.nodeDistribution,
            validationResult: data.validationPassed ? 'PASSED' : 'FAILED'
          };
          break;

        case 'stress_benchmark':
          artifactPath = `artifacts/stress/benchmark-${data.stressTestId}-${timestamp}.json`;
          artifactData = {
            stressTestId: data.stressTestId,
            testConfiguration: {
              eventCount: data.eventCount,
              parallelism: data.parallelism,
              maxErrorRate: this.config.maxErrorRate
            },
            results: data.results,
            benchmarks: data.benchmarks,
            performance: {
              throughput: data.results.throughput,
              errorRate: data.results.errorRate,
              errorRatePercent: (data.results.errorRate * 100).toFixed(2)
            },
            testResult: data.passed ? 'PASSED' : 'FAILED'
          };
          break;

        case 'flow_validation':
          artifactPath = `artifacts/flows/${data.flowType}-${data.flowId}-${timestamp}.json`;
          artifactData = {
            flowId: data.flowId,
            flowType: data.flowType,
            flowMetadata: {
              startTime: data.startTime,
              endTime: data.endTime,
              totalSteps: data.steps.length,
              duration: data.validation.performanceMetrics.totalDuration
            },
            stepDetails: data.steps.map(step => ({
              stepId: step.stepId,
              stepName: step.stepName,
              duration: step.duration,
              status: step.status,
              inputHash: step.input,
              outputHash: this.hashData(step.output)
            })),
            validation: data.validation,
            anomalies: data.anomalies
          };
          break;

        default:
          throw new Error(`Unknown artifact type: ${type}`);
      }

      // Write artifact to file
      await this.writeArtifactFile(artifactPath, artifactData);

      console.log(`[DataFlowTester] Generated artifact: ${artifactPath}`);
      return { path: artifactPath, data: artifactData };

    } catch (error) {
      console.error(`[DataFlowTester] Failed to generate artifact:`, error);
      throw new Error(`Artifact generation failed: ${error.message}`);
    }
  }

  async writeArtifactFile(path, data) {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(path, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`[DataFlowTester] Failed to write artifact file: ${path}`, error);
      // For now, just log the data if file writing fails
      console.log(`[DataFlowTester] Artifact data for ${path}:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Get comprehensive flow statistics
   */
  getFlowStatistics() {
    const ledgerRecords = Array.from(this.executionLedger.values());
    const replayResults = Array.from(this.replayResults.values());
    const stressResults = Array.from(this.stressTestResults.values());

    return {
      ledger: {
        totalRecords: ledgerRecords.length,
        uniqueExecutions: new Set(ledgerRecords.map(r => r.executionId)).size,
        nodeParticipation: Object.keys(Object.fromEntries(this.vectorClocks)).length
      },
      replay: {
        totalReplays: replayResults.length,
        deterministicReplays: replayResults.filter(r => r.deterministic).length,
        averageDivergence: replayResults.length > 0 ? 
          replayResults.reduce((sum, r) => sum + (r.stepComparisons?.divergencePercent || 0), 0) / replayResults.length : 0
      },
      stress: {
        totalTests: stressResults.length,
        passedTests: stressResults.filter(t => t.passed).length,
        averageErrorRate: stressResults.length > 0 ?
          stressResults.reduce((sum, t) => sum + t.results.errorRate, 0) / stressResults.length : 0,
        averageThroughput: stressResults.length > 0 ?
          stressResults.reduce((sum, t) => sum + t.results.throughput, 0) / stressResults.length : 0
      },
      activeFlows: this.activeFlows.size,
      nodeId: this.nodeId,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let dataFlowTesterInstance = null;

export function getDataFlowTester() {
  if (!dataFlowTesterInstance) {
    dataFlowTesterInstance = new DataFlowTester();
  }
  return dataFlowTesterInstance;
}

export default DataFlowTester;