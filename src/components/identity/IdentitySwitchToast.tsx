/**
 * Identity Switch Toast Notification Component
 * Displays toast notifications for identity switch feedback
 * Requirements: 4.7, 1.6
 */

import React, { useEffect, useState } from 'react';
import { IdentitySwitchFeedback } from '@/types/identity';

interface IdentitySwitchToastProps {
  feedback: IdentitySwitchFeedback;
  onDismiss: () => void;
  className?: string;
}

/**
 * Toast notification component for identity switch feedback
 */
export const IdentitySwitchToast: React.FC<IdentitySwitchToastProps> = ({
  feedback,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animation effects
  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (feedback.duration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, feedback.duration);
      return () => clearTimeout(timer);
    }
  }, [feedback.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Animation duration
  };

  const getToastStyles = () => {
    const baseStyles = `
      fixed top-4 right-4 z-50 max-w-md w-full
      bg-white dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      rounded-lg shadow-lg
      transform transition-all duration-300 ease-in-out
      ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `;

    const typeStyles = {
      success: 'border-l-4 border-l-green-500',
      error: 'border-l-4 border-l-red-500',
      warning: 'border-l-4 border-l-yellow-500',
      info: 'border-l-4 border-l-blue-500'
    };

    return `${baseStyles} ${typeStyles[feedback.type]} ${className}`;
  };

  const getIconComponent = () => {
    const iconStyles = "w-5 h-5 flex-shrink-0";
    
    switch (feedback.type) {
      case 'success':
        return (
          <svg className={`${iconStyles} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconStyles} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconStyles} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`${iconStyles} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIconComponent()}
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {feedback.title}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {feedback.message}
            </p>
            
            {feedback.actions && feedback.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {feedback.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      handleDismiss();
                    }}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentitySwitchToast;