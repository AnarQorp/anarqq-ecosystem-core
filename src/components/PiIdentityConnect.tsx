
/**
 * PiIdentityConnect Component
 * 
 * Este componente maneja:
 * - Detección del Pi Browser
 * - Autenticación con Pi Network (mainnet/testnet)
 * - Generación de sQuid_ID a partir del username de Pi
 * - Estado de autenticación del usuario
 * - Soporte para testnet de Pi Network
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Smartphone, TestTube, Globe, Wallet } from 'lucide-react';
import { connectToTestnet, getPiTestnetSigner, isTestnetMode, getNetworkConfig } from '@/utils/qblockchain/piTestnet';
import { toast } from '@/hooks/use-toast';

// Definir los tipos para la API de Pi Network
declare global {
  interface Window {
    Pi?: {
      authenticate: () => Promise<{ user: { uid: string; username: string } }>;
      init: (config: { version: string; sandbox: boolean }) => void;
    };
    ethereum?: any;
  }
}

interface PiUser {
  uid: string;
  username: string;
  did?: string;
  walletAddress?: string;
}

interface PiIdentityConnectProps {
  onNetworkChange?: (isTestnet: boolean) => void;
  showNetworkToggle?: boolean;
}

export const PiIdentityConnect: React.FC<PiIdentityConnectProps> = ({ 
  onNetworkChange, 
  showNetworkToggle = false 
}) => {
  // Estado para controlar si Pi Browser está disponible
  const [isPiBrowserAvailable, setIsPiBrowserAvailable] = useState<boolean>(false);
  
  // Estado para el usuario autenticado
  const [authenticatedUser, setAuthenticatedUser] = useState<PiUser | null>(null);
  
  // Estado para controlar el proceso de autenticación
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  
  // Estado para errores de autenticación
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Estado de la red (testnet/mainnet)
  const [isTestnet, setIsTestnet] = useState<boolean>(isTestnetMode());
  
  // Estado de conexión de wallet
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

  // Efecto para detectar si estamos en Pi Browser
  useEffect(() => {
    // Verificar si window.Pi está disponible
    if (typeof window !== 'undefined' && window.Pi) {
      console.log('🥧 Pi Browser detectado');
      setIsPiBrowserAvailable(true);
      
      // Inicializar Pi SDK
      try {
        window.Pi.init({
          version: "2.0",
          sandbox: isTestnet // Usar sandbox para testnet
        });
      } catch (error) {
        console.warn('⚠️ Error inicializando Pi SDK:', error);
      }
    } else {
      console.log('❌ Pi Browser no detectado');
      setIsPiBrowserAvailable(false);
    }
  }, [isTestnet]);

  // Función para cambiar de red
  const handleNetworkToggle = () => {
    const newIsTestnet = !isTestnet;
    setIsTestnet(newIsTestnet);
    
    // Limpiar datos al cambiar de red
    setAuthenticatedUser(null);
    setIsWalletConnected(false);
    setWalletAddress('');
    setAuthError(null);
    
    // Limpiar localStorage
    localStorage.removeItem('pi_squid_id');
    localStorage.removeItem('pi_user_uid');
    localStorage.removeItem('pi_wallet_address');
    
    // Notificar cambio
    if (onNetworkChange) {
      onNetworkChange(newIsTestnet);
    }
    
    toast({
      title: `Cambiado a ${newIsTestnet ? 'Testnet' : 'Mainnet'}`,
      description: `Ahora operando en Pi Network ${newIsTestnet ? 'Testnet (Firenet)' : 'Mainnet'}`,
    });
  };

  // Función para conectar wallet testnet
  const handleConnectWallet = async () => {
    if (!isTestnet) {
      toast({
        title: "Solo disponible en testnet",
        description: "La conexión de wallet solo está disponible en modo testnet",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAuthenticating(true);
      
      console.log('[Pi Wallet] Conectando a testnet...');
      
      // Conectar a testnet y obtener signer
      await connectToTestnet();
      const signer = await getPiTestnetSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      setIsWalletConnected(true);
      
      // Guardar en localStorage
      localStorage.setItem('pi_wallet_address', address);
      
      toast({
        title: "Wallet conectada",
        description: `Conectado a Pi Network testnet: ${address.slice(0, 8)}...`,
      });
      
      console.log(`[Pi Wallet] ✅ Wallet conectada: ${address}`);
      
    } catch (error) {
      console.error('[Pi Wallet] ❌ Error conectando wallet:', error);
      setAuthError(error instanceof Error ? error.message : 'Error conectando wallet');
      
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar la wallet a testnet",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Función para manejar la autenticación con Pi Network
  const handlePiAuthentication = async () => {
    // Verificar que Pi esté disponible
    if (!window.Pi) {
      setAuthError('Pi Network no disponible');
      return;
    }

    // Iniciar proceso de autenticación
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log('🔐 Iniciando autenticación con Pi Network...');
      
      // Llamar a la API de autenticación de Pi
      const authResult = await window.Pi.authenticate();
      
      // Extraer información del usuario
      const piUser: PiUser = {
        uid: authResult.user.uid,
        username: authResult.user.username,
        did: `did:pi:${authResult.user.username}`, // Generar DID basado en username
        walletAddress: walletAddress || undefined
      };

      console.log('✅ Autenticación exitosa:', piUser);
      
      // Guardar el usuario autenticado
      setAuthenticatedUser(piUser);
      
      // Guardar en localStorage
      localStorage.setItem('pi_squid_id', piUser.username);
      localStorage.setItem('pi_user_uid', piUser.uid);
      if (piUser.did) {
        localStorage.setItem('pi_user_did', piUser.did);
      }

      console.log(`🆔 sQuid_ID generado: ${piUser.username}`);
      console.log(`🔗 DID generado: ${piUser.did}`);

    } catch (error) {
      console.error('❌ Error en autenticación Pi:', error);
      setAuthError('Error al autenticar con Pi Network');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    setAuthenticatedUser(null);
    setIsWalletConnected(false);
    setWalletAddress('');
    setAuthError(null);
    
    // Limpiar localStorage
    localStorage.removeItem('pi_squid_id');
    localStorage.removeItem('pi_user_uid');
    localStorage.removeItem('pi_user_did');
    localStorage.removeItem('pi_wallet_address');
  };

  // Efecto para restaurar sesión desde localStorage
  useEffect(() => {
    const savedSquidId = localStorage.getItem('pi_squid_id');
    const savedUid = localStorage.getItem('pi_user_uid');
    const savedDid = localStorage.getItem('pi_user_did');
    const savedWalletAddress = localStorage.getItem('pi_wallet_address');
    
    if (savedSquidId && savedUid) {
      setAuthenticatedUser({
        username: savedSquidId,
        uid: savedUid,
        did: savedDid || `did:pi:${savedSquidId}`,
        walletAddress: savedWalletAddress || undefined
      });
      
      if (savedWalletAddress) {
        setWalletAddress(savedWalletAddress);
        setIsWalletConnected(true);
      }
      
      console.log('🔄 Sesión restaurada:', savedSquidId);
    }
  }, []);

  const networkConfig = getNetworkConfig();

  // Renderizado
  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-sm border">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pi Identity Connect</h2>
        <p className="text-muted-foreground">
          Conecta tu identidad Pi para generar tu sQuid_ID
        </p>
        
        {/* Indicador de red */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant={isTestnet ? "secondary" : "default"}>
            {isTestnet ? (
              <>
                <TestTube className="mr-1 h-3 w-3" />
                Testnet
              </>
            ) : (
              <>
                <Globe className="mr-1 h-3 w-3" />
                Mainnet
              </>
            )}
          </Badge>
          {showNetworkToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNetworkToggle}
              className="text-xs"
            >
              Cambiar a {isTestnet ? 'Mainnet' : 'Testnet'}
            </Button>
          )}
        </div>
      </div>

      {/* Información de red testnet */}
      {isTestnet && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="text-xs space-y-1">
              <div className="font-medium text-blue-800">Pi Network Testnet</div>
              <div className="text-blue-600">Chain ID: {networkConfig.chainId}</div>
              <div className="text-blue-600 font-mono text-[10px]">
                RPC: {networkConfig.rpcUrl.slice(0, 30)}...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caso 1: Pi Browser no disponible */}
      {!isPiBrowserAvailable && (
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-medium">
              ⚠️ Debes abrir esto en el Pi Browser
            </p>
            <p className="text-yellow-600 text-sm mt-2">
              Esta aplicación requiere el Pi Browser para funcionar correctamente.
            </p>
          </div>
        </div>
      )}

      {/* Caso 2: Usuario no autenticado */}
      {isPiBrowserAvailable && !authenticatedUser && (
        <div className="space-y-4">
          <Button 
            onClick={handlePiAuthentication}
            disabled={isAuthenticating}
            className="w-full"
            size="lg"
          >
            {isAuthenticating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Autenticando...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Iniciar sesión con Pi
              </>
            )}
          </Button>

          {/* Mostrar error si existe */}
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">❌ {authError}</p>
            </div>
          )}
        </div>
      )}

      {/* Caso 3: Usuario autenticado */}
      {authenticatedUser && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-bold text-green-800 mb-2">
                ✅ Autenticación exitosa
              </h3>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-green-700">sQuid_ID:</span>
                  <br />
                  <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-800">
                    {authenticatedUser.username}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-green-700">DID:</span>
                  <br />
                  <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-800 text-xs">
                    {authenticatedUser.did}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-green-700">Pi UID:</span>
                  <br />
                  <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-800 text-xs">
                    {authenticatedUser.uid}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conexión de wallet para testnet */}
          {isTestnet && (
            <div className="space-y-2">
              {!isWalletConnected ? (
                <Button 
                  onClick={handleConnectWallet}
                  disabled={isAuthenticating}
                  variant="outline"
                  className="w-full"
                >
                  {isAuthenticating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Conectar Wallet Testnet
                    </>
                  )}
                </Button>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Wallet className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="font-medium text-purple-800">Wallet Conectada</span>
                    </div>
                    <div className="text-xs font-mono text-purple-700">
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Cerrar sesión
          </Button>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-6 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          💡 Tu sQuid_ID se genera automáticamente a partir de tu username de Pi Network
          y se utiliza como tu identidad descentralizada en el ecosistema AnarQ & Q.
          {isTestnet && (
            <span className="block mt-1 text-blue-600 font-medium">
              🧪 Modo testnet activo - ideal para pruebas y desarrollo.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default PiIdentityConnect;
