
import { encryptData, decryptData, generateKeyPair } from '@/lib/quantumSim';
import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { logFileOperation } from '@/lib/qindex';
import { SquidIdentity, useIdentityStore } from '@/state/identity';
import { initClient } from '@/lib/ipfs-browser';
import { safeLocalStorage } from '@/utils/storage/safeStorage';

// Type definitions for the API responses
interface AuthUser {
  agentDID?: string;
  did?: string;
  email?: string;
  avatar?: string;
  reputation?: number;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthResponse {
  token?: string;
  user?: AuthUser;
  spaceDID?: string;
  space?: string;
  message?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

declare global {
  interface Window {
    localStorage: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
      clear: () => void;
    };
  }
}

/**
 * API Base URL - configuración del backend
 */
// Use process.env for Node.js environment
const API_BASE_URL = (typeof process !== 'undefined' && process.env.VITE_API_URL) || 'http://localhost:3001/api';

/**
 * Derives a DID using Qlock with alias+password
 */
function deriveDID(alias: string, password: string): string {
  const input = `${alias.toLowerCase()}_${password}`;
  let hash = 0;
  for (let i = 0; i < input.length; ++i) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  const didKey = Math.abs(hash).toString(16).padStart(16, '0');
  return `did:qlock:z${didKey}`;
}

/**
 * Generates agent DID for Web3.Storage
 */
async function generateAgentDID(): Promise<{ agentDID: string; client: any }> {
  try {
    const client = await initClient();
    
    // Get agent DID
    let agentDID: string;
    if (client.agent.principal) {
      agentDID = client.agent.principal.did();
    } else if (client.agent.issuer) {
      agentDID = client.agent.issuer.did();
    } else {
      throw new Error('Could not get agent DID');
    }
    
    console.log(`[sQuid] Agent DID generated: ${agentDID}`);
    return { agentDID, client };
    
  } catch (error) {
    console.error('[sQuid] Error generating Agent DID:', error);
    throw new Error(`Error generating Agent DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Function to get Qlock KeyPair simulation (pub and priv)
 */
async function getQlockKeyPair(alias: string, password: string) {
  const { publicKey, privateKey } = await generateKeyPair('QUANTUM');
  return { publicKey, privateKey };
}

/**
 * Checks alias availability in the system
 */
export async function checkAliasAvailability(alias: string): Promise<boolean> {
  try {
    console.log(`[sQuid] Checking alias availability: ${alias}`);
    
    // Check with backend first
    const response = await fetch(`${API_BASE_URL}/auth/check-alias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alias })
    });
    
    if (response.ok) {
      const responseData = await response.json() as ApiResponse<{ available: boolean }>;
      const available = responseData.data?.available ?? true; // Default to true if not specified
      console.log(`[sQuid] Alias ${alias} availability: ${available}`);
      return available;
    }
    
    // If we get here, the endpoint might not exist or there was an error
    console.warn(`[sQuid] Alias check endpoint not available (${response.status}), falling back to local check`);
    
    // Fallback to local check if backend check fails
    const did = deriveDID(alias, 'dummy');
    const logs = (await import('@/lib/qindex')).findLogsByIdentity(did);
    const exists = logs.some((l: any) => l.fileName === 'profile.json');
    console.log(`[sQuid] Local check - Alias ${alias} availability: ${!exists}`);
    
    return !exists;
  } catch (error) {
    console.error('[sQuid] Error checking alias availability:', error);
    // En caso de error, asumimos que el alias está disponible para no bloquear el registro
    return true;
  }
}

/**
 * USER REGISTRATION: real integration with backend
 */
export async function registerUser({ alias, email, password }: { alias: string; email: string; password: string; }) {
  try {
    console.log(`[sQuid] Starting registration for alias: ${alias}`);
    
    // Limpiar datos de sesión en safeLocalStorage
    safeLocalStorage.removeItem('user_did');
    safeLocalStorage.removeItem('user_email');
    safeLocalStorage.removeItem('active_space_did');
    
    // Validar datos de entrada
    if (!alias || !email || !password) {
      throw new Error('Alias, email y contraseña son obligatorios');
    }
    
    // Verificar disponibilidad del alias
    const isAliasAvailable = await checkAliasAvailability(alias);
    if (!isAliasAvailable) {
      throw new Error('El alias ya está en uso. Por favor, elige otro.');
    }

    console.log(`[sQuid] Making request to: ${API_BASE_URL}/auth/register`);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        alias: alias.trim(), 
        email: email.trim().toLowerCase(), 
        password: password // La contraseña ya debería estar hasheada en el frontend
      })
    });

    console.log(`[sQuid] Response status: ${response.status}`);
    
    // Manejar la respuesta
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMessage = responseData.message || 'Error en el registro';
      console.error(`[sQuid] Error response (${response.status}):`, errorMessage);
      throw new Error(`Error en el registro: ${errorMessage}`);
    }

    console.log(`[sQuid] Registration successful:`, responseData);
    
    // Guardar datos de sesión en safeLocalStorage
    if (responseData.user?.did) {
      safeLocalStorage.setItem('user_did', responseData.user.did);
    }
    if (responseData.user?.email) {
      safeLocalStorage.setItem('user_email', responseData.user.email);
    }
    
    if (responseData.spaceDID) {
      safeLocalStorage.setItem('active_space_did', responseData.spaceDID);
    }
    
    // Crear identidad del usuario
    const identity: SquidIdentity = { 
      did: responseData.user?.agentDID || `did:qlock:${Date.now()}`, 
      name: alias, 
      type: 'ROOT', 
      kyc: true, 
      reputation: 100, 
      space: responseData.spaceDID || 'default-space'
    };
    
    return { 
      success: true, 
      identity, 
      spaceDID: responseData.spaceDID, 
      agentDID: responseData.user?.agentDID,
      message: 'Registro exitoso. ¡Bienvenido a AnarQ!'
    };
    
  } catch (error) {
    console.error('[sQuid] registerUser error:', error);
    
    // Proporcionar mensajes de error más amigables
    let errorMessage = 'Error en el registro';
    
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Datos inválidos. Por favor, verifica la información proporcionada.';
      } else if (error.message.includes('409')) {
        errorMessage = 'El usuario ya existe. Por favor, inicia sesión o utiliza otro correo/alias.';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

// Tipos de retorno para las funciones de autenticación
type LoginResult = {
  success: boolean;
  identity: SquidIdentity;
  spaceDID: string;
  message: string;
  userData?: {
    email?: string;
    avatar?: string;
    createdAt?: string;
    lastLogin: string;
  };
};

/**
 * Maneja los errores de autenticación
 */
function handleLoginError(error: unknown): Error {
  let errorMessage = 'Error desconocido durante el inicio de sesión';

  if (error instanceof Error) {
    console.error(`[sQuid] Error en login: ${error.message}`, error);

    if (error.message.includes('network')) {
      errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
    } else if (error.message.includes('401') || error.message.includes('credenciales')) {
      errorMessage = 'Credenciales incorrectas. Verifica tu alias y contraseña.';
    } else {
      errorMessage = error.message;
    }
  } else {
    console.error('[sQuid] Unknown error during login:', error);
    errorMessage = 'Ocurrió un error inesperado';
  }

  return new Error(errorMessage);
}

/**
 * Intenta autenticarse con el backend
 */
async function attemptBackendLogin(alias: string, password: string): Promise<LoginResult> {
  console.log(`[sQuid] Attempting backend login at: ${API_BASE_URL}/auth/login`);
  
  interface LoginRequest {
    alias: string;
    password: string;
  }
  
  interface LoginResponse {
    success: boolean;
    data?: {
      token?: string;
      user?: {
        did?: string;
        email?: string;
        avatar?: string;
        createdAt?: string;
        lastLogin?: string;
      };
      spaceDID?: string;
    };
    error?: string;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        alias: alias.trim(),
        password
      } as { alias: string; password: string })
    });

    const responseData: unknown = await response.json();
    console.log('[sQuid] Backend login response:', responseData);
    
    // Type guard for response data with proper type narrowing
    const isLoginResponse = (data: unknown): data is LoginResponse => {
      if (data === null || typeof data !== 'object') return false;
      const d = data as Record<string, unknown>;
      return (
        'success' in d && 
        (d.data === undefined || (typeof d.data === 'object' && d.data !== null))
      );
    };
    
    if (!isLoginResponse(responseData)) {
      console.error('[sQuid] Invalid response format:', responseData);
      throw new Error('Formato de respuesta inválido');
    }
    
    if (!response.ok) {
      const errorMessage = 'error' in responseData ? String(responseData.error) : 'Error en la autenticación';
      throw new Error(errorMessage);
    }

    if (!responseData.success || !responseData.data) {
      throw new Error(responseData.error || 'Authentication failed');
    }
    
    const { token, user, spaceDID } = responseData.data || {};
    
    // Type guard for user data with proper type narrowing
    const isUserData = (data: unknown): data is { email?: string; avatar?: string; createdAt?: string; lastLogin?: string } => {
      return data === undefined || (data !== null && typeof data === 'object' && !Array.isArray(data));
    };
    
    if (user && !isUserData(user)) {
      console.error('[sQuid] Invalid user data format:', user);
      throw new Error('Datos de usuario inválidos');
    }
    
    // Guardar token de autenticación
    if (token) {
      safeLocalStorage.setItem('auth_token', token);
    }
    
    // Guardar datos de sesión
    const userDID = user?.did || `did:qlock:${Date.now()}`;
    const userSpaceDID = spaceDID || 'default-space';
    
    // Asegurarse de que los datos mínimos requeridos estén presentes
    safeLocalStorage.setItem('active_user_did', userDID);
    safeLocalStorage.setItem('active_space_did', userSpaceDID);
    
    // Guardar datos adicionales del usuario si están disponibles
    if (user?.email) {
      safeLocalStorage.setItem('user_email', user.email);
    }

    // Si no hay delegación, intentar usar una por defecto o generar un token temporal
    if (!safeLocalStorage.getItem('space_delegation_ucan')) {
      console.warn('[sQuid] No se encontró delegación de espacio, usando valor por defecto');
      // Esto es un token de ejemplo - en producción deberías obtenerlo del backend
      const tempDelegation = 'eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiJkaWQ6a2V5Ono2TWtvZEtaTlFUQTZRR3Q5Z1lWaENBQmRqV1FpQlBpSXJqNkZqZz0iLCJzdWIiOiJkaWQ6a2V5Ono2TWtvZEtaTlFUQTZRR3Q5Z1lWaENBQmRqV1FpQlBpSXJqNkZqZz0iLCJhdWQiOiJkaWQ6a2V5Ono2TWtvZEtaTlFUQTZRR3Q5Z1lWaENBQmRqV1FpQlBpSXJqNkZqZz0iLCJpYXQiOjE2MjU1MjQwMDAsImV4cCI6MTY1NzA4MTYwMCwibmJmIjoxNjI1NTI0MDAwLCJzY29wZSI6ImRlZmF1bHQtc3BhY2UifQ.0';
      safeLocalStorage.setItem('space_delegation_ucan', tempDelegation);
    }

    // Crear identidad del usuario
    const identity: SquidIdentity = {
      did: userDID,
      name: alias,
      email: user?.email || '',
      avatar: user?.avatar || '',
      isAuthenticated: true,
      lastLogin: new Date().toISOString(),
      token: token || '',
      permissions: ['read', 'write'],
      provider: 'email',
      type: 'ROOT',
      kyc: true,
      reputation: 100,
      signMessage: async (message: string) => {
        throw new Error('Not implemented');
      },
      encrypt: async (data: string) => {
        if (!token) throw new Error('No token available for encryption');
        const result = await encryptData(data, token);
        return result.encryptedData; // Return just the encrypted string
      },
      decrypt: async (encryptedData: string) => {
        if (!token) throw new Error('No token available for decryption');
        const result = await decryptData(encryptedData, token);
        return typeof result === 'string' ? result : ''; // Ensure string return type
      },
      getToken: () => Promise.resolve(token || '')
    };

    // Actualizar el estado global
    useIdentityStore.getState().setIdentity(identity);

    const result: LoginResult = {
      success: true,
      identity,
      spaceDID: userSpaceDID || '',
      message: 'Autenticación exitosa',
      userData: {
        email: user?.email || '',
        avatar: user?.avatar || '',
        lastLogin: new Date().toISOString(),
        createdAt: user?.createdAt || new Date().toISOString()
      }
    };
    
    return result;
  } catch (error) {
    console.error('[sQuid] Backend login failed:', error);
    throw handleLoginError(error);
  }
}

