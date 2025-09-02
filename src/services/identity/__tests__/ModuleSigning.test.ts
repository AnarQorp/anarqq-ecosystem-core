/**
 * Simple test for Module Signing functionality
 * Tests the new module signing methods in isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityQlockService } from '../IdentityQlockService';
import { 
  QModuleMetadata, 
  ModuleStatus 
} from '@/types/qwallet-module-registration';
import { IdentityType } from '@/types/identity';

// Mock Qlock API
vi.mock('@/api/qlock', () => ({
  generateKeys: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Module Signing Functionality', () => {
  let service: IdentityQlockService;
  let mockQlockAPI: any;
  let mockModuleMetadata: QModuleMetadata;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    mockQlockAPI = await import('@/api/qlock');
    service = new IdentityQlockService();

    mockModuleMetadata = {
      module: 'Qwallet',
      version: '1.0.0',
      description: 'Quantum-resistant wallet module',
      identities_supported: [IdentityType.ROOT],
      integrations: ['Qindex', 'Qlock'],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
      compliance: {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'standard'
      },
      repository: 'https://github.com/anarq/qwallet',
      documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      activated_by: 'did:squid:root-123',
      timestamp: Date.now(),
      checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
      signature_algorithm: 'RSA-PSS-SHA256',
      public_key_id: 'module_key_123'
    };

    // Setup mock responses
    mockQlockAPI.generateKeys.mockResolvedValue({
      publicKey: 'mock-module-public-key',
      privateKey: 'mock-module-private-key'
    });

    mockQlockAPI.sign.mockResolvedValue({
      success: true,
      signature: 'mock-signature-123'
    });

    mockQlockAPI.verify.mockResolvedValue({
      success: true,
      valid: true
    });
  });

  it('should generate module signing keys', async () => {
    const identityId = 'did:squid:root-123';
    
    const moduleKeys = await service.generateModuleSigningKeys(identityId);

    expect(moduleKeys).toBeDefined();
    expect(moduleKeys.publicKey).toBe('mock-module-public-key');
    expect(moduleKeys.privateKey).toBe('mock-module-private-key');
    expect(moduleKeys.algorithm).toBe('RSA-PSS-SHA256');
    expect(moduleKeys.identityId).toBe(identityId);
    expect(moduleKeys.keyId).toContain('module_');
  });

  it('should sign module metadata', async () => {
    const identityId = 'did:squid:root-123';
    
    const signedMetadata = await service.signMetadata(mockModuleMetadata, identityId);

    expect(signedMetadata).toBeDefined();
    expect(signedMetadata.metadata).toEqual(mockModuleMetadata);
    expect(signedMetadata.signature).toBe('mock-signature-123');
    expect(signedMetadata.signer_identity).toBe(identityId);
    expect(signedMetadata.signature_type).toBe('RSA-PSS-SHA256');
  });

  it('should verify module metadata signature', async () => {
    const identityId = 'did:squid:root-123';
    
    const signedMetadata = await service.signMetadata(mockModuleMetadata, identityId);
    const result = await service.verifyMetadataSignature(signedMetadata);

    expect(result.valid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.identityVerified).toBe(true);
    expect(result.timestampValid).toBe(true);
  });

  it('should verify signer authority for ROOT identity', async () => {
    const authorized = await service.verifySignerAuthority('did:squid:root-123', 'Qwallet');
    expect(authorized).toBe(true);
  });

  it('should reject unauthorized signer', async () => {
    const authorized = await service.verifySignerAuthority('did:squid:unauthorized-123', 'Qwallet');
    expect(authorized).toBe(false);
  });

  it('should validate signature chain', async () => {
    const result = await service.validateSignatureChain('Qwallet');
    
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBeGreaterThan(0);
    expect(result.rootVerified).toBe(true);
  });
});