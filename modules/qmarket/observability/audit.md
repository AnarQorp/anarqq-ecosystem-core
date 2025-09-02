# Qmarket Audit and Observability Specifications

This document defines the audit logging, monitoring, and observability requirements for the Qmarket module, including integration with Qerberos and other monitoring systems.

## Audit Event Categories

### Marketplace Operations
All marketplace-related operations that affect listings, purchases, and user interactions.

### Financial Transactions
All payment-related activities including purchases, refunds, and revenue distribution.

### Security Events
Authentication, authorization, and security-related incidents.

### System Operations
Technical operations, performance metrics, and system health events.

## Audit Event Schema

### Standard Audit Event Structure
```json
{
  "eventId": "string",
  "eventType": "string",
  "timestamp": "ISO8601",
  "source": "qmarket",
  "version": "1.0.0",
  "correlationId": "string",
  "actor": {
    "squidId": "string",
    "subId": "string",
    "daoIds": ["string"],
    "ipAddress": "string",
    "userAgent": "string"
  },
  "resource": {
    "type": "string",
    "id": "string",
    "attributes": {}
  },
  "action": {
    "type": "string",
    "result": "success|failure|partial",
    "details": {},
    "metadata": {}
  },
  "context": {
    "requestId": "string",
    "sessionId": "string",
    "apiVersion": "string",
    "environment": "string"
  },
  "security": {
    "riskScore": "number",
    "anomalyFlags": ["string"],
    "complianceFlags": ["string"]
  }
}
```

## Marketplace Audit Events

### Listing Lifecycle Events

#### listing_created
**Description**: Audit event for new marketplace listing creation
**Trigger**: When a new listing is successfully created
**Retention**: 7 years (compliance requirement)

```json
{
  "eventType": "qmarket.listing.created",
  "action": {
    "type": "create_listing",
    "result": "success",
    "details": {
      "listingId": "listing_abc123",
      "title": "Digital Art Collection",
      "price": 50.0,
      "currency": "QToken",
      "category": "digital-art",
      "fileCid": "QmXyZ789...",
      "visibility": "public",
      "nftMinted": true
    },
    "metadata": {
      "processingTime": 1250,
      "ecosystemIntegrations": {
        "qonsent": "success",
        "qlock": "success",
        "qwallet": "success",
        "qindex": "success",
        "qnet": "success"
      }
    }
  }
}
```

#### listing_updated
**Description**: Audit event for listing modifications
**Trigger**: When listing details are updated
**Retention**: 7 years

```json
{
  "eventType": "qmarket.listing.updated",
  "action": {
    "type": "update_listing",
    "result": "success",
    "details": {
      "listingId": "listing_abc123",
      "changes": {
        "price": {"from": 50.0, "to": 45.0},
        "title": {"from": "Art", "to": "Premium Art"}
      },
      "updatedFields": ["price", "title"]
    }
  }
}
```

#### listing_deleted
**Description**: Audit event for listing removal
**Trigger**: When a listing is deleted or delisted
**Retention**: Permanent (compliance requirement)

```json
{
  "eventType": "qmarket.listing.deleted",
  "action": {
    "type": "delete_listing",
    "result": "success",
    "details": {
      "listingId": "listing_abc123",
      "reason": "user_requested",
      "finalStatus": "deleted",
      "hadPurchases": false,
      "dataRetention": {
        "contentRemoved": true,
        "metadataArchived": true,
        "auditTrailPreserved": true
      }
    }
  }
}
```

### Purchase and Transaction Events

#### purchase_initiated
**Description**: Audit event for purchase initiation
**Trigger**: When a purchase process begins
**Retention**: 10 years (financial compliance)

```json
{
  "eventType": "qmarket.purchase.initiated",
  "action": {
    "type": "initiate_purchase",
    "result": "success",
    "details": {
      "purchaseId": "purchase_xyz789",
      "listingId": "listing_abc123",
      "buyerId": "squid_buyer456",
      "sellerId": "squid_seller123",
      "price": 50.0,
      "currency": "QToken",
      "paymentMethod": "QToken"
    }
  }
}
```

#### purchase_completed
**Description**: Audit event for successful purchase completion
**Trigger**: When payment is processed and access is granted
**Retention**: 10 years

```json
{
  "eventType": "qmarket.purchase.completed",
  "action": {
    "type": "complete_purchase",
    "result": "success",
    "details": {
      "purchaseId": "purchase_xyz789",
      "transactionId": "tx_blockchain123",
      "paymentIntentId": "intent_payment456",
      "fees": {
        "platformFee": 2.5,
        "royaltyFee": 2.5,
        "networkFee": 0.1
      },
      "settlement": {
        "sellerAmount": 44.9,
        "creatorRoyalty": 2.5,
        "platformFee": 2.5
      },
      "licenseGranted": true,
      "licenseId": "license_def456"
    }
  }
}
```

