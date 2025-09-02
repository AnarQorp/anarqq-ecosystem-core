import { Document, Types } from 'mongoose';
import { QonsentRule, IQonsentRule } from '../models/QonsentRule';
import { QonsentLog, IQonsentLog } from '../models/QonsentLog';

export interface SetQonsentParams {
  resourceId: string;
  ownerDid: string;
  targetDid: string;
  permissions: string[];
  expiresAt?: Date;
  daoScope?: string;
}

export interface GetViewableResourcesParams {
  targetDid: string;
  resourceType?: string;
  limit: number;
  offset: number;
}

export interface BatchSyncParams {
  items: Array<{
    resourceId: string;
    ownerDid: string;
    targetDid: string;
    permissions: string[];
    expiresAt?: Date;
    daoScope?: string;
  }>;
}

export interface GetQonsentLogsParams {
  actorDid?: string;
  resourceId?: string;
  targetDid?: string;
  daoId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export class QonsentService {
  private qonsentRuleModel: typeof QonsentRule;
  private qonsentLogModel: typeof QonsentLog;

  constructor() {
    this.qonsentRuleModel = QonsentRule;
    this.qonsentLogModel = QonsentLog;
  }

  async setQonsent(params: SetQonsentParams) {
    const { resourceId, ownerDid, targetDid, permissions, expiresAt, daoScope } = params;

    // Check if a rule already exists for this resource and target
    const existingRule = await this.qonsentRuleModel.findOne({
      resourceId,
      ownerDid,
      targetDid,
      daoScope: daoScope || { $exists: false },
    });

    let rule;
    
    if (existingRule) {
      // Update existing rule
      existingRule.permissions = permissions;
      if (expiresAt) existingRule.expiresAt = expiresAt;
      await existingRule.save();
      rule = existingRule;
    } else {
      // Create new rule
      rule = new this.qonsentRuleModel({
        resourceId,
        ownerDid,
        targetDid,
        permissions,
        expiresAt,
        daoScope,
      });
      await rule.save();
    }

    // Log this action
    await this.logQonsentAction({
      actorDid: ownerDid,
      action: 'set_consent',
      resourceId,
      targetDid,
      daoScope,
      metadata: { permissions },
    });

    return rule;
  }

  async getViewableResources(params: GetViewableResourcesParams) {
    const { targetDid, resourceType, limit, offset } = params;
    
    const query: any = {
      $or: [
        // Direct permissions
        { targetDid },
        // DAO-based permissions (if the target is a member of any DAO)
        { 'daoScope': { $exists: true } },
      ],
      $and: [
        { 
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
          ]
        }
      ],
    };

    if (resourceType) {
      query.resourceId = new RegExp(`^${resourceType}:`);
    }

    const [rules, total] = await Promise.all([
      this.qonsentRuleModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.qonsentRuleModel.countDocuments(query),
    ]);

    // TODO: Filter DAO-based permissions based on actual DAO membership
    // For now, we'll return all rules, but in a real implementation, you'd filter
    // out DAO rules where the target is not a member

    return {
      resources: rules.map((rule: any) => ({
        resourceId: rule.resourceId,
        permissions: rule.permissions,
        grantedAt: rule.createdAt,
        expiresAt: rule.expiresAt,
        daoScope: rule.daoScope,
      })),
      total,
    };
  }

  // New methods for public API and Qsocial integration
  async getPermissionsForResource(params: {
    resourceId: string;
    targetDid?: string;
    daoScope?: string;
  }): Promise<Array<{
    targetDid?: string;
    permissions: string[];
    source: 'direct' | 'dao' | 'public';
    expiresAt?: Date;
  }>> {
    const { resourceId, targetDid, daoScope } = params;
    
    // In a real implementation, this would check:
    // 1. Direct permissions for the target DID
    // 2. DAO memberships if daoScope is provided
    // 3. Any delegated permissions
    
    const query: any = { resourceId };
    if (targetDid) {
      query.$or = [
        { targetDid },
        { targetDid: { $exists: false } } // Public permissions
      ];
    }
    
    if (daoScope) {
      query.$or = query.$or || [];
      query.$or.push({ daoScope });
    }
    
    const rules = await this.qonsentRuleModel.find(query).exec();
    
    return rules.map(rule => ({
      targetDid: rule.targetDid,
      permissions: rule.permissions,
      source: rule.daoScope ? 'dao' : (rule.targetDid ? 'direct' : 'public'),
      expiresAt: rule.expiresAt,
    }));
  }
  
