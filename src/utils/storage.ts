
// Storage utilities for AnarQ file management

export interface UploadedFile {
  id: string;
  hash: string;
  name: string;
  size: number;
  mimeType: string;
  timestamp: string;
  did?: string; // DID del emisor (para futuras implementaciones)
  ipfsUrl: string;
}

const STORAGE_KEY = 'anarq_uploaded_files';

export function saveUploadedFile(file: UploadedFile): void {
  try {
    const existingFiles = getUploadedFiles();
    const updatedFiles = [file, ...existingFiles];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
    console.log('📁 Archivo guardado en localStorage:', file.name);
  } catch (error) {
    console.error('❌ Error al guardar archivo en localStorage:', error);
  }
}

export function getUploadedFiles(): UploadedFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Error al obtener archivos de localStorage:', error);
    return [];
  }
}

export function removeUploadedFile(id: string): void {
  try {
    const existingFiles = getUploadedFiles();
    const filteredFiles = existingFiles.filter(file => file.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
    console.log('🗑️ Archivo eliminado del historial:', id);
  } catch (error) {
    console.error('❌ Error al eliminar archivo de localStorage:', error);
  }
}

export function clearUploadedFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Historial de archivos limpiado');
  } catch (error) {
    console.error('❌ Error al limpiar historial:', error);
  }
}

export function generateFileUrl(hash: string): string {
  // En el futuro, esto podría incluir el gateway preferido del usuario
  return `https://ipfs.io/ipfs/${hash}`;
}
