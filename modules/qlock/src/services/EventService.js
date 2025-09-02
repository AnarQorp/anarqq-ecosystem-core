/**
 * Event Service
 * 
 * Publishes events to the Q ecosystem event bus following the standard
 * topic naming convention: q.qlock.<action>.<version>
 */

export class EventService {
  constructor(options = {}) {
    this.mode = options.mode || 'standalone';
    this.eventBus = options.eventBus;
    this.events = []; // In-memory storage for standalone mode
  }

  async initialize() {
    console.log('[EventService] Initializing...');
    
    if (this.mode === 'integrated' && !this.eventBus) {
      throw new Error('Event bus is required for integrated mode');
    }
    
    console.log(`[EventService] Initialized in ${this.mode} mode`);
  }

  /**
   * Publish lock acquired event
   */
  async publishLockAcquired(lockData) {
    const event = {
      topic: 'q.qlock.lock.acquired.v1',
      timestamp: new Date().toISOString(),
      payload: {
        lockId: lockData.lockId,
        owner: lockData.owner,
        resource: lockData.metadata?.resource || lockData.lockId,
        ttl: lockData.ttl,
        acquiredAt: lockData.acquiredAt,
        expiresAt: lockData.expiresAt,
        metadata: lockData.metadata
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish lock released event
   */
  async publishLockReleased(releaseData) {
    const event = {
      topic: 'q.qlock.lock.released.v1',
      timestamp: new Date().toISOString(),
      payload: {
        lockId: releaseData.lockId,
        owner: releaseData.owner,
        resource: releaseData.resource || releaseData.lockId,
        releasedAt: releaseData.releasedAt,
        duration: releaseData.duration,
        reason: releaseData.reason
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish lock extended event
   */
  async publishLockExtended(extensionData) {
    const event = {
      topic: 'q.qlock.lock.extended.v1',
      timestamp: new Date().toISOString(),
      payload: {
        lockId: extensionData.lockId,
        owner: extensionData.owner,
        previousExpiry: extensionData.previousExpiry,
        newExpiry: extensionData.newExpiry,
        extension: extensionData.extension,
        extendedAt: extensionData.extendedAt
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish lock failed event
   */
  async publishLockFailed(failureData) {
    const event = {
      topic: 'q.qlock.lock.failed.v1',
      timestamp: new Date().toISOString(),
      payload: {
        lockId: failureData.lockId,
        requestor: failureData.requestor,
        reason: failureData.reason,
        currentOwner: failureData.currentOwner,
        failedAt: failureData.failedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish encryption event
   */
  async publishEncrypted(encryptionData) {
    const event = {
      topic: 'q.qlock.encrypted.v1',
      timestamp: new Date().toISOString(),
      payload: {
        keyId: encryptionData.keyId,
        algorithm: encryptionData.algorithm,
        identityId: encryptionData.identityId,
        dataSize: encryptionData.dataSize,
        quantumResistant: encryptionData.quantumResistant,
        encryptedAt: encryptionData.encryptedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish decryption event
   */
  async publishDecrypted(decryptionData) {
    const event = {
      topic: 'q.qlock.decrypted.v1',
      timestamp: new Date().toISOString(),
      payload: {
        keyId: decryptionData.keyId,
        algorithm: decryptionData.algorithm,
        identityId: decryptionData.identityId,
        success: decryptionData.success,
        decryptedAt: decryptionData.decryptedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish signature event
   */
  async publishSigned(signatureData) {
    const event = {
      topic: 'q.qlock.signed.v1',
      timestamp: new Date().toISOString(),
      payload: {
        keyId: signatureData.keyId,
        algorithm: signatureData.algorithm,
        identityId: signatureData.identityId,
        dataHash: signatureData.dataHash,
        quantumResistant: signatureData.quantumResistant,
        signedAt: signatureData.signedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish signature verification event
   */
  async publishVerified(verificationData) {
    const event = {
      topic: 'q.qlock.verified.v1',
      timestamp: new Date().toISOString(),
      payload: {
        algorithm: verificationData.algorithm,
        valid: verificationData.valid,
        publicKey: verificationData.publicKey,
        dataHash: verificationData.dataHash,
        verifiedAt: verificationData.verifiedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish key rotation event
   */
  async publishKeyRotated(rotationData) {
    const event = {
      topic: 'q.qlock.key.rotated.v1',
      timestamp: new Date().toISOString(),
      payload: {
        keyId: rotationData.keyId,
        algorithm: rotationData.algorithm,
        identityId: rotationData.identityId,
        previousKeyId: rotationData.previousKeyId,
        rotatedAt: rotationData.rotatedAt || new Date().toISOString(),
        reason: rotationData.reason || 'scheduled'
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish key generation event
   */
  async publishKeyGenerated(keyData) {
    const event = {
      topic: 'q.qlock.key.generated.v1',
      timestamp: new Date().toISOString(),
      payload: {
        keyId: keyData.keyId,
        algorithm: keyData.algorithm,
        keySize: keyData.keySize,
        quantumResistant: keyData.quantumResistant,
        identityId: keyData.identityId,
        generatedAt: keyData.generatedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Publish security alert event
   */
  async publishSecurityAlert(alertData) {
    const event = {
      topic: 'q.qlock.security.alert.v1',
      timestamp: new Date().toISOString(),
      payload: {
        alertType: alertData.alertType,
        severity: alertData.severity,
        identityId: alertData.identityId,
        resource: alertData.resource,
        details: alertData.details,
        detectedAt: alertData.detectedAt || new Date().toISOString()
      }
    };

    await this.publishEvent(event);
  }

  /**
   * Generic event publishing
   */
  async publishEvent(event) {
    try {
      if (this.mode === 'standalone') {
        // Store in memory for standalone mode
        this.events.push(event);
        console.log(`[EventService] Published event: ${event.topic}`);
        
        // Keep only last 1000 events to prevent memory issues
        if (this.events.length > 1000) {
          this.events = this.events.slice(-1000);
        }
      } else {
        // Publish to actual event bus in integrated mode
        await this.eventBus.publish(event.topic, event.payload);
        console.log(`[EventService] Published event to bus: ${event.topic}`);
      }
    } catch (error) {
      console.error('[EventService] Failed to publish event:', error);
      // Don't throw - event publishing should not break main operations
    }
  }

  /**
   * Get recent events (for debugging/monitoring)
   */
  getRecentEvents(limit = 100) {
    return this.events.slice(-limit);
  }

  /**
   * Get events by topic
   */
  getEventsByTopic(topic, limit = 100) {
    return this.events
      .filter(event => event.topic === topic)
      .slice(-limit);
  }

  /**
   * Get event statistics
   */
  getEventStatistics() {
    const stats = {
      totalEvents: this.events.length,
      byTopic: {},
      recentActivity: {}
    };

    // Count by topic
    this.events.forEach(event => {
      stats.byTopic[event.topic] = (stats.byTopic[event.topic] || 0) + 1;
    });

    // Recent activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => 
      new Date(event.timestamp) > oneHourAgo
    );

    recentEvents.forEach(event => {
      stats.recentActivity[event.topic] = (stats.recentActivity[event.topic] || 0) + 1;
    });

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getEventStatistics();
    
    return {
      status: 'healthy',
      mode: this.mode,
      eventBusConnected: this.mode === 'integrated' ? !!this.eventBus : true,
      statistics: stats
    };
  }
}