  async getResourceVisibility(resourceId: string): Promise<string> {
    // In a real implementation, this would check the visibility settings for the resource
    // For now, we'll return a default value
    return 'public';
  }
  
  async checkAccess(params: {
    resourceId: string;
    targetDid: string;
    daoScope?: string;
    returnRequiredPermissions?: boolean;
  }): Promise<{
    hasAccess: boolean;
    reason: string;
    level: string;
    requiredPermissions?: string[];
  }> {
    const { resourceId, targetDid, daoScope, returnRequiredPermissions = false } = params;
    
    // Check direct access
    const directAccess = await this.qonsentRuleModel.findOne({
      resourceId,
      $or: [
        { targetDid },
        { targetDid: { $exists: false } } // Public permissions
      ],
      ...(daoScope ? { daoScope } : {}),
    }).exec();
    
    if (directAccess) {
      return {
        hasAccess: true,
        reason: 'Direct access granted',
        level: directAccess.daoScope ? 'dao' : (directAccess.targetDid ? 'user' : 'public'),
        ...(returnRequiredPermissions ? { requiredPermissions: directAccess.permissions } : {}),
      };
    }
    
    // Check DAO access if daoScope is provided
    if (daoScope) {
      const daoAccess = await this.qonsentRuleModel.findOne({
        resourceId,
        daoScope,
        targetDid: { $exists: false },
      }).exec();
      
      if (daoAccess) {
        // In a real implementation, you would check if targetDid is a member of the DAO
        const isDaoMember = true; // Placeholder
        
        if (isDaoMember) {
          return {
            hasAccess: true,
            reason: 'DAO membership grants access',
            level: 'dao',
            ...(returnRequiredPermissions ? { requiredPermissions: daoAccess.permissions } : {}),
          };
        }
      }
    }
    
    // No access
    return {
      hasAccess: false,
      reason: 'No matching access rules found',
      level: 'none',
      ...(returnRequiredPermissions ? { requiredPermissions: [] } : {}),
    };
  }

  async batchSyncPermissions(params: BatchSyncParams) {
    const { items } = params;
    const bulkOps = items.map(item => ({
      updateOne: {
        filter: {
          resourceId: item.resourceId,
          ownerDid: item.ownerDid,
          targetDid: item.targetDid,
          daoScope: item.daoScope || { $exists: false },
        },
        update: {
          $set: {
            permissions: item.permissions,
            expiresAt: item.expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length === 0) return 0;
    
    const result = await this.qonsentRuleModel.bulkWrite(bulkOps);
    
    // Log the batch operation
    await this.logQonsentAction({
      actorDid: items[0]?.ownerDid || 'system',
      action: 'batch_sync',
      metadata: {
        processed: bulkOps.length,
      },
    });

    return result.upsertedCount + (result.modifiedCount || 0);
  }

  async getQonsentLogs(params: GetQonsentLogsParams) {
    const { actorDid, resourceId, targetDid, daoId, from, to, limit, offset } = params;
    
    const query: any = {};
    
    if (actorDid) query.actorDid = actorDid;
    if (resourceId) query.resourceId = resourceId;
    if (targetDid) query.targetDid = targetDid;
    if (daoId) query['metadata.daoId'] = daoId;
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = from;
      if (to) query.timestamp.$lte = to;
    }
    
    const [logs, total] = await Promise.all([
      this.qonsentLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.qonsentLogModel.countDocuments(query),
    ]);
    
    return { logs, total };
  }

  private async logQonsentAction(params: {
    actorDid: string;
    action: string;
    resourceId?: string;
    targetDid?: string;
    daoScope?: string;
    metadata?: Record<string, any>;
  }) {
    const log = new this.qonsentLogModel({
      timestamp: new Date(),
      ...params,
    });
    
    await log.save();
    return log;
  }
}
