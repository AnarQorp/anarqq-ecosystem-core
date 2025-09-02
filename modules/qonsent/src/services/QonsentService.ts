import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { EventBus } from '../utils/eventBus';
import { CacheService } from '../utils/cache';
import { AuditService } from './AuditService';
import { UCANPolicyEngine } from './UCANPolicyEngine';
import { PermissionGrant, PermissionCheck, Policy } from '../types';
import { PermissionGrantModel } from '../models/PermissionGrant';
import { PolicyModel } from '../models/Policy';
import { QonsentError, ErrorCodes } from '../utils/errors';

export interface CheckPermissionParams {
  resource: string;
  identity: string;
  action: string;
  context?: Record<string, any>;
}

export interface GrantPermissionParams {
  resource: string;
  identity: string;
  permissions: string[];
  expiresAt?: Date;
  conditions?: Record<string, any>;
  grantedBy: string;
}

export interface RevokePermissionParams {
  resource: string;
  identity: string;
  permissions?: string[];
  revokedBy: string;
  reason?: string;
}

export class QonsentService {
  private eventBus: EventBus;
  private cache: CacheService;
  private audit: AuditService;
  private policyEngine: UCANPolicyEngine;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.cache = CacheService.getInstance();
    this.audit = new AuditService();
    this.policyEngine = new UCANPolicyEngine();
  }

  /**
   * Check if an identity has permission to perform an action on a resource
   */
  async checkPermission(params: CheckPermissionParams): Promise<PermissionCheck> {
    const { resource, identity, action, context = {} } = params;
    const checkId = uuidv4();
    const startTime = Date.now();

    try {
      logger.debug('Checking permission', { checkId, resource, identity, action });

      // Check cache first
      const cacheKey = `permission:${resource}:${identity}:${action}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Permission check cache hit', { checkId, cacheKey });
        return {
          ...cached,
          auditTrail: {
            checkId,
            timestamp: new Date().toISOString(),
            source: 'cache',
          },
        };
      }

      // Check direct grants
      const directGrant = await PermissionGrantModel.findOne({
        resource,
        identity,
        permissions: action,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
        revoked: { $ne: true },
      }).exec();

      if (directGrant) {
        const result: PermissionCheck = {
          allowed: true,
          reason: 'Direct permission grant',
          policy: {
            id: String(directGrant._id),
            name: 'Direct Grant',
            type: 'direct',
          },
          expiresAt: directGrant.expiresAt?.toISOString(),
          auditTrail: {
            checkId,
            timestamp: new Date().toISOString(),
            source: 'database',
          },
        };

        // Cache the result
        await this.cache.set(cacheKey, result, 300); // 5 minutes

        // Audit the check
        await this.audit.logPermissionCheck({
          checkId,
          resource,
          identity,
          action,
          result: 'ALLOWED',
          reason: result.reason,
          responseTime: Date.now() - startTime,
          context,
        });

        return result;
      }

      // Check UCAN policies
      const policyResult = await this.policyEngine.checkPermission({
        resource,
        identity,
        action,
        context,
      });

      if (policyResult.allowed) {
        const result: PermissionCheck = {
          allowed: true,
          reason: policyResult.reason,
          policy: policyResult.policy,
          expiresAt: policyResult.expiresAt,
          conditions: policyResult.conditions,
          auditTrail: {
            checkId,
            timestamp: new Date().toISOString(),
            source: 'policy-engine',
          },
        };

        // Cache the result
        await this.cache.set(cacheKey, result, 300);

        // Audit the check
        await this.audit.logPermissionCheck({
          checkId,
          resource,
          identity,
          action,
          result: 'ALLOWED',
          reason: result.reason,
          responseTime: Date.now() - startTime,
          context,
        });

        return result;
      }

      // Permission denied - deny by default
      const result: PermissionCheck = {
        allowed: false,
        reason: 'No matching permission grants or policies found',
        auditTrail: {
          checkId,
          timestamp: new Date().toISOString(),
          source: 'deny-by-default',
        },
      };

      // Audit the denied check
      await this.audit.logPermissionCheck({
        checkId,
        resource,
        identity,
        action,
        result: 'DENIED',
        reason: result.reason,
        responseTime: Date.now() - startTime,
        context,
      });

      return result;

    } catch (error) {
      logger.error('Error checking permission', { checkId, error, resource, identity, action });
      
      // Audit the error
      await this.audit.logPermissionCheck({
        checkId,
        resource,
        identity,
        action,
        result: 'ERROR',
        reason: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        context,
      });

      throw new QonsentError(
        ErrorCodes.PERMISSION_CHECK_FAILED,
        'Failed to check permission',
        { checkId, resource, identity, action }
      );
    }
  }

  /**
   * Grant permissions to an identity for a resource
   */
  async grantPermission(params: GrantPermissionParams): Promise<PermissionGrant> {
    const { resource, identity, permissions, expiresAt, conditions, grantedBy } = params;
    const grantId = uuidv4();

    try {
      logger.info('Granting permission', { grantId, resource, identity, permissions, grantedBy });

      // Validate permissions
      const validPermissions = ['read', 'write', 'delete', 'admin', 'share', 'execute'];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        throw new QonsentError(
          ErrorCodes.INVALID_PERMISSIONS,
          `Invalid permissions: ${invalidPermissions.join(', ')}`,
          { invalidPermissions }
        );
      }

      // Check if grantor has permission to grant
      const grantorCheck = await this.checkPermission({
        resource,
        identity: grantedBy,
        action: 'admin',
      });

      if (!grantorCheck.allowed) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Grantor does not have admin permission on resource',
          { resource, grantedBy }
        );
      }

      // Create or update grant
      const existingGrant = await PermissionGrantModel.findOne({
        resource,
        identity,
      }).exec();

      let grant: PermissionGrant;

      if (existingGrant) {
        // Update existing grant
        existingGrant.permissions = [...new Set([...existingGrant.permissions, ...permissions])];
        existingGrant.expiresAt = expiresAt;
        existingGrant.conditions = conditions;
        existingGrant.grantedBy = grantedBy;
        existingGrant.updatedAt = new Date();
        existingGrant.revoked = false;

        await existingGrant.save();
        grant = existingGrant.toObject() as PermissionGrant;
      } else {
        // Create new grant
        const newGrant = new PermissionGrantModel({
          grantId,
          resource,
          identity,
          permissions,
          expiresAt,
          conditions,
          grantedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await newGrant.save();
        grant = newGrant.toObject() as PermissionGrant;
      }

      // Invalidate cache
      for (const permission of permissions) {
        const cacheKey = `permission:${resource}:${identity}:${permission}`;
        await this.cache.delete(cacheKey);
      }

      // Publish event
      await this.eventBus.publish('q.qonsent.grant.issued.v1', {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        source: 'qonsent',
        type: 'q.qonsent.grant.issued.v1',
        data: {
          grantId: grant.grantId,
          resource,
          identity,
          permissions,
          grantedBy,
          expiresAt: expiresAt?.toISOString(),
          conditions,
        },
      });

      // Audit the grant
      await this.audit.logPermissionGrant({
        grantId: grant.grantId,
        resource,
        identity,
        permissions,
        grantedBy,
        expiresAt,
        conditions,
      });

      logger.info('Permission granted successfully', { grantId, resource, identity, permissions });

      return grant;

    } catch (error) {
      logger.error('Error granting permission', { grantId, error, resource, identity, permissions });
      
      if (error instanceof QonsentError) {
        throw error;
      }

      throw new QonsentError(
        ErrorCodes.PERMISSION_GRANT_FAILED,
        'Failed to grant permission',
        { grantId, resource, identity, permissions }
      );
    }
  }

  /**
   * Revoke permissions from an identity for a resource
   */
  async revokePermission(params: RevokePermissionParams): Promise<void> {
    const { resource, identity, permissions, revokedBy, reason } = params;
    const revokeId = uuidv4();

    try {
      logger.info('Revoking permission', { revokeId, resource, identity, permissions, revokedBy });

      // Check if revoker has permission to revoke
      const revokerCheck = await this.checkPermission({
        resource,
        identity: revokedBy,
        action: 'admin',
      });

      if (!revokerCheck.allowed) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Revoker does not have admin permission on resource',
          { resource, revokedBy }
        );
      }

      // Find existing grant
      const existingGrant = await PermissionGrantModel.findOne({
        resource,
        identity,
      }).exec();

      if (!existingGrant) {
        throw new QonsentError(
          ErrorCodes.GRANT_NOT_FOUND,
          'No permission grant found for resource and identity',
          { resource, identity }
        );
      }

      let revokedPermissions: string[];

      if (permissions && permissions.length > 0) {
        // Revoke specific permissions
        revokedPermissions = permissions.filter(p => existingGrant.permissions.includes(p));
        existingGrant.permissions = existingGrant.permissions.filter(p => !permissions.includes(p));
        
        if (existingGrant.permissions.length === 0) {
          existingGrant.revoked = true;
        }
      } else {
        // Revoke all permissions
        revokedPermissions = [...existingGrant.permissions];
        existingGrant.revoked = true;
        existingGrant.permissions = [];
      }

      existingGrant.updatedAt = new Date();
      await existingGrant.save();

      // Invalidate cache
      for (const permission of revokedPermissions) {
        const cacheKey = `permission:${resource}:${identity}:${permission}`;
        await this.cache.delete(cacheKey);
      }

      // Publish event
      await this.eventBus.publish('q.qonsent.revoked.v1', {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        source: 'qonsent',
        type: 'q.qonsent.revoked.v1',
        data: {
          resource,
          identity,
          revokedPermissions,
          revokedBy,
          reason,
        },
      });

      // Audit the revocation
      await this.audit.logPermissionRevocation({
        resource,
        identity,
        revokedPermissions,
        revokedBy,
        reason,
      });

      logger.info('Permission revoked successfully', { revokeId, resource, identity, revokedPermissions });

    } catch (error) {
      logger.error('Error revoking permission', { revokeId, error, resource, identity, permissions });
      
      if (error instanceof QonsentError) {
        throw error;
      }

      throw new QonsentError(
        ErrorCodes.PERMISSION_REVOKE_FAILED,
        'Failed to revoke permission',
        { revokeId, resource, identity, permissions }
      );
    }
  }

  /**
   * List permissions for a resource or identity
   */
  async listPermissions(params: {
    resource?: string;
    identity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    grants: PermissionGrant[];
    total: number;
  }> {
    const { resource, identity, limit = 50, offset = 0 } = params;

    try {
      const query: any = { revoked: { $ne: true } };
      
      if (resource) query.resource = resource;
      if (identity) query.identity = identity;

      const [grants, total] = await Promise.all([
        PermissionGrantModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec(),
        PermissionGrantModel.countDocuments(query).exec(),
      ]);

      return {
        grants: grants.map(grant => ({
          ...grant,
          _id: String(grant._id),
        })) as PermissionGrant[],
        total,
      };

    } catch (error) {
      logger.error('Error listing permissions', { error, resource, identity });
      throw new QonsentError(
        ErrorCodes.PERMISSION_LIST_FAILED,
        'Failed to list permissions',
        { resource, identity }
      );
    }
  }
}