# Qnet MCP Tools

## Overview
QNET Network Infrastructure MCP Tools

## Available Tools

## qnet.ping

Ping network nodes to test connectivity and measure latency

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "nodeId": {
      "type": "string",
      "description": "Target node identifier (optional, pings all nodes if not specified)"
    },
    "timeout": {
      "type": "integer",
      "description": "Ping timeout in milliseconds",
      "default": 5000
    },
    "count": {
      "type": "integer",
      "description": "Number of ping attempts",
      "default": 1
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "nodeId": {
            "type": "string"
          },
          "latency": {
            "type": "number"
          },
          "success": {
            "type": "boolean"
          },
          "error": {
            "type": "string"
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "totalNodes": {
          "type": "integer"
        },
        "successfulPings": {
          "type": "integer"
        },
        "averageLatency": {
          "type": "number"
        }
      }
    }
  }
}
```


## qnet.capabilities

Get network capabilities and available services

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "nodeId": {
      "type": "string",
      "description": "Specific node to query (optional, returns network-wide capabilities if not specified)"
    },
    "service": {
      "type": "string",
      "description": "Filter by specific service type"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "services": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "protocols": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "regions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "features": {
      "type": "object",
      "additionalProperties": true
    },
    "nodeCapabilities": {
      "type": "object",
      "additionalProperties": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  }
}
```


## qnet.status

Get comprehensive network status and health information

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "includeMetrics": {
      "type": "boolean",
      "description": "Include detailed performance metrics",
      "default": false
    },
    "includeTopology": {
      "type": "boolean",
      "description": "Include network topology information",
      "default": false
    },
    "region": {
      "type": "string",
      "description": "Filter by specific region"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "network": {
      "type": "object",
      "properties": {
        "totalNodes": {
          "type": "integer"
        },
        "activeNodes": {
          "type": "integer"
        },
        "degradedNodes": {
          "type": "integer"
        },
        "inactiveNodes": {
          "type": "integer"
        },
        "averageLatency": {
          "type": "number"
        },
        "averageUptime": {
          "type": "number"
        }
      }
    },
    "regions": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "nodes": {
            "type": "integer"
          },
          "status": {
            "type": "string"
          },
          "latency": {
            "type": "number"
          }
        }
      }
    },
    "services": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "available": {
            "type": "boolean"
          },
          "nodes": {
            "type": "integer"
          },
          "latency": {
            "type": "number"
          }
        }
      }
    },
    "metrics": {
      "type": "object",
      "description": "Included if includeMetrics is true"
    },
    "topology": {
      "type": "object",
      "description": "Included if includeTopology is true"
    }
  }
}
```


## Usage Examples

### qnet.ping Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qnet');

const result = await client.callTool('qnet.ping', {
  "nodeId": "string",
  "timeout": 123,
  "count": 123
});

console.log(result);
// Expected output structure:
// {
  "results": [
    {
      "nodeId": "string",
      "latency": 123,
      "success": true,
      "error": "string"
    }
  ],
  "summary": {
    "totalNodes": 123,
    "successfulPings": 123,
    "averageLatency": 123
  }
}
```


### qnet.capabilities Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qnet');

const result = await client.callTool('qnet.capabilities', {
  "nodeId": "string",
  "service": "string"
});

console.log(result);
// Expected output structure:
// {
  "services": [
    "string"
  ],
  "protocols": [
    "string"
  ],
  "regions": [
    "string"
  ],
  "features": {},
  "nodeCapabilities": {}
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qnet-client
```

## Configuration

```javascript
import { QnetClient } from '@anarq/qnet-client';

const client = new QnetClient({
  url: 'http://localhost:3100',
  apiKey: process.env.QNET_API_KEY,
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

