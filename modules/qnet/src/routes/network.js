/**
 * Network Routes - Network-wide operations and information
 */

import express from 'express';
import { authenticateIdentity, authorizePermission, rateLimitByIdentity } from '../../security/middleware.js';

export function createNetworkRoutes(qnetService, metrics, mockMode) {
  const router = express.Router();

  // Apply authentication and rate limiting to all routes
  router.use(authenticateIdentity(mockMode));
  router.use(rateLimitByIdentity());

  /**
   * GET /capabilities - Get network capabilities
   */
  router.get('/capabilities', async (req, res) => {
    try {
      const { nodeId, service } = req.query;
      
      const capabilities = await qnetService.getCapabilities({
        nodeId,
        service
      });

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Network capabilities retrieved',
        data: capabilities,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Network Route] Get capabilities failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: error.message.includes('not found') ? 'NODE_NOT_FOUND' : 'GET_CAPABILITIES_FAILED',
        message: 'Failed to get network capabilities',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /topology - Get network topology
   */
  router.get('/topology', 
    authorizePermission('qonsent:qnet:network:read', mockMode),
    async (req, res) => {
      try {
        const topology = await qnetService.topology.getTopology();

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Network topology retrieved',
          data: topology,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Network Route] Get topology failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'GET_TOPOLOGY_FAILED',
          message: 'Failed to get network topology',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * GET /status - Get comprehensive network status
   */
  router.get('/status', async (req, res) => {
    try {
      const { 
        includeMetrics = false, 
        includeTopology = false, 
        region 
      } = req.query;

      const status = await qnetService.getNetworkStatus({
        includeMetrics: includeMetrics === 'true',
        includeTopology: includeTopology === 'true',
        region
      });

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Network status retrieved',
        data: status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Network Route] Get status failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'GET_STATUS_FAILED',
        message: 'Failed to get network status',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /ping - Ping network nodes
   */
  router.post('/ping', async (req, res) => {
    try {
      const { nodeId, timeout = 5000, count = 1 } = req.body;

      const pingResult = await qnetService.pingNodes({
        nodeId,
        timeout,
        count
      });

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Network ping completed',
        data: pingResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Network Route] Network ping failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'NETWORK_PING_FAILED',
        message: 'Network ping failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /route - Get optimal route between nodes
   */
  router.post('/route',
    authorizePermission('qonsent:qnet:network:read', mockMode),
    async (req, res) => {
      try {
        const { fromNodeId, toNodeId } = req.body;

        if (!fromNodeId || !toNodeId) {
          return res.status(400).json({
            status: 'error',
            code: 'MISSING_PARAMETERS',
            message: 'Both fromNodeId and toNodeId are required',
            timestamp: new Date().toISOString()
          });
        }

        const route = qnetService.topology.findShortestPath(fromNodeId, toNodeId);

        if (!route) {
          return res.status(404).json({
            status: 'error',
            code: 'NO_ROUTE_FOUND',
            message: `No route found between ${fromNodeId} and ${toNodeId}`,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Route calculated successfully',
          data: {
            fromNodeId,
            toNodeId,
            route
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Network Route] Route calculation failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'ROUTE_CALCULATION_FAILED',
          message: 'Failed to calculate route',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * POST /select-node - Select optimal node for request
   */
  router.post('/select-node', async (req, res) => {
    try {
      const {
        algorithm = 'health_based',
        region,
        capabilities,
        excludeNodes = [],
        minReputation = 0.7,
        maxLatency = 200
      } = req.body;

      const selectedNode = qnetService.loadBalancer.selectNode({
        algorithm,
        region,
        capabilities,
        excludeNodes,
        minReputation,
        maxLatency
      });

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Node selected successfully',
        data: {
          selectedNode,
          algorithm,
          criteria: {
            region,
            capabilities,
            excludeNodes,
            minReputation,
            maxLatency
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Network Route] Node selection failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'NODE_SELECTION_FAILED',
        message: 'Failed to select node',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /distribute-traffic - Calculate traffic distribution
   */
  router.post('/distribute-traffic',
    authorizePermission('qonsent:qnet:network:read', mockMode),
    async (req, res) => {
      try {
        const {
          requestCount,
          region,
          capabilities,
          excludeNodes = [],
          minReputation = 0.7,
          maxLatency = 200
        } = req.body;

        if (!requestCount || requestCount <= 0) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_REQUEST_COUNT',
            message: 'Request count must be a positive number',
            timestamp: new Date().toISOString()
          });
        }

        const distribution = qnetService.loadBalancer.distributeTraffic(requestCount, {
          region,
          capabilities,
          excludeNodes,
          minReputation,
          maxLatency
        });

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Traffic distribution calculated',
          data: distribution,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Network Route] Traffic distribution failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'TRAFFIC_DISTRIBUTION_FAILED',
          message: 'Failed to calculate traffic distribution',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * GET /optimization - Get topology optimization suggestions
   */
  router.get('/optimization',
    authorizePermission('qonsent:qnet:network:read', mockMode),
    async (req, res) => {
      try {
        const optimizations = qnetService.topology.optimizeTopology();

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Topology optimization suggestions retrieved',
          data: {
            optimizations,
            count: optimizations.length
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Network Route] Get optimization failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'GET_OPTIMIZATION_FAILED',
          message: 'Failed to get optimization suggestions',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  return router;
}