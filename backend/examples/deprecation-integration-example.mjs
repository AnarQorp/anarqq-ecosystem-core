/**
 * Deprecation Integration Example
 * Shows how to integrate deprecation management into your application
 */

import express from 'express';
import DeprecationManagementService from '../services/DeprecationManagementService.mjs';
import DeprecationTrackingMiddleware, { deprecated } from '../middleware/deprecationTracking.mjs';

const app = express();
const deprecationService = new DeprecationManagementService();
const trackingMiddleware = new DeprecationTrackingMiddleware({ deprecationService });

// Apply deprecation tracking middleware
app.use(trackingMiddleware.trackDeprecatedAPI());
app.use(trackingMiddleware.addDeprecationWarnings());

// Example: Register deprecated endpoints
trackingMiddleware.registerDeprecatedEndpoint('/api/v1/users', 'GET', 'users-api@v1', {
  deprecationDate: '2024-01-01T00:00:00Z',
  sunsetDate: '2024-06-01T00:00:00Z',
  replacementEndpoint: '/api/v2/users',
  migrationGuide: 'https://docs.example.com/migration/users-v2'
});

trackingMiddleware.registerDeprecatedEndpoint('/api/v1/messages', 'POST', 'messages-api@v1', {
  deprecationDate: '2024-02-01T00:00:00Z',
  sunsetDate: '2024-08-01T00:00:00Z',
  replacementEndpoint: '/api/v2/messages',
  migrationGuide: 'https://docs.example.com/migration/messages-v2'
});

// Example deprecated API endpoints
app.get('/api/v1/users', (req, res) => {
  // This will automatically track usage and add deprecation headers
  res.json({
    users: [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ]
  });
});

app.post('/api/v1/messages', (req, res) => {
  // This will automatically track usage and add deprecation headers
  res.json({
    message: 'Message sent (via deprecated API)',
    id: 'msg_123'
  });
});

// Example class with deprecated methods
class UserService {
  @deprecated('user-service.getUser@v1', {
    consumerId: 'user-service',
    context: { replacement: 'getUserById' }
  })
  async getUser(id) {
    // This method is deprecated
    return { id, name: 'User ' + id };
  }

  async getUserById(id) {
    // This is the new method
    return { id, name: 'User ' + id, version: 'v2' };
  }

  @deprecated('user-service.createUser@v1', {
    consumerId: 'user-service',
    context: { replacement: 'createUserV2' }
  })
  async createUser(userData) {
    // This method is deprecated
    return { id: Date.now(), ...userData };
  }

  async createUserV2(userData) {
    // This is the new method with enhanced validation
    return { 
      id: Date.now(), 
      ...userData, 
      version: 'v2',
      createdAt: new Date().toISOString()
    };
  }
}

// Example: Manual feature usage tracking
app.get('/api/legacy-feature', async (req, res) => {
  // Manually track deprecated feature usage
  await trackingMiddleware.trackDeprecatedFeature('legacy-feature@v1', {
    consumerId: req.get('x-consumer-id') || 'anonymous',
    endpoint: '/api/legacy-feature',
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'This is a legacy feature',
    warning: 'This feature is deprecated and will be removed soon'
  });
});

// Example: Create deprecation schedule programmatically
async function setupDeprecationSchedules() {
  try {
    // Schedule deprecation for users API v1
    await deprecationService.createDeprecationSchedule('users-api@v1', {
      feature: 'Users API v1',
      version: 'v1',
      deprecationDate: '2024-01-01T00:00:00Z',
      sunsetDate: '2024-06-01T00:00:00Z',
      migrationDeadline: '2024-05-15T00:00:00Z',
      replacementFeature: 'users-api@v2',
      migrationGuide: 'https://docs.example.com/migration/users-v2',
      supportLevel: 'MAINTENANCE'
    });

    // Schedule deprecation for messages API v1
    await deprecationService.createDeprecationSchedule('messages-api@v1', {
      feature: 'Messages API v1',
      version: 'v1',
      deprecationDate: '2024-02-01T00:00:00Z',
      sunsetDate: '2024-08-01T00:00:00Z',
      migrationDeadline: '2024-07-15T00:00:00Z',
      replacementFeature: 'messages-api@v2',
      migrationGuide: 'https://docs.example.com/migration/messages-v2',
      supportLevel: 'MAINTENANCE'
    });

    console.log('✅ Deprecation schedules created');
  } catch (error) {
    console.error('❌ Failed to create deprecation schedules:', error);
  }
}

