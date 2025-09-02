/**
 * Token Metadata and Icon Management Service
 * Handles token metadata storage, icon management, and asset caching
 * with IPFS integration and CDN support
 */

import { TokenInfo, TokenIconManagement } from './MultiChainTokenService';

// Metadata Management
export interface TokenMetadata {
  tokenId: string;
  basicInfo: {
    name: string;
    symbol: string;
    description?: string;
    website?: string;
    whitepaper?: string;
    documentation?: string;
  };
  
  // Visual assets
  assets: {
    iconUrl?: string;
    logoUrl?: string;
    bannerUrl?: string;
    thumbnailUrl?: string;
    iconHash?: string;
    logoHash?: string;
  };
  
  // Social and community
  social: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    reddit?: string;
    github?: string;
    medium?: string;
  };
  
  // Technical details
  technical: {
    contractAddress?: string;
    chain: string;
    chainId?: number;
    decimals: number;
    totalSupply?: string;
    maxSupply?: string;
    mintable?: boolean;
    burnable?: boolean;
    pausable?: boolean;
  };
  
  // Market data
  market: {
    marketCap?: number;
    circulatingSupply?: string;
    price?: number;
    volume24h?: number;
    priceChange24h?: number;
    allTimeHigh?: number;
    allTimeLow?: number;
    lastUpdated?: string;
  };
  
  // Governance and compliance
  governance: {
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    complianceStatus?: string;
    auditReports?: AuditReport[];
  };
  
  // Usage and adoption
  adoption: {
    holderCount?: number;
    transactionCount?: number;
    activeAddresses?: number;
    exchangeListings?: ExchangeListing[];
    partnerships?: Partnership[];
  };
  
  // Metadata management
  management: {
    createdAt: string;
    updatedAt: string;
    version: string;
    updatedBy: string;
    changeHistory: MetadataChange[];
  };
}

export interface AuditReport {
  auditorName: string;
  reportUrl: string;
  reportDate: string;
  score: number; // 0-100
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  status: 'PASSED' | 'FAILED' | 'CONDITIONAL';
}

export interface ExchangeListing {
  exchangeName: string;
  tradingPair: string;
  listedAt: string;
  volume24h?: number;
  verified: boolean;
}

export interface Partnership {
  partnerName: string;
  partnerType: 'INTEGRATION' | 'COLLABORATION' | 'INVESTMENT' | 'TECHNOLOGY';
  announcedAt: string;
  description?: string;
  verified: boolean;
}

export interface MetadataChange {
  changeId: string;
  changedBy: string;
  changedAt: string;
  changeType: 'CREATE' | 'UPDATE' | 'VERIFY' | 'ICON_UPDATE' | 'SOCIAL_UPDATE';
  changes: Record<string, { from: any; to: any }>;
  reason?: string;
  approved: boolean;
  approvedBy?: string;
}

// Icon and Asset Management
export interface IconUploadRequest {
  tokenId: string;
  file: File;
  uploadedBy: string;
  iconType: 'ICON' | 'LOGO' | 'BANNER' | 'THUMBNAIL';
  replaceExisting?: boolean;
}

export interface IconUploadResult {
  success: boolean;
  iconUrl?: string;
  iconHash?: string;
  cdnUrl?: string;
  ipfsHash?: string;
  error?: string;
  metadata: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    uploadedAt: string;
  };
}

export interface IconValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  metadata: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    aspectRatio: number;
  };
}

// Storage and CDN Configuration
export interface StorageConfig {
  // IPFS configuration
  ipfs: {
    enabled: boolean;
    gateway: string;
    apiEndpoint: string;
    pinningService?: string;
    pinningApiKey?: string;
  };
  
  // CDN configuration
  cdn: {
    enabled: boolean;
    baseUrl: string;
    apiKey?: string;
    cacheTtl: number; // seconds
    compressionEnabled: boolean;
  };
  
  // Local storage fallback
  localStorage: {
    enabled: boolean;
    maxSize: number; // bytes
    compressionEnabled: boolean;
  };
  
  // Asset optimization
  optimization: {
    autoResize: boolean;
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0-100
    formats: string[]; // ['webp', 'png', 'jpg']
  };
}

