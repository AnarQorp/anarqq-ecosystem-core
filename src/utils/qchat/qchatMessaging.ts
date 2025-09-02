/**
 * Qchat Messaging - Gestión de mensajes cifrados
 */

import { encryptFile } from '@/lib/qlock';
import { logFileOperation, FileLog } from '@/lib/qindex';
import { getActiveIdentity, SquidIdentity } from '@/state/identity';
import { validateDID, generateMessageId } from './qchatCore';
import { sendToBridges } from './qchatBridgeService';
import { sendEncryptedMessage as apiSendMessage, fetchMessages as apiFetchMessages } from '@/api/qchat';
import { Web3Storage } from 'web3.storage';
import { createHash } from 'crypto';

// Helper function to hash message content
async function hashMessage(content: string | Uint8Array): Promise<string> {
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Mock de verifyIntegrity si no está disponible
const verifyIntegrity = async (messageId: string, proof: any): Promise<boolean> => {
  console.log(`Verificando integridad del mensaje ${messageId}`);
  return true; // Implementación temporal
};

// Función auxiliar para convertir Blob a base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.startsWith('data:') 
        ? result.split(',')[1] 
        : result;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Interfaz para el mensaje Qchat
export interface QchatMessage {
  id: string;
  senderDID: string;
  recipientDID: string;
  content: string;
  timestamp: string;
  encryptedContent: string;
  ipfsCid?: string;
  senderName?: string;
  metadata?: {
    bridges?: string[];
    bridgesSent?: string[];
    [key: string]: any;
  };
  integrityProof?: any;
  verified: boolean;
  qindexLogId?: string;
  bridgesSent?: string[]; // Mantenemos esta propiedad por compatibilidad
}

// Configuración de Web3.Storage (IPFS)
const getWeb3Storage = () => {
  // En el navegador, usamos import.meta.env
  // En Node.js, usamos process.env
  const token = typeof window !== 'undefined' 
    ? import.meta.env.VITE_WEB3_STORAGE_TOKEN 
    : process.env.WEB3_STORAGE_TOKEN;
    
  return token ? new Web3Storage({ token }) : null;
};

const web3Storage = getWeb3Storage();

// Almacenamiento local de mensajes (para caché)
const messageCache = new Map<string, QchatMessage[]>();

/**
 * Envía un mensaje cifrado a través de Qchat
 */
export async function sendQchatMessage({
  senderDID,
  recipientDID,
  content,
  saveToIPFS = false,
  senderName,
  metadata = {}
}: {
  senderDID: string;
  recipientDID: string;
  content: string;
  saveToIPFS?: boolean;
  senderName?: string;
  metadata?: Record<string, any>;
}): Promise<QchatMessage> {
  console.log(`[Qchat Messaging] Enviando mensaje de ${senderDID.slice(0, 16)}... a ${recipientDID.slice(0, 16)}...`);
  
  // Validaciones
  if (!validateDID(senderDID) || !validateDID(recipientDID)) {
    throw new Error('DIDs inválidos');
  }
  
  // 1. Cifrar el contenido
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay una identidad activa');
  }
  
  // 2. Crear el mensaje
  const messageId = generateMessageId();
  const timestamp = new Date().toISOString();
  
  const message: QchatMessage = {
    id: messageId,
    senderDID,
    recipientDID,
    senderName,
    content,
    encryptedContent: '', // Se llenará después
    timestamp,
    verified: false,
    bridgesSent: [],
    metadata: {
      ...metadata,
      version: '1.0.0',
      contentType: 'text/plain',
      timestamp
    }
  };
  
  try {
    // 3. Cifrar el mensaje
    const messageBlob = new Blob([content], { type: 'text/plain' });
    const encrypted = await encryptFile(messageBlob);
    
    // Asegurarse de que encrypted es un Blob
    const encryptedBlob = encrypted instanceof Blob ? encrypted : new Blob([JSON.stringify(encrypted)]);
    message.encryptedContent = await blobToBase64(encryptedBlob);
    
    // 4. Guardar en IPFS si está habilitado
    if (saveToIPFS && web3Storage) {
      try {
        const file = new File(
          [JSON.stringify(message)],
          `qchat_${messageId}.json`,
          { type: 'application/json' }
        );
        
        const cid = await web3Storage.put([file], {
          name: `qchat_${messageId}`,
          wrapWithDirectory: false
        });
        
        message.metadata = {
          ...message.metadata,
          ipfsCid: cid.toString(),
          ipfsGatewayUrl: `https://${cid}.ipfs.dweb.link`
        };
      } catch (ipfsError) {
        console.error('Error al guardar en IPFS:', ipfsError);
        // Continuamos sin IPFS
      }
    }
    
    // 5. Enviar al backend
    const response = await apiSendMessage({
      recipientDID,
      encryptedContent: message.encryptedContent,
      saveToIPFS,
      metadata: {
        ...message.metadata,
        senderName,
        originalContent: content
      }
    });
    
    // 6. Registrar operación en Qindex
    try {
      // Obtenemos el hash del mensaje cifrado
      const messageHash = `qchat_${message.id}_${Date.now()}`;
      
      // Llamamos a logFileOperation con los argumentos esperados
      const logEntry = await logFileOperation(
        message.id, 
        await hashMessage(message.encryptedContent), 
        message.senderDID, 
        'UPLOAD', 
        `message_${message.id.slice(0, 8)}.enc`, 
        message.encryptedContent.length, 
        'qchat', 
        'aes-256-gcm', 
        undefined, 
        { 
          module: 'qchat',
          messageType: 'text',
          recipientDID: message.recipientDID,
          timestamp: message.timestamp
        }
      );
      
      if (logEntry.id) {
        message.qindexLogId = logEntry.id as string;
      }
    } catch (error) {
      console.warn('No se pudo registrar la operación en Qindex:', error);
    }
    
    // 7. Actualizar con la respuesta del servidor
    message.id = response.messageId;
    if (response.ipfsCid) {
      message.metadata.ipfsCid = response.ipfsCid;
    }
    
    // 7. Registrar en Qindex si está disponible
    try {
      // Log the message send operation in Qindex
      const logResult = await logFileOperation(
        message.id, // ipfsHash
        await hashMessage(message.encryptedContent), // encryptedHash
        message.senderDID, // identityDID
        'UPLOAD', // operation
        `message_${message.id.slice(0, 8)}.txt`, // fileName
        message.encryptedContent.length, // fileSize
        'qchat', // space
        'aes-256-gcm', // aesKey
        undefined, // cid_profile
        { // metadata
          action: 'send',
          recipientDID,
          ipfsCid: message.metadata?.ipfsCid,
          timestamp: message.timestamp,
          module: 'qchat',
          messageType: 'text'
        }
      );
      
      if (logResult?.id) {
        message.qindexLogId = logResult.id;
      }
    } catch (logError) {
      console.error('Error al registrar en Qindex:', logError);
    }
    
    // 8. Enviar a puentes externos si es necesario
    if (metadata.bridges && Array.isArray(metadata.bridges)) {
      try {
        // Primero obtenemos el mensaje cifrado como Blob
        const encryptedBlob = new Blob([message.encryptedContent]);
        
        // Llamamos a sendToBridges con los argumentos esperados
        const bridgeResults = await sendToBridges(
          message.senderDID,  
          {
            messageId: message.id,
            encryptedContent: new Blob([message.encryptedContent]),
            recipientDID: message.recipientDID,
            timestamp: message.timestamp
          }
        );
        
        if (bridgeResults.success) {
          // Actualizar metadatos con los puentes a los que se envió
          message.metadata = {
            ...message.metadata,
            bridgesSent: bridgeResults.sentTo || []
          };
        }
      } catch (bridgeError) {
        console.error('Error al enviar a puentes:', bridgeError);
      }
    }
    
    // 9. Actualizar caché local
    if (!messageCache.has(recipientDID)) {
      messageCache.set(recipientDID, []);
    }
    messageCache.get(recipientDID)?.push(message);
    
    return message;
    
  } catch (error) {
    console.error('Error en sendQchatMessage:', error);
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }
}

