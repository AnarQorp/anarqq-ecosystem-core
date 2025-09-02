/**
 * Qwallet MCP (Model Context Protocol) Handler
 * 
 * Provides MCP tool implementations for serverless environments
 */

export function createMCPHandler(qwalletService) {
  return async (req, res) => {
    try {
      const { tool, arguments: args } = req.body;

      if (!tool || !args) {
        return res.status(400).json({
          error: 'Missing required fields: tool, arguments'
        });
      }

      let result;

      switch (tool) {
        case 'wallet.sign':
          result = await handleWalletSign(qwalletService, args);
          break;

        case 'wallet.pay':
          result = await handleWalletPay(qwalletService, args);
          break;

        case 'wallet.quote':
          result = await handleWalletQuote(qwalletService, args);
          break;

        case 'wallet.balance':
          result = await handleWalletBalance(qwalletService, args);
          break;

        case 'wallet.intent':
          result = await handleWalletIntent(qwalletService, args);
          break;

        default:
          return res.status(400).json({
            error: `Unknown tool: ${tool}`,
            availableTools: [
              'wallet.sign',
              'wallet.pay',
              'wallet.quote',
              'wallet.balance',
              'wallet.intent'
            ]
          });
      }

      res.json(result);
    } catch (error) {
      console.error('[MCP Handler] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  };
}

/**
 * Handle wallet.sign tool
 */
async function handleWalletSign(qwalletService, args) {
  try {
    const { squidId, intentId, signature } = args;

    if (!squidId || !intentId || !signature) {
      return {
        success: false,
        error: 'Missing required arguments: squidId, intentId, signature'
      };
    }

    const result = await qwalletService.signTransaction({
      squidId,
      intentId,
      signature
    });

    return {
      success: result.success,
      transactionId: result.transactionId,
      signature: result.signature,
      gasEstimate: result.gasEstimate,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle wallet.pay tool
 */
async function handleWalletPay(qwalletService, args) {
  try {
    const { squidId, transactionId } = args;

    if (!squidId || !transactionId) {
      return {
        success: false,
        error: 'Missing required arguments: squidId, transactionId'
      };
    }

    const result = await qwalletService.processPayment({
      squidId,
      transactionId
    });

    return {
      success: result.success,
      transactionId: result.transactionId,
      status: result.status,
      settlementHash: result.settlementHash,
      settledAt: result.settledAt,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle wallet.quote tool
 */
async function handleWalletQuote(qwalletService, args) {
  try {
    const { amount, currency, network, priority = 'normal' } = args;

    if (!amount || !currency) {
      return {
        success: false,
        error: 'Missing required arguments: amount, currency'
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0'
      };
    }

    const result = await qwalletService.getPaymentQuote({
      amount,
      currency,
      network,
      priority
    });

    return {
      success: result.success,
      amount: result.amount,
      currency: result.currency,
      fees: result.fees,
      estimatedTime: result.estimatedTime,
      exchangeRate: result.exchangeRate,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle wallet.balance tool
 */
async function handleWalletBalance(qwalletService, args) {
  try {
    const { squidId, currency } = args;

    if (!squidId) {
      return {
        success: false,
        error: 'Missing required argument: squidId'
      };
    }

    const result = await qwalletService.getBalance(squidId, currency);

    return {
      success: result.success,
      squidId: result.squidId,
      balances: result.balances || { [currency]: result.balance },
      walletAddress: result.walletAddress,
      lastUpdated: result.lastUpdated,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle wallet.intent tool
 */
async function handleWalletIntent(qwalletService, args) {
  try {
    const {
      squidId,
      amount,
      currency,
      recipient,
      purpose,
      metadata,
      expiresIn = 3600
    } = args;

    if (!squidId || !amount || !currency || !recipient) {
      return {
        success: false,
        error: 'Missing required arguments: squidId, amount, currency, recipient'
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0'
      };
    }

    const result = await qwalletService.createPaymentIntent({
      squidId,
      amount,
      currency,
      recipient,
      purpose,
      metadata,
      expiresIn
    });

    return {
      success: result.success,
      intentId: result.intentId,
      amount: result.amount,
      currency: result.currency,
      recipient: result.recipient,
      status: result.status,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default createMCPHandler;