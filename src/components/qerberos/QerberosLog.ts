
/**
 * QerberosLog - Módulo de trazabilidad de accesos
 * 
 * Registra y gestiona logs de acceso para auditoría y trazabilidad
 * en el ecosistema AnarQ & Q
 */

/**
 * Estructura de entrada de log de acceso
 */
export interface AccessLogEntry {
  id: string;
  cid: string;
  timestamp: string;
  identity: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

// Almacenamiento en memoria de logs
let logs: AccessLogEntry[] = [];

/**
 * Carga logs desde localStorage al inicializar
 */
function loadLogs(): void {
  try {
    const stored = localStorage.getItem('qerberos_logs');
    if (stored) {
      logs = JSON.parse(stored);
    }
  } catch (error) {
    console.error('[QerberosLog] Error al cargar logs:', error);
    logs = [];
  }
}

/**
 * Persiste logs en localStorage
 */
function saveLogs(): void {
  try {
    localStorage.setItem('qerberos_logs', JSON.stringify(logs));
  } catch (error) {
    console.error('[QerberosLog] Error al guardar logs:', error);
  }
}

/**
 * Registra un evento de acceso
 * @param entry - Entrada de log sin ID ni timestamp (se generan automáticamente)
 */
export function logAccess(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>): void {
  // Cargar logs existentes
  loadLogs();
  
  const logEntry: AccessLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  
  // Añadir al principio para orden cronológico inverso
  logs.unshift(logEntry);
  
  // Mantener solo los últimos 100 logs para evitar saturación
  if (logs.length > 100) {
    logs = logs.slice(0, 100);
  }
  
  // Persistir
  saveLogs();
  
  // Log en consola con icono apropiado
  const statusIcon = entry.status === 'SUCCESS' ? '✅' : '❌';
  console.log(`[QerberosLog] ${statusIcon} ${entry.operation || 'ACCESS'} - ${entry.status}`, {
    cid: entry.cid,
    identity: entry.identity,
    reason: entry.reason
  });
}

/**
 * Obtiene todos los logs de acceso
 * @param limit - Número máximo de logs a retornar
 * @returns Array de logs ordenados por timestamp descendente
 */
export function getAccessLogs(limit: number = 50): AccessLogEntry[] {
  loadLogs();
  return logs.slice(0, limit);
}

/**
 * Obtiene logs de acceso para un CID específico
 * @param cid - Content Identifier a filtrar
 * @returns Array de logs para el CID especificado
 */
export function getAccessLogsForCID(cid: string): AccessLogEntry[] {
  loadLogs();
  return logs.filter(log => log.cid === cid);
}

/**
 * Obtiene logs de acceso para una identidad específica
 * @param identity - Identidad a filtrar
 * @returns Array de logs para la identidad especificada
 */
export function getAccessLogsForIdentity(identity: string): AccessLogEntry[] {
  loadLogs();
  return logs.filter(log => log.identity === identity);
}

/**
 * Limpia todos los logs (función administrativa)
 */
export function clearLogs(): void {
  logs = [];
  saveLogs();
  console.log('[QerberosLog] Logs de acceso limpiados');
}

/**
 * Obtiene estadísticas de acceso
 */
export function getAccessStats(): {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueCIDs: number;
  uniqueIdentities: number;
} {
  loadLogs();
  
  const totalAccesses = logs.length;
  const successfulAccesses = logs.filter(log => log.status === 'SUCCESS').length;
  const failedAccesses = logs.filter(log => log.status === 'FAILED').length;
  const uniqueCIDs = new Set(logs.map(log => log.cid)).size;
  const uniqueIdentities = new Set(logs.map(log => log.identity)).size;
  
  return {
    totalAccesses,
    successfulAccesses,
    failedAccesses,
    uniqueCIDs,
    uniqueIdentities
  };
}
