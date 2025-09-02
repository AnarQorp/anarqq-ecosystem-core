# Qpic MCP Tools

## Overview
Media Management module with transcoding, optimization, and marketplace integration

## Available Tools

## qpic.upload

Upload media files with automatic metadata extraction and privacy protection

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "string",
      "format": "binary",
      "description": "Media file to upload"
    },
    "filename": {
      "type": "string",
      "description": "Original filename"
    },
    "metadata": {
      "type": "object",
      "description": "Additional metadata to associate with the file",
      "properties": {
        "title": {
          "type": "string",
          "description": "Media title"
        },
        "description": {
          "type": "string",
          "description": "Media description"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Media tags"
        },
        "category": {
          "type": "string",
          "description": "Media category"
        },
        "license": {
          "type": "string",
          "enum": [
            "CC0",
            "CC-BY",
            "CC-BY-SA",
            "CC-BY-NC",
            "CC-BY-ND",
            "CC-BY-NC-SA",
            "CC-BY-NC-ND",
            "PROPRIETARY"
          ],
          "description": "Media license type"
        }
      },
      "additionalProperties": true
    },
    "privacyProfile": {
      "type": "string",
      "description": "Privacy profile to apply (via Qmask)"
    },
    "options": {
      "type": "object",
      "properties": {
        "extractMetadata": {
          "type": "boolean",
          "default": true,
          "description": "Whether to extract technical metadata"
        },
        "generateThumbnails": {
          "type": "boolean",
          "default": true,
          "description": "Whether to generate thumbnails"
        },
        "virusScan": {
          "type": "boolean",
          "default": true,
          "description": "Whether to perform virus scanning"
        },
        "autoTranscode": {
          "type": "boolean",
          "default": false,
          "description": "Whether to automatically transcode to web formats"
        }
      }
    }
  },
  "required": [
    "file",
    "filename"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "mediaId": {
      "type": "string",
      "description": "Unique media identifier"
    },
    "cid": {
      "type": "string",
      "description": "IPFS Content Identifier"
    },
    "metadata": {
      "type": "object",
      "description": "Extracted and processed metadata"
    },
    "thumbnails": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "size": {
            "type": "string"
          },
          "cid": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        }
      },
      "description": "Generated thumbnails"
    },
    "formats": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "format": {
            "type": "string"
          },
          "cid": {
            "type": "string"
          },
          "url": {
            "type": "string"
          },
          "size": {
            "type": "number"
          }
        }
      },
      "description": "Available formats"
    },
    "privacyApplied": {
      "type": "boolean",
      "description": "Whether privacy profile was applied"
    },
    "indexed": {
      "type": "boolean",
      "description": "Whether media was indexed in Qindex"
    }
  }
}
```


## qpic.transcode

Transcode media to different formats and quality levels

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "mediaId": {
      "type": "string",
      "description": "Media identifier to transcode"
    },
    "profiles": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Profile name"
          },
          "format": {
            "type": "string",
            "enum": [
              "mp4",
              "webm",
              "jpg",
              "webp",
              "avif",
              "mp3",
              "aac",
              "opus"
            ],
            "description": "Output format"
          },
          "quality": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "ultra"
            ],
            "description": "Quality level"
          },
          "resolution": {
            "type": "string",
            "description": "Resolution (e.g., '1920x1080', '720p')"
          },
          "bitrate": {
            "type": "string",
            "description": "Bitrate (e.g., '2000k', '128k')"
          },
          "options": {
            "type": "object",
            "additionalProperties": true,
            "description": "Additional transcoding options"
          }
        },
        "required": [
          "name",
          "format"
        ]
      },
      "description": "Transcoding profiles to apply"
    },
    "priority": {
      "type": "string",
      "enum": [
        "low",
        "normal",
        "high",
        "urgent"
      ],
      "default": "normal",
      "description": "Processing priority"
    }
  },
  "required": [
    "mediaId",
    "profiles"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string",
      "description": "Transcoding job identifier"
    },
    "status": {
      "type": "string",
      "enum": [
        "queued",
        "processing",
        "completed",
        "failed"
      ],
      "description": "Job status"
    },
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "profile": {
            "type": "string"
          },
          "cid": {
            "type": "string"
          },
          "url": {
            "type": "string"
          },
          "size": {
            "type": "number"
          },
          "duration": {
            "type": "number"
          },
          "status": {
            "type": "string"
          }
        }
      },
      "description": "Transcoding results"
    },
    "estimatedTime": {
      "type": "number",
      "description": "Estimated completion time in seconds"
    }
  }
}
```


