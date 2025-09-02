# Qmarket Compatibility Matrix

This document defines the compatibility requirements and version dependencies for the Qmarket module with other Q ecosystem modules and external services.

## Q Ecosystem Module Dependencies

### Required Dependencies
These modules are essential for Qmarket functionality and must be available.

| Module | Minimum Version | Recommended Version | Integration Type | Fallback Strategy |
|--------|----------------|-------------------|------------------|-------------------|
| sQuid | 1.0.0 | 1.2.0+ | HTTP API + Events | Mock service |
| Qwallet | 1.0.0 | 1.1.0+ | HTTP API + MCP | Mock payments |
| Qlock | 1.0.0 | 1.0.0+ | MCP Tools | Basic encryption |
| Qonsent | 1.0.0 | 1.0.0+ | HTTP API + MCP | Permissive mode |
| Qindex | 1.0.0 | 1.0.0+ | HTTP API + MCP | Local indexing |
| Qerberos | 1.0.0 | 1.0.0+ | HTTP API + Events | Local logging |

### Optional Dependencies
These modules enhance functionality but are not required for basic operation.

| Module | Minimum Version | Recommended Version | Integration Type | Fallback Strategy |
|--------|----------------|-------------------|------------------|-------------------|
| Qmask | 1.0.0 | 1.0.0+ | HTTP API + MCP | No privacy masking |
| QNET | 1.0.0 | 1.0.0+ | HTTP API | Direct IPFS access |
| QpiC | 1.0.0 | 1.0.0+ | HTTP API | No media processing |
| Qdrive | 1.0.0 | 1.0.0+ | HTTP API | Direct IPFS storage |

## API Compatibility

### HTTP API Versions
Qmarket supports multiple API versions for backward compatibility.

```json
{
  "supportedVersions": {
    "v1": {
      "status": "stable",
      "introduced": "1.0.0",
      "deprecated": null,
      "sunset": null,
      "features": ["basic_marketplace", "payments", "licensing"]
    },
    "v2": {
      "status": "beta",
      "introduced": "1.1.0",
      "deprecated": null,
      "sunset": null,
      "features": ["enhanced_search", "bulk_operations", "analytics"]
    }
  },
  "defaultVersion": "v1",
  "versionHeader": "X-API-Version",
  "versionParameter": "version"
}
```

### MCP Tool Compatibility
MCP tools maintain backward compatibility within major versions.

```json
{
  "mcpVersion": "1.0.0",
  "tools": {
    "qmarket.list": {
      "version": "1.0.0",
      "backwardCompatible": ["1.0.0"],
      "forwardCompatible": ["1.1.0"]
    },
    "qmarket.purchase": {
      "version": "1.0.0",
      "backwardCompatible": ["1.0.0"],
      "forwardCompatible": ["1.1.0"]
    },
    "qmarket.license": {
      "version": "1.0.0",
      "backwardCompatible": ["1.0.0"],
      "forwardCompatible": ["1.1.0"]
    }
  }
}
```

## Event Schema Compatibility

### Event Versioning
Events follow semantic versioning with backward compatibility guarantees.

```json
{
  "eventSchemas": {
    "q.qmarket.listed.v1": {
      "version": "1.0.0",
      "status": "stable",
      "backwardCompatible": true,
      "consumers": ["qerberos", "qindex", "analytics"],
      "breaking_changes": []
    },
    "q.qmarket.sold.v1": {
      "version": "1.0.0",
      "status": "stable",
      "backwardCompatible": true,
      "consumers": ["qerberos", "qwallet", "revenue"],
      "breaking_changes": []
    },
    "q.qmarket.updated.v1": {
      "version": "1.0.0",
      "status": "stable",
      "backwardCompatible": true,
      "consumers": ["qerberos", "qindex"],
      "breaking_changes": []
    }
  }
}
```

### Schema Evolution Rules
1. **Additive Changes**: New optional fields can be added without version increment
2. **Deprecation**: Fields marked deprecated for at least one major version before removal
3. **Breaking Changes**: Require new major version (v2, v3, etc.)
4. **Consumer Compatibility**: Maintain compatibility with existing consumers

## External Service Dependencies

