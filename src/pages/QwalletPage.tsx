
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveIdentity } from '@/state/identity';
import WalletManager from '@/components/qwallet/WalletManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Users } from 'lucide-react';

const QwalletPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      console.log('[Qwallet] No hay identidad activa, redirigiendo a login');
      navigate('/login');
      return;
    }
    
    console.log(`[Qwallet] Módulo iniciado para identidad: ${activeIdentity.did}`);
  }, [navigate]);

  const activeIdentity = getActiveIdentity();

  if (!activeIdentity) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground">
          Acceso denegado - Inicia sesión en sQuid
        </h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Wallet className="h-8 w-8 text-purple-600" />
          Qwallet
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de wallet Pi Network y firma de transacciones del ecosistema
        </p>
      </div>

      {/* Información de usuario activo */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-center flex items-center justify-center">
            <Users className="mr-2 h-5 w-5" />
            Identidad Vinculada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="font-semibold">{activeIdentity.name}</p>
          <p className="text-sm text-muted-foreground">DID: {activeIdentity.did.slice(0, 32)}...</p>
          <div className="flex justify-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              <Shield className="w-3 h-3 mr-1" />
              sQuid Activo
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Gestor de wallet principal */}
      <WalletManager />

      {/* Info Footer */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Integración Pi Network</h4>
              <p className="text-sm text-purple-700 mt-1">
                Qwallet conecta tu identidad sQuid con Pi Network para firma de transacciones, 
                validación de operaciones y gestión de activos digitales. Compatible con testnet y mainnet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QwalletPage;
