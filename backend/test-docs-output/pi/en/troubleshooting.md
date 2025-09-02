# Pi Integration Troubleshooting

## Overview

Guide for resolving common Pi Network integration issues.

## Connection Issues

### Error: "Cannot connect to Pi Network"

**Symptoms:**
- API call timeouts
- Network errors
- Initialization failures

**Solutions:**

1. **Check environment configuration**
   ```javascript
   const config = piIntegration.getEnvironmentConfig();
   console.log('Current config:', config);
   ```

2. **Validate connectivity**
   ```javascript
   const connectivity = await piIntegration.validateEnvironmentConnections('testnet');
   if (!connectivity.valid) {
     console.log('Connectivity issue:', connectivity.error);
   }
   ```

3. **Check environment variables**
   ```bash
   echo $PI_API_KEY
   echo $PI_APP_ID
   echo $PI_WEBHOOK_SECRET
   ```

## Authentication Issues

### Error: "Invalid Pi credentials"

**Common causes:**
- Expired or invalid API key
- Incorrect App ID
- Insufficient permissions

**Diagnosis:**
```javascript
// Verify credentials
try {
  await piIntegration.validatePiCredentials({
    piUserId: 'test_user',
    accessToken: 'test_token',
    walletAddress: '0x...'
  });
  console.log('Credentials valid');
} catch (error) {
  console.error('Credentials error:', error.message);
}
```

## Transaction Issues

### Slow or Failed Transactions

**Transaction diagnosis:**
```javascript
// Check transaction status
const transaction = piIntegration.piTransactions.get(transactionId);
console.log('Status:', transaction.status);
console.log('Confirmations:', transaction.confirmations);
console.log('Required:', transaction.requiredConfirmations);

// Check gas and fees
if (transaction.error && transaction.error.includes('gas')) {
  console.log('Gas issue detected');
  
  const gasEstimate = await piIntegration.estimateContractGas(
    transaction.contractCode,
    transaction.constructorArgs
  );
  console.log('Recommended gas:', gasEstimate.estimated);
}
```

**Solutions:**
1. Increase gas limit
2. Check sufficient balance
3. Retry with higher priority

## Contract Issues

### Error: "Contract deployment failed"

**Code validation:**
```javascript
try {
  await piIntegration.validateContractCode(contractCode);
  console.log('Contract code valid');
} catch (error) {
  console.error('Validation error:', error.message);
}
```

**State verification:**
```javascript
const stateValidation = await piIntegration.validateContractState(
  contractId,
  expectedState
);

if (!stateValidation.valid) {
  console.log('State issues:');
  stateValidation.validationResults.forEach(result => {
    if (!result.valid) {
      console.log(`- ${result.property}: expected ${result.expected}, actual ${result.actual}`);
    }
  });
}
```

## Compatibility Issues

### Pi Browser CSP Errors

**Check CSP:**
```javascript
const cspResult = await piIntegration.checkPiBrowserCSP();

if (!cspResult.valid) {
  console.log('Missing headers:', cspResult.missingHeaders);
  console.log('Required directives:');
  
  piData.browserCompatibility.cspDirectives.forEach(directive => {
    console.log(`- ${directive}`);
  });
}
```

**Correct configuration:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://sdk.minepi.com;
  connect-src 'self' https://api.minepi.com;
  frame-src https://sdk.minepi.com
">
```

## Diagnostic Tools

### Complete Diagnostic Script

```javascript
class PiIntegrationDiagnostics {
  constructor(piIntegration) {
    this.piIntegration = piIntegration;
  }

  async runFullDiagnostics() {
    const results = {
      environment: await this.checkEnvironment(),
      connectivity: await this.checkConnectivity(),
      credentials: await this.checkCredentials(),
      browserCompatibility: await this.checkBrowserCompatibility(),
      integrations: await this.checkIntegrations(),
      contracts: await this.checkContracts(),
      transactions: await this.checkTransactions()
    };

    this.generateDiagnosticReport(results);
    return results;
  }

  async checkEnvironment() {
    try {
      const config = this.piIntegration.getEnvironmentConfig();
      return {
        status: 'ok',
        current: config.current,
        available: config.available,
        mainnetEnabled: config.mainnetEnabled
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkConnectivity() {
    try {
      const environments = ['sandbox', 'testnet'];
      const results = {};
      
      for (const env of environments) {
        results[env] = await this.piIntegration.validateEnvironmentConnections(env);
      }
      
      return { status: 'ok', results };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkCredentials() {
    try {
      // Check that credentials are configured
      const secrets = this.piIntegration.secrets;
      const configured = {
        piApiKey: !!secrets.piApiKey,
        piAppId: !!secrets.piAppId,
        piWebhookSecret: !!secrets.piWebhookSecret,
        piPrivateKey: !!secrets.piPrivateKey
      };
      
      return { status: 'ok', configured };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkBrowserCompatibility() {
    try {
      const compatibility = await this.piIntegration.validatePiBrowserCompatibility([
        '/api/pi/test'
      ]);
      
      const csp = await this.piIntegration.checkPiBrowserCSP();
      
      return {
        status: 'ok',
        compatibility: compatibility.compatible,
        csp: csp.valid,
        issues: [...(compatibility.issues || []), ...(csp.missingHeaders || [])]
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkIntegrations() {
    try {
      const integrations = Array.from(this.piIntegration.walletIntegrations.values());
      const active = integrations.filter(i => i.status === 'ACTIVE').length;
      const total = integrations.length;
      
      return {
        status: 'ok',
        total,
        active,
        inactive: total - active
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkContracts() {
    try {
      const contracts = Array.from(this.piIntegration.smartContracts.values());
      const deployed = contracts.filter(c => c.status === 'DEPLOYED').length;
      const total = contracts.length;
      
      return {
        status: 'ok',
        total,
        deployed,
        failed: contracts.filter(c => c.status === 'FAILED').length
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkTransactions() {
    try {
      const transactions = Array.from(this.piIntegration.piTransactions.values());
      const successful = transactions.filter(t => t.status === 'CONFIRMED').length;
      const pending = transactions.filter(t => t.status === 'PENDING' || t.status === 'SUBMITTED').length;
      const failed = transactions.filter(t => t.status === 'FAILED').length;
      
      return {
        status: 'ok',
        total: transactions.length,
        successful,
        pending,
        failed
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  generateDiagnosticReport(results) {
    console.log('\n=== PI INTEGRATION DIAGNOSTIC REPORT ===\n');
    
    Object.entries(results).forEach(([category, result]) => {
      console.log(`${category.toUpperCase()}: ${result.status}`);
      if (result.status === 'error') {
        console.log(`  Error: ${result.error}`);
      } else {
        Object.entries(result).forEach(([key, value]) => {
          if (key !== 'status') {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          }
        });
      }
      console.log('');
    });
  }
}

// Diagnostic usage
const diagnostics = new PiIntegrationDiagnostics(piIntegration);
const report = await diagnostics.runFullDiagnostics();
```

## Contact and Support

If issues persist:

1. Run complete diagnostics
2. Check Qerberos logs for audit trail
3. Contact technical support with diagnostic report

---

*Last Updated: 2025-08-31T09:42:47.565Z*  
*Generated by: DocumentationGenerator v1.0.0*
