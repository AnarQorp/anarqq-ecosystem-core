/**
 * NFTGallery Component Tests
 * 
 * Comprehensive unit tests for the NFT gallery component
 * covering display, filtering, and identity-specific features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NFTGallery from '../NFTGallery';
import { useIdentityQwallet } from '../../../hooks/useIdentityQwallet';
import { useSquidContext } from '../../../contexts/SquidContext';
import { IdentityType } from '../../../types/identity';

// Mock dependencies
vi.mock('../../../hooks/useIdentityQwallet');
vi.mock('../../../contexts/SquidContext');

const mockUseIdentityQwallet = vi.mocked(useIdentityQwallet);
const mockUseSquidContext = vi.mocked(useSquidContext);

describe('NFTGallery', () => {
  const mockNFTs = [
    {
      id: 'nft-1',
      name: 'Test NFT 1',
      description: 'First test NFT',
      image: 'https://example.com/nft1.png',
      tokenId: '1',
      contractAddress: '0x123',
      collection: 'Test Collection',
      rarity: 'Common',
      attributes: [
        { trait_type: 'Color', value: 'Blue' },
        { trait_type: 'Size', value: 'Large' }
      ]
    },
    {
      id: 'nft-2',
      name: 'Test NFT 2',
      description: 'Second test NFT',
      image: 'https://example.com/nft2.png',
      tokenId: '2',
      contractAddress: '0x456',
      collection: 'Premium Collection',
      rarity: 'Rare',
      attributes: [
        { trait_type: 'Color', value: 'Red' },
        { trait_type: 'Size', value: 'Medium' }
      ]
    },
    {
      id: 'nft-3',
      name: 'Test NFT 3',
      description: 'Third test NFT',
      image: 'https://example.com/nft3.png',
      tokenId: '3',
      contractAddress: '0x789',
      collection: 'Test Collection',
      rarity: 'Epic',
      attributes: [
        { trait_type: 'Color', value: 'Green' },
        { trait_type: 'Size', value: 'Small' }
      ]
    }
  ];

  const mockWalletData = {
    state: {
      nfts: mockNFTs,
      loading: false,
      error: null,
      permissions: {
        canTransfer: true,
        canReceive: true
      }
    },
    actions: {
      refreshNFTs: vi.fn(),
      transferNFT: vi.fn(),
      clearError: vi.fn()
    }
  };

  const mockSquidContext = {
    currentSquid: {
      did: 'did:squid:test123',
      identityType: IdentityType.ROOT,
      displayName: 'Test User',
      isActive: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSquidContext.mockReturnValue(mockSquidContext);
    mockUseIdentityQwallet.mockReturnValue(mockWalletData);
  });

  describe('Gallery Display', () => {
    it('should render NFT gallery with all NFTs', () => {
      render(<NFTGallery />);
      
      expect(screen.getByText('NFT Gallery')).toBeInTheDocument();
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument();
      expect(screen.getByText('Test NFT 2')).toBeInTheDocument();
      expect(screen.getByText('Test NFT 3')).toBeInTheDocument();
    });

    it('should display NFT count', () => {
      render(<NFTGallery />);
      
      expect(screen.getByText('3 NFTs')).toBeInTheDocument();
    });

    it('should show NFT images with proper alt text', () => {
      render(<NFTGallery />);
      
      const nftImage1 = screen.getByAltText('Test NFT 1');
      const nftImage2 = screen.getByAltText('Test NFT 2');
      const nftImage3 = screen.getByAltText('Test NFT 3');
      
      expect(nftImage1).toHaveAttribute('src', 'https://example.com/nft1.png');
      expect(nftImage2).toHaveAttribute('src', 'https://example.com/nft2.png');
      expect(nftImage3).toHaveAttribute('src', 'https://example.com/nft3.png');
    });

    it('should display NFT metadata', () => {
      render(<NFTGallery />);
      
      expect(screen.getByText('First test NFT')).toBeInTheDocument();
      expect(screen.getByText('Test Collection')).toBeInTheDocument();
      expect(screen.getByText('Common')).toBeInTheDocument();
      expect(screen.getByText('Token ID: 1')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no NFTs', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          nfts: []
        }
      });

      render(<NFTGallery />);
      
      expect(screen.getByText('No NFTs found')).toBeInTheDocument();
      expect(screen.getByText('Your NFT collection will appear here')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          loading: true
        }
      });

      render(<NFTGallery />);
      
      expect(screen.getByText('Loading NFTs...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          error: 'Failed to load NFTs'
        }
      });

      render(<NFTGallery />);
      
      expect(screen.getByText('Failed to load NFTs')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter NFTs by collection', () => {
      render(<NFTGallery />);
      
      const collectionFilter = screen.getByLabelText('Filter by Collection');
      fireEvent.change(collectionFilter, { target: { value: 'Test Collection' } });
      
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument();
      expect(screen.getByText('Test NFT 3')).toBeInTheDocument();
      expect(screen.queryByText('Test NFT 2')).not.toBeInTheDocument();
    });

    it('should filter NFTs by rarity', () => {
      render(<NFTGallery />);
      
      const rarityFilter = screen.getByLabelText('Filter by Rarity');
      fireEvent.change(rarityFilter, { target: { value: 'Rare' } });
      
      expect(screen.getByText('Test NFT 2')).toBeInTheDocument();
      expect(screen.queryByText('Test NFT 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Test NFT 3')).not.toBeInTheDocument();
    });

    it('should search NFTs by name', () => {
      render(<NFTGallery />);
      
      const searchInput = screen.getByPlaceholderText('Search NFTs...');
      fireEvent.change(searchInput, { target: { value: 'NFT 2' } });
      
      expect(screen.getByText('Test NFT 2')).toBeInTheDocument();
      expect(screen.queryByText('Test NFT 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Test NFT 3')).not.toBeInTheDocument();
    });

    it('should sort NFTs by name', () => {
      render(<NFTGallery />);
      
      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'name-asc' } });
      
      const nftCards = screen.getAllByTestId('nft-card');
      expect(nftCards[0]).toHaveTextContent('Test NFT 1');
      expect(nftCards[1]).toHaveTextContent('Test NFT 2');
      expect(nftCards[2]).toHaveTextContent('Test NFT 3');
    });

    it('should sort NFTs by rarity', () => {
      render(<NFTGallery />);
      
      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'rarity-desc' } });
      
      const nftCards = screen.getAllByTestId('nft-card');
      expect(nftCards[0]).toHaveTextContent('Test NFT 3'); // Epic
      expect(nftCards[1]).toHaveTextContent('Test NFT 2'); // Rare
      expect(nftCards[2]).toHaveTextContent('Test NFT 1'); // Common
    });
  });

  describe('NFT Details Modal', () => {
    it('should open NFT details modal when NFT is clicked', () => {
      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('NFT Details')).toBeInTheDocument();
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument();
      expect(screen.getByText('First test NFT')).toBeInTheDocument();
    });

    it('should display NFT attributes in modal', () => {
      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      expect(screen.getByText('Attributes')).toBeInTheDocument();
      expect(screen.getByText('Color: Blue')).toBeInTheDocument();
      expect(screen.getByText('Size: Large')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('NFT Transfer', () => {
    it('should show transfer button for transferable NFTs', () => {
      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      expect(screen.getByRole('button', { name: 'Transfer NFT' })).toBeInTheDocument();
    });

    it('should hide transfer button for CONSENTIDA identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.CONSENTIDA
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            canTransfer: false,
            canReceive: true
          }
        }
      });

      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      expect(screen.queryByRole('button', { name: 'Transfer NFT' })).not.toBeInTheDocument();
      expect(screen.getByText('NFT transfers not allowed for this identity type')).toBeInTheDocument();
    });

    it('should handle NFT transfer', async () => {
      const mockTransferNFT = vi.fn().mockResolvedValue({
        success: true,
        data: { transactionId: 'tx-nft-123' }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        actions: {
          ...mockWalletData.actions,
          transferNFT: mockTransferNFT
        }
      });

      render(<NFTGallery />);
      
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      const transferButton = screen.getByRole('button', { name: 'Transfer NFT' });
      fireEvent.click(transferButton);
      
      // Should show transfer form
      expect(screen.getByLabelText('Recipient Address')).toBeInTheDocument();
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const confirmButton = screen.getByRole('button', { name: 'Confirm Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockTransferNFT).toHaveBeenCalledWith({
          nftId: 'nft-1',
          to: '0x1234567890123456789012345678901234567890'
        });
      });
    });
  });

  describe('View Modes', () => {
    it('should switch between grid and list view', () => {
      render(<NFTGallery />);
      
      const listViewButton = screen.getByRole('button', { name: 'List View' });
      fireEvent.click(listViewButton);
      
      expect(screen.getByTestId('nft-list-view')).toBeInTheDocument();
      
      const gridViewButton = screen.getByRole('button', { name: 'Grid View' });
      fireEvent.click(gridViewButton);
      
      expect(screen.getByTestId('nft-grid-view')).toBeInTheDocument();
    });

    it('should adjust grid size', () => {
      render(<NFTGallery />);
      
      const gridSizeSlider = screen.getByLabelText('Grid Size');
      fireEvent.change(gridSizeSlider, { target: { value: '4' } });
      
      const gridContainer = screen.getByTestId('nft-grid-view');
      expect(gridContainer).toHaveClass('grid-cols-4');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh NFTs when refresh button is clicked', () => {
      const mockRefreshNFTs = vi.fn();
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        actions: {
          ...mockWalletData.actions,
          refreshNFTs: mockRefreshNFTs
        }
      });

      render(<NFTGallery />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh NFTs' });
      fireEvent.click(refreshButton);
      
      expect(mockRefreshNFTs).toHaveBeenCalled();
    });

    it('should auto-refresh NFTs periodically', async () => {
      const mockRefreshNFTs = vi.fn();
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        actions: {
          ...mockWalletData.actions,
          refreshNFTs: mockRefreshNFTs
        }
      });

      render(<NFTGallery autoRefresh={true} refreshInterval={1000} />);
      
      // Wait for auto-refresh
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(mockRefreshNFTs).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<NFTGallery />);
      
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'NFT Gallery');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search NFTs');
      expect(screen.getAllByRole('button', { name: /Test NFT/ })).toHaveLength(3);
    });

    it('should support keyboard navigation', () => {
      render(<NFTGallery />);
      
      const firstNFT = screen.getByTestId('nft-card-nft-1');
      firstNFT.focus();
      expect(firstNFT).toHaveFocus();
      
      fireEvent.keyDown(firstNFT, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should provide screen reader announcements for filter changes', () => {
      render(<NFTGallery />);
      
      const collectionFilter = screen.getByLabelText('Filter by Collection');
      fireEvent.change(collectionFilter, { target: { value: 'Test Collection' } });
      
      expect(screen.getByRole('status')).toHaveTextContent('Showing 2 NFTs filtered by Test Collection');
    });
  });

  describe('Performance', () => {
    it('should virtualize large NFT collections', () => {
      const largeNFTCollection = Array.from({ length: 1000 }, (_, i) => ({
        id: `nft-${i}`,
        name: `NFT ${i}`,
        description: `Description ${i}`,
        image: `https://example.com/nft${i}.png`,
        tokenId: i.toString(),
        contractAddress: '0x123',
        collection: 'Large Collection',
        rarity: 'Common'
      }));

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          nfts: largeNFTCollection
        }
      });

      render(<NFTGallery />);
      
      // Should only render visible NFTs
      const visibleNFTs = screen.getAllByTestId(/nft-card/);
      expect(visibleNFTs.length).toBeLessThan(50); // Assuming viewport shows less than 50
    });

    it('should lazy load NFT images', () => {
      render(<NFTGallery />);
      
      const nftImages = screen.getAllByRole('img');
      nftImages.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });
});