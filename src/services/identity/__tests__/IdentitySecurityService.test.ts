/**
 * Tests for IdentitySecurityService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import IdentitySecurityService, {
  DeviceFingerprint,
  SignatureVerificationRequest,
  SecurityValidationRequest,
  SuspiciousActivityPattern
} from '../IdentitySecurityService';
import { AuditEntry, IdentityAction, ExtendedSquidIdentity } from '@/types/identity';

// Mock the qerberos API
vi.mock('@/api/qerberos', () => ({
  logAccess: vi.fn().mockResolvedValue(undefined)
}));

// Mock Web APIs
const mockCrypto = {
  randomUUID: vi.fn(() => 'mock-uuid-123'),
  subtle: {
    digest: vi.fn(),
    importKey: vi.fn(),
    verify: vi.fn()
  }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  platform: 'Test Platform',
  cookieEnabled: true,
  doNotTrack: '0',
  plugins: [
    { name: 'Test Plugin 1' },
    { name: 'Test Plugin 2' }
  ]
};

const mockScreen = {
  width: 1920,
  height: 1080,
  colorDepth: 24
};

const mockIntl = {
  DateTimeFormat: vi.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' })
  }))
};

// Mock canvas and WebGL
const mockCanvas = {
  getContext: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data')
};

const mockCanvasContext = {
  textBaseline: '',
  font: '',
  fillText: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 }))
};

const mockWebGLContext = {
  getParameter: vi.fn(),
  getSupportedExtensions: vi.fn(() => ['ext1', 'ext2'])
};

// Setup global mocks
Object.defineProperty(global, 'crypto', { value: mockCrypto, writable: true });
Object.defineProperty(global, 'navigator', { value: mockNavigator, writable: true });
Object.defineProperty(global, 'screen', { value: mockScreen, writable: true });
Object.defineProperty(global, 'Intl', { value: mockIntl, writable: true });
Object.defineProperty(global, 'TextEncoder', { 
  value: class TextEncoder {
    encode(text: string) {
      return new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
    }
  }, 
  writable: true 
});
Object.defineProperty(global, 'atob', { 
  value: (str: string) => Buffer.from(str, 'base64').toString('binary'),
  writable: true 
});

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          ...mockCanvas,
          getContext: vi.fn((type: string) => {
            if (type === '2d') return mockCanvasContext;
            if (type === 'webgl' || type === 'experimental-webgl') return mockWebGLContext;
            return null;
          })
        };
      }
      return {};
    })
  },
  writable: true
});

describe('IdentitySecurityService', () => {
  let securityService: IdentitySecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    securityService = IdentitySecurityService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IdentitySecurityService.getInstance();
      const instance2 = IdentitySecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Device Fingerprinting', () => {
    beforeEach(() => {
      // Mock crypto.subtle.digest for hashing
      mockCrypto.subtle.digest.mockResolvedValue(
        new ArrayBuffer(32) // Mock SHA-256 hash
      );
    });

    it('should generate device fingerprint', async () => {
      const fingerprint = await securityService.generateDeviceFingerprint();

      expect(fingerprint).toMatchObject({
        userAgent: 'Mozilla/5.0 (Test Browser)',
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24
        },
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'Test Platform',
        cookieEnabled: true,
        doNotTrack: false
      });

      expect(fingerprint.id).toBeDefined();
      expect(fingerprint.timestamp).toBeDefined();
      expect(fingerprint.fonts).toBeInstanceOf(Array);
      expect(fingerprint.plugins).toEqual(['Test Plugin 1', 'Test Plugin 2']);
    });

    it('should generate canvas fingerprint', async () => {
      const fingerprint = await securityService.generateDeviceFingerprint();
      
      expect(fingerprint.canvas).toBeDefined();
      expect(mockCanvasContext.fillText).toHaveBeenCalled();
      expect(mockCanvasContext.fillRect).toHaveBeenCalled();
    });

    it('should generate WebGL fingerprint', async () => {
      mockWebGLContext.getParameter.mockReturnValue('Mock WebGL Info');
      
      const fingerprint = await securityService.generateDeviceFingerprint();
      
      expect(fingerprint.webgl).toBeDefined();
      expect(mockWebGLContext.getParameter).toHaveBeenCalled();
    });

    it('should handle canvas fingerprinting failure gracefully', async () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const fingerprint = await securityService.generateDeviceFingerprint();
      
      expect(fingerprint.canvas).toBeUndefined();
      expect(fingerprint.id).toBeDefined(); // Should still generate ID
    });

    it('should handle WebGL fingerprinting failure gracefully', async () => {
      mockCanvas.getContext.mockImplementation((type: string) => {
        if (type === '2d') return mockCanvasContext;
        return null; // No WebGL support
      });
      
      const fingerprint = await securityService.generateDeviceFingerprint();
      
      expect(fingerprint.webgl).toBeUndefined();
      expect(fingerprint.id).toBeDefined(); // Should still generate ID
    });
  });

  describe('Signature Verification', () => {
    const mockSignatureRequest: SignatureVerificationRequest = {
      message: 'test message',
      signature: 'dGVzdCBzaWduYXR1cmU=', // base64 encoded "test signature"
      publicKey: 'dGVzdCBwdWJsaWMga2V5', // base64 encoded "test public key"
      algorithm: 'RSA'
    };

    beforeEach(() => {
      mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    });

    it('should verify RSA signature successfully', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(true);
      
      const result = await securityService.verifySignature(mockSignatureRequest);
      
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('RSA');
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle RSA signature verification failure', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(false);
      
      const result = await securityService.verifySignature(mockSignatureRequest);
      
      expect(result.valid).toBe(false);
      expect(result.algorithm).toBe('RSA');
    });

    it('should verify ECDSA signature', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(true);
      
      const ecdsaRequest = { ...mockSignatureRequest, algorithm: 'ECDSA' as const };
      const result = await securityService.verifySignature(ecdsaRequest);
      
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('ECDSA');
    });

    it('should handle quantum signature verification', async () => {
      const quantumRequest = { ...mockSignatureRequest, algorithm: 'QUANTUM' as const };
      const result = await securityService.verifySignature(quantumRequest);
      
      // Quantum verification is simulated, so it should return a boolean
      expect(typeof result.valid).toBe('boolean');
      expect(result.algorithm).toBe('QUANTUM');
    });

    it('should handle unsupported signature algorithm', async () => {
      const invalidRequest = { ...mockSignatureRequest, algorithm: 'INVALID' as any };
      const result = await securityService.verifySignature(invalidRequest);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported signature algorithm');
    });

    it('should handle signature verification errors', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Key import failed'));
      
      const result = await securityService.verifySignature(mockSignatureRequest);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Key import failed');
    });
  });

  describe('Suspicious Activity Detection', () => {
    const mockIdentityId = 'did:test:123';
    const now = new Date();

    it('should detect rapid switching pattern', async () => {
      // Create 15 switch events in the last hour
      const rapidSwitchLogs: AuditEntry[] = Array.from({ length: 15 }, (_, i) => ({
        id: `audit-${i}`,
        identityId: mockIdentityId,
        action: IdentityAction.SWITCHED,
        timestamp: new Date(now.getTime() - i * 60000).toISOString(), // 1 minute apart
        metadata: {
          triggeredBy: 'user',
          securityLevel: 'MEDIUM' as any
        }
      }));

      const result = await securityService.detectSuspiciousActivity(mockIdentityId, rapidSwitchLogs);

      expect(result.detected).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe('RAPID_SWITCHING');
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Implement rate limiting for identity switching');
    });

    it('should detect unusual hours pattern', async () => {
      // Create activities during night hours (3 AM)
      const nightActivityLogs: AuditEntry[] = Array.from({ length: 8 }, (_, i) => ({
        id: `audit-night-${i}`,
        identityId: mockIdentityId,
        action: IdentityAction.UPDATED,
        timestamp: new Date(2024, 0, 1, 3, i * 10).toISOString(), // 3 AM activities
        metadata: {
          triggeredBy: 'user',
          securityLevel: 'LOW' as any
        }
      }));

      const result = await securityService.detectSuspiciousActivity(mockIdentityId, nightActivityLogs);

      expect(result.detected).toBe(true);
      expect(result.patterns.some(p => p.type === 'UNUSUAL_HOURS')).toBe(true);
      expect(result.recommendations).toContain('Monitor night-time activity closely');
    });

    it('should detect excessive creation pattern', async () => {
      // Create 8 identity creation events in the last day
      const excessiveCreationLogs: AuditEntry[] = Array.from({ length: 8 }, (_, i) => ({
        id: `audit-create-${i}`,
        identityId: `did:test:${i}`,
        action: IdentityAction.CREATED,
        timestamp: new Date(now.getTime() - i * 3600000).toISOString(), // 1 hour apart
        metadata: {
          triggeredBy: 'user',
          securityLevel: 'HIGH' as any
        }
      }));

      const result = await securityService.detectSuspiciousActivity(mockIdentityId, excessiveCreationLogs);

      expect(result.detected).toBe(true);
      expect(result.patterns.some(p => p.type === 'EXCESSIVE_CREATION')).toBe(true);
      expect(result.recommendations).toContain('Implement limits on identity creation');
    });

    it('should not detect patterns below threshold', async () => {
      // Create only 2 switch events (below threshold of 10)
      const normalLogs: AuditEntry[] = Array.from({ length: 2 }, (_, i) => ({
        id: `audit-${i}`,
        identityId: mockIdentityId,
        action: IdentityAction.SWITCHED,
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
        metadata: {
          triggeredBy: 'user',
          securityLevel: 'LOW' as any
        }
      }));

      const result = await securityService.detectSuspiciousActivity(mockIdentityId, normalLogs);

      expect(result.detected).toBe(false);
      expect(result.patterns).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('should calculate risk score correctly', async () => {
      // Create multiple patterns
      const mixedLogs: AuditEntry[] = [
        // Rapid switching (15 events)
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `switch-${i}`,
          identityId: mockIdentityId,
          action: IdentityAction.SWITCHED,
          timestamp: new Date(now.getTime() - i * 60000).toISOString(),
          metadata: { triggeredBy: 'user', securityLevel: 'MEDIUM' as any }
        })),
        // Night activity (8 events)
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `night-${i}`,
          identityId: mockIdentityId,
          action: IdentityAction.UPDATED,
          timestamp: new Date(2024, 0, 1, 3, i * 10).toISOString(),
          metadata: { triggeredBy: 'user', securityLevel: 'LOW' as any }
        }))
      ];

      const result = await securityService.detectSuspiciousActivity(mockIdentityId, mixedLogs);

      expect(result.detected).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(1);
      expect(result.riskScore).toBeGreaterThan(50); // Should be high due to multiple patterns
    });
  });

  describe('Security Validation', () => {
    const mockValidationRequest: SecurityValidationRequest = {
      identityId: 'did:test:123',
      operation: IdentityAction.SWITCHED,
      signature: {
        message: 'test message',
        signature: 'dGVzdCBzaWduYXR1cmU=',
        publicKey: 'dGVzdCBwdWJsaWMga2V5',
        algorithm: 'RSA'
      },
      deviceFingerprint: {
        id: 'device-123',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        screen: { width: 1920, height: 1080, colorDepth: 24 },
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'Test Platform',
        cookieEnabled: true,
        doNotTrack: false,
        timestamp: new Date().toISOString()
      }
    };

    beforeEach(() => {
      mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
      mockCrypto.subtle.verify.mockResolvedValue(true);
    });

    it('should validate secure operation successfully', async () => {
      const result = await securityService.validateIdentityOperation(mockValidationRequest);

      expect(result.valid).toBe(true);
      expect(result.riskScore).toBeLessThan(50);
      expect(result.signatureVerification?.valid).toBe(true);
      expect(result.deviceTrust).toBe('UNKNOWN'); // New device
      expect(result.securityFlags).toHaveLength(0);
    });

    it('should reject operation with invalid signature', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(false);

      const result = await securityService.validateIdentityOperation(mockValidationRequest);

      expect(result.valid).toBe(false);
      expect(result.riskScore).toBeGreaterThan(25);
      expect(result.signatureVerification?.valid).toBe(false);
      expect(result.securityFlags).toHaveLength(1);
      expect(result.securityFlags[0].type).toBe('SECURITY_BREACH');
    });

    it('should handle suspicious device', async () => {
      const suspiciousRequest = {
        ...mockValidationRequest,
        deviceFingerprint: {
          ...mockValidationRequest.deviceFingerprint!,
          userAgent: 'HeadlessChrome/91.0.4472.77', // Suspicious user agent
          cookieEnabled: false
        }
      };

      const result = await securityService.validateIdentityOperation(suspiciousRequest);

      expect(result.deviceTrust).toBe('SUSPICIOUS');
      expect(result.riskScore).toBeGreaterThan(20);
    });

    it('should block malicious device', async () => {
      const maliciousRequest = {
        ...mockValidationRequest,
        deviceFingerprint: {
          ...mockValidationRequest.deviceFingerprint!,
          userAgent: 'malicious-bot/1.0'
        }
      };

      const result = await securityService.validateIdentityOperation(maliciousRequest);

      expect(result.deviceTrust).toBe('BLOCKED');
      expect(result.valid).toBe(false);
      expect(result.riskScore).toBeGreaterThan(40);
    });

    it('should handle validation with suspicious activity', async () => {
      const rapidSwitchLogs: AuditEntry[] = Array.from({ length: 15 }, (_, i) => ({
        id: `audit-${i}`,
        identityId: 'did:test:123',
        action: IdentityAction.SWITCHED,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        metadata: { triggeredBy: 'user', securityLevel: 'MEDIUM' as any }
      }));

      const requestWithLogs = {
        ...mockValidationRequest,
        metadata: { auditLogs: rapidSwitchLogs }
      };

      const result = await securityService.validateIdentityOperation(requestWithLogs);

      expect(result.suspiciousActivity?.detected).toBe(true);
      expect(result.riskScore).toBeGreaterThan(30);
    });

    it('should block high-risk operations', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(false); // Invalid signature
      
      const highRiskRequest = {
        ...mockValidationRequest,
        deviceFingerprint: {
          ...mockValidationRequest.deviceFingerprint!,
          userAgent: 'HeadlessChrome/91.0.4472.77'
        },
        metadata: {
          auditLogs: Array.from({ length: 15 }, (_, i) => ({
            id: `audit-${i}`,
            identityId: 'did:test:123',
            action: IdentityAction.SWITCHED,
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            metadata: { triggeredBy: 'user', securityLevel: 'MEDIUM' as any }
          }))
        }
      };

      const result = await securityService.validateIdentityOperation(highRiskRequest);

      expect(result.valid).toBe(false);
      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.recommendations).toContain('Operation blocked due to high security risk');
    });

    it('should handle validation errors gracefully', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Crypto error'));

      const result = await securityService.validateIdentityOperation(mockValidationRequest);

      expect(result.valid).toBe(false);
      expect(result.riskScore).toBe(100);
      expect(result.error).toContain('Crypto error');
    });
  });

  describe('Device Trust Management', () => {
    const mockFingerprint: DeviceFingerprint = {
      id: 'device-123',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      screen: { width: 1920, height: 1080, colorDepth: 24 },
      timezone: 'America/New_York',
      language: 'en-US',
      platform: 'Test Platform',
      cookieEnabled: true,
      doNotTrack: false,
      timestamp: new Date().toISOString()
    };

    it('should register trusted device', async () => {
      await securityService.registerTrustedDevice(mockFingerprint);
      
      expect(securityService.isDeviceTrusted(mockFingerprint.id)).toBe(true);
    });

    it('should identify unknown device', () => {
      expect(securityService.isDeviceTrusted('unknown-device')).toBe(false);
    });
  });

  describe('Security Recommendations', () => {
    const mockIdentity: ExtendedSquidIdentity = {
      did: 'did:test:123',
      name: 'Test Identity',
      type: 'ROOT' as any,
      rootId: 'did:test:123',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: 'SELF' as any,
      creationRules: {} as any,
      permissions: {} as any,
      status: 'ACTIVE' as any,
      qonsentProfileId: 'qonsent-123',
      qlockKeyPair: {} as any,
      privacyLevel: 'PUBLIC' as any,
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastUsed: '2024-01-01T00:00:00Z',
      kyc: {
        required: true,
        submitted: false,
        approved: false
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: true
    };

    it('should recommend KYC completion', () => {
      const recommendations = securityService.getSecurityRecommendations(mockIdentity);
      
      expect(recommendations).toContain('Complete KYC verification to improve security');
    });

    it('should recommend resolving critical security flags', () => {
      const identityWithFlags = {
        ...mockIdentity,
        securityFlags: [{
          id: 'flag-1',
          type: 'SECURITY_BREACH' as any,
          severity: 'CRITICAL' as any,
          description: 'Critical security issue',
          timestamp: new Date().toISOString(),
          resolved: false
        }]
      };

      const recommendations = securityService.getSecurityRecommendations(identityWithFlags);
      
      expect(recommendations).toContain('Resolve critical security flags immediately');
    });

    it('should recommend monitoring high activity', () => {
      const highActivityLogs: AuditEntry[] = Array.from({ length: 60 }, (_, i) => ({
        id: `audit-${i}`,
        identityId: 'did:test:123',
        action: IdentityAction.UPDATED,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        metadata: { triggeredBy: 'user', securityLevel: 'LOW' as any }
      }));

      const identityWithHighActivity = {
        ...mockIdentity,
        auditLog: highActivityLogs
      };

      const recommendations = securityService.getSecurityRecommendations(identityWithHighActivity);
      
      expect(recommendations).toContain('High activity detected - monitor for unusual patterns');
    });

    it('should recommend privacy settings review', () => {
      const recommendations = securityService.getSecurityRecommendations(mockIdentity);
      
      expect(recommendations).toContain('Consider using more restrictive privacy settings for sensitive operations');
    });
  });
});