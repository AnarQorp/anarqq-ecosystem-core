/**
 * API Route Handlers
 * 
 * Main API endpoints for {{MODULE_NAME}} module
 */

import express from 'express';
import { authorize, validateInput, validationRules } from '../../security/middleware.js';
import { metricsCollector } from '../../observability/metrics.js';

const router = express.Router();

/**
 * Get module information
 * GET /api/v1/info
 */
router.get('/info', async (req, res) => {
  try {
    const info = {
      module: '{{MODULE_NAME}}',
      version: process.env.npm_package_version || '1.0.0',
      description: '{{MODULE_DESCRIPTION}}',
      apiVersion: '1.0',
      capabilities: [
        'authentication',
        'authorization',
        'encryption',
        'indexing',
        'audit'
      ],
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        api: '/api/v1'
      },
      documentation: {
        openapi: '/openapi.yaml',
        mcp: '/mcp.json'
      }
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Module information retrieved successfully',
      data: info,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Info endpoint error:', error);
    metricsCollector.recordError('api', 'INFO_ERROR', 'medium');
    
    res.status(500).json({
      status: 'error',
      code: 'INFO_ERROR',
      message: 'Failed to retrieve module information',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * Example resource endpoints
 */

/**
 * List resources
 * GET /api/v1/resources
 */
router.get('/resources', 
  authorize('{{MODULE_NAME}}:read'),
  validateInput([
    validationRules.page,
    validationRules.limit
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 10 } = req.query;
      const squidId = req.identity.squidId;
      
      // Example: Get resources from service
      const resources = await req.services.example.listResources({
        owner: squidId,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('list', 'resource', 'success', duration, squidId);

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Resources retrieved successfully',
        data: {
          resources: resources.items,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: resources.total,
            pages: Math.ceil(resources.total / limit)
          }
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('List resources error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('list', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'LIST_RESOURCES_ERROR', 'medium');
      
      res.status(500).json({
        status: 'error',
        code: 'LIST_RESOURCES_ERROR',
        message: 'Failed to retrieve resources',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

/**
 * Get specific resource
 * GET /api/v1/resources/:id
 */
router.get('/resources/:id',
  authorize('{{MODULE_NAME}}:read'),
  validateInput([
    validationRules.uuid('id')
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const squidId = req.identity.squidId;
      
      // Get resource from service
      const resource = await req.services.example.getResource(id, {
        requester: squidId
      });

      if (!resource) {
        const duration = (Date.now() - startTime) / 1000;
        metricsCollector.recordResourceOperation('get', 'resource', 'not_found', duration, squidId);
        
        return res.status(404).json({
          status: 'error',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('get', 'resource', 'success', duration, squidId);

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Resource retrieved successfully',
        data: resource,
        cid: resource.cid,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('Get resource error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('get', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'GET_RESOURCE_ERROR', 'medium');
      
      res.status(500).json({
        status: 'error',
        code: 'GET_RESOURCE_ERROR',
        message: 'Failed to retrieve resource',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

/**
 * Create new resource
 * POST /api/v1/resources
 */
router.post('/resources',
  authorize('{{MODULE_NAME}}:write'),
  validateInput([
    validationRules.resourceName,
    validationRules.resourceDescription,
    validationRules.resourceTags
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const resourceData = req.body;
      const squidId = req.identity.squidId;
      const subId = req.identity.subId;
      
      // Create resource through service
      const resource = await req.services.example.createResource({
        ...resourceData,
        owner: { squidId, subId },
        createdBy: squidId
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('create', 'resource', 'success', duration, squidId);

      res.status(201).json({
        status: 'ok',
        code: 'RESOURCE_CREATED',
        message: 'Resource created successfully',
        data: resource,
        cid: resource.cid,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('Create resource error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('create', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'CREATE_RESOURCE_ERROR', 'medium');
      
      const statusCode = error.code === 'VALIDATION_ERROR' ? 400 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: error.code || 'CREATE_RESOURCE_ERROR',
        message: error.message || 'Failed to create resource',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

/**
 * Update resource
 * PUT /api/v1/resources/:id
 */
router.put('/resources/:id',
  authorize('{{MODULE_NAME}}:write'),
  validateInput([
    validationRules.uuid('id'),
    validationRules.resourceName,
    validationRules.resourceDescription,
    validationRules.resourceTags
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const updateData = req.body;
      const squidId = req.identity.squidId;
      
      // Update resource through service
      const resource = await req.services.example.updateResource(id, {
        ...updateData,
        updatedBy: squidId,
        updatedAt: new Date().toISOString()
      }, {
        requester: squidId
      });

      if (!resource) {
        const duration = (Date.now() - startTime) / 1000;
        metricsCollector.recordResourceOperation('update', 'resource', 'not_found', duration, squidId);
        
        return res.status(404).json({
          status: 'error',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('update', 'resource', 'success', duration, squidId);

      res.json({
        status: 'ok',
        code: 'RESOURCE_UPDATED',
        message: 'Resource updated successfully',
        data: resource,
        cid: resource.cid,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('Update resource error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('update', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'UPDATE_RESOURCE_ERROR', 'medium');
      
      const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                        error.code === 'PERMISSION_DENIED' ? 403 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: error.code || 'UPDATE_RESOURCE_ERROR',
        message: error.message || 'Failed to update resource',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

/**
 * Delete resource
 * DELETE /api/v1/resources/:id
 */
router.delete('/resources/:id',
  authorize('{{MODULE_NAME}}:delete'),
  validateInput([
    validationRules.uuid('id')
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const squidId = req.identity.squidId;
      
      // Delete resource through service
      const result = await req.services.example.deleteResource(id, {
        requester: squidId,
        reason: 'user_request'
      });

      if (!result.success) {
        const duration = (Date.now() - startTime) / 1000;
        metricsCollector.recordResourceOperation('delete', 'resource', 'not_found', duration, squidId);
        
        return res.status(404).json({
          status: 'error',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('delete', 'resource', 'success', duration, squidId);

      res.json({
        status: 'ok',
        code: 'RESOURCE_DELETED',
        message: 'Resource deleted successfully',
        data: {
          id,
          deletedAt: new Date().toISOString(),
          deletedBy: squidId
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('Delete resource error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('delete', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'DELETE_RESOURCE_ERROR', 'medium');
      
      const statusCode = error.code === 'PERMISSION_DENIED' ? 403 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: error.code || 'DELETE_RESOURCE_ERROR',
        message: error.message || 'Failed to delete resource',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

/**
 * Search resources
 * GET /api/v1/resources/search
 */
router.get('/resources/search',
  authorize('{{MODULE_NAME}}:read'),
  validateInput([
    validationRules.page,
    validationRules.limit
  ]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { q, tags, page = 1, limit = 10 } = req.query;
      const squidId = req.identity.squidId;
      
      if (!q && !tags) {
        return res.status(400).json({
          status: 'error',
          code: 'MISSING_SEARCH_PARAMS',
          message: 'Search query or tags required',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      // Search resources through service
      const results = await req.services.example.searchResources({
        query: q,
        tags: tags ? tags.split(',') : undefined,
        requester: squidId,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('search', 'resource', 'success', duration, squidId);

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Search completed successfully',
        data: {
          results: results.items,
          query: q,
          tags: tags ? tags.split(',') : undefined,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: results.total,
            pages: Math.ceil(results.total / limit)
          }
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } catch (error) {
      console.error('Search resources error:', error);
      
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordResourceOperation('search', 'resource', 'error', duration, req.identity.squidId);
      metricsCollector.recordError('api', 'SEARCH_RESOURCES_ERROR', 'medium');
      
      res.status(500).json({
        status: 'error',
        code: 'SEARCH_RESOURCES_ERROR',
        message: 'Failed to search resources',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }
);

export default router;