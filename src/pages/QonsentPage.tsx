
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveIdentity } from '@/state/identity';
import PermissionsManager from '@/components/qonsent/PermissionsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Users, Eye } from 'lucide-react';

const QonsentPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      console.log('[Qonsent] No hay identidad activa, redirigiendo a login');
      navigate('/login');
      return;
    }
    
    console.log(`[Qonsent] Módulo iniciado para identidad: ${activeIdentity.did}`);
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
          <Shield className="h-8 w-8 text-blue-600" />
          Qonsent
        </h1>
        <p className="text-muted-foreground mt-2">
          Control de autorización y gestión de permisos para recursos compartidos
        </p>
      </div>

      {/* Información de usuario activo */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-center flex items-center justify-center">
            <Users className="mr-2 h-5 w-5" />
            Identidad Activa
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="font-semibold">{activeIdentity.name}</p>
          <p className="text-sm text-muted-foreground">DID: {activeIdentity.did.slice(0, 32)}...</p>
        </CardContent>
      </Card>

      {/* Gestor de permisos principal */}
      <PermissionsManager />

      {/* Info Footer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Control Total de Acceso</h4>
              <p className="text-sm text-blue-700 mt-1">
                Qonsent te permite autorizar selectivamente qué identidades pueden acceder a tus archivos, 
                mensajes y otros recursos. Todas las políticas son gestionadas por tu identidad activa en sQuid.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QonsentPage;
