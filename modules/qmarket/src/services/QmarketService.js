/**
 * Qmarket Service - Standalone Implementation
 * 
 * Core marketplace service with full ecosystem integration.
 * Supports both standalone (mock) and integrated modes.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

// Mock services for standalone mode
import { 
  MockSquidService,
  MockQwalletService,
  MockQlockService,
  MockQonsentService,
  MockQindexService,
  MockQerberosService,
  MockQmaskService,
  MockQnetService
} from '../mocks/index.js';

export class QmarketService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      sandboxMode: options.sandboxMode || false,
      maxListingPrice: options.maxListingPrice || 1000000,
      defaultCurrency: options.defaultCurrency || 'QToken',
      listingExpirationDays: options.listingExpirationDays || 365,
      enableNFTMinting: options.enableNFTMinting !== false,
      defaultRoyaltyPercentage: options.defaultRoyaltyPercentage || 5,
      ...options
    };

    // Initialize storage
    this.listings = new Map();
    this.purchases = new Map();
    this.categories = new Map();
    this.stats = {
      totalListings: 0,
      totalPurchases: 0,
      totalRevenue: 0,
      activeUsers: new Set()
    };

    // Initialize services
    this.initializeServices();
    this.initializeCategories();

    console.log(`[QmarketService] Initialized in ${this.options.sandboxMode ? 'sandbox' : 'production'} mode`);
  }

  /**
   * Initialize ecosystem services (mock or real)
   */
  initializeServices() {
    const useMocks = this.options.sandboxMode || 
                    process.env.SQUID_SERVICE_URL === 'mock';

    if (useMocks) {
      console.log('[QmarketService] Using mock services for standalone mode');
      this.squidService = new MockSquidService();
      this.qwalletService = new MockQwalletService();
      this.qlockService = new MockQlockService();
      this.qonsentService = new MockQonsentService();
      this.qindexService = new MockQindexService();
      this.qerberosService = new MockQerberosService();
      this.qmaskService = new MockQmaskService();
      this.qnetService = new MockQnetService();
    } else {
      // In production, these would be actual service clients
      console.log('[QmarketService] Using real ecosystem services');
      // TODO: Initialize real service clients
      throw new Error('Real service integration not yet implemented');
    }
  }

  /**
   * Initialize marketplace categories
   */
  initializeCategories() {
    const defaultCategories = [
      { 
        id: 'digital-art', 
        name: 'Digital Art', 
        description: 'NFT artwork and digital creations',
        icon: '🎨',
        defaultPinningPolicy: 'permanent'
      },
      { 
        id: 'media', 
        name: 'Media', 
        description: 'Videos, music, and multimedia content',
        icon: '🎬',
        defaultPinningPolicy: 'conditional'
      },
      { 
        id: 'documents', 
        name: 'Documents', 
        description: 'PDFs, texts, and written content',
        icon: '📄',
        defaultPinningPolicy: 'temporary'
      },
      { 
        id: 'software', 
        name: 'Software', 
        description: 'Applications and digital tools',
        icon: '💻',
        defaultPinningPolicy: 'permanent'
      },
      { 
        id: 'data', 
        name: 'Data', 
        description: 'Datasets and information resources',
        icon: '📊',
        defaultPinningPolicy: 'conditional'
      },
      { 
        id: 'services', 
        name: 'Services', 
        description: 'Digital services and consultations',
        icon: '🛠️',
        defaultPinningPolicy: 'metadata_only'
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  /**
   * Create marketplace listing with full ecosystem integration
   */
  async createListing(listingData) {
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();
    
    try {
      console.log(`[QmarketService] Creating listing with correlation ID: ${correlationId}`);

      // Validate input
      this.validateListingData(listingData);

      const {
        squidId,
        title,
        description,
        price,
        currency = this.options.defaultCurrency,
        category = 'media',
        tags = [],
        fileCid,
        fileMetadata = {},
        visibility = 'public',
        daoId = null,
        mintNFT = this.options.enableNFTMinting,
        enableResale = true,
        royaltyPercentage = this.options.defaultRoyaltyPercentage
      } = listingData;

      // Generate listing ID
      const listingId = this.generateListingId();

      // Step 1: Generate Qonsent privacy profile
      console.log(`[QmarketService] Generating Qonsent privacy profile for ${listingId}`);
      const qonsentProfile = await this.qonsentService.generateProfile({
        squidId,
        visibility,
        dataType: this.classifyDataType(category, fileMetadata.contentType),
        daoId,
        customRules: {
          canPurchase: visibility === 'public' ? ['*'] : [`dao:${daoId}:members`],
          canView: visibility === 'public' ? ['*'] : [`dao:${daoId}:members`],
          restrictions: visibility === 'private' ? ['owner_only'] : []
        }
      });

      // Step 2: Encrypt sensitive data with Qlock
      console.log(`[QmarketService] Encrypting sensitive data with Qlock`);
      const sensitiveData = {
        sellerContact: listingData.sellerContact || '',
        privateNotes: listingData.privateNotes || '',
        internalMetadata: listingData.internalMetadata || {}
      };

      const encryptionResult = await this.qlockService.encryptText(
        JSON.stringify(sensitiveData),
        qonsentProfile.encryptionLevel,
        { squidId, correlationId }
      );

      // Step 3: Sign listing and mint NFT with Qwallet
      console.log(`[QmarketService] Processing payment and NFT with Qwallet`);
      const walletResult = await this.qwalletService.signListing({
        squidId,
        price,
        currency,
        mintNFT,
        listingId,
        contentCid: fileCid,
        metadata: {
          title,
          description,
          category,
          imageUrl: fileMetadata.thumbnailUrl
        },
        correlationId
      });

      // Step 4: Apply privacy masking with Qmask
      console.log(`[QmarketService] Applying privacy masking with Qmask`);
      const maskingResult = await this.qmaskService.applyProfile({
        data: {
          title,
          description,
          fileMetadata
        },
        profileType: this.getPrivacyProfileType(visibility, category),
        squidId,
        correlationId
      });

      // Step 5: Create comprehensive listing object
      const listing = {
        id: listingId,
        squidId,
        title: maskingResult.maskedData.title || title,
        description: maskingResult.maskedData.description || description,
        price,
        currency,
        category,
        tags,
        
        // File and content data
        fileCid,
        fileMetadata: maskingResult.maskedData.fileMetadata || fileMetadata,
        
        // Ecosystem integration
        qonsent: {
          profileId: qonsentProfile.profileId,
          visibility: qonsentProfile.visibility,
          encryptionLevel: qonsentProfile.encryptionLevel,
          accessRules: qonsentProfile.accessRules
        },
        qlock: {
          encrypted: true,
          encryptionLevel: encryptionResult.encryptionMetadata.level,
          encryptedData: encryptionResult.encryptedText,
          encryptionMetadata: encryptionResult.encryptionMetadata
        },
        qwallet: {
          transactionId: walletResult.transactionId,
          signature: walletResult.signature,
          walletAddress: walletResult.walletAddress,
          nft: walletResult.nft,
          gasEstimate: walletResult.gasEstimate
        },
        qmask: {
          profileApplied: maskingResult.profileApplied,
          maskedFields: maskingResult.maskedFields,
          privacyLevel: maskingResult.privacyLevel
        },
        
        // Marketplace specific data
        status: 'active',
        visibility,
        daoId,
        enableResale,
        royaltyPercentage,
        viewCount: 0,
        favoriteCount: 0,
        purchaseCount: 0,
        
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: this.calculateListingExpiration(visibility),
        
        // Metadata
        correlationId
      };

      // Step 6: Register in Qindex for searchability
      console.log(`[QmarketService] Registering in Qindex for searchability`);
      const indexResult = await this.qindexService.registerFile({
        cid: fileCid,
        squidId,
        visibility,
        contentType: 'marketplace-listing',
        timestamp: listing.createdAt,
        qonsentProfile,
        storjUrl: `marketplace://listing/${listingId}`,
        fileSize: fileMetadata.fileSize || 0,
        originalName: title,
        encryptionMetadata: encryptionResult.encryptionMetadata,
        metadata: {
          listingId,
          title: listing.title,
          description: listing.description,
          price,
          currency,
          category,
          tags,
          nftId: walletResult.nft?.tokenId
        },
        correlationId
      });

      // Step 7: Setup QNET routing for optimized access
      console.log(`[QmarketService] Setting up QNET routing`);
      const routingResult = await this.qnetService.routeFile({
        cid: fileCid,
        storjUrl: `marketplace://listing/${listingId}`,
        accessLevel: visibility,
        squidId,
        daoId,
        requestorId: squidId,
        qualityOfService: 'premium',
        correlationId
      });

      // Add ecosystem integration results to listing
      listing.qindex = {
        indexId: indexResult.indexId,
        searchable: indexResult.searchable
      };
      
      listing.qnet = {
        routingId: routingResult.routingId,
        routedUrl: routingResult.routedUrl,
        accessToken: routingResult.accessToken,
        gateway: routingResult.gateway
      };

      // Step 8: Store listing
      this.listings.set(listingId, listing);
      this.stats.totalListings++;
      this.stats.activeUsers.add(squidId);

      // Step 9: Log audit event
      await this.qerberosService.logEvent({
        action: 'listing_created',
        squidId,
        resourceId: listingId,
        metadata: {
          title: listing.title,
          price,
          currency,
          category,
          fileCid,
          nftId: walletResult.nft?.tokenId,
          indexId: indexResult.indexId,
          routingId: routingResult.routingId,
          processingTime: Date.now() - startTime
        },
        correlationId
      });

      // Step 10: Emit event
      this.emit('listing.created', {
        listingId,
        squidId,
        title: listing.title,
        price,
        currency,
        category,
        correlationId
      });

      // Compile response
      const response = {
        success: true,
        listing: this.formatListingForResponse(listing),
        processingTime: Date.now() - startTime,
        correlationId
      };

      console.log(`[QmarketService] Listing created successfully: ${listingId} (${response.processingTime}ms)`);
      return response;

    } catch (error) {
      console.error(`[QmarketService] Listing creation failed:`, error);
      
      // Log error event
      try {
        await this.qerberosService.logEvent({
          action: 'listing_creation_error',
          squidId: listingData.squidId || 'unknown',
          resourceId: listingData.title || 'unknown',
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          },
          correlationId
        });
      } catch (logError) {
        console.error('[QmarketService] Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        code: error.code || 'LISTING_CREATION_ERROR',
        processingTime: Date.now() - startTime,
        correlationId
      };
    }
  }

  /**
   * Get listing by ID
   */
  async getListing(listingId, requestorId = null) {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found',
          code: 'LISTING_NOT_FOUND'
        };
      }

      // Check access permissions
      if (listing.visibility !== 'public' && requestorId !== listing.squidId) {
        const hasAccess = await this.qonsentService.checkAccess({
          squidId: requestorId,
          resourceId: listingId,
          permission: 'read'
        });

        if (!hasAccess.granted) {
          return {
            success: false,
            error: 'Access denied',
            code: 'ACCESS_DENIED'
          };
        }
      }

      // Increment view count
      listing.viewCount++;
      listing.lastViewedAt = new Date().toISOString();

      // Log analytics event
      this.emit('listing.viewed', {
        listingId,
        viewerId: requestorId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        listing: this.formatListingForResponse(listing)
      };

    } catch (error) {
      console.error('[QmarketService] Get listing error:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'GET_LISTING_ERROR'
      };
    }
  }

  /**
   * Search listings with filters
   */
  async searchListings(searchParams) {
    try {
      const {
        query,
        category,
        minPrice,
        maxPrice,
        currency,
        tags,
        squidId,
        status = 'active',
        visibility = 'public',
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = searchParams;

      let results = Array.from(this.listings.values());

      // Apply filters
      if (status) {
        results = results.filter(listing => listing.status === status);
      }

      if (visibility) {
        results = results.filter(listing => 
          listing.visibility === visibility || listing.visibility === 'public'
        );
      }

      if (category) {
        results = results.filter(listing => listing.category === category);
      }

      if (currency) {
        results = results.filter(listing => listing.currency === currency);
      }

      if (minPrice !== undefined) {
        results = results.filter(listing => listing.price >= minPrice);
      }

      if (maxPrice !== undefined) {
        results = results.filter(listing => listing.price <= maxPrice);
      }

      if (squidId) {
        results = results.filter(listing => listing.squidId === squidId);
      }

      if (query) {
        const queryLower = query.toLowerCase();
        results = results.filter(listing => 
          listing.title.toLowerCase().includes(queryLower) ||
          listing.description.toLowerCase().includes(queryLower) ||
          listing.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }

      if (tags && tags.length > 0) {
        results = results.filter(listing => 
          tags.some(tag => listing.tags.includes(tag))
        );
      }

      // Sort results
      results.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        success: true,
        listings: paginatedResults.map(listing => this.formatListingForResponse(listing)),
        pagination: {
          total: results.length,
          limit,
          offset,
          hasMore: results.length > offset + limit
        }
      };

    } catch (error) {
      console.error('[QmarketService] Search listings error:', error);
      return {
        success: false,
        error: error.message,
        code: 'SEARCH_ERROR',
        listings: [],
        pagination: { total: 0, limit, offset, hasMore: false }
      };
    }
  }

  /**
   * Purchase a marketplace listing
   */
  async purchaseListing(purchaseData) {
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();

    try {
      const {
        squidId, // buyer
        listingId,
        paymentMethod = this.options.defaultCurrency
      } = purchaseData;

      console.log(`[QmarketService] Processing purchase ${listingId} by ${squidId}`);

      // Get listing
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found',
          code: 'LISTING_NOT_FOUND'
        };
      }

      if (listing.status !== 'active') {
        return { 
          success: false, 
          error: 'Listing is not available for purchase',
          code: 'LISTING_UNAVAILABLE'
        };
      }

      if (listing.squidId === squidId) {
        return { 
          success: false, 
          error: 'Cannot purchase your own listing',
          code: 'SELF_PURCHASE_DENIED'
        };
      }

      // Check access permissions
      const hasAccess = await this.qonsentService.checkPermission({
        squidId,
        permission: 'purchase',
        resourceType: 'listing',
        resourceId: listingId
      });

      if (!hasAccess.granted) {
        return {
          success: false,
          error: 'Purchase access denied',
          code: 'PURCHASE_ACCESS_DENIED'
        };
      }

      // Process payment through Qwallet
      const paymentResult = await this.qwalletService.processPayment({
        squidId,
        sellerId: listing.squidId,
        amount: listing.price,
        currency: listing.currency,
        purpose: 'marketplace_purchase',
        metadata: {
          listingId,
          title: listing.title,
          category: listing.category
        },
        correlationId
      });

      if (!paymentResult.success) {
        return {
          success: false,
          error: 'Payment processing failed',
          code: 'PAYMENT_FAILED',
          paymentError: paymentResult.error
        };
      }

      // Create purchase record
      const purchaseId = this.generatePurchaseId();
      const purchase = {
        purchaseId,
        listingId,
        buyerId: squidId,
        sellerId: listing.squidId,
        price: listing.price,
        currency: listing.currency,
        paymentResult,
        status: 'completed',
        purchasedAt: new Date().toISOString(),
        accessGranted: true,
        correlationId
      };

      this.purchases.set(purchaseId, purchase);

      // Update listing stats
      listing.purchaseCount++;
      listing.lastPurchasedAt = new Date().toISOString();
      listing.updatedAt = new Date().toISOString();

      // Update global stats
      this.stats.totalPurchases++;
      this.stats.totalRevenue += listing.price;
      this.stats.activeUsers.add(squidId);

      // Grant access through Qonsent
      await this.qonsentService.grantAccess({
        resourceId: listingId,
        granteeId: squidId,
        permissions: ['read', 'download'],
        expiresAt: null // Permanent access for purchases
      });

      // Log audit event
      await this.qerberosService.logEvent({
        action: 'marketplace_purchase',
        squidId,
        resourceId: listingId,
        metadata: {
          purchaseId,
          sellerId: listing.squidId,
          price: listing.price,
          currency: listing.currency,
          paymentIntentId: paymentResult.intentId,
          processingTime: Date.now() - startTime
        },
        correlationId
      });

      // Emit event
      this.emit('listing.purchased', {
        purchaseId,
        listingId,
        buyerId: squidId,
        sellerId: listing.squidId,
        price: listing.price,
        currency: listing.currency,
        correlationId
      });

      return {
        success: true,
        purchaseId,
        listingId,
        price: listing.price,
        currency: listing.currency,
        accessUrl: listing.qnet?.routedUrl,
        paymentResult,
        purchasedAt: purchase.purchasedAt,
        processingTime: Date.now() - startTime,
        correlationId
      };

    } catch (error) {
      console.error('[QmarketService] Purchase processing error:', error);
      
      // Log error
      try {
        await this.qerberosService.logEvent({
          action: 'purchase_error',
          squidId: purchaseData.squidId || 'unknown',
          resourceId: purchaseData.listingId || 'unknown',
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          },
          correlationId
        });
      } catch (logError) {
        console.error('[QmarketService] Failed to log purchase error:', logError);
      }

      return { 
        success: false, 
        error: error.message,
        code: error.code || 'PURCHASE_ERROR',
        processingTime: Date.now() - startTime,
        correlationId
      };
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      const listings = Array.from(this.listings.values());
      
      const stats = {
        totalListings: this.stats.totalListings,
        activeListings: listings.filter(l => l.status === 'active').length,
        totalPurchases: this.stats.totalPurchases,
        totalRevenue: this.stats.totalRevenue,
        activeUsers: this.stats.activeUsers.size,
        averagePrice: listings.length > 0 
          ? listings.reduce((sum, l) => sum + l.price, 0) / listings.length 
          : 0,
        byCategory: {},
        byCurrency: {},
        topSellers: {},
        recentActivity: listings
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(l => ({
            id: l.id,
            title: l.title,
            price: l.price,
            currency: l.currency,
            category: l.category,
            createdAt: l.createdAt
          }))
      };

      // Calculate category and currency distribution
      listings.forEach(listing => {
        stats.byCategory[listing.category] = (stats.byCategory[listing.category] || 0) + 1;
        stats.byCurrency[listing.currency] = (stats.byCurrency[listing.currency] || 0) + 1;
        stats.topSellers[listing.squidId] = (stats.topSellers[listing.squidId] || 0) + 1;
      });

      return { success: true, stats };

    } catch (error) {
      console.error('[QmarketService] Get marketplace stats error:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'STATS_ERROR'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const listings = Array.from(this.listings.values());
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        marketplace: {
          totalListings: listings.length,
          activeListings: listings.filter(l => l.status === 'active').length,
          categories: this.categories.size,
          totalPurchases: this.stats.totalPurchases
        },
        services: {
          squid: await this.checkServiceHealth(this.squidService),
          qwallet: await this.checkServiceHealth(this.qwalletService),
          qlock: await this.checkServiceHealth(this.qlockService),
          qonsent: await this.checkServiceHealth(this.qonsentService),
          qindex: await this.checkServiceHealth(this.qindexService),
          qerberos: await this.checkServiceHealth(this.qerberosService),
          qmask: await this.checkServiceHealth(this.qmaskService),
          qnet: await this.checkServiceHealth(this.qnetService)
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Helper methods
   */

  validateListingData(data) {
    const required = ['squidId', 'title', 'description', 'fileCid'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    if (data.price === undefined || data.price === null) {
      throw new Error('Required field missing: price');
    }

    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.price > this.options.maxListingPrice) {
      throw new Error(`Price exceeds maximum allowed: ${this.options.maxListingPrice}`);
    }

    if (data.title.length < 3 || data.title.length > 100) {
      throw new Error('Title must be between 3 and 100 characters');
    }

    if (data.description.length < 10 || data.description.length > 1000) {
      throw new Error('Description must be between 10 and 1000 characters');
    }
  }

  generateListingId() {
    return `listing_${crypto.randomBytes(12).toString('hex')}`;
  }

  generatePurchaseId() {
    return `purchase_${crypto.randomBytes(16).toString('hex')}`;
  }

  classifyDataType(category, contentType) {
    if (category === 'digital-art' || contentType?.startsWith('image/')) return 'image';
    if (category === 'media' || contentType?.startsWith('video/')) return 'video';
    if (category === 'media' || contentType?.startsWith('audio/')) return 'audio';
    if (category === 'documents' || contentType?.includes('pdf')) return 'document';
    return 'media';
  }

  getPrivacyProfileType(visibility, category) {
    if (visibility === 'private') return 'maximum';
    if (visibility === 'dao-only') return 'enhanced';
    if (category === 'digital-art') return 'standard';
    return 'minimal';
  }

  calculateListingExpiration(visibility) {
    const now = new Date();
    const expirationDays = {
      'public': this.options.listingExpirationDays,
      'dao-only': Math.floor(this.options.listingExpirationDays * 0.5),
      'private': Math.floor(this.options.listingExpirationDays * 0.25)
    };

    const days = expirationDays[visibility] || this.options.listingExpirationDays;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  formatListingForResponse(listing) {
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      category: listing.category,
      tags: listing.tags,
      status: listing.status,
      visibility: listing.visibility,
      fileCid: listing.fileCid,
      fileMetadata: listing.fileMetadata,
      accessUrl: listing.qnet?.routedUrl,
      nft: listing.qwallet?.nft ? {
        tokenId: listing.qwallet.nft.tokenId,
        contractAddress: listing.qwallet.nft.contractAddress
      } : null,
      ecosystem: {
        qonsent: {
          visibility: listing.qonsent?.visibility,
          encryptionLevel: listing.qonsent?.encryptionLevel
        },
        qindex: {
          searchable: listing.qindex?.searchable
        },
        qnet: {
          gateway: listing.qnet?.gateway?.id
        }
      },
      stats: {
        viewCount: listing.viewCount,
        favoriteCount: listing.favoriteCount,
        purchaseCount: listing.purchaseCount
      },
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      expiresAt: listing.expiresAt
    };
  }

  async checkServiceHealth(service) {
    try {
      if (service && typeof service.healthCheck === 'function') {
        const health = await service.healthCheck();
        return health.status || 'unknown';
      }
      return 'mock';
    } catch (error) {
      return 'error';
    }
  }
}

export default QmarketService;