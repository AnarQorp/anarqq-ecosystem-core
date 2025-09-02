/**
 * Módulo Qlock - Sistema de cifrado para AnarQ & Q
 * 
 * Provee funciones para el cifrado y descifrado seguro usando AES-GCM.
 * Todas las operaciones son asíncronas y utilizan la API WebCrypto nativa.
 */

export class Qlock {
  // Algoritmo de cifrado
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256; // bits
  private static readonly IV_LENGTH = 12; // 96 bits para AES-GCM (recomendado)

  /**
   * Genera una nueva clave simétrica AES-GCM
   */
  public static async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Exporta una clave a formato base64
   */
  public static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Importa una clave desde formato base64
   */
  public static async importKey(base64: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(base64);
    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Cifra datos usando AES-GCM
   * @param data Datos a cifrar
   * @param key Clave de cifrado
   * @returns ArrayBuffer con IV + datos cifrados
   */
  public static async encrypt(data: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
    // Generar IV aleatorio
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Cifrar los datos
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv,
        tagLength: 128 // longitud de tag de autenticación en bits
      },
      key,
      data
    );

    // Concatenar IV + datos cifrados
    const result = new Uint8Array(iv.byteLength + encryptedData.byteLength);
    result.set(new Uint8Array(iv), 0);
    result.set(new Uint8Array(encryptedData), iv.byteLength);

    return result.buffer;
  }

  /**
   * Descifra datos usando AES-GCM
   * @param data Datos cifrados (IV + datos)
   * @param key Clave de descifrado
   * @returns ArrayBuffer con los datos descifrados
   */
  public static async decrypt(data: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
    // Extraer IV (primeros 12 bytes)
    const iv = data.slice(0, this.IV_LENGTH);
    
    // Extraer datos cifrados (el resto)
    const encryptedData = data.slice(this.IV_LENGTH);

    // Descifrar
    return await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv,
        tagLength: 128
      },
      key,
      encryptedData
    );
  }

  // --- Funciones de utilidad ---

  /**
   * Convierte un ArrayBuffer a base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Convierte base64 a ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Exportar una instancia por defecto para facilitar el uso
export default new Qlock();
