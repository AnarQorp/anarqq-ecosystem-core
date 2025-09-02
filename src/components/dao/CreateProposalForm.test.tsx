/**
 * CreateProposalForm Component Tests
 * 
 * Comprehensive test suite for the proposal creation form functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProposalForm } from './CreateProposalForm';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';

// Mock the hooks
jest.mock('../../composables/useDAO');
jest.mock('../../contexts/SessionContext');

const mockUseDAO = useDAO as jest.MockedFunction<typeof useDAO>;
const mockUseSessionContext = useSessionContext as jest.MockedFunction<typeof useSessionContext>;

const mockDAO = {
  id: 'test-dao',
  name: 'Test DAO',
  description: 'A test DAO for testing purposes',
  visibility: 'public' as const,
  memberCount: 150,
  quorum: 75,
  proposalCount: 12,
  activeProposals: 3,
  governanceRules: {
    quorum: 75,
    votingDuration: 7 * 24 * 60 * 60 * 1000,
    tokenRequirement: {
      token: 'QToken',
      amount: 10
    },
    proposalCreationRights: 'token_holders',
    votingMechanism: 'token_weighted'
  },
  recentActivity: []
};

const mockMembership = {
  daoId: 'test-dao',
  userId: 'did:squid:test-user',
  isMember: true,
  canCreateProposals: true,
  memberSince: '2023-01-01T00:00:00Z',
  permissions: {
    canVote: true,
    canCreateProposals: true,
    canModerate: false
  }
};

const mockProposal = {
  id: 'new-proposal-id',
  daoId: 'test-dao',
  title: 'Test Proposal',
  description: 'This is a test proposal',
  options: ['Yes', 'No'],
  createdBy: 'did:squid:test-user',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-08T00:00:00Z',
  status: 'active' as const,
  voteCount: 0,
  quorum: 75,
  results: {
    'Yes': { count: 0, weight: 0 },
    'No': { count: 0, weight: 0 }
  },
  quorumReached: false
};

describe('CreateProposalForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseDAO.mockReturnValue({
      daos: [],
      currentDAO: mockDAO,
      proposals: [],
      currentProposal: null,
      results: null,
      membership: mockMembership,
      loading: false,
      error: null,
      getDAOs: jest.fn(),
      getDAO: jest.fn().mockResolvedValue(mockDAO),
      joinDAO: jest.fn(),
      getProposals: jest.fn(),
      getProposal: jest.fn(),
      createProposal: jest.fn().mockResolvedValue(mockProposal),
      voteOnProposal: jest.fn(),
      getResults: jest.fn(),
      getMembership: jest.fn().mockResolvedValue(mockMembership),
      getDAOStats: jest.fn(),
      clearError: jest.fn(),
      refreshDAOData: jest.fn()
    });

    mockUseSessionContext.mockReturnValue({
      session: {
        issuer: 'did:squid:test-user',
        address: '0x123',
        signature: 'mock-signature'
      },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    });

    // Mock Date.now() for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the form with all required fields', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.getByText('Create New Proposal')).toBeInTheDocument();
      expect(screen.getByLabelText(/Proposal Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByText(/Voting Options/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expiration Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expiration Time/)).toBeInTheDocument();
      expect(screen.getByText(/Attachments/)).toBeInTheDocument();
    });

    it('renders in embedded mode without card wrapper', () => {
      render(<CreateProposalForm daoId="test-dao" embedded />);
      
      // Should not have card header
      expect(screen.queryByText('Create New Proposal')).not.toBeInTheDocument();
      // But should have form fields
      expect(screen.getByLabelText(/Proposal Title/)).toBeInTheDocument();
    });

    it('shows default voting options', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
      expect(optionInputs).toHaveLength(2);
      expect(optionInputs[0]).toHaveAttribute('placeholder', 'Option 1');
      expect(optionInputs[1]).toHaveAttribute('placeholder', 'Option 2');
    });

    it('sets default expiration date to 7 days from now', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      await waitFor(() => {
        const dateInput = screen.getByLabelText(/Expiration Date/);
        const timeInput = screen.getByLabelText(/Expiration Time/);
        
        expect(dateInput).toHaveValue('2024-01-08'); // 7 days from mocked date
        expect(timeInput).toHaveValue('23:59');
      });
    });
  });

  describe('Authentication and Permissions', () => {
    it('shows authentication required message for unauthenticated users', () => {
      mockUseSessionContext.mockReturnValue({
        session: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/Please authenticate with your sQuid identity/)).toBeInTheDocument();
    });

    it('shows permission required message for users without creation rights', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          canCreateProposals: false
        }
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.getByText('Permission Required')).toBeInTheDocument();
      expect(screen.getByText(/You do not have permission to create proposals/)).toBeInTheDocument();
    });

    it('shows token requirements when user lacks permission', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          canCreateProposals: false
        }
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.getByText('Required:')).toBeInTheDocument();
      expect(screen.getByText('10 QToken')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required title field', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('validates title length constraints', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      
      // Test minimum length
      await user.type(titleInput, 'Hi');
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Title must be at least 5 characters')).toBeInTheDocument();
      
      // Test maximum length
      await user.clear(titleInput);
      await user.type(titleInput, 'a'.repeat(201));
      await user.click(submitButton);
      
      expect(screen.getByText('Title must be less than 200 characters')).toBeInTheDocument();
    });

    it('validates required description field', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      await user.type(titleInput, 'Valid Title');
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('validates description length constraints', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      
      await user.type(titleInput, 'Valid Title');
      
      // Test minimum length
      await user.type(descriptionInput, 'Short');
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Description must be at least 20 characters')).toBeInTheDocument();
    });

    it('validates voting options requirements', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      
      await user.type(titleInput, 'Valid Title');
      await user.type(descriptionInput, 'This is a valid description with enough characters');
      
      // Leave options empty
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('At least 2 options are required')).toBeInTheDocument();
    });

    it('validates expiration date requirements', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      const option1Input = screen.getByPlaceholderText('Option 1');
      const option2Input = screen.getByPlaceholderText('Option 2');
      const dateInput = screen.getByLabelText(/Expiration Date/);
      
      await user.type(titleInput, 'Valid Title');
      await user.type(descriptionInput, 'This is a valid description with enough characters');
      await user.type(option1Input, 'Yes');
      await user.type(option2Input, 'No');
      
      // Set expiration to past date
      await user.clear(dateInput);
      await user.type(dateInput, '2023-01-01');
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Expiration must be at least 1 hour from now')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows adding and removing voting options', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      // Initially should have 2 options
      expect(screen.getAllByPlaceholderText(/Option \d+/)).toHaveLength(2);
      
      // Add option
      const addButton = screen.getByText('Add Option');
      await user.click(addButton);
      
      expect(screen.getAllByPlaceholderText(/Option \d+/)).toHaveLength(3);
      
      // Remove option (should have remove buttons now)
      const removeButtons = screen.getAllByRole('button', { name: '' }); // X buttons
      const removeButton = removeButtons.find(btn => btn.querySelector('svg')); // Find X icon button
      if (removeButton) {
        await user.click(removeButton);
      }
      
      expect(screen.getAllByPlaceholderText(/Option \d+/)).toHaveLength(2);
    });

    it('limits maximum options to 5', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const addButton = screen.getByText('Add Option');
      
      // Add 3 more options (starting with 2)
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
      
      expect(screen.getAllByPlaceholderText(/Option \d+/)).toHaveLength(5);
      
      // Add button should be disabled or not present
      expect(screen.queryByText('Add Option')).not.toBeInTheDocument();
    });

    it('shows character counts for title and description', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(descriptionInput, 'Test description');
      
      expect(screen.getByText('10/200 characters')).toBeInTheDocument();
      expect(screen.getByText('16/5000 characters • Markdown supported')).toBeInTheDocument();
    });
  });

  describe('File Attachments', () => {
    it('allows file selection via input', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/browse/);
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('Attached Files:')).toBeInTheDocument();
    });

    it('allows removing attached files', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/browse/);
      
      await user.upload(fileInput, file);
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      
      // Find and click remove button
      const removeButtons = screen.getAllByRole('button', { name: '' });
      const removeButton = removeButtons.find(btn => 
        btn.closest('.bg-gray-50') && btn.querySelector('svg')
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });

    it('handles drag and drop file upload', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const dropZone = screen.getByText(/Drag and drop files here/).closest('div');
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Simulate drag over
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      // Should show drag over state
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');
      
      // Simulate drop
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    const fillValidForm = async () => {
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      const option1Input = screen.getByPlaceholderText('Option 1');
      const option2Input = screen.getByPlaceholderText('Option 2');
      
      await user.type(titleInput, 'Valid Proposal Title');
      await user.type(descriptionInput, 'This is a valid description with enough characters to pass validation');
      await user.type(option1Input, 'Yes');
      await user.type(option2Input, 'No');
    };

    it('submits form with valid data', async () => {
      const mockCreateProposal = jest.fn().mockResolvedValue(mockProposal);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateProposal).toHaveBeenCalledWith('test-dao', expect.objectContaining({
          title: 'Valid Proposal Title',
          description: 'This is a valid description with enough characters to pass validation',
          options: ['Yes', 'No'],
          durationHours: expect.any(Number),
          attachments: []
        }));
      });
    });

    it('shows loading state during submission', async () => {
      const mockCreateProposal = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockProposal), 100))
      );
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      });
    });

    it('shows success message after successful submission', async () => {
      const mockCreateProposal = jest.fn().mockResolvedValue(mockProposal);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Proposal "Test Proposal" created successfully!/)).toBeInTheDocument();
      });
    });

    it('resets form after successful submission', async () => {
      const mockCreateProposal = jest.fn().mockResolvedValue(mockProposal);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/Proposal Title/);
        const descriptionInput = screen.getByLabelText(/Description/);
        
        expect(titleInput).toHaveValue('');
        expect(descriptionInput).toHaveValue('');
      });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const mockCreateProposal = jest.fn().mockResolvedValue(mockProposal);
      const mockOnSuccess = jest.fn();
      
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" onSuccess={mockOnSuccess} />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('new-proposal-id');
      });
    });

    it('shows error message on submission failure', async () => {
      const mockCreateProposal = jest.fn().mockRejectedValue(new Error('Submission failed'));
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        createProposal: mockCreateProposal
      });

      render(<CreateProposalForm daoId="test-dao" />);
      
      await fillValidForm();
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Submission failed')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('resets all form fields when reset button is clicked', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const descriptionInput = screen.getByLabelText(/Description/);
      const option1Input = screen.getByPlaceholderText('Option 1');
      
      await user.type(titleInput, 'Test Title');
      await user.type(descriptionInput, 'Test description');
      await user.type(option1Input, 'Test option');
      
      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);
      
      expect(titleInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(option1Input).toHaveValue('');
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const mockOnCancel = jest.fn();
      
      render(<CreateProposalForm daoId="test-dao" onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not show cancel button when onCancel is not provided', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      expect(screen.getByLabelText(/Proposal Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expiration Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expiration Time/)).toBeInTheDocument();
    });

    it('associates error messages with form fields', async () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      const submitButton = screen.getByText('Create Proposal');
      await user.click(submitButton);
      
      const titleInput = screen.getByLabelText(/Proposal Title/);
      const errorMessage = screen.getByText('Title is required');
      
      expect(titleInput).toHaveAttribute('aria-describedby', 'title-error');
      expect(errorMessage).toHaveAttribute('id', 'title-error');
    });

    it('has proper form structure and labels', () => {
      render(<CreateProposalForm daoId="test-dao" />);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Create New Proposal' })).toBeInTheDocument();
      
      // Check for proper form elements
      expect(screen.getByRole('textbox', { name: /Proposal Title/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Description/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Proposal/ })).toBeInTheDocument();
    });
  });
});