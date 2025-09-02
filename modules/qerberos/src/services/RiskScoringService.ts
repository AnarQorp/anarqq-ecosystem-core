/**
 * Risk Scoring Service
 * Provides ML-based risk assessment for identities and operations
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description?: string;
}

export interface RiskScoreRequest {
  identity: string;
  operation?: string;
  context?: Record<string, any>;
  factors?: string[];
}

export interface RiskScoreResult {
  identity: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  timestamp: string;
  expiresAt: string;
  operation?: string;
  context?: Record<string, any>;
  modelVersion: string;
}

export interface IdentityRiskProfile {
  identity: string;
  baselineScore: number;
  recentActivity: {
    loginFrequency: number;
    failedAttempts: number;
    unusualLocations: number;
    deviceChanges: number;
  };
  historicalPatterns: {
    averageSessionDuration: number;
    typicalAccessTimes: number[];
    commonOperations: string[];
  };
  lastUpdated: string;
}

export class RiskScoringService {
  private riskScoreCache: Map<string, RiskScoreResult> = new Map();
  private identityProfiles: Map<string, IdentityRiskProfile> = new Map();
  private modelVersion = '1.2.3';

  constructor() {
    // Initialize with some mock identity profiles for demonstration
    this.initializeMockProfiles();
  }

  /**
   * Calculate risk score for an identity or operation
   */
  async calculateRiskScore(request: RiskScoreRequest): Promise<RiskScoreResult> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache first
      const cachedResult = this.riskScoreCache.get(cacheKey);
      if (cachedResult && new Date(cachedResult.expiresAt) > new Date()) {
        logger.debug('Risk score retrieved from cache', {
          identity: request.identity,
          score: cachedResult.score
        });
        return cachedResult;
      }

      // Calculate new risk score
      const riskScore = await this.performRiskAssessment(request);

      // Cache the result
      this.riskScoreCache.set(cacheKey, riskScore);

      logger.info('Risk score calculated', {
        identity: request.identity,
        score: riskScore.score,
        level: riskScore.level,
        operation: request.operation
      });

      return riskScore;

    } catch (error) {
      logger.error('Failed to calculate risk score', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
      throw error;
    }
  }

  /**
   * Get cached risk score for an identity
   */
  async getIdentityRiskScore(identity: string): Promise<RiskScoreResult | null> {
    try {
      // Look for any cached score for this identity
      for (const [key, score] of this.riskScoreCache.entries()) {
        if (key.startsWith(`${identity}:`) && new Date(score.expiresAt) > new Date()) {
          return score;
        }
      }

      // If no cached score, calculate a basic one
      const basicRequest: RiskScoreRequest = { identity };
      return await this.calculateRiskScore(basicRequest);

    } catch (error) {
      logger.error('Failed to get identity risk score', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identity
      });
      throw error;
    }
  }

  /**
   * Update identity risk profile based on new activity
   */
  async updateIdentityProfile(identity: string, activity: {
    operation?: string;
    success?: boolean;
    location?: string;
    device?: string;
    sessionDuration?: number;
  }): Promise<void> {
    try {
      let profile = this.identityProfiles.get(identity);
      
      if (!profile) {
        profile = this.createDefaultProfile(identity);
        this.identityProfiles.set(identity, profile);
      }

      // Update profile based on activity
      if (activity.success === false) {
        profile.recentActivity.failedAttempts++;
      }

      if (activity.location) {
        // Simulate location analysis
        const isUnusualLocation = Math.random() > 0.8;
        if (isUnusualLocation) {
          profile.recentActivity.unusualLocations++;
        }
      }

      if (activity.device) {
        // Simulate device change detection
        const isNewDevice = Math.random() > 0.9;
        if (isNewDevice) {
          profile.recentActivity.deviceChanges++;
        }
      }

      if (activity.sessionDuration) {
        // Update average session duration
        profile.historicalPatterns.averageSessionDuration = 
          (profile.historicalPatterns.averageSessionDuration + activity.sessionDuration) / 2;
      }

      profile.lastUpdated = new Date().toISOString();

      // Invalidate cached risk scores for this identity
      this.invalidateIdentityCache(identity);

      logger.debug('Identity profile updated', {
        identity,
        activity
      });

    } catch (error) {
      logger.error('Failed to update identity profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identity,
        activity
      });
      throw error;
    }
  }

  /**
   * Get risk statistics
   */
  async getRiskStatistics(): Promise<{
    totalAssessments: number;
    riskDistribution: Record<string, number>;
    averageScore: number;
    highRiskIdentities: string[];
    recentAssessments: RiskScoreResult[];
  }> {
    try {
      const assessments = Array.from(this.riskScoreCache.values());
      
      const riskDistribution: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      let totalScore = 0;
      const highRiskIdentities: string[] = [];

      assessments.forEach(assessment => {
        riskDistribution[assessment.level]++;
        totalScore += assessment.score;
        
        if (assessment.level === 'high' || assessment.level === 'critical') {
          highRiskIdentities.push(assessment.identity);
        }
      });

      const averageScore = assessments.length > 0 ? totalScore / assessments.length : 0;

      // Get recent assessments (last 10)
      const recentAssessments = assessments
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        totalAssessments: assessments.length,
        riskDistribution,
        averageScore,
        highRiskIdentities: [...new Set(highRiskIdentities)],
        recentAssessments
      };

    } catch (error) {
      logger.error('Failed to get risk statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform the actual risk assessment
   */
  private async performRiskAssessment(request: RiskScoreRequest): Promise<RiskScoreResult> {
    const profile = this.identityProfiles.get(request.identity) || this.createDefaultProfile(request.identity);
    
    // Calculate risk factors
    const factors: RiskFactor[] = [];

    // Factor 1: Login frequency (higher frequency = lower risk)
    const loginFrequency = profile.recentActivity.loginFrequency;
    const loginFrequencyScore = Math.max(0, Math.min(1, loginFrequency / 10));
    factors.push({
      name: 'login_frequency',
      weight: 0.2,
      value: 1 - loginFrequencyScore, // Invert: high frequency = low risk
      description: 'Recent login frequency indicates user activity patterns'
    });

    // Factor 2: Failed attempts (more failures = higher risk)
    const failedAttempts = profile.recentActivity.failedAttempts;
    const failedAttemptsScore = Math.min(1, failedAttempts / 5);
    factors.push({
      name: 'failed_attempts',
      weight: 0.3,
      value: failedAttemptsScore,
      description: 'Number of recent failed authentication attempts'
    });

    // Factor 3: Unusual locations (more unusual = higher risk)
    const unusualLocations = profile.recentActivity.unusualLocations;
    const locationScore = Math.min(1, unusualLocations / 3);
    factors.push({
      name: 'geo_location',
      weight: 0.25,
      value: locationScore,
      description: 'Access from unusual geographic locations'
    });

    // Factor 4: Device changes (more changes = higher risk)
    const deviceChanges = profile.recentActivity.deviceChanges;
    const deviceScore = Math.min(1, deviceChanges / 2);
    factors.push({
      name: 'device_trust',
      weight: 0.25,
      value: deviceScore,
      description: 'Recent device changes and trust level'
    });

    // Add operation-specific factors
    if (request.operation) {
      factors.push(...this.getOperationSpecificFactors(request.operation, request.context));
    }

    // Calculate weighted score
    let totalWeight = 0;
    let weightedScore = 0;

    factors.forEach(factor => {
      totalWeight += factor.weight;
      weightedScore += factor.value * factor.weight;
    });

    const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (normalizedScore < 0.3) {
      level = 'low';
    } else if (normalizedScore < 0.6) {
      level = 'medium';
    } else if (normalizedScore < 0.8) {
      level = 'high';
    } else {
      level = 'critical';
    }

    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + config.ml.riskScoreCacheTtl * 1000).toISOString();

    return {
      identity: request.identity,
      score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
      level,
      factors,
      timestamp,
      expiresAt,
      operation: request.operation,
      context: request.context,
      modelVersion: this.modelVersion
    };
  }

  /**
   * Get operation-specific risk factors
   */
  private getOperationSpecificFactors(operation: string, context?: Record<string, any>): RiskFactor[] {
    const factors: RiskFactor[] = [];

    switch (operation) {
      case 'file_access':
        factors.push({
          name: 'file_sensitivity',
          weight: 0.15,
          value: context?.sensitivity === 'high' ? 0.8 : 0.2,
          description: 'Sensitivity level of accessed file'
        });
        break;

      case 'payment':
        const amount = context?.amount || 0;
        factors.push({
          name: 'transaction_amount',
          weight: 0.2,
          value: Math.min(1, amount / 10000), // Normalize to $10k
          description: 'Transaction amount risk factor'
        });
        break;

      case 'admin_operation':
        factors.push({
          name: 'admin_privilege',
          weight: 0.3,
          value: 0.7, // Admin operations are inherently risky
          description: 'Administrative operation risk'
        });
        break;
    }

    return factors;
  }

  /**
   * Generate cache key for risk score
   */
  private generateCacheKey(request: RiskScoreRequest): string {
    const contextHash = request.context ? 
      require('crypto').createHash('md5').update(JSON.stringify(request.context)).digest('hex').substring(0, 8) : 
      'none';
    
    return `${request.identity}:${request.operation || 'default'}:${contextHash}`;
  }

  /**
   * Create default profile for new identity
   */
  private createDefaultProfile(identity: string): IdentityRiskProfile {
    return {
      identity,
      baselineScore: 0.3, // Default medium-low risk
      recentActivity: {
        loginFrequency: 5, // Average logins per day
        failedAttempts: 0,
        unusualLocations: 0,
        deviceChanges: 0
      },
      historicalPatterns: {
        averageSessionDuration: 1800, // 30 minutes
        typicalAccessTimes: [9, 10, 11, 14, 15, 16], // Business hours
        commonOperations: ['login', 'file_access', 'logout']
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Initialize mock profiles for demonstration
   */
  private initializeMockProfiles(): void {
    // High-risk user
    this.identityProfiles.set('did:squid:highrisk123', {
      identity: 'did:squid:highrisk123',
      baselineScore: 0.7,
      recentActivity: {
        loginFrequency: 2,
        failedAttempts: 8,
        unusualLocations: 3,
        deviceChanges: 2
      },
      historicalPatterns: {
        averageSessionDuration: 300, // 5 minutes - very short
        typicalAccessTimes: [2, 3, 4], // Unusual hours
        commonOperations: ['login', 'admin_operation', 'file_access']
      },
      lastUpdated: new Date().toISOString()
    });

    // Low-risk user
    this.identityProfiles.set('did:squid:lowrisk456', {
      identity: 'did:squid:lowrisk456',
      baselineScore: 0.1,
      recentActivity: {
        loginFrequency: 8,
        failedAttempts: 0,
        unusualLocations: 0,
        deviceChanges: 0
      },
      historicalPatterns: {
        averageSessionDuration: 2400, // 40 minutes
        typicalAccessTimes: [9, 10, 11, 14, 15, 16],
        commonOperations: ['login', 'file_access', 'logout']
      },
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Invalidate cached risk scores for an identity
   */
  private invalidateIdentityCache(identity: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.riskScoreCache.keys()) {
      if (key.startsWith(`${identity}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.riskScoreCache.delete(key));
    
    logger.debug('Risk score cache invalidated for identity', {
      identity,
      deletedKeys: keysToDelete.length
    });
  }
}