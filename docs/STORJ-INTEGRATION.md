# Storj Integration for Qsocial File Storage

## Overview

This document describes the implementation of Storj-based file storage for Qsocial, including S3-compatible API usage, IPFS CID generation, and Filecoin preparation.

## Architecture

### Components

1. **StorjStorageService** (`backend/services/StorjStorageService.mjs`)
   - Main service for Storj operations
   - S3-compatible API client
   - IPFS CID generation
   - Filecoin preparation

2. **File Upload API** (`backend/routes/qsocial-files.mjs`)
   - REST endpoints for file operations
   - Authentication and rate limiting
   - File validation and processing

3. **Frontend Service** (`src/api/qsocial-files.ts`)
   - TypeScript API client
   - File upload utilities
   - Type definitions

4. **React Component** (`src/components/qsocial/FileUpload.tsx`)
   - Drag-and-drop file upload
   - Progress tracking
   - IPFS/Filecoin information display

## Configuration

### Environment Variables

```bash
# Storj Configuration
STORJ_ACCESS_KEY_ID=your_storj_access_key_id
STORJ_SECRET_ACCESS_KEY=your_storj_secret_access_key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_BUCKET=qsocial-files
STORJ_REGION=us-east-1

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_API_PATH=/api/v0
```

### Storj Setup

