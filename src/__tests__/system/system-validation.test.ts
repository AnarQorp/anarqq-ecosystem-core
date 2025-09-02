/**
 * System Validation Test
 * Basic validation to ensure comprehensive testing setup is working
 */

import { describe, it, expect } from 'vitest';
import { 
  createMockIdentity, 
  createMockSubidentityMetadata,
  TestDataValidator,
  PerformanceTestUtils
} from '../utils/identity-test-utils';
import { IdentityType, PrivacyLevel } from '@/types/identity';

describe('System Validation Tests', () => {
  it('should validate test environment setup', () => {
    // Test that basic utilities are working
    expect(createMockIdentity).toBeDefined();
    expect(createMockSubidentityMetadata).toBeDefined();
    expect(TestDataValidator).toBeDefined();
    expect(PerformanceTestUtils).toBeDefined();
  });

  it('should create valid mock identity data', () => {
    const identity = createMockIdentity({
      type: IdentityType.ROOT,
      name: 'Test Root Identity'
    });

    expect(identity).toBeDefined();
    expect(identity.did).toMatch(/^did:key:/);
    expect(identity.name).toBe('Test Root Identity');
    expect(identity.type).toBe(IdentityType.ROOT);
  });

  it('should create valid mock subidentity metadata', () => {
    const metadata = createMockSubidentityMetadata({
      name: 'Test Subidentity',
      type: IdentityType.DAO,
      privacyLevel: PrivacyLevel.DAO_ONLY
    });

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('Test Subidentity');
    expect(metadata.privacyLevel).toBe(PrivacyLevel.DAO_ONLY);
  });

  it('should validate identity data correctly', () => {
    const validIdentity = createMockIdentity({
      type: IdentityType.DAO,
      name: 'Valid Identity',
      parentId: 'did:key:parent_identity' // DAO identity needs a parent
    });

    const validation = TestDataValidator.validateIdentity(validIdentity);
    
    // Debug the validation errors
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
    }
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid identity data', () => {
    const invalidIdentity = createMockIdentity({
      did: 'invalid_did_format',
      name: ''
    });

    const validation = TestDataValidator.validateIdentity(invalidIdentity);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should measure performance correctly', () => {
    const endMeasurement = PerformanceTestUtils.startMeasurement('Test Operation');
    
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Wait 10ms
    }
    
    const duration = endMeasurement();
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Should be less than 1 second
  });

  it('should handle environment variables correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.VITEST_SYSTEM_TEST).toBe('true');
  });

  it('should have access to mocked browser APIs', () => {
    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
    expect(window.matchMedia).toBeDefined();
    expect(window.localStorage).toBeDefined();
    expect(window.sessionStorage).toBeDefined();
  });
});