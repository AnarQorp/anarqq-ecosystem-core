/**
 * Module Documentation Search Component
 * Advanced search interface for module documentation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Search, 
  Filter, 
  X, 
  ExternalLink, 
  FileText, 
  Clock, 
  Tag, 
  Globe,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  moduleDocumentationService,
  DocumentationSearchResult
} from '../../services/ModuleDocumentationService';

interface ModuleDocumentationSearchProps {
  className?: string;
  defaultQuery?: string;
  moduleIds?: string[];
  onResultSelect?: (result: DocumentationSearchResult) => void;
  showFilters?: boolean;
  maxResults?: number;
}

interface SearchFilters {
  moduleIds: string[];
  version?: string;
  language?: string;
  tags: string[];
  format?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export const ModuleDocumentationSearch: React.FC<ModuleDocumentationSearchProps> = ({
  className = '',
  defaultQuery = '',
  moduleIds = [],
  onResultSelect,
  showFilters = true,
  maxResults = 20
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<DocumentationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState<number>(0);

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    moduleIds: moduleIds,
    tags: [],
  });

  // Available filter options (would typically come from API)
  const availableLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
  const availableFormats = ['markdown', 'html', 'pdf', 'json'];
  const commonTags = ['api', 'tutorial', 'guide', 'reference', 'examples', 'troubleshooting'];

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const searchOptions = {
        moduleIds: searchFilters.moduleIds.length > 0 ? searchFilters.moduleIds : undefined,
        version: searchFilters.version,
        language: searchFilters.language,
        tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
        limit: maxResults
      };

      const searchResults = await moduleDocumentationService.searchDocumentation(
        searchQuery,
        searchOptions
      );

      setResults(searchResults);
      setTotalResults(searchResults.length);
      setSearchTime(Date.now() - startTime);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Documentation search error:', err);
    } finally {
      setLoading(false);
    }
  }, [maxResults]);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query, filters);
      } else {
        setResults([]);
        setTotalResults(0);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, performSearch]);

  // Handle filter changes
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Add/remove module ID filter
  const toggleModuleId = useCallback((moduleId: string) => {
    setFilters(prev => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter(id => id !== moduleId)
        : [...prev.moduleIds, moduleId]
    }));
  }, []);

  // Add/remove tag filter
  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      moduleIds: moduleIds,
      tags: []
    });
  }, [moduleIds]);

  // Handle result selection
  const handleResultClick = useCallback((result: DocumentationSearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  }, [onResultSelect]);

  // Format relevance score
  const formatRelevanceScore = useCallback((score: number) => {
    if (score >= 20) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 10) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 5) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-gray-500' };
  }, []);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.moduleIds.length > 0) count++;
    if (filters.version) count++;
    if (filters.language) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <Card className={`module-documentation-search ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Documentation Search
          {totalResults > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
              {searchTime > 0 && ` (${searchTime}ms)`}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showAdvancedFilters ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {showAdvancedFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                {/* Module IDs */}
                <div>
                  <Label className="text-sm font-medium">Modules</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Add module ID..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !filters.moduleIds.includes(value)) {
                            toggleModuleId(value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    {filters.moduleIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {filters.moduleIds.map((moduleId) => (
                          <Badge
                            key={moduleId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {moduleId}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => toggleModuleId(moduleId)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Version and Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Version</Label>
                    <Input
                      placeholder="e.g., 1.0.0"
                      value={filters.version || ''}
                      onChange={(e) => updateFilter('version', e.target.value || undefined)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Language</Label>
                    <Select
                      value={filters.language || ''}
                      onValueChange={(value) => updateFilter('language', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any language</SelectItem>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {lang.toUpperCase()}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {commonTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={filters.tags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-sm cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {filters.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        <div className="space-y-3">
          {results.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
              {searchTime > 0 && ` in ${searchTime}ms`}
            </div>
          )}

          {results.map((result, index) => {
            const relevance = formatRelevanceScore(result.relevanceScore);
            
            return (
              <Card
                key={`${result.moduleId}-${result.version}-${index}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleResultClick(result)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium truncate">{result.title}</h3>
                        <div className={`w-2 h-2 rounded-full ${relevance.color}`} title={`Relevance: ${relevance.label}`} />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{result.moduleId}</span>
                        <span>v{result.version}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Score: {result.relevanceScore.toFixed(1)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {result.excerpt}
                      </p>
                      
                      {result.matchedSections.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">
                            Matched sections:
                          </div>
                          {result.matchedSections.slice(0, 2).map((section, sectionIndex) => (
                            <div
                              key={sectionIndex}
                              className="text-xs bg-muted/50 rounded px-2 py-1"
                            >
                              <span className="font-medium">{section.title}</span>
                              {section.content && (
                                <span className="ml-2 text-muted-foreground">
                                  {section.content.substring(0, 100)}...
                                </span>
                              )}
                            </div>
                          ))}
                          {result.matchedSections.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{result.matchedSections.length - 2} more sections
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://ipfs.io/ipfs/${result.cid}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Badge variant="outline" className="text-xs">
                        {relevance.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {query.trim() && !loading && results.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No documentation found for "{query}"</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </div>
          )}

          {!query.trim() && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Enter a search query to find documentation</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleDocumentationSearch;