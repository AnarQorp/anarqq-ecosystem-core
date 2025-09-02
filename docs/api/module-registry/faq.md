# Frequently Asked Questions (FAQ)

## General Questions

### What is the Module Registry API?

The Module Registry API is a comprehensive system for registering, discovering, and managing modules in the Q ecosystem. It provides secure, auditable module registration with cryptographic signatures, dependency management, and compliance tracking.

### Who can register modules?

Module registration requires specific identity types:
- **ROOT Identity**: Can register any module
- **DAO Identity**: Can register DAO-specific modules
- **ENTERPRISE Identity**: Can register enterprise modules

Individual identities cannot register modules but can discover and use them.

### What's the difference between production and sandbox mode?

- **Production Mode**: Modules are publicly available and discoverable by all ecosystem participants
- **Sandbox Mode**: Modules are only visible to development identities and can be used for testing before production deployment

### How much does it cost to register a module?

Module registration is currently free, but rate limits apply:
- 10 registrations per minute per identity
- 5 batch operations per minute per identity
- Higher limits available for enterprise accounts

## Registration Questions

### What information is required to register a module?

**Required fields:**
- Module name (3-50 characters)
- Version (semantic versioning)
- Description (10-500 characters)
- Supported identity types
- Repository URL
- At least one ecosystem integration

**Optional but recommended:**
- Documentation IPFS CID
- Security audit hash
- Compliance information

### Can I register the same module name with different versions?

Yes! Each module name can have multiple versions. For example:
- `my-module@1.0.0`
- `my-module@1.1.0`
- `my-module@2.0.0`

However, you cannot register the same name + version combination twice.

### What happens if my registration fails?

The system provides detailed error messages and suggested recovery actions:

1. **Validation errors**: Fix the metadata and retry
2. **Network errors**: Automatic retry with exponential backoff
3. **Service unavailable**: Fallback to sandbox mode
4. **Signature errors**: Regenerate signature and retry

### Can I update a module after registration?

Yes, you can update:
- Version number
- Description
- Documentation CID
- Audit hash
- Compliance information

You cannot change:
- Module name
- Supported identity types (requires new version)
- Repository URL (requires new version)

### How do I delete a registered module?

Use the deregistration endpoint or CLI:

```bash
qwallet-module-cli deregister my-module
```

**Note**: Modules with dependencies cannot be deregistered until dependent modules are updated or removed.

## Discovery Questions

### How do I find modules compatible with my identity?

Use the identity-specific discovery endpoint:

```bash
# Find modules for DAO identity
curl "https://api.example.com/api/modules/for-identity/DAO"

# With compatibility scoring
curl "https://api.example.com/api/modules/for-identity/DAO?includeCompatibilityScore=true"
```

### Can I search for modules by functionality?

Yes, use the search API with various criteria:

```bash
# Search by description keywords
curl "https://api.example.com/api/modules/search?q=payment+wallet"

# Search by integration
curl "https://api.example.com/api/modules/search?integration=Qlock"

# Search by compliance features
curl "https://api.example.com/api/modules/search?hasCompliance=true"
```

### How do I get detailed information about a module?

Use the module details endpoint:

```bash
curl "https://api.example.com/api/modules/qwallet-core?includeHistory=true&includeDependencies=true"
```

### Are search results cached?

Yes, search results are cached for performance:
- Search results: 5 minutes
- Module metadata: 15 minutes
- Dependency information: 10 minutes

Use `cache=false` parameter to bypass cache when needed.

## Technical Questions

### What signature algorithms are supported?

The system supports multiple cryptographic algorithms:
- RSA-SHA256 (recommended)
- ECDSA-SHA256
- Ed25519
- RSA-PSS-SHA256

### How are module dependencies handled?

Dependencies are automatically resolved and validated:
- **Direct dependencies**: Explicitly declared by the module
- **Transitive dependencies**: Dependencies of dependencies
- **Circular dependency detection**: Prevents infinite loops
- **Version compatibility**: Semantic version matching

### What IPFS gateways are supported for documentation?

The system tries multiple IPFS gateways:
1. `https://ipfs.io/ipfs/`
2. `https://gateway.pinata.cloud/ipfs/`
3. `https://cloudflare-ipfs.com/ipfs/`
4. Custom gateways (configurable)

### How is module verification performed?

Verification includes multiple checks:
- **Metadata validation**: Schema and format validation
- **Signature verification**: Cryptographic signature validation
- **Dependency resolution**: All dependencies available
- **Compliance verification**: Compliance claims validation
- **Audit verification**: Security audit hash validation
- **Documentation availability**: IPFS content accessibility

## Security Questions

### How secure is the module registration process?

Security measures include:
- **Cryptographic signatures**: All modules signed with identity keys
- **Identity verification**: Only authorized identities can register
- **Audit logging**: All operations logged to Qerberos
- **Rate limiting**: Prevents abuse and spam
- **Input validation**: Comprehensive metadata validation
- **Dependency verification**: Prevents malicious dependencies

### Can modules be tampered with after registration?

No, modules are immutable after registration. The cryptographic signature ensures integrity. Any changes require:
1. New version registration
2. New signature with authorized identity
3. Full verification process

