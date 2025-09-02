import { QmarketItem as BaseQmarketItem, PublishFormData } from '../types';

// Extend the base QmarketItem with additional fields for the detail view
export interface QmarketItem extends BaseQmarketItem {
  stats: QmarketItemStats;
  status: 'draft' | 'published' | 'archived';
  isOwner: boolean;
  hasPurchased?: boolean;
  isDecrypting?: boolean;
  isEncrypted?: boolean;
}

export interface QmarketItemUpdate {
  cid: string;
  title?: string;
  description?: string;
  tags?: string[];
  price?: number;
  license?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface QmarketItemFilter {
  type?: 'image' | 'video' | 'document' | 'audio' | 'other';
  price?: 'free' | 'paid' | 'under-10' | '10-50' | '50+';
  license?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'popular';
  owner?: string; // For filtering by owner DID
  status?: 'draft' | 'published' | 'archived' | 'all'; // For filtering by status
}

export interface QmarketItemStats {
  views: number;
  downloads: number;
  likes?: number;
  shares?: number;
  lastAccessed?: string;
}

export interface QmarketItemWithStats extends QmarketItem {
  stats: QmarketItemStats;
  status: 'draft' | 'published' | 'archived';
  isOwner: boolean;
  hasPurchased?: boolean;
}

export interface QmarketUpdateResponse {
  success: boolean;
  cid: string;
  updatedAt: string;
  error?: string;
}

export interface QmarketPurchaseResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
  downloadUrl?: string;
}
