/**
 * Qerberos Service - Monitoring and Audit System
 * 
 * Provides monitoring, logging, and anomaly detection for the AnarQ&Q ecosystem.
 * Detects spam, loops, suspicious behavior, and maintains audit trails.
 */

import crypto from 'crypto';

export class QerberosService {
  constructor() {
    this.eventLog = [];
    this.anomalyDetectors = new Map();
    this.userBehaviorProfiles = new Map();
    this.alertThresholds = {
      uploadRate: 10, // uploads per minute
      downloadRate: 100, // downloads per minute
      suspiciousPatterns: 5, // pattern matches per hour
      fileSize: 100 * 1024 * 1024, // 100MB
      duplicateContent: 3 // duplicate uploads per day
    };
    this.initializeDetectors();
  }

  /**
   * Log event for monitoring and audit
   * @param {Object} eventData - Event data to log
   * @returns {Promise<Object>} Log result with anomaly detection
   */
  async logEvent(eventData) {
    try {
      const {
        action,
        squidId,
        resourceId,
        contentType,
        fileSize,
        ipAddress,
        userAgent,
        metadata = {},
        // Enhanced wallet-specific fields
        identityType,
        walletAddress,
        transactionAmount,
        transactionToken,
        riskScore,
        sessionId,
        deviceFingerprint,
        operationType
      } = eventData;

      // Create comprehensive event record
      const event = {
        eventId: this.generateEventId(),
        action,
        squidId,
        resourceId,
        contentType,
        fileSize,
        ipAddress,
        userAgent,
        metadata,
        timestamp: new Date().toISOString(),
        severity: this.calculateSeverity(action),
        // Enhanced wallet-specific fields
        identityType,
        walletAddress,
        transactionAmount,
        transactionToken,
        riskScore: riskScore || 0,
        sessionId,
        deviceFingerprint,
        operationType,
        ecosystem: {
          module: operationType === 'WALLET' ? 'qwallet' : 'qsocial',
          version: '1.0',
          network: 'anarq'
        }
      };

      // Store event
      this.eventLog.push(event);

      // Update user behavior profile
      await this.updateUserProfile(squidId, event);

      // Run anomaly detection
      const anomalies = await this.detectAnomalies(event);

      // Generate alerts if anomalies detected
      if (anomalies.length > 0) {
        await this.generateAlerts(event, anomalies);
      }

      // Cleanup old events (keep last 10000)
      if (this.eventLog.length > 10000) {
        this.eventLog = this.eventLog.slice(-10000);
      }

      console.log(`[Qerberos] Logged event: ${action} by ${squidId}${anomalies.length > 0 ? ` (${anomalies.length} anomalies detected)` : ''}`);

      return {
        eventId: event.eventId,
        logged: true,
        anomalies,
        severity: event.severity
      };

    } catch (error) {
      console.error('[Qerberos] Event logging error:', error);
      throw new Error(`Event logging failed: ${error.message}`);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `qerberos_${timestamp}_${random}`;
  }

  /**
   * Calculate event severity
   */
  calculateSeverity(action) {
    const severityMap = {
      'file_upload': 'low',
      'file_download': 'low',
      'file_delete': 'medium',
      'file_share': 'low',
      'user_login': 'low',
      'user_logout': 'low',
      'permission_denied': 'medium',
      'authentication_failed': 'high',
      'suspicious_activity': 'high',
      'system_error': 'high'
    };

    return severityMap[action] || 'medium';
  }

  /**
   * Update user behavior profile
   */
  async updateUserProfile(squidId, event) {
    if (!this.userBehaviorProfiles.has(squidId)) {
      this.userBehaviorProfiles.set(squidId, {
        squidId,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        eventCounts: {},
        patterns: {
          uploadTimes: [],
          fileSizes: [],
          contentTypes: new Set(),
          ipAddresses: new Set(),
          userAgents: new Set()
        },
        riskScore: 0,
        flags: []
      });
    }

    const profile = this.userBehaviorProfiles.get(squidId);
    
    // Update basic info
    profile.lastSeen = event.timestamp;
    profile.eventCounts[event.action] = (profile.eventCounts[event.action] || 0) + 1;

    // Update patterns
    if (event.action === 'file_upload') {
      profile.patterns.uploadTimes.push(new Date(event.timestamp).getHours());
      if (event.fileSize) profile.patterns.fileSizes.push(event.fileSize);
      if (event.contentType) profile.patterns.contentTypes.add(event.contentType);
    }

    if (event.ipAddress) profile.patterns.ipAddresses.add(event.ipAddress);
    if (event.userAgent) profile.patterns.userAgents.add(event.userAgent);

    // Keep patterns arrays manageable
    if (profile.patterns.uploadTimes.length > 100) {
      profile.patterns.uploadTimes = profile.patterns.uploadTimes.slice(-100);
    }
    if (profile.patterns.fileSizes.length > 100) {
      profile.patterns.fileSizes = profile.patterns.fileSizes.slice(-100);
    }

    // Calculate risk score
    profile.riskScore = this.calculateRiskScore(profile);
  }

  /**
   * Calculate user risk score
   */
  calculateRiskScore(profile) {
    let score = 0;

    // High upload frequency
    const uploadCount = profile.eventCounts['file_upload'] || 0;
    const accountAge = (new Date() - new Date(profile.firstSeen)) / (1000 * 60 * 60 * 24); // days
    const uploadsPerDay = uploadCount / Math.max(accountAge, 1);
    
    if (uploadsPerDay > 50) score += 30;
    else if (uploadsPerDay > 20) score += 15;
    else if (uploadsPerDay > 10) score += 5;

    // Multiple IP addresses
    const ipCount = profile.patterns.ipAddresses.size;
    if (ipCount > 10) score += 20;
    else if (ipCount > 5) score += 10;

    // Multiple user agents
    const uaCount = profile.patterns.userAgents.size;
    if (uaCount > 5) score += 15;
    else if (uaCount > 3) score += 5;

    // Unusual upload times (3-6 AM)
    const nightUploads = profile.patterns.uploadTimes.filter(hour => hour >= 3 && hour <= 6).length;
    const totalUploads = profile.patterns.uploadTimes.length;
    if (totalUploads > 0 && (nightUploads / totalUploads) > 0.5) score += 10;

    // Large file sizes
    const avgFileSize = profile.patterns.fileSizes.length > 0 
      ? profile.patterns.fileSizes.reduce((a, b) => a + b, 0) / profile.patterns.fileSizes.length 
      : 0;
    if (avgFileSize > 50 * 1024 * 1024) score += 10; // 50MB average

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Initialize anomaly detectors
   */
  initializeDetectors() {
    // Rate limiting detector
    this.anomalyDetectors.set('rate_limit', {
      name: 'Rate Limiting',
      check: (event) => this.checkRateLimit(event),
      enabled: true
    });

    // Duplicate content detector
    this.anomalyDetectors.set('duplicate_content', {
      name: 'Duplicate Content',
      check: (event) => this.checkDuplicateContent(event),
      enabled: true
    });

    // Suspicious file size detector
    this.anomalyDetectors.set('suspicious_file_size', {
      name: 'Suspicious File Size',
      check: (event) => this.checkSuspiciousFileSize(event),
      enabled: true
    });

    // Pattern anomaly detector
    this.anomalyDetectors.set('pattern_anomaly', {
      name: 'Pattern Anomaly',
      check: (event) => this.checkPatternAnomaly(event),
      enabled: true
    });

    // Geographic anomaly detector
    this.anomalyDetectors.set('geographic_anomaly', {
      name: 'Geographic Anomaly',
      check: (event) => this.checkGeographicAnomaly(event),
      enabled: true
    });

    // Wallet-specific anomaly detectors
    this.anomalyDetectors.set('wallet_transaction_velocity', {
      name: 'Wallet Transaction Velocity',
      check: (event) => this.checkWalletTransactionVelocity(event),
      enabled: true
    });

    this.anomalyDetectors.set('wallet_large_transaction', {
      name: 'Large Wallet Transaction',
      check: (event) => this.checkLargeWalletTransaction(event),
      enabled: true
    });

    this.anomalyDetectors.set('wallet_identity_switching', {
      name: 'Rapid Identity Switching',
      check: (event) => this.checkRapidIdentitySwitching(event),
      enabled: true
    });

    this.anomalyDetectors.set('wallet_risk_escalation', {
      name: 'Wallet Risk Escalation',
      check: (event) => this.checkWalletRiskEscalation(event),
      enabled: true
    });
  }

  /**
   * Detect anomalies in event
   */
  async detectAnomalies(event) {
    const anomalies = [];

    for (const [detectorId, detector] of this.anomalyDetectors.entries()) {
      if (!detector.enabled) continue;

      try {
        const result = await detector.check(event);
        if (result.anomaly) {
          anomalies.push({
            detector: detectorId,
            name: detector.name,
            severity: result.severity || 'medium',
            description: result.description,
            confidence: result.confidence || 0.5,
            metadata: result.metadata || {}
          });
        }
      } catch (error) {
        console.error(`[Qerberos] Detector ${detectorId} error:`, error);
      }
    }

    return anomalies;
  }

  /**
   * Check rate limiting anomalies
   */
  checkRateLimit(event) {
    const { squidId, action } = event;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Count recent events by this user
    const recentEvents = this.eventLog.filter(e => 
      e.squidId === squidId && 
      e.action === action &&
      new Date(e.timestamp) > oneMinuteAgo
    );

    const threshold = action === 'file_upload' 
      ? this.alertThresholds.uploadRate 
      : this.alertThresholds.downloadRate;

    if (recentEvents.length > threshold) {
      return {
        anomaly: true,
        severity: 'high',
        description: `Rate limit exceeded: ${recentEvents.length} ${action} events in 1 minute`,
        confidence: 0.9,
        metadata: { count: recentEvents.length, threshold }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for duplicate content uploads
   */
  checkDuplicateContent(event) {
    if (event.action !== 'file_upload' || !event.resourceId) {
      return { anomaly: false };
    }

    const { squidId } = event;
    const today = new Date();
    const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Count uploads of same content by this user today
    const duplicateUploads = this.eventLog.filter(e => 
      e.squidId === squidId && 
      e.action === 'file_upload' &&
      e.resourceId === event.resourceId &&
      new Date(e.timestamp) > oneDayAgo
    );

    if (duplicateUploads.length > this.alertThresholds.duplicateContent) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Duplicate content uploaded ${duplicateUploads.length} times in 24 hours`,
        confidence: 0.8,
        metadata: { count: duplicateUploads.length, resourceId: event.resourceId }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for suspicious file sizes
   */
  checkSuspiciousFileSize(event) {
    if (!event.fileSize) return { anomaly: false };

    // Very large files
    if (event.fileSize > this.alertThresholds.fileSize) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Unusually large file: ${Math.round(event.fileSize / (1024 * 1024))}MB`,
        confidence: 0.6,
        metadata: { fileSize: event.fileSize }
      };
    }

    // Very small files with suspicious extensions
    if (event.fileSize < 100 && event.contentType && 
        (event.contentType.includes('executable') || event.contentType.includes('script'))) {
      return {
        anomaly: true,
        severity: 'high',
        description: 'Small executable file detected',
        confidence: 0.9,
        metadata: { fileSize: event.fileSize, contentType: event.contentType }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for pattern anomalies
   */
  checkPatternAnomaly(event) {
    const profile = this.userBehaviorProfiles.get(event.squidId);
    if (!profile) return { anomaly: false };

    // High risk score
    if (profile.riskScore > 70) {
      return {
        anomaly: true,
        severity: 'high',
        description: `High risk user profile (score: ${profile.riskScore})`,
        confidence: 0.8,
        metadata: { riskScore: profile.riskScore }
      };
    }

    // Sudden behavior change
    const recentEvents = this.eventLog.filter(e => 
      e.squidId === event.squidId &&
      new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // last hour
    );

    if (recentEvents.length > 20) { // More than 20 events in an hour
      return {
        anomaly: true,
        severity: 'medium',
        description: 'Sudden increase in activity',
        confidence: 0.7,
        metadata: { recentEventCount: recentEvents.length }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for geographic anomalies (mock implementation)
   */
  checkGeographicAnomaly(event) {
    if (!event.ipAddress) return { anomaly: false };

    const profile = this.userBehaviorProfiles.get(event.squidId);
    if (!profile) return { anomaly: false };

    // Mock: detect if IP is from different country (simplified)
    const ipRegion = this.getIPRegion(event.ipAddress);
    const knownRegions = Array.from(profile.patterns.ipAddresses).map(ip => this.getIPRegion(ip));
    
    if (knownRegions.length > 0 && !knownRegions.includes(ipRegion)) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Access from new geographic region: ${ipRegion}`,
        confidence: 0.6,
        metadata: { newRegion: ipRegion, knownRegions }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check wallet transaction velocity anomalies
   */
  checkWalletTransactionVelocity(event) {
    if (event.operationType !== 'WALLET' || !event.transactionAmount) {
      return { anomaly: false };
    }

    const { squidId } = event;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count wallet transactions in the last hour
    const recentWalletTxs = this.eventLog.filter(e => 
      e.squidId === squidId && 
      e.operationType === 'WALLET' &&
      e.transactionAmount &&
      new Date(e.timestamp) > oneHourAgo
    );

    // Check transaction frequency
    if (recentWalletTxs.length > 20) {
      return {
        anomaly: true,
        severity: 'high',
        description: `High wallet transaction velocity: ${recentWalletTxs.length} transactions in 1 hour`,
        confidence: 0.9,
        metadata: { transactionCount: recentWalletTxs.length, timeWindow: '1 hour' }
      };
    }

    // Check transaction volume
    const totalVolume = recentWalletTxs.reduce((sum, tx) => sum + (tx.transactionAmount || 0), 0);
    if (totalVolume > 100000) { // $100k equivalent
      return {
        anomaly: true,
        severity: 'high',
        description: `High wallet transaction volume: $${totalVolume.toLocaleString()} in 1 hour`,
        confidence: 0.8,
        metadata: { totalVolume, transactionCount: recentWalletTxs.length }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for large wallet transactions
   */
  checkLargeWalletTransaction(event) {
    if (event.operationType !== 'WALLET' || !event.transactionAmount) {
      return { anomaly: false };
    }

    const amount = event.transactionAmount;
    const identityType = event.identityType;

    // Define thresholds based on identity type
    const thresholds = {
      'ROOT': 50000,
      'DAO': 25000,
      'ENTERPRISE': 10000,
      'CONSENTIDA': 1000,
      'AID': 100
    };

    const threshold = thresholds[identityType] || 5000;

    if (amount > threshold) {
      const severity = amount > threshold * 5 ? 'critical' : amount > threshold * 2 ? 'high' : 'medium';
      
      return {
        anomaly: true,
        severity,
        description: `Large transaction for ${identityType} identity: $${amount.toLocaleString()} (threshold: $${threshold.toLocaleString()})`,
        confidence: 0.9,
        metadata: { 
          amount, 
          threshold, 
          identityType,
          exceedsBy: ((amount / threshold) * 100 - 100).toFixed(1) + '%'
        }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for rapid identity switching patterns
   */
  checkRapidIdentitySwitching(event) {
    if (event.operationType !== 'WALLET') {
      return { anomaly: false };
    }

    const { squidId, sessionId } = event;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find recent wallet events by the same user
    const recentEvents = this.eventLog.filter(e => 
      e.squidId === squidId && 
      e.operationType === 'WALLET' &&
      new Date(e.timestamp) > oneHourAgo
    );

    // Count unique identity types used
    const identityTypes = new Set(recentEvents.map(e => e.identityType).filter(Boolean));
    
    if (identityTypes.size > 3) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Rapid identity switching: ${identityTypes.size} different identity types used in 1 hour`,
        confidence: 0.7,
        metadata: { 
          identityTypes: Array.from(identityTypes), 
          eventCount: recentEvents.length,
          timeWindow: '1 hour'
        }
      };
    }

    // Check for session switching
    const sessions = new Set(recentEvents.map(e => e.sessionId).filter(Boolean));
    if (sessions.size > 5) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Multiple wallet sessions: ${sessions.size} different sessions in 1 hour`,
        confidence: 0.6,
        metadata: { sessionCount: sessions.size, eventCount: recentEvents.length }
      };
    }

    return { anomaly: false };
  }

  /**
   * Check for wallet risk escalation
   */
  checkWalletRiskEscalation(event) {
    if (event.operationType !== 'WALLET' || typeof event.riskScore !== 'number') {
      return { anomaly: false };
    }

    const { squidId, riskScore } = event;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find recent wallet events with risk scores
    const recentEvents = this.eventLog.filter(e => 
      e.squidId === squidId && 
      e.operationType === 'WALLET' &&
      typeof e.riskScore === 'number' &&
      new Date(e.timestamp) > oneDayAgo
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (recentEvents.length < 2) {
      return { anomaly: false };
    }

    // Calculate risk score trend
    const firstScore = recentEvents[0].riskScore;
    const currentScore = riskScore;
    const scoreIncrease = currentScore - firstScore;

    // Check for significant risk escalation
    if (scoreIncrease > 0.3 && currentScore > 0.7) {
      return {
        anomaly: true,
        severity: 'high',
        description: `Wallet risk escalation: risk score increased from ${firstScore.toFixed(2)} to ${currentScore.toFixed(2)} in 24 hours`,
        confidence: 0.8,
        metadata: { 
          firstScore, 
          currentScore, 
          scoreIncrease: scoreIncrease.toFixed(2),
          timeWindow: '24 hours'
        }
      };
    }

    // Check for consistently high risk
    const avgRiskScore = recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length;
    if (avgRiskScore > 0.8 && recentEvents.length > 5) {
      return {
        anomaly: true,
        severity: 'medium',
        description: `Consistently high wallet risk: average score ${avgRiskScore.toFixed(2)} over ${recentEvents.length} transactions`,
        confidence: 0.7,
        metadata: { avgRiskScore: avgRiskScore.toFixed(2), transactionCount: recentEvents.length }
      };
    }

    return { anomaly: false };
  }

  /**
   * Mock function to get IP region
   */
  getIPRegion(ipAddress) {
    // Mock implementation - in production would use GeoIP service
    const hash = crypto.createHash('md5').update(ipAddress).digest('hex');
    const regions = ['US', 'EU', 'AS', 'SA', 'AF', 'OC'];
    return regions[parseInt(hash.substring(0, 2), 16) % regions.length];
  }

  /**
   * Generate alerts for detected anomalies
   */
  async generateAlerts(event, anomalies) {
    for (const anomaly of anomalies) {
      const alert = {
        alertId: crypto.randomUUID(),
        eventId: event.eventId,
        squidId: event.squidId,
        detector: anomaly.detector,
        severity: anomaly.severity,
        description: anomaly.description,
        confidence: anomaly.confidence,
        metadata: {
          ...anomaly.metadata,
          originalEvent: {
            action: event.action,
            resourceId: event.resourceId,
            timestamp: event.timestamp
          }
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        resolvedAt: null
      };

      // In production, this would send to alerting system
      console.warn(`[Qerberos] ALERT: ${alert.description} (${alert.severity}) - User: ${event.squidId}`);
      
      // Store alert (in production, would go to persistent storage)
      if (!this.alerts) this.alerts = [];
      this.alerts.push(alert);
    }
  }

  /**
   * Get events by user
   */
  async getUserEvents(squidId, limit = 100, offset = 0) {
    const userEvents = this.eventLog
      .filter(event => event.squidId === squidId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);

    return {
      events: userEvents,
      total: this.eventLog.filter(e => e.squidId === squidId).length,
      limit,
      offset
    };
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.eventLog.filter(e => new Date(e.timestamp) > oneHourAgo);
    const dailyEvents = this.eventLog.filter(e => new Date(e.timestamp) > oneDayAgo);

    const stats = {
      totalEvents: this.eventLog.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      uniqueUsers: new Set(this.eventLog.map(e => e.squidId)).size,
      activeUsers: new Set(recentEvents.map(e => e.squidId)).size,
      eventsByAction: {},
      eventsBySeverity: {},
      averageRiskScore: 0,
      highRiskUsers: 0
    };

    // Count events by action and severity
    this.eventLog.forEach(event => {
      stats.eventsByAction[event.action] = (stats.eventsByAction[event.action] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
    });

    // Calculate risk statistics
    const profiles = Array.from(this.userBehaviorProfiles.values());
    if (profiles.length > 0) {
      stats.averageRiskScore = profiles.reduce((sum, p) => sum + p.riskScore, 0) / profiles.length;
      stats.highRiskUsers = profiles.filter(p => p.riskScore > 70).length;
    }

    return stats;
  }

  /**
   * Log module registration event for audit trail
   * @param {Object} registrationData - Module registration event data
   * @returns {Promise<Object>} Log result with audit trail ID
   */
  async logModuleRegistration(registrationData) {
    try {
      const {
        action,
        moduleId,
        signerIdentity,
        success,
        error,
        details = {},
        // Module-specific fields
        moduleVersion,
        moduleStatus,
        testMode,
        complianceInfo,
        auditHash,
        signatureInfo,
        dependencyInfo,
        registrationTimestamp
      } = registrationData;

      // Create comprehensive module registration event
      const event = {
        eventId: this.generateEventId(),
        eventType: 'MODULE_REGISTRATION',
        action,
        moduleId,
        signerIdentity,
        success,
        error,
        timestamp: registrationTimestamp || new Date().toISOString(),
        severity: this.calculateModuleEventSeverity(action, success),
        
        // Module-specific audit fields
        moduleMetadata: {
          version: moduleVersion,
          status: moduleStatus,
          testMode: testMode || false,
          auditHash,
          complianceInfo: complianceInfo || {},
          signatureInfo: signatureInfo || {}
        },
        
        // Registration context
        registrationContext: {
          ecosystem: 'anarq',
          registrationService: 'qwallet-module-registration',
          serviceVersion: '1.0.0',
          dependencyInfo: dependencyInfo || {},
          ...details
        },
        
        // Compliance tracking
        complianceTracking: {
          auditRequired: complianceInfo?.audit || false,
          privacyEnforced: complianceInfo?.privacy_enforced || false,
          kycSupport: complianceInfo?.kyc_support || false,
          gdprCompliant: complianceInfo?.gdpr_compliant || false,
          riskScoring: complianceInfo?.risk_scoring || false
        },
        
        // Security context
        securityContext: {
          signatureAlgorithm: signatureInfo?.algorithm,
          publicKeyId: signatureInfo?.publicKeyId,
          signatureValid: signatureInfo?.valid,
          identityType: signatureInfo?.identityType,
          authorizationLevel: this.getAuthorizationLevel(signerIdentity)
        }
      };

      // Store event in audit log
      this.eventLog.push(event);
      
      // Create module-specific audit trail entry
      await this.createModuleAuditTrail(event);
      
      // Check for compliance violations
      const complianceIssues = await this.checkModuleCompliance(event);
      
      // Generate alerts for critical events or compliance issues
      if (this.isCriticalModuleEvent(event) || complianceIssues.length > 0) {
        await this.generateModuleAlerts(event, complianceIssues);
      }
      
      // Update module registration statistics
      await this.updateModuleRegistrationStats(event);

      console.log(`[Qerberos] Module registration event logged: ${action} for ${moduleId} by ${signerIdentity}${complianceIssues.length > 0 ? ` (${complianceIssues.length} compliance issues)` : ''}`);

      return {
        auditTrailId: event.eventId,
        logged: true,
        complianceIssues,
        severity: event.severity,
        timestamp: event.timestamp
      };

    } catch (error) {
      console.error('[Qerberos] Module registration logging error:', error);
      throw new Error(`Module registration audit logging failed: ${error.message}`);
    }
  }

  /**
   * Calculate severity for module registration events
   */
  calculateModuleEventSeverity(action, success) {
    if (!success) {
      return 'high'; // All failures are high severity
    }

    const severityMap = {
      'REGISTERED': 'medium',
      'UPDATED': 'medium', 
      'DEREGISTERED': 'high',
      'VERIFIED': 'low',
      'PROMOTED': 'medium',
      'SANDBOX_REGISTERED': 'low',
      'COMPLIANCE_CHECK': 'medium',
      'SIGNATURE_VERIFIED': 'low',
      'DEPENDENCY_RESOLVED': 'low'
    };

    return severityMap[action] || 'medium';
  }

  /**
   * Get authorization level for identity
   */
  getAuthorizationLevel(identityDid) {
    // Extract identity type from DID (simplified)
    if (identityDid.includes('root')) return 'ROOT';
    if (identityDid.includes('dao')) return 'DAO';
    if (identityDid.includes('enterprise')) return 'ENTERPRISE';
    return 'STANDARD';
  }

  /**
   * Create module-specific audit trail entry
   */
  async createModuleAuditTrail(event) {
    if (!this.moduleAuditTrails) {
      this.moduleAuditTrails = new Map();
    }

    const moduleId = event.moduleId;
    if (!this.moduleAuditTrails.has(moduleId)) {
      this.moduleAuditTrails.set(moduleId, []);
    }

    const auditEntry = {
      auditId: crypto.randomUUID(),
      eventId: event.eventId,
      moduleId,
      action: event.action,
      timestamp: event.timestamp,
      signerIdentity: event.signerIdentity,
      success: event.success,
      moduleVersion: event.moduleMetadata?.version,
      moduleStatus: event.moduleMetadata?.status,
      testMode: event.moduleMetadata?.testMode,
      complianceSnapshot: { ...event.complianceTracking },
      securitySnapshot: { ...event.securityContext },
      changeDetails: event.registrationContext,
      auditHash: event.moduleMetadata?.auditHash,
      previousState: await this.getPreviousModuleState(moduleId),
      regulatoryFlags: this.generateRegulatoryFlags(event)
    };

    const trail = this.moduleAuditTrails.get(moduleId);
    trail.push(auditEntry);

    // Keep audit trail manageable (last 1000 entries per module)
    if (trail.length > 1000) {
      trail.splice(0, trail.length - 1000);
    }

    return auditEntry.auditId;
  }

  /**
   * Check module compliance against regulatory requirements
   */
  async checkModuleCompliance(event) {
    const issues = [];
    const compliance = event.complianceTracking;
    const moduleStatus = event.moduleMetadata?.status;

    // Production modules must have audit
    if (moduleStatus === 'PRODUCTION_READY' && !compliance.auditRequired) {
      issues.push({
        type: 'AUDIT_REQUIRED',
        severity: 'high',
        message: 'Production modules must have completed security audit',
        regulation: 'INTERNAL_SECURITY_POLICY'
      });
    }

    // GDPR compliance check for EU operations
    if (!compliance.gdprCompliant && this.requiresGDPRCompliance(event)) {
      issues.push({
        type: 'GDPR_NON_COMPLIANT',
        severity: 'high',
        message: 'Module must be GDPR compliant for EU operations',
        regulation: 'GDPR'
      });
    }

    // KYC requirements for financial modules
    if (this.isFinancialModule(event.moduleId) && !compliance.kycSupport) {
      issues.push({
        type: 'KYC_REQUIRED',
        severity: 'medium',
        message: 'Financial modules should support KYC requirements',
        regulation: 'FINANCIAL_REGULATIONS'
      });
    }

    // Privacy enforcement check
    if (!compliance.privacyEnforced && this.handlesPersonalData(event)) {
      issues.push({
        type: 'PRIVACY_NOT_ENFORCED',
        severity: 'medium',
        message: 'Modules handling personal data must enforce privacy controls',
        regulation: 'PRIVACY_POLICY'
      });
    }

    // Risk scoring requirement for high-risk modules
    if (this.isHighRiskModule(event.moduleId) && !compliance.riskScoring) {
      issues.push({
        type: 'RISK_SCORING_REQUIRED',
        severity: 'medium',
        message: 'High-risk modules must implement risk scoring',
        regulation: 'RISK_MANAGEMENT_POLICY'
      });
    }

    return issues;
  }

  /**
   * Generate regulatory flags for audit entry
   */
  generateRegulatoryFlags(event) {
    const flags = [];
    
    if (this.isFinancialModule(event.moduleId)) {
      flags.push('FINANCIAL_SERVICE');
    }
    
    if (this.handlesPersonalData(event)) {
      flags.push('PERSONAL_DATA_PROCESSING');
    }
    
    if (event.moduleMetadata?.testMode) {
      flags.push('SANDBOX_OPERATION');
    }
    
    if (event.complianceTracking?.gdprCompliant) {
      flags.push('GDPR_COMPLIANT');
    }
    
    if (event.complianceTracking?.auditRequired) {
      flags.push('SECURITY_AUDITED');
    }

    return flags;
  }

  /**
   * Check if module event is critical and requires immediate attention
   */
  isCriticalModuleEvent(event) {
    const criticalActions = ['DEREGISTERED', 'SUSPENDED', 'SECURITY_VIOLATION'];
    const criticalFailures = ['SIGNATURE_VERIFICATION_FAILED', 'COMPLIANCE_VIOLATION'];
    
    return criticalActions.includes(event.action) || 
           (!event.success && criticalFailures.some(failure => event.error?.includes(failure)));
  }

  /**
   * Generate alerts for module registration events
   */
  async generateModuleAlerts(event, complianceIssues = []) {
    const alerts = [];

    // Critical event alert
    if (this.isCriticalModuleEvent(event)) {
      alerts.push({
        alertId: crypto.randomUUID(),
        type: 'CRITICAL_MODULE_EVENT',
        moduleId: event.moduleId,
        severity: 'critical',
        message: `Critical module event: ${event.action} for ${event.moduleId}`,
        details: event,
        timestamp: new Date().toISOString()
      });
    }

    // Compliance violation alerts
    for (const issue of complianceIssues) {
      alerts.push({
        alertId: crypto.randomUUID(),
        type: 'COMPLIANCE_VIOLATION',
        moduleId: event.moduleId,
        severity: issue.severity,
        message: `Compliance issue: ${issue.message}`,
        regulation: issue.regulation,
        details: { event, issue },
        timestamp: new Date().toISOString()
      });
    }

    // Store alerts
    if (!this.moduleAlerts) this.moduleAlerts = [];
    this.moduleAlerts.push(...alerts);

    // Log alerts
    for (const alert of alerts) {
      console.warn(`[Qerberos] MODULE ALERT: ${alert.message} (${alert.severity})`);
    }

    return alerts;
  }

  /**
   * Update module registration statistics
   */
  async updateModuleRegistrationStats(event) {
    if (!this.moduleStats) {
      this.moduleStats = {
        totalRegistrations: 0,
        successfulRegistrations: 0,
        failedRegistrations: 0,
        modulesByStatus: {},
        registrationsByAction: {},
        complianceStats: {
          auditedModules: 0,
          gdprCompliantModules: 0,
          kycSupportingModules: 0,
          privacyEnforcingModules: 0
        },
        lastUpdated: new Date().toISOString()
      };
    }

    const stats = this.moduleStats;

    // Update basic counters
    if (event.action === 'REGISTERED') {
      stats.totalRegistrations++;
      if (event.success) {
        stats.successfulRegistrations++;
      } else {
        stats.failedRegistrations++;
      }
    }

    // Update status counters
    if (event.moduleMetadata?.status) {
      const status = event.moduleMetadata.status;
      stats.modulesByStatus[status] = (stats.modulesByStatus[status] || 0) + 1;
    }

    // Update action counters
    stats.registrationsByAction[event.action] = (stats.registrationsByAction[event.action] || 0) + 1;

    // Update compliance stats
    const compliance = event.complianceTracking;
    if (compliance?.auditRequired) stats.complianceStats.auditedModules++;
    if (compliance?.gdprCompliant) stats.complianceStats.gdprCompliantModules++;
    if (compliance?.kycSupport) stats.complianceStats.kycSupportingModules++;
    if (compliance?.privacyEnforced) stats.complianceStats.privacyEnforcingModules++;

    stats.lastUpdated = new Date().toISOString();
  }

  /**
   * Query module audit events with filtering and pagination
   */
  async queryModuleAuditEvents(criteria = {}) {
    try {
      const {
        moduleId,
        action,
        signerIdentity,
        startDate,
        endDate,
        success,
        testMode,
        complianceIssues,
        limit = 100,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = criteria;

      let events = this.eventLog.filter(event => event.eventType === 'MODULE_REGISTRATION');

      // Apply filters
      if (moduleId) {
        events = events.filter(e => e.moduleId === moduleId);
      }
      
      if (action) {
        events = events.filter(e => e.action === action);
      }
      
      if (signerIdentity) {
        events = events.filter(e => e.signerIdentity === signerIdentity);
      }
      
      if (startDate) {
        events = events.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      
      if (endDate) {
        events = events.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }
      
      if (typeof success === 'boolean') {
        events = events.filter(e => e.success === success);
      }
      
      if (typeof testMode === 'boolean') {
        events = events.filter(e => e.moduleMetadata?.testMode === testMode);
      }
      
      if (complianceIssues) {
        events = events.filter(e => this.hasComplianceIssues(e));
      }

      // Sort events
      events.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const totalCount = events.length;
      const paginatedEvents = events.slice(offset, offset + limit);

      return {
        events: paginatedEvents,
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      console.error('[Qerberos] Error querying module audit events:', error);
      throw new Error(`Module audit query failed: ${error.message}`);
    }
  }

  /**
   * Export module audit data for compliance reporting
   */
  async exportModuleAuditData(exportOptions = {}) {
    try {
      const {
        format = 'json',
        moduleId,
        startDate,
        endDate,
        includeComplianceData = true,
        includeSecurityData = true,
        includeStatistics = true
      } = exportOptions;

      // Query all relevant events
      const auditQuery = await this.queryModuleAuditEvents({
        moduleId,
        startDate,
        endDate,
        limit: 10000 // Large limit for export
      });

      const exportData = {
        exportMetadata: {
          exportId: crypto.randomUUID(),
          exportTimestamp: new Date().toISOString(),
          exportedBy: 'qerberos-audit-system',
          criteria: { moduleId, startDate, endDate },
          totalEvents: auditQuery.totalCount
        },
        auditEvents: auditQuery.events
      };

      // Include compliance data if requested
      if (includeComplianceData) {
        exportData.complianceReport = await this.generateComplianceReport(moduleId, startDate, endDate);
      }

      // Include security data if requested
      if (includeSecurityData) {
        exportData.securityReport = await this.generateSecurityReport(moduleId, startDate, endDate);
      }

      // Include statistics if requested
      if (includeStatistics) {
        exportData.statisticsReport = await this.generateStatisticsReport(moduleId, startDate, endDate);
      }

      // Format output
      if (format === 'csv') {
        return this.formatAuditDataAsCSV(exportData);
      } else if (format === 'xml') {
        return this.formatAuditDataAsXML(exportData);
      } else {
        return exportData; // JSON format
      }

    } catch (error) {
      console.error('[Qerberos] Error exporting module audit data:', error);
      throw new Error(`Module audit export failed: ${error.message}`);
    }
  }

  /**
   * Generate compliance report for regulatory requirements
   */
  async generateComplianceReport(moduleId, startDate, endDate) {
    const events = await this.queryModuleAuditEvents({ moduleId, startDate, endDate, limit: 10000 });
    
    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      moduleId,
      
      complianceSummary: {
        totalEvents: events.totalCount,
        complianceViolations: 0,
        auditedModules: 0,
        gdprCompliantModules: 0,
        kycSupportingModules: 0,
        privacyEnforcingModules: 0
      },
      
      violations: [],
      recommendations: [],
      regulatoryFlags: new Set()
    };

    // Analyze events for compliance
    for (const event of events.events) {
      const complianceIssues = await this.checkModuleCompliance(event);
      
      if (complianceIssues.length > 0) {
        report.complianceSummary.complianceViolations++;
        report.violations.push({
          eventId: event.eventId,
          moduleId: event.moduleId,
          timestamp: event.timestamp,
          issues: complianceIssues
        });
      }

      // Update compliance counters
      const compliance = event.complianceTracking;
      if (compliance?.auditRequired) report.complianceSummary.auditedModules++;
      if (compliance?.gdprCompliant) report.complianceSummary.gdprCompliantModules++;
      if (compliance?.kycSupport) report.complianceSummary.kycSupportingModules++;
      if (compliance?.privacyEnforced) report.complianceSummary.privacyEnforcingModules++;

      // Collect regulatory flags
      const flags = this.generateRegulatoryFlags(event);
      flags.forEach(flag => report.regulatoryFlags.add(flag));
    }

    // Convert Set to Array for JSON serialization
    report.regulatoryFlags = Array.from(report.regulatoryFlags);

    // Generate recommendations
    report.recommendations = this.generateComplianceRecommendations(report);

    return report;
  }

  /**
   * Generate security report for module registrations
   */
  async generateSecurityReport(moduleId, startDate, endDate) {
    const events = await this.queryModuleAuditEvents({ moduleId, startDate, endDate, limit: 10000 });
    
    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      moduleId,
      
      securitySummary: {
        totalEvents: events.totalCount,
        signatureFailures: 0,
        unauthorizedAttempts: 0,
        criticalEvents: 0,
        securityAlerts: 0
      },
      
      securityIncidents: [],
      signatureAnalysis: {
        algorithms: {},
        identityTypes: {},
        verificationResults: { valid: 0, invalid: 0 }
      },
      
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        mitigationRecommendations: []
      }
    };

    // Analyze events for security
    for (const event of events.events) {
      // Count security-related metrics
      if (!event.success && event.error?.includes('signature')) {
        report.securitySummary.signatureFailures++;
      }
      
      if (!event.success && event.error?.includes('unauthorized')) {
        report.securitySummary.unauthorizedAttempts++;
      }
      
      if (this.isCriticalModuleEvent(event)) {
        report.securitySummary.criticalEvents++;
      }

      // Analyze signature information
      const securityContext = event.securityContext;
      if (securityContext?.signatureAlgorithm) {
        const algo = securityContext.signatureAlgorithm;
        report.signatureAnalysis.algorithms[algo] = (report.signatureAnalysis.algorithms[algo] || 0) + 1;
      }
      
      if (securityContext?.identityType) {
        const idType = securityContext.identityType;
        report.signatureAnalysis.identityTypes[idType] = (report.signatureAnalysis.identityTypes[idType] || 0) + 1;
      }
      
      if (securityContext?.signatureValid === true) {
        report.signatureAnalysis.verificationResults.valid++;
      } else if (securityContext?.signatureValid === false) {
        report.signatureAnalysis.verificationResults.invalid++;
      }
    }

    // Calculate risk assessment
    report.riskAssessment = this.calculateSecurityRisk(report);

    return report;
  }

  /**
   * Generate statistics report for module registrations
   */
  async generateStatisticsReport(moduleId, startDate, endDate) {
    const events = await this.queryModuleAuditEvents({ moduleId, startDate, endDate, limit: 10000 });
    
    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      moduleId,
      
      overallStats: {
        totalEvents: events.totalCount,
        successRate: 0,
        averageEventsPerDay: 0,
        uniqueModules: new Set(),
        uniqueSigners: new Set()
      },
      
      actionBreakdown: {},
      statusBreakdown: {},
      timelineAnalysis: {},
      performanceMetrics: {
        averageProcessingTime: 0,
        peakActivity: null,
        quietPeriods: []
      }
    };

    // Analyze events for statistics
    let successfulEvents = 0;
    const dailyEvents = {};
    
    for (const event of events.events) {
      // Count successes
      if (event.success) successfulEvents++;
      
      // Track unique modules and signers
      report.overallStats.uniqueModules.add(event.moduleId);
      report.overallStats.uniqueSigners.add(event.signerIdentity);
      
      // Count actions
      report.actionBreakdown[event.action] = (report.actionBreakdown[event.action] || 0) + 1;
      
      // Count statuses
      if (event.moduleMetadata?.status) {
        const status = event.moduleMetadata.status;
        report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;
      }
      
      // Daily timeline
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      dailyEvents[date] = (dailyEvents[date] || 0) + 1;
    }

    // Calculate derived statistics
    report.overallStats.successRate = events.totalCount > 0 ? (successfulEvents / events.totalCount) * 100 : 0;
    report.overallStats.uniqueModules = report.overallStats.uniqueModules.size;
    report.overallStats.uniqueSigners = report.overallStats.uniqueSigners.size;
    
    const dayCount = Object.keys(dailyEvents).length;
    report.overallStats.averageEventsPerDay = dayCount > 0 ? events.totalCount / dayCount : 0;
    
    report.timelineAnalysis = dailyEvents;

    return report;
  }

  // Helper methods for compliance and security analysis

  requiresGDPRCompliance(event) {
    // Simplified check - in production would check user location, data types, etc.
    return event.registrationContext?.region === 'EU' || 
           event.complianceTracking?.gdprRequired === true;
  }

  isFinancialModule(moduleId) {
    const financialKeywords = ['wallet', 'payment', 'transaction', 'finance', 'money', 'token'];
    return financialKeywords.some(keyword => moduleId.toLowerCase().includes(keyword));
  }

  handlesPersonalData(event) {
    return event.complianceTracking?.privacyEnforced === true ||
           event.registrationContext?.handlesPersonalData === true;
  }

  isHighRiskModule(moduleId) {
    const highRiskKeywords = ['admin', 'root', 'system', 'security', 'auth'];
    return highRiskKeywords.some(keyword => moduleId.toLowerCase().includes(keyword));
  }

  hasComplianceIssues(event) {
    // This would be populated during event processing
    return event.complianceIssues && event.complianceIssues.length > 0;
  }

  async getPreviousModuleState(moduleId) {
    if (!this.moduleAuditTrails || !this.moduleAuditTrails.has(moduleId)) {
      return null;
    }
    
    const trail = this.moduleAuditTrails.get(moduleId);
    return trail.length > 0 ? trail[trail.length - 1] : null;
  }

  generateComplianceRecommendations(report) {
    const recommendations = [];
    
    if (report.complianceSummary.complianceViolations > 0) {
      recommendations.push({
        priority: 'high',
        category: 'compliance',
        message: 'Address compliance violations before production deployment',
        action: 'Review and fix compliance issues identified in violations section'
      });
    }
    
    if (report.complianceSummary.auditedModules === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'security',
        message: 'Consider security audit for production modules',
        action: 'Schedule security audit with approved auditing firm'
      });
    }
    
    return recommendations;
  }

  calculateSecurityRisk(securityReport) {
    let riskScore = 0;
    const riskFactors = [];
    
    if (securityReport.securitySummary.signatureFailures > 0) {
      riskScore += 30;
      riskFactors.push('Signature verification failures detected');
    }
    
    if (securityReport.securitySummary.unauthorizedAttempts > 0) {
      riskScore += 40;
      riskFactors.push('Unauthorized access attempts detected');
    }
    
    if (securityReport.securitySummary.criticalEvents > 0) {
      riskScore += 50;
      riskFactors.push('Critical security events occurred');
    }
    
    const overallRisk = riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
    
    return {
      overallRisk,
      riskScore,
      riskFactors,
      mitigationRecommendations: this.generateSecurityRecommendations(riskFactors)
    };
  }

  generateSecurityRecommendations(riskFactors) {
    const recommendations = [];
    
    if (riskFactors.some(f => f.includes('signature'))) {
      recommendations.push('Review signature verification process and key management');
    }
    
    if (riskFactors.some(f => f.includes('unauthorized'))) {
      recommendations.push('Strengthen access controls and identity verification');
    }
    
    if (riskFactors.some(f => f.includes('critical'))) {
      recommendations.push('Implement additional monitoring and alerting for critical events');
    }
    
    return recommendations;
  }

  formatAuditDataAsCSV(exportData) {
    // Simplified CSV formatting - in production would use proper CSV library
    const headers = ['EventID', 'Timestamp', 'ModuleID', 'Action', 'SignerIdentity', 'Success', 'ModuleVersion', 'TestMode'];
    const rows = [headers.join(',')];
    
    for (const event of exportData.auditEvents) {
      const row = [
        event.eventId,
        event.timestamp,
        event.moduleId,
        event.action,
        event.signerIdentity,
        event.success,
        event.moduleMetadata?.version || '',
        event.moduleMetadata?.testMode || false
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }

  formatAuditDataAsXML(exportData) {
    // Simplified XML formatting - in production would use proper XML library
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ModuleAuditExport>\n';
    xml += `  <ExportMetadata>\n`;
    xml += `    <ExportID>${exportData.exportMetadata.exportId}</ExportID>\n`;
    xml += `    <Timestamp>${exportData.exportMetadata.exportTimestamp}</Timestamp>\n`;
    xml += `    <TotalEvents>${exportData.exportMetadata.totalEvents}</TotalEvents>\n`;
    xml += `  </ExportMetadata>\n`;
    xml += `  <AuditEvents>\n`;
    
    for (const event of exportData.auditEvents) {
      xml += `    <Event>\n`;
      xml += `      <EventID>${event.eventId}</EventID>\n`;
      xml += `      <Timestamp>${event.timestamp}</Timestamp>\n`;
      xml += `      <ModuleID>${event.moduleId}</ModuleID>\n`;
      xml += `      <Action>${event.action}</Action>\n`;
      xml += `      <Success>${event.success}</Success>\n`;
      xml += `    </Event>\n`;
    }
    
    xml += `  </AuditEvents>\n`;
    xml += '</ModuleAuditExport>';
    
    return xml;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getSystemStats();
    
    return {
      status: 'healthy',
      monitoring: {
        totalEvents: stats.totalEvents,
        recentEvents: stats.recentEvents,
        activeDetectors: Array.from(this.anomalyDetectors.keys()).length,
        userProfiles: this.userBehaviorProfiles.size
      },
      alerts: {
        total: this.alerts ? this.alerts.length : 0,
        active: this.alerts ? this.alerts.filter(a => a.status === 'active').length : 0
      },
      moduleRegistration: {
        auditTrails: this.moduleAuditTrails ? this.moduleAuditTrails.size : 0,
        moduleAlerts: this.moduleAlerts ? this.moduleAlerts.length : 0,
        totalRegistrations: this.moduleStats ? this.moduleStats.totalRegistrations : 0,
        successfulRegistrations: this.moduleStats ? this.moduleStats.successfulRegistrations : 0
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qerberosServiceInstance = null;

export function getQerberosService() {
  if (!qerberosServiceInstance) {
    qerberosServiceInstance = new QerberosService();
  }
  return qerberosServiceInstance;
}

export default QerberosService;