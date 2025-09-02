/**
 * QIndex API
 * Simulated backend for routing and permissions
 */

import { Module, Permission, User, Identity, IdentityVerificationLevel } from '@/types';
import { moduleInfo } from '@/utils/mockData';
import { getAvailablePermissions } from '@/lib/permissions';

/**
 * Get available modules for a user
 */
export async function getAvailableModules(user: User): Promise<{
  modules: Module[];
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Calculate available modules based on user's identity levels
  const permissions = getAvailablePermissions(user.primaryIdentity);
  const moduleIds = new Set<string>();
  
  permissions.forEach(permission => {
    moduleIds.add(permission.module);
  });
  
  // Add sub-identity permissions
  user.subIdentities.forEach(identity => {
    const identityPermissions = getAvailablePermissions(identity);
    identityPermissions.forEach(permission => {
      moduleIds.add(permission.module);
    });
  });
  
  // Convert module info to Module objects
  const modules: Module[] = Array.from(moduleIds)
    .filter(id => moduleInfo[id as keyof typeof moduleInfo])
    .map(id => {
      const info = moduleInfo[id as keyof typeof moduleInfo];
      return {
        id,
        name: info.name,
        description: info.description,
        version: info.version,
        active: info.active,
        dependencies: info.dependencies,
        permissions: [],
        endpoints: []
      };
    });
  
  return { modules };
}

/**
 * Check permissions for a specific action
 */
export async function checkPermission(
  identity: Identity,
  module: string,
  resource: string,
  action: string
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Use the permissions library to check
  const modulePermissions = await getModulePermissions(module);
  
  const permission = modulePermissions.find(
    p => p.resource === resource && p.action === action
  );
  
  if (!permission) {
    return {
      allowed: false,
      reason: `Permission not defined: ${resource}:${action} in ${module}`
    };
  }
  
  const allowed = permission.identityTypes.includes(identity.verificationLevel);
  
  return {
    allowed,
    reason: allowed 
      ? `Permitted by identity level: ${identity.verificationLevel}`
      : `Denied. Required level: ${permission.identityTypes.join(' or ')}`
  };
}

/**
 * Get permissions for a module
 */
export async function getModulePermissions(module: string): Promise<Permission[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock permissions based on module
  switch (module) {
    case 'qmail':
      return [
        {
          resource: 'messages',
          action: 'read',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED, IdentityVerificationLevel.UNVERIFIED],
          module: 'qmail'
        },
        {
          resource: 'messages',
          action: 'send',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED],
          module: 'qmail'
        },
        {
          resource: 'messages',
          action: 'delete',
          identityTypes: [IdentityVerificationLevel.ROOT],
          module: 'qmail'
        },
        {
          resource: 'attachments',
          action: 'upload',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED],
          module: 'qmail'
        }
      ];
    
    case 'qlock':
      return [
        {
          resource: 'encryption',
          action: 'use_standard',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED, IdentityVerificationLevel.UNVERIFIED],
          module: 'qlock'
        },
        {
          resource: 'encryption',
          action: 'use_quantum',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED],
          module: 'qlock'
        }
      ];
    
    case 'squid':
      return [
        {
          resource: 'identity',
          action: 'create_sub',
          identityTypes: [IdentityVerificationLevel.ROOT],
          module: 'squid'
        },
        {
          resource: 'identity',
          action: 'verify',
          identityTypes: [IdentityVerificationLevel.UNVERIFIED],
          module: 'squid'
        }
      ];
    
    case 'qonsent':
      return [
        {
          resource: 'privacy',
          action: 'update',
          identityTypes: [IdentityVerificationLevel.ROOT, IdentityVerificationLevel.VERIFIED],
          module: 'qonsent'
        },
        {
          resource: 'data',
          action: 'export',
          identityTypes: [IdentityVerificationLevel.ROOT],
          module: 'qonsent'
        },
        {
          resource: 'account',
          action: 'delete',
          identityTypes: [IdentityVerificationLevel.ROOT],
          module: 'qonsent'
        }
      ];
    
    default:
      return [];
  }
}

/**
 * Route a request to the appropriate module
 * This simulates the internal routing mechanism of QIndex
 */
