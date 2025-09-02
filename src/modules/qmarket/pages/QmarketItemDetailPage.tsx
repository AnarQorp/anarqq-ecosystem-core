import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmarketItem } from '../hooks/useQmarketItem';
import QmarketItemDetailViewer from '../components/QmarketItemDetailViewer';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QmarketItemDetailPage: React.FC = () => {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    item, 
    isLoading, 
    error, 
    refresh, 
    decryptContent, 
    downloadItem 
  } = useQmarketItem(cid);
  
  // Handle edit action
  const handleEdit = () => {
    if (!cid) return;
    navigate(`/qmarket/edit/${cid}`);
  };
  
  // Handle remove action
  const handleRemove = async () => {
    if (!cid) return;
    
    // TODO: Implement actual removal logic
    const confirmed = window.confirm('Are you sure you want to remove this item from Qmarket?');
    
    if (confirmed) {
      try {
        // TODO: Call API to remove the item
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
          title: 'Item removed',
          description: 'The item has been removed from Qmarket',
        });
        
        // Navigate back to the marketplace
        navigate('/qmarket');
      } catch (err) {
        console.error('Error removing item:', err);
        toast({
          title: 'Error',
          description: 'Failed to remove item. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Show loading state
  if (isLoading || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg">Loading item details...</p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Item</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={refresh}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
      
      <QmarketItemDetailViewer
        item={item}
        onDownload={downloadItem}
        onDecrypt={item.isEncrypted ? decryptContent : undefined}
        onEdit={item.isOwner ? handleEdit : undefined}
        onRemove={item.isOwner ? handleRemove : undefined}
      />
    </div>
  );
};

export default QmarketItemDetailPage;
