/**
 * Permission Change Notifications Component
 * Displays real-time notifications about wallet permission changes
 * from Qonsent policy updates, DAO governance, and risk assessments
 */

import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, X, Info, Shield } from 'lucide-react';
import { ExtendedSquidIdentity } from '../../types/identity';
import { PermissionChangeNotification } from '../../services/QonsentWalletService';
import { useQonsentWallet } from '../../hooks/useQonsentWallet';

interface PermissionChangeNotificationsProps {
  identity: ExtendedSquidIdentity | null;
  className?: string;
  maxNotifications?: number;
  showDismissed?: boolean;
}

export const PermissionChangeNotifications: React.FC<PermissionChangeNotificationsProps> = ({
  identity,
  className = '',
  maxNotifications = 5,
  showDismissed = false
}) => {
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  const {
    pendingNotifications,
    acknowledgeNotification,
    loading,
    error
  } = useQonsentWallet(identity, {
    enableRealTimeChecking: true,
    notificationPollingInterval: 5000
  });

  // Filter notifications based on dismissed state
  const visibleNotifications = pendingNotifications
    .filter(notification => showDismissed || !dismissedNotifications.has(notification.id))
    .slice(0, maxNotifications);

  const handleDismissNotification = async (notificationId: string) => {
    try {
      const success = await acknowledgeNotification(notificationId);
      if (success) {
        setDismissedNotifications(prev => new Set([...prev, notificationId]));
        setExpandedNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const toggleNotificationExpansion = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const getNotificationIcon = (notification: PermissionChangeNotification) => {
    switch (notification.changeType) {
      case 'GRANTED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REVOKED':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'MODIFIED':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'SUSPENDED':
        return <Shield className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (notification: PermissionChangeNotification) => {
    switch (notification.changeType) {
      case 'GRANTED':
        return 'border-green-200 bg-green-50';
      case 'REVOKED':
        return 'border-red-200 bg-red-50';
      case 'MODIFIED':
        return 'border-blue-200 bg-blue-50';
      case 'SUSPENDED':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSourceLabel = (source: PermissionChangeNotification['source']) => {
    switch (source) {
      case 'QONSENT_POLICY':
        return 'Privacy Policy';
      case 'DAO_GOVERNANCE':
        return 'DAO Governance';
      case 'PARENT_OVERRIDE':
        return 'Parental Control';
      case 'RISK_MITIGATION':
        return 'Risk Assessment';
      case 'COMPLIANCE_REQUIREMENT':
        return 'Compliance';
      default:
        return 'System';
    }
  };

  const formatOperationType = (operationType: string) => {
    return operationType.toLowerCase().replace('_', ' ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!identity) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Select an identity to view permission notifications</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 bg-red-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Notification Error</span>
        </div>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (loading && visibleNotifications.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-500">Loading notifications...</p>
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No permission notifications</p>
        <p className="text-sm mt-1">You'll be notified of any wallet permission changes</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>Permission Notifications</span>
        </h3>
        {pendingNotifications.length > maxNotifications && (
          <span className="text-sm text-gray-500">
            Showing {maxNotifications} of {pendingNotifications.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visibleNotifications.map((notification) => {
          const isExpanded = expandedNotifications.has(notification.id);
          const colorClasses = getNotificationColor(notification);

          return (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${colorClasses}`}
            >
              {/* Notification Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {notification.changeType.toLowerCase()} Permission
                      </h4>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-70 rounded-full text-gray-600">
                        {getSourceLabel(notification.source)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatOperationType(notification.operation.type)} operation permissions updated
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{formatTimestamp(notification.timestamp)}</span>
                      {notification.operation.amount && (
                        <span>Amount: {notification.operation.amount}</span>
                      )}
                      {notification.operation.token && (
                        <span>Token: {notification.operation.token}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleNotificationExpansion(notification.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </div>
                  </button>
                  <button
                    onClick={() => handleDismissNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white border-opacity-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Previous Permission */}
                    {notification.previousPermission && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Previous Permission</h5>
                        <div className="bg-white bg-opacity-50 rounded p-3">
                          <p className="text-gray-600">
                            <span className="font-medium">Allowed:</span>{' '}
                            {notification.previousPermission.allowed ? 'Yes' : 'No'}
                          </p>
                          {notification.previousPermission.reason && (
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">Reason:</span>{' '}
                              {notification.previousPermission.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New Permission */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">New Permission</h5>
                      <div className="bg-white bg-opacity-50 rounded p-3">
                        <p className="text-gray-600">
                          <span className="font-medium">Allowed:</span>{' '}
                          {notification.newPermission.allowed ? 'Yes' : 'No'}
                        </p>
                        {notification.newPermission.reason && (
                          <p className="text-gray-600 mt-1">
                            <span className="font-medium">Reason:</span>{' '}
                            {notification.newPermission.reason}
                          </p>
                        )}
                        {notification.newPermission.conditions && notification.newPermission.conditions.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-600">Conditions:</span>
                            <ul className="list-disc list-inside mt-1 text-gray-600">
                              {notification.newPermission.conditions.map((condition, index) => (
                                <li key={index} className="text-xs">
                                  {condition.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operation Details */}
                  {(notification.operation.amount || notification.operation.token || notification.operation.recipient) && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Operation Details</h5>
                      <div className="bg-white bg-opacity-50 rounded p-3 text-sm">
                        {notification.operation.amount && (
                          <p className="text-gray-600">
                            <span className="font-medium">Amount:</span> {notification.operation.amount}
                          </p>
                        )}
                        {notification.operation.token && (
                          <p className="text-gray-600">
                            <span className="font-medium">Token:</span> {notification.operation.token}
                          </p>
                        )}
                        {notification.operation.recipient && (
                          <p className="text-gray-600">
                            <span className="font-medium">Recipient:</span>{' '}
                            <span className="font-mono text-xs">{notification.operation.recipient}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading indicator for real-time updates */}
      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-gray-500">Checking for updates...</span>
        </div>
      )}
    </div>
  );
};