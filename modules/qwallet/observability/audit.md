# Qwallet Audit Specifications

This document defines the audit logging requirements and specifications for the Qwallet module.

## Audit Event Categories

### Payment Operations
- Payment intent creation
- Transaction signing
- Payment processing
- Balance updates
- Fee calculations

### Security Events
- Authentication attempts
- Authorization decisions
- Signature verifications
- Spending limit checks
- High-value transaction alerts

### Administrative Events
- Configuration changes
- Limit modifications
- Account suspensions
- Emergency actions

### System Events
- Service startup/shutdown
- Health check failures
- Integration errors
- Performance alerts

## Audit Event Structure

### Standard Fields
All audit events must include these standard fields:

```json
{
  "eventId": "audit_abc123def456",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "module": "qwallet",
  "version": "1.0.0",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal",
    "sessionId": "session_def456ghi789",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "action": "PAYMENT_INTENT_CREATED",
  "resource": {
    "type": "payment_intent",
    "id": "intent_ghi789jkl012",
    "owner": "did:squid:alice123"
  },
  "verdict": "ALLOW",
  "riskScore": 15,
  "details": {},
  "signature": "0x1234567890abcdef...",
  "cid": "QmXyZ123..."
}
```

### Event-Specific Details

#### Payment Intent Created
```json
{
  "action": "PAYMENT_INTENT_CREATED",
  "details": {
    "amount": 100.50,
    "currency": "QToken",
    "recipient": "did:squid:bob456",
    "purpose": "Service payment",
    "expiresAt": "2024-01-15T11:30:00.000Z",
    "fees": {
      "network": 0.001,
      "platform": 0.005,
      "total": 0.006
    }
  }
}
```

#### Transaction Signed
```json
{
  "action": "TRANSACTION_SIGNED",
  "details": {
    "transactionId": "tx_jkl012mno345",
    "intentId": "intent_ghi789jkl012",
    "walletAddress": "0x1234567890abcdef...",
    "gasEstimate": 21000,
    "signatureAlgorithm": "ed25519"
  }
}
```

#### Payment Processed
```json
{
  "action": "PAYMENT_PROCESSED",
  "details": {
    "transactionId": "tx_jkl012mno345",
    "status": "SETTLED",
    "blockchainHash": "0xabcdef1234567890...",
    "blockNumber": 12345678,
    "gasUsed": 21000,
    "finalAmount": 100.50,
    "processingTime": "2.5s"
  }
}
```

#### Balance Updated
```json
{
  "action": "BALANCE_UPDATED",
  "details": {
    "walletAddress": "0x1234567890abcdef...",
    "currency": "QToken",
    "previousBalance": 1000.50,
    "newBalance": 900.00,
    "change": -100.50,
    "reason": "payment_sent",
    "transactionId": "tx_jkl012mno345"
  }
}
```

#### Spending Limit Exceeded
```json
{
  "action": "SPENDING_LIMIT_EXCEEDED",
  "verdict": "DENY",
  "details": {
    "limitType": "daily",
    "limit": 1000.00,
    "current": 950.00,
    "attempted": 100.00,
    "currency": "QToken",
    "daoId": "dao:enterprise:acme"
  }
}
```

#### Authentication Failed
```json
{
  "action": "AUTHENTICATION_FAILED",
  "verdict": "DENY",
  "details": {
    "reason": "invalid_signature",
    "attemptedSquidId": "did:squid:alice123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "ipAddress": "192.168.1.100"
  }
}
```

## Risk Scoring

### Risk Factors
- **Transaction Amount**: Higher amounts increase risk score
- **Velocity**: Rapid successive transactions increase risk
- **Geographic**: Unusual geographic patterns increase risk
- **Time**: Transactions outside normal hours increase risk
- **Reputation**: Lower identity reputation increases risk

### Risk Score Calculation
```javascript
function calculateRiskScore(transaction, identity, context) {
  let score = 0;
  
  // Amount risk (0-30 points)
  if (transaction.amount > 10000) score += 30;
  else if (transaction.amount > 1000) score += 15;
  else if (transaction.amount > 100) score += 5;
  
  // Velocity risk (0-25 points)
  const recentTransactions = getRecentTransactions(identity.squidId, '1h');
  if (recentTransactions.length > 10) score += 25;
  else if (recentTransactions.length > 5) score += 15;
  else if (recentTransactions.length > 2) score += 5;
  
  // Geographic risk (0-20 points)
  const usualCountry = identity.profile.country;
  if (context.country !== usualCountry) score += 20;
  
  // Time risk (0-15 points)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) score += 15;
  
  // Reputation risk (0-10 points)
  if (identity.reputation < 50) score += 10;
  else if (identity.reputation < 75) score += 5;
  
  return Math.min(score, 100);
}
```

### Risk Thresholds
- **0-25**: Low risk - Allow automatically
- **26-50**: Medium risk - Allow with monitoring
- **51-75**: High risk - Require additional verification
- **76-100**: Critical risk - Block and investigate

## Compliance Requirements

### Regulatory Compliance
- **AML (Anti-Money Laundering)**: Transaction monitoring and reporting
- **KYC (Know Your Customer)**: Identity verification logging
- **GDPR**: Data protection and privacy compliance
- **PCI DSS**: Payment card industry security standards
- **SOX**: Financial reporting and audit requirements

### Audit Trail Requirements
- **Immutability**: Audit logs cannot be modified after creation
- **Integrity**: Cryptographic signatures ensure data integrity
- **Completeness**: All relevant events must be logged
- **Timeliness**: Events logged in real-time or near real-time
- **Retention**: Logs retained for required compliance periods

### Data Protection
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access to audit logs
- **Anonymization**: Personal data anonymized where possible
- **Right to Erasure**: GDPR compliance for data deletion requests

## Audit Log Storage

### Storage Locations
- **Primary**: IPFS for immutable storage
- **Secondary**: Database for fast querying
- **Archive**: Long-term storage for compliance

### Storage Format
```json
{
  "logEntry": {
    "eventId": "audit_abc123def456",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "data": "encrypted_audit_data",
    "signature": "0x1234567890abcdef...",
    "cid": "QmXyZ123..."
  },
  "metadata": {
    "version": "1.0.0",
    "encryption": "AES-256-GCM",
    "compression": "gzip",
    "size": 1024
  }
}
```

### Retention Policies
- **Payment Events**: 7 years (regulatory requirement)
- **Security Events**: 3 years
- **Administrative Events**: 5 years
- **System Events**: 1 year

## Monitoring and Alerting

### Real-time Monitoring
- **High-risk transactions**: Immediate alerts for risk scores > 75
- **Failed authentications**: Alert after 5 failed attempts
- **Spending limit violations**: Immediate notification
- **System errors**: Alert on service failures

### Periodic Reviews
- **Daily**: Review high-risk transactions
- **Weekly**: Analyze spending patterns
- **Monthly**: Compliance report generation
- **Quarterly**: Audit log integrity verification

### Alert Channels
- **Email**: For non-urgent notifications
- **SMS**: For urgent security alerts
- **Slack**: For operational notifications
- **PagerDuty**: For critical system alerts

## Audit Log Analysis

### Pattern Detection
- **Fraud Detection**: Unusual transaction patterns
- **Compliance Monitoring**: Regulatory requirement adherence
- **Performance Analysis**: System performance metrics
- **User Behavior**: Identity usage patterns

### Reporting
- **Compliance Reports**: Regulatory reporting requirements
- **Security Reports**: Security incident summaries
- **Performance Reports**: System performance metrics
- **Business Reports**: Transaction volume and trends

### Data Analytics
- **Machine Learning**: Anomaly detection and pattern recognition
- **Statistical Analysis**: Trend analysis and forecasting
- **Correlation Analysis**: Event relationship identification
- **Predictive Analytics**: Risk prediction and prevention

## Integration with Qerberos

### Event Publishing
All audit events are published to Qerberos for centralized security monitoring:

```javascript
async function publishAuditEvent(event) {
  try {
    await qerberosService.logEvent({
      module: 'qwallet',
      action: event.action,
      squidId: event.actor.squidId,
      resourceId: event.resource.id,
      operationType: 'PAYMENT',
      identityType: event.actor.subId ? 'SUB' : 'ROOT',
      riskScore: event.riskScore,
      verdict: event.verdict,
      metadata: event.details,
      timestamp: event.timestamp,
      signature: event.signature,
      cid: event.cid
    });
  } catch (error) {
    console.error('Failed to publish audit event to Qerberos:', error);
    // Store locally for retry
    await storeFailedAuditEvent(event);
  }
}
```

### Risk Assessment
Qerberos provides additional risk assessment and anomaly detection:

```javascript
async function assessTransactionRisk(transaction) {
  try {
    const riskAssessment = await qerberosService.assessRisk({
      module: 'qwallet',
      operation: 'payment',
      actor: transaction.actor,
      amount: transaction.amount,
      currency: transaction.currency,
      recipient: transaction.recipient,
      context: {
        ipAddress: transaction.context.ipAddress,
        userAgent: transaction.context.userAgent,
        timestamp: transaction.timestamp
      }
    });
    
    return riskAssessment.riskScore;
  } catch (error) {
    console.error('Failed to assess transaction risk:', error);
    // Fallback to local risk calculation
    return calculateLocalRiskScore(transaction);
  }
}
```

## Audit Log Verification

### Integrity Verification
Regular verification of audit log integrity:

```javascript
async function verifyAuditLogIntegrity(logEntry) {
  // Verify cryptographic signature
  const signatureValid = await verifySignature(
    logEntry.data,
    logEntry.signature,
    logEntry.actor.squidId
  );
  
  // Verify IPFS CID
  const cidValid = await verifyIPFSContent(
    logEntry.cid,
    logEntry.data
  );
  
  // Verify timestamp
  const timestampValid = verifyTimestamp(
    logEntry.timestamp,
    logEntry.signature
  );
  
  return signatureValid && cidValid && timestampValid;
}
```

### Compliance Verification
Automated compliance checking:

```javascript
async function verifyCompliance(period) {
  const auditLogs = await getAuditLogs(period);
  const complianceReport = {
    period,
    totalEvents: auditLogs.length,
    complianceChecks: {
      aml: checkAMLCompliance(auditLogs),
      kyc: checkKYCCompliance(auditLogs),
      gdpr: checkGDPRCompliance(auditLogs),
      pci: checkPCICompliance(auditLogs)
    },
    violations: [],
    recommendations: []
  };
  
  return complianceReport;
}
```