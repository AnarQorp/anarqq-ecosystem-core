import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/contexts/SessionContext';

// Components
import { QmarketFeed } from './QmarketFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { 
  X, 
  Plus, 
  List, 
  Grid as GridIcon, 
  Search, 
  Filter, 
  ArrowUpDown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Types
type FeedFilter = 'all' | 'free' | 'premium' | 'mine';
type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'popular';
type FileType = 'all' | 'image' | 'video' | 'document' | 'audio' | 'archive' | 'other';

// Types for QmarketFeed props
type QmarketFeedProps = {
  filter?: 'all' | 'free' | 'premium' | 'mine';
  variant?: 'grid' | 'list';
  className?: string;
  limit?: number;
  onItemClick?: (item: any) => void; // Replace 'any' with your item type
};

/**
 * QmarketPage - Main page for the Qmarket module
 */
export default function QmarketPage() {
  const { isAuthenticated } = useSessionContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Get filter values from URL or use defaults
  const activeTab = (searchParams.get('tab') as FeedFilter) || 'all';
  const searchQuery = searchParams.get('q') || '';
  const fileType = (searchParams.get('type') as FileType) || 'all';
  const sortBy = (searchParams.get('sort') as SortOption) || 'newest';
  const encryptedOnly = searchParams.get('encrypted') === 'true';
  
  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', value);
      setSearchParams(newParams);
    } catch (err) {
      console.error('Error changing tab:', err);
      setError('Error al cambiar de pestaña. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, setSearchParams]);

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get('search') as string;
    
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Handle filter changes
  const updateFilter = useCallback((key: string, value: string | boolean) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value === '' || value === false) {
      newParams.delete(key);
    } else if (typeof value === 'boolean') {
      newParams.set(key, String(value));
    } else {
      newParams.set(key, value);
    }
    
    // Reset to first page when filters change
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Array.from(searchParams.entries()).some(([key]) => 
      !['tab', 'page'].includes(key)
    );
  }, [searchParams]);

  // Handle item click
  const handleItemClick = useCallback((item: any) => {
    // Navigate to item detail page
    navigate(`/qmarket/item/${item.cid}`, { state: { item } });
  }, [navigate]);
  
  // Handle publish button click
  const handlePublishClick = useCallback(() => {
    navigate('/qmarket/publish');
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Qmarket</h1>
            <p className="text-muted-foreground">
              Explora y comparte contenido en el mercado descentralizado de AnarQ & Q
            </p>
          </div>
          
          {/* Publish Button - Only show if authenticated */}
          {isAuthenticated && (
            <Button 
              className="w-full md:w-auto"
              onClick={handlePublishClick}
            >
              <Plus className="mr-2 h-4 w-4" />
              Publicar contenido
            </Button>
          )}
        </div>
      </header>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Buscar en Qmarket..."
            className="w-full pl-10"
            defaultValue={searchQuery}
          />
          <Button type="submit" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
            <Search className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </Button>
        </form>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground text-sm">Filtros:</span>
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Búsqueda: "{searchQuery}"
                <button onClick={() => updateFilter('q', '')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {fileType !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tipo: {fileType}
                <button onClick={() => updateFilter('type', '')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {encryptedOnly && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Solo encriptados
                <button onClick={() => updateFilter('encrypted', '')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground h-6 px-2 text-xs"
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">Todo</TabsTrigger>
              <TabsTrigger value="free">Gratis</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
              {isAuthenticated && (
                <TabsTrigger 
                  value="mine" 
                  className="flex-1"
                  disabled={!isAuthenticated}
                  title={!isAuthenticated ? "Inicia sesión para ver tus publicaciones" : ""}
                >
                  <span className="hidden sm:inline">Mis publicaciones</span>
                  <span className="sm:hidden">👤</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select 
              value={fileType}
              onValueChange={(value) => updateFilter('type', value as FileType)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo de archivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="image">Imágenes</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documentos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="archive">Archivos</SelectItem>
                <SelectItem value="other">Otros</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={sortBy}
              onValueChange={(value) => updateFilter('sort', value as SortOption)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                <SelectItem value="popular">Más populares</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="flex-1 sm:flex-initial"
              >
                <GridIcon className="h-4 w-4" />
                <span className="sr-only">Vista de cuadrícula</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="flex-1 sm:flex-initial"
              >
                <List className="h-4 w-4" />
                <span className="sr-only">Vista de lista</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Content Feed */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {activeTab === 'all' && 'Todo el contenido'}
              {activeTab === 'free' && 'Contenido gratuito'}
              {activeTab === 'premium' && 'Contenido premium'}
              {activeTab === 'mine' && 'Mis publicaciones'}
            </h2>
          </CardHeader>
          <CardContent>
            {activeTab === 'mine' && !isAuthenticated && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Inicia sesión para ver tus publicaciones.
                </AlertDescription>
              </Alert>
            )}
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <QmarketFeed 
                filter={activeTab}
                variant={viewMode}
                onItemClick={handleItemClick}
                className={isLoading ? 'opacity-50 pointer-events-none' : ''}
              />
            )}
            {isLoading && (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
