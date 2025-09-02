// @ts-ignore - mongoose types will be available at runtime
import mongoose, { Connection, Model } from 'mongoose';
// @ts-ignore - models will be available at runtime
import { QonsentRule, QonsentLog } from '../models';

// Define interfaces
export interface QonsentConfig {
  databaseUrl?: string;
  debug?: boolean;
}

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

export interface GetQonsentLogsParams {
  resourceId?: string;
  targetDid?: string;
  ownerDid?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
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

interface Permission {
  targetDid?: string;
  permissions: string[];
  source: 'direct' | 'dao' | 'public';
  expiresAt?: Date;
}

export class QonsentService {
  private qonsentRuleModel: Model<any>;
  private qonsentLogModel: Model<any>;
  private config: QonsentConfig;
  private connection: Connection | null = null;

  constructor(config: QonsentConfig = {}) {
    this.config = config;
    this.qonsentRuleModel = QonsentRule;
    this.qonsentLogModel = QonsentLog;
  }

  /**
   * Initialize the service
   * This method can be used to establish database connections or other async initialization
   */
  async initialize(): Promise<void> {
    if (this.config.debug) {
      console.log('Initializing QonsentService with config:', this.config);
    }
    
    // Initialize database connection if URL is provided
    if (this.config.databaseUrl) {
      try {
        this.connection = await mongoose.createConnection(this.config.databaseUrl).asPromise();
        
        // Register models with the connection
        this.qonsentRuleModel = this.connection.model('QonsentRule', QonsentRule.schema);
        this.qonsentLogModel = this.connection.model('QonsentLog', QonsentLog.schema);
        
        if (this.config.debug) {
          console.log(`Connected to database at ${this.config.databaseUrl}`);
        }
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    } else {
      // Use default mongoose connection if no URL provided
      this.qonsentRuleModel = QonsentRule;
      this.qonsentLogModel = QonsentLog;
    }
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

  async getViewableResources(params: GetViewableResourcesParams): Promise<{ resources: any[], total: number }> {
    const { targetDid, resourceType, limit, offset } = params;
    
    const query: Record<string, any> = {
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
  }): Promise<Permission[]> {
    const { resourceId, targetDid, daoScope } = params;
    
    // In a real implementation, this would check:
    // 1. Direct permissions for the target DID
    // 2. DAO memberships if daoScope is provided
    // 3. Any delegated permissions
    
    const query: Record<string, unknown> = { resourceId };
    const orConditions: Record<string, unknown>[] = [];
    
    if (targetDid) {
      orConditions.push(
        { targetDid },
        { targetDid: { $exists: false } } // Public permissions
      );
    }
    
    if (daoScope) {
      orConditions.push({ daoScope });
    }
    
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
    
    const rules = await this.qonsentRuleModel.find(query).exec();
    
    return rules.map((rule: { targetDid?: string; permissions: string[]; daoScope?: string; expiresAt?: Date }) => ({
      targetDid: rule.targetDid,
      permissions: rule.permissions,
      source: rule.daoScope ? 'dao' : (rule.targetDid ? 'direct' : 'public'),
      expiresAt: rule.expiresAt,
    }));
  }
  
  async getResourceVisibility(_resourceId: string): Promise<string> {
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
    level: 'dao' | 'user' | 'public' | 'none';
    requiredPermissions?: string[];
  }> {
    const { resourceId, targetDid, daoScope, returnRequiredPermissions = false } = params;
    
    // Check direct access
    const directAccess = await this.qonsentRuleModel.findOne<{permissions: string[]; daoScope?: string; targetDid?: string}>({
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
      const daoAccess = await this.qonsentRuleModel.findOne<{permissions: string[]}>({
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

  async getQonsentLogs(params: GetQonsentLogsParams & { limit?: number; offset?: number } = { limit: 100, offset: 0 }): Promise<{ logs: unknown[]; total: number }> {
    // Destructure with default values to handle optional properties
    const { 
      resourceId, 
      targetDid, 
      ownerDid, 
      action, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = params;
    
    interface LogQuery {
      actorDid?: string;
      resourceId?: string;
      targetDid?: string | { $in: string[] };
      action?: string;
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
    }
    
    const query: LogQuery = {};
    
    if (ownerDid) query.actorDid = ownerDid;
    if (resourceId) query.resourceId = resourceId;
    if (targetDid) {
      // Handle both string and array of strings for targetDid
      const targetArray = Array.isArray(targetDid) ? targetDid : [targetDid];
      query.targetDid = { $in: targetArray };
    }
    if (action) query.action = action;
    
    if (startDate || endDate) {
      const timestampQuery: Record<string, Date> = {};
      if (startDate) timestampQuery.$gte = startDate;
      if (endDate) timestampQuery.$lte = endDate;
      query.timestamp = timestampQuery;
    }
    
    // Use type assertion for the query since we've defined the LogQuery interface
    const [logs, total] = await Promise.all([
      this.qonsentLogModel.find(query as Record<string, unknown>).sort({ timestamp: -1 }).skip(offset).limit(limit).lean().exec(),
      this.qonsentLogModel.countDocuments(query as Record<string, unknown>).exec()
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
  }): Promise<any> {
    const logData: Record<string, any> = {
      timestamp: new Date(),
      actorDid: params.actorDid,
      action: params.action,
    };

    if (params.resourceId) logData.resourceId = params.resourceId;
    if (params.targetDid) logData.targetDid = params.targetDid;
    if (params.daoScope) logData.daoScope = params.daoScope;
    if (params.metadata) logData.metadata = params.metadata;

    const log = new this.qonsentLogModel(logData);

    await log.save();
    return log;
  }
}
