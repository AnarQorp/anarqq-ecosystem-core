import { Router } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// File upload endpoint
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        code: 'NO_FILE',
        message: 'No file provided',
        timestamp: new Date().toISOString()
      });
    }

    // Parse metadata
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (error) {
        metadata = req.body.metadata;
      }
    }

    // For now, return a mock response
    // In full implementation, this would use FileService
    const result = {
      cid: 'QmMockCID123456789',
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      encrypted: req.body.encrypt !== 'false',
      createdAt: new Date().toISOString()
    };

    logger.info('File uploaded', { 
      name: result.name, 
      size: result.size,
      actor: req.actor.squidId 
    });

    res.status(201).json({
      status: 'ok',
      code: 'FILE_UPLOADED',
      message: 'File uploaded successfully',
      data: result,
      cid: result.cid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// File download endpoint
router.get('/:cid', async (req, res, next) => {
  try {
    const { cid } = req.params;
    
    // For now, return a mock response
    logger.info('File download requested', { cid, actor: req.actor.squidId });

    res.status(200).json({
      status: 'ok',
      code: 'FILE_RETRIEVED',
      message: 'File retrieved successfully',
      data: {
        cid,
        name: 'mock-file.txt',
        size: 1024,
        mimeType: 'text/plain',
        content: 'Mock file content'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// List files endpoint
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, tags, privacy, sort = 'created_at', order = 'desc' } = req.query;

    // For now, return mock data
    const files = [
      {
        cid: 'QmMockCID123456789',
        name: 'document.pdf',
        size: 1048576,
        mimeType: 'application/pdf',
        tags: ['document', 'important'],
        privacy: 'private',
        createdAt: '2024-01-15T10:30:00Z'
      }
    ];

    logger.info('Files listed', { 
      count: files.length, 
      actor: req.actor.squidId 
    });

    res.json({
      status: 'ok',
      code: 'FILES_RETRIEVED',
      message: 'Files retrieved successfully',
      data: {
        files,
        pagination: {
          total: files.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: false
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as fileRoutes };