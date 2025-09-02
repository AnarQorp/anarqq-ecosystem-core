
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  TestTube, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Wifi,
  WifiOff,
  ExternalLink
} from 'lucide-react';
import { SquidIdentity } from '@/state/identity';
import { toast } from '@/hooks/use-toast';
import { 
  getSessionBridgeSettings, 
  saveSessionBridgeSettings, 
  testSessionConnection,
  startSessionBridge,
  stopSessionBridge,
  getSessionBridgeStatus,
  type SessionBridgeSettings 
} from '@/utils/qchat/qchatSessionBridge';

interface SessionBridgeConfigProps {
  activeIdentity: SquidIdentity;
}

export default function SessionBridgeConfig({ activeIdentity }: SessionBridgeConfigProps) {
  const [settings, setSettings] = useState<SessionBridgeSettings>({
    enabled: false,
    groupId: '',
    botToken: '',
    serverUrl: 'https://open.getsession.org',
    pollInterval: 30,
    sendToSession: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(getSessionBridgeStatus());

  // Cargar configuración al montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = getSessionBridgeSettings(activeIdentity.did);
        if (currentSettings) {
          setSettings(currentSettings);
        }
      } catch (error) {
        console.error('[Session Bridge Config] Error cargando configuración:', error);
      }
    };

    loadSettings();
  }, [activeIdentity.did]);

  // Actualizar estado del puente cada 10 segundos
  useEffect(() => {
    const updateStatus = () => {
      setBridgeStatus(getSessionBridgeStatus());
    };

    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await saveSessionBridgeSettings(activeIdentity.did, settings);
      toast({
        title: "Configuración guardada",
        description: settings.enabled 
          ? "Puente Session activado y configurado"
          : "Puente Session desactivado",
      });
      
      // Actualizar estado inmediatamente
      setBridgeStatus(getSessionBridgeStatus());
    } catch (error) {
      console.error('[Session Bridge Config] Error guardando configuración:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración del puente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testSessionConnection(settings);
      
      if (result.success) {
        toast({
          title: "Conexión exitosa",
          description: "El puente Session está configurado correctamente",
        });
      } else {
        toast({
          title: "Error de conexión",
          description: result.error || "No se pudo conectar con Session",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Session Bridge Config] Error en test:', error);
      toast({
        title: "Error en test",
        description: "Error durante la prueba de conexión",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const updateSettings = (field: keyof SessionBridgeSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Estado del puente */}
      <Card className={bridgeStatus.connected ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {bridgeStatus.connected ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-gray-500" />
              )}
              Estado del Puente Session
            </span>
            <Badge variant={bridgeStatus.connected ? 'default' : 'secondary'}>
              {bridgeStatus.connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Mensajes recibidos</p>
              <p className="font-semibold">{bridgeStatus.messagesReceived}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mensajes enviados</p>
              <p className="font-semibold">{bridgeStatus.messagesSent}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Último polling</p>
              <p className="font-semibold">
                {bridgeStatus.lastPoll 
                  ? new Date(bridgeStatus.lastPoll).toLocaleTimeString()
                  : 'Nunca'
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Errores</p>
              <p className="font-semibold text-red-600">{bridgeStatus.errors.length}</p>
            </div>
          </div>
          
          {bridgeStatus.errors.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Últimos errores:</strong>
                <ul className="mt-1 text-xs">
                  {bridgeStatus.errors.slice(-3).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuración general */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuración del Puente Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sessionEnabled">Activar puente Session</Label>
              <p className="text-sm text-muted-foreground">
                Conecta con grupos públicos de la red Session (Oxen)
              </p>
            </div>
            <Switch
              id="sessionEnabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings('enabled', checked)}
            />
          </div>

          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              <strong>Información:</strong> Los mensajes de Session se muestran como externos y 
              solo se verifican estructuralmente. El cifrado Qlock no aplica a mensajes externos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configuración de conexión */}
      <Card className={!settings.enabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle>Configuración de Conexión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">URL del servidor Session</Label>
            <Input
              id="serverUrl"
              placeholder="https://open.getsession.org"
              value={settings.serverUrl}
              onChange={(e) => updateSettings('serverUrl', e.target.value)}
              disabled={!settings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupId">ID del grupo público</Label>
            <Input
              id="groupId"
              placeholder="grupo-publico-session-123"
              value={settings.groupId}
              onChange={(e) => updateSettings('groupId', e.target.value)}
              disabled={!settings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="botToken">Token del bot (opcional)</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="token-del-bot-session"
              value={settings.botToken}
              onChange={(e) => updateSettings('botToken', e.target.value)}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Solo necesario si el grupo requiere autenticación de bot
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pollInterval">Intervalo de polling (segundos)</Label>
            <Input
              id="pollInterval"
              type="number"
              min="10"
              max="300"
              value={settings.pollInterval}
              onChange={(e) => updateSettings('pollInterval', parseInt(e.target.value))}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sendToSession">Enviar mensajes locales a Session</Label>
              <p className="text-sm text-muted-foreground">
                Los mensajes de Qchat se replican al grupo Session
              </p>
            </div>
            <Switch
              id="sendToSession"
              checked={settings.sendToSession}
              onCheckedChange={(checked) => updateSettings('sendToSession', checked)}
              disabled={!settings.enabled}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={
              !settings.enabled || 
              !settings.groupId || 
              !settings.serverUrl ||
              isTesting
            }
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            Probar Conexión
          </Button>
        </CardContent>
      </Card>

      {/* Información de seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Seguridad y Verificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Verificación estructural con Qerberos</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Registro de actividad en Qindex</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Los mensajes externos no usan cifrado Qlock</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Verificación de identidad limitada para usuarios Session</span>
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
