# Qflow Troubleshooting Guide

This guide provides comprehensive troubleshooting procedures for common Qflow issues, including diagnostic steps, solutions, and prevention strategies.

## Quick Diagnostic Commands

### System Health Check
```bash
# Overall system health
qflow health --verbose

# Component-specific health
qflow health engine
qflow health validation
qflow health network
qflow health ecosystem

# Service status
systemctl status qflow
docker-compose ps
kubectl get pods -l app=qflow
```

### Log Analysis
```bash
# View recent logs
qflow logs --tail 100

# Filter by severity
qflow logs --level error
qflow logs --level warn

# Component-specific logs
qflow logs engine
qflow logs validation
qflow logs network

# Real-time log monitoring
qflow logs --follow
```

### Performance Metrics
```bash
# Current performance metrics
curl http://localhost:9090/metrics | grep qflow

# Resource usage
qflow metrics system
qflow metrics flows
qflow metrics validation

# Network statistics
qflow network stats
```

## Common Issues and Solutions

### 1. Service Startup Issues

#### Issue: Qflow Service Won't Start

**Symptoms:**
- Service fails to start
- Error messages in logs
- Health checks failing

**Diagnostic Steps:**
```bash
# Check service status
systemctl status qflow

# View startup logs
journalctl -u qflow -f

# Check configuration
qflow config validate

# Verify dependencies
qflow deps check
```

**Common Causes and Solutions:**

##### Missing Dependencies
```bash
# Check IPFS
curl http://localhost:5001/api/v0/version
# If fails: sudo systemctl start ipfs

# Check Node.js version
node --version
# If < 18: update Node.js

# Check ecosystem services
curl http://localhost:3001/health  # sQuid
curl http://localhost:3002/health  # Qlock
curl http://localhost:3003/health  # Qonsent
```

##### Configuration Errors
```bash
# Validate configuration syntax
qflow config validate --file qflow-config.yaml

# Check environment variables
env | grep QFLOW_ | sort

# Verify file permissions
ls -la /app/config/
chmod 644 /app/config/qflow-config.yaml
```

##### Port Conflicts
```bash
# Check port usage
netstat -tlnp | grep -E '8080|4001|9090'

# Kill conflicting processes
sudo lsof -ti:8080 | xargs kill -9

# Change ports in configuration
QFLOW_API_PORT=8081 qflow start
```

#### Issue: Docker Container Won't Start

**Diagnostic Steps:**
```bash
# Check container status
docker ps -a | grep qflow

# View container logs
docker logs qflow-container

# Check image
docker images | grep qflow

# Inspect container
docker inspect qflow-container
```

**Solutions:**
```bash
# Rebuild image
docker build -t qflow:latest .

# Remove and recreate container
docker rm qflow-container
docker run -d --name qflow-container qflow:latest

# Check resource limits
docker stats qflow-container
```

### 2. Network Connectivity Issues

#### Issue: Cannot Connect to QNET Nodes

**Symptoms:**
- No peer connections
- Flow execution fails
- Network timeouts

**Diagnostic Steps:**
```bash
# Check Libp2p status
qflow network status

# List connected peers
qflow network peers

# Test connectivity
qflow network ping <peer-id>

# Check firewall
ufw status
iptables -L
```

**Solutions:**

##### Firewall Configuration
```bash
# Allow Libp2p port
sudo ufw allow 4001/tcp

# Allow API port
sudo ufw allow 8080/tcp

# Check NAT configuration
qflow network nat-status
```

##### Bootstrap Peers
```bash
# Add bootstrap peers
qflow network bootstrap add /ip4/bootstrap.qnet.org/tcp/4001/p2p/QmBootstrap

# Reset peer connections
qflow network reset

# Manual peer connection
qflow network connect /ip4/peer.example.com/tcp/4001/p2p/QmPeerID
```

##### Network Configuration
```yaml
# Update qflow-config.yaml
qflow:
  networking:
    libp2pPort: 4001
    enableRelay: true
    enableAutoRelay: true
    bootstrapPeers:
      - "/ip4/bootstrap1.qnet.org/tcp/4001/p2p/QmBootstrap1"
      - "/ip4/bootstrap2.qnet.org/tcp/4001/p2p/QmBootstrap2"
```

