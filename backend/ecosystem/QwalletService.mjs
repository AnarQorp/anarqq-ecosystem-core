/**
 * Qwallet Service - Tokenized Economy and NFT Integration
 * 
 * Provides wallet functionality, token management, NFT minting, and transaction signing
 * for the AnarQ&Q ecosystem. Integrates with $QToken and $PI currencies.
 * 
 * @typedef {Object} SignTransactionPayload
 * @property {string} squidId - sQuid identity
 * @property {string} action - Action type (e.g., 'create_listing', 'transfer_funds')
 * @property {Object} payload - Action-specific data
 * @property {string} [timestamp] - Optional timestamp
 * 
 * @typedef {Object} SignTransactionResponse
 * @property {boolean} success - Operation success status
 * @property {string} signature - Transaction signature
 * @property {string} transactionId - Unique transaction ID
 * @property {Object} metadata - Additional transaction metadata
 * 
 * @typedef {Object} NFTMetadata
 * @property {string} name - NFT name
 * @property {string} description - NFT description
 * @property {string} image - Image URL or IPFS CID
 * @property {Array} attributes - NFT attributes array
 * @property {string} [contentCid] - Content CID if applicable
 */

import crypto from 'crypto';
import { getQindexService } from './QindexService.mjs';
import { getQerberosService } from './QerberosService.mjs';

