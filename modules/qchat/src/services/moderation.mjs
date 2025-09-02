/**
 * Moderation Service
 * Handles moderation actions, appeals, and user status management
 */

import { v4 as uuidv4 } from 'uuid';
import { mockServices } from '../../security/middleware.mjs';

class ModerationService {
  constructor() {
    // In-memory storage for standalone mode
    this.moderationActions = new Map(); // actionId -> action
    this.appeals = new Map(); // appealId -> appeal
    this.userModerationStatus = new Map(); // squidId -> status
    this.roomModerationActions = new Map(); // roomId -> Set of actionIds
  }

  /**
   * Perform a moderation action
   */
  async performAction(actionData, moderator) {
    try {
      // Validate moderator permissions
      await this.validateModeratorPermissions(actionData.roomId, moderator, actionData.action);
      
      // Validate target
      await this.validateTarget(actionData.roomId, actionData.targetId, actionData.action);
      
      // Check if moderator is trying to moderate themselves
      if (actionData.targetId === moderator.squidId) {
        const error = new Error('Cannot moderate yourself');
        error.code = 'CANNOT_MODERATE_SELF';
        throw error;
      }
      
      // Check role hierarchy for user actions
      if (this.isUserAction(actionData.action)) {
        const canModerate = await this.checkRoleHierarchy(
          actionData.roomId, 
          moderator.squidId, 
          actionData.targetId
        );
        
        if (!canModerate) {
          const error = new Error('Cannot moderate users with higher or equal roles');
          error.code = 'CANNOT_MODERATE_HIGHER_ROLE';
          throw error;
        }
      }
      
      // Generate action ID
      const actionId = `qchat_mod_${uuidv4().replace(/-/g, '_')}`;
      
      // Calculate effective until time for temporary actions
      let effectiveUntil = null;
      if (actionData.duration && ['MUTE', 'BAN'].includes(actionData.action)) {
        effectiveUntil = new Date(Date.now() + actionData.duration * 1000).toISOString();
      }
      
      // Create moderation action
      const action = {
        actionId,
        roomId: actionData.roomId,
        moderatorId: actionData.moderatorId,
        targetId: actionData.targetId,
        targetType: this.getTargetType(actionData.action),
        action: actionData.action,
        reason: actionData.reason,
        severity: actionData.severity,
        duration: actionData.duration,
        timestamp: actionData.timestamp,
        effectiveUntil,
        automated: false,
        escalatedToQerberos: actionData.escalateToQerberos,
        appealable: this.isAppealable(actionData.action),
        appealDeadline: this.isAppealable(actionData.action) ? 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null, // 7 days
        auditCid: `Qm${Math.random().toString(36).substring(2, 46)}`,
        evidence: []
      };
      
      // Apply the action
      await this.applyModerationAction(action);
      
      // Calculate reputation impact
      const reputationImpact = await this.calculateReputationImpact(action);
      if (reputationImpact) {
        action.reputationImpact = reputationImpact;
      }
      
      // Store action
      this.moderationActions.set(actionId, action);
      
      // Add to room actions
      const roomActions = this.roomModerationActions.get(actionData.roomId) || new Set();
      roomActions.add(actionId);
      this.roomModerationActions.set(actionData.roomId, roomActions);
      
      // Store in IPFS
      await this.storeActionInIPFS(action);
      
      // Escalate to Qerberos if requested
      if (actionData.escalateToQerberos) {
        await this.escalateToQerberos(action);
      }
      
      // Notify user if requested
      if (actionData.notifyUser && this.isUserAction(actionData.action)) {
        await this.notifyUser(action);
      }
      
      // Publish moderation event
      await this.publishEvent('q.qchat.moderation.action.v1', {
        actionId,
        roomId: actionData.roomId,
        targetId: actionData.targetId,
        targetType: action.targetType,
        action: actionData.action,
        severity: actionData.severity,
        duration: actionData.duration,
        effectiveUntil,
        automated: false,
        escalatedToQerberos: actionData.escalateToQerberos,
        reputationImpact,
        appealable: action.appealable,
        appealDeadline: action.appealDeadline
      }, moderator);
      
      return {
        actionId,
        timestamp: action.timestamp,
        effectiveUntil,
        auditCid: action.auditCid,
        reputationImpact
      };
    } catch (error) {
      console.error('Moderation action error:', error);
      throw error;
    }
  }

