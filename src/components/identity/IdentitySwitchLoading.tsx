/**
 * Identity Switch Loading Component
 * Displays loading states during identity switching
 * Requirements: Add loading states during identity switching
 */

import React from 'react';
import { IdentitySwitchLoadingState } from '@/types/identity';

interface IdentitySwitchLoadingProps {
  loadingState: IdentitySwitchLoadingState;
  className?: string;
  compact?: boolean;
}

/**
 * Loading indicator component for identity switches
 */
export const IdentitySwitchLoading: React.FC<IdentitySwitchLoadingProps> = ({
  loadingState,
  className = '',
  compact = false
}) => {
  const getStageIcon = () => {
    const iconClass = "w-5 h-5 animate-spin text-blue-500";
    
    switch (loadingState.stage) {
      case 'validating':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'switching':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'updating_contexts':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        );
    }
  };

  const getStageText = () => {
    switch (loadingState.stage) {
      case 'validating':
        return 'Validating identity...';
      case 'switching':
        return 'Switching identity...';
      case 'updating_contexts':
        return loadingState.currentModule 
          ? `Updating ${loadingState.currentModule}...`
          : 'Updating contexts...';
      case 'complete':
        return 'Switch complete!';
      case 'error':
        return 'Switch failed';
      default:
        return 'Processing...';
    }
  };

  const getProgressBarColor = () => {
    switch (loadingState.stage) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStageIcon()}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getStageText()}
        </span>
        {loadingState.progress > 0 && (
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 ml-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getStageIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getStageText()}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {loadingState.progress}%
            </span>
          </div>
          
          {loadingState.message && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {loadingState.message}
            </p>
          )}
          
          {loadingState.currentModule && (
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Module: {loadingState.currentModule}
            </p>
          )}
          
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentitySwitchLoading;