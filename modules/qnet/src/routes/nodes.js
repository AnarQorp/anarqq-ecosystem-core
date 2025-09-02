/**
 * Node Routes - Node management endpoints
 */

import express from 'express';
import { authenticateIdentity, authorizePermission, rateLimitByIdentity } from '../../security/middleware.js';

export function createNodeRoutes(qnetService, metrics, mockMode) {
  const router = express.Router();

  // Apply authentication and rate limiting to all routes
  router.use(authenticateIdentity(mockMode));
  router.use(rateLimitByIdentity());

  /**
   * GET /nodes - List network nodes
   */
  router.get('/', async (req, res) => {
    try {
      const { region, status, tier, capabilities } = req.query;
      
      const criteria = {};
      if (region) criteria.region = region;
      if (status) criteria.status = status;
      if (tier) criteria.tier = tier;
      if (capabilities) {
        criteria.capabilities = capabilities.split(',').map(c => c.trim());
      }

      const nodes = qnetService.nodeManager.filterNodes(criteria);
      
      // Get unique regions for response metadata
      const regions = [...new Set(nodes.map(node => node.region))];
      
      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Network nodes retrieved',
        data: {
          nodes,
          total: nodes.length,
          regions,
          filters: criteria
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Node Route] List nodes failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'LIST_NODES_FAILED',
        message: 'Failed to list network nodes',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /nodes/:nodeId - Get specific node details
   */
  router.get('/:nodeId', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const node = qnetService.nodeManager.getNode(nodeId);
      
      if (!node) {
        return res.status(404).json({
          status: 'error',
          code: 'NODE_NOT_FOUND',
          message: `Node not found: ${nodeId}`,
          timestamp: new Date().toISOString()
        });
      }

      // Get health history if available
      let healthHistory = [];
      if (qnetService.healthMonitor) {
        healthHistory = qnetService.healthMonitor.getHealthHistory(nodeId, 10);
      }

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Node details retrieved',
        data: {
          ...node,
          healthHistory
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Node Route] Get node failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'GET_NODE_FAILED',
        message: 'Failed to get node details',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /nodes/:nodeId/ping - Ping specific node
   */
  router.post('/:nodeId/ping', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { timeout = 5000, count = 1 } = req.body;

      const pingResult = await qnetService.pingNodes({
        nodeId,
        timeout,
        count
      });

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Node ping completed',
        data: pingResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Node Route] Ping node failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: error.message.includes('not found') ? 'NODE_NOT_FOUND' : 'PING_FAILED',
        message: 'Node ping failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /nodes - Add new node (admin only)
   */
  router.post('/', 
    authorizePermission('qonsent:qnet:node:create', mockMode),
    async (req, res) => {
      try {
        const nodeData = req.body;
        
        // Add audit info
        nodeData.createdBy = req.identity?.squidId;
        
        const node = await qnetService.nodeManager.addNode(nodeData);
        
        res.status(201).json({
          status: 'ok',
          code: 'NODE_CREATED',
          message: 'Node added successfully',
          data: node,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Node Route] Add node failed:', error);
        
        const statusCode = error.message.includes('already exists') ? 409 : 400;
        
        res.status(statusCode).json({
          status: 'error',
          code: error.message.includes('already exists') ? 'NODE_EXISTS' : 'ADD_NODE_FAILED',
          message: 'Failed to add node',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * PUT /nodes/:nodeId - Update node (admin only)
   */
  router.put('/:nodeId',
    authorizePermission('qonsent:qnet:node:update', mockMode),
    async (req, res) => {
      try {
        const { nodeId } = req.params;
        const updates = req.body;
        
        // Add audit info
        updates.updatedBy = req.identity?.squidId;
        
        const node = await qnetService.nodeManager.updateNode(nodeId, updates);
        
        res.json({
          status: 'ok',
          code: 'NODE_UPDATED',
          message: 'Node updated successfully',
          data: node,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Node Route] Update node failed:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 400;
        
        res.status(statusCode).json({
          status: 'error',
          code: error.message.includes('not found') ? 'NODE_NOT_FOUND' : 'UPDATE_NODE_FAILED',
          message: 'Failed to update node',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * DELETE /nodes/:nodeId - Remove node (admin only)
   */
  router.delete('/:nodeId',
    authorizePermission('qonsent:qnet:node:delete', mockMode),
    async (req, res) => {
      try {
        const { nodeId } = req.params;
        const { reason = 'manual', graceful = true } = req.query;
        
        const node = await qnetService.nodeManager.removeNode(nodeId, reason, graceful === 'true');
        
        res.json({
          status: 'ok',
          code: 'NODE_REMOVED',
          message: 'Node removed successfully',
          data: {
            nodeId,
            reason,
            graceful,
            removedAt: node.removedAt
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Node Route] Remove node failed:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 500;
        
        res.status(statusCode).json({
          status: 'error',
          code: error.message.includes('not found') ? 'NODE_NOT_FOUND' : 'REMOVE_NODE_FAILED',
          message: 'Failed to remove node',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  return router;
}