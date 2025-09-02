# Qonsent Service

Qonsent is a core structural layer in the AnarQ & Q ecosystem, responsible for programmable privacy, modular permissions, DAO policies, delegation rules, and dynamic access control across all modules (Qmarket, QpiC, Qdrive, Qsocial, etc.).

## Features

- **Consent Management**: Set, update, and revoke consent for resources
- **DAO Policies**: Define and manage DAO-wide visibility rules and access policies
- **Delegation**: Delegate permissions to subidentities or other DIDs
- **Privacy Profiles**: Reusable templates with predefined privacy settings
- **Public API**: Read-only endpoints for frontend modules to check permissions
- **Audit Logging**: Comprehensive logging of all consent-related actions
- **REST API**: Fully documented RESTful API with Swagger UI
- **Signature Verification**: All endpoints require valid sQuid identity signatures
- **Qsocial Integration**: Middleware for content visibility checks

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. Copy `.env.example` to `.env` and update the configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Port to run the server on | `3000` |
| `HOST` | Host to bind the server to | `0.0.0.0` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/qonsent` |
| `LOG_LEVEL` | Logging level | `info` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `SQUID_API_URL` | sQuid API URL | `https://api.squid.xyz` |

## Public API Endpoints

### Check Active Permissions (qonsent_in)

```http
GET /api/public/consent/qonsent-in/{cid}
```

Get all active permissions for a specific CID.

**Query Parameters:**
- `requester_did` (optional): Check permissions for a specific identity
- `cid_profile` (optional): Resolve DAO inheritance

### Check Visibility Settings (qonsent_out)

```http
GET /api/public/consent/qonsent-out/{cid}
```

Get visibility settings for a specific CID.

### Check Access

```http
GET /api/public/consent/check-access?cid={cid}&did={did}
```

Check if a DID has access to a resource.

### Privacy Profiles

#### List Available Profiles

```http
GET /api/public/consent/profiles
```

#### Apply a Profile

```http
POST /api/public/consent/profiles/apply
```

**Request Body:**
```json
{
  "cid": "bafy...",
  "owner_did": "did:squid:...",
  "profile_name": "public_default",
  "custom_overrides": {
    "visibility": "public",
    "expirationRule": "ttl",
    "expirationValue": 86400
  }
}
```

## Default Privacy Profiles

1. **public_default**
   - Visibility: Public
   - Anyone can view
   - No expiration

2. **dao_only_basic**
   - Visibility: DAO Members Only
   - Only members of the specified DAO can view
   - No expiration

3. **private_strict**
   - Visibility: Private
   - Only the owner can view
   - No expiration

## Qsocial Integration

Use the Qsocial middleware to check post visibility in your routes:

```typescript
import { qsocialMiddleware } from 'qonsent/middleware/qsocail.middleware';

// In your route handler
const { canView, reason, visibility } = await qsocialMiddleware.checkPostVisibilityForUser(
  postId,
  viewerDid
);
```

## API Documentation

Once the server is running, you can access the interactive API documentation at `http://localhost:3000/documentation`.

## Usage Examples

## Available Endpoints

### Consent Management

- `POST /consent/set` - Set permissions for an identity or subidentity
- `GET /consent/viewable-by/:did` - Get list of content or resources viewable by the specified DID
- `POST /consent/batch-sync` - Sync batch permissions from external inputs
- `GET /consent/logs` - List of consent changes with optional filters

### DAO Policies

- `POST /consent/dao-policy` - Create or update DAO-wide visibility rules
- `GET /consent/dao-policy/:daoId` - Fetch DAO visibility settings
- `DELETE /consent/dao-policy/:policyId` - Delete a DAO policy

### Delegation

- `POST /consent/delegate` - Delegate specific rights to a subidentity or another DID
- `GET /consent/delegate/my-delegations` - List active delegations for the current user
- `DELETE /consent/delegate/:delegationId` - Revoke a delegation
- `POST /consent/delegate/verify` - Verify if a delegation is valid

## Data Models

### ConsentRule
```typescript
{
  resourceId: string;      // Unique identifier for the resource
  ownerDid: string;        // DID of the resource owner
  targetDid: string;       // DID of the target identity
  permissions: string[];   // List of granted permissions
  expiresAt?: Date;        // Optional expiration date
  daoScope?: string;       // Optional DAO scope for DAO-wide permissions
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

### DAOVisibilityPolicy
```typescript
{
  daoId: string;           // ID of the DAO
  resourcePattern: string; // Pattern for matching resources (supports wildcards)
  allowedRoles: string[];  // List of roles that have access
  restrictions: object;    // Additional access restrictions
  createdBy: string;       // DID of the user who created the policy
  updatedBy: string;       // DID of the user who last updated the policy
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

### Delegation
```typescript
{
  delegatorDid: string;    // DID of the delegating identity
  delegateeDid: string;    // DID of the delegatee
  scope: string[];         // Scope of the delegation
  capabilities: string[];  // Specific capabilities being delegated
  expiresAt?: Date;        // Optional expiration date
  status: 'active' | 'expired' | 'revoked';  // Delegation status
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

## Development

### Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build the application
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t qonsent .

# Run the container
docker run -p 3000:3000 --env-file .env qonsent
```

### Kubernetes

Example Kubernetes deployment files are provided in the `k8s/` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
