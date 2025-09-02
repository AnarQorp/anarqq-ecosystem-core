import React, { useState } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import type { SignedTransaction } from '../../../../libs/qwallet/core/types';
import { decryptSignedTransaction } from '../../../../libs/qwallet/core/signer';

interface SignButtonProps {
  onSigned: (tx: SignedTransaction<unknown>) => void;
}

interface TransactionDetailsProps {
  tx: SignedTransaction<unknown>;
  onDecrypt: () => Promise<void>;
  isDecrypting: boolean;
  decryptionError: string | null;
  decryptedTx: any;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  tx,
  onDecrypt,
  isDecrypting,
  decryptionError,
  decryptedTx
}) => (
  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
    <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <span className="text-gray-500">Signed by:</span>
        <span className="col-span-2 font-mono text-xs break-all">{tx.signedBy}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <span className="text-gray-500">Timestamp:</span>
        <span className="col-span-2">{new Date(tx.timestamp).toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <span className="text-gray-500">Status:</span>
        <span className="col-span-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            tx.isEncrypted ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
          }`}>
            {tx.isEncrypted ? 'Encrypted' : 'Signed'}
          </span>
        </span>
      </div>

      {tx.isEncrypted && !decryptedTx && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={onDecrypt}
            disabled={isDecrypting}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt Payload'}
          </button>
          {decryptionError && (
            <div className="mt-1 text-red-500 text-xs">{decryptionError}</div>
          )}
        </div>
      )}

      {decryptedTx && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-1">Decrypted Payload:</div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(decryptedTx, null, 2)}
          </pre>
        </div>
      )}
    </div>
  </div>
);

export const SignButton: React.FC<SignButtonProps> = ({ onSigned }) => {
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signedTx, setSignedTx] = useState<SignedTransaction<unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptedTx, setDecryptedTx] = useState<any>(null);
  
  const { sign } = useWallet();

  const handleSign = async () => {
    setIsSigning(true);
    setError(null);
    setDecryptedTx(null);
    setDecryptionError(null);
    
    try {
      const mockTransaction = {
        to: '0x1234567890abcdef1234567890abcdef12345678',
        value: 1,
        data: '0x',
        nonce: Math.floor(Math.random() * 1000),
      };

      // Sign with encryption enabled
      const result = await sign(mockTransaction, { encrypt: true });
      console.log('Signed transaction:', result);
      setSignedTx(result);
      onSigned(result);
    } catch (err) {
      console.error('Error signing transaction:', err);
      setError('Failed to sign transaction');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDecrypt = async () => {
    if (!signedTx?.isEncrypted) return;
    
    setIsDecrypting(true);
    setDecryptionError(null);
    
    try {
      const decrypted = await decryptSignedTransaction(signedTx);
      setDecryptedTx(decrypted.payload);
    } catch (err) {
      console.error('Error decrypting transaction:', err);
      setDecryptionError('Failed to decrypt transaction');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSign}
        disabled={isSigning}
        className={`w-full px-4 py-2 rounded-md font-medium text-white ${
          isSigning 
            ? 'bg-blue-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        } transition-colors`}
      >
        {isSigning ? 'Signing...' : 'Sign Test Transaction (Encrypted)'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {signedTx && (
        <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm mt-2">
          <div className="font-medium">Transaction signed successfully!</div>
          <div className="mt-1 text-xs opacity-75 break-all">
            Signature: {signedTx.signature}
          </div>
        </div>
      )}
    </div>
  );
};
