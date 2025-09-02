# Qmail Security Policies

This document defines the security policies and requirements for the Qmail module.

## Authentication and Authorization

### Identity Verification (sQuid Integration)
- **Requirement**: All message operations require valid sQuid identity
- **Headers**: `x-squid-id`, `x-subid` (optional), `x-sig`
- **Verification**: Identity signatures verified via Qlock
- **Delegation**: Subidentities can send messages on behalf of parent identity

### Permission Checks (Qonsent Integration)
- **Send Permissions**: Verified before message encryption
- **Read Permissions**: Verified before message decryption
- **Admin Permissions**: Required for message deletion/retention management
- **Scope**: Permissions scoped to specific recipients or message types

## Encryption Standards

### Message Encryption (Qlock Integration)
- **Default Level**: STANDARD (AES-256-GCM)
- **High Level**: RSA-4096 + AES-256-GCM with key rotation
- **Quantum Level**: Post-quantum algorithms (Kyber + Dilithium)
- **Key Management**: All keys managed via KMS/HSM

### Encryption Levels
```
STANDARD:
- Content: AES-256-GCM
- Key Exchange: ECDH P-256
- Signatures: ECDSA P-256

HIGH:
- Content: AES-256-GCM with ChaCha20-Poly1305 fallback
- Key Exchange: RSA-4096 or ECDH P-384
- Signatures: RSA-4096 or ECDSA P-384
- Key Rotation: Every 24 hours

QUANTUM:
- Content: AES-256-GCM + Kyber-768
- Key Exchange: Kyber-1024
- Signatures: Dilithium-3
- Forward Secrecy: Double Ratchet protocol
```

### Attachment Encryption
- **Individual Encryption**: Each attachment encrypted separately
- **Key Derivation**: Unique keys derived per attachment
- **Integrity**: SHA-256 checksums for all attachments
- **Size Limits**: 100MB per attachment, 1GB total per message

## Access Control

### Message Access
- **Sender Access**: Full access to sent messages
- **Recipient Access**: Full access to received messages
- **Third-Party Access**: Prohibited without explicit consent
- **Admin Access**: Limited to metadata only (no content access)

### Audit Access
- **Audit Logs**: Accessible to message participants and auditors
- **Compliance Officers**: Access to compliance-related metadata
- **Law Enforcement**: Access only with valid legal process
- **Data Minimization**: Logs contain minimal necessary information

## Data Protection

### Encryption at Rest
- **Message Content**: Always encrypted, keys stored separately
- **Metadata**: Encrypted with separate keys
- **Attachments**: Individually encrypted in IPFS
- **Indices**: Encrypted search indices with limited metadata

### Encryption in Transit
- **API Calls**: TLS 1.3 minimum
- **Internal Communication**: mTLS between services
- **Event Publishing**: Encrypted event payloads
- **IPFS Storage**: Encrypted before IPFS storage

### Key Management
- **Key Rotation**: Automatic rotation based on encryption level
- **Key Escrow**: No key escrow (zero-knowledge architecture)
- **Key Recovery**: User-controlled key recovery mechanisms
- **Key Destruction**: Secure key destruction on message expiration

## Privacy Protection

### Metadata Minimization
- **Routing Information**: Minimal routing metadata stored
- **Timestamps**: Rounded to nearest minute for privacy
- **IP Addresses**: Hashed and salted, not stored in plaintext
- **Device Information**: Anonymized device fingerprints only

### Qmask Integration
- **Privacy Profiles**: Applied to message metadata
- **Anonymization**: Sender/recipient anonymization options
- **Pseudonymization**: Reversible pseudonymization for compliance
- **Data Masking**: Selective data masking for different audiences

## Spam and Abuse Protection

### Qerberos Integration
- **Spam Detection**: Real-time spam analysis before delivery
- **Risk Scoring**: Dynamic risk assessment for all messages
- **Threat Intelligence**: Integration with threat intelligence feeds
- **Behavioral Analysis**: Pattern analysis for abuse detection

### Rate Limiting
- **Per Identity**: 100 messages/hour for standard users
- **Per Subidentity**: 50 messages/hour for subidentities
- **Premium Users**: Higher limits via Qwallet integration
- **Burst Protection**: Temporary rate limit increases for legitimate use

### Content Filtering
- **Malware Detection**: Attachment scanning for malware
- **Phishing Detection**: URL and content analysis
- **Compliance Filtering**: Regulatory compliance checks
- **Custom Filters**: User-defined content filters

## Audit and Compliance

### Audit Logging
- **Message Events**: All message lifecycle events logged
- **Access Events**: All message access attempts logged
- **Security Events**: Authentication, authorization, encryption events
- **Compliance Events**: GDPR, retention, deletion events

### Compliance Standards
- **GDPR**: Full GDPR compliance with automated DSR processing
- **SOX**: Financial message compliance and retention
- **HIPAA**: Healthcare message protection (when applicable)
- **PCI DSS**: Payment-related message security

### Data Retention
- **Default Retention**: 2 years for standard messages
- **Legal Hold**: Indefinite retention for legal proceedings
- **User Control**: User-configurable retention periods
- **Automatic Deletion**: Secure deletion after retention expiry

## Incident Response

### Security Incidents
- **Detection**: Automated security incident detection
- **Response**: Immediate containment and investigation
- **Notification**: User notification within 72 hours
- **Remediation**: Automated remediation where possible

### Data Breaches
- **Containment**: Immediate service isolation if needed
- **Assessment**: Rapid impact assessment
- **Notification**: Regulatory notification within required timeframes
- **Recovery**: Secure service restoration procedures

### Business Continuity
- **Backup Systems**: Encrypted backups with geographic distribution
- **Disaster Recovery**: RTO < 4 hours, RPO < 1 hour
- **Service Degradation**: Graceful degradation during incidents
- **Communication**: Clear communication during outages

## Security Monitoring

### Real-time Monitoring
- **Threat Detection**: 24/7 security monitoring
- **Anomaly Detection**: ML-based anomaly detection
- **Performance Monitoring**: Security impact on performance
- **Compliance Monitoring**: Continuous compliance validation

### Security Metrics
- **Encryption Coverage**: 100% message encryption
- **Authentication Success**: >99.9% authentication success rate
- **Incident Response**: <15 minute incident response time
- **Compliance Score**: >95% compliance score maintenance

## Development Security

### Secure Development
- **Security Reviews**: Mandatory security reviews for all changes
- **Threat Modeling**: Regular threat modeling exercises
- **Penetration Testing**: Quarterly penetration testing
- **Vulnerability Management**: Automated vulnerability scanning

### Code Security
- **Static Analysis**: SAST tools in CI/CD pipeline
- **Dynamic Analysis**: DAST tools for runtime security
- **Dependency Scanning**: Third-party dependency vulnerability scanning
- **Secret Management**: No secrets in code, secure secret management