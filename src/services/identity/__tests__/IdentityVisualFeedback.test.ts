/**
 * Tests for Identity Visual Feedback Service
 * Tests toast notifications, loading states, and error feedback for identity switches
 * Requirements: 4.7, 1.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { identityVisualFeedback, IdentityVisualFeedback } from '../IdentityVisualFeedback';
import {
  ExtendedSquidIdentity,
  IdentityType,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel,
  ContextSwitchResult,
  ContextUpdateStatus
} from '@/types/identity';

// Mock identities for testing
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:root:test-root-123',
  name: 'Test Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root:test-root-123',
  children: [],
  depth: 0,
  path: [],
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    type: IdentityType.ROOT,
    requiresKYC: false,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.SELF
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-root-123',
  qlockKeyPair: {
    publicKey: 'pub-root-123',
    privateKey: 'priv-root-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  tags: ['root', 'primary'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T00:00:00Z',
  kyc: {
    required: false,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true,
  usageStats: {
    switchCount: 0,
    lastSwitch: '2024-01-01T00:00:00Z',
    modulesAccessed: [],
    totalSessions: 1
  }
};

const mockDAOIdentity: ExtendedSquidIdentity = {
  ...mockRootIdentity,
  did: 'did:squid:dao:test-dao-456',
  name: 'Test DAO Identity',
  type: IdentityType.DAO,
  parentId: 'did:squid:root:test-root-123',
  depth: 1,
  path: ['did:squid:root:test-root-123'],
  governanceLevel: GovernanceType.DAO,
  qonsentProfileId: 'qonsent-dao-456',
  qlockKeyPair: {
    publicKey: 'pub-dao-456',
    privateKey: 'priv-dao-456',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T01:00:00Z'
  }
};

const mockSuccessfulContextResult: ContextSwitchResult = {
  success: true,
  switchId: 'switch-test-123',
  previousIdentity: mockRootIdentity,
  newIdentity: mockDAOIdentity,
  contextUpdates: {
    qonsent: ContextUpdateStatus.SUCCESS,
    qlock: ContextUpdateStatus.SUCCESS,
    qwallet: ContextUpdateStatus.SUCCESS,
    qerberos: ContextUpdateStatus.SUCCESS,
    qindex: ContextUpdateStatus.SUCCESS
  },
  successfulModules: ['qonsent', 'qlock', 'qwallet', 'qerberos', 'qindex'],
  failedModules: [],
  warnings: [],
  timestamp: '2024-01-01T12:00:00Z'
};

const mockFailedContextResult: ContextSwitchResult = {
  success: false,
  switchId: 'switch-test-456',
  previousIdentity: mockRootIdentity,
  newIdentity: mockDAOIdentity,
  contextUpdates: {
    qonsent: ContextUpdateStatus.FAILED,
    qlock: ContextUpdateStatus.SUCCESS,
    qwallet: ContextUpdateStatus.SUCCESS,
    qerberos: ContextUpdateStatus.SUCCESS,
    qindex: ContextUpdateStatus.SUCCESS
  },
  successfulModules: ['qlock', 'qwallet', 'qerberos', 'qindex'],
  failedModules: ['qonsent'],
  warnings: [],
  timestamp: '2024-01-01T12:00:00Z',
  error: 'Qonsent context update failed',
  errorCode: 'CONTEXT_UPDATE_FAILED'
};

describe('IdentityVisualFeedback', () => {
  let visualFeedback: IdentityVisualFeedback;
  let mockFeedbackCallback: ReturnType<typeof vi.fn>;
  let mockLoadingCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    visualFeedback = IdentityVisualFeedback.getInstance();
    mockFeedbackCallback = vi.fn();
    mockLoadingCallback = vi.fn();
    
    // Clear any existing state
    visualFeedback.clearToastQueue();
    visualFeedback.clearSwitchLoading();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IdentityVisualFeedback.getInstance();
      const instance2 = IdentityVisualFeedback.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Loading State Management', () => {
    it('should show loading state for identity switch', () => {
      visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, 'validating');
      
      const currentState = visualFeedback.getCurrentLoadingState();
      expect(currentState).toBeDefined();
      expect(currentState?.isLoading).toBe(true);
      expect(currentState?.stage).toBe('validating');
      expect(currentState?.progress).toBe(10);
      expect(currentState?.message).toContain('Validating identity switch');
    });

    it('should update loading progress', () => {
      visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, 'validating');
      visualFeedback.updateSwitchProgress('switching', 50, 'qonsent', 'Updating Qonsent...');
      
      const currentState = visualFeedback.getCurrentLoadingState();
      expect(currentState?.stage).toBe('switching');
      expect(currentState?.progress).toBe(50);
      expect(currentState?.currentModule).toBe('qonsent');
      expect(currentState?.message).toBe('Updating Qonsent...');
    });

    it('should clear loading state', () => {
      visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, 'validating');
      expect(visualFeedback.getCurrentLoadingState()).toBeDefined();
      
      visualFeedback.clearSwitchLoading();
      expect(visualFeedback.getCurrentLoadingState()).toBeNull();
    });

    it('should handle loading state callbacks', () => {
      const unsubscribe = visualFeedback.subscribeLoadingState(mockLoadingCallback);
      
      visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, 'validating');
      expect(mockLoadingCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: true,
          stage: 'validating',
          progress: 10
        })
      );
      
      unsubscribe();
    });

    it('should register and use loading state manager', () => {
      const mockManager = {
        setLoading: vi.fn(),
        clearLoading: vi.fn(),
        getCurrentState: vi.fn()
      };
      
      visualFeedback.registerLoadingStateManager(mockManager);
      visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, 'validating');
      
      expect(mockManager.setLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: true,
          stage: 'validating'
        })
      );
    });
  });

  describe('Success Feedback', () => {
    it('should show success toast for successful identity switch', () => {
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchSuccess(mockRootIdentity, mockDAOIdentity, mockSuccessfulContextResult);
      
      expect(mockFeedbackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Identity Switch Successful',
          message: `Switched to ${mockDAOIdentity.name} (${mockDAOIdentity.type})`,
          duration: 4000
        })
      );
      
      const toastQueue = visualFeedback.getToastQueue();
      expect(toastQueue).toHaveLength(1);
      expect(toastQueue[0].type).toBe('success');
      
      unsubscribe();
    });

    it('should show additional warning for context issues', (done) => {
      const contextResultWithWarnings = {
        ...mockSuccessfulContextResult,
        warnings: ['Some modules had minor issues']
      };
      
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchSuccess(mockRootIdentity, mockDAOIdentity, contextResultWithWarnings);
      
      // Check that warning is shown after delay
      setTimeout(() => {
        expect(mockFeedbackCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: 'Some modules had issues during switch'
          })
        );
        unsubscribe();
        done();
      }, 1100);
    });
  });

  describe('Error Feedback', () => {
    it('should show error toast for failed identity switch', () => {
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchError(
        mockDAOIdentity,
        'Context switch failed',
        'CONTEXT_SWITCH_FAILED',
        mockFailedContextResult
      );
      
      expect(mockFeedbackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Identity Switch Failed',
          message: 'Failed to update module contexts. Some services may be unavailable.',
          duration: 8000
        })
      );
      
      const toastQueue = visualFeedback.getToastQueue();
      expect(toastQueue).toHaveLength(1);
      expect(toastQueue[0].type).toBe('error');
      
      unsubscribe();
    });

    it('should format error messages based on error codes', () => {
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      const testCases = [
        { code: 'VALIDATION_FAILED', expectedMessage: 'Identity validation failed. Please check identity status and permissions.' },
        { code: 'IDENTITY_NOT_FOUND', expectedMessage: 'The target identity could not be found.' },
        { code: 'PERMISSION_ERROR', expectedMessage: 'You do not have permission to switch to this identity.' },
        { code: 'UNKNOWN_ERROR', expectedMessage: 'An unexpected error occurred during the identity switch.' }
      ];
      
      testCases.forEach(({ code, expectedMessage }) => {
        mockFeedbackCallback.mockClear();
        visualFeedback.showSwitchError(mockDAOIdentity, 'Generic error', code);
        
        expect(mockFeedbackCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expectedMessage
          })
        );
      });
      
      unsubscribe();
    });

    it('should show rollback info for failed switches with rollback', (done) => {
      const contextResultWithRollback = {
        ...mockFailedContextResult,
        rollbackResult: {
          success: true,
          switchId: 'switch-test-456',
          rollbackResults: { qonsent: true, qlock: true },
          errors: [],
          timestamp: '2024-01-01T12:01:00Z'
        }
      };
      
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchError(
        mockDAOIdentity,
        'Context switch failed',
        'CONTEXT_SWITCH_FAILED',
        contextResultWithRollback
      );
      
      // Check that rollback info is shown after delay
      setTimeout(() => {
        expect(mockFeedbackCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: 'Context Restored',
            message: 'Previous identity context has been restored'
          })
        );
        unsubscribe();
        done();
      }, 1600);
    });
  });

  describe('Warning and Info Feedback', () => {
    it('should show warning toast', () => {
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchWarning('Test Warning', 'This is a warning message', 3000);
      
      expect(mockFeedbackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'Test Warning',
          message: 'This is a warning message',
          duration: 3000
        })
      );
      
      unsubscribe();
    });

    it('should show info toast', () => {
      const unsubscribe = visualFeedback.subscribeFeedback(mockFeedbackCallback);
      
      visualFeedback.showSwitchInfo('Test Info', 'This is an info message', 2000);
      
      expect(mockFeedbackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Test Info',
          message: 'This is an info message',
          duration: 2000
        })
      );
      
      unsubscribe();
    });
  });

  describe('Enhanced Switch Result', () => {
    it('should create enhanced switch result with feedback', () => {
      const loadingState = {
        isLoading: false,
        stage: 'complete' as const,
        progress: 100,
        message: 'Switch complete'
      };
      
      const enhancedResult = visualFeedback.createEnhancedSwitchResult(
        mockSuccessfulContextResult,
        loadingState
      );
      
      expect(enhancedResult).toEqual({
        ...mockSuccessfulContextResult,
        feedback: expect.objectContaining({
          type: 'success',
          title: 'Identity Switch Successful',
          message: `Switched to ${mockDAOIdentity.name}`
        }),
        loadingState
      });
    });

    it('should create enhanced switch result for failed switch', () => {
      const loadingState = {
        isLoading: false,
        stage: 'error' as const,
        progress: 0,
        message: 'Switch failed'
      };
      
      const enhancedResult = visualFeedback.createEnhancedSwitchResult(
        mockFailedContextResult,
        loadingState
      );
      
      expect(enhancedResult.feedback.type).toBe('error');
      expect(enhancedResult.feedback.title).toBe('Identity Switch Failed');
      expect(enhancedResult.feedback.message).toBe(mockFailedContextResult.error);
    });
  });

  describe('Toast Queue Management', () => {
    it('should manage toast queue correctly', () => {
      expect(visualFeedback.getToastQueue()).toHaveLength(0);
      
      visualFeedback.showSwitchSuccess(mockRootIdentity, mockDAOIdentity);
      expect(visualFeedback.getToastQueue()).toHaveLength(1);
      
      visualFeedback.showSwitchError(mockDAOIdentity, 'Test error');
      expect(visualFeedback.getToastQueue()).toHaveLength(2);
      
      visualFeedback.clearToastQueue();
      expect(visualFeedback.getToastQueue()).toHaveLength(0);
    });

    it('should auto-remove toasts after duration', (done) => {
      visualFeedback.showSwitchInfo('Test', 'Message', 100); // Very short duration for testing
      
      expect(visualFeedback.getToastQueue()).toHaveLength(1);
      
      setTimeout(() => {
        expect(visualFeedback.getToastQueue()).toHaveLength(0);
        done();
      }, 150);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate correct progress for different stages', () => {
      const testCases = [
        { stage: 'validating' as const, expectedProgress: 10 },
        { stage: 'switching' as const, expectedProgress: 30 },
        { stage: 'updating_contexts' as const, expectedProgress: 70 },
        { stage: 'complete' as const, expectedProgress: 100 },
        { stage: 'error' as const, expectedProgress: 0 }
      ];
      
      testCases.forEach(({ stage, expectedProgress }) => {
        visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, stage);
        const currentState = visualFeedback.getCurrentLoadingState();
        expect(currentState?.progress).toBe(expectedProgress);
      });
    });
  });

  describe('Message Generation', () => {
    it('should generate appropriate messages for different stages', () => {
      const testCases = [
        { stage: 'validating' as const, expectedMessage: 'Validating identity switch...' },
        { stage: 'switching' as const, expectedMessage: `Switching to ${mockDAOIdentity.name}...` },
        { stage: 'updating_contexts' as const, expectedMessage: 'Updating module contexts...' },
        { stage: 'complete' as const, expectedMessage: `Successfully switched to ${mockDAOIdentity.name}` },
        { stage: 'error' as const, expectedMessage: 'Identity switch failed' }
      ];
      
      testCases.forEach(({ stage, expectedMessage }) => {
        visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity, stage);
        const currentState = visualFeedback.getCurrentLoadingState();
        expect(currentState?.message).toBe(expectedMessage);
      });
    });
  });

  describe('Error Handling in Callbacks', () => {
    it('should handle errors in feedback callbacks gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      const unsubscribe = visualFeedback.subscribeFeedback(errorCallback);
      
      // Should not throw even if callback throws
      expect(() => {
        visualFeedback.showSwitchSuccess(mockRootIdentity, mockDAOIdentity);
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      unsubscribe();
    });

    it('should handle errors in loading callbacks gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Loading callback error');
      });
      
      const unsubscribe = visualFeedback.subscribeLoadingState(errorCallback);
      
      // Should not throw even if callback throws
      expect(() => {
        visualFeedback.showSwitchLoading(mockRootIdentity, mockDAOIdentity);
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      unsubscribe();
    });
  });
});