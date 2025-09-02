
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  TestTube, 
  ExternalLink, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { registerDocumentToTestnet, getPiTestnetSigner, getTestnetExplorerUrl, generateDocumentHash } from '@/utils/qblockchain/piTestnet';
import { registerDocumentOnChain, initializeBlockchain, connectWallet } from '@/lib/blockchain';
import { isTestnetMode, getEnvironmentConfig } from '@/utils/environment';
import { toast } from '@/hooks/use-toast';

interface BlockchainRegistration {
  productionTx?: string;
  testnetTx?: string;
  documentHash: string;
  timestamp: number;
}

interface QmailBlockchainRegisterProps {
  ipfsHash: string;
  messageContent: string;
  fileHash: string;
  onRegistrationComplete: (registration: BlockchainRegistration) => void;
}

export function QmailBlockchainRegister({ 
  ipfsHash, 
  messageContent, 
  fileHash,
  onRegistrationComplete 
}: QmailBlockchainRegisterProps) {
  const [enableProduction, setEnableProduction] = useState(false);
  const [enableTestnet, setEnableTestnet] = useState(isTestnetMode());
  const [isRegistering, setIsRegistering] = useState(false);
  const [registration, setRegistration] = useState<BlockchainRegistration | null>(null);

  const envConfig = getEnvironmentConfig();

  const handleRegister = async () => {
    if (!enableProduction && !enableTestnet) {
      toast({
        title: "Selecciona una red",
        description: "Debe habilitar al menos una red para el registro",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);
    const newRegistration: BlockchainRegistration = {
      documentHash: fileHash,
      timestamp: Date.now()
    };

    try {
      // Registro en producción (Polygon)
      if (enableProduction) {
        try {
          console.log('[Blockchain Register] Registrando en Polygon...');
          
          const blockchain = await initializeBlockchain('polygon');
          const signer = await connectWallet();
          
          const docHash = await generateDocumentHash(messageContent);
          const result = await registerDocumentOnChain(docHash, ipfsHash, blockchain, signer);
          
          newRegistration.productionTx = result.txHash;
          console.log(`[Blockchain Register] ✅ Polygon: ${result.txHash}`);
          
          toast({
            title: "Registrado en Polygon",
            description: `TX: ${result.txHash.slice(0, 16)}...`,
          });
          
        } catch (error) {
          console.error('[Blockchain Register] Error en Polygon:', error);
          toast({
            title: "Error en Polygon",
            description: "No se pudo registrar en la red principal",
            variant: "destructive"
          });
        }
      }

      // Registro en Pi Network Testnet
      if (enableTestnet) {
        try {
          console.log('[Blockchain Register] Registrando en Pi Testnet...');
          
          const docHash = await generateDocumentHash(messageContent);
          const signer = await getPiTestnetSigner();
          
          const result = await registerDocumentToTestnet(docHash, ipfsHash, signer);
          
          newRegistration.testnetTx = result.txHash;
          console.log(`[Blockchain Register] ✅ Pi Testnet: ${result.txHash}`);
          
          toast({
            title: "Registrado en Pi Testnet",
            description: `TX: ${result.txHash.slice(0, 16)}...`,
          });
          
        } catch (error) {
          console.error('[Blockchain Register] Error en Pi Testnet:', error);
          toast({
            title: "Error en Pi Testnet",
            description: "No se pudo registrar en testnet",
            variant: "destructive"
          });
        }
      }

      setRegistration(newRegistration);
      onRegistrationComplete(newRegistration);

    } catch (error) {
      console.error('[Blockchain Register] Error general:', error);
      toast({
        title: "Error en registro blockchain",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (registration) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="mr-2 h-5 w-5" />
            Registro Blockchain Completado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <strong>Hash del documento:</strong>
            <div className="font-mono text-xs break-all text-green-700">
              {registration.documentHash}
            </div>
          </div>
          
          {registration.productionTx && (
            <div>
              <Badge variant="default" className="mb-2">Polygon Mainnet</Badge>
              <div className="text-sm">
                <strong>TX Hash:</strong>
                <div className="font-mono text-xs break-all">
                  {registration.productionTx}
                </div>
                <a 
                  href={`https://polygonscan.com/tx/${registration.productionTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center mt-1"
                >
                  Ver en PolygonScan <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          
          {registration.testnetTx && (
            <div>
              <Badge variant="secondary" className="mb-2">Pi Network Testnet</Badge>
              <div className="text-sm">
                <strong>TX Hash:</strong>
                <div className="font-mono text-xs break-all">
                  {registration.testnetTx}
                </div>
                <a 
                  href={getTestnetExplorerUrl(registration.testnetTx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 text-xs flex items-center mt-1"
                >
                  Ver en Pi Testnet Explorer <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            Registrado: {new Date(registration.timestamp).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Registro en Blockchain
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Registra inmutablemente este mensaje en la blockchain para verificación futura
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Red activa:</strong> {envConfig.networkName}
            <br />
            <strong>IPFS Hash:</strong> <code className="text-xs">{ipfsHash.slice(0, 20)}...</code>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-production"
              checked={enableProduction}
              onCheckedChange={(checked) => setEnableProduction(checked as boolean)}
            />
            <label htmlFor="enable-production" className="text-sm font-medium">
              Registrar en Polygon Mainnet
            </label>
            <Badge variant="default">
              <Zap className="mr-1 h-3 w-3" />
              Producción
            </Badge>
          </div>
          
          {isTestnetMode() && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-testnet"
                checked={enableTestnet}
                onCheckedChange={(checked) => setEnableTestnet(checked as boolean)}
              />
              <label htmlFor="enable-testnet" className="text-sm font-medium">
                Registrar en Pi Network Testnet
              </label>
              <Badge variant="secondary">
                <TestTube className="mr-1 h-3 w-3" />
                Testnet
              </Badge>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔒 Se registrará el hash SHA-256 del mensaje</p>
          <p>🕒 La transacción será inmutable y verificable</p>
          <p>⛽ Se requiere gas/fees para el registro</p>
        </div>

        <Button 
          onClick={handleRegister} 
          disabled={isRegistering || (!enableProduction && !enableTestnet)}
          className="w-full"
        >
          {isRegistering ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Shield className="mr-2 h-4 w-4" />
          )}
          {isRegistering ? 'Registrando...' : 'Registrar en Blockchain'}
        </Button>
      </CardContent>
    </Card>
  );
}
