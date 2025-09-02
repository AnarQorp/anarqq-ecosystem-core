/**
 * Flow Ownership Service Tests
 * 
 * Unit tests for flow ownership and permissions management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flowOwnershipService, FlowOwnershipService } from '../auth/FlowOwnershipService.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

describe('FlowOwnershipService', () => {
  let ownershipService: FlowOwnershipService;
  let eventSpy: any;

  beforeEach(() => {
    ownershipService = new FlowOwnershipService();
    eventSpy = vi.spyOn(qflowEventEmitter, 'emit');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Flow Ownership Registration', () => {
    it('should register flow ownership successfully', async () => {
      const flowId = 'flow_test_123';
      const owner = 'squid:user:alice';
      
      const ownership = await ownershipService.registerFlowOwnership(flowId, owner);
      
      expect(ownership.flowId).toBe(flowId);
      expect(ownership.owner).toBe(owner);
      expect(ownership.created).toBeDefined();
      expect(ownership.transferHistory).toEqual([]);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.ownership.registered.v1', expect.any(Object));
    });

    it('should create default sharing policy on registration', async () => {
      const flowId = 'flow_test_456';
      const owner = 'squid:user:bob';
      
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Check that owner has all permissions
      const hasRead = await ownershipService.hasPermission(owner, flowId, 'read');
      const hasWrite = await ownershipService.hasPermission(owner, flowId, 'modify');
      const hasDelete = await ownershipService.hasPermission(owner, flowId, 'delete');
      
      expect(hasRead).toBe(true);
      expect(hasWrite).toBe(true);
      expect(hasDelete).toBe(true);
    });
  });

  describe('Ownership Transfer', () => {
    it('should transfer ownership successfully', async () => {
      const flowId = 'flow_transfer_123';
      const currentOwner = 'squid:user:alice';
      const newOwner = 'squid:user:bob';
      const reason = 'Project handover';
      const signature = 'valid_signature_123';
      
      // Register initial ownership
      await ownershipService.registerFlowOwnership(flowId, currentOwner);
      
      // Transfer ownership
      const success = await ownershipService.transferFlowOwnership(
        flowId, currentOwner, newOwner, reason, signature
      );
      
      expect(success).toBe(true);
      
      // Verify new ownership
      const isNewOwner = await ownershipService.isFlowOwner(flowId, newOwner);
      const isOldOwner = await ownershipService.isFlowOwner(flowId, currentOwner);
      
      expect(isNewOwner).toBe(true);
      expect(isOldOwner).toBe(false);
      
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.ownership.transferred.v1', expect.any(Object));
    });

    it('should fail transfer with invalid current owner', async () => {
      const flowId = 'flow_transfer_456';
      const currentOwner = 'squid:user:alice';
      const fakeOwner = 'squid:user:fake';
      const newOwner = 'squid:user:bob';
      const reason = 'Invalid transfer';
      const signature = 'valid_signature_456';
      
      // Register initial ownership
      await ownershipService.registerFlowOwnership(flowId, currentOwner);
      
      // Try to transfer with wrong current owner
      const success = await ownershipService.transferFlowOwnership(
        flowId, fakeOwner, newOwner, reason, signature
      );
      
      expect(success).toBe(false);
      
      // Verify ownership unchanged
      const isOriginalOwner = await ownershipService.isFlowOwner(flowId, currentOwner);
      expect(isOriginalOwner).toBe(true);
    });
  });

  describe('Permission Management', () => {
    it('should grant permission successfully', async () => {
      const flowId = 'flow_perm_123';
      const owner = 'squid:user:alice';
      const grantee = 'squid:user:bob';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Grant read permission
      const success = await ownershipService.grantPermission(
        flowId, owner, grantee, 'read'
      );
      
      expect(success).toBe(true);
      
      // Verify permission
      const hasPermission = await ownershipService.hasPermission(grantee, flowId, 'read');
      expect(hasPermission).toBe(true);
      
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.permission.granted.v1', expect.any(Object));
    });

    it('should revoke permission successfully', async () => {
      const flowId = 'flow_perm_456';
      const owner = 'squid:user:alice';
      const grantee = 'squid:user:bob';
      
      // Register ownership and grant permission
      await ownershipService.registerFlowOwnership(flowId, owner);
      await ownershipService.grantPermission(flowId, owner, grantee, 'read');
      
      // Verify permission exists
      let hasPermission = await ownershipService.hasPermission(grantee, flowId, 'read');
      expect(hasPermission).toBe(true);
      
      // Revoke permission
      const success = await ownershipService.revokePermission(flowId, owner, grantee, 'read');
      expect(success).toBe(true);
      
      // Verify permission revoked
      hasPermission = await ownershipService.hasPermission(grantee, flowId, 'read');
      expect(hasPermission).toBe(false);
      
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.permission.revoked.v1', expect.any(Object));
    });

    it('should handle permission expiration', async () => {
      const flowId = 'flow_perm_expire';
      const owner = 'squid:user:alice';
      const grantee = 'squid:user:bob';
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Grant expired permission
      await ownershipService.grantPermission(flowId, owner, grantee, 'read', pastDate);
      
      // Verify permission is not effective due to expiration
      const hasPermission = await ownershipService.hasPermission(grantee, flowId, 'read');
      expect(hasPermission).toBe(false);
    });
  });

  describe('Access Requests', () => {
    it('should create access request successfully', async () => {
      const flowId = 'flow_request_123';
      const owner = 'squid:user:alice';
      const requester = 'squid:user:bob';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Request access
      const requestId = await ownershipService.requestAccess(
        flowId, requester, ['read', 'execute'], 'Need access for testing'
      );
      
      expect(requestId).toBeDefined();
      expect(requestId).toMatch(/^req_/);
      
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.access.requested.v1', expect.any(Object));
    });

    it('should review access request successfully', async () => {
      const flowId = 'flow_request_456';
      const owner = 'squid:user:alice';
      const requester = 'squid:user:bob';
      
      // Register ownership and request access
      await ownershipService.registerFlowOwnership(flowId, owner);
      const requestId = await ownershipService.requestAccess(
        flowId, requester, ['read'], 'Need read access'
      );
      
      expect(requestId).toBeDefined();
      
      // Approve request
      const success = await ownershipService.reviewAccessRequest(
        requestId!, 'approved', owner, 'Approved for testing'
      );
      
      expect(success).toBe(true);
      
      // Verify permission was granted
      const hasPermission = await ownershipService.hasPermission(requester, flowId, 'read');
      expect(hasPermission).toBe(true);
      
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.access.reviewed.v1', expect.any(Object));
    });
  });

  describe('Flow Discovery', () => {
    it('should get owned flows correctly', async () => {
      const owner = 'squid:user:alice';
      const flow1 = 'flow_owned_1';
      const flow2 = 'flow_owned_2';
      
      // Register multiple flows
      await ownershipService.registerFlowOwnership(flow1, owner);
      await ownershipService.registerFlowOwnership(flow2, owner);
      
      // Get owned flows
      const ownedFlows = await ownershipService.getOwnedFlows(owner);
      
      expect(ownedFlows).toContain(flow1);
      expect(ownedFlows).toContain(flow2);
      expect(ownedFlows).toHaveLength(2);
    });

    it('should get accessible flows correctly', async () => {
      const owner = 'squid:user:alice';
      const user = 'squid:user:bob';
      const flow1 = 'flow_accessible_1';
      const flow2 = 'flow_accessible_2';
      const flow3 = 'flow_not_accessible';
      
      // Register flows
      await ownershipService.registerFlowOwnership(flow1, owner);
      await ownershipService.registerFlowOwnership(flow2, owner);
      await ownershipService.registerFlowOwnership(flow3, owner);
      
      // Grant access to some flows
      await ownershipService.grantPermission(flow1, owner, user, 'read');
      await ownershipService.grantPermission(flow2, owner, user, 'execute');
      
      // Get accessible flows
      const accessibleFlows = await ownershipService.getAccessibleFlows(user, 'read');
      
      expect(accessibleFlows).toContain(flow1);
      expect(accessibleFlows).not.toContain(flow3);
    });
  });

  describe('Sharing Policy', () => {
    it('should update sharing policy successfully', async () => {
      const flowId = 'flow_policy_123';
      const owner = 'squid:user:alice';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Update sharing policy
      const success = await ownershipService.updateSharingPolicy(flowId, owner, {
        visibility: 'public',
        autoApprove: ['read', 'execute']
      });
      
      expect(success).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('q.qflow.policy.updated.v1', expect.any(Object));
    });

    it('should prevent non-owner from updating policy', async () => {
      const flowId = 'flow_policy_456';
      const owner = 'squid:user:alice';
      const nonOwner = 'squid:user:bob';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Try to update policy as non-owner
      const success = await ownershipService.updateSharingPolicy(flowId, nonOwner, {
        visibility: 'public'
      });
      
      expect(success).toBe(false);
    });
  });

  describe('Permission Conditions', () => {
    it('should evaluate time range conditions correctly', async () => {
      const flowId = 'flow_conditions_123';
      const owner = 'squid:user:alice';
      const grantee = 'squid:user:bob';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Grant permission with future time range
      const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      const futureEnd = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
      
      await ownershipService.grantPermission(flowId, owner, grantee, 'read', undefined, [
        {
          type: 'time_range',
          value: { start: futureStart, end: futureEnd }
        }
      ]);
      
      // Permission should not be effective yet
      const hasPermission = await ownershipService.hasPermission(grantee, flowId, 'read');
      expect(hasPermission).toBe(false);
    });

    it('should evaluate DAO subnet conditions correctly', async () => {
      const flowId = 'flow_conditions_456';
      const owner = 'squid:user:alice';
      const grantee = 'squid:user:bob';
      const daoSubnet = 'dao.test.subnet';
      
      // Register ownership
      await ownershipService.registerFlowOwnership(flowId, owner);
      
      // Grant permission with DAO subnet condition
      await ownershipService.grantPermission(flowId, owner, grantee, 'read', undefined, [
        {
          type: 'dao_subnet',
          value: daoSubnet
        }
      ]);
      
      // Permission should work with correct DAO subnet
      const hasPermissionWithDAO = await ownershipService.hasPermission(
        grantee, flowId, 'read', { daoSubnet }
      );
      expect(hasPermissionWithDAO).toBe(true);
      
      // Permission should not work with different DAO subnet
      const hasPermissionWithoutDAO = await ownershipService.hasPermission(
        grantee, flowId, 'read', { daoSubnet: 'different.dao' }
      );
      expect(hasPermissionWithoutDAO).toBe(false);
    });
  });
});