  /**
   * Get moderation history for a room
   */
  async getModerationHistory(roomId, user, filters = {}) {
    try {
      // Validate moderator permissions
      await this.validateModeratorPermissions(roomId, user, 'VIEW_HISTORY');
      
      const roomActions = this.roomModerationActions.get(roomId) || new Set();
      let actions = Array.from(roomActions)
        .map(actionId => this.moderationActions.get(actionId))
        .filter(action => action);
      
      // Apply filters
      if (filters.action) {
        actions = actions.filter(action => action.action === filters.action);
      }
      
      if (filters.moderator) {
        actions = actions.filter(action => action.moderatorId === filters.moderator);
      }
      
      if (filters.target) {
        actions = actions.filter(action => action.targetId === filters.target);
      }
      
      if (filters.severity) {
        actions = actions.filter(action => action.severity === filters.severity);
      }
      
      if (filters.since) {
        actions = actions.filter(action => 
          new Date(action.timestamp) >= new Date(filters.since)
        );
      }
      
      if (filters.until) {
        actions = actions.filter(action => 
          new Date(action.timestamp) <= new Date(filters.until)
        );
      }
      
      // Sort by timestamp (newest first)
      actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply pagination
      const totalCount = actions.length;
      const paginatedActions = actions.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50));
      
