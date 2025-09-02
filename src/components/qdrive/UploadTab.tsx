
import * as React from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image, Video, File as FileIcon, X } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { useSessionContext } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { uploadWithEncryption } from '@/services/uploadService';
import { useStorachaClient } from '@/services/ucanService';
import SuccessCard from './SuccessCard';
import type { UnifiedFile } from '@/modules/qpic/types';

const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime'
];

interface UploadTabProps {
  isQpic?: boolean;
}

export default function UploadTab({ isQpic = false }: UploadTabProps) {
  const { activeIdentity } = useIdentityStore();
  const { session } = useSessionContext();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UnifiedFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Get cid_profile and isAuthenticated from session context
  const { cid_profile, isAuthenticated } = useSessionContext();

  const { getOrCreateSpace } = useStorachaClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeIdentity) return;
    
    const file = e.target.files[0];
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: 'No autenticado',
        description: 'Debes iniciar sesión para subir archivos.',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate file type for Qpic
    if (isQpic && !allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no permitido',
        description: 'Solo se permiten imágenes y videos',
        variant: 'destructive'
      });
      return;
    }
    
    // Create preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(file));
    }
    
    // Reset states
    setUploadResult(null);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Get or create space for the user
      await getOrCreateSpace();
      
      // Upload file with encryption and progress tracking
      const result = await uploadWithEncryption(file, {
        encrypt: true, // Enable encryption by default
        metadata: {
          source: isQpic ? 'qpic' : 'qdrive',
          uploaderDid: activeIdentity.did,
          cid_profile: cid_profile,
          isQpic: isQpic ? 'true' : 'false'
        },
        onProgress: (progress) => {
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        }
      });
      
      console.log('File uploaded to IPFS:', result);
      
      // The result is already a UnifiedFile object
      setUploadResult(result);
      
      toast({
        title: '¡Archivo subido!',
        description: `El archivo se ha subido correctamente a IPFS con el CID: ${result.cid}`,
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error al subir archivo',
        description: error instanceof Error ? error.message : 'Error desconocido al subir el archivo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Clear the input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  if (uploadResult) {
    return (
      <SuccessCard 
        ipfsHash={uploadResult.cid}
        fileName={uploadResult.name}
        isQpic={isQpic}
        cid_profile={uploadResult.cid_profile}
        onClose={() => {
          setUploadResult(null);
          setPreview(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isQpic ? 'Subir archivo multimedia' : 'Subir archivo'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {preview ? (
            <div className="relative w-full h-40 rounded-md overflow-hidden">
              {preview.startsWith('data:video') ? (
                <video
                  src={preview}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : preview.startsWith('data:image') ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                  <FileIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Vista previa no disponible</p>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isQpic ? 'Arrastra tu imagen o video aquí' : 'Arrastra tu archivo aquí'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o haz clic para seleccionar
              </p>
            </>
          )}
          
          <input 
            type="file" 
            accept={isQpic ? allowedTypes.join(',') : undefined}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
            id="file-input"
          />
          
          <Button 
            variant="default" 
            disabled={uploading}
            onClick={() => {
              const fileInput = document.getElementById('file-input') as HTMLInputElement;
              fileInput?.click();
            }}
            className="mt-2"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Procesando..." : `Seleccionar ${isQpic ? 'multimedia' : 'archivo'}`}
          </Button>
        </div>

        {isQpic && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Formatos soportados:</p>
            <p>Imágenes: JPEG, PNG, GIF, WebP, SVG</p>
            <p>Videos: MP4, WebM, MOV</p>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
            🔒 Proceso seguro garantizado
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-blue-700">
            <div>📦 Qompress</div>
            <div>🔐 Qlock</div>
            <div>📋 Qindex</div>
            <div>🛡️ Qerberos</div>
            <div>🌐 IPFS</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
