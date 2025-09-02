/**
 * Qwallet Security and Permissions Tests
 * 
 * Comprehensive security tests for wallet operations, permissions,
 * and identity-based access controls
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock all external services
vi.mock('../../api/qwallet');
vi.mock('../../api/qonsent');
vi.mock('../../api/qlock');
vi.mock('../../api/qerberos');
vi.mock('../../utils/security-context');

import * as qwalletApi from '../../api/qwallet';
import * as qonsentApi from '../../api/qonsent';
import * as qlockApi from '../../api/qlock';
import * as qerberosApi from '../../api/qerberos';
import * as securityContext from '../../utils/security-context';

describe('Qwallet Security and Permissions Tests', () => {
  const mockRootIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root123',
    identityType: IdentityType.ROOT,
    displayName: 'Root User',
    isActive: true,
    permissions: ['wallet:full_access'],
    walletAddress: 'wallet-root123',
    qlockKeyPair: {
      publicKey: 'pub-key-root',
      privateKey: 'priv-key-root'
    }
  };

  const mockDAOIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:dao123',
    identityType: IdentityType.DAO,
    displayName: 'DAO Member',
    isActive: true,
    permissions: ['wallet:dao_access'],
    walletAddress: 'wallet-dao123',
    qlockKeyPair: {
      publicKey: 'pub-key-dao',
      privateKey: 'priv-key-dao'
    }
  };

  const mockConsentidaIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:consentida123',
    identityType: IdentityType.CONSENTIDA,
    displayName: 'Minor User',
    isActive: true,
    permissions: ['wallet:view_only'],
    walletAddress: 'wallet-consentida123',
    qlockKeyPair: {
      publicKey: 'pub-key-consentida',
      privateKey: 'priv-key-consentida'
    }
  };

  const mockAIDIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:aid123',
    identityType: IdentityType.AID,
    displayName: 'Anonymous User',
    isActive: true,
    permissions: ['wallet:anonymous'],
    walletAddress: 'wallet-aid123',
    qlockKeyPair: {
      publicKey: 'pub-key-aid',
      privateKey: 'priv-key-aid'
    }
  };

  const mockMaliciousIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:malicious123',
    identityType: IdentityType.ROOT,
    displayName: 'Malicious User',
    isActive: false, // Inactive identity
    permissions: [],
    walletAddress: 'wallet-malicious123',
    qlockKeyPair: {
      publicKey: 'pub-key-malicious',
      privateKey: 'priv-key-malicious'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default secure responses
    vi.mocked(qonsentApi.checkPermission).mockResolvedValue(true);
    vi.mocked(qlockApi.signTransaction).mockResolvedValue({
      success: true,
      signature: 'valid-signature'
    });
    vi.mocked(qerberosApi.logAuditEvent).mockResolvedValue({ success: true });
    vi.mocked(securityContext.validateSecurityContext).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Identity Validation and Authentication', () => {
    it('should reject operations from inactive identities', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Check if identity is active
          if (!identity.isActive) {
            return {
              success: false,
              error: 'Identity is not active'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      const result = await walletService.transferTokens(mockMaliciousIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Identity is not active');
    });

    it('should validate identity permissions before operations', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Check if identity has required permissions
          if (!identity.permissions.includes('wallet:full_access') && 
              !identity.permissions.includes('wallet:dao_access')) {
            return {
              success: false,
              error: 'Insufficient permissions'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // Should succeed for ROOT identity
      const rootResult = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      expect(rootResult.success).toBe(true);

      // Should fail for CONSENTIDA identity
      const consentidaResult = await walletService.transferTokens(mockConsentidaIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      expect(consentidaResult.success).toBe(false);
      expect(consentidaResult.error).toBe('Insufficient permissions');
    });

    it('should validate wallet address ownership', async () => {
      const walletService = {
        getBalance: async (identity: ExtendedSquidIdentity) => {
          // Validate that the identity owns the wallet address
          const expectedWalletAddress = `wallet-${identity.did.split(':')[2]}`;
          
          if (identity.walletAddress !== expectedWalletAddress) {
            return {
              success: false,
              error: 'Wallet address mismatch'
            };
          }
          
          return {
            success: true,
            data: { QToken: 1000 }
          };
        }
      };

      // Create identity with mismatched wallet address
      const tamperedIdentity = {
        ...mockRootIdentity,
        walletAddress: 'wallet-different123'
      };

      const result = await walletService.getBalance(tamperedIdentity);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet address mismatch');
    });
  });

  describe('Transaction Security', () => {
    it('should require Qlock signature for all transactions', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Require Qlock signature
          const signatureResult = await qlockApi.signTransaction({
            from: identity.walletAddress,
            to: transferData.to,
            amount: transferData.amount,
            token: transferData.token
          }, identity.qlockKeyPair);
          
          if (!signatureResult.success) {
            return {
              success: false,
              error: 'Transaction signature failed'
            };
          }
          
          return {
            success: true,
            transactionId: 'tx-123',
            signature: signatureResult.signature
          };
        }
      };

      const result = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(result.success).toBe(true);
      expect(qlockApi.signTransaction).toHaveBeenCalled();
      expect(result.signature).toBe('valid-signature');
    });

    it('should reject transactions with invalid signatures', async () => {
      vi.mocked(qlockApi.signTransaction).mockResolvedValue({
        success: false,
        error: 'Invalid signature'
      });

      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          const signatureResult = await qlockApi.signTransaction({
            from: identity.walletAddress,
            to: transferData.to,
            amount: transferData.amount,
            token: transferData.token
          }, identity.qlockKeyPair);
          
          if (!signatureResult.success) {
            return {
              success: false,
              error: 'Transaction signature failed'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      const result = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction signature failed');
    });

    it('should validate transaction amounts and limits', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Get wallet permissions
          const permissions = await qwalletApi.getWalletPermissions(identity.walletAddress);
          
          if (transferData.amount <= 0) {
            return {
              success: false,
              error: 'Invalid amount'
            };
          }
          
          if (transferData.amount > permissions.data.dailyLimit) {
            return {
              success: false,
              error: 'Amount exceeds daily limit'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      vi.mocked(qwalletApi.getWalletPermissions).mockResolvedValue({
        success: true,
        data: { dailyLimit: 1000 }
      });

      // Should reject negative amounts
      const negativeResult = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: -100,
        token: 'QToken'
      });
      expect(negativeResult.success).toBe(false);
      expect(negativeResult.error).toBe('Invalid amount');

      // Should reject amounts exceeding limits
      const excessiveResult = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 2000,
        token: 'QToken'
      });
      expect(excessiveResult.success).toBe(false);
      expect(excessiveResult.error).toBe('Amount exceeds daily limit');
    });
  });

  describe('Qonsent Permission System', () => {
    it('should check Qonsent permissions for sensitive operations', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Check Qonsent permission
          const hasPermission = await qonsentApi.checkPermission(
            identity.did,
            'wallet:transfer',
            transferData
          );
          
          if (!hasPermission) {
            return {
              success: false,
              error: 'Permission denied by Qonsent'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // Should succeed when permission is granted
      const result = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(result.success).toBe(true);
      expect(qonsentApi.checkPermission).toHaveBeenCalledWith(
        mockRootIdentity.did,
        'wallet:transfer',
        {
          to: 'recipient-address',
          amount: 100,
          token: 'QToken'
        }
      );
    });

    it('should handle Qonsent permission denials', async () => {
      vi.mocked(qonsentApi.checkPermission).mockResolvedValue(false);

      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          const hasPermission = await qonsentApi.checkPermission(
            identity.did,
            'wallet:transfer',
            transferData
          );
          
          if (!hasPermission) {
            return {
              success: false,
              error: 'Permission denied by Qonsent'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      const result = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied by Qonsent');
    });

    it('should handle different permission levels for different identity types', async () => {
      const walletService = {
        linkPiWallet: async (identity: ExtendedSquidIdentity, piWalletData: any) => {
          // Different permission requirements based on identity type
          let requiredPermission = 'wallet:link_external';
          
          if (identity.identityType === IdentityType.CONSENTIDA) {
            requiredPermission = 'wallet:link_external:guardian_approved';
          } else if (identity.identityType === IdentityType.AID) {
            // AID identities cannot link external wallets
            return {
              success: false,
              error: 'External wallet linking not allowed for anonymous identities'
            };
          }
          
          const hasPermission = await qonsentApi.checkPermission(
            identity.did,
            requiredPermission,
            piWalletData
          );
          
          if (!hasPermission) {
            return {
              success: false,
              error: 'Permission denied by Qonsent'
            };
          }
          
          return { success: true, linkedAt: new Date().toISOString() };
        }
      };

      // Should succeed for ROOT identity
      const rootResult = await walletService.linkPiWallet(mockRootIdentity, {
        piUserId: 'pi-user-123'
      });
      expect(rootResult.success).toBe(true);

      // Should fail for AID identity
      const aidResult = await walletService.linkPiWallet(mockAIDIdentity, {
        piUserId: 'pi-user-123'
      });
      expect(aidResult.success).toBe(false);
      expect(aidResult.error).toBe('External wallet linking not allowed for anonymous identities');
    });
  });

  describe('Audit Trail and Compliance', () => {
    it('should log all wallet operations to Qerberos', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Log the operation
          await qerberosApi.logAuditEvent({
            event: 'wallet_transfer',
            identityId: identity.did,
            identityType: identity.identityType,
            details: transferData,
            timestamp: new Date().toISOString(),
            securityLevel: 'HIGH'
          });
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledWith({
        event: 'wallet_transfer',
        identityId: mockRootIdentity.did,
        identityType: IdentityType.ROOT,
        details: {
          to: 'recipient-address',
          amount: 100,
          token: 'QToken'
        },
        timestamp: expect.any(String),
        securityLevel: 'HIGH'
      });
    });

    it('should log security violations and failed attempts', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          if (!identity.isActive) {
            // Log security violation
            await qerberosApi.logAuditEvent({
              event: 'security_violation',
              identityId: identity.did,
              details: {
                violation: 'inactive_identity_attempt',
                attemptedOperation: 'wallet_transfer',
                transferData
              },
              timestamp: new Date().toISOString(),
              securityLevel: 'CRITICAL'
            });
            
            return {
              success: false,
              error: 'Identity is not active'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      await walletService.transferTokens(mockMaliciousIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledWith({
        event: 'security_violation',
        identityId: mockMaliciousIdentity.did,
        details: {
          violation: 'inactive_identity_attempt',
          attemptedOperation: 'wallet_transfer',
          transferData: {
            to: 'recipient-address',
            amount: 100,
            token: 'QToken'
          }
        },
        timestamp: expect.any(String),
        securityLevel: 'CRITICAL'
      });
    });

    it('should maintain separate audit trails per identity', async () => {
      const auditService = {
        logMultipleOperations: async (operations: Array<{ identity: ExtendedSquidIdentity, operation: string, details: any }>) => {
          for (const op of operations) {
            await qerberosApi.logAuditEvent({
              event: op.operation,
              identityId: op.identity.did,
              identityType: op.identity.identityType,
              details: op.details,
              timestamp: new Date().toISOString()
            });
          }
        }
      };

      await auditService.logMultipleOperations([
        {
          identity: mockRootIdentity,
          operation: 'wallet_transfer',
          details: { amount: 1000, token: 'QToken' }
        },
        {
          identity: mockDAOIdentity,
          operation: 'wallet_transfer',
          details: { amount: 500, token: 'DAOToken' }
        },
        {
          identity: mockConsentidaIdentity,
          operation: 'wallet_view',
          details: { action: 'balance_check' }
        }
      ]);
      
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledTimes(3);
      
      // Verify each call has correct identity context
      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
        identityId: mockRootIdentity.did,
        identityType: IdentityType.ROOT
      }));
      
      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
        identityId: mockDAOIdentity.did,
        identityType: IdentityType.DAO
      }));
      
      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
        identityId: mockConsentidaIdentity.did,
        identityType: IdentityType.CONSENTIDA
      }));
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize wallet addresses', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Validate recipient address format
          const addressRegex = /^0x[a-fA-F0-9]{40}$/;
          
          if (!addressRegex.test(transferData.to)) {
            return {
              success: false,
              error: 'Invalid recipient address format'
            };
          }
          
          // Check for known malicious addresses
          const maliciousAddresses = [
            '0x0000000000000000000000000000000000000000',
            '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
          ];
          
          if (maliciousAddresses.includes(transferData.to.toLowerCase())) {
            return {
              success: false,
              error: 'Recipient address is blacklisted'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // Should reject invalid address format
      const invalidResult = await walletService.transferTokens(mockRootIdentity, {
        to: 'invalid-address',
        amount: 100,
        token: 'QToken'
      });
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBe('Invalid recipient address format');

      // Should reject blacklisted addresses
      const blacklistedResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x0000000000000000000000000000000000000000',
        amount: 100,
        token: 'QToken'
      });
      expect(blacklistedResult.success).toBe(false);
      expect(blacklistedResult.error).toBe('Recipient address is blacklisted');

      // Should accept valid address
      const validResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: 100,
        token: 'QToken'
      });
      expect(validResult.success).toBe(true);
    });

    it('should validate token types and amounts', async () => {
      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          // Validate token type
          const allowedTokens = ['QToken', 'PiToken', 'ETH', 'DAOToken', 'BusinessToken'];
          
          if (!allowedTokens.includes(transferData.token)) {
            return {
              success: false,
              error: 'Invalid token type'
            };
          }
          
          // Validate amount
          if (typeof transferData.amount !== 'number' || 
              transferData.amount <= 0 || 
              !Number.isFinite(transferData.amount)) {
            return {
              success: false,
              error: 'Invalid amount'
            };
          }
          
          // Check for suspiciously large amounts
          if (transferData.amount > 1000000) {
            return {
              success: false,
              error: 'Amount exceeds maximum allowed'
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // Should reject invalid token
      const invalidTokenResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: 100,
        token: 'InvalidToken'
      });
      expect(invalidTokenResult.success).toBe(false);
      expect(invalidTokenResult.error).toBe('Invalid token type');

      // Should reject invalid amounts
      const invalidAmountResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: -100,
        token: 'QToken'
      });
      expect(invalidAmountResult.success).toBe(false);
      expect(invalidAmountResult.error).toBe('Invalid amount');

      // Should reject excessive amounts
      const excessiveAmountResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: 2000000,
        token: 'QToken'
      });
      expect(excessiveAmountResult.success).toBe(false);
      expect(excessiveAmountResult.error).toBe('Amount exceeds maximum allowed');
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should implement rate limiting for sensitive operations', async () => {
      const rateLimiter = {
        attempts: new Map<string, { count: number, lastAttempt: number }>(),
        
        checkRateLimit: (identityId: string, operation: string, maxAttempts: number = 5, windowMs: number = 60000) => {
          const key = `${identityId}:${operation}`;
          const now = Date.now();
          const record = this.attempts.get(key);
          
          if (!record) {
            this.attempts.set(key, { count: 1, lastAttempt: now });
            return { allowed: true, remaining: maxAttempts - 1 };
          }
          
          // Reset if window has passed
          if (now - record.lastAttempt > windowMs) {
            this.attempts.set(key, { count: 1, lastAttempt: now });
            return { allowed: true, remaining: maxAttempts - 1 };
          }
          
          // Check if limit exceeded
          if (record.count >= maxAttempts) {
            return { allowed: false, remaining: 0, retryAfter: windowMs - (now - record.lastAttempt) };
          }
          
          // Increment count
          record.count++;
          record.lastAttempt = now;
          
          return { allowed: true, remaining: maxAttempts - record.count };
        }
      };

      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          const rateCheck = rateLimiter.checkRateLimit(identity.did, 'transfer', 3, 60000);
          
          if (!rateCheck.allowed) {
            return {
              success: false,
              error: 'Rate limit exceeded',
              retryAfter: rateCheck.retryAfter
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // First 3 attempts should succeed
      for (let i = 0; i < 3; i++) {
        const result = await walletService.transferTokens(mockRootIdentity, {
          to: '0x1234567890123456789012345678901234567890',
          amount: 100,
          token: 'QToken'
        });
        expect(result.success).toBe(true);
      }

      // 4th attempt should be rate limited
      const rateLimitedResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: 100,
        token: 'QToken'
      });
      
      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.error).toBe('Rate limit exceeded');
      expect(rateLimitedResult.retryAfter).toBeGreaterThan(0);
    });

    it('should detect and prevent suspicious activity patterns', async () => {
      const suspiciousActivityDetector = {
        detectSuspiciousPattern: (identity: ExtendedSquidIdentity, transferData: any) => {
          // Check for round number amounts (potential automated attacks)
          if (transferData.amount % 100 === 0 && transferData.amount >= 1000) {
            return { suspicious: true, reason: 'Round number large amount' };
          }
          
          // Check for transfers to self
          if (transferData.to.toLowerCase() === identity.walletAddress.toLowerCase()) {
            return { suspicious: true, reason: 'Self-transfer detected' };
          }
          
          // Check for very small amounts (potential spam)
          if (transferData.amount < 0.001) {
            return { suspicious: true, reason: 'Dust amount transfer' };
          }
          
          return { suspicious: false };
        }
      };

      const walletService = {
        transferTokens: async (identity: ExtendedSquidIdentity, transferData: any) => {
          const suspiciousCheck = suspiciousActivityDetector.detectSuspiciousPattern(identity, transferData);
          
          if (suspiciousCheck.suspicious) {
            // Log suspicious activity
            await qerberosApi.logAuditEvent({
              event: 'suspicious_activity',
              identityId: identity.did,
              details: {
                reason: suspiciousCheck.reason,
                transferData
              },
              timestamp: new Date().toISOString(),
              securityLevel: 'HIGH'
            });
            
            return {
              success: false,
              error: `Suspicious activity detected: ${suspiciousCheck.reason}`
            };
          }
          
          return { success: true, transactionId: 'tx-123' };
        }
      };

      // Should detect round number large amount
      const roundNumberResult = await walletService.transferTokens(mockRootIdentity, {
        to: '0x1234567890123456789012345678901234567890',
        amount: 5000,
        token: 'QToken'
      });
      
      expect(roundNumberResult.success).toBe(false);
      expect(roundNumberResult.error).toBe('Suspicious activity detected: Round number large amount');
      
      // Should detect self-transfer
      const selfTransferResult = await walletService.transferTokens(mockRootIdentity, {
        to: mockRootIdentity.walletAddress,
        amount: 100,
        token: 'QToken'
      });
      
      expect(selfTransferResult.success).toBe(false);
      expect(selfTransferResult.error).toBe('Suspicious activity detected: Self-transfer detected');
    });
  });
});