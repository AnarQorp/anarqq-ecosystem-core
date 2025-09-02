/**
 * Token Validator Plugin
 * Example plugin that validates custom tokens and provides token metadata
 */

import { BaseQwalletPlugin } from '../BaseQwalletPlugin';
import { 
  QwalletPluginType, 
  TokenPlugin
} from '../../types/qwallet-plugin';
import { IdentityType } from '../../types/identity';

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  verified: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  website?: string;
  logoUrl?: string;
  tags: string[];
  lastUpdated: string;
}

export class TokenValidatorPlugin extends BaseQwalletPlugin implements TokenPlugin {
  private tokenCache: Map<string, TokenMetadata> = new Map();
  private blacklistedTokens: Set<string> = new Set();
  private trustedTokens: Set<string> = new Set();

  constructor() {
    super(
      'token-validator',
      'Token Validator',
      '1.0.0',
      QwalletPluginType.TOKEN,
      'Validates custom tokens and provides token metadata',
      'Qwallet Team',
      {
        capabilities: ['token_validation', 'token_metadata', 'risk_assessment'],
        requiredPermissions: ['token:read', 'token:validate'],
        supportedIdentityTypes: Object.values(IdentityType),
        metadata: {
          license: 'MIT',
          tags: ['token', 'validation', 'metadata']
        }
      }
    );
  }

  protected async onActivate(): Promise<void> {
    this.log('info', 'Token Validator Plugin activated');
    
    // Load cached token data
    await this.loadTokenCache();
    await this.loadTokenLists();
    
    // Initialize with some default trusted tokens
    this.initializeDefaultTokens();
  }

  protected async onDeactivate(): Promise<void> {
    this.log('info', 'Token Validator Plugin deactivated');
    
    // Save token cache and lists
    await this.saveTokenCache();
    await this.saveTokenLists();
  }

  protected async onConfigure(config: Record<string, any>): Promise<void> {
    if (config.trustedTokens && Array.isArray(config.trustedTokens)) {
      this.trustedTokens = new Set(config.trustedTokens);
      this.log('info', `Updated trusted tokens list: ${config.trustedTokens.length} tokens`);
    }

    if (config.blacklistedTokens && Array.isArray(config.blacklistedTokens)) {
      this.blacklistedTokens = new Set(config.blacklistedTokens);
      this.log('info', `Updated blacklisted tokens list: ${config.blacklistedTokens.length} tokens`);
    }
  }

  // Implement TokenPlugin interface
  async getSupportedTokens(): Promise<string[]> {
    return Array.from(this.trustedTokens);
  }

  async validateToken(tokenAddress: string): Promise<boolean> {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(tokenAddress.toLowerCase())) {
        this.log('warn', `Token ${tokenAddress} is blacklisted`);
        return false;
      }

      // Check if token is in trusted list
      if (this.trustedTokens.has(tokenAddress.toLowerCase())) {
        return true;
      }

      // Perform validation checks
      const metadata = await this.getTokenMetadata(tokenAddress);
      if (!metadata) {
        return false;
      }

      // Check risk level
      if (metadata.riskLevel === 'CRITICAL') {
        this.log('warn', `Token ${tokenAddress} has critical risk level`);
        return false;
      }

      // Additional validation logic
      const isValid = await this.performTokenValidation(metadata);
      
