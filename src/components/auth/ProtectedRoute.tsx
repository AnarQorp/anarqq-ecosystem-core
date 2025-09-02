import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionContext } from '../../contexts/SessionContext';

interface ProtectedRouteProps {
  /** The content to render if the user is authenticated */
  children: ReactNode;
  
  /** 
   * Optional redirect path when user is not authenticated
   * @default '/login'
   */
  redirectTo?: string;
  
  /** 
   * Optional loading element to show while checking authentication
   * @default <div>Loading...</div>
   */
  loadingElement?: ReactNode;
}

/**
 * A component that protects routes by checking authentication status.
 * 
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
const ProtectedRoute = ({
  children,
  redirectTo = '/login',
  loadingElement = <div>Loading...</div>,
}: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useSessionContext();

  // Show loading state
  if (loading) {
    return <>{loadingElement}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