### IPFS Compatibility
Support for multiple IPFS implementations and versions.

| IPFS Implementation | Minimum Version | Recommended Version | Features Used |
|-------------------|----------------|-------------------|---------------|
| go-ipfs | 0.12.0 | 0.18.0+ | Add, Pin, Get, DAG |
| js-ipfs | 0.60.0 | 0.65.0+ | Add, Pin, Get |
| Kubo | 0.18.0 | 0.20.0+ | Add, Pin, Get, DAG |

### Pinning Service Compatibility

| Service | API Version | Features | Fallback |
|---------|-------------|----------|----------|
| Pinata | v1 | Pinning, Metadata | Local pinning |
| Web3.Storage | v1 | Pinning, Filecoin | Local pinning |
| NFT.Storage | v1 | NFT-specific | Local pinning |

### Blockchain Compatibility
Support for multiple blockchain networks for NFT minting and payments.

| Network | Minimum Version | Features | Status |
|---------|----------------|----------|--------|
| Ethereum | London Fork | ERC-721, ERC-1155 | Supported |
| Polygon | Mumbai | ERC-721, ERC-1155 | Supported |
| Pi Network | Mainnet | Native tokens | Supported |
| Arbitrum | Nitro | ERC-721, ERC-1155 | Planned |

## Database Compatibility

### Supported Databases
Qmarket can work with various database backends.

| Database | Minimum Version | Recommended Version | Use Case |
|----------|----------------|-------------------|----------|
| PostgreSQL | 12.0 | 15.0+ | Production |
| MongoDB | 4.4 | 6.0+ | Document storage |
| Redis | 6.0 | 7.0+ | Caching |
| SQLite | 3.35 | 3.40+ | Development |

### Migration Compatibility
Database schema migrations maintain backward compatibility.

```json
{
  "migrations": {
    "1.0.0": {
      "description": "Initial schema",
      "reversible": false
    },
    "1.1.0": {
      "description": "Add analytics tables",
      "reversible": true,
      "dependencies": ["1.0.0"]
    },
    "1.2.0": {
      "description": "Add license management",
      "reversible": true,
      "dependencies": ["1.1.0"]
    }
  }
}
```

## Runtime Environment Compatibility

### Node.js Versions
Qmarket supports LTS and current Node.js versions.

| Node.js Version | Status | Support Level |
|----------------|--------|---------------|
| 16.x | LTS | Full support |
| 18.x | LTS | Full support |
| 20.x | Current | Full support |
| 21.x | Current | Beta support |

### Container Compatibility

| Container Runtime | Minimum Version | Features |
|------------------|----------------|----------|
| Docker | 20.10 | Multi-stage builds |
| Podman | 3.0 | Rootless containers |
| containerd | 1.5 | OCI compliance |

### Operating System Compatibility

| OS | Architecture | Status |
|----|-------------|--------|
| Linux | x86_64 | Supported |
| Linux | ARM64 | Supported |
| macOS | x86_64 | Development |
| macOS | ARM64 | Development |
| Windows | x86_64 | Limited |

## Integration Testing Matrix

### Module Integration Tests
Automated tests verify compatibility between Qmarket and other modules.

```json
{
  "integrationTests": {
    "qmarket_squid": {
      "testCases": ["auth_flow", "identity_verification", "subidentity_support"],
      "frequency": "daily",
      "environments": ["staging", "production"]
    },
    "qmarket_qwallet": {
      "testCases": ["payment_flow", "nft_minting", "fee_distribution"],
      "frequency": "daily",
      "environments": ["staging", "production"]
    },
    "qmarket_qonsent": {
      "testCases": ["permission_check", "access_control", "privacy_profiles"],
      "frequency": "daily",
      "environments": ["staging", "production"]
    }
  }
}
```

### End-to-End Compatibility Tests
Full workflow tests across multiple modules.

```json
{
  "e2eTests": {
    "complete_marketplace_flow": {
      "steps": [
        "authenticate_with_squid",
        "create_listing_with_qlock_encryption",
        "index_with_qindex",
        "purchase_with_qwallet",
        "grant_access_with_qonsent",
        "audit_with_qerberos"
      ],
      "modules": ["squid", "qlock", "qindex", "qwallet", "qonsent", "qerberos"],
      "frequency": "weekly"
    }
  }
}
```

