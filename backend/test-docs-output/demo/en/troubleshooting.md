# Demo Troubleshooting

## Overview

Guide for resolving common issues during demonstration execution.

## Setup Issues

### Error: "Docker services not responding"

**Symptoms:**
- Timeouts connecting to IPFS
- QNET nodes not accessible
- Health check failures

**Diagnosis:**
```bash
# Check container status
docker-compose -f docker-compose.demo.yml ps

# Check service logs
docker-compose -f docker-compose.demo.yml logs ipfs
docker-compose -f docker-compose.demo.yml logs qnet-node-1

# Check network connectivity
docker network inspect ecosystem_default
```

**Solutions:**
1. Restart services
   ```bash
   docker-compose -f docker-compose.demo.yml down
   docker-compose -f docker-compose.demo.yml up -d
   ```

2. Clean volumes if necessary
   ```bash
   docker-compose -f docker-compose.demo.yml down -v
   docker-compose -f docker-compose.demo.yml up -d
   ```

3. Check available ports
   ```bash
   netstat -tulpn | grep -E ':(5001|8001|8002|8003)'
   ```

### Error: "Test data not loaded"

**Symptoms:**
- sQuid identities not found
- Missing test content
- DAO scenarios not configured

**Solutions:**
```bash
# Regenerate test data
npm run demo:generate-test-data --force

# Verify loaded data
npm run demo:verify-test-data

# Load specific data
npm run demo:load-identities
npm run demo:setup-content
npm run demo:setup-dao-scenarios
```

## Execution Issues

### Scenario Fails with Timeout

**Diagnosis:**
```bash
# Check scenario logs
tail -f artifacts/demo/logs/identity-flow-$(date +%Y%m%d).log

# Check service status
npm run demo:health-check

# Check performance metrics
npm run demo:metrics --scenario=identity-flow
```

**Solutions:**
1. Increase timeout
   ```bash
   npm run demo:identity -- --timeout=60000
   ```

2. Run with debug
   ```bash
   DEBUG=demo:* npm run demo:identity
   ```

3. Check system resources
   ```bash
   free -h
   df -h
   docker stats
   ```

### Error: "Transaction not confirmed"

**Symptoms:**
- Transaction stuck in PENDING state
- Insufficient confirmations
- Balance not updated

**Diagnosis:**
```javascript
// Check transaction status
const demoOrchestrator = new DemoOrchestrator();
const transactionStatus = await demoOrchestrator.getTransactionStatus(transactionId);

console.log('Status:', transactionStatus.status);
console.log('Confirmations:', transactionStatus.confirmations);
console.log('Elapsed time:', transactionStatus.elapsedTime);
```

**Solutions:**
1. Wait for more confirmations
2. Check QNET connectivity
3. Retry transaction if necessary

## Pi Integration Issues

### Error: "Pi API not available"

**Symptoms:**
- Pi Network connection failures
- Authentication errors
- API call timeouts

**Diagnosis:**
```bash
# Check Pi environment variables
echo "PI_ENVIRONMENT: $PI_ENVIRONMENT"
echo "PI_API_KEY: ${PI_API_KEY:0:8}..." # Only show first 8 chars

# Test Pi connectivity
curl -H "Authorization: Bearer $PI_API_KEY" \
     https://api.minepi.com/v2/sandbox/me
```

**Solutions:**
1. Verify Pi credentials
2. Use sandbox environment for testing
3. Skip Pi integration if not critical
   ```bash
   npm run demo:identity -- --skip-pi-integration
   ```

### Error: "Pi contract not deployed"

**Diagnosis:**
```javascript
// Check deployment status
const piIntegration = new PiIntegrationLayer();
const deploymentStatus = await piIntegration.getContractDeploymentStatus(contractId);

console.log('Status:', deploymentStatus.status);
console.log('Gas used:', deploymentStatus.gasUsed);
console.log('Error:', deploymentStatus.error);
```

