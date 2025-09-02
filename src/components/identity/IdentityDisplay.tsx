
/**
 * Componente para mostrar la identidad activa del usuario
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, LogOut, Globe } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const IdentityDisplay: React.FC = () => {
  const { activeIdentity, clearIdentity } = useIdentityStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!activeIdentity) {
    return null;
  }

  const handleLogout = () => {
    // Limpiar sesión completa
    clearIdentity();
    localStorage.removeItem('active_user_did');
    localStorage.removeItem('active_space_did');
    localStorage.removeItem('space_delegation_ucan');
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    
    navigate('/entry');
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{activeIdentity.name}</span>
                <Badge variant={activeIdentity.type === 'ROOT' ? "default" : "secondary"}>
                  {activeIdentity.type}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Shield className="h-3 w-3" />
                <span>DID: {activeIdentity.did.slice(0, 20)}...</span>
                {activeIdentity.space && (
                  <>
                    <Globe className="h-3 w-3" />
                    <span>Space: {activeIdentity.space.slice(0, 16)}...</span>
                  </>
                )}
              </div>
              
              {activeIdentity.reputation && (
                <div className="text-xs text-slate-500">
                  Reputación: {activeIdentity.reputation}/100
                </div>
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="text-slate-600 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdentityDisplay;
