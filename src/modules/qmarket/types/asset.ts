export interface Asset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  seller: string;
  category: string;
  createdAt: string;
}

export interface PurchaseRequest {
  assetId: string;
  price: number;
  currency: string;
  buyer: string;
  timestamp: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  timestamp: string;
}
