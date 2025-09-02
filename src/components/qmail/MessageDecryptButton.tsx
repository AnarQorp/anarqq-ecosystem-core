
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { decryptMessageFromIPFS, DecryptedMessageContent } from '@/lib/qmail/messageDecryption';
import { toast } from '@/hooks/use-toast';

interface MessageDecryptButtonProps {
  ipfsHash: string;
  messageMetadata: any;
  onDecrypted: (content: DecryptedMessageContent) => void;
  isDecrypted: boolean;
}

export function MessageDecryptButton({ 
  ipfsHash, 
  messageMetadata, 
  onDecrypted, 
  isDecrypted 
}: MessageDecryptButtonProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    if (isDecrypted) return;
    
    setIsDecrypting(true);
    
    try {
      console.log(`[MessageDecrypt] Iniciando descifrado para: ${ipfsHash.slice(0, 16)}...`);
      
      const decryptedContent = await decryptMessageFromIPFS(ipfsHash, messageMetadata);
      onDecrypted(decryptedContent);
      
      toast({
        title: "Mensaje descifrado",
        description: `"${decryptedContent.subject}" está ahora disponible`,
      });
      
    } catch (error) {
      console.error('[MessageDecrypt] Error:', error);
      toast({
        title: "Error al descifrar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  if (isDecrypted) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Unlock className="mr-2 h-4 w-4" />
        Descifrado
      </Button>
    );
  }

  return (
    <Button 
      variant="secondary" 
      size="sm" 
      onClick={handleDecrypt}
      disabled={isDecrypting}
    >
      {isDecrypting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      ) : (
        <Lock className="mr-2 h-4 w-4" />
      )}
      {isDecrypting ? 'Descifrando...' : 'Descifrar'}
    </Button>
  );
}
