/**
 * Contract Testing Configuration
 * Centralized configuration for contract testing across the Q ecosystem
 */

export default {
  // Test execution configuration
  execution: {
    parallel: true,
    timeout: 30000,
    retries: 2,
    bail: false, // Continue testing even if some tests fail
    verbose: process.env.NODE_ENV === 'development'
  },

  // Quality gates configuration
  qualityGates: {
    coverage: {
      threshold: 80,
      warningThreshold: 70
    },
    warnings: {
      maxCount: 10,
      failOnWarnings: process.env.CI === 'true'
    },
    errors: {
      maxCritical: 0,
      maxHigh: 0,
      maxMedium: 5
    },
    crossModule: {
      maxIncompatibilities: 0,
      maxWarnings: 5
    },
    performance: {
      maxDuration: 300000, // 5 minutes
      warningDuration: 120000 // 2 minutes
    }
  },

  // Module discovery and filtering
  modules: {
    path: './modules',
    include: process.env.CONTRACT_TEST_INCLUDE?.split(','),
    exclude: process.env.CONTRACT_TEST_EXCLUDE?.split(',') || ['legacy-*'],
    autoDiscover: true,
    requirePackageJson: true,
    requireContracts: false // Allow modules without contracts for gradual adoption
  },

  // Test types configuration
  testTypes: {
    schema: {
      enabled: true,
      validateExamples: true,
      generateTestData: true,
      strictMode: true
    },
    api: {
      enabled: true,
      testEndpoints: process.env.CONTRACT_TEST_ENDPOINTS === 'true',
      validateResponses: true,
      checkSecurity: true
    },
    mcp: {
      enabled: true,
      validateTools: true,
      testToolSchemas: true,
      checkResourceAccess: true
    },
    events: {
      enabled: true,
      validateNaming: true,
      checkVersioning: true,
      validatePayloads: true
    },
    crossModule: {
      enabled: true,
      testIntegrations: true,
      validateCompatibility: true,
      checkDependencies: true
    }
  },

  // Known integration patterns for enhanced cross-module testing
  integrationPatterns: [
    {
      name: 'Identity Integration',
      source: 'squid',
      targets: ['qwallet', 'qmail', 'qmarket', 'qchat', 'qdrive', 'qpic', 'qonsent'],
      requiredHeaders: ['x-squid-id', 'x-subid'],
      description: 'All modules must integrate with sQuid for identity'
    },
    {
      name: 'Permission Integration', 
      source: 'qonsent',
      targets: ['qwallet', 'qdrive', 'qmarket', 'qmail', 'qchat'],
      requiredHeaders: ['x-qonsent'],
      description: 'Sensitive operations require Qonsent permission checks'
    },
    {
      name: 'Encryption Integration',
      source: 'qlock',
      targets: ['qdrive', 'qmail', 'qwallet', 'qchat'],
      requiredHeaders: ['x-sig'],
      description: 'Data encryption and signatures via Qlock'
    },
    {
      name: 'Indexing Integration',
      source: 'qindex',
      targets: ['qdrive', 'qmarket', 'qmail', 'qpic'],
      description: 'Content indexing and discovery'
    },
    {
      name: 'Audit Integration',
      source: 'qerberos',
      targets: ['qwallet', 'qmarket', 'qchat', 'qmail'],
      description: 'Security auditing and monitoring'
    },
    {
      name: 'Privacy Integration',
      source: 'qmask',
      targets: ['qdrive', 'qpic', 'qmarket'],
      description: 'Privacy profile application'
    },
    {
      name: 'Payment Integration',
      source: 'qwallet',
      targets: ['qmail', 'qmarket', 'qdrive'],
      description: 'Payment processing and fee collection'
    }
  ],

  // Standard headers that should be consistent across modules
  standardHeaders: {
    'x-squid-id': {
      type: 'string',
      pattern: '^squid_[a-zA-Z0-9_-]+$',
      required: true,
      description: 'sQuid identity identifier'
    },
    'x-subid': {
      type: 'string', 
      pattern: '^sub_[a-zA-Z0-9_-]+$',
      required: false,
      description: 'Subidentity identifier'
    },
    'x-qonsent': {
      type: 'string',
      required: false,
      description: 'Qonsent permission token'
    },
    'x-sig': {
      type: 'string',
      required: false,
      description: 'Qlock cryptographic signature'
    },
    'x-ts': {
      type: 'string',
      format: 'date-time',
      required: false,
      description: 'Request timestamp'
    },
    'x-api-version': {
      type: 'string',
      pattern: '^v\\d+(\\.\\d+)?$',
      required: false,
      description: 'API version'
    }
  },

  // Event naming conventions
  eventConventions: {
    pattern: '^q\\.[a-z]+\\.[a-z]+\\.v\\d+$',
    examples: [
      'q.qchat.message.sent.v1',
      'q.qwallet.payment.completed.v1',
      'q.qdrive.file.uploaded.v1'
    ],
    requiredFields: ['eventType', 'timestamp', 'data'],
    maxPayloadSize: 1048576 // 1MB
  },

  // Response format standards
  responseFormat: {
    success: {
      status: 'ok',
      requiredFields: ['status', 'data'],
      optionalFields: ['code', 'message', 'cid']
    },
    error: {
      status: 'error',
      requiredFields: ['status', 'code', 'message'],
      optionalFields: ['details', 'retryable', 'suggestedActions']
    }
  },

  // Reporting configuration
  reporting: {
    formats: ['json', 'html', 'junit', 'markdown'],
    outputPath: './test-results/contract-tests',
    includeDetails: true,
    includeCoverage: true,
    includeRecommendations: true,
    generateBadges: true,
    uploadArtifacts: process.env.CI === 'true'
  },

  // CI/CD integration
  ci: {
    enabled: process.env.CI === 'true',
    failFast: false,
    generateSummary: true,
    commentOnPR: process.env.GITHUB_TOKEN && process.env.GITHUB_PR_NUMBER,
    slackNotifications: !!process.env.SLACK_WEBHOOK_URL,
    badgeGeneration: true
  },

  // Security scanning integration
  security: {
    enabled: true,
    scanDependencies: true,
    checkSecrets: true,
    validateTLS: true,
    auditLevel: 'high'
  },

  // Performance monitoring
  performance: {
    enabled: true,
    trackMemory: true,
    trackCPU: true,
    profileSlowTests: true,
    thresholds: {
      testDuration: 5000, // 5 seconds per test
      memoryUsage: 512 * 1024 * 1024, // 512MB
      cpuUsage: 80 // 80%
    }
  }
};