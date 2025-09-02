# @anarq/qonsent

A core module for managing programmable permissions in the AnarQ ecosystem.

## Features

- Fine-grained permission management
- DAO-level access control
- Resource visibility controls
- Delegation of permissions
- Audit logging of all permission changes
- Integration with Qsocial, Qwallet, and other AnarQ modules

## Installation

```bash
# Using npm
npm install @anarq/qonsent

# Using yarn
yarn add @anarq/qonsent
```

## Usage

### Basic Setup

```typescript
import Qonsent, { QonsentService, QonsentConfig } from '@anarq/qonsent';

// Initialize with default configuration
const qonsent = Qonsent.init({
  logLevel: 'info',
  debug: process.env.NODE_ENV === 'development',
});

// Or create a custom instance
const customQonsent = new QonsentService();
```

### Setting Permissions

```typescript
// Set permissions for a resource
await qonsent.setQonsent({
  resourceId: 'resource-123',
  ownerDid: 'did:example:owner',
  targetDid: 'did:example:user',
  permissions: ['read', 'write'],
  daoScope: 'dao-123', // Optional
  expiresAt: new Date('2024-01-01'), // Optional
});
```

### Checking Access

```typescript
// Check if a user has access to a resource
const { hasAccess, reason, requiredPermissions } = await qonsent.checkAccess({
  resourceId: 'resource-123',
  targetDid: 'did:example:user',
  daoScope: 'dao-123',
  returnRequiredPermissions: true,
});

if (hasAccess) {
  console.log('Access granted!');
} else {
  console.log(`Access denied: ${reason}`);
  console.log(`Required permissions: ${requiredPermissions?.join(', ')}`);
}
```

## API Reference

### QonsentService

The main service class for managing permissions.

#### Methods

- `setQonsent(params: SetQonsentParams): Promise<void>` - Set permissions for a resource
- `getViewableResources(params: GetViewableResourcesParams): Promise<string[]>` - Get resources visible to a user
- `checkAccess(params: CheckAccessParams): Promise<CheckAccessResult>` - Check if a user has access to a resource
- `getQonsentLogs(params: GetQonsentLogsParams): Promise<QonsentLog[]>` - Get audit logs
- `batchSyncPermissions(params: BatchSyncParams): Promise<void>` - Sync multiple permissions at once

### Models

- `QonsentRule` - Defines permission rules
- `QonsentLog` - Audit log of permission changes
- `DAOVisibilityPolicy` - DAO-level visibility policies
- `Delegation` - Delegated permissions

## Development

### Building the Module

```bash
# Install dependencies
npm install

# Build the module
npm run build
```

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT
