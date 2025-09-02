# Qflow Scripts

This directory contains various scripts for managing and validating the Qflow serverless automation engine.

## No Central Server Certification (Task 17.5)

The No Central Server Certification system ensures Qflow operates without any central dependencies.

### Scripts

#### `no-central-server-certification.mjs`
Main certification engine that performs comprehensive analysis and generates cryptographic attestations.

```bash
# Run full certification
node no-central-server-certification.mjs

# Verify existing attestation
node no-central-server-certification.mjs verify

# Show help
node no-central-server-certification.mjs help
```

#### `ci-certification-check.mjs`
CI/CD-friendly version with appropriate exit codes and output formats.

```bash
# Basic CI check
node ci-certification-check.mjs

# Strict mode with JUnit output
node ci-certification-check.mjs --fail-on-warnings --output-format junit --output-file results.xml

# Custom minimum score
node ci-certification-check.mjs --min-score 90
```

#### `test-certification.mjs`
Test suite for the certification system components.

```bash
# Run certification system tests
node test-certification.mjs
```

### NPM Scripts

The certification system is integrated into the package.json scripts:

```bash
# Run certification
npm run certify

# CI-friendly certification
npm run certify:ci

# Verify existing attestation
npm run certify:verify

# Test certification system
npm run certify:test
```

### GitHub Actions Integration

The `.github/workflows/no-central-server-certification.yml` workflow provides:

- Automated certification on push/PR
- Daily scheduled certification checks
- IPFS publication of attestations
- PR comments with certification results
- Release creation with attestation artifacts

## Other Scripts

### `centralization-sentinel.js`
Legacy centralization detection script (now integrated into the main certification system).

### `qflow-migrate.mjs`
Migration utilities for converting workflows from other systems (like n8n) to Qflow.

### `deploy.sh`
Deployment script for Qflow services.

### `generate-api-docs.ts`
Generates API documentation from OpenAPI specifications.

## Usage in Development

### Pre-commit Hook
Add certification to your pre-commit workflow:

```bash
# In package.json
"precommit": "npm run centralization-check && npm run certify:ci && npm run lint && npm test"
```

### Branch Protection
Configure GitHub branch protection to require certification:

```yaml
# In .github/branch-protection.yml
required_status_checks:
  contexts:
    - "No Central Server Certification"
```

### Local Development
Run certification during development:

```bash
# Quick check
npm run certify:ci

# Full certification with attestation
npm run certify

# Test the certification system itself
npm run certify:test
```

## Troubleshooting

### Common Issues

1. **Forbidden Dependencies**: Remove centralized dependencies like `mysql`, `postgres`, `redis`
2. **Centralization Patterns**: Replace connection pools and fixed ports with distributed alternatives
3. **Missing Requirements**: Ensure IPFS and Libp2p dependencies are installed
4. **Configuration Issues**: Check Docker and Kubernetes configs for centralized services

### Debug Mode

Enable detailed logging:

```bash
DEBUG=certification node scripts/no-central-server-certification.mjs
```

### Getting Help

- Check the [certification documentation](../docs/NO_CENTRAL_SERVER_CERTIFICATION.md)
- Run scripts with `--help` flag
- Review the test suite for examples

## Contributing

When adding new scripts:

1. Follow the existing naming convention
2. Include comprehensive error handling
3. Add CLI help documentation
4. Include in the package.json scripts section
5. Update this README
6. Add tests if applicable