**Solutions:**
1. Verify contract code
2. Increase gas limit
3. Use pre-deployed contract

## Performance Issues

### Demo Exceeds Time Limit

**Performance Analysis:**
```bash
# Generate performance report
npm run demo:performance-report --scenario=all

# Analyze bottlenecks
npm run demo:analyze-bottlenecks --scenario=content-flow
```

**Optimizations:**
1. Warm up services
   ```bash
   npm run demo:warmup
   ```

2. Run in parallel when possible
   ```bash
   npm run demo:parallel --scenarios="identity,content"
   ```

3. Use cached data
   ```bash
   npm run demo:identity -- --use-cache
   ```

### High Memory Usage

**Monitoring:**
```bash
# Monitor memory usage
watch -n 1 'free -h && echo "---" && docker stats --no-stream'

# Check memory logs
dmesg | grep -i "killed process"
```

**Solutions:**
1. Increase available memory
2. Run scenarios sequentially
3. Clean data between runs

## Diagnostic Tools

### Complete Diagnostic Script

```bash
#!/bin/bash
# demo-diagnostics.sh

echo "Running complete demo diagnostics..."

# Check services
echo "=== SERVICE STATUS ==="
docker-compose -f docker-compose.demo.yml ps

# Check connectivity
echo "=== CONNECTIVITY ==="
curl -s http://localhost:5001/api/v0/version && echo "✓ IPFS OK" || echo "✗ IPFS FAIL"
curl -s http://localhost:8001/health && echo "✓ QNET-1 OK" || echo "✗ QNET-1 FAIL"
curl -s http://localhost:8002/health && echo "✓ QNET-2 OK" || echo "✗ QNET-2 FAIL"
curl -s http://localhost:8003/health && echo "✓ QNET-3 OK" || echo "✗ QNET-3 FAIL"

# Check test data
echo "=== TEST DATA ==="
npm run demo:verify-test-data

# Check system resources
echo "=== SYSTEM RESOURCES ==="
echo "Memory:"
free -h
echo "Disk:"
df -h
echo "CPU:"
top -bn1 | grep "Cpu(s)"

# Check recent logs
echo "=== RECENT LOGS ==="
find artifacts/demo/logs -name "*.log" -mtime -1 -exec echo "{}:" \; -exec tail -3 {} \;

echo "Diagnostics completed."
```

### Quick Recovery Command

```bash
# Quick recovery script
npm run demo:quick-recovery

# This runs:
# 1. Stop all services
# 2. Clean temporary data
# 3. Restart services
# 4. Regenerate test data
# 5. Run smoke test
```

## Logs and Monitoring

### Log Locations

```
artifacts/demo/logs/
├── identity-flow-YYYYMMDD.log      # Identity scenario logs
├── content-flow-YYYYMMDD.log       # Content scenario logs
├── dao-flow-YYYYMMDD.log           # DAO scenario logs
├── pi-integration-YYYYMMDD.log     # Pi integration logs
├── setup-YYYYMMDD.log              # Setup logs
└── diagnostics-YYYYMMDD.log        # Diagnostic logs
```

### Real-time Monitoring

```bash
# Monitor demo execution
npm run demo:monitor --live

# Follow specific logs
tail -f artifacts/demo/logs/identity-flow-$(date +%Y%m%d).log

# Monitor system metrics
watch -n 2 'docker stats --no-stream && echo "---" && free -h'
```

## Contact and Escalation

If issues persist after following this guide:

1. **Gather information**
   - Run complete diagnostics
   - Collect relevant logs
   - Document reproduction steps

2. **Generate issue report**
   ```bash
   npm run demo:generate-issue-report --scenario=identity-flow
   ```

3. **Contact technical support**
   - Include diagnostic report
   - Specify environment and configuration
   - Attach relevant logs

---

*Last Updated: 2025-08-31T09:42:47.579Z*  
*Generated by: DocumentationGenerator v1.0.0*
