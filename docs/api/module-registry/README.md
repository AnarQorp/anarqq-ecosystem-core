# Module Registry API Documentation

Welcome to the comprehensive API documentation for the Qwallet Module Registration system. This documentation provides detailed information about all registration endpoints, usage examples, integration guides, and best practices for developers.

## 📚 Documentation Structure

### Core API Reference
- [**Registration API**](./registration-api.md) - Core module registration endpoints
- [**Discovery API**](./discovery-api.md) - Module search and discovery endpoints  
- [**Verification API**](./verification-api.md) - Module verification and validation endpoints
- [**Management API**](./management-api.md) - Module lifecycle management endpoints

### Integration Guides
- [**Getting Started**](./getting-started.md) - Quick start guide for new developers
- [**Authentication**](./authentication.md) - Identity and authentication requirements
- [**SDK Integration**](./sdk-integration.md) - Using the JavaScript/TypeScript SDK
- [**CLI Tools**](./cli-tools.md) - Command-line interface documentation

### Advanced Topics
- [**Batch Operations**](./batch-operations.md) - Registering multiple modules
- [**Sandbox Mode**](./sandbox-mode.md) - Testing and development workflows
- [**Error Handling**](./error-handling.md) - Comprehensive error handling guide
- [**Performance**](./performance.md) - Optimization and best practices

### Reference Materials
- [**API Explorer**](./api-explorer.html) - Interactive API testing interface
- [**Type Definitions**](./types.md) - Complete TypeScript type definitions
- [**Examples**](./examples/) - Code examples and sample implementations
- [**Troubleshooting**](./troubleshooting.md) - Common issues and solutions
- [**FAQ**](./faq.md) - Frequently asked questions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or compatible JavaScript runtime
- Valid identity credentials (ROOT, DAO, or ENTERPRISE)
- Access to the AnarQ & Q ecosystem services

### Basic Registration Example

```typescript
import { ModuleRegistrationService } from '@/services/ModuleRegistrationService';
import { useQindexRegistration } from '@/hooks/useQindexRegistration';

// Using the service directly
const registrationService = new ModuleRegistrationService();

const moduleInfo = {
  name: 'my-awesome-module',
  version: '1.0.0',
  description: 'An awesome module for the Q ecosystem',
  identitiesSupported: ['ROOT', 'DAO'],
  integrations: ['Qindex', 'Qlock'],
  repositoryUrl: 'https://github.com/example/my-awesome-module'
};

const result = await registrationService.registerModule(
  { moduleInfo },
  signerIdentity
);

// Using the React hook
const {
  registerModule,
  loading,
  error,
  registrationResult
} = useQindexRegistration();

const handleRegister = async () => {
  await registerModule({ moduleInfo });
};
```

### CLI Registration Example

```bash
# Register a module interactively
qwallet-module-cli register --interactive

# Register with command line options
qwallet-module-cli register \
  --name "my-module" \
  --version "1.0.0" \
  --description "My test module" \
  --repository "https://github.com/example/my-module"

# Verify a registered module
qwallet-module-cli verify my-module

# List all registered modules
qwallet-module-cli list
```

## 🔗 API Endpoints Overview

### Registration Endpoints
- `POST /api/modules/register` - Register a new module
- `PUT /api/modules/{moduleId}` - Update an existing module
- `DELETE /api/modules/{moduleId}` - Deregister a module
- `POST /api/modules/batch-register` - Register multiple modules

### Discovery Endpoints
- `GET /api/modules` - List all modules with filtering
- `GET /api/modules/{moduleId}` - Get specific module details
- `GET /api/modules/search` - Search modules with criteria
- `GET /api/modules/by-type/{type}` - Get modules by type
- `GET /api/modules/for-identity/{identityType}` - Get compatible modules

### Verification Endpoints
- `POST /api/modules/{moduleId}/verify` - Verify module registration
- `GET /api/modules/{moduleId}/status` - Get registration status
- `GET /api/modules/{moduleId}/history` - Get registration history

### Sandbox Endpoints
- `POST /api/modules/sandbox/register` - Register in sandbox mode
- `POST /api/modules/{moduleId}/promote` - Promote from sandbox
- `GET /api/modules/sandbox` - List sandbox modules

## 🛡️ Security & Authentication

All API endpoints require proper authentication using valid identity credentials. The system supports:

- **ROOT Identity**: Full access to all operations
- **DAO Identity**: Limited to DAO-specific modules
- **ENTERPRISE Identity**: Limited to enterprise modules

Authentication is handled through the Qlock signature system with cryptographic verification.

## 📊 Rate Limits

To ensure system stability, the following rate limits apply:

- **Registration**: 10 requests per minute per identity
- **Discovery**: 100 requests per minute per identity  
- **Verification**: 50 requests per minute per identity
- **Batch Operations**: 5 requests per minute per identity

## 🆘 Support

- **Documentation Issues**: [GitHub Issues](https://github.com/example/qwallet/issues)
- **API Questions**: [Developer Forum](https://forum.example.com)
- **Technical Support**: support@example.com

## 📄 License

This API documentation is licensed under [MIT License](./LICENSE).

---

*Last updated: ${new Date().toISOString()}*
*API Version: 1.0.0*