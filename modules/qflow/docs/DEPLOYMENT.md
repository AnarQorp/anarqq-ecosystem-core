# Qflow Deployment Guide

This guide provides comprehensive instructions for deploying Qflow in various environments, from development to production.

## Overview

Qflow is designed as a serverless, distributed automation engine that runs on QNET nodes without any central server dependencies. This guide covers deployment configurations, infrastructure requirements, and best practices.

## Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 10GB available space
- **Network**: Stable internet connection

#### Recommended Requirements (Production)
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ available space (SSD recommended)
- **Network**: High-bandwidth, low-latency connection

### Dependencies

#### Required Services
- **IPFS Node**: For distributed state storage
- **Libp2p**: For peer-to-peer coordination
- **QNET**: Access to QNET node network
- **Node.js**: Version 18+ with npm/yarn

#### Ecosystem Services
- **sQuid**: Identity management service
- **Qlock**: Encryption and key management
- **Qonsent**: Permission validation service
- **Qindex**: Metadata indexing service
- **Qerberos**: Security validation service

## Environment Configuration

### Development Environment

#### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/anarq/qflow.git
cd qflow/modules/qflow

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

#### 2. Environment Variables

Create a `.env` file with the following configuration:

```bash
# Basic Configuration
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Libp2p Configuration
LIBP2P_PORT=4001
LIBP2P_BOOTSTRAP_PEERS=/ip4/127.0.0.1/tcp/4002/p2p/QmBootstrapPeer

# Ecosystem Services
SQUID_SERVICE_URL=http://localhost:3001
QLOCK_SERVICE_URL=http://localhost:3002
QONSENT_SERVICE_URL=http://localhost:3003
QINDEX_SERVICE_URL=http://localhost:3004
QERBEROS_SERVICE_URL=http://localhost:3005

# Security Configuration
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-byte-encryption-key

# Performance Configuration
MAX_CONCURRENT_FLOWS=10
DEFAULT_TIMEOUT=300000
CHECKPOINT_INTERVAL=30000

# Validation Pipeline Configuration
VALIDATION_TIMEOUT_PER_LAYER=5000
VALIDATION_RETRY_ATTEMPTS=3
ENABLE_VALIDATION_CACHE=true

# Sandbox Configuration
WASM_RUNTIME=wasmtime
MAX_MEMORY_MB=128
MAX_EXECUTION_TIME_MS=30000
```

#### 3. Start Development Server

```bash
# Start all services
npm run dev

# Or start individual components
npm run start:engine    # Core execution engine
npm run start:api      # REST API server
npm run start:cli      # CLI interface
```

### Staging Environment

#### 1. Docker Configuration

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  qflow:
    build: .
    ports:
      - "8080:8080"
      - "4001:4001"
      - "9090:9090"
    environment:
      - NODE_ENV=staging
      - IPFS_API_URL=http://ipfs:5001
      - LIBP2P_PORT=4001
    volumes:
      - qflow-data:/app/data
    depends_on:
      - ipfs
      - redis
    networks:
      - qflow-network

  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - "5001:5001"
      - "8081:8080"
    volumes:
      - ipfs-data:/data/ipfs
    networks:
      - qflow-network

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - qflow-network

volumes:
  qflow-data:
  ipfs-data:
  redis-data:

networks:
  qflow-network:
    driver: bridge
```

#### 2. Build and Deploy

```bash
# Build Docker image
docker build -t qflow:staging .

# Start staging environment
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs qflow
```

### Production Environment

#### 1. Kubernetes Deployment

Create Kubernetes manifests:

**qflow-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qflow
  labels:
    app: qflow
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qflow
  template:
    metadata:
      labels:
        app: qflow
    spec:
      containers:
      - name: qflow
        image: qflow:latest
        ports:
        - containerPort: 8080
        - containerPort: 4001
        - containerPort: 9090
        env:
        - name: NODE_ENV
          value: "production"
        - name: IPFS_API_URL
          value: "http://ipfs-service:5001"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: qflow-config
          mountPath: /app/config
        - name: qflow-data
          mountPath: /app/data
      volumes:
      - name: qflow-config
        configMap:
          name: qflow-config
      - name: qflow-data
        persistentVolumeClaim:
          claimName: qflow-pvc
```

