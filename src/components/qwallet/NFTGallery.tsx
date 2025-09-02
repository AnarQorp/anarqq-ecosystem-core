/**
 * NFTGallery - Display all NFTs owned by the user
 * 
 * Shows NFT metadata, images, and provides links to IPFS content
 */

import React, { useState, useMemo } from 'react';
import { useQwallet, NFT } from '../../composables/useQwallet';
import { useSquidContext } from '../../contexts/SquidContext';
import { 
  PhotoIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ExternalLinkIcon,
  CalendarIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface NFTCardProps {
  nft: NFT;
  onSelect: (nft: NFT) => void;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft, onSelect }) => {
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getIPFSUrl = (cid: string): string => {
    return `https://ipfs.io/ipfs/${cid}`;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onSelect(nft)}
    >
      {/* NFT Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {!imageError && nft.image ? (
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            nft.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {nft.status}
          </span>
        </div>

        {/* IPFS Link */}
        {nft.contentCid && (
          <div className="absolute top-2 left-2">
            <a
              href={getIPFSUrl(nft.contentCid)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center p-1.5 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* NFT Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1">
          {nft.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {nft.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-gray-500">
            <TagIcon className="h-3 w-3 mr-1" />
            <span className="font-mono truncate">{nft.tokenId}</span>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span>Minted {formatDate(nft.mintedAt)}</span>
          </div>

          {/* Attributes Preview */}
          {nft.attributes && nft.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {nft.attributes.slice(0, 2).map((attr, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {attr.trait_type}: {attr.value}
                </span>
              ))}
              {nft.attributes.length > 2 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  +{nft.attributes.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NFTModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
}

const NFTModal: React.FC<NFTModalProps> = ({ nft, isOpen, onClose }) => {
  if (!isOpen || !nft) return null;

  const getIPFSUrl = (cid: string): string => {
    return `https://ipfs.io/ipfs/${cid}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {nft.name}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NFT Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {nft.image ? (
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* NFT Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{nft.description}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Details</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Token ID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{nft.tokenId}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Contract</dt>
                      <dd className="text-sm text-gray-900 font-mono">
                        {nft.contractAddress.substring(0, 10)}...
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Minted</dt>
                      <dd className="text-sm text-gray-900">{formatDate(nft.mintedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          nft.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {nft.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Attributes */}
                {nft.attributes && nft.attributes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Attributes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {nft.attributes.map((attr, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2">
                          <dt className="text-xs text-gray-500 uppercase tracking-wide">
                            {attr.trait_type}
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {attr.value}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IPFS Link */}
                {nft.contentCid && (
                  <div>
                    <a
                      href={getIPFSUrl(nft.contentCid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      View on IPFS
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NFTGallery: React.FC = () => {
  const { currentSquid } = useSquidContext();
  const { nfts, loading, error, refreshWalletData } = useQwallet();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');

  // Filter and sort NFTs
  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = nfts.filter(nft =>
      nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.tokenId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime();
      }
    });
  }, [nfts, searchTerm, sortBy]);

  const handleNFTSelect = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNFT(null);
  };

  if (!currentSquid) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-yellow-800">Please connect your sQuid identity to view your NFTs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
          <PhotoIcon className="h-8 w-8 mr-3 text-blue-600" />
          My NFT Gallery
        </h1>
        <p className="mt-2 text-gray-600">
          Explore and manage your NFT collection in the AnarQ&Q ecosystem
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search NFTs by name, description, or token ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* NFT Count */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          {filteredAndSortedNFTs.length} NFT{filteredAndSortedNFTs.length !== 1 ? 's' : ''} found
          {searchTerm && ` for "${searchTerm}"`}
        </p>
      </div>

      {/* NFT Grid */}
      {loading && nfts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedNFTs.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No NFTs found' : 'No NFTs yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms or filters'
              : 'Start by minting your first NFT in the AnarQ&Q ecosystem'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={refreshWalletData}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Gallery
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedNFTs.map((nft) => (
            <NFTCard
              key={nft.tokenId}
              nft={nft}
              onSelect={handleNFTSelect}
            />
          ))}
        </div>
      )}

      {/* NFT Detail Modal */}
      <NFTModal
        nft={selectedNFT}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default NFTGallery;