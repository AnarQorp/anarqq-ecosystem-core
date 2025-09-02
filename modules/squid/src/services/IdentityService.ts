/**
 * Identity Service
 * Core business logic for identity management
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  Identity,
  IdentityType,
  IdentityStatus,
  VerificationLevel,
  GovernanceType,
  PrivacyLevel,
  CreateIdentityRequest,
  CreateSubidentityRequest,
  VerificationRequest,
  ReputationUpdate,
  RequestContext,
  IdentityService as IIdentityService,
  StorageService,
  EventService
} from '../types';

export class IdentityService implements IIdentityService {
  constructor(
    private storageService: StorageService,
    private eventService: EventService,
    private config: any
  ) {}

  async createIdentity(request: CreateIdentityRequest, context: RequestContext): Promise<Identity> {
    // Generate cryptographic key pair
    const keyPair = this.generateKeyPair();
    
    const identity: Identity = {
      did: uuidv4(),
      name: request.name,
      type: IdentityType.ROOT,
      rootId: '', // Will be set to self
      children: [],
      depth: 0,
      path: [],
      status: IdentityStatus.ACTIVE,
      verificationLevel: VerificationLevel.UNVERIFIED,
      reputation: 100, // Starting reputation
      governanceType: GovernanceType.SELF,
      privacyLevel: request.privacyLevel || PrivacyLevel.PUBLIC,
      publicKey: keyPair.publicKey,
      qindexRegistered: false,
      kyc: {
        required: false,
        submitted: false,
        approved: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: new Date(),
      metadata: {
        ...request.metadata,
        creator: {
          ip: context.ip,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          deviceFingerprint: context.deviceFingerprint
        }
      }
    };

    // Set rootId to self for root identities
    identity.rootId = identity.did;
    identity.path = [identity.did];

    // Store the identity
    await this.storageService.storeIdentity(identity);

    // Publish identity created event
    await this.eventService.publishEvent({
      eventId: uuidv4(),
      timestamp: new Date(),
      version: 'v1',
      source: 'squid',
      type: 'identity.created',
      correlationId: context.requestId,
      data: {
        identity,
        creator: {
          ip: context.ip,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          deviceFingerprint: context.deviceFingerprint
        }
      }
    });

    return identity;
  }

  async createSubidentity(
    parentId: string,
    request: CreateSubidentityRequest,
    context: RequestContext
  ): Promise<Identity> {
    // Get parent identity
    const parent = await this.storageService.retrieveIdentity(parentId);
    if (!parent) {
      throw new Error('Parent identity not found');
    }

    // Validate parent can create subidentities
    if (parent.type !== IdentityType.ROOT || parent.verificationLevel === VerificationLevel.UNVERIFIED) {
      throw new Error('Parent identity must be a verified ROOT identity');
    }

    // Check subidentity limits
    if (parent.children.length >= this.config.security.maxSubidentities) {
      throw new Error(`Maximum number of subidentities (${this.config.security.maxSubidentities}) reached`);
    }

    // Validate subidentity type
    if (!Object.values(IdentityType).includes(request.type) || request.type === IdentityType.ROOT) {
      throw new Error('Invalid subidentity type');
    }

    // Generate key pair for subidentity
    const keyPair = this.generateKeyPair();

    const subidentity: Identity = {
      did: uuidv4(),
      name: request.name,
      type: request.type,
      parentId: parent.did,
      rootId: parent.rootId,
      children: [],
      depth: parent.depth + 1,
      path: [...parent.path, uuidv4()], // Will be updated with actual DID
      status: IdentityStatus.ACTIVE,
      verificationLevel: VerificationLevel.UNVERIFIED,
      reputation: Math.floor(parent.reputation * 0.8), // Inherit 80% of parent reputation
      governanceType: this.getGovernanceType(request.type),
      privacyLevel: request.privacyLevel || this.getDefaultPrivacyLevel(request.type),
      publicKey: keyPair.publicKey,
      qindexRegistered: false,
      kyc: {
        required: this.isKycRequired(request.type),
        submitted: false,
        approved: false,
        level: request.kycLevel
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: new Date(),
      metadata: {
        ...request.metadata,
        purpose: request.purpose,
        parentIdentity: parent.did,
        creator: {
          identityId: context.identityId,
          ip: context.ip,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          deviceFingerprint: context.deviceFingerprint
        }
      }
    };

    // Update path with actual DID
    subidentity.path = [...parent.path, subidentity.did];

    // Store the subidentity
    await this.storageService.storeIdentity(subidentity);

    // Update parent's children list
    parent.children.push(subidentity.did);
    parent.updatedAt = new Date();
    await this.storageService.updateIdentity(parent.did, { 
      children: parent.children, 
      updatedAt: parent.updatedAt 
    });

    // Publish subidentity created event
    await this.eventService.publishEvent({
      eventId: uuidv4(),
      timestamp: new Date(),
      version: 'v1',
      source: 'squid',
      type: 'subidentity.created',
      correlationId: context.requestId,
      data: {
        identity: subidentity,
        parentId: parent.did,
        creator: {
          identityId: context.identityId,
          ip: context.ip,
          sessionId: context.sessionId,
          deviceFingerprint: context.deviceFingerprint
        }
      }
    });

    return subidentity;
  }

  async getIdentity(identityId: string): Promise<Identity | null> {
    return await this.storageService.retrieveIdentity(identityId);
  }

  async updateIdentity(
    identityId: string,
    updates: Partial<Identity>,
    context: RequestContext
  ): Promise<Identity> {
    const identity = await this.storageService.retrieveIdentity(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Validate updates
    const allowedUpdates = ['name', 'description', 'avatar', 'tags', 'privacyLevel', 'metadata'];
    const updateKeys = Object.keys(updates);
    const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
    
    if (invalidUpdates.length > 0) {
      throw new Error(`Invalid update fields: ${invalidUpdates.join(', ')}`);
    }

    // Apply updates
    const updatedIdentity = {
      ...identity,
      ...updates,
      updatedAt: new Date()
    };

    await this.storageService.updateIdentity(identityId, updatedIdentity);
    return updatedIdentity;
  }

  async deleteIdentity(identityId: string, context: RequestContext): Promise<void> {
    const identity = await this.storageService.retrieveIdentity(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Cannot delete root identity if it has children
    if (identity.type === IdentityType.ROOT && identity.children.length > 0) {
      throw new Error('Cannot delete root identity with existing subidentities');
    }

    // Mark as deleted instead of hard delete for audit purposes
    await this.storageService.updateIdentity(identityId, {
      status: IdentityStatus.DELETED,
      updatedAt: new Date()
    });

    // If this is a subidentity, remove from parent's children list
    if (identity.parentId) {
      const parent = await this.storageService.retrieveIdentity(identity.parentId);
      if (parent) {
        parent.children = parent.children.filter(childId => childId !== identityId);
        parent.updatedAt = new Date();
        await this.storageService.updateIdentity(identity.parentId, {
          children: parent.children,
          updatedAt: parent.updatedAt
        });
      }
    }
  }

  async submitVerification(
    identityId: string,
    request: VerificationRequest,
    context: RequestContext
  ): Promise<Identity> {
    const identity = await this.storageService.retrieveIdentity(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    if (identity.kyc.submitted) {
      throw new Error('Verification already submitted');
    }

    // Update KYC status
    const updatedIdentity = await this.storageService.updateIdentity(identityId, {
      kyc: {
        ...identity.kyc,
        submitted: true,
        submittedAt: new Date()
      },
      status: IdentityStatus.PENDING_VERIFICATION,
      updatedAt: new Date(),
      metadata: {
        ...identity.metadata,
        verification: {
          submittedAt: Date.now(),
          type: request.documentType,
          documentIdentifier: request.documentNumber.slice(-4) // Only store last 4 digits
        }
      }
    });

    return updatedIdentity;
  }

  async updateReputation(update: ReputationUpdate): Promise<Identity> {
    const identity = await this.storageService.retrieveIdentity(update.identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const previousScore = identity.reputation;
    const newScore = Math.max(0, Math.min(1000, identity.reputation + update.delta));

    const updatedIdentity = await this.storageService.updateIdentity(update.identityId, {
      reputation: newScore,
      updatedAt: new Date()
    });

    // Publish reputation updated event
    await this.eventService.publishEvent({
      eventId: uuidv4(),
      timestamp: new Date(),
      version: 'v1',
      source: 'squid',
      type: 'reputation.updated',
      data: {
        identityId: update.identityId,
        previousScore,
        newScore,
        delta: update.delta,
        reason: update.reason,
        metadata: {
          module: update.module,
          action: update.action,
          details: update.metadata
        }
      }
    });

    return updatedIdentity;
  }

  async getReputation(identityId: string): Promise<{ score: number; level: string; lastUpdated: Date }> {
    const identity = await this.storageService.retrieveIdentity(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    return {
      score: identity.reputation,
      level: this.getReputationLevel(identity.reputation),
      lastUpdated: identity.updatedAt
    };
  }

  private generateKeyPair(): { publicKey: string; privateKey: string } {
    // In a real implementation, this would use proper cryptographic libraries
    // For now, we'll generate mock keys
    const keyId = uuidv4();
    return {
      publicKey: `pub_${keyId}`,
      privateKey: `priv_${keyId}`
    };
  }

  private getGovernanceType(identityType: IdentityType): GovernanceType {
    switch (identityType) {
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return GovernanceType.DAO;
      case IdentityType.CONSENTIDA:
        return GovernanceType.PARENT;
      case IdentityType.AID:
        return GovernanceType.SELF;
      default:
        return GovernanceType.SELF;
    }
  }

  private getDefaultPrivacyLevel(identityType: IdentityType): PrivacyLevel {
    switch (identityType) {
      case IdentityType.AID:
        return PrivacyLevel.ANONYMOUS;
      case IdentityType.CONSENTIDA:
        return PrivacyLevel.PRIVATE;
      case IdentityType.ENTERPRISE:
        return PrivacyLevel.DAO_ONLY;
      default:
        return PrivacyLevel.PUBLIC;
    }
  }

  private isKycRequired(identityType: IdentityType): boolean {
    return [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.AID].includes(identityType);
  }

  private getReputationLevel(score: number): string {
    if (score >= 800) return 'AUTHORITY';
    if (score >= 600) return 'EXPERT';
    if (score >= 300) return 'TRUSTED';
    return 'NOVICE';
  }
}