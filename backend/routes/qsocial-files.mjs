/**
 * Qsocial File Upload API Routes - AnarQ&Q Ecosystem Integrated
 * 
 * Handles file uploads following Q∞ architecture with full ecosystem integration:
 * Entry → Process (Qonsent → Qlock → Storj → IPFS) → Output (Qindex → Qerberos → QNET)
 */

import express from 'express';
import multer from 'multer';
import { verifySquidIdentity } from '../middleware/squidAuth.mjs';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { getStorjStorageService } from '../services/StorjStorageService.mjs';
import { getEcosystemHealth } from '../ecosystem/index.mjs';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  }
});

// Rate limiting for uploads
const uploadRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Maximum 20 uploads per window
  message: 'Demasiados uploads, intenta más tarde'
});

// Rate limiting for downloads
const downloadRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Maximum 100 downloads per minute
  message: 'Demasiados downloads, intenta más tarde'
});

/**
 * Upload single file with full ecosystem integration
 * POST /api/qsocial/files/upload
 */
router.post('/upload', verifySquidIdentity, uploadRateLimit, upload.single('file'), async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo'
      });
    }

    const storjService = getStorjStorageService();
    
    // Extract ecosystem options from request
    const uploadOptions = {
      filename: file.originalname,
      contentType: file.mimetype,
      userId,
      visibility: req.body.visibility || 'private',
      daoId: req.body.daoId || null,
      accessRules: req.body.accessRules ? JSON.parse(req.body.accessRules) : {},
      uploadSource: 'qsocial-web',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    console.log(`[Q∞ Upload] Starting ecosystem-integrated upload: ${file.originalname} (${file.size} bytes)`);
    const result = await storjService.uploadFile(file.buffer, uploadOptions);

    if (result.success) {
      res.json({
        success: true,
        message: 'Archivo subido exitosamente con integración completa del ecosistema',
        file: {
          fileId: result.fileId,
          originalName: file.originalname,
          storjUrl: result.storjUrl,
          storjKey: result.storjKey,
          fileSize: result.fileSize,
          contentType: result.contentType,
          thumbnailUrl: result.thumbnailUrl,
          uploadedAt: new Date().toISOString(),
          
          // Ecosystem integration data
          ecosystem: {
            qonsent: {
              profileId: result.qonsent?.profileId,
              visibility: result.qonsent?.visibility,
              encryptionLevel: result.qonsent?.encryptionLevel
            },
            qlock: {
              encrypted: result.qlock?.encrypted,
              encryptionLevel: result.qlock?.encryptionLevel
            },
            ipfs: {
              cid: result.ipfs?.cid,
              generated: result.ipfs?.generated
            },
            qindex: {
              indexId: result.qindex?.indexId,
              searchable: result.qindex?.searchable
            },
            qnet: {
              routingId: result.qnet?.routingId,
              routedUrl: result.qnet?.routedUrl,
              accessToken: result.qnet?.accessToken
            },
            filecoin: result.filecoin
          },
          
          processingTime: result.processingTime
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Error subiendo archivo',
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'Archivo demasiado grande. Máximo 50MB.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Upload multiple files with ecosystem integration
 * POST /api/qsocial/files/upload-multiple
 */
router.post('/upload-multiple', verifySquidIdentity, uploadRateLimit, upload.array('files', 5), async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron archivos'
      });
    }

    const storjService = getStorjStorageService();
    const uploadResults = [];

    // Upload each file with ecosystem integration
    for (const file of files) {
      const uploadOptions = {
        filename: file.originalname,
        contentType: file.mimetype,
        userId,
        visibility: req.body.visibility || 'private',
        daoId: req.body.daoId || null,
        accessRules: req.body.accessRules ? JSON.parse(req.body.accessRules) : {},
        uploadSource: 'qsocial-web',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      console.log(`[Q∞ Upload] Processing file: ${file.originalname} (${file.size} bytes)`);
      const result = await storjService.uploadFile(file.buffer, uploadOptions);

      uploadResults.push({
        originalName: file.originalname,
        success: result.success,
        fileId: result.fileId,
        storjUrl: result.storjUrl,
        storjKey: result.storjKey,
        fileSize: result.fileSize,
        contentType: result.contentType,
        thumbnailUrl: result.thumbnailUrl,
        error: result.error,
        ecosystem: result.success ? {
          qonsent: result.qonsent,
          qlock: result.qlock,
          ipfs: result.ipfs,
          qindex: result.qindex,
          qnet: result.qnet,
          filecoin: result.filecoin
        } : null,
        processingTime: result.processingTime
      });
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.length - successCount;

    res.json({
      success: failCount === 0,
      message: `${successCount} archivo(s) subido(s) exitosamente con integración del ecosistema${failCount > 0 ? `, ${failCount} fallaron` : ''}`,
      files: uploadResults,
      stats: {
        total: uploadResults.length,
        success: successCount,
        failed: failCount,
        totalProcessingTime: uploadResults.reduce((sum, r) => sum + (r.processingTime || 0), 0)
      }
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Error subiendo archivos'
    });
  }
});

/**
 * Download file with ecosystem access control
 * GET /api/qsocial/files/:fileId/download
 */
router.get('/:fileId/download', verifySquidIdentity, downloadRateLimit, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.squidIdentity.did;

    // In production, you would validate file access permissions here
    // For now, we'll construct the storjKey from fileId
    const storjService = getStorjStorageService();
    
    // This is a simplified approach - in production you'd store file metadata in database
    const storjKey = `qsocial/${userId}/${fileId}`;
    
    console.log(`Downloading file: ${storjKey}`);
    const result = await storjService.downloadFile(storjKey);

    if (result.success) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Length': result.buffer.length,
        'Content-Disposition': `attachment; filename="${result.metadata?.originalName || fileId}"`,
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(result.buffer);
    } else {
      res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Error descargando archivo'
    });
  }
});