#### purchase_failed
**Description**: Audit event for failed purchases
**Trigger**: When purchase process fails
**Retention**: 2 years

```json
{
  "eventType": "qmarket.purchase.failed",
  "action": {
    "type": "complete_purchase",
    "result": "failure",
    "details": {
      "purchaseId": "purchase_xyz789",
      "failureReason": "insufficient_funds",
      "errorCode": "QWALLET_INSUFFICIENT_BALANCE",
      "retryable": true,
      "refundIssued": false
    }
  }
}
```

### License Management Events

#### license_granted
**Description**: Audit event for digital license creation
**Trigger**: When a license is granted to a buyer
**Retention**: Permanent

```json
{
  "eventType": "qmarket.license.granted",
  "action": {
    "type": "grant_license",
    "result": "success",
    "details": {
      "licenseId": "license_def456",
      "purchaseId": "purchase_xyz789",
      "holderId": "squid_buyer456",
      "licenseType": "personal",
      "permissions": ["read", "download", "print"],
      "restrictions": ["no_redistribution"],
      "expiresAt": null
    }
  }
}
```

#### license_transferred
**Description**: Audit event for license transfers
**Trigger**: When a license is transferred to another user
**Retention**: Permanent

```json
{
  "eventType": "qmarket.license.transferred",
  "action": {
    "type": "transfer_license",
    "result": "success",
    "details": {
      "licenseId": "license_def456",
      "fromId": "squid_buyer456",
      "toId": "squid_newowner789",
      "transferReason": "resale",
      "transferPrice": 30.0,
      "originalPurchasePrice": 50.0
    }
  }
}
```

#### license_revoked
**Description**: Audit event for license revocation
**Trigger**: When a license is revoked
**Retention**: Permanent

```json
{
  "eventType": "qmarket.license.revoked",
  "action": {
    "type": "revoke_license",
    "result": "success",
    "details": {
      "licenseId": "license_def456",
      "holderId": "squid_buyer456",
      "revokedBy": "squid_seller123",
      "reason": "terms_violation",
      "refundIssued": true,
      "refundAmount": 25.0
    }
  }
}
```

## Security Audit Events

### Authentication Events

#### auth_success
**Description**: Successful authentication event
**Trigger**: Valid sQuid identity verification
**Retention**: 90 days

```json
{
  "eventType": "qmarket.auth.success",
  "action": {
    "type": "authenticate",
    "result": "success",
    "details": {
      "authMethod": "squid_token",
      "tokenType": "bearer",
      "sessionDuration": 3600
    }
  },
  "security": {
    "riskScore": 0.1,
    "anomalyFlags": [],
    "complianceFlags": []
  }
}
```

#### auth_failure
**Description**: Failed authentication attempt
**Trigger**: Invalid or expired credentials
**Retention**: 2 years

```json
{
  "eventType": "qmarket.auth.failure",
  "action": {
    "type": "authenticate",
    "result": "failure",
    "details": {
      "failureReason": "invalid_token",
      "attemptCount": 1,
      "lockoutTriggered": false
    }
  },
  "security": {
    "riskScore": 0.7,
    "anomalyFlags": ["repeated_failures"],
    "complianceFlags": []
  }
}
```

### Authorization Events

#### permission_granted
**Description**: Permission granted by Qonsent
**Trigger**: Successful permission check
**Retention**: 1 year

```json
{
  "eventType": "qmarket.permission.granted",
  "action": {
    "type": "check_permission",
    "result": "success",
    "details": {
      "permission": "qmarket:purchase",
      "resourceType": "listing",
      "resourceId": "listing_abc123",
      "grantReason": "valid_license"
    }
  }
}
```

#### permission_denied
**Description**: Permission denied by Qonsent
**Trigger**: Failed permission check
**Retention**: 2 years

```json
{
  "eventType": "qmarket.permission.denied",
  "action": {
    "type": "check_permission",
    "result": "failure",
    "details": {
      "permission": "qmarket:update",
      "resourceType": "listing",
      "resourceId": "listing_abc123",
      "denyReason": "not_owner"
    }
  },
  "security": {
    "riskScore": 0.3,
    "anomalyFlags": [],
    "complianceFlags": ["access_attempt"]
  }
}
```

### Anomaly Detection Events

#### suspicious_activity
**Description**: Suspicious behavior detected
**Trigger**: ML-based anomaly detection
**Retention**: 5 years

```json
{
  "eventType": "qmarket.security.anomaly",
  "action": {
    "type": "anomaly_detection",
    "result": "warning",
    "details": {
      "anomalyType": "unusual_purchase_pattern",
      "confidence": 0.85,
      "indicators": [
        "rapid_successive_purchases",
        "high_value_transactions",
        "new_account_activity"
      ],
      "automaticActions": ["rate_limit_applied"],
      "manualReviewRequired": true
    }
  },
  "security": {
    "riskScore": 0.85,
    "anomalyFlags": ["high_confidence_anomaly"],
    "complianceFlags": ["manual_review_required"]
  }
}
```

