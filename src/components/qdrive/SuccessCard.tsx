import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionContext } from '@/contexts/SessionContext';
import { useStorachaClient } from '@/services/ucanService';

interface ProcessStep {
  module: string;
  status: string;
  icon: string;
}

interface SuccessCardProps {
  ipfsHash: string;
  fileName: string;
  isQpic?: boolean;
  onClose: () => void;
  cid_profile?: string;
}

export default function SuccessCard({ ipfsHash, fileName, isQpic = false, onClose, cid_profile }: SuccessCardProps) {
  const { toast } = useToast();
  const { cid_profile: sessionCidProfile } = useSessionContext();
  
  // Use the provided cid_profile or fall back to the session cid_profile
  const profileCid = cid_profile || sessionCidProfile;

  const processSteps: ProcessStep[] = [
    { module: 'Qompress', status: 'Comprimido', icon: '📦' },
    { module: 'Qlock', status: 'Cifrado', icon: '🔐' },
    { module: 'Qindex', status: 'Indexado', icon: '📋' },
    { module: 'Qerberos', status: 'Verificado', icon: '🛡️' },
    { module: 'IPFS', status: 'Subido', icon: '🌐' }
  ];

  const { client } = useStorachaClient();
  
  const getGatewayUrl = (cid: string) => {
    if (client) {
      return client.getGatewayUrl(cid);
    }
    return `https://ipfs.io/ipfs/${cid}`;
  };
  
  const gatewayUrl = getGatewayUrl(ipfsHash);
  
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: message,
    });
  };
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = gatewayUrl;
    link.download = fileName || `file-${ipfsHash.substring(0, 8)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto animate-fade-in">
      <CardHeader className="text-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            🎉 Archivo subido correctamente
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Tu archivo ha sido subido exitosamente a IPFS
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mostrar información de perfil si hay un cid_profile */}
        {profileCid && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500 mb-2">Subido por</p>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {profileCid.substring(0, 8)}...{profileCid.substring(profileCid.length - 4)}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-2">Nombre del archivo</p>
          <p className="font-mono text-sm break-all">{fileName}</p>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            <strong>{fileName}</strong> ha sido procesado por todos los módulos del ecosistema AnarQ&Q
          </p>
          {isQpic && (
            <Badge variant="secondary" className="mb-4">
              📸 Qpic - Archivo multimedia
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {processSteps.map((step, index) => (
            <div key={step.module} className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">{step.icon}</span>
              </div>
              <div className="text-sm font-medium">{step.module}</div>
              <Badge variant="default" className="mt-1 text-xs bg-green-600">
                {step.status} ✅
              </Badge>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-1">Hash IPFS:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <code className="text-sm font-mono break-all">{ipfsHash}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => copyToClipboard(ipfsHash, 'Hash IPFS copiado al portapapeles')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <code className="text-sm font-mono break-all text-blue-600">
                    <a href={gatewayUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {gatewayUrl}
                    </a>
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => copyToClipboard(gatewayUrl, 'URL del gateway copiada al portapapeles')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Subir otro archivo
            </Button>
            <Button 
              onClick={handleDownload}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Descargar archivo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