      this.log('debug', `Token validation for ${tokenAddress}: ${isValid}`);
      return isValid;

    } catch (error) {
      this.log('error', `Error validating token ${tokenAddress}`, error);
      return false;
    }
  }

  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      
      // Check cache first
      if (this.tokenCache.has(normalizedAddress)) {
        const cached = this.tokenCache.get(normalizedAddress)!;
        
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return cached;
        }
      }

      // Fetch metadata (in a real implementation, this would call external APIs)
      const metadata = await this.fetchTokenMetadata(tokenAddress);
      
      if (metadata) {
        // Cache the metadata
        this.tokenCache.set(normalizedAddress, metadata);
        
        // Save cache periodically
        if (this.tokenCache.size % 10 === 0) {
          await this.saveTokenCache();
        }
      }

      return metadata;

    } catch (error) {
      this.log('error', `Error fetching token metadata for ${tokenAddress}`, error);
      return null;
    }
  }

  // Public methods for token management
  async addTrustedToken(tokenAddress: string): Promise<boolean> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      
      // Validate token first
      const isValid = await this.validateToken(normalizedAddress);
      if (!isValid) {
        this.log('warn', `Cannot add invalid token ${tokenAddress} to trusted list`);
        return false;
      }

      this.trustedTokens.add(normalizedAddress);
      await this.saveTokenLists();
      
      this.log('info', `Added token ${tokenAddress} to trusted list`);
      return true;

    } catch (error) {
      this.log('error', `Error adding trusted token ${tokenAddress}`, error);
      return false;
    }
  }

  async removeTrustedToken(tokenAddress: string): Promise<boolean> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      const removed = this.trustedTokens.delete(normalizedAddress);
      
      if (removed) {
        await this.saveTokenLists();
        this.log('info', `Removed token ${tokenAddress} from trusted list`);
      }
      
      return removed;

    } catch (error) {
      this.log('error', `Error removing trusted token ${tokenAddress}`, error);
      return false;
    }
  }

  async blacklistToken(tokenAddress: string, reason?: string): Promise<boolean> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      
      this.blacklistedTokens.add(normalizedAddress);
      this.trustedTokens.delete(normalizedAddress); // Remove from trusted if present
      
      await this.saveTokenLists();
      
      this.log('warn', `Blacklisted token ${tokenAddress}${reason ? `: ${reason}` : ''}`);
      return true;

    } catch (error) {
      this.log('error', `Error blacklisting token ${tokenAddress}`, error);
      return false;
    }
  }

  async removeFromBlacklist(tokenAddress: string): Promise<boolean> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      const removed = this.blacklistedTokens.delete(normalizedAddress);
      
      if (removed) {
        await this.saveTokenLists();
        this.log('info', `Removed token ${tokenAddress} from blacklist`);
      }
      
      return removed;

    } catch (error) {
      this.log('error', `Error removing token from blacklist ${tokenAddress}`, error);
      return false;
    }
  }

  async getTokenRiskAssessment(tokenAddress: string): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
    recommendations: string[];
  }> {
    const metadata = await this.getTokenMetadata(tokenAddress);
    
    if (!metadata) {
      return {
        riskLevel: 'CRITICAL',
        factors: ['Token metadata not available'],
        recommendations: ['Do not interact with this token']
      };
    }

    const factors: string[] = [];
    const recommendations: string[] = [];

    // Assess various risk factors
    if (this.blacklistedTokens.has(tokenAddress.toLowerCase())) {
      factors.push('Token is blacklisted');
      recommendations.push('Avoid this token completely');
    }

    if (!metadata.verified) {
      factors.push('Token is not verified');
      recommendations.push('Exercise caution with unverified tokens');
    }

    if (!metadata.website && !metadata.description) {
      factors.push('Limited token information available');
      recommendations.push('Research token thoroughly before use');
    }

    // Determine overall risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    if (this.blacklistedTokens.has(tokenAddress.toLowerCase())) {
      riskLevel = 'CRITICAL';
    } else if (!metadata.verified && factors.length > 2) {
      riskLevel = 'HIGH';
    } else if (!metadata.verified || factors.length > 0) {
      riskLevel = 'MEDIUM';
    }

    return { riskLevel, factors, recommendations };
  }

  // Private helper methods
  private async loadTokenCache(): Promise<void> {
    try {
      const cached = await this.getStorageValue('token_cache');
      if (cached && typeof cached === 'object') {
        this.tokenCache = new Map(Object.entries(cached));
        this.log('info', `Loaded ${this.tokenCache.size} cached token entries`);
      }
    } catch (error) {
      this.log('error', 'Error loading token cache', error);
    }
  }

  private async saveTokenCache(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.tokenCache);
      await this.setStorageValue('token_cache', cacheObject);
    } catch (error) {
      this.log('error', 'Error saving token cache', error);
    }
  }

  private async loadTokenLists(): Promise<void> {
    try {
      const trusted = await this.getStorageValue('trusted_tokens');
      if (trusted && Array.isArray(trusted)) {
        this.trustedTokens = new Set(trusted);
      }

      const blacklisted = await this.getStorageValue('blacklisted_tokens');
      if (blacklisted && Array.isArray(blacklisted)) {
        this.blacklistedTokens = new Set(blacklisted);
      }

      this.log('info', `Loaded ${this.trustedTokens.size} trusted and ${this.blacklistedTokens.size} blacklisted tokens`);
    } catch (error) {
      this.log('error', 'Error loading token lists', error);
    }
  }

  private async saveTokenLists(): Promise<void> {
    try {
      await this.setStorageValue('trusted_tokens', Array.from(this.trustedTokens));
      await this.setStorageValue('blacklisted_tokens', Array.from(this.blacklistedTokens));
    } catch (error) {
      this.log('error', 'Error saving token lists', error);
    }
  }

  private initializeDefaultTokens(): void {
    // Add some default trusted tokens
    const defaultTrustedTokens = [
      '0xa0b86a33e6ba3b1c4e6b0b6b6b6b6b6b6b6b6b6b', // Example ETH
      '0xb0b86a33e6ba3b1c4e6b0b6b6b6b6b6b6b6b6b6b', // Example QToken
    ];

    defaultTrustedTokens.forEach(token => {
      this.trustedTokens.add(token.toLowerCase());
    });

    this.log('info', `Initialized with ${defaultTrustedTokens.length} default trusted tokens`);
  }

  private async fetchTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
    // Mock implementation - in a real plugin, this would call external APIs
    // like CoinGecko, CoinMarketCap, or blockchain explorers
    
    await this.delay(100); // Simulate API call delay

    // Generate mock metadata
    const mockMetadata: TokenMetadata = {
      address: tokenAddress,
      name: `Token ${tokenAddress.slice(-4)}`,
      symbol: `TK${tokenAddress.slice(-2).toUpperCase()}`,
      decimals: 18,
      totalSupply: '1000000000000000000000000',
      verified: this.trustedTokens.has(tokenAddress.toLowerCase()),
      riskLevel: this.trustedTokens.has(tokenAddress.toLowerCase()) ? 'LOW' : 'MEDIUM',
      description: `Mock token for address ${tokenAddress}`,
      tags: ['mock', 'example'],
      lastUpdated: new Date().toISOString()
    };

    return mockMetadata;
  }

  private async performTokenValidation(metadata: TokenMetadata): Promise<boolean> {
    // Mock validation logic
    // In a real implementation, this would check:
    // - Contract code verification
    // - Liquidity levels
    // - Trading volume
    // - Community trust scores
    // - Security audit results

    // Simple validation based on metadata
    if (!metadata.name || !metadata.symbol) {
      return false;
    }

    if (metadata.decimals < 0 || metadata.decimals > 18) {
      return false;
    }

    return true;
  }
}