// Service Interface
export interface TokenMetadataServiceInterface {
  // Metadata Management
  getTokenMetadata(tokenId: string): Promise<TokenMetadata | null>;
  updateTokenMetadata(tokenId: string, updates: Partial<TokenMetadata>, updatedBy: string): Promise<boolean>;
  createTokenMetadata(tokenId: string, metadata: Partial<TokenMetadata>, createdBy: string): Promise<boolean>;
  deleteTokenMetadata(tokenId: string, deletedBy: string): Promise<boolean>;
  
  // Metadata Search and Discovery
  searchTokenMetadata(query: string, filters?: MetadataSearchFilters): Promise<TokenMetadata[]>;
  getTokensByCategory(category: string): Promise<TokenMetadata[]>;
  getVerifiedTokens(): Promise<TokenMetadata[]>;
  getTokensByRiskLevel(riskLevel: string): Promise<TokenMetadata[]>;
  
  // Icon and Asset Management
  uploadTokenIcon(request: IconUploadRequest): Promise<IconUploadResult>;
  getTokenIcon(tokenId: string, iconType?: string): Promise<string | null>;
  validateIcon(file: File): Promise<IconValidationResult>;
  deleteTokenIcon(tokenId: string, iconType: string, deletedBy: string): Promise<boolean>;
  
  // Asset Optimization
  optimizeAsset(file: File, options?: AssetOptimizationOptions): Promise<File>;
  generateThumbnail(file: File, size: { width: number; height: number }): Promise<File>;
  convertFormat(file: File, targetFormat: string): Promise<File>;
  
  // Verification and Compliance
  verifyTokenMetadata(tokenId: string, verifiedBy: string): Promise<boolean>;
  unverifyTokenMetadata(tokenId: string, unverifiedBy: string, reason: string): Promise<boolean>;
  addAuditReport(tokenId: string, report: AuditReport, addedBy: string): Promise<boolean>;
  
  // Social and Community Data
  updateSocialLinks(tokenId: string, social: Partial<TokenMetadata['social']>, updatedBy: string): Promise<boolean>;
  addPartnership(tokenId: string, partnership: Partnership, addedBy: string): Promise<boolean>;
  addExchangeListing(tokenId: string, listing: ExchangeListing, addedBy: string): Promise<boolean>;
  
  // Market Data Integration
  updateMarketData(tokenId: string, marketData: Partial<TokenMetadata['market']>): Promise<boolean>;
  refreshMarketData(tokenId: string): Promise<boolean>;
  getMarketDataHistory(tokenId: string, period: string): Promise<any[]>;
  
  // Storage and Caching
  clearCache(tokenId?: string): Promise<void>;
  preloadMetadata(tokenIds: string[]): Promise<void>;
  getStorageStats(): Promise<StorageStats>;
  
  // Configuration
  updateStorageConfig(config: Partial<StorageConfig>): Promise<boolean>;
  getStorageConfig(): StorageConfig;
}

export interface MetadataSearchFilters {
  chains?: string[];
  verified?: boolean;
  riskLevels?: string[];
  hasIcon?: boolean;
  hasAudit?: boolean;
  minMarketCap?: number;
  maxMarketCap?: number;
  categories?: string[];
}

export interface AssetOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
  maintainAspectRatio?: boolean;
}

export interface StorageStats {
  totalTokens: number;
  totalAssets: number;
  totalStorageUsed: number; // bytes
  ipfsStorageUsed: number;
  cdnStorageUsed: number;
  localStorageUsed: number;
  cacheHitRate: number;
  lastUpdated: string;
}

export class TokenMetadataService implements TokenMetadataServiceInterface {
  private metadataCache: Map<string, TokenMetadata> = new Map();
  private iconCache: Map<string, string> = new Map();
  private storageConfig: StorageConfig;
  
  // Default storage configuration
  private defaultStorageConfig: StorageConfig = {
    ipfs: {
      enabled: true,
      gateway: 'https://gateway.pinata.cloud',
      apiEndpoint: 'https://api.pinata.cloud',
      pinningService: 'pinata'
    },
    cdn: {
      enabled: true,
      baseUrl: 'https://cdn.tokens.example.com',
      cacheTtl: 86400, // 24 hours
      compressionEnabled: true
    },
    localStorage: {
      enabled: true,
      maxSize: 50 * 1024 * 1024, // 50MB
      compressionEnabled: true
    },
    optimization: {
      autoResize: true,
      maxWidth: 512,
      maxHeight: 512,
      quality: 85,
      formats: ['webp', 'png']
    }
  };

