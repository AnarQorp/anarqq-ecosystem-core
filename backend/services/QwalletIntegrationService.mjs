/**
 * Qwallet Integration Service - Cross-Module Payment Integration
 * 
 * Provides centralized payment integration across all ecosystem modules
 * with automated revenue distribution, audit trails, and settlement reconciliation.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';

export class QwalletIntegrationService {
  constructor(options = {}) {
    this.mode = options.mode || 'integrated';
    this.sandboxMode = options.sandboxMode || false;
    this.eventBus = options.eventBus || new EventBusService();
    this.observability = options.observability || new ObservabilityService();
    
    // Payment configurations
    this.paymentConfigs = {
      qmail: {
        premiumMessageFee: 0.01, // QToken per premium message
        certifiedMessageFee: 0.05, // QToken per certified message
        attachmentFee: 0.001, // QToken per MB
        priorityMultiplier: 2.0, // 2x fee for priority messages
        revenueShare: {
          platform: 0.3, // 30% to platform
          sender: 0.0,    // 0% to sender (they pay)
          network: 0.7    // 70% to network validators
        }
      },
      qmarket: {
        listingFee: 0.1, // QToken per listing
        transactionFee: 0.025, // 2.5% of sale price
        nftMintingFee: 0.05, // QToken per NFT mint
        revenueShare: {
          platform: 0.25, // 25% to platform
          seller: 0.70,    // 70% to seller
          creator: 0.05    // 5% to original creator (if resale)
        }
      },
      qdrive: {
        storageBaseFee: 0.001, // QToken per GB per month
        bandwidthFee: 0.0001, // QToken per GB transfer
        premiumFeatures: {
          encryption: 0.01, // QToken per file
          sharing: 0.005,   // QToken per share
          versioning: 0.002 // QToken per version
        },
        quotaLimits: {
          free: 1, // 1 GB free
          basic: 10, // 10 GB for basic plan
          premium: 100, // 100 GB for premium plan
          enterprise: 1000 // 1 TB for enterprise plan
        },
        revenueShare: {
          platform: 0.4, // 40% to platform
          storage: 0.6   // 60% to storage providers
        }
      }
    };

    // Payment tracking
    this.paymentIntents = new Map();
    this.settlements = new Map();
    this.auditTrail = new Map();
    this.revenueDistributions = new Map();

    // Sandbox data
    this.sandboxWallets = new Map();
    this.sandboxTransactions = new Map();

    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('[QwalletIntegration] Initializing...');

      // Initialize sandbox mode if enabled
      if (this.sandboxMode) {
        await this.initializeSandboxMode();
      }

      // Subscribe to payment events
      await this.subscribeToPaymentEvents();

      // Start background tasks
      this.startBackgroundTasks();

      this.initialized = true;
      console.log('[QwalletIntegration] Initialized successfully');
    } catch (error) {
      console.error('[QwalletIntegration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize sandbox mode with test data
   */
  async initializeSandboxMode() {
    console.log('[QwalletIntegration] Initializing sandbox mode...');

    // Create test wallets with balances
    const testWallets = [
      { squidId: 'did:squid:alice123', balance: { QToken: 1000, PI: 50 } },
      { squidId: 'did:squid:bob456', balance: { QToken: 500, PI: 25 } },
      { squidId: 'did:squid:charlie789', balance: { QToken: 2000, PI: 100 } },
      { squidId: 'did:squid:platform', balance: { QToken: 10000, PI: 500 } }
    ];

    for (const wallet of testWallets) {
      this.sandboxWallets.set(wallet.squidId, {
        squidId: wallet.squidId,
        address: this.generateWalletAddress(wallet.squidId),
        balances: wallet.balance,
        transactions: [],
        createdAt: new Date().toISOString()
      });
    }

    console.log('[QwalletIntegration] Sandbox mode initialized with test wallets');
  }

  /**
   * Subscribe to payment-related events from other modules
   */
  async subscribeToPaymentEvents() {
    const topics = [
      'q.qmail.premium.requested.v1',
      'q.qmarket.purchase.initiated.v1',
      'q.qdrive.storage.quota.exceeded.v1',
      'q.qwallet.tx.settled.v1',
      'q.qwallet.balance.updated.v1'
    ];

    for (const topic of topics) {
      await this.eventBus.subscribe(topic, (event) => {
        this.handlePaymentEvent(topic, event);
      });
    }
  }

  /**
   * Handle payment events from other modules
   */
  async handlePaymentEvent(topic, event) {
    try {
      console.log(`[QwalletIntegration] Handling event: ${topic}`);

      switch (topic) {
        case 'q.qmail.premium.requested.v1':
          await this.handleQmailPremiumRequest(event);
          break;
        case 'q.qmarket.purchase.initiated.v1':
          await this.handleQmarketPurchase(event);
          break;
        case 'q.qdrive.storage.quota.exceeded.v1':
          await this.handleQdriveQuotaExceeded(event);
          break;
        case 'q.qwallet.tx.settled.v1':
          await this.handleTransactionSettled(event);
          break;
        case 'q.qwallet.balance.updated.v1':
          await this.handleBalanceUpdated(event);
          break;
      }
    } catch (error) {
      console.error(`[QwalletIntegration] Error handling event ${topic}:`, error);
      await this.auditLog({
        action: 'EVENT_HANDLING_ERROR',
        topic,
        error: error.message,
        event
      });
    }
  }

  /**
   * Process Qmail premium message payment
   */
  async processQmailPayment(paymentData) {
    try {
      const {
        squidId,
        messageType = 'premium', // premium, certified, priority
        messageSize = 0, // in bytes
        attachmentSize = 0, // in MB
        recipientCount = 1,
        priority = 'normal'
      } = paymentData;

      // Calculate fees
      const config = this.paymentConfigs.qmail;
      let totalFee = 0;

      switch (messageType) {
        case 'premium':
          totalFee = config.premiumMessageFee * recipientCount;
          break;
        case 'certified':
          totalFee = config.certifiedMessageFee * recipientCount;
          break;
        default:
          totalFee = config.premiumMessageFee * recipientCount;
      }

      // Add attachment fees
      if (attachmentSize > 0) {
        totalFee += config.attachmentFee * attachmentSize;
      }

      // Apply priority multiplier
      if (priority === 'high') {
        totalFee *= config.priorityMultiplier;
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        squidId,
        amount: totalFee,
        currency: 'QToken',
        purpose: `qmail_${messageType}_message`,
        metadata: {
          messageType,
          messageSize,
          attachmentSize,
          recipientCount,
          priority,
          module: 'qmail'
        }
      });

      // Process payment if in sandbox mode
      if (this.sandboxMode) {
        const paymentResult = await this.processSandboxPayment(paymentIntent);
        if (paymentResult.success) {
          await this.distributeQmailRevenue(paymentIntent, totalFee);
        }
        return paymentResult;
      }

      return paymentIntent;
    } catch (error) {
      console.error('[QwalletIntegration] Qmail payment processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process Qmarket transaction payment
   */
  async processQmarketPayment(paymentData) {
    try {
      const {
        squidId, // buyer
        sellerId,
        listingId,
        salePrice,
        currency = 'QToken',
        isResale = false,
        originalCreatorId = null,
        nftMinting = false
      } = paymentData;

      const config = this.paymentConfigs.qmarket;
      
      // Calculate transaction fee
      const transactionFee = salePrice * config.transactionFee;
      let totalFees = transactionFee;

      // Add listing fee if applicable
      if (nftMinting) {
        totalFees += config.nftMintingFee;
      }

      // Total amount buyer pays
      const totalAmount = salePrice + totalFees;

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        squidId,
        amount: totalAmount,
        currency,
        purpose: 'qmarket_purchase',
        metadata: {
          listingId,
          sellerId,
          salePrice,
          transactionFee,
          isResale,
          originalCreatorId,
          nftMinting,
          module: 'qmarket'
        }
      });

      // Process payment if in sandbox mode
      if (this.sandboxMode) {
        const paymentResult = await this.processSandboxPayment(paymentIntent);
        if (paymentResult.success) {
          await this.distributeQmarketRevenue(paymentIntent, salePrice, totalFees);
        }
        return paymentResult;
      }

      return paymentIntent;
    } catch (error) {
      console.error('[QwalletIntegration] Qmarket payment processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process Qdrive storage payment
   */
  async processQdrivePayment(paymentData) {
    try {
      const {
        squidId,
        storageUsed, // in GB
        bandwidthUsed = 0, // in GB
        premiumFeatures = [],
        billingPeriod = 'monthly'
      } = paymentData;

      const config = this.paymentConfigs.qdrive;
      
      // Calculate storage fees
      let storageFee = Math.max(0, storageUsed - config.quotaLimits.free) * config.storageBaseFee;
      
      // Calculate bandwidth fees
      const bandwidthFee = bandwidthUsed * config.bandwidthFee;
      
      // Calculate premium feature fees
      let premiumFee = 0;
      for (const feature of premiumFeatures) {
        if (config.premiumFeatures[feature]) {
          premiumFee += config.premiumFeatures[feature];
        }
      }

      const totalFee = storageFee + bandwidthFee + premiumFee;

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        squidId,
        amount: totalFee,
        currency: 'QToken',
        purpose: 'qdrive_storage',
        metadata: {
          storageUsed,
          bandwidthUsed,
          premiumFeatures,
          billingPeriod,
          storageFee,
          bandwidthFee,
          premiumFee,
          module: 'qdrive'
        }
      });

      // Process payment if in sandbox mode
      if (this.sandboxMode) {
        const paymentResult = await this.processSandboxPayment(paymentIntent);
        if (paymentResult.success) {
          await this.distributeQdriveRevenue(paymentIntent, totalFee);
        }
        return paymentResult;
      }

      return paymentIntent;
    } catch (error) {
      console.error('[QwalletIntegration] Qdrive payment processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(data) {
    const intentId = `intent_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();
    
    const intent = {
      intentId,
      squidId: data.squidId,
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      metadata: data.metadata,
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3600000).toISOString(), // 1 hour
      module: data.metadata?.module || 'unknown'
    };

    this.paymentIntents.set(intentId, intent);

    // Audit log
    await this.auditLog({
      action: 'PAYMENT_INTENT_CREATED',
      squidId: data.squidId,
      intentId,
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      module: intent.module
    });

    // Publish event
    await this.eventBus.publish('q.qwallet.integration.intent.created.v1', {
      actor: { squidId: data.squidId },
      data: {
        intentId,
        amount: data.amount,
        currency: data.currency,
        purpose: data.purpose,
        module: intent.module,
        expiresAt: intent.expiresAt
      }
    });

    return {
      success: true,
      intentId,
      amount: data.amount,
      currency: data.currency,
      status: 'PENDING',
      expiresAt: intent.expiresAt
    };
  }

  /**
   * Process sandbox payment (for testing)
   */
  async processSandboxPayment(paymentIntent) {
    try {
      const wallet = this.sandboxWallets.get(paymentIntent.squidId);
      if (!wallet) {
        throw new Error('Sandbox wallet not found');
      }

      const balance = wallet.balances[paymentIntent.currency] || 0;
      if (balance < paymentIntent.amount) {
        throw new Error(`Insufficient balance: ${balance} ${paymentIntent.currency}, required: ${paymentIntent.amount}`);
      }

      // Deduct amount from wallet
      wallet.balances[paymentIntent.currency] -= paymentIntent.amount;

      // Create transaction record
      const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;
      const transaction = {
        transactionId,
        intentId: paymentIntent.intentId,
        squidId: paymentIntent.squidId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        purpose: paymentIntent.purpose,
        status: 'SETTLED',
        settledAt: new Date().toISOString(),
        metadata: paymentIntent.metadata
      };

      this.sandboxTransactions.set(transactionId, transaction);
      wallet.transactions.push(transactionId);

      // Update payment intent
      const intent = this.paymentIntents.get(paymentIntent.intentId);
      intent.status = 'SETTLED';
      intent.transactionId = transactionId;
      intent.settledAt = transaction.settledAt;

      // Audit log
      await this.auditLog({
        action: 'SANDBOX_PAYMENT_PROCESSED',
        squidId: paymentIntent.squidId,
        transactionId,
        intentId: paymentIntent.intentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        newBalance: wallet.balances[paymentIntent.currency]
      });

      // Publish settlement event
      await this.eventBus.publish('q.qwallet.integration.payment.settled.v1', {
        actor: { squidId: paymentIntent.squidId },
        data: {
          transactionId,
          intentId: paymentIntent.intentId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          purpose: paymentIntent.purpose,
          module: intent.module,
          settledAt: transaction.settledAt
        }
      });

      return {
        success: true,
        transactionId,
        status: 'SETTLED',
        settledAt: transaction.settledAt
      };
    } catch (error) {
      console.error('[QwalletIntegration] Sandbox payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Distribute Qmail revenue
   */
  async distributeQmailRevenue(paymentIntent, totalFee) {
    const config = this.paymentConfigs.qmail.revenueShare;
    const distributionId = `dist_${crypto.randomBytes(16).toString('hex')}`;

    const distribution = {
      distributionId,
      intentId: paymentIntent.intentId,
      module: 'qmail',
      totalAmount: totalFee,
      distributions: [
        {
          recipient: 'platform',
          amount: totalFee * config.platform,
          percentage: config.platform
        },
        {
          recipient: 'network',
          amount: totalFee * config.network,
          percentage: config.network
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.revenueDistributions.set(distributionId, distribution);

    // In sandbox mode, credit platform wallet
    if (this.sandboxMode) {
      const platformWallet = this.sandboxWallets.get('did:squid:platform');
      if (platformWallet) {
        platformWallet.balances[paymentIntent.currency] += totalFee * config.platform;
      }
    }

    await this.auditLog({
      action: 'REVENUE_DISTRIBUTED',
      module: 'qmail',
      distributionId,
      totalAmount: totalFee,
      distributions: distribution.distributions
    });

    return distribution;
  }

  /**
   * Distribute Qmarket revenue
   */
  async distributeQmarketRevenue(paymentIntent, salePrice, totalFees) {
    const config = this.paymentConfigs.qmarket.revenueShare;
    const distributionId = `dist_${crypto.randomBytes(16).toString('hex')}`;
    const { sellerId, originalCreatorId, isResale } = paymentIntent.metadata;

    const distributions = [
      {
        recipient: 'platform',
        squidId: 'did:squid:platform',
        amount: totalFees * config.platform,
        percentage: config.platform
      },
      {
        recipient: 'seller',
        squidId: sellerId,
        amount: salePrice * config.seller,
        percentage: config.seller
      }
    ];

    // Add creator royalty for resales
    if (isResale && originalCreatorId && originalCreatorId !== sellerId) {
      const creatorAmount = salePrice * config.creator;
      distributions[1].amount -= creatorAmount; // Reduce seller amount
      distributions.push({
        recipient: 'creator',
        squidId: originalCreatorId,
        amount: creatorAmount,
        percentage: config.creator
      });
    }

    const distribution = {
      distributionId,
      intentId: paymentIntent.intentId,
      module: 'qmarket',
      totalAmount: salePrice + totalFees,
      salePrice,
      totalFees,
      distributions,
      createdAt: new Date().toISOString()
    };

    this.revenueDistributions.set(distributionId, distribution);

    // In sandbox mode, credit wallets
    if (this.sandboxMode) {
      for (const dist of distributions) {
        if (dist.squidId) {
          const wallet = this.sandboxWallets.get(dist.squidId);
          if (wallet) {
            wallet.balances[paymentIntent.currency] += dist.amount;
          }
        }
      }
    }

    await this.auditLog({
      action: 'REVENUE_DISTRIBUTED',
      module: 'qmarket',
      distributionId,
      salePrice,
      totalFees,
      distributions
    });

    return distribution;
  }

  /**
   * Distribute Qdrive revenue
   */
  async distributeQdriveRevenue(paymentIntent, totalFee) {
    const config = this.paymentConfigs.qdrive.revenueShare;
    const distributionId = `dist_${crypto.randomBytes(16).toString('hex')}`;

    const distribution = {
      distributionId,
      intentId: paymentIntent.intentId,
      module: 'qdrive',
      totalAmount: totalFee,
      distributions: [
        {
          recipient: 'platform',
          amount: totalFee * config.platform,
          percentage: config.platform
        },
        {
          recipient: 'storage',
          amount: totalFee * config.storage,
          percentage: config.storage
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.revenueDistributions.set(distributionId, distribution);

    // In sandbox mode, credit platform wallet
    if (this.sandboxMode) {
      const platformWallet = this.sandboxWallets.get('did:squid:platform');
      if (platformWallet) {
        platformWallet.balances[paymentIntent.currency] += totalFee * config.platform;
      }
    }

    await this.auditLog({
      action: 'REVENUE_DISTRIBUTED',
      module: 'qdrive',
      distributionId,
      totalAmount: totalFee,
      distributions: distribution.distributions
    });

    return distribution;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(intentId) {
    try {
      const intent = this.paymentIntents.get(intentId);
      if (!intent) {
        return { success: false, error: 'Payment intent not found' };
      }

      return {
        success: true,
        intentId,
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
        purpose: intent.purpose,
        module: intent.module,
        createdAt: intent.createdAt,
        settledAt: intent.settledAt,
        transactionId: intent.transactionId
      };
    } catch (error) {
      console.error('[QwalletIntegration] Get payment status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sandbox wallet balance
   */
  async getSandboxBalance(squidId) {
    if (!this.sandboxMode) {
      return { success: false, error: 'Not in sandbox mode' };
    }

    const wallet = this.sandboxWallets.get(squidId);
    if (!wallet) {
      return { success: false, error: 'Sandbox wallet not found' };
    }

    return {
      success: true,
      squidId,
      balances: wallet.balances,
      address: wallet.address,
      transactionCount: wallet.transactions.length
    };
  }

  /**
   * Get settlement reconciliation report
   */
  async getSettlementReport(options = {}) {
    try {
      const { module, startDate, endDate, limit = 100 } = options;
      
      let settlements = Array.from(this.revenueDistributions.values());

      // Apply filters
      if (module) {
        settlements = settlements.filter(s => s.module === module);
      }

      if (startDate) {
        settlements = settlements.filter(s => new Date(s.createdAt) >= new Date(startDate));
      }

      if (endDate) {
        settlements = settlements.filter(s => new Date(s.createdAt) <= new Date(endDate));
      }

      // Sort by creation date (newest first)
      settlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply limit
      settlements = settlements.slice(0, limit);

      // Calculate summary
      const summary = {
        totalSettlements: settlements.length,
        totalAmount: settlements.reduce((sum, s) => sum + s.totalAmount, 0),
        byModule: {},
        byRecipient: {}
      };

      settlements.forEach(settlement => {
        // By module
        if (!summary.byModule[settlement.module]) {
          summary.byModule[settlement.module] = { count: 0, amount: 0 };
        }
        summary.byModule[settlement.module].count++;
        summary.byModule[settlement.module].amount += settlement.totalAmount;

        // By recipient
        settlement.distributions.forEach(dist => {
          if (!summary.byRecipient[dist.recipient]) {
            summary.byRecipient[dist.recipient] = { count: 0, amount: 0 };
          }
          summary.byRecipient[dist.recipient].count++;
          summary.byRecipient[dist.recipient].amount += dist.amount;
        });
      });

      return {
        success: true,
        summary,
        settlements,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[QwalletIntegration] Settlement report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(options = {}) {
    try {
      const { squidId, action, module, startDate, endDate, limit = 100 } = options;
      
      let auditEvents = Array.from(this.auditTrail.values());

      // Apply filters
      if (squidId) {
        auditEvents = auditEvents.filter(e => e.squidId === squidId);
      }

      if (action) {
        auditEvents = auditEvents.filter(e => e.action === action);
      }

      if (module) {
        auditEvents = auditEvents.filter(e => e.module === module);
      }

      if (startDate) {
        auditEvents = auditEvents.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }

      if (endDate) {
        auditEvents = auditEvents.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }

      // Sort by timestamp (newest first)
      auditEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply limit
      auditEvents = auditEvents.slice(0, limit);

      return {
        success: true,
        auditEvents,
        total: auditEvents.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[QwalletIntegration] Audit trail error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods

  generateWalletAddress(squidId) {
    const hash = crypto.createHash('sha256').update(`wallet_${squidId}`).digest('hex');
    return `0x${hash.substring(0, 40)}`;
  }

  async auditLog(event) {
    const auditId = `audit_${crypto.randomBytes(16).toString('hex')}`;
    const auditEvent = {
      auditId,
      timestamp: new Date().toISOString(),
      service: 'qwallet-integration',
      ...event
    };

    this.auditTrail.set(auditId, auditEvent);

    // Publish audit event
    await this.eventBus.publish('q.qwallet.integration.audit.v1', {
      actor: { squidId: event.squidId || 'system' },
      data: auditEvent
    });
  }

  startBackgroundTasks() {
    // Clean up expired payment intents every 5 minutes
    setInterval(() => {
      this.cleanupExpiredIntents();
    }, 300000);

    // Generate settlement reports every hour
    setInterval(() => {
      this.generateHourlySettlementReport();
    }, 3600000);
  }

  cleanupExpiredIntents() {
    const now = new Date();
    let expiredCount = 0;

    for (const [intentId, intent] of this.paymentIntents.entries()) {
      if (new Date(intent.expiresAt) < now && intent.status === 'PENDING') {
        intent.status = 'EXPIRED';
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[QwalletIntegration] Expired ${expiredCount} payment intents`);
    }
  }

  async generateHourlySettlementReport() {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 3600000); // 1 hour ago

      const report = await this.getSettlementReport({
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString()
      });

      if (report.success && report.settlements.length > 0) {
        await this.eventBus.publish('q.qwallet.integration.settlement.report.v1', {
          actor: { squidId: 'system' },
          data: {
            period: 'hourly',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            summary: report.summary,
            settlementCount: report.settlements.length
          }
        });
      }
    } catch (error) {
      console.error('[QwalletIntegration] Hourly settlement report error:', error);
    }
  }

  async handleQmailPremiumRequest(event) {
    // Handle premium message request from Qmail
    const paymentResult = await this.processQmailPayment(event.data);
    
    await this.eventBus.publish('q.qwallet.integration.qmail.payment.processed.v1', {
      actor: event.actor,
      data: {
        originalEvent: event.data,
        paymentResult
      }
    });
  }

  async handleQmarketPurchase(event) {
    // Handle purchase from Qmarket
    const paymentResult = await this.processQmarketPayment(event.data);
    
    await this.eventBus.publish('q.qwallet.integration.qmarket.payment.processed.v1', {
      actor: event.actor,
      data: {
        originalEvent: event.data,
        paymentResult
      }
    });
  }

  async handleQdriveQuotaExceeded(event) {
    // Handle storage quota exceeded from Qdrive
    const paymentResult = await this.processQdrivePayment(event.data);
    
    await this.eventBus.publish('q.qwallet.integration.qdrive.payment.processed.v1', {
      actor: event.actor,
      data: {
        originalEvent: event.data,
        paymentResult
      }
    });
  }

  async handleTransactionSettled(event) {
    // Update local records when Qwallet transaction is settled
    const { transactionId, intentId } = event.data;
    
    if (intentId && this.paymentIntents.has(intentId)) {
      const intent = this.paymentIntents.get(intentId);
      intent.status = 'SETTLED';
      intent.transactionId = transactionId;
      intent.settledAt = new Date().toISOString();
    }
  }

  async handleBalanceUpdated(event) {
    // Update sandbox balances if applicable
    if (this.sandboxMode) {
      const { squidId, currency, newBalance } = event.data;
      const wallet = this.sandboxWallets.get(squidId);
      if (wallet) {
        wallet.balances[currency] = newBalance;
      }
    }
  }

  async healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      mode: this.mode,
      sandboxMode: this.sandboxMode,
      paymentIntents: this.paymentIntents.size,
      settlements: this.revenueDistributions.size,
      auditEvents: this.auditTrail.size,
      sandboxWallets: this.sandboxWallets.size,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('[QwalletIntegration] Shutting down...');
    this.initialized = false;
    console.log('[QwalletIntegration] Shutdown complete');
  }
}

export default QwalletIntegrationService;