/**
 * Obtiene el historial de mensajes para una identidad
 */
export async function getQchatHistory(
  identityDID: string,
  options: {
    since?: Date;
    limit?: number;
    refresh?: boolean;
  } = {}
): Promise<QchatMessage[]> {
  const { since, limit = 50, refresh = false } = options;
  
  // Verificar caché primero si no se fuerza refresco
  if (!refresh && messageCache.has(identityDID)) {
    const cachedMessages = messageCache.get(identityDID) || [];
    
    // Filtrar por fecha si es necesario
    if (since) {
      return cachedMessages
        .filter(msg => new Date(msg.timestamp) > since)
        .slice(0, limit);
    }
    
    return cachedMessages.slice(0, limit);
  }
  
  try {
    // Obtener mensajes del backend
    const response = await apiFetchMessages({
      since,
      limit
    });
    
    // Procesar y validar mensajes
    const processedMessages = await Promise.all(
      (response.messages || []).map(async (msg: any) => {
        // Verificar integridad con Qerberos si está disponible
        let verified = false;
        try {
          if (msg.metadata?.qerberosProof) {
            verified = await verifyIntegrity(
              msg.id,
              msg.metadata.qerberosProof
            );
          }
        } catch (error) {
          console.error(`Error al verificar mensaje ${msg.id}:`, error);
        }
        
        return {
          id: msg.id,
          senderDID: msg.senderDID,
          recipientDID: msg.recipientDID,
          senderName: msg.senderName,
          content: msg.content,
          encryptedContent: msg.encryptedContent,
          timestamp: msg.timestamp,
          ipfsHash: msg.ipfsHash,
          metadata: msg.metadata,
          verified,
          bridgesSent: msg.bridgesSent || []
        };
      })
    );
    
    // Actualizar caché
    messageCache.set(identityDID, processedMessages);
    
    return processedMessages;
    
  } catch (error) {
    console.error('Error al obtener historial de mensajes:', error);
    return [];
  }
}

/**
 * Busca mensajes por criterios específicos
 */
export async function searchQchatMessages(
  identityDID: string,
  criteria: {
    recipientDID?: string;
    content?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
): Promise<QchatMessage[]> {
  // Primero obtenemos el historial completo
  const messages = await getQchatHistory(identityDID);
  
  // Filtramos según los criterios
  return messages.filter(msg => {
    // Verificar que el mensaje pertenezca a la identidad
    if (msg.senderDID !== identityDID && msg.recipientDID !== identityDID) {
      return false;
    }
    
    // Filtrar por destinatario si se especifica
    if (criteria.recipientDID && msg.recipientDID !== criteria.recipientDID) {
      return false;
    }
    
    // Búsqueda de texto en contenido (si se puede descifrar)
    if (criteria.content) {
      const searchTerm = criteria.content.toLowerCase();
      const content = msg.content?.toLowerCase() || '';
      const senderName = msg.senderName?.toLowerCase() || '';
      
      if (!content.includes(searchTerm) && !senderName.includes(searchTerm)) {
        return false;
      }
    }
    
    // Filtrar por rango de fechas
    const msgDate = new Date(msg.timestamp);
    if (criteria.dateFrom && msgDate < criteria.dateFrom) {
      return false;
    }
    
    if (criteria.dateTo && msgDate > criteria.dateTo) {
      return false;
    }
    
    return true;
  });
}


