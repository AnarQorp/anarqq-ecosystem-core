import { uploadToIPFS } from '@/lib/storachaClient';
import { showError } from '@/utils/notifications';
import { FileWithPath } from 'react-dropzone';

interface UploadOptions {
  spaceDID?: string;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

/**
 * Upload a file to IPFS using the Storacha client
 * @param file - The file to upload
 * @param options - Upload options
 * @returns Promise with the upload result
 */
export async function uploadFileToIPFS(
  file: File | FileWithPath,
  options: UploadOptions = {}
) {
  const { spaceDID, metadata, onProgress } = options;
  
  try {
    // Convert FileWithPath to File if needed
    const fileToUpload = file instanceof File ? file : new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileToUpload.size > maxSize) {
      throw new Error(`File size exceeds the maximum limit of ${maxSize / (1024 * 1024)}MB`);
    }
    
    // Upload the file
    const result = await uploadToIPFS(fileToUpload, {
      spaceDID,
      metadata,
      onProgress,
    });
    
    return {
      success: true,
      cid: result.cid,
      url: result.url,
      metadata: result.metadata,
      file: fileToUpload,
    };
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    showError(
      'Upload Failed',
      error instanceof Error ? error.message : 'Failed to upload file to IPFS'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to upload file to IPFS'),
      file,
    };
  }
}

/**
 * Upload multiple files to IPFS
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Promise with the upload results
 */
export async function uploadFilesToIPFS(
  files: (File | FileWithPath)[],
  options: UploadOptions = {}
) {
  const uploadPromises = files.map((file) => 
    uploadFileToIPFS(file, options)
  );
  
  return Promise.all(uploadPromises);
}

/**
 * Upload a JSON object to IPFS
 * @param data - The JSON data to upload
 * @param options - Upload options
 * @returns Promise with the upload result
 */
export async function uploadJSONToIPFS(
  data: Record<string, any>,
  options: Omit<UploadOptions, 'onProgress'> = {}
) {
  const { spaceDID, metadata } = options;
  
  try {
    // Convert JSON to a Blob
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a file from the Blob
    const file = new File([blob], 'data.json', {
      type: 'application/json',
      lastModified: Date.now(),
    });
    
    // Upload the file
    const result = await uploadToIPFS(file, {
      spaceDID,
      metadata: {
        ...metadata,
        isJSON: true,
      },
    });
    
    return {
      success: true,
      cid: result.cid,
      url: result.url,
      metadata: result.metadata,
    };
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    showError(
      'Upload Failed',
      error instanceof Error ? error.message : 'Failed to upload JSON to IPFS'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to upload JSON to IPFS'),
    };
  }
}
