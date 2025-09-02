/**
 * QwalletDemo - Demo page showcasing all Qwallet components
 * 
 * Demonstrates the complete Qwallet functionality including dashboard,
 * NFT gallery, and token transfer capabilities
 */

import React, { useState } from 'react';
import { 
  QwalletDashboard, 
  NFTGallery, 
  TokenTransferForm,
  useQwallet 
} from '../components/qwallet';
import { useSquidContext } from '../contexts/SquidContext';
import { 
  WalletIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

type ActiveTab = 'dashboard' | 'gallery' | 'transfer' | 'mint';

const QwalletDemo: React.FC = () => {
  const { currentSquid } = useSquidContext();
  const { mintNFT, loading } = useQwallet();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMinting, setIsMinting] = useState(false);

  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      name: 'Dashboard',
      icon: WalletIcon,
      description: 'Wallet overview and recent activity'
    },
    {
      id: 'gallery' as ActiveTab,
      name: 'NFT Gallery',
      icon: PhotoIcon,
      description: 'View and manage your NFT collection'
    },
    {
      id: 'transfer' as ActiveTab,
      name: 'Send Tokens',
      icon: PaperAirplaneIcon,
      description: 'Transfer tokens to other users'
    },
    {
      id: 'mint' as ActiveTab,
      name: 'Mint NFT',
      icon: PlusIcon,
      description: 'Create new NFTs'
    }
  ];

  const handleQuickMint = async () => {
    if (!currentSquid) return;
    
    setIsMinting(true);
    try {
      await mintNFT({
        name: `Demo NFT #${Date.now()}`,
        description: 'A demo NFT created from the Qwallet interface',
        image: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Demo+NFT',
        attributes: [
          { trait_type: 'Type', value: 'Demo' },
          { trait_type: 'Created', value: new Date().toLocaleDateString() },
          { trait_type: 'Rarity', value: 'Common' }
        ],
        contractType: 'general'
      });
    } catch (error) {
      console.error('Quick mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <QwalletDashboard />;
      case 'gallery':
        return <NFTGallery />;
      case 'transfer':
        return <TokenTransferForm />;
      case 'mint':
        return <MintNFTForm />;
      default:
        return <QwalletDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <WalletIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Qwallet Demo
                </h1>
                <p className="text-sm text-gray-600">
                  AnarQ&Q Ecosystem Wallet Interface
                </p>
              </div>
            </div>
            
            {currentSquid && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleQuickMint}
                  disabled={isMinting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isMinting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Minting...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Quick Mint
                    </>
                  )}
                </button>
                
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Connected:</span>
                  <span className="ml-1 font-mono text-xs">
                    {currentSquid.id.substring(0, 12)}...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Simple NFT Minting Form Component
const MintNFTForm: React.FC = () => {
  const { mintNFT, loading } = useQwallet();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    attributes: [{ trait_type: '', value: '' }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    try {
      const result = await mintNFT({
        name: formData.name,
        description: formData.description,
        image: formData.image || undefined,
        attributes: formData.attributes.filter(attr => attr.trait_type && attr.value),
        contractType: 'general'
      });

      if (result) {
        setSuccess(true);
        setFormData({
          name: '',
          description: '',
          image: '',
          attributes: [{ trait_type: '', value: '' }]
        });
      }
    } catch (error) {
      console.error('Mint NFT error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <PlusIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Mint New NFT</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a new NFT in the AnarQ&Q ecosystem
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">NFT minted successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter NFT name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your NFT"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.png"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Attributes
              </label>
              <button
                type="button"
                onClick={addAttribute}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                + Add Attribute
              </button>
            </div>
            
            {formData.attributes.map((attr, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={attr.trait_type}
                  onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                  placeholder="Trait type"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.attributes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttribute(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Minting NFT...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Mint NFT
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QwalletDemo;