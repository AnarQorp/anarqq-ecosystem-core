/**
 * Authentication utilities for the AnarQ application
 * Handles JWT token storage and retrieval
 */

const AUTH_TOKEN_KEY = 'anarq_auth_token';

/**
 * Get the auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Set the auth token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

/**
 * Remove the auth token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isAuthenticated,
  getAuthHeader,
};
