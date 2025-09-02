# Qonsent Module - Policies & Permissions

Qonsent is a core module in the Q ecosystem responsible for granular authorization through UCAN/policies with deny-by-default security. It provides programmable privacy, modular permissions, DAO policies, delegation rules, and dynamic access control.

## Features

- **UCAN Policy Engine**: Standards-based authorization with capability tokens
- **Deny-by-Default Authorization**: Secure by default with explicit permission grants
- **Granular Scope Validation**: Fine-grained permission checking
- **Real-time Permission Revocation**: Instant permission updates across the ecosystem
- **Event Publishing**: Real-time notifications of permission changes
- **Policy Compliance Validation**: Automated compliance checking
- **Audit Integration**: Comprehensive logging with Qerberos integration

## Run Modes

### Standalone Mode
```bash
# Development with mocks
npm run dev

# Docker standalone
docker compose up
```

### Integrated Mode
```bash
# With real dependencies
npm run start:integrated
```

## API Interfaces

### HTTP API
- OpenAPI specification: `openapi.yaml`
- Base URL: `/api/v1/qonsent`

### MCP Tools
- `qonsent.check` - Check permissions for a resource
- `qonsent.grant` - Grant permissions to an identity
- `qonsent.revoke` - Revoke permissions from an identity

### Events Published
- `q.qonsent.grant.issued.v1` - Permission granted
- `q.qonsent.revoked.v1` - Permission revoked
- `q.qonsent.policy.updated.v1` - Policy updated

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | HTTP port | `3003` |
| `MONGODB_URI` | Database connection | `mongodb://localhost:27017/qonsent` |
| `SQUID_API_URL` | sQuid identity service | `http://localhost:3001` |
| `QERBEROS_API_URL` | Qerberos audit service | `http://localhost:3006` |
| `EVENT_BUS_URL` | Event bus connection | `redis://localhost:6379` |

## Quick Start

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Integration Examples

### Check Permission
```typescript
const hasAccess = await qonsent.check({
  resource: 'qdrive:file:abc123',
  identity: 'did:squid:alice',
  action: 'read'
});
```

### Grant Permission
```typescript
await qonsent.grant({
  resource: 'qmarket:listing:xyz789',
  identity: 'did:squid:bob',
  permissions: ['read', 'purchase'],
  expiresAt: new Date(Date.now() + 86400000) // 24 hours
});
```

### Revoke Permission
```typescript
await qonsent.revoke({
  resource: 'qdrive:file:abc123',
  identity: 'did:squid:charlie'
});
```