/**
 * Get file metadata with ecosystem information
 * GET /api/qsocial/files/:fileId/metadata
 */
router.get('/:fileId/metadata', verifySquidIdentity, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.squidIdentity.did;

    const storjService = getStorjStorageService();
    const storjKey = `qsocial/${userId}/${fileId}`;
    
    console.log(`Getting metadata for: ${storjKey}`);
    const result = await storjService.getFileMetadata(storjKey);

    if (result.success) {
      res.json({
        success: true,
        metadata: {
          fileId,
          storjKey,
          contentType: result.contentType,
          contentLength: result.contentLength,
          lastModified: result.lastModified,
          etag: result.etag,
          ...result.metadata
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo metadatos'
    });
  }
});

/**
 * Generate signed URL for direct access
 * POST /api/qsocial/files/:fileId/signed-url
 */
router.post('/:fileId/signed-url', verifySquidIdentity, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { expiresIn = 3600 } = req.body; // 1 hour default
    const userId = req.squidIdentity.did;

    const storjService = getStorjStorageService();
    const storjKey = `qsocial/${userId}/${fileId}`;
    
    console.log(`Generating signed URL for: ${storjKey}`);
    const result = await storjService.generateSignedUrl(storjKey, expiresIn);

    if (result.success) {
      res.json({
        success: true,
        signedUrl: result.signedUrl,
        expiresIn: result.expiresIn,
        expiresAt: result.expiresAt
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error generando URL firmada'
      });
    }

  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando URL firmada'
    });
  }
});

/**
 * Delete file with ecosystem cleanup
 * DELETE /api/qsocial/files/:fileId
 */
router.delete('/:fileId', verifySquidIdentity, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.squidIdentity.did;

    const storjService = getStorjStorageService();
    const storjKey = `qsocial/${userId}/${fileId}`;
    
    console.log(`Deleting file: ${storjKey}`);
    const result = await storjService.deleteFile(storjKey);

    if (result.success) {
      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente',
        fileId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error eliminando archivo'
      });
    }

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando archivo'
    });
  }
});

/**
 * List user files with ecosystem metadata
 * GET /api/qsocial/files/my-files
 */
router.get('/my-files', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { maxKeys = 100 } = req.query;

    const storjService = getStorjStorageService();
    const prefix = `qsocial/${userId}/`;
    
    console.log(`Listing files for user: ${userId}`);
    const result = await storjService.listFiles(prefix, parseInt(maxKeys));

    if (result.success) {
      res.json({
        success: true,
        files: result.files.map(file => ({
          fileId: file.key.split('/').pop(),
          storjKey: file.key,
          size: file.size,
          lastModified: file.lastModified,
          etag: file.etag
        })),
        isTruncated: result.isTruncated,
        nextContinuationToken: result.nextContinuationToken
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error listando archivos'
      });
    }

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando archivos'
    });
  }
});

/**
 * Get IPFS information for file with ecosystem integration
 * GET /api/qsocial/files/:fileId/ipfs
 */
