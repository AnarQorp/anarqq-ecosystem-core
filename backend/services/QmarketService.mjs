/**
 * Qmarket Service - Decentralized Marketplace with Ecosystem Integration
 * 
 * Handles marketplace listing creation with full AnarQ&Q ecosystem integration.
 * Follows Q∞ architecture: Entry → Process → Output
 */

import crypto from 'crypto';
import { 
  getQonsentService, 
  getQlockService, 
  getQindexService, 
  getQerberosService, 
  getQNETService,
  getQwalletService 
} from '../ecosystem/index.mjs';
import { QwalletIntegrationService } from './QwalletIntegrationService.mjs';

export class QmarketService {
  constructor(options = {}) {
    this.listings = new Map();
    this.categories = new Map();
    this.purchases = new Map();
    this.qwalletIntegration = options.qwalletIntegration || new QwalletIntegrationService({
      sandboxMode: options.sandboxMode || false
    });
    this.initializeCategories();
  }

  /**
   * Initialize marketplace categories
   */
  initializeCategories() {
    const defaultCategories = [
      { id: 'digital-art', name: 'Digital Art', description: 'NFT artwork and digital creations' },
      { id: 'media', name: 'Media', description: 'Videos, music, and multimedia content' },
      { id: 'documents', name: 'Documents', description: 'PDFs, texts, and written content' },
      { id: 'software', name: 'Software', description: 'Applications and digital tools' },
      { id: 'data', name: 'Data', description: 'Datasets and information resources' },
      { id: 'services', name: 'Services', description: 'Digital services and consultations' }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  /**
   * Create marketplace listing with full ecosystem integration
   * Follows Q∞ architecture: Entry → Process → Output
   */
  async createListing(listingData) {
    const startTime = Date.now();
    
    try {
      // ===== ENTRY PHASE =====
      const {
        squidId,
        title,
        description,
        price,
        currency = 'QToken',
        category,
        tags = [],
        fileCid,
        fileMetadata = {},
        visibility = 'public',
        daoId = null,
        mintNFT = true,
        enableResale = true,
        royaltyPercentage = 5
      } = listingData;

      // Validate required fields
      this.validateListingData(listingData);

      // Generate listing ID
      const listingId = this.generateListingId();

      console.log(`[Q∞ Entry] Starting listing creation: ${listingId} by ${squidId}`);

      // Log listing creation start
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'listing_creation_start',
        squidId,
        resourceId: listingId,
        metadata: {
          title,
          price,
          currency,
          category,
          fileCid
        }
      });

      // ===== PROCESS PHASE =====
      
      // 1. Generate Qonsent Privacy Profile
      console.log(`[Q∞ Process] Generating Qonsent privacy profile...`);
      const qonsentService = getQonsentService();
      const qonsentProfile = await qonsentService.generateProfile({
        squidId,
        visibility,
        dataType: this.classifyListingDataType(category, fileMetadata.contentType),
        daoId,
        customRules: {
          canPurchase: visibility === 'public' ? ['*'] : [`dao:${daoId}:members`],
          canView: visibility === 'public' ? ['*'] : [`dao:${daoId}:members`],
          restrictions: visibility === 'private' ? ['owner_only'] : []
        }
      });

      // 2. Encrypt sensitive listing data with Qlock
      console.log(`[Q∞ Process] Encrypting listing data with Qlock...`);
      const qlockService = getQlockService();
      
      // Encrypt sensitive metadata
      const sensitiveData = {
        sellerContact: listingData.sellerContact || '',
        privateNotes: listingData.privateNotes || '',
        internalMetadata: listingData.internalMetadata || {}
      };
      
      const encryptionResult = await qlockService.encryptText(
        JSON.stringify(sensitiveData),
        qonsentProfile.encryptionLevel,
        { squidId }
      );

      // 3. Sign listing and mint NFT with Qwallet
      console.log(`[Q∞ Process] Signing listing with Qwallet...`);
      const qwalletService = getQwalletService();
      const walletResult = await qwalletService.signListing({
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
        }
      });

      // 4. Create comprehensive listing object
      const listing = {
        id: listingId,
        squidId,
        title,
        description,
        price,
        currency,
        category,
        tags,
        
        // File and content data
        fileCid,
        fileMetadata,
        
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
        
        // Marketplace specific data
        status: 'active',
        enableResale,
        royaltyPercentage,
        viewCount: 0,
        favoriteCount: 0,
        purchaseCount: 0,
        
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: this.calculateListingExpiration(visibility)
      };

      // ===== OUTPUT PHASE =====

      // 5. Register in Qindex for searchability
      console.log(`[Q∞ Output] Registering in Qindex...`);
      const qindexService = getQindexService();
      const indexResult = await qindexService.registerFile({
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
          title,
          description,
          price,
          currency,
          category,
          tags,
          nftId: walletResult.nft?.tokenId
        }
      });

