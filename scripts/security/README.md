# Q Ecosystem Security Scanning Pipeline

This directory contains the comprehensive security scanning pipeline for the Q Ecosystem, implementing task 29 from the ecosystem modular audit specification.

## Overview

The security scanning pipeline provides multi-layered security analysis including:

- **SAST (Static Application Security Testing)** - Code vulnerability analysis
- **DAST (Dynamic Application Security Testing)** - Runtime security testing  
- **Dependency Scanning** - Third-party vulnerability detection
- **Container Security** - Docker image vulnerability scanning
- **Infrastructure as Code** - Configuration security validation
- **Secrets Detection** - Credential and API key discovery
- **Quality Gates** - Automated security policy enforcement

## Components

### GitHub Actions Workflows

- `.github/workflows/security-sast.yml` - Static analysis security testing
- `.github/workflows/security-dast.yml` - Dynamic application security testing
- `.github/workflows/security-dependencies.yml` - Dependency vulnerability scanning
- `.github/workflows/security-iac.yml` - Infrastructure as code security validation
- `.github/workflows/security-quality-gates.yml` - Security quality gate enforcement
- `.github/workflows/security-comprehensive.yml` - Orchestrates all security scans

### Security Tools Configuration

- `.eslintrc.security.js` - ESLint security rules configuration
- `sonar-project.properties` - SonarCloud security analysis settings
- `.zap/rules/baseline.conf` - OWASP ZAP baseline scan rules
- `.zap/rules/full-scan.conf` - OWASP ZAP comprehensive scan rules
- `.github/security-gates.yml` - Security quality gates configuration

### Python Scripts

- `security-quality-gate.py` - Quality gate evaluation engine
- `update-security-dashboard.py` - Security dashboard integration
- `generate-dast-report.py` - DAST results consolidation
- `generate-dependency-report.py` - Dependency scan reporting
- `generate-iac-report.py` - IaC security report generation
- `generate-comprehensive-report.py` - Master security report
- `docker-compose-security.py` - Docker Compose security scanner
- `github-actions-security.py` - GitHub Actions workflow security scanner

## Usage

### Local Development

Run security scans locally during development:

```bash
# Run SAST scans
npm run security:sast

# Run dependency scans
npm run security:deps

# Run quality gates
npm run security:quality-gate

# Generate comprehensive report
npm run security:report
```

### CI/CD Integration

Security scans run automatically on:

- **Push to main/develop** - Full security scan suite
- **Pull requests** - SAST, dependency, and IaC scans
- **Weekly schedule** - Comprehensive security audit including DAST

### Quality Gates

Security quality gates enforce the following policies:

- **Critical Issues**: Zero tolerance - build fails immediately
- **High Issues**: Configurable threshold (default: 5)
- **Security Debt**: Maximum allowed debt score (default: 100)
- **Tool-specific limits**: Per-tool issue thresholds

Configure quality gates in `.github/security-gates.yml`:

```yaml
global:
  fail_on_critical: true
  fail_on_high_threshold: 5
  max_security_debt: 100

sast:
  tools:
    eslint_security:
      enabled: true
      max_issues: 0
```

## Security Tools

### SAST Tools

- **ESLint Security Plugin** - JavaScript/TypeScript security rules
- **Semgrep** - Multi-language static analysis
- **CodeQL** - GitHub's semantic code analysis
- **SonarCloud** - Code quality and security analysis

### Dependency Scanners

- **NPM Audit** - Node.js dependency vulnerabilities
- **Snyk** - Comprehensive dependency scanning
- **OSV Scanner** - Open source vulnerability database
- **Retire.js** - JavaScript library vulnerability detection

### Container Scanners

- **Trivy** - Container image vulnerability scanning
- **Grype** - Container and filesystem scanning
- **Docker Scout** - Docker's native security scanning

### DAST Tools

- **OWASP ZAP** - Web application security testing
- **Nuclei** - Fast vulnerability scanner
- **testssl.sh** - SSL/TLS configuration testing

### IaC Scanners

- **Checkov** - Infrastructure as code security scanning
- **KICS** - Keeping Infrastructure as Code Secure
- **TFSec** - Terraform security scanner
- **Hadolint** - Dockerfile security linting

### Secrets Detection

- **TruffleHog** - Git repository secret scanning
- **GitLeaks** - SAST tool for detecting secrets

## Reports and Dashboards

### Report Types

1. **Comprehensive Security Report** - Master HTML report with all findings
2. **SAST Report** - Static analysis results
3. **Dependency Report** - Third-party vulnerability summary
4. **Container Report** - Image security analysis
5. **IaC Report** - Infrastructure configuration issues
6. **DAST Report** - Runtime security testing results

### Security Dashboard Integration

The pipeline integrates with external security dashboards via:

- REST API endpoints for result submission
- GitHub Issues for critical findings
- Slack notifications for security alerts
- Email notifications for production issues

Configure dashboard integration:

```bash
# Set environment variables
export SECURITY_DASHBOARD_API="https://dashboard.example.com/api"
export SECURITY_DASHBOARD_KEY="your-api-key"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
```

## Configuration

### Module-Specific Overrides

Apply stricter security requirements to critical modules:

```yaml
module_overrides:
  "modules/qlock":
    sast:
      max_issues: 0
    dependencies:
      max_high: 0
    containers:
      max_high: 0
```

### Exemptions and Allowlists

Configure exemptions for known false positives:

```yaml
exemptions:
  false_positives:
    - rule_id: "javascript:S4426"
      files: ["**/tests/**"]
      reason: "Test keys and examples"
```

### Compliance Requirements

Enable compliance-specific checks:

```yaml
compliance:
  soc2:
    enabled: true
    require_encryption_at_rest: true
  gdpr:
    enabled: true
    require_data_classification: true
  pci_dss:
    enabled: true
    require_payment_data_encryption: true
```

## Troubleshooting

### Common Issues

1. **Quality Gate Failures**
   - Review failed gates in the security report
   - Check specific tool outputs for details
   - Verify configuration matches requirements

2. **Tool Configuration Errors**
   - Validate YAML syntax in configuration files
   - Check tool-specific documentation
   - Verify required secrets are configured

3. **False Positives**
   - Add exemptions to `.github/security-gates.yml`
   - Update tool-specific ignore files
   - Document reasoning for exemptions

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export DEBUG=1
python3 scripts/security/security-quality-gate.py --config .github/security-gates.yml
```

### Manual Tool Execution

Run individual tools for debugging:

```bash
# ESLint security scan
npx eslint . --config .eslintrc.security.js

# NPM audit
npm audit --audit-level=moderate

# Trivy container scan
trivy image your-image:tag

# Checkov IaC scan
checkov -d . --framework dockerfile,docker_compose
```

## Security Best Practices

1. **Regular Updates** - Keep security tools and rules updated
2. **Baseline Establishment** - Set realistic quality gate thresholds
3. **Continuous Monitoring** - Review security metrics regularly
4. **Team Training** - Educate developers on security practices
5. **Incident Response** - Have procedures for critical findings

## Contributing

When adding new security tools or rules:

1. Update the appropriate workflow file
2. Add configuration files if needed
3. Update quality gates configuration
4. Test with sample vulnerabilities
5. Document the changes in this README

## Support

For questions or issues with the security pipeline:

- Create an issue in the repository
- Contact the Security Team
- Review the comprehensive security reports
- Check the troubleshooting section above

---

**Security is everyone's responsibility. Help keep the Q Ecosystem secure! 🔒**