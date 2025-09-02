import { redirect } from 'next/navigation';
import { useIdentityStore } from '@/state/identity';
import { useMyQmarketItems } from '@/modules/qmarket/hooks/useMyQmarketItems';
import { MyItemsList } from '@/modules/qmarket/components/MyItemsList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function MyItemsPage() {
  const activeIdentity = useIdentityStore(state => state.activeIdentity);
  
  // Redirect to login if not authenticated
  if (!activeIdentity) {
    redirect('/login?returnTo=/qmarket/my-items');
  }

  const {
    items,
    filteredItems,
    isLoading,
    error,
    filter,
    stats,
    setFilter,
    refresh,
  } = useMyQmarketItems();

  // Handle edit action
  const handleEdit = (item: any) => {
    // TODO: Implement edit functionality
    console.log('Edit item:', item);
    // In a real implementation, this would navigate to the edit page
    // router.push(`/qmarket/edit/${item.cid}`);
  };

  // Handle toggle publish action
  const handleTogglePublish = async (item: any) => {
    // This is a mock implementation
    // In a real app, you would call an API to update the item's status
    console.log(`Toggling publish status for item ${item.cid} (current status: ${item.status})`);
    
    // Simulate API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log(`Item ${item.cid} status toggled`);
        // Refresh the items list after toggling
        refresh();
        resolve();
      }, 500);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Items</h1>
          <p className="text-muted-foreground">
            Manage your published and unpublished items
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      <MyItemsList
        items={filteredItems}
        isLoading={isLoading}
        error={error}
        filter={filter}
        stats={stats}
        onFilterChange={setFilter}
        onEdit={handleEdit}
        onTogglePublish={handleTogglePublish}
      />
    </div>
  );
}
