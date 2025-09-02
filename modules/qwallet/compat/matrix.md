# Qwallet Compatibility Matrix

This document defines the compatibility requirements and version matrix for Qwallet integration with other Q ecosystem modules.

## Module Dependencies

### Required Dependencies

| Module | Minimum Version | Recommended Version | Purpose |
|--------|----------------|-------------------|---------|
| sQuid | 1.0.0 | 1.2.0+ | Identity verification and authentication |
| Qonsent | 1.0.0 | 1.1.0+ | Permission checking and authorization |
| Qlock | 1.0.0 | 1.3.0+ | Transaction signing and encryption |

### Optional Dependencies

| Module | Minimum Version | Recommended Version | Purpose |
|--------|----------------|-------------------|---------|
| Qindex | 1.0.0 | 1.1.0+ | Transaction indexing and searchability |
| Qerberos | 1.0.0 | 1.2.0+ | Security auditing and risk assessment |
| Qmask | 1.0.0 | 1.0.0+ | Privacy profile application |

## API Compatibility

### sQuid Integration

**Required Endpoints:**
- `POST /verify` - Identity verification
- `GET /identity/{squidId}` - Identity information
- `GET /reputation/{squidId}` - Reputation score

**Headers:**
- `x-squid-id` - Identity identifier
- `x-subid` - Subidentity identifier (optional)
- `x-sig` - Cryptographic signature
- `x-ts` - Timestamp

**Compatibility Notes:**
- sQuid v1.0.x: Basic identity verification
- sQuid v1.1.x: Added subidentity support
- sQuid v1.2.x: Enhanced reputation system

### Qonsent Integration

**Required Endpoints:**
- `POST /check` - Permission verification
- `POST /grant` - Permission granting
- `POST /revoke` - Permission revocation

**Headers:**
- `x-qonsent` - Permission token
- `x-squid-id` - Identity identifier

**Compatibility Notes:**
- Qonsent v1.0.x: Basic permission checking
- Qonsent v1.1.x: Added DAO-based permissions

### Qlock Integration

**Required Endpoints:**
- `POST /sign` - Data signing
- `POST /verify` - Signature verification
- `POST /encrypt` - Data encryption
- `POST /decrypt` - Data decryption

**Compatibility Notes:**
- Qlock v1.0.x: Basic signing and encryption
- Qlock v1.1.x: Added key rotation support
- Qlock v1.2.x: Enhanced algorithm support
- Qlock v1.3.x: Post-quantum cryptography support

## Event Compatibility

### Published Events

| Event Topic | Version | Schema Version | Consumers |
|-------------|---------|----------------|-----------|
| q.qwallet.intent.created.v1 | 1.0.0 | 1.0 | Qindex, Qerberos |
| q.qwallet.tx.signed.v1 | 1.0.0 | 1.0 | Qindex, Qerberos |
| q.qwallet.tx.settled.v1 | 1.0.0 | 1.0 | Qindex, Qerberos |
| q.qwallet.limit.exceeded.v1 | 1.0.0 | 1.0 | Qerberos |
| q.qwallet.balance.updated.v1 | 1.0.0 | 1.0 | Qindex |
| q.qwallet.fee.calculated.v1 | 1.0.0 | 1.0 | Analytics |

### Consumed Events

| Event Topic | Version | Schema Version | Producer |
|-------------|---------|----------------|----------|
| q.squid.reputation.updated.v1 | 1.0.0 | 1.0 | sQuid |
| q.qonsent.revoked.v1 | 1.0.0 | 1.0 | Qonsent |
| q.qerberos.alert.v1 | 1.0.0 | 1.0 | Qerberos |

## Network Compatibility

### Blockchain Networks

| Network | Chain ID | Currency Support | Status |
|---------|----------|------------------|--------|
| AnarQ Chain | 1337 | QToken | Active |
| Ethereum | 1 | QToken (ERC-20) | Active |
| Pi Network | 314159 | PI | Active |
| Polygon | 137 | QToken (ERC-20) | Planned |
| BSC | 56 | QToken (BEP-20) | Planned |

### Network Requirements

**AnarQ Chain:**
- Gas Price: 20 gwei
- Block Time: 15 seconds
- Confirmation: 1 block

