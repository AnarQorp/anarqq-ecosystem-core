/**
 * API routes for Qindex module
 */

import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { validateRequest } from '../middleware/validation.js';
import { 
  putRecordSchema,
  getRecordSchema,
  listRecordsSchema,
  historySchema,
  deleteRecordSchema
} from '../schemas/index.js';

const logger = createLogger('Routes');

export function createRoutes(qindexCore) {
  const router = Router();

  /**
   * PUT /qindex/put - Store indexed record
   */
  router.post('/put', validateRequest(putRecordSchema), async (req, res, next) => {
    try {
      const { key, value, metadata = {}, options = {} } = req.body;
      
      // Add identity from headers if available
      if (req.headers['x-identity-id']) {
        metadata.identity = req.headers['x-identity-id'];
      }

      const result = await qindexCore.put(key, value, metadata, options);
      
      res.status(201).json(result);

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /qindex/get/:key - Retrieve record by key
   */
  router.get('/get/:key', validateRequest(getRecordSchema, 'params'), async (req, res, next) => {
    try {
      const { key } = req.params;
      const { version } = req.query;
      
      const options = { version };
      
      // Add identity from headers if available
      if (req.headers['x-identity-id']) {
        options.identity = req.headers['x-identity-id'];
      }

      const result = await qindexCore.get(key, options);
      
      if (!result) {
        return res.status(404).json({
          error: 'Record not found',
          key,
          timestamp: new Date().toISOString()
        });
      }

      res.json(result);

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /qindex/list - List records with filtering
   */
  router.get('/list', validateRequest(listRecordsSchema, 'query'), async (req, res, next) => {
    try {
      const filters = {
        prefix: req.query.prefix,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        contentType: req.query.contentType,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        sort: req.query.sort || 'created_desc'
      };

      // Add identity from headers if available
      if (req.headers['x-identity-id']) {
        filters.identity = req.headers['x-identity-id'];
      }

      const result = await qindexCore.list(filters);
      
      res.json(result);

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /qindex/history/:key - Get record history
   */
  router.get('/history/:key', validateRequest(historySchema, 'params'), async (req, res, next) => {
    try {
      const { key } = req.params;
      const options = {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      // Add identity from headers if available
      if (req.headers['x-identity-id']) {
        options.identity = req.headers['x-identity-id'];
      }

      const result = await qindexCore.getHistory(key, options);
      
      res.json(result);

    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /qindex/delete/:key - Remove record
   */
  router.delete('/delete/:key', validateRequest(deleteRecordSchema, 'params'), async (req, res, next) => {
    try {
      const { key } = req.params;
      const options = {};

      // Add identity from headers if available
      if (req.headers['x-identity-id']) {
        options.identity = req.headers['x-identity-id'];
      }

      const result = await qindexCore.delete(key, options);
      
      if (!result) {
        return res.status(404).json({
          error: 'Record not found',
          key,
          timestamp: new Date().toISOString()
        });
      }

      res.json(result);

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /qindex/stats - Get index statistics
   */
  router.get('/stats', async (req, res, next) => {
    try {
      const stats = {
        storage: await qindexCore.storage.getStats(),
        pointers: await qindexCore.pointers.getStats(),
        query: await qindexCore.query.getStats(),
        retention: await qindexCore.retention.getStats()
      };

      res.json(stats);

    } catch (error) {
      next(error);
    }
  });

  return router;
}