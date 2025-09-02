# DAO/Communities (Governance) Module

Decentralized Autonomous Organization governance module for the Q ecosystem. Provides comprehensive governance capabilities including proposal creation, voting, reputation-based governance, and community rule enforcement.

## Features

- **Decentralized Governance**: Create and manage DAOs with customizable governance rules
- **Proposal System**: Create, vote on, and execute governance proposals
- **Reputation-Based Voting**: Vote weighting based on reputation and token holdings
- **Identity Integration**: sQuid identity verification for all governance actions
- **Permission Management**: Qonsent integration for granular access control
- **Audit Logging**: Complete audit trail via Qerberos integration
- **Multi-Chain Support**: Support for various blockchain networks via Qwallet

## Run Modes

### Standalone Mode
```bash
# Development with mocks
npm run dev

# Docker deployment
docker compose up
```

### Integrated Mode
```bash
# With real ecosystem services
npm run start:integrated
```

## API Endpoints

### HTTP API
- `GET /api/v1/daos` - List all DAOs
- `GET /api/v1/daos/:id` - Get DAO details
- `POST /api/v1/daos/:id/join` - Join a DAO
- `GET /api/v1/daos/:id/proposals` - List proposals
- `POST /api/v1/daos/:id/proposals` - Create proposal
- `POST /api/v1/daos/:id/proposals/:proposalId/vote` - Vote on proposal
- `POST /api/v1/daos/:id/proposals/:proposalId/execute` - Execute proposal
- `GET /api/v1/daos/:id/results` - Get voting results

### MCP Tools
- `dao.vote` - Cast a vote on a proposal
- `dao.propose` - Create a new proposal
- `dao.execute` - Execute an approved proposal

## Events Published

- `q.dao.created.v1` - DAO created
- `q.dao.member.joined.v1` - Member joined DAO
- `q.dao.proposal.created.v1` - Proposal created
- `q.dao.vote.cast.v1` - Vote cast
- `q.dao.proposal.executed.v1` - Proposal executed
- `q.dao.rule.changed.v1` - Governance rule changed

## Environment Variables

```bash
# Service Configuration
DAO_PORT=3014
DAO_HOST=0.0.0.0

# Integration URLs (for integrated mode)
SQUID_SERVICE_URL=http://localhost:3001
QONSENT_SERVICE_URL=http://localhost:3002
QLOCK_SERVICE_URL=http://localhost:3003
QINDEX_SERVICE_URL=http://localhost:3004
QERBEROS_SERVICE_URL=http://localhost:3005
QWALLET_SERVICE_URL=http://localhost:3006

# Mock Mode (for standalone)
USE_MOCKS=true

# Database
DAO_DB_PATH=./storage/dao.db

# Security
JWT_SECRET=your-jwt-secret
SIGNATURE_VERIFICATION=true
```

## Dependencies

### Required Services (Integrated Mode)
- sQuid: Identity verification
- Qonsent: Permission management
- Qlock: Cryptographic signatures
- Qindex: Data indexing
- Qerberos: Audit logging
- Qwallet: Token/payment verification

### Optional Services
- IPFS: Decentralized storage
- Event Bus: Real-time notifications