**Ethereum:**
- Gas Price: Dynamic (EIP-1559)
- Block Time: 12 seconds
- Confirmation: 3 blocks

**Pi Network:**
- Gas Price: 0.001 PI
- Block Time: 5 seconds
- Confirmation: 1 block

## Data Format Compatibility

### Common Data Types

**IdentityRef:**
```json
{
  "squidId": "string",
  "subId": "string (optional)",
  "daoId": "string (optional)"
}
```

**ConsentRef:**
```json
{
  "policyCid": "string",
  "scope": "string",
  "grant": "string",
  "exp": "number"
}
```

**LockSig:**
```json
{
  "alg": "string",
  "pub": "string",
  "sig": "string",
  "ts": "number",
  "nonce": "string"
}
```

### Currency Formats

**QToken:**
- Decimals: 18
- Format: "1000.123456789012345678"
- Range: 0.000000000000000001 - 1000000000000000000

**PI:**
- Decimals: 8
- Format: "1000.12345678"
- Range: 0.00000001 - 1000000000

## Version Compatibility Matrix

### Qwallet v1.0.x

| Module | Compatible Versions | Notes |
|--------|-------------------|-------|
| sQuid | 1.0.x - 1.2.x | Full compatibility |
| Qonsent | 1.0.x - 1.1.x | Full compatibility |
| Qlock | 1.0.x - 1.3.x | Full compatibility |
| Qindex | 1.0.x - 1.1.x | Optional integration |
| Qerberos | 1.0.x - 1.2.x | Optional integration |
| Qmask | 1.0.x | Optional integration |

### Breaking Changes

**From v0.x to v1.0:**
- Changed API response format to standardized structure
- Updated event schema to include CID and signature
- Modified authentication headers

**Planned for v2.0:**
- Multi-signature wallet support
- Advanced fee optimization
- Cross-chain atomic swaps

## Testing Compatibility

### Test Environments

**Development:**
- All modules: latest development versions
- Mock services enabled
- Relaxed validation

**Staging:**
- All modules: release candidate versions
- Real service integration
- Full validation

**Production:**
- All modules: stable release versions
- High availability configuration
- Comprehensive monitoring

### Compatibility Testing

**Unit Tests:**
- Mock all external dependencies
- Test core functionality in isolation
- Validate data formats and schemas

**Integration Tests:**
- Test with real module versions
- Validate API contracts
- Test event flow and processing

**End-to-End Tests:**
- Complete user workflows
- Cross-module functionality
- Performance and reliability

## Migration Guidelines

### Upgrading Dependencies

1. **Check Compatibility Matrix**: Verify new versions are compatible
2. **Update Configuration**: Modify service URLs and settings
3. **Test Integration**: Run integration tests with new versions
4. **Deploy Gradually**: Use blue-green deployment for safety
5. **Monitor Health**: Watch for errors and performance issues

### Handling Breaking Changes

1. **Version Negotiation**: Support multiple API versions during transition
2. **Backward Compatibility**: Maintain old interfaces temporarily
3. **Migration Tools**: Provide automated migration utilities
4. **Documentation**: Update integration guides and examples
5. **Communication**: Notify consumers of changes and timelines

## Support Matrix

### Supported Configurations

✅ **Fully Supported:**
- Qwallet v1.0.x + sQuid v1.2.x + Qonsent v1.1.x + Qlock v1.3.x
- Standalone mode with mock services
- Docker Compose deployment

⚠️ **Limited Support:**
- Mixed version combinations not in compatibility matrix
- Custom network configurations
- Development/experimental features

❌ **Not Supported:**
- Qwallet v1.x with sQuid v0.x
- Unencrypted communication in production
- Deprecated API versions

### Getting Help

**Documentation:**
- API Reference: `/openapi.yaml`
- Integration Guide: `README.md`
- Troubleshooting: `docs/troubleshooting.md`

**Support Channels:**
- GitHub Issues: Bug reports and feature requests
- Discord: Community support and discussions
- Email: security@anarq.com for security issues

**Professional Support:**
- Enterprise support contracts available
- Custom integration assistance
- Performance optimization consulting