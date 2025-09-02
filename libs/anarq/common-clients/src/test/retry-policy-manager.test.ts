import { describe, it, expect } from 'vitest';
import { RetryPolicyManager } from '../retry/RetryPolicyManager.js';
import { ErrorCodes } from '../types/client.js';

describe('RetryPolicyManager', () => {
  describe('Predefined Policies', () => {
    it('should have conservative policy with minimal retries', () => {
      const policy = RetryPolicyManager.CONSERVATIVE;
      
      expect(policy.maxAttempts).toBe(2);
      expect(policy.baseDelay).toBe(1000);
      expect(policy.maxDelay).toBe(5000);
      expect(policy.backoffMultiplier).toBe(2);
      expect(policy.jitter).toBe(true);
      expect(policy.retryableErrors).toContain(ErrorCodes.SERVICE_UNAVAILABLE);
      expect(policy.retryableStatusCodes).toContain(503);
    });

    it('should have standard policy with balanced settings', () => {
      const policy = RetryPolicyManager.STANDARD;
      
      expect(policy.maxAttempts).toBe(3);
      expect(policy.baseDelay).toBe(100);
      expect(policy.maxDelay).toBe(30000);
      expect(policy.backoffMultiplier).toBe(2);
      expect(policy.jitter).toBe(true);
      expect(policy.retryableErrors).toContain(ErrorCodes.RATE_LIMIT_EXCEEDED);
      expect(policy.retryableStatusCodes).toContain(429);
    });

    it('should have aggressive policy with maximum retries', () => {
      const policy = RetryPolicyManager.AGGRESSIVE;
      
      expect(policy.maxAttempts).toBe(5);
      expect(policy.baseDelay).toBe(50);
      expect(policy.maxDelay).toBe(60000);
      expect(policy.backoffMultiplier).toBe(2.5);
      expect(policy.jitter).toBe(true);
      expect(policy.retryableErrors).toContain(ErrorCodes.CIRCUIT_BREAKER_OPEN);
    });

    it('should have fast policy for real-time operations', () => {
      const policy = RetryPolicyManager.FAST;
      
      expect(policy.maxAttempts).toBe(3);
      expect(policy.baseDelay).toBe(25);
      expect(policy.maxDelay).toBe(1000);
      expect(policy.backoffMultiplier).toBe(1.5);
      expect(policy.jitter).toBe(true);
      expect(policy.retryableErrors).toHaveLength(2); // Only critical errors
    });

    it('should have no-retry policy for fail-fast scenarios', () => {
      const policy = RetryPolicyManager.NO_RETRY;
      
      expect(policy.maxAttempts).toBe(1);
      expect(policy.baseDelay).toBe(0);
      expect(policy.maxDelay).toBe(0);
      expect(policy.backoffMultiplier).toBe(1);
      expect(policy.jitter).toBe(false);
      expect(policy.retryableErrors).toHaveLength(0);
      expect(policy.retryableStatusCodes).toHaveLength(0);
    });
  });

  describe('createCustom', () => {
    it('should create custom policy with valid configuration', () => {
      const customConfig = {
        maxAttempts: 4,
        baseDelay: 200,
        maxDelay: 10000,
        backoffMultiplier: 1.8
      };

      const policy = RetryPolicyManager.createCustom(customConfig);

      expect(policy.maxAttempts).toBe(4);
      expect(policy.baseDelay).toBe(200);
      expect(policy.maxDelay).toBe(10000);
      expect(policy.backoffMultiplier).toBe(1.8);
      // Should inherit other values from STANDARD
      expect(policy.jitter).toBe(true);
      expect(policy.retryableErrors).toContain(ErrorCodes.SERVICE_UNAVAILABLE);
    });

    it('should validate maxAttempts', () => {
      expect(() => {
        RetryPolicyManager.createCustom({ maxAttempts: 0 });
      }).toThrow('maxAttempts must be at least 1');

      expect(() => {
        RetryPolicyManager.createCustom({ maxAttempts: -1 });
      }).toThrow('maxAttempts must be at least 1');
    });

    it('should validate baseDelay', () => {
      expect(() => {
        RetryPolicyManager.createCustom({ baseDelay: -100 });
      }).toThrow('baseDelay must be non-negative');
    });

    it('should validate maxDelay vs baseDelay', () => {
      expect(() => {
        RetryPolicyManager.createCustom({ 
          baseDelay: 1000, 
          maxDelay: 500 
        });
      }).toThrow('maxDelay must be greater than or equal to baseDelay');
    });

    it('should validate backoffMultiplier', () => {
      expect(() => {
        RetryPolicyManager.createCustom({ backoffMultiplier: 0 });
      }).toThrow('backoffMultiplier must be positive');

      expect(() => {
        RetryPolicyManager.createCustom({ backoffMultiplier: -1 });
      }).toThrow('backoffMultiplier must be positive');
    });
  });

  describe('getPolicy', () => {
    it('should return correct predefined policies', () => {
      expect(RetryPolicyManager.getPolicy('CONSERVATIVE')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.getPolicy('STANDARD')).toBe(RetryPolicyManager.STANDARD);
      expect(RetryPolicyManager.getPolicy('AGGRESSIVE')).toBe(RetryPolicyManager.AGGRESSIVE);
      expect(RetryPolicyManager.getPolicy('FAST')).toBe(RetryPolicyManager.FAST);
      expect(RetryPolicyManager.getPolicy('NO_RETRY')).toBe(RetryPolicyManager.NO_RETRY);
    });

    it('should be case insensitive', () => {
      expect(RetryPolicyManager.getPolicy('conservative')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.getPolicy('Standard')).toBe(RetryPolicyManager.STANDARD);
      expect(RetryPolicyManager.getPolicy('AGGRESSIVE')).toBe(RetryPolicyManager.AGGRESSIVE);
    });

    it('should throw error for unknown policy', () => {
      expect(() => {
        RetryPolicyManager.getPolicy('UNKNOWN');
      }).toThrow('Unknown retry policy: UNKNOWN');
    });
  });

  describe('forModule', () => {
    it('should return appropriate policies for different modules', () => {
      // Critical modules should use conservative policies
      expect(RetryPolicyManager.forModule('qlock')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.forModule('qwallet')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.forModule('qerberos')).toBe(RetryPolicyManager.CONSERVATIVE);

      // Fast modules should use fast policies
      expect(RetryPolicyManager.forModule('squid')).toBe(RetryPolicyManager.FAST);
      expect(RetryPolicyManager.forModule('qonsent')).toBe(RetryPolicyManager.FAST);

      // Storage modules should use aggressive policies
      expect(RetryPolicyManager.forModule('qdrive')).toBe(RetryPolicyManager.AGGRESSIVE);
      expect(RetryPolicyManager.forModule('qpic')).toBe(RetryPolicyManager.AGGRESSIVE);
      expect(RetryPolicyManager.forModule('qindex')).toBe(RetryPolicyManager.AGGRESSIVE);

      // Business modules should use standard policies
      expect(RetryPolicyManager.forModule('qmarket')).toBe(RetryPolicyManager.STANDARD);
      expect(RetryPolicyManager.forModule('qmail')).toBe(RetryPolicyManager.STANDARD);
      expect(RetryPolicyManager.forModule('qchat')).toBe(RetryPolicyManager.STANDARD);

      // Unknown modules should use standard policy
      expect(RetryPolicyManager.forModule('unknown')).toBe(RetryPolicyManager.STANDARD);
    });

    it('should be case insensitive', () => {
      expect(RetryPolicyManager.forModule('QWALLET')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.forModule('QWallet')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.forModule('qwallet')).toBe(RetryPolicyManager.CONSERVATIVE);
    });
  });

  describe('forCriticality', () => {
    it('should return appropriate policies for different criticality levels', () => {
      expect(RetryPolicyManager.forCriticality('LOW')).toBe(RetryPolicyManager.AGGRESSIVE);
      expect(RetryPolicyManager.forCriticality('MEDIUM')).toBe(RetryPolicyManager.STANDARD);
      expect(RetryPolicyManager.forCriticality('HIGH')).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(RetryPolicyManager.forCriticality('CRITICAL')).toBe(RetryPolicyManager.NO_RETRY);
    });
  });

  describe('merge', () => {
    it('should return standard policy for empty input', () => {
      const merged = RetryPolicyManager.merge();
      expect(merged).toBe(RetryPolicyManager.STANDARD);
    });

    it('should return single policy unchanged', () => {
      const merged = RetryPolicyManager.merge(RetryPolicyManager.AGGRESSIVE);
      expect(merged).toBe(RetryPolicyManager.AGGRESSIVE);
    });

    it('should merge multiple policies conservatively', () => {
      const merged = RetryPolicyManager.merge(
        RetryPolicyManager.AGGRESSIVE,
        RetryPolicyManager.CONSERVATIVE,
        RetryPolicyManager.FAST
      );

      // Should take most conservative values
      expect(merged.maxAttempts).toBe(2); // Min from CONSERVATIVE
      expect(merged.baseDelay).toBe(1000); // Max from CONSERVATIVE
      expect(merged.maxDelay).toBe(1000); // Min from FAST
      expect(merged.backoffMultiplier).toBe(1.5); // Min from FAST
      expect(merged.jitter).toBe(true); // Any true
      
      // Should combine all retryable errors and status codes
      expect(merged.retryableErrors.length).toBeGreaterThan(0);
      expect(merged.retryableStatusCodes.length).toBeGreaterThan(0);
    });
  });

  describe('calculateMaxTotalDelay', () => {
    it('should calculate correct total delay for standard policy', () => {
      const totalDelay = RetryPolicyManager.calculateMaxTotalDelay(
        RetryPolicyManager.STANDARD
      );

      // For STANDARD: 3 attempts, base 100ms, multiplier 2, max 30s
      // Delays: 100ms, 200ms (total: 300ms)
      expect(totalDelay).toBe(300);
    });

    it('should respect max delay cap', () => {
      const policy = RetryPolicyManager.createCustom({
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 3
      });

      const totalDelay = RetryPolicyManager.calculateMaxTotalDelay(policy);

      // Delays would be: 1000, 3000 (capped to 2000), 9000 (capped to 2000), 27000 (capped to 2000)
      // Total: 1000 + 2000 + 2000 + 2000 = 7000
      expect(totalDelay).toBe(7000);
    });

    it('should handle single attempt policy', () => {
      const totalDelay = RetryPolicyManager.calculateMaxTotalDelay(
        RetryPolicyManager.NO_RETRY
      );

      expect(totalDelay).toBe(0);
    });
  });

  describe('getRecommendations', () => {
    it('should recommend based on criticality', () => {
      const recommendations = RetryPolicyManager.getRecommendations({
        criticality: 'HIGH'
      });

      expect(recommendations.recommended).toBe(RetryPolicyManager.CONSERVATIVE);
      expect(recommendations.alternatives.length).toBeGreaterThan(0);
    });

    it('should recommend based on module', () => {
      const recommendations = RetryPolicyManager.getRecommendations({
        module: 'qwallet'
      });

      expect(recommendations.recommended).toBe(RetryPolicyManager.CONSERVATIVE);
    });

    it('should recommend based on real-time requirement', () => {
      const recommendations = RetryPolicyManager.getRecommendations({
        realTime: true
      });

      expect(recommendations.recommended).toBe(RetryPolicyManager.FAST);
      
      // Should include FAST in alternatives
      const fastAlternative = recommendations.alternatives.find(
        alt => alt.name === 'FAST'
      );
      expect(fastAlternative).toBeDefined();
      expect(fastAlternative!.reason).toContain('real-time');
    });

    it('should provide user-facing alternatives', () => {
      const recommendations = RetryPolicyManager.getRecommendations({
        userFacing: true
      });

      const conservativeAlternative = recommendations.alternatives.find(
        alt => alt.name === 'CONSERVATIVE'
      );
      expect(conservativeAlternative).toBeDefined();
      expect(conservativeAlternative!.reason).toContain('user wait time');
    });

    it('should provide aggressive alternatives for low criticality', () => {
      const recommendations = RetryPolicyManager.getRecommendations({
        criticality: 'LOW'
      });

      const aggressiveAlternative = recommendations.alternatives.find(
        alt => alt.name === 'AGGRESSIVE'
      );
      expect(aggressiveAlternative).toBeDefined();
      expect(aggressiveAlternative!.reason).toContain('non-critical');
    });

    it('should fall back to standard policy', () => {
      const recommendations = RetryPolicyManager.getRecommendations({});

      expect(recommendations.recommended).toBe(RetryPolicyManager.STANDARD);
    });
  });
});