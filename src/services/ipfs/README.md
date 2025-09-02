# IPFS Service with Storacha and UCAN

This service provides a high-level interface for interacting with IPFS using Storacha and UCAN for authentication and authorization.

## Features

- Upload files to IPFS with progress tracking
- Download files from IPFS
- Manage IPFS spaces with UCAN delegation
- Automatic session management
- TypeScript support

## Setup

1. Install the required dependencies:

```bash
npm install @storacha/client
```

2. Configure your environment variables:

```env
NEXT_PUBLIC_STORACHA_API_URL=https://api.storacha.dev
```

## Usage

### Uploading a File

```typescript
import ipfs from '@/utils/ipfs';

async function uploadFile(file: File) {
  try {
    const result = await ipfs.uploadFile(file, {
      metadata: { 
        name: 'My File',
        description: 'A file uploaded with UCAN auth'
      },
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    });
    
    console.log('File uploaded with CID:', result.cid);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Downloading a File

```typescript
import ipfs from '@/utils/ipfs';

async function downloadFile(cid: string) {
  try {
    const result = await ipfs.downloadFile(cid, {
      onProgress: (progress) => {
        console.log(`Download progress: ${progress}%`);
      }
    });
    
    // Create a download link
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.name || 'download';
    a.click();
    
    // Clean up
    result.revokeUrl();
  } catch (error) {
    console.error('Download failed:', error);
  }
}
```

### Managing Spaces

```typescript
import ipfs from '@/utils/ipfs';

// Create a new space
async function createSpace(name: string) {
  try {
    const space = await ipfs.createSpace(name);
    console.log('Created space:', space);
    return space;
  } catch (error) {
    console.error('Failed to create space:', error);
  }
}

// Check if UCAN is available
const isAvailable = ipfs.isUCANAvailable();
console.log('UCAN available:', isAvailable);

// Get current space
const currentSpace = ipfs.getCurrentSpace();
console.log('Current space:', currentSpace);
```

## Error Handling

The service provides detailed error messages for common issues:

- Authentication failures
- Network errors
- Invalid file types
- Storage quota exceeded
- UCAN delegation errors

## Development

### Mock Mode

In development, the service runs in mock mode by default, which:

- Simulates file uploads/downloads
- Uses mock CIDs and file data
- Simulates network delays

To enable real IPFS functionality, set up the appropriate environment variables and ensure the backend API is running.

### Testing

Run the test suite:

```bash
npm test
```

## License

MIT
