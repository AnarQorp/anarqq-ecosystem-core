# IPFS Integration

This document provides an overview of the IPFS integration in the AnarQ Nexus Core project.

## Overview

The IPFS integration provides a unified interface for interacting with the InterPlanetary File System (IPFS) through a backend service. It includes features for file upload/download, metadata management, and space management.

## Key Components

### 1. IPFS Service (`src/api/ipfsService.ts`)

The main service that provides methods for interacting with the IPFS backend:

- `uploadFile(file, options)`: Upload a file to IPFS
- `downloadFile(cid, options)`: Download a file from IPFS
- `getFileInfo(cid, spaceDID)`: Get information about a file
- `createSpace(alias)`: Create a new IPFS space
- `authorizeSpace(spaceDID, agentDID, delegation)`: Authorize an agent for a space
- `updateFileMetadata(cid, metadata, spaceDID)`: Update file metadata
- `deleteFile(cid, spaceDID)`: Delete a file from IPFS

### 2. React Hook (`src/hooks/useIPFS.ts`)

A React hook that provides a simple interface for IPFS operations with state management:

```typescript
const {
  uploadFile,
  downloadFile,
  getFileInfo,
  createSpace,
  authorizeSpace,
  loading,
  error,
  progress
} = useIPFS();
```

### 3. Backend Service (`backend/services/ipfsService.mjs`)

The backend service that handles IPFS operations using `@web3-storage/w3up-client`.

## Authentication

All IPFS API requests are authenticated using a Bearer token obtained from the authentication system.

## Error Handling

All methods throw errors that can be caught and handled by the calling code. Error messages are designed to be user-friendly when displayed in the UI.

## Testing

Tests are located in `src/api/__tests__/ipfsService.test.ts` and can be run with:

```bash
npm test ipfsService
```

## Environment Variables

The following environment variables are used:

- `VITE_API_BASE_URL`: Base URL for the API (defaults to '/api')
- `VITE_IPFS_GATEWAY`: IPFS gateway URL (defaults to 'https://ipfs.io/ipfs')

## Best Practices

1. Always handle errors when calling IPFS methods
2. Use the `onProgress` callback for large file uploads
3. Cache file info when possible to reduce API calls
4. Use space-based access control for multi-user applications
5. Consider file size limits and implement appropriate UI feedback

## Limitations

- Large files may require special handling for progress tracking
- Offline support is not implemented in the current version
- Encryption is handled by the backend service and requires proper configuration
