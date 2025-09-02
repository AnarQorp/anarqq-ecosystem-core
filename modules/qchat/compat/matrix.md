# Qchat Compatibility Matrix

This document defines the compatibility requirements and integration versions for the Qchat instant messaging module with other Q ecosystem services.

## Service Dependencies

### Core Dependencies (Required)

#### sQuid (Identity & Subidentities)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.2.0+
- **Integration Type**: HTTP API + Events
- **Endpoints Used**:
  - `POST /api/squid/verify` - Identity verification
  - `GET /api/squid/identity/{squidId}` - Identity details
  - `GET /api/squid/reputation/{squidId}` - Reputation score
  - `GET /api/squid/dao-memberships/{squidId}` - DAO memberships
- **Events Consumed**:
  - `q.squid.reputation.updated.v1` - Reputation changes
  - `q.squid.identity.suspended.v1` - Identity suspensions
- **Fallback Strategy**: Mock service in standalone mode
- **Health Check**: `GET /api/squid/health`

#### Qlock (Encryption & Signatures)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.1.0+
- **Integration Type**: MCP Tools + Direct API
- **MCP Tools Used**:
  - `qlock.encrypt` - Message content encryption
  - `qlock.decrypt` - Message content decryption
  - `qlock.sign` - Message signing
  - `qlock.verify` - Signature verification
  - `qlock.deriveKey` - Room key derivation
- **API Endpoints**:
  - `POST /api/qlock/keys/derive` - Key derivation
  - `POST /api/qlock/keys/rotate` - Key rotation
- **Fallback Strategy**: Basic encryption in standalone mode
- **Health Check**: `GET /api/qlock/health`

#### Qonsent (Policies & Permissions)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.1.0+
- **Integration Type**: HTTP API + Real-time
- **Endpoints Used**:
  - `POST /api/qonsent/check` - Permission verification
  - `POST /api/qonsent/grant` - Permission granting
  - `POST /api/qonsent/revoke` - Permission revocation
  - `GET /api/qonsent/policies/{squidId}` - User policies
- **Real-time Integration**: WebSocket for permission revocation
- **Fallback Strategy**: Basic permissions in standalone mode
- **Health Check**: `GET /api/qonsent/health`

### Optional Dependencies (Enhanced Features)

#### Qindex (Indexing & Pointers)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.0.0+
- **Integration Type**: MCP Tools + HTTP API
- **MCP Tools Used**:
  - `qindex.put` - Index room and message records
  - `qindex.get` - Retrieve indexed data
  - `qindex.list` - List indexed records
  - `qindex.search` - Search indexed content
- **Use Cases**:
  - Room discovery and search
  - Message history indexing
  - Cross-room message search
  - User activity tracking
- **Fallback Strategy**: Local indexing in standalone mode
- **Health Check**: `GET /api/qindex/health`

#### Qerberos (Security & Audit)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.1.0+
- **Integration Type**: HTTP API + Events
- **Endpoints Used**:
  - `POST /api/qerberos/audit` - Security event reporting
  - `POST /api/qerberos/risk-assess` - Risk assessment
  - `GET /api/qerberos/threats/{squidId}` - Threat intelligence
- **Events Published**:
  - Security violations
  - Moderation actions
  - Suspicious activity patterns
- **Fallback Strategy**: Basic logging in standalone mode
- **Health Check**: `GET /api/qerberos/health`

#### Qmask (Privacy & Anonymization)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.0.0+
- **Integration Type**: MCP Tools
- **MCP Tools Used**:
  - `qmask.apply` - Apply privacy profiles to messages
  - `qmask.profile` - Get user privacy preferences
- **Use Cases**:
  - Message content anonymization
  - User data privacy protection
  - GDPR compliance support
- **Fallback Strategy**: No anonymization in standalone mode
- **Health Check**: `GET /api/qmask/health`

#### Qwallet (Payments & Fees)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.2.0+
- **Integration Type**: MCP Tools + Events
- **MCP Tools Used**:
  - `wallet.quote` - Get pricing for premium features
  - `wallet.pay` - Process payments for premium rooms
- **Use Cases**:
  - Premium room subscriptions
  - Large file attachment fees
  - Priority message delivery
- **Events Consumed**:
  - `q.qwallet.payment.completed.v1` - Payment confirmations
- **Fallback Strategy**: Free tier only in standalone mode
- **Health Check**: `GET /api/qwallet/health`

### Infrastructure Dependencies

