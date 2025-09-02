# Demo Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the AnarQ&Q ecosystem demo environment. It covers common issues, diagnostic procedures, and resolution steps for all demo scenarios.

## Quick Diagnostic Checklist

### Pre-Demo Health Check

```bash
#!/bin/bash
# Quick health check script

echo "🔍 AnarQ&Q Demo Health Check"
echo "============================"

# Check services
services=("anarq-postgres" "anarq-redis" "anarq-ipfs")
for service in "${services[@]}"; do
    if docker ps | grep -q "$service"; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: Not running"
    fi
done

# Check API endpoints
endpoints=("http://localhost:3000/api/health" "http://localhost:5001/api/v0/version")
for endpoint in "${endpoints[@]}"; do
    if curl -s "$endpoint" > /dev/null 2>&1; then
        echo "✅ $(echo $endpoint | cut -d'/' -f3): Accessible"
    else
        echo "❌ $(echo $endpoint | cut -d'/' -f3): Not accessible"
    fi
done

# Check environment variables
required_vars=("PI_ENVIRONMENT" "PI_API_KEY" "DATABASE_URL" "IPFS_API_URL")
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var: Set"
    else
        echo "❌ $var: Not set"
    fi
done
```

## Common Issues and Solutions

### 1. Service Startup Issues

#### PostgreSQL Connection Errors

**Symptoms:**
- `ECONNREFUSED` errors when connecting to database
- Demo scripts fail with database connection errors
- Backend API returns 500 errors

**Diagnosis:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs anarq-postgres

# Test connection
pg_isready -h localhost -p 5432
```

**Solutions:**

1. **Start PostgreSQL Container:**
```bash
docker run --name anarq-postgres \
  -e POSTGRES_DB=anarq_demo \
  -e POSTGRES_USER=anarq \
  -e POSTGRES_PASSWORD=demo_password \
  -p 5432:5432 \
  -d postgres:13
```

2. **Reset PostgreSQL Data:**
```bash
docker stop anarq-postgres
docker rm anarq-postgres
docker volume prune -f
# Then restart with the command above
```

3. **Check Port Conflicts:**
```bash
sudo netstat -tulpn | grep :5432
# Kill conflicting processes if found
sudo fuser -k 5432/tcp
```

#### IPFS Node Issues

**Symptoms:**
- IPFS API calls timeout
- Content upload/retrieval fails
- `Connection refused` errors to IPFS

**Diagnosis:**
```bash
# Check IPFS container status
docker ps | grep ipfs

# Test IPFS API
curl http://localhost:5001/api/v0/version

# Check IPFS logs
docker logs anarq-ipfs
```

**Solutions:**

1. **Restart IPFS Container:**
```bash
docker stop anarq-ipfs
docker rm anarq-ipfs
docker run --name anarq-ipfs \
  -p 4001:4001 \
  -p 5001:5001 \
  -p 8080:8080 \
  -d ipfs/go-ipfs:latest
```

2. **Initialize IPFS Configuration:**
```bash
# Wait for IPFS to start, then configure
sleep 15
./backend/scripts/init-ipfs.sh
```

3. **Check IPFS Storage:**
```bash
# Check available space
df -h
# IPFS needs at least 1GB free space
```

#### Redis Connection Issues

**Symptoms:**
- Session management failures
- Cache-related errors
- `Redis connection lost` messages

**Diagnosis:**
```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis logs
docker logs anarq-redis
```

**Solutions:**

1. **Restart Redis:**
```bash
docker stop anarq-redis
docker rm anarq-redis
docker run --name anarq-redis \
  -p 6379:6379 \
  -d redis:alpine
```

2. **Clear Redis Data:**
```bash
redis-cli -h localhost -p 6379 FLUSHALL
```

### 2. Pi Network Integration Issues

#### Pi API Authentication Failures

**Symptoms:**
- `Invalid API key` errors
- Pi authentication timeouts
- `Unauthorized` responses from Pi Network

**Diagnosis:**
```bash
# Check Pi environment variables
echo "PI_ENVIRONMENT: $PI_ENVIRONMENT"
echo "PI_API_KEY: ${PI_API_KEY:0:10}..." # Show only first 10 chars

# Test Pi API connectivity
curl -H "Authorization: Key $PI_API_KEY" \
  "https://api.sandbox.minepi.com/v2/me"
```

**Solutions:**

1. **Verify Pi Credentials:**
```bash
# Check Pi Developer Portal for correct credentials
# Ensure using sandbox credentials for demo
export PI_ENVIRONMENT=sandbox
export PI_API_KEY=your_sandbox_api_key
export PI_APP_ID=your_sandbox_app_id
```

2. **Test Pi Integration:**
```javascript
// Test Pi integration manually
const { PiIntegrationLayer } = require('./backend/services/PiIntegrationLayer.mjs');

async function testPiIntegration() {
  const pi = new PiIntegrationLayer();
  pi.setEnvironment('sandbox');
  
  try {
    const status = await pi.getStatus();
    console.log('Pi Integration Status:', status);
  } catch (error) {
    console.error('Pi Integration Error:', error.message);
  }
}

testPiIntegration();
```

#### Pi Browser Compatibility Issues

**Symptoms:**
- CSP violations in browser console
- Pi SDK fails to load
- `Content Security Policy` errors

**Diagnosis:**
```bash
# Check CSP headers
curl -I http://localhost:3000/

# Validate CSP configuration
node -e "
const { PiCSPValidator } = require('./docs/pi/en/browser-compatibility.md');
const validator = new PiCSPValidator();
// Run CSP validation
"
```

**Solutions:**

1. **Update CSP Headers:**
```javascript
// Add to server configuration
app.use((req, res, next) => {
  res.header('Content-Security-Policy', 
    "default-src 'self' https://*.minepi.com; " +
    "script-src 'self' 'unsafe-inline' https://*.minepi.com; " +
    "connect-src 'self' https://*.minepi.com wss://*.minepi.com"
  );
  next();
});
```

2. **Test Pi Browser Features:**
```javascript
// Test Pi Browser detection
if (typeof window !== 'undefined') {
  console.log('Pi Browser:', window.Pi ? 'Detected' : 'Not detected');
  console.log('User Agent:', navigator.userAgent);
}
```

### 3. Demo Scenario Failures

#### Identity Flow Demo Issues

**Common Failure Points:**

1. **sQuid Identity Creation Fails**
```bash
# Check sQuid service logs
pm2 logs | grep squid

# Verify sQuid service is running
curl http://localhost:3000/api/squid/health
```

**Solution:**
```bash
# Restart sQuid-related services
pm2 restart anarq-backend
```

2. **Pi Identity Linking Fails**
```bash
# Check Pi integration logs
pm2 logs | grep "pi.*integration"

# Verify Pi credentials
node -e "console.log('PI_API_KEY:', process.env.PI_API_KEY ? 'Set' : 'Not set')"
```

**Solution:**
```bash
# Reset Pi integration state
redis-cli -h localhost -p 6379 DEL "pi:*"
```

3. **Cross-Platform Authentication Fails**
```bash
# Check JWT configuration
node -e "console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set')"

# Verify session storage
redis-cli -h localhost -p 6379 KEYS "session:*"
```

#### Content Flow Demo Issues

**Common Failure Points:**

1. **Content Encryption Fails**
```bash
# Check Qlock service
curl http://localhost:3000/api/qlock/health

# Verify encryption keys
node -e "console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'Set' : 'Not set')"
```

**Solution:**
```bash
# Generate new encryption key if missing
export ENCRYPTION_KEY=$(openssl rand -hex 32)
```

2. **IPFS Upload Fails**
```bash
# Test IPFS upload manually
echo "test content" | curl -X POST \
  -F "file=@-" \
  http://localhost:5001/api/v0/add
```

**Solution:**
```bash
# Check IPFS disk space
docker exec anarq-ipfs df -h /data/ipfs

# Clean up IPFS if needed
docker exec anarq-ipfs ipfs repo gc
```

3. **Content Indexing Fails**
```bash
# Check Qindex service
curl http://localhost:3000/api/qindex/health

# Verify database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM content_index;"
```

#### DAO Governance Demo Issues

**Common Failure Points:**

1. **Proposal Creation Fails**
```bash
# Check DAO service
curl http://localhost:3000/api/dao/health