**qflow-service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: qflow-service
spec:
  selector:
    app: qflow
  ports:
  - name: api
    port: 8080
    targetPort: 8080
  - name: libp2p
    port: 4001
    targetPort: 4001
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer
```

**qflow-configmap.yaml**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: qflow-config
data:
  qflow-config.yaml: |
    qflow:
      engine:
        maxConcurrentFlows: 100
        defaultTimeout: 300000
        checkpointInterval: 30000
      validation:
        enablePipeline: true
        timeoutPerLayer: 5000
        retryAttempts: 3
      sandbox:
        wasmRuntime: "wasmtime"
        maxMemoryMB: 128
        maxExecutionTimeMs: 30000
        allowedModules: ["dao-approved"]
      networking:
        libp2pPort: 4001
        apiPort: 8080
        metricsPort: 9090
```

#### 2. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f qflow-configmap.yaml
kubectl apply -f qflow-deployment.yaml
kubectl apply -f qflow-service.yaml

# Verify deployment
kubectl get pods -l app=qflow
kubectl get services qflow-service
kubectl logs -l app=qflow
```

## Configuration Management

### Configuration Files

#### Main Configuration (`qflow-config.yaml`)

```yaml
qflow:
  # Engine Configuration
  engine:
    maxConcurrentFlows: 100
    defaultTimeout: 300000
    checkpointInterval: 30000
    enableDistributedExecution: true
    
  # Validation Pipeline Configuration
  validation:
    enablePipeline: true
    timeoutPerLayer: 5000
    retryAttempts: 3
    enableCache: true
    cacheExpirationMs: 300000
    
  # Sandbox Configuration
  sandbox:
    wasmRuntime: "wasmtime"
    maxMemoryMB: 128
    maxExecutionTimeMs: 30000
    allowedModules: ["dao-approved"]
    enableNetworkAccess: false
    
  # Networking Configuration
  networking:
    libp2pPort: 4001
    apiPort: 8080
    metricsPort: 9090
    enableTLS: true
    
  # Storage Configuration
  storage:
    ipfsApiUrl: "http://localhost:5001"
    enableEncryption: true
    compressionLevel: 6
    
  # Security Configuration
  security:
    enableAuthentication: true
    jwtExpirationHours: 24
    enableRateLimiting: true
    maxRequestsPerMinute: 100
    
  # Monitoring Configuration
  monitoring:
    enableMetrics: true
    enableTracing: true
    enableLogging: true
    logLevel: "info"
    
  # DAO Configuration
  dao:
    enableSubnets: true
    defaultSubnet: "default"
    enableGovernance: true
```

#### Environment-Specific Overrides

**development.yaml**:
```yaml
qflow:
  engine:
    maxConcurrentFlows: 10
  monitoring:
    logLevel: "debug"
  security:
    enableAuthentication: false
```

**production.yaml**:
```yaml
qflow:
  engine:
    maxConcurrentFlows: 1000
  security:
    enableAuthentication: true
    enableRateLimiting: true
  monitoring:
    logLevel: "warn"
```

### Environment Variables

Override configuration using environment variables:

```bash
# Engine Configuration
QFLOW_ENGINE_MAX_CONCURRENT_FLOWS=100
QFLOW_ENGINE_DEFAULT_TIMEOUT=300000

# Validation Configuration
QFLOW_VALIDATION_ENABLE_PIPELINE=true
QFLOW_VALIDATION_TIMEOUT_PER_LAYER=5000

# Security Configuration
QFLOW_SECURITY_JWT_SECRET=your-secret-key
QFLOW_SECURITY_ENCRYPTION_KEY=your-encryption-key
```

## Health Checks and Monitoring

### Health Check Endpoints

#### Liveness Probe
```bash
GET /health/live
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### Readiness Probe
```bash
GET /health/ready
```

