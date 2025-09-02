/**
 * Tests for useQindexRegistration hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQindexRegistration, RegistrationProgress } from '../useQindexRegistration';
import { ModuleRegistrationService } from '@/services/ModuleRegistrationService';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityManager } from '../useIdentityManager';
import {
  ModuleRegistrationRequest,
  ModuleRegistrationResult,
  ModuleInfo,
  ModuleStatus,
  ModuleRegistrationErrorCode
} from '@/types/qwallet-module-registration';
import { IdentityType } from '@/types/identity';

// Mock dependencies
vi.mock('@/contexts/SessionContext');
vi.mock('../useIdentityManager');
vi.mock('@/services/ModuleRegistrationService');

const mockUseSessionContext = vi.mocked(useSessionContext);
const mockUseIdentityManager = vi.mocked(useIdentityManager);
const mockModuleRegistrationService = vi.mocked(ModuleRegistrationService);

// Mock data
const mockSession = {
  id: 'test-session-id',
  did: 'did:test:user123',
  kyc: true
};

const mockActiveIdentity = {
  did: 'did:test:root123',
  type: IdentityType.ROOT,
  name: 'Test Root Identity',
  status: 'ACTIVE',
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true
  }
} as any;

const mockModuleInfo: ModuleInfo = {
  name: 'TestModule',
  version: '1.0.0',
  description: 'A test module for registration',
  identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
  integrations: ['Qindex', 'Qlock'],
  repositoryUrl: 'https://github.com/test/test-module',
  documentationCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  auditHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
  compliance: {
    audit: true,
    risk_scoring: true,
    privacy_enforced: true,
    kyc_support: false,
    gdpr_compliant: true,
    data_retention_policy: 'standard'
  }
};

const mockRegistrationRequest: ModuleRegistrationRequest = {
  moduleInfo: mockModuleInfo,
  testMode: false,
  skipValidation: false
};

const mockSuccessResult: ModuleRegistrationResult = {
  success: true,
  moduleId: 'TestModule',
  cid: 'QmTestCID123456789',
  indexId: 'test-index-id',
  timestamp: '2024-01-01T00:00:00.000Z'
};

describe('useQindexRegistration', () => {
  let mockServiceInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseSessionContext.mockReturnValue({
      session: mockSession,
      isAuthenticated: true,
      loading: false,
      error: null,
      cid_profile: null,
      setCidProfile: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn()
    });

    mockUseIdentityManager.mockReturnValue({
      activeIdentity: mockActiveIdentity,
      identities: [mockActiveIdentity],
      loading: false,
      error: null,
      createSubidentity: vi.fn(),
      switchIdentity: vi.fn(),
      deleteIdentity: vi.fn(),
      clearError: vi.fn(),
      refreshIdentities: vi.fn(),
      getIdentityStats: vi.fn()
    });

    // Mock service instance
    mockServiceInstance = {
      registerModule: vi.fn(),
      updateModule: vi.fn(),
      deregisterModule: vi.fn(),
      registerSandboxModule: vi.fn(),
      promoteSandboxModule: vi.fn(),
      getModule: vi.fn(),
      searchModules: vi.fn(),
      listModules: vi.fn(),
      verifyModule: vi.fn(),
      getRegistrationStatus: vi.fn(),
      getRegistrationInfo: vi.fn(),
      getRegistrationHistory: vi.fn()
    };

    mockModuleRegistrationService.mockImplementation(() => mockServiceInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useQindexRegistration());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.registrationResult).toBe(null);
      expect(result.current.verificationResult).toBe(null);
      expect(result.current.registrationStatus).toBe(null);
      expect(result.current.formValidation.isValid).toBe(false);
      expect(result.current.formValidation.errors).toEqual({});
      expect(result.current.formValidation.warnings).toEqual({});
      expect(result.current.formValidation.touched).toEqual({});
    });

    it('should create ModuleRegistrationService instance', () => {
      renderHook(() => useQindexRegistration());
      expect(mockModuleRegistrationService).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerModule', () => {
    it('should successfully register a module', async () => {
      mockServiceInstance.registerModule.mockResolvedValue(mockSuccessResult);
      mockServiceInstance.verifyModule.mockResolvedValue({
        moduleId: 'TestModule',
        status: 'production_ready',
        verificationChecks: {
          metadataValid: true,
          signatureValid: true,
          dependenciesResolved: true,
          complianceVerified: true,
          auditPassed: true
        },
        issues: [],
        lastVerified: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'system'
      });
      mockServiceInstance.getRegistrationStatus.mockResolvedValue({
        moduleId: 'TestModule',
        status: ModuleStatus.PRODUCTION_READY,
        registered: true,
        verified: true,
        lastCheck: '2024-01-01T00:00:00.000Z',
        issues: []
      });

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(true);
      expect(registrationResult!.moduleId).toBe('TestModule');
      expect(result.current.registrationResult).toEqual(mockSuccessResult);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.progress?.stage).toBe(RegistrationProgress.COMPLETED);
    });

    it('should handle registration failure', async () => {
      const errorResult: ModuleRegistrationResult = {
        success: false,
        moduleId: 'TestModule',
        error: 'Registration failed due to network error'
      };

      mockServiceInstance.registerModule.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(false);
      expect(registrationResult!.error).toBe('Registration failed due to network error');
      expect(result.current.error).toBe('Registration failed due to network error');
      expect(result.current.progress?.stage).toBe(RegistrationProgress.FAILED);
    });

    it('should validate identity before registration', async () => {
      // Mock unauthenticated state
      mockUseSessionContext.mockReturnValue({
        session: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        cid_profile: null,
        setCidProfile: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn()
      });

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(false);
      expect(registrationResult!.error).toContain('Authentication required');
      expect(mockServiceInstance.registerModule).not.toHaveBeenCalled();
    });

    it('should validate ROOT identity requirement', async () => {
      // Mock non-ROOT identity
      const nonRootIdentity = {
        ...mockActiveIdentity,
        type: IdentityType.DAO
      };

      mockUseIdentityManager.mockReturnValue({
        activeIdentity: nonRootIdentity,
        identities: [nonRootIdentity],
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn()
      });

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(false);
      expect(registrationResult!.error).toContain('Only ROOT identities can register modules');
      expect(mockServiceInstance.registerModule).not.toHaveBeenCalled();
    });

    it('should validate module info before registration', async () => {
      const invalidModuleInfo = {
        ...mockModuleInfo,
        name: '', // Invalid: empty name
        version: 'invalid-version' // Invalid: not semantic version
      };

      const invalidRequest = {
        ...mockRegistrationRequest,
        moduleInfo: invalidModuleInfo
      };

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(invalidRequest);
      });

      expect(registrationResult!.success).toBe(false);
      expect(registrationResult!.error).toContain('Module validation failed');
      expect(mockServiceInstance.registerModule).not.toHaveBeenCalled();
    });

    it('should update progress during registration', async () => {
      mockServiceInstance.registerModule.mockImplementation(async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockSuccessResult;
      });

      mockServiceInstance.verifyModule.mockResolvedValue({
        moduleId: 'TestModule',
        status: 'production_ready',
        verificationChecks: {
          metadataValid: true,
          signatureValid: true,
          dependenciesResolved: true,
          complianceVerified: true,
          auditPassed: true
        },
        issues: [],
        lastVerified: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'system'
      });

      mockServiceInstance.getRegistrationStatus.mockResolvedValue({
        moduleId: 'TestModule',
        status: ModuleStatus.PRODUCTION_READY,
        registered: true,
        verified: true,
        lastCheck: '2024-01-01T00:00:00.000Z',
        issues: []
      });

      const { result } = renderHook(() => useQindexRegistration());

      const progressStages: RegistrationProgress[] = [];
      
      await act(async () => {
        const promise = result.current.registerModule(mockRegistrationRequest);
        
        // Check progress updates
        await waitFor(() => {
          if (result.current.progress) {
            progressStages.push(result.current.progress.stage);
          }
        });
        
        await promise;
      });

      expect(progressStages).toContain(RegistrationProgress.VALIDATING);
      expect(result.current.progress?.stage).toBe(RegistrationProgress.COMPLETED);
    });
  });

  describe('sandbox operations', () => {
    it('should register sandbox module', async () => {
      const sandboxResult = {
        ...mockSuccessResult,
        moduleId: 'TestModule-sandbox'
      };

      mockServiceInstance.registerSandboxModule.mockResolvedValue(sandboxResult);

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerSandboxModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(true);
      expect(mockServiceInstance.registerSandboxModule).toHaveBeenCalledWith(
        mockRegistrationRequest,
        mockActiveIdentity
      );
    });

    it('should promote sandbox module', async () => {
      mockServiceInstance.promoteSandboxModule.mockResolvedValue(true);
      mockServiceInstance.getRegistrationStatus.mockResolvedValue({
        moduleId: 'TestModule',
        status: ModuleStatus.PRODUCTION_READY,
        registered: true,
        verified: true,
        lastCheck: '2024-01-01T00:00:00.000Z',
        issues: []
      });

      const { result } = renderHook(() => useQindexRegistration());

      let promotionResult: boolean;
      await act(async () => {
        promotionResult = await result.current.promoteSandboxModule('TestModule');
      });

      expect(promotionResult!).toBe(true);
      expect(mockServiceInstance.promoteSandboxModule).toHaveBeenCalledWith(
        'TestModule',
        mockActiveIdentity
      );
    });
  });

  describe('form validation', () => {
    it('should validate module info correctly', () => {
      const { result } = renderHook(() => useQindexRegistration());

      const validationResult = result.current.validateModuleInfo(mockModuleInfo);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const { result } = renderHook(() => useQindexRegistration());

      const invalidModuleInfo = {
        name: '', // Invalid: empty
        version: 'invalid', // Invalid: not semantic version
        description: 'short', // Invalid: too short
        repositoryUrl: 'not-a-url', // Invalid: not a URL
        identitiesSupported: [], // Invalid: empty array
        integrations: ['Qindex']
      };

      const validationResult = result.current.validateModuleInfo(invalidModuleInfo);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.errors).toContain('Module name is required');
      expect(validationResult.errors).toContain('Module version must follow semantic versioning (e.g., 1.0.0)');
      expect(validationResult.errors).toContain('Module description must be at least 10 characters');
      expect(validationResult.errors).toContain('Repository URL must be a valid HTTP/HTTPS URL');
      expect(validationResult.errors).toContain('At least one supported identity type is required');
    });

    it('should validate individual fields', () => {
      const { result } = renderHook(() => useQindexRegistration());

      // Valid field
      const validName = result.current.validateField('name', 'ValidModuleName');
      expect(validName.isValid).toBe(true);
      expect(validName.error).toBeUndefined();

      // Invalid field
      const invalidName = result.current.validateField('name', '');
      expect(invalidName.isValid).toBe(false);
      expect(invalidName.error).toBe('Module name is required');

      // Field with warning
      const emptyIntegrations = result.current.validateField('integrations', []);
      expect(emptyIntegrations.isValid).toBe(true);
      expect(emptyIntegrations.warning).toContain('No integrations specified');
    });

    it('should handle field touched state', () => {
      const { result } = renderHook(() => useQindexRegistration());

      act(() => {
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.formValidation.touched.name).toBe(true);
    });

    it('should reset validation state', () => {
      const { result } = renderHook(() => useQindexRegistration());

      // Set some validation state
      act(() => {
        result.current.setFieldTouched('name', true);
      });

      // Reset
      act(() => {
        result.current.resetValidation();
      });

      expect(result.current.formValidation.isValid).toBe(false);
      expect(result.current.formValidation.errors).toEqual({});
      expect(result.current.formValidation.warnings).toEqual({});
      expect(result.current.formValidation.touched).toEqual({});
    });
  });

  describe('utility functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useQindexRegistration());

      // Set error first
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should reset registration state', () => {
      const { result } = renderHook(() => useQindexRegistration());

      act(() => {
        result.current.resetRegistration();
      });

      expect(result.current.registrationResult).toBe(null);
      expect(result.current.verificationResult).toBe(null);
      expect(result.current.registrationStatus).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should cancel registration', () => {
      const { result } = renderHook(() => useQindexRegistration());

      act(() => {
        result.current.cancelRegistration();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.progress?.stage).toBe(RegistrationProgress.IDLE);
    });
  });

  describe('module discovery', () => {
    it('should get module by ID', async () => {
      const mockModule = {
        moduleId: 'TestModule',
        metadata: mockModuleInfo,
        signedMetadata: {} as any,
        registrationInfo: {
          cid: 'QmTestCID',
          indexId: 'test-index',
          registeredAt: '2024-01-01T00:00:00.000Z',
          registeredBy: 'did:test:root123',
          status: ModuleStatus.PRODUCTION_READY,
          verificationStatus: 'VERIFIED' as const
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          dependentModules: []
        }
      };

      mockServiceInstance.getModule.mockResolvedValue(mockModule);

      const { result } = renderHook(() => useQindexRegistration());

      let module: any;
      await act(async () => {
        module = await result.current.getModule('TestModule');
      });

      expect(module).toEqual(mockModule);
      expect(mockServiceInstance.getModule).toHaveBeenCalledWith('TestModule');
    });

    it('should search modules', async () => {
      const mockSearchResult = {
        modules: [],
        totalCount: 0,
        hasMore: false
      };

      mockServiceInstance.searchModules.mockResolvedValue(mockSearchResult);

      const { result } = renderHook(() => useQindexRegistration());

      const searchCriteria = {
        name: 'Test',
        limit: 10
      };

      let searchResult: any;
      await act(async () => {
        searchResult = await result.current.searchModules(searchCriteria);
      });

      expect(searchResult).toEqual(mockSearchResult);
      expect(mockServiceInstance.searchModules).toHaveBeenCalledWith(searchCriteria);
    });

    it('should list modules', async () => {
      const mockListResult = {
        modules: [],
        totalCount: 0,
        hasMore: false
      };

      mockServiceInstance.listModules.mockResolvedValue(mockListResult);

      const { result } = renderHook(() => useQindexRegistration());

      const options = {
        includeTestMode: true,
        limit: 20
      };

      let listResult: any;
      await act(async () => {
        listResult = await result.current.listModules(options);
      });

      expect(listResult).toEqual(mockListResult);
      expect(mockServiceInstance.listModules).toHaveBeenCalledWith(options);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockServiceInstance.registerModule.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => useQindexRegistration());

      let registrationResult: ModuleRegistrationResult;
      await act(async () => {
        registrationResult = await result.current.registerModule(mockRegistrationRequest);
      });

      expect(registrationResult!.success).toBe(false);
      expect(registrationResult!.error).toContain('Service unavailable');
      expect(result.current.error).toContain('Service unavailable');
    });

    it('should handle network errors', async () => {
      mockServiceInstance.getModule.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQindexRegistration());

      let module: any;
      await act(async () => {
        module = await result.current.getModule('TestModule');
      });

      expect(module).toBe(null);
      expect(result.current.error).toContain('Failed to get module');
    });
  });
});