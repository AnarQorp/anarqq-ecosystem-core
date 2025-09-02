# Getting Started with Module Registry API

This guide will help you get up and running with the Qwallet Module Registry API quickly and efficiently.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** or compatible JavaScript runtime
2. **Valid Identity Credentials** (ROOT, DAO, or ENTERPRISE)
3. **Access to Q Ecosystem Services** (Qindex, Qlock, Qerberos)
4. **Git Repository** for your module (GitHub, GitLab, etc.)

## Quick Setup

### 1. Install Dependencies

```bash
# Using npm
npm install @qwallet/module-registry @qwallet/hooks

# Using yarn
yarn add @qwallet/module-registry @qwallet/hooks

# Using pnpm
pnpm add @qwallet/module-registry @qwallet/hooks
```

### 2. Environment Configuration

Create a `.env` file in your project root:

```env
# API Configuration
QWALLET_API_ENDPOINT=https://api.qwallet.example.com
QWALLET_API_VERSION=v1

# Identity Configuration
QWALLET_IDENTITY_DID=did:root:your-identity-here
QWALLET_IDENTITY_PRIVATE_KEY=your-private-key-here

# Service Endpoints
QINDEX_ENDPOINT=https://qindex.example.com
QLOCK_ENDPOINT=https://qlock.example.com
QERBEROS_ENDPOINT=https://qerberos.example.com

# Optional: Development Settings
QWALLET_TEST_MODE=false
QWALLET_SKIP_VALIDATION=false
```

### 3. Basic Configuration

```typescript
// config/module-registry.ts
export const moduleRegistryConfig = {
  apiEndpoint: process.env.QWALLET_API_ENDPOINT || 'https://api.qwallet.example.com',
  apiVersion: process.env.QWALLET_API_VERSION || 'v1',
  identity: {
    did: process.env.QWALLET_IDENTITY_DID,
    privateKey: process.env.QWALLET_IDENTITY_PRIVATE_KEY
  },
  services: {
    qindex: process.env.QINDEX_ENDPOINT,
    qlock: process.env.QLOCK_ENDPOINT,
    qerberos: process.env.QERBEROS_ENDPOINT
  },
  defaults: {
    testMode: process.env.QWALLET_TEST_MODE === 'true',
    skipValidation: process.env.QWALLET_SKIP_VALIDATION === 'true'
  }
};
```

## Your First Module Registration

### Step 1: Prepare Module Information

```typescript
// module-info.ts
import { ModuleInfo, IdentityType } from '@qwallet/module-registry';

export const myModuleInfo: ModuleInfo = {
  name: 'my-awesome-module',
  version: '1.0.0',
  description: 'An awesome module that does amazing things in the Q ecosystem',
  identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
  integrations: ['Qindex', 'Qlock'],
  repositoryUrl: 'https://github.com/yourusername/my-awesome-module',
  
  // Optional but recommended
  documentationCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  auditHash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
  compliance: {
    audit: true,
    privacy_enforced: true,
    gdpr_compliant: true,
    data_retention_policy: '30_days'
  }
};
```

### Step 2: Register Your Module

```typescript
// register-module.ts
import { ModuleRegistrationService } from '@qwallet/module-registry';
import { createMockIdentity } from '@qwallet/identity';
import { myModuleInfo } from './module-info';

async function registerModule() {
  try {
    // Initialize the registration service
    const registrationService = new ModuleRegistrationService();
    
    // Create or load your identity
    const signerIdentity = createMockIdentity({
      type: 'ROOT',
      did: process.env.QWALLET_IDENTITY_DID!
    });
    
    // Register the module
    console.log('🚀 Registering module...');
    const result = await registrationService.registerModule(
      {
        moduleInfo: myModuleInfo,
        testMode: false // Set to true for sandbox testing
      },
      signerIdentity
    );
    
    if (result.success) {
      console.log('✅ Module registered successfully!');
      console.log(`📦 Module ID: ${result.moduleId}`);
      console.log(`🔗 IPFS CID: ${result.cid}`);
      console.log(`📊 Index ID: ${result.indexId}`);
      
      // Verify the registration
      const verification = await registrationService.verifyModule(result.moduleId);
      console.log(`🔍 Verification Status: ${verification.status}`);
      
      if (verification.status === 'production_ready') {
        console.log('🎉 Module is production ready!');
      } else {
        console.log('⚠️  Issues found:', verification.issues);
      }
    } else {
      console.error('❌ Registration failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Registration error:', error);
  }
}

// Run the registration
registerModule();
```

