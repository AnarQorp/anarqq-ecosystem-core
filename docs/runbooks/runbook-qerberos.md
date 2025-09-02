# qerberos Operational Runbook

## Module Overview

**Name**: qerberos
**Description**: Qerberos provides security monitoring, audit logging, anomaly detection, and risk scoring
for the Q ecosystem. It offers immutable audit trails, ML-based threat detection,
and automated compliance reporting.

**Version**: 1.0.0

## Health Checks

### Endpoints
- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Metrics**: `GET /metrics`

### Expected Responses
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "squid": { "status": "up", "latency": 50 },
    "qonsent": { "status": "up", "latency": 30 }
  }
}
```

## Service Management

### Start Service
```bash
cd modules/qerberos
npm start
# or
docker-compose up -d
```

### Stop Service
```bash
# Graceful shutdown
npm run stop
# or
docker-compose down
```

### Restart Service
```bash
# Rolling restart
npm run restart
# or
docker-compose restart
```

## Troubleshooting

### Service Won't Start
1. Check port availability: `lsof -i :3000`
2. Verify environment variables: `env | grep QERBEROS`
3. Check dependencies: `curl http://localhost:3010/health`
4. Review logs: `docker logs qerberos`

### High Error Rate
1. Check error logs: `tail -f logs/error.log`
2. Verify dependencies: Test upstream services
3. Check resource usage: `docker stats qerberos`
4. Review recent deployments: Check for recent changes

### Performance Issues
1. Monitor metrics: Check /metrics endpoint
2. Analyze slow queries: Review database logs
3. Check memory usage: `ps aux | grep qerberos`
4. Review connection pools: Check pool statistics

## Monitoring

### Key Metrics
- **Request Rate**: requests/second
- **Error Rate**: errors/total requests
- **Response Time**: p50, p95, p99 latency
- **Resource Usage**: CPU, memory, disk

### Alerts
- **High Error Rate**: > 1% for 5 minutes
- **High Latency**: p99 > 500ms for 5 minutes
- **Service Down**: Health check fails for 2 minutes
- **High Memory**: > 80% for 10 minutes

## Backup and Recovery

### Data Backup
```bash
# Backup configuration
cp -r config/ backup/config-$(date +%Y%m%d)/

# Backup data (if applicable)
# No specific backup commands
```

### Recovery Procedure
```bash
# Stop service
docker-compose down

# Restore configuration
cp -r backup/config-latest/ config/

# Restore data
# No specific restore commands

# Start service
docker-compose up -d

# Verify health
curl http://localhost:3000/health
```

## Scaling

### Horizontal Scaling
```bash
# Scale up
docker-compose up -d --scale qerberos=3

# Scale down
docker-compose up -d --scale qerberos=1
```

### Vertical Scaling
```yaml
# Update docker-compose.yml
services:
  qerberos:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

## Security

### Access Control
- All endpoints require sQuid authentication
- Permissions checked via Qonsent
- Rate limiting enabled by default

### Incident Response
1. **Isolate**: Stop affected instances
2. **Investigate**: Analyze logs and metrics
3. **Contain**: Prevent further damage
4. **Recover**: Restore from clean state
5. **Learn**: Update security measures

## Maintenance

### Regular Tasks
- **Daily**: Check health and metrics
- **Weekly**: Review logs and performance
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Update Procedure
1. **Test**: Deploy to staging environment
2. **Backup**: Create recovery point
3. **Deploy**: Rolling update to production
4. **Verify**: Run health checks
5. **Monitor**: Watch for issues

## Contact Information

- **Primary Contact**: qerberos-team@q.network
- **On-Call**: +1-XXX-XXX-XXXX
- **Escalation**: team-lead@q.network
