# Qerberos Security & Audit API - API Reference

Qerberos provides security monitoring, audit logging, anomaly detection, and risk scoring
for the Q ecosystem. It offers immutable audit trails, ML-based threat detection,
and automated compliance reporting.


**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qerberos`
- Production: `https://api.q.network/qerberos`

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


### GET /health

**Health check**

Returns the health status of the Qerberos service

#### Responses

**200**: Service is healthy

Schema: HealthResponse


### POST /audit

**Log audit event**

Creates an immutable audit log entry

#### Request Body

Content-Type: application/json

Schema: AuditEventRequest

#### Responses

**201**: Audit event logged successfully

Schema: AuditEventResponse

**400**: Invalid request

Schema: ErrorResponse

**401**: Unauthorized

Schema: ErrorResponse


### GET /audit

**Search audit events**

Search and filter audit events

#### Parameters

- **type** (query): Event type filter
  - Type: string
- **actor** (query): Actor identity filter
  - Type: string
- **startDate** (query): Start date filter (ISO 8601)
  - Type: string
- **endDate** (query): End date filter (ISO 8601)
  - Type: string
- **limit** (query): Maximum number of results
  - Type: integer
- **offset** (query): Number of results to skip
  - Type: integer

#### Responses

**200**: Audit events retrieved successfully

Schema: AuditEventSearchResponse


### GET /audit/{id}

**Get audit event**

Retrieve a specific audit event by ID

#### Parameters

- **id** (path): Audit event ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Audit event retrieved successfully

Schema: AuditEvent

**404**: Audit event not found

Schema: ErrorResponse


### POST /risk-score

**Calculate risk score**

Calculate risk score for an identity or operation

#### Request Body

Content-Type: application/json

Schema: RiskScoreRequest

#### Responses

**200**: Risk score calculated successfully

Schema: RiskScoreResponse


### GET /risk-score/{identity}

**Get identity risk score**

Get the current risk score for an identity

#### Parameters

- **identity** (path): Identity ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Risk score retrieved successfully

Schema: RiskScoreResponse


### POST /anomaly/detect

**Detect anomalies**

Analyze data for anomalies and security threats

#### Request Body

Content-Type: application/json

Schema: AnomalyDetectionRequest

#### Responses

**200**: Anomaly detection completed

Schema: AnomalyDetectionResponse


### GET /anomaly/alerts

**Get security alerts**

Retrieve active security alerts and anomalies

#### Parameters

- **severity** (query): Alert severity filter
  - Type: string
  - Values: low, medium, high, critical
- **status** (query): Alert status filter
  - Type: string
  - Values: active, resolved, dismissed
- **limit** (query): Maximum number of results
  - Type: integer

#### Responses

**200**: Security alerts retrieved successfully

Schema: SecurityAlertsResponse


### GET /compliance/report

**Generate compliance report**

Generate automated compliance report (GDPR, SOC2, etc.)

#### Parameters

- **type** (query): Report type
  - Type: string
  - Values: gdpr, soc2, custom
- **startDate** (query): Report start date (ISO 8601)
  - Type: string
- **endDate** (query): Report end date (ISO 8601)
  - Type: string
- **format** (query): Report format
  - Type: string
  - Values: json, pdf, csv

#### Responses

**200**: Compliance report generated successfully

Schema: ComplianceReportResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 
- **timestamp** (string): 


### AuditEventRequest

#### Properties

- **type** (string): Event type
  - Required: Yes
- **ref** (string): Reference to the resource or operation
  - Required: Yes
- **actor** (any): 
  - Required: Yes
- **layer** (string): Layer or service that generated the event
  - Required: Yes
- **verdict** (string): 
  - Required: Yes
  - Values: ALLOW, DENY, WARN
- **details** (object): Additional event details
- **cid** (string): IPFS CID if applicable


### AuditEventResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### AuditEvent

#### Properties

- **id** (string): 
- **type** (string): 
- **ref** (string): 
- **actor** (any): 
- **layer** (string): 
- **verdict** (string): 
  - Values: ALLOW, DENY, WARN
- **details** (object): 
- **cid** (string): 
- **timestamp** (string): 
- **signature** (string): 


### AuditEventSearchResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### RiskScoreRequest

#### Properties

- **identity** (string): 
  - Required: Yes
- **operation** (string): 
- **context** (object): 
- **factors** (array): 


### RiskScoreResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### AnomalyDetectionRequest

#### Properties

- **data** (object): Data to analyze for anomalies
  - Required: Yes
- **model** (string): ML model to use for detection
- **threshold** (number): Anomaly threshold


### AnomalyDetectionResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SecurityAlertsResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ComplianceReportResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### IdentityRef

#### Properties

- **squidId** (string): 
  - Required: Yes
- **subId** (string): 
- **daoId** (string): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Values: error
- **code** (string): 
- **message** (string): 
- **details** (object): 
- **timestamp** (string): 
- **requestId** (string): 
- **retryable** (boolean): 
- **suggestedActions** (array): 



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