#### Issue: IPFS Connection Problems

**Diagnostic Steps:**
```bash
# Check IPFS daemon
ipfs id

# Test IPFS API
curl http://localhost:5001/api/v0/version

# Check IPFS peers
ipfs swarm peers

# Verify IPFS configuration
ipfs config show
```

**Solutions:**
```bash
# Restart IPFS daemon
ipfs daemon --init

# Reset IPFS configuration
ipfs config profile apply server

# Add IPFS peers
ipfs swarm connect /ip4/ipfs.example.com/tcp/4001/p2p/QmIPFSPeer
```

### 3. Flow Execution Issues

#### Issue: Flows Fail to Execute

**Symptoms:**
- Flow status shows "failed"
- Steps not completing
- Timeout errors

**Diagnostic Steps:**
```bash
# Check flow status
qflow flow status <flow-id>

# View execution logs
qflow exec logs <execution-id>

# Check validation pipeline
qflow validation status <execution-id>

# Monitor resource usage
qflow metrics flows
```

**Common Causes and Solutions:**

##### Validation Pipeline Failures
```bash
# Check validation layers
qflow validation test --layer qlock
qflow validation test --layer qonsent
qflow validation test --layer qindex
qflow validation test --layer qerberos

# View validation logs
qflow logs validation --execution <execution-id>

# Reset validation cache
qflow validation cache clear
```

##### Resource Exhaustion
```bash
# Check memory usage
qflow metrics memory

# Check CPU usage
qflow metrics cpu

# Adjust resource limits
qflow config set engine.maxMemoryMB 2048
qflow config set sandbox.maxMemoryMB 256
```

##### Permission Issues
```bash
# Check sQuid authentication
qflow auth status

# Verify permissions
qflow permissions check <flow-id> <user-id>

# Refresh authentication
qflow auth refresh
```

#### Issue: Slow Flow Execution

**Diagnostic Steps:**
```bash
# Check execution metrics
qflow metrics execution --flow <flow-id>

# Profile execution
qflow profile start <execution-id>

# Check node performance
qflow network node-stats
```

**Solutions:**

##### Enable Caching
```yaml
qflow:
  validation:
    cache:
      enabled: true
      maxSize: 10000
      ttlSeconds: 300
  engine:
    cache:
      enabled: true
      maxFlows: 1000
```

##### Optimize Node Selection
```bash
# Update node selection criteria
qflow config set nodeSelection.preferLowLatency true
qflow config set nodeSelection.maxLatencyMs 100

# Exclude slow nodes
qflow network exclude-node <slow-node-id>
```

##### Parallel Execution
```yaml
# Enable parallel step execution
steps:
  - id: step1
    type: task
    parallel: true
  - id: step2
    type: task
    parallel: true
```

### 4. Authentication and Authorization Issues

#### Issue: Authentication Failures

**Symptoms:**
- "Unauthorized" errors
- JWT token errors
- sQuid connection failures

**Diagnostic Steps:**
```bash
# Check authentication status
qflow auth status

# Verify JWT token
qflow auth verify <token>

# Test sQuid connection
curl http://localhost:3001/health

# Check identity
qflow identity whoami
```

**Solutions:**

##### JWT Token Issues
```bash
# Refresh JWT token
qflow auth login

# Check token expiration
qflow auth token-info

# Update JWT secret
qflow config set security.jwtSecret <new-secret>
```

##### sQuid Integration Issues
```bash
# Test sQuid connectivity
curl http://squid-service:3001/api/v1/health

# Update sQuid configuration
qflow config set squid.serviceUrl http://new-squid-url

# Reset sQuid connection
qflow auth reset
```

#### Issue: Permission Denied Errors

**Diagnostic Steps:**
```bash
# Check user permissions
qflow permissions list <user-id>

# Verify DAO membership
qflow dao membership <user-id> <dao-id>

# Check flow permissions
qflow flow permissions <flow-id>
```

