# Qflow Production Deployment Guide

This guide covers the complete production deployment of Qflow, the serverless automation engine for the AnarQ & Q ecosystem.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Configuration Management](#configuration-management)
- [Health Checks and Monitoring](#health-checks-and-monitoring)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Memory**: Minimum 4GB RAM, Recommended 8GB+ RAM
- **Storage**: Minimum 20GB, Recommended 100GB+ SSD
- **Network**: Stable internet connection with ports 8080, 4001, 9090 accessible

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Kubernetes 1.24+ (for K8s deployment)
- kubectl configured with cluster access
- Node.js 18+ (for local development)

### External Dependencies

- **IPFS Node**: For distributed storage
- **Redis**: For caching and session management
- **Prometheus**: For metrics collection (optional)
- **Grafana**: For monitoring dashboards (optional)

## Quick Start

### 1. Clone and Build

```bash
# Clone the repository
git clone <repository-url>
cd modules/qflow

# Build the Docker image
docker build -t qflow:latest .
```

### 2. Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f qflow
```

### 3. Verify Deployment

```bash
# Health check
curl http://localhost:8080/health

# API documentation
open http://localhost:8080/api/v1/docs

# WebSocket dashboard
open http://localhost:8080/dashboard
```

## Docker Deployment

### Development Environment

```bash
# Use development configuration
docker-compose -f docker-compose.yml up -d

# Enable monitoring stack
docker-compose --profile monitoring up -d
```

### Production Environment

```bash
# Use production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale Qflow instances
docker-compose up -d --scale qflow=3
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# Copy environment template
cp config/production.env .env

# Edit configuration
nano .env
```

Key variables to configure:

```bash
# Application
NODE_ENV=production
LOG_LEVEL=warn
QFLOW_MAX_CONCURRENT_FLOWS=500

# External Services
IPFS_API_URL=http://ipfs:5001
REDIS_URL=redis://redis:6379

# Security (generate secure values)
QFLOW_JWT_SECRET=your-secure-jwt-secret
QFLOW_ENCRYPTION_KEY=your-secure-encryption-key

# Monitoring
QFLOW_ENABLE_METRICS=true
QFLOW_PERFORMANCE_MONITORING=true
```

## Kubernetes Deployment

### 1. Prepare Cluster

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply RBAC
kubectl apply -f k8s/rbac.yaml
```

### 2. Configure Secrets

```bash
# Generate secrets
kubectl create secret generic qflow-secrets \
  --from-literal=QFLOW_JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=QFLOW_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -n qflow

# Or apply from file
kubectl apply -f k8s/secret.yaml
```

### 3. Deploy Infrastructure

```bash
# Deploy storage
kubectl apply -f k8s/pvc.yaml

# Deploy Redis and IPFS
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/ipfs-deployment.yaml

# Wait for dependencies
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=qflow-redis -n qflow --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=qflow-ipfs -n qflow --timeout=300s
```

### 4. Deploy Qflow

```bash
# Apply configuration
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Configure ingress
kubectl apply -f k8s/ingress.yaml

# Enable autoscaling
kubectl apply -f k8s/hpa.yaml

# Apply network policies
kubectl apply -f k8s/network-policy.yaml
```

### 5. Deploy Monitoring

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml

# Check Prometheus targets
kubectl port-forward -n qflow service/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

### 6. Automated Deployment

Use the deployment script for automated deployment:

```bash
# Deploy to production
./scripts/deploy.sh production v1.0.0

# Deploy to staging
./scripts/deploy.sh staging latest

# Deploy with custom registry
DOCKER_REGISTRY=your-registry.com ./scripts/deploy.sh production v1.0.0
```

### 7. Verify Deployment

```bash
# Check pod status
kubectl get pods -n qflow

# Check service endpoints
kubectl get services -n qflow

# View logs
kubectl logs -n qflow -l app.kubernetes.io/name=qflow -f

# Port forward for testing
kubectl port-forward -n qflow service/qflow-service 8080:8080
```

## Configuration Management

### Environment-Specific Configurations

- **Development**: `config/development.env`
- **Staging**: `config/staging.env`
- **Production**: `config/production.env`

### Configuration Hierarchy

1. Environment variables
2. Configuration files
3. Kubernetes ConfigMaps/Secrets
4. Default values

### Key Configuration Areas

#### Performance Tuning

```bash
# Concurrent flows
QFLOW_MAX_CONCURRENT_FLOWS=500

# Validation timeouts
QFLOW_VALIDATION_TIMEOUT=5000
QFLOW_VALIDATION_CACHE_TTL=3600

# Sandbox limits
QFLOW_SANDBOX_MEMORY_LIMIT=128
QFLOW_SANDBOX_TIMEOUT=30000
```

#### Security Settings

```bash
# CORS configuration
QFLOW_ENABLE_CORS=false
QFLOW_CORS_ORIGINS=https://your-domain.com

# Rate limiting
QFLOW_RATE_LIMIT_WINDOW=900000
QFLOW_RATE_LIMIT_MAX=1000
```

#### Monitoring Configuration

```bash
# Metrics collection
QFLOW_ENABLE_METRICS=true
QFLOW_METRICS_INTERVAL=30000

# Performance monitoring
QFLOW_PERFORMANCE_MONITORING=true
QFLOW_PERFORMANCE_SAMPLE_RATE=0.1
```

## Health Checks and Monitoring

### Health Check Endpoints

- **Liveness**: `GET /health/live` - Basic server health
- **Readiness**: `GET /health/ready` - Service dependencies
- **Startup**: `GET /health/startup` - Initialization status

### Metrics Endpoints

- **Prometheus**: `GET /metrics` - Prometheus format
- **Detailed**: `GET /api/v1/metrics` - JSON format with details

### Monitoring Stack

#### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'qflow'
    static_configs:
      - targets: ['qflow:9090']
    scrape_interval: 30s
```

#### Grafana Dashboards

Import the provided dashboard:

```bash
# Import dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/qflow-dashboard.json
```

### Alerting Rules

Key alerts configured:

- High error rate (>10%)
- High latency (>1s p95)
- Service down
- High resource usage
- Validation pipeline failures

## Security Considerations

### Container Security

- Non-root user execution
- Read-only root filesystem
- Minimal base image (Alpine)
- Security scanning enabled

### Network Security

- Network policies for pod-to-pod communication
- TLS encryption for external traffic
- Rate limiting and CORS protection

### Secrets Management

- Kubernetes secrets for sensitive data
- Secret rotation procedures
- Encryption at rest and in transit

### Access Control

- RBAC for Kubernetes resources
- Service account with minimal permissions
- API authentication and authorization

## Troubleshooting

### Common Issues

#### 1. Pod Startup Failures

```bash
# Check pod events
kubectl describe pod -n qflow <pod-name>

# Check logs
kubectl logs -n qflow <pod-name> --previous

# Check resource constraints
kubectl top pods -n qflow
```

#### 2. Service Connectivity Issues

```bash
# Test service endpoints
kubectl exec -n qflow <pod-name> -- curl http://qflow-service:8080/health

# Check DNS resolution
kubectl exec -n qflow <pod-name> -- nslookup qflow-service

# Verify network policies
kubectl get networkpolicy -n qflow
```

#### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n qflow

# Review metrics
kubectl port-forward -n qflow service/prometheus 9090:9090

# Check HPA status
kubectl get hpa -n qflow
```

#### 4. Storage Issues

```bash
# Check PVC status
kubectl get pvc -n qflow

# Check storage class
kubectl get storageclass

# Review volume mounts
kubectl describe pod -n qflow <pod-name>
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set debug environment
kubectl set env deployment/qflow LOG_LEVEL=debug -n qflow

# Enable profiling
kubectl set env deployment/qflow QFLOW_ENABLE_PROFILING=true -n qflow
```

### Log Analysis

```bash
# Stream logs
kubectl logs -n qflow -l app.kubernetes.io/name=qflow -f

# Search logs
kubectl logs -n qflow -l app.kubernetes.io/name=qflow | grep ERROR

# Export logs
kubectl logs -n qflow -l app.kubernetes.io/name=qflow > qflow.log
```

### Performance Profiling

```bash
# Enable profiling endpoint
curl http://localhost:8080/debug/pprof/

# CPU profile
curl http://localhost:8080/debug/pprof/profile > cpu.prof

# Memory profile
curl http://localhost:8080/debug/pprof/heap > mem.prof
```

## Maintenance

### Updates and Rollbacks

```bash
# Update deployment
kubectl set image deployment/qflow qflow=qflow:v1.1.0 -n qflow

# Check rollout status
kubectl rollout status deployment/qflow -n qflow

# Rollback if needed
kubectl rollout undo deployment/qflow -n qflow
```

### Backup and Recovery

```bash
# Backup persistent data
kubectl exec -n qflow <ipfs-pod> -- tar czf - /data/ipfs > ipfs-backup.tar.gz

# Backup configuration
kubectl get configmap qflow-config -n qflow -o yaml > config-backup.yaml
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment qflow --replicas=5 -n qflow

# Update HPA limits
kubectl patch hpa qflow-hpa -n qflow -p '{"spec":{"maxReplicas":15}}'
```

## Support

For additional support:

- Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
- Review [operational runbooks](docs/RUNBOOK.md)
- Monitor system health via dashboards
- Contact the development team for critical issues

## Next Steps

After successful deployment:

1. Configure monitoring alerts
2. Set up log aggregation
3. Implement backup procedures
4. Plan capacity scaling
5. Review security hardening
6. Document operational procedures