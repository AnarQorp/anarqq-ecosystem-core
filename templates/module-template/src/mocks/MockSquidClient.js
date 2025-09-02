/**
 * Mock sQuid Client
 * 
 * Mock implementation of sQuid identity service for development and testing
 */

import { v4 as uuidv4 } from 'uuid';

export class MockSquidClient {
  constructor(options = {}) {
    this.options = options;
    this.identities = new Map();
    this.sessions = new Map();
    
    // Create some test identities
    this.createTestIdentities();
  }

  createTestIdentities() {
    const testIdentities = [
      {
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User 1',
        email: 'test1@example.com',
        reputation: 85,
        verified: true,
        subidentities: [
          {
            subId: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Test Sub 1',
            type: 'personal'
          }
        ]
      },
      {
        squidId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Test User 2',
        email: 'test2@example.com',
        reputation: 92,
        verified: true,
        subidentities: []
      }
    ];

    testIdentities.forEach(identity => {
      this.identities.set(identity.squidId, identity);
    });
  }

  /**
   * Verify identity
   */
  async verifyIdentity({ squidId, subId, signature, timestamp }) {
    // Simulate network delay
    await this.delay(50);

    const identity = this.identities.get(squidId);
    
    if (!identity) {
      return {
        valid: false,
        reason: 'identity_not_found'
      };
    }

    // Mock signature verification (always pass for test identities)
    if (signature && timestamp) {
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      const timeDiff = Math.abs(now - requestTime);
      
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        return {
          valid: false,
          reason: 'timestamp_expired'
        };
      }
    }

    // Check subidentity if provided
    if (subId) {
      const subidentity = identity.subidentities.find(sub => sub.subId === subId);
      if (!subidentity) {
        return {
          valid: false,
          reason: 'subidentity_not_found'
        };
      }
    }

    return {
      valid: true,
      squidId,
      subId,
      reputation: identity.reputation,
      verified: identity.verified,
      daoId: identity.daoId
    };
  }

  /**
   * Get identity information
   */
  async getIdentity(squidId) {
    await this.delay(30);

    const identity = this.identities.get(squidId);
    
    if (!identity) {
      throw new Error('Identity not found');
    }

    return {
      squidId: identity.squidId,
      name: identity.name,
      reputation: identity.reputation,
      verified: identity.verified,
      createdAt: '2023-01-01T00:00:00Z',
      subidentities: identity.subidentities
    };
  }

  /**
   * Create session
   */
  async createSession(squidId, subId) {
    await this.delay(40);

    const identity = this.identities.get(squidId);
    
    if (!identity) {
      throw new Error('Identity not found');
    }

    const sessionId = uuidv4();
    const session = {
      sessionId,
      squidId,
      subId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      active: true
    };

    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId) {
    await this.delay(20);

    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        valid: false,
        reason: 'session_not_found'
      };
    }

    if (!session.active) {
      return {
        valid: false,
        reason: 'session_inactive'
      };
    }

    if (new Date() > new Date(session.expiresAt)) {
      return {
        valid: false,
        reason: 'session_expired'
      };
    }

    return {
      valid: true,
      session
    };
  }

  /**
   * Health check
   */
  async health() {
    return {
      status: 'healthy',
      version: '1.0.0-mock',
      timestamp: new Date().toISOString(),
      identities: this.identities.size,
      sessions: this.sessions.size
    };
  }

  /**
   * Simulate network delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}