
/**
 * File Encryption Utilities for Qlock
 * 
 * Este módulo maneja el cifrado y descifrado de archivos usando AES-GCM
 * antes de subirlos a IPFS. Utiliza la Web Crypto API nativa del navegador
 * para garantizar seguridad criptográfica robusta.
 * 
 * Algoritmo: AES-GCM (256 bits)
 * - Proporciona confidencialidad y autenticidad
 * - Resistente a ataques de manipulación
 * - Estándar de la industria para cifrado simétrico
 */

/**
 * Simula la generación de una clave QKD (Quantum Key Distribution)
 * En una implementación real, esto vendría del sistema cuántico
 * @returns Array de números que representa la clave cuántica
 */
export function simulateQKDKey(): number[] {
  const keyLength = 256; // 256 bits
  const key: number[] = [];
  
  for (let i = 0; i < keyLength; i++) {
    key.push(Math.floor(Math.random() * 2)); // 0 o 1 (bits cuánticos)
  }
  
  console.log(`🔑 Clave QKD simulada generada: ${keyLength} bits`);
  return key;
}

/**
 * Cifra un mensaje usando una clave QKD simulada
 * @param message - El mensaje a cifrar
 * @param qkdKey - La clave QKD como array de números
 * @returns El mensaje cifrado como string base64
 */
