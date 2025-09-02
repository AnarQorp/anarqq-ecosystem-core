# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Qwallet identity-aware wallet system.

## Quick Diagnosis

### System Status Check

Before troubleshooting specific issues, check the overall system status:

1. **Service Health**: Verify all services are running
   - Qlock (signing service)
   - Qonsent (permission service)
   - Qerberos (audit service)
   - Pi Wallet API (if using Pi integration)

2. **Network Connectivity**: Ensure stable internet connection

3. **Browser/App Status**: Check for browser issues or app updates

4. **Identity Status**: Verify your identity is properly authenticated

## Common Issues

### 1. Transaction Failures

#### Symptoms
- "Transaction failed" error messages
- Transactions stuck in pending state
- "Insufficient balance" despite having funds

#### Possible Causes
- **Permission Issues**: Identity lacks required permissions
- **Limit Exceeded**: Transaction exceeds identity limits
- **Service Unavailable**: Qlock or other services are down
- **Network Issues**: Poor connectivity or network congestion

#### Solutions

**Check Permissions**
```typescript
// Verify identity permissions
const permissions = await qonsentService.getPermissions(identityId);
console.log('Current permissions:', permissions);
```

**Verify Limits**
```typescript
// Check current limits and usage
const limits = await walletService.getLimits(identityId);
const usage = await walletService.getCurrentUsage(identityId);
console.log('Limits:', limits, 'Usage:', usage);
```

**Service Status Check**
```typescript
// Check service availability
const serviceStatus = await walletService.getServiceStatus();
console.log('Service status:', serviceStatus);
```

**Retry with Exponential Backoff**
```typescript
async function retryTransaction(transactionData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await walletService.transfer(transactionData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 2. Identity Switching Issues

#### Symptoms
- Wallet doesn't update after identity switch
- Wrong balances displayed
- Permission errors after switching

#### Possible Causes
- **Cache Issues**: Stale data in browser/app cache
- **Session Problems**: Invalid or expired session
- **Context Corruption**: Identity context not properly updated

#### Solutions

**Clear Cache and Refresh**
```typescript
// Clear wallet cache
await walletService.clearCache();
// Refresh identity context
await identityManager.refreshContext();
```

**Force Identity Re-authentication**
```typescript
// Re-authenticate current identity
await identityManager.reauthenticate(identityId);
```

**Reset Wallet Context**
```typescript
// Reset and reinitialize wallet context
await walletService.resetContext(identityId);
await walletService.initialize(identityId);
```

### 3. Pi Wallet Integration Issues

#### Symptoms
- "Pi Wallet connection failed"
- Pi balance not updating
- Transfer to/from Pi Wallet fails

#### Possible Causes
- **API Issues**: Pi Network API unavailable
- **Authentication Problems**: Invalid Pi Wallet credentials
- **Permission Issues**: Identity not allowed to link Pi Wallet

#### Solutions

**Check Pi Wallet Status**
```typescript
const piStatus = await piWalletService.getConnectionStatus(identityId);
console.log('Pi Wallet status:', piStatus);
```

**Re-authenticate with Pi Network**
```typescript
// Unlink and re-link Pi Wallet
await piWalletService.unlinkPiWallet(identityId);
await piWalletService.linkPiWallet(identityId);
```

**Verify Identity Permissions**
```typescript
// Check if identity can link Pi Wallet
const canLinkPi = await qonsentService.checkPermission(
  identityId, 
  'LINK_PI_WALLET'
);
```

### 4. Permission Denied Errors

#### Symptoms
- "Permission denied" messages
- Operations blocked unexpectedly
- Qonsent validation failures

#### Possible Causes
- **Identity Restrictions**: Identity type doesn't allow operation
- **Policy Changes**: Qonsent policies have been updated
- **Limit Violations**: Operation exceeds configured limits

#### Solutions

**Check Current Permissions**
```typescript
const permissions = await qonsentService.getDetailedPermissions(identityId);
console.log('Detailed permissions:', permissions);
```

**Review Policy Changes**
```typescript
const policyHistory = await qonsentService.getPolicyHistory(identityId);
console.log('Recent policy changes:', policyHistory);
```

**Request Permission Update**
```typescript
// For DAO/Enterprise identities, request permission update
await qonsentService.requestPermissionUpdate(identityId, requiredPermissions);
```

### 5. Audit and Compliance Issues

#### Symptoms
- Missing audit logs
- Compliance reports incomplete
- Risk assessment errors

#### Possible Causes
- **Qerberos Unavailable**: Audit service is down
- **Log Corruption**: Audit logs are corrupted
- **Permission Issues**: Insufficient permissions for audit access

#### Solutions

**Check Qerberos Status**
```typescript
const auditStatus = await qerberosService.getServiceStatus();
console.log('Audit service status:', auditStatus);
```

**Regenerate Audit Data**
```typescript
// Trigger audit data regeneration
await auditService.regenerateAuditData(identityId, dateRange);
```

**Verify Audit Permissions**
```typescript
const auditPermissions = await qonsentService.checkAuditPermissions(identityId);
console.log('Audit permissions:', auditPermissions);
```

## Error Code Reference

### Wallet Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `WALLET_001` | Insufficient balance | Check balance and transaction amount |
| `WALLET_002` | Invalid recipient address | Verify recipient address format |
| `WALLET_003` | Transaction limit exceeded | Check daily/monthly limits |
| `WALLET_004` | Token not supported | Verify token is supported for identity |
| `WALLET_005` | Signature verification failed | Retry with Qlock |

### Permission Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `PERM_001` | Identity not authorized | Check identity permissions |
| `PERM_002` | Operation not allowed | Review Qonsent policies |
| `PERM_003` | Limit exceeded | Wait for limit reset or request increase |
| `PERM_004` | Guardian approval required | Request guardian approval |
| `PERM_005` | DAO governance required | Submit governance proposal |

### Service Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `SVC_001` | Qlock service unavailable | Wait for service restoration |
| `SVC_002` | Qonsent service timeout | Retry operation |
| `SVC_003` | Qerberos logging failed | Check audit service status |
| `SVC_004` | Pi Wallet API error | Check Pi Network status |
| `SVC_005` | Network connectivity issue | Check internet connection |

## Advanced Troubleshooting

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Enable debug mode
walletService.setDebugMode(true);

// Perform operation with detailed logging
const result = await walletService.transfer({
  to: recipient,
  amount: amount,
  token: token,
  debug: true
});

console.log('Debug information:', result.debugInfo);
```

