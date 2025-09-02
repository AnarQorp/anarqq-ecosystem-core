/**
 * React Hook for Module Documentation Management
 * Provides state management and operations for module documentation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  moduleDocumentationService,
  DocumentationMetadata,
  DocumentationVersion,
  DocumentationValidationResult,
  DocumentationSearchResult,
  DocumentationUploadOptions,
  DocumentationRetrievalOptions
} from '../services/ModuleDocumentationService';

export interface UseModuleDocumentationOptions {
  moduleId: string;
  version?: string;
  autoLoad?: boolean;
  cacheTimeout?: number;
}

export interface UseModuleDocumentationReturn {
  // State
  documentation: {
    content: string;
    metadata: DocumentationMetadata;
    searchIndex?: any;
  } | null;
  versions: DocumentationVersion[];
  currentVersion: string | null;
  loading: boolean;
  error: string | null;
  validationResult: DocumentationValidationResult | null;
  
  // Actions
  loadDocumentation: (cid?: string, options?: DocumentationRetrievalOptions) => Promise<void>;
  uploadDocumentation: (content: string | Buffer, options: Omit<DocumentationUploadOptions, 'moduleId'>) => Promise<{ cid: string; metadata: DocumentationMetadata }>;
  updateDocumentation: (newVersion: string, content: string | Buffer, options: Omit<DocumentationUploadOptions, 'moduleId' | 'version'>) => Promise<{ cid: string; metadata: DocumentationMetadata }>;
  validateCID: (cid: string) => Promise<DocumentationValidationResult>;
  searchDocumentation: (query: string, options?: any) => Promise<DocumentationSearchResult[]>;
  switchVersion: (version: string) => Promise<void>;
  deprecateVersion: (version: string) => Promise<boolean>;
  refreshVersions: () => Promise<void>;
  clearCache: () => void;
  
  // Computed
  hasDocumentation: boolean;
  isLatestVersion: boolean;
  availableVersions: DocumentationVersion[];
  deprecatedVersions: DocumentationVersion[];
}

export const useModuleDocumentation = (
  options: UseModuleDocumentationOptions
): UseModuleDocumentationReturn => {
  const { moduleId, version, autoLoad = true, cacheTimeout = 300000 } = options; // 5 min cache

  // State
  const [documentation, setDocumentation] = useState<{
    content: string;
    metadata: DocumentationMetadata;
    searchIndex?: any;
  } | null>(null);
  const [versions, setVersions] = useState<DocumentationVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(version || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<DocumentationValidationResult | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  // Load documentation versions
  const refreshVersions = useCallback(async () => {
    try {
      const moduleVersions = await moduleDocumentationService.getDocumentationVersions(moduleId);
      setVersions(moduleVersions);
      
      // Set current version if not already set
      if (!currentVersion && moduleVersions.length > 0) {
        const latest = moduleVersions.find(v => !v.deprecated) || moduleVersions[0];
        setCurrentVersion(latest.version);
      }
    } catch (err) {
      console.error('Error loading documentation versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    }
  }, [moduleId, currentVersion]);

  // Load documentation content
  const loadDocumentation = useCallback(async (
    cid?: string, 
    retrievalOptions?: DocumentationRetrievalOptions
  ) => {
    setLoading(true);
    setError(null);

    try {
      let targetCid = cid;
      
      // If no CID provided, get CID from current version
      if (!targetCid && currentVersion) {
        const versionInfo = versions.find(v => v.version === currentVersion);
        if (versionInfo) {
          targetCid = versionInfo.cid;
        } else {
          throw new Error(`Version ${currentVersion} not found`);
        }
      }

      if (!targetCid) {
        throw new Error('No documentation CID available');
      }

      // Validate CID first
      const validation = await moduleDocumentationService.validateDocumentationCID(targetCid);
      setValidationResult(validation);

      if (!validation.valid || !validation.available) {
        throw new Error(`Documentation not available: ${validation.errors.join(', ')}`);
      }

      // Load documentation content
      const result = await moduleDocumentationService.retrieveDocumentation(targetCid, {
        format: 'parsed',
        includeSearchIndex: true,
        ...retrievalOptions
      });

      setDocumentation({
        content: result.content as string,
        metadata: result.metadata,
        searchIndex: result.searchIndex
      });

      setLastLoadTime(Date.now());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documentation';
      setError(errorMessage);
      console.error('Error loading documentation:', err);
    } finally {
      setLoading(false);
    }
  }, [currentVersion, versions]);

  // Upload new documentation
  const uploadDocumentation = useCallback(async (
    content: string | Buffer,
    uploadOptions: Omit<DocumentationUploadOptions, 'moduleId'>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await moduleDocumentationService.uploadDocumentation(content, {
        ...uploadOptions,
        moduleId
      });

      // Refresh versions after upload
      await refreshVersions();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload documentation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [moduleId, refreshVersions]);

  // Update documentation (create new version)
  const updateDocumentation = useCallback(async (
    newVersion: string,
    content: string | Buffer,
    updateOptions: Omit<DocumentationUploadOptions, 'moduleId' | 'version'>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await moduleDocumentationService.updateDocumentation(
        moduleId,
        newVersion,
        content,
        updateOptions
      );

      // Refresh versions and switch to new version
      await refreshVersions();
      setCurrentVersion(newVersion);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update documentation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [moduleId, refreshVersions]);

  // Validate documentation CID
  const validateCID = useCallback(async (cid: string) => {
    try {
      const result = await moduleDocumentationService.validateDocumentationCID(cid);
      setValidationResult(result);
      return result;
    } catch (err) {
      console.error('Error validating CID:', err);
      const errorResult: DocumentationValidationResult = {
        valid: false,
        available: false,
        errors: [err instanceof Error ? err.message : 'Validation failed'],
        warnings: []
      };
      setValidationResult(errorResult);
      return errorResult;
    }
  }, []);

  // Search documentation
  const searchDocumentation = useCallback(async (
    query: string,
    searchOptions?: any
  ) => {
    try {
      return await moduleDocumentationService.searchDocumentation(query, {
        moduleIds: [moduleId],
        ...searchOptions
      });
    } catch (err) {
      console.error('Error searching documentation:', err);
      return [];
    }
  }, [moduleId]);

  // Switch to different version
  const switchVersion = useCallback(async (newVersion: string) => {
    setCurrentVersion(newVersion);
    await loadDocumentation();
  }, [loadDocumentation]);

  // Deprecate a version
  const deprecateVersion = useCallback(async (versionToDeprecate: string) => {
    try {
      const result = await moduleDocumentationService.deprecateDocumentationVersion(
        moduleId,
        versionToDeprecate
      );
      
      if (result) {
        await refreshVersions();
      }
      
      return result;
    } catch (err) {
      console.error('Error deprecating version:', err);
      return false;
    }
  }, [moduleId, refreshVersions]);

  // Clear cache
  const clearCache = useCallback(() => {
    setDocumentation(null);
    setValidationResult(null);
    setError(null);
    setLastLoadTime(0);
  }, []);

  // Auto-load documentation on mount or when dependencies change
  useEffect(() => {
    if (autoLoad && moduleId) {
      refreshVersions();
    }
  }, [autoLoad, moduleId, refreshVersions]);

  // Load documentation when current version changes
  useEffect(() => {
    if (currentVersion && versions.length > 0) {
      // Check cache timeout
      const now = Date.now();
      if (now - lastLoadTime > cacheTimeout) {
        loadDocumentation();
      }
    }
  }, [currentVersion, versions, loadDocumentation, lastLoadTime, cacheTimeout]);

  // Computed values
  const hasDocumentation = useMemo(() => {
    return documentation !== null && versions.length > 0;
  }, [documentation, versions]);

  const isLatestVersion = useMemo(() => {
    if (!currentVersion || versions.length === 0) return false;
    const nonDeprecatedVersions = versions.filter(v => !v.deprecated);
    if (nonDeprecatedVersions.length === 0) return false;
    
    // Assume versions are sorted by creation date, latest first
    return nonDeprecatedVersions[0].version === currentVersion;
  }, [currentVersion, versions]);

  const availableVersions = useMemo(() => {
    return versions.filter(v => !v.deprecated);
  }, [versions]);

  const deprecatedVersions = useMemo(() => {
    return versions.filter(v => v.deprecated);
  }, [versions]);

  return {
    // State
    documentation,
    versions,
    currentVersion,
    loading,
    error,
    validationResult,
    
    // Actions
    loadDocumentation,
    uploadDocumentation,
    updateDocumentation,
    validateCID,
    searchDocumentation,
    switchVersion,
    deprecateVersion,
    refreshVersions,
    clearCache,
    
    // Computed
    hasDocumentation,
    isLatestVersion,
    availableVersions,
    deprecatedVersions
  };
};

export default useModuleDocumentation;