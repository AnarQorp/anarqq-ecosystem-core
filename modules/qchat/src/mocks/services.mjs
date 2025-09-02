/**
 * Mock Services for Standalone Mode
 * Provides mock implementations of external Q ecosystem services
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Mock sQuid Identity Service
 */
export class MockSQuidService {
  constructor() {
    this.identities = new Map();
    this.reputations = new Map();
    
    // Initialize with some mock data
    this.initializeMockData();
  }
  
  initializeMockData() {
    const mockUsers = [
      {
        squidId: 'squid_admin_123',
        displayName: 'Admin User',
        reputation: 0.95,
        daoMemberships: ['dao_example_123', 'dao_moderators_456'],
        subIdentities: ['sub_admin_work', 'sub_admin_personal']
      },
      {
        squidId: 'squid_user_456',
        displayName: 'Regular User',
        reputation: 0.75,
        daoMemberships: ['dao_example_123'],
        subIdentities: ['sub_user_main']
      },
      {
        squidId: 'squid_newbie_789',
        displayName: 'New User',
        reputation: 0.25,
        daoMemberships: [],
        subIdentities: []
      }
    ];
    
    mockUsers.forEach(user => {
      this.identities.set(user.squidId, user);
      this.reputations.set(user.squidId, user.reputation);
    });
  }
  
  async verifyIdentity(squidId, token) {
    const identity = this.identities.get(squidId);
    if (!identity) {
      return { valid: false, error: 'Identity not found' };
    }
    
    return {
      valid: true,
      identity: {
        squidId: identity.squidId,
        displayName: identity.displayName,
        reputation: identity.reputation,
        daoMemberships: identity.daoMemberships,
        subIdentities: identity.subIdentities,
        verified: true,
        createdAt: '2024-01-01T00:00:00Z'
      }
    };
  }
  
  async getIdentity(squidId) {
    const identity = this.identities.get(squidId);
    if (!identity) {
      return null;
    }
    
    return {
      squidId: identity.squidId,
      displayName: identity.displayName,
      reputation: identity.reputation,
      daoMemberships: identity.daoMemberships,
      subIdentities: identity.subIdentities,
      verified: true,
      createdAt: '2024-01-01T00:00:00Z'
    };
  }
  
  async getReputation(squidId) {
    return this.reputations.get(squidId) || 0.5;
  }
  
  async updateReputation(squidId, change) {
    const currentReputation = this.reputations.get(squidId) || 0.5;
    const newReputation = Math.max(0, Math.min(1, currentReputation + change));
    this.reputations.set(squidId, newReputation);
    
    return {
      squidId,
      previousReputation: currentReputation,
      newReputation,
      change
    };
  }
}

/**
 * Mock Qlock Encryption Service
 */
export class MockQlockService {
  constructor() {
    this.keys = new Map();
    this.signatures = new Map();
  }
  
  async encrypt(data, keyId = 'default') {
    // Simple base64 encoding as mock encryption
    const encrypted = Buffer.from(JSON.stringify(data)).toString('base64');
    return {
      encrypted,
      keyId,
      algorithm: 'MOCK_AES_256',
      timestamp: new Date().toISOString()
    };
  }
  
  async decrypt(encryptedData, keyId = 'default') {
    try {
      // Simple base64 decoding as mock decryption
      const decrypted = Buffer.from(encryptedData, 'base64').toString('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
  
  async sign(data, keyId = 'default') {
    const signature = Buffer.from(`signature_${JSON.stringify(data)}_${keyId}`).toString('base64');
    const signatureData = {
      signature,
      keyId,
      algorithm: 'MOCK_ECDSA',
      timestamp: new Date().toISOString()
    };
    
    this.signatures.set(signature, { data, keyId, timestamp: new Date().toISOString() });
    return signatureData;
  }
  
  async verify(data, signature, keyId = 'default') {
    const storedSignature = this.signatures.get(signature);
    if (!storedSignature) {
      return { valid: false, error: 'Signature not found' };
    }
    
    const isValid = JSON.stringify(storedSignature.data) === JSON.stringify(data) &&
                   storedSignature.keyId === keyId;
    
    return {
      valid: isValid,
      keyId,
      timestamp: storedSignature.timestamp
    };
  }
  
  async deriveKey(baseKey, context) {
    const derivedKey = `derived_${baseKey}_${context}_${Date.now()}`;
    this.keys.set(derivedKey, { baseKey, context, created: new Date().toISOString() });
    return derivedKey;
  }
  
  async rotateKey(keyId) {
    const newKeyId = `${keyId}_rotated_${Date.now()}`;
    this.keys.set(newKeyId, { 
      previousKey: keyId, 
      created: new Date().toISOString(),
      rotated: true 
    });
    return newKeyId;
  }
}

/**
 * Mock Qonsent Permission Service
 */
export class MockQonsentService {
  constructor() {
    this.permissions = new Map();
    this.policies = new Map();
    
    this.initializeMockPermissions();
  }
  
  initializeMockPermissions() {
    // Default permissions for different user types
    const defaultPermissions = {
      'squid_admin_123': [
        'qchat:room:create',
        'qchat:room:join',
        'qchat:room:moderate',
        'qchat:room:admin',
        'qchat:room:owner',
        'qchat:message:send',
        'qchat:message:edit',
        'qchat:message:delete',
        'qchat:message:react'
      ],
      'squid_user_456': [
        'qchat:room:create',
        'qchat:room:join',
        'qchat:message:send',
        'qchat:message:edit',
        'qchat:message:react'
      ],
      'squid_newbie_789': [
        'qchat:room:join',
        'qchat:message:send',
        'qchat:message:react'
      ]
    };
    
    Object.entries(defaultPermissions).forEach(([squidId, perms]) => {
      this.permissions.set(squidId, new Set(perms));
    });
  }
  
  async checkPermission(squidId, resource, action, context = {}) {
    const permission = `${resource}:${action}`;
    const userPermissions = this.permissions.get(squidId) || new Set();
    
    // Check basic permission
    if (userPermissions.has(permission)) {
      return { granted: true, scope: 'full' };
    }
    
    // Check contextual permissions (e.g., room-specific)
    if (context.roomId) {
      const roomPermission = `${permission}:${context.roomId}`;
      if (userPermissions.has(roomPermission)) {
        return { granted: true, scope: 'room' };
      }
    }
    
    // Check reputation-based permissions
    if (context.reputation && context.reputation >= 0.8) {
      const highRepPermissions = [
        'qchat:room:create',
        'qchat:room:moderate'
      ];
      
      if (highRepPermissions.includes(permission)) {
        return { granted: true, scope: 'reputation' };
      }
    }
    
    return { 
      granted: false, 
      reason: 'permission_denied',
      requiredPermission: permission
    };
  }
  
  async grantPermission(squidId, resource, action, context = {}) {
    const permission = `${resource}:${action}`;
    const userPermissions = this.permissions.get(squidId) || new Set();
    
    if (context.roomId) {
      userPermissions.add(`${permission}:${context.roomId}`);
    } else {
      userPermissions.add(permission);
    }
    
    this.permissions.set(squidId, userPermissions);
    
    return {
      granted: true,
      permission,
      squidId,
      timestamp: new Date().toISOString()
    };
  }
  
  async revokePermission(squidId, resource, action, context = {}) {
    const permission = `${resource}:${action}`;
    const userPermissions = this.permissions.get(squidId) || new Set();
    
    if (context.roomId) {
      userPermissions.delete(`${permission}:${context.roomId}`);
    } else {
      userPermissions.delete(permission);
    }
    
    this.permissions.set(squidId, userPermissions);
    
    return {
      revoked: true,
      permission,
      squidId,
      timestamp: new Date().toISOString()
    };
  }
  
  async getUserPermissions(squidId) {
    const userPermissions = this.permissions.get(squidId) || new Set();
    return Array.from(userPermissions);
  }
}

/**
 * Mock Qindex Indexing Service
 */
export class MockQindexService {
  constructor() {
    this.indices = new Map();
    this.records = new Map();
  }
  
  async put(key, data, options = {}) {
    const recordId = uuidv4();
    const record = {
      recordId,
      key,
      data,
      type: options.type || 'generic',
      tags: options.tags || [],
      timestamp: new Date().toISOString(),
      cid: `Qm${Math.random().toString(36).substring(2, 46)}`
    };
    
    this.records.set(recordId, record);
    
    // Add to index
    if (!this.indices.has(key)) {
      this.indices.set(key, []);
    }
    this.indices.get(key).push(recordId);
    
    return {
      recordId,
      cid: record.cid,
      indexed: true
    };
  }
  
  async get(key) {
    const recordIds = this.indices.get(key) || [];
    const records = recordIds.map(id => this.records.get(id)).filter(Boolean);
    
    return {
      key,
      records,
      count: records.length
    };
  }
  
  async list(options = {}) {
    let allRecords = Array.from(this.records.values());
    
    if (options.type) {
      allRecords = allRecords.filter(record => record.type === options.type);
    }
    
    if (options.tags) {
      allRecords = allRecords.filter(record => 
        options.tags.some(tag => record.tags.includes(tag))
      );
    }
    
    // Sort by timestamp (newest first)
    allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const paginatedRecords = allRecords.slice(offset, offset + limit);
    
    return {
      records: paginatedRecords,
      totalCount: allRecords.length,
      hasMore: offset + limit < allRecords.length
    };
  }
  
  async search(query, options = {}) {
    const searchTerm = query.toLowerCase();
    let matchingRecords = Array.from(this.records.values()).filter(record => {
      const searchableText = [
        record.key,
        JSON.stringify(record.data),
        ...record.tags
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
    
    // Apply filters
    if (options.type) {
      matchingRecords = matchingRecords.filter(record => record.type === options.type);
    }
    
    // Sort by relevance (simplified - by timestamp)
    matchingRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const limit = options.limit || 20;
    const results = matchingRecords.slice(0, limit);
    
    return {
      query,
      results,
      totalMatches: matchingRecords.length,
      searchTime: Math.random() * 100
    };
  }
}

/**
 * Mock Qerberos Security Service
 */
export class MockQerberosService {
  constructor() {
    this.events = new Map();
    this.riskScores = new Map();
    this.threats = new Map();
  }
  
  async reportSecurityEvent(event) {
    const eventId = `qerb_event_${uuidv4().replace(/-/g, '_')}`;
    const securityEvent = {
      eventId,
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      processed: false,
      riskScore: this.calculateRiskScore(event)
    };
    
    this.events.set(eventId, securityEvent);
    
    // Update user risk score
    if (event.squidId) {
      const currentRisk = this.riskScores.get(event.squidId) || 0.1;
      const newRisk = Math.min(1.0, currentRisk + securityEvent.riskScore);
      this.riskScores.set(event.squidId, newRisk);
    }
    
    console.log('Security event reported:', event.type, eventId);
    
    return {
      eventId,
      riskScore: securityEvent.riskScore,
      processed: true
    };
  }
  
  async assessRisk(context) {
    const baseRisk = 0.1;
    let riskScore = baseRisk;
    const factors = [];
    
    // Check user reputation
    if (context.reputation < 0.3) {
      riskScore += 0.3;
      factors.push('low_reputation');
    }
    
    // Check for suspicious patterns
    if (context.action && context.action.includes('DELETE')) {
      riskScore += 0.1;
      factors.push('destructive_action');
    }
    
    // Check user history
    const userRisk = this.riskScores.get(context.squidId) || 0.1;
    riskScore = Math.max(riskScore, userRisk);
    
    if (userRisk > 0.5) {
      factors.push('high_risk_user');
    }
    
    // Determine recommendation
    let recommendation = 'ALLOW';
    if (riskScore > 0.8) {
      recommendation = 'BLOCK';
    } else if (riskScore > 0.5) {
      recommendation = 'REVIEW';
    }
    
    return {
      riskScore: Math.min(1.0, riskScore),
      factors,
      recommendation,
      timestamp: new Date().toISOString()
    };
  }
  
  async getThreatIntelligence(squidId) {
    const userRisk = this.riskScores.get(squidId) || 0.1;
    const userEvents = Array.from(this.events.values())
      .filter(event => event.squidId === squidId)
      .slice(0, 10); // Last 10 events
    
    return {
      squidId,
      riskScore: userRisk,
      threatLevel: userRisk > 0.7 ? 'HIGH' : userRisk > 0.4 ? 'MEDIUM' : 'LOW',
      recentEvents: userEvents,
      recommendations: this.generateRecommendations(userRisk, userEvents)
    };
  }
  
  calculateRiskScore(event) {
    const riskFactors = {
      'PERMISSION_DENIED': 0.05,
      'RATE_LIMIT_EXCEEDED': 0.1,
      'SPAM_DETECTED': 0.2,
      'SECURITY_VIOLATION': 0.3,
      'SUSPICIOUS_ACTIVITY': 0.4,
      'MODERATION_ESCALATION': 0.2
    };
    
    return riskFactors[event.type] || 0.05;
  }
  
  generateRecommendations(riskScore, events) {
    const recommendations = [];
    
    if (riskScore > 0.7) {
      recommendations.push('Consider temporary restrictions');
      recommendations.push('Increase monitoring frequency');
    }
    
    if (riskScore > 0.5) {
      recommendations.push('Review recent activity');
      recommendations.push('Apply additional verification');
    }
    
    if (events.length > 5) {
      recommendations.push('Pattern analysis recommended');
    }
    
    return recommendations;
  }
}

/**
 * Mock IPFS Service
 */
export class MockIPFSService {
  constructor() {
    this.storage = new Map();
    this.pins = new Set();
  }
  
  async add(data) {
    const cid = `Qm${Math.random().toString(36).substring(2, 46)}`;
    this.storage.set(cid, {
      data,
      size: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    console.log('Content added to IPFS:', cid);
    return { cid };
  }
  
  async get(cid) {
    const content = this.storage.get(cid);
    if (!content) {
      throw new Error('Content not found');
    }
    
    return content.data;
  }
  
  async pin(cid) {
    if (!this.storage.has(cid)) {
      throw new Error('Content not found');
    }
    
    this.pins.add(cid);
    console.log('Content pinned:', cid);
    return { pinned: true };
  }
  
  async unpin(cid) {
    this.pins.delete(cid);
    console.log('Content unpinned:', cid);
    return { unpinned: true };
  }
  
  async ls() {
    return Array.from(this.storage.keys()).map(cid => ({
      cid,
      pinned: this.pins.has(cid),
      ...this.storage.get(cid)
    }));
  }
}

// Export all mock services
export const mockServices = {
  squid: new MockSQuidService(),
  qlock: new MockQlockService(),
  qonsent: new MockQonsentService(),
  qindex: new MockQindexService(),
  qerberos: new MockQerberosService(),
  ipfs: new MockIPFSService()
};

export default mockServices;