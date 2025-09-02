# Qdrive - File Storage Module

Qdrive is a decentralized file storage module that provides secure, encrypted file storage with IPFS integration, ownership validation, access control, and automated data retention policies.

## Features

- **Secure Storage**: Files encrypted by default using Qlock
- **IPFS Integration**: Content-addressable storage with CID-based access
- **Identity Validation**: File ownership through sQuid integration
- **Access Control**: Granular permissions via Qonsent
- **Data Retention**: Automated GDPR-compliant data lifecycle management
- **Audit Logging**: Complete audit trail via Qerberos
- **Indexing**: File discovery through Qindex integration
- **Payment Integration**: Premium storage features via Qwallet

## Run Modes

### Standalone Mode (Development/Testing)
```bash
# Using Docker Compose
docker compose up

# Using npm
npm run dev
```

In standalone mode, Qdrive runs with mock services for all external dependencies.

### Integrated Mode (Production)
```bash
# Set environment variables for real services
export SQUID_API_URL=http://squid:3000
export QONSENT_API_URL=http://qonsent:3000
export QLOCK_API_URL=http://qlock:3000
export QINDEX_API_URL=http://qindex:3000
export QERBEROS_API_URL=http://qerberos:3000
export QWALLET_API_URL=http://qwallet:3000

npm start
```

## API Endpoints

### HTTP API
- `POST /files` - Upload file
- `GET /files/:cid` - Download file
- `GET /files/:cid/metadata` - Get file metadata
- `PUT /files/:cid/metadata` - Update file metadata
- `DELETE /files/:cid` - Delete file
- `GET /files` - List user files
- `POST /files/:cid/share` - Share file
- `GET /storage/summary` - Get storage summary

### MCP Tools
- `qdrive.put` - Upload file with metadata
- `qdrive.get` - Retrieve file by CID
- `qdrive.metadata` - Get/update file metadata
- `qdrive.list` - List files with filters
- `qdrive.share` - Create sharing link
- `qdrive.delete` - Delete file

## Events Published
- `q.qdrive.file.created.v1` - File uploaded
- `q.qdrive.file.accessed.v1` - File downloaded
- `q.qdrive.file.shared.v1` - File shared
- `q.qdrive.file.deleted.v1` - File deleted
- `q.qdrive.retention.applied.v1` - Retention policy applied

## Configuration

### Environment Variables
- `QDRIVE_PORT` - HTTP server port (default: 3008)
- `QDRIVE_STORAGE_PATH` - Local storage path for development
- `IPFS_API_URL` - IPFS node API URL
- `IPFS_GATEWAY_URL` - IPFS gateway URL
- `MAX_FILE_SIZE` - Maximum file size in bytes
- `DEFAULT_RETENTION_DAYS` - Default retention period

### Storage Configuration
- **Free Tier**: 1GB storage, 10GB bandwidth
- **Basic Plan**: 10GB storage, 50GB bandwidth
- **Premium Plan**: 100GB storage, 200GB bandwidth
- **Enterprise Plan**: 1TB storage, 1TB bandwidth

## Security

- All files encrypted at rest using Qlock
- Identity verification required for all operations
- Granular access control via Qonsent policies
- Audit logging for all file operations
- Rate limiting and abuse protection

## Compliance

- GDPR-compliant data retention policies
- Automated data subject request processing
- Data lineage tracking
- Privacy impact assessments
- Secure deletion with cryptographic proof