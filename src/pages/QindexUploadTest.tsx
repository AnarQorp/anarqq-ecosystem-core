
import { useState, useCallback } from 'react';
import { Layout } from '@/components/common/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { simulateQKDKey, encryptMessage, decryptMessage } from '@/utils/encryption';
import { connectWallet, signMessage } from '@/utils/web3';
import { toast } from '@/hooks/use-toast';

export default function QindexUploadTest() {
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [cid, setCid] = useState('');
  const [qkdKey, setQkdKey] = useState<number[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Generar clave QKD
  const handleGenerateKey = useCallback(() => {
    const newKey = simulateQKDKey();
    setQkdKey(newKey);
    
    toast({
      title: '🔑 Clave QKD generada',
      description: `${newKey.length} bits - Lista para cifrado`,
    });
  }, []);

  // Cifrar mensaje
  const handleEncrypt = useCallback(() => {
    if (!message) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un mensaje para cifrar',
        variant: 'destructive'
      });
      return;
    }
    
    if (qkdKey.length === 0) {
      handleGenerateKey();
    }
    
    setIsEncrypting(true);
    
    setTimeout(() => {
      try {
        const encrypted = encryptMessage(message, qkdKey);
        setEncryptedMessage(encrypted);
        
        toast({
          title: '🔒 Mensaje cifrado',
          description: 'El mensaje ha sido cifrado con éxito usando la clave QKD',
        });
      } catch (error) {
        console.error('Error al cifrar:', error);
        toast({
          title: 'Error de cifrado',
          description: 'No se pudo cifrar el mensaje',
          variant: 'destructive'
        });
      } finally {
        setIsEncrypting(false);
      }
    }, 1000);
  }, [message, qkdKey, handleGenerateKey]);

  // Subir a IPFS
  const handleUpload = useCallback(async () => {
    if (!encryptedMessage) {
      toast({
        title: 'Error',
        description: 'Primero debes cifrar un mensaje',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const ipfsCid = await uploadToIPFS({
        content: encryptedMessage,
        type: 'qmail/encrypted',
        timestamp: new Date().toISOString()
      });
      
      setCid(ipfsCid);
      
      toast({
        title: '🛰️ Subido a IPFS',
        description: `CID: ${ipfsCid.substring(0, 12)}...`,
      });
    } catch (error) {
      console.error('Error al subir a IPFS:', error);
      toast({
        title: 'Error de IPFS',
        description: 'No se pudo subir el contenido a IPFS',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [encryptedMessage]);

  // Recuperar de IPFS y descifrar
  const handleRetrieveAndDecrypt = useCallback(async () => {
    if (!cid) {
      toast({
        title: 'Error',
        description: 'No hay CID para recuperar',
        variant: 'destructive'
      });
      return;
    }
    
    if (qkdKey.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay clave QKD para descifrar',
        variant: 'destructive'
      });
      return;
    }
    
    setIsDownloading(true);
    
    try {
      const ipfsData = await getFromIPFS(cid);
      
      // Descifrar con la misma clave
      const decrypted = decryptMessage(ipfsData.content || encryptedMessage, qkdKey);
      setDecryptedMessage(decrypted);
      
      toast({
        title: '🔓 Mensaje recuperado y descifrado',
        description: 'Contenido obtenido de IPFS y descifrado con éxito',
      });
    } catch (error) {
      console.error('Error al recuperar/descifrar:', error);
      toast({
        title: 'Error',
        description: 'No se pudo recuperar o descifrar el contenido',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  }, [cid, qkdKey, encryptedMessage]);

  // Conectar wallet
  const handleConnectWallet = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      
      toast({
        title: '👛 Wallet conectada',
        description: `Dirección: ${address.substring(0, 6)}...${address.substring(38)}`,
      });
    } catch (error) {
      console.error('Error al conectar wallet:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar la wallet',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Firmar mensaje
  const handleSignMessage = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'Error',
        description: 'Conecta una wallet primero',
        variant: 'destructive'
      });
      return;
    }
    
    if (!message) {
      toast({
        title: 'Error',
        description: 'Introduce un mensaje para firmar',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const sig = await signMessage(message);
      setSignature(sig);
      
      toast({
        title: '🖋️ Mensaje firmado',
        description: `Firma: ${sig.substring(0, 10)}...`,
      });
    } catch (error) {
      console.error('Error al firmar:', error);
      toast({
        title: 'Error de firma',
        description: 'No se pudo firmar el mensaje',
        variant: 'destructive'
      });
    }
  }, [walletAddress, message]);

  return (
    <Layout module="qindex">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold mb-4">Qindex - Prueba de IPFS y Cifrado</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cifrado y Clave */}
          <Card>
            <CardHeader>
              <CardTitle>Mensaje y Cifrado QKD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Mensaje a cifrar:
                </label>
                <Textarea
                  id="message"
                  placeholder="Escribe tu mensaje aquí..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleGenerateKey}
                >
                  Generar Clave QKD
                </Button>
                <Button
                  onClick={handleEncrypt}
                  disabled={isEncrypting || !message}
                >
                  {isEncrypting ? 'Cifrando...' : 'Cifrar Mensaje'}
                </Button>
              </div>
              
              {qkdKey.length > 0 && (
                <div className="bg-secondary/20 p-2 rounded text-xs overflow-auto max-h-[60px]">
                  <div className="font-mono">
                    Clave: {qkdKey.slice(0, 32).join('')}
                    {qkdKey.length > 32 ? '...' : ''}
                  </div>
                </div>
              )}
              
              {encryptedMessage && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Mensaje cifrado:
                  </label>
                  <div className="bg-secondary/20 p-2 rounded text-xs overflow-auto max-h-[80px]">
                    <div className="font-mono break-all">
                      {encryptedMessage.substring(0, 100)}
                      {encryptedMessage.length > 100 ? '...' : ''}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant="default"
                onClick={handleUpload}
                disabled={isUploading || !encryptedMessage}
              >
                {isUploading ? 'Subiendo...' : 'Subir a IPFS'}
              </Button>
            </CardFooter>
          </Card>
          
          {/* IPFS y Descifrado */}
          <Card>
            <CardHeader>
              <CardTitle>IPFS y Descifrado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cid && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    CID de IPFS:
                  </label>
                  <Input value={cid} readOnly />
                </div>
              )}
              
              <Button
                className="w-full"
                variant="outline"
                onClick={handleRetrieveAndDecrypt}
                disabled={isDownloading || !cid || qkdKey.length === 0}
              >
                {isDownloading ? 'Recuperando...' : 'Recuperar y Descifrar'}
              </Button>
              
              {decryptedMessage && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Mensaje descifrado:
                  </label>
                  <div className="bg-secondary/20 p-3 rounded">
                    {decryptedMessage}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Web3 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Integración Web3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
                </Button>
                
                {walletAddress && (
                  <div className="bg-secondary/20 py-1 px-3 rounded text-sm">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                  </div>
                )}
              </div>
              
              {walletAddress && (
                <div className="flex justify-between items-center">
                  <Button
                    onClick={handleSignMessage}
                    disabled={!message}
                  >
                    Firmar Mensaje
                  </Button>
                  
                  {signature && (
                    <div className="bg-secondary/20 py-1 px-3 rounded text-sm font-mono">
                      {signature.substring(0, 10)}...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">TODO:</span> Integrar con contratos inteligentes de AnarQ.
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">TODO:</span> Establecer verificación on-chain para archivos IPFS.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
