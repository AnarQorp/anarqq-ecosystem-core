/**
 * Identity-specific Qindex Service
 * Manages identity metadata registration and indexing
 */

import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel 
} from '@/types/identity';

export interface IdentityQindexServiceInterface {
  // Identity Registration
  registerIdentity(identity: ExtendedSquidIdentity): Promise<RegistrationResult>;
  updateIdentityMetadata(identityId: string, metadata: IdentityMetadata): Promise<boolean>;
  deregisterIdentity(identityId: string): Promise<boolean>;
  
  // Identity Classification
  classifyIdentity(identity: ExtendedSquidIdentity): Promise<IdentityClassification>;
  updateClassification(identityId: string, classification: IdentityClassification): Promise<boolean>;
  
  // Identity Search and Discovery
  searchIdentities(query: SearchQuery): Promise<SearchResult[]>;
  discoverIdentities(criteria: DiscoveryCriteria): Promise<DiscoveryResult[]>;
  getIdentityByDID(did: string): Promise<IndexedIdentity | null>;
  
  // Indexing Management
  reindexIdentity(identityId: string): Promise<boolean>;
  getIndexStatus(identityId: string): Promise<IndexStatus>;
  optimizeIndex(): Promise<OptimizationResult>;
  
  // Metadata Management
  storeMetadata(identityId: string, metadata: any): Promise<string>; // Returns IPFS hash
  retrieveMetadata(identityId: string): Promise<any>;
  updateMetadata(identityId: string, updates: any): Promise<boolean>;
  
  // Privacy and Visibility
  setVisibility(identityId: string, visibility: VisibilitySettings): Promise<boolean>;
  getVisibilitySettings(identityId: string): Promise<VisibilitySettings>;
  
  // Analytics and Insights
  getIdentityAnalytics(identityId: string): Promise<IdentityAnalytics>;
  getSystemAnalytics(): Promise<SystemAnalytics>;
  
  // Integration
  syncWithIPFS(identityId: string): Promise<boolean>;
  syncWithBlockchain(identityId: string): Promise<boolean>;
}

export interface RegistrationResult {
  success: boolean;
  identityId: string;
  indexId?: string;
  ipfsHash?: string;
  error?: string;
}

export interface IdentityMetadata {
  name: string;
  description?: string;
  avatar?: string;
  tags: string[];
  type: IdentityType;
  privacyLevel: PrivacyLevel;
  verificationLevel: 'UNVERIFIED' | 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  createdAt: string;
  lastUpdated: string;
  customFields?: Record<string, any>;
}

export interface IdentityClassification {
  primary: string;
  secondary: string[];
  confidence: number;
  categories: ClassificationCategory[];
  lastClassified: string;
}

export interface ClassificationCategory {
  name: string;
  score: number;
  description: string;
}

export interface SearchQuery {
  query: string;
  filters?: {
    type?: IdentityType;
    privacyLevel?: PrivacyLevel;
    verificationLevel?: string;
    tags?: string[];
    createdAfter?: string;
    createdBefore?: string;
  };
  sort?: {
    field: 'name' | 'createdAt' | 'lastUpdated' | 'relevance';
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  identity: IndexedIdentity;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface DiscoveryCriteria {
  similarTo?: string; // Identity DID to find similar identities
  inCategory?: string;
  withTags?: string[];
  excludeTypes?: IdentityType[];
  maxResults?: number;
}

export interface DiscoveryResult {
  identity: IndexedIdentity;
  similarityScore: number;
  reason: string;
}

export interface IndexedIdentity {
  did: string;
  metadata: IdentityMetadata;
  classification: IdentityClassification;
  visibility: VisibilitySettings;
  indexedAt: string;
  lastSynced: string;
  ipfsHash?: string;
  blockchainTxId?: string;
}

export interface IndexStatus {
  identityId: string;
  indexed: boolean;
  lastIndexed: string;
  indexHealth: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  issues: string[];
  nextReindex: string;
}

export interface OptimizationResult {
  optimized: number;
  errors: number;
  timeTaken: number;
  improvements: string[];
}

export interface VisibilitySettings {
  searchable: boolean;
  discoverable: boolean;
  showInDirectory: boolean;
  allowDirectContact: boolean;
  visibilityLevel: 'PUBLIC' | 'NETWORK' | 'PRIVATE';
  customRules?: VisibilityRule[];
}

export interface VisibilityRule {
  condition: string;
  action: 'SHOW' | 'HIDE' | 'RESTRICT';
  description: string;
}

export interface IdentityAnalytics {
  identityId: string;
  searchAppearances: number;
  discoveryCount: number;
  profileViews: number;
  contactRequests: number;
  popularTags: string[];
  trendingScore: number;
  lastAnalyzed: string;
}

export interface SystemAnalytics {
  totalIdentities: number;
  identitiesByType: Record<IdentityType, number>;
  identitiesByPrivacyLevel: Record<PrivacyLevel, number>;
  searchVolume: number;
  discoveryVolume: number;
  indexHealth: number; // Percentage
  lastUpdated: string;
}

export class IdentityQindexService implements IdentityQindexServiceInterface {
  private indexedIdentities: Map<string, IndexedIdentity> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // Term -> Set of identity IDs
  private classificationCache: Map<string, IdentityClassification> = new Map();

  constructor() {
    this.loadDataFromStorage();
    this.buildSearchIndex();
  }

  /**
   * Register an identity in the index
   */
  async registerIdentity(identity: ExtendedSquidIdentity): Promise<RegistrationResult> {
    try {
      // Create metadata from identity
      const metadata: IdentityMetadata = {
        name: identity.name,
        description: identity.description,
        avatar: identity.avatar,
        tags: identity.tags,
        type: identity.type,
        privacyLevel: identity.privacyLevel,
        verificationLevel: this.mapKYCToVerificationLevel(identity.kyc),
        createdAt: identity.createdAt,
        lastUpdated: identity.updatedAt,
        customFields: {
          parentId: identity.parentId,
          depth: identity.depth,
          governanceLevel: identity.governanceLevel
        }
      };

      // Classify the identity
      const classification = await this.classifyIdentity(identity);

      // Set default visibility based on privacy level
      const visibility = this.getDefaultVisibility(identity.privacyLevel);

      // Create indexed identity
      const indexedIdentity: IndexedIdentity = {
        did: identity.did,
        metadata,
        classification,
        visibility,
        indexedAt: new Date().toISOString(),
        lastSynced: new Date().toISOString()
      };

      // Store metadata in IPFS (simulated)
      const ipfsHash = await this.storeMetadata(identity.did, metadata);
      indexedIdentity.ipfsHash = ipfsHash;

      // Store in index
      this.indexedIdentities.set(identity.did, indexedIdentity);

      // Update search index
      this.updateSearchIndex(identity.did, indexedIdentity);

      // Save to storage
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Registered identity: ${identity.did}`);

      return {
        success: true,
        identityId: identity.did,
        indexId: identity.did,
        ipfsHash
      };
    } catch (error) {
      console.error('[IdentityQindexService] Error registering identity:', error);
      return {
        success: false,
        identityId: identity.did,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Update identity metadata
   */
  async updateIdentityMetadata(identityId: string, metadata: IdentityMetadata): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        console.error(`[IdentityQindexService] Identity not found: ${identityId}`);
        return false;
      }

      // Update metadata
      indexedIdentity.metadata = {
        ...indexedIdentity.metadata,
        ...metadata,
        lastUpdated: new Date().toISOString()
      };

      // Update IPFS hash
      const ipfsHash = await this.storeMetadata(identityId, indexedIdentity.metadata);
      indexedIdentity.ipfsHash = ipfsHash;
      indexedIdentity.lastSynced = new Date().toISOString();

      // Update search index
      this.updateSearchIndex(identityId, indexedIdentity);

      // Save to storage
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Updated metadata for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error updating metadata:', error);
      return false;
    }
  }

  /**
   * Deregister an identity from the index
   */
  async deregisterIdentity(identityId: string): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      // Remove from index
      this.indexedIdentities.delete(identityId);

      // Remove from search index
      this.removeFromSearchIndex(identityId);

      // Remove from classification cache
      this.classificationCache.delete(identityId);

      // Save to storage
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Deregistered identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error deregistering identity:', error);
      return false;
    }
  }

  /**
   * Classify an identity based on its properties
   */
  async classifyIdentity(identity: ExtendedSquidIdentity): Promise<IdentityClassification> {
    try {
      // Check cache first
      const cached = this.classificationCache.get(identity.did);
      if (cached && new Date(cached.lastClassified).getTime() > Date.now() - 3600000) { // 1 hour cache
        return cached;
      }

      const categories: ClassificationCategory[] = [];

      // Type-based classification
      categories.push({
        name: `${identity.type}_IDENTITY`,
        score: 1.0,
        description: `Identity of type ${identity.type}`
      });

      // Privacy-based classification
      categories.push({
        name: `${identity.privacyLevel}_PRIVACY`,
        score: 0.8,
        description: `Privacy level: ${identity.privacyLevel}`
      });

      // Governance-based classification
      categories.push({
        name: `${identity.governanceLevel}_GOVERNANCE`,
        score: 0.7,
        description: `Governance type: ${identity.governanceLevel}`
      });

      // Tag-based classification
      identity.tags.forEach(tag => {
        categories.push({
          name: `TAG_${tag.toUpperCase()}`,
          score: 0.5,
          description: `Tagged with: ${tag}`
        });
      });

      // Hierarchy-based classification
      if (identity.depth > 0) {
        categories.push({
          name: 'SUBIDENTITY',
          score: 0.6,
          description: `Subidentity at depth ${identity.depth}`
        });
      } else {
        categories.push({
          name: 'ROOT_IDENTITY',
          score: 0.9,
          description: 'Root identity'
        });
      }

      // KYC-based classification
      if (identity.kyc.approved) {
        categories.push({
          name: 'KYC_VERIFIED',
          score: 0.8,
          description: 'KYC verified identity'
        });
      }

      // Determine primary and secondary classifications
      const sortedCategories = categories.sort((a, b) => b.score - a.score);
      const primary = sortedCategories[0]?.name || 'UNCLASSIFIED';
      const secondary = sortedCategories.slice(1, 4).map(c => c.name);

      const classification: IdentityClassification = {
        primary,
        secondary,
        confidence: sortedCategories[0]?.score || 0,
        categories,
        lastClassified: new Date().toISOString()
      };

      // Cache the result
      this.classificationCache.set(identity.did, classification);

      console.log(`[IdentityQindexService] Classified identity ${identity.did} as ${primary}`);
      return classification;
    } catch (error) {
      console.error('[IdentityQindexService] Error classifying identity:', error);
      
      // Return default classification
      return {
        primary: 'UNCLASSIFIED',
        secondary: [],
        confidence: 0,
        categories: [],
        lastClassified: new Date().toISOString()
      };
    }
  }

  /**
   * Update identity classification
   */
  async updateClassification(identityId: string, classification: IdentityClassification): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      indexedIdentity.classification = classification;
      this.classificationCache.set(identityId, classification);

      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Updated classification for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error updating classification:', error);
      return false;
    }
  }

  /**
   * Search for identities
   */
  async searchIdentities(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      const searchTerms = query.query.toLowerCase().split(/\s+/);

      // Get candidate identity IDs from search index
      const candidateIds = new Set<string>();
      
      searchTerms.forEach(term => {
        const termResults = this.searchIndex.get(term);
        if (termResults) {
          termResults.forEach(id => candidateIds.add(id));
        }
      });

      // Score and filter candidates
      for (const identityId of candidateIds) {
        const indexedIdentity = this.indexedIdentities.get(identityId);
        if (!indexedIdentity) continue;

        // Apply filters
        if (query.filters) {
          if (query.filters.type && indexedIdentity.metadata.type !== query.filters.type) continue;
          if (query.filters.privacyLevel && indexedIdentity.metadata.privacyLevel !== query.filters.privacyLevel) continue;
          if (query.filters.verificationLevel && indexedIdentity.metadata.verificationLevel !== query.filters.verificationLevel) continue;
          if (query.filters.tags && !query.filters.tags.some(tag => indexedIdentity.metadata.tags.includes(tag))) continue;
          
          if (query.filters.createdAfter) {
            const createdAt = new Date(indexedIdentity.metadata.createdAt).getTime();
            const filterDate = new Date(query.filters.createdAfter).getTime();
            if (createdAt < filterDate) continue;
          }
          
          if (query.filters.createdBefore) {
            const createdAt = new Date(indexedIdentity.metadata.createdAt).getTime();
            const filterDate = new Date(query.filters.createdBefore).getTime();
            if (createdAt > filterDate) continue;
          }
        }

        // Check visibility
        if (!indexedIdentity.visibility.searchable) continue;

        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore(indexedIdentity, searchTerms);
        const matchedFields = this.getMatchedFields(indexedIdentity, searchTerms);

        results.push({
          identity: indexedIdentity,
          relevanceScore,
          matchedFields,
          snippet: this.generateSnippet(indexedIdentity, searchTerms)
        });
      }

      // Sort results
      const sortField = query.sort?.field || 'relevance';
      const sortDirection = query.sort?.direction || 'desc';

      results.sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'relevance':
            comparison = a.relevanceScore - b.relevanceScore;
            break;
          case 'name':
            comparison = a.identity.metadata.name.localeCompare(b.identity.metadata.name);
            break;
          case 'createdAt':
            comparison = new Date(a.identity.metadata.createdAt).getTime() - new Date(b.identity.metadata.createdAt).getTime();
            break;
          case 'lastUpdated':
            comparison = new Date(a.identity.metadata.lastUpdated).getTime() - new Date(b.identity.metadata.lastUpdated).getTime();
            break;
        }

        return sortDirection === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      const paginatedResults = results.slice(offset, offset + limit);

      console.log(`[IdentityQindexService] Search for "${query.query}" returned ${paginatedResults.length} results`);
      return paginatedResults;
    } catch (error) {
      console.error('[IdentityQindexService] Error searching identities:', error);
      return [];
    }
  }

  /**
   * Discover identities based on criteria
   */
  async discoverIdentities(criteria: DiscoveryCriteria): Promise<DiscoveryResult[]> {
    try {
      const results: DiscoveryResult[] = [];
      const maxResults = criteria.maxResults || 10;

      for (const [identityId, indexedIdentity] of this.indexedIdentities) {
        // Check visibility
        if (!indexedIdentity.visibility.discoverable) continue;

        // Apply exclusion filters
        if (criteria.excludeTypes && criteria.excludeTypes.includes(indexedIdentity.metadata.type)) continue;

        let similarityScore = 0;
        let reason = '';

        // Similar to another identity
        if (criteria.similarTo) {
          const targetIdentity = this.indexedIdentities.get(criteria.similarTo);
          if (targetIdentity) {
            similarityScore = this.calculateSimilarityScore(indexedIdentity, targetIdentity);
            reason = 'Similar profile characteristics';
          }
        }

        // In specific category
        if (criteria.inCategory) {
          const hasCategory = indexedIdentity.classification.categories.some(
            cat => cat.name.toLowerCase().includes(criteria.inCategory!.toLowerCase())
          );
          if (hasCategory) {
            similarityScore += 0.5;
            reason = reason ? `${reason}, In category: ${criteria.inCategory}` : `In category: ${criteria.inCategory}`;
          }
        }

        // With specific tags
        if (criteria.withTags) {
          const matchingTags = criteria.withTags.filter(tag => 
            indexedIdentity.metadata.tags.includes(tag)
          );
          if (matchingTags.length > 0) {
            similarityScore += matchingTags.length * 0.3;
            reason = reason ? `${reason}, Matching tags: ${matchingTags.join(', ')}` : `Matching tags: ${matchingTags.join(', ')}`;
          }
        }

        // Only include if there's some similarity
        if (similarityScore > 0) {
          results.push({
            identity: indexedIdentity,
            similarityScore,
            reason: reason || 'General similarity'
          });
        }
      }

      // Sort by similarity score and limit results
      results.sort((a, b) => b.similarityScore - a.similarityScore);
      const limitedResults = results.slice(0, maxResults);

      console.log(`[IdentityQindexService] Discovery returned ${limitedResults.length} results`);
      return limitedResults;
    } catch (error) {
      console.error('[IdentityQindexService] Error discovering identities:', error);
      return [];
    }
  }

  /**
   * Get identity by DID
   */
  async getIdentityByDID(did: string): Promise<IndexedIdentity | null> {
    return this.indexedIdentities.get(did) || null;
  }

  /**
   * Reindex an identity
   */
  async reindexIdentity(identityId: string): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      // Update search index
      this.updateSearchIndex(identityId, indexedIdentity);

      // Update last synced timestamp
      indexedIdentity.lastSynced = new Date().toISOString();

      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Reindexed identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error reindexing identity:', error);
      return false;
    }
  }

  /**
   * Get index status for an identity
   */
  async getIndexStatus(identityId: string): Promise<IndexStatus> {
    const indexedIdentity = this.indexedIdentities.get(identityId);
    
    if (!indexedIdentity) {
      return {
        identityId,
        indexed: false,
        lastIndexed: 'Never',
        indexHealth: 'FAILED',
        issues: ['Identity not found in index'],
        nextReindex: 'N/A'
      };
    }

    // Check for issues
    const issues: string[] = [];
    
    if (!indexedIdentity.ipfsHash) {
      issues.push('Missing IPFS hash');
    }
    
    if (!indexedIdentity.classification.primary) {
      issues.push('Missing classification');
    }

    const lastIndexedTime = new Date(indexedIdentity.lastSynced).getTime();
    const daysSinceLastIndex = (Date.now() - lastIndexedTime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastIndex > 30) {
      issues.push('Index is stale (>30 days)');
    }

    const indexHealth = issues.length === 0 ? 'HEALTHY' : issues.length <= 2 ? 'DEGRADED' : 'FAILED';
    
    // Calculate next reindex time (weekly for healthy, daily for degraded)
    const nextReindexInterval = indexHealth === 'HEALTHY' ? 7 : 1;
    const nextReindex = new Date(lastIndexedTime + nextReindexInterval * 24 * 60 * 60 * 1000).toISOString();

    return {
      identityId,
      indexed: true,
      lastIndexed: indexedIdentity.lastSynced,
      indexHealth,
      issues,
      nextReindex
    };
  }

  /**
   * Optimize the entire index
   */
  async optimizeIndex(): Promise<OptimizationResult> {
    const startTime = Date.now();
    let optimized = 0;
    let errors = 0;
    const improvements: string[] = [];

    try {
      // Rebuild search index
      this.searchIndex.clear();
      for (const [identityId, indexedIdentity] of this.indexedIdentities) {
        try {
          this.updateSearchIndex(identityId, indexedIdentity);
          optimized++;
        } catch (error) {
          errors++;
          console.error(`[IdentityQindexService] Error optimizing ${identityId}:`, error);
        }
      }

      improvements.push(`Rebuilt search index for ${optimized} identities`);

      // Clean up stale classifications
      const staleClassifications = Array.from(this.classificationCache.entries()).filter(
        ([_, classification]) => new Date(classification.lastClassified).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      staleClassifications.forEach(([identityId]) => {
        this.classificationCache.delete(identityId);
      });

      if (staleClassifications.length > 0) {
        improvements.push(`Cleaned up ${staleClassifications.length} stale classifications`);
      }

      await this.saveDataToStorage();

      const timeTaken = Date.now() - startTime;

      console.log(`[IdentityQindexService] Index optimization completed: ${optimized} optimized, ${errors} errors, ${timeTaken}ms`);

      return {
        optimized,
        errors,
        timeTaken,
        improvements
      };
    } catch (error) {
      console.error('[IdentityQindexService] Error optimizing index:', error);
      return {
        optimized,
        errors: errors + 1,
        timeTaken: Date.now() - startTime,
        improvements
      };
    }
  }

  /**
   * Store metadata in IPFS (simulated)
   */
  async storeMetadata(identityId: string, metadata: any): Promise<string> {
    try {
      // Simulate IPFS storage
      const content = JSON.stringify(metadata);
      const hash = await this.generateIPFSHash(content);
      
      // Store in localStorage for simulation
      const ipfsStorage = JSON.parse(localStorage.getItem('identity_qindex_ipfs') || '{}');
      ipfsStorage[hash] = content;
      localStorage.setItem('identity_qindex_ipfs', JSON.stringify(ipfsStorage));

      console.log(`[IdentityQindexService] Stored metadata for ${identityId} in IPFS: ${hash}`);
      return hash;
    } catch (error) {
      console.error('[IdentityQindexService] Error storing metadata:', error);
      throw new Error(`Failed to store metadata for identity: ${identityId}`);
    }
  }

  /**
   * Retrieve metadata from IPFS (simulated)
   */
  async retrieveMetadata(identityId: string): Promise<any> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity || !indexedIdentity.ipfsHash) {
        return null;
      }

      const ipfsStorage = JSON.parse(localStorage.getItem('identity_qindex_ipfs') || '{}');
      const content = ipfsStorage[indexedIdentity.ipfsHash];
      
      if (!content) {
        console.warn(`[IdentityQindexService] Metadata not found in IPFS for ${identityId}`);
        return null;
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('[IdentityQindexService] Error retrieving metadata:', error);
      return null;
    }
  }

  /**
   * Update metadata
   */
  async updateMetadata(identityId: string, updates: any): Promise<boolean> {
    try {
      const currentMetadata = await this.retrieveMetadata(identityId);
      if (!currentMetadata) {
        return false;
      }

      const updatedMetadata = { ...currentMetadata, ...updates };
      const newHash = await this.storeMetadata(identityId, updatedMetadata);

      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (indexedIdentity) {
        indexedIdentity.ipfsHash = newHash;
        indexedIdentity.lastSynced = new Date().toISOString();
      }

      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Updated metadata for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error updating metadata:', error);
      return false;
    }
  }

  /**
   * Set visibility settings for an identity
   */
  async setVisibility(identityId: string, visibility: VisibilitySettings): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      indexedIdentity.visibility = visibility;
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Updated visibility for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error setting visibility:', error);
      return false;
    }
  }

  /**
   * Get visibility settings for an identity
   */
  async getVisibilitySettings(identityId: string): Promise<VisibilitySettings> {
    const indexedIdentity = this.indexedIdentities.get(identityId);
    
    if (!indexedIdentity) {
      return this.getDefaultVisibility(PrivacyLevel.PRIVATE);
    }

    return indexedIdentity.visibility;
  }

  /**
   * Get analytics for an identity
   */
  async getIdentityAnalytics(identityId: string): Promise<IdentityAnalytics> {
    // Simulate analytics data
    return {
      identityId,
      searchAppearances: Math.floor(Math.random() * 100),
      discoveryCount: Math.floor(Math.random() * 50),
      profileViews: Math.floor(Math.random() * 200),
      contactRequests: Math.floor(Math.random() * 20),
      popularTags: ['blockchain', 'identity', 'privacy'],
      trendingScore: Math.random() * 10,
      lastAnalyzed: new Date().toISOString()
    };
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    const identitiesByType: Record<IdentityType, number> = {
      [IdentityType.ROOT]: 0,
      [IdentityType.DAO]: 0,
      [IdentityType.ENTERPRISE]: 0,
      [IdentityType.CONSENTIDA]: 0,
      [IdentityType.AID]: 0
    };

    const identitiesByPrivacyLevel: Record<PrivacyLevel, number> = {
      [PrivacyLevel.PUBLIC]: 0,
      [PrivacyLevel.DAO_ONLY]: 0,
      [PrivacyLevel.PRIVATE]: 0,
      [PrivacyLevel.ANONYMOUS]: 0
    };

    for (const indexedIdentity of this.indexedIdentities.values()) {
      identitiesByType[indexedIdentity.metadata.type]++;
      identitiesByPrivacyLevel[indexedIdentity.metadata.privacyLevel]++;
    }

    const healthyIdentities = Array.from(this.indexedIdentities.values()).filter(
      identity => !identity.ipfsHash || new Date(identity.lastSynced).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    return {
      totalIdentities: this.indexedIdentities.size,
      identitiesByType,
      identitiesByPrivacyLevel,
      searchVolume: Math.floor(Math.random() * 1000),
      discoveryVolume: Math.floor(Math.random() * 500),
      indexHealth: this.indexedIdentities.size > 0 ? (healthyIdentities / this.indexedIdentities.size) * 100 : 100,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Sync with IPFS
   */
  async syncWithIPFS(identityId: string): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      // Simulate IPFS sync
      await new Promise(resolve => setTimeout(resolve, 200));

      indexedIdentity.lastSynced = new Date().toISOString();
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Synced with IPFS for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error syncing with IPFS:', error);
      return false;
    }
  }

  /**
   * Sync with blockchain
   */
  async syncWithBlockchain(identityId: string): Promise<boolean> {
    try {
      const indexedIdentity = this.indexedIdentities.get(identityId);
      if (!indexedIdentity) {
        return false;
      }

      // Simulate blockchain sync
      await new Promise(resolve => setTimeout(resolve, 500));

      indexedIdentity.blockchainTxId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      indexedIdentity.lastSynced = new Date().toISOString();
      await this.saveDataToStorage();

      console.log(`[IdentityQindexService] Synced with blockchain for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQindexService] Error syncing with blockchain:', error);
      return false;
    }
  }

  // Private helper methods

  private mapKYCToVerificationLevel(kyc: any): 'UNVERIFIED' | 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL' {
    if (!kyc.submitted) return 'UNVERIFIED';
    if (!kyc.approved) return 'UNVERIFIED';
    
    switch (kyc.level) {
      case 'BASIC': return 'BASIC';
      case 'ENHANCED': return 'ENHANCED';
      case 'INSTITUTIONAL': return 'INSTITUTIONAL';
      default: return 'BASIC';
    }
  }

