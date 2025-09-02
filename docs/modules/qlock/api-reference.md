# Qlock - Encryption & Signatures Module for Q Ecosystem - API Reference

This module primarily operates through MCP (Model Context Protocol) tools rather than HTTP APIs.

## MCP Integration

This module is designed for serverless and function-based integration. See the [MCP Tools documentation](./mcp-tools.md) for detailed information about available tools.

## Authentication

All MCP tool calls require authentication via sQuid identity:

```javascript
const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qlock',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});
```

## Standard Headers

When using HTTP endpoints (if any), use standard headers:

- `x-squid-id`: sQuid identity ID
- `x-subid`: Subidentity ID (optional)
- `x-qonsent`: Consent token for permissions
- `x-sig`: Qlock signature for verification
- `x-ts`: Timestamp
- `x-api-version`: API version

## Health Check

Basic health check endpoint (if available):

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

## Error Handling

Standard error response format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Integration

For complete integration examples, see:
- [MCP Tools](./mcp-tools.md) - Function-based integration
- [Integration Guide](./integration-guide.md) - Code examples and patterns
- [Deployment Guide](./deployment-guide.md) - Deployment configurations
