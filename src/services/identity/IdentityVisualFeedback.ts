/**
 * Identity Visual Feedback Service
 * Handles toast notifications, loading states, and error feedback for identity switches
 * Requirements: 4.7, 1.6
 */

import {
  IdentitySwitchFeedback,
  IdentitySwitchLoadingState,
  EnhancedSwitchResult,
  ExtendedSquidIdentity,
  ContextSwitchResult
} from '@/types/identity';

// Toast notification interface (compatible with common toast libraries)
interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  timestamp: string;
}

// Loading state manager interface
interface LoadingStateManager {
  setLoading: (state: IdentitySwitchLoadingState) => void;
  clearLoading: () => void;
  getCurrentState: () => IdentitySwitchLoadingState | null;
}

/**
 * Visual Feedback Service for Identity Switching
 * Provides comprehensive UI feedback for identity operations
 */
export class IdentityVisualFeedback {
  private static instance: IdentityVisualFeedback;
  private toastQueue: ToastNotification[] = [];
  private loadingStateManager: LoadingStateManager | null = null;
  private currentLoadingState: IdentitySwitchLoadingState | null = null;
  private feedbackCallbacks: Array<(feedback: IdentitySwitchFeedback) => void> = [];
  private loadingCallbacks: Array<(state: IdentitySwitchLoadingState) => void> = [];

  private constructor() {}

  public static getInstance(): IdentityVisualFeedback {
    if (!IdentityVisualFeedback.instance) {
      IdentityVisualFeedback.instance = new IdentityVisualFeedback();
    }
    return IdentityVisualFeedback.instance;
  }

  /**
   * Register loading state manager (typically from a React hook or context)
   */
  public registerLoadingStateManager(manager: LoadingStateManager): void {
    this.loadingStateManager = manager;
  }

