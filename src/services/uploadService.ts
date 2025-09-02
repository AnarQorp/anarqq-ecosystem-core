import { uploadAndRegisterFile } from '@/utils/qdrive/ipfsService';
import { encryptFile } from '@/lib/qlock';
import { getActiveIdentity } from '@/state/identity';
import { useSessionContext } from '@/contexts/SessionContext';
import type { UnifiedFile } from '@/modules/qpic/types';

// Import the logFileOperation function with a type assertion to work around the module resolution
const logFileOperation = async (...args: any[]) => {
  const { logFileOperation } = await import('@/lib/qindex');
  return logFileOperation(...args);
};

export interface UploadOptions {
  encrypt?: boolean;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

export async function uploadWithEncryption(
  file: File,
  options: UploadOptions = {}
): Promise<UnifiedFile> {
  const { encrypt = true, metadata = {}, onProgress } = options;
  const identity = getActiveIdentity();
  const { cid_profile } = useSessionContext();

  if (!identity) {
    throw new Error('No active identity found');
  }

  try {
    let fileToUpload = file;
    let fileHash: string | undefined;
    let encryptionMetadata = {};

    // Encrypt if needed
    if (encrypt) {
      const { encryptedBlob, fileHash: hash } = await encryptFile(file);
      fileToUpload = new File([encryptedBlob], file.name, { type: 'application/octet-stream' });
      fileHash = hash;
      encryptionMetadata = { isEncrypted: true, fileHash };
    }

    // Upload to IPFS and get the result
    const uploadResult = await uploadAndRegisterFile(
      fileToUpload, // file
      {
        did: identity.did,
        name: file.name,
        type: file.type,
        size: file.size,
        cid_profile,
        ...encryptionMetadata,
        ...metadata,
      } as any // Type assertion to avoid type errors with the identity object
    );

    // Create a UnifiedFile object to return
    const unifiedFile: UnifiedFile = {
      cid: uploadResult.ipfsHash,
      name: file.name,
      type: file.type,
      size: file.size,
      timestamp: uploadResult.timestamp || new Date().toISOString(),
      cid_profile: uploadResult.cid_profile || cid_profile || '',
      metadata: {
        uploaderDid: identity.did,
        cid_profile: uploadResult.cid_profile || cid_profile || '',
        isEncrypted: encrypt,
        fileHash: fileHash || uploadResult.encryptedHash || '',
        source: 'qdrive',
        ...encryptionMetadata,
        ...metadata,
        // Include any additional metadata from the upload result
        ...(uploadResult.metadata || {})
      }
    };

    return unifiedFile;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
