# IPFS Service Integration

This document provides information about the IPFS service integration in the AnarQ Nexus Core backend.

## Configuration

### Environment Variables

Update your `.env` file with the following variables:

```bash
# IPFS Configuration
IPFS_API_URL=/ip4/127.0.0.1/tcp/5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs
IPFS_REPO_PATH=./ipfs-repo

# Storacha Configuration
STORACHA_API_KEY=your_storacha_api_key_here
STORACHA_API_URL=https://api.storacha.ai
```

### Dependencies

Install the required dependencies:

```bash
npm install @storacha/ipfs @storacha/client uuid mime-types
```

## API Endpoints

### Spaces

- `POST /api/ipfs/spaces` - Create or get user's personal space
- `GET /api/ipfs/spaces/me` - Get user's personal space info
- `POST /api/ipfs/spaces/:spaceId/authorize` - Authorize a user for a space

### Files

- `POST /api/ipfs/upload` - Upload a file to IPFS
- `GET /api/ipfs/download/:cid` - Download a file from IPFS
- `GET /api/ipfs/files/:cid/info` - Get file information
- `DELETE /api/ipfs/files/:cid` - Delete a file (unpin)
- `GET /api/ipfs/files` - List files in a space

### Status

- `GET /api/ipfs/status` - Get IPFS node status

## Testing

To test the IPFS service, run:

```bash
node scripts/test-ipfs.mjs
```

## Error Handling

The IPFS service includes comprehensive error handling with appropriate HTTP status codes and error messages. Common error codes include:

- `400` - Bad Request: Invalid input data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `500` - Internal Server Error: Something went wrong

## Security Considerations

- All file uploads are validated for allowed MIME types
- User authentication is required for all endpoints
- Space-level authorization ensures users can only access their own files
- File metadata is stored securely and can include access control information
