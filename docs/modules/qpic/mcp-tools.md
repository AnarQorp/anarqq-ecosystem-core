# qpic - MCP Tools

Media Management module with transcoding, optimization, and marketplace integration

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qpic',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qpic.upload

Upload media files with automatic metadata extraction and privacy protection

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| file | string | Yes | Media file to upload |
| filename | string | Yes | Original filename |
| metadata | object | No | Additional metadata to associate with the file |
| privacyProfile | string | No | Privacy profile to apply (via Qmask) |
| options | object | No |  |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| mediaId | string | No | Unique media identifier |
| cid | string | No | IPFS Content Identifier |
| metadata | object | No | Extracted and processed metadata |
| thumbnails | array | No | Generated thumbnails |
| formats | array | No | Available formats |
| privacyApplied | boolean | No | Whether privacy profile was applied |
| indexed | boolean | No | Whether media was indexed in Qindex |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qpic.upload', {
  file: "string",
  filename: "string",
  metadata: {},
  privacyProfile: "string",
  options: {},
});
console.log(result);
```


### qpic.transcode

Transcode media to different formats and quality levels

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| mediaId | string | Yes | Media identifier to transcode |
| profiles | array | Yes | Transcoding profiles to apply |
| priority | string | No | Processing priority |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| jobId | string | No | Transcoding job identifier |
| status | string | No | Job status |
| results | array | No | Transcoding results |
| estimatedTime | number | No | Estimated completion time in seconds |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qpic.transcode', {
  mediaId: "string",
  profiles: [],
  priority: "low",
});
console.log(result);
```


### qpic.optimize

Optimize media for delivery with caching and CDN distribution

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| mediaId | string | Yes | Media identifier to optimize |
| optimizations | array | Yes | Optimization operations to perform |
| targets | object | No |  |
| cacheStrategy | string | No | Caching strategy |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| optimizedVersions | array | No | Optimized versions created |
| cdnDistributed | boolean | No | Whether content was distributed to CDN |
| cacheWarmed | boolean | No | Whether cache was pre-warmed |
| totalSavings | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qpic.optimize', {
  mediaId: "string",
  optimizations: [],
  targets: {},
  cacheStrategy: "aggressive",
});
console.log(result);
```


### qpic.metadata

Extract, manage, and update media metadata

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action | string | Yes | Metadata operation to perform |
| mediaId | string | Yes | Media identifier |
| metadata | object | No | Metadata to update (for update action) |
| extractionOptions | object | No |  |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| metadata | object | No |  |
| privacyApplied | boolean | No | Whether privacy filtering was applied |
| extractedFields | array | No | List of metadata fields extracted |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qpic.metadata', {
  action: "extract",
  mediaId: "string",
  metadata: {},
  extractionOptions: {},
});
console.log(result);
```


### qpic.license

Create and manage media licenses for marketplace integration

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action | string | Yes | License operation to perform |
| mediaId | string | Yes | Media identifier |
| licenseData | object | No |  |
| licensee | string | No | Licensee identity (for create/transfer actions) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| licenseId | string | No | License identifier |
| status | string | No | License status |
| license | object | No | Complete license information |
| marketplaceListed | boolean | No | Whether license was listed in marketplace |
| contractCid | string | No | IPFS CID of license contract |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qpic.license', {
  action: "create",
  mediaId: "string",
  licenseData: {},
  licensee: "string",
});
console.log(result);
```







## Error Handling

MCP tools return standardized error responses:

```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
```

## Best Practices

1. **Always check success status** before processing results
2. **Handle errors gracefully** with appropriate fallbacks
3. **Use idempotency keys** for write operations
4. **Implement retry logic** with exponential backoff
5. **Cache results** when appropriate to reduce API calls

## Integration Examples

See the [Integration Guide](./integration-guide.md) for complete examples.