router.get('/:fileId/ipfs', verifySquidIdentity, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.squidIdentity.did;

    // In production, you would query Qindex for the actual IPFS CID
    // For now, we'll return a placeholder response with ecosystem integration
    const { getQindexService } = await import('../ecosystem/index.mjs');
    const qindexService = getQindexService();
    
    try {
      // Try to get file from Qindex
      const indexRecord = await qindexService.getFileByCID(`mock_cid_${fileId}`);
      
      res.json({
        success: true,
        ipfs: {
          fileId,
          cid: indexRecord.cid,
          gatewayUrls: [
            `https://ipfs.io/ipfs/${indexRecord.cid}`,
            `https://gateway.pinata.cloud/ipfs/${indexRecord.cid}`,
            `https://cloudflare-ipfs.com/ipfs/${indexRecord.cid}`
          ],
          filecoinStatus: 'prepared',
          filecoinCid: indexRecord.cid,
          ecosystem: {
            indexed: true,
            searchable: indexRecord.searchable,
            visibility: indexRecord.visibility
          }
        }
      });
    } catch (indexError) {
      // Fallback to mock data if not found in index
      const mockCid = `bafybeig${crypto.randomBytes(25).toString('hex').substring(0, 50)}`;
      res.json({
        success: true,
        ipfs: {
          fileId,
          cid: mockCid,
          gatewayUrls: [
            `https://ipfs.io/ipfs/${mockCid}`,
            `https://gateway.pinata.cloud/ipfs/${mockCid}`,
            `https://cloudflare-ipfs.com/ipfs/${mockCid}`
          ],
          filecoinStatus: 'prepared',
          filecoinCid: mockCid,
          ecosystem: {
            indexed: false,
            searchable: false,
            visibility: 'unknown'
          }
        }
      });
    }

  } catch (error) {
    console.error('IPFS info error:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo información IPFS'
    });
  }
});

/**
 * Health check for file storage service
 * GET /api/qsocial/files/health
 */
router.get('/health', async (req, res) => {
  try {
    const storjService = getStorjStorageService();
    const health = await storjService.healthCheck();
    
    const isHealthy = health.storj && health.bucket;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      health,
      message: isHealthy ? 'Servicio saludable' : 'Problemas de conectividad'
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Error en health check',
      health: {
        storj: false,
        ipfs: false,
        bucket: false
      }
    });
  }
});

/**
 * Ecosystem health check - Full AnarQ&Q ecosystem status
 * GET /api/qsocial/files/ecosystem/health
 */
router.get('/ecosystem/health', async (req, res) => {
  try {
    const ecosystemHealth = await getEcosystemHealth();
    
    const isHealthy = ecosystemHealth.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      ecosystem: ecosystemHealth,
      message: isHealthy ? 'Ecosistema AnarQ&Q saludable' : 'Problemas en el ecosistema'
    });

  } catch (error) {
    console.error('Ecosystem health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Error en health check del ecosistema',
      ecosystem: {
        status: 'error',
        error: error.message
      }
    });
  }
});

/**
 * Search files in Qindex
 * GET /api/qsocial/files/search
 */
router.get('/search', verifySquidIdentity, async (req, res) => {
  try {
    const {
      query,
      contentType,
      visibility,
      tags,
      limit = 20,
      offset = 0
    } = req.query;

    const { getQindexService } = await import('../ecosystem/index.mjs');
    const qindexService = getQindexService();

    const searchParams = {
      query,
      contentType,
      visibility,
      tags: tags ? tags.split(',') : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const searchResults = await qindexService.searchFiles(searchParams);

    res.json({
      success: true,
      results: searchResults.results,
      pagination: {
        total: searchResults.total,
        limit: searchResults.limit,
        offset: searchResults.offset,
        hasMore: searchResults.hasMore
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Error en búsqueda de archivos'
    });
  }
});

/**
 * Get ecosystem statistics
 * GET /api/qsocial/files/ecosystem/stats
 */
router.get('/ecosystem/stats', verifySquidIdentity, async (req, res) => {
  try {
    const { 
      getQindexService, 
      getQerberosService, 
      getQNETService,
      getQonsentService,
      getQlockService 
    } = await import('../ecosystem/index.mjs');

    const [
      qindexStats,
      qerberosStats,
      qnetStats,
      qonsentStats,
      qlockStats
    ] = await Promise.all([
      getQindexService().getIndexStats(),
      getQerberosService().getSystemStats(),
      getQNETService().getNetworkStats(),
      getQonsentService().getProfileStats(),
      getQlockService().getEncryptionStats()
    ]);

    res.json({
      success: true,
      ecosystem: {
        qindex: qindexStats,
        qerberos: qerberosStats,
        qnet: qnetStats,
        qonsent: qonsentStats,
        qlock: qlockStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ecosystem stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas del ecosistema'
    });
  }
});

/**
 * Get user activity from Qerberos
 * GET /api/qsocial/files/my-activity
 */
router.get('/my-activity', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { limit = 50, offset = 0 } = req.query;

    const { getQerberosService } = await import('../ecosystem/index.mjs');
    const qerberosService = getQerberosService();

    const userActivity = await qerberosService.getUserEvents(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      activity: userActivity.events,
      pagination: {
        total: userActivity.total,
        limit: userActivity.limit,
        offset: userActivity.offset
      }
    });

  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo actividad del usuario'
    });
  }
});

export default router;