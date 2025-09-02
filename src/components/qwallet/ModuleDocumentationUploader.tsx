/**
 * Module Documentation Uploader Component
 * Handles uploading and updating module documentation
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  X,
  Plus,
  Eye
} from 'lucide-react';
import { 
  moduleDocumentationService,
  DocumentationUploadOptions,
  DocumentationMetadata
} from '../../services/ModuleDocumentationService';

interface ModuleDocumentationUploaderProps {
  moduleId: string;
  currentVersion?: string;
  onUploadSuccess?: (cid: string, metadata: DocumentationMetadata) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadState {
  uploading: boolean;
  success: boolean;
  error: string | null;
  result?: {
    cid: string;
    metadata: DocumentationMetadata;
  };
}

export const ModuleDocumentationUploader: React.FC<ModuleDocumentationUploaderProps> = ({
  moduleId,
  currentVersion,
  onUploadSuccess,
  onUploadError,
  className = ''
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    success: false,
    error: null
  });
  
  const [formData, setFormData] = useState({
    version: currentVersion || '',
    format: 'markdown' as 'markdown' | 'html' | 'pdf' | 'json',
    language: 'en',
    author: '',
    tags: [] as string[],
    generateSearchIndex: true
  });
  
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [previewMode, setPreviewMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form field changes
  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Auto-detect format from file extension
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (extension === 'md' || extension === 'markdown') {
        handleFormChange('format', 'markdown');
      } else if (extension === 'html' || extension === 'htm') {
        handleFormChange('format', 'html');
      } else if (extension === 'pdf') {
        handleFormChange('format', 'pdf');
      } else if (extension === 'json') {
        handleFormChange('format', 'json');
      }

      // Read file content for text files
      if (selectedFile.type.startsWith('text/') || extension === 'md' || extension === 'markdown') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setContent(e.target?.result as string || '');
        };
        reader.readAsText(selectedFile);
      }
    }
  }, [handleFormChange]);

  // Add tag
  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleFormChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, formData.tags, handleFormChange]);

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    handleFormChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  }, [formData.tags, handleFormChange]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!formData.version.trim()) {
      setUploadState({
        uploading: false,
        success: false,
        error: 'Version is required'
      });
      return;
    }

    const uploadContent = file ? await file.arrayBuffer() : content;
    if (!uploadContent || (typeof uploadContent === 'string' && !uploadContent.trim())) {
      setUploadState({
        uploading: false,
        success: false,
        error: 'Content is required'
      });
      return;
    }

    setUploadState({
      uploading: true,
      success: false,
      error: null
    });

    try {
      const options: DocumentationUploadOptions = {
        moduleId,
        version: formData.version.trim(),
        format: formData.format,
        language: formData.language,
        author: formData.author.trim() || undefined,
        tags: formData.tags,
        generateSearchIndex: formData.generateSearchIndex
      };

      const result = await moduleDocumentationService.uploadDocumentation(
        uploadContent,
        options
      );

      setUploadState({
        uploading: false,
        success: true,
        error: null,
        result
      });

      // Call success callback
      onUploadSuccess?.(result.cid, result.metadata);

      // Reset form
      setContent('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        uploading: false,
        success: false,
        error: errorMessage
      });
      
      onUploadError?.(errorMessage);
    }
  }, [
    moduleId,
    formData,
    content,
    file,
    onUploadSuccess,
    onUploadError
  ]);

  // Reset upload state
  const resetUploadState = useCallback(() => {
    setUploadState({
      uploading: false,
      success: false,
      error: null
    });
  }, []);

  // Generate preview content
  const previewContent = React.useMemo(() => {
    if (!content || formData.format !== 'markdown') return content;
    
    // Simple markdown preview - in a real implementation, use a proper markdown parser
    return content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }, [content, formData.format]);

  return (
    <Card className={`module-documentation-uploader ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documentation: {moduleId}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Status */}
        {uploadState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadState.error}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUploadState}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {uploadState.success && uploadState.result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Documentation uploaded successfully!</p>
                <div className="text-sm space-y-1">
                  <p><strong>CID:</strong> <code className="text-xs">{uploadState.result.cid}</code></p>
                  <p><strong>Version:</strong> {uploadState.result.metadata.version}</p>
                  <p><strong>Size:</strong> {(uploadState.result.metadata.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUploadState}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => handleFormChange('version', e.target.value)}
              placeholder="e.g., 1.0.0"
              disabled={uploadState.uploading}
            />
          </div>

          <div>
            <Label htmlFor="format">Format</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => handleFormChange('format', value)}
              disabled={uploadState.uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => handleFormChange('language', value)}
              disabled={uploadState.uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => handleFormChange('author', e.target.value)}
              placeholder="Author name"
              disabled={uploadState.uploading}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label>Tags</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              disabled={uploadState.uploading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              disabled={uploadState.uploading || !newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-500"
                    disabled={uploadState.uploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Content *</Label>
            <div className="flex items-center gap-2">
              {activeTab === 'text' && content && formData.format === 'markdown' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={uploadState.uploading}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              {previewMode && formData.format === 'markdown' ? (
                <div 
                  className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/50 min-h-[200px] max-h-[400px] overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter documentation content..."
                  className="min-h-[200px] max-h-[400px] resize-y"
                  disabled={uploadState.uploading}
                />
              )}
            </TabsContent>

            <TabsContent value="file" className="mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".md,.markdown,.html,.htm,.pdf,.json,.txt"
                  className="hidden"
                  disabled={uploadState.uploading}
                />
                
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadState.uploading}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Click to select a documentation file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: .md, .html, .pdf, .json, .txt
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadState.uploading}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Options */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="generateSearchIndex"
            checked={formData.generateSearchIndex}
            onChange={(e) => handleFormChange('generateSearchIndex', e.target.checked)}
            disabled={uploadState.uploading}
          />
          <Label htmlFor="generateSearchIndex" className="text-sm">
            Generate search index for better discoverability
          </Label>
        </div>

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={
              uploadState.uploading ||
              !formData.version.trim() ||
              (!content.trim() && !file)
            }
            className="min-w-[120px]"
          >
            {uploadState.uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleDocumentationUploader;