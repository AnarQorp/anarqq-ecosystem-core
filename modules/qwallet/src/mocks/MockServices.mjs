/**
 * Mock Services for Standalone Mode
 * 
 * Provides mock implementations of external services for development and testing
 */

export class MockServices {
  constructor() {
    this.squid = new MockSquidService();
    this.qonsent = new MockQonsentService();
    this.qlock = new MockQlockService();
    this.qindex = new MockQindexService();
    this.qerberos = new MockQerberosService();
    this.qmask = new MockQmaskService();
  }

  async initialize() {
    console.log('[MockServices] Initializing mock services...');
    
    await this.squid.initialize();
    await this.qonsent.initialize();
    await this.qlock.initialize();
    await this.qindex.initialize();
    await this.qerberos.initialize();
    await this.qmask.initialize();

    console.log('[MockServices] All mock services initialized');
  }

  async shutdown() {
    console.log('[MockServices] Shutting down mock services...');
    // Cleanup if needed
  }
}

/**
 * Mock sQuid Identity Service
 */
class MockSquidService {
  constructor() {
    this.identities = new Map();
  }

  async initialize() {
    // Create test identities
    const testIdentities = [
      {
        squidId: 'did:squid:alice123',
        verified: true,
        reputation: 85,
        daoMemberships: [
          { id: 'dao:enterprise:acme', role: 'member' }
        ]
      },
      {
        squidId: 'did:squid:bob456',
        verified: true,
        reputation: 92,
        daoMemberships: []
      },
      {
        squidId: 'did:squid:charlie789',
        verified: true,
        reputation: 78,
        daoMemberships: [
          { id: 'dao:community:builders', role: 'admin' }
        ]
      }
    ];

    testIdentities.forEach(identity => {
      this.identities.set(identity.squidId, identity);
    });

    console.log('[MockSquid] Initialized with test identities');
  }

  async verifyIdentity(squidId, signature, timestamp, requestHash) {
    const identity = this.identities.get(squidId);
    
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Mock verification - always pass in standalone mode
    return {
      verified: true,
      squidId,
      reputation: identity.reputation,
      daoMemberships: identity.daoMemberships
    };
  }

  async getIdentity(squidId) {
    return this.identities.get(squidId) || null;
  }
}

/**
 * Mock Qonsent Permission Service
 */
class MockQonsentService {
  constructor() {
    this.permissions = new Map();
  }

  async initialize() {
    // Set up default permissions for test identities
    const defaultPermissions = [
      'qwallet.create_intent',
      'qwallet.sign_transaction',
      'qwallet.process_payment',
      'qwallet.view_balance',
      'qwallet.view_transactions',
      'qwallet.cancel_intent'
    ];

    const testIdentities = ['did:squid:alice123', 'did:squid:bob456', 'did:squid:charlie789'];
    
    testIdentities.forEach(squidId => {
      this.permissions.set(squidId, new Set(defaultPermissions));
    });

    console.log('[MockQonsent] Initialized with default permissions');
  }

  async checkPermission(squidId, permission, resource, action) {
    const userPermissions = this.permissions.get(squidId);
    
    if (!userPermissions) {
      return { allowed: false, reason: 'Identity not found' };
    }

    const allowed = userPermissions.has(permission);
    
    return {
      allowed,
      permission,
      resource,
      action,
      reason: allowed ? 'Permission granted' : 'Permission denied'
    };
  }

  async grantPermission(squidId, permission) {
    let userPermissions = this.permissions.get(squidId);
    if (!userPermissions) {
      userPermissions = new Set();
      this.permissions.set(squidId, userPermissions);
    }
    
    userPermissions.add(permission);
    return { granted: true, permission };
  }
}

/**
 * Mock Qlock Encryption/Signature Service
 */
class MockQlockService {
  constructor() {
    this.keys = new Map();
  }

  async initialize() {
    console.log('[MockQlock] Initialized');
  }

  async signData(data, squidId) {
    // Mock signing - generate a deterministic signature
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const signature = `0x${Buffer.from(`${squidId}_${dataString}`).toString('hex').substring(0, 64)}`;
    
    return {
      signature,
      algorithm: 'ed25519',
      timestamp: new Date().toISOString()
    };
  }

  async verifySignature(signature, data, squidId) {
    // Mock verification - check signature format
    if (!signature || !signature.startsWith('0x') || signature.length < 20) {
      return false;
    }

    // In standalone mode, accept any properly formatted signature
    return true;
  }

  async encrypt(data, squidId) {
    // Mock encryption - just base64 encode
    const encrypted = Buffer.from(JSON.stringify(data)).toString('base64');
    
    return {
      encrypted,
      algorithm: 'AES-256-GCM',
      keyId: `key_${squidId}`
    };
  }

