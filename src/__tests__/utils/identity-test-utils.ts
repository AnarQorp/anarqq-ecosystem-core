/**
 * Identity Test Utilities
 * Helper functions and mock data for identity system testing
 */

import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType,
  SubidentityMetadata,
  IdentityCreationRules,
  SecurityFlag,
  KYCInfo,
  AuditLogEntry,
  IdentityAction
} from '@/types/identity';

// Mock identity counter for unique IDs
let mockIdentityCounter = 0;

/**
 * Creates a mock identity with default values and optional overrides
 */
export function createMockIdentity(overrides: Partial<ExtendedSquidIdentity> = {}): ExtendedSquidIdentity {
  const id = ++mockIdentityCounter;
  const baseIdentity: ExtendedSquidIdentity = {
    did: `did:key:mock_identity_${id}_${Date.now()}`,
    name: `Mock Identity ${id}`,
    type: IdentityType.DAO,
    parentId: undefined,
    depth: 0,
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      kycRequired: false,
      canCreateSubidentities: true,
      visibility: 'PUBLIC',
      governedBy: 'SELF'
    },
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canSwitchIdentities: true
    },
    qonsentProfileId: `qonsent_profile_mock_${id}`,
    qlockKeyPair: {
      publicKey: `mock_public_key_${id}`,
      privateKey: `mock_private_key_${id}`
    },
    privacyLevel: PrivacyLevel.PUBLIC,
    avatar: undefined,
    description: `Mock identity for testing purposes - ${id}`,
    tags: ['mock', 'test'],
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    status: IdentityStatus.ACTIVE,
    kyc: {
      approved: false,
      level: 'NONE',
      verifiedAt: undefined,
      documents: []
    },
    auditLog: [],
    securityFlags: []
  };

  return { ...baseIdentity, ...overrides };
}

/**
 * Creates mock subidentity metadata with default values and optional overrides
 */
export function createMockSubidentityMetadata(overrides: Partial<SubidentityMetadata & { type?: IdentityType }> = {}): SubidentityMetadata {
  const id = ++mockIdentityCounter;
  const baseMetadata: SubidentityMetadata = {
    name: `Mock Subidentity ${id}`,
    description: `Mock subidentity for testing - ${id}`,
    tags: ['mock', 'subidentity', 'test'],
    privacyLevel: PrivacyLevel.PUBLIC,
    governanceConfig: {
      daoId: undefined,
      governanceRules: {
        requiresApproval: false,
        votingThreshold: 0.5,
        minimumStake: 0
      },
      parentalConsent: undefined
    },
    qonsentConfig: {
      profileId: `qonsent_profile_sub_${id}`,
      dataSharing: {
        qmail: { enabled: true, level: 'STANDARD', restrictions: [] },
        qchat: { enabled: true, level: 'STANDARD', restrictions: [] },
        qsocial: { enabled: true, level: 'STANDARD', restrictions: [] }
      },
      visibilityRules: {
        profile: 'PUBLIC',
        activity: 'PUBLIC',
        connections: 'PUBLIC'
      }
    }
  };

  // Adjust defaults based on identity type
  if (overrides.type) {
    switch (overrides.type) {
      case IdentityType.DAO:
        baseMetadata.governanceConfig!.daoId = `mock_dao_${id}`;
        baseMetadata.privacyLevel = PrivacyLevel.DAO_ONLY;
        break;
      case IdentityType.ENTERPRISE:
        baseMetadata.privacyLevel = PrivacyLevel.PRIVATE;
        break;
      case IdentityType.CONSENTIDA:
        baseMetadata.privacyLevel = PrivacyLevel.PRIVATE;
        baseMetadata.governanceConfig!.parentalConsent = {
          guardianName: 'Mock Guardian',
          guardianEmail: 'guardian@mock.test',
          relationship: 'PARENT',
          consentDate: new Date().toISOString(),
          consentSignature: 'mock_signature'
        };
        break;
      case IdentityType.AID:
        baseMetadata.privacyLevel = PrivacyLevel.ANONYMOUS;
        break;
    }
  }

  return { ...baseMetadata, ...overrides };
}

/**
 * Creates a mock KYC info object
 */
export function createMockKYCInfo(overrides: Partial<KYCInfo> = {}): KYCInfo {
  return {
    approved: true,
    level: 'FULL',
    verifiedAt: new Date().toISOString(),
    documents: [
      {
        type: 'PASSPORT',
        hash: 'mock_document_hash_1',
        verifiedAt: new Date().toISOString()
      },
      {
        type: 'PROOF_OF_ADDRESS',
        hash: 'mock_document_hash_2',
        verifiedAt: new Date().toISOString()
      }
    ],
    ...overrides
  };
}

/**
 * Creates a mock security flag
 */
