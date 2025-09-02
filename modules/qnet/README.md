# QNET - Network Infrastructure Module

QNET provides network infrastructure services including node health monitoring, capability discovery, latency tracking, and intelligent request routing for the Q ecosystem.

## Features

- **Node Health Monitoring**: Real-time monitoring of network nodes and gateways
- **Capability Discovery**: Dynamic discovery of node capabilities and services
- **Latency Tracking**: Network performance monitoring and optimization
- **Node Reputation**: Reputation-based scoring for network nodes
- **Load Balancing**: Health-based request routing and load distribution
- **Network Topology**: Optimization of network topology for performance

## Run Modes

### Standalone Mode (Development/Testing)
```bash
# Using Docker Compose
docker compose up

# Using npm
npm install
npm run dev
```

### Integrated Mode (Production)
```bash
# With full ecosystem
npm run start:integrated
```

## API Endpoints

### HTTP API
- `GET /health` - Service health check
- `GET /nodes` - List network nodes
- `GET /nodes/:nodeId` - Get node details
- `POST /nodes/:nodeId/ping` - Ping specific node
- `GET /capabilities` - Get network capabilities
- `GET /topology` - Get network topology
- `GET /metrics` - Get network metrics

### MCP Tools
- `qnet.ping` - Ping network nodes
- `qnet.capabilities` - Get node capabilities
- `qnet.status` - Get network status

## Configuration

Environment variables:
- `QNET_PORT` - HTTP server port (default: 3014)
- `QNET_NODE_ID` - This node's identifier
- `QNET_REGION` - Node region (default: 'global')
- `QNET_TIER` - Node tier (standard/premium)
- `QNET_HEALTH_CHECK_INTERVAL` - Health check interval in ms (default: 30000)

## Events

- `q.qnet.node.joined.v1` - Node joined network
- `q.qnet.node.left.v1` - Node left network
- `q.qnet.node.alert.v1` - Node health alert
- `q.qnet.topology.changed.v1` - Network topology changed