export async function routeRequest(
  module: string,
  endpoint: string,
  method: string,
  identity: Identity,
  data: any
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 250));
  
  console.log(`[QIndex API] Routing request to ${module}:${endpoint} (${method})`);
  
  // Check if the module exists and is active
  const moduleData = moduleInfo[module as keyof typeof moduleInfo];
  
  if (!moduleData) {
    return {
      success: false,
      error: `Module ${module} not found`
    };
  }
  
  if (!moduleData.active) {
    return {
      success: false,
      error: `Module ${module} is not active`
    };
  }
  
  // In a real implementation, this would route to the actual module
  // Here we'll just return a success response
  
  return {
    success: true,
    result: {
      message: `Request routed to ${module}:${endpoint}`,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Get all active modules
 */
export async function getActiveModules(): Promise<{
  modules: {
    id: string;
    name: string;
    version: string;
    description: string;
  }[];
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const activeModules = Object.entries(moduleInfo)
    .filter(([_, info]) => info.active)
    .map(([id, info]) => ({
      id,
      name: info.name,
      version: info.version,
      description: info.description
    }));
  
  return { modules: activeModules };
}

/**
 * Hash storage for integrity verification
 * In production, this would be stored on blockchain or distributed storage
 */
const hashStorage = new Map<string, string>();

/**
 * Store original file hash for integrity verification
 */
export async function storeOriginalHash(cid: string, hash: string): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  hashStorage.set(cid, hash);
  
  // Also store in localStorage for persistence
  const stored = JSON.parse(localStorage.getItem('qindex_hashes') || '{}');
  stored[cid] = hash;
  localStorage.setItem('qindex_hashes', JSON.stringify(stored));
  
  console.log(`[QIndex] Hash almacenado para CID ${cid}: ${hash.substring(0, 16)}...`);
}

/**
 * Verify file integrity by comparing hashes
 */
export async function verifyHash(cid: string, localHash: string): Promise<boolean> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  console.log(`[QIndex] Verificando integridad para CID: ${cid}`);
  
  // Try to get from memory first
  let originalHash = hashStorage.get(cid);
  
  // If not in memory, try localStorage
  if (!originalHash) {
    const stored = JSON.parse(localStorage.getItem('qindex_hashes') || '{}');
    originalHash = stored[cid];
    
    if (originalHash) {
      // Restore to memory
      hashStorage.set(cid, originalHash);
    }
  }
  
  if (!originalHash) {
    console.warn(`[QIndex] Hash original no encontrado para CID: ${cid}`);
    return false;
  }
  
  const isValid = originalHash === localHash;
  
  console.log(`[QIndex] Verificación ${isValid ? 'EXITOSA' : 'FALLIDA'} para CID: ${cid}`);
  console.log(`[QIndex] Hash original: ${originalHash.substring(0, 16)}...`);
  console.log(`[QIndex] Hash local: ${localHash.substring(0, 16)}...`);
  
  return isValid;
}

/**
 * Generate SHA-256 hash of content
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Estructura para el registro de archivos en el índice
 */
export interface FileIndexEntry {
  id: string;
  cid: string;
  filename: string;
  timestamp: string;
  privacyLevel: 'private' | 'public';
  owner?: string;
  fileSize?: number;
}

/**
 * Mock storage para el índice de archivos
 * En producción esto sería reemplazado por IPFS o blockchain
 */
const fileIndexStorage = new Map<string, FileIndexEntry>();

/**
 * Registra un archivo en el índice de forma estructurada
 * @param cid - Hash CID del archivo subido
 * @param filename - Nombre original del archivo
 * @param privacyLevel - Nivel de privacidad del archivo
 * @param owner - Propietario del archivo (opcional)
 * @param fileSize - Tamaño del archivo (opcional)
 * @returns Promise con la entrada creada
 */
export async function registerFileIndex(
  cid: string,
  filename: string,
  privacyLevel: 'private' | 'public' = 'private',
  owner?: string,
  fileSize?: number
): Promise<FileIndexEntry> {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const entry: FileIndexEntry = {
    id: crypto.randomUUID(),
    cid,
    filename,
    timestamp: new Date().toISOString(),
    privacyLevel,
    owner,
    fileSize
  };
  
  // Almacenar en memoria
  fileIndexStorage.set(cid, entry);
  
  // También persistir en localStorage para mantener entre sesiones
  try {
    const stored = JSON.parse(localStorage.getItem('qindex_file_registry') || '{}');
    stored[cid] = entry;
    localStorage.setItem('qindex_file_registry', JSON.stringify(stored));
  } catch (error) {
    console.error('[QIndex] Error al persistir registro:', error);
  }
  
  console.log(`[QIndex] ✅ Archivo registrado en índice:`, {
    id: entry.id,
    cid: cid.substring(0, 16) + '...',
    filename: entry.filename,
    privacyLevel: entry.privacyLevel
  });
  
  return entry;
}

/**
 * Obtiene la información de un archivo por su CID
 * @param cid - Hash CID del archivo
 * @returns Entrada del índice si existe, undefined si no
 */
export async function getIndexByCID(cid: string): Promise<FileIndexEntry | undefined> {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Intentar obtener de memoria primero
  let entry = fileIndexStorage.get(cid);
  
  // Si no está en memoria, cargar desde localStorage
  if (!entry) {
    try {
      const stored = JSON.parse(localStorage.getItem('qindex_file_registry') || '{}');
      entry = stored[cid];
      
      if (entry) {
        // Restaurar en memoria para accesos futuros
        fileIndexStorage.set(cid, entry);
      }
    } catch (error) {
      console.error('[QIndex] Error al cargar registro:', error);
    }
  }
  
  if (entry) {
    console.log(`[QIndex] 📋 Registro encontrado para CID: ${cid.substring(0, 16)}...`);
  } else {
    console.log(`[QIndex] ❌ No se encontró registro para CID: ${cid.substring(0, 16)}...`);
  }
  
  return entry;
}

/**
 * Obtiene todas las entradas del índice
 * @returns Array con todas las entradas registradas
 */
export async function getAllIndexEntries(): Promise<FileIndexEntry[]> {
  // Cargar desde localStorage si es necesario
  try {
    const stored = JSON.parse(localStorage.getItem('qindex_file_registry') || '{}');
    Object.entries(stored).forEach(([cid, entry]) => {
      if (!fileIndexStorage.has(cid)) {
        fileIndexStorage.set(cid, entry as FileIndexEntry);
      }
    });
  } catch (error) {
    console.error('[QIndex] Error al cargar registros:', error);
  }
  
  return Array.from(fileIndexStorage.values());
}

/**
 * Estructura para logs de eventos de validación de Qerberos
 */
export interface QIndexLogEntry {
  fileHash: string;
  userId: string;
  timestamp: number;
  qerberosStatus: boolean;
}

/**
 * Registra un evento de validación de Qerberos en Qindex
 * @param log - Entrada del log con información de la validación
 * @returns Promise que resuelve con true si el registro es exitoso
 */
export async function registerQerberosValidationEvent(log: QIndexLogEntry): Promise<boolean> {
  console.log(`[QIndex API] Registrando evento de validación de Qerberos...`);
  
  try {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Validar estructura del log
    if (!log.fileHash || !log.userId || !log.timestamp) {
      console.error('[QIndex API] Error: datos incompletos en el log de validación');
      return false;
    }
    
    // Simular almacenamiento en Qindex
    const eventId = crypto.randomUUID();
    const eventLog = {
      id: eventId,
      ...log,
      registeredAt: new Date().toISOString(),
      module: 'qerberos'
    };
    
    // Persistir en localStorage para simulación
    try {
      const existingEvents = JSON.parse(localStorage.getItem('qindex_validation_events') || '[]');
      existingEvents.unshift(eventLog);
      
      // Mantener solo los últimos 500 eventos
      if (existingEvents.length > 500) {
        existingEvents.splice(500);
      }
      
      localStorage.setItem('qindex_validation_events', JSON.stringify(existingEvents));
    } catch (storageError) {
      console.error('[QIndex API] Error al persistir evento:', storageError);
      return false;
    }
    
    console.log(`[QIndex API] ✅ Evento de validación registrado - ID: ${eventId}`);
    console.log(`[QIndex API] Hash: ${log.fileHash.substring(0, 16)}... Usuario: ${log.userId.substring(0, 16)}... Estado: ${log.qerberosStatus ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
    return true;
    
  } catch (error) {
    console.error('[QIndex API] ❌ Error al registrar evento de validación:', error);
    return false;
  }
}

/**
 * Obtiene todos los eventos de validación registrados
 * @returns Array con los eventos de validación
 */
export async function getQerberosValidationEvents(): Promise<any[]> {
  try {
    const stored = localStorage.getItem('qindex_validation_events');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[QIndex API] Error al obtener eventos de validación:', error);
    return [];
  }
}