## System Operations Audit Events

### Performance Events

#### performance_degradation
**Description**: System performance issues
**Trigger**: Response time or error rate thresholds exceeded
**Retention**: 90 days

```json
{
  "eventType": "qmarket.system.performance",
  "action": {
    "type": "performance_monitoring",
    "result": "warning",
    "details": {
      "metric": "response_time",
      "threshold": 200,
      "actualValue": 350,
      "duration": 300,
      "affectedEndpoints": ["/api/listings", "/api/purchases"]
    }
  }
}
```

### Integration Events

#### ecosystem_integration_failure
**Description**: Failure in ecosystem service integration
**Trigger**: Service call failures or timeouts
**Retention**: 1 year

```json
{
  "eventType": "qmarket.integration.failure",
  "action": {
    "type": "service_integration",
    "result": "failure",
    "details": {
      "service": "qwallet",
      "operation": "process_payment",
      "errorCode": "SERVICE_UNAVAILABLE",
      "retryAttempts": 3,
      "fallbackUsed": true
    }
  }
}
```

## Compliance and Regulatory Events

### GDPR Compliance Events

#### data_subject_request
**Description**: GDPR data subject request processing
**Trigger**: User requests data access, portability, or erasure
**Retention**: Permanent

```json
{
  "eventType": "qmarket.compliance.gdpr",
  "action": {
    "type": "data_subject_request",
    "result": "success",
    "details": {
      "requestType": "right_to_erasure",
      "dataSubject": "squid_user123",
      "requestId": "dsr_abc123",
      "processingTime": 72,
      "dataRemoved": {
        "listings": 5,
        "purchases": 12,
        "personalData": true
      },
      "dataRetained": {
        "auditLogs": true,
        "financialRecords": true,
        "reason": "legal_obligation"
      }
    }
  }
}
```

### Financial Compliance Events

#### aml_check
**Description**: Anti-money laundering compliance check
**Trigger**: High-value transactions or suspicious patterns
**Retention**: 10 years

```json
{
  "eventType": "qmarket.compliance.aml",
  "action": {
    "type": "aml_screening",
    "result": "cleared",
    "details": {
      "transactionId": "tx_blockchain123",
      "amount": 1000.0,
      "currency": "QToken",
      "riskScore": 0.2,
      "screeningResults": {
        "sanctionsList": "clear",
        "pepCheck": "clear",
        "adverseMedia": "clear"
      }
    }
  }
}
```

## Monitoring and Alerting

### Real-time Monitoring
- **API Response Times**: Monitor all endpoint response times
- **Error Rates**: Track error rates by endpoint and error type
- **Transaction Success Rates**: Monitor payment processing success
- **Security Events**: Real-time security event monitoring
- **Resource Usage**: CPU, memory, and storage utilization

### Alerting Thresholds
```json
{
  "critical": {
    "responseTime": "> 1000ms",
    "errorRate": "> 5%",
    "securityEvents": "any high-risk event",
    "serviceUnavailable": "any ecosystem service down"
  },
  "warning": {
    "responseTime": "> 500ms",
    "errorRate": "> 2%",
    "unusualActivity": "anomaly score > 0.7",
    "resourceUsage": "> 80%"
  },
  "info": {
    "responseTime": "> 200ms",
    "errorRate": "> 1%",
    "newUserActivity": "first-time users",
    "resourceUsage": "> 60%"
  }
}
```

### Dashboard Metrics
- **Marketplace Activity**: Listings created, purchases completed, revenue generated
- **User Engagement**: Active users, session duration, conversion rates
- **System Health**: Uptime, response times, error rates
- **Security Status**: Authentication success rates, permission denials, anomalies
- **Financial Metrics**: Transaction volumes, fee collection, revenue distribution

## Data Retention and Archival

### Retention Policies by Event Type
```json
{
  "financial_transactions": "10_years",
  "marketplace_operations": "7_years",
  "security_events": "5_years",
  "user_activity": "2_years",
  "system_operations": "1_year",
  "performance_metrics": "90_days",
  "debug_logs": "30_days"
}
```

### Archival Strategy
- **Hot Storage**: Last 30 days - immediate access
- **Warm Storage**: 30 days to 1 year - quick retrieval
- **Cold Storage**: 1+ years - archived for compliance
- **Immutable Storage**: Critical audit events - permanent retention

### Data Export and Portability
- **JSON Format**: Standard export format for audit data
- **CSV Format**: Tabular data for analysis
- **API Access**: Programmatic access to audit logs
- **Compliance Reports**: Pre-formatted regulatory reports