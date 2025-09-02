/**
 * Token Discovery Service
 * Handles automatic token discovery from multiple sources including
 * blockchain explorers, token lists, and community registries
 */

import { TokenInfo, TokenDiscoveryResult, TokenValidationResult } from './MultiChainTokenService';
import { IdentityType } from '../../types/identity';

// Token Discovery Sources
export interface TokenDiscoverySource {
  name: string;
  type: 'BLOCKCHAIN' | 'API' | 'REGISTRY' | 'COMMUNITY';
  endpoint: string;
  chainSupported: string[];
  rateLimit: number; // requests per minute
  apiKey?: string;
  enabled: boolean;
  priority: number; // 1-10, higher is better
}

export interface DiscoveryFilter {
  chains?: string[];
  minLiquidity?: number;
  minHolders?: number;
  verified?: boolean;
  riskLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  excludeTokens?: string[];
  includeTokens?: string[];
}

export interface TokenDiscoveryConfig {
  sources: TokenDiscoverySource[];
  filters: DiscoveryFilter;
  cacheTimeout: number; // minutes
  maxTokensPerSource: number;
  enableAutoDiscovery: boolean;
  discoveryInterval: number; // minutes
}

export interface DiscoveredToken {
  tokenInfo: TokenInfo;
  source: string;
  discoveredAt: string;
  confidence: number; // 0-1
  metadata: {
    holderCount?: number;
    transactionCount?: number;
    liquidityUSD?: number;
    marketCapUSD?: number;
    priceUSD?: number;
    volume24h?: number;
    priceChange24h?: number;
  };
}

export interface TokenDiscoveryServiceInterface {
  // Discovery Management
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  isDiscoveryRunning(): boolean;
  
  // Manual Discovery
  discoverTokensFromSource(sourceName: string, chain?: string): Promise<DiscoveredToken[]>;
  discoverTokensFromAllSources(chain?: string): Promise<DiscoveredToken[]>;
  discoverTokensByAddress(addresses: string[], chain: string): Promise<DiscoveredToken[]>;
  
  // Search and Filter
  searchDiscoveredTokens(query: string, filters?: DiscoveryFilter): Promise<DiscoveredToken[]>;
  getDiscoveredTokensByChain(chain: string): Promise<DiscoveredToken[]>;
  getPopularDiscoveredTokens(limit?: number): Promise<DiscoveredToken[]>;
  getTrendingTokens(period: 'HOUR' | 'DAY' | 'WEEK'): Promise<DiscoveredToken[]>;
  
  // Configuration
  updateDiscoveryConfig(config: Partial<TokenDiscoveryConfig>): Promise<boolean>;
  getDiscoveryConfig(): TokenDiscoveryConfig;
  addDiscoverySource(source: TokenDiscoverySource): Promise<boolean>;
  removeDiscoverySource(sourceName: string): Promise<boolean>;
  
  // Cache Management
  clearDiscoveryCache(): Promise<void>;
  refreshDiscoveryCache(chain?: string): Promise<void>;
  getDiscoveryCacheStats(): Promise<DiscoveryCacheStats>;
  
  // Analytics
  getDiscoveryStats(): Promise<DiscoveryStats>;
  getSourcePerformance(): Promise<SourcePerformanceStats[]>;
}

export interface DiscoveryCacheStats {
  totalTokens: number;
  tokensByChain: Record<string, number>;
  lastUpdated: string;
  cacheSize: number; // bytes
  hitRate: number; // percentage
}

export interface DiscoveryStats {
  totalDiscovered: number;
  discoveredToday: number;
  discoveredThisWeek: number;
  sourceBreakdown: Record<string, number>;
  chainBreakdown: Record<string, number>;
  riskLevelBreakdown: Record<string, number>;
  averageConfidence: number;
}

export interface SourcePerformanceStats {
  sourceName: string;
  tokensDiscovered: number;
  successRate: number;
  averageResponseTime: number;
  lastSuccessfulDiscovery: string;
  errorCount: number;
  enabled: boolean;
}

