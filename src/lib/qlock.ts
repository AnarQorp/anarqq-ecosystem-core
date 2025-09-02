/**
 * Qlock encryption module
 * Integrado con sQuid para usar claves derivadas del DID activo
 * + Integración con Qonsent para verificación de autorizaciones
 */

import { encryptData } from './quantumSim';
import { getActiveIdentity } from '@/state/identity';
import { canAccessFile } from '@/utils/qonsent/qonsentStore';

/**
 * Deriva una clave AES a partir de un DID
 * @param did - DID de la identidad activa
 * @returns string - Clave AES derivada
 */
export function deriveAESKeyFromDID(did: string): string {
  // Simular derivación de clave AES desde el DID
  // En producción esto usaría una función criptográfica real
  const encoder = new TextEncoder();
  const data = encoder.encode(did + '_aes_key_salt');
  
  // Simulamos un hash simple para la demo
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  
  // Generar clave AES de 32 caracteres (256 bits simulados)
  const baseKey = Math.abs(hash).toString(16).padStart(8, '0');
  const aesKey = (baseKey + '_' + did.slice(-8)).padEnd(32, '0').slice(0, 32);
  
  console.log(`[Qlock] Clave AES derivada del DID: ${did.slice(0, 16)}... -> ${aesKey.slice(0, 8)}...`);
  return aesKey;
}

/**
 * Verifica si un DID puede desencriptar un archivo según las políticas de Qonsent
 * @param fileHash - Hash del archivo a verificar
 * @param did - DID que quiere acceder al archivo
 * @returns boolean - true si tiene autorización
 */
export function canDecrypt(fileHash: string, did: string): boolean {
  const hasAccess = canAccessFile(fileHash, did);
  
  if (hasAccess) {
    console.log(`[Qlock] ✅ DID ${did.slice(0, 16)}... autorizado para archivo ${fileHash.slice(0, 8)}...`);
  } else {
    console.log(`[Qlock] ❌ DID ${did.slice(0, 16)}... NO autorizado para archivo ${fileHash.slice(0, 8)}...`);
  }
  
  return hasAccess;
}

/**
 * Convierte un ArrayBuffer o Uint8Array a base64 de forma segura para archivos grandes.
 */
function uint8ToBase64(uint8: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32kb por chunk
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize) as any);
  }
  return btoa(binary);
}

/**
 * Genera un hash único para un archivo cifrado
 */
function generateFileHash(encryptedData: string): string {
  // Simular hash SHA-256 para el archivo
  let hash = 0;
  for (let i = 0; i < encryptedData.length; i++) {
    const char = encryptedData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Cifra un archivo usando la identidad activa de sQuid para derivar la clave
 * + Crea política de Qonsent automáticamente
 * @param file File o Blob a cifrar
 * @returns Promise<{encryptedBlob: Blob, aesKey: string, did: string, fileHash: string}> - archivo cifrado con metadatos
 */
export async function encryptFile(file: File | Blob): Promise<{
  encryptedBlob: Blob;
  aesKey: string;
  did: string;
  fileHash: string;
}> {
  // Obtener identidad activa desde el estado correcto
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('[Qlock] No hay identidad activa. Inicia sesión primero.');
  }

  const did = activeIdentity.did;
  console.log(`[Qlock] Cifrando archivo con identidad: ${did.slice(0, 16)}...`);

  // Derivar clave AES del DID
  const aesKey = deriveAESKeyFromDID(did);

  // Convertir el archivo a ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Convertimos a cadena base64 (de forma segura para archivos grandes)
  const dataString = uint8ToBase64(new Uint8Array(arrayBuffer));

  // Cifrar el contenido con la clave derivada usando quantumSim/encryptData
  const { encryptedData } = await encryptData(dataString, aesKey, 'QUANTUM');

  // Convertimos el string cifrado resultante a un Blob
  const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });

  // Generar hash del archivo para políticas de Qonsent
  const fileHash = generateFileHash(encryptedData);

  console.log(`[Qlock] Archivo cifrado exitosamente. Tamaño: ${encryptedBlob.size} bytes`);
  console.log(`[Qlock] Hash generado para Qonsent: ${fileHash}`);

  return {
    encryptedBlob,
    aesKey,
    did,
    fileHash
  };
}

/**
 * Cifra un archivo con Qlock (función legacy para compatibilidad)
 * @param file File o Blob a cifrar.
 * @param publicKey string (deprecated, ahora usa DID activo).
 * @returns Promise<Blob> - archivo cifrado listo para subir a IPFS.
 */
export async function encryptWithQlock(
  file: File | Blob, 
  publicKey: string = "DEPRECATED"
): Promise<Blob> {
  console.warn('[Qlock] encryptWithQlock es deprecated. Usa encryptFile() en su lugar.');
  const result = await encryptFile(file);
  return result.encryptedBlob;
}
