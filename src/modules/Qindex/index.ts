
/**
 * Qindex - Módulo de registro de archivos
 * 
 * Gestiona el registro completo de archivos tras subida a IPFS y cifrado con Qlock
 */

import { encryptData, signData } from '@/lib/quantumSim';
import { verifyIntegrity } from '@/lib/qerberos';
import { saveToHistory, IndexEntry } from './history';

/**
 * Información del archivo para registro en Qindex
 */
export interface FileInfo {
  cid: string;
  aesKey: string;
  owner: string;
  filename: string;
}

/**
 * Objeto de índice para registro
 */
export interface IndexObject {
  fileHash: string;
  encryptedKey: string;
  owner: string;
  timestamp: string;
  filename: string;
  status: 'VERIFIED' | 'REJECTED';
  signature?: string;
}

/**
 * Registra un archivo en Qindex tras subida a IPFS y cifrado
 * @param fileInfo - Información del archivo a registrar
 * @returns Promise con el resultado del registro
 */
export async function registerToQindex(fileInfo: FileInfo): Promise<{
  success: boolean;
  index: IndexObject;
  error?: string;
}> {
  console.log(`[Qindex] Iniciando registro de archivo: ${fileInfo.filename}`);
  
  try {
    // 1. Cifrar la clave AES usando Qlock
    console.log(`[Qindex] Cifrando clave AES con Qlock...`);
    const { encryptedData: encryptedKey } = await encryptData(
      fileInfo.aesKey, 
      fileInfo.owner, 
      'QUANTUM'
    );
    
    // 2. Crear objeto de índice
    const index: IndexObject = {
      fileHash: fileInfo.cid,
      encryptedKey,
      owner: fileInfo.owner,
      timestamp: new Date().toISOString(),
      filename: fileInfo.filename,
      status: 'REJECTED' // Por defecto hasta verificación
    };
    
    console.log(`[Qindex] Objeto de índice creado para: ${fileInfo.filename}`);
    
    // 3. Verificar integridad del archivo con Qerberos
    console.log(`[Qindex] Verificando integridad con Qerberos...`);
    const isValid = await verifyIntegrity(fileInfo.cid);
    
    if (isValid) {
      // 4. Si la verificación es exitosa, firmar el índice con Qlock
      console.log(`[Qindex] Verificación exitosa. Firmando índice...`);
      const signature = await signData(
        JSON.stringify(index), 
        fileInfo.owner, 
        'QUANTUM'
      );
      
      index.status = 'VERIFIED';
      index.signature = signature;
      
      console.log(`[Qindex] ✅ Índice firmado y verificado`);
    } else {
      console.log(`[Qindex] ❌ Verificación de integridad fallida - Índice marcado como REJECTED`);
    }
    
    // 5. Guardar en el histórico local
    console.log(`[Qindex] Guardando en histórico local...`);
    await saveToHistory({
      id: crypto.randomUUID(),
      fileHash: index.fileHash,
      filename: index.filename,
      owner: index.owner,
      timestamp: index.timestamp,
      status: index.status,
      signature: index.signature,
      encryptedKey: index.encryptedKey
    });
    
    console.log(`[Qindex] ✅ Registro en Qindex completado para: ${fileInfo.filename}`);
    
    return {
      success: true,
      index
    };
    
  } catch (error) {
    console.error(`[Qindex] ❌ Error en registro:`, error);
    
    // Crear índice de error para histórico
    const errorIndex: IndexObject = {
      fileHash: fileInfo.cid,
      encryptedKey: '',
      owner: fileInfo.owner,
      timestamp: new Date().toISOString(),
      filename: fileInfo.filename,
      status: 'REJECTED'
    };
    
    return {
      success: false,
      index: errorIndex,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Verifica si un archivo está registrado en Qindex
 * @param cid - Hash del archivo en IPFS
 * @returns true si está registrado y verificado
 */
export async function isFileRegistered(cid: string): Promise<boolean> {
  // Esta función podría consultar el histórico local
  // Por ahora retorna false como placeholder
  return false;
}