  constructor(config?: Partial<StorageConfig>) {
    this.storageConfig = { ...this.defaultStorageConfig, ...config };
    this.loadMetadataCache();
  }

  // Metadata Management
  async getTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
    try {
      // Check cache first
      if (this.metadataCache.has(tokenId)) {
        return this.metadataCache.get(tokenId)!;
      }
      
      // Load from storage
      const metadata = await this.loadMetadataFromStorage(tokenId);
      if (metadata) {
        this.metadataCache.set(tokenId, metadata);
      }
      
      return metadata;
    } catch (error) {
      console.error('[TokenMetadataService] Error getting token metadata:', error);
      return null;
    }
  }

  async updateTokenMetadata(
    tokenId: string,
    updates: Partial<TokenMetadata>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const existingMetadata = await this.getTokenMetadata(tokenId);
      if (!existingMetadata) {
        console.warn(`[TokenMetadataService] Token metadata not found: ${tokenId}`);
        return false;
      }
      
      // Create change record
      const changeId = this.generateId();
      const changes: Record<string, { from: any; to: any }> = {};
      
      // Track changes
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'management') {
          changes[key] = {
            from: (existingMetadata as any)[key],
            to: value
          };
        }
      }
      
      const change: MetadataChange = {
        changeId,
        changedBy: updatedBy,
        changedAt: new Date().toISOString(),
        changeType: 'UPDATE',
        changes,
        approved: true // Auto-approve for now
      };
      
      // Update metadata
      const updatedMetadata: TokenMetadata = {
        ...existingMetadata,
        ...updates,
        management: {
          ...existingMetadata.management,
          updatedAt: new Date().toISOString(),
          updatedBy,
          version: this.incrementVersion(existingMetadata.management.version),
          changeHistory: [...existingMetadata.management.changeHistory, change]
        }
      };
      
      // Save to cache and storage
      this.metadataCache.set(tokenId, updatedMetadata);
      await this.saveMetadataToStorage(tokenId, updatedMetadata);
      
      console.log(`[TokenMetadataService] Token metadata updated: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error updating token metadata:', error);
      return false;
    }
  }

  async createTokenMetadata(
    tokenId: string,
    metadata: Partial<TokenMetadata>,
    createdBy: string
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      const newMetadata: TokenMetadata = {
        tokenId,
        basicInfo: {
          name: metadata.basicInfo?.name || '',
          symbol: metadata.basicInfo?.symbol || '',
          description: metadata.basicInfo?.description,
          website: metadata.basicInfo?.website,
          whitepaper: metadata.basicInfo?.whitepaper,
          documentation: metadata.basicInfo?.documentation
        },
        assets: metadata.assets || {},
        social: metadata.social || {},
        technical: {
          chain: metadata.technical?.chain || 'CUSTOM',
          decimals: metadata.technical?.decimals || 18,
          contractAddress: metadata.technical?.contractAddress,
          chainId: metadata.technical?.chainId,
          totalSupply: metadata.technical?.totalSupply,
          maxSupply: metadata.technical?.maxSupply,
          mintable: metadata.technical?.mintable,
          burnable: metadata.technical?.burnable,
          pausable: metadata.technical?.pausable
        },
        market: metadata.market || {},
        governance: {
          verified: false,
          riskLevel: metadata.governance?.riskLevel || 'MEDIUM',
          auditReports: metadata.governance?.auditReports || []
        },
        adoption: metadata.adoption || {},
        management: {
          createdAt: now,
          updatedAt: now,
          version: '1.0.0',
          updatedBy: createdBy,
          changeHistory: [{
            changeId: this.generateId(),
            changedBy: createdBy,
            changedAt: now,
            changeType: 'CREATE',
            changes: {},
            approved: true
          }]
        }
      };
      
      // Save to cache and storage
      this.metadataCache.set(tokenId, newMetadata);
      await this.saveMetadataToStorage(tokenId, newMetadata);
      
      console.log(`[TokenMetadataService] Token metadata created: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error creating token metadata:', error);
      return false;
    }
  }

  async deleteTokenMetadata(tokenId: string, deletedBy: string): Promise<boolean> {
    try {
      this.metadataCache.delete(tokenId);
      await this.deleteMetadataFromStorage(tokenId);
      
      console.log(`[TokenMetadataService] Token metadata deleted: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error deleting token metadata:', error);
      return false;
    }
  }

  // Metadata Search and Discovery
  async searchTokenMetadata(query: string, filters?: MetadataSearchFilters): Promise<TokenMetadata[]> {
    try {
      const allMetadata = Array.from(this.metadataCache.values());
      const searchTerm = query.toLowerCase();
      
      let results = allMetadata.filter(metadata => 
        metadata.basicInfo.name.toLowerCase().includes(searchTerm) ||
        metadata.basicInfo.symbol.toLowerCase().includes(searchTerm) ||
        (metadata.basicInfo.description && metadata.basicInfo.description.toLowerCase().includes(searchTerm)) ||
        metadata.tokenId.toLowerCase().includes(searchTerm)
      );
      
      if (filters) {
        results = this.applyMetadataFilters(results, filters);
      }
      
      return results.sort((a, b) => 
        new Date(b.management.updatedAt).getTime() - new Date(a.management.updatedAt).getTime()
      );
    } catch (error) {
      console.error('[TokenMetadataService] Error searching token metadata:', error);
      return [];
    }
  }

  async getTokensByCategory(category: string): Promise<TokenMetadata[]> {
    // Mock implementation - in production, this would use proper categorization
    const allMetadata = Array.from(this.metadataCache.values());
    return allMetadata.filter(metadata => 
      metadata.basicInfo.description?.toLowerCase().includes(category.toLowerCase())
    );
  }

  async getVerifiedTokens(): Promise<TokenMetadata[]> {
    const allMetadata = Array.from(this.metadataCache.values());
    return allMetadata.filter(metadata => metadata.governance.verified);
  }

  async getTokensByRiskLevel(riskLevel: string): Promise<TokenMetadata[]> {
    const allMetadata = Array.from(this.metadataCache.values());
    return allMetadata.filter(metadata => metadata.governance.riskLevel === riskLevel);
  }

  // Icon and Asset Management
  async uploadTokenIcon(request: IconUploadRequest): Promise<IconUploadResult> {
    try {
      // Validate icon first
      const validation = await this.validateIcon(request.file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          metadata: validation.metadata
        };
      }
      
      // Optimize asset if needed
      let optimizedFile = request.file;
      if (this.storageConfig.optimization.autoResize) {
        optimizedFile = await this.optimizeAsset(request.file);
      }
      
      // Generate file hash
      const fileHash = await this.generateFileHash(optimizedFile);
      
      // Upload to storage
      const uploadResults = await Promise.allSettled([
        this.uploadToIPFS(optimizedFile, fileHash),
        this.uploadToCDN(optimizedFile, fileHash),
        this.uploadToLocalStorage(optimizedFile, fileHash)
      ]);
      
      // Determine primary URL
      let iconUrl = '';
      let ipfsHash = '';
      let cdnUrl = '';
      
      // Check IPFS upload
      if (uploadResults[0].status === 'fulfilled') {
        ipfsHash = uploadResults[0].value;
        iconUrl = `${this.storageConfig.ipfs.gateway}/ipfs/${ipfsHash}`;
      }
      
      // Check CDN upload
      if (uploadResults[1].status === 'fulfilled') {
        cdnUrl = uploadResults[1].value;
        iconUrl = cdnUrl; // Prefer CDN over IPFS
      }
      
      // Check local storage upload
      if (uploadResults[2].status === 'fulfilled' && !iconUrl) {
        iconUrl = uploadResults[2].value;
      }
      
      if (!iconUrl) {
        return {
          success: false,
          error: 'Failed to upload to any storage provider',
          metadata: validation.metadata
        };
      }
      
      // Update token metadata
      const metadata = await this.getTokenMetadata(request.tokenId);
      if (metadata) {
        const assetKey = request.iconType.toLowerCase() + 'Url';
        const hashKey = request.iconType.toLowerCase() + 'Hash';
        
        await this.updateTokenMetadata(request.tokenId, {
          assets: {
            ...metadata.assets,
            [assetKey]: iconUrl,
            [hashKey]: fileHash
          }
        }, request.uploadedBy);
      }
      
      // Cache the icon URL
      const cacheKey = `${request.tokenId}_${request.iconType}`;
      this.iconCache.set(cacheKey, iconUrl);
      
      console.log(`[TokenMetadataService] Icon uploaded for token: ${request.tokenId}`);
      
      return {
        success: true,
        iconUrl,
        iconHash: fileHash,
        cdnUrl,
        ipfsHash,
        metadata: validation.metadata
      };
    } catch (error) {
      console.error('[TokenMetadataService] Error uploading token icon:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
        metadata: {
          fileSize: request.file.size,
          dimensions: { width: 0, height: 0 },
          format: request.file.type,
          uploadedAt: new Date().toISOString()
        }
      };
    }
  }

  async getTokenIcon(tokenId: string, iconType = 'ICON'): Promise<string | null> {
    try {
      const cacheKey = `${tokenId}_${iconType}`;
      
      // Check cache first
      if (this.iconCache.has(cacheKey)) {
        return this.iconCache.get(cacheKey)!;
      }
      
      // Get from metadata
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return null;
      }
      
      const assetKey = iconType.toLowerCase() + 'Url';
      const iconUrl = (metadata.assets as any)[assetKey];
      
      if (iconUrl) {
        this.iconCache.set(cacheKey, iconUrl);
      }
      
      return iconUrl || null;
    } catch (error) {
      console.error('[TokenMetadataService] Error getting token icon:', error);
      return null;
    }
  }

  async validateIcon(file: File): Promise<IconValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        errors.push('File size exceeds 5MB limit');
      }
      
      // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        errors.push('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      }
      
      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);
      
      // Check dimensions
      if (dimensions.width < 32 || dimensions.height < 32) {
        errors.push('Image too small. Minimum size: 32x32 pixels');
      }
      
      if (dimensions.width > 1024 || dimensions.height > 1024) {
        warnings.push('Image very large. Consider resizing for better performance');
      }
      
      // Check aspect ratio
      const aspectRatio = dimensions.width / dimensions.height;
      if (Math.abs(aspectRatio - 1) > 0.1) {
        warnings.push('Image is not square. Icons work best with 1:1 aspect ratio');
        recommendations.push('Consider cropping to square format');
      }
      
      // Recommend optimal size
      if (dimensions.width !== 256 || dimensions.height !== 256) {
        recommendations.push('Optimal icon size is 256x256 pixels');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        metadata: {
          fileSize: file.size,
          dimensions,
          format: file.type,
          aspectRatio
        }
      };
    } catch (error) {
      console.error('[TokenMetadataService] Error validating icon:', error);
      return {
        valid: false,
        errors: ['Failed to validate icon'],
        warnings: [],
        recommendations: [],
        metadata: {
          fileSize: file.size,
          dimensions: { width: 0, height: 0 },
          format: file.type,
          aspectRatio: 1
        }
      };
    }
  }

  async deleteTokenIcon(tokenId: string, iconType: string, deletedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      const assetKey = iconType.toLowerCase() + 'Url';
      const hashKey = iconType.toLowerCase() + 'Hash';
      
      await this.updateTokenMetadata(tokenId, {
        assets: {
          ...metadata.assets,
          [assetKey]: undefined,
          [hashKey]: undefined
        }
      }, deletedBy);
      
      // Remove from cache
      const cacheKey = `${tokenId}_${iconType}`;
      this.iconCache.delete(cacheKey);
      
      console.log(`[TokenMetadataService] Icon deleted for token: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error deleting token icon:', error);
      return false;
    }
  }

  // Asset Optimization
  async optimizeAsset(file: File, options?: AssetOptimizationOptions): Promise<File> {
    // Mock implementation - in production, this would use image processing libraries
    console.log(`[TokenMetadataService] Optimizing asset: ${file.name}`);
    return file;
  }

  async generateThumbnail(file: File, size: { width: number; height: number }): Promise<File> {
    // Mock implementation
    console.log(`[TokenMetadataService] Generating thumbnail: ${size.width}x${size.height}`);
    return file;
  }

  async convertFormat(file: File, targetFormat: string): Promise<File> {
    // Mock implementation
    console.log(`[TokenMetadataService] Converting format to: ${targetFormat}`);
    return file;
  }

  // Verification and Compliance
  async verifyTokenMetadata(tokenId: string, verifiedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      await this.updateTokenMetadata(tokenId, {
        governance: {
          ...metadata.governance,
          verified: true,
          verifiedBy,
          verifiedAt: new Date().toISOString()
        }
      }, verifiedBy);
      
      console.log(`[TokenMetadataService] Token metadata verified: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error verifying token metadata:', error);
      return false;
    }
  }

  async unverifyTokenMetadata(tokenId: string, unverifiedBy: string, reason: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      await this.updateTokenMetadata(tokenId, {
        governance: {
          ...metadata.governance,
          verified: false,
          verifiedBy: undefined,
          verifiedAt: undefined
        }
      }, unverifiedBy);
      
      console.log(`[TokenMetadataService] Token metadata unverified: ${tokenId} - ${reason}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error unverifying token metadata:', error);
      return false;
    }
  }

  async addAuditReport(tokenId: string, report: AuditReport, addedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      const updatedReports = [...(metadata.governance.auditReports || []), report];
      
      await this.updateTokenMetadata(tokenId, {
        governance: {
          ...metadata.governance,
          auditReports: updatedReports
        }
      }, addedBy);
      
      console.log(`[TokenMetadataService] Audit report added for token: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error adding audit report:', error);
      return false;
    }
  }

  // Social and Community Data
  async updateSocialLinks(
    tokenId: string,
    social: Partial<TokenMetadata['social']>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      await this.updateTokenMetadata(tokenId, {
        social: {
          ...metadata.social,
          ...social
        }
      }, updatedBy);
      
      console.log(`[TokenMetadataService] Social links updated for token: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error updating social links:', error);
      return false;
    }
  }

  async addPartnership(tokenId: string, partnership: Partnership, addedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      const updatedPartnerships = [...(metadata.adoption.partnerships || []), partnership];
      
      await this.updateTokenMetadata(tokenId, {
        adoption: {
          ...metadata.adoption,
          partnerships: updatedPartnerships
        }
      }, addedBy);
      
      console.log(`[TokenMetadataService] Partnership added for token: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error adding partnership:', error);
      return false;
    }
  }

  async addExchangeListing(tokenId: string, listing: ExchangeListing, addedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      const updatedListings = [...(metadata.adoption.exchangeListings || []), listing];
      
      await this.updateTokenMetadata(tokenId, {
        adoption: {
          ...metadata.adoption,
          exchangeListings: updatedListings
        }
      }, addedBy);
      
      console.log(`[TokenMetadataService] Exchange listing added for token: ${tokenId}`);
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error adding exchange listing:', error);
      return false;
    }
  }

  // Market Data Integration
  async updateMarketData(tokenId: string, marketData: Partial<TokenMetadata['market']>): Promise<boolean> {
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      await this.updateTokenMetadata(tokenId, {
        market: {
          ...metadata.market,
          ...marketData,
          lastUpdated: new Date().toISOString()
        }
      }, 'system');
      
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error updating market data:', error);
      return false;
    }
  }

  async refreshMarketData(tokenId: string): Promise<boolean> {
    // Mock implementation - would fetch from external APIs
    const mockMarketData = {
      price: Math.random() * 100,
      volume24h: Math.random() * 1000000,
      priceChange24h: (Math.random() - 0.5) * 20,
      marketCap: Math.random() * 10000000
    };
    
    return this.updateMarketData(tokenId, mockMarketData);
  }

  async getMarketDataHistory(tokenId: string, period: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  // Storage and Caching
  async clearCache(tokenId?: string): Promise<void> {
    if (tokenId) {
      this.metadataCache.delete(tokenId);
      // Clear related icon cache entries
      for (const key of this.iconCache.keys()) {
        if (key.startsWith(tokenId + '_')) {
          this.iconCache.delete(key);
        }
      }
    } else {
      this.metadataCache.clear();
      this.iconCache.clear();
    }
    
    console.log(`[TokenMetadataService] Cache cleared${tokenId ? ` for ${tokenId}` : ''}`);
  }

  async preloadMetadata(tokenIds: string[]): Promise<void> {
    const promises = tokenIds.map(tokenId => this.getTokenMetadata(tokenId));
    await Promise.allSettled(promises);
    console.log(`[TokenMetadataService] Preloaded metadata for ${tokenIds.length} tokens`);
  }

  async getStorageStats(): Promise<StorageStats> {
    const totalTokens = this.metadataCache.size;
    const totalAssets = this.iconCache.size;
    
    // Mock storage calculations
    const totalStorageUsed = totalTokens * 10000 + totalAssets * 50000; // bytes
    
    return {
      totalTokens,
      totalAssets,
      totalStorageUsed,
      ipfsStorageUsed: totalStorageUsed * 0.4,
      cdnStorageUsed: totalStorageUsed * 0.4,
      localStorageUsed: totalStorageUsed * 0.2,
      cacheHitRate: 85, // Mock hit rate
      lastUpdated: new Date().toISOString()
    };
  }

  // Configuration
  async updateStorageConfig(config: Partial<StorageConfig>): Promise<boolean> {
    try {
      this.storageConfig = { ...this.storageConfig, ...config };
      await this.saveStorageConfig();
      
      console.log('[TokenMetadataService] Storage configuration updated');
      return true;
    } catch (error) {
      console.error('[TokenMetadataService] Error updating storage config:', error);
      return false;
    }
  }

  getStorageConfig(): StorageConfig {
    return { ...this.storageConfig };
  }

  // Private helper methods
  private applyMetadataFilters(metadata: TokenMetadata[], filters: MetadataSearchFilters): TokenMetadata[] {
    return metadata.filter(token => {
      if (filters.chains && !filters.chains.includes(token.technical.chain)) {
        return false;
      }
      
      if (filters.verified !== undefined && token.governance.verified !== filters.verified) {
        return false;
      }
      
      if (filters.riskLevels && !filters.riskLevels.includes(token.governance.riskLevel)) {
        return false;
      }
      
      if (filters.hasIcon !== undefined) {
        const hasIcon = !!(token.assets.iconUrl || token.assets.logoUrl);
        if (hasIcon !== filters.hasIcon) {
          return false;
        }
      }
      
      if (filters.hasAudit !== undefined) {
        const hasAudit = !!(token.governance.auditReports && token.governance.auditReports.length > 0);
        if (hasAudit !== filters.hasAudit) {
          return false;
        }
      }
      
      if (filters.minMarketCap && (token.market.marketCap || 0) < filters.minMarketCap) {
        return false;
      }
      
      if (filters.maxMarketCap && (token.market.marketCap || 0) > filters.maxMarketCap) {
        return false;
      }
      
      return true;
    });
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateFileHash(file: File): Promise<string> {
    // Simple hash implementation - in production, use crypto.subtle
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let hash = 0;
    
    for (let i = 0; i < uint8Array.length; i++) {
      hash = ((hash << 5) - hash + uint8Array[i]) & 0xffffffff;
    }
    
    return Math.abs(hash).toString(16);
  }

  private async uploadToIPFS(file: File, hash: string): Promise<string> {
    // Mock IPFS upload
    console.log(`[TokenMetadataService] Uploading to IPFS: ${file.name}`);
    return `Qm${hash}${Math.random().toString(36).substr(2, 20)}`;
  }

  private async uploadToCDN(file: File, hash: string): Promise<string> {
    // Mock CDN upload
    console.log(`[TokenMetadataService] Uploading to CDN: ${file.name}`);
    return `${this.storageConfig.cdn.baseUrl}/${hash}.${file.type.split('/')[1]}`;
  }

  private async uploadToLocalStorage(file: File, hash: string): Promise<string> {
    // Mock local storage
    console.log(`[TokenMetadataService] Storing locally: ${file.name}`);
    return `data:${file.type};base64,${hash}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private generateId(): string {
    return `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadMetadataCache(): Promise<void> {
    try {
      const stored = localStorage.getItem('token_metadata_cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.metadataCache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('[TokenMetadataService] Error loading metadata cache:', error);
    }
  }

  private async loadMetadataFromStorage(tokenId: string): Promise<TokenMetadata | null> {
    try {
      const stored = localStorage.getItem(`token_metadata_${tokenId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[TokenMetadataService] Error loading metadata from storage:', error);
      return null;
    }
  }

  private async saveMetadataToStorage(tokenId: string, metadata: TokenMetadata): Promise<void> {
    try {
      localStorage.setItem(`token_metadata_${tokenId}`, JSON.stringify(metadata));
      
      // Also update cache storage
      const cacheData = Object.fromEntries(this.metadataCache);
      localStorage.setItem('token_metadata_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('[TokenMetadataService] Error saving metadata to storage:', error);
    }
  }

  private async deleteMetadataFromStorage(tokenId: string): Promise<void> {
    try {
      localStorage.removeItem(`token_metadata_${tokenId}`);
    } catch (error) {
      console.error('[TokenMetadataService] Error deleting metadata from storage:', error);
    }
  }

  private async saveStorageConfig(): Promise<void> {
    try {
      localStorage.setItem('token_metadata_storage_config', JSON.stringify(this.storageConfig));
    } catch (error) {
      console.error('[TokenMetadataService] Error saving storage config:', error);
    }
  }
}

// Export singleton instance
export const tokenMetadataService = new TokenMetadataService();