      // 6. Setup QNET routing for optimized access
      console.log(`[Q∞ Output] Setting up QNET routing...`);
      const qnetService = getQNETService();
      const routingResult = await qnetService.routeFile({
        cid: fileCid,
        storjUrl: `marketplace://listing/${listingId}`,
        accessLevel: visibility,
        squidId,
        daoId,
        requestorId: squidId,
        qualityOfService: 'premium' // Marketplace listings get premium routing
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

      // 7. Store listing
      this.listings.set(listingId, listing);

      // 8. Log successful creation
      await qerberosService.logEvent({
        action: 'listing_creation_success',
        squidId,
        resourceId: listingId,
        metadata: {
          title,
          price,
          currency,
          category,
          fileCid,
          nftId: walletResult.nft?.tokenId,
          indexId: indexResult.indexId,
          routingId: routingResult.routingId,
          processingTime: Date.now() - startTime
        }
      });

      // Compile final response
      const response = {
        success: true,
        listing: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          currency: listing.currency,
          category: listing.category,
          tags: listing.tags,
          status: listing.status,
          createdAt: listing.createdAt,
          
          // File and content access
          fileCid: listing.fileCid,
          fileMetadata: listing.fileMetadata,
          accessUrl: routingResult.routedUrl,
          
          // NFT information
          nft: walletResult.nft ? {
            tokenId: walletResult.nft.tokenId,
            contractAddress: walletResult.nft.contractAddress,
            metadata: walletResult.nft.metadata,
            mintedAt: walletResult.nft.mintedAt
          } : null,
          
          // Ecosystem integration summary
          ecosystem: {
            qonsent: {
              profileId: listing.qonsent.profileId,
              visibility: listing.qonsent.visibility,
              encryptionLevel: listing.qonsent.encryptionLevel
            },
            qlock: {
              encrypted: listing.qlock.encrypted,
              encryptionLevel: listing.qlock.encryptionLevel
            },
            qindex: {
              indexId: listing.qindex.indexId,
              searchable: listing.qindex.searchable
            },
            qnet: {
              routingId: listing.qnet.routingId,
              gateway: listing.qnet.gateway.id
            },
            qwallet: {
              transactionId: listing.qwallet.transactionId,
              walletAddress: listing.qwallet.walletAddress
            }
          }
        },
        
        processingTime: Date.now() - startTime
      };

      console.log(`[Q∞ Complete] Listing created successfully: ${listingId} (${response.processingTime}ms)`);
      return response;

    } catch (error) {
      console.error('[Q∞ Error] Listing creation failed:', error);
      
      // Log error event
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'listing_creation_error',
          squidId: listingData.squidId || 'unknown',
          resourceId: listingData.title || 'unknown',
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          }
        });
      } catch (logError) {
        console.error('Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get listing by ID
   */
  async getListing(listingId) {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Increment view count
      listing.viewCount++;
      listing.lastViewedAt = new Date().toISOString();

      return {
        success: true,
        listing: this.formatListingForResponse(listing)
      };

    } catch (error) {
      console.error('Get listing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search listings
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
      console.error('Search listings error:', error);
      return {
        success: false,
        error: error.message,
        listings: [],
        pagination: { total: 0, limit, offset, hasMore: false }
      };
    }
  }

  /**
   * Update listing
   */
  async updateListing(listingId, updates, squidId) {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Verify ownership
      if (listing.squidId !== squidId) {
        return { success: false, error: 'Unauthorized: Only listing owner can update' };
      }

      // Apply updates
      const allowedUpdates = ['title', 'description', 'price', 'tags', 'status'];
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          listing[field] = updates[field];
        }
      });

      listing.updatedAt = new Date().toISOString();

      // Log update event
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'listing_updated',
        squidId,
        resourceId: listingId,
        metadata: { updates }
      });

      return {
        success: true,
        listing: this.formatListingForResponse(listing)
      };

    } catch (error) {
      console.error('Update listing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete listing
   */
  async deleteListing(listingId, squidId) {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Verify ownership
      if (listing.squidId !== squidId) {
        return { success: false, error: 'Unauthorized: Only listing owner can delete' };
      }

      // Remove from listings
      this.listings.delete(listingId);

      // Log deletion event
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'listing_deleted',
        squidId,
        resourceId: listingId,
        metadata: { title: listing.title }
      });

      return { success: true, message: 'Listing deleted successfully' };

    } catch (error) {
      console.error('Delete listing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process marketplace purchase with payment integration
   */
  async processPurchase(purchaseData) {
    try {
      const {
        squidId, // buyer
        listingId,
        paymentMethod = 'QToken'
      } = purchaseData;

      // Get listing
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      if (listing.status !== 'active') {
        return { success: false, error: 'Listing is not available for purchase' };
      }

      if (listing.squidId === squidId) {
        return { success: false, error: 'Cannot purchase your own listing' };
      }

      // Check if it's a resale
      const isResale = listing.purchaseCount > 0;
      const originalCreatorId = listing.originalCreator || listing.squidId;

      // Process payment through Qwallet integration
      const paymentResult = await this.qwalletIntegration.processQmarketPayment({
        squidId,
        sellerId: listing.squidId,
        listingId,
        salePrice: listing.price,
        currency: listing.currency,
        isResale,
        originalCreatorId: isResale ? originalCreatorId : null,
        nftMinting: false // NFT already minted during listing creation
      });

      if (!paymentResult.success) {
        return {
          success: false,
          error: 'Payment processing failed',
          paymentError: paymentResult.error
        };
      }

      // Create purchase record
      const purchaseId = `purchase_${crypto.randomBytes(16).toString('hex')}`;
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
        accessGranted: true
      };

      this.purchases.set(purchaseId, purchase);

      // Update listing stats
      listing.purchaseCount++;
      listing.lastPurchasedAt = new Date().toISOString();
      listing.updatedAt = new Date().toISOString();

      // Grant access through Qonsent
      const qonsentService = getQonsentService();
      await qonsentService.grantAccess({
        resourceId: listingId,
        granteeId: squidId,
        permissions: ['read', 'download'],
        expiresAt: null // Permanent access for purchases
      });

      // Log purchase event
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'marketplace_purchase',
        squidId,
        resourceId: listingId,
        metadata: {
          purchaseId,
          sellerId: listing.squidId,
          price: listing.price,
          currency: listing.currency,
          paymentIntentId: paymentResult.intentId
        }
      });

      return {
        success: true,
        purchaseId,
        listingId,
        price: listing.price,
        currency: listing.currency,
        accessUrl: listing.qnet?.routedUrl,
        paymentResult,
        purchasedAt: purchase.purchasedAt
      };

    } catch (error) {
      console.error('[QmarketService] Purchase processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get purchase history for a user
   */
  async getPurchaseHistory(squidId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const userPurchases = Array.from(this.purchases.values())
        .filter(purchase => purchase.buyerId === squidId)
        .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
        .slice(offset, offset + limit);

      const purchaseHistory = userPurchases.map(purchase => {
        const listing = this.listings.get(purchase.listingId);
        return {
          purchaseId: purchase.purchaseId,
          listingId: purchase.listingId,
          title: listing?.title || 'Unknown',
          price: purchase.price,
          currency: purchase.currency,
          sellerId: purchase.sellerId,
          status: purchase.status,
          purchasedAt: purchase.purchasedAt,
          accessUrl: listing?.qnet?.routedUrl
        };
      });

      return {
        success: true,
        purchases: purchaseHistory,
        total: userPurchases.length,
        pagination: {
          limit,
          offset,
          hasMore: userPurchases.length === limit
        }
      };

    } catch (error) {
      console.error('[QmarketService] Purchase history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sales history for a seller
   */
  async getSalesHistory(squidId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const userSales = Array.from(this.purchases.values())
        .filter(purchase => purchase.sellerId === squidId)
        .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
        .slice(offset, offset + limit);

      const salesHistory = userSales.map(purchase => {
        const listing = this.listings.get(purchase.listingId);
        return {
          purchaseId: purchase.purchaseId,
          listingId: purchase.listingId,
          title: listing?.title || 'Unknown',
          price: purchase.price,
          currency: purchase.currency,
          buyerId: purchase.buyerId,
          status: purchase.status,
          soldAt: purchase.purchasedAt
        };
      });

      // Calculate revenue summary
      const totalRevenue = userSales.reduce((sum, sale) => sum + sale.price, 0);
      const salesByMonth = {};
      
      userSales.forEach(sale => {
        const month = new Date(sale.purchasedAt).toISOString().substring(0, 7);
        if (!salesByMonth[month]) {
          salesByMonth[month] = { count: 0, revenue: 0 };
        }
        salesByMonth[month].count++;
        salesByMonth[month].revenue += sale.price;
      });

      return {
        success: true,
        sales: salesHistory,
        summary: {
          totalSales: userSales.length,
          totalRevenue,
          salesByMonth
        },
        pagination: {
          limit,
          offset,
          hasMore: userSales.length === limit
        }
      };

    } catch (error) {
      console.error('[QmarketService] Sales history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      const listings = Array.from(this.listings.values());
      
      const stats = {
        totalListings: listings.length,
        activeListings: listings.filter(l => l.status === 'active').length,
        totalValue: listings.reduce((sum, l) => sum + l.price, 0),
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
            createdAt: l.createdAt
          }))
      };

      // Calculate category distribution
      listings.forEach(listing => {
        stats.byCategory[listing.category] = (stats.byCategory[listing.category] || 0) + 1;
        stats.byCurrency[listing.currency] = (stats.byCurrency[listing.currency] || 0) + 1;
        stats.topSellers[listing.squidId] = (stats.topSellers[listing.squidId] || 0) + 1;
      });

      return { success: true, stats };

    } catch (error) {
      console.error('Get marketplace stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate listing data
   */
  validateListingData(data) {
    const required = ['squidId', 'title', 'description', 'price', 'fileCid'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.title.length < 3 || data.title.length > 100) {
      throw new Error('Title must be between 3 and 100 characters');
    }

    if (data.description.length < 10 || data.description.length > 1000) {
      throw new Error('Description must be between 10 and 1000 characters');
    }

    const validCurrencies = ['QToken', 'PI'];
    if (data.currency && !validCurrencies.includes(data.currency)) {
      throw new Error(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`);
    }

    const validVisibilities = ['public', 'dao-only', 'private'];
    if (data.visibility && !validVisibilities.includes(data.visibility)) {
      throw new Error(`Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`);
    }
  }

  /**
   * Classify listing data type for Qonsent
   */
  classifyListingDataType(category, contentType) {
    if (category === 'digital-art' || contentType?.startsWith('image/')) return 'image';
    if (category === 'media' || contentType?.startsWith('video/')) return 'video';
    if (category === 'media' || contentType?.startsWith('audio/')) return 'audio';
    if (category === 'documents' || contentType?.includes('pdf')) return 'document';
    return 'media';
  }

  /**
   * Calculate listing expiration
   */
  calculateListingExpiration(visibility) {
    const now = new Date();
    const expirationDays = {
      'public': 365,    // 1 year
      'dao-only': 180,  // 6 months
      'private': 90     // 3 months
    };

    const days = expirationDays[visibility] || 365;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Generate unique listing ID
   */
  generateListingId() {
    return `listing_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Format listing for API response
   */
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
      updatedAt: listing.updatedAt
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const listings = Array.from(this.listings.values());
    
    return {
      status: 'healthy',
      marketplace: {
        totalListings: listings.length,
        activeListings: listings.filter(l => l.status === 'active').length,
        categories: this.categories.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qmarketServiceInstance = null;

export function getQmarketService() {
  if (!qmarketServiceInstance) {
    qmarketServiceInstance = new QmarketService();
  }
  return qmarketServiceInstance;
}

export default QmarketService;