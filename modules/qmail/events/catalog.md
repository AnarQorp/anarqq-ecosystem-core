# Qmail Event Catalog

This document describes all events published by the Qmail module.

## Event Naming Convention

All Qmail events follow the pattern: `q.qmail.<action>.<version>`

## Published Events

### q.qmail.sent.v1
**Description**: Published when a message is successfully sent and encrypted.

**Payload**: See `sent.event.json`

**Triggers**:
- Message successfully encrypted and stored
- Delivery tracking initiated
- Audit log created

**Consumers**:
- Qindex (for message indexing)
- Qerberos (for audit logging)
- Notification services

---

### q.qmail.delivered.v1
**Description**: Published when a message is delivered to recipient's inbox.

**Payload**: See `delivered.event.json`

**Triggers**:
- Message successfully delivered to recipient
- Delivery receipt generated (if requested)

**Consumers**:
- Sender notification
- Qerberos (for delivery audit)
- Analytics services

---

### q.qmail.receipt.generated.v1
**Description**: Published when a cryptographic delivery receipt is generated.

**Payload**: See `receipt-generated.event.json`

**Triggers**:
- Recipient reads message
- Certified delivery confirmation
- Receipt cryptographically signed

**Consumers**:
- Sender notification
- Qerberos (for compliance audit)
- Legal/compliance systems

---

### q.qmail.spam.detected.v1
**Description**: Published when spam or malicious content is detected.

**Payload**: See `spam-detected.event.json`

**Triggers**:
- Qerberos spam analysis
- Content filtering rules
- Reputation-based filtering

**Consumers**:
- Qerberos (for threat intelligence)
- Sender reputation system
- Admin notification

---

### q.qmail.retention.expired.v1
**Description**: Published when message retention period expires.

**Payload**: See `retention-expired.event.json`

**Triggers**:
- Message retention policy expiration
- GDPR compliance automation
- Scheduled cleanup processes

**Consumers**:
- Storage cleanup services
- Compliance reporting
- User notification (if configured)

---

### q.qmail.premium.activated.v1
**Description**: Published when premium messaging features are activated.

**Payload**: See `premium-activated.event.json`

**Triggers**:
- Qwallet payment confirmation
- Premium feature activation
- Service tier upgrade

**Consumers**:
- Billing systems
- Feature flag services
- User notification

---

### q.qmail.encryption.upgraded.v1
**Description**: Published when message encryption is upgraded to higher level.

**Payload**: See `encryption-upgraded.event.json`

**Triggers**:
- Quantum encryption activation
- Security policy changes
- User preference updates

**Consumers**:
- Security audit systems
- Compliance reporting
- User notification

## Event Schema Versioning

- **v1**: Initial schema version
- **Backward Compatibility**: New versions maintain backward compatibility
- **Deprecation**: Old versions deprecated with 6-month notice
- **Migration**: Automatic schema migration tools provided

## Event Reliability

- **At-Least-Once Delivery**: Events guaranteed to be delivered at least once
- **Idempotency**: Event consumers must handle duplicate events
- **Ordering**: Events within same message flow maintain causal ordering
- **Retry Policy**: Failed events retried with exponential backoff

## Security Considerations

- **Event Encryption**: Sensitive event data encrypted in transit
- **Access Control**: Event access controlled via Qonsent permissions
- **Audit Trail**: All event publishing/consumption logged
- **Data Minimization**: Events contain minimal necessary data