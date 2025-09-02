import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getIndexByCID } from '@/api/qindex';
import { downloadFileFromIPFS } from '@/utils/ipfs/download';
import { getActiveIdentity } from '@/state/identity';
import { decrypt } from '@/api/qlock';
import { QmarketItemDetail, UseQmarketItemReturn } from '../types/itemDetail';

/**
 * Hook to fetch and manage Qmarket item data
 * @param cid - The CID of the item to fetch (can be undefined to get from URL params)
 */
export function useQmarketItem(cid?: string): UseQmarketItemReturn {
  const params = useParams<{ cid: string }>();
  const itemCid = cid || params.cid;
  
  const [item, setItem] = useState<QmarketItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch item data from Qindex
  const fetchItem = useCallback(async () => {
    if (!itemCid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch basic item info from Qindex
      const indexData = await getIndexByCID(itemCid);
      
      if (!indexData) {
        throw new Error('Item not found in Qindex');
      }
      
      const currentUser = getActiveIdentity();
      const isOwner = currentUser?.did === indexData.owner;
      
      // Create initial item state with proper QmarketItemDetail type
      const initialItem: QmarketItemDetail = {
        ...indexData,
        publisher: {
          cid_profile: indexData.owner || '',
          did: indexData.owner || '',
          name: indexData.owner?.slice(0, 8) || 'Anonymous',
        },
        metadata: {
          title: indexData.filename || 'Untitled',
          description: '',
          tags: [],
          license: 'all-rights-reserved',
          price: 0,
          createdAt: new Date().toISOString(),
        },
        content: {
          type: 'application/octet-stream',
          size: indexData.fileSize || 0,
          source: 'qdrive',
        },
        views: 0, // TODO: Get from stats service
        downloads: 0, // TODO: Get from stats service
        isOwner,
        isEncrypted: indexData.privacyLevel === 'private',
        isLoading: true,
        isDecrypting: false,
      };
      
      setItem(initialItem);
      
      // If the item is public or the user is the owner, try to load the content
      if (indexData.privacyLevel === 'public' || isOwner) {
        await loadItemContent(initialItem);
      }
      
    } catch (err) {
      console.error('Error fetching item:', err);
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setIsLoading(false);
    }
  }, [itemCid]);

  // Load item content from IPFS
  const loadItemContent = useCallback(async (itemData: QmarketItemDetail) => {
    if (!itemCid) return;
    
    try {
      setItem(prev => ({
        ...prev!,
        isLoading: true,
      }));
      
      // Download the file from IPFS
      const result = await downloadFileFromIPFS(itemCid, {
        spaceDID: itemData.publisher.did,
        decrypt: itemData.isEncrypted,
      });
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to download file');
      }
      
      setItem(prev => ({
        ...prev!,
        contentData: result.data,
        isLoading: false,
      }));
      
    } catch (err) {
      console.error('Error loading item content:', err);
      setItem(prev => ({
        ...prev!,
        error: err instanceof Error ? err.message : 'Failed to load content',
        isLoading: false,
      }));
    }
  }, [itemCid]);

  // Decrypt the item content
  const decryptContent = useCallback(async () => {
    if (!item || !item.isEncrypted || !itemCid) return;
    
    try {
      setItem(prev => ({
        ...prev!,
        isDecrypting: true,
        error: undefined,
      }));
      
      const currentUser = getActiveIdentity();
      if (!currentUser) {
        throw new Error('You must be logged in to view this content');
      }
      
      // Download the encrypted content
      const result = await downloadFileFromIPFS(itemCid, {
        spaceDID: item.publisher.did,
        decrypt: false,
      });
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to download encrypted content');
      }
      
      // Convert ArrayBuffer to base64 for decryption
      const encryptedContent = Buffer.from(result.data).toString('base64');
      
      // Decrypt the content
      // Note: In a real implementation, you would use the user's private key
      // and the Qlock service to decrypt the content
      const decrypted = await decrypt(encryptedContent, currentUser.did);
      
      if (!decrypted.success || !decrypted.data) {
        throw new Error(decrypted.error || 'Failed to decrypt content');
      }
      
      // Update the item with the decrypted content
      setItem(prev => ({
        ...prev!,
        contentData: decrypted.data,
        isEncrypted: false,
        isDecrypting: false,
      }));
      
    } catch (err) {
      console.error('Error decrypting content:', err);
      setItem(prev => ({
        ...prev!,
        error: err instanceof Error ? err.message : 'Failed to decrypt content',
        isDecrypting: false,
      }));
    }
  }, [item, itemCid]);

  // Download the item
  const downloadItem = useCallback(async () => {
    if (!item || !itemCid) return;
    
    try {
      // If the content is encrypted and not yet decrypted, decrypt it first
      if (item.isEncrypted) {
        await decryptContent();
        return;
      }
      
      // Create a download link
      const blob = new Blob([item.contentData!], { type: item.content.type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.metadata.title || `qmarket-item-${itemCid.slice(0, 8)}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // TODO: Track download in analytics
      
    } catch (err) {
      console.error('Error downloading item:', err);
      setError(err instanceof Error ? err.message : 'Failed to download item');
    }
  }, [item, itemCid, decryptContent]);

  // Initial fetch
  useEffect(() => {
    if (itemCid) {
      fetchItem();
    }
  }, [itemCid, fetchItem]);

  return {
    item,
    isLoading,
    error,
    refresh: fetchItem,
    decryptContent,
    downloadItem,
  };
}

export default useQmarketItem;
