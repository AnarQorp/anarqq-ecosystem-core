
/**
 * Qpic API - Galería multimedia privada cifrada
 * Basado en Qdrive pero especializado para imágenes y videos
 */

import { uploadFileToQdrive, getUserFiles, saveFileToUserStorage, QdriveFile } from './qdrive';

// Tipos de archivo multimedia permitidos
export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

export const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mov'
];

export interface QpicFile extends QdriveFile {
  isImage: boolean;
  isVideo: boolean;
  thumbnail?: string; // URL de miniatura generada
  dimensions?: { width: number; height: number };
  duration?: number; // Para videos, duración en segundos
}

/**
 * Valida si un archivo es multimedia válido para Qpic
 * @param file - Archivo a validar
 * @returns true si es válido
 */
export function isValidMediaFile(file: File): boolean {
  // Verificar tipo MIME
  if (ALLOWED_MEDIA_TYPES.includes(file.type)) {
    return true;
  }
  
  // Verificar extensión como fallback
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Obtiene el tipo de media basado en la extensión o MIME type
 * @param file - Archivo o nombre de archivo
 * @returns 'image', 'video' o 'unknown'
 */
export function getMediaType(file: File | string): 'image' | 'video' | 'unknown' {
  const fileName = typeof file === 'string' ? file : file.name;
  const mimeType = typeof file === 'string' ? '' : file.type;
  
  // Verificar por MIME type primero
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  
  // Verificar por extensión
  const extension = fileName.toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => extension.endsWith(ext))) {
    return 'image';
  }
  if (['.mp4', '.webm', '.mov'].some(ext => extension.endsWith(ext))) {
    return 'video';
  }
  
  return 'unknown';
}

/**
 * Sube un archivo multimedia a Qpic
 * @param file - Archivo multimedia a subir
 * @returns Información del archivo multimedia subido
 */
export async function uploadMediaToQpic(file: File): Promise<QpicFile> {
  console.log(`[Qpic] Validando archivo multimedia: ${file.name}`);
  
  // Validar que sea un archivo multimedia
  if (!isValidMediaFile(file)) {
    throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes y videos.');
  }

  // Usar la función base de Qdrive para subir
  const qdriveFile = await uploadFileToQdrive(file);
  
  const mediaType = getMediaType(file);
  
  // Crear objeto QpicFile extendido
  const qpicFile: QpicFile = {
    ...qdriveFile,
    isImage: mediaType === 'image',
    isVideo: mediaType === 'video'
  };

  // Generar miniatura si es posible
  if (mediaType === 'image') {
    try {
      qpicFile.thumbnail = await generateImageThumbnail(file);
    } catch (error) {
      console.warn('[Qpic] No se pudo generar miniatura:', error);
    }
  }

  // Obtener dimensiones si es imagen
  if (mediaType === 'image') {
    try {
      qpicFile.dimensions = await getImageDimensions(file);
    } catch (error) {
      console.warn('[Qpic] No se pudieron obtener dimensiones:', error);
    }
  }

  // Guardar en storage de usuario
  await saveFileToUserStorage(qpicFile);
  
  console.log(`[Qpic] ✅ Archivo multimedia procesado: ${qpicFile.name}`);
  
  return qpicFile;
}

/**
 * Obtiene archivos multimedia del usuario actual
 * @returns Lista de archivos multimedia filtrados
 */
export async function getUserMediaFiles(): Promise<QpicFile[]> {
  const allFiles = await getUserFiles();
  
  // Filtrar solo archivos multimedia
  const mediaFiles = allFiles.filter(file => {
    const mediaType = getMediaType(file.name);
    return mediaType === 'image' || mediaType === 'video';
  });

  // Convertir a QpicFile con metadatos adicionales
  const qpicFiles: QpicFile[] = mediaFiles.map(file => ({
    ...file,
    isImage: getMediaType(file.name) === 'image',
    isVideo: getMediaType(file.name) === 'video'
  }));

  console.log(`[Qpic] ${qpicFiles.length} archivos multimedia encontrados`);
  
  return qpicFiles;
}

/**
 * Genera una miniatura para una imagen
 * @param file - Archivo de imagen
 * @returns URL de la miniatura generada
 */
async function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('No se pudo crear contexto de canvas'));
      return;
    }

    img.onload = () => {
      const maxSize = 200; // Tamaño máximo de miniatura
      let { width, height } = img;
      
      // Calcular nuevas dimensiones manteniendo aspecto
      if (width > height) {
        if (width > maxSize) {
          height = height * (maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = width * (maxSize / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir a data URL
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnailUrl);
    };
    
    img.onerror = () => reject(new Error('Error cargando imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Obtiene las dimensiones de una imagen
 * @param file - Archivo de imagen
 * @returns Dimensiones de la imagen
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => reject(new Error('Error obteniendo dimensiones'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Obtiene estadísticas específicas de Qpic
 */
export async function getQpicStats(): Promise<{
  totalImages: number;
  totalVideos: number;
  totalMediaSize: number;
  storageUsed: string;
  lastUpload?: Date;
}> {
  const mediaFiles = await getUserMediaFiles();
  
  const totalImages = mediaFiles.filter(f => f.isImage).length;
  const totalVideos = mediaFiles.filter(f => f.isVideo).length;
  const totalMediaSize = mediaFiles.reduce((sum, file) => sum + file.size, 0);
  const lastUpload = mediaFiles.length > 0 ? new Date(mediaFiles[0].uploadDate) : undefined;
  
  const storageUsed = formatFileSize(totalMediaSize);
  
  return {
    totalImages,
    totalVideos,
    totalMediaSize,
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
