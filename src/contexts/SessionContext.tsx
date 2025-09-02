import * as React from 'react';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { SessionInfo } from '../components/auth/session';
import { useSession } from '../hooks/useSession';

export interface SessionContextType {
  /** The current session data if authenticated */
  session: SessionInfo['info'] | null;
  /** True while checking session status */
  loading: boolean;
  /** Error message if session check fails */
  error: string | null;
  /** True if the user is authenticated */
  isAuthenticated: boolean;
  /** The CID of the user's profile if available */
  cid_profile: string | null;
  /** Updates the user's profile CID */
  setCidProfile: (cid: string) => void;
  /** Logs out the current user */
  logout: () => void;
  /** Checks the session status */
  checkSession: () => Promise<void>;
}

// Create the context with a default value
const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  /** Child components that will have access to the session context */
  children: ReactNode;
  /** Optional initial session state for testing or SSR */
  initialSession?: SessionInfo['info'] | null;
}

/**
 * Provider component that wraps your app and makes the session context available
 * to all child components
 */
export function SessionProvider({ children, initialSession = null }: SessionProviderProps) {
  const {
    session = initialSession,
    loading,
    error,
    isAuthenticated,
    cid_profile,
    setCidProfile,
    logout,
    checkSession,
  } = useSession();

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      session,
      loading,
      error,
      isAuthenticated,
      cid_profile,
      setCidProfile,
      logout,
      checkSession,
    }),
    [session, loading, error, isAuthenticated, cid_profile, setCidProfile, logout, checkSession]
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access the session context
 * @throws {Error} If used outside of a SessionProvider
 */
export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

// Export the context itself in case it's needed for class components
export { SessionContext };
