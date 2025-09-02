
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Eye, EyeOff, CheckCircle, XCircle, Shield } from 'lucide-react';
import { getAllIndexEntries, FileIndexEntry } from '@/api/qindex';
import { getAccessLogs, AccessLogEntry } from '@/api/qerberos';
import { toast } from '@/hooks/use-toast';

export const HistorySection = () => {
  const [files, setFiles] = useState<FileIndexEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fileEntries, logs] = await Promise.all([
        getAllIndexEntries(),
        getAccessLogs(20)
      ]);
      
      setFiles(fileEntries);
      setAccessLogs(logs);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del historial',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (fileId: string) => {
    setShowKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'DENIED':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial y Trazabilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando historial...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabla de archivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Archivos
          </CardTitle>
          <CardDescription>
            Registro completo de archivos subidos con información de integridad
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay archivos en el historial</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Archivo</th>
                    <th className="text-left p-2 font-medium">CID</th>
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-left p-2 font-medium">Tamaño</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Clave AES</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{file.filename}</div>
                          <Badge variant="outline" className="mt-1">
                            {file.privacyLevel === 'private' ? '🔒 Privado' : '🌍 Público'}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {file.cid.substring(0, 16)}...
                        </code>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {new Date(file.timestamp).toLocaleDateString()} <br />
                        {new Date(file.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2">
                        {file.fileSize ? (
                          <Badge variant="secondary">
                            {Math.round(file.fileSize / 1024)} KB
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon('SUCCESS')}
                          <span className="text-sm">Verificado</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {showKeys.has(file.id) ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              mock_aes_key_***
                            </code>
                          ) : (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              ••••••••••••
                            </code>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(file.id)}
                          >
                            {showKeys.has(file.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs de acceso */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Accesos Qerberos</CardTitle>
          <CardDescription>
            Registro de trazabilidad de todas las operaciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accessLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay logs de acceso</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accessLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                  {getStatusIcon(log.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.operation}</Badge>
                      <span className="font-medium">{log.metadata?.fileName || 'Archivo'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(log.timestamp).toLocaleString()} • {log.identity}
                    </div>
                    {log.reason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.reason}
                      </div>
                    )}
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {log.cid.substring(0, 8)}...
                  </code>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
