import { Identity, NFTItem } from './types';

// Mock NFT data
const MOCK_NFTS: NFTItem[] = [
  {
    id: '1',
    name: 'Pi Genesis',
    image: 'https://via.placeholder.com/200x200.png?text=Pi+Genesis',
    collection: 'Pi Network Genesis',
  },
  {
    id: '2',
    name: 'AnarQ #42',
    image: 'https://via.placeholder.com/200x200.png?text=AnarQ+42',
    collection: 'AnarQ Collectibles',
  },
  {
    id: '3',
    name: 'Q Token',
    image: 'https://via.placeholder.com/200x200.png?text=Q+Token',
    collection: 'Q Ecosystem',
  },
];

/**
 * Get a specific NFT collection by ID
 * @param identity User identity
 * @param collectionId Collection ID to filter by
 * @returns Filtered list of NFTs in the collection
 */
export const getNFTCollection = async (identity: Identity, collectionId: string): Promise<NFTItem[]> => {
  if (!identity) {
    throw new Error('Identity is required');
  }
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return MOCK_NFTS.filter(nft => nft.collection === collectionId);
};

/**
 * Get all NFTs owned by the identity
 * @param identity User identity
 * @returns Array of NFT items owned by the user
 */
export const getNFTBalance = async (identity: Identity): Promise<NFTItem[]> => {
  if (!identity) {
    throw new Error('Identity is required');
  }
  
  // In a real implementation, this would filter by owner
  // For now, return all mock NFTs
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...MOCK_NFTS];
};

/**
 * Simulate transferring an NFT to another address
 * @param identity Sender's identity
 * @param tokenId ID of the NFT to transfer
 * @param to Recipient address
 * @returns Transaction receipt (simulated)
 */
export const transferNFT = async (
  identity: Identity, 
  tokenId: string, 
  to: string
): Promise<{ success: boolean; txHash: string }> => {
  if (!identity) {
    throw new Error('Identity is required');
  }
  
  if (!tokenId || !to) {
    throw new Error('Token ID and recipient address are required');
  }
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real implementation, this would interact with a smart contract
  console.log(`[Simulation] Transferring NFT ${tokenId} to ${to}`);
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
  };
};
