import { useState, useEffect, useCallback } from 'react';
import { checkSession, clearUCAN, SessionInfo } from '../components/auth/session';

export interface UseSessionResult {
  /** The current session data if authenticated */
  session: SessionInfo['info'] | null;
  /** True while checking session status */
  loading: boolean;
  /** Error message if session check fails */
  error: string | null;
  /** Logs out the current user */
  logout: () => void;
  /** Checks the session status */
  checkSession: () => Promise<void>;
  /** True if the user is authenticated */
  isAuthenticated: boolean;
  /** The CID of the user's profile if available */
  cid_profile: string | null;
  /** Updates the user's profile CID */
  setCidProfile: (cid: string) => void;
}

/**
 * Hook to manage user session state and authentication
 * Automatically checks session status on mount and provides utilities for auth state
 */
export function useSession(): UseSessionResult {
  const [session, setSession] = useState<SessionInfo['info'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the current CID profile from session or null if not set
  const cid_profile = session?.cid_profile || null;
  
  // Update the CID profile in the session
  const setCidProfile = useCallback((cid: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, cid_profile: cid };
    });
  }, []);

  /**
   * Check the current session status
   */
  const checkSessionStatus = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkSession();
      
      if (result.valid && result.info) {
        setSession(result.info);
      } else {
        setSession(null);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check session';
      setError(message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Log out the current user
   */
  const logout = useCallback(() => {
    clearUCAN();
    setSession(prev => {
      if (!prev) return null;
      const { cid_profile, ...rest } = prev;
      return rest;
    });
    setError(null);
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSessionStatus();
  }, [checkSessionStatus]);

  return {
    session,
    loading,
    error,
    logout,
    checkSession: checkSessionStatus,
    isAuthenticated: !!session,
    cid_profile,
    setCidProfile,
  };
}

export default useSession;
