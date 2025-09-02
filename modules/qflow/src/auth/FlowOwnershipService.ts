/**
 * Flow Ownership and Permissions Service
 * 
 * Manages flow ownership, sharing, and identity-based access controls
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { squidIdentityService, SquidIdentity } from './SquidIdentityService.js';
import { FlowDefinition } from '../models/FlowDefinition.js';

export interface FlowOwnership {
  flowId: string;
  owner: string; // sQuid identity ID
  created: string;
  lastModified: string;
  transferHistory: FlowTransfer[];
}

export interface FlowTransfer {
  id: string;
  fromOwner: string;
  toOwner: string;
  timestamp: string;
  reason: string;
  signature: string;
}

export interface FlowPermission {
  flowId: string;
  grantedTo: string; // sQuid identity ID or pattern
  permission: FlowPermissionType;
  grantedBy: string; // Owner identity
  grantedAt: string;
  expiresAt?: string;
  conditions?: FlowPermissionCondition[];
}

export type FlowPermissionType = 
  | 'read' 
  | 'execute' 
  | 'modify' 
  | 'share' 
  | 'transfer' 
  | 'delete'
  | 'admin';

export interface FlowPermissionCondition {
  type: 'time_range' | 'execution_limit' | 'dao_subnet' | 'custom';
  value: any;
  metadata?: Record<string, any>;
}

export interface FlowAccessRequest {
  id: string;
  flowId: string;
  requestedBy: string;
  requestedPermissions: FlowPermissionType[];
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface FlowSharingPolicy {
  flowId: string;
  owner: string;
  visibility: 'private' | 'dao' | 'public' | 'whitelist';
  autoApprove: FlowPermissionType[];
  requireApproval: FlowPermissionType[];
  daoSubnet?: string;
  whitelist?: string[];
  blacklist?: string[];
  defaultExpiration?: string; // ISO duration
}

export class FlowOwnershipService extends EventEmitter {
  private ownershipCache = new Map<string, FlowOwnership>();
  private permissionsCache = new Map<string, FlowPermission[]>();
  private sharingPoliciesCache = new Map<string, FlowSharingPolicy>();
  private accessRequestsCache = new Map<string, FlowAccessRequest[]>();
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Register flow ownership
   */
  async registerFlowOwnership(
    flowId: string, 
    owner: string, 
    flowDefinition?: FlowDefinition
  ): Promise<FlowOwnership> {
    try {
      // Validate owner identity
      const ownerIdentity = await squidIdentityService.getIdentity(owner);
      if (!ownerIdentity) {
        throw new Error(`Owner identity ${owner} not found`);
      }

      const ownership: FlowOwnership = {
        flowId,
        owner,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        transferHistory: []
      };

      // Store ownership (in production, this would be persisted)
      this.ownershipCache.set(flowId, ownership);
      setTimeout(() => this.ownershipCache.delete(flowId), this.cacheExpiry);

      // Create default sharing policy
      const defaultPolicy: FlowSharingPolicy = {
        flowId,
        owner,
        visibility: flowDefinition?.metadata?.visibility || 'private',
        autoApprove: ['read'],
        requireApproval: ['execute', 'modify', 'share', 'transfer', 'delete'],
        daoSubnet: flowDefinition?.metadata?.daoSubnet,
        defaultExpiration: 'P30D' // 30 days
      };

      this.sharingPoliciesCache.set(flowId, defaultPolicy);

      // Emit ownership registration event
      qflowEventEmitter.emit('q.qflow.ownership.registered.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: owner,
        data: {
          flowId,
          owner,
          visibility: defaultPolicy.visibility,
          daoSubnet: defaultPolicy.daoSubnet
        }
      });

      return ownership;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to register ownership: ${error}`);
      throw error;
    }
  }

  /**
   * Transfer flow ownership
   */
  async transferFlowOwnership(
    flowId: string,
    currentOwner: string,
    newOwner: string,
    reason: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Validate current ownership
      const ownership = await this.getFlowOwnership(flowId);
      if (!ownership || ownership.owner !== currentOwner) {
        throw new Error('Invalid current owner or flow not found');
      }

      // Validate new owner identity
      const newOwnerIdentity = await squidIdentityService.getIdentity(newOwner);
      if (!newOwnerIdentity) {
        throw new Error(`New owner identity ${newOwner} not found`);
      }

      // Validate signature (in production, would verify cryptographic signature)
      if (!signature || signature.length < 10) {
        throw new Error('Invalid transfer signature');
      }

      // Create transfer record
      const transfer: FlowTransfer = {
        id: `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        fromOwner: currentOwner,
        toOwner: newOwner,
        timestamp: new Date().toISOString(),
        reason,
        signature
      };

      // Update ownership
      const updatedOwnership: FlowOwnership = {
        ...ownership,
        owner: newOwner,
        lastModified: new Date().toISOString(),
        transferHistory: [...ownership.transferHistory, transfer]
      };

      this.ownershipCache.set(flowId, updatedOwnership);

      // Update sharing policy owner
      const policy = this.sharingPoliciesCache.get(flowId);
      if (policy) {
        this.sharingPoliciesCache.set(flowId, {
          ...policy,
          owner: newOwner
        });
      }

      // Clear permissions cache to force refresh
      this.permissionsCache.delete(flowId);

      // Emit transfer event
      qflowEventEmitter.emit('q.qflow.ownership.transferred.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: currentOwner,
        data: {
          flowId,
          fromOwner: currentOwner,
          toOwner: newOwner,
          transferId: transfer.id,
          reason
        }
      });

      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to transfer ownership: ${error}`);
      return false;
    }
  }

  /**
   * Grant permission to identity
   */
  async grantPermission(
    flowId: string,
    grantedBy: string,
    grantedTo: string,
    permission: FlowPermissionType,
    expiresAt?: string,
    conditions?: FlowPermissionCondition[]
  ): Promise<boolean> {
    try {
      // Validate granter has permission to grant
      const canGrant = await this.hasPermission(grantedBy, flowId, 'share') ||
                      await this.isFlowOwner(flowId, grantedBy);
      
      if (!canGrant) {
        throw new Error('Insufficient permissions to grant access');
      }

      // Validate grantee identity
      const granteeIdentity = await squidIdentityService.getIdentity(grantedTo);
      if (!granteeIdentity) {
        throw new Error(`Grantee identity ${grantedTo} not found`);
      }

      const newPermission: FlowPermission = {
        flowId,
        grantedTo,
        permission,
        grantedBy,
        grantedAt: new Date().toISOString(),
        expiresAt,
        conditions
      };

      // Get existing permissions
      const existingPermissions = this.permissionsCache.get(flowId) || [];
      
      // Remove any existing permission of the same type for the same identity
      const filteredPermissions = existingPermissions.filter(
        p => !(p.grantedTo === grantedTo && p.permission === permission)
      );

      // Add new permission
      const updatedPermissions = [...filteredPermissions, newPermission];
      this.permissionsCache.set(flowId, updatedPermissions);

      // Emit permission granted event
      qflowEventEmitter.emit('q.qflow.permission.granted.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: grantedBy,
        data: {
          flowId,
          grantedTo,
          permission,
          expiresAt,
          hasConditions: !!conditions?.length
        }
      });

      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to grant permission: ${error}`);
      return false;
    }
  }

  /**
   * Revoke permission from identity
   */
  async revokePermission(
    flowId: string,
    revokedBy: string,
    revokedFrom: string,
    permission: FlowPermissionType
  ): Promise<boolean> {
    try {
      // Validate revoker has permission to revoke
      const canRevoke = await this.hasPermission(revokedBy, flowId, 'share') ||
                       await this.isFlowOwner(flowId, revokedBy) ||
                       revokedBy === revokedFrom; // Can revoke own permissions
      
      if (!canRevoke) {
        throw new Error('Insufficient permissions to revoke access');
      }

      // Get existing permissions
      const existingPermissions = this.permissionsCache.get(flowId) || [];
      
      // Remove the specific permission
      const updatedPermissions = existingPermissions.filter(
        p => !(p.grantedTo === revokedFrom && p.permission === permission)
      );

      this.permissionsCache.set(flowId, updatedPermissions);

      // Emit permission revoked event
      qflowEventEmitter.emit('q.qflow.permission.revoked.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: revokedBy,
        data: {
          flowId,
          revokedFrom,
          permission
        }
      });

      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to revoke permission: ${error}`);
      return false;
    }
  }

  /**
   * Check if identity has specific permission for flow
   */
  async hasPermission(
    identityId: string,
    flowId: string,
    permission: FlowPermissionType,
    context?: { daoSubnet?: string; executionContext?: any }
  ): Promise<boolean> {
    try {
      // Owner has all permissions
      if (await this.isFlowOwner(flowId, identityId)) {
        return true;
      }

      // Check explicit permissions
      const permissions = this.permissionsCache.get(flowId) || [];
      const relevantPermissions = permissions.filter(p => 
        p.grantedTo === identityId && 
        (p.permission === permission || p.permission === 'admin')
      );

      for (const perm of relevantPermissions) {
        // Check expiration
        if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) {
          continue;
        }

        // Check conditions
        if (perm.conditions && !this.evaluateConditions(perm.conditions, context)) {
          continue;
        }

        return true;
      }

      // Check sharing policy for auto-approved permissions
      const policy = this.sharingPoliciesCache.get(flowId);
      if (policy && policy.autoApprove.includes(permission)) {
        // Check visibility rules
        if (policy.visibility === 'public') {
          return true;
        }
        
        if (policy.visibility === 'dao' && context?.daoSubnet === policy.daoSubnet) {
          return true;
        }

        if (policy.visibility === 'whitelist' && policy.whitelist?.includes(identityId)) {
          return true;
        }
      }

      return false;

    } catch (error) {
      console.error(`[FlowOwnership] Permission check failed: ${error}`);
      return false;
    }
  }

  /**
   * Check if identity is flow owner
   */
  async isFlowOwner(flowId: string, identityId: string): Promise<boolean> {
    try {
      const ownership = await this.getFlowOwnership(flowId);
      return ownership?.owner === identityId;
    } catch (error) {
      console.error(`[FlowOwnership] Owner check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get flow ownership information
   */
  async getFlowOwnership(flowId: string): Promise<FlowOwnership | null> {
    try {
      // Check cache first
      const cached = this.ownershipCache.get(flowId);
      if (cached) {
        return cached;
      }

      // In production, would fetch from persistent storage
      // For now, return null if not in cache
      return null;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to get ownership: ${error}`);
      return null;
    }
  }

  /**
   * Get flow permissions
   */
  async getFlowPermissions(flowId: string): Promise<FlowPermission[]> {
    try {
      return this.permissionsCache.get(flowId) || [];
    } catch (error) {
      console.error(`[FlowOwnership] Failed to get permissions: ${error}`);
      return [];
    }
  }

  /**
   * Request access to flow
   */
  async requestAccess(
    flowId: string,
    requestedBy: string,
    requestedPermissions: FlowPermissionType[],
    reason: string
  ): Promise<string | null> {
    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const accessRequest: FlowAccessRequest = {
        id: requestId,
        flowId,
        requestedBy,
        requestedPermissions,
        reason,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Store request
      const existingRequests = this.accessRequestsCache.get(flowId) || [];
      this.accessRequestsCache.set(flowId, [...existingRequests, accessRequest]);

      // Check if auto-approval applies
      const policy = this.sharingPoliciesCache.get(flowId);
      if (policy) {
        const autoApproveAll = requestedPermissions.every(p => policy.autoApprove.includes(p));
        if (autoApproveAll) {
          await this.reviewAccessRequest(requestId, 'approved', 'system', 'Auto-approved by policy');
        }
      }

      // Emit access request event
      qflowEventEmitter.emit('q.qflow.access.requested.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: requestedBy,
        data: {
          requestId,
          flowId,
          requestedPermissions,
          reason
        }
      });

      return requestId;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to request access: ${error}`);
      return null;
    }
  }

  /**
   * Review access request
   */
  async reviewAccessRequest(
    requestId: string,
    decision: 'approved' | 'denied',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    try {
      // Find the request
      let request: FlowAccessRequest | undefined;
      let flowId: string | undefined;

      for (const [fId, requests] of this.accessRequestsCache.entries()) {
        const found = requests.find(r => r.id === requestId);
        if (found) {
          request = found;
          flowId = fId;
          break;
        }
      }

      if (!request || !flowId) {
        throw new Error('Access request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request already reviewed');
      }

      // Validate reviewer has permission
      const canReview = await this.hasPermission(reviewedBy, flowId, 'share') ||
                       await this.isFlowOwner(flowId, reviewedBy);
      
      if (!canReview && reviewedBy !== 'system') {
        throw new Error('Insufficient permissions to review request');
      }

      // Update request
      request.status = decision;
      request.reviewedBy = reviewedBy;
      request.reviewedAt = new Date().toISOString();
      request.reviewNotes = reviewNotes;

      // If approved, grant permissions
      if (decision === 'approved') {
        const policy = this.sharingPoliciesCache.get(flowId);
        const expiresAt = policy?.defaultExpiration ? 
          this.calculateExpiration(policy.defaultExpiration) : undefined;

        for (const permission of request.requestedPermissions) {
          await this.grantPermission(
            flowId,
            reviewedBy,
            request.requestedBy,
            permission,
            expiresAt
          );
        }
      }

      // Emit review event
      qflowEventEmitter.emit('q.qflow.access.reviewed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: reviewedBy,
        data: {
          requestId,
          flowId,
          decision,
          requestedBy: request.requestedBy,
          requestedPermissions: request.requestedPermissions
        }
      });

      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to review access request: ${error}`);
      return false;
    }
  }

  /**
   * Update sharing policy
   */
  async updateSharingPolicy(
    flowId: string,
    updatedBy: string,
    policy: Partial<FlowSharingPolicy>
  ): Promise<boolean> {
    try {
      // Validate updater is owner
      if (!await this.isFlowOwner(flowId, updatedBy)) {
        throw new Error('Only flow owner can update sharing policy');
      }

      const existingPolicy = this.sharingPoliciesCache.get(flowId);
      if (!existingPolicy) {
        throw new Error('Flow sharing policy not found');
      }

      const updatedPolicy: FlowSharingPolicy = {
        ...existingPolicy,
        ...policy,
        flowId, // Ensure flowId cannot be changed
        owner: existingPolicy.owner // Ensure owner cannot be changed via policy update
      };

      this.sharingPoliciesCache.set(flowId, updatedPolicy);

      // Emit policy update event
      qflowEventEmitter.emit('q.qflow.policy.updated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-ownership',
        actor: updatedBy,
        data: {
          flowId,
          visibility: updatedPolicy.visibility,
          autoApprove: updatedPolicy.autoApprove,
          requireApproval: updatedPolicy.requireApproval
        }
      });

      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to update sharing policy: ${error}`);
      return false;
    }
  }

  /**
   * Get flows owned by identity
   */
  async getOwnedFlows(identityId: string): Promise<string[]> {
    try {
      const ownedFlows: string[] = [];
      
      for (const [flowId, ownership] of this.ownershipCache.entries()) {
        if (ownership.owner === identityId) {
          ownedFlows.push(flowId);
        }
      }

      return ownedFlows;

    } catch (error) {
      console.error(`[FlowOwnership] Failed to get owned flows: ${error}`);
      return [];
    }
  }

  /**
   * Get flows accessible by identity
   */
  async getAccessibleFlows(identityId: string, permission: FlowPermissionType = 'read'): Promise<string[]> {
    try {
      const accessibleFlows: string[] = [];
      
      // Check owned flows
      const ownedFlows = await this.getOwnedFlows(identityId);
      accessibleFlows.push(...ownedFlows);

      // Check explicit permissions
      for (const [flowId, permissions] of this.permissionsCache.entries()) {
        if (ownedFlows.includes(flowId)) continue; // Already included

        const hasAccess = await this.hasPermission(identityId, flowId, permission);
        if (hasAccess) {
          accessibleFlows.push(flowId);
        }
      }

      return [...new Set(accessibleFlows)]; // Remove duplicates

    } catch (error) {
      console.error(`[FlowOwnership] Failed to get accessible flows: ${error}`);
      return [];
    }
  }

  /**
   * Clean up expired permissions and requests
   */
  async cleanupExpired(): Promise<void> {
    try {
      const now = new Date();

      // Clean up expired permissions
      for (const [flowId, permissions] of this.permissionsCache.entries()) {
        const validPermissions = permissions.filter(p => 
          !p.expiresAt || new Date(p.expiresAt) > now
        );
        
        if (validPermissions.length !== permissions.length) {
          this.permissionsCache.set(flowId, validPermissions);
        }
      }

      // Clean up old access requests
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      for (const [flowId, requests] of this.accessRequestsCache.entries()) {
        const validRequests = requests.filter(r => 
          new Date(r.requestedAt).getTime() > (now.getTime() - maxAge)
        );
        
        if (validRequests.length !== requests.length) {
          this.accessRequestsCache.set(flowId, validRequests);
        }
      }

    } catch (error) {
      console.error(`[FlowOwnership] Cleanup failed: ${error}`);
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Clean up expired items periodically
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 60 * 1000); // Every hour
  }

  private evaluateConditions(
    conditions: FlowPermissionCondition[],
    context?: { daoSubnet?: string; executionContext?: any }
  ): boolean {
    try {
      for (const condition of conditions) {
        switch (condition.type) {
          case 'time_range':
            if (!this.evaluateTimeRange(condition.value)) {
              return false;
            }
            break;
          
          case 'dao_subnet':
            if (condition.value !== context?.daoSubnet) {
              return false;
            }
            break;
          
          case 'execution_limit':
            // Would need to track execution count
            // For now, assume valid
            break;
          
          case 'custom':
            // Would evaluate custom condition logic
            // For now, assume valid
            break;
        }
      }
      
      return true;

    } catch (error) {
      console.error(`[FlowOwnership] Condition evaluation failed: ${error}`);
      return false;
    }
  }

  private evaluateTimeRange(timeRange: { start: string; end: string }): boolean {
    try {
      const now = new Date();
      const start = new Date(timeRange.start);
      const end = new Date(timeRange.end);
      
      return now >= start && now <= end;

    } catch (error) {
      return false;
    }
  }

  private calculateExpiration(duration: string): string {
    try {
      // Simple ISO duration parsing (P30D = 30 days)
      const match = duration.match(/P(\d+)D/);
      if (match) {
        const days = parseInt(match[1]);
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + days);
        return expiration.toISOString();
      }
      
      // Default to 30 days if parsing fails
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30);
      return expiration.toISOString();

    } catch (error) {
      // Default to 30 days
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30);
      return expiration.toISOString();
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const flowOwnershipService = new FlowOwnershipService();