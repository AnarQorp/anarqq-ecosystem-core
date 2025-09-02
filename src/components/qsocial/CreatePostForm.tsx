/**
 * CreatePostForm Component
 * Post creation and editing interface with rich text editing and cross-module content selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  ExternalLink,
  Plus,
  X,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Users,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { PostService } from '@/services/qsocial/PostService';
import { 
  CreatePostRequest, 
  UpdatePostRequest,
  QsocialPost, 
  ContentType, 
  PrivacyLevel,
  SourceModule,
  QsocialFileAttachment 
} from '@/types/qsocial';
import { useSession } from '@/hooks/useSession';
import { useEcosystemFiles } from '@/hooks/useEcosystemFiles';
import { useEcosystemValidation } from '@/hooks/useEcosystemValidation';
import FileUpload from './FileUpload';
import EcosystemMonitor from './EcosystemMonitor';

interface CreatePostFormProps {
  editingPost?: QsocialPost;
  subcommunityId?: string;
  onSuccess?: (post: QsocialPost) => void;
  onCancel?: () => void;
  className?: string;
}

interface CrossModuleContent {
  module: SourceModule;
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  data: any;
}

const contentTypeOptions = [
  { value: ContentType.TEXT, label: 'Text Post', icon: FileText },
  { value: ContentType.LINK, label: 'Link Post', icon: LinkIcon },
  { value: ContentType.MEDIA, label: 'Media Post', icon: ImageIcon },
  { value: ContentType.CROSS_POST, label: 'Cross Post', icon: ExternalLink },
];

const privacyOptions = [
  { 
    value: PrivacyLevel.PUBLIC, 
    label: 'Public', 
    description: 'Anyone can see this post',
    icon: Globe 
  },
  { 
    value: PrivacyLevel.COMMUNITY, 
    label: 'Community Only', 
    description: 'Only community members can see this post',
    icon: Users 
  },
  { 
    value: PrivacyLevel.PRIVATE, 
    label: 'Private', 
    description: 'Only you can see this post',
    icon: Lock 
  },
];

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  editingPost,
  subcommunityId,
  onSuccess,
  onCancel,
  className = ''
}) => {
  // Form state
  const [title, setTitle] = useState(editingPost?.title || '');
  const [content, setContent] = useState(editingPost?.content || '');
  const [contentType, setContentType] = useState<ContentType>(
    editingPost?.contentType || ContentType.TEXT
  );
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(
    editingPost?.privacyLevel || PrivacyLevel.PUBLIC
  );
  const [selectedSubcommunity, setSelectedSubcommunity] = useState(
    subcommunityId || editingPost?.subcommunityId || ''
  );
  const [tags, setTags] = useState<string[]>(editingPost?.tags || []);
  const [newTag, setNewTag] = useState('');
  
  // Cross-module content
  const [crossModuleContent, setCrossModuleContent] = useState<CrossModuleContent | null>(
    editingPost?.sourceModule ? {
      module: editingPost.sourceModule,
      id: editingPost.sourceId || '',
      title: 'Cross-posted content',
      description: 'Content from ' + editingPost.sourceModule,
      data: editingPost.sourceData
    } : null
  );
  
  // Link post specific
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<any>(null);
  
  // Ecosystem file management
  const {
    files: ecosystemFiles,
    uploadedFiles: ecosystemUploadedFiles,
    uploading: filesUploading,
    addFiles,
    removeFile: removeEcosystemFile,
    uploadFiles: uploadEcosystemFiles,
    clearFiles,
    error: fileError,
    clearError: clearFileError
  } = useEcosystemFiles({
    maxFiles: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    autoUpload: false
  });
  
  // Ecosystem attachments state
  const [ecosystemAttachments, setEcosystemAttachments] = useState<QsocialFileAttachment[]>([]);
  
  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCrossModuleDialog, setShowCrossModuleDialog] = useState(false);
  
  const { session } = useSession();

  useEffect(() => {
    if (contentType === ContentType.LINK && linkUrl) {
      fetchLinkPreview();
    }
  }, [linkUrl, contentType]);

  const fetchLinkPreview = async () => {
    try {
      // TODO: Implement link preview fetching
      // This would call a service to get metadata from the URL
      setLinkPreview({
        title: 'Link Preview',
        description: 'Preview of the linked content',
        image: null,
        url: linkUrl
      });
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 300) {
      newErrors.title = 'Title must be less than 300 characters';
    }

    if (!content.trim() && contentType === ContentType.TEXT) {
      newErrors.content = 'Content is required for text posts';
    } else if (content.length > 50000) {
      newErrors.content = 'Content must be less than 50,000 characters';
    }

    if (contentType === ContentType.LINK && !linkUrl.trim()) {
      newErrors.linkUrl = 'URL is required for link posts';
    }

    if (contentType === ContentType.MEDIA && ecosystemUploadedFiles.length === 0 && ecosystemAttachments.length === 0 && !editingPost) {
      newErrors.media = 'At least one media file is required for media posts';
    }

    if (contentType === ContentType.CROSS_POST && !crossModuleContent) {
      newErrors.crossModule = 'Cross-module content selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setErrors({ general: 'You must be logged in to create posts' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      let postData: CreatePostRequest | UpdatePostRequest;
      let finalContent = content;

      // Handle different content types
      if (contentType === ContentType.LINK) {
        finalContent = linkUrl + (content ? '\n\n' + content : '');
      } else if (contentType === ContentType.MEDIA) {
        // TODO: Handle media upload and get URLs
        finalContent = content || 'Media post';
      }

      if (editingPost) {
        // Update existing post
        postData = {
          title: title.trim(),
          content: finalContent,
          tags,
          privacyLevel,
        };

        const updatedPost = await PostService.updatePost(editingPost.id, postData);
        
        if (onSuccess) {
          onSuccess(updatedPost);
        }
      } else {
        // Create new post
        postData = {
          title: title.trim(),
          content: finalContent,
          contentType,
          subcommunityId: selectedSubcommunity || undefined,
          tags,
          privacyLevel,
          sourceModule: crossModuleContent?.module,
          sourceId: crossModuleContent?.id,
          sourceData: crossModuleContent?.data,
          // Include ecosystem-integrated file attachments
          attachments: ecosystemAttachments.length > 0 ? ecosystemAttachments : undefined,
        };

        const newPost = await PostService.createPost(postData);
        
        if (onSuccess) {
          onSuccess(newPost);
        }
      }

    } catch (error) {
      console.error('Post submission error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to save post' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    
    // TODO: Implement actual file upload with progress tracking
    files.forEach(file => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const progress = (prev[file.name] || 0) + 10;
          if (progress >= 100) {
            clearInterval(interval);
            return { ...prev, [file.name]: 100 };
          }
          return { ...prev, [file.name]: progress };
        });
      }, 100);
    });
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const renderContentTypeSpecificFields = () => {
    switch (contentType) {
      case ContentType.LINK:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkUrl">URL *</Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className={errors.linkUrl ? 'border-destructive' : ''}
              />
              {errors.linkUrl && (
                <p className="text-sm text-destructive mt-1">{errors.linkUrl}</p>
              )}
            </div>
            
            {linkPreview && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Link Preview</h4>
                  <div className="flex gap-3">
                    {linkPreview.image && (
                      <img 
                        src={linkPreview.image} 
                        alt="Link preview"
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{linkPreview.title}</h5>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {linkPreview.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {linkPreview.url}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case ContentType.MEDIA:
        return (
          <div className="space-y-4">
            <div>
              <Label>Media Files - Ecosystem Integrated</Label>
              <FileUpload
                onUploadComplete={(files) => {
                  console.log('Files uploaded with ecosystem integration:', files);
                  // Convert ecosystem files to QsocialFileAttachment format
                  const attachments: QsocialFileAttachment[] = files.map(file => ({
                    fileId: file.fileId,
                    originalName: file.originalName,
                    storjUrl: file.storjUrl,
                    storjKey: file.storjKey,
                    fileSize: file.fileSize,
                    contentType: file.contentType,
                    thumbnailUrl: file.thumbnailUrl,
                    uploadedAt: file.uploadedAt,
                    ecosystem: file.ecosystem,
                    processingTime: file.processingTime
                  }));
                  
                  // Store attachments for post creation
                  setEcosystemAttachments(attachments);
                }}
                onError={(error) => {
                  setErrors(prev => ({ ...prev, media: error }));
                }}
                maxFiles={10}
                maxFileSize={50 * 1024 * 1024} // 50MB
                allowMultiple={true}
                showIPFSInfo={true}
              />
              {errors.media && (
                <p className="text-sm text-destructive mt-1">{errors.media}</p>
              )}
              {fileError && (
                <p className="text-sm text-destructive mt-1">{fileError}</p>
              )}
            </div>

            {/* Display ecosystem uploaded files */}
            {ecosystemUploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files (Ecosystem Integrated)</Label>
                {ecosystemUploadedFiles.map((file) => (
                  <div key={file.fileId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.contentType}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEcosystemFile(file.fileId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Ecosystem integration info */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        <span>Encrypted: {file.ecosystem.qlock.encrypted ? 'Yes' : 'No'}</span>
                      </div>
                      {file.ecosystem.ipfs.cid && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>IPFS: {file.ecosystem.ipfs.cid.substring(0, 8)}...</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Visibility: {file.ecosystem.qonsent.visibility}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case ContentType.CROSS_POST:
        return (
          <div className="space-y-4">
            <div>
              <Label>Cross-Module Content</Label>
              {crossModuleContent ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            From {crossModuleContent.module}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm">{crossModuleContent.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {crossModuleContent.description}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCrossModuleContent(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Select content from other AnarQ modules
                  </p>
                  <Dialog open={showCrossModuleDialog} onOpenChange={setShowCrossModuleDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline">
                        Browse Modules
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Select Cross-Module Content</DialogTitle>
                        <DialogDescription>
                          Choose content from other AnarQ modules to cross-post
                        </DialogDescription>
                      </DialogHeader>
                      <CrossModuleSelector
                        onSelect={(content) => {
                          setCrossModuleContent(content);
                          setShowCrossModuleDialog(false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              {errors.crossModule && (
                <p className="text-sm text-destructive mt-1">{errors.crossModule}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{title || 'Untitled Post'}</h3>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              {contentType === ContentType.LINK && linkPreview ? (
                <div>
                  <p>{content}</p>
                  <div className="border rounded-lg p-4 mt-4">
                    <h4 className="font-medium">{linkPreview.title}</h4>
                    <p className="text-muted-foreground text-sm">{linkPreview.description}</p>
                    <a href={linkUrl} className="text-primary text-sm" target="_blank" rel="noopener noreferrer">
                      {linkUrl}
                    </a>
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: content || 'No content' }} />
              )}
            </div>
            
            {crossModuleContent && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    Cross-posted from {crossModuleContent.module}
                  </Badge>
                </div>
                <h4 className="font-medium">{crossModuleContent.title}</h4>
                <p className="text-muted-foreground text-sm">{crossModuleContent.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {editingPost ? 'Edit Post' : 'Create New Post'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          <Tabs defaultValue="compose" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="preview" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="compose" className="space-y-6">
              {/* Content Type Selection */}
              <div>
                <Label>Post Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {contentTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={contentType === option.value ? 'default' : 'outline'}
                        className="h-auto p-3 flex flex-col gap-2"
                        onClick={() => setContentType(option.value)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter post title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? 'border-destructive' : ''}
                  maxLength={300}
                />
                <div className="flex justify-between mt-1">
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {title.length}/300
                  </p>
                </div>
              </div>

              {/* Content Type Specific Fields */}
              {renderContentTypeSpecificFields()}

              {/* Content */}
              <div>
                <Label htmlFor="content">
                  Content {contentType === ContentType.TEXT && '*'}
                </Label>
                <Textarea
                  id="content"
                  placeholder={
                    contentType === ContentType.LINK 
                      ? "Add a description for your link..." 
                      : contentType === ContentType.MEDIA
                      ? "Add a description for your media..."
                      : "Write your post content..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`min-h-[120px] ${errors.content ? 'border-destructive' : ''}`}
                  maxLength={50000}
                />
                <div className="flex justify-between mt-1">
                  {errors.content && (
                    <p className="text-sm text-destructive">{errors.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {content.length}/50,000
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || tags.length >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {tags.length}/10 tags
                </p>
              </div>

              {/* Privacy Level */}
              <div>
                <Label>Privacy</Label>
                <Select value={privacyLevel} onValueChange={(value: PrivacyLevel) => setPrivacyLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {privacyOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcommunity Selection */}
              {!editingPost && (
                <div>
                  <Label>Community (Optional)</Label>
                  <Select value={selectedSubcommunity} onValueChange={setSelectedSubcommunity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a community..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No community</SelectItem>
                      {/* TODO: Load actual subcommunities */}
                      <SelectItem value="general">r/general</SelectItem>
                      <SelectItem value="tech">r/tech</SelectItem>
                      <SelectItem value="discussion">r/discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="preview">
              {renderPreview()}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting || !title.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingPost ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  editingPost ? 'Update Post' : 'Publish Post'
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Cross-Module Content Selector Component
const CrossModuleSelector: React.FC<{
  onSelect: (content: CrossModuleContent) => void;
}> = ({ onSelect }) => {
  const [selectedModule, setSelectedModule] = useState<SourceModule>('qpic');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<any[]>([]);

  const modules: { id: SourceModule; name: string; description: string }[] = [
    { id: 'qpic', name: 'QpiC', description: 'Media and images' },
    { id: 'qmail', name: 'Qmail', description: 'Messages and emails' },
    { id: 'qmarket', name: 'Qmarket', description: 'Marketplace items' },
    { id: 'qdrive', name: 'Qdrive', description: 'Files and documents' },
    { id: 'qchat', name: 'Qchat', description: 'Chat sessions' },
  ];

  useEffect(() => {
    loadModuleContent();
  }, [selectedModule]);

  const loadModuleContent = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual module content loading
      // This would call the respective module APIs to get content
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      setContent([
        {
          id: '1',
          title: `Sample ${selectedModule} content 1`,
          description: `Description for ${selectedModule} content 1`,
          thumbnail: null,
        },
        {
          id: '2',
          title: `Sample ${selectedModule} content 2`,
          description: `Description for ${selectedModule} content 2`,
          thumbnail: null,
        },
      ]);
    } catch (error) {
      console.error('Failed to load module content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Selection */}
      <div>
        <Label>Select Module</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {modules.map((module) => (
            <Button
              key={module.id}
              type="button"
              variant={selectedModule === module.id ? 'default' : 'outline'}
              className="h-auto p-3 flex flex-col gap-1"
              onClick={() => setSelectedModule(module.id)}
            >
              <span className="font-medium">{module.name}</span>
              <span className="text-xs text-muted-foreground">{module.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div>
        <Label>Select Content</Label>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {content.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => onSelect({
                  module: selectedModule,
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  thumbnail: item.thumbnail,
                  data: item,
                })}
              >
                {item.thumbnail && (
                  <img 
                    src={item.thumbnail} 
                    alt="Content thumbnail"
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
            {content.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No content available in {selectedModule}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostForm;