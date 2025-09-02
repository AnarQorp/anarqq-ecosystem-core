
/**
 * QMail - Lógica de recuperación de mensajes
 * Integra Qindex, Qerberos e IPFS para recepción segura
 */

import { verifyFileAccess } from '@/lib/qerberos';
import { getFromIPFS } from '@/utils/ipfs';
import { getActiveIdentity } from '@/state/identity';
import { Message, MessageStatus, MessagePriority } from '@/types';

export interface InboxMessage {
  id: string;
  hash: string;
  metadata: {
    senderDID: string;
    receiverDID: string;
    timestamp: string;
    type: string;
    ipfsHash: string;
    encryptedWith: string;
    aesKeyHash: string;
    senderSpace: string;
  };
  verified: boolean;
  decryptedContent?: {
    subject: string;
    content: string;
    priority: MessagePriority;
    expires: number | null;
  };
}

/**
 * Recupera mensajes del inbox para el DID activo
 */
export async function fetchInboxMessages(): Promise<InboxMessage[]> {
  console.log('[QMail FetchInbox] Recuperando mensajes del inbox...');
  
  // 1. Verificar identidad activa
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay identidad sQuid activa. Por favor inicia sesión.');
  }

  console.log(`[QMail FetchInbox] Buscando mensajes para DID: ${activeIdentity.did.slice(0, 16)}...`);

  // 2. Recuperar mensajes indexados para este DID
  const messages = await fetchMailByDID(activeIdentity.did);
  console.log(`[QMail FetchInbox] Encontrados ${messages.length} mensajes`);

  // 3. Validar y descifrar cada mensaje
  const processedMessages: InboxMessage[] = [];
  
  for (const message of messages) {
    try {
      console.log(`[QMail FetchInbox] Procesando mensaje: ${message.hash.slice(0, 16)}...`);
      
      // Verificar acceso con Qerberos
      const accessVerification = await verifyFileAccess(
        message.metadata.ipfsHash,
        activeIdentity.did,
        message.hash
      );

      const verified = accessVerification.status === 'AUTHORIZED';
      console.log(`[QMail FetchInbox] Verificación: ${verified ? '✅ AUTORIZADO' : '❌ DENEGADO'}`);

      const inboxMessage: InboxMessage = {
        id: message.hash,
        hash: message.hash,
        metadata: message.metadata,
        verified
      };

      // Si está verificado, intentar descifrar
      if (verified) {
        try {
          const decryptedContent = await decryptMessageFromIPFS(message.metadata.ipfsHash);
          inboxMessage.decryptedContent = decryptedContent;
          console.log(`[QMail FetchInbox] ✅ Mensaje descifrado: ${decryptedContent.subject}`);
        } catch (decryptError) {
          console.warn(`[QMail FetchInbox] ⚠️ Error al descifrar mensaje:`, decryptError);
        }
      }

      processedMessages.push(inboxMessage);
      
    } catch (error) {
      console.error(`[QMail FetchInbox] Error procesando mensaje ${message.hash.slice(0, 16)}:`, error);
    }
  }

  console.log(`[QMail FetchInbox] ✅ Procesados ${processedMessages.length} mensajes`);
  return processedMessages;
}

/**
 * Busca mensajes por DID receptor en Qindex
 */
async function fetchMailByDID(receiverDID: string): Promise<Array<{
  hash: string;
  metadata: {
    senderDID: string;
    receiverDID: string;
    timestamp: string;
    type: string;
    ipfsHash: string;
    encryptedWith: string;
    aesKeyHash: string;
    senderSpace: string;
  };
}>> {
  console.log(`[QMail FetchInbox] Buscando en Qindex para DID: ${receiverDID.slice(0, 16)}...`);
  
  // Recuperar índice de mensajes desde localStorage
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
  
  console.log(`[QMail FetchInbox] Encontrados ${messages.length} mensajes en índice local`);
  return messages;
}

/**
 * Descifra mensaje desde IPFS usando Qlock
 */
async function decryptMessageFromIPFS(ipfsHash: string): Promise<{
  subject: string;
  content: string;
  priority: MessagePriority;
  expires: number | null;
}> {
  console.log(`[QMail FetchInbox] Descargando desde IPFS: ${ipfsHash.slice(0, 16)}...`);
  
  // 1. Descargar archivo cifrado desde IPFS
  const encryptedData = await getFromIPFS(ipfsHash);
  
  // 2. Convertir a string si es necesario
  const encryptedContent = typeof encryptedData === 'string' ? encryptedData : encryptedData.content;
  
  // 3. Simular descifrado (en producción usaríamos Qlock real)
  // Por ahora, parseamos directamente el contenido simulado
  try {
    const messageContent = JSON.parse(encryptedContent);
    return {
      subject: messageContent.subject || 'Sin asunto',
      content: messageContent.content || 'Contenido no disponible',
      priority: messageContent.priority || MessagePriority.NORMAL,
      expires: messageContent.expires || null
    };
  } catch (error) {
    console.warn('[QMail FetchInbox] Error parseando contenido, usando contenido raw');
    return {
      subject: 'Mensaje cifrado',
      content: encryptedContent,
      priority: MessagePriority.NORMAL,
      expires: null
    };
  }
}

/**
 * Convierte InboxMessage a Message para compatibilidad con componentes existentes
 */
export function convertToMessage(inboxMessage: InboxMessage): Message {
  return {
    id: inboxMessage.id,
    senderId: inboxMessage.metadata.senderDID,
    senderIdentityId: inboxMessage.metadata.senderDID,
    recipientId: inboxMessage.metadata.receiverDID,
    recipientIdentityId: inboxMessage.metadata.receiverDID,
    subject: inboxMessage.decryptedContent?.subject || 'Mensaje cifrado',
    content: inboxMessage.decryptedContent?.content || 'Contenido no disponible',
    encryptionLevel: 'QUANTUM',
    timestamp: new Date(inboxMessage.metadata.timestamp),
    status: inboxMessage.verified ? MessageStatus.DELIVERED : MessageStatus.UNREAD,
    priority: inboxMessage.decryptedContent?.priority || MessagePriority.NORMAL,
    attachments: [],
    metadata: {
      ipfsHash: inboxMessage.metadata.ipfsHash,
      signature: inboxMessage.hash,
      size: 0,
      routingPath: ['qmail'],
      qindexRegistered: true,
      qerberosValidated: inboxMessage.verified,
      encryptedWith: inboxMessage.metadata.encryptedWith,
      aesKeyHash: inboxMessage.metadata.aesKeyHash,
      senderSpace: inboxMessage.metadata.senderSpace
    },
    visibilityThreshold: 'medium' as any
  };
}
