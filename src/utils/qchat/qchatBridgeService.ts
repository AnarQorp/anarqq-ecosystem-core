
/**
 * Qchat Bridge Service - Servicio de puentes para Telegram y Discord
 */

export interface TelegramBridgeConfig {
  enabled: boolean;
  webhookUrl: string;
  chatId: string;
}

export interface DiscordBridgeConfig {
  enabled: boolean;
  webhookUrl: string;
  channelId: string;
}

export interface QchatBridgeSettings {
  enableBridges: boolean;
  telegram: TelegramBridgeConfig;
  discord: DiscordBridgeConfig;
}

// Almacenamiento de configuraciones por DID
const bridgeSettings = new Map<string, QchatBridgeSettings>();

/**
 * Obtiene la configuración de puentes para una identidad
 */
export async function getQchatSettings(identityDID: string): Promise<QchatBridgeSettings | null> {
  // Intentar cargar desde localStorage
  try {
    const stored = localStorage.getItem(`qchat_bridge_${identityDID}`);
    if (stored) {
      const settings = JSON.parse(stored);
      bridgeSettings.set(identityDID, settings);
      return settings;
    }
  } catch (error) {
    console.error('[Qchat Bridge] Error cargando configuración:', error);
  }

  // Configuración por defecto
  const defaultSettings: QchatBridgeSettings = {
    enableBridges: false,
    telegram: {
      enabled: false,
      webhookUrl: '',
      chatId: ''
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      channelId: ''
    }
  };

  bridgeSettings.set(identityDID, defaultSettings);
  return defaultSettings;
}

/**
 * Guarda la configuración de puentes para una identidad
 */
export async function saveQchatSettings(identityDID: string, settings: QchatBridgeSettings): Promise<void> {
  try {
    // Guardar en memoria
    bridgeSettings.set(identityDID, settings);
    
    // Persistir en localStorage
    localStorage.setItem(`qchat_bridge_${identityDID}`, JSON.stringify(settings));
    
    console.log(`[Qchat Bridge] Configuración guardada para ${identityDID.slice(0, 16)}...`);
    console.log(`[Qchat Bridge] Puentes habilitados: ${settings.enableBridges}`);
    console.log(`[Qchat Bridge] Telegram: ${settings.telegram.enabled}`);
    console.log(`[Qchat Bridge] Discord: ${settings.discord.enabled}`);
    
  } catch (error) {
    console.error('[Qchat Bridge] Error guardando configuración:', error);
    throw error;
  }
}

/**
 * Envía un mensaje cifrado a los puentes configurados
 */
export async function sendToBridges(
  senderDID: string,
  messageData: {
    messageId: string;
    encryptedContent: Blob;
    recipientDID: string;
    timestamp: string;
  }
): Promise<{
  success: boolean;
  sentTo: string[];
  errors: { platform: string; error: string }[];
}> {
  console.log(`[Qchat Bridge] Enviando a puentes para ${senderDID.slice(0, 16)}...`);
  
  const settings = await getQchatSettings(senderDID);
  if (!settings || !settings.enableBridges) {
    console.log(`[Qchat Bridge] Puentes deshabilitados para esta identidad`);
    return { success: true, sentTo: [], errors: [] };
  }

  const results = {
    success: false,
    sentTo: [] as string[],
    errors: [] as { platform: string; error: string }[]
  };

  // Convertir el contenido cifrado a base64 para transmisión
  const encryptedBase64 = await blobToBase64(messageData.encryptedContent);
  
  const payload = {
    messageId: messageData.messageId,
    senderDID: senderDID.slice(0, 20) + '...', // DID truncado por privacidad
    recipientDID: messageData.recipientDID.slice(0, 20) + '...',
    encryptedContent: encryptedBase64,
    timestamp: messageData.timestamp,
    source: 'AnarQ&Q Qchat',
    note: 'Mensaje cifrado - requiere cliente autorizado para descifrar'
  };

  // Enviar a Telegram si está configurado
  if (settings.telegram.enabled && settings.telegram.webhookUrl) {
    try {
      const telegramResult = await sendToTelegram(settings.telegram, payload);
      if (telegramResult.success) {
        results.sentTo.push('telegram');
        console.log(`[Qchat Bridge] ✅ Enviado a Telegram`);
      } else {
        results.errors.push({ platform: 'telegram', error: telegramResult.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[Qchat Bridge] Error enviando a Telegram:', error);
      results.errors.push({ 
        platform: 'telegram', 
        error: error instanceof Error ? error.message : 'Error de conexión' 
      });
    }
  }

  // Enviar a Discord si está configurado
  if (settings.discord.enabled && settings.discord.webhookUrl) {
    try {
      const discordResult = await sendToDiscord(settings.discord, payload);
      if (discordResult.success) {
        results.sentTo.push('discord');
        console.log(`[Qchat Bridge] ✅ Enviado a Discord`);
      } else {
        results.errors.push({ platform: 'discord', error: discordResult.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[Qchat Bridge] Error enviando a Discord:', error);
      results.errors.push({ 
        platform: 'discord', 
        error: error instanceof Error ? error.message : 'Error de conexión' 
      });
    }
  }

  results.success = results.sentTo.length > 0;
  
  if (results.sentTo.length > 0) {
    console.log(`[Qchat Bridge] 🎉 Mensaje replicado exitosamente a: ${results.sentTo.join(', ')}`);
  }
  
  if (results.errors.length > 0) {
    console.warn(`[Qchat Bridge] ⚠️ Errores en puentes:`, results.errors);
  }

  return results;
}

/**
 * Envía mensaje a Telegram mediante webhook
 */
async function sendToTelegram(
  config: TelegramBridgeConfig,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  const telegramPayload = {
    chat_id: config.chatId,
    text: `🔐 **Mensaje Cifrado Qchat**\n\n` +
          `**ID:** ${payload.messageId}\n` +
          `**De:** ${payload.senderDID}\n` +
          `**Para:** ${payload.recipientDID}\n` +
          `**Tiempo:** ${new Date(payload.timestamp).toLocaleString()}\n\n` +
          `**Contenido Cifrado:**\n\`\`\`\n${payload.encryptedContent.slice(0, 100)}...\n\`\`\`\n\n` +
          `⚠️ Este mensaje está cifrado y requiere un cliente autorizado para descifrar.`,
    parse_mode: 'Markdown'
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telegramPayload),
      mode: 'no-cors' // Para evitar problemas de CORS en demo
    });

    // Como usamos no-cors, asumimos éxito si no hay excepción
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de conexión con Telegram' 
    };
  }
}

/**
 * Envía mensaje a Discord mediante webhook
 */
async function sendToDiscord(
  config: DiscordBridgeConfig,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  const discordPayload = {
    content: null,
    embeds: [{
      title: "🔐 Mensaje Cifrado Qchat",
      description: "Nuevo mensaje cifrado recibido desde AnarQ&Q",
      color: 0x3498db,
      fields: [
        { name: "ID del Mensaje", value: payload.messageId, inline: true },
        { name: "Remitente", value: payload.senderDID, inline: true },
        { name: "Destinatario", value: payload.recipientDID, inline: true },
        { name: "Timestamp", value: new Date(payload.timestamp).toLocaleString(), inline: false },
        { 
          name: "Contenido Cifrado (muestra)", 
          value: `\`\`\`\n${payload.encryptedContent.slice(0, 150)}...\n\`\`\``, 
          inline: false 
        }
      ],
      footer: {
        text: "⚠️ Mensaje cifrado - requiere cliente autorizado para descifrar"
      },
      timestamp: payload.timestamp
    }]
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discordPayload),
      mode: 'no-cors' // Para evitar problemas de CORS en demo
    });

    // Como usamos no-cors, asumimos éxito si no hay excepción
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de conexión con Discord' 
    };
  }
}

/**
 * Prueba la conexión con Telegram
 */
export async function testTelegramBridge(config: TelegramBridgeConfig): Promise<{ success: boolean; error?: string }> {
  if (!config.webhookUrl || !config.chatId) {
    return { success: false, error: 'Configuración incompleta para Telegram' };
  }

  const testPayload = {
    chat_id: config.chatId,
    text: `🧪 **Test de Conexión Qchat**\n\nEste es un mensaje de prueba desde AnarQ&Q Qchat.\n\n⏰ ${new Date().toLocaleString()}`,
    parse_mode: 'Markdown'
  };

  return sendToTelegram(config, {
    messageId: 'test_' + Date.now(),
    senderDID: 'did:test:sender',
    recipientDID: 'did:test:recipient',
    encryptedContent: 'VGVzdCBkZSBjb25leGnDs24gUWNoYXQ=',
    timestamp: new Date().toISOString()
  });
}

/**
 * Prueba la conexión con Discord
 */
export async function testDiscordBridge(config: DiscordBridgeConfig): Promise<{ success: boolean; error?: string }> {
  if (!config.webhookUrl) {
    return { success: false, error: 'Configuración incompleta para Discord' };
  }

  return sendToDiscord(config, {
    messageId: 'test_' + Date.now(),
    senderDID: 'did:test:sender',
    recipientDID: 'did:test:recipient',
    encryptedContent: 'VGVzdCBkZSBjb25leGnDs24gUWNoYXQ=',
    timestamp: new Date().toISOString()
  });
}

/**
 * Convierte un Blob a base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remover prefijo data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
