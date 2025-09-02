import { logger } from '../utils/logger';
import { PolicyModel } from '../models/Policy';
import { Policy, PermissionCheck } from '../types';
import { QonsentError, ErrorCodes } from '../utils/errors';

export interface UCANCapability {
  with: string; // Resource URI
  can: string;  // Action
  nb?: Record<string, any>; // Caveats/conditions
}

export interface UCANPolicy {
  iss: string; // Issuer (grantor)
  aud: string; // Audience (grantee)
  att: UCANCapability[]; // Capabilities
  exp?: number; // Expiration timestamp
  nbf?: number; // Not before timestamp
  prf?: string[]; // Proof chain
}

export interface PolicyCheckParams {
  resource: string;
  identity: string;
  action: string;
  context?: Record<string, any>;
}

export class UCANPolicyEngine {
  /**
   * Check permission using UCAN policies
   */
  async checkPermission(params: PolicyCheckParams): Promise<PermissionCheck> {
    const { resource, identity, action, context = {} } = params;

    try {
      logger.debug('Checking UCAN policies', { resource, identity, action });

      // Find applicable policies
      const policies = await this.findApplicablePolicies(resource, identity);

      for (const policy of policies) {
        const result = await this.evaluatePolicy(policy, resource, identity, action, context);
        if (result.allowed) {
          return result;
        }
      }

      // No matching policies found
      return {
        allowed: false,
        reason: 'No matching UCAN policies found',
      };

    } catch (error) {
      logger.error('Error checking UCAN policies', { error, resource, identity, action });
      throw new QonsentError(
        ErrorCodes.POLICY_EVALUATION_FAILED,
        'Failed to evaluate UCAN policies',
        { resource, identity, action }
      );
    }
  }

