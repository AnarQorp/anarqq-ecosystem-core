// Key used to store the UCAN token in localStorage
const UCAN_STORAGE_KEY = 'ucan_token';

export interface SessionInfo {
  valid: boolean;
  info?: {
    issuer: string;
    audience: string;
    exp: string;
    cid_profile?: string;
    capabilities: Array<{
      can: string;
      with: string;
    }>;
  };
  error?: string;
}

/**
 * Saves the UCAN token to localStorage
 * @param token The UCAN token to save
 */
export function saveUCAN(token: string): void {
  try {
    localStorage.setItem(UCAN_STORAGE_KEY, token);
  } catch (error) {
    console.error('Failed to save UCAN token:', error);
    throw new Error('Failed to save session');
  }
}

/**
 * Retrieves the UCAN token from localStorage
 * @returns The stored UCAN token or null if not found
 */
export function getUCAN(): string | null {
  try {
    return localStorage.getItem(UCAN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve UCAN token:', error);
    return null;
  }
}

/**
 * Removes the UCAN token from localStorage
 */
export function clearUCAN(): void {
  try {
    localStorage.removeItem(UCAN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear UCAN token:', error);
  }
}

/**
 * Checks if the current session is valid by verifying the stored UCAN token
 * @returns Promise resolving to session validity and info
 */
export async function checkSession(): Promise<SessionInfo> {
  const token = getUCAN();
  
  if (!token) {
    return { valid: false };
  }

  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If the token is invalid, clear it from storage
      clearUCAN();
      return { 
        valid: false,
        error: await response.text().catch(() => 'Invalid session')
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      clearUCAN();
      return { 
        valid: false,
        error: data.error || 'Invalid session'
      };
    }

    return {
      valid: true,
      info: {
        issuer: data.issuer,
        audience: data.audience,
        exp: data.exp,
        capabilities: data.capabilities || []
      }
    };

  } catch (error) {
    console.error('Session check failed:', error);
    // Don't clear the token on network errors
    return { 
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export all functions as a default object for convenience
export default {
  saveUCAN,
  getUCAN,
  clearUCAN,
  checkSession,
};
