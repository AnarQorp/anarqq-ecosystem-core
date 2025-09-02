# Qerberos API Documentation

## Overview
Qerberos provides security monitoring, audit logging, anomaly detection, and risk scoring
for the Q ecosystem. It offers immutable audit trails, ML-based threat detection,
and automated compliance reporting.


## Base URL
`http://localhost:3000`

## Authentication
- **BearerAuth**: bearer authentication

## Endpoints

### GET /health
Health check

**Operation ID:** `getHealth`





**Responses:**
- **200**: Service is healthy


### POST /audit
Log audit event

**Operation ID:** `logAuditEvent`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/AuditEventRequest"
}
```

**Responses:**
- **201**: Audit event logged successfully
- **400**: Invalid request
- **401**: Unauthorized


### GET /audit
Search audit events

**Operation ID:** `searchAuditEvents`

**Parameters:**
- `type` (query): Event type filter
- `actor` (query): Actor identity filter
- `startDate` (query): Start date filter (ISO 8601)
- `endDate` (query): End date filter (ISO 8601)
- `limit` (query): Maximum number of results
- `offset` (query): Number of results to skip



**Responses:**
- **200**: Audit events retrieved successfully


### GET /audit/{id}
Get audit event

**Operation ID:** `getAuditEvent`

**Parameters:**
- `id` (path): Audit event ID



**Responses:**
- **200**: Audit event retrieved successfully
- **404**: Audit event not found


### POST /risk-score
Calculate risk score

**Operation ID:** `calculateRiskScore`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/RiskScoreRequest"
}
```

**Responses:**
- **200**: Risk score calculated successfully


### GET /risk-score/{identity}
Get identity risk score

**Operation ID:** `getIdentityRiskScore`

**Parameters:**
- `identity` (path): Identity ID



**Responses:**
- **200**: Risk score retrieved successfully


### POST /anomaly/detect
Detect anomalies

**Operation ID:** `detectAnomalies`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/AnomalyDetectionRequest"
}
```

**Responses:**
- **200**: Anomaly detection completed


### GET /anomaly/alerts
Get security alerts

**Operation ID:** `getSecurityAlerts`

**Parameters:**
- `severity` (query): Alert severity filter
- `status` (query): Alert status filter
- `limit` (query): Maximum number of results



**Responses:**
- **200**: Security alerts retrieved successfully


### GET /compliance/report
Generate compliance report

**Operation ID:** `generateComplianceReport`

**Parameters:**
- `type` (query): Report type
- `startDate` (query): Report start date (ISO 8601)
- `endDate` (query): Report end date (ISO 8601)
- `format` (query): Report format



**Responses:**
- **200**: Compliance report generated successfully


## Error Codes
- **400**: Invalid request
- **401**: Unauthorized
- **404**: Audit event not found

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check

```bash
curl -X GET \
  "http://localhost:3000/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Log audit event

```bash
curl -X POST \
  "http://localhost:3000/audit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Get audit event

```bash
curl -X GET \
  "http://localhost:3000/audit/{id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