/**
 * Maneja tanto la autenticación local como la remota
 */
async function attemptLocalLogin(alias: string, password: string): Promise<LoginResult> {
  try {
    console.log('[sQuid] Attempting local login for:', alias);
    
    // Simulate a delay to match backend response time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to get user from local storage
    const storedUser = safeLocalStorage.getItem(`user_${alias}`);
    
    if (!storedUser) {
      throw new Error('Usuario no encontrado');
    }
    
    interface UserData {
      did: string;
      name: string;
      email: string;
      avatar: string;
      createdAt: string;
      lastLogin?: string;
      passwordHash: string;
      spaceDID?: string;
      kyc?: boolean;
      reputation?: number;
    }
    
    let userData: UserData;
    
    try {
      userData = JSON.parse(storedUser);
    } catch (e) {
      console.error('[sQuid] Error parsing stored user data:', e);
      throw new Error('Datos de usuario corruptos');
    }
    
    // In a real app, you would verify the password hash here
    // For now, we'll just check if the password is not empty
    if (!password) {
      throw new Error('Contraseña requerida');
    }
    
    // Create user identity
    const identity: SquidIdentity = {
      did: userData.did,
      name: userData.name || alias,
      email: userData.email,
      avatar: userData.avatar,
      type: 'ROOT',
      kyc: userData.kyc || false,
      reputation: userData.reputation || 100,
      space: userData.spaceDID || 'default-space',
      isAuthenticated: true,
      lastLogin: new Date().toISOString(),
      token: '',
      permissions: ['read', 'write'],
      provider: 'local',
      signMessage: async () => {
        throw new Error('Not implemented');
      },
      encrypt: async (data: string) => {
        const result = await encryptData(data, '');
        return result.encryptedData;
      },
      decrypt: async (encryptedData: string) => {
        const result = await decryptData(encryptedData, '');
        return typeof result === 'string' ? result : '';
      },
      getToken: () => Promise.resolve('')
    };
    
    // Update last login
    userData.lastLogin = new Date().toISOString();
    safeLocalStorage.setItem(`user_${alias}`, JSON.stringify(userData));
    
    // Set the active identity
    useIdentityStore.getState().setIdentity(identity);
    
    return {
      success: true,
      identity,
      spaceDID: userData.spaceDID || '',
      message: 'Inicio de sesión local exitoso',
      userData: {
        email: userData.email,
        avatar: userData.avatar,
        lastLogin: userData.lastLogin,
        createdAt: userData.createdAt
      }
    };
  } catch (error) {
    console.error('[sQuid] Local login failed:', error);
    // Create a default identity for error case
    const errorIdentity: SquidIdentity = {
      did: 'error',
      name: 'Error',
      email: '',
      avatar: '',
      type: 'ROOT',
      kyc: false,
      reputation: 0,
      isAuthenticated: false,
      lastLogin: new Date().toISOString(),
      token: '',
      permissions: [],
      provider: 'error',
      signMessage: async () => { throw new Error('Not implemented'); },
      encrypt: async () => { throw new Error('Not implemented'); },
      decrypt: async () => { throw new Error('Not implemented'); },
      getToken: () => Promise.resolve('')
    };
    
    return {
      success: false,
      identity: errorIdentity,
      spaceDID: '',
      message: error instanceof Error ? error.message : 'Error en el inicio de sesión local',
      userData: {
        email: '',
        avatar: '',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    };
  }
}

/**
 * Maneja tanto la autenticación local como la remota
 */
export async function loginUser(alias: string, password: string): Promise<LoginResult> {
  try {
    console.log(`[sQuid] Starting login for alias: ${alias}`);
    
    // Validar datos de entrada
    if (!alias || !password) {
      throw new Error('Alias y contraseña son obligatorios');
    }
    
    try {
      // Primero intentar con autenticación en el backend
      return await attemptBackendLogin(alias, password);
    } catch (error) {
      console.warn('[sQuid] Backend login failed, falling back to local auth:', error);
      
      // Si falla, intentar con autenticación local
      try {
        return await attemptLocalLogin(alias, password);
      } catch (localError) {
        console.error('[sQuid] Local login failed:', localError);
        throw handleLoginError(localError);
      }
    }
  } catch (error) {
    console.error(`[sQuid] ❌ Login error:`, error);

    let errorMessage = 'Error desconocido durante el inicio de sesión';

    if (error instanceof Error) {
      console.error(`[sQuid] Error en loginUser: ${error.message}`, error);

      if (error.message.includes('network')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (error.message.includes('401') || error.message.includes('credenciales')) {
        errorMessage = 'Credenciales incorrectas. Verifica tu alias y contraseña.';
      } else {
        errorMessage = error.message;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Helper function for password hash
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Logout: clears localStorage and context
 */
export function logoutUser(): void {
  // Limpiar datos de sesión en localStorage
  safeLocalStorage.removeItem('auth_token');
  safeLocalStorage.removeItem('active_user_did');
  safeLocalStorage.removeItem('active_space_did');
  safeLocalStorage.removeItem('space_delegation_ucan');
  safeLocalStorage.removeItem('user_email');
  
  // Limpiar el estado de identidad
  useIdentityStore.getState().clearIdentity();
  console.log('[sQuid] Session cleared');
}
