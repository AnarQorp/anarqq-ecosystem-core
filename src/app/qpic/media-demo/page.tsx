'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QpicMediaProvider, QpicMediaGallery, QpicMediaUploader, QpicMediaPreview } from '@/modules/qpic/media';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function QpicMediaDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">QpiC Media Demo</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Media Gallery with Provider</CardTitle>
          <CardDescription>
            This example uses the QpicMediaProvider to manage the media state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QpicMediaProvider maxItems={5}>
            <MediaGalleryDemo />
          </QpicMediaProvider>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Components</CardTitle>
          <CardDescription>
            These examples show how to use the components individually with local state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="uploader" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="uploader">Media Uploader</TabsTrigger>
              <TabsTrigger value="preview">Media Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="uploader">
              <MediaUploaderDemo />
            </TabsContent>
            
            <TabsContent value="preview">
              <MediaPreviewDemo />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Example using the QpicMediaProvider
function MediaGalleryDemo() {
  const { items, uploadFiles, removeItem, hasReachedLimit } = useQpicMedia();
  const { toast } = useToast();

  const handleFilesSelected = async (files: File[]) => {
    const newItems = await uploadFiles(files);
    if (newItems.length > 0) {
      toast({
        title: 'Archivos subidos',
        description: `Se subieron ${newItems.length} archivo(s) correctamente.`,
      });
    }
  };

  const handleRemove = (cid: string) => {
    removeItem(cid);
    toast({
      title: 'Archivo eliminado',
      description: 'El archivo ha sido eliminado correctamente.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Galería de medios</h3>
          <p className="text-sm text-muted-foreground">
            {hasReachedLimit 
              ? 'Has alcanzado el límite de archivos.' 
              : `Puedes subir hasta 5 archivos (${5 - items.length} restantes).`}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={hasReachedLimit}
        >
          Añadir archivos
        </Button>
      </div>

      <QpicMediaGallery
        items={items}
        onItemsChange={(items) => console.log('Items changed:', items)}
        onItemClick={(item) => console.log('Item clicked:', item)}
        onItemRemove={handleRemove}
      />
    </div>
  );
}

// Example using the standalone MediaUploader
function MediaUploaderDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ cid: string; file: File }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleUploadComplete = (cid: string, file: File) => {
    setUploadedFiles(prev => [...prev, { cid, file }]);
    toast({
      title: 'Subida completada',
      description: `Archivo ${file.name} subido correctamente.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Subidor de archivos</h3>
        <p className="text-sm text-muted-foreground">
          Arrastra y suelta archivos aquí o haz clic para seleccionarlos.
        </p>
      </div>

      <QpicMediaUploader
        onUploadStart={() => setIsUploading(true)}
        onUploadComplete={handleUploadComplete}
        onError={(error) => {
          console.error('Upload error:', error);
          toast({
            title: 'Error',
            description: 'Ocurrió un error al subir el archivo.',
            variant: 'destructive',
          });
        }}
        onProgress={setUploadProgress}
        className="border-2 border-dashed rounded-lg p-8"
      />

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso:</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-2">Archivos subidos:</h4>
          <ul className="space-y-2">
            {uploadedFiles.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="truncate max-w-xs">{item.file.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.cid.slice(0, 8)}...{item.cid.slice(-4)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Example using the MediaPreview component
function MediaPreviewDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cid, setCid] = useState<string>('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCid('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // In a real app, you would upload the file to IPFS here
      // This is just a simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a mock CID
      const mockCid = `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuyl${Math.random().toString(36).substring(2, 10)}`;
      setCid(mockCid);
      
      toast({
        title: 'Archivo subido',
        description: 'La vista previa está lista.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la vista previa.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Vista previa de medios</h3>
        <p className="text-sm text-muted-foreground">
          Sube un archivo para ver una vista previa interactiva.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-1/2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seleccionar archivo</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile}
            className="w-full sm:w-auto"
          >
            Generar vista previa
          </Button>

          {selectedFile && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Detalles del archivo:</h4>
              <ul className="text-sm space-y-1">
                <li><span className="font-medium">Nombre:</span> {selectedFile.name}</li>
                <li><span className="font-medium">Tipo:</span> {selectedFile.type || 'Desconocido'}</li>
                <li><span className="font-medium">Tamaño:</span> {(selectedFile.size / 1024).toFixed(2)} KB</li>
                {cid && (
                  <li className="mt-2 pt-2 border-t">
                    <span className="font-medium">CID:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                      {cid}
                    </div>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="w-full sm:w-1/2">
          <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
            {selectedFile ? (
              cid ? (
                <QpicMediaPreview 
                  cid={cid} 
                  name={selectedFile.name}
                  type={selectedFile.type}
                  className="h-full w-full"
                  downloadable
                />
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted-foreground">
                    Haz clic en "Generar vista previa" para ver el archivo.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground">
                  Selecciona un archivo para ver la vista previa.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
