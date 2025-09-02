# Qmask - Privacy & Anonymization Module

Qmask provides comprehensive privacy protection and data anonymization capabilities for the Q ecosystem. It implements privacy profiles, anonymization algorithms, re-identification prevention, and GDPR compliance tools.

## Features

- **Privacy Profile Management**: Create and manage reusable privacy profiles with customizable masking rules
- **Anonymization Algorithms**: Multiple strategies including redaction, hashing, encryption, and removal
- **Re-identification Prevention**: Risk assessment and mitigation to prevent data re-identification
- **GDPR Compliance**: Automated compliance tools and data subject rights automation
- **Privacy Impact Assessment**: Comprehensive PIA tools for data processing operations
- **Policy Enforcement**: Automated privacy policy enforcement and monitoring

## Run Modes

### Standalone Mode (Development/Demo)
```bash
# Using Docker Compose
docker-compose up

# Using npm
npm run dev
```

### Integrated Mode (Production)
```bash
# With real dependencies
npm run start:integrated
```

## API Endpoints

### HTTP API
- `POST /api/v1/mask/apply` - Apply privacy masking to data
- `GET/POST/PUT/DELETE /api/v1/profiles` - Manage privacy profiles
- `POST /api/v1/assess` - Perform privacy impact assessment
- `POST /api/v1/compliance/dsr` - Handle data subject requests
- `GET /api/v1/health` - Health check endpoint

### MCP Tools
- `qmask.apply` - Apply privacy masking using profiles
- `qmask.profile` - Manage privacy profiles
- `qmask.assess` - Perform privacy impact assessments

## Privacy Profiles

Privacy profiles define how data should be anonymized:

```json
{
  "name": "gdpr-basic",
  "version": "1.0.0",
  "rules": [
    {
      "field": "email",
      "strategy": "HASH",
      "params": { "algorithm": "sha256", "salt": "random" }
    },
    {
      "field": "name",
      "strategy": "REDACT",
      "params": { "replacement": "[REDACTED]" }
    },
    {
      "field": "ssn",
      "strategy": "REMOVE"
    }
  ],
  "defaults": {
    "redactedValue": "[REDACTED]"
  }
}
```

## Masking Strategies

- **REDACT**: Replace with placeholder text
- **HASH**: One-way cryptographic hash
- **ENCRYPT**: Reversible encryption (requires key)
- **ANONYMIZE**: Statistical anonymization
- **REMOVE**: Complete field removal

## Environment Variables

```bash
# Server Configuration
PORT=3007
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/qmask
REDIS_URL=redis://localhost:6379

# External Services (Integrated Mode)
SQUID_URL=http://localhost:3001
QONSENT_URL=http://localhost:3003
QERBEROS_URL=http://localhost:3006

# Privacy Configuration
DEFAULT_RISK_THRESHOLD=0.7
ANONYMIZATION_STRENGTH=high
GDPR_MODE=enabled
```

## Dependencies

### Transversal Compliance
- **sQuid**: Identity verification for all operations
- **Qonsent**: Permission checking for profile access
- **Qerberos**: Audit logging for privacy operations
- **Qindex**: Profile and assessment indexing

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Compliance Features

### GDPR Support
- Data subject access requests (DSAR)
- Right to erasure implementation
- Data portability tools
- Consent management integration
- Breach notification automation

### Privacy Impact Assessment
- Automated risk scoring
- Compliance requirement mapping
- Mitigation recommendations
- Audit trail generation

## Security

- All operations require sQuid identity verification
- Profile access controlled via Qonsent permissions
- Cryptographic operations use secure random generation
- Audit logging for all privacy operations
- Rate limiting and abuse protection