# Qindex - Indexing & Pointers Module

Qindex provides lightweight indexing, mutable pointers, append-only history tracking, and simple query capabilities for the Q ecosystem.

## Features

- **Standalone Operation**: Runs independently with mock services for development
- **Append-only History**: Immutable history tracking with CRDT conflict resolution
- **Mutable Pointers**: Key-based pointers with version management
- **Query Engine**: Performance-optimized search and retrieval
- **IPFS Integration**: Content-addressable storage with pinning policies
- **Data Retention**: Automated lifecycle management and GDPR compliance

## Run Modes

### Standalone Mode (Development)
```bash
# Start with mocks
docker compose up
# or
npm run dev
```

### Integrated Mode (Production)
```bash
# With real ecosystem services
npm run start:production
```

## API Endpoints

### HTTP API
- `POST /qindex/put` - Store indexed record
- `GET /qindex/get/:key` - Retrieve record by key
- `GET /qindex/list` - List records with filtering
- `GET /qindex/history/:key` - Get record history
- `DELETE /qindex/delete/:key` - Remove record

### MCP Tools
- `qindex.put` - Store indexed record
- `qindex.get` - Retrieve record by key
- `qindex.list` - List records with filtering

## Events Published
- `q.qindex.record.created.v1` - New record created
- `q.qindex.record.updated.v1` - Record updated
- `q.qindex.record.deleted.v1` - Record deleted
- `q.qindex.pointer.moved.v1` - Pointer updated

## Integration

Qindex integrates with:
- **sQuid**: Identity verification for record ownership
- **Qonsent**: Permission checking for access control
- **Qlock**: Encryption for sensitive records
- **Qerberos**: Audit logging for all operations
- **IPFS**: Content storage and retrieval

## Configuration

Environment variables:
- `QINDEX_MODE`: `standalone` or `integrated`
- `QINDEX_STORAGE_PATH`: Local storage path for standalone mode
- `IPFS_ENDPOINT`: IPFS node endpoint
- `RETENTION_POLICY`: Data retention configuration

## Development

```bash
npm install
npm test
npm run dev
```

## Architecture

Qindex follows the Q∞ modular architecture with:
- Pure handlers for serverless deployment
- Standardized contracts and schemas
- Event-driven communication
- Comprehensive observability