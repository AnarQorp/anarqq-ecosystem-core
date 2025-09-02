# sQuid Identity Module Migration Guide

## Overview

This guide covers the migration of the legacy identity service to the new sQuid module with standalone operation, HTTP API, and MCP tools support.

## Pre-Migration Assessment

### Current State Analysis

```bash
# Analyze current identity data
npm run squid:analyze-legacy-data

# Check identity relationships
npm run squid:check-relationships

# Validate data integrity
npm run squid:validate-legacy-integrity
```

### Dependencies Mapping

- **Dependent Services**: All modules that verify identity
- **Data Dependencies**: User profiles, subidentities, DAO memberships
- **Integration Points**: Authentication middleware, API gateways

## Migration Steps

### Step 1: Deploy sQuid Module

```bash
# Deploy sQuid in compatibility mode
cd modules/squid
docker-compose up -d

# Verify deployment
curl http://localhost:3001/health
```

### Step 2: Data Migration

```bash
# Export legacy identity data
npm run squid:export-legacy --format=json

# Import to new sQuid module
npm run squid:import-data --file=legacy-identities.json

# Validate migration
npm run squid:validate-migration
```

### Step 3: Dual-Write Configuration

```javascript
// Configure dual-write mode
const identityConfig = {
  mode: 'dual-write',
  legacy: {
    endpoint: 'http://legacy-identity:3000',
    timeout: 5000
  },
  new: {
    endpoint: 'http://squid:3001',
    timeout: 3000
  }
};
```

### Step 4: Traffic Migration

```bash
# Start with 10% traffic to new module
npm run squid:route-traffic --percentage=10

# Gradually increase traffic
npm run squid:route-traffic --percentage=50
npm run squid:route-traffic --percentage=100
```

## Validation and Testing

### Identity Verification Tests

```bash
# Test identity verification
npm run squid:test-verification

# Test subidentity creation
npm run squid:test-subidentity

# Test DAO associations
npm run squid:test-dao-association
```

### Performance Validation

```bash
# Compare response times
npm run squid:benchmark-performance

# Load testing
npm run squid:load-test --concurrent=100
```

## Rollback Procedures

```bash
# Emergency rollback to legacy
npm run squid:rollback-to-legacy

# Verify rollback success
npm run squid:verify-rollback
```