**Solutions:**
```bash
# Grant flow permissions
qflow permissions grant <user-id> <flow-id> execute

# Add user to DAO
qflow dao add-member <dao-id> <user-id>

# Update flow ownership
qflow flow transfer <flow-id> <new-owner-id>
```

### 5. Performance Issues

#### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- Slow performance
- System instability

**Diagnostic Steps:**
```bash
# Check memory usage
free -h
qflow metrics memory

# Profile memory usage
qflow profile memory --duration 60s

# Check for memory leaks
qflow debug memory-leaks
```

**Solutions:**

##### Adjust Memory Limits
```yaml
qflow:
  engine:
    maxMemoryMB: 1024
    gcThresholdMB: 512
  sandbox:
    maxMemoryMB: 128
    memoryLimitPerFlow: 64
```

##### Enable Garbage Collection
```bash
# Force garbage collection
qflow gc force

# Adjust GC settings
qflow config set engine.gcInterval 30000
qflow config set engine.gcThreshold 80
```

##### Clear Caches
```bash
# Clear all caches
qflow cache clear

# Clear specific caches
qflow cache clear validation
qflow cache clear flows
```

#### Issue: High CPU Usage

**Diagnostic Steps:**
```bash
# Check CPU usage
top -p $(pgrep qflow)
qflow metrics cpu

# Profile CPU usage
qflow profile cpu --duration 60s

# Check concurrent flows
qflow metrics concurrent-flows
```

**Solutions:**
```bash
# Reduce concurrent flows
qflow config set engine.maxConcurrentFlows 50

# Adjust CPU limits
qflow config set sandbox.maxCpuTime 10000

# Enable CPU throttling
qflow config set engine.cpuThrottleThreshold 80
```

### 6. Storage and Data Issues

#### Issue: IPFS Storage Problems

**Symptoms:**
- Cannot save flow state
- Data corruption errors
- Storage full errors

**Diagnostic Steps:**
```bash
# Check IPFS status
ipfs repo stat

# Verify IPFS connectivity
ipfs id

# Check storage usage
df -h /data/ipfs

# Test IPFS operations
echo "test" | ipfs add
```

**Solutions:**

##### Clean Up IPFS Storage
```bash
# Garbage collect IPFS
ipfs repo gc

# Remove unused blocks
ipfs pin ls --type=recursive | head -100 | ipfs pin rm

# Optimize IPFS repository
ipfs repo fsck
```

##### Increase Storage Capacity
```bash
# Add more storage
mount /dev/sdb1 /data/ipfs-extra

# Update IPFS configuration
ipfs config Datastore.Path /data/ipfs-extra
```

#### Issue: Data Corruption

**Diagnostic Steps:**
```bash
# Check data integrity
qflow data verify

# Verify IPFS blocks
ipfs repo verify

# Check execution state
qflow exec verify <execution-id>
```

**Solutions:**
```bash
# Restore from backup
qflow restore --backup /backup/latest

# Repair corrupted data
qflow data repair --execution <execution-id>

# Reset to last known good state
qflow exec rollback <execution-id> <checkpoint-id>
```

### 7. Sandbox and Security Issues

#### Issue: Sandbox Execution Failures

**Symptoms:**
- WASM execution errors
- Sandbox timeout errors
- Security violations

**Diagnostic Steps:**
```bash
# Check sandbox status
qflow sandbox status

# Test WASM runtime
qflow sandbox test

# Check security policies
qflow security policies list
```

**Solutions:**

##### WASM Runtime Issues
```bash
# Update WASM runtime
qflow sandbox update-runtime

# Check WASM module
qflow sandbox validate <wasm-module>

# Reset sandbox environment
qflow sandbox reset
```

##### Security Policy Violations
```bash
# Check security logs
qflow logs security

# Update security policies
qflow security policy update <policy-id>

# Whitelist trusted modules
qflow security whitelist add <module-hash>
```

#### Issue: Code Template Approval

**Diagnostic Steps:**
```bash
# Check template status
qflow templates status <template-id>

# View approval process
qflow dao approval status <template-id>

# Check DAO governance
qflow dao governance status
```

