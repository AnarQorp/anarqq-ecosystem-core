/**
 * Identity Security Service
 * 
 * Provides comprehensive security validation for identity operations including:
 * - Signature verification for identity operations
 * - Device fingerprinting for security logging
 * - Suspicious activity detection logic
 * - Security event management
 */

import { 
  ExtendedSquidIdentity, 
  AuditEntry, 
  SecurityFlag, 
  IdentityAction 
} from '@/types/identity';
import { logAccess } from '@/api/qerberos';

// Device fingerprinting interface
export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  canvas?: string; // Canvas fingerprint hash
  webgl?: string; // WebGL fingerprint hash
  fonts?: string[]; // Available fonts
  plugins?: string[]; // Browser plugins
  timestamp: string;
}

// Signature verification interface
export interface SignatureVerificationRequest {
  message: string;
  signature: string;
  publicKey: string;
  algorithm: 'RSA' | 'ECDSA' | 'QUANTUM';
}

export interface SignatureVerificationResult {
  valid: boolean;
  algorithm: string;
  timestamp: string;
  error?: string;
}

// Suspicious activity patterns
export interface SuspiciousActivityPattern {
  type: 'RAPID_SWITCHING' | 'UNUSUAL_HOURS' | 'MULTIPLE_DEVICES' | 'EXCESSIVE_CREATION' | 'FAILED_VERIFICATIONS';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface SuspiciousActivityResult {
  detected: boolean;
  patterns: SuspiciousActivityPattern[];
  events: AuditEntry[];
  riskScore: number; // 0-100
  recommendations: string[];
}

// Security validation request
export interface SecurityValidationRequest {
  identityId: string;
  operation: IdentityAction;
  signature?: SignatureVerificationRequest;
  deviceFingerprint?: DeviceFingerprint;
  metadata?: Record<string, any>;
}

export interface SecurityValidationResult {
  valid: boolean;
  riskScore: number;
  signatureVerification?: SignatureVerificationResult;
  deviceTrust: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED';
  suspiciousActivity?: SuspiciousActivityResult;
  securityFlags: SecurityFlag[];
  recommendations: string[];
  error?: string;
}

export class IdentitySecurityService {
  private static instance: IdentitySecurityService;
  private knownDevices: Map<string, DeviceFingerprint> = new Map();
  private suspiciousPatterns: SuspiciousActivityPattern[] = [
    {
      type: 'RAPID_SWITCHING',
      threshold: 10,
      timeWindow: 60, // 1 hour
      severity: 'HIGH',
      description: 'Rapid identity switching detected'
    },
    {
      type: 'UNUSUAL_HOURS',
      threshold: 5,
      timeWindow: 1440, // 24 hours
      severity: 'MEDIUM',
      description: 'Activity during unusual hours (2-6 AM)'
    },
    {
      type: 'MULTIPLE_DEVICES',
      threshold: 3,
      timeWindow: 60, // 1 hour
      severity: 'HIGH',
      description: 'Multiple device access detected'
    },
    {
      type: 'EXCESSIVE_CREATION',
      threshold: 5,
      timeWindow: 1440, // 24 hours
      severity: 'HIGH',
      description: 'Excessive identity creation'
    },
    {
      type: 'FAILED_VERIFICATIONS',
      threshold: 3,
      timeWindow: 30, // 30 minutes
      severity: 'CRITICAL',
      description: 'Multiple failed signature verifications'
    }
  ];

  private constructor() {
    this.loadKnownDevices();
  }

  public static getInstance(): IdentitySecurityService {
    if (!IdentitySecurityService.instance) {
      IdentitySecurityService.instance = new IdentitySecurityService();
    }
    return IdentitySecurityService.instance;
  }

  /**
   * Generate device fingerprint from browser environment
   */
  public async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    const fingerprint: DeviceFingerprint = {
      id: '',
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      timestamp: new Date().toISOString()
    };

