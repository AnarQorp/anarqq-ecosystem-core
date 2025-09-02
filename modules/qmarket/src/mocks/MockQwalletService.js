/**
 * Mock Qwallet Service for Standalone Development
 * 
 * Provides mock payment processing and NFT minting for testing.
 */

import crypto from 'crypto';

export class MockQwalletService {
  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.nfts = new Map();
    this.paymentIntents = new Map();
    
    // Initialize with test wallets
    this.initializeTestWallets();
  }

  initializeTestWallets() {
    const testWallets = [
      {
        squidId: 'squid_alice123',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
        balances: {
          QToken: 1000.0,
          PI: 500.0,
          ETH: 2.5
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_bob456',
        walletAddress: '0x8D4C0532925a3b8D4C0532925a3b8D4C0532925a',
        balances: {
          QToken: 2500.0,
          PI: 1200.0,
          ETH: 5.0
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_charlie789',
        walletAddress: '0x925a3b8D4C0532925a3b8D4C0532925a3b8D4C05',
        balances: {
          QToken: 750.0,
          PI: 300.0,
          ETH: 1.2
        },
        nfts: [],
        transactions: []
      },
      // Add test wallets for unit tests
      {
        squidId: 'squid_test123',
        walletAddress: '0xTest123456789abcdef0123456789abcdef012345',
        balances: {
          QToken: 5000.0,
          PI: 2000.0,
          ETH: 10.0
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_test456',
        walletAddress: '0xTest456789abcdef0123456789abcdef0123456789',
        balances: {
          QToken: 3000.0,
          PI: 1500.0,
          ETH: 7.5
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_test789',
        walletAddress: '0xTest789abcdef0123456789abcdef0123456789abc',
        balances: {
          QToken: 2000.0,
          PI: 1000.0,
          ETH: 5.0
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_test1',
        walletAddress: '0xTest1abcdef0123456789abcdef0123456789abcdef',
        balances: {
          QToken: 1500.0,
          PI: 750.0,
          ETH: 3.0
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_test2',
        walletAddress: '0xTest2abcdef0123456789abcdef0123456789abcdef',
        balances: {
          QToken: 1200.0,
          PI: 600.0,
          ETH: 2.5
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_seller123',
        walletAddress: '0xSeller123456789abcdef0123456789abcdef012345',
        balances: {
          QToken: 800.0,
          PI: 400.0,
          ETH: 2.0
        },
        nfts: [],
        transactions: []
      },
      {
        squidId: 'squid_buyer456',
        walletAddress: '0xBuyer456789abcdef0123456789abcdef0123456789',
        balances: {
          QToken: 1000.0,
          PI: 500.0,
          ETH: 2.5
        },
        nfts: [],
        transactions: []
      }
    ];

    testWallets.forEach(wallet => {
      this.wallets.set(wallet.squidId, wallet);
    });
  }

  async signListing({ squidId, price, currency, mintNFT, listingId, contentCid, metadata, correlationId }) {
    await this.simulateDelay(300, 800);

    const wallet = this.wallets.get(squidId);
    if (!wallet) {
      throw new Error('Wallet not found for identity');
    }

    // Generate transaction ID
    const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;
    
    // Mock signature generation
    const signature = this.generateMockSignature(squidId, listingId, price, currency);
    
    // Mock gas estimation
    const gasEstimate = this.estimateGas('listing_creation', mintNFT);

    let nft = null;
    if (mintNFT) {
      // Mock NFT minting
      const tokenId = crypto.randomBytes(8).toString('hex');
      const contractAddress = '0xNFTContract123456789abcdef';
      
      nft = {
        tokenId,
        contractAddress,
        metadata: {
          name: metadata.title,
          description: metadata.description,
          image: metadata.imageUrl,
          attributes: [
            { trait_type: 'Category', value: metadata.category },
            { trait_type: 'Creator', value: squidId },
            { trait_type: 'Price', value: price },
            { trait_type: 'Currency', value: currency }
          ]
        },
        mintedAt: new Date().toISOString(),
        owner: squidId,
        contentCid
      };

      // Store NFT
      this.nfts.set(tokenId, nft);
      wallet.nfts.push(tokenId);
    }

    // Create transaction record
    const transaction = {
      transactionId,
      type: 'listing_creation',
      squidId,
      amount: 0, // No payment for listing creation
      currency,
      status: 'completed',
      signature,
      gasUsed: gasEstimate.gasUsed,
      gasPrice: gasEstimate.gasPrice,
      nft,
      metadata: {
        listingId,
        contentCid,
        mintNFT,
        ...metadata
      },
      createdAt: new Date().toISOString(),
      correlationId
    };

    this.transactions.set(transactionId, transaction);
    wallet.transactions.push(transactionId);

    return {
      success: true,
      transactionId,
      signature,
      walletAddress: wallet.walletAddress,
      nft,
      gasEstimate: {
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
        estimatedCost: gasEstimate.estimatedCost
      }
    };
  }

  async processPayment({ squidId, sellerId, amount, currency, purpose, metadata, correlationId }) {
    await this.simulateDelay(500, 1200);

    const buyerWallet = this.wallets.get(squidId);
    const sellerWallet = this.wallets.get(sellerId);

    if (!buyerWallet) {
      throw new Error('Buyer wallet not found');
    }

    if (!sellerWallet) {
      throw new Error('Seller wallet not found');
    }

    // Check balance
    if (buyerWallet.balances[currency] < amount) {
      return {
        success: false,
        error: 'Insufficient balance',
        code: 'INSUFFICIENT_FUNDS',
        available: buyerWallet.balances[currency],
        required: amount
      };
    }

    // Calculate fees
    const platformFeeRate = 0.025; // 2.5%
    const royaltyFeeRate = metadata.royaltyPercentage ? metadata.royaltyPercentage / 100 : 0.05; // 5% default
    const networkFeeRate = 0.001; // 0.1%

    const platformFee = amount * platformFeeRate;
    const royaltyFee = amount * royaltyFeeRate;
    const networkFee = amount * networkFeeRate;
    const sellerAmount = amount - platformFee - royaltyFee - networkFee;

    // Generate payment intent and transaction IDs
    const intentId = `intent_${crypto.randomBytes(12).toString('hex')}`;
    const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;

    // Process payment
    buyerWallet.balances[currency] -= amount;
    sellerWallet.balances[currency] += sellerAmount;

    // Create payment intent record
    const paymentIntent = {
      intentId,
      transactionId,
      buyerId: squidId,
      sellerId,
      amount,
      currency,
      purpose,
      fees: {
        platformFee,
        royaltyFee,
        networkFee,
        total: platformFee + royaltyFee + networkFee
      },
      settlement: {
        sellerAmount,
        creatorRoyalty: royaltyFee,
        platformFee,
        networkFee
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metadata,
      correlationId
    };

    this.paymentIntents.set(intentId, paymentIntent);

    // Create transaction records
    const buyerTransaction = {
      transactionId: `${transactionId}_buyer`,
      type: 'payment_sent',
      squidId,
      amount: -amount,
      currency,
      status: 'completed',
      counterparty: sellerId,
      fees: platformFee + royaltyFee + networkFee,
      metadata: { intentId, purpose, ...metadata },
      createdAt: new Date().toISOString(),
      correlationId
    };

    const sellerTransaction = {
      transactionId: `${transactionId}_seller`,
      type: 'payment_received',
      squidId: sellerId,
      amount: sellerAmount,
      currency,
      status: 'completed',
      counterparty: squidId,
      fees: 0,
      metadata: { intentId, purpose, ...metadata },
      createdAt: new Date().toISOString(),
      correlationId
    };

    this.transactions.set(buyerTransaction.transactionId, buyerTransaction);
    this.transactions.set(sellerTransaction.transactionId, sellerTransaction);

    buyerWallet.transactions.push(buyerTransaction.transactionId);
    sellerWallet.transactions.push(sellerTransaction.transactionId);

    return {
      success: true,
      intentId,
      transactionId,
      amount,
      currency,
      fees: paymentIntent.fees,
      settlement: paymentIntent.settlement,
      status: 'completed',
      completedAt: paymentIntent.completedAt
    };
  }

  async getWallet(squidId) {
    await this.simulateDelay(100, 200);

    const wallet = this.wallets.get(squidId);
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    return {
      success: true,
      wallet: {
        squidId: wallet.squidId,
        walletAddress: wallet.walletAddress,
        balances: { ...wallet.balances },
        nftCount: wallet.nfts.length,
        transactionCount: wallet.transactions.length,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivityAt: new Date().toISOString()
      }
    };
  }

  async getBalance(squidId, currency) {
    await this.simulateDelay(50, 100);

    const wallet = this.wallets.get(squidId);
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    const balance = wallet.balances[currency] || 0;

    return {
      success: true,
      squidId,
      currency,
      balance,
      lastUpdated: new Date().toISOString()
    };
  }

  async getTransactionHistory(squidId, options = {}) {
    await this.simulateDelay(200, 400);

    const wallet = this.wallets.get(squidId);
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    const { limit = 50, offset = 0, type, currency } = options;

    let transactions = wallet.transactions
      .map(txId => this.transactions.get(txId))
      .filter(tx => tx) // Remove any undefined transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply filters
    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }

    if (currency) {
      transactions = transactions.filter(tx => tx.currency === currency);
    }

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return {
      success: true,
      transactions: paginatedTransactions.map(tx => ({
        transactionId: tx.transactionId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        counterparty: tx.counterparty,
        fees: tx.fees,
        createdAt: tx.createdAt,
        metadata: tx.metadata
      })),
      pagination: {
        total: transactions.length,
        limit,
        offset,
        hasMore: transactions.length > offset + limit
      }
    };
  }

  async getNFTs(squidId) {
    await this.simulateDelay(150, 300);

    const wallet = this.wallets.get(squidId);
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    const nfts = wallet.nfts
      .map(tokenId => this.nfts.get(tokenId))
      .filter(nft => nft && nft.owner === squidId);

    return {
      success: true,
      nfts: nfts.map(nft => ({
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        metadata: nft.metadata,
        mintedAt: nft.mintedAt,
        contentCid: nft.contentCid
      })),
      totalNFTs: nfts.length
    };
  }

  async transferNFT({ fromId, toId, tokenId, price, currency }) {
    await this.simulateDelay(400, 800);

    const nft = this.nfts.get(tokenId);
    if (!nft) {
      return {
        success: false,
        error: 'NFT not found'
      };
    }

    if (nft.owner !== fromId) {
      return {
        success: false,
        error: 'Not NFT owner'
      };
    }

    const fromWallet = this.wallets.get(fromId);
    const toWallet = this.wallets.get(toId);

    if (!fromWallet || !toWallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    // Process payment if price is specified
    let paymentResult = null;
    if (price && price > 0) {
      paymentResult = await this.processPayment({
        squidId: toId,
        sellerId: fromId,
        amount: price,
        currency,
        purpose: 'nft_transfer',
        metadata: { tokenId, nftTransfer: true }
      });

      if (!paymentResult.success) {
        return paymentResult;
      }
    }

    // Transfer NFT ownership
    nft.owner = toId;
    nft.transferHistory = nft.transferHistory || [];
    nft.transferHistory.push({
      from: fromId,
      to: toId,
      price: price || 0,
      currency: currency || 'QToken',
      transferredAt: new Date().toISOString(),
      transactionId: paymentResult?.transactionId
    });

    // Update wallet NFT lists
    fromWallet.nfts = fromWallet.nfts.filter(id => id !== tokenId);
    toWallet.nfts.push(tokenId);

    return {
      success: true,
      tokenId,
      from: fromId,
      to: toId,
      price: price || 0,
      currency: currency || 'QToken',
      paymentResult,
      transferredAt: nft.transferHistory[nft.transferHistory.length - 1].transferredAt
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qwallet',
      timestamp: new Date().toISOString(),
      wallets: this.wallets.size,
      transactions: this.transactions.size,
      nfts: this.nfts.size,
      paymentIntents: this.paymentIntents.size
    };
  }

  // Helper methods
  generateMockSignature(squidId, listingId, price, currency) {
    const data = `${squidId}:${listingId}:${price}:${currency}:${Date.now()}`;
    return `sig_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  estimateGas(operation, includeNFT = false) {
    const baseGas = {
      listing_creation: 50000,
      payment: 21000,
      nft_mint: 100000,
      nft_transfer: 75000
    };

    let gasLimit = baseGas[operation] || 50000;
    if (includeNFT && operation === 'listing_creation') {
      gasLimit += baseGas.nft_mint;
    }

    const gasPrice = 20; // Gwei
    const gasUsed = Math.floor(gasLimit * 0.8); // Assume 80% of limit used
    const estimatedCost = (gasUsed * gasPrice) / 1e9; // Convert to ETH

    return {
      gasLimit,
      gasPrice,
      gasUsed,
      estimatedCost
    };
  }

  async simulateDelay(min = 100, max = 500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Test helper methods
  addTestWallet(wallet) {
    this.wallets.set(wallet.squidId, wallet);
  }

  updateBalance(squidId, currency, amount) {
    const wallet = this.wallets.get(squidId);
    if (wallet) {
      wallet.balances[currency] = (wallet.balances[currency] || 0) + amount;
    }
  }

  getTestWallets() {
    return Array.from(this.wallets.values());
  }
}

export default MockQwalletService;