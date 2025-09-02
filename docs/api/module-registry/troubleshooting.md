# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with the Module Registry API.

## Common Issues and Solutions

### 1. Registration Failures

#### "Module already exists" Error

**Problem:** Attempting to register a module with a name and version that already exists.

**Error Message:**
```json
{
  "success": false,
  "error": "Module already registered: my-module",
  "code": "MODULE_ALREADY_EXISTS",
  "moduleId": "my-module"
}
```

**Solutions:**
1. **Increment the version number:**
   ```bash
   # Instead of 1.0.0, use 1.0.1 or 1.1.0
   qwallet-module-cli register --name "my-module" --version "1.0.1"
   ```

2. **Use a different module name:**
   ```bash
   qwallet-module-cli register --name "my-module-v2" --version "1.0.0"
   ```

3. **Check existing modules first:**
   ```bash
   qwallet-module-cli search --name "my-module"
   ```

#### "Invalid metadata" Error

**Problem:** Module metadata doesn't meet validation requirements.

**Error Message:**
```json
{
  "success": false,
  "error": "Module validation failed: Module name must be at least 3 characters",
  "code": "INVALID_METADATA",
  "details": {
    "validationErrors": [
      "Module name must be at least 3 characters",
      "Repository URL must be a valid HTTP/HTTPS URL"
    ]
  }
}
```

**Solutions:**
1. **Check field requirements:**
   - Name: 3-50 characters, alphanumeric + hyphens/underscores
   - Version: Must follow semantic versioning (e.g., "1.0.0")
   - Description: 10-500 characters
   - Repository URL: Valid HTTP/HTTPS URL

2. **Validate before registering:**
   ```typescript
   import { validateModuleInfo } from '@qwallet/module-registry';
   
   const validation = validateModuleInfo(moduleInfo);
   if (!validation.valid) {
     console.error('Validation errors:', validation.errors);
   }
   ```

3. **Use the CLI validation:**
   ```bash
   qwallet-module-cli validate --file module-config.json
   ```

#### "Signature verification failed" Error

**Problem:** Cryptographic signature cannot be verified.

**Error Message:**
```json
{
  "success": false,
  "error": "Signature verification failed: Invalid signature",
  "code": "SIGNATURE_VERIFICATION_FAILED",
  "details": {
    "signatureDetails": {
      "algorithm": "RSA-SHA256",
      "valid": false
    }
  }
}
```

**Solutions:**
1. **Check identity credentials:**
   ```bash
   # Verify your identity DID is correct
   echo $QWALLET_IDENTITY_DID
   
   # Check private key format
   echo $QWALLET_IDENTITY_PRIVATE_KEY | head -c 50
   ```

2. **Regenerate signature:**
   ```typescript
   // Force signature regeneration
   const result = await registrationService.registerModule(
     { moduleInfo, forceNewSignature: true },
     signerIdentity
   );
   ```

3. **Verify identity permissions:**
   ```bash
   qwallet-module-cli identity --verify
   ```

### 2. Authentication Issues

#### "Unauthorized signer" Error

**Problem:** Identity doesn't have permission to perform the operation.

**Error Message:**
```json
{
  "success": false,
  "error": "Identity did:dao:example123 is not authorized for module registration",
  "code": "UNAUTHORIZED_SIGNER",
  "details": {
    "identityType": "DAO",
    "requiredType": "ROOT"
  }
}
```

**Solutions:**
1. **Check identity type requirements:**
   - Module registration: ROOT identity required
   - Module updates: Original registrant or ROOT
   - Module deregistration: Original registrant or ROOT

2. **Use correct identity:**
   ```bash
   # Switch to ROOT identity
   qwallet-module-cli config set defaultIdentity "did:root:your-root-identity"
   ```

3. **Verify identity status:**
   ```bash
   qwallet-module-cli identity --status
   ```

#### "Rate limit exceeded" Error

**Problem:** Too many requests in a short time period.

**Error Message:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Solutions:**
1. **Implement exponential backoff:**
   ```typescript
   async function registerWithRetry(request, maxRetries = 3) {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await registerModule(request);
       } catch (error) {
         if (error.code === 'RATE_LIMIT_EXCEEDED' && attempt < maxRetries) {
           const delay = Math.pow(2, attempt) * 1000;
           await new Promise(resolve => setTimeout(resolve, delay));
           continue;
         }
         throw error;
       }
     }
   }
   ```

2. **Check rate limit headers:**
   ```bash
   curl -I "https://api.example.com/api/modules"
   # Look for X-RateLimit-* headers
   ```

3. **Use batch operations for multiple modules:**
   ```bash
   qwallet-module-cli batch-register modules-config.json
   ```

### 3. Network and Service Issues

#### "Service unavailable" Error

**Problem:** Backend services are temporarily unavailable.

