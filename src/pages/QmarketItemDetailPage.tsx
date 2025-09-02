import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityStore } from '@/state/identity';
import { QmarketItem } from '@/modules/qmarket/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Download, 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Tag, 
  File, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Archive,
  FileQuestion
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { MiniProfileCard } from '@/components/shared/MiniProfileCard';

// Mock function to simulate IPFS metadata fetch
// Replace this with actual IPFS call in production
const getFileMetadataFromIpfs = async (cid: string): Promise<QmarketItem | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock data - in a real app, this would come from IPFS
  const mockItems: Record<string, QmarketItem> = {
    'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco': {
      cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      publisher: {
        cid_profile: 'QmProfile1',
        did: 'did:example:123',
        name: 'Artista Digital',
      },
      metadata: {
        title: 'Obra de arte digital exclusiva',
        description: 'Una pieza única de arte generativo creada con algoritmos personalizados. Esta obra representa la intersección entre el arte tradicional y la tecnología blockchain, ofreciendo una experiencia visual única que evoluciona con el tiempo.',
        tags: ['arte', 'digital', 'generativo', 'blockchain', 'nft'],
        license: 'cc-by-nc',
        price: 10.5,
        createdAt: '2025-06-15T10:30:00Z',
      },
      content: {
        type: 'image/png',
        size: 2457600, // 2.5MB
        source: 'qpic',
      },
    },
  };

  return mockItems[cid] || null;
};

// Helper to get file type icon
const getFileTypeIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive className="h-5 w-5" />;
  return <FileQuestion className="h-5 w-5" />;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Format date
const formatDate = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { 
    addSuffix: true,
    locale: es 
  });
};

const QmarketItemDetailPage: React.FC = () => {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { cid_profile: currentUserCid } = useSessionContext();
  const { activeIdentity } = useIdentityStore();
  
  const [item, setItem] = useState<QmarketItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Fetch item data
  useEffect(() => {
    if (!cid) {
      setError('No se proporcionó un identificador de contenido (CID)');
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // In a real app, this would verify the signature and decrypt the content
        setIsVerifying(true);
        
        // Simulate verification delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const itemData = await getFileMetadataFromIpfs(cid);
        
        if (!itemData) {
          throw new Error('No se encontró el contenido solicitado');
        }
        
        // In a real app, we would verify the signature here
        // const isValid = await verifySignature(itemData);
        const isValid = true; // Mock verification
        
        setVerificationStatus({
          isValid,
          message: isValid 
            ? 'Contenido verificado correctamente' 
            : 'No se pudo verificar la autenticidad del contenido'
        });
        
        if (isValid) {
          setItem(itemData);
        } else {
          setError('La autenticidad del contenido no pudo ser verificada');
        }
      } catch (err) {
        console.error('Error loading item:', err);
        setError('No se pudo cargar el contenido. Por favor, inténtalo de nuevo.');
      } finally {
        setIsLoading(false);
        setIsVerifying(false);
      }
    };

    fetchItem();
  }, [cid]);

  // Handle download
  const handleDownload = async () => {
    if (!item) return;
    
    try {
      // In a real app, this would download the actual file from IPFS
      // and handle decryption if needed
      console.log('Downloading file:', item.cid);
      
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Descarga iniciada');
    } catch (err) {
      console.error('Download failed:', err);
      setError('No se pudo iniciar la descarga. Por favor, inténtalo de nuevo.');
    }
  };

  if (isLoading || isVerifying) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3 space-y-4">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            
            <div className="md:w-1/3 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró el contenido solicitado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { metadata, content, publisher } = item;
  const isOwner = currentUserCid === publisher.cid_profile;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al mercado
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview section */}
          <Card className="overflow-hidden">
            <div className="bg-muted/30 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {getFileTypeIcon(content.type)}
                </div>
                <p className="text-muted-foreground">
                  Vista previa no disponible para este tipo de archivo
                </p>
              </div>
            </div>
          </Card>
          
          {/* Description section */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p>{metadata.description}</p>
              </div>
              
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Etiquetas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Verification status */}
          {verificationStatus && (
            <Alert className={verificationStatus.isValid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}>
              <AlertCircle className={`h-4 w-4 ${verificationStatus.isValid ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              <AlertDescription>
                {verificationStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publisher info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publicado por</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniProfileCard 
                cid={publisher.cid_profile}
                did={publisher.did}
                name={publisher.name}
                showFollowButton={!isOwner}
              />
            </CardContent>
          </Card>
          
          {/* Details card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Precio</h3>
                <p className="text-2xl font-bold">
                  {metadata.price > 0 ? `${metadata.price} AQ` : 'Gratis'}
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    {getFileTypeIcon(content.type)}
                    {content.type.split('/')[1]?.toUpperCase() || 'Archivo'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tamaño</span>
                  <span className="text-sm font-medium">
                    {formatFileSize(content.size)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Licencia</span>
                  <span className="text-sm font-medium">
                    {metadata.license.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Publicado</span>
                  <span className="text-sm font-medium">
                    {formatDate(metadata.createdAt)}
                  </span>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleDownload}
                disabled={!verificationStatus?.isValid}
              >
                <Download className="h-4 w-4 mr-2" />
                {metadata.price > 0 ? 'Comprar y descargar' : 'Descargar'}
              </Button>
              
              {metadata.price > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Se te redirigirá a la pasarela de pago
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Report/Share buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              Compartir
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Reportar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QmarketItemDetailPage;