1. **Create Storj Account**
   - Sign up at [storj.io](https://storj.io)
   - Create a new project
   - Generate S3-compatible credentials

2. **Create Bucket**
   ```bash
   # Using Storj CLI
   uplink mb sj://qsocial-files
   ```

3. **Generate Access Keys**
   ```bash
   # Generate S3-compatible credentials
   uplink share --url --not-after=none sj://qsocial-files
   ```

### IPFS Setup

1. **Install IPFS**
   ```bash
   # Using official installer
   curl -sSL https://dist.ipfs.io/go-ipfs/v0.17.0/go-ipfs_v0.17.0_linux-amd64.tar.gz | tar -xz
   sudo mv go-ipfs/ipfs /usr/local/bin/
   ```

2. **Initialize and Start IPFS**
   ```bash
   ipfs init
   ipfs daemon
   ```

3. **Configure CORS (for web access)**
   ```bash
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
   ```

## API Endpoints

### File Upload

#### Single File Upload
```http
POST /api/qsocial/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <file_data>
```

**Response:**
```json
{
  "success": true,
  "message": "Archivo subido exitosamente",
  "file": {
    "fileId": "abc123...",
    "originalName": "image.jpg",
    "storjUrl": "https://gateway.storjshare.io/qsocial-files/user123/1234567890_abc123.jpg",
    "storjKey": "qsocial/user123/1234567890_abc123.jpg",
    "ipfsCid": "bafybeig...",
    "filecoinCid": "bafybeig...",
    "fileSize": 1024000,
    "contentType": "image/jpeg",
    "thumbnailUrl": "https://gateway.storjshare.io/qsocial-files/user123/1234567890_abc123_thumbnail.jpg",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Multiple File Upload
```http
POST /api/qsocial/files/upload-multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

files: <file_data_1>
files: <file_data_2>
```

### File Download

```http
GET /api/qsocial/files/:fileId/download
Authorization: Bearer <token>
```

### File Metadata

```http
GET /api/qsocial/files/:fileId/metadata
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "fileId": "abc123...",
    "storjKey": "qsocial/user123/1234567890_abc123.jpg",
    "contentType": "image/jpeg",
    "contentLength": 1024000,
    "lastModified": "2024-01-15T10:30:00Z",
    "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
    "originalName": "image.jpg",
    "uploadedBy": "user123",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Signed URL Generation

```http
POST /api/qsocial/files/:fileId/signed-url
Content-Type: application/json
Authorization: Bearer <token>

{
  "expiresIn": 3600
}
```

### IPFS Information

```http
GET /api/qsocial/files/:fileId/ipfs
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "ipfs": {
    "fileId": "abc123...",
    "cid": "bafybeig...",
    "gatewayUrls": [
      "https://ipfs.io/ipfs/bafybeig...",
      "https://gateway.pinata.cloud/ipfs/bafybeig...",
      "https://cloudflare-ipfs.com/ipfs/bafybeig..."
    ],
    "filecoinStatus": "prepared",
    "filecoinCid": "bafybeig..."
  }
}
```

## IPFS CID Generation

### Process

1. **File Upload to Storj**
   - File is uploaded to Storj using S3-compatible API
   - Metadata is stored with the file

2. **IPFS CID Generation**
   - File content is processed by IPFS node
   - CID is generated using `onlyHash: true` (no storage)
   - CID version 1 with SHA2-256 hash algorithm

3. **CID Storage**
   - IPFS CID is stored in file metadata
   - Can be used for content verification
   - Enables future IPFS network access

### Code Example

```javascript
// Generate IPFS CID without storing
async generateIPFSCid(fileBuffer) {
  const result = await this.ipfs.add(fileBuffer, {
    onlyHash: true,     // Only generate CID, don't store
    cidVersion: 1,      // Use CID v1
    hashAlg: 'sha2-256' // SHA2-256 hash algorithm
  });
  
  return result.cid.toString();
}
```

## Filecoin Preparation

### Current Implementation

The current implementation prepares files for Filecoin storage by:

1. **IPFS CID Generation** - Required for Filecoin deals
2. **Metadata Storage** - Deal information stored in cache
3. **Status Tracking** - Deal status monitoring

### Future Filecoin Integration

For production Filecoin integration:

1. **IPFS Pinning**
   ```javascript
   // Pin file to IPFS node
   await this.ipfs.pin.add(cid);
   ```

2. **Filecoin Deal Creation**
   ```javascript
   // Create storage deal with Filecoin miner
   const deal = await filecoinClient.createDeal({
     cid: ipfsCid,
     miner: minerAddress,
     price: dealPrice,
     duration: dealDuration
   });
   ```

3. **Deal Monitoring**
   ```javascript
   // Monitor deal status
   const status = await filecoinClient.getDealStatus(dealId);
   ```

## File Storage Strategy

### Storage Hierarchy

1. **Primary Storage: Storj**
   - S3-compatible distributed storage
   - High availability and durability
   - Cost-effective for frequent access

2. **Content Addressing: IPFS**
   - Content-based addressing
   - Deduplication capabilities
   - Decentralized access

3. **Long-term Archive: Filecoin**
   - Blockchain-verified storage
   - Long-term preservation
   - Economic incentives

### File Organization

```
qsocial/
├── user123/
│   ├── 1234567890_abc123.jpg
│   ├── 1234567890_abc123_thumbnail.jpg
│   └── 1234567891_def456.pdf
└── user456/
    ├── 1234567892_ghi789.mp4
    └── 1234567893_jkl012.png
```

## Security Considerations

### Access Control

1. **Authentication Required**
   - All endpoints require valid JWT token
   - User identity verified via sQuid system

2. **File Ownership**
   - Users can only access their own files
   - File paths include user ID for isolation

3. **Rate Limiting**
   - Upload rate limiting: 20 uploads per 15 minutes
   - Download rate limiting: 100 downloads per minute

### File Validation

1. **File Type Restrictions**
   ```javascript
   const allowedTypes = [
     'image/jpeg', 'image/png', 'image/gif', 'image/webp',
     'video/mp4', 'video/webm',
     'audio/mpeg', 'audio/wav',
     'application/pdf', 'text/plain'
   ];
   ```

2. **File Size Limits**
   - Maximum file size: 50MB
   - Maximum files per request: 5

3. **Content Scanning**
   - File content validation
   - Malware scanning (future enhancement)

## Performance Optimization

### Caching Strategy

1. **File Metadata Caching**
   - Redis cache for frequently accessed metadata
   - TTL-based cache invalidation

2. **Thumbnail Generation**
   - Automatic thumbnail creation for images
   - Cached thumbnail URLs

3. **CDN Integration**
   - Storj gateway acts as CDN
   - Global content distribution

### Upload Optimization

1. **Multipart Uploads**
   - Large files split into chunks
   - Parallel upload processing

2. **Progress Tracking**
   - Real-time upload progress
   - Error handling and retry logic

## Monitoring and Analytics

### Health Checks

```http
GET /api/qsocial/files/health
```

**Response:**
```json
{
  "success": true,
  "health": {
    "storj": true,
    "ipfs": true,
    "bucket": true,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "message": "Servicio saludable"
}
```

### Metrics Tracking

1. **Upload Metrics**
   - Upload success/failure rates
   - File size distribution
   - Content type statistics

2. **Storage Metrics**
   - Total storage usage
   - IPFS CID generation rate
   - Filecoin preparation status

3. **Performance Metrics**
   - Upload/download latency
   - Throughput measurements
   - Error rates

## Error Handling

### Common Errors

1. **File Too Large**
   ```json
   {
     "success": false,
     "error": "Archivo demasiado grande. Máximo 50MB."
   }
   ```

2. **Unsupported File Type**
   ```json
   {
     "success": false,
     "error": "Tipo de archivo no permitido: application/exe"
   }
   ```

3. **Storage Service Unavailable**
   ```json
   {
     "success": false,
     "error": "Servicio de almacenamiento temporalmente no disponible"
   }
   ```

### Retry Logic

1. **Exponential Backoff**
   - Automatic retry for transient failures
   - Increasing delay between retries

2. **Circuit Breaker**
   - Fail fast when service is down
   - Automatic recovery detection

## Usage Examples

### Frontend Integration

```typescript
import { uploadFile, getFileIPFSInfo } from '../api/qsocial-files';

// Upload file
const handleFileUpload = async (file: File) => {
  const result = await uploadFile(file);
  
  if (result.success) {
    console.log('File uploaded:', result.file);
    console.log('IPFS CID:', result.file?.ipfsCid);
  } else {
    console.error('Upload failed:', result.error);
  }
};

// Get IPFS information
const getIPFSInfo = async (fileId: string) => {
  const info = await getFileIPFSInfo(fileId);
  
  if (info.success) {
    console.log('IPFS CID:', info.ipfs?.cid);
    console.log('Gateway URLs:', info.ipfs?.gatewayUrls);
  }
};
```

### React Component Usage

```tsx
import FileUpload from '../components/qsocial/FileUpload';

const MyComponent = () => {
  const handleUploadComplete = (files) => {
    console.log('Uploaded files:', files);
    // Process uploaded files
  };

  const handleError = (error) => {
    console.error('Upload error:', error);
    // Show error message to user
  };

  return (
    <FileUpload
      onUploadComplete={handleUploadComplete}
      onError={handleError}
      maxFiles={3}
      allowMultiple={true}
      showIPFSInfo={true}
    />
  );
};
```

## Troubleshooting

### Common Issues

1. **IPFS Connection Failed**
   - Check IPFS daemon is running
   - Verify CORS configuration
   - Check firewall settings

2. **Storj Authentication Failed**
   - Verify access key and secret
   - Check bucket permissions
   - Validate endpoint URL

3. **File Upload Timeout**
   - Check network connectivity
   - Verify file size limits
   - Monitor server resources

### Debug Commands

```bash
# Test IPFS connection
curl http://localhost:5001/api/v0/id

# Test Storj connection
aws s3 ls s3://qsocial-files --endpoint-url=https://gateway.storjshare.io

# Check file upload logs
tail -f backend/logs/upload.log
```

## Future Enhancements

1. **Advanced Filecoin Integration**
   - Automated deal creation
   - Deal status monitoring
   - Cost optimization

2. **Content Deduplication**
   - IPFS-based deduplication
   - Storage cost reduction

3. **Advanced Security**
   - End-to-end encryption
   - Content scanning
   - Access control lists

4. **Performance Improvements**
   - CDN integration
   - Edge caching
   - Compression optimization

## Conclusion

The Storj integration provides a robust, scalable file storage solution for Qsocial with built-in IPFS CID generation and Filecoin preparation. The implementation follows best practices for security, performance, and maintainability while providing a foundation for future enhancements.