**Error Message:**
```json
{
  "success": false,
  "error": "The registration service is temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "retryAfter": 300
}
```

**Solutions:**
1. **Use fallback registration:**
   ```typescript
   try {
     await registerModule(request);
   } catch (error) {
     if (error.code === 'SERVICE_UNAVAILABLE') {
       // Try sandbox mode as fallback
       await registerModule({ ...request, testMode: true });
     }
   }
   ```

2. **Check service status:**
   ```bash
   curl https://status.qwallet.example.com/api/health
   ```

3. **Wait and retry:**
   ```bash
   # Wait for the specified retry period
   sleep 300
   qwallet-module-cli register --retry
   ```

#### "Network error" Error

**Problem:** Network connectivity issues.

**Error Message:**
```json
{
  "success": false,
  "error": "Network request failed: ECONNREFUSED",
  "code": "NETWORK_ERROR",
  "details": {
    "networkDetails": {
      "errno": "ECONNREFUSED",
      "code": "ECONNREFUSED"
    }
  }
}
```

**Solutions:**
1. **Check network connectivity:**
   ```bash
   ping api.qwallet.example.com
   curl -I https://api.qwallet.example.com/health
   ```

2. **Verify API endpoint:**
   ```bash
   echo $QWALLET_API_ENDPOINT
   # Should be https://api.qwallet.example.com
   ```

3. **Check firewall/proxy settings:**
   ```bash
   # Test with curl
   curl -v https://api.qwallet.example.com/api/modules
   ```

### 4. Dependency Issues

#### "Dependency not found" Error

**Problem:** Required module dependencies are missing.

**Error Message:**
```json
{
  "success": false,
  "error": "Required dependencies not found: qwallet-core, qwallet-utils",
  "code": "DEPENDENCY_NOT_FOUND",
  "details": {
    "missingDependencies": ["qwallet-core", "qwallet-utils"]
  }
}
```

**Solutions:**
1. **Install missing dependencies:**
   ```bash
   # Register dependencies first
   qwallet-module-cli register --name "qwallet-core" --version "1.0.0"
   qwallet-module-cli register --name "qwallet-utils" --version "1.0.0"
   ```

2. **Update dependency list:**
   ```typescript
   const moduleInfo = {
     // ... other fields
     dependencies: ["qwallet-core@^1.0.0", "qwallet-utils@^1.0.0"]
   };
   ```

3. **Skip dependency check (not recommended):**
   ```bash
   qwallet-module-cli register --skip-validation
   ```

#### "Circular dependency" Error

**Problem:** Module dependencies form a circular reference.

**Error Message:**
```json
{
  "success": false,
  "error": "Circular dependency detected: module-a -> module-b -> module-a",
  "code": "DEPENDENCY_CYCLE",
  "details": {
    "cycle": ["module-a", "module-b", "module-a"]
  }
}
```

**Solutions:**
1. **Analyze dependency graph:**
   ```bash
   qwallet-module-cli dependencies --module "module-a" --check-cycles
   ```

2. **Refactor dependencies:**
   - Extract common functionality into a shared module
   - Remove unnecessary dependencies
   - Use dependency injection patterns

3. **Visualize dependencies:**
   ```bash
   qwallet-module-cli dependencies --module "module-a" --graph --output deps.svg
   ```

### 5. Verification Issues

#### "Audit hash invalid" Error

**Problem:** Provided audit hash doesn't match expected format.

**Error Message:**
```json
{
  "success": false,
  "error": "Audit hash must be a valid SHA256 hash",
  "code": "AUDIT_HASH_INVALID",
  "details": {
    "providedHash": "invalid-hash",
    "expectedFormat": "64 hexadecimal characters"
  }
}
```

**Solutions:**
1. **Generate valid SHA256 hash:**
   ```bash
   # Generate hash from audit report
   sha256sum audit-report.pdf | cut -d' ' -f1
   ```

2. **Validate hash format:**
   ```bash
   echo "a1b2c3d4e5f6..." | grep -E '^[a-f0-9]{64}$'
   ```

3. **Use CLI hash generator:**
   ```bash
   qwallet-module-cli hash --file audit-report.pdf
   ```

#### "Documentation unavailable" Error

**Problem:** IPFS documentation CID is not accessible.

**Error Message:**
```json
{
  "success": false,
  "error": "Documentation not accessible via IPFS",
  "code": "DOCUMENTATION_UNAVAILABLE",
  "details": {
    "cid": "QmInvalidCID",
    "ipfsGateway": "https://ipfs.io/ipfs/"
  }
}
```

**Solutions:**
1. **Verify IPFS CID:**
   ```bash
   curl "https://ipfs.io/ipfs/QmYourCID"
   ```

