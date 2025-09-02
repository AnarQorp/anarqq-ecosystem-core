# Development Keys

This directory contains development keys for local testing and development.

## ⚠️ SECURITY WARNING ⚠️

**NEVER USE THESE KEYS IN PRODUCTION!**

These keys are for development and testing purposes only. Production keys must be managed through proper KMS/HSM systems.

## Key Files

- `dev-private.pem` - Development private key
- `dev-public.pem` - Development public key
- `dev-cert.pem` - Development certificate
- `jwt-secret.txt` - JWT signing secret for development

## Key Generation

To generate new development keys:

```bash
# Generate RSA key pair
openssl genrsa -out dev-private.pem 2048
openssl rsa -in dev-private.pem -pubout -out dev-public.pem

# Generate self-signed certificate
openssl req -new -x509 -key dev-private.pem -out dev-cert.pem -days 365 \
  -subj "/C=US/ST=Dev/L=Dev/O=Q-Ecosystem/OU=Development/CN=localhost"

# Generate JWT secret
openssl rand -base64 32 > jwt-secret.txt
```

## Environment Variables

Set these environment variables for development:

```bash
# Development keys
DEV_PRIVATE_KEY_PATH=./security/keys/dev-private.pem
DEV_PUBLIC_KEY_PATH=./security/keys/dev-public.pem
DEV_CERT_PATH=./security/keys/dev-cert.pem
JWT_SECRET_PATH=./security/keys/jwt-secret.txt

# Or load keys directly
DEV_PRIVATE_KEY="$(cat ./security/keys/dev-private.pem)"
DEV_PUBLIC_KEY="$(cat ./security/keys/dev-public.pem)"
JWT_SECRET="$(cat ./security/keys/jwt-secret.txt)"
```

## Key Rotation

Development keys should be rotated weekly:

```bash
# Automated key rotation script
npm run keys:rotate
```

## Production Key Management

For production environments:

1. **Use KMS/HSM**: All production keys must be stored in a Key Management Service or Hardware Security Module
2. **Environment Separation**: Each environment (dev/staging/prod) must have separate keys
3. **Automatic Rotation**: Implement automatic key rotation schedules
4. **Audit Logging**: All key operations must be audited
5. **Access Control**: Restrict key access to authorized personnel only

## Key Usage

### Qlock Integration

```javascript
import { QlockClient } from '@anarq/common-clients';

const qlock = new QlockClient({
  privateKey: process.env.DEV_PRIVATE_KEY,
  publicKey: process.env.DEV_PUBLIC_KEY
});
```

### JWT Signing

```javascript
import jwt from 'jsonwebtoken';
import fs from 'fs';

const jwtSecret = fs.readFileSync('./security/keys/jwt-secret.txt', 'utf8');

const token = jwt.sign(payload, jwtSecret, {
  algorithm: 'HS256',
  expiresIn: '1h'
});
```

### TLS Configuration

```javascript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('./security/keys/dev-private.pem'),
  cert: fs.readFileSync('./security/keys/dev-cert.pem')
};

const server = https.createServer(options, app);
```

## Security Best Practices

1. **Never commit keys to version control**
2. **Use .gitignore to exclude key files**
3. **Rotate keys regularly**
4. **Use strong key generation**
5. **Protect key files with proper permissions**
6. **Monitor key usage**
7. **Have key recovery procedures**

## File Permissions

Set proper file permissions for key files:

```bash
# Private keys should be readable only by owner
chmod 600 dev-private.pem jwt-secret.txt

# Public keys and certificates can be readable by group
chmod 644 dev-public.pem dev-cert.pem

# Directory should be accessible only by owner
chmod 700 .
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check file permissions
2. **Key Format Error**: Ensure keys are in correct PEM format
3. **Certificate Expired**: Regenerate self-signed certificate
4. **Wrong Algorithm**: Verify key algorithm matches usage

### Validation

Validate key files:

```bash
# Validate private key
openssl rsa -in dev-private.pem -check

# Validate public key
openssl rsa -in dev-public.pem -pubin -text

# Validate certificate
openssl x509 -in dev-cert.pem -text -noout
```