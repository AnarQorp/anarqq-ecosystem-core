/**
 * Permission Validator Component
 * Provides real-time validation of wallet operations against Qonsent permissions
 * with visual feedback and suggested actions
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Info, Lock } from 'lucide-react';
import { ExtendedSquidIdentity } from '../../types/identity';
import { WalletOperation, PermissionValidationResult } from '../../services/QonsentWalletService';
import { useQonsentWallet } from '../../hooks/useQonsentWallet';

interface PermissionValidatorProps {
  identity: ExtendedSquidIdentity | null;
  operation: WalletOperation;
  onValidationChange?: (result: PermissionValidationResult) => void;
  autoValidate?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const PermissionValidator: React.FC<PermissionValidatorProps> = ({
  identity,
  operation,
  onValidationChange,
  autoValidate = true,
  showDetails = true,
  className = ''
}) => {
  const [validationResult, setValidationResult] = useState<PermissionValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    validatePermission,
    lastValidationResult,
    loading,
    error
  } = useQonsentWallet(identity, {
    enableRealTimeChecking: true,
    autoValidateOperations: autoValidate
  });

  // Perform validation when operation changes
  useEffect(() => {
    if (autoValidate && identity && operation) {
      performValidation();
    }
  }, [identity, operation, autoValidate]);

  // Update validation result when service result changes
  useEffect(() => {
    if (lastValidationResult) {
      setValidationResult(lastValidationResult);
      onValidationChange?.(lastValidationResult);
    }
  }, [lastValidationResult, onValidationChange]);

  const performValidation = async () => {
    if (!identity || !operation) return;

    setIsValidating(true);
    try {
      const result = await validatePermission(operation);
      setValidationResult(result);
      onValidationChange?.(result);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const getValidationIcon = () => {
    if (isValidating || loading) {
      return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
    }

    if (error) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }

    if (!validationResult) {
      return <Shield className="w-5 h-5 text-gray-400" />;
    }

    if (validationResult.allowed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <Lock className="w-5 h-5 text-red-500" />;
    }
  };

  const getValidationStatus = () => {
    if (isValidating || loading) {
      return { text: 'Validating...', color: 'text-blue-600' };
    }

    if (error) {
      return { text: 'Validation Error', color: 'text-red-600' };
    }

    if (!validationResult) {
      return { text: 'Not Validated', color: 'text-gray-500' };
    }

    if (validationResult.allowed) {
      return { text: 'Permission Granted', color: 'text-green-600' };
    } else {
      return { text: 'Permission Denied', color: 'text-red-600' };
    }
  };

  const getValidationColor = () => {
    if (isValidating || loading) {
      return 'border-blue-200 bg-blue-50';
    }

    if (error) {
      return 'border-red-200 bg-red-50';
    }

    if (!validationResult) {
      return 'border-gray-200 bg-gray-50';
    }

    if (validationResult.allowed) {
      return 'border-green-200 bg-green-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  const formatOperationType = (type: string) => {
    return type.toLowerCase().replace('_', ' ');
  };

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!identity) {
    return (
      <div className={`p-4 border border-gray-200 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Shield className="w-5 h-5" />
          <span>No identity selected for validation</span>
        </div>
      </div>
    );
  }

  const status = getValidationStatus();
  const colorClasses = getValidationColor();

  return (
    <div className={`border rounded-lg p-4 ${colorClasses} ${className}`}>
      {/* Validation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getValidationIcon()}
          <div>
            <h4 className={`font-medium ${status.color}`}>
              {status.text}
            </h4>
            <p className="text-sm text-gray-600">
              {formatOperationType(operation.type)} operation
            </p>
          </div>
        </div>
        {!autoValidate && (
          <button
            onClick={performValidation}
            disabled={isValidating || loading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating || loading ? 'Validating...' : 'Validate'}
          </button>
        )}
      </div>

      {/* Operation Details */}
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Operation:</span>
          <span className="ml-2 text-gray-600 capitalize">
            {formatOperationType(operation.type)}
          </span>
        </div>
        {operation.amount && (
          <div>
            <span className="font-medium text-gray-700">Amount:</span>
            <span className="ml-2 text-gray-600">
              {formatAmount(operation.amount)}
            </span>
          </div>
        )}
        {operation.token && (
          <div>
            <span className="font-medium text-gray-700">Token:</span>
            <span className="ml-2 text-gray-600">{operation.token}</span>
          </div>
        )}
        {operation.recipient && (
          <div className="col-span-2">
            <span className="font-medium text-gray-700">Recipient:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs break-all">
              {operation.recipient}
            </span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Validation Error</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Validation Details */}
      {showDetails && validationResult && (
        <div className="mt-4 space-y-3">
          {/* Permission Reason */}
          {validationResult.permission.reason && (
            <div>
              <h5 className="font-medium text-gray-700 mb-1">Reason</h5>
              <p className="text-sm text-gray-600 bg-white bg-opacity-50 rounded p-2">
                {validationResult.permission.reason}
              </p>
            </div>
          )}

          {/* Conditions */}
          {validationResult.permission.conditions && validationResult.permission.conditions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Conditions</h5>
              <div className="space-y-2">
                {validationResult.permission.conditions.map((condition, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700 capitalize">
                        {condition.type.toLowerCase().replace('_', ' ')}:
                      </span>
                      <span className="ml-1 text-gray-600">{condition.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Limits */}
          {validationResult.dynamicLimits && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Dynamic Limits Applied</h5>
              <div className="bg-white bg-opacity-50 rounded p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {validationResult.dynamicLimits.dailyTransferLimit && (
                    <div>
                      <span className="font-medium text-gray-700">Daily Limit:</span>
                      <span className="ml-1 text-gray-600">
                        {formatAmount(validationResult.dynamicLimits.dailyTransferLimit)}
                      </span>
                    </div>
                  )}
                  {validationResult.dynamicLimits.maxTransactionAmount && (
                    <div>
                      <span className="font-medium text-gray-700">Max Amount:</span>
                      <span className="ml-1 text-gray-600">
                        {formatAmount(validationResult.dynamicLimits.maxTransactionAmount)}
                      </span>
                    </div>
                  )}
                  {validationResult.dynamicLimits.maxTransactionsPerHour && (
                    <div>
                      <span className="font-medium text-gray-700">Hourly Limit:</span>
                      <span className="ml-1 text-gray-600">
                        {validationResult.dynamicLimits.maxTransactionsPerHour} transactions
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Warnings</h5>
              <div className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-orange-700">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {validationResult.suggestedActions && validationResult.suggestedActions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Suggested Actions</h5>
              <div className="space-y-1">
                {validationResult.suggestedActions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Authentication Required */}
          {validationResult.requiresAdditionalAuth && (
            <div className="p-3 bg-yellow-100 border border-yellow-200 rounded">
              <div className="flex items-center space-x-2 text-yellow-700">
                <Lock className="w-4 h-4" />
                <span className="font-medium">Additional Authentication Required</span>
              </div>
              <p className="mt-1 text-sm text-yellow-600">
                This operation requires additional verification before it can be processed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};