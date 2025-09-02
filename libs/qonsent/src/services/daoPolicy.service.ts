import { Model, Document, Types } from 'mongoose';
import { DAOVisibilityPolicy, IDAOVisibilityPolicy } from '../models/DAOVisibilityPolicy';

export interface UpsertPolicyParams {
  daoId: string;
  resourcePattern: string;
  allowedRoles: string[];
  restrictions?: Record<string, any>;
  createdBy: string;
}

export interface GetPoliciesParams {
  daoId: string;
  resourcePattern?: string;
}

export class DAOPolicyService {
  private policyModel: Model<IDAOVisibilityPolicy & Document>;

  constructor() {
    this.policyModel = DAOVisibilityPolicy;
  }

  async upsertPolicy(params: UpsertPolicyParams) {
    const { daoId, resourcePattern, allowedRoles, restrictions, createdBy } = params;

    // Check if a policy already exists for this DAO and resource pattern
    const existingPolicy = await this.policyModel.findOne({
      daoId,
      resourcePattern,
    });

    if (existingPolicy) {
      // Update existing policy
      existingPolicy.allowedRoles = allowedRoles;
      if (restrictions) existingPolicy.restrictions = restrictions;
      existingPolicy.updatedAt = new Date();
      existingPolicy.updatedBy = createdBy;
      await existingPolicy.save();
      return existingPolicy;
    } else {
      // Create new policy
      const policy = new this.policyModel({
        daoId,
        resourcePattern,
        allowedRoles,
        restrictions,
        createdBy,
        updatedBy: createdBy,
      });
      await policy.save();
      return policy;
    }
  }

  async getPolicies(params: GetPoliciesParams) {
    const { daoId, resourcePattern } = params;
    
    const query: any = { daoId };
    
    if (resourcePattern) {
      query.resourcePattern = resourcePattern;
    }
    
    return this.policyModel.find(query).sort({ resourcePattern: 1 }).lean();
  }

  async getPolicyById(policyId: string) {
    if (!Types.ObjectId.isValid(policyId)) {
      return null;
    }
    return this.policyModel.findById(policyId).lean();
  }

  async deletePolicy(policyId: string) {
    if (!Types.ObjectId.isValid(policyId)) {
      return false;
    }
    
    const result = await this.policyModel.deleteOne({ _id: policyId });
    return result.deletedCount > 0;
  }

  async evaluateAccess(daoId: string, resourcePath: string, userRoles: string[]) {
    // Get all policies that might apply to this resource
    const policies = await this.getPolicies({ daoId });
    
    // Find the most specific policy that matches the resource path
    let bestMatchPolicy = null;
    let bestMatchLength = -1;
    
    for (const policy of policies) {
      // Convert the resource pattern to a regex
      const pattern = policy.resourcePattern
        .replace(/\*/g, '[^/]+') // * matches any characters except /
        .replace(/\/\*\*\//g, '(/.*)?'); // **/ matches any subpath
      
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(resourcePath) && policy.resourcePattern.length > bestMatchLength) {
        bestMatchPolicy = policy;
        bestMatchLength = policy.resourcePattern.length;
      }
    }
    
    if (!bestMatchPolicy) {
      // No matching policy found, default to deny
      return {
        allowed: false,
        reason: 'No matching policy found',
      };
    }
    
    // Check if the user has any of the required roles
    const hasRequiredRole = bestMatchPolicy.allowedRoles.some(role => 
      userRoles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return {
        allowed: false,
        reason: 'Insufficient permissions',
        requiredRoles: bestMatchPolicy.allowedRoles,
        userRoles,
      };
    }
    
    // Apply any additional restrictions
    if (bestMatchPolicy.restrictions) {
      // TODO: Implement restriction evaluation logic
      // This could include rate limiting, time-based restrictions, etc.
    }
    
    return {
      allowed: true,
      policy: bestMatchPolicy,
    };
  }
}