**Solutions:**
```bash
# Submit for approval
qflow templates submit <template-id>

# Vote on template
qflow dao vote <proposal-id> approve

# Override for testing
qflow templates approve --override <template-id>
```

### 8. Monitoring and Alerting Issues

#### Issue: Missing Metrics

**Symptoms:**
- No metrics data
- Monitoring dashboard empty
- Alerts not firing

**Diagnostic Steps:**
```bash
# Check metrics endpoint
curl http://localhost:9090/metrics

# Verify monitoring configuration
qflow config get monitoring

# Check metrics collection
qflow metrics status
```

**Solutions:**
```bash
# Enable metrics collection
qflow config set monitoring.enableMetrics true

# Restart metrics service
qflow metrics restart

# Reset metrics database
qflow metrics reset
```

#### Issue: Alert Configuration

**Diagnostic Steps:**
```bash
# Check alert rules
qflow alerts list

# Test alert delivery
qflow alerts test <alert-id>

# Check notification channels
qflow notifications status
```

**Solutions:**
```bash
# Update alert thresholds
qflow alerts update <alert-id> --threshold 80

# Add notification channel
qflow notifications add slack <webhook-url>

# Test alert system
qflow alerts test-all
```

## Advanced Troubleshooting

### Debug Mode

#### Enable Debug Logging
```bash
# Set debug log level
qflow config set logging.level debug

# Enable component-specific debugging
qflow debug enable engine
qflow debug enable validation
qflow debug enable network

# View debug logs
qflow logs --level debug --follow
```

#### Debug Commands
```bash
# Dump system state
qflow debug dump-state

# Trace execution
qflow debug trace <execution-id>

# Profile performance
qflow debug profile --duration 60s

# Memory analysis
qflow debug memory-analysis
```

### Network Debugging

#### Libp2p Debugging
```bash
# Enable libp2p debug logs
export DEBUG=libp2p*

# Check peer connections
qflow network debug peers

# Trace network messages
qflow network debug messages

# Test connectivity
qflow network debug connectivity
```

#### IPFS Debugging
```bash
# Enable IPFS debug logs
export IPFS_LOGGING=debug

# Check IPFS connectivity
ipfs diag sys

# Network diagnostics
ipfs diag net

# Performance analysis
ipfs diag profile cpu
```

### Database Debugging

#### IPFS Repository Issues
```bash
# Check repository integrity
ipfs repo verify

# Repair repository
ipfs repo fsck --repair

# Migrate repository
ipfs repo migrate

# Reset repository
ipfs repo gc --aggressive
```

#### State Management Issues
```bash
# Verify execution state
qflow state verify <execution-id>

# Repair state corruption
qflow state repair <execution-id>

# Rollback to checkpoint
qflow state rollback <execution-id> <checkpoint-id>
```

## Performance Optimization

### System Tuning

#### Operating System Tuning
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize network settings
echo "net.core.rmem_max = 16777216" >> /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" >> /etc/sysctl.conf
sysctl -p

# Optimize memory settings
echo "vm.swappiness = 10" >> /etc/sysctl.conf
echo "vm.dirty_ratio = 15" >> /etc/sysctl.conf
```

#### Application Tuning
```yaml
qflow:
  engine:
    maxConcurrentFlows: 100
    workerThreads: 4
    gcInterval: 30000
  validation:
    cache:
      enabled: true
      maxSize: 10000
      ttlSeconds: 300
  networking:
    connectionPoolSize: 50
    keepAliveTimeout: 30000
```

### Monitoring Optimization

#### Metrics Collection
```yaml
qflow:
  monitoring:
    metricsInterval: 10000
    enableDetailedMetrics: true
    enableTracing: true
    samplingRate: 0.1
```

#### Log Management
```yaml
qflow:
  logging:
    level: info
    maxFileSize: 100MB
    maxFiles: 10
    enableRotation: true
    enableCompression: true
```

## Prevention Strategies

### Regular Maintenance

#### Daily Tasks
```bash
#!/bin/bash
# daily-maintenance.sh

# Check system health
qflow health --verbose

# Monitor resource usage
qflow metrics system

# Check for errors
qflow logs --level error --since 24h

# Verify backups
qflow backup verify
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