#### IPFS (Storage)
- **Minimum Version**: 0.20.0
- **Recommended Version**: 0.24.0+
- **Integration Type**: HTTP API + Client Library
- **Endpoints Used**:
  - `POST /api/v0/add` - Store encrypted content
  - `GET /api/v0/cat/{cid}` - Retrieve content
  - `POST /api/v0/pin/add` - Pin important content
  - `POST /api/v0/pin/rm` - Unpin expired content
- **Use Cases**:
  - Message content storage
  - Room configuration storage
  - Audit record storage
  - File attachment storage
- **Fallback Strategy**: Local file system in standalone mode
- **Health Check**: `GET /api/v0/version`

#### Redis (Caching & Sessions)
- **Minimum Version**: 6.0.0
- **Recommended Version**: 7.0.0+
- **Integration Type**: Client Library
- **Use Cases**:
  - WebSocket session management
  - Message caching
  - Rate limiting counters
  - Presence data
- **Fallback Strategy**: In-memory storage in standalone mode
- **Health Check**: `PING` command

#### Event Bus (Messaging)
- **Minimum Version**: 1.0.0
- **Recommended Version**: 1.0.0+
- **Integration Type**: Message Queue Client
- **Topics Published**:
  - `q.qchat.message.sent.v1`
  - `q.qchat.room.created.v1`
  - `q.qchat.moderation.action.v1`
  - `q.qchat.presence.updated.v1`
- **Topics Consumed**:
  - `q.squid.reputation.updated.v1`
  - `q.qonsent.permission.revoked.v1`
  - `q.qwallet.payment.completed.v1`
- **Fallback Strategy**: Direct API calls in standalone mode
- **Health Check**: Topic availability check

## Version Compatibility Matrix

### Qchat Version 1.0.0
| Service | Min Version | Max Version | Status | Notes |
|---------|-------------|-------------|--------|-------|
| sQuid | 1.0.0 | 1.x.x | ✅ Supported | Core identity features |
| Qlock | 1.0.0 | 1.x.x | ✅ Supported | Basic encryption |
| Qonsent | 1.0.0 | 1.x.x | ✅ Supported | Basic permissions |
| Qindex | 1.0.0 | 1.x.x | 🟡 Optional | Enhanced search |
| Qerberos | 1.0.0 | 1.x.x | 🟡 Optional | Security monitoring |
| Qmask | 1.0.0 | 1.x.x | 🟡 Optional | Privacy features |
| Qwallet | 1.0.0 | 1.x.x | 🟡 Optional | Premium features |
| IPFS | 0.20.0 | 0.24.x | ✅ Supported | Content storage |
| Redis | 6.0.0 | 7.x.x | ✅ Supported | Caching layer |

### Qchat Version 1.1.0 (Planned)
| Service | Min Version | Max Version | Status | Notes |
|---------|-------------|-------------|--------|-------|
| sQuid | 1.1.0 | 1.x.x | ✅ Supported | Enhanced reputation |
| Qlock | 1.1.0 | 1.x.x | ✅ Supported | Post-quantum crypto |
| Qonsent | 1.1.0 | 1.x.x | ✅ Supported | Advanced policies |
| Qindex | 1.1.0 | 1.x.x | ✅ Recommended | Full-text search |
| Qerberos | 1.1.0 | 1.x.x | ✅ Recommended | AI moderation |
| Qmask | 1.1.0 | 1.x.x | 🟡 Optional | Advanced privacy |
| Qwallet | 1.2.0 | 1.x.x | 🟡 Optional | Multi-chain support |

## Integration Patterns

### Synchronous Integration
- **Identity Verification**: Real-time sQuid API calls
- **Permission Checking**: Real-time Qonsent API calls
- **Message Encryption**: Real-time Qlock operations
- **Risk Assessment**: Real-time Qerberos analysis

### Asynchronous Integration
- **Event Publishing**: Fire-and-forget event publishing
- **Audit Logging**: Batched audit record submission
- **Index Updates**: Background indexing operations
- **Cache Updates**: Eventual consistency for cached data

### Circuit Breaker Patterns
```javascript
// Example circuit breaker configuration
const circuitBreakerConfig = {
  squid: {
    timeout: 5000,
    errorThreshold: 5,
    resetTimeout: 30000,
    fallback: 'mockIdentityService'
  },
  qonsent: {
    timeout: 3000,
    errorThreshold: 3,
    resetTimeout: 15000,
    fallback: 'basicPermissions'
  },
  qlock: {
    timeout: 10000,
    errorThreshold: 2,
    resetTimeout: 60000,
    fallback: 'basicEncryption'
  }
};
```

## Deployment Modes

### Standalone Mode
- **Purpose**: Development, testing, demos
- **Dependencies**: All services mocked
- **Features**: Core functionality only
- **Data**: Local storage only
- **Performance**: Limited scalability

### Hybrid Mode
- **Purpose**: Staging, integration testing
- **Dependencies**: Mix of real and mocked services
- **Features**: Configurable feature set
- **Data**: Mix of real and mock data
- **Performance**: Moderate scalability

### Integrated Mode
- **Purpose**: Production deployment
- **Dependencies**: All real services
- **Features**: Full feature set
- **Data**: Persistent, replicated storage
- **Performance**: Full scalability

## Configuration Management

### Environment Variables
```bash
# Service URLs (integrated mode)
SQUID_URL=https://api.q.network/squid
QLOCK_URL=https://api.q.network/qlock
QONSENT_URL=https://api.q.network/qonsent
QINDEX_URL=https://api.q.network/qindex
QERBEROS_URL=https://api.q.network/qerberos
QMASK_URL=https://api.q.network/qmask
QWALLET_URL=https://api.q.network/qwallet

# Service timeouts (milliseconds)
SQUID_TIMEOUT=5000
QLOCK_TIMEOUT=10000
QONSENT_TIMEOUT=3000
QINDEX_TIMEOUT=15000
QERBEROS_TIMEOUT=5000

# Circuit breaker settings
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_ERROR_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Feature flags
ENABLE_QINDEX_INTEGRATION=true
ENABLE_QERBEROS_INTEGRATION=true
ENABLE_QMASK_INTEGRATION=false
ENABLE_QWALLET_INTEGRATION=false
```

### Service Discovery
- **Static Configuration**: Environment variables for service URLs
- **Dynamic Discovery**: Service registry integration (future)
- **Health Monitoring**: Regular health checks for all dependencies
- **Failover**: Automatic failover to backup services

## Testing Strategy

### Unit Testing
- **Mock Services**: All external services mocked
- **Contract Testing**: Verify service interface contracts
- **Error Handling**: Test circuit breaker and fallback behavior
- **Performance**: Load testing with mocked services

### Integration Testing
- **Service Integration**: Test with real service instances
- **End-to-End**: Complete user workflows across services
- **Failure Scenarios**: Test service unavailability and recovery
- **Version Compatibility**: Test with different service versions

### Compatibility Testing
- **Version Matrix**: Test all supported version combinations
- **Upgrade Testing**: Test service upgrade scenarios
- **Downgrade Testing**: Test service downgrade scenarios
- **Migration Testing**: Test data migration between versions

## Monitoring and Alerting

### Service Health Monitoring
- **Health Checks**: Regular health check calls to all dependencies
- **Response Time**: Monitor API response times
- **Error Rates**: Track error rates for each service
- **Circuit Breaker Status**: Monitor circuit breaker state changes

### Compatibility Monitoring
- **Version Drift**: Alert on unsupported version combinations
- **API Changes**: Monitor for breaking API changes
- **Feature Availability**: Track feature availability across services
- **Performance Impact**: Monitor performance impact of service updates

### Alerting Thresholds
```yaml
alerts:
  service_unavailable:
    threshold: 3_consecutive_failures
    severity: critical
  high_error_rate:
    threshold: 5%_error_rate
    severity: warning
  slow_response:
    threshold: 10s_response_time
    severity: warning
  version_incompatibility:
    threshold: unsupported_version_detected
    severity: critical
```

## Migration and Upgrade Paths

### Service Upgrade Strategy
1. **Compatibility Check**: Verify new version compatibility
2. **Staging Deployment**: Deploy to staging environment
3. **Integration Testing**: Run full integration test suite
4. **Gradual Rollout**: Phased production deployment
5. **Monitoring**: Enhanced monitoring during rollout
6. **Rollback Plan**: Prepared rollback procedures

### Breaking Change Management
1. **Advance Notice**: 30-day notice for breaking changes
2. **Compatibility Layer**: Temporary compatibility shims
3. **Migration Tools**: Automated migration utilities
4. **Documentation**: Updated integration documentation
5. **Support**: Extended support for migration issues

### Version Lifecycle
- **Current**: Fully supported with all features
- **Previous**: Supported with security updates only
- **Deprecated**: 6-month deprecation notice
- **End-of-Life**: No longer supported