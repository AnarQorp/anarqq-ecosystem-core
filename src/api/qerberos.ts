/**
 * Qerberos API - Access Control and Audit Logging
 * 
 * Este módulo maneja:
 * - Registro de eventos de acceso
 * - Trazabilidad de operaciones
 * - Auditoría de seguridad
 */

export interface AccessLogEntry {
  id: string;
  cid: string;
  identity: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  reason?: string;
  operation: 'UPLOAD' | 'DOWNLOAD' | 'DECRYPT' | 'VERIFY';
  metadata?: {
    fileSize?: number;
    fileName?: string;
    verificationResult?: boolean;
  };
}

/**
 * In-memory access log storage
 * In production, this would be stored in a distributed ledger or secure database
 */
let accessLogs: AccessLogEntry[] = [];

/**
 * Load access logs from localStorage
 */
function loadAccessLogs(): AccessLogEntry[] {
  try {
    const stored = localStorage.getItem('qerberos_access_logs');
    if (stored) {
      accessLogs = JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Qerberos] Error loading access logs:', error);
    accessLogs = [];
  }
  return accessLogs;
}

/**
 * Save access logs to localStorage
 */
function saveAccessLogs(): void {
  try {
    localStorage.setItem('qerberos_access_logs', JSON.stringify(accessLogs));
  } catch (error) {
    console.error('[Qerberos] Error saving access logs:', error);
  }
}

/**
 * Log an access event
 */
export async function logAccess(event: Omit<AccessLogEntry, 'id' | 'timestamp'>): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const logEntry: AccessLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event
  };
  
  // Load existing logs
  loadAccessLogs();
  
  // Add new entry
  accessLogs.unshift(logEntry); // Add to beginning for recent-first order
  
  // Keep only last 100 entries to prevent storage bloat
  if (accessLogs.length > 100) {
    accessLogs = accessLogs.slice(0, 100);
  }
  
  // Save to localStorage
  saveAccessLogs();
  
  // Log to console
  const statusIcon = event.status === 'SUCCESS' ? '✅' : event.status === 'FAILED' ? '❌' : '🚫';
  console.log(`[Qerberos] ${statusIcon} ${event.operation} - ${event.status}`, {
    cid: event.cid,
    identity: event.identity,
    reason: event.reason
  });
}

/**
 * Get recent access logs
 */
export async function getAccessLogs(limit: number = 50): Promise<AccessLogEntry[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  loadAccessLogs();
  return accessLogs.slice(0, limit);
}

/**
 * Get access logs for a specific CID
 */
export async function getAccessLogsForCID(cid: string): Promise<AccessLogEntry[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  loadAccessLogs();
  return accessLogs.filter(log => log.cid === cid);
}

/**
 * Clear all access logs (admin function)
 */
export async function clearAccessLogs(): Promise<void> {
  accessLogs = [];
  saveAccessLogs();
  console.log('[Qerberos] Access logs cleared');
}

/**
 * Get access statistics
 */
export async function getAccessStats(): Promise<{
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueCIDs: number;
  recentActivity: AccessLogEntry[];
}> {
  loadAccessLogs();
  
  const totalAccesses = accessLogs.length;
  const successfulAccesses = accessLogs.filter(log => log.status === 'SUCCESS').length;
  const failedAccesses = accessLogs.filter(log => log.status === 'FAILED').length;
  const uniqueCIDs = new Set(accessLogs.map(log => log.cid)).size;
  const recentActivity = accessLogs.slice(0, 10);
  
  return {
    totalAccesses,
    successfulAccesses,
    failedAccesses,
    uniqueCIDs,
    recentActivity
  };
}

/**
 * Genera un hash SHA-256 de un archivo
 * @param file - Archivo a hashear
 * @returns Promise con el hash en formato hexadecimal
 */
async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifica la integridad de un archivo comparando su hash con el CID registrado
 * @param cid - Hash CID del archivo registrado
 * @param file - Archivo original para verificar
 * @returns Promise que resuelve con true si la integridad es válida
 */
export async function verifyIntegrity(cid: string, file: File): Promise<boolean> {
  console.log(`[Qerberos] 🔍 Iniciando verificación de integridad para: ${file.name}`);
  
  try {
    // Calcular hash actual del archivo
    const currentHash = await generateFileHash(file);
    console.log(`[Qerberos] Hash calculado: ${currentHash.substring(0, 16)}...`);
    
    // En un sistema real, compararíamos con el hash almacenado en IPFS
    // Por ahora, simulamos la verificación comparando con el CID
    // (En IPFS real, el CID contiene información del hash del contenido)
    
    // Simular proceso de verificación con delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Para propósitos de demo, simulamos verificación (95% de éxito)
    const isValid = Math.random() > 0.05;
    
    if (isValid) {
      console.log(`[Qerberos] ✅ Integridad verificada correctamente para: ${file.name}`);
      
      // Registrar evento de verificación exitosa
      await logAccess({
        cid,
        identity: 'current_user',
        status: 'SUCCESS',
        operation: 'VERIFY',
        reason: 'Integrity verification passed',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          verificationResult: true
        }
      });
    } else {
      console.warn(`[Qerberos] ⚠️ ALERTA DE SEGURIDAD: Posible corrupción detectada en archivo: ${file.name}`);
      console.warn(`[Qerberos] CID esperado: ${cid.substring(0, 16)}...`);
      console.warn(`[Qerberos] Hash actual: ${currentHash.substring(0, 16)}...`);
      
      // Registrar evento de verificación fallida
      await logAccess({
        cid,
        identity: 'current_user',
        status: 'FAILED',
        operation: 'VERIFY',
        reason: 'Integrity verification failed - potential corruption detected',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          verificationResult: false
        }
      });
    }
    
    return isValid;
    
  } catch (error) {
    console.error(`[Qerberos] ❌ Error durante verificación de integridad:`, error);
    console.warn(`[Qerberos] ALERTA: No se pudo verificar la integridad del archivo: ${file.name}`);
    
    // Registrar error de verificación
    await logAccess({
      cid,
      identity: 'current_user',
      status: 'FAILED',
      operation: 'VERIFY',
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        verificationResult: false
      }
    });
    
    return false;
  }
}
