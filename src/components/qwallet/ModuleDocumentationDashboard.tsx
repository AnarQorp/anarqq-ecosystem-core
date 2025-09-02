/**
 * Module Documentation Dashboard Component
 * Comprehensive dashboard for managing module documentation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  FileText, 
  Upload, 
  Search, 
  Settings, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Download,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  TrendingUp
} from 'lucide-react';

import ModuleDocumentationViewer from './ModuleDocumentationViewer';
import ModuleDocumentationSearch from './ModuleDocumentationSearch';
import { useModuleDocumentation } from '../../hooks/useModuleDocumentation';
import { 
  DocumentationVersion,
  DocumentationSearchResult,
  DocumentationUploadOptions
} from '../../services/ModuleDocumentationService';

interface ModuleDocumentationDashboardProps {
  moduleId: string;
  className?: string;
  showUpload?: boolean;
  showAnalytics?: boolean;
}

interface DocumentationStats {
  totalVersions: number;
  activeVersions: number;
  deprecatedVersions: number;
  totalSize: number;
  lastUpdated: string;
  popularVersions: Array<{
    version: string;
    views: number;
    downloads: number;
  }>;
}

export const ModuleDocumentationDashboard: React.FC<ModuleDocumentationDashboardProps> = ({
  moduleId,
  className = '',
  showUpload = true,
  showAnalytics = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'upload' | 'analytics'>('overview');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showViewerDialog, setShowViewerDialog] = useState(false);
  const [stats, setStats] = useState<DocumentationStats | null>(null);

  // Use the documentation hook
  const {
    documentation,
    versions,
    currentVersion,
    loading,
    error,
    validationResult,
    loadDocumentation,
    uploadDocumentation,
    updateDocumentation,
    switchVersion,
    deprecateVersion,
    refreshVersions,
    hasDocumentation,
    isLatestVersion,
    availableVersions,
    deprecatedVersions
  } = useModuleDocumentation({
    moduleId,
    autoLoad: true
  });

  // Calculate stats
  useEffect(() => {
    if (versions.length > 0) {
      const totalSize = versions.reduce((sum, v) => sum + v.metadata.size, 0);
      const lastUpdated = versions.reduce((latest, v) => {
        const versionDate = new Date(v.createdAt);
        const latestDate = new Date(latest);
        return versionDate > latestDate ? v.createdAt : latest;
      }, versions[0].createdAt);

      // Mock popularity data - in real implementation, this would come from analytics
      const popularVersions = versions
        .slice(0, 5)
        .map(v => ({
          version: v.version,
          views: Math.floor(Math.random() * 1000) + 100,
          downloads: Math.floor(Math.random() * 500) + 50
        }))
        .sort((a, b) => b.views - a.views);

      setStats({
        totalVersions: versions.length,
        activeVersions: availableVersions.length,
        deprecatedVersions: deprecatedVersions.length,
        totalSize,
        lastUpdated,
        popularVersions
      });
    }
  }, [versions, availableVersions, deprecatedVersions]);

  // Handle version selection
  const handleVersionSelect = useCallback((version: string) => {
    setSelectedVersion(version);
    switchVersion(version);
  }, [switchVersion]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: DocumentationSearchResult) => {
    setSelectedVersion(result.version);
    switchVersion(result.version);
    setActiveTab('overview');
  }, [switchVersion]);

  // Handle file upload
  const handleFileUpload = useCallback(async (
    file: File,
    options: Omit<DocumentationUploadOptions, 'moduleId'>
  ) => {
    try {
      const content = await file.text();
      await uploadDocumentation(content, options);
      setShowUploadDialog(false);
      await refreshVersions();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [uploadDocumentation, refreshVersions]);

  // Handle version deprecation
  const handleDeprecateVersion = useCallback(async (version: string) => {
    if (window.confirm(`Are you sure you want to deprecate version ${version}?`)) {
      await deprecateVersion(version);
    }
  }, [deprecateVersion]);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  return (
    <div className={`module-documentation-dashboard ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation: {moduleId}
              {hasDocumentation && (
                <Badge variant="secondary">
                  {versions.length} version{versions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshVersions}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {showUpload && (
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Documentation</DialogTitle>
                    </DialogHeader>
                    <DocumentationUploadForm
                      moduleId={moduleId}
                      onUpload={handleFileUpload}
                      onCancel={() => setShowUploadDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              {showUpload && <TabsTrigger value="upload">Upload</TabsTrigger>}
              {showAnalytics && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!hasDocumentation && !loading && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    No documentation found for this module. Upload documentation to get started.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Documentation */}
              {documentation && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Current Documentation</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={isLatestVersion ? 'default' : 'secondary'}>
                          v{currentVersion}
                          {isLatestVersion && ' (Latest)'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowViewerDialog(true)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Title</div>
                        <div className="text-muted-foreground">{documentation.metadata.title}</div>
                      </div>
                      <div>
                        <div className="font-medium">Format</div>
                        <div className="text-muted-foreground">{documentation.metadata.format}</div>
                      </div>
                      <div>
                        <div className="font-medium">Size</div>
                        <div className="text-muted-foreground">{formatFileSize(documentation.metadata.size)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Updated</div>
                        <div className="text-muted-foreground">
                          {new Date(documentation.metadata.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {documentation.metadata.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium text-sm mb-2">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {documentation.metadata.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Version List */}
              {versions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">All Versions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {versions.map((version) => (
                        <div
                          key={version.version}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            version.version === currentVersion ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{version.version}</span>
                                {version.deprecated && (
                                  <Badge variant="destructive" className="text-xs">Deprecated</Badge>
                                )}
                                {version.version === currentVersion && (
                                  <Badge variant="default" className="text-xs">Current</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(version.createdAt).toLocaleDateString()} • {formatFileSize(version.metadata.size)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVersionSelect(version.version)}
                              disabled={version.version === currentVersion}
                            >
                              {version.version === currentVersion ? 'Current' : 'Switch'}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://ipfs.io/ipfs/${version.cid}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            
                            {!version.deprecated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeprecateVersion(version.version)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="search">
              <ModuleDocumentationSearch
                moduleIds={[moduleId]}
                onResultSelect={handleSearchResultSelect}
                maxResults={20}
              />
            </TabsContent>

            {showUpload && (
              <TabsContent value="upload">
                <DocumentationUploadForm
                  moduleId={moduleId}
                  onUpload={handleFileUpload}
                />
              </TabsContent>
            )}

            {showAnalytics && stats && (
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Total Versions</div>
                      </div>
                      <div className="text-2xl font-bold">{stats.totalVersions}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div className="text-sm font-medium">Active</div>
                      </div>
                      <div className="text-2xl font-bold">{stats.activeVersions}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <div className="text-sm font-medium">Deprecated</div>
                      </div>
                      <div className="text-2xl font-bold">{stats.deprecatedVersions}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Total Size</div>
                      </div>
                      <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Popular Versions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.popularVersions.map((version, index) => (
                        <div key={version.version} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">v{version.version}</div>
                              <div className="text-sm text-muted-foreground">
                                {version.views} views • {version.downloads} downloads
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{version.views}</div>
                            <div className="text-xs text-muted-foreground">views</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Documentation Viewer Dialog */}
      <Dialog open={showViewerDialog} onOpenChange={setShowViewerDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Documentation Viewer</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <ModuleDocumentationViewer
              moduleId={moduleId}
              version={currentVersion || undefined}
              maxHeight="60vh"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Documentation Upload Form Component
interface DocumentationUploadFormProps {
  moduleId: string;
  onUpload: (file: File, options: Omit<DocumentationUploadOptions, 'moduleId'>) => Promise<void>;
  onCancel?: () => void;
}

const DocumentationUploadForm: React.FC<DocumentationUploadFormProps> = ({
  moduleId,
  onUpload,
  onCancel
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [format, setFormat] = useState<'markdown' | 'html' | 'pdf' | 'json'>('markdown');
  const [language, setLanguage] = useState('en');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version) return;

    setUploading(true);
    try {
      await onUpload(file, {
        version,
        format,
        language,
        author: author || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        generateSearchIndex: true
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Documentation File</label>
        <Input
          type="file"
          accept=".md,.html,.pdf,.json,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Version</label>
          <Input
            placeholder="e.g., 1.0.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            className="w-full p-2 border rounded-md"
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
          >
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Language</label>
          <Input
            placeholder="en"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Author</label>
          <Input
            placeholder="Optional"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <Input
          placeholder="api, tutorial, guide (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!file || !version || uploading}>
          {uploading ? 'Uploading...' : 'Upload Documentation'}
        </Button>
      </div>
    </form>
  );
};

export default ModuleDocumentationDashboard;