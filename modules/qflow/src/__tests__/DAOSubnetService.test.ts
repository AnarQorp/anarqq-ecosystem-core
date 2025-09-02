/**
 * DAO Subnet Service Tests
 * 
 * Unit tests for DAO subnet isolation and governance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daoSubnetService, DAOSubnetService, DAOExecutionContext } from '../governance/DAOSubnetService.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

describe('DAOSubnetService', () => {
  let subnetService: DAOSubnetService;
  let eventSpy: any;

  beforeEach(() => {
    subnetService = new DAOSubnetService();
    eventSpy = vi.spyOn(qflowEventEmitter, 'emit');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DAO Subnet Registration', () => {
    it('should register new DAO subnet successfully', async () => {
      const createdBy = 'squid:user:alice';
      const subnetData = {
        name: 'Test DAO Subnet',
        description: 'Test subnet for unit tests'
      };
      
      const subnet = await subnetService.registerDAOSubnet(subnetData, createdBy);
      
      expect(subnet.name).toBe(subnetData.name);
      expect(subnet.description).toBe(subnetData.description);
      expect(subnet.validators).toHaveLength(1);
      expect(subnet.validators[0].identityId).toBe(createdBy);
      expect(subnet.validators[0].role).toBe('admin');
      expect(subnet.policies).toHaveLength(2); // Default policies
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.subnet.registered.v1', expect.any(Object));
    });

    it('should create default policies on registration', async () => {
      const createdBy = 'squid:user:bob';
      const subnet = await subnetService.registerDAOSubnet({}, createdBy);
      
      expect(subnet.policies).toHaveLength(2);
      expect(subnet.policies.some(p => p.type === 'execution')).toBe(true);
      expect(subnet.policies.some(p => p.type === 'resource')).toBe(true);
      expect(subnet.policies.every(p => p.enforcement === 'strict')).toBe(true);
    });

    it('should set default resource limits', async () => {
      const createdBy = 'squid:user:charlie';
      const subnet = await subnetService.registerDAOSubnet({}, createdBy);
      
      expect(subnet.resourceLimits.maxConcurrentExecutions).toBe(10);
      expect(subnet.resourceLimits.maxExecutionTime).toBe(3600);
      expect(subnet.resourceLimits.maxMemoryPerExecution).toBe(512);
      expect(subnet.resourceLimits.maxCpuPerExecution).toBe(2);
    });
  });

  describe('Policy Validation', () => {
    it('should validate execution against DAO policies', async () => {
      const createdBy = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Policy Test Subnet'
      }, createdBy);

      const executionContext: DAOExecutionContext = {
        triggeredBy: createdBy,
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: ['qflow:execute'],
        daoSubnet: subnet.id,
        isolationLevel: 'standard',
        resourceAllocation: { cpu: 1, memory: 128, storage: 10, network: 1 },
        governanceApprovals: [],
        policyValidations: []
      };

      const validations = await subnetService.validateDAOExecution('test-flow', executionContext);
      
      expect(validations).toHaveLength(2); // Two default policies
      expect(validations.every(v => v.result === 'pass')).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.validation.completed.v1', expect.any(Object));
    });

    it('should fail validation for non-existent subnet', async () => {
      const executionContext: DAOExecutionContext = {
        triggeredBy: 'squid:user:alice',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: ['qflow:execute'],
        daoSubnet: 'non-existent-subnet',
        isolationLevel: 'standard',
        resourceAllocation: { cpu: 1, memory: 128, storage: 10, network: 1 },
        governanceApprovals: [],
        policyValidations: []
      };

      const validations = await subnetService.validateDAOExecution('test-flow', executionContext);
      
      expect(validations).toHaveLength(1);
      expect(validations[0].result).toBe('fail');
      expect(validations[0].message).toContain('not found');
    });
  });

  describe('Resource Management', () => {
    it('should allocate resources successfully', async () => {
      const createdBy = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Resource Test Subnet'
      }, createdBy);

      const requestedResources = {
        cpu: 1,
        memory: 256,
        storage: 20,
        network: 2
      };

      const allocation = await subnetService.allocateResources(subnet.id, requestedResources);
      
      expect(allocation.allocated).toBe(true);
      expect(allocation.allocation).toEqual(requestedResources);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.resources.allocated.v1', expect.any(Object));
    });

    it('should reject allocation when limits exceeded', async () => {
      const createdBy = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Limit Test Subnet',
        resourceLimits: {
          maxConcurrentExecutions: 1,
          maxExecutionTime: 3600,
          maxMemoryPerExecution: 128,
          maxCpuPerExecution: 1,
          maxStoragePerFlow: 10,
          maxNetworkBandwidth: 1,
          dailyExecutionLimit: 100,
          monthlyResourceBudget: 1000
        }
      }, createdBy);

      // First allocation should succeed
      const firstAllocation = await subnetService.allocateResources(subnet.id, {
        cpu: 1, memory: 128, storage: 10, network: 1
      });
      expect(firstAllocation.allocated).toBe(true);

      // Second allocation should fail due to concurrent execution limit
      const secondAllocation = await subnetService.allocateResources(subnet.id, {
        cpu: 1, memory: 128, storage: 10, network: 1
      });
      expect(secondAllocation.allocated).toBe(false);
      expect(secondAllocation.reason).toContain('Maximum concurrent executions reached');
    });

    it('should release resources correctly', async () => {
      const createdBy = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Release Test Subnet'
      }, createdBy);

      const resources = { cpu: 1, memory: 256, storage: 20, network: 2 };

      // Allocate resources
      await subnetService.allocateResources(subnet.id, resources);

      // Release resources
      await subnetService.releaseResources(subnet.id, resources);

      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.resources.released.v1', expect.any(Object));
    });
  });

  describe('Validator Management', () => {
    it('should add validator successfully', async () => {
      const admin = 'squid:user:alice';
      const newValidator = 'squid:user:bob';
      
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Validator Test Subnet'
      }, admin);

      const success = await subnetService.addValidator(subnet.id, {
        identityId: newValidator,
        publicKey: 'pk_bob_123',
        weight: 50,
        role: 'validator',
        active: true
      }, admin);

      expect(success).toBe(true);
      
      const updatedSubnet = await subnetService.getDAOSubnet(subnet.id);
      expect(updatedSubnet?.validators).toHaveLength(2);
      expect(updatedSubnet?.validators.some(v => v.identityId === newValidator)).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.validator.added.v1', expect.any(Object));
    });

    it('should prevent non-admin from adding validators', async () => {
      const admin = 'squid:user:alice';
      const nonAdmin = 'squid:user:bob';
      const newValidator = 'squid:user:charlie';
      
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Admin Test Subnet'
      }, admin);

      const success = await subnetService.addValidator(subnet.id, {
        identityId: newValidator,
        publicKey: 'pk_charlie_123',
        weight: 50,
        role: 'validator',
        active: true
      }, nonAdmin);

      expect(success).toBe(false);
    });

    it('should prevent duplicate validators', async () => {
      const admin = 'squid:user:alice';
      
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Duplicate Test Subnet'
      }, admin);

      // Try to add the admin again as a validator
      const success = await subnetService.addValidator(subnet.id, {
        identityId: admin,
        publicKey: 'pk_alice_duplicate',
        weight: 100,
        role: 'validator',
        active: true
      }, admin);

      expect(success).toBe(false);
    });
  });

  describe('Governance Proposals', () => {
    it('should create governance proposal successfully', async () => {
      const admin = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Governance Test Subnet'
      }, admin);

      const proposalId = await subnetService.createProposal(subnet.id, {
        type: 'policy_update',
        title: 'Update Execution Policy',
        description: 'Increase execution time limit',
        votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        requiredQuorum: 50,
        requiredMajority: 60,
        executionData: { newTimeLimit: 7200 }
      }, admin);

      expect(proposalId).toBeDefined();
      expect(proposalId).toMatch(/^prop_/);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.proposal.created.v1', expect.any(Object));
    });

    it('should prevent non-validator from creating proposals', async () => {
      const admin = 'squid:user:alice';
      const nonValidator = 'squid:user:bob';
      
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Proposal Auth Test Subnet'
      }, admin);

      const proposalId = await subnetService.createProposal(subnet.id, {
        type: 'policy_update',
        title: 'Unauthorized Proposal',
        description: 'This should fail',
        votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requiredQuorum: 50,
        requiredMajority: 60
      }, nonValidator);

      expect(proposalId).toBeNull();
    });

    it('should vote on proposal successfully', async () => {
      const admin = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Voting Test Subnet'
      }, admin);

      const proposalId = await subnetService.createProposal(subnet.id, {
        type: 'policy_update',
        title: 'Test Proposal',
        description: 'Test voting',
        votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requiredQuorum: 50,
        requiredMajority: 60
      }, admin);

      expect(proposalId).toBeDefined();

      const success = await subnetService.voteOnProposal(proposalId!, {
        vote: 'approve',
        signature: 'vote_signature_123',
        reason: 'Good proposal'
      }, admin);

      expect(success).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.dao.vote.cast.v1', expect.any(Object));
    });

    it('should prevent duplicate voting', async () => {
      const admin = 'squid:user:alice';
      const subnet = await subnetService.registerDAOSubnet({
        name: 'Duplicate Vote Test Subnet'
      }, admin);

      const proposalId = await subnetService.createProposal(subnet.id, {
        type: 'policy_update',
        title: 'Duplicate Vote Test',
        description: 'Test duplicate voting prevention',
        votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requiredQuorum: 50,
        requiredMajority: 60
      }, admin);

      expect(proposalId).toBeDefined();

      // First vote should succeed
      const firstVote = await subnetService.voteOnProposal(proposalId!, {
        vote: 'approve',
        signature: 'vote_signature_1',
        reason: 'First vote'
      }, admin);
      expect(firstVote).toBe(true);

      // Second vote should fail
      const secondVote = await subnetService.voteOnProposal(proposalId!, {
        vote: 'reject',
        signature: 'vote_signature_2',
        reason: 'Second vote'
      }, admin);
      expect(secondVote).toBe(false);
    });
  });

  describe('Subnet Discovery', () => {
    it('should list accessible subnets for validator', async () => {
      const validator = 'squid:user:alice';
      
      const subnet1 = await subnetService.registerDAOSubnet({
        name: 'Accessible Subnet 1'
      }, validator);

      const subnet2 = await subnetService.registerDAOSubnet({
        name: 'Accessible Subnet 2'
      }, validator);

      const accessibleSubnets = await subnetService.listAccessibleSubnets(validator);
      
      expect(accessibleSubnets).toHaveLength(2);
      expect(accessibleSubnets.some(s => s.id === subnet1.id)).toBe(true);
      expect(accessibleSubnets.some(s => s.id === subnet2.id)).toBe(true);
    });

    it('should return empty list for non-validator', async () => {
      const admin = 'squid:user:alice';
      const nonValidator = 'squid:user:bob';
      
      await subnetService.registerDAOSubnet({
        name: 'Private Subnet'
      }, admin);

      const accessibleSubnets = await subnetService.listAccessibleSubnets(nonValidator);
      
      expect(accessibleSubnets).toHaveLength(0);
    });
  });

  describe('Default Subnet', () => {
    it('should have default public subnet available', async () => {
      const defaultSubnet = await subnetService.getDAOSubnet('dao.public.default');
      
      expect(defaultSubnet).toBeDefined();
      expect(defaultSubnet?.name).toBe('Public Default Subnet');
      expect(defaultSubnet?.isolation.crossSubnetAccess).toBe('full');
      expect(defaultSubnet?.isolation.networkIsolation).toBe(false);
    });
  });
});