
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, FileText, Hash, Clock, Users } from 'lucide-react';
import { getActiveIdentity } from '@/state/identity';
import { 
  getQonsentPoliciesByOwner, 
  authorizeDID, 
  revokeDID, 
  getAuthorizedForFile,
  type QonsentPolicy 
} from '@/utils/qonsent/qonsentStore';
import { searchUsersByAlias, type UserSearchResult } from '@/utils/squid/squidAliasResolver';
import { toast } from '@/hooks/use-toast';

const QonsentManager: React.FC = () => {
  const [policies, setPolicies] = useState<QonsentPolicy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const activeIdentity = getActiveIdentity();

  useEffect(() => {
    if (activeIdentity) {
      loadPolicies();
    }
  }, [activeIdentity]);

  const loadPolicies = () => {
    if (!activeIdentity) return;
    
    const userPolicies = getQonsentPoliciesByOwner(activeIdentity.did);
    setPolicies(userPolicies);
    console.log(`[QonsentManager] Cargadas ${userPolicies.length} políticas`);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo requerido",
        description: "Introduce un alias para buscar",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsersByAlias(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "Sin resultados",
          description: `No se encontraron usuarios con alias "${searchQuery}"`
        });
      }
    } catch (error) {
      console.error('[QonsentManager] Error en búsqueda:', error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo completar la búsqueda",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAuthorize = async (fileHash: string, user: UserSearchResult) => {
    try {
      const success = authorizeDID(fileHash, user.did);
      
      if (success) {
        loadPolicies(); // Recargar políticas
        setSearchQuery('');
        setSearchResults([]);
        setSelectedFile(null);
        
        toast({
          title: "DID autorizado",
          description: `${user.alias} ahora puede acceder al archivo`,
        });
      } else {
        toast({
          title: "Error de autorización",
          description: "No se pudo autorizar el DID",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[QonsentManager] Error autorizando DID:', error);
      toast({
        title: "Error",
        description: "Falló la autorización",
        variant: "destructive"
      });
    }
  };

  const handleRevoke = (fileHash: string, did: string) => {
    try {
      const success = revokeDID(fileHash, did);
      
      if (success) {
        loadPolicies();
        toast({
          title: "Autorización revocada",
          description: "El DID ya no puede acceder al archivo",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo revocar la autorización",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[QonsentManager] Error revocando DID:', error);
      toast({
        title: "Error",
        description: "Falló la revocación",
        variant: "destructive"
      });
    }
  };

  const getFileDisplayName = (hash: string) => {
    // Simular obtención de metadata del archivo
    return `Archivo_${hash.slice(0, 8)}`;
  };

  const getAuthorizedAliases = (authorizedDIDs: string[]): string[] => {
    // Por ahora devolvemos los DIDs truncados, en el futuro se resolverán a aliases
    return authorizedDIDs.map(did => did.slice(0, 16) + '...');
  };

  if (!activeIdentity) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay identidad activa</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Authorization Section */}
      {selectedFile && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
              Autorizar acceso a: {getFileDisplayName(selectedFile)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar usuario por alias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isSearching}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>
                Cancelar
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Resultados:</h4>
                {searchResults.map((user) => (
                  <div 
                    key={user.did} 
                    className="flex items-center justify-between p-2 border rounded bg-white"
                  >
                    <div>
                      <span className="font-medium">{user.alias}</span>
                      <p className="text-xs text-muted-foreground">
                        {user.did.slice(0, 20)}...
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAuthorize(selectedFile, user)}
                    >
                      Autorizar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Archivos y Políticas de Acceso</h3>
        
        {policies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">No hay archivos con políticas</h4>
              <p className="text-sm text-muted-foreground">
                Los archivos que subas aparecerán aquí para gestionar sus permisos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.fileHash}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {getFileDisplayName(policy.fileHash)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      {policy.fileHash.slice(0, 16)}...
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(policy.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {policy.authorizedDIDs.length} autorizado(s)
                    </div>
                  </div>

                  {/* Authorized DIDs */}
                  <div>
                    <h5 className="font-medium mb-2">DIDs Autorizados:</h5>
                    {policy.authorizedDIDs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Solo el propietario</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getAuthorizedAliases(policy.authorizedDIDs).map((alias, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="flex items-center gap-1"
                          >
                            {alias}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 hover:bg-red-100"
                              onClick={() => handleRevoke(policy.fileHash, policy.authorizedDIDs[index])}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Authorization Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setSelectedFile(policy.fileHash)}
                  >
                    <Plus className="h-4 w-4" />
                    Añadir Autorización
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QonsentManager;