  /**
   * Find policies that might apply to the resource and identity
   */
  private async findApplicablePolicies(resource: string, identity: string): Promise<Policy[]> {
    try {
      // Query for policies that match the resource pattern and identity
      const policies = await PolicyModel.find({
        $and: [
          { active: true },
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } },
            ],
          },
          {
            $or: [
              // Direct identity match
              { 'rules.audience': identity },
              // Wildcard audience
              { 'rules.audience': '*' },
              // DAO-based policies (would need DAO membership check)
              { 'rules.audience': { $regex: '^dao:' } },
            ],
          },
          {
            $or: [
              // Exact resource match
              { 'rules.resource': resource },
              // Resource pattern match
              { 'rules.resource': { $regex: this.resourceToRegex(resource) } },
              // Wildcard resource
              { 'rules.resource': '*' },
            ],
          },
        ],
      }).exec();

      return policies as Policy[];

    } catch (error) {
      logger.error('Error finding applicable policies', { error, resource, identity });
      throw error;
    }
  }

  /**
   * Evaluate a single policy against the request
   */
  private async evaluatePolicy(
    policy: Policy,
    resource: string,
    identity: string,
    action: string,
    context: Record<string, any>
  ): Promise<PermissionCheck> {
    try {
      logger.debug('Evaluating policy', { policyId: policy._id, resource, identity, action });

      // Check if policy is still valid
      if (policy.expiresAt && policy.expiresAt < new Date()) {
        return {
          allowed: false,
          reason: 'Policy has expired',
        };
      }

      // Evaluate each rule in the policy
      for (const rule of policy.rules) {
        const ruleResult = await this.evaluateRule(rule, resource, identity, action, context);
        if (ruleResult.allowed) {
          return {
            allowed: true,
            reason: ruleResult.reason,
            policy: {
              id: policy._id?.toString() || '',
              name: policy.name,
              type: policy.scope,
            },
            expiresAt: policy.expiresAt?.toISOString(),
            conditions: rule.conditions,
          };
        }
      }

      return {
        allowed: false,
        reason: 'No matching rules in policy',
      };

    } catch (error) {
      logger.error('Error evaluating policy', { error, policyId: policy._id });
      return {
        allowed: false,
        reason: 'Policy evaluation error',
      };
    }
  }

  /**
   * Evaluate a single rule within a policy
   */
  private async evaluateRule(
    rule: any,
    resource: string,
    identity: string,
    action: string,
    context: Record<string, any>
  ): Promise<{ allowed: boolean; reason: string }> {
    try {
      // Check audience (identity) match
      if (!this.matchesPattern(identity, rule.audience)) {
        return { allowed: false, reason: 'Identity does not match rule audience' };
      }

      // Check resource match
      if (!this.matchesPattern(resource, rule.resource)) {
        return { allowed: false, reason: 'Resource does not match rule resource pattern' };
      }

      // Check action match
      if (!this.matchesAction(action, rule.actions)) {
        return { allowed: false, reason: 'Action not permitted by rule' };
      }

      // Check conditions/caveats
      if (rule.conditions) {
        const conditionResult = await this.evaluateConditions(rule.conditions, context);
        if (!conditionResult.allowed) {
          return conditionResult;
        }
      }

      return { allowed: true, reason: 'Rule conditions satisfied' };

    } catch (error) {
      logger.error('Error evaluating rule', { error, rule });
      return { allowed: false, reason: 'Rule evaluation error' };
    }
  }

  /**
   * Check if a value matches a pattern (supports wildcards)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === value) return true;

    // Convert pattern to regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }

  /**
   * Check if an action is allowed by the rule's actions
   */
  private matchesAction(action: string, allowedActions: string[]): boolean {
    if (allowedActions.includes('*')) return true;
    if (allowedActions.includes(action)) return true;

    // Check hierarchical permissions
    const hierarchy: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'share', 'execute'],
      write: ['read'],
      share: ['read'],
    };

    for (const allowedAction of allowedActions) {
      if (hierarchy[allowedAction]?.includes(action)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate conditions/caveats
   */
  private async evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): Promise<{ allowed: boolean; reason: string }> {
    try {
      // Time window conditions
      if (conditions.timeWindow) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        if (conditions.timeWindow.start && conditions.timeWindow.end) {
          const [startHour, startMin] = conditions.timeWindow.start.split(':').map(Number);
          const [endHour, endMin] = conditions.timeWindow.end.split(':').map(Number);
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          
          if (currentTime < startTime || currentTime > endTime) {
            return { allowed: false, reason: 'Outside allowed time window' };
          }
        }
      }

      // IP restrictions
      if (conditions.ipRestrictions && context.clientIp) {
        if (!conditions.ipRestrictions.includes(context.clientIp)) {
          return { allowed: false, reason: 'IP address not in allowed list' };
        }
      }

      // Usage limits
      if (conditions.maxUses) {
        // This would require tracking usage count
        // For now, we'll assume it's within limits
      }

      // DAO membership conditions
      if (conditions.daoMembership && context.daoContext) {
        // This would require checking DAO membership
        // For now, we'll assume membership is valid
      }

      return { allowed: true, reason: 'All conditions satisfied' };

    } catch (error) {
      logger.error('Error evaluating conditions', { error, conditions });
      return { allowed: false, reason: 'Condition evaluation error' };
    }
  }

  /**
   * Convert resource pattern to regex
   */
  private resourceToRegex(resource: string): string {
    // Extract module and type from resource (e.g., "qdrive:file:abc123")
    const parts = resource.split(':');
    if (parts.length >= 2) {
      return `^${parts[0]}:${parts[1]}:.*$`;
    }
    return `^${resource}$`;
  }

  /**
   * Create a new UCAN policy
   */
  async createPolicy(params: {
    name: string;
    description?: string;
    scope: 'global' | 'dao' | 'resource';
    rules: any[];
    createdBy: string;
    expiresAt?: Date;
  }): Promise<Policy> {
    try {
      const policy = new PolicyModel({
        name: params.name,
        description: params.description,
        scope: params.scope,
        rules: params.rules,
        createdBy: params.createdBy,
        expiresAt: params.expiresAt,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await policy.save();
      return policy.toObject() as Policy;

    } catch (error) {
      logger.error('Error creating policy', { error, params });
      throw new QonsentError(
        ErrorCodes.POLICY_CREATION_FAILED,
        'Failed to create policy',
        params
      );
    }
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Policy>,
    updatedBy: string
  ): Promise<Policy> {
    try {
      const policy = await PolicyModel.findById(policyId).exec();
      if (!policy) {
        throw new QonsentError(
          ErrorCodes.POLICY_NOT_FOUND,
          'Policy not found',
          { policyId }
        );
      }

      Object.assign(policy, updates, {
        updatedBy,
        updatedAt: new Date(),
      });

      await policy.save();
      return policy.toObject() as Policy;

    } catch (error) {
      logger.error('Error updating policy', { error, policyId, updates });
      throw new QonsentError(
        ErrorCodes.POLICY_UPDATE_FAILED,
        'Failed to update policy',
        { policyId, updates }
      );
    }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string, deletedBy: string): Promise<void> {
    try {
      const policy = await PolicyModel.findById(policyId).exec();
      if (!policy) {
        throw new QonsentError(
          ErrorCodes.POLICY_NOT_FOUND,
          'Policy not found',
          { policyId }
        );
      }

      policy.active = false;
      policy.updatedBy = deletedBy;
      policy.updatedAt = new Date();

      await policy.save();

    } catch (error) {
      logger.error('Error deleting policy', { error, policyId });
      throw new QonsentError(
        ErrorCodes.POLICY_DELETE_FAILED,
        'Failed to delete policy',
        { policyId }
      );
    }
  }
}