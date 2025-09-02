/**
 * Viewer Component
 * 
 * Este componente maneja:
 * - Visualización de documentos por hash IPFS
 * - Descifrado automático usando QLock
 * - Verificación de integridad usando QindexCore
 * - Registro de accesos usando QerberosLog
 * - Renderizado de contenido con validación
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  FileText, 
  AlertTriangle,
  Eye,
  History
} from 'lucide-react';
import { downloadFile } from '@/lib/ipfsClient';
import { decryptData } from '@/lib/quantumSim';
import { verifyFileHash, generateContentHash } from '@/components/qindex/QindexCore';
import { logAccess, getAccessLogsForCID, type AccessLogEntry } from '@/components/qerberos/QerberosLog';
import { toast } from '@/hooks/use-toast';

interface ViewerProps {
  cid?: string;
  onHashChange?: (cid: string) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ cid: initialCid, onHashChange }) => {
  const [cid, setCid] = useState<string>(initialCid || '');
  const [content, setContent] = useState<string>('');
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<{
    name?: string;
    size?: number;
    isEncrypted?: boolean;
  }>({});
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  const getCurrentIdentity = () => {
    // En producción, esto vendría del contexto de sQuid
    return 'user_mock_identity';
  };

  const handleCidChange = (newCid: string) => {
    setCid(newCid);
    onHashChange?.(newCid);
    setContent('');
    setDecryptedContent('');
    setVerificationStatus('pending');
    setFileMetadata({});
  };

  const loadAccessLogs = useCallback(async () => {
    if (cid) {
      try {
        const logs = getAccessLogsForCID(cid);
        setAccessLogs(logs);
      } catch (error) {
        console.error('Error loading access logs:', error);
      }
    }
  }, [cid]);

  const downloadFromIPFS = useCallback(async () => {
    if (!cid.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor introduce un CID válido',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Log download attempt
      logAccess({
        cid,
        identity: getCurrentIdentity(),
        status: 'SUCCESS',
        operation: 'DOWNLOAD',
        reason: 'File download initiated'
      });

      const result = await downloadFile(cid);
      
      if (result.success && result.content) {
        setContent(result.content);
        
        // Detect if encrypted
        const isEncrypted = result.content.startsWith('QUANTUM:') || 
                           result.content.includes('qlock');
        
        setFileMetadata({
          name: `archivo_${cid.substring(0, 8)}`,
          size: result.content.length,
          isEncrypted
        });

        toast({
          title: '📥 Archivo descargado',
          description: 'Contenido recuperado exitosamente de IPFS',
        });

        // Load access logs
        await loadAccessLogs();
      } else {
        throw new Error(result.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      
      // Log failed download
      logAccess({
        cid,
        identity: getCurrentIdentity(),
        status: 'FAILED',
        operation: 'DOWNLOAD',
        reason: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      toast({
        title: 'Error de descarga',
        description: 'No se pudo recuperar el archivo de IPFS',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [cid, loadAccessLogs]);

  const decryptContent = useCallback(async () => {
    if (!content) return;

    setIsDecrypting(true);
    
    try {
      const decrypted = await decryptData(content, "MOCK_PRIVATE_KEY");
      
      if (decrypted) {
        setDecryptedContent(decrypted);
        
        setFileMetadata(prev => ({
          ...prev,
          isEncrypted: false
        }));

        // Verificar integridad automáticamente después del descifrado
        await verifyIntegrity(decrypted);

        toast({
          title: '🔓 Archivo descifrado',
          description: 'Contenido descifrado exitosamente',
        });

        // Load access logs
        await loadAccessLogs();
      } else {
        throw new Error('Decryption failed');
      }
    } catch (error) {
      console.error('Error decrypting:', error);
      
      // Log failed decryption
      logAccess({
        cid,
        identity: getCurrentIdentity(),
        status: 'FAILED',
        operation: 'DECRYPT',
        reason: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      toast({
        title: 'Error de descifrado',
        description: 'No se pudo descifrar el contenido',
        variant: 'destructive'
      });
    } finally {
      setIsDecrypting(false);
    }
  }, [content, cid, loadAccessLogs]);

  const verifyIntegrity = useCallback(async (contentToVerify?: string) => {
    const targetContent = contentToVerify || decryptedContent || content;
    
    if (!targetContent) {
      toast({
        title: 'Error',
        description: 'No hay contenido para verificar',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // Generate hash of current content
      const currentHash = await generateContentHash(targetContent);
      
      // Verify against stored hash using QindexCore
      const isValid = verifyFileHash(cid, currentHash);
      
      setVerificationStatus(isValid ? 'success' : 'failed');
      
      // Log verification result using QerberosLog
      logAccess({
        cid,
        identity: getCurrentIdentity(),
        status: isValid ? 'SUCCESS' : 'FAILED',
        operation: 'VERIFY',
        reason: isValid ? 'Integrity verification passed' : 'Integrity verification failed - content may be corrupted',
        metadata: {
          verificationResult: isValid,
          fileSize: targetContent.length
        }
      });

      toast({
        title: isValid ? '✅ Integridad verificada' : '❌ Verificación fallida',
        description: isValid 
          ? 'El archivo no ha sido modificado' 
          : 'El contenido puede haber sido alterado',
        variant: isValid ? 'default' : 'destructive'
      });

      // Load access logs
      await loadAccessLogs();
    } catch (error) {
      console.error('Error verifying integrity:', error);
      setVerificationStatus('failed');
      
      toast({
        title: 'Error de verificación',
        description: 'No se pudo verificar la integridad del archivo',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  }, [content, decryptedContent, cid, loadAccessLogs]);

  const downloadDecrypted = useCallback(() => {
    const contentToDownload = decryptedContent || content;
    
    if (!contentToDownload) return;
    
    try {
      const blob = new Blob([contentToDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.name || `archivo_${cid.substring(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '💾 Descarga iniciada',
        description: `Descargando ${a.download}`,
      });
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: 'Error de descarga',
        description: 'No se pudo preparar el archivo para descarga',
        variant: 'destructive'
      });
    }
  }, [content, decryptedContent, fileMetadata.name, cid]);

  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <ShieldX className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Verificado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falló verificación</Badge>;
      default:
        return <Badge variant="secondary">Sin verificar</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualizador de Archivos IPFS
          </CardTitle>
          <CardDescription>
            Descarga, descifra y verifica la integridad de archivos desde IPFS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Introduce el hash IPFS (CID)"
              value={cid}
              onChange={(e) => handleCidChange(e.target.value)}
              className="mb-2"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={downloadFromIPFS}
              disabled={!cid.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </>
              )}
            </Button>

            {content && fileMetadata.isEncrypted && (
              <Button 
                onClick={decryptContent}
                disabled={isDecrypting}
                variant="outline"
              >
                {isDecrypting ? 'Descifrando...' : 'Descifrar'}
              </Button>
            )}

            {(content || decryptedContent) && (
              <Button 
                onClick={() => verifyIntegrity()}
                disabled={isVerifying}
                variant="outline"
              >
                {getVerificationIcon()}
                {isVerifying ? 'Verificando...' : 'Verificar'}
              </Button>
            )}
          </div>

          {/* Metadata and Status */}
          {fileMetadata.name && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {fileMetadata.name}
                </h4>
                <div className="flex items-center gap-2">
                  {fileMetadata.isEncrypted && (
                    <Badge variant="secondary">Cifrado</Badge>
                  )}
                  {getVerificationBadge()}
                </div>
              </div>
              {fileMetadata.size && (
                <div className="text-sm text-muted-foreground">
                  Tamaño: {Math.round(fileMetadata.size / 1024)} KB
                </div>
              )}
            </div>
          )}

          {/* Verification Alert */}
          {verificationStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencia de integridad:</strong> El contenido del archivo puede haber sido modificado 
                desde su subida original. Procede con precaución.
              </AlertDescription>
            </Alert>
          )}

          {/* Content Display */}
          {(decryptedContent || (!fileMetadata.isEncrypted && content)) && verificationStatus !== 'failed' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Contenido {decryptedContent ? 'descifrado' : ''}:
                </label>
                <Button
                  onClick={downloadDecrypted}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              </div>
              <Textarea
                value={(decryptedContent || content).length > 1000 ? 
                  (decryptedContent || content).substring(0, 1000) + '\n\n... (contenido truncado, usa "Descargar" para ver completo)' 
                  : (decryptedContent || content)}
                readOnly
                className="h-40 font-mono text-sm"
                placeholder="El contenido aparecerá aquí..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Logs Table */}
      {accessLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Registro de Accesos (Qerberos)
            </CardTitle>
            <CardDescription>
              Trazabilidad de operaciones realizadas en este archivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accessLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium">{log.operation || 'ACCESS'}</span>
                    <Badge variant="outline" className="text-xs">
                      {log.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {accessLogs.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  ... y {accessLogs.length - 5} entradas más
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Viewer;
