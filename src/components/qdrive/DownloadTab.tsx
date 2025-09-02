
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadFile } from '@/utils/ipfs';
import { useStorachaClient } from '@/services/ucanService';

export default function DownloadTab() {
  const { toast } = useToast();
  const { client, getOrCreateSpace } = useStorachaClient();
  const [ipfsHash, setIpfsHash] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    if (!ipfsHash.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un hash IPFS válido',
        variant: 'destructive'
      });
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Ensure we have a space and UCAN delegation
      await getOrCreateSpace();
      
      // Download the file with progress tracking
      const result = await downloadFile(ipfsHash, {
        onProgress: (progress) => {
          setDownloadProgress(progress);
          console.log(`Download progress: ${progress}%`);
        }
      });
      
      // Create a download link and trigger it
      const blob = new Blob([result.data], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.name || `file_${ipfsHash.slice(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Descarga completada',
        description: 'El archivo se ha descargado correctamente',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error de descarga',
        description: error instanceof Error ? error.message : 'No se pudo descargar el archivo desde IPFS',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Descargar archivo desde IPFS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Pega aquí el hash IPFS..."
          value={ipfsHash}
          onChange={(e) => setIpfsHash(e.target.value)}
        />
        <div className="space-y-2 w-full">
          <Button 
            onClick={handleDownload}
            disabled={downloading || !ipfsHash.trim()}
            className="w-full"
          >
            {downloading ? 'Descargando...' : 'Descargar'}
          </Button>
          {downloading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
