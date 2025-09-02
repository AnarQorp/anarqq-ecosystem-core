
/**
 * QMail - Integración específica con Qindex
 * Maneja el registro e indexación de mensajes de correo
 */

import { registerQindexEntry, logFileOperation } from '@/lib/qindex';
import { getActiveIdentity } from '@/state/identity';

export interface MessageIndexMetadata {
  senderDID: string;
  receiverDID: string;
  timestamp: string;
  type: 'qmail';
  ipfsHash: string;
  encryptedWith: 'QLOCK';
  aesKeyHash: string;
  senderSpace: string;
  subject?: string;
  priority?: string;
}

/**
 * Registra un mensaje en Qindex tras el envío exitoso
 * @param messageHash - Hash del mensaje cifrado
 * @param ipfsHash - Hash del archivo en IPFS
 * @param metadata - Metadatos del mensaje
 */
export async function registerMessageIndex(
  messageHash: string,
  ipfsHash: string, 
  metadata: MessageIndexMetadata
): Promise<void> {
  console.log(`[QMail Qindex] Registrando mensaje en índice...`);
  
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay identidad activa para indexar el mensaje');
  }

  try {
    // 1. Registrar entrada principal en Qindex
    await registerQindexEntry(messageHash, activeIdentity.did);
    
    // 2. Log detallado del archivo para Qerberos
    await logFileOperation(
      ipfsHash,
      messageHash,
      activeIdentity.did,
      'UPLOAD',
      `qmail_message_${Date.now()}.enc`,
      undefined, // fileSize se puede calcular después si es necesario
      activeIdentity.space,
      metadata.aesKeyHash
    );
    
    // 3. Guardar metadatos extendidos en índice local de QMail
    const mailIndex = JSON.parse(localStorage.getItem('qmail_index') || '{}');
    mailIndex[messageHash] = {
      ...metadata,
      indexedAt: new Date().toISOString(),
      indexedBy: activeIdentity.did
    };
    localStorage.setItem('qmail_index', JSON.stringify(mailIndex));
    
    console.log(`[QMail Qindex] ✅ Mensaje indexado correctamente`);
    console.log(`[QMail Qindex] Hash: ${messageHash.slice(0, 16)}... IPFS: ${ipfsHash.slice(0, 16)}...`);
    
  } catch (error) {
    console.error('[QMail Qindex] Error en indexación:', error);
    throw new Error(`Error al indexar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Busca mensajes indexados por DID receptor
 * @param receiverDID - DID del receptor
 * @returns Array de mensajes encontrados
 */
export async function findMessagesByReceiver(receiverDID: string): Promise<Array<{
  hash: string;
  metadata: MessageIndexMetadata;
}>> {
  console.log(`[QMail Qindex] Buscando mensajes para receptor: ${receiverDID.slice(0, 16)}...`);
  
  const mailIndex = JSON.parse(localStorage.getItem('qmail_index') || '{}');
  const messages = [];
  
  for (const [hash, metadata] of Object.entries(mailIndex)) {
    const typedMetadata = metadata as any;
    if (typedMetadata.receiverDID === receiverDID && typedMetadata.type === 'qmail') {
      messages.push({
        hash,
        metadata: typedMetadata
      });
    }
  }
  
  // Ordenar por timestamp (más recientes primero)
  messages.sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime());
  
  console.log(`[QMail Qindex] ✅ Encontrados ${messages.length} mensajes`);
  return messages;
}