### Step 3: Test Your Registration

```bash
# Run the registration script
node register-module.js

# Or with TypeScript
npx tsx register-module.ts
```

## Using the React Hook

For React applications, use the `useQindexRegistration` hook:

```typescript
// components/ModuleRegistration.tsx
import React, { useState } from 'react';
import { useQindexRegistration } from '@qwallet/hooks';
import { ModuleInfo, IdentityType } from '@qwallet/module-registry';

export function ModuleRegistration() {
  const {
    registerModule,
    loading,
    error,
    registrationResult,
    progress
  } = useQindexRegistration();
  
  const [moduleInfo, setModuleInfo] = useState<Partial<ModuleInfo>>({
    name: '',
    version: '1.0.0',
    description: '',
    identitiesSupported: [IdentityType.ROOT],
    integrations: ['Qindex'],
    repositoryUrl: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidModuleInfo(moduleInfo)) {
      alert('Please fill in all required fields');
      return;
    }
    
    await registerModule({
      moduleInfo: moduleInfo as ModuleInfo,
      testMode: true // Start with sandbox mode
    });
  };
  
  const isValidModuleInfo = (info: Partial<ModuleInfo>): info is ModuleInfo => {
    return !!(info.name && info.version && info.description && 
             info.repositoryUrl && info.identitiesSupported?.length);
  };
  
  return (
    <div className="module-registration">
      <h2>Register New Module</h2>
      
      {progress && (
        <div className="progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p>{progress.message}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Module Name *</label>
          <input
            id="name"
            type="text"
            value={moduleInfo.name}
            onChange={(e) => setModuleInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="my-awesome-module"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="version">Version *</label>
          <input
            id="version"
            type="text"
            value={moduleInfo.version}
            onChange={(e) => setModuleInfo(prev => ({ ...prev, version: e.target.value }))}
            placeholder="1.0.0"
            pattern="^\d+\.\d+\.\d+$"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            value={moduleInfo.description}
            onChange={(e) => setModuleInfo(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what your module does..."
            minLength={10}
            maxLength={500}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="repository">Repository URL *</label>
          <input
            id="repository"
            type="url"
            value={moduleInfo.repositoryUrl}
            onChange={(e) => setModuleInfo(prev => ({ ...prev, repositoryUrl: e.target.value }))}
            placeholder="https://github.com/username/module"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Supported Identities *</label>
          <div className="checkbox-group">
            {Object.values(IdentityType).map(identity => (
              <label key={identity} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={moduleInfo.identitiesSupported?.includes(identity)}
                  onChange={(e) => {
                    const current = moduleInfo.identitiesSupported || [];
                    const updated = e.target.checked
                      ? [...current, identity]
                      : current.filter(i => i !== identity);
                    setModuleInfo(prev => ({ ...prev, identitiesSupported: updated }));
                  }}
                />
                {identity}
              </label>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label>Integrations</label>
          <div className="checkbox-group">
            {['Qindex', 'Qlock', 'Qerberos', 'Qonsent'].map(integration => (
              <label key={integration} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={moduleInfo.integrations?.includes(integration)}
                  onChange={(e) => {
                    const current = moduleInfo.integrations || [];
                    const updated = e.target.checked
                      ? [...current, integration]
                      : current.filter(i => i !== integration);
                    setModuleInfo(prev => ({ ...prev, integrations: updated }));
                  }}
                />
                {integration}
              </label>
            ))}
          </div>
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register Module'}
        </button>
      </form>
      
      {error && (
        <div className="error">
          <h3>Registration Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {registrationResult?.success && (
        <div className="success">
          <h3>Registration Successful! 🎉</h3>
          <p><strong>Module ID:</strong> {registrationResult.moduleId}</p>
          <p><strong>IPFS CID:</strong> {registrationResult.cid}</p>
          <p><strong>Index ID:</strong> {registrationResult.indexId}</p>
        </div>
      )}
    </div>
  );
}
```

