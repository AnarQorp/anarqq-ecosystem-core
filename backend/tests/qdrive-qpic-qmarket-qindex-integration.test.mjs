/**
 * Qdrive/QpiC ↔ Qmarket ↔ Qindex Integration Tests
 * 
 * Tests the complete integration flow for file storage, media management,
 * marketplace listing, and indexing across storage and marketplace modules.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { QmarketService } from '../services/QmarketService.mjs';
import { UnifiedStorageService } from '../services/UnifiedStorageService.mjs';

describe('Qdrive/QpiC ↔ Qmarket ↔ Qindex Integration', () => {
  let eventBus;
  let qwalletService;
  let qmarketService;
  let storageService;
  let testIdentities;
  let integrationEvents;
  let testFiles;

  beforeAll(async () => {
    // Initialize services
    eventBus = new EventBusService();
    qwalletService = new QwalletIntegrationService({ sandboxMode: true, eventBus });
    qmarketService = new QmarketService({ 
      qwalletIntegration: qwalletService, 
      sandboxMode: true,
      eventBus 
    });
    storageService = new UnifiedStorageService({
      sandboxMode: true,
      eventBus
    });

    await qwalletService.initialize();
    await qmarketService.initialize();
    await storageService.initialize();

    // Setup test identities
    testIdentities = {
      creator: 'did:squid:creator_storage_test',
      buyer: 'did:squid:buyer_storage_test',
      curator: 'did:squid:curator_storage_test'
    };

    // Initialize test wallets
    for (const identity of Object.values(testIdentities)) {
      await qwalletService.getSandboxBalance(identity);
    }

    // Setup test files
    testFiles = {
      image: {
        name: 'digital_artwork.png',
        content: Buffer.from('fake-png-content-for-testing'),
        contentType: 'image/png',
        size: 2 * 1024 * 1024, // 2MB
        metadata: {
          width: 1920,
          height: 1080,
          colorSpace: 'sRGB',
          dpi: 300
        }
      },
      video: {
        name: 'promotional_video.mp4',
        content: Buffer.from('fake-mp4-content-for-testing'),
        contentType: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB
        metadata: {
          duration: 120, // 2 minutes
          resolution: '1920x1080',
          framerate: 30,
          codec: 'H.264'
        }
      },
      audio: {
        name: 'background_music.mp3',
        content: Buffer.from('fake-mp3-content-for-testing'),
        contentType: 'audio/mp3',
        size: 8 * 1024 * 1024, // 8MB
        metadata: {
          duration: 180, // 3 minutes
          bitrate: 320,
          sampleRate: 44100,
          channels: 2
        }
      },
      document: {
        name: 'research_paper.pdf',
        content: Buffer.from('fake-pdf-content-for-testing'),
        contentType: 'application/pdf',
        size: 5 * 1024 * 1024, // 5MB
        metadata: {
          pages: 25,
          author: 'Research Team',
          subject: 'AI Research Findings'
        }
      }
    };
  });

  afterAll(async () => {
    await storageService.shutdown();
    await qmarketService.shutdown();
    await qwalletService.shutdown();
  });

  beforeEach(() => {
    integrationEvents = [];
    
    // Subscribe to all events for integration tracking
    eventBus.subscribe('*', { squidId: 'storage-integration-test', subId: 'tracker' }, (event) => {
      integrationEvents.push({
        timestamp: new Date().toISOString(),
        topic: event.topic,
        actor: event.actor.squidId,
        payload: event.payload,
        correlationId: event.correlationId
      });
    });
  });

  describe('Complete File Upload to Marketplace Flow', () => {
    it('should upload image, process with QpiC, and list on marketplace', async () => {
      const correlationId = `image-upload-marketplace-${Date.now()}`;
      const imageFile = testFiles.image;

      // Step 1: Upload image to Qdrive
      const uploadResult = await storageService.uploadFile({
        squidId: testIdentities.creator,
        fileName: imageFile.name,
        content: imageFile.content,
        contentType: imageFile.contentType,
        metadata: imageFile.metadata,
        correlationId
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.fileId).toBeDefined();
      expect(uploadResult.cid).toBeDefined();

      // Step 2: Process image with QpiC (media optimization)
      const mediaProcessingResult = await mockQpiCProcessing({
        fileId: uploadResult.fileId,
        squidId: testIdentities.creator,
        processingType: 'image_optimization',
        operations: [
          { type: 'resize', params: { width: 1200, height: 800 } },
          { type: 'compress', params: { quality: 85 } },
          { type: 'watermark', params: { text: 'Original Creator', opacity: 0.3 } }
        ],
        correlationId
      });

      expect(mediaProcessingResult.success).toBe(true);
      expect(mediaProcessingResult.processedFileId).toBeDefined();
      expect(mediaProcessingResult.optimizations.length).toBe(3);

      // Step 3: Index the processed file (Qindex)
      const fileIndexResult = await mockQindexRegistration({
        resourceType: 'qdrive_file',
        resourceId: mediaProcessingResult.processedFileId,
        squidId: testIdentities.creator,
        metadata: {
          originalFileId: uploadResult.fileId,
          fileName: imageFile.name,
          contentType: imageFile.contentType,
          size: imageFile.size,
          processed: true,
          optimizations: mediaProcessingResult.optimizations
        },
        correlationId
      });

      expect(fileIndexResult.success).toBe(true);

      // Step 4: List processed image on marketplace
      const marketplaceListing = await qmarketService.listContent({
        squidId: testIdentities.creator,
        contentId: mediaProcessingResult.processedFileId,
        title: 'Professional Digital Artwork',
        description: 'High-quality digital artwork, professionally optimized',
        contentType: imageFile.contentType,
        size: mediaProcessingResult.optimizedSize,
        price: 75.0,
        currency: 'QToken',
        royaltyPercentage: 12,
        fileMetadata: {
          originalFileId: uploadResult.fileId,
          processedFileId: mediaProcessingResult.processedFileId,
          optimizations: mediaProcessingResult.optimizations
        },
        correlationId
      });

      expect(marketplaceListing.success).toBe(true);
      expect(marketplaceListing.listingId).toBeDefined();

      // Step 5: Index the marketplace listing
      const listingIndexResult = await mockQindexRegistration({
        resourceType: 'qmarket_listing',
        resourceId: marketplaceListing.listingId,
        squidId: testIdentities.creator,
        metadata: {
          contentId: mediaProcessingResult.processedFileId,
          contentType: imageFile.contentType,
          price: 75.0,
          hasMediaProcessing: true,
          storageProvider: 'qdrive'
        },
        correlationId
      });

      expect(listingIndexResult.success).toBe(true);

      // Verify complete event flow
      await new Promise(resolve => setTimeout(resolve, 100));
      const relevantEvents = integrationEvents.filter(e => e.correlationId === correlationId);
      expect(relevantEvents.length).toBeGreaterThan(0);

      // Verify storage events
      const storageEvents = relevantEvents.filter(e => 
        e.topic.startsWith('q.qdrive') || e.topic.startsWith('q.qpic')
      );
      expect(storageEvents.length).toBeGreaterThan(0);

      // Verify marketplace events
      const marketplaceEvents = relevantEvents.filter(e => e.topic.startsWith('q.qmarket'));
      expect(marketplaceEvents.length).toBeGreaterThan(0);
    });

    it('should handle video upload with transcoding and marketplace listing', async () => {
      const correlationId = `video-upload-marketplace-${Date.now()}`;
      const videoFile = testFiles.video;

      // Step 1: Upload video to Qdrive
      const uploadResult = await storageService.uploadFile({
        squidId: testIdentities.creator,
        fileName: videoFile.name,
        content: videoFile.content,
        contentType: videoFile.contentType,
        metadata: videoFile.metadata,
        correlationId
      });

      expect(uploadResult.success).toBe(true);

      // Step 2: Process video with QpiC (transcoding)
      const videoProcessingResult = await mockQpiCProcessing({
        fileId: uploadResult.fileId,
        squidId: testIdentities.creator,
        processingType: 'video_transcoding',
        operations: [
          { type: 'transcode', params: { format: 'mp4', quality: 'high' } },
          { type: 'generate_thumbnail', params: { timestamp: 10 } },
          { type: 'generate_preview', params: { duration: 30 } }
        ],
        correlationId
      });

      expect(videoProcessingResult.success).toBe(true);
      expect(videoProcessingResult.transcodedVersions.length).toBeGreaterThan(0);
      expect(videoProcessingResult.thumbnailFileId).toBeDefined();
      expect(videoProcessingResult.previewFileId).toBeDefined();

      // Step 3: Index all video assets
      const videoAssets = [
        {
          resourceId: videoProcessingResult.processedFileId,
          assetType: 'main_video'
        },
        {
          resourceId: videoProcessingResult.thumbnailFileId,
          assetType: 'thumbnail'
        },
        {
          resourceId: videoProcessingResult.previewFileId,
          assetType: 'preview'
        }
      ];

      const indexingResults = await Promise.all(
        videoAssets.map(asset => 
          mockQindexRegistration({
            resourceType: 'qpic_video_asset',
            resourceId: asset.resourceId,
            squidId: testIdentities.creator,
            metadata: {
              originalFileId: uploadResult.fileId,
              assetType: asset.assetType,
              parentVideoId: videoProcessingResult.processedFileId
            },
            correlationId
          })
        )
      );

      const successfulIndexing = indexingResults.filter(r => r.success);
      expect(successfulIndexing.length).toBe(videoAssets.length);

      // Step 4: List video on marketplace with all assets
      const videoListing = await qmarketService.listContent({
        squidId: testIdentities.creator,
        contentId: videoProcessingResult.processedFileId,
        title: 'Professional Promotional Video',
        description: 'High-quality promotional video with multiple formats',
        contentType: videoFile.contentType,
        size: videoProcessingResult.totalSize,
        price: 200.0,
        currency: 'QToken',
        royaltyPercentage: 15,
        mediaAssets: {
          mainVideo: videoProcessingResult.processedFileId,
          thumbnail: videoProcessingResult.thumbnailFileId,
          preview: videoProcessingResult.previewFileId,
          transcodedVersions: videoProcessingResult.transcodedVersions
        },
        correlationId
      });

      expect(videoListing.success).toBe(true);
      expect(videoListing.hasMediaAssets).toBe(true);
    });
  });

  describe('Content Purchase and Delivery Flow', () => {
    it('should handle complete purchase and file delivery', async () => {
      const correlationId = `purchase-delivery-${Date.now()}`;
      const documentFile = testFiles.document;

      // Setup: Upload and list document
      const uploadResult = await storageService.uploadFile({
        squidId: testIdentities.creator,
        fileName: documentFile.name,
        content: documentFile.content,
        contentType: documentFile.contentType,
        metadata: documentFile.metadata,
        correlationId
      });

      const listingResult = await qmarketService.listContent({
        squidId: testIdentities.creator,
        contentId: uploadResult.fileId,
        title: 'Research Paper',
        description: 'Comprehensive AI research findings',
        price: 50.0,
        currency: 'QToken',
        correlationId
      });

      // Step 1: Purchase content
      const purchaseResult = await simulateContentPurchase(
        listingResult.listingId,
        testIdentities.buyer,
        50.0,
        correlationId
      );

      expect(purchaseResult.success).toBe(true);

      // Step 2: Grant file access to buyer
      const accessGrantResult = await storageService.grantFileAccess({
        fileId: uploadResult.fileId,
        granteeId: testIdentities.buyer,
        grantorId: testIdentities.creator,
        accessType: 'READ',
        purchaseId: purchaseResult.purchaseId,
        correlationId
      });

      expect(accessGrantResult.success).toBe(true);
      expect(accessGrantResult.accessToken).toBeDefined();

      // Step 3: Buyer downloads the file
      const downloadResult = await storageService.downloadFile({
        fileId: uploadResult.fileId,
        squidId: testIdentities.buyer,
        accessToken: accessGrantResult.accessToken,
        correlationId
      });

      expect(downloadResult.success).toBe(true);
      expect(downloadResult.content).toBeDefined();
      expect(downloadResult.metadata).toBeDefined();

      // Step 4: Index the access grant and download
      const accessIndexResult = await mockQindexRegistration({
        resourceType: 'qdrive_file_access',
        resourceId: `access_${uploadResult.fileId}_${testIdentities.buyer}`,
        squidId: testIdentities.buyer,
        metadata: {
          fileId: uploadResult.fileId,
          grantorId: testIdentities.creator,
          accessType: 'READ',
          purchaseId: purchaseResult.purchaseId,
          downloadTimestamp: new Date().toISOString()
        },
        correlationId
      });

      expect(accessIndexResult.success).toBe(true);

      // Verify complete audit trail
      const auditTrail = await qwalletService.getAuditTrail({
        correlationId
      });

      expect(auditTrail.success).toBe(true);
      expect(auditTrail.auditEvents.length).toBeGreaterThan(0);

      // Verify payment, purchase, and access events are all present
      const paymentEvents = auditTrail.auditEvents.filter(e => e.action.includes('PAYMENT'));
      const purchaseEvents = auditTrail.auditEvents.filter(e => e.action.includes('PURCHASE'));
      const accessEvents = auditTrail.auditEvents.filter(e => e.action.includes('ACCESS'));

      expect(paymentEvents.length).toBeGreaterThan(0);
      expect(purchaseEvents.length).toBeGreaterThan(0);
      expect(accessEvents.length).toBeGreaterThan(0);
    });

    it('should handle subscription-based access to content library', async () => {
      const correlationId = `subscription-access-${Date.now()}`;

      // Setup: Create content library
      const libraryFiles = Object.values(testFiles);
      const uploadResults = [];

      for (const file of libraryFiles) {
        const uploadResult = await storageService.uploadFile({
          squidId: testIdentities.creator,
          fileName: `library_${file.name}`,
          content: file.content,
          contentType: file.contentType,
          metadata: { ...file.metadata, libraryItem: true },
          correlationId
        });
        uploadResults.push(uploadResult);
      }

      // Create subscription-based marketplace listing
      const subscriptionListing = await qmarketService.createSubscriptionListing({
        squidId: testIdentities.creator,
        title: 'Premium Content Library',
        description: 'Access to complete digital content library',
        subscriptionType: 'monthly',
        price: 25.0,
        currency: 'QToken',
        contentIds: uploadResults.map(r => r.fileId),
        correlationId
      });

      expect(subscriptionListing.success).toBe(true);

      // Purchase subscription
      const subscriptionPurchase = await qmarketService.purchaseSubscription({
        squidId: testIdentities.buyer,
        subscriptionListingId: subscriptionListing.listingId,
        billingPeriod: 'monthly',
        correlationId
      });

      expect(subscriptionPurchase.success).toBe(true);
      expect(subscriptionPurchase.subscriptionId).toBeDefined();

      // Grant access to all library files
      const libraryAccessResults = await Promise.all(
        uploadResults.map(upload =>
          storageService.grantFileAccess({
            fileId: upload.fileId,
            granteeId: testIdentities.buyer,
            grantorId: testIdentities.creator,
            accessType: 'READ',
            subscriptionId: subscriptionPurchase.subscriptionId,
            correlationId
          })
        )
      );

      const successfulAccess = libraryAccessResults.filter(r => r.success);
      expect(successfulAccess.length).toBe(uploadResults.length);

      // Index subscription access
      const subscriptionIndexResult = await mockQindexRegistration({
        resourceType: 'qmarket_subscription_access',
        resourceId: subscriptionPurchase.subscriptionId,
        squidId: testIdentities.buyer,
        metadata: {
          subscriptionType: 'monthly',
          contentCount: uploadResults.length,
          accessGranted: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        },
        correlationId
      });

      expect(subscriptionIndexResult.success).toBe(true);
    });
  });

  describe('Media Processing and Optimization', () => {
    it('should handle batch media processing for marketplace optimization', async () => {
      const correlationId = `batch-media-processing-${Date.now()}`;
      const mediaFiles = [testFiles.image, testFiles.video, testFiles.audio];

      // Upload all media files
      const uploadResults = await Promise.all(
        mediaFiles.map(file =>
          storageService.uploadFile({
            squidId: testIdentities.creator,
            fileName: `batch_${file.name}`,
            content: file.content,
            contentType: file.contentType,
            metadata: file.metadata,
            correlationId
          })
        )
      );

      const successfulUploads = uploadResults.filter(r => r.success);
      expect(successfulUploads.length).toBe(mediaFiles.length);

      // Batch process all media files
      const batchProcessingResult = await mockQpiCBatchProcessing({
        fileIds: successfulUploads.map(r => r.fileId),
        squidId: testIdentities.creator,
        processingProfile: 'marketplace_optimization',
        operations: {
          images: [
            { type: 'resize', params: { maxWidth: 1920, maxHeight: 1080 } },
            { type: 'compress', params: { quality: 90 } },
            { type: 'format_convert', params: { format: 'webp' } }
          ],
          videos: [
            { type: 'transcode', params: { format: 'mp4', quality: 'high' } },
            { type: 'generate_thumbnail', params: { count: 3 } }
          ],
          audio: [
            { type: 'normalize', params: { level: -14 } },
            { type: 'compress', params: { bitrate: 256 } }
          ]
        },
        correlationId
      });

      expect(batchProcessingResult.success).toBe(true);
      expect(batchProcessingResult.processedFiles.length).toBe(mediaFiles.length);

      // Index all processed files
      const indexingResults = await Promise.all(
        batchProcessingResult.processedFiles.map(processed =>
          mockQindexRegistration({
            resourceType: 'qpic_processed_media',
            resourceId: processed.processedFileId,
            squidId: testIdentities.creator,
            metadata: {
              originalFileId: processed.originalFileId,
              mediaType: processed.mediaType,
              optimizations: processed.optimizations,
              batchProcessed: true
            },
            correlationId
          })
        )
      );

      const successfulIndexing = indexingResults.filter(r => r.success);
      expect(successfulIndexing.length).toBe(mediaFiles.length);

      // Create marketplace listings for all processed media
      const marketplaceListings = await Promise.all(
        batchProcessingResult.processedFiles.map((processed, index) =>
          qmarketService.listContent({
            squidId: testIdentities.creator,
            contentId: processed.processedFileId,
            title: `Optimized ${mediaFiles[index].name}`,
            description: `Professionally optimized ${processed.mediaType}`,
            contentType: processed.optimizedContentType,
            size: processed.optimizedSize,
            price: 30.0 + (index * 10), // Varying prices
            currency: 'QToken',
            royaltyPercentage: 10,
            mediaOptimizations: processed.optimizations,
            correlationId
          })
        )
      );

      const successfulListings = marketplaceListings.filter(r => r.success);
      expect(successfulListings.length).toBe(mediaFiles.length);
    });
  });

  describe('Content Curation and Collections', () => {
    it('should handle curated content collections', async () => {
      const correlationId = `content-curation-${Date.now()}`;

      // Upload diverse content for curation
      const curatedFiles = Object.values(testFiles);
      const uploadResults = await Promise.all(
        curatedFiles.map(file =>
          storageService.uploadFile({
            squidId: testIdentities.creator,
            fileName: `curated_${file.name}`,
            content: file.content,
            contentType: file.contentType,
            metadata: { ...file.metadata, curatable: true },
            correlationId
          })
        )
      );

      // Create individual listings
      const individualListings = await Promise.all(
        uploadResults.map((upload, index) =>
          qmarketService.listContent({
            squidId: testIdentities.creator,
            contentId: upload.fileId,
            title: `Individual ${curatedFiles[index].name}`,
            price: 15.0,
            currency: 'QToken',
            correlationId
          })
        )
      );

      // Curator creates a collection
      const collectionResult = await qmarketService.createCollection({
        squidId: testIdentities.curator,
        title: 'Premium Digital Assets Collection',
        description: 'Carefully curated selection of high-quality digital assets',
        contentIds: uploadResults.map(r => r.fileId),
        collectionPrice: 100.0, // Discounted bundle price
        currency: 'QToken',
        curatorFeePercentage: 5, // Curator gets 5% of sales
        correlationId
      });

      expect(collectionResult.success).toBe(true);
      expect(collectionResult.collectionId).toBeDefined();

      // Index the collection
      const collectionIndexResult = await mockQindexRegistration({
        resourceType: 'qmarket_collection',
        resourceId: collectionResult.collectionId,
        squidId: testIdentities.curator,
        metadata: {
          itemCount: uploadResults.length,
          totalIndividualPrice: individualListings.reduce((sum, listing) => sum + 15.0, 0),
          collectionPrice: 100.0,
          discount: 'bundle_discount',
          curatorFee: 5
        },
        correlationId
      });

      expect(collectionIndexResult.success).toBe(true);

      // Purchase the collection
      const collectionPurchase = await simulateContentPurchase(
        collectionResult.collectionId,
        testIdentities.buyer,
        100.0,
        correlationId
      );

      expect(collectionPurchase.success).toBe(true);

      // Verify revenue distribution includes curator fee
      const revenueDistribution = await qwalletService.distributeQmarketRevenue(
        collectionPurchase.paymentIntent,
        90.0, // After platform fee
        10.0, // Platform fee
        {
          isCollection: true,
          curatorId: testIdentities.curator,
          curatorFeePercentage: 5,
          originalCreatorIds: [testIdentities.creator]
        }
      );

      expect(revenueDistribution.distributions.length).toBe(3); // platform, creator, curator
      
      const curatorDistribution = revenueDistribution.distributions.find(d => d.recipient === 'curator');
      expect(curatorDistribution).toBeDefined();
      expect(curatorDistribution.squidId).toBe(testIdentities.curator);
    });
  });

  describe('Storage Quota and Performance Management', () => {
    it('should handle storage quota management for marketplace creators', async () => {
      const correlationId = `storage-quota-${Date.now()}`;

      // Check initial storage quota
      const initialQuota = await storageService.getStorageQuota(testIdentities.creator);
      expect(initialQuota.success).toBe(true);
      expect(initialQuota.quotaLimit).toBeGreaterThan(0);

      // Upload files approaching quota limit
      const largeFiles = Array(5).fill(null).map((_, index) => ({
        name: `large_file_${index}.bin`,
        content: Buffer.alloc(100 * 1024 * 1024), // 100MB each
        contentType: 'application/octet-stream',
        size: 100 * 1024 * 1024
      }));

      const uploadResults = [];
      for (const file of largeFiles) {
        const uploadResult = await storageService.uploadFile({
          squidId: testIdentities.creator,
          fileName: file.name,
          content: file.content,
          contentType: file.contentType,
          correlationId
        });
        uploadResults.push(uploadResult);

        if (!uploadResult.success && uploadResult.error?.includes('quota')) {
          break; // Stop when quota is reached
        }
      }

      // Check quota after uploads
      const updatedQuota = await storageService.getStorageQuota(testIdentities.creator);
      expect(updatedQuota.used).toBeGreaterThan(initialQuota.used);

      // If quota exceeded, verify upgrade option is offered
      if (updatedQuota.used >= updatedQuota.quotaLimit * 0.9) {
        const upgradeOptions = await storageService.getQuotaUpgradeOptions(testIdentities.creator);
        expect(upgradeOptions.success).toBe(true);
        expect(upgradeOptions.plans.length).toBeGreaterThan(0);
      }

      // Index storage usage
      const storageIndexResult = await mockQindexRegistration({
        resourceType: 'qdrive_storage_usage',
        resourceId: `storage_${testIdentities.creator}_${Date.now()}`,
        squidId: testIdentities.creator,
        metadata: {
          totalUsed: updatedQuota.used,
          quotaLimit: updatedQuota.quotaLimit,
          utilizationPercentage: (updatedQuota.used / updatedQuota.quotaLimit) * 100,
          fileCount: uploadResults.filter(r => r.success).length
        },
        correlationId
      });

      expect(storageIndexResult.success).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle file corruption and recovery', async () => {
      const correlationId = `file-corruption-recovery-${Date.now()}`;
      const testFile = testFiles.image;

      // Upload file
      const uploadResult = await storageService.uploadFile({
        squidId: testIdentities.creator,
        fileName: testFile.name,
        content: testFile.content,
        contentType: testFile.contentType,
        correlationId
      });

      expect(uploadResult.success).toBe(true);

      // Simulate file corruption detection
      const corruptionCheck = await storageService.verifyFileIntegrity({
        fileId: uploadResult.fileId,
        expectedHash: uploadResult.contentHash,
        correlationId
      });

      // If corruption detected, initiate recovery
      if (!corruptionCheck.valid) {
        const recoveryResult = await storageService.recoverFile({
          fileId: uploadResult.fileId,
          squidId: testIdentities.creator,
          recoveryMethod: 'backup_restore',
          correlationId
        });

        expect(recoveryResult.success).toBe(true);
        expect(recoveryResult.recoveredFileId).toBeDefined();

        // Update marketplace listing if file was listed
        const listingUpdate = await qmarketService.updateContentFile({
          contentId: uploadResult.fileId,
          newFileId: recoveryResult.recoveredFileId,
          reason: 'file_recovery',
          correlationId
        });

        expect(listingUpdate.success).toBe(true);
      }
    });

    it('should handle service unavailability gracefully', async () => {
      const correlationId = `service-unavailable-${Date.now()}`;

      // Mock QpiC service unavailability
      const uploadResult = await storageService.uploadFile({
        squidId: testIdentities.creator,
        fileName: 'test_unavailable.jpg',
        content: testFiles.image.content,
        contentType: 'image/jpeg',
        correlationId,
        mockQpiCUnavailable: true
      });

      // Upload should succeed even if media processing fails
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.warnings).toContain('Media processing service unavailable');

      // Marketplace listing should work with unprocessed file
      const listingResult = await qmarketService.listContent({
        squidId: testIdentities.creator,
        contentId: uploadResult.fileId,
        title: 'Unprocessed Image',
        price: 20.0,
        currency: 'QToken',
        correlationId
      });

      expect(listingResult.success).toBe(true);
      expect(listingResult.mediaProcessed).toBe(false);
    });
  });
});

// Helper functions

async function simulateContentPurchase(listingId, buyerId, amount, correlationId) {
  const paymentIntent = await qwalletService.createPaymentIntent({
    squidId: buyerId,
    amount,
    currency: 'QToken',
    purpose: 'qmarket_content_purchase',
    metadata: { listingId, correlationId }
  });

  const paymentResult = await qwalletService.processSandboxPayment(paymentIntent);
  
  if (!paymentResult.success) {
    return { success: false, error: 'Payment failed' };
  }

  const purchaseResult = await qmarketService.processPurchase({
    squidId: buyerId,
    listingId,
    paymentIntentId: paymentIntent.intentId,
    correlationId
  });

  return {
    success: purchaseResult.success,
    purchaseId: purchaseResult.purchaseId,
    paymentIntent,
    paymentResult,
    purchaseResult
  };
}

// Mock functions for services not yet fully implemented

async function mockQpiCProcessing(data) {
  const processingResults = {
    image_optimization: {
      processedFileId: `processed_${data.fileId}`,
      optimizedSize: Math.floor(Math.random() * 1000000) + 500000, // Random optimized size
      optimizations: data.operations.map(op => ({
        type: op.type,
        applied: true,
        params: op.params,
        result: `${op.type}_applied_successfully`
      }))
    },
    video_transcoding: {
      processedFileId: `transcoded_${data.fileId}`,
      thumbnailFileId: `thumb_${data.fileId}`,
      previewFileId: `preview_${data.fileId}`,
      transcodedVersions: [
        { quality: 'high', fileId: `hq_${data.fileId}`, size: 45000000 },
        { quality: 'medium', fileId: `mq_${data.fileId}`, size: 25000000 },
        { quality: 'low', fileId: `lq_${data.fileId}`, size: 10000000 }
      ],
      totalSize: 80000000
    }
  };

  return {
    success: true,
    processingType: data.processingType,
    ...processingResults[data.processingType]
  };
}

async function mockQpiCBatchProcessing(data) {
  const processedFiles = data.fileIds.map((fileId, index) => {
    const mediaType = index === 0 ? 'image' : index === 1 ? 'video' : 'audio';
    return {
      originalFileId: fileId,
      processedFileId: `batch_processed_${fileId}`,
      mediaType,
      optimizedContentType: mediaType === 'image' ? 'image/webp' : 
                           mediaType === 'video' ? 'video/mp4' : 'audio/mp3',
      optimizedSize: Math.floor(Math.random() * 5000000) + 1000000,
      optimizations: data.operations[`${mediaType}s`] || []
    };
  });

  return {
    success: true,
    processedFiles,
    totalProcessingTime: processedFiles.length * 30, // 30 seconds per file
    batchId: `batch_${Date.now()}`
  };
}

async function mockQindexRegistration(data) {
  return {
    success: true,
    indexed: true,
    indexId: `idx_${data.resourceType}_${Date.now()}`,
    resourceId: data.resourceId,
    squidId: data.squidId,
    timestamp: new Date().toISOString(),
    metadata: data.metadata
  };
}