## qpic.optimize

Optimize media for delivery with caching and CDN distribution

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "mediaId": {
      "type": "string",
      "description": "Media identifier to optimize"
    },
    "optimizations": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "compress",
          "resize",
          "format-convert",
          "cdn-distribute",
          "cache-warm",
          "thumbnail-generate"
        ]
      },
      "description": "Optimization operations to perform"
    },
    "targets": {
      "type": "object",
      "properties": {
        "web": {
          "type": "boolean",
          "description": "Optimize for web delivery"
        },
        "mobile": {
          "type": "boolean",
          "description": "Optimize for mobile devices"
        },
        "print": {
          "type": "boolean",
          "description": "Optimize for print quality"
        },
        "streaming": {
          "type": "boolean",
          "description": "Optimize for streaming"
        }
      }
    },
    "cacheStrategy": {
      "type": "string",
      "enum": [
        "aggressive",
        "normal",
        "conservative",
        "none"
      ],
      "default": "normal",
      "description": "Caching strategy"
    }
  },
  "required": [
    "mediaId",
    "optimizations"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "optimizedVersions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "target": {
            "type": "string"
          },
          "cid": {
            "type": "string"
          },
          "url": {
            "type": "string"
          },
          "size": {
            "type": "number"
          },
          "compressionRatio": {
            "type": "number"
          },
          "cached": {
            "type": "boolean"
          }
        }
      },
      "description": "Optimized versions created"
    },
    "cdnDistributed": {
      "type": "boolean",
      "description": "Whether content was distributed to CDN"
    },
    "cacheWarmed": {
      "type": "boolean",
      "description": "Whether cache was pre-warmed"
    },
    "totalSavings": {
      "type": "object",
      "properties": {
        "sizeReduction": {
          "type": "number",
          "description": "Size reduction percentage"
        },
        "bandwidthSavings": {
          "type": "number",
          "description": "Estimated bandwidth savings"
        }
      }
    }
  }
}
```


## qpic.metadata

Extract, manage, and update media metadata

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "extract",
        "update",
        "get",
        "remove"
      ],
      "description": "Metadata operation to perform"
    },
    "mediaId": {
      "type": "string",
      "description": "Media identifier"
    },
    "metadata": {
      "type": "object",
      "description": "Metadata to update (for update action)",
      "additionalProperties": true
    },
    "extractionOptions": {
      "type": "object",
      "properties": {
        "includeTechnical": {
          "type": "boolean",
          "default": true,
          "description": "Include technical metadata (EXIF, etc.)"
        },
        "includeGeolocation": {
          "type": "boolean",
          "default": false,
          "description": "Include geolocation data"
        },
        "includePersonalData": {
          "type": "boolean",
          "default": false,
          "description": "Include personal data in metadata"
        },
        "applyPrivacyProfile": {
          "type": "string",
          "description": "Privacy profile to apply during extraction"
        }
      }
    }
  },
  "required": [
    "action",
    "mediaId"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "technical": {
          "type": "object",
          "description": "Technical metadata (dimensions, format, etc.)"
        },
        "descriptive": {
          "type": "object",
          "description": "Descriptive metadata (title, description, tags)"
        },
        "rights": {
          "type": "object",
          "description": "Rights and licensing information"
        },
        "provenance": {
          "type": "object",
          "description": "Creation and modification history"
        }
      }
    },
    "privacyApplied": {
      "type": "boolean",
      "description": "Whether privacy filtering was applied"
    },
    "extractedFields": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of metadata fields extracted"
    }
  }
}
```


## qpic.license

Create and manage media licenses for marketplace integration

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "create",
        "update",
        "get",
        "revoke",
        "transfer"
      ],
      "description": "License operation to perform"
    },
    "mediaId": {
      "type": "string",
      "description": "Media identifier"
    },
    "licenseData": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "exclusive",
            "non-exclusive",
            "royalty-free",
            "rights-managed",
            "creative-commons"
          ],
          "description": "License type"
        },
        "usage": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "commercial",
              "editorial",
              "personal",
              "educational",
              "non-profit"
            ]
          },
          "description": "Allowed usage types"
        },
        "territory": {
          "type": "string",
          "description": "Geographic territory (e.g., 'worldwide', 'US', 'EU')"
        },
        "duration": {
          "type": "string",
          "description": "License duration (e.g., '1 year', 'perpetual')"
        },
        "price": {
          "type": "object",
          "properties": {
            "amount": {
              "type": "number"
            },
            "currency": {
              "type": "string"
            }
          }
        },
        "restrictions": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Usage restrictions"
        },
        "attribution": {
          "type": "object",
          "properties": {
            "required": {
              "type": "boolean"
            },
            "text": {
              "type": "string"
            }
          }
        }
      }
    },
    "licensee": {
      "type": "string",
      "description": "Licensee identity (for create/transfer actions)"
    }
  },
  "required": [
    "action",
    "mediaId"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "licenseId": {
      "type": "string",
      "description": "License identifier"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "expired",
        "revoked",
        "pending"
      ],
      "description": "License status"
    },
    "license": {
      "type": "object",
      "description": "Complete license information"
    },
    "marketplaceListed": {
      "type": "boolean",
      "description": "Whether license was listed in marketplace"
    },
    "contractCid": {
      "type": "string",
      "description": "IPFS CID of license contract"
    }
  }
}
```


## Usage Examples

### qpic.upload Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qpic');

const result = await client.callTool('qpic.upload', {
  "file": "string",
  "filename": "string",
  "metadata": {
    "title": "string",
    "description": "string",
    "tags": [
      "string"
    ],
    "category": "string",
    "license": "CC0"
  },
  "privacyProfile": "string",
  "options": {
    "extractMetadata": true,
    "generateThumbnails": true,
    "virusScan": true,
    "autoTranscode": true
  }
});

console.log(result);
// Expected output structure:
// {
  "mediaId": "string",
  "cid": "string",
  "metadata": {},
  "thumbnails": [
    {
      "size": "string",
      "cid": "string",
      "url": "string"
    }
  ],
  "formats": [
    {
      "format": "string",
      "cid": "string",
      "url": "string",
      "size": 123
    }
  ],
  "privacyApplied": true,
  "indexed": true
}
```


### qpic.transcode Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qpic');

const result = await client.callTool('qpic.transcode', {
  "mediaId": "string",
  "profiles": [
    {
      "name": "string",
      "format": "mp4",
      "quality": "low",
      "resolution": "string",
      "bitrate": "string",
      "options": {}
    }
  ],
  "priority": "low"
});

console.log(result);
// Expected output structure:
// {
  "jobId": "string",
  "status": "queued",
  "results": [
    {
      "profile": "string",
      "cid": "string",
      "url": "string",
      "size": 123,
      "duration": 123,
      "status": "string"
    }
  ],
  "estimatedTime": 123
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qpic-client
```

## Configuration

```javascript
import { QpicClient } from '@anarq/qpic-client';

const client = new QpicClient({
  url: 'http://localhost:3070',
  apiKey: process.env.QPIC_API_KEY,
  timeout: 30000
});
```

## Error Handling

```javascript
try {
  const result = await client.callTool('toolName', params);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'AUTH_FAILED') {
    // Handle authentication failure
  } else {
    // Handle other errors
  }
}
```


## Error Handling

## Common Error Codes

- **INVALID_INPUT**: Input parameters don't match schema
- **AUTH_FAILED**: Authentication or authorization failed
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **SERVICE_UNAVAILABLE**: Service temporarily unavailable
- **TIMEOUT**: Request timed out

## Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

