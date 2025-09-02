
/**
 * SMTP Integration for External Email Support
 * Handles sending encrypted documents via external email providers
 */

import { getActiveIdentity } from '@/state/identity';

export interface EmailConfig {
  provider: 'gmail' | 'protonmail' | 'outlook' | 'custom';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: Blob;
    contentType: string;
  }[];
  isEncrypted: boolean;
  registerOnBlockchain: boolean;
}

// Email provider configurations
const EMAIL_PROVIDERS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    name: 'Gmail'
  },
  protonmail: {
    host: 'mail.protonmail.com',
    port: 587,
    secure: false,
    name: 'ProtonMail'
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    name: 'Outlook'
  }
};

/**
 * Validate email configuration
 */
export function validateEmailConfig(config: EmailConfig): boolean {
  const provider = EMAIL_PROVIDERS[config.provider];
  if (!provider && config.provider !== 'custom') {
    return false;
  }
  
  return !!(
    config.smtp.host &&
    config.smtp.port &&
    config.smtp.user &&
    config.smtp.password
  );
}

/**
 * Send email via SMTP (simulated for frontend)
 * In production, this would call a backend service
 */
export async function sendEmailViaSMTP(
  message: EmailMessage,
  config: EmailConfig
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  console.log(`[SMTP] Preparando envío de email...`);
  console.log(`[SMTP] Para: ${message.to}`);
  console.log(`[SMTP] Asunto: ${message.subject}`);
  console.log(`[SMTP] Cifrado: ${message.isEncrypted ? 'Sí' : 'No'}`);
  console.log(`[SMTP] Blockchain: ${message.registerOnBlockchain ? 'Sí' : 'No'}`);
  
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    return {
      success: false,
      error: 'No hay identidad sQuid activa'
    };
  }
  
  // Validate configuration
  if (!validateEmailConfig(config)) {
    return {
      success: false,
      error: 'Configuración SMTP inválida'
    };
  }
  
  try {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, this would be a real API call to your backend
    const emailData = {
      from: `${activeIdentity.name} <${config.smtp.user}>`,
      to: message.to,
      subject: `[AnarQ&Q] ${message.subject}`,
      html: generateEmailHTML(message, activeIdentity),
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };
    
    // Simulate successful send
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`[SMTP] ✅ Email enviado exitosamente`);
    console.log(`[SMTP] Message ID: ${messageId}`);
    
    return {
      success: true,
      messageId
    };
    
  } catch (error) {
    console.error('[SMTP] ❌ Error enviando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(message: EmailMessage, sender: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${message.subject}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
        .logo { color: #3b82f6; font-size: 24px; font-weight: bold; }
        .sender { color: #6b7280; font-size: 14px; margin-top: 5px; }
        .content { line-height: 1.6; color: #374151; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .security-notice { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 10px; margin: 15px 0; }
        .attachment-info { background: #f3f4f6; border-radius: 4px; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AnarQ&Q</div>
          <div class="sender">Enviado por: ${sender.name} (DID: ${sender.did.slice(0, 20)}...)</div>
        </div>
        
        <div class="content">
          ${message.body.replace(/\n/g, '<br>')}
        </div>
        
        ${message.isEncrypted ? `
        <div class="security-notice">
          🔒 <strong>Mensaje cifrado:</strong> Este contenido ha sido cifrado con tecnología Qlock del ecosistema AnarQ&Q.
        </div>` : ''}
        
        ${message.attachments && message.attachments.length > 0 ? `
        <div class="attachment-info">
          📎 <strong>Archivos adjuntos:</strong> ${message.attachments.length} archivo(s) incluido(s)
          ${message.registerOnBlockchain ? '<br>✅ Los documentos serán registrados en blockchain para verificación de integridad.' : ''}
        </div>` : ''}
        
        <div class="footer">
          Este mensaje fue enviado desde el ecosistema descentralizado AnarQ&Q.<br>
          Para más información, visita: <a href="https://anarq.network">https://anarq.network</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get email provider configuration
 */
export function getEmailProviderConfig(provider: keyof typeof EMAIL_PROVIDERS): any {
  return EMAIL_PROVIDERS[provider];
}

/**
 * Test SMTP connection
 */
export async function testSMTPConnection(config: EmailConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[SMTP] Probando conexión a ${config.provider}...`);
  
  try {
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (!validateEmailConfig(config)) {
      throw new Error('Configuración inválida');
    }
    
    console.log(`[SMTP] ✅ Conexión exitosa`);
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] ❌ Error de conexión:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión'
    };
  }
}
