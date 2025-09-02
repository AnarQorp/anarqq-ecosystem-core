/**
 * Tests for BasicInformationStep Component
 * Requirements: 2.3, 2.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BasicInformationStep } from '../BasicInformationStep';
import { IdentityType, SubidentityMetadata } from '@/types/identity';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  X: () => <div data-testid="x-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  Image: () => <div data-testid="image-icon" />
}));

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: 'data:image/png;base64,mockImageData',
  onload: null as any
};

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: vi.fn(() => mockFileReader)
});

describe('BasicInformationStep', () => {
  const mockOnFormDataChange = vi.fn();
  const defaultProps = {
    selectedType: IdentityType.DAO,
    formData: {},
    onFormDataChange: mockOnFormDataChange,
    validationErrors: {},
    isSubmitting: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileReader.onload = null;
  });

  describe('Rendering', () => {
    it('renders the component with header and description', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText(/Provide basic details for your new dao identity/i)).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByLabelText(/Identity Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByText('Avatar (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Tags (Optional)')).toBeInTheDocument();
    });

    it('shows required indicator for name field', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByText('Identity Name *')).toBeInTheDocument();
    });

    it('displays help information', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByText('Tips for creating your identity:')).toBeInTheDocument();
      expect(screen.getByText(/Choose a descriptive name/)).toBeInTheDocument();
    });
  });

  describe('Name Input', () => {
    it('handles name input changes', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/Identity Name/);
      fireEvent.change(nameInput, { target: { value: 'Test Identity' } });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        name: 'Test Identity'
      });
    });

    it('displays character count for name', () => {
      const formData = { name: 'Test' };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      expect(screen.getByText(/4.*\/.*50.*characters/)).toBeInTheDocument();
    });

    it('displays validation errors for name', () => {
      const validationErrors = {
        name: ['Name is required', 'Name must be unique']
      };
      
      render(<BasicInformationStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Name must be unique')).toBeInTheDocument();
      expect(screen.getAllByTestId('alert-circle-icon')).toHaveLength(2);
    });

    it('applies error styling when validation errors exist', () => {
      const validationErrors = { name: ['Name is required'] };
      
      render(<BasicInformationStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      const nameInput = screen.getByLabelText(/Identity Name/);
      expect(nameInput).toHaveClass('border-destructive');
    });

    it('disables name input when submitting', () => {
      render(<BasicInformationStep {...defaultProps} isSubmitting={true} />);
      
      const nameInput = screen.getByLabelText(/Identity Name/);
      expect(nameInput).toBeDisabled();
    });
  });

  describe('Description Input', () => {
    it('handles description input changes', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const descriptionInput = screen.getByLabelText(/Description/);
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        description: 'Test description'
      });
    });

    it('displays character count for description', () => {
      const formData = { description: 'Test description' };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      expect(screen.getByText('16/500 characters')).toBeInTheDocument();
    });

    it('displays validation errors for description', () => {
      const validationErrors = {
        description: ['Description is too long']
      };
      
      render(<BasicInformationStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      expect(screen.getByText('Description is too long')).toBeInTheDocument();
    });
  });

  describe('Avatar Upload', () => {
    it('renders avatar upload area', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByText('Upload Avatar')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop an image or click to browse')).toBeInTheDocument();
      expect(screen.getByTestId('camera-icon')).toBeInTheDocument();
    });

    it('displays current avatar when provided', () => {
      const formData = { avatar: 'data:image/png;base64,mockImageData' };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const avatarImage = screen.getByAltText('Avatar preview');
      expect(avatarImage).toBeInTheDocument();
      expect(avatarImage).toHaveAttribute('src', 'data:image/png;base64,mockImageData');
    });

    it('shows remove button when avatar is present', () => {
      const formData = { avatar: 'data:image/png;base64,mockImageData' };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(button => button.querySelector('[data-testid="x-icon"]'));
      expect(removeButton).toBeInTheDocument();
    });

    it('handles avatar removal', () => {
      const formData = { avatar: 'data:image/png;base64,mockImageData' };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(button => button.querySelector('[data-testid="x-icon"]'));
      fireEvent.click(removeButton!);
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        avatar: undefined
      });
    });

    it('handles file selection via input', async () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByRole('button').closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      if (fileInput) {
        // Simulate file selection
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        
        fireEvent.change(fileInput);
        
        // Simulate FileReader onload
        await waitFor(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } });
          }
        });
        
        expect(mockOnFormDataChange).toHaveBeenCalledWith({
          avatar: 'data:image/png;base64,mockImageData'
        });
      }
    });

    it('handles drag and drop', async () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const dropArea = screen.getByText('Upload Avatar').closest('div');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      fireEvent.dragOver(dropArea!, {
        dataTransfer: { files: [file] }
      });
      
      fireEvent.drop(dropArea!, {
        dataTransfer: { files: [file] }
      });
      
      // Simulate FileReader onload
      await waitFor(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } });
        }
      });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        avatar: 'data:image/png;base64,mockImageData'
      });
    });

    it('disables avatar upload when submitting', () => {
      render(<BasicInformationStep {...defaultProps} isSubmitting={true} />);
      
      // Find the upload area by looking for the element with border-dashed class
      const uploadArea = document.querySelector('.border-dashed');
      expect(uploadArea).toHaveClass('opacity-50');
      expect(uploadArea).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Tags Input', () => {
    it('renders tags input', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
      expect(screen.getByText(/0.*\/.*10.*tags used/)).toBeInTheDocument();
    });

    it('displays existing tags', () => {
      const formData = { tags: ['web3', 'dao', 'governance'] };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      expect(screen.getByText('web3')).toBeInTheDocument();
      expect(screen.getByText('dao')).toBeInTheDocument();
      expect(screen.getByText('governance')).toBeInTheDocument();
      expect(screen.getByText(/3.*\/.*10.*tags used/)).toBeInTheDocument();
    });

    it('adds tag on Enter key', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'newtag' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        tags: ['newtag']
      });
    });

    it('adds tag on comma key', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'newtag' } });
      fireEvent.keyDown(tagInput, { key: ',' });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        tags: ['newtag']
      });
    });

    it('adds tag on plus button click', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'newtag' } });
      
      const addButton = screen.getByRole('button', { name: '' }); // Plus button
      fireEvent.click(addButton);
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        tags: ['newtag']
      });
    });

    it('removes tag on X button click', () => {
      const formData = { tags: ['web3', 'dao'] };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      // Find the X button for the first tag
      const web3Tag = screen.getByText('web3').closest('.flex');
      const removeButton = web3Tag?.querySelector('button');
      
      fireEvent.click(removeButton!);
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        tags: ['dao']
      });
    });

    it('removes last tag on backspace when input is empty', () => {
      const formData = { tags: ['web3', 'dao'] };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.keyDown(tagInput, { key: 'Backspace' });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        tags: ['web3']
      });
    });

    it('validates tag format', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'invalid tag!' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      
      expect(screen.getByText('Tag can only contain letters, numbers, hyphens, and underscores')).toBeInTheDocument();
    });

    it('prevents duplicate tags', () => {
      const formData = { tags: ['web3'] };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'web3' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      
      expect(screen.getByText('Tag already exists')).toBeInTheDocument();
    });

    it('enforces maximum tag limit', () => {
      const formData = { tags: Array(10).fill(0).map((_, i) => `tag${i}`) };
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      expect(tagInput).toBeDisabled();
      
      fireEvent.change(tagInput, { target: { value: 'newtag' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      
      expect(screen.getByText('Maximum 10 tags allowed')).toBeInTheDocument();
    });

    it('enforces tag length limit', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      const longTag = 'a'.repeat(31); // Exceeds 30 character limit
      fireEvent.change(tagInput, { target: { value: longTag } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      
      expect(screen.getByText('Tag must be 30 characters or less')).toBeInTheDocument();
    });

    it('disables tag input when submitting', () => {
      render(<BasicInformationStep {...defaultProps} isSubmitting={true} />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      expect(tagInput).toBeDisabled();
    });
  });

  describe('Form Integration', () => {
    it('updates form data correctly', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/Identity Name/);
      const descriptionInput = screen.getByLabelText(/Description/);
      
      fireEvent.change(nameInput, { target: { value: 'Test Identity' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        name: 'Test Identity'
      });
      expect(mockOnFormDataChange).toHaveBeenCalledWith({
        description: 'Test description'
      });
    });

    it('displays general validation errors', () => {
      const validationErrors = {
        general: ['Something went wrong', 'Please try again']
      };
      
      render(<BasicInformationStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Please try again')).toBeInTheDocument();
    });

    it('shows different identity type in description', () => {
      render(<BasicInformationStep 
        {...defaultProps} 
        selectedType={IdentityType.ENTERPRISE}
      />);
      
      expect(screen.getByText(/Provide basic details for your new enterprise identity/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form fields', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByLabelText(/Identity Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('associates validation errors with form fields', () => {
      const validationErrors = { name: ['Name is required'] };
      
      render(<BasicInformationStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      const nameInput = screen.getByLabelText(/Identity Name/);
      // The input should have error styling when validation errors exist
      expect(nameInput).toHaveClass('border-destructive');
    });

    it('provides helpful descriptions for form fields', () => {
      render(<BasicInformationStep {...defaultProps} />);
      
      expect(screen.getByText(/Must be unique within your identity tree/)).toBeInTheDocument();
      expect(screen.getByText('Supported formats: JPG, PNG, GIF. Max size: 5MB')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('handles long content gracefully', () => {
      const formData = {
        name: 'Very Long Identity Name That Might Wrap',
        description: 'A very long description that should wrap properly and not break the layout when displayed in the form',
        tags: ['very-long-tag-name', 'another-long-tag', 'short']
      };
      
      render(<BasicInformationStep {...defaultProps} formData={formData} />);
      
      expect(screen.getByDisplayValue(formData.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(formData.description)).toBeInTheDocument();
      formData.tags.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });
  });
});