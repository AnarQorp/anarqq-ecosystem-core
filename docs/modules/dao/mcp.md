# Dao MCP Tools

## Overview
DAO/Communities governance tools for the Q ecosystem

## Available Tools

## dao.vote

Cast a vote on a DAO proposal

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "daoId": {
      "type": "string",
      "description": "DAO identifier"
    },
    "proposalId": {
      "type": "string",
      "description": "Proposal identifier"
    },
    "voterId": {
      "type": "string",
      "description": "Voter's sQuid identity"
    },
    "option": {
      "type": "string",
      "description": "Voting option (e.g., 'Yes', 'No', 'Abstain')"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature of the vote"
    }
  },
  "required": [
    "daoId",
    "proposalId",
    "voterId",
    "option",
    "signature"
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
    "voteId": {
      "type": "string"
    },
    "weight": {
      "type": "number"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "proposalStatus": {
      "type": "object",
      "properties": {
        "voteCount": {
          "type": "integer"
        },
        "quorumReached": {
          "type": "boolean"
        },
        "status": {
          "type": "string"
        }
      }
    }
  }
}
```


## dao.propose

Create a new proposal in a DAO

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "daoId": {
      "type": "string",
      "description": "DAO identifier"
    },
    "title": {
      "type": "string",
      "description": "Proposal title"
    },
    "description": {
      "type": "string",
      "description": "Detailed proposal description"
    },
    "options": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Voting options",
      "default": [
        "Yes",
        "No"
      ]
    },
    "duration": {
      "type": "integer",
      "description": "Voting duration in milliseconds (optional)"
    },
    "creatorId": {
      "type": "string",
      "description": "Creator's sQuid identity"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature of the proposal"
    }
  },
  "required": [
    "daoId",
    "title",
    "description",
    "creatorId",
    "signature"
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
    "proposalId": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "quorum": {
      "type": "integer"
    },
    "status": {
      "type": "string"
    }
  }
}
```


## dao.execute

Execute an approved DAO proposal

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "daoId": {
      "type": "string",
      "description": "DAO identifier"
    },
    "proposalId": {
      "type": "string",
      "description": "Proposal identifier"
    },
    "executorId": {
      "type": "string",
      "description": "Executor's sQuid identity"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature of the execution request"
    }
  },
  "required": [
    "daoId",
    "proposalId",
    "executorId",
    "signature"
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
    "proposalId": {
      "type": "string"
    },
    "executedAt": {
      "type": "string",
      "format": "date-time"
    },
    "executionResult": {
      "type": "object",
      "description": "Result of the proposal execution"
    },
    "transactionHash": {
      "type": "string",
      "description": "Blockchain transaction hash (if applicable)"
    }
  }
}
```


## dao.getProposal

Get detailed information about a specific proposal

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "daoId": {
      "type": "string",
      "description": "DAO identifier"
    },
    "proposalId": {
      "type": "string",
      "description": "Proposal identifier"
    }
  },
  "required": [
    "daoId",
    "proposalId"
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
    "proposal": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "title": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "options": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "status": {
          "type": "string"
        },
        "voteCount": {
          "type": "integer"
        },
        "results": {
          "type": "object"
        },
        "quorumReached": {
          "type": "boolean"
        },
        "timeRemaining": {
          "type": "integer"
        }
      }
    }
  }
}
```


## dao.getDAOInfo

Get information about a DAO

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "daoId": {
      "type": "string",
      "description": "DAO identifier"
    }
  },
  "required": [
    "daoId"
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
    "dao": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "memberCount": {
          "type": "integer"
        },
        "proposalCount": {
          "type": "integer"
        },
        "activeProposals": {
          "type": "integer"
        },
        "governanceRules": {
          "type": "object"
        }
      }
    }
  }
}
```


## Usage Examples

### dao.vote Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('dao');

const result = await client.callTool('dao.vote', {
  "daoId": "string",
  "proposalId": "string",
  "voterId": "string",
  "option": "string",
  "signature": "string"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "voteId": "string",
  "weight": 123,
  "timestamp": "string",
  "proposalStatus": {
    "voteCount": 123,
    "quorumReached": true,
    "status": "string"
  }
}
```


### dao.propose Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('dao');

const result = await client.callTool('dao.propose', {
  "daoId": "string",
  "title": "string",
  "description": "string",
  "options": [
    "string"
  ],
  "duration": 123,
  "creatorId": "string",
  "signature": "string"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "proposalId": "string",
  "title": "string",
  "expiresAt": "string",
  "quorum": 123,
  "status": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/dao-client
```

## Configuration

```javascript
import { DaoClient } from '@anarq/dao-client';

const client = new DaoClient({
  url: 'http://localhost:3110',
  apiKey: process.env.DAO_API_KEY,
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

