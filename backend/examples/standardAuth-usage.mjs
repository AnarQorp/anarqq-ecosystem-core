/**
 * Example Usage of Standardized Authentication and Authorization Middleware
 * Demonstrates Q ecosystem transversal compliance implementation
 */

import express from 'express';
import {
  verifySquidIdentity,
  checkQonsentPermission,
  rateLimitByIdentity,
  standardAuthMiddleware,
  ErrorCodes
} from '../middleware/standardAuth.mjs';

const app = express();
app.use(express.json());

// Example 1: Public endpoint with optional authentication
app.get('/api/public/posts', 
  verifySquidIdentity({ required: false, allowAnonymous: true }),
  async (req, res) => {
    const posts = [
      { id: 1, title: 'Public Post 1', content: 'This is public content' },
      { id: 2, title: 'Public Post 2', content: 'Another public post' }
    ];

    // Add user-specific data if authenticated
    if (req.identity) {
      posts.forEach(post => {
        post.canEdit = req.identity.squidId === 'author-squid-id';
      });
    }

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Posts retrieved successfully',
      data: { posts, authenticated: !!req.identity }
    });
  }
);

// Example 2: Protected endpoint requiring authentication only
app.get('/api/protected/profile',
  verifySquidIdentity({ required: true }),
  async (req, res) => {
    const profile = {
      squidId: req.identity.squidId,
      subId: req.identity.subId,
      apiVersion: req.identity.apiVersion,
      lastLogin: new Date().toISOString()
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Profile retrieved successfully',
      data: { profile }
    });
  }
);

// Example 3: Endpoint requiring specific permissions
app.post('/api/admin/users',
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('admin', { resource: 'users', action: 'create' }),
  async (req, res) => {
    // Only users with admin permission can create users
    const newUser = {
      id: Date.now(),
      ...req.body,
      createdBy: req.identity.squidId,
      createdAt: new Date().toISOString()
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'User created successfully',
      data: { user: newUser }
    });
  }
);

// Example 4: Rate-limited endpoint
app.post('/api/messages',
  rateLimitByIdentity({ 
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 messages per minute
    maxRequestsPerSubId: 5, // 5 messages per subidentity per minute
    enableAdaptiveLimits: true, // Adjust based on reputation
    enableExponentialBackoff: true // Increase delays for violations
  }),
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('write', { resource: 'messages' }),
  async (req, res) => {
    const message = {
      id: Date.now(),
      content: req.body.content,
      from: req.identity.squidId,
      subId: req.identity.subId,
      timestamp: new Date().toISOString()
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Message sent successfully',
      data: { message }
    });
  }
);

// Example 5: Using the composite standardAuthMiddleware
app.put('/api/documents/:id',
  ...standardAuthMiddleware({
    requireAuth: true,
    requiredPermission: 'write',
    resource: 'documents',
    action: 'update',
    rateLimitOptions: {
      windowMs: 300000, // 5 minutes
      maxRequests: 50,
      enableAdaptiveLimits: true
    }
  }),
  async (req, res) => {
    const documentId = req.params.id;
    const updates = req.body;

    // Simulate document update
    const document = {
      id: documentId,
      ...updates,
      updatedBy: req.identity.squidId,
      updatedAt: new Date().toISOString(),
      version: Date.now()
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Document updated successfully',
      data: { document },
      cid: `Qm${Math.random().toString(36).substring(2, 15)}` // Mock IPFS CID
    });
  }
);

// Example 6: Different permission levels for different operations
app.get('/api/files/:id',
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('read', { resource: 'files' }),
  async (req, res) => {
    const fileId = req.params.id;
    
    const file = {
      id: fileId,
      name: `file-${fileId}.txt`,
      size: 1024,
      owner: 'owner-squid-id',
      permissions: req.permissions
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'File retrieved successfully',
      data: { file }
    });
  }
);

app.delete('/api/files/:id',
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('delete', { resource: 'files' }),
  async (req, res) => {
    const fileId = req.params.id;

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'File deleted successfully',
      data: { fileId, deletedBy: req.identity.squidId }
    });
  }
);

// Example 7: Subidentity-specific operations
app.post('/api/subidentity/actions',
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('execute', { resource: 'subidentity-actions' }),
  async (req, res) => {
    if (!req.identity.subId) {
      return res.status(400).json({
        status: 'error',
        code: 'SUBIDENTITY_REQUIRED',
        message: 'This operation requires a subidentity context'
      });
    }

    const action = {
      id: Date.now(),
      type: req.body.type,
      squidId: req.identity.squidId,
      subId: req.identity.subId,
      executedAt: new Date().toISOString()
    };

    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Subidentity action executed successfully',
      data: { action }
    });
  }
);

// Example 8: Error handling middleware
app.use((error, req, res, next) => {
  console.error('[StandardAuth Example] Error:', error);

  // Handle specific authentication errors
  if (error.code === ErrorCodes.SQUID_IDENTITY_INVALID) {
    return res.status(401).json({
      status: 'error',
      code: error.code,
      message: 'Invalid sQuid identity',
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === ErrorCodes.QONSENT_DENIED) {
    return res.status(403).json({
      status: 'error',
      code: error.code,
      message: 'Permission denied',
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
    return res.status(429).json({
      status: 'error',
      code: error.code,
      message: 'Rate limit exceeded',
      timestamp: new Date().toISOString()
    });
  }

  // Generic error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (bypasses authentication)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    code: 'SUCCESS',
    message: 'Service is healthy',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    }
  });
});

// Example client request headers for testing:
/*
Valid authenticated request headers:
{
  "x-squid-id": "test-squid-123",
  "x-subid": "test-sub-456", // Optional
  "x-qonsent": "valid-permission-token",
  "x-sig": "valid-signature-hash",
  "x-ts": "1691234567890",
  "x-api-version": "v1",
  "Content-Type": "application/json"
}

Example curl commands:

# Public endpoint (no auth required)
curl -X GET http://localhost:3000/api/public/posts

# Protected endpoint (auth required)
curl -X GET http://localhost:3000/api/protected/profile \
  -H "x-squid-id: test-squid-123" \
  -H "x-sig: valid-signature" \
  -H "x-ts: $(date +%s)000" \
  -H "x-api-version: v1"

# Admin endpoint (auth + permission required)
curl -X POST http://localhost:3000/api/admin/users \
  -H "x-squid-id: admin-squid-123" \
  -H "x-qonsent: admin-permission-token" \
  -H "x-sig: valid-signature" \
  -H "x-ts: $(date +%s)000" \
  -H "x-api-version: v1" \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "email": "user@example.com"}'

# Rate limited endpoint
curl -X POST http://localhost:3000/api/messages \
  -H "x-squid-id: test-squid-123" \
  -H "x-qonsent: write-permission-token" \
  -H "x-sig: valid-signature" \
  -H "x-ts: $(date +%s)000" \
  -H "x-api-version: v1" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, world!"}'
*/

const PORT = process.env.PORT || 3000;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`[StandardAuth Example] Server running on port ${PORT}`);
    console.log(`[StandardAuth Example] Health check: http://localhost:${PORT}/health`);
    console.log(`[StandardAuth Example] Public endpoint: http://localhost:${PORT}/api/public/posts`);
  });
}

export default app;