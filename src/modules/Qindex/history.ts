
/**
 * Qindex History - Gestión del histórico local de registros
 * 
 * Maneja el almacenamiento y recuperación de entradas de índice en localStorage
 */

/**
 * Entrada del histórico de índices
 */
export interface IndexEntry {
  id: string;
  fileHash: string;
  filename: string;
  owner: string;
  timestamp: string;
  status: 'VERIFIED' | 'REJECTED';
  signature?: string;
  encryptedKey: string;
}

const HISTORY_STORAGE_KEY = 'qindex_history';

/**
 * Guarda una entrada en el histórico local
 * @param entry - Entrada a guardar
 */
export async function saveToHistory(entry: IndexEntry): Promise<void> {
  try {
    console.log(`[Qindex History] Guardando entrada: ${entry.filename}`);
    
    // Cargar histórico existente
    const existingHistory = await loadHistory();
    
    // Agregar nueva entrada al principio
    const updatedHistory = [entry, ...existingHistory];
    
    // Mantener solo las últimas 100 entradas
    const trimmedHistory = updatedHistory.slice(0, 100);
    
    // Guardar en localStorage
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));
    
    console.log(`[Qindex History] ✅ Entrada guardada exitosamente`);
  } catch (error) {
    console.error(`[Qindex History] ❌ Error al guardar entrada:`, error);
    throw new Error(`Error al guardar en histórico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Carga el histórico completo desde localStorage
 * @returns Array de entradas del histórico
 */
export async function loadHistory(): Promise<IndexEntry[]> {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    
    if (!storedHistory) {
      return [];
    }
    
    const history: IndexEntry[] = JSON.parse(storedHistory);
    console.log(`[Qindex History] Cargadas ${history.length} entradas del histórico`);
    
    return history;
  } catch (error) {
    console.error(`[Qindex History] ❌ Error al cargar histórico:`, error);
    return [];
  }
}

/**
 * Busca entradas por hash de archivo
 * @param fileHash - Hash del archivo a buscar
 * @returns Array de entradas que coinciden
 */
export async function findByFileHash(fileHash: string): Promise<IndexEntry[]> {
  const history = await loadHistory();
  return history.filter(entry => entry.fileHash === fileHash);
}

/**
 * Busca entradas por propietario
 * @param owner - Propietario a buscar
 * @returns Array de entradas del propietario
 */
export async function findByOwner(owner: string): Promise<IndexEntry[]> {
  const history = await loadHistory();
  return history.filter(entry => entry.owner === owner);
}

/**
 * Obtiene estadísticas del histórico
 * @returns Estadísticas del histórico
 */
export async function getHistoryStats(): Promise<{
  total: number;
  verified: number;
  rejected: number;
  lastEntry?: string;
}> {
  const history = await loadHistory();
  
  const verified = history.filter(entry => entry.status === 'VERIFIED').length;
  const rejected = history.filter(entry => entry.status === 'REJECTED').length;
  const lastEntry = history.length > 0 ? history[0].timestamp : undefined;
  
  return {
    total: history.length,
    verified,
    rejected,
    lastEntry
  };
}

/**
 * Limpia el histórico completo
 */
export async function clearHistory(): Promise<void> {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    console.log(`[Qindex History] ✅ Histórico limpiado`);
  } catch (error) {
    console.error(`[Qindex History] ❌ Error al limpiar histórico:`, error);
    throw new Error(`Error al limpiar histórico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