### What happens if a security vulnerability is found?

1. **Immediate response**: Module can be suspended by ROOT identity
2. **Notification system**: Dependent modules are notified
3. **Update process**: New version with fixes can be registered
4. **Migration tools**: Automated migration to secure version

### How is compliance information verified?

Compliance information is:
- **Self-declared**: Modules declare their compliance status
- **Audit-backed**: Backed by security audit hash
- **Verifiable**: Claims can be verified against audit reports
- **Tracked**: Changes logged for regulatory compliance

## Integration Questions

### How do I integrate the API into my application?

Multiple integration options:

1. **REST API**: Direct HTTP calls
2. **JavaScript SDK**: `@qwallet/module-registry`
3. **React Hooks**: `@qwallet/hooks`
4. **CLI Tool**: `@qwallet/module-cli`

### What programming languages are supported?

- **JavaScript/TypeScript**: Full SDK and hooks
- **Python**: REST API client (community)
- **Go**: REST API client (community)
- **Rust**: REST API client (community)
- **Any language**: Direct REST API calls

### Can I use the API in a CI/CD pipeline?

Yes! Common CI/CD patterns:

```yaml
# GitHub Actions example
- name: Register Module
  run: |
    npm install -g @qwallet/module-cli
    qwallet-module-cli register \
      --name "${{ github.event.repository.name }}" \
      --version "${{ github.ref_name }}" \
      --repository "${{ github.event.repository.html_url }}"
```

### How do I handle API versioning?

The API uses semantic versioning:
- **Major versions**: Breaking changes (rare)
- **Minor versions**: New features (backward compatible)
- **Patch versions**: Bug fixes

Always specify API version in requests:
```bash
curl -H "API-Version: v1" "https://api.example.com/api/modules"
```

## Performance Questions

### What are the API rate limits?

Rate limits by endpoint type:
- **Registration**: 10 requests/minute per identity
- **Discovery**: 100 requests/minute per IP (500 authenticated)
- **Verification**: 50 requests/minute per IP (200 authenticated)
- **Batch operations**: 5 requests/minute per identity

### How can I optimize API performance?

1. **Use caching**: Leverage built-in response caching
2. **Batch operations**: Register multiple modules at once
3. **Pagination**: Use appropriate page sizes
4. **Filtering**: Use specific filters to reduce response size
5. **Compression**: Enable gzip compression

### What's the typical response time?

Average response times:
- **Module registration**: 2-5 seconds
- **Module search**: 100-500ms
- **Module details**: 50-200ms
- **Verification**: 1-3 seconds

Times may vary based on:
- Network latency
- Module complexity
- Cache hit/miss
- System load

## Billing and Limits Questions

### Are there usage limits?

Current limits (subject to change):
- **Modules per identity**: 1,000
- **Dependencies per module**: 50
- **Description length**: 500 characters
- **Documentation size**: 10MB via IPFS

### How do I increase my limits?

Contact our enterprise team:
- Email: enterprise@qwallet.example.com
- Custom limits available
- SLA guarantees
- Priority support

### Is there a free tier?

Yes! The free tier includes:
- Unlimited module discovery
- 10 module registrations per month
- Standard rate limits
- Community support

## Troubleshooting Questions

### Why is my module registration failing?

Common causes:
1. **Invalid metadata**: Check field requirements
2. **Duplicate name/version**: Use different version
3. **Missing dependencies**: Register dependencies first
4. **Invalid signature**: Check identity credentials
5. **Rate limit**: Wait and retry

### How do I debug API issues?

Enable debug logging:

```bash
# CLI
DEBUG=qwallet:* qwallet-module-cli register --verbose

# SDK
const service = new ModuleRegistrationService({
  logLevel: 'debug'
});
```

### Where can I get help?

Support channels:
- **Documentation**: This guide and API reference
- **GitHub Issues**: Bug reports and feature requests
- **Community Forum**: General questions and discussions
- **Discord**: Real-time community support
- **Email Support**: Technical support team

### How do I report a bug?

1. **Check existing issues**: Search GitHub issues first
2. **Gather information**: Error messages, logs, environment
3. **Create detailed report**: Steps to reproduce, expected vs actual
4. **Include diagnostics**: Version info, configuration

## Future Features

### What new features are planned?

Upcoming features:
- **Module analytics**: Usage statistics and insights
- **Automated testing**: CI/CD integration for module testing
- **Module marketplace**: Economic layer for module distribution
- **Advanced compliance**: Regulatory compliance automation
- **Multi-chain support**: Cross-chain module deployment

### How can I request a feature?

1. **GitHub Issues**: Create feature request
2. **Community Forum**: Discuss with community
3. **Enterprise feedback**: Direct channel for enterprise customers
4. **Developer surveys**: Participate in quarterly surveys

### When will feature X be available?

Check our public roadmap:
- **GitHub Projects**: Development progress
- **Release notes**: Feature announcements
- **Developer blog**: Detailed feature explanations
- **Community calls**: Monthly progress updates

---

*Don't see your question here? Check our [documentation](./README.md) or reach out to our [support team](mailto:support@qwallet.example.com).*