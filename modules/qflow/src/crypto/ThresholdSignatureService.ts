/**
 * Threshold Signature Service
 * 
 * Manages DAO validator sets and threshold signatures for critical operations
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { daoSubnetService } from '../governance/DAOSubnetService.js';

export interface ValidatorKeyPair {
  validatorId: string;
  publicKey: string;
  privateKeyShare: string; // In production, would be securely stored
  keyIndex: number;
  threshold: number;
  totalValidators: number;
  createdAt: string;
  expiresAt?: string;
}

export interface ThresholdSignatureScheme {
  scheme: 'BLS' | 'Dilithium' | 'ECDSA';
  threshold: number;
  totalValidators: number;
  publicKeys: string[];
  aggregatePublicKey: string;
  parameters: {
    curve?: string; // For ECDSA/BLS
    securityLevel?: number; // For Dilithium
    hashFunction: string;
  };
}

export interface SignatureShare {
  validatorId: string;
  keyIndex: number;
  signature: string;
  message: string;
  messageHash: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ThresholdSignature {
  id: string;
  daoSubnet: string;
  message: string;
  messageHash: string;
  scheme: ThresholdSignatureScheme;
  shares: SignatureShare[];
  aggregatedSignature?: string;
  status: 'collecting' | 'complete' | 'failed' | 'expired';
  requiredShares: number;
  collectedShares: number;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  purpose: 'step_commit' | 'policy_update' | 'validator_change' | 'resource_allocation' | 'custom';
  metadata: {
    stepId?: string;
    executionId?: string;
    proposalId?: string;
    initiatedBy: string;
    criticalOperation: boolean;
  };
}

export interface ValidatorSet {
  daoSubnet: string;
  validators: ValidatorInfo[];
  scheme: ThresholdSignatureScheme;
  epoch: number; // Validator set version
  activeFrom: string;
  activeUntil?: string;
  rotationPolicy: {
    rotationInterval: number; // milliseconds
    maxValidatorAge: number; // milliseconds
    minValidators: number;
    maxValidators: number;
  };
}

export interface ValidatorInfo {
  validatorId: string;
  publicKey: string;
  weight: number;
  role: 'primary' | 'backup' | 'observer';
  status: 'active' | 'inactive' | 'compromised' | 'rotating';
  joinedAt: string;
  lastActivity: string;
  reputation: number;
  slashingHistory: SlashingEvent[];
}

export interface SlashingEvent {
  id: string;
  validatorId: string;
  reason: 'double_signing' | 'unavailability' | 'malicious_behavior' | 'key_compromise';
  severity: 'warning' | 'minor' | 'major' | 'critical';
  penalty: number; // Reputation penalty
  evidence: string;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface CriticalOperation {
  id: string;
  type: 'payment' | 'governance_vote' | 'validator_change' | 'policy_update' | 'resource_transfer';
  daoSubnet: string;
  description: string;
  data: any;
  requiredSignatures: number;
  collectedSignatures: number;
  signatures: ThresholdSignature[];
  status: 'pending' | 'signed' | 'executed' | 'failed' | 'expired';
  initiatedBy: string;
  initiatedAt: string;
  deadline: string;
  byzantineFaultTolerant: boolean;
}

export class ThresholdSignatureService extends EventEmitter {
  private validatorSetsCache = new Map<string, ValidatorSet>();
  private signatureRequestsCache = new Map<string, ThresholdSignature>();
  private criticalOperationsCache = new Map<string, CriticalOperation>();
  private validatorKeysCache = new Map<string, ValidatorKeyPair[]>();
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes

  constructor() {
    super();
    this.setupEventHandlers();
    this.initializeDefaultSchemes();
  }

  /**
   * Initialize validator set for DAO subnet
   */
  async initializeValidatorSet(
    daoSubnet: string,
    validators: string[], // Validator identity IDs
    scheme: 'BLS' | 'Dilithium' | 'ECDSA' = 'BLS',
    threshold?: number
  ): Promise<ValidatorSet> {
    try {
      const subnet = await daoSubnetService.getDAOSubnet(daoSubnet);
      if (!subnet) {
        throw new Error('DAO subnet not found');
      }

      // Calculate threshold (default to 2/3 + 1)
      const calculatedThreshold = threshold || Math.floor((validators.length * 2) / 3) + 1;
      
      if (calculatedThreshold > validators.length) {
        throw new Error('Threshold cannot exceed number of validators');
      }

      // Generate key pairs for validators
      const keyPairs = await this.generateValidatorKeys(
        validators,
        scheme,
        calculatedThreshold
      );

      // Create threshold signature scheme
      const thresholdScheme: ThresholdSignatureScheme = {
        scheme,
        threshold: calculatedThreshold,
        totalValidators: validators.length,
        publicKeys: keyPairs.map(kp => kp.publicKey),
        aggregatePublicKey: await this.generateAggregatePublicKey(keyPairs, scheme),
        parameters: this.getSchemeParameters(scheme)
      };

      // Create validator info
      const validatorInfos: ValidatorInfo[] = validators.map((validatorId, index) => ({
        validatorId,
        publicKey: keyPairs[index].publicKey,
        weight: 1, // Equal weight for now
        role: 'primary',
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        reputation: 100, // Start with perfect reputation
        slashingHistory: []
      }));

      const validatorSet: ValidatorSet = {
        daoSubnet,
        validators: validatorInfos,
        scheme: thresholdScheme,
        epoch: 1,
        activeFrom: new Date().toISOString(),
        rotationPolicy: {
          rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
          maxValidatorAge: 90 * 24 * 60 * 60 * 1000, // 90 days
          minValidators: 3,
          maxValidators: 21
        }
      };

      // Store validator set and keys
      this.validatorSetsCache.set(daoSubnet, validatorSet);
      this.validatorKeysCache.set(daoSubnet, keyPairs);

      // Emit validator set initialization event
      qflowEventEmitter.emit('q.qflow.validators.initialized.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: 'system',
        data: {
          daoSubnet,
          validatorCount: validators.length,
          threshold: calculatedThreshold,
          scheme,
          epoch: validatorSet.epoch
        }
      });

      return validatorSet;

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to initialize validator set: ${error}`);
      throw error;
    }
  }

  /**
   * Request threshold signature for critical operation
   */
  async requestThresholdSignature(
    daoSubnet: string,
    message: string,
    purpose: ThresholdSignature['purpose'],
    metadata: ThresholdSignature['metadata'],
    expirationMinutes: number = 60
  ): Promise<string> {
    try {
      const validatorSet = this.validatorSetsCache.get(daoSubnet);
      if (!validatorSet) {
        throw new Error('Validator set not found for DAO subnet');
      }

      const signatureId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const messageHash = await this.hashMessage(message);
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

      const thresholdSignature: ThresholdSignature = {
        id: signatureId,
        daoSubnet,
        message,
        messageHash,
        scheme: validatorSet.scheme,
        shares: [],
        status: 'collecting',
        requiredShares: validatorSet.scheme.threshold,
        collectedShares: 0,
        createdAt: new Date().toISOString(),
        expiresAt,
        purpose,
        metadata
      };

      this.signatureRequestsCache.set(signatureId, thresholdSignature);

      // Emit signature request event
      qflowEventEmitter.emit('q.qflow.signature.requested.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: metadata.initiatedBy,
        data: {
          signatureId,
          daoSubnet,
          purpose,
          requiredShares: thresholdSignature.requiredShares,
          expiresAt,
          criticalOperation: metadata.criticalOperation
        }
      });

      return signatureId;

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to request signature: ${error}`);
      throw error;
    }
  }

  /**
   * Submit signature share from validator
   */
  async submitSignatureShare(
    signatureId: string,
    validatorId: string,
    signature: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const signatureRequest = this.signatureRequestsCache.get(signatureId);
      if (!signatureRequest) {
        throw new Error('Signature request not found');
      }

      if (signatureRequest.status !== 'collecting') {
        throw new Error('Signature request is not collecting shares');
      }

      if (new Date() > new Date(signatureRequest.expiresAt)) {
        signatureRequest.status = 'expired';
        throw new Error('Signature request has expired');
      }

      const validatorSet = this.validatorSetsCache.get(signatureRequest.daoSubnet);
      if (!validatorSet) {
        throw new Error('Validator set not found');
      }

      // Verify validator is in the set
      const validator = validatorSet.validators.find(v => v.validatorId === validatorId);
      if (!validator) {
        throw new Error('Validator not found in validator set');
      }

      if (validator.status !== 'active') {
        throw new Error('Validator is not active');
      }

      // Check if validator already submitted a share
      const existingShare = signatureRequest.shares.find(s => s.validatorId === validatorId);
      if (existingShare) {
        throw new Error('Validator has already submitted a signature share');
      }

      // Verify signature share
      const isValid = await this.verifySignatureShare(
        signature,
        signatureRequest.messageHash,
        validator.publicKey,
        signatureRequest.scheme.scheme
      );

      if (!isValid) {
        // Record slashing event for invalid signature
        await this.recordSlashingEvent(
          validatorId,
          'malicious_behavior',
          'minor',
          'Invalid signature share submitted',
          'system'
        );
        throw new Error('Invalid signature share');
      }

      // Add signature share
      const signatureShare: SignatureShare = {
        validatorId,
        keyIndex: validator.publicKey.length, // Simplified index
        signature,
        message: signatureRequest.message,
        messageHash: signatureRequest.messageHash,
        timestamp: new Date().toISOString(),
        metadata
      };

      signatureRequest.shares.push(signatureShare);
      signatureRequest.collectedShares = signatureRequest.shares.length;

      // Update validator activity
      validator.lastActivity = new Date().toISOString();
      validator.reputation = Math.min(100, validator.reputation + 1); // Reward for participation

      // Check if we have enough shares
      if (signatureRequest.collectedShares >= signatureRequest.requiredShares) {
        await this.aggregateSignature(signatureRequest);
      }

      // Emit signature share submitted event
      qflowEventEmitter.emit('q.qflow.signature.share.submitted.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: validatorId,
        data: {
          signatureId,
          validatorId,
          collectedShares: signatureRequest.collectedShares,
          requiredShares: signatureRequest.requiredShares,
          complete: signatureRequest.status === 'complete'
        }
      });

      return true;

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to submit signature share: ${error}`);
      return false;
    }
  }

  /**
   * Create critical operation requiring Byzantine fault tolerance
   */
  async createCriticalOperation(
    type: CriticalOperation['type'],
    daoSubnet: string,
    description: string,
    data: any,
    initiatedBy: string,
    deadlineMinutes: number = 120
  ): Promise<string> {
    try {
      const validatorSet = this.validatorSetsCache.get(daoSubnet);
      if (!validatorSet) {
        throw new Error('Validator set not found for DAO subnet');
      }

      // For Byzantine fault tolerance, require 2f+1 signatures where f is max faulty validators
      const maxFaultyValidators = Math.floor((validatorSet.validators.length - 1) / 3);
      const requiredSignatures = 2 * maxFaultyValidators + 1;

      const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const deadline = new Date(Date.now() + deadlineMinutes * 60 * 1000).toISOString();

      const criticalOperation: CriticalOperation = {
        id: operationId,
        type,
        daoSubnet,
        description,
        data,
        requiredSignatures,
        collectedSignatures: 0,
        signatures: [],
        status: 'pending',
        initiatedBy,
        initiatedAt: new Date().toISOString(),
        deadline,
        byzantineFaultTolerant: true
      };

      this.criticalOperationsCache.set(operationId, criticalOperation);

      // Create signature request for this operation
      const signatureId = await this.requestThresholdSignature(
        daoSubnet,
        JSON.stringify({ operationId, type, data }),
        'step_commit',
        {
          initiatedBy,
          criticalOperation: true,
          stepId: operationId
        },
        deadlineMinutes
      );

      criticalOperation.signatures.push(
        this.signatureRequestsCache.get(signatureId)!
      );

      // Emit critical operation created event
      qflowEventEmitter.emit('q.qflow.critical.operation.created.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: initiatedBy,
        data: {
          operationId,
          type,
          daoSubnet,
          requiredSignatures,
          byzantineFaultTolerant: true,
          deadline
        }
      });

      return operationId;

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to create critical operation: ${error}`);
      throw error;
    }
  }

  /**
   * Get validator set for DAO subnet
   */
  async getValidatorSet(daoSubnet: string): Promise<ValidatorSet | null> {
    try {
      return this.validatorSetsCache.get(daoSubnet) || null;
    } catch (error) {
      console.error(`[ThresholdSignature] Failed to get validator set: ${error}`);
      return null;
    }
  }

  /**
   * Get signature request status
   */
  async getSignatureRequest(signatureId: string): Promise<ThresholdSignature | null> {
    try {
      return this.signatureRequestsCache.get(signatureId) || null;
    } catch (error) {
      console.error(`[ThresholdSignature] Failed to get signature request: ${error}`);
      return null;
    }
  }

  /**
   * Get critical operation status
   */
  async getCriticalOperation(operationId: string): Promise<CriticalOperation | null> {
    try {
      return this.criticalOperationsCache.get(operationId) || null;
    } catch (error) {
      console.error(`[ThresholdSignature] Failed to get critical operation: ${error}`);
      return null;
    }
  }

  /**
   * Rotate validator set
   */
  async rotateValidatorSet(
    daoSubnet: string,
    newValidators: string[],
    rotatedBy: string
  ): Promise<boolean> {
    try {
      const currentSet = this.validatorSetsCache.get(daoSubnet);
      if (!currentSet) {
        throw new Error('Current validator set not found');
      }

      // Create new validator set
      const newSet = await this.initializeValidatorSet(
        daoSubnet,
        newValidators,
        currentSet.scheme.scheme,
        currentSet.scheme.threshold
      );

      newSet.epoch = currentSet.epoch + 1;
      
      // Mark old set as inactive
      currentSet.activeUntil = new Date().toISOString();

      // Emit validator rotation event
      qflowEventEmitter.emit('q.qflow.validators.rotated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: rotatedBy,
        data: {
          daoSubnet,
          previousEpoch: currentSet.epoch,
          newEpoch: newSet.epoch,
          previousValidators: currentSet.validators.map(v => v.validatorId),
          newValidators: newSet.validators.map(v => v.validatorId)
        }
      });

      return true;

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to rotate validator set: ${error}`);
      return false;
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Check for expired signature requests
    setInterval(() => {
      this.checkExpiredSignatures();
    }, 60 * 1000); // Every minute

    // Check for validator rotation needs
    setInterval(() => {
      this.checkValidatorRotation();
    }, 60 * 60 * 1000); // Every hour

    // Update validator reputation
    setInterval(() => {
      this.updateValidatorReputations();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private initializeDefaultSchemes(): void {
    // Initialize default cryptographic parameters
    console.log('[ThresholdSignature] Initialized default signature schemes');
  }

  private async generateValidatorKeys(
    validators: string[],
    scheme: 'BLS' | 'Dilithium' | 'ECDSA',
    threshold: number
  ): Promise<ValidatorKeyPair[]> {
    try {
      const keyPairs: ValidatorKeyPair[] = [];

      for (let i = 0; i < validators.length; i++) {
        // For prototype, generate mock keys
        // In production, would use proper cryptographic key generation
        const keyPair: ValidatorKeyPair = {
          validatorId: validators[i],
          publicKey: `${scheme}_pub_${validators[i]}_${Date.now()}`,
          privateKeyShare: `${scheme}_priv_${validators[i]}_${Date.now()}`,
          keyIndex: i,
          threshold,
          totalValidators: validators.length,
          createdAt: new Date().toISOString()
        };

        keyPairs.push(keyPair);
      }

      return keyPairs;

    } catch (error) {
      console.error(`[ThresholdSignature] Key generation failed: ${error}`);
      throw error;
    }
  }

  private async generateAggregatePublicKey(
    keyPairs: ValidatorKeyPair[],
    scheme: 'BLS' | 'Dilithium' | 'ECDSA'
  ): Promise<string> {
    try {
      // For prototype, create mock aggregate key
      // In production, would properly aggregate public keys based on scheme
      const publicKeys = keyPairs.map(kp => kp.publicKey).join('|');
      return `${scheme}_aggregate_${this.hashString(publicKeys)}`;

    } catch (error) {
      console.error(`[ThresholdSignature] Aggregate key generation failed: ${error}`);
      throw error;
    }
  }

  private getSchemeParameters(scheme: 'BLS' | 'Dilithium' | 'ECDSA'): ThresholdSignatureScheme['parameters'] {
    switch (scheme) {
      case 'BLS':
        return {
          curve: 'BLS12-381',
          hashFunction: 'SHA-256'
        };
      case 'Dilithium':
        return {
          securityLevel: 3,
          hashFunction: 'SHAKE-256'
        };
      case 'ECDSA':
        return {
          curve: 'secp256k1',
          hashFunction: 'SHA-256'
        };
      default:
        return { hashFunction: 'SHA-256' };
    }
  }

  private async hashMessage(message: string): Promise<string> {
    try {
      // For prototype, use simple hash
      // In production, would use proper cryptographic hash
      return this.hashString(message);
    } catch (error) {
      console.error(`[ThresholdSignature] Message hashing failed: ${error}`);
      throw error;
    }
  }

  private async verifySignatureShare(
    signature: string,
    messageHash: string,
    publicKey: string,
    scheme: 'BLS' | 'Dilithium' | 'ECDSA'
  ): Promise<boolean> {
    try {
      // For prototype, perform basic validation
      // In production, would use proper cryptographic verification
      return signature.length > 10 && 
             messageHash.length > 0 && 
             publicKey.length > 0 &&
             signature.includes(scheme);

    } catch (error) {
      console.error(`[ThresholdSignature] Signature verification failed: ${error}`);
      return false;
    }
  }

  private async aggregateSignature(signatureRequest: ThresholdSignature): Promise<void> {
    try {
      // For prototype, create mock aggregated signature
      // In production, would properly aggregate signature shares
      const shareSignatures = signatureRequest.shares.map(s => s.signature).join('|');
      signatureRequest.aggregatedSignature = `${signatureRequest.scheme.scheme}_agg_${this.hashString(shareSignatures)}`;
      signatureRequest.status = 'complete';
      signatureRequest.completedAt = new Date().toISOString();

      // Emit signature completed event
      qflowEventEmitter.emit('q.qflow.signature.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-threshold-signatures',
        actor: 'system',
        data: {
          signatureId: signatureRequest.id,
          daoSubnet: signatureRequest.daoSubnet,
          purpose: signatureRequest.purpose,
          collectedShares: signatureRequest.collectedShares,
          aggregatedSignature: signatureRequest.aggregatedSignature
        }
      });

    } catch (error) {
      console.error(`[ThresholdSignature] Signature aggregation failed: ${error}`);
      signatureRequest.status = 'failed';
    }
  }

  private async recordSlashingEvent(
    validatorId: string,
    reason: SlashingEvent['reason'],
    severity: SlashingEvent['severity'],
    evidence: string,
    reportedBy: string
  ): Promise<void> {
    try {
      // Find validator in all sets
      for (const validatorSet of this.validatorSetsCache.values()) {
        const validator = validatorSet.validators.find(v => v.validatorId === validatorId);
        if (validator) {
          const slashingEvent: SlashingEvent = {
            id: `slash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            validatorId,
            reason,
            severity,
            penalty: this.calculateSlashingPenalty(severity),
            evidence,
            reportedBy,
            reportedAt: new Date().toISOString(),
            resolved: false
          };

          validator.slashingHistory.push(slashingEvent);
          validator.reputation = Math.max(0, validator.reputation - slashingEvent.penalty);

          // If reputation is too low, mark as compromised
          if (validator.reputation < 20) {
            validator.status = 'compromised';
          }

          // Emit slashing event
          qflowEventEmitter.emit('q.qflow.validator.slashed.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-threshold-signatures',
            actor: reportedBy,
            data: {
              validatorId,
              reason,
              severity,
              penalty: slashingEvent.penalty,
              newReputation: validator.reputation,
              daoSubnet: validatorSet.daoSubnet
            }
          });

          break;
        }
      }

    } catch (error) {
      console.error(`[ThresholdSignature] Failed to record slashing event: ${error}`);
    }
  }

  private calculateSlashingPenalty(severity: SlashingEvent['severity']): number {
    switch (severity) {
      case 'warning': return 1;
      case 'minor': return 5;
      case 'major': return 15;
      case 'critical': return 50;
      default: return 5;
    }
  }

  private async checkExpiredSignatures(): Promise<void> {
    try {
      const now = new Date();

      for (const [signatureId, signature] of this.signatureRequestsCache.entries()) {
        if (signature.status === 'collecting' && new Date(signature.expiresAt) < now) {
          signature.status = 'expired';

          // Emit expiration event
          qflowEventEmitter.emit('q.qflow.signature.expired.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-threshold-signatures',
            actor: 'system',
            data: {
              signatureId,
              daoSubnet: signature.daoSubnet,
              purpose: signature.purpose,
              collectedShares: signature.collectedShares,
              requiredShares: signature.requiredShares
            }
          });
        }
      }

    } catch (error) {
      console.error(`[ThresholdSignature] Expired signature check failed: ${error}`);
    }
  }

  private async checkValidatorRotation(): Promise<void> {
    try {
      const now = new Date();

      for (const [daoSubnet, validatorSet] of this.validatorSetsCache.entries()) {
        const ageMs = now.getTime() - new Date(validatorSet.activeFrom).getTime();
        
        if (ageMs > validatorSet.rotationPolicy.rotationInterval) {
          // Emit rotation needed event
          qflowEventEmitter.emit('q.qflow.validators.rotation.needed.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-threshold-signatures',
            actor: 'system',
            data: {
              daoSubnet,
              currentEpoch: validatorSet.epoch,
              ageMs,
              rotationInterval: validatorSet.rotationPolicy.rotationInterval
            }
          });
        }
      }

    } catch (error) {
      console.error(`[ThresholdSignature] Validator rotation check failed: ${error}`);
    }
  }

  private async updateValidatorReputations(): Promise<void> {
    try {
      // Update validator reputations based on activity and performance
      for (const validatorSet of this.validatorSetsCache.values()) {
        for (const validator of validatorSet.validators) {
          const daysSinceActivity = (Date.now() - new Date(validator.lastActivity).getTime()) / (24 * 60 * 60 * 1000);
          
          // Penalize inactivity
          if (daysSinceActivity > 7) {
            validator.reputation = Math.max(0, validator.reputation - Math.floor(daysSinceActivity));
          }

          // Mark as inactive if reputation is very low
          if (validator.reputation < 10 && validator.status === 'active') {
            validator.status = 'inactive';
          }
        }
      }

    } catch (error) {
      console.error(`[ThresholdSignature] Reputation update failed: ${error}`);
    }
  }

  private hashString(input: string): string {
    // Simple hash for prototype
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const thresholdSignatureService = new ThresholdSignatureService();