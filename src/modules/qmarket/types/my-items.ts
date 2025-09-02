import { QmarketItem } from './extended';

export type MyItemsFilter = 'all' | 'published' | 'unpublished';

export interface MyItemsStats {
  totalItems: number;
  publishedItems: number;
  totalViews: number;
  avgPrice: number;
}

export interface MyItemsState {
  items: QmarketItem[];
  isLoading: boolean;
  error: string | null;
  filter: MyItemsFilter;
  stats: MyItemsStats;
}
