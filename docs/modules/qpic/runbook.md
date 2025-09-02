# Qpic Operational Runbook

## Service Overview

## Service Description
Media Management module for Q ecosystem with transcoding, optimization, and marketplace integration

## Key Features
- Media management
- Transcoding
- Optimization
- Marketplace integration

## Architecture
- **Type**: Hybrid (HTTP + MCP)
- **Port**: 3070
- **Protocol**: HTTP/REST + MCP
- **Database**: In-memory + IPFS
- **Storage**: IPFS Primary

## Dependencies
- sQuid (identity verification)
- Qonsent (permission checking)
- Qerberos (audit logging)
- IPFS (content storage)

## SLA Targets
- **Availability**: 99.9%
- **Response Time**: p99 < 200ms
- **Error Rate**: < 0.1%
- **Recovery Time**: < 5 minutes


## Health Monitoring

## Health Check Endpoints
- `/health`: Overall service health
- `/ready`: Readiness for traffic
- `/live`: Liveness check

## Key Metrics to Monitor
- Request rate and latency
- Error rate by endpoint
- Dependency health status
- Resource utilization (CPU, memory)
- Queue depths and processing times

## Alerting Thresholds
- **Critical**: Service down, error rate > 5%
- **Warning**: High latency, resource usage > 80%
- **Info**: Dependency degradation, queue buildup

## Monitoring Tools
- Prometheus metrics collection
- Grafana dashboards
- AlertManager notifications
- Custom health checks


## Incident Response

## Incident Classification
- **P1**: Service completely down
- **P2**: Major functionality impaired
- **P3**: Minor issues, workarounds available
- **P4**: Cosmetic issues, no user impact

## Response Procedures

### P1 Incidents (Service Down)
1. **Immediate**: Check service status and logs
2. **5 minutes**: Attempt service restart
3. **10 minutes**: Escalate to on-call engineer
4. **15 minutes**: Implement emergency procedures

### P2 Incidents (Major Issues)
1. **Immediate**: Assess impact and scope
2. **15 minutes**: Implement workarounds if available
3. **30 minutes**: Begin root cause analysis
4. **1 hour**: Provide status update

## Emergency Contacts
- On-call Engineer: +1-XXX-XXX-XXXX
- Engineering Manager: +1-XXX-XXX-XXXX
- Operations Team: ops@anarq.com

## Escalation Matrix
1. Service Owner → Engineering Team
2. Engineering Team → Engineering Manager
3. Engineering Manager → CTO
4. CTO → CEO (for critical business impact)


## Maintenance Procedures

## Routine Maintenance

### Daily Tasks
- Review service logs for errors
- Check resource utilization trends
- Verify backup completion
- Monitor dependency health

### Weekly Tasks
- Review performance metrics
- Update security patches
- Clean up old logs and data
- Test disaster recovery procedures

### Monthly Tasks
- Capacity planning review
- Security audit
- Dependency updates
- Performance optimization

## Maintenance Windows
- **Preferred**: Sunday 02:00-06:00 UTC
- **Emergency**: Any time with approval
- **Notification**: 48 hours advance notice

## Pre-maintenance Checklist
- [ ] Backup current state
- [ ] Prepare rollback plan
- [ ] Notify stakeholders
- [ ] Verify maintenance window
- [ ] Test in staging environment

## Post-maintenance Checklist
- [ ] Verify service functionality
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Notify completion


## Backup and Recovery

## Backup Strategy

### Data Types
- **Configuration**: Environment variables, config files
- **Application Data**: Database contents, user data
- **Logs**: Application and audit logs
- **Secrets**: Encrypted keys and certificates

### Backup Schedule
- **Real-time**: Critical transactional data
- **Hourly**: Application state and logs
- **Daily**: Full system backup
- **Weekly**: Long-term archive

### Backup Locations
- **Primary**: Local encrypted storage
- **Secondary**: Cloud storage (encrypted)
- **Tertiary**: Offline backup (monthly)

## Recovery Procedures

### Data Recovery
1. Identify data loss scope and timeline
2. Select appropriate backup point
3. Verify backup integrity
4. Restore data to staging environment
5. Validate data consistency
6. Promote to production

### Service Recovery
1. Assess service state and dependencies
2. Restore from last known good state
3. Verify configuration and connections
4. Perform health checks
5. Resume traffic gradually

### Disaster Recovery
1. Activate disaster recovery site
2. Restore from offsite backups
3. Reconfigure DNS and load balancers
4. Validate full system functionality
5. Communicate status to stakeholders

## Recovery Time Objectives
- **RTO**: 15 minutes (maximum downtime)
- **RPO**: 5 minutes (maximum data loss)
- **MTTR**: 10 minutes (mean time to recovery)


## Scaling Procedures

## Scaling Triggers

### Horizontal Scaling (Add Instances)
- CPU usage > 70% for 10 minutes
- Memory usage > 80% for 10 minutes
- Request queue depth > 100
- Response time p95 > 500ms

### Vertical Scaling (Increase Resources)
- Consistent resource constraints
- Memory leaks or fragmentation
- CPU-bound operations
- I/O bottlenecks

## Scaling Procedures

### Manual Scaling
```bash
# Scale up
docker-compose up --scale qpic=3

# Kubernetes scaling
kubectl scale deployment qpic --replicas=3

# Verify scaling
kubectl get pods -l app=qpic
```

### Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: qpic-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: qpic
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Load Testing
```bash
# Basic load test
ab -n 1000 -c 10 http://localhost:3070/health

# Advanced load test
k6 run --vus 50 --duration 5m load-test.js
```


## Security Procedures

## Security Monitoring

### Key Security Metrics
- Failed authentication attempts
- Unusual access patterns
- Privilege escalation attempts
- Data access anomalies

### Security Alerts
- Multiple failed logins
- Access from unusual locations
- Suspicious API usage patterns
- Potential data exfiltration

## Incident Response

### Security Incident Classification
- **Critical**: Active breach, data compromise
- **High**: Attempted breach, vulnerability exploitation
- **Medium**: Suspicious activity, policy violations
- **Low**: Minor security events

### Response Procedures
1. **Immediate**: Isolate affected systems
2. **15 minutes**: Assess scope and impact
3. **30 minutes**: Implement containment measures
4. **1 hour**: Begin forensic analysis
5. **4 hours**: Provide preliminary report

## Security Hardening

### Access Control
- Implement least privilege principles
- Regular access reviews
- Multi-factor authentication
- Role-based permissions

### Network Security
- Firewall configuration
- Network segmentation
- Encrypted communications
- VPN access for remote management

### Data Protection
- Encryption at rest and in transit
- Regular security scans
- Vulnerability assessments
- Penetration testing

