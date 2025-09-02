/**
 * useQindexRegistration - React Hook for Module Registration
 * 
 * Provides module registration functionality for UI integration
 * with state management, error handling, and real-time status updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityManager } from './useIdentityManager';
import { ModuleRegistrationService } from '@/services/ModuleRegistrationService';
import {
  ModuleRegistrationRequest,
  ModuleRegistrationResult,
  ModuleInfo,
  ModuleStatus,
  ModuleVerificationResult,
  RegistrationStatus,
  ModuleRegistrationInfo,
  RegisteredModule,
  ModuleSearchCriteria,
  ModuleSearchResult,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ValidationResult,
  RegistrationHistoryEntry
} from '@/types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '@/types/identity';

// Registration progress states
export enum RegistrationProgress {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  GENERATING_METADATA = 'GENERATING_METADATA',
  SIGNING = 'SIGNING',
  UPLOADING = 'UPLOADING',
  VERIFYING = 'VERIFYING',
  LOGGING = 'LOGGING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface RegistrationProgressInfo {
  stage: RegistrationProgress;
  message: string;
  progress: number; // 0-100
  timestamp: string;
}

export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface UseQindexRegistrationReturn {
  // State
  loading: boolean;
  error: string | null;
  progress: RegistrationProgressInfo | null;
  
  // Registration state
  registrationResult: ModuleRegistrationResult | null;
  verificationResult: ModuleVerificationResult | null;
  registrationStatus: RegistrationStatus | null;
  
  // Form validation
  formValidation: FormValidationState;
  
  // Core registration operations
  registerModule: (request: ModuleRegistrationRequest) => Promise<ModuleRegistrationResult>;
  updateModule: (moduleId: string, updates: Partial<ModuleInfo>) => Promise<ModuleRegistrationResult>;
  deregisterModule: (moduleId: string) => Promise<boolean>;
  
  // Sandbox operations
  registerSandboxModule: (request: ModuleRegistrationRequest) => Promise<ModuleRegistrationResult>;
  promoteSandboxModule: (moduleId: string) => Promise<boolean>;
  
  // Module discovery
  getModule: (moduleId: string) => Promise<RegisteredModule | null>;
  searchModules: (criteria: ModuleSearchCriteria) => Promise<ModuleSearchResult>;
  listModules: (options?: { includeTestMode?: boolean; limit?: number; offset?: number }) => Promise<ModuleSearchResult>;
  
  // Verification and status
  verifyModule: (moduleId: string) => Promise<ModuleVerificationResult>;
  getRegistrationStatus: (moduleId: string) => Promise<RegistrationStatus>;
  getRegistrationInfo: (moduleId: string) => Promise<ModuleRegistrationInfo | null>;
  getRegistrationHistory: (moduleId: string) => Promise<RegistrationHistoryEntry[]>;
  
  // Form validation
  validateModuleInfo: (moduleInfo: Partial<ModuleInfo>) => ValidationResult;
  validateField: (field: keyof ModuleInfo, value: any) => { isValid: boolean; error?: string; warning?: string };
  setFieldTouched: (field: keyof ModuleInfo, touched: boolean) => void;
  resetValidation: () => void;
  
  // Utilities
  clearError: () => void;
  resetRegistration: () => void;
  cancelRegistration: () => void;
}

export const useQindexRegistration = (): UseQindexRegistrationReturn => {
  const { session, isAuthenticated } = useSessionContext();
  const { activeIdentity } = useIdentityManager();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RegistrationProgressInfo | null>(null);
  
  // Registration state
  const [registrationResult, setRegistrationResult] = useState<ModuleRegistrationResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<ModuleVerificationResult | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  
  // Form validation state
  const [formValidation, setFormValidation] = useState<FormValidationState>({
    isValid: false,
    errors: {},
    warnings: {},
    touched: {}
  });
  
  // Service instance and cancellation
  const serviceRef = useRef<ModuleRegistrationService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new ModuleRegistrationService();
    }
  }, []);
  
  // Update progress with timestamp
  const updateProgress = useCallback((stage: RegistrationProgress, message: string, progressPercent: number = 0) => {
    setProgress({
      stage,
      message,
      progress: progressPercent,
      timestamp: new Date().toISOString()
    });
  }, []);
  
  // Validate that user has proper identity for registration
  const validateIdentityForRegistration = useCallback((): ExtendedSquidIdentity => {
    if (!isAuthenticated || !session) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'Authentication required for module registration'
      );
    }
    
    if (!activeIdentity) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'No active identity found. Please select an identity.'
      );
    }
    
    if (activeIdentity.type !== IdentityType.ROOT) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'Only ROOT identities can register modules'
      );
    }
    
    return activeIdentity;
  }, [isAuthenticated, session, activeIdentity]);
  
  // Core registration function
  const registerModule = useCallback(async (request: ModuleRegistrationRequest): Promise<ModuleRegistrationResult> => {
    try {
      setLoading(true);
      setError(null);
      setRegistrationResult(null);
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      console.log(`[useQindexRegistration] Starting registration for module: ${request.moduleInfo.name}`);
      
      // Validate identity
      updateProgress(RegistrationProgress.VALIDATING, 'Validating identity and permissions...', 10);
      const signerIdentity = validateIdentityForRegistration();
      
      // Validate module info
      updateProgress(RegistrationProgress.VALIDATING, 'Validating module information...', 20);
      const validation = validateModuleInfo(request.moduleInfo);
      if (!validation.valid) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.INVALID_METADATA,
          `Module validation failed: ${validation.errors.join(', ')}`,
          request.moduleInfo.name
        );
      }
      
      // Generate metadata
      updateProgress(RegistrationProgress.GENERATING_METADATA, 'Generating module metadata...', 30);
      
      // Sign metadata
      updateProgress(RegistrationProgress.SIGNING, 'Signing module metadata...', 50);
      
      // Upload to Qindex
      updateProgress(RegistrationProgress.UPLOADING, 'Registering with Qindex...', 70);
      
      // Perform registration
      const result = await serviceRef.current!.registerModule(request, signerIdentity);
      
      if (result.success) {
        // Verify registration
        updateProgress(RegistrationProgress.VERIFYING, 'Verifying registration...', 85);
        const verification = await serviceRef.current!.verifyModule(result.moduleId);
        setVerificationResult(verification);
        
        // Get status
        const status = await serviceRef.current!.getRegistrationStatus(result.moduleId);
        setRegistrationStatus(status);
        
        // Log completion
        updateProgress(RegistrationProgress.LOGGING, 'Logging registration event...', 95);
        
        // Complete
        updateProgress(RegistrationProgress.COMPLETED, 'Registration completed successfully!', 100);
        
        console.log(`[useQindexRegistration] Successfully registered module: ${result.moduleId}`);
      } else {
        updateProgress(RegistrationProgress.FAILED, result.error || 'Registration failed', 0);
        setError(result.error || 'Registration failed');
      }
      
      setRegistrationResult(result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof ModuleRegistrationError 
        ? err.message 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error occurred during registration';
      
      console.error('[useQindexRegistration] Registration error:', err);
      setError(errorMessage);
      updateProgress(RegistrationProgress.FAILED, errorMessage, 0);
      
      return {
        success: false,
        moduleId: request.moduleInfo.name,
        error: errorMessage
      };
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [validateIdentityForRegistration, updateProgress]);
  
  // Update module
  const updateModule = useCallback(async (
    moduleId: string, 
    updates: Partial<ModuleInfo>
  ): Promise<ModuleRegistrationResult> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useQindexRegistration] Updating module: ${moduleId}`);
      
      const signerIdentity = validateIdentityForRegistration();
      const result = await serviceRef.current!.updateModule(moduleId, updates, signerIdentity);
      
      if (result.success) {
        // Refresh verification and status
        const verification = await serviceRef.current!.verifyModule(moduleId);
        const status = await serviceRef.current!.getRegistrationStatus(moduleId);
        
        setVerificationResult(verification);
        setRegistrationStatus(status);
        
        console.log(`[useQindexRegistration] Successfully updated module: ${moduleId}`);
      } else {
        setError(result.error || 'Update failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof ModuleRegistrationError 
        ? err.userMessage 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error occurred during update';
      
      console.error('[useQindexRegistration] Update error:', err);
      setError(errorMessage);
      
      return {
        success: false,
        moduleId,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [validateIdentityForRegistration]);
  
  // Deregister module
  const deregisterModule = useCallback(async (moduleId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useQindexRegistration] Deregistering module: ${moduleId}`);
      
      const signerIdentity = validateIdentityForRegistration();
      const result = await serviceRef.current!.deregisterModule(moduleId, signerIdentity);
      
      if (result) {
        console.log(`[useQindexRegistration] Successfully deregistered module: ${moduleId}`);
        // Clear related state
        setRegistrationResult(null);
        setVerificationResult(null);
        setRegistrationStatus(null);
      } else {
        setError('Deregistration failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof ModuleRegistrationError 
        ? err.userMessage 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error occurred during deregistration';
      
      console.error('[useQindexRegistration] Deregistration error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [validateIdentityForRegistration]);
  
  // Sandbox registration
  const registerSandboxModule = useCallback(async (request: ModuleRegistrationRequest): Promise<ModuleRegistrationResult> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useQindexRegistration] Starting sandbox registration for module: ${request.moduleInfo.name}`);
      
      const signerIdentity = validateIdentityForRegistration();
      const result = await serviceRef.current!.registerSandboxModule(request, signerIdentity);
      
      if (result.success) {
        console.log(`[useQindexRegistration] Successfully registered sandbox module: ${result.moduleId}`);
      } else {
        setError(result.error || 'Sandbox registration failed');
      }
      
      setRegistrationResult(result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof ModuleRegistrationError 
        ? err.userMessage 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error occurred during sandbox registration';
      
      console.error('[useQindexRegistration] Sandbox registration error:', err);
      setError(errorMessage);
      
      return {
        success: false,
        moduleId: request.moduleInfo.name,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [validateIdentityForRegistration]);
  
  // Promote sandbox module
  const promoteSandboxModule = useCallback(async (moduleId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useQindexRegistration] Promoting sandbox module: ${moduleId}`);
      
      const signerIdentity = validateIdentityForRegistration();
      const result = await serviceRef.current!.promoteSandboxModule(moduleId, signerIdentity);
      
      if (result) {
        console.log(`[useQindexRegistration] Successfully promoted module: ${moduleId}`);
        // Refresh status
        const status = await serviceRef.current!.getRegistrationStatus(moduleId);
        setRegistrationStatus(status);
      } else {
        setError('Module promotion failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof ModuleRegistrationError 
        ? err.userMessage 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error occurred during promotion';
      
      console.error('[useQindexRegistration] Promotion error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [validateIdentityForRegistration]);
  
  // Get module
  const getModule = useCallback(async (moduleId: string): Promise<RegisteredModule | null> => {
    try {
      setError(null);
      return await serviceRef.current!.getModule(moduleId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get module';
      console.error('[useQindexRegistration] Get module error:', err);
      setError(errorMessage);
      return null;
    }
  }, []);
  
  // Search modules
  const searchModules = useCallback(async (criteria: ModuleSearchCriteria): Promise<ModuleSearchResult> => {
    try {
      setError(null);
      return await serviceRef.current!.searchModules(criteria);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search modules';
      console.error('[useQindexRegistration] Search modules error:', err);
      setError(errorMessage);
      return { modules: [], totalCount: 0, hasMore: false };
    }
  }, []);
  
  // List modules
  const listModules = useCallback(async (options?: { 
    includeTestMode?: boolean; 
    limit?: number; 
    offset?: number 
  }): Promise<ModuleSearchResult> => {
    try {
      setError(null);
      return await serviceRef.current!.listModules(options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list modules';
      console.error('[useQindexRegistration] List modules error:', err);
      setError(errorMessage);
      return { modules: [], totalCount: 0, hasMore: false };
    }
  }, []);
  
  // Verify module
  const verifyModule = useCallback(async (moduleId: string): Promise<ModuleVerificationResult> => {
    try {
      setError(null);
      const result = await serviceRef.current!.verifyModule(moduleId);
      setVerificationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify module';
      console.error('[useQindexRegistration] Verify module error:', err);
      setError(errorMessage);
      
      return {
        moduleId,
        status: 'invalid',
        verificationChecks: {
          metadataValid: false,
          signatureValid: false,
          dependenciesResolved: false,
          complianceVerified: false,
          auditPassed: false
        },
        issues: [{
          severity: 'ERROR',
          code: 'VERIFICATION_ERROR',
          message: errorMessage
        }],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      };
    }
  }, []);
  
  // Get registration status
  const getRegistrationStatus = useCallback(async (moduleId: string): Promise<RegistrationStatus> => {
    try {
      setError(null);
      const result = await serviceRef.current!.getRegistrationStatus(moduleId);
      setRegistrationStatus(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get registration status';
      console.error('[useQindexRegistration] Get status error:', err);
      setError(errorMessage);
      
      return {
        moduleId,
        status: ModuleStatus.DEVELOPMENT,
        registered: false,
        verified: false,
        lastCheck: new Date().toISOString(),
        issues: [errorMessage]
      };
    }
  }, []);
  
  // Get registration info
  const getRegistrationInfo = useCallback(async (moduleId: string): Promise<ModuleRegistrationInfo | null> => {
    try {
      setError(null);
      return await serviceRef.current!.getRegistrationInfo(moduleId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get registration info';
      console.error('[useQindexRegistration] Get registration info error:', err);
      setError(errorMessage);
      return null;
    }
  }, []);
  
  // Get registration history
  const getRegistrationHistory = useCallback(async (moduleId: string): Promise<RegistrationHistoryEntry[]> => {
    try {
      setError(null);
      return await serviceRef.current!.getRegistrationHistory(moduleId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get registration history';
      console.error('[useQindexRegistration] Get history error:', err);
      setError(errorMessage);
      return [];
    }
  }, []);
  
  // Validate module info
  const validateModuleInfo = useCallback((moduleInfo: Partial<ModuleInfo>): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required field validation
    if (!moduleInfo.name || moduleInfo.name.trim().length === 0) {
      errors.push('Module name is required');
    } else if (moduleInfo.name.length < 3) {
      errors.push('Module name must be at least 3 characters');
    } else if (moduleInfo.name.length > 50) {
      errors.push('Module name must be less than 50 characters');
    }
    
    if (!moduleInfo.version || moduleInfo.version.trim().length === 0) {
      errors.push('Module version is required');
    } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(moduleInfo.version)) {
      errors.push('Module version must follow semantic versioning (e.g., 1.0.0)');
    }
    
    if (!moduleInfo.description || moduleInfo.description.trim().length === 0) {
      errors.push('Module description is required');
    } else if (moduleInfo.description.length < 10) {
      errors.push('Module description must be at least 10 characters');
    } else if (moduleInfo.description.length > 500) {
      errors.push('Module description must be less than 500 characters');
    }
    
    if (!moduleInfo.repositoryUrl || moduleInfo.repositoryUrl.trim().length === 0) {
      errors.push('Repository URL is required');
    } else if (!/^https?:\/\/[^\s]+$/.test(moduleInfo.repositoryUrl)) {
      errors.push('Repository URL must be a valid HTTP/HTTPS URL');
    }
    
    if (!moduleInfo.identitiesSupported || moduleInfo.identitiesSupported.length === 0) {
      errors.push('At least one supported identity type is required');
    }
    
    if (!moduleInfo.integrations || moduleInfo.integrations.length === 0) {
      warnings.push('No integrations specified - module may have limited functionality');
    }
    
    // Optional field validation
    if (moduleInfo.documentationCid && !/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(moduleInfo.documentationCid)) {
      errors.push('Documentation CID must be a valid IPFS CID');
    }
    
    if (moduleInfo.auditHash && !/^[a-f0-9]{64}$/i.test(moduleInfo.auditHash)) {
      errors.push('Audit hash must be a valid SHA256 hash');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);
  
  // Validate individual field
  const validateField = useCallback((field: keyof ModuleInfo, value: any): { isValid: boolean; error?: string; warning?: string } => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          return { isValid: false, error: 'Module name is required' };
        }
        if (value.length < 3) {
          return { isValid: false, error: 'Module name must be at least 3 characters' };
        }
        if (value.length > 50) {
          return { isValid: false, error: 'Module name must be less than 50 characters' };
        }
        return { isValid: true };
        
      case 'version':
        if (!value || value.trim().length === 0) {
          return { isValid: false, error: 'Module version is required' };
        }
        if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(value)) {
          return { isValid: false, error: 'Version must follow semantic versioning (e.g., 1.0.0)' };
        }
        return { isValid: true };
        
      case 'description':
        if (!value || value.trim().length === 0) {
          return { isValid: false, error: 'Module description is required' };
        }
        if (value.length < 10) {
          return { isValid: false, error: 'Description must be at least 10 characters' };
        }
        if (value.length > 500) {
          return { isValid: false, error: 'Description must be less than 500 characters' };
        }
        return { isValid: true };
        
      case 'repositoryUrl':
        if (!value || value.trim().length === 0) {
          return { isValid: false, error: 'Repository URL is required' };
        }
        if (!/^https?:\/\/[^\s]+$/.test(value)) {
          return { isValid: false, error: 'Must be a valid HTTP/HTTPS URL' };
        }
        return { isValid: true };
        
      case 'identitiesSupported':
        if (!value || value.length === 0) {
          return { isValid: false, error: 'At least one supported identity type is required' };
        }
        return { isValid: true };
        
      case 'integrations':
        if (!value || value.length === 0) {
          return { isValid: true, warning: 'No integrations specified - module may have limited functionality' };
        }
        return { isValid: true };
        
      case 'documentationCid':
        if (value && !/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(value)) {
          return { isValid: false, error: 'Must be a valid IPFS CID' };
        }
        return { isValid: true };
        
      case 'auditHash':
        if (value && !/^[a-f0-9]{64}$/i.test(value)) {
          return { isValid: false, error: 'Must be a valid SHA256 hash' };
        }
        return { isValid: true };
        
      default:
        return { isValid: true };
    }
  }, []);
  
  // Set field as touched
  const setFieldTouched = useCallback((field: keyof ModuleInfo, touched: boolean) => {
    setFormValidation(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: touched
      }
    }));
  }, []);
  
  // Reset validation state
  const resetValidation = useCallback(() => {
    setFormValidation({
      isValid: false,
      errors: {},
      warnings: {},
      touched: {}
    });
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Reset registration state
  const resetRegistration = useCallback(() => {
    setRegistrationResult(null);
    setVerificationResult(null);
    setRegistrationStatus(null);
    setProgress(null);
    setError(null);
    resetValidation();
  }, [resetValidation]);
  
  // Cancel ongoing registration
  const cancelRegistration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    updateProgress(RegistrationProgress.IDLE, 'Registration cancelled', 0);
  }, [updateProgress]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    // State
    loading,
    error,
    progress,
    
    // Registration state
    registrationResult,
    verificationResult,
    registrationStatus,
    
    // Form validation
    formValidation,
    
    // Core registration operations
    registerModule,
    updateModule,
    deregisterModule,
    
    // Sandbox operations
    registerSandboxModule,
    promoteSandboxModule,
    
    // Module discovery
    getModule,
    searchModules,
    listModules,
    
    // Verification and status
    verifyModule,
    getRegistrationStatus,
    getRegistrationInfo,
    getRegistrationHistory,
    
    // Form validation
    validateModuleInfo,
    validateField,
    setFieldTouched,
    resetValidation,
    
    // Utilities
    clearError,
    resetRegistration,
    cancelRegistration
  };
};

export default useQindexRegistration;