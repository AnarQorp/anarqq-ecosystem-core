# QNET Event Catalog

This document describes all events published by the QNET module.

## Event Naming Convention

All QNET events follow the pattern: `q.qnet.<action>.<version>`

## Events

### q.qnet.node.joined.v1

**Description**: Published when a new node joins the network

**Payload Schema**: [node-joined.event.json](./node-joined.event.json)

**Example**:
```json
{
  "eventType": "q.qnet.node.joined.v1",
  "timestamp": "2024-01-15T10:30:00Z",
  "nodeId": "qnet-us-east-primary",
  "region": "us-east-1",
  "type": "primary",
  "capabilities": ["routing", "gateway", "storage"]
}
```

### q.qnet.node.left.v1

**Description**: Published when a node leaves the network

**Payload Schema**: [node-left.event.json](./node-left.event.json)

**Example**:
```json
{
  "eventType": "q.qnet.node.left.v1",
  "timestamp": "2024-01-15T10:35:00Z",
  "nodeId": "qnet-eu-west-secondary",
  "reason": "maintenance",
  "graceful": true
}
```

### q.qnet.node.alert.v1

**Description**: Published when a node health alert is triggered

**Payload Schema**: [node-alert.event.json](./node-alert.event.json)

**Example**:
```json
{
  "eventType": "q.qnet.node.alert.v1",
  "timestamp": "2024-01-15T10:40:00Z",
  "nodeId": "qnet-asia-primary",
  "alertType": "high_latency",
  "severity": "warning",
  "metrics": {
    "latency": 850,
    "threshold": 500
  }
}
```

### q.qnet.topology.changed.v1

**Description**: Published when network topology changes significantly

**Payload Schema**: [topology-changed.event.json](./topology-changed.event.json)

**Example**:
```json
{
  "eventType": "q.qnet.topology.changed.v1",
  "timestamp": "2024-01-15T10:45:00Z",
  "changeType": "node_added",
  "affectedRegions": ["us-east-1"],
  "nodeCount": 15,
  "summary": "New primary node added to US East region"
}
```

## Event Consumers

- **Qerberos**: Consumes node alerts for security monitoring
- **Monitoring Systems**: Consume all events for observability
- **Load Balancers**: Consume topology changes for routing updates
- **Analytics**: Consume all events for network analysis

## Event Retention

- Node events: 30 days
- Alert events: 90 days
- Topology events: 1 year