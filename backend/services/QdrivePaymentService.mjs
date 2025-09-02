/**
 * Qdrive Payment Service - Premium Storage Payment Integration
 * 
 * Handles payment processing for premium storage services including
 * quota management, bandwidth fees, and premium features.
 */

import crypto from 'crypto';
import { QwalletIntegrationService } from './QwalletIntegrationService.mjs';
import { EventBusService } from './EventBusService.mjs';

export class QdrivePaymentService {
  constructor(options = {}) {
    this.qwalletIntegration = options.qwalletIntegration || new QwalletIntegrationService({
      sandboxMode: options.sandboxMode || false
    });
    this.eventBus = options.eventBus || new EventBusService();
    
    // Storage pricing configuration
    this.pricingConfig = {
      storage: {
        baseFee: 0.001, // QToken per GB per month
        tiers: [
          { name: 'free', maxSize: 1, price: 0 }, // 1 GB free
          { name: 'basic', maxSize: 10, price: 0.001 }, // 10 GB
          { name: 'premium', maxSize: 100, price: 0.0008 }, // 100 GB (20% discount)
          { name: 'enterprise', maxSize: 1000, price: 0.0006 } // 1 TB (40% discount)
        ]
      },
      bandwidth: {
        baseFee: 0.0001, // QToken per GB transfer
        freeTier: 10, // 10 GB free per month
        tiers: [
          { threshold: 100, multiplier: 1.0 }, // Up to 100 GB: 1x
          { threshold: 1000, multiplier: 0.8 }, // 100-1000 GB: 20% discount
          { threshold: Infinity, multiplier: 0.6 } // >1000 GB: 40% discount
        ]
      },
      premiumFeatures: {
        encryption: {
          name: 'Advanced Encryption',
          fee: 0.01, // QToken per file
          description: 'Client-side encryption with Qlock integration'
        },
        sharing: {
          name: 'Advanced Sharing',
          fee: 0.005, // QToken per share
          description: 'Granular sharing controls with Qonsent integration'
        },
        versioning: {
          name: 'File Versioning',
          fee: 0.002, // QToken per version
          description: 'Automatic file versioning and history'
        },
        backup: {
          name: 'Automated Backup',
          fee: 0.003, // QToken per backup
          description: 'Automated backup to multiple locations'
        },
        sync: {
          name: 'Real-time Sync',
          fee: 0.001, // QToken per sync operation
          description: 'Real-time synchronization across devices'
        }
      }
    };

    // Subscription plans
    this.subscriptionPlans = new Map();
    this.initializeSubscriptionPlans();

    // User storage tracking
    this.userStorage = new Map();
    this.paymentHistory = new Map();
    this.quotaAlerts = new Map();

    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('[QdrivePayment] Initializing...');

      // Initialize Qwallet integration
      await this.qwalletIntegration.initialize();

      // Subscribe to storage events
      await this.subscribeToStorageEvents();

      // Start background tasks
      this.startBackgroundTasks();

      this.initialized = true;
      console.log('[QdrivePayment] Initialized successfully');
    } catch (error) {
      console.error('[QdrivePayment] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize subscription plans
   */
  initializeSubscriptionPlans() {
    const plans = [
      {
        id: 'basic',
        name: 'Basic Storage',
        monthlyFee: 2.0, // QToken
        features: {
          storage: 10, // GB
          bandwidth: 50, // GB
          premiumFeatures: ['encryption'],
          maxFileSize: 100, // MB
          maxShares: 10
        }
      },
      {
        id: 'premium',
        name: 'Premium Storage',
        monthlyFee: 8.0, // QToken
        features: {
          storage: 100, // GB
          bandwidth: 200, // GB
          premiumFeatures: ['encryption', 'sharing', 'versioning'],
          maxFileSize: 1000, // MB
          maxShares: 100
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise Storage',
        monthlyFee: 25.0, // QToken
        features: {
          storage: 1000, // GB
          bandwidth: 1000, // GB
          premiumFeatures: ['encryption', 'sharing', 'versioning', 'backup', 'sync'],
          maxFileSize: 10000, // MB
          maxShares: 1000
        }
      }
    ];

    plans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });
  }

  /**
   * Subscribe to storage-related events
   */
  async subscribeToStorageEvents() {
    const topics = [
      'q.qdrive.file.upload.requested.v1',
      'q.qdrive.quota.check.requested.v1',
      'q.qdrive.premium.feature.requested.v1',
      'q.qdrive.subscription.requested.v1'
    ];

    for (const topic of topics) {
      await this.eventBus.subscribe(topic, (event) => {
        this.handleStorageEvent(topic, event);
      });
    }
  }

  /**
   * Handle storage events
   */
  async handleStorageEvent(topic, event) {
    try {
      console.log(`[QdrivePayment] Handling event: ${topic}`);

      switch (topic) {
        case 'q.qdrive.file.upload.requested.v1':
          await this.handleFileUploadRequest(event);
          break;
        case 'q.qdrive.quota.check.requested.v1':
          await this.handleQuotaCheckRequest(event);
          break;
        case 'q.qdrive.premium.feature.requested.v1':
          await this.handlePremiumFeatureRequest(event);
          break;
        case 'q.qdrive.subscription.requested.v1':
          await this.handleSubscriptionRequest(event);
          break;
      }
    } catch (error) {
      console.error(`[QdrivePayment] Error handling event ${topic}:`, error);
    }
  }

  /**
   * Check and process storage quota
   */
  async processStorageQuota(quotaData) {
    try {
      const {
        squidId,
        currentUsage, // in GB
        requestedSize, // in GB
        subscriptionPlan = null
      } = quotaData;

      // Get user storage info
      const userStorage = await this.getUserStorage(squidId);
      const totalUsage = currentUsage + requestedSize;

      // Check subscription allowances
      const subscriptionCheck = await this.checkSubscriptionQuota(squidId, totalUsage);
      
      if (subscriptionCheck.withinLimits) {
        return {
          success: true,
          allowed: true,
          paymentRequired: false,
          currentUsage,
          requestedSize,
          totalUsage,
          quotaLimit: subscriptionCheck.quotaLimit,
          subscriptionPlan: subscriptionCheck.planId
        };
      }

      // Calculate overage fees
      const overage = totalUsage - subscriptionCheck.quotaLimit;
      const overageFee = await this.calculateStorageFee(overage);

      // Process payment for overage
      const paymentResult = await this.qwalletIntegration.processQdrivePayment({
        squidId,
        storageUsed: overage,
        bandwidthUsed: 0,
        premiumFeatures: [],
        billingPeriod: 'monthly'
      });

      // Update user storage tracking
      if (paymentResult.success) {
        userStorage.paidStorage += overage;
        userStorage.lastPayment = new Date().toISOString();
        this.userStorage.set(squidId, userStorage);
      }

      return {
        success: true,
        allowed: paymentResult.success,
        paymentRequired: true,
        paymentResult,
        currentUsage,
        requestedSize,
        totalUsage,
        overage,
        overageFee,
        quotaLimit: subscriptionCheck.quotaLimit
      };
    } catch (error) {
      console.error('[QdrivePayment] Storage quota processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process premium feature payment
   */
  async processPremiumFeature(featureData) {
    try {
      const {
        squidId,
        featureType,
        fileId = null,
        fileSize = 0,
        operationCount = 1
      } = featureData;

      // Validate feature type
      if (!this.pricingConfig.premiumFeatures[featureType]) {
        throw new Error(`Invalid premium feature: ${featureType}`);
      }

      const feature = this.pricingConfig.premiumFeatures[featureType];
      
      // Check subscription coverage
      const subscriptionCheck = await this.checkSubscriptionFeature(squidId, featureType);
      
      if (subscriptionCheck.covered) {
        await this.deductSubscriptionFeature(squidId, featureType, operationCount);
        
        return {
          success: true,
          featureType,
          paymentRequired: false,
          subscriptionCovered: true,
          operationCount,
          description: feature.description
        };
      }

      // Calculate feature fee
      let featureFee = feature.fee * operationCount;
      
      // Apply file size multiplier for certain features
      if (['encryption', 'backup'].includes(featureType) && fileSize > 0) {
        const sizeMultiplier = Math.max(1, fileSize / (100 * 1024 * 1024)); // Per 100MB
        featureFee *= sizeMultiplier;
      }

      // Process payment
      const paymentResult = await this.qwalletIntegration.createPaymentIntent({
        squidId,
        amount: featureFee,
        currency: 'QToken',
        purpose: `qdrive_premium_${featureType}`,
        metadata: {
          featureType,
          fileId,
          fileSize,
          operationCount,
          module: 'qdrive'
        }
      });

      // Record feature usage
      await this.recordFeatureUsage(squidId, {
        featureType,
        fileId,
        operationCount,
        fee: featureFee,
        paymentResult
      });

      return {
        success: true,
        featureType,
        paymentRequired: true,
        paymentResult,
        fee: featureFee,
        operationCount,
        description: feature.description
      };
    } catch (error) {
      console.error('[QdrivePayment] Premium feature processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process bandwidth payment
   */
  async processBandwidthUsage(bandwidthData) {
    try {
      const {
        squidId,
        bandwidthUsed, // in GB
        billingPeriod = 'monthly'
      } = bandwidthData;

      // Get user bandwidth usage
      const userStorage = await this.getUserStorage(squidId);
      const totalBandwidth = userStorage.bandwidthUsed + bandwidthUsed;

      // Check free tier
      if (totalBandwidth <= this.pricingConfig.bandwidth.freeTier) {
        userStorage.bandwidthUsed = totalBandwidth;
        this.userStorage.set(squidId, userStorage);
        
        return {
          success: true,
          paymentRequired: false,
          bandwidthUsed,
          totalBandwidth,
          freeTierRemaining: this.pricingConfig.bandwidth.freeTier - totalBandwidth
        };
      }

      // Calculate bandwidth fee
      const chargeableBandwidth = totalBandwidth - this.pricingConfig.bandwidth.freeTier;
      const bandwidthFee = await this.calculateBandwidthFee(chargeableBandwidth);

      // Process payment
      const paymentResult = await this.qwalletIntegration.processQdrivePayment({
        squidId,
        storageUsed: 0,
        bandwidthUsed: chargeableBandwidth,
        premiumFeatures: [],
        billingPeriod
      });

      if (paymentResult.success) {
        userStorage.bandwidthUsed = totalBandwidth;
        userStorage.bandwidthPaid += chargeableBandwidth;
        this.userStorage.set(squidId, userStorage);
      }

      return {
        success: true,
        paymentRequired: true,
        paymentResult,
        bandwidthUsed,
        totalBandwidth,
        chargeableBandwidth,
        bandwidthFee
      };
    } catch (error) {
      console.error('[QdrivePayment] Bandwidth processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate storage fee
   */
  async calculateStorageFee(storageGB) {
    let fee = 0;
    let remainingStorage = storageGB;

    for (const tier of this.pricingConfig.storage.tiers) {
      if (remainingStorage <= 0) break;
      
      const tierUsage = Math.min(remainingStorage, tier.maxSize);
      fee += tierUsage * tier.price;
      remainingStorage -= tierUsage;
    }

    return fee;
  }

  /**
   * Calculate bandwidth fee
   */
  async calculateBandwidthFee(bandwidthGB) {
    let fee = bandwidthGB * this.pricingConfig.bandwidth.baseFee;
    
    // Apply tier discounts
    for (const tier of this.pricingConfig.bandwidth.tiers) {
      if (bandwidthGB >= tier.threshold) {
        fee *= tier.multiplier;
        break;
      }
    }

    return fee;
  }

  /**
   * Get user storage information
   */
  async getUserStorage(squidId) {
    if (!this.userStorage.has(squidId)) {
      this.userStorage.set(squidId, {
        squidId,
        storageUsed: 0,
        paidStorage: 0,
        bandwidthUsed: 0,
        bandwidthPaid: 0,
        subscriptionPlan: null,
        featureUsage: {},
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }

    return this.userStorage.get(squidId);
  }

  /**
   * Check subscription quota
   */
  async checkSubscriptionQuota(squidId, requestedUsage) {
    const userStorage = await this.getUserStorage(squidId);
    
    if (!userStorage.subscriptionPlan) {
      return {
        withinLimits: requestedUsage <= this.pricingConfig.storage.tiers[0].maxSize,
        quotaLimit: this.pricingConfig.storage.tiers[0].maxSize,
        planId: 'free'
      };
    }

    const plan = this.subscriptionPlans.get(userStorage.subscriptionPlan);
    if (!plan) {
      return {
        withinLimits: false,
        quotaLimit: 0,
        planId: null
      };
    }

    return {
      withinLimits: requestedUsage <= plan.features.storage,
      quotaLimit: plan.features.storage,
      planId: plan.id
    };
  }

  /**
   * Check subscription feature coverage
   */
  async checkSubscriptionFeature(squidId, featureType) {
    const userStorage = await this.getUserStorage(squidId);
    
    if (!userStorage.subscriptionPlan) {
      return { covered: false };
    }

    const plan = this.subscriptionPlans.get(userStorage.subscriptionPlan);
    if (!plan) {
      return { covered: false };
    }

    return {
      covered: plan.features.premiumFeatures.includes(featureType)
    };
  }

  /**
   * Deduct subscription feature usage
   */
  async deductSubscriptionFeature(squidId, featureType, operationCount) {
    const userStorage = await this.getUserStorage(squidId);
    
    if (!userStorage.featureUsage[featureType]) {
      userStorage.featureUsage[featureType] = 0;
    }
    
    userStorage.featureUsage[featureType] += operationCount;
    userStorage.lastUpdated = new Date().toISOString();
    
    this.userStorage.set(squidId, userStorage);
  }

  /**
   * Record feature usage
   */
  async recordFeatureUsage(squidId, usageData) {
    if (!this.paymentHistory.has(squidId)) {
      this.paymentHistory.set(squidId, []);
    }

    this.paymentHistory.get(squidId).push({
      type: 'premium_feature',
      featureType: usageData.featureType,
      operationCount: usageData.operationCount,
      fee: usageData.fee,
      paymentResult: usageData.paymentResult,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process subscription payment
   */
  async processSubscription(subscriptionData) {
    try {
      const {
        squidId,
        planId,
        billingPeriod = 'monthly'
      } = subscriptionData;

      const plan = this.subscriptionPlans.get(planId);
      if (!plan) {
        throw new Error(`Invalid subscription plan: ${planId}`);
      }

      let amount = plan.monthlyFee;
      if (billingPeriod === 'yearly') {
        amount = plan.monthlyFee * 12 * 0.85; // 15% discount for yearly
      }

      // Process payment
      const paymentResult = await this.qwalletIntegration.createPaymentIntent({
        squidId,
        amount,
        currency: 'QToken',
        purpose: `qdrive_subscription_${planId}_${billingPeriod}`,
        metadata: {
          planId,
          billingPeriod,
          features: plan.features,
          module: 'qdrive'
        }
      });

      // Update user storage plan
      if (paymentResult.success) {
        const userStorage = await this.getUserStorage(squidId);
        userStorage.subscriptionPlan = planId;
        userStorage.subscriptionExpiry = this.calculateSubscriptionExpiry(billingPeriod);
        userStorage.lastUpdated = new Date().toISOString();
        this.userStorage.set(squidId, userStorage);
      }

      return {
        success: true,
        planId,
        billingPeriod,
        amount,
        features: plan.features,
        paymentResult
      };
    } catch (error) {
      console.error('[QdrivePayment] Subscription processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate subscription expiry
   */
  calculateSubscriptionExpiry(billingPeriod) {
    const now = new Date();
    if (billingPeriod === 'yearly') {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    } else {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    }
  }

  /**
   * Get user storage summary
   */
  async getStorageSummary(squidId) {
    try {
      const userStorage = await this.getUserStorage(squidId);
      const subscriptionCheck = await this.checkSubscriptionQuota(squidId, userStorage.storageUsed);
      
      return {
        success: true,
        squidId,
        storageUsed: userStorage.storageUsed,
        storageLimit: subscriptionCheck.quotaLimit,
        storageAvailable: Math.max(0, subscriptionCheck.quotaLimit - userStorage.storageUsed),
        bandwidthUsed: userStorage.bandwidthUsed,
        bandwidthLimit: this.pricingConfig.bandwidth.freeTier,
        subscriptionPlan: userStorage.subscriptionPlan,
        subscriptionExpiry: userStorage.subscriptionExpiry,
        featureUsage: userStorage.featureUsage,
        lastUpdated: userStorage.lastUpdated
      };
    } catch (error) {
      console.error('[QdrivePayment] Storage summary error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pricing information
   */
  async getPricingInfo() {
    try {
      const pricing = {
        storage: this.pricingConfig.storage,
        bandwidth: this.pricingConfig.bandwidth,
        premiumFeatures: {},
        subscriptions: {}
      };

      // Format premium features
      for (const [type, feature] of Object.entries(this.pricingConfig.premiumFeatures)) {
        pricing.premiumFeatures[type] = {
          name: feature.name,
          fee: feature.fee,
          description: feature.description
        };
      }

      // Format subscription plans
      for (const [id, plan] of this.subscriptionPlans.entries()) {
        pricing.subscriptions[id] = {
          name: plan.name,
          monthlyFee: plan.monthlyFee,
          yearlyFee: plan.monthlyFee * 12 * 0.85,
          features: plan.features
        };
      }

      return {
        success: true,
        pricing,
        currency: 'QToken',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('[QdrivePayment] Pricing info error:', error);
      return { success: false, error: error.message };
    }
  }

  // Event handlers

  async handleFileUploadRequest(event) {
    const quotaResult = await this.processStorageQuota(event.data);
    
    await this.eventBus.publish('q.qdrive.payment.quota.processed.v1', {
      actor: event.actor,
      data: {
        originalRequest: event.data,
        quotaResult
      }
    });
  }

  async handleQuotaCheckRequest(event) {
    const summary = await this.getStorageSummary(event.data.squidId);
    
    await this.eventBus.publish('q.qdrive.payment.summary.generated.v1', {
      actor: event.actor,
      data: summary
    });
  }

  async handlePremiumFeatureRequest(event) {
    const featureResult = await this.processPremiumFeature(event.data);
    
    await this.eventBus.publish('q.qdrive.payment.feature.processed.v1', {
      actor: event.actor,
      data: {
        originalRequest: event.data,
        featureResult
      }
    });
  }

  async handleSubscriptionRequest(event) {
    const subscriptionResult = await this.processSubscription(event.data);
    
    await this.eventBus.publish('q.qdrive.payment.subscription.processed.v1', {
      actor: event.actor,
      data: {
        originalRequest: event.data,
        subscriptionResult
      }
    });
  }

  // Background tasks

  startBackgroundTasks() {
    // Reset monthly usage counters
    setInterval(() => {
      this.resetMonthlyUsage();
    }, 24 * 60 * 60 * 1000); // Daily check

    // Send quota alerts
    setInterval(() => {
      this.checkQuotaAlerts();
    }, 60 * 60 * 1000); // Hourly check
  }

  async resetMonthlyUsage() {
    const now = new Date();
    if (now.getDate() === 1) { // First day of month
      for (const [squidId, storage] of this.userStorage.entries()) {
        storage.bandwidthUsed = 0;
        storage.featureUsage = {};
        storage.lastUpdated = now.toISOString();
      }
      console.log('[QdrivePayment] Monthly usage counters reset');
    }
  }

  async checkQuotaAlerts() {
    for (const [squidId, storage] of this.userStorage.entries()) {
      const subscriptionCheck = await this.checkSubscriptionQuota(squidId, storage.storageUsed);
      const usagePercentage = (storage.storageUsed / subscriptionCheck.quotaLimit) * 100;

      if (usagePercentage >= 90 && !this.quotaAlerts.has(squidId)) {
        // Send quota alert
        await this.eventBus.publish('q.qdrive.payment.quota.alert.v1', {
          actor: { squidId },
          data: {
            usagePercentage,
            storageUsed: storage.storageUsed,
            storageLimit: subscriptionCheck.quotaLimit,
            alertType: usagePercentage >= 95 ? 'critical' : 'warning'
          }
        });

        this.quotaAlerts.set(squidId, new Date().toISOString());
      } else if (usagePercentage < 80) {
        // Clear alert
        this.quotaAlerts.delete(squidId);
      }
    }
  }

  async healthCheck() {
    const qwalletHealth = await this.qwalletIntegration.healthCheck();
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      qwalletIntegration: qwalletHealth.status,
      userStorage: this.userStorage.size,
      subscriptionPlans: this.subscriptionPlans.size,
      quotaAlerts: this.quotaAlerts.size,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('[QdrivePayment] Shutting down...');
    await this.qwalletIntegration.shutdown();
    this.initialized = false;
    console.log('[QdrivePayment] Shutdown complete');
  }
}

export default QdrivePaymentService;