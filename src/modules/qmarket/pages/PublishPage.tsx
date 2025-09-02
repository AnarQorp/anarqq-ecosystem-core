import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useIdentityStore } from '@/state/identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, X, Image as ImageIcon, FileText, File, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QmarketNav } from '../components';
import { publishQmarketItem } from '../api';
import { toast } from '@/components/ui/use-toast';

export function PublishPage() {
  const navigate = useNavigate();
  const activeIdentity = useIdentityStore(state => state.activeIdentity);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '0',
    license: 'all-rights-reserved',
    tags: '',
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'application/*': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
    },
    maxFiles: 1,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Title is required',
        description: 'Please enter a title for your item',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // In a real app, you would upload the file to IPFS/Filecoin here
      // and then publish the metadata to the blockchain
      const itemData = {
        ...formData,
        file,
        price: parseFloat(formData.price) || 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      // This is a mock implementation - replace with actual API call
      const result = await publishQmarketItem(itemData);
      
      if (result.success) {
        toast({
          title: 'Item published!',
          description: 'Your item has been published to Qmarket',
        });
        navigate(`/qmarket/item/${result.cid}`);
      } else {
        throw new Error(result.error || 'Failed to publish item');
      }
    } catch (error) {
      console.error('Error publishing item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to publish item',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!activeIdentity) {
    return (
      <div className="min-h-screen bg-background">
        <QmarketNav />
        <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to publish</h1>
          <p className="text-muted-foreground mb-8">You need to sign in to publish items to Qmarket</p>
          <Button onClick={() => navigate('/login', { state: { from: '/qmarket/publish' } })}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <QmarketNav />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Publish to Qmarket</h1>
          <p className="text-muted-foreground">
            Share your digital assets with the AnarQ community
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - File upload */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Upload File</CardTitle>
                  <CardDescription>
                    Supported formats: Images, Videos, Audio, Documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!file ? (
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Max file size: 100MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="relative">
                        {preview ? (
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <img 
                              src={preview} 
                              alt="Preview" 
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-muted flex flex-col items-center justify-center p-4">
                            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-center truncate max-w-full px-2">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                          onClick={removeFile}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove file</span>
                        </Button>
                      </div>
                      <div className="p-4 border-t">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                  <CardDescription>
                    Provide information about your item
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Enter a descriptive title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your item in detail"
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (AQ)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set to 0 for free items
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license">License</Label>
                      <select
                        id="license"
                        name="license"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.license}
                        onChange={handleInputChange}
                      >
                        <option value="all-rights-reserved">All Rights Reserved</option>
                        <option value="cc-by">CC BY - Attribution</option>
                        <option value="cc-by-sa">CC BY-SA - Attribution-ShareAlike</option>
                        <option value="cc-by-nd">CC BY-ND - Attribution-NoDerivs</option>
                        <option value="cc-by-nc">CC BY-NC - Attribution-NonCommercial</option>
                        <option value="cc0">CC0 - Public Domain Dedication</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="tag1, tag2, tag3"
                      value={formData.tags}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate tags with commas
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading || !file}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Publish Item
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PublishPage;
