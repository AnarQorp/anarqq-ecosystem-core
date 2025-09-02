/**
 * Wallet Error Display Component
 * Provides user-friendly error messages and suggested actions for wallet errors
 * Requirements: 6.6, Error handling design
 */

import React, { useState, useEffect } from 'react';
import {
  WalletError,
  WalletErrorSeverity,
  ErrorMessage,
  RecoveryStrategy
} from '../../types/wallet-errors';

import { walletErrorHandler } from '../../services/identity/WalletErrorHandler';

interface WalletErrorDisplayProps {
  error: WalletError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onContactSupport?: () => void;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export const WalletErrorDisplay: React.FC<WalletErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  className = '',
  compact = false,
  showDetails = false
}) => {
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (error) {
      const message = walletErrorHandler.getUserMessage(error);
      setErrorMessage(message);
    } else {
      setErrorMessage(null);
    }
  }, [error]);

  if (!error || !errorMessage) {
    return null;
  }

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Default support contact behavior
      window.open('/support', '_blank');
    }
  };

  const getSeverityStyles = (severity: WalletErrorSeverity): string => {
    switch (severity) {
      case WalletErrorSeverity.LOW:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case WalletErrorSeverity.MEDIUM:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case WalletErrorSeverity.HIGH:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case WalletErrorSeverity.CRITICAL:
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: WalletErrorSeverity): string => {
    switch (severity) {
      case WalletErrorSeverity.LOW:
        return '💡';
      case WalletErrorSeverity.MEDIUM:
        return '⚠️';
      case WalletErrorSeverity.HIGH:
        return '❌';
      case WalletErrorSeverity.CRITICAL:
        return '🚨';
      default:
        return '❓';
    }
  };

  const canRetry = error.retryable && error.recoveryStrategy === RecoveryStrategy.RETRY;
  const needsUserAction = error.recoveryStrategy === RecoveryStrategy.USER_ACTION;
  const shouldEscalate = error.recoveryStrategy === RecoveryStrategy.ESCALATE;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 p-2 rounded-md border ${getSeverityStyles(error.severity)} ${className}`}>
        <span className="text-sm">{getSeverityIcon(error.severity)}</span>
        <span className="text-sm font-medium">{errorMessage.title}</span>
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        {onDismiss && errorMessage.dismissible && (
          <button
            onClick={onDismiss}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${getSeverityStyles(error.severity)} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{getSeverityIcon(error.severity)}</span>
          <div>
            <h3 className="font-semibold text-lg">{errorMessage.title}</h3>
            <p className="text-sm mt-1">{errorMessage.description}</p>
          </div>
        </div>
        {onDismiss && errorMessage.dismissible && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggested Actions */}
      {error.suggestedActions.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-sm mb-2">What you can do:</h4>
          <ul className="text-sm space-y-1">
            {error.suggestedActions.map((action, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-gray-400">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isRetrying ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </button>
        )}

        {needsUserAction && errorMessage.actionText && errorMessage.actionUrl && (
          <a
            href={errorMessage.actionUrl}
            className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            {errorMessage.actionText}
          </a>
        )}

        {(shouldEscalate || error.contactSupport) && (
          <button
            onClick={handleContactSupport}
            className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Contact Support
          </button>
        )}

        {errorMessage.helpUrl && (
          <a
            href={errorMessage.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Learn More
          </a>
        )}
      </div>

      {/* Error Details (Expandable) */}
      {showDetails && (
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
          >
            <span>{showFullDetails ? '▼' : '▶'}</span>
            <span>Technical Details</span>
          </button>
          
          {showFullDetails && (
            <div className="mt-2 text-xs bg-white bg-opacity-50 p-3 rounded border">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Error Type:</span> {error.type}
                </div>
                <div>
                  <span className="font-medium">Error Code:</span> {error.code}
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span> {new Date(error.timestamp).toLocaleString()}
                </div>
                {error.identityId && (
                  <div>
                    <span className="font-medium">Identity:</span> {error.identityId}
                  </div>
                )}
                {error.operation && (
                  <div>
                    <span className="font-medium">Operation:</span> {error.operation}
                  </div>
                )}
                {error.requestId && (
                  <div>
                    <span className="font-medium">Request ID:</span> {error.requestId}
                  </div>
                )}
                <div>
                  <span className="font-medium">Recoverable:</span> {error.recoverable ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Recovery Strategy:</span> {error.recoveryStrategy}
                </div>
                {error.details && (
                  <div>
                    <span className="font-medium">Details:</span>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recovery Progress */}
      {error.recoveryStrategy === RecoveryStrategy.RETRY && error.maxRetries && (
        <div className="mt-4 border-t pt-4">
          <div className="text-xs text-gray-600">
            Recovery attempts: {error.maxRetries > 0 ? `0/${error.maxRetries}` : 'Unlimited'}
          </div>
          {error.retryDelay && (
            <div className="text-xs text-gray-600">
              Retry delay: {error.retryDelay}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletErrorDisplay;