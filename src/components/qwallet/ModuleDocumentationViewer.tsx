/**
 * Module Documentation Viewer Component
 * Renders module documentation with version selection and search
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Search, Download, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  moduleDocumentationService,
  DocumentationMetadata,
  DocumentationVersion,
  DocumentationValidationResult
} from '../../services/ModuleDocumentationService';

interface ModuleDocumentationViewerProps {
  moduleId: string;
  documentationCid?: string;
  version?: string;
  className?: string;
  showVersionSelector?: boolean;
  showSearch?: boolean;
  showDownload?: boolean;
  maxHeight?: string;
}

interface DocumentationContent {
  content: string;
  metadata: DocumentationMetadata;
  searchIndex?: any;
}

export const ModuleDocumentationViewer: React.FC<ModuleDocumentationViewerProps> = ({
  moduleId,
  documentationCid,
  version,
  className = '',
  showVersionSelector = true,
  showSearch = true,
  showDownload = true,
  maxHeight = '600px'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentation, setDocumentation] = useState<DocumentationContent | null>(null);
  const [versions, setVersions] = useState<DocumentationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>(version || 'latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationResult, setValidationResult] = useState<DocumentationValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'versions'>('content');

  // Load documentation versions
  const loadVersions = useCallback(async () => {
    try {
      const moduleVersions = await moduleDocumentationService.getDocumentationVersions(moduleId);
      setVersions(moduleVersions);
      
      // Set default version if not specified
      if (!version && moduleVersions.length > 0) {
        const latest = moduleVersions.find(v => !v.deprecated) || moduleVersions[0];
        setSelectedVersion(latest.version);
      }
    } catch (err) {
      console.error('Error loading documentation versions:', err);
    }
  }, [moduleId, version]);

  // Load documentation content
  const loadDocumentation = useCallback(async (cid?: string, versionToLoad?: string) => {
    if (!cid && !versionToLoad) return;

    setLoading(true);
    setError(null);

    try {
      let targetCid = cid;
      
      // If no CID provided, get CID from version
      if (!targetCid && versionToLoad) {
        const versionInfo = versions.find(v => v.version === versionToLoad);
        if (versionInfo) {
          targetCid = versionInfo.cid;
        } else {
          throw new Error(`Version ${versionToLoad} not found`);
        }
      }

      if (!targetCid) {
        throw new Error('No documentation CID available');
      }

      // Validate CID first
      const validation = await moduleDocumentationService.validateDocumentationCID(targetCid);
      setValidationResult(validation);

      if (!validation.valid || !validation.available) {
        throw new Error(`Documentation not available: ${validation.errors.join(', ')}`);
      }

      // Load documentation content
      const result = await moduleDocumentationService.retrieveDocumentation(targetCid, {
        format: 'parsed',
        includeSearchIndex: true
      });

      setDocumentation({
        content: result.content as string,
        metadata: result.metadata,
        searchIndex: result.searchIndex
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documentation';
      setError(errorMessage);
      console.error('Error loading documentation:', err);
    } finally {
      setLoading(false);
    }
  }, [versions]);

  // Handle version change
  const handleVersionChange = useCallback((newVersion: string) => {
    setSelectedVersion(newVersion);
    loadDocumentation(undefined, newVersion);
  }, [loadDocumentation]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!documentation) return;

    try {
      const blob = new Blob([documentation.content], { 
        type: documentation.metadata.format === 'html' ? 'text/html' : 'text/markdown' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${moduleId}-docs-${documentation.metadata.version}.${documentation.metadata.format === 'html' ? 'html' : 'md'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading documentation:', err);
    }
  }, [documentation, moduleId]);

  // Filter content based on search query
  const filteredContent = React.useMemo(() => {
    if (!documentation || !searchQuery.trim()) {
      return documentation?.content || '';
    }

    const query = searchQuery.toLowerCase();
    const content = documentation.content;
    
    // Simple highlighting - in a real implementation, use a proper search highlighter
    return content.replace(
      new RegExp(`(${query})`, 'gi'),
      '<mark>$1</mark>'
    );
  }, [documentation, searchQuery]);

  // Load initial data
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // Load documentation when CID or version changes
  useEffect(() => {
    if (documentationCid) {
      loadDocumentation(documentationCid);
    } else if (selectedVersion && versions.length > 0) {
      loadDocumentation(undefined, selectedVersion);
    }
  }, [documentationCid, selectedVersion, versions, loadDocumentation]);

  return (
    <Card className={`module-documentation-viewer ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Documentation: {moduleId}
            {validationResult && (
              validationResult.valid && validationResult.available ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showVersionSelector && versions.length > 0 && (
              <Select value={selectedVersion} onValueChange={handleVersionChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={v.version}>
                      <div className="flex items-center gap-2">
                        {v.version}
                        {v.deprecated && <Badge variant="secondary" className="text-xs">Deprecated</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {showDownload && documentation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        {validationResult && validationResult.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-amber-600">
                    {warning}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading documentation...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && documentation && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              {versions.length > 0 && <TabsTrigger value="versions">Versions</TabsTrigger>}
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <div 
                className="prose prose-sm max-w-none overflow-auto border rounded-lg p-4 bg-muted/50"
                style={{ maxHeight }}
                dangerouslySetInnerHTML={{ __html: filteredContent }}
              />
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <p className="text-sm text-muted-foreground">{documentation.metadata.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Version</label>
                    <p className="text-sm text-muted-foreground">{documentation.metadata.version}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Format</label>
                    <p className="text-sm text-muted-foreground">{documentation.metadata.format}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Language</label>
                    <p className="text-sm text-muted-foreground">{documentation.metadata.language}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Author</label>
                    <p className="text-sm text-muted-foreground">{documentation.metadata.author}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <p className="text-sm text-muted-foreground">{(documentation.metadata.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(documentation.metadata.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Updated</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(documentation.metadata.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {documentation.metadata.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {documentation.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Checksum</label>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {documentation.metadata.checksum}
                  </p>
                </div>
              </div>
            </TabsContent>

            {versions.length > 0 && (
              <TabsContent value="versions" className="mt-4">
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.version}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        version.version === selectedVersion ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{version.version}</span>
                            {version.deprecated && (
                              <Badge variant="secondary" className="text-xs">Deprecated</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(version.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVersionChange(version.version)}
                          disabled={version.version === selectedVersion}
                        >
                          {version.version === selectedVersion ? 'Current' : 'View'}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://ipfs.io/ipfs/${version.cid}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}

        {!loading && !error && !documentation && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No documentation available for this module.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleDocumentationViewer;