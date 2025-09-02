/**
 * Qmail Payment Service - Premium Messaging Payment Integration
 * 
 * Handles payment processing for premium messaging services including
 * certified delivery, priority messaging, and attachment fees.
 */

import crypto from 'crypto';
import { QwalletIntegrationService } from './QwalletIntegrationService.mjs';
import { EventBusService } from './EventBusService.mjs';

export class QmailPaymentService {
  constructor(options = {}) {
    this.qwalletIntegration = options.qwalletIntegration || new QwalletIntegrationService({
      sandboxMode: options.sandboxMode || false
    });
    this.eventBus = options.eventBus || new EventBusService();
    
    // Premium service configurations
    this.serviceConfigs = {
      premium: {
        name: 'Premium Message',
        description: 'Enhanced delivery with read receipts',
        baseFee: 0.01, // QToken per message
        features: ['read_receipts', 'delivery_confirmation', 'priority_routing']
      },
      certified: {
        name: 'Certified Message',
        description: 'Legally binding certified delivery',
        baseFee: 0.05, // QToken per message
        features: ['legal_certification', 'immutable_proof', 'timestamp_verification', 'digital_signature']
      },
      priority: {
        name: 'Priority Message',
        description: 'High-priority delivery with guaranteed SLA',
        baseFee: 0.02, // QToken per message
        multiplier: 2.0, // 2x base fee
        features: ['priority_queue', 'guaranteed_delivery', 'sla_monitoring']
      },
      bulk: {
        name: 'Bulk Messaging',
        description: 'Cost-effective bulk message delivery',
        baseFee: 0.005, // QToken per message
        minimumMessages: 100,
        discountTiers: [
          { threshold: 1000, discount: 0.1 }, // 10% off for 1000+
          { threshold: 10000, discount: 0.2 }, // 20% off for 10000+
          { threshold: 100000, discount: 0.3 } // 30% off for 100000+
        ]
      }
    };

    // Attachment pricing
    this.attachmentPricing = {
      baseFee: 0.001, // QToken per MB
      tiers: [
        { maxSize: 10, multiplier: 1.0 }, // Up to 10MB: 1x
        { maxSize: 100, multiplier: 1.5 }, // 10-100MB: 1.5x
        { maxSize: 1000, multiplier: 2.0 }, // 100MB-1GB: 2x
        { maxSize: Infinity, multiplier: 3.0 } // >1GB: 3x
      ]
    };

    // Message tracking
    this.messagePayments = new Map();
    this.paymentHistory = new Map();
    this.subscriptionPlans = new Map();

    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('[QmailPayment] Initializing...');

      // Initialize Qwallet integration
      await this.qwalletIntegration.initialize();

      // Initialize subscription plans
      this.initializeSubscriptionPlans();

      // Subscribe to message events
      await this.subscribeToMessageEvents();

      this.initialized = true;
      console.log('[QmailPayment] Initialized successfully');
    } catch (error) {
      console.error('[QmailPayment] Initialization failed:', error);
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
        name: 'Basic Plan',
        monthlyFee: 5.0, // QToken
        features: {
          premiumMessages: 100,
          certifiedMessages: 10,
          attachmentQuota: 1000, // MB
          priorityMessages: 0
        }
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        monthlyFee: 15.0, // QToken
        features: {
          premiumMessages: 500,
          certifiedMessages: 50,
          attachmentQuota: 5000, // MB
          priorityMessages: 20
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        monthlyFee: 50.0, // QToken
        features: {
          premiumMessages: 2000,
          certifiedMessages: 200,
          attachmentQuota: 20000, // MB
          priorityMessages: 100
        }
      }
    ];

    plans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });
  }

  /**
   * Subscribe to message-related events
   */
  async subscribeToMessageEvents() {
    const topics = [
      'q.qmail.message.send.requested.v1',
      'q.qmail.attachment.upload.requested.v1',
      'q.qmail.subscription.requested.v1'
    ];

    for (const topic of topics) {
      await this.eventBus.subscribe(topic, (event) => {
        this.handleMessageEvent(topic, event);
      });
    }
  }

  /**
   * Handle message events
   */
  async handleMessageEvent(topic, event) {
    try {
      console.log(`[QmailPayment] Handling event: ${topic}`);

      switch (topic) {
        case 'q.qmail.message.send.requested.v1':
          await this.handleMessageSendRequest(event);
          break;
        case 'q.qmail.attachment.upload.requested.v1':
          await this.handleAttachmentUploadRequest(event);
          break;
        case 'q.qmail.subscription.requested.v1':
          await this.handleSubscriptionRequest(event);
          break;
      }
    } catch (error) {
      console.error(`[QmailPayment] Error handling event ${topic}:`, error);
    }
  }

  /**
   * Process premium message payment
   */
  async processPremiumMessage(messageData) {
    try {
      const {
        squidId,
        messageId,
        serviceType = 'premium', // premium, certified, priority, bulk
        recipients = [],
        attachments = [],
        priority = 'normal',
        subscriptionPlan = null
      } = messageData;

      // Validate service type
      if (!this.serviceConfigs[serviceType]) {
        throw new Error(`Invalid service type: ${serviceType}`);
      }

      // Calculate message fees
      const messageFee = await this.calculateMessageFee({
        serviceType,
        recipientCount: recipients.length,
        priority,
        subscriptionPlan
      });

      // Calculate attachment fees
      const attachmentFee = await this.calculateAttachmentFee(attachments);

      const totalFee = messageFee + attachmentFee;

      // Check subscription allowances
      const subscriptionCheck = await this.checkSubscriptionAllowance(squidId, {
        serviceType,
        recipientCount: recipients.length,
        attachmentSize: attachments.reduce((sum, att) => sum + (att.size || 0), 0)
      });

      let paymentRequired = true;
      let discountApplied = 0;

      if (subscriptionCheck.covered) {
        paymentRequired = false;
        await this.deductSubscriptionAllowance(squidId, subscriptionCheck.deductions);
      } else if (subscriptionCheck.partialCoverage) {
        discountApplied = subscriptionCheck.discount;
        totalFee -= discountApplied;
      }

      let paymentResult = { success: true, paymentRequired: false };

      if (paymentRequired && totalFee > 0) {
        // Process payment through Qwallet integration
        paymentResult = await this.qwalletIntegration.processQmailPayment({
          squidId,
          messageType: serviceType,
          messageSize: messageData.messageSize || 0,
          attachmentSize: attachments.reduce((sum, att) => sum + (att.size || 0), 0) / (1024 * 1024), // Convert to MB
          recipientCount: recipients.length,
          priority
        });
      }

      // Create payment record
      const paymentRecord = {
        messageId,
        squidId,
        serviceType,
        recipients: recipients.length,
        messageFee,
        attachmentFee,
        totalFee,
        discountApplied,
        paymentRequired,
        paymentResult,
        subscriptionUsed: subscriptionCheck.covered || subscriptionCheck.partialCoverage,
        createdAt: new Date().toISOString()
      };

      this.messagePayments.set(messageId, paymentRecord);

      // Update payment history
      if (!this.paymentHistory.has(squidId)) {
        this.paymentHistory.set(squidId, []);
      }
      this.paymentHistory.get(squidId).push({
        messageId,
        serviceType,
        amount: totalFee,
        timestamp: new Date().toISOString()
      });

      // Publish payment processed event
      await this.eventBus.publish('q.qmail.payment.processed.v1', {
        actor: { squidId },
        data: {
          messageId,
          serviceType,
          totalFee,
          paymentRequired,
          paymentResult: paymentResult.success,
          subscriptionUsed: paymentRecord.subscriptionUsed
        }
      });

      return {
        success: true,
        messageId,
        serviceType,
        totalFee,
        messageFee,
        attachmentFee,
        discountApplied,
        paymentRequired,
        paymentResult,
        features: this.serviceConfigs[serviceType].features
      };
    } catch (error) {
      console.error('[QmailPayment] Premium message processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate message fee
   */
  async calculateMessageFee(options) {
    const { serviceType, recipientCount, priority, subscriptionPlan } = options;
    const config = this.serviceConfigs[serviceType];
    
    let baseFee = config.baseFee * recipientCount;

    // Apply priority multiplier
    if (priority === 'high' && config.multiplier) {
      baseFee *= config.multiplier;
    }

    // Apply bulk discounts
    if (serviceType === 'bulk' && recipientCount >= config.minimumMessages) {
      for (const tier of config.discountTiers) {
        if (recipientCount >= tier.threshold) {
          baseFee *= (1 - tier.discount);
        }
      }
    }

    return baseFee;
  }

  /**
   * Calculate attachment fee
   */
  async calculateAttachmentFee(attachments) {
    if (!attachments || attachments.length === 0) {
      return 0;
    }

    let totalFee = 0;

    for (const attachment of attachments) {
      const sizeInMB = (attachment.size || 0) / (1024 * 1024);
      let multiplier = 1.0;

      // Find appropriate tier
      for (const tier of this.attachmentPricing.tiers) {
        if (sizeInMB <= tier.maxSize) {
          multiplier = tier.multiplier;
          break;
        }
      }

      totalFee += sizeInMB * this.attachmentPricing.baseFee * multiplier;
    }

    return totalFee;
  }

  /**
   * Check subscription allowance
   */
  async checkSubscriptionAllowance(squidId, usage) {
    // In a real implementation, this would check the user's subscription status
    // For now, return mock data
    return {
      covered: false,
      partialCoverage: false,
      discount: 0,
      deductions: {}
    };
  }

  /**
   * Deduct subscription allowance
   */
  async deductSubscriptionAllowance(squidId, deductions) {
    // In a real implementation, this would update the user's subscription usage
    console.log(`[QmailPayment] Deducting subscription allowance for ${squidId}:`, deductions);
  }

  /**
   * Process subscription payment
   */
  async processSubscription(subscriptionData) {
    try {
      const {
        squidId,
        planId,
        billingPeriod = 'monthly' // monthly, yearly
      } = subscriptionData;

      const plan = this.subscriptionPlans.get(planId);
      if (!plan) {
        throw new Error(`Invalid subscription plan: ${planId}`);
      }

      let amount = plan.monthlyFee;
      if (billingPeriod === 'yearly') {
        amount = plan.monthlyFee * 12 * 0.9; // 10% discount for yearly
      }

      // Process payment through Qwallet integration
      const paymentResult = await this.qwalletIntegration.createPaymentIntent({
        squidId,
        amount,
        currency: 'QToken',
        purpose: `qmail_subscription_${planId}_${billingPeriod}`,
        metadata: {
          planId,
          billingPeriod,
          features: plan.features,
          module: 'qmail'
        }
      });

      // Publish subscription event
      await this.eventBus.publish('q.qmail.subscription.payment.created.v1', {
        actor: { squidId },
        data: {
          planId,
          billingPeriod,
          amount,
          paymentResult
        }
      });

      return {
        success: true,
        planId,
        billingPeriod,
        amount,
        features: plan.features,
        paymentResult
      };
    } catch (error) {
      console.error('[QmailPayment] Subscription processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message payment status
   */
  async getMessagePaymentStatus(messageId) {
    try {
      const payment = this.messagePayments.get(messageId);
      if (!payment) {
        return { success: false, error: 'Payment record not found' };
      }

      return {
        success: true,
        messageId,
        serviceType: payment.serviceType,
        totalFee: payment.totalFee,
        paymentRequired: payment.paymentRequired,
        paymentStatus: payment.paymentResult?.success ? 'COMPLETED' : 'PENDING',
        subscriptionUsed: payment.subscriptionUsed,
        createdAt: payment.createdAt
      };
    } catch (error) {
      console.error('[QmailPayment] Get payment status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user payment history
   */
  async getPaymentHistory(squidId, options = {}) {
    try {
      const { limit = 50, offset = 0, serviceType } = options;
      
      const history = this.paymentHistory.get(squidId) || [];
      
      let filteredHistory = history;
      if (serviceType) {
        filteredHistory = history.filter(h => h.serviceType === serviceType);
      }

      // Sort by timestamp (newest first)
      filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const paginatedHistory = filteredHistory.slice(offset, offset + limit);

      // Calculate summary
      const summary = {
        totalPayments: filteredHistory.length,
        totalAmount: filteredHistory.reduce((sum, h) => sum + h.amount, 0),
        byServiceType: {}
      };

      filteredHistory.forEach(h => {
        if (!summary.byServiceType[h.serviceType]) {
          summary.byServiceType[h.serviceType] = { count: 0, amount: 0 };
        }
        summary.byServiceType[h.serviceType].count++;
        summary.byServiceType[h.serviceType].amount += h.amount;
      });

      return {
        success: true,
        squidId,
        history: paginatedHistory,
        summary,
        pagination: {
          total: filteredHistory.length,
          limit,
          offset,
          hasMore: filteredHistory.length > offset + limit
        }
      };
    } catch (error) {
      console.error('[QmailPayment] Get payment history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service pricing
   */
  async getServicePricing() {
    try {
      const pricing = {
        services: {},
        attachments: this.attachmentPricing,
        subscriptions: {}
      };

      // Format service configurations
      for (const [type, config] of Object.entries(this.serviceConfigs)) {
        pricing.services[type] = {
          name: config.name,
          description: config.description,
          baseFee: config.baseFee,
          features: config.features,
          multiplier: config.multiplier,
          discountTiers: config.discountTiers
        };
      }

      // Format subscription plans
      for (const [id, plan] of this.subscriptionPlans.entries()) {
        pricing.subscriptions[id] = {
          name: plan.name,
          monthlyFee: plan.monthlyFee,
          yearlyFee: plan.monthlyFee * 12 * 0.9, // 10% discount
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
      console.error('[QmailPayment] Get service pricing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Event handlers

  async handleMessageSendRequest(event) {
    const paymentResult = await this.processPremiumMessage(event.data);
    
    await this.eventBus.publish('q.qmail.payment.message.processed.v1', {
      actor: event.actor,
      data: {
        originalRequest: event.data,
        paymentResult
      }
    });
  }

  async handleAttachmentUploadRequest(event) {
    const attachmentFee = await this.calculateAttachmentFee([event.data]);
    
    await this.eventBus.publish('q.qmail.payment.attachment.calculated.v1', {
      actor: event.actor,
      data: {
        attachmentId: event.data.attachmentId,
        size: event.data.size,
        fee: attachmentFee
      }
    });
  }

  async handleSubscriptionRequest(event) {
    const subscriptionResult = await this.processSubscription(event.data);
    
    await this.eventBus.publish('q.qmail.payment.subscription.processed.v1', {
      actor: event.actor,
      data: {
        originalRequest: event.data,
        subscriptionResult
      }
    });
  }

  async healthCheck() {
    const qwalletHealth = await this.qwalletIntegration.healthCheck();
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      qwalletIntegration: qwalletHealth.status,
      messagePayments: this.messagePayments.size,
      subscriptionPlans: this.subscriptionPlans.size,
      serviceTypes: Object.keys(this.serviceConfigs).length,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('[QmailPayment] Shutting down...');
    await this.qwalletIntegration.shutdown();
    this.initialized = false;
    console.log('[QmailPayment] Shutdown complete');
  }
}

export default QmailPaymentService;