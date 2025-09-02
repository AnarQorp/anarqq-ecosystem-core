import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmarketItem } from '../hooks/useQmarketItem';
import { updateQmarketItem } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { LICENSE_OPTIONS } from '../types';

export function QmarketItemEditPage() {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { item, isLoading, error, refresh } = useQmarketItem(cid);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '0',
    license: 'all-rights-reserved',
    tags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with item data when loaded
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.metadata.title,
        description: item.metadata.description || '',
        price: item.metadata.price.toString(),
        license: item.metadata.license,
        tags: item.metadata.tags?.join(', ') || '',
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cid) return;
    
    setIsSubmitting(true);
    
    try {
      const updateData = {
        cid,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price) || 0,
        license: formData.license,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      const result = await updateQmarketItem(updateData);
      
      if (result.success) {
        toast({
          title: 'Item updated',
          description: 'Your changes have been saved successfully.',
        });
        
        // Navigate back to the item detail page
        navigate(`/qmarket/item/${cid}`);
      } else {
        throw new Error(result.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update item',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Item</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Item not found'}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!item.isOwner) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">Access Denied</h2>
          <p className="text-yellow-600 dark:text-yellow-400 mb-4">
            You don't have permission to edit this item.
          </p>
          <Button variant="outline" onClick={() => navigate(`/qmarket/item/${cid}`)}>
            View Item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Item
        </Button>
        <h1 className="text-3xl font-bold mt-4">Edit Item</h1>
        <p className="text-muted-foreground">
          Update your item's details and metadata
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your item"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="price">Price (AQ) *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <p className="text-sm text-muted-foreground">
              Set to 0 for free items
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license">License *</Label>
            <Select
              value={formData.license}
              onValueChange={(value) => handleSelectChange('license', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a license" />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="comma, separated, tags"
          />
          <p className="text-sm text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default QmarketItemEditPage;
