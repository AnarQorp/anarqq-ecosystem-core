# Demo Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the AnarQ&Q ecosystem demo environment. The demo showcases the complete integration between Q∞ modules, Pi Network, and the decentralized infrastructure.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS 10.15+, or Windows 10+ with WSL2
- **Node.js**: Version 18.0 or higher
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 20GB free space
- **Network**: Stable internet connection with minimum 10 Mbps

### Required Software

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker (for IPFS and other services)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Git
sudo apt-get install git

# Install PM2 for process management
npm install -g pm2
```

### Account Setup

1. **Pi Network Developer Account**
   - Register at [Pi Developer Portal](https://developers.minepi.com)
   - Create sandbox application
   - Obtain API keys and app credentials

2. **IPFS Setup**
   - Install IPFS node or use hosted service
   - Configure IPFS for demo environment

## Environment Configuration

### 1. Clone Repository

```bash
git clone https://github.com/anarq/anar-q-nexus-core.git
cd anar-q-nexus-core
```

### 2. Environment Variables

Create environment configuration files:

```bash
# Copy example environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit environment variables
nano .env
```

### Required Environment Variables

```bash
# Pi Network Configuration
PI_ENVIRONMENT=sandbox
PI_API_KEY=your_pi_sandbox_api_key
PI_APP_ID=your_pi_sandbox_app_id
PI_PRIVATE_KEY=your_pi_private_key_for_contracts
PI_TOKEN_ADDRESS=pi_token_contract_address

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/anarq_demo
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
HASH_SALT=your_hash_salt

# Demo Configuration
DEMO_MODE=true
DEMO_DATA_SEED=12345
DEMO_TIMEOUT=300000
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies (if applicable)
cd frontend
npm install
cd ..
```

## Service Setup

### 1. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run --name anarq-postgres \
  -e POSTGRES_DB=anarq_demo \
  -e POSTGRES_USER=anarq \
  -e POSTGRES_PASSWORD=demo_password \
  -p 5432:5432 \
  -d postgres:13

# Start Redis
docker run --name anarq-redis \
  -p 6379:6379 \
  -d redis:alpine

# Run database migrations
cd backend
npm run migrate
cd ..
```

### 2. IPFS Setup

```bash
# Start IPFS node (using Docker)
docker run --name anarq-ipfs \
  -p 4001:4001 \
  -p 5001:5001 \
  -p 8080:8080 \
  -d ipfs/go-ipfs:latest

# Initialize IPFS configuration
./backend/scripts/init-ipfs.sh
```

### 3. Service Initialization

```bash
# Initialize demo data
node backend/scripts/init-demo-data.mjs

# Start all services
npm run start:demo
```

## Demo Environment Verification

### 1. Health Check Script

```bash
#!/bin/bash
# File: scripts/demo-health-check.sh

echo "🔍 Checking Demo Environment Health..."

# Check Node.js version
echo "📦 Node.js Version:"
node --version

# Check service availability
echo "🔗 Checking Services:"

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Running"
else
    echo "❌ PostgreSQL: Not running"
fi

# Check Redis
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
fi

# Check IPFS
if curl -s http://localhost:5001/api/v0/version > /dev/null 2>&1; then
    echo "✅ IPFS: Running"
else
    echo "❌ IPFS: Not running"
fi

# Check Backend API
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API: Running"
else
    echo "❌ Backend API: Not running"
fi

echo "🎯 Demo Environment Status: Ready"
```

### 2. Service Status Verification

```javascript
// File: scripts/verify-demo-setup.mjs
import { execSync } from 'child_process';
import fetch from 'node-fetch';

class DemoSetupVerifier {
  async verifySetup() {
    console.log('🔍 Verifying Demo Setup...\n');
    
    const checks = [
      { name: 'Environment Variables', check: this.checkEnvironmentVariables },
      { name: 'Database Connection', check: this.checkDatabase },
      { name: 'IPFS Connection', check: this.checkIPFS },
      { name: 'Pi Integration', check: this.checkPiIntegration },
      { name: 'Demo Data', check: this.checkDemoData }
    ];
    
    const results = [];
    
    for (const { name, check } of checks) {
      try {
        const result = await check.call(this);
        results.push({ name, status: 'PASS', details: result });
        console.log(`✅ ${name}: PASS`);
      } catch (error) {
        results.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ ${name}: FAIL - ${error.message}`);
      }
    }
    
    const passCount = results.filter(r => r.status === 'PASS').length;
    const totalCount = results.length;
    
    console.log(`\n📊 Setup Verification: ${passCount}/${totalCount} checks passed`);
    
    if (passCount === totalCount) {
      console.log('🎉 Demo environment is ready!');
    } else {
      console.log('⚠️  Some checks failed. Please review the setup.');
    }
    
    return results;
  }
  
  async checkEnvironmentVariables() {
    const required = [
      'PI_ENVIRONMENT',
      'PI_API_KEY',
      'PI_APP_ID',
      'IPFS_API_URL',
      'DATABASE_URL'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    return `All ${required.length} required variables set`;
  }
  
  async checkDatabase() {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const result = await pool.query('SELECT NOW()');
      await pool.end();
      
      return `Connected successfully at ${result.rows[0].now}`;
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
  
  async checkIPFS() {
    try {
      const response = await fetch(`${process.env.IPFS_API_URL}/api/v0/version`);
      const data = await response.json();
      
      return `IPFS version ${data.Version} running`;
    } catch (error) {
      throw new Error(`IPFS connection failed: ${error.message}`);
    }
  }
  
  async checkPiIntegration() {
    try {
      const { PiIntegrationLayer } = await import('../backend/services/PiIntegrationLayer.mjs');
      const piIntegration = new PiIntegrationLayer();
      
      piIntegration.setEnvironment(process.env.PI_ENVIRONMENT);
      
      // Test basic Pi integration
      const status = await piIntegration.getStatus();
      
      return `Pi integration ready in ${process.env.PI_ENVIRONMENT} mode`;
    } catch (error) {
      throw new Error(`Pi integration check failed: ${error.message}`);
    }
  }
  
  async checkDemoData() {
    try {
      // Check if demo data exists
      const fs = await import('fs');
      const demoDataPath = './artifacts/demo/fixtures';
      
      if (!fs.existsSync(demoDataPath)) {
        throw new Error('Demo data directory not found');
      }
      
      const files = fs.readdirSync(demoDataPath);
      
      if (files.length === 0) {
        throw new Error('No demo data files found');
      }
      
      return `${files.length} demo data files ready`;
    } catch (error) {
      throw new Error(`Demo data check failed: ${error.message}`);
    }
  }
}

// Run verification
const verifier = new DemoSetupVerifier();
verifier.verifySetup().catch(console.error);
```

## Demo Data Initialization

### 1. Generate Demo Data

```javascript
// File: scripts/generate-demo-data.mjs
import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';

class DemoDataGenerator {
  constructor() {
    this.outputDir = './artifacts/demo/fixtures';
    this.ensureOutputDir();
  }
  
  ensureOutputDir() {
    mkdirSync(this.outputDir, { recursive: true });
  }
  
  generateCanonicalIdentities() {
    const identities = [
      {
        squidId: 'squid-demo-alice-001',
        piUserId: 'pi-demo-alice-001',
        displayName: 'Alice Demo User',
        role: 'content_creator',
        permissions: ['content:create', 'content:share', 'pi:wallet:use'],
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        squidId: 'squid-demo-bob-002',
        piUserId: 'pi-demo-bob-002',
        displayName: 'Bob Demo User',
        role: 'dao_member',
        permissions: ['dao:vote', 'dao:propose', 'pi:wallet:use'],
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        squidId: 'squid-demo-charlie-003',
        piUserId: 'pi-demo-charlie-003',
        displayName: 'Charlie Demo User',
        role: 'validator',
        permissions: ['system:validate', 'consensus:participate'],
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ];
    
    writeFileSync(
      `${this.outputDir}/canonical-identities.json`,
      JSON.stringify(identities, null, 2)
    );
    
    console.log('✅ Generated canonical identities');
    return identities;
  }
  
  generateTestContentSamples() {
    const contentSamples = [
      {
        contentId: 'content-demo-001',
        title: 'Demo Document: AnarQ&Q Overview',
        description: 'A comprehensive overview of the AnarQ&Q ecosystem for demonstration purposes.',
        contentType: 'text/markdown',
        size: 2048,
        tags: ['demo', 'overview', 'documentation'],
        visibility: 'public',
        uploader: 'squid-demo-alice-001',
        createdAt: '2024-01-01T10:00:00.000Z'
      },
      {
        contentId: 'content-demo-002',
        title: 'Demo Image: System Architecture',
        description: 'System architecture diagram for the AnarQ&Q ecosystem.',
        contentType: 'image/png',
        size: 512000,
        tags: ['demo', 'architecture', 'diagram'],
        visibility: 'public',
        uploader: 'squid-demo-bob-002',
        createdAt: '2024-01-01T11:00:00.000Z'
      },
      {
        contentId: 'content-demo-003',
        title: 'Demo Video: Pi Integration Walkthrough',
        description: 'Video demonstration of Pi Network integration features.',
        contentType: 'video/mp4',
        size: 10485760,
        tags: ['demo', 'pi-network', 'integration', 'video'],
        visibility: 'private',
        uploader: 'squid-demo-charlie-003',
        createdAt: '2024-01-01T12:00:00.000Z'
      }
    ];
    
    writeFileSync(
      `${this.outputDir}/test-content-samples.json`,
      JSON.stringify(contentSamples, null, 2)
    );
    
    console.log('✅ Generated test content samples');
    return contentSamples;
  }
  
  generateDAOGovernanceScenarios() {
    const scenarios = [
      {
        proposalId: 'proposal-demo-001',
        title: 'Upgrade Pi Integration Layer',
        description: 'Proposal to upgrade the Pi Integration Layer to support new Pi Network features.',
        proposer: 'squid-demo-bob-002',
        qflowWorkflowId: 'pi-integration-upgrade',
        votingPeriod: 7, // days
        requiredQuorum: 3,
        status: 'active',
        createdAt: '2024-01-01T09:00:00.000Z'
      },
      {
        proposalId: 'proposal-demo-002',
        title: 'Add New Content Storage Tier',
        description: 'Proposal to add a premium content storage tier with enhanced features.',
        proposer: 'squid-demo-alice-001',
        qflowWorkflowId: 'storage-tier-addition',
        votingPeriod: 7,
        requiredQuorum: 3,
        status: 'pending',
        createdAt: '2024-01-02T09:00:00.000Z'
      }
    ];
    
    writeFileSync(
      `${this.outputDir}/dao-governance-scenarios.json`,
      JSON.stringify(scenarios, null, 2)
    );
    
    console.log('✅ Generated DAO governance scenarios');
    return scenarios;
  }
  
  generateAll() {
    console.log('🎯 Generating demo data...\n');
    
    const identities = this.generateCanonicalIdentities();
    const content = this.generateTestContentSamples();
    const governance = this.generateDAOGovernanceScenarios();
    
    // Generate summary
    const summary = {
      generatedAt: new Date().toISOString(),
      identities: identities.length,
      contentSamples: content.length,
      governanceScenarios: governance.length,
      seed: process.env.DEMO_DATA_SEED || '12345'
    };
    
    writeFileSync(
      `${this.outputDir}/demo-data-summary.json`,
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n🎉 Demo data generation complete!');
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`📊 Generated: ${summary.identities} identities, ${summary.contentSamples} content samples, ${summary.governanceScenarios} governance scenarios`);
  }
}

// Generate demo data
const generator = new DemoDataGenerator();
generator.generateAll();
```

## Service Startup Scripts

### 1. Demo Setup Script

```bash
#!/bin/bash
# File: scripts/demo-setup.sh

set -e

echo "🚀 Setting up AnarQ&Q Demo Environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

# Start infrastructure services
echo "🔧 Starting infrastructure services..."

# Start PostgreSQL
if ! docker ps | grep -q anarq-postgres; then
    echo "🐘 Starting PostgreSQL..."
    docker run --name anarq-postgres \
        -e POSTGRES_DB=anarq_demo \
        -e POSTGRES_USER=anarq \
        -e POSTGRES_PASSWORD=demo_password \
        -p 5432:5432 \
        -d postgres:13
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
fi

# Start Redis
if ! docker ps | grep -q anarq-redis; then
    echo "🔴 Starting Redis..."
    docker run --name anarq-redis \
        -p 6379:6379 \
        -d redis:alpine
fi

# Start IPFS
if ! docker ps | grep -q anarq-ipfs; then
    echo "🌐 Starting IPFS..."
    docker run --name anarq-ipfs \
        -p 4001:4001 \
        -p 5001:5001 \
        -p 8080:8080 \
        -d ipfs/go-ipfs:latest
    
    # Wait for IPFS to be ready
    echo "⏳ Waiting for IPFS to be ready..."
    sleep 15
fi

# Initialize IPFS configuration
echo "⚙️  Initializing IPFS configuration..."
./backend/scripts/init-ipfs.sh

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd backend && npm install && cd ..

# Run database migrations
echo "🗄️  Running database migrations..."
cd backend && npm run migrate && cd ..

# Generate demo data
echo "🎭 Generating demo data..."
node scripts/generate-demo-data.mjs

# Initialize demo environment
echo "🎯 Initializing demo environment..."
node backend/scripts/init-demo-data.mjs

# Verify setup
echo "✅ Verifying setup..."
node scripts/verify-demo-setup.mjs

echo "🎉 Demo environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run 'npm run start:demo' to start all services"
echo "2. Run demo scenarios with './scripts/demo-run-*.sh'"
echo "3. Access the demo at http://localhost:3000"
echo ""
echo "🔍 For troubleshooting, check logs with 'pm2 logs'"
```

### 2. Demo Startup Script

```bash
#!/bin/bash
# File: scripts/demo-start.sh

set -e

echo "🎬 Starting AnarQ&Q Demo Services..."

# Start backend services
echo "🔧 Starting backend services..."
cd backend

# Start main backend server
pm2 start server.mjs --name "anarq-backend" --watch

# Start ecosystem services
pm2 start ecosystem/index.mjs --name "anarq-ecosystem" --watch

cd ..

# Start frontend (if applicable)
if [ -d "frontend" ]; then
    echo "🎨 Starting frontend..."
    cd frontend
    pm2 start "npm run dev" --name "anarq-frontend"
    cd ..
fi

# Show status
echo "📊 Service Status:"
pm2 status

echo ""
echo "🎉 Demo services started successfully!"
echo ""
echo "🌐 Access points:"
echo "  - Backend API: http://localhost:3000"
echo "  - IPFS Gateway: http://localhost:8080"
echo "  - Frontend: http://localhost:5173 (if applicable)"
echo ""
echo "📋 Available demo scenarios:"
echo "  - Identity Flow: ./scripts/demo-run-identity.sh"
echo "  - Content Flow: ./scripts/demo-run-content.sh"
echo "  - DAO Flow: ./scripts/demo-run-dao.sh"
echo ""
echo "🔍 Monitor logs: pm2 logs"
echo "🛑 Stop services: pm2 stop all"
```

## Troubleshooting

### Common Setup Issues

1. **Port Conflicts**
   ```bash
   # Check for port usage
   sudo netstat -tulpn | grep :5432  # PostgreSQL
   sudo netstat -tulpn | grep :6379  # Redis
   sudo netstat -tulpn | grep :5001  # IPFS API
   
   # Kill processes using ports
   sudo fuser -k 5432/tcp
   ```

2. **Docker Permission Issues**
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Node.js Version Issues**
   ```bash
   # Use nvm to manage Node.js versions
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

### Environment Reset

```bash
#!/bin/bash
# File: scripts/demo-reset.sh

echo "🔄 Resetting Demo Environment..."

# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Stop and remove Docker containers
docker stop anarq-postgres anarq-redis anarq-ipfs 2>/dev/null || true
docker rm anarq-postgres anarq-redis anarq-ipfs 2>/dev/null || true

# Clean demo data
rm -rf ./artifacts/demo/fixtures/*
rm -rf ./artifacts/demo/logs/*
rm -rf ./artifacts/demo/results/*

echo "✅ Demo environment reset complete!"
echo "Run './scripts/demo-setup.sh' to reinitialize."
```

## Performance Optimization

### Resource Monitoring

```javascript
// File: scripts/monitor-demo-resources.mjs
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

class DemoResourceMonitor {
  constructor() {
    this.metrics = [];
    this.interval = null;
  }
  
  startMonitoring(intervalMs = 5000) {
    console.log('📊 Starting resource monitoring...');
    
    this.interval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);
      
      // Keep only last 100 measurements
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }
      
      this.logMetrics(metrics);
    }, intervalMs);
  }
  
  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Save metrics to file
    writeFileSync(
      './artifacts/demo/logs/resource-metrics.json',
      JSON.stringify(this.metrics, null, 2)
    );
    
    console.log('📊 Resource monitoring stopped. Metrics saved.');
  }
  
  collectMetrics() {
    const timestamp = new Date().toISOString();
    
    // System metrics
    const memInfo = execSync('free -m').toString();
    const cpuInfo = execSync('top -bn1 | grep "Cpu(s)"').toString();
    const diskInfo = execSync('df -h /').toString();
    
    // Docker container metrics
    const dockerStats = this.getDockerStats();
    
    // Node.js process metrics
    const nodeMetrics = process.memoryUsage();
    
    return {
      timestamp,
      system: {
        memory: this.parseMemoryInfo(memInfo),
        cpu: this.parseCpuInfo(cpuInfo),
        disk: this.parseDiskInfo(diskInfo)
      },
      docker: dockerStats,
      node: {
        heapUsed: Math.round(nodeMetrics.heapUsed / 1024 / 1024),
        heapTotal: Math.round(nodeMetrics.heapTotal / 1024 / 1024),
        external: Math.round(nodeMetrics.external / 1024 / 1024),
        rss: Math.round(nodeMetrics.rss / 1024 / 1024)
      }
    };
  }
  
  getDockerStats() {
    try {
      const stats = execSync('docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"').toString();
      return this.parseDockerStats(stats);
    } catch (error) {
      return { error: 'Could not collect Docker stats' };
    }
  }
  
  parseMemoryInfo(memInfo) {
    const lines = memInfo.split('\n');
    const memLine = lines[1].split(/\s+/);
    
    return {
      total: parseInt(memLine[1]),
      used: parseInt(memLine[2]),
      free: parseInt(memLine[3]),
      available: parseInt(memLine[6])
    };
  }
  
  parseCpuInfo(cpuInfo) {
    const match = cpuInfo.match(/(\d+\.\d+)%us/);
    return {
      usage: match ? parseFloat(match[1]) : 0
    };
  }
  
  parseDiskInfo(diskInfo) {
    const lines = diskInfo.split('\n');
    const diskLine = lines[1].split(/\s+/);
    
    return {
      total: diskLine[1],
      used: diskLine[2],
      available: diskLine[3],
      usage: diskLine[4]
    };
  }
  
  parseDockerStats(stats) {
    const lines = stats.split('\n').slice(1, -1); // Remove header and empty line
    const containers = {};
    
    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        containers[parts[0]] = {
          cpu: parts[1],
          memory: parts[2]
        };
      }
    });
    
    return containers;
  }
  
  logMetrics(metrics) {
    console.log(`📊 [${metrics.timestamp}] CPU: ${metrics.system.cpu.usage}% | Memory: ${metrics.system.memory.used}MB/${metrics.system.memory.total}MB | Node Heap: ${metrics.node.heapUsed}MB`);
  }
}

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DemoResourceMonitor();
  
  monitor.startMonitoring();
  
  // Stop monitoring on SIGINT
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
}

export { DemoResourceMonitor };
```

## Next Steps

After completing the setup:

1. **Run Demo Scenarios**: Execute the demo scenarios to verify functionality
2. **Monitor Performance**: Use the monitoring tools to track system performance
3. **Customize Configuration**: Adjust settings based on your specific requirements
4. **Explore Integration**: Test Pi Network integration features
5. **Review Logs**: Check Qerberos audit logs for detailed operation traces

For detailed demo execution instructions, see the [Demo Scenarios Guide](./test-scenarios.md).