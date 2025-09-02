import { useState, useEffect, useCallback } from 'react';
import { useIdentityStore } from '@/state/identity';
import { getItemsByOwner } from '../api';
import { MyItemsFilter, MyItemsState, MyItemsStats } from '../types/my-items';

export function useMyQmarketItems() {
  const activeIdentity = useIdentityStore(state => state.activeIdentity);
  const [state, setState] = useState<MyItemsState>({
    items: [],
    isLoading: false,
    error: null,
    filter: 'all',
    stats: {
      totalItems: 0,
      publishedItems: 0,
      totalViews: 0,
      avgPrice: 0,
    },
  });

  const fetchItems = useCallback(async () => {
    if (!activeIdentity?.did) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const items = await getItemsByOwner(activeIdentity.did);
      
      // Calculate stats
      const publishedItems = items.filter(item => item.status === 'published');
      const totalViews = items.reduce((sum, item) => sum + (item.stats?.views || 0), 0);
      const totalPrice = publishedItems.reduce((sum, item) => sum + (item.metadata.price || 0), 0);
      
      setState(prev => ({
        ...prev,
        items,
        stats: {
          totalItems: items.length,
          publishedItems: publishedItems.length,
          totalViews,
          avgPrice: publishedItems.length > 0 ? totalPrice / publishedItems.length : 0,
        },
      }));
    } catch (error) {
      console.error('Error fetching items:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load items. Please try again later.',
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [activeIdentity?.did]);

  const setFilter = useCallback((filter: MyItemsFilter) => {
    setState(prev => ({ ...prev, filter }));
  }, []);

  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  // Filter items based on current filter
  const filteredItems = state.items.filter(item => {
    if (state.filter === 'published') return item.status === 'published';
    if (state.filter === 'unpublished') return item.status !== 'published';
    return true; // 'all' filter
  });

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    ...state,
    filteredItems,
    setFilter,
    refresh,
  };
}
