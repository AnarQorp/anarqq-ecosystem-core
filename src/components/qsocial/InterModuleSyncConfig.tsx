/**
 * Configuración de Sincronización Inter-Módulos
 * 
 * Permite a los usuarios configurar cómo se sincronizan los eventos
 * entre Qsocial y otros módulos del ecosistema.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  FileText, 
  Image, 
  Mail, 
  Lock, 
  Wallet,
  Shield,
  Save,
  RefreshCw,
  Activity
} from 'lucide-react';

interface ModuleIntegration {
  enabled: boolean;
  autoPost: boolean;
  requireApproval: boolean;
  subcommunityId?: string;
  tags: string[];
}

interface SyncConfig {
  userId: string;
  integrations: Record<string, ModuleIntegration>;
  stats: {
    totalIntegrations: number;
    enabledIntegrations: number;
    autoPostEnabled: number;
    lastSync: string;
  };
}

interface SyncStats {
  userId: string;
  totalCrossPosts: number;
  recentCrossPosts: number;
  moduleBreakdown: Record<string, number>;
  successRate: number;
  lastSync: string;
  queuedEvents: number;
  processingStatus: string;
}

const InterModuleSyncConfig: React.FC = () => {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const moduleInfo = {
    qmarket: {
      name: 'Qmarket',
      icon: <Globe className="h-5 w-5" />,
      description: 'Marketplace de productos y NFTs',
      color: 'bg-blue-500'
    },
    qdrive: {
      name: 'Qdrive',
      icon: <FileText className="h-5 w-5" />,
      description: 'Almacenamiento y compartición de archivos',
      color: 'bg-green-500'
    },
    qpic: {
      name: 'Qpic',
      icon: <Image className="h-5 w-5" />,
      description: 'Galería de imágenes y media',
      color: 'bg-purple-500'
    },
    qmail: {
      name: 'Qmail',
      icon: <Mail className="h-5 w-5" />,
      description: 'Sistema de mensajería (privado)',
      color: 'bg-red-500'
    },
    qlock: {
      name: 'Qlock',
      icon: <Lock className="h-5 w-5" />,
      description: 'Control de acceso y seguridad',
      color: 'bg-yellow-500'
    },
    qwallet: {
      name: 'Qwallet',
      icon: <Wallet className="h-5 w-5" />,
      description: 'Billetera y transacciones',
      color: 'bg-indigo-500'
    },
    qonsent: {
      name: 'Qonsent',
      icon: <Shield className="h-5 w-5" />,
      description: 'Gestión de privacidad y consentimiento',
      color: 'bg-teal-500'
    }
  };

  // Cargar configuración
  const loadConfig = async () => {
    try {
      setError(null);
      const response = await fetch('/api/qsocial/sync/config');
      
      if (!response.ok) {
        throw new Error('Error loading sync configuration');
      }

      const data = await response.json();
      setConfig(data.config);
    } catch (err) {
      setError(err.message);
      console.error('Config loading error:', err);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const response = await fetch('/api/qsocial/sync/stats');
      
      if (!response.ok) {
        throw new Error('Error loading sync stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Stats loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar configuración
  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/qsocial/sync/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integrations: config.integrations
        })
      });

      if (!response.ok) {
        throw new Error('Error saving configuration');
      }

      const data = await response.json();
      setConfig(data.config);
      setSuccess('Configuración guardada exitosamente');
      
      // Recargar estadísticas
      await loadStats();
    } catch (err) {
      setError(err.message);
      console.error('Config save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar configuración de módulo
  const updateModuleConfig = (module: string, updates: Partial<ModuleIntegration>) => {
    if (!config) return;

    setConfig({
      ...config,
      integrations: {
        ...config.integrations,
        [module]: {
          ...config.integrations[module],
          ...updates
        }
      }
    });
  };

  // Cargar datos al montar
  useEffect(() => {
    Promise.all([loadConfig(), loadStats()]);
  }, []);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Sincronización Inter-Módulos
          </h1>
          <p className="text-gray-600">
            Configura cómo se sincronizan los eventos entre Qsocial y otros módulos
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving || !config}>
          <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Estadísticas generales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posts Cruzados</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCrossPosts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentCrossPosts} recientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                Sincronización exitosa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cola de Eventos</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queuedEvents}</div>
              <p className="text-xs text-muted-foreground">
                Estado: {stats.processingStatus}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Sync</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {new Date(stats.lastSync).toLocaleTimeString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.lastSync).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Configuración de Módulos</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas Detalladas</TabsTrigger>
        </TabsList>

        {/* Tab de configuración de módulos */}
        <TabsContent value="modules" className="space-y-4">
          {config && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(config.integrations).map(([module, integration]) => {
                const info = moduleInfo[module];
                if (!info) return null;

                return (
                  <Card key={module}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${info.color} text-white`}>
                          {info.icon}
                        </div>
                        <div>
                          <div>{info.name}</div>
                          <CardDescription className="text-sm">
                            {info.description}
                          </CardDescription>
                        </div>
                        <div className="ml-auto">
                          <Switch
                            checked={integration.enabled}
                            onCheckedChange={(enabled) => 
                              updateModuleConfig(module, { enabled })
                            }
                          />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    
                    {integration.enabled && (
                      <CardContent className="space-y-4">
                        {/* Auto-post */}
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Auto-publicar</label>
                            <p className="text-xs text-gray-500">
                              Crear posts automáticamente sin aprobación
                            </p>
                          </div>
                          <Switch
                            checked={integration.autoPost}
                            onCheckedChange={(autoPost) => 
                              updateModuleConfig(module, { autoPost })
                            }
                          />
                        </div>

                        {/* Require approval */}
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Requiere aprobación</label>
                            <p className="text-xs text-gray-500">
                              Los posts necesitan aprobación manual
                            </p>
                          </div>
                          <Switch
                            checked={integration.requireApproval}
                            onCheckedChange={(requireApproval) => 
                              updateModuleConfig(module, { requireApproval })
                            }
                          />
                        </div>

                        {/* Tags */}
                        <div>
                          <label className="text-sm font-medium">Tags automáticos</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {integration.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            {integration.enabled ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-green-700">Activo</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-500">Inactivo</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab de estadísticas detalladas */}
        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              {/* Breakdown por módulo */}
              <Card>
                <CardHeader>
                  <CardTitle>Posts Cruzados por Módulo</CardTitle>
                  <CardDescription>
                    Distribución de publicaciones cruzadas por módulo de origen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.moduleBreakdown)
                      .sort(([,a], [,b]) => b - a)
                      .map(([module, count]) => {
                        const info = moduleInfo[module];
                        const percentage = (count / stats.totalCrossPosts) * 100;
                        
                        return (
                          <div key={module} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-1 rounded ${info?.color || 'bg-gray-500'} text-white`}>
                                {info?.icon || <Activity className="h-4 w-4" />}
                              </div>
                              <span className="text-sm font-medium">
                                {info?.name || module}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración actual */}
              {config && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de Configuración</CardTitle>
                    <CardDescription>
                      Estado actual de las integraciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {config.stats.enabledIntegrations}
                        </div>
                        <div className="text-sm text-gray-600">
                          Integraciones activas
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {config.stats.autoPostEnabled}
                        </div>
                        <div className="text-sm text-gray-600">
                          Auto-post habilitado
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {config.stats.totalIntegrations - config.stats.enabledIntegrations}
                        </div>
                        <div className="text-sm text-gray-600">
                          Integraciones inactivas
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterModuleSyncConfig;