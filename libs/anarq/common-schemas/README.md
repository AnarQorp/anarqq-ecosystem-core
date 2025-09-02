# @anarq/common-schemas

Common schemas and data models for the Q ecosystem modules. This package provides standardized TypeScript interfaces, JSON Schema definitions, and validation utilities for consistent data structures across all Q modules.

## Features

- **Standardized Data Models**: TypeScript interfaces for all common Q ecosystem types
- **JSON Schema Validation**: Complete JSON Schema definitions with validation rules
- **Validation Utilities**: Helper functions for data validation and sanitization
- **Type Safety**: Full TypeScript support with strict typing
- **Automated Testing**: Comprehensive test suite with 90%+ coverage

## Installation

```bash
npm install @anarq/common-schemas
```

## Core Data Models

### Identity Models
- `IdentityRef`: Core identity reference structure
- `IdentityInfo`: Extended identity information with metadata

### Consent Models
- `ConsentRef`: Permission and policy reference structure
- `ConsentGrant`: Full consent grant with lifecycle management

### Cryptographic Models
- `LockSig`: Cryptographic signature structure
- `EncryptionEnvelope`: Structure for encrypted data
- `DistributedLock`: Distributed mutex operations

### Index Models
- `IndexRecord`: Structure for indexing and pointer management
- `MutablePointer`: Mutable references with history
- `QueryFilter`: Query filtering and pagination

### Audit Models
- `AuditEvent`: Security and audit logging structure
- `RiskAssessment`: Security risk scoring
- `SecurityAlert`: Security notifications

### Privacy Models
- `MaskProfile`: Privacy and anonymization profiles
- `MaskRule`: Individual masking rules
- `PrivacyAssessment`: Privacy impact assessment

## Usage

### Basic Type Usage

```typescript
import { IdentityRef, ConsentRef, AuditEvent } from '@anarq/common-schemas';

// Create an identity reference
const identity: IdentityRef = {
  squidId: 'user123',
  subId: 'work',
  daoId: 'company-dao'
};

// Create a consent reference
const consent: ConsentRef = {
  policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  scope: 'read:files',
  grant: 'grant_token_abc123',
  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
};

// Create an audit event
const auditEvent: AuditEvent = {
  type: 'DATA_ACCESS',
  ref: 'file_123',
  actor: identity,
  layer: 'qdrive',
  verdict: 'ALLOW',
  details: { action: 'download', fileSize: 1024 },
  timestamp: new Date().toISOString(),
  severity: 'LOW'
};
```

### Validation

```typescript
import { validator, ValidationError } from '@anarq/common-schemas';

// Validate data
const result = validator.validateIdentityRef(someData);
if (result.valid) {
  console.log('Valid identity:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Type-safe validation
const identityResult = validator.validateIdentityRef(data);
if (identityResult.valid) {
  // identityResult.data is now typed as IdentityRef
  console.log('Identity ID:', identityResult.data.squidId);
}

// Validate and throw on error
try {
  const validData = validateOrThrow('IdentityRef', data);
  // Use validData safely
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Utility Functions

```typescript
import {
  isValidCID,
  isValidBase64,
  sanitizeIndexKey,
  generateCorrelationId,
  createSuccessResponse,
  createErrorResponse
} from '@anarq/common-schemas';

// Validate IPFS CID
if (isValidCID('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')) {
  console.log('Valid CID');
}

// Sanitize index keys
const safeKey = sanitizeIndexKey('user@profile#name'); // Returns: 'user_profile_name'

// Generate correlation IDs
const correlationId = generateCorrelationId(); // Returns: 'corr_1640995200000_abc123def'

// Create standardized responses
const success = createSuccessResponse({ id: 123 }, 'QmCID...');
const error = createErrorResponse('VALIDATION_ERROR', 'Invalid input');
```

## JSON Schemas

All TypeScript interfaces have corresponding JSON Schema definitions in the `schemas/` directory:

- `identity.schema.json` - Identity-related schemas
- `consent.schema.json` - Consent and permission schemas
- `lock.schema.json` - Cryptographic schemas
- `index.schema.json` - Indexing and query schemas
- `audit.schema.json` - Audit and security schemas
- `mask.schema.json` - Privacy and masking schemas

### Using JSON Schemas Directly

```typescript
import { schemas } from '@anarq/common-schemas';

// Access individual schemas
const identitySchema = schemas.identity;
const consentSchema = schemas.consent;

// Use with other validation libraries
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(schemas.identity.definitions.IdentityRef);
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:watch
```

### Schema Validation

```bash
npm run validate
```

### Linting

```bash
npm run lint
```

## Schema Evolution

When updating schemas:

1. **Backward Compatibility**: Ensure new versions can validate old data
2. **Version Bumping**: Follow semantic versioning for breaking changes
3. **Migration Guides**: Provide migration paths for breaking changes
4. **Testing**: Add comprehensive tests for new schema features

## Requirements Compliance

This package fulfills the following requirements:

- **10.1**: Standardized data models (IdentityRef, ConsentRef, LockSig, IndexRecord, AuditEvent, MaskProfile)
- **10.2**: JSON Schema definitions for all common interfaces
- **17.1**: Event schema evolution and compatibility management
- **17.2**: Schema registry integration with versioning

## Contributing

1. Add new types to appropriate files in `src/types/`
2. Create corresponding JSON schemas in `schemas/`
3. Add validation methods to `src/validation/validator.ts`
4. Write comprehensive tests
5. Update documentation

## License

MIT