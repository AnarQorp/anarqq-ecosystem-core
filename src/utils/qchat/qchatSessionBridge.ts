/**
 * Qchat Session Bridge - Conecta Qchat con grupos públicos de Session (Oxen)
 */

import { verifyIntegrity } from '@/lib/qerberos';
import { logFileOperation } from '@/lib/qindex';
import { getActiveIdentity } from '@/state/identity';

export interface SessionBridgeSettings {
  enabled: boolean;
  groupId: string;
  botToken?: string;
  serverUrl: string;
  pollInterval: number; // en segundos
  sendToSession: boolean; // Si enviar mensajes locales al grupo Session
}

export interface SessionMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  sessionGroupId: string;
  verified: boolean;
  isExternal: true;
  alias?: string; // Alias en Session que puede corresponder a un DID
}

export interface SessionBridgeStatus {
  connected: boolean;
  lastPoll?: number;
  messagesReceived: number;
  messagesSent: number;
  errors: string[];
}

// Estado del puente
let bridgeSettings: SessionBridgeSettings | null = null;
let bridgeStatus: SessionBridgeStatus = {
  connected: false,
  messagesReceived: 0,
  messagesSent: 0,
  errors: []
};
let pollingInterval: NodeJS.Timeout | null = null;
let lastMessageId: string | null = null;

/**
 * Obtiene configuración del localStorage
 */
