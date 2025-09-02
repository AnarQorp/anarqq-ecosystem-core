import React, { useState, useEffect } from 'react';
import { useIdentity } from '@squid-identity/react';
import { TokenList } from './components/TokenList';
import { SignButton } from './components/SignButton';
import { NFTList } from './components/NFTList';
import { useWallet } from '../../contexts/WalletContext';
import { getNFTBalance } from '@qwallet/core';
import { NFTItem } from '@qwallet/core/types';
import type { SignedTransaction } from '../../../libs/qwallet/core/types';
import { decryptSignedTransaction } from '../../../libs/qwallet/core/signer';

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

export const QwalletDashboard: React.FC = () => {
  const { identity } = useIdentity();
  const { balances, isLoading, error, refreshBalances } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState<boolean>(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [signedTx, setSignedTx] = useState<SignedTransaction<unknown> | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptedTx, setDecryptedTx] = useState<any>(null);

  useEffect(() => {
    const loadNFTs = async () => {
      if (!identity) {
        setNfts([]);
        return;
      }

      setIsLoadingNfts(true);
      setNftError(null);
      
      try {
        const nftBalances = await getNFTBalance(identity);
        setNfts(nftBalances);
      } catch (err) {
        console.error('Failed to load NFTs:', err);
        setNftError('Failed to load NFT collection');
        setNfts([]);
      } finally {
        setIsLoadingNfts(false);
      }
    };

    loadNFTs();
  }, [identity]);

  const handleTransferNFT = async (tokenId: string) => {
    // In a real app, you would show a transfer modal here
    console.log(`Initiating transfer for NFT ${tokenId}`);
    // Example: await transferNFT(identity, tokenId, '0xRecipientAddress');
  };

  const handleTransactionSigned = (tx: SignedTransaction<unknown>) => {
    setSignedTx(tx);
    setDecryptedTx(null);
    setDecryptionError(null);
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

  if (!identity) {
    return <div className="text-center p-4">Please connect your wallet to view your Qwallet dashboard.</div>;
  }

  if (isLoading) {
    return <div className="text-center p-4">Loading your wallet...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Qwallet Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Tokens</h2>
        <TokenList tokens={balances} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-4">
          <SignButton onSigned={handleTransactionSigned} />
        </div>
      </div>

      {signedTx && (
        <div className="mt-6 space-y-4">
          <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm">
            <div className="font-medium">Transaction signed successfully!</div>
            <div className="mt-1 text-xs opacity-75 break-all">
              Signature: {signedTx.signature}
            </div>
          </div>
          
          <TransactionDetails 
            tx={signedTx} 
            onDecrypt={handleDecrypt}
            isDecrypting={isDecrypting}
            decryptionError={decryptionError}
            decryptedTx={decryptedTx}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your NFT Collection</h2>
        {nftError ? (
          <div className="text-red-500 text-center py-4">{nftError}</div>
        ) : (
          <NFTList 
            nfts={nfts} 
            onTransfer={handleTransferNFT} 
            isLoading={isLoadingNfts} 
          />
        )}
      </div>
    </div>
  );
};
