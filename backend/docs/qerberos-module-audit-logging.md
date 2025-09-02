# Qerberos Module Registration Audit Logging

## Overview

The Qerberos service has been enhanced with comprehensive audit logging capabilities specifically designed for module registration events in the AnarQ & Q ecosystem. This enhancement provides detailed audit trails, compliance monitoring, and regulatory reporting for all module registration activities.

## Features

### 1. Enhanced Module Registration Logging

The `logModuleRegistration` method provides comprehensive audit logging for module registration events with the following capabilities:

- **Complete Event Tracking**: Logs all module registration actions (REGISTERED, UPDATED, DEREGISTERED, VERIFIED, PROMOTED, etc.)
- **Enhanced Metadata**: Captures module-specific information including version, status, compliance data, and signature details
- **Compliance Monitoring**: Automatically checks for compliance violations and generates alerts
- **Security Context**: Records signature verification details and authorization levels
- **Regulatory Flags**: Automatically generates regulatory flags based on module characteristics

### 2. Module-Specific Audit Trails

Each module maintains its own audit trail with:

- **Chronological History**: Complete timeline of all registration events
- **State Snapshots**: Captures compliance and security state at each event
- **Change Tracking**: Records what changed between events
- **Regulatory Context**: Maintains regulatory flags and compliance status

### 3. Compliance Violation Detection

Automatic detection of compliance violations including:

- **Audit Requirements**: Production modules must have completed security audits
- **GDPR Compliance**: Modules handling EU data must be GDPR compliant
- **KYC Requirements**: Financial modules should support KYC
- **Privacy Enforcement**: Modules handling personal data must enforce privacy controls
- **Risk Scoring**: High-risk modules must implement risk scoring

### 4. Audit Event Querying

Flexible querying capabilities with filters for:

- Module ID
- Action type
- Signer identity
- Date ranges
- Success/failure status
- Test mode
- Compliance issues

### 5. Compliance Reporting

Comprehensive reporting for regulatory requirements:

- **Compliance Reports**: Detailed compliance status and violations
- **Security Reports**: Security incidents and risk assessments
- **Statistics Reports**: Usage statistics and performance metrics
- **Export Formats**: JSON, CSV, and XML export options

## API Reference

### logModuleRegistration(registrationData)

Logs a module registration event with comprehensive audit information.

```javascript
const result = await qerberosService.logModuleRegistration({
  action: 'REGISTERED',
  moduleId: 'qwallet',
  signerIdentity: 'did:root:admin',
  success: true,
  moduleVersion: '1.0.0',
  moduleStatus: 'PRODUCTION_READY',
  testMode: false,
  complianceInfo: {
    audit: true,
    risk_scoring: true,
    privacy_enforced: true,
    kyc_support: false,
    gdpr_compliant: true,
    data_retention_policy: 'standard'
  },
  auditHash: 'sha256:abc123def456789',
  signatureInfo: {
    algorithm: 'RSA-SHA256',
    publicKeyId: 'did:root:admin_module_key',
    valid: true,
    identityType: 'ROOT'
  },
  dependencyInfo: {
    dependencies: ['qindex', 'qlock'],
    integrations: ['qsocial', 'qerberos']
  }
});
```

**Returns:**
```javascript
{
  auditTrailId: 'qerberos_1234567890_abc123',
  logged: true,
  complianceIssues: [],
  severity: 'medium',
  timestamp: '2024-02-08T15:30:00.000Z'
}
```

### queryModuleAuditEvents(criteria)

Query module audit events with flexible filtering.

```javascript
const events = await qerberosService.queryModuleAuditEvents({
  moduleId: 'qwallet',
  action: 'REGISTERED',
  startDate: '2024-01-01',
  endDate: '2024-02-08',
  success: true,
  testMode: false,
  limit: 100,
  offset: 0
});
```

**Returns:**
```javascript
{
  events: [...], // Array of audit events
  totalCount: 150,
  limit: 100,
  offset: 0,
  hasMore: true
}
```

### exportModuleAuditData(exportOptions)

Export comprehensive audit data for compliance reporting.

```javascript
const exportData = await qerberosService.exportModuleAuditData({
  format: 'json', // 'json', 'csv', or 'xml'
  moduleId: 'qwallet',
  startDate: '2024-01-01',
  endDate: '2024-02-08',
  includeComplianceData: true,
  includeSecurityData: true,
  includeStatistics: true
});
```

### generateComplianceReport(moduleId, startDate, endDate)

Generate detailed compliance report for regulatory requirements.

