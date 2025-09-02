# Qflow cURL Examples

## Authentication

All requests require a Bearer token:

```bash
export QFLOW_TOKEN="your-squid-token"
export QFLOW_API="https://api.qflow.anarq.org/v1"
```

## Flow Management

### Create Flow

```bash
curl -X POST "$QFLOW_API/flows" \
  -H "Authorization: Bearer $QFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hello World Flow",
    "steps": [{
      "id": "hello",
      "type": "task",
      "action": "log-message",
      "params": {"message": "Hello, World!"}
    }]
  }'
```

### List Flows

```bash
curl -X GET "$QFLOW_API/flows?limit=20" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

### Get Flow

```bash
curl -X GET "$QFLOW_API/flows/{flow-id}" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

## Execution Management

### Start Execution

```bash
curl -X POST "$QFLOW_API/flows/{flow-id}/start" \
  -H "Authorization: Bearer $QFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputData": {"user": "developer"},
    "priority": "normal"
  }'
```

### Get Execution Status

```bash
curl -X GET "$QFLOW_API/executions/{execution-id}" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

### Control Execution

```bash
# Pause
curl -X POST "$QFLOW_API/executions/{execution-id}/pause" \
  -H "Authorization: Bearer $QFLOW_TOKEN"

# Resume
curl -X POST "$QFLOW_API/executions/{execution-id}/resume" \
  -H "Authorization: Bearer $QFLOW_TOKEN"

# Abort
curl -X POST "$QFLOW_API/executions/{execution-id}/abort" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

## Monitoring

### Get Logs

```bash
curl -X GET "$QFLOW_API/executions/{execution-id}/logs?level=info&limit=100" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

### Get Metrics

```bash
curl -X GET "$QFLOW_API/executions/{execution-id}/metrics" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

### System Health

```bash
curl -X GET "$QFLOW_API/system/health" \
  -H "Authorization: Bearer $QFLOW_TOKEN"
```

## Webhooks

### Trigger Flow via Webhook

```bash
curl -X POST "$QFLOW_API/webhooks/{flow-id}" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{
    "eventType": "user.created",
    "data": {"userId": "123", "email": "user@example.com"}
  }'
```
