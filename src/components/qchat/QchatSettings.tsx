import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, MessageSquare, Bot, Save, TestTube, ExternalLink } from 'lucide-react';
import { SquidIdentity } from '@/state/identity';
import { toast } from '@/hooks/use-toast';
import { 
  getQchatSettings, 
  saveQchatSettings, 
  testTelegramBridge, 
  testDiscordBridge,
  type QchatBridgeSettings 
} from '@/utils/qchat/qchatBridgeService';
import SessionBridgeConfig from './SessionBridgeConfig';

interface QchatSettingsProps {
  activeIdentity: SquidIdentity;
}

const QchatSettings: React.FC<QchatSettingsProps> = ({ activeIdentity }) => {
  const [settings, setSettings] = useState<QchatBridgeSettings>({
    enableBridges: false,
    telegram: {
      enabled: false,
      webhookUrl: '',
      chatId: ''
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      channelId: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState<'telegram' | 'discord' | null>(null);

  // Cargar configuración al montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await getQchatSettings(activeIdentity.did);
        if (currentSettings) {
          setSettings(currentSettings);
        }
      } catch (error) {
        console.error('[Qchat Settings] Error cargando configuración:', error);
      }
    };

    loadSettings();
  }, [activeIdentity.did]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await saveQchatSettings(activeIdentity.did, settings);
      toast({
        title: "Configuración guardada",
        description: "Los puentes externos han sido configurados correctamente",
      });
    } catch (error) {
      console.error('[Qchat Settings] Error guardando configuración:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBridge = async (platform: 'telegram' | 'discord') => {
    setIsTesting(platform);
    try {
      let result;
      if (platform === 'telegram') {
        result = await testTelegramBridge(settings.telegram);
      } else {
        result = await testDiscordBridge(settings.discord);
      }

      if (result.success) {
        toast({
          title: `Test de ${platform} exitoso`,
          description: "El puente está configurado correctamente",
        });
      } else {
        toast({
          title: `Error en test de ${platform}`,
          description: result.error || "Error desconocido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`[Qchat Settings] Error en test de ${platform}:`, error);
      toast({
        title: `Error en test`,
        description: `Error durante la prueba del puente ${platform}`,
        variant: "destructive"
      });
    } finally {
      setIsTesting(null);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="bridges">Puentes Externos</TabsTrigger>
          <TabsTrigger value="session">Session Bridge</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Configuración general */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableBridges">Activar puentes externos</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite replicar mensajes cifrados a Telegram y Discord
                  </p>
                </div>
                <Switch
                  id="enableBridges"
                  checked={settings.enableBridges}
                  onCheckedChange={(checked) => updateSettings('enableBridges', checked)}
                />
              </div>

              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Los mensajes siempre se envían cifrados a los puentes externos. 
                  La descifración solo ocurre en clientes autorizados con las claves correspondientes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bridges" className="space-y-6">
          {/* Configuración de Telegram */}
          <Card className={!settings.enableBridges ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Puente Telegram
                </span>
                <Badge variant={settings.telegram.enabled ? 'default' : 'secondary'}>
                  {settings.telegram.enabled ? 'Activo' : 'Inactivo'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="telegramEnabled">Activar puente Telegram</Label>
                <Switch
                  id="telegramEnabled"
                  checked={settings.telegram.enabled}
                  onCheckedChange={(checked) => updateSettings('telegram.enabled', checked)}
                  disabled={!settings.enableBridges}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegramWebhook">Webhook URL de Telegram</Label>
                <Input
                  id="telegramWebhook"
                  placeholder="https://api.telegram.org/bot<token>/sendMessage"
                  value={settings.telegram.webhookUrl}
                  onChange={(e) => updateSettings('telegram.webhookUrl', e.target.value)}
                  disabled={!settings.enableBridges || !settings.telegram.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegramChatId">Chat ID de Telegram</Label>
                <Input
                  id="telegramChatId"
                  placeholder="-1001234567890"
                  value={settings.telegram.chatId}
                  onChange={(e) => updateSettings('telegram.chatId', e.target.value)}
                  disabled={!settings.enableBridges || !settings.telegram.enabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestBridge('telegram')}
                disabled={
                  !settings.enableBridges || 
                  !settings.telegram.enabled || 
                  !settings.telegram.webhookUrl ||
                  isTesting === 'telegram'
                }
                className="flex items-center gap-2"
              >
                {isTesting === 'telegram' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Probar Conexión
              </Button>
            </CardContent>
          </Card>

          {/* Configuración de Discord */}
          <Card className={!settings.enableBridges ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Puente Discord
                </span>
                <Badge variant={settings.discord.enabled ? 'default' : 'secondary'}>
                  {settings.discord.enabled ? 'Activo' : 'Inactivo'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="discordEnabled">Activar puente Discord</Label>
                <Switch
                  id="discordEnabled"
                  checked={settings.discord.enabled}
                  onCheckedChange={(checked) => updateSettings('discord.enabled', checked)}
                  disabled={!settings.enableBridges}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordWebhook">Webhook URL de Discord</Label>
                <Input
                  id="discordWebhook"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={settings.discord.webhookUrl}
                  onChange={(e) => updateSettings('discord.webhookUrl', e.target.value)}
                  disabled={!settings.enableBridges || !settings.discord.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordChannelId">Channel ID de Discord</Label>
                <Input
                  id="discordChannelId"
                  placeholder="1234567890123456789"
                  value={settings.discord.channelId}
                  onChange={(e) => updateSettings('discord.channelId', e.target.value)}
                  disabled={!settings.enableBridges || !settings.discord.enabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestBridge('discord')}
                disabled={
                  !settings.enableBridges || 
                  !settings.discord.enabled || 
                  !settings.discord.webhookUrl ||
                  isTesting === 'discord'
                }
                className="flex items-center gap-2"
              >
                {isTesting === 'discord' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Probar Conexión
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-6">
          {/* Información sobre Session */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-purple-600" />
                Acerca de Session Bridge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-purple-800">
                <p>
                  <strong>Session</strong> es una plataforma de mensajería privada basada en la red Oxen 
                  que utiliza grupos públicos descentralizados.
                </p>
                <p>
                  Este puente permite conectar Qchat con grupos públicos de Session para:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• Recibir mensajes del grupo Session en tiempo real</li>
                  <li>• Enviar mensajes locales al grupo Session (opcional)</li>
                  <li>• Mantener la verificación estructural con Qerberos</li>
                  <li>• Preservar el registro de actividad en Qindex</li>
                </ul>
                <p className="text-purple-600 font-medium">
                  Nota: Los mensajes externos no utilizan cifrado Qlock pero mantienen 
                  la trazabilidad del ecosistema sQuid.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Session Bridge */}
          <SessionBridgeConfig activeIdentity={activeIdentity} />
        </TabsContent>
      </Tabs>

      {/* Botón de guardar (solo para tabs que no sean session) */}
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
};

export default QchatSettings;
