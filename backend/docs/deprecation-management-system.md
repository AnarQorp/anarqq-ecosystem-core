# Deprecation Management System

The Deprecation Management System provides comprehensive tools for managing feature deprecations, migrations, and compatibility layers across the Q ecosystem. It implements formal deprecation processes with automated timeline management, usage telemetry, and migration support.

## Features

- **Deprecation Calendar**: Automated timeline management with scheduled notifications
- **Usage Telemetry**: Track deprecated feature usage and identify consumers
- **Migration Tools**: Automated migration execution with validation and rollback support
- **Compatibility Layers**: Temporary compatibility adapters for smooth transitions
- **Notification System**: Automated deprecation notifications and progress tracking
- **CLI Tools**: Command-line interface for managing deprecations
- **Middleware Integration**: Automatic tracking of deprecated API usage

## Architecture

### Core Components

1. **DeprecationManagementService**: Main service for managing deprecations
2. **DeprecationTrackingMiddleware**: Middleware for automatic usage tracking
3. **CLI Tools**: Command-line interface for deprecation management
4. **Data Storage**: JSON-based storage for deprecation data

### Data Models

```typescript
// Deprecation Schedule
interface DeprecationSchedule {
  featureId: string;
  feature: string;
  version: string;
  deprecationDate: string;
  sunsetDate: string;
  migrationDeadline: string;
  supportLevel: 'FULL' | 'MAINTENANCE' | 'SECURITY_ONLY' | 'NONE';
  replacementFeature?: string;
  migrationGuide?: string;
  status: 'ANNOUNCED' | 'ACTIVE' | 'SUNSET';
  notifications: {
    sent: string[];
    scheduled: NotificationSchedule[];
  };
}

// Usage Telemetry
interface UsageTelemetry {
  featureId: string;
  totalUsage: number;
  uniqueConsumers: Set<string>;
  usageHistory: UsageRecord[];
  consumers: Map<string, ConsumerInfo>;
}

// Migration Plan
interface MigrationPlan {
  featureId: string;
  fromFeature: string;
  toFeature: string;
  migrationSteps: MigrationStep[];
  validationRules: ValidationRule[];
  rollbackSupport: boolean;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
```

## Usage

### 1. Service Integration

```javascript
import DeprecationManagementService from './services/DeprecationManagementService.mjs';
import DeprecationTrackingMiddleware from './middleware/deprecationTracking.mjs';

// Initialize services
const deprecationService = new DeprecationManagementService();
const trackingMiddleware = new DeprecationTrackingMiddleware({ deprecationService });

// Apply middleware to Express app
app.use(trackingMiddleware.trackDeprecatedAPI());
app.use(trackingMiddleware.addDeprecationWarnings());
```

### 2. Creating Deprecation Schedules

```javascript
// Create a deprecation schedule
const schedule = await deprecationService.createDeprecationSchedule('users-api@v1', {
  feature: 'Users API v1',
  version: 'v1',
  deprecationDate: '2024-01-01T00:00:00Z',
  sunsetDate: '2024-06-01T00:00:00Z',
  migrationDeadline: '2024-05-15T00:00:00Z',
  replacementFeature: 'users-api@v2',
  migrationGuide: 'https://docs.example.com/migration/users-v2',
  supportLevel: 'MAINTENANCE'
});
```

### 3. Tracking Usage

```javascript
// Automatic tracking via middleware
trackingMiddleware.registerDeprecatedEndpoint('/api/v1/users', 'GET', 'users-api@v1', {
  deprecationDate: '2024-01-01T00:00:00Z',
  sunsetDate: '2024-06-01T00:00:00Z',
  replacementEndpoint: '/api/v2/users'
});

// Manual tracking
await deprecationService.trackFeatureUsage('legacy-feature@v1', {
  consumerId: 'client-app',
  context: { endpoint: '/api/legacy' },
  metadata: { userAgent: 'MyApp/1.0' }
});
```

### 4. Migration Management

```javascript
// Create migration plan
const migrationPlan = await deprecationService.createMigrationPlan('users-api@v1', {
  fromFeature: 'users-api@v1',
  toFeature: 'users-api@v2',
  steps: [
    {
      name: 'Update API endpoints',
      type: 'API_MIGRATION',
      configuration: {
        oldEndpoint: '/api/v1/users',
        newEndpoint: '/api/v2/users',
        mappings: { 'name': 'fullName' }
      }
    }
  ],
  validationRules: [
    {
      name: 'API compatibility check',
      type: 'API_COMPATIBILITY',
      configuration: { endpoints: ['/api/v2/users'] }
    }
  ]
});

// Execute migration
const result = await deprecationService.executeMigration('users-api@v1', 'client-app');
```

### 5. CLI Usage

```bash
# Create deprecation schedule
./scripts/deprecation-management-cli.mjs schedule create \
  --feature "Users API" \
  --version "v1" \
  --deprecation-date "2024-01-01T00:00:00Z" \
  --sunset-date "2024-06-01T00:00:00Z" \
  --replacement "users-api@v2"

# Track usage
./scripts/deprecation-management-cli.mjs telemetry track \
  --feature-id "users-api@v1" \
  --consumer-id "client-app"

# Generate report
./scripts/deprecation-management-cli.mjs report \
  --output deprecation-report.json \
  --format json

# Execute migration
./scripts/deprecation-management-cli.mjs migration execute \
  --feature-id "users-api@v1" \
  --consumer-id "client-app"
```

## Configuration

### Environment Variables

```bash
# Data directory for deprecation storage
DEPRECATION_DATA_DIR=./data/deprecation

# Enable/disable tracking
DEPRECATION_TRACKING_ENABLED=true

# Notification settings
DEPRECATION_NOTIFICATIONS_ENABLED=true
DEPRECATION_EMAIL_ENABLED=true
DEPRECATION_SLACK_WEBHOOK=https://hooks.slack.com/...
```

### Configuration Files

#### Deprecation Config (`data/deprecation/deprecation-config.json`)

```json
{
  "settings": {
    "notificationIntervals": {
      "warning90Days": 90,
      "warning30Days": 30,
      "finalWarning": 7
    },
    "defaultSupportLevels": {
      "MAINTENANCE": {
        "description": "Bug fixes and security updates only",
        "duration": "P3M"
      }
    }
  },
  "notifications": {
    "channels": {
      "email": { "enabled": true },
      "slack": { "enabled": false }
    }
  }
}
```

## API Reference

### DeprecationManagementService

#### Methods

- `createDeprecationSchedule(featureId, schedule)`: Create deprecation schedule
- `trackFeatureUsage(featureId, usageData)`: Track feature usage
- `createMigrationPlan(featureId, plan)`: Create migration plan
- `executeMigration(featureId, consumerId, options)`: Execute migration
- `getDeprecationStatus(featureId)`: Get deprecation status
- `getMigrationProgress(featureId)`: Get migration progress
- `generateDeprecationReport()`: Generate comprehensive report

#### Events

- `deprecation.announced`: Emitted when deprecation is announced
- `usage.tracked`: Emitted when usage is tracked
- `migration.executed`: Emitted when migration is executed
- `notification.sent`: Emitted when notification is sent

### DeprecationTrackingMiddleware

#### Methods

- `trackDeprecatedAPI()`: Express middleware for API tracking
- `registerDeprecatedEndpoint(path, method, featureId, options)`: Register deprecated endpoint
- `trackDeprecatedFeature(featureId, context)`: Manual feature tracking
- `generateUsageAnalytics(featureId)`: Generate usage analytics

#### Decorators

```javascript
import { deprecated } from './middleware/deprecationTracking.mjs';

class UserService {
  @deprecated('user-service.getUser@v1', {
    consumerId: 'user-service',
    context: { replacement: 'getUserById' }
  })
  async getUser(id) {
    // Deprecated method
  }
}
```

## Migration Step Types

### API_MIGRATION
Updates API endpoints and transforms request/response data.

```json
{
  "name": "Update API endpoints",
  "type": "API_MIGRATION",
  "configuration": {
    "oldEndpoint": "/api/v1/users",
    "newEndpoint": "/api/v2/users",
    "mappings": { "name": "fullName" },
    "transformations": [
      {
        "field": "createdAt",
        "type": "date_format",
        "from": "YYYY-MM-DD",
        "to": "ISO8601"
      }
    ]
  }
}
```

### CONFIG_UPDATE
Updates configuration files.

```json
{
  "name": "Update configuration",
  "type": "CONFIG_UPDATE",
  "configuration": {
    "configFile": "api-config.json",
    "updates": {
      "api.users.endpoint": "/api/v2/users"
    }
  }
}
```

### DATA_MIGRATION
Migrates data structures.