export class TokenDiscoveryService implements TokenDiscoveryServiceInterface {
  private config: TokenDiscoveryConfig;
  private discoveryCache: Map<string, DiscoveredToken[]> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private sourceStats: Map<string, SourcePerformanceStats> = new Map();
  
  // Default discovery sources
  private defaultSources: TokenDiscoverySource[] = [
    {
      name: 'CoinGecko',
      type: 'API',
      endpoint: 'https://api.coingecko.com/api/v3',
      chainSupported: ['ETH', 'BTC'],
      rateLimit: 50,
      enabled: true,
      priority: 9
    },
    {
      name: 'Etherscan',
      type: 'BLOCKCHAIN',
      endpoint: 'https://api.etherscan.io/api',
      chainSupported: ['ETH'],
      rateLimit: 5,
      enabled: true,
      priority: 8
    },
    {
      name: 'Pi Network API',
      type: 'API',
      endpoint: 'https://api.minepi.com',
      chainSupported: ['PI'],
      rateLimit: 10,
      enabled: true,
      priority: 10
    },
    {
      name: 'AnarQ Registry',
      type: 'REGISTRY',
      endpoint: 'https://registry.anarq.network',
      chainSupported: ['ANARQ'],
      rateLimit: 20,
      enabled: true,
      priority: 10
    },
    {
      name: 'Filecoin Explorer',
      type: 'BLOCKCHAIN',
      endpoint: 'https://filfox.info/api/v1',
      chainSupported: ['FILECOIN'],
      rateLimit: 10,
      enabled: true,
      priority: 7
    }
  ];

  constructor(config?: Partial<TokenDiscoveryConfig>) {
    this.config = {
      sources: this.defaultSources,
      filters: {
        verified: false, // Include unverified tokens for discovery
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'], // Exclude CRITICAL
        minHolders: 10,
        minLiquidity: 1000
      },
      cacheTimeout: 60, // 1 hour
      maxTokensPerSource: 100,
      enableAutoDiscovery: true,
      discoveryInterval: 30, // 30 minutes
      ...config
    };
    
    this.initializeSourceStats();
    this.loadDiscoveryCache();
  }

  // Discovery Management
  async startDiscovery(): Promise<void> {
    if (this.isRunning) {
      console.warn('[TokenDiscoveryService] Discovery is already running');
      return;
    }
    
    this.isRunning = true;
    console.log('[TokenDiscoveryService] Starting automatic token discovery');
    
    // Initial discovery (non-blocking for tests)
    if (this.config.enableAutoDiscovery) {
      // Run discovery in background to avoid test timeout
      setTimeout(async () => {
        await this.performDiscovery();
      }, 100);
      
      // Set up periodic discovery
      this.discoveryInterval = setInterval(async () => {
        await this.performDiscovery();
      }, this.config.discoveryInterval * 60 * 1000);
    }
  }

  async stopDiscovery(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    console.log('[TokenDiscoveryService] Stopped automatic token discovery');
  }

  isDiscoveryRunning(): boolean {
    return this.isRunning;
  }

  // Manual Discovery
  async discoverTokensFromSource(sourceName: string, chain?: string): Promise<DiscoveredToken[]> {
    const source = this.config.sources.find(s => s.name === sourceName);
    if (!source || !source.enabled) {
      console.warn(`[TokenDiscoveryService] Source not found or disabled: ${sourceName}`);
      return [];
    }
    
    if (chain && !source.chainSupported.includes(chain)) {
      console.warn(`[TokenDiscoveryService] Chain ${chain} not supported by source ${sourceName}`);
      return [];
    }
    
    try {
      const startTime = Date.now();
      const tokens = await this.discoverFromSource(source, chain);
      const responseTime = Date.now() - startTime;
      
      // Update source stats
      this.updateSourceStats(sourceName, tokens.length, true, responseTime);
      
      return tokens;
    } catch (error) {
      console.error(`[TokenDiscoveryService] Error discovering from source ${sourceName}:`, error);
      this.updateSourceStats(sourceName, 0, false, 0);
      return [];
    }
  }

  async discoverTokensFromAllSources(chain?: string): Promise<DiscoveredToken[]> {
    const allTokens: DiscoveredToken[] = [];
    const enabledSources = this.config.sources
      .filter(source => source.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    for (const source of enabledSources) {
      if (chain && !source.chainSupported.includes(chain)) {
        continue;
      }
      
      try {
        const tokens = await this.discoverTokensFromSource(source.name, chain);
        allTokens.push(...tokens);
        
        // Respect rate limits
        await this.delay(60000 / source.rateLimit);
      } catch (error) {
        console.error(`[TokenDiscoveryService] Error with source ${source.name}:`, error);
      }
    }
    
    // Remove duplicates and sort by confidence
    const uniqueTokens = this.deduplicateTokens(allTokens);
    return uniqueTokens.sort((a, b) => b.confidence - a.confidence);
  }

  async discoverTokensByAddress(addresses: string[], chain: string): Promise<DiscoveredToken[]> {
    const tokens: DiscoveredToken[] = [];
    
    for (const address of addresses) {
      try {
        const tokenInfo = await this.fetchTokenInfoByAddress(address, chain);
        if (tokenInfo) {
          const discoveredToken: DiscoveredToken = {
            tokenInfo,
            source: 'manual',
            discoveredAt: new Date().toISOString(),
            confidence: 0.8,
            metadata: {}
          };
          tokens.push(discoveredToken);
        }
      } catch (error) {
        console.error(`[TokenDiscoveryService] Error discovering token ${address}:`, error);
      }
    }
    
    return tokens;
  }

  // Search and Filter
  async searchDiscoveredTokens(query: string, filters?: DiscoveryFilter): Promise<DiscoveredToken[]> {
    const allTokens = Array.from(this.discoveryCache.values()).flat();
    const searchTerm = query.toLowerCase();
    
    let filteredTokens = allTokens.filter(token => 
      token.tokenInfo.name.toLowerCase().includes(searchTerm) ||
      token.tokenInfo.symbol.toLowerCase().includes(searchTerm) ||
      token.tokenInfo.tokenId.toLowerCase().includes(searchTerm) ||
      (token.tokenInfo.contractAddress && token.tokenInfo.contractAddress.toLowerCase().includes(searchTerm))
    );
    
    if (filters) {
      filteredTokens = this.applyFilters(filteredTokens, filters);
    }
    
    return filteredTokens.sort((a, b) => b.confidence - a.confidence);
  }

  async getDiscoveredTokensByChain(chain: string): Promise<DiscoveredToken[]> {
    const tokens = this.discoveryCache.get(chain) || [];
    return tokens.sort((a, b) => b.confidence - a.confidence);
  }

  async getPopularDiscoveredTokens(limit = 20): Promise<DiscoveredToken[]> {
    const allTokens = Array.from(this.discoveryCache.values()).flat();
    
    return allTokens
      .sort((a, b) => {
        // Sort by popularity metrics
        const aPopularity = (a.metadata.holderCount || 0) + (a.metadata.volume24h || 0) / 1000;
        const bPopularity = (b.metadata.holderCount || 0) + (b.metadata.volume24h || 0) / 1000;
        return bPopularity - aPopularity;
      })
      .slice(0, limit);
  }

  async getTrendingTokens(period: 'HOUR' | 'DAY' | 'WEEK'): Promise<DiscoveredToken[]> {
    const allTokens = Array.from(this.discoveryCache.values()).flat();
    
    // Mock trending calculation based on price change
    return allTokens
      .filter(token => token.metadata.priceChange24h !== undefined)
      .sort((a, b) => (b.metadata.priceChange24h || 0) - (a.metadata.priceChange24h || 0))
      .slice(0, 10);
  }

  // Configuration
  async updateDiscoveryConfig(config: Partial<TokenDiscoveryConfig>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      await this.saveDiscoveryConfig();
      
      // Restart discovery if it was running
      if (this.isRunning) {
        await this.stopDiscovery();
        await this.startDiscovery();
      }
      
      console.log('[TokenDiscoveryService] Discovery configuration updated');
      return true;
    } catch (error) {
      console.error('[TokenDiscoveryService] Error updating discovery config:', error);
      return false;
    }
  }

  getDiscoveryConfig(): TokenDiscoveryConfig {
    return { ...this.config };
  }

  async addDiscoverySource(source: TokenDiscoverySource): Promise<boolean> {
    try {
      const existingIndex = this.config.sources.findIndex(s => s.name === source.name);
      
      if (existingIndex >= 0) {
        this.config.sources[existingIndex] = source;
      } else {
        this.config.sources.push(source);
      }
      
      this.initializeSourceStats();
      await this.saveDiscoveryConfig();
      
      console.log(`[TokenDiscoveryService] Discovery source added: ${source.name}`);
      return true;
    } catch (error) {
      console.error('[TokenDiscoveryService] Error adding discovery source:', error);
      return false;
    }
  }

  async removeDiscoverySource(sourceName: string): Promise<boolean> {
    try {
      this.config.sources = this.config.sources.filter(s => s.name !== sourceName);
      this.sourceStats.delete(sourceName);
      await this.saveDiscoveryConfig();
      
      console.log(`[TokenDiscoveryService] Discovery source removed: ${sourceName}`);
      return true;
    } catch (error) {
      console.error('[TokenDiscoveryService] Error removing discovery source:', error);
      return false;
    }
  }

  // Cache Management
  async clearDiscoveryCache(): Promise<void> {
    this.discoveryCache.clear();
    await this.saveDiscoveryCache();
    console.log('[TokenDiscoveryService] Discovery cache cleared');
  }

  async refreshDiscoveryCache(chain?: string): Promise<void> {
    if (chain) {
      this.discoveryCache.delete(chain);
    } else {
      this.discoveryCache.clear();
    }
    
    await this.performDiscovery(chain);
    console.log(`[TokenDiscoveryService] Discovery cache refreshed${chain ? ` for ${chain}` : ''}`);
  }

  async getDiscoveryCacheStats(): Promise<DiscoveryCacheStats> {
    const totalTokens = Array.from(this.discoveryCache.values()).flat().length;
    const tokensByChain: Record<string, number> = {};
    
    for (const [chain, tokens] of this.discoveryCache.entries()) {
      tokensByChain[chain] = tokens.length;
    }
    
    const cacheData = JSON.stringify(Object.fromEntries(this.discoveryCache));
    
    return {
      totalTokens,
      tokensByChain,
      lastUpdated: new Date().toISOString(),
      cacheSize: new Blob([cacheData]).size,
      hitRate: 85 // Mock hit rate
    };
  }

  // Analytics
  async getDiscoveryStats(): Promise<DiscoveryStats> {
    const allTokens = Array.from(this.discoveryCache.values()).flat();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const discoveredToday = allTokens.filter(token => 
      new Date(token.discoveredAt) >= today
    ).length;
    
    const discoveredThisWeek = allTokens.filter(token => 
      new Date(token.discoveredAt) >= weekAgo
    ).length;
    
    const sourceBreakdown: Record<string, number> = {};
    const chainBreakdown: Record<string, number> = {};
    const riskLevelBreakdown: Record<string, number> = {};
    
    let totalConfidence = 0;
    
    for (const token of allTokens) {
      sourceBreakdown[token.source] = (sourceBreakdown[token.source] || 0) + 1;
      chainBreakdown[token.tokenInfo.chain] = (chainBreakdown[token.tokenInfo.chain] || 0) + 1;
      riskLevelBreakdown[token.tokenInfo.riskLevel] = (riskLevelBreakdown[token.tokenInfo.riskLevel] || 0) + 1;
      totalConfidence += token.confidence;
    }
    
    return {
      totalDiscovered: allTokens.length,
      discoveredToday,
      discoveredThisWeek,
      sourceBreakdown,
      chainBreakdown,
      riskLevelBreakdown,
      averageConfidence: allTokens.length > 0 ? totalConfidence / allTokens.length : 0
    };
  }