export function createMockSecurityFlag(overrides: Partial<SecurityFlag> = {}): SecurityFlag {
  return {
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
    message: 'Mock security flag for testing',
    timestamp: new Date().toISOString(),
    resolved: false,
    ...overrides
  };
}

/**
 * Creates a mock audit log entry
 */
export function createMockAuditLogEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action: IdentityAction.CREATED,
    timestamp: new Date().toISOString(),
    actorId: 'mock_actor_did',
    targetId: 'mock_target_did',
    metadata: {
      userAgent: 'Mock Test Agent',
      ipAddress: '127.0.0.1',
      location: 'Test Environment'
    },
    ...overrides
  };
}

/**
 * Creates a complete identity hierarchy for testing
 */
export function createMockIdentityHierarchy(): {
  root: ExtendedSquidIdentity;
  dao: ExtendedSquidIdentity;
  enterprise: ExtendedSquidIdentity;
  consentida: ExtendedSquidIdentity;
  aid: ExtendedSquidIdentity;
} {
  const root = createMockIdentity({
    type: IdentityType.ROOT,
    name: 'Mock Root Identity',
    depth: 0,
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canSwitchIdentities: true
    },
    kyc: createMockKYCInfo()
  });

  const dao = createMockIdentity({
    type: IdentityType.DAO,
    name: 'Mock DAO Identity',
    parentId: root.did,
    depth: 1,
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.DAO_ONLY,
    kyc: createMockKYCInfo()
  });

  const enterprise = createMockIdentity({
    type: IdentityType.ENTERPRISE,
    name: 'Mock Enterprise Identity',
    parentId: dao.did,
    depth: 2,
    governanceLevel: GovernanceType.ENTERPRISE,
    privacyLevel: PrivacyLevel.PRIVATE,
    kyc: createMockKYCInfo()
  });

  const consentida = createMockIdentity({
    type: IdentityType.CONSENTIDA,
    name: 'Mock Consentida Identity',
    parentId: root.did,
    depth: 1,
    governanceLevel: GovernanceType.PARENT,
    privacyLevel: PrivacyLevel.PRIVATE,
    kyc: createMockKYCInfo({ approved: false, level: 'NONE' })
  });

  const aid = createMockIdentity({
    type: IdentityType.AID,
    name: 'Mock AID Identity',
    parentId: root.did,
    depth: 1,
    governanceLevel: GovernanceType.SELF,
    privacyLevel: PrivacyLevel.ANONYMOUS,
    kyc: createMockKYCInfo({ approved: false, level: 'NONE' })
  });

  return { root, dao, enterprise, consentida, aid };
}

/**
 * Creates mock ecosystem service responses
 */
export function createMockEcosystemResponses() {
  return {
    qonsent: {
      createProfile: {
        success: true,
        profileId: `qonsent_profile_${Date.now()}`
      },
      updateProfile: {
        success: true
      },
      switchProfile: {
        success: true
      }
    },
    qlock: {
      generateKeyPair: {
        success: true,
        publicKey: `mock_public_key_${Date.now()}`,
        privateKey: `mock_private_key_${Date.now()}`
      },
      encryptData: {
        success: true,
        encryptedData: 'mock_encrypted_data'
      },
      switchEncryptionContext: {
        success: true
      }
    },
    qerberos: {
      logAction: {
        success: true,
        logId: `audit_log_${Date.now()}`
      },
      logSecurityEvent: {
        success: true,
        eventId: `security_event_${Date.now()}`
      }
    },
    qindex: {
      registerIdentity: {
        success: true,
        indexId: `qindex_entry_${Date.now()}`
      },
      updateIdentityMetadata: {
        success: true
      },
      searchIdentities: {
        success: true,
        results: []
      }
    },
    qwallet: {
      createWalletContext: {
        success: true,
        contextId: `wallet_context_${Date.now()}`
      },
      switchWalletContext: {
        success: true
      }
    }
  };
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  private static measurements: Map<string, number[]> = new Map();

  static startMeasurement(operationName: string): () => number {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const duration = performance.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      if (!this.measurements.has(operationName)) {
        this.measurements.set(operationName, []);
      }
      this.measurements.get(operationName)!.push(duration);

      console.log(`[PerformanceTest] ${operationName}: ${duration.toFixed(2)}ms, ${(memoryUsed / 1024).toFixed(2)}KB`);
      return duration;
    };
  }

  static getAverageTime(operationName: string): number {
    const times = this.measurements.get(operationName) || [];
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  static getMaxTime(operationName: string): number {
    const times = this.measurements.get(operationName) || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }

  static getMinTime(operationName: string): number {
    const times = this.measurements.get(operationName) || [];
    return times.length > 0 ? Math.min(...times) : 0;
  }

  static generateReport(): Record<string, any> {
    const report: Record<string, any> = {};

    for (const [operationName, times] of this.measurements.entries()) {
      report[operationName] = {
        count: times.length,
        average: this.getAverageTime(operationName),
        min: this.getMinTime(operationName),
        max: this.getMaxTime(operationName),
        total: times.reduce((sum, time) => sum + time, 0)
      };
    }

    return report;
  }

  static reset() {
    this.measurements.clear();
  }
}