  /**
   * Subscribe to feedback notifications
   */
  public subscribeFeedback(callback: (feedback: IdentitySwitchFeedback) => void): () => void {
    this.feedbackCallbacks.push(callback);
    return () => {
      const index = this.feedbackCallbacks.indexOf(callback);
      if (index > -1) {
        this.feedbackCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to loading state changes
   */
  public subscribeLoadingState(callback: (state: IdentitySwitchLoadingState) => void): () => void {
    this.loadingCallbacks.push(callback);
    return () => {
      const index = this.loadingCallbacks.indexOf(callback);
      if (index > -1) {
        this.loadingCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Show loading state for identity switch
   * Requirements: Add loading states during identity switching
   */
  public showSwitchLoading(
    fromIdentity: ExtendedSquidIdentity | null,
    toIdentity: ExtendedSquidIdentity,
    stage: IdentitySwitchLoadingState['stage'] = 'validating'
  ): void {
    const loadingState: IdentitySwitchLoadingState = {
      isLoading: true,
      stage,
      progress: this.getProgressForStage(stage),
      message: this.getMessageForStage(stage, fromIdentity, toIdentity),
      currentModule: stage === 'updating_contexts' ? 'qonsent' : undefined
    };

    this.currentLoadingState = loadingState;
    this.notifyLoadingCallbacks(loadingState);

    if (this.loadingStateManager) {
      this.loadingStateManager.setLoading(loadingState);
    }

    console.log(`[IdentityVisualFeedback] Loading state: ${stage} - ${loadingState.message}`);
  }

  /**
   * Update loading progress during context switching
   */
  public updateSwitchProgress(
    stage: IdentitySwitchLoadingState['stage'],
    progress: number,
    currentModule?: string,
    message?: string
  ): void {
    if (!this.currentLoadingState) {
      return;
    }

    const updatedState: IdentitySwitchLoadingState = {
      ...this.currentLoadingState,
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      currentModule,
      message: message || this.currentLoadingState.message
    };

    this.currentLoadingState = updatedState;
    this.notifyLoadingCallbacks(updatedState);

    if (this.loadingStateManager) {
      this.loadingStateManager.setLoading(updatedState);
    }

    console.log(`[IdentityVisualFeedback] Progress update: ${stage} - ${progress}% - ${currentModule || 'N/A'}`);
  }

  /**
   * Clear loading state
   */
  public clearSwitchLoading(): void {
    if (this.currentLoadingState) {
      const finalState: IdentitySwitchLoadingState = {
        ...this.currentLoadingState,
        isLoading: false,
        stage: 'complete',
        progress: 100
      };

      this.currentLoadingState = null;
      this.notifyLoadingCallbacks(finalState);

      if (this.loadingStateManager) {
        this.loadingStateManager.clearLoading();
      }

      console.log('[IdentityVisualFeedback] Loading state cleared');
    }
  }

  /**
   * Show success toast notification for successful identity switch
   * Requirements: Implement toast notifications for successful switches
   */
  public showSwitchSuccess(
    previousIdentity: ExtendedSquidIdentity | null,
    newIdentity: ExtendedSquidIdentity,
    contextResult?: ContextSwitchResult
  ): void {
    const feedback: IdentitySwitchFeedback = {
      type: 'success',
      title: 'Identity Switch Successful',
      message: `Switched to ${newIdentity.name} (${newIdentity.type})`,
      duration: 4000,
      actions: [
        {
          label: 'View Profile',
          action: () => this.navigateToIdentityProfile(newIdentity.did)
        }
      ]
    };

    this.showFeedback(feedback);

    // Show additional info if there were warnings
    if (contextResult?.warnings && contextResult.warnings.length > 0) {
      setTimeout(() => {
        this.showSwitchWarning(
          'Some modules had issues during switch',
          contextResult.warnings.join(', '),
          3000
        );
      }, 1000);
    }

    console.log(`[IdentityVisualFeedback] Success notification shown for switch to: ${newIdentity.did}`);
  }

  /**
   * Show error toast notification for failed identity switch
   * Requirements: Create error feedback for failed switches
   */
  public showSwitchError(
    targetIdentity: ExtendedSquidIdentity,
    error: string,
    errorCode?: string,
    contextResult?: ContextSwitchResult
  ): void {
    const feedback: IdentitySwitchFeedback = {
      type: 'error',
      title: 'Identity Switch Failed',
      message: this.formatErrorMessage(error, errorCode),
      duration: 8000,
      actions: [
        {
          label: 'Retry',
          action: () => this.retryIdentitySwitch(targetIdentity.did)
        },
        {
          label: 'Report Issue',
          action: () => this.reportSwitchIssue(targetIdentity.did, error, errorCode)
        }
      ]
    };

    this.showFeedback(feedback);

    // Show rollback info if available
    if (contextResult?.rollbackResult) {
      setTimeout(() => {
        const rollbackSuccess = contextResult.rollbackResult!.success;
        this.showSwitchInfo(
          rollbackSuccess ? 'Context Restored' : 'Rollback Issues',
          rollbackSuccess 
            ? 'Previous identity context has been restored'
            : 'Some context may not have been fully restored',
          rollbackSuccess ? 3000 : 6000
        );
      }, 1500);
    }

    console.error(`[IdentityVisualFeedback] Error notification shown for switch to: ${targetIdentity.did} - ${error}`);
  }

  /**
   * Show warning toast notification
   */
  public showSwitchWarning(title: string, message: string, duration: number = 5000): void {
    const feedback: IdentitySwitchFeedback = {
      type: 'warning',
      title,
      message,
      duration
    };

    this.showFeedback(feedback);
    console.warn(`[IdentityVisualFeedback] Warning notification: ${title} - ${message}`);
  }

  /**
   * Show info toast notification
   */
  public showSwitchInfo(title: string, message: string, duration: number = 4000): void {
    const feedback: IdentitySwitchFeedback = {
      type: 'info',
      title,
      message,
      duration
    };

    this.showFeedback(feedback);
    console.log(`[IdentityVisualFeedback] Info notification: ${title} - ${message}`);
  }

  /**
   * Create enhanced switch result with visual feedback
   */
  public createEnhancedSwitchResult(
    contextSwitchResult: ContextSwitchResult,
    loadingState: IdentitySwitchLoadingState
  ): EnhancedSwitchResult {
    const feedback: IdentitySwitchFeedback = contextSwitchResult.success
      ? {
          type: 'success',
          title: 'Identity Switch Successful',
          message: `Switched to ${contextSwitchResult.newIdentity.name}`,
          duration: 4000
        }
      : {
          type: 'error',
          title: 'Identity Switch Failed',
          message: contextSwitchResult.error || 'Unknown error occurred',
          duration: 8000
        };

    return {
      ...contextSwitchResult,
      feedback,
      loadingState
    };
  }

  /**
   * Get current loading state
   */
  public getCurrentLoadingState(): IdentitySwitchLoadingState | null {
    return this.currentLoadingState;
  }

  /**
   * Get queued toast notifications
   */
  public getToastQueue(): ToastNotification[] {
    return [...this.toastQueue];
  }

  /**
   * Clear toast queue
   */
  public clearToastQueue(): void {
    this.toastQueue = [];
    console.log('[IdentityVisualFeedback] Toast queue cleared');
  }

  // Private helper methods

  private showFeedback(feedback: IdentitySwitchFeedback): void {
    // Create toast notification
    const toast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: feedback.type,
      title: feedback.title,
      message: feedback.message,
      duration: feedback.duration,
      actions: feedback.actions,
      timestamp: new Date().toISOString()
    };

    // Add to queue
    this.toastQueue.push(toast);

    // Notify subscribers
    this.notifyFeedbackCallbacks(feedback);

    // Auto-remove from queue after duration
    if (toast.duration) {
      setTimeout(() => {
        this.removeToastFromQueue(toast.id);
      }, toast.duration);
    }
  }

  private notifyFeedbackCallbacks(feedback: IdentitySwitchFeedback): void {
    this.feedbackCallbacks.forEach(callback => {
      try {
        callback(feedback);
      } catch (error) {
        console.error('[IdentityVisualFeedback] Error in feedback callback:', error);
      }
    });
  }

  private notifyLoadingCallbacks(state: IdentitySwitchLoadingState): void {
    this.loadingCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[IdentityVisualFeedback] Error in loading callback:', error);
      }
    });
  }

  private removeToastFromQueue(toastId: string): void {
    const index = this.toastQueue.findIndex(toast => toast.id === toastId);
    if (index > -1) {
      this.toastQueue.splice(index, 1);
    }
  }

  private getProgressForStage(stage: IdentitySwitchLoadingState['stage']): number {
    switch (stage) {
      case 'validating':
        return 10;
      case 'switching':
        return 30;
      case 'updating_contexts':
        return 70;
      case 'complete':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  }

  private getMessageForStage(
    stage: IdentitySwitchLoadingState['stage'],
    fromIdentity: ExtendedSquidIdentity | null,
    toIdentity: ExtendedSquidIdentity
  ): string {
    switch (stage) {
      case 'validating':
        return 'Validating identity switch...';
      case 'switching':
        return `Switching to ${toIdentity.name}...`;
      case 'updating_contexts':
        return 'Updating module contexts...';
      case 'complete':
        return `Successfully switched to ${toIdentity.name}`;
      case 'error':
        return 'Identity switch failed';
      default:
        return 'Processing...';
    }
  }

  private formatErrorMessage(error: string, errorCode?: string): string {
    if (!errorCode) {
      return error;
    }

    const errorMessages: Record<string, string> = {
      'VALIDATION_FAILED': 'Identity validation failed. Please check identity status and permissions.',
      'CONTEXT_SWITCH_FAILED': 'Failed to update module contexts. Some services may be unavailable.',
      'CRITICAL_FAILURE': 'Critical system failure during switch. Previous context has been restored.',
      'SWITCH_IN_PROGRESS': 'Another identity switch is already in progress. Please wait.',
      'IDENTITY_NOT_FOUND': 'The target identity could not be found.',
      'IDENTITY_INACTIVE': 'Cannot switch to an inactive identity.',
      'PERMISSION_ERROR': 'You do not have permission to switch to this identity.',
      'UNKNOWN_ERROR': 'An unexpected error occurred during the identity switch.'
    };

    return errorMessages[errorCode] || error;
  }

  private navigateToIdentityProfile(identityId: string): void {
    // Mock navigation - in a real app this would use the router
    console.log(`[IdentityVisualFeedback] Navigate to identity profile: ${identityId}`);
    // Example: router.push(`/identity/${identityId}`);
  }

  private retryIdentitySwitch(identityId: string): void {
    // Mock retry - in a real app this would trigger the switch again
    console.log(`[IdentityVisualFeedback] Retry identity switch: ${identityId}`);
    // Example: identityManager.switchActiveIdentity(identityId);
  }

  private reportSwitchIssue(identityId: string, error: string, errorCode?: string): void {
    // Mock issue reporting - in a real app this would send to error tracking
    console.log(`[IdentityVisualFeedback] Report switch issue: ${identityId} - ${error} (${errorCode})`);
    // Example: errorTracker.report({ identityId, error, errorCode, timestamp: new Date() });
  }
}

// Export singleton instance
export const identityVisualFeedback = IdentityVisualFeedback.getInstance();
export default identityVisualFeedback;