  async getSourcePerformance(): Promise<SourcePerformanceStats[]> {
    return Array.from(this.sourceStats.values());
  }

  // Private helper methods
  private async performDiscovery(chain?: string): Promise<void> {
    console.log(`[TokenDiscoveryService] Performing discovery${chain ? ` for ${chain}` : ''}`);
    
    try {
      const tokens = await this.discoverTokensFromAllSources(chain);
      
      if (chain) {
        this.discoveryCache.set(chain, tokens);
      } else {
        // Group tokens by chain
        const tokensByChain: Record<string, DiscoveredToken[]> = {};
        
        for (const token of tokens) {
          const tokenChain = token.tokenInfo.chain;
          if (!tokensByChain[tokenChain]) {
            tokensByChain[tokenChain] = [];
          }
          tokensByChain[tokenChain].push(token);
        }
        
        // Update cache
        for (const [chainName, chainTokens] of Object.entries(tokensByChain)) {
          this.discoveryCache.set(chainName, chainTokens);
        }
      }
      
      await this.saveDiscoveryCache();
      console.log(`[TokenDiscoveryService] Discovery completed. Found ${tokens.length} tokens`);
    } catch (error) {
      console.error('[TokenDiscoveryService] Error during discovery:', error);
    }
  }

  private async discoverFromSource(source: TokenDiscoverySource, chain?: string): Promise<DiscoveredToken[]> {
    // Mock implementation - in production, this would call actual APIs
    const mockTokens: DiscoveredToken[] = [];
    const tokenCount = Math.min(this.config.maxTokensPerSource, Math.floor(Math.random() * 20) + 5);
    
    for (let i = 0; i < tokenCount; i++) {
      const tokenChain = chain || source.chainSupported[Math.floor(Math.random() * source.chainSupported.length)];
      const tokenId = `${source.name.toLowerCase()}_${tokenChain.toLowerCase()}_${i}`;
      
      const tokenInfo: TokenInfo = {
        tokenId,
        name: `${source.name} Token ${i}`,
        symbol: `${source.name.substring(0, 3).toUpperCase()}${i}`,
        chain: tokenChain as any,
        decimals: 18,
        contractAddress: this.generateMockAddress(),
        verified: Math.random() > 0.3,
        riskLevel: this.getRandomRiskLevel(),
        governanceApproved: false,
        addedBy: source.name,
        addedAt: new Date().toISOString(),
        allowedIdentityTypes: [IdentityType.ROOT, IdentityType.DAO]
      };
      
      const discoveredToken: DiscoveredToken = {
        tokenInfo,
        source: source.name,
        discoveredAt: new Date().toISOString(),
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        metadata: {
          holderCount: Math.floor(Math.random() * 10000),
          transactionCount: Math.floor(Math.random() * 100000),
          liquidityUSD: Math.floor(Math.random() * 1000000),
          marketCapUSD: Math.floor(Math.random() * 10000000),
          priceUSD: Math.random() * 100,
          volume24h: Math.floor(Math.random() * 1000000),
          priceChange24h: (Math.random() - 0.5) * 20
        }
      };
      
      mockTokens.push(discoveredToken);
    }
    
    // Apply filters
    return this.applyFilters(mockTokens, this.config.filters);
  }

  private async fetchTokenInfoByAddress(address: string, chain: string): Promise<TokenInfo | null> {
    // Mock implementation
    return {
      tokenId: `manual_${address.slice(-8)}`,
      name: `Token ${address.slice(-4)}`,
      symbol: `TK${address.slice(-2).toUpperCase()}`,
      chain: chain as any,
      decimals: 18,
      contractAddress: address,
      verified: false,
      riskLevel: 'MEDIUM',
      governanceApproved: false,
      addedBy: 'manual',
      addedAt: new Date().toISOString(),
      allowedIdentityTypes: [IdentityType.ROOT]
    };
  }

  private applyFilters(tokens: DiscoveredToken[], filters: DiscoveryFilter): DiscoveredToken[] {
    return tokens.filter(token => {
      if (filters.chains && !filters.chains.includes(token.tokenInfo.chain)) {
        return false;
      }
      
      if (filters.verified !== undefined && token.tokenInfo.verified !== filters.verified) {
        return false;
      }
      
      if (filters.riskLevel && !filters.riskLevel.includes(token.tokenInfo.riskLevel)) {
        return false;
      }
      
      if (filters.minHolders && (token.metadata.holderCount || 0) < filters.minHolders) {
        return false;
      }
      
      if (filters.minLiquidity && (token.metadata.liquidityUSD || 0) < filters.minLiquidity) {
        return false;
      }
      
      if (filters.excludeTokens && filters.excludeTokens.includes(token.tokenInfo.tokenId)) {
        return false;
      }
      
      if (filters.includeTokens && !filters.includeTokens.includes(token.tokenInfo.tokenId)) {
        return false;
      }
      
      return true;
    });
  }

  private deduplicateTokens(tokens: DiscoveredToken[]): DiscoveredToken[] {
    const seen = new Set<string>();
    const unique: DiscoveredToken[] = [];
    
    for (const token of tokens) {
      const key = `${token.tokenInfo.chain}_${token.tokenInfo.contractAddress || token.tokenInfo.tokenId}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(token);
      }
    }
    
    return unique;
  }

  private updateSourceStats(sourceName: string, tokensFound: number, success: boolean, responseTime: number): void {
    const stats = this.sourceStats.get(sourceName);
    if (!stats) return;
    
    stats.tokensDiscovered += tokensFound;
    
    if (success) {
      stats.lastSuccessfulDiscovery = new Date().toISOString();
      stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
    } else {
      stats.errorCount++;
    }
    
    // Calculate success rate (simplified)
    const totalAttempts = stats.tokensDiscovered + stats.errorCount;
    stats.successRate = totalAttempts > 0 ? (stats.tokensDiscovered / totalAttempts) * 100 : 0;
  }

  private initializeSourceStats(): void {
    for (const source of this.config.sources) {
      if (!this.sourceStats.has(source.name)) {
        this.sourceStats.set(source.name, {
          sourceName: source.name,
          tokensDiscovered: 0,
          successRate: 100,
          averageResponseTime: 0,
          lastSuccessfulDiscovery: new Date().toISOString(),
          errorCount: 0,
          enabled: source.enabled
        });
      }
    }
  }

  private getRandomRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const rand = Math.random();
    if (rand < 0.4) return 'LOW';
    if (rand < 0.7) return 'MEDIUM';
    if (rand < 0.9) return 'HIGH';
    return 'CRITICAL';
  }

  private generateMockAddress(): string {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async loadDiscoveryCache(): Promise<void> {
    try {
      const stored = localStorage.getItem('token_discovery_cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.discoveryCache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('[TokenDiscoveryService] Error loading discovery cache:', error);
    }
  }

  private async saveDiscoveryCache(): Promise<void> {
    try {
      const data = Object.fromEntries(this.discoveryCache);
      localStorage.setItem('token_discovery_cache', JSON.stringify(data));
    } catch (error) {
      console.error('[TokenDiscoveryService] Error saving discovery cache:', error);
    }
  }

  private async saveDiscoveryConfig(): Promise<void> {
    try {
      localStorage.setItem('token_discovery_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[TokenDiscoveryService] Error saving discovery config:', error);
    }
  }
}

// Export singleton instance
export const tokenDiscoveryService = new TokenDiscoveryService();