export function getSessionBridgeSettings(identityDID: string): SessionBridgeSettings | null {
  try {
    const stored = localStorage.getItem(`qchat_session_bridge_${identityDID}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Session Bridge] Error cargando configuración:', error);
    return null;
  }
}

/**
 * Guarda configuración en localStorage
 */
export async function saveSessionBridgeSettings(
  identityDID: string, 
  settings: SessionBridgeSettings
): Promise<void> {
  try {
    localStorage.setItem(`qchat_session_bridge_${identityDID}`, JSON.stringify(settings));
    bridgeSettings = settings;
    console.log('[Session Bridge] Configuración guardada:', settings);
    
    // Reiniciar puente si está habilitado
    if (settings.enabled) {
      await startSessionBridge();
    } else {
      stopSessionBridge();
    }
  } catch (error) {
    console.error('[Session Bridge] Error guardando configuración:', error);
    throw error;
  }
}

/**
 * Inicia el puente Session
 */
export async function startSessionBridge(): Promise<void> {
  const identity = getActiveIdentity();
  if (!identity) {
    throw new Error('No hay identidad activa');
  }

  const settings = getSessionBridgeSettings(identity.did);
  if (!settings || !settings.enabled) {
    console.log('[Session Bridge] Puente deshabilitado');
    return;
  }

  bridgeSettings = settings;
  
  // Detener polling anterior si existe
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  try {
    // Verificar conexión inicial
    await testSessionConnection(settings);
    
    bridgeStatus.connected = true;
    bridgeStatus.errors = [];
    
    console.log(`[Session Bridge] ✅ Iniciado para grupo: ${settings.groupId}`);
    
    // Iniciar polling de mensajes
    pollingInterval = setInterval(async () => {
      try {
        await pollSessionMessages();
      } catch (error) {
        console.error('[Session Bridge] Error en polling:', error);
        bridgeStatus.errors.push(`Polling error: ${error instanceof Error ? error.message : 'Unknown'}`);
        
        // Limitar errores almacenados
        if (bridgeStatus.errors.length > 10) {
          bridgeStatus.errors = bridgeStatus.errors.slice(-5);
        }
      }
    }, (settings.pollInterval || 30) * 1000);
    
  } catch (error) {
    bridgeStatus.connected = false;
    bridgeStatus.errors.push(`Connection error: ${error instanceof Error ? error.message : 'Unknown'}`);
    console.error('[Session Bridge] ❌ Error iniciando puente:', error);
    throw error;
  }
}

/**
 * Detiene el puente Session
 */
export function stopSessionBridge(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  bridgeStatus.connected = false;
  bridgeSettings = null;
  
  console.log('[Session Bridge] ⏹️ Puente detenido');
}

/**
 * Prueba la conexión con Session
 */
export async function testSessionConnection(settings: SessionBridgeSettings): Promise<{ success: boolean; error?: string }> {
  try {
    // Simular llamada a API de Session Open Group
    const testUrl = `${settings.serverUrl}/groups/${settings.groupId}/messages?limit=1`;
    
    console.log('[Session Bridge] Probando conexión:', testUrl);
    
    // En una implementación real, aquí haríamos:
    // const response = await fetch(testUrl, {
    //   headers: settings.botToken ? { 'Authorization': `Bearer ${settings.botToken}` } : {}
    // });
    
    // Por ahora simulamos una respuesta exitosa
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de conexión' 
    };
  }
}

/**
 * Realiza polling de mensajes nuevos desde Session
 */
async function pollSessionMessages(): Promise<void> {
  if (!bridgeSettings || !bridgeStatus.connected) return;
  
  try {
    // Simular obtención de mensajes desde Session
    // En producción: GET {serverUrl}/groups/{groupId}/messages?since={lastMessageId}
    
    const mockMessages = generateMockSessionMessages();
    
    for (const message of mockMessages) {
      await processSessionMessage(message);
    }
    
    bridgeStatus.lastPoll = Date.now();
    
  } catch (error) {
    console.error('[Session Bridge] Error en polling:', error);
    throw error;
  }
}

/**
 * Procesa un mensaje entrante de Session
 */
async function processSessionMessage(sessionMessage: SessionMessage): Promise<void> {
  const identity = getActiveIdentity();
  if (!identity) return;
  
  try {
    // 1. Verificar integridad con Qerberos (estructura básica)
    const verified = await verifyIntegrity(`session_${sessionMessage.id}`);
    sessionMessage.verified = verified;
    
    // 2. Registrar en Qindex como mensaje externo usando operación 'ACCESS'
    await logFileOperation(
      `session_${sessionMessage.id}`,
      `session_msg_${sessionMessage.timestamp}`,
      identity.did,
      'ACCESS', // Usando 'ACCESS' en lugar de 'EXTERNAL_MESSAGE'
      `session_message_${sessionMessage.id}.txt`,
      sessionMessage.content.length,
      identity.space,
      'session_bridge'
    );
    
    // 3. Emitir evento para que la UI lo capture
    window.dispatchEvent(new CustomEvent('qchat:session-message', {
      detail: sessionMessage
    }));
    
    bridgeStatus.messagesReceived++;
    console.log(`[Session Bridge] ✅ Mensaje procesado: ${sessionMessage.id}`);
    
  } catch (error) {
    console.error('[Session Bridge] Error procesando mensaje:', error);
  }
}

/**
 * Envía un mensaje local al grupo Session
 */
export async function sendMessageToSession(
  content: string,
  senderAlias?: string
): Promise<{ success: boolean; error?: string }> {
  if (!bridgeSettings || !bridgeSettings.sendToSession) {
    return { success: false, error: 'Puente Session no configurado para envío' };
  }
  
  const identity = getActiveIdentity();
  if (!identity) {
    return { success: false, error: 'No hay identidad activa' };
  }
  
  try {
    // Formatear mensaje para Session
    const sessionContent = senderAlias ? `@${senderAlias}: ${content}` : content;
    
    console.log(`[Session Bridge] Enviando a Session: ${sessionContent.slice(0, 50)}...`);
    
    // En producción: POST {serverUrl}/groups/{groupId}/messages
    // const response = await fetch(`${bridgeSettings.serverUrl}/groups/${bridgeSettings.groupId}/messages`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     ...(bridgeSettings.botToken ? { 'Authorization': `Bearer ${bridgeSettings.botToken}` } : {})
    //   },
    //   body: JSON.stringify({
    //     content: sessionContent,
    //     sender: senderAlias || identity.name || identity.did.slice(0, 8)
    //   })
    // });
    
    // Simular envío exitoso
    await new Promise(resolve => setTimeout(resolve, 500));
    
    bridgeStatus.messagesSent++;
    console.log('[Session Bridge] ✅ Mensaje enviado a Session');
    
    return { success: true };
    
  } catch (error) {
    console.error('[Session Bridge] Error enviando mensaje:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Obtiene el estado actual del puente
 */
export function getSessionBridgeStatus(): SessionBridgeStatus {
  return { ...bridgeStatus };
}

/**
 * Genera mensajes mock para desarrollo
 */
function generateMockSessionMessages(): SessionMessage[] {
  if (!bridgeSettings || Math.random() > 0.3) return []; // 30% probabilidad de mensajes
  
  const mockMessages: SessionMessage[] = [];
  const messageCount = Math.floor(Math.random() * 2) + 1; // 1-2 mensajes
  
  for (let i = 0; i < messageCount; i++) {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const senders = ['alice_session', 'bob_oxen', 'charlie_net', 'diana_user'];
    const contents = [
      'Hello from Session network!',
      'Testing the bridge connection',
      'Message from Oxen group',
      'Session bridge is working'
    ];
    
    mockMessages.push({
      id,
      sender: senders[Math.floor(Math.random() * senders.length)],
      content: contents[Math.floor(Math.random() * contents.length)],
      timestamp: Date.now() - (i * 1000),
      sessionGroupId: bridgeSettings.groupId,
      verified: Math.random() > 0.2, // 80% verificados
      isExternal: true,
      alias: Math.random() > 0.5 ? `user${Math.floor(Math.random() * 100)}` : undefined
    });
  }
  
  return mockMessages;
}
