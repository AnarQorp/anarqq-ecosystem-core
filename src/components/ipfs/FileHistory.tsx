
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadedFile, getUploadedFiles, removeUploadedFile } from '@/utils/storage';
import { toast } from '@/hooks/use-toast';

interface FileHistoryProps {
  onRefresh?: () => void;
}

export default function FileHistory({ onRefresh }: FileHistoryProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);

  React.useEffect(() => {
    refreshFiles();
  }, []);

  const refreshFiles = () => {
    const uploadedFiles = getUploadedFiles();
    setFiles(uploadedFiles);
    onRefresh?.();
  };

  const handleRemoveFile = (id: string, name: string) => {
    try {
      removeUploadedFile(id);
      refreshFiles();
      toast({
        title: '🗑️ Archivo eliminado',
        description: `${name} fue eliminado del historial`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el archivo',
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Archivos</CardTitle>
          <CardDescription>
            No hay archivos subidos todavía
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Los archivos que subas a IPFS aparecerán aquí para fácil acceso.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Archivos IPFS</CardTitle>
        <CardDescription>
          {files.length} archivo{files.length !== 1 ? 's' : ''} subido{files.length !== 1 ? 's' : ''} a IPFS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Hash IPFS</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{file.name}</div>
                      <Badge variant="secondary" className="text-xs">
                        {file.mimeType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 rounded">
                      {file.hash.substring(0, 12)}...
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(file.timestamp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.ipfsUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(file.hash)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id, file.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Los archivos permanecen en IPFS de forma descentralizada. 
          Este historial es solo una referencia local.
        </div>
      </CardContent>
    </Card>
  );
}
