
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Code, 
  Copy, 
  ExternalLink, 
  FileText, 
  Settings, 
  Wallet,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getEnvironmentConfig } from '@/utils/environment';
import { toast } from '@/hooks/use-toast';

export function DeveloperGuide() {
  const [copiedCode, setCopiedCode] = useState<string>('');
  const envConfig = getEnvironmentConfig();

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
    toast({
      title: "Código copiado",
      description: "El código ha sido copiado al portapapeles",
    });
  };

  const envFileContent = `# Pi Network Testnet Configuration
VITE_PI_TESTNET_RPC=https://api.testnet.minepi.com
VITE_PI_TESTNET_CHAIN_ID=12345
VITE_PI_TESTNET_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_PI_TESTNET_EXPLORER=https://explorer.testnet.minepi.com/tx/
VITE_ENVIRONMENT=testnet`;

  const contractDeployCode = `// Script de deploy para Hardhat
const { ethers } = require("hardhat");

async function main() {
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistry.deploy();
  await registry.deployed();
  
  console.log("DocumentRegistry deployed to:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;

  const usageExample = `import { registerDocumentToTestnet, getPiTestnetSigner } from '@/utils/qblockchain/piTestnet';

// Registrar documento en Pi Testnet
async function registerDocument(messageContent: string, ipfsHash: string) {
  try {
    const signer = await getPiTestnetSigner();
    const result = await registerDocumentToTestnet(messageContent, ipfsHash, signer);
    console.log('TX Hash:', result.txHash);
    return result;
  } catch (error) {
    console.error('Error:', error);
  }
}`;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Code className="mr-2 h-6 w-6" />
          Guía para Desarrolladores
        </CardTitle>
        <p className="text-muted-foreground">
          Configuración completa para integrar Pi Network Testnet y blockchain en AnarQ Nexus
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="contract">Contrato</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="usage">Uso</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Configuración de Entorno
              </h3>
              
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estado actual:</strong> {envConfig.networkName}
                  <br />
                  <strong>Chain ID:</strong> {envConfig.chainId}
                  <br />
                  <strong>Contrato:</strong> {envConfig.contractAddress || 'No configurado'}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Paso 1: Archivo .env.testnet</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(envFileContent, 'env')}
                    >
                      {copiedCode === 'env' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{envFileContent}
                  </pre>
                </div>

                <div>
                  <Badge variant="outline">Paso 2: Configurar vite.config.ts</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    ✅ Ya configurado para cargar variables de entorno automáticamente
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Deploy del Contrato
              </h3>

              <div className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    El contrato <code>DocumentRegistry.sol</code> está listo en la carpeta <code>contracts/</code>
                  </AlertDescription>
                </Alert>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Script de Deploy (Hardhat)</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(contractDeployCode, 'deploy')}
                    >
                      {copiedCode === 'deploy' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{contractDeployCode}
                  </pre>
                </div>

                <div className="text-sm space-y-2">
                  <p><strong>Comandos para deploy:</strong></p>
                  <code className="bg-slate-100 px-2 py-1 rounded">npm install --save-dev hardhat</code>
                  <br />
                  <code className="bg-slate-100 px-2 py-1 rounded">npx hardhat run scripts/deploy.js --network pi-testnet</code>
                  <br />
                  <p className="text-muted-foreground">
                    Después del deploy, copia la dirección del contrato al archivo .env.testnet
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Configuración de Wallet
              </h3>

              <div className="space-y-4">
                <Alert>
                  <Wallet className="h-4 w-4" />
                  <AlertDescription>
                    Se requiere una wallet compatible con Pi Network para firmar transacciones
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Pi Browser</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        La wallet integrada del Pi Browser
                      </p>
                      <Badge variant="default">Recomendado</Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">MetaMask</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Configurar red Pi Testnet manualmente
                      </p>
                      <Badge variant="outline">Compatible</Badge>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-sm space-y-2">
                  <p><strong>Configuración de red en MetaMask:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Network Name: Pi Network Testnet</li>
                    <li>RPC URL: https://api.testnet.minepi.com</li>
                    <li>Chain ID: 12345</li>
                    <li>Symbol: PI</li>
                    <li>Explorer: https://explorer.testnet.minepi.com</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Code className="mr-2 h-5 w-5" />
                Integración en el Código
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Ejemplo de Uso</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(usageExample, 'usage')}
                    >
                      {copiedCode === 'usage' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{usageExample}
                  </pre>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">🔄 Flujo de integración:</h4>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                      <li>Usuario cifra mensaje con Qlock (sQuid DID)</li>
                      <li>Mensaje cifrado se sube a IPFS</li>
                      <li>Usuario elige registrar en blockchain</li>
                      <li>Se conecta wallet Pi Network</li>
                      <li>Se firma y envía transacción</li>
                      <li>Se muestra hash de transacción y enlace al explorador</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium">📦 Módulos integrados:</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Badge variant="outline">✅ sQuid (Identidades)</Badge>
                      <Badge variant="outline">✅ Qlock (Cifrado)</Badge>
                      <Badge variant="outline">✅ QMail (Mensajería)</Badge>
                      <Badge variant="outline">✅ IPFS (Almacenamiento)</Badge>
                      <Badge variant="outline">✅ Qonsent (Permisos)</Badge>
                      <Badge variant="outline">✅ Qerberos (Seguridad)</Badge>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sistema listo para producción:</strong> Toda la funcionalidad está integrada 
                    y es compatible entre módulos. El sistema funciona tanto en testnet como en producción.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enlaces útiles</h4>
              <p className="text-sm text-muted-foreground">Documentación y recursos externos</p>
            </div>
            <div className="space-x-2">
              <Button size="sm" variant="outline" asChild>
                <a href="https://docs.ethers.org" target="_blank" rel="noopener noreferrer">
                  Ethers.js <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="https://hardhat.org" target="_blank" rel="noopener noreferrer">
                  Hardhat <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
