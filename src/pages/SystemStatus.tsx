
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveIdentity } from '@/state/identity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Shield, 
  Database, 
  Mail, 
  MessageCircle, 
  Lock, 
  FileSearch, 
  Eye,
  CheckCircle,
  AlertCircle,
  Wifi,
  Zap
} from 'lucide-react';

const SystemStatus = () => {
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState({
    blockchain: { connected: false, network: '', blockNumber: 0 },
    ipfs: { connected: true, peers: 12 },
    modules: {
      squid: true,
      qlock: true,
      qmail: true,
      qchat: true,
      qindex: true,
      qerberos: true,
      qonsent: true
    }
  });

  useEffect(() => {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      console.log('[SystemStatus] No hay identidad activa, redirigiendo a login');
      navigate('/squid-login');
      return;
    }

    // Simulate loading system status
    setTimeout(() => {
      setSystemStatus(prev => ({
        ...prev,
        blockchain: {
          connected: true,
          network: 'Polygon Mainnet',
          blockNumber: 52847392
        }
      }));
    }, 2000);
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

  const modulesList = [
    { id: 'squid', name: 'sQuid Identity', icon: Shield, status: systemStatus.modules.squid, route: '/squid-dashboard' },
    { id: 'qlock', name: 'Qlock Encryption', icon: Lock, status: systemStatus.modules.qlock, route: '/qlock' },
    { id: 'qmail', name: 'QMail Messaging', icon: Mail, status: systemStatus.modules.qmail, route: '/qmail' },
    { id: 'qchat', name: 'QChat P2P', icon: MessageCircle, status: systemStatus.modules.qchat, route: '/qchat' },
    { id: 'qindex', name: 'Qindex Registry', icon: Database, status: systemStatus.modules.qindex, route: '/qindex' },
    { id: 'qerberos', name: 'Qerberos Validation', icon: FileSearch, status: systemStatus.modules.qerberos, route: '/test-ipfs' },
    { id: 'qonsent', name: 'Qonsent Permissions', icon: Eye, status: systemStatus.modules.qonsent, route: '/qonsent' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-green-600" />
          Estado del Sistema
        </h1>
        <p className="text-muted-foreground mt-2">
          Estado operativo del ecosistema AnarQ&Q en producción
        </p>
      </div>

      {/* Identity Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Identidad Activa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-blue-700">Alias:</span>
              <p className="text-blue-900 font-semibold">{activeIdentity.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">Tipo:</span>
              <Badge variant="secondary">{activeIdentity.type}</Badge>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">Reputación:</span>
              <p className="text-blue-900 font-semibold">{activeIdentity.reputation}/100</p>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-medium text-blue-700">DID:</span>
            <p className="text-xs text-blue-800 font-mono break-all">{activeIdentity.did}</p>
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Conexión Blockchain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Estado:</span>
                {systemStatus.blockchain.connected ? (
                  <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                ) : (
                  <Badge variant="destructive">Desconectado</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Red:</span>
                <span className="text-sm font-medium">{systemStatus.blockchain.network || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bloque actual:</span>
                <span className="text-sm font-mono">{systemStatus.blockchain.blockNumber.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-600" />
              Red IPFS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Estado:</span>
                {systemStatus.ipfs.connected ? (
                  <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                ) : (
                  <Badge variant="destructive">Desconectado</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Peers conectados:</span>
                <span className="text-sm font-medium">{systemStatus.ipfs.peers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulesList.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer"
                  onClick={() => navigate(module.route)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{module.name}</span>
                  </div>
                  {module.status ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button onClick={() => navigate('/entry')} variant="outline">
          Volver al Hub
        </Button>
        <Button onClick={() => window.location.reload()}>
          Actualizar Estado
        </Button>
      </div>
    </div>
  );
};

export default SystemStatus;
