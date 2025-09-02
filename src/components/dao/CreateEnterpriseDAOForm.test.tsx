/**
 * CreateEnterpriseDAOForm Component Tests
 * Tests for enterprise DAO creation form functionality, validation, and ecosystem integrations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import CreateEnterpriseDAOForm from '../CreateEnterpriseDAOForm';
import { useSessionContext } from '@/contexts/SessionContext';
import { useQwallet } from '@/composables/useQwallet';
import { useQonsent } from '@/hooks/useQonsent';
import { useQlock } from '@/hooks/useQlock';
import { useQindex } from '@/hooks/useQindex';
import { useQerberos } from '@/hooks/useQerberos';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/contexts/SessionContext');
vi.mock('@/composables/useQwallet');
vi.mock('@/hooks/useQonsent');
vi.mock('@/hooks/useQlock');
vi.mock('@/hooks/useQindex');
vi.mock('@/hooks/useQerberos');
vi.mock('@/hooks/use-toast');
vi.mock('../qsocial/FileUpload', () => ({
  default: ({ onUploadComplete, maxFiles, acceptedTypes }: any) => (
    <div data-testid="file-upload">
      <button
        onClick={() => onUploadComplete([{ 
          name: 'test-file.pdf', 
          size: 1024,
          type: acceptedTypes?.[0] || 'application/pdf'
        }])}
      >
        Upload File
      </button>
    </div>
  )
}));

const mockUseSessionContext = vi.mocked(useSessionContext);
const mockUseQwallet = vi.mocked(useQwallet);
const mockUseQonsent = vi.mocked(useQonsent);
const mockUseQlock = vi.mocked(useQlock);
const mockUseQindex = vi.mocked(useQindex);
const mockUseQerberos = vi.mocked(useQerberos);
const mockUseToast = vi.mocked(useToast);

const mockBusinessSession = {
  did: 'did:test:business123',
  id: 'business123',
  name: 'Test Business',
  type: 'SUB',
  kyc: true,
  isAuthenticated: true
};

const mockWalletData = {
  balances: {
    QToken: { balance: 1000.0, tokenInfo: { symbol: 'QToken', decimals: 18, contractAddress: '0x123', network: 'test', type: 'ERC20' } },
    PI: { balance: 500.0, tokenInfo: { symbol: 'PI', decimals: 18, contractAddress: '0x456', network: 'test', type: 'ERC20' } }
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

const mockQonsentData = {
  settings: {
    exposureLevel: 'MEDIUM',
    moduleSharing: {},
    useQmask: false,
    qmaskStrength: 'standard'
  },
  loading: false,
  error: null,
  generateProfile: vi.fn(),
  updateSettings: vi.fn(),
  checkConsent: vi.fn(),
  revokeConsent: vi.fn(),
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
  clearError: vi.fn(),
  refreshSettings: vi.fn()
};

const mockQlockData = {
  loading: false,
  error: null,
  generateKeys: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
  getAlgorithms: vi.fn(),
  clearError: vi.fn()
};

const mockQindexData = {
  loading: false,
  error: null,
  registerFile: vi.fn(),
  getFileByCID: vi.fn(),
  getAllFiles: vi.fn(),
  storeHash: vi.fn(),
  verifyHash: vi.fn(),
  generateHash: vi.fn(),
  checkPermission: vi.fn(),
  getModulePermissions: vi.fn(),
  routeRequest: vi.fn(),
  getActiveModules: vi.fn(),
  clearError: vi.fn()
};

const mockQerberosData = {
  loading: false,
  error: null,
  logAccess: vi.fn(),
  getAccessLogs: vi.fn(),
  getAccessLogsForCID: vi.fn(),
  clearAccessLogs: vi.fn(),
  getAccessStats: vi.fn(),
  verifyIntegrity: vi.fn(),
  detectAnomalies: vi.fn(),
  checkSecurityThreats: vi.fn(),
  clearError: vi.fn()
};

const mockToast = vi.fn();

describe('CreateEnterpriseDAOForm', () => {
  beforeEach(() => {
    mockUseSessionContext.mockReturnValue({
      session: mockBusinessSession,
      loading: false,
      error: null,
      isAuthenticated: true,
      cid_profile: null,
      setCidProfile: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn()
    });

    mockUseQwallet.mockReturnValue(mockWalletData);
    mockUseQonsent.mockReturnValue(mockQonsentData);
    mockUseQlock.mockReturnValue(mockQlockData);
    mockUseQindex.mockReturnValue(mockQindexData);
    mockUseQerberos.mockReturnValue(mockQerberosData);
    mockUseToast.mockReturnValue({ toast: mockToast });

    // Setup successful mock responses
    mockQonsentData.generateProfile.mockResolvedValue('profile-123');
    mockQlockData.generateKeys.mockResolvedValue({ publicKey: 'pub-key', privateKey: 'priv-key' });
    mockQlockData.encrypt.mockResolvedValue({ encryptedData: 'encrypted', metadata: {} });
    mockQindexData.registerFile.mockResolvedValue({ id: 'file-123', cid: 'cid-123', filename: 'test.pdf', timestamp: '2024-01-01', privacyLevel: 'private' });
    mockQerberosData.logAccess.mockResolvedValue(true);
    mockQerberosData.checkSecurityThreats.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form with all tabs', () => {
      render(<CreateEnterpriseDAOForm />);
      
      expect(screen.getByText('Create Enterprise DAO')).toBeInTheDocument();
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Access')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('renders metadata tab by default', () => {
      render(<CreateEnterpriseDAOForm />);
      
      expect(screen.getByLabelText('Company Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Sector *')).toBeInTheDocument();
    });

    it('shows progress indicator', () => {
      render(<CreateEnterpriseDAOForm />);
      
      expect(screen.getByText('Progress:')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows authentication error for non-business users', () => {
      mockUseSessionContext.mockReturnValue({
        session: { ...mockBusinessSession, type: 'ROOT', kyc: false },
        loading: false,
        error: null,
        isAuthenticated: true,
        cid_profile: null,
        setCidProfile: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn()
      });

      render(<CreateEnterpriseDAOForm />);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('validates required company name', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument();
      });
    });

    it('validates company name length', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'AB'); // Too short
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Company name must be between 3-100 characters')).toBeInTheDocument();
      });
    });

    it('validates sector selection', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Valid Company Name');
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sector selection is required')).toBeInTheDocument();
      });
    });

    it('validates description length', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(nameInput, 'Valid Company Name');
      await user.type(descriptionInput, 'A'.repeat(2001)); // Too long
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Description must be less than 2000 characters')).toBeInTheDocument();
      });
    });

    it('validates website URL format', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      const websiteInput = screen.getByLabelText('Website URL');
      
      await user.type(nameInput, 'Valid Company Name');
      await user.type(websiteInput, 'invalid-url');
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
      });
    });

    it('validates maximum tags limit', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Valid Company Name');
      
      // Add 11 tags (exceeds limit of 10)
      const tagInput = screen.getByPlaceholderText('Add a tag...');
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
      render(<CreateEnterpriseDAOForm />);
      
      // Switch to governance tab
      await user.click(screen.getByText('Governance'));
      expect(screen.getByText('Parent DAO *')).toBeInTheDocument();
      
      // Switch to access tab
      await user.click(screen.getByText('Access'));
      expect(screen.getByText('Require Internal KYC for Employees')).toBeInTheDocument();
      
      // Switch to privacy tab
      await user.click(screen.getByText('Privacy'));
      expect(screen.getByText('DAO Visibility')).toBeInTheDocument();
      
      // Switch to files tab
      await user.click(screen.getByText('Files'));
      expect(screen.getByText('Constitution Document *')).toBeInTheDocument();
    });
  });

  describe('Metadata Management', () => {
    it('adds and removes tags correctly', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      const addTagButton = screen.getByRole('button', { name: '' }); // Plus button
      
      // Add a tag
      await user.type(tagInput, 'fintech');
      await user.click(addTagButton);
      
      expect(screen.getByText('#fintech')).toBeInTheDocument();
      expect(screen.getByText('1/10 tags')).toBeInTheDocument();
      
      // Remove the tag
      const removeTagButton = screen.getByRole('button', { name: '' }); // X button in tag
      await user.click(removeTagButton);
      
      expect(screen.queryByText('#fintech')).not.toBeInTheDocument();
      expect(screen.getByText('0/10 tags')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      const addTagButton = screen.getByRole('button', { name: '' }); // Plus button
      
      // Add same tag twice
      await user.type(tagInput, 'fintech');
      await user.click(addTagButton);
      await user.clear(tagInput);
      
      await user.type(tagInput, 'fintech');
      await user.click(addTagButton);
      
      // Should only have one instance
      const fintechTags = screen.getAllByText('#fintech');
      expect(fintechTags).toHaveLength(1);
    });

    it('loads parent DAOs when sector is selected', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Select technology sector
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      // Switch to governance tab
      await user.click(screen.getByText('Governance'));
      
      // Parent DAO dropdown should be enabled
      const parentDAOSelect = screen.getByRole('combobox');
      expect(parentDAOSelect).not.toBeDisabled();
    });
  });

  describe('Governance Settings', () => {
    it('validates parent DAO selection', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill required fields
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      // Switch to governance tab
      await user.click(screen.getByText('Governance'));
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Parent DAO selection is required')).toBeInTheDocument();
      });
    });

    it('validates CEO role assignment', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill required fields
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      // Switch to governance tab
      await user.click(screen.getByText('Governance'));
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('CEO assignment is required')).toBeInTheDocument();
      });
    });

    it('updates voting method selection', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // Select token-weighted voting
      await user.click(screen.getByText('Token Weighted'));
      
      expect(screen.getByText('Token Weighted')).toBeInTheDocument();
    });

    it('updates quorum percentage', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // The slider should be present with default value
      expect(screen.getByText('51%')).toBeInTheDocument(); // Default value
    });

    it('assigns roles to addresses', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Governance'));
      
      const ceoInput = screen.getByLabelText('CEO * (Required)');
      await user.type(ceoInput, '0x1234567890abcdef');
      
      expect(ceoInput).toHaveValue('0x1234567890abcdef');
    });

    it('toggles delegate voting', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Governance'));
      
      const delegateSwitch = screen.getByRole('switch');
      await user.click(delegateSwitch);
      
      expect(delegateSwitch).toBeChecked();
    });
  });

  describe('Access & Tokens Configuration', () => {
    it('toggles internal KYC requirement', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Access'));
      
      const kycSwitch = screen.getAllByRole('switch')[0];
      await user.click(kycSwitch);
      
      expect(kycSwitch).toBeChecked();
    });

    it('enables token minting with validation', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Access'));
      
      // Enable token minting
      const tokenSwitch = screen.getAllByRole('switch')[2]; // Third switch is token minting
      await user.click(tokenSwitch);
      
      // Token fields should appear
      expect(screen.getByLabelText('Token Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Token Symbol *')).toBeInTheDocument();
    });

    it('validates token minting fields when enabled', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill required fields
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      await user.click(screen.getByText('Access'));
      
      // Enable token minting
      const tokenSwitch = screen.getAllByRole('switch')[2];
      await user.click(tokenSwitch);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Token name is required')).toBeInTheDocument();
        expect(screen.getByText('Token symbol is required')).toBeInTheDocument();
      });
    });

    it('displays wallet balance information', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Access'));
      
      expect(screen.getByText('1000.00 QToken')).toBeInTheDocument();
      expect(screen.getByText('1 NFTs')).toBeInTheDocument();
    });
  });

  describe('Permissions & Privacy', () => {
    it('updates visibility settings', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Privacy'));
      
      // Select private visibility
      await user.click(screen.getByText('Private'));
      
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('shows auto-generated Qonsent profile info', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Privacy'));
      
      expect(screen.getByText('Auto-Generated Profile')).toBeInTheDocument();
      expect(screen.getByText('Sector: Not selected')).toBeInTheDocument();
    });

    it('updates encryption level', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Privacy'));
      
      const encryptionSelect = screen.getByRole('combobox');
      await user.click(encryptionSelect);
      await user.click(screen.getByText('Asymmetric'));
      
      expect(screen.getByText('Asymmetric')).toBeInTheDocument();
    });

    it('toggles parent DAO signature requirement', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Privacy'));
      
      const signatureSwitch = screen.getByRole('switch');
      expect(signatureSwitch).toBeChecked(); // Default is true
      
      await user.click(signatureSwitch);
      expect(signatureSwitch).not.toBeChecked();
    });
  });

  describe('Files & Compliance', () => {
    it('validates required constitution document', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill required fields
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Constitution document is required')).toBeInTheDocument();
      });
    });

    it('validates terms agreement checkbox', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill required fields
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Terms agreement is required')).toBeInTheDocument();
      });
    });

    it('handles constitution file upload', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Files'));
      
      const uploadButton = screen.getAllByText('Upload File')[0];
      await user.click(uploadButton);
      
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
    });

    it('handles multiple legal documents upload', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Files'));
      
      const uploadButtons = screen.getAllByText('Upload File');
      await user.click(uploadButtons[1]); // Legal docs upload
      
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('removes uploaded files', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Files'));
      
      // Upload constitution
      const uploadButton = screen.getAllByText('Upload File')[0];
      await user.click(uploadButton);
      
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      
      // Remove file
      const removeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(removeButton);
      
      expect(screen.queryByText('test-file.pdf')).not.toBeInTheDocument();
    });

    it('toggles terms agreement checkbox', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Files'));
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      expect(termsCheckbox).toBeChecked();
    });
  });

  describe('Preview Functionality', () => {
    it('shows and hides preview', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);
      
      expect(screen.getByText('Hide Preview')).toBeInTheDocument();
      
      await user.click(screen.getByText('Hide Preview'));
      expect(screen.getByText('Show Preview')).toBeInTheDocument();
    });

    it('displays enterprise data in preview', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill in some data
      const nameInput = screen.getByLabelText('Company Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(nameInput, 'Test Enterprise');
      await user.type(descriptionInput, 'This is a test enterprise');
      
      // Show preview
      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);
      
      expect(screen.getByText('Test Enterprise')).toBeInTheDocument();
      expect(screen.getByText('This is a test enterprise')).toBeInTheDocument();
    });

    it('shows token information in preview when enabled', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill basic data
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      // Enable token minting
      await user.click(screen.getByText('Access'));
      const tokenSwitch = screen.getAllByRole('switch')[2];
      await user.click(tokenSwitch);
      
      const tokenNameInput = screen.getByLabelText('Token Name *');
      const tokenSymbolInput = screen.getByLabelText('Token Symbol *');
      
      await user.type(tokenNameInput, 'Test Token');
      await user.type(tokenSymbolInput, 'TEST');
      
      // Show preview
      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);
      
      expect(screen.getByText('Enterprise Token')).toBeInTheDocument();
      expect(screen.getByText('Name: Test Token')).toBeInTheDocument();
      expect(screen.getByText('Symbol: TEST')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('updates progress based on completed sections', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Initially should show low progress
      expect(screen.getByText('0%')).toBeInTheDocument();
      
      // Fill company name and sector
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Company');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      // Progress should increase
      await waitFor(() => {
        expect(screen.getByText('20%')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      render(<CreateEnterpriseDAOForm onSuccess={onSuccess} />);
      
      // Fill required metadata
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      // Fill governance
      await user.click(screen.getByText('Governance'));
      const parentDAOSelect = screen.getByRole('combobox');
      await user.click(parentDAOSelect);
      // Mock parent DAO selection would be here
      
      const ceoInput = screen.getByLabelText('CEO * (Required)');
      await user.type(ceoInput, '0x1234567890abcdef');
      
      // Upload constitution and agree to terms
      await user.click(screen.getByText('Files'));
      const uploadButton = screen.getAllByText('Upload File')[0];
      await user.click(uploadButton);
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Enterprise DAO Created Successfully!",
          description: "Test Enterprise has been registered in the ecosystem",
          variant: "default"
        });
      });
      
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill minimum required data
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      // Should show loading state briefly
      expect(screen.getByText('Creating Enterprise DAO...')).toBeInTheDocument();
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      
      // Mock security threat detection
      mockQerberosData.checkSecurityThreats.mockResolvedValue(true);
      
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Creation Failed",
          description: "Security validation failed",
          variant: "destructive"
        });
      });
    });

    it('handles authentication errors', async () => {
      const user = userEvent.setup();
      
      // Mock unauthenticated user
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
      
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Authentication Required",
          description: "Please log in with a valid business sub-identity",
          variant: "destructive"
        });
      });
    });
  });

  describe('Ecosystem Integration', () => {
    it('generates Qonsent privacy profile', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill and submit form
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const sectorSelect = screen.getByRole('combobox');
      await user.click(sectorSelect);
      await user.click(screen.getByText('Technology'));
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockQonsentData.generateProfile).toHaveBeenCalledWith({
          type: 'enterprise-dao',
          sector: 'technology',
          visibility: 'public',
          companyName: 'Test Enterprise'
        });
      });
    });

    it('generates encryption keys with Qlock', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Fill and submit form
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockQlockData.generateKeys).toHaveBeenCalledWith('SYMMETRIC');
        expect(mockQlockData.encrypt).toHaveBeenCalled();
      });
    });

    it('registers files with Qindex', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      // Upload constitution file
      await user.click(screen.getByText('Files'));
      const uploadButton = screen.getAllByText('Upload File')[0];
      await user.click(uploadButton);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockQindexData.registerFile).toHaveBeenCalled();
      });
    });

    it('logs creation event with Qerberos', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockQerberosData.logAccess).toHaveBeenCalledWith({
          cid: expect.stringMatching(/^enterprise-dao-\d+$/),
          identity: 'did:test:business123',
          status: 'SUCCESS',
          operation: 'UPLOAD',
          reason: 'Enterprise DAO creation',
          metadata: {
            companyName: 'Test Enterprise',
            sector: '',
            parentDAO: ''
          }
        });
      });
    });

    it('mints enterprise token when enabled', async () => {
      const user = userEvent.setup();
      const mockMintNFT = vi.fn().mockResolvedValue({
        tokenId: '123',
        contractAddress: '0xtest',
        name: 'Enterprise Token',
        description: 'Test enterprise token',
        image: '',
        attributes: [],
        mintedAt: '2024-01-01',
        status: 'active'
      });
      
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        mintNFT: mockMintNFT
      });
      
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      // Enable token minting
      await user.click(screen.getByText('Access'));
      const tokenSwitch = screen.getAllByRole('switch')[2];
      await user.click(tokenSwitch);
      
      const tokenNameInput = screen.getByLabelText('Token Name *');
      const tokenSymbolInput = screen.getByLabelText('Token Symbol *');
      
      await user.type(tokenNameInput, 'Test Token');
      await user.type(tokenSymbolInput, 'TEST');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockMintNFT).toHaveBeenCalledWith({
          name: 'Test Enterprise Enterprise Token',
          description: 'Enterprise token for Test Enterprise',
          attributes: expect.arrayContaining([
            { trait_type: 'Company', value: 'Test Enterprise' },
            { trait_type: 'Token Symbol', value: 'TEST' }
          ])
        });
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onSuccess callback with DAO ID', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      render(<CreateEnterpriseDAOForm onSuccess={onSuccess} />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      await user.type(nameInput, 'Test Enterprise');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /create enterprise dao/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/^enterprise-dao-\d+$/));
      });
    });

    it('calls onCancel callback', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<CreateEnterpriseDAOForm onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CreateEnterpriseDAOForm />);
      
      expect(screen.getByLabelText('Company Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Sector *')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      const nameInput = screen.getByLabelText('Company Name *');
      
      // Tab to the input
      await user.tab();
      expect(nameInput).toHaveFocus();
      
      // Type in the input
      await user.type(nameInput, 'Test Company');
      expect(nameInput).toHaveValue('Test Company');
    });

    it('provides helpful tooltips', async () => {
      const user = userEvent.setup();
      render(<CreateEnterpriseDAOForm />);
      
      await user.click(screen.getByText('Governance'));
      
      // Hover over help icon
      const helpIcon = screen.getByRole('button', { name: '' }); // Help circle icon
      await user.hover(helpIcon);
      
      await waitFor(() => {
        expect(screen.getByText('Parent DAO provides governance oversight and sector-specific guidance')).toBeInTheDocument();
      });
    });
  });
});