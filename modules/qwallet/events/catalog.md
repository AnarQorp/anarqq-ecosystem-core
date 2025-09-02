# Qwallet Event Catalog

This document describes all events published by the Qwallet module.

## Event Naming Convention

All Qwallet events follow the pattern: `q.qwallet.<action>.<version>`

## Events

### q.qwallet.intent.created.v1

**Description**: Published when a payment intent is created

**Payload Schema**: [intent-created.event.json](./intent-created.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.intent.created.v1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "intentId": "intent_abc123def456",
    "amount": 100.50,
    "currency": "QToken",
    "recipient": "did:squid:bob456",
    "purpose": "Service payment"
  }
}
```

### q.qwallet.tx.signed.v1

**Description**: Published when a transaction is cryptographically signed

**Payload Schema**: [tx-signed.event.json](./tx-signed.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.tx.signed.v1",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "transactionId": "tx_def456ghi789",
    "intentId": "intent_abc123def456",
    "signature": "0x1234567890abcdef...",
    "gasEstimate": 21000
  }
}
```

### q.qwallet.tx.settled.v1

**Description**: Published when a transaction is successfully settled on blockchain

**Payload Schema**: [tx-settled.event.json](./tx-settled.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.tx.settled.v1",
  "timestamp": "2024-01-15T10:32:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "transactionId": "tx_def456ghi789",
    "blockchainHash": "0xabcdef1234567890...",
    "blockNumber": 12345678,
    "gasUsed": 21000,
    "finalAmount": 100.50,
    "fees": {
      "network": 0.001,
      "platform": 0.005,
      "total": 0.006
    }
  }
}
```

### q.qwallet.limit.exceeded.v1

**Description**: Published when a spending limit is exceeded

**Payload Schema**: [limit-exceeded.event.json](./limit-exceeded.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.limit.exceeded.v1",
  "timestamp": "2024-01-15T10:33:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "limitType": "daily",
    "limit": 1000.00,
    "attempted": 1500.00,
    "current": 950.00,
    "currency": "QToken",
    "daoId": "dao:enterprise:acme"
  }
}
```

### q.qwallet.balance.updated.v1

**Description**: Published when wallet balance changes

**Payload Schema**: [balance-updated.event.json](./balance-updated.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.balance.updated.v1",
  "timestamp": "2024-01-15T10:34:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "walletAddress": "0x1234567890abcdef...",
    "currency": "QToken",
    "previousBalance": 1000.50,
    "newBalance": 900.00,
    "change": -100.50,
    "reason": "payment_sent"
  }
}
```

### q.qwallet.fee.calculated.v1

**Description**: Published when dynamic fees are calculated

**Payload Schema**: [fee-calculated.event.json](./fee-calculated.event.json)

**Example**:
```json
{
  "topic": "q.qwallet.fee.calculated.v1",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "transactionType": "payment",
    "amount": 100.50,
    "currency": "QToken",
    "network": "anarq-chain",
    "priority": "normal",
    "fees": {
      "network": 0.001,
      "platform": 0.005,
      "total": 0.006
    },
    "estimatedTime": "30s"
  }
}
```

## Event Consumers

### Internal Consumers
- **Qindex**: Indexes all payment transactions and intents
- **Qerberos**: Audits all payment activities and risk assessment
- **Qonsent**: Validates permissions for payment operations

### External Consumers
- **Frontend Applications**: Real-time payment status updates
- **Analytics Services**: Payment pattern analysis
- **Compliance Systems**: Regulatory reporting
- **Notification Services**: User payment alerts

## Event Retention

- **Payment Events**: Retained for 7 years for compliance
- **Balance Events**: Retained for 2 years
- **Fee Events**: Retained for 1 year
- **Limit Events**: Retained for 3 years

## Event Ordering

Events are published in the following order for a typical payment flow:

1. `q.qwallet.intent.created.v1`
2. `q.qwallet.fee.calculated.v1`
3. `q.qwallet.tx.signed.v1`
4. `q.qwallet.balance.updated.v1` (sender)
5. `q.qwallet.tx.settled.v1`
6. `q.qwallet.balance.updated.v1` (recipient)

## Error Events

### q.qwallet.error.v1

**Description**: Published when payment operations fail

**Example**:
```json
{
  "topic": "q.qwallet.error.v1",
  "timestamp": "2024-01-15T10:36:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "data": {
    "errorCode": "INSUFFICIENT_BALANCE",
    "errorMessage": "Insufficient balance for transaction",
    "transactionId": "tx_def456ghi789",
    "intentId": "intent_abc123def456",
    "context": {
      "requestedAmount": 1000.00,
      "availableBalance": 500.00,
      "currency": "QToken"
    }
  }
}
```