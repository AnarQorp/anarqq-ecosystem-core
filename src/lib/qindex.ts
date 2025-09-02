
/**
 * Qindex - Módulo de registro de archivos
 * 
 * Gestiona el registro de archivos en el sistema Qindex
 * Integrado con sQuid para tracking por DID y espacio
 */

// Simulación de registro en memoria
const registeredHashes = new Set<string>();

// Nueva estructura para logs detallados de archivos con DID y espacio
export interface FileLog {
  id: string;
  ipfsHash: string;
  encryptedHash: string;
  identityDID: string;
  space: string; // Espacio Web3.Storage asociado
  timestamp: string;
  fileName?: string;
  fileSize?: number;
  operation: 'UPLOAD' | 'ACCESS' | 'VERIFY';
  aesKey?: string; // Clave AES usada (almacenada de forma segura)
  cid_profile?: string; // CID del perfil sQuid del usuario que subió el archivo
  metadata?: Record<string, any>; // Metadatos adicionales
}

// Interfaz para logs de eventos de validación de Qerberos
export interface QIndexLogEntry {
  fileHash: string;
  userId: string;
  timestamp: number;
  qerberosStatus: boolean;
}

// Almacenamiento de logs de archivos para Qerberos
const fileLogs: FileLog[] = [];

/**
 * Registra una entrada en Qindex
 * @param hash - Hash del archivo
 * @param userId - ID del usuario
 * @returns Promise que resuelve cuando el registro es exitoso
 */
export async function registerQindexEntry(hash: string, userId: string): Promise<void> {
  console.log(`[Qindex] Registrando archivo - Hash: ${hash.substring(0, 16)}... Usuario: ${userId}`);
  
  // Simular verificación si ya está registrado
  if (registeredHashes.has(hash)) {
    console.log(`[Qindex] ⚠️ Archivo ya registrado, omitiendo duplicado`);
    return;
  }
  
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Registrar hash
  registeredHashes.add(hash);
  
  console.log(`[Qindex] ✅ Archivo registrado exitosamente en Qindex`);
}

/**
 * Registra un log detallado de archivo para Qerberos con información completa de sQuid
 * @param ipfsHash - Hash del archivo en IPFS
 * @param encryptedHash - Hash del archivo cifrado
 * @param identityDID - DID de la identidad que sube el archivo
 * @param space - Espacio Web3.Storage asociado
 * @param operation - Tipo de operación
 * @param fileName - Nombre del archivo (opcional)
 * @param fileSize - Tamaño del archivo (opcional)
 * @param aesKey - Clave AES usada (opcional)
 */
export async function logFileOperation(
  ipfsHash: string,
  encryptedHash: string,
  identityDID: string,
  operation: 'UPLOAD' | 'ACCESS' | 'VERIFY' = 'UPLOAD',
  fileName?: string,
  fileSize?: number,
  space?: string,
  aesKey?: string,
  cid_profile?: string,
  metadata?: Record<string, any>
): Promise<FileLog> {
  console.log(`[Qindex] Registrando log de archivo - Operación: ${operation}`);
  
  const fileLog: FileLog = {
    id: crypto.randomUUID(),
    ipfsHash,
    encryptedHash,
    identityDID,
    space: space || 'unknown_space',
    timestamp: new Date().toISOString(),
    fileName,
    fileSize,
    operation,
    aesKey: aesKey ? aesKey.slice(0, 8) + '...' : undefined, // Solo almacenar parcialmente por seguridad
    cid_profile,
    metadata: {
      ...(metadata || {}),
      uploadedAt: new Date().toISOString(),
      verified: cid_profile ? true : false
    }
  };
  
  // Agregar al array de logs
  fileLogs.unshift(fileLog); // Agregar al principio para orden cronológico
  
  // Mantener solo los últimos 1000 logs
  if (fileLogs.length > 1000) {
    fileLogs.splice(1000);
  }
  
  // Persistir en localStorage
  try {
    localStorage.setItem('qindex_file_logs', JSON.stringify(fileLogs));
  } catch (error) {
    console.error('[Qindex] Error al persistir logs:', error);
  }
  
  console.log(`[Qindex] ✅ Log registrado: ${fileLog.id}`);
  console.log(`[Qindex] DID: ${identityDID.slice(0, 16)}... Espacio: ${fileLog.space}`);
  
  return fileLog;
}

/**
 * Obtiene todos los logs de archivos (para Qerberos)
 */
export function getFileLogs(): FileLog[] {
  // Cargar desde localStorage si está vacío
  if (fileLogs.length === 0) {
    try {
      const stored = localStorage.getItem('qindex_file_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        fileLogs.push(...parsedLogs);
      }
    } catch (error) {
      console.error('[Qindex] Error al cargar logs:', error);
    }
  }
  
  return [...fileLogs]; // Retornar copia
}

/**
 * Busca logs por hash de IPFS
 */
export function findLogsByIPFSHash(ipfsHash: string): FileLog[] {
  const logs = getFileLogs();
  return logs.filter(log => log.ipfsHash === ipfsHash);
}

/**
 * Busca logs por DID de identidad
 */
export function findLogsByIdentity(identityDID: string): FileLog[] {
  const logs = getFileLogs();
  return logs.filter(log => log.identityDID === identityDID);
}

/**
 * Verifica si un hash está registrado
 * @param hash - Hash a verificar
 * @returns true si está registrado
 */
export function isHashRegistered(hash: string): boolean {
  return registeredHashes.has(hash);
}

/**
 * Obtiene estadísticas de registros
 * @returns Número total de archivos registrados
 */
export function getRegisteredCount(): number {
  return registeredHashes.size;
}

/**
 * Simula el almacenamiento de logs de validación en Qindex
 * @param log - Entrada del log a almacenar
 * @returns true si el almacenamiento es exitoso, false en caso contrario
 */
export function simulateQindexStorage(log: QIndexLogEntry): boolean {
  console.log(`[Qindex] Simulando almacenamiento de log de validación...`);
  
  try {
    // Validar estructura del log
    if (!log.fileHash || !log.userId || typeof log.timestamp !== 'number' || typeof log.qerberosStatus !== 'boolean') {
      console.error('[Qindex] ❌ Estructura de log inválida');
      return false;
    }
    
    // Simular proceso de almacenamiento
    const storageDelay = Math.random() * 100 + 50; // 50-150ms
    
    // En un entorno real, aquí se almacenaría en blockchain o storage distribuido
    console.log(`[Qindex] 💾 Almacenando log - Hash: ${log.fileHash.substring(0, 16)}...`);
    console.log(`[Qindex] Usuario: ${log.userId.substring(0, 16)}... Estado Qerberos: ${log.qerberosStatus ? 'VÁLIDO' : 'INVÁLIDO'}`);
    console.log(`[Qindex] Timestamp: ${new Date(log.timestamp).toISOString()}`);
    
    // Simular éxito del almacenamiento (95% de éxito)
    const success = Math.random() > 0.05;
    
    if (success) {
      console.log(`[Qindex] ✅ Log almacenado exitosamente en storage simulado`);
    } else {
      console.log(`[Qindex] ❌ Fallo en simulación de almacenamiento`);
    }
    
    return success;
    
  } catch (error) {
    console.error('[Qindex] ❌ Error durante simulación de almacenamiento:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas de logs almacenados
 * @returns Objeto con estadísticas básicas
 */
export function getQindexStorageStats(): {
  totalLogs: number;
  validValidations: number;
  invalidValidations: number;
  lastUpdate: string;
} {
  try {
    const events = JSON.parse(localStorage.getItem('qindex_validation_events') || '[]');
    
    const validValidations = events.filter((event: any) => event.qerberosStatus === true).length;
    const invalidValidations = events.filter((event: any) => event.qerberosStatus === false).length;
    const lastUpdate = events.length > 0 ? events[0].registeredAt : 'N/A';
    
    return {
      totalLogs: events.length,
      validValidations,
      invalidValidations,
      lastUpdate
    };
  } catch (error) {
    console.error('[Qindex] Error obteniendo estadísticas:', error);
    return {
      totalLogs: 0,
      validValidations: 0,
      invalidValidations: 0,
      lastUpdate: 'Error'
    };
  }
}
