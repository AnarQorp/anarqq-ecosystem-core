/**
 * useAuditLogger Hook
 * 
 * React hook for integrating audit logging into DAO components
 * with automatic context detection and privacy-compliant logging.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSessionContext } from '../contexts/SessionContext';
import { getAuditLogger, auditLog, type AuditLogger } from '../utils/audit-logger';
import type { DAORole } from '../utils/dao-permissions';
import type { Membership } from '../composables/useDAO';

interface UseAuditLoggerOptions {
  daoId?: string;
  component?: string;
  autoLogErrors?: boolean;
  logLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditContext {
  userId: string | null;
  sessionId: string | null;
  daoId?: string;
  component?: string;
}

export interface UseAuditLoggerReturn {
  // Logging functions
  logAuthentication: (type: 'attempt' | 'success' | 'failure', details?: any) => void;
  logPermissionCheck: (permission: string, outcome: 'granted' | 'denied', details?: any) => void;
  logWalletOperation: (operation: string, outcome: 'success' | 'failure' | 'error', details?: any) => void;
  logDAOAction: (operation: string, outcome: 'success' | 'failure' | 'error', details?: any) => void;
  logSecurityViolation: (violationType: string, riskScore: number, blocked: boolean, info?: any) => void;
  logError: (error: Error, context?: any) => void;
  logUserAction: (action: string, outcome: 'success' | 'failure' | 'error', details?: any) => void;
  
  // Context helpers
  getContext: () => AuditContext;
  setDaoId: (daoId: string) => void;
  
  // Utility functions
  createActionLogger: (actionType: string) => (outcome: 'success' | 'failure' | 'error', details?: any) => void;
  withAuditLogging: <T extends (...args: any[]) => any>(
    fn: T,
    actionName: string,
    options?: { logArgs?: boolean; logResult?: boolean }
  ) => T;
}

export function useAuditLogger(options: UseAuditLoggerOptions = {}): UseAuditLoggerReturn {
  const { session, isAuthenticated } = useSessionContext();
  const contextRef = useRef<AuditContext>({
    userId: null,
    sessionId: null,
    daoId: options.daoId,
    component: options.component
  });

  // Update context when session changes
  useEffect(() => {
    contextRef.current = {
      userId: isAuthenticated ? session?.issuer || null : null,
      sessionId: session?.id || null,
      daoId: options.daoId,
      component: options.component
    };
  }, [isAuthenticated, session, options.daoId, options.component]);

  // Get current audit context
  const getContext = useCallback((): AuditContext => {
    return { ...contextRef.current };
  }, []);

  // Set DAO ID for context
  const setDaoId = useCallback((daoId: string) => {
    contextRef.current.daoId = daoId;
  }, []);

  // Log authentication events
  const logAuthentication = useCallback((
    type: 'attempt' | 'success' | 'failure',
    details: any = {}
  ) => {
    const context = getContext();
    const enhancedDetails = {
      ...details,
      component: context.component,
      timestamp: new Date().toISOString()
    };
    
    auditLog.auth(type, context.userId, enhancedDetails);
  }, [getContext]);

  // Log permission checks
  const logPermissionCheck = useCallback((
    permission: string,
    outcome: 'granted' | 'denied',
    details: any = {}
  ) => {
    const context = getContext();
    const enhancedDetails = {
      ...details,
      component: context.component,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    };
    
    auditLog.permission(context.userId, permission, outcome, enhancedDetails, context.daoId);
  }, [getContext]);

  // Log wallet operations
  const logWalletOperation = useCallback((
    operation: string,
    outcome: 'success' | 'failure' | 'error',
    details: any = {}
  ) => {
    const context = getContext();
    const enhancedDetails = {
      ...details,
      component: context.component,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    };
    
    if (context.userId) {
      auditLog.wallet(context.userId, operation, outcome, enhancedDetails, context.daoId);
    }
  }, [getContext]);

  // Log DAO actions
  const logDAOAction = useCallback((
    operation: string,
    outcome: 'success' | 'failure' | 'error',
    details: any = {}
  ) => {
    const context = getContext();
    const enhancedDetails = {
      ...details,
      component: context.component,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    };
    
    if (context.userId && context.daoId) {
      auditLog.dao(context.userId, context.daoId, operation, outcome, enhancedDetails);
    }
  }, [getContext]);

  // Log security violations
  const logSecurityViolation = useCallback((
    violationType: string,
    riskScore: number,
    blocked: boolean,
    info: any = {}
  ) => {
    const context = getContext();
    const enhancedInfo = {
      ...info,
      component: context.component,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    };
    
    auditLog.security(context.userId, violationType, riskScore, blocked, enhancedInfo, context.daoId);
  }, [getContext]);

  // Log errors
  const logError = useCallback((error: Error, errorContext: any = {}) => {
    const context = getContext();
    const enhancedContext = {
      ...errorContext,
      userId: context.userId,
      daoId: context.daoId,
      component: context.component,
      sessionId: context.sessionId,
      action: errorContext.action || 'component_error'
    };
    
    auditLog.error(error, enhancedContext);
  }, [getContext]);

  // Log generic user actions
  const logUserAction = useCallback((
    action: string,
    outcome: 'success' | 'failure' | 'error',
    details: any = {}
  ) => {
    const context = getContext();
    
    // Determine the most appropriate logging method based on action type
    if (action.includes('wallet') || action.includes('transfer') || action.includes('mint')) {
      logWalletOperation(action, outcome, details);
    } else if (action.includes('dao') || action.includes('proposal') || action.includes('vote')) {
      logDAOAction(action, outcome, details);
    } else if (action.includes('permission') || action.includes('access')) {
      logPermissionCheck(action, outcome === 'success' ? 'granted' : 'denied', details);
    } else {
      // Generic action logging
      const logger = getAuditLogger();
      logger.logError(new Error(`User action: ${action}`), {
        userId: context.userId,
        daoId: context.daoId,
        action,
        severity: 'low',
        outcome,
        details
      });
    }
  }, [getContext, logWalletOperation, logDAOAction, logPermissionCheck]);

  // Create action-specific logger
  const createActionLogger = useCallback((actionType: string) => {
    return (outcome: 'success' | 'failure' | 'error', details: any = {}) => {
      logUserAction(actionType, outcome, details);
    };
  }, [logUserAction]);

  // Higher-order function to wrap functions with audit logging
  const withAuditLogging = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    actionName: string,
    options: { logArgs?: boolean; logResult?: boolean } = {}
  ): T => {
    return ((...args: any[]) => {
      const startTime = Date.now();
      const context = getContext();
      
      try {
        // Log function start
        const details: any = {
          action: actionName,
          component: context.component,
          startTime: new Date().toISOString()
        };
        
        if (options.logArgs) {
          details.arguments = args.map((arg, index) => ({
            index,
            type: typeof arg,
            value: typeof arg === 'object' ? '[Object]' : String(arg).substring(0, 100)
          }));
        }
        
        logUserAction(`${actionName}_start`, 'success', details);
        
        // Execute function
        const result = fn(...args);
        
        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result
            .then((asyncResult: any) => {
              const endTime = Date.now();
              const successDetails: any = {
                action: actionName,
                duration: endTime - startTime,
                endTime: new Date().toISOString()
              };
              
              if (options.logResult) {
                successDetails.result = typeof asyncResult === 'object' ? '[Object]' : String(asyncResult).substring(0, 100);
              }
              
              logUserAction(`${actionName}_success`, 'success', successDetails);
              return asyncResult;
            })
            .catch((error: Error) => {
              const endTime = Date.now();
              const errorDetails = {
                action: actionName,
                duration: endTime - startTime,
                endTime: new Date().toISOString(),
                error: error.message
              };
              
              logUserAction(`${actionName}_error`, 'error', errorDetails);
              logError(error, { action: actionName });
              throw error;
            });
        } else {
          // Handle synchronous functions
          const endTime = Date.now();
          const successDetails: any = {
            action: actionName,
            duration: endTime - startTime,
            endTime: new Date().toISOString()
          };
          
          if (options.logResult) {
            successDetails.result = typeof result === 'object' ? '[Object]' : String(result).substring(0, 100);
          }
          
          logUserAction(`${actionName}_success`, 'success', successDetails);
          return result;
        }
      } catch (error) {
        const endTime = Date.now();
        const errorDetails = {
          action: actionName,
          duration: endTime - startTime,
          endTime: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        };
        
        logUserAction(`${actionName}_error`, 'error', errorDetails);
        logError(error instanceof Error ? error : new Error(String(error)), { action: actionName });
        throw error;
      }
    }) as T;
  }, [getContext, logUserAction, logError]);

  // Auto-log errors if enabled
  useEffect(() => {
    if (!options.autoLogErrors) return;

    const handleError = (event: ErrorEvent) => {
      logError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        action: 'global_error_handler'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      logError(error, {
        action: 'unhandled_promise_rejection'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [options.autoLogErrors, logError]);

  return {
    logAuthentication,
    logPermissionCheck,
    logWalletOperation,
    logDAOAction,
    logSecurityViolation,
    logError,
    logUserAction,
    getContext,
    setDaoId,
    createActionLogger,
    withAuditLogging
  };
}

/**
 * Higher-order component for automatic audit logging
 */
export function withAuditLogging<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options: UseAuditLoggerOptions = {}
) {
  return function AuditLoggedComponent(props: P) {
    const auditLogger = useAuditLogger({ ...options, component: componentName });
    
    useEffect(() => {
      auditLogger.logUserAction(`${componentName}_mount`, 'success', {
        props: Object.keys(props as any).length
      });
      
      return () => {
        auditLogger.logUserAction(`${componentName}_unmount`, 'success', {});
      };
    }, [auditLogger]);
    
    return <Component {...props} />;
  };
}