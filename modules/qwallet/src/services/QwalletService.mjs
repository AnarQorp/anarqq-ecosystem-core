/**
 * Qwallet Service - Core Payment and Wallet Management
 * 
 * Provides comprehensive payment processing, multi-chain support,
 * Pi Wallet integration, and transaction audit logging.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class QwalletService {
  constructor(options = {}) {
    this.mode = options.mode || 'standalone';
    this.eventBus = options.eventBus;
    this.mockServices = options.mockServices;
    this.config = {
      piNetworkEnabled: true,
      defaultCurrency: 'QToken',
      maxTransactionAmount: 10000,
      feeCalculationMode: 'dynamic',
      dailyLimit: 1000,
      monthlyLimit: 10000,
      daoLimit: 50000,
      ...options.config
    };

    // In-memory storage (replace with database in production)
    this.wallets = new Map();
    this.paymentIntents = new Map();
    this.transactions = new Map();
    this.spendingLimits = new Map();
    this.feeCache = new Map();

    // Supported currencies and networks
    this.supportedCurrencies = {
      'QToken': {
        symbol: '$QToken',
        decimals: 18,
        networks: ['anarq-chain', 'ethereum'],
        contractAddress: '0x1234567890123456789012345678901234567890'
      },
      'PI': {
        symbol: '$PI',
        decimals: 8,
        networks: ['pi-network'],
        contractAddress: 'pi:native'
      }
    };

    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('[QwalletService] Initializing...');

      // Initialize default wallets for testing
      if (this.mode === 'standalone') {
        await this.initializeTestData();
      }

      // Start background tasks
      this.startBackgroundTasks();

      this.initialized = true;
      console.log('[QwalletService] Initialized successfully');
    } catch (error) {
      console.error('[QwalletService] Initialization failed:', error);
      throw error;
    }
  }

  async initializeTestData() {
    // Create test wallets
    const testIdentities = [
      'did:squid:alice123',
      'did:squid:bob456',
      'did:squid:charlie789'
    ];

    for (const squidId of testIdentities) {
      await this.createWallet(squidId, {
        initialBalances: {
          QToken: 1000,
          PI: 50
        }
      });
    }

    console.log('[QwalletService] Test data initialized');
  }

  startBackgroundTasks() {
    // Clean up expired payment intents every minute
    setInterval(() => {
      this.cleanupExpiredIntents();
    }, 60000);

    // Reset daily spending limits at midnight
    setInterval(() => {
      this.resetDailyLimits();
    }, 3600000); // Check every hour

    // Cache cleanup every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 300000);
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(data) {
    try {
      const {
        squidId,
        subId,
        amount,
        currency = this.config.defaultCurrency,
        recipient,
        purpose,
        metadata = {},
        expiresIn = 3600 // 1 hour default
      } = data;

      // Validate input
      if (!squidId || !amount || !currency || !recipient) {
        throw new Error('Missing required fields: squidId, amount, currency, recipient');
      }

      if (amount <= 0 || amount > this.config.maxTransactionAmount) {
        throw new Error(`Invalid amount: must be between 0 and ${this.config.maxTransactionAmount}`);
      }

      if (!this.supportedCurrencies[currency]) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      // Check wallet exists and has sufficient balance
      const wallet = await this.getWallet(squidId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const balance = wallet.balances[currency] || 0;
      if (balance < amount) {
        throw new Error(`Insufficient balance: ${balance} ${currency}, required: ${amount}`);
      }

      // Check spending limits
      await this.checkSpendingLimits(squidId, amount, currency);

      // Calculate fees
      const fees = await this.calculateFees(amount, currency, 'payment');

      // Create payment intent
      const intentId = `intent_${crypto.randomBytes(16).toString('hex')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expiresIn * 1000));

      const intent = {
        intentId,
        actor: { squidId, subId },
        amount,
        currency,
        recipient,
        purpose,
        metadata,
        fees,
        status: 'PENDING',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        limits: await this.getSpendingLimits(squidId)
      };

      // Store intent
      this.paymentIntents.set(intentId, intent);

      // Publish event
      await this.publishEvent('q.qwallet.intent.created.v1', {
        actor: intent.actor,
        data: {
          intentId,
          amount,
          currency,
          recipient,
          purpose,
          expiresAt: intent.expiresAt,
          metadata
        }
      });

      // Audit log
      await this.auditLog({
        action: 'PAYMENT_INTENT_CREATED',
        actor: intent.actor,
        resource: { type: 'payment_intent', id: intentId },
        verdict: 'ALLOW',
        details: {
          amount,
          currency,
          recipient,
          purpose,
          fees
        }
      });

      console.log(`[QwalletService] Payment intent created: ${intentId}`);

      return {
        success: true,
        intentId,
        amount,
        currency,
        recipient,
        status: 'PENDING',
        createdAt: intent.createdAt,
        expiresAt: intent.expiresAt,
        fees
      };
    } catch (error) {
      console.error('[QwalletService] Create payment intent error:', error);
      
      // Audit log for failure
      await this.auditLog({
        action: 'PAYMENT_INTENT_FAILED',
        actor: { squidId: data.squidId, subId: data.subId },
        resource: { type: 'payment_intent', id: null },
        verdict: 'DENY',
        details: {
          error: error.message,
          amount: data.amount,
          currency: data.currency
        }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(data) {
    try {
      const { squidId, intentId, signature } = data;

      if (!squidId || !intentId || !signature) {
        throw new Error('Missing required fields: squidId, intentId, signature');
      }

      // Get payment intent
      const intent = this.paymentIntents.get(intentId);
      if (!intent) {
        throw new Error('Payment intent not found');
      }

      if (intent.status !== 'PENDING') {
        throw new Error(`Invalid intent status: ${intent.status}`);
      }

      if (new Date() > new Date(intent.expiresAt)) {
        intent.status = 'EXPIRED';
        throw new Error('Payment intent expired');
      }

      if (intent.actor.squidId !== squidId) {
        throw new Error('Unauthorized: intent belongs to different identity');
      }

      // Verify signature (in production, use Qlock service)
      const signatureValid = await this.verifySignature(signature, intent, squidId);
      if (!signatureValid) {
        throw new Error('Invalid signature');
      }

      // Create transaction
      const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;
      const wallet = await this.getWallet(squidId);
      
      const transaction = {
        transactionId,
        intentId,
        type: 'PAYMENT',
        from: {
          squidId,
          walletAddress: wallet.address
        },
        to: {
          squidId: intent.recipient,
          walletAddress: await this.getWalletAddress(intent.recipient)
        },
        amount: intent.amount,
        currency: intent.currency,
        fees: intent.fees,
        status: 'SIGNED',
        signature,
        gasEstimate: await this.estimateGas('payment', intent.currency),
        createdAt: new Date().toISOString(),
        metadata: intent.metadata
      };

      // Store transaction
      this.transactions.set(transactionId, transaction);

      // Update intent status
      intent.status = 'SIGNED';
      intent.transactionId = transactionId;

      // Publish event
      await this.publishEvent('q.qwallet.tx.signed.v1', {
        actor: intent.actor,
        data: {
          transactionId,
          intentId,
          signature: signature.substring(0, 20) + '...',
          gasEstimate: transaction.gasEstimate,
          walletAddress: wallet.address
        }
      });

      // Audit log
      await this.auditLog({
        action: 'TRANSACTION_SIGNED',
        actor: intent.actor,
        resource: { type: 'transaction', id: transactionId },
        verdict: 'ALLOW',
        details: {
          intentId,
          amount: intent.amount,
          currency: intent.currency,
          gasEstimate: transaction.gasEstimate
        }
      });

      console.log(`[QwalletService] Transaction signed: ${transactionId}`);

      return {
        success: true,
        transactionId,
        signature,
        gasEstimate: transaction.gasEstimate
      };
    } catch (error) {
      console.error('[QwalletService] Sign transaction error:', error);
      
      // Audit log for failure
      await this.auditLog({
        action: 'TRANSACTION_SIGN_FAILED',
        actor: { squidId: data.squidId },
        resource: { type: 'transaction', id: null },
        verdict: 'DENY',
        details: {
          error: error.message,
          intentId: data.intentId
        }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process payment
   */
  async processPayment(data) {
    try {
      const { squidId, transactionId } = data;

      if (!squidId || !transactionId) {
        throw new Error('Missing required fields: squidId, transactionId');
      }

      // Get transaction
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'SIGNED') {
        throw new Error(`Invalid transaction status: ${transaction.status}`);
      }

      if (transaction.from.squidId !== squidId) {
        throw new Error('Unauthorized: transaction belongs to different identity');
      }

      // Get wallets
      const fromWallet = await this.getWallet(transaction.from.squidId);
      const toWallet = await this.getWallet(transaction.to.squidId);

      if (!fromWallet || !toWallet) {
        throw new Error('Wallet not found');
      }

      // Check balance again
      const currentBalance = fromWallet.balances[transaction.currency] || 0;
      const totalAmount = transaction.amount + transaction.fees.total;
      
      if (currentBalance < totalAmount) {
        throw new Error(`Insufficient balance: ${currentBalance} ${transaction.currency}, required: ${totalAmount}`);
      }

      // Process the payment
      transaction.status = 'PROCESSING';

      // Simulate blockchain transaction
      const blockchainTx = await this.simulateBlockchainTransaction(transaction);

      // Update balances
      fromWallet.balances[transaction.currency] -= totalAmount;
      toWallet.balances[transaction.currency] = (toWallet.balances[transaction.currency] || 0) + transaction.amount;

      // Update transaction
      transaction.status = 'SETTLED';
      transaction.blockchainTx = blockchainTx;
      transaction.settledAt = new Date().toISOString();

      // Update spending limits
      await this.updateSpendingLimits(squidId, transaction.amount, transaction.currency);

      // Publish balance update events
      await this.publishEvent('q.qwallet.balance.updated.v1', {
        actor: { squidId: transaction.from.squidId },
        data: {
          walletAddress: fromWallet.address,
          currency: transaction.currency,
          previousBalance: currentBalance,
          newBalance: fromWallet.balances[transaction.currency],
          change: -totalAmount,
          reason: 'payment_sent'
        }
      });

      await this.publishEvent('q.qwallet.balance.updated.v1', {
        actor: { squidId: transaction.to.squidId },
        data: {
          walletAddress: toWallet.address,
          currency: transaction.currency,
          previousBalance: (toWallet.balances[transaction.currency] || 0) - transaction.amount,
          newBalance: toWallet.balances[transaction.currency],
          change: transaction.amount,
          reason: 'payment_received'
        }
      });

      // Publish settlement event
      await this.publishEvent('q.qwallet.tx.settled.v1', {
        actor: { squidId },
        data: {
          transactionId,
          blockchainHash: blockchainTx.hash,
          blockNumber: blockchainTx.blockNumber,
          gasUsed: blockchainTx.gasUsed,
          finalAmount: transaction.amount,
          fees: transaction.fees,
          network: blockchainTx.network
        }
      });

      // Audit log
      await this.auditLog({
        action: 'PAYMENT_PROCESSED',
        actor: { squidId },
        resource: { type: 'transaction', id: transactionId },
        verdict: 'ALLOW',
        details: {
          amount: transaction.amount,
          currency: transaction.currency,
          recipient: transaction.to.squidId,
          blockchainHash: blockchainTx.hash,
          fees: transaction.fees
        }
      });

      console.log(`[QwalletService] Payment processed: ${transactionId}`);

      return {
        success: true,
        transactionId,
        status: 'SETTLED',
        settlementHash: blockchainTx.hash,
        settledAt: transaction.settledAt
      };
    } catch (error) {
      console.error('[QwalletService] Process payment error:', error);
      
      // Update transaction status
      if (data.transactionId && this.transactions.has(data.transactionId)) {
        const transaction = this.transactions.get(data.transactionId);
        transaction.status = 'FAILED';
        transaction.error = error.message;
      }

      // Audit log for failure
      await this.auditLog({
        action: 'PAYMENT_FAILED',
        actor: { squidId: data.squidId },
        resource: { type: 'transaction', id: data.transactionId },
        verdict: 'DENY',
        details: {
          error: error.message,
          transactionId: data.transactionId
        }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment quote
   */
  async getPaymentQuote(data) {
    try {
      const {
        amount,
        currency = this.config.defaultCurrency,
        network,
        priority = 'normal'
      } = data;

      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }

      if (!this.supportedCurrencies[currency]) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      // Calculate fees
      const fees = await this.calculateFees(amount, currency, 'payment', { priority, network });

      // Estimate processing time
      const estimatedTime = this.estimateProcessingTime(currency, priority);

      // Get exchange rate if needed
      const exchangeRate = await this.getExchangeRate(currency, 'USD');

      const quote = {
        amount,
        currency,
        fees,
        estimatedTime,
        exchangeRate,
        network: network || this.supportedCurrencies[currency].networks[0],
        priority,
        validUntil: new Date(Date.now() + 300000).toISOString() // 5 minutes
      };

      // Cache the quote
      const quoteId = `quote_${crypto.randomBytes(8).toString('hex')}`;
      this.feeCache.set(quoteId, quote);

      // Publish fee calculation event
      await this.publishEvent('q.qwallet.fee.calculated.v1', {
        actor: { squidId: 'system' },
        data: {
          transactionType: 'payment',
          amount,
          currency,
          network: quote.network,
          priority,
          fees,
          estimatedTime
        }
      });

      return {
        success: true,
        ...quote,
        quoteId
      };
    } catch (error) {
      console.error('[QwalletService] Get payment quote error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(squidId, currency) {
    try {
      if (!squidId) {
        throw new Error('Missing squidId');
      }

      const wallet = await this.getWallet(squidId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (currency) {
        if (!this.supportedCurrencies[currency]) {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        const balance = wallet.balances[currency] || 0;
        return {
          success: true,
          squidId,
          currency,
          balance,
          walletAddress: wallet.address,
          lastUpdated: wallet.updatedAt
        };
      } else {
        return {
          success: true,
          squidId,
          balances: wallet.balances,
          walletAddress: wallet.address,
          lastUpdated: wallet.updatedAt
        };
      }
    } catch (error) {
      console.error('[QwalletService] Get balance error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(squidId, options = {}) {
    try {
      const { limit = 50, offset = 0, status, currency } = options;

      if (!squidId) {
        throw new Error('Missing squidId');
      }

      // Get all transactions for the identity
      const allTransactions = Array.from(this.transactions.values())
        .filter(tx => 
          tx.from.squidId === squidId || tx.to.squidId === squidId
        );

      // Apply filters
      let filteredTransactions = allTransactions;
      
      if (status) {
        filteredTransactions = filteredTransactions.filter(tx => tx.status === status);
      }
      
      if (currency) {
        filteredTransactions = filteredTransactions.filter(tx => tx.currency === currency);
      }

      // Sort by creation date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

      // Format transactions for response
      const transactions = paginatedTransactions.map(tx => ({
        id: tx.transactionId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        from: tx.from,
        to: tx.to,
        fees: tx.fees,
        timestamp: tx.createdAt,
        settledAt: tx.settledAt,
        blockchainTx: tx.blockchainTx,
        metadata: tx.metadata
      }));

      return {
        success: true,
        transactions,
        total: filteredTransactions.length,
        limit,
        offset
      };
    } catch (error) {
      console.error('[QwalletService] Get transaction history error:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        total: 0
      };
    }
  }

  // Helper methods

  async createWallet(squidId, options = {}) {
    const walletId = `wallet_${crypto.randomBytes(16).toString('hex')}`;
    const address = this.generateWalletAddress(squidId);
    
    const wallet = {
      walletId,
      owner: { squidId },
      address,
      balances: options.initialBalances || { QToken: 0, PI: 0 },
      limits: {
        daily: { amount: this.config.dailyLimit, used: 0, resetAt: this.getNextMidnight() },
        monthly: { amount: this.config.monthlyLimit, used: 0, resetAt: this.getNextMonthStart() }
      },
      networks: Object.entries(this.supportedCurrencies).map(([currency, config]) => ({
        name: config.networks[0],
        chainId: this.getChainId(config.networks[0]),
        address,
        isActive: true
      })),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.wallets.set(squidId, wallet);
    return wallet;
  }

  async getWallet(squidId) {
    let wallet = this.wallets.get(squidId);
    if (!wallet) {
      wallet = await this.createWallet(squidId);
    }
    return wallet;
  }

  async getWalletAddress(squidId) {
    const wallet = await this.getWallet(squidId);
    return wallet.address;
  }

  generateWalletAddress(squidId) {
    const hash = crypto.createHash('sha256').update(`wallet_${squidId}`).digest('hex');
    return `0x${hash.substring(0, 40)}`;
  }

  async calculateFees(amount, currency, type, options = {}) {
    const { priority = 'normal', network } = options;
    
    const baseFee = amount * 0.001; // 0.1% base fee
    const networkFee = this.getNetworkFee(currency, priority);
    const platformFee = amount * 0.005; // 0.5% platform fee

    return {
      network: networkFee,
      platform: platformFee,
      total: networkFee + platformFee
    };
  }

  getNetworkFee(currency, priority) {
    const baseFees = {
      QToken: { low: 0.0001, normal: 0.001, high: 0.01 },
      PI: { low: 0.00001, normal: 0.0001, high: 0.001 }
    };

    return baseFees[currency]?.[priority] || 0.001;
  }

  async estimateGas(operation, currency) {
    const gasEstimates = {
      payment: { QToken: 21000, PI: 15000 },
      transfer: { QToken: 21000, PI: 15000 },
      mint: { QToken: 50000, PI: 30000 }
    };

    return gasEstimates[operation]?.[currency] || 21000;
  }

  estimateProcessingTime(currency, priority) {
    const times = {
      QToken: { low: '5-10 minutes', normal: '2-5 minutes', high: '30-60 seconds' },
      PI: { low: '10-20 minutes', normal: '5-10 minutes', high: '1-2 minutes' }
    };

    return times[currency]?.[priority] || '2-5 minutes';
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Mock exchange rates
    const rates = {
      'QToken-USD': 1.50,
      'PI-USD': 0.25
    };

    return rates[`${fromCurrency}-${toCurrency}`] || 1.0;
  }

  async checkSpendingLimits(squidId, amount, currency) {
    const limits = await this.getSpendingLimits(squidId);
    
    // Check daily limit
    if (limits.daily.used + amount > limits.daily.amount) {
      await this.publishEvent('q.qwallet.limit.exceeded.v1', {
        actor: { squidId },
        data: {
          limitType: 'daily',
          limit: limits.daily.amount,
          attempted: amount,
          current: limits.daily.used,
          currency
        }
      });
      
      throw new Error(`Daily spending limit exceeded: ${limits.daily.used + amount} > ${limits.daily.amount}`);
    }

    // Check monthly limit
    if (limits.monthly.used + amount > limits.monthly.amount) {
      await this.publishEvent('q.qwallet.limit.exceeded.v1', {
        actor: { squidId },
        data: {
          limitType: 'monthly',
          limit: limits.monthly.amount,
          attempted: amount,
          current: limits.monthly.used,
          currency
        }
      });
      
      throw new Error(`Monthly spending limit exceeded: ${limits.monthly.used + amount} > ${limits.monthly.amount}`);
    }
  }

  async getSpendingLimits(squidId) {
    const wallet = await this.getWallet(squidId);
    return wallet.limits;
  }

  async updateSpendingLimits(squidId, amount, currency) {
    const wallet = await this.getWallet(squidId);
    wallet.limits.daily.used += amount;
    wallet.limits.monthly.used += amount;
    wallet.updatedAt = new Date().toISOString();
  }

  async verifySignature(signature, data, squidId) {
    // In standalone mode, accept any signature
    if (this.mode === 'standalone') {
      return signature && signature.length > 10;
    }

    // In production, verify with Qlock service
    try {
      if (this.mockServices) {
        return await this.mockServices.qlock.verifySignature(signature, data, squidId);
      }

      // Real Qlock integration would go here
      return true;
    } catch (error) {
      console.error('[QwalletService] Signature verification error:', error);
      return false;
    }
  }

  async simulateBlockchainTransaction(transaction) {
    // Simulate blockchain processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      hash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 12000000,
      blockHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      gasUsed: transaction.gasEstimate,
      gasPrice: '20000000000', // 20 gwei
      network: this.supportedCurrencies[transaction.currency].networks[0],
      confirmations: 1
    };
  }

  async publishEvent(topic, eventData) {
    if (this.eventBus) {
      try {
        await this.eventBus.publish(topic, {
          topic,
          timestamp: new Date().toISOString(),
          ...eventData,
          signature: this.signEvent(eventData),
          cid: await this.generateEventCID(eventData)
        });
      } catch (error) {
        console.error(`[QwalletService] Failed to publish event ${topic}:`, error);
      }
    }
  }

  signEvent(eventData) {
    // Mock event signing
    const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  async generateEventCID(eventData) {
    // Mock CID generation
    const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    return `Qm${hash.substring(0, 44)}`;
  }

  async auditLog(event) {
    const auditEvent = {
      eventId: `audit_${crypto.randomBytes(16).toString('hex')}`,
      timestamp: new Date().toISOString(),
      module: 'qwallet',
      version: '1.0.0',
      riskScore: this.calculateRiskScore(event),
      ...event
    };

    // In production, send to Qerberos
    if (this.mockServices) {
      await this.mockServices.qerberos.logEvent(auditEvent);
    }

    console.log(`[QwalletService] Audit log: ${auditEvent.action} - ${auditEvent.verdict}`);
  }

  calculateRiskScore(event) {
    let score = 0;
    
    if (event.details?.amount) {
      if (event.details.amount > 1000) score += 20;
      else if (event.details.amount > 100) score += 10;
    }

    if (event.verdict === 'DENY') score += 50;
    if (event.action.includes('FAILED')) score += 30;

    return Math.min(score, 100);
  }

  // Cleanup methods

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
      console.log(`[QwalletService] Expired ${expiredCount} payment intents`);
    }
  }

  resetDailyLimits() {
    const now = new Date();
    let resetCount = 0;

    for (const wallet of this.wallets.values()) {
      if (new Date(wallet.limits.daily.resetAt) <= now) {
        wallet.limits.daily.used = 0;
        wallet.limits.daily.resetAt = this.getNextMidnight();
        resetCount++;
      }
    }

    if (resetCount > 0) {
      console.log(`[QwalletService] Reset daily limits for ${resetCount} wallets`);
    }
  }

  cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.feeCache.entries()) {
      if (value.validUntil && new Date(value.validUntil).getTime() < now) {
        this.feeCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[QwalletService] Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  getNextMonthStart() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }

  getChainId(network) {
    const chainIds = {
      'anarq-chain': 1337,
      'ethereum': 1,
      'pi-network': 314159
    };
    return chainIds[network] || 1337;
  }

  async shutdown() {
    console.log('[QwalletService] Shutting down...');
    
    // Clear intervals
    // (In a real implementation, store interval IDs and clear them)
    
    // Save state if needed
    // (In a real implementation, persist data to database)
    
    this.initialized = false;
    console.log('[QwalletService] Shutdown complete');
  }

  async healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      wallets: this.wallets.size,
      paymentIntents: this.paymentIntents.size,
      transactions: this.transactions.size,
      supportedCurrencies: Object.keys(this.supportedCurrencies),
      config: {
        mode: this.mode,
        piNetworkEnabled: this.config.piNetworkEnabled,
        defaultCurrency: this.config.defaultCurrency
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default QwalletService;