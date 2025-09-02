import axios from 'axios';
import { getActiveIdentity } from '@/state/identity';

const API_BASE_URL = '/api/qchat';

/**
 * Envía un mensaje cifrado a través del backend
 */
export async function sendEncryptedMessage({
  recipientDID,
  encryptedContent,
  saveToIPFS = false,
  metadata = {}
}: {
  recipientDID: string;
  encryptedContent: string;
  saveToIPFS?: boolean;
  metadata?: Record<string, any>;
}) {
  const identity = getActiveIdentity();
  if (!identity) {
    throw new Error('No active identity found');
  }

  // Firmar el mensaje con la identidad activa
  const message = {
    senderDID: identity.did,
    recipientDID,
    encryptedContent,
    metadata: {
      ...metadata,
      saveToIPFS,
      timestamp: new Date().toISOString()
    }
  };

  const signature = await identity.sign(JSON.stringify(message));

  const response = await axios.post(
    `${API_BASE_URL}/messages`,
    {
      ...message,
      signature,
      did: identity.did
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Identity-DID': identity.did
      }
    }
  );

  return response.data;
}

/**
 * Obtiene mensajes para el usuario actual
 */
export async function fetchMessages({
  since,
  limit = 50
}: {
  since?: Date;
  limit?: number;
} = {}) {
  const identity = getActiveIdentity();
  if (!identity) {
    throw new Error('No active identity found');
  }

  const params = new URLSearchParams();
  if (since) params.append('since', since.toISOString());
  params.append('limit', limit.toString());

  // Firmar la solicitud
  const message = {
    action: 'fetchMessages',
    timestamp: new Date().toISOString(),
    did: identity.did
  };
  
  const signature = await identity.sign(JSON.stringify(message));

  const response = await axios.get(
    `${API_BASE_URL}/messages/${encodeURIComponent(identity.did)}?${params.toString()}`,
    {
      headers: {
        'X-Signature': signature,
        'X-Identity-DID': identity.did,
        'X-Message': JSON.stringify(message)
      }
    }
  );

  return response.data.messages || [];
}

/**
 * Verifica el estado del servicio Qchat
 */
export async function checkHealth() {
  const response = await axios.get(`${API_BASE_URL}/health`);
  return response.data;
}
