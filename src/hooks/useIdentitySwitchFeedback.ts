/**
 * React Hook for Identity Switch Visual Feedback
 * Provides toast notifications, loading states, and error feedback for identity switches
 * Requirements: 4.7, 1.6
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IdentitySwitchFeedback,
  IdentitySwitchLoadingState,
  ExtendedSquidIdentity,
  ContextSwitchResult
} from '@/types/identity';
import { identityVisualFeedback } from '@/services/identity/IdentityVisualFeedback';

interface UseIdentitySwitchFeedbackReturn {
  // Loading state
  loadingState: IdentitySwitchLoadingState | null;
  isLoading: boolean;
  
  // Toast notifications
  currentFeedback: IdentitySwitchFeedback | null;
  toastQueue: Array<{
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
  }>;
  
  // Actions
  showSwitchSuccess: (
    previousIdentity: ExtendedSquidIdentity | null,
    newIdentity: ExtendedSquidIdentity,
    contextResult?: ContextSwitchResult
  ) => void;
  showSwitchError: (
    targetIdentity: ExtendedSquidIdentity,
    error: string,
    errorCode?: string,
    contextResult?: ContextSwitchResult
  ) => void;
  showSwitchWarning: (title: string, message: string, duration?: number) => void;
  showSwitchInfo: (title: string, message: string, duration?: number) => void;
  clearFeedback: () => void;
  dismissToast: (toastId: string) => void;
}

/**
 * Hook for managing identity switch visual feedback
 */
export const useIdentitySwitchFeedback = (): UseIdentitySwitchFeedbackReturn => {
  const [loadingState, setLoadingState] = useState<IdentitySwitchLoadingState | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<IdentitySwitchFeedback | null>(null);
  const [toastQueue, setToastQueue] = useState<any[]>([]);
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFeedbackRef = useRef<(() => void) | null>(null);
  const unsubscribeLoadingRef = useRef<(() => void) | null>(null);

  // Initialize subscriptions
  useEffect(() => {
    // Subscribe to feedback notifications
    unsubscribeFeedbackRef.current = identityVisualFeedback.subscribeFeedback((feedback) => {
      setCurrentFeedback(feedback);
      
      // Auto-clear feedback after duration
      if (feedback.duration) {
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        
        feedbackTimeoutRef.current = setTimeout(() => {
          setCurrentFeedback(null);
        }, feedback.duration);
      }
    });

    // Subscribe to loading state changes
    unsubscribeLoadingRef.current = identityVisualFeedback.subscribeLoadingState((state) => {
      setLoadingState(state);
    });

    // Register loading state manager
    identityVisualFeedback.registerLoadingStateManager({
      setLoading: setLoadingState,
      clearLoading: () => setLoadingState(null),
      getCurrentState: () => loadingState
    });

    // Initial toast queue sync
    setToastQueue(identityVisualFeedback.getToastQueue());

    return () => {
      if (unsubscribeFeedbackRef.current) {
        unsubscribeFeedbackRef.current();
      }
      if (unsubscribeLoadingRef.current) {
        unsubscribeLoadingRef.current();
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Sync toast queue when feedback changes
  useEffect(() => {
    setToastQueue(identityVisualFeedback.getToastQueue());
  }, [currentFeedback]);

  // Action handlers
  const showSwitchSuccess = useCallback((
    previousIdentity: ExtendedSquidIdentity | null,
    newIdentity: ExtendedSquidIdentity,
    contextResult?: ContextSwitchResult
  ) => {
    identityVisualFeedback.showSwitchSuccess(previousIdentity, newIdentity, contextResult);
  }, []);

  const showSwitchError = useCallback((
    targetIdentity: ExtendedSquidIdentity,
    error: string,
    errorCode?: string,
    contextResult?: ContextSwitchResult
  ) => {
    identityVisualFeedback.showSwitchError(targetIdentity, error, errorCode, contextResult);
  }, []);

  const showSwitchWarning = useCallback((title: string, message: string, duration?: number) => {
    identityVisualFeedback.showSwitchWarning(title, message, duration);
  }, []);

  const showSwitchInfo = useCallback((title: string, message: string, duration?: number) => {
    identityVisualFeedback.showSwitchInfo(title, message, duration);
  }, []);

  const clearFeedback = useCallback(() => {
    setCurrentFeedback(null);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToastQueue(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  return {
    // State
    loadingState,
    isLoading: loadingState?.isLoading || false,
    currentFeedback,
    toastQueue,
    
    // Actions
    showSwitchSuccess,
    showSwitchError,
    showSwitchWarning,
    showSwitchInfo,
    clearFeedback,
    dismissToast
  };
};

export default useIdentitySwitchFeedback;