  private getDefaultVisibility(privacyLevel: PrivacyLevel): VisibilitySettings {
    switch (privacyLevel) {
      case PrivacyLevel.PUBLIC:
        return {
          searchable: true,
          discoverable: true,
          showInDirectory: true,
          allowDirectContact: true,
          visibilityLevel: 'PUBLIC'
        };
      case PrivacyLevel.DAO_ONLY:
        return {
          searchable: true,
          discoverable: true,
          showInDirectory: false,
          allowDirectContact: true,
          visibilityLevel: 'NETWORK'
        };
      case PrivacyLevel.PRIVATE:
        return {
          searchable: false,
          discoverable: false,
          showInDirectory: false,
          allowDirectContact: false,
          visibilityLevel: 'PRIVATE'
        };
      case PrivacyLevel.ANONYMOUS:
        return {
          searchable: false,
          discoverable: false,
          showInDirectory: false,
          allowDirectContact: false,
          visibilityLevel: 'PRIVATE'
        };
      default:
        return {
          searchable: false,
          discoverable: false,
          showInDirectory: false,
          allowDirectContact: false,
          visibilityLevel: 'PRIVATE'
        };
    }
  }

  private updateSearchIndex(identityId: string, indexedIdentity: IndexedIdentity): void {
    // Remove existing entries for this identity
    this.removeFromSearchIndex(identityId);

    // Add new entries
    const searchableText = [
      indexedIdentity.metadata.name,
      indexedIdentity.metadata.description || '',
      ...indexedIdentity.metadata.tags,
      indexedIdentity.metadata.type,
      indexedIdentity.classification.primary,
      ...indexedIdentity.classification.secondary
    ].join(' ').toLowerCase();

    const terms = searchableText.split(/\s+/).filter(term => term.length > 2);

    terms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(identityId);
    });
  }

  private removeFromSearchIndex(identityId: string): void {
    for (const [term, identityIds] of this.searchIndex) {
      identityIds.delete(identityId);
      if (identityIds.size === 0) {
        this.searchIndex.delete(term);
      }
    }
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear();
    for (const [identityId, indexedIdentity] of this.indexedIdentities) {
      this.updateSearchIndex(identityId, indexedIdentity);
    }
  }

  private calculateRelevanceScore(indexedIdentity: IndexedIdentity, searchTerms: string[]): number {
    let score = 0;
    const searchableFields = [
      indexedIdentity.metadata.name.toLowerCase(),
      (indexedIdentity.metadata.description || '').toLowerCase(),
      indexedIdentity.metadata.tags.join(' ').toLowerCase(),
      indexedIdentity.classification.primary.toLowerCase()
    ];

    searchTerms.forEach(term => {
      searchableFields.forEach((field, index) => {
        if (field.includes(term)) {
          // Weight different fields differently
          const weight = [3, 2, 1.5, 1][index] || 1;
          score += weight;
        }
      });
    });

    return score;
  }

  private getMatchedFields(indexedIdentity: IndexedIdentity, searchTerms: string[]): string[] {
    const matchedFields: string[] = [];
    
    searchTerms.forEach(term => {
      if (indexedIdentity.metadata.name.toLowerCase().includes(term)) {
        matchedFields.push('name');
      }
      if ((indexedIdentity.metadata.description || '').toLowerCase().includes(term)) {
        matchedFields.push('description');
      }
      if (indexedIdentity.metadata.tags.some(tag => tag.toLowerCase().includes(term))) {
        matchedFields.push('tags');
      }
      if (indexedIdentity.classification.primary.toLowerCase().includes(term)) {
        matchedFields.push('classification');
      }
    });

    return [...new Set(matchedFields)];
  }

  private generateSnippet(indexedIdentity: IndexedIdentity, searchTerms: string[]): string {
    const description = indexedIdentity.metadata.description || '';
    if (!description) return '';

    // Find the first occurrence of any search term
    const lowerDescription = description.toLowerCase();
    let firstMatch = -1;
    
    for (const term of searchTerms) {
      const index = lowerDescription.indexOf(term);
      if (index !== -1 && (firstMatch === -1 || index < firstMatch)) {
        firstMatch = index;
      }
    }

    if (firstMatch === -1) return description.substring(0, 100) + '...';

    // Extract snippet around the match
    const start = Math.max(0, firstMatch - 50);
    const end = Math.min(description.length, firstMatch + 100);
    
    return (start > 0 ? '...' : '') + description.substring(start, end) + (end < description.length ? '...' : '');
  }

  private calculateSimilarityScore(identity1: IndexedIdentity, identity2: IndexedIdentity): number {
    let score = 0;

    // Type similarity
    if (identity1.metadata.type === identity2.metadata.type) {
      score += 0.3;
    }

    // Privacy level similarity
    if (identity1.metadata.privacyLevel === identity2.metadata.privacyLevel) {
      score += 0.2;
    }

    // Tag similarity
    const commonTags = identity1.metadata.tags.filter(tag => 
      identity2.metadata.tags.includes(tag)
    );
    score += commonTags.length * 0.1;

    // Classification similarity
    if (identity1.classification.primary === identity2.classification.primary) {
      score += 0.2;
    }

    const commonSecondaryClassifications = identity1.classification.secondary.filter(cls =>
      identity2.classification.secondary.includes(cls)
    );
    score += commonSecondaryClassifications.length * 0.05;

    return Math.min(score, 1); // Cap at 1.0
  }

  private async generateIPFSHash(content: string): Promise<string> {
    // Simulate IPFS hash generation
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `Qm${hashHex.substring(0, 44)}`; // IPFS-like hash
  }

  private async loadDataFromStorage(): Promise<void> {
    try {
      const indexData = localStorage.getItem('identity_qindex_data');
      if (indexData) {
        const parsed = JSON.parse(indexData);
        this.indexedIdentities = new Map(Object.entries(parsed.identities || {}));
        this.classificationCache = new Map(Object.entries(parsed.classifications || {}));
        console.log(`[IdentityQindexService] Loaded ${this.indexedIdentities.size} identities from storage`);
      }
    } catch (error) {
      console.error('[IdentityQindexService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        identities: Object.fromEntries(this.indexedIdentities),
        classifications: Object.fromEntries(this.classificationCache)
      };
      localStorage.setItem('identity_qindex_data', JSON.stringify(data));
    } catch (error) {
      console.error('[IdentityQindexService] Error saving data to storage:', error);
    }
  }
}

// Singleton instance
export const identityQindexService = new IdentityQindexService();