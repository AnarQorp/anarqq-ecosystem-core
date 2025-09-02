import { createSpace, authorizeSpace } from '@/lib/storachaClient';
import { showError, showSuccess } from '@/utils/notifications';

/**
 * Create a new IPFS space
 * @param alias - The alias/name for the space
 * @param description - Optional description for the space
 * @param isPrivate - Whether the space should be private
 * @returns Promise with the created space info
 */
export async function createIPFSSpace(
  alias: string,
  description: string = '',
  isPrivate: boolean = true
) {
  try {
    const space = await createSpace({
      name: alias,
      description,
      isPrivate,
    });
    
    showSuccess('Space Created', `Successfully created space: ${alias}`);
    
    return {
      success: true,
      space,
    };
  } catch (error) {
    console.error('Error creating IPFS space:', error);
    showError(
      'Create Space Failed',
      error instanceof Error ? error.message : 'Failed to create IPFS space'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to create IPFS space'),
    };
  }
}

/**
 * Authorize an agent for a space
 * @param spaceDID - The DID of the space
 * @param agentDID - The DID of the agent to authorize
 * @param permissions - The permissions to grant
 * @returns Promise with the authorization result
 */
export async function authorizeIPFSSpace(
  spaceDID: string,
  agentDID: string,
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  }
) {
  try {
    // Create a delegation with the specified permissions
    const delegation = {
      spaceDID,
      agentDID,
      permissions: {
        canRead: permissions.read,
        canWrite: permissions.write,
        isAdmin: permissions.admin,
      },
      // 30-day expiration
      expiration: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
    };
    
    await authorizeSpace(spaceDID, agentDID, delegation);
    
    showSuccess(
      'Authorization Successful',
      `Successfully authorized ${agentDID} for space ${spaceDID}`
    );
    
    return {
      success: true,
      delegation,
    };
  } catch (error) {
    console.error('Error authorizing IPFS space:', error);
    showError(
      'Authorization Failed',
      error instanceof Error ? error.message : 'Failed to authorize space'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to authorize space'),
    };
  }
}

/**
 * Generate a public gateway URL for a CID
 * @param cid - The content identifier
 * @param path - Optional path to append to the URL
 * @returns The full gateway URL
 */
export function getIPFSGatewayUrl(cid: string, path: string = '') {
  const gatewayUrl = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs';
  const cleanCid = cid.replace(/^ipfs\//, '');
  const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  
  return `${gatewayUrl}/${cleanCid}${cleanPath}`;
}

/**
 * Extract the CID from an IPFS URL or path
 * @param url - The IPFS URL or path
 * @returns The extracted CID or null if not found
 */
export function extractCIDFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Handle IPFS URIs (ipfs://bafy...)
  const ipfsUriMatch = url.match(/^ipfs:\/\/([a-zA-Z0-9]+)/);
  if (ipfsUriMatch) {
    return ipfsUriMatch[1];
  }
  
  // Handle gateway URLs (https://ipfs.io/ipfs/bafy...)
  const gatewayMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (gatewayMatch) {
    return gatewayMatch[1];
  }
  
  // Assume it's just a raw CID
  const cidMatch = url.match(/^[a-zA-Z0-9]+$/);
  if (cidMatch) {
    return cidMatch[0];
  }
  
  return null;
}
