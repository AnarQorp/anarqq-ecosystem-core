#!/usr/bin/env node

/**
 * Module Documentation Automation
 * Integrates with existing docs system to provide comprehensive module documentation
 */

import { ModuleDocGenerator } from './generate-module-docs.mjs';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import chokidar from 'chokidar';

class ModuleDocsAutomation {
  constructor() {
    this.generator = new ModuleDocGenerator();
    this.watchMode = false;
  }

  async init() {
    await this.generator.init();
  }

  async generateAll() {
    console.log('🚀 Generating comprehensive module documentation...');
    
    try {
      await this.generator.generateAllDocs();
      await this.generateOperationalRunbooks();
      await this.generateIntegrationMatrix();
      await this.generateDeploymentMatrix();
      await this.updateMainDocsIndex();
      
      console.log('✅ All module documentation generated successfully!');
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }

  async generateOperationalRunbooks() {
    console.log('📋 Generating operational runbooks...');
    
    const runbooksDir = 'docs/runbooks';
    await fs.mkdir(runbooksDir, { recursive: true });

    // Generate master runbook
    await this.generateMasterRunbook(runbooksDir);
    
    // Generate module-specific runbooks
    for (const module of this.generator.modules) {
      await this.generateModuleRunbook(module, runbooksDir);
    }
  }

  async generateMasterRunbook(runbooksDir) {
    const content = `# Q Ecosystem Operational Runbooks

This directory contains operational runbooks for all Q ecosystem modules.

## Emergency Procedures

### System-Wide Outage
1. **Assess Impact**: Check health endpoints for all modules
2. **Identify Root Cause**: Review logs and metrics
3. **Activate Incident Response**: Notify stakeholders
4. **Implement Workarounds**: Enable maintenance mode
5. **Apply Fix**: Deploy hotfix or rollback
6. **Verify Recovery**: Test critical paths
7. **Post-Incident Review**: Document lessons learned

### Data Corruption
1. **Stop Write Operations**: Prevent further damage
2. **Assess Scope**: Identify affected data
3. **Restore from Backup**: Use latest clean backup
4. **Verify Integrity**: Run data validation checks
5. **Resume Operations**: Gradually restore services
6. **Monitor Closely**: Watch for recurring issues

### Security Incident
1. **Isolate Affected Systems**: Prevent spread
2. **Preserve Evidence**: Capture logs and state
3. **Assess Damage**: Determine impact scope
4. **Notify Authorities**: Follow compliance requirements
5. **Implement Fixes**: Patch vulnerabilities
6. **Strengthen Defenses**: Update security measures

## Module-Specific Runbooks

${this.generator.modules.map(module => 
  `- [${module.name}](./runbook-${module.name}.md) - ${this.getModuleDescription(module)}`
).join('\n')}

## Monitoring and Alerting

### Key Metrics
- **Availability**: 99.9% uptime SLO
- **Latency**: p99 < 200ms
- **Error Rate**: < 0.1%
- **Throughput**: Module-specific targets

### Alert Escalation
1. **Level 1**: Automated recovery attempts
2. **Level 2**: On-call engineer notification
3. **Level 3**: Team lead escalation
4. **Level 4**: Management notification

## Maintenance Procedures

### Planned Maintenance
1. **Schedule Maintenance Window**: Off-peak hours
2. **Notify Users**: 24-48 hours advance notice
3. **Prepare Rollback Plan**: Test rollback procedure
4. **Execute Maintenance**: Follow checklist
5. **Verify Success**: Run health checks
6. **Notify Completion**: Update status page

### Emergency Maintenance
1. **Assess Urgency**: Determine if emergency
2. **Get Approval**: Emergency change approval
3. **Notify Stakeholders**: Immediate notification
4. **Execute Changes**: Minimal viable fix
5. **Monitor Impact**: Watch for side effects
6. **Document Actions**: Record all changes

## Contact Information

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Team Lead**: team-lead@q.network
- **Management**: management@q.network
- **Security Team**: security@q.network
`;

    await fs.writeFile(path.join(runbooksDir, 'README.md'), content);
  }

  getModuleDescription(module) {
    if (module.openApiSpec?.info?.description) {
      return module.openApiSpec.info.description.split('.')[0];
    }
    if (module.packageInfo?.description) {
      return module.packageInfo.description.split('.')[0];
    }
    return `${module.name} module operations`;
  }

  async generateModuleRunbook(module, runbooksDir) {
    const content = `# ${module.name} Operational Runbook

## Module Overview

**Name**: ${module.name}
**Description**: ${this.getModuleDescription(module)}
**Version**: ${module.packageInfo?.version || '1.0.0'}

## Health Checks

### Endpoints
- **Basic Health**: \`GET /health\`
- **Detailed Health**: \`GET /health/detailed\`
- **Metrics**: \`GET /metrics\`

### Expected Responses
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "${module.packageInfo?.version || '1.0.0'}",
  "dependencies": {
    "squid": { "status": "up", "latency": 50 },
    "qonsent": { "status": "up", "latency": 30 }
  }
}
\`\`\`

## Service Management

### Start Service
\`\`\`bash
cd modules/${module.name}
npm start
# or
docker-compose up -d
\`\`\`

### Stop Service
\`\`\`bash
# Graceful shutdown
npm run stop
# or
docker-compose down
\`\`\`

### Restart Service
\`\`\`bash
# Rolling restart
npm run restart
# or
docker-compose restart
\`\`\`

## Troubleshooting

### Service Won't Start
1. Check port availability: \`lsof -i :3000\`
2. Verify environment variables: \`env | grep ${module.name.toUpperCase()}\`
3. Check dependencies: \`curl http://localhost:3010/health\`
4. Review logs: \`docker logs ${module.name}\`

### High Error Rate
1. Check error logs: \`tail -f logs/error.log\`
2. Verify dependencies: Test upstream services
3. Check resource usage: \`docker stats ${module.name}\`
4. Review recent deployments: Check for recent changes

### Performance Issues
1. Monitor metrics: Check /metrics endpoint
2. Analyze slow queries: Review database logs
3. Check memory usage: \`ps aux | grep ${module.name}\`
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
\`\`\`bash
# Backup configuration
cp -r config/ backup/config-$(date +%Y%m%d)/

# Backup data (if applicable)
${this.getBackupCommands(module)}
\`\`\`

### Recovery Procedure
\`\`\`bash
# Stop service
docker-compose down

# Restore configuration
cp -r backup/config-latest/ config/

# Restore data
${this.getRestoreCommands(module)}

# Start service
docker-compose up -d

# Verify health
curl http://localhost:3000/health
\`\`\`

## Scaling

### Horizontal Scaling
\`\`\`bash
# Scale up
docker-compose up -d --scale ${module.name}=3

# Scale down
docker-compose up -d --scale ${module.name}=1
\`\`\`

### Vertical Scaling
\`\`\`yaml
# Update docker-compose.yml
services:
  ${module.name}:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
\`\`\`

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

- **Primary Contact**: ${module.name}-team@q.network
- **On-Call**: +1-XXX-XXX-XXXX
- **Escalation**: team-lead@q.network
`;

    await fs.writeFile(path.join(runbooksDir, `runbook-${module.name}.md`), content);
  }

  getBackupCommands(module) {
    // Generate module-specific backup commands
    const commands = [];
    
    if (module.name.includes('drive') || module.name.includes('pic')) {
      commands.push('# Backup IPFS data');
      commands.push('ipfs repo gc');
      commands.push('tar -czf backup/ipfs-$(date +%Y%m%d).tar.gz ~/.ipfs');
    }
    
    if (module.name.includes('wallet')) {
      commands.push('# Backup wallet data');
      commands.push('pg_dump wallet_db > backup/wallet-$(date +%Y%m%d).sql');
    }
    
    if (module.name.includes('chat') || module.name.includes('mail')) {
      commands.push('# Backup message data');
      commands.push('mongodump --db messages --out backup/messages-$(date +%Y%m%d)');
    }
    
    return commands.length > 0 ? commands.join('\n') : '# No specific backup commands';
  }

  getRestoreCommands(module) {
    // Generate module-specific restore commands
    const commands = [];
    
    if (module.name.includes('drive') || module.name.includes('pic')) {
      commands.push('# Restore IPFS data');
      commands.push('tar -xzf backup/ipfs-latest.tar.gz -C ~/');
    }
    
    if (module.name.includes('wallet')) {
      commands.push('# Restore wallet data');
      commands.push('psql wallet_db < backup/wallet-latest.sql');
    }
    
    if (module.name.includes('chat') || module.name.includes('mail')) {
      commands.push('# Restore message data');
      commands.push('mongorestore backup/messages-latest/');
    }
    
    return commands.length > 0 ? commands.join('\n') : '# No specific restore commands';
  }

  async generateIntegrationMatrix() {
    console.log('🔗 Generating integration matrix...');
    
    const matrixDir = 'docs/integration';
    await fs.mkdir(matrixDir, { recursive: true });

    const content = `# Q Ecosystem Integration Matrix

This document provides a comprehensive overview of how modules integrate with each other.

## Module Dependencies

| Module | sQuid | Qonsent | Qlock | Qindex | Qerberos | Qmask | Qwallet | IPFS |
|--------|-------|---------|-------|--------|----------|-------|---------|------|
${this.generator.modules.map(module => {
  const deps = this.analyzeModuleDependencies(module);
  return `| ${module.name} | ${deps.squid ? '✅' : '❌'} | ${deps.qonsent ? '✅' : '❌'} | ${deps.qlock ? '✅' : '❌'} | ${deps.qindex ? '✅' : '❌'} | ${deps.qerberos ? '✅' : '❌'} | ${deps.qmask ? '✅' : '❌'} | ${deps.qwallet ? '✅' : '❌'} | ${deps.ipfs ? '✅' : '❌'} |`;
}).join('\n')}

## Integration Patterns

### Authentication Flow (sQuid)
\`\`\`mermaid
sequenceDiagram
    participant Client
    participant Module
    participant sQuid
    
    Client->>Module: Request with sQuid ID
    Module->>sQuid: Verify identity
    sQuid-->>Module: Identity valid
    Module-->>Client: Authorized response
\`\`\`

### Permission Check Flow (Qonsent)
\`\`\`mermaid
sequenceDiagram
    participant Module
    participant Qonsent
    
    Module->>Qonsent: Check permission
    Note over Qonsent: Evaluate UCAN policies
    Qonsent-->>Module: Permission granted/denied
\`\`\`

### Data Encryption Flow (Qlock)
\`\`\`mermaid
sequenceDiagram
    participant Module
    participant Qlock
    participant Storage
    
    Module->>Qlock: Encrypt data
    Qlock-->>Module: Encrypted data + signature
    Module->>Storage: Store encrypted data
\`\`\`

### Indexing Flow (Qindex)
\`\`\`mermaid
sequenceDiagram
    participant Module
    participant Qindex
    participant IPFS
    
    Module->>IPFS: Store content
    IPFS-->>Module: CID
    Module->>Qindex: Register CID
    Qindex-->>Module: Index updated
\`\`\`

## Cross-Module Communication

### Event Bus Integration
All modules publish events to the centralized event bus:

\`\`\`javascript
// Event naming convention
q.<module>.<action>.<version>

// Examples
q.qmail.sent.v1
q.qwallet.tx.signed.v1
q.qdrive.file.uploaded.v1
\`\`\`

### Standard Headers
All inter-module requests use standard headers:

\`\`\`
x-squid-id: <identity-id>
x-subid: <subidentity-id>
x-qonsent: <consent-token>
x-sig: <qlock-signature>
x-ts: <timestamp>
x-api-version: <version>
\`\`\`

## Integration Examples

### File Upload with Full Integration
\`\`\`javascript
// 1. Verify identity
const identity = await sQuid.verifyIdentity(squidId);

// 2. Check upload permission
const canUpload = await qonsent.check({
  squidId,
  resource: 'qdrive:upload',
  action: 'create'
});

// 3. Encrypt file
const encrypted = await qlock.encrypt({
  data: fileData,
  squidId,
  purpose: 'file-storage'
});

// 4. Store in IPFS
const cid = await ipfs.add(encrypted);

// 5. Index the file
await qindex.put({
  key: \`file:\${filename}\`,
  cid,
  metadata: { owner: squidId, type: 'file' }
});

// 6. Log audit event
await qerberos.audit({
  type: 'FILE_UPLOADED',
  actor: squidId,
  resource: cid,
  details: { filename, size: fileData.length }
});
\`\`\`

### Payment Processing Integration
\`\`\`javascript
// 1. Create payment intent
const intent = await qwallet.createIntent({
  squidId,
  amount: 100,
  currency: 'QToken',
  purpose: 'premium-feature'
});

// 2. Sign transaction
const signature = await qlock.sign({
  data: intent,
  squidId,
  purpose: 'payment-authorization'
});

// 3. Process payment
const result = await qwallet.processPayment({
  intentId: intent.id,
  signature
});

// 4. Grant permissions on success
if (result.status === 'completed') {
  await qonsent.grant({
    squidId,
    resource: 'premium-features',
    scope: 'access',
    duration: '30d'
  });
}
\`\`\`

## Testing Integration

### Contract Tests
Each module includes contract tests to verify integration compatibility:

\`\`\`bash
# Run contract tests for all modules
npm run test:contracts

# Run integration tests
npm run test:integration
\`\`\`

### Mock Services
For development and testing, modules can run with mock services:

\`\`\`bash
# Start with all mocks
MOCK_SERVICES=all npm run dev

# Start with selective mocks
MOCK_SERVICES=qlock,qindex npm run dev
\`\`\`

## Troubleshooting Integration Issues

### Common Problems

1. **Authentication Failures**
   - Verify sQuid service is running
   - Check identity format and validity
   - Ensure proper headers are set

2. **Permission Denied**
   - Verify Qonsent policies
   - Check DAO membership
   - Ensure proper scopes

3. **Encryption Errors**
   - Verify Qlock service connectivity
   - Check key availability
   - Ensure proper algorithm support

4. **Indexing Failures**
   - Verify Qindex service health
   - Check IPFS connectivity
   - Ensure proper CID format

### Debugging Tools

\`\`\`bash
# Check service health
curl http://localhost:3010/health  # sQuid
curl http://localhost:3020/health  # Qlock
curl http://localhost:3030/health  # Qonsent

# Test integration endpoints
curl -H "x-squid-id: test-id" \\
     http://localhost:3000/api/module/test-integration
\`\`\`

## Performance Considerations

### Caching Strategies
- **Identity verification**: Cache for 5 minutes
- **Permission checks**: Cache for 1 minute
- **Encryption keys**: Cache for 1 hour
- **Index lookups**: Cache for 10 minutes

### Connection Pooling
- Maintain persistent connections to frequently used services
- Use circuit breakers for external service calls
- Implement retry logic with exponential backoff

### Batch Operations
- Batch multiple operations when possible
- Use bulk APIs for high-volume operations
- Implement queue-based processing for async operations
`;

    await fs.writeFile(path.join(matrixDir, 'integration-matrix.md'), content);
  }

  analyzeModuleDependencies(module) {
    const deps = {
      squid: false,
      qonsent: false,
      qlock: false,
      qindex: false,
      qerberos: false,
      qmask: false,
      qwallet: false,
      ipfs: false
    };

    // Analyze OpenAPI spec for dependencies
    if (module.openApiSpec) {
      const specStr = JSON.stringify(module.openApiSpec).toLowerCase();
      deps.squid = specStr.includes('squid') || specStr.includes('identity');
      deps.qonsent = specStr.includes('qonsent') || specStr.includes('permission');
      deps.qlock = specStr.includes('qlock') || specStr.includes('encrypt');
      deps.qindex = specStr.includes('qindex') || specStr.includes('index');
      deps.qerberos = specStr.includes('qerberos') || specStr.includes('audit');
      deps.qmask = specStr.includes('qmask') || specStr.includes('privacy');
      deps.qwallet = specStr.includes('qwallet') || specStr.includes('payment');
      deps.ipfs = specStr.includes('ipfs') || specStr.includes('cid');
    }

    // Analyze MCP spec for dependencies
    if (module.mcpSpec) {
      const mcpStr = JSON.stringify(module.mcpSpec).toLowerCase();
      deps.squid = deps.squid || mcpStr.includes('squid');
      deps.qonsent = deps.qonsent || mcpStr.includes('qonsent');
      deps.qlock = deps.qlock || mcpStr.includes('qlock');
      deps.qindex = deps.qindex || mcpStr.includes('qindex');
      deps.qerberos = deps.qerberos || mcpStr.includes('qerberos');
      deps.qmask = deps.qmask || mcpStr.includes('qmask');
      deps.qwallet = deps.qwallet || mcpStr.includes('qwallet');
      deps.ipfs = deps.ipfs || mcpStr.includes('ipfs');
    }

    return deps;
  }

  async generateDeploymentMatrix() {
    console.log('🚀 Generating deployment matrix...');
    
    const deploymentDir = 'docs/deployment';
    await fs.mkdir(deploymentDir, { recursive: true });

    const content = `# Q Ecosystem Deployment Matrix

This document provides deployment configurations for all Q ecosystem modules across different environments.

## Environment Overview

| Environment | Purpose | Modules | Configuration |
|-------------|---------|---------|---------------|
| **Development** | Local development | All modules with mocks | Standalone mode |
| **Staging** | Integration testing | All modules with real services | Hybrid mode |
| **Production** | Live system | All modules with full integration | Integrated mode |

## Module Deployment Status

| Module | Development | Staging | Production | Docker | K8s | Serverless |
|--------|-------------|---------|------------|--------|-----|------------|
${this.generator.modules.map(module => {
  const deployment = this.analyzeDeploymentCapabilities(module);
  return `| ${module.name} | ✅ | ${deployment.staging ? '✅' : '🚧'} | ${deployment.production ? '✅' : '🚧'} | ${deployment.docker ? '✅' : '❌'} | ${deployment.k8s ? '✅' : '❌'} | ${deployment.serverless ? '✅' : '❌'} |`;
}).join('\n')}

## Deployment Configurations

### Development Environment

\`\`\`yaml
# docker-compose.dev.yml
version: '3.8'
services:
${this.generator.modules.map(module => `  ${module.name}:
    build: ./modules/${module.name}
    ports:
      - "30${this.getModulePort(module)}:3000"
    environment:
      - NODE_ENV=development
      - ${module.name.toUpperCase()}_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/${module.name}:/app
      - /app/node_modules`).join('\n')}
\`\`\`

### Staging Environment

\`\`\`yaml
# docker-compose.staging.yml
version: '3.8'
services:
${this.generator.modules.map(module => `  ${module.name}:
    image: ${module.name}:staging
    environment:
      - NODE_ENV=staging
      - ${module.name.toUpperCase()}_MODE=hybrid
      - MOCK_SERVICES=\${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock`).join('\n')}
\`\`\`

### Production Environment

\`\`\`yaml
# docker-compose.prod.yml
version: '3.8'
services:
${this.generator.modules.map(module => `  ${module.name}:
    image: ${module.name}:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - ${module.name.toUpperCase()}_MODE=integrated
    networks:
      - q-network`).join('\n')}
\`\`\`

## Kubernetes Deployments

### Namespace Configuration

\`\`\`yaml
apiVersion: v1
kind: Namespace
metadata:
  name: q-ecosystem
  labels:
    name: q-ecosystem
\`\`\`

### Module Deployment Template

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{MODULE_NAME}}
  namespace: q-ecosystem
spec:
  replicas: 3
  selector:
    matchLabels:
      app: {{MODULE_NAME}}
  template:
    metadata:
      labels:
        app: {{MODULE_NAME}}
    spec:
      containers:
      - name: {{MODULE_NAME}}
        image: {{MODULE_NAME}}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: {{MODULE_NAME}}_MODE
          value: "integrated"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: {{MODULE_NAME}}-service
  namespace: q-ecosystem
spec:
  selector:
    app: {{MODULE_NAME}}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
\`\`\`

## Serverless Deployments

### AWS Lambda Configuration

\`\`\`yaml
# serverless.yml
service: q-ecosystem-{{MODULE_NAME}}

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    {{MODULE_NAME}}_MODE: serverless

functions:
  {{MODULE_NAME}}:
    handler: src/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30
    memorySize: 512
    reservedConcurrency: 100
\`\`\`

### Vercel Configuration

\`\`\`json
{
  "name": "q-ecosystem-{{MODULE_NAME}}",
  "version": 2,
  "builds": [
    {
      "src": "src/vercel.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/src/vercel.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "{{MODULE_NAME}}_MODE": "serverless"
  }
}
\`\`\`

## Infrastructure as Code

### Terraform Configuration

\`\`\`hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ECS Cluster
resource "aws_ecs_cluster" "q_ecosystem" {
  name = "q-ecosystem"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Module services
${this.generator.modules.map(module => `
resource "aws_ecs_service" "${module.name}" {
  name            = "${module.name}"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.${module.name}.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.${module.name}.arn
    container_name   = "${module.name}"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "${module.name}" {
  family                   = "${module.name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "${module.name}"
      image = "${module.name}:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "${module.name.toUpperCase()}_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}`).join('')}
\`\`\`

## Monitoring and Observability

### Prometheus Configuration

\`\`\`yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
${this.generator.modules.map(module => `  - job_name: '${module.name}'
    static_configs:
      - targets: ['${module.name}:3000']
    metrics_path: /metrics
    scrape_interval: 30s`).join('\n')}
\`\`\`

### Grafana Dashboard

\`\`\`json
{
  "dashboard": {
    "title": "Q Ecosystem Overview",
    "panels": [
${this.generator.modules.map((module, index) => `      {
        "id": ${index + 1},
        "title": "${module.name} Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='${module.name}'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      }`).join(',\n')}
    ]
  }
}
\`\`\`

## Deployment Automation

### CI/CD Pipeline

\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy Q Ecosystem

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [${this.generator.modules.map(m => m.name).join(', ')}]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build \${{ matrix.module }}
      run: |
        cd modules/\${{ matrix.module }}
        docker build -t \${{ matrix.module }}:latest .
    
    - name: Deploy \${{ matrix.module }}
      run: |
        kubectl apply -f k8s/\${{ matrix.module }}.yaml
        kubectl rollout status deployment/\${{ matrix.module }}
\`\`\`

### Deployment Scripts

\`\`\`bash
#!/bin/bash
# deploy-all.sh

set -e

echo "🚀 Deploying Q Ecosystem..."

# Build all modules
for module in ${this.generator.modules.map(m => m.name).join(' ')}; do
  echo "Building \$module..."
  cd modules/\$module
  docker build -t \$module:latest .
  cd ../..
done

# Deploy to Kubernetes
echo "Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml

for module in ${this.generator.modules.map(m => m.name).join(' ')}; do
  echo "Deploying \$module..."
  kubectl apply -f k8s/\$module.yaml
  kubectl rollout status deployment/\$module -n q-ecosystem
done

echo "✅ Deployment complete!"
\`\`\`

## Rollback Procedures

### Kubernetes Rollback

\`\`\`bash
# Rollback specific module
kubectl rollout undo deployment/MODULE_NAME -n q-ecosystem

# Rollback to specific revision
kubectl rollout undo deployment/MODULE_NAME --to-revision=2 -n q-ecosystem
\`\`\`

### Docker Swarm Rollback

\`\`\`bash
# Rollback service
docker service rollback q-ecosystem_MODULE_NAME
\`\`\`

## Security Considerations

### Network Policies

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: q-ecosystem-network-policy
  namespace: q-ecosystem
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: q-ecosystem
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: q-ecosystem
\`\`\`

### Secrets Management

\`\`\`yaml
apiVersion: v1
kind: Secret
metadata:
  name: q-ecosystem-secrets
  namespace: q-ecosystem
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
\`\`\`
`;

    await fs.writeFile(path.join(deploymentDir, 'deployment-matrix.md'), content);
  }

  analyzeDeploymentCapabilities(module) {
    const capabilities = {
      staging: true,
      production: true,
      docker: false,
      k8s: false,
      serverless: false
    };

    // Check for Docker support
    try {
      const dockerfilePath = path.join(module.path, 'Dockerfile');
      capabilities.docker = fsSync.existsSync(dockerfilePath);
    } catch (error) {
      // File doesn't exist
    }

    // Check for Kubernetes support
    try {
      const k8sPath = path.join(module.path, 'k8s');
      capabilities.k8s = fsSync.existsSync(k8sPath);
    } catch (error) {
      // Directory doesn't exist
    }

    // Assume serverless capability for all modules
    capabilities.serverless = true;

    return capabilities;
  }

  getModulePort(module) {
    // Generate unique port numbers for development
    const moduleIndex = this.generator.modules.findIndex(m => m.name === module.name);
    return String(moduleIndex).padStart(2, '0');
  }

  async updateMainDocsIndex() {
    console.log('📚 Updating main documentation index...');
    
    const mainDocsPath = 'docs/README.md';
    
    const content = `# Q Ecosystem Documentation

Welcome to the comprehensive documentation for the Q ecosystem. This documentation covers all modules, their APIs, deployment guides, and operational procedures.

## Quick Navigation

### 📋 Module Documentation
- [Module Overview](./modules/README.md) - Complete module documentation
- [API References](./modules/) - HTTP API specifications for all modules
- [MCP Tools](./modules/) - Model Context Protocol tools documentation

### 🔗 Integration Guides
- [Integration Matrix](./integration/integration-matrix.md) - Module dependencies and integration patterns
- [Cross-Module Communication](./integration/integration-matrix.md#cross-module-communication) - Event bus and standard headers
- [Authentication Flow](./integration/integration-matrix.md#authentication-flow-squid) - sQuid identity integration

### 🚀 Deployment
- [Deployment Matrix](./deployment/deployment-matrix.md) - Environment configurations and deployment options
- [Kubernetes Deployments](./deployment/deployment-matrix.md#kubernetes-deployments) - K8s configurations
- [Serverless Deployments](./deployment/deployment-matrix.md#serverless-deployments) - Lambda and Vercel configurations

### 📋 Operations
- [Operational Runbooks](./runbooks/README.md) - Emergency procedures and maintenance guides
- [Module Runbooks](./runbooks/) - Module-specific operational procedures
- [Monitoring and Alerting](./runbooks/README.md#monitoring-and-alerting) - SLO monitoring and alert escalation

## Module Overview

The Q ecosystem consists of ${this.generator.modules.length} core modules:

${this.generator.modules.map(module => {
  const title = this.getModuleTitle(module);
  const description = this.getModuleDescription(module);
  return `### [${title}](./modules/${module.name}/README.md)

${description}

**Documentation:**
- [API Reference](./modules/${module.name}/api-reference.md)
- [MCP Tools](./modules/${module.name}/mcp-tools.md)
- [Deployment Guide](./modules/${module.name}/deployment-guide.md)
- [Integration Guide](./modules/${module.name}/integration-guide.md)
- [Troubleshooting](./modules/${module.name}/troubleshooting.md)
- [Operational Runbook](./runbooks/runbook-${module.name}.md)`;
}).join('\n\n')}

## Architecture Overview

\`\`\`mermaid
graph TB
    subgraph "Core Identity & Security"
        sQuid[sQuid<br/>Identity & Subidentities]
        Qonsent[Qonsent<br/>Policies & Permissions]
        Qlock[Qlock<br/>Encryption & Signatures]
        Qerberos[Qerberos<br/>Security & Audit]
        Qmask[Qmask<br/>Privacy & Anonymization]
    end

    subgraph "Storage & Content"
        Qdrive[Qdrive<br/>File Storage]
        QpiC[QpiC<br/>Media Management]
        Qindex[Qindex<br/>Indexing & Pointers]
    end

    subgraph "Communication & Commerce"
        Qmail[Qmail<br/>Certified Messaging]
        Qchat[Qchat<br/>Instant Messaging]
        Qmarket[Qmarket<br/>Content Marketplace]
        Qwallet[Qwallet<br/>Payments & Fees]
    end

    subgraph "Infrastructure & Governance"
        QNET[QNET<br/>Network Infrastructure]
        DAO[DAO/Communities<br/>Governance]
    end

    subgraph "Common Infrastructure"
        IPFS[IPFS Storage]
        EventBus[Event Bus]
        CommonSchemas[@anarq/common-schemas]
    end

    sQuid -.->|identity| Qmail
    sQuid -.->|identity| Qmarket
    Qonsent -.->|permissions| Qdrive
    Qonsent -.->|permissions| Qmarket
    Qlock -.->|encryption| Qdrive
    Qlock -.->|encryption| Qmail
    Qindex -.->|indexing| Qdrive
    Qindex -.->|indexing| Qmarket
    Qerberos -.->|audit| Qwallet
    Qmask -.->|privacy| QpiC
\`\`\`

## Getting Started

### Development Environment

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/anarq/q-ecosystem.git
   cd q-ecosystem
   \`\`\`

2. **Start all modules in development mode:**
   \`\`\`bash
   docker-compose -f docker-compose.dev.yml up
   \`\`\`

3. **Access module documentation:**
   - Open http://localhost:8080/docs for the documentation portal
   - Individual module APIs are available on ports 3001-30${this.generator.modules.length.toString().padStart(2, '0')}

### Production Deployment

1. **Deploy to Kubernetes:**
   \`\`\`bash
   kubectl apply -f k8s/
   \`\`\`

2. **Deploy with Docker Swarm:**
   \`\`\`bash
   docker stack deploy -c docker-compose.prod.yml q-ecosystem
   \`\`\`

3. **Deploy individual modules:**
   \`\`\`bash
   cd modules/MODULE_NAME
   npm run deploy
   \`\`\`

## Standards and Conventions

### API Standards
- **OpenAPI 3.0+** specifications for all HTTP APIs
- **Standard response format** with status, code, message, data, and CID
- **Standard headers** for identity, permissions, and signatures
- **Versioning** through URL paths and headers

### Event Standards
- **Naming convention**: \`q.<module>.<action>.<version>\`
- **Schema validation** with JSON Schema
- **Event versioning** and compatibility management
- **Audit trail** for all events

### Security Standards
- **Identity verification** through sQuid for all operations
- **Permission checking** via Qonsent with deny-by-default policies
- **Data encryption** at rest and in transit using Qlock
- **Audit logging** for all critical operations via Qerberos

### Testing Standards
- **90%+ test coverage** for critical paths
- **Contract tests** for all module interfaces
- **Integration tests** for multi-module workflows
- **End-to-end tests** for complete user journeys

## Contributing

### Documentation Updates

1. **Automatic generation:**
   \`\`\`bash
   npm run docs:generate
   \`\`\`

2. **Watch mode for development:**
   \`\`\`bash
   npm run docs:watch
   \`\`\`

3. **Validate documentation:**
   \`\`\`bash
   npm run docs:validate
   \`\`\`

### Adding New Modules

1. Follow the [module template](../templates/module-template/)
2. Include all required documentation files
3. Add OpenAPI and MCP specifications
4. Include comprehensive tests
5. Update integration matrix

## Support

- **Documentation Issues**: Create an issue in the main repository
- **Module-Specific Issues**: Check individual module repositories
- **Security Issues**: Contact security@q.network
- **General Questions**: Join our community Discord

## License

This documentation is licensed under MIT License. See individual modules for their specific licenses.

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Generated automatically by the Q Ecosystem Documentation System*
`;

    await fs.writeFile(mainDocsPath, content);
  }

  getModuleTitle(module) {
    if (module.openApiSpec?.info?.title) {
      return module.openApiSpec.info.title;
    }
    if (module.packageInfo?.description) {
      return module.packageInfo.description.split(' - ')[0] || module.packageInfo.description;
    }
    return module.name.charAt(0).toUpperCase() + module.name.slice(1);
  }

  getModuleDescription(module) {
    if (module.openApiSpec?.info?.description) {
      return module.openApiSpec.info.description;
    }
    if (module.packageInfo?.description) {
      return module.packageInfo.description;
    }
    return `${module.name} module for the Q ecosystem`;
  }

  async startWatchMode() {
    console.log('👀 Starting documentation watch mode...');
    this.watchMode = true;

    const watcher = chokidar.watch([
      'modules/*/openapi.yaml',
      'modules/*/mcp.json',
      'modules/*/package.json',
      'modules/*/README.md'
    ], {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      try {
        await this.generateAll();
        console.log('✅ Documentation updated successfully');
      } catch (error) {
        console.error('❌ Failed to update documentation:', error);
      }
    });

    console.log('👀 Watching for changes... Press Ctrl+C to stop');
  }

  async stop() {
    this.watchMode = false;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'generate';
  const automation = new ModuleDocsAutomation();

  try {
    await automation.init();

    switch (command) {
      case 'generate':
        await automation.generateAll();
        break;
      case 'watch':
        await automation.startWatchMode();
        break;
      default:
        console.log('Usage: node docs-automation-module.mjs [generate|watch]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Documentation automation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ModuleDocsAutomation };