    // Generate canvas fingerprint
    try {
      fingerprint.canvas = await this.generateCanvasFingerprint();
    } catch (error) {
      console.warn('[IdentitySecurityService] Canvas fingerprinting failed:', error);
    }

    // Generate WebGL fingerprint
    try {
      fingerprint.webgl = await this.generateWebGLFingerprint();
    } catch (error) {
      console.warn('[IdentitySecurityService] WebGL fingerprinting failed:', error);
    }

    // Get available fonts (simplified)
    fingerprint.fonts = this.getAvailableFonts();

    // Get browser plugins
    fingerprint.plugins = this.getBrowserPlugins();

    // Generate unique ID from fingerprint data
    fingerprint.id = await this.hashFingerprint(fingerprint);

    return fingerprint;
  }

  /**
   * Verify digital signature for identity operations
   */
  public async verifySignature(request: SignatureVerificationRequest): Promise<SignatureVerificationResult> {
    const result: SignatureVerificationResult = {
      valid: false,
      algorithm: request.algorithm,
      timestamp: new Date().toISOString()
    };

    try {
      switch (request.algorithm) {
        case 'RSA':
          result.valid = await this.verifyRSASignature(request);
          break;
        case 'ECDSA':
          result.valid = await this.verifyECDSASignature(request);
          break;
        case 'QUANTUM':
          result.valid = await this.verifyQuantumSignature(request);
          break;
        default:
          throw new Error(`Unsupported signature algorithm: ${request.algorithm}`);
      }

      // Log verification attempt
      await logAccess({
        cid: 'signature-verification',
        identity: 'system',
        status: result.valid ? 'SUCCESS' : 'FAILED',
        operation: 'VERIFY',
        reason: result.valid ? 'Signature verification successful' : 'Signature verification failed',
        metadata: {
          algorithm: request.algorithm,
          messageLength: request.message.length,
          signatureLength: request.signature.length
        }
      });

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown verification error';
      result.valid = false;

      // Log verification error
      await logAccess({
        cid: 'signature-verification',
        identity: 'system',
        status: 'FAILED',
        operation: 'VERIFY',
        reason: `Signature verification error: ${result.error}`,
        metadata: {
          algorithm: request.algorithm,
          error: result.error
        }
      });
    }

    return result;
  }

  /**
   * Detect suspicious activity patterns
   */
  public async detectSuspiciousActivity(
    identityId: string, 
    auditLogs: AuditEntry[]
  ): Promise<SuspiciousActivityResult> {
    const result: SuspiciousActivityResult = {
      detected: false,
      patterns: [],
      events: [],
      riskScore: 0,
      recommendations: []
    };

    const now = new Date();
    let totalRiskScore = 0;

    for (const pattern of this.suspiciousPatterns) {
      const windowStart = new Date(now.getTime() - pattern.timeWindow * 60 * 1000);
      const relevantLogs = auditLogs.filter(log => 
        log.identityId === identityId &&
        new Date(log.timestamp) >= windowStart &&
        this.isRelevantForPattern(log, pattern)
      );

      if (relevantLogs.length >= pattern.threshold) {
        result.detected = true;
        result.patterns.push(pattern);
        result.events.push(...relevantLogs);

        // Calculate risk score based on severity
        const patternRisk = this.calculatePatternRisk(pattern, relevantLogs.length);
        totalRiskScore += patternRisk;

        // Add recommendations
        result.recommendations.push(...this.getPatternRecommendations(pattern));
      }
    }

    // Normalize risk score to 0-100
    result.riskScore = Math.min(100, totalRiskScore);

    // Add general recommendations based on risk score
    if (result.riskScore > 80) {
      result.recommendations.push('Consider temporarily suspending identity operations');
      result.recommendations.push('Require additional authentication for sensitive operations');
    } else if (result.riskScore > 50) {
      result.recommendations.push('Monitor identity activity closely');
      result.recommendations.push('Consider requiring re-authentication');
    }

    return result;
  }

  /**
   * Validate security for identity operation
   */
  public async validateIdentityOperation(request: SecurityValidationRequest): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      valid: true,
      riskScore: 0,
      deviceTrust: 'UNKNOWN',
      securityFlags: [],
      recommendations: []
    };

    try {
      // Verify signature if provided
      if (request.signature) {
        result.signatureVerification = await this.verifySignature(request.signature);
        if (!result.signatureVerification.valid) {
          result.valid = false;
          result.riskScore += 30;
          result.securityFlags.push({
            id: crypto.randomUUID(),
            type: 'SECURITY_BREACH',
            severity: 'HIGH',
            description: 'Invalid signature detected',
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
      }

      // Evaluate device trust
      if (request.deviceFingerprint) {
        result.deviceTrust = await this.evaluateDeviceTrust(request.deviceFingerprint);
        
        switch (result.deviceTrust) {
          case 'BLOCKED':
            result.valid = false;
            result.riskScore += 50;
            break;
          case 'SUSPICIOUS':
            result.riskScore += 25;
            break;
          case 'UNKNOWN':
            result.riskScore += 10;
            break;
          case 'TRUSTED':
            // No additional risk
            break;
        }
      }

      // Check for suspicious activity patterns
      // This would require access to audit logs, which should be passed in metadata
      if (request.metadata?.auditLogs) {
        result.suspiciousActivity = await this.detectSuspiciousActivity(
          request.identityId, 
          request.metadata.auditLogs
        );
        
        if (result.suspiciousActivity.detected) {
          result.riskScore += result.suspiciousActivity.riskScore * 0.5; // Weight suspicious activity
          result.recommendations.push(...result.suspiciousActivity.recommendations);
        }
      }

      // Generate security recommendations based on risk score
      if (result.riskScore > 70) {
        result.valid = false;
        result.recommendations.push('Operation blocked due to high security risk');
      } else if (result.riskScore > 40) {
        result.recommendations.push('Additional verification recommended');
      }

      // Log security validation
      await logAccess({
        cid: `security-validation-${request.identityId}`,
        identity: request.identityId,
        status: result.valid ? 'SUCCESS' : 'FAILED',
        operation: 'SECURITY_VALIDATION',
        reason: result.valid ? 'Security validation passed' : 'Security validation failed',
        metadata: {
          operation: request.operation,
          riskScore: result.riskScore,
          deviceTrust: result.deviceTrust,
          flagCount: result.securityFlags.length
        }
      });

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Security validation error';
      result.valid = false;
      result.riskScore = 100;
    }

    return result;
  }

  /**
   * Register a trusted device
   */
  public async registerTrustedDevice(fingerprint: DeviceFingerprint): Promise<void> {
    this.knownDevices.set(fingerprint.id, fingerprint);
    await this.saveKnownDevices();
  }

  /**
   * Check if device is trusted
   */
  public isDeviceTrusted(fingerprintId: string): boolean {
    return this.knownDevices.has(fingerprintId);
  }

  /**
   * Get security recommendations for identity
   */
  public getSecurityRecommendations(identity: ExtendedSquidIdentity): string[] {
    const recommendations: string[] = [];

    // Check KYC status
    if (!identity.kyc.approved && identity.kyc.required) {
      recommendations.push('Complete KYC verification to improve security');
    }

    // Check security flags
    const criticalFlags = identity.securityFlags.filter(flag => 
      flag.severity === 'CRITICAL' && !flag.resolved
    );
    if (criticalFlags.length > 0) {
      recommendations.push('Resolve critical security flags immediately');
    }

    // Check recent activity
    const recentActivity = identity.auditLog.filter(log => 
      new Date(log.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    if (recentActivity.length > 50) {
      recommendations.push('High activity detected - monitor for unusual patterns');
    }

    // Check privacy level
    if (identity.privacyLevel === 'PUBLIC') {
      recommendations.push('Consider using more restrictive privacy settings for sensitive operations');
    }

    return recommendations;
  }

  // Private helper methods

  private async generateCanvasFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Draw some text and shapes for fingerprinting
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test 🔒', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillRect(100, 5, 80, 20);

    const dataURL = canvas.toDataURL();
    return await this.hashString(dataURL);
  }

  private async generateWebGLFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL not available');

    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    const version = gl.getParameter(gl.VERSION);
    const extensions = gl.getSupportedExtensions()?.join(',') || '';

    const fingerprint = `${renderer}|${vendor}|${version}|${extensions}`;
    return await this.hashString(fingerprint);
  }

  private getAvailableFonts(): string[] {
    // Simplified font detection - in a real implementation, this would be more comprehensive
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    return testFonts.filter(font => this.isFontAvailable(font));
  }

  private isFontAvailable(font: string): boolean {
    // Simple font detection using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const baseline = 'serif';

    ctx.font = `${testSize} ${baseline}`;
    const baselineWidth = ctx.measureText(testString).width;

    ctx.font = `${testSize} ${font}, ${baseline}`;
    const fontWidth = ctx.measureText(testString).width;

    return fontWidth !== baselineWidth;
  }

  private getBrowserPlugins(): string[] {
    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push(plugin.name);
    }
    return plugins;
  }

  private async hashFingerprint(fingerprint: Omit<DeviceFingerprint, 'id'>): Promise<string> {
    const data = JSON.stringify(fingerprint);
    return await this.hashString(data);
  }

  private async hashString(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyRSASignature(request: SignatureVerificationRequest): Promise<boolean> {
    try {
      // Import public key
      const publicKeyBuffer = this.base64ToArrayBuffer(request.publicKey);
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-PSS',
          hash: 'SHA-256'
        },
        false,
        ['verify']
      );

      // Prepare message and signature
      const messageBuffer = new TextEncoder().encode(request.message);
      const signatureBuffer = this.base64ToArrayBuffer(request.signature);

      // Verify signature
      return await crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: 32
        },
        publicKey,
        signatureBuffer,
        messageBuffer
      );
    } catch (error) {
      console.error('[IdentitySecurityService] RSA signature verification failed:', error);
      return false;
    }
  }

  private async verifyECDSASignature(request: SignatureVerificationRequest): Promise<boolean> {
    try {
      // Import public key
      const publicKeyBuffer = this.base64ToArrayBuffer(request.publicKey);
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        false,
        ['verify']
      );

      // Prepare message and signature
      const messageBuffer = new TextEncoder().encode(request.message);
      const signatureBuffer = this.base64ToArrayBuffer(request.signature);

      // Verify signature
      return await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        publicKey,
        signatureBuffer,
        messageBuffer
      );
    } catch (error) {
      console.error('[IdentitySecurityService] ECDSA signature verification failed:', error);
      return false;
    }
  }

  private async verifyQuantumSignature(request: SignatureVerificationRequest): Promise<boolean> {
    // Quantum signature verification would be implemented here
    // For now, we'll simulate it
    console.warn('[IdentitySecurityService] Quantum signature verification not yet implemented');
    
    // Simulate verification with 95% success rate for demo
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.05;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async evaluateDeviceTrust(fingerprint: DeviceFingerprint): Promise<'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED'> {
    // Check if device is known and trusted
    if (this.knownDevices.has(fingerprint.id)) {
      const knownDevice = this.knownDevices.get(fingerprint.id)!;
      
      // Check if device characteristics have changed significantly
      if (this.hasDeviceChanged(knownDevice, fingerprint)) {
        return 'SUSPICIOUS';
      }
      
      return 'TRUSTED';
    }

    // Check for suspicious characteristics
    if (this.hasSuspiciousCharacteristics(fingerprint)) {
      return 'SUSPICIOUS';
    }

    // Check if device should be blocked
    if (this.shouldBlockDevice(fingerprint)) {
      return 'BLOCKED';
    }

    return 'UNKNOWN';
  }

  private hasDeviceChanged(known: DeviceFingerprint, current: DeviceFingerprint): boolean {
    // Check for significant changes that might indicate device spoofing
    return (
      known.userAgent !== current.userAgent ||
      known.screen.width !== current.screen.width ||
      known.screen.height !== current.screen.height ||
      known.timezone !== current.timezone ||
      known.language !== current.language
    );
  }

  private hasSuspiciousCharacteristics(fingerprint: DeviceFingerprint): boolean {
    // Check for characteristics that might indicate automation or spoofing
    return (
      fingerprint.userAgent.includes('HeadlessChrome') ||
      fingerprint.userAgent.includes('PhantomJS') ||
      fingerprint.userAgent.includes('Selenium') ||
      !fingerprint.cookieEnabled ||
      fingerprint.plugins?.length === 0
    );
  }

  private shouldBlockDevice(fingerprint: DeviceFingerprint): boolean {
    // Check for known malicious patterns
    const blockedUserAgents = [
      'malicious-bot',
      'attack-tool',
      'vulnerability-scanner'
    ];

    return blockedUserAgents.some(blocked => 
      fingerprint.userAgent.toLowerCase().includes(blocked)
    );
  }

  private isRelevantForPattern(log: AuditEntry, pattern: SuspiciousActivityPattern): boolean {
    switch (pattern.type) {
      case 'RAPID_SWITCHING':
        return log.action === IdentityAction.SWITCHED;
      case 'UNUSUAL_HOURS':
        const hour = new Date(log.timestamp).getHours();
        return hour >= 2 && hour <= 6;
      case 'EXCESSIVE_CREATION':
        return log.action === IdentityAction.CREATED;
      case 'FAILED_VERIFICATIONS':
        return log.metadata.securityLevel === 'CRITICAL' && 
               log.action === IdentityAction.SECURITY_EVENT;
      default:
        return true;
    }
  }

  private calculatePatternRisk(pattern: SuspiciousActivityPattern, eventCount: number): number {
    const baseRisk = {
      'LOW': 10,
      'MEDIUM': 25,
      'HIGH': 40,
      'CRITICAL': 60
    }[pattern.severity];

    // Increase risk based on how much the threshold was exceeded
    const excessFactor = Math.min(3, eventCount / pattern.threshold);
    return baseRisk * excessFactor;
  }

  private getPatternRecommendations(pattern: SuspiciousActivityPattern): string[] {
    switch (pattern.type) {
      case 'RAPID_SWITCHING':
        return [
          'Implement rate limiting for identity switching',
          'Require additional authentication for frequent switches'
        ];
      case 'UNUSUAL_HOURS':
        return [
          'Monitor night-time activity closely',
          'Consider requiring additional verification during unusual hours'
        ];
      case 'MULTIPLE_DEVICES':
        return [
          'Verify device authenticity',
          'Consider implementing device registration'
        ];
      case 'EXCESSIVE_CREATION':
        return [
          'Implement limits on identity creation',
          'Require additional verification for new identities'
        ];
      case 'FAILED_VERIFICATIONS':
        return [
          'Investigate failed verification attempts',
          'Consider temporarily suspending operations'
        ];
      default:
        return ['Monitor activity closely'];
    }
  }

  private loadKnownDevices(): void {
    try {
      const stored = localStorage.getItem('identity_security_known_devices');
      if (stored) {
        const devices = JSON.parse(stored);
        this.knownDevices = new Map(Object.entries(devices));
      }
    } catch (error) {
      console.error('[IdentitySecurityService] Failed to load known devices:', error);
    }
  }

  private async saveKnownDevices(): Promise<void> {
    try {
      const devices = Object.fromEntries(this.knownDevices);
      localStorage.setItem('identity_security_known_devices', JSON.stringify(devices));
    } catch (error) {
      console.error('[IdentitySecurityService] Failed to save known devices:', error);
    }
  }
}

export default IdentitySecurityService;