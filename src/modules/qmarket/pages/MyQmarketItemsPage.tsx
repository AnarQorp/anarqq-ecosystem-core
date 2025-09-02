import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentityStore } from '@/state/identity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Box, FileText, Image, Video, Music, File, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { QmarketItemCard } from '../components';
import { getItemsByOwner } from '../api';
import { QmarketItem } from '../types/extended';

export function MyQmarketItemsPage() {
  const navigate = useNavigate();
  const activeIdentity = useIdentityStore(state => state.activeIdentity);
  const [items, setItems] = useState<QmarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch user's items
  useEffect(() => {
    const fetchItems = async () => {
      if (!activeIdentity?.did) return;
      
      setIsLoading(true);
      try {
        const userItems = await getItemsByOwner(activeIdentity.did, { 
          status: activeTab === 'all' ? undefined : activeTab as any 
        });
        setItems(userItems);
      } catch (error) {
        console.error('Error fetching user items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [activeIdentity?.did, activeTab]);

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.metadata.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.metadata.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group items by type for the "All" tab
  const publishedItems = items.filter(item => item.status === 'published');
  const draftItems = items.filter(item => item.status === 'draft');
  const archivedItems = items.filter(item => item.status === 'archived');

  const renderItemGrid = (itemsToRender: QmarketItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {itemsToRender.map((item) => (
        <QmarketItemCard 
          key={item.cid} 
          item={item} 
          onClick={() => navigate(`/qmarket/item/${item.cid}`)}
          showStatus
        />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Box className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No items found</h3>
      <p className="text-muted-foreground mb-4">
        {activeTab === 'all' 
          ? "You haven't published any items yet."
          : `You don't have any ${activeTab} items.`}
      </p>
      <Button onClick={() => navigate('/qmarket/publish')}>
        <Plus className="h-4 w-4 mr-2" />
        Publish New Item
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Qmarket Items</h1>
          <p className="text-muted-foreground">
            Manage your published items and track their performance
          </p>
        </div>
        <Button onClick={() => navigate('/qmarket/publish')}>
          <Plus className="h-4 w-4 mr-2" />
          Publish New Item
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your items..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="space-y-8">
            {publishedItems.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Published</h3>
                {renderItemGrid(publishedItems)}
              </div>
            )}

            {draftItems.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Drafts</h3>
                {renderItemGrid(draftItems)}
              </div>
            )}

            {archivedItems.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Archived</h3>
                {renderItemGrid(archivedItems)}
              </div>
            )}

            {items.length === 0 && !isLoading && renderEmptyState()}
          </div>
        </TabsContent>

        <TabsContent value="published">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : publishedItems.length > 0 ? (
            renderItemGrid(publishedItems)
          ) : (
            renderEmptyState()
          )}
        </TabsContent>

        <TabsContent value="draft">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : draftItems.length > 0 ? (
            renderItemGrid(draftItems)
          ) : (
            renderEmptyState()
          )}
        </TabsContent>

        <TabsContent value="archived">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : archivedItems.length > 0 ? (
            renderItemGrid(archivedItems)
          ) : (
            renderEmptyState()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MyQmarketItemsPage;
