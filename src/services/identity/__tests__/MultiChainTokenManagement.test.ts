/**
 * Multi-Chain Token Management Test Suite
 * Tests the complete token management system including discovery, validation,
 * governance, and metadata management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MultiChainTokenService, 
  TokenInfo, 
  TokenRegistrationRequest,
  TokenValidationResult 
} from '../MultiChainTokenService';
import { 
  TokenDiscoveryService, 
  DiscoveredToken, 
  TokenDiscoveryResult 
} from '../TokenDiscoveryService';
import { 
  TokenGovernanceService, 
  TokenGovernanceProposal, 
  GovernanceVote 
} from '../TokenGovernanceService';
import { 
  TokenMetadataService, 
  TokenMetadata, 
  IconUploadResult 
} from '../TokenMetadataService';
import { IdentityType } from '../../../types/identity';
import { CustomTokenConfig } from '../../../types/wallet-config';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Multi-Chain Token Management System', () => {
  let tokenService: MultiChainTokenService;
  let discoveryService: TokenDiscoveryService;
  let governanceService: TokenGovernanceService;
  let metadataService: TokenMetadataService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    tokenService = new MultiChainTokenService();
    discoveryService = new TokenDiscoveryService();
    governanceService = new TokenGovernanceService();
    metadataService = new TokenMetadataService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MultiChainTokenService', () => {
    describe('Token Discovery', () => {
      it('should discover tokens from all sources', async () => {
        const result = await tokenService.discoverTokens();
        
        expect(result).toBeDefined();
        expect(result.tokens).toBeInstanceOf(Array);
        expect(result.totalFound).toBeGreaterThanOrEqual(0);
        expect(result.chains).toBeInstanceOf(Array);
        expect(result.discoverySource).toBe('REGISTRY');
      });

      it('should discover tokens for specific chain', async () => {
        const result = await tokenService.discoverTokens('ETH', 10);
        
        expect(result.tokens.every(token => token.chain === 'ETH')).toBe(true);
        expect(result.tokens.length).toBeLessThanOrEqual(10);
      });

      it('should search tokens by query', async () => {
        const results = await tokenService.searchTokens('ethereum');
        
        expect(results).toBeInstanceOf(Array);
        // Should find tokens matching the search term
        if (results.length > 0) {
          expect(
            results.some(token => 
              token.name.toLowerCase().includes('ethereum') ||
              token.symbol.toLowerCase().includes('ethereum')
            )
          ).toBe(true);
        }
      });

      it('should get tokens by chain', async () => {
        const ethTokens = await tokenService.getTokensByChain('ETH');
        
        expect(ethTokens).toBeInstanceOf(Array);
        ethTokens.forEach(token => {
          expect(token.chain).toBe('ETH');
        });
      });

      it('should return supported chains', async () => {
        const chains = await tokenService.getSupportedChains();
        
        expect(chains).toBeInstanceOf(Array);
        expect(chains).toContain('PI');
        expect(chains).toContain('ANARQ');
        expect(chains).toContain('ETH');
        expect(chains).toContain('BTC');
        expect(chains).toContain('FILECOIN');
      });
    });

    describe('Token Validation', () => {
      it('should validate token address and chain', async () => {
        const result = await tokenService.validateToken(
          '0x1234567890123456789012345678901234567890',
          'ETH'
        );
        
        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.riskAssessment).toBeDefined();
        expect(result.riskAssessment.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      });

      it('should reject invalid token addresses', async () => {
        const result = await tokenService.validateToken('invalid', 'ETH');
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Invalid token address format');
      });

      it('should reject unsupported chains', async () => {
        const result = await tokenService.validateToken(
          '0x1234567890123456789012345678901234567890',
          'UNSUPPORTED_CHAIN'
        );
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('Unsupported chain'))).toBe(true);
      });

      it('should validate custom token config', async () => {
        const tokenConfig: CustomTokenConfig = {
          tokenId: 'test-token',
          name: 'Test Token',
          symbol: 'TEST',
          chain: 'ETH',
          contractAddress: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          addedBy: 'test-user',
          addedAt: new Date().toISOString(),
          verified: false
        };

        const result = await tokenService.validateCustomToken(tokenConfig);
        
        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();
      });

      it('should perform security checks', async () => {
        const result = await tokenService.performSecurityCheck(
          '0x1234567890123456789012345678901234567890',
          'ETH'
        );
        
        expect(result).toBeDefined();
        expect(result.passed).toBeDefined();
        expect(result.checks).toBeDefined();
        expect(result.checks.contractVerification).toBeDefined();
        expect(result.checks.auditStatus).toBeDefined();
        expect(result.checks.liquidityCheck).toBeDefined();
        expect(result.checks.holderDistribution).toBeDefined();
        expect(result.checks.transactionPattern).toBeDefined();
        expect(result.riskFactors).toBeInstanceOf(Array);
        expect(result.recommendations).toBeInstanceOf(Array);
      });
    });

    describe('Token Registration', () => {
      it('should create token registration request', async () => {
        const requestId = await tokenService.requestTokenRegistration({
          tokenInfo: {
            tokenId: 'new-token',
            name: 'New Token',
            symbol: 'NEW',
            chain: 'ETH',
            decimals: 18,
            contractAddress: '0x1234567890123456789012345678901234567890'
          },
          requestedBy: 'test-user',
          identityId: 'test-identity',
          justification: 'Testing token registration',
          requiresGovernanceApproval: true,
          requiredApprovals: 2,
          currentApprovals: 0
        });
        
        expect(requestId).toBeDefined();
        expect(typeof requestId).toBe('string');
        expect(requestId.startsWith('token_')).toBe(true);
      });

      it('should retrieve registration request', async () => {
        const requestId = await tokenService.requestTokenRegistration({
          tokenInfo: {
            tokenId: 'retrieve-test-token',
            name: 'Retrieve Test Token',
            symbol: 'RTT',
            chain: 'ETH',
            decimals: 18
          },
          requestedBy: 'test-user',
          identityId: 'test-identity',
          justification: 'Testing request retrieval',
          requiresGovernanceApproval: false,
          requiredApprovals: 1,
          currentApprovals: 0
        });

        const request = await tokenService.getRegistrationRequest(requestId);
        
        expect(request).toBeDefined();
        expect(request!.requestId).toBe(requestId);
        expect(request!.tokenInfo.tokenId).toBe('retrieve-test-token');
        expect(request!.status).toBe('PENDING');
      });

      it('should approve token registration', async () => {
        const requestId = await tokenService.requestTokenRegistration({
          tokenInfo: {
            tokenId: 'approve-test-token',
            name: 'Approve Test Token',
            symbol: 'ATT',
            chain: 'ETH',
            decimals: 18
          },
          requestedBy: 'test-user',
          identityId: 'test-identity',
          justification: 'Testing approval',
          requiresGovernanceApproval: false,
          requiredApprovals: 1,
          currentApprovals: 0
        });

        const success = await tokenService.approveTokenRegistration(
          requestId,
          'approver-user',
          'Approved for testing'
        );
        
        expect(success).toBe(true);

        const request = await tokenService.getRegistrationRequest(requestId);
        expect(request!.status).toBe('APPROVED');
        expect(request!.reviewedBy).toBe('approver-user');
        expect(request!.reviewComments).toBe('Approved for testing');
      });

      it('should reject token registration', async () => {
        const requestId = await tokenService.requestTokenRegistration({
          tokenInfo: {
            tokenId: 'reject-test-token',
            name: 'Reject Test Token',
            symbol: 'RTT',
            chain: 'ETH',
            decimals: 18
          },
          requestedBy: 'test-user',
          identityId: 'test-identity',
          justification: 'Testing rejection',
          requiresGovernanceApproval: false,
          requiredApprovals: 1,
          currentApprovals: 0
        });

        const success = await tokenService.rejectTokenRegistration(
          requestId,
          'approver-user',
          'Rejected for testing'
        );
        
        expect(success).toBe(true);

        const request = await tokenService.getRegistrationRequest(requestId);
        expect(request!.status).toBe('REJECTED');
        expect(request!.reviewedBy).toBe('approver-user');
        expect(request!.reviewComments).toBe('Rejected for testing');
      });
    });

    describe('Token Management', () => {
      it('should add custom token', async () => {
        const tokenConfig: CustomTokenConfig = {
          tokenId: 'custom-token-1',
          name: 'Custom Token 1',
          symbol: 'CT1',
          chain: 'ETH',
          contractAddress: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          addedBy: 'test-user',
          addedAt: new Date().toISOString(),
          verified: false
        };

        const success = await tokenService.addCustomToken('test-identity', tokenConfig);
        
        expect(success).toBe(true);
      });

      it('should remove custom token', async () => {
        // First add a token
        const tokenConfig: CustomTokenConfig = {
          tokenId: 'remove-token-test',
          name: 'Remove Token Test',
          symbol: 'RTT',
          chain: 'ETH',
          contractAddress: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          addedBy: 'test-user',
          addedAt: new Date().toISOString(),
          verified: false
        };

        await tokenService.addCustomToken('test-identity', tokenConfig);

        // Then remove it
        const success = await tokenService.removeCustomToken('test-identity', 'remove-token-test');
        
        expect(success).toBe(true);
      });

      it('should get token info', async () => {
        // Add a token first
        const tokenConfig: CustomTokenConfig = {
          tokenId: 'get-info-test',
          name: 'Get Info Test',
          symbol: 'GIT',
          chain: 'ETH',
          contractAddress: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          addedBy: 'test-user',
          addedAt: new Date().toISOString(),
          verified: false
        };

        await tokenService.addCustomToken('test-identity', tokenConfig);

        const tokenInfo = await tokenService.getTokenInfo('get-info-test');
        
        expect(tokenInfo).toBeDefined();
        expect(tokenInfo!.tokenId).toBe('get-info-test');
        expect(tokenInfo!.name).toBe('Get Info Test');
        expect(tokenInfo!.symbol).toBe('GIT');
      });

      it('should get supported tokens for identity', async () => {
        const tokens = await tokenService.getSupportedTokens('test-identity');
        
        expect(tokens).toBeInstanceOf(Array);
        // Should include default tokens
        expect(tokens.some(token => token.tokenId === 'pi')).toBe(true);
        expect(tokens.some(token => token.tokenId === 'anarq')).toBe(true);
        expect(tokens.some(token => token.tokenId === 'eth')).toBe(true);
      });
    });

    describe('Cross-Chain Support', () => {
      it('should get cross-chain mappings', async () => {
        const mappings = await tokenService.getCrossChainMappings('eth');
        
        expect(mappings).toBeInstanceOf(Array);
      });

      it('should add cross-chain mapping', async () => {
        const mapping = {
          chain: 'POLYGON',
          chainId: 137,
          contractAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          bridgeContract: '0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf',
          bridgeSupported: true,
          conversionRate: 1
        };

        const success = await tokenService.addCrossChainMapping('eth', mapping);
        
        expect(success).toBe(true);
      });

      it('should validate cross-chain transfer', async () => {
        // Add mappings first
        const ethMapping = {
          chain: 'ETH',
          chainId: 1,
          contractAddress: '0x0000000000000000000000000000000000000000',
          bridgeSupported: true
        };

        const polygonMapping = {
          chain: 'POLYGON',
          chainId: 137,
          contractAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          bridgeSupported: true
        };

        await tokenService.addCrossChainMapping('eth', ethMapping);
        await tokenService.addCrossChainMapping('eth', polygonMapping);

        const isValid = await tokenService.validateCrossChainTransfer('ETH', 'POLYGON', 'eth');
        
        expect(isValid).toBe(true);
      });
    });

    describe('Analytics and Reporting', () => {
      it('should get token statistics', async () => {
        const stats = await tokenService.getTokenStatistics('eth');
        
        expect(stats).toBeDefined();
        expect(stats.tokenId).toBe('eth');
        expect(typeof stats.totalHolders).toBe('number');
        expect(typeof stats.totalTransactions).toBe('number');
        expect(typeof stats.totalVolume).toBe('number');
        expect(typeof stats.popularityScore).toBe('number');
        expect(typeof stats.riskScore).toBe('number');
      });

      it('should get popular tokens', async () => {
        const popularTokens = await tokenService.getPopularTokens('ETH', 5);
        
        expect(popularTokens).toBeInstanceOf(Array);
        expect(popularTokens.length).toBeLessThanOrEqual(5);
        popularTokens.forEach(token => {
          if (token.chain) {
            expect(token.chain).toBe('ETH');
          }
        });
      });

      it('should get token trends', async () => {
        const trends = await tokenService.getTokenTrends('DAY');
        
        expect(trends).toBeInstanceOf(Array);
        trends.forEach(trend => {
          expect(trend.tokenId).toBeDefined();
          expect(trend.name).toBeDefined();
          expect(trend.symbol).toBeDefined();
          expect(trend.chain).toBeDefined();
          expect(typeof trend.trendScore).toBe('number');
          expect(trend.period).toBe('DAY');
        });
      });
    });
  });

  describe('TokenDiscoveryService', () => {
    it('should start and stop discovery', async () => {
      expect(discoveryService.isDiscoveryRunning()).toBe(false);
      
      await discoveryService.startDiscovery();
      expect(discoveryService.isDiscoveryRunning()).toBe(true);
      
      await discoveryService.stopDiscovery();
      expect(discoveryService.isDiscoveryRunning()).toBe(false);
    });

    it('should discover tokens from specific source', async () => {
      const tokens = await discoveryService.discoverTokensFromSource('CoinGecko', 'ETH');
      
      expect(tokens).toBeInstanceOf(Array);
      tokens.forEach(token => {
        expect(token.source).toBe('CoinGecko');
        expect(token.tokenInfo.chain).toBe('ETH');
        expect(token.confidence).toBeGreaterThan(0);
        expect(token.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should search discovered tokens', async () => {
      const results = await discoveryService.searchDiscoveredTokens('token');
      
      expect(results).toBeInstanceOf(Array);
    });

    it('should get discovery cache stats', async () => {
      const stats = await discoveryService.getDiscoveryCacheStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalTokens).toBe('number');
      expect(stats.tokensByChain).toBeDefined();
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should get discovery statistics', async () => {
      const stats = await discoveryService.getDiscoveryStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalDiscovered).toBe('number');
      expect(typeof stats.discoveredToday).toBe('number');
      expect(typeof stats.discoveredThisWeek).toBe('number');
      expect(stats.sourceBreakdown).toBeDefined();
      expect(stats.chainBreakdown).toBeDefined();
      expect(stats.riskLevelBreakdown).toBeDefined();
      expect(typeof stats.averageConfidence).toBe('number');
    });
  });

  describe('TokenGovernanceService', () => {
    it('should create governance proposal', async () => {
      const proposalId = await governanceService.createProposal({
        type: 'TOKEN_ADDITION',
        title: 'Add New Test Token',
        description: 'Proposal to add a new test token to the registry',
        proposedBy: 'test-user',
        proposerIdentityType: IdentityType.DAO,
        tokenData: {
          tokenInfo: {
            tokenId: 'governance-test-token',
            name: 'Governance Test Token',
            symbol: 'GTT',
            chain: 'ETH',
            decimals: 18,
            verified: false,
            riskLevel: 'MEDIUM',
            governanceApproved: false,
            addedBy: 'test-user',
            addedAt: new Date().toISOString(),
            allowedIdentityTypes: [IdentityType.ROOT, IdentityType.DAO]
          },
          justification: 'This token is needed for testing governance'
        }
      });
      
      expect(proposalId).toBeDefined();
      expect(typeof proposalId).toBe('string');
      expect(proposalId.startsWith('gov_')).toBe(true);
    });

    it('should cast vote on proposal', async () => {
      // Create a proposal first
      const proposalId = await governanceService.createProposal({
        type: 'TOKEN_ADDITION',
        title: 'Vote Test Token',
        description: 'Proposal for vote testing',
        proposedBy: 'test-user',
        proposerIdentityType: IdentityType.DAO,
        tokenData: {
          tokenInfo: {
            tokenId: 'vote-test-token',
            name: 'Vote Test Token',
            symbol: 'VTT',
            chain: 'ETH',
            decimals: 18,
            verified: false,
            riskLevel: 'LOW',
            governanceApproved: false,
            addedBy: 'test-user',
            addedAt: new Date().toISOString(),
            allowedIdentityTypes: [IdentityType.ROOT]
          },
          justification: 'Testing vote functionality'
        }
      });

      // Assign governance role to voter
      await governanceService.assignGovernanceRole('voter-user', 'token_reviewer');

      // Cast vote
      const success = await governanceService.castVote(
        proposalId,
        'voter-user',
        'APPROVE',
        'This token looks good for testing'
      );
      
      expect(success).toBe(true);
    });

    it('should get governance statistics', async () => {
      const stats = await governanceService.getGovernanceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalProposals).toBe('number');
      expect(typeof stats.activeProposals).toBe('number');
      expect(typeof stats.passedProposals).toBe('number');
      expect(typeof stats.rejectedProposals).toBe('number');
      expect(typeof stats.averageParticipation).toBe('number');
      expect(stats.topVoters).toBeInstanceOf(Array);
    });

    it('should manage governance roles', async () => {
      const success = await governanceService.assignGovernanceRole('test-user', 'dao_representative');
      expect(success).toBe(true);

      const roles = await governanceService.getGovernanceRoles('test-user');
      expect(roles).toBeInstanceOf(Array);
      expect(roles.some(role => role.roleId === 'dao_representative')).toBe(true);

      const removeSuccess = await governanceService.removeGovernanceRole('test-user', 'dao_representative');
      expect(removeSuccess).toBe(true);
    });

    it('should check auto-approval conditions', async () => {
      const tokenInfo: TokenInfo = {
        tokenId: 'auto-approve-test',
        name: 'Auto Approve Test',
        symbol: 'AAT',
        chain: 'ETH',
        decimals: 18,
        verified: true,
        riskLevel: 'LOW',
        governanceApproved: false,
        addedBy: 'test-user',
        addedAt: new Date().toISOString(),
        allowedIdentityTypes: [IdentityType.ROOT]
      };

      const autoApproved = await governanceService.checkAutoApproval(tokenInfo, 'test-user');
      
      expect(typeof autoApproved).toBe('boolean');
    });
  });

  describe('TokenMetadataService', () => {
    it('should create token metadata', async () => {
      const success = await metadataService.createTokenMetadata(
        'metadata-test-token',
        {
          basicInfo: {
            name: 'Metadata Test Token',
            symbol: 'MTT',
            description: 'A token for testing metadata functionality'
          },
          technical: {
            chain: 'ETH',
            decimals: 18,
            contractAddress: '0x1234567890123456789012345678901234567890'
          },
          governance: {
            verified: false,
            riskLevel: 'MEDIUM'
          }
        },
        'test-user'
      );
      
      expect(success).toBe(true);
    });

    it('should get and update token metadata', async () => {
      // Create metadata first
      await metadataService.createTokenMetadata(
        'update-test-token',
        {
          basicInfo: {
            name: 'Update Test Token',
            symbol: 'UTT'
          },
          technical: {
            chain: 'ETH',
            decimals: 18
          }
        },
        'test-user'
      );

      // Get metadata
      const metadata = await metadataService.getTokenMetadata('update-test-token');
      expect(metadata).toBeDefined();
      expect(metadata!.basicInfo.name).toBe('Update Test Token');

      // Update metadata
      const updateSuccess = await metadataService.updateTokenMetadata(
        'update-test-token',
        {
          basicInfo: {
            ...metadata!.basicInfo,
            description: 'Updated description'
          }
        },
        'test-user'
      );
      
      expect(updateSuccess).toBe(true);

      // Verify update
      const updatedMetadata = await metadataService.getTokenMetadata('update-test-token');
      expect(updatedMetadata!.basicInfo.description).toBe('Updated description');
    });

    it('should search token metadata', async () => {
      const results = await metadataService.searchTokenMetadata('test');
      
      expect(results).toBeInstanceOf(Array);
    });

    it('should validate icon upload', async () => {
      // Create a mock file
      const mockFile = new File(['mock image data'], 'test-icon.png', {
        type: 'image/png'
      });

      const validation = await metadataService.validateIcon(mockFile);
      
      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.warnings).toBeInstanceOf(Array);
      expect(validation.recommendations).toBeInstanceOf(Array);
      expect(validation.metadata).toBeDefined();
      expect(validation.metadata.fileSize).toBe(mockFile.size);
      expect(validation.metadata.format).toBe(mockFile.type);
    });

    it('should get storage statistics', async () => {
      const stats = await metadataService.getStorageStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalTokens).toBe('number');
      expect(typeof stats.totalAssets).toBe('number');
      expect(typeof stats.totalStorageUsed).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
    });

    it('should verify and unverify token metadata', async () => {
      // Create metadata first
      await metadataService.createTokenMetadata(
        'verify-test-token',
        {
          basicInfo: {
            name: 'Verify Test Token',
            symbol: 'VTT'
          },
          technical: {
            chain: 'ETH',
            decimals: 18
          }
        },
        'test-user'
      );

      // Verify metadata
      const verifySuccess = await metadataService.verifyTokenMetadata('verify-test-token', 'verifier-user');
      expect(verifySuccess).toBe(true);

      // Check verification
      const metadata = await metadataService.getTokenMetadata('verify-test-token');
      expect(metadata!.governance.verified).toBe(true);
      expect(metadata!.governance.verifiedBy).toBe('verifier-user');

      // Unverify metadata
      const unverifySuccess = await metadataService.unverifyTokenMetadata(
        'verify-test-token',
        'unverifier-user',
        'Testing unverification'
      );
      expect(unverifySuccess).toBe(true);

      // Check unverification
      const unverifiedMetadata = await metadataService.getTokenMetadata('verify-test-token');
      expect(unverifiedMetadata!.governance.verified).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate token discovery with governance', async () => {
      // Discover tokens
      const discoveredTokens = await discoveryService.discoverTokensFromSource('CoinGecko', 'ETH');
      
      if (discoveredTokens.length > 0) {
        const token = discoveredTokens[0];
        
        // Create governance proposal for discovered token
        const proposalId = await governanceService.createProposal({
          type: 'TOKEN_ADDITION',
          title: `Add ${token.tokenInfo.name}`,
          description: `Proposal to add discovered token ${token.tokenInfo.name}`,
          proposedBy: 'discovery-system',
          proposerIdentityType: IdentityType.ROOT,
          tokenData: {
            tokenInfo: token.tokenInfo,
            justification: `Token discovered from ${token.source} with confidence ${token.confidence}`
          }
        });
        
        expect(proposalId).toBeDefined();
        
        const proposal = await governanceService.getProposal(proposalId);
        expect(proposal).toBeDefined();
        expect(proposal!.tokenData!.tokenInfo.tokenId).toBe(token.tokenInfo.tokenId);
      }
    });

    it('should integrate token registration with metadata', async () => {
      // Register a token
      const requestId = await tokenService.requestTokenRegistration({
        tokenInfo: {
          tokenId: 'integration-test-token',
          name: 'Integration Test Token',
          symbol: 'ITT',
          chain: 'ETH',
          decimals: 18,
          contractAddress: '0x1234567890123456789012345678901234567890'
        },
        requestedBy: 'test-user',
        identityId: 'test-identity',
        justification: 'Testing integration',
        requiresGovernanceApproval: false,
        requiredApprovals: 1,
        currentApprovals: 0
      });

      // Approve the registration
      await tokenService.approveTokenRegistration(requestId, 'approver-user');

      // Create metadata for the token
      const metadataSuccess = await metadataService.createTokenMetadata(
        'integration-test-token',
        {
          basicInfo: {
            name: 'Integration Test Token',
            symbol: 'ITT',
            description: 'Token created through integration test'
          },
          technical: {
            chain: 'ETH',
            decimals: 18,
            contractAddress: '0x1234567890123456789012345678901234567890'
          }
        },
        'test-user'
      );
      
      expect(metadataSuccess).toBe(true);

      // Verify the token exists in both systems
      const tokenInfo = await tokenService.getTokenInfo('integration-test-token');
      const metadata = await metadataService.getTokenMetadata('integration-test-token');
      
      expect(tokenInfo).toBeDefined();
      expect(metadata).toBeDefined();
      expect(tokenInfo!.name).toBe(metadata!.basicInfo.name);
      expect(tokenInfo!.symbol).toBe(metadata!.basicInfo.symbol);
    });

    it('should handle complete token lifecycle', async () => {
      const tokenId = 'lifecycle-test-token';
      
      // 1. Discover token (simulated)
      const discoveredToken: DiscoveredToken = {
        tokenInfo: {
          tokenId,
          name: 'Lifecycle Test Token',
          symbol: 'LTT',
          chain: 'ETH',
          decimals: 18,
          contractAddress: '0x1234567890123456789012345678901234567890',
          verified: false,
          riskLevel: 'MEDIUM',
          governanceApproved: false,
          addedBy: 'discovery-system',
          addedAt: new Date().toISOString(),
          allowedIdentityTypes: [IdentityType.ROOT]
        },
        source: 'test-discovery',
        discoveredAt: new Date().toISOString(),
        confidence: 0.8,
        metadata: {
          holderCount: 1000,
          liquidityUSD: 50000
        }
      };

      // 2. Validate token
      const validation = await tokenService.validateToken(
        discoveredToken.tokenInfo.contractAddress!,
        discoveredToken.tokenInfo.chain
      );
      expect(validation.valid).toBe(true);

      // 3. Create governance proposal
      const proposalId = await governanceService.createProposal({
        type: 'TOKEN_ADDITION',
        title: `Add ${discoveredToken.tokenInfo.name}`,
        description: 'Complete lifecycle test',
        proposedBy: 'test-user',
        proposerIdentityType: IdentityType.DAO,
        tokenData: {
          tokenInfo: discoveredToken.tokenInfo,
          justification: 'Lifecycle testing'
        }
      });

      // 4. Vote on proposal
      await governanceService.assignGovernanceRole('voter-1', 'token_reviewer');
      await governanceService.castVote(proposalId, 'voter-1', 'APPROVE');

      // 5. Execute proposal (if passed)
      const proposal = await governanceService.getProposal(proposalId);
      if (proposal && proposal.status === 'PASSED') {
        await governanceService.executeProposal(proposalId, 'executor-user');
      }

      // 6. Create metadata
      await metadataService.createTokenMetadata(
        tokenId,
        {
          basicInfo: {
            name: discoveredToken.tokenInfo.name,
            symbol: discoveredToken.tokenInfo.symbol,
            description: 'Token added through complete lifecycle'
          },
          technical: {
            chain: discoveredToken.tokenInfo.chain,
            decimals: discoveredToken.tokenInfo.decimals,
            contractAddress: discoveredToken.tokenInfo.contractAddress
          },
          governance: {
            verified: false,
            riskLevel: discoveredToken.tokenInfo.riskLevel
          }
        },
        'test-user'
      );

      // 7. Verify final state
      const finalTokenInfo = await tokenService.getTokenInfo(tokenId);
      const finalMetadata = await metadataService.getTokenMetadata(tokenId);
      
      expect(finalTokenInfo).toBeDefined();
      expect(finalMetadata).toBeDefined();
      expect(finalTokenInfo!.name).toBe(discoveredToken.tokenInfo.name);
      expect(finalMetadata!.basicInfo.name).toBe(discoveredToken.tokenInfo.name);
    });
  });
});