# Verify smart contract deployment
node -e "
const { PiIntegrationLayer } = require('./backend/services/PiIntegrationLayer.mjs');
const pi = new PiIntegrationLayer();
pi.getContractAddress('QDAOGovernance').then(console.log);
"
```

2. **Voting Process Fails**
```bash
# Check voting power calculation
psql $DATABASE_URL -c "SELECT squid_id, voting_power FROM dao_members;"

# Verify vote recording
psql $DATABASE_URL -c "SELECT * FROM dao_votes ORDER BY created_at DESC LIMIT 5;"
```

### 4. Performance Issues

#### Slow Demo Execution

**Symptoms:**
- Demo scenarios exceed expected duration
- API responses are slow (>1 second)
- High CPU or memory usage

**Diagnosis:**
```bash
# Check system resources
top -bn1 | head -20

# Check memory usage
free -h

# Check disk I/O
iostat -x 1 5

# Check network usage
iftop -t -s 10
```

**Solutions:**

1. **Optimize Database Performance:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

2. **Optimize IPFS Performance:**
```bash
# Increase IPFS cache size
docker exec anarq-ipfs ipfs config Datastore.StorageMax 2GB

# Enable IPFS experimental features
docker exec anarq-ipfs ipfs config --json Experimental.FilestoreEnabled true
```

3. **Optimize Application Performance:**
```javascript
// Enable Node.js performance monitoring
node --inspect=0.0.0.0:9229 backend/server.mjs

// Use PM2 monitoring
pm2 monit
```

#### Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- `Out of memory` errors
- Demo failures after multiple runs

**Diagnosis:**
```bash
# Monitor memory usage over time
while true; do
  echo "$(date): $(free -m | grep Mem | awk '{print $3}')" >> memory.log
  sleep 30
done

# Check Node.js heap usage
node -e "
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Heap used:', Math.round(used.heapUsed / 1024 / 1024), 'MB');
}, 5000);
"
```

**Solutions:**

1. **Restart Services Periodically:**
```bash
# Add to crontab for periodic restart
0 */6 * * * pm2 restart all
```

2. **Optimize Node.js Memory:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection logging
export NODE_OPTIONS="--trace-gc"
```

### 5. Network and Connectivity Issues

#### DNS Resolution Problems

**Symptoms:**
- `ENOTFOUND` errors
- Timeouts connecting to external services
- Pi Network API unreachable

**Diagnosis:**
```bash
# Test DNS resolution
nslookup api.sandbox.minepi.com
dig api.sandbox.minepi.com

# Check network connectivity
ping -c 4 8.8.8.8
curl -I https://api.sandbox.minepi.com
```

**Solutions:**

1. **Configure DNS:**
```bash
# Add to /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
```

2. **Use Alternative DNS:**
```bash
# Configure systemd-resolved
sudo systemctl edit systemd-resolved
# Add:
# [Service]
# Environment=SYSTEMD_LOG_LEVEL=debug
```

#### Firewall Issues

**Symptoms:**
- Connection timeouts
- Services unreachable from outside
- Docker containers can't communicate

**Diagnosis:**
```bash
# Check firewall status
sudo ufw status
sudo iptables -L

# Check port accessibility
sudo netstat -tulpn | grep LISTEN
```

**Solutions:**

1. **Configure Firewall:**
```bash
# Allow required ports
sudo ufw allow 3000  # Backend API
sudo ufw allow 5001  # IPFS API
sudo ufw allow 8080  # IPFS Gateway
```

2. **Configure Docker Networking:**
```bash
# Create custom Docker network
docker network create anarq-network

# Run containers on custom network
docker run --network anarq-network --name anarq-postgres ...
```

## Advanced Troubleshooting

### Log Analysis

#### Centralized Logging Setup

```bash
# Configure PM2 logging
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7

# Aggregate logs
tail -f ~/.pm2/logs/*.log | grep -E "(ERROR|WARN|FAIL)"
```

#### Log Analysis Scripts

```javascript
// Log analyzer script
const fs = require('fs');
const path = require('path');

class LogAnalyzer {
  constructor(logDir = '~/.pm2/logs') {
    this.logDir = logDir;
  }
  
  analyzeErrors(timeRange = 3600000) { // Last hour
    const now = Date.now();
    const cutoff = now - timeRange;
    
    const logFiles = fs.readdirSync(this.logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(this.logDir, file));
    
    const errors = [];
    
    logFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        if (line.includes('ERROR') || line.includes('FAIL')) {
          const timestamp = this.extractTimestamp(line);
          if (timestamp && timestamp > cutoff) {
            errors.push({
              file: path.basename(file),
              timestamp: new Date(timestamp),
              message: line
            });
          }
        }
      });
    });
    
    return errors.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  extractTimestamp(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    return match ? new Date(match[1]).getTime() : null;
  }
}

// Usage
const analyzer = new LogAnalyzer();
const recentErrors = analyzer.analyzeErrors();
console.log('Recent errors:', recentErrors.slice(0, 10));
```

### Database Debugging

#### Query Performance Analysis

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- Analyze slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Database Health Check

```javascript
// Database health checker
const { Pool } = require('pg');

class DatabaseHealthChecker {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }
  
  async checkHealth() {
    const checks = {
      connection: false,
      queryPerformance: null,
      tableStats: null,
      activeConnections: null
    };
    
    try {
      // Test connection
      const client = await this.pool.connect();
      checks.connection = true;
      
      // Test query performance
      const start = Date.now();
      await client.query('SELECT 1');
      checks.queryPerformance = Date.now() - start;
      
      // Check active connections
      const connResult = await client.query(
        'SELECT count(*) as active_connections FROM pg_stat_activity'
      );
      checks.activeConnections = parseInt(connResult.rows[0].active_connections);
      
      // Check table statistics
      const statsResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
      `);
      checks.tableStats = statsResult.rows;
      
      client.release();
      
    } catch (error) {
      checks.error = error.message;
    }
    
    return checks;
  }
}

// Usage
const checker = new DatabaseHealthChecker(process.env.DATABASE_URL);
checker.checkHealth().then(console.log);
```

### IPFS Debugging

#### IPFS Node Diagnostics

```bash
# Check IPFS node info
docker exec anarq-ipfs ipfs id

# Check IPFS peers
docker exec anarq-ipfs ipfs swarm peers | wc -l

# Check IPFS repository status
docker exec anarq-ipfs ipfs repo stat

# Check IPFS configuration
docker exec anarq-ipfs ipfs config show
```

#### IPFS Performance Optimization

```bash
# Optimize IPFS for demo environment
docker exec anarq-ipfs ipfs config Datastore.StorageMax 2GB
docker exec anarq-ipfs ipfs config --json Datastore.StorageGCWatermark 90
docker exec anarq-ipfs ipfs config --json Datastore.GCPeriod '"1h"'

# Enable experimental features
docker exec anarq-ipfs ipfs config --json Experimental.FilestoreEnabled true
docker exec anarq-ipfs ipfs config --json Experimental.UrlstoreEnabled true

# Restart IPFS to apply changes
docker restart anarq-ipfs
```

## Recovery Procedures

### Complete Environment Reset

```bash
#!/bin/bash
# Complete demo environment reset

echo "🔄 Performing complete demo environment reset..."

# Stop all services
pm2 stop all
pm2 delete all

# Stop and remove Docker containers
docker stop anarq-postgres anarq-redis anarq-ipfs 2>/dev/null || true
docker rm anarq-postgres anarq-redis anarq-ipfs 2>/dev/null || true

# Clean Docker volumes
docker volume prune -f

