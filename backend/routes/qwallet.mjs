/**
 * Qwallet API Routes - Tokenized Economy and NFT Management
 * 
 * Provides REST API endpoints for wallet functionality, token management,
 * NFT minting, and transaction signing within the AnarQ&Q ecosystem.
 */

import express from 'express';
import { getQwalletService } from '../ecosystem/QwalletService.mjs';
import { authenticateSquid } from '../middleware/auth.mjs';
import { validateRequest } from '../middleware/validation.mjs';

const router = express.Router();
const qwalletService = getQwalletService();

/**
 * Sign transaction with sQuid identity
 * POST /api/qwallet/sign
 */
router.post('/sign', authenticateSquid, validateRequest([
  'action',
  'payload'
]), async (req, res) => {
  try {
    const { action, payload, timestamp } = req.body;
    const squidId = req.squidId;

    const signatureData = {
      squidId,
      action,
      payload,
      timestamp
    };

    const result = await qwalletService.signTransaction(signatureData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Transaction signed successfully',
        data: {
          signature: result.signature,
          transactionId: result.transactionId,
          metadata: result.metadata
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to sign transaction'
      });
    }

  } catch (error) {
    console.error('Sign transaction endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get balance for sQuid identity
 * GET /api/qwallet/balance/:squidId
 */
router.get('/balance/:squidId', async (req, res) => {
  try {
    const { squidId } = req.params;
    const { token = 'QToken' } = req.query;

    if (!squidId) {
      return res.status(400).json({
        success: false,
        error: 'sQuid ID is required'
      });
    }

    const result = await qwalletService.getBalance(squidId, token);

    if (result.success) {
      res.json({
        success: true,
        data: {
          squidId: result.squidId,
          token: result.token,
          balance: result.balance,
          tokenInfo: result.tokenInfo,
          walletAddress: result.walletAddress,
          lastUpdated: result.lastUpdated
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to get balance'
      });
    }

  } catch (error) {
    console.error('Get balance endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get all balances for sQuid identity
 * GET /api/qwallet/balances/:squidId
 */
router.get('/balances/:squidId', async (req, res) => {
  try {
    const { squidId } = req.params;

    if (!squidId) {
      return res.status(400).json({
        success: false,
        error: 'sQuid ID is required'
      });
    }

    // Get balances for all supported tokens
    const supportedTokens = ['QToken', 'PI'];
    const balancePromises = supportedTokens.map(token => 
      qwalletService.getBalance(squidId, token)
    );

    const balanceResults = await Promise.all(balancePromises);
    const balances = {};
    let walletAddress = null;

    balanceResults.forEach(result => {
      if (result.success) {
        balances[result.token] = {
          balance: result.balance,
          tokenInfo: result.tokenInfo
        };
        if (!walletAddress) {
          walletAddress = result.walletAddress;
        }
      }
    });

    res.json({
      success: true,
      data: {
        squidId,
        walletAddress,
        balances,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get balances endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Transfer funds between sQuid identities
 * POST /api/qwallet/transfer
 */
router.post('/transfer', authenticateSquid, validateRequest([
  'toId',
  'amount'
]), async (req, res) => {
  try {
    const { toId, amount, token = 'QToken' } = req.body;
    const fromId = req.squidId;

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount: must be a positive number'
      });
    }

    const result = await qwalletService.transferFunds(fromId, toId, numAmount, token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Transfer completed successfully',
        data: {
          transactionId: result.transactionId,
          fromSquidId: result.fromSquidId,
          toSquidId: result.toSquidId,
          amount: result.amount,
          token: result.token,
          fromBalance: result.fromBalance,
          toBalance: result.toBalance,
          timestamp: result.timestamp,
          gasEstimate: result.gasEstimate
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Transfer failed'
      });
    }

  } catch (error) {
    console.error('Transfer funds endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Mint NFT from metadata
 * POST /api/qwallet/mint
 */
router.post('/mint', authenticateSquid, validateRequest([
  'name',
  'description'
]), async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      attributes = [],
      contentCid,
      contractType = 'general'
    } = req.body;
    
    const squidId = req.squidId;

    const nftMetadata = {
      name,
      description,
      image,
      attributes,
      contentCid,
      squidId,
      contractType
    };

    const result = await qwalletService.mintNFT(nftMetadata);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'NFT minted successfully',
        data: {
          tokenId: result.tokenId,
          contractAddress: result.contractAddress,
          owner: result.owner,
          creator: result.creator,
          metadata: result.metadata,
          mintedAt: result.mintedAt,
          transactionId: result.transactionId,
          gasEstimate: result.gasEstimate
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'NFT minting failed'
      });
    }

  } catch (error) {
    console.error('Mint NFT endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * List user's NFTs
 * GET /api/qwallet/nfts/:squidId
 */
router.get('/nfts/:squidId', async (req, res) => {
  try {
    const { squidId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!squidId) {
      return res.status(400).json({
        success: false,
        error: 'sQuid ID is required'
      });
    }

    const result = await qwalletService.listUserNFTs(squidId);

    if (result.success) {
      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedNFTs = result.nfts.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          squidId: result.squidId,
          walletAddress: result.walletAddress,
          nfts: paginatedNFTs,
          pagination: {
            total: result.totalCount,
            activeCount: result.activeCount,
            limit: parseInt(limit),
            offset: startIndex,
            hasMore: endIndex < result.totalCount
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to list NFTs'
      });
    }

  } catch (error) {
    console.error('List NFTs endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get specific NFT information
 * GET /api/qwallet/nft/:tokenId
 */
router.get('/nft/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: 'Token ID is required'
      });
    }

    const nft = await qwalletService.getNFTInfo(tokenId);

    if (nft) {
      res.json({
        success: true,
        data: {
          tokenId: nft.tokenId,
          contractAddress: nft.contractAddress,
          owner: nft.owner,
          creator: nft.creator,
          contentCid: nft.contentCid,
          metadata: nft.metadata,
          mintedAt: nft.mintedAt,
          network: nft.network,
          standard: nft.standard,
          status: nft.status || 'active'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'NFT not found',
        message: `No NFT found with token ID: ${tokenId}`
      });
    }

  } catch (error) {
    console.error('Get NFT info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get wallet information
 * GET /api/qwallet/wallet/:squidId
 */
router.get('/wallet/:squidId', async (req, res) => {
  try {
    const { squidId } = req.params;

    if (!squidId) {
      return res.status(400).json({
        success: false,
        error: 'sQuid ID is required'
      });
    }

    const walletInfo = await qwalletService.getWalletInfo(squidId);

    if (walletInfo) {
      res.json({
        success: true,
        data: walletInfo
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
        message: `No wallet found for sQuid ID: ${squidId}`
      });
    }

  } catch (error) {
    console.error('Get wallet info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get transaction history
 * GET /api/qwallet/transactions/:squidId
 */
router.get('/transactions/:squidId', async (req, res) => {
  try {
    const { squidId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!squidId) {
      return res.status(400).json({
        success: false,
        error: 'sQuid ID is required'
      });
    }

    const result = await qwalletService.getTransactionHistory(
      squidId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: {
        squidId,
        transactions: result.transactions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total
        }
      }
    });

  } catch (error) {
    console.error('Get transaction history endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/qwallet/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await qwalletService.healthCheck();
    res.json(health);

  } catch (error) {
    console.error('Qwallet health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;