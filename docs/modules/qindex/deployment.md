# Qindex Deployment Guide

## Overview
Indexing & Pointers Module for Q Ecosystem

## Prerequisites

## System Requirements

- Node.js 18+ or Docker
- 2GB RAM minimum
- 10GB disk space
- Network access to IPFS (if using storage features)

## Dependencies

- HTTP client (curl, Postman, etc.)
- MCP-compatible client
- sQuid identity service (for authentication)
- Qonsent permission service (for authorization)

## Environment Setup

```bash
# Clone the repository
git clone https://github.com/anarq/q-ecosystem.git
cd q-ecosystem/modules/qindex

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```


## Standalone Mode

## Docker Compose (Recommended)

```bash
# Start with mock services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f qindex
```

## Manual Deployment

```bash
# Set standalone mode
export QINDEX_MODE=standalone

# Start the service
npm run dev

# Or for production
npm start
```

## Verification

```bash
# Health check
curl http://localhost:3040/health

# Test basic functionality
curl http://localhost:3040/health
```

## Mock Services

In standalone mode, the following services are mocked:
- sQuid (identity verification)
- Qonsent (permission checking)
- Qlock (encryption/signatures)
- Qindex (indexing)
- Qerberos (audit logging)
- IPFS (content storage)


## Integrated Mode

## Prerequisites

Ensure all dependent services are running:
- sQuid identity service
- Qonsent permission service
- Qlock encryption service
- Qindex indexing service
- Qerberos audit service
- IPFS node

## Configuration

```bash
# Set integrated mode
export QINDEX_MODE=integrated

# Configure service URLs
export SQUID_API_URL=http://squid:3000
export QONSENT_API_URL=http://qonsent:3000
export QLOCK_API_URL=http://qlock:3000
export QINDEX_API_URL=http://qindex:3000
export QERBEROS_API_URL=http://qerberos:3000
export IPFS_API_URL=http://ipfs:5001
```

## Deployment

```bash
# Using Docker Compose with ecosystem
docker-compose -f docker-compose.ecosystem.yml up -d

# Or manual start
npm run start:integrated
```

## Service Discovery

The module will automatically discover and connect to ecosystem services using:
- Environment variables
- Service discovery (if configured)
- Health checks and retries


## Hybrid Mode

## Use Cases

Hybrid mode is ideal for:
- Staging environments
- Integration testing
- Gradual migration
- Development with partial real services

## Configuration

```bash
# Set hybrid mode
export QINDEX_MODE=hybrid

# Configure which services to mock
export MOCK_SERVICES=qlock,qindex
export REAL_SERVICES=squid,qonsent,qerberos

# Service URLs for real services
export SQUID_API_URL=http://staging-squid:3000
export QONSENT_API_URL=http://staging-qonsent:3000
```

## Service Selection

Services can be individually configured:
```bash
# Mock specific services
export MOCK_SQUID=true
export MOCK_QLOCK=false

# Or use service-specific URLs
export SQUID_API_URL=mock://squid
export QLOCK_API_URL=http://real-qlock:3000
```


## Configuration

## Environment Variables

### Core Configuration
- `QINDEX_PORT`: HTTP server port (default: 3040)
- `QINDEX_MODE`: Deployment mode (standalone|integrated|hybrid)
- `QINDEX_LOG_LEVEL`: Logging level (debug|info|warn|error)

### Service URLs (Integrated Mode)
- `SQUID_API_URL`: sQuid identity service URL
- `QONSENT_API_URL`: Qonsent permission service URL
- `QLOCK_API_URL`: Qlock encryption service URL
- `QINDEX_API_URL`: Qindex indexing service URL
- `QERBEROS_API_URL`: Qerberos audit service URL
- `IPFS_API_URL`: IPFS node API URL

### Security
- `QINDEX_JWT_SECRET`: JWT signing secret
- `QINDEX_ENCRYPTION_KEY`: Local encryption key
- `QINDEX_API_KEY`: API authentication key

### Performance
- `QINDEX_RATE_LIMIT_WINDOW`: Rate limit window (ms)
- `QINDEX_RATE_LIMIT_MAX`: Max requests per window
- `QINDEX_TIMEOUT`: Request timeout (ms)
- `QINDEX_MAX_CONNECTIONS`: Max concurrent connections

## Configuration Files

### config/default.json
```json
{
  "server": {
    "port": 3040,
    "host": "0.0.0.0"
  },
  "services": {
    "squid": {
      "url": "http://localhost:3010",
      "timeout": 5000
    }
  },
  "security": {
    "rateLimiting": {
      "windowMs": 60000,
      "max": 100
    }
  }
}
```


## Health Checks

## Health Endpoint

```bash
curl http://localhost:3040/health
```

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "squid": {
      "status": "up",
      "latency": 45,
      "lastCheck": "2024-01-01T00:00:00Z"
    }
  },
  "metrics": {
    "uptime": 3600,
    "requestCount": 1234,
    "errorRate": 0.01,
    "avgResponseTime": 120
  }
}
```

## Readiness Check

```bash
curl http://localhost:3040/ready
```

## Liveness Check

```bash
curl http://localhost:3040/live
```

## Kubernetes Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 3040
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3040
  initialDelaySeconds: 5
  periodSeconds: 5
```


## Monitoring

## Metrics Endpoint

```bash
curl http://localhost:3040/metrics
```

## Key Metrics

- `qindex_requests_total`: Total HTTP requests
- `qindex_request_duration_seconds`: Request duration histogram
- `qindex_errors_total`: Total errors by type
- `qindex_active_connections`: Current active connections
- `qindex_queue_depth`: Current queue depth

## Logging

Logs are structured JSON with the following fields:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "info",
  "service": "qindex",
  "requestId": "req-123",
  "squidId": "squid-456",
  "message": "Request processed",
  "duration": 120,
  "statusCode": 200
}
```

## Alerting Rules

### Critical Alerts
- Service down for > 1 minute
- Error rate > 5% for > 5 minutes
- Response time p99 > 1s for > 5 minutes

### Warning Alerts
- Error rate > 1% for > 10 minutes
- Response time p95 > 500ms for > 10 minutes
- Queue depth > 100 for > 5 minutes