2. **Upload documentation to IPFS:**
   ```bash
   # Using IPFS CLI
   ipfs add documentation.md
   
   # Using web interface
   # Visit https://ipfs.io and upload your file
   ```

3. **Use alternative IPFS gateway:**
   ```bash
   curl "https://gateway.pinata.cloud/ipfs/QmYourCID"
   ```

### 6. Performance Issues

#### Slow Registration

**Problem:** Module registration takes too long to complete.

**Symptoms:**
- Registration timeouts
- Slow response times
- High memory usage

**Solutions:**
1. **Optimize module metadata:**
   ```typescript
   // Keep descriptions concise
   const moduleInfo = {
     description: "Concise description under 200 characters",
     // Remove unnecessary fields
   };
   ```

2. **Use batch operations:**
   ```bash
   # Instead of individual registrations
   qwallet-module-cli batch-register modules.json
   ```

3. **Enable caching:**
   ```typescript
   const service = new ModuleRegistrationService({
     enableCaching: true,
     cacheTimeout: 300000 // 5 minutes
   });
   ```

#### High Memory Usage

**Problem:** Application consumes too much memory during registration.

**Solutions:**
1. **Process modules in batches:**
   ```typescript
   const batchSize = 10;
   for (let i = 0; i < modules.length; i += batchSize) {
     const batch = modules.slice(i, i + batchSize);
     await processBatch(batch);
   }
   ```

2. **Clear caches periodically:**
   ```typescript
   // Clear service caches
   registrationService.clearCache();
   
   // Force garbage collection (Node.js)
   if (global.gc) global.gc();
   ```

3. **Monitor memory usage:**
   ```bash
   node --max-old-space-size=4096 register-modules.js
   ```

## Diagnostic Tools

### 1. CLI Diagnostic Commands

```bash
# Check system status
qwallet-module-cli status --system

# Verify configuration
qwallet-module-cli config --validate

# Test connectivity
qwallet-module-cli ping --all-services

# Check identity
qwallet-module-cli identity --verify

# Validate module info
qwallet-module-cli validate --file module.json
```

### 2. Debug Logging

Enable debug logging to get detailed information:

```bash
# Environment variable
export DEBUG=qwallet:*

# CLI flag
qwallet-module-cli register --verbose --debug

# Programmatic
const service = new ModuleRegistrationService({
  logLevel: 'debug'
});
```

### 3. Health Checks

```typescript
// Check service health
const healthCheck = await registrationService.healthCheck();
console.log('Service health:', healthCheck);

// Check individual components
const checks = await Promise.all([
  qindexService.ping(),
  qlockService.ping(),
  qerberosService.ping()
]);
```

## Error Recovery Strategies

### 1. Automatic Retry with Backoff

```typescript
class RetryableRegistration {
  async registerWithRetry(request, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2
    } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.register(request);
      } catch (error) {
        if (!error.retryable || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. Fallback Registration

```typescript
async function registerWithFallback(request) {
  try {
    // Try production registration
    return await registerModule(request);
  } catch (error) {
    if (error.code === 'SERVICE_UNAVAILABLE') {
      console.log('Production unavailable, trying sandbox...');
      return await registerModule({
        ...request,
        testMode: true
      });
    }
    throw error;
  }
}
```

### 3. Partial Recovery

```typescript
async function recoverPartialRegistration(moduleId) {
  try {
    // Check current status
    const status = await getRegistrationStatus(moduleId);
    
    if (status.registered && !status.verified) {
      // Complete verification
      return await verifyModule(moduleId);
    }
    
    if (!status.registered) {
      // Re-register from scratch
      return await registerModule(originalRequest);
    }
    
    return status;
  } catch (error) {
    console.error('Recovery failed:', error);
    throw error;
  }
}
```

## Getting Help

### 1. Check Documentation
- [API Reference](./registration-api.md)
- [Getting Started Guide](./getting-started.md)
- [FAQ](./faq.md)

### 2. Community Support
- [GitHub Issues](https://github.com/qwallet/module-registry/issues)
- [Developer Forum](https://forum.qwallet.example.com)
- [Discord Community](https://discord.gg/qwallet)

### 3. Professional Support
- Email: support@qwallet.example.com
- Priority Support: enterprise@qwallet.example.com
- Emergency: +1-555-QWALLET

### 4. Reporting Bugs

When reporting issues, include:

1. **Error message and code**
2. **Steps to reproduce**
3. **Environment information:**
   ```bash
   qwallet-module-cli --version
   node --version
   npm --version
   ```
4. **Configuration (sanitized):**
   ```bash
   qwallet-module-cli config --export --sanitize
   ```
5. **Debug logs:**
   ```bash
   DEBUG=qwallet:* qwallet-module-cli register --verbose 2>&1 | tee debug.log
   ```

---

*If you can't find a solution to your problem in this guide, don't hesitate to reach out to our support team. We're here to help!*