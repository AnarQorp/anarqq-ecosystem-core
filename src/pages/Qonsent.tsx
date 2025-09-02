
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveIdentity } from '@/state/identity';
import QonsentManager from '@/components/qonsent/QonsentManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Users } from 'lucide-react';

const Qonsent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      console.log('[Qonsent] No hay identidad activa, redirigiendo a login');
      navigate('/squid-login');
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archivos Propios</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Recursos bajo tu control</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Políticas Activas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Reglas de autorización</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DIDs Autorizados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Identidades con acceso</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Manager Component */}
      <QonsentManager />

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

export default Qonsent;
