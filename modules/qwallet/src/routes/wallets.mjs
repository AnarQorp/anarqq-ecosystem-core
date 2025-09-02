/**
 * Wallet Routes - HTTP API for wallet operations
 */

import express from 'express';
import Joi from 'joi';
import {
  authenticateSquid,
  authorizePermission,
  validateRequest
} from '../../security/middleware.mjs';

export function createWalletRoutes(qwalletService) {
  const router = express.Router();

  // Validation schemas
  const transactionHistorySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('PENDING', 'SIGNED', 'SETTLED', 'FAILED').optional(),
    currency: Joi.string().valid('QToken', 'PI').optional()
  });

  /**
   * Get wallet balance
   * GET /api/wallets/balance/:squidId
   */
  router.get('/balance/:squidId',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { currency } = req.query;
        const { squidId: authSquidId } = req.identity;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet'
          });
        }

        const result = await qwalletService.getBalance(squidId, currency);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'BALANCE_RETRIEVED',
            message: 'Wallet balance retrieved successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'BALANCE_RETRIEVAL_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Wallet Routes] Get balance error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve wallet balance'
        });
      }
    }
  );

  /**
   * Get all balances for wallet
   * GET /api/wallets/balances/:squidId
   */
  router.get('/balances/:squidId',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { squidId: authSquidId } = req.identity;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet'
          });
        }

        const result = await qwalletService.getBalance(squidId);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'BALANCES_RETRIEVED',
            message: 'Wallet balances retrieved successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'BALANCES_RETRIEVAL_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Wallet Routes] Get balances error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve wallet balances'
        });
      }
    }
  );

  /**
   * Get transaction history
   * GET /api/wallets/transactions/:squidId
   */
  router.get('/transactions/:squidId',
    authenticateSquid,
    validateRequest(transactionHistorySchema, 'query'),
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { squidId: authSquidId } = req.identity;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet transactions'
          });
        }

        const result = await qwalletService.getTransactionHistory(squidId, req.query);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'TRANSACTIONS_RETRIEVED',
            message: 'Transaction history retrieved successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'TRANSACTIONS_RETRIEVAL_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Wallet Routes] Get transactions error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve transaction history'
        });
      }
    }
  );

  /**
   * Get wallet information
   * GET /api/wallets/:squidId
   */
  router.get('/:squidId',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { squidId: authSquidId } = req.identity;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet'
          });
        }

        const wallet = await qwalletService.getWallet(squidId);

        if (wallet) {
          // Remove sensitive information
          const safeWallet = {
            walletId: wallet.walletId,
            owner: wallet.owner,
            address: wallet.address,
            balances: wallet.balances,
            limits: wallet.limits,
            networks: wallet.networks,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
          };

          res.json({
            status: 'ok',
            code: 'WALLET_RETRIEVED',
            message: 'Wallet information retrieved successfully',
            data: safeWallet
          });
        } else {
          res.status(404).json({
            status: 'error',
            code: 'WALLET_NOT_FOUND',
            message: 'Wallet not found'
          });
        }
      } catch (error) {
        console.error('[Wallet Routes] Get wallet error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve wallet information'
        });
      }
    }
  );

  /**
   * Get spending limits
   * GET /api/wallets/:squidId/limits
   */
  router.get('/:squidId/limits',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { squidId: authSquidId } = req.identity;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet limits'
          });
        }

        const limits = await qwalletService.getSpendingLimits(squidId);

        res.json({
          status: 'ok',
          code: 'LIMITS_RETRIEVED',
          message: 'Spending limits retrieved successfully',
          data: {
            squidId,
            limits,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('[Wallet Routes] Get limits error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve spending limits'
        });
      }
    }
  );

  /**
   * Get wallet statistics
   * GET /api/wallets/:squidId/stats
   */
  router.get('/:squidId/stats',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.params;
        const { squidId: authSquidId } = req.identity;
        const { period = '30d' } = req.query;

        // Check if user can access this wallet
        if (squidId !== authSquidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to wallet statistics'
          });
        }

        // Calculate period start date
        const now = new Date();
        let startDate;
        
        switch (period) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get transactions for the period
        const transactionHistory = await qwalletService.getTransactionHistory(squidId, {
          limit: 1000
        });

        const periodTransactions = transactionHistory.transactions.filter(tx =>
          new Date(tx.timestamp) >= startDate
        );

        // Calculate statistics
        const stats = {
          period,
          totalTransactions: periodTransactions.length,
          totalSent: 0,
          totalReceived: 0,
          totalFees: 0,
          currencyBreakdown: {},
          transactionTypes: {},
          averageTransactionAmount: 0
        };

        periodTransactions.forEach(tx => {
          // Initialize currency breakdown
          if (!stats.currencyBreakdown[tx.currency]) {
            stats.currencyBreakdown[tx.currency] = {
              sent: 0,
              received: 0,
              fees: 0,
              count: 0
            };
          }

          // Initialize transaction type breakdown
          if (!stats.transactionTypes[tx.type]) {
            stats.transactionTypes[tx.type] = 0;
          }

          stats.transactionTypes[tx.type]++;
          stats.currencyBreakdown[tx.currency].count++;

          if (tx.from.squidId === squidId) {
            // Outgoing transaction
            stats.totalSent += tx.amount;
            stats.totalFees += tx.fees?.total || 0;
            stats.currencyBreakdown[tx.currency].sent += tx.amount;
            stats.currencyBreakdown[tx.currency].fees += tx.fees?.total || 0;
          }

          if (tx.to.squidId === squidId) {
            // Incoming transaction
            stats.totalReceived += tx.amount;
            stats.currencyBreakdown[tx.currency].received += tx.amount;
          }
        });

        // Calculate average transaction amount
        if (periodTransactions.length > 0) {
          stats.averageTransactionAmount = (stats.totalSent + stats.totalReceived) / periodTransactions.length;
        }

        res.json({
          status: 'ok',
          code: 'STATS_RETRIEVED',
          message: 'Wallet statistics retrieved successfully',
          data: {
            squidId,
            stats,
            generatedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('[Wallet Routes] Get stats error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve wallet statistics'
        });
      }
    }
  );

  /**
   * Get supported currencies
   * GET /api/wallets/currencies
   */
  router.get('/currencies',
    async (req, res) => {
      try {
        const currencies = Object.entries(qwalletService.supportedCurrencies).map(([code, config]) => ({
          code,
          symbol: config.symbol,
          decimals: config.decimals,
          networks: config.networks,
          contractAddress: config.contractAddress
        }));

        res.json({
          status: 'ok',
          code: 'CURRENCIES_RETRIEVED',
          message: 'Supported currencies retrieved successfully',
          data: {
            currencies,
            count: currencies.length
          }
        });
      } catch (error) {
        console.error('[Wallet Routes] Get currencies error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve supported currencies'
        });
      }
    }
  );

  return router;
}

export default createWalletRoutes;