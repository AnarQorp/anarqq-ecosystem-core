import type { QmarketItem } from './types';

/**
 * Interface for QpiC file metadata
 */
interface QpicFileMetadata {
  ipfsHash: string;
  fileName: string;
  timestamp: string;
  cid_profile?: string;
  fileSize?: number;
  fileType?: string;
  description?: string;
}

/**
 * Transforms a QpiC file into a QmarketItem
 * 
 * @param file - The QpiC file metadata
 * @param cid_profile - The user's CID profile
 * @param overrides - Optional overrides for the generated QmarketItem
 * @returns A properly formatted QmarketItem
 */
export function generateQmarketItemFromQpic(
  file: QpicFileMetadata,
  cid_profile: string,
  overrides: Partial<QmarketItem> = {}
): QmarketItem {
  // Default values
  const defaultItem: QmarketItem = {
    cid: file.ipfsHash,
    publisher: {
      cid_profile,
      did: '', // This should be provided by the caller if needed
      name: undefined, // Optional, can be added later
    },
    metadata: {
      title: file.fileName,
      description: file.description,
      tags: [],
      license: 'cc-by-nc', // Default to CC BY-NC
      price: 0, // Default to free
      createdAt: file.timestamp,
    },
    content: {
      type: file.fileType || 'application/octet-stream',
      size: file.fileSize || 0,
      source: 'qpic',
    },
  };

  // Apply overrides if provided
  return deepMerge(defaultItem, overrides);
}

/**
 * Deep merges two objects, with the second object's properties taking precedence
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];
      
      // Handle nested objects
      if (
        targetValue &&
        sourceValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        // @ts-ignore - TypeScript doesn't understand the type narrowing here
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // @ts-ignore - We know the key exists in T
        result[key] = sourceValue !== undefined ? sourceValue : targetValue;
      }
    }
  }
  
  return result;
}

// Re-export types for convenience
export type { QmarketItem } from './types';
