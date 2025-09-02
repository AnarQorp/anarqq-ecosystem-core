# Registration API Reference

The Registration API provides endpoints for registering, updating, and deregistering modules in the Q ecosystem.

## Endpoints

### Register Module

Register a new module in the ecosystem.

**Endpoint:** `POST /api/modules/register`

**Authentication:** Required (ROOT, DAO, or ENTERPRISE identity)

**Request Body:**
```typescript
{
  moduleInfo: {
    name: string;                    // Module name (3-50 characters)
    version: string;                 // Semantic version (e.g., "1.0.0")
    description: string;             // Description (10-500 characters)
    identitiesSupported: IdentityType[];  // Supported identity types
    integrations: string[];          // Ecosystem service integrations
    repositoryUrl: string;           // Git repository URL
    documentationCid?: string;       // IPFS CID for documentation
    auditHash?: string;              // SHA256 audit hash
    compliance?: {                   // Compliance information
      audit?: boolean;
      risk_scoring?: boolean;
      privacy_enforced?: boolean;
      kyc_support?: boolean;
      gdpr_compliant?: boolean;
      data_retention_policy?: string;
    };
  };
  testMode?: boolean;                // Register in sandbox mode
  skipValidation?: boolean;          // Skip validation checks
  customMetadata?: Record<string, any>;  // Additional metadata
}
```

**Response:**
```typescript
{
  success: boolean;
  moduleId: string;
  cid?: string;                      // IPFS CID of stored metadata
  indexId?: string;                  // Qindex identifier
  timestamp?: string;                // Registration timestamp
  error?: string;                    // Error message if failed
  warnings?: string[];               // Non-fatal warnings
}
```

**Example Request:**
```bash
curl -X POST https://api.example.com/api/modules/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <identity-token>" \
  -d '{
    "moduleInfo": {
      "name": "qwallet-payments",
      "version": "1.2.0",
      "description": "Advanced payment processing module for Qwallet",
      "identitiesSupported": ["ROOT", "DAO", "ENTERPRISE"],
      "integrations": ["Qindex", "Qlock", "Qerberos"],
      "repositoryUrl": "https://github.com/example/qwallet-payments",
      "documentationCid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "auditHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "compliance": {
        "audit": true,
        "privacy_enforced": true,
        "gdpr_compliant": true,
        "data_retention_policy": "30_days"
      }
    },
    "testMode": false
  }'
```

**Example Response:**
```json
{
  "success": true,
  "moduleId": "qwallet-payments",
  "cid": "QmYwAPJzv5CZsnA8rdHaSmKRvQnHY7z6B3TmcvbPjHp8xw",
  "indexId": "idx_1234567890abcdef",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "warnings": []
}
```

### Update Module

Update an existing module's metadata.

**Endpoint:** `PUT /api/modules/{moduleId}`

**Authentication:** Required (Original registrant or authorized identity)

**Path Parameters:**
- `moduleId` (string): The module identifier

**Request Body:**
```typescript
{
  version?: string;                  // New version number
  description?: string;              // Updated description
  identitiesSupported?: IdentityType[];  // Updated supported identities
  integrations?: string[];           // Updated integrations
  repositoryUrl?: string;            // Updated repository URL
  documentationCid?: string;         // Updated documentation CID
  auditHash?: string;                // Updated audit hash
  compliance?: Partial<ModuleCompliance>;  // Updated compliance info
}
```

**Response:**
```typescript
{
  success: boolean;
  moduleId: string;
  cid?: string;
  indexId?: string;
  timestamp?: string;
  error?: string;
}
```

**Example Request:**
```bash
curl -X PUT https://api.example.com/api/modules/qwallet-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <identity-token>" \
  -d '{
    "version": "1.2.1",
    "description": "Advanced payment processing module with bug fixes",
    "auditHash": "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1"
  }'
```

### Deregister Module

Remove a module from the ecosystem.

**Endpoint:** `DELETE /api/modules/{moduleId}`

**Authentication:** Required (Original registrant or authorized identity)

**Path Parameters:**
- `moduleId` (string): The module identifier

**Query Parameters:**
- `force` (boolean, optional): Force deregistration even with dependencies

**Response:**
```typescript
{
  success: boolean;
  moduleId: string;
  message?: string;
  error?: string;
}
```

**Example Request:**
```bash
curl -X DELETE https://api.example.com/api/modules/qwallet-payments \
  -H "Authorization: Bearer <identity-token>"
```

### Batch Register

Register multiple modules in a single operation.

**Endpoint:** `POST /api/modules/batch-register`

**Authentication:** Required (ROOT identity recommended)

**Request Body:**
```typescript
{
  modules: ModuleRegistrationRequest[];  // Array of registration requests
  continueOnError?: boolean;             // Continue if individual modules fail
  testMode?: boolean;                    // Register all in sandbox mode
}
```

**Response:**
```typescript
{
  success: boolean;
  results: {
    [moduleId: string]: ModuleRegistrationResult;
  };
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
  };
}
```

**Example Request:**
```bash
curl -X POST https://api.example.com/api/modules/batch-register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <identity-token>" \
  -d '{
    "modules": [
      {
        "moduleInfo": {
          "name": "module-one",
          "version": "1.0.0",
          "description": "First module",
          "identitiesSupported": ["ROOT"],
          "integrations": ["Qindex"],
          "repositoryUrl": "https://github.com/example/module-one"
        }
      },
      {
        "moduleInfo": {
          "name": "module-two",
          "version": "1.0.0",
          "description": "Second module",
          "identitiesSupported": ["DAO"],
          "integrations": ["Qlock"],
          "repositoryUrl": "https://github.com/example/module-two"
        }
      }
    ],
    "continueOnError": true,
    "testMode": false
  }'
```

## Sandbox Operations

### Register Sandbox Module

Register a module in sandbox/test mode.

**Endpoint:** `POST /api/modules/sandbox/register`

**Authentication:** Required

**Request Body:** Same as regular registration

**Response:** Same as regular registration with `testMode: true` indicator

### Promote Sandbox Module

Promote a sandbox module to production.

**Endpoint:** `POST /api/modules/{moduleId}/promote`

**Authentication:** Required (ROOT identity)

**Path Parameters:**
- `moduleId` (string): The sandbox module identifier

**Response:**
```typescript
{
  success: boolean;
  moduleId: string;
  promotedAt: string;
  message?: string;
  error?: string;
}
```

## Error Responses

All endpoints may return error responses with the following structure:

```typescript
{
  success: false,
  error: string,                     // Error message
  code: string,                      // Error code
  details?: any,                     // Additional error details
  suggestions?: string[]             // Suggested actions
}
```

### Common Error Codes

- `INVALID_METADATA` - Module metadata validation failed
- `UNAUTHORIZED_SIGNER` - Identity not authorized for operation
- `MODULE_ALREADY_EXISTS` - Module with same name/version exists
- `DEPENDENCY_NOT_FOUND` - Required dependencies missing
- `SIGNATURE_VERIFICATION_FAILED` - Cryptographic signature invalid
- `NETWORK_ERROR` - Network connectivity issues
- `SERVICE_UNAVAILABLE` - Backend services unavailable
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Validation Rules

### Module Name
- Length: 3-50 characters
- Pattern: Alphanumeric, hyphens, underscores only
- Must be unique within the ecosystem

### Version
- Must follow semantic versioning (e.g., "1.0.0")
- Cannot register same version twice for same module
- Pre-release versions allowed (e.g., "1.0.0-beta.1")

### Description
- Length: 10-500 characters
- Must be descriptive and meaningful
- No HTML or markdown formatting

### Repository URL
- Must be valid HTTP/HTTPS URL
- Should point to accessible Git repository
- GitHub, GitLab, and other platforms supported

### Documentation CID
- Must be valid IPFS CID format
- Content should be accessible via IPFS
- Recommended formats: Markdown, HTML, PDF

### Audit Hash
- Must be valid SHA256 hash (64 hex characters)
- Should represent hash of security audit results
- Required for production modules

## Rate Limiting

Registration endpoints have the following rate limits:

- **Individual Registration**: 10 requests per minute per identity
- **Batch Registration**: 5 requests per minute per identity
- **Updates**: 20 requests per minute per identity
- **Deregistration**: 5 requests per minute per identity

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

## Best Practices

### 1. Use Semantic Versioning
Always follow semantic versioning for module versions:
- Major version for breaking changes
- Minor version for new features
- Patch version for bug fixes

### 2. Provide Comprehensive Metadata
Include all optional fields when possible:
- Documentation CID for user guides
- Audit hash for security verification
- Compliance information for regulatory requirements

### 3. Test in Sandbox First
Always test module registration in sandbox mode before production:
```typescript
const result = await registerModule({
  moduleInfo,
  testMode: true  // Register in sandbox
});

// After testing, promote to production
await promoteSandboxModule(result.moduleId);
```

### 4. Handle Errors Gracefully
Implement proper error handling with retry logic:
```typescript
try {
  const result = await registerModule(request);
  if (!result.success) {
    // Handle registration failure
    console.error('Registration failed:', result.error);
  }
} catch (error) {
  if (error.retryable) {
    // Implement retry with exponential backoff
    await retryWithBackoff(() => registerModule(request));
  }
}
```

### 5. Monitor Registration Status
Check registration status after completion:
```typescript
const status = await getRegistrationStatus(moduleId);
if (status.verified) {
  console.log('Module successfully verified');
} else {
  console.log('Verification issues:', status.issues);
}
```

## SDK Examples

### TypeScript/JavaScript

```typescript
import { ModuleRegistrationService } from '@qwallet/module-registry';

const service = new ModuleRegistrationService();

// Register module
const result = await service.registerModule({
  moduleInfo: {
    name: 'my-module',
    version: '1.0.0',
    description: 'My awesome module',
    identitiesSupported: ['ROOT', 'DAO'],
    integrations: ['Qindex'],
    repositoryUrl: 'https://github.com/me/my-module'
  }
}, signerIdentity);

console.log('Registration result:', result);
```

### React Hook

```typescript
import { useQindexRegistration } from '@qwallet/hooks';

function ModuleRegistrationForm() {
  const {
    registerModule,
    loading,
    error,
    registrationResult
  } = useQindexRegistration();

  const handleSubmit = async (formData) => {
    await registerModule({
      moduleInfo: formData
    });
  };

  if (loading) return <div>Registering module...</div>;
  if (error) return <div>Error: {error}</div>;
  if (registrationResult?.success) {
    return <div>Module registered successfully!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

*For more examples and advanced usage, see the [Examples](./examples/) section.*