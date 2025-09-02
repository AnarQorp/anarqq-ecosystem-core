# Qmarket Event Catalog

This document describes all events published by the Qmarket module following the Q ecosystem event naming convention: `q.<module>.<action>.<version>`

## Event Categories

### Listing Events
Events related to marketplace listing lifecycle.

### Purchase Events
Events related to content purchases and transactions.

### License Events
Events related to digital license management.

### Analytics Events
Events for tracking marketplace metrics and user behavior.

## Event Definitions

### q.qmarket.listed.v1
**Description**: Published when a new marketplace listing is created.

**Payload Schema**: [listed.event.json](./listed.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_listed_1234567890",
  "eventType": "q.qmarket.listed.v1",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "qmarket",
  "data": {
    "listingId": "listing_abc123def456",
    "squidId": "squid_user123",
    "title": "Digital Art Collection",
    "price": 50.0,
    "currency": "QToken",
    "category": "digital-art",
    "fileCid": "QmXyZ789...",
    "visibility": "public",
    "nftMinted": true
  }
}
```

### q.qmarket.sold.v1
**Description**: Published when a marketplace item is successfully purchased.

**Payload Schema**: [sold.event.json](./sold.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_sold_1234567890",
  "eventType": "q.qmarket.sold.v1",
  "timestamp": "2024-01-15T11:45:00Z",
  "source": "qmarket",
  "data": {
    "purchaseId": "purchase_xyz789abc123",
    "listingId": "listing_abc123def456",
    "buyerId": "squid_buyer456",
    "sellerId": "squid_seller123",
    "price": 50.0,
    "currency": "QToken",
    "paymentIntentId": "intent_payment123",
    "licenseGranted": true
  }
}
```

### q.qmarket.updated.v1
**Description**: Published when a marketplace listing is updated.

**Payload Schema**: [updated.event.json](./updated.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_updated_1234567890",
  "eventType": "q.qmarket.updated.v1",
  "timestamp": "2024-01-15T12:00:00Z",
  "source": "qmarket",
  "data": {
    "listingId": "listing_abc123def456",
    "squidId": "squid_user123",
    "changes": {
      "price": {
        "from": 50.0,
        "to": 45.0
      },
      "title": {
        "from": "Digital Art Collection",
        "to": "Premium Digital Art Collection"
      }
    },
    "updatedFields": ["price", "title"]
  }
}
```

### q.qmarket.delisted.v1
**Description**: Published when a marketplace listing is removed or deleted.

**Payload Schema**: [delisted.event.json](./delisted.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_delisted_1234567890",
  "eventType": "q.qmarket.delisted.v1",
  "timestamp": "2024-01-15T13:15:00Z",
  "source": "qmarket",
  "data": {
    "listingId": "listing_abc123def456",
    "squidId": "squid_user123",
    "reason": "user_requested",
    "finalStatus": "deleted",
    "hadPurchases": false
  }
}
```

### q.qmarket.license.granted.v1
**Description**: Published when a digital license is granted to a buyer.

**Payload Schema**: [license-granted.event.json](./license-granted.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_license_granted_1234567890",
  "eventType": "q.qmarket.license.granted.v1",
  "timestamp": "2024-01-15T11:46:00Z",
  "source": "qmarket",
  "data": {
    "licenseId": "license_def456ghi789",
    "purchaseId": "purchase_xyz789abc123",
    "listingId": "listing_abc123def456",
    "holderId": "squid_buyer456",
    "licenseType": "personal",
    "permissions": ["read", "download", "print"],
    "expiresAt": null
  }
}
```

### q.qmarket.license.transferred.v1
**Description**: Published when a digital license is transferred to another user.

**Payload Schema**: [license-transferred.event.json](./license-transferred.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_license_transferred_1234567890",
  "eventType": "q.qmarket.license.transferred.v1",
  "timestamp": "2024-01-15T14:30:00Z",
  "source": "qmarket",
  "data": {
    "licenseId": "license_def456ghi789",
    "fromId": "squid_buyer456",
    "toId": "squid_newowner789",
    "transferReason": "resale",
    "transferPrice": 30.0,
    "currency": "QToken"
  }
}
```

### q.qmarket.license.revoked.v1
**Description**: Published when a digital license is revoked.

**Payload Schema**: [license-revoked.event.json](./license-revoked.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_license_revoked_1234567890",
  "eventType": "q.qmarket.license.revoked.v1",
  "timestamp": "2024-01-15T15:00:00Z",
  "source": "qmarket",
  "data": {
    "licenseId": "license_def456ghi789",
    "holderId": "squid_buyer456",
    "revokedBy": "squid_seller123",
    "reason": "terms_violation",
    "refundIssued": true
  }
}
```

### q.qmarket.analytics.view.v1
**Description**: Published when a listing is viewed (for analytics).

**Payload Schema**: [analytics-view.event.json](./analytics-view.event.json)

**Example**:
```json
{
  "eventId": "evt_qmarket_analytics_view_1234567890",
  "eventType": "q.qmarket.analytics.view.v1",
  "timestamp": "2024-01-15T16:20:00Z",
  "source": "qmarket",
  "data": {
    "listingId": "listing_abc123def456",
    "viewerId": "squid_viewer789",
    "viewerType": "authenticated",
    "referrer": "search",
    "sessionId": "session_xyz123",
    "viewDuration": 45
  }
}
```

## Event Consumption

### Subscribers
- **Qerberos**: Consumes all events for audit logging and security monitoring
- **Qindex**: Consumes listing events for search index updates
- **Analytics Service**: Consumes analytics events for metrics and reporting
- **Notification Service**: Consumes purchase and license events for user notifications
- **Revenue Service**: Consumes sold events for revenue tracking and distribution

### Event Ordering
Events are published in chronological order with microsecond precision timestamps. Related events (e.g., listing creation followed by license granting) maintain causal ordering.

### Event Retention
- **Audit Events**: Retained permanently for compliance
- **Analytics Events**: Retained for 2 years for reporting
- **Operational Events**: Retained for 90 days for debugging

## Error Handling

### Failed Event Publishing
If event publishing fails, the operation continues but an error is logged. Critical events (purchases, license grants) are retried with exponential backoff.

### Event Schema Validation
All events are validated against their schemas before publishing. Invalid events are logged and dropped to prevent downstream issues.

### Dead Letter Queue
Failed events that cannot be processed after retries are sent to a dead letter queue for manual investigation.