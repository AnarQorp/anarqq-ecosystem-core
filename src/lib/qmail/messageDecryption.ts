
/**
 * QMail - Lógica de descifrado de mensajes
 * Integra Qlock para descifrado seguro de mensajes desde IPFS
 */

import { decryptData } from '@/lib/quantumSim';
import { getFromIPFS } from '@/utils/ipfs';
import { getActiveIdentity, generateAESKeyFromActiveDID } from '@/state/identity';

export interface DecryptedMessageContent {
  subject: string;
  content: string;
  priority: string;
  expires: number | null;
  originalSender: string;
  timestamp: string;
}

/**
 * Descifra un mensaje desde IPFS usando la identidad activa
 * @param ipfsHash - Hash del mensaje cifrado en IPFS
 * @param messageMetadata - Metadatos del mensaje para validación
 * @returns Contenido descifrado del mensaje
 */
export async function decryptMessageFromIPFS(
  ipfsHash: string, 
  messageMetadata: any
): Promise<DecryptedMessageContent> {
  console.log(`[QMail Decrypt] Iniciando descifrado de mensaje: ${ipfsHash.slice(0, 16)}...`);
  
  // 1. Verificar identidad activa
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay identidad sQuid activa para descifrar el mensaje');
  }

  // 2. Verificar que el usuario actual es el receptor
  if (messageMetadata.receiverDID !== activeIdentity.did) {
    throw new Error('No tienes permisos para descifrar este mensaje');
  }

  console.log(`[QMail Decrypt] Descargando desde IPFS: ${ipfsHash.slice(0, 16)}...`);

  try {
    // 3. Descargar contenido cifrado desde IPFS
    const encryptedData = await getFromIPFS(ipfsHash);
    const encryptedContent = typeof encryptedData === 'string' ? encryptedData : encryptedData.content;

    // 4. Derivar clave AES desde el DID del receptor
    const aesKey = await generateAESKeyFromActiveDID();
    if (!aesKey) {
      throw new Error('No se pudo derivar la clave de descifrado');
    }

    console.log(`[QMail Decrypt] Descifrando con clave derivada del DID...`);

    // 5. Descifrar usando Qlock
    const decryptedResult = await decryptData(encryptedContent, aesKey);
    
    if (!decryptedResult) {
      throw new Error('Error al descifrar el mensaje. Contenido corrupto o clave incorrecta.');
    }

    // 6. Parsear contenido descifrado
    let messageContent: DecryptedMessageContent;
    
    try {
      const parsed = JSON.parse(decryptedResult);
      messageContent = {
        subject: parsed.subject || 'Sin asunto',
        content: parsed.content || 'Contenido no disponible',
        priority: parsed.priority || 'NORMAL',
        expires: parsed.expires || null,
        originalSender: messageMetadata.senderDID || 'Desconocido',
        timestamp: parsed.timestamp || messageMetadata.timestamp
      };
    } catch (parseError) {
      // Si falla el parseo JSON, tratar como texto plano
      messageContent = {
        subject: 'Mensaje descifrado',
        content: decryptedResult,
        priority: 'NORMAL',
        expires: null,
        originalSender: messageMetadata.senderDID || 'Desconocido',
        timestamp: messageMetadata.timestamp || new Date().toISOString()
      };
    }

    console.log(`[QMail Decrypt] ✅ Mensaje descifrado exitosamente: ${messageContent.subject}`);
    return messageContent;

  } catch (error) {
    console.error('[QMail Decrypt] Error en descifrado:', error);
    throw new Error(`Error al descifrar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Verifica si un mensaje puede ser descifrado por la identidad activa
 * @param messageMetadata - Metadatos del mensaje
 * @returns true si puede ser descifrado
 */
export function canDecryptMessage(messageMetadata: any): boolean {
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) return false;
  
  return messageMetadata.receiverDID === activeIdentity.did;
}
