# Qerberos - Security & Audit Module

Qerberos is the security and audit module of the Q ecosystem, providing active security monitoring, anomaly detection, risk scoring, and immutable audit trails.

## Features

- **Immutable Audit Logging**: Tamper-proof audit trails stored in IPFS
- **ML-based Anomaly Detection**: Pattern-based threat detection and behavioral analysis
- **Risk Scoring**: Dynamic risk assessment for identities and operations
- **Real-time Security Event Processing**: Live security monitoring and alerting
- **Compliance Reporting**: Automated GDPR, SOC2, and custom compliance reports
- **Security Analytics**: Advanced security metrics and threat intelligence

## Run Modes

### Standalone Mode (Development/Demo)

```bash
# Using Docker Compose
docker compose up

# Using npm
npm install
npm run dev
```

In standalone mode, Qerberos operates with:
- Mock external dependencies (sQuid, Qonsent, Qlock, Qindex)
- In-memory storage for development
- Simulated ML models for anomaly detection
- Test data for demonstration

### Integrated Mode (Production)

```bash
# Production deployment
npm run build
npm start

# With environment configuration
NODE_ENV=production npm start
```

In integrated mode, Qerberos connects to:
- Real sQuid service for identity verification
- Real Qonsent service for permission checking
- Real Qlock service for cryptographic operations
- Real Qindex service for data indexing
- External ML services for advanced analytics
- Production IPFS network for audit storage

### Hybrid Mode (Staging)

Configure selective mocking through environment variables:
```bash
MOCK_SQUID=false
MOCK_QONSENT=true
MOCK_QLOCK=false
npm start
```

## API Endpoints

### HTTP API

- `POST /audit` - Log audit events
- `GET /audit/{id}` - Retrieve audit event
- `GET /audit/search` - Search audit events
- `POST /risk-score` - Calculate risk score
- `GET /risk-score/{identity}` - Get identity risk score
- `POST /anomaly/detect` - Detect anomalies
- `GET /anomaly/alerts` - Get active alerts
- `GET /compliance/report` - Generate compliance report
- `GET /health` - Health check endpoint

### MCP Tools

- `qerberos.audit` - Log audit events
- `qerberos.riskScore` - Calculate risk scores
- `qerberos.detectAnomaly` - Detect anomalies
- `qerberos.getAlerts` - Retrieve security alerts
- `qerberos.complianceReport` - Generate compliance reports

## Events Published

- `q.qerberos.audit.logged.v1` - Audit event logged
- `q.qerberos.alert.created.v1` - Security alert created
- `q.qerberos.anomaly.detected.v1` - Anomaly detected
- `q.qerberos.risk.scored.v1` - Risk score calculated
- `q.qerberos.compliance.violation.v1` - Compliance violation detected

## Configuration

### Environment Variables

```bash
# Service Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# External Services (Integrated Mode)
SQUID_API_URL=http://localhost:3001
QONSENT_API_URL=http://localhost:3002
QLOCK_API_URL=http://localhost:3003
QINDEX_API_URL=http://localhost:3004

# Mock Configuration (Hybrid Mode)
MOCK_SQUID=false
MOCK_QONSENT=false
MOCK_QLOCK=false
MOCK_QINDEX=false

# ML/Analytics Configuration
ML_ANOMALY_THRESHOLD=0.8
RISK_SCORE_CACHE_TTL=300
ALERT_RETENTION_DAYS=90

# Compliance Configuration
GDPR_ENABLED=true
SOC2_ENABLED=true
AUDIT_RETENTION_YEARS=7
```

## Development

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- IPFS node (for integrated mode)

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with hot reload
npm run dev

# Build for production
npm run build
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Contract tests
npm run test:contract

# End-to-end tests
npm run test:e2e

# All tests
npm test
```

## Architecture

Qerberos follows a modular architecture with:

- **Handlers**: Pure request handlers for HTTP and MCP interfaces
- **Services**: Business logic for audit, risk scoring, and anomaly detection
- **Storage**: IPFS-based immutable storage for audit trails
- **Analytics**: ML-based analytics engine for threat detection
- **Compliance**: Automated compliance monitoring and reporting

## Security

- All audit events are cryptographically signed and stored immutably
- Risk scores are calculated using multiple factors and ML models
- Anomaly detection uses behavioral analysis and pattern recognition
- Access to audit data requires proper authentication and authorization
- Compliance reports include cryptographic proofs of data integrity

## License

This module is part of the Q ecosystem and follows the project's licensing terms.