Response:
```json
{
  "status": "ready",
  "checks": {
    "ipfs": "healthy",
    "libp2p": "healthy",
    "ecosystem": "healthy",
    "database": "healthy"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Startup Probe
```bash
GET /health/startup
```

Response:
```json
{
  "status": "started",
  "initialization": {
    "config": "complete",
    "services": "complete",
    "network": "complete"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Metrics Endpoints

#### System Metrics
```bash
GET /metrics
```

Prometheus-format metrics including:
- Flow execution counts and latencies
- Validation pipeline performance
- Resource utilization
- Error rates and types

#### Custom Metrics
```bash
GET /metrics/qflow
```

Qflow-specific metrics:
- Active flow executions
- Node selection performance
- Sandbox resource usage
- DAO subnet activity

## Security Configuration

### TLS/SSL Setup

#### Certificate Generation

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# For production, use Let's Encrypt or your CA
certbot certonly --standalone -d qflow.yourdomain.com
```

#### TLS Configuration

```yaml
qflow:
  networking:
    enableTLS: true
    tlsCertPath: "/etc/ssl/certs/qflow.crt"
    tlsKeyPath: "/etc/ssl/private/qflow.key"
    tlsMinVersion: "1.2"
```

### Authentication Setup

#### JWT Configuration

```yaml
qflow:
  security:
    jwt:
      secret: "your-jwt-secret"
      expirationHours: 24
      issuer: "qflow"
      audience: "qflow-users"
```

#### sQuid Integration

```yaml
qflow:
  security:
    squid:
      serviceUrl: "https://squid.yourdomain.com"
      enableSubIdentities: true
      requireSignatures: true
```

### Firewall Configuration

#### Required Ports

- **8080**: API server (HTTP/HTTPS)
- **4001**: Libp2p networking
- **9090**: Metrics endpoint
- **5001**: IPFS API (internal)

#### Firewall Rules

```bash
# Allow API access
ufw allow 8080/tcp

# Allow Libp2p networking
ufw allow 4001/tcp

# Allow metrics (internal only)
ufw allow from 10.0.0.0/8 to any port 9090

# Allow IPFS (internal only)
ufw allow from 10.0.0.0/8 to any port 5001
```

## Performance Tuning

### Resource Limits

#### Memory Configuration

```yaml
qflow:
  engine:
    maxMemoryMB: 2048
    gcThresholdMB: 1024
  sandbox:
    maxMemoryMB: 128
    memoryLimitPerFlow: 64
```

#### CPU Configuration

```yaml
qflow:
  engine:
    maxCpuCores: 4
    cpuThrottleThreshold: 80
  sandbox:
    maxCpuTime: 30000
    cpuLimitPerFlow: 1000
```

### Caching Configuration

#### Validation Cache

```yaml
qflow:
  validation:
    cache:
      enabled: true
      maxSize: 10000
      ttlSeconds: 300
      compressionEnabled: true
```

#### Flow Definition Cache

```yaml
qflow:
  engine:
    cache:
      enabled: true
      maxFlows: 1000
      ttlSeconds: 3600
      preloadPopular: true
```

### Database Optimization

#### IPFS Configuration

```yaml
ipfs:
  datastore:
    type: "badgerds"
    path: "/data/ipfs/badgerds"
    syncWrites: false
    truncate: true
  gateway:
    writable: false
    pathPrefixes: []
  swarm:
    connectMgr:
      lowWater: 50
      highWater: 200
```

## Backup and Recovery

### Data Backup

#### IPFS Data Backup

```bash
#!/bin/bash
# backup-ipfs.sh

BACKUP_DIR="/backup/ipfs/$(date +%Y%m%d_%H%M%S)"
IPFS_DATA_DIR="/data/ipfs"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Stop IPFS service
systemctl stop ipfs

# Create backup
tar -czf "$BACKUP_DIR/ipfs-data.tar.gz" -C "$IPFS_DATA_DIR" .

# Restart IPFS service
systemctl start ipfs

# Verify backup
if [ -f "$BACKUP_DIR/ipfs-data.tar.gz" ]; then
    echo "Backup completed successfully: $BACKUP_DIR/ipfs-data.tar.gz"
else
    echo "Backup failed!"
    exit 1
fi
```

#### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backup/config/$(date +%Y%m%d_%H%M%S)"
CONFIG_DIR="/app/config"

mkdir -p "$BACKUP_DIR"

# Backup configuration files
cp -r "$CONFIG_DIR" "$BACKUP_DIR/"

# Backup environment variables
env | grep QFLOW_ > "$BACKUP_DIR/environment.env"

echo "Configuration backup completed: $BACKUP_DIR"
```

### Disaster Recovery

#### Recovery Procedures

1. **Service Recovery**:
   ```bash
   # Stop all services
   docker-compose down
   
   # Restore data from backup
   tar -xzf /backup/ipfs/latest/ipfs-data.tar.gz -C /data/ipfs/
   
   # Restore configuration
   cp -r /backup/config/latest/config/* /app/config/
   
   # Start services
   docker-compose up -d
   ```

2. **Database Recovery**:
   ```bash
   # Restore IPFS data
   ipfs daemon --init
   ipfs swarm connect /ip4/backup-node/tcp/4001/p2p/QmBackupPeer
   
   # Verify data integrity
   ipfs repo verify
   ```

3. **Network Recovery**:
   ```bash
   # Reconnect to QNET
   qflow network reconnect
   
   # Verify node connectivity
   qflow network status
   ```

## Scaling and Load Balancing

### Horizontal Scaling

#### Load Balancer Configuration

```nginx
upstream qflow_backend {
    least_conn;
    server qflow-1:8080 max_fails=3 fail_timeout=30s;
    server qflow-2:8080 max_fails=3 fail_timeout=30s;
    server qflow-3:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name qflow.yourdomain.com;
    
    location / {
        proxy_pass http://qflow_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /health {
        proxy_pass http://qflow_backend;
        access_log off;
    }
}
```

#### Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: qflow-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: qflow
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Scaling

#### Resource Adjustment

```yaml
resources:
  requests:
    memory: "4Gi"
    cpu: "2000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

## Troubleshooting Common Issues

### Service Won't Start

#### Check Dependencies
```bash
# Verify IPFS is running
curl http://localhost:5001/api/v0/version

# Check Libp2p connectivity
netstat -tlnp | grep 4001

# Verify ecosystem services
curl http://localhost:3001/health  # sQuid
curl http://localhost:3002/health  # Qlock
```

#### Check Configuration
```bash
# Validate configuration file
qflow config validate

# Check environment variables
env | grep QFLOW_

# Verify file permissions
ls -la /app/config/
```

### Performance Issues

#### Monitor Resource Usage
```bash
# Check system resources
top -p $(pgrep qflow)
free -h
df -h

# Check application metrics
curl http://localhost:9090/metrics | grep qflow
```

#### Optimize Configuration
```yaml
qflow:
  engine:
    maxConcurrentFlows: 50  # Reduce if memory constrained
  validation:
    enableCache: true       # Enable caching
  sandbox:
    maxMemoryMB: 64        # Reduce sandbox memory
```

### Network Connectivity Issues

#### Check Network Configuration
```bash
# Test Libp2p connectivity
qflow network peers

# Check IPFS connectivity
ipfs swarm peers

# Verify ecosystem service connectivity
qflow health ecosystem
```

#### Firewall Configuration
```bash
# Check firewall rules
ufw status verbose

# Test port connectivity
telnet localhost 4001
telnet localhost 8080
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks
- Monitor system health and performance
- Check error logs for issues
- Verify backup completion
- Review security alerts

#### Weekly Tasks
- Update system packages
- Rotate log files
- Clean up temporary files
- Review performance metrics

#### Monthly Tasks
- Update Qflow to latest version
- Review and update security configurations
- Perform disaster recovery testing
- Optimize database performance

### Update Procedures

#### Minor Updates
```bash
# Pull latest image
docker pull qflow:latest

# Update deployment
kubectl set image deployment/qflow qflow=qflow:latest

# Verify update
kubectl rollout status deployment/qflow
```

#### Major Updates
```bash
# Backup current state
./backup-all.sh

# Test update in staging
kubectl apply -f staging/qflow-deployment.yaml

# Verify staging deployment
./test-deployment.sh staging

# Deploy to production
kubectl apply -f production/qflow-deployment.yaml

# Monitor deployment
kubectl rollout status deployment/qflow
```

## Support and Resources

### Documentation
- [API Documentation](./api/README.md)
- [Migration Guide](./MIGRATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Community
- [GitHub Issues](https://github.com/anarq/qflow/issues)
- [Discord Community](https://discord.gg/qflow)
- [Documentation Site](https://docs.qflow.anarq.org)

### Professional Support
- Email: support@anarq.org
- Enterprise Support: enterprise@anarq.org
- Emergency Hotline: +1-555-QFLOW-911

---

*Last updated: 2024-01-15*