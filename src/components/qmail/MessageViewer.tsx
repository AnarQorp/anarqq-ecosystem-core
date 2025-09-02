import * as React from 'react';
import { Message } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, AlertCircle, FileText, Clock } from 'lucide-react';
import { MessageDecryptButton } from './MessageDecryptButton';
import MiniProfileCard from '@/components/squid/MiniProfileCard';

interface MessageViewerProps {
  message: Message;
  decryptedContent: any;
  onDecrypted: (content: any) => void;
  encryptionKey?: string; // Optional encryption key for the MiniProfileCard
}

export function MessageViewer({ 
  message, 
  decryptedContent, 
  onDecrypted,
  encryptionKey = '' // Default empty, should be provided by parent
}: MessageViewerProps) {
  // Extract cid_profile from decrypted content or message metadata
  const senderCidProfile = (decryptedContent as any)?.cid_profile || (message.metadata as any)?.cid_profile;
  
  return (
    <div className="space-y-4">
      {/* Sender Profile Section */}
      <div className="border-b pb-4 mb-4">
        {senderCidProfile ? (
          <div className="mb-4">
            <MiniProfileCard 
              cid={senderCidProfile} 
              encryptionKey={encryptionKey}
              size="medium"
            />
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {message.senderIdentityId ? (
                <span>De: <span className="font-mono">{message.senderIdentityId.slice(0, 32)}...</span></span>
              ) : (
                <span>Remitente sin perfil verificado</span>
              )}
            </p>
          </div>
        )}

        <h3 className="text-lg font-semibold">
          {decryptedContent?.subject || message.subject || 'Sin asunto'}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date(message.timestamp).toLocaleString()}</span>
          
          {(message.metadata as any)?.expires && (
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Expira: {new Date((message.metadata as any).expires).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Message Status and Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {message.metadata?.qerberosValidated ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verificado
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            No verificado
          </Badge>
        )}
        
        {message.metadata?.encryptedWith && (
          <Badge variant="outline">
            <Lock className="mr-1 h-3 w-3" />
            {message.metadata.encryptedWith}
          </Badge>
        )}
        
        {/* Decrypt Button */}
        {message.metadata?.encryptedWith && !decryptedContent && (
          <MessageDecryptButton
            ipfsHash={message.metadata.ipfsHash || ''}
            messageMetadata={message.metadata}
            onDecrypted={onDecrypted}
            isDecrypted={!!decryptedContent}
          />
        )}
      </div>
      
      {/* Message Content */}
      <div className="p-4 bg-muted rounded-lg min-h-[200px]">
        {decryptedContent ? (
          <div className="space-y-4">
            {decryptedContent.priority !== 'NORMAL' && (
              <Badge variant="outline" className="mb-2">
                Prioridad: {decryptedContent.priority}
              </Badge>
            )}
            <div className="whitespace-pre-wrap">
              {decryptedContent.content}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Mensaje cifrado - Haz clic en "Descifrar" para ver el contenido</p>
          </div>
        )}
      </div>
      
      {/* Technical Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-gray-50 dark:bg-gray-900 rounded">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <p className="font-medium">ID del mensaje:</p>
            <p className="font-mono break-all">{message.id}</p>
          </div>
          {message.metadata?.ipfsHash && (
            <div>
              <p className="font-medium">IPFS Hash:</p>
              <p className="font-mono break-all">{message.metadata.ipfsHash}</p>
            </div>
          )}
          {message.metadata?.aesKeyHash && (
            <div>
              <p className="font-medium">AES Key Hash:</p>
              <p className="font-mono break-all">{message.metadata.aesKeyHash}</p>
            </div>
          )}
          {message.metadata?.senderSpace && (
            <div>
              <p className="font-medium">Espacio del remitente:</p>
              <p>{message.metadata.senderSpace}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageViewer;
