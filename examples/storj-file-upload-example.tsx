/**
 * Complete Example: Storj File Upload with IPFS CID Generation
 * 
 * This example demonstrates how to use the Qsocial file upload system
 * with Storj storage, IPFS CID generation, and Filecoin preparation.
 */

import React, { useState } from 'react';
import FileUpload from '../src/components/qsocial/FileUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Alert, AlertDescription } from '../src/components/ui/alert';
import { 
  uploadFile, 
  getFileIPFSInfo, 
  generateSignedUrl, 
  getUserFiles,
  checkStorageHealth,
  formatFileSize 
} from '../src/api/qsocial-files';
import { 
  Upload, 
  Download, 
  Eye, 
  Globe, 
  Server, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

interface UploadedFile {
  fileId: string;
  originalName: string;
  storjUrl: string;
  storjKey: string;
  ipfsCid?: string;
  filecoinCid?: string;
  fileSize: number;
  contentType: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

const StorjFileUploadExample: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storageHealth, setStorageHealth] = useState<any>(null);

  // Handle successful file upload
  const handleUploadComplete = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setSuccess(`${files.length} archivo(s) subido(s) exitosamente`);
    setError(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  // Handle upload errors
  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  // Check storage service health
  const checkHealth = async () => {
    setLoading(true);
    try {
      const health = await checkStorageHealth();
      setStorageHealth(health);
    } catch (err) {
      setError('Error checking storage health');
    } finally {
      setLoading(false);
    }
  };

  // Get IPFS information for a file
  const getIPFSInfo = async (fileId: string) => {
    setLoading(true);
    try {
      const info = await getFileIPFSInfo(fileId);
      if (info.success && info.ipfs) {
        alert(`IPFS CID: ${info.ipfs.cid}\n\nGateway URLs:\n${info.ipfs.gatewayUrls.join('\n')}`);
      } else {
        setError('Error obteniendo información IPFS');
      }
    } catch (err) {
      setError('Error obteniendo información IPFS');
    } finally {
      setLoading(false);
    }
  };

  // Generate signed URL for direct access
  const getSignedUrl = async (fileId: string) => {
    setLoading(true);
    try {
      const result = await generateSignedUrl(fileId, 3600); // 1 hour
      if (result.success && result.signedUrl) {
        window.open(result.signedUrl, '_blank');
      } else {
        setError('Error generando URL firmada');
      }
    } catch (err) {
      setError('Error generando URL firmada');
    } finally {
      setLoading(false);
    }
  };

  // Load user files
  const loadUserFiles = async () => {
    setLoading(true);
    try {
      const result = await getUserFiles(50);
      if (result.success && result.files) {
        // Convert to UploadedFile format (simplified)
        const files: UploadedFile[] = result.files.map(file => ({
          fileId: file.fileId,
          originalName: file.fileId, // In real implementation, this would come from metadata
          storjUrl: `https://gateway.storjshare.io/qsocial-files/${file.storjKey}`,
          storjKey: file.storjKey,
          fileSize: file.size,
          contentType: 'application/octet-stream', // Would be stored in metadata
          uploadedAt: file.lastModified
        }));
        setUploadedFiles(files);
      } else {
        setError('Error cargando archivos');
      }
    } catch (err) {
      setError('Error cargando archivos');
    } finally {
      setLoading(false);
    }
  };

  // Manual file upload example
  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadFile(file);
      if (result.success && result.file) {
        handleUploadComplete([result.file]);
      } else {
        setError(result.error || 'Error subiendo archivo');
      }
    } catch (err) {
      setError('Error subiendo archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Storj File Upload con IPFS CID
        </h1>
        <p className="text-gray-600">
          Ejemplo completo de subida de archivos a Storj con generación automática de IPFS CID y preparación para Filecoin
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Storage Health Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado del Servicio de Almacenamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button onClick={checkHealth} disabled={loading}>
              Verificar Estado
            </Button>
            {storageHealth && (
              <div className="flex items-center gap-2">
                <Badge variant={storageHealth.success ? "default" : "destructive"}>
                  {storageHealth.success ? "Saludable" : "Con Problemas"}
                </Badge>
              </div>
            )}
          </div>

          {storageHealth?.health && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${storageHealth.health.storj ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Storj: {storageHealth.health.storj ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${storageHealth.health.ipfs ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>IPFS: {storageHealth.health.ipfs ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${storageHealth.health.bucket ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Bucket: {storageHealth.health.bucket ? 'Accesible' : 'Inaccesible'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload Component */}
      <FileUpload
        onUploadComplete={handleUploadComplete}
        onError={handleUploadError}
        maxFiles={5}
        maxFileSize={50 * 1024 * 1024} // 50MB
        allowMultiple={true}
        showIPFSInfo={true}
      />

      {/* Manual Upload Alternative */}
      <Card>
        <CardHeader>
          <CardTitle>Subida Manual (Alternativa)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleManualUpload}
              accept="image/*,video/*,audio/*,application/pdf,text/plain"
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <span className="text-sm text-gray-500">
              Selecciona un archivo para subir directamente
            </span>
          </div>
        </CardContent>
      </Card>

      {/* File Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Archivos Subidos</span>
            <Button onClick={loadUserFiles} variant="outline" size="sm">
              Cargar Mis Archivos
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay archivos subidos. Usa el componente de arriba para subir archivos.
            </p>
          ) : (
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div key={file.fileId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {file.contentType.startsWith('image/') ? (
                          <ImageIcon className="h-10 w-10 text-blue-500" />
                        ) : (
                          <FileText className="h-10 w-10 text-gray-500" />
                        )}
                      </div>

                      {/* File Info */}
                      <div>
                        <h4 className="font-medium">{file.originalName}</h4>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.fileSize)} • {file.contentType}
                        </p>
                        <p className="text-xs text-gray-400">
                          Subido: {new Date(file.uploadedAt).toLocaleString()}
                        </p>

                        {/* IPFS/Filecoin Info */}
                        <div className="flex items-center gap-2 mt-2">
                          {file.ipfsCid && (
                            <Badge variant="secondary" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              IPFS CID
                            </Badge>
                          )}
                          {file.filecoinCid && (
                            <Badge variant="outline" className="text-xs">
                              Filecoin Ready
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getSignedUrl(file.fileId)}
                        disabled={loading}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {file.ipfsCid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getIPFSInfo(file.fileId)}
                          disabled={loading}
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* File Details */}
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-1">
                    <div>
                      <strong>File ID:</strong> <code className="bg-gray-100 px-1 rounded">{file.fileId}</code>
                    </div>
                    <div>
                      <strong>Storj URL:</strong> <code className="bg-gray-100 px-1 rounded break-all">{file.storjUrl}</code>
                    </div>
                    {file.ipfsCid && (
                      <div>
                        <strong>IPFS CID:</strong> <code className="bg-gray-100 px-1 rounded break-all">{file.ipfsCid}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Implementation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de Implementación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Flujo de Subida de Archivos:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>El archivo se sube a Storj usando la API compatible con S3</li>
              <li>Se genera automáticamente un IPFS CID para el contenido del archivo</li>
              <li>El archivo se prepara para futura replicación en Filecoin</li>
              <li>Se crean thumbnails automáticamente para imágenes</li>
              <li>Los metadatos se almacenan en caché para acceso rápido</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Características:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Almacenamiento distribuido en Storj con alta disponibilidad</li>
              <li>Generación automática de IPFS CID para verificación de contenido</li>
              <li>Preparación para almacenamiento a largo plazo en Filecoin</li>
              <li>URLs firmadas para acceso seguro y temporal</li>
              <li>Rate limiting y validación de archivos</li>
              <li>Soporte para múltiples tipos de archivo</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Configuración Requerida:</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`# Variables de entorno necesarias
STORJ_ACCESS_KEY_ID=tu_access_key_id
STORJ_SECRET_ACCESS_KEY=tu_secret_access_key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_BUCKET=qsocial-files
IPFS_HOST=localhost
IPFS_PORT=5001`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorjFileUploadExample;