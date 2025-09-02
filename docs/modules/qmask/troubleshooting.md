# Qmask API - Troubleshooting Guide

This guide helps resolve common issues with qmask.

## Common Issues

### Module Won't Start

**Symptoms:**
- Module exits immediately
- Port binding errors
- Dependency connection failures

**Solutions:**

1. **Check port availability:**
   ```bash
   lsof -i :3000
   # Kill process if needed
   kill -9 <PID>
   ```

2. **Verify environment variables:**
   ```bash
   env | grep qmask
   ```

3. **Check dependency services:**
   ```bash
   # Test service connectivity
   curl http://localhost:3010/health  # sQuid
   curl http://localhost:3020/health  # Qlock
   ```

### Authentication Failures

**Symptoms:**
- 401 Unauthorized responses
- Invalid token errors
- sQuid verification failures

**Solutions:**

1. **Verify sQuid ID format:**
   ```bash
   # Valid format: squid_<base58-encoded-id>
   echo "squid_1A2B3C4D5E6F7G8H9I0J"
   ```

2. **Check JWT token validity:**
   ```javascript
   const jwt = require('jsonwebtoken');
   const decoded = jwt.decode(token, { complete: true });
   console.log(decoded);
   ```

3. **Verify API version header:**
   ```bash
   curl -H "x-api-version: 1.0.0" http://localhost:3000/health
   ```

### Permission Denied Errors

**Symptoms:**
- 403 Forbidden responses
- Qonsent permission failures
- DAO access denied

**Solutions:**

1. **Check Qonsent policies:**
   ```bash
   curl -H "x-squid-id: your-id" \
        http://qonsent:3000/policies/check
   ```

2. **Verify DAO membership:**
   ```bash
   curl -H "x-squid-id: your-id" \
        http://dao:3000/members/check
   ```

### Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests
- Requests being throttled
- Slow response times

**Solutions:**

1. **Check rate limit headers:**
   ```bash
   curl -I http://localhost:3000/api/endpoint
   # Look for X-RateLimit-* headers
   ```

2. **Implement exponential backoff:**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await new Promise(resolve => 
             setTimeout(resolve, Math.pow(2, i) * 1000)
           );
           continue;
         }
         throw error;
       }
     }
   }
   ```

### Database Connection Issues

**Symptoms:**
- Database connection timeouts
- Query failures
- Data inconsistency

**Solutions:**

1. **Check database connectivity:**
   ```bash
   # Test database connection
   nc -zv database-host 5432
   ```

2. **Verify connection pool settings:**
   ```bash
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_TIMEOUT=30000
   ```

### IPFS Integration Issues

**Symptoms:**
- CID resolution failures
- File upload errors
- Pinning failures

**Solutions:**

1. **Check IPFS node status:**
   ```bash
   curl http://localhost:5001/api/v0/id
   ```

2. **Verify pinning service:**
   ```bash
   curl http://localhost:5001/api/v0/pin/ls
   ```

## Performance Issues

### High Memory Usage

**Diagnosis:**
```bash
# Monitor memory usage
docker stats qmask
# or
ps aux | grep qmask
```

**Solutions:**
1. Increase container memory limits
2. Implement connection pooling
3. Add garbage collection tuning

### Slow Response Times

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" http://localhost:3000/api/endpoint
```

**Solutions:**
1. Enable response caching
2. Optimize database queries
3. Implement connection keep-alive

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm start
```

### Health Check Endpoints

```bash
# Basic health
curl http://localhost:3000/health

# Detailed health with dependencies
curl http://localhost:3000/health/detailed
```

### Metrics and Monitoring

```bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Custom debug endpoint
curl http://localhost:3000/debug/status
```

## Getting Help

1. **Check logs:** `docker logs qmask`
2. **Review documentation:** [API Reference](./api-reference.md)
3. **Test with curl:** Use provided examples
4. **Check GitHub issues:** Search for similar problems
5. **Contact support:** Include logs and configuration

## Operational Runbooks

### Service Restart Procedure

1. Check current health status
2. Drain connections gracefully
3. Stop service
4. Clear temporary files
5. Start service
6. Verify health checks
7. Resume traffic

### Backup and Recovery

1. **Data backup:**
   ```bash
   # Backup configuration
   cp -r config/ backup/config-$(date +%Y%m%d)/
   
   # Backup IPFS data
   ipfs repo gc
   tar -czf backup/ipfs-$(date +%Y%m%d).tar.gz ~/.ipfs
   ```

2. **Recovery procedure:**
   ```bash
   # Restore configuration
   cp -r backup/config-latest/ config/
   
   # Restore IPFS data
   tar -xzf backup/ipfs-latest.tar.gz -C ~/
   ```

### Emergency Procedures

1. **Service outage:**
   - Enable maintenance mode
   - Redirect traffic to backup
   - Investigate root cause
   - Apply fix and test
   - Restore normal operation

2. **Data corruption:**
   - Stop write operations
   - Assess damage scope
   - Restore from backup
   - Verify data integrity
   - Resume operations
