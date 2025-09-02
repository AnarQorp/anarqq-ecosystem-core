# Qmask MCP Tools

## Overview
Privacy & Anonymization module with privacy profile management

## Available Tools

## qmask.apply

Apply privacy masking to data using a specified profile

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "description": "Data object to apply masking to",
      "additionalProperties": true
    },
    "profileName": {
      "type": "string",
      "description": "Name of the privacy profile to apply"
    },
    "context": {
      "type": "object",
      "description": "Additional context for masking decisions",
      "properties": {
        "purpose": {
          "type": "string",
          "description": "Purpose of data processing"
        },
        "jurisdiction": {
          "type": "string",
          "description": "Legal jurisdiction"
        },
        "dataSubject": {
          "type": "string",
          "description": "Data subject identifier"
        }
      },
      "additionalProperties": true
    }
  },
  "required": [
    "data",
    "profileName"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "maskedData": {
      "type": "object",
      "description": "Data with privacy masking applied",
      "additionalProperties": true
    },
    "appliedRules": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "strategy": {
            "type": "string"
          },
          "applied": {
            "type": "boolean"
          }
        }
      },
      "description": "List of rules that were applied"
    },
    "riskScore": {
      "type": "number",
      "description": "Re-identification risk score (0-1)"
    },
    "complianceFlags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Compliance requirements met"
    }
  }
}
```


## qmask.profile

Manage privacy profiles - create, update, retrieve, or delete

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
        "delete",
        "list"
      ],
      "description": "Action to perform on the profile"
    },
    "profileName": {
      "type": "string",
      "description": "Name of the profile (required for all actions except list)"
    },
    "profile": {
      "type": "object",
      "description": "Profile data (required for create/update)",
      "properties": {
        "name": {
          "type": "string"
        },
        "rules": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": {
                "type": "string"
              },
              "strategy": {
                "type": "string",
                "enum": [
                  "REDACT",
                  "HASH",
                  "ENCRYPT",
                  "ANONYMIZE",
                  "REMOVE"
                ]
              },
              "params": {
                "type": "object",
                "additionalProperties": true
              }
            },
            "required": [
              "field",
              "strategy"
            ]
          }
        },
        "defaults": {
          "type": "object",
          "additionalProperties": true
        },
        "version": {
          "type": "string"
        }
      }
    }
  },
  "required": [
    "action"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "profile": {
      "type": "object",
      "description": "Profile data (for get/create/update actions)"
    },
    "profiles": {
      "type": "array",
      "description": "List of profiles (for list action)",
      "items": {
        "type": "object"
      }
    },
    "message": {
      "type": "string",
      "description": "Operation result message"
    }
  }
}
```


## qmask.assess

Perform privacy impact assessment on data processing operations

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "description": "Type of data processing operation"
        },
        "dataTypes": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Types of personal data involved"
        },
        "purpose": {
          "type": "string",
          "description": "Purpose of processing"
        },
        "recipients": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Data recipients"
        },
        "retention": {
          "type": "string",
          "description": "Data retention period"
        },
        "jurisdiction": {
          "type": "string",
          "description": "Legal jurisdiction"
        }
      },
      "required": [
        "type",
        "dataTypes",
        "purpose"
      ]
    }
  },
  "required": [
    "operation"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "riskLevel": {
      "type": "string",
      "enum": [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
      ],
      "description": "Overall privacy risk level"
    },
    "riskScore": {
      "type": "number",
      "description": "Numerical risk score (0-1)"
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "severity": {
            "type": "string"
          },
          "mitigation": {
            "type": "string"
          }
        }
      },
      "description": "Identified privacy risks"
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Privacy protection recommendations"
    },
    "complianceRequirements": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Applicable compliance requirements"
    }
  }
}
```


## Usage Examples

### qmask.apply Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmask');

const result = await client.callTool('qmask.apply', {
  "data": {},
  "profileName": "string",
  "context": {
    "purpose": "string",
    "jurisdiction": "string",
    "dataSubject": "string"
  }
});

console.log(result);
// Expected output structure:
// {
  "maskedData": {},
  "appliedRules": [
    {
      "field": "string",
      "strategy": "string",
      "applied": true
    }
  ],
  "riskScore": 123,
  "complianceFlags": [
    "string"
  ]
}
```


### qmask.profile Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmask');

const result = await client.callTool('qmask.profile', {
  "action": "create",
  "profileName": "string",
  "profile": {
    "name": "string",
    "rules": [
      {
        "field": "string",
        "strategy": "REDACT",
        "params": {}
      }
    ],
    "defaults": {},
    "version": "string"
  }
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "profile": {},
  "profiles": [
    {}
  ],
  "message": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qmask-client
```

## Configuration

```javascript
import { QmaskClient } from '@anarq/qmask-client';

const client = new QmaskClient({
  url: 'http://localhost:3060',
  apiKey: process.env.QMASK_API_KEY,
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

