/**
 * useQindex - React Hook for Qindex Routing and Indexing
 * 
 * Provides routing, permissions, and indexing functionality
 * for the AnarQ&Q ecosystem.
 */

import { useState, useCallback } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import * as QindexAPI from '@/api/qindex';

export interface FileIndexEntry {
  id: string;
  cid: string;
  filename: string;
  timestamp: string;
  privacyLevel: 'private' | 'public';
  owner?: string;
  fileSize?: number;
}

export interface UseQindexReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // File Management
  registerFile: (cid: string, filename: string, privacyLevel?: 'private' | 'public', owner?: string, fileSize?: number) => Promise<FileIndexEntry | null>;
  getFileByCID: (cid: string) => Promise<FileIndexEntry | null>;
  getAllFiles: () => Promise<FileIndexEntry[]>;
  
  // Hash Management
  storeHash: (cid: string, hash: string) => Promise<boolean>;
  verifyHash: (cid: string, localHash: string) => Promise<boolean>;
  generateHash: (content: string) => Promise<string>;
  
  // Permissions
  checkPermission: (module: string, resource: string, action: string) => Promise<boolean>;
  getModulePermissions: (module: string) => Promise<any[]>;
  
  // Routing
  routeRequest: (module: string, endpoint: string, method: string, data: any) => Promise<any>;
  getActiveModules: () => Promise<any[]>;
  
  // Utilities
  clearError: () => void;
}

export const useQindex = (): UseQindexReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerFile = useCallback(async (
    cid: string, 
    filename: string, 
    privacyLevel: 'private' | 'public' = 'private',
    owner?: string,
    fileSize?: number
  ): Promise<FileIndexEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const entry = await QindexAPI.registerFileIndex(
        cid, 
        filename, 
        privacyLevel, 
        owner || session?.id, 
        fileSize
      );
      
      console.log(`[Qindex] Registered file: ${filename} (${cid.substring(0, 16)}...)`);
      
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register file';
      setError(errorMessage);
      console.error('Qindex file registration error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  const getFileByCID = useCallback(async (cid: string): Promise<FileIndexEntry | null> => {
    try {
      setError(null);
      
      const entry = await QindexAPI.getIndexByCID(cid);
      
      if (entry) {
        console.log(`[Qindex] Found file entry for CID: ${cid.substring(0, 16)}...`);
      } else {
        console.log(`[Qindex] No entry found for CID: ${cid.substring(0, 16)}...`);
      }
      
      return entry || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get file';
      setError(errorMessage);
      console.error('Qindex file retrieval error:', err);
      return null;
    }
  }, []);

  const getAllFiles = useCallback(async (): Promise<FileIndexEntry[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const entries = await QindexAPI.getAllIndexEntries();
      
      console.log(`[Qindex] Retrieved ${entries.length} file entries`);
      
      return entries;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get files';
      setError(errorMessage);
      console.error('Qindex files retrieval error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const storeHash = useCallback(async (cid: string, hash: string): Promise<boolean> => {
    try {
      setError(null);
      
      await QindexAPI.storeOriginalHash(cid, hash);
      
      console.log(`[Qindex] Stored hash for CID: ${cid.substring(0, 16)}...`);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store hash';
      setError(errorMessage);
      console.error('Qindex hash storage error:', err);
      return false;
    }
  }, []);

  const verifyHash = useCallback(async (cid: string, localHash: string): Promise<boolean> => {
    try {
      setError(null);
      
      const isValid = await QindexAPI.verifyHash(cid, localHash);
      
      console.log(`[Qindex] Hash verification for ${cid.substring(0, 16)}...: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify hash';
      setError(errorMessage);
      console.error('Qindex hash verification error:', err);
      return false;
    }
  }, []);

  const generateHash = useCallback(async (content: string): Promise<string> => {
    try {
      setError(null);
      
      const hash = await QindexAPI.generateHash(content);
      
      console.log(`[Qindex] Generated hash: ${hash.substring(0, 16)}...`);
      
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate hash';
      setError(errorMessage);
      console.error('Qindex hash generation error:', err);
      throw new Error(errorMessage);
    }
  }, []);

  const checkPermission = useCallback(async (
    module: string, 
    resource: string, 
    action: string
  ): Promise<boolean> => {
    if (!session || !isAuthenticated) return false;
    
    try {
      setError(null);
      
      const identity = {
        did: session.did || session.id,
        verificationLevel: session.kyc ? 'VERIFIED' : 'UNVERIFIED'
      } as any;
      
      const result = await QindexAPI.checkPermission(identity, module, resource, action);
      
      console.log(`[Qindex] Permission check ${module}:${resource}:${action} = ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
      
      return result.allowed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check permission';
      setError(errorMessage);
      console.error('Qindex permission check error:', err);
      return false;
    }
  }, [session, isAuthenticated]);

  const getModulePermissions = useCallback(async (module: string): Promise<any[]> => {
    try {
      setError(null);
      
      const permissions = await QindexAPI.getModulePermissions(module);
      
      console.log(`[Qindex] Retrieved ${permissions.length} permissions for module: ${module}`);
      
      return permissions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get module permissions';
      setError(errorMessage);
      console.error('Qindex module permissions error:', err);
      return [];
    }
  }, []);

  const routeRequest = useCallback(async (
    module: string, 
    endpoint: string, 
    method: string, 
    data: any
  ): Promise<any> => {
    if (!session || !isAuthenticated) {
      throw new Error('Authentication required');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const identity = {
        did: session.did || session.id,
        verificationLevel: session.kyc ? 'VERIFIED' : 'UNVERIFIED'
      } as any;
      
      const result = await QindexAPI.routeRequest(module, endpoint, method, identity, data);
      
      if (result.success) {
        console.log(`[Qindex] Successfully routed request to ${module}:${endpoint}`);
        return result.result;
      } else {
        throw new Error(result.error || 'Request routing failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to route request';
      setError(errorMessage);
      console.error('Qindex request routing error:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [session, isAuthenticated]);

  const getActiveModules = useCallback(async (): Promise<any[]> => {
    try {
      setError(null);
      
      const response = await QindexAPI.getActiveModules();
      
      console.log(`[Qindex] Retrieved ${response.modules.length} active modules`);
      
      return response.modules;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get active modules';
      setError(errorMessage);
      console.error('Qindex active modules error:', err);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    
    // File Management
    registerFile,
    getFileByCID,
    getAllFiles,
    
    // Hash Management
    storeHash,
    verifyHash,
    generateHash,
    
    // Permissions
    checkPermission,
    getModulePermissions,
    
    // Routing
    routeRequest,
    getActiveModules,
    
    // Utilities
    clearError
  };
};