## Version Compatibility Guarantees

### Semantic Versioning
Qmarket follows semantic versioning (MAJOR.MINOR.PATCH).

- **MAJOR**: Breaking changes to APIs or data formats
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Compatibility Promises

#### API Compatibility
- **Within Major Version**: Full backward compatibility
- **Across Major Versions**: Migration path provided
- **Deprecation Notice**: 6 months minimum before removal

#### Event Compatibility
- **Schema Evolution**: Additive changes only within major version
- **Consumer Support**: Maintain compatibility with existing consumers
- **Migration Tools**: Automated migration for breaking changes

#### Data Compatibility
- **Database Schema**: Automated migrations provided
- **File Formats**: Backward compatibility maintained
- **Configuration**: Graceful handling of old config formats

## Deployment Compatibility

### Environment Requirements

#### Development Environment
```json
{
  "minimum": {
    "cpu": "2 cores",
    "memory": "4GB",
    "storage": "20GB",
    "network": "broadband"
  },
  "recommended": {
    "cpu": "4 cores",
    "memory": "8GB",
    "storage": "50GB",
    "network": "high-speed"
  }
}
```

#### Production Environment
```json
{
  "minimum": {
    "cpu": "4 cores",
    "memory": "8GB",
    "storage": "100GB",
    "network": "enterprise"
  },
  "recommended": {
    "cpu": "8 cores",
    "memory": "16GB",
    "storage": "500GB",
    "network": "enterprise"
  }
}
```

### Scaling Compatibility
Qmarket supports horizontal and vertical scaling.

| Scaling Type | Method | Limitations |
|-------------|--------|-------------|
| Horizontal | Load balancer + multiple instances | Stateless design required |
| Vertical | Increase CPU/memory | Single instance limits |
| Database | Read replicas, sharding | Eventual consistency |

## Security Compatibility

### Encryption Standards
Support for multiple encryption standards and algorithms.

| Standard | Version | Use Case | Status |
|----------|---------|----------|--------|
| AES | 256-bit | Data encryption | Supported |
| RSA | 2048-bit+ | Key exchange | Supported |
| ECDSA | P-256 | Digital signatures | Supported |
| Post-Quantum | Kyber, Dilithium | Future-proofing | Planned |

### Authentication Methods
Multiple authentication methods supported.

| Method | Standard | Integration | Status |
|--------|----------|-------------|--------|
| JWT | RFC 7519 | sQuid | Supported |
| OAuth 2.0 | RFC 6749 | External providers | Planned |
| WebAuthn | W3C | Hardware tokens | Planned |

## Monitoring and Observability Compatibility

### Metrics Formats
Support for multiple metrics and monitoring formats.

| Format | Use Case | Integration |
|--------|----------|-------------|
| Prometheus | Metrics collection | Native |
| OpenTelemetry | Distributed tracing | Native |
| StatsD | Custom metrics | Plugin |
| JSON | Log aggregation | Native |

### Log Formats
Structured logging with multiple output formats.

| Format | Use Case | Configuration |
|--------|----------|---------------|
| JSON | Machine processing | Default |
| Plain text | Human reading | Development |
| Syslog | System integration | Production |

## Troubleshooting Compatibility Issues

### Common Issues and Solutions

#### Version Mismatch
**Problem**: Module versions incompatible
**Solution**: Check compatibility matrix, upgrade/downgrade as needed
**Prevention**: Automated dependency checking in CI/CD

#### API Changes
**Problem**: Breaking changes in dependent modules
**Solution**: Use compatibility layer or update integration
**Prevention**: Subscribe to module change notifications

#### Event Schema Changes
**Problem**: Event consumers can't parse new schema
**Solution**: Use schema registry for validation
**Prevention**: Gradual schema evolution with versioning

### Diagnostic Tools
- **Health Check Endpoint**: `/health` - Check module status and dependencies
- **Compatibility Check**: `/compat` - Verify version compatibility
- **Integration Test**: `/test/integration` - Run integration tests
- **Dependency Graph**: `/deps` - Show module dependencies