import { Model, Document, Types } from 'mongoose';
import { Delegation, IDelegation } from '../models/Delegation';

export interface CreateDelegationParams {
  delegatorDid: string;
  delegateeDid: string;
  scope: string[];
  expiresAt?: Date;
  capabilities?: string[];
}

export interface ListDelegationsParams {
  did: string;
  type?: 'outgoing' | 'incoming';
  status?: 'active' | 'expired' | 'all';
  limit: number;
  offset: number;
}

export interface VerifyDelegationParams {
  delegatorDid: string;
  delegateeDid: string;
  scope: string;
  capability?: string;
}

export class DelegationService {
  private delegationModel: Model<IDelegation & Document>;

  constructor() {
    this.delegationModel = Delegation;
  }

  async createDelegation(params: CreateDelegationParams) {
    const { delegatorDid, delegateeDid, scope, expiresAt, capabilities = [] } = params;

    // Check for existing delegation with the same scope
    const existingDelegation = await this.delegationModel.findOne({
      delegatorDid,
      delegateeDid,
      scope: { $all: scope },
      status: 'active',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (existingDelegation) {
      // Update existing delegation
      existingDelegation.expiresAt = expiresAt;
      existingDelegation.capabilities = [...new Set([...existingDelegation.capabilities, ...capabilities])];
      existingDelegation.updatedAt = new Date();
      await existingDelegation.save();
      return existingDelegation;
    }

    // Create new delegation
    const delegation = new this.delegationModel({
      delegatorDid,
      delegateeDid,
      scope,
      capabilities,
      expiresAt,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await delegation.save();
    return delegation;
  }

  async listDelegations(params: ListDelegationsParams) {
    const { did, type = 'outgoing', status = 'active', limit, offset } = params;
    
    const query: any = {};
    
    if (type === 'outgoing') {
      query.delegatorDid = did;
    } else {
      query.delegateeDid = did;
    }
    
    if (status !== 'all') {
      if (status === 'active') {
        query.$and = [
          { status: 'active' },
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } },
            ],
          },
        ];
      } else if (status === 'expired') {
        query.$or = [
          { status: 'expired' },
          { 
            status: 'active',
            expiresAt: { $lt: new Date() },
          },
        ];
      }
    }
    
    const [delegations, total] = await Promise.all([
      this.delegationModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.delegationModel.countDocuments(query),
    ]);
    
    // Update status of expired delegations
    const now = new Date();
    const expiredIds = delegations
      .filter(d => d.status === 'active' && d.expiresAt && d.expiresAt < now)
      .map(d => d._id);
    
    if (expiredIds.length > 0) {
      await this.delegationModel.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'expired', updatedAt: now } }
      );
      
      // Update the status in the returned results
      delegations.forEach(d => {
        if (d.expiresAt && d.expiresAt < now) {
          d.status = 'expired';
        }
      });
    }
    
    return { delegations, total };
  }

  async getDelegationById(delegationId: string) {
    if (!Types.ObjectId.isValid(delegationId)) {
      return null;
    }
    return this.delegationModel.findById(delegationId).lean();
  }

  async revokeDelegation(delegationId: string) {
    if (!Types.ObjectId.isValid(delegationId)) {
      return false;
    }
    
    const result = await this.delegationModel.updateOne(
      { _id: delegationId, status: 'active' },
      { 
        $set: { 
          status: 'revoked',
          updatedAt: new Date(),
        } 
      }
    );
    
    return result.modifiedCount > 0;
  }

  async verifyDelegation(params: VerifyDelegationParams) {
    const { delegatorDid, delegateeDid, scope, capability } = params;
    
    // First, check for a direct delegation
    const delegationQuery: any = {
      delegatorDid,
      delegateeDid,
      status: 'active',
      scope: { $in: [scope] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    };
    
    if (capability) {
      delegationQuery.$or = [
        { capabilities: { $size: 0 } }, // No specific capabilities required
        { capabilities: capability },
      ];
    }
    
    const delegation = await this.delegationModel.findOne(delegationQuery);
    
    if (delegation) {
      return {
        isValid: true,
        delegation,
      };
    }
    
    // If no direct delegation found, check for transitive delegations
    // This would involve traversing the delegation graph to find a valid path
    // from the delegator to the delegatee with the required scope
    // For simplicity, we'll implement a basic version here
    
    // TODO: Implement more sophisticated delegation graph traversal
    // This is a simplified version that only checks one level deep
    
    const transitiveDelegation = await this.delegationModel.findOne({
      delegateeDid,
      status: 'active',
      scope: { $in: [scope] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });
    
    if (transitiveDelegation) {
      // Verify that the intermediate delegator has the right to delegate this scope
      const isValid = await this.verifyDelegation({
        delegatorDid,
        delegateeDid: transitiveDelegation.delegatorDid,
        scope: 'delegate',
        capability: `delegate:${scope}`,
      });
      
      if (isValid) {
        return {
          isValid: true,
          delegation: transitiveDelegation,
          isTransitive: true,
          path: [delegatorDid, transitiveDelegation.delegatorDid, delegateeDid],
        };
      }
    }
    
    return {
      isValid: false,
      reason: 'No valid delegation found',
    };
  }
}
