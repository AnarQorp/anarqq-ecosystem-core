
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Settings, Eye, Link, Check } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { getCurrentEnvironment, setEnvironment } from '@/utils/environment';

interface WalletInfo {
  address: string;
  balance: number;
  connected: boolean;
  network: 'testnet' | 'mainnet';
}

export default function WalletManager() {
  const { activeIdentity } = useIdentityStore();
  const { toast } = useToast();
  const [currentEnv, setCurrentEnv] = useState(getCurrentEnvironment());
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    balance: 0,
    connected: false,
    network: currentEnv === 'testnet' ? 'testnet' : 'mainnet'
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Simular datos de wallet
    if (activeIdentity) {
      loadWalletInfo();
    }
  }, [activeIdentity, currentEnv]);

  const loadWalletInfo = () => {
    // Simulación de datos de wallet Pi
    const mockWalletAddress = currentEnv === 'testnet' 
      ? 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH' 
      : 'GCKFBEIYTKP5LZPB7EJP5CQQL7DTRGNVDJBDDCWSAHNHNBXRMGXE9B6X';
    
    const mockBalance = currentEnv === 'testnet' ? 156.78 : 42.31;
    
    setWalletInfo({
      address: mockWalletAddress,
      balance: mockBalance,
      connected: true,
      network: currentEnv === 'testnet' ? 'testnet' : 'mainnet'
    });
  };

  const handleNetworkSwitch = (isTestnet: boolean) => {
    const newEnv = isTestnet ? 'testnet' : 'production';
    setEnvironment(newEnv);
    setCurrentEnv(newEnv);
    
    toast({
      title: "Red cambiada",
      description: `Conectado a ${isTestnet ? 'Pi Testnet' : 'Pi Mainnet'}`,
    });
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    
    // Simular conexión con Pi SDK
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setWalletInfo(prev => ({
      ...prev,
      connected: true
    }));
    
    setIsConnecting(false);
    
    toast({
      title: "Wallet conectada",
      description: "Tu wallet Pi ha sido vinculada correctamente",
    });
  };

  const handleSignAction = (actionType: string) => {
    if (!walletInfo.connected) {
      toast({
        title: "Error",
        description: "Conecta tu wallet primero",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Firma solicitada",
      description: `Acción "${actionType}" enviada a tu wallet Pi para firma`,
    });
  };

  if (!activeIdentity) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">Inicia sesión para gestionar tu wallet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de red */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Configuración de Red
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Mainnet</span>
            </div>
            <Switch
              checked={currentEnv === 'testnet'}
              onCheckedChange={handleNetworkSwitch}
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm">Testnet</span>
            </div>
          </div>
          
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Red activa:</strong> Pi {currentEnv === 'testnet' ? 'Testnet' : 'Mainnet'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentEnv === 'testnet' 
                    ? '🧪 Red de pruebas para desarrollo'
                    : '🚀 Red principal para transacciones reales'
                  }
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Estado de la wallet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Estado de Wallet Pi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Estado de conexión:</span>
            <Badge variant={walletInfo.connected ? "default" : "destructive"}>
              {walletInfo.connected ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Conectada
                </>
              ) : (
                'Desconectada'
              )}
            </Badge>
          </div>
          
          {walletInfo.connected ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Dirección:</label>
                <p className="text-xs font-mono bg-gray-50 p-2 rounded border break-all">
                  {walletInfo.address}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Saldo estimado:</label>
                <p className="text-lg font-bold text-green-600">
                  {walletInfo.balance.toFixed(2)} π
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Red:</label>
                <Badge variant="outline">{walletInfo.network}</Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Conecta tu wallet Pi para acceder a las funciones de firma
              </p>
              <Button 
                onClick={handleConnectWallet} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? 'Conectando...' : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Conectar Wallet Pi
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones de firma */}
      {walletInfo.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones del Ecosistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Firma acciones importantes del ecosistema AnarQ&Q con tu wallet Pi
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleSignAction('Envío de mensaje')}
                className="justify-start"
              >
                Firmar mensaje Qchat
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleSignAction('Envío de documento')}
                className="justify-start"
              >
                Firmar envío Qmail
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleSignAction('Subida de archivo')}
                className="justify-start"
              >
                Firmar subida Qdrive
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleSignAction('Registro blockchain')}
                className="justify-start"
              >
                Registrar en blockchain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del usuario */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Integración Pi Network</h4>
              <p className="text-sm text-blue-700 mt-1">
                Tu identidad sQuid <strong>{activeIdentity.name}</strong> está lista para interactuar 
                con Pi Network. Todas las operaciones importantes pueden firmarse con tu wallet Pi 
                para máxima seguridad y trazabilidad.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
