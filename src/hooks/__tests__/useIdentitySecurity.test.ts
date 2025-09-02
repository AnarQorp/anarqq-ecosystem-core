/**
 * Tests for useIdentitySecurity hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  useIdentitySecurity, 
  useDeviceFingerprinting,
  useSignatureVerification,
  useSuspiciousActivityDetection,
  useSecurityValidation
} from '../useIdentitySecurity';
import IdentitySecurityService from '@/services/identity/IdentitySecurityService';
import { useIdentityStore } from '@/state/identity';
import { IdentityAction } from '@/types/identity';

// Mock the identity store
vi.mock('@/state/identity', () => ({
  useIdentityStore: vi.fn()
}));

// Mock the security service
vi.mock('@/services/identity/IdentitySecurityService', () => ({
  default: {
    getInstance: vi.fn()
  }
}));

describe('useIdentitySecurity', () => {
  const mockSecurityService = {
    generateDeviceFingerprint: vi.fn(),
    isDeviceTrusted: vi.fn(),
    registerTrustedDevice: vi.fn(),
    verifySignature: vi.fn(),
    validateIdentityOperation: vi.fn(),
    detectSuspiciousActivity: vi.fn(),
    getSecurityRecommendations: vi.fn()
  };

  const mockIdentityStore = {
    getAuditLog: vi.fn()
  };

  const mockDeviceFingerprint = {
    id: 'device-123',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    timezone: 'America/New_York',
    language: 'en-US',
    platform: 'Test Platform',
    cookieEnabled: true,
    doNotTrack: false,
    timestamp: '2024-01-01T00:00:00Z'
  };

  const mockAuditLogs = [
    {
      id: 'audit-1',
      identityId: 'did:test:123',
      action: IdentityAction.SWITCHED,
      timestamp: '2024-01-01T10:00:00Z',
      metadata: {
        triggeredBy: 'user',
        securityLevel: 'MEDIUM' as any
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (IdentitySecurityService.getInstance as any).mockReturnValue(mockSecurityService);
    (useIdentityStore as any).mockReturnValue(mockIdentityStore);
    
    mockSecurityService.generateDeviceFingerprint.mockResolvedValue(mockDeviceFingerprint);
    mockSecurityService.isDeviceTrusted.mockReturnValue(false);
    mockSecurityService.registerTrustedDevice.mockResolvedValue(undefined);
    mockSecurityService.verifySignature.mockResolvedValue({
      valid: true,
      algorithm: 'RSA',
      timestamp: '2024-01-01T00:00:00Z'
    });
    mockSecurityService.validateIdentityOperation.mockResolvedValue({
      valid: true,
      riskScore: 10,
      deviceTrust: 'UNKNOWN',
      securityFlags: [],
      recommendations: []
    });
    mockSecurityService.detectSuspiciousActivity.mockResolvedValue({
      detected: false,
      patterns: [],
      events: [],
      riskScore: 0,
      recommendations: []
    });
    mockSecurityService.getSecurityRecommendations.mockReturnValue([]);
    mockIdentityStore.getAuditLog.mockResolvedValue(mockAuditLogs);
  });

  describe('useIdentitySecurity', () => {
    it('should generate device fingerprint on mount', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).toEqual(mockDeviceFingerprint);
      });

      expect(mockSecurityService.generateDeviceFingerprint).toHaveBeenCalledTimes(1);
    });

    it('should handle fingerprint generation error', async () => {
      mockSecurityService.generateDeviceFingerprint.mockRejectedValue(
        new Error('Fingerprint generation failed')
      );

      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.error).toBe('Fingerprint generation failed');
      });

      expect(result.current.deviceFingerprint).toBeNull();
    });

    it('should manually generate fingerprint', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      await act(async () => {
        await result.current.generateFingerprint();
      });

      expect(mockSecurityService.generateDeviceFingerprint).toHaveBeenCalledTimes(2); // Once on mount, once manually
    });

    it('should check device trust', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).not.toBeNull();
      });

      const isTrusted = result.current.isDeviceTrusted('device-123');
      expect(isTrusted).toBe(false);
      expect(mockSecurityService.isDeviceTrusted).toHaveBeenCalledWith('device-123');
    });

    it('should register trusted device', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).not.toBeNull();
      });

      await act(async () => {
        await result.current.registerTrustedDevice(mockDeviceFingerprint);
      });

      expect(mockSecurityService.registerTrustedDevice).toHaveBeenCalledWith(mockDeviceFingerprint);
    });

    it('should verify signature', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      const signatureRequest = {
        message: 'test message',
        signature: 'test-signature',
        publicKey: 'test-key',
        algorithm: 'RSA' as const
      };

      let verificationResult;
      await act(async () => {
        verificationResult = await result.current.verifySignature(signatureRequest);
      });

      expect(verificationResult).toEqual({
        valid: true,
        algorithm: 'RSA',
        timestamp: '2024-01-01T00:00:00Z'
      });
      expect(mockSecurityService.verifySignature).toHaveBeenCalledWith(signatureRequest);
    });

    it('should handle signature verification error', async () => {
      mockSecurityService.verifySignature.mockRejectedValue(
        new Error('Verification failed')
      );

      const { result } = renderHook(() => useIdentitySecurity());

      const signatureRequest = {
        message: 'test message',
        signature: 'test-signature',
        publicKey: 'test-key',
        algorithm: 'RSA' as const
      };

      let verificationResult;
      await act(async () => {
        verificationResult = await result.current.verifySignature(signatureRequest);
      });

      expect(verificationResult.valid).toBe(false);
      expect(verificationResult.error).toBe('Verification failed');
    });

    it('should validate operation', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).not.toBeNull();
      });

      const validationRequest = {
        identityId: 'did:test:123',
        operation: IdentityAction.SWITCHED
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateOperation(validationRequest);
      });

      expect(validationResult).toEqual({
        valid: true,
        riskScore: 10,
        deviceTrust: 'UNKNOWN',
        securityFlags: [],
        recommendations: []
      });

      expect(mockSecurityService.validateIdentityOperation).toHaveBeenCalledWith({
        ...validationRequest,
        deviceFingerprint: mockDeviceFingerprint,
        metadata: {
          auditLogs: mockAuditLogs
        }
      });
    });

    it('should detect suspicious activity', async () => {
      const { result } = renderHook(() => useIdentitySecurity());

      let activityResult;
      await act(async () => {
        activityResult = await result.current.detectSuspiciousActivity('did:test:123');
      });

      expect(activityResult).toEqual({
        detected: false,
        patterns: [],
        events: [],
        riskScore: 0,
        recommendations: []
      });

      expect(mockSecurityService.detectSuspiciousActivity).toHaveBeenCalledWith(
        'did:test:123',
        mockAuditLogs
      );
    });

    it('should get security recommendations', async () => {
      const mockIdentity = {
        did: 'did:test:123',
        name: 'Test Identity'
      } as any;

      mockSecurityService.getSecurityRecommendations.mockReturnValue([
        'Complete KYC verification'
      ]);

      const { result } = renderHook(() => useIdentitySecurity());

      const recommendations = result.current.getSecurityRecommendations(mockIdentity);

      expect(recommendations).toEqual(['Complete KYC verification']);
      expect(mockSecurityService.getSecurityRecommendations).toHaveBeenCalledWith(mockIdentity);
    });

    it('should handle loading states', async () => {
      // Make fingerprint generation slow
      mockSecurityService.generateDeviceFingerprint.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockDeviceFingerprint), 100))
      );

      const { result } = renderHook(() => useIdentitySecurity());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('useDeviceFingerprinting', () => {
    it('should provide device fingerprinting functionality', async () => {
      const { result } = renderHook(() => useDeviceFingerprinting());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).toEqual(mockDeviceFingerprint);
      });

      expect(result.current.isDeviceTrusted).toBeDefined();
      expect(result.current.registerTrustedDevice).toBeDefined();
      expect(result.current.generateFingerprint).toBeDefined();
    });
  });

  describe('useSignatureVerification', () => {
    it('should provide signature verification functionality', () => {
      const { result } = renderHook(() => useSignatureVerification());

      expect(result.current.verifySignature).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useSuspiciousActivityDetection', () => {
    it('should provide suspicious activity detection functionality', () => {
      const { result } = renderHook(() => useSuspiciousActivityDetection());

      expect(result.current.detectSuspiciousActivity).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useSecurityValidation', () => {
    it('should validate with automatic fingerprinting', async () => {
      const { result } = renderHook(() => useSecurityValidation());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).toEqual(mockDeviceFingerprint);
      });

      const validationRequest = {
        identityId: 'did:test:123',
        operation: IdentityAction.SWITCHED
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateOperation(validationRequest);
      });

      expect(validationResult.valid).toBe(true);
      expect(mockSecurityService.validateIdentityOperation).toHaveBeenCalledWith({
        ...validationRequest,
        deviceFingerprint: mockDeviceFingerprint
      });
    });

    it('should generate fingerprint if not available', async () => {
      // Start with no fingerprint
      mockSecurityService.generateDeviceFingerprint
        .mockResolvedValueOnce(null as any) // First call returns null
        .mockResolvedValueOnce(mockDeviceFingerprint); // Second call returns fingerprint

      const { result } = renderHook(() => useSecurityValidation());

      const validationRequest = {
        identityId: 'did:test:123',
        operation: IdentityAction.SWITCHED
      };

      await act(async () => {
        await result.current.validateOperation(validationRequest);
      });

      // Should call generateDeviceFingerprint twice (once on mount, once during validation)
      expect(mockSecurityService.generateDeviceFingerprint).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockSecurityService.validateIdentityOperation.mockRejectedValue(
        new Error('Service error')
      );

      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).not.toBeNull();
      });

      const validationRequest = {
        identityId: 'did:test:123',
        operation: IdentityAction.SWITCHED
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateOperation(validationRequest);
      });

      expect(validationResult.valid).toBe(false);
      expect(validationResult.riskScore).toBe(100);
      expect(validationResult.error).toBe('Service error');
      expect(result.current.error).toBe('Service error');
    });

    it('should handle audit log retrieval errors', async () => {
      mockIdentityStore.getAuditLog.mockRejectedValue(new Error('Audit log error'));

      const { result } = renderHook(() => useIdentitySecurity());

      await waitFor(() => {
        expect(result.current.deviceFingerprint).not.toBeNull();
      });

      let activityResult;
      await act(async () => {
        activityResult = await result.current.detectSuspiciousActivity('did:test:123');
      });

      expect(activityResult.detected).toBe(false);
      expect(result.current.error).toBe('Suspicious activity detection failed');
    });

    it('should handle security recommendations errors', () => {
      mockSecurityService.getSecurityRecommendations.mockImplementation(() => {
        throw new Error('Recommendations error');
      });

      const { result } = renderHook(() => useIdentitySecurity());

      const mockIdentity = { did: 'did:test:123' } as any;
      const recommendations = result.current.getSecurityRecommendations(mockIdentity);

      expect(recommendations).toEqual(['Unable to generate security recommendations']);
    });
  });
});