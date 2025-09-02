# AnarQ&Q Demo Setup Guide

## Overview

Complete guide for setting up and running AnarQ&Q ecosystem demonstrations.

## Prerequisites

### System Requirements

- Node.js 18+
- Docker y Docker Compose
- At least 8GB available RAM
- Stable internet connection

### Dependencies

```bash
# Install project dependencies
npm install

# Install demo tools
npm run demo:install
```

## Configuration

### Environment Variables

Create `.env` file with the following variables:

```bash
# Basic configuration
NODE_ENV=demo
DEMO_ENVIRONMENT=local

# QNET configuration
QNET_NODES=3
QNET_PORT_BASE=8000

# IPFS configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Pi Network configuration (optional)
PI_ENVIRONMENT=sandbox
PI_API_KEY=your_pi_api_key
PI_APP_ID=your_pi_app_id

# Database configuration
DATABASE_URL=sqlite:./demo.db
```

### Network Configuration

```yaml
# docker-compose.demo.yml
version: '3.8'
services:
  qnet-node-1:
    image: anarq/qnet:latest
    ports:
      - "8001:8000"
    environment:
      - NODE_ID=qnet-1
      - BOOTSTRAP_NODES=qnet-2:8000,qnet-3:8000
    
  qnet-node-2:
    image: anarq/qnet:latest
    ports:
      - "8002:8000"
    environment:
      - NODE_ID=qnet-2
      - BOOTSTRAP_NODES=qnet-1:8000,qnet-3:8000
    
  qnet-node-3:
    image: anarq/qnet:latest
    ports:
      - "8003:8000"
    environment:
      - NODE_ID=qnet-3
      - BOOTSTRAP_NODES=qnet-1:8000,qnet-2:8000

  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - "4001:4001"
      - "5001:5001"
      - "8080:8080"
    volumes:
      - ipfs_data:/data/ipfs

volumes:
  ipfs_data:
```

## Step-by-Step Setup

### 1. Prepare Environment

```bash
# Clone repository
git clone https://github.com/anarq/ecosystem.git
cd ecosystem

# Set up environment variables
cp .env.demo.example .env
```

### 2. Initialize Services

```bash
# Start infrastructure services
docker-compose -f docker-compose.demo.yml up -d

# Wait for services to be ready
npm run demo:wait-for-services

# Verify services status
npm run demo:health-check
```

### 3. Set Up Test Data

```bash
# Generate canonical test data
npm run demo:generate-test-data

# Load test sQuid identities
npm run demo:load-identities

# Set up test content
npm run demo:setup-content
```

### 4. Validate Configuration

```bash
# Run configuration validations
npm run demo:validate-setup

# Verify node connectivity
npm run demo:test-connectivity

# Test basic flows
npm run demo:smoke-test
```

## ### Setup Scripts

### Main Setup Script

```bash
#!/bin/bash
# demo-setup.sh

set -e

echo "Starting AnarQ&Q demo setup..."

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed"
        exit 1
    fi
    
    echo "Prerequisites verified ✓"
}

# Setup services
setup_services() {
    echo "Setting up services..."
    
    # Start containers
    docker-compose -f docker-compose.demo.yml up -d
    
    # Wait for IPFS to be ready
    echo "Waiting for IPFS..."
    until curl -s http://localhost:5001/api/v0/version > /dev/null; do
        sleep 2
    done
    
    # Wait for QNET to be ready
    echo "Waiting for QNET nodes..."
    for port in 8001 8002 8003; do
        until curl -s http://localhost:$port/health > /dev/null; do
            sleep 2
        done
    done
    
    echo "Services configured ✓"
}

# Generate test data
generate_test_data() {
    echo "Generating test data..."
    
    # Create sQuid identities
    node scripts/demo/generate-identities.mjs
    
    # Create test content
    node scripts/demo/generate-content.mjs
    
    # Set up DAO scenarios
    node scripts/demo/setup-dao-scenarios.mjs
    
    echo "Test data generated ✓"
}

# Run setup
main() {
    check_prerequisites
    setup_services
    generate_test_data
    
    echo ""
    echo "🎉 Demo setup completed!"
    echo ""
    echo "To run demos:"
    echo "  npm run demo:identity"
    echo "  npm run demo:content"
    echo "  npm run demo:dao"
    echo ""
    echo "To validate setup:"
    echo "  npm run demo:validate"
}

main "$@"
```

## ### Configuration Verification

### Verification Checklist

- [ ] Docker services running
- [ ] IPFS accessible on port 5001
- [ ] QNET nodes responding on ports 8001-8003
- [ ] Database initialized
- [ ] Test data loaded
- [ ] Node connectivity verified

### Verification Command

```bash
# Run complete verification
npm run demo:verify-setup

# Expected output:
# ✓ Docker services: OK
# ✓ IPFS connectivity: OK
# ✓ QNET nodes: 3/3 active
# ✓ Database: Initialized
# ✓ Test data: Loaded
# ✓ Setup complete
```

## Troubleshooting

### Common Issues

#### Error: "Port already in use"

```bash
# Check ports in use
netstat -tulpn | grep :8001
netstat -tulpn | grep :5001

# Stop conflicting services
docker-compose -f docker-compose.demo.yml down
```

#### Error: "IPFS not responding"

```bash
# Restart IPFS
docker-compose -f docker-compose.demo.yml restart ipfs

# Check logs
docker-compose -f docker-compose.demo.yml logs ipfs
```

#### Error: "QNET nodes not connecting"

```bash
# Check network configuration
docker network ls
docker network inspect ecosystem_default

# Restart nodes
docker-compose -f docker-compose.demo.yml restart
```

---

*Last Updated: 2025-08-31T09:42:47.575Z*  
*Generated by: DocumentationGenerator v1.0.0*