// Example: Create migration plans
async function setupMigrationPlans() {
  try {
    // Migration plan for users API
    const usersMigrationPlan = {
      fromFeature: 'users-api@v1',
      toFeature: 'users-api@v2',
      steps: [
        {
          name: 'Update API endpoints',
          type: 'API_MIGRATION',
          description: 'Update API calls from v1 to v2',
          configuration: {
            oldEndpoint: '/api/v1/users',
            newEndpoint: '/api/v2/users',
            mappings: {
              'name': 'fullName',
              'email': 'emailAddress'
            },
            transformations: [
              {
                field: 'createdAt',
                type: 'date_format',
                from: 'YYYY-MM-DD',
                to: 'ISO8601'
              }
            ]
          }
        },
        {
          name: 'Update client configuration',
          type: 'CONFIG_UPDATE',
          description: 'Update client configuration files',
          configuration: {
            configFile: 'api-config.json',
            updates: {
              'api.users.endpoint': '/api/v2/users',
              'api.users.version': 'v2'
            }
          }
        }
      ],
      validationRules: [
        {
          name: 'API Response Validation',
          type: 'API_COMPATIBILITY',
          description: 'Validate API responses match expected format',
          configuration: {
            endpoints: ['/api/v2/users'],
            testCases: [
              {
                request: { method: 'GET', path: '/api/v2/users' },
                expectedFields: ['id', 'fullName', 'emailAddress', 'createdAt']
              }
            ]
          }
        },
        {
          name: 'Data Integrity Check',
          type: 'DATA_INTEGRITY',
          description: 'Ensure data integrity after migration',
          configuration: {
            checksums: {},
            validationQueries: [
              'SELECT COUNT(*) FROM users WHERE fullName IS NOT NULL'
            ]
          }
        }
      ],
      rollbackSupport: true,
      estimatedDuration: 'PT2H'
    };

    await deprecationService.createMigrationPlan('users-api@v1', usersMigrationPlan);
    console.log('✅ Migration plans created');
  } catch (error) {
    console.error('❌ Failed to create migration plans:', error);
  }
}

// Example: Create compatibility layers
async function setupCompatibilityLayers() {
  try {
    // Compatibility layer for users API v1
    const usersCompatibilityLayer = {
      type: 'ADAPTER',
      configuration: {
        proxyTo: '/api/v2/users',
        transformations: {
          request: {
            // Transform v1 request to v2 format
            fieldMappings: {
              'name': 'fullName',
              'email': 'emailAddress'
            }
          },
          response: {
            // Transform v2 response back to v1 format
            fieldMappings: {
              'fullName': 'name',
              'emailAddress': 'email'
            },
            removeFields: ['version', 'createdAt']
          }
        }
      },
      expiresAt: '2024-06-01T00:00:00Z'
    };

    await deprecationService.createCompatibilityLayer('users-api@v1', usersCompatibilityLayer);
    console.log('✅ Compatibility layers created');
  } catch (error) {
    console.error('❌ Failed to create compatibility layers:', error);
  }
}

// Example: Listen for deprecation events
deprecationService.on('deprecation.announced', (event) => {
  console.log(`📢 Deprecation announced: ${event.featureId}`);
  // Send notifications to stakeholders
});

deprecationService.on('usage.tracked', (event) => {
  console.log(`📊 Usage tracked: ${event.featureId} by ${event.consumerId}`);
  // Update analytics dashboard
});

deprecationService.on('migration.executed', (event) => {
  console.log(`🔄 Migration executed: ${event.featureId} for ${event.consumerId}`);
  // Update migration progress tracking
});

deprecationService.on('notification.sent', (event) => {
  console.log(`📧 Notification sent: ${event.type} for ${event.featureId}`);
  // Log notification delivery
});

// Example: API endpoints for deprecation management
app.get('/api/deprecation/status/:featureId', (req, res) => {
  const status = deprecationService.getDeprecationStatus(req.params.featureId);
  res.json(status);
});

app.get('/api/deprecation/progress/:featureId', (req, res) => {
  const progress = deprecationService.getMigrationProgress(req.params.featureId);
  res.json(progress);
});

app.get('/api/deprecation/analytics/:featureId', async (req, res) => {
  const analytics = await trackingMiddleware.generateUsageAnalytics(req.params.featureId);
  res.json(analytics);
});

app.get('/api/deprecation/report', async (req, res) => {
  const report = await deprecationService.generateDeprecationReport();
  res.json(report);
});

// Example: Execute migration for a consumer
app.post('/api/deprecation/migrate/:featureId/:consumerId', async (req, res) => {
  try {
    const result = await deprecationService.executeMigration(
      req.params.featureId,
      req.params.consumerId,
      req.body.options || {}
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize example data
async function initialize() {
  await setupDeprecationSchedules();
  await setupMigrationPlans();
  await setupCompatibilityLayers();
  
  console.log('🚀 Deprecation management example initialized');
  console.log('📊 Try these endpoints:');
  console.log('  GET /api/v1/users (deprecated)');
  console.log('  POST /api/v1/messages (deprecated)');
  console.log('  GET /api/legacy-feature (deprecated)');
  console.log('  GET /api/deprecation/report');
  console.log('  GET /api/deprecation/status/users-api@v1');
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  initialize();
});

export { app, deprecationService, trackingMiddleware };