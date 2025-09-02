
/**
 * IPFS API integrated with sQuid and Qlock
 * Manages encrypted file upload and download using active identity
 * REAL IPFS MODE ONLY - Production ready
 */

import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { encrypt, decrypt } from '@/api/qlock';
import { getUser } from '@/api/squid';
import { getActiveIdentity } from '@/lib/squid';

/**
 * Gets current identity from sQuid
 */
function getCurrentIdentity() {
  return getActiveIdentity();
}

/**
 * Gets active space from current identity
 */
function getActiveSpace(): string | undefined {
  const identity = getCurrentIdentity();
  return identity?.space;
}

/**
 * Uploads an encrypted file to IPFS using sQuid active identity
 * @param data - ArrayBuffer of file to upload
 * @param name - File name
 * @returns Promise<string> - CID of uploaded file
 */
export async function uploadEncryptedFile(data: ArrayBuffer, name: string): Promise<string> {
  // Get active identity
  const identity = getCurrentIdentity();
  if (!identity) {
    throw new Error("No identity found. Please login with sQuid first.");
  }

  const did = identity.id;
  const space = getActiveSpace();
  
  if (!space) {
    throw new Error("No space found for active identity.");
  }

  console.log(`[IPFS API] Uploading file "${name}" with identity: ${did.slice(0, 16)}...`);
  console.log(`[IPFS API] Active space: ${space}`);

  try {
    // Convert ArrayBuffer to string for encryption
    const dataString = new TextDecoder().decode(data);
    
    // Encrypt with Qlock using active identity DID
    const encryptResult = await encrypt(dataString, did, 'QUANTUM');
    
    if (!encryptResult.encryptedData) {
      throw new Error("Failed to encrypt file with Qlock");
    }

    // Convert encrypted data to JSON to store metadata
    const encryptedPayload = {
      encryptedData: encryptResult.encryptedData,
      metadata: {
        ...encryptResult.metadata,
        originalName: name,
        did,
        space,
        uploadedAt: new Date().toISOString()
      }
    };

    // Upload to IPFS
    const cid = await uploadToIPFS(encryptedPayload);
    
    console.log(`[IPFS API] File encrypted and uploaded successfully. CID: ${cid}`);
    console.log(`[IPFS API] Metadata included: DID=${did.slice(0, 16)}..., Space=${space}`);
    
    return cid;
    
  } catch (error) {
    console.error('[IPFS API] Error uploading encrypted file:', error);
    throw new Error(`Failed to upload encrypted file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Downloads and decrypts a file from IPFS using active identity
 * @param cid - CID of file in IPFS
 * @returns Promise<{data: ArrayBuffer, metadata: any}> - Decrypted file and metadata
 */
export async function downloadAndDecryptFile(cid: string): Promise<{
  data: ArrayBuffer;
  metadata: any;
}> {
  // Get active identity
  const identity = getCurrentIdentity();
  if (!identity) {
    throw new Error("No identity found. Please login with sQuid first.");
  }

  const did = identity.id;
  
  console.log(`[IPFS API] Downloading file CID: ${cid} with identity: ${did.slice(0, 16)}...`);

  try {
    // Download from IPFS
    const encryptedPayload = await getFromIPFS(cid);
    
    if (!encryptedPayload || !encryptedPayload.encryptedData) {
      throw new Error("Invalid encrypted payload from IPFS");
    }

    // Verify file belongs to current identity (optional)
    if (encryptedPayload.metadata?.did && encryptedPayload.metadata.did !== did) {
      console.warn(`[IPFS API] File created by different identity: ${encryptedPayload.metadata.did}`);
    }

    // Decrypt with Qlock using current DID
    const decryptResult = await decrypt(encryptedPayload.encryptedData, did);
    
    if (!decryptResult.success || !decryptResult.data) {
      throw new Error("Failed to decrypt file with current identity");
    }

    // Convert decrypted string back to ArrayBuffer
    const dataBuffer = new TextEncoder().encode(decryptResult.data);
    
    console.log(`[IPFS API] File decrypted successfully. Size: ${dataBuffer.byteLength} bytes`);
    
    return {
      data: dataBuffer,
      metadata: encryptedPayload.metadata || {}
    };
    
  } catch (error) {
    console.error('[IPFS API] Error downloading/decrypting file:', error);
    throw new Error(`Failed to download and decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if file can be decrypted by current identity
 * @param cid - CID of file in IPFS
 * @returns Promise<boolean> - true if can be decrypted
 */
export async function canDecryptFile(cid: string): Promise<boolean> {
  try {
    const identity = getCurrentIdentity();
    if (!identity) return false;

    // Download only metadata
    const encryptedPayload = await getFromIPFS(cid);
    
    if (!encryptedPayload?.metadata?.did) {
      return false; // No owner information
    }

    // Check if current identity can decrypt
    return encryptedPayload.metadata.did === identity.id;
    
  } catch (error) {
    console.error('[IPFS API] Error checking file access:', error);
    return false;
  }
}

/**
 * Gets file information without decrypting it
 * @param cid - CID of file in IPFS
 * @returns Promise<any> - File metadata
 */
export async function getFileMetadata(cid: string): Promise<any> {
  try {
    const encryptedPayload = await getFromIPFS(cid);
    return encryptedPayload?.metadata || {};
  } catch (error) {
    console.error('[IPFS API] Error getting metadata:', error);
    return {};
  }
}