export class QwalletService {
  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.nftContracts = new Map();
    this.tokenBalances = new Map();
    this.initializeDefaultTokens();
  }

  /**
   * Initialize default token configurations
   */
  initializeDefaultTokens() {
    this.supportedTokens = {
      'QToken': {
        symbol: '$QToken',
        decimals: 18,
        contractAddress: '0x1234567890123456789012345678901234567890',
        network: 'anarq-chain',
        type: 'utility'
      },
      'PI': {
        symbol: '$PI',
        decimals: 8,
        contractAddress: '0x0987654321098765432109876543210987654321',
        network: 'pi-network',
        type: 'currency'
      }
    };
  }

  /**
   * Create or get wallet for sQuid identity
   */
  async getOrCreateWallet(squidId) {
    try {
      if (this.wallets.has(squidId)) {
        return this.wallets.get(squidId);
      }

      // Generate wallet for sQuid identity
      const wallet = {
        squidId,
        address: this.generateWalletAddress(squidId),
        privateKey: this.generatePrivateKey(squidId),
        publicKey: this.generatePublicKey(squidId),
        balances: {
          'QToken': 1000.0, // Default balance for testing
          'PI': 50.0
        },
        nfts: [],
        transactions: [],
        createdAt: new Date().toISOString(),
        isActive: true
      };

      this.wallets.set(squidId, wallet);
      this.tokenBalances.set(squidId, wallet.balances);

      console.log(`[Qwallet] Created wallet for ${squidId}: ${wallet.address}`);
      return wallet;

    } catch (error) {
      console.error('[Qwallet] Wallet creation error:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * Sign listing transaction before publishing
   */
  async signListing(listingData) {
    try {
      const {
        squidId,
        price,
        currency = 'QToken',
        mintNFT = true,
        listingId,
        contentCid,
        metadata = {}
      } = listingData;

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(squidId);

      // Validate currency
      if (!this.supportedTokens[currency]) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      // Validate price
      if (price <= 0) {
        throw new Error('Price must be greater than 0');
      }

      // Create listing transaction
      const transaction = {
        id: this.generateTransactionId(),
        type: 'listing_creation',
        squidId,
        walletAddress: wallet.address,
        price,
        currency,
        listingId,
        contentCid,
        metadata,
        timestamp: new Date().toISOString(),
        status: 'pending',
        gasEstimate: this.estimateGas('listing_creation'),
        nftMinting: mintNFT
      };

      // Sign transaction
      const signature = await this.signTransaction(transaction, wallet.privateKey);
      transaction.signature = signature;
      transaction.status = 'signed';

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Mint NFT if requested
      let nftData = null;
      if (mintNFT) {
        nftData = await this.mintListingNFT(squidId, listingId, contentCid, metadata);
        transaction.nftId = nftData.tokenId;
        transaction.nftContract = nftData.contractAddress;
      }

      // Update wallet transaction history
      wallet.transactions.push(transaction.id);

      console.log(`[Qwallet] Signed listing transaction: ${transaction.id}`);

      return {
        success: true,
        transactionId: transaction.id,
        signature: signature,
        walletAddress: wallet.address,
        gasEstimate: transaction.gasEstimate,
        nft: nftData,
        currency: this.supportedTokens[currency]
      };

    } catch (error) {
      console.error('[Qwallet] Listing signing error:', error);
      throw new Error(`Failed to sign listing: ${error.message}`);
    }
  }

  /**
   * Mint NFT for marketplace listing
   */
  async mintListingNFT(squidId, listingId, contentCid, metadata) {
    try {
      const wallet = await this.getOrCreateWallet(squidId);
      
      // Generate NFT data
      const nftData = {
        tokenId: this.generateTokenId(),
        contractAddress: this.getNFTContractAddress('marketplace'),
        owner: wallet.address,
        creator: squidId,
        listingId,
        contentCid,
        metadata: {
          name: metadata.title || `Listing #${listingId}`,
          description: metadata.description || 'AnarQ&Q Marketplace Item',
          image: metadata.imageUrl || `ipfs://${contentCid}`,
          attributes: [
            {
              trait_type: 'Creator',
              value: squidId
            },
            {
              trait_type: 'Listing ID',
              value: listingId
            },
            {
              trait_type: 'Content CID',
              value: contentCid
            },
            {
              trait_type: 'Created At',
              value: new Date().toISOString()
            }
          ],
          ...metadata
        },
        mintedAt: new Date().toISOString(),
        network: 'anarq-chain',
        standard: 'ERC-721'
      };

      // Store NFT data
      this.nftContracts.set(nftData.tokenId, nftData);

      // Add to wallet NFTs
      wallet.nfts.push(nftData.tokenId);

      console.log(`[Qwallet] Minted NFT: ${nftData.tokenId} for listing ${listingId}`);

      return nftData;

    } catch (error) {
      console.error('[Qwallet] NFT minting error:', error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  /**
   * Validate user balance for transaction
   */
  async validateBalance(squidId, amount, currency = 'QToken') {
    try {
      const wallet = await this.getOrCreateWallet(squidId);
      const balance = wallet.balances[currency] || 0;

      return {
        hasBalance: balance >= amount,
        currentBalance: balance,
        requiredAmount: amount,
        currency: this.supportedTokens[currency]
      };

    } catch (error) {
      console.error('[Qwallet] Balance validation error:', error);
      return {
        hasBalance: false,
        currentBalance: 0,
        requiredAmount: amount,
        error: error.message
      };
    }
  }

  /**
   * Process payment for marketplace purchase
   */
  async processPayment(paymentData) {
    try {
      const {
        buyerSquidId,
        sellerSquidId,
        amount,
        currency = 'QToken',
        listingId,
        nftId
      } = paymentData;

      // Validate buyer balance
      const balanceCheck = await this.validateBalance(buyerSquidId, amount, currency);
      if (!balanceCheck.hasBalance) {
        throw new Error(`Insufficient balance: ${balanceCheck.currentBalance} ${currency}, required: ${amount}`);
      }

      // Get wallets
      const buyerWallet = await this.getOrCreateWallet(buyerSquidId);
      const sellerWallet = await this.getOrCreateWallet(sellerSquidId);

      // Create payment transaction
      const transaction = {
        id: this.generateTransactionId(),
        type: 'marketplace_purchase',
        buyerSquidId,
        sellerSquidId,
        buyerAddress: buyerWallet.address,
        sellerAddress: sellerWallet.address,
        amount,
        currency,
        listingId,
        nftId,
        timestamp: new Date().toISOString(),
        status: 'processing',
        gasEstimate: this.estimateGas('transfer')
      };

      // Process transfer
      buyerWallet.balances[currency] -= amount;
      sellerWallet.balances[currency] += amount * 0.95; // 5% platform fee

      // Transfer NFT ownership
      if (nftId) {
        const nft = this.nftContracts.get(nftId);
        if (nft) {
          nft.owner = buyerWallet.address;
          nft.transferredAt = new Date().toISOString();
          
          // Remove from seller's NFTs
          const sellerNftIndex = sellerWallet.nfts.indexOf(nftId);
          if (sellerNftIndex > -1) {
            sellerWallet.nfts.splice(sellerNftIndex, 1);
          }
          
          // Add to buyer's NFTs
          buyerWallet.nfts.push(nftId);
        }
      }

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Update wallet transaction histories
      buyerWallet.transactions.push(transaction.id);
      sellerWallet.transactions.push(transaction.id);

      console.log(`[Qwallet] Processed payment: ${amount} ${currency} from ${buyerSquidId} to ${sellerSquidId}`);

      return {
        success: true,
        transactionId: transaction.id,
        amount,
        currency,
        buyerBalance: buyerWallet.balances[currency],
        sellerBalance: sellerWallet.balances[currency],
        nftTransferred: !!nftId
      };

    } catch (error) {
      console.error('[Qwallet] Payment processing error:', error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(squidId) {
    try {
      const wallet = await this.getOrCreateWallet(squidId);
      
      return {
        address: wallet.address,
        balances: wallet.balances,
        nftCount: wallet.nfts.length,
        transactionCount: wallet.transactions.length,
        createdAt: wallet.createdAt,
        isActive: wallet.isActive
      };

    } catch (error) {
      console.error('[Qwallet] Get wallet info error:', error);
      return null;
    }
  }

  /**
   * Get NFT information
   */
  async getNFTInfo(tokenId) {
    const nft = this.nftContracts.get(tokenId);
    return nft || null;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(squidId, limit = 50, offset = 0) {
    try {
      const wallet = await this.getOrCreateWallet(squidId);
      
      const transactions = wallet.transactions
        .map(txId => this.transactions.get(txId))
        .filter(Boolean)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);

      return {
        transactions,
        total: wallet.transactions.length,
        limit,
        offset
      };

    } catch (error) {
      console.error('[Qwallet] Transaction history error:', error);
      return { transactions: [], total: 0, limit, offset };
    }
  }

  /**
   * Generate wallet address from sQuid ID
   */
  generateWalletAddress(squidId) {
    const hash = crypto.createHash('sha256').update(`wallet_${squidId}`).digest('hex');
    return `0x${hash.substring(0, 40)}`;
  }

  /**
   * Generate private key (mock implementation)
   */
  generatePrivateKey(squidId) {
    const hash = crypto.createHash('sha256').update(`private_${squidId}`).digest('hex');
    return hash;
  }

  /**
   * Generate public key (mock implementation)
   */
  generatePublicKey(squidId) {
    const hash = crypto.createHash('sha256').update(`public_${squidId}`).digest('hex');
    return hash;
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId() {
    return `tx_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate NFT token ID
   */
  generateTokenId() {
    return `nft_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Get NFT contract address for type
   */
  getNFTContractAddress(type = 'marketplace') {
    const contracts = {
      'marketplace': '0xabcdef1234567890abcdef1234567890abcdef12',
      'social': '0x1234567890abcdef1234567890abcdef12345678',
      'media': '0x567890abcdef1234567890abcdef1234567890ab'
    };
    
    return contracts[type] || contracts.marketplace;
  }

  /**
   * Sign transaction with sQuid identity (DID)
   * @param {SignTransactionPayload} payload - Transaction payload to sign
   * @returns {Promise<SignTransactionResponse>} Signature and metadata
   */
  async signTransaction(payload) {
    try {
      const { squidId, action, payload: actionPayload, timestamp } = payload;

      if (!squidId || !action || !actionPayload) {
        throw new Error('Missing required fields: squidId, action, payload');
      }

      // Get or create wallet for sQuid identity
      const wallet = await this.getOrCreateWallet(squidId);

      // Create transaction data
      const transactionData = {
        squidId,
        action,
        payload: actionPayload,
        timestamp: timestamp || new Date().toISOString(),
        walletAddress: wallet.address,
        nonce: this.generateNonce()
      };

      // Generate transaction ID
      const transactionId = this.generateTransactionId();

      // Create signature using sQuid private key
      const signature = await this.createSignature(transactionData, wallet.privateKey);

      // Store transaction
      const transaction = {
        id: transactionId,
        type: action,
        squidId,
        walletAddress: wallet.address,
        signature,
        data: transactionData,
        status: 'signed',
        timestamp: transactionData.timestamp,
        gasEstimate: this.estimateGas(action)
      };

      this.transactions.set(transactionId, transaction);
      wallet.transactions.push(transactionId);

      // Log to Qindex
      try {
        const qindexService = getQindexService();
        if (qindexService.logEvent) {
          await qindexService.logEvent({
            action: 'transaction_signed',
            squidId,
            resourceId: transactionId,
            metadata: {
              action,
              signature: signature.substring(0, 20) + '...',
              timestamp: transaction.timestamp
            }
          });
        }
      } catch (indexError) {
        console.warn('[Qwallet] Failed to log transaction to Qindex:', indexError.message);
      }

      console.log(`[Qwallet] Signed transaction: ${transactionId} for action: ${action}`);

      return {
        success: true,
        signature,
        transactionId,
        metadata: {
          squidId,
          action,
          walletAddress: wallet.address,
          timestamp: transaction.timestamp,
          gasEstimate: transaction.gasEstimate,
          nonce: transactionData.nonce
        }
      };

    } catch (error) {
      console.error('[Qwallet] Transaction signing error:', error);
      return {
        success: false,
        error: error.message,
        signature: null,
        transactionId: null,
        metadata: null
      };
    }
  }

  /**
   * Get balance for a specific token and sQuid identity
   * @param {string} squidId - sQuid identity
   * @param {string} token - Token symbol (QToken or PI)
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(squidId, token = 'QToken') {
    try {
      if (!this.supportedTokens[token]) {
        throw new Error(`Unsupported token: ${token}`);
      }

      const wallet = await this.getOrCreateWallet(squidId);
      const balance = wallet.balances[token] || 0;

      return {
        success: true,
        squidId,
        token,
        balance,
        tokenInfo: this.supportedTokens[token],
        walletAddress: wallet.address,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[Qwallet] Get balance error:', error);
      return {
        success: false,
        error: error.message,
        squidId,
        token,
        balance: 0
      };
    }
  }

  /**
   * Transfer funds between two sQuid identities with enhanced ecosystem integration
   * @param {string} fromId - Sender sQuid ID
   * @param {string} toId - Recipient sQuid ID
   * @param {number} amount - Amount to transfer
   * @param {string} token - Token symbol (QToken or PI)
   * @param {Object} options - Additional transfer options
   * @returns {Promise<Object>} Transfer result
   */
  async transferFunds(fromId, toId, amount, token = 'QToken', options = {}) {
    try {
      const {
        identityType = 'ROOT',
        sessionId = null,
        deviceFingerprint = null,
        ipAddress = null,
        userAgent = null,
        riskScore = 0
      } = options;

      // Validate inputs
      if (!fromId || !toId || !amount || amount <= 0) {
        throw new Error('Invalid transfer parameters');
      }

      if (!this.supportedTokens[token]) {
        throw new Error(`Unsupported token: ${token}`);
      }

      if (fromId === toId) {
        throw new Error('Cannot transfer to the same identity');
      }

      // Get wallets
      const fromWallet = await this.getOrCreateWallet(fromId);
      const toWallet = await this.getOrCreateWallet(toId);

      // Check balance
      const currentBalance = fromWallet.balances[token] || 0;
      if (currentBalance < amount) {
        throw new Error(`Insufficient balance: ${currentBalance} ${token}, required: ${amount}`);
      }

      // Create transfer transaction
      const transactionId = this.generateTransactionId();
      const timestamp = new Date().toISOString();

      const transaction = {
        id: transactionId,
        type: 'transfer_funds',
        fromSquidId: fromId,
        toSquidId: toId,
        fromAddress: fromWallet.address,
        toAddress: toWallet.address,
        amount,
        token,
        timestamp,
        status: 'processing',
        gasEstimate: this.estimateGas('transfer'),
        identityType,
        sessionId,
        riskScore
      };

      // Enhanced Qerberos logging for wallet operations
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'wallet_transfer_initiated',
          squidId: fromId,
          resourceId: transactionId,
          operationType: 'WALLET',
          identityType,
          walletAddress: fromWallet.address,
          transactionAmount: amount,
          transactionToken: token,
          riskScore,
          sessionId,
          deviceFingerprint,
          ipAddress,
          userAgent,
          metadata: {
            toSquidId: toId,
            toAddress: toWallet.address,
            transactionType: 'transfer_funds',
            gasEstimate: transaction.gasEstimate
          }
        });
      } catch (auditError) {
        console.warn('[Qwallet] Failed to log transfer initiation to Qerberos:', auditError.message);
      }

      // Process transfer
      fromWallet.balances[token] -= amount;
      toWallet.balances[token] = (toWallet.balances[token] || 0) + amount;

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = timestamp;

      // Store transaction
      this.transactions.set(transactionId, transaction);
      fromWallet.transactions.push(transactionId);
      toWallet.transactions.push(transactionId);

      // Enhanced Qindex transaction indexing
      try {
        const qindexService = getQindexService();
        await qindexService.registerTransaction({
          transactionId,
          squidId: fromId,
          identityType,
          operationType: 'TRANSFER',
          amount,
          token,
          fromAddress: fromWallet.address,
          toAddress: toWallet.address,
          timestamp,
          riskScore,
          metadata: {
            gasEstimate: transaction.gasEstimate,
            sessionId,
            deviceFingerprint,
            completedAt: transaction.completedAt
          }
        });
      } catch (indexError) {
        console.warn('[Qwallet] Failed to index transfer transaction:', indexError.message);
      }

      // Log completion to Qerberos
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'wallet_transfer_completed',
          squidId: fromId,
          resourceId: transactionId,
          operationType: 'WALLET',
          identityType,
          walletAddress: fromWallet.address,
          transactionAmount: amount,
          transactionToken: token,
          riskScore,
          sessionId,
          deviceFingerprint,
          ipAddress,
          userAgent,
          metadata: {
            toSquidId: toId,
            fromBalance: fromWallet.balances[token],
            toBalance: toWallet.balances[token],
            completedAt: transaction.completedAt
          }
        });
      } catch (auditError) {
        console.warn('[Qwallet] Failed to log transfer completion to Qerberos:', auditError.message);
      }

      console.log(`[Qwallet] Transfer completed: ${amount} ${token} from ${fromId} to ${toId}`);

      return {
        success: true,
        transactionId,
        fromSquidId: fromId,
        toSquidId: toId,
        amount,
        token,
        fromBalance: fromWallet.balances[token],
        toBalance: toWallet.balances[token],
        timestamp,
        gasEstimate: transaction.gasEstimate,
        riskScore,
        identityType
      };

    } catch (error) {
      // Log error to Qerberos
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'wallet_transfer_failed',
          squidId: fromId,
          operationType: 'WALLET',
          identityType: options.identityType || 'ROOT',
          transactionAmount: amount,
          transactionToken: token,
          riskScore: options.riskScore || 0,
          sessionId: options.sessionId,
          deviceFingerprint: options.deviceFingerprint,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          metadata: {
            error: error.message,
            toSquidId: toId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditError) {
        console.warn('[Qwallet] Failed to log transfer error to Qerberos:', auditError.message);
      }

      console.error('[Qwallet] Transfer funds error:', error);
      return {
        success: false,
        error: error.message,
        transactionId: null
      };
    }
  }

  /**
   * Mint NFT from metadata and content CID
   * @param {NFTMetadata} metadata - NFT metadata
   * @returns {Promise<Object>} Minted NFT information
   */
  async mintNFT(metadata) {
    try {
      const {
        name,
        description,
        image,
        attributes = [],
        contentCid,
        squidId,
        contractType = 'general'
      } = metadata;

      if (!name || !description || !squidId) {
        throw new Error('Missing required NFT metadata: name, description, squidId');
      }

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(squidId);

      // Generate NFT data
      const tokenId = this.generateTokenId();
      const contractAddress = this.getNFTContractAddress(contractType);
      const timestamp = new Date().toISOString();

      const nftData = {
        tokenId,
        contractAddress,
        owner: wallet.address,
        creator: squidId,
        contentCid,
        metadata: {
          name,
          description,
          image: image || (contentCid ? `ipfs://${contentCid}` : ''),
          attributes: [
            ...attributes,
            {
              trait_type: 'Creator',
              value: squidId
            },
            {
              trait_type: 'Minted At',
              value: timestamp
            },
            {
              trait_type: 'Contract Type',
              value: contractType
            }
          ]
        },
        mintedAt: timestamp,
        network: 'anarq-chain',
        standard: 'ERC-721',
        status: 'active'
      };

      // Store NFT
      this.nftContracts.set(tokenId, nftData);
      wallet.nfts.push(tokenId);

      // Create minting transaction
      const transactionId = this.generateTransactionId();
      const transaction = {
        id: transactionId,
        type: 'nft_mint',
        squidId,
        walletAddress: wallet.address,
        tokenId,
        contractAddress,
        metadata: nftData.metadata,
        timestamp,
        status: 'completed',
        gasEstimate: this.estimateGas('nft_mint')
      };

      this.transactions.set(transactionId, transaction);
      wallet.transactions.push(transactionId);

      // Log to Qindex
      try {
        const qindexService = getQindexService();
        await qindexService.registerFile({
          cid: contentCid || `nft_${tokenId}`,
          squidId,
          visibility: 'public',
          contentType: 'nft',
          timestamp,
          storjUrl: `nft://${tokenId}`,
          fileSize: 0,
          originalName: name,
          metadata: {
            tokenId,
            name,
            description,
            contractAddress,
            mintedAt: timestamp
          }
        });
      } catch (indexError) {
        console.warn('[Qwallet] Failed to register NFT in Qindex:', indexError.message);
      }

      console.log(`[Qwallet] Minted NFT: ${tokenId} for ${squidId}`);

      return {
        success: true,
        tokenId,
        contractAddress,
        owner: wallet.address,
        creator: squidId,
        metadata: nftData.metadata,
        mintedAt: timestamp,
        transactionId,
        gasEstimate: transaction.gasEstimate
      };

    } catch (error) {
      console.error('[Qwallet] NFT minting error:', error);
      return {
        success: false,
        error: error.message,
        tokenId: null
      };
    }
  }

  /**
   * List all NFTs owned by a user
   * @param {string} squidId - sQuid identity
   * @returns {Promise<Object>} User's NFT collection
   */
  async listUserNFTs(squidId) {
    try {
      const wallet = await this.getOrCreateWallet(squidId);
      
      const nfts = wallet.nfts
        .map(tokenId => this.nftContracts.get(tokenId))
        .filter(Boolean)
        .map(nft => ({
          tokenId: nft.tokenId,
          contractAddress: nft.contractAddress,
          name: nft.metadata.name,
          description: nft.metadata.description,
          image: nft.metadata.image,
          attributes: nft.metadata.attributes,
          contentCid: nft.contentCid,
          mintedAt: nft.mintedAt,
          status: nft.status || 'active'
        }));

      return {
        success: true,
        squidId,
        walletAddress: wallet.address,
        nfts,
        totalCount: nfts.length,
        activeCount: nfts.filter(nft => nft.status === 'active').length
      };

    } catch (error) {
      console.error('[Qwallet] List user NFTs error:', error);
      return {
        success: false,
        error: error.message,
        squidId,
        nfts: [],
        totalCount: 0
      };
    }
  }

  /**
   * Create cryptographic signature using private key
   * @param {Object} data - Data to sign
   * @param {string} privateKey - Private key for signing
   * @returns {Promise<string>} Signature
   */
  async createSignature(data, privateKey) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(dataString)
      .digest('hex');
    
    return signature;
  }

  /**
   * Generate cryptographic nonce
   * @returns {string} Nonce
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Estimate gas for transaction type
   */
  estimateGas(transactionType) {
    const gasEstimates = {
      'listing_creation': 150000,
      'transfer': 21000,
      'nft_mint': 200000,
      'marketplace_purchase': 180000
    };

    return gasEstimates[transactionType] || 100000;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      wallets: {
        total: this.wallets.size,
        active: Array.from(this.wallets.values()).filter(w => w.isActive).length
      },
      transactions: {
        total: this.transactions.size,
        pending: Array.from(this.transactions.values()).filter(t => t.status === 'pending').length
      },
      nfts: {
        total: this.nftContracts.size
      },
      supportedTokens: Object.keys(this.supportedTokens),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qwalletServiceInstance = null;

export function getQwalletService() {
  if (!qwalletServiceInstance) {
    qwalletServiceInstance = new QwalletService();
  }
  return qwalletServiceInstance;
}

export default QwalletService;