
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, Download, History, Settings, AlertCircle } from 'lucide-react';
import { useStorachaClient } from '@/services/ucanService';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import UploadTab from './UploadTab';
import DownloadTab from './DownloadTab';
import HistoryTab from './HistoryTab';
import SettingsTab from './SettingsTab';

interface QdriveTabsProps {
  isQpic?: boolean;
}

export default function QdriveTabs({ isQpic = false }: QdriveTabsProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [ipfsReady, setIpfsReady] = useState(false);
  const [ipfsError, setIpfsError] = useState<string | null>(null);
  const { client, getOrCreateSpace } = useStorachaClient();
  const { toast } = useToast();

  // Initialize IPFS on component mount
  useEffect(() => {
    const initIpfs = async () => {
      try {
        await getOrCreateSpace();
        setIpfsReady(true);
      } catch (error) {
        console.error('Failed to initialize IPFS:', error);
        setIpfsError('No se pudo conectar al servicio de almacenamiento. Intenta recargar la página.');
        toast({
          title: 'Error de conexión',
          description: 'No se pudo conectar al servicio de almacenamiento',
          variant: 'destructive',
        });
      }
    };

    initIpfs();
  }, [getOrCreateSpace, toast]);

  if (ipfsError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {ipfsError}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Recargar página
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger 
          value="upload" 
          className="flex items-center gap-2"
          disabled={!ipfsReady}
        >
          <Upload className="h-4 w-4" />
          {isQpic ? 'Subir media' : 'Subir'}
        </TabsTrigger>
        <TabsTrigger 
          value="download" 
          className="flex items-center gap-2"
          disabled={!ipfsReady}
        >
          <Download className="h-4 w-4" />
          Descargar
        </TabsTrigger>
        <TabsTrigger 
          value="history" 
          className="flex items-center gap-2"
          disabled={!ipfsReady}
        >
          <History className="h-4 w-4" />
          Historial
        </TabsTrigger>
        <TabsTrigger 
          value="settings" 
          className="flex items-center gap-2"
          disabled={!ipfsReady}
        >
          <Settings className="h-4 w-4" />
          Ajustes
        </TabsTrigger>
      </TabsList>

      {!ipfsReady ? (
        <div className="mt-6 p-4 text-center text-muted-foreground">
          <p>Inicializando servicio de almacenamiento...</p>
          <div className="mt-4 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '80%' }} />
          </div>
        </div>
      ) : (
        <>
          <TabsContent value="upload" className="mt-6">
            <UploadTab isQpic={isQpic} />
          </TabsContent>

          <TabsContent value="download" className="mt-6">
            <DownloadTab />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <HistoryTab isQpic={isQpic} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsTab />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
