/**
 * Progressive Loading Hook
 * 
 * Provides progressive loading states with smooth transitions for complex
 * data loading scenarios in DAO dashboard components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Loading stage definitions
export type LoadingStage = 
  | 'initial'
  | 'dao-loading'
  | 'dao-loaded'
  | 'wallet-loading'
  | 'wallet-loaded'
  | 'analytics-loading'
  | 'analytics-loaded'
  | 'complete'
  | 'error';

// Loading state interface
export interface LoadingState {
  stage: LoadingStage;
  progress: number; // 0-100
  message: string;
  error?: string;
  data?: {
    dao?: any;
    proposals?: any[];
    membership?: any;
    wallet?: any;
    analytics?: any;
  };
}

// Loading configuration
export interface ProgressiveLoadingConfig {
  enableTransitions: boolean;
  transitionDuration: number; // milliseconds
  showProgress: boolean;
  autoAdvance: boolean;
  stages: {
    [K in LoadingStage]?: {
      message: string;
      duration?: number; // minimum duration in ms
    };
  };
}

// Default configuration
const DEFAULT_CONFIG: ProgressiveLoadingConfig = {
  enableTransitions: true,
  transitionDuration: 300,
  showProgress: true,
  autoAdvance: true,
  stages: {
    initial: { message: 'Initializing...', duration: 100 },
    'dao-loading': { message: 'Loading DAO information...', duration: 500 },
    'dao-loaded': { message: 'DAO loaded, fetching proposals...', duration: 200 },
    'wallet-loading': { message: 'Loading wallet data...', duration: 300 },
    'wallet-loaded': { message: 'Wallet loaded, calculating metrics...', duration: 200 },
    'analytics-loading': { message: 'Loading analytics...', duration: 400 },
    'analytics-loaded': { message: 'Analytics loaded, finalizing...', duration: 200 },
    complete: { message: 'Ready!', duration: 100 },
    error: { message: 'Error occurred', duration: 0 }
  }
};

// Stage progression mapping
const STAGE_PROGRESSION: Record<LoadingStage, LoadingStage | null> = {
  initial: 'dao-loading',
  'dao-loading': 'dao-loaded',
  'dao-loaded': 'wallet-loading',
  'wallet-loading': 'wallet-loaded',
  'wallet-loaded': 'analytics-loading',
  'analytics-loading': 'analytics-loaded',
  'analytics-loaded': 'complete',
  complete: null,
  error: null
};

// Progress mapping for each stage
const STAGE_PROGRESS: Record<LoadingStage, number> = {
  initial: 0,
  'dao-loading': 15,
  'dao-loaded': 30,
  'wallet-loading': 50,
  'wallet-loaded': 70,
  'analytics-loading': 85,
  'analytics-loaded': 95,
  complete: 100,
  error: 0
};

export interface UseProgressiveLoadingReturn {
  state: LoadingState;
  setStage: (stage: LoadingStage, data?: any, error?: string) => void;
  setData: (key: string, data: any) => void;
  setError: (error: string) => void;
  reset: () => void;
  isLoading: boolean;
  isComplete: boolean;
  hasError: boolean;
  canSkipStage: (stage: LoadingStage) => boolean;
  skipToStage: (stage: LoadingStage) => void;
}

export const useProgressiveLoading = (
  config: Partial<ProgressiveLoadingConfig> = {}
): UseProgressiveLoadingReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<LoadingState>({
    stage: 'initial',
    progress: 0,
    message: fullConfig.stages.initial?.message || 'Loading...',
    data: {}
  });

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-advance to next stage if configured
  const autoAdvanceToNext = useCallback((currentStage: LoadingStage) => {
    if (!fullConfig.autoAdvance) return;

    const nextStage = STAGE_PROGRESSION[currentStage];
    if (!nextStage) return;

    const stageDuration = fullConfig.stages[currentStage]?.duration || 0;
    
    if (stageDuration > 0) {
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          stage: nextStage,
          progress: STAGE_PROGRESS[nextStage],
          message: fullConfig.stages[nextStage]?.message || 'Loading...'
        }));
      }, stageDuration);
    }
  }, [fullConfig]);

  // Set loading stage
  const setStage = useCallback((
    stage: LoadingStage, 
    data?: any, 
    error?: string
  ) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => {
      const newState: LoadingState = {
        ...prev,
        stage,
        progress: STAGE_PROGRESS[stage],
        message: fullConfig.stages[stage]?.message || 'Loading...',
        error
      };

      // Update data if provided
      if (data) {
        newState.data = { ...prev.data, ...data };
      }

      return newState;
    });

    // Auto-advance if not error stage
    if (stage !== 'error' && stage !== 'complete') {
      autoAdvanceToNext(stage);
    }
  }, [fullConfig, autoAdvanceToNext]);

  // Set data for specific key
  const setData = useCallback((key: string, data: any) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [key]: data
      }
    }));
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setStage('error', undefined, error);
  }, [setStage]);

  // Reset to initial state
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState({
      stage: 'initial',
      progress: 0,
      message: fullConfig.stages.initial?.message || 'Loading...',
      data: {}
    });
  }, [fullConfig]);

  // Check if can skip to a stage
  const canSkipStage = useCallback((targetStage: LoadingStage): boolean => {
    const currentProgress = STAGE_PROGRESS[state.stage];
    const targetProgress = STAGE_PROGRESS[targetStage];
    return targetProgress >= currentProgress;
  }, [state.stage]);

  // Skip to specific stage
  const skipToStage = useCallback((targetStage: LoadingStage) => {
    if (canSkipStage(targetStage)) {
      setStage(targetStage);
    }
  }, [canSkipStage, setStage]);

  // Computed properties
  const isLoading = state.stage !== 'complete' && state.stage !== 'error';
  const isComplete = state.stage === 'complete';
  const hasError = state.stage === 'error';

  return {
    state,
    setStage,
    setData,
    setError,
    reset,
    isLoading,
    isComplete,
    hasError,
    canSkipStage,
    skipToStage
  };
};

/**
 * Hook for managing loading transitions with smooth animations
 */
export const useLoadingTransition = (
  isLoading: boolean,
  duration: number = 300
) => {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [shouldRender, setShouldRender] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timeout);
    } else {
      setIsVisible(false);
      // Wait for transition to complete before removing from DOM
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, duration]);

  return { isVisible, shouldRender };
};

/**
 * Component wrapper for progressive loading with transitions
 */
export interface ProgressiveLoadingWrapperProps {
  loading: LoadingState;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
  transitionDuration?: number;
}

export const ProgressiveLoadingWrapper: React.FC<ProgressiveLoadingWrapperProps> = ({
  loading,
  children,
  skeleton,
  className,
  transitionDuration = 300
}) => {
  const { isVisible, shouldRender } = useLoadingTransition(
    loading.stage !== 'complete',
    transitionDuration
  );

  return (
    <div className={`relative ${className || ''}`}>
      {/* Content */}
      <div 
        className={`transition-opacity duration-${transitionDuration} ${
          loading.stage === 'complete' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {children}
      </div>

      {/* Loading overlay */}
      {shouldRender && (
        <div 
          className={`absolute inset-0 transition-opacity duration-${transitionDuration} ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {skeleton}
        </div>
      )}

      {/* Progress indicator */}
      {loading.progress > 0 && loading.stage !== 'complete' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${loading.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};