# QpiC - Media Management Module

QpiC provides comprehensive media management capabilities for the Q ecosystem. It handles media transcoding, optimization, metadata extraction, privacy profile application, content delivery optimization, and marketplace integration for media licensing and sales.

## Features

- **Media Upload & Storage**: Secure media upload with IPFS integration and encryption
- **Transcoding & Optimization**: Multi-format transcoding and content optimization
- **Metadata Extraction**: Comprehensive media metadata extraction and management
- **Privacy Protection**: Privacy profile application via Qmask integration
- **Content Delivery**: Optimized content delivery with caching strategies
- **Marketplace Integration**: Media licensing and sales through Qmarket integration
- **Access Control**: Fine-grained access control via Qonsent permissions
- **Audit Logging**: Complete audit trail via Qerberos integration

## Run Modes

### Standalone Mode (Development/Demo)
```bash
# Using Docker Compose
docker-compose up

# Using npm
npm run dev
```

### Integrated Mode (Production)
```bash
# With real dependencies
npm run start:integrated
```

## API Endpoints

### HTTP API
- `POST /api/v1/media/upload` - Upload media files
- `POST /api/v1/media/transcode` - Transcode media to different formats
- `POST /api/v1/media/optimize` - Optimize media for delivery
- `GET /api/v1/media/{id}` - Retrieve media file
- `GET /api/v1/media/{id}/metadata` - Get media metadata
- `PUT /api/v1/media/{id}/metadata` - Update media metadata
- `DELETE /api/v1/media/{id}` - Delete media file
- `POST /api/v1/media/{id}/license` - Create media license
- `GET /api/v1/health` - Health check endpoint

### MCP Tools
- `qpic.upload` - Upload media files with metadata extraction
- `qpic.transcode` - Transcode media to specified formats
- `qpic.optimize` - Optimize media for delivery and caching
- `qpic.metadata` - Extract and manage media metadata
- `qpic.license` - Create and manage media licenses

## Media Formats Supported

### Images
- JPEG, PNG, WebP, AVIF, HEIC
- SVG (with sanitization)
- RAW formats (CR2, NEF, ARW, etc.)

### Video
- MP4, WebM, AVI, MOV, MKV
- H.264, H.265/HEVC, VP9, AV1
- Adaptive streaming (HLS, DASH)

### Audio
- MP3, AAC, FLAC, OGG, WAV
- Opus, Vorbis

### Documents
- PDF (with image extraction)
- Office formats (with preview generation)

## Transcoding Profiles

```json
{
  "web-optimized": {
    "video": {
      "codec": "h264",
      "resolution": "1080p",
      "bitrate": "2000k",
      "format": "mp4"
    },
    "audio": {
      "codec": "aac",
      "bitrate": "128k",
      "sampleRate": "44100"
    }
  },
  "mobile-optimized": {
    "video": {
      "codec": "h264",
      "resolution": "720p",
      "bitrate": "1000k",
      "format": "mp4"
    }
  }
}
```

## Environment Variables

```bash
# Server Configuration
PORT=3008
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/qpic
REDIS_URL=redis://localhost:6379

# Storage Configuration
IPFS_URL=http://localhost:5001
STORAGE_PATH=/tmp/qpic-storage
MAX_FILE_SIZE=100MB
ALLOWED_FORMATS=jpg,jpeg,png,webp,mp4,webm,mp3,aac,pdf

# External Services (Integrated Mode)
SQUID_URL=http://localhost:3001
QONSENT_URL=http://localhost:3003
QMASK_URL=http://localhost:3007
QERBEROS_URL=http://localhost:3006
QINDEX_URL=http://localhost:3004
QMARKET_URL=http://localhost:3009

# Transcoding Configuration
FFMPEG_PATH=/usr/bin/ffmpeg
IMAGEMAGICK_PATH=/usr/bin/convert
TRANSCODING_WORKERS=4
TRANSCODING_TIMEOUT=300

# CDN Configuration
CDN_ENABLED=false
CDN_URL=https://cdn.example.com
CACHE_TTL=3600
```

## Dependencies

### Transversal Compliance
- **sQuid**: Identity verification for all operations
- **Qonsent**: Permission checking for media access and operations
- **Qmask**: Privacy profile application for media content
- **Qerberos**: Audit logging for all media operations
- **Qindex**: Media indexing and discoverability
- **Qmarket**: Marketplace integration for licensing and sales

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Integration tests
npm run test:integration
```

## Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Media Processing Pipeline

1. **Upload**: Secure file upload with virus scanning
2. **Validation**: Format validation and content analysis
3. **Metadata Extraction**: EXIF, ID3, and other metadata extraction
4. **Privacy Application**: Apply privacy profiles via Qmask
5. **Storage**: Encrypted storage in IPFS with backup
6. **Indexing**: Register in Qindex for discoverability
7. **Transcoding**: Generate optimized versions for delivery
8. **Caching**: Distribute to CDN and edge caches
9. **Audit**: Log all operations via Qerberos

## Security Features

- All operations require sQuid identity verification
- Media access controlled via Qonsent permissions
- Content encryption at rest using Qlock
- Virus and malware scanning on upload
- Content sanitization for SVG and documents
- Rate limiting and abuse protection
- Audit logging for all operations

## Privacy Features

- Automatic metadata scrubbing for privacy
- Privacy profile application via Qmask
- GDPR compliance with right to erasure
- Content anonymization capabilities
- Geolocation data removal options

## Marketplace Integration

- Media licensing through Qmarket
- Revenue sharing and royalty management
- Usage tracking and analytics
- Digital rights management (DRM)
- Watermarking and attribution