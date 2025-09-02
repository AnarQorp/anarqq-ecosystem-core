import { QmarketItem } from '../types';

/**
 * Extended Qmarket item with additional metadata and content
 */
export interface QmarketItemDetail extends QmarketItem {
  // Status information
  status: 'draft' | 'published' | 'archived';
  hasPurchased?: boolean;
  isOwner: boolean;
  isEncrypted: boolean;
  isDecrypting?: boolean;
  
  // Stats and metrics
  stats: {
    views: number;
    downloads: number;
    likes?: number;
    shares?: number;
    lastAccessed?: string;
  };
  // Content data (only available if decrypted or public)
  contentData?: ArrayBuffer | string | null;
  
  // Error state
  error?: string;
  
  // Loading states
  isLoading: boolean;
}

/**
 * Props for the QmarketItemDetail component
 */
export interface QmarketItemDetailProps {
  /** The CID of the item to display */
  cid: string;
  
  /** Optional custom render function for the content */
  renderContent?: (item: QmarketItemDetail) => React.ReactNode;
  
  /** Optional custom render function for the metadata */
  renderMetadata?: (item: QmarketItemDetail) => React.ReactNode;
  
  /** Optional custom render function for the actions */
  renderActions?: (item: QmarketItemDetail) => React.ReactNode;
  
  /** Optional callback when the item is removed */
  onItemRemoved?: (cid: string) => void;
  
  /** Optional class name for the container */
  className?: string;
}

/**
 * Hook return type for useQmarketItem
 */
export interface UseQmarketItemReturn {
  /** The item data */
  item: QmarketItemDetail | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error message if any */
  error: string | null;
  
  /** Function to refresh the item data */
  refresh: () => Promise<void>;
  
  /** Function to decrypt the item content */
  decryptContent: () => Promise<void>;
  
  /** Function to download the item */
  downloadItem: () => Promise<void>;
}
