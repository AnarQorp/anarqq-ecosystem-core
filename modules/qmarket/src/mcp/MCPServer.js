/**
 * MCP Server for Qmarket
 * 
 * Provides MCP (Model Context Protocol) tools for marketplace operations.
 */

import { EventEmitter } from 'events';

export class MCPServer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.qmarketService = options.qmarketService;
    this.licenseService = options.licenseService;
    this.analyticsService = options.analyticsService;
    this.connections = new Map();
    
    console.log('[MCPServer] Initialized');
  }

  handleConnection(ws) {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[MCPServer] New connection: ${connectionId}`);
    
    this.connections.set(connectionId, {
      ws,
      id: connectionId,
      connectedAt: new Date().toISOString(),
      authenticated: false
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(connectionId, message);
      } catch (error) {
        console.error(`[MCPServer] Message handling error:`, error);
        this.sendError(connectionId, 'INVALID_MESSAGE', error.message);
      }
    });

    ws.on('close', () => {
      console.log(`[MCPServer] Connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`[MCPServer] Connection error:`, error);
      this.connections.delete(connectionId);
    });

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'welcome',
      server: 'qmarket',
      version: '1.0.0',
      capabilities: ['qmarket.list', 'qmarket.purchase', 'qmarket.license', 'qmarket.search'],
      timestamp: new Date().toISOString()
    });
  }

  async handleMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    console.log(`[MCPServer] Received message:`, message.type);

    switch (message.type) {
      case 'authenticate':
        await this.handleAuthenticate(connectionId, message);
        break;
      
      case 'tool_call':
        await this.handleToolCall(connectionId, message);
        break;
      
      case 'ping':
        this.sendMessage(connectionId, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;
      
      default:
        this.sendError(connectionId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  async handleAuthenticate(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const { token, squidId } = message.data || {};
      
      if (!token || !squidId) {
        this.sendError(connectionId, 'AUTH_MISSING_CREDENTIALS', 'Token and squidId required');
        return;
      }

      // Mock authentication for standalone mode
      if (this.qmarketService.options.sandboxMode) {
        connection.authenticated = true;
        connection.squidId = squidId;
        
        this.sendMessage(connectionId, {
          type: 'auth_success',
          squidId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // In production, would verify token with sQuid service
      this.sendError(connectionId, 'AUTH_NOT_IMPLEMENTED', 'Production authentication not implemented');
      
    } catch (error) {
      console.error('[MCPServer] Authentication error:', error);
      this.sendError(connectionId, 'AUTH_ERROR', error.message);
    }
  }

  async handleToolCall(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (!connection.authenticated) {
      this.sendError(connectionId, 'AUTH_REQUIRED', 'Authentication required for tool calls');
      return;
    }

    try {
      const { tool, parameters, requestId } = message;
      
      let result;
      
      switch (tool) {
        case 'qmarket.list':
          result = await this.handleListTool(connection.squidId, parameters);
          break;
        
        case 'qmarket.purchase':
          result = await this.handlePurchaseTool(connection.squidId, parameters);
          break;
        
        case 'qmarket.license':
          result = await this.handleLicenseTool(connection.squidId, parameters);
          break;
        
        case 'qmarket.search':
          result = await this.handleSearchTool(connection.squidId, parameters);
          break;
        
        default:
          this.sendError(connectionId, 'UNKNOWN_TOOL', `Unknown tool: ${tool}`);
          return;
      }

      this.sendMessage(connectionId, {
        type: 'tool_result',
        requestId,
        tool,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[MCPServer] Tool call error:', error);
      this.sendError(connectionId, 'TOOL_ERROR', error.message, message.requestId);
    }
  }

  async handleListTool(squidId, parameters) {
    const {
      title,
      description,
      price,
      currency = 'QToken',
      category = 'media',
      tags = [],
      fileCid,
      fileMetadata = {},
      visibility = 'public',
      daoId,
      mintNFT = true,
      enableResale = true,
      royaltyPercentage = 5
    } = parameters;

    const listingData = {
      squidId,
      title,
      description,
      price,
      currency,
      category,
      tags,
      fileCid,
      fileMetadata,
      visibility,
      daoId,
      mintNFT,
      enableResale,
      royaltyPercentage
    };

    const result = await this.qmarketService.createListing(listingData);
    
    if (result.success) {
      return {
        success: true,
        listingId: result.listing.id,
        accessUrl: result.listing.accessUrl,
        nft: result.listing.nft,
        ecosystem: result.listing.ecosystem
      };
    } else {
      return {
        success: false,
        error: result.error,
        code: result.code
      };
    }
  }

  async handlePurchaseTool(squidId, parameters) {
    const { listingId, paymentMethod = 'QToken' } = parameters;

    if (!listingId) {
      return {
        success: false,
        error: 'listingId is required'
      };
    }

    const purchaseData = {
      squidId,
      listingId,
      paymentMethod
    };

    const result = await this.qmarketService.purchaseListing(purchaseData);
    
    if (result.success) {
      return {
        success: true,
        purchaseId: result.purchaseId,
        accessUrl: result.accessUrl,
        price: result.price,
        currency: result.currency,
        purchasedAt: result.purchasedAt
      };
    } else {
      return {
        success: false,
        error: result.error,
        code: result.code
      };
    }
  }

  async handleLicenseTool(squidId, parameters) {
    const { action, purchaseId, listingId, licenseType = 'personal', transferTo, expiresAt } = parameters;

    if (!action) {
      return {
        success: false,
        error: 'action is required'
      };
    }

    switch (action) {
      case 'create':
        // License creation is typically handled automatically during purchase
        return {
          success: false,
          error: 'License creation is handled automatically during purchase'
        };
      
      case 'verify':
        if (!purchaseId && !listingId) {
          return {
            success: false,
            error: 'purchaseId or listingId is required for verification'
          };
        }
        
        // Mock license verification
        return {
          success: true,
          licenseId: `license_${purchaseId || listingId}`,
          licenseType: 'personal',
          status: 'active',
          holder: squidId,
          permissions: ['read', 'download', 'print'],
          createdAt: new Date().toISOString(),
          expiresAt: null
        };
      
      case 'transfer':
        if (!purchaseId || !transferTo) {
          return {
            success: false,
            error: 'purchaseId and transferTo are required for transfer'
          };
        }
        
        // Mock license transfer
        return {
          success: true,
          licenseId: `license_${purchaseId}`,
          from: squidId,
          to: transferTo,
          transferredAt: new Date().toISOString()
        };
      
      case 'revoke':
        if (!purchaseId) {
          return {
            success: false,
            error: 'purchaseId is required for revocation'
          };
        }
        
        // Mock license revocation
        return {
          success: true,
          licenseId: `license_${purchaseId}`,
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          revokedBy: squidId
        };
      
      default:
        return {
          success: false,
          error: `Unknown license action: ${action}`
        };
    }
  }

  async handleSearchTool(squidId, parameters) {
    const result = await this.qmarketService.searchListings(parameters);
    
    if (result.success) {
      return {
        success: true,
        listings: result.listings.map(listing => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          currency: listing.currency,
          category: listing.category,
          tags: listing.tags,
          createdAt: listing.createdAt
        })),
        pagination: result.pagination
      };
    } else {
      return {
        success: false,
        error: result.error,
        code: result.code
      };
    }
  }

  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === 1) { // WebSocket.OPEN
      connection.ws.send(JSON.stringify(message));
    }
  }

  sendError(connectionId, code, message, requestId = null) {
    this.sendMessage(connectionId, {
      type: 'error',
      code,
      message,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values())
        .filter(conn => conn.authenticated).length,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        connectedAt: conn.connectedAt,
        authenticated: conn.authenticated,
        squidId: conn.squidId
      }))
    };
  }
}

export default MCPServer;