/**
 * Test data validation utilities
 */
export class TestDataValidator {
  static validateIdentity(identity: ExtendedSquidIdentity): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!identity.did) errors.push('DID is required');
    if (!identity.name) errors.push('Name is required');
    if (!identity.type) errors.push('Type is required');
    if (!identity.createdAt) errors.push('CreatedAt is required');
    if (!identity.status) errors.push('Status is required');

    // Validate DID format
    if (identity.did && !identity.did.startsWith('did:')) {
      errors.push('DID must start with "did:"');
    }

    // Validate identity type
    if (identity.type && !Object.values(IdentityType).includes(identity.type)) {
      errors.push('Invalid identity type');
    }

    // Validate privacy level
    if (identity.privacyLevel && !Object.values(PrivacyLevel).includes(identity.privacyLevel)) {
      errors.push('Invalid privacy level');
    }

    // Validate status
    if (identity.status && !Object.values(IdentityStatus).includes(identity.status)) {
      errors.push('Invalid status');
    }

    // Validate hierarchy constraints
    if (identity.type === IdentityType.ROOT && identity.parentId) {
      errors.push('Root identity cannot have a parent');
    }

    if (identity.type !== IdentityType.ROOT && !identity.parentId) {
      errors.push('Non-root identity must have a parent');
    }

    if (identity.depth < 0 || identity.depth > 3) {
      errors.push('Identity depth must be between 0 and 3');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSubidentityMetadata(metadata: SubidentityMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (metadata.name && metadata.name.length > 50) {
      errors.push('Name must be 50 characters or less');
    }

    if (metadata.description && metadata.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    if (metadata.tags && metadata.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }

    // Validate privacy level
    if (metadata.privacyLevel && !Object.values(PrivacyLevel).includes(metadata.privacyLevel)) {
      errors.push('Invalid privacy level');
    }

    // Validate Qonsent configuration
    if (metadata.qonsentConfig) {
      if (!metadata.qonsentConfig.profileId) {
        errors.push('Qonsent profile ID is required');
      }

      if (!metadata.qonsentConfig.dataSharing) {
        errors.push('Data sharing configuration is required');
      }

      if (!metadata.qonsentConfig.visibilityRules) {
        errors.push('Visibility rules are required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Mock data generators for load testing
 */
export class MockDataGenerator {
  static generateIdentities(count: number, type: IdentityType = IdentityType.DAO): ExtendedSquidIdentity[] {
    const identities: ExtendedSquidIdentity[] = [];

    for (let i = 0; i < count; i++) {
      identities.push(createMockIdentity({
        name: `Generated ${type} Identity ${i + 1}`,
        type,
        tags: ['generated', 'load-test', type.toLowerCase()]
      }));
    }

    return identities;
  }

  static generateSubidentityMetadata(count: number, type: IdentityType = IdentityType.DAO): SubidentityMetadata[] {
    const metadataList: SubidentityMetadata[] = [];

    for (let i = 0; i < count; i++) {
      metadataList.push(createMockSubidentityMetadata({
        name: `Generated ${type} Metadata ${i + 1}`,
        type,
        tags: ['generated', 'load-test', type.toLowerCase()]
      }));
    }

    return metadataList;
  }

  static generateAuditLogs(count: number): AuditLogEntry[] {
    const logs: AuditLogEntry[] = [];
    const actions = Object.values(IdentityAction);

    for (let i = 0; i < count; i++) {
      logs.push(createMockAuditLogEntry({
        action: actions[Math.floor(Math.random() * actions.length)],
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random time in last 30 days
      }));
    }

    return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironmentSetup {
  static async setupTestEnvironment(): Promise<void> {
    console.log('[TestSetup] Setting up test environment...');
    
    // Clear any existing test data
    await this.clearTestData();
    
    // Initialize mock services
    await this.initializeMockServices();
    
    console.log('[TestSetup] Test environment ready');
  }

  static async clearTestData(): Promise<void> {
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    // Reset performance measurements
    PerformanceTestUtils.reset();
  }

  static async initializeMockServices(): Promise<void> {
    // Initialize mock ecosystem services with default responses
    const mockResponses = createMockEcosystemResponses();
    
    // Setup service mocks would go here
    console.log('[TestSetup] Mock services initialized with responses:', mockResponses);
  }

  static async teardownTestEnvironment(): Promise<void> {
    console.log('[TestSetup] Tearing down test environment...');
    
    await this.clearTestData();
    
    console.log('[TestSetup] Test environment cleaned up');
  }
}