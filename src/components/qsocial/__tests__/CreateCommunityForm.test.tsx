/**
 * CreateCommunityForm Component Tests
 * Tests for community creation form functionality, validation, and ecosystem integrations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import CreateCommunityForm from '../CreateCommunityForm';
import { useSessionContext } from '@/contexts/SessionContext';
import { useQwallet } from '@/composables/useQwallet';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/contexts/SessionContext');
vi.mock('@/composables/useQwallet');
vi.mock('@/hooks/use-toast');
vi.mock('../FileUpload', () => ({
  default: ({ onUploadComplete, maxFiles, acceptedTypes }: any) => (
    <div data-testid="file-upload">
      <button
        onClick={() => onUploadComplete([{ 
          name: 'test-file.jpg', 
          size: 1024,
          type: acceptedTypes?.[0] || 'image/jpeg'
        }])}
      >
        Upload File
      </button>
    </div>
  )
}));

const mockUseSessionContext = vi.mocked(useSessionContext);
const mockUseQwallet = vi.mocked(useQwallet);
const mockUseToast = vi.mocked(useToast);

const mockSession = {
  did: 'did:test:123',
  id: 'user123',
  name: 'Test User',
  isAuthenticated: true
};

const mockWalletData = {
  balances: {
    QToken: { balance: 100.5, tokenInfo: { symbol: 'QToken', decimals: 18, contractAddress: '0x123', network: 'test', type: 'ERC20' } },
    PI: { balance: 50.0, tokenInfo: { symbol: 'PI', decimals: 18, contractAddress: '0x456', network: 'test', type: 'ERC20' } }
  },
  nfts: [
    { tokenId: '1', contractAddress: '0x789', name: 'Test NFT', description: 'Test', image: '', attributes: [], mintedAt: '2024-01-01', status: 'active' }
  ],
  transactions: [],
  walletAddress: '0xtest',
  loading: false,
  error: null,
  mintNFT: vi.fn(),
  getBalance: vi.fn(),
  getAllBalances: vi.fn(),
  transferFunds: vi.fn(),
  signTransaction: vi.fn(),
  listUserNFTs: vi.fn(),
  getTransactionHistory: vi.fn(),
  refreshWalletData: vi.fn(),
  clearError: vi.fn()
};

const mockToast = vi.fn();

describe('CreateCommunityForm', () => {
  beforeEach(() => {
    mockUseSessionContext.mockReturnValue({
      session: mockSession,
      loading: false,
      error: null,
      isAuthenticated: true,
      cid_profile: null,
      setCidProfile: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn()
    });

    mockUseQwallet.mockReturnValue(mockWalletData);
    mockUseToast.mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form with all tabs', () => {
      render(<CreateCommunityForm />);
      
      expect(screen.getByText('Create Community')).toBeInTheDocument();
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Access')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('renders metadata tab by default', () => {
      render(<CreateCommunityForm />);
      
      expect(screen.getByLabelText('Community Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('shows authentication error when not logged in', () => {
      mockUseSessionContext.mockReturnValue({
        session: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        cid_profile: null,
        setCidProfile: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn()
      });

      render(<CreateCommunityForm />);
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('validates required community name', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Community name is required')).toBeInTheDocument();
      });
    });

    it('validates community name length', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'AB'); // Too short
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be between 3-100 characters')).toBeInTheDocument();
      });
    });

    it('validates description length', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(nameInput, 'Valid Community Name');
      await user.type(descriptionInput, 'A'.repeat(2001)); // Too long
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Description must be less than 2000 characters')).toBeInTheDocument();
      });
    });

    it('validates maximum tags limit', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Valid Community Name');
      
      // Add 11 tags (exceeds limit of 10)
      const tagInput = screen.getByPlaceholderText('Add a tag (e.g., #crypto, #art)...');
      const addTagButton = screen.getByRole('button', { name: '' }); // Plus button
      
      for (let i = 1; i <= 11; i++) {
        await user.type(tagInput, `tag${i}`);
        await user.click(addTagButton);
        await user.clear(tagInput);
      }
      
      expect(screen.getByText('10/10 tags')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      // Switch to governance tab
      await user.click(screen.getByText('Governance'));
      expect(screen.getByText('Community Visibility')).toBeInTheDocument();
      
      // Switch to access tab
      await user.click(screen.getByText('Access'));
      expect(screen.getByText('Require Token or NFT to Join')).toBeInTheDocument();
      
      // Switch to roles tab
      await user.click(screen.getByText('Roles'));
      expect(screen.getByText('Initial Moderators')).toBeInTheDocument();
      
      // Switch to files tab
      await user.click(screen.getByText('Files'));
      expect(screen.getByText('Community Constitution')).toBeInTheDocument();
    });
  });

  describe('Metadata Management', () => {
    it('adds and removes tags correctly', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag (e.g., #crypto, #art)...');
      const addTagButton = screen.getByRole('button', { name: '' }); // Plus button
      
      // Add a tag
      await user.type(tagInput, 'crypto');
      await user.click(addTagButton);
      
      expect(screen.getByText('#crypto')).toBeInTheDocument();
      expect(screen.getByText('1/10 tags')).toBeInTheDocument();
      
      // Remove the tag
      const removeTagButton = screen.getByRole('button', { name: '' }); // X button in tag
      await user.click(removeTagButton);
      
      expect(screen.queryByText('#crypto')).not.toBeInTheDocument();
      expect(screen.getByText('0/10 tags')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag (e.g., #crypto, #art)...');
      const addTagButton = screen.getByRole('button', { name: '' }); // Plus button
      
      // Add same tag twice
      await user.type(tagInput, 'crypto');
      await user.click(addTagButton);
      await user.clear(tagInput);
      
      await user.type(tagInput, 'crypto');
      await user.click(addTagButton);
      
      // Should only have one instance
      const cryptoTags = screen.getAllByText('#crypto');
      expect(cryptoTags).toHaveLength(1);
    });
  });

  describe('Governance Settings', () => {
    it('updates visibility settings', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // Select private visibility
      await user.click(screen.getByText('Private'));
      
      // Check if it's selected (should have checkmark)
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('updates quorum percentage', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // The slider should be present
      expect(screen.getByText('20%')).toBeInTheDocument(); // Default value
    });

    it('updates voting method', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // Select token-weighted voting
      await user.click(screen.getByText('Token Weighted'));
      
      expect(screen.getByText('Token Weighted')).toBeInTheDocument();
    });
  });

  describe('Access Configuration', () => {
    it('toggles token/NFT requirement', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Access'));
      
      const toggleSwitch = screen.getByRole('switch');
      await user.click(toggleSwitch);
      
      // Should show additional fields when enabled
      expect(screen.getByText('Your Current Holdings')).toBeInTheDocument();
    });

    it('validates minimum token amount when required', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      // Set up token-weighted voting
      await user.click(screen.getByText('Governance'));
      await user.click(screen.getByText('Token Weighted'));
      
      // Enable token requirement
      await user.click(screen.getByText('Access'));
      const toggleSwitch = screen.getByRole('switch');
      await user.click(toggleSwitch);
      
      // Try to submit without setting minimum amount
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Test Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Minimum token amount is required')).toBeInTheDocument();
      });
    });
  });

  describe('Roles Management', () => {
    it('adds and removes moderators', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Roles'));
      
      const moderatorInput = screen.getByPlaceholderText('Enter sQuid DID...');
      const addModeratorButton = screen.getByRole('button', { name: '' }); // Plus button
      
      // Add a moderator
      await user.type(moderatorInput, 'did:test:moderator1');
      await user.click(addModeratorButton);
      
      expect(screen.getByText('did:test:moderator1')).toBeInTheDocument();
      
      // Remove the moderator
      const removeModeratorButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(removeModeratorButton);
      
      expect(screen.queryByText('did:test:moderator1')).not.toBeInTheDocument();
    });

    it('updates proposal creation settings', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Roles'));
      
      const proposalSelect = screen.getByRole('combobox');
      await user.click(proposalSelect);
      
      await user.click(screen.getByText('Moderators Only'));
      
      expect(screen.getByText('Moderators Only')).toBeInTheDocument();
    });
  });

  describe('File Management', () => {
    it('handles logo upload', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      // Logo upload is in metadata tab by default
      const uploadButton = screen.getByText('Upload File');
      await user.click(uploadButton);
      
      // File upload component should be present
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('handles constitution upload', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Files'));
      
      const uploadButton = screen.getByText('Upload File');
      await user.click(uploadButton);
      
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });
  });

  describe('Preview Functionality', () => {
    it('shows and hides preview', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);
      
      expect(screen.getByText('Hide Preview')).toBeInTheDocument();
      
      await user.click(screen.getByText('Hide Preview'));
      expect(screen.getByText('Show Preview')).toBeInTheDocument();
    });

    it('displays community data in preview', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      // Fill in some data
      const nameInput = screen.getByLabelText('Community Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(nameInput, 'Test Community');
      await user.type(descriptionInput, 'This is a test community');
      
      // Show preview
      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);
      
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('This is a test community')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      render(<CreateCommunityForm onSuccess={onSuccess} />);
      
      // Fill in required data
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Test Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Community Created Successfully!",
          description: "Test Community has been created and registered in the ecosystem",
          variant: "default"
        });
      });
      
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Test Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      // Should show loading state briefly
      expect(screen.getByText('Creating Community...')).toBeInTheDocument();
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      
      // Mock authentication failure
      mockUseSessionContext.mockReturnValue({
        session: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        cid_profile: null,
        setCidProfile: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn()
      });
      
      render(<CreateCommunityForm />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Test Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Authentication Required",
          description: "Please log in to create a community",
          variant: "destructive"
        });
      });
    });
  });

  describe('Ecosystem Integration', () => {
    it('displays wallet balance information', async () => {
      const user = userEvent.setup();
      render(<CreateCommunityForm />);
      
      await user.click(screen.getByText('Access'));
      
      const toggleSwitch = screen.getByRole('switch');
      await user.click(toggleSwitch);
      
      expect(screen.getByText('100.50 QToken')).toBeInTheDocument();
      expect(screen.getByText('1 NFTs')).toBeInTheDocument();
    });

    it('handles NFT minting for community tokens', async () => {
      const user = userEvent.setup();
      const mockMintNFT = vi.fn().mockResolvedValue({
        tokenId: '123',
        contractAddress: '0xtest',
        name: 'Community Token',
        description: 'Test community token',
        image: '',
        attributes: [],
        mintedAt: '2024-01-01',
        status: 'active'
      });
      
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        mintNFT: mockMintNFT
      });
      
      render(<CreateCommunityForm />);
      
      // Set up NFT-only voting
      await user.click(screen.getByText('Governance'));
      await user.click(screen.getByText('NFT Holders Only'));
      
      // Enable token requirement
      await user.click(screen.getByText('Access'));
      const toggleSwitch = screen.getByRole('switch');
      await user.click(toggleSwitch);
      
      // Add NFT ID
      const nftInput = screen.getByPlaceholderText('Enter NFT ID...');
      await user.type(nftInput, '123');
      await user.click(screen.getByRole('button', { name: '' })); // Plus button
      
      // Submit form
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'NFT Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockMintNFT).toHaveBeenCalledWith({
          name: 'NFT Community Community Token',
          description: 'Membership token for NFT Community community',
          attributes: expect.arrayContaining([
            { trait_type: 'Community', value: 'NFT Community' },
            { trait_type: 'Role', value: 'Member' }
          ])
        });
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onSuccess callback with community ID', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      render(<CreateCommunityForm onSuccess={onSuccess} />);
      
      const nameInput = screen.getByLabelText('Community Name *');
      await user.type(nameInput, 'Test Community');
      
      const submitButton = screen.getByRole('button', { name: /create community/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/^community-\d+$/));
      });
    });

    it('calls onCancel callback', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<CreateCommunityForm onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });
});