export function encryptMessage(message: string, qkdKey: number[]): string {
  try {
    console.log(`🔒 Cifrando mensaje con clave QKD de ${qkdKey.length} bits`);
    
    // Convertir el mensaje a bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Generar clave de cifrado a partir de la clave QKD
    const keyBytes = new Uint8Array(32); // 256 bits para AES-256
    for (let i = 0; i < keyBytes.length; i++) {
      keyBytes[i] = qkdKey[i % qkdKey.length] * 255; // Convertir bits a bytes
    }
    
    // Cifrado simple XOR (en producción usaríamos AES real)
    const encryptedBytes = new Uint8Array(messageBytes.length);
    for (let i = 0; i < messageBytes.length; i++) {
      encryptedBytes[i] = messageBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // Convertir a base64
    const encrypted = btoa(String.fromCharCode(...encryptedBytes));
    
    console.log(`✅ Mensaje cifrado exitosamente: ${encrypted.length} caracteres`);
    return encrypted;
    
  } catch (error) {
    console.error("❌ Error al cifrar el mensaje:", error);
    throw new Error(`Error en el cifrado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Descifra un mensaje usando una clave QKD
 * @param encryptedMessage - El mensaje cifrado en base64
 * @param qkdKey - La clave QKD como array de números
 * @returns El mensaje original descifrado
 */
export function decryptMessage(encryptedMessage: string, qkdKey: number[]): string {
  try {
    console.log(`🔓 Descifrando mensaje con clave QKD de ${qkdKey.length} bits`);
    
    // Convertir de base64 a bytes
    const encryptedBytes = new Uint8Array(
      atob(encryptedMessage).split('').map(char => char.charCodeAt(0))
    );
    
    // Generar la misma clave de cifrado
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < keyBytes.length; i++) {
      keyBytes[i] = qkdKey[i % qkdKey.length] * 255;
    }
    
    // Descifrar usando XOR
    const decryptedBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // Convertir bytes a string
    const decrypted = new TextDecoder().decode(decryptedBytes);
    
    console.log(`✅ Mensaje descifrado exitosamente`);
    return decrypted;
    
  } catch (error) {
    console.error("❌ Error al descifrar el mensaje:", error);
    throw new Error(`Error en el descifrado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Cifra un archivo usando AES-GCM
 * @param file - El archivo a cifrar
 * @returns Promise con el contenido cifrado, la clave y el IV
 */
export async function encryptFile(file: File): Promise<{
  ciphertext: ArrayBuffer;
  key: CryptoKey;
  iv: Uint8Array;
}> {
  try {
    console.log(`🔒 Iniciando cifrado de archivo: ${file.name} (${file.size} bytes)`);
    
    // 1. Convertir el archivo a ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    console.log(`📄 Archivo convertido a ArrayBuffer: ${fileBuffer.byteLength} bytes`);
    
    // 2. Generar una clave AES-GCM de 256 bits
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256, // 256 bits para máxima seguridad
      },
      true, // extractable: permite exportar la clave si es necesario
      ["encrypt", "decrypt"] // usos permitidos
    );
    console.log("🔑 Clave AES-256-GCM generada exitosamente");
    
    // 3. Generar un IV (Initialization Vector) aleatorio
    // Para AES-GCM se recomienda un IV de 96 bits (12 bytes)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    console.log(`🎲 IV aleatorio generado: ${iv.length} bytes`);
    
    // 4. Cifrar el contenido del archivo
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        // tagLength: 128 es el valor por defecto (128 bits de autenticación)
      },
      key,
      fileBuffer
    );
    
    console.log(`✅ Archivo cifrado exitosamente: ${ciphertext.byteLength} bytes`);
    
    return {
      ciphertext,
      key,
      iv
    };
    
  } catch (error) {
    console.error("❌ Error al cifrar el archivo:", error);
    throw new Error(`Error en el cifrado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Descifra un archivo usando AES-GCM
 * @param ciphertext - El contenido cifrado como ArrayBuffer
 * @param key - La clave AES utilizada para cifrar
 * @param iv - El IV utilizado durante el cifrado
 * @returns Promise con el contenido original como ArrayBuffer
 */
export async function decryptFile(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  try {
    console.log(`🔓 Iniciando descifrado: ${ciphertext.byteLength} bytes cifrados`);
    
    // Validar que los parámetros sean correctos
    if (!ciphertext || ciphertext.byteLength === 0) {
      throw new Error("El contenido cifrado está vacío o es inválido");
    }
    
    if (!key) {
      throw new Error("La clave de descifrado es requerida");
    }
    
    if (!iv || iv.length !== 12) {
      throw new Error("El IV debe tener exactamente 12 bytes para AES-GCM");
    }
    
    // Descifrar el contenido usando la misma configuración
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );
    
    console.log(`✅ Archivo descifrado exitosamente: ${decryptedBuffer.byteLength} bytes`);
    
    return decryptedBuffer;
    
  } catch (error) {
    console.error("❌ Error al descifrar el archivo:", error);
    
    // Proporcionar mensajes de error más específicos
    if (error instanceof Error && error.name === 'OperationError') {
      throw new Error("Error de descifrado: La clave, IV o datos cifrados son incorrectos");
    }
    
    throw new Error(`Error en el descifrado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Utilidad para exportar una clave CryptoKey a formato Raw (ArrayBuffer)
 * Útil para almacenar o transmitir la clave de forma segura
 * @param key - La clave a exportar
 * @returns Promise con la clave en formato ArrayBuffer
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  try {
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    console.log(`🔑 Clave exportada: ${exportedKey.byteLength} bytes`);
    return exportedKey;
  } catch (error) {
    console.error("❌ Error al exportar la clave:", error);
    throw new Error(`Error al exportar la clave: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Utilidad para importar una clave desde formato Raw (ArrayBuffer)
 * @param keyData - Los datos de la clave en formato ArrayBuffer
 * @returns Promise con la clave CryptoKey importada
 */
export async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  try {
    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
    console.log("🔑 Clave importada exitosamente");
    return importedKey;
  } catch (error) {
    console.error("❌ Error al importar la clave:", error);
    throw new Error(`Error al importar la clave: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Utilidad para generar un hash SHA-256 de un archivo
 * Útil para verificar la integridad después del cifrado/descifrado
 * @param file - El archivo del cual generar el hash
 * @returns Promise con el hash en formato hexadecimal
 */
export async function generateFileHash(file: File): Promise<string> {
  try {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileBuffer);
    
    // Convertir el hash a formato hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log(`🔍 Hash SHA-256 generado para ${file.name}: ${hashHex}`);
    return hashHex;
  } catch (error) {
    console.error("❌ Error al generar hash:", error);
    throw new Error(`Error al generar hash: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
