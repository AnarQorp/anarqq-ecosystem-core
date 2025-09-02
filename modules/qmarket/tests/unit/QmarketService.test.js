/**
 * QmarketService Unit Tests
 * 
 * Tests for the core marketplace service functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QmarketService } from '../../src/services/QmarketService.js';

describe('QmarketService', () => {
  let qmarketService;

  beforeEach(() => {
    qmarketService = new QmarketService({
      sandboxMode: true,
      maxListingPrice: 10000,
      defaultCurrency: 'QToken'
    });
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(qmarketService.options.sandboxMode).toBe(true);
      expect(qmarketService.options.defaultCurrency).toBe('QToken');
      expect(qmarketService.listings).toBeDefined();
      expect(qmarketService.purchases).toBeDefined();
      expect(qmarketService.categories).toBeDefined();
    });

    it('should initialize categories', () => {
      expect(qmarketService.categories.size).toBeGreaterThan(0);
      expect(qmarketService.categories.has('digital-art')).toBe(true);
      expect(qmarketService.categories.has('media')).toBe(true);
    });
  });

  describe('Listing Creation', () => {
    const validListingData = {
      squidId: 'squid_test123',
      title: 'Test Digital Art',
      description: 'A beautiful piece of digital art for testing',
      price: 50.0,
      currency: 'QToken',
      category: 'digital-art',
      tags: ['art', 'digital', 'test'],
      fileCid: 'QmTestCid123456789abcdef',
      fileMetadata: {
        contentType: 'image/png',
        fileSize: 1024000
      },
      visibility: 'public'
    };

    it('should create a listing successfully', async () => {
      const result = await qmarketService.createListing(validListingData);
      
      expect(result.success).toBe(true);
      expect(result.listing).toBeDefined();
      expect(result.listing.id).toMatch(/^listing_[a-f0-9]{24}$/);
      expect(result.listing.title).toBe(validListingData.title);
      expect(result.listing.price).toBe(validListingData.price);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validListingData };
      delete invalidData.title;

      const result = await qmarketService.createListing(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required field missing: title');
    });

    it('should validate price constraints', async () => {
      const invalidData = { ...validListingData, price: 0 };

      const result = await qmarketService.createListing(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Price must be greater than 0');
    });

    it('should validate maximum price', async () => {
      const invalidData = { ...validListingData, price: 20000 };

      const result = await qmarketService.createListing(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Price exceeds maximum allowed');
    });

    it('should validate title length', async () => {
      const invalidData = { ...validListingData, title: 'AB' };

      const result = await qmarketService.createListing(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Title must be between 3 and 100 characters');
    });
  });

  describe('Listing Retrieval', () => {
    let testListingId;

    beforeEach(async () => {
      const listingData = {
        squidId: 'squid_test123',
        title: 'Test Listing',
        description: 'A test listing for retrieval tests',
        price: 25.0,
        fileCid: 'QmTestCid123456789abcdef'
      };

      const result = await qmarketService.createListing(listingData);
      testListingId = result.listing.id;
    });

    it('should retrieve a listing by ID', async () => {
      const result = await qmarketService.getListing(testListingId);
      
      expect(result.success).toBe(true);
      expect(result.listing).toBeDefined();
      expect(result.listing.id).toBe(testListingId);
      expect(result.listing.title).toBe('Test Listing');
    });

    it('should return error for non-existent listing', async () => {
      const result = await qmarketService.getListing('listing_nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('LISTING_NOT_FOUND');
    });

    it('should increment view count', async () => {
      const result1 = await qmarketService.getListing(testListingId);
      const result2 = await qmarketService.getListing(testListingId);
      
      expect(result2.listing.stats.viewCount).toBe(result1.listing.stats.viewCount + 1);
    });
  });

  describe('Listing Search', () => {
    beforeEach(async () => {
      // Create test listings
      const testListings = [
        {
          squidId: 'squid_test123',
          title: 'Digital Art Piece',
          description: 'Beautiful digital artwork',
          price: 100.0,
          category: 'digital-art',
          tags: ['art', 'digital'],
          fileCid: 'QmTestCid1'
        },
        {
          squidId: 'squid_test456',
          title: 'Music Track',
          description: 'Original music composition',
          price: 25.0,
          category: 'media',
          tags: ['music', 'audio'],
          fileCid: 'QmTestCid2'
        },
        {
          squidId: 'squid_test789',
          title: 'Software Tool',
          description: 'Useful development tool',
          price: 50.0,
          category: 'software',
          tags: ['software', 'development'],
          fileCid: 'QmTestCid3'
        }
      ];

      for (const listing of testListings) {
        await qmarketService.createListing(listing);
      }
    });

    it('should search listings without filters', async () => {
      const result = await qmarketService.searchListings({});
      
      expect(result.success).toBe(true);
      expect(result.listings).toBeDefined();
      expect(result.listings.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
    });

    it('should filter by category', async () => {
      const result = await qmarketService.searchListings({ category: 'digital-art' });
      
      expect(result.success).toBe(true);
      expect(result.listings.length).toBeGreaterThan(0);
      expect(result.listings.every(l => l.category === 'digital-art')).toBe(true);
    });

    it('should filter by price range', async () => {
      const result = await qmarketService.searchListings({ 
        minPrice: 30, 
        maxPrice: 60 
      });
      
      expect(result.success).toBe(true);
      expect(result.listings.every(l => l.price >= 30 && l.price <= 60)).toBe(true);
    });

    it('should search by query text', async () => {
      const result = await qmarketService.searchListings({ query: 'digital' });
      
      expect(result.success).toBe(true);
      expect(result.listings.length).toBeGreaterThan(0);
      expect(result.listings.some(l => 
        l.title.toLowerCase().includes('digital') || 
        l.description.toLowerCase().includes('digital')
      )).toBe(true);
    });

    it('should handle pagination', async () => {
      const result = await qmarketService.searchListings({ 
        limit: 2, 
        offset: 0 
      });
      
      expect(result.success).toBe(true);
      expect(result.listings.length).toBeLessThanOrEqual(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });
  });

  describe('Purchase Processing', () => {
    let testListingId;

    beforeEach(async () => {
      const listingData = {
        squidId: 'squid_seller123',
        title: 'Test Purchase Item',
        description: 'An item for purchase testing',
        price: 30.0,
        fileCid: 'QmTestCid123456789abcdef'
      };

      const result = await qmarketService.createListing(listingData);
      testListingId = result.listing.id;
    });

    it('should process a purchase successfully', async () => {
      const purchaseData = {
        squidId: 'squid_buyer456',
        listingId: testListingId,
        paymentMethod: 'QToken'
      };

      const result = await qmarketService.purchaseListing(purchaseData);
      
      expect(result.success).toBe(true);
      expect(result.purchaseId).toBeDefined();
      expect(result.listingId).toBe(testListingId);
      expect(result.price).toBe(30.0);
      expect(result.currency).toBe('QToken');
    });

    it('should prevent self-purchase', async () => {
      const purchaseData = {
        squidId: 'squid_seller123', // Same as seller
        listingId: testListingId,
        paymentMethod: 'QToken'
      };

      const result = await qmarketService.purchaseListing(purchaseData);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('SELF_PURCHASE_DENIED');
    });

    it('should handle non-existent listing', async () => {
      const purchaseData = {
        squidId: 'squid_buyer456',
        listingId: 'listing_nonexistent',
        paymentMethod: 'QToken'
      };

      const result = await qmarketService.purchaseListing(purchaseData);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('LISTING_NOT_FOUND');
    });
  });

  describe('Marketplace Statistics', () => {
    beforeEach(async () => {
      // Create some test data
      const testData = [
        {
          squidId: 'squid_test1',
          title: 'Art 1',
          description: 'Test art piece 1',
          price: 100.0,
          category: 'digital-art',
          fileCid: 'QmTest1'
        },
        {
          squidId: 'squid_test2',
          title: 'Music 1',
          description: 'Test music track 1',
          price: 50.0,
          category: 'media',
          fileCid: 'QmTest2'
        }
      ];

      for (const data of testData) {
        await qmarketService.createListing(data);
      }
    });

    it('should return marketplace statistics', async () => {
      const result = await qmarketService.getMarketplaceStats();
      
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalListings).toBeGreaterThan(0);
      expect(result.stats.activeListings).toBeGreaterThan(0);
      expect(result.stats.byCategory).toBeDefined();
      expect(result.stats.byCurrency).toBeDefined();
      expect(result.stats.recentActivity).toBeDefined();
    });

    it('should calculate category distribution', async () => {
      const result = await qmarketService.getMarketplaceStats();
      
      expect(result.stats.byCategory['digital-art']).toBeGreaterThan(0);
      expect(result.stats.byCategory['media']).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await qmarketService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBeDefined();
      expect(health.marketplace).toBeDefined();
      expect(health.services).toBeDefined();
    });

    it('should include service status', async () => {
      const health = await qmarketService.healthCheck();
      
      expect(health.services.squid).toBeDefined();
      expect(health.services.qwallet).toBeDefined();
      expect(health.services.qlock).toBeDefined();
      expect(health.services.qonsent).toBeDefined();
    });
  });
});