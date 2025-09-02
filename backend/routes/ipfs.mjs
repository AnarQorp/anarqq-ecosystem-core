
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import path from 'path';
import ipfsService, { 
  createSpaceForUser as createSpace,
  uploadToStoracha as uploadToIPFS,
  downloadFromStoracha as downloadFromIPFS,
  getFileInfo,
  authorizeSpace,
  IPFSService
} from '../services/ipfsService.mjs';
import { verifyToken as authenticate } from '../middleware/auth.mjs';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/zip',
      'text/plain',
      'application/json',
      'application/octet-stream'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

// Helper function to handle errors consistently
const handleError = (res, error, context = 'IPFS operation') => {
  console.error(`[IPFS] ${context} error:`, error);
  
  // Map common error codes to HTTP status codes
  const errorMap = {
    'INVALID_INPUT': 400,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'CONFLICT': 409,
    'RATE_LIMIT_EXCEEDED': 429,
    'SERVICE_UNAVAILABLE': 503
  };
  
  const statusCode = error.statusCode || errorMap[error.code] || 500;
  const errorResponse = {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
  
  res.status(statusCode).json(errorResponse);
};

// Helper to get user-specific space ID
getUserSpaceId = (userId) => {
  return `user-${userId}-space`;
};

// Create or get user's personal space
router.post('/spaces', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate = true, metadata = {}, replication = 3 } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      const error = new Error('Missing required field: name');
      error.code = 'INVALID_INPUT';
      throw error;
    }
    
    // Check if user already has a space
    const userSpaceId = getUserSpaceId(userId);
    let space;
    
    try {
      // Try to get existing space
      space = await ipfsService.storachaClient.getSpace(userSpaceId);
      console.log(`[IPFS] Found existing space for user ${userId}: ${space.id}`);
    } catch (error) {
      if (error.status === 404) {
        // Space doesn't exist, create a new one
        console.log(`[IPFS] Creating new space for user ${userId}`);
        space = await createSpace(userId, {
          name: name || `Space for ${req.user.username || userId}`,
          description: description || `Personal storage space for ${req.user.username || 'user'}`,
          isPrivate,
          metadata: {
            ...metadata,
            createdBy: userId,
            isPersonal: true
          },
          replication,
          autoAuthorize: true
        });
      } else {
        throw error;
      }
    }
    
    // Ensure user has access to the space
    await ipfsService.authorizeSpace(space.id, userId, {
      permissions: { read: true, write: true, admin: true },
      expiration: '8760h', // 1 year
      allow: ['*']
    });
    
    res.status(200).json({
      success: true,
      data: {
        id: space.id,
        name: space.name,
        description: space.description,
        isPrivate: space.isPrivate,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        metadata: space.metadata
      }
    });
    
  } catch (error) {
    handleError(res, error, 'Create space');
  }
});

// Get user's personal space info
router.get('/spaces/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSpaceId = getUserSpaceId(userId);
    
    try {
      const space = await ipfsService.storachaClient.getSpace(userSpaceId);
      
      // Verify user has access
      await ipfsService.authorizeSpace(space.id, userId, {
        permissions: { read: true },
        expiration: '1h'
      });
      
      res.status(200).json({
        success: true,
        data: {
          id: space.id,
          name: space.name,
          description: space.description,
          isPrivate: space.isPrivate,
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
          metadata: space.metadata
        }
      });
      
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Space not found',
          code: 'SPACE_NOT_FOUND'
        });
      }
      throw error;
    }
    
  } catch (error) {
    handleError(res, error, 'Get user space');
  }
});

// Upload file to IPFS
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { spaceId, metadata: metadataStr } = req.body;
    const userId = req.user.id;
    
    if (!file) {
      const error = new Error('No file uploaded');
      error.code = 'NO_FILE_UPLOADED';
      throw error;
    }
    
    // Parse metadata if provided
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.warn('Failed to parse metadata', e);
      }
    }
    
    // Use user's personal space if none specified
    const spaceDID = spaceId || getUserSpaceId(userId);
    
    // Ensure user has write access to the space
    await ipfsService.authorizeSpace(spaceDID, userId, {
      permissions: { write: true },
      expiration: '1h'
    });
    
    // Upload the file with progress support
    const uploadResult = await ipfsService.uploadFile(file, {
      spaceDID,
      metadata: {
        ...metadata,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: userId
      },
      onProgress: (progress) => {
        // Emit progress events via WebSocket if available
        if (req.app.get('io') && req.query.uploadId) {
          req.app.get('io').to(`upload-${req.query.uploadId}`).emit('upload-progress', {
            uploadId: req.query.uploadId,
            progress: progress.percent,
            loaded: progress.loaded,
            total: progress.total
          });
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        cid: uploadResult.cid,
        url: uploadResult.url,
        filename: uploadResult.filename,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        metadata: uploadResult.metadata,
        spaceDID,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    handleError(res, error, 'File upload');
  }
});

// Download file from IPFS
router.get('/download/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceId, filename: customFilename } = req.query;
    const userId = req.user.id;
    
    // Use user's personal space if none specified
    const spaceDID = spaceId || getUserSpaceId(userId);
    
    // Ensure user has read access to the space
    await ipfsService.authorizeSpace(spaceDID, userId, {
      permissions: { read: true },
      expiration: '1h'
    });
    
    // Get file info first to set proper headers
    const fileInfo = await ipfsService.getFileInfo(cid, { spaceDID });
    
    // Set appropriate headers for file download
    const filename = customFilename || 
                    fileInfo.metadata?.originalName || 
                    `file-${cid}${fileInfo.metadata?.mimeType ? '.' + mime.extension(fileInfo.metadata.mimeType) : ''}`;
    
    res.set({
      'Content-Type': fileInfo.metadata?.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': fileInfo.size,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${cid}"`
    });
    
    // Stream the file data
    const { data } = await ipfsService.downloadFile(cid, {
      spaceDID,
      onProgress: (progress) => {
        // Emit progress events via WebSocket if available
        if (req.app.get('io') && req.query.downloadId) {
          req.app.get('io').to(`download-${req.query.downloadId}`).emit('download-progress', {
            downloadId: req.query.downloadId,
            progress: progress.percent,
            loaded: progress.loaded,
            total: progress.total
          });
        }
      }
    });
    
    // Send the file data
    res.send(Buffer.from(data));
    
  } catch (error) {
    handleError(res, error, 'File download');
  }
});

// Get file information
router.get('/files/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceId, includeChildren = false } = req.query;
    const userId = req.user.id;
    
    // Use user's personal space if none specified
    const spaceDID = spaceId || getUserSpaceId(userId);
    
    // Ensure user has read access to the space
    await ipfsService.authorizeSpace(spaceDID, userId, {
      permissions: { read: true },
      expiration: '1h'
    });
    
    // Get file info with optional children
    const fileInfo = await ipfsService.getFileInfo(cid, {
      spaceDID,
      includeChildren: includeChildren === 'true',
      includePins: true,
      includeDeals: true,
      includeMetadata: true
    });
    
    res.status(200).json({
      success: true,
      data: fileInfo
    });
    
  } catch (error) {
    handleError(res, error, 'Get file info');
  }
});

