
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, MessageCircle, Shield } from 'lucide-react';
import { searchUsersByAlias, type UserSearchResult } from '@/utils/squid/squidAliasResolver';
import { toast } from '@/hooks/use-toast';

interface UserSearchProps {
  onStartConversation: (userDID: string, userName: string) => void;
  currentUserDID: string;
}

const UserSearch: React.FC<UserSearchProps> = ({ onStartConversation, currentUserDID }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor introduce un alias para buscar",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const results = await searchUsersByAlias(searchQuery);
      
      // Filter out current user
      const filteredResults = results.filter(user => user.did !== currentUserDID);
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast({
          title: "Sin resultados",
          description: `No se encontraron usuarios con el alias "${searchQuery}"`,
        });
      }
      
    } catch (error) {
      console.error('[UserSearch] Error en búsqueda:', error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo completar la búsqueda",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = (user: UserSearchResult) => {
    onStartConversation(user.did, user.alias);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    
    toast({
      title: "Conversación iniciada",
      description: `Conversación con ${user.alias} lista`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Buscar usuario por alias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="flex items-center gap-2"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar
        </Button>
      </div>

      {/* Search results */}
      {showResults && (
        <Card>
          <CardContent className="p-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {isSearching ? 'Buscando...' : 'No se encontraron usuarios'}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {searchResults.length} usuario(s) encontrado(s)
                </h4>
                {searchResults.map((user) => (
                  <div
                    key={user.did}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 p-2 bg-blue-100 text-blue-600 rounded-full" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.alias}</span>
                          {user.verified && (
                            <Shield className="h-4 w-4 text-green-500" />
                          )}
                          <Badge variant={user.type === 'ROOT' ? 'default' : 'secondary'}>
                            {user.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user.did.slice(0, 20)}...
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Reputación: {user.reputation}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartConversation(user)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Iniciar Chat
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserSearch;
