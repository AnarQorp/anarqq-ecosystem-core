import { downloadFromIPFS } from '@/lib/storachaClient';
import { showError } from '@/utils/notifications';

interface DownloadOptions {
  spaceDID?: string;
  decrypt?: boolean;
}

/**
 * Download a file from IPFS
 * @param cid - The CID of the file to download
 * @param options - Download options
 * @returns Promise with the downloaded file data
 */
export async function downloadFileFromIPFS(
  cid: string,
  options: DownloadOptions = {}
) {
  const { spaceDID, decrypt = false } = options;
  
  try {
    const result = await downloadFromIPFS(cid, {
      spaceDID,
      decrypt,
    });
    
    return {
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
      metadata: result.metadata || {},
    };
  } catch (error) {
    console.error(`Error downloading file ${cid} from IPFS:`, error);
    showError(
      'Download Failed',
      `Failed to download file with CID: ${cid}`
    );
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to download file from IPFS'),
      cid,
    };
  }
}

/**
 * Download and create a blob URL for a file from IPFS
 * This is useful for displaying images or other files in the browser
 * @param cid - The CID of the file to download
 * @param options - Download options
 * @returns Promise with the blob URL and file info
 */
export async function getIPFSBlobUrl(
  cid: string,
  options: DownloadOptions = {}
) {
  const result = await downloadFileFromIPFS(cid, options);
  
  if (!result.success) {
    return result;
  }
  
  try {
    const blob = new Blob([result.data], { type: result.contentType });
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      url,
      filename: result.filename,
      contentType: result.contentType,
      metadata: result.metadata,
      // Function to revoke the URL when it's no longer needed
      revoke: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    console.error(`Error creating blob URL for CID ${cid}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to create blob URL'),
      cid,
    };
  }
}

/**
 * Download and parse a JSON file from IPFS
 * @param cid - The CID of the JSON file to download
 * @param options - Download options
 * @returns Promise with the parsed JSON data
 */
export async function downloadJSONFromIPFS<T = any>(
  cid: string,
  options: DownloadOptions = {}
): Promise<{ success: boolean; data?: T; error?: Error; cid?: string }> {
  const result = await downloadFileFromIPFS(cid, options);
  
  if (!result.success) {
    return result;
  }
  
  try {
    // Convert ArrayBuffer to string if needed
    const jsonString = result.data instanceof ArrayBuffer
      ? new TextDecoder().decode(result.data)
      : result.data;
    
    // Parse the JSON string
    const data = JSON.parse(jsonString as string) as T;
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Error parsing JSON from IPFS (CID: ${cid}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to parse JSON from IPFS'),
      cid,
    };
  }
}