### Log Analysis

Analyze logs for patterns:

```typescript
// Get recent error logs
const errorLogs = await qerberosService.getErrorLogs(identityId, {
  timeRange: '24h',
  severity: 'ERROR'
});

// Analyze error patterns
const errorPatterns = analyzeErrorPatterns(errorLogs);
console.log('Error patterns:', errorPatterns);
```

### Performance Monitoring

Monitor performance issues:

```typescript
// Monitor wallet performance
const performanceMetrics = await walletService.getPerformanceMetrics(identityId);
console.log('Performance metrics:', performanceMetrics);

// Check for slow operations
const slowOperations = performanceMetrics.operations.filter(
  op => op.duration > 5000
);
```

## Recovery Procedures

### Emergency Wallet Recovery

For critical wallet issues:

1. **Stop All Operations**: Prevent further issues
2. **Backup Current State**: Save current wallet state
3. **Reset Wallet Context**: Clear and reinitialize
4. **Restore from Backup**: If necessary, restore from backup
5. **Verify Functionality**: Test basic operations

```typescript
// Emergency recovery procedure
async function emergencyWalletRecovery(identityId: string) {
  try {
    // Step 1: Stop operations
    await walletService.freezeWallet(identityId, 'Emergency recovery');
    
    // Step 2: Backup state
    const backupData = await walletService.createBackup(identityId);
    
    // Step 3: Reset context
    await walletService.resetContext(identityId);
    
    // Step 4: Reinitialize
    await walletService.initialize(identityId);
    
    // Step 5: Unfreeze
    await walletService.unfreezeWallet(identityId);
    
    return { success: true, backup: backupData };
  } catch (error) {
    console.error('Emergency recovery failed:', error);
    return { success: false, error };
  }
}
```

### Data Recovery

For data corruption issues:

```typescript
// Recover from audit logs
async function recoverFromAuditLogs(identityId: string) {
  const auditLogs = await qerberosService.getAuditLogs(identityId);
  const recoveredData = await walletService.reconstructFromLogs(auditLogs);
  return recoveredData;
}
```

## Prevention Best Practices

### Regular Maintenance

1. **Monitor Service Health**: Regular health checks
2. **Update Dependencies**: Keep services updated
3. **Clear Cache Regularly**: Prevent cache-related issues
4. **Backup Configurations**: Regular configuration backups

### Error Prevention

```typescript
// Implement comprehensive error handling
class WalletErrorHandler {
  static async handleOperation(operation: () => Promise<any>) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        return this.retryWithBackoff(operation);
      } else if (error.code === 'PERMISSION_DENIED') {
        return this.handlePermissionError(error);
      } else {
        return this.handleGenericError(error);
      }
    }
  }
  
  static async retryWithBackoff(operation: () => Promise<any>, maxRetries = 3) {
    // Implement retry logic
  }
  
  static async handlePermissionError(error: any) {
    // Handle permission-specific errors
  }
  
  static async handleGenericError(error: any) {
    // Handle generic errors
  }
}
```

## Getting Help

### Self-Service Resources

1. **Documentation**: Check component and API documentation
2. **Examples**: Review code examples for similar use cases
3. **FAQ**: Check frequently asked questions
4. **Community Forums**: Search community discussions

### Support Channels

1. **Technical Support**: For complex technical issues
2. **Emergency Hotline**: For critical system issues
3. **Developer Support**: For integration questions
4. **Community Support**: For general questions

### Reporting Issues

When reporting issues, include:

1. **Error Messages**: Complete error messages and codes
2. **Steps to Reproduce**: Detailed reproduction steps
3. **Environment Info**: Browser, app version, network info
4. **Identity Type**: Which identity type is affected
5. **Debug Logs**: Relevant debug information

```typescript
// Generate support report
async function generateSupportReport(identityId: string, error: any) {
  return {
    timestamp: new Date().toISOString(),
    identityId,
    identityType: await identityManager.getIdentityType(identityId),
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    systemInfo: await getSystemInfo(),
    serviceStatus: await getServiceStatus(),
    recentLogs: await getRecentLogs(identityId)
  };
}
```