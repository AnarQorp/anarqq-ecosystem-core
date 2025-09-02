
/**
 * Qdrive API - Almacenamiento descentralizado seguro
 * Integrado con sQuid, Qlock, Qindex y Qerberos
 */

import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { encryptFile } from '@/lib/qlock';
import { logFileOperation } from '@/lib/qindex';
import { verifyIntegrity } from '@/api/qerberos';
import { useIdentityStore } from '@/state/identity';

export interface QdriveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  ipfsHash: string;
  encryptedHash: string;
  uploadDate: Date;
  owner: string; // DID del propietario
  space: string; // Espacio de almacenamiento
  integrity: boolean;
  txHash?: string; // Hash de transacción en Pi Testnet (opcional)
}

/**
 * Sube un archivo al sistema Qdrive
 * @param file - Archivo a subir
 * @returns Información del archivo subido
 */
export async function uploadFileToQdrive(file: File): Promise<QdriveFile> {
  const { activeIdentity } = useIdentityStore.getState();
  
  if (!activeIdentity) {
    throw new Error('No hay identidad activa. Inicia sesión primero.');
  }

  console.log(`[Qdrive] Subiendo archivo: ${file.name} (${file.size} bytes)`);

  // 1. Cifrar archivo con Qlock
  const encryptResult = await encryptFile(file);
  console.log(`[Qdrive] Archivo cifrado con DID: ${activeIdentity.did.slice(0, 16)}...`);

  // 2. Subir a IPFS
  const ipfsHash = await uploadToIPFS(encryptResult.encryptedBlob);
  console.log(`[Qdrive] Subido a IPFS: ${ipfsHash}`);

  // 3. Registrar en Qindex
  const logEntry = await logFileOperation(
    ipfsHash,
    encryptResult.fileHash,
    activeIdentity.did,
    'UPLOAD',
    file.name,
    file.size,
    activeIdentity.space || 'default',
    encryptResult.aesKey
  );

  // 4. Verificar integridad con Qerberos
  const integrityCheck = await verifyIntegrity(ipfsHash, file);

  // 5. Crear objeto QdriveFile
  const qdriveFile: QdriveFile = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    ipfsHash,
    encryptedHash: encryptResult.fileHash,
    uploadDate: new Date(),
    owner: activeIdentity.did,
    space: activeIdentity.space || 'default',
    integrity: integrityCheck,
    // txHash se agregará cuando se implemente Pi Network testnet
  };

  console.log(`[Qdrive] ✅ Archivo procesado exitosamente: ${qdriveFile.id}`);
  
  return qdriveFile;
}

/**
 * Obtiene archivos del usuario actual desde Qindex
 * @returns Lista de archivos del usuario
 */
export async function getUserFiles(): Promise<QdriveFile[]> {
  const { activeIdentity } = useIdentityStore.getState();
  
  if (!activeIdentity) {
    return [];
  }

  console.log(`[Qdrive] Obteniendo archivos para DID: ${activeIdentity.did.slice(0, 16)}...`);

  // Simular obtención de archivos desde Qindex
  // En producción esto consultaría el registro distribuido
  const storedFiles = localStorage.getItem(`qdrive_files_${activeIdentity.did}`);
  
  if (!storedFiles) {
    return [];
  }

  try {
    const files: QdriveFile[] = JSON.parse(storedFiles);
    console.log(`[Qdrive] ${files.length} archivos encontrados`);
    return files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  } catch (error) {
    console.error('[Qdrive] Error al parsear archivos:', error);
    return [];
  }
}

/**
 * Guarda un archivo en el almacenamiento local del usuario
 * @param file - Archivo a guardar
 */
export async function saveFileToUserStorage(file: QdriveFile): Promise<void> {
  const { activeIdentity } = useIdentityStore.getState();
  
  if (!activeIdentity) {
    throw new Error('No hay identidad activa');
  }

  const storageKey = `qdrive_files_${activeIdentity.did}`;
  const existingFiles = await getUserFiles();
  
  // Agregar el nuevo archivo
  const updatedFiles = [file, ...existingFiles];
  
  // Mantener solo los últimos 100 archivos
  if (updatedFiles.length > 100) {
    updatedFiles.splice(100);
  }

  localStorage.setItem(storageKey, JSON.stringify(updatedFiles));
  console.log(`[Qdrive] Archivo guardado en storage local: ${file.id}`);
}

/**
 * Descarga un archivo desde IPFS
 * @param ipfsHash - Hash del archivo en IPFS
 * @returns Blob del archivo descargado
 */
export async function downloadFileFromQdrive(ipfsHash: string): Promise<Blob> {
  console.log(`[Qdrive] Descargando archivo desde IPFS: ${ipfsHash}`);
  
  try {
    const fileData = await getFromIPFS(ipfsHash);
    
    // En producción aquí se desencriptaría el archivo con Qlock
    // const decryptedData = await decryptFile(fileData, userKey);
    
    console.log(`[Qdrive] ✅ Archivo descargado exitosamente`);
    return new Blob([fileData]);
  } catch (error) {
    console.error('[Qdrive] Error descargando archivo:', error);
    throw new Error('No se pudo descargar el archivo');
  }
}

/**
 * Elimina un archivo del sistema Qdrive
 * @param fileId - ID del archivo a eliminar
 */
export async function deleteFileFromQdrive(fileId: string): Promise<void> {
  const { activeIdentity } = useIdentityStore.getState();
  
  if (!activeIdentity) {
    throw new Error('No hay identidad activa');
  }

  const files = await getUserFiles();
  const updatedFiles = files.filter(f => f.id !== fileId);
  
  const storageKey = `qdrive_files_${activeIdentity.did}`;
  localStorage.setItem(storageKey, JSON.stringify(updatedFiles));
  
  console.log(`[Qdrive] Archivo eliminado: ${fileId}`);
}

/**
 * Obtiene estadísticas del usuario en Qdrive
 */
export async function getQdriveStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  storageUsed: string;
  lastUpload?: Date;
}> {
  const files = await getUserFiles();
  
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const lastUpload = files.length > 0 ? new Date(files[0].uploadDate) : undefined;
  
  const storageUsed = formatFileSize(totalSize);
  
  return {
    totalFiles,
    totalSize,
    storageUsed,
    lastUpload
  };
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