  async decrypt(encrypted, squidId) {
    // Mock decryption - base64 decode
    try {
      const decrypted = Buffer.from(encrypted, 'base64').toString();
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
}

/**
 * Mock Qindex Indexing Service
 */
class MockQindexService {
  constructor() {
    this.records = new Map();
  }

  async initialize() {
    console.log('[MockQindex] Initialized');
  }

  async indexRecord(record) {
    const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const indexRecord = {
      id: recordId,
      type: record.type || 'payment',
      key: record.key,
      cid: record.cid || `Qm${Math.random().toString(36).substring(2)}`,
      version: 1,
      tags: record.tags || [],
      createdAt: new Date().toISOString(),
      ...record
    };

    this.records.set(recordId, indexRecord);
    
    return {
      indexed: true,
      recordId,
      cid: indexRecord.cid
    };
  }

  async getRecord(key) {
    for (const record of this.records.values()) {
      if (record.key === key) {
        return record;
      }
    }
    return null;
  }

  async searchRecords(query) {
    const results = Array.from(this.records.values()).filter(record => {
      if (query.type && record.type !== query.type) return false;
      if (query.tags && !query.tags.some(tag => record.tags.includes(tag))) return false;
      return true;
    });

    return {
      results,
      total: results.length
    };
  }
}

/**
 * Mock Qerberos Security/Audit Service
 */
class MockQerberosService {
  constructor() {
    this.auditLogs = [];
    this.riskScores = new Map();
  }

  async initialize() {
    console.log('[MockQerberos] Initialized');
  }

  async logEvent(event) {
    const auditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date().toISOString(),
      module: 'qwallet',
      ...event
    };

    this.auditLogs.push(auditEvent);
    
    // Update risk score
    if (event.actor?.squidId) {
      const currentScore = this.riskScores.get(event.actor.squidId) || 0;
      const newScore = this.calculateRiskScore(event, currentScore);
      this.riskScores.set(event.actor.squidId, newScore);
    }

    return {
      logged: true,
      eventId: auditEvent.id,
      riskScore: event.riskScore || 0
    };
  }

  async getRiskScore(squidId) {
    return this.riskScores.get(squidId) || 0;
  }

  async getAuditLogs(filters = {}) {
    let filteredLogs = this.auditLogs;

    if (filters.squidId) {
      filteredLogs = filteredLogs.filter(log => 
        log.actor?.squidId === filters.squidId
      );
    }

    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action === filters.action
      );
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(filters.startDate)
      );
    }

    return {
      logs: filteredLogs,
      total: filteredLogs.length
    };
  }

  calculateRiskScore(event, currentScore) {
    let adjustment = 0;

    if (event.verdict === 'DENY') adjustment += 10;
    if (event.action.includes('FAILED')) adjustment += 5;
    if (event.details?.amount > 1000) adjustment += 2;

    // Decay over time
    const decayedScore = Math.max(0, currentScore * 0.99);
    
    return Math.min(100, decayedScore + adjustment);
  }
}

/**
 * Mock Qmask Privacy Service
 */
class MockQmaskService {
  constructor() {
    this.profiles = new Map();
  }

  async initialize() {
    // Create default privacy profiles
    const defaultProfiles = [
      {
        name: 'standard',
        rules: [
          { field: 'amount', strategy: 'ROUND', params: { precision: 2 } },
          { field: 'timestamp', strategy: 'ROUND', params: { precision: 'hour' } }
        ]
      },
      {
        name: 'high-privacy',
        rules: [
          { field: 'amount', strategy: 'RANGE', params: { ranges: ['0-100', '100-1000', '1000+'] } },
          { field: 'recipient', strategy: 'HASH' },
          { field: 'purpose', strategy: 'REDACT' }
        ]
      }
    ];

    defaultProfiles.forEach(profile => {
      this.profiles.set(profile.name, profile);
    });

    console.log('[MockQmask] Initialized with default privacy profiles');
  }

  async applyProfile(data, profileName) {
    const profile = this.profiles.get(profileName);
    
    if (!profile) {
      return data; // Return original data if profile not found
    }

    const maskedData = { ...data };

    profile.rules.forEach(rule => {
      if (maskedData[rule.field] !== undefined) {
        maskedData[rule.field] = this.applyMaskingRule(maskedData[rule.field], rule);
      }
    });

    return maskedData;
  }

  applyMaskingRule(value, rule) {
    switch (rule.strategy) {
      case 'REDACT':
        return '[REDACTED]';
      
      case 'HASH':
        return `hash_${Buffer.from(value.toString()).toString('hex').substring(0, 8)}`;
      
      case 'ROUND':
        if (typeof value === 'number' && rule.params?.precision) {
          return Math.round(value / rule.params.precision) * rule.params.precision;
        }
        return value;
      
      case 'RANGE':
        if (typeof value === 'number' && rule.params?.ranges) {
          for (const range of rule.params.ranges) {
            if (range.includes('-')) {
              const [min, max] = range.split('-').map(Number);
              if (value >= min && value < max) return range;
            } else if (range.includes('+')) {
              const min = Number(range.replace('+', ''));
              if (value >= min) return range;
            }
          }
        }
        return value;
      
      default:
        return value;
    }
  }

  async getProfile(profileName) {
    return this.profiles.get(profileName) || null;
  }
}

export default MockServices;