# Clean demo artifacts
rm -rf ./artifacts/demo/fixtures/*
rm -rf ./artifacts/demo/logs/*
rm -rf ./artifacts/demo/results/*

# Clean Node.js cache
npm cache clean --force
rm -rf node_modules/.cache

# Clean PM2 logs
pm2 flush

echo "✅ Environment reset complete. Run './scripts/demo-setup.sh' to reinitialize."
```

### Partial Service Recovery

```bash
#!/bin/bash
# Partial service recovery script

service_name=$1

if [ -z "$service_name" ]; then
    echo "Usage: $0 <service_name>"
    echo "Available services: postgres, redis, ipfs, backend, ecosystem"
    exit 1
fi

case $service_name in
    postgres)
        docker restart anarq-postgres
        sleep 5
        ;;
    redis)
        docker restart anarq-redis
        sleep 2
        ;;
    ipfs)
        docker restart anarq-ipfs
        sleep 10
        ./backend/scripts/init-ipfs.sh
        ;;
    backend)
        pm2 restart anarq-backend
        ;;
    ecosystem)
        pm2 restart anarq-ecosystem
        ;;
    *)
        echo "Unknown service: $service_name"
        exit 1
        ;;
esac

echo "✅ Service $service_name recovered"
```

## Monitoring and Alerting

### Real-time Monitoring Setup

```javascript
// Real-time monitoring script
const { execSync } = require('child_process');
const fs = require('fs');

class DemoMonitor {
  constructor() {
    this.alerts = [];
    this.metrics = {};
  }
  
  startMonitoring() {
    console.log('🔍 Starting demo monitoring...');
    
    setInterval(() => {
      this.checkSystemHealth();
      this.checkServiceHealth();
      this.checkDemoMetrics();
    }, 30000); // Check every 30 seconds
  }
  
  checkSystemHealth() {
    try {
      // Check memory usage
      const memInfo = execSync('free -m').toString();
      const memMatch = memInfo.match(/Mem:\s+(\d+)\s+(\d+)/);
      if (memMatch) {
        const memUsage = (parseInt(memMatch[2]) / parseInt(memMatch[1])) * 100;
        if (memUsage > 80) {
          this.alert('HIGH_MEMORY_USAGE', `Memory usage: ${memUsage.toFixed(1)}%`);
        }
      }
      
      // Check disk usage
      const diskInfo = execSync('df -h /').toString();
      const diskMatch = diskInfo.match(/(\d+)%/);
      if (diskMatch && parseInt(diskMatch[1]) > 85) {
        this.alert('HIGH_DISK_USAGE', `Disk usage: ${diskMatch[1]}`);
      }
      
    } catch (error) {
      this.alert('SYSTEM_CHECK_FAILED', error.message);
    }
  }
  
  checkServiceHealth() {
    const services = [
      { name: 'PostgreSQL', command: 'pg_isready -h localhost -p 5432' },
      { name: 'Redis', command: 'redis-cli -h localhost -p 6379 ping' },
      { name: 'IPFS', command: 'curl -s http://localhost:5001/api/v0/version' },
      { name: 'Backend', command: 'curl -s http://localhost:3000/api/health' }
    ];
    
    services.forEach(service => {
      try {
        execSync(service.command, { stdio: 'pipe' });
      } catch (error) {
        this.alert('SERVICE_DOWN', `${service.name} is not responding`);
      }
    });
  }
  
  checkDemoMetrics() {
    // Check recent demo results
    try {
      const resultsDir = './artifacts/demo/results';
      if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .slice(-3); // Last 3 results
        
        files.forEach(file => {
          const result = JSON.parse(fs.readFileSync(`${resultsDir}/${file}`, 'utf8'));
          if (result.status !== 'completed') {
            this.alert('DEMO_FAILURE', `Demo ${result.scenario} failed: ${result.status}`);
          }
        });
      }
    } catch (error) {
      console.warn('Could not check demo metrics:', error.message);
    }
  }
  
  alert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    console.log(`🚨 ALERT [${type}]: ${message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }
  
  getRecentAlerts(count = 10) {
    return this.alerts.slice(-count);
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new DemoMonitor();
  monitor.startMonitoring();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n📊 Final alert summary:');
    console.log(monitor.getRecentAlerts());
    process.exit(0);
  });
}

module.exports = { DemoMonitor };
```

## Support and Escalation

### Getting Help

1. **Check Documentation**: Review setup and scenario guides
2. **Search Logs**: Use log analysis tools to identify issues
3. **Community Support**: Check GitHub issues and discussions
4. **Developer Support**: Contact through DAO governance system

### Escalation Procedures

1. **Level 1**: Self-service troubleshooting using this guide
2. **Level 2**: Community support and documentation review
3. **Level 3**: Developer team support through official channels

### Reporting Issues

When reporting issues, include:

1. **Environment Information**: OS, Node.js version, Docker version
2. **Error Messages**: Complete error messages and stack traces
3. **Reproduction Steps**: Detailed steps to reproduce the issue
4. **System State**: Output from health check scripts
5. **Log Files**: Relevant log excerpts (sanitized of sensitive data)

This comprehensive troubleshooting guide should help resolve most issues encountered during demo execution and provide clear escalation paths for complex problems.