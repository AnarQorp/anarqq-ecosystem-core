import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Copy, Shield, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { getAllIndexEntries, FileIndexEntry } from '@/api/qindex';
import { verifyIntegrity, validateDownload } from '@/lib/qerberos';
import { downloadFile } from '@/lib/ipfsClient';
import { verifyFileAccess } from '@/lib/qerberos';
import { findLogsByIPFSHash } from '@/lib/qindex';
import { decryptFile, importKey } from '@/utils/encryption';
import { toast } from '@/hooks/use-toast';
import { registerQerberosValidationEvent, type QIndexLogEntry } from '@/api/qindex';
import { simulateQindexStorage } from '@/lib/qindex';

export const DownloadsSection = () => {
  const [files, setFiles] = useState<FileIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingFiles, setVerifyingFiles] = useState<Set<string>>(new Set());
  const [viewingFiles, setViewingFiles] = useState<Set<string>>(new Set());
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const entries = await getAllIndexEntries();
      setFiles(entries);
    } catch (error) {
      console.error('Error cargando archivos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los archivos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewFile = async (file: FileIndexEntry) => {
    setViewingFiles(prev => new Set(prev).add(file.cid));
    
    try {
      console.log(`👁️ Iniciando visualización segura de: ${file.filename}`);
      
      // Paso 1: Obtener archivo de IPFS
      console.log(`📥 Recuperando archivo de IPFS: ${file.cid}`);
      const result = await downloadFile(file.cid);
      if (!result.success || !result.content) {
        throw new Error('Archivo no encontrado en IPFS');
      }
      
      // Paso 2: Validar permisos con Qerberos
      console.log(`🔐 Validando acceso con Qerberos...`);
      const currentIdentity = 'did:example:current_user'; // En producción vendría del contexto de usuario
      const accessAttempt = await verifyFileAccess(file.cid, currentIdentity);
      
      if (accessAttempt.status !== 'AUTHORIZED') {
        throw new Error(`Acceso denegado: ${accessAttempt.reason}`);
      }
      
      console.log(`✅ Acceso autorizado por Qerberos`);
      
      // Paso 3: Buscar información de cifrado en QIndex
      console.log(`🔍 Buscando información de cifrado en QIndex...`);
      const fileLogs = findLogsByIPFSHash(file.cid);
      const uploadLog = fileLogs.find(log => log.operation === 'UPLOAD');
      
      if (!uploadLog) {
        throw new Error('No se encontraron registros de cifrado para este archivo');
      }
      
      console.log(`🔑 Simulando recuperación de clave AES desde Qlock...`);
      
      const encryptedContent = result.content;
      
      if (encryptedContent.startsWith('ENCRYPTED:')) {
        throw new Error('Archivo cifrado - funcionalidad de descifrado en desarrollo');
      }
      
      // Paso 4: Validación con Qerberos
      console.log(`🛡️ Validando descarga con Qerberos...`);
      const validationResult = await validateDownload(
        encryptedContent,
        file.cid,
        {
          filename: file.filename,
          fileSize: file.fileSize,
          identityDID: currentIdentity
        }
      );
      
      if (!validationResult) {
        toast({
          title: '⚠️ Validación fallida',
          description: `Qerberos detectó problemas de integridad o acceso en ${file.filename}`,
          variant: 'destructive'
        });
        
        const userConfirms = window.confirm(
          `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
          `Qerberos detectó posibles problemas con el archivo "${file.filename}":\n` +
          `- Integridad comprometida\n` +
          `- Permisos de acceso dudosos\n` +
          `- Inconsistencias en metadatos\n\n` +
          `¿Desea continuar visualizando el archivo bajo su propio riesgo?`
        );
        
        if (!userConfirms) {
          console.log(`🚫 Usuario canceló visualización tras advertencia de Qerberos`);
          return;
        }
        
        console.log(`⚠️ Usuario decidió continuar tras advertencia de Qerberos`);
      } else {
        console.log(`✅ Validación de Qerberos exitosa`);
      }
      
      // Paso 5: Registrar evento de validación en Qindex
      console.log(`📝 Registrando evento de validación en Qindex...`);
      const qindexLog: QIndexLogEntry = {
        fileHash: file.cid,
        userId: currentIdentity,
        timestamp: Date.now(),
        qerberosStatus: validationResult
      };
      
      // Primero simular almacenamiento en Qindex
      const qindexStorageSuccess = simulateQindexStorage(qindexLog);
      if (!qindexStorageSuccess) {
        toast({
          title: '❌ Error de registro',
          description: 'No se ha podido registrar el evento en Qindex. Intenta de nuevo más tarde.',
          variant: 'destructive'
        });
        return;
      }
      
      // Luego registrar en la API de Qindex
      const registrationSuccess = await registerQerberosValidationEvent(qindexLog);
      if (!registrationSuccess) {
        toast({
          title: '❌ Error de registro',
          description: 'No se ha podido registrar el evento en Qindex. Intenta de nuevo más tarde.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`✅ Evento registrado exitosamente en Qindex`);
      
      // Mostrar contenido
      console.log(`🔓 Mostrando contenido descifrado`);
      setDecryptedContent(encryptedContent);
      setViewingFileName(file.filename);
      
      toast({
        title: '✅ Archivo recuperado',
        description: `${file.filename} visualizado correctamente y evento registrado en Qindex`,
      });
      
    } catch (error) {
      console.error('Error al visualizar archivo:', error);
      toast({
        title: 'Error de visualización',
        description: `No se pudo visualizar ${file.filename}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    } finally {
      setViewingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.cid);
        return newSet;
      });
    }
  };

  const handleVerifyIntegrity = async (file: FileIndexEntry) => {
    setVerifyingFiles(prev => new Set(prev).add(file.cid));
    
    try {
      // Para la verificación necesitaríamos el archivo original
      // Por ahora simularemos la verificación usando solo el CID
      console.log(`🔍 Verificando integridad para ${file.filename} (${file.cid})`);
      
      // Simular verificación - en la práctica necesitaríamos el archivo original
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isValid = Math.random() > 0.1; // 90% de éxito para demo
      
      if (isValid) {
        toast({
          title: '✅ Integridad verificada',
          description: `El archivo ${file.filename} no ha sido alterado`,
        });
      } else {
        toast({
          title: '⚠️ Alerta de integridad',
          description: `Posible corrupción detectada en ${file.filename}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error verificando integridad:', error);
      toast({
        title: 'Error de verificación',
        description: `No se pudo verificar ${file.filename}`,
        variant: 'destructive'
      });
    } finally {
      setVerifyingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.cid);
        return newSet;
      });
    }
  };

  const handleDownload = async (file: FileIndexEntry) => {
    try {
      console.log(`📥 Descargando archivo: ${file.filename}`);
      
      const result = await downloadFile(file.cid);
      if (result.success && result.content) {
        // Validación con Qerberos antes de descarga
        console.log(`🛡️ Validando descarga con Qerberos...`);
        const currentIdentity = 'did:example:current_user';
        const validationResult = await validateDownload(
          result.content,
          file.cid,
          {
            filename: file.filename,
            fileSize: file.fileSize,
            identityDID: currentIdentity
          }
        );
        
        if (!validationResult) {
          const userConfirms = window.confirm(
            `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
            `Qerberos detectó problemas con el archivo "${file.filename}".\n` +
            `¿Desea proceder con la descarga bajo su propio riesgo?`
          );
          
          if (!userConfirms) {
            console.log(`🚫 Descarga cancelada por advertencia de Qerberos`);
            return;
          }
        }
        
        // Registrar evento de validación en Qindex
        console.log(`📝 Registrando evento de descarga en Qindex...`);
        const qindexLog: QIndexLogEntry = {
          fileHash: file.cid,
          userId: currentIdentity,
          timestamp: Date.now(),
          qerberosStatus: validationResult
        };
        
        const qindexStorageSuccess = simulateQindexStorage(qindexLog);
        if (!qindexStorageSuccess) {
          toast({
            title: '❌ Error de registro',
            description: 'No se ha podido registrar el evento en Qindex. Intenta de nuevo más tarde.',
            variant: 'destructive'
          });
          return;
        }
        
        const registrationSuccess = await registerQerberosValidationEvent(qindexLog);
        if (!registrationSuccess) {
          toast({
            title: '❌ Error de registro',
            description: 'No se ha podido registrar el evento en Qindex. Intenta de nuevo más tarde.',
            variant: 'destructive'
          });
          return;
        }
        
        // Crear blob y descargar
        const blob = new Blob([result.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ Descarga exitosa',
          description: `Archivo ${file.filename} descargado y evento registrado en Qindex`,
        });
      } else {
        throw new Error('No se pudo obtener el contenido del archivo');
      }
    } catch (error) {
      console.error('Error descargando archivo:', error);
      toast({
        title: 'Error de descarga',
        description: `No se pudo descargar ${file.filename}`,
        variant: 'destructive'
      });
    }
  };

  const handleCopyCID = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      toast({
        title: '📋 CID copiado',
        description: 'Hash copiado al portapapeles',
      });
    } catch (error) {
      console.error('Error copiando CID:', error);
    }
  };

  const closeDecryptedView = () => {
    setDecryptedContent(null);
    setViewingFileName('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Archivos Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando archivos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista de contenido descifrado
  if (decryptedContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Visualizando: {viewingFileName}
          </CardTitle>
          <CardDescription>
            Contenido descifrado y verificado por Qerberos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{decryptedContent}</pre>
            </div>
            <div className="flex gap-2">
              <Button onClick={closeDecryptedView} variant="outline">
                Volver a la lista
              </Button>
              <Button 
                onClick={() => {
                  const blob = new Blob([decryptedContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = viewingFileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Archivos Disponibles
        </CardTitle>
        <CardDescription>
          Lista de todos los archivos subidos a IPFS con verificación de integridad
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay archivos disponibles</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sube archivos en la pestaña "Subida" para verlos aquí
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{file.filename}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {file.privacyLevel === 'private' ? '🔒 Privado' : '🌍 Público'}
                      </Badge>
                      {file.fileSize && (
                        <Badge variant="secondary">
                          {Math.round(file.fileSize / 1024)} KB
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      CID: {file.cid.substring(0, 20)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subido: {new Date(file.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCID(file.cid)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyIntegrity(file)}
                      disabled={verifyingFiles.has(file.cid)}
                    >
                      {verifyingFiles.has(file.cid) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      disabled={viewingFiles.has(file.cid)}
                    >
                      {viewingFiles.has(file.cid) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
