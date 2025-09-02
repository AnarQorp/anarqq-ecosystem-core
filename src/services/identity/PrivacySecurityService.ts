/**
 * Privacy and Security Controls Service
 * Implements identity-specific privacy enforcement, ephemeral storage for AID identities,
 * device verification and fingerprinting, and data retention policies
 */

import { IdentityType, PrivacyLevel, ExtendedSquidIdentity } from '../../types/identity';
import { IdentityWalletConfig, PrivacySettings, SecuritySettings } from '../../types/wallet-config';
import { walletConfigService } from './WalletConfigService';

// Privacy Enforcement Types
export interface PrivacyEnforcementRule {
  identityType: IdentityType;
  dataType: string;
  action: 'ALLOW' | 'DENY' | 'ANONYMIZE' | 'ENCRYPT';
  conditions?: string[];
  retention?: number; // days
}

export interface DeviceFingerprint {
  deviceId: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookiesEnabled: boolean;
  localStorageEnabled: boolean;
  sessionStorageEnabled: boolean;
  webglRenderer?: string;
  canvasFingerprint?: string;
  audioFingerprint?: string;
  createdAt: string;
  lastSeen: string;
  trustLevel: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED';
}

export interface DeviceVerificationResult {
  verified: boolean;
  deviceId: string;
  trustLevel: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED';
  riskScore: number;
  reasons: string[];
  requiresAdditionalAuth: boolean;
}

export interface DataRetentionPolicy {
  identityType: IdentityType;
  dataType: string;
  retentionPeriod: number; // days
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  complianceRequired: boolean;
}

export interface EphemeralStorageConfig {
  identityId: string;
  storageKey: string;
  expiresAt: string;
  autoDestruct: boolean;
  destructOnLogout: boolean;
  destructOnSessionLoss: boolean;
  encryptionKey?: string;
}

export interface PrivacyAuditLog {
  id: string;
  identityId: string;
  action: 'DATA_ACCESS' | 'DATA_STORE' | 'DATA_DELETE' | 'PRIVACY_CHANGE' | 'DEVICE_VERIFY';
  dataType: string;
  privacyLevel: PrivacyLevel;
  allowed: boolean;
  reason: string;
  deviceId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class PrivacySecurityService {
  private privacyRules: Map<string, PrivacyEnforcementRule[]> = new Map();
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map();
  private ephemeralStorage: Map<string, EphemeralStorageConfig> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy[]> = new Map();
  private privacyAuditLogs: Map<string, PrivacyAuditLog[]> = new Map();

  constructor() {
    this.initializeDefaultPrivacyRules();
    this.initializeDefaultRetentionPolicies();
    this.loadFromStorage();
    this.startCleanupScheduler();
  }

  // Privacy Enforcement

  async enforcePrivacyForIdentity(
    identityId: string,
    dataType: string,
    data: any,
    action: 'READ' | 'write' | 'delete'
  ): Promise<{ allowed: boolean; processedData?: any; reason: string }> {
    try {
      const identity = await this.getIdentityById(identityId);
      if (!identity) {
        return { allowed: false, reason: 'Identity not found' };
      }

      const config = await walletConfigService.getWalletConfig(identityId);
      const rules = this.getPrivacyRules(identity.type, dataType);
      
      // Check if action is allowed based on privacy rules
      const enforcement = this.evaluatePrivacyRules(rules, action, data, config.privacySettings);
      
      // Log the privacy action
      await this.logPrivacyAction(identityId, action.toUpperCase() as any, dataType, enforcement.allowed, enforcement.reason);

      // Process data according to privacy rules
      if (enforcement.allowed && enforcement.action !== 'DENY') {
        const processedData = await this.processDataForPrivacy(data, enforcement.action, identity.type);
        return { allowed: true, processedData, reason: enforcement.reason };
      }

      return { allowed: enforcement.allowed, reason: enforcement.reason };
    } catch (error) {
      console.error('[PrivacySecurityService] Error enforcing privacy:', error);
      return { allowed: false, reason: 'Privacy enforcement error' };
    }
  }

  async updatePrivacySettings(identityId: string, settings: Partial<PrivacySettings>): Promise<boolean> {
    try {
      const config = await walletConfigService.getWalletConfig(identityId);
      const updatedConfig = {
        ...config,
        privacySettings: { ...config.privacySettings, ...settings }
      };

      const success = await walletConfigService.updateWalletConfig(identityId, updatedConfig);
      
      if (success) {
        await this.logPrivacyAction(identityId, 'PRIVACY_CHANGE', 'settings', true, 'Privacy settings updated');
        
        // If ephemeral storage setting changed for AID identity, handle accordingly
        const identity = await this.getIdentityById(identityId);
        if (identity?.type === IdentityType.AID && settings.ephemeralStorage !== undefined) {
          if (settings.ephemeralStorage) {
            await this.enableEphemeralStorage(identityId);
          } else {
            await this.disableEphemeralStorage(identityId);
          }
        }
      }

      return success;
    } catch (error) {
      console.error('[PrivacySecurityService] Error updating privacy settings:', error);
      return false;
    }
  }

  // Ephemeral Storage for AID Identities

  async enableEphemeralStorage(identityId: string): Promise<boolean> {
    try {
      const identity = await this.getIdentityById(identityId);
      if (!identity || identity.type !== IdentityType.AID) {
        console.warn('[PrivacySecurityService] Ephemeral storage only available for AID identities');
        return false;
      }

      // Create ephemeral storage configuration
      const config: EphemeralStorageConfig = {
        identityId,
        storageKey: `ephemeral_${identityId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        autoDestruct: true,
        destructOnLogout: true,
        destructOnSessionLoss: true,
        encryptionKey: this.generateEncryptionKey()
      };

      this.ephemeralStorage.set(identityId, config);
      
      // Move existing data to ephemeral storage
      await this.migrateToEphemeralStorage(identityId);
      
      await this.saveToStorage();
      console.log(`[PrivacySecurityService] Enabled ephemeral storage for AID identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[PrivacySecurityService] Error enabling ephemeral storage:', error);
      return false;
    }
  }

  async disableEphemeralStorage(identityId: string): Promise<boolean> {
    try {
      const config = this.ephemeralStorage.get(identityId);
      if (!config) {
        return true; // Already disabled
      }

      // Clean up ephemeral data
      await this.cleanupEphemeralData(identityId);
      
      this.ephemeralStorage.delete(identityId);
      await this.saveToStorage();
      
      console.log(`[PrivacySecurityService] Disabled ephemeral storage for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[PrivacySecurityService] Error disabling ephemeral storage:', error);
      return false;
    }
  }

  async isEphemeralStorageEnabled(identityId: string): Promise<boolean> {
    return this.ephemeralStorage.has(identityId);
  }

  async cleanupExpiredEphemeralStorage(): Promise<void> {
    const now = new Date();
    const expiredConfigs: string[] = [];

    for (const [identityId, config] of this.ephemeralStorage.entries()) {
      if (new Date(config.expiresAt) <= now) {
        expiredConfigs.push(identityId);
      }
    }

    for (const identityId of expiredConfigs) {
      await this.cleanupEphemeralData(identityId);
      this.ephemeralStorage.delete(identityId);
      console.log(`[PrivacySecurityService] Cleaned up expired ephemeral storage for: ${identityId}`);
    }

    if (expiredConfigs.length > 0) {
      await this.saveToStorage();
    }
  }

  // Device Verification and Fingerprinting

  async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    const fingerprint: DeviceFingerprint = {
      deviceId: this.generateDeviceId(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageEnabled: this.isStorageAvailable('localStorage'),
      sessionStorageEnabled: this.isStorageAvailable('sessionStorage'),
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      trustLevel: 'UNKNOWN'
    };

    // Add advanced fingerprinting if available
    try {
      fingerprint.webglRenderer = this.getWebGLRenderer();
      fingerprint.canvasFingerprint = await this.generateCanvasFingerprint();
      fingerprint.audioFingerprint = await this.generateAudioFingerprint();
    } catch (error) {
      console.warn('[PrivacySecurityService] Advanced fingerprinting failed:', error);
    }

    return fingerprint;
  }

  async verifyDevice(identityId: string, currentFingerprint?: DeviceFingerprint): Promise<DeviceVerificationResult> {
    try {
      const identity = await this.getIdentityById(identityId);
      if (!identity) {
        return {
          verified: false,
          deviceId: '',
          trustLevel: 'BLOCKED',
          riskScore: 100,
          reasons: ['Identity not found'],
          requiresAdditionalAuth: true
        };
      }

      const config = await walletConfigService.getWalletConfig(identityId);
      
      // Skip device verification if not required
      if (!config.securitySettings.requiresDeviceVerification) {
        return {
          verified: true,
          deviceId: 'verification_disabled',
          trustLevel: 'TRUSTED',
          riskScore: 0,
          reasons: ['Device verification disabled'],
          requiresAdditionalAuth: false
        };
      }

      // Generate current fingerprint if not provided
      const fingerprint = currentFingerprint || await this.generateDeviceFingerprint();
      
      // Check against known devices
      const knownDevice = this.findKnownDevice(fingerprint);
      
      if (knownDevice) {
        // Update last seen
        knownDevice.lastSeen = new Date().toISOString();
        this.deviceFingerprints.set(knownDevice.deviceId, knownDevice);
        
        return {
          verified: knownDevice.trustLevel !== 'BLOCKED',
          deviceId: knownDevice.deviceId,
          trustLevel: knownDevice.trustLevel,
          riskScore: this.calculateDeviceRiskScore(knownDevice, fingerprint),
          reasons: this.getVerificationReasons(knownDevice, fingerprint),
          requiresAdditionalAuth: knownDevice.trustLevel === 'SUSPICIOUS' || knownDevice.trustLevel === 'UNKNOWN'
        };
      }

      // New device - analyze risk
      const riskScore = this.calculateNewDeviceRiskScore(fingerprint);
      const trustLevel = this.determineTrustLevel(riskScore);
      
      // Store the new device fingerprint
      fingerprint.trustLevel = trustLevel;
      this.deviceFingerprints.set(fingerprint.deviceId, fingerprint);
      
      await this.logPrivacyAction(identityId, 'DEVICE_VERIFY', 'new_device', true, `New device registered: ${fingerprint.deviceId}`);
      await this.saveToStorage();

      return {
        verified: trustLevel !== 'BLOCKED',
        deviceId: fingerprint.deviceId,
        trustLevel,
        riskScore,
        reasons: [`New device detected`, `Risk score: ${riskScore}`],
        requiresAdditionalAuth: trustLevel !== 'TRUSTED'
      };
    } catch (error) {
      console.error('[PrivacySecurityService] Error verifying device:', error);
      return {
        verified: false,
        deviceId: '',
        trustLevel: 'BLOCKED',
        riskScore: 100,
        reasons: ['Device verification error'],
        requiresAdditionalAuth: true
      };
    }
  }

  async updateDeviceTrustLevel(deviceId: string, trustLevel: DeviceFingerprint['trustLevel']): Promise<boolean> {
    try {
      const device = this.deviceFingerprints.get(deviceId);
      if (!device) {
        return false;
      }

      device.trustLevel = trustLevel;
      device.lastSeen = new Date().toISOString();
      
      this.deviceFingerprints.set(deviceId, device);
      await this.saveToStorage();
      
      console.log(`[PrivacySecurityService] Updated device trust level: ${deviceId} -> ${trustLevel}`);
      return true;
    } catch (error) {
      console.error('[PrivacySecurityService] Error updating device trust level:', error);
      return false;
    }
  }

  // Data Retention and Cleanup Policies

  async applyDataRetentionPolicy(identityId: string, dataType: string): Promise<boolean> {
    try {
      const identity = await this.getIdentityById(identityId);
      if (!identity) {
        return false;
      }

      const policies = this.getRetentionPolicies(identity.type, dataType);
      
      for (const policy of policies) {
        await this.enforceRetentionPolicy(identityId, policy);
      }

      return true;
    } catch (error) {
      console.error('[PrivacySecurityService] Error applying data retention policy:', error);
      return false;
    }
  }

  async scheduleDataCleanup(identityId: string, dataType: string, retentionDays: number): Promise<boolean> {
    try {
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() + retentionDays);

      // In a real implementation, this would schedule a cleanup job
      console.log(`[PrivacySecurityService] Scheduled data cleanup for ${identityId}:${dataType} on ${cleanupDate.toISOString()}`);
      
      return true;
    } catch (error) {
      console.error('[PrivacySecurityService] Error scheduling data cleanup:', error);
      return false;
    }
  }

  async performDataCleanup(identityId: string): Promise<{ cleaned: string[]; errors: string[] }> {
    const cleaned: string[] = [];
    const errors: string[] = [];

    try {
      const identity = await this.getIdentityById(identityId);
      if (!identity) {
        errors.push('Identity not found');
        return { cleaned, errors };
      }

      const config = await walletConfigService.getWalletConfig(identityId);
      const retentionPeriod = config.privacySettings.dataRetentionPeriod;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);

      // Clean up audit logs
      const auditLogs = this.privacyAuditLogs.get(identityId) || [];
      const filteredLogs = auditLogs.filter(log => new Date(log.timestamp) > cutoffDate);
      
      if (filteredLogs.length < auditLogs.length) {
        this.privacyAuditLogs.set(identityId, filteredLogs);
        cleaned.push(`audit_logs: ${auditLogs.length - filteredLogs.length} entries`);
      }

      // Clean up device fingerprints (older than 90 days)
      const deviceCutoff = new Date();
      deviceCutoff.setDate(deviceCutoff.getDate() - 90);
      
      for (const [deviceId, device] of this.deviceFingerprints.entries()) {
        if (new Date(device.lastSeen) < deviceCutoff) {
          this.deviceFingerprints.delete(deviceId);
          cleaned.push(`device_fingerprint: ${deviceId}`);
        }
      }

      // For AID identities, clean up all data if ephemeral storage is enabled
      if (identity.type === IdentityType.AID && config.privacySettings.ephemeralStorage) {
        await this.cleanupEphemeralData(identityId);
        cleaned.push('ephemeral_data: all');
      }

      await this.saveToStorage();
      
      console.log(`[PrivacySecurityService] Data cleanup completed for ${identityId}:`, { cleaned, errors });
      return { cleaned, errors };
    } catch (error) {
      console.error('[PrivacySecurityService] Error performing data cleanup:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { cleaned, errors };
    }
  }

  // Privacy Audit and Logging

  async getPrivacyAuditLog(identityId: string, limit?: number): Promise<PrivacyAuditLog[]> {
    const logs = this.privacyAuditLogs.get(identityId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  async exportPrivacyData(identityId: string): Promise<{
    privacySettings: PrivacySettings;
    auditLogs: PrivacyAuditLog[];
    deviceFingerprints: DeviceFingerprint[];
    ephemeralConfig?: EphemeralStorageConfig;
  }> {
    try {
      const config = await walletConfigService.getWalletConfig(identityId);
      const auditLogs = await this.getPrivacyAuditLog(identityId);
      const deviceFingerprints = Array.from(this.deviceFingerprints.values());
      const ephemeralConfig = this.ephemeralStorage.get(identityId);

      return {
        privacySettings: config.privacySettings,
        auditLogs,
        deviceFingerprints,
        ephemeralConfig
      };
    } catch (error) {
      console.error('[PrivacySecurityService] Error exporting privacy data:', error);
      throw error;
    }
  }

  // Private Helper Methods

  private async logPrivacyAction(
    identityId: string,
    action: PrivacyAuditLog['action'],
    dataType: string,
    allowed: boolean,
    reason: string,
    deviceId?: string
  ): Promise<void> {
    const log: PrivacyAuditLog = {
      id: `privacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      identityId,
      action,
      dataType,
      privacyLevel: PrivacyLevel.PRIVATE, // Default, should be determined from context
      allowed,
      reason,
      deviceId,
      timestamp: new Date().toISOString()
    };

    const logs = this.privacyAuditLogs.get(identityId) || [];
    logs.push(log);
    this.privacyAuditLogs.set(identityId, logs);
    
    // Keep only recent logs to prevent memory issues
    if (logs.length > 1000) {
      this.privacyAuditLogs.set(identityId, logs.slice(-500));
    }
  }

  private getPrivacyRules(identityType: IdentityType, dataType: string): PrivacyEnforcementRule[] {
    const key = `${identityType}_${dataType}`;
    return this.privacyRules.get(key) || this.privacyRules.get(`${identityType}_*`) || [];
  }

  private evaluatePrivacyRules(
    rules: PrivacyEnforcementRule[],
    action: string,
    data: any,
    settings: PrivacySettings
  ): { allowed: boolean; action: PrivacyEnforcementRule['action']; reason: string } {
    if (rules.length === 0) {
      return { allowed: true, action: 'ALLOW', reason: 'No privacy rules defined' };
    }

    for (const rule of rules) {
      if (this.ruleApplies(rule, action, data, settings)) {
        return {
          allowed: rule.action !== 'DENY',
          action: rule.action,
          reason: `Privacy rule applied: ${rule.action}`
        };
      }
    }

    return { allowed: true, action: 'ALLOW', reason: 'No matching privacy rules' };
  }

  private ruleApplies(rule: PrivacyEnforcementRule, action: string, data: any, settings: PrivacySettings): boolean {
    // Simple rule evaluation - in a real implementation, this would be more sophisticated
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (condition.includes('ephemeral') && !settings.ephemeralStorage) {
          return false;
        }
        if (condition.includes('anonymous') && settings.privacyLevel !== PrivacyLevel.ANONYMOUS) {
          return false;
        }
      }
    }
    return true;
  }

  private async processDataForPrivacy(
    data: any,
    action: PrivacyEnforcementRule['action'],
    identityType: IdentityType
  ): Promise<any> {
    switch (action) {
      case 'ANONYMIZE':
        return this.anonymizeData(data, identityType);
      case 'ENCRYPT':
        return this.encryptData(data);
      case 'ALLOW':
      default:
        return data;
    }
  }

  private anonymizeData(data: any, identityType: IdentityType): any {
    if (identityType === IdentityType.AID) {
      // For AID identities, remove all identifying information
      const anonymized = { ...data };
      delete anonymized.identityId;
      delete anonymized.userId;
      delete anonymized.deviceId;
      delete anonymized.ipAddress;
      return anonymized;
    }
    return data;
  }

  private encryptData(data: any): any {
    // Simple encryption placeholder - in a real implementation, use proper encryption
    return {
      encrypted: true,
      data: btoa(JSON.stringify(data)),
      timestamp: new Date().toISOString()
    };
  }

  private async migrateToEphemeralStorage(identityId: string): Promise<void> {
    // Move wallet data to ephemeral storage
    const walletData = localStorage.getItem(`wallet_${identityId}`);
    if (walletData) {
      sessionStorage.setItem(`ephemeral_wallet_${identityId}`, walletData);
      localStorage.removeItem(`wallet_${identityId}`);
    }
  }

  private async cleanupEphemeralData(identityId: string): Promise<void> {
    // Remove all ephemeral data for the identity
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.includes(identityId)) {
        sessionStorage.removeItem(key);
      }
    }
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEncryptionKey(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getWebGLRenderer(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      }
      return 'not_supported';
    } catch {
      return 'error';
    }
  }

  private async generateCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'not_supported';

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Privacy fingerprint test', 2, 2);
      
      return canvas.toDataURL().slice(-50); // Last 50 chars as fingerprint
    } catch {
      return 'error';
    }
  }

  private async generateAudioFingerprint(): Promise<string> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      
      oscillator.connect(analyser);
      oscillator.frequency.value = 1000;
      oscillator.start();
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      oscillator.stop();
      audioContext.close();
      
      return Array.from(dataArray.slice(0, 10)).join('');
    } catch {
      return 'not_supported';
    }
  }

  private findKnownDevice(fingerprint: DeviceFingerprint): DeviceFingerprint | null {
    for (const device of this.deviceFingerprints.values()) {
      if (this.deviceFingerprintsMatch(device, fingerprint)) {
        return device;
      }
    }
    return null;
  }

  private deviceFingerprintsMatch(device1: DeviceFingerprint, device2: DeviceFingerprint): boolean {
    // Simple matching - in a real implementation, use fuzzy matching with thresholds
    return (
      device1.userAgent === device2.userAgent &&
      device1.screenResolution === device2.screenResolution &&
      device1.timezone === device2.timezone &&
      device1.language === device2.language &&
      device1.platform === device2.platform
    );
  }

  private calculateDeviceRiskScore(knownDevice: DeviceFingerprint, currentFingerprint: DeviceFingerprint): number {
    let riskScore = 0;

    // Check for changes in fingerprint
    if (knownDevice.userAgent !== currentFingerprint.userAgent) riskScore += 20;
    if (knownDevice.screenResolution !== currentFingerprint.screenResolution) riskScore += 10;
    if (knownDevice.timezone !== currentFingerprint.timezone) riskScore += 15;
    if (knownDevice.language !== currentFingerprint.language) riskScore += 5;

    // Check time since last seen
    const daysSinceLastSeen = (Date.now() - new Date(knownDevice.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen > 30) riskScore += 10;
    if (daysSinceLastSeen > 90) riskScore += 20;

    return Math.min(riskScore, 100);
  }

  private calculateNewDeviceRiskScore(fingerprint: DeviceFingerprint): number {
    let riskScore = 30; // Base risk for new device

    // Check for suspicious characteristics
    if (!fingerprint.cookiesEnabled) riskScore += 10;
    if (!fingerprint.localStorageEnabled) riskScore += 10;
    if (fingerprint.userAgent.includes('bot') || fingerprint.userAgent.includes('crawler')) riskScore += 50;
    if (fingerprint.webglRenderer === 'not_supported') riskScore += 5;

    return Math.min(riskScore, 100);
  }

  private determineTrustLevel(riskScore: number): DeviceFingerprint['trustLevel'] {
    if (riskScore >= 80) return 'BLOCKED';
    if (riskScore >= 50) return 'SUSPICIOUS';
    if (riskScore >= 20) return 'UNKNOWN';
    return 'TRUSTED';
  }

  private getVerificationReasons(knownDevice: DeviceFingerprint, currentFingerprint: DeviceFingerprint): string[] {
    const reasons: string[] = [];
    
    if (knownDevice.trustLevel === 'TRUSTED') {
      reasons.push('Device previously verified');
    }
    
    if (knownDevice.userAgent !== currentFingerprint.userAgent) {
      reasons.push('User agent changed');
    }
    
    if (knownDevice.screenResolution !== currentFingerprint.screenResolution) {
      reasons.push('Screen resolution changed');
    }

    const daysSinceLastSeen = (Date.now() - new Date(knownDevice.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen > 30) {
      reasons.push(`Device not seen for ${Math.floor(daysSinceLastSeen)} days`);
    }

    return reasons;
  }

  private getRetentionPolicies(identityType: IdentityType, dataType: string): DataRetentionPolicy[] {
    const key = `${identityType}_${dataType}`;
    return this.retentionPolicies.get(key) || this.retentionPolicies.get(`${identityType}_*`) || [];
  }

  private async enforceRetentionPolicy(identityId: string, policy: DataRetentionPolicy): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    // In a real implementation, this would clean up specific data types
    console.log(`[PrivacySecurityService] Enforcing retention policy for ${identityId}:${policy.dataType}, cutoff: ${cutoffDate.toISOString()}`);
  }

  private async getIdentityById(identityId: string): Promise<ExtendedSquidIdentity | null> {
    // In a real implementation, this would query the identity service
    // For now, return a mock identity based on the ID pattern
    if (identityId.includes('aid')) {
      return {
        did: identityId,
        name: 'AID Identity',
        type: IdentityType.AID,
        rootId: identityId,
        children: [],
        depth: 0,
        path: [],
        governanceLevel: 'SELF' as any,
        creationRules: {} as any,
        permissions: {} as any,
        status: 'ACTIVE' as any,
        qonsentProfileId: '',
        qlockKeyPair: {} as any,
        privacyLevel: PrivacyLevel.ANONYMOUS,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        kyc: { required: false, submitted: false, approved: false },
        auditLog: [],
        securityFlags: [],
        qindexRegistered: false
      };
    }
    return null;
  }

  private initializeDefaultPrivacyRules(): void {
    // AID Identity Rules - Maximum Privacy
    this.privacyRules.set(`${IdentityType.AID}_*`, [
      {
        identityType: IdentityType.AID,
        dataType: '*',
        action: 'ANONYMIZE',
        conditions: ['ephemeral_storage'],
        retention: 1 // 1 day
      }
    ]);

    this.privacyRules.set(`${IdentityType.AID}_transaction`, [
      {
        identityType: IdentityType.AID,
        dataType: 'transaction',
        action: 'ANONYMIZE',
        retention: 0 // No retention
      }
    ]);

    // CONSENTIDA Identity Rules - Parental Controls
    this.privacyRules.set(`${IdentityType.CONSENTIDA}_*`, [
      {
        identityType: IdentityType.CONSENTIDA,
        dataType: '*',
        action: 'ENCRYPT',
        retention: 30
      }
    ]);

    // ROOT Identity Rules - Full Access
    this.privacyRules.set(`${IdentityType.ROOT}_*`, [
      {
        identityType: IdentityType.ROOT,
        dataType: '*',
        action: 'ALLOW',
        retention: 365
      }
    ]);
  }

  private initializeDefaultRetentionPolicies(): void {
    // AID Identity - Minimal Retention
    this.retentionPolicies.set(`${IdentityType.AID}_*`, [
      {
        identityType: IdentityType.AID,
        dataType: '*',
        retentionPeriod: 1,
        autoDelete: true,
        archiveBeforeDelete: false,
        complianceRequired: false
      }
    ]);

    // CONSENTIDA Identity - Moderate Retention
    this.retentionPolicies.set(`${IdentityType.CONSENTIDA}_*`, [
      {
        identityType: IdentityType.CONSENTIDA,
        dataType: '*',
        retentionPeriod: 30,
        autoDelete: true,
        archiveBeforeDelete: true,
        complianceRequired: true
      }
    ]);

    // ROOT Identity - Extended Retention
    this.retentionPolicies.set(`${IdentityType.ROOT}_*`, [
      {
        identityType: IdentityType.ROOT,
        dataType: '*',
        retentionPeriod: 365,
        autoDelete: false,
        archiveBeforeDelete: true,
        complianceRequired: true
      }
    ]);
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    setInterval(async () => {
      await this.cleanupExpiredEphemeralStorage();
    }, 60 * 60 * 1000);
  }

  private loadFromStorage(): void {
    try {
      // Load device fingerprints
      const storedFingerprints = localStorage.getItem('device_fingerprints');
      if (storedFingerprints) {
        const fingerprints = JSON.parse(storedFingerprints);
        this.deviceFingerprints = new Map(Object.entries(fingerprints));
      }

      // Load ephemeral storage configs
      const storedEphemeral = sessionStorage.getItem('ephemeral_storage_configs');
      if (storedEphemeral) {
        const configs = JSON.parse(storedEphemeral);
        this.ephemeralStorage = new Map(Object.entries(configs));
      }

      // Load privacy audit logs
      const storedLogs = localStorage.getItem('privacy_audit_logs');
      if (storedLogs) {
        const logs = JSON.parse(storedLogs);
        for (const [key, value] of Object.entries(logs)) {
          this.privacyAuditLogs.set(key, value as PrivacyAuditLog[]);
        }
      }
    } catch (error) {
      console.error('[PrivacySecurityService] Error loading from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      // Save device fingerprints
      const fingerprints = Object.fromEntries(this.deviceFingerprints);
      localStorage.setItem('device_fingerprints', JSON.stringify(fingerprints));

      // Save ephemeral storage configs
      const ephemeralConfigs = Object.fromEntries(this.ephemeralStorage);
      sessionStorage.setItem('ephemeral_storage_configs', JSON.stringify(ephemeralConfigs));

      // Save privacy audit logs (keep only recent ones)
      const logsToSave: Record<string, PrivacyAuditLog[]> = {};
      for (const [key, logs] of this.privacyAuditLogs.entries()) {
        logsToSave[key] = logs.slice(-100); // Keep only last 100 logs per identity
      }
      localStorage.setItem('privacy_audit_logs', JSON.stringify(logsToSave));
    } catch (error) {
      console.error('[PrivacySecurityService] Error saving to storage:', error);
    }
  }
}

// Singleton instance
export const privacySecurityService = new PrivacySecurityService();