```javascript
const report = await qerberosService.generateComplianceReport(
  'qwallet',
  '2024-01-01',
  '2024-02-08'
);
```

## Integration with ModuleRegistrationService

The ModuleRegistrationService automatically integrates with the enhanced Qerberos audit logging:

1. **Automatic Logging**: All registration events are automatically logged with enhanced metadata
2. **Signature Information**: Signature verification results are included in audit logs
3. **Compliance Context**: Module compliance information is captured and monitored
4. **Error Handling**: Audit logging failures don't break the registration process

## Compliance Features

### Regulatory Flags

Automatically generated based on module characteristics:

- `FINANCIAL_SERVICE`: Modules handling financial transactions
- `PERSONAL_DATA_PROCESSING`: Modules processing personal data
- `SANDBOX_OPERATION`: Modules in test/sandbox mode
- `GDPR_COMPLIANT`: GDPR compliant modules
- `SECURITY_AUDITED`: Security audited modules

### Compliance Violations

Automatically detected violations include:

- **AUDIT_REQUIRED**: Production modules without security audit
- **GDPR_NON_COMPLIANT**: Modules requiring GDPR compliance
- **KYC_REQUIRED**: Financial modules without KYC support
- **PRIVACY_NOT_ENFORCED**: Modules not enforcing privacy controls
- **RISK_SCORING_REQUIRED**: High-risk modules without risk scoring

### Alert Generation

Automatic alerts for:

- Critical module events (deregistration, suspension)
- Compliance violations
- Security incidents
- Signature verification failures

## Security Features

### Authorization Levels

Tracks authorization levels for signers:

- `ROOT`: Root identity with full privileges
- `DAO`: DAO identity with organizational privileges
- `ENTERPRISE`: Enterprise identity with business privileges
- `STANDARD`: Standard user identity

### Signature Verification

Comprehensive signature tracking:

- Algorithm used (RSA-SHA256, ECDSA-SHA256, etc.)
- Public key identifier
- Verification result
- Identity type of signer
- Timestamp of signature

### Risk Assessment

Automatic risk assessment based on:

- Signature verification failures
- Unauthorized access attempts
- Critical security events
- Compliance violations

## Statistics and Monitoring

### Module Registration Statistics

Tracks:

- Total registrations
- Success/failure rates
- Module status distribution
- Action type distribution
- Compliance statistics

### Health Check Integration

Module registration metrics included in health checks:

- Number of audit trails
- Active module alerts
- Total registrations
- Successful registrations

## Usage Examples

### Basic Module Registration Logging

```javascript
// This is automatically called by ModuleRegistrationService
await qerberosService.logModuleRegistration({
  action: 'REGISTERED',
  moduleId: 'my-module',
  signerIdentity: 'did:root:admin',
  success: true,
  moduleVersion: '1.0.0',
  moduleStatus: 'PRODUCTION_READY'
});
```

### Querying Audit Events

```javascript
// Get all events for a specific module
const moduleEvents = await qerberosService.queryModuleAuditEvents({
  moduleId: 'qwallet'
});

// Get failed registration attempts
const failures = await qerberosService.queryModuleAuditEvents({
  success: false,
  action: 'REGISTERED'
});

// Get sandbox registrations
const sandboxEvents = await qerberosService.queryModuleAuditEvents({
  testMode: true
});
```

### Generating Compliance Reports

```javascript
// Generate compliance report for a specific module
const complianceReport = await qerberosService.generateComplianceReport(
  'qwallet',
  '2024-01-01',
  '2024-02-08'
);

// Export audit data for regulatory review
const auditExport = await qerberosService.exportModuleAuditData({
  format: 'csv',
  includeComplianceData: true,
  startDate: '2024-01-01',
  endDate: '2024-02-08'
});
```

## Best Practices

1. **Regular Monitoring**: Monitor compliance violations and security alerts regularly
2. **Audit Trail Retention**: Maintain audit trails for regulatory compliance periods
3. **Export Scheduling**: Schedule regular exports for compliance reporting
4. **Alert Response**: Establish procedures for responding to critical alerts
5. **Access Control**: Restrict access to audit data based on roles and responsibilities

## Testing

Comprehensive test coverage includes:

- Module registration event logging
- Compliance violation detection
- Audit trail creation and management
- Event querying and filtering
- Report generation and export
- Integration with ModuleRegistrationService

Run tests with:

```bash
npm test -- --run qerberos-module-audit.test.mjs
npm test -- --run module-registration-qerberos-integration.test.mjs
```