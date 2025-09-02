# Qmask API - API Reference

Privacy & Anonymization module for Q ecosystem

**Version:** 2.0.0

## Base URL

- Development: `http://localhost:3000/api/qmask`
- Production: `https://api.q.network/qmask`

## Authentication

All endpoints require authentication via sQuid identity:

```
Authorization: Bearer <jwt-token>
x-squid-id: <squid-identity-id>
x-api-version: 1.0.0
```

## Standard Headers

- `x-squid-id`: sQuid identity ID
- `x-subid`: Subidentity ID (optional)
- `x-qonsent`: Consent token for permissions
- `x-sig`: Qlock signature for verification
- `x-ts`: Timestamp
- `x-api-version`: API version

## Standard Response Format

All responses follow this format:

```json
{
  "status": "ok|error",
  "code": "SUCCESS|ERROR_CODE",
  "message": "Human readable message",
  "data": {},
  "cid": "ipfs-content-id"
}
```

## Endpoints



## Data Models


### MaskRule

#### Properties

- **field** (string): Field path to apply the rule to
  - Required: Yes
- **strategy** (string): Masking strategy to apply
  - Required: Yes
  - Values: REDACT, HASH, ENCRYPT, ANONYMIZE, REMOVE
- **params** (object): Additional parameters for the strategy


### MaskProfile

#### Properties

- **name** (string): Profile name
  - Required: Yes
- **rules** (array): List of masking rules
  - Required: Yes
- **defaults** (object): Default values for masked fields
- **version** (string): Profile version
  - Required: Yes
- **description** (string): Profile description
- **tags** (array): Profile tags
- **complianceFlags** (array): Compliance requirements met


### MaskingResult

#### Properties

- **maskedData** (object): Data with privacy masking applied
- **appliedRules** (array): List of rules that were applied
- **riskScore** (number): Re-identification risk score (0-1)
- **complianceFlags** (array): Compliance requirements met
- **warnings** (array): Warnings generated during masking


### PrivacyOperation

#### Properties

- **type** (string): Type of data processing operation
  - Required: Yes
  - Values: COLLECTION, PROCESSING, STORAGE, SHARING, DELETION, ANALYSIS
- **dataTypes** (array): Types of personal data involved
  - Required: Yes
- **purpose** (string): Purpose of processing
  - Required: Yes
- **recipients** (array): Data recipients
- **retention** (string): Data retention period
  - Required: Yes
- **jurisdiction** (string): Legal jurisdiction
  - Required: Yes


### PrivacyRisk

#### Properties

- **category** (string): Risk category
  - Values: DATA_BREACH, RE_IDENTIFICATION, UNAUTHORIZED_ACCESS, DATA_MISUSE, COMPLIANCE_VIOLATION
- **description** (string): Risk description
- **severity** (string): Risk severity
  - Values: LOW, MEDIUM, HIGH, CRITICAL
- **mitigation** (string): Recommended mitigation


### PrivacyAssessment

#### Properties

- **riskLevel** (string): Overall privacy risk level
  - Values: LOW, MEDIUM, HIGH, CRITICAL
- **riskScore** (number): Numerical risk score (0-1)
- **risks** (array): Identified privacy risks
- **recommendations** (array): Privacy protection recommendations
- **complianceRequirements** (array): Applicable compliance requirements


### DataSubjectRequest

#### Properties

- **type** (string): Type of data subject request
  - Required: Yes
  - Values: ACCESS, RECTIFICATION, ERASURE, PORTABILITY, RESTRICTION, OBJECTION
- **dataSubject** (string): Data subject identifier
  - Required: Yes
- **description** (string): Request description
  - Required: Yes


### ApiResponse

#### Properties

- **status** (string): Response status
  - Values: ok, error
- **code** (string): Response code
- **message** (string): Human readable message
- **data** (object): Response data
- **timestamp** (string): Response timestamp


### ErrorResponse

#### Properties

- **status** (string): Response status
  - Values: error
- **code** (string): Error code
- **message** (string): Error message
- **details** (object): Error details
- **timestamp** (string): Error timestamp



## Error Codes

Common error codes returned by this module:

- `INVALID_REQUEST`: Malformed request
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Rate limit exceeded
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- **Per Identity**: 100 requests per minute
- **Per Subidentity**: 50 requests per minute
- **Per DAO**: 500 requests per minute

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
