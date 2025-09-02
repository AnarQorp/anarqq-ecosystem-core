/**
 * Qmarket Service Tests
 * 
 * Basic tests to verify Qmarket integration with ecosystem
 */

import { getQmarketService } from '../services/QmarketService.mjs';

async function testQmarketIntegration() {
  console.log('🧪 Testing Qmarket Service Integration...\n');

  try {
    const qmarketService = getQmarketService();

    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await qmarketService.healthCheck();
    console.log('✅ Health check:', health.status);
    console.log(`   - Total listings: ${health.marketplace.totalListings}`);
    console.log(`   - Categories: ${health.marketplace.categories}\n`);

    // Test 2: Create Test Listing
    console.log('2. Testing listing creation...');
    const testListing = {
      squidId: 'test_squid_123',
      title: 'Test Digital Art',
      description: 'A beautiful test artwork for the marketplace',
      price: 10.5,
      currency: 'QToken',
      category: 'digital-art',
      tags: ['test', 'art', 'digital'],
      fileCid: 'QmTestCID123456789',
      fileMetadata: {
        contentType: 'image/png',
        fileSize: 1024000,
        thumbnailUrl: 'https://example.com/thumb.png'
      },
      visibility: 'public',
      mintNFT: true
    };

    const createResult = await qmarketService.createListing(testListing);
    
    if (createResult.success) {
      console.log('✅ Listing created successfully');
      console.log(`   - Listing ID: ${createResult.listing.id}`);
      console.log(`   - NFT Token ID: ${createResult.listing.nft?.tokenId || 'N/A'}`);
      console.log(`   - Processing time: ${createResult.processingTime}ms`);
      console.log(`   - Access URL: ${createResult.listing.accessUrl || 'N/A'}\n`);

      // Test 3: Get Listing
      console.log('3. Testing listing retrieval...');
      const getResult = await qmarketService.getListing(createResult.listing.id);
      
      if (getResult.success) {
        console.log('✅ Listing retrieved successfully');
        console.log(`   - Title: ${getResult.listing.title}`);
        console.log(`   - Price: ${getResult.listing.price} ${getResult.listing.currency}`);
        console.log(`   - View count: ${getResult.listing.stats.viewCount}\n`);
      } else {
        console.log('❌ Failed to retrieve listing:', getResult.error);
      }

      // Test 4: Search Listings
      console.log('4. Testing listing search...');
      const searchResult = await qmarketService.searchListings({
        category: 'digital-art',
        limit: 10
      });

      if (searchResult.success) {
        console.log('✅ Search completed successfully');
        console.log(`   - Found ${searchResult.listings.length} listings`);
        console.log(`   - Total: ${searchResult.pagination.total}\n`);
      } else {
        console.log('❌ Search failed:', searchResult.error);
      }

    } else {
      console.log('❌ Failed to create listing:', createResult.error);
    }

    // Test 5: Marketplace Stats
    console.log('5. Testing marketplace statistics...');
    const statsResult = await qmarketService.getMarketplaceStats();
    
    if (statsResult.success) {
      console.log('✅ Statistics retrieved successfully');
      console.log(`   - Total listings: ${statsResult.stats.totalListings}`);
      console.log(`   - Active listings: ${statsResult.stats.activeListings}`);
      console.log(`   - Total value: ${statsResult.stats.totalValue}`);
    } else {
      console.log('❌ Failed to get statistics:', statsResult.error);
    }

    console.log('\n🎉 Qmarket integration test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testQmarketIntegration();
}

export { testQmarketIntegration };