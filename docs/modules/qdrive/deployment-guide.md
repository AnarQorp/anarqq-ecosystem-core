# Qdrive API - Deployment Guide

This guide covers deployment options for qdrive in different environments.

## Deployment Modes

### Standalone Mode

Standalone mode runs the module with mock dependencies for development and testing.

```bash
# Using npm
cd modules/qdrive
npm install
npm run dev

# Using Docker
docker-compose up
```

**Environment Variables:**
```bash
qdrive_MODE=standalone
qdrive_PORT=3000
LOG_LEVEL=debug
```

### Integrated Mode

Integrated mode connects to real ecosystem services for production deployment.

```bash
# Set service URLs
export SQUID_API_URL=http://squid:3000
export QONSENT_API_URL=http://qonsent:3000
export QLOCK_API_URL=http://qlock:3000
export QINDEX_API_URL=http://qindex:3000
export QERBEROS_API_URL=http://qerberos:3000

# Start in integrated mode
npm run start:integrated
```

### Hybrid Mode

Hybrid mode allows selective mocking for staging environments.

```bash
# Configure which services to mock
export MOCK_SERVICES=qlock,qindex
export qdrive_MODE=hybrid

npm run start:hybrid
```


## Docker Deployment

This module includes a Dockerfile for containerized deployment.

Use docker-compose for local development:

```bash
docker-compose up -d
```



## Production Deployment

### Docker Swarm

```yaml
version: '3.8'
services:
  qdrive:
    image: qdrive:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      - qdrive_MODE=integrated
      - NODE_ENV=production
    networks:
      - q-network
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qdrive
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qdrive
  template:
    metadata:
      labels:
        app: qdrive
    spec:
      containers:
      - name: qdrive
        image: qdrive:latest
        ports:
        - containerPort: 3000
        env:
        - name: qdrive_MODE
          value: "integrated"
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
```

## Health Checks

The module provides health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed dependency status

## Monitoring

### Metrics

The module exposes Prometheus metrics at `/metrics`:

- Request count and duration
- Error rates
- Dependency health
- Resource usage

### Logging

Structured JSON logging with configurable levels:

```bash
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|text
```

## Security

### TLS Configuration

```bash
# Enable TLS
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
```

### Rate Limiting

```bash
# Configure rate limits
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX=100       # requests per window
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common deployment issues.
