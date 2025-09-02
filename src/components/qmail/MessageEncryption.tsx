
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Upload, Eye } from 'lucide-react';
import { simulateQKDKey, encryptMessage, decryptMessage } from '@/utils/encryption';
import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { Card, CardContent } from '@/components/ui/card';

interface MessageEncryptionProps {
  message: string;
}

export function MessageEncryption({ message }: MessageEncryptionProps) {
  const [encryptedMessage, setEncryptedMessage] = useState<string>('');
  const [ipfsCid, setIpfsCid] = useState<string>('');
  const [retrievedMessage, setRetrievedMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEncrypt = () => {
    const key = simulateQKDKey();
    const encrypted = encryptMessage(message, key);
    setEncryptedMessage(encrypted);
  };

  const handleUploadToIPFS = async () => {
    if (!encryptedMessage) return;
    setIsLoading(true);
    try {
      const cid = await uploadToIPFS(encryptedMessage);
      setIpfsCid(cid);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrieveFromIPFS = async () => {
    if (!ipfsCid) return;
    setIsLoading(true);
    try {
      const data = await getFromIPFS(ipfsCid);
      const key = simulateQKDKey(); // In real app, would use stored key
      const decrypted = decryptMessage(data.content, key);
      setRetrievedMessage(decrypted);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleEncrypt} disabled={!message || isLoading}>
            <Lock className="mr-2 h-4 w-4" />
            Cifrar con clave QKD
          </Button>
          
          <Button 
            onClick={handleUploadToIPFS} 
            disabled={!encryptedMessage || isLoading}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir a IPFS
          </Button>
          
          <Button 
            onClick={handleRetrieveFromIPFS}
            disabled={!ipfsCid || isLoading}
            variant="outline"
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver desde IPFS
          </Button>
        </div>

        {encryptedMessage && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Mensaje cifrado:</p>
            <p className="text-sm bg-gray-50 p-2 rounded-md break-all">
              {encryptedMessage}
            </p>
          </div>
        )}

        {ipfsCid && (
          <div className="space-y-2">
            <p className="text-sm font-medium">CID en IPFS:</p>
            <p className="text-sm bg-gray-50 p-2 rounded-md break-all">
              {ipfsCid}
            </p>
          </div>
        )}

        {retrievedMessage && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Mensaje descifrado:</p>
            <p className="text-sm bg-gray-50 p-2 rounded-md break-all">
              {retrievedMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
