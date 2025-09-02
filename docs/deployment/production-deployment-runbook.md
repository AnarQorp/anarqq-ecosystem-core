# Production Deployment Runbook

## Overview

This runbook provides comprehensive procedures for deploying the AnarQ&Q ecosystem to QNET Phase 2 production environment. It includes pre-deployment checks, deployment procedures, validation steps, and rollback procedures.

## Prerequisites

### System Requirements

- **QNET Phase 2 Access**: Valid deployment credentials and endpoint access
- **Pi Network Mainnet**: Approved mainnet API keys and contract addresses
- **Production Infrastructure**: Database, Redis, IPFS cluster configured
- **Monitoring Setup**: Observability and alerting systems ready
- **Backup Systems**: Automated backup and disaster recovery configured

### Required Credentials

```bash
# QNET Phase 2
export QNET_PHASE2_ENDPOINT="https://api.phase2.qnet.anarq.org"
export QNET_DEPLOYMENT_KEY="your_qnet_deployment_key"

# Pi Network Mainnet
export PI_MAINNET_API_KEY="your_pi_mainnet_api_key"
export PI_PAYMENT_CONTRACT_ADDRESS="0x..."
export PI_GOVERNANCE_CONTRACT_ADDRESS="0x..."
export PI_IDENTITY_CONTRACT_ADDRESS="0x..."

# Production Databases
export DATABASE_URL_PRODUCTION="postgresql://..."
export REDIS_URL_PRODUCTION="redis://..."

# Security Keys
export ENCRYPTION_KEY_PRODUCTION="your_production_encryption_key"
export JWT_SECRET_PRODUCTION="your_production_jwt_secret"

# IPFS Cluster
export IPFS_CLUSTER_ENDPOINT="https://cluster.ipfs.anarq.org"
```

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Production configuration files validated
- [ ] Security audit completed
- [ ] Performance benchmarks passed
- [ ] Backup systems verified
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures tested
- [ ] Team notifications sent

## Deployment Procedures

### 1. Pre-Deployment Phase

#### Security Validation

```bash
# Run security audit
./scripts/security-audit.sh --env=production

# Validate encryption keys
node -e "
if (process.env.ENCRYPTION_KEY_PRODUCTION.length < 32) {
  console.error('Encryption key too short');
  process.exit(1);
}
console.log('Encryption key validated');
"

# Check for secrets in code
if grep -r "password\|secret\|key" --include="*.js" --include="*.mjs" . | grep -v node_modules | grep -v example; then
  echo "ERROR: Potential secrets found in code"
  exit 1
fi
```

#### Configuration Validation

```bash
# Validate production configuration
jq empty ./config/qnet-phase2.json
jq empty ./config/production.json

# Test database connectivity
psql "$DATABASE_URL_PRODUCTION" -c "SELECT 1;"

# Test Redis connectivity
redis-cli -u "$REDIS_URL_PRODUCTION" ping

# Test QNET connectivity
curl -s "$QNET_PHASE2_ENDPOINT/health"
```

#### Performance Benchmarks

```bash
# Run performance tests
npm run test:performance -- --env=production --threshold=strict

# Expected results:
# - P95 latency < 150ms
# - P99 latency < 200ms
# - Error rate < 5%
# - Cache hit rate > 85%
```

### 2. Deployment Execution

#### Automated Deployment

```bash
# Execute deployment script
./scripts/deploy-qnet-phase2.sh

# Monitor deployment progress
tail -f ./artifacts/deployment/deployment-*.log
```

#### Manual Deployment Steps

If automated deployment fails, follow these manual steps:

1. **Create Deployment Package**
```bash
DEPLOYMENT_ID="deploy-$(date +%s)"
tar -czf "./artifacts/deployment/anarq-ecosystem-${DEPLOYMENT_ID}.tar.gz" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=artifacts/demo \
  .
```

2. **Upload to QNET**
```bash
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@./artifacts/deployment/anarq-ecosystem-${DEPLOYMENT_ID}.tar.gz" \
  "$QNET_PHASE2_ENDPOINT/deploy"
```

3. **Deploy Configuration**
```bash
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  -H "Content-Type: application/json" \
  -d @./config/qnet-phase2.json \
  "$QNET_PHASE2_ENDPOINT/config"
```

4. **Start Services**
```bash
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  "$QNET_PHASE2_ENDPOINT/services/start"
```

### 3. Post-Deployment Validation

#### Health Checks

```bash
# Check overall system health
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/health" | jq '.data.overall'

# Expected: "healthy"

# Check individual modules
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/health" | jq '.data.modules'
```

#### Integration Tests

```bash
# Run production integration tests
QNET_ENDPOINT="$QNET_PHASE2_ENDPOINT" npm run test:integration:production

# Test Pi Network integration
npm run test:pi-integration -- --env=mainnet

# Test demo scenarios
npm run test:demo -- --env=production
```

#### Performance Validation

```bash
# Monitor performance metrics
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/metrics" | jq '.data.performance'

# Check SLO compliance
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/dashboard" | jq '.data.sloCompliance'
```

#### Decentralization Certification

```bash
# Verify decentralization attestation
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/decentralization" | jq '.data'

# Expected output:
# {
#   "certified": true,
#   "attestationCID": "QmAttestation...",
#   "checks": {
#     "noCentralDatabases": true,
#     "noMessageBrokers": true,
#     "ipfsRequired": true,
#     "libp2pActive": true,
#     "killFirstLauncherTest": "PASS"
#   }
# }
```

## Monitoring and Alerting

### Real-Time Monitoring

#### Health Dashboard

Access the real-time health dashboard:
```
https://dashboard.anarq.org/health
```

Key metrics to monitor:
- Overall system health status
- Individual module health
- Performance metrics (latency, error rate, throughput)
- Security metrics (PII detection, sandbox violations)
- Pi Network integration status

#### Alert Channels

Production alerts are sent to:
- **Email**: ops-team@anarq.org
- **Slack**: #production-alerts
- **Webhook**: https://alerts.anarq.org/webhook
- **Phone**: On-call rotation for critical alerts

### SLO Monitoring

#### Performance SLOs

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| P95 Latency | < 150ms | > 150ms | > 200ms |
| P99 Latency | < 200ms | > 200ms | > 300ms |
| Error Rate | < 5% | > 5% | > 10% |
| Cache Hit Rate | > 85% | < 85% | < 70% |

#### Availability SLOs

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | > 99.9% | < 99.9% | < 99.5% |
| MTTR | < 5 minutes | > 5 minutes | > 15 minutes |
| MTBF | > 24 hours | < 24 hours | < 12 hours |

#### Quality SLOs

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Chain Continuity | 100% | < 100% | < 99% |
| Consensus Success | > 60% | < 60% | < 40% |
| Replay Divergence | < 1% | > 1% | > 5% |

## Rollback Procedures

### Automatic Rollback Triggers

Automatic rollback is triggered when:
- System health remains "unhealthy" for > 5 minutes
- Error rate exceeds 20% for > 2 minutes
- More than 50% of modules are unhealthy
- Critical security violations detected

### Manual Rollback

#### Quick Rollback

```bash
# Find latest deployment
ROLLBACK_DATA=$(ls -t ./artifacts/deployment/rollback-*.json | head -1)

# Execute rollback
./scripts/rollback-deployment.sh "$ROLLBACK_DATA"
```

#### Selective Rollback

```bash
# Rollback services only (keep configuration)
./scripts/rollback-deployment.sh --services-only "$ROLLBACK_DATA"

# Rollback configuration only (keep services)
./scripts/rollback-deployment.sh --config-only "$ROLLBACK_DATA"
```

#### Emergency Rollback

For critical issues requiring immediate rollback:

```bash
# Force rollback without confirmation
./scripts/rollback-deployment.sh --force "$ROLLBACK_DATA"

# Emergency stop all services
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  "$QNET_PHASE2_ENDPOINT/services/emergency-stop"
```

### Rollback Validation

After rollback completion:

1. **Verify System Health**
```bash
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/health" | jq '.data.overall'
```

2. **Run Basic Tests**
```bash
npm run test:integration:basic
```

3. **Check Service Status**
```bash
curl -s "$QNET_PHASE2_ENDPOINT/services/status" | jq '.services'
```

## Disaster Recovery

### Backup Verification

#### Database Backups

```bash
# Verify latest database backup
LATEST_BACKUP=$(aws s3 ls s3://anarq-backups/database/ | sort | tail -1 | awk '{print $4}')
echo "Latest database backup: $LATEST_BACKUP"

# Test backup integrity
pg_restore --list "s3://anarq-backups/database/$LATEST_BACKUP" > /dev/null
```

#### Configuration Backups

```bash
# Verify configuration backups
aws s3 ls s3://anarq-backups/config/ | tail -5

# Test configuration restore
aws s3 cp "s3://anarq-backups/config/latest.tar.gz" /tmp/
tar -tzf /tmp/latest.tar.gz
```

### Disaster Recovery Procedures

#### Complete System Recovery

1. **Assess Damage**
```bash
# Check system status
./scripts/disaster-assessment.sh

# Generate damage report
./scripts/generate-damage-report.sh
```

2. **Restore from Backup**
```bash
# Restore database
./scripts/restore-database.sh --backup=latest

# Restore configuration
./scripts/restore-configuration.sh --backup=latest

# Restore IPFS data
./scripts/restore-ipfs.sh --backup=latest
```

3. **Redeploy Services**
```bash
# Deploy to backup region
QNET_PHASE2_ENDPOINT="https://backup.qnet.anarq.org" \
./scripts/deploy-qnet-phase2.sh --disaster-recovery
```

#### Regional Failover

```bash
# Activate backup region
./scripts/activate-backup-region.sh --region=eu-west

# Update DNS routing
./scripts/update-dns-routing.sh --primary=eu-west

# Verify failover
./scripts/verify-failover.sh
```

## Maintenance Procedures

### Scheduled Maintenance

#### Pre-Maintenance

1. **Schedule Notification**
```bash
# Send maintenance notification
./scripts/send-maintenance-notification.sh \
  --start="2024-02-01T02:00:00Z" \
  --duration="2h" \
  --description="System upgrade and optimization"
```

2. **Enable Maintenance Mode**
```bash
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": true, "message": "Scheduled maintenance in progress"}' \
  "$QNET_PHASE2_ENDPOINT/maintenance"
```

#### During Maintenance

1. **Create Backup**
```bash
./scripts/create-maintenance-backup.sh
```

2. **Perform Updates**
```bash
# Update system components
./scripts/update-system-components.sh

# Update configurations
./scripts/update-configurations.sh

# Update dependencies
npm update --production
```

3. **Validate Changes**
```bash
# Run validation tests
npm run test:validation -- --env=maintenance

# Check system integrity
./scripts/validate-system-integrity.sh
```

#### Post-Maintenance

1. **Disable Maintenance Mode**
```bash
curl -X POST \
  -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": false}' \
  "$QNET_PHASE2_ENDPOINT/maintenance"
```

2. **Verify System Health**
```bash
# Full health check
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/health"

# Performance validation
npm run test:performance -- --env=production
```

3. **Send Completion Notification**
```bash
./scripts/send-maintenance-completion.sh
```

## Troubleshooting

### Common Issues

#### High Latency

**Symptoms**: P99 latency > 200ms
**Investigation**:
```bash
# Check database performance
psql "$DATABASE_URL_PRODUCTION" -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check Redis performance
redis-cli -u "$REDIS_URL_PRODUCTION" --latency-history

# Check IPFS performance
curl -w "@curl-format.txt" -s "$IPFS_CLUSTER_ENDPOINT/api/v0/version"
```

**Resolution**:
- Scale up database resources
- Optimize slow queries
- Increase Redis memory
- Add IPFS nodes

#### High Error Rate

**Symptoms**: Error rate > 10%
**Investigation**:
```bash
# Check error logs
curl -s "$QNET_PHASE2_ENDPOINT/api/logs?level=error&limit=100"

# Check service status
curl -s "$QNET_PHASE2_ENDPOINT/services/status"

# Check Pi Network status
curl -s "https://api.mainnet.minepi.com/v2/status"
```

**Resolution**:
- Restart failing services
- Check Pi Network connectivity
- Validate configuration
- Scale up resources

#### Consensus Failures

**Symptoms**: Consensus success < 60%
**Investigation**:
```bash
# Check consensus logs
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/consensus/logs"

# Check node connectivity
curl -s "$QNET_PHASE2_ENDPOINT/api/qnet/peers"

# Check quorum status
curl -s "$QNET_PHASE2_ENDPOINT/api/validation/consensus/quorum"
```

**Resolution**:
- Check network connectivity
- Restart consensus service
- Verify node synchronization
- Check for Byzantine nodes

### Emergency Contacts

#### On-Call Rotation

- **Primary**: +1-555-0101 (ops-primary@anarq.org)
- **Secondary**: +1-555-0102 (ops-secondary@anarq.org)
- **Escalation**: +1-555-0103 (ops-manager@anarq.org)

#### External Support

- **QNET Support**: support@qnet.anarq.org
- **Pi Network Support**: developers@minepi.com
- **Infrastructure Provider**: support@cloudprovider.com

## Security Procedures

### Security Incident Response

#### Detection

Automated detection through:
- Security monitoring alerts
- Anomaly detection systems
- User reports
- External security notifications

#### Response Procedure

1. **Immediate Response** (0-15 minutes)
```bash
# Assess threat level
./scripts/assess-security-threat.sh

# Isolate affected systems if needed
./scripts/isolate-systems.sh --threat-level=high

# Notify security team
./scripts/notify-security-team.sh --incident-id=$INCIDENT_ID
```

2. **Investigation** (15 minutes - 2 hours)
```bash
# Collect evidence
./scripts/collect-security-evidence.sh --incident-id=$INCIDENT_ID

# Analyze logs
./scripts/analyze-security-logs.sh --timeframe="last 24h"

# Check for data breaches
./scripts/check-data-breach.sh
```

3. **Containment** (2-4 hours)
```bash
# Apply security patches
./scripts/apply-security-patches.sh

# Update security rules
./scripts/update-security-rules.sh

# Rotate compromised credentials
./scripts/rotate-credentials.sh --scope=affected
```

4. **Recovery** (4-24 hours)
```bash
# Restore from clean backups if needed
./scripts/restore-from-clean-backup.sh

# Validate system integrity
./scripts/validate-system-integrity.sh --full-scan

# Resume normal operations
./scripts/resume-normal-operations.sh
```

### Compliance Auditing

#### Regular Audits

```bash
# Run compliance audit
./scripts/compliance-audit.sh --framework=gdpr,sox,iso27001

# Generate compliance report
./scripts/generate-compliance-report.sh --period=quarterly

# Check audit trail integrity
./scripts/verify-audit-trail.sh --timeframe="last 90 days"
```

#### Data Protection

```bash
# Verify encryption at rest
./scripts/verify-encryption-at-rest.sh

# Check data retention policies
./scripts/check-data-retention.sh

# Validate access controls
./scripts/validate-access-controls.sh
```

## Performance Optimization

### Regular Optimization Tasks

#### Database Optimization

```bash
# Analyze database performance
psql "$DATABASE_URL_PRODUCTION" -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;"

# Update table statistics
psql "$DATABASE_URL_PRODUCTION" -c "ANALYZE;"

# Reindex if needed
psql "$DATABASE_URL_PRODUCTION" -c "REINDEX DATABASE anarq_production;"
```

#### Cache Optimization

```bash
# Check cache hit rates
redis-cli -u "$REDIS_URL_PRODUCTION" info stats | grep hit_rate

# Optimize cache configuration
./scripts/optimize-cache-config.sh

# Clear stale cache entries
./scripts/clear-stale-cache.sh --age="7d"
```

#### IPFS Optimization

```bash
# Check IPFS repository size
curl -s "$IPFS_CLUSTER_ENDPOINT/api/v0/repo/stat"

# Garbage collect old data
curl -X POST "$IPFS_CLUSTER_ENDPOINT/api/v0/repo/gc"

# Optimize pin set
./scripts/optimize-ipfs-pins.sh
```

### Capacity Planning

#### Resource Monitoring

```bash
# Monitor resource usage trends
./scripts/monitor-resource-trends.sh --period="30d"

# Generate capacity report
./scripts/generate-capacity-report.sh

# Predict future resource needs
./scripts/predict-resource-needs.sh --horizon="90d"
```

#### Scaling Decisions

```bash
# Check auto-scaling metrics
curl -s "$QNET_PHASE2_ENDPOINT/api/scaling/metrics"

# Review scaling events
curl -s "$QNET_PHASE2_ENDPOINT/api/scaling/events?limit=50"

# Adjust scaling policies if needed
./scripts/adjust-scaling-policies.sh
```

This production deployment runbook provides comprehensive procedures for managing the AnarQ&Q ecosystem in production. Regular review and updates of these procedures ensure reliable and secure operations.