      return {
        actions: paginatedActions,
        totalCount,
        hasMore: (filters.offset || 0) + (filters.limit || 50) < totalCount
      };
    } catch (error) {
      console.error('Get moderation history error:', error);
      throw error;
    }
  }

  /**
   * Get specific moderation action
   */
  async getModerationAction(actionId, user) {
    try {
      const action = this.moderationActions.get(actionId);
      if (!action) {
        return null;
      }
      
      // Validate access permissions
      await this.validateModeratorPermissions(action.roomId, user, 'VIEW_ACTION');
      
      return action;
    } catch (error) {
      console.error('Get moderation action error:', error);
      throw error;
    }
  }

  /**
   * Create an appeal for a moderation action
   */
  async createAppeal(appealData, user) {
    try {
      const action = this.moderationActions.get(appealData.actionId);
      if (!action) {
        const error = new Error('Moderation action not found');
        error.code = 'ACTION_NOT_FOUND';
        throw error;
      }
      
      // Check if action is appealable
      if (!action.appealable) {
        const error = new Error('This action cannot be appealed');
        error.code = 'NOT_APPEALABLE';
        throw error;
      }
      
      // Check appeal deadline
      if (action.appealDeadline && new Date() > new Date(action.appealDeadline)) {
        const error = new Error('Appeal deadline has passed');
        error.code = 'APPEAL_DEADLINE_PASSED';
        throw error;
      }
      
      // Check if user is the target of the action
      if (action.targetId !== user.squidId) {
        const error = new Error('Can only appeal actions against yourself');
        error.code = 'CANNOT_APPEAL_OTHERS_ACTION';
        throw error;
      }
      
      // Check if user is trying to appeal their own moderation action
      if (action.moderatorId === user.squidId) {
        const error = new Error('Cannot appeal your own moderation actions');
        error.code = 'CANNOT_APPEAL_OWN_ACTION';
        throw error;
      }
      
      // Check if appeal already exists
      const existingAppeal = Array.from(this.appeals.values()).find(
        appeal => appeal.actionId === appealData.actionId
      );
      
      if (existingAppeal) {
        const error = new Error('Appeal already exists for this action');
        error.code = 'APPEAL_EXISTS';
        throw error;
      }
      
      // Generate appeal ID
      const appealId = `qchat_appeal_${uuidv4().replace(/-/g, '_')}`;
      
      // Create appeal
      const appeal = {
        appealId,
        actionId: appealData.actionId,
        appellantId: appealData.appellantId,
        reason: appealData.reason,
        evidence: appealData.evidence || [],
        timestamp: appealData.timestamp,
        status: 'PENDING',
        reviewerId: null,
        reviewedAt: null,
        decision: null,
        reviewReason: null,
        auditCid: `Qm${Math.random().toString(36).substring(2, 46)}`
      };
      
      // Store appeal
      this.appeals.set(appealId, appeal);
      
      // Store in IPFS
      await this.storeAppealInIPFS(appeal);
      
      // Publish appeal event
      await this.publishEvent('q.qchat.moderation.appeal.v1', {
        appealId,
        actionId: appealData.actionId,
        appellantId: user.squidId,
        status: 'PENDING'
      }, user);
      
      return appeal;
    } catch (error) {
      console.error('Create appeal error:', error);
      throw error;
    }
  }

  /**
   * Get user's appeals
   */
  async getUserAppeals(user, filters = {}) {
    try {
      let appeals = Array.from(this.appeals.values())
        .filter(appeal => appeal.appellantId === user.squidId);
      
      // Apply filters
      if (filters.status) {
        appeals = appeals.filter(appeal => appeal.status === filters.status);
      }
      
      if (filters.since) {
        appeals = appeals.filter(appeal => 
          new Date(appeal.timestamp) >= new Date(filters.since)
        );
      }
      
      if (filters.until) {
        appeals = appeals.filter(appeal => 
          new Date(appeal.timestamp) <= new Date(filters.until)
        );
      }
      
      // Sort by timestamp (newest first)
      appeals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply pagination
      const totalCount = appeals.length;
      const paginatedAppeals = appeals.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20));
      
      return {
        appeals: paginatedAppeals,
        totalCount,
        hasMore: (filters.offset || 0) + (filters.limit || 20) < totalCount
      };
    } catch (error) {
      console.error('Get user appeals error:', error);
      throw error;
    }
  }

  /**
   * Resolve an appeal
   */
  async resolveAppeal(appealId, resolutionData, reviewer) {
    try {
      const appeal = this.appeals.get(appealId);
      if (!appeal) {
        const error = new Error('Appeal not found');
        error.code = 'APPEAL_NOT_FOUND';
        throw error;
      }
      
      // Check if appeal is already resolved
      if (appeal.status !== 'PENDING') {
        const error = new Error('Appeal has already been resolved');
        error.code = 'APPEAL_ALREADY_RESOLVED';
        throw error;
      }
      
      // Get original action
      const action = this.moderationActions.get(appeal.actionId);
      if (!action) {
        const error = new Error('Original action not found');
        error.code = 'ACTION_NOT_FOUND';
        throw error;
      }
      
      // Check if reviewer is trying to review their own action
      if (action.moderatorId === reviewer.squidId) {
        const error = new Error('Cannot review appeals for your own moderation actions');
        error.code = 'CANNOT_REVIEW_OWN_ACTION';
        throw error;
      }
      
      // Validate reviewer permissions
      await this.validateModeratorPermissions(action.roomId, reviewer, 'REVIEW_APPEALS');
      
      // Update appeal
      appeal.status = resolutionData.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      appeal.reviewerId = resolutionData.reviewerId;
      appeal.reviewedAt = resolutionData.timestamp;
      appeal.decision = resolutionData.decision;
      appeal.reviewReason = resolutionData.reason;
      
      // If appeal is approved, reverse the original action
      if (resolutionData.decision === 'APPROVED') {
        await this.reverseAction(action);
      }
      
      // Store updated appeal in IPFS
      await this.storeAppealInIPFS(appeal);
      
      // Publish appeal resolved event
      await this.publishEvent('q.qchat.moderation.resolved.v1', {
        appealId,
        actionId: appeal.actionId,
        decision: resolutionData.decision,
        reviewerId: reviewer.squidId
      }, reviewer);
      
      // Notify appellant
      await this.notifyAppellant(appeal);
      
      return appeal;
    } catch (error) {
      console.error('Resolve appeal error:', error);
      throw error;
    }
  }

  /**
   * Get user's moderation status across rooms
   */
  async getUserModerationStatus(squidId, requester) {
    try {
      // Get all moderation actions for the user
      const userActions = Array.from(this.moderationActions.values())
        .filter(action => action.targetId === squidId && this.isUserAction(action.action));
      
      // Group by room
      const statusByRoom = {};
      
      for (const action of userActions) {
        if (!statusByRoom[action.roomId]) {
          statusByRoom[action.roomId] = {
            roomId: action.roomId,
            activeModerations: [],
            recentActions: []
          };
        }
        
        // Check if action is still active
        const isActive = this.isActionActive(action);
        
        if (isActive) {
          statusByRoom[action.roomId].activeModerations.push({
            actionId: action.actionId,
            action: action.action,
            reason: action.reason,
            severity: action.severity,
            timestamp: action.timestamp,
            effectiveUntil: action.effectiveUntil,
            moderatorId: action.moderatorId
          });
        }
        
        statusByRoom[action.roomId].recentActions.push({
          actionId: action.actionId,
          action: action.action,
          severity: action.severity,
          timestamp: action.timestamp,
          active: isActive
        });
      }
      
      // Sort recent actions by timestamp
      Object.values(statusByRoom).forEach(roomStatus => {
        roomStatus.recentActions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        roomStatus.recentActions = roomStatus.recentActions.slice(0, 10); // Last 10 actions
      });
      
      return {
        squidId,
        overallStatus: this.calculateOverallStatus(userActions),
        statusByRoom,
        totalActions: userActions.length,
        activeActions: userActions.filter(action => this.isActionActive(action)).length
      };
    } catch (error) {
      console.error('Get user moderation status error:', error);
      throw error;
    }
  }

  /**
   * Validate moderator permissions
   */
  async validateModeratorPermissions(roomId, user, action) {
    // Mock permission validation
    // In real implementation, this would check user role and permissions
    if (process.env.QCHAT_MODE === 'standalone') {
      // Allow admin user to moderate
      if (user.squidId === 'squid_admin_123') {
        return true;
      }
      
      // For demo purposes, allow users with high reputation to moderate
      if ((user.identity?.reputation || 0) >= 0.8) {
        return true;
      }
      
      const error = new Error('Insufficient permissions');
      error.code = 'INSUFFICIENT_PERMISSIONS';
      throw error;
    }
    
    // Real implementation would validate against room roles and permissions
    return true;
  }

  /**
   * Validate moderation target
   */
  async validateTarget(roomId, targetId, action) {
    if (this.isUserAction(action)) {
      // Validate user exists and is in room
      if (!targetId.match(/^squid_[a-zA-Z0-9_-]+$/)) {
        const error = new Error('Invalid user ID');
        error.code = 'TARGET_NOT_FOUND';
        throw error;
      }
    } else if (this.isMessageAction(action)) {
      // Validate message exists
      if (!targetId.match(/^qchat_msg_[a-zA-Z0-9_-]+$/)) {
        const error = new Error('Invalid message ID');
        error.code = 'TARGET_NOT_FOUND';
        throw error;
      }
    }
    
    return true;
  }

  /**
   * Check role hierarchy for moderation
   */
  async checkRoleHierarchy(roomId, moderatorId, targetId) {
    // Mock role hierarchy check
    // In real implementation, this would check actual user roles
    if (process.env.QCHAT_MODE === 'standalone') {
      // Admin can moderate anyone except other admins
      if (moderatorId === 'squid_admin_123' && targetId !== 'squid_admin_123') {
        return true;
      }
      
      // Regular users can't moderate admins
      if (targetId === 'squid_admin_123') {
        return false;
      }
      
      return true;
    }
    
    // Real implementation would check room roles
    return true;
  }

  /**
   * Apply moderation action
   */
  async applyModerationAction(action) {
    try {
      switch (action.action) {
        case 'MUTE':
          // Set mute status
          // In real implementation, this would update user permissions
          console.log(`User ${action.targetId} muted in room ${action.roomId} until ${action.effectiveUntil}`);
          break;
        
        case 'BAN':
          // Remove user from room and prevent rejoining
          console.log(`User ${action.targetId} banned from room ${action.roomId} until ${action.effectiveUntil}`);
          break;
        
        case 'KICK':
          // Remove user from room
          console.log(`User ${action.targetId} kicked from room ${action.roomId}`);
          break;
        
        case 'DELETE_MESSAGE':
          // Mark message as deleted
          console.log(`Message ${action.targetId} deleted from room ${action.roomId}`);
          break;
        
        case 'WARN':
          // Send warning to user
          console.log(`Warning sent to user ${action.targetId} in room ${action.roomId}`);
          break;
        
        default:
          console.log(`Applied moderation action: ${action.action}`);
      }
    } catch (error) {
      console.error('Apply moderation action error:', error);
      throw error;
    }
  }

  /**
   * Calculate reputation impact
   */
  async calculateReputationImpact(action) {
    if (!this.isUserAction(action.action)) {
      return null;
    }
    
    // Mock reputation calculation
    const severityImpact = {
      'LOW': -0.01,
      'MEDIUM': -0.05,
      'HIGH': -0.15,
      'CRITICAL': -0.30
    };
    
    const change = severityImpact[action.severity] || -0.05;
    const previousScore = 0.75; // Mock previous score
    const newScore = Math.max(0, previousScore + change);
    
    return {
      targetId: action.targetId,
      previousScore,
      newScore,
      change
    };
  }

  /**
   * Helper methods
   */
  isUserAction(action) {
    return ['MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN', 'WARN'].includes(action);
  }

  isMessageAction(action) {
    return ['DELETE_MESSAGE', 'PIN_MESSAGE', 'UNPIN_MESSAGE'].includes(action);
  }

  getTargetType(action) {
    return this.isUserAction(action) ? 'USER' : 'MESSAGE';
  }

  isAppealable(action) {
    // Most actions are appealable except warnings and message deletions
    return !['WARN', 'DELETE_MESSAGE'].includes(action);
  }

  isActionActive(action) {
    if (!action.effectiveUntil) {
      return ['BAN', 'MUTE'].includes(action.action);
    }
    
    return new Date() < new Date(action.effectiveUntil);
  }

  calculateOverallStatus(actions) {
    const activeActions = actions.filter(action => this.isActionActive(action));
    
    if (activeActions.some(action => action.action === 'BAN')) {
      return 'BANNED';
    }
    
    if (activeActions.some(action => action.action === 'MUTE')) {
      return 'MUTED';
    }
    
    if (activeActions.length > 0) {
      return 'RESTRICTED';
    }
    
    return 'GOOD_STANDING';
  }

  async reverseAction(action) {
    // Reverse the effects of a moderation action
    console.log(`Reversing moderation action: ${action.actionId}`);
    
    switch (action.action) {
      case 'MUTE':
        console.log(`Unmuting user ${action.targetId} in room ${action.roomId}`);
        break;
      case 'BAN':
        console.log(`Unbanning user ${action.targetId} from room ${action.roomId}`);
        break;
      // Note: Some actions like KICK or DELETE_MESSAGE cannot be reversed
    }
  }

  async escalateToQerberos(action) {
    try {
      await mockServices.qerberos.reportSecurityEvent({
        type: 'MODERATION_ESCALATION',
        actionId: action.actionId,
        roomId: action.roomId,
        targetId: action.targetId,
        action: action.action,
        severity: action.severity,
        reason: action.reason,
        timestamp: action.timestamp
      });
    } catch (error) {
      console.error('Qerberos escalation error:', error);
    }
  }

  async notifyUser(action) {
    // Send notification to user about moderation action
    console.log(`Notifying user ${action.targetId} about moderation action: ${action.action}`);
  }

  async notifyAppellant(appeal) {
    // Send notification to appellant about appeal resolution
    console.log(`Notifying appellant ${appeal.appellantId} about appeal resolution: ${appeal.decision}`);
  }

  async storeActionInIPFS(action) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Moderation action stored in IPFS:', action.actionId);
        return;
      }
      
      // Real implementation would store in IPFS
    } catch (error) {
      console.error('IPFS storage error:', error);
    }
  }

  async storeAppealInIPFS(appeal) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Appeal stored in IPFS:', appeal.appealId);
        return;
      }
      
      // Real implementation would store in IPFS
    } catch (error) {
      console.error('IPFS storage error:', error);
    }
  }

  async publishEvent(topic, data, user) {
    try {
      const event = {
        eventId: `qchat_event_${uuidv4().replace(/-/g, '_')}`,
        topic,
        timestamp: new Date().toISOString(),
        source: 'qchat',
        version: '1.0.0',
        actor: {
          squidId: user.squidId,
          subId: user.subId,
          daoId: user.daoId
        },
        data,
        metadata: {
          correlationId: uuidv4(),
          signature: 'mock_signature',
          cid: `Qm${Math.random().toString(36).substring(2, 46)}`
        }
      };
      
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Event published:', topic, data);
        return event;
      }
      
      // Real implementation would publish to event bus
      return event;
    } catch (error) {
      console.error('Event publishing error:', error);
    }
  }
}

export default ModerationService;