# Qerberos MCP Tools

## Overview
Qerberos Security & Audit MCP Tools

## Available Tools

## qerberos.audit

Log an audit event to the immutable audit trail

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "description": "Event type (e.g., 'access', 'modification', 'deletion')"
    },
    "ref": {
      "type": "string",
      "description": "Reference to the resource or operation"
    },
    "actor": {
      "type": "object",
      "properties": {
        "squidId": {
          "type": "string",
          "description": "Actor's sQuid identity ID"
        },
        "subId": {
          "type": "string",
          "description": "Actor's subidentity ID (optional)"
        },
        "daoId": {
          "type": "string",
          "description": "Actor's DAO ID (optional)"
        }
      },
      "required": [
        "squidId"
      ],
      "description": "Identity reference of the actor"
    },
    "layer": {
      "type": "string",
      "description": "Layer or service that generated the event"
    },
    "verdict": {
      "type": "string",
      "enum": [
        "ALLOW",
        "DENY",
        "WARN"
      ],
      "description": "Verdict of the operation"
    },
    "details": {
      "type": "object",
      "description": "Additional event details"
    },
    "cid": {
      "type": "string",
      "description": "IPFS CID if applicable"
    }
  },
  "required": [
    "type",
    "ref",
    "actor",
    "layer",
    "verdict"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Audit event ID"
    },
    "cid": {
      "type": "string",
      "description": "IPFS CID of the audit event"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Event timestamp"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature of the event"
    }
  }
}
```


## qerberos.riskScore

Calculate risk score for an identity or operation

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "identity": {
      "type": "string",
      "description": "Identity ID to assess"
    },
    "operation": {
      "type": "string",
      "description": "Operation being performed (optional)"
    },
    "context": {
      "type": "object",
      "description": "Additional context for risk assessment"
    },
    "factors": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Specific risk factors to consider"
    }
  },
  "required": [
    "identity"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "identity": {
      "type": "string",
      "description": "Identity ID"
    },
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Risk score (0 = low risk, 1 = high risk)"
    },
    "level": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high",
        "critical"
      ],
      "description": "Risk level classification"
    },
    "factors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "weight": {
            "type": "number"
          },
          "value": {
            "type": "number"
          }
        }
      },
      "description": "Risk factors and their contributions"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Assessment timestamp"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the risk score expires"
    }
  }
}
```


## qerberos.detectAnomaly

Detect anomalies in data using ML-based analysis

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "description": "Data to analyze for anomalies"
    },
    "model": {
      "type": "string",
      "description": "ML model to use for detection (optional)"
    },
    "threshold": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Anomaly threshold (optional, default: 0.8)"
    }
  },
  "required": [
    "data"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "anomalies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "description": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "description": "Detected anomalies"
    },
    "summary": {
      "type": "object",
      "properties": {
        "totalAnomalies": {
          "type": "integer"
        },
        "highSeverityCount": {
          "type": "integer"
        },
        "averageConfidence": {
          "type": "number"
        }
      },
      "description": "Summary of anomaly detection results"
    }
  }
}
```


## qerberos.getAlerts

Retrieve active security alerts and anomalies

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "severity": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high",
        "critical"
      ],
      "description": "Filter by alert severity (optional)"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "resolved",
        "dismissed"
      ],
      "description": "Filter by alert status (optional)"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "description": "Maximum number of alerts to return (optional, default: 100)"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "alerts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "status": {
            "type": "string",
            "enum": [
              "active",
              "resolved",
              "dismissed"
            ]
          },
          "description": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "description": "Security alerts"
    },
    "totalCount": {
      "type": "integer",
      "description": "Total number of alerts matching criteria"
    }
  }
}
```


## qerberos.complianceReport

Generate automated compliance report

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "gdpr",
        "soc2",
        "custom"
      ],
      "description": "Report type (optional, default: gdpr)"
    },
    "startDate": {
      "type": "string",
      "format": "date-time",
      "description": "Report start date (optional)"
    },
    "endDate": {
      "type": "string",
      "format": "date-time",
      "description": "Report end date (optional)"
    },
    "format": {
      "type": "string",
      "enum": [
        "json",
        "pdf",
        "csv"
      ],
      "description": "Report format (optional, default: json)"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "reportId": {
      "type": "string",
      "description": "Report ID"
    },
    "type": {
      "type": "string",
      "description": "Report type"
    },
    "period": {
      "type": "object",
      "properties": {
        "startDate": {
          "type": "string",
          "format": "date-time"
        },
        "endDate": {
          "type": "string",
          "format": "date-time"
        }
      },
      "description": "Report period"
    },
    "summary": {
      "type": "object",
      "description": "Report summary"
    },
    "violations": {
      "type": "array",
      "items": {
        "type": "object"
      },
      "description": "Compliance violations found"
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Compliance recommendations"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Report generation timestamp"
    }
  }
}
```


## Usage Examples

### qerberos.audit Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qerberos');

const result = await client.callTool('qerberos.audit', {
  "type": "string",
  "ref": "string",
  "actor": {
    "squidId": "string",
    "subId": "string",
    "daoId": "string"
  },
  "layer": "string",
  "verdict": "ALLOW",
  "details": {},
  "cid": "string"
});

console.log(result);
// Expected output structure:
// {
  "id": "string",
  "cid": "string",
  "timestamp": "string",
  "signature": "string"
}
```


### qerberos.riskScore Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qerberos');

const result = await client.callTool('qerberos.riskScore', {
  "identity": "string",
  "operation": "string",
  "context": {},
  "factors": [
    "string"
  ]
});

console.log(result);
// Expected output structure:
// {
  "identity": "string",
  "score": 123,
  "level": "low",
  "factors": [
    {
      "name": "string",
      "weight": 123,
      "value": 123
    }
  ],
  "timestamp": "string",
  "expiresAt": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qerberos-client
```

## Configuration

```javascript
import { QerberosClient } from '@anarq/qerberos-client';

const client = new QerberosClient({
  url: 'http://localhost:3050',
  apiKey: process.env.QERBEROS_API_KEY,
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

