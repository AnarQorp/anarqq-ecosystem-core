# IPFS Integration with Storacha

This document describes the IPFS integration with Storacha in the AnarQ Nexus Core application.

## Overview

The IPFS integration provides decentralized storage capabilities using Storacha (which uses IPFS under the hood) and includes automatic space authorization for secure file storage and retrieval. The integration consists of:

- **Backend Service**: Handles IPFS operations, space management, and authentication
- **Frontend Utilities**: Provide easy-to-use functions for common IPFS operations
- **React Hooks**: Simplify IPFS integration in React components

## Features

- **Space Management**: Create and manage private IPFS spaces
- **File Operations**: Upload, download, and manage files with metadata
- **Access Control**: Fine-grained permissions for space access
- **Automatic Authorization**: Seamless authentication with Storacha
- **Progress Tracking**: Real-time upload/download progress
- **Type Safety**: Full TypeScript support

## Backend Implementation

The backend IPFS service is implemented in `backend/services/ipfsService.mjs` and provides the following features:

- Space management (create, authorize)
- File upload/download with metadata
- File information retrieval
- Automatic delegation and authorization

### API Endpoints

#### Create a Space

```http
POST /api/ipfs/spaces
```

**Request Body:**
```json
{
  "name": "my-space",
  "description": "My private space",
  "isPrivate": true,
  "metadata": {
    "createdBy": "user123",
    "purpose": "personal-storage"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space-123",
    "name": "my-space",
    "description": "My private space",
    "isPrivate": true,
    "metadata": {
      "createdBy": "user123",
      "purpose": "personal-storage",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Get Space Information

```http
GET /api/ipfs/spaces/:spaceId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space-123",
    "name": "my-space",
    "description": "My private space",
    "isPrivate": true,
    "metadata": {
      "createdBy": "user123",
      "purpose": "personal-storage",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Authorize a Space

```http
POST /api/ipfs/spaces/:spaceId/authorize
```

**Request Body:**
```json
{
  "agentDID": "did:agent:user123",
  "permissions": {
    "read": true,
    "write": true,
    "admin": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "spaceId": "space-123",
    "agentDID": "did:agent:user123",
    "permissions": {
      "read": true,
      "write": true,
      "admin": false
    },
    "authorizedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Upload a File

```http
POST /api/ipfs/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The file to upload (required)
- `spaceDID`: The space DID (optional)
- `metadata`: Additional metadata as JSON string (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "url": "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "metadata": {
      "originalName": "example.txt",
      "mimeType": "text/plain",
      "uploadedBy": "user123",
      "uploadedAt": "2023-01-01T00:00:00.000Z"
    },
    "size": 1234
  }
}
```

#### Download a File

```http
GET /api/ipfs/download/:cid?spaceDID=space-123&filename=example.txt&download=true
```

**Query Parameters:**
- `spaceDID`: The space DID (optional)
- `filename`: Suggested filename for download (optional)
- `download`: Set to 'true' to force download (default: 'false')

**Response:**
- File content with appropriate Content-Type and Content-Disposition headers

#### Get File Information

```http
GET /api/ipfs/files/:cid/info?spaceDID=space-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "filename": "example.txt",
    "size": 1234,
    "mimeType": "text/plain",
    "metadata": {
      "originalName": "example.txt",
      "mimeType": "text/plain",
      "uploadedBy": "user123",
      "uploadedAt": "2023-01-01T00:00:00.000Z"
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### List Files in a Space

```http
GET /api/ipfs/spaces/:spaceId/files?limit=20&offset=0
```

**Query Parameters:**
- `limit`: Number of files to return (default: 20)
- `offset`: Number of files to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        "filename": "example.txt",
        "size": 1234,
        "mimeType": "text/plain",
        "uploadedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

#### Delete a File

```http
DELETE /api/ipfs/files/:cid?spaceDID=space-123
```

**Response:**
```json
{
  "success": true,
  "message": "File marked for deletion",
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
}
```

#### Get IPFS Node Status

```http
GET /api/ipfs/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "online": true,
    "peerCount": 42,
    "repoSize": 1073741824,
    "version": "0.1.0",
    "gateway": "https://ipfs.io/ipfs/"
  }
}
```
{
  "spaceDID": "did:space:user-alias-1234567890",
  "agentDID": "did:agent:abc123",
  "delegation": "...delegation token..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Space authorized successfully"
}
```

#### Upload a File

```http
POST /api/ipfs/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The file to upload
- `spaceDID`: (Optional) The space DID to associate with the file
- `metadata`: (Optional) JSON string of metadata
- `encrypt`: (Optional) Whether to encrypt the file (true/false)

**Response:**
```json
{
  "success": true,
  "cid": "bafy...abc",
  "metadataCid": "bafy...def",
  "filename": "example.jpg",
  "mimeType": "image/jpeg",
  "size": 12345,
  "uploadedAt": "2023-01-01T12:00:00Z",
  "metadata": {
    "originalName": "example.jpg",
    "size": 12345,
    "uploadedAt": "2023-01-01T12:00:00Z"
  }
}
```

#### Download a File

```http
GET /api/ipfs/download/:cid
```

**Query Parameters:**
- `spaceDID`: (Optional) The space DID if the file is in a private space
- `decrypt`: (Optional) Whether to decrypt the file (true/false)

**Response:**
The file content with appropriate headers for download.

## Frontend Implementation

The frontend IPFS utilities are located in `src/utils/ipfs/` and provide a simple interface for interacting with the IPFS backend.

### Setup

1. Install the required dependencies:

```bash
npm install axios react-dropzone
```

2. Configure your environment variables in `.env`:

```env
VITE_STORACHA_API_KEY=your_storacha_api_key
VITE_STORACHA_API_URL=https://api.storacha.com
VITE_IPFS_GATEWAY_URL=https://ipfs.io/ipfs
VITE_API_BASE_URL=http://localhost:3001/api
```

### Using the IPFS Utilities

#### Uploading Files

```typescript
import { uploadFileToIPFS } from '@/utils/ipfs/upload';

// Upload a file with progress tracking
const uploadFile = async (file) => {
  try {
    const result = await uploadFileToIPFS(file, {
      spaceDID: 'your-space-did',
      metadata: { 
        description: 'My important file',
        tags: ['documents', 'important']
      },
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    });
    
    console.log('File uploaded:', result.cid, result.url);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

#### Downloading Files

```typescript
import { downloadFileFromIPFS, getFileBlobUrl } from '@/utils/ipfs/download';

// Download a file and get a blob URL
const downloadAndDisplayFile = async (cid) => {
  try {
    const result = await downloadFileFromIPFS(cid, {
      spaceDID: 'your-space-did',
      onProgress: (progress) => {
        console.log(`Download progress: ${progress}%`);
      }
    });
    
    // Get a blob URL for the downloaded file
    const blobUrl = await getFileBlobUrl(result.content, result.metadata.mimeType);
    
    // Open in new tab or use as needed
    window.open(blobUrl, '_blank');
    
    return result;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};
```

#### Managing Spaces

```typescript
import { createIPFSSpace, authorizeSpaceAccess } from '@/utils/ipfs/space';

// Create a new IPFS space
const createNewSpace = async (name, isPrivate = true) => {
  try {
    const space = await createIPFSSpace({
      name,
      description: 'My personal space',
      isPrivate,
      metadata: {
        createdBy: 'user123',
        purpose: 'personal-storage'
      }
    });
    
    console.log('Space created:', space.id);
    return space;
  } catch (error) {
    console.error('Failed to create space:', error);
    throw error;
  }
};

// Authorize another user to access a space
const authorizeUser = async (spaceId, agentDID) => {
  try {
    const result = await authorizeSpaceAccess(spaceId, agentDID, {
      read: true,
      write: true,
      admin: false
    });
    
    console.log('Space access authorized:', result);
    return result;
  } catch (error) {
    console.error('Authorization failed:', error);
    throw error;
  }
};
```

### React Hook Example

```tsx
import { useStoracha } from '@/hooks/useStoracha';

function FileUploader() {
  const { uploadFile, downloadFile, isUploading, uploadProgress } = useStoracha();
  const [fileUrl, setFileUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadFile(file, {
        spaceDID: 'your-space-did',
        metadata: { 
          description: 'Uploaded from React',
          tags: ['react', 'test']
        }
      });
      
      console.log('File uploaded:', result);
      setFileUrl(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    
    try {
      const cid = fileUrl.split('/').pop();
      await downloadFile(cid, {
        spaceDID: 'your-space-did',
        filename: 'downloaded-file'
      });
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      {isUploading && (
        <div>
          <p>Uploading... {uploadProgress}%</p>
          <progress value={uploadProgress} max="100" />
        </div>
      )}
      
      {fileUrl && (
        <div>
          <p>File uploaded successfully!</p>
          <button onClick={handleDownload}>
            Download File
          </button>
        </div>
      )}
    </div>
  );
}
```

### Error Handling

All IPFS utility functions throw errors with the following structure:

```typescript
interface IPFSError extends Error {
  code: string;        // Error code (e.g., 'UPLOAD_FAILED', 'AUTH_ERROR')
  status?: number;     // HTTP status code (if applicable)
  details?: any;       // Additional error details
}
```

Example error handling:

```typescript
try {
  await uploadFileToIPFS(file);
} catch (error) {
  if (error.code === 'UPLOAD_FAILED') {
    console.error('Upload failed:', error.message);
  } else if (error.status === 401) {
    console.error('Authentication required');
  } else {
    console.error('An unexpected error occurred:', error);
  }
}
```

### TypeScript Support

All IPFS utilities are fully typed. You can import the following types:

```typescript
import type {
  IPFSUploadOptions,
  IPFSUploadResult,
  IPFSDownloadOptions,
  IPFSDownloadResult,
  IPFSSpace,
  IPFSSpaceAccess,
  IPFSError
} from '@/utils/ipfs/types';
``` IPFS service.

### Key Features

- File upload with progress tracking
- File download with automatic handling
- Space management
- Error handling and loading states

### React Hook

A React hook `useIPFS` is available in `src/hooks/useIPFS.ts` for easy integration with React components:

```typescript
const {
  // Actions
  uploadFile,
  downloadFile,
  getFileInfo,
  createSpace,
  authorizeSpace,
  
  // State
  isLoading,
  error,
  progress,
  resetError,
} = useIPFS();

// Example usage
const handleUpload = async (file) => {
  try {
    const result = await uploadFile(file, {
      spaceDID: 'did:space:user-alias-1234567890',
      metadata: { description: 'Example file' },
      encrypt: true,
      onProgress: (p) => console.log(`Upload progress: ${p}%`)
    });
    console.log('File uploaded:', result.cid);
  } catch (err) {
    console.error('Upload failed:', err);
  }
};
```

## Configuration

Configuration is managed in `src/config/ipfs.ts` and can be customized using environment variables:

- `VITE_WEB3_STORAGE_TOKEN`: Your Web3.Storage API token (required)
- `VITE_API_BASE_URL`: Base URL for the API (defaults to '/api')

## Error Handling
## Security Considerations

When using the IPFS integration, keep the following security considerations in mind:

1. **API Keys**:
   - Never expose your Storacha API key in client-side code
   - Store sensitive keys in environment variables
   - Use backend API routes for operations requiring authentication

2. **Access Control**:
   - Always specify the correct `spaceDID` for operations
   - Implement proper authorization checks in your backend
   - Use private spaces for sensitive content

3. **Data Privacy**:
   - Encrypt sensitive data before uploading to IPFS
   - Be aware that public IPFS gateways can access public content
   - Consider using private IPFS networks for sensitive applications
## Deployment

1. Set the required environment variables
2. Build the application
3. Deploy the backend with the updated IPFS service
4. Update the frontend configuration if needed

## Troubleshooting

- **Missing Web3.Storage token**: Ensure `VITE_WEB3_STORAGE_TOKEN` is set in your environment variables
- **Upload failures**: Check the browser console and server logs for error messages
- **Slow uploads**: Large files may take time to upload and pin to IPFS

## License

This project is licensed under the MIT License - see the LICENSE file for details.
