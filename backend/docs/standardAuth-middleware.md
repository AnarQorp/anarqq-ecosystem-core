# Standardized Authentication and Authorization Middleware

## Overview

The Standardized Authentication and Authorization Middleware implements Q ecosystem transversal compliance requirements, providing a unified approach to identity verification, permission checking, rate limiting, and security event logging across all modules.

## Features

- **sQuid Identity Verification**: Validates identity through standard headers with signature verification
- **Qonsent Permission Checking**: Implements deny-by-default authorization with granular permissions
- **Rate Limiting**: Multi-layer rate limiting with identity/subID/DAO-based limits and adaptive controls
- **Qerberos Integration**: Comprehensive security event logging for audit and anomaly detection
- **Standard Headers**: Consistent header format across all Q ecosystem modules
- **Error Handling**: Standardized error codes and response formats

## Standard Headers

All authenticated requests must include the following headers:

```
x-squid-id: <identity-id>          # Required: sQuid identity identifier
x-subid: <subidentity-id>           # Optional: Subidentity context
x-qonsent: <consent-token>          # Required for protected operations
x-sig: <qlock-signature>            # Required: Cryptographic signature
x-ts: <timestamp>                   # Required: Request timestamp (milliseconds)
x-api-version: <version>            # Required: API version (e.g., "v1")
```

## Standard Response Format

All responses follow this format:

```json
{
  "status": "ok|error",
  "code": "SUCCESS|ERROR_CODE",
  "message": "Human readable message",
  "data": {},                       // Optional: Response data
  "cid": "ipfs-content-id",         // Optional: IPFS content identifier
  "timestamp": "2025-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `SQUID_IDENTITY_INVALID` | Invalid or missing sQuid identity | 401 |
| `QLOCK_AUTH_FAIL` | Signature verification failed | 401 |
| `SIGNATURE_INVALID` | Invalid cryptographic signature | 401 |
| `QONSENT_DENIED` | Permission denied | 403 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `QERB_SUSPECT` | Suspicious activity detected | 403 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |
| `TIMEOUT_ERROR` | Request timeout | 408 |

## Middleware Components

### 1. verifySquidIdentity(options)

Validates sQuid identity through standard headers with signature verification.

**Options:**
- `required` (boolean): Whether authentication is required (default: true)
- `allowAnonymous` (boolean): Allow anonymous access when not required (default: false)

**Example:**
```javascript
import { verifySquidIdentity } from '../middleware/standardAuth.mjs';

// Required authentication
app.use('/api/protected', verifySquidIdentity({ required: true }));

// Optional authentication
app.use('/api/public', verifySquidIdentity({ required: false, allowAnonymous: true }));
```

### 2. checkQonsentPermission(permission, options)

Implements deny-by-default authorization with granular permission checking.

**Parameters:**
- `permission` (string): Required permission (e.g., 'read', 'write', 'admin')

**Options:**
- `resource` (string): Resource being accessed (optional)
- `action` (string): Action being performed (optional)
- `denyByDefault` (boolean): Deny access by default (default: true)

**Example:**
```javascript
import { checkQonsentPermission } from '../middleware/standardAuth.mjs';

// Basic permission check
app.use('/api/admin', checkQonsentPermission('admin'));

// Resource-specific permission
app.use('/api/files', checkQonsentPermission('read', { 
  resource: 'files', 
  action: 'access' 
}));
```

### 3. rateLimitByIdentity(options)

Multi-layer rate limiting with identity/subID/DAO-based limits and adaptive controls.

**Options:**
- `windowMs` (number): Time window in milliseconds (default: 60000)
- `maxRequests` (number): Maximum requests per window (default: 100)
- `maxRequestsPerSubId` (number): Maximum requests per subidentity (default: 50)
- `maxRequestsPerDAO` (number): Maximum requests per DAO (default: 200)
- `enableAdaptiveLimits` (boolean): Enable reputation-based adjustment (default: true)
- `enableExponentialBackoff` (boolean): Enable exponential backoff (default: true)

**Example:**
```javascript
import { rateLimitByIdentity } from '../middleware/standardAuth.mjs';

// Basic rate limiting
app.use('/api/messages', rateLimitByIdentity({
  windowMs: 60000,      // 1 minute
  maxRequests: 10,      // 10 requests per minute
  maxRequestsPerSubId: 5 // 5 requests per subidentity per minute
}));

// Strict rate limiting for sensitive operations
app.use('/api/admin', rateLimitByIdentity({
  windowMs: 3600000,    // 1 hour
  maxRequests: 20,      // 20 requests per hour
  enableAdaptiveLimits: false,
  enableExponentialBackoff: true
}));
```

### 4. standardAuthMiddleware(options)

Composite middleware that combines all authentication and authorization components.

**Options:**
- `requireAuth` (boolean): Whether authentication is required (default: true)
- `requiredPermission` (string): Required permission (optional)
- `resource` (string): Resource being accessed (optional)
- `action` (string): Action being performed (optional)
- `rateLimitOptions` (object): Rate limiting configuration (optional)

**Example:**
```javascript
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';

// Full authentication and authorization
app.use('/api/documents', ...standardAuthMiddleware({
  requireAuth: true,
  requiredPermission: 'write',
  resource: 'documents',
  action: 'update',
  rateLimitOptions: {
    windowMs: 300000,   // 5 minutes
    maxRequests: 50
  }
}));

// Optional authentication with rate limiting
app.use('/api/public', ...standardAuthMiddleware({
  requireAuth: false,
  rateLimitOptions: {
    windowMs: 60000,
    maxRequests: 100
  }
}));
```

## Security Event Logging

All middleware components automatically log security events to Qerberos for audit and anomaly detection:

### Event Types

- `AUTH_SUCCESS`: Successful authentication
- `AUTH_MISSING`: Missing authentication headers
- `AUTH_INCOMPLETE`: Incomplete authentication headers
- `REPLAY_ATTACK`: Expired timestamp (potential replay attack)
- `SIGNATURE_INVALID`: Invalid signature verification
- `PERMISSION_GRANTED`: Permission granted
- `PERMISSION_DENIED`: Permission denied
- `CONSENT_MISSING`: Missing consent token
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `SUSPICIOUS_ACTIVITY`: Suspicious activity patterns detected

### Event Structure

```json
{
  "type": "AUTH_EVENT_TYPE",
  "ref": "unique-event-id",
  "actor": {
    "squidId": "identity-id",
    "subId": "subidentity-id",
    "daoId": "dao-id"
  },
  "layer": "authentication",
  "verdict": "ALLOW|DENY|WARN",
  "details": {
    "reason": "Event description",
    "ip": "127.0.0.1",
    "userAgent": "client-agent",
    "path": "/api/endpoint",
    "method": "GET",
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "cid": "ipfs-content-id"
}
```

## Rate Limiting Details

### Rate Limit Hierarchy

1. **Anonymous Users**: 50% of base limit
2. **Authenticated Users**: Base limit
3. **Subidentity Users**: Separate limit per subidentity
4. **DAO Users**: Collective limit for DAO operations

### Adaptive Rate Limiting

When enabled, rate limits are adjusted based on user reputation:

```javascript
// Reputation-based multiplier (1.0 to 2.0)
const reputationMultiplier = Math.min(2.0, 1.0 + (reputation / 1000));
const adjustedLimit = baseLimit * reputationMultiplier;
```

### Exponential Backoff

For repeated violations, retry delays increase exponentially:

```javascript
// Backoff calculation
const backoffMultiplier = Math.pow(2, Math.min(violations, 10));
const retryAfter = baseDelay * backoffMultiplier;
```

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100          # Maximum requests allowed
X-RateLimit-Remaining: 95       # Remaining requests in window
X-RateLimit-Reset: 1640995200   # Window reset time (Unix timestamp)
Retry-After: 60                 # Seconds to wait (when rate limited)
```

## Integration Examples

### Basic Protected Route

```javascript
app.get('/api/profile', 
  verifySquidIdentity({ required: true }),
  (req, res) => {
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Profile retrieved',
      data: { 
        squidId: req.identity.squidId,
        subId: req.identity.subId 
      }
    });
  }
);
```

### Admin-Only Route

```javascript
app.post('/api/admin/users',
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('admin', { resource: 'users', action: 'create' }),
  (req, res) => {
    // Only admin users can access this endpoint
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'User created',
      data: { userId: Date.now() }
    });
  }
);
```

### Rate-Limited API

```javascript
app.post('/api/messages',
  rateLimitByIdentity({ 
    windowMs: 60000, 
    maxRequests: 10,
    enableAdaptiveLimits: true 
  }),
  verifySquidIdentity({ required: true }),
  checkQonsentPermission('write', { resource: 'messages' }),
  (req, res) => {
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Message sent',
      data: { messageId: Date.now() }
    });
  }
);
```

### Public API with Optional Auth

```javascript
app.get('/api/posts',
  verifySquidIdentity({ required: false, allowAnonymous: true }),
  (req, res) => {
    const posts = getPosts();
    
    // Add user-specific data if authenticated
    if (req.identity) {
      posts.forEach(post => {
        post.canEdit = post.authorId === req.identity.squidId;
      });
    }
    
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Posts retrieved',
      data: { posts, authenticated: !!req.identity }
    });
  }
);
```

## Testing

The middleware includes comprehensive tests covering:

- Identity verification with valid/invalid signatures
- Permission checking with various scenarios
- Rate limiting with different user types
- Security event logging
- Error handling and edge cases

Run tests with:

```bash
npm test -- --run tests/standardAuth.test.mjs
```

## Production Considerations

### Performance

- Rate limiting uses in-memory storage by default
- For production, consider Redis for distributed rate limiting
- Signature verification should integrate with actual Qlock service
- Permission checking should integrate with actual Qonsent service

### Security

- Implement proper signature verification with real cryptographic keys
- Use secure key management (KMS/HSM) for production
- Enable HTTPS for all communications
- Implement proper session management
- Monitor and alert on security events

### Scalability

- Use distributed caching for rate limiting
- Implement horizontal scaling for high-traffic scenarios
- Consider edge deployment for global distribution
- Monitor performance metrics and adjust limits accordingly

## Migration Guide

### From Legacy Auth

1. Replace existing auth middleware with `verifySquidIdentity`
2. Add permission checking with `checkQonsentPermission`
3. Implement rate limiting with `rateLimitByIdentity`
4. Update error handling for new error codes
5. Add security event logging integration

### Header Migration

Update client applications to use standard headers:

```javascript
// Old headers
{
  "Authorization": "Bearer token",
  "X-User-ID": "user123"
}

// New standard headers
{
  "x-squid-id": "squid-identity-123",
  "x-subid": "sub-identity-456",
  "x-qonsent": "permission-token",
  "x-sig": "cryptographic-signature",
  "x-ts": "1640995200000",
  "x-api-version": "v1"
}
```

## Support

For issues and questions:

1. Check the test files for usage examples
2. Review the example application in `examples/standardAuth-usage.mjs`
3. Consult the Q ecosystem documentation
4. File issues in the project repository