import React, { useEffect, useState } from 'react';
import { QmailMessage } from '../types/message';
import { decryptSignedTransaction } from '../../../../libs/qwallet/core/signer';
import { LockClosedIcon, PaperClipIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface MessageViewerProps {
  message: QmailMessage | null;
  onBack: () => void;
  onDecrypt: (message: QmailMessage, decrypted: QmailMessage) => void;
}

export const MessageViewer: React.FC<MessageViewerProps> = ({
  message,
  onBack,
  onDecrypt,
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<QmailMessage['payload'] | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (message) {
      setDecryptedContent(null);
      setError(null);
      
      if (!message.isEncrypted) {
        setDecryptedContent(message.payload);
      } else if (message.decryptionError) {
        setError('Decryption failed: ' + message.decryptionError);
      } else if (message.payload) {
        // Already decrypted
        setDecryptedContent(message.payload);
      }
    }
  }, [message]);

  const handleDecrypt = async () => {
    if (!message?.isEncrypted || !message.encryptedPayload) return;
    
    setIsDecrypting(true);
    setError(null);
    
    try {
      const decrypted = await decryptSignedTransaction(message);
      const decryptedMessage = {
        ...message,
        payload: decrypted.payload,
        isEncrypted: false,
      };
      
      setDecryptedContent(decrypted.payload);
      onDecrypt(message, decryptedMessage);
    } catch (err) {
      console.error('Decryption failed:', err);
      setError('You do not have access to this content');
      
      // Update the message with decryption error
      onDecrypt(message, {
        ...message,
        decryptionError: 'Access denied',
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Select a message to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-medium text-gray-900">
              {decryptedContent?.subject || message.payload?.subject || 'No Subject'}
            </h2>
            <div className="flex items-center mt-1">
              <span className="text-sm text-gray-500">
                From: {decryptedContent?.from || message.payload?.from || 'Unknown Sender'}
              </span>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                {new Date(message.timestamp).toLocaleString()}
              </span>
              {message.isEncrypted && (
                <span className="ml-2">
                  <LockClosedIcon className="h-4 w-4 text-gray-400 inline-block" />
                  <span className="ml-1 text-xs text-gray-500">Encrypted</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        {message.isEncrypted && !decryptedContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <LockClosedIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">This message is encrypted</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Decrypt this message using your private key to view its contents.
            </p>
            <button
              onClick={handleDecrypt}
              disabled={isDecrypting}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isDecrypting
                  ? 'bg-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isDecrypting ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Decrypting...
                </>
              ) : (
                'Decrypt Message'
              )}
            </button>
            {error && (
              <div className="mt-4 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="prose max-w-none">
            {decryptedContent?.body ? (
              <div className="whitespace-pre-wrap">{decryptedContent.body}</div>
            ) : (
              <p className="text-gray-500 italic">No message content</p>
            )}

            {decryptedContent?.attachments && decryptedContent.attachments.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                  {decryptedContent.attachments.map((file, index) => (
                    <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                      <div className="w-0 flex-1 flex items-center">
                        <PaperClipIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button className="ml-4 text-blue-600 hover:text-blue-800">
                          Download
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug view */}
      {process.env.NODE_ENV === 'development' && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showRaw ? 'Hide' : 'Show'} raw message
          </button>
          {showRaw && (
            <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(
                {
                  id: message.id,
                  isEncrypted: message.isEncrypted,
                  signedBy: message.signedBy,
                  timestamp: message.timestamp,
                  payload: message.payload,
                  encryptedPayload: message.encryptedPayload
                    ? `${message.encryptedPayload.substring(0, 50)}...`
                    : null,
                },
                null,
                2
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
