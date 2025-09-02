/**
 * Security Context Utility
 * Manages device verification, security policies, and threat detection
 */

import { IdentityType, PrivacyLevel } from '../types/identity';
import { SecuritySettings } from '../types/wallet-config';

export interface SecurityContext {
  identityId: string;
  identityType: IdentityType;
  deviceId: string;
  sessionId: string;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FAILED' | 'EXPIRED';
  lastVerification: string;
  permissions: SecurityPermission[];
  restrictions: SecurityRestriction[];
  auditRequired: boolean;
}

export interface SecurityPermission {
  action: string;
  resource: string;
  granted: boolean;
  conditions?: string[];
  expiresAt?: string;
}

export interface SecurityRestriction {
  type: 'RATE_LIMIT' | 'AMOUNT_LIMIT' | 'TIME_WINDOW' | 'DEVICE_LOCK' | 'LOCATION_LOCK';
  description: string;
  active: boolean;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface SecurityThreat {
  id: string;
  type: 'SUSPICIOUS_DEVICE' | 'UNUSUAL_PATTERN' | 'RATE_LIMIT_EXCEEDED' | 'LOCATION_ANOMALY' | 'TIME_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface SecurityPolicy {
  identityType: IdentityType;
  minSecurityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresDeviceVerification: boolean;
  requiresBiometric: boolean;
  requires2FA: boolean;
  maxSessionDuration: number; // minutes
  maxConcurrentSessions: number;
  allowedDevices?: string[];
  blockedDevices?: string[];
  allowedLocations?: string[];
  blockedLocations?: string[];
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export class SecurityContextManager {
  private static instance: SecurityContextManager;
  private contexts: Map<string, SecurityContext> = new Map();
  private policies: Map<IdentityType, SecurityPolicy> = new Map();
  private threats: Map<string, SecurityThreat[]> = new Map();
  private sessionMonitor: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultPolicies();
    this.startSessionMonitoring();
  }

  static getInstance(): SecurityContextManager {
    if (!SecurityContextManager.instance) {
      SecurityContextManager.instance = new SecurityContextManager();
    }
    return SecurityContextManager.instance;
  }

  // Create security context for identity
  createSecurityContext(
    identityId: string,
    identityType: IdentityType,
    deviceId: string,
    sessionId: string
  ): SecurityContext {
    const policy = this.getSecurityPolicy(identityType);
    
    const context: SecurityContext = {
      identityId,
      identityType,
      deviceId,
      sessionId,
      securityLevel: policy.minSecurityLevel,
      threatLevel: 'NONE',
      verificationStatus: 'PENDING',
      lastVerification: new Date().toISOString(),
      permissions: this.generateDefaultPermissions(identityType),
      restrictions: [],
      auditRequired: this.shouldRequireAudit(identityType)
    };

    this.contexts.set(identityId, context);
    console.log(`[SecurityContext] Created security context for identity: ${identityId}`);
    
    return context;
  }

  // Get security context
  getSecurityContext(identityId: string): SecurityContext | null {
    return this.contexts.get(identityId) || null;
  }

  // Update security context
  updateSecurityContext(identityId: string, updates: Partial<SecurityContext>): boolean {
    const context = this.contexts.get(identityId);
    if (!context) {
      return false;
    }

    const updatedContext = { ...context, ...updates };
    this.contexts.set(identityId, updatedContext);
    
    console.log(`[SecurityContext] Updated security context for identity: ${identityId}`);
    return true;
  }

  // Verify device for identity
  async verifyDevice(identityId: string, deviceFingerprint: any): Promise<{
    verified: boolean;
    securityLevel: SecurityContext['securityLevel'];
    restrictions: SecurityRestriction[];
    threats: SecurityThreat[];
  }> {
    const context = this.getSecurityContext(identityId);
    if (!context) {
      return {
        verified: false,
        securityLevel: 'CRITICAL',
        restrictions: [this.createDeviceLockRestriction('Security context not found')],
        threats: []
      };
    }

    const policy = this.getSecurityPolicy(context.identityType);
    
    // Check if device verification is required
    if (!policy.requiresDeviceVerification) {
      this.updateSecurityContext(identityId, {
        verificationStatus: 'VERIFIED',
        lastVerification: new Date().toISOString()
      });
      
      return {
        verified: true,
        securityLevel: context.securityLevel,
        restrictions: [],
        threats: []
      };
    }

    // Perform device verification
    const verificationResult = await this.performDeviceVerification(
      context,
      deviceFingerprint,
      policy
    );

    // Update context based on verification result
    this.updateSecurityContext(identityId, {
      verificationStatus: verificationResult.verified ? 'VERIFIED' : 'FAILED',
      securityLevel: verificationResult.securityLevel,
      threatLevel: verificationResult.threatLevel,
      lastVerification: new Date().toISOString(),
      restrictions: verificationResult.restrictions
    });

    // Record threats if any
    if (verificationResult.threats.length > 0) {
      this.recordThreats(identityId, verificationResult.threats);
    }

    return {
      verified: verificationResult.verified,
      securityLevel: verificationResult.securityLevel,
      restrictions: verificationResult.restrictions,
      threats: verificationResult.threats
    };
  }

  // Check if action is permitted
  checkPermission(identityId: string, action: string, resource: string): {
    permitted: boolean;
    reason: string;
    restrictions: SecurityRestriction[];
  } {
    const context = this.getSecurityContext(identityId);
    if (!context) {
      return {
        permitted: false,
        reason: 'Security context not found',
        restrictions: []
      };
    }

    // Check verification status
    if (context.verificationStatus !== 'VERIFIED') {
      return {
        permitted: false,
        reason: 'Device not verified',
        restrictions: [this.createDeviceLockRestriction('Device verification required')]
      };
    }

    // Check permissions
    const permission = context.permissions.find(p => 
      p.action === action && p.resource === resource
    );

    if (!permission || !permission.granted) {
      return {
        permitted: false,
        reason: 'Permission not granted',
        restrictions: []
      };
    }

    // Check if permission has expired
    if (permission.expiresAt && new Date() > new Date(permission.expiresAt)) {
      return {
        permitted: false,
        reason: 'Permission expired',
        restrictions: []
      };
    }

    // Check active restrictions
    const activeRestrictions = context.restrictions.filter(r => 
      r.active && (!r.expiresAt || new Date() < new Date(r.expiresAt))
    );

    const blockingRestrictions = activeRestrictions.filter(r => 
      this.restrictionBlocksAction(r, action, resource)
    );

    if (blockingRestrictions.length > 0) {
      return {
        permitted: false,
        reason: 'Action blocked by security restrictions',
        restrictions: blockingRestrictions
      };
    }

    return {
      permitted: true,
      reason: 'Permission granted',
      restrictions: activeRestrictions
    };
  }

  // Add security restriction
  addRestriction(identityId: string, restriction: SecurityRestriction): boolean {
    const context = this.getSecurityContext(identityId);
    if (!context) {
      return false;
    }

    context.restrictions.push(restriction);
    this.updateSecurityContext(identityId, { restrictions: context.restrictions });
    
    console.log(`[SecurityContext] Added restriction for identity: ${identityId}`, restriction);
    return true;
  }

  // Remove security restriction
  removeRestriction(identityId: string, restrictionType: SecurityRestriction['type']): boolean {
    const context = this.getSecurityContext(identityId);
    if (!context) {
      return false;
    }

    const filteredRestrictions = context.restrictions.filter(r => r.type !== restrictionType);
    this.updateSecurityContext(identityId, { restrictions: filteredRestrictions });
    
    console.log(`[SecurityContext] Removed restriction for identity: ${identityId}`, restrictionType);
    return true;
  }

  // Record security threat
  recordThreat(identityId: string, threat: SecurityThreat): void {
    const threats = this.threats.get(identityId) || [];
    threats.push(threat);
    this.threats.set(identityId, threats);

    // Update threat level in context
    const context = this.getSecurityContext(identityId);
    if (context) {
      const maxThreatLevel = this.calculateMaxThreatLevel(threats);
      this.updateSecurityContext(identityId, { threatLevel: maxThreatLevel });
    }

    console.log(`[SecurityContext] Recorded threat for identity: ${identityId}`, threat);
  }

  // Get threats for identity
  getThreats(identityId: string): SecurityThreat[] {
    return this.threats.get(identityId) || [];
  }

  // Resolve threat
  resolveThreat(identityId: string, threatId: string): boolean {
    const threats = this.threats.get(identityId) || [];
    const threat = threats.find(t => t.id === threatId);
    
    if (!threat) {
      return false;
    }

    threat.resolved = true;
    threat.resolvedAt = new Date().toISOString();
    
    // Recalculate threat level
    const context = this.getSecurityContext(identityId);
    if (context) {
      const maxThreatLevel = this.calculateMaxThreatLevel(threats);
      this.updateSecurityContext(identityId, { threatLevel: maxThreatLevel });
    }

    console.log(`[SecurityContext] Resolved threat: ${threatId} for identity: ${identityId}`);
    return true;
  }

  // Get security policy for identity type
  getSecurityPolicy(identityType: IdentityType): SecurityPolicy {
    return this.policies.get(identityType) || this.getDefaultPolicy();
  }

  // Update security policy
  updateSecurityPolicy(identityType: IdentityType, policy: Partial<SecurityPolicy>): boolean {
    const currentPolicy = this.getSecurityPolicy(identityType);
    const updatedPolicy = { ...currentPolicy, ...policy };
    this.policies.set(identityType, updatedPolicy);
    
    console.log(`[SecurityContext] Updated security policy for identity type: ${identityType}`);
    return true;
  }

  // Clean up expired contexts and threats
  cleanup(): void {
    const now = new Date();
    
    // Clean up expired permissions
    for (const [identityId, context] of this.contexts.entries()) {
      const validPermissions = context.permissions.filter(p => 
        !p.expiresAt || new Date(p.expiresAt) > now
      );
      
      const validRestrictions = context.restrictions.filter(r => 
        !r.expiresAt || new Date(r.expiresAt) > now
      );

      if (validPermissions.length !== context.permissions.length || 
          validRestrictions.length !== context.restrictions.length) {
        this.updateSecurityContext(identityId, {
          permissions: validPermissions,
          restrictions: validRestrictions
        });
      }
    }

    // Clean up old resolved threats (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [identityId, threats] of this.threats.entries()) {
      const filteredThreats = threats.filter(t => 
        !t.resolved || !t.resolvedAt || new Date(t.resolvedAt) > thirtyDaysAgo
      );
      
      if (filteredThreats.length !== threats.length) {
        this.threats.set(identityId, filteredThreats);
      }
    }

    console.log('[SecurityContext] Cleanup completed');
  }

  // Private helper methods
  private async performDeviceVerification(
    context: SecurityContext,
    deviceFingerprint: any,
    policy: SecurityPolicy
  ): Promise<{
    verified: boolean;
    securityLevel: SecurityContext['securityLevel'];
    threatLevel: SecurityContext['threatLevel'];
    restrictions: SecurityRestriction[];
    threats: SecurityThreat[];
  }> {
    const threats: SecurityThreat[] = [];
    const restrictions: SecurityRestriction[] = [];
    let securityLevel: SecurityContext['securityLevel'] = policy.minSecurityLevel;
    let threatLevel: SecurityContext['threatLevel'] = 'NONE';

    // Check device against blocked list
    if (policy.blockedDevices?.includes(context.deviceId)) {
      threats.push({
        id: `threat_${Date.now()}_blocked_device`,
        type: 'SUSPICIOUS_DEVICE',
        severity: 'CRITICAL',
        description: 'Device is on blocked list',
        detectedAt: new Date().toISOString(),
        resolved: false
      });
      
      restrictions.push(this.createDeviceLockRestriction('Device blocked'));
      securityLevel = 'CRITICAL';
      threatLevel = 'CRITICAL';
      
      return { verified: false, securityLevel, threatLevel, restrictions, threats };
    }

    // Check if device is on allowed list
    if (policy.allowedDevices && !policy.allowedDevices.includes(context.deviceId)) {
      threats.push({
        id: `threat_${Date.now()}_unknown_device`,
        type: 'SUSPICIOUS_DEVICE',
        severity: 'MEDIUM',
        description: 'Device not on allowed list',
        detectedAt: new Date().toISOString(),
        resolved: false
      });
      
      securityLevel = 'HIGH';
      threatLevel = 'MEDIUM';
    }

    // Analyze device fingerprint for suspicious characteristics
    const suspiciousScore = this.calculateSuspiciousScore(deviceFingerprint);
    
    if (suspiciousScore > policy.riskThresholds.critical) {
      threats.push({
        id: `threat_${Date.now()}_suspicious_fingerprint`,
        type: 'SUSPICIOUS_DEVICE',
        severity: 'CRITICAL',
        description: `High suspicious score: ${suspiciousScore}`,
        detectedAt: new Date().toISOString(),
        resolved: false,
        metadata: { suspiciousScore, fingerprint: deviceFingerprint }
      });
      
      restrictions.push(this.createDeviceLockRestriction('Suspicious device characteristics'));
      securityLevel = 'CRITICAL';
      threatLevel = 'CRITICAL';
      
      return { verified: false, securityLevel, threatLevel, restrictions, threats };
    } else if (suspiciousScore > policy.riskThresholds.high) {
      threats.push({
        id: `threat_${Date.now()}_elevated_risk`,
        type: 'SUSPICIOUS_DEVICE',
        severity: 'HIGH',
        description: `Elevated risk score: ${suspiciousScore}`,
        detectedAt: new Date().toISOString(),
        resolved: false,
        metadata: { suspiciousScore }
      });
      
      restrictions.push({
        type: 'AMOUNT_LIMIT',
        description: 'Reduced transaction limits due to elevated risk',
        active: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        metadata: { originalLimit: 10000, reducedLimit: 1000 }
      });
      
      securityLevel = 'HIGH';
      threatLevel = 'HIGH';
    }

    // Check for time-based anomalies
    const timeAnomaly = this.detectTimeAnomaly(context);
    if (timeAnomaly) {
      threats.push({
        id: `threat_${Date.now()}_time_anomaly`,
        type: 'TIME_ANOMALY',
        severity: 'MEDIUM',
        description: 'Unusual access time detected',
        detectedAt: new Date().toISOString(),
        resolved: false,
        metadata: timeAnomaly
      });
      
      if (securityLevel === 'LOW') securityLevel = 'MEDIUM';
      if (threatLevel === 'NONE') threatLevel = 'LOW';
    }

    return {
      verified: true,
      securityLevel,
      threatLevel,
      restrictions,
      threats
    };
  }

  private calculateSuspiciousScore(fingerprint: any): number {
    let score = 0;

    // Check for bot-like characteristics
    if (fingerprint.userAgent?.includes('bot') || fingerprint.userAgent?.includes('crawler')) {
      score += 50;
    }

    // Check for disabled features
    if (!fingerprint.cookiesEnabled) score += 10;
    if (!fingerprint.localStorageEnabled) score += 10;
    if (!fingerprint.sessionStorageEnabled) score += 5;

    // Check for unusual screen resolution
    if (fingerprint.screenResolution === '1x1' || fingerprint.screenResolution === '0x0') {
      score += 20;
    }

    // Check for missing WebGL
    if (fingerprint.webglRenderer === 'not_supported') {
      score += 5;
    }

    return Math.min(score, 100);
  }

  private detectTimeAnomaly(context: SecurityContext): any | null {
    const now = new Date();
    const hour = now.getHours();
    
    // Flag access during unusual hours (2 AM - 5 AM)
    if (hour >= 2 && hour <= 5) {
      return {
        type: 'unusual_hour',
        hour,
        description: 'Access during unusual hours'
      };
    }

    return null;
  }

  private generateDefaultPermissions(identityType: IdentityType): SecurityPermission[] {
    const permissions: SecurityPermission[] = [];

    switch (identityType) {
      case IdentityType.ROOT:
        permissions.push(
          { action: 'transfer', resource: 'wallet', granted: true },
          { action: 'receive', resource: 'wallet', granted: true },
          { action: 'mint', resource: 'nft', granted: true },
          { action: 'create', resource: 'dao', granted: true },
          { action: 'admin', resource: 'system', granted: true }
        );
        break;

      case IdentityType.DAO:
        permissions.push(
          { action: 'transfer', resource: 'wallet', granted: true },
          { action: 'receive', resource: 'wallet', granted: true },
          { action: 'mint', resource: 'nft', granted: true },
          { action: 'govern', resource: 'dao', granted: true }
        );
        break;

      case IdentityType.ENTERPRISE:
        permissions.push(
          { action: 'transfer', resource: 'wallet', granted: true },
          { action: 'receive', resource: 'wallet', granted: true },
          { action: 'mint', resource: 'nft', granted: false }
        );
        break;

      case IdentityType.CONSENTIDA:
        permissions.push(
          { action: 'transfer', resource: 'wallet', granted: false },
          { action: 'receive', resource: 'wallet', granted: true },
          { action: 'view', resource: 'wallet', granted: true }
        );
        break;

      case IdentityType.AID:
        permissions.push(
          { action: 'transfer', resource: 'wallet', granted: true },
          { action: 'receive', resource: 'wallet', granted: true },
          { action: 'view', resource: 'wallet', granted: true }
        );
        break;
    }

    return permissions;
  }