## Using the CLI Tool

The CLI tool provides a convenient way to register modules from the command line:

### Installation

```bash
# Install globally
npm install -g @qwallet/module-cli

# Or use npx
npx @qwallet/module-cli --help
```

### Interactive Registration

```bash
# Start interactive registration
qwallet-module-cli register --interactive

# Follow the prompts to enter module information
```

### Command Line Registration

```bash
# Register with command line options
qwallet-module-cli register \
  --name "my-awesome-module" \
  --version "1.0.0" \
  --description "An awesome module for the Q ecosystem" \
  --repository "https://github.com/username/my-awesome-module" \
  --identity "did:root:your-identity-here"
```

### Configuration File

Create a configuration file for easier management:

```json
// .qwallet-module-cli.json
{
  "defaultIdentity": "did:root:your-identity-here",
  "apiEndpoint": "https://api.qwallet.example.com",
  "outputFormat": "json",
  "verbose": true
}
```

## Common Workflows

### 1. Development Workflow

```bash
# 1. Register in sandbox mode for testing
qwallet-module-cli register --test-mode \
  --name "my-module" \
  --version "0.1.0-beta" \
  --description "Beta version for testing"

# 2. Test and iterate
qwallet-module-cli verify my-module
qwallet-module-cli status my-module --detailed

# 3. Update when ready
qwallet-module-cli update my-module \
  --version "1.0.0" \
  --description "Production ready version"

# 4. Promote to production
qwallet-module-cli promote my-module
```

### 2. Batch Registration

```bash
# Create batch configuration file
cat > modules-batch.json << EOF
{
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
  "continueOnError": true
}
EOF

# Register batch
qwallet-module-cli batch-register modules-batch.json
```

### 3. Module Discovery

```bash
# Search for modules
qwallet-module-cli search --query "payment" --status PRODUCTION_READY

# List modules by type
qwallet-module-cli list --type wallet --include-test

# Get module details
qwallet-module-cli get qwallet-core --detailed --include-history
```

## Error Handling Best Practices

### 1. Validation Errors

```typescript
import { ModuleValidationError } from '@qwallet/module-registry';

try {
  await registerModule(request);
} catch (error) {
  if (error instanceof ModuleValidationError) {
    console.error('Validation failed:');
    error.validationErrors?.forEach(err => {
      console.error(`  - ${err}`);
    });
    
    // Show user-friendly message
    alert(error.userMessage);
  }
}
```

### 2. Network Errors with Retry

```typescript
import { NetworkError } from '@qwallet/module-registry';

async function registerWithRetry(request: ModuleRegistrationRequest, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await registerModule(request);
    } catch (error) {
      if (error instanceof NetworkError && error.retryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Service Unavailable Fallback

```typescript
import { ServiceUnavailableError } from '@qwallet/module-registry';

try {
  await registerModule(request);
} catch (error) {
  if (error instanceof ServiceUnavailableError) {
    // Try sandbox mode as fallback
    console.log('Service unavailable, trying sandbox mode...');
    await registerModule({
      ...request,
      testMode: true
    });
  }
}
```

## Next Steps

Now that you have the basics down, explore these advanced topics:

1. **[Authentication](./authentication.md)** - Learn about identity management and signing
2. **[Batch Operations](./batch-operations.md)** - Register multiple modules efficiently
3. **[Sandbox Mode](./sandbox-mode.md)** - Test modules before production
4. **[Error Handling](./error-handling.md)** - Comprehensive error handling strategies
5. **[Performance](./performance.md)** - Optimize your registration workflows

## Troubleshooting

### Common Issues

**Q: "Module already exists" error**
A: Each module name + version combination must be unique. Increment your version number or use a different name.

**Q: "Signature verification failed"**
A: Check that your identity credentials are correct and that you have the proper permissions.

**Q: "Documentation CID invalid"**
A: Ensure your IPFS CID is valid and the content is accessible via IPFS.

**Q: "Rate limit exceeded"**
A: Wait for the rate limit to reset or implement exponential backoff in your retry logic.

For more troubleshooting help, see the [Troubleshooting Guide](./troubleshooting.md).

---

*Ready to register your first module? Follow this guide step by step, and you'll have your module registered in the Q ecosystem in no time!*