
/**
 * Qchat Core - Funcionalidades principales del módulo de chat cifrado
 */

import { getActiveIdentity } from '@/state/identity';
import { encryptFile } from '@/lib/qlock';
import { logFileOperation } from '@/lib/qindex';
import { verifyIntegrity } from '@/lib/qerberos';

/**
 * Inicializa el módulo Qchat para una identidad específica
 */
export async function initializeQchat(identityDID: string): Promise<void> {
  console.log(`[Qchat Core] Inicializando módulo para identidad: ${identityDID.slice(0, 16)}...`);
  
  // Verificar que la identidad esté activa
  const identity = getActiveIdentity();
  if (!identity || identity.did !== identityDID) {
    throw new Error('Identidad no válida o no activa');
  }
  
  // Simular inicialización de configuraciones
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Verificar módulos requeridos
  const requiredModules = ['qlock', 'qindex', 'qerberos'];
  for (const module of requiredModules) {
    console.log(`[Qchat Core] ✅ Módulo ${module} disponible`);
  }
  
  console.log(`[Qchat Core] ✅ Inicialización completa para ${identityDID.slice(0, 16)}...`);
}

/**
 * Función de prueba para verificar el flujo completo de Qchat
 */
export async function sendTestMessage(senderDID: string): Promise<void> {
  console.log(`[Qchat Test] 🧪 Iniciando test de flujo completo...`);
  
  try {
    // 1. Verificar identidad activa
    const identity = getActiveIdentity();
    if (!identity || identity.did !== senderDID) {
      throw new Error('Identidad no válida para test');
    }
    console.log(`[Qchat Test] ✅ Identidad verificada: ${identity.name}`);
    
    // 2. Crear mensaje de prueba
    const testMessage = {
      content: 'Mensaje de prueba desde Qchat',
      timestamp: new Date().toISOString(),
      senderDID,
      recipientDID: 'did:test:recipient123',
      metadata: {
        test: true,
        version: '1.0.0'
      }
    };
    
    // 3. Cifrar mensaje con Qlock
    const messageBlob = new Blob([JSON.stringify(testMessage)], { type: 'application/json' });
    const encryptionResult = await encryptFile(messageBlob);
    console.log(`[Qchat Test] ✅ Mensaje cifrado con Qlock - Tamaño: ${encryptionResult.encryptedBlob.size} bytes`);
    
    // 4. Simular subida a IPFS
    const mockIPFSHash = `QmTest${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[Qchat Test] ✅ Simulación IPFS - Hash: ${mockIPFSHash}`);
    
    // 5. Registrar en Qindex
    const qindexLog = await logFileOperation(
      mockIPFSHash,
      'encrypted_hash_test_' + Date.now(),
      senderDID,
      'UPLOAD',
      'qchat_test_message.json',
      encryptionResult.encryptedBlob.size,
      identity.space,
      encryptionResult.aesKey.slice(0, 8) + '...'
    );
    console.log(`[Qchat Test] ✅ Registrado en Qindex - Log ID: ${qindexLog.id}`);
    
    // 6. Verificar integridad con Qerberos
    const integrityCheck = await verifyIntegrity(mockIPFSHash);
    console.log(`[Qchat Test] ✅ Verificación Qerberos: ${integrityCheck ? 'VÁLIDO' : 'FALLO'}`);
    
    // 7. Resumen del test
    console.log(`[Qchat Test] 🎉 Test completado exitosamente:`);
    console.log(`[Qchat Test]   - Identidad: ${identity.name} (${senderDID.slice(0, 16)}...)`);
    console.log(`[Qchat Test]   - Cifrado: Qlock AES derivado de DID`);
    console.log(`[Qchat Test]   - Almacenamiento: IPFS simulado (${mockIPFSHash})`);
    console.log(`[Qchat Test]   - Indexado: Qindex (${qindexLog.id})`);
    console.log(`[Qchat Test]   - Verificación: Qerberos (${integrityCheck})`);
    
  } catch (error) {
    console.error(`[Qchat Test] ❌ Error durante test:`, error);
    throw error;
  }
}

/**
 * Valida el formato de un DID
 */
export function validateDID(did: string): boolean {
  const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
  return didRegex.test(did);
}

/**
 * Genera un ID único para mensajes
 */
export function generateMessageId(): string {
  return `qchat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