```json
{
  "name": "Migrate user data",
  "type": "DATA_MIGRATION",
  "configuration": {
    "sourceTable": "users_v1",
    "targetTable": "users_v2",
    "transformations": []
  }
}
```

## Validation Rule Types

### API_COMPATIBILITY
Validates API compatibility after migration.

```json
{
  "name": "API compatibility check",
  "type": "API_COMPATIBILITY",
  "configuration": {
    "endpoints": ["/api/v2/users"],
    "testCases": [
      {
        "request": { "method": "GET", "path": "/api/v2/users" },
        "expectedFields": ["id", "fullName", "emailAddress"]
      }
    ]
  }
}
```

### DATA_INTEGRITY
Validates data integrity after migration.

```json
{
  "name": "Data integrity check",
  "type": "DATA_INTEGRITY",
  "configuration": {
    "checksums": {},
    "validationQueries": [
      "SELECT COUNT(*) FROM users WHERE fullName IS NOT NULL"
    ]
  }
}
```

## Compatibility Layer Types

### ADAPTER
Adapter pattern for API compatibility.

```json
{
  "type": "ADAPTER",
  "configuration": {
    "proxyTo": "/api/v2/users",
    "transformations": {
      "request": {
        "fieldMappings": { "name": "fullName" }
      },
      "response": {
        "fieldMappings": { "fullName": "name" }
      }
    }
  }
}
```

### PROXY
Proxy pattern for request forwarding.

```json
{
  "type": "PROXY",
  "configuration": {
    "targetUrl": "https://api.example.com/v2",
    "headers": { "X-API-Version": "v2" }
  }
}
```

### WRAPPER
Wrapper pattern for legacy support.

```json
{
  "type": "WRAPPER",
  "configuration": {
    "wrapperFunction": "legacyUserWrapper",
    "parameters": { "version": "v1" }
  }
}
```

## Best Practices

### 1. Deprecation Timeline

- **Announcement**: Announce deprecation at least 6 months before sunset
- **Warning Period**: Provide multiple warnings (90, 30, 7 days)
- **Migration Deadline**: Set migration deadline 2 weeks before sunset
- **Sunset**: Remove deprecated feature after sunset date

### 2. Communication

- **Clear Documentation**: Provide comprehensive migration guides
- **Multiple Channels**: Use email, Slack, and in-app notifications
- **Regular Updates**: Send progress updates to stakeholders
- **Support**: Provide migration support and assistance

### 3. Migration Strategy

- **Incremental**: Break migrations into small, manageable steps
- **Validation**: Validate each step before proceeding
- **Rollback**: Always provide rollback capability
- **Testing**: Test migrations thoroughly in staging environments

### 4. Monitoring

- **Usage Tracking**: Monitor deprecated feature usage
- **Progress Tracking**: Track migration progress per consumer
- **Error Monitoring**: Monitor migration errors and failures
- **Performance**: Monitor performance impact of migrations

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check validation rules
   - Verify rollback data
   - Review error logs

2. **Usage Tracking Not Working**
   - Verify middleware is applied
   - Check deprecation registration
   - Confirm tracking is enabled

3. **Notifications Not Sent**
   - Check notification configuration
   - Verify channel settings
   - Review notification schedule

### Debug Commands

```bash
# Check deprecation status
./scripts/deprecation-management-cli.mjs schedule status --feature-id "users-api@v1"

# View usage telemetry
./scripts/deprecation-management-cli.mjs telemetry report --feature-id "users-api@v1"

# Check migration progress
./scripts/deprecation-management-cli.mjs migration progress --feature-id "users-api@v1"
```

## Integration with Q Ecosystem

The deprecation management system integrates with other Q ecosystem modules:

- **sQuid**: Identity verification for consumer tracking
- **Qonsent**: Permission checking for migration operations
- **Qerberos**: Audit logging for deprecation events
- **Qindex**: Indexing of deprecation records
- **Event Bus**: Publishing deprecation events

## Requirements Compliance

This implementation satisfies the following requirements:

- **19.1**: Formal deprecation calendars with automated timeline management
- **19.2**: Usage telemetry for deprecated features and consumer identification
- **19.3**: Automated migration tools with validation and rollback support
- **19.5**: Migration support services and compatibility layer management

The system provides comprehensive deprecation management capabilities that enable smooth transitions from deprecated features to their replacements while maintaining system stability and user experience.