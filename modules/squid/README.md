# sQuid - Identity & Subidentities Module

sQuid is the core identity management module for the Q ecosystem, providing decentralized identity creation, verification, and management capabilities.

## Features

- Root identity creation and management
- Subidentity creation with hierarchical relationships
- Identity verification and KYC processes
- Reputation tracking and management
- DAO association management
- Event-driven architecture with standardized events

## Run Modes

### Standalone Mode
```bash
# Development with mock services
npm run dev

# Docker deployment
docker-compose up
```

### Integrated Mode
```bash
# With real ecosystem services
npm run start:integrated
```

## API Endpoints

### HTTP API
- `POST /identity` - Create new root identity
- `POST /identity/:id/subidentity` - Create subidentity
- `GET /identity/:id` - Get identity information
- `PUT /identity/:id/verify` - Submit verification
- `GET /identity/:id/reputation` - Get reputation score

### MCP Tools
- `squid.verifyIdentity` - Verify identity ownership
- `squid.activeContext` - Get active identity context

## Events Published

- `q.squid.created.v1` - Identity created
- `q.squid.sub.created.v1` - Subidentity created
- `q.squid.reputation.updated.v1` - Reputation updated
- `q.squid.verified.v1` - Identity verified

## Environment Variables

```bash
# Service Configuration
SQUID_PORT=3001
SQUID_HOST=localhost

# Database
SQUID_DB_URL=mongodb://localhost:27017/squid

# Event Bus
EVENT_BUS_URL=redis://localhost:6379

# Mock Mode
SQUID_MOCK_MODE=true
```

## Integration

sQuid integrates with the following ecosystem modules:
- **Qonsent**: Permission management for identity operations
- **Qlock**: Cryptographic operations and key management
- **Qindex**: Identity indexing and discovery
- **Qerberos**: Security auditing and monitoring
- **Qwallet**: Payment processing for premium features

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Build
npm run build
```