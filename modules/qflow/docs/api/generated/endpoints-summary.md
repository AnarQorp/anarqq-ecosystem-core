# Qflow API Endpoints Summary

Generated on: 2025-08-29T22:16:03.937Z

## Endpoints by Tag

### Flow Management

- **GET** `/flows` - List flows
- **POST** `/flows` - Create flow
- **GET** `/flows/{flowId}` - Get flow
- **PUT** `/flows/{flowId}` - Update flow
- **DELETE** `/flows/{flowId}` - Delete flow

### Execution Management

- **POST** `/flows/{flowId}/start` - Start flow execution
- **POST** `/flows/{flowId}/trigger` - Trigger flow from external event
- **GET** `/executions/{executionId}` - Get execution status
- **POST** `/executions/{executionId}/pause` - Pause execution
- **POST** `/executions/{executionId}/resume` - Resume execution
- **POST** `/executions/{executionId}/abort` - Abort execution

### Monitoring

- **GET** `/executions/{executionId}/logs` - Get execution logs
- **GET** `/executions/{executionId}/metrics` - Get execution metrics

### System

- **GET** `/system/health` - System health check
- **GET** `/system/metrics` - Get system metrics

### External Integration

- **POST** `/webhooks/{flowId}` - Webhook endpoint
- **GET** `/schemas` - Get supported event schemas


## All Endpoints

| Method | Path | Summary | Tags |
|--------|------|---------|------|
| GET | `/flows` | List flows | Flow Management |
| POST | `/flows` | Create flow | Flow Management |
| GET | `/flows/{flowId}` | Get flow | Flow Management |
| PUT | `/flows/{flowId}` | Update flow | Flow Management |
| DELETE | `/flows/{flowId}` | Delete flow | Flow Management |
| POST | `/flows/{flowId}/start` | Start flow execution | Execution Management |
| POST | `/flows/{flowId}/trigger` | Trigger flow from external event | Execution Management |
| GET | `/executions/{executionId}` | Get execution status | Execution Management |
| POST | `/executions/{executionId}/pause` | Pause execution | Execution Management |
| POST | `/executions/{executionId}/resume` | Resume execution | Execution Management |
| POST | `/executions/{executionId}/abort` | Abort execution | Execution Management |
| GET | `/executions/{executionId}/logs` | Get execution logs | Monitoring |
| GET | `/executions/{executionId}/metrics` | Get execution metrics | Monitoring |
| GET | `/system/health` | System health check | System |
| GET | `/system/metrics` | Get system metrics | System |
| POST | `/webhooks/{flowId}` | Webhook endpoint | External Integration |
| GET | `/schemas` | Get supported event schemas | External Integration |

## Statistics

- **Total Endpoints**: 17
- **GET Endpoints**: 8
- **POST Endpoints**: 7
- **PUT Endpoints**: 1
- **DELETE Endpoints**: 1
