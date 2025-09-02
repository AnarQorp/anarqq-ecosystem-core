
/**
 * Página de gestión de identidades sQuid
 * Sistema de acceso al ecosistema AnarQ&Q
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Users, LogOut, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useIdentityStore, type SquidIdentity } from '@/state/identity';
import { useToast } from '@/hooks/use-toast';

// Identidades mock para demo
const MOCK_IDENTITIES: SquidIdentity[] = [
  {
    did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    name: 'Alex Root Identity',
    type: 'ROOT',
    kyc: true,
    reputation: 95,
    space: 'root_space_alex'
  },
  {
    did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
    name: 'Work Identity',
    type: 'SUB',
    kyc: true,
    reputation: 88,
    space: 'work_space_alex'
  },
  {
    did: 'did:key:z6MkrJVnaZkeFzdQyQSUTgb8VgSQNNi8M5z2JFwDVZpQJtQx',
    name: 'Personal Identity',
    type: 'SUB',
    kyc: false,
    reputation: 72,
    space: 'personal_space_alex'
  }
];

export default function SquidIdentity() {
  const { activeIdentity, isAuthenticated, setActiveIdentity, clearIdentity } = useIdentityStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedIdentityDID, setSelectedIdentityDID] = useState<string>('');
  const [availableIdentities, setAvailableIdentities] = useState<SquidIdentity[]>([]);

  useEffect(() => {
    // Simular carga de identidades disponibles
    const loadIdentities = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAvailableIdentities(MOCK_IDENTITIES);
    };
    
    loadIdentities();
  }, []);

  const handleLogin = async () => {
    if (!selectedIdentityDID) {
      toast({
        title: "Error",
        description: "Por favor selecciona una identidad",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Simular proceso de autenticación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const selectedIdentity = availableIdentities.find(id => id.did === selectedIdentityDID);
      
      if (!selectedIdentity) {
        throw new Error('Identidad no encontrada');
      }

      if (selectedIdentity.type === 'SUB' && !selectedIdentity.kyc) {
        throw new Error('Esta subidentidad requiere verificación KYC');
      }

      setActiveIdentity(selectedIdentity);
      
      toast({
        title: "¡Acceso exitoso!",
        description: `Bienvenido ${selectedIdentity.name}`,
      });

      // NO redirigir automáticamente - dejar que el usuario elija

    } catch (error) {
      toast({
        title: "Error de acceso",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearIdentity();
    setSelectedIdentityDID('');
    toast({
      title: "Sesión cerrada",
      description: "Has salido del sistema sQuid",
    });
  };

  const handleAccessEcosystem = () => {
    navigate('/test-ipfs');
  };

  const getIdentityIcon = (type: string) => {
    return type === 'ROOT' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getKycBadge = (kyc: boolean) => {
    return kyc ? (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        KYC Verificado
      </Badge>
    ) : (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        Sin KYC
      </Badge>
    );
  };

  return (
    <Layout module="squid">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">sQuid Identity</h1>
          <p className="text-gray-600">Sistema de acceso descentralizado AnarQ&Q</p>
        </div>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Seleccionar Identidad
              </CardTitle>
              <CardDescription>
                Elige tu identidad descentralizada para acceder al ecosistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Identidades disponibles</label>
                <Select value={selectedIdentityDID} onValueChange={setSelectedIdentityDID}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una identidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIdentities.map((identity) => (
                      <SelectItem key={identity.did} value={identity.did}>
                        <div className="flex items-center gap-2">
                          {getIdentityIcon(identity.type)}
                          <span>{identity.name}</span>
                          <span className="text-xs text-gray-500">({identity.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedIdentityDID && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const selected = availableIdentities.find(id => id.did === selectedIdentityDID);
                    if (!selected) return null;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selected.name}</span>
                          {getKycBadge(selected.kyc)}
                        </div>
                        <p className="text-xs text-gray-600">DID: {selected.did}</p>
                        <p className="text-xs text-gray-600">Reputación: {selected.reputation}%</p>
                        {selected.type === 'SUB' && !selected.kyc && (
                          <Alert>
                            <AlertDescription className="text-sm">
                              Esta subidentidad requiere verificación KYC para acceder
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <Button 
                onClick={handleLogin} 
                disabled={!selectedIdentityDID || isLoggingIn}
                className="w-full"
              >
                {isLoggingIn ? 'Autenticando...' : 'Acceder con sQuid'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Sesión Activa
              </CardTitle>
              <CardDescription>
                Identidad descentralizada conectada al ecosistema AnarQ&Q
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{activeIdentity?.name}</span>
                  <div className="flex items-center gap-2">
                    {getIdentityIcon(activeIdentity?.type || '')}
                    <Badge variant={activeIdentity?.type === 'ROOT' ? 'default' : 'secondary'}>
                      {activeIdentity?.type}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">DID:</span> {activeIdentity?.did}</p>
                  <p><span className="font-medium">Espacio:</span> {activeIdentity?.space}</p>
                  <p><span className="font-medium">Reputación:</span> {activeIdentity?.reputation}%</p>
                </div>
                
                {getKycBadge(activeIdentity?.kyc || false)}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>✅ Cifrado Qlock habilitado</p>
                <p>✅ Almacenamiento IPFS disponible</p>
                <p>✅ Módulos del ecosistema activados</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleAccessEcosystem} 
                  className="flex-1"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Acceder al Ecosistema
                </Button>
                
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-gray-500">
          <p>Sistema de identidades descentralizadas sQuid v1.0</p>
          <p>Ecosistema AnarQ&Q - Privacidad y Soberanía Digital</p>
        </div>
      </div>
    </Layout>
  );
}
