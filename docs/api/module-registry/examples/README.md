# Code Examples

This directory contains practical code examples for using the Module Registry API in various scenarios and programming languages.

## 📁 Directory Structure

### Basic Examples
- [`basic-registration.js`](./basic-registration.js) - Simple module registration
- [`module-discovery.js`](./module-discovery.js) - Finding and searching modules
- [`module-verification.js`](./module-verification.js) - Verifying module status

### Advanced Examples
- [`batch-operations.js`](./batch-operations.js) - Registering multiple modules
- [`error-handling.js`](./error-handling.js) - Comprehensive error handling
- [`dependency-management.js`](./dependency-management.js) - Managing module dependencies

### React Examples
- [`react-registration-form.tsx`](./react-registration-form.tsx) - Registration form component
- [`react-module-browser.tsx`](./react-module-browser.tsx) - Module discovery interface
- [`react-hooks-examples.tsx`](./react-hooks-examples.tsx) - Using React hooks

### CLI Examples
- [`cli-scripts/`](./cli-scripts/) - Shell scripts for common operations
- [`ci-cd-examples/`](./ci-cd-examples/) - CI/CD pipeline configurations

### Integration Examples
- [`express-middleware.js`](./express-middleware.js) - Express.js middleware
- [`nextjs-api-routes.js`](./nextjs-api-routes.js) - Next.js API integration
- [`webhook-handlers.js`](./webhook-handlers.js) - Webhook event handling

## 🚀 Quick Start

### Prerequisites

```bash
npm install @qwallet/module-registry @qwallet/hooks
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

### Run Examples

```bash
# Basic registration
node basic-registration.js

# Module discovery
node module-discovery.js

# React examples (requires React setup)
npm run dev
```

## 📋 Example Categories

### 1. Registration Examples
- Simple module registration
- Advanced registration with compliance
- Sandbox mode registration
- Batch registration
- Update existing modules

### 2. Discovery Examples
- List all modules
- Search with filters
- Find compatible modules
- Get module details
- Dependency resolution

### 3. Verification Examples
- Verify module signatures
- Check registration status
- Validate compliance
- Audit trail inspection

### 4. Error Handling Examples
- Retry mechanisms
- Fallback strategies
- Error recovery
- Logging and monitoring

### 5. Integration Examples
- Web application integration
- API middleware
- CLI tool development
- CI/CD automation

## 🛠️ Development Setup

### Local Development

```bash
# Clone examples
git clone https://github.com/qwallet/module-registry-examples.git
cd module-registry-examples

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run examples
npm run examples
```

### Testing Examples

```bash
# Run all example tests
npm test

# Run specific example
npm test -- --grep "basic-registration"

# Run with coverage
npm run test:coverage
```

## 📖 Usage Patterns

### Pattern 1: Simple Registration

```javascript
const { ModuleRegistrationService } = require('@qwallet/module-registry');

const service = new ModuleRegistrationService();
const result = await service.registerModule(moduleRequest, identity);
```

### Pattern 2: Error Handling

```javascript
try {
  await service.registerModule(request, identity);
} catch (error) {
  if (error.retryable) {
    await retryWithBackoff(() => service.registerModule(request, identity));
  }
}
```

### Pattern 3: React Integration

```jsx
const { registerModule, loading, error } = useQindexRegistration();

const handleSubmit = async (formData) => {
  await registerModule({ moduleInfo: formData });
};
```

## 🔧 Configuration

### API Configuration

```javascript
// config/module-registry.js
export const config = {
  apiEndpoint: process.env.QWALLET_API_ENDPOINT,
  identity: {
    did: process.env.QWALLET_IDENTITY_DID,
    privateKey: process.env.QWALLET_IDENTITY_PRIVATE_KEY
  },
  defaults: {
    testMode: process.env.NODE_ENV !== 'production'
  }
};
```

### Environment Variables

```bash
# Required
QWALLET_API_ENDPOINT=https://api.qwallet.example.com
QWALLET_IDENTITY_DID=did:root:your-identity
QWALLET_IDENTITY_PRIVATE_KEY=your-private-key

# Optional
QWALLET_TEST_MODE=false
QWALLET_SKIP_VALIDATION=false
DEBUG=qwallet:*
```

## 📚 Learning Path

### Beginner
1. Start with [`basic-registration.js`](./basic-registration.js)
2. Try [`module-discovery.js`](./module-discovery.js)
3. Explore [`error-handling.js`](./error-handling.js)

### Intermediate
1. Study [`batch-operations.js`](./batch-operations.js)
2. Learn [`dependency-management.js`](./dependency-management.js)
3. Try React examples

### Advanced
1. Build custom integrations
2. Implement CI/CD pipelines
3. Create monitoring solutions

## 🤝 Contributing

### Adding Examples

1. **Create example file** with descriptive name
2. **Add comprehensive comments** explaining each step
3. **Include error handling** and best practices
4. **Add to README** with description
5. **Test thoroughly** before submitting

### Example Template

```javascript
/**
 * Example: [Brief Description]
 * 
 * This example demonstrates how to [specific functionality].
 * 
 * Prerequisites:
 * - [List requirements]
 * 
 * Usage:
 * node example-name.js
 */

// Import required modules
const { ModuleRegistrationService } = require('@qwallet/module-registry');

// Configuration
const config = {
  // Configuration options
};

// Main function
async function main() {
  try {
    // Example implementation
    console.log('Starting example...');
    
    // Your code here
    
    console.log('Example completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
```

## 📞 Support

### Getting Help
- **Documentation**: [API Reference](../README.md)
- **Issues**: [GitHub Issues](https://github.com/qwallet/module-registry/issues)
- **Community**: [Discord](https://discord.gg/qwallet)

### Reporting Issues
When reporting issues with examples:
1. Include the example file name
2. Provide error messages and logs
3. Share your environment configuration
4. Describe expected vs actual behavior

---

*Ready to start coding? Pick an example that matches your use case and dive in!*