# Update system packages
apt update && apt upgrade -y

# Clean up logs
qflow logs cleanup --older-than 7d

# Optimize IPFS
ipfs repo gc

# Performance analysis
qflow metrics analyze --period 7d
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

# Update Qflow
qflow update --check

# Security audit
qflow security audit

# Performance review
qflow performance review --period 30d

# Backup verification
qflow backup test-restore
```

### Monitoring Setup

#### Health Checks
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "qflow", "health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### Alerting Rules
```yaml
# alerting-rules.yml
groups:
  - name: qflow
    rules:
      - alert: QflowDown
        expr: up{job="qflow"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Qflow service is down"
          
      - alert: HighErrorRate
        expr: rate(qflow_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
```

### Security Hardening

#### Access Control
```bash
# Create dedicated user
useradd -r -s /bin/false qflow

# Set file permissions
chown -R qflow:qflow /app/qflow
chmod 750 /app/qflow
chmod 640 /app/qflow/config/*
```

#### Network Security
```bash
# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.0.0.0/8 to any port 8080
ufw allow from 10.0.0.0/8 to any port 9090
ufw allow 4001/tcp
ufw enable
```

#### Audit Logging
```yaml
qflow:
  security:
    auditLogging:
      enabled: true
      logLevel: info
      includePayloads: false
      retentionDays: 90
```

## Emergency Procedures

### Service Recovery

#### Quick Recovery
```bash
#!/bin/bash
# emergency-recovery.sh

# Stop all services
systemctl stop qflow

# Check for corruption
qflow data verify --repair

# Restore from backup if needed
if [ $? -ne 0 ]; then
    qflow restore --backup /backup/latest
fi

# Start services
systemctl start qflow

# Verify recovery
qflow health --wait 60
```

#### Full System Recovery
```bash
#!/bin/bash
# full-recovery.sh

# Stop all services
docker-compose down

# Restore data
tar -xzf /backup/latest/qflow-data.tar.gz -C /data/

# Restore configuration
cp -r /backup/latest/config/* /app/config/

# Start services
docker-compose up -d

# Wait for services to be ready
sleep 30

# Verify system health
qflow health --verbose
```

### Incident Response

#### Incident Classification
- **P0 (Critical)**: Complete service outage
- **P1 (High)**: Major functionality impaired
- **P2 (Medium)**: Minor functionality impaired
- **P3 (Low)**: Cosmetic issues

#### Response Procedures

##### P0 - Critical Incident
1. **Immediate Response** (0-5 minutes):
   ```bash
   # Check service status
   qflow health emergency
   
   # Enable emergency mode
   qflow emergency enable
   
   # Notify stakeholders
   qflow notify emergency "Critical incident detected"
   ```

2. **Investigation** (5-15 minutes):
   ```bash
   # Collect diagnostic data
   qflow debug collect-all
   
   # Check recent changes
   qflow audit recent-changes
   
   # Analyze logs
   qflow logs analyze --emergency
   ```

3. **Resolution** (15+ minutes):
   ```bash
   # Apply emergency fix
   qflow emergency fix apply
   
   # Verify resolution
   qflow health verify
   
   # Document incident
   qflow incident document
   ```

## Support Resources

### Documentation
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./api/README.md)
- [Migration Guide](./MIGRATION.md)

### Community Support
- **GitHub Issues**: [https://github.com/anarq/qflow/issues](https://github.com/anarq/qflow/issues)
- **Discord Community**: [https://discord.gg/qflow](https://discord.gg/qflow)
- **Stack Overflow**: Tag questions with `qflow`

### Professional Support
- **Email**: support@anarq.org
- **Enterprise Support**: enterprise@anarq.org
- **Emergency Hotline**: +1-555-QFLOW-911

### Escalation Matrix

| Issue Severity | Response Time | Contact Method |
|----------------|---------------|----------------|
| P0 (Critical) | 15 minutes | Emergency hotline |
| P1 (High) | 2 hours | Email + Phone |
| P2 (Medium) | 8 hours | Email |
| P3 (Low) | 24 hours | Community forum |

---

*Last updated: 2024-01-15*