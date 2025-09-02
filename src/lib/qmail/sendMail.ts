/**
 * QMail - Lógica de envío de mensajes
 * Integra Qlock, Qindex, Qerberos e IPFS
 */

import { encryptFile } from '@/lib/qlock';
import { logAccess } from '@/api/qerberos';
import { uploadToIPFS } from '@/utils/ipfs';
import { getActiveIdentity } from '@/state/identity';
import { registerMessageIndex } from '@/lib/qmail/qindexIntegration';
import { MessageFormData } from '@/components/qmail/ComposeForm';

export interface EncryptedMessage {
  encryptedContent: string;
  ipfsHash: string;
  messageHash: string;
  metadata: {
    senderDID: string;
    receiverDID: string;
    timestamp: string;
    type: 'qmail';
    encryptedWith: 'QLOCK';
    aesKeyHash: string;
    senderSpace: string;
  };
}

/**
 * Cifra y envía un mensaje usando el ecosistema completo
 */
export async function sendEncryptedMail(formData: MessageFormData): Promise<EncryptedMessage> {
  console.log('[QMail SendMail] Iniciando proceso de envío cifrado');
  
  // 1. Verificar identidad activa
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay identidad sQuid activa. Por favor inicia sesión.');
  }

  console.log(`[QMail SendMail] Enviando desde DID: ${activeIdentity.did.slice(0, 16)}...`);

  // 2. Preparar contenido completo del mensaje
  const messageContent = {
    subject: formData.subject,
    content: formData.content,
    receiverDID: formData.recipientId,
    timestamp: new Date().toISOString(),
    priority: formData.priority,
    expires: formData.expires ? formData.expiresAfter : null
  };

  const messageBlob = new Blob([JSON.stringify(messageContent)], { type: 'application/json' });

  // 3. Cifrar mensaje con Qlock usando DID activo
  console.log('[QMail SendMail] Cifrando mensaje con Qlock...');
  const encryptResult = await encryptFile(messageBlob);

  // 4. Generar hash del mensaje cifrado
  const messageHash = await generateMessageHash(encryptResult.encryptedBlob);
  console.log(`[QMail SendMail] Hash del mensaje: ${messageHash.slice(0, 16)}...`);

  // 5. Subir mensaje cifrado a IPFS
  console.log('[QMail SendMail] Subiendo a IPFS...');
  const encryptedFile = new File([encryptResult.encryptedBlob], `qmail_${Date.now()}.enc`);
  const ipfsHash = await uploadToIPFS(encryptedFile);
  console.log(`[QMail SendMail] IPFS Hash: ${ipfsHash.slice(0, 16)}...`);

  // 6. Registrar en Qindex usando el módulo específico de QMail
  console.log('[QMail SendMail] Registrando en Qindex...');
  await registerMessageIndex(messageHash, ipfsHash, {
    senderDID: activeIdentity.did,
    receiverDID: formData.recipientId,
    timestamp: new Date().toISOString(),
    type: 'qmail',
    ipfsHash,
    encryptedWith: 'QLOCK',
    aesKeyHash: encryptResult.aesKey.slice(0, 8) + '...',
    senderSpace: activeIdentity.space || 'unknown',
    subject: formData.subject,
    priority: formData.priority
  });

  // 7. Registrar en Qerberos
  console.log('[QMail SendMail] Registrando en Qerberos...');
  await logAccess({
    cid: ipfsHash,
    identity: activeIdentity.did,
    status: 'SUCCESS',
    operation: 'UPLOAD',
    reason: 'QMail message sent successfully',
    metadata: {
      fileName: `qmail_${messageHash.slice(0, 8)}.enc`,
      fileSize: encryptResult.encryptedBlob.size
    }
  });

  console.log('[QMail SendMail] ✅ Mensaje enviado exitosamente');

  return {
    encryptedContent: encryptResult.encryptedBlob.toString(),
    ipfsHash,
    messageHash,
    metadata: {
      senderDID: activeIdentity.did,
      receiverDID: formData.recipientId,
      timestamp: new Date().toISOString(),
      type: 'qmail',
      encryptedWith: 'QLOCK',
      aesKeyHash: encryptResult.aesKey.slice(0, 8) + '...',
      senderSpace: activeIdentity.space || 'unknown'
    }
  };
}

/**
 * Genera hash SHA-256 del contenido cifrado
 */
async function generateMessageHash(encryptedBlob: Blob): Promise<string> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
