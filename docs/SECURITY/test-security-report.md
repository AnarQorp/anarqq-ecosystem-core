# Content Security Scan Report

**Generated:** 2025-08-30T19:18:17.412Z

## Summary

- **Total Files Scanned:** 271
- **Files with Issues:** 166
- **Total Issues:** 551

### Issues by Severity

- **HIGH:** 18
- **MEDIUM:** 404
- **LOW:** 129

### Issues by Category

- **privateEndpoints:** 404
- **emails:** 74
- **phoneNumbers:** 55
- **cryptoKeys:** 10
- **apiKeys:** 2
- **dbCredentials:** 6

## Detailed Issues

### docs/API-CHANGES.md

**MEDIUM** - Line 773: privateEndpoints
- **Match:** `https://dev-api.anarq.com`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 774: privateEndpoints
- **Match:** `https://staging-api.anarq.com`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 793: emails
- **Match:** `api-support@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 61: phoneNumbers
- **Match:** `12345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 61: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 61: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 116: phoneNumbers
- **Match:** `12345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 116: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 116: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 567: phoneNumbers
- **Match:** `12345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 567: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 567: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 568: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 568: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 568: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 568: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 649: phoneNumbers
- **Match:** ` 1644336000`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**HIGH** - Line 61: cryptoKeys
- **Match:** `0x1234567890123456789012345678901234567890`
- **Suggestion:** Replace with example addresses or use placeholders

**HIGH** - Line 116: cryptoKeys
- **Match:** `0x1234567890123456789012345678901234567890`
- **Suggestion:** Replace with example addresses or use placeholders

**HIGH** - Line 567: cryptoKeys
- **Match:** `0x1234567890123456789012345678901234567890`
- **Suggestion:** Replace with example addresses or use placeholders

**HIGH** - Line 568: cryptoKeys
- **Match:** `0x0987654321098765432109876543210987654321`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/DAO-DASHBOARD-ARCHITECTURE.md

**MEDIUM** - Line 469: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 475: privateEndpoints
- **Match:** `https://staging-api.anarq.com`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/DEPLOYMENT.md

**MEDIUM** - Line 83: privateEndpoints
- **Match:** `https://staging-api.anarq.com`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 852: emails
- **Match:** `technical-lead@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 853: emails
- **Match:** `devops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 854: emails
- **Match:** `security@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 50: phoneNumbers
- **Match:** `12345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 50: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 50: phoneNumbers
- **Match:** `2345678901`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 88: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 88: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 88: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 88: phoneNumbers
- **Match:** `0987654321`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**HIGH** - Line 50: cryptoKeys
- **Match:** `0x1234567890123456789012345678901234567890`
- **Suggestion:** Replace with example addresses or use placeholders

**HIGH** - Line 88: cryptoKeys
- **Match:** `0x0987654321098765432109876543210987654321`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/IPFS-INTEGRATION.md

**HIGH** - Line 340: apiKeys
- **Match:** `API_KEY=your_storacha_api_key`
- **Suggestion:** Replace with environment variable or placeholder like ${API_KEY}

**HIGH** - Line 432: dbCredentials
- **Match:** `User = async`
- **Suggestion:** Use environment variables or configuration files not in version control

**MEDIUM** - Line 343: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 260: phoneNumbers
- **Match:** ` 1073741824`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 267: phoneNumbers
- **Match:** `-1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 597: phoneNumbers
- **Match:** `-1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

### docs/PUBLIC-PORTAL-BLUEPRINT.md

**HIGH** - Line 223: dbCredentials
- **Match:** `password=***REDACTED***'`
- **Suggestion:** Use environment variables or configuration files not in version control

### docs/SECURITY/content-sanitization.md

**HIGH** - Line 94: apiKeys
- **Match:** `api_key: sk_live_abc123def456ghi789`
- **Suggestion:** Replace with environment variable or placeholder like ${API_KEY}

**LOW** - Line 338: emails
- **Match:** `security@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 340: emails
- **Match:** `security-emergency@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 343: emails
- **Match:** `docs@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 348: emails
- **Match:** `security-incident@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 349: emails
- **Match:** `docs-issues@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 350: emails
- **Match:** `access-support@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/STORJ-INTEGRATION.md

**MEDIUM** - Line 525: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 112: phoneNumbers
- **Match:** `1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 113: phoneNumbers
- **Match:** `1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 118: phoneNumbers
- **Match:** `1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 154: phoneNumbers
- **Match:** `1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 297: phoneNumbers
- **Match:** ` 1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 298: phoneNumbers
- **Match:** ` 1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 299: phoneNumbers
- **Match:** ` 1234567891`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 301: phoneNumbers
- **Match:** ` 1234567892`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 302: phoneNumbers
- **Match:** ` 1234567893`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

### docs/api/module-registry/README.md

**LOW** - Line 143: emails
- **Match:** `support@example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/api/module-registry/discovery-api.md

**HIGH** - Line 62: cryptoKeys
- **Match:** `3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uc`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/api/module-registry/examples/basic-registration.js

**LOW** - Line 39: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 39: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 39: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 39: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 39: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**HIGH** - Line 38: cryptoKeys
- **Match:** `3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uc`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/api/module-registry/faq.md

**LOW** - Line 296: emails
- **Match:** `enterprise@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/api/module-registry/getting-started.md

**LOW** - Line 93: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 93: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 93: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 93: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 93: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**HIGH** - Line 92: cryptoKeys
- **Match:** `3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uc`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/api/module-registry/registration-api.md

**LOW** - Line 69: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 69: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 69: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 69: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 69: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 87: phoneNumbers
- **Match:** `1234567890`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 138: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 138: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 138: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 138: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**LOW** - Line 138: phoneNumbers
- **Match:** `6789012345`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

**HIGH** - Line 68: cryptoKeys
- **Match:** `3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uc`
- **Suggestion:** Replace with example addresses or use placeholders

### docs/api/module-registry/troubleshooting.md

**LOW** - Line 641: emails
- **Match:** `support@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/deployment/deployment-matrix.md

**HIGH** - Line 1710: dbCredentials
- **Match:** `password: <base64-encoded-password>`
- **Suggestion:** Use environment variables or configuration files not in version control

### docs/disaster-recovery-procedures.md

**HIGH** - Line 357: dbCredentials
- **Match:** `postgres://q-ecosystem-west.amazonaws.com"}}'
   
   # Scale up secondary region
   kubectl scale deployment --replicas=3 --all -n q-ecosystem
   ```

### Load Balancer Failover

#### Application Load Balancer

1. **Health Check Configuration**
   ```json
   {
     "HealthCheckPath": "/health",
     "HealthCheckIntervalSeconds": 30,
     "HealthyThresholdCount": 2,
     "UnhealthyThresholdCount": 5,
     "HealthCheckTimeoutSeconds": 10
   }
   ```

2. **Automatic Failover**
   ```bash
   # Configure target groups for failover
   aws elbv2 create-target-group \
       --name q-ecosystem-failover \
       --protocol HTTP \
       --port 80 \
       --vpc-id $VPC_ID \
       --health-check-path /health
   
   # Update listener rules for failover
   aws elbv2 modify-rule \
       --rule-arn $RULE_ARN \
       --actions Type=forward,TargetGroupArn=$FAILOVER_TARGET_GROUP_ARN
   ```

## Service Restoration

### Service Priority Matrix

| Priority | Services | Restoration Order | Dependencies |
|----------|----------|-------------------|--------------|
| P0 | sQuid, Qonsent, Qlock | 1. sQuid → 2. Qonsent → 3. Qlock | None |
| P1 | Qwallet, Qindex, Qerberos | 4. Qindex → 5. Qwallet → 6. Qerberos | P0 services |
| P2 | Qdrive, Qmarket | 7. Qdrive → 8. Qmarket | P0, P1 services |
| P3 | Qmail, Qchat, QpiC, QNET, DAO | 9-13. Parallel restoration | All previous |

### Restoration Procedures

#### Critical Services (P0)

1. **sQuid (Identity Service)**
   ```bash
   # Restore identity database
   ./scripts/restore-squid-database.sh --backup-timestamp=$BACKUP_TIMESTAMP
   
   # Deploy sQuid service
   kubectl apply -f k8s/squid/
   
   # Validate identity verification
   curl -f https://api.q-ecosystem.com/squid/health
   ```

2. **Qonsent (Permission Service)**
   ```bash
   # Restore permission policies
   ./scripts/restore-qonsent-policies.sh
   
   # Deploy Qonsent service
   kubectl apply -f k8s/qonsent/
   
   # Validate permission checking
   curl -f https://api.q-ecosystem.com/qonsent/health
   ```

3. **Qlock (Encryption Service)**
   ```bash
   # Restore encryption keys
   ./scripts/restore-qlock-keys.sh --kms-backup
   
   # Deploy Qlock service
   kubectl apply -f k8s/qlock/
   
   # Validate encryption operations
   curl -f https://api.q-ecosystem.com/qlock/health
   ```

#### Core Services (P1)

1. **Qindex (Indexing Service)**
   ```bash
   # Restore index data
   ./scripts/restore-qindex-data.sh
   
   # Deploy Qindex service
   kubectl apply -f k8s/qindex/
   
   # Rebuild indices if necessary
   ./scripts/rebuild-qindex.sh
   ```

2. **Qwallet (Payment Service)**
   ```bash
   # Restore wallet data and keys
   ./scripts/restore-qwallet-data.sh --secure-backup
   
   # Deploy Qwallet service
   kubectl apply -f k8s/qwallet/
   
   # Validate payment processing
   ./scripts/test-qwallet-payments.sh
   ```

### Validation Procedures

#### Service Health Validation

1. **Automated Health Checks**
   ```bash
   # Run comprehensive health checks
   ./scripts/run-health-checks.sh --all-services
   
   # Validate service dependencies
   ./scripts/validate-service-dependencies.sh
   
   # Check service mesh connectivity
   ./scripts/validate-service-mesh.sh
   ```

2. **Integration Testing**
   ```bash
   # Run integration test suite
   npm run test:integration:disaster-recovery
   
   # Validate cross-service communication
   ./scripts/test-cross-service-communication.sh
   
   # Run end-to-end workflow tests
   ./scripts/test-e2e-workflows.sh
   ```

#### Data Integrity Validation

1. **Database Consistency**
   ```bash
   # Check referential integrity
   ./scripts/check-referential-integrity.sh
   
   # Validate data checksums
   ./scripts/validate-data-checksums.sh
   
   # Run data consistency reports
   ./scripts/generate-consistency-report.sh
   ```

2. **IPFS Content Validation**
   ```bash
   # Verify content availability
   ./scripts/verify-ipfs-content.sh --critical-content
   
   # Check pinning status
   ./scripts/check-pinning-status.sh
   
   # Validate content integrity
   ./scripts/validate-content-integrity.sh
   ```

## Communication Procedures

### Internal Communication

#### Incident Command Structure

1. **Incident Commander**
   - Overall incident response coordination
   - Decision making authority
   - External communication

2. **Technical Lead**
   - Technical recovery coordination
   - Resource allocation
   - Recovery validation

3. **Communications Lead**
   - Internal team communication
   - Status updates
   - Documentation

#### Communication Channels

1. **Primary Channels**
   - Slack: #incident-response
   - Conference Bridge: +1-XXX-XXX-XXXX
   - Email: incident-team@`
- **Suggestion:** Use environment variables or configuration files not in version control

**LOW** - Line 551: emails
- **Match:** `incident-team@company.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 554: emails
- **Match:** `exec-team@company.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 555: emails
- **Match:** `board@company.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 556: emails
- **Match:** `legal@company.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/enhanced-monitoring-report.json

**LOW** - Line 369: emails
- **Match:** `support@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/global/technical-analysis/performance-optimizations.md

**LOW** - Line 77: phoneNumbers
- **Match:** `+50`
- **Suggestion:** Replace with example phone numbers (+1-555-0123)

### docs/integration/integration-matrix.md

**MEDIUM** - Line 228: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 229: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 230: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/migration/deprecation-plan.md

**LOW** - Line 124: emails
- **Match:** `migration-support@q-ecosystem.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 177: emails
- **Match:** `migration-team@q-ecosystem.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 368: emails
- **Match:** `migration-support@q-ecosystem.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/migration/legacy-to-modular-migration-guide.md

**LOW** - Line 609: emails
- **Match:** `migration-support@q-ecosystem.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 612: emails
- **Match:** `emergency@q-ecosystem.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/migration/module-specific/qwallet-migration-guide.md

**MEDIUM** - Line 42: privateEndpoints
- **Match:** `http://localhost:3002`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/migration/module-specific/squid-migration-guide.md

**MEDIUM** - Line 38: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 186: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 196: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 206: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/mcp.md

**MEDIUM** - Line 443: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/dao/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3110`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/dao/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 365: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 376: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 386: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/mcp-tools.md

**HIGH** - Line 158: dbCredentials
- **Match:** `User: false`
- **Suggestion:** Use environment variables or configuration files not in version control

**HIGH** - Line 265: dbCredentials
- **Match:** `User: "string"`
- **Suggestion:** Use environment variables or configuration files not in version control

### docs/modules/qchat/mcp.md

**MEDIUM** - Line 809: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qchat/runbook.md

**MEDIUM** - Line 244: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 87: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qchat/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 233: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 243: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 254: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 391: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/mcp.md

**MEDIUM** - Line 626: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qdrive/runbook.md

**MEDIUM** - Line 245: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 88: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qdrive/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/api-reference.md

**MEDIUM** - Line 12: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/api.md

**MEDIUM** - Line 10: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 196: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/deployment.md

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 78: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 215: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 234: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 262: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 268: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 295: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/mcp.md

**MEDIUM** - Line 560: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qerberos/runbook.md

**MEDIUM** - Line 245: privateEndpoints
- **Match:** `http://localhost:3050`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 88: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qerberos/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3006`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 127: privateEndpoints
- **Match:** `http://localhost:3006`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 137: privateEndpoints
- **Match:** `http://localhost:3006`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 148: privateEndpoints
- **Match:** `http://localhost:3006`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/mcp.md

**MEDIUM** - Line 277: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qindex/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3040`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qindex/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/api-reference.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 213: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 232: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 260: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 266: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 293: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/examples.md

**MEDIUM** - Line 13: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 40: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 378: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/mcp.md

**MEDIUM** - Line 286: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qlock/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qlock/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 201: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/mcp.md

**MEDIUM** - Line 538: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmail/runbook.md

**MEDIUM** - Line 244: privateEndpoints
- **Match:** `http://localhost:3090`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 87: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qmail/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 216: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 226: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 237: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/mcp.md

**MEDIUM** - Line 582: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmarket/runbook.md

**MEDIUM** - Line 244: privateEndpoints
- **Match:** `http://localhost:3080`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 87: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qmarket/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3007`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/mcp.md

**MEDIUM** - Line 405: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qmask/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3060`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qmask/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 135: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 145: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:3014`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/mcp.md

**MEDIUM** - Line 322: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qnet/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3100`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qnet/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3003`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/mcp.md

**MEDIUM** - Line 278: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qonsent/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3030`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qonsent/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3008`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/mcp.md

**MEDIUM** - Line 793: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qpic/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3070`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qpic/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 156: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/mcp.md

**MEDIUM** - Line 431: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/qwallet/runbook.md

**MEDIUM** - Line 244: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 87: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/qwallet/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/api-reference.md

**MEDIUM** - Line 9: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/api.md

**MEDIUM** - Line 7: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 136: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 146: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 157: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/deployment.md

**MEDIUM** - Line 72: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 75: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 212: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 231: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 259: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 265: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 292: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/examples.md

**MEDIUM** - Line 11: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 48: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 64: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 91: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/integration-guide.md

**MEDIUM** - Line 17: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 122: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 397: privateEndpoints
- **Match:** `http://localhost:3001`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/mcp-tools.md

**MEDIUM** - Line 15: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/mcp.md

**MEDIUM** - Line 215: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/modules/squid/runbook.md

**MEDIUM** - Line 242: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 85: emails
- **Match:** `ops@anarq.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/modules/squid/troubleshooting.md

**MEDIUM** - Line 31: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 32: privateEndpoints
- **Match:** `http://localhost:3020`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 94: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 150: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 155: privateEndpoints
- **Match:** `http://localhost:5001`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 200: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

**MEDIUM** - Line 210: privateEndpoints
- **Match:** `http://localhost:3000`
- **Suggestion:** Replace with example.com or use placeholder URLs

### docs/monitoring-history.json

**LOW** - Line 369: emails
- **Match:** `support@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 1299: emails
- **Match:** `support@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/production-deployment-runbook.md

**LOW** - Line 409: emails
- **Match:** `engineering-team@company.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/reports/2025-08-30/monitoring-report.json

**LOW** - Line 369: emails
- **Match:** `support@qwallet.example.com`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/README.md

**LOW** - Line 87: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 88: emails
- **Match:** `management@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 89: emails
- **Match:** `security@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-dao.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `dao-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qchat.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 174: emails
- **Match:** `qchat-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 176: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qdrive.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 175: emails
- **Match:** `qdrive-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 177: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qerberos.md

**MEDIUM** - Line 63: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 175: emails
- **Match:** `qerberos-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 177: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qindex.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qindex-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qlock.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qlock-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qmail.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 174: emails
- **Match:** `qmail-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 176: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qmarket.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qmarket-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qmask.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qmask-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qnet.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qnet-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qonsent.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `qonsent-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qpic.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 175: emails
- **Match:** `qpic-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 177: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-qwallet.md

**MEDIUM** - Line 102: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 216: emails
- **Match:** `qwallet-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 218: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 223: emails
- **Match:** `qwallet-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 225: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

### docs/runbooks/runbook-squid.md

**MEDIUM** - Line 60: privateEndpoints
- **Match:** `http://localhost:3010`
- **Suggestion:** Replace with example.com or use placeholder URLs

**LOW** - Line 172: emails
- **Match:** `squid-team@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

**LOW** - Line 174: emails
- **Match:** `team-lead@q.network`
- **Suggestion:** Replace with example@example.com or use placeholder emails

