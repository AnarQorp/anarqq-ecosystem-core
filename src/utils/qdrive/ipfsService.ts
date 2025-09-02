
// Servicio modular de Qdrive para subida y gestión de archivos en IPFS/Qlock/Qindex/Qerberos

import { uploadFile } from '@/utils/ipfs';
import { encryptFile } from '@/lib/qlock';
import { useIdentityStore } from '@/state/identity';
import { logFileOperation, findLogsByIdentity } from '@/lib/qindex';
import { verifyIntegrity } from '@/lib/qerberos';

// Define the LogOperationParams interface
interface LogOperationParams {
  cid: string;
  did: string;
  operation: 'UPLOAD' | 'DOWNLOAD' | 'VERIFY';
  metadata: Record<string, unknown>;
}

/**
 * Lista archivos subidos por el usuario activo
 * @param did DID del usuario sQuid
 */
export function getFilesByDID(did: string) {
  // Usa logs de Qindex para mostrar archivos de un DID
  const logs = findLogsByIdentity(did);
  
  // Transformar logs a formato esperado por HistoryTab
  return logs.map(log => ({
    ...log,
    fileName: log.fileName || 'archivo_sin_nombre',
    integrityOk: true // Por defecto true, se actualiza después si hay verificación
  }));
}

interface UploadResult {
  ipfsHash: string;
  integrityOk: boolean;
  fileName: string;
  timestamp: string;
  id: string;
  encryptedHash: string;
  identityDID: string;
  space: string;
  fileSize?: number;
  operation: 'UPLOAD' | 'DOWNLOAD' | 'VERIFY';
  aesKey?: string;
  cid_profile?: string;
  metadata?: Record<string, unknown>;
}

interface UploadFileOptions {
  did: string;
  name: string;
  type: string;
  size: number;
  cid_profile?: string;
  [key: string]: any;
}

/**
 * Sube y registra un archivo utilizando Qlock/Qindex/Qerberos/IPFS
 * @param file El archivo a subir
 * @param options Opciones de subida incluyendo metadatos
 * @returns Objeto con los resultados de la subida
 */
export async function uploadAndRegisterFile(file: File, options: UploadFileOptions): Promise<UploadResult> {
  // 1. Cifrar archivo (QLock)
  const encryptResult = await encryptFile(file);
  const encryptedBlob = encryptResult.encryptedBlob;

  // 2. Upload to IPFS
  const uploadResponse = await uploadFile(new File([encryptedBlob], file.name));
  
  // Type guard to check if the upload was successful
  if (!uploadResponse || !('cid' in uploadResponse) || !uploadResponse.cid) {
    const errorMessage = (uploadResponse as any)?.error?.message || 'Invalid response from upload service';
    throw new Error(`Failed to upload file to IPFS: ${errorMessage}`);
  }
  
  const ipfsHash = uploadResponse.cid;

  // 3. Registrar en Qindex (log + indexado) con cid_profile si está disponible
  try {
    // Ensure all required parameters are strings and handle potential undefined values
    const logParams = {
      ipfsHash: String(ipfsHash),
      encryptedHash: String(encryptResult.fileHash),
      identityDID: String(options.did),
      operation: 'UPLOAD' as const,
      fileName: file.name,
      fileSize: file.size,
      space: options.space || 'default',
      aesKey: encryptResult.aesKey,
      cid_profile: options.cid_profile,
      metadata: {
        fileType: file.type,
        originalName: file.name,
        uploadedBy: options.name || options.did,
        uploaderDid: options.did,
        ...(options.metadata || {})
      }
    };

    // Call logFileOperation with the properly typed parameters
    await logFileOperation(
      logParams.ipfsHash,
      logParams.encryptedHash,
      logParams.identityDID,
      logParams.operation,
      logParams.fileName,
      logParams.fileSize,
      logParams.space,
      logParams.aesKey,
      logParams.cid_profile,
      logParams.metadata
    );
  } catch (error) {
    console.error('Error logging file operation:', error);
    // Continue with upload even if logging fails
  }

  // 4. Verificar integridad con Qerberos (usar hash del archivo)
  const integrityOk = await verifyIntegrity(encryptResult.fileHash).catch(() => {
    console.warn('Integrity verification failed');
    return false;
  });

  // Create the result object
  const result: UploadResult = {
    ipfsHash,
    integrityOk,
    fileName: file.name,
    timestamp: new Date().toISOString(),
    id: ipfsHash, // Using ipfsHash as ID
    encryptedHash: encryptResult.fileHash,
    identityDID: options.did,
    space: options.space || 'default',
    fileSize: file.size,
    operation: 'UPLOAD',
    aesKey: encryptResult.aesKey,
    cid_profile: options.cid_profile,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      uploaderDid: options.did,
      cid_profile: options.cid_profile,
      isEncrypted: true,
      fileHash: encryptResult.fileHash,
      ...options.metadata
    }
  };
  
  return result;
}