  private shouldRequireAudit(identityType: IdentityType): boolean {
    return identityType !== IdentityType.AID; // AID identities prefer anonymity
  }

  private restrictionBlocksAction(
    restriction: SecurityRestriction,
    action: string,
    resource: string
  ): boolean {
    switch (restriction.type) {
      case 'DEVICE_LOCK':
        return true; // Blocks all actions

      case 'AMOUNT_LIMIT':
        return action === 'transfer' && resource === 'wallet';

      case 'RATE_LIMIT':
        return action === 'transfer'; // Would need more sophisticated rate limiting logic

      case 'TIME_WINDOW':
        // Check if current time is within restricted window
        const now = new Date();
        const hour = now.getHours();
        const restrictedHours = restriction.metadata?.restrictedHours || [];
        return restrictedHours.includes(hour);

      case 'LOCATION_LOCK':
        // Would need location detection logic
        return false;

      default:
        return false;
    }
  }

  private createDeviceLockRestriction(reason: string): SecurityRestriction {
    return {
      type: 'DEVICE_LOCK',
      description: reason,
      active: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  }

  private recordThreats(identityId: string, threats: SecurityThreat[]): void {
    threats.forEach(threat => this.recordThreat(identityId, threat));
  }

  private calculateMaxThreatLevel(threats: SecurityThreat[]): SecurityContext['threatLevel'] {
    const unresolvedThreats = threats.filter(t => !t.resolved);
    
    if (unresolvedThreats.length === 0) return 'NONE';
    
    const maxSeverity = unresolvedThreats.reduce((max, threat) => {
      const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      const currentLevel = severityLevels[threat.severity] || 0;
      const maxLevel = severityLevels[max] || 0;
      return currentLevel > maxLevel ? threat.severity : max;
    }, 'LOW');

    return maxSeverity as SecurityContext['threatLevel'];
  }

  private initializeDefaultPolicies(): void {
    // ROOT Identity Policy
    this.policies.set(IdentityType.ROOT, {
      identityType: IdentityType.ROOT,
      minSecurityLevel: 'MEDIUM',
      requiresDeviceVerification: false,
      requiresBiometric: false,
      requires2FA: false,
      maxSessionDuration: 480, // 8 hours
      maxConcurrentSessions: 5,
      riskThresholds: {
        low: 20,
        medium: 40,
        high: 60,
        critical: 80
      }
    });

    // DAO Identity Policy
    this.policies.set(IdentityType.DAO, {
      identityType: IdentityType.DAO,
      minSecurityLevel: 'HIGH',
      requiresDeviceVerification: true,
      requiresBiometric: false,
      requires2FA: true,
      maxSessionDuration: 240, // 4 hours
      maxConcurrentSessions: 3,
      riskThresholds: {
        low: 15,
        medium: 30,
        high: 50,
        critical: 70
      }
    });

    // ENTERPRISE Identity Policy
    this.policies.set(IdentityType.ENTERPRISE, {
      identityType: IdentityType.ENTERPRISE,
      minSecurityLevel: 'HIGH',
      requiresDeviceVerification: true,
      requiresBiometric: true,
      requires2FA: true,
      maxSessionDuration: 180, // 3 hours
      maxConcurrentSessions: 2,
      riskThresholds: {
        low: 10,
        medium: 25,
        high: 45,
        critical: 65
      }
    });

    // CONSENTIDA Identity Policy
    this.policies.set(IdentityType.CONSENTIDA, {
      identityType: IdentityType.CONSENTIDA,
      minSecurityLevel: 'MEDIUM',
      requiresDeviceVerification: true,
      requiresBiometric: false,
      requires2FA: false,
      maxSessionDuration: 120, // 2 hours
      maxConcurrentSessions: 1,
      riskThresholds: {
        low: 25,
        medium: 45,
        high: 65,
        critical: 85
      }
    });

    // AID Identity Policy - Maximum Privacy
    this.policies.set(IdentityType.AID, {
      identityType: IdentityType.AID,
      minSecurityLevel: 'LOW',
      requiresDeviceVerification: false,
      requiresBiometric: false,
      requires2FA: false,
      maxSessionDuration: 60, // 1 hour
      maxConcurrentSessions: 1,
      riskThresholds: {
        low: 30,
        medium: 50,
        high: 70,
        critical: 90
      }
    });
  }

  private getDefaultPolicy(): SecurityPolicy {
    return {
      identityType: IdentityType.ROOT,
      minSecurityLevel: 'MEDIUM',
      requiresDeviceVerification: true,
      requiresBiometric: false,
      requires2FA: false,
      maxSessionDuration: 240,
      maxConcurrentSessions: 3,
      riskThresholds: {
        low: 20,
        medium: 40,
        high: 60,
        critical: 80
      }
    };
  }

  private startSessionMonitoring(): void {
    // Monitor sessions every 5 minutes
    this.sessionMonitor = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.sessionMonitor) {
      clearInterval(this.sessionMonitor);
      this.sessionMonitor = null;
    }
    this.contexts.clear();
    this.threats.clear();
  }
}

// Singleton instance
export const securityContextManager = SecurityContextManager.getInstance();

// Utility functions
export const securityUtils = {
  // Create security context for identity
  createContext: (identityId: string, identityType: IdentityType, deviceId: string, sessionId: string) => {
    return securityContextManager.createSecurityContext(identityId, identityType, deviceId, sessionId);
  },

  // Check if action is permitted
  checkPermission: (identityId: string, action: string, resource: string) => {
    return securityContextManager.checkPermission(identityId, action, resource);
  },

  // Verify device
  verifyDevice: (identityId: string, deviceFingerprint: any) => {
    return securityContextManager.verifyDevice(identityId, deviceFingerprint);
  },

  // Record security threat
  recordThreat: (identityId: string, threat: Omit<SecurityThreat, 'id' | 'detectedAt' | 'resolved'>) => {
    const fullThreat: SecurityThreat = {
      ...threat,
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      detectedAt: new Date().toISOString(),
      resolved: false
    };
    securityContextManager.recordThreat(identityId, fullThreat);
  },

  // Get security status summary
  getSecurityStatus: (identityId: string) => {
    const context = securityContextManager.getSecurityContext(identityId);
    const threats = securityContextManager.getThreats(identityId);
    
    if (!context) {
      return {
        secure: false,
        level: 'CRITICAL' as const,
        verified: false,
        threats: 0,
        restrictions: 0
      };
    }

    const unresolvedThreats = threats.filter(t => !t.resolved);
    const activeRestrictions = context.restrictions.filter(r => 
      r.active && (!r.expiresAt || new Date() < new Date(r.expiresAt))
    );

    return {
      secure: context.verificationStatus === 'VERIFIED' && context.threatLevel === 'NONE',
      level: context.securityLevel,
      verified: context.verificationStatus === 'VERIFIED',
      threats: unresolvedThreats.length,
      restrictions: activeRestrictions.length
    };
  }
};

// Export types
export type {
  SecurityContext,
  SecurityPermission,
  SecurityRestriction,
  SecurityThreat,
  SecurityPolicy
};