# Qmask Security Policies

## Authentication and Authorization

### Identity Verification (sQuid Integration)
- All API endpoints require valid sQuid identity token
- Token validation performed on every request
- Identity context propagated through request lifecycle
- Subidentity support for delegated operations

### Permission Checking (Qonsent Integration)
- Profile operations require explicit permissions
- Deny-by-default authorization model
- Granular permissions per operation type:
  - `qmask:profile:create` - Create new privacy profiles
  - `qmask:profile:read` - Read privacy profiles
  - `qmask:profile:update` - Update existing profiles
  - `qmask:profile:delete` - Delete profiles
  - `qmask:mask:apply` - Apply masking to data
  - `qmask:assess:create` - Perform privacy assessments
  - `qmask:dsr:create` - Create data subject requests
  - `qmask:dsr:manage` - Manage DSR lifecycle

### Resource Ownership
- Users can only access profiles they created
- Profile sharing requires explicit permission grants
- System profiles (default) are read-only for all users
- Admin users can access all profiles (with proper permissions)

## Data Protection

### Encryption Standards
- All sensitive data encrypted at rest using AES-256-GCM
- Encryption keys managed through Qlock integration
- Key rotation performed automatically every 90 days
- Separate keys for different data types

### Data Classification
- **Public**: Profile metadata, anonymized statistics
- **Internal**: Profile rules, assessment results
- **Confidential**: Original data before masking, DSR details
- **Restricted**: Encryption keys, audit logs

### Data Retention
- Privacy profiles: Retained until explicitly deleted
- Masking operations: Audit logs retained for 7 years
- Assessments: Retained for 3 years or until superseded
- DSRs: Retained for 6 years for compliance

## Cryptographic Operations

### Hashing
- SHA-256 for data hashing with random salts
- PBKDF2 for password-derived keys (100,000 iterations)
- HMAC-SHA256 for message authentication

### Encryption
- AES-256-GCM for symmetric encryption
- RSA-4096 for asymmetric operations
- ECDSA P-384 for digital signatures
- Post-quantum algorithms supported via Qlock

### Key Management
- All keys stored in Qlock keystore
- Environment-specific key scoping
- Hardware Security Module (HSM) support in production
- Key escrow for compliance requirements

## Access Controls

### Rate Limiting
- 100 requests per minute per identity
- Burst allowance of 20 requests
- Exponential backoff for violations
- Adaptive limits based on reputation

### IP Restrictions
- Configurable IP allowlists for sensitive operations
- Geo-blocking for high-risk regions
- VPN detection and handling
- DDoS protection integration

### Session Management
- JWT tokens with 1-hour expiration
- Refresh token rotation
- Session invalidation on suspicious activity
- Concurrent session limits

## Audit and Monitoring

### Security Events (Qerberos Integration)
- All authentication attempts logged
- Permission denials recorded
- Data access patterns monitored
- Anomaly detection for unusual behavior

### Audit Requirements
- Immutable audit logs for all operations
- Real-time security event streaming
- Compliance reporting automation
- Incident response integration

### Monitoring Metrics
- Failed authentication rates
- Permission denial patterns
- Data access frequency
- Performance anomalies

## Incident Response

### Security Incident Classification
- **P1**: Data breach, system compromise
- **P2**: Authentication bypass, privilege escalation
- **P3**: Suspicious activity, policy violations
- **P4**: Configuration issues, minor vulnerabilities

### Response Procedures
1. **Detection**: Automated alerts and monitoring
2. **Assessment**: Risk evaluation and impact analysis
3. **Containment**: Immediate threat mitigation
4. **Investigation**: Root cause analysis
5. **Recovery**: System restoration and hardening
6. **Lessons Learned**: Process improvement

### Communication Plan
- Internal escalation procedures
- Customer notification requirements
- Regulatory reporting obligations
- Public disclosure guidelines

## Compliance Requirements

### GDPR Compliance
- Privacy by design implementation
- Data minimization principles
- Consent management integration
- Data subject rights automation

### HIPAA Compliance
- Administrative safeguards
- Physical safeguards
- Technical safeguards
- Business associate agreements

### SOC 2 Compliance
- Security controls framework
- Availability monitoring
- Processing integrity
- Confidentiality protection

## Security Testing

### Vulnerability Management
- Regular security assessments
- Penetration testing (quarterly)
- Dependency vulnerability scanning
- Code security analysis (SAST/DAST)

### Security Metrics
- Mean time to detection (MTTD)
- Mean time to response (MTTR)
- Vulnerability remediation time
- Security training completion rates

## Configuration Security

### Environment Separation
- Development, staging, production isolation
- Separate encryption keys per environment
- Network segmentation
- Access control boundaries

### Secure Defaults
- Minimum required permissions
- Strong encryption by default
- Secure communication protocols
- Regular security updates