// Delete a file (unpin from IPFS)
router.delete('/files/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceId } = req.query;
    const userId = req.user.id;
    
    // Use user's personal space if none specified
    const spaceDID = spaceId || getUserSpaceId(userId);
    
    // Ensure user has admin access to the space
    await ipfsService.authorizeSpace(spaceDID, userId, {
      permissions: { admin: true },
      expiration: '1h'
    });
    
    // Unpin the file (this is a soft delete)
    await ipfsService.storachaClient.unpin(cid, { spaceId: spaceDID });
    
    res.status(200).json({
      success: true,
      data: {
        cid,
        deleted: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    handleError(res, error, 'Delete file');
  }
});

// List files in a space
router.get('/files', authenticate, async (req, res) => {
  try {
    const { spaceId, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userId = req.user.id;
    
    // Use user's personal space if none specified
    const spaceDID = spaceId || getUserSpaceId(userId);
    
    // Ensure user has read access to the space
    await ipfsService.authorizeSpace(spaceDID, userId, {
      permissions: { read: true },
      expiration: '1h'
    });
    
    // List files in the space (this is a simplified example)
    // In a real implementation, you would query a database or use a more efficient method
    const files = [];
    
    res.status(200).json({
      success: true,
      data: {
        total: files.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        files: files
      }
    });
    
  } catch (error) {
    handleError(res, error, 'List files');
  }
});

// Authorize a user for a space
router.post('/spaces/:spaceId/authorize', authenticate, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { agentDID, permissions } = req.body;
    const userId = req.user.id;
    
    if (!agentDID || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentDID and permissions are required'
      });
    }
    
    const result = await authorizeSpace(spaceId, agentDID, {
      read: !!permissions.read,
      write: !!permissions.write,
      admin: !!permissions.admin
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    handleError(res, error, 'Authorizing space');
  }
});

// Upload a file to IPFS
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { spaceDID, metadata = {} } = req.body;
    const userId = req.user.id;

    // Add user metadata
    const fileMetadata = {
      originalName: originalname,
      mimeType: mimetype,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      ...(typeof metadata === 'string' ? JSON.parse(metadata) : metadata)
    };

    const result = await uploadToIPFS(buffer, {
      filename: originalname,
      contentType: mimetype,
      metadata: fileMetadata,
      spaceDID
    });

    res.status(201).json({
      success: true,
      data: {
        cid: result.cid,
        url: result.url,
        metadata: fileMetadata,
        size: buffer.length
      }
    });

  } catch (error) {
    handleError(res, error, 'Uploading file');
  }
});

// Download a file from IPFS
router.get('/download/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceDID, filename, download = 'true' } = req.query;
    
    const result = await downloadFromIPFS(cid, {
      spaceDID,
      decrypt: req.query.decrypt === 'true'
    });

    // Set appropriate headers
    const contentType = result.contentType || 'application/octet-stream';
    const contentDisposition = download === 'true' 
      ? `attachment; filename="${filename || result.filename || `file-${cid.substring(0, 8)}`}"`
      : 'inline';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', result.data.length);
    res.setHeader('Content-Disposition', contentDisposition);
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('ETag', `"${cid}"`);
    
    // Send the file data
    res.send(Buffer.from(result.data));
    
  } catch (error) {
    handleError(res, error, 'Downloading file');
  }
});

// Get file info
router.get('/files/:cid/info', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceDID } = req.query;
    
    const info = await getFileInfo(cid, { spaceDID });
    
    if (!info) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    res.json({
      success: true,
      data: info
    });
    
  } catch (error) {
    handleError(res, error, 'Fetching file info');
  }
});

// Delete a file from IPFS (unpin)
router.delete('/files/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    const { spaceDID } = req.query;
    
    // In a real implementation, you would call a service method to unpin/delete the file
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'File marked for deletion',
      cid
    });
    
  } catch (error) {
    handleError(res, error, 'Deleting file');
  }
});

// List files in a space (paginated)
router.get('/spaces/:spaceId/files', authenticate, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // In a real implementation, you would query the database for files in this space
    // This is a placeholder response
    
    res.json({
      success: true,
      data: {
        files: [],
        total: 0,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
    
  } catch (error) {
    handleError(res, error, 'Listing files');
  }
});

// Get IPFS node status
router.get('/status', authenticate, async (req, res) => {
  try {
    // In a real implementation, you would check the IPFS node status
    // This is a placeholder response
    
    res.json({
      success: true,
      data: {
        online: true,
        peerCount: 0,
        repoSize: 0,
        version: '0.1.0',
        gateway: import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs'
      }
    });
    
  } catch (error) {
    handleError(res, error, 'Getting IPFS status');
  }